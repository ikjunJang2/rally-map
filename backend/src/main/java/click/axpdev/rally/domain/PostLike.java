package click.axpdev.rally.domain;

import jakarta.persistence.*;

/** 글 하트 — 세션ID 해시로 기기당 1회 (원본 세션ID는 저장하지 않음) */
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"postId", "sidHash"}))
public class PostLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long postId;

    @Column(nullable = false, length = 64)
    private String sidHash;

    protected PostLike() {}

    public PostLike(Long postId, String sidHash) {
        this.postId = postId;
        this.sidHash = sidHash;
    }

    public Long getId() { return id; }
    public Long getPostId() { return postId; }
    public String getSidHash() { return sidHash; }
}
