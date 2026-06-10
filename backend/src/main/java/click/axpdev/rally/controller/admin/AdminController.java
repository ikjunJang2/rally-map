package click.axpdev.rally.controller.admin;

import click.axpdev.rally.domain.*;
import click.axpdev.rally.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    public AdminController(PoiRepository pois, NoticeRepository notices,
                           StreamRepository streams, PostRepository posts) {
        this.pois = pois;
        this.notices = notices;
        this.streams = streams;
        this.posts = posts;
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

    // ── 커뮤니티 글 (관리자 삭제) ─────────────────────────
    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id) {
        posts.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
