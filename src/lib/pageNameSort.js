// 브랜드웹 페이지 파일명 유추 정렬 — BrandWebReview 신규 등록과
// PromotionArchive 기존 항목 재정렬에서 공유.
//
// 우선순위:
//   1) 'main' / 'index' / 'home' 토큰 → 최우선 (메인 페이지로 추정)
//   2) 선행 숫자 (01_xxx, 02-yyy, 1.png) → 숫자 오름차순
//   3) 중간 숫자 → 그 숫자 기준
//   4) 숫자 없음 → 알파벳 순 마지막
export function getPageNameRank(name) {
  const stem = String(name || "").toLowerCase().replace(/\.[^.]+$/, "");
  if (/(^|[_\s-])main([_\s-]|$)/.test(stem) || /^(index|home)([_\s-]|$|\d)/.test(stem)) {
    return [0, 0, stem];
  }
  const lead = stem.match(/^(\d+)/);
  if (lead) return [1, parseInt(lead[1], 10), stem];
  const any = stem.match(/(\d+)/);
  if (any) return [2, parseInt(any[1], 10), stem];
  return [3, 0, stem];
}

export function comparePagesByName(a, b) {
  const ra = getPageNameRank(a?.name);
  const rb = getPageNameRank(b?.name);
  if (ra[0] !== rb[0]) return ra[0] - rb[0];
  if (ra[1] !== rb[1]) return ra[1] - rb[1];
  return String(ra[2]).localeCompare(String(rb[2]));
}

// device 별로 독립 정렬 → PC, Mobile, 기타 순으로 합치고 order 재부여.
// PreviewModal 의 페이지 navigator 가 device 별로 filter() 만 하기 때문에
// 각 device 안 순서가 곧 표시 순서가 된다.
export function sortPagesByName(pages) {
  if (!Array.isArray(pages) || pages.length === 0) return [];
  const pcSorted     = pages.filter(p => p?.device === "pc").sort(comparePagesByName);
  const mobileSorted = pages.filter(p => p?.device === "mobile").sort(comparePagesByName);
  const otherSorted  = pages.filter(p => p?.device !== "pc" && p?.device !== "mobile").sort(comparePagesByName);
  return [...pcSorted, ...mobileSorted, ...otherSorted].map((p, idx) => ({ ...p, order: idx }));
}
