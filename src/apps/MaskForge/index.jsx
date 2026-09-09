import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Eye, EyeOff, Loader2,
  Sparkles, RotateCcw, Image as ImageIcon, X, ExternalLink,
  ZoomIn, ZoomOut, Send, Pipette, PenTool,
} from 'lucide-react';
import { useGlobal } from '../../context/GlobalContext';
import { APP_MAP } from '../../config/apps';
import { computeCharMask, charSplitToBlobs } from '../../lib/charEffectSplit';
import { EFFECT_DEFAULTS, effectToBlob } from '../../lib/effectExtract';
import { KEY_DEFAULTS, colorKeyToBlob, shapeLockToBlob } from '../../lib/colorKeyExtract';
import { composeTitleFxToBlobs } from '../../lib/titleFxComposite';

const ACCENT = '#FF3366';
const API_KEY_STORAGE = 'mask-forge:apiKey';
const PREVIEW_COLOR = APP_MAP['nexus-preview']?.color || '#22B8CF';
const VECTOR_COLOR = APP_MAP['vector-forge']?.color || '#3DDC84';

// 배경 제거 방식.
//  - api  : Remove.bg AI (피사체 누끼 / 무료키는 ~0.25MP preview 해상도 제한)
//  - luma : 로컬 색상 키잉 — 감지/지정된 배경색 거리 기반 매트 (canvas · 원본 해상도 · 무료)
//           단색·단순 배경의 타이포·로고·발광 소재에 최적. 형태 보호 + 디프린지 + 트림 포함.
//  - sprite : 로컬 AI 세그멘테이션(RMBG-1.4 via transformers.js) + 수동 브러시 보정.
//             복잡한 게임 스크린샷에서 캐릭터/스프라이트 누끼. 첫 실행 시 모델(~44MB) 다운로드.
const METHOD_API = 'api';
const METHOD_LUMA = 'luma';
const METHOD_SPRITE = 'sprite';
const METHOD_EFFECT = 'effect';
const METHOD_CHAR = 'char';
const METHOD_EDGE = 'edge';
const METHOD_STORAGE = 'mask-forge:method';

// transformers.js ESM (CDN). 모델은 huggingface.co 에서 캐시됨. Gemini 프록시와 무관.
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// 스프라이트 브러시 기본값 + 다운로드 프리셋.
const SPRITE_BRUSH_DEFAULT = 40;

// 알파 매트 최소값 침식(수축) — 배경 테두리 잔여 제거. 분리형 min 필터(수평→수직).
function spriteErode(a, r, W, H) {
  if (r <= 0) return a;
  const t = new Uint8ClampedArray(W * H), o = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 255; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx < 0 || xx >= W) continue; const v = a[y * W + xx]; if (v < m) m = v; } t[y * W + x] = m; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 255; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy < 0 || yy >= H) continue; const v = t[yy * W + x]; if (v < m) m = v; } o[y * W + x] = m; }
  return o;
}
// 알파 매트 박스 블러 — 경계 부드럽기(feather). 분리형 평균 필터.
function spriteBlur(a, r, W, H) {
  if (r <= 0) return a;
  const t = new Float32Array(W * H), o = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx < 0 || xx >= W) continue; s += a[y * W + xx]; c++; } t[y * W + x] = s / c; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy < 0 || yy >= H) continue; s += t[yy * W + x]; c++; } o[y * W + x] = s / c; }
  return o;
}

// 로컬 색상 키잉 기본값.
// KEY_DEFAULTS · colorKeyToBlob 는 lib/colorKeyExtract 로 이전(마스크 포지·꾸러미 아이템 공유).

// EFFECT_DEFAULTS · effectToBlob 는 lib/effectExtract 로 이전(마스크 포지·루비콘 결과 셀 공유).
const EDGE_DEFAULTS = { sensitivity: 24, softness: 42, glow: 125, maskSize: 125, maskFeather: 45, recoverColor: true, trim: false };
// 캐릭터+이펙트 하이브리드 기본값 — solidLevel: 피사체 판정 색거리, closeRadius: 닫힘(틈 메움) 반경(px),
// edgeSoft: 피사체 경계 페더(px). cutoff/gamma/opacity 는 이펙트 알파 곡선(이펙트 추출과 동일 의미).
const CHAR_DEFAULTS = { solidLevel: 90, closeRadius: 12, cutoff: 6, gamma: 0.85, opacity: 100, edgeSoft: 4, recoverColor: true, trim: false };

// 결과 패널 배경 미리보기 프리셋 — 투명 컷아웃에 남은 잔여 엣지/헤일로를
// 다양한 배경(흰/검/회색 + 형광 녹·마젠타 = 잔여 픽셀 검출용)에서 검수.
const BG_PRESETS = [
  { key: 'checker', label: '투명' },
  { key: '#ffffff', label: '흰색' },
  { key: '#000000', label: '검정' },
  { key: '#808080', label: '회색' },
  { key: '#00e000', label: '녹색' },
  { key: '#ff00ff', label: '마젠타' },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// 리샘플 다운로드 — 프로모션의 작은 프레임 / 블릿 소재용 고정 가로폭 프리셋.
const RESAMPLE_PRESETS = [200, 300, 400, 600];
const RESAMPLE_DEFAULT = 400;

// 결과 PNG(투명)을 지정 가로폭으로 리샘플 → 투명 PNG blob. 세로는 비율 유지.
// 고품질 다운스케일을 위해 imageSmoothingQuality:'high'. 트림된 컷아웃을 그대로 받으면
// 가로폭만 맞춘 일정 크기 소재가 나온다.
async function resampleToWidth(srcUrl, targetW) {
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('결과 이미지를 불러올 수 없습니다.'));
    im.src = srcUrl;
  });
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  const w = Math.max(1, Math.round(targetW));
  if (w > natW) throw new Error(`업스케일은 지원하지 않습니다. 결과 원본 가로폭은 ${natW}px입니다.`);
  const h = Math.max(1, Math.round((natH / natW) * w));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png');
  });
  return { blob, width: w, height: h };
}

// Remove.bg API — base64 → POST /v1.0/removebg → PNG blob (alpha)
async function removeBgWithApi(file, apiKey, size = 'auto') {
  const base64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(String(e.target.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_file_b64: base64, size }),
  });
  if (!res.ok) {
    let msg = `Remove.bg ${res.status}`;
    if (res.status === 402) msg = '크레딧이 부족합니다. Remove.bg에서 충전하세요.';
    else if (res.status === 403) msg = 'API 키가 올바르지 않습니다.';
    else if (res.status === 429) msg = '요청이 너무 많습니다. 잠시 후 다시 시도하세요.';
    else {
      try { const j = await res.json(); msg = j.errors?.[0]?.title || msg; } catch { /* ignore */ }
    }
    throw new Error(msg);
  }
  const remaining = res.headers.get('X-Free-Calls');
  const charged = res.headers.get('X-Credits-Charged');
  const blob = await res.blob();
  return { blob, remaining, charged, size };
}

// 파일 → 디코딩된 HTMLImageElement. 한 번 디코딩 후 캐시해 실시간 재처리 비용을 줄임
// (디코딩이 가장 무거운 단계라 슬라이더 조절마다 다시 디코딩하지 않도록).
function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 불러올 수 없습니다.')); };
    im.src = url;
  });
}

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// 디코딩된 이미지 → 원본 해상도 ImageData. 픽셀 키잉·배경 감지·스포이드가 공유.
function imageToData(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h), w, h };
}

// 투명 결과의 실제 픽셀 크기와 알파 상태를 검사한다. 단순 성공 메시지 대신
// 저장 전 해상도 저하·빈 알파·과도한 완전 불투명을 드러내기 위한 공통 QA.
async function inspectTransparentBlob(blob) {
  const img = await decodeImage(blob);
  const { data } = imageToData(img);
  const px = data.data;
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0;
  let minX = data.width, minY = data.height, maxX = -1, maxY = -1;
  for (let p = 0; p < data.width * data.height; p++) {
    const a = px[p * 4 + 3];
    if (a === 0) transparentPixels++;
    else {
      const x = p % data.width, y = (p / data.width) | 0;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      if (a >= 254) opaquePixels++; else partialPixels++;
    }
  }
  return {
    width: data.width, height: data.height,
    transparentPixels, opaquePixels, partialPixels,
    totalPixels: data.width * data.height,
    touchesCanvasEdge: maxX >= 0 && (minX === 0 || minY === 0 || maxX === data.width - 1 || maxY === data.height - 1),
  };
}

function qaWarnings(qa, sourceDimensions, method) {
  if (!qa) return [];
  const warnings = [];
  if (!qa.transparentPixels) warnings.push('완전 투명 픽셀이 없습니다.');
  if (!qa.opaquePixels && method !== METHOD_EFFECT) warnings.push('완전 불투명 피사체가 없습니다.');
  if (!qa.partialPixels && method === METHOD_EFFECT) warnings.push('부드러운 부분 알파가 없습니다.');
  if (qa.touchesCanvasEdge) warnings.push('피사체 알파가 캔버스 경계에 닿습니다.');
  if (sourceDimensions && (qa.width < sourceDimensions.width || qa.height < sourceDimensions.height)) {
    warnings.push(`입력 ${sourceDimensions.width}×${sourceDimensions.height}보다 작은 출력입니다.`);
  }
  return warnings;
}

// 헥스(#rrggbb / #rgb) → [r,g,b]. 잘못된 값이면 null. (송신 앱이 지정한 키 컬러 변환용)
function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const h = hex.replace('#', '').trim();
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (n.length !== 6) return null;
  const int = parseInt(n, 16);
  if (Number.isNaN(int)) return null;
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

// 테두리 링을 샘플링해 가장 빈번한 색을 배경으로 추정 (글자가 모서리에 닿아도 견고).
function detectBg(d, w, h) {
  const buckets = {};
  const add = (x, y) => {
    const i = (y * w + x) * 4;
    const key = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3);
    const bk = (buckets[key] = buckets[key] || { n: 0, r: 0, g: 0, b: 0 });
    bk.n++; bk.r += d[i]; bk.g += d[i + 1]; bk.b += d[i + 2];
  };
  const step = Math.max(1, Math.floor(Math.min(w, h) / 120));
  for (let x = 0; x < w; x += step) { add(x, 0); add(x, h - 1); }
  for (let y = 0; y < h; y += step) { add(0, y); add(w - 1, y); }
  let best = null;
  for (const k in buckets) { if (!best || buckets[k].n > best.n) best = buckets[k]; }
  if (!best) return [0, 0, 0];
  return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
}

// computeFillMask(형태 보호)는 lib/colorKeyExtract 로 이전 — colorKeyToBlob 전용 헬퍼.

// 불투명 픽셀의 경계 박스 (트림용). pad 여백 포함.
function alphaTrimBox(o, W, H) {
  let minX = W, minY = H, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (o[(y * W + x) * 4 + 3] > 8) {
        found = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const pad = 2;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// colorKeyToBlob(로컬 색상 키)은 lib/colorKeyExtract 로 이전 — MaskForge·꾸러미 아이템 공유 단일 소스.
// effectToBlob(발광 이펙트 추출) 은 lib/effectExtract 로 이전 — MaskForge·RubiconForge 공유 단일 소스.

// 사각형 경계 클린업 — 이미지 테두리의 실제 배경과 비교해 어두운 렌더 패널의
// 색차 상한을 자동 추정한다. 그 아래의 저대비 면은 투명하게 만들고, 상한을 넘는
// 광원·글로우·파티클은 부드러운 알파로 복원한다. 고정 임계값 대신 원본마다
// dim-pixel 색차 분위수를 사용하므로 압축 노이즈와 미세한 배경 그라데이션에도 대응한다.
function edgeCleanupToBlob(srcData, { sensitivity, softness, glow, maskSize, maskFeather, recoverColor, trim, bg }) {
  const W = srcData.width, H = srcData.height, s = srcData.data;
  const [br, bgC, bb] = bg || detectBg(s, W, H);
  const bgLuma = br * 0.2126 + bgC * 0.7152 + bb * 0.0722;
  const distances = [];
  const step = Math.max(1, Math.floor(Math.sqrt(W * H) / 700));
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4;
    const d = Math.max(Math.abs(s[i] - br), Math.abs(s[i + 1] - bgC), Math.abs(s[i + 2] - bb));
    const luma = s[i] * 0.2126 + s[i + 1] * 0.7152 + s[i + 2] * 0.0722;
    // 밝은 실제 이펙트가 자동 배경 상한을 끌어올리지 않도록 어두운 70% 영역만 표본화.
    if (luma < 178) distances.push(d);
  }
  distances.sort((a, b) => a - b);
  const q = distances.length ? distances[Math.floor((distances.length - 1) * 0.88)] : 0;
  const threshold = Math.min(220, Math.max(0, q + sensitivity));
  const ramp = Math.max(2, softness);
  const gain = Math.max(0.25, glow / 100);
  // 밝은 이펙트 상위 픽셀만으로 원형 마스크를 맞춘다. 색차 기준을 쓰면 어두운 사각
  // 패널까지 표본에 섞여 반지름이 화면보다 커지므로, 실제 최대 광량의 22% 이상만 사용한다.
  let maxLightRise = 0;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4;
    const luma = s[i] * 0.2126 + s[i + 1] * 0.7152 + s[i + 2] * 0.0722;
    maxLightRise = Math.max(maxLightRise, luma - bgLuma);
  }
  const brightFloor = Math.max(24, maxLightRise * 0.22);
  let minBrightX = W, minBrightY = H, maxBrightX = 0, maxBrightY = 0, brightCount = 0;
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4;
    const luma = s[i] * 0.2126 + s[i + 1] * 0.7152 + s[i + 2] * 0.0722;
    if (luma - bgLuma < brightFloor) continue;
    minBrightX = Math.min(minBrightX, x); maxBrightX = Math.max(maxBrightX, x);
    minBrightY = Math.min(minBrightY, y); maxBrightY = Math.max(maxBrightY, y);
    brightCount++;
  }
  const maskCx = brightCount ? (minBrightX + maxBrightX) / 2 : W / 2;
  const maskCy = brightCount ? (minBrightY + maxBrightY) / 2 : H / 2;
  const radii = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
    const i = (y * W + x) * 4;
    const luma = s[i] * 0.2126 + s[i + 1] * 0.7152 + s[i + 2] * 0.0722;
    if (luma - bgLuma >= brightFloor) radii.push(Math.hypot(x - maskCx, y - maskCy));
  }
  radii.sort((a, b) => a - b);
  const detectedRadius = radii.length ? radii[Math.floor((radii.length - 1) * 0.72)] : Math.min(W, H) * 0.32;
  // 마스크 크기는 완전 투명해지는 바깥 반경, 페이드는 그 반경에서 안쪽으로 들어오는 폭.
  // 따라서 페이드 값을 키우면 원주 주변부터 변화가 즉시 보여 조절감이 명확하다.
  const maskOuter = Math.max(4, detectedRadius * Math.max(0.55, maskSize / 100));
  const maskInner = Math.max(0, maskOuter - detectedRadius * Math.max(0.03, maskFeather / 100));
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(W, H), o = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const d = Math.max(Math.abs(s[i] - br), Math.abs(s[i + 1] - bgC), Math.abs(s[i + 2] - bb));
    const luma = s[i] * 0.2126 + s[i + 1] * 0.7152 + s[i + 2] * 0.0722;
    let t = Math.min(1, Math.max(0, (d - threshold) / ramp));
    t = t * t * (3 - 2 * t); // smoothstep — 직선 경계 주변 밴딩 방지
    // 렌더 패널의 대각선/직선 테두리는 색차는 있지만 대개 배경과 밝기가 비슷하다.
    // 낮은 밝기 신호에는 데드존을 두고 다시 0~1로 매핑해 선만 남는 현상을 차단한다.
    const lightRise = Math.max(0, luma - bgLuma);
    const darkGateStart = Math.max(3, sensitivity * 0.28);
    const darkGateEnd = darkGateStart + Math.max(10, softness * 0.55);
    const darkGateRaw = Math.min(1, Math.max(0, (lightRise - darkGateStart) / (darkGateEnd - darkGateStart)));
    const darkGate = darkGateRaw * darkGateRaw * (3 - 2 * darkGateRaw);
    t *= darkGate;
    // 최종 원형 그라디언트 마스크. 이펙트 원 안은 유지하고 마름모/사각 패널이 있는
    // 바깥쪽은 부드럽게 0으로 감쇠한다.
    const p = i / 4, px = p % W, py = (p / W) | 0;
    const radialDistance = Math.hypot(px - maskCx, py - maskCy);
    const radialRaw = Math.min(1, Math.max(0, (maskOuter - radialDistance) / Math.max(1, maskOuter - maskInner)));
    const radialMask = radialRaw * radialRaw * (3 - 2 * radialRaw);
    t *= radialMask;
    if (t < 0.025) t = 0;
    const a = Math.min(1, t * gain) * (s[i + 3] / 255);
    if (a <= 0.0004) { o[i] = o[i + 1] = o[i + 2] = o[i + 3] = 0; continue; }
    // 약한 경계 신호를 역산하면 RGB가 과도하게 밝아져 선이 강조되므로,
    // 충분한 광원 알파가 확보된 픽셀에서만 straight-alpha 색을 복원한다.
    if (recoverColor && d > 0.5 && t >= 0.16) {
      const at = Math.max(d / 255, 0.004), inv = 1 - at;
      o[i] = clamp255((s[i] - inv * br) / at);
      o[i + 1] = clamp255((s[i + 1] - inv * bgC) / at);
      o[i + 2] = clamp255((s[i + 2] - inv * bb) / at);
    } else { o[i] = s[i]; o[i + 1] = s[i + 1]; o[i + 2] = s[i + 2]; }
    o[i + 3] = clamp255(a * 255);
  }
  ctx.putImageData(out, 0, 0);
  let exportCanvas = canvas;
  if (trim) {
    const box = alphaTrimBox(o, W, H);
    if (box) {
      exportCanvas = document.createElement('canvas'); exportCanvas.width = box.w; exportCanvas.height = box.h;
      exportCanvas.getContext('2d').drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    }
  }
  return new Promise((resolve, reject) => exportCanvas.toBlob((blob) => blob
    ? resolve({ blob, width: exportCanvas.width, height: exportCanvas.height, threshold: Math.round(threshold), maskRadius: Math.round(maskOuter) })
    : reject(new Error('PNG 변환 실패')), 'image/png'));
}

