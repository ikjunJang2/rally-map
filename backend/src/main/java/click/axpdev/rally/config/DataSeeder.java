package click.axpdev.rally.config;

import click.axpdev.rally.domain.Notice;
import click.axpdev.rally.domain.Poi;
import click.axpdev.rally.repository.NoticeRepository;
import click.axpdev.rally.repository.PoiRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

import static click.axpdev.rally.domain.PoiType.*;

/**
 * 초기 데이터 시드. 좌표 출처: OpenStreetMap (2026-06 조회).
 * 프론트엔드 fallbackPois.js 와 동일하게 유지할 것.
 */
@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seed(PoiRepository pois, NoticeRepository notices) {
        return args -> {
            if (pois.count() == 0) {
                pois.saveAll(List.of(
                    new Poi(MEET,   "모임 장소 (SK올림픽핸드볼경기장 앞)", 37.51735, 127.12640, "주최 측 공지에 따라 변경될 수 있음 · 동2문 인근"),
                    new Poi(SUBWAY, "올림픽공원역 (5·9호선)", 37.51652, 127.13089, "3번 출구 → 동2문 방면, 도보 약 5분"),
                    new Poi(SUBWAY, "몽촌토성역 (8호선)", 37.51753, 127.11267, "1번 출구, 도보 약 15분"),
                    new Poi(TOILET, "공중화장실 (경기장 서측)", 37.51824, 127.12302, "올림픽공원 내"),
                    new Poi(TOILET, "공중화장실 (경기장 북측)", 37.52026, 127.12577, "올림픽공원 내"),
                    new Poi(TOILET, "공중화장실 (공원 북동측)", 37.52169, 127.12439, "올림픽공원 내"),
                    new Poi(TOILET, "공중화장실 (공원 중앙)", 37.51716, 127.12086, "올림픽공원 내"),
                    new Poi(TOILET, "공중화장실 (공원 북측)", 37.52110, 127.12099, "올림픽공원 내"),
                    new Poi(TOILET, "공중화장실 (몽촌토성 방면)", 37.51809, 127.11679, "올림픽공원 내"),
                    new Poi(TOILET, "공중화장실 (몽촌토성역 방면)", 37.51904, 127.11599, "올림픽공원 내"),
                    new Poi(STORE,  "GS25 올림픽공원역점", 37.51653, 127.13060, "생수·간식"),
                    new Poi(STORE,  "CU 올림픽프라자상가점", 37.51573, 127.13106, "생수·간식"),
                    new Poi(STORE,  "CU 한국체대 체육과학관점", 37.51987, 127.12966, "생수·간식"),
                    new Poi(STORE,  "CU 올림픽타운점", 37.51335, 127.12265, "생수·간식"),
                    new Poi(STORE,  "GS25 송파누리점", 37.51276, 127.12375, "생수·간식"),
                    new Poi(STORE,  "세븐일레븐 뉴송파방이점", 37.51342, 127.11819, "생수·간식"),
                    new Poi(WATER,  "물·물품 나눔처", 37.51800, 127.12620, "현장 공지로 위치 갱신")
                ));
            }
            if (notices.count() == 0) {
                notices.save(new Notice(
                    "평화로운 하루 되세요",
                    "이 페이지의 시설 정보는 OpenStreetMap 기반입니다. 현장 상황에 따라 다를 수 있으니 진행 요원의 안내를 우선하세요.",
                    true
                ));
            }
        };
    }
}
