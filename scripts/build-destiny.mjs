// 운명 관측소 별도 도메인 배포 빌드.
// 사용: npm run build:destiny → dist-destiny/ 를 그대로 정적 배포 (Vercel Output Directory: dist-destiny)
//   1) destiny.html 단일 엔트리 빌드
//   2) destiny.html → index.html (도메인 루트 / 에서 바로 서비스)
//   3) 아이콘·SW·매니페스트만 선별 복사 (public 전체 34MB 복사 회피)
//   4) 매니페스트 start_url/scope 를 루트(/) 기준으로 재작성
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'dist-destiny'

execSync('npx vite build --config vite.destiny.config.js', { stdio: 'inherit' })

// 루트 서비스용 리네임
fs.renameSync(path.join(OUT, 'destiny.html'), path.join(OUT, 'index.html'))

// AI 섹션 lazy 청크 제거 — standalone 모드에선 절대 로드되지 않는 죽은 파일이고,
// firebase/UsageGate 코드가 공개 배포물에 실리는 것 자체를 차단.
for (const f of fs.readdirSync(path.join(OUT, 'assets'))) {
  if (/^AiSections-/.test(f)) {
    fs.rmSync(path.join(OUT, 'assets', f))
    console.log(`[build-destiny] AI 청크 제거: ${f}`)
  }
}

// 정적 파일 선별 복사
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true })
for (const f of ['destiny-180.png', 'destiny-192.png', 'destiny-512.png']) {
  fs.copyFileSync(path.join('public/icons', f), path.join(OUT, 'icons', f))
}
fs.copyFileSync('public/destiny-sw.js', path.join(OUT, 'destiny-sw.js'))

// 손금 추론은 서버/API 없이 실행된다. 모델과 고정 버전 WASM 런타임을 함께 배포한다.
for (const relative of ['models/palm-creases', 'vendor/ort-1.20.1']) {
  fs.cpSync(path.join('public', relative), path.join(OUT, relative), { recursive: true })
}

// 매니페스트 — 루트 배포용 (기존 파일은 NEXUS 동거 배포용 /destiny.html 기준이라 재작성)
const mf = JSON.parse(fs.readFileSync('public/destiny-manifest.webmanifest', 'utf8'))
mf.start_url = '/'
mf.scope = '/'
fs.writeFileSync(path.join(OUT, 'destiny-manifest.webmanifest'), JSON.stringify(mf, null, 2))

console.log('\n[build-destiny] dist-destiny/ 준비 완료 — 도메인 루트(/)에서 운명 관측소 서비스')
