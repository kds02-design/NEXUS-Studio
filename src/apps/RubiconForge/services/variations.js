// 변형(베리에이션) 호출 헬퍼.
//   - 원본을 "재생성" 하는 게 아니라 "컬러·재질 오버레이 패스" 로 재프레이밍 — 구조 보존 강화
//   - DECORATION COUNT + DENSITY MATCH 섹션으로 장식 추가 차단
//   - 한글(Hangul) 포함 텍스트 보존 규칙 명시 — Gemini 가 한글을 못 그릴 때 깨진 글자를 장식으로 메우는 패턴 차단
//   - "high detail / 8k / masterpiece quality" 같은 "더 디테일하게" 토큰 제거 — 우리 규칙과 정면 충돌
//   - REFINEMENT_LEVELS 의 promptBlock 으로 사용자가 적극적 감산 지시 가능

import { renderWithImagen } from '../../../lib/imagenRender';
import { REFINEMENT_BY_ID, ATMOSPHERE_TEMPERATURE_BY_ID, ATMOSPHERE_AGE_BY_ID, DEFAULT_BG } from '../constants/variations';

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

// 배경 규칙 — 선택한 배경색에 맞춰 동적으로 생성. bg 미지정 시 블랙(기존 동작).
const resolveBg = (bg) => bg || DEFAULT_BG;

const BACKGROUND_BLOCK = (bg) => {
  const b = resolveBg(bg);
  if (b.id === 'black') {
    return `MANDATORY BACKGROUND RULE — non-negotiable:
- The output background MUST be PURE jet-black RGB(0,0,0), perfectly solid, uniform, edge-to-edge
- Absolutely NO gradient, NO haze, NO ambient backlight, NO rim light spilling into the background
- NO atmospheric mist, NO soft halo, NO near-black gray — only true #000000
- The asset must be cleanly isolated for downstream alpha keying and transparent PNG extraction`;
  }
  const chromaLine = b.chroma
    ? `\n- This is a CHROMA-KEY backdrop: keep it a single saturated flat ${b.label} so the subject (which must NOT contain this exact color) can be cleanly keyed out.`
    : '';
  return `MANDATORY BACKGROUND RULE — non-negotiable:
- The output background MUST be a PERFECTLY FLAT, SOLID, UNIFORM ${b.label} fill at exactly ${b.hex}, edge-to-edge
- Absolutely NO gradient, NO vignette, NO texture, NO haze, NO ambient glow, NO drop shadow, NO rim light spilling into the background${chromaLine}
- The asset must sit cleanly on this uniform ${b.label} (${b.hex}) background for downstream background removal / keying`;
};

const ONLY_VARY_BLOCK = `ONLY VARY THE FOLLOWING — applied as a recolor / retexture pass on existing pixels:
- Dominant color palette and hue
- Material treatment, surface finish, and texture
- Decorative motif material and color (NOT size, NOT count, NOT position)
- Lighting tone and atmosphere on existing surfaces`;

const FINAL_REMINDER = `FINAL REMINDER: Layout, silhouette, aspect ratio, outline thickness, and decoration count must remain IDENTICAL to the source. Only color, material, and surface finish change. Match the source's rendering quality and detail level — do not exceed it.`;

// ─── 리스킨(단일 버튼) 전용 보강 블록 ──────────────────────────────────────────
// recolor 의 기본은 "전부 보존" 이지만, 버튼 리스킨에서는 사용자가 직접 카피를 얹으므로
//   (1) 내부 텍스트를 지워 빈 공간으로 만들고,
//   (2) 프레임 두께가 커지는 흔한 실패를 차단하며,
//   (3) 흰/유색 배경으로 빠지는 실패를 추가로 막는다.
const TEXT_REMOVAL_BLOCK = `TEXT REMOVAL — LEAVE THE TEXT AREA EMPTY (critical):
- The source has embedded text / a label inside its central area. In the OUTPUT, REMOVE that text completely.
- Do NOT redraw, re-render, translate, keep, or replace the text with new glyphs, placeholder words, symbols, numbers, or icons.
- Leave the central text zone as a CLEAN, EMPTY, smooth surface in the new material — the same reserved area, just blank, ready for a designer to add their own text later.
- Keep the panel / button surface, frame, and decorations fully intact around that empty zone — ONLY the text glyphs disappear, revealing the underlying surface beneath them.
- The empty area must read as intentional, clean negative space — NOT as a blurred, smeared, scratched, or damaged patch.`;

