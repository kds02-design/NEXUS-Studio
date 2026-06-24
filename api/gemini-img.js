// Vercel Node 프록시 — 이미지 생성(Nano Banana / Imagen) 전용.
// api/gemini.js(Edge) 는 초기 응답 25초 한도가 있어, 생성이 오래 걸리는 Pro 이미지 모델은 504 가 난다.
// 이미지 응답은 끝에 base64 가 통째로 오므로 스트리밍으로도 못 푼다 → 더 긴 타임아웃이 필요.
// 이 함수는 Node 런타임 + maxDuration 으로 시간을 벌고, 응답은 스트리밍 패스스루해
// 대용량 이미지 base64(2K/4K)의 4.5MB 버퍼 한도도 회피한다.
//
// 라우팅: lib/gemini.js 의 window.fetch 래퍼가 모델 경로에 'image' 가 있으면 이 엔드포인트로 보낸다.
// 환경변수: GEMINI_API_KEY (★VITE_ 아님★) — api/gemini.js 와 동일.

export const config = { maxDuration: 60 }; // Hobby 최대 60초. Pro 플랜이면 300 까지 올릴 수 있음.

const GOOGLE_ORIGIN = 'https://generativelanguage.googleapis.com';

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BRANDWEB || process.env.VITE_GEMINI_API_KEY;
  if (!key) { res.status(500).json({ error: { message: 'GEMINI_API_KEY 가 서버에 설정되지 않았습니다.' } }); return; }

  const u = new URL(req.url, 'http://localhost');
  const rawTarget = u.searchParams.get('target');
  if (!rawTarget) { res.status(400).json({ error: { message: 'target 쿼리가 없습니다.' } }); return; }

  let parsed;
  try { parsed = new URL(rawTarget, GOOGLE_ORIGIN); }
  catch { res.status(400).json({ error: { message: '잘못된 target 입니다.' } }); return; }
  if (parsed.origin !== GOOGLE_ORIGIN || !parsed.pathname.startsWith('/v1beta/')) {
    res.status(400).json({ error: { message: '허용되지 않은 target 입니다.' } }); return;
  }
  parsed.searchParams.set('key', key);

  // 요청 본문 수집
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    body = Buffer.concat(chunks);
  }

  try {
    const g = await fetch(parsed.toString(), {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    res.statusCode = g.status;
    res.setHeader('Content-Type', g.headers.get('content-type') || 'application/json');
    // 스트리밍 패스스루 — Content-Length 를 두지 않아 버퍼 한도(4.5MB)를 우회.
    if (g.body) {
      const reader = g.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) res.status(502).json({ error: { message: '프록시 전달 실패: ' + (e?.message || e) } });
    else { try { res.end(); } catch { /* noop */ } }
  }
}
