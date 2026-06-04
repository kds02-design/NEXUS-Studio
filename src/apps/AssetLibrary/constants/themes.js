// 에셋 컬러톤 테마 — 다크판타지 비중이 압도적이라 톤 4단계로 단순화.
// AI 추정 + 사용자 수동 편집. null 은 "미지정" (기존 에셋 + 추정 실패).
//
// 키는 짧고 고정. 라벨/스와치 컬러만 UI 에서 사용.
export const ASSET_THEME_LIST = [
  { id: "brown",     name: "브라운",      swatch: "#A0826D" },
  { id: "darkbrown", name: "다크 브라운", swatch: "#4A2E1F" },
  { id: "blue",      name: "블루",        swatch: "#4A7BB6" },
  { id: "light",     name: "라이트",      swatch: "#E8E4DC" },
];

export const ASSET_THEME_IDS = ASSET_THEME_LIST.map((t) => t.id);

export const getThemeMeta = (id) =>
  ASSET_THEME_LIST.find((t) => t.id === id) || null;

// AI 추정 자동실행 토글 — localStorage 키.
// 기본 ON. 사용자가 OFF 하면 RegionPicker 저장 직후 추정 호출 스킵.
export const ASSET_AUTO_THEME_KEY = "asset-library:auto-theme";
export const isAutoThemeEnabled = () => {
  try {
    const v = localStorage.getItem(ASSET_AUTO_THEME_KEY);
    return v !== "false";
  } catch { return true; }
};
export const setAutoThemeEnabled = (on) => {
  try { localStorage.setItem(ASSET_AUTO_THEME_KEY, on ? "true" : "false"); } catch {}
};
