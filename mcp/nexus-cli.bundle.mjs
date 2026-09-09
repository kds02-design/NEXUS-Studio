#!/usr/bin/env node
// 자동 생성 파일 — 수정 금지. 원본: mcp/cli.mjs (npm run mcp:build 로 재생성)

// mcp/cli.mjs
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";

// src/lib/colorKeyExtract.js
var KEY_DEFAULTS = {
  tolerance: 40,
  // 배경으로 간주할 색 거리 (0~160)
  feather: 22,
  // 경계 페더링 폭 (1~120)
  holeSize: 2,
  // 사용자가 명시적으로 복원할 닫힌 영역 최대 크기 (0~100%)
  // 닫힌 배경도 피사체로 복원하는 옵션이라 한글 카운터(ㅇ·ㅁ·ㅂ)를 막을 수 있다.
  // 타이틀/로고의 음각 공간 보존을 위해 기본값은 반드시 false 이다.
  holeProtect: false,
  decontam: true,
  trim: false
};
var clamp255 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
var toRgb = (bg) => {
  if (Array.isArray(bg)) return bg;
  if (typeof bg === "string") {
    const h = bg.replace("#", "");
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const int = parseInt(n, 16);
    if (Number.isNaN(int)) return [0, 0, 0];
    return [int >> 16 & 255, int >> 8 & 255, int & 255];
  }
  return null;
};
function detectBg(d, w, h) {
  const buckets = {};
  const add = (x, y) => {
    const i = (y * w + x) * 4;
    const key = (d[i] >> 3) + "," + (d[i + 1] >> 3) + "," + (d[i + 2] >> 3);
    const bk = buckets[key] = buckets[key] || { n: 0, r: 0, g: 0, b: 0 };
    bk.n++;
    bk.r += d[i];
    bk.g += d[i + 1];
    bk.b += d[i + 2];
  };
  const step = Math.max(1, Math.floor(Math.min(w, h) / 120));
  for (let x = 0; x < w; x += step) {
    add(x, 0);
    add(x, h - 1);
  }
  for (let y = 0; y < h; y += step) {
    add(0, y);
    add(w - 1, y);
  }
  let best = null;
  for (const k in buckets) {
    if (!best || buckets[k].n > best.n) best = buckets[k];
  }
  if (!best) return [0, 0, 0];
  return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
}
function computeFillMask(alphaArr, W, H, holeSizePct) {
  const N = W * H, OPAQUE = 250;
  const exterior = new Uint8Array(N);
  const stack = [];
  const seed = (idx) => {
    if (alphaArr[idx] < OPAQUE && !exterior[idx]) {
      exterior[idx] = 1;
      stack.push(idx);
    }
  };
  for (let x = 0; x < W; x++) {
    seed(x);
    seed((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    seed(y * W);
    seed(y * W + W - 1);
  }
  while (stack.length) {
    const idx = stack.pop(), x = idx % W, y = idx / W | 0;
    if (x > 0) seed(idx - 1);
    if (x < W - 1) seed(idx + 1);
    if (y > 0) seed(idx - W);
    if (y < H - 1) seed(idx + W);
  }
  const fill = new Uint8Array(N), seen = new Uint8Array(N);
  const maxFill = holeSizePct / 100 * N * 0.6;
  for (let i = 0; i < N; i++) {
    if (alphaArr[i] < OPAQUE && !exterior[i] && !seen[i]) {
      const comp = [], st = [i];
      seen[i] = 1;
      while (st.length) {
        const idx = st.pop();
        comp.push(idx);
        const x = idx % W, y = idx / W | 0;
        if (x > 0 && alphaArr[idx - 1] < OPAQUE && !exterior[idx - 1] && !seen[idx - 1]) {
          seen[idx - 1] = 1;
          st.push(idx - 1);
        }
        if (x < W - 1 && alphaArr[idx + 1] < OPAQUE && !exterior[idx + 1] && !seen[idx + 1]) {
          seen[idx + 1] = 1;
          st.push(idx + 1);
        }
        if (y > 0 && alphaArr[idx - W] < OPAQUE && !exterior[idx - W] && !seen[idx - W]) {
          seen[idx - W] = 1;
          st.push(idx - W);
        }
        if (y < H - 1 && alphaArr[idx + W] < OPAQUE && !exterior[idx + W] && !seen[idx + W]) {
          seen[idx + W] = 1;
          st.push(idx + W);
        }
      }
      if (comp.length <= maxFill) for (const idx of comp) fill[idx] = 1;
    }
  }
  return fill;
}
function extractColorKeyPixels(srcData, { bg, tolerance, feather, holeProtect, holeSize, decontam }) {
  const W = srcData.width, H = srcData.height, N = W * H;
  const s = srcData.data;
  const [br, bgC, bb] = bg;
  const T = tolerance, S = Math.max(1, feather);
  const alphaArr = new Uint8ClampedArray(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const dr = s[i] - br, dg = s[i + 1] - bgC, db = s[i + 2] - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    alphaArr[p] = dist <= T ? 0 : dist >= T + S ? 255 : (dist - T) / S * 255;
  }
  const fill = holeProtect ? computeFillMask(alphaArr, W, H, holeSize) : null;
  const out = new Uint8ClampedArray(s.length);
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0, restoredPixels = 0;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    let a = s[i + 3] / 255 * alphaArr[p];
    let r = s[i], g = s[i + 1], b = s[i + 2];
    if (fill && fill[p]) {
      a = s[i + 3];
      restoredPixels++;
    } else if (decontam && a >= 8 && a < 255) {
      const af = a / 255, inv = 1 - af;
      r = clamp255((r - inv * br) / af);
      g = clamp255((g - inv * bgC) / af);
      b = clamp255((b - inv * bb) / af);
    }
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = a;
    if (a === 0) transparentPixels++;
    else if (a >= 254) opaquePixels++;
    else partialPixels++;
  }
  return {
    data: out,
    width: W,
    height: H,
    qa: { transparentPixels, opaquePixels, partialPixels, restoredPixels, totalPixels: N }
  };
}
function alphaTrimBox(o, W, H) {
  let minX = W, minY = H, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (o[(y * W + x) * 4 + 3] > 8) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad);
  maxY = Math.min(H - 1, maxY + pad);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
function cropPixels({ data, width, height }, box) {
  if (!box || box.x === 0 && box.y === 0 && box.w === width && box.h === height) return { data, width, height };
  const out = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    const src = ((box.y + y) * width + box.x) * 4;
    out.set(data.subarray(src, src + box.w * 4), y * box.w * 4);
  }
  return { data: out, width: box.w, height: box.h };
}

