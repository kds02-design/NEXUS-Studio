// PSD 임포트 — ag-psd 로 PSD 파싱.
// 폴더(그룹)는 내부 레이어를 하나로 "합쳐서" 1장, 최상위 단일 레이어는 그대로 추출.
//
// 검증된 사실:
//  - ag-psd 레이어 .canvas → toDataURL 은 브라우저에서 정상(초기 "레이어별 추출"이 이 방식).
//  - 반대로 그 .canvas 를 다른 캔버스에 drawImage "소스"로 쓰면 빈 결과가 나옴 → 항상 PNG 를 거쳐 Image 로.
//  - 대형 PSD 는 ag-psd 가 만든 대형 캔버스들이 동시에 살아있으면 메모리 압박 → 합성이 빈 결과.
// 전략:
//  1) 각 레이어를 먼저 PNG(dataURL)로 뽑고, 그 즉시 원본 .canvas 를 해제(메모리 반환).
//  2) 대형 캔버스가 사라진 뒤, PNG 를 Image 로 불러 위치·불투명도대로 합성(작은 캔버스에 다운스케일).
import { readPsd } from "ag-psd";

const MAX_DIM = 2000;

const canvasToPng = (c) => { try { return c.toDataURL("image/png"); } catch { return null; } };
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

// ag-psd blendMode(camelCase) → canvas globalCompositeOperation
const BLEND = {
  normal: "source-over", passThrough: "source-over", dissolve: "source-over",
  multiply: "multiply", screen: "screen", overlay: "overlay", darken: "darken", lighten: "lighten",
  colorDodge: "color-dodge", colorBurn: "color-burn", hardLight: "hard-light", softLight: "soft-light",
  difference: "difference", exclusion: "exclusion", hue: "hue", saturation: "saturation", color: "color", luminosity: "luminosity",
  linearDodge: "lighter", linearBurn: "multiply", darkerColor: "darken", lighterColor: "lighten",
};
const blendOp = (m) => BLEND[m] || "source-over";

// 1) 모든 레이어를 PNG 로 추출하고 원본 캔버스 해제.
//    숨긴 폴더는 통째로 스킵 — 포토샵에서 안 보이는 건 합성에도 안 들어가야 함.
function preExtract(nodes) {
  if (!Array.isArray(nodes)) return;
  for (const n of nodes) {
    if (n.hidden) continue;
    if (n.children && n.children.length) preExtract(n.children);
    else if (n.canvas) {
      n.__png = canvasToPng(n.canvas);
      n.__rect = { x: n.left || 0, y: n.top || 0, w: n.canvas.width, h: n.canvas.height };
      n.__op = n.opacity == null ? 1 : n.opacity; // ag-psd opacity 는 0~1
      n.__blend = n.blendMode;
      n.canvas = null; // 대형 캔버스 해제 → 이후 합성에 메모리 확보
    }
  }
}

function collectPngLeaves(nodes, out) {
  if (!Array.isArray(nodes)) return;
  for (const n of nodes) {
    if (n.hidden) continue; // 숨긴 폴더/레이어 제외 (preExtract 와 동일 기준)
    if (n.children && n.children.length) collectPngLeaves(n.children, out);
    else if (n.__png) out.push(n);
  }
}

// PNG 를 Image 로 불러 MAX_DIM 이하로 다운스케일.
async function downscalePng(png, srcW, srcH) {
  const img = await loadImg(png);
  if (!img) return null;
  const s = Math.min(1, MAX_DIM / Math.max(srcW || img.naturalWidth, srcH || img.naturalHeight));
  const o = document.createElement("canvas");
  o.width = Math.max(1, Math.round((srcW || img.naturalWidth) * s));
  o.height = Math.max(1, Math.round((srcH || img.naturalHeight) * s));
  o.getContext("2d").drawImage(img, 0, 0, o.width, o.height);
  const dataUrl = canvasToPng(o);
  img.src = "";
  return dataUrl ? { dataUrl, w: o.width, h: o.height } : null;
}

