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
}
