// --- API Key Definition ---
// 브랜드웹 라이브러리 전용 키 → 미설정 시 공용 VITE_GEMINI_API_KEY 로 폴백.
// 별도 quota/billing 관리가 필요할 때 .env 에 VITE_GEMINI_API_KEY_BRANDWEB 만 추가하면 됨.
import { GEMINI_API_KEY as DEFAULT_GEMINI_KEY } from "../../../lib/gemini";
import { WEB_EVALUATION_KEYS, DEFAULT_WEB_EVAL_PROMPT, BRAND_WEB_EVAL_PROMPT, getWebWeightsFor } from "../constants/webEvalCriteria";
import {
  CRITERIA_TYPES, fetchActiveCriteria, getActiveRules, getSeedRules,
  fetchAnchors, formatAnchorsForPrompt,
  fetchCalibration, buildAnchorFewShot, applyOffset,
} from "../../../lib/evaluationCriteria";
import { prepareAnchorImages } from "../../../lib/anchorImages";

// 공유 캘리브레이션(앵커 + 채점 규칙 + 전역 보정) 세션 캐시 — 일괄 분석에서 Firestore 반복 read 방지.
const _webCalibCache = new Map(); // type -> { anchors, rules, offset, ts }
const _CALIB_TTL_MS = 60_000;
async function _getWebCalibration(type) {
  const hit = _webCalibCache.get(type);
  if (hit && Date.now() - hit.ts < _CALIB_TTL_MS) return hit;
  let anchors = [], rules = "", offset = 0;
  try {
    const [a, v, c] = await Promise.all([fetchAnchors(type), fetchActiveCriteria(type), fetchCalibration(type)]);
    anchors = a || [];
    rules = getActiveRules(v) || getSeedRules(type);
    offset = c?.offset || 0;
  } catch (e) {
    console.warn("[PromotionArchive] calibration load failed", e);
  }
  const entry = { anchors, rules, offset, ts: Date.now() };
  _webCalibCache.set(type, entry);
  return entry;
}

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY_BRANDWEB || "").trim() || DEFAULT_GEMINI_KEY;
// 콘솔에서 어떤 키 소스가 활성화됐는지 확인 — 값은 노출하지 않음.
if (typeof window !== "undefined") {
  const usingDedicated = !!(import.meta.env.VITE_GEMINI_API_KEY_BRANDWEB || "").trim();
  console.info(`[PromotionArchive] Gemini key source: ${usingDedicated ? "VITE_GEMINI_API_KEY_BRANDWEB (dedicated)" : "VITE_GEMINI_API_KEY (shared default)"}`);
}

// Gemini API 호출 함수
export const callGeminiAPI = async (prompt, images = [], temperature = 0.4) => {
    try {
        const imageArray = Array.isArray(images) ? images : (images ? [images] : []);
        const parts = [{ text: prompt }];
        
        imageArray.forEach(img => {
            if(img) parts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
        });

        const requestBody = {
            contents: [{ parts }],
            generationConfig: {
                temperature: temperature
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };
        
        // 모델명 (필요 시 'gemini-2.5-pro' 등으로 변경 가능)
        const modelVersion = "gemini-2.5-flash";

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelVersion}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API call failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        
        // 응답 데이터 구조 안전하게 접근
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.warn("Unexpected API response structure:", data);
            return null;
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
};

// =========================================================================
// 웹 디자인 평가 전용 (JSON 스키마 모드)
// =========================================================================

const WEB_SCORE_OBJ = {
    type: "OBJECT",
    properties: {
        score: { type: "NUMBER" },
        reason: { type: "STRING" }
    },
    required: ["score", "reason"]
};

const WEB_RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        title: { type: "STRING" },
        date_info: {
            type: "OBJECT",
            properties: {
                year: { type: "STRING" },
                month: { type: "STRING" },
                full_date: { type: "STRING" }
            }
        },
        tags: { type: "ARRAY", items: { type: "STRING" } },
        summary: { type: "STRING" },
        scores_data: {
            type: "OBJECT",
            properties: Object.fromEntries(WEB_EVALUATION_KEYS.map(k => [k, WEB_SCORE_OBJ])),
            required: [...WEB_EVALUATION_KEYS]
        }
    },
    required: ["title", "tags", "scores_data"]
};

