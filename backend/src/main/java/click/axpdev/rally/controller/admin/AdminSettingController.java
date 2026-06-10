package click.axpdev.rally.controller.admin;

import click.axpdev.rally.service.SettingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 외부 연동 키 등록 — /api/admin/** 라 AdminInterceptor가 토큰을 검증한다.
 * 화이트리스트(FIELDS)에 있는 키만 허용해 임의 키 주입을 막는다.
 * 비밀(secret) 키는 값을 응답에 돌려주지 않고 등록 여부만 노출한다.
 * (법령 OC는 공개 식별자라 secret=false — 그대로 보여줘 수정 가능)
 */
@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingController {

    private final SettingService settings;

    public AdminSettingController(SettingService settings) {
        this.settings = settings;
    }

    private record Field(String key, String label, String help, boolean secret) {}

    private static final List<Field> FIELDS = List.of(
            new Field("law.oc", "국가법령정보 OC (오픈API 이메일 ID)",
                    "open.law.go.kr 오픈API 신청 후 받는 OC. 보통 가입 이메일의 @ 앞부분이에요. 안내 탭 법령 검색에 쓰여요.",
                    false)
    );

    private static Field field(String key) {
        return FIELDS.stream().filter(f -> f.key().equals(key)).findFirst().orElse(null);
    }

    @GetMapping
    public List<Map<String, Object>> all() {
        return FIELDS.stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", f.key());
            m.put("label", f.label());
            m.put("help", f.help());
            m.put("secret", f.secret());
            m.put("set", settings.has(f.key()));
            // 비밀 키는 값을 돌려주지 않음(노출 방지). 공개 식별자만 그대로 노출.
            m.put("value", f.secret() ? "" : settings.get(f.key(), ""));
            return m;
        }).toList();
    }

    public record SetRequest(@NotBlank String key, @Size(max = 200) String value) {}

    @PutMapping
    public ResponseEntity<?> set(@Valid @RequestBody SetRequest req) {
        if (field(req.key()) == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "허용되지 않은 설정 키예요"));
        }
        settings.set(req.key(), req.value());
        return ResponseEntity.noContent().build();
    }
}
