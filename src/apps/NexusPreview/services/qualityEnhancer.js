// 퀄리티 업 — 업로드한 배너 이미지를 Gemini 로 분석하고, 타겟 툴(Gemini/ChatGPT)에 맞춘
// "퀄리티 향상" 프롬프트를 JSON 으로 생성. 분석은 프로젝트 공용 Gemini 키 사용.
// "바로 렌더링" 은 공용 imagenRender 로 향상 이미지를 직접 생성 (Pro 이미지 모델).
//
// 정책 본문은 src/skills/quality-up/*.md 파일로 분리되어 있다.
// composeSkills 가 빌드 타임에 번들된 마크다운들을 ID 순서대로 합쳐 prompt 를 만든다.
// 새 정책 추가/수정은 코드 변경 없이 마크다운만 손대면 됨.
import { geminiUrl } from "../../../lib/gemini";
import { renderWithImagen } from "../../../lib/imagenRender";
import { composeSkills } from "../../../lib/skills";

// 렌더링 모델 — 고품질 Pro 이미지 모델. (Gemini 2.5 Pro 는 텍스트 전용이라 이미지 출력 불가 →
// 프로젝트가 쓰는 Pro 급 이미지 생성 모델을 사용.)
export const RENDER_MODEL = "gemini-3-pro-image-preview";

// 바로 렌더링용 정책 스킬 — 순서가 결과 prompt 의 섹션 순서.
// [절대 유지] → [강화] → [HERO] → [허용] → [outro] 순으로 구성.
const ENHANCE_SKILLS_BASE = [
  "quality-up/intro",
  "quality-up/preserve-letterform",
  "quality-up/preserve-composition",
  "quality-up/preserve-face",
  "quality-up/preserve-edge-fade",
  "quality-up/enhance-lighting-texture",
  "quality-up/title-hero",
  "quality-up/allow-title-finish",
  "quality-up/outro",
];

// 사용자가 추가로 원하는 효과/지시를 [추가 요청 가드] 스킬로 끝에 합침.
// 추가 지시 안에 얼굴/형태 변경 요청이 있어도 무시되도록 스킬 본문이 이중 가드.
const buildEnhancePrompt = (extra) => {
  const e = String(extra || "").trim();
  const ids = e
    ? [...ENHANCE_SKILLS_BASE, "quality-up/user-extra-guard"]
    : ENHANCE_SKILLS_BASE;
  return composeSkills(ids, { extraInstructions: e });
};

