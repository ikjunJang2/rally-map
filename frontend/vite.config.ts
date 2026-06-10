import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '주권자의 광장 — 모든 권력은 국민으로부터',
        short_name: '주권광장',
        description: '화장실·편의시설·라이브·커뮤니티를 한 화면에. 헌법 제1조 2항.',
        lang: 'ko',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a1a2e',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // 지도 타일·외부 CDN은 한 번 본 영역을 캐시 → 현장 통신 장애에도 지도 표시
        runtimeCaching: [
          {
            // OSM 타일 정책상 브라우저 표준 캐싱 범위 내 사용 (2일)
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tiles-osm',
              expiration: { maxEntries: 300, maxAgeSeconds: 2 * 24 * 3600 },
            },
          },
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tiles-esri',
              expiration: { maxEntries: 200, maxAgeSeconds: 2 * 24 * 3600 },
            },
          },
          {
            // Pretendard 폰트 CDN — 오프라인에서도 타이포 유지
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // 관리자·로그인 응답은 절대 캐시하지 않음 (로그아웃 후 잔존·기기 탈취 노출 방지)
            urlPattern: /\/api\/(admin|auth)\/.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              // 현장 기지국 과부하(느린 3G) 고려 — 충분히 기다린 후 캐시 폴백
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 6 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // 개발 중 백엔드(Spring Boot)로 API 프록시
      '/api': 'http://localhost:8080',
    },
  },
});
