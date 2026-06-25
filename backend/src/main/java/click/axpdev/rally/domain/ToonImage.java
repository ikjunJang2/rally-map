package click.axpdev.rally.domain;

import jakarta.persistence.*;

/** 웹툰 한 컷(이미지) — 볼륨에 저장된 파일 경로를 가리킴 */
@Entity
@Table(name = "toon_image")
public class ToonImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long episodeId;

    /** 회차 내 순서 (위→아래) */
    @Column(nullable = false)
    private int ord;

    /** 볼륨 상 상대 경로 (예: toon/12/uuid.jpg) */
    @Column(nullable = false, length = 200)
    private String path;

    @Column(nullable = false, length = 60)
    private String contentType;

    protected ToonImage() {}

    public ToonImage(Long episodeId, int ord, String path, String contentType) {
        this.episodeId = episodeId;
        this.ord = ord;
        this.path = path;
        this.contentType = contentType;
    }

    public Long getId() { return id; }
    public Long getEpisodeId() { return episodeId; }
    public int getOrd() { return ord; }
    public String getPath() { return path; }
    public String getContentType() { return contentType; }
}