const WEB_REQUEST_TIMEOUT_MS = 60000;
const WEB_MAX_ATTEMPTS = 3;
const WEB_RETRY_DELAYS = [1000, 2000];

// 이미지 소스(http URL / data URL / base64)를 압축 후 base64 본문으로 변환
const _compressToBase64 = (base64Str, maxWidth = 1280, quality = 0.8) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        try {
            resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
            resolve(base64Str);
        }
    };
    img.onerror = () => resolve(base64Str);
});

const _urlToDataUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const prepareImageForAI = async (imgSource, maxWidth = 1280, quality = 0.8) => {
    if (!imgSource) return null;
    let dataUrl = imgSource;
    if (imgSource.startsWith('http') || imgSource.startsWith('blob:')) {
        dataUrl = await _urlToDataUrl(imgSource);
        if (!dataUrl) throw new Error("이미지 다운로드 실패 (CORS 또는 네트워크)");
    }
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
        const compressed = await _compressToBase64(dataUrl, maxWidth, quality);
        return compressed.split(',')[1];
    }
    if (typeof dataUrl === 'string' && dataUrl.includes(',')) return dataUrl.split(',')[1];
    return dataUrl;
};

// 웹 디자인 평가 호출 (JSON 모드 + 자동 재시도).
// options.apiKey 가 주어지면 그 키 사용 (예: 일괄 분석에서 공용 키로 호출).
// 미지정 시 기본 apiKey (brandweb dedicated → 공용 fallback) 사용.
export const analyzeWebDesign = async (imagesBase64 = [], userComment = '', options = {}) => {
    const keyToUse = (options.apiKey || apiKey || '').trim();
    // 브랜드웹은 다른 평가 관점(메인 메시지/세계관 중심) 사용.
    const basePrompt = options.isBrandWeb ? BRAND_WEB_EVAL_PROMPT : DEFAULT_WEB_EVAL_PROMPT;
    // 공유 캘리브레이션 주입 — 채점 규칙 + 기준점 앵커. 타입은 브랜드웹/프로모션 공유 버킷 사용
    // (앵커는 최종 점수+한줄평이라 키 셋과 무관 → DesignEvaluator 와 같은 기준점 공유).
    const calibType = options.isBrandWeb ? CRITERIA_TYPES.brandweb : CRITERIA_TYPES.promotion;
    const calib = await _getWebCalibration(calibType);
    const ruleBlock = calib.rules && calib.rules.trim() ? `\n\n[채점 규칙]\n${calib.rules.trim()}\n` : '';
    // 기준점 앵커 — 썸네일 있는 앵커는 시각 few-shot 이미지로, 없는 앵커는 텍스트로 주입.
    const { anchors: pickedAnchors } = buildAnchorFewShot(calib.anchors || []);
    const preparedAnchors = pickedAnchors.length ? await prepareAnchorImages(pickedAnchors) : [];
    const fewShot = preparedAnchors.length ? buildAnchorFewShot(preparedAnchors.map(p => p.anchor)) : { text: '' };
    const anchorImageParts = preparedAnchors.map(p => ({ inlineData: { mimeType: "image/jpeg", data: p.base64 } }));
    const textOnlyAnchors = (calib.anchors || []).filter(a => !a?.thumbnailUrl);
    const anchorBlock = `${fewShot.text || ''}${formatAnchorsForPrompt(textOnlyAnchors) || ''}`;
    const weights = getWebWeightsFor(!!options.isBrandWeb);
    const prompt = `${basePrompt}${ruleBlock}${anchorBlock}`
        + (userComment ? `\n\n[사용자 피드백]\n${userComment}\n` : '');

    const imageParts = (Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64])
        .filter(Boolean)
        .map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } }));
    const targetMarker = anchorImageParts.length ? [{ text: "[평가 대상 이미지 — 위 참고 이미지들의 점수 감각으로 채점하세요]" }] : [];

    const requestBody = {
        contents: [{ parts: [{ text: prompt }, ...anchorImageParts, ...targetMarker, ...imageParts] }],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: WEB_RESPONSE_SCHEMA,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    let lastError = null;
    for (let attempt = 0; attempt < WEB_MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        let didTimeout = false;
        const timeoutId = setTimeout(() => {
            didTimeout = true;
            try { controller.abort(); } catch { /* noop */ }
        }, WEB_REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${keyToUse}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                }
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

            const cleaned = text.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            // 점수 정리 + aiScore 계산 — 가중 평균(weights). 누락 항목은 분모(weight 합)에서도 제외.
            const scores = {};
            let weightedSum = 0;
            let totalW = 0;
            const missing = [];
            WEB_EVALUATION_KEYS.forEach(key => {
                const item = parsed?.scores_data?.[key];
                if (item && typeof item.score === 'number') {
                    const w = Number(weights[key]) > 0 ? Number(weights[key]) : 1;
                    scores[key] = { score: Math.round(item.score), reason: String(item.reason || ''), weight: w };
                    weightedSum += item.score * w;
                    totalW += w;
                } else {
                    missing.push(key);
                    scores[key] = { score: null, reason: '(분석 누락)' };
                }
            });
            // 전역 보정(offset) 적용 — 평가자 점수 감각으로 점수대 시프트(0~99 clamp).
            const adjusted100 = applyOffset(totalW > 0 ? weightedSum / totalW : 0, calib.offset);
            const aiScore = totalW > 0 ? +(adjusted100 / 10).toFixed(1) : 0;

            // 날짜 정리 — 빈 값/추측 단어 필터
            const isInvalidDate = (val) => !val || ['null', 'none', 'unknown', '없음', '불명'].some(s => String(val).toLowerCase().includes(s));
            const dateInfo = parsed?.date_info || {};
            let yearStr = !isInvalidDate(dateInfo.year) ? String(dateInfo.year).match(/\d{4}/)?.[0] : null;
            let monthStr = !isInvalidDate(dateInfo.month) ? String(dateInfo.month).match(/\d{1,2}/)?.[0]?.padStart(2, '0') : null;
            const fullDateStr = !isInvalidDate(dateInfo.full_date) ? String(dateInfo.full_date).trim() : null;
            // year/month 가 비어있으면 full_date 에서 fallback 추출.
            // "2026.03.05 ~ 2026.03.19" / "2026-03-05" / "2026/3" 등 다양한 구분자 허용.
            if (!yearStr && fullDateStr) {
                yearStr = fullDateStr.match(/(20\d{2})/)?.[1] || null;
            }
            if (!monthStr && fullDateStr) {
                const m = fullDateStr.match(/20\d{2}\s*[.\-/년]\s*(\d{1,2})/);
                if (m) monthStr = m[1].padStart(2, '0');
            }
            // YEAR_LIST 가 Number 라 일관성 유지. month 도 Number 로 통일 (UI select 가 1~12 Number).
            const yearNum = yearStr ? Number(yearStr) : null;
            const monthNum = monthStr ? Number(monthStr) : null;

            // title 후처리 — AI 가 종종 따옴표나 [ ] 같은 포맷팅 문자를 붙임. 정리.
            let titleClean = parsed?.title ? String(parsed.title).trim() : null;
            if (titleClean) {
                titleClean = titleClean.replace(/^["'\[「『]+|["'\]」』]+$/g, '').trim();
                if (titleClean.length < 2) titleClean = null;
            }

            return {
                ok: true,
                webScores: scores,
                webAiScore: aiScore,
                title: titleClean,
                year: Number.isFinite(yearNum) ? yearNum : null,
                month: Number.isFinite(monthNum) ? monthNum : null,
                fullDate: fullDateStr || null,
                tags: Array.isArray(parsed?.tags) ? parsed.tags.map(String) : [],
                summary: parsed?.summary ? String(parsed.summary) : '',
                missingCount: missing.length,
            };
        } catch (e) {
            clearTimeout(timeoutId);
            const err = didTimeout ? new Error(`타임아웃 (${WEB_REQUEST_TIMEOUT_MS / 1000}s)`) : e;
            lastError = err;
            const retryable = !err.status || err.status === 429 || err.status >= 500;
            if (!retryable || attempt === WEB_MAX_ATTEMPTS - 1) break;
            console.warn(`[PromotionArchive] Gemini 재시도 ${attempt + 1}/${WEB_MAX_ATTEMPTS - 1}: ${err.message}`);
            await new Promise(r => setTimeout(r, WEB_RETRY_DELAYS[attempt] || 2000));
        }
    }

    console.error("[PromotionArchive] analyzeWebDesign failed:", lastError);
    return { ok: false, error: lastError?.message || '알 수 없는 오류' };
};