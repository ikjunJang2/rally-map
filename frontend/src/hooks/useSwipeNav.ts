import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** 푸터 메뉴 순서 — 스와이프로 좌우 이동하는 메인 5탭 */
export const SWIPE_TABS = ['/', '/live', '/community', '/call', '/guide'];

/**
 * 콘텐츠를 좌우로 스와이프하면 인접한 푸터 탭으로 이동.
 * - 메인 5탭에서만 동작(관리자·약관 등에선 비활성)
 * - 지도 패닝·영상·가로 스크롤·입력 요소 위에서 시작한 스와이프는 제외(충돌 방지)
 * - 세로 스크롤과 구분: 가로 이동이 충분히 크고 세로보다 우세할 때만
 */
export function useSwipeNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const start = useRef<{ x: number; y: number; t: number; ok: boolean } | null>(null);

  useEffect(() => {
    const idx = SWIPE_TABS.indexOf(pathname);
    if (idx < 0) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { start.current = null; return; }
      const t = e.touches[0];
      const el = e.target as HTMLElement;
      const blocked = !!el.closest?.(
        '.leaflet-container, video, input, textarea, select, button, a, [data-noswipe], .seg, .chiprow',
      );
      start.current = { x: t.clientX, y: t.clientY, t: Date.now(), ok: !blocked };
    };

    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || !s.ok) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const dt = Date.now() - s.t;
      // 가로 스와이프 판정: 충분히 길고(≥70px), 세로보다 우세(×1.8), 너무 느리지 않게(≤600ms)
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || dt > 600) return;
      const next = dx < 0 ? idx + 1 : idx - 1; // 왼쪽으로 밀면 다음 탭
      if (next < 0 || next >= SWIPE_TABS.length) return;
      navigate(SWIPE_TABS[next]);
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [pathname, navigate]);
}
