/* eslint-disable */
// v2 전용 유틸 — 원본 PromptEngine.jsx 의 헬퍼들을 그대로 옮긴 격리 사본.
import { sliderDesc } from './options.js';

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

export const getOptionEn = (list, id) => {
    if (!Array.isArray(list)) return "";
    const found = list.find(o => o.id === id);
    return found?.en_desc || found?.en || found?.name || "";
};

export const getOptionName = (list, id) => {
    if (!Array.isArray(list)) return "";
    const found = list.find(o => o.id === id);
    return found?.name || "";
};

export const getSliderText = (val) => {
    if (val < 35) return `[EXTREME FOCUS]: ${sliderDesc.leftDesc}`;
    if (val > 65) return `[EXTREME FOCUS]: ${sliderDesc.rightDesc}`;
    return `[BALANCED FOCUS]: '${sliderDesc.leftLabel}'과 '${sliderDesc.rightLabel}'의 완벽한 형태적 조화`;
};

export const getSliderTextKo = (val) => {
    if (val < 35) return `[극단적 집중]: ${sliderDesc.leftDesc}`;
    if (val > 65) return `[극단적 집중]: ${sliderDesc.rightDesc}`;
    return `[균형적 집중]: '${sliderDesc.leftLabel}'과 '${sliderDesc.rightLabel}'의 완벽한 조화`;
};
