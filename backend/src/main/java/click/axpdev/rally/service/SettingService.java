package click.axpdev.rally.service;

import click.axpdev.rally.domain.AppSetting;
import click.axpdev.rally.repository.AppSettingRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * 런타임 설정 읽기/쓰기. 매 요청마다 DB를 치지 않도록 메모리에 캐시한다.
 * get()은 DB 등록값 우선, 없으면 fallback(보통 환경변수 기본값)을 돌려준다.
 */
@Service
public class SettingService {

    private final AppSettingRepository repo;
    private final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();
    private volatile boolean loaded = false;

    public SettingService(AppSettingRepository repo) {
        this.repo = repo;
    }

    private void ensureLoaded() {
        if (loaded) return;
        synchronized (this) {
            if (loaded) return;
            repo.findAll().forEach(s -> {
                if (s.getValue() != null && !s.getValue().isBlank()) cache.put(s.getKey(), s.getValue());
            });
            loaded = true;
        }
    }

    /** DB 등록값 우선, 비어 있으면 fallback. */
    public String get(String key, String fallback) {
        ensureLoaded();
        String v = cache.get(key);
        return (v != null && !v.isBlank()) ? v : fallback;
    }

    /** DB에 등록값이 있는지 (환경변수 fallback은 제외). */
    public boolean has(String key) {
        ensureLoaded();
        String v = cache.get(key);
        return v != null && !v.isBlank();
    }

    @Transactional
    public void set(String key, String value) {
        String v = value == null ? "" : value.strip();
        AppSetting s = repo.findById(key).orElseGet(() -> new AppSetting(key, v));
        s.setValue(v);
        repo.save(s);
        if (v.isBlank()) cache.remove(key); else cache.put(key, v);
    }
}
