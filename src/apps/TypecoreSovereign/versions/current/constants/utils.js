/* eslint-disable */
// 버전 스냅샷: TypecoreSovereign current. 격리된 유틸 사본.

export const TYPECORE_VERSION = "18.0.0";

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

export const sliderDesc = {
  leftLabel: "무게감 (Mass)",
  rightLabel: "예리함 (Sharpness)",
  leftDesc: "거대 암석 같은 묵직한 실루엣",
  rightDesc: "공간을 베어내는 듯한 예리함",
};

export const getSliderText = (val) => {
  if (val < 35) return `(extreme heavy mass and solid monumentality:1.3)`;
  if (val > 65) return `(extreme razor-sharp incisive edges:1.3)`;
  return `balanced equilibrium between mass and sharpness`;
};

export const aiOptimizationModels = [
  { id: 'NanoBanana', name: 'Nano Banana 2' },
  { id: 'Midjourney', name: 'Midjourney' },
  { id: 'ChatGPT', name: 'ChatGPT (DALL-E)' }
];
