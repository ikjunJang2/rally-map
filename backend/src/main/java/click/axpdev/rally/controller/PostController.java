package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Post;
import click.axpdev.rally.repository.PostRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private static final int PAGE_SIZE = 20;

    private final PostRepository posts;

    public PostController(PostRepository posts) {
        this.posts = posts;
    }

    @GetMapping
    public Page<Post> list(@RequestParam(required = false) Post.Category category,
                           @RequestParam(defaultValue = "0") int page) {
        PageRequest pr = PageRequest.of(Math.max(0, page), PAGE_SIZE);
        return category == null
                ? posts.findAllByOrderByCreatedAtDesc(pr)
                : posts.findByCategoryOrderByCreatedAtDesc(category, pr);
    }

    public record CreateRequest(
            @NotNull Post.Category category,
            @NotBlank @Size(max = 20) String nickname,
            @NotBlank @Size(min = 4, max = 20) String pin,
            @NotBlank @Size(max = 100) String title,
            @Size(max = 2000) String body) {}

    @PostMapping
    public ResponseEntity<Post> create(@Valid @RequestBody CreateRequest req) {
        Post saved = posts.save(new Post(
                req.category(), req.nickname().strip(), hash(req.pin()),
                req.title().strip(), req.body()));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    public record DeleteRequest(@NotBlank String pin) {}

    /** 작성자 본인 삭제 — 작성 시 입력한 PIN 필요 */
    @PostMapping("/{id}/delete")
    public ResponseEntity<Void> deleteByAuthor(@PathVariable Long id,
                                               @Valid @RequestBody DeleteRequest req) {
        return posts.findById(id)
                .map(p -> {
                    if (!MessageDigest.isEqual(
                            p.getPinHash().getBytes(StandardCharsets.UTF_8),
                            hash(req.pin()).getBytes(StandardCharsets.UTF_8))) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Void>build();
                    }
                    posts.delete(p);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    static String hash(String pin) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(("rally:" + pin).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
