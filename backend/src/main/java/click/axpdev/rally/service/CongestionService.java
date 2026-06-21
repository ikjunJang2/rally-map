package click.axpdev.rally.service;

import tools.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * 서울시 「실시간 도시데이터」 실시간 인구(citydata_ppltn) — 장소 혼잡도·인구·예측을 5분마다 수집.
 * KT 기지국 신호 집계 기반 서울시 공식 공개 데이터(개인 추적 아님 → "추적기 없음" 원칙 부합).
 * 키 없으면 자동 비활성. 키 발급: data.seoul.go.kr (열린데이터광장).
 */
@Service
public class CongestionService {

    private static final Logger log = LoggerFactory.getLogger(CongestionService.class);
    private static final String DEFAULT_AREA = "올림픽공원";

    public record Forecast(String time, String level, Integer min, Integer max) {}
    public record Status(boolean enabled, String area, String level, String message,
                         Integer min, Integer max, String time, boolean error, List<Forecast> forecast) {
        static Status off() { return new Status(false, null, null, null, null, null, null, false, List.of()); }
        static Status error(String area) { return new Status(true, area, null, null, null, null, null, true, List.of()); }
    }

    private final RestClient http;
    private final String envKey;
    private final String area;
    private final SettingService settings;
    private volatile Status current = Status.off();

    public CongestionService(@Value("${rally.seoul.api-key}") String apiKey,
                             @Value("${rally.seoul.area:}") String area,
                             SettingService settings) {
        this.envKey = apiKey.strip();
        this.area = area.isBlank() ? DEFAULT_AREA : area.strip();
        this.settings = settings;
        var f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5000);
        f.setReadTimeout(8000);
        this.http = RestClient.builder().requestFactory(f).build();
    }

    /** 관리자 콘솔 등록 키 우선, 없으면 환경변수 기본값 */
    private String key() { return settings.get("seoul.api-key", envKey).strip(); }

    public boolean enabled() { return !key().isBlank(); }

    @Scheduled(fixedDelayString = "${rally.seoul.interval-ms:300000}", initialDelay = 8000)
    public void refresh() {
        if (!enabled()) { current = Status.off(); return; }
        try {
            String url = "http://openapi.seoul.go.kr:8088/" + key() + "/json/citydata_ppltn/1/1/"
                    + URLEncoder.encode(area, StandardCharsets.UTF_8);
            JsonNode root = http.get().uri(URI.create(url)).retrieve().body(JsonNode.class);
            JsonNode rows = root == null ? null : root.path("SeoulRtd.citydata_ppltn");
            JsonNode r = (rows != null && rows.isArray() && !rows.isEmpty()) ? rows.get(0)
                       : (rows != null && rows.isObject() ? rows : null);
            if (r == null || r.path("AREA_CONGEST_LVL").asText("").isBlank()) {
                current = Status.error(area);
                return;
            }
            List<Forecast> fc = new ArrayList<>();
            for (JsonNode f : r.path("FCST_PPLTN")) {
                fc.add(new Forecast(f.path("FCST_TIME").asText(""), f.path("FCST_CONGEST_LVL").asText(""),
                        toInt(f.path("FCST_PPLTN_MIN")), toInt(f.path("FCST_PPLTN_MAX"))));
            }
            current = new Status(true, r.path("AREA_NM").asText(area),
                    r.path("AREA_CONGEST_LVL").asText(""), r.path("AREA_CONGEST_MSG").asText(""),
                    toInt(r.path("AREA_PPLTN_MIN")), toInt(r.path("AREA_PPLTN_MAX")),
                    r.path("PPLTN_TIME").asText(""), false, fc);
            log.info("서울 혼잡도 갱신: {} '{}' ({}~{})", area, current.level(), current.min(), current.max());
        } catch (Exception e) {
            log.warn("서울 혼잡도 조회 실패: {}", e.getMessage());
            current = Status.error(area);
        }
    }

    private static Integer toInt(JsonNode n) {
        if (n == null || n.isMissingNode() || n.isNull()) return null;
        try { return Integer.valueOf(n.asText().trim()); } catch (Exception e) { return null; }
    }

    public Status current() { return enabled() ? current : Status.off(); }
}
