// Vercel Edge 프록시 — Google Generative Language API (Gemini / Imagen / Veo).
// 목적: API 키를 ★서버에만★ 두고 클라이언트 번들에 노출하지 않는다.
// 클라이언트는 /api/gemini?target=/v1beta/models/...:generateContent 로 호출하고(키 없음),
// 이 함수가 서버 환경변수 GEMINI_API_KEY 를 주입해 Google 로 포워딩한다.
//
// Edge 런타임 + 응답 스트리밍 패스스루 — 이미지/영상 생성처럼 응답 base64 가 큰 경우도
// 버퍼링 없이 그대로 흘려보내 서버리스 응답 크기 한도 문제를 피한다.
// (요청 본문 한도는 플랫폼 제약을 따름 — 매우 큰 4K 참조 이미지는 실패할 수 있음.)
//
// 환경변수(Vercel 대시보드 / 로컬 .env): GEMINI_API_KEY = <실제 키>  (★ VITE_ 접두사 금지)

export const config = { runtime: 'edge' };

const GOOGLE_ORIGIN = 'https://generativelanguage.googleapis.com';

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async function handler(req) {
  // GEMINI_API_KEY(서버용) 우선. 전환기 동안 기존 VITE_GEMINI_API_KEY 도 마지막 폴백으로 허용
  // — 단, 노출을 끝내려면 VITE_GEMINI_API_KEY 는 더미('proxy')로 바꾸고 GEMINI_API_KEY 를 설정할 것.
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BRANDWEB || process.env.VITE_GEMINI_API_KEY;
  if (!key) return json(500, { error: { message: 'GEMINI_API_KEY 가 서버에 설정되지 않았습니다.' } });

  const reqUrl = new URL(req.url);
  const rawTarget = reqUrl.searchParams.get('target');
  if (!rawTarget) return json(400, { error: { message: 'target 쿼리가 없습니다.' } });

  // target 검증 — Google v1beta 경로만 허용(오픈 프록시/SSRF 방지).
  let parsed;
  try { parsed = new URL(rawTarget, GOOGLE_ORIGIN); }
  catch { return json(400, { error: { message: '잘못된 target 입니다.' } }); }
  if (parsed.origin !== GOOGLE_ORIGIN || !parsed.pathname.startsWith('/v1beta/')) {
    return json(400, { error: { message: '허용되지 않은 target 입니다.' } });
  }
  parsed.searchParams.set('key', key);

  const method = req.method || 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  try {
    const g = await fetch(parsed.toString(), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: hasBody ? await req.text() : undefined,
    });
    return new Response(g.body, {
      status: g.status,
      headers: { 'Content-Type': g.headers.get('content-type') || 'application/json' },
    });
  } catch (e) {
    return json(502, { error: { message: '프록시 전달 실패: ' + (e?.message || e) } });
  }
}
