package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByCategoryOrderByCreatedAtDesc(Post.Category category, Pageable pageable);
    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);
    boolean existsByTitleAndCreatedAtAfter(String title, Instant after);

    /** 하트 1개 이상인 글을 하트순 → 최신순으로 */
    @Query("""
            select p from Post p
            where (select count(l) from PostLike l where l.postId = p.id) > 0
            order by (select count(l) from PostLike l where l.postId = p.id) desc, p.createdAt desc
            """)
    List<Post> findPopular(Pageable pageable);
}
