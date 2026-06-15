// 변형(베리에이션) 호출 헬퍼.
//   - 원본을 "재생성" 하는 게 아니라 "컬러·재질 오버레이 패스" 로 재프레이밍 — 구조 보존 강화
//   - DECORATION COUNT + DENSITY MATCH 섹션으로 장식 추가 차단
//   - 한글(Hangul) 포함 텍스트 보존 규칙 명시 — Gemini 가 한글을 못 그릴 때 깨진 글자를 장식으로 메우는 패턴 차단
//   - "high detail / 8k / masterpiece quality" 같은 "더 디테일하게" 토큰 제거 — 우리 규칙과 정면 충돌
//   - REFINEMENT_LEVELS 의 promptBlock 으로 사용자가 적극적 감산 지시 가능

import { renderWithImagen } from '../../../lib/imagenRender';
import { REFINEMENT_BY_ID, ATMOSPHERE_TEMPERATURE_BY_ID, ATMOSPHERE_AGE_BY_ID } from '../constants/variations';

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

// 분위기 미세조정 블록 — 온도 → 세월 순으로 비중립만 이어붙임.
// 세월(표면 마감)이 최종 단계라 온도 뒤에 와야 자연스러움. 둘 다 neutral 이면 빈 문자열.
const getAtmosphereBlock = (temperature, age) => {
  const temp = ATMOSPHERE_TEMPERATURE_BY_ID[temperature || 'neutral'];
  const aged = ATMOSPHERE_AGE_BY_ID[age || 'neutral'];
  const blocks = [temp?.promptBlock, aged?.promptBlock].filter(Boolean);
  return blocks.length ? `\n\n${blocks.join('\n\n')}` : '';
};

// 배경 참고 블록.
const getBgContextBlock = (hasBackgroundRef, isAtlas) => {
  if (!hasBackgroundRef) return '';
  const subject = isAtlas ? 'rethemed atlas' : 'variation';
  return `\n\nCOMPOSITING CONTEXT (second reference image — destination background):
A second reference represents the destination background where this ${subject} will be placed. Use it ONLY to harmonize the palette and material — tune the color and surface so the result reads cleanly on that background's hues and mood. DO NOT copy any element from the background reference, and DO NOT add any decoration based on the background. Keep the output isolated on PURE BLACK as mandated.`;
};

// ─── 단일 에셋 변형 프롬프트 ────────────────────────────────────────────────
export const buildVariationPrompt = ({ themeHint, hasBackgroundRef, refinementLevel, temperature, age }) => {
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
${themeHint}${getBgContextBlock(hasBackgroundRef, false)}${getRefinementBlock(refinementLevel)}${getAtmosphereBlock(temperature, age)}

${FINAL_REMINDER}`;
};

// ─── 아틀라스(디자인 시스템) 변형 프롬프트 ───────────────────────────────────
// atlasSpec: PromotionArchive 의 공통 템플릿 분석에서 추출한 마스터 명세(마크다운).
// 있으면 ATLAS STRUCTURE SPEC 블록으로 주입 — 모델에게 보존해야 할 구조를 텍스트로도 명시.
export const buildAtlasVariationPrompt = ({ themeHint, hasBackgroundRef, refinementLevel, atlasSpec, temperature, age }) => {
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
${themeHint}${getBgContextBlock(hasBackgroundRef, true)}${getRefinementBlock(refinementLevel)}${getAtmosphereBlock(temperature, age)}

${FINAL_REMINDER}`;
};

