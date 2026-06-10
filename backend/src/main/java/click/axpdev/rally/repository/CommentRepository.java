package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPostIdOrderByCreatedAtAsc(Long postId);
    boolean existsByPostIdAndBodyAndCreatedAtAfter(Long postId, String body, Instant after);
    void deleteByPostId(Long postId);
}
