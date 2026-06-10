package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

/** 나눔 품목 — 특정 나눔처(POI)에 속하며 재고 상태를 가짐 */
@Entity
@Table(name = "share_item")
public class ShareItem {

    /** 재고 상태 — 현장에서 정확한 개수 세기 어려우니 3단계로 */
    public enum Status { PLENTY, LOW, OUT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 나눔처 POI id */
    @Column(nullable = false)
    private Long poiId;

    @NotBlank
    @Column(nullable = false, length = 40)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PLENTY;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected ShareItem() {}

    public ShareItem(Long poiId, String name) {
        this.poiId = poiId;
        this.name = name;
    }

    public Long getId() { return id; }
    public Long getPoiId() { return poiId; }
    public String getName() { return name; }
    public Status getStatus() { return status; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setStatus(Status status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }
}