// src/lib/effectExtract.js
var EFFECT_DEFAULTS = { cutoff: 6, gamma: 0.85, opacity: 100, recoverColor: true, trim: false };
var clamp2552 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
function toRgb2(bg) {
  if (Array.isArray(bg)) return bg;
  if (typeof bg === "string") {
    const h = bg.replace("#", "");
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const int = parseInt(n, 16);
    if (Number.isNaN(int)) return [0, 0, 0];
    return [int >> 16 & 255, int >> 8 & 255, int & 255];
  }
  return [0, 0, 0];
}
function extractEffectPixels(srcData, { cutoff, gamma, opacity, recoverColor, bg }) {
  const W = srcData.width, H = srcData.height, s = srcData.data;
  const o = new Uint8ClampedArray(s.length);
  const threshold = Math.min(0.95, Math.max(0, cutoff / 255));
  const curve = Math.max(0.2, gamma);
  const gain = Math.max(0, opacity / 100);
  const rgb = toRgb2(bg);
  const br = (rgb[0] || 0) / 255, bgr = (rgb[1] || 0) / 255, bb = (rgb[2] || 0) / 255;
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0;
  let reconstructionError = 0, reconstructionSamples = 0;
  for (let i = 0; i < s.length; i += 4) {
    const sr = s[i] / 255, sg = s[i + 1] / 255, sb = s[i + 2] / 255;
    const d = Math.max(Math.abs(sr - br), Math.abs(sg - bgr), Math.abs(sb - bb));
    let matteAlpha = d <= threshold ? 0 : (d - threshold) / Math.max(1e-3, 1 - threshold);
    matteAlpha = Math.min(1, Math.pow(matteAlpha, curve) * gain);
    const sourceAlpha = s[i + 3] / 255;
    const outputAlpha = matteAlpha * sourceAlpha;
    if (outputAlpha <= 1e-4) {
      o[i] = o[i + 1] = o[i + 2] = o[i + 3] = 0;
      transparentPixels++;
      continue;
    }
    if (recoverColor && matteAlpha >= 8 / 255) {
      o[i] = clamp2552((sr - (1 - matteAlpha) * br) / matteAlpha * 255);
      o[i + 1] = clamp2552((sg - (1 - matteAlpha) * bgr) / matteAlpha * 255);
      o[i + 2] = clamp2552((sb - (1 - matteAlpha) * bb) / matteAlpha * 255);
    } else {
      o[i] = s[i];
      o[i + 1] = s[i + 1];
      o[i + 2] = s[i + 2];
    }
    o[i + 3] = clamp2552(outputAlpha * 255);
    if (o[i + 3] >= 254) opaquePixels++;
    else partialPixels++;
    if (recoverColor) {
      const rr = o[i] / 255 * matteAlpha + (1 - matteAlpha) * br;
      const rg = o[i + 1] / 255 * matteAlpha + (1 - matteAlpha) * bgr;
      const rb = o[i + 2] / 255 * matteAlpha + (1 - matteAlpha) * bb;
      reconstructionError += Math.abs(rr - sr) + Math.abs(rg - sg) + Math.abs(rb - sb);
      reconstructionSamples += 3;
    }
  }
  return {
    data: o,
    width: W,
    height: H,
    qa: {
      transparentPixels,
      opaquePixels,
      partialPixels,
      totalPixels: W * H,
      reconstructionMae: reconstructionSamples ? reconstructionError / reconstructionSamples : 0
    }
  };
}