// 그룹 → 내부 leaf 들의 PNG 를 Image 로 불러 위치·불투명도대로 합성(다운스케일).
async function compositeLeaves(leaves) {
  if (!leaves.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const lf of leaves) {
    const r = lf.__rect;
    if (r.x < minX) minX = r.x; if (r.y < minY) minY = r.y;
    if (r.x + r.w > maxX) maxX = r.x + r.w; if (r.y + r.h > maxY) maxY = r.y + r.h;
  }
  const cw = maxX - minX, ch = maxY - minY;
  if (cw <= 0 || ch <= 0) return null;
  const scale = Math.min(1, MAX_DIM / Math.max(cw, ch));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(cw * scale)); c.height = Math.max(1, Math.round(ch * scale));
  const ctx = c.getContext("2d");
  let drawn = 0;
  for (const lf of leaves) { // 순차 로드로 메모리 최소화
    const img = await loadImg(lf.__png);
    if (!img) continue;
    const r = lf.__rect;
    ctx.globalAlpha = lf.__op;
    ctx.globalCompositeOperation = drawn === 0 ? "source-over" : blendOp(lf.__blend);
    try { ctx.drawImage(img, (r.x - minX) * scale, (r.y - minY) * scale, r.w * scale, r.h * scale); drawn++; } catch { /* skip */ }
    img.src = "";
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  if (!drawn) return null;
  const dataUrl = canvasToPng(c);
  return dataUrl ? { dataUrl, x: minX, y: minY, w: c.width, h: c.height, origW: cw, origH: ch } : null;
}

// 마지막 파싱 결과 캐시 — 모달을 닫았다 같은 파일을 다시 열어도 재파싱 없이 즉시 복원.
let lastParseKey = null, lastParseResult = null;
const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;

// 브라우저 파싱 실질 한계 — 모든 레이어를 비압축 디코드하므로 이 이상은 탭 메모리(~4GB) 초과 위험.
export const PSD_BROWSER_LIMIT = 250 * 1024 * 1024;

// dev 서버(Node) 추출 사용 가능 여부 — vite dev 미들웨어(/api/psd-extract)는 개발 환경에만 존재.
export const canServerExtract = () => !!import.meta.env.DEV;

// 초대형 PSD — dev 서버(Node)가 대신 파싱해 레이어 PNG 목록 반환 (탭 메모리 한계 없음).
// 반환 형태는 parsePsdFile 과 동일 { width, height, composite, layers[] } — 모달이 그대로 소비.
// (서버 추출 항목은 leaves 가 없어 폴더 '펼치기'는 미지원 — 개별 레이어가 필요하면 PSD에서 폴더를 풀 것)
export async function parsePsdFileServer(file, maxDim = 2000) {
  const key = fileKey(file);
  if (key === lastParseKey && lastParseResult) return lastParseResult;
  const res = await fetch(`/api/psd-extract?maxDim=${maxDim}`, { method: "POST", body: file });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `서버 추출 실패 (${res.status})`);
  const result = { width: json.width, height: json.height, composite: json.composite || null, layers: json.layers || [] };
  lastParseKey = key; lastParseResult = result;
  return result;
}

