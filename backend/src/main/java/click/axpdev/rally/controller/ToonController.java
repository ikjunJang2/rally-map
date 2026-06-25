package click.axpdev.rally.controller;

import click.axpdev.rally.domain.ToonEpisode;
import click.axpdev.rally.domain.ToonImage;
import click.axpdev.rally.domain.ToonSeries;
import click.axpdev.rally.repository.ToonEpisodeRepository;
import click.axpdev.rally.repository.ToonImageRepository;
import click.axpdev.rally.repository.ToonSeriesRepository;
import click.axpdev.rally.service.ToonStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.util.List;
import java.util.Map;

/** 웹툰 공개 조회 + 이미지 서빙 (공개된 작품·회차만 노출) */
@RestController
@RequestMapping("/api/toon")
public class ToonController {

    private final ToonSeriesRepository series;
    private final ToonEpisodeRepository episodes;
    private final ToonImageRepository images;
    private final ToonStorageService storage;

    public ToonController(ToonSeriesRepository series, ToonEpisodeRepository episodes,
                          ToonImageRepository images, ToonStorageService storage) {
        this.series = series;
        this.episodes = episodes;
        this.images = images;
        this.storage = storage;
    }

    public record SeriesCard(Long id, String title, String author, String summary, int episodes, Long coverImageId) {}
    public record EpisodeItem(Long id, int no, String title) {}
    public record SeriesDetail(Long id, String title, String author, String summary, List<EpisodeItem> episodes) {}

    @GetMapping("/series")
    public List<SeriesCard> list() {
        return series.findByPublishedTrueOrderByCreatedAtDesc().stream().map(s -> {
            List<ToonEpisode> eps = episodes.findBySeriesIdAndPublishedTrueOrderByNoAsc(s.getId());
            Long cover = null;
            if (!eps.isEmpty()) {
                List<ToonImage> imgs = images.findByEpisodeIdOrderByOrdAsc(eps.get(0).getId());
                if (!imgs.isEmpty()) cover = imgs.get(0).getId();
            }
            return new SeriesCard(s.getId(), s.getTitle(), s.getAuthor(), s.getSummary(), eps.size(), cover);
        }).toList();
    }

    @GetMapping("/series/{id}")
    public ResponseEntity<SeriesDetail> detail(@PathVariable Long id) {
        return series.findById(id).filter(ToonSeries::isPublished).map(s -> {
            List<EpisodeItem> eps = episodes.findBySeriesIdAndPublishedTrueOrderByNoAsc(id).stream()
                    .map(e -> new EpisodeItem(e.getId(), e.getNo(), e.getTitle())).toList();
            return ResponseEntity.ok(new SeriesDetail(s.getId(), s.getTitle(), s.getAuthor(), s.getSummary(), eps));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/episode/{id}")
    public ResponseEntity<Map<String, Object>> episode(@PathVariable Long id) {
        return episodes.findById(id).filter(ToonEpisode::isPublished).map(e -> {
            List<Long> imgIds = images.findByEpisodeIdOrderByOrdAsc(id).stream().map(ToonImage::getId).toList();
            return ResponseEntity.ok(Map.<String, Object>of(
                    "id", e.getId(), "no", e.getNo(), "title", e.getTitle(),
                    "seriesId", e.getSeriesId(), "images", imgIds));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** 이미지 바이트 서빙 — 불변(immutable)이라 Cloudflare가 길게 캐시 */
    @GetMapping("/img/{imageId}")
    public ResponseEntity<byte[]> image(@PathVariable Long imageId) {
        return images.findById(imageId).map(img -> {
            try {
                byte[] bytes = Files.readAllBytes(storage.resolve(img.getPath()));
                return ResponseEntity.ok()
                        .header("Content-Type", img.getContentType())
                        .header("Cache-Control", "public, max-age=2592000, immutable")
                        .body(bytes);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).<byte[]>build();
            }
        }).orElse(ResponseEntity.notFound().build());
    }
}
