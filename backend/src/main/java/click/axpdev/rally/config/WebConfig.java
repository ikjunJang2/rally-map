package click.axpdev.rally.config;

import click.axpdev.rally.auth.AdminInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AdminInterceptor adminInterceptor;
    private final String[] allowedOrigins;

    public WebConfig(AdminInterceptor adminInterceptor,
                     @Value("${rally.cors.allowed-origins:http://localhost:5173,https://www.63freedom.com,https://63freedom.com}")
                     String[] allowedOrigins) {
        this.adminInterceptor = adminInterceptor;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 브라우저는 같은 출처라도 POST에 Origin 헤더를 붙이는데, nginx 프록시를 거치면
        // 백엔드가 Host를 내부값으로 보아 운영 도메인을 외부 출처(CORS)로 판단한다.
        // → 운영 도메인(www·apex)과 개발 서버를 모두 허용해야 로그인·글쓰기 등 POST가 통과.
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedHeaders("*")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminInterceptor).addPathPatterns("/api/admin/**");
    }
}
