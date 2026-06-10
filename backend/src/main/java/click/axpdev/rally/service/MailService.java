package click.axpdev.rally.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * 메일 발송 — SMTP가 설정된 경우에만 동작.
 * MAIL_USERNAME/MAIL_PASSWORD 미설정 시 조용히 비활성 (피드백은 DB·관리자화면에 남음).
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final String from;
    private final String to;
    private final boolean enabled;

    public MailService(JavaMailSender mailSender,
                       @Value("${spring.mail.username:}") String username,
                       @Value("${rally.mail.to:contact@63freedom.com}") String to) {
        this.mailSender = mailSender;
        this.from = username.strip();
        this.to = to.strip();
        this.enabled = !this.from.isBlank();
        if (!enabled) log.info("MAIL_USERNAME 미설정 — 메일 발송 비활성 (피드백은 관리자 화면에서 확인)");
    }

    public boolean enabled() {
        return enabled;
    }

    /** 비동기 호출 대상이 아닌, 호출자가 try-catch로 감싸 사용 (실패해도 저장은 유지) */
    public void sendFeedback(String message, String contact) {
        if (!enabled) return;
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(from);
            mail.setTo(to);
            mail.setSubject("[주권자의 광장] 개발자에게 바란다");
            mail.setText(message + "\n\n— 회신 연락처: " + (contact == null || contact.isBlank() ? "(없음)" : contact));
            mailSender.send(mail);
        } catch (Exception e) {
            log.warn("피드백 메일 발송 실패 (DB에는 저장됨): {}", e.getMessage());
        }
    }
}