// src/lib/alphaCleanup.js
function labelAlphaComponents(data, W, H) {
  const N = W * H;
  const labels = new Int32Array(N);
  const size = [0], maxAlpha = [0];
  const stack = new Int32Array(N);
  let count = 0;
  for (let p = 0; p < N; p++) {
    if (labels[p] !== 0 || data[p * 4 + 3] === 0) continue;
    const id = ++count;
    let sz = 0, mx = 0, sp = 0;
    stack[sp++] = p;
    labels[p] = id;
    while (sp > 0) {
      const idx = stack[--sp];
      const a = data[idx * 4 + 3];
      sz++;
      if (a > mx) mx = a;
      const x = idx % W, y = idx / W | 0;
      if (x > 0) {
        const q = idx - 1;
        if (labels[q] === 0 && data[q * 4 + 3] !== 0) {
          labels[q] = id;
          stack[sp++] = q;
        }
      }
      if (x < W - 1) {
        const q = idx + 1;
        if (labels[q] === 0 && data[q * 4 + 3] !== 0) {
          labels[q] = id;
          stack[sp++] = q;
        }
      }
      if (y > 0) {
        const q = idx - W;
        if (labels[q] === 0 && data[q * 4 + 3] !== 0) {
          labels[q] = id;
          stack[sp++] = q;
        }
      }
      if (y < H - 1) {
        const q = idx + W;
        if (labels[q] === 0 && data[q * 4 + 3] !== 0) {
          labels[q] = id;
          stack[sp++] = q;
        }
      }
    }
    size.push(sz);
    maxAlpha.push(mx);
  }
  return { labels, count, size, maxAlpha };
}
function dropComponents(data, labels, kill) {
  let removed = 0;
  for (let p = 0, N = labels.length; p < N; p++) {
    const id = labels[p];
    if (id !== 0 && kill[id]) {
      data[p * 4 + 3] = 0;
      removed++;
    }
  }
  return removed;
}
var CLEANUP_DEFAULTS = {
  // cleanIslands: 최대 알파 < islandAlpha 이고 크기 < 전체의 islandFrac 인 성분 제거
  islandAlpha: 96,
  islandFrac: 15e-4,
  // killFaintIslands: 최대 알파 < faintAlpha 인 성분은 크기와 무관하게 제거
  faintAlpha: 150
};
function cleanIslands(px, { islandAlpha = CLEANUP_DEFAULTS.islandAlpha, islandFrac = CLEANUP_DEFAULTS.islandFrac } = {}) {
  const { data, width: W, height: H } = px;
  const { labels, count, size, maxAlpha } = labelAlphaComponents(data, W, H);
  if (count === 0) return 0;
  const limit = W * H * islandFrac;
  const kill = new Uint8Array(count + 1);
  for (let id = 1; id <= count; id++) if (maxAlpha[id] < islandAlpha && size[id] < limit) kill[id] = 1;
  return dropComponents(data, labels, kill);
}
function killFaintIslands(px, { faintAlpha = CLEANUP_DEFAULTS.faintAlpha } = {}) {
  const { data, width: W, height: H } = px;
  const { labels, count, maxAlpha } = labelAlphaComponents(data, W, H);
  if (count === 0) return 0;
  const kill = new Uint8Array(count + 1);
  for (let id = 1; id <= count; id++) if (maxAlpha[id] < faintAlpha) kill[id] = 1;
  return dropComponents(data, labels, kill);
}
function alphaStats(px) {
  const d = px.data;
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0;
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i];
    if (a === 0) transparentPixels++;
    else if (a >= 254) opaquePixels++;
    else partialPixels++;
  }
  return { transparentPixels, opaquePixels, partialPixels, totalPixels: d.length / 4 };
}
function borderStats(data, W, H) {
  const step = Math.max(1, Math.floor(Math.min(W, H) / 120));
  const pts = [];
  const add = (x, y) => {
    const i = (y * W + x) * 4;
    pts.push([data[i], data[i + 1], data[i + 2]]);
  };
  for (let x = 0; x < W; x += step) {
    add(x, 0);
    add(x, H - 1);
  }
  for (let y = 0; y < H; y += step) {
    add(0, y);
    add(W - 1, y);
  }
  const n = pts.length || 1;
  const mean = [0, 0, 0];
  for (const p of pts) {
    mean[0] += p[0];
    mean[1] += p[1];
    mean[2] += p[2];
  }
  mean[0] /= n;
  mean[1] /= n;
  mean[2] /= n;
  let sq = 0, maxDist = 0;
  for (const p of pts) {
    const d2 = (p[0] - mean[0]) ** 2 + (p[1] - mean[1]) ** 2 + (p[2] - mean[2]) ** 2;
    sq += d2;
    if (d2 > maxDist) maxDist = d2;
  }
  return { mean: mean.map(Math.round), std: Math.sqrt(sq / n), maxDist: Math.sqrt(maxDist) };
}

