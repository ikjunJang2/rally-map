package click.axpdev.rally.repository;

import click.axpdev.rally.domain.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {}
