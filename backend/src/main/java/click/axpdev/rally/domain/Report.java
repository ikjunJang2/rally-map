package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/** 게시물·댓글 신고 — 정보통신망법 44조의2·공직선거법 82조의4 대응 창구 */
@Entity
@Table(name = "post_report")
public class Report {

    public enum TargetType { POST, COMMENT }

    public enum Reason {
        DEFAMATION,  // 명예훼손·사생활 침해
        ABUSE,       // 욕설·혐오
        SPAM,        // 스팸·광고
        ELECTION,    // 선거법 위반 (허위사실·비방·여론조사 공표 등)
        PRIVACY,     // 개인정보 노출
        OTHER
    }

    public enum Status { PENDING, RESOLVED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TargetType targetType;

    @Column(nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Reason reason;

    @Column(length = 500)
    private String detail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @NotBlank
    @Column(nullable = false, updatable = false, length = 64)
    private String sidHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant resolvedAt;

    protected Report() {}

    public Report(TargetType targetType, Long targetId, Reason reason, String detail, String sidHash) {
        this.targetType = targetType;
        this.targetId = targetId;
        this.reason = reason;
        this.detail = detail;
        this.sidHash = sidHash;
    }

    public Long getId() { return id; }
    public TargetType getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public Reason getReason() { return reason; }
    public String getDetail() { return detail; }
    public Status getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getResolvedAt() { return resolvedAt; }

    public void resolve() {
        this.status = Status.RESOLVED;
        this.resolvedAt = Instant.now();
    }
}
