#!/usr/bin/env node
// build-layout-spec.mjs — 프로모션 페이지·포스트 브리프(JSON) → layout-spec.json + wireframe.svg
//
//   node build-layout-spec.mjs --brief brief.json --out-dir ./layout-out [--width 1920]
//   node build-layout-spec.mjs --validate layout-spec.json
//
// 좌표의 단일 진실 소스는 src/apps/NexusPreview/components/promoLayouts.jsx (PROMO_LAYOUTS). 이 스크립트는 그 실측값을
// references/page-grammars.md 와 같은 숫자로 들고 있으며, 새 좌표를 만들지 않고 섹션을 그 리듬대로 쌓기만 한다.
// 의존성 없음 (Node 18+).

import fs from "node:fs";
import path from "node:path";

// ───────────────────────── 포맷 정의 ─────────────────────────
const PAGE_FORMATS = {
  "promo-pc": {
    kind: "page",
    canvas: { w: 3000, minH: 3620 },
    exportH: 1688,
    fadeStart: 0.62,
    kvSafe: { x: 540, w: 1920 },
    content: { x: 950, w: 1100 },
    contentStart: { osangseu: 1026, refine: 1050, scroll: 1050 },
    rhythm: { section: 170, block: 40, badgeToTitle: 85, titleToSub: { osangseu: 0, refine: 17, scroll: 17 }, subToBody: { osangseu: 12, refine: 28, scroll: 28 }, titleToBody: { osangseu: 12, refine: 68, scroll: 68 }, bodyToCta: 40, bottomPad: 200 },
    type: { badge: 60, title: 100, subtitle: 40, subheading: 64, note: 34, cta: { w: 420, h: 96 }, tabs: { w: 700, h: 120 } },
    grid: {
      "product-grid": { cols: 4, ratio: 366 / 278, gap: 0 },
      "bonus-grid": { cols: 5, ratio: 402 / 228, gap: 0 },
      "selection-grid": { cols: 4, ratio: 1.2, gap: 24 },
      "result-grid": { cols: 5, ratio: 1.0, gap: 24 },
    },
    hero: {
      title: { x: 950, y: 300, w: 1100, h: 400 },
      female: { x: 620, y: 240, w: 840, h: 1400 },
      male: { x: 1560, y: 220, w: 840, h: 1420 },
      center: { x: 1080, y: 220, w: 840, h: 1420 },
      dateOsangseu: { x: 900, y: 760, w: 1200, h: 110 },
      sub: { x: 1050, y: 720, w: 900, h: 120 },
      date: { x: 1100, y: 860, w: 800, h: 90 },
      tabs: { x: 1150, y: 970, w: 700, h: 120 },
    },
  },
  "promo-mobile": {
    kind: "page",
    canvas: { w: 750, minH: 5000 },
    exportH: 1000,
    fadeStart: 0.7,
    kvSafe: { x: 0, w: 750 },
    content: { x: 30, w: 690 },
    contentStart: { osangseu: 1040, refine: 1040, scroll: 1040 },
    stickyCta: 120,
    rhythm: { section: 110, block: 28, badgeToTitle: 56, titleToSub: { osangseu: 8, refine: 12, scroll: 12 }, subToBody: { osangseu: 20, refine: 24, scroll: 24 }, titleToBody: { osangseu: 24, refine: 40, scroll: 40 }, bodyToCta: 28, bottomPad: 60 },
    type: { badge: 44, title: 64, subtitle: 34, subheading: 48, note: 30, cta: { w: 600, h: 96 }, tabs: { w: 690, h: 88 } },
    grid: {
      "product-grid": { cols: 2, ratio: 1.32, gap: 20 },
      "bonus-grid": { cols: 3, ratio: 1.6, gap: 16 },
      "selection-grid": { cols: 2, ratio: 1.2, gap: 20 },
      "result-grid": { cols: 3, ratio: 1.0, gap: 16 },
    },
    hero: {
      title: { x: 75, y: 220, w: 600, h: 260 },
      center: { x: 0, y: 380, w: 750, h: 620 },
      female: { x: 0, y: 380, w: 400, h: 620 },
      male: { x: 350, y: 380, w: 400, h: 620 },
      dateOsangseu: { x: 75, y: 880, w: 600, h: 60 },
      sub: { x: 75, y: 500, w: 600, h: 60 },
      date: { x: 75, y: 880, w: 600, h: 60 },
      tabs: { x: 30, y: 950, w: 690, h: 0 }, // 모바일은 탭을 콘텐츠 첫 블록으로 내림
    },
  },
};

