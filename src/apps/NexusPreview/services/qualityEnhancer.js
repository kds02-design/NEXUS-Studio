// 퀄리티 업 — 업로드한 배너 이미지를 Gemini 로 분석하고, 타겟 툴(Gemini/ChatGPT)에 맞춘
// "퀄리티 향상" 프롬프트를 JSON 으로 생성. 분석은 프로젝트 공용 Gemini 키 사용.
// "바로 렌더링" 은 공용 imagenRender 로 향상 이미지를 직접 생성 (Pro 이미지 모델).
import { geminiUrl } from "../../../lib/gemini";
import { renderWithImagen } from "../../../lib/imagenRender";

// 렌더링 모델 — 고품질 Pro 이미지 모델. (Gemini 2.5 Pro 는 텍스트 전용이라 이미지 출력 불가 →
// 프로젝트가 쓰는 Pro 급 이미지 생성 모델을 사용.)
export const RENDER_MODEL = "gemini-3-pro-image-preview";

const ENHANCE_PROMPT = `이 배너/키비주얼 이미지의 퀄리티를 향상시켜 다시 렌더링하세요.

[절대 유지 — 최우선]
- 타이틀/로고의 글자(철자)·서체·위치·크기·각도를 한 픽셀도 변경하지 말 것. 텍스트를 다시 쓰거나(re-spelling) 옮기거나 키우지 말 것.
- 전체 구도·레이아웃·색상 계열·피사체 배치 유지.

[강화]
- 조명(림라이트·볼류메트릭·반사), 소재/질감 디테일, 대기 효과(빛 산란·파티클), 텍스트 글로우, 전체 선명도·명암 대비.

[허용]
- 서브카피와 날짜 텍스트의 '색상'만, 향상된 이미지 톤에 맞춰 가독성을 위해 조정 가능. (단, 글자 내용·위치·서체는 그대로.)

[금지]
- 새 요소 추가, 요소 재배치, 구도/색상 계열 변경, 타이틀 텍스트 내용·위치 변경.

고해상도의 완성도 높은 결과물로.`;

// 향상 이미지 직접 렌더 — 원본을 reference 로 주고 향상 프롬프트로 재생성. dataURL 반환.
export async function renderEnhanced(dataUrl, modelId = RENDER_MODEL) {
  const r = await renderWithImagen(ENHANCE_PROMPT, modelId, dataUrl);
  return r.dataUrl;
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    analysis: { type: "STRING" },
    prompts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { step: { type: "STRING" }, title: { type: "STRING" }, content: { type: "STRING" } },
        required: ["step", "title", "content"],
      },
    },
    tip: { type: "STRING" },
  },
  required: ["analysis", "prompts", "tip"],
};

const SAFETY = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

// dataUrl(또는 raw base64) + tool('gemini'|'gpt') → { analysis, prompts:[{step,title,content}], tip }
export async function analyzeForQuality(dataUrl, tool) {
  const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(dataUrl || "");
  const mimeType = m ? m[1] : "image/jpeg";
  const data = m ? m[2] : (dataUrl || "").split(",").pop();
  if (!data) throw new Error("이미지 데이터가 없습니다.");

  const toolName = tool === "gemini" ? "Gemini (Imagen / Nano Banana)" : "ChatGPT (GPT-4o 이미지 편집)";
  const toolRule = tool === "gemini"
    ? "Gemini는 2단계로 분리하세요: Step 1 = 타이틀 글자/위치·구도·색상·레이아웃을 절대 고정하라는 지시 프롬프트, Step 2 = 그 고정을 유지한 채 퀄리티 향상만 요청하는 프롬프트."
    : "ChatGPT는 금지 사항(타이틀 텍스트/위치 변경 금지, 구도·색상·레이아웃 변경 금지)을 맨 앞에 명시하고, 향상 항목을 번호 목록으로 정리한 한 개의 프롬프트로.";

  const prompt = `당신은 게임 배너·광고 이미지 전문 분석가이자 AI 이미지 생성 프롬프트 전문가입니다.
업로드된 배너 이미지를 분석하고 ${toolName}에 최적화된 "퀄리티 향상" 프롬프트를 생성하세요.

[분석 항목]
- 전체 구도/레이아웃(요소 배치·비율)
- 색상 팔레트·색온도(주조색·보조색)
- 조명 방향과 특성(림라이트·볼류메트릭·그림자)
- 타이틀/텍스트 위치·스타일
- 캐릭터/피사체 위치·실루엣
- 배경 구조(레이어·깊이감·원근)
- 현재 퀄리티가 부족한 영역

[프롬프트 조건]
- 타이틀/로고의 글자(철자)·서체·위치·크기를 절대 바꾸지 말도록 강하게 명시(텍스트 재작성·이동·확대 금지). 구도·레이아웃·색상 계열도 변경 금지.
- 단, 서브카피·날짜 텍스트의 '색상'만 향상된 이미지 톤에 맞춰 가독성 위해 조정 가능함을 명시(내용·위치·서체는 유지).
- 조명 강화, 소재 디테일, 대기 효과, 텍스트 글로우 등 "퀄리티 향상"에 집중.
- ${toolRule}
- 실제로 바로 붙여넣어 쓸 수 있는 형태로.

analysis 와 tip 은 한국어로, prompts[].content 는 해당 툴에 바로 입력하는 프롬프트 본문으로 작성하세요.`;

  const body = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data } }] }],
    generationConfig: { temperature: 0.4, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
    safetySettings: SAFETY,
  };

  const res = await fetch(geminiUrl(), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`);
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("응답이 비어 있습니다. (안전 필터 차단 의심)");

  let parsed;
  try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { throw new Error("응답 파싱 실패. 다시 시도해 주세요."); }

  return {
    analysis: String(parsed.analysis || ""),
    prompts: Array.isArray(parsed.prompts)
      ? parsed.prompts.map(p => ({ step: String(p.step || ""), title: String(p.title || ""), content: String(p.content || "") }))
      : [],
    tip: String(parsed.tip || ""),
  };
}
