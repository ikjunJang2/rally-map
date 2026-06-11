package click.axpdev.rally.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 국가법령정보센터(law.go.kr) 법령 검색·본문 프록시.
 * OC(오픈API 이메일 ID)는 law.go.kr → 오픈API 신청에서 무료 발급하며, 호출 서버 IP를 등록해야 한다.
 * 미설정 시 enabled=false — 프론트는 law.go.kr 검색 링크로 폴백.
 */
@RestController
@RequestMapping("/api/laws")
public class LawController {

    private static final Logger log = LoggerFactory.getLogger(LawController.class);

    private static final java.time.Duration CACHE_TTL = java.time.Duration.ofMinutes(30);
    private static final int MAX_CACHE = 300;
    private static final int UPSTREAM_PER_MINUTE = 30; // 법제처 서버 보호 — OC 정지 예방

    private final RestClient http = RestClient.create();
    private final String envOc;
    private final click.axpdev.rally.service.RateLimitService rateLimit;
    private final click.axpdev.rally.service.SettingService settings;

    private record CacheEntry(List<Law> laws, java.time.Instant at) {}
    private final java.util.concurrent.ConcurrentHashMap<String, CacheEntry> cache =
            new java.util.concurrent.ConcurrentHashMap<>();

    private record DetailEntry(Map<String, Object> data, java.time.Instant at) {}
    private final java.util.concurrent.ConcurrentHashMap<String, DetailEntry> detailCache =
            new java.util.concurrent.ConcurrentHashMap<>();

    public LawController(@Value("${rally.law.oc}") String oc,
                         click.axpdev.rally.service.RateLimitService rateLimit,
                         click.axpdev.rally.service.SettingService settings) {
        this.envOc = oc.strip();
        this.rateLimit = rateLimit;
        this.settings = settings;
    }

    /** 관리자 콘솔에서 등록한 OC 우선, 없으면 환경변수 기본값 */
    private String oc() { return settings.get("law.oc", envOc).strip(); }

    /** 법령일련번호(mst)로 앱 안에서 본문을 받아오므로 OC가 박힌 외부 링크는 더 이상 노출하지 않는다 */
    public record Law(String name, String mst, String dept, String date) {}

    @GetMapping
    public Map<String, Object> search(@RequestParam String q) {
        String oc = oc();
        if (oc.isBlank()) return Map.of("enabled", false, "laws", List.of());

        String key = q.strip().toLowerCase();
        CacheEntry hit = cache.get(key);
        if (hit != null && java.time.Instant.now().isBefore(hit.at().plus(CACHE_TTL))) {
            return Map.of("enabled", true, "laws", hit.laws());
        }
        if (!rateLimit.allowGlobal("law", UPSTREAM_PER_MINUTE)) {
            // 상한 초과 — 만료된 캐시라도 있으면 사용, 없으면 빈 결과
            return Map.of("enabled", true, "laws", hit != null ? hit.laws() : List.of());
        }

        List<Law> result = new ArrayList<>();
        try {
            JsonNode root = fetchJson(
                    "https://www.law.go.kr/DRF/lawSearch.do?OC={oc}&target=law&type=JSON&display=10&query={q}",
                    oc, q);
            JsonNode laws = root == null ? null : root.path("LawSearch").path("law");
            for (JsonNode l : iterable(laws)) {
                result.add(new Law(
                        l.path("법령명한글").asText("(이름 없음)"),
                        l.path("법령일련번호").asText(""),
                        l.path("소관부처명").asText(""),
                        l.path("시행일자").asText("")));
            }
        } catch (Exception e) {
            log.warn("법령 검색 실패 (q='{}'): {}", q, e.getMessage());
            // 실패 시 캐시 미저장 — 다음 요청에서 재시도
            return Map.of("enabled", true, "laws", hit != null ? hit.laws() : List.of());
        }

        if (cache.size() >= MAX_CACHE) cache.clear(); // 단순 전체 비움 — 법령 검색 캐시는 재구축 비용 낮음
        cache.put(key, new CacheEntry(List.copyOf(result), java.time.Instant.now()));
        return Map.of("enabled", true, "laws", result);
    }

    /** 법령 본문 — 법령일련번호(mst)의 조문을 앱 안에서 표시하기 위해 구조화해 반환 */
    @GetMapping("/{mst}")
    public Map<String, Object> detail(@PathVariable String mst) {
        String oc = oc();
        if (oc.isBlank()) return Map.of("enabled", false, "name", "", "articles", List.of());
        if (!mst.matches("\\d{1,12}")) return Map.of("enabled", true, "name", "", "articles", List.of());

        DetailEntry hit = detailCache.get(mst);
        if (hit != null && java.time.Instant.now().isBefore(hit.at().plus(CACHE_TTL))) return hit.data();
        if (!rateLimit.allowGlobal("law", UPSTREAM_PER_MINUTE)) {
            return hit != null ? hit.data() : Map.of("enabled", true, "name", "", "articles", List.of());
        }

        try {
            JsonNode root = fetchJson(
                    "https://www.law.go.kr/DRF/lawService.do?OC={oc}&target=law&type=JSON&MST={mst}", oc, mst);
            JsonNode law = root == null ? null : root.path("법령");
            String name = law == null ? "" : law.path("기본정보").path("법령명_한글").asText("");
            List<Map<String, String>> articles = new ArrayList<>();
            if (law != null) {
                for (JsonNode u : iterable(law.path("조문").path("조문단위"))) {
                    StringBuilder sb = new StringBuilder(u.path("조문내용").asText("").strip());
                    for (JsonNode h : iterable(u.path("항"))) {
                        String hc = h.path("항내용").asText("").strip();
                        if (!hc.isEmpty()) sb.append("\n").append(hc);
                    }
                    String text = sb.toString().strip();
                    if (!text.isEmpty()) {
                        articles.add(Map.of("no", u.path("조문번호").asText(""), "content", text));
                    }
                }
            }
            Map<String, Object> data = Map.of("enabled", true, "name", name, "articles", articles);
            if (detailCache.size() >= MAX_CACHE) detailCache.clear();
            detailCache.put(mst, new DetailEntry(data, java.time.Instant.now()));
            return data;
        } catch (Exception e) {
            log.warn("법령 본문 실패 (mst={}): {}", mst, e.getMessage());
            return hit != null ? hit.data() : Map.of("enabled", true, "name", "", "articles", List.of());
        }
    }

    /**
     * law.go.kr 호출 — TLS 핸드셰이크가 간헐적으로 끊겨("Remote host terminated the handshake")
     * 한 번에 실패하는 경우가 있어 최대 3회 재시도한다.
     */
    private JsonNode fetchJson(String uri, Object... vars) {
        RuntimeException last = null;
        for (int i = 0; i < 3; i++) {
            try {
                return http.get().uri(uri, vars).retrieve().body(JsonNode.class);
            } catch (RuntimeException e) {
                last = e;
            }
        }
        throw last != null ? last : new IllegalStateException("법령 API 무응답");
    }

    /** JSON 배열이면 그대로, 단일 객체면 1개짜리로, 그 외엔 빈 것으로 순회 (law.go.kr은 결과 1개면 객체로 줌) */
    private static Iterable<JsonNode> iterable(JsonNode n) {
        if (n != null && n.isArray()) return n;
        if (n != null && n.isObject()) return List.of(n);
        return List.of();
    }
}
