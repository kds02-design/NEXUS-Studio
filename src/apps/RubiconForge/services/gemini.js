// RubiconForge Gemini 호출부 + 공용 유틸.
// 원본 index.jsx 의 fetchWithRetry 와 인라인 fetch 들을 모아 둔 서비스 레이어.
// 비지니스 로직 변경 없음 - 단순히 함수 시그니처와 위치만 정리.

import { GEMINI_API_KEY } from "../../../lib/gemini";

export { GEMINI_API_KEY };

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 5단계 지수백오프 재시도 (1·2·4·8·16초). HTTP 응답 자체는 JSON으로 파싱해 반환.
export const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

// 영어 프롬프트 → 한국어 의도 설명.
export async function translatePrompt(englishText) {
  const payload = {
    contents: [{ role: "user", parts: [{ text: `Explain this prompt in Korean: ${englishText}` }] }],
    systemInstruction: { parts: [{ text: "전문 프로모션 아트 디렉터로서 영어 프롬프트를 실무적인 한국어로 설명하십시오." }] },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// 기본 컴포넌트 스펙 → 최적화된 단일 프롬프트.
export async function optimizeComponentPrompt(currentBase) {
  const systemPrompt = `You are a world-class campaign visual prompt engineer. Refine this spec into a perfect prompt. CRITICAL RULES: 1. STRUCTURAL PROMO COMPONENT. 2. Focus on SLOT STRUCTURE and TEXT SAFE ZONES. 3. Strict background rules (zero light bleed for isolated). 4. NO TEXT IN THE MIDDLE. 5. ONLY the prompt text.`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: `Refine this Component Architecture spec: ${currentBase}` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// 한 줄 키워드 → 세련된 캠페인 묘사로 확장.
export async function expandIntent(userIntent, assetType, themeDna) {
  const systemPrompt = `You are an elite campaign visual designer. The user will provide a short concept/keyword for a promotional ${assetType}. Expand it into a detailed visual description for a ${themeDna} style banner asset. Korean, under 3 sentences.`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: `Expand this campaign visual concept in Korean: "${userIntent}"` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// 키워드 + 페르소나/타입 → 옵션 ID 자동 셋업.
export async function keywordOptionSetup(userIntent, themeDna, assetType, validIds) {
  const systemPrompt = `Configure the BEST matching parameter IDs for a ${themeDna} style ${assetType}. STRICTLY select ONLY from these lists.\nAvailable IDs:\n${Object.entries(validIds).map(([k,v]) => `- ${k}: [${v}]`).join('\n')}\nOutput MUST be a pure JSON object containing exactly these keys.`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: `Suggest the best setting IDs for this concept: "${userIntent}". Persona: ${themeDna}, type: ${assetType}.` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
}

// 튜닝룸 대화 한 턴 응답: { message, updated_intent }.
export async function chatTuningMessage(messages, tempIntent) {
  const systemPrompt = `당신은 웹 캠페인 비주얼 아트 디렉터입니다. [현재 아이디어]: ${tempIntent}\nJSON으로 응답: {"message": "친절한 설명", "updated_intent": "수정된 한글 묘사"}`;
  const payload = {
    contents: messages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
}

// 스타일 레퍼런스 이미지 → 옵션 ID 자동 추출.
export async function analyzeStyleImage(styleImage, assetType, themeDna) {
  const systemPrompt = `Analyze ONLY visual style of provided promotional ${assetType}. Persona: ${themeDna}. Output ONLY JSON: {surfaceTreatment, material, dramaticTex, rimColor, rimMaterial, rimThickness, buttonShape, textSafeZone, buttonDeco, shapeDistortion, energyCore}.`;
  const payload = {
    contents: [{ role: "user", parts: [
      { text: `Analyze this campaign asset style.` },
      { inlineData: { mimeType: "image/png", data: styleImage.split(',')[1] } },
    ] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
}

// 벡터 생성 — Gemini 텍스트 모델이 <svg> 마크업을 직접 출력. 원시 텍스트 반환(정제는 호출부).
// temperature 를 높여 변형 간 다양성 확보.
export async function generateVectorSvg({ system, user }) {
  const payload = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { temperature: 0.95, topP: 0.95 },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// 프로모션 에셋 명세 → 캠페인 카피/분위기 텍스트.
export async function generateLore(finalOutput) {
  const payload = {
    contents: [{ role: "user", parts: [{ text: `이 프로모션 에셋 명세서를 바탕으로, 매력적인 [캠페인 타이틀]과 2문장짜리 [분위기 설명]을 작성해 줘.\n${finalOutput}` }] }],
    systemInstruction: { parts: [{ text: "당신은 프로모션 브랜드 카피라이터입니다." }] },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