const BRANDWEB_SUB = {
  kind: "fixed",
  canvas: { w: 1920, h: 1080 },
  blocks: [
    { id: "cnb", type: "cnb", role: "chrome", rect: { x: 0, y: 0, w: 1920, h: 54 }, label: "CNB — 햄버거 · 게임 로고 · 로그인/회원가입" },
    { id: "margin-top", type: "margin", role: "guide", rect: { x: 360, y: 54, w: 1200, h: 136 }, label: "상단 여백 136" },
    { id: "menu", type: "menu", role: "chrome", rect: { x: 30, y: 330, w: 310, h: 430 }, label: "좌측 메뉴 (메인과 동일 리스트)" },
    { id: "title", type: "title", role: "hero", rect: { x: 560, y: 190, w: 800, h: 120 }, label: "페이지 타이틀" },
    { id: "sub", type: "subcopy", role: "text", rect: { x: 660, y: 322, w: 600, h: 44 }, label: "서브카피 + 데코 라인(y381)" },
    { id: "date", type: "period", role: "text", rect: { x: 710, y: 396, w: 500, h: 44 }, label: "날짜" },
    { id: "notice", type: "notice", role: "text", rect: { x: 360, y: 822, w: 1200, h: 30 }, label: "안내문" },
    { id: "btn-1", type: "cta", role: "cta", rect: { x: 795, y: 878, w: 152, h: 46 }, label: "유의사항" },
    { id: "btn-2", type: "cta", role: "cta", rect: { x: 973, y: 878, w: 152, h: 46 }, label: "쿠폰 조회" },
    { id: "margin-bottom", type: "margin", role: "guide", rect: { x: 360, y: 924, w: 1200, h: 156 }, label: "하단 여백 156" },
  ],
  contentArea: { x: 480, y: 458, w: 960, h: 300 },
};

const POST_FORMATS = {
  "post-square": { canvas: { w: 1080, h: 1080 }, safe: { x: 60, y: 60, w: 960, h: 960 } },
  "post-portrait": { canvas: { w: 1080, h: 1350 }, safe: { x: 60, y: 60, w: 960, h: 1230 } },
  "post-story": { canvas: { w: 1080, h: 1920 }, safe: { x: 60, y: 250, w: 960, h: 1370 }, reserved: [{ y: 0, h: 250, label: "상단 UI 회피" }, { y: 1620, h: 300, label: "하단 UI 회피" }] },
  "post-notice": { canvas: { w: 860, h: null }, safe: { x: 50, y: 50, w: 760, h: null }, fixed: true },
};
const POST_WEIGHTS = { title: 0.22, subcopy: 0.08, visual: 0.40, "reward-strip": 0.16, period: 0.07, cta: 0.10, text: 0.12, notice: 0.08 };
const POST_MIN = { title: 0.14, subcopy: 0.05, visual: 0.26, "reward-strip": 0.11, period: 0.045, cta: 0.07, text: 0.08, notice: 0.05 }; // 안전 높이 비율
const POST_FIXED = (w) => ({ title: 140, subcopy: 60, visual: Math.round(w * 0.56), "reward-strip": 260, period: 60, cta: 100, text: 200, notice: 120 });
const POST_BRAND_BAR = 80;
const POST_FOOTER = 60;

const HANDOFF_SLOTS = {
  osangseu: { product: "product-grid", banner: "status-box", bonus: "bonus-grid" },
  refine: { product: "craft-formula", banner: "craft-formula", bonus: "package-card" },
  scroll: { product: "craft-formula", banner: "craft-formula", bonus: "package-card" },
};

// ───────────────────────── 유틸 ─────────────────────────
const r1 = (n) => Math.round(n * 10) / 10;
const rect = (x, y, w, h) => ({ x: r1(x), y: r1(y), w: r1(w), h: r1(h) });
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function resolveGrammar(brief) {
  const g = String(brief.grammar || "auto");
  if (g !== "auto") {
    if (!["osangseu", "refine", "scroll"].includes(g)) throw new Error(`알 수 없는 grammar: ${g}`);
    return g;
  }
  const game = String(brief.game || "");
  return game.includes("리니지") || /lineage/i.test(game) ? "refine" : "osangseu";
}

