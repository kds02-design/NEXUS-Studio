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
    this.model = opts.model || 'gemini-2.5-pro'; // 비전·추론 최상위. (flash 대비 정확↑·속도↓)
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
  async generateJSON({ prompt, parts = [], schema = null, temperature = 0, timeoutMs = 240000 }) {
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
        // flash는 thinking을 끄면(0) 출력 예산이 보존돼 JSON 잘림 방지. pro는 thinking을 끌 수 없어(0 거부) 동적 thinking 사용.
        ...(/flash/i.test(this.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        ...(schema ? { responseSchema: schema } : {}),
      },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    // 무한 대기 방지 — 타임아웃 시 abort 후 명확한 에러.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error(`Gemini: 응답 지연으로 중단됨(${Math.round(timeoutMs / 1000)}초 초과) — 입력(이미지) 크기를 줄이거나 다시 시도해주세요`, { cause: e });
      throw new Error('Gemini: 네트워크 요청 실패 — ' + ((e && e.message) || e), { cause: e });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch (e) { /* noop */ }
      throw new Error(`Gemini: HTTP ${res.status} ${res.statusText}${detail ? ' — ' + detail : ''}`);
    }
    let data;
    try { data = await res.json(); } catch (e) { throw new Error('Gemini: 응답 JSON 파싱 실패(빈 응답일 수 있음)', { cause: e }); }
    if (data.error) throw new Error(`Gemini: ${data.error.message || data.error.status}`);
    const cand = data.candidates && data.candidates[0];
    if (!cand) throw new Error('Gemini: 응답 후보 없음' + (data.promptFeedback ? ` (${JSON.stringify(data.promptFeedback)})` : ''));
    if (cand.finishReason === 'MAX_TOKENS') throw new Error('Gemini: 응답이 최대 토큰에서 잘렸습니다 — 입력을 줄이거나 maxOutputTokens를 늘려주세요');
    const text = (cand.content && cand.content.parts || []).map(p => p.text || '').join('');
    if (!text.trim()) throw new Error(`Gemini: 빈 응답 (finishReason: ${cand.finishReason || '?'})`);
    return parseJsonLoose(text);
  }
}