// src/lib/alphaTriage.js
var TRIAGE_DEFAULTS = {
  flatStd: 8,
  // 이하: 단색 매트
  nonflatStd: 45,
  // 초과: 사진/텍스처 배경
  softDist: 110,
  // 배경과의 색거리가 이 값 미만이면 '옅은' 픽셀 (통계용)
  hardDist: 84,
  // 경계 픽셀의 색거리가 이 이상이면 '단단한' 경계 (= tolerance 40 + feather 22 × 2)
  edgeRadius: 2,
  // 경계 판정 이웃 거리(px)
  glowHardRatio: 0.08,
  // 단단한 경계 비율이 이 미만이면 발광 플레이트
  lowContrastP50: 120,
  // 피사체 색거리 중앙값이 이 미만이면 저대비(회색 위 크롬 등) — 허용치를 올리면 피사체가 뚫린다
  minSubjectFrac: 2e-3
  // 배경과 다른 픽셀이 이보다 적으면 판단 보류(빈 이미지)
};
function softRatio(data, W, H, bg, { tolerance = KEY_DEFAULTS.tolerance, softDist = TRIAGE_DEFAULTS.softDist } = {}) {
  const step = Math.max(1, Math.floor(Math.sqrt(W * H / 25e4)));
  let subject = 0, soft = 0, total = 0;
  const t2 = tolerance * tolerance, s2 = softDist * softDist;
  const hist = new Uint32Array(450);
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
      const d2 = dr * dr + dg * dg + db * db;
      total++;
      if (d2 > t2) {
        subject++;
        if (d2 < s2) soft++;
        hist[Math.min(449, Math.sqrt(d2) | 0)]++;
      }
    }
  }
  let acc = 0, p50 = 0;
  for (let d = 0; d < hist.length; d++) {
    acc += hist[d];
    if (acc >= subject / 2) {
      p50 = d;
      break;
    }
  }
  return { subjectFrac: subject / total, softRatio: subject ? soft / subject : 0, subjectP50: p50 };
}
function edgeHardness(data, W, H, bg, { tolerance = KEY_DEFAULTS.tolerance, hardDist = TRIAGE_DEFAULTS.hardDist, edgeRadius = TRIAGE_DEFAULTS.edgeRadius } = {}) {
  const N = W * H, r = edgeRadius;
  const dist = new Float32Array(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
    dist[p] = Math.sqrt(dr * dr + dg * dg + db * db);
  }
  let boundary = 0, hard = 0;
  for (let y = r; y < H - r; y++) {
    for (let x = r; x < W - r; x++) {
      const p = y * W + x;
      if (dist[p] <= tolerance) continue;
      if (!(dist[p - r] <= tolerance || dist[p + r] <= tolerance || dist[p - r * W] <= tolerance || dist[p + r * W] <= tolerance)) continue;
      boundary++;
      if (dist[p] >= hardDist) hard++;
    }
  }
  return { boundary, hardRatio: boundary ? hard / boundary : 0 };
}
function triageImage(px, opts = {}) {
  const o = { ...TRIAGE_DEFAULTS, ...opts };
  const { data, width: W, height: H } = px;
  const st = borderStats(data, W, H);
  const bg = detectBg(data, W, H);
  const sr = softRatio(data, W, H, bg, { softDist: o.softDist });
  const eh = edgeHardness(data, W, H, bg, { hardDist: o.hardDist, edgeRadius: o.edgeRadius });
  const stats = { bgStd: Math.round(st.std * 10) / 10, bgMaxDist: Math.round(st.maxDist), subjectFrac: Math.round(sr.subjectFrac * 1e3) / 1e3, softRatio: Math.round(sr.softRatio * 100) / 100, subjectP50: sr.subjectP50, hardRatio: Math.round(eh.hardRatio * 1e3) / 1e3 };
  const bgOut = { r: bg[0], g: bg[1], b: bg[2] };
  if (st.std > o.nonflatStd) {
    return { class: "nonflat", mode: "ai", params: {}, bg: bgOut, stats, reason: `\uD14C\uB450\uB9AC \uC0C9 \uBD84\uC0B0 std ${stats.bgStd} > ${o.nonflatStd} \u2014 \uC0AC\uC9C4/\uD14D\uC2A4\uCC98 \uBC30\uACBD, \uC0C9\uC0C1 \uD0A4 \uBD88\uAC00(AI \uBD84\uB9AC \uB300\uC0C1)` };
  }
  if (sr.subjectFrac < o.minSubjectFrac) {
    return { class: "flat", mode: "key", params: {}, bg: bgOut, stats, reason: `\uBC30\uACBD\uACFC \uB2E4\uB978 \uD53D\uC140\uC774 ${(sr.subjectFrac * 100).toFixed(2)}% \u2014 \uAC70\uC758 \uBE48 \uC774\uBBF8\uC9C0, \uAE30\uBCF8\uAC12 \uC720\uC9C0(\uD655\uC778 \uD544\uC694)` };
  }
  if (eh.hardRatio < o.glowHardRatio) {
    return { class: "glow", mode: "effect", params: { cleanIslands: false, killFaint: 0 }, bg: bgOut, stats, reason: `\uACBD\uACC4\uC758 ${(eh.hardRatio * 100).toFixed(1)}% \uB9CC \uB2E8\uB2E8\uD568(< ${o.glowHardRatio * 100}%) \u2014 \uBC1C\uAD11 \uD50C\uB808\uC774\uD2B8, \uC774\uD399\uD2B8 \uCD94\uCD9C` };
  }
  if (st.std > o.flatStd && sr.subjectP50 < o.lowContrastP50) {
    return { class: "lowcontrast", mode: "key", params: { tolerance: 45, feather: 40, killFaint: 0 }, bg: bgOut, stats, reason: `\uD14C\uB450\uB9AC std ${stats.bgStd} \uC778\uB370 \uD53C\uC0AC\uCCB4 \uC0C9\uAC70\uB9AC \uC911\uC559\uAC12 ${sr.subjectP50} < ${o.lowContrastP50} \u2014 \uC800\uB300\uBE44 \uD53C\uC0AC\uCCB4(\uD06C\uB86C/\uC720\uB9AC/\uB3D9\uC0C9 \uACC4\uC5F4), tolerance 45\xB7feather 40 \uB85C \uBCF4\uC218\uC801 \uD0A4\uC789. \uC794\uC5EC \uADF8\uB9BC\uC790\xB7\uBC18\uC0AC\xB7\uD5E4\uC774\uC988\uB294 \uC218\uB3D9 \uD655\uC778 \uB610\uB294 AI \uBD84\uB9AC` };
  }
  if (st.std > o.flatStd) {
    const tolerance = Math.max(55, Math.min(110, Math.round(40 + 2.2 * st.std), Math.round(sr.subjectP50 * 0.5)));
    return { class: "vignette", mode: "key", params: { tolerance, feather: 35, killFaint: 160 }, bg: bgOut, stats, reason: `\uD14C\uB450\uB9AC std ${stats.bgStd}, \uD53C\uC0AC\uCCB4 p50 ${sr.subjectP50} \u2014 \uBE44\uB124\uD305/\uADF8\uB77C\uB514\uC5B8\uD2B8, tolerance ${tolerance} + killFaint 160` };
  }
  return { class: "flat", mode: "key", params: {}, bg: bgOut, stats, reason: `\uD14C\uB450\uB9AC std ${stats.bgStd} \u2014 \uB2E8\uC0C9 \uB9E4\uD2B8, \uC0C9\uC0C1 \uD0A4 \uAE30\uBCF8\uAC12` };
}

