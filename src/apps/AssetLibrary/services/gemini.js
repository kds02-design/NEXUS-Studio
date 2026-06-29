// 에셋 자동 분석 — 업로드된 PNG 원본을 보고 title + tags 추론.
// PromptArc / PromptAudit 와 동일한 단순 fetch 패턴.
import { GEMINI_API_KEY } from "../../../lib/gemini";
import { ASSET_THEME_IDS } from "../constants/themes";
import { ASSET_CATEGORY_LIST } from "../constants/categories";

const ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    suggested_category: { type: "STRING" },
  },
  required: ["title", "tags"],
};

// 카테고리 목록은 ASSET_CATEGORY_LIST 단일 진실 소스에서 파생 (메뉴 병합과 자동 동기화).
const ALLOWED_CATEGORIES = ASSET_CATEGORY_LIST.map((c) => c.id);
const CATEGORY_GUIDE = ASSET_CATEGORY_LIST.map((c) => `"${c.id}"(${c.name})`).join(" | ");

const PROMPT = `너는 게임 마케팅 디자인 에셋을 자동으로 라벨링하는 도우미야. 첨부 이미지는 게임 UI/마케팅 배너에서 잘라낸 단일 에셋(타이틀/버튼/박스/아이템/아이콘/프레임/블릿/빛효과/배경/장식 등) 중 하나야.

다음을 JSON 으로 출력해줘:
- "title": 짧은 한국어 이름. 5~15자 이내. 시각적 특징을 압축 (예: "푸른 액션 버튼", "골드 트로피 아이콘", "녹슨 메탈 화살표")
- "tags": 시각적 특징 키워드 3~6개. 한국어 또는 영어. 색·형태·스타일·용도 위주 (예: ["골드", "리본", "이벤트", "장식적"])
- "suggested_category": 다음 중 하나 — ${CATEGORY_GUIDE}

규칙:
- 게임 이름이나 회사명을 추측해서 넣지 말 것
- 가독성·신뢰도가 낮으면 카테고리는 반드시 영어 "etc" 로, 태그는 일반적인 키워드로 응답
- 텍스트가 보이면 그 문구를 그대로 title 에 쓰지 말고 의미·분위기를 요약
- suggested_category 는 위 영어 키 값 중 정확히 하나만 — 한국어 변환·복수 값·자유 텍스트 금지`;

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

// 컬러톤 테마 1개 추정 — 다크판타지 비중이 압도적이라 4톤으로 단순화.
// 추출 직후 백그라운드 호출. 실패/타임아웃이면 null 반환 (저장 안 함).
const THEME_PROMPT = `이 이미지는 게임 UI 또는 마케팅 배너에서 잘라낸 단일 에셋이야. 전체적인 컬러톤을 다음 4개 중 하나로만 분류해줘:

- "brown": 따뜻한 갈색·세피아·우드톤이 지배적
- "darkbrown": 진한 갈색·검정·다크판타지 어두운 톤
- "blue": 푸른색·청록·차가운 톤 지배적
- "light": 밝은·하얀·파스텔·골드 같은 밝은 톤 지배적

규칙:
- 4개 중 정확히 하나의 영어 키만 응답
- 애매하면 가장 면적이 큰 색으로 결정
- 다크판타지 게임 에셋이 많으니 "darkbrown" 빈도가 높을 수 있음`;

const THEME_SCHEMA = {
  type: "OBJECT",
  properties: { theme: { type: "STRING" } },
  required: ["theme"],
};

export async function inferAssetTheme(dataUrl, { apiKey, timeoutMs = 15000 } = {}) {
  const key = apiKey || GEMINI_API_KEY;
  if (!key) return null;
  const base64 = toBase64(dataUrl);
  if (!base64) return null;

  const body = {
    contents: [{
      parts: [
        { text: THEME_PROMPT },
        { inlineData: { mimeType: inferMime(dataUrl), data: base64 } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: THEME_SCHEMA,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => { try { controller.abort(); } catch {} }, timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return null; }
    const t = String(parsed.theme || "").trim().toLowerCase();
    return ASSET_THEME_IDS.includes(t) ? t : null;
  } catch (e) {
    console.warn("[AssetLibrary] inferAssetTheme failed", e?.message || e);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