// ───────────────────────── 페이지 레이아웃 ─────────────────────────
function layoutPage(brief, fmtId) {
  const F = PAGE_FORMATS[fmtId];
  const grammar = resolveGrammar(brief);
  const blocks = [];
  const warnings = [];
  const W = F.canvas.w;
  const C = F.content;
  const T = F.type;
  const R = F.rhythm;
  const cx = (w) => C.x + (C.w - w) / 2;
  let order = 0;
  const push = (b) => { blocks.push(b); return b; };
  const ordered = (b) => { b.order = ++order; return b; };

  // 히어로
  const H = F.hero;
  const chars = String(brief.kv?.characters || "dual");
  push(ordered({ id: "hero-title", type: "title", role: "hero", rect: { ...H.title }, label: brief.title || "［타이틀］", slots: [{ key: "title", ...H.title }] }));
  if (chars === "dual") {
    push(ordered({ id: "hero-char-left", type: "character", role: "kv", rect: { ...H.female }, label: "좌측 캐릭터" }));
    push(ordered({ id: "hero-char-right", type: "character", role: "kv", rect: { ...H.male }, label: "우측 캐릭터" }));
  } else if (chars === "single") {
    push(ordered({ id: "hero-char", type: "character", role: "kv", rect: { ...H.center }, label: "중앙 캐릭터" }));
  }
  if (grammar === "osangseu") {
    push(ordered({ id: "hero-date", type: "period", role: "hero", rect: { ...H.dateOsangseu }, label: brief.period || "［기간］" }));
  } else {
    if (brief.subtitle) push(ordered({ id: "hero-sub", type: "subcopy", role: "hero", rect: { ...H.sub }, label: brief.subtitle }));
    push(ordered({ id: "hero-date", type: "period", role: "hero", rect: { ...H.date }, label: brief.period || "［기간］" }));
    if (fmtId === "promo-pc" && brief.tabs !== false) {
      push(ordered({ id: "hero-tabs", type: "tabs", role: "hero", rect: { ...H.tabs }, label: arr(brief.tabs).join(" / ") || "전서버 / 본서버 탭" }));
    }
  }
  push({ id: "hero-kv", type: "kv", role: "guide", rect: rect(F.kvSafe.x, 0, F.kvSafe.w, F.exportH), label: `KV 출력 영역 ${F.kvSafe.w}×${F.exportH} (페이드 ${Math.round(F.fadeStart * 100)}%)`, allowOverlap: true });

  // 콘텐츠 흐름
  let y = F.contentStart[grammar];
  if (fmtId === "promo-mobile" && grammar !== "osangseu" && brief.tabs !== false) {
    push(ordered({ id: "tabs", type: "tabs", role: "content", rect: rect(C.x, y, T.tabs.w, T.tabs.h), label: arr(brief.tabs).join(" / ") || "전서버 / 본서버 탭" }));
    y += T.tabs.h + R.block;
  }
  const sections = arr(brief.sections);
  if (!sections.length) warnings.push("sections 가 비어 있습니다. 최소 한 개의 보상/제작 섹션이 필요합니다.");

  sections.forEach((s, i) => {
    const n = i + 1;
    const sid = (suffix) => `s${n}-${suffix}`;
    const type = String(s.type || "custom");
    if (i > 0) y += R.section;

    // 헤더
    if (s.badge) {
      push({ id: sid("badge"), type: "badge", role: "text", rect: rect(cx(320), y, 320, T.badge), label: String(s.badge) });
      y += R.badgeToTitle;
    }
    if (s.title) {
      const h = i === 0 ? T.title : T.subheading;
      push(ordered({ id: sid("title"), type: "section-title", role: "text", rect: rect(C.x, y, C.w, h), label: String(s.title) }));
      y += h + (s.subtitle ? R.titleToSub[grammar] : R.titleToBody[grammar]);
    } else if (i === 0 && type !== "notice") {
      warnings.push(`섹션 1 (${type}) 에 title 이 없습니다. 첫 섹션은 타이틀이 필요합니다.`);
    }
    if (s.subtitle) {
      push({ id: sid("sub"), type: "subcopy", role: "text", rect: rect(C.x, y, C.w, T.subtitle), label: String(s.subtitle) });
      y += T.subtitle + R.subToBody[grammar];
    }

    // 본문
    y = layoutBody(type, s, { F, fmtId, C, T, R, y, push, ordered, sid, warnings, cx, grammar });

    if (s.cta) {
      y += R.bodyToCta;
      push(ordered({ id: sid("cta"), type: "cta", role: "cta", rect: rect(cx(T.cta.w), y, T.cta.w, T.cta.h), label: String(s.cta) }));
      y += T.cta.h;
    }
    const notes = arr(s.note);
    if (notes.length && type !== "notice") {
      y += R.block;
      const h = notes.length * T.note;
      push({ id: sid("note"), type: "notice", role: "text", rect: rect(C.x, y, C.w, h), label: notes.map((t) => `※ ${t}`).join("\n") });
      y += h;
    }
  });

  y += R.bottomPad;
  let pageH = Math.max(F.canvas.minH, Math.ceil(y / 10) * 10);
  if (F.stickyCta) {
    const stickyY = pageH - F.stickyCta;
    if (y > stickyY) pageH = Math.ceil((y + F.stickyCta) / 10) * 10;
    push({ id: "sticky-cta", type: "cta", role: "cta", rect: rect(0, pageH - F.stickyCta, W, F.stickyCta), label: brief.stickyCta || "하단 고정 CTA (sticky)", allowOverlap: false });
  }

  // 검증
  const contentBlocks = blocks.filter((b) => b.role !== "guide" && b.role !== "kv" && b.role !== "hero");
  for (const b of contentBlocks) {
    if (b.rect.x < C.x - 0.5 || b.rect.x + b.rect.w > C.x + C.w + 0.5) {
      if (!(F.stickyCta && b.id === "sticky-cta")) warnings.push(`${b.id} 가 콘텐츠 안전폭(${C.x}~${C.x + C.w}) 을 벗어납니다.`);
    }
  }
  for (const b of blocks.filter((b) => b.role === "kv" || b.role === "hero")) {
    if (b.rect.x < F.kvSafe.x - 0.5 || b.rect.x + b.rect.w > F.kvSafe.x + F.kvSafe.w + 0.5) warnings.push(`${b.id} 가 KV 안전폭을 벗어납니다.`);
  }
  warnings.push(...overlapWarnings(blocks.filter((b) => !b.allowOverlap && b.role !== "kv" && b.role !== "hero")));
  if (!blocks.some((b) => b.type === "cta")) warnings.push("CTA 블록이 없습니다. 첫 섹션 뒤 또는 페이지 끝에 CTA 를 두세요.");
  if (sections.length && String(sections[0].type) === "notice") warnings.push("첫 섹션이 notice 입니다. 핵심 보상/제작식이 먼저 와야 합니다.");
  if (sections.length > 1 && String(sections[sections.length - 1].type) !== "notice" && !sections.some((s) => s.note || s.type === "notice")) {
    warnings.push("유의사항(notice) 블록이 없습니다. 운영 신뢰성 항목에서 감점됩니다.");
  }
  for (let i = 1; i < sections.length; i += 1) {
    if (sections[i].type === sections[i - 1].type && ["craft-formula", "craft-rows", "package-card"].includes(sections[i].type)) {
      warnings.push(`섹션 ${i}·${i + 1} 이 같은 타입(${sections[i].type})으로 연속됩니다. rows/count 로 합치세요.`);
    }
  }

  const spec = {
    schema: "promo-page-layout/spec@1",
    format: fmtId,
    grammar,
    title: brief.title || null,
    game: brief.game || null,
    canvas: { w: W, h: pageH, exportH: F.exportH, fadeStart: F.fadeStart },
    safe: { kv: { ...F.kvSafe }, content: { ...C } },
    blocks,
    readingOrder: blocks.filter((b) => b.order).sort((a, b) => a.order - b.order).map((b) => b.id),
    ctas: blocks.filter((b) => b.type === "cta").map((b) => b.id),
    warnings,
    handoff: {
      target: "nexus-preview",
      layoutKey: grammar,
      frameSlots: Object.fromEntries(Object.entries(HANDOFF_SLOTS[grammar]).map(([slot, t]) => [slot, blocks.filter((b) => b.type === t).map((b) => b.id)])),
      mobile: fmtId === "promo-mobile",
    },
  };
  return spec;
}

