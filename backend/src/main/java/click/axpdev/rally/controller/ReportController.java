package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Report;
import click.axpdev.rally.repository.CommentRepository;
import click.axpdev.rally.repository.PostRepository;
import click.axpdev.rally.repository.ReportRepository;
import click.axpdev.rally.service.ModerationService;
import click.axpdev.rally.service.RateLimitService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/** 권리침해·위법 게시물 신고 접수 (정보통신망법 44조의2, 공직선거법 82조의4 대응) */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reports;
    private final PostRepository posts;
    private final CommentRepository comments;
    private final ModerationService moderation;
    private final RateLimitService rateLimit;

    public ReportController(ReportRepository reports, PostRepository posts,
                            CommentRepository comments, ModerationService moderation,
                            RateLimitService rateLimit) {
        this.reports = reports;
        this.posts = posts;
        this.comments = comments;
        this.moderation = moderation;
        this.rateLimit = rateLimit;
    }

    public record ReportRequest(
            @NotNull Report.TargetType targetType,
            @NotNull Long targetId,
            @NotNull Report.Reason reason,
            @Size(max = 500) String detail,
            @NotBlank @Size(max = 64) String sid) {}

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody ReportRequest req) {
        boolean exists = req.targetType() == Report.TargetType.POST
                ? posts.existsById(req.targetId())
                : comments.existsById(req.targetId());
        if (!exists) return ResponseEntity.notFound().build();

        Optional<String> blocked = moderation.check(req.detail());
        if (blocked.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", blocked.get()));
        }
        if (!rateLimit.allowReport(req.sid())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "잠시 후 다시 신고해주세요"));
        }
        String sidHash = PostController.hash("report:" + req.sid());
        if (reports.existsByTargetTypeAndTargetIdAndSidHash(req.targetType(), req.targetId(), sidHash)) {
            return ResponseEntity.badRequest().body(Map.of("error", "이미 신고한 게시물이에요"));
        }
        reports.save(new Report(req.targetType(), req.targetId(), req.reason(), req.detail(), sidHash));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "신고가 접수됐어요. 운영진이 확인 후 조치합니다."));
    }
}
