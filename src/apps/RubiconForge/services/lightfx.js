// 광원·빛효과(Light FX) 생성 오케스트레이션.
//   renderLightFx(spec) → { ok, dataUrl, modelId, prompt, compactPrompt } | { ok:false, error, ... }
//
// 핵심: 순흑(#000000) 배경 위에 "발광 효과만" 렌더한다. 오브젝트/UI/텍스트/장면 없음.
// 검은 배경이라 (1) screen/add 블렌드로 그대로 합성하거나 (2) blackToTransparentPng 로 알파 추출
// 둘 다 가능 — 변형 모드 결과와 동일한 파이프라인(투명 PNG 버튼)을 그대로 재사용한다.

import { renderWithImagen } from '../../../lib/imagenRender';
import { maskLightToBaseFootprint } from '../../../lib/lightAlphaTransform';
import { LIGHTFX_CATEGORY_BY_ID, LIGHTFX_STYLE_BY_ID, LIGHTFX_COLOR_BY_ID, LIGHTFX_FORM_BY_ID, LIGHTFX_MATERIAL_BY_ID, LIGHTFX_GRAIN_BY_ID, LIGHTFX_BOKEH_BY_ID } from '../constants/lightfx';
import { DEFAULT_BG } from '../constants/variations';

const DEFAULT_MODEL = 'gemini-3-pro-image-preview';

const resolveBg = (bg) => bg || DEFAULT_BG;

// 모든 라이트 에셋이 공유하는 절대 규칙 — 선택한 단색 배경 위 합성용 발광 에셋.
const lightFxBackgroundBlock = (bg) => {
  const b = resolveBg(bg);
  if (b.id === 'black') {
    return `MANDATORY OUTPUT RULES — non-negotiable (this is a COMPOSITABLE LIGHT ASSET, not a scene):
- The background MUST be PURE jet-black RGB(0,0,0), perfectly solid and uniform edge-to-edge. The ONLY non-black pixels are the glowing light itself.
- Render ONLY the luminous light effect — NO object, NO character, NO UI element, NO button, NO frame, NO icon, NO product, NO text, NO logo, NO scenery, NO floor or wall or horizon.
- The light must read as additive emission on black so it can be screen-blended / alpha-keyed over other artwork. Bright luminous core, smooth falloff into true black. Do NOT add a colored or gray backdrop, vignette card, or gradient panel.
- High dynamic range: hot bright core, rich mid glow, clean fade to #000000.`;
  }
  const chromaLine = b.chroma
    ? ` This is a chroma-key backdrop chosen for clean background removal — keep the ${b.label} perfectly flat and uniform so the light can be cut out.`
    : '';
  return `MANDATORY OUTPUT RULES — non-negotiable (this is a COMPOSITABLE LIGHT ASSET, not a scene):
- The background MUST be a PERFECTLY FLAT, SOLID, UNIFORM ${b.label} fill at exactly ${b.hex}, edge-to-edge. The light effect sits on top of this flat backdrop.${chromaLine}
- Render ONLY the luminous light effect on the flat ${b.label} — NO object, NO character, NO UI element, NO button, NO frame, NO icon, NO product, NO text, NO logo, NO scenery, NO floor or wall or horizon.
- Do NOT add any gradient, vignette, second backdrop card, or texture to the background — just the single flat ${b.label} color with the glowing light over it.
- Bright luminous core with smooth glow falloff; the surrounding empty area stays the flat uniform ${b.label} (${b.hex}).`;
};

const REF_SHAPE_BLOCK = `SHAPING REFERENCE (a reference image is attached): use it ONLY to shape and place the light — let the glow, halo, rays, or particles wrap, backlight, or emanate around the silhouette/position of the referenced subject. Do NOT draw, trace, recolor, or reproduce the referenced object itself — the OUTPUT contains light ONLY, on pure black. The reference is a placement guide that must not appear in the result.
CRITICAL — NO REPRODUCED OBJECTS: absolutely do NOT redraw, copy, or reconstruct any object from the reference — no orb, gem, crystal, emblem, medallion, jewel, badge, character, face, cloth, armor or any recognizable item. Bright or detailed areas inside the reference (a glowing orb, crystal, emblem, etc.) must NOT be reproduced as an object; instead replace each such focal point with a pure abstract GLOW — a soft luminous bloom at that position with no internal structure, facets, shapes or details. The final image is emitted light only on black, containing zero solid objects.`;