const FRAME_THICKNESS_LOCK = `FRAME / BORDER THICKNESS LOCK (HIGHEST PRIORITY — the frame must NOT grow):
- Trace the source's outer frame / border / rim and reproduce the SAME stroke WIDTH and the SAME proportion of the asset — do NOT thicken, fatten, inflate, bulk up, or deepen the relief of the frame.
- Switching to a richer material (ornate gold, heavy iron, etc.) must NOT add thickness, height, or bevel depth — it is the SAME thin frame in a new material, never a chunkier one.
- If the source frame is slim, the output frame stays slim. The inner content area must NOT shrink because the frame grew.
- WHEN IN DOUBT, ERR THINNER: render the frame and edge slightly thinner rather than thicker. A too-slim frame is acceptable; a thick, swollen, oversized frame is a failure.`;

// 리스킨에서 가장 흔한 실패 — recolor 인데도 테두리/라인 옆에 새 장식(이너 라인·비딩·각인·글린트)을 끼워 넣음.
// 이 블록이 "선·모서리 근처는 무조건 원본 그대로, 추가 금지" 를 최우선으로 못박는다.
const EDGE_LINE_RESTRAINT = `EDGE & LINE ORNAMENT SUPPRESSION (HIGHEST PRIORITY — keep every edge as plain as the source):
- This is a recolor only: do NOT add ANY new decoration along, beside, or near borders, frames, rims, outlines, dividers, separators, or lines. Specifically banned near any edge/line: a new inner border, a second / companion / parallel line, double-lining, piping, beading, dotted studs, rivets, bolts, notches, grooves, knurling, engraving, filigree, scrollwork, corner flourishes, edge glints, or glow / highlight strips.
- Every border, outline, and divider stays ONE single stroke at the SAME thickness as the source — never split into two, never given an inner or outer twin line, never embossed, beveled, or deepened.
- Keep the band of space immediately around each line and edge as clean and bare as in the source. If the source edge is a plain line, the output edge stays a plain line — only its color and material change.
- UNDER-decorate, never over-decorate: when unsure whether an edge or line detail existed in the source, OMIT it. The edges and lines must read as the SAME minimal edges, just re-materialized.`;

const BACKGROUND_RESKIN_EMPHASIS = (bg) => {
  const b = resolveBg(bg);
  const target = b.id === 'black' ? 'pure black #000000' : `a uniform ${b.label} ${b.hex}`;
  return `BACKGROUND — EXTRA EMPHASIS (frequent failure on recolor): whatever backdrop the SOURCE asset sits on (white, light, gray, cream, colored, or scene), the OUTPUT background MUST be replaced with ${target}. NEVER place the asset on a card, sheet, panel, podium, table, or product-shot backdrop. Only the asset itself survives — everything behind and around it is a flat solid ${b.label} (${b.hex}).`;
};

const RESKIN_FINAL_CHECK = (bg) => {
  const b = resolveBg(bg);
  const bgCheck = b.id === 'black' ? 'pure black #000000 — never white, light, or a card/backdrop' : `a flat uniform ${b.label} ${b.hex} — never a card, podium, or product-shot backdrop`;
  return `RE-SKIN FINAL CHECK (verify all four before output): (1) the background is ${bgCheck}; (2) the frame / border / outline is NO thicker than the source — slimmer is fine, never thicker; (3) if the source had embedded text, the central text area is now EMPTY — the original text is removed and NOT replaced, leaving clean blank surface; (4) NO new ornament, inner/companion line, beading, or glint was added near any border, edge, or line — every edge is as plain as the source, only recolored.`;
};

