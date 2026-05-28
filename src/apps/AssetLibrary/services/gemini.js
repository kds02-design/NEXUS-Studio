// 에셋 자동 분석 — 업로드된 PNG 원본을 보고 title + tags 추론.
// PromptArc / PromptAudit 와 동일한 단순 fetch 패턴.
import { GEMINI_API_KEY } from "../../../lib/gemini";

const ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    suggested_category: { type: "STRING" },
  },
  required: ["title", "tags"],
};

const ALLOWED_CATEGORIES = ["title", "button", "box", "item", "icon", "etc"];

const PROMPT = `너는 게임 마케팅 디자인 에셋을 자동으로 라벨링하는 도우미야. 첨부 이미지는 게임 UI/마케팅 배너에서 잘라낸 단일 에셋(타이틀/버튼/박스/아이템/아이콘/기타) 중 하나야.

다음을 JSON 으로 출력해줘:
- "title": 짧은 한국어 이름. 5~15자 이내. 시각적 특징을 압축 (예: "푸른 액션 버튼", "골드 트로피 아이콘", "기간 한정 타이틀")
- "tags": 시각적 특징 키워드 3~6개. 한국어 또는 영어. 색·형태·스타일·용도 위주 (예: ["골드", "리본", "이벤트", "장식적"])
- "suggested_category": 다음 중 하나 — "title" | "button" | "box" | "item" | "icon" | "etc"

규칙:
- 게임 이름이나 회사명을 추측해서 넣지 말 것
- 가독성·신뢰도가 낮으면 카테고리는 반드시 영어 "etc" 로, 태그는 일반적인 키워드로 응답
- 텍스트가 보이면 그 문구를 그대로 title 에 쓰지 말고 의미·분위기를 요약
- suggested_category 는 위 6개 영어 값 중 하나만 — 한국어 변환·복수 값·자유 텍스트 금지`;

// dataUrl 또는 raw base64 모두 허용. Gemini 는 prefix 없는 base64 필요.
function toBase64(dataUrl) {
  if (!dataUrl) return null;
  const idx = dataUrl.indexOf("base64,");
  return idx >= 0 ? dataUrl.slice(idx + 7) : dataUrl;
}

function inferMime(dataUrl) {
  if (typeof dataUrl !== "string") return "image/png";
  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  return m ? m[1] : "image/png";
}

export async function analyzeAssetImage(dataUrl, { apiKey } = {}) {
  const key = apiKey || GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API 키가 없습니다.");
  const base64 = toBase64(dataUrl);
  if (!base64) throw new Error("이미지가 없습니다.");

  const body = {
    contents: [{
      parts: [
        { text: PROMPT },
        { inlineData: { mimeType: inferMime(dataUrl), data: base64 } },
      ],
    }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_SCHEMA,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("분석 응답이 비어있어요.");
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("응답 JSON 파싱 실패: " + raw.slice(0, 120)); }

  const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 40) : "";
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 8)
    : [];
  const cat = ALLOWED_CATEGORIES.includes(parsed.suggested_category)
    ? parsed.suggested_category : null;
  return { title, tags, suggestedCategory: cat };
}
