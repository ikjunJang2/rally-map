import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 개발 중 백엔드(Spring Boot)로 API 프록시
      '/api': 'http://localhost:8080',
    },
  },
})