function layoutBody(type, s, ctx) {
  const { F, fmtId, C, T, R, push, ordered, sid, warnings, cx } = ctx;
  let { y } = ctx;
  const mobile = fmtId === "promo-mobile";
  const bodyId = sid("body");

  switch (type) {
    case "product-grid": case "bonus-grid": case "selection-grid": case "result-grid": {
      const g = F.grid[type];
      const cols = Math.min(isNum(s.cols) ? s.cols : g.cols, mobile ? 3 : 5);
      const count = isNum(s.count) ? s.count : cols;
      const rows = Math.max(1, Math.ceil(count / cols));
      const cw = (C.w - g.gap * (cols - 1)) / cols;
      const ch = cw * g.ratio;
      const slots = [];
      for (let k = 0; k < count; k += 1) {
        const col = k % cols, row = Math.floor(k / cols);
        slots.push({ key: `card-${k + 1}`, ...rect(C.x + col * (cw + g.gap), y + row * (ch + g.gap), cw, ch) });
      }
      const h = rows * ch + (rows - 1) * g.gap;
      push(ordered({ id: bodyId, type, role: "content", rect: rect(C.x, y, C.w, h), label: `${type} ${count}장 · ${cols}열 × ${rows}행 · 카드 ${Math.round(cw)}×${Math.round(ch)}`, slots }));
      if (isNum(s.cols) && s.cols > cols) warnings.push(`${bodyId}: 열 수 ${s.cols} 는 상한(${cols})을 넘어 ${cols}열로 조정했습니다.`);
      return y + h;
    }
    case "craft-formula": {
      const rows = Math.max(1, isNum(s.rows) ? s.rows : 1);
      const h = mobile ? 90 + rows * 520 : 110 + rows * 275;
      const slots = [];
      for (let k = 0; k < rows; k += 1) {
        if (mobile) {
          const ry = y + 90 + k * 520;
          slots.push({ key: `row${k + 1}-material-1`, ...rect(C.x + 245, ry, 200, 200) }, { key: `row${k + 1}-material-2`, ...rect(C.x + 245, ry + 160, 200, 200) }, { key: `row${k + 1}-result`, ...rect(C.x + 235, ry + 330, 220, 220) });
        } else {
          const ry = y + 130 + k * 270;
          slots.push({ key: `row${k + 1}-material-1`, ...rect(C.x + 115, ry, 170, 170) }, { key: `row${k + 1}-material-2`, ...rect(C.x + 365, ry, 170, 170) }, { key: `row${k + 1}-action`, ...rect(C.x + 580, ry + 52, 170, 62) }, { key: `row${k + 1}-result`, ...rect(C.x + 795, ry - 10, 190, 190) });
        }
      }
      push(ordered({ id: bodyId, type, role: "content", rect: rect(C.x, y, C.w, h), label: `제작식 컨테이너 · ${rows}행 (재료＋재료→확정 제작→결과)`, slots }));
      return y + h;
    }
    case "craft-rows": {
      const rows = Math.max(1, isNum(s.rows) ? s.rows : 1);
      const h = mobile ? 60 + rows * 300 : 60 + rows * 240;
      const slots = [];
      for (let k = 0; k < rows; k += 1) {
        const ry = y + 55 + k * (mobile ? 300 : 240);
        if (mobile) slots.push({ key: `row${k + 1}-from`, ...rect(C.x + 60, ry, 180, 180) }, { key: `row${k + 1}-to`, ...rect(C.x + 450, ry - 10, 200, 200) });
        else slots.push({ key: `row${k + 1}-from`, ...rect(C.x + 240, ry, 170, 170) }, { key: `row${k + 1}-action`, ...rect(C.x + 480, ry + 52, 150, 62) }, { key: `row${k + 1}-to`, ...rect(C.x + 700, ry - 10, 190, 190) });
      }
      push(ordered({ id: bodyId, type, role: "content", rect: rect(C.x, y, C.w, h), label: `교환 행 · ${rows}행 (X→Y)`, slots }));
      return y + h;
    }
    case "package-card": {
      const count = Math.max(1, Math.min(isNum(s.count) ? s.count : 1, mobile ? 4 : 3));
      const slots = [];
      let h;
      if (mobile) {
        h = count * 420 + (count - 1) * 24;
        for (let k = 0; k < count; k += 1) slots.push({ key: `package-${k + 1}`, ...rect(C.x, y + k * 444, C.w, 420) });
      } else if (count === 1) {
        h = 440;
        slots.push({ key: "package-1", ...rect(cx(760), y, 760, 440) });
      } else {
        const w = (C.w - 40 * (count - 1)) / count;
        h = 470;
        for (let k = 0; k < count; k += 1) slots.push({ key: `package-${k + 1}`, ...rect(C.x + k * (w + 40), y, w, 470) });
      }
      push(ordered({ id: bodyId, type, role: "content", rect: rect(C.x, y, C.w, h), label: `패키지 카드 ${count}장 (상자·패키지명·가격·구매)`, slots }));
      return y + h;
    }
    case "showcase": {
      const h = mobile ? 560 : 520;
      push(ordered({ id: bodyId, type, role: "content", rect: rect(C.x, y, C.w, h), label: "대표 상품 쇼케이스 + 혜택 태그" }));
      return y + h;
    }
    case "status-box": {
      const w = mobile ? C.w : 719, h = mobile ? 300 : 376;
      push(ordered({ id: bodyId, type, role: "content", rect: rect(cx(w), y, w, h), label: "현황/로그인 박스" }));
      return y + h;
    }
    case "tabs": {
      push({ id: bodyId, type, role: "content", rect: rect(cx(T.tabs.w), y, T.tabs.w, T.tabs.h), label: arr(s.items).join(" / ") || "탭" });
      return y + T.tabs.h;
    }
    case "text": {
      const h = isNum(s.h) ? s.h : mobile ? 100 : 120;
      push({ id: bodyId, type, role: "text", rect: rect(C.x, y, C.w, h), label: String(s.text || "［본문］") });
      return y + h;
    }
    case "notice": {
      const lines = arr(s.lines);
      const n = Math.max(1, lines.length || (isNum(s.count) ? s.count : 1));
      const h = (mobile ? 30 : 40) + n * T.note;
      push({ id: bodyId, type, role: "text", rect: rect(C.x, y, C.w, h), label: (lines.length ? lines : ["［유의사항］"]).map((t) => `※ ${t}`).join("\n") });
      return y + h;
    }
    case "cta": {
      push(ordered({ id: bodyId, type, role: "cta", rect: rect(cx(T.cta.w), y, T.cta.w, T.cta.h), label: String(s.text || "［CTA］") }));
      return y + T.cta.h;
    }
    case "custom": {
      if (!isNum(s.h)) throw new Error(`${bodyId}: custom 타입은 h 가 필요합니다.`);
      if (!s.reason) warnings.push(`${bodyId}: custom 블록에 reason 이 없습니다. 어휘 밖인 이유를 적으세요.`);
      push(ordered({ id: bodyId, type, role: "content", rect: rect(C.x, y, C.w, s.h), label: `custom · ${s.reason || "(이유 없음)"}` }));
      return y + s.h;
    }
    default:
      throw new Error(`${bodyId}: 알 수 없는 섹션 타입 "${type}". references/section-vocabulary.md 참조.`);
  }
}

