package click.axpdev.rally.service;

import click.axpdev.rally.domain.Comment;
import click.axpdev.rally.domain.Post;
import click.axpdev.rally.domain.Stream;
import click.axpdev.rally.repository.*;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * 데이터 보존 기간 관리 배치.
 *
 * - 삭제된 글·댓글 이력: 분쟁·신고 대응 목적으로 보존 후 기간 경과 시 완전 파기
 *   (개인정보보호법 21조 — 보존 목적·기간은 개인정보처리방침에 고지)
 * - 종료된 유튜브 방송 메타데이터: 48시간 후 삭제
 *   (YouTube API Developer Policies III.E.4 — 30일 저장 제한 준수)
 */
@Service
public class RetentionService {

    private static final Logger log = LoggerFactory.getLogger(RetentionService.class);
    // 종료된 방송은 바로 치우되, 일시 끊김을 종료로 오판한 경우를 거르는 10분 유예
    private static final Duration ENDED_STREAM_TTL = Duration.ofMinutes(10);

    private final PostRepository posts;
    private final CommentRepository comments;
    private final PostLikeRepository likes;
    private final StreamRepository streams;
    private final int retentionDays;

    public RetentionService(PostRepository posts, CommentRepository comments,
                            PostLikeRepository likes, StreamRepository streams,
                            @Value("${rally.community.retention-days:180}") int retentionDays) {
        this.posts = posts;
        this.comments = comments;
        this.likes = likes;
        this.streams = streams;
        this.retentionDays = retentionDays;
    }

    public int retentionDays() {
        return retentionDays;
    }

    /** 매시간 — 보존 기간 지난 삭제 이력 완전 파기 */
    @Scheduled(fixedDelayString = "3600000", initialDelay = 60_000)
    @Transactional
    public void purgeExpiredDeletions() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(retentionDays));

        List<Post> expiredPosts = posts.findByDeletedTrueAndDeletedAtBefore(cutoff);
        for (Post p : expiredPosts) {
            comments.deleteByPostId(p.getId());
            likes.deleteByPostId(p.getId());
            posts.delete(p);
        }
        List<Comment> expiredComments = comments.findByDeletedTrueAndDeletedAtBefore(cutoff);
        comments.deleteAll(expiredComments);

        if (!expiredPosts.isEmpty() || !expiredComments.isEmpty()) {
            log.info("보존 기간({}) 경과 파기: 글 {}건, 댓글 {}건",
                    retentionDays + "일", expiredPosts.size(), expiredComments.size());
        }
    }

    /** 5분마다 — 종료된 유튜브 방송 정리 (목록 정돈 + API 저장 제한 준수) */
    @Scheduled(fixedDelayString = "300000", initialDelay = 120_000)
    @Transactional
    public void purgeEndedStreams() {
        Instant cutoff = Instant.now().minus(ENDED_STREAM_TTL);
        List<Stream> ended = streams.findBySourceAndLiveFalse(Stream.Source.YOUTUBE).stream()
                .filter(s -> {
                    Instant ref = s.getEndedAt() != null ? s.getEndedAt() : s.getCreatedAt();
                    return ref.isBefore(cutoff);
                })
                .toList();
        if (!ended.isEmpty()) {
            streams.deleteAll(ended);
            log.info("종료 10분 경과 유튜브 방송 {}건 삭제", ended.size());
        }
    }
}
