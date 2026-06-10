package click.axpdev.rally.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 도배 방지 — 세션별 작성 횟수를 메모리에서만 추적 (저장·로그 없음).
 * 글: 분당 1건 + 시간당 10건 / 댓글: 분당 3건 + 시간당 30건
 */
@Service
public class RateLimitService {

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    public boolean allowPost(String sid) {
        return allow("p:" + sid, 1, Duration.ofMinutes(1))
                && allow("ph:" + sid, 10, Duration.ofHours(1));
    }

    public boolean allowComment(String sid) {
        return allow("c:" + sid, 3, Duration.ofMinutes(1))
                && allow("ch:" + sid, 30, Duration.ofHours(1));
    }

    public boolean allowReport(String sid) {
        return allow("r:" + sid, 3, Duration.ofMinutes(1))
                && allow("rh:" + sid, 20, Duration.ofHours(1));
    }

    /**
     * PIN 검증 시도 제한 — 공격 대상(글/댓글) 기준이라 세션ID를 바꿔도 우회 불가.
     * 무차별 대입 방어: 대상당 분당 5회 + 시간당 20회.
     */
    public boolean allowPinAttempt(String targetKey) {
        return allow("pin:" + targetKey, 5, Duration.ofMinutes(1))
                && allow("pinh:" + targetKey, 20, Duration.ofHours(1));
    }

    /** 관리자 로그인 시도 제한 — 계정 기준 전역 (분당 5회 + 15분당 10회) */
    public boolean allowLogin() {
        return allow("login", 5, Duration.ofMinutes(1))
                && allow("login15", 10, Duration.ofMinutes(15));
    }

    /** 접속자 핑 전역 상한 — 메모리 고갈 DoS 방어 (분당 600회) */
    public boolean allowPresence() {
        return allow("presence", 600, Duration.ofMinutes(1));
    }

    /** 외부 API 프록시 보호용 전역 상한 */
    public boolean allowGlobal(String key, int maxPerMinute) {
        return allow("g:" + key, maxPerMinute, Duration.ofMinutes(1));
    }

    private boolean allow(String key, int max, Duration window) {
        Instant cutoff = Instant.now().minus(window);
        Deque<Instant> deque = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (deque) {
            while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) {
                deque.pollFirst();
            }
            if (deque.size() >= max) return false;
            deque.addLast(Instant.now());
            return true;
        }
    }
}
