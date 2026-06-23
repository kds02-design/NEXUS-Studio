// 벡터 생성(Gemini SVG) 모드 옵션.
// Gemini 텍스트 모델이 <svg> 마크업을 직접 출력 → 진짜 벡터(편집·확대·초경량).
// 화려한 3D 가 아니라 "깔끔한 플랫/라인 벡터" 에 포지셔닝 — 잘 되는 영역만 다룬다.

// 카테고리 — 벡터가 잘 되는 순. viewBox 종횡비도 용도에 맞춤.
export const VECTOR_CATEGORIES = [
  {
    id: 'bullet', label: '불릿 · 아이콘 · 배지', desc: '머릿점 · 작은 아이콘 · NEW/도장 배지',
    accent: '#76cee0', viewBox: '0 0 64 64',
    promptHint: 'small UI bullet point / icon / badge mark (compact, centered, single focal symbol)',
    placeholder: '예: 마름모 머릿점 / 별 배지 / 체크 아이콘 / NEW 리본 도장',
  },
  {
    id: 'divider', label: '구분선 · 코너 장식', desc: '디바이더 · 코너 오너먼트 · 라인 플로리시',
    accent: '#d4af37', viewBox: '0 0 240 48',
    promptHint: 'horizontal decorative divider line or corner ornament flourish (symmetric, thin elegant linework)',
    placeholder: '예: 가운데 마름모 디바이더 / 좌우 대칭 넝쿨 라인 / 코너 필리그리',
  },
  {
    id: 'frame', label: '프레임 · 패널', desc: '배너/카드 테두리 프레임',
    accent: '#c084fc', viewBox: '0 0 320 200',
    promptHint: 'rectangular UI frame / panel border with empty center (clean geometric or line-ornament edge, hollow middle)',
    placeholder: '예: 모서리 깎인 사각 프레임 / 라운드 카드 테두리 / 코너 장식 패널',
  },
];
export const VECTOR_CATEGORY_BY_ID = Object.fromEntries(VECTOR_CATEGORIES.map(c => [c.id, c]));

// 스타일 — 벡터 룩의 결.
export const VECTOR_STYLES = [
  { id: 'line',    label: '라인',      desc: '선만 · 채움 없음',
    hint: 'clean thin line-art, stroke only, no fill, consistent stroke width, minimal' },
  { id: 'flat',    label: '플랫 채움',  desc: '단색 면',
    hint: 'flat filled solid shapes, bold and minimal, no gradients, no outline noise' },
  { id: 'duotone', label: '듀오톤',    desc: '메인+액센트 2색',
    hint: 'two-tone flat design — a primary fill plus one accent color used sparingly for emphasis' },
  { id: 'ornate',  label: '장식 라인',  desc: '대칭 필리그리',
    hint: 'ornamental filigree line-art, symmetric and decorative, but still flat clean vector strokes' },
];
export const VECTOR_STYLE_BY_ID = Object.fromEntries(VECTOR_STYLES.map(s => [s.id, s]));

// 팔레트 — primary + accent 헥스. Gemini 에 그대로 전달.
export const VECTOR_PALETTES = [
  { id: 'gold',    label: '골드',        primary: '#d4af37', accent: '#8a6d1f', swatch: 'linear-gradient(135deg,#d4af37,#8a6d1f)' },
  { id: 'crimson', label: '크림슨',      primary: '#c41e3a', accent: '#6e0f1d', swatch: 'linear-gradient(135deg,#c41e3a,#6e0f1d)' },
  { id: 'cyan',    label: '시안',        primary: '#76cee0', accent: '#2f7d8c', swatch: 'linear-gradient(135deg,#76cee0,#2f7d8c)' },
  { id: 'violet',  label: '바이올렛',    primary: '#c084fc', accent: '#7c3aed', swatch: 'linear-gradient(135deg,#c084fc,#7c3aed)' },
  { id: 'mono',    label: '모노(화이트)', primary: '#ffffff', accent: '#9ca3af', swatch: 'linear-gradient(135deg,#ffffff,#9ca3af)' },
];
export const VECTOR_PALETTE_BY_ID = Object.fromEntries(VECTOR_PALETTES.map(p => [p.id, p]));

// 한 번에 생성할 변형 수.
export const VECTOR_COUNTS = [2, 4, 6];
