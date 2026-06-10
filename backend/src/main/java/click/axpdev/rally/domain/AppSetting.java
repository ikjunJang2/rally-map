package click.axpdev.rally.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * 런타임 설정 키/값 — 관리자 콘솔에서 등록한 외부 연동 키 등을 보관.
 * 재배포 없이 즉시 적용하기 위해 환경변수 대신 DB에 둔다.
 * (KEY/VALUE는 SQL 예약어라 컬럼명을 setting_key/setting_value로 매핑)
 */
@Entity
@Table(name = "app_setting")
public class AppSetting {

    @Id
    @Column(name = "setting_key", length = 60)
    private String key;

    @Column(name = "setting_value", length = 500)
    private String value;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected AppSetting() {}

    public AppSetting(String key, String value) {
        this.key = key;
        this.value = value;
    }

    public String getKey() { return key; }
    public String getValue() { return value; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setValue(String value) {
        this.value = value;
        this.updatedAt = Instant.now();
    }
}
