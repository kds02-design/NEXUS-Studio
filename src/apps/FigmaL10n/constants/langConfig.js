// 언어 코드별 폰트/표시명 매핑.
// 엑셀 컬럼 헤더(대문자)로 언어를 자동 감지하고, 생성되는 Figma 플러그인이
// 언어별 Noto Sans 패밀리로 폰트를 교체할 때 이 표를 그대로 굽는다.
export const LANG_CONFIG = {
  TW: { font: 'Noto Sans TC',      name: '繁體中文',         flag: '🇹🇼' },
  CN: { font: 'Noto Sans SC',      name: '简体中文',         flag: '🇨🇳' },
  JA: { font: 'Noto Sans JP',      name: '日本語',           flag: '🇯🇵' },
  KO: { font: 'Noto Sans KR',      name: '한국어',           flag: '🇰🇷' },
  EN: { font: 'Noto Sans',         name: 'English',          flag: '🇺🇸' },
  DE: { font: 'Noto Sans',         name: 'Deutsch',          flag: '🇩🇪' },
  ES: { font: 'Noto Sans',         name: 'Español',          flag: '🇪🇸' },
  FR: { font: 'Noto Sans',         name: 'Français',         flag: '🇫🇷' },
  PT: { font: 'Noto Sans',         name: 'Português',        flag: '🇵🇹' },
  IT: { font: 'Noto Sans',         name: 'Italiano',         flag: '🇮🇹' },
  RU: { font: 'Noto Sans',         name: 'Русский',          flag: '🇷🇺' },
  TH: { font: 'Noto Sans Thai',    name: 'ไทย',              flag: '🇹🇭' },
  VI: { font: 'Noto Sans',         name: 'Tiếng Việt',       flag: '🇻🇳' },
  AR: { font: 'Noto Sans Arabic',  name: 'العربية',           flag: '🇸🇦' },
  ID: { font: 'Noto Sans',         name: 'Bahasa Indonesia', flag: '🇮🇩' },
};

// 언어가 아닌 메타 컬럼 — 자동 감지에서 제외.
export const META_COLUMNS = ['분류', '비고', 'CATEGORY', 'NOTE'];
