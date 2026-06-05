// --- API Key Definition ---
// PromotionArchive 의 모든 평가(프로모션/브랜드웹/브랜드웹서브, 단일/일괄)는 공용 VITE_GEMINI_API_KEY 사용.
import { GEMINI_API_KEY as DEFAULT_GEMINI_KEY } from "../../../lib/gemini";
import { getIntroTemplateFor } from "../constants/webEvalCriteria";
import {
  CRITERIA_TYPES, fetchActiveCriteria, getActiveRules, getSeedRules,
  getSeedCriteria, formatCriteriaList, weightsMap,
  fetchAnchors, formatAnchorsForPrompt,
  fetchCalibration, buildAnchorFewShot, applyOffset,
} from "../../../lib/evaluationCriteria";
import { prepareAnchorImages } from "../../../lib/anchorImages";

// 공유 캘리브레이션(어드민 활성 평가기준 + 앵커 + 채점 규칙 + 전역 보정) 세션 캐시.
// 캐시 키에 versionId 를 포함 — 어드민이 활성 버전을 토글하면 다음 호출에서 새 항목/가중치로 자동 전환.
// 일괄 분석 도중 어드민 변경도 60s TTL 안에서 새 versionId 로 자연스럽게 반영됨.
const _webCalibCache = new Map(); // `${type}::${versionId}` -> entry
const _CALIB_TTL_MS = 60_000;
const _CALIB_CACHE_MAX = 20;

async function _getWebCalibration(type) {
  let v = null, anchors = [], offset = 0;
  try {
    const [a, ver, c] = await Promise.all([fetchAnchors(type), fetchActiveCriteria(type), fetchCalibration(type)]);
    v = ver;
    anchors = a || [];
    offset = c?.offset || 0;
  } catch (e) {
    console.warn("[PromotionArchive] calibration load failed", e);
  }
  const versionId = v?.id || 'seed';
  const versionName = v?.name || '(시드)';
  const key = `${type}::${versionId}`;

  const hit = _webCalibCache.get(key);
  if (hit && Date.now() - hit.ts < _CALIB_TTL_MS) {
    // 캐시 히트 — anchors/offset 은 최신값으로 갱신 (versionId 변동과 별개)
    hit.anchors = anchors;
    hit.offset = offset;
    return hit;
  }

  const items = (Array.isArray(v?.criteria) && v.criteria.length) ? v.criteria : getSeedCriteria(type);
  const rules = getActiveRules(v) || getSeedRules(type);

  const entry = { items, rules, anchors, offset, versionId, versionName, ts: Date.now() };

  if (_webCalibCache.size >= _CALIB_CACHE_MAX) {
    const oldestKey = _webCalibCache.keys().next().value;
    if (oldestKey) _webCalibCache.delete(oldestKey);
  }
  _webCalibCache.set(key, entry);
  console.info(`[PromotionArchive] criteria source: type=${type} versionId=${versionId} name=${versionName} keys=${items.length}`);
  return entry;
}

// 외부(예: WebDesignEvalModal 의 버전 뱃지 / 라벨 맵)에서 활성 버전 메타를 미리 받기 위한 export.
export async function loadActiveWebCriteria(type) {
  if (!type) return null;
  return _getWebCalibration(type);
}

const apiKey = (DEFAULT_GEMINI_KEY || "").trim();

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

