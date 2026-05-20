/* eslint-disable */
// v1 전용 유틸 — 원본 PromptEngine.jsx 의 헬퍼들을 그대로 옮긴 격리 사본.

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

export const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new window.Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
        };
    });
};

export const sliderDesc = {
    leftLabel: "무게감", rightLabel: "예리함", leftDesc: "거대 암석(Monolith) 같은 묵직하고 파괴 불가능한 실루엣", rightDesc: "공간을 베어내는 듯한 극단적인 칼날(Blade)의 예리함"
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

export const dictionary = {
    ko: {
        cancel: "취소", save: "저장하기", loadSettings: "에디터로 설정 불러오기"
    }
};

export const aiOptimizationModels = [
    { id: 'NanoBanana', name: 'Nano Banana 2' },
    { id: 'ChatGPT', name: 'ChatGPT' },
    { id: 'Midjourney', name: 'Midjourney' }
];
