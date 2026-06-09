package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Poi;
import click.axpdev.rally.domain.PoiType;
import click.axpdev.rally.repository.PoiRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pois")
public class PoiController {

    private final PoiRepository pois;

    public PoiController(PoiRepository pois) {
        this.pois = pois;
    }

    @GetMapping
    public List<Poi> list(@RequestParam(required = false) PoiType type) {
        return type == null ? pois.findByActiveTrue() : pois.findByTypeAndActiveTrue(type);
    }
}
