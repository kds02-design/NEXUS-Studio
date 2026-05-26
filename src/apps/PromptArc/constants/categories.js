import { Type, Tag, Wand2, Play, Folder, Heart, ListChecks } from "lucide-react";
import React from "react";

// 상단 필터는 aiKeywords / stepKeywords 안에서 키워드 OR 매칭으로 동작.
// (tags / stepTags 는 '타이포'/'버튼'/'visualFX' 같은 카테고리 분류용이고,
//  실제 스타일·테마 정보는 키워드 필드에 저장되어 있음.)
export const STYLE_FILTERS = [
  { id: '2d_bw',       label: '2D/흑백',       keywords: ['2D/흑백', '2d', '흑백'] },
  { id: '3d_render',   label: '3D/렌더링',     keywords: ['3D/렌더링', '3d', '렌더링'] },
  { id: 'calligraphy', label: '캘리그라피',     keywords: ['캘리그라피', 'calligraphy'] },
];

export const THEME_FILTERS = [
  { id: 'rpg_fantasy',     label: 'RPG/판타지',     keywords: ['RPG', '판타지'] },
  { id: 'casual_cartoon',  label: '캐주얼/카툰',    keywords: ['캐주얼', '카툰'] },
  { id: 'sf_cyberpunk',    label: 'SF/사이버펑크',  keywords: ['SF', '사이버펑크'] },
];

export const ARC_CATEGORIES = [
  { id:'all', name:'전체 보기', icon: React.createElement(ListChecks, { size: 18 }) },
  { id:'즐겨찾기', name:'즐겨찾기', icon: React.createElement(Heart, { size: 18 }) },
  { type:'folders' }, // "내 폴더" 그룹 — 내부에 "내 비공개" + 사용자 폴더 목록
  { type:'divider' },
  { id:'타이포', name:'타이포', icon: React.createElement(Type, { size: 18 }) },
  { id:'버튼', name:'버튼', icon: React.createElement(Tag, { size: 18 }) },
  { id:'visualFX', name:'VisualFX', icon: React.createElement(Wand2, { size: 18 }) },
  { id:'Motion', name:'Motion', icon: React.createElement(Play, { size: 18 }) },
  { id:'기타', name:'기타', icon: React.createElement(Folder, { size: 18 }) },
];

// stepTags / tags가 저장 시점·임포트 시점에 따라 모양이 다를 수 있어 정규화.
export const toArrayMaybeJson = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try { const parsed = JSON.parse(s); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
  }
  return [];
};

// stepTags가 [[t,t],[t]] (정상), [t,t] (평탄 단일 스텝), 또는 JSON 문자열일 수 있음.
export const collectStepTags = (stepTags) => {
  const out = new Set();
  for (const entry of toArrayMaybeJson(stepTags)) {
    if (Array.isArray(entry)) {
      entry.forEach(t => { if (t) out.add(t); });
    } else if (typeof entry === 'string') {
      const nested = toArrayMaybeJson(entry);
      if (nested.length > 0) nested.forEach(t => { if (t) out.add(t); });
      else if (entry) out.add(entry);
    }
  }
  return out;
};

export const hasTagOf = (p, tag) => {
  if (!tag) return false;
  if (toArrayMaybeJson(p?.tags).includes(tag)) return true;
  return collectStepTags(p?.stepTags).has(tag);
};

// 프롬프트의 aiKeywords + stepKeywords 를 모두 합쳐 하나의 lowercase 문자열로 만든다.
export const buildKeywordHaystack = (p) => {
  const parts = [];
  if (typeof p?.aiKeywords === 'string' && p.aiKeywords) parts.push(p.aiKeywords);
  for (const sk of toArrayMaybeJson(p?.stepKeywords)) {
    if (typeof sk === 'string' && sk) parts.push(sk);
    else if (Array.isArray(sk)) {
      for (const x of sk) if (typeof x === 'string' && x) parts.push(x);
    }
  }
  return parts.join(' | ').toLowerCase();
};

// 필터 정의의 keywords 중 하나라도 prompt 의 키워드 haystack 에 substring 으로 포함되면 매칭.
export const matchesFilter = (p, def) => {
  if (!def) return true;
  const list = def.keywords || [];
  if (list.length === 0) return true;
  const hay = buildKeywordHaystack(p);
  if (!hay) return false;
  return list.some(kw => hay.includes(String(kw).toLowerCase()));
};

export const isUnanalyzed = (p) =>
  !p.aiKeywords && !p.description &&
  !(Array.isArray(p.tags) && p.tags.some(t => t && t !== '기타'));

// 연관 아이템 분류용 type. tags + keywords + 기존 type 필드를 종합해서 판단.
// 우선순위: 기존 video 표식 → '모션', 그 외에는 키워드/태그 신호로 결정.
export const RELATED_TYPES = ['2D', '3D/렌더링', '모션', '기타'];

export const inferRelatedType = (p) => {
  if (!p) return '기타';
  if (p.type === 'video' || p.type === '모션') return '모션';
  const tags = new Set([
    ...toArrayMaybeJson(p.tags).map(String),
    ...collectStepTags(p.stepTags),
  ]);
  if (tags.has('Motion')) return '모션';
  const hay = buildKeywordHaystack(p);
  if (/3d|렌더링|render/i.test(hay) || tags.has('visualFX')) return '3D/렌더링';
  if (/2d|흑백|타이포|캘리그라피/i.test(hay) || tags.has('타이포')) return '2D';
  return '기타';
};
