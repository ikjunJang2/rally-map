package click.axpdev.rally.repository;

import click.axpdev.rally.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByStatusOrderByCreatedAtAsc(Report.Status status);
    long countByStatus(Report.Status status);
    boolean existsByTargetTypeAndTargetIdAndSidHash(Report.TargetType targetType, Long targetId, String sidHash);
}