// ─── 주변 광원 제거 — '오브젝트만' 토글 전용 블록 ─────────────────────────────────
// 원본이 갓레이·후광·글로우·파티클·백라이트 같은 "오브젝트를 둘러싼 주변 빛효과"를 달고 있을 때,
// 그것만 골라 제거하고 오브젝트 본체만 순흑 위에 남긴다. 이 블록은 COUNT_MATCH 의 "광원/파티클까지
// 그대로 보존" 지시를 주변광에 한해 의도적으로 무시(override)한다 — 본체 표면의 자체 음영/하이라이트는 유지.
const STRIP_AMBIENT_LIGHT_BLOCK = `AMBIENT LIGHT REMOVAL — OBJECT ONLY (HIGHEST PRIORITY — this OVERRIDES the decoration-count match for light effects ONLY):
- The source object may be surrounded by AMBIENT / ENVIRONMENTAL light effects: god rays, light beams, a glowing halo or aura, backlight bloom, radial sunburst, floating sparkles or particles, energy glow spilling into the area around the object, lens flares, drifting embers.
- REMOVE all of these surrounding light effects completely. The output keeps ONLY the object itself, cleanly isolated on pure black #000000, as if the ambient lighting was switched off.
- This is the ONE exception to "match the source's glow/particle/halo count exactly": those AMBIENT effects that live AROUND or BEHIND the object must be deleted, not matched.
- KEEP the object's OWN integral surface shading, material highlights, and self-contained reflections that sit ON the object's surfaces — do NOT flatten or dull the object itself. Only the light that radiates OUTWARD into the surrounding space / background is removed.
- Do NOT shrink, recolor, restyle, or alter the object to compensate — the object stays exactly as specified by the other rules; only the detached ambient glow around it disappears, revealing pure black where that glow used to be.`;

const COMPACT_STRIP_HINT = `Also REMOVE any ambient light AROUND the object — god rays, halo/aura, backlight bloom, radial glow, floating sparkles/particles, lens flares spilling into the background. Keep ONLY the object itself on pure black (keep the object's own surface highlights; delete only the glow radiating around it).`;

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
export const buildVariationPrompt = ({ themeHint, hasBackgroundRef, refinementLevel, temperature, age, stripAmbientLight, bg }) => {
  const refLabel = hasBackgroundRef
    ? 'TWO reference images are provided. The FIRST is the source asset to retheme. The SECOND is the destination background environment.'
    : 'Reference image is provided as the first input — it is the source asset to retheme.';

  const stripBlock = stripAmbientLight ? `\n\n${STRIP_AMBIENT_LIGHT_BLOCK}` : '';

  return `${refLabel}

${OVERLAY_FRAMING}

ABSOLUTE PRESERVATION RULES (must remain IDENTICAL to the source):
- The overall silhouette and outer shape outline
- The aspect ratio and canvas composition — do not crop, do not extend, do not change framing
- The thickness of the outer frame / outline / border stroke
- The component type (button / card / panel / badge) and overall layout
- The center text-safe zone's size and position — but it must be left EMPTY (see TEXT REMOVAL below)

${COUNT_MATCH_BLOCK}

${SIZE_LOCK_BLOCK}

${FRAME_THICKNESS_LOCK}

${EDGE_LINE_RESTRAINT}

${TEXT_REMOVAL_BLOCK}

${BACKGROUND_BLOCK(bg)}

${BACKGROUND_RESKIN_EMPHASIS(bg)}${stripBlock}

${ONLY_VARY_BLOCK}

TARGET COLOR + MATERIAL (this is a color/material descriptor only — it does NOT add decorations):
${themeHint}${getBgContextBlock(hasBackgroundRef, false)}${getRefinementBlock(refinementLevel)}${getAtmosphereBlock(temperature, age)}

${FINAL_REMINDER}

${RESKIN_FINAL_CHECK(bg)}`;
};

