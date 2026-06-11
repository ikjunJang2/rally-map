import { useEffect, useRef } from 'react';

/**
 * 교통 CCTV HLS 인라인 플레이어.
 * Safari는 네이티브 HLS, 그 외 브라우저는 hls.js를 동적 로드해 재생.
 * autoplay 속성·hls 이벤트만으로는 MSE 스트림이 자동 시작되지 않을 수 있어,
 * 비디오의 canplay(재생 가능 시점)에 명시적으로 play()를 호출한다.
 */
export default function CctvPlayer({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // 같은 출처(/api/cctv/stream) 프록시 경로만 재생 — 외부 URL 직접 로드 차단
    if (!src.startsWith('/api/')) return;

    let destroyed = false;
    let hls: { destroy: () => void } | null = null;
    // muted라 정책상 허용. 차단되면 사용자가 ▶ 누르면 됨.
    const tryPlay = () => { if (video.paused) void video.play().catch(() => {}); };
    // 재생 가능해질 때마다 자동 시작 (MSE는 데이터가 붙은 뒤라야 play가 먹힘)
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadedmetadata', tryPlay);

    const setup = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src; // Safari/iOS 네이티브 HLS
        return;
      }
      const { default: Hls } = await import('hls.js');
      if (destroyed) return;
      if (Hls.isSupported()) {
        // enableWorker:false — 운영 CSP(script-src 'self')가 blob 워커를 막아도 안전
        const instance = new Hls({ enableWorker: false, maxBufferLength: 15, liveSyncDurationCount: 3 });
        instance.on(Hls.Events.MANIFEST_PARSED, tryPlay);
        // 복구 무한루프 방지 — 계속 깨지는 스트림은 몇 번 시도 후 포기(CPU/네트워크 churn 차단)
        let recoverCount = 0;
        const MAX_RECOVER = 3;
        instance.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (recoverCount >= MAX_RECOVER) { instance.destroy(); return; }
          recoverCount++;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) instance.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) instance.recoverMediaError();
          else instance.destroy();
        });
        instance.loadSource(src);
        instance.attachMedia(video);
        hls = instance;
      } else {
        video.src = src; // 최후 폴백
      }
    };
    void setup();

    return () => {
      destroyed = true;
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadedmetadata', tryPlay);
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="cctv-video"
      controls
      autoPlay
      muted
      playsInline
      aria-label={`${title} 실시간 영상`}
    />
  );
}
