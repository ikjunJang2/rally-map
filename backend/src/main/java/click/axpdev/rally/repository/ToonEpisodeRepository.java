package click.axpdev.rally.repository;

import click.axpdev.rally.domain.ToonEpisode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ToonEpisodeRepository extends JpaRepository<ToonEpisode, Long> {
    List<ToonEpisode> findBySeriesIdAndPublishedTrueOrderByNoAsc(Long seriesId);
    List<ToonEpisode> findBySeriesIdOrderByNoAsc(Long seriesId);
    int countBySeriesId(Long seriesId);
}
