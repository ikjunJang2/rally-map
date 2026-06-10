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
