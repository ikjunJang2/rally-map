package click.axpdev.rally.controller.admin;

import click.axpdev.rally.domain.ToonEpisode;
import click.axpdev.rally.domain.ToonImage;
import click.axpdev.rally.domain.ToonSeries;
import click.axpdev.rally.repository.ToonEpisodeRepository;
import click.axpdev.rally.repository.ToonImageRepository;
import click.axpdev.rally.repository.ToonSeriesRepository;
import click.axpdev.rally.service.ToonStorageService;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/** 웹툰 관리 — /api/admin/** 라 AdminInterceptor가 토큰 검증. 1단계는 관리자가 업로드·검수 */
@RestController
@RequestMapping("/api/admin/toon")
public class AdminToonController {

    private final ToonSeriesRepository series;
    private final ToonEpisodeRepository episodes;
    private final ToonImageRepository images;
    private final ToonStorageService storage;

    public AdminToonController(ToonSeriesRepository series, ToonEpisodeRepository episodes,
                              ToonImageRepository images, ToonStorageService storage) {
        this.series = series;
        this.episodes = episodes;
        this.images = images;
        this.storage = storage;
    }

    // ── 작품 ──────────────────────────────────────────────
    @GetMapping("/series")
    public List<Map<String, Object>> allSeries() {
        return series.findAllByOrderByCreatedAtDesc().stream().map(s -> Map.<String, Object>of(
                "id", s.getId(), "title", s.getTitle(), "author", s.getAuthor(),
                "summary", s.getSummary() == null ? "" : s.getSummary(),
                "published", s.isPublished(), "episodes", episodes.countBySeriesId(s.getId()))).toList();
    }

    public record SeriesReq(@NotBlank @Size(max = 100) String title,
                            @NotBlank @Size(max = 40) String author, @Size(max = 500) String summary) {}

    @PostMapping("/series")
    public ResponseEntity<ToonSeries> createSeries(@Valid @RequestBody SeriesReq req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                series.save(new ToonSeries(req.title().strip(), req.author().strip(),
                        req.summary() == null ? null : req.summary().strip())));
    }

    public record SeriesPatch(String title, String author, String summary, Boolean published) {}

    @PatchMapping("/series/{id}")
    public ResponseEntity<ToonSeries> updateSeries(@PathVariable Long id, @RequestBody SeriesPatch req) {
        return series.findById(id).map(s -> {
            if (req.title() != null && !req.title().isBlank()) s.setTitle(req.title().strip());
            if (req.author() != null && !req.author().isBlank()) s.setAuthor(req.author().strip());
            if (req.summary() != null) s.setSummary(req.summary().strip());
            if (req.published() != null) s.setPublished(req.published());
            return ResponseEntity.ok(series.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/series/{id}")
    @Transactional
    public ResponseEntity<Void> deleteSeries(@PathVariable Long id) {
        for (ToonEpisode e : episodes.findBySeriesIdOrderByNoAsc(id)) {
            images.deleteByEpisodeId(e.getId());
            storage.deleteEpisodeDir(e.getId());
            episodes.delete(e);
        }
        series.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── 회차 ──────────────────────────────────────────────
    /** 회차 + 이미지 여러 장 업로드 (multipart). 검수 전이라 published=false */
    @PostMapping("/series/{seriesId}/episode")
    @Transactional
    public ResponseEntity<?> uploadEpisode(@PathVariable Long seriesId,
                                           @RequestParam("title") String title,
                                           @RequestParam("files") MultipartFile[] files) {
        if (!series.existsById(seriesId)) return ResponseEntity.badRequest().body(Map.of("error", "작품이 없어요"));
        if (files == null || files.length == 0) return ResponseEntity.badRequest().body(Map.of("error", "이미지를 한 장 이상 올려주세요"));
        int no = episodes.countBySeriesId(seriesId) + 1;
        String t = (title == null || title.isBlank()) ? (no + "화") : title.strip();
        ToonEpisode ep = episodes.save(new ToonEpisode(seriesId, no, t));
        int ord = 0;
        try {
            for (MultipartFile f : files) {
                if (f.isEmpty()) continue;
                ToonStorageService.Saved saved = storage.save(f, ep.getId());
                images.save(new ToonImage(ep.getId(), ord++, saved.path(), saved.contentType()));
            }
            if (ord == 0) throw new IllegalArgumentException("유효한 이미지가 없어요");
        } catch (Exception e) {
            images.deleteByEpisodeId(ep.getId());
            storage.deleteEpisodeDir(ep.getId());
            episodes.delete(ep);
            return ResponseEntity.badRequest().body(Map.of("error", "업로드 실패: " + e.getMessage()));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", ep.getId(), "no", ep.getNo(), "count", ord));
    }

    @GetMapping("/series/{seriesId}/episodes")
    public List<Map<String, Object>> episodesOf(@PathVariable Long seriesId) {
        return episodes.findBySeriesIdOrderByNoAsc(seriesId).stream().map(e -> Map.<String, Object>of(
                "id", e.getId(), "no", e.getNo(), "title", e.getTitle(), "published", e.isPublished(),
                "images", images.findByEpisodeIdOrderByOrdAsc(e.getId()).stream().map(ToonImage::getId).toList())).toList();
    }

    public record EpisodePatch(String title, Boolean published) {}

    @PatchMapping("/episode/{id}")
    public ResponseEntity<ToonEpisode> updateEpisode(@PathVariable Long id, @RequestBody EpisodePatch req) {
        return episodes.findById(id).map(e -> {
            if (req.title() != null && !req.title().isBlank()) e.setTitle(req.title().strip());
            if (req.published() != null) e.setPublished(req.published());
            return ResponseEntity.ok(episodes.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/episode/{id}")
    @Transactional
    public ResponseEntity<Void> deleteEpisode(@PathVariable Long id) {
        images.deleteByEpisodeId(id);
        storage.deleteEpisodeDir(id);
        episodes.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