// 참조가 있을 때(형태 밀착 모드) — 외곽선/형태에 "밀착"된 절제된 디테일 이펙트. 전체를 채우지 않음.
const REF_DETAIL_BLOCK = `EDGE-HUGGING DETAIL (refined & restrained): concentrate the light TIGHTLY along the OUTER CONTOUR and key silhouette edges of the reference — a crisp thin rim/edge light that traces the outline, with a few small tasteful sparkle glints and short delicate filament rays only at corners and tips. Keep the interior and the surrounding area almost entirely dark/empty — the effect must NOT flood, fill, or wash over the whole frame. Prioritize a clean sharp edge trace over volume. Aim for premium, understated elegance: sparse, precise, high-craft accents — NOT a dense energetic explosion. Most of the canvas stays true black; the light is a fine luminous outline plus a handful of restrained highlights.`;

// 뒤쪽/배경 모드 — 피사체 뒤로 들어가는 효과. 실루엣을 따라가지 않고, 외곽선/라인을 만들지 않는다.
const REF_BEHIND_BLOCK = `BEHIND / BACKDROP MODE — DO NOT TRACE THE SHAPE: the reference only shows WHERE the subject sits. Render the light as a free-form glow sitting BEHIND and around that position, as if backlighting the subject from behind. ★Do NOT trace, outline, rim-light, or reproduce the reference's silhouette, edges, or contour lines.★ There must be NO line art, NO edge outline of the subject, NO shape-following stroke — just a soft volumetric glow / rays / particles behind the subject's location, spreading naturally. The subject's outline must NEVER appear as a bright line in the result.`;

// 배치 형태(placement) 블록 — 빛이 피사체에 대해 어디에 놓이는지. 형태 참고가 있으면 그 위치에 앵커.
// edgeHug=true(외곽 감싸기 폼)만 실루엣에 밀착; 그 외(뒤쪽/바닥/자유)는 위치 참조만 하고 형태는 안 따름.
const placementBlock = (formHint, hasRef, edgeHug) => {
  if (!formHint) return '';
  if (!hasRef) return `PLACEMENT / FORM: ${formHint}.`;
  return `PLACEMENT / FORM: ${formHint}. ${edgeHug
    ? 'Anchor this placement to the ATTACHED reference silhouette — the light wraps/backlights that exact shape, but the reference object itself never appears (light only).'
    : 'Use the ATTACHED reference ONLY to know where the subject is positioned — place the glow behind/around that position WITHOUT tracing or outlining its shape.'}`;
};

const INTENSITY_HINT = { subtle: 'low intensity, restrained bloom, soft narrow falloff', medium: 'balanced medium intensity with a clear luminous core', strong: 'strong high-energy emission with a hot core, while preserving clean edges and breathing room' };
// 참조(형태 밀착) 모드 전용 — 같은 강도라도 "외곽 디테일" 기준으로 한 단계 절제하고 커버리지를 제한.
const INTENSITY_HINT_REF = {
  subtle: 'very low intensity — a whisper-thin edge glow with only 1-2 tiny glints; the canvas stays almost fully black',
  medium: 'restrained intensity — a crisp fine edge trace with a few small tasteful highlights; do not fill the interior or background',
  strong: 'confident but controlled — a bright clean edge light and slightly bolder tip rays, yet still sparse and edge-bound, never flooding the frame',
};
const SHAPE_HINT = {
  none: '',
  square: 'arrange the entire light effect to form and follow a clean centered SQUARE outline — the luminous energy traces the four edges of a square, hollow darker center',
  circle: 'arrange the entire light effect to form and follow a clean centered CIRCLE / RING outline — the luminous energy traces the circular perimeter, brightest along the ring edge with a hollow darker center (do NOT fill the disc)',
  rectangle: 'arrange the entire light effect to form and follow a wide centered horizontal RECTANGLE outline — the luminous energy traces the rectangle edges, hollow darker center',
};

