import { useEffect, useRef } from 'react';

/**
 * 교통 CCTV HLS 인라인 플레이어.
 * Safari는 네이티브 HLS, 그 외 브라우저는 hls.js를 동적 로드해 재생.
 */
export default function CctvPlayer({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // 프론트 2차 방어 — https HLS 스트림만 재생
    if (!src.startsWith('https://')) return;

    let destroyed = false;
    let hls: { destroy: () => void } | null = null;

    const setup = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src; // Safari/iOS 네이티브 HLS
        return;
      }
      const { default: Hls } = await import('hls.js');
      if (destroyed) return;
      if (Hls.isSupported()) {
        const instance = new Hls({ maxBufferLength: 15 });
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
