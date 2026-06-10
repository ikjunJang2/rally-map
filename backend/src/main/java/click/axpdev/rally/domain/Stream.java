package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/** 현장 라이브 영상 (유튜브 등) — 주최 측이 관리 키로 등록 */
@Entity
public class Stream {

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

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getUrl() { return url; }
    public String getChannel() { return channel; }
    public boolean isLive() { return live; }
    public Instant getCreatedAt() { return createdAt; }

    public void setLive(boolean live) { this.live = live; }
}
