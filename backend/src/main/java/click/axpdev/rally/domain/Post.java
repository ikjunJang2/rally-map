package click.axpdev.rally.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.Formula;
import java.time.Instant;

/** 커뮤니티 글 — 익명, 닉네임 + 삭제용 PIN */
@Entity
public class Post {

    public enum Category {
        FREE,     // 자유
        INFO,     // 정보공유
        SHARE,    // 물품나눔
        QUESTION, // 질문
        CHEER     // 응원
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @NotBlank
    @Column(nullable = false, length = 20)
    private String nickname;

    /** 글 삭제용 PIN의 SHA-256 해시 — 응답에 노출 금지 */
    @JsonIgnore
    @Column(nullable = false)
    private String pinHash;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 2000)
    private String body;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /** 하트 수 — post_like 집계 (읽기 전용) */
    @Formula("(select count(*) from post_like pl where pl.post_id = id)")
    private long hearts;

    /** 댓글 수 — 삭제되지 않은 댓글만 집계 (읽기 전용) */
    @Formula("(select count(*) from post_comment pc where pc.post_id = id and pc.deleted = false)")
    private long comments;

    /* 소프트 삭제 — 화면에서만 숨기고 DB에는 이력으로 영구 보존 */
    @Column(nullable = false)
    private boolean deleted = false;

    private Instant deletedAt;

    @Enumerated(EnumType.STRING)
    private DeletedBy deletedBy;

    protected Post() {}

    public Post(Category category, String nickname, String pinHash, String title, String body) {
        this.category = category;
        this.nickname = nickname;
        this.pinHash = pinHash;
        this.title = title;
        this.body = body;
    }

    public Long getId() { return id; }
    public Category getCategory() { return category; }
    public String getNickname() { return nickname; }
    public String getPinHash() { return pinHash; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
    public long getHearts() { return hearts; }
    public long getComments() { return comments; }
    public boolean isDeleted() { return deleted; }
    public Instant getDeletedAt() { return deletedAt; }
    public DeletedBy getDeletedBy() { return deletedBy; }

    public void markDeleted(DeletedBy by) {
        this.deleted = true;
        this.deletedAt = Instant.now();
        this.deletedBy = by;
    }
}
