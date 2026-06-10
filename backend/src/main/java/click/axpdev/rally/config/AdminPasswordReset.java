package click.axpdev.rally.config;

import click.axpdev.rally.service.SettingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * 관리자 비밀번호 잠금 복구.
 * ADMIN_RESET_PASSWORD=true 로 기동하면 부팅 시 DB의 관리자 비번(admin.pw)을 비워
 * 환경변수(RALLY_ADMIN_PASS) 기본값으로 되돌린다.
 *
 * 보안: 원격 엔드포인트가 아니라 서버에 접근해 환경변수를 켜고 재기동할 수 있어야만 동작한다.
 * 초기화 후에는 플래그를 꺼야 매 재기동마다 초기화되지 않는다 (deploy/reset-admin-pw.sh가 자동 처리).
 */
@Component
public class AdminPasswordReset implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminPasswordReset.class);

    private final boolean reset;
    private final SettingService settings;

    public AdminPasswordReset(@Value("${rally.admin.reset-on-start:false}") boolean reset,
                              SettingService settings) {
        this.reset = reset;
        this.settings = settings;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!reset) return;
        settings.set("admin.pw", "");
        log.warn("⚠ ADMIN_RESET_PASSWORD=true — 관리자 비밀번호를 환경변수(RALLY_ADMIN_PASS) 기본값으로 초기화했습니다. "
                + "복구 후 ADMIN_RESET_PASSWORD 플래그를 꺼주세요.");
    }
}
