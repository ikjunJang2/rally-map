package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Stream;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StreamRepository extends JpaRepository<Stream, Long> {
    List<Stream> findAllByOrderByLiveDescCreatedAtDesc();
}