export function buildLightFxPrompt({ categoryHint, styleHint, colorHint, userText, hasRef, formHint, intensity = 'medium', shape = 'none', index = 0, bg, materialHint = '', grainHint = '', bokehHint = '', edgeHug = false }) {
  const b = resolveBg(bg);
  const subject = userText && userText.trim() ? userText.trim() : categoryHint;
  const bgName = b.id === 'black' ? 'pure black #000000' : `a flat uniform ${b.label} (${b.hex})`;
  // 형태 밀착(hugging)은 외곽 감싸기 폼 + 참조가 함께 있을 때만. 뒤쪽/바닥/자유 폼은 형태를 안 따름.
  const hugging = !!(hasRef && edgeHug);
  const place = placementBlock(formHint, hasRef, edgeHug);
  return `Create a single isolated LIGHT / GLOW EFFECT asset on ${bgName} background.

EFFECT: ${categoryHint}.
${userText && userText.trim() ? `SPECIFIC REQUEST: ${userText.trim()}.` : ''}
LIGHT QUALITY / STYLE: ${styleHint}.
LIGHT COLOR: ${colorHint}. Keep the palette coherent around this color (subtle complementary accents are fine). This chosen color OVERRIDES any color present in the reference image — ignore the reference's own colors and render the glow in this selected color.
INTENSITY: ${(hugging ? INTENSITY_HINT_REF : INTENSITY_HINT)[intensity] || (hugging ? INTENSITY_HINT_REF : INTENSITY_HINT).medium}.
${materialHint ? `MATERIAL / SURFACE: ${materialHint}. Apply this as the light's material and internal surface texture WITHIN its existing shape and placement — do NOT reshape the overall silhouette or turn it into that object; it stays the same light effect, just with this material feel. Still light-only emission, never a solid object or scene.\n` : ''}${grainHint ? `${grainHint}.\n` : ''}${bokehHint ? `${bokehHint}.\n` : ''}${SHAPE_HINT[shape] ? `OVERALL SHAPE (important): ${SHAPE_HINT[shape]}. The overall silhouette of the whole effect MUST clearly read as this shape. The guide outline itself must not be drawn — render light only.\n` : ''}
${place ? `${place}\n` : ''}${hasRef ? `\n${REF_SHAPE_BLOCK}\n${hugging ? REF_DETAIL_BLOCK : REF_BEHIND_BLOCK}\n` : ''}
${lightFxBackgroundBlock(bg)}

COMPOSITION: center the effect with breathing room; balanced, production-ready, clean. This is variation #${index + 1} — vary the arrangement of the accents versus other variations${hugging ? ' (without adding more light or filling more of the frame — keep every variation sparse and edge-bound)' : ', make its motion/arrangement visibly distinct'} while keeping the same effect type, style, and color.

FINAL: output ONE light effect (${subject}) glowing on ${bgName} — light only, no object, no text, no scene. Any orb/gem/crystal/emblem from the reference becomes a pure abstract glow, never a rendered object.`;
}

// 외부 Gemini / AI Studio 챗 붙여넣기용 컴팩트 버전.
export function buildCompactLightFxPrompt({ categoryHint, styleHint, colorHint, userText, formHint, intensity = 'medium', shape = 'none', bg, hasRef = false, materialHint = '', grainHint = '', bokehHint = '', edgeHug = false }) {
  const hugging = !!(hasRef && edgeHug);
  const b = resolveBg(bg);
  const bgName = b.id === 'black' ? 'pure black #000000' : `a flat uniform ${b.label} (${b.hex})`;
  const tail = b.id === 'black'
    ? 'Bright luminous core with smooth falloff to true black; do NOT add any backdrop card, gray panel, vignette, or UI — only the glow on pure black.'
    : `Bright luminous core with smooth glow falloff; the empty area stays a single flat ${b.label} (${b.hex}) — do NOT add any second backdrop card, vignette, gradient, or UI.`;
  return `Generate a single isolated LIGHT / GLOW EFFECT on ${bgName} background — light only, NO object, NO text, NO scene (a compositable light asset for background removal / keying).
Effect: ${userText && userText.trim() ? userText.trim() : categoryHint}.
Style: ${styleHint}. Color: ${colorHint}. Intensity: ${(hugging ? INTENSITY_HINT_REF : INTENSITY_HINT)[intensity] || (hugging ? INTENSITY_HINT_REF : INTENSITY_HINT).medium}.${materialHint ? `\nMaterial: ${materialHint} — surface texture within the same shape (still light-only, no object).` : ''}${grainHint ? `\n${grainHint}.` : ''}${bokehHint ? `\n${bokehHint}.` : ''}${SHAPE_HINT[shape] ? `\nOverall shape (important): ${SHAPE_HINT[shape]}; the whole effect must read as this shape, but do not draw the guide outline itself.` : ''}${formHint ? `\nPlacement: ${formHint}.` : ''}${hasRef ? (hugging
    ? `\nEDGE-HUGGING & RESTRAINED: hug the outer contour of the reference with a crisp thin rim light plus a few small tasteful glints at corners/tips; keep the interior and background almost fully dark — do NOT flood or fill the frame. Premium, sparse, understated.`
    : `\nBEHIND / BACKDROP — DO NOT TRACE THE SHAPE: use the reference only to know where the subject sits; render a free-form glow behind/around that position. Do NOT trace, outline, or rim-light the silhouette — no edge line of the subject, no shape-following stroke.`)
+ `\nNO REPRODUCED OBJECTS: never redraw any orb, gem, crystal, emblem or item from the reference — replace each bright focal point with a pure abstract glow (no internal shapes), rendered in the chosen color which overrides the reference's own colors.` : ''}
${tail}`;
}

// 변형 모드 프롬프트 — 첨부된 기존 발광 에셋(base)의 "방식"(효과 종류·전체 형태·배치·흐름)만
// 유지하고, 디테일은 처음부터 새로 고품질로 리드로우한다. base 를 픽셀 단위로 베끼지 않는다:
// 레퍼런스가 흐리거나 저해상·노이즈여도 결과는 선명하고 정교한 새 광원이어야 한다.
// (형태 참고 REF_SHAPE_BLOCK 은 실루엣만 참고·오브젝트 금지 — 여기서는 base 자체가 "빛"이다.)
const buildLightFxTransformPrompt = ({ styleHint, colorHint, userText, intensity = 'medium', bg, materialHint = '', grainHint = '', bokehHint = '', index = 0 }) => {
  const b = resolveBg(bg);
  const bgName = b.id === 'black' ? 'pure black #000000' : `a flat uniform ${b.label} (${b.hex})`;
  return `REDRAW a light effect, using the attached image as a MANNER / LAYOUT guide. The attached image IS a previously-made glowing light asset on ${bgName} — it is the light itself, NOT a silhouette or object to trace.

KEEP THE MANNER (only this): the same EFFECT TYPE, the same overall FORM, the same general PLACEMENT / composition and the same directional FLOW as the reference — so it drops into the same spot when composited. Roughly match where the light lives and which way it radiates.

REDRAW EVERYTHING ELSE FROM SCRATCH — high quality, fresh detail: do NOT copy, trace, or reproduce the reference's pixels. The reference may be LOW QUALITY (blurry, soft, noisy, pixelated, low-resolution, compressed, muddy) — you MUST NOT inherit any of that. Generate the light ANEW as a razor-sharp, high-definition, richly detailed hero asset.
DETAIL & CRISPNESS (critical — the reference lacks this): render fine, crisp, well-defined light structure — distinct luminous filaments and strands, clean sharp rim highlights, precise bright glints and fine sparkling particles, layered depth. High micro-contrast and high dynamic range: a genuinely bright hot core/edge separating cleanly to true black. AVOID a soft, blurry, hazy, murky, dull, low-contrast, muddy-brown smoky wash — that is exactly the low-quality look to escape. Crisp and luminous, not smoky and dim. Treat the reference only as a loose blueprint for the manner, never as texture to imitate.

STYLE OF THE NEW RENDER:
- COLOR: ${colorHint}. This chosen color OVERRIDES the reference's original color.
- QUALITY / STYLE: ${styleHint}.
- INTENSITY: ${INTENSITY_HINT[intensity] || INTENSITY_HINT.medium}.
${materialHint ? `- MATERIAL / SURFACE: ${materialHint}. Apply as surface texture within the same shape — do not reshape the silhouette.\n` : ''}${grainHint ? `- ${grainHint}.\n` : ''}${bokehHint ? `- ${bokehHint}.\n` : ''}${userText && userText.trim() ? `- ADDITIONAL DIRECTION: ${userText.trim()}.\n` : ''}
${lightFxBackgroundBlock(bg)}

This is variation #${index + 1} — same manner as the reference, but a distinct, freshly-rendered high-detail result. Output a clean new light effect — light only, no object, no text, no scene.`;
};