// ─── 캐릭터+이펙트 하이브리드 추출 ─────────────────────────────────────────────
// 단색 배경 위 "불투명 피사체 + 발광 이펙트(글로우·파티클)"가 공존하는 렌더 전용.
// 색상 키(피사체의 어두운 내부가 뚫림)와 이펙트 추출(피사체 어두운 부분이 반투명해짐)의
// 한계를 보완: ①확실한 피사체(d≥solidLevel)를 시드로 형태학적 닫힘+내부 구멍 채움 →
// 피사체 마스크 S (어두운 음영·검정 부위도 '둘러싸인 영역'으로 복원되어 불투명 유지)
// ②S 밖은 이펙트 알파(밝기 곡선) → 글로우·파티클은 부드러운 반투명으로
// ③S 경계는 edgeSoft 페더로 이펙트 알파와 자연스럽게 연결, 발광색 복원은 배경 성분 역산.
function charToBlob(srcData, { bg, solidLevel, closeRadius, cutoff, gamma, opacity, edgeSoft, recoverColor, trim }) {
  const W = srcData.width, H = srcData.height, N = W * H, s = srcData.data;
  const [br, bgC, bb] = bg || [0, 0, 0];
  const { d, dComp, r3 } = computeCharMask(srcData, { bg, solidLevel, closeRadius });

  const th = Math.min(0.95, Math.max(0, cutoff / 255));
  const curve = Math.max(0.2, gamma);
  const gain = Math.max(0, opacity / 100);
  const edge3 = Math.max(1, edgeSoft) * 3;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(W, H), o = out.data;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const dn = d[p] / 255;
    // 이펙트 알파 (이펙트 추출과 동일 곡선)
    let ea = dn <= th ? 0 : (dn - th) / Math.max(0.001, 1 - th);
    ea = Math.min(1, Math.pow(ea, curve) * gain);
    // 피사체 깊이 램프 — S 내부는 불투명, 경계 edgeSoft px 구간은 페더
    const depth = dComp[p] - r3;
    const ramp = depth <= 0 ? 0 : Math.min(1, depth / edge3);
    const a = Math.max(ramp, ea) * (s[i + 3] / 255);
    if (a <= 0.0004) { o[i] = o[i + 1] = o[i + 2] = o[i + 3] = 0; continue; }
    let r = s[i], g = s[i + 1], b = s[i + 2];
    if (ramp < 1 && recoverColor) {
      // 반투명 구간 배경 성분 역산 — 참 알파 근사는 색거리와 램프 중 큰 값 (경계 안정화)
      const at = Math.max(dn, ramp, 0.004), inv = 1 - at;
      r = clamp255((r - inv * br) / at);
      g = clamp255((g - inv * bgC) / at);
      b = clamp255((b - inv * bb) / at);
    }
    o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = clamp255(a * 255);
  }
  ctx.putImageData(out, 0, 0);

  let exportCanvas = canvas;
  if (trim) {
    const box = alphaTrimBox(o, W, H);
    if (box) {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = box.w; exportCanvas.height = box.h;
      exportCanvas.getContext('2d').drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    }
  }
  return new Promise((resolve, reject) => exportCanvas.toBlob((blob) => blob ? resolve({ blob, width: exportCanvas.width, height: exportCanvas.height }) : reject(new Error('PNG 변환 실패')), 'image/png'));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MaskForgeApp() {
  const { navigate, payload, clearPayload } = useGlobal();
  const consumedPayloadRef = useRef(null);

  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(API_KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [showKey, setShowKey] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(null);
  const [removeSize, setRemoveSize] = useState('auto');

  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [sourceDimensions, setSourceDimensions] = useState(null);
  const [resultQa, setResultQa] = useState(null);
  const [titleMaskFile, setTitleMaskFile] = useState(null);
  const [backFxFile, setBackFxFile] = useState(null);
  const [frontFxFile, setFrontFxFile] = useState(null);
  const [frontFxOverlap, setFrontFxOverlap] = useState(12);
  const [titleFxLayers, setTitleFxLayers] = useState(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);

  // 배경 제거 방식 + 루마키 파라미터.
  const [method, setMethod] = useState(() => {
    try {
      const saved = localStorage.getItem(METHOD_STORAGE);
      if (saved === METHOD_API && !localStorage.getItem(API_KEY_STORAGE)) return METHOD_LUMA;
      return saved || METHOD_LUMA;
    } catch { return METHOD_LUMA; }
  });
  const [bgColor, setBgColor] = useState(null); // 감지/지정된 배경색 [r,g,b]
  const [tolerance, setTolerance] = useState(KEY_DEFAULTS.tolerance);
  const [feather, setFeather] = useState(KEY_DEFAULTS.feather);
  const [holeProtect, setHoleProtect] = useState(KEY_DEFAULTS.holeProtect);
  const [holeSize, setHoleSize] = useState(KEY_DEFAULTS.holeSize);
  const [decontam, setDecontam] = useState(KEY_DEFAULTS.decontam);
  const [trim, setTrim] = useState(KEY_DEFAULTS.trim);
  const [picking, setPicking] = useState(false); // 스포이드 모드
  const [lumaBusy, setLumaBusy] = useState(false);
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [effectTuneOpen, setEffectTuneOpen] = useState(false); // 이펙트 추출 조정바 — 기본 접힘
  const [charTuneOpen, setCharTuneOpen] = useState(false);     // 캐릭터+이펙트 조정바 — 기본 접힘
  const [effectCutoff, setEffectCutoff] = useState(EFFECT_DEFAULTS.cutoff);
  const [effectGamma, setEffectGamma] = useState(EFFECT_DEFAULTS.gamma);
  const [effectOpacity, setEffectOpacity] = useState(EFFECT_DEFAULTS.opacity);
  const [effectRecoverColor, setEffectRecoverColor] = useState(EFFECT_DEFAULTS.recoverColor);
  const [effectTrim, setEffectTrim] = useState(EFFECT_DEFAULTS.trim);
  const [edgeSensitivity, setEdgeSensitivity] = useState(EDGE_DEFAULTS.sensitivity);
  const [edgeSoftness, setEdgeSoftness] = useState(EDGE_DEFAULTS.softness);
  const [edgeGlow, setEdgeGlow] = useState(EDGE_DEFAULTS.glow);
  const [edgeMaskSize, setEdgeMaskSize] = useState(EDGE_DEFAULTS.maskSize);
  const [edgeMaskFeather, setEdgeMaskFeather] = useState(EDGE_DEFAULTS.maskFeather);
  const [edgeRecover, setEdgeRecover] = useState(EDGE_DEFAULTS.recoverColor);
  const [edgeTrim, setEdgeTrim] = useState(EDGE_DEFAULTS.trim);
  // 캐릭터+이펙트 하이브리드 파라미터
  const [charSolid, setCharSolid] = useState(CHAR_DEFAULTS.solidLevel);
  const [charClose, setCharClose] = useState(CHAR_DEFAULTS.closeRadius);
  const [charCutoff, setCharCutoff] = useState(CHAR_DEFAULTS.cutoff);
  const [charGamma, setCharGamma] = useState(CHAR_DEFAULTS.gamma);
  const [charEdge, setCharEdge] = useState(CHAR_DEFAULTS.edgeSoft);
  const [charRecover, setCharRecover] = useState(CHAR_DEFAULTS.recoverColor);
  const [charTrim, setCharTrim] = useState(CHAR_DEFAULTS.trim);
  const lumaImgRef = useRef(null); // 디코딩된 원본 캐시 — 실시간 재처리용
  const srcDataRef = useRef(null);  // 원본 ImageData 캐시 — 키잉·감지·스포이드 공유
  const titleMaskDataRef = useRef(null);
  const backFxDataRef = useRef(null);
  const frontFxDataRef = useRef(null);

  // 결과 패널 배경 미리보기 (view-only — 다운로드 PNG 는 항상 투명 유지).
  const [bgPreset, setBgPreset] = useState('checker');
  const [customBg, setCustomBg] = useState('#3366ff');

  // 리샘플 다운로드 가로폭 (프로모션 작은 프레임 / 블릿 소재용).
  const [resampleWidth, setResampleWidth] = useState(RESAMPLE_DEFAULT);
  const [resampling, setResampling] = useState(false);

  // 결과 확대/패닝 — 컷아웃 엣지를 픽셀 단위로 검수. 휠(커서 기준) + 드래그 이동.
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const resultRef = useRef(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const [status, setStatus] = useState({ msg: 'API 키를 입력하고 이미지를 업로드하세요', state: 'idle' });
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);

  const fileInputRef = useRef(null);

  // API 키는 브라우저 localStorage 에만 저장. 외부 전송 없음.
  useEffect(() => {
    try {
      if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch { /* quota or disabled — ignore */ }
  }, [apiKey]);

  useEffect(() => {
    try { localStorage.setItem(METHOD_STORAGE, method); } catch { /* ignore */ }
  }, [method]);

  // blob URL 누수 방지.
  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  useEffect(() => () => {
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);

  // 상태값을 ref 에 미러링 — 휠 핸들러가 stale closure 없이 최신값을 읽도록.
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // 휠 줌 — 커서 위치를 고정점으로 확대/축소. passive:false 라야 스크롤 차단 가능.
  useEffect(() => {
    const el = resultRef.current;
    if (!el || !resultUrl) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const z = zoomRef.current;
      const nz = clampZoom(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      if (nz === z) return;
      if (nz <= MIN_ZOOM + 1e-3) { setZoom(MIN_ZOOM); setOffset({ x: 0, y: 0 }); return; }
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      const ratio = nz / z;
      const o = offsetRef.current;
      setZoom(nz);
      setOffset({ x: mx + (o.x - mx) * ratio, y: my + (o.y - my) * ratio });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [resultUrl]);

  const resetZoom = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);

  // 버튼 줌 — 패널 중심 기준.
  const zoomBy = useCallback((factor) => {
    const z = zoomRef.current;
    const nz = clampZoom(z * factor);
    if (nz === z) return;
    if (nz <= MIN_ZOOM + 1e-3) { setZoom(MIN_ZOOM); setOffset({ x: 0, y: 0 }); return; }
    const ratio = nz / z;
    setZoom(nz);
    setOffset((o) => ({ x: o.x * ratio, y: o.y * ratio }));
  }, []);

  // 드래그 패닝 — 확대 상태에서만. pointer capture 로 패널 밖까지 추적.
  const onPanStart = useCallback((e) => {
    if (zoomRef.current <= MIN_ZOOM) return;
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ...offsetRef.current, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  }, []);
  const onPanMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.x + (e.clientX - d.sx), y: d.y + (e.clientY - d.sy) });
  }, []);
  const onPanEnd = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    e.currentTarget.releasePointerCapture?.(d.id);
    dragRef.current = null;
    setDragging(false);
  }, []);

  const setStatusMsg = (msg, state = 'idle') => setStatus({ msg, state });

  // opts.trusted — 다른 앱(루비콘/브리즈 등)에서 navigate 로 보낸 앱 내부 생성 이미지.
  //   4K 렌더 결과는 12MB 를 쉽게 넘겨 크기 가드에 걸려 "이미지가 안 붙던" 문제 → 신뢰 소스는 우회.
  const loadFile = useCallback((file, opts = {}) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setStatusMsg('이미지 파일만 가능합니다 (PNG · JPG · WEBP)', 'error');
      return;
    }
    if (!opts.trusted && file.size > 12 * 1024 * 1024) {
      setStatusMsg(`파일이 너무 큽니다 (최대 12MB · 현재 ${(file.size / 1024 / 1024).toFixed(1)}MB)`, 'error');
      return;
    }
    setUploadedFile(file);
    lumaImgRef.current = null; // 새 이미지 — 캐시 무효화
    srcDataRef.current = null;
    titleMaskDataRef.current = null;
    setTitleMaskFile(null);
    backFxDataRef.current = null;
    frontFxDataRef.current = null;
    setBackFxFile(null);
    setFrontFxFile(null);
    setTitleFxLayers(null);
    setBgColor(null); // 새 이미지 — 배경색 재감지
    setPicking(false);
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setResultUrl(null);
    setSourceDimensions(null);
    setResultQa(null);
    setProgress(0);
    setStatusMsg('이미지 준비 완료. 배경 제거를 실행하세요.', 'done');
    decodeImage(file).then((img) => {
      setSourceDimensions({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    }).catch(() => {});
  }, [previewUrl, resultUrl]);

  // 다른 앱(TypecoreBreeze 등)에서 navigate 로 보낸 이미지를 자동 로드.
  // cloudinary URL · dataURL 모두 fetch → File 변환 후 loadFile 로 동일 경로 진입.
  useEffect(() => {
    if (!payload || payload.target !== 'mask-forge' || !payload.timestamp) return undefined;
    if (consumedPayloadRef.current === payload.timestamp) return undefined;
    const url = payload.image?.url;
    if (!url) return undefined;
    consumedPayloadRef.current = payload.timestamp;
    let cancelled = false;
    (async () => {
      try {
        setStatus({ msg: '이미지 불러오는 중…', state: 'active' });
        const res = await fetch(url, url.startsWith('data:') ? undefined : { mode: 'cors' });
        if (!res.ok) throw new Error(`이미지 fetch ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const ext = (blob.type && blob.type.split('/')[1]) || 'png';
        const file = new File([blob], `incoming_${payload.timestamp}.${ext}`, { type: blob.type || 'image/png' });
        loadFile(file, { trusted: true }); // 앱 내부 생성 이미지 — 크기 가드 우회
        // 송신 앱이 방식/키 컬러를 지정하면 반영 — 루비콘 포지: 로컬 색상 키(luma)로 진입하고
        // 생성 배경색을 키 컬러로 미리 지정해 컨트롤 가능한 투명 추출이 즉시 시작되게 한다.
        // (loadFile 이 bgColor 를 null 로 리셋하므로 그 뒤에 지정해야 자동 감지 대신 지정색이 쓰임)
        const p = payload.params || {};
        if ([METHOD_LUMA, METHOD_API, METHOD_EFFECT].includes(p.method)) setMethod(p.method);
        if (p.keyColor) { const rgb = hexToRgb(p.keyColor); if (rgb) setBgColor(rgb); }
        try { clearPayload(); } catch { /* ignore */ }
      } catch (e) {
        if (!cancelled) {
          console.error('[MaskForge] payload 이미지 로드 실패', e);
          setStatus({ msg: `불러오기 실패: ${e.message || e}`, state: 'error' });
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target]);

  // 결과 blob 교체 (이전 blob URL 정리). 줌은 건드리지 않음.
  const applyResultQuiet = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    setResultUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const applyResult = useCallback((blob) => {
    applyResultQuiet(blob);
    setZoom(1); setOffset({ x: 0, y: 0 });
  }, [applyResultQuiet]);

  // 디코딩된 원본 ImageData 를 캐시에서 반환 (없으면 디코딩 후 캐시).
  const ensureSrcData = useCallback(async () => {
    if (srcDataRef.current) return srcDataRef.current;
    if (!uploadedFile) return null;
    const img = lumaImgRef.current || await decodeImage(uploadedFile);
    lumaImgRef.current = img;
    const { data } = imageToData(img);
    srcDataRef.current = data;
    return data;
  }, [uploadedFile]);

  const ensureTitleMaskData = useCallback(async () => {
    if (titleMaskDataRef.current) return titleMaskDataRef.current;
    if (!titleMaskFile) return null;
    const img = await decodeImage(titleMaskFile);
    const { data } = imageToData(img);
    titleMaskDataRef.current = data;
    return data;
  }, [titleMaskFile]);

  const ensureTitleFxData = useCallback(async () => {
    const decode = async (file, ref) => {
      if (!file) return null;
      if (ref.current) return ref.current;
      const img = await decodeImage(file);
      const { data } = imageToData(img);
      ref.current = data;
      return data;
    };
    return {
      back: await decode(backFxFile, backFxDataRef),
      front: await decode(frontFxFile, frontFxDataRef),
    };
  }, [backFxFile, frontFxFile]);

  // 배경색 자동 감지 — 로컬 키잉·이펙트 추출·캐릭터+이펙트 모드 진입 + 이미지 준비 시 1회.
  // 이펙트 계열도 배경색을 써야 크로마 그린 등 비검정 배경 렌더가 추출된다.
  useEffect(() => {
    if (![METHOD_LUMA, METHOD_EFFECT, METHOD_CHAR, METHOD_EDGE].includes(method) || !uploadedFile || bgColor) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await ensureSrcData();
        if (!data || cancelled) return;
        setBgColor(detectBg(data.data, data.width, data.height));
      } catch (e) {
        if (!cancelled) console.error('[MaskForge] bg detect failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [method, uploadedFile, bgColor, ensureSrcData]);

  // 로컬 키잉 실시간 미리보기 — 슬라이더/토글/배경색/이미지/방식 변경 시 디바운스 후 재처리.
  // 오버레이/진행바 없이 조용히 결과만 교체 (resultUrl 은 deps 에서 제외 → 무한 루프 방지).
  useEffect(() => {
    if (method !== METHOD_LUMA || !uploadedFile || !bgColor) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLumaBusy(true);
      try {
        const data = await ensureSrcData();
        if (!data || cancelled) return;
        const lockedMask = await ensureTitleMaskData();
        const fx = await ensureTitleFxData();
        const hasFx = Boolean(lockedMask && (fx.back || fx.front));
        const result = hasFx
          ? await composeTitleFxToBlobs(data, lockedMask, fx.back, fx.front, {
            frontOverlap: frontFxOverlap,
            trim,
            effectOptions: { cutoff: effectCutoff, gamma: effectGamma, opacity: effectOpacity, recoverColor: effectRecoverColor },
          })
          : lockedMask
            ? await shapeLockToBlob(data, lockedMask, { trim })
            : await colorKeyToBlob(data, { bg: bgColor, tolerance, feather, holeProtect, holeSize, decontam, trim });
        const { blob, width, height, qa } = result;
        if (cancelled) return;
        applyResultQuiet(blob);
        setTitleFxLayers(result.layers || null);
        setResultQa({ ...qa, width, height, warnings: qaWarnings({ ...qa, width, height }, trim ? null : sourceDimensions, method) });
        setStatus({ msg: `${hasFx ? '타이틀+FX 심리스 합성' : lockedMask ? '타이틀 형태 잠금' : '로컬 배경 제거'} · 실시간 (${width}×${height})`, state: 'done' });
      } catch (e) {
        if (!cancelled) {
          console.error('[MaskForge] color key live failed', e);
          setStatus({ msg: `오류: ${e.message || e}`, state: 'error' });
        }
      } finally {
        setLumaBusy(false);
      }
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [method, uploadedFile, bgColor, tolerance, feather, holeProtect, holeSize, decontam, trim, ensureSrcData, ensureTitleMaskData, ensureTitleFxData, applyResultQuiet, sourceDimensions, frontFxOverlap, effectCutoff, effectGamma, effectOpacity, effectRecoverColor]);

  // 발광 이펙트 실시간 추출 — 검정 제거와 색 복원을 원본 해상도에서 즉시 갱신.
  useEffect(() => {
    if (method !== METHOD_EFFECT || !uploadedFile) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLumaBusy(true);
      try {
        const data = await ensureSrcData();
        if (!data || cancelled) return;
        const { blob, width, height, qa } = await effectToBlob(data, { cutoff: effectCutoff, gamma: effectGamma, opacity: effectOpacity, recoverColor: effectRecoverColor, trim: effectTrim, bg: bgColor });
        if (cancelled) return;
        applyResultQuiet(blob);
        setResultQa({ ...qa, width, height, warnings: qaWarnings({ ...qa, width, height }, effectTrim ? null : sourceDimensions, method) });
        setStatus({ msg: `이펙트 추출 · 실시간 (${width}×${height})`, state: 'done' });
      } catch (e) {
        if (!cancelled) setStatus({ msg: `오류: ${e.message || e}`, state: 'error' });
      } finally { if (!cancelled) setLumaBusy(false); }
    }, 90);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [method, uploadedFile, bgColor, effectCutoff, effectGamma, effectOpacity, effectRecoverColor, effectTrim, ensureSrcData, applyResultQuiet, sourceDimensions]);

  // 사각 경계 제거 실시간 미리보기.
  useEffect(() => {
    if (method !== METHOD_EDGE || !uploadedFile) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLumaBusy(true);
      try {
        const data = await ensureSrcData();
        if (!data || cancelled) return;
        const result = await edgeCleanupToBlob(data, { sensitivity: edgeSensitivity, softness: edgeSoftness, glow: edgeGlow, maskSize: edgeMaskSize, maskFeather: edgeMaskFeather, recoverColor: edgeRecover, trim: edgeTrim, bg: bgColor });
        if (cancelled) return;
        applyResultQuiet(result.blob);
        setStatus({ msg: `원형 마스크 반경 ${result.maskRadius}px · 자동 기준 ${result.threshold} · 실시간 (${result.width}×${result.height})`, state: 'done' });
      } catch (e) {
        if (!cancelled) setStatus({ msg: `오류: ${e.message || e}`, state: 'error' });
      } finally { if (!cancelled) setLumaBusy(false); }
    }, 120);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [method, uploadedFile, bgColor, edgeSensitivity, edgeSoftness, edgeGlow, edgeMaskSize, edgeMaskFeather, edgeRecover, edgeTrim, ensureSrcData, applyResultQuiet]);

  // 캐릭터+이펙트 실시간 추출 — 거리 변환 2회가 있어 이펙트보다 무겁게 디바운스(180ms).
  useEffect(() => {
    if (method !== METHOD_CHAR || !uploadedFile) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLumaBusy(true);
      try {
        const data = await ensureSrcData();
        if (!data || cancelled) return;
        const { blob, width, height } = await charToBlob(data, {
          bg: bgColor || [0, 0, 0], solidLevel: charSolid, closeRadius: charClose,
          cutoff: charCutoff, gamma: charGamma, opacity: CHAR_DEFAULTS.opacity,
          edgeSoft: charEdge, recoverColor: charRecover, trim: charTrim,
        });
        if (cancelled) return;
        applyResultQuiet(blob);
        setStatus({ msg: `캐릭터+이펙트 분리 · 실시간 (${width}×${height})`, state: 'done' });
      } catch (e) {
        if (!cancelled) setStatus({ msg: `오류: ${e.message || e}`, state: 'error' });
      } finally { if (!cancelled) setLumaBusy(false); }
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [method, uploadedFile, bgColor, charSolid, charClose, charCutoff, charGamma, charEdge, charRecover, charTrim, ensureSrcData, applyResultQuiet]);

  // 스포이드 — 원본 미리보기 클릭 위치의 픽셀색을 배경색으로 지정 (색상 키·이펙트·캐릭터 공용).
  const handleEyedrop = useCallback(async (e) => {
    if (!picking || ![METHOD_LUMA, METHOD_EFFECT, METHOD_CHAR, METHOD_EDGE].includes(method)) return;
    const data = await ensureSrcData();
    if (!data) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const W = data.width, H = data.height;
    // object-contain 보정 — 이미지가 컨테이너 안에 레터박스로 들어가 있음.
    const scale = Math.min(rect.width / W, rect.height / H);
    const dispW = W * scale, dispH = H * scale;
    const padX = (rect.width - dispW) / 2, padY = (rect.height - dispH) / 2;
    const x = Math.floor((e.clientX - rect.left - padX) / scale);
    const y = Math.floor((e.clientY - rect.top - padY) / scale);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    setBgColor([data.data[i], data.data[i + 1], data.data[i + 2]]);
    setPicking(false);
  }, [picking, method, ensureSrcData]);

  // 캐릭터/이펙트 분리 다운로드 — 밝은 배경 합성용 (이펙트 레이어는 스크린 블렌드로 사용)
  const handleCharSplit = useCallback(async () => {
    if (!uploadedFile) { setStatusMsg('이미지를 먼저 업로드하세요', 'error'); return; }
    setProcessing(true); setStatusMsg('캐릭터/이펙트 분리 출력 중...', 'active'); setProgress(40);
    try {
      const data = await ensureSrcData();
      if (!data) throw new Error('이미지를 불러올 수 없습니다.');
      const bg = bgColor || detectBg(data.data, data.width, data.height);
      const { charBlob, fxBlob, width, height } = await charSplitToBlobs(data, { bg, solidLevel: charSolid, closeRadius: charClose, edgeSoft: charEdge });
      downloadBlob(charBlob, 'maskforge_캐릭터.png');
      await new Promise((r) => setTimeout(r, 350));
      downloadBlob(fxBlob, 'maskforge_이펙트_screen.png');
      setProgress(100); setStatusMsg(`완료! 캐릭터 + 이펙트(스크린용) 2장 저장 (${width}×${height})`, 'done');
    } catch (e) { setStatusMsg(`오류: ${e.message || e}`, 'error'); setProgress(0); }
    finally { setProcessing(false); }
  }, [uploadedFile, bgColor, charSolid, charClose, charEdge, ensureSrcData]);

  const handleProcess = useCallback(async () => {
    if (!uploadedFile) { setStatusMsg('이미지를 먼저 업로드하세요', 'error'); return; }

    // 로컬 색상 키잉 — 로컬 처리, API 키 불필요, 원본 해상도 유지.
    if (method === METHOD_LUMA) {
      setProcessing(true);
      setStatusMsg('배경 제거 중... (로컬 처리)', 'active');
      setProgress(40);
      try {
        const data = await ensureSrcData();
        if (!data) throw new Error('이미지를 불러올 수 없습니다.');
        const bg = bgColor || detectBg(data.data, data.width, data.height);
        const lockedMask = await ensureTitleMaskData();
        const fx = await ensureTitleFxData();
        const hasFx = Boolean(lockedMask && (fx.back || fx.front));
        const result = hasFx
          ? await composeTitleFxToBlobs(data, lockedMask, fx.back, fx.front, {
            frontOverlap: frontFxOverlap,
            trim,
            effectOptions: { cutoff: effectCutoff, gamma: effectGamma, opacity: effectOpacity, recoverColor: effectRecoverColor },
          })
          : lockedMask
            ? await shapeLockToBlob(data, lockedMask, { trim })
            : await colorKeyToBlob(data, { bg, tolerance, feather, holeProtect, holeSize, decontam, trim });
        const { blob, width, height, qa } = result;
        applyResult(blob);
        setTitleFxLayers(result.layers || null);
        setResultQa({ ...qa, width, height, warnings: qaWarnings({ ...qa, width, height }, trim ? null : sourceDimensions, method) });
        setProgress(100);
        setStatusMsg(`완료! ${hasFx ? '타이틀+FX 심리스 합성' : lockedMask ? '타이틀 형태 잠금' : '로컬 배경 제거'} (${width}×${height})`, 'done');
      } catch (e) {
        console.error('[MaskForge] color key failed', e);
        setStatusMsg(`오류: ${e.message || e}`, 'error');
        setProgress(0);
      } finally {
        setProcessing(false);
      }
      return;
    }

    if (method === METHOD_EFFECT) {
      setProcessing(true); setStatusMsg('발광 이펙트 추출 중...', 'active'); setProgress(45);
      try {
        const data = await ensureSrcData();
        if (!data) throw new Error('이미지를 불러올 수 없습니다.');
        const bg = bgColor || detectBg(data.data, data.width, data.height);
        const { blob, width, height, qa } = await effectToBlob(data, { cutoff: effectCutoff, gamma: effectGamma, opacity: effectOpacity, recoverColor: effectRecoverColor, trim: effectTrim, bg });
        applyResult(blob);
        setResultQa({ ...qa, width, height, warnings: qaWarnings({ ...qa, width, height }, effectTrim ? null : sourceDimensions, method) });
        setProgress(100); setStatusMsg(`완료! 이펙트 알파 추출 (${width}×${height})`, 'done');
      } catch (e) { setStatusMsg(`오류: ${e.message || e}`, 'error'); setProgress(0); }
      finally { setProcessing(false); }
      return;
    }

    if (method === METHOD_EDGE) {
      setProcessing(true); setStatusMsg('사각형 경계 분석 및 제거 중...', 'active'); setProgress(45);
      try {
        const data = await ensureSrcData();
        if (!data) throw new Error('이미지를 불러올 수 없습니다.');
        const bg = bgColor || detectBg(data.data, data.width, data.height);
        const result = await edgeCleanupToBlob(data, { sensitivity: edgeSensitivity, softness: edgeSoftness, glow: edgeGlow, maskSize: edgeMaskSize, maskFeather: edgeMaskFeather, recoverColor: edgeRecover, trim: edgeTrim, bg });
        applyResult(result.blob); setProgress(100);
        setStatusMsg(`완료! 원형 마스크 반경 ${result.maskRadius}px · 자동 기준 ${result.threshold} (${result.width}×${result.height})`, 'done');
      } catch (e) { setStatusMsg(`오류: ${e.message || e}`, 'error'); setProgress(0); }
      finally { setProcessing(false); }
      return;
    }

    if (method === METHOD_CHAR) {
      setProcessing(true); setStatusMsg('캐릭터+이펙트 분리 중...', 'active'); setProgress(45);
      try {
        const data = await ensureSrcData();
        if (!data) throw new Error('이미지를 불러올 수 없습니다.');
        const bg = bgColor || detectBg(data.data, data.width, data.height);
        const { blob, width, height } = await charToBlob(data, {
          bg, solidLevel: charSolid, closeRadius: charClose, cutoff: charCutoff,
          gamma: charGamma, opacity: CHAR_DEFAULTS.opacity, edgeSoft: charEdge,
          recoverColor: charRecover, trim: charTrim,
        });
        applyResult(blob); setProgress(100); setStatusMsg(`완료! 캐릭터+이펙트 분리 (${width}×${height})`, 'done');
      } catch (e) { setStatusMsg(`오류: ${e.message || e}`, 'error'); setProgress(0); }
      finally { setProcessing(false); }
      return;
    }

    // Remove.bg AI.
    if (!apiKey.trim()) { setStatusMsg('API 키를 먼저 입력하세요', 'error'); return; }
    const confirmed = window.confirm(`이 이미지를 Remove.bg로 전송합니다. 출력 크기: ${removeSize === 'full' ? 'Full(크레딧 사용 가능)' : 'Auto'}. 이번 호출을 진행할까요?`);
    if (!confirmed) { setStatusMsg('외부 전송을 취소했습니다.', 'idle'); return; }
    setProcessing(true);
    setStatusMsg('Remove.bg AI에 이미지 전송 중...', 'active');
    setProgress(20);
    try {
      // 폴링 없는 동기 API — 사용자 체감용으로만 진행 바 80%까지 가짜 진행.
      const progTick = setTimeout(() => setProgress(60), 500);
      const { blob, remaining } = await removeBgWithApi(uploadedFile, apiKey.trim(), removeSize);
      clearTimeout(progTick);
      setProgress(90);
      const qa = await inspectTransparentBlob(blob);
      applyResult(blob);
      const warnings = qaWarnings(qa, sourceDimensions, method);
      setResultQa({ ...qa, warnings });
      if (remaining !== null) setCreditsRemaining(remaining);
      setProgress(100);
      setStatusMsg(`완료! Remove.bg ${removeSize} · ${qa.width}×${qa.height}${warnings.length ? ` · QA 경고 ${warnings.length}건` : ''}`, warnings.length ? 'error' : 'done');
    } catch (e) {
      console.error('[MaskForge] failed', e);
      setStatusMsg(`오류: ${e.message || e}`, 'error');
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }, [apiKey, uploadedFile, method, bgColor, tolerance, feather, holeProtect, holeSize, decontam, trim, effectCutoff, effectGamma, effectOpacity, effectRecoverColor, effectTrim, edgeSensitivity, edgeSoftness, edgeGlow, edgeMaskSize, edgeMaskFeather, edgeRecover, edgeTrim, charSolid, charClose, charCutoff, charGamma, charEdge, charRecover, charTrim, applyResult, ensureSrcData, ensureTitleMaskData, ensureTitleFxData, removeSize, sourceDimensions, frontFxOverlap]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `bg_removed_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [resultUrl]);

  // 결과를 지정 가로폭으로 리샘플해 투명 PNG 다운로드.
  const handleResampleDownload = useCallback(async () => {
    if (!resultUrl) return;
    const targetW = Math.min(4096, Math.max(16, Math.round(Number(resampleWidth) || RESAMPLE_DEFAULT)));
    setResampling(true);
    try {
      const { blob, width, height } = await resampleToWidth(resultUrl, targetW);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bg_removed_${width}x${height}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg(`리샘플 다운로드 완료 (${width}×${height})`, 'done');
    } catch (e) {
      console.error('[MaskForge] resample download failed', e);
      setStatusMsg(`리샘플 실패: ${e.message || e}`, 'error');
    } finally {
      setResampling(false);
    }
  }, [resultUrl, resampleWidth]);

  // 결과(투명 PNG)를 NEXUS Preview 로 타이틀로 전송.
  // blob URL 은 이 앱이 언마운트되면 revoke 되므로, 자가완결 dataURL 로 변환해 전달.
  const handleSendToPreview = useCallback(async () => {
    if (!resultUrl) return;
    try {
      const blob = await (await fetch(resultUrl)).blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      navigate('nexus-preview', { source: 'mask-forge', image: { url: dataUrl, metadata: {} } });
    } catch (e) {
      console.error('[MaskForge] send to preview failed', e);
      setStatusMsg(`보내기 실패: ${e.message || e}`, 'error');
    }
  }, [resultUrl, navigate]);

  // 결과(투명 PNG)를 Vector Forge 로 전송 — 투명 = 배경, 불투명 = 잉크. 흰 글자면 Vector Forge 가 반전을 권장한다.
  const handleSendToVectorForge = useCallback(async () => {
    if (!resultUrl) return;
    try {
      const blob = await (await fetch(resultUrl)).blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      navigate('vector-forge', { source: 'mask-forge', image: { url: dataUrl, metadata: { from: 'MaskForge' } }, params: { preset: 'title' } });
    } catch (e) {
      console.error('[MaskForge] send to vector forge failed', e);
      setStatusMsg(`보내기 실패: ${e.message || e}`, 'error');
    }
  }, [resultUrl, navigate]);

  const handleReset = useCallback(() => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
    setUploadedFile(null);
    lumaImgRef.current = null;
    srcDataRef.current = null;
    titleMaskDataRef.current = null;
    setTitleMaskFile(null);
    backFxDataRef.current = null;
    frontFxDataRef.current = null;
    setBackFxFile(null);
    setFrontFxFile(null);
    setTitleFxLayers(null);
    setBgColor(null);
    setPicking(false);
    setPreviewUrl(null);
    setResultUrl(null);
    setSourceDimensions(null);
    setResultQa(null);
    setZoom(1); setOffset({ x: 0, y: 0 });
    setProgress(0);
    setStatusMsg('이미지를 업로드하세요');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl, resultUrl]);

  const dotClass =
    status.state === 'active' ? 'animate-pulse' : '';
  const dotColor =
    status.state === 'done' ? ACCENT
    : status.state === 'active' ? ACCENT
    : status.state === 'error' ? '#ff5566'
    : '#3f3f46';
  const textColor =
    status.state === 'done' ? 'text-zinc-100'
    : status.state === 'active' ? 'text-[#FF3366]'
    : status.state === 'error' ? 'text-rose-400'
    : 'text-zinc-500';

  return (
    <div className="flex flex-col h-full w-full bg-[#0A0A0A] text-zinc-100 p-5 overflow-hidden font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.2); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.5); }
        .bg-maskforge-checker {
          background-image: repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%);
          background-size: 20px 20px;
        }
        .bg-maskforge-grid {
          background-image:
            linear-gradient(rgba(255,51,102,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,51,102,.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-maskforge-grid -m-5 p-5">
        <div className="max-w-5xl mx-auto flex flex-col gap-5">

          {/* Hero — Noto Sans KR(font-sans) + font-black. Teko 는 한글 글리프가 없어 OS fallback 발생하므로 본문 폰트로 통일. */}
          <div className="text-center pt-4 pb-2">
            <h1 className="font-sans font-black tracking-tight leading-tight text-[clamp(26px,5vw,48px)]">
              배경을 <span style={{ color: ACCENT }}>정밀하게</span> 분리
            </h1>
            <p className="text-zinc-500 text-[12px] mt-2 tracking-wide">
              {method === METHOD_API && 'Remove.bg AI — 머리카락 · 반투명 · 복잡한 배경까지 전문가 수준으로 처리'}
              {method === METHOD_LUMA && '로컬 색상 키 — 단색·단순 배경의 타이포 / 로고 / 발광 소재를 원본 해상도로'}
              {method === METHOD_SPRITE && '로컬 AI 스프라이트 — 복잡한 게임 화면에서 캐릭터 분리 후 브러시로 마무리'}
              {method === METHOD_EFFECT && '이펙트 알파 추출 — 검정·크로마 등 단색 배경은 제거하고 빛의 색과 부드러운 투명도는 자연스럽게 보존'}
              {method === METHOD_EDGE && '사각 경계 제거 — 렌더 이미지의 직선으로 끊긴 어두운 패널을 자동 감지하고 광원·파티클은 보존'}
              {method === METHOD_CHAR && '캐릭터+이펙트 분리 — 불투명 캐릭터는 어두운 부위까지 온전히, 글로우·파티클은 부드러운 반투명으로 동시에 추출'}
            </p>
          </div>

          {/* 방식 선택 */}
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-1.5 grid grid-cols-2 lg:grid-cols-3 gap-1.5">
            {[
              { key: METHOD_API, title: 'Remove.bg AI', desc: '피사체 누끼 · Auto / Full 해상도 선택' },
              { key: METHOD_LUMA, title: '로컬 색상 키', desc: '원본 해상도 · 카운터 보존 기본 · 단색 배경' },
              { key: METHOD_EFFECT, title: '이펙트 추출', desc: '검정·크로마 배경 광원 · 글로우 · 파티클 전용 알파 복원' },
              { key: METHOD_EDGE, title: '사각 경계 제거', desc: '직선으로 끊긴 렌더 패널 제거 · 광원과 파티클 보존' },
              { key: METHOD_CHAR, title: '캐릭터+이펙트', desc: '불투명 피사체 + 발광 이펙트 동시 분리 · 단색 배경 렌더 전용' },
              { key: METHOD_SPRITE, title: 'AI 스프라이트', desc: '로컬 AI 누끼 + 브러시 보정 · 복잡한 게임 화면' },
            ].map((m) => {
              const active = method === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => { setMethod(m.key); setResultQa(null); setZoom(1); setOffset({ x: 0, y: 0 }); }}
                  className={`flex-1 text-left rounded-lg px-4 py-3 transition-colors ${active ? '' : 'hover:bg-white/5'}`}
                  style={active ? { background: ACCENT, color: '#000' } : undefined}
                >
                  <div className="text-[12px] font-black tracking-wide flex items-center gap-1.5">
                    {m.title}
                    {m.key === METHOD_LUMA && <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${active ? 'border-black/30 text-black/70' : 'border-rose-500/30 text-rose-300'}`}>추천</span>}
                  </div>
                  <div className={`text-[10px] mt-0.5 tracking-wide ${active ? 'text-black/70' : 'text-zinc-500'}`}>{m.desc}</div>
                </button>
              );
            })}
          </div>

          {/* API Key bar — Remove.bg 방식에서만 */}
          {method === METHOD_API && (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">API Key</span>
            <div className="flex-1 min-w-[200px] flex items-center border border-zinc-800 bg-black/40 rounded-lg px-3 gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Remove.bg API 키를 입력하세요"
                className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-zinc-100 py-2.5 placeholder:text-zinc-600 tracking-wider"
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                title={showKey ? '숨기기' : '보기'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <a
              href="https://www.remove.bg/api"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-bold tracking-wider whitespace-nowrap border-b border-[#FF3366]/30 hover:border-[#FF3366] transition-colors flex items-center gap-1"
              style={{ color: ACCENT }}
            >
              무료 키 발급 <ExternalLink size={10} />
            </a>
            <div className="inline-flex items-center gap-1 bg-black/40 border border-zinc-800 rounded-lg p-1">
              {[{ key: 'auto', label: 'Auto' }, { key: 'full', label: 'Full' }].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setRemoveSize(s.key)}
                  title={s.key === 'full' ? '가능한 최고 해상도. 크레딧이 사용될 수 있습니다.' : '계정과 입력에 맞는 해상도를 자동 선택합니다.'}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${removeSize === s.key ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                  style={removeSize === s.key ? { background: ACCENT } : undefined}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {creditsRemaining !== null && (
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 border border-zinc-800 rounded px-2.5 py-1 whitespace-nowrap">
                잔여 {creditsRemaining} 크레딧
              </span>
            )}
          </div>
          )}

          {method === METHOD_EFFECT && (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">발광 알파 복원</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>원본 해상도 · 실시간</span>
              {lumaBusy && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            </div>

            {/* 배경색 — 자동 감지 + 스포이드. 검정뿐 아니라 크로마 그린 등 단색 배경 발광 렌더 지원 */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">배경색</span>
              <span
                className="w-8 h-8 rounded-md border border-zinc-700 shrink-0"
                style={{ background: bgColor ? `rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})` : '#000' }}
                title={bgColor ? `rgb(${bgColor.join(', ')})` : '감지 대기 (기본 검정)'}
              />
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                {bgColor ? `#${bgColor.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}` : '자동 감지 대기'}
              </span>
              <button
                onClick={() => setPicking((v) => !v)}
                disabled={!uploadedFile}
                className={`ml-auto text-[10px] font-bold tracking-wider px-3 py-2 rounded-lg border inline-flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${picking ? 'text-black' : 'text-zinc-300 border-zinc-700 hover:border-zinc-500'}`}
                style={picking ? { background: ACCENT, borderColor: ACCENT } : undefined}
              >
                <Pipette size={12} /> {picking ? '원본에서 배경 클릭…' : '스포이드'}
              </button>
              {bgColor && (
                <button
                  onClick={async () => { const d = await ensureSrcData(); if (d) setBgColor(detectBg(d.data, d.width, d.height)); }}
                  className="text-[10px] font-bold tracking-wider px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  title="테두리에서 배경색 다시 감지"
                >
                  자동 재감지
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setEffectTuneOpen((open) => !open)}
              className="w-full flex items-center justify-between rounded-lg border border-zinc-800 bg-black/20 px-3 py-2.5 text-left text-[11px] font-bold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <span>세부 조정</span>
              <span className="text-[10px] text-zinc-600">{effectTuneOpen ? '접기 −' : '필요할 때 열기 +'}</span>
            </button>
            {effectTuneOpen && <div className="flex flex-col gap-4 border-l-2 border-rose-500/30 pl-3">
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">배경 제거</span><input type="range" min={0} max={64} value={effectCutoff} onChange={(e) => setEffectCutoff(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{effectCutoff}</span></label>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">알파 곡선</span><input type="range" min={0.35} max={1.8} step={0.05} value={effectGamma} onChange={(e) => setEffectGamma(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{effectGamma.toFixed(2)}</span></label>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">불투명도</span><input type="range" min={25} max={200} value={effectOpacity} onChange={(e) => setEffectOpacity(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{effectOpacity}%</span></label>
            <div className="flex flex-wrap gap-2">
              {[{ on: effectRecoverColor, set: setEffectRecoverColor, label: '발광색 복원', title: '배경과 섞인 색을 역산해 배경색 헤일로를 제거합니다.' }, { on: effectTrim, set: setEffectTrim, label: '여백 트림', title: '투명 여백을 자동으로 잘라냅니다.' }].map(t => <button key={t.label} onClick={() => t.set(v => !v)} title={t.title} className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${t.on ? 'text-black' : 'text-zinc-400 border-zinc-700'}`} style={t.on ? { background: ACCENT, borderColor: ACCENT } : undefined}>{t.label}</button>)}
              <button onClick={() => { setEffectCutoff(EFFECT_DEFAULTS.cutoff); setEffectGamma(EFFECT_DEFAULTS.gamma); setEffectOpacity(EFFECT_DEFAULTS.opacity); setEffectRecoverColor(true); setEffectTrim(false); }} className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400">기본값</button>
            </div>
            <p className="text-[10px] leading-relaxed text-zinc-500"><b className="text-zinc-300">배경색</b>은 테두리에서 자동 감지 — 검정은 물론 크로마 그린/블루 같은 단색 배경도 지원하며, 잘못 잡히면 스포이드로 지정하세요. 색 복원은 <b className="text-zinc-300">최종 알파와 같은 매트</b>로 계산해 검은 프린지와 밝기 이동을 줄입니다. 밝은 배경에서 발광 원리를 유지하려면 결과 레이어를 <b className="text-zinc-300">Screen 또는 Add</b>로 합성하세요.</p>
            </div>}
          </div>
          )}

          {/* 사각 렌더 경계 제거 설정 */}
          {method === METHOD_EDGE && (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">사각 경계 자동 클린업</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>원본 해상도 · 실시간</span>
              {lumaBusy && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            </div>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">제거 강도</span><input type="range" min={0} max={90} value={edgeSensitivity} onChange={(e) => setEdgeSensitivity(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{edgeSensitivity}</span></label>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">경계 부드럽기</span><input type="range" min={4} max={120} value={edgeSoftness} onChange={(e) => setEdgeSoftness(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{edgeSoftness}</span></label>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">글로우 보존</span><input type="range" min={50} max={200} value={edgeGlow} onChange={(e) => setEdgeGlow(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{edgeGlow}%</span></label>
            <div className="border-t border-zinc-800 pt-4 flex flex-col gap-4">
              <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">원형 마스크</span><input type="range" min={75} max={170} value={edgeMaskSize} onChange={(e) => setEdgeMaskSize(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{edgeMaskSize}%</span></label>
              <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">마스크 페이드</span><input type="range" min={5} max={100} value={edgeMaskFeather} onChange={(e) => setEdgeMaskFeather(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{edgeMaskFeather}%</span></label>
            </div>
            <div className="flex flex-wrap gap-2">
              {[{ on: edgeRecover, set: setEdgeRecover, label: '발광색 복원', title: '배경색 성분을 역산해 탁한 테두리를 제거합니다.' }, { on: edgeTrim, set: setEdgeTrim, label: '여백 트림', title: '투명 여백을 자동으로 잘라냅니다.' }].map(t => <button key={t.label} onClick={() => t.set(v => !v)} title={t.title} className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${t.on ? 'text-black' : 'text-zinc-400 border-zinc-700'}`} style={t.on ? { background: ACCENT, borderColor: ACCENT } : undefined}>{t.label}</button>)}
              <button onClick={() => { setEdgeSensitivity(EDGE_DEFAULTS.sensitivity); setEdgeSoftness(EDGE_DEFAULTS.softness); setEdgeGlow(EDGE_DEFAULTS.glow); setEdgeMaskSize(EDGE_DEFAULTS.maskSize); setEdgeMaskFeather(EDGE_DEFAULTS.maskFeather); setEdgeRecover(EDGE_DEFAULTS.recoverColor); setEdgeTrim(EDGE_DEFAULTS.trim); }} className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400">기본값</button>
            </div>
            <p className="text-[10px] leading-relaxed text-zinc-500">밝은 이펙트 픽셀로 중심과 반지름을 자동 계산하고 원형 그라디언트 마스크를 씌웁니다. 대각선이 남으면 <b className="text-zinc-300">원형 마스크</b>를 줄이고, 광선 끝이 잘리면 마스크를 키우거나 <b className="text-zinc-300">마스크 페이드</b>를 올리세요.</p>
          </div>
          )}

          {/* 캐릭터+이펙트 하이브리드 설정 */}
          {method === METHOD_CHAR && (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">캐릭터+이펙트 분리</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>원본 해상도 · 실시간</span>
              {lumaBusy && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            </div>

            {/* 배경색 — 자동 감지 + 스포이드 (이펙트 모드와 동일) */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">배경색</span>
              <span
                className="w-8 h-8 rounded-md border border-zinc-700 shrink-0"
                style={{ background: bgColor ? `rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})` : '#000' }}
                title={bgColor ? `rgb(${bgColor.join(', ')})` : '감지 대기 (기본 검정)'}
              />
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                {bgColor ? `#${bgColor.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}` : '자동 감지 대기'}
              </span>
              <button
                onClick={() => setPicking((v) => !v)}
                disabled={!uploadedFile}
                className={`ml-auto text-[10px] font-bold tracking-wider px-3 py-2 rounded-lg border inline-flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${picking ? 'text-black' : 'text-zinc-300 border-zinc-700 hover:border-zinc-500'}`}
                style={picking ? { background: ACCENT, borderColor: ACCENT } : undefined}
              >
                <Pipette size={12} /> {picking ? '원본에서 배경 클릭…' : '스포이드'}
              </button>
              {bgColor && (
                <button
                  onClick={async () => { const d = await ensureSrcData(); if (d) setBgColor(detectBg(d.data, d.width, d.height)); }}
                  className="text-[10px] font-bold tracking-wider px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  title="테두리에서 배경색 다시 감지"
                >
                  자동 재감지
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCharTuneOpen((open) => !open)}
              className="w-full flex items-center justify-between rounded-lg border border-zinc-800 bg-black/20 px-3 py-2.5 text-left text-[11px] font-bold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <span>세부 조정</span>
              <span className="text-[10px] text-zinc-600">{charTuneOpen ? '접기 −' : '필요할 때 열기 +'}</span>
            </button>
            {charTuneOpen && <div className="flex flex-col gap-4 border-l-2 border-rose-500/30 pl-3">
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0" title="이 값 이상 배경과 다른 픽셀을 '확실한 캐릭터'로 봅니다. 글로우가 캐릭터로 붙으면 올리고, 캐릭터가 뚫리면 내리세요.">피사체 기준</span><input type="range" min={30} max={200} value={charSolid} onChange={(e) => setCharSolid(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{charSolid}</span></label>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0" title="캐릭터 안의 어두운 틈·음영을 메우는 반경(px). 내부에 구멍이 남으면 올리세요.">틈 메움</span><input type="range" min={2} max={40} value={charClose} onChange={(e) => setCharClose(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{charClose}</span></label>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">배경 제거</span><input type="range" min={0} max={64} value={charCutoff} onChange={(e) => setCharCutoff(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{charCutoff}</span></label>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">알파 곡선</span><input type="range" min={0.35} max={1.8} step={0.05} value={charGamma} onChange={(e) => setCharGamma(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{charGamma.toFixed(2)}</span></label>
            <label className="flex items-center gap-3"><span className="text-[11px] font-bold text-zinc-400 w-24 shrink-0">경계 부드럽기</span><input type="range" min={1} max={20} value={charEdge} onChange={(e) => setCharEdge(Number(e.target.value))} className="flex-1 accent-[#FF3366]" /><span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{charEdge}</span></label>
            <div className="flex flex-wrap gap-2">
              {[{ on: charRecover, set: setCharRecover, label: '발광색 복원', title: '반투명 구간에서 배경색 성분을 역산 제거해 헤일로를 없앱니다.' }, { on: charTrim, set: setCharTrim, label: '여백 트림', title: '투명 여백을 자동으로 잘라냅니다.' }].map(t => <button key={t.label} onClick={() => t.set(v => !v)} title={t.title} className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${t.on ? 'text-black' : 'text-zinc-400 border-zinc-700'}`} style={t.on ? { background: ACCENT, borderColor: ACCENT } : undefined}>{t.label}</button>)}
              <button onClick={() => { setCharSolid(CHAR_DEFAULTS.solidLevel); setCharClose(CHAR_DEFAULTS.closeRadius); setCharCutoff(CHAR_DEFAULTS.cutoff); setCharGamma(CHAR_DEFAULTS.gamma); setCharEdge(CHAR_DEFAULTS.edgeSoft); setCharRecover(CHAR_DEFAULTS.recoverColor); setCharTrim(CHAR_DEFAULTS.trim); }} className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400">기본값</button>
            </div>
            <p className="text-[10px] leading-relaxed text-zinc-500">캐릭터 렌더 향상 결과물처럼 <b className="text-zinc-300">불투명 캐릭터와 발광 이펙트가 한 장에 공존</b>하는 이미지 전용. <b className="text-zinc-300">피사체 기준</b>으로 캐릭터를 통째 마스크로 잡아 어두운 부위까지 온전히 유지하고, 마스크 밖의 글로우·파티클은 밝기 곡선으로 부드럽게 살립니다. 글로우가 캐릭터에 딱 붙어 불투명해지면 피사체 기준을 올리고, 캐릭터에 구멍이 나면 틈 메움을 올리세요.</p>
            </div>}

            {/* 밝은 배경 합성용 분리 출력 — 통합 PNG의 가산광 한계 대응 */}
            <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-black/20 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">밝은 배경 합성용 · 분리 출력</div>
              <button
                onClick={handleCharSplit}
                disabled={!uploadedFile || processing}
                className="text-[11px] font-bold tracking-wider px-3 py-2.5 rounded-lg border border-zinc-600 text-zinc-200 hover:border-zinc-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                <Download size={12} /> 캐릭터 PNG + 이펙트 PNG(스크린용) 저장
              </button>
              <p className="text-[10px] leading-relaxed text-zinc-500">
                통합 PNG는 검정 위 발광을 알파로 흉내내는 방식이라 <b className="text-zinc-300">밝은 배경에 얹으면 글로우가 탁한 베일처럼</b> 보일 수 있어요.
                분리 출력을 쓰면 캐릭터는 일반 레이어로, <b className="text-zinc-300">이펙트 레이어는 블렌드 모드 '스크린'</b>(Figma/포토샵)으로 얹어
                어떤 배경에서도 가산광이 정확하게 살아납니다. 두 장은 같은 크기라 겹치기만 하면 정렬돼요.
              </p>
            </div>
          </div>
          )}

          {/* 로컬 색상 키 설정 — 로컬 방식에서만 */}
          {method === METHOD_LUMA && (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">색상 키 설정</span>
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full border" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>실시간</span>
              {lumaBusy && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> 갱신 중
                </span>
              )}
            </div>

            {/* 배경색 — 자동 감지 + 스포이드 */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-400 w-20 shrink-0">배경색</span>
              <span
                className="w-8 h-8 rounded-md border border-zinc-700 shrink-0"
                style={{ background: bgColor ? `rgb(${bgColor[0]},${bgColor[1]},${bgColor[2]})` : '#000' }}
                title={bgColor ? `rgb(${bgColor.join(', ')})` : '감지 대기'}
              />
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                {bgColor ? `#${bgColor.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}` : '자동 감지 대기'}
              </span>
              <button
                onClick={() => setPicking((v) => !v)}
                disabled={!uploadedFile}
                className={`ml-auto text-[10px] font-bold tracking-wider px-3 py-2 rounded-lg border inline-flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${picking ? 'text-black' : 'text-zinc-300 border-zinc-700 hover:border-zinc-500'}`}
                style={picking ? { background: ACCENT, borderColor: ACCENT } : undefined}
              >
                <Pipette size={12} /> {picking ? '원본에서 배경 클릭…' : '스포이드'}
              </button>
              {bgColor && (
                <button
                  onClick={async () => { const d = await ensureSrcData(); if (d) setBgColor(detectBg(d.data, d.width, d.height)); }}
                  className="text-[10px] font-bold tracking-wider px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  title="테두리에서 배경색 다시 감지"
                >
                  자동 재감지
                </button>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-black/20 p-3 flex flex-wrap items-center gap-2.5">
              <div className="min-w-[180px] flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">타이틀 형태 잠금</div>
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">승인된 평면 글자 PNG가 있으면 그 알파를 그대로 사용해 카운터·자간·외곽을 고정합니다. 렌더와 캔버스 크기가 같아야 합니다.</div>
              </div>
              <label className="cursor-pointer text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500">
                {titleMaskFile ? titleMaskFile.name : '평면 형태 PNG 선택'}
                <input
                  type="file"
                  accept="image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    titleMaskDataRef.current = null;
                    setTitleMaskFile(file);
                  }}
                />
              </label>
              {titleMaskFile && (
                <button
                  onClick={() => { titleMaskDataRef.current = null; setTitleMaskFile(null); }}
                  className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white"
                >
                  해제
                </button>
              )}
            </div>

            {titleMaskFile && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 flex flex-col gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-rose-300">타이틀+FX 심리스 합성</div>
                  <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">검정 배경 또는 투명 FX를 같은 캔버스 크기로 넣으세요. 후방은 타이틀 아래를 자동 오버필하고, 전방은 하드 컷 없이 안쪽으로 부드럽게 연장합니다.</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="cursor-pointer text-[10px] font-bold px-3 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-center">
                    {backFxFile ? `후방 · ${backFxFile.name}` : '후방 FX 선택'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => { backFxDataRef.current = null; setBackFxFile(e.target.files?.[0] || null); }}
                    />
                  </label>
                  <label className="cursor-pointer text-[10px] font-bold px-3 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-center">
                    {frontFxFile ? `전방 · ${frontFxFile.name}` : '전방 FX 선택'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => { frontFxDataRef.current = null; setFrontFxFile(e.target.files?.[0] || null); }}
                    />
                  </label>
                </div>
                {(backFxFile || frontFxFile) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-bold text-zinc-400">전방 소프트 오버랩</span>
                    <input type="range" min={2} max={48} value={frontFxOverlap} onChange={(e) => setFrontFxOverlap(Number(e.target.value))} className="flex-1 min-w-[140px] accent-[#FF3366]" />
                    <span className="text-[10px] font-mono text-zinc-300 w-10 text-right">{frontFxOverlap}px</span>
                    <button
                      onClick={() => { backFxDataRef.current = null; frontFxDataRef.current = null; setBackFxFile(null); setFrontFxFile(null); setTitleFxLayers(null); }}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white"
                    >
                      FX 해제
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setFineTuneOpen((open) => !open)}
              className="w-full flex items-center justify-between rounded-lg border border-zinc-800 bg-black/20 px-3 py-2.5 text-left text-[11px] font-bold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <span>세부 조정</span>
              <span className="text-[10px] text-zinc-600">{fineTuneOpen ? '접기 −' : '필요할 때 열기 +'}</span>
            </button>
            {fineTuneOpen && <div className="flex flex-col gap-4 border-l-2 border-rose-500/30 pl-3">
            <label className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 w-20 shrink-0">허용 범위</span>
              <input
                type="range" min={0} max={160} value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="flex-1 accent-[#FF3366]"
              />
              <span className="text-[11px] font-mono text-zinc-300 w-9 text-right tabular-nums">{tolerance}</span>
            </label>
            <label className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 w-20 shrink-0">경계 부드럽기</span>
              <input
                type="range" min={1} max={120} value={feather}
                onChange={(e) => setFeather(Number(e.target.value))}
                className="flex-1 accent-[#FF3366]"
              />
              <span className="text-[11px] font-mono text-zinc-300 w-9 text-right tabular-nums">{feather}</span>
            </label>

            {/* 토글 행 */}
            <div className="flex flex-wrap gap-2">
              {[
                { on: holeProtect, set: setHoleProtect, label: '닫힌 영역 복원', title: '아이템 내부의 손실된 어두운 영역을 복원합니다. 타이틀에서는 카운터를 막을 수 있어 기본 OFF입니다.' },
                { on: decontam, set: setDecontam, label: '디프린지', title: '경계의 배경색 역산 제거(후광 제거)' },
                { on: trim, set: setTrim, label: '여백 트림', title: '투명 여백 자동 잘라내기' },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() => t.set((v) => !v)}
                  title={t.title}
                  className={`text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 ${t.on ? 'text-black' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                  style={t.on ? { background: ACCENT, borderColor: ACCENT } : undefined}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${t.on ? 'bg-black' : 'bg-zinc-600'}`} /> {t.label}
                </button>
              ))}
            </div>

            {/* 구멍 크기 — 형태 보호 켜졌을 때만 */}
            {holeProtect && (
              <label className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-zinc-400 w-20 shrink-0">복원 크기</span>
                <input
                  type="range" min={0} max={100} value={holeSize}
                  onChange={(e) => setHoleSize(Number(e.target.value))}
                  className="flex-1 accent-[#FF3366]"
                />
                <span className="text-[11px] font-mono text-zinc-300 w-9 text-right tabular-nums">{holeSize}</span>
              </label>
            )}

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              단색·단순 배경의 타이포·로고에 최적. <b className="text-zinc-300">한글 카운터는 기본적으로 투명하게 보존</b>됩니다. 아이템의 닫힌 어두운 재질이 잘못 뚫릴 때만 <b className="text-zinc-300">닫힌 영역 복원</b>을 낮은 값부터 켜세요. <b className="text-zinc-300">디프린지</b>는 극저알파 색 폭주 없이 경계 후광을 제거합니다.
            </p>
            </div>}
          </div>
          )}

          {method !== METHOD_SPRITE && (<>
          {/* Status + Progress */}
          <div className="flex flex-col gap-1.5">
            <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 min-h-[44px]">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}
                style={{ background: dotColor }}
              />
              <span className={`text-[11px] font-bold tracking-wider flex-1 ${textColor}`}>
                {status.msg}
              </span>
            </div>
            <div className="h-[2px] bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, background: ACCENT }}
              />
            </div>
          </div>

          {/* Workspace */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upload panel */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingUpload(true); }}
              onDragLeave={() => setIsDraggingUpload(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingUpload(false);
                const f = e.dataTransfer.files?.[0];
                if (f) loadFile(f);
              }}
              className={`relative aspect-[4/3] min-h-[220px] bg-[#18181B] border border-dashed rounded-xl flex items-center justify-center overflow-hidden cursor-pointer transition-colors ${isDraggingUpload ? 'border-[#FF3366] bg-[#FF3366]/5' : 'border-zinc-800 hover:border-zinc-600'}`}
            >
              <div className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/85 border border-zinc-800 rounded px-2 py-1">
                원본
              </div>
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="원본"
                    onClick={picking ? (e) => { e.stopPropagation(); handleEyedrop(e); } : undefined}
                    className={`absolute inset-0 w-full h-full object-contain ${picking ? 'cursor-crosshair' : ''}`}
                  />
                  {picking && (
                    <div className="absolute inset-x-0 bottom-0 z-10 bg-black/80 text-center py-1.5 text-[10px] font-bold tracking-wider" style={{ color: ACCENT }}>
                      배경으로 쓸 색을 클릭하세요
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-black/70 hover:bg-rose-500/80 text-white text-xs transition-colors"
                    title="이미지 제거"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <Upload className="w-9 h-9 text-zinc-700" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">클릭 / 드래그</span>
                  <span className="text-[11px] text-zinc-600">PNG · JPG · WEBP · 최대 12MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) loadFile(e.target.files[0]); e.target.value = ''; }}
              />
            </div>

            {/* Result panel */}
            <div
              ref={resultRef}
              className={`relative aspect-[4/3] min-h-[220px] border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden ${bgPreset === 'checker' ? 'bg-maskforge-checker' : ''}`}
              style={bgPreset === 'checker' ? undefined : { backgroundColor: bgPreset === 'custom' ? customBg : bgPreset }}
            >
              <div className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/85 border border-zinc-800 rounded px-2 py-1">
                결과 (투명 배경)
              </div>
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="결과"
                  draggable={false}
                  onPointerDown={onPanStart}
                  onPointerMove={onPanMove}
                  onPointerUp={onPanEnd}
                  onPointerCancel={onPanEnd}
                  className={`absolute inset-0 w-full h-full object-contain select-none ${zoom > MIN_ZOOM ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: dragging ? 'none' : 'transform 0.08s ease-out',
                    willChange: 'transform',
                  }}
                />
              ) : (
                <Sparkles className="w-9 h-9 text-zinc-800" />
              )}

              {/* 확대 컨트롤 — 결과가 있을 때만, 처리 중에는 숨김. */}
              {resultUrl && !processing && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 bg-black/75 backdrop-blur-sm border border-zinc-700 rounded-full px-1 py-1">
                  <button
                    onClick={() => zoomBy(1 / 1.3)}
                    disabled={zoom <= MIN_ZOOM}
                    title="축소"
                    className="p-1.5 text-zinc-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    onClick={resetZoom}
                    title="원본 크기"
                    className="text-[10px] font-bold tabular-nums text-zinc-300 hover:text-white transition-colors px-1 min-w-[34px]"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    onClick={() => zoomBy(1.3)}
                    disabled={zoom >= MAX_ZOOM}
                    title="확대"
                    className="p-1.5 text-zinc-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              )}

              {/* 배경색 미리보기 스와치 — 결과가 있을 때만, 처리 중에는 숨김. */}
              {resultUrl && !processing && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm border border-zinc-700 rounded-full px-2.5 py-1.5">
                  {BG_PRESETS.map((p) => {
                    const active = bgPreset === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setBgPreset(p.key)}
                        title={p.label}
                        className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${active ? 'ring-2 ring-offset-1 ring-offset-black ring-white' : 'border border-white/20'}`}
                        style={p.key === 'checker'
                          ? { backgroundImage: 'repeating-conic-gradient(#3a3a3a 0% 25%, #111 0% 50%)', backgroundSize: '8px 8px' }
                          : { backgroundColor: p.key }}
                      />
                    );
                  })}
                  <span className="w-px h-4 bg-zinc-700" />
                  <label
                    title="사용자 지정 색"
                    className={`relative w-5 h-5 rounded-full cursor-pointer overflow-hidden transition-transform hover:scale-110 ${bgPreset === 'custom' ? 'ring-2 ring-offset-1 ring-offset-black ring-white' : 'border border-white/20'}`}
                    style={{ backgroundColor: customBg }}
                  >
                    <input
                      type="color"
                      value={customBg}
                      onChange={(e) => { setCustomBg(e.target.value); setBgPreset('custom'); }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                </div>
              )}
              {processing && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4 z-20">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
                  <span className="text-[11px] font-bold tracking-wider" style={{ color: ACCENT }}>
                    {method === METHOD_LUMA && titleMaskFile && (backFxFile || frontFxFile) ? '타이틀+FX 심리스 합성 중...' : method === METHOD_LUMA ? '로컬 배경 제거 중...' : method === METHOD_EFFECT ? '이펙트 알파 복원 중...' : method === METHOD_EDGE ? '사각 경계 분석 중...' : method === METHOD_CHAR ? '캐릭터+이펙트 분리 중...' : 'Remove.bg AI 처리 중...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2.5 flex-wrap">
            <button
              onClick={handleProcess}
              disabled={!uploadedFile || processing || (method === METHOD_API && !apiKey.trim())}
              className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-black shadow-[0_8px_20px_rgba(255,51,102,0.25)]"
              style={{ background: ACCENT }}
            >
              {processing ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 처리 중…</span>
              ) : method === METHOD_LUMA && titleMaskFile && (backFxFile || frontFxFile) ? '타이틀+FX 심리스 합성' : method === METHOD_LUMA ? '로컬 배경 제거' : method === METHOD_EFFECT ? '이펙트 투명화' : method === METHOD_EDGE ? '사각 경계 제거' : method === METHOD_CHAR ? '캐릭터+이펙트 분리' : '배경 제거 실행'}
            </button>
            <button
              onClick={handleReset}
              disabled={!uploadedFile && !resultUrl}
              className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
          </div>

          {/* Download / 보내기 */}
          {resultUrl && (
            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5 text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">결과물 저장 / 보내기</div>
              {resultQa && (
                <div className={`mb-4 rounded-lg border p-3 text-left ${resultQa.warnings?.length ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/25 bg-emerald-500/5'}`}>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-zinc-300">
                    <span>출력 <b className="text-white">{resultQa.width}×{resultQa.height}</b></span>
                    {sourceDimensions && <span>입력 {sourceDimensions.width}×{sourceDimensions.height}</span>}
                    <span>투명 {((resultQa.transparentPixels / Math.max(1, resultQa.totalPixels)) * 100).toFixed(1)}%</span>
                    <span>부분 알파 {((resultQa.partialPixels / Math.max(1, resultQa.totalPixels)) * 100).toFixed(1)}%</span>
                    {resultQa.shapeLocked && <span className="text-rose-300">형태 잠금</span>}
                    {Number.isFinite(resultQa.backFilledPixels) && <span>후방 오버필 {resultQa.backFilledPixels}픽셀</span>}
                    {Number.isFinite(resultQa.frontExtendedPixels) && <span>전방 확장 {resultQa.frontExtendedPixels}픽셀</span>}
                    {Number.isFinite(resultQa.reconstructionMae) && <span>색 재합성 오차 {(resultQa.reconstructionMae * 100).toFixed(2)}%</span>}
                  </div>
                  <div className={`mt-2 text-[10px] font-bold ${resultQa.warnings?.length ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {resultQa.warnings?.length ? resultQa.warnings.join(' · ') : '알파·해상도 기본 QA 통과'}
                  </div>
                </div>
              )}
              <div className="flex justify-center gap-2.5 flex-wrap">
                <button
                  onClick={handleDownload}
                  className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg text-black inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110"
                  style={{ background: ACCENT }}
                >
                  <Download className="w-3.5 h-3.5" /> PNG 다운로드 (투명)
                </button>
                <button
                  onClick={handleSendToPreview}
                  title="투명 결과를 NEXUS Preview 의 타이틀로 전송"
                  className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110 border"
                  style={{ color: PREVIEW_COLOR, borderColor: `${PREVIEW_COLOR}66`, background: `${PREVIEW_COLOR}1A` }}
                >
                  <Send className="w-3.5 h-3.5" /> NEXUS Preview로 보내기
                </button>
                <button
                  onClick={handleSendToVectorForge}
                  title="투명 결과를 Vector Forge 로 보내 SVG 벡터로 변환"
                  className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110 border"
                  style={{ color: VECTOR_COLOR, borderColor: `${VECTOR_COLOR}66`, background: `${VECTOR_COLOR}1A` }}
                >
                  <PenTool className="w-3.5 h-3.5" /> Vector Forge로 보내기
                </button>
              </div>
              {titleFxLayers && (
                <div className="mt-3 flex justify-center gap-2 flex-wrap">
                  <button onClick={() => downloadBlob(titleFxLayers.backBlob, 'title-fx-back.png')} className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500">후방 FX 레이어</button>
                  <button onClick={() => downloadBlob(titleFxLayers.bodyBlob, 'title-body.png')} className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500">타이틀 본체</button>
                  <button onClick={() => downloadBlob(titleFxLayers.frontBlob, 'title-fx-front.png')} className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500">전방 FX 레이어</button>
                </div>
              )}

              {/* 리샘플 다운로드 — 프로모션 작은 프레임 / 블릿 소재용 고정 가로폭 */}
              <div className="mt-5 pt-5 border-t border-zinc-800">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">고정 크기 리샘플</div>
                <p className="text-[11px] text-zinc-500 mb-3">프로모션 작은 프레임 · 블릿용. 가로폭만 맞추고 세로는 비율 유지 (투명 PNG)</p>
                <div className="flex justify-center items-center gap-2.5 flex-wrap">
                  <div className="inline-flex items-center gap-1 bg-black/40 border border-zinc-800 rounded-lg p-1">
                    {RESAMPLE_PRESETS.map((w) => {
                      const active = Number(resampleWidth) === w;
                      return (
                        <button
                          key={w}
                          onClick={() => setResampleWidth(w)}
                          className={`text-[11px] font-bold tracking-wider px-3 py-1.5 rounded-md transition-colors ${active ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                          style={active ? { background: ACCENT } : undefined}
                        >
                          {w}
                        </button>
                      );
                    })}
                  </div>
                  <div className="inline-flex items-center gap-1.5 border border-zinc-800 bg-black/40 rounded-lg px-3 py-1.5">
                    <input
                      type="number"
                      min={16}
                      max={resultQa?.width || 4096}
                      value={resampleWidth}
                      onChange={(e) => setResampleWidth(e.target.value)}
                      className="w-16 bg-transparent border-none outline-none text-[12px] font-mono text-zinc-100 text-right tabular-nums"
                    />
                    <span className="text-[10px] font-bold text-zinc-500">px</span>
                  </div>
                  <button
                    onClick={handleResampleDownload}
                    disabled={resampling || Boolean(resultQa?.width && Number(resampleWidth) > resultQa.width)}
                    className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg text-black inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: ACCENT }}
                  >
                    {resampling
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 리샘플 중…</>
                      : <><Download className="w-3.5 h-3.5" /> 리샘플 다운로드</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          {method === METHOD_API ? (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-5 py-4 text-[12px] text-zinc-400 leading-[1.9] mb-4">
            <div className="text-zinc-100 font-bold mb-1 flex items-center gap-2">
              <ImageIcon size={14} style={{ color: ACCENT }} /> Remove.bg API 안내
            </div>
            • <a href="https://www.remove.bg/api" target="_blank" rel="noreferrer" style={{ color: ACCENT }}>remove.bg/api</a>에서 무료 가입 후 API 키 발급<br />
            • Auto는 계정·입력 조건에 맞는 크기를 선택하고, Full은 가능한 최고 해상도를 요청합니다<br />
            • 결과의 <b className="text-zinc-100">실제 픽셀 크기를 입력과 비교</b>하며, 작은 결과를 리샘플로 확대하지 않습니다<br />
            • 실행할 때마다 외부 업로드와 크레딧 사용 가능성을 다시 확인합니다<br />
            • 입력한 API 키는 브라우저 localStorage 에만 저장되며 외부로 전송되지 않습니다<br />
            • 머리카락·털·반투명 영역까지 정밀하게 처리되는 AI 누끼 방식
          </div>
          ) : (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-5 py-4 text-[12px] text-zinc-400 leading-[1.9] mb-4">
            <div className="text-zinc-100 font-bold mb-1 flex items-center gap-2">
              <ImageIcon size={14} style={{ color: ACCENT }} /> 로컬 색상 키 안내
            </div>
            • 브라우저에서 직접 처리 — <b className="text-zinc-100">API 키 · 크레딧 불필요, 원본 해상도 그대로</b> 유지<br />
            • 배경색과의 <b className="text-zinc-100">색 거리</b>로 매트 생성 — 단색·단순 배경의 <b className="text-zinc-100">타이포·로고·발광 소재</b>에 최적<br />
            • 배경색은 테두리에서 <b className="text-zinc-100">자동 감지</b>, 틀리면 <b className="text-zinc-100">스포이드</b>로 원본을 클릭해 지정<br />
            • 타이틀 카운터는 기본 보존. <b className="text-zinc-100">닫힌 영역 복원</b>은 아이템 내부 재질이 뚫릴 때만 제한적으로 사용<br />
            • 머리카락·반투명이 많은 일반 사진 누끼(인물·제품)는 Remove.bg AI 방식이 더 정확합니다
          </div>
          )}
          </>)}

          {/* AI 스프라이트 — 로컬 세그멘테이션 + 브러시 보정. 업로드 이미지는 다른 모드와 공유 */}
          {method === METHOD_SPRITE && <SpriteView navigate={navigate} sharedFile={uploadedFile} onShareFile={loadFile} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI 스프라이트 뷰 — 로컬 RMBG-1.4(transformers.js) 세그멘테이션 + 수동 브러시 보정.
// 자체 캔버스/컨트롤/다운로드를 가진 서브뷰. 업로드 이미지는 메인 흐름과 양방향 공유:
//   · sharedFile — 다른 모드(로컬/이펙트/캐릭터)에서 올린 이미지가 자동으로 들어옴
//   · onShareFile — 여기서 올린 이미지를 메인 uploadedFile 로 전파 → 다른 탭에서도 사용
//  파이프라인: AI 알파(modelAlpha) ⊕ 브러시(강제 fg/bg) → 침식 → 블러 → 디프린지 → 캔버스 합성.
function SpriteView({ navigate, sharedFile, onShareFile }) {
  const viewRef = useRef(null);      // 결과 캔버스 (원본 해상도)
  const cursorRef = useRef(null);    // 브러시 커서 원
  const shellRef = useRef(null);     // 캔버스 래퍼 (배경 미리보기)
  const fileRef = useRef(null);

  const srcCanvasRef = useRef(null); // 원본 캔버스 (모델 입력용 toDataURL)
  const srcDataRef = useRef(null);   // 원본 ImageData (색상 소스)
  const wRef = useRef(0), hRef = useRef(0);
  const modelAlphaRef = useRef(null);// AI 매트 Uint8ClampedArray(N) 또는 null
  const brushRef = useRef(null);     // Uint8Array(N): 0 없음, 1 강제 캐릭터, 2 강제 배경
  const historyRef = useRef([]);
  const paintingRef = useRef(false);
  const lastPtRef = useRef(null);
  const rafRef = useRef(null);
  const srcURLRef = useRef(null);

  const libRef = useRef(null);       // transformers.js 모듈
  const modelRef = useRef(null);
  const processorRef = useRef(null);
  const modelReadyRef = useRef(false);

  const [hasImage, setHasImage] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [prog, setProg] = useState('게임 스크린샷을 불러오세요');
  const [barPct, setBarPct] = useState(null); // null = 숨김
  const [busy, setBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const [brushMode, setBrushMode] = useState(1); // 1 복원(+캐릭터) / 2 지우기(−배경)
  const [brushSize, setBrushSize] = useState(SPRITE_BRUSH_DEFAULT);
  const [erodeV, setErodeV] = useState(1);
  const [featherV, setFeatherV] = useState(1);
  const [defringe, setDefringe] = useState(true);
  const [trimV, setTrimV] = useState(false); // 저장/보내기 시 투명 여백 트림
  const [bgMode, setBgMode] = useState('check'); // check / dark / light / custom
  const [customBg, setCustomBg] = useState('#3366ff'); // 커스텀 배경 미리보기 색
  const [resampleWidth, setResampleWidth] = useState(RESAMPLE_DEFAULT);

  // 포인터 핸들러가 최신값을 읽도록 ref 미러링.
  const brushModeRef = useRef(1); useEffect(() => { brushModeRef.current = brushMode; }, [brushMode]);
  const brushSizeRef = useRef(SPRITE_BRUSH_DEFAULT); useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  const erodeRef = useRef(1); useEffect(() => { erodeRef.current = erodeV; }, [erodeV]);
  const featherRef = useRef(1); useEffect(() => { featherRef.current = featherV; }, [featherV]);
  const defringeRef = useRef(true); useEffect(() => { defringeRef.current = defringe; }, [defringe]);

  useEffect(() => () => { if (srcURLRef.current) URL.revokeObjectURL(srcURLRef.current); }, []);

  const syncedFileRef = useRef(null);

  // AI 매트 + 브러시 → 엣지 다듬기 + 디프린지 → 캔버스 합성.
  const render = () => {
    const srcData = srcDataRef.current, view = viewRef.current;
    if (!srcData || !view) return;
    const W = wRef.current, H = hRef.current, N = W * H;
    const s = srcData.data, brush = brushRef.current, modelAlpha = modelAlphaRef.current;

    let a = new Uint8ClampedArray(N);
    for (let i = 0; i < N; i++) a[i] = brush[i] === 1 ? 255 : brush[i] === 2 ? 0 : (modelAlpha ? modelAlpha[i] : 255);
    a = spriteErode(a, erodeRef.current, W, H);
    a = spriteBlur(a, featherRef.current, W, H);

    const col = new Uint8ClampedArray(N * 3);
    for (let p = 0; p < N; p++) { col[p * 3] = s[p * 4]; col[p * 3 + 1] = s[p * 4 + 1]; col[p * 3 + 2] = s[p * 4 + 2]; }

    // 디프린지 — 반투명 경계색을 인접한 불투명 캐릭터색으로 링 단위 전파 (배경 후광 제거).
    if (defringeRef.current) {
      let valid = new Uint8Array(N);
      for (let p = 0; p < N; p++) if (a[p] >= 250) valid[p] = 1;
      const band = Math.max(2, erodeRef.current + featherRef.current + 3);
      for (let it = 0; it < band; it++) {
        const next = valid.slice(); let changed = false;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const p = y * W + x;
          if (valid[p] || a[p] === 0) continue;
          let b = -1;
          if (x > 0 && valid[p - 1]) b = p - 1; else if (x < W - 1 && valid[p + 1]) b = p + 1;
          else if (y > 0 && valid[p - W]) b = p - W; else if (y < H - 1 && valid[p + W]) b = p + W;
          if (b >= 0) { col[p * 3] = col[b * 3]; col[p * 3 + 1] = col[b * 3 + 1]; col[p * 3 + 2] = col[b * 3 + 2]; next[p] = 1; changed = true; }
        }
        valid = next; if (!changed) break;
      }
    }

    const ctx = view.getContext('2d');
    const out = ctx.createImageData(W, H), o = out.data;
    for (let p = 0; p < N; p++) { const i = p * 4; o[i] = col[p * 3]; o[i + 1] = col[p * 3 + 1]; o[i + 2] = col[p * 3 + 2]; o[i + 3] = a[p]; }
    ctx.putImageData(out, 0, 0);
  };
  const schedule = () => { if (rafRef.current) return; rafRef.current = requestAnimationFrame(() => { rafRef.current = null; render(); }); };

  const loadFile = (file) => {
    if (!file || !file.type?.startsWith('image/')) { setProg('이미지 파일만 가능합니다'); return; }
    // 스프라이트에서 직접 올린 이미지는 메인 uploadedFile 로 전파 — 다른 탭도 자동 연동.
    // (공유 이미지로 들어온 경우는 syncedFileRef 가 이미 같은 파일 → 전파 생략, 루프 방지)
    if (syncedFileRef.current !== file) { syncedFileRef.current = file; onShareFile?.(file); }
    if (srcURLRef.current) URL.revokeObjectURL(srcURLRef.current);
    srcURLRef.current = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      wRef.current = W; hRef.current = H;
      const sc = document.createElement('canvas'); sc.width = W; sc.height = H;
      const sctx = sc.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(img, 0, 0);
      srcCanvasRef.current = sc;
      srcDataRef.current = sctx.getImageData(0, 0, W, H);
      const view = viewRef.current; view.width = W; view.height = H;
      brushRef.current = new Uint8Array(W * H);
      modelAlphaRef.current = null; historyRef.current = []; setCanUndo(false);
      setHasImage(true); setFileName(file.name);
      setProg('STEP 1 — AI 분리를 실행하세요');
      render();
    };
    img.onerror = () => setProg('이미지를 불러올 수 없습니다');
    img.src = srcURLRef.current;
  };

  // 다른 모드에서 올린 공유 이미지 자동 로드 — 탭 진입/파일 변경 시 1회.
  useEffect(() => {
    if (!sharedFile || sharedFile === syncedFileRef.current) return;
    syncedFileRef.current = sharedFile;
    loadFile(sharedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedFile]);

  const reset = () => {
    if (srcURLRef.current) URL.revokeObjectURL(srcURLRef.current);
    srcURLRef.current = null; srcCanvasRef.current = srcDataRef.current = modelAlphaRef.current = brushRef.current = null;
    historyRef.current = [];
    setHasImage(false); setCanUndo(false); setFileName('');
    setProg('게임 스크린샷을 불러오세요'); setBarPct(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // AI 세그멘테이션 — 첫 실행 시 모델 로드(CDN), 이후 캐시.
  const runSegment = async () => {
    if (!srcCanvasRef.current) return;
    setBusy(true); setBarPct(0);
    try {
      if (!modelReadyRef.current) {
        setProg('모델 불러오는 중…');
        const lib = libRef.current || await import(/* @vite-ignore */ TRANSFORMERS_CDN);
        libRef.current = lib; lib.env.allowLocalModels = false;
        const pc = (p) => { if (p.status === 'progress' && p.total) { const pct = Math.round(p.progress); setBarPct(pct); setProg(`모델 다운로드 ${pct}%`); } };
        modelRef.current = await lib.AutoModel.from_pretrained('briaai/RMBG-1.4', { config: { model_type: 'custom' }, progress_callback: pc });
        processorRef.current = await lib.AutoProcessor.from_pretrained('briaai/RMBG-1.4', { config: {
          do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
          image_mean: [0.5, 0.5, 0.5], image_std: [1, 1, 1], resample: 2,
          rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 },
        }, progress_callback: pc });
        modelReadyRef.current = true;
      }
      setProg('캐릭터 분석 중… (수 초 소요)'); setBarPct(100);
      const lib = libRef.current;
      const image = await lib.RawImage.fromURL(srcCanvasRef.current.toDataURL());
      const { pixel_values } = await processorRef.current(image);
      const result = await modelRef.current({ input: pixel_values });
      const tensor = result.output ?? Object.values(result)[0];
      const W = wRef.current, H = hRef.current;
      const mask = await lib.RawImage.fromTensor(tensor[0].mul(255).to('uint8')).resize(W, H);
      modelAlphaRef.current = new Uint8ClampedArray(mask.data.length === W * H ? mask.data : mask.data.filter((_, i) => i % mask.channels === 0));
      setProg('완료 — 브러시로 다듬으세요');
      render();
    } catch (err) {
      console.error('[MaskForge/Sprite] segmentation failed', err);
      setProg('⚠ 모델 로드 실패 — 네트워크(huggingface.co) 확인 필요');
    } finally {
      setTimeout(() => setBarPct(null), 600);
      setBusy(false);
    }
  };

  // 브러시 좌표 변환 + 스탬프.
  const toImg = (ev) => {
    const r = viewRef.current.getBoundingClientRect();
    return { x: Math.round((ev.clientX - r.left) / r.width * wRef.current), y: Math.round((ev.clientY - r.top) / r.height * hRef.current) };
  };
  const stamp = (cx, cy) => {
    const W = wRef.current, H = hRef.current, brush = brushRef.current;
    const rect = viewRef.current.getBoundingClientRect();
    const rad = brushSizeRef.current / 2 * (W / rect.width), r2 = rad * rad;
    const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad));
    const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r2) brush[y * W + x] = brushModeRef.current; }
  };
  const moveCursor = (ev) => {
    const cur = cursorRef.current, view = viewRef.current, shell = shellRef.current;
    if (!cur || !view || !shell) return;
    const r = view.getBoundingClientRect(), s = shell.getBoundingClientRect();
    cur.style.display = 'block';
    cur.style.width = cur.style.height = brushSizeRef.current * (r.width / wRef.current) + 'px';
    cur.style.left = (ev.clientX - s.left) + 'px';
    cur.style.top = (ev.clientY - s.top) + 'px';
  };

  const onPointerDown = (ev) => {
    if (!srcDataRef.current) return;
    viewRef.current.setPointerCapture?.(ev.pointerId);
    historyRef.current.push(brushRef.current.slice());
    if (historyRef.current.length > 25) historyRef.current.shift();
    setCanUndo(true);
    paintingRef.current = true;
    const p = toImg(ev); lastPtRef.current = p; stamp(p.x, p.y); schedule();
  };
  const onPointerMove = (ev) => {
    moveCursor(ev);
    if (!paintingRef.current) return;
    const p = toImg(ev), lp = lastPtRef.current;
    if (lp) { const steps = Math.hypot(p.x - lp.x, p.y - lp.y) / 3 | 0; for (let i = 1; i <= steps; i++) stamp(lp.x + (p.x - lp.x) * i / steps, lp.y + (p.y - lp.y) * i / steps); }
    stamp(p.x, p.y); lastPtRef.current = p; schedule();
  };
  const onPointerUp = () => { paintingRef.current = false; lastPtRef.current = null; };
  const onPointerLeave = () => { if (cursorRef.current) cursorRef.current.style.display = 'none'; };

  const undo = () => {
    const h = historyRef.current;
    if (!h.length) return;
    brushRef.current = h.pop();
    if (!h.length) setCanUndo(false);
    render();
  };

  // 내보내기 캔버스 — 여백 트림이 켜져 있으면 불투명 경계 박스(+2px 패딩)로 잘라낸 사본 반환.
  // 미리보기 캔버스는 원본 크기 유지 (브러시 좌표계 보존), 트림은 저장/보내기 시에만 적용.
  const exportCanvas = () => {
    const view = viewRef.current;
    if (!view) return null;
    if (!trimV) return view;
    try {
      const img = view.getContext('2d').getImageData(0, 0, view.width, view.height);
      const box = alphaTrimBox(img.data, view.width, view.height);
      if (!box || (box.w === view.width && box.h === view.height)) return view;
      const c = document.createElement('canvas');
      c.width = box.w; c.height = box.h;
      c.getContext('2d').drawImage(view, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      return c;
    } catch { return view; }
  };
  const downloadPng = () => {
    exportCanvas()?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(b);
      a.download = `sprite_${Date.now()}.png`; document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
    }, 'image/png');
  };
  const downloadResample = async () => {
    const src = exportCanvas();
    if (!src) return;
    const targetW = Math.min(4096, Math.max(16, Math.round(Number(resampleWidth) || RESAMPLE_DEFAULT)));
    try {
      const { blob, width, height } = await resampleToWidth(src.toDataURL('image/png'), targetW);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `sprite_${width}x${height}_${Date.now()}.png`; document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
    } catch (e) { setProg(`리샘플 실패: ${e.message || e}`); }
  };
  const sendToPreview = () => {
    const src = exportCanvas();
    if (!src) return;
    try { navigate('nexus-preview', { source: 'mask-forge', image: { url: src.toDataURL('image/png'), metadata: {} } }); }
    catch (e) { setProg(`보내기 실패: ${e.message || e}`); }
  };

  const shellBg = bgMode === 'dark' ? '#0a0c0e' : bgMode === 'light' ? '#eef2f4' : bgMode === 'custom' ? customBg : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
      {/* 컨트롤 컬럼 */}
      <div className="flex flex-col gap-4">
        {/* STEP 1 — AI */}
        <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI 자동 분리</span>
            <span className="text-[9px] font-mono" style={{ color: ACCENT }}>STEP 1</span>
          </div>
          <button
            onClick={runSegment}
            disabled={!hasImage || busy}
            className="w-full text-[12px] font-bold tracking-wider py-3 rounded-lg text-black inline-flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: ACCENT }}
          >
            {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 분석 중…</> : <><Sparkles className="w-3.5 h-3.5" /> 오브젝트 분리</>}
          </button>
          <div className="text-[11px] font-mono text-zinc-400 min-h-[16px]">{prog}</div>
          {barPct !== null && (
            <div className="h-[3px] bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-200" style={{ width: `${barPct}%`, background: ACCENT }} />
            </div>
          )}
          <div className="text-[10px] text-zinc-600 leading-relaxed">첫 실행 시 모델(약 44MB)을 내려받습니다. 인터넷(huggingface.co) 접속 필요, 이후 캐시됩니다.</div>
        </div>

        {/* STEP 2 — 브러시 */}
        <div className={`bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 ${hasImage ? '' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">수동 보정 브러시</span>
            <span className="text-[9px] font-mono" style={{ color: ACCENT }}>STEP 2</span>
          </div>
          <div className="flex gap-2">
            {[{ m: 1, t: '복원', k: '+ 캐릭터' }, { m: 2, t: '지우기', k: '− 배경' }].map((b) => (
              <button
                key={b.m}
                onClick={() => setBrushMode(b.m)}
                className={`flex-1 rounded-lg py-2 border transition-colors flex flex-col items-center gap-0.5 ${brushMode === b.m ? 'text-black' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                style={brushMode === b.m ? { background: ACCENT, borderColor: ACCENT } : undefined}
              >
                <span className="text-[12px] font-bold">{b.t}</span>
                <span className={`text-[9px] font-mono ${brushMode === b.m ? 'text-black/60' : 'text-zinc-600'}`}>{b.k}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-zinc-400 w-16 shrink-0">브러시</span>
            <input type="range" min={4} max={200} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="flex-1 accent-[#FF3366]" />
            <span className="text-[11px] font-mono text-zinc-300 w-8 text-right tabular-nums">{brushSize}</span>
          </label>
          <div className="text-[10px] text-zinc-600 leading-relaxed">AI가 놓친 부분은 <b className="text-zinc-400">복원</b>으로 칠하고, 이펙트·UI가 남으면 <b className="text-zinc-400">지우기</b>로 지우세요.</div>
        </div>

        {/* STEP 3 — 엣지 */}
        <div className={`bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 ${hasImage ? '' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">엣지 다듬기</span>
            <span className="text-[9px] font-mono" style={{ color: ACCENT }}>STEP 3</span>
          </div>
          <label className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-zinc-400 w-16 shrink-0">수축</span>
            <input type="range" min={0} max={10} value={erodeV} onChange={(e) => { setErodeV(Number(e.target.value)); schedule(); }} className="flex-1 accent-[#FF3366]" />
            <span className="text-[11px] font-mono text-zinc-300 w-8 text-right tabular-nums">{erodeV}</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-zinc-400 w-16 shrink-0">부드럽기</span>
            <input type="range" min={0} max={12} value={featherV} onChange={(e) => { setFeatherV(Number(e.target.value)); schedule(); }} className="flex-1 accent-[#FF3366]" />
            <span className="text-[11px] font-mono text-zinc-300 w-8 text-right tabular-nums">{featherV}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setDefringe((v) => !v); schedule(); }}
              className={`text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 ${defringe ? 'text-black' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
              style={defringe ? { background: ACCENT, borderColor: ACCENT } : undefined}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${defringe ? 'bg-black' : 'bg-zinc-600'}`} /> 디프린지 (색 번짐 제거)
            </button>
            <button
              onClick={() => setTrimV((v) => !v)}
              title="저장/보내기 시 투명 여백을 잘라내 실제 스프라이트 크기로 내보냅니다"
              className={`text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 ${trimV ? 'text-black' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
              style={trimV ? { background: ACCENT, borderColor: ACCENT } : undefined}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${trimV ? 'bg-black' : 'bg-zinc-600'}`} /> 여백 트림 (저장 시)
            </button>
          </div>
          <div className="text-[10px] text-zinc-600 leading-relaxed">배경 테두리가 남으면 <b className="text-zinc-400">수축</b>을 키우고, 경계는 <b className="text-zinc-400">부드럽기</b>로 완화하세요.</div>
        </div>

        {/* 액션 */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={undo} disabled={!canUndo} className="flex-1 text-[11px] font-bold tracking-wider py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> 실행취소
            </button>
            <button onClick={reset} disabled={!hasImage} className="flex-1 text-[11px] font-bold tracking-wider py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              새 이미지
            </button>
          </div>
        </div>
      </div>

      {/* 스테이지 컬럼 */}
      <div className="flex flex-col gap-3">
        <div className="relative min-h-[360px] bg-[#101012] border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden p-4">
          {/* 파일명 라벨 */}
          {hasImage && fileName && (
            <div className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/85 border border-zinc-800 rounded px-2 py-1 max-w-[45%] truncate">
              {fileName}
            </div>
          )}
          {/* 배경 미리보기 칩 — 결과가 어떤 배경에 얹힐지 확인용 (다운로드 PNG는 항상 투명) */}
          {hasImage && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              {[{ k: 'check', t: '투명' }, { k: 'dark', t: '어두운' }, { k: 'light', t: '밝은' }, { k: 'custom', t: '컬러' }].map((c) => (
                <button
                  key={c.k}
                  onClick={() => setBgMode(c.k)}
                  className={`text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-full border transition-colors ${bgMode === c.k ? 'text-black' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                  style={bgMode === c.k ? { background: ACCENT, borderColor: ACCENT } : undefined}
                >
                  {c.t}
                </button>
              ))}
              {bgMode === 'custom' && (
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  title="미리보기 배경색 선택"
                  className="w-6 h-6 rounded-full border border-zinc-600 cursor-pointer bg-transparent p-0"
                  style={{ appearance: 'none', WebkitAppearance: 'none' }}
                />
              )}
            </div>
          )}

          {!hasImage && (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) loadFile(f); }}
              className={`w-full max-w-md aspect-[4/3] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${dragging ? 'border-[#FF3366] bg-[#FF3366]/5' : 'border-zinc-800 hover:border-zinc-600'}`}
            >
              <Upload className="w-9 h-9 text-zinc-700" />
              <div className="text-center">
                <div className="text-[13px] font-bold text-zinc-300">게임 스크린샷 끌어다 놓기</div>
                <div className="text-[11px] text-zinc-600 mt-1">또는 클릭해서 선택 · PNG / JPG</div>
                <div className="text-[11px] text-zinc-600">복잡한 배경에서 캐릭터를 분리합니다</div>
              </div>
            </div>
          )}

          {/* 캔버스는 항상 마운트 (ref 유지) — 이미지 없을 땐 숨김 */}
          <div
            ref={shellRef}
            className={`relative ${bgMode === 'check' ? 'bg-maskforge-checker' : ''} ${hasImage ? '' : 'hidden'}`}
            style={{ background: shellBg }}
          >
            <canvas
              ref={viewRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerLeave}
              className="block max-w-full select-none"
              style={{ maxHeight: '62vh', touchAction: 'none', cursor: hasImage ? 'none' : 'default' }}
            />
            <div ref={cursorRef} className="absolute rounded-full border-2 border-white pointer-events-none hidden" style={{ transform: 'translate(-50%,-50%)', mixBlendMode: 'difference' }} />
          </div>
        </div>

        {/* 다운로드 / 보내기 */}
        {hasImage && (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button onClick={downloadPng} className="text-[11px] font-bold tracking-wider px-6 py-2.5 rounded-lg text-black inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110" style={{ background: ACCENT }}>
                <Download className="w-3.5 h-3.5" /> PNG 저장 (투명)
              </button>
              <button onClick={sendToPreview} className="text-[11px] font-bold tracking-wider px-6 py-2.5 rounded-lg inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110 border" style={{ color: PREVIEW_COLOR, borderColor: `${PREVIEW_COLOR}66`, background: `${PREVIEW_COLOR}1A` }}>
                <Send className="w-3.5 h-3.5" /> NEXUS Preview로 보내기
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">고정 크기</span>
              <div className="inline-flex items-center gap-1 bg-black/40 border border-zinc-800 rounded-lg p-1">
                {RESAMPLE_PRESETS.map((w) => (
                  <button key={w} onClick={() => setResampleWidth(w)} className={`text-[11px] font-bold tracking-wider px-3 py-1.5 rounded-md transition-colors ${Number(resampleWidth) === w ? 'text-black' : 'text-zinc-400 hover:text-white'}`} style={Number(resampleWidth) === w ? { background: ACCENT } : undefined}>{w}</button>
                ))}
              </div>
              <div className="inline-flex items-center gap-1.5 border border-zinc-800 bg-black/40 rounded-lg px-3 py-1.5">
                <input type="number" min={16} max={4096} value={resampleWidth} onChange={(e) => setResampleWidth(e.target.value)} className="w-16 bg-transparent border-none outline-none text-[12px] font-mono text-zinc-100 text-right tabular-nums" />
                <span className="text-[10px] font-bold text-zinc-500">px</span>
              </div>
              <button onClick={downloadResample} className="text-[11px] font-bold tracking-wider px-6 py-2.5 rounded-lg text-black inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110" style={{ background: ACCENT }}>
                <Download className="w-3.5 h-3.5" /> 리샘플 저장
              </button>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) loadFile(e.target.files[0]); e.target.value = ''; }} />
      </div>
    </div>
  );
}
