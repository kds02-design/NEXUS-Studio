/* eslint-disable */
// v1 전용 유틸 (격리 사본). 절대로 versions/current 가 사용하는 모듈을 참조하지 않는다.

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

export const parseJSON = (text) => {
    if (!text) return null;
    try {
        let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startObj = clean.indexOf('{');
        const startArr = clean.indexOf('[');

        if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
            let end = clean.lastIndexOf('}');
            while (end > startObj) {
                try {
                    return JSON.parse(clean.substring(startObj, end + 1));
                } catch (err) {
                    end = clean.lastIndexOf('}', end - 1);
                }
            }
        } else if (startArr !== -1) {
            let end = clean.lastIndexOf(']');
            while (end > startArr) {
                try {
                    return JSON.parse(clean.substring(startArr, end + 1));
                } catch (err) {
                    end = clean.lastIndexOf(']', end - 1);
                }
            }
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const getOptionEn = (list, id) => list.find(o => o.id === id)?.en || String(id);

export const combineOptions = (baseList, currentValue, dynamicNames = {}) => {
    if (!currentValue) return baseList;
    if (baseList.find(o => o.id === currentValue)) return baseList;
    return [{ id: currentValue, name: `✨ ${dynamicNames[currentValue] || currentValue}`, en: currentValue }, ...baseList];
};
