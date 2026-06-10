package click.axpdev.rally.controller.admin;

import click.axpdev.rally.service.SettingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 외부 연동 키 등록 — /api/admin/** 라 AdminInterceptor가 토큰을 검증한다.
 * 화이트리스트(FIELDS)에 있는 키만 허용해 임의 키 주입을 막는다.
 * 비밀(secret) 키는 값을 응답에 돌려주지 않고 등록 여부만 노출한다.
 * (법령 OC는 공개 식별자라 secret=false — 그대로 보여줘 수정 가능)
 */
@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingController {

    private final SettingService settings;
    private final String envLawOc;
    private final String envYoutubeKey;
    private final String envItsKey;
    private final RestClient http;

    public AdminSettingController(SettingService settings,
                                  @Value("${rally.law.oc}") String envLawOc,
                                  @Value("${rally.youtube.api-key}") String envYoutubeKey,
                                  @Value("${rally.its.api-key}") String envItsKey) {
        this.settings = settings;
        this.envLawOc = envLawOc;
        this.envYoutubeKey = envYoutubeKey;
        this.envItsKey = envItsKey;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(8000);
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    private record Field(String key, String label, String help, boolean secret) {}

    private static final List<Field> FIELDS = List.of(
            new Field("law.oc", "국가법령정보 OC (오픈API 이메일 ID)",
                    "open.law.go.kr 오픈API 신청 후 받는 OC. 보통 가입 이메일의 @ 앞부분이에요. 안내 탭 법령 검색에 쓰여요.",
                    false),
            new Field("youtube.api-key", "YouTube Data API 키",
                    "console.cloud.google.com에서 발급. 현장 라이브 자동 수집(검색·시청자수)에 쓰여요. 등록하면 다음 수집 주기부터 적용돼요.",
                    true),
            new Field("its.api-key", "ITS 교통정보 오픈API 키 (CCTV)",
                    "its.go.kr 오픈데이터에서 발급. 경기장 주변 교통 CCTV 조회에 쓰여요.",
                    true)
    );

    private static Field field(String key) {
        return FIELDS.stream().filter(f -> f.key().equals(key)).findFirst().orElse(null);
    }

    @GetMapping
    public List<Map<String, Object>> all() {
        return FIELDS.stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", f.key());
            m.put("label", f.label());
            m.put("help", f.help());
            m.put("secret", f.secret());
            m.put("set", settings.has(f.key()));
            // 비밀 키는 값을 돌려주지 않음(노출 방지). 공개 식별자만 그대로 노출.
            m.put("value", f.secret() ? "" : settings.get(f.key(), ""));
            return m;
        }).toList();
    }

    public record SetRequest(@NotBlank String key, @Size(max = 200) String value) {}

    @PutMapping
    public ResponseEntity<?> set(@Valid @RequestBody SetRequest req) {
        if (field(req.key()) == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "허용되지 않은 설정 키예요"));
        }
        settings.set(req.key(), req.value());
        return ResponseEntity.noContent().build();
    }

    // ── 키 테스트 ─────────────────────────────────────────
    // 저장된(또는 환경변수) 키로 실제 외부 호출을 한 번 해보고 정상/무효/연결불가를 알려준다.
    public record TestRequest(@NotBlank String key) {}

    private record Res(boolean ok, String message) {}

    @PostMapping("/test")
    public Map<String, Object> test(@Valid @RequestBody TestRequest req) {
        Res r = switch (req.key()) {
            case "law.oc" -> testLaw();
            case "youtube.api-key" -> testYoutube();
            case "its.api-key" -> testIts();
            default -> new Res(false, "허용되지 않은 설정 키예요");
        };
        return Map.of("ok", r.ok(), "message", r.message());
    }

    private Res testLaw() {
        String oc = settings.get("law.oc", envLawOc).strip();
        if (oc.isBlank()) return new Res(false, "OC가 등록되지 않았어요");
        try {
            JsonNode root = http.get()
                    .uri("https://www.law.go.kr/DRF/lawSearch.do?OC={oc}&target=law&type=JSON&display=1&query={q}", oc, "헌법")
                    .retrieve().body(JsonNode.class);
            JsonNode laws = root == null ? null : root.path("LawSearch").path("law");
            boolean has = laws != null && !laws.isMissingNode()
                    && (laws.isArray() ? laws.size() > 0 : laws.isObject());
            return has ? new Res(true, "정상 — '헌법' 검색 결과를 받았어요")
                       : new Res(false, "OC가 유효하지 않거나 OPEN API 승인 전이에요 (결과 없음)");
        } catch (Exception e) {
            return new Res(false, "법령정보센터 연결 실패: " + brief(e));
        }
    }

    private Res testYoutube() {
        String key = settings.get("youtube.api-key", envYoutubeKey).strip();
        if (key.isBlank()) return new Res(false, "키가 등록되지 않았어요");
        try {
            JsonNode root = http.get()
                    .uri("https://www.googleapis.com/youtube/v3/videos?part=id&id=Ks-_Mh1QhMc&key={key}", key)
                    .retrieve().body(JsonNode.class);
            if (root != null && root.has("error")) {
                return new Res(false, "키 오류: " + root.path("error").path("message").asText("invalid"));
            }
            return new Res(true, "정상 — YouTube API 응답을 받았어요");
        } catch (RestClientResponseException re) {
            return new Res(false, "키가 유효하지 않거나 할당량 초과예요 (" + re.getStatusCode().value() + ")");
        } catch (Exception e) {
            return new Res(false, "YouTube 연결 실패: " + brief(e));
        }
    }

    private Res testIts() {
        String key = settings.get("its.api-key", envItsKey).strip();
        if (key.isBlank()) return new Res(false, "키가 등록되지 않았어요");
        try {
            JsonNode root = http.get()
                    .uri("https://openapi.its.go.kr:9443/cctvInfo?apiKey={k}&type=all&cctvType=1&minX=127.0&maxX=127.2&minY=37.4&maxY=37.6&getType=json", key)
                    .retrieve().body(JsonNode.class);
            String code = root == null ? "" : root.path("response").path("header").path("resultCode").asText("");
            if ("4005".equals(code)) return new Res(false, "키가 유효하지 않아요 (존재하지 않는 인증키)");
            JsonNode data = root == null ? null : root.path("response").path("data");
            boolean has = data != null && data.isArray() && data.size() > 0;
            return has ? new Res(true, "정상 — CCTV 목록을 받았어요")
                       : new Res(false, "응답은 받았으나 데이터가 없어요 (키·범위 확인)");
        } catch (RestClientResponseException re) {
            return new Res(false, "키 오류 또는 권한 문제 (" + re.getStatusCode().value() + ")");
        } catch (Exception e) {
            return new Res(false, "ITS 서버에 연결할 수 없어요 (서버 점검 또는 우리 서버 IP 차단)");
        }
    }

    private static String brief(Exception e) {
        String m = e.getMessage();
        if (m == null) return e.getClass().getSimpleName();
        return m.length() > 80 ? m.substring(0, 80) + "…" : m;
    }
}
