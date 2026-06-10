package click.axpdev.rally.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 커뮤니티 검열 — 금칙어(욕설·위협·스팸 키워드)와 링크 개수 검사.
 * 정규화(공백·특수문자·숫자 제거, 소문자화) 후 부분일치라 "시1발", "시 발" 변형도 차단.
 */
@Service
public class ModerationService {

    private static final Logger log = LoggerFactory.getLogger(ModerationService.class);
    private static final Pattern URL_PATTERN = Pattern.compile("https?://|www\\.", Pattern.CASE_INSENSITIVE);
    private static final Pattern STRIP_PATTERN = Pattern.compile("[\\s\\d\\p{Punct}·ㆍ‥…￦~]+");
    private static final int MAX_URLS = 2;

    private final List<String> bannedWords = new ArrayList<>();

    public ModerationService() {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource("moderation-banned-words.txt").getInputStream(),
                StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.strip();
                if (line.isEmpty() || line.startsWith("#")) continue;
                bannedWords.add(normalize(line));
            }
            log.info("금칙어 {}건 로드", bannedWords.size());
        } catch (Exception e) {
            log.error("금칙어 사전 로드 실패 — 검열 없이 동작", e);
        }
    }

    private static String normalize(String text) {
        return STRIP_PATTERN.matcher(text.toLowerCase()).replaceAll("");
    }

    /** 문제가 있으면 사용자에게 보여줄 사유를 반환, 통과하면 empty */
    public Optional<String> check(String... texts) {
        int urls = 0;
        for (String text : texts) {
            if (text == null || text.isBlank()) continue;
            String normalized = normalize(text);
            for (String banned : bannedWords) {
                if (!banned.isEmpty() && normalized.contains(banned)) {
                    return Optional.of("부적절한 표현이 포함되어 있어요. 서로를 지켜주는 말을 부탁드려요.");
                }
            }
            Matcher m = URL_PATTERN.matcher(text);
            while (m.find()) urls++;
        }
        if (urls > MAX_URLS) {
            return Optional.of("링크는 최대 " + MAX_URLS + "개까지만 넣을 수 있어요.");
        }
        return Optional.empty();
    }
}