// File(.psd) → { width, height, layers[] }  (폴더=합친 1장, 단일레이어=그대로, 보이는 최상위만)
// 각 항목은 x/y(PSD 원본 좌표) + w/h(다운스케일 후) + origW/origH(원본 크기) 를 가진다 —
// origW/origH 는 아래 mergeItems 가 선택 항목들을 원래 배치대로 재합성할 때 사용.
export async function parsePsdFile(file) {
  const key = fileKey(file);
  if (key === lastParseKey && lastParseResult) return lastParseResult;
  const buf = await file.arrayBuffer();
  // skipCompositeImageData: false — 포토샵이 저장한 합성본(조정 레이어·마스크·블렌드 완전 반영)을 함께 추출.
  // 플랫 레이어 PSD 를 "전체 한 장"으로 쓸 땐 병합보다 이 합성본이 원본과 동일하다.
  const psd = readPsd(buf, { useImageData: false, skipLayerImageData: false, skipCompositeImageData: false, skipThumbnail: true });
  const compositePng = psd.canvas ? canvasToPng(psd.canvas) : null;
  psd.canvas = null; // 대형 합성 캔버스 즉시 해제
  preExtract(psd.children); // 모든 레이어 PNG 화 + 대형 캔버스 해제

  const items = [];
  for (const node of psd.children || []) {
    if (node.hidden) continue; // 보이는 최상위만
    if (node.children && node.children.length) {
      const leaves = [];
      collectPngLeaves(node.children, leaves);
      const merged = await compositeLeaves(leaves);
      // leaves: 펼치기(내부 레이어 분해)용 원본 PNG 참조 — 요청 시 expandLeaves 로 개별 카드화.
      if (merged?.dataUrl) items.push({
        name: node.name || "그룹", group: true, ...merged,
        op: node.opacity == null ? 1 : node.opacity, blend: node.blendMode,
        leaves: leaves.map((lf) => ({ name: lf.name || "레이어", png: lf.__png, x: lf.__rect.x, y: lf.__rect.y, w: lf.__rect.w, h: lf.__rect.h, op: lf.__op, blend: lf.__blend })),
      });
      else {
        // 합성 실패 시 폴백: 폴더 내부 레이어를 개별로 노출(빈 화면 방지)
        for (const lf of leaves) {
          const d = await downscalePng(lf.__png, lf.__rect.w, lf.__rect.h);
          if (d) items.push({ name: `${node.name || "그룹"} / ${lf.name || "레이어"}`, group: false, x: lf.__rect.x, y: lf.__rect.y, ...d, origW: lf.__rect.w, origH: lf.__rect.h, op: lf.__op, blend: lf.__blend });
        }
      }
    } else if (node.__png) {
      const d = await downscalePng(node.__png, node.__rect.w, node.__rect.h);
      if (d) items.push({ name: node.name || "레이어", group: false, x: node.__rect.x, y: node.__rect.y, ...d, origW: node.__rect.w, origH: node.__rect.h, op: node.__op, blend: node.__blend });
    }
  }
  // 합성본 다운스케일 (원본과 동일한 완성 렌더 — 목록 최상단에 노출)
  const composite = compositePng ? await downscalePng(compositePng, psd.width, psd.height) : null;
  const result = { width: psd.width, height: psd.height, composite, layers: items };
  lastParseKey = key; lastParseResult = result; // 직전 1건만 캐시(메모리 절약)
  return result;
}

// 폴더 항목의 내부 레이어(leaves)를 개별 카드용 항목으로 분해 — 요청 시(펼치기)만 다운스케일.
export async function expandLeaves(leaves) {
  const out = [];
  for (const lf of leaves || []) {
    const d = await downscalePng(lf.png, lf.w, lf.h);
    if (d) out.push({ name: lf.name, sub: true, x: lf.x, y: lf.y, ...d, origW: lf.w, origH: lf.h, op: lf.op, blend: lf.blend });
  }
  return out;
}

// 선택한 추출 항목들을 PSD 원본 배치(x/y/origW/origH) 그대로 한 장으로 합성.
// items 는 목록 순서(=PSD 스택 아래→위)대로 전달해야 원본과 같은 앞뒤 관계가 된다.
export async function mergeItems(items) {
  const list = (items || []).filter((it) => it?.dataUrl);
  if (!list.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const it of list) {
    const w = it.origW || it.w, h = it.origH || it.h, x = it.x || 0, y = it.y || 0;
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w; if (y + h > maxY) maxY = y + h;
  }
  const cw = maxX - minX, ch = maxY - minY;
  if (cw <= 0 || ch <= 0) return null;
  const scale = Math.min(1, MAX_DIM / Math.max(cw, ch));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(cw * scale)); c.height = Math.max(1, Math.round(ch * scale));
  const ctx = c.getContext("2d");
  let drawn = 0;
  for (const it of list) { // 순차 로드로 메모리 최소화
    const img = await loadImg(it.dataUrl);
    if (!img) continue;
    const w = it.origW || it.w, h = it.origH || it.h;
    // 원본 충실도 — 레이어 불투명도·블렌드 모드 적용 (바닥 레이어는 노멀).
    ctx.globalAlpha = it.op == null ? 1 : it.op;
    ctx.globalCompositeOperation = drawn === 0 ? "source-over" : blendOp(it.blend);
    try { ctx.drawImage(img, ((it.x || 0) - minX) * scale, ((it.y || 0) - minY) * scale, w * scale, h * scale); drawn++; } catch { /* skip */ }
    img.src = "";
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  if (!drawn) return null;
  const dataUrl = canvasToPng(c);
  return dataUrl ? { dataUrl, w: c.width, h: c.height } : null;
}

export const isPsdFile = (file) =>
  !!file && (/\.psd$/i.test(file.name || "") || file.type === "image/vnd.adobe.photoshop");
