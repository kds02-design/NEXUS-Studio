// 변형(베리에이션) 호출 헬퍼.
//   - 원본을 "재생성" 하는 게 아니라 "컬러·재질 오버레이 패스" 로 재프레이밍 — 구조 보존 강화
//   - DECORATION COUNT + DENSITY MATCH 섹션으로 장식 추가 차단
//   - 한글(Hangul) 포함 텍스트 보존 규칙 명시 — Gemini 가 한글을 못 그릴 때 깨진 글자를 장식으로 메우는 패턴 차단
//   - "high detail / 8k / masterpiece quality" 같은 "더 디테일하게" 토큰 제거 — 우리 규칙과 정면 충돌
//   - REFINEMENT_LEVELS 의 promptBlock 으로 사용자가 적극적 감산 지시 가능

import { renderWithImagen } from '../../../lib/imagenRender';
import { REFINEMENT_BY_ID } from '../constants/variations';

// ─── 공통 빌딩 블록 ──────────────────────────────────────────────────────────
const OVERLAY_FRAMING = `Apply a COLOR + MATERIAL OVERLAY PASS to the source. This is a recolor / retexture operation IN PLACE — NOT a regeneration, NOT a re-imagining of the composition. The source is the master template; you are only changing pigment, surface, and material — never structure, count, or size.`;

const COUNT_MATCH_BLOCK = `DECORATION COUNT + DENSITY MATCH (HIGHEST PRIORITY):
- Mentally count every distinct decorative element in the source: corner ornaments, edge filigree, accent shapes, highlight glints, particles, runes, halos, sparkles, dividers, gemstones, badges, ribbons, scrollwork
- The output must contain the EXACT same count — not one element more
- Total visual density of ornaments + highlights + accents + glows must match the source EXACTLY
- DO NOT add any decoration that is not already present in the source. Banned additions include but are not limited to: new corner pieces, new edge accents, new particle effects, new energy glows, new runes, new halos, new sparkles, new gemstones, new filigree, new ribbons, new badges, new glints
- If the source is restrained, the output is restrained. If the source is busy, match its busyness exactly — do not exceed it`;

const SIZE_LOCK_BLOCK = `DECORATION SIZE LOCK (HIGHEST PRIORITY — overrides every mood descriptor below):
- Every decorative element MUST occupy the EXACT same bounding box and percentage area as in the source
- Apply the MINIMUM possible modification to decoration shape — only material and color may change, NEVER size or count
- DO NOT enlarge, inflate, expand, or scale up any decoration
- DO NOT thicken or expand corner pieces, frames, or filigree even if a mood descriptor implies "ornate", "luxurious", "elaborate", "intricate", or "grand"
- Mood adjectives only affect material richness and surface detail — NEVER decoration size, count, or position`;

const TEXT_PRESERVATION_BLOCK = `TEXT PRESERVATION (critical — especially for non-Latin scripts):
- All text in the source MUST be preserved EXACTLY as-is — same characters, same stroke count, same readability, same layout
- For non-Latin scripts (Korean Hangul, Chinese, Japanese, Arabic, etc.), do NOT attempt to redraw or re-render the glyphs from scratch — sample them from the source pixel by pixel
- If glyph rendering would be uncertain, preserve the source pixels as-is rather than guess
- Garbled, mangled, or invented characters are NEVER acceptable — they break the result and tempt the model to mask them with extra ornament
- This rule applies to titles, labels, badges, captions, and any embedded typography`;

const BACKGROUND_BLOCK = `MANDATORY BACKGROUND RULE — non-negotiable:
- The output background MUST be PURE jet-black RGB(0,0,0), perfectly solid, uniform, edge-to-edge
- Absolutely NO gradient, NO haze, NO ambient backlight, NO rim light spilling into the background
- NO atmospheric mist, NO soft halo, NO near-black gray — only true #000000
- The asset must be cleanly isolated for downstream alpha keying and transparent PNG extraction`;

const ONLY_VARY_BLOCK = `ONLY VARY THE FOLLOWING — applied as a recolor / retexture pass on existing pixels:
- Dominant color palette and hue
- Material treatment, surface finish, and texture
- Decorative motif material and color (NOT size, NOT count, NOT position)
- Lighting tone and atmosphere on existing surfaces`;