// ─── 아틀라스(디자인 시스템) 변형 프롬프트 ───────────────────────────────────
// atlasSpec: PromotionArchive 의 공통 템플릿 분석에서 추출한 마스터 명세(마크다운).
// 있으면 ATLAS STRUCTURE SPEC 블록으로 주입 — 모델에게 보존해야 할 구조를 텍스트로도 명시.
export const buildAtlasVariationPrompt = ({ themeHint, hasBackgroundRef, refinementLevel, atlasSpec, temperature, age, bg }) => {
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

${BACKGROUND_BLOCK(bg)}

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

export const buildCompactVariationPrompt = ({ themeHint, refinementLevel, temperature, age, stripAmbientLight, bg }) => {
  const extras = compactExtras(refinementLevel, temperature, age);
  const b = resolveBg(bg);
  const bgRule = b.id === 'black' ? 'pure black #000000' : `a flat uniform ${b.label} ${b.hex}`;
  return `Recolor and retexture the attached UI asset (button, frame, icon, badge, etc.) IN PLACE. Keep the exact same shapes, outlines, layout, proportions, and number of elements — change ONLY color, material, and surface finish.
Remove any embedded text/label and leave that central area as a clean EMPTY space in the new material (do NOT redraw, keep, or replace the text). Keep the frame/border the SAME thickness as the source — do NOT thicken it (when unsure, err thinner).
Keep every edge plain: do NOT add any new ornament, inner/companion line, double-lining, beading, studs, engraving, or glint near borders, lines, or dividers — each line stays one stroke as in the source, only recolored. When unsure near an edge, leave it plain.
New color + material: ${themeHint}
${extras ? `${extras}\n` : ''}${stripAmbientLight ? `${COMPACT_STRIP_HINT}\n` : ''}Rules: background MUST be ${bgRule} even if the source has a different background; do NOT add, resize, or rearrange any decoration; do NOT enlarge the frame; match the source's detail level, do not exceed it.`;
};

export const buildCompactAtlasVariationPrompt = ({ themeHint, refinementLevel, temperature, age, bg }) => {
  const extras = compactExtras(refinementLevel, temperature, age);
  const b = resolveBg(bg);
  const bgRule = b.id === 'black' ? 'pure black #000000' : `a flat uniform ${b.label} ${b.hex}`;
  return `The attached image is a UI kit / design-system sheet containing multiple separate elements (buttons, frames, panels, badges, dividers, etc.). Recolor and retexture EVERY element IN PLACE with ONE unified theme. Keep each element's exact shape, position, size, outline, embedded text, and the total element count — change ONLY color, material, and surface finish, consistently across all elements.
New color + material: ${themeHint}
${extras ? `${extras}\n` : ''}Rules: background must be ${bgRule}; do NOT add, remove, resize, or rearrange any element or decoration; do NOT redraw or alter any text; keep one consistent light direction across the whole sheet.`;
};

// ─── 세부 에셋 디자인 대안 프롬프트 ('변형 생성' 탭) ─────────────────────────
// recolor 빌더와 정반대 철학: 구조 락(COUNT_MATCH/SIZE_LOCK)을 풀고, 같은 컴포넌트
// 정체성·기능만 유지한 채 형태·장식·비율·구성을 적극 변주한다. directionBlock 이 이번
// 대안이 밀어붙일 방향, strengthBlock 이 원본에서 멀어지는 정도.
// 리디자인 — 모티프 변주는 허용하되, 사용자 불만(테두리/라인 근처가 과함)을 막기 위해
// "구조선(테두리·라인·디바이더) 근처는 최소 변경, 표현은 내부 필드에서" 를 강제.
const EDGE_LINE_RESTRAINT_REDESIGN = `EDGE & LINE RESTRAINT (HIGHEST PRIORITY — keep borders and lines a minimal edit):
- Confine the redesign to the broad INTERIOR field and the central motif. Do NOT pile new detail onto the structural lines themselves: borders, frames, rims, outlines, dividers, and separators stay as SIMPLE and CLEAN as the source.
- Banned near any edge or line: a new inner border, a second / companion / parallel line, double-lining, piping, beading, dotted studs, rivets, bolts, notches, grooves, knurling, extra engraving, corner flourishes, edge glints, or glow / highlight strips. One line stays ONE line at the source thickness.
- Keep the band of space immediately next to every edge and line as quiet and uncluttered as the source. If the source edge is a plain line, the output edge stays a plain line.
- Treat all structural lines as a near-minimal edit: expressive change lives in the interior motif and material, NEVER in busier, heavier, or more-decorated edges. When unsure near an edge, leave it plain — UNDER-decorate.`;

const DESIGN_TEXT_RULE = `TEXT REMOVAL — LEAVE THE TEXT AREA EMPTY: If the reference contains embedded text or a label (e.g. a button caption), REMOVE it in the output. Do NOT redraw, re-render, translate, keep, or replace it with new glyphs, placeholder words, symbols, numbers, or icons. Leave the central text-safe area as a clean, EMPTY surface in the redesigned material — the same reserved zone, just blank, ready for a designer to add their own text later. Keep the asset's surface, frame, and decorations intact around that empty zone; the empty area must read as intentional negative space, not a smeared or damaged patch. (Assets that have no text — frames, ornaments, badges — are unaffected by this rule.)`;

export const buildDesignAlternativePrompt = ({ directionBlock, strengthBlock, hasBackgroundRef, stripAmbientLight, bg }) => {
  const refLabel = hasBackgroundRef
    ? 'TWO reference images are provided. The FIRST is the source detail asset to redesign. The SECOND is the destination background environment.'
    : 'Reference image is provided as the first input — it is the source detail asset to redesign.';

  const stripBlock = stripAmbientLight ? `\n\n${STRIP_AMBIENT_LIGHT_BLOCK}\n` : '';
  const b = resolveBg(bg);
  const bgName = b.id === 'black' ? 'pure solid black #000000 / RGB(0,0,0)' : `a flat uniform ${b.label} ${b.hex}`;
  const bgHeading = b.id === 'black' ? 'PURE BLACK' : `SOLID ${b.label.toUpperCase()} (${b.hex})`;
  const bgChromaNote = b.chroma ? ' (a chroma-key backdrop for clean removal — the asset itself must NOT contain this exact color)' : '';
  const designBgBlock = `BACKGROUND — ${bgHeading}, HIGHEST PRIORITY (frequent failure — do NOT get this wrong):
- The background MUST be ${bgName}, uniform edge-to-edge${bgChromaNote} — mandatory regardless of the design direction, material, or genre.
- NEVER place the asset on a card, paper, sheet, panel, podium, table, or product-shot backdrop — even if the new design reads "clean", "modern", "minimal", "flat", or "studio". The backdrop is ONE flat solid color only.
- Whatever backdrop the source asset sits on, REPLACE it with ${bgName} and keep ONLY the asset.`;

  return `${refLabel}

Generate a DESIGN ALTERNATIVE of the reference detail asset — a fresh REDESIGN of the SAME game-UI component, keeping the SAME structural proportions but changing the design language. Think of it as the same frame/button/badge redrawn by a different artist who kept the same blueprint: the motif, ornament style, material, and detailing change — the size, thickness, and footprint do NOT.

IDENTITY ANCHORS (must stay true to the reference):
- The component type / function / role — a button stays a button, a frame stays a frame, a badge stays a badge, an ornament stays an ornament; do NOT turn it into a different kind of asset
- A SINGLE, centered, isolated asset — same subject, not a scene, not a collection

${designBgBlock}

BORDER & LINE-WEIGHT LOCK (HIGHEST PRIORITY — overrides EVERY variation direction and strength below):
- Visually trace the source's outer frame / border and reproduce the SAME stroke WIDTH and THICKNESS — do NOT thicken, bulk up, fatten, or inflate the frame or border. If the source border is slim and delicate, the result MUST stay slim and delicate.
- Ornament, filigree, and engraving LINE WEIGHT and relief / bevel / emboss depth stay at the source level — you may change the MOTIF and pattern, but the strokes must stay as THIN and FINE as the source; do NOT make ornaments chunkier, bolder, heavier, thicker, or more raised
- The overall visual HEAVINESS / weight of the piece matches the source — match how much "ink" and metal mass the source uses; a light, airy source yields a light, airy result
- This lock is absolute: when a direction says "richer" or "more ornate", it means a more intricate FINE pattern in the same thin line weight — NEVER thicker or heavier strokes
- WHEN IN DOUBT, ERR THINNER: if the source stroke width is hard to judge, render the border and all ornament strokes SLIGHTLY THINNER and finer rather than thicker. A too-slim result is acceptable; a thickened, chunky frame is a failure.

${EDGE_LINE_RESTRAINT_REDESIGN}

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
- The INTERIOR decorative MOTIF and pattern — the look of the carving / filigree / inlay in the FIELD away from the edges, NOT its line weight or size, and NOT added onto the border lines themselves
- Fine shape detail within a similar silhouette, the SAME border thickness, and the SAME aspect ratio — but keep edges and lines as plain as the source (see EDGE & LINE RESTRAINT)
- Color, material, and surface finish
- Internal arrangement and focal-accent styling in the interior field

EFFECTS — KEEP RESTRAINED (do NOT overdo borders or finishing effects):
- Match the source's level of glow, bloom, drop shadow, rim light, sparkle, and particle effects — do NOT add new or stronger effects than the source has. A clean source stays clean.
- No heavy outer glow, no large drop shadow, no halo, no lens flare, no floating particles or sparkles around the asset — subtle, contained finishing only.${stripBlock}

VARIATION DIRECTION (the primary axis to explore for THIS alternative):
${directionBlock || 'Explore a tasteful, distinct redesign of the motif, detail, and material.'}

${strengthBlock || 'VARIATION STRENGTH: subtle — stay close to the reference; gentle redesign only.'}

${DESIGN_TEXT_RULE}

ISOLATION (critical — overrides any direction that hints at a scene):
- ONE single asset, centered on the flat ${b.label} (${b.hex}) backdrop — absolutely NO environment, NO background scenery, NO floor / wall / pillars / landscape / props, NO scene, NO duplicate copies. If a direction mentions composition or proportion, it refers ONLY to the asset's own internal layout, never to building a scene around it.

${BACKGROUND_BLOCK(bg)}${getBgContextBlock(hasBackgroundRef, false)}

FINAL: Output ONE single redesigned detail asset on ${bgName} background (one flat solid color, no scene), centered and isolated — same component type, a border / frame stroke NO THICKER than the reference (slimmer is fine), the same thin fine ornament line weight, same ornament scale, same aspect ratio as the reference, EVERY edge / border / line kept as plain as the source with NO added inner line, beading, or edge ornament (expressive change only in the interior field), restrained finishing effects (no added glow / shadow / particles), the central text area left EMPTY (any source text removed, not replaced), but a distinct, finely-detailed and precise interior motif and material.`;
};

// 외부 챗 붙여넣기용 컴팩트 디자인 대안 프롬프트.
export const buildCompactDesignAlternativePrompt = ({ directionHint, strengthHint, stripAmbientLight, bg }) => {
  const b = resolveBg(bg);
  const bgRule = b.id === 'black' ? 'pure black #000000' : `a flat uniform ${b.label} ${b.hex}`;
  return `Redesign the attached game-UI detail asset into a DESIGN ALTERNATIVE — same component type and purpose (a button stays a button, a frame stays a frame), as a single centered asset isolated on ${bgRule}. Change the design language (motif, pattern, material, internal arrangement), but KEEP the structure close to the source: trace and reproduce the SAME border/frame stroke thickness, the SAME thin ornament line weight (do NOT make ornaments thicker, bolder, or more raised), the same ornament size/scale (don't enlarge), and the same aspect ratio and footprint. "Richer" means a finer, more intricate pattern at the same thin line weight, never heavier strokes. If unsure of the source stroke width, err THINNER. Aim for a refined, precise, finely-detailed result — never thick, chunky, or bulky. Keep every edge/border/line a minimal edit: do NOT add any new inner/companion line, double-lining, beading, studs, grooves, edge engraving, corner flourish, or glint near borders, lines, or dividers — vary the INTERIOR motif/material only, not the structural lines (under-decorate near edges when unsure). The background MUST be ${bgRule} even if the new design reads clean/minimal — one flat solid color, never a card or product-shot backdrop. Keep effects restrained: match the source's glow/shadow/particles, do NOT add new or stronger ones. NO background scene, NO environment.
${directionHint ? `Direction: ${directionHint}\n` : ''}${strengthHint ? `Strength: ${strengthHint}\n` : ''}${stripAmbientLight ? `${COMPACT_STRIP_HINT}\n` : ''}If the source has embedded text/label, REMOVE it and leave that central area empty — do NOT redraw or replace it (assets without text are unaffected). Output one single redesigned asset only.`;
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
    stripAmbientLight: options.stripAmbientLight,
    bg: options.bg,
  });
  // 외부 챗 붙여넣기용 — API 실패 시에도 복사할 수 있게 항상 동봉.
  const compactPrompt = buildCompactVariationPrompt({
    themeHint,
    refinementLevel: options.refinementLevel,
    temperature: options.temperature,
    age: options.age,
    stripAmbientLight: options.stripAmbientLight,
    bg: options.bg,
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
    stripAmbientLight: options.stripAmbientLight,
    bg: options.bg,
  });
  const compactPrompt = buildCompactDesignAlternativePrompt({
    directionHint: options.directionHint,
    strengthHint: options.strengthHint,
    stripAmbientLight: options.stripAmbientLight,
    bg: options.bg,
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
    bg: options.bg,
  });
  const compactPrompt = buildCompactAtlasVariationPrompt({
    themeHint,
    refinementLevel: options.refinementLevel,
    temperature: options.temperature,
    age: options.age,
    bg: options.bg,
  });

  try {
    const result = await renderWithImagen(prompt, modelId, refs, { imageSize: options.imageSize });
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt, compactPrompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt, compactPrompt };
  }
}

