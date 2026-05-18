import { GEMINI_API_KEY } from '../../../lib/gemini';

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const extractJson = (text) => {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start, end;
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      start = firstBracket; end = cleaned.lastIndexOf(']');
    } else if (firstBrace !== -1) {
      start = firstBrace; end = cleaned.lastIndexOf('}');
    } else {
      throw new Error("No JSON structure found");
    }
    const jsonStr = cleaned.substring(start, end + 1);
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch (e) { return {}; }
};

const callGemini = async ({ systemPrompt, userText, imageData, mimeType, temperature = 0.7, jsonResponse = true }) => {
  const parts = [{ text: userText }];
  if (imageData && mimeType) parts.push({ inlineData: { mimeType, data: imageData } });
  const body = {
    contents: [{ parts }],
    ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
    generationConfig: {
      ...(jsonResponse ? { responseMimeType: "application/json" } : {}),
      temperature
    }
  };
  const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

export const auditPromptLogic = async (currentStateStr) => {
  const systemPrompt = `Act as an Elite Typography Logic Auditor. Find and fix contradictions in the user's prompt configuration.
CRITICAL RULE: The engine enforces STRICT 2D FLAT (unless 3D Extruded is picked or requested).
Return JSON strictly: {
  "auditLog": "발견된 충돌 사항과 논리적 교정 내역 요약 (Korean, 1-2 lines. e.g. '3D 키워드를 감지하여 내부 질감을 3D 입체로 변경했습니다.')",
  "fixedAura": "Cleaned Aura string",
  "fixedOptions": { "stemWeight": "...", "terminalStyle": "...", "strokeTexture": "...", "strokeSharpness": "...", "rhythmDynamic": "...", "playfulDistortion": "...", "internalDecoration": "..." }
}`;
  const text = await callGemini({ systemPrompt, userText: "Audit:\n" + currentStateStr, temperature: 0.2 });
  return extractJson(text);
};

export const recommendStyle = async ({ persona, sliderText, inputText, customDesignInjections }) => {
  const prompt = `Act as an Elite Art Director for a Casual and Calligraphy typography project.
[YOUR PERSONA]: ${persona.role}
[CURRENT SUB-TRAIT FOCUS]: ${sliderText}
[USER INPUT]: Text: "${inputText}"
[DETAILED DESIGN INTENT / AURA]: "${customDesignInjections || "None"}"
IMPORTANT: You must create ENTIRELY NEW CUSTOM OPTIONS that perfectly manifest the user's aura.
Return JSON: {
  "summary": { "title": "한글 제목", "reason": "추천 사유" },
  "setStyle": { "id": "...", "name": "...", "en": "..." },
  "setWeight": { "id": "...", "name": "...", "en": "..." },
  "setTerminal": { "id": "...", "name": "...", "en": "..." },
  "setTexture": { "id": "...", "name": "...", "en": "..." },
  "setRhythm": { "id": "...", "name": "...", "en": "..." },
  "setSharpness": { "id": "...", "name": "...", "en": "..." },
  "setKerning": { "id": "...", "name": "...", "en": "..." }
}`;
  const text = await callGemini({ userText: prompt, temperature: 0.7 });
  return extractJson(text);
};

export const analyzeStyleImage = async (styleImage) => {
  const base64Data = styleImage.split(',')[1];
  const mimeType = styleImage.split(';')[0].split(':')[1];
  const prompt = `Act as an Elite Typography Art Director. Analyze the typography style in the provided image.
[CRITICAL INSTRUCTION]: Extract visual characteristics (texture, rhythm, thickness, 3D effect, border, terminal shapes) and generate a detailed design direction.
Return JSON strictly in this format:
{
  "aura": "Detailed 2-3 sentence description in Korean.",
  "setStyle": { "id": "New_Style_ID", "name": "Style Name (KR)", "en": "English description" },
  "setWeight": { "id": "New_Weight_ID", "name": "Weight Name (KR)", "en": "English description" },
  "setTexture": { "id": "New_Tex_ID", "name": "Texture Name (KR)", "en": "English description" },
  "setTerminal": { "id": "New_Term_ID", "name": "Terminal Name (KR)", "en": "English description" },
  "setRhythm": { "id": "New_Rhythm_ID", "name": "Rhythm Name (KR)", "en": "English description" }
}`;
  const text = await callGemini({ userText: prompt, imageData: base64Data, mimeType, temperature: 0.7 });
  return extractJson(text);
};

export const sendTuningMessage = async ({ personaRole, currentAura, userMsg }) => {
  const systemPrompt = `You are a Typography Art Director. Task: Update the [Current Aura] to reflect the [User Request]. Write a short, friendly reply in Korean. Return JSON strictly: { "newAura": "...", "replyMessage": "..." }`;
  const text = await callGemini({ systemPrompt, userText: `Persona: ${personaRole}\nCurrent: ${currentAura}\nUser: ${userMsg}`, temperature: 0.7 });
  return extractJson(text);
};

export const sendEditTuningMessage = async ({ currentAura, userMsg }) => {
  const systemPrompt = `You are an Elite Typography Editor. Task: Update the [Current Edit Direction] integrating the user's request. Maintain a professional tone. Return JSON strictly: { "newAura": "...", "replyMessage": "..." }`;
  const text = await callGemini({ systemPrompt, userText: `Current: ${currentAura}\nUser: ${userMsg}`, temperature: 0.7 });
  return extractJson(text);
};

export const expandIntent = async (text) => {
  const systemPrompt = `Expand the user's keyword into a detailed, professional morphological design direction for Casual/Calligraphy typography. Return ONLY the expanded text in Korean. (2-3 sentences max).`;
  return await callGemini({ systemPrompt, userText: text, temperature: 0.7, jsonResponse: false });
};

export const expandEditIntent = async (text) => {
  const systemPrompt = `Expand the user's short edit keyword into a detailed, structural Image-to-Image morphological edit instruction. Return only the expanded text in Korean.`;
  return await callGemini({ systemPrompt, userText: text, temperature: 0.7, jsonResponse: false });
};

export const generateDramaticPrompt = async (baseTechnicalEn) => {
  const systemPrompt = `You are a visionary Art Director for "Nano Banana 2".
Return STRICTLY a JSON object in this format:
{
  "en": "1. # ARTISTIC FLOW & VIBE\\n2. # STROKE & TEXTURE ANATOMY\\n3. # THE PLAYFUL BOUNDARY\\n4. # THE SUPREME COMMAND: (Consolidated english prompt)",
  "ko": "1. # 예술적 흐름과 분위기\\n(위 영문 1번에 대한 번역)\\n2. # 획과 텍스처 해부학\\n(위 영문 2번에 대한 번역)\\n3. # 조형의 경계\\n(위 영문 3번에 대한 번역)\\n4. # 최고 명령어: (위 영문 4번 최종 프롬프트에 대한 한글 번역)"
}`;
  const text = await callGemini({ systemPrompt, userText: baseTechnicalEn, temperature: 0.7 });
  return extractJson(text);
};

export const generateEditDramaticPrompt = async (baseTechnicalEn) => {
  const systemPrompt = `You are an Elite Typography Editor specializing in Surgical Micro-Edits for Nano Banana 2.
Return STRICTLY a JSON object in this format:
{
  "en": "1. # STRUCTURAL PRESERVATION\\n2. # MICRO-EDIT TARGET: (English description)\\n3. # THE SUPREME COMMAND: (Consolidated english I2I prompt)",
  "ko": "1. # 구조적 보존\\n(위 1번 한글 설명)\\n2. # 마이크로 에디팅 타겟: (변경점에 대한 명확한 한글 설명)\\n3. # 최고 명령어: (영문 3번 프롬프트의 한글 번역)"
}`;
  const text = await callGemini({ systemPrompt, userText: baseTechnicalEn, temperature: 0.7 });
  return extractJson(text);
};

export const generateOptimizedTags = async (baseTechnicalEn) => {
  const systemPrompt = `Convert the specs into a dense comma-separated tag string for Nano Banana. Add ::2 weights to key features.
Return STRICTLY a JSON object in this format:
{
  "en": "<comma-separated English tag string>",
  "ko": "<위 영문 태그들을 사용자가 직관적으로 이해할 수 있도록 한글 단어 태그로 번역한 문자열>"
}`;
  const text = await callGemini({ systemPrompt, userText: baseTechnicalEn, temperature: 0.2 });
  return extractJson(text);
};

export const generateMidjourneyPrompt = async (baseTechnicalEn) => {
  const systemPrompt = `Convert specs into Midjourney V6 tag string.
Return STRICTLY a JSON object in this format:
{
  "en": "<Midjourney prompt in English>",
  "ko": "<Midjourney prompt translated into descriptive Korean for user understanding>"
}`;
  const text = await callGemini({ systemPrompt, userText: baseTechnicalEn, temperature: 0.2 });
  return extractJson(text);
};

export const generateChatGPTPrompt = async (baseTechnicalEn) => {
  const systemPrompt = `Create DALL-E 3 instructions for this casual typography prompt.
Return STRICTLY a JSON object in this format:
{
  "en": "<DALL-E 3 instructions in English>",
  "ko": "<DALL-E 3 instructions translated to Korean>"
}`;
  const text = await callGemini({ systemPrompt, userText: baseTechnicalEn, temperature: 0.7 });
  return extractJson(text);
};
