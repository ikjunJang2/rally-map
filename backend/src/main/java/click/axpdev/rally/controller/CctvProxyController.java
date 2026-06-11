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
import java.net.InetAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.net.UnknownHostException;
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
    // 리다이렉트 비활성(NEVER): 화이트리스트 호스트가 30x로 내부망(메타데이터 등)으로
    // 우회시키는 SSRF를 차단. HttpClient는 리다이렉트를 우리가 검사하기 전에 따라가버리므로
    // 따라가지 않고 실패시킨다(정상 ITS HLS는 리다이렉트하지 않음).
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NEVER)
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
        // 서명/화이트리스트와 무관하게, 내부망·메타데이터 등 사설 주소로는 절대 나가지 않는다.
        // (서명 분기는 호스트를 검사하지 않으므로 여기서 egress 필터로 SSRF를 최종 차단)
        if (!isPublicFetchable(u)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        try {
            // ITS CCTV는 302로 실제 스트림(다른 포트)으로 리다이렉트한다. 자동 추적을 끄고
            // 우리가 직접 따라가되 매 홉마다 egress 필터로 사설 주소를 차단(SSRF 방지).
            HttpResponse<byte[]> res = fetchFollowingSafeRedirects(u);
            if (res == null) return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
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
                // 사설/내부 주소를 가리키는 줄은 서명·프록시하지 않는다 (서명되면 egress 필터를
                // 우회할 수 있으므로 애초에 서명 자체를 막음). 원문을 그대로 두면 브라우저가
                // 교차출처·mixed-content로 로드하지 못해 무해하다.
                if (isPublicFetchable(abs)) {
                    out.append("/api/cctv/stream?u=").append(enc(abs))
                       .append("&sig=").append(sign(abs)).append('\n');
                } else {
                    out.append(line).append('\n');
                }
            }
        }
        return out.toString();
    }

    /**
     * 리다이렉트를 직접(최대 5홉) 따라가며 매 홉마다 egress 필터를 통과한 URL만 가져온다.
     * HttpClient의 자동 추적(Redirect.NORMAL)은 내부망으로의 우회를 검사 없이 따라가므로 쓰지 않는다.
     * 사설 주소로 리다이렉트되거나 홉이 과하면 null 반환(호출부가 502 처리).
     */
    private HttpResponse<byte[]> fetchFollowingSafeRedirects(String startUrl) throws Exception {
        String current = startUrl;
        for (int hop = 0; hop < 5; hop++) {
            if (!isPublicFetchable(current)) return null;
            HttpRequest req = HttpRequest.newBuilder(URI.create(current))
                    .timeout(Duration.ofSeconds(12))
                    .header("User-Agent", "rally-map-cctv-proxy")
                    .GET().build();
            HttpResponse<byte[]> res = client.send(req, HttpResponse.BodyHandlers.ofByteArray());
            int sc = res.statusCode();
            if (sc == 301 || sc == 302 || sc == 303 || sc == 307 || sc == 308) {
                String loc = res.headers().firstValue("location").orElse(null);
                if (loc == null || loc.isBlank()) return res;
                current = URI.create(current).resolve(loc).toString();
                continue;
            }
            return res; // 최종 응답
        }
        return null; // 리다이렉트 과다 — 루프 방지
    }

    /**
     * 이 URL로 실제 바깥으로 나가도 안전한지 — http(s) 스킴이고, 호스트가 해석된 모든 IP가
     * 공인망일 때만 true. loopback·link-local(169.254.x, 메타데이터)·사설망(10/172.16/192.168)·
     * 멀티캐스트·와일드카드 주소면 거부해 SSRF를 막는다.
     */
    private static boolean isPublicFetchable(String url) {
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) return false;
        String host;
        try {
            host = URI.create(url).getHost();
        } catch (Exception e) {
            return false;
        }
        if (host == null || host.isBlank()) return false;
        try {
            InetAddress[] addrs = InetAddress.getAllByName(host);
            if (addrs.length == 0) return false;
            for (InetAddress a : addrs) {
                if (a.isLoopbackAddress() || a.isLinkLocalAddress() || a.isSiteLocalAddress()
                        || a.isAnyLocalAddress() || a.isMulticastAddress()
                        || isUniqueLocalIpv6(a)) {
                    return false;
                }
            }
            return true;
        } catch (UnknownHostException e) {
            return false;
        }
    }

    /** IPv6 ULA(fc00::/7) — isSiteLocalAddress가 잡지 못하는 사설 대역 */
    private static boolean isUniqueLocalIpv6(InetAddress a) {
        byte[] b = a.getAddress();
        return b.length == 16 && (b[0] & 0xFE) == 0xFC;
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
