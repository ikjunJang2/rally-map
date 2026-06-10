package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Stream;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StreamRepository extends JpaRepository<Stream, Long> {
    List<Stream> findAllByOrderByLiveDescCreatedAtDesc();
    Optional<Stream> findByVideoId(String videoId);
    List<Stream> findBySource(Stream.Source source);
    List<Stream> findBySourceAndLiveTrue(Stream.Source source);
    List<Stream> findBySourceAndLiveFalse(Stream.Source source);
}
