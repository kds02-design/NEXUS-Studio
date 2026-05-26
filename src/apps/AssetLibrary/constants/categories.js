// 에셋 카테고리 — 잘라낸 영역을 분류해서 저장. PromptArc ARC_CATEGORIES 패턴.
// 새 카테고리 추가 시 ASSET_CATEGORIES 에만 추가하면 사이드바·그리드 모두 자동 반영.
import React from "react";
import { Type, MousePointerClick, Square, Package, Sparkles, Folder, ListChecks, Heart, CheckCircle2, Clock } from "lucide-react";

// 카테고리 — 사이드바 active 표시·내부 액센트용으로 컬러 보관. 카드 딱지는 무채색으로 렌더.
export const ASSET_CATEGORY_LIST = [
  { id: "title",  name: "타이틀", color: "#A29BFE" },
  { id: "button", name: "버튼",   color: "#0eb9b3" },
  { id: "box",    name: "박스",   color: "#FDCB6E" },
  { id: "item",   name: "아이템", color: "#FD79A8" },
  { id: "icon",   name: "아이콘", color: "#74B9FF" },
  { id: "etc",    name: "기타",   color: "#7A7A9A" },
];

// 카드 좌상단 카테고리 딱지용 무채색 톤 — 어두운 zinc.
export const CATEGORY_BADGE_TONE = {
  bg: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.18)",
  text: "#d4d4d8", // zinc-300
};

// 임시 (가공 전 캡처) 딱지 — 강조 색. 처리 완료 후 제거.
export const TEMP_BADGE_TONE = {
  bg: "rgba(245,158,11,0.18)",  // amber-500/18
  border: "rgba(245,158,11,0.55)",
  text: "#fbbf24",              // amber-400
};

const ICON_BY_ID = {
  title:  Type,
  button: MousePointerClick,
  box:    Square,
  item:   Package,
  icon:   Sparkles,
  etc:    Folder,
};

export const getCategoryIcon = (id, size = 18) => {
  const I = ICON_BY_ID[id] || Folder;
  return React.createElement(I, { size });
};

// 사이드바 nav 항목 — 전체 / 즐겨찾기 / 임시 / 업로드 완료 / divider / 카테고리들.
export const ASSET_NAV_ITEMS = [
  { id: "all",       name: "전체 보기",   icon: React.createElement(ListChecks, { size: 18 }) },
  { id: "favorites", name: "즐겨찾기",     icon: React.createElement(Heart,      { size: 18 }) },
  { id: "temp",      name: "임시",         icon: React.createElement(Clock,       { size: 18 }), color: TEMP_BADGE_TONE.text },
  { id: "uploaded",  name: "업로드 완료",   icon: React.createElement(CheckCircle2,{ size: 18 }), color: "#10b981" },
  { type: "divider" },
  ...ASSET_CATEGORY_LIST.map((c) => ({
    id: c.id, name: c.name, icon: getCategoryIcon(c.id), color: c.color,
  })),
];

export const getCategoryMeta = (id) =>
  ASSET_CATEGORY_LIST.find((c) => c.id === id) || ASSET_CATEGORY_LIST[ASSET_CATEGORY_LIST.length - 1];

// 임시 여부 — 명시적으로 isTemp:false 일 때만 false. 옛 데이터(undefined) 는 임시로 취급.
export const isTempAsset = (asset) => asset?.isTemp !== false;
