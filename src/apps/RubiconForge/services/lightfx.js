// 광원·빛효과(Light FX) 생성 오케스트레이션.
//   renderLightFx(spec) → { ok, dataUrl, modelId, prompt, compactPrompt } | { ok:false, error, ... }
//
// 핵심: 순흑(#000000) 배경 위에 "발광 효과만" 렌더한다. 오브젝트/UI/텍스트/장면 없음.
// 검은 배경이라 (1) screen/add 블렌드로 그대로 합성하거나 (2) blackToTransparentPng 로 알파 추출
// 둘 다 가능 — 변형 모드 결과와 동일한 파이프라인(투명 PNG 버튼)을 그대로 재사용한다.

import { renderWithImagen } from '../../../lib/imagenRender';
import { LIGHTFX_CATEGORY_BY_ID, LIGHTFX_STYLE_BY_ID, LIGHTFX_COLOR_BY_ID } from '../constants/lightfx';
import { DEFAULT_BG } from '../constants/variations';

const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';

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

const REF_SHAPE_BLOCK = `SHAPING REFERENCE (a reference image is attached): use it ONLY to shape and place the light — let the glow, halo, rays, or particles wrap, backlight, or emanate around the silhouette/position of the referenced subject. Do NOT draw, trace, recolor, or reproduce the referenced object itself — the OUTPUT contains light ONLY, on pure black. The reference is a placement guide that must not appear in the result.`;

export function buildLightFxPrompt({ categoryHint, styleHint, colorHint, userText, hasRef, index = 0, bg }) {
  const b = resolveBg(bg);
  const subject = userText && userText.trim() ? userText.trim() : categoryHint;
  const bgName = b.id === 'black' ? 'pure black #000000' : `a flat uniform ${b.label} (${b.hex})`;
  return `Create a single isolated LIGHT / GLOW EFFECT asset on ${bgName} background.

EFFECT: ${categoryHint}.
${userText && userText.trim() ? `SPECIFIC REQUEST: ${userText.trim()}.` : ''}
LIGHT QUALITY / STYLE: ${styleHint}.
LIGHT COLOR: ${colorHint}. Keep the palette coherent around this color (subtle complementary accents are fine).
${hasRef ? `\n${REF_SHAPE_BLOCK}\n` : ''}
${lightFxBackgroundBlock(bg)}

COMPOSITION: center the effect with breathing room; balanced, production-ready, clean. This is variation #${index + 1} — make its motion/arrangement visibly distinct from other variations while keeping the same effect type, style, and color.

FINAL: output ONE light effect (${subject}) glowing on ${bgName} — light only, no object, no text, no scene.`;
}

// 외부 Gemini / AI Studio 챗 붙여넣기용 컴팩트 버전.
export function buildCompactLightFxPrompt({ categoryHint, styleHint, colorHint, userText, bg }) {
  const b = resolveBg(bg);
  const bgName = b.id === 'black' ? 'pure black #000000' : `a flat uniform ${b.label} (${b.hex})`;
  const tail = b.id === 'black'
    ? 'Bright luminous core with smooth falloff to true black; do NOT add any backdrop card, gray panel, vignette, or UI — only the glow on pure black.'
    : `Bright luminous core with smooth glow falloff; the empty area stays a single flat ${b.label} (${b.hex}) — do NOT add any second backdrop card, vignette, gradient, or UI.`;
  return `Generate a single isolated LIGHT / GLOW EFFECT on ${bgName} background — light only, NO object, NO text, NO scene (a compositable light asset for background removal / keying).
Effect: ${userText && userText.trim() ? userText.trim() : categoryHint}.
Style: ${styleHint}. Color: ${colorHint}.
${tail}`;
}

export async function renderLightFx(spec = {}) {
  const cat = LIGHTFX_CATEGORY_BY_ID[spec.category];
  const style = LIGHTFX_STYLE_BY_ID[spec.style];
  const color = LIGHTFX_COLOR_BY_ID[spec.color];
  if (!cat || !style || !color) return { ok: false, error: '빛효과 옵션이 올바르지 않습니다.', prompt: null, compactPrompt: null };

  const modelId = spec.modelId || DEFAULT_MODEL;
  const ref = spec.referenceDataUrl || null;
  const refs = ref ? [ref] : [];

  const prompt = buildLightFxPrompt({
    categoryHint: cat.promptHint,
    styleHint: style.hint,
    colorHint: color.hint,
    userText: spec.userText,
    hasRef: !!ref,
    index: spec.index || 0,
    bg: spec.bg,
  });
  const compactPrompt = buildCompactLightFxPrompt({
    categoryHint: cat.promptHint,
    styleHint: style.hint,
    colorHint: color.hint,
    userText: spec.userText,
    bg: spec.bg,
  });

  try {
    // 레퍼런스가 없으면 카테고리 기본 비율을 명시(없으면 1:1). 있으면 renderWithImagen 이 자동 감지.
    const options = { imageSize: spec.imageSize };
    if (!ref) options.aspectRatio = cat.ratio || '1:1';
    const result = await renderWithImagen(prompt, modelId, refs.length ? refs : null, options);
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt, compactPrompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt, compactPrompt };
  }
}