// 어드민 활성 평가기준의 항목 id 들로 scores_data 스키마를 매 호출 시 빌드.
// (BannerCodex 도 같은 10개 키 universe 지만 스키마는 정적; 우리는 어드민 추가/삭제도 반영하려 동적 빌드.)
const _buildResponseSchema = (scoreKeys) => ({
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
            properties: Object.fromEntries(scoreKeys.map(k => [k, WEB_SCORE_OBJ])),
            required: [...scoreKeys]
        }
    },
    required: ["title", "tags", "scores_data"]
});

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
// 모든 평가는 공용 VITE_GEMINI_API_KEY 사용.
// 평가 항목/가중치/라벨은 NexusAdmin 활성 버전(evaluationCriteria) 에서 동적 로드.
// criteriaType 우선; 미지정 시 isBrandWeb 폴백(true → brandweb, 그 외 → promotion).
// 에셋 경로에서 캠페인 폴더명만 추출 — 디자이너가 직접 명명한 가장 신뢰도 높은 title 단서.
// 예: "\\ppc-file\1.리니지\2026\프로모션\20260429_보호 주문서\03.디자인\" → "보호 주문서"
//     "...\이벤트\아덴의 격전\03.디자인" → "아덴의 격전"
// 규칙: 마지막에 오는 "NN.이름" 류(03.디자인, 02.소스 등) 잘라낸 뒤, "YYYYMMDD_제목" 패턴이면 제목만 반환.
export function extractCampaignFolderHint(path) {
  if (!path) return '';
  const parts = String(path).split(/[\\/]+/).filter(Boolean);
  while (parts.length && /^\d+\.\S/.test(parts[parts.length - 1])) parts.pop();
  const last = parts[parts.length - 1] || '';
  const dated = last.match(/^\d{8}_(.+)$/);
  return (dated ? dated[1] : last).trim();
}

