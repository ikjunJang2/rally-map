package click.axpdev.rally.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

/**
 * 웹툰 이미지 파일 저장/조회 — Docker 볼륨(/app/data/toon)에 저장.
 * Cloudflare가 정적 이미지를 캐시하므로 t3.small로도 서빙 가능.
 */
@Service
public class ToonStorageService {

    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private final Path baseDir;

    public ToonStorageService(@Value("${rally.toon.dir:data/toon}") String dir) {
        this.baseDir = Paths.get(dir).toAbsolutePath().normalize();
    }

    /** 업로드 이미지를 저장하고 볼륨 기준 상대경로(toon-id 식별용)를 반환 */
    public Saved save(MultipartFile file, Long episodeId) throws IOException {
        String ct = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!ALLOWED.contains(ct)) {
            throw new IllegalArgumentException("이미지(jpg·png·webp·gif)만 올릴 수 있어요");
        }
        String ext = switch (ct) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            default -> "jpg";
        };
        Path epDir = baseDir.resolve(String.valueOf(episodeId)).normalize();
        if (!epDir.startsWith(baseDir)) throw new IllegalArgumentException("잘못된 경로");
        Files.createDirectories(epDir);
        String name = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        Path target = epDir.resolve(name);
        file.transferTo(target);
        // 볼륨 baseDir 기준 상대 경로로 저장 (서빙 시 다시 baseDir에 붙임)
        String rel = baseDir.relativize(target).toString().replace('\\', '/');
        return new Saved(rel, ct);
    }

    /** 저장된 상대경로를 실제 파일 Path로 해석 (디렉터리 탈출 방지) */
    public Path resolve(String relPath) {
        Path p = baseDir.resolve(relPath).normalize();
        if (!p.startsWith(baseDir)) throw new IllegalArgumentException("잘못된 경로");
        return p;
    }

    /** 회차 폴더 통째 삭제 */
    public void deleteEpisodeDir(Long episodeId) {
        Path epDir = baseDir.resolve(String.valueOf(episodeId)).normalize();
        if (!epDir.startsWith(baseDir) || !Files.exists(epDir)) return;
        try (var walk = Files.walk(epDir)) {
            walk.sorted((a, b) -> b.getNameCount() - a.getNameCount())
                .forEach(p -> { try { Files.deleteIfExists(p); } catch (IOException ignore) {} });
        } catch (IOException ignore) { /* best effort */ }
    }

    public record Saved(String path, String contentType) {}
}
