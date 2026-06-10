package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    // 공개 목록은 항상 삭제되지 않은 글만
    Page<Post> findByCategoryAndDeletedFalseOrderByCreatedAtDesc(Post.Category category, Pageable pageable);
    Page<Post> findByDeletedFalseOrderByCreatedAtDesc(Pageable pageable);
    boolean existsByTitleAndDeletedFalseAndCreatedAtAfter(String title, Instant after);

    /** 하트 1개 이상인 살아있는 글을 하트순 → 최신순으로 */
    @Query("""
            select p from Post p
            where p.deleted = false
              and (select count(l) from PostLike l where l.postId = p.id) > 0
            order by (select count(l) from PostLike l where l.postId = p.id) desc, p.createdAt desc
            """)
    List<Post> findPopular(Pageable pageable);

    /** 관리자 감사용 — 삭제 이력 */
    List<Post> findByDeletedTrueOrderByDeletedAtDesc();
}