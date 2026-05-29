// CompetitorRadar — Gemini 호출. PromotionArchive analyzeWebDesign 의 견고한 골격
// (타임아웃·재시도·JSON 스키마·safetySettings)을 트렌드 추출용으로 미러.
import { GEMINI_API_KEY } from "../../../lib/gemini";
import { COMPETITOR_ANALYSIS_PROMPT, TREND_REPORT_PROMPT } from "../constants/competitorCriteria";

const apiKey = GEMINI_API_KEY;
const REQUEST_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000];

const SAFETY = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

const ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    category: { type: "STRING" },
    date_info: {
      type: "OBJECT",
      properties: { year: { type: "STRING" }, month: { type: "STRING" }, full_date: { type: "STRING" } },
    },
    styleTraits: { type: "ARRAY", items: { type: "STRING" } },
    colorPalette: { type: "ARRAY", items: { type: "STRING" } },
    layoutPattern: { type: "STRING" },
    copyTone: { type: "STRING" },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    summary: { type: "STRING" },
  },
  required: ["category", "styleTraits", "tags", "summary"],
};

// ── 이미지 준비: http/dataURL → 압축 base64(접두어 없음) ─────────────
const _compress = (src, maxWidth = 1280, quality = 0.8) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    let w = img.width, h = img.height;
    if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
    canvas.width = w; canvas.height = h;
    try { canvas.getContext("2d").drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL("image/jpeg", quality)); }
    catch { resolve(src); }
  };
  img.onerror = () => resolve(null);
});
const _urlToDataUrl = async (url) => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
export const prepareImageForAI = async (src) => {
  if (!src) return null;
  let dataUrl = src;
  if (src.startsWith("http") || src.startsWith("blob:")) {
    dataUrl = await _urlToDataUrl(src);
    if (!dataUrl) throw new Error("이미지 다운로드 실패 (CORS 또는 네트워크)");
  }
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:image")) {
    const compressed = await _compress(dataUrl);
    return compressed ? compressed.split(",")[1] : null;
  }
  if (typeof dataUrl === "string" && dataUrl.includes(",")) return dataUrl.split(",")[1];
  return dataUrl;
};

const _isInvalid = (v) => !v || ["null", "none", "unknown", "없음", "불명"].some(s => String(v).toLowerCase().includes(s));

// ── 경쟁사 트렌드 분석 (비전 + JSON 모드 + 재시도) ──────────────────
export const analyzeCompetitorDesign = async (imagesBase64 = [], options = {}) => {
  const keyToUse = (options.apiKey || apiKey || "").trim();
  const imageParts = (Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64])
    .filter(Boolean)
    .map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } }));
  if (imageParts.length === 0) return { ok: false, error: "분석할 이미지가 없습니다." };

  const requestBody = {
    contents: [{ parts: [{ text: COMPETITOR_ANALYSIS_PROMPT }, ...imageParts] }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json", responseSchema: ANALYSIS_SCHEMA },
    safetySettings: SAFETY,
  };

  let lastError = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = setTimeout(() => { didTimeout = true; try { controller.abort(); } catch { /* noop */ } }, REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${keyToUse}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody), signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const err = new Error(`HTTP ${response.status} ${errData?.error?.message || response.statusText}`);
        err.status = response.status;
        throw err;
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("응답 본문이 비어 있습니다. (안전 필터 차단 의심)");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      const di = parsed?.date_info || {};
      const year = !_isInvalid(di.year) ? (String(di.year).match(/\d{4}/)?.[0] || "") : "";
      const month = !_isInvalid(di.month) ? (String(di.month).match(/\d{1,2}/)?.[0]?.padStart(2, "0") || "") : "";
      const fullDate = !_isInvalid(di.full_date) ? String(di.full_date).trim() : "";

      const arr = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
      return {
        ok: true,
        title: parsed?.title ? String(parsed.title).trim() : "",
        category: ["promotion", "update", "brand", "etc"].includes(parsed?.category) ? parsed.category : "etc",
        promoDate: { year, month, fullDate },
        styleTraits: arr(parsed?.styleTraits),
        colorPalette: arr(parsed?.colorPalette),
        layoutPattern: parsed?.layoutPattern ? String(parsed.layoutPattern) : "",
        copyTone: parsed?.copyTone ? String(parsed.copyTone) : "",
        tags: arr(parsed?.tags),
        summary: parsed?.summary ? String(parsed.summary) : "",
      };
    } catch (e) {
      clearTimeout(timeoutId);
      const err = didTimeout ? new Error(`타임아웃 (${REQUEST_TIMEOUT_MS / 1000}s)`) : e;
      lastError = err;
      const retryable = !err.status || err.status === 429 || err.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS - 1) break;
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 2000));
    }
  }
  console.error("[CompetitorRadar] analyzeCompetitorDesign failed:", lastError);
  return { ok: false, error: lastError?.message || "알 수 없는 오류" };
};

// ── 트렌드 리포트 합성 (텍스트 전용) ───────────────────────────────
export const generateTrendReport = async (entries = [], options = {}) => {
  const keyToUse = (options.apiKey || apiKey || "").trim();
  if (!entries.length) return { ok: false, error: "리포트로 만들 항목이 없습니다." };

  const lines = entries.map((e, i) => {
    const parts = [
      `${i + 1}. [${e.competitor || "미상"}] ${e.title || "(제목 없음)"}`,
      e.category ? `유형:${e.category}` : "",
      e.styleTraits?.length ? `스타일:${e.styleTraits.join("/")}` : "",
      e.colorPalette?.length ? `컬러:${e.colorPalette.join("/")}` : "",
      e.layoutPattern ? `레이아웃:${e.layoutPattern}` : "",
      e.copyTone ? `카피:${e.copyTone}` : "",
      e.summary ? `요약:${e.summary}` : "",
    ].filter(Boolean);
    return parts.join(" · ");
  }).join("\n");

  const prompt = `${TREND_REPORT_PROMPT}\n\n[수집 데이터 — ${entries.length}건]\n${lines}`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4 },
    safetySettings: SAFETY,
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }
    );
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status} ${errData?.error?.message || response.statusText}`);
    }
    const data = await response.json();
    const markdown = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!markdown) throw new Error("리포트 응답이 비어 있습니다.");
    return { ok: true, markdown: markdown.trim() };
  } catch (e) {
    console.error("[CompetitorRadar] generateTrendReport failed:", e);
    return { ok: false, error: e.message || "알 수 없는 오류" };
  }
};
