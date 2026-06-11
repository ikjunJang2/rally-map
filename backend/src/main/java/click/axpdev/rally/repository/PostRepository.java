package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    // 공개 목록은 항상 삭제되지 않은 글만
    Page<Post> findByCategoryAndDeletedFalseOrderByCreatedAtDesc(Post.Category category, Pageable pageable);
    Page<Post> findByDeletedFalseOrderByCreatedAtDesc(Pageable pageable);
    boolean existsByTitleAndDeletedFalseAndCreatedAtAfter(String title, Instant after);
    // 좋아요·댓글은 살아있는(삭제 안 된) 글에만 — existsById는 소프트삭제 글도 true라 부적합
    boolean existsByIdAndDeletedFalse(Long id);

    /**
     * 하트 1개 이상인 살아있는 글을 하트순 → 최신순으로.
     * 임시조치(blockedUntil) 중인 글은 쿼리에서 제외 — 자바단에서 거르면 TOP N을 먼저 깎아
     * 결과가 N개 미만이 될 수 있어서다.
     */
    @Query("""
            select p from Post p
            where p.deleted = false
              and (p.blockedUntil is null or p.blockedUntil < :now)
              and (select count(l) from PostLike l where l.postId = p.id) > 0
            order by (select count(l) from PostLike l where l.postId = p.id) desc, p.createdAt desc
            """)
    List<Post> findPopular(@Param("now") Instant now, Pageable pageable);

    /** 관리자 감사용 — 삭제 이력 */
    List<Post> findByDeletedTrueOrderByDeletedAtDesc();

    /** 보존 기간 경과 — 파기 대상 */
    List<Post> findByDeletedTrueAndDeletedAtBefore(Instant cutoff);
}