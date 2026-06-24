// BriefStudio · Prism — prism/gemini.js
// Gemini REST 어댑터. SDK 의존성 없음(fetch만). 추출은 temperature 0 + responseSchema로 고정.

import { parseJsonLoose } from './parserCore.js';

export class GeminiProvider {
  /**
   * @param {object} opts
   * @param {string} [opts.apiKey]  미지정 시 VITE_GEMINI_API_KEY
   * @param {string} [opts.model]   기본 gemini-2.5-flash
   */
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY);
    // 기본 flash — 빠르고 thinking 비활성(0) 가능 → 배포(Vercel) 타임아웃 회피 + 출력 예산 보존.
    // (pro 대비 속도↑·정확 약간↓. 정확도가 더 필요하면 opts.model 로 'gemini-2.5-pro' 지정 가능.)
    this.model = opts.model || 'gemini-2.5-flash';
    if (!this.apiKey) throw new Error('Gemini API 키가 없습니다 (VITE_GEMINI_API_KEY 또는 apiKey 옵션)');
  }

  /**
   * @param {object} p
   * @param {string} p.prompt
   * @param {{mimeType:string, base64:string}[]} [p.parts]  이미지/PDF
   * @param {object|null} [p.schema]  responseSchema — 있으면 API 레벨 구조화 출력
   * @param {number} [p.temperature]
   * @returns {Promise<object>} 파싱된 JSON
   */
  async generateJSON({ prompt, parts = [], schema = null, temperature = 0, timeoutMs = 240000, model = this.model }) {
    const isFlash = /flash/i.test(model);
    const body = {
      contents: [{
        role: 'user',
        parts: [
          ...parts.map(p => ({ inlineData: { mimeType: p.mimeType, data: p.base64 } })),
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        maxOutputTokens: 65536, // 전체상품 13일+롤오버 등 큰 JSON이 잘리지 않게.
        // flash: thinking 끔(0) → 빠름 + 출력 예산 보존(JSON 잘림 방지).
        // pro: 동적 thinking + thought 스트리밍(includeThoughts) → 사고 중에도 SSE 가 흘러
        //      Edge 프록시 연결이 끊기지 않아 504 방지(사고 요약 텍스트는 파싱에서 제외).
        thinkingConfig: isFlash ? { thinkingBudget: 0 } : { includeThoughts: true },
        ...(schema ? { responseSchema: schema } : {}),
      },
    };
    // ★ 스트리밍(streamGenerateContent + alt=sse) 사용 — 긴 생성(pro·대용량 JSON)이 배포 환경
    // (Vercel Edge 프록시)의 초기 응답 타임아웃(~25초)에 걸려 504(FUNCTION_INVOCATION_TIMEOUT)
    // 나는 것을 방지. 첫 토큰이 도착하는 즉시 응답이 시작돼 연결이 유지되고, 청크를 모아 파싱한다.
    // 로컬(vite dev)은 타임아웃이 없어 generateContent 로도 됐지만, 배포는 스트리밍이 필요.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    // 무한 대기 방지 — 타임아웃 시 abort. 스트리밍 동안에도 유효(전체 상한).
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      let res;
      try {
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      } catch (e) {
        if (e && e.name === 'AbortError') throw new Error(`Gemini: 응답 지연으로 중단됨(${Math.round(timeoutMs / 1000)}초 초과) — 입력(이미지) 크기를 줄이거나 다시 시도해주세요`, { cause: e });
        throw new Error('Gemini: 네트워크 요청 실패 — ' + ((e && e.message) || e), { cause: e });
      }

      if (!res.ok) {
        let detail = '';
        try { detail = (await res.text()).slice(0, 300); } catch (e2) { /* noop */ }
        throw new Error(`Gemini: HTTP ${res.status} ${res.statusText}${detail ? ' — ' + detail : ''}`);
      }
      if (!res.body) throw new Error('Gemini: 스트림 본문이 없습니다.');

      let text = '';
      let finishReason = null;
      let promptFeedback = null;
      let sawCandidate = false;

      // SSE 이벤트 1개(여러 data: 줄 가능) 처리 — 누적 text/finishReason 갱신.
      const handleEvent = (ev) => {
        const payload = ev.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
        if (!payload || payload === '[DONE]') return;
        let chunk;
        try { chunk = JSON.parse(payload); } catch { return; } // 부분/비정상 청크는 스킵
        if (chunk.error) throw new Error(`Gemini: ${chunk.error.message || chunk.error.status}`);
        if (chunk.promptFeedback) promptFeedback = chunk.promptFeedback;
        const cand = chunk.candidates && chunk.candidates[0];
        if (cand) {
          sawCandidate = true;
          for (const p of (cand.content && cand.content.parts) || []) {
            if (p.thought) continue; // 사고 요약(thought)은 출력 JSON 이 아니므로 누적 제외
            if (typeof p.text === 'string') text += p.text;
          }
          if (cand.finishReason) finishReason = cand.finishReason;
        }
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop(); // 마지막 미완성 이벤트는 보류
          for (const ev of events) handleEvent(ev);
        }
      } catch (e) {
        if (e && e.name === 'AbortError') throw new Error(`Gemini: 응답 지연으로 중단됨(${Math.round(timeoutMs / 1000)}초 초과) — 입력(이미지) 크기를 줄이거나 다시 시도해주세요`, { cause: e });
        throw e;
      }
      if (buffer.trim()) handleEvent(buffer); // 잔여 플러시

      if (!sawCandidate) throw new Error('Gemini: 응답 후보 없음' + (promptFeedback ? ` (${JSON.stringify(promptFeedback)})` : ''));
      if (finishReason === 'MAX_TOKENS') throw new Error('Gemini: 응답이 최대 토큰에서 잘렸습니다 — 입력을 줄이거나 maxOutputTokens를 늘려주세요');
      if (!text.trim()) throw new Error(`Gemini: 빈 응답 (finishReason: ${finishReason || '?'})`);
      // 정상 완료면 finishReason 이 'STOP' 등으로 채워진다. 비어 있으면 스트림이 중간에 끊긴 것
      // (배포 환경 25초 타임아웃 가능성) — 잘린 JSON 을 조용히 부분 사용하지 말고 명확히 에러로 알린다.
      if (!finishReason) throw new Error('Gemini: 응답이 중간에 끊겼습니다 (배포 환경 타임아웃 가능성) — 다시 시도하거나 입력 이미지를 줄여주세요');
      return parseJsonLoose(text);
    } finally {
      clearTimeout(timer);
    }
  }
}