const FINAL_REMINDER = `FINAL REMINDER: Layout, silhouette, aspect ratio, outline thickness, and decoration count must remain IDENTICAL to the source. Only color, material, and surface finish change. Match the source's rendering quality and detail level — do not exceed it.`;

// 정제 블록 — REFINEMENT_LEVELS 에서 promptBlock 조회. source 면 빈 문자열.
const getRefinementBlock = (refinementLevel) => {
  const lvl = REFINEMENT_BY_ID[refinementLevel || 'source'];
  return lvl?.promptBlock ? `\n\n${lvl.promptBlock}` : '';
};

// 배경 참고 블록.
const getBgContextBlock = (hasBackgroundRef, isAtlas) => {
  if (!hasBackgroundRef) return '';
  const subject = isAtlas ? 'rethemed atlas' : 'variation';
  return `\n\nCOMPOSITING CONTEXT (second reference image — destination background):
A second reference represents the destination background where this ${subject} will be placed. Use it ONLY to harmonize the palette and material — tune the color and surface so the result reads cleanly on that background's hues and mood. DO NOT copy any element from the background reference, and DO NOT add any decoration based on the background. Keep the output isolated on PURE BLACK as mandated.`;
};

// ─── 단일 에셋 변형 프롬프트 ────────────────────────────────────────────────
export const buildVariationPrompt = ({ themeHint, hasBackgroundRef, refinementLevel }) => {
  const refLabel = hasBackgroundRef
    ? 'TWO reference images are provided. The FIRST is the source asset to retheme. The SECOND is the destination background environment.'
    : 'Reference image is provided as the first input — it is the source asset to retheme.';

  return `${refLabel}

${OVERLAY_FRAMING}

ABSOLUTE PRESERVATION RULES (must remain IDENTICAL to the source):
- The overall silhouette and outer shape outline
- The aspect ratio and canvas composition — do not crop, do not extend, do not change framing
- The thickness of the outer frame / outline / border stroke
- The component type (button / card / panel / badge) and overall layout
- The center text-safe zone and any embedded typography placement

${COUNT_MATCH_BLOCK}

${SIZE_LOCK_BLOCK}

${TEXT_PRESERVATION_BLOCK}

${BACKGROUND_BLOCK}

${ONLY_VARY_BLOCK}

TARGET COLOR + MATERIAL (this is a color/material descriptor only — it does NOT add decorations):
${themeHint}${getBgContextBlock(hasBackgroundRef, false)}${getRefinementBlock(refinementLevel)}

${FINAL_REMINDER}`;
};