// ───────────────────────── 브랜드웹 서브 ─────────────────────────
function layoutBrandwebSub(brief) {
  const B = BRANDWEB_SUB;
  const warnings = [];
  const blocks = B.blocks.map((b) => ({ ...b, rect: { ...b.rect } }));
  const titleB = blocks.find((b) => b.id === "title"); titleB.label = brief.title || "［페이지 타이틀］";
  const subB = blocks.find((b) => b.id === "sub"); subB.label = brief.subtitle || "［서브카피］";
  const dateB = blocks.find((b) => b.id === "date"); dateB.label = brief.period || "［날짜］";
  const sections = arr(brief.sections).filter((s) => s.type !== "notice");
  const noticeS = arr(brief.sections).find((s) => s.type === "notice");
  if (noticeS) blocks.find((b) => b.id === "notice").label = arr(noticeS.lines).map((t) => `※ ${t}`).join("\n") || "［안내문］";
  const count = Math.max(1, Math.min(sections.length || 2, 3));
  const A = B.contentArea;
  const gap = 40;
  const w = (A.w - gap * (count - 1)) / count;
  for (let k = 0; k < count; k += 1) {
    const s = sections[k] || {};
    blocks.push({ id: `content-${k + 1}`, type: s.type || "content-box", role: "content", rect: rect(A.x + k * (w + gap), A.y, w, A.h), label: s.title || `［섹션 헤더 ${String.fromCharCode(65 + k)}］`, slots: [{ key: "ribbon", ...rect(A.x + k * (w + gap) + (w - 260) / 2, A.y - 19, 260, 40) }] });
  }
  if (sections.length > 3) warnings.push("브랜드웹 서브는 콘텐츠 박스 3장까지입니다. 초과 섹션은 서브2 페이지로 나누세요.");
  const order = ["title", "sub", "date", ...blocks.filter((b) => b.id.startsWith("content-")).map((b) => b.id), "btn-1", "btn-2"];
  order.forEach((id, i) => { const b = blocks.find((x) => x.id === id); if (b) b.order = i + 1; });
  warnings.push(...overlapWarnings(blocks.filter((b) => b.role !== "guide" && b.role !== "chrome")));
  return {
    schema: "promo-page-layout/spec@1", format: "brandweb-sub", grammar: "brandwebSub", title: brief.title || null, game: brief.game || null,
    canvas: { w: B.canvas.w, h: B.canvas.h, exportH: B.canvas.h, fadeStart: 1 },
    safe: { kv: { x: 0, w: 1920 }, content: { x: A.x, w: A.w } },
    blocks, readingOrder: order, ctas: ["btn-1", "btn-2"], warnings,
    handoff: { target: "nexus-preview", layoutKey: "brandwebSub", frameSlots: { banner: blocks.filter((b) => b.id.startsWith("content-")).map((b) => b.id), product: [], bonus: [] }, mobile: false },
  };
}