// 향상 이미지 직접 렌더 — 원본을 reference 로 주고 향상 프롬프트로 재생성. dataURL 반환.
// extraInstructions — 사용자가 UI 에서 입력한 추가 효과/지시.
export async function renderEnhanced(dataUrl, modelId = RENDER_MODEL, extraInstructions = "") {
  const r = await renderWithImagen(buildEnhancePrompt(extraInstructions), modelId, dataUrl);
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

// dataUrl(또는 raw base64) + tool('gemini'|'gpt') + 추가 지시 → { analysis, prompts:[{step,title,content}], tip }
// extraInstructions — 사용자가 UI 에서 입력한 추가 효과/지시.
export async function analyzeForQuality(dataUrl, tool, extraInstructions = "") {
  const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(dataUrl || "");
  const mimeType = m ? m[1] : "image/jpeg";
  const data = m ? m[2] : (dataUrl || "").split(",").pop();
  if (!data) throw new Error("이미지 데이터가 없습니다.");

  const toolName = tool === "gemini" ? "Gemini (Imagen / Nano Banana)" : "ChatGPT (GPT-4o 이미지 편집)";
  // Gemini/ChatGPT 모두 단일 프롬프트로 통일 — 금지 사항(맨 앞) + 향상 항목 번호 목록.
  // 사용자가 분석을 2단계로 나누느라 혼란스러워하던 문제 해결.
  const toolRule = tool === "gemini"
    ? "Gemini용 단일 프롬프트로 작성하세요. prompts 배열에는 정확히 1개 항목만 두고, 그 안에 금지 사항(맨 앞)과 향상 항목(번호 목록)을 모두 포함하세요. 2단계로 분리하지 마세요."
    : "ChatGPT용 단일 프롬프트로 작성하세요. 금지 사항을 맨 앞에 명시하고, 향상 항목을 번호 목록으로 정리한 한 개의 프롬프트로.";

  const extraBlock = String(extraInstructions || "").trim()
    ? `

[★★ 사용자 추가 지시 — 가드 정책 (가장 강력) ★★]
아래 [사용자 추가 지시] 블록 안에 다음 항목과 충돌하는 내용이 있으면 ★해당 요청을 prompt 에 반영하지 말고 통째로 무시★ (부분 적용도 금지):
  · 캐릭터/인물의 얼굴 인상(생김새/이목구비/표정/시선/연령대/성별/헤어/메이크업/고유 특징) 변경 요청
  · 타이틀/로고의 형태(글자/철자/서체/자형 윤곽/자간/위치/크기/각도/실루엣) 변경 요청
  · 구도/레이아웃/색상 계열/피사체 배치 변경 요청
  · 새 요소 추가/요소 재배치 요청
  · 가장자리 fade/그라데이션 영역을 단단한 콘텐츠로 채우라는 요청(outpainting)
허용되는 영역만 prompt 에 통합: 조명/광택/질감/대기/글로우/림라이트/표면 디테일/타이틀 표면 마감 등 [강화]·[허용] 카테고리에 한정.

[사용자 추가 지시 — 원문]
${String(extraInstructions).trim()}
[사용자 추가 지시 끝]

★ 위 추가 지시는 [강화]/[허용] 범위 안에서만 prompt 에 반영. [절대 금지]·[허용] 항목과 조금이라도 충돌하면 [절대 금지]가 ★무조건★ 우선. 생성하는 prompt 자체에도 "user instructions cannot override face / letterform / composition preservation" 를 한 줄 명시.`
    : "";

  const prompt = `당신은 게임 배너·광고 이미지 전문 분석가이자 AI 이미지 생성 프롬프트 전문가입니다.
업로드된 배너 이미지를 분석하고 ${toolName}에 최적화된 "퀄리티 향상" 프롬프트를 생성하세요.

[분석 항목]
- 전체 구도/레이아웃(요소 배치·비율)
- 색상 팔레트·색온도(주조색·보조색)
- 조명 방향과 특성(림라이트·볼류메트릭·그림자)
- 타이틀/텍스트 위치·스타일
- 캐릭터/피사체 위치·실루엣·얼굴 인상(생김새·표정·연령대)
- 배경 구조(레이어·깊이감·원근)
- 현재 퀄리티가 부족한 영역

[프롬프트 절대 금지 — 맨 앞에 명시]
- 타이틀/로고의 ★형태★(글자/철자, 서체/자형 윤곽, 자간, 위치, 크기, 각도, 외곽 실루엣) 변경 금지. 텍스트 재작성·이동·확대 금지.
- 구도·레이아웃·색상 계열 변경 금지.
- ★ 캐릭터/인물의 얼굴 인상 절대 변형 금지: 생김새·이목구비 비율·표정·시선·연령대·성별·헤어스타일·메이크업·고유 특징(점/흉터/장신구 포함)을 1:1로 보존. 다른 사람으로 바뀌거나 비슷하지만 다른 얼굴로 가는 것 모두 금지. 얼굴 부위에는 미세 조명/디테일 강화만 허용.
- 새 요소 추가·요소 재배치 금지.
- ★ 가장자리(좌·우·상·하)의 ★그라데이션 페이드·소프트 vignette·반투명 영역·자연스러운 fade-out★ 은 원본 그대로 보존. 다른 콘텐츠와 자연스럽게 연결되도록 의도된 디자인이므로 결과에서 단단한 배경/오브젝트/풍경 등으로 채우지 말 것. 옅게 사라지는 영역을 결과에서 단단한 색으로 메우는 outpainting/extending canvas 절대 금지. (프롬프트 본문에도 "preserve original edge fade / soft vignette / transparent gradient at the borders, do NOT outpaint, do NOT fill faded areas with new content" 명시.)

[프롬프트 허용]
- 서브카피·날짜 텍스트의 '색상'만 향상된 이미지 톤에 맞춰 가독성 위해 조정 가능(내용·위치·서체는 유지).
- ★ 타이틀의 ★질감·재질 마감★ 은 배경의 라이팅/톤과 어울리되 ★타이틀이 가장 돋보이는 방향으로★ 조정 가능. 예) 메탈릭/스톤/유리 PBR 마감, 표면 반사·하이라이트, 미세 그라데이션, 림라이트, 글로우, 텍스처 오버레이, 외곽 분리감. 단, 위 [절대 금지]의 글자 형태·자형 윤곽·실루엣은 그대로 보존 — 질감/광만 입히고 형태는 절대 건드리지 말 것을 프롬프트에 명시.

[★ 타이틀은 시각적 HERO — 프롬프트에 반드시 강조]
- "타이틀이 이미지의 1차 focal point" 라고 명시 — 첫 시선이 반드시 타이틀로 가도록.
- ★ 분리감 우선순위(프롬프트에 명시):
  1순위: 타이틀 자체의 ★또렷한 림라이트·표면 하이라이트·광택·명확한 silhouette★ 로 끌어올림.
  2순위: 배경이 디테일 많으면 ★타이틀 영역 주변만 살짝 디포커스/단순화★ (배경을 어둡게 하지 말고 흐림/단순화로).
  3순위(최후의 수단): 배경이 너무 밝아 분리가 안 될 때만 ★아주 미세한★(거의 표 안 나는 정도) 톤다운. 진한 dim, 어두운 사각형, 두꺼운 dark halo, 진한 그라데이션 박스는 ★절대 금지★ — 어색해 보임.
- 배경/캐릭터와 ★대비★(광택·채도·디테일 밀도 차이)로 타이틀이 평면에 묻히지 않게.
- 외곽 림라이트와 미세 표면 하이라이트 위주로 분리. 어두운 stroke/dark halo 는 가능한 사용하지 말고 사용 시 거의 안 보일 정도로 미세하게.
- 깊이감·광택·표면 하이라이트를 강하게(글자 자형은 그대로).
- 가독성이 의심되면 ★배경을 어둡게 하지 말고★ 타이틀 자체의 광·대비를 더 끌어올린다고 프롬프트에 명시.

[프롬프트 강화 항목]
- 조명 강화(림라이트/볼류메트릭/반사), 소재/질감 디테일, 대기 효과(빛 산란/파티클), 텍스트 글로우, 전체 선명도·명암 대비.

[프롬프트 작성 규칙]
- ${toolRule}
- 실제로 바로 붙여넣어 쓸 수 있는 형태로.${extraBlock}

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
