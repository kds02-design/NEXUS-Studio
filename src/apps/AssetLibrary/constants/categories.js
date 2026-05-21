// 에셋 카테고리 — 잘라낸 영역을 분류해서 저장. PromptArc ARC_CATEGORIES 패턴.
// 새 카테고리 추가 시 ASSET_CATEGORIES 에만 추가하면 사이드바·그리드 모두 자동 반영.
import React from "react";
import { Type, MousePointerClick, Square, Package, Sparkles, Folder, ListChecks, Heart } from "lucide-react";

export const ASSET_CATEGORY_LIST = [
  { id: "title",  name: "타이틀", color: "#A29BFE" },
  { id: "button", name: "버튼",   color: "#0eb9b3" },
  { id: "box",    name: "박스",   color: "#FDCB6E" },
  { id: "item",   name: "아이템", color: "#FD79A8" },
  { id: "icon",   name: "아이콘", color: "#74B9FF" },
  { id: "etc",    name: "기타",   color: "#7A7A9A" },
];

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

// 사이드바 nav 항목 — '전체 / 즐겨찾기 / divider / 카테고리들'.
export const ASSET_NAV_ITEMS = [
  { id: "all",       name: "전체 보기",   icon: React.createElement(ListChecks, { size: 18 }) },
  { id: "favorites", name: "즐겨찾기",     icon: React.createElement(Heart,      { size: 18 }) },
  { type: "divider" },
  ...ASSET_CATEGORY_LIST.map((c) => ({
    id: c.id, name: c.name, icon: getCategoryIcon(c.id), color: c.color,
  })),
];

export const getCategoryMeta = (id) =>
  ASSET_CATEGORY_LIST.find((c) => c.id === id) || ASSET_CATEGORY_LIST[ASSET_CATEGORY_LIST.length - 1];
