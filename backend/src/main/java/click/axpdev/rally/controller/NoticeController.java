package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Notice;
import click.axpdev.rally.repository.NoticeRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeRepository notices;
    private final String adminKey;

    public NoticeController(NoticeRepository notices,
                            @Value("${rally.admin-key}") String adminKey) {
        this.notices = notices;
        this.adminKey = adminKey;
    }

    @GetMapping
    public List<Notice> list() {
        return notices.findAllByOrderByPinnedDescCreatedAtDesc();
    }

    public record NoticeRequest(@NotBlank String title, String body, boolean pinned) {}

    /** 주최 측 공지 등록 — X-Admin-Key 헤더 필요 */
    @PostMapping
    public ResponseEntity<Notice> create(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                         @Valid @RequestBody NoticeRequest req) {
        if (adminKey.isBlank() || !adminKey.equals(key)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Notice saved = notices.save(new Notice(req.title(), req.body(), req.pinned()));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** 공지 삭제 — X-Admin-Key 헤더 필요 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                       @PathVariable Long id) {
        if (adminKey.isBlank() || !adminKey.equals(key)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        notices.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
