package click.axpdev.rally.controller.admin;

import click.axpdev.rally.auth.AdminAuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 관리자 계정 — 비밀번호 변경. /api/admin/** 라 AdminInterceptor가 토큰을 검증한다.
 * 즉 (1) 로그인 토큰 + (2) 현재 비밀번호 두 가지를 모두 알아야 변경 가능.
 */
@RestController
@RequestMapping("/api/admin/account")
public class AdminAccountController {

    private final AdminAuthService auth;

    public AdminAccountController(AdminAuthService auth) {
        this.auth = auth;
    }

    public record PasswordRequest(@NotBlank String current,
                                  @NotBlank @Size(min = 8, max = 100) String next) {}

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody PasswordRequest req) {
        if (!auth.verifyPassword(req.current())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "현재 비밀번호가 일치하지 않아요"));
        }
        auth.setPassword(req.next());
        return ResponseEntity.noContent().build();
    }
}