export const analyzeWebDesign = async (imagesBase64 = [], userComment = '', options = {}) => {
    const keyToUse = apiKey;
    const calibType = options.criteriaType
        || (options.isBrandWeb ? CRITERIA_TYPES.brandweb : CRITERIA_TYPES.promotion);
    const calib = await _getWebCalibration(calibType);
    const items = calib.items || [];
    const SCORE_KEYS = items.map(c => c.id).filter(Boolean);
    if (SCORE_KEYS.length === 0) {
        return { ok: false, error: `평가 항목이 비어 있습니다 (type=${calibType}). NexusAdmin 에서 활성 버전을 확인하세요.` };
    }
    const weights = weightsMap(items);

    // 프롬프트 인트로(타입별) + 동적 평가 항목 리스트 주입.
    const introTemplate = getIntroTemplateFor(calibType);
    const criteriaListBlock = formatCriteriaList(items);
    const introFilled = introTemplate.replace('{{CRITERIA_LIST}}', criteriaListBlock);
    const ruleBlock = calib.rules && calib.rules.trim() ? `\n\n[채점 규칙]\n${calib.rules.trim()}\n` : '';

    // 폴더명 단서 — 디자이너가 부여한 캠페인 폴더명. title 추출의 강력한 anchor.
    const folderHint = options.folderHint ? String(options.folderHint).trim() : '';
    const folderBlock = folderHint ? `\n\n[디자이너가 부여한 캠페인 폴더명]
"${folderHint}"

이 폴더명은 디자이너가 직접 작성한 캠페인의 공식 명칭에 가깝습니다. title 추출 시:
- 이미지의 시각적 텍스트가 이 폴더명과 일치하거나 매우 유사하면 → 그 텍스트를 title로 채택.
- 이미지의 가장 큰 텍스트와 폴더명이 명확히 다르면 → 이미지의 텍스트를 우선 (오타·신규 캠페인 가능성).
- 단, 폴더명만 보고 만들지 마세요 — 이미지에 그 텍스트가 글자로 보일 때만 사용.
` : '';

    // 기준점 앵커 — 썸네일 있는 앵커는 시각 few-shot 이미지로, 없는 앵커는 텍스트로 주입.
    const { anchors: pickedAnchors } = buildAnchorFewShot(calib.anchors || []);
    const preparedAnchors = pickedAnchors.length ? await prepareAnchorImages(pickedAnchors) : [];
    const fewShot = preparedAnchors.length ? buildAnchorFewShot(preparedAnchors.map(p => p.anchor)) : { text: '' };
    const anchorImageParts = preparedAnchors.map(p => ({ inlineData: { mimeType: "image/jpeg", data: p.base64 } }));
    const textOnlyAnchors = (calib.anchors || []).filter(a => !a?.thumbnailUrl);
    const anchorBlock = `${fewShot.text || ''}${formatAnchorsForPrompt(textOnlyAnchors) || ''}`;

    const prompt = `${introFilled}${ruleBlock}${anchorBlock}${folderBlock}`
        + (userComment ? `\n\n[사용자 피드백]\n${userComment}\n` : '');

    const imageParts = (Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64])
        .filter(Boolean)
        .map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } }));
    const targetMarker = anchorImageParts.length ? [{ text: "[평가 대상 이미지 — 위 참고 이미지들의 점수 감각으로 채점하세요]" }] : [];

    const responseSchema = _buildResponseSchema(SCORE_KEYS);

    const requestBody = {
        contents: [{ parts: [{ text: prompt }, ...anchorImageParts, ...targetMarker, ...imageParts] }],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema,
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
            SCORE_KEYS.forEach(key => {
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
                criteriaType: calibType,
                criteriaVersionId: calib.versionId,
                criteriaVersionName: calib.versionName,
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

// =========================================================================
// 공통 템플릿(아틀라스 골격) 추출 — N 개의 유사 페이지에서 동일 구조 추출.
// =========================================================================
// 입력:
//   imagesBase64: 2~N 개의 압축된 base64 (prepareImageForAI 로 1024px 권장)
//   options.groupHint: (선택) 사용자가 지정한 그룹 설명 — 모델에 컨텍스트 제공
//
// 응답 스키마: { ok, summary, fixedRegions, fixedCopy, dynamicPlaceholders, variableElements, masterTemplateSpec }
//   - fixedRegions: 모든 페이지에 공통으로 존재하는 구조 영역 (위치·크기·역할)
//   - fixedCopy: 모든 페이지에 똑같이 들어가는 카피 문구
//   - dynamicPlaceholders: 매번 값이 바뀌는 데이터 슬롯 (예: NNN/NNN 카운터)
//   - variableElements: 케이스별로 달라지는 요소 (컬러·캐릭터·재질·장식)
//   - masterTemplateSpec: 마스터 와이어프레임을 만들 때 따라야 할 명세 (마크다운)

const TEMPLATE_RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        summary: { type: "STRING" },
        fixedRegions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    position: { type: "STRING" },
                    sizePercent: { type: "STRING" },
                    role: { type: "STRING" },
                },
                required: ["name", "position", "role"],
            },
        },
        fixedCopy: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    text: { type: "STRING" },
                    where: { type: "STRING" },
                },
                required: ["text", "where"],
            },
        },
        dynamicPlaceholders: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    where: { type: "STRING" },
                    format: { type: "STRING" },
                },
                required: ["name", "where"],
            },
        },
        variableElements: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    category: { type: "STRING" },
                    description: { type: "STRING" },
                },
                required: ["category", "description"],
            },
        },
        masterTemplateSpec: { type: "STRING" },
    },
    required: ["summary", "fixedRegions", "fixedCopy", "variableElements", "masterTemplateSpec"],
};