// ─── 검은 배경 → 알파 추출 (기존 동일) ────────────────────────────────────────
// 어두운 픽셀(밝기 ≤ threshold)을 투명으로, 경계는 featherRange 로 부드럽게.
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

// 헥스 → [r,g,b].
function hexToRgb(hex) {
  const h = (hex || '#000000').replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

// ─── 임의 단색 배경 → 알파 추출 ────────────────────────────────────────────────
// 선택한 생성 배경색(블랙/화이트/그레이/크로마)을 키아웃. 블랙이면 blackToTransparentPng 와 동일 동작.
// targetHex 와의 색거리(distance)가 threshold 이하면 투명, featherRange 까지 선형 페더.
export function colorToTransparentPng(dataUrl, targetHex = '#000000', threshold = 28, featherRange = 60) {
  // 블랙은 밝기 기반(소프트 글로우 보존에 유리)으로 위임.
  if ((targetHex || '#000000').toLowerCase() === '#000000') {
    return blackToTransparentPng(dataUrl);
  }
  return new Promise((resolve, reject) => {
    if (!dataUrl) { reject(new Error('이미지 데이터가 없습니다.')); return; }
    const [tr, tg, tb] = hexToRgb(targetHex);
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
          const dr = px[i] - tr, dg = px[i + 1] - tg, db = px[i + 2] - tb;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist <= threshold) {
            px[i + 3] = 0;
          } else if (dist < threshold + featherRange) {
            px[i + 3] = Math.round(((dist - threshold) / featherRange) * 255);
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
