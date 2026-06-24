import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const GOOGLE_ORIGIN = 'https://generativelanguage.googleapis.com'

// 개발 서버용 Gemini 프록시 — 프로덕션의 api/gemini.js(서버리스)와 동일 동작을 vite dev 에서 재현.
// 키는 Node 환경(GEMINI_API_KEY, ★VITE_ 아님★)에서만 읽어 브라우저 번들에 들어가지 않음.
function devGeminiProxy(geminiKey) {
  // 프로덕션의 api/gemini.js(Edge) + api/gemini-img.js(Node) 를 dev 에서 하나로 재현.
  // (로컬은 타임아웃이 없어 텍스트·이미지 모두 같은 핸들러로 충분)
  const handler = async (req, res) => {
    const sendJson = (code, obj) => {
      res.statusCode = code
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(obj))
    }
    if (!geminiKey) return sendJson(500, { error: { message: 'GEMINI_API_KEY 가 .env(서버용, VITE_ 아님)에 없습니다.' } })

    const u = new URL(req.url, 'http://localhost')
    const rawTarget = u.searchParams.get('target')
    if (!rawTarget) return sendJson(400, { error: { message: 'target 쿼리가 없습니다.' } })

    let parsed
    try { parsed = new URL(rawTarget, GOOGLE_ORIGIN) }
    catch { return sendJson(400, { error: { message: '잘못된 target 입니다.' } }) }
    if (parsed.origin !== GOOGLE_ORIGIN || !parsed.pathname.startsWith('/v1beta/')) {
      return sendJson(400, { error: { message: '허용되지 않은 target 입니다.' } })
    }
    parsed.searchParams.set('key', geminiKey)

    let body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise((resolve) => {
        let d = ''
        req.on('data', (c) => { d += c })
        req.on('end', () => resolve(d))
      })
    }
    try {
      const g = await fetch(parsed.toString(), {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: body || undefined,
      })
      const text = await g.text()
      res.statusCode = g.status
      res.setHeader('Content-Type', g.headers.get('content-type') || 'application/json')
      res.end(text)
    } catch (e) {
      sendJson(502, { error: { message: '프록시 전달 실패: ' + (e?.message || e) } })
    }
  }
  return {
    name: 'dev-gemini-proxy',
    configureServer(server) {
      server.middlewares.use('/api/gemini-img', handler) // 이미지 전용(프로덕션은 Node)
      server.middlewares.use('/api/gemini', handler)      // 그 외(프로덕션은 Edge)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 모든 env 로드(빈 prefix) — 비-VITE 변수(GEMINI_API_KEY)도 읽기 위함.
  const env = loadEnv(mode, process.cwd(), '')
  // 서버용 GEMINI_API_KEY 우선. 전환기엔 기존 VITE_GEMINI_API_KEY 도 폴백(dev 로컬 한정).
  const geminiKey = env.GEMINI_API_KEY || env.GEMINI_API_KEY_BRANDWEB || env.VITE_GEMINI_API_KEY || ''
  return {
    plugins: [react(), tailwindcss(), devGeminiProxy(geminiKey)],
  }
})
