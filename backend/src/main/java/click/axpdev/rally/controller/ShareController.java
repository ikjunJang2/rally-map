package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Poi;
import click.axpdev.rally.domain.PoiType;
import click.axpdev.rally.domain.ShareItem;
import click.axpdev.rally.repository.PoiRepository;
import click.axpdev.rally.repository.ShareItemRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.*;

/** 나눔 현황 공개 조회 — 나눔처(POI)별 품목·상태 */
@RestController
@RequestMapping("/api/share")
public class ShareController {

    private final ShareItemRepository items;
    private final PoiRepository pois;

    public ShareController(ShareItemRepository items, PoiRepository pois) {
        this.items = items;
        this.pois = pois;
    }

    public record ItemView(Long id, String name, ShareItem.Status status,
                           ShareItem.Category category, String quantity, Instant updatedAt) {}
    public record ShareLocation(Long poiId, String name, double lat, double lng,
                                PoiType type, List<ItemView> items) {}

    @GetMapping
    public List<ShareLocation> list() {
        // poiId -> 품목들
        Map<Long, List<ItemView>> byPoi = new LinkedHashMap<>();
        for (ShareItem it : items.findAllByOrderByPoiIdAscIdAsc()) {
            byPoi.computeIfAbsent(it.getPoiId(), k -> new ArrayList<>())
                 .add(new ItemView(it.getId(), it.getName(), it.getStatus(),
                         it.getCategory(), it.getQuantity(), it.getUpdatedAt()));
        }
        // 활성 POI 정보와 결합 (삭제·숨김 POI는 제외)
        List<ShareLocation> result = new ArrayList<>();
        for (var entry : byPoi.entrySet()) {
            pois.findById(entry.getKey())
                .filter(Poi::isActive)
                .ifPresent(p -> result.add(new ShareLocation(
                        p.getId(), p.getName(), p.getLat(), p.getLng(), p.getType(), entry.getValue())));
        }
        return result;
    }
}
