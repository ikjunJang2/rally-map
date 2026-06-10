package click.axpdev.rally.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

/**
 * 관리자 토큰 발급·검증. 외부 의존성 없이 HMAC-SHA256 서명 토큰 사용.
 * 형식: "{만료epoch초}.{서명}"
 */
@Service
public class AdminAuthService {

    // 토큰 탈취 시 노출 창을 줄이기 위해 짧게 유지 (재로그인으로 갱신)
    private static final Duration TOKEN_TTL = Duration.ofHours(2);

    private final String username;
    private final String password;
    private final byte[] secret;

    public AdminAuthService(@Value("${rally.admin.username}") String username,
                            @Value("${rally.admin.password}") String password,
                            @Value("${rally.admin.token-secret}") String tokenSecret) {
        this.username = username;
        this.password = password;
        this.secret = tokenSecret.getBytes(StandardCharsets.UTF_8);
    }

    /** 자격 확인 후 토큰 발급. 실패 시 null. */
    public String login(String user, String pass) {
        if (!constantTimeEquals(username, user) || !constantTimeEquals(password, pass)) {
            return null;
        }
        long exp = Instant.now().plus(TOKEN_TTL).getEpochSecond();
        return exp + "." + sign(String.valueOf(exp));
    }

    public boolean verify(String token) {
        if (token == null) return false;
        int dot = token.indexOf('.');
        if (dot < 1) return false;
        String exp = token.substring(0, dot);
        String sig = token.substring(dot + 1);
        try {
            if (Instant.now().getEpochSecond() > Long.parseLong(exp)) return false;
        } catch (NumberFormatException e) {
            return false;
        }
        return constantTimeEquals(sign(exp), sig);
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC 서명 실패", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }
}
