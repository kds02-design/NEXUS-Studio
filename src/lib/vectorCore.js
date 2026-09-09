// Vector Forge 순수 코어 — DOM·Node 의존 없음. 앱(services/vectorize.js) 과 Claude 스킬(nexus-vector-forge) 이 공유.
//
//   otsuThreshold(hist, total)                 → 0..255
//   binarizeRGBA(data, W, H, opts)             → { mask: Uint8Array(1=잉크), threshold, inkRatio }
//   maskToRGBA(mask, W, H)                     → Uint8ClampedArray (검정=잉크 / 흰색)
//   normalizePotracePath(raw, H, scale)        → { d, subpaths, anchors }   (potrace C 원시 출력용)
//   buildSvg({ width, height, paths, fg, bg, transparentBg })
//   compareMasks(a, b)                         → { iou, missing, extra }    (QA)
//   DEFAULT_OPTIONS / PRESETS

export const DEFAULT_OPTIONS = {
  engine: 'potrace',
  threshold: 128,
  autoThreshold: true,
  invert: false,
  blur: 0,
  alphaMax: 1.0,
  turdSize: 2,
  optTolerance: 0.2,
  optCurve: true,
  turnPolicy: 4,
  fg: '#000000',
  bg: '#ffffff',
  transparentBg: true,
  refine: 'normal',
};

// Illustrator Image Trace 흑백 로고 프리셋에 대응하는 potrace 값 묶음.
//   alphaMax    : 코너 임계값. 0 = 모든 꼭짓점을 코너로(각짐), 1.34 = 코너 없음(전부 곡선)
//   turdSize    : 이 면적(px²) 이하의 얼룩 제거
//   optTolerance: 곡선 최적화 허용 오차. 작을수록 원본 충실·앵커 증가
export const PRESETS = [
  { id: 'title',   label: '타이틀 (기본)', desc: '타이포코어 흑백 타이틀',   values: { alphaMax: 1.0,  turdSize: 2,  optTolerance: 0.2,  optCurve: true } },
  { id: 'sharp',   label: '각진 서체',     desc: '고딕·각진 획, 코너 보존',  values: { alphaMax: 0.55, turdSize: 2,  optTolerance: 0.15, optCurve: true } },
  { id: 'smooth',  label: '캘리그라피',    desc: '붓·곡선 위주, 부드럽게',   values: { alphaMax: 1.2,  turdSize: 4,  optTolerance: 0.35, optCurve: true } },
  { id: 'detail',  label: '디테일 최대',   desc: '원본 충실, 앵커 많음',     values: { alphaMax: 0.8,  turdSize: 1,  optTolerance: 0.05, optCurve: true } },
  { id: 'clean',   label: '노이즈 강제거', desc: '지저분한 렌더·스캔',      values: { alphaMax: 1.0,  turdSize: 12, optTolerance: 0.3,  optCurve: true } },
];

// Otsu 자동 임계값 — 클래스 간 분산 최대화. 반환값 이하가 어두운 클래스.
export function otsuThreshold(hist, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0; let wB = 0; let best = 0; let thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; thr = t; }
  }
  return thr;
}

