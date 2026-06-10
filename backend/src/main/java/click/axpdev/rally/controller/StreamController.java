package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Stream;
import click.axpdev.rally.repository.StreamRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/streams")
public class StreamController {

    private final StreamRepository streams;
    private final String adminKey;

    public StreamController(StreamRepository streams,
                            @Value("${rally.admin-key}") String adminKey) {
        this.streams = streams;
        this.adminKey = adminKey;
    }

    @GetMapping
    public List<Stream> list() {
        return streams.findAllByOrderByLiveDescCreatedAtDesc();
    }

    public record StreamRequest(
            @NotBlank String title,
            @NotBlank @Pattern(regexp = "https://.*", message = "https URL만 허용") String url,
            String channel,
            Boolean live) {}

    /** 라이브 등록 — X-Admin-Key 헤더 필요 */
    @PostMapping
    public ResponseEntity<Stream> create(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                         @Valid @RequestBody StreamRequest req) {
        if (adminKey.isBlank() || !adminKey.equals(key)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Stream saved = streams.save(new Stream(req.title(), req.url(), req.channel(),
                req.live() == null || req.live()));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** 방송 종료 표시 — X-Admin-Key 헤더 필요 */
    @PatchMapping("/{id}/ended")
    public ResponseEntity<Stream> markEnded(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                            @PathVariable Long id) {
        if (adminKey.isBlank() || !adminKey.equals(key)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return streams.findById(id)
                .map(s -> { s.setLive(false); return ResponseEntity.ok(streams.save(s)); })
                .orElse(ResponseEntity.notFound().build());
    }

    /** 삭제 — X-Admin-Key 헤더 필요 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                       @PathVariable Long id) {
        if (adminKey.isBlank() || !adminKey.equals(key)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        streams.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
