package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String body;

    /** 고정 공지 — 목록 최상단에 표시 */
    @Column(nullable = false)
    private boolean pinned = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Notice() {}

    public Notice(String title, String body, boolean pinned) {
        this.title = title;
        this.body = body;
        this.pinned = pinned;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public boolean isPinned() { return pinned; }
    public Instant getCreatedAt() { return createdAt; }
}
