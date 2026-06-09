package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Poi;
import click.axpdev.rally.domain.PoiType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PoiRepository extends JpaRepository<Poi, Long> {
    List<Poi> findByActiveTrue();
    List<Poi> findByTypeAndActiveTrue(PoiType type);
}
