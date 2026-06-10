package click.axpdev.rally.auth;

import click.axpdev.rally.service.SettingService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
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

    /** DB에 저장하는 관리자 비번 설정 키 (솔트 해시). 화이트리스트 밖이라 일반 설정 API로는 못 건드림. */
    private static final String PW_KEY = "admin.pw";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final String username;
    private final String envPassword;
    private final byte[] secret;
    private final SettingService settings;

    public AdminAuthService(@Value("${rally.admin.username}") String username,
                            @Value("${rally.admin.password}") String password,
                            @Value("${rally.admin.token-secret}") String tokenSecret,
                            SettingService settings) {
        this.username = username;
        this.envPassword = password;
        this.secret = tokenSecret.getBytes(StandardCharsets.UTF_8);
        this.settings = settings;
    }

    /** 자격 확인 후 토큰 발급. 실패 시 null. */
    public String login(String user, String pass) {
        if (!constantTimeEquals(username, user) || !checkPassword(pass)) {
            return null;
        }
        long exp = Instant.now().plus(TOKEN_TTL).getEpochSecond();
        return exp + "." + sign(String.valueOf(exp));
    }

    /** 현재 비밀번호가 맞는지 — 변경 화면에서 본인 확인용. */
    public boolean verifyPassword(String pass) {
        return checkPassword(pass);
    }

    /** 새 비밀번호로 교체 (솔트 해시로 DB 저장). 이후 로그인부터 적용. */
    public void setPassword(String next) {
        settings.set(PW_KEY, hashPassword(next.strip()));
    }

    /** DB 등록 비번(솔트 해시) 우선, 없으면 부팅용 환경변수 평문 비번. */
    private boolean checkPassword(String pass) {
        if (pass == null) return false;
        String stored = settings.get(PW_KEY, "");
        if (!stored.isBlank()) return verifyHashed(pass, stored);
        return constantTimeEquals(envPassword, pass);
    }

    // PIN 해시와 동일 규약: "saltHex$sha256(saltHex:비번)" — DB 파일 탈취 시 레인보우 테이블 무력화
    private static String hashPassword(String pass) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        String saltHex = HexFormat.of().formatHex(salt);
        return saltHex + "$" + sha256(saltHex + ":" + pass);
    }

    private static boolean verifyHashed(String pass, String stored) {
        int sep = stored.indexOf('$');
        if (sep < 0) return false;
        String saltHex = stored.substring(0, sep);
        String expected = stored.substring(sep + 1);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                sha256(saltHex + ":" + pass).getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
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