const TEMPLATE_INTRO = `당신은 디자인 시스템 분석가입니다.

지금부터 같은 캠페인 / 시리즈에 속한 N 개의 브랜드 웹 페이지 이미지를 보여드립니다.
이들은 같은 마스터 템플릿에서 파생된 월별 / 케이스별 변종일 가능성이 높습니다.

목표: 이 N 장의 공통점을 추출해 "마스터 템플릿 골격"을 도출하는 것.

다음 네 가지를 구분해서 정확하게 식별하세요.

1. fixedRegions — 모든 페이지에 같은 위치 · 같은 크기 · 같은 역할로 존재하는 구조 영역
   - 예: { name: "메인 타이틀", position: "상단 5~15%", sizePercent: "10%", role: "월 표시 + 시리즈 명 노출" }
   - 위치는 "상단 / 중앙 상부 / 중앙 / 하부 / 최하단" 또는 % 로 명시
   - 모든 페이지에 반드시 존재해야만 fixed 로 분류

2. fixedCopy — 모든 페이지에 글자 그대로 똑같이 들어가는 카피
   - 예: { text: "보너스 혜택", where: "하단 섹션 헤더" }
   - 한 페이지에라도 다르면 fixed 가 아님

3. dynamicPlaceholders — 같은 자리·같은 포맷이지만 값이 매번 바뀌는 데이터 슬롯
   - 예: { name: "선착 사용 인원 카운터", where: "최하단", format: "NNN/NNN" }
   - 값은 다르지만 위치·포맷·역할이 일관되면 dynamic placeholder

4. variableElements — 케이스별로 달라지는 디자인 요소
   - 카테고리: "color palette", "character illustration", "decorative motif", "background", "material/finish" 등
   - 예: { category: "color palette", description: "월·계절에 따라 다른 팔레트 — 봄 핑크, 겨울 청록, 가을 갈색 등" }

마지막으로 masterTemplateSpec 에 마스터 와이어프레임 명세를 마크다운으로 작성하세요. 디자이너가 이 명세만 보고 새 케이스를 만들 수 있어야 합니다 (영역 배치, 고정 카피 위치, 동적 데이터 슬롯, 가변 요소 가이드라인 포함).

summary 에는 이 그룹이 어떤 종류의 페이지인지 한 줄로 요약하세요.

다음 N 장이 분석 대상입니다.`;

export const analyzeTemplateGroup = async (imagesBase64 = [], options = {}) => {
    const keyToUse = apiKey;
    const n = imagesBase64.length;
    if (n < 2) return { ok: false, error: '2장 이상이 필요합니다.' };

    const groupHintBlock = options.groupHint
        ? `\n\n[사용자가 제공한 그룹 컨텍스트]\n${options.groupHint}\n`
        : '';
    const prompt = `${TEMPLATE_INTRO}${groupHintBlock}\n\n총 ${n} 장이 첨부됩니다.`;

    const imageParts = imagesBase64
        .filter(Boolean)
        .map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } }));

    const requestBody = {
        contents: [{ parts: [{ text: prompt }, ...imageParts] }],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: TEMPLATE_RESPONSE_SCHEMA,
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
        // 다수 이미지라 타임아웃 여유 — 단일 분석 60s → 그룹 분석 120s.
        const TIMEOUT = 120_000;
        const timeoutId = setTimeout(() => {
            didTimeout = true;
            try { controller.abort(); } catch { /* noop */ }
        }, TIMEOUT);

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
            if (!text) throw new Error('응답 본문이 비어 있습니다.');
            const cleaned = text.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return {
                ok: true,
                summary: String(parsed.summary || ''),
                fixedRegions: Array.isArray(parsed.fixedRegions) ? parsed.fixedRegions : [],
                fixedCopy: Array.isArray(parsed.fixedCopy) ? parsed.fixedCopy : [],
                dynamicPlaceholders: Array.isArray(parsed.dynamicPlaceholders) ? parsed.dynamicPlaceholders : [],
                variableElements: Array.isArray(parsed.variableElements) ? parsed.variableElements : [],
                masterTemplateSpec: String(parsed.masterTemplateSpec || ''),
                count: n,
            };
        } catch (e) {
            clearTimeout(timeoutId);
            const err = didTimeout ? new Error(`타임아웃 (120s)`) : e;
            lastError = err;
            const retryable = !err.status || err.status === 429 || err.status >= 500;
            if (!retryable || attempt === WEB_MAX_ATTEMPTS - 1) break;
            console.warn(`[PromotionArchive] analyzeTemplateGroup 재시도 ${attempt + 1}: ${err.message}`);
            await new Promise(r => setTimeout(r, WEB_RETRY_DELAYS[attempt] || 2000));
        }
    }

    console.error('[PromotionArchive] analyzeTemplateGroup failed:', lastError);
    return { ok: false, error: lastError?.message || '알 수 없는 오류' };
};