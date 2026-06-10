package click.axpdev.rally.controller;

import click.axpdev.rally.domain.Notice;
import click.axpdev.rally.repository.NoticeRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeRepository notices;

    public NoticeController(NoticeRepository notices) {
        this.notices = notices;
    }

    @GetMapping
    public List<Notice> list() {
        return notices.findAllByOrderByPinnedDescCreatedAtDesc();
    }
}