// ─── 외부 Gemini / AI Studio 챗 붙여넣기용 컴팩트 프롬프트 ────────────────────
// 위의 buildVariationPrompt / buildAtlasVariationPrompt 는 앱 API 호출 전용:
//   - 레퍼런스 이미지를 inlineData 로 첨부하는 전제 ("first/second reference image")
//   - HIGHEST PRIORITY 보존 블록이 수십 줄 반복
// → 외부 챗에 그대로 붙이면 지시 충돌로 거부되거나 이미지 없이 텍스트만 돌아옴.
// 챗에선 사용자가 이미지를 직접 첨부하므로, 핵심 제약만 짧게 압축한 버전을 따로 제공한다.
const COMPACT_TEMP_HINT = {
  coolStrong: 'Cool moonlit steel-blue lighting (white-balance shift only, no new light source).',
  cool: 'Slightly cool lighting.',
  warm: 'Slightly warm candlelit lighting.',
  warmStrong: 'Warm firelit amber-gold lighting (white-balance shift only, no new light source).',
};
const COMPACT_AGE_HINT = {
  restoredStrong: 'Pristine, freshly-crafted surfaces — remove all wear and tarnish.',
  restored: 'Slightly cleaner, fresher surfaces.',
  worn: 'Lightly aged and worn surfaces (shading/material only — no new scratches or cracks).',
  wornStrong: 'Heavily weathered, battle-worn patina and oxidation (shading/material only — no new scratches or cracks).',
};
const COMPACT_REFINE_HINT = {
  refined: 'Simplify decorative density to about 60% — keep the silhouette and outline exactly.',
  minimal: 'Strip to only the single most prominent accent per element — keep the silhouette and outline exactly.',
};

const compactExtras = (refinementLevel, temperature, age) => [
  COMPACT_TEMP_HINT[temperature],
  COMPACT_AGE_HINT[age],
  COMPACT_REFINE_HINT[refinementLevel],
].filter(Boolean).map(s => `- ${s}`).join('\n');

export const buildCompactVariationPrompt = ({ themeHint, refinementLevel, temperature, age }) => {
  const extras = compactExtras(refinementLevel, temperature, age);
  return `Recolor and retexture the attached image IN PLACE. Keep the exact same shapes, outlines, layout, proportions, embedded text, and number of elements — change ONLY color, material, and surface finish.
New color + material: ${themeHint}
${extras ? `${extras}\n` : ''}Rules: background must be pure black #000000; do NOT add, remove, resize, or rearrange any decoration; do NOT redraw or alter any text; match the source's detail level, do not exceed it.`;
};

export const buildCompactAtlasVariationPrompt = ({ themeHint, refinementLevel, temperature, age }) => {
  const extras = compactExtras(refinementLevel, temperature, age);
  return `The attached image is a UI kit / design-system sheet containing multiple separate elements (buttons, frames, panels, badges, dividers, etc.). Recolor and retexture EVERY element IN PLACE with ONE unified theme. Keep each element's exact shape, position, size, outline, embedded text, and the total element count — change ONLY color, material, and surface finish, consistently across all elements.
New color + material: ${themeHint}
${extras ? `${extras}\n` : ''}Rules: background must be pure black #000000; do NOT add, remove, resize, or rearrange any element or decoration; do NOT redraw or alter any text; keep one consistent light direction across the whole sheet.`;
};

// ─── 세부 에셋 디자인 대안 프롬프트 ('변형 생성' 탭) ─────────────────────────
// recolor 빌더와 정반대 철학: 구조 락(COUNT_MATCH/SIZE_LOCK)을 풀고, 같은 컴포넌트
// 정체성·기능만 유지한 채 형태·장식·비율·구성을 적극 변주한다. directionBlock 이 이번
// 대안이 밀어붙일 방향, strengthBlock 이 원본에서 멀어지는 정도.
const DESIGN_TEXT_RULE = `TEXT RULE: If the reference contains text, keep the same text CONTENT and keep it legible. You may reposition or restyle it to fit the new design, but never invent garbled or broken glyphs — this is critical for non-Latin scripts (Korean Hangul, Chinese, Japanese). If unsure, keep the text minimal and clean rather than risk mangling it.`;

