package click.axpdev.rally.domain;

import jakarta.persistence.*;
import java.time.Instant;

/** 웹툰 회차 — 한 작품에 속하며 이미지(ToonImage) 여러 장을 순서대로 가짐 */
@Entity
@Table(name = "toon_episode")
public class ToonEpisode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long seriesId;

    /** 회차 번호 (1, 2, …) */
    @Column(nullable = false)
    private int no;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false)
    private boolean published = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ToonEpisode() {}

    public ToonEpisode(Long seriesId, int no, String title) {
        this.seriesId = seriesId;
        this.no = no;
        this.title = title;
    }

    public Long getId() { return id; }
    public Long getSeriesId() { return seriesId; }
    public int getNo() { return no; }
    public String getTitle() { return title; }
    public boolean isPublished() { return published; }
    public Instant getCreatedAt() { return createdAt; }

    public void setTitle(String t) { this.title = t; }
    public void setPublished(boolean p) { this.published = p; }
}
