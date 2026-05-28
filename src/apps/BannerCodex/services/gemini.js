import { GEMINI_API_KEY } from "../../../lib/gemini";

const SCORE_OBJ = {
  type: "OBJECT",
  properties: {
    score: { type: "NUMBER" }, reason: { type: "STRING" }
  },
  required: ["score", "reason"]
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    date_info: {
      type: "OBJECT",
      properties: {
        year: { type: "STRING" }, month: { type: "STRING" }, full_date: { type: "STRING" }
      }
    },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    purpose: { type: "STRING" },
    scores_data: {
      type: "OBJECT",
      properties: {
        impression: SCORE_OBJ, concept: SCORE_OBJ, layout: SCORE_OBJ,
        typography: SCORE_OBJ, color: SCORE_OBJ, readability: SCORE_OBJ,
        brand: SCORE_OBJ, flow: SCORE_OBJ, detail: SCORE_OBJ, conversion: SCORE_OBJ
      },
      required: ["impression","concept","layout","typography","color","readability","brand","flow","detail","conversion"]
    }
  },
  required: ["title", "tags", "purpose", "scores_data"]
};

const REQUEST_TIMEOUT_MS = 60000;
// 일괄 분석 시 호출량 폭증을 막기 위해 보수적으로 — 첫 시도 + 한 번의 재시도만.
// 재시도 간격도 늘려서 일시적 throttle 회복 시간을 확보.
const MAX_ATTEMPTS = 2;
const RETRY_DELAYS = [3000];

export const callGeminiAPI = async (prompt, imageBase64 = null, isJson = false, opts = {}) => {
  const { apiKey: providedKey, isBatchCall = false, stopRef, onController } = opts;
  const apiKey = providedKey || GEMINI_API_KEY;
  try {
    // gemini-2.5-pro(고급 모델) — 10지표 평가 품질 우선. pro 의 강점인 추론(thinking)을
    // 그대로 살리기 위해 thinkingBudget 을 끄지 않음(끄면 품질↓, pro 는 최소 budget 강제라 0 도 무의미).
    const generationConfig = { temperature: 0.1 };
    if (isJson) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = RESPONSE_SCHEMA;
    }
    const requestBody = {
      contents: [{ parts: [
        { text: prompt },
        ...(imageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] : [])
      ] }],
      generationConfig,
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (isBatchCall && stopRef?.current) return null;
      const controller = new AbortController();
      if (isBatchCall && onController) onController(controller);
      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        try { controller.abort(new Error(`Gemini timeout ${REQUEST_TIMEOUT_MS / 1000}s`)); }
        catch { controller.abort(); }
      }, REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody), signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (!response.ok) {
          let errorMsg = `HTTP ${response.status}`;
          try { const errData = await response.json(); if (errData.error?.message) errorMsg += ` - ${errData.error.message}`; } catch (e) {}
          const err = new Error(errorMsg);
          err.status = response.status;
          throw err;
        }
        const data = await response.json();
        if (data.candidates?.length > 0 && data.candidates[0].content?.parts?.length > 0) {
          return data.candidates[0].content.parts[0].text;
        }
        return "ERROR:응답 결과가 없습니다. (API 안전 필터 차단 의심)";
      } catch (e) {
        clearTimeout(timeoutId);
        const isAbort = e?.name === 'AbortError' || e?.code === 20 || didTimeout;
        if (isAbort) {
          const reasonMsg = controller.signal?.reason?.message
            || (didTimeout ? `타임아웃 (${REQUEST_TIMEOUT_MS / 1000}s)` : '요청 취소됨');
          e = new Error(reasonMsg);
        }
        const isRetryable = !e.status || e.status === 429 || e.status >= 500;
        if (!isRetryable) {
          console.warn(`[BannerCodex] Gemini ${e.status} — 재시도 안 함:`, e.message);
          throw e;
        }
        if (attempt === MAX_ATTEMPTS - 1 || (isBatchCall && stopRef?.current)) throw e;
        console.warn(`[BannerCodex] Gemini 재시도 ${attempt + 1}/${MAX_ATTEMPTS - 1} (${e.message})`);
        const delayMs = RETRY_DELAYS[attempt] || 2000;
        for (let t = 0; t < delayMs; t += 100) {
          if (isBatchCall && stopRef?.current) return null;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `ERROR:${error.message}`;
  }
  return null;
};

export const callOpenAIAPI = async (prompt, imageBase64, openAiApiKey) => {
  if (!openAiApiKey) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: "system", content: "You are a professional design evaluation AI. You must output only valid JSON matching the exact schema requested by the user." },
          { role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ] }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });
    if (!response.ok) throw new Error("OpenAI API Error");
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e) {
    console.error("OpenAI API Failed:", e);
    return null;
  }
};

export const buildEvalPrompt = (basePrompt, learningContext, criteriaListText, scoringRules = '') => {
  let p = basePrompt;
  if (p.includes('{{EVALUATION_CRITERIA_LIST}}')) {
    p = p.replace('{{EVALUATION_CRITERIA_LIST}}', criteriaListText || '');
  }
  // SCORING_RULES 는 placeholder 가 있을 때만 치환. 자동 append 안 함 — 기존 커스텀 프롬프트에
  // 이미 채점 규칙이 박혀 있을 수 있어 중복 주입 방지.
  if (p.includes('{{SCORING_RULES}}')) {
    p = p.replace('{{SCORING_RULES}}', scoringRules || '');
  }
  if (p.includes('{{LEARNING_CONTEXT}}')) {
    p = p.replace('{{LEARNING_CONTEXT}}', learningContext || '');
  } else if (learningContext) {
    p = `${p}\n\n${learningContext}`;
  }
  return p;
};

export const buildLearningContext = (currentBanner, otherBanners) => {
  const otherFeedbacks = otherBanners
    .filter(b => b.id !== currentBanner.id && (b.userComment || (b.manualScoreAdj && b.manualScoreAdj !== 0)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)
    .map(b => `- [특징: ${b.tags?.join(', ')}] 수동 점수 보정: ${b.manualScoreAdj > 0 ? '+' : ''}${b.manualScoreAdj}점 / 과거 코멘트: "${b.userComment || '없음'}"`);
  const currentFeedback = [];
  if (currentBanner.userComment || (currentBanner.manualScoreAdj && currentBanner.manualScoreAdj !== 0)) {
    currentFeedback.push(`- [★★★현재 평가 중인 이미지에 대한 사용자의 직접 지시 (0순위 반영)★★★] 수동 점수 보정: ${currentBanner.manualScoreAdj > 0 ? '+' : ''}${currentBanner.manualScoreAdj || 0}점 / 코멘트 내용: "${currentBanner.userComment || '없음'}"`);
  }
  const all = [...currentFeedback, ...otherFeedbacks].join('\n');
  return all.length > 0 ? `\n[사용자 피드백 학습 데이터]\n${all}\n` : '';
};
