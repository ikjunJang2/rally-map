package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/** 현장 라이브 영상 — 운영진 수동 등록(MANUAL) 또는 유튜브 자동 수집(YOUTUBE) */
@Entity
public class Stream {

    public enum Source { MANUAL, YOUTUBE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @NotBlank
    @Column(nullable = false, length = 500)
    private String url;

    /** 채널·출처 이름 (선택) */
    private String channel;

    /** 유튜브 영상 ID — 자동 수집 중복 방지 키 */
    @Column(unique = true)
    private String videoId;

    /** 유튜브 채널 ID — 아바타 조회용 */
    private String channelId;

    /** 썸네일 이미지 URL */
    @Column(length = 500)
    private String thumbnail;

    /** 채널 아바타 이미지 URL */
    @Column(length = 500)
    private String channelThumbnail;

    /** 실시간 동시 시청자수 — 1분마다 갱신, 미제공 시 null */
    private Long viewers;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source = Source.MANUAL;

    /** false면 종료된 방송 — 목록 하단에 표시 */
    @Column(nullable = false)
    private boolean live = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Stream() {}

    public Stream(String title, String url, String channel, boolean live) {
        this.title = title;
        this.url = url;
        this.channel = channel;
        this.live = live;
    }

    /** 유튜브 자동 수집용 */
    public static Stream fromYouTube(String videoId, String title, String channel,
                                     String thumbnail, String channelId) {
        Stream s = new Stream(title, "https://www.youtube.com/watch?v=" + videoId, channel, true);
        s.videoId = videoId;
        s.thumbnail = thumbnail;
        s.channelId = channelId;
        s.source = Source.YOUTUBE;
        return s;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getUrl() { return url; }
    public String getChannel() { return channel; }
    public String getVideoId() { return videoId; }
    public String getChannelId() { return channelId; }
    public String getThumbnail() { return thumbnail; }
    public String getChannelThumbnail() { return channelThumbnail; }
    public Long getViewers() { return viewers; }
    public Source getSource() { return source; }
    public boolean isLive() { return live; }
    public Instant getCreatedAt() { return createdAt; }

    public void setLive(boolean live) { this.live = live; }
    public void setChannelThumbnail(String channelThumbnail) { this.channelThumbnail = channelThumbnail; }
    public void setViewers(Long viewers) { this.viewers = viewers; }

    /** 자동 수집 갱신 — 제목·채널·썸네일 최신화 후 라이브 표시 */
    public void refreshFromYouTube(String title, String channel, String thumbnail) {
        this.title = title;
        this.channel = channel;
        this.thumbnail = thumbnail;
        this.live = true;
    }
}