// RGBA 버퍼 → 잉크 마스크. 투명 픽셀은 흰 배경 위에 합성(알파 가중) 후 휘도 계산.
//   invert=false : 휘도 <= 임계값 이 잉크 (검정 글자 / 흰 배경)
//   invert=true  : 휘도 >  임계값 이 잉크 (흰 글자 / 검정 배경 — 마스크포지·루마키 결과)
//   invert='auto': 잉크 비율이 55% 를 넘으면 자동 반전 (배경이 잉크로 잡힌 경우)
//   alphaMode='auto': 투명 픽셀이 10% 이상이면 색과 무관하게 '불투명 = 잉크' 로 판정 (마스크포지 투명 PNG 의 흰 글자 대응).
//                     'on' 강제 / 'off' 는 항상 휘도 기준.
export function binarizeRGBA(data, W, H, opts = {}) {
  const { threshold = 128, autoThreshold = true, invert = false, alphaMode = 'auto' } = opts;
  const N = W * H;

  let transparent = 0;
  for (let i = 0; i < N; i++) if (data[i * 4 + 3] < 128) transparent++;
  const useAlpha = alphaMode === 'on' || (alphaMode === 'auto' && transparent / N >= 0.1 && transparent < N);
  if (useAlpha) {
    const mask = new Uint8Array(N);
    let ink = 0;
    const inv = invert === true;
    for (let i = 0; i < N; i++) {
      const opaque = data[i * 4 + 3] >= 128;
      const isInk = inv ? !opaque : opaque;
      if (isInk) { mask[i] = 1; ink++; }
    }
    return { mask, threshold: 128, inkRatio: N ? ink / N : 0, inverted: inv, mode: 'alpha' };
  }

  const gray = new Uint8ClampedArray(N);
  const hist = new Uint32Array(256);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    const a = data[o + 3] / 255;
    const lum = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
    const g = Math.round(lum * a + 255 * (1 - a));
    gray[i] = g;
    hist[g]++;
  }
  const thr = autoThreshold ? otsuThreshold(hist, N) : threshold;

  let inv = invert === true;
  let darkCount = 0;
  for (let t = 0; t <= thr; t++) darkCount += hist[t];
  if (invert === 'auto') inv = darkCount / N > 0.55;

  const mask = new Uint8Array(N);
  let ink = 0;
  for (let i = 0; i < N; i++) {
    const isInk = inv ? gray[i] > thr : gray[i] <= thr;
    if (isInk) { mask[i] = 1; ink++; }
  }
  return { mask, threshold: thr, inkRatio: N ? ink / N : 0, inverted: inv, mode: 'luma' };
}

// 디스페클 — 면적이 minArea px² 미만인 연결 성분을 잉크·구멍 양쪽 모두 제거 (4-연결).
// 렌더 텍스처 얼룩(글자 안 어두운 점, 배경의 밝은 점)을 추적 전에 지워 QA 기준 마스크도 깨끗하게 만든다.
// 반환: { mask(새 배열), removedInk, removedHoles }
export function despeckleMask(mask, W, H, minArea = 0) {
  const N = W * H;
  const out = new Uint8Array(mask);
  if (!minArea || minArea <= 1) return { mask: out, removedInk: 0, removedHoles: 0 };
  const seen = new Uint8Array(N);
  const stack = new Int32Array(N);
  const comp = [];
  let removedInk = 0; let removedHoles = 0;
  for (let s = 0; s < N; s++) {
    if (seen[s]) continue;
    const v = out[s];
    let top = 0; stack[top++] = s; seen[s] = 1; let size = 0; comp.length = 0;
    while (top) {
      const i = stack[--top]; size++;
      if (size <= minArea) comp.push(i);
      const x = i % W;
      if (x > 0 && !seen[i - 1] && out[i - 1] === v) { seen[i - 1] = 1; stack[top++] = i - 1; }
      if (x < W - 1 && !seen[i + 1] && out[i + 1] === v) { seen[i + 1] = 1; stack[top++] = i + 1; }
      if (i >= W && !seen[i - W] && out[i - W] === v) { seen[i - W] = 1; stack[top++] = i - W; }
      if (i < N - W && !seen[i + W] && out[i + W] === v) { seen[i + W] = 1; stack[top++] = i + W; }
    }
    if (size < minArea) {
      const nv = v ? 0 : 1;
      for (let k = 0; k < comp.length; k++) out[comp[k]] = nv;
      if (v) removedInk++; else removedHoles++;
    }
  }
  return { mask: out, removedInk, removedHoles };
}

export function maskToRGBA(mask, W, H) {
  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const v = mask[i] ? 0 : 255; const o = i * 4;
    out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = 255;
  }
  return out;
}

