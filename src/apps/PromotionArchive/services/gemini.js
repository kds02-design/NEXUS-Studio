// --- API Key Definition ---
// VITE_GEMINI_API_KEY env var (.env 파일 참조)
import { GEMINI_API_KEY as apiKey } from "../../../lib/gemini";
import { WEB_EVALUATION_KEYS, DEFAULT_WEB_EVAL_PROMPT } from "../constants/webEvalCriteria";

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

// 웹 디자인 평가 호출 (JSON 모드 + 자동 재시도)
export const analyzeWebDesign = async (imagesBase64 = [], userComment = '') => {
    const prompt = userComment
        ? `${DEFAULT_WEB_EVAL_PROMPT}\n\n[사용자 피드백]\n${userComment}\n`
        : DEFAULT_WEB_EVAL_PROMPT;

    const imageParts = (Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64])
        .filter(Boolean)
        .map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } }));

    const requestBody = {
        contents: [{ parts: [{ text: prompt }, ...imageParts] }],
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
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

            // 점수 정리 + aiScore 계산
            const scores = {};
            let sum = 0;
            let count = 0;
            const missing = [];
            WEB_EVALUATION_KEYS.forEach(key => {
                const item = parsed?.scores_data?.[key];
                if (item && typeof item.score === 'number') {
                    scores[key] = { score: Math.round(item.score), reason: String(item.reason || '') };
                    sum += item.score;
                    count++;
                } else {
                    missing.push(key);
                    scores[key] = { score: null, reason: '(분석 누락)' };
                }
            });
            const aiScore = count > 0 ? +(sum / count / 10).toFixed(1) : 0;

            // 날짜 정리 — 빈 값/추측 단어 필터
            const isInvalidDate = (val) => !val || ['null', 'none', 'unknown', '없음', '불명'].some(s => String(val).toLowerCase().includes(s));
            const dateInfo = parsed?.date_info || {};
            const yearStr = !isInvalidDate(dateInfo.year) ? String(dateInfo.year).match(/\d{4}/)?.[0] : null;
            const monthStr = !isInvalidDate(dateInfo.month) ? String(dateInfo.month).match(/\d{1,2}/)?.[0]?.padStart(2, '0') : null;
            const fullDateStr = !isInvalidDate(dateInfo.full_date) ? String(dateInfo.full_date).trim() : null;

            return {
                ok: true,
                webScores: scores,
                webAiScore: aiScore,
                title: parsed?.title ? String(parsed.title).trim() : null,
                year: yearStr || null,
                month: monthStr || null,
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