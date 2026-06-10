package click.axpdev.rally.repository;

import click.axpdev.rally.domain.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    Optional<PostLike> findByPostIdAndSidHash(Long postId, String sidHash);
    long countByPostId(Long postId);
    void deleteByPostId(Long postId);
}