// mcp/cli.mjs
var IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
var ITEM_DEFAULTS = {
  mode: "key",
  bg: "auto",
  trim: false,
  ...KEY_DEFAULTS,
  ...EFFECT_DEFAULTS,
  cleanIslands: true,
  killFaint: 0
};
var _canvas = null;
var canvasMod = async () => _canvas ||= await import("@napi-rs/canvas");
async function loadPixels(file) {
  const { createCanvas, loadImage } = await canvasMod();
  const img = await loadImage(file);
  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, img.width, img.height);
  return { data: id.data, width: id.width, height: id.height };
}
async function savePixels(px, file) {
  const { createCanvas } = await canvasMod();
  const cv = createCanvas(px.width, px.height);
  const ctx = cv.getContext("2d");
  const id = ctx.createImageData(px.width, px.height);
  id.data.set(px.data);
  ctx.putImageData(id, 0, 0);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, cv.toBuffer("image/png"));
}
function resolveBg(bg, px) {
  if (bg == null || bg === "auto") return detectBg(px.data, px.width, px.height);
  if (bg === "black") return [0, 0, 0];
  if (bg === "white") return [255, 255, 255];
  if (bg === "chroma") return [0, 255, 0];
  const rgb = toRgb(bg);
  if (!rgb) throw new Error(`\uBC30\uACBD\uC0C9\uC744 \uD574\uC11D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${bg}`);
  return rgb;
}
async function processItem(item) {
  const o = { ...ITEM_DEFAULTS, ...item };
  if (o.mode === "ai") {
    return { src: o.src, out: null, mode: "ai", skipped: true, qa: null, warnings: ["nonflat \uBC30\uACBD \u2014 \uC0C9\uC0C1 \uD0A4 \uB300\uC0C1 \uC544\uB2D8. nexus_remove_ai(\uC2B9\uC778 \uD544\uC694) \uB610\uB294 \uC218\uB3D9 \uBD84\uB9AC"] };
  }
  const src = await loadPixels(o.src);
  const bg = resolveBg(o.bg, src);
  const warnings = [];
  let px, qa;
  if (o.mode === "effect") {
    px = extractEffectPixels(src, { cutoff: o.cutoff, gamma: o.gamma, opacity: o.opacity, recoverColor: o.recoverColor, bg });
    qa = px.qa;
    if (qa.reconstructionMae > 0.02) warnings.push(`\uC5ED\uC0B0 \uC624\uCC28 MAE ${qa.reconstructionMae.toFixed(4)} \u2014 \uB9E4\uD2B8\uAC00 \uADE0\uC77C\uD558\uC9C0 \uC54A\uC744 \uC218 \uC788\uC74C`);
  } else if (o.mode === "key") {
    px = extractColorKeyPixels(src, { bg, tolerance: o.tolerance, feather: o.feather, holeProtect: o.holeProtect, holeSize: o.holeSize, decontam: o.decontam });
    qa = px.qa;
  } else {
    throw new Error(`\uC54C \uC218 \uC5C6\uB294 mode: ${o.mode} (key | effect)`);
  }
  const removed = {};
  if (o.cleanIslands) removed.islands = cleanIslands(px);
  if (o.killFaint > 0) removed.faint = killFaintIslands(px, { faintAlpha: o.killFaint });
  if (removed.islands || removed.faint) qa = { ...qa, ...alphaStats(px) };
  if (qa.transparentPixels === 0) warnings.push("\uC644\uC804 \uD22C\uBA85 \uD53D\uC140 \uC5C6\uC74C \u2014 bg \uB610\uB294 tolerance/cutoff \uD655\uC778");
  if (qa.opaquePixels + qa.partialPixels === 0) warnings.push("\uB0A8\uC740 \uD53C\uC0AC\uCCB4 \uC5C6\uC74C");
  const box = o.trim ? alphaTrimBox(px.data, px.width, px.height) : null;
  const result = box ? cropPixels(px, box) : px;
  await savePixels(result, o.out);
  const stats = borderStats(src.data, src.width, src.height);
  return {
    src: o.src,
    out: o.out,
    mode: o.mode,
    params: o.mode === "effect" ? { cutoff: o.cutoff, gamma: o.gamma, opacity: o.opacity, recoverColor: o.recoverColor } : { tolerance: o.tolerance, feather: o.feather, holeProtect: o.holeProtect, holeSize: o.holeSize, decontam: o.decontam },
    bg: { r: bg[0], g: bg[1], b: bg[2] },
    bgStd: Math.round(stats.std * 10) / 10,
    cleanup: { cleanIslands: !!o.cleanIslands, killFaint: o.killFaint, removed },
    size: { width: result.width, height: result.height },
    cropBox: box || null,
    qa,
    warnings
  };
}
if (!isMainThread && workerData && workerData.role === "alpha-worker") {
  parentPort.on("message", async (item) => {
    try {
      parentPort.postMessage({ ok: true, result: await processItem(item) });
    } catch (e) {
      parentPort.postMessage({ ok: false, src: item.src, error: e.message });
    }
  });
}
async function runPool(items, jobs, onDone) {
  const self = fileURLToPath(import.meta.url);
  const n = Math.max(1, Math.min(jobs, items.length));
  const results = new Array(items.length);
  const workers = [];
  let next = 0, finished = 0;
  try {
    await new Promise((resolve, reject) => {
      const spawn = () => {
        const w = new Worker(self, { workerData: { role: "alpha-worker" } });
        workers.push(w);
        let cur = -1;
        const feed = () => {
          if (next >= items.length) return;
          cur = next++;
          w.postMessage(items[cur]);
        };
        w.on("message", (m) => {
          results[cur] = m.ok ? m.result : { src: m.src, error: m.error };
          onDone(cur, results[cur]);
          if (++finished === items.length) resolve();
          else feed();
        });
        w.on("error", reject);
        feed();
      };
      for (let i = 0; i < n; i++) spawn();
    });
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
  return results;
}
async function contactSheet(results, file, { cell = 256, cols = 6 } = {}) {
  const { createCanvas, loadImage } = await canvasMod();
  const ok = results.filter((r) => r && !r.error && r.out);
  const rows = Math.ceil(ok.length / cols) || 1;
  const label = 20;
  const cv = createCanvas(cols * cell, rows * (cell + label));
  const ctx = cv.getContext("2d");
  const sq = 16;
  for (let y = 0; y < cv.height; y += sq) for (let x = 0; x < cv.width; x += sq) {
    ctx.fillStyle = (x / sq + y / sq) % 2 ? "#b4b4b4" : "#787878";
    ctx.fillRect(x, y, sq, sq);
  }
  ctx.font = "12px sans-serif";
  ctx.textBaseline = "top";
  for (let i = 0; i < ok.length; i++) {
    const r = ok[i];
    const img = await loadImage(r.out);
    const s = Math.min(cell / img.width, cell / img.height);
    const w = img.width * s, h = img.height * s;
    const x = i % cols * cell, y = Math.floor(i / cols) * (cell + label);
    ctx.drawImage(img, x + (cell - w) / 2, y + (cell - h) / 2, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y + cell, cell, label);
    ctx.fillStyle = r.warnings.length ? "#ffd166" : "#fff";
    ctx.fillText(path.basename(r.out, ".png").slice(0, 34), x + 4, y + cell + 4);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, cv.toBuffer("image/png"));
}
function parseArgs(argv) {
  const opt = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) {
      opt._.push(t);
      continue;
    }
    const k = t.slice(2);
    const v = argv[i + 1];
    if (v == null || v.startsWith("--")) {
      opt[k] = true;
      continue;
    }
    opt[k] = v;
    i++;
  }
  return opt;
}
var num = (v, d) => v == null ? d : Number(v);
var bool = (v, d) => v == null ? d : v === true || v === "true" || v === "1";
function listInputs(inputs) {
  const files = [];
  for (const p of inputs) {
    const abs = path.resolve(p);
    if (fs.statSync(abs).isDirectory()) {
      for (const f of fs.readdirSync(abs).sort()) if (IMAGE_EXT.test(f)) files.push(path.join(abs, f));
    } else if (IMAGE_EXT.test(abs)) files.push(abs);
  }
  return files;
}
function itemOptionsFromArgs(opt) {
  const o = {};
  if (opt.mode) o.mode = opt.mode;
  if (opt.bg) o.bg = opt.bg;
  for (const k of ["tolerance", "feather", "holeSize", "cutoff", "gamma", "opacity", "killFaint"]) if (opt[k] != null) o[k] = Number(opt[k]);
  for (const k of ["holeProtect", "decontam", "trim", "recoverColor", "cleanIslands"]) if (opt[k] != null) o[k] = bool(opt[k], true);
  return o;
}
async function buildItems(opt) {
  if (opt.plan) {
    const plan = JSON.parse(fs.readFileSync(path.resolve(opt.plan), "utf8"));
    const base = path.dirname(path.resolve(opt.plan));
    const defaults = plan.defaults || {};
    const outDir2 = plan.outDir ? path.resolve(base, plan.outDir) : base;
    return plan.items.map((it) => ({
      ...defaults,
      ...it,
      src: path.resolve(base, it.src),
      out: it.out ? path.resolve(base, it.out) : path.join(outDir2, path.basename(it.src).replace(IMAGE_EXT, "") + ".png")
    }));
  }
  const inputs = opt.in ? [opt.in, ...opt._.slice(1)] : opt._.slice(1);
  if (!inputs.length) throw new Error("--plan \uB610\uB294 --in \uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
  const outDir = path.resolve(opt["out-dir"] || "out");
  const common = itemOptionsFromArgs(opt);
  return listInputs(inputs).map((src) => ({ ...common, src, out: path.join(outDir, path.basename(src).replace(IMAGE_EXT, "") + ".png") }));
}
async function cmdPlan(opt) {
  const inputs = opt.in ? [opt.in, ...opt._.slice(1)] : opt._.slice(1);
  if (!inputs.length || !opt.out) throw new Error("\uC0AC\uC6A9: plan --in <dir> --out <plan.json> [--out-dir <dir>] [--no-triage] [--mode key|effect]");
  const planPath = path.resolve(opt.out);
  const base = path.dirname(planPath);
  const files = listInputs(inputs);
  const useTriage = !opt["no-triage"];
  const items = [];
  const counts = {};
  for (const f of files) {
    const px = await loadPixels(f);
    const item = { src: path.relative(base, f).split(path.sep).join("/"), size: [px.width, px.height] };
    if (useTriage) {
      const t = triageImage(px);
      Object.assign(item, { mode: t.mode, ...t.params, triage: { class: t.class, ...t.stats, reason: t.reason } });
      counts[t.class] = (counts[t.class] || 0) + 1;
      process.stderr.write(`scan ${path.basename(f)} ${px.width}x${px.height} \u2192 ${t.class} (${t.reason})
`);
    } else {
      const st = borderStats(px.data, px.width, px.height);
      item.bgStats = { mean: st.mean, std: Math.round(st.std * 10) / 10, maxDist: Math.round(st.maxDist) };
      process.stderr.write(`scan ${path.basename(f)} ${px.width}x${px.height} bg std ${st.std.toFixed(1)}
`);
    }
    items.push(item);
  }
  const plan = {
    outDir: opt["out-dir"] || "out",
    defaults: { mode: opt.mode || "key", bg: opt.bg || "auto", cleanIslands: true, killFaint: 0, ...itemOptionsFromArgs(opt) },
    note: useTriage ? "triage.class \u2014 flat: \uC0C9\uC0C1 \uD0A4 \uAE30\uBCF8\uAC12 \xB7 vignette: tolerance \uC0C1\uD5A5+killFaint \xB7 glow: \uC774\uD399\uD2B8 \uCD94\uCD9C \xB7 nonflat(mode ai): \uC0C9\uC0C1 \uD0A4 \uBD88\uAC00, AI \uBD84\uB9AC \uB300\uC0C1(alpha \uAC00 \uAC74\uB108\uB700). \uC790\uB3D9 \uD310\uC815\uC740 \uCD9C\uBC1C\uC810\uC774\uBA70 \uD56D\uBAA9\uBCC4 mode/tolerance/feather/killFaint \uB97C \uACE0\uCCD0 \uC4F4\uB2E4." : "bgStats.std \uAC00 6 \uC774\uD558\uBA74 \uD3C9\uD0C4 \uB9E4\uD2B8(key \uAE30\uBCF8\uAC12\uC73C\uB85C \uCDA9\uBD84). 15~40 \uC740 \uBE44\uB124\uD305/\uADF8\uB77C\uB514\uC5B8\uD2B8 \u2014 tolerance \uB97C \uC62C\uB9AC\uACE0 killFaint(150~200)\uB97C \uCF24 \uAC83. 60 \uC774\uC0C1\uC740 \uC0AC\uC9C4/\uD14D\uC2A4\uCC98 \uBC30\uACBD \u2014 \uC0C9\uC0C1 \uD0A4 \uB300\uC0C1\uC774 \uC544\uB2D8(AI \uBD84\uB9AC).",
    triageCounts: useTriage ? counts : void 0,
    items
  };
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 1), "utf8");
  console.log(`plan \uC800\uC7A5: ${planPath} (${items.length}\uAC1C${useTriage ? " \xB7 " + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ") : ""})`);
}
async function cmdAlpha(opt) {
  const items = await buildItems(opt);
  if (!items.length) throw new Error("\uCC98\uB9AC\uD560 \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
  const jobs = num(opt.jobs, Math.max(1, Math.min(os.cpus().length - 1, 8)));
  const t0 = Date.now();
  const results = await runPool(items, jobs, (i, r) => {
    const tag = r.error ? `FAIL ${r.error}` : r.skipped ? `SKIP ${r.warnings[0]}` : `${r.mode} bg(${r.bg.r},${r.bg.g},${r.bg.b}) std ${r.bgStd} \xB7 \uD22C\uBA85 ${r.qa.transparentPixels} \uBC18\uD22C\uBA85 ${r.qa.partialPixels} \uBD88\uD22C\uBA85 ${r.qa.opaquePixels}${r.warnings.length ? " \xB7 \u26A0 " + r.warnings.join(" / ") : ""}`;
    process.stderr.write(`[${i + 1}/${items.length}] ${path.basename(r.src || items[i].src)} \u2014 ${tag}
`);
  });
  const reportPath = path.resolve(opt.report || (opt.plan ? path.join(path.dirname(path.resolve(opt.plan)), "report.json") : path.join(opt["out-dir"] || "out", "report.json")));
  const failed = results.filter((r) => r.error);
  const skipped = results.filter((r) => r.skipped);
  const report = { engine: "nexus-studio/src/lib (colorKeyExtract \xB7 effectExtract \xB7 alphaCleanup \xB7 alphaTriage)", jobs, elapsedMs: Date.now() - t0, total: results.length, done: results.length - failed.length - skipped.length, failed: failed.length, skipped: skipped.length, items: results };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 1), "utf8");
  if (opt.sheet) await contactSheet(results, path.resolve(opt.sheet), { cell: num(opt["sheet-cell"], 256), cols: num(opt["sheet-cols"], 6) });
  console.log(`\uC644\uB8CC ${report.done}/${results.length}${skipped.length ? ` \xB7 \uAC74\uB108\uB700(ai) ${skipped.length}` : ""} \xB7 ${((Date.now() - t0) / 1e3).toFixed(1)}s \xB7 report ${reportPath}${opt.sheet ? ` \xB7 sheet ${path.resolve(opt.sheet)}` : ""}`);
  if (failed.length) {
    for (const f of failed) console.error(`FAIL ${f.src}: ${f.error}`);
    process.exitCode = 1;
  }
}
if (isMainThread) {
  const opt = parseArgs(process.argv.slice(2));
  const cmd = opt._[0];
  try {
    if (cmd === "plan") await cmdPlan(opt);
    else if (cmd === "alpha") await cmdAlpha(opt);
    else {
      console.error("\uC0AC\uC6A9:\n  nexus-cli plan  --in <dir> --out plan.json [--mode key|effect] [--out-dir out]\n  nexus-cli alpha --plan plan.json [--jobs N] [--sheet sheet.png]\n  nexus-cli alpha --in <dir> --out-dir out --mode key|effect [--tolerance 40 --feather 22 --killFaint 150 ...]");
      process.exitCode = 2;
    }
  } catch (e) {
    console.error(`\uC624\uB958: ${e.message}`);
    process.exitCode = 1;
  }
}
export {
  processItem
};
