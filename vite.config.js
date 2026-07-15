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

// 개발 서버용 PSD 추출 — 브라우저 메모리 한계(≈250MB)를 넘는 초대형 PSD 를 dev 서버(Node)가
// 대신 파싱해 레이어 PNG(dataURL) 목록으로 반환. scripts/psd-extract.mjs 와 같은 규칙
// (폴더=합침 1장, 최상위 레이어=개별, 숨김 제외, maxDim 다운스케일).
// ⚠ dev 전용 — 프로덕션(Vercel)엔 이 엔드포인트가 없어 클라이언트가 자동으로 브라우저 파싱/안내로 폴백.
function devPsdExtract() {
  const handler = async (req, res) => {
    const sendJson = (code, obj) => {
      res.statusCode = code
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(obj))
    }
    if (req.method !== 'POST') return sendJson(405, { error: 'POST only' })
    try {
      const u = new URL(req.url, 'http://localhost')
      const maxDim = Math.min(4000, Number(u.searchParams.get('maxDim')) || 2000)
      const chunks = []
      await new Promise((resolve, reject) => {
        req.on('data', (c) => chunks.push(c))
        req.on('end', resolve)
        req.on('error', reject)
      })
      const buf = Buffer.concat(chunks)

      const { createCanvas } = await import('@napi-rs/canvas')
      const { readPsd, initializeCanvas } = await import('ag-psd')
      initializeCanvas(createCanvas)

      // totalMemoryLimit: undefined — ag-psd 기본 2GB 디코드 가드를 명시적으로 해제(키 존재 여부로 판단).
      // 855MB급 PSD 는 비압축 합계가 2GB 를 넘어 기본값으론 'Exceeded memory limit' 이 난다. Node 는 램이 허용하는 만큼 사용.
      // skipCompositeImageData: false — 포토샵 저장 합성본(완성 렌더)도 추출해 "합성본(전체)" 항목으로 제공.
      const psd = readPsd(buf, { useImageData: false, skipLayerImageData: false, skipCompositeImageData: false, skipThumbnail: true, totalMemoryLimit: undefined })

      const BLEND = {
        normal: 'source-over', passThrough: 'source-over', dissolve: 'source-over',
        multiply: 'multiply', screen: 'screen', overlay: 'overlay', darken: 'darken', lighten: 'lighten',
        colorDodge: 'color-dodge', colorBurn: 'color-burn', hardLight: 'hard-light', softLight: 'soft-light',
        difference: 'difference', exclusion: 'exclusion', hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity',
        linearDodge: 'lighter', linearBurn: 'multiply', darkerColor: 'darken', lighterColor: 'lighten',
      }
      const rectOf = (n) => ({ x: n.left || 0, y: n.top || 0, w: n.canvas ? n.canvas.width : 0, h: n.canvas ? n.canvas.height : 0 })
      const collectLeaves = (nodes, out) => {
        for (const n of nodes || []) {
          if (n.hidden) continue
          if (n.children && n.children.length) collectLeaves(n.children, out)
          else if (n.canvas) out.push(n)
        }
      }
      const toDataUrl = (canvas) => 'data:image/png;base64,' + canvas.toBuffer('image/png').toString('base64')
      const downscale = (src) => {
        const s = Math.min(1, maxDim / Math.max(src.width, src.height))
        if (s >= 1) return src
        const o = createCanvas(Math.max(1, Math.round(src.width * s)), Math.max(1, Math.round(src.height * s)))
        o.getContext('2d').drawImage(src, 0, 0, o.width, o.height)
        return o
      }
      const mergeGroup = (group) => {
        const leaves = []
        collectLeaves(group.children, leaves)
        if (!leaves.length) return null
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const lf of leaves) {
          const r = rectOf(lf)
          if (r.x < minX) minX = r.x; if (r.y < minY) minY = r.y
          if (r.x + r.w > maxX) maxX = r.x + r.w; if (r.y + r.h > maxY) maxY = r.y + r.h
        }
        const cw = maxX - minX, ch = maxY - minY
        if (cw <= 0 || ch <= 0) return null
        const s = Math.min(1, maxDim / Math.max(cw, ch))
        const c = createCanvas(Math.max(1, Math.round(cw * s)), Math.max(1, Math.round(ch * s)))
        const ctx = c.getContext('2d')
        leaves.forEach((lf, i) => {
          const r = rectOf(lf)
          ctx.globalAlpha = lf.opacity == null ? 1 : lf.opacity
          ctx.globalCompositeOperation = i === 0 ? 'source-over' : (BLEND[lf.blendMode] || 'source-over')
          ctx.drawImage(lf.canvas, (r.x - minX) * s, (r.y - minY) * s, r.w * s, r.h * s)
        })
        return { canvas: c, x: minX, y: minY, origW: cw, origH: ch }
      }

      // 합성본(포토샵 완성 렌더) — 조정 레이어·마스크·블렌드 완전 반영, 원본과 동일.
      let composite = null
      if (psd.canvas) {
        const cc = downscale(psd.canvas)
        composite = { dataUrl: toDataUrl(cc), w: cc.width, h: cc.height }
        psd.canvas = null
      }

      const layers = []
      for (const node of psd.children || []) {
        if (node.hidden) continue
        const op = node.opacity == null ? 1 : node.opacity
        if (node.children && node.children.length) {
          const m = mergeGroup(node)
          if (m) layers.push({ name: node.name || '그룹', group: true, x: m.x, y: m.y, w: m.canvas.width, h: m.canvas.height, origW: m.origW, origH: m.origH, op, blend: node.blendMode, dataUrl: toDataUrl(m.canvas) })
        } else if (node.canvas) {
          const r = rectOf(node)
          const c = downscale(node.canvas)
          layers.push({ name: node.name || '레이어', group: false, x: r.x, y: r.y, w: c.width, h: c.height, origW: r.w, origH: r.h, op, blend: node.blendMode, dataUrl: toDataUrl(c) })
        }
      }
      sendJson(200, { width: psd.width, height: psd.height, composite, layers })
    } catch (e) {
      sendJson(500, { error: String(e?.message || e) })
    }
  }
  return {
    name: 'dev-psd-extract',
    configureServer(server) {
      server.middlewares.use('/api/psd-extract', handler)
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
    plugins: [react(), tailwindcss(), devGeminiProxy(geminiKey), devPsdExtract()],
    // dev 서버 포트 고정 — 5173 점유 시 5174…로 자동 증가하지 않고 에러로 알림.
    // (포트가 밀리는 원인은 종료 안 된 이전 dev 서버 — 그때는 해당 node 프로세스를 정리)
    server: {
      port: 5173,
      strictPort: true,
    },
    build: {
      rollupOptions: {
        // 메인 앱(index.html) + 독립 TIME:TAKERS 랜딩(tt-index.html)
        // + 반려동물 MBTI PWA(pet.html) + 운명 관측소 PWA(destiny.html) 멀티 엔트리.
        input: {
          main: 'index.html',
          ttIndex: 'tt-index.html',
          pet: 'pet.html',
          destiny: 'destiny.html',
        },
      },
    },
  }
})
