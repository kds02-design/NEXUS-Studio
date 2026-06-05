// 분석된 배너를 타이틀 기준으로 종류별로 그룹화하고, 종류별 평가 리포트 생성.
//
// 1. normalizePromotionTitle — 연도/월/대괄호 prefix 등 가변 부분을 제거해 종류 키로 정규화
// 2. groupBannersByType         — 정규화 키별로 배너 묶기 (분석된 것만)
// 3. computeGroupStats           — 평가 기준별 평균/중앙값/min/max + 상위/하위 사례
// 4. renderGroupReport           — Markdown 문서 빌드

// ─── 정규화 ──────────────────────────────────────────────────────────────────
// 흔한 가변 prefix 패턴:
//   "[블레이드앤소울] 2025년 5월 오늘의 상품 스페셜"
//   "2025.05 오늘의 상품 스페셜"
//   "5월 오늘의 상품 스페셜"
// → "오늘의 상품 스페셜"
export function normalizePromotionTitle(title) {
  let s = String(title || '').trim();
  // 대괄호 / 소괄호 메타 prefix 제거 (반복)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/^\[[^\]]*\]\s*/g, '');
    s = s.replace(/^\([^)]*\)\s*/g, '');
  }
  // 연도 + 월 prefix 제거 — 다양한 구분자(년/./공백/-)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/^20\d{2}\s*[년.\-/]?\s*/g, '');
    s = s.replace(/^\d{1,2}\s*[월.\-/]\s*/g, '');
    s = s.replace(/^\d{1,2}\s*월\s*/g, '');
  }
  // 후행 공백·하이픈·콜론 등 잡음 정리
  s = s.replace(/^[\s\-:|]+/, '').replace(/[\s\-:|]+$/, '');
  return s.trim() || '제목 없음';
}

