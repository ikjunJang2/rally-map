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

    private final RestClient http = RestClient.create();
    private final String oc;

    public LawController(@Value("${rally.law.oc}") String oc) {
        this.oc = oc.strip();
    }

    public record Law(String name, String link, String dept, String date) {}

    @GetMapping
    public Map<String, Object> search(@RequestParam String q) {
        if (oc.isBlank()) return Map.of("enabled", false, "laws", List.of());

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
        }
        return Map.of("enabled", true, "laws", result);
    }
}
