import { GEMINI_API_KEY } from "../../../lib/gemini";

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

// Gemini 가 코드 펜스나 잡음을 끼워 보낼 수 있어 점진적으로 close-brace 위치를 조여가며 파싱.
export const parseJSON = (text) => {
  if (!text) return null;
  try { return JSON.parse(text); }
  catch (e) {
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startObj = clean.indexOf('{');
    const startArr = clean.indexOf('[');
    if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
      let end = clean.lastIndexOf('}');
      while (end > startObj) {
        try { return JSON.parse(clean.substring(startObj, end + 1)); }
        catch { end = clean.lastIndexOf('}', end - 1); }
      }
    } else if (startArr !== -1) {
      let end = clean.lastIndexOf(']');
      while (end > startArr) {
        try { return JSON.parse(clean.substring(startArr, end + 1)); }
        catch { end = clean.lastIndexOf(']', end - 1); }
      }
    }
    console.error("JSON Parsing Error:", e, text);
    throw new Error("응답 포맷을 읽을 수 없습니다.");
  }
};

const optionsContext = (appOptions) => JSON.stringify({
  materials: appOptions.materials.map(m => ({ id: m.id, desc: m.name })),
  frontReliefs: appOptions.frontReliefs.map(r => ({ id: r.id, desc: r.name })),
  dramaticTextures: appOptions.dramaticTextures.map(t => ({ id: t.id, desc: t.name })),
  energyCores: appOptions.energyCores.map(e => ({ id: e.id, desc: e.name })),
  rimColors: appOptions.rimColors.map(r => ({ id: r.id, desc: r.name })),
}, null, 2);

const reverseSchema = {
  type: "OBJECT",
  properties: {
    analysis_reasoning: { type: "STRING" },
    selected_options: {
      type: "OBJECT",
      properties: {
        material: { type: "STRING" }, surfaceDetail: { type: "STRING" },
        dramaticTex: { type: "STRING" }, wearLevel: { type: "STRING" },
        frontRelief: { type: "STRING" }, projectionDepth: { type: "STRING" },
        energyCore: { type: "STRING" }, enableVfx: { type: "BOOLEAN" },
        enableShadow: { type: "BOOLEAN" }, rimIntensity: { type: "STRING" },
        rimColor: { type: "STRING" },
      },
    },
    new_options: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING" }, id: { type: "STRING" },
          name: { type: "STRING" }, en: { type: "STRING" },
        },
      },
    },
    custom_intent: { type: "STRING" },
  },
};