export async function renderLightFx(spec = {}) {
  const cat = LIGHTFX_CATEGORY_BY_ID[spec.category];
  const style = LIGHTFX_STYLE_BY_ID[spec.style];
  const color = LIGHTFX_COLOR_BY_ID[spec.color];
  if (!cat || !style || !color) return { ok: false, error: '빛효과 옵션이 올바르지 않습니다.', prompt: null, compactPrompt: null };

  const modelId = spec.modelId || DEFAULT_MODEL;
  // 변형 모드 — 이전 발광 에셋(base)을 참조로 리스킨. base 가 있으면 형태 참고(ref)보다 우선.
  const base = spec.baseDataUrl || null;
  const isTransform = !!base;
  const ref = isTransform ? base : (spec.referenceDataUrl || null);
  const refs = ref ? [ref] : [];
  const form = LIGHTFX_FORM_BY_ID[spec.form] || null; // 미지정/자유면 배치 힌트 없음
  const edgeHug = !!form?.edgeHug; // 외곽 감싸기 폼만 실루엣 밀착; 뒤쪽/바닥/자유는 형태 안 따름
  const materialHint = LIGHTFX_MATERIAL_BY_ID[spec.material]?.hint || '';
  const grainHint = LIGHTFX_GRAIN_BY_ID[spec.grain]?.hint || '';
  const bokehHint = LIGHTFX_BOKEH_BY_ID[spec.bokeh]?.hint || '';

  const prompt = isTransform
    ? buildLightFxTransformPrompt({
        styleHint: style.hint,
        colorHint: color.hint,
        userText: spec.userText,
        intensity: spec.intensity,
        bg: spec.bg,
        materialHint, grainHint, bokehHint,
        index: spec.index || 0,
      })
    : buildLightFxPrompt({
        categoryHint: cat.promptHint,
        styleHint: style.hint,
        colorHint: color.hint,
        userText: spec.userText,
        hasRef: !!ref,
        formHint: form?.placementHint || '',
        intensity: spec.intensity,
        shape: spec.shape,
        index: spec.index || 0,
        bg: spec.bg,
        materialHint, grainHint, bokehHint,
        edgeHug,
      });
  const compactPrompt = buildCompactLightFxPrompt({
    categoryHint: cat.promptHint,
    styleHint: style.hint,
    colorHint: color.hint,
    userText: spec.userText,
    formHint: form?.placementHint || '',
    intensity: spec.intensity,
    shape: spec.shape,
    bg: spec.bg,
    edgeHug,
    hasRef: !!ref,
    materialHint, grainHint, bokehHint,
  });

  try {
    // 레퍼런스가 없으면 카테고리 기본 비율을 명시(없으면 1:1). 있으면 renderWithImagen 이 자동 감지.
    const options = { imageSize: spec.imageSize };
    if (!ref) options.aspectRatio = cat.ratio || '1:1';
    const result = await renderWithImagen(prompt, modelId, refs.length ? refs : null, options);
    let dataUrl = result.dataUrl;
    // 알파값 유지 — 변형 모드에서 base 의 발광 footprint 를 강제로 고정(모델 정합 오차 보정).
    // 실패(taint 등) 시 프롬프트만으로 형태를 지킨 원본 결과로 폴백.
    if (isTransform && spec.preserveAlpha !== false && dataUrl) {
      const masked = await maskLightToBaseFootprint(dataUrl, base);
      if (masked) dataUrl = masked;
    }
    return { ok: true, dataUrl, modelId: result.modelId, prompt, compactPrompt, transformed: isTransform };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt, compactPrompt };
  }
}
