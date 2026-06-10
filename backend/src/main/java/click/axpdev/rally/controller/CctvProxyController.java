package click.axpdev.rally.controller;

import click.axpdev.rally.service.CctvService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;

/**
 * 교통 CCTV HLS 스트림 중계.
 * ITS CCTV는 http로만 제공되는데 사이트는 https라 브라우저가 직접 로드를 차단(mixed content)한다.
 * 백엔드가 http 스트림을 받아 같은 https 출처로 다시 내보내 이 문제를 우회한다.
 *
 * SSRF 방지:
 *  - 최상위 재생 요청(u)은 CctvService가 ITS에서 받은 호스트로만 허용.
 *  - 플레이리스트 내부 세그먼트는 서버가 재작성하며 HMAC 서명(sig)을 부여 →
 *    우리가 만든 URL만 중계되고, 임의 URL 프록시(open proxy)는 불가.
 */
@RestController
public class CctvProxyController {

    private static final Logger log = LoggerFactory.getLogger(CctvProxyController.class);

    private final CctvService cctv;
    private final byte[] signKey = new byte[32]; // 부팅 시 1회 생성 (HLS URL은 휘발성이라 충분)
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public CctvProxyController(CctvService cctv) {
        this.cctv = cctv;
        new SecureRandom().nextBytes(signKey);
    }

    @GetMapping("/api/cctv/stream")
    public ResponseEntity<byte[]> stream(@RequestParam("u") String u,
                                         @RequestParam(value = "sig", required = false) String sig) {
        // 최상위는 ITS 호스트 허용, 하위(세그먼트)는 서버 서명으로 허용
        boolean ok = (sig != null && constantEquals(sig, sign(u))) || cctv.mayProxy(u);
        if (!ok) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(u))
                    .timeout(Duration.ofSeconds(12))
                    .header("User-Agent", "rally-map-cctv-proxy")
                    .GET().build();
            HttpResponse<byte[]> res = client.send(req, HttpResponse.BodyHandlers.ofByteArray());
            if (res.statusCode() >= 400) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }

            byte[] body = res.body();
            String ct = res.headers().firstValue("content-type").orElse("").toLowerCase();
            boolean isPlaylist = ct.contains("mpegurl") || u.toLowerCase().contains(".m3u8") || looksLikePlaylist(body);

            HttpHeaders headers = new HttpHeaders();
            headers.setCacheControl("no-store");

            if (isPlaylist) {
                URI base = res.uri(); // 리다이렉트 후 최종 URL 기준으로 상대경로 해석
                byte[] out = rewritePlaylist(new String(body, StandardCharsets.UTF_8), base)
                        .getBytes(StandardCharsets.UTF_8);
                headers.setContentType(MediaType.parseMediaType("application/vnd.apple.mpegurl"));
                return new ResponseEntity<>(out, headers, HttpStatus.OK);
            }
            headers.setContentType(ct.isBlank() ? MediaType.APPLICATION_OCTET_STREAM
                    : MediaType.parseMediaType(ct.split(";")[0]));
            return new ResponseEntity<>(body, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.warn("CCTV 중계 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    private static boolean looksLikePlaylist(byte[] body) {
        int n = Math.min(body.length, 7);
        return n == 7 && new String(body, 0, 7, StandardCharsets.UTF_8).equals("#EXTM3U");
    }

    /** 플레이리스트의 세그먼트·하위 플레이리스트 URL을 서명된 프록시 경로로 치환 */
    private String rewritePlaylist(String playlist, URI base) {
        StringBuilder out = new StringBuilder(playlist.length() + 512);
        for (String line : playlist.split("\n", -1)) {
            String t = line.strip();
            if (t.isEmpty() || t.startsWith("#")) {
                out.append(line).append('\n');
            } else {
                String abs = base.resolve(t).toString();
                out.append("/api/cctv/stream?u=").append(enc(abs))
                   .append("&sig=").append(sign(abs)).append('\n');
            }
        }
        return out.toString();
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signKey, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static boolean constantEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
