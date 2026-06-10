package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/** "개발자에게 바란다" 시민 피드백 — 익명, 회신용 연락처는 선택 */
@Entity
@Table(name = "feedback")
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 2000)
    private String message;

    /** 회신 받을 연락처(이메일 등) — 선택 */
    @Column(length = 120)
    private String contact;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Feedback() {}

    public Feedback(String message, String contact) {
        this.message = message;
        this.contact = contact;
    }

    public Long getId() { return id; }
    public String getMessage() { return message; }
    public String getContact() { return contact; }
    public Instant getCreatedAt() { return createdAt; }
}
