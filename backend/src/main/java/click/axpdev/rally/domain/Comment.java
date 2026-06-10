package click.axpdev.rally.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/** 커뮤니티 댓글 — 익명, 닉네임 + 삭제용 PIN (COMMENT는 H2 예약어라 테이블명 분리) */
@Entity
@Table(name = "post_comment")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long postId;

    @NotBlank
    @Column(nullable = false, length = 20)
    private String nickname;

    /** 삭제용 PIN의 SHA-256 해시 — 응답에 노출 금지 */
    @JsonIgnore
    @Column(nullable = false)
    private String pinHash;

    @NotBlank
    @Column(nullable = false, length = 300)
    private String body;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /* 소프트 삭제 — 화면에서만 숨기고 DB에는 이력으로 영구 보존 */
    @Column(nullable = false)
    private boolean deleted = false;

    private Instant deletedAt;

    @Enumerated(EnumType.STRING)
    private DeletedBy deletedBy;

    protected Comment() {}

    public Comment(Long postId, String nickname, String pinHash, String body) {
        this.postId = postId;
        this.nickname = nickname;
        this.pinHash = pinHash;
        this.body = body;
    }

    public Long getId() { return id; }
    public Long getPostId() { return postId; }
    public String getNickname() { return nickname; }
    public String getPinHash() { return pinHash; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isDeleted() { return deleted; }
    public Instant getDeletedAt() { return deletedAt; }
    public DeletedBy getDeletedBy() { return deletedBy; }

    public void markDeleted(DeletedBy by) {
        this.deleted = true;
        this.deletedAt = Instant.now();
        this.deletedBy = by;
    }
}