// ───────────────────────── 포스트 ─────────────────────────
function layoutPost(brief, fmtId) {
  const P = POST_FORMATS[fmtId];
  const warnings = [];
  const blocks = [];
  const S = { ...P.safe };
  let sections = arr(brief.sections).map((s) => ({ ...s, type: String(s.type || "text") }));
  if (!sections.length) sections = [{ type: "title" }, { type: "visual" }, { type: "period" }, { type: "cta" }];
  for (const s of sections) if (!(s.type in POST_WEIGHTS)) throw new Error(`포스트 블록 타입 "${s.type}" 은 지원하지 않습니다 (${Object.keys(POST_WEIGHTS).join(", ")}).`);
  if (sections.length > 5) warnings.push(`포스트 블록이 ${sections.length}개입니다. 5개 이하로 줄이세요 (한 장 = 한 메시지).`);
  if (!sections.some((s) => s.type === "title")) warnings.push("title 블록이 없습니다.");

  const brand = brief.brand !== false;
  const footer = brief.footer !== false;
  const gap = 24;
  let y = S.y;
  if (brand) { blocks.push({ id: "brand-bar", type: "brand-bar", role: "chrome", rect: rect(S.x, y, S.w, POST_BRAND_BAR), label: `${brief.game || "［게임 로고］"} · 이벤트 라벨` }); y += POST_BRAND_BAR + gap; }

  let heights;
  if (P.fixed) {
    const fx = POST_FIXED(S.w);
    heights = sections.map((s) => (isNum(s.h) ? s.h : fx[s.type]));
  } else {
    const footerH = footer ? POST_FOOTER + gap : 0;
    const avail = S.y + S.h - y - footerH - gap * (sections.length - 1);
    const wsum = sections.reduce((a, s) => a + POST_WEIGHTS[s.type], 0);
    heights = sections.map((s) => (avail * POST_WEIGHTS[s.type]) / wsum);
    sections.forEach((s, i) => { const min = S.h * POST_MIN[s.type]; if (heights[i] < min) warnings.push(`${s.type} 블록 높이 ${Math.round(heights[i])} 가 최소 ${Math.round(min)}(안전 높이의 ${Math.round(POST_MIN[s.type] * 100)}%) 보다 작습니다. 블록을 줄이세요.`); });
  }
  sections.forEach((s, i) => {
    const h = heights[i];
    const id = `${s.type}-${i + 1}`;
    const b = { id, type: s.type, role: s.type === "cta" ? "cta" : s.type === "visual" ? "kv" : "text", rect: rect(S.x, y, S.w, h), label: s.text || s.note || defaultPostLabel(s, brief), order: i + 1 };
    if (s.type === "visual") b.slots = [{ key: "title-safe", ...rect(S.x, y, S.w, h * 0.35) }];
    if (s.type === "reward-strip") {
      const n = Math.max(1, Math.min(isNum(s.count) ? s.count : 4, 5));
      const cw = (S.w - 20 * (n - 1)) / n; const ch = Math.min(h, cw);
      b.slots = Array.from({ length: n }, (_, k) => ({ key: `reward-${k + 1}`, ...rect(S.x + k * (cw + 20), y + (h - ch) / 2, cw, ch) }));
    }
    blocks.push(b);
    y += h + gap;
  });
  if (footer) { blocks.push({ id: "footer", type: "footer", role: "chrome", rect: rect(S.x, y, S.w, POST_FOOTER), label: "저작권 · 해시태그" }); y += POST_FOOTER; }
  const canvasH = P.canvas.h ?? Math.ceil((y + S.y) / 10) * 10;
  for (const rz of P.reserved || []) {
    for (const b of blocks) if (b.rect.y < rz.y + rz.h && b.rect.y + b.rect.h > rz.y) warnings.push(`${b.id} 가 ${rz.label} 영역(y ${rz.y}~${rz.y + rz.h}) 을 침범합니다.`);
    blocks.push({ id: `reserved-${rz.y}`, type: "reserved", role: "guide", rect: rect(0, rz.y, P.canvas.w, rz.h), label: rz.label, allowOverlap: true });
  }
  const titleB = blocks.find((b) => b.type === "title");
  if (titleB && titleB.rect.h < S.w * 0.08) warnings.push("타이틀 블록 높이가 안전폭의 8% 미만입니다.");
  warnings.push(...overlapWarnings(blocks.filter((b) => !b.allowOverlap)));
  return {
    schema: "promo-page-layout/spec@1", format: fmtId, grammar: "post", title: brief.title || null, game: brief.game || null,
    canvas: { w: P.canvas.w, h: canvasH, exportH: canvasH, fadeStart: 1 },
    safe: { kv: { x: S.x, w: S.w }, content: { x: S.x, w: S.w } },
    blocks, readingOrder: blocks.filter((b) => b.order).map((b) => b.id), ctas: blocks.filter((b) => b.type === "cta").map((b) => b.id), warnings,
    handoff: { target: "figma", layoutKey: null, frameSlots: {}, mobile: false, series: brief.series || null },
  };
}
function defaultPostLabel(s, brief) {
  switch (s.type) {
    case "title": return brief.title || "［타이틀］";
    case "period": return brief.period || "［기간］";
    case "visual": return "KV 비주얼 (상단 35% 타이틀 안전 영역)";
    case "reward-strip": return `보상 아이콘 ${isNum(s.count) ? s.count : 4}개`;
    case "cta": return "［CTA / 해시태그］";
    case "subcopy": return "［서브카피］";
    case "notice": return "※ ［유의사항］";
    default: return "［본문］";
  }
}

