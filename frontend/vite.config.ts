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
            // 지도 타일은 동일출처 프록시(/tiles/…) — 200 응답만 캐시(실패 타일 캐시 방지)
            urlPattern: /\/tiles\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tiles',
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 3600 },
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
      // 지도 타일 프록시 (운영 nginx와 동일한 동일출처 경로를 개발에서도 재현)
      '/tiles/osm': {
        target: 'https://tile.openstreetmap.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tiles\/osm/, ''),
      },
      '/tiles/esri': {
        target: 'https://server.arcgisonline.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tiles\/esri/, '/ArcGIS/rest/services/World_Imagery/MapServer/tile'),
      },
    },
  },
});
