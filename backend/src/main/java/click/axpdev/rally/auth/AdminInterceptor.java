package click.axpdev.rally.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** /api/admin/** 요청에 Bearer 토큰 검증 */
@Component
public class AdminInterceptor implements HandlerInterceptor {

    private final AdminAuthService auth;

    public AdminInterceptor(AdminAuthService auth) {
        this.auth = auth;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        if ("OPTIONS".equals(req.getMethod())) return true; // CORS preflight
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ") && auth.verify(header.substring(7))) {
            return true;
        }
        res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "관리자 로그인이 필요합니다");
        return false;
    }
}
