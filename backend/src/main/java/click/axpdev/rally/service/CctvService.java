package click.axpdev.rally.service;

import tools.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * ITS 국가교통정보센터 오픈API로 핸드볼경기장 주변 교통 CCTV(HLS 스트림)를 조회.
 * https://www.its.go.kr/opendata — 무료 키 발급 후 ITS_API_KEY 환경변수로 주입.
 * 10분 캐시로 외부 API 부하 최소화 (카메라 목록·URL은 자주 바뀌지 않음).
 */
@Service
public class CctvService {

    private static final Logger log = LoggerFactory.getLogger(CctvService.class);

    // SK올림픽핸드볼경기장(37.51735, 127.12640) 중심 약 ±5km 범위
    private static final double MIN_X = 127.069, MAX_X = 127.184;
    private static final double MIN_Y = 37.472, MAX_Y = 37.562;
    private static final double CENTER_LAT = 37.51735, CENTER_LNG = 127.12640;
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);
    private static final Duration FAIL_BACKOFF = Duration.ofSeconds(60);

    public record Cctv(String name, double lat, double lng, String streamUrl, int distanceM) {}

    private final RestClient http;
    private final String envApiKey;
    private final SettingService settings;

    private List<Cctv> cache = List.of();
    private Instant nextFetchAt = Instant.EPOCH;
    private volatile boolean lastFetchFailed = false;
    // 스트림 중계(proxy)가 접근을 허용할 호스트 — ITS가 내려준 CCTV 호스트만 (SSRF 방지)
    private volatile Set<String> allowedHosts = Set.of();

    public CctvService(@Value("${rally.its.api-key}") String apiKey, SettingService settings) {
        this.envApiKey = apiKey.strip();
        this.settings = settings;
        // ITS가 응답을 안 줄 때(지연·차단) 요청이 오래 매달리지 않도록 짧은 타임아웃
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(8000);
        this.http = RestClient.builder().requestFactory(factory).build();
    }

    /** 관리자 콘솔 등록 키 우선, 없으면 환경변수 기본값 */
    private String apiKey() { return settings.get("its.api-key", envApiKey).strip(); }

    /** 직전 ITS 조회가 실패했는지(네트워크·차단 등) — 컨트롤러가 안내 문구 구분에 사용 */
    public boolean lastFetchFailed() { return lastFetchFailed; }

    public boolean enabled() {
        return !apiKey().isBlank();
    }

    public synchronized List<Cctv> nearby() {
        if (!enabled()) return List.of();
        if (Instant.now().isBefore(nextFetchAt)) return cache;

        String apiKey = apiKey();
        List<Cctv> result = new ArrayList<>();
        // type=all: 국도·고속도로 등 전체 제공처, cctvType=1: 실시간 스트리밍(HLS)
        try {
            JsonNode root = http.get()
                    .uri("https://openapi.its.go.kr:9443/cctvInfo?apiKey={key}&type=all&cctvType=1"
                            + "&minX={minX}&maxX={maxX}&minY={minY}&maxY={maxY}&getType=json",
                            apiKey, MIN_X, MAX_X, MIN_Y, MAX_Y)
                    .retrieve()
                    .body(JsonNode.class);
            JsonNode data = root == null ? null : root.path("response").path("data");
            Set<String> hosts = new HashSet<>();
            if (data != null && data.isArray()) {
                for (JsonNode c : data) {
                    double lng = c.path("coordx").asDouble();
                    double lat = c.path("coordy").asDouble();
                    String url = c.path("cctvurl").asText("");
                    String name = c.path("cctvname").asText("CCTV");
                    // http/https HLS 스트림만 허용 (javascript:/data: 등 주입 차단).
                    // 실제 재생은 백엔드 프록시(/api/cctv/stream)가 https로 중계 — mixed content 회피.
                    String host = hostOf(url);
                    if (host == null) continue;
                    hosts.add(host);
                    result.add(new Cctv(name, lat, lng, url, distanceM(lat, lng)));
                }
                result.sort(Comparator.comparingInt(Cctv::distanceM));
            }
            cache = List.copyOf(result);
            allowedHosts = Set.copyOf(hosts);
            nextFetchAt = Instant.now().plus(CACHE_TTL);
            lastFetchFailed = false;
            log.info("CCTV {}대 조회 (경기장 주변)", result.size());
        } catch (Exception e) {
            log.warn("ITS CCTV 조회 실패: {}", e.getMessage());
            lastFetchFailed = true;
            // 실패 시 기존 캐시 유지하되 60초 뒤 재시도 (차단 풀리면 자동 복귀)
            nextFetchAt = Instant.now().plus(FAIL_BACKOFF);
        }
        return cache;
    }

    /** http/https URL의 호스트만 추출 (그 외 스킴은 null → 거부) */
    private static String hostOf(String url) {
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) return null;
        try {
            String host = URI.create(url).getHost();
            return (host == null || host.isBlank()) ? null : host.toLowerCase();
        } catch (Exception e) {
            return null;
        }
    }

    /** 스트림 프록시가 이 URL을 가져와도 되는지 — ITS가 내려준 호스트로 한정 (SSRF 방지) */
    public boolean mayProxy(String url) {
        // 캐시가 비어 있으면 채움 (서버 재시작 직후 등)
        if (allowedHosts.isEmpty()) nearby();
        String host = hostOf(url);
        return host != null && allowedHosts.contains(host);
    }

    /** 경기장 중심과의 대략적 거리(m) — 하버사인 근사 */
    private static int distanceM(double lat, double lng) {
        double dLat = Math.toRadians(lat - CENTER_LAT);
        double dLng = Math.toRadians(lng - CENTER_LNG);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(CENTER_LAT)) * Math.cos(Math.toRadians(lat))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return (int) (6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }
}
