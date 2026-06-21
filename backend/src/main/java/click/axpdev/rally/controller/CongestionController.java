package click.axpdev.rally.controller;

import click.axpdev.rally.service.CongestionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 실시간 혼잡도 공개 조회 — 서울시 도시데이터 기반(키 미설정 시 enabled=false) */
@RestController
@RequestMapping("/api/congestion")
public class CongestionController {

    private final CongestionService congestion;

    public CongestionController(CongestionService congestion) {
        this.congestion = congestion;
    }

    @GetMapping
    public CongestionService.Status get() {
        return congestion.current();
    }
}