// ─── 그룹화 ──────────────────────────────────────────────────────────────────
// banners: PromotionArchive 의 allBanners 전체. isWebAnalyzed=true 인 것만 집계.
// 반환: [{ groupKey, banners, count }] — count desc 정렬.
export function groupBannersByType(banners, opts = {}) {
  const minCount = opts.minCount || 1;
  const map = new Map();
  for (const b of (banners || [])) {
    if (!b.isWebAnalyzed) continue;
    const key = normalizePromotionTitle(b.title);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(b);
  }
  return Array.from(map.entries())
    .map(([groupKey, bs]) => ({ groupKey, banners: bs, count: bs.length }))
    .filter(g => g.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

// ─── 통계 ──────────────────────────────────────────────────────────────────
function _median(sorted) {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return +((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
  return sorted[mid];
}

export function computeGroupStats(group, criteriaItems) {
  const items = Array.isArray(criteriaItems) ? criteriaItems : [];
  const perCriteria = {};
  for (const c of items) {
    const key = c.id;
    if (!key) continue;
    const scores = group.banners
      .map(b => b.webScores?.[key]?.score)
      .filter(s => typeof s === 'number');
    if (scores.length === 0) { perCriteria[key] = { count: 0 }; continue; }
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    perCriteria[key] = {
      count:  sorted.length,
      mean:   +mean.toFixed(1),
      median: _median(sorted),
      min:    sorted[0],
      max:    sorted[sorted.length - 1],
    };
  }
  const aiScores = group.banners.map(b => b.webAiScore).filter(s => typeof s === 'number');
  const overall = aiScores.length === 0 ? null : {
    mean: +(aiScores.reduce((a, b) => a + b, 0) / aiScores.length).toFixed(2),
    max:  Math.max(...aiScores),
    min:  Math.min(...aiScores),
    count: aiScores.length,
  };
  // 상위/하위 — webAiScore 기준 정렬, 동점이면 안정성 위해 원본 순서 유지
  const indexed = group.banners.map((b, i) => ({ b, i, s: b.webAiScore ?? -Infinity }));
  indexed.sort((a, b) => b.s - a.s || a.i - b.i);
  const topPerformers    = indexed.slice(0, 3).map(x => x.b);
  const bottomPerformers = indexed.slice(-3).reverse().map(x => x.b)
    .filter(b => b.webAiScore != null);
  return { perCriteria, overall, topPerformers, bottomPerformers };
}

// ─── 리포트 마크다운 빌드 ────────────────────────────────────────────────────
// 평가 기준 라벨은 criteriaItems[i].label 우선, 없으면 id.
function _criteriaLabel(c) { return c?.label || c?.name || c?.id || '(unknown)'; }

export function renderGroupReport(group, stats, criteriaItems) {
  const items = Array.isArray(criteriaItems) ? criteriaItems : [];
  const lines = [];
  lines.push(`# ${group.groupKey} — 디자인 평가 리포트`);
  lines.push('');
  lines.push(`- 분석 대상: **${group.count}건**`);
  if (stats.overall) {
    lines.push(`- AI 점수 평균: **${stats.overall.mean} / 10**  (최고 ${stats.overall.max}, 최저 ${stats.overall.min}, 표본 ${stats.overall.count})`);
  }
  lines.push('');

  // 점수 분포 표
  lines.push(`## 평가 기준별 점수 분포`);
  lines.push('');
  lines.push('| 기준 | 평균 | 중앙값 | 최저 | 최고 | 표본 |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const c of items) {
    const s = stats.perCriteria[c.id];
    if (!s || !s.count) continue;
    lines.push(`| ${_criteriaLabel(c)} | ${s.mean} | ${s.median} | ${s.min} | ${s.max} | ${s.count} |`);
  }
  lines.push('');

  // 상위 / 하위 사례
  if (stats.topPerformers.length) {
    lines.push(`## 상위 사례 (AI 점수 높음)`);
    for (const b of stats.topPerformers) {
      if (!b) continue;
      const yr = b.year ? `${b.year}` : '';
      const mo = b.month ? `${b.month}월` : '';
      const meta = [yr, mo, b.game].filter(Boolean).join(' · ');
      lines.push(`- **${b.title || b.id}** — AI ${b.webAiScore ?? '-'} / 10${meta ? `  · ${meta}` : ''}`);
      if (b.summary) lines.push(`  - ${String(b.summary).slice(0, 200)}`);
    }
    lines.push('');
  }
  if (stats.bottomPerformers.length) {
    lines.push(`## 하위 사례 (AI 점수 낮음)`);
    for (const b of stats.bottomPerformers) {
      if (!b) continue;
      const yr = b.year ? `${b.year}` : '';
      const mo = b.month ? `${b.month}월` : '';
      const meta = [yr, mo, b.game].filter(Boolean).join(' · ');
      lines.push(`- **${b.title || b.id}** — AI ${b.webAiScore ?? '-'} / 10${meta ? `  · ${meta}` : ''}`);
      if (b.summary) lines.push(`  - ${String(b.summary).slice(0, 200)}`);
    }
    lines.push('');
  }

  // 평가 기준별 reason 패턴
  lines.push(`## 평가 기준별 reason 패턴`);
  lines.push('');
  lines.push(`각 기준에서 7점 이상 받은 케이스의 reason (잘 받는 패턴) 과 4점 이하 케이스의 reason (못 받는 패턴) 을 모았습니다. 새 디자인이 이 기준에서 어떻게 평가될지 가늠하는 체크리스트로 활용하세요.`);
  lines.push('');
  for (const c of items) {
    const s = stats.perCriteria[c.id];
    if (!s || !s.count) continue;
    const label = _criteriaLabel(c);
    const high = group.banners
      .filter(b => (b.webScores?.[c.id]?.score ?? -1) >= 7)
      .map(b => b.webScores[c.id].reason).filter(Boolean);
    const low  = group.banners
      .filter(b => (b.webScores?.[c.id]?.score ?? 11) <= 4)
      .map(b => b.webScores[c.id].reason).filter(Boolean);
    lines.push(`### ${label}`);
    lines.push(`평균 ${s.mean} · 표본 ${s.count}`);
    lines.push('');
    if (high.length) {
      lines.push(`**잘 받는 케이스 reason (${high.length}건):**`);
      high.slice(0, 5).forEach(r => lines.push(`- ${r}`));
      lines.push('');
    }
    if (low.length) {
      lines.push(`**못 받는 케이스 reason (${low.length}건):**`);
      low.slice(0, 5).forEach(r => lines.push(`- ${r}`));
      lines.push('');
    }
    if (!high.length && !low.length) {
      lines.push(`(7점 이상/4점 이하 케이스 없음 — 모두 중간 점수대)`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
