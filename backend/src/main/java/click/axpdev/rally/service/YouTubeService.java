package click.axpdev.rally.service;

import click.axpdev.rally.domain.Stream;
import click.axpdev.rally.repository.StreamRepository;
import tools.jackson.databind.JsonNode;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 유튜브 라이브 자동 수집.
 *
 * 쿼터 설계 (일일 무료 10,000 유닛):
 *  - search.list = 호출당 100유닛 → 15분 간격 × 쿼리 수만큼 (기본 3쿼리: 하루 약 8,640유닛)
 *  - videos.list = 호출당 1유닛 → 1분 간격 라이브 상태 확인 (하루 약 1,440유닛)
 * 검색 간격을 1분으로 줄이면 쿼터가 하루를 못 버티므로 반드시 분리 운영한다.
 * 프론트엔드는 1분마다 /api/streams를 갱신하므로 사용자는 1분 단위 최신 상태를 본다.
 */
@Service
public class YouTubeService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeService.class);
    private static final String API = "https://www.googleapis.com/youtube/v3";

    private final StreamRepository streams;
    private final RestClient http = RestClient.create();
    private final String apiKey;
    private final List<String> queries;
    private final List<String> excludedChannels;
    private boolean warnedDisabled = false;

    public YouTubeService(StreamRepository streams,
                          @Value("${rally.youtube.api-key}") String apiKey,
                          @Value("${rally.youtube.queries}") String queries,
                          @Value("${rally.youtube.excluded-channels:}") String excludedChannels) {
        this.streams = streams;
        this.apiKey = apiKey.strip();
        this.queries = Arrays.stream(queries.split(","))
                .map(String::strip).filter(q -> !q.isEmpty()).toList();
        this.excludedChannels = Arrays.stream(excludedChannels.split(","))
                .map(String::strip).filter(c -> !c.isEmpty())
                .map(String::toUpperCase).toList();
    }

    /** 채널 차단 목록 — 채널명 부분일치(대소문자 무시) */
    private boolean isExcluded(String channel) {
        if (channel == null) return false;
        String upper = channel.toUpperCase();
        return excludedChannels.stream().anyMatch(upper::contains);
    }

    public boolean enabled() {
        return !apiKey.isBlank();
    }

    private boolean skipIfDisabled() {
        if (enabled()) return false;
        if (!warnedDisabled) {
            log.info("YOUTUBE_API_KEY 미설정 — 유튜브 자동 수집 비활성 (수동 등록·검색 링크만 동작)");
            warnedDisabled = true;
        }
        return true;
    }

    /** 라이브 방송 검색 — 기본 15분 간격 (search.list, 100유닛/호출) */
    @Scheduled(fixedDelayString = "${rally.youtube.search-interval-ms:900000}", initialDelay = 10_000)
    @Transactional
    public void searchLiveBroadcasts() {
        if (skipIfDisabled()) return;

        // 차단 목록이 바뀌었을 수 있으니 기존 수집분도 매 주기 정리
        if (!excludedChannels.isEmpty()) {
            for (Stream s : streams.findBySource(Stream.Source.YOUTUBE)) {
                if (isExcluded(s.getChannel())) {
                    streams.delete(s);
                    log.info("차단 채널 수집분 제거: {} ({})", s.getTitle(), s.getChannel());
                }
            }
        }

        for (String q : queries) {
            try {
                JsonNode root = http.get()
                        .uri(API + "/search?part=snippet&eventType=live&type=video&maxResults=10"
                                + "&relevanceLanguage=ko&regionCode=KR&q={q}&key={key}", q, apiKey)
                        .retrieve()
                        .body(JsonNode.class);
                if (root == null) continue;
                for (JsonNode item : root.path("items")) {
                    String videoId = item.path("id").path("videoId").asText("");
                    if (videoId.isEmpty()) continue;
                    JsonNode sn = item.path("snippet");
                    String title = sn.path("title").asText("(제목 없음)");
                    String channel = sn.path("channelTitle").asText(null);
                    if (isExcluded(channel)) continue;
                    String thumb = sn.path("thumbnails").path("medium").path("url").asText(null);
                    streams.findByVideoId(videoId).ifPresentOrElse(
                            s -> s.refreshFromYouTube(title, channel, thumb),
                            () -> streams.save(Stream.fromYouTube(videoId, title, channel, thumb)));
                }
            } catch (Exception e) {
                log.warn("유튜브 검색 실패 (q='{}'): {}", q, e.getMessage());
            }
        }
    }

    /** 수집된 방송의 라이브 여부 확인 — 기본 1분 간격 (videos.list, 1유닛/호출) */
    @Scheduled(fixedDelayString = "${rally.youtube.status-interval-ms:60000}", initialDelay = 30_000)
    @Transactional
    public void refreshLiveStatus() {
        if (skipIfDisabled()) return;
        List<Stream> liveOnes = streams.findBySourceAndLiveTrue(Stream.Source.YOUTUBE);
        if (liveOnes.isEmpty()) return;

        String ids = liveOnes.stream().map(Stream::getVideoId).collect(Collectors.joining(","));
        try {
            JsonNode root = http.get()
                    .uri(API + "/videos?part=snippet&id={ids}&key={key}", ids, apiKey)
                    .retrieve()
                    .body(JsonNode.class);
            if (root == null) return;

            Set<String> stillLive = new HashSet<>();
            for (JsonNode item : root.path("items")) {
                if ("live".equals(item.path("snippet").path("liveBroadcastContent").asText())) {
                    stillLive.add(item.path("id").asText());
                }
            }
            for (Stream s : liveOnes) {
                if (!stillLive.contains(s.getVideoId())) {
                    s.setLive(false);
                    log.info("라이브 종료 표시: {}", s.getTitle());
                }
            }
        } catch (Exception e) {
            log.warn("유튜브 상태 확인 실패: {}", e.getMessage());
        }
    }
}
