package click.axpdev.rally.repository;

import click.axpdev.rally.domain.ShareItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShareItemRepository extends JpaRepository<ShareItem, Long> {
    List<ShareItem> findAllByOrderByPoiIdAscIdAsc();
    void deleteByPoiId(Long poiId);
}
