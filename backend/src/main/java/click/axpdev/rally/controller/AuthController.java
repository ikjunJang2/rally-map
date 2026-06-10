package click.axpdev.rally.controller;

import click.axpdev.rally.auth.AdminAuthService;
import click.axpdev.rally.service.RateLimitService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AdminAuthService auth;
    private final RateLimitService rateLimit;

    public AuthController(AdminAuthService auth, RateLimitService rateLimit) {
        this.auth = auth;
        this.rateLimit = rateLimit;
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@Valid @RequestBody LoginRequest req) {
        // 무차별 대입 방어 — 계정 기준 전역 제한
        if (!rateLimit.allowLogin()) {
            log.warn("로그인 시도 제한 초과 (계정: {})", req.username());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요."));
        }
        String token = auth.login(req.username(), req.password());
        if (token == null) {
            log.warn("로그인 실패 (계정: {})", req.username());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "아이디 또는 비밀번호가 올바르지 않습니다"));
        }
        return ResponseEntity.ok(Map.of("token", token));
    }
}
