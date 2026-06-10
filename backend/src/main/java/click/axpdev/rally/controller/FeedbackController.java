package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Feedback;
import click.axpdev.rally.repository.FeedbackRepository;
import click.axpdev.rally.service.MailService;
import click.axpdev.rally.service.ModerationService;
import click.axpdev.rally.service.RateLimitService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/** "개발자에게 바란다" 피드백 접수 — 저장 + (설정 시) 메일 발송 */
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackRepository feedback;
    private final ModerationService moderation;
    private final RateLimitService rateLimit;
    private final MailService mail;

    public FeedbackController(FeedbackRepository feedback, ModerationService moderation,
                              RateLimitService rateLimit, MailService mail) {
        this.feedback = feedback;
        this.moderation = moderation;
        this.rateLimit = rateLimit;
        this.mail = mail;
    }

    public record FeedbackRequest(
            @NotBlank @Size(max = 2000) String message,
            @Size(max = 120) String contact,
            @NotBlank @Size(max = 64) String sid) {}

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody FeedbackRequest req) {
        Optional<String> blocked = moderation.check(req.message(), req.contact());
        if (blocked.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", blocked.get()));
        }
        if (!rateLimit.allowFeedback(req.sid())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "잠시 후 다시 보내주세요"));
        }
        feedback.save(new Feedback(req.message().strip(),
                req.contact() == null ? null : req.contact().strip()));
        mail.sendFeedback(req.message(), req.contact()); // 실패해도 저장은 유지
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "소중한 의견 고맙습니다. 잘 전달됐어요."));
    }
}