// ───────────────────────── 검증 공통 ─────────────────────────
function overlapWarnings(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 1) for (let j = i + 1; j < list.length; j += 1) {
    const a = list[i].rect, b = list[j].rect;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 1 && oy > 1) out.push(`${list[i].id} 와 ${list[j].id} 가 겹칩니다 (${Math.round(ox)}×${Math.round(oy)}).`);
  }
  return out;
}

function validateSpec(spec) {
  const problems = [];
  if (spec?.schema !== "promo-page-layout/spec@1") problems.push("schema 가 promo-page-layout/spec@1 이 아닙니다.");
  if (!Array.isArray(spec?.blocks) || !spec.blocks.length) problems.push("blocks 가 비어 있습니다.");
  const W = spec?.canvas?.w, H = spec?.canvas?.h;
  for (const b of spec?.blocks || []) {
    const r = b.rect || {};
    if (![r.x, r.y, r.w, r.h].every(isNum)) { problems.push(`${b.id}: rect 가 숫자가 아닙니다.`); continue; }
    if (r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5) problems.push(`${b.id}: 캔버스(${W}×${H}) 밖입니다.`);
  }
  const ids = new Set();
  for (const b of spec?.blocks || []) { if (ids.has(b.id)) problems.push(`중복 id: ${b.id}`); ids.add(b.id); }
  for (const id of spec?.readingOrder || []) if (!ids.has(id)) problems.push(`readingOrder 의 ${id} 가 blocks 에 없습니다.`);
  problems.push(...overlapWarnings((spec?.blocks || []).filter((b) => !b.allowOverlap && !["kv", "hero", "guide"].includes(b.role))));
  if (Array.isArray(spec?.warnings) && spec.warnings.length) problems.push(...spec.warnings.map((w) => `warning: ${w}`));
  return problems;
}

// ───────────────────────── 스케일·SVG ─────────────────────────
function scaleSpec(spec, width) {
  const s = width / spec.canvas.w;
  if (Math.abs(s - 1) < 1e-9) return spec;
  const sr = (r) => rect(r.x * s, r.y * s, r.w * s, r.h * s);
  const out = JSON.parse(JSON.stringify(spec));
  out.scale = { from: spec.canvas.w, to: width, factor: r1(s * 10000) / 10000 };
  out.canvas = { ...out.canvas, w: r1(spec.canvas.w * s), h: r1(spec.canvas.h * s), exportH: r1(spec.canvas.exportH * s) };
  out.safe = { kv: { x: r1(spec.safe.kv.x * s), w: r1(spec.safe.kv.w * s) }, content: { x: r1(spec.safe.content.x * s), w: r1(spec.safe.content.w * s) } };
  for (const b of out.blocks) { b.rect = sr(b.rect); if (b.slots) b.slots = b.slots.map((sl) => ({ key: sl.key, ...sr(sl) })); }
  return out;
}

