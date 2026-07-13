// 피그마 변수 컬러 문서 — KV 테마 토큰을 Figma Variables 규격 JSON + 스와치 시트 PNG 로 내보낸다.
//   · JSON: 피그마 플러그인(변수 임포터/Tokens Studio 계열)에서 불러와 컬렉션 변수로 생성하는 용도.
//   · PNG : 컬러 시스템 한 장 요약(이름/HEX/그라데이션) — KV 레이어 출력과 함께 전달.
const TOKEN_DEFS = [
  { key: "primary",     name: "color/primary",      label: "주조 · 버튼/강조" },
  { key: "accent",      name: "color/accent",       label: "강조 · 금장/포인트" },
  { key: "title",       name: "color/title",        label: "타이틀 기본" },
  { key: "titleTop",    name: "color/title-top",    label: "타이틀 그라데이션 위" },
  { key: "titleBottom", name: "color/title-bottom", label: "타이틀 그라데이션 아래" },
  { key: "textLight",   name: "color/text-light",   label: "본문 밝은색" },
  { key: "panel",       name: "color/panel",        label: "패널/카드 배경" },
  { key: "bgTop",       name: "color/bg-top",       label: "배경 그라데이션 위" },
  { key: "bgMid",       name: "color/bg-mid",       label: "배경 그라데이션 중간" },
  { key: "bgBottom",    name: "color/bg-bottom",    label: "배경 그라데이션 아래" },
  { key: "btnTop",      name: "color/btn-top",      label: "버튼 그라데이션 위" },
  { key: "btnBottom",   name: "color/btn-bottom",   label: "버튼 그라데이션 아래" },
  { key: "btnBorder",   name: "color/btn-border",   label: "버튼 테두리" },
];

const normHex = (v) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(v || "").trim());
  return m ? `#${m[1].toUpperCase()}` : null;
};
// Figma 변수 규격 색상: r/g/b/a 0~1
const hexToFigmaRgba = (hex) => {
  const h = hex.slice(1);
  return {
    r: +(parseInt(h.slice(0, 2), 16) / 255).toFixed(4),
    g: +(parseInt(h.slice(2, 4), 16) / 255).toFixed(4),
    b: +(parseInt(h.slice(4, 6), 16) / 255).toFixed(4),
    a: 1,
  };
};

// 테마 → 변수 항목 배열 [{ key, name, label, hex, rgba }]
export function themeTokenEntries(theme) {
  const t = theme?.tokens || {};
  return TOKEN_DEFS
    .map((d) => ({ ...d, hex: normHex(t[d.key]) }))
    .filter((d) => d.hex)
    .map((d) => ({ ...d, rgba: hexToFigmaRgba(d.hex) }));
}

// Figma Variables 임포트용 JSON — 컬렉션 1개 + COLOR 변수 목록 (평탄 구조라 플러그인에서 다루기 쉬움).
export function buildFigmaVariablesJson(theme, docName = "Promo Theme") {
  const entries = themeTokenEntries(theme);
  return {
    $schema: "nexus-preview/figma-variables@1",
    name: docName,
    collection: "Promo Theme",
    mode: "default",
    variables: entries.map((e) => ({
      name: e.name, type: "COLOR",
      hex: e.hex, rgba: e.rgba,
      description: e.label,
    })),
    variants: theme?.variants || {},
  };
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ── 스와치 시트 PNG — 다크 카드 위 스와치/이름/HEX + 그라데이션 바 ── */
const SHEET_W = 1080;
export function renderThemeSheetPng(theme, docName = "Promo Theme") {
  const entries = themeTokenEntries(theme);
  const t = theme?.tokens || {};
  const rowH = 56, pad = 44, headH = 118, gradH = 172;
  const H = headH + entries.length * rowH + gradH + pad;
  const c = document.createElement("canvas");
  c.width = SHEET_W; c.height = H;
  const ctx = c.getContext("2d");

  // 배경
  ctx.fillStyle = "#101014"; ctx.fillRect(0, 0, SHEET_W, H);
  // 헤더
  ctx.fillStyle = "#FFFFFF"; ctx.font = "800 30px 'Noto Sans KR', sans-serif";
  ctx.fillText(docName, pad, 56);
  ctx.fillStyle = "#8b8b95"; ctx.font = "400 15px 'Noto Sans KR', sans-serif";
  ctx.fillText("컬러 시스템 — 피그마 변수 (Promo Theme 컬렉션)", pad, 84);

  // 스와치 행: [색 박스] name  label  HEX
  entries.forEach((e, i) => {
    const y = headH + i * rowH;
    ctx.fillStyle = "#17171d"; roundRect(ctx, pad, y, SHEET_W - pad * 2, rowH - 10, 12); ctx.fill();
    ctx.fillStyle = e.hex; roundRect(ctx, pad + 12, y + 8, 60, rowH - 26, 8); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
    roundRect(ctx, pad + 12, y + 8, 60, rowH - 26, 8); ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; ctx.font = "700 15px 'JetBrains Mono', monospace";
    ctx.fillText(e.name, pad + 92, y + 30);
    ctx.fillStyle = "#8b8b95"; ctx.font = "400 13px 'Noto Sans KR', sans-serif";
    ctx.fillText(e.label, pad + 330, y + 30);
    ctx.fillStyle = "#c9c9d2"; ctx.font = "600 15px 'JetBrains Mono', monospace";
    ctx.textAlign = "right"; ctx.fillText(e.hex, SHEET_W - pad - 16, y + 30); ctx.textAlign = "left";
  });

  // 그라데이션 바 3종 — 배경/타이틀/버튼
  const gy = headH + entries.length * rowH + 16;
  const bars = [
    { label: "배경", stops: [t.bgTop, t.bgMid, t.bgBottom] },
    { label: "타이틀", stops: [t.titleTop || t.title, t.titleBottom || t.accent] },
    { label: "버튼", stops: [t.btnTop || t.primary, t.btnBottom || t.primary] },
  ];
  bars.forEach((b, i) => {
    const stops = b.stops.map(normHex).filter(Boolean);
    if (!stops.length) return;
    const y = gy + i * 48;
    ctx.fillStyle = "#8b8b95"; ctx.font = "600 13px 'Noto Sans KR', sans-serif";
    ctx.fillText(b.label, pad, y + 22);
    const gx = pad + 80, gw = SHEET_W - pad * 2 - 80;
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    stops.forEach((s, si) => grad.addColorStop(stops.length === 1 ? 0 : si / (stops.length - 1), s));
    ctx.fillStyle = grad; roundRect(ctx, gx, y + 4, gw, 28, 8); ctx.fill();
  });

  return c.toDataURL("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