// potrace(C/wasm) 원시 패스 → 절대 픽셀 좌표 패스.
// potrace svg 백엔드는 1/10px 단위·y-up 좌표에 상대 명령(l/c/m)을 쓰고 <g transform="translate(0,H) scale(0.1,-0.1)"> 로 되돌린다.
// 여기서는 transform 없이 바로 쓸 수 있게 M/L/C/Z 절대 명령(px, 소수 2자리)으로 펼친다 — Figma·Illustrator 붙여넣기에 안전.
//   반환: { d, subpaths, anchors }  (subpaths = 이 컴포넌트의 서브패스 수: 1 외곽 + 나머지 구멍)
export function normalizePotracePath(raw, height, scale = 0.1) {
  const tokens = raw.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const px = (x) => Math.round(x * scale * 100) / 100;
  const py = (y) => Math.round((height - y * scale) * 100) / 100;
  let cx = 0; let cy = 0;
  let sx = 0; let sy = 0;
  let cmd = null; let i = 0;
  let subpaths = 0; let anchors = 0;
  const out = [];
  const num = () => parseFloat(tokens[i++]);
  const isCmd = (t) => /^[MLCZmlcz]$/.test(t);
  while (i < tokens.length) {
    if (isCmd(tokens[i])) { cmd = tokens[i++]; if (cmd === 'Z' || cmd === 'z') { out.push('Z'); cx = sx; cy = sy; continue; } }
    if (i >= tokens.length) break;
    switch (cmd) {
      case 'M': cx = num(); cy = num(); sx = cx; sy = cy; out.push(`M${px(cx)} ${py(cy)}`); subpaths++; anchors++; cmd = 'L'; break;
      case 'm': cx += num(); cy += num(); sx = cx; sy = cy; out.push(`M${px(cx)} ${py(cy)}`); subpaths++; anchors++; cmd = 'l'; break;
      case 'L': cx = num(); cy = num(); out.push(`L${px(cx)} ${py(cy)}`); anchors++; break;
      case 'l': cx += num(); cy += num(); out.push(`L${px(cx)} ${py(cy)}`); anchors++; break;
      case 'C': { const x1 = num(); const y1 = num(); const x2 = num(); const y2 = num(); cx = num(); cy = num(); out.push(`C${px(x1)} ${py(y1)} ${px(x2)} ${py(y2)} ${px(cx)} ${py(cy)}`); anchors++; break; }
      case 'c': { const x1 = cx + num(); const y1 = cy + num(); const x2 = cx + num(); const y2 = cy + num(); cx += num(); cy += num(); out.push(`C${px(x1)} ${py(y1)} ${px(x2)} ${py(y2)} ${px(cx)} ${py(cy)}`); anchors++; break; }
      default: i++;
    }
  }
  return { d: out.join(' '), subpaths, anchors };
}

// 절대 좌표 패스(d) 통계 — Node potrace 포트처럼 이미 px 절대 좌표인 출력용.
export function countPathStats(d) {
  const subpaths = (d.match(/M/g) || []).length;
  const anchors = (d.match(/[MLC]/g) || []).length;
  return { subpaths, anchors };
}

export function buildSvg({ width, height, paths, fg = '#000000', bg = '#ffffff', transparentBg = true }) {
  const d = (Array.isArray(paths) ? paths : [paths]).filter(Boolean).join(' ');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    transparentBg ? '' : `  <rect width="${width}" height="${height}" fill="${bg}"/>`,
    d ? `  <path fill="${fg}" fill-rule="evenodd" d="${d}"/>` : '',
    '</svg>',
  ].filter(Boolean).join('\n');
}

