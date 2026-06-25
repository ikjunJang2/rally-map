package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/** 웹툰 작품 — 회차(ToonEpisode)를 가짐. 검수 후 공개(published) */
@Entity
@Table(name = "toon_series")
public class ToonSeries {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String title;

    /** 작가 표시명 (2단계에서 작가 계정과 연결) */
    @Column(nullable = false, length = 40)
    private String author;

    @Size(max = 500)
    @Column(length = 500)
    private String summary;

    @Column(nullable = false)
    private boolean published = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ToonSeries() {}

    public ToonSeries(String title, String author, String summary) {
        this.title = title;
        this.author = author;
        this.summary = summary;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getSummary() { return summary; }
    public boolean isPublished() { return published; }
    public Instant getCreatedAt() { return createdAt; }

    public void setTitle(String t) { this.title = t; }
    public void setAuthor(String a) { this.author = a; }
    public void setSummary(String s) { this.summary = s; }
    public void setPublished(boolean p) { this.published = p; }
}
