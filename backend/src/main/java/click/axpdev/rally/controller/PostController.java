package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Comment;
import click.axpdev.rally.domain.DeletedBy;
import click.axpdev.rally.domain.Post;
import click.axpdev.rally.domain.PostLike;
import click.axpdev.rally.repository.CommentRepository;
import click.axpdev.rally.repository.PostLikeRepository;
import click.axpdev.rally.repository.PostRepository;
import click.axpdev.rally.service.ModerationService;
import click.axpdev.rally.service.RateLimitService;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private static final int PAGE_SIZE = 20;
    private static final int POPULAR_COUNT = 3;
    private static final Duration DUPLICATE_WINDOW = Duration.ofMinutes(10);

    private final PostRepository posts;
    private final CommentRepository comments;
    private final PostLikeRepository likes;
    private final ModerationService moderation;
    private final RateLimitService rateLimit;

    public PostController(PostRepository posts, CommentRepository comments,
                          PostLikeRepository likes, ModerationService moderation,
                          RateLimitService rateLimit) {
        this.posts = posts;
        this.comments = comments;
        this.likes = likes;
        this.moderation = moderation;
        this.rateLimit = rateLimit;
    }

    // ── 목록 ─────────────────────────────────────────────

    /**
     * 공개 응답 뷰 — 임시조치(망법 44조의2)된 글은 서버에서 내용을 가려서 내려보낸다.
     * 자리 표시는 유지해 조치 사실을 알 수 있게 한다.
     */
    public record PostView(Long id, Post.Category category, String nickname, String title,
                           String body, long hearts, long comments, java.time.Instant createdAt,
                           boolean blocked) {
        static PostView of(Post p) {
            if (p.isBlocked()) {
                return new PostView(p.getId(), p.getCategory(), "-",
                        "권리침해 신고로 임시조치된 게시물입니다",
                        "운영진 검토 또는 이의신청 절차가 끝나면 다시 표시됩니다.",
                        p.getHearts(), p.getComments(), p.getCreatedAt(), true);
            }
            return new PostView(p.getId(), p.getCategory(), p.getNickname(), p.getTitle(),
                    p.getBody(), p.getHearts(), p.getComments(), p.getCreatedAt(), false);
        }
    }

    @GetMapping
    public Page<PostView> list(@RequestParam(required = false) Post.Category category,
                               @RequestParam(defaultValue = "0") int page) {
        PageRequest pr = PageRequest.of(Math.max(0, page), PAGE_SIZE);
        Page<Post> result = category == null
                ? posts.findByDeletedFalseOrderByCreatedAtDesc(pr)
                : posts.findByCategoryAndDeletedFalseOrderByCreatedAtDesc(category, pr);
        return result.map(PostView::of);
    }

    /** 인기글 TOP 3 — 하트 1개 이상, 하트순 (임시조치 글은 쿼리에서 제외) */
    @GetMapping("/popular")
    public List<PostView> popular() {
        return posts.findPopular(Instant.now(), PageRequest.of(0, POPULAR_COUNT)).stream()
                .map(PostView::of)
                .toList();
    }

    // ── 글 작성 (검열 + 도배 방지) ─────────────────────────

    public record CreateRequest(
            @NotNull Post.Category category,
            @NotBlank @Size(min = 2, max = 12, message = "닉네임은 2~12자") String nickname,
            @NotBlank @Size(min = 4, max = 20, message = "PIN은 4자 이상") String pin,
            @NotBlank @Size(max = 80, message = "제목은 80자까지") String title,
            @Size(max = 1000, message = "본문은 1,000자까지") String body,
            @NotBlank @Size(max = 64) String sid) {}

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateRequest req) {
        Optional<String> blocked = moderation.check(req.nickname(), req.title(), req.body());
        if (blocked.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", blocked.get()));
        }
        if (!rateLimit.allowPost(req.sid())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "잠시 후 다시 작성해주세요 (글은 1분에 1건, 1시간에 10건)"));
        }
        if (posts.existsByTitleAndDeletedFalseAndCreatedAtAfter(req.title().strip(), Instant.now().minus(DUPLICATE_WINDOW))) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "같은 제목의 글이 방금 등록됐어요"));
        }
        Post saved = posts.save(new Post(
                req.category(), req.nickname().strip(), hashPin(req.pin()),
                req.title().strip(), req.body()));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    public record DeleteRequest(@NotBlank String pin) {}

    /** 작성자 본인 삭제 — 화면에서만 숨김, DB에는 이력으로 보존 (소프트 삭제) */
    @PostMapping("/{id}/delete")
    @Transactional
    public ResponseEntity<Void> deleteByAuthor(@PathVariable Long id,
                                               @Valid @RequestBody DeleteRequest req) {
        // 무차별 대입 방어 — 대상 글 기준 제한이라 세션을 바꿔도 우회 불가
        if (!rateLimit.allowPinAttempt("post:" + id)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        return posts.findById(id)
                .filter(p -> !p.isDeleted())
                .map(p -> {
                    if (!pinMatches(p.getPinHash(), req.pin())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Void>build();
                    }
                    p.markDeleted(DeletedBy.AUTHOR);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 하트 ─────────────────────────────────────────────

    public record LikeRequest(@NotBlank @Size(max = 64) String sid) {}

    /**
     * 하트 토글 — 세션당 1회. 원본 sid는 저장하지 않고 해시만.
     * 메서드 전역 @Transactional을 두지 않는 이유: 동시 더블탭 시 INSERT가 유니크 제약에
     * 걸려 DataIntegrityViolationException이 나는데, 하나의 트랜잭션 안이면 그 예외가
     * 트랜잭션을 rollback-only로 만들어 뒤따르는 count 조회까지 깨진다. 호출별 트랜잭션으로
     * 두면 실패한 INSERT만 독립적으로 롤백되고 정상 처리(중복 무시)로 이어진다.
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<?> toggleLike(@PathVariable Long id, @Valid @RequestBody LikeRequest req) {
        if (!posts.existsByIdAndDeletedFalse(id)) return ResponseEntity.notFound().build();
        String sidHash = hash("like:" + req.sid());
        boolean liked;
        Optional<PostLike> existing = likes.findByPostIdAndSidHash(id, sidHash);
        if (existing.isPresent()) {
            likes.delete(existing.get());
            liked = false;
        } else {
            try {
                likes.save(new PostLike(id, sidHash));
            } catch (DataIntegrityViolationException dup) {
                // 동시 더블탭 — 같은 세션의 하트가 이미 들어갔다. 중복은 무시하고 정상 처리.
            }
            liked = true;
        }
        return ResponseEntity.ok(Map.of("liked", liked, "hearts", likes.countByPostId(id)));
    }

    // ── 댓글 ─────────────────────────────────────────────

    @GetMapping("/{id}/comments")
    public List<Comment> listComments(@PathVariable Long id) {
        return comments.findByPostIdAndDeletedFalseOrderByCreatedAtAsc(id);
    }

    public record CommentRequest(
            @NotBlank @Size(min = 2, max = 12, message = "닉네임은 2~12자") String nickname,
            @NotBlank @Size(min = 4, max = 20, message = "PIN은 4자 이상") String pin,
            @NotBlank @Size(max = 300, message = "댓글은 300자까지") String body,
            @NotBlank @Size(max = 64) String sid) {}

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> createComment(@PathVariable Long id,
                                           @Valid @RequestBody CommentRequest req) {
        if (!posts.existsByIdAndDeletedFalse(id)) return ResponseEntity.notFound().build();
        Optional<String> blocked = moderation.check(req.nickname(), req.body());
        if (blocked.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", blocked.get()));
        }
        if (!rateLimit.allowComment(req.sid())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "잠시 후 다시 작성해주세요 (댓글은 1분에 3건)"));
        }
        if (comments.existsByPostIdAndBodyAndDeletedFalseAndCreatedAtAfter(id, req.body().strip(),
                Instant.now().minus(Duration.ofMinutes(1)))) {
            return ResponseEntity.badRequest().body(Map.of("error", "같은 댓글이 방금 등록됐어요"));
        }
        Comment saved = comments.save(new Comment(id, req.nickname().strip(), hashPin(req.pin()), req.body().strip()));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** 댓글 작성자 본인 삭제 — 소프트 삭제 */
    @PostMapping("/comments/{commentId}/delete")
    @Transactional
    public ResponseEntity<Void> deleteCommentByAuthor(@PathVariable Long commentId,
                                                      @Valid @RequestBody DeleteRequest req) {
        if (!rateLimit.allowPinAttempt("comment:" + commentId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }
        return comments.findById(commentId)
                .filter(c -> !c.isDeleted())
                .map(c -> {
                    if (!pinMatches(c.getPinHash(), req.pin())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Void>build();
                    }
                    c.markDeleted(DeletedBy.AUTHOR);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 공통 ─────────────────────────────────────────────

    private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();

    /**
     * PIN 해시 — 레코드마다 무작위 salt를 생성해 "saltHex$hashHex"로 저장.
     * 고정 salt와 달리 레인보우 테이블이 무력화된다 (DB 파일 탈취 시나리오 대비).
     */
    static String hashPin(String pin) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        String saltHex = HexFormat.of().formatHex(salt);
        return saltHex + "$" + sha256(saltHex + ":" + pin);
    }

    private static boolean pinMatches(String stored, String pin) {
        int sep = stored.indexOf('$');
        if (sep < 0) return false;
        String saltHex = stored.substring(0, sep);
        String expected = stored.substring(sep + 1);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                sha256(saltHex + ":" + pin).getBytes(StandardCharsets.UTF_8));
    }

    /** 신고 sidHash 등 비-비밀 식별자 해시용 (salt 불필요) */
    static String hash(String value) {
        return sha256("rally:" + value);
    }

    private static String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