// 두 잉크 마스크 비교 — IoU, 누락(원본에 있는데 결과에 없음), 초과(결과에만 있음) 비율(원본 잉크 대비).
export function compareMasks(a, b) {
  let inter = 0; let uni = 0; let aN = 0; let missing = 0; let extra = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] === 1; const y = b[i] === 1;
    if (x) aN++;
    if (x && y) inter++;
    if (x || y) uni++;
    if (x && !y) missing++;
    if (!x && y) extra++;
  }
  return {
    iou: uni ? inter / uni : 1,
    missing: aN ? missing / aN : 0,
    extra: aN ? extra / aN : 0,
    inkPixels: aN,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 정리(refine) 단계 — potrace 결과 패스의 직선·꺾임을 정돈한다. 진짜 곡선(ㅇ·ㅎ 등)은 건드리지 않는다.
//   1) 직선화   : 베지어가 현(chord)에서 tol 안이면 L 로 교체, 같은 방향의 연속 L 병합
//   2) 꺾임 복원: 두 긴 직선 사이의 짧은 필렛(둥근 모서리)을 지우고 두 직선의 교점으로 꺾음
//   3) 각도 스냅: 긴 직선들의 주 방향(수평·수직·이탤릭 기울기)을 찾아 ±snapTol 안의 직선을 그 각도로 맞춤
//
//   refinePath(d, { level, width, height, snap, params }) → { d, before, after, snapAngles, snapped, level }
//   REFINE_LEVELS: off | light | normal | strong
// ─────────────────────────────────────────────────────────────────────────────

export const REFINE_LEVELS = [
  { id: 'off',    label: '끔',   desc: '추적 결과 그대로' },
  { id: 'light',  label: '약',   desc: '명백한 직선만 정리' },
  { id: 'normal', label: '보통', desc: '직선화 + 꺾임 복원 + 각도 스냅 (권장)' },
  { id: 'strong', label: '강',   desc: '흔들림이 큰 렌더 원본용' },
];

const REFINE_PARAMS = {
  light:  { tol: 0.25, mergeAngle: 1.0, cornerAngle: 30, filletMax: 4,  snapTol: 1.2, snapMinLen: 20, snapMinShare: 0.10 },
  normal: { tol: 0.45, mergeAngle: 1.5, cornerAngle: 25, filletMax: 7,  snapTol: 2.0, snapMinLen: 12, snapMinShare: 0.08 },
  strong: { tol: 0.80, mergeAngle: 2.5, cornerAngle: 20, filletMax: 12, snapTol: 3.0, snapMinLen: 8,  snapMinShare: 0.06 },
};

// 절대/상대 M L C Z(H V) 를 서브패스 배열로. 각 서브패스 = { start:[x,y], segs:[{t:'L'|'C', c1, c2, p}] } (닫힌 경로 가정)
export function parsePathD(d) {
  const tokens = d.replace(/,/g, ' ').match(/[MLCZHVmlczhv]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const subs = []; let cur = null; let cmd = null; let i = 0;
  let cx = 0; let cy = 0;
  const num = () => parseFloat(tokens[i++]);
  const isCmd = (t) => /^[MLCZHVmlczhv]$/.test(t);
  const closeCur = () => { if (cur && cur.segs.length) subs.push(cur); cur = null; };
  while (i < tokens.length) {
    if (isCmd(tokens[i])) { cmd = tokens[i++]; if (cmd === 'Z' || cmd === 'z') { closeCur(); continue; } }
    if (i >= tokens.length) break;
    switch (cmd) {
      case 'M': case 'm': {
        const rel = cmd === 'm';
        const x = num(); const y = num();
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        closeCur(); cur = { start: [cx, cy], segs: [] };
        cmd = rel ? 'l' : 'L'; break;
      }
      case 'L': case 'l': {
        const rel = cmd === 'l'; const x = num(); const y = num();
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        if (cur) cur.segs.push({ t: 'L', p: [cx, cy] }); break;
      }
      case 'H': case 'h': { const x = num(); cx = cmd === 'h' ? cx + x : x; if (cur) cur.segs.push({ t: 'L', p: [cx, cy] }); break; }
      case 'V': case 'v': { const y = num(); cy = cmd === 'v' ? cy + y : y; if (cur) cur.segs.push({ t: 'L', p: [cx, cy] }); break; }
      case 'C': case 'c': {
        const rel = cmd === 'c';
        const x1 = num(); const y1 = num(); const x2 = num(); const y2 = num(); const x = num(); const y = num();
        const c1 = rel ? [cx + x1, cy + y1] : [x1, y1];
        const c2 = rel ? [cx + x2, cy + y2] : [x2, y2];
        cx = rel ? cx + x : x; cy = rel ? cy + y : y;
        if (cur) cur.segs.push({ t: 'C', c1, c2, p: [cx, cy] }); break;
      }
      default: i++;
    }
  }
  closeCur();
  // 불변식: 마지막 세그먼트는 시작점으로 돌아오는 닫힘 변 (segs[n-1].p === start). 없으면 L 로 추가.
  for (const s of subs) {
    const last = s.segs[s.segs.length - 1];
    if (!last || Math.hypot(last.p[0] - s.start[0], last.p[1] - s.start[1]) > 1e-6) s.segs.push({ t: 'L', p: s.start.slice() });
  }
  return subs;
}

// 링 회전: segs[k] 가 첫 세그먼트가 되도록. 불변식(segs[n-1].p === start) 유지.
function rotateSub(sub, k) {
  const n = sub.segs.length; if (!n) return;
  k = ((k % n) + n) % n; if (k === 0) return;
  const newStart = sub.segs[k - 1].p.slice();
  sub.segs = sub.segs.slice(k).concat(sub.segs.slice(0, k));
  sub.start = newStart;
}

export function serializePathD(subs, digits = 2) {
  const k = 10 ** digits;
  const f = (n) => { const r = Math.round(n * k) / k; return Object.is(r, -0) ? '0' : String(r); };
  const out = [];
  for (const s of subs) {
    if (!s.segs.length) continue;
    out.push('M' + f(s.start[0]) + ' ' + f(s.start[1]));
    s.segs.forEach((g, idx) => {
      const closing = idx === s.segs.length - 1 && g.t === 'L' && Math.hypot(g.p[0] - s.start[0], g.p[1] - s.start[1]) < 1e-6;
      if (closing) return;
      if (g.t === 'L') out.push('L' + f(g.p[0]) + ' ' + f(g.p[1]));
      else out.push('C' + f(g.c1[0]) + ' ' + f(g.c1[1]) + ' ' + f(g.c2[0]) + ' ' + f(g.c2[1]) + ' ' + f(g.p[0]) + ' ' + f(g.p[1]));
    });
    out.push('Z');
  }
  return out.join(' ');
}

const vsub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const vlen = (a) => Math.hypot(a[0], a[1]);
const vdist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function pointLineDist(p, a, b) {
  const d = vsub(b, a); const L = vlen(d);
  if (L < 1e-9) return vdist(p, a);
  return Math.abs(d[0] * (a[1] - p[1]) - (a[0] - p[0]) * d[1]) / L;
}
const dirAngle = (a, b) => { let t = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; if (t < 0) t += 180; if (t >= 180) t -= 180; return t; };
const angDiff180 = (x, y) => { let d = Math.abs(x - y) % 180; if (d > 90) d = 180 - d; return d; };
function lineIntersect(p1, p2, p3, p4) {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}
const segStart = (s, i) => (i === 0 ? s.start : s.segs[i - 1].p);

// 1) 직선화: 제어점이 현에서 tol 안이면 L (베지어는 제어점 볼록 껍질 안 → 상계)
function straighten(sub, tol) {
  for (let i = 0; i < sub.segs.length; i++) {
    const g = sub.segs[i]; if (g.t !== 'C') continue;
    const a = segStart(sub, i); const b = g.p;
    const chord = vdist(a, b);
    if (chord < 1e-6) continue;
    const d1 = pointLineDist(g.c1, a, b); const d2 = pointLineDist(g.c2, a, b);
    const along = (p) => ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (chord * chord);
    const t1 = along(g.c1); const t2 = along(g.c2);
    if (d1 <= tol && d2 <= tol && t1 > -0.2 && t1 < 1.2 && t2 > -0.2 && t2 < 1.2) sub.segs[i] = { t: 'L', p: b };
  }
}

// 연속 L 병합: 방향 차 < mergeAngle 이고 중간점이 병합 현에서 tol 안
function mergeCollinear(sub, tol, mergeAngle) {
  let changed = true; let guard = 0;
  while (changed && guard++ < 500) {
    changed = false;
    const n = sub.segs.length; if (n < 3) return;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const gi = sub.segs[i]; const gj = sub.segs[j];
      if (gi.t !== 'L' || gj.t !== 'L') continue;
      const a = segStart(sub, i); const m = gi.p; const b = gj.p;
      if (angDiff180(dirAngle(a, m), dirAngle(m, b)) > mergeAngle) continue;
      if (pointLineDist(m, a, b) > tol) continue;
      if (j === 0) { rotateSub(sub, 1); changed = true; break; } // 시작점이 병합 대상 → 링을 돌려 다음 루프에서 처리
      gi.p = b; sub.segs.splice(j, 1);
      changed = true; break;
    }
  }
}

// 2) 꺾임 복원: 긴 L — (짧은 구간들, 총 길이 < filletMax) — 긴 L, 각도차 > cornerAngle 이면 교점으로 대체
function restoreCorners(sub, p) {
  let changed = true; let guard = 0;
  while (changed && guard++ < 500) {
    changed = false;
    const n = sub.segs.length; if (n < 3) return;
    for (let i = 0; i < n; i++) {
      const gi = sub.segs[i]; if (gi.t !== 'L') continue;
      const ai = segStart(sub, i); if (vdist(ai, gi.p) < p.filletMax * 1.5) continue;
      let k = (i + 1) % n; let total = 0; let count = 0;
      while (count < n - 2) {
        const gk = sub.segs[k]; const sk = segStart(sub, k);
        const len = vdist(sk, gk.p);
        if (gk.t === 'L' && len >= p.filletMax * 1.5) break;
        if (total + len > p.filletMax) { count = -1; break; }
        total += len; count++; k = (k + 1) % n;
      }
      if (count <= 0 || k === i) continue;
      const gk = sub.segs[k]; const sk = segStart(sub, k);
      const angle = angDiff180(dirAngle(ai, gi.p), dirAngle(sk, gk.p));
      if (angle < p.cornerAngle) continue;
      const X = lineIntersect(ai, gi.p, sk, gk.p);
      if (!X) continue;
      if (vdist(X, gi.p) > p.filletMax * 2.5 || vdist(X, sk) > p.filletMax * 2.5) continue;
      // i 가 첫 세그먼트가 되도록 회전한 뒤 1..count 제거 → 인덱스 꼬임 방지
      rotateSub(sub, i);
      sub.segs[0].p = X;
      sub.segs.splice(1, count);
      changed = true; break;
    }
  }
}

// 3) 각도 스냅
function detectSnapAngles(subs, p) {
  const hist = new Float64Array(180); let total = 0;
  for (const s of subs) for (let i = 0; i < s.segs.length; i++) {
    const g = s.segs[i]; if (g.t !== 'L') continue;
    const a = segStart(s, i); const len = vdist(a, g.p); if (len < p.snapMinLen) continue;
    hist[Math.round(dirAngle(a, g.p)) % 180] += len; total += len;
  }
  if (total <= 0) return [];
  const sm = new Float64Array(180);
  for (let k = 0; k < 180; k++) sm[k] = hist[(k + 179) % 180] * 0.5 + hist[k] + hist[(k + 1) % 180] * 0.5;
  const peaks = [];
  for (let k = 0; k < 180; k++) {
    if (sm[k] < sm[(k + 179) % 180] || sm[k] < sm[(k + 1) % 180]) continue;
    const share = sm[k] / (total * 2);
    if (share < p.snapMinShare) continue;
    let wsum = 0; let asum = 0;
    for (let dk = -2; dk <= 2; dk++) { const kk = (k + dk + 180) % 180; wsum += hist[kk]; asum += hist[kk] * (k + dk); }
    let ang = wsum ? asum / wsum : k; if (ang < 0) ang += 180; if (ang >= 180) ang -= 180;
    if (angDiff180(ang, 0) < 1.0) ang = 0; else if (angDiff180(ang, 90) < 1.0) ang = 90;
    if (!peaks.some((q) => angDiff180(q, ang) < 3)) peaks.push(Math.round(ang * 100) / 100);
  }
  return peaks;
}

function snapAngles(sub, angles, p) {
  const n = sub.segs.length; if (n < 2 || !angles.length) return 0;
  const starts = []; for (let i = 0; i < n; i++) starts.push(segStart(sub, i).slice());
  const ends = sub.segs.map((g) => g.p.slice());
  const target = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const g = sub.segs[i]; if (g.t !== 'L') continue;
    const len = vdist(starts[i], ends[i]); if (len < 4) continue;
    const ang = dirAngle(starts[i], ends[i]);
    let best = null; let bd = p.snapTol;
    for (const t of angles) { const d = angDiff180(ang, t); if (d <= bd) { bd = d; best = t; } }
    if (best !== null && angDiff180(ang, best) > 1e-6) target[i] = best;
  }
  if (!target.some((t) => t !== null)) return 0;
  const maxMove = p.tol * 3 + 2;
  const lineOf = (i) => {
    const m = [(starts[i][0] + ends[i][0]) / 2, (starts[i][1] + ends[i][1]) / 2];
    const t = target[i] * Math.PI / 180; const dir = [Math.cos(t), Math.sin(t)];
    return { m, dir, a: m, b: [m[0] + dir[0], m[1] + dir[1]] };
  };
  const project = (pt, L) => { const v = vsub(pt, L.m); const s = v[0] * L.dir[0] + v[1] * L.dir[1]; return [L.m[0] + s * L.dir[0], L.m[1] + s * L.dir[1]]; };
  let snapped = 0;
  for (let pass = 0; pass < 3; pass++) {
    const newV = new Array(n).fill(null); let bad = false;
    for (let i = 0; i < n; i++) {
      const prev = (i + n - 1) % n;
      const old = starts[i];
      const tp = target[prev] !== null; const ti = target[i] !== null;
      let nv = null;
      if (tp && ti) {
        const Lp = lineOf(prev); const Li = lineOf(i);
        if (angDiff180(target[prev], target[i]) > 3) nv = lineIntersect(Lp.a, Lp.b, Li.a, Li.b);
        if (!nv) nv = project(old, Li);
      } else if (ti) nv = project(old, lineOf(i));
      else if (tp) nv = project(old, lineOf(prev));
      if (nv && vdist(nv, old) > maxMove) { if (ti) target[i] = null; if (tp) target[prev] = null; bad = true; }
      newV[i] = nv;
    }
    if (bad && pass < 2) continue;
    if (bad) return 0;
    for (let i = 0; i < n; i++) {
      if (!newV[i]) continue;
      const prev = (i + n - 1) % n;
      const delta = vsub(newV[i], starts[i]);
      if (vlen(delta) < 1e-9) continue;
      if (i === 0) sub.start = newV[i].slice();
      sub.segs[prev].p = newV[i].slice();
      if (sub.segs[prev].t === 'C') sub.segs[prev].c2 = [sub.segs[prev].c2[0] + delta[0], sub.segs[prev].c2[1] + delta[1]];
      if (sub.segs[i].t === 'C') sub.segs[i].c1 = [sub.segs[i].c1[0] + delta[0], sub.segs[i].c1[1] + delta[1]];
    }
    snapped = target.filter((t) => t !== null).length;
    break;
  }
  return snapped;
}