// 레퍼런스 이미지 → 옵션 ID 매핑.
export async function analyzeReferenceImage(referenceImage, appOptions) {
  const base64Data = referenceImage.split(',')[1];
  const systemPrompt = `You are an expert 3D Typography Art Director.\nAnalyze the uploaded reference image of a typography logo. Map its visual characteristics to existing options.\n\nCRITICAL RULES FOR NEW OPTIONS:\n1. If the image features a unique material, dramatic texture, front relief, energy effect, OR a specific rim light color/saturation that CANNOT be accurately described by the existing options, you MUST invent a new option for it and include it in the "new_options" array.\n2. DO NOT EXAGGERATE. Be highly objective and precise. If rust or wear is subtle, describe it as subtle. DO NOT use highly weighted prompt tags like "(heavy bright orange rust:1.4)" unless the image is literally covered in it.\n3. DO NOT HALLUCINATE GEOMETRY. If the text has a simple bevel, do not invent "multi-layered stepped structures". Keep structural descriptions grounded.\n4. Pay close attention to the SATURATION of the rim light.\n\nExisting Options Context:\n${optionsContext(appOptions)}\n\nReturn a strict JSON matching this schema:\n${JSON.stringify(reverseSchema, null, 2)}`;
  const payload = {
    contents: [{ role: "user", parts: [
      { text: "Analyze this typography reference image and provide the JSON mapping." },
      { inlineData: { mimeType: "image/jpeg", data: base64Data } },
    ] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" },
  };
  const response = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? parseJSON(text) : null;
}

// 기존 프롬프트 텍스트 → 옵션 ID 역설계.
export async function analyzePromptText(promptText, appOptions) {
  const systemPrompt = `You are an expert 3D Typography Art Director.\nAnalyze the following text prompt that was used to generate a typography graphic.\nReverse-engineer the prompt and map its characteristics back to our system's existing options.\n\nCRITICAL RULES FOR NEW OPTIONS:\n1. If the prompt features a unique material/texture/relief/energy/rim-light that CANNOT be described by existing options, invent a new option in "new_options".\n2. DO NOT EXAGGERATE. Be highly objective.\n3. DO NOT USE prompt weighting like :1.4 or :1.3 in your generated "en" tags or "custom_intent" descriptions.\n\nExisting Options Context:\n${optionsContext(appOptions)}\n\nReturn a strict JSON matching this schema:\n${JSON.stringify(reverseSchema, null, 2)}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: `Analyze this prompt and provide the JSON mapping:\n\n${promptText}` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" },
  };
  const response = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? parseJSON(text) : null;
}

// 베이스 프롬프트 → 모델별 최적화 (en + 한국어 의도 분석 리포트).
export async function optimizePrompt({ aiModel, basePrompt, currentIntentText, isVfxPass, isOrthographic }) {
  const hasCustomIntent = !!(currentIntentText && currentIntentText.trim().length > 0);
  let systemPrompt = `You are a world-class AI Prompt Engineer and Technical Director.\nYour task is to optimize the given base prompt to STRICTLY enforce the user's rendering intent.`;
  if (isVfxPass) {
    systemPrompt += `\n\nCRITICAL MISSION 1 (STRICT MATTE PASS - ABSOLUTE PRIORITY): This is a VFX extraction pass. The typography MUST be a pure Vantablack (#000000) flat silhouette. It acts as an unlit holdout matte. You MUST forcefully prohibit any rim lights, edge highlights, 3D thickness, bevels, reflections, or surface details ON THE TEXT ITSELF. Use heavy negative weights.\nCRITICAL MISSION 2 (ENHANCE SURROUNDING FX): Enhance descriptive quality of surrounding glowing effects and the background canvas.`;
    if (hasCustomIntent) systemPrompt += `\nCRITICAL MISSION 3 (PRESERVE USER INTENT): The user provided a custom directive in Korean. Translate and integrate into English focusing ONLY on VFX/atmosphere. NEVER apply to text body material.`;
  } else {
    systemPrompt += `\n\nCRITICAL MISSION 1 (ANTI-DEEP-3D & RELIEF): If the base prompt indicates "minimal side thickness" or "zero deep rear extrusion", you MUST rewrite to destroy the AI's tendency to generate heavy 3D blocks. Use negative weights.\nReinforce the requested front relief. STRICTLY AVOID cheap "photoshop bevel and emboss" looks. Ensure it remains an ISOLATED typography graphic.`;
    if (hasCustomIntent) {
      systemPrompt += `\n\nCRITICAL MISSION 2 (PRESERVE USER INTENT): User provided a custom directive (Korean). Translate Korean into high-quality English tags and integrate. NEVER omit creative flavor.\n**CRITICAL**: If intent describes physical damage/wear/scratches/dents, include them as highly weighted positive tags. Do NOT smooth them out!`;
    } else {
      systemPrompt += `\n\nCRITICAL MISSION 2 (ENHANCE EXISTING THEME): No custom directive. Refine the existing descriptive tags based on persona/materials. Do NOT invent new features or claim user requested them.`;
    }
  }
  const koInstruction = hasCustomIntent
    ? `"ko": A detailed Korean explanation (2-3 sentences) explaining exactly how the user's specific Korean intent was translated into the English tags.`
    : `"ko": A detailed Korean explanation (2-3 sentences) explaining how the selected theme and parameters were optimized. CRITICAL: DO NOT say "사용자의 요청을 반영하여" or "요청하신 대로". Just explain what was optimized.`;
  systemPrompt += `\n\nMaintain the model's syntax (e.g., NanoBanana uses tags + Negative prompt).\nOutput JSON with exactly two keys:\n"en": The heavily optimized prompt string in English.\n${koInstruction}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: `Model Type: ${aiModel}\nIs Ultra-Thin Required: ${isOrthographic}\nIs VFX Matte Pass: ${isVfxPass}\nOriginal Custom Intent: ${currentIntentText || "None"}\nBase Prompt to optimize:\n${basePrompt}` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { en: { type: "STRING" }, ko: { type: "STRING" } },
        required: ["en", "ko"],
      },
    },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? parseJSON(text) : null;
}

// 한 줄 키워드 → 시네마틱 묘사로 자동 확장.
export async function expandIntent(text, isCreationMode) {
  const systemPrompt = isCreationMode
    ? `You are an elite cinematic prompt engineer. Expand the user's short keyword into a detailed, dramatic visual description for typography. Focus on inner material properties and micro-details. DO NOT describe background scenery. Keep it under 3 sentences in Korean.`
    : `You are a cinematic prompt engineer for Image-to-Image remixing. Expand the keyword into a detailed visual description. Localized effects MUST be tightly wrapped around the main subject. DO NOT alter the main object's core shape. Keep it under 3 sentences in Korean.`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: `Expand this concept in Korean: "${text}"` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// 대화형 튜닝룸 응답: { message, updated_intent }.
export async function chatTuningMessage(messages) {
  const systemPrompt = `당신은 시네마틱 3D 아트 디렉터입니다. 사용자의 피드백을 반영하여 아이디어를 수정/보완하세요.\n[제약조건]: 타이포그래피 내부 재질이나 표면 이펙트에 한정할 것. 형태 변형 금지. 배경 풍경 묘사 금지.\n반드시 다음 JSON 형식으로 응답:\n{ "message": "사용자에게 하는 친절한 응답", "updated_intent": "수정된 최종 3문장 이내 한글 묘사" }`;
  const payload = {
    contents: messages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { message: { type: "STRING" }, updated_intent: { type: "STRING" } },
        required: ["message", "updated_intent"],
      },
    },
  };
  const result = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? parseJSON(text) : null;
}

// PromptArc 에서 payload 로 넘어온 이미지의 추천 옵션 분석.
// 직접 fetch (재시도 없이) + AbortController 로 30초 타임아웃.
export async function analyzeArcImage(base64Data, appOptions, tags = [], text = "") {
  if (!GEMINI_API_KEY) throw new Error('Gemini API 키가 설정되지 않았습니다.');
  const matIds = appOptions.materials.map(o => o.id).join(', ');
  const reliefIds = appOptions.frontReliefs.map(o => o.id).join(', ');
  const surfIds = appOptions.surfaceTreatments.map(o => o.id).join(', ');
  const bgIds = appOptions.backgrounds.map(o => o.id).join(', ');
  const fxIds = appOptions.energyCores.map(o => o.id).join(', ');
  const detailIds = appOptions.surfaceDetails.map(o => o.id).join(', ');
  const sysPrompt = `이 이미지의 시각 스타일을 분석해서 어울리는 입체화 옵션을 추천하세요.\n반드시 아래 ID 목록 중에서 한 개씩만 골라 JSON으로 반환 (코드블록·설명 금지):\n- material: ${matIds}\n- frontRelief: ${reliefIds}\n- surfaceTreatment: ${surfIds}\n- background: ${bgIds}\n- energyCore: ${fxIds}\n- surfaceDetail: ${detailIds}\n\n참고 태그/프롬프트: ${tags.join(', ') || '(none)'}\n${text ? '추가 설명: ' + text : ''}\n\n출력 형식:\n{ "summary": "한 문장 한국어 설명 (왜 이 조합인지)", "material":"...", "frontRelief":"...", "surfaceTreatment":"...", "background":"...", "energyCore":"...", "surfaceDetail":"..." }`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error("Gemini timeout 30s")), 30000);
  try {
    const resp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: sysPrompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        ] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
    const json = await resp.json();
    const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('빈 응답');
    return JSON.parse(txt);
  } finally { clearTimeout(t); }
}
