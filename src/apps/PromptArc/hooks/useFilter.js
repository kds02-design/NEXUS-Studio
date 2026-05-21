import { useMemo } from "react";
import {
  STYLE_FILTERS, THEME_FILTERS,
  hasTagOf, matchesFilter, isUnanalyzed,
} from "../constants/categories";

export function useFilter({ prompts, searchTerm, category, sortOption, favoriteIds, folders, filters, currentUid }) {
  return useMemo(() => {
    // 본인 소유 판단 — ownerUid 가 없는 구프롬프트는 authorId 폴백.
    const isMine = (p) =>
      !!currentUid && (
        (p.ownerUid && p.ownerUid === currentUid) ||
        (!p.ownerUid && p.authorId && p.authorId === currentUid)
      );

    let folderItems = null;
    if (typeof category === 'string' && category.startsWith('folder:')) {
      const fid = category.slice(7);
      const f = folders.find(x => x.id === fid);
      folderItems = new Set(f?.items || []);
    }
    const styleDef = filters.style ? STYLE_FILTERS.find(f => f.id === filters.style) : null;
    const themeDef = filters.theme ? THEME_FILTERS.find(f => f.id === filters.theme) : null;
    let result = prompts.filter(p => {
      // visibility 가드 — 비공개는 본인에게만 노출.
      if (p.visibility === 'private' && !isMine(p)) return false;

      const term = searchTerm.toLowerCase();
      const matchSearch = [p.title, p.content, p.description, p.aiKeywords, ...(p.stepPrompts || []), ...(p.stepKeywords || []), ...(p.stepDescriptions || [])].some(s => (s || '').toLowerCase().includes(term));
      const matchCategory =
        category === 'all' ? true :
        category === '즐겨찾기' ? favoriteIds.has(p.id) :
        category === 'my_private' ? (isMine(p) && p.visibility === 'private') :
        folderItems ? folderItems.has(p.id) :
        hasTagOf(p, category);
      let matchTopFilter = true;
      if (styleDef && !matchesFilter(p, styleDef)) matchTopFilter = false;
      if (matchTopFilter && themeDef && !matchesFilter(p, themeDef)) matchTopFilter = false;
      if (matchTopFilter && filters.unanalyzed && !isUnanalyzed(p)) matchTopFilter = false;
      return matchSearch && matchCategory && matchTopFilter;
    });
    return result.sort((a, b) => {
      // 1순위: LIVE
      const aLive = a.isLive ? 1 : 0;
      const bLive = b.isLive ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      // 2순위: 추천(isPinned)
      const aPin = a.isPinned ? 1 : 0;
      const bPin = b.isPinned ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      // 3순위: 사용자 정렬 옵션
      if (sortOption === 'popular') return (b.views || 0) - (a.views || 0);
      if (sortOption === 'top_rated') return (b.likeCount || 0) - (a.likeCount || 0);
      if (sortOption === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [prompts, searchTerm, category, sortOption, favoriteIds, folders, filters, currentUid]);
}
