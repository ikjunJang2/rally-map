package click.axpdev.rally.controller;

import click.axpdev.rally.service.RateLimitService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 익명 동시 접속자 수.
 * 클라이언트가 만든 무작위 세션 ID를 30초마다 핑 — 서버는 메모리에 마지막 핑 시각만 보관.
 * IP·식별정보 저장 없음, 75초 무응답 시 자동 소멸, 재시작 시 초기화 (개인정보 제로 원칙).
 */
@RestController
@RequestMapping("/api/presence")
public class PresenceController {

    private static final Duration TTL = Duration.ofSeconds(75);
    private static final int MAX_SESSIONS = 100_000; // 메모리 고갈 방어 상한

    private final ConcurrentHashMap<String, Instant> sessions = new ConcurrentHashMap<>();
    private final RateLimitService rateLimit;

    public PresenceController(RateLimitService rateLimit) {
        this.rateLimit = rateLimit;
    }

    public record Ping(@NotBlank @Size(max = 64) String sid) {}

    @PostMapping
    public Map<String, Object> ping(@Valid @RequestBody Ping ping) {
        Instant now = Instant.now();
        Instant cutoff = now.minus(TTL);
        sessions.entrySet().removeIf(e -> e.getValue().isBefore(cutoff));

        // 전역 핑 상한 초과 또는 맵 포화 시 신규 세션 거부 (DoS 방어)
        boolean existing = sessions.containsKey(ping.sid());
        if (!existing && (sessions.size() >= MAX_SESSIONS || !rateLimit.allowPresence())) {
            return Map.of("count", sessions.size());
        }
        sessions.put(ping.sid(), now);
        return Map.of("count", sessions.size());
    }
}
