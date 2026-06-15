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
  async generateJSON({ prompt, parts = [], schema = null, temperature = 0 }) {
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
        maxOutputTokens: 8192,
        // 추출은 전사 작업 — 동적 thinking이 출력 토큰 예산을 먹어 JSON이 잘리는 것 방지(flash는 0 = 비활성).
        thinkingConfig: { thinkingBudget: 0 },
        ...(schema ? { responseSchema: schema } : {}),
      },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) throw new Error(`Gemini: ${data.error.message || data.error.status}`);
    const cand = data.candidates && data.candidates[0];
    if (!cand) throw new Error('Gemini: 응답 후보 없음' + (data.promptFeedback ? ` (${JSON.stringify(data.promptFeedback)})` : ''));
    if (cand.finishReason === 'MAX_TOKENS') throw new Error('Gemini: 응답이 최대 토큰에서 잘렸습니다 — 입력을 줄이거나 maxOutputTokens를 늘려주세요');
    const text = (cand.content && cand.content.parts || []).map(p => p.text || '').join('');
    return parseJsonLoose(text);
  }
}
