// 디자인 렉시콘 카테고리 정의.
// 각 텀(seed.js)은 category 필드로 여기 id 중 하나를 가리킨다.
// "all" 은 사이드바 전체 보기용 가상 카테고리.

export const CATEGORIES = [
  { id: "all",         label: "전체",   ko: "전체",        color: "#55EFC4" },
  { id: "typography",  label: "Typography", ko: "타이포그래피", color: "#A29BFE" },
  { id: "color",       label: "Color",      ko: "색채",         color: "#FD79A8" },
  { id: "layout",      label: "Layout",     ko: "레이아웃",     color: "#74B9FF" },
  { id: "composition", label: "Composition", ko: "구성·시지각", color: "#FDCB6E" },
  { id: "motion",      label: "Motion",     ko: "모션",         color: "#0eb9b3" },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