export const buildDesignAlternativePrompt = ({ directionBlock, strengthBlock, hasBackgroundRef }) => {
  const refLabel = hasBackgroundRef
    ? 'TWO reference images are provided. The FIRST is the source detail asset to redesign. The SECOND is the destination background environment.'
    : 'Reference image is provided as the first input — it is the source detail asset to redesign.';

  return `${refLabel}

Generate a DESIGN ALTERNATIVE of the reference detail asset — a fresh REDESIGN of the SAME game-UI component, keeping the SAME structural proportions but changing the design language. Think of it as the same frame/button/badge redrawn by a different artist who kept the same blueprint: the motif, ornament style, material, and detailing change — the size, thickness, and footprint do NOT.

IDENTITY ANCHORS (must stay true to the reference):
- The component type / function / role — a button stays a button, a frame stays a frame, a badge stays a badge, an ornament stays an ornament; do NOT turn it into a different kind of asset
- A SINGLE, centered, isolated asset — same subject, not a scene, not a collection

BORDER & LINE-WEIGHT LOCK (HIGHEST PRIORITY — overrides EVERY variation direction and strength below):
- Visually trace the source's outer frame / border and reproduce the SAME stroke WIDTH and THICKNESS — do NOT thicken, bulk up, fatten, or inflate the frame or border. If the source border is slim and delicate, the result MUST stay slim and delicate.
- Ornament, filigree, and engraving LINE WEIGHT and relief / bevel / emboss depth stay at the source level — you may change the MOTIF and pattern, but the strokes must stay as THIN and FINE as the source; do NOT make ornaments chunkier, bolder, heavier, thicker, or more raised
- The overall visual HEAVINESS / weight of the piece matches the source — match how much "ink" and metal mass the source uses; a light, airy source yields a light, airy result
- This lock is absolute: when a direction says "richer" or "more ornate", it means a more intricate FINE pattern in the same thin line weight — NEVER thicker or heavier strokes
- WHEN IN DOUBT, ERR THINNER: if the source stroke width is hard to judge, render the border and all ornament strokes SLIGHTLY THINNER and finer rather than thicker. A too-slim result is acceptable; a thickened, chunky frame is a failure.

FINENESS & PRECISION (global quality bias — apply throughout, second only to the locks above):
- Aim for a highly refined, precise, jeweler-grade result: crisp clean edges, delicate fine linework, tightly controlled detail. Favor finesse and elegance over heft.
- Render detail as FINE and intricate at a small scale — like fine engraving, etched metal, or inlay — NEVER as thick, blocky, molded, rounded, tube-like, or chunky relief.
- Keep frames, borders, and ornament strokes SLIM and sharp; resist any drift toward swollen, padded, bulky, or rope-like forms.

STRUCTURAL ENVELOPE — KEEP CLOSE TO THE SOURCE (high priority, do NOT exaggerate):
- Decoration and ornament SIZE / SCALE stays close to the source — you may change the ornament's motif and style, but each ornament must occupy roughly the SAME footprint and area; do NOT enlarge corner pieces, do NOT let ornaments grow inward over the content area
- Overall ASPECT RATIO and outer bounding proportions stay close to the source — do NOT restretch or reorient the canvas (landscape stays landscape, portrait stays portrait), do NOT change the asset's footprint
- The central content / text-safe area keeps roughly the same size and position
- The structural envelope and the border/line-weight lock are preserved at EVERY variation strength — strength only controls how boldly the MOTIF, shape DETAIL, MATERIAL, and ARRANGEMENT are reinterpreted, never the stroke thickness, ornament size, or aspect ratio

YOU MAY VARY (within the lock + envelope):
- Decorative MOTIF and pattern — the look of the carving / filigree / framing, NOT its line weight or size
- Corner / edge treatment and fine shape detail — within a similar silhouette, the SAME border thickness, and the SAME aspect ratio
- Color, material, and surface finish
- Internal arrangement and focal-accent styling

VARIATION DIRECTION (the primary axis to explore for THIS alternative):
${directionBlock || 'Explore a tasteful, distinct redesign of the motif, detail, and material.'}

${strengthBlock || 'VARIATION STRENGTH: subtle — stay close to the reference; gentle redesign only.'}

${DESIGN_TEXT_RULE}

ISOLATION (critical — overrides any direction that hints at a scene):
- ONE single asset, centered on pure black — absolutely NO environment, NO background scenery, NO floor / wall / pillars / landscape / props, NO scene, NO duplicate copies. If a direction mentions composition or proportion, it refers ONLY to the asset's own internal layout, never to building a scene around it.

${BACKGROUND_BLOCK}${getBgContextBlock(hasBackgroundRef, false)}

FINAL: Output ONE single redesigned detail asset, centered and isolated on pure black #000000 — same component type, a border / frame stroke NO THICKER than the reference (slimmer is fine), the same thin fine ornament line weight, same ornament scale, same aspect ratio as the reference, but a distinct, finely-detailed and precise decorative motif and material.`;
};

