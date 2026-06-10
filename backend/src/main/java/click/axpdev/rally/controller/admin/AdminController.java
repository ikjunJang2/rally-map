package click.axpdev.rally.controller.admin;

import click.axpdev.rally.domain.*;
import click.axpdev.rally.repository.*;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 관리자 전용 CRUD. 모든 /api/admin/** 요청은 AdminInterceptor가 Bearer 토큰을 검증한다.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final PoiRepository pois;
    private final NoticeRepository notices;
    private final StreamRepository streams;
    private final PostRepository posts;
    private final CommentRepository comments;
    private final PostLikeRepository likes;
    private final ReportRepository reports;

    public AdminController(PoiRepository pois, NoticeRepository notices,
                           StreamRepository streams, PostRepository posts,
                           CommentRepository comments, PostLikeRepository likes,
                           ReportRepository reports) {
        this.pois = pois;
        this.notices = notices;
        this.streams = streams;
        this.posts = posts;
        this.comments = comments;
        this.likes = likes;
        this.reports = reports;
    }

    // ── POI (비활성 포함 전체) ─────────────────────────────
    @GetMapping("/pois")
    public List<Poi> allPois() { return pois.findAll(); }

    public record PoiRequest(@NotNull PoiType type, @NotBlank @Size(max = 100) String name,
                             @NotNull Double lat, @NotNull Double lng,
                             @Size(max = 500) String memo, Boolean active) {}

    @PostMapping("/pois")
    public ResponseEntity<Poi> createPoi(@Valid @RequestBody PoiRequest req) {
        Poi p = new Poi(req.type(), req.name(), req.lat(), req.lng(), req.memo());
        if (req.active() != null) p.setActive(req.active());
        return ResponseEntity.status(HttpStatus.CREATED).body(pois.save(p));
    }

    @PutMapping("/pois/{id}")
    public ResponseEntity<Poi> updatePoi(@PathVariable Long id, @Valid @RequestBody PoiRequest req) {
        return pois.findById(id)
                .map(p -> {
                    p.update(req.type(), req.name(), req.lat(), req.lng(), req.memo(),
                            req.active() == null || req.active());
                    return ResponseEntity.ok(pois.save(p));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/pois/{id}")
    public ResponseEntity<Void> deletePoi(@PathVariable Long id) {
        pois.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── 공지 ─────────────────────────────────────────────
    public record NoticeRequest(@NotBlank @Size(max = 200) String title,
                                @Size(max = 2000) String body, boolean pinned) {}

    @PostMapping("/notices")
    public ResponseEntity<Notice> createNotice(@Valid @RequestBody NoticeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notices.save(new Notice(req.title(), req.body(), req.pinned())));
    }

    @DeleteMapping("/notices/{id}")
    public ResponseEntity<Void> deleteNotice(@PathVariable Long id) {
        notices.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── 라이브 ───────────────────────────────────────────
    public record StreamRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 500) @Pattern(regexp = "https://.*", message = "https URL만 허용") String url,
            @Size(max = 100) String channel, Boolean live) {}

    @PostMapping("/streams")
    public ResponseEntity<Stream> createStream(@Valid @RequestBody StreamRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(streams.save(new Stream(req.title(), req.url(), req.channel(),
                        req.live() == null || req.live())));
    }

    @PatchMapping("/streams/{id}/ended")
    public ResponseEntity<Stream> endStream(@PathVariable Long id) {
        return streams.findById(id)
                .map(s -> { s.setLive(false); return ResponseEntity.ok(streams.save(s)); })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/streams/{id}")
    public ResponseEntity<Void> deleteStream(@PathVariable Long id) {
        streams.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── 커뮤니티 (관리자 소프트 삭제 — DB에는 이력 보존) ──
    @DeleteMapping("/posts/{id}")
    @Transactional
    public ResponseEntity<Void> deletePost(@PathVariable Long id) {
        return posts.findById(id)
                .map(p -> {
                    p.markDeleted(DeletedBy.ADMIN);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/comments/{id}")
    @Transactional
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        return comments.findById(id)
                .map(c -> {
                    c.markDeleted(DeletedBy.ADMIN);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** 삭제 이력 감사 — 내용·삭제 시각·삭제 주체 포함 */
    @GetMapping("/posts/deleted")
    public List<Post> deletedPosts() {
        return posts.findByDeletedTrueOrderByDeletedAtDesc();
    }

    // ── 신고 처리 (망법 44조의2 임시조치) ──────────────────

    /** 대기 중 신고 목록 — 대상 글/댓글 내용 포함 */
    @GetMapping("/reports")
    public List<Map<String, Object>> pendingReports() {
        return reports.findByStatusOrderByCreatedAtAsc(Report.Status.PENDING).stream()
                .map(r -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("targetType", r.getTargetType());
                    m.put("targetId", r.getTargetId());
                    m.put("reason", r.getReason());
                    m.put("detail", r.getDetail());
                    m.put("createdAt", r.getCreatedAt());
                    if (r.getTargetType() == Report.TargetType.POST) {
                        posts.findById(r.getTargetId()).ifPresent(p -> {
                            m.put("targetTitle", p.getTitle());
                            m.put("targetBody", p.getBody());
                            m.put("targetDeleted", p.isDeleted());
                            m.put("targetBlocked", p.isBlocked());
                        });
                    } else {
                        comments.findById(r.getTargetId()).ifPresent(c -> {
                            m.put("targetBody", c.getBody());
                            m.put("targetDeleted", c.isDeleted());
                        });
                    }
                    return m;
                })
                .toList();
    }

    /** 신고 처리 완료 표시 */
    @PatchMapping("/reports/{id}/resolve")
    @Transactional
    public ResponseEntity<Void> resolveReport(@PathVariable Long id) {
        return reports.findById(id)
                .map(r -> {
                    r.resolve();
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** 임시조치 — 30일간 내용 가림 (정보통신망법 44조의2 4항) */
    @PostMapping("/posts/{id}/block")
    @Transactional
    public ResponseEntity<Void> blockPost(@PathVariable Long id) {
        return posts.findById(id)
                .map(p -> {
                    p.block(java.time.Instant.now().plus(java.time.Duration.ofDays(30)));
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** 임시조치 해제 */
    @DeleteMapping("/posts/{id}/block")
    @Transactional
    public ResponseEntity<Void> unblockPost(@PathVariable Long id) {
        return posts.findById(id)
                .map(p -> {
                    p.unblock();
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
