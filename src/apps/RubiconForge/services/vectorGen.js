// 벡터 생성 오케스트레이션 — Gemini SVG 호출 + 정제 + 래스터화(썸네일/PNG).
//   renderVectorAsset(spec)  → { ok, svg, viewBox } | { ok:false, error, raw }
//   sanitizeSvg(raw)         → 안전한 <svg> 문자열만 추출(스크립트/외부참조/이벤트 제거)
//   svgToPngDataUrl(svg,opts)→ SVG → PNG dataURL (썸네일·다운로드용)

import { generateVectorSvg } from './gemini';
import { VECTOR_CATEGORY_BY_ID, VECTOR_STYLE_BY_ID, VECTOR_PALETTE_BY_ID } from '../constants/vectors';

// 모델 출력에서 안전한 단일 <svg> 만 남긴다.
export function sanitizeSvg(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.replace(/```(?:svg|xml|html)?/gi, '').replace(/```/g, '').trim();
  const m = s.match(/<svg[\s\S]*<\/svg>/i);
  if (!m) return null;
  s = m[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')   // onClick 등 이벤트 제거
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/<(image|foreignObject)[\s\S]*?(\/>|<\/\1>)/gi, '') // 외부 리소스 제거
    .replace(/(xlink:href|href)\s*=\s*"(?!#)[^"]*"/gi, '');      // 내부 앵커(#) 외 href 제거
  return s.trim();
}

// viewBox 파싱 → [w, h] 종횡비.
function viewBoxWH(svg, fallback = [64, 64]) {
  const m = svg.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
  if (!m) return fallback;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) return [parts[2], parts[3]];
  return fallback;
}

// 래스터화에 안정적이도록 svg 에 명시 width/height 를 주입한 클론 문자열 반환.
function sizedSvg(svg, w, h) {
  let s = svg.replace(/\swidth\s*=\s*"[^"]*"/i, '').replace(/\sheight\s*=\s*"[^"]*"/i, '');
  return s.replace(/<svg\b/i, `<svg width="${w}" height="${h}"`);
}

const SYSTEM_BASE = (cat, style, pal) =>
  `You are an expert SVG illustrator for game and promotion UI assets. Output ONLY one valid, self-contained <svg> element and NOTHING else — no markdown code fences, no comments, no explanation text, no <script>, no <image>, no <foreignObject>, no external references.
RULES:
- Include viewBox="${cat.viewBox}". Do NOT set a fixed width/height attribute.
- Use only vector primitives (path, rect, circle, ellipse, polygon, polyline, line, g) with flat fills/strokes — no raster, no filters; avoid gradients unless truly needed.
- Colors: primary ${pal.primary}, accent ${pal.accent}. Use these exact values. ${pal.primary === '#ffffff' ? 'On a dark background, so favor the light primary.' : ''}
- TRANSPARENT background — do NOT add a full-canvas background rectangle.
- Center the asset with small padding inside the viewBox; symmetric where appropriate. Crisp, clean, production-ready, pixel-aligned.
- Style: ${style.hint}.`;

export async function renderVectorAsset(spec = {}) {
  const cat = VECTOR_CATEGORY_BY_ID[spec.category];
  const style = VECTOR_STYLE_BY_ID[spec.style];
  const pal = VECTOR_PALETTE_BY_ID[spec.palette];
  if (!cat || !style || !pal) return { ok: false, error: '벡터 옵션이 올바르지 않습니다.' };
  const idx = spec.index || 0;
  const system = SYSTEM_BASE(cat, style, pal);
  const user = `Create one ${cat.promptHint}.
Subject: ${spec.userText?.trim() || cat.label}.
Flat vector, ${style.label} style, ${pal.label} palette.
This is variation #${idx + 1} — make it visually distinct from the other variations (different motif/arrangement), same category and style.`;
  try {
    const raw = await generateVectorSvg({ system, user });
    const svg = sanitizeSvg(raw);
    if (!svg) return { ok: false, error: '유효한 SVG 를 받지 못했습니다. 다시 시도해주세요.', raw };
    return { ok: true, svg, viewBox: cat.viewBox };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// SVG → PNG dataURL. background:null 이면 투명. width 기준, viewBox 종횡비로 height 산출.
export function svgToPngDataUrl(svg, { width = 512, background = null, padding = 0.08 } = {}) {
  return new Promise((resolve, reject) => {
    if (!svg) { reject(new Error('SVG 가 없습니다.')); return; }
    const [vw, vh] = viewBoxWH(svg);
    const aspect = vw / vh;
    const height = Math.round(width / aspect);
    const img = new Image();
    let url;
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        const ctx = c.getContext('2d');
        if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, width, height); }
        const pad = Math.round(Math.min(width, height) * padding);
        ctx.drawImage(img, pad, pad, width - pad * 2, height - pad * 2);
        if (url) URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/png'));
      } catch (e) { if (url) URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { if (url) URL.revokeObjectURL(url); reject(new Error('SVG 래스터화 실패')); };
    const blob = new Blob([sizedSvg(svg, width, height)], { type: 'image/svg+xml;charset=utf-8' });
    url = URL.createObjectURL(blob);
    img.src = url;
  });
}
