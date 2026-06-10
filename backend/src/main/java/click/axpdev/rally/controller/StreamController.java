package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Stream;
import click.axpdev.rally.repository.StreamRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/streams")
public class StreamController {

    private final StreamRepository streams;

    public StreamController(StreamRepository streams) {
        this.streams = streams;
    }

    @GetMapping
    public List<Stream> list() {
        return streams.findAllByOrderByLiveDescCreatedAtDesc();
    }
}
