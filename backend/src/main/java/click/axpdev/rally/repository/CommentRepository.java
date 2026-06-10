package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    // 공개 목록은 항상 삭제되지 않은 댓글만
    List<Comment> findByPostIdAndDeletedFalseOrderByCreatedAtAsc(Long postId);
    boolean existsByPostIdAndBodyAndDeletedFalseAndCreatedAtAfter(Long postId, String body, Instant after);
}