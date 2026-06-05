// Promo Skin Studio — 컨셉 → 프리셋(JSON) 생성. 공용 VITE_GEMINI_API_KEY 사용.
// 원본 코드의 Anthropic 호출을 Gemini 로 교체 (NEXUS Studio 공용 키 정책).
import { GEMINI_API_KEY } from "../../../lib/gemini";

const MODEL = "gemini-2.5-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `너는 한국 MMORPG 프로모션 페이지의 테마 디자이너다. 페이지 컨셉을 받아 아래 JSON 스키마에 정확히 맞는 테마 프리셋만 출력한다. 설명·마크다운·코드펜스 없이 순수 JSON만 출력하라.
스키마:
{"name": "짧은 한글 이름", "tokens": {"primary":"#rrggbb(버튼·프레임 강조색)","accent":"#rrggbb(타이틀 글로우·금장)","title":"#rrggbb(타이틀 글자색)","textLight":"#rrggbb(본문 밝은색)","panel":"#rrggbb(프레임 배경, 보통 어두운 색)","bgTop":"#rrggbb(상단 밝은 배경)","bgMid":"#rrggbb","bgBottom":"#rrggbb(하단 짙은 배경)","radius": 8~24 정수, "glow": 0~30 정수}, "variants": {"background":"field|dark|snow|plain","frame":"glow|metal|flat","container":"scroll|box","button":"glow|metal|flat","motif":"diamond|gem|none"}}
규칙: 컨셉의 계절·무드에 맞게 bgTop(밝음)->bgBottom(짙음) 그라데이션과 강조색을 정한다. 밝은 컨셉이면 glow 프레임/높은 glow, 무겁고 어두운 컨셉이면 metal 프레임/낮은 glow를 고른다.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    tokens: {
      type: "OBJECT",
      properties: {
        primary: { type: "STRING" }, accent: { type: "STRING" }, title: { type: "STRING" },
        textLight: { type: "STRING" }, panel: { type: "STRING" },
        bgTop: { type: "STRING" }, bgMid: { type: "STRING" }, bgBottom: { type: "STRING" },
        radius: { type: "NUMBER" }, glow: { type: "NUMBER" },
      },
    },
    variants: {
      type: "OBJECT",
      properties: {
        background: { type: "STRING" }, frame: { type: "STRING" },
        container: { type: "STRING" }, button: { type: "STRING" }, motif: { type: "STRING" },
      },
    },
  },
  required: ["name", "tokens", "variants"],
};

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
