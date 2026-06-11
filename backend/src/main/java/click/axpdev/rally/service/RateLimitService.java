package click.axpdev.rally.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
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

    /**
     * 관리자 로그인 시도 제한 — 계정(username)별 (분당 5회 + 15분당 10회).
     * 단일 전역 카운터로 두면 공격자가 한도를 소진시켜 진짜 관리자의 로그인까지 막을 수 있어
     * 계정별로 분리한다. 더불어 임의 username 무한 생성으로 인한 메모리 남용을 막는 넉넉한
     * 전역 backstop(분당 100회)을 둔다.
     */
    public boolean allowLogin(String username) {
        String u = username == null ? "" : username.strip().toLowerCase();
        return allow("login:" + u, 5, Duration.ofMinutes(1))
                && allow("login15:" + u, 10, Duration.ofMinutes(15))
                && allow("login:all", 100, Duration.ofMinutes(1));
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

    /**
     * 버려진 키 정리 — sid·username은 클라이언트가 정하므로 값을 회전시키면 엔트리가 무한히
     * 쌓여 메모리 고갈(DoS)로 이어진다. 10분마다 모든 타임스탬프가 만료된 데크를 제거한다.
     * 최장 윈도우(15분)보다 짧지만, 비워진 키는 다시 채워져도 무방하므로 1시간 윈도우 키도
     * 보수적으로 "현재 비어 있으면" 제거한다.
     */
    @Scheduled(fixedDelay = 600_000L)
    void sweepIdle() {
        Instant now = Instant.now();
        for (Iterator<Map.Entry<String, Deque<Instant>>> it = hits.entrySet().iterator(); it.hasNext(); ) {
            Deque<Instant> deque = it.next().getValue();
            synchronized (deque) {
                while (!deque.isEmpty() && deque.peekFirst().isBefore(now.minus(Duration.ofHours(1)))) {
                    deque.pollFirst();
                }
                if (deque.isEmpty()) it.remove();
            }
        }
    }
}
