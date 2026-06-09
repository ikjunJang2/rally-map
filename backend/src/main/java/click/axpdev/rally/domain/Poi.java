package click.axpdev.rally.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
public class Poi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PoiType type;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    private String memo;

    /** false면 목록에서 제외 — 현장 사정으로 폐쇄된 시설 등 */
    @Column(nullable = false)
    private boolean active = true;

    protected Poi() {}

    public Poi(PoiType type, String name, double lat, double lng, String memo) {
        this.type = type;
        this.name = name;
        this.lat = lat;
        this.lng = lng;
        this.memo = memo;
    }

    public Long getId() { return id; }
    public PoiType getType() { return type; }
    public String getName() { return name; }
    public double getLat() { return lat; }
    public double getLng() { return lng; }
    public String getMemo() { return memo; }
    public boolean isActive() { return active; }

    public void setActive(boolean active) { this.active = active; }
    public void setMemo(String memo) { this.memo = memo; }
}