function isClosingL(s, idx) {
  const g = s.segs[idx];
  return idx === s.segs.length - 1 && g && g.t === 'L' && Math.hypot(g.p[0] - s.start[0], g.p[1] - s.start[1]) < 1e-6;
}
function pathStats(subs) {
  let anchors = 0; let lines = 0; let curves = 0;
  for (const s of subs) s.segs.forEach((g, idx) => { if (isClosingL(s, idx)) return; anchors++; if (g.t === 'L') lines++; else curves++; });
  return { anchors, lines, curves, subpaths: subs.length };
}
// 길이 0 세그먼트 제거 (정리 과정에서 생길 수 있음)
function dropDegenerate(sub) {
  for (let i = sub.segs.length - 1; i >= 0 && sub.segs.length > 2; i--) {
    const a = segStart(sub, i); const g = sub.segs[i];
    if (g.t === 'L' && vdist(a, g.p) < 1e-6) { if (i === sub.segs.length - 1) { /* 닫힘 변 0 길이는 정상 */ } else sub.segs.splice(i, 1); }
  }
}

export function refinePath(d, opts = {}) {
  const level = opts.level || 'normal';
  if (level === 'off' || !REFINE_PARAMS[level]) {
    const subs0 = parsePathD(d); const st = pathStats(subs0);
    return { d, before: st, after: st, snapAngles: [], snapped: 0, level: 'off' };
  }
  const minDim = Math.min(opts.width || 600, opts.height || 600);
  const scale = Math.max(1, Math.min(3, minDim / 600));
  const base = REFINE_PARAMS[level];
  const p = { ...base, tol: base.tol * scale, filletMax: base.filletMax * scale, snapMinLen: base.snapMinLen * scale, ...(opts.params || {}) };

  const subs = parsePathD(d);
  const before = pathStats(subs);
  for (const s of subs) { straighten(s, p.tol); mergeCollinear(s, p.tol, p.mergeAngle); }
  for (const s of subs) { restoreCorners(s, p); mergeCollinear(s, p.tol, p.mergeAngle); }
  const angles = opts.snap === false ? [] : detectSnapAngles(subs, p);
  let snappedN = 0;
  if (angles.length) for (const s of subs) snappedN += snapAngles(s, angles, p);
  for (const s of subs) { mergeCollinear(s, p.tol, p.mergeAngle); dropDegenerate(s); }
  const kept = subs.filter((s) => s.segs.length >= 3);
  const after = pathStats(kept);
  return { d: serializePathD(kept), before, after, snapAngles: angles, snapped: snappedN, level, params: p };
}