// ─── 아틀라스(디자인 시스템) 변형 프롬프트 ───────────────────────────────────
// atlasSpec: PromotionArchive 의 공통 템플릿 분석에서 추출한 마스터 명세(마크다운).
// 있으면 ATLAS STRUCTURE SPEC 블록으로 주입 — 모델에게 보존해야 할 구조를 텍스트로도 명시.
export const buildAtlasVariationPrompt = ({ themeHint, hasBackgroundRef, refinementLevel, atlasSpec }) => {
  const refLabel = hasBackgroundRef
    ? 'TWO reference images are provided. The FIRST is the source DESIGN SYSTEM ATLAS to retheme. The SECOND is the destination background environment.'
    : 'Reference image is provided as the first input — it is a complete DESIGN SYSTEM ATLAS.';

  const specBlock = atlasSpec && atlasSpec.trim() ? `\n\nATLAS STRUCTURE SPEC (verified from prior analysis of similar pages — use as preservation anchor):
${atlasSpec.trim()}

Preserve every region, fixed copy, and dynamic placeholder slot listed above EXACTLY as specified. The output must comply with this spec.\n` : '';

  return `${refLabel}

The source image is a DESIGN SYSTEM ATLAS — a single canvas containing MULTIPLE distinct UI sub-assets (buttons, frames, panels, badges, dividers, corner decorations, titles, illustrations, etc.) arranged together in a fixed layout, similar to a sprite sheet or component kit for an entire page.

${OVERLAY_FRAMING}
${specBlock}
ATLAS PRESERVATION RULES (must remain IDENTICAL to the source):
- Mentally inventory EVERY sub-asset visible in the source before applying any change. The output must contain the EXACT same inventory — same count, same kinds, same order, same positions
- Atlas overall aspect ratio and canvas framing — do not crop, do not extend, do not change composition
- Every sub-asset's individual silhouette, outline shape, outline thickness, and corner radius
- Every sub-asset's position and relative size within the atlas — do NOT rearrange, scale, or relocate any sub-asset
- The grid / layout / spacing between sub-assets — do NOT pack tighter or spread wider
- All text labels, badges, and embedded typography placement

${COUNT_MATCH_BLOCK}

${SIZE_LOCK_BLOCK}

${TEXT_PRESERVATION_BLOCK}

CONSISTENCY REQUIREMENT (entire atlas must adopt the new theme COHERENTLY — single unified UI kit):
- EVERY sub-asset must share the SAME new color palette, the SAME new material treatment, the SAME new surface finish, and the SAME new accent color
- The button, frame, badge, panel, divider, title — they must all look like members of one unified UI kit under the new theme
- Do NOT theme different sub-assets with different palettes or materials — the whole atlas is ONE design system
- Highlights, gradients, and shadows must use a consistent light direction across all sub-assets

${BACKGROUND_BLOCK}

${ONLY_VARY_BLOCK}

TARGET COLOR + MATERIAL (this is a color/material descriptor only — it does NOT add decorations):
${themeHint}${getBgContextBlock(hasBackgroundRef, true)}${getRefinementBlock(refinementLevel)}

${FINAL_REMINDER}`;
};

// ─── 호출 헬퍼 ────────────────────────────────────────────────────────────────
const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';

export async function renderVariation(
  sourceDataUrl,
  themeHint,
  options = {}
) {
  if (!sourceDataUrl) return { ok: false, error: '원본 에셋이 없습니다.', prompt: null };
  if (!themeHint)     return { ok: false, error: '변형 테마 힌트가 없습니다.', prompt: null };

  const modelId = options.modelId || DEFAULT_MODEL;
  const backgroundRef = options.backgroundRefDataUrl || null;
  const refs = backgroundRef ? [sourceDataUrl, backgroundRef] : [sourceDataUrl];

  const prompt = buildVariationPrompt({
    themeHint,
    hasBackgroundRef: !!backgroundRef,
    refinementLevel: options.refinementLevel,
  });

  try {
    const result = await renderWithImagen(prompt, modelId, refs);
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt };
  }
}

export async function renderAtlasVariation(
  sourceDataUrl,
  themeHint,
  options = {}
) {
  if (!sourceDataUrl) return { ok: false, error: '원본 아틀라스가 없습니다.', prompt: null };
  if (!themeHint)     return { ok: false, error: '변형 테마 힌트가 없습니다.', prompt: null };

  const modelId = options.modelId || DEFAULT_MODEL;
  const backgroundRef = options.backgroundRefDataUrl || null;
  const refs = backgroundRef ? [sourceDataUrl, backgroundRef] : [sourceDataUrl];

  const prompt = buildAtlasVariationPrompt({
    themeHint,
    hasBackgroundRef: !!backgroundRef,
    refinementLevel: options.refinementLevel,
    atlasSpec: options.atlasSpec,
  });

  try {
    const result = await renderWithImagen(prompt, modelId, refs);
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt };
  }
}

// ─── 검은 배경 → 알파 추출 (기존 동일) ────────────────────────────────────────
export function blackToTransparentPng(dataUrl, threshold = 10, featherRange = 28) {
  return new Promise((resolve, reject) => {
    if (!dataUrl) { reject(new Error('이미지 데이터가 없습니다.')); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = imageData.data;
        for (let i = 0; i < px.length; i += 4) {
          const lum = Math.max(px[i], px[i + 1], px[i + 2]);
          if (lum <= threshold) {
            px[i + 3] = 0;
          } else if (lum < threshold + featherRange) {
            px[i + 3] = Math.round(((lum - threshold) / featherRange) * 255);
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = dataUrl;
  });
}
