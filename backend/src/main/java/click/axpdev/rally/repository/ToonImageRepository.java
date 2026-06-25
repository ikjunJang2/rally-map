package click.axpdev.rally.repository;

import click.axpdev.rally.domain.ToonImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ToonImageRepository extends JpaRepository<ToonImage, Long> {
    List<ToonImage> findByEpisodeIdOrderByOrdAsc(Long episodeId);
    void deleteByEpisodeId(Long episodeId);
}
