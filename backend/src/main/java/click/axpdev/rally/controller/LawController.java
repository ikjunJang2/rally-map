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
 * 국가법령정보센터(law.go.kr) 법령 검색 프록시.
 * OC(오픈API 이메일 ID)는 law.go.kr → 오픈API 신청에서 무료 발급.
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

    public LawController(@Value("${rally.law.oc}") String oc,
                         click.axpdev.rally.service.RateLimitService rateLimit,
                         click.axpdev.rally.service.SettingService settings) {
        this.envOc = oc.strip();
        this.rateLimit = rateLimit;
        this.settings = settings;
    }

    /** 관리자 콘솔에서 등록한 OC 우선, 없으면 환경변수 기본값 */
    private String oc() { return settings.get("law.oc", envOc).strip(); }

    public record Law(String name, String link, String dept, String date) {}

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
            JsonNode root = http.get()
                    .uri("https://www.law.go.kr/DRF/lawSearch.do?OC={oc}&target=law&type=JSON&display=10&query={q}",
                            oc, q)
                    .retrieve()
                    .body(JsonNode.class);
            JsonNode laws = root == null ? null : root.path("LawSearch").path("law");
            if (laws != null && laws.isArray()) {
                for (JsonNode l : laws) {
                    String link = l.path("법령상세링크").asText("");
                    result.add(new Law(
                            l.path("법령명한글").asText("(이름 없음)"),
                            link.isEmpty() ? "" : "https://www.law.go.kr" + link,
                            l.path("소관부처명").asText(""),
                            l.path("시행일자").asText("")));
                }
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
}
