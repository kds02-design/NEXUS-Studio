// 운명 관측소 전용 빌드 설정 — 별도 도메인 배포용 (scripts/build-destiny.mjs 가 사용).
// 메인 vite.config.js 와 분리: destiny.html 단일 엔트리, public 전체(34MB) 복사 없이
// 필요한 정적 파일만 빌드 스크립트가 선별 복사한다.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist-destiny',
    emptyOutDir: true,
    rollupOptions: {
      input: 'destiny.html',
    },
  },
})