// 외부 챗 붙여넣기용 컴팩트 디자인 대안 프롬프트.
export const buildCompactDesignAlternativePrompt = ({ directionHint, strengthHint }) => {
  return `Redesign the attached game-UI detail asset into a DESIGN ALTERNATIVE — same component type and purpose (a button stays a button, a frame stays a frame), as a single centered asset isolated on pure black #000000. Change the design language (motif, pattern, material, internal arrangement), but KEEP the structure close to the source: trace and reproduce the SAME border/frame stroke thickness, the SAME thin ornament line weight (do NOT make ornaments thicker, bolder, or more raised), the same ornament size/scale (don't enlarge), and the same aspect ratio and footprint. "Richer" means a finer, more intricate pattern at the same thin line weight, never heavier strokes. If unsure of the source stroke width, err THINNER. Aim for a refined, precise, finely-detailed result — never thick, chunky, or bulky. NO background scene, NO environment.
${directionHint ? `Direction: ${directionHint}\n` : ''}${strengthHint ? `Strength: ${strengthHint}\n` : ''}If there is text, keep the same content and keep it legible (no garbled glyphs). Output one single redesigned asset only.`;
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
    temperature: options.temperature,
    age: options.age,
  });
  // 외부 챗 붙여넣기용 — API 실패 시에도 복사할 수 있게 항상 동봉.
  const compactPrompt = buildCompactVariationPrompt({
    themeHint,
    refinementLevel: options.refinementLevel,
    temperature: options.temperature,
    age: options.age,
  });

  try {
    const result = await renderWithImagen(prompt, modelId, refs, { imageSize: options.imageSize });
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt, compactPrompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt, compactPrompt };
  }
}

// 세부 에셋 디자인 대안 렌더 — recolor 와 별개 경로. themeHint 대신 방향/강도 블록을 받는다.
export async function renderDesignAlternative(sourceDataUrl, options = {}) {
  if (!sourceDataUrl) return { ok: false, error: '원본 에셋이 없습니다.', prompt: null, compactPrompt: null };

  const modelId = options.modelId || DEFAULT_MODEL;
  const backgroundRef = options.backgroundRefDataUrl || null;
  const refs = backgroundRef ? [sourceDataUrl, backgroundRef] : [sourceDataUrl];

  const prompt = buildDesignAlternativePrompt({
    directionBlock: options.directionBlock,
    strengthBlock: options.strengthBlock,
    hasBackgroundRef: !!backgroundRef,
  });
  const compactPrompt = buildCompactDesignAlternativePrompt({
    directionHint: options.directionHint,
    strengthHint: options.strengthHint,
  });

  try {
    const result = await renderWithImagen(prompt, modelId, refs, { imageSize: options.imageSize });
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt, compactPrompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt, compactPrompt };
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
    temperature: options.temperature,
    age: options.age,
  });
  const compactPrompt = buildCompactAtlasVariationPrompt({
    themeHint,
    refinementLevel: options.refinementLevel,
    temperature: options.temperature,
    age: options.age,
  });

  try {
    const result = await renderWithImagen(prompt, modelId, refs, { imageSize: options.imageSize });
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt, compactPrompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt, compactPrompt };
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
