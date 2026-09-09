// Vector Forge 엔진 — potrace(wasm) 기반 비트맵 → SVG 변환. (브라우저 전용 래퍼)
//
// 파이프라인: 원본 해상도 유지 → (선택) 미세 블러 → 휘도 이진화(수동/Otsu 자동) → potrace 추적
//   → 절대 px 좌표 정규화 → 단일 <path fill-rule="evenodd"> SVG 조립 + 통계.
//
// 순수 로직(이진화·좌표 정규화·SVG 조립·프리셋)은 lib/vectorCore.js 에 있고 Claude 스킬(nexus-vector-forge) 과 공유한다.
// 예전 엔진(Marching Squares + Catmull-Rom 보간)은 vectorizeLegacy.js 에 비교용으로 남겨둠.
// potrace 는 코너 검출(alphamax) 과 최소자승 베지어 피팅(opttolerance) 이 분리된 별도 단계라
// Illustrator Image Trace(흑백 로고 모드) 와 같은 계열의 결과를 낸다.
//
// 공개 API
//   vectorize(canvas, opts, onProgress) → Promise<{ svg, paths, stats }>
//   binarize(canvas, opts)              → { imageData, threshold, inkRatio, mask }   (미리보기·QA 용)
//   tracePaths(imageData, potraceOpts)  → potrace 원시 출력 (디버깅용)

import { potrace, init as initPotrace } from 'esm-potrace-wasm';
import { vectorizeLegacy } from './vectorizeLegacy';
import {
  DEFAULT_OPTIONS, PRESETS, REFINE_LEVELS, otsuThreshold, binarizeRGBA, maskToRGBA, normalizePotracePath, buildSvg, refinePath,
} from '../../../lib/vectorCore';

export { DEFAULT_OPTIONS, PRESETS, REFINE_LEVELS, otsuThreshold };

export const ENGINES = [
  { id: 'potrace', label: 'Potrace', desc: '코너 검출 + 베지어 피팅 (권장)' },
  { id: 'legacy',  label: 'Legacy',  desc: 'Marching Squares (이전 엔진, 비교용)' },
];

// 최대 처리 변(px). 이 이상은 비율 유지 다운스케일 — 메모리 가드. 4096 이면 타이틀 2K·4K 모두 원본 그대로.
export const MAX_EDGE = 4096;

let initPromise = null;
export function ensurePotrace() {
  if (!initPromise) initPromise = initPotrace();
  return initPromise;
}

// 캔버스 → 이진 ImageData. blur 는 이진화 전 미세 블러(계단 노이즈 완화용, 기본 0).
export function binarize(canvas, opts = {}) {
  const { blur = 0 } = opts;
  const W = canvas.width; const H = canvas.height;
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  if (blur > 0) tc.filter = `blur(${blur}px)`;
  tc.drawImage(canvas, 0, 0);
  const src = tc.getImageData(0, 0, W, H).data;
  const { mask, threshold, inkRatio } = binarizeRGBA(src, W, H, opts);
  const out = new ImageData(maskToRGBA(mask, W, H), W, H);
  return { imageData: out, threshold, inkRatio, mask };
}

// 저수준: 이진 ImageData → potrace 원시 패스 배열 (pathonly) 또는 전체 SVG (pathonly=false). QA·디버깅용 공개.
export async function tracePaths(imageData, potraceOpts = {}) {
  await ensurePotrace();
  return potrace(imageData, { pathonly: true, extractcolors: false, turdsize: 2, turnpolicy: 4, alphamax: 1, opticurve: 1, opttolerance: 0.2, ...potraceOpts });
}

// 메인 진입점. canvas 는 원본 해상도(MAX_EDGE 이내) 그대로.
export async function vectorize(canvas, opts = {}, onProgress = () => {}) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const W = canvas.width; const H = canvas.height;
  if (!W || !H) throw new Error('빈 캔버스');

  if (o.engine === 'legacy') {
    onProgress(5, '레거시 엔진…');
    const r = vectorizeLegacy(canvas, {
      threshold: o.threshold, blur: o.blur, alpha: o.alphaMax, optimize: o.optTolerance, turd: Math.max(1, Math.round(Math.sqrt(o.turdSize * 2))),
      invert: o.invert, fg: o.fg, bg: o.bg,
    }, onProgress);
    return { svg: r.svg, paths: [], stats: { ...r.stats, width: W, height: H, threshold: o.threshold, inkRatio: 0, engine: 'legacy' } };
  }

  onProgress(5, 'potrace 초기화…');
  await ensurePotrace();

  onProgress(15, '이진화…');
  const { imageData, threshold, inkRatio } = binarize(canvas, o);

  onProgress(35, '윤곽 추적 + 베지어 피팅…');
  let raw = await potrace(imageData, {
    pathonly: true,
    extractcolors: false,
    turdsize: Math.max(0, Math.round(o.turdSize)),
    turnpolicy: o.turnPolicy,
    alphamax: o.alphaMax,
    opticurve: o.optCurve ? 1 : 0,
    opttolerance: o.optTolerance,
  });
  if (!Array.isArray(raw)) raw = String(raw).split('M').filter(Boolean).map((p) => `M${p}`);

  onProgress(75, '좌표 정규화…');
  let outerN = 0; let holeN = 0; let rawPts = 0;
  let paths = [];
  for (const r of raw) {
    if (!r || !r.trim()) continue;
    const n = normalizePotracePath(r, H);
    if (!n.d) continue;
    paths.push(n.d);
    outerN += 1; holeN += Math.max(0, n.subpaths - 1); rawPts += n.anchors;
  }

  // 정리 단계 — 직선화 · 꺾임 복원 · 각도 스냅 (lib/vectorCore refinePath). 'off' 면 그대로.
  let totalPts = rawPts; let refine = { level: o.refine || 'off', snapAngles: [], snapped: 0 };
  if (o.refine && o.refine !== 'off') {
    onProgress(85, '직선·꺾임 정리…');
    const r = refinePath(paths.join(' '), { level: o.refine, width: W, height: H });
    paths = [r.d];
    totalPts = r.after.anchors;
    refine = { level: r.level, snapAngles: r.snapAngles, snapped: r.snapped, lines: r.after.lines, curves: r.after.curves };
  }

  onProgress(92, 'SVG 조립…');
  const svg = buildSvg({ width: W, height: H, paths, fg: o.fg, bg: o.bg, transparentBg: o.transparentBg });

  onProgress(100, '완료');
  return {
    svg,
    paths,
    stats: {
      outerN, holeN, totalPts, rawPts,
      sizeKB: Math.round(svg.length / 102.4) / 10,
      width: W, height: H,
      threshold, inkRatio,
      engine: 'potrace',
      refine,
    },
  };
}
