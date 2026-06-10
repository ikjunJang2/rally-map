package click.axpdev.rally.controller;

import click.axpdev.rally.service.CctvService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cctvs")
public class CctvController {

    private final CctvService cctv;

    public CctvController(CctvService cctv) {
        this.cctv = cctv;
    }

    @GetMapping
    public Map<String, Object> list() {
        List<CctvService.Cctv> cameras = cctv.nearby();
        return Map.of("enabled", cctv.enabled(), "cameras", cameras);
    }
}
