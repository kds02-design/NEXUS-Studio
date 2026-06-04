// Pop 전용 Gemini API 호출.
// 모델은 RenderMatrix 와 달리 `gemini-2.5-flash` 를 사용.
// 키는 공용 VITE_GEMINI_API_KEY — 이전에 빈 문자열 하드코딩이라 레퍼런스 분석/프롬프트 역설계가 401 로 실패했음.
import { GEMINI_API_KEY } from "../../../lib/gemini";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// fetchWithRetry + parseJSON 은 RenderMatrix 와 100% 동일 — import 후 re-export.
import { fetchWithRetry, parseJSON } from "../../RenderMatrix/services/gemini";
export { fetchWithRetry, parseJSON };

const optionsContext = (appOptions) => JSON.stringify({
  materials: appOptions.materials.map(m => ({ id: m.id, desc: m.name })),
  frontReliefs: appOptions.frontReliefs.map(r => ({ id: r.id, desc: r.name })),
  dramaticTextures: appOptions.dramaticTextures.map(t => ({ id: t.id, desc: t.name })),
  energyCores: appOptions.energyCores.map(e => ({ id: e.id, desc: e.name })),
  rimColors: appOptions.rimColors.map(r => ({ id: r.id, desc: r.name })),
}, null, 2);

// 레퍼런스 이미지 → 옵션 ID 매핑 (Pop 은 directorPersona 까지 추천).
export async function analyzeReferenceImage(referenceImage, appOptions) {
  const base64Data = referenceImage.split(',')[1];
  const systemPrompt = `You are an expert 3D Typography Art Director.\nAnalyze the uploaded reference image of a typography logo.\nYour primary goal is to provide parameters that will perfectly COPY this image's aesthetic.\n\n[STEP 0 — CRITICAL: 2D vs 3D dimensional read]\nFirst decide whether the reference is essentially a FLAT 2D graphic (distressed paint, grunge brush, screen-print, sticker, comic ink, posterized illustration with NO real depth) OR a TRUE 3D rendered object (visible bevel/extrusion/relief, AAA game logo, sculpted depth, cinematic shading).\nSignals for "is2DFlat: true":\n  - No carved depth / extrusion is visible. The letters sit FLAT on the canvas.\n  - Textures are surface paint, grunge, distressed scratches, halftone, screen-print — NOT carved material.\n  - Lighting is uniform / graphic — NOT volumetric (no real cast shadows, no rim that wraps around 3D forms).\n  - Reads like a movie poster title / streetwear / poster art / comic / screen-print, not like a rendered AAA logo.\nWhen is2DFlat=true you MUST:\n  - editBudget = "SilhouetteTrace"  (2D shape preserved, no 3D extrusion)\n  - frontRelief = "Flat"\n  - projectionDepth = "None"\n  - directorPersona = "Chameleon"\n  - material should describe the SURFACE TREATMENT (grunge paint, distressed ink, screen-print) NOT a 3D material like HyperChrome. If existing options don't have a matching flat/painted material, INVENT one via new_options (category: materials).\n  - enableShadow = false  (avoid drop shadows that fake depth)\n  - surfaceDetail = "High" or "Standard"  NEVER "Clean" (Clean adds "flawless polished uniform" which kills the distressed surface).\n  - dramaticTex MUST NOT be "None" (None means "flawless polished uniform material" — opposite of distressed). Either pick "AncientErosion"/"ExplosiveFracture" if grunge cracks are visible, OR invent a new dramaticTextures option via new_options describing the EXACT distressed surface treatment (e.g. "DistressedBrushPaint", "ScreenPrintGrunge", "InkSplatterTexture") and put its id into selected_options.dramaticTex.\n  - wearLevel MUST NOT be "None"/Pristine. Use "MicroScratches", "TimeWorn", or "BattleDamage" depending on how worn the reference looks.\nWhen is2DFlat=false (true 3D): pick frontRelief/projectionDepth that match the visible depth. editBudget = "StyleTransfer" (preserve form, copy material/lighting).\n\n[STEP 1 — option mapping]\nIf the image features a unique material, dramatic texture, front relief, energy effect, OR a specific rim light color/saturation that CANNOT be accurately described by the existing options, you MUST invent a new option for it and include it in the "new_options" array. Pay close attention to the SATURATION of the rim light (e.g., is it muted, pale, or vibrant neon?).\n\nExisting Options Context:\n${optionsContext(appOptions)}\n\nReturn a strict JSON matching this schema:\n{\n    "type": "OBJECT",\n    "properties": {\n        "analysis_reasoning": { "type": "STRING", "description": "Brief reasoning in Korean. MUST explicitly state whether the reference is 2D flat or 3D and why." },\n        "is2DFlat": { "type": "BOOLEAN", "description": "True if the reference is essentially a flat 2D graphic (poster/grunge/screen-print) with NO 3D depth." },\n        "selected_options": {\n            "type": "OBJECT",\n            "properties": {\n                "directorPersona": { "type": "STRING", "description": "Should usually be 'Chameleon' to enforce exact style match, unless a very specific vibe is needed." },\n                "editBudget": { "type": "STRING", "description": "SilhouetteTrace | StyleTransfer | Locked | Conservative | Expressive. Use SilhouetteTrace when is2DFlat=true." },\n                "material": { "type": "STRING" },\n                "surfaceDetail": { "type": "STRING" },\n                "dramaticTex": { "type": "STRING" },\n                "wearLevel": { "type": "STRING" },\n                "frontRelief": { "type": "STRING", "description": "Flat for 2D references; otherwise match the visible relief." },\n                "projectionDepth": { "type": "STRING", "description": "None, Shallow, Block, Monumental. None for 2D references." },\n                "energyCore": { "type": "STRING" },\n                "enableVfx": { "type": "BOOLEAN" },\n                "enableShadow": { "type": "BOOLEAN" },\n                "rimIntensity": { "type": "STRING", "description": "Subtle, Moderate, Strong" },\n                "rimColor": { "type": "STRING", "description": "The ID of the best matching rim color, taking saturation into account." }\n            }\n        },\n        "new_options": {\n            "type": "ARRAY",\n            "description": "Any completely new options that need to be injected because existing ones fail to describe the reference.",\n            "items": {\n                "type": "OBJECT",\n                "properties": {\n                    "category": { "type": "STRING", "description": "MUST BE EXACTLY ONE OF: materials, frontReliefs, dramaticTextures, energyCores, rimColors" },\n                    "id": { "type": "STRING", "description": "CamelCase ID, e.g. MutedEmerald" },\n                    "name": { "type": "STRING", "description": "Korean short name, e.g. 뮤트 에메랄드" },\n                    "en": { "type": "STRING", "description": "Detailed English prompt tag for rendering" }\n                }\n            }\n        },\n        "custom_intent": { "type": "STRING", "description": "Specific visual vibe or lighting summary in Korean to put in the Custom Directive text box. For 2D references, explicitly state 'flat 2D graphic, no 3D extrusion, preserve distressed surface'." }\n    }\n}`;
  const payload = {
    contents: [{ role: "user", parts: [
      { text: "Analyze this typography reference image and provide the JSON mapping for an exact style transfer/copy." },
      { inlineData: { mimeType: "image/jpeg", data: base64Data } },
    ] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" },
  };
  const response = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? parseJSON(text) : null;
}

// 프롬프트 텍스트 역설계.
export async function analyzePromptText(promptText, appOptions) {
  const systemPrompt = `You are an expert 3D Typography Art Director.\nAnalyze the following text prompt that was used to generate a typography graphic.\nReverse-engineer the prompt and map its characteristics back to our system's existing options.\n\nCRITICAL: If the prompt features a unique material, dramatic texture, front relief, energy effect, OR a specific rim light color/saturation that CANNOT be accurately described by the existing options, you MUST invent a new option for it and include it in the "new_options" array.\n\nExisting Options Context:\n${optionsContext(appOptions)}\n\nReturn a strict JSON matching this schema (selected_options includes the same keys minus directorPersona; new_options + custom_intent identical).`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: `Analyze this prompt and provide the JSON mapping:\n\n${promptText}` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" },
  };
  const response = await fetchWithRetry(GEMINI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? parseJSON(text) : null;
}

// 베이스 prompt → 최적화 (Chameleon/SilhouetteTrace 특별 처리).
export async function optimizePrompt({ aiModel, basePrompt, currentIntentText, isVfxPass, isOrthographic, isChameleon, isSilhouetteTrace }) {
  const hasCustomIntent = !!(currentIntentText && currentIntentText.trim().length > 0);
  let systemPrompt = `You are a world-class AI Prompt Engineer and Technical Director.\nYour task is to optimize the given base prompt to STRICTLY enforce the user's rendering intent.`;
  if (isVfxPass) {
    systemPrompt += `\n\nCRITICAL MISSION 1 (STRICT MATTE PASS - ABSOLUTE PRIORITY): This is a VFX extraction pass. The typography MUST be a pure Vantablack (#000000) flat silhouette. It acts as an unlit holdout matte. You MUST forcefully prohibit any rim lights, edge highlights, 3D thickness, bevels, reflections, or surface details ON THE TEXT ITSELF. Use heavy negative weights.\nCRITICAL MISSION 2 (ENHANCE SURROUNDING FX): Enhance descriptive quality of surrounding glowing effects and the background canvas.`;
    if (hasCustomIntent) systemPrompt += `\nCRITICAL MISSION 3 (PRESERVE USER INTENT): User provided a custom directive (Korean). Translate/integrate ONLY into VFX/atmosphere. Never apply to text body.`;
  } else {
    systemPrompt += `\n\nCRITICAL MISSION 1 (ANTI-DEEP-3D & RELIEF): If the base prompt indicates "minimal side thickness" or "zero deep rear extrusion", you MUST rewrite to destroy the AI's tendency to generate heavy 3D blocks.\nReinforce the requested front relief. STRICTLY AVOID cheap "photoshop bevel and emboss" looks. Ensure it remains an ISOLATED typography graphic.`;
    if (isSilhouetteTrace) {
      systemPrompt += `\n\nCRITICAL MISSION 2 (SILHOUETTE TRACE - NO TEXT HALLUCINATION): The user wants to perfectly extrude a 2D image into 3D. YOU MUST REMOVE ANY MENTION OF "typography", "text", or "letters" from the prompt. Force the AI to treat the input purely as a "3D geometric shape mask". Add strong negative weights to prevent the AI from generating generic fonts or hallucinating new text characters. Ensure that specific shapes like tongues, stitches, or irregular borders in the reference are NOT smoothed out.`;
    } else if (isChameleon) {
      systemPrompt += `\n\nCRITICAL MISSION 2 (UNIVERSAL REFERENCE COPY): The user intends to perfectly copy a reference style. You MUST ensure the prompt emphasizes adapting and mirroring the exact texture, aesthetic, and lighting of the reference. Avoid adding your own arbitrary style details that might clash with the target reference.`;
    } else if (hasCustomIntent) {
      systemPrompt += `\n\nCRITICAL MISSION 2 (PRESERVE USER INTENT): User provided a custom directive (Korean). Translate Korean into high-quality English tags and integrate. NEVER omit creative flavor.\n**CRITICAL**: If intent describes physical damage/wear/scratches/dents, include them as highly weighted positive tags.`;
    } else {
      systemPrompt += `\n\nCRITICAL MISSION 2 (ENHANCE EXISTING THEME): No custom directive. Refine existing tags based on persona/materials. Do NOT invent new features or claim user requested them.`;
    }
  }
  const koInstruction = hasCustomIntent || isChameleon || isSilhouetteTrace
    ? `"ko": A detailed Korean explanation (2-3 sentences) explaining exactly how the copy/transfer intent or specific Korean intent was translated into the English tags.`
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

// 짧은 키워드 → 시네마틱 묘사 확장.
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

// 튜닝룸 대화.
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
