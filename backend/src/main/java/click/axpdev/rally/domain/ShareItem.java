package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.ColumnDefault;
import java.time.Instant;

/** 나눔 품목 — 특정 나눔처(POI)에 속하며 분류·수량·재고 상태를 가짐 */
@Entity
@Table(name = "share_item")
public class ShareItem {

    /** 재고 상태 — 현장에서 정확한 개수 세기 어려우니 3단계로 */
    public enum Status { PLENTY, LOW, OUT }

    /** 품목 분류 — 현장에서 종류별로 빠르게 찾게 */
    public enum Category { WATER, FOOD, WARM, MEDICAL, RAIN, ETC }

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

    /** 분류 — 기존 데이터는 ColumnDefault로 ETC 채움(ddl-auto=update 안전) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'ETC'")
    private Category category = Category.ETC;

    /** 대략 수량·단위 — 자유 입력(예: "50병", "한 박스"). 선택 */
    @Column(length = 20)
    private String quantity;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected ShareItem() {}

    public ShareItem(Long poiId, String name, Category category, String quantity) {
        this.poiId = poiId;
        this.name = name;
        if (category != null) this.category = category;
        this.quantity = quantity;
    }

    public Long getId() { return id; }
    public Long getPoiId() { return poiId; }
    public String getName() { return name; }
    public Status getStatus() { return status; }
    public Category getCategory() { return category; }
    public String getQuantity() { return quantity; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setStatus(Status status) { this.status = status; this.updatedAt = Instant.now(); }
    public void setQuantity(String quantity) { this.quantity = quantity; this.updatedAt = Instant.now(); }
    public void setCategory(Category category) { if (category != null) { this.category = category; this.updatedAt = Instant.now(); } }
}