const ROLE_FILL = { hero: "#FFD166", kv: "#FF7675", content: "#74B9FF", text: "#A29BFE", cta: "#E17055", chrome: "#9aa0aa", guide: "none" };
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function renderSvg(spec) {
  const { w: W, h: H } = spec.canvas;
  const maxSide = 1400;
  const disp = Math.min(1, maxSide / Math.max(W, H));
  const fs = Math.max(12, Math.round(W / 90));
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${Math.round(W * disp)}" height="${Math.round(H * disp)}" font-family="'Noto Sans KR','Malgun Gothic',sans-serif">`);
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#14181C"/>`);
  if (spec.safe?.kv) parts.push(`<rect x="${spec.safe.kv.x}" y="0" width="${spec.safe.kv.w}" height="${H}" fill="none" stroke="#FF7675" stroke-dasharray="14 10" stroke-width="2" opacity="0.5"/>`);
  if (spec.safe?.content) parts.push(`<rect x="${spec.safe.content.x}" y="0" width="${spec.safe.content.w}" height="${H}" fill="none" stroke="#74B9FF" stroke-dasharray="14 10" stroke-width="2" opacity="0.6"/>`);
  if (spec.canvas.exportH && spec.canvas.exportH < H) {
    const fy = spec.canvas.exportH * (spec.canvas.fadeStart ?? 1);
    parts.push(`<rect x="0" y="${fy}" width="${W}" height="${spec.canvas.exportH - fy}" fill="url(#fade)"/>`);
    parts.push(`<line x1="0" x2="${W}" y1="${spec.canvas.exportH}" y2="${spec.canvas.exportH}" stroke="#FFD166" stroke-width="3" stroke-dasharray="20 12"/>`);
    parts.push(`<text x="${W - 12}" y="${spec.canvas.exportH - 10}" fill="#FFD166" font-size="${fs}" text-anchor="end">KV export ${spec.canvas.exportH}</text>`);
  }
  parts.push(`<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14181C" stop-opacity="0"/><stop offset="1" stop-color="#14181C" stop-opacity="0.9"/></linearGradient></defs>`);
  for (const b of spec.blocks) {
    const r = b.rect; const fill = ROLE_FILL[b.role] || "#ffffff";
    const guide = b.role === "guide";
    parts.push(`<g><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${fill}" fill-opacity="${guide ? 0 : 0.18}" stroke="${guide ? "#9aa0aa" : fill}" stroke-width="${guide ? 2 : 3}" ${guide ? 'stroke-dasharray="8 8"' : ""}/>`);
    for (const sl of b.slots || []) parts.push(`<rect x="${sl.x}" y="${sl.y}" width="${sl.w}" height="${sl.h}" fill="none" stroke="${fill}" stroke-width="2" stroke-dasharray="6 6" opacity="0.8"/>`);
    const lines = String(b.label || "").split("\n").slice(0, 3);
    const tx = r.x + 10, ty = r.y + fs + 6;
    parts.push(`<text x="${tx}" y="${ty}" fill="#ffffff" font-size="${fs}" font-weight="700">${esc(b.id)} <tspan font-weight="400" fill="#dddddd">· ${esc(b.type)} · ${Math.round(r.w)}×${Math.round(r.h)}</tspan></text>`);
    lines.forEach((ln, i) => parts.push(`<text x="${tx}" y="${ty + (i + 1) * (fs + 4)}" fill="#cccccc" font-size="${fs * 0.9}">${esc(ln.slice(0, 60))}</text>`));
    if (b.order) parts.push(`<circle cx="${r.x + r.w - fs * 1.2}" cy="${r.y + fs * 1.2}" r="${fs}" fill="#ffffff"/><text x="${r.x + r.w - fs * 1.2}" y="${r.y + fs * 1.2 + fs * 0.36}" fill="#14181C" font-size="${fs}" font-weight="800" text-anchor="middle">${b.order}</text>`);
    parts.push(`</g>`);
  }
  parts.push(`<text x="12" y="${H - 12}" fill="#9aa0aa" font-size="${fs}">${esc(spec.format)} · ${esc(spec.grammar)} · ${W}×${H}${spec.scale ? ` · scale ${spec.scale.factor}` : ""}</text>`);
  parts.push(`</svg>`);
  return parts.join("\n");
}

// ───────────────────────── main ─────────────────────────
function build(brief) {
  const fmtId = String(brief.format || "promo-pc");
  if (PAGE_FORMATS[fmtId]) return layoutPage(brief, fmtId);
  if (fmtId === "brandweb-sub") return layoutBrandwebSub(brief);
  if (POST_FORMATS[fmtId]) return layoutPost(brief, fmtId);
  throw new Error(`알 수 없는 format: ${fmtId} (${[...Object.keys(PAGE_FORMATS), "brandweb-sub", ...Object.keys(POST_FORMATS)].join(", ")})`);
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.validate) {
    const spec = JSON.parse(fs.readFileSync(String(a.validate), "utf8"));
    const problems = validateSpec(spec);
    console.log(JSON.stringify({ file: a.validate, pass: problems.length === 0, problems }, null, 2));
    process.exit(problems.length ? 1 : 0);
  }
  if (!a.brief) {
    console.error("사용법: --brief brief.json --out-dir DIR [--width N] | --validate layout-spec.json");
    process.exit(2);
  }
  const brief = JSON.parse(fs.readFileSync(String(a.brief), "utf8"));
  let spec = build(brief);
  if (a.width) spec = scaleSpec(spec, Number(a.width));
  const outDir = String(a["out-dir"] || path.dirname(String(a.brief)));
  fs.mkdirSync(outDir, { recursive: true });
  const specPath = path.join(outDir, "layout-spec.json");
  const svgPath = path.join(outDir, "wireframe.svg");
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), "utf8");
  fs.writeFileSync(svgPath, renderSvg(spec), "utf8");
  const summary = {
    format: spec.format, grammar: spec.grammar, canvas: spec.canvas, blocks: spec.blocks.length,
    readingOrder: spec.readingOrder, ctas: spec.ctas, warnings: spec.warnings, files: { spec: specPath, svg: svgPath },
  };
  console.log(JSON.stringify(summary, null, 2));
  if (spec.warnings.length) process.exitCode = 1;
}

main();
