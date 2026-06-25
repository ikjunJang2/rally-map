package click.axpdev.rally.repository;

import click.axpdev.rally.domain.ToonSeries;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ToonSeriesRepository extends JpaRepository<ToonSeries, Long> {
    List<ToonSeries> findByPublishedTrueOrderByCreatedAtDesc();
    List<ToonSeries> findAllByOrderByCreatedAtDesc();
}
