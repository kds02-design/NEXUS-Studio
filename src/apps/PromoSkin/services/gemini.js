// Promo Skin Studio — 컨셉 → 프리셋(JSON) 생성. 공용 VITE_GEMINI_API_KEY 사용.
// 원본 코드의 Anthropic 호출을 Gemini 로 교체 (NEXUS Studio 공용 키 정책).
import { GEMINI_API_KEY } from "../../../lib/gemini";

const MODEL = "gemini-2.5-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// 시스템 프롬프트·응답 스키마는 순수 모듈(themePrompt.js) — MCP(nexus_theme_preset_prompt)와 공유.
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from "./themePrompt";
export { SYSTEM_PROMPT as THEME_SYSTEM_PROMPT, RESPONSE_SCHEMA as THEME_RESPONSE_SCHEMA };

// 컨셉(한국어 자연어) → 테마 프리셋 JSON. 실패 시 throw.
export async function generateThemePreset(concept) {
  const body = {
    contents: [{ parts: [{ text: `컨셉: ${concept}` }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: { temperature: 0.6, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  };
  const res = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("응답이 비어 있습니다. (안전 필터 차단 의심)");
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { throw new Error("응답 파싱 실패"); }
}
