// 변형(베리에이션) 단일 호출 헬퍼.
//   - 원본 에셋의 실루엣·외곽선 두께·장식 크기·비율은 절대 유지
//   - 배경은 PURE BLACK (RGB 0,0,0) 강제 — 사용자가 알파 키잉으로 투명 PNG 추출 가능
//   - 배경 참고 이미지(backgroundRefDataUrl)가 있으면 컬러·형태가 그 배경과 어울리도록 조정
//     (단 배경은 여전히 PURE BLACK — 참고 이미지는 합성 컨텍스트로만 사용)

import { renderWithImagen } from '../../../lib/imagenRender';

// 변형 프롬프트 빌더 — 호출자가 실제 어떤 텍스트가 전송됐는지 다운받을 수 있도록 export.
export const buildVariationPrompt = ({ themeHint, hasBackgroundRef }) => {
  const refLabel = hasBackgroundRef
    ? 'TWO reference images are provided. The FIRST is the source asset to vary. The SECOND is the destination background environment.'
    : 'Reference image is provided as the first input.';

  const bgContextBlock = hasBackgroundRef ? `

COMPOSITING CONTEXT (second reference image — destination background):
A second reference image represents the destination background environment where this variation will later be placed. Use it ONLY to harmonize:
- Tune the asset's color palette so it visually complements that background's dominant hues and lighting temperature
- Adjust the decorative ornament style so it matches the cultural / era / mood of that background (modern, medieval, cute, etc.)
- Ensure the asset's outline material reads clearly when composited on that background style
- DO NOT copy any element from the background reference into the output — keep the asset isolated on PURE BLACK as mandated above
- DO NOT change the silhouette or composition of the first reference asset based on the background — only color and material harmony` : '';

  return `${refLabel} Produce one stylistic variation of the source asset (first image).

ABSOLUTE PRESERVATION RULES (must remain IDENTICAL to the first reference):
- The overall silhouette and outer shape outline
- The aspect ratio and canvas composition — do not crop, do not extend, do not change framing
- The thickness of the outer frame / outline / border stroke
- The component type (button / card / panel / badge) and overall layout
- The center text-safe zone and any embedded typography placement (do NOT add new text or change existing text)

DECORATION SIZE LOCK (HIGHEST PRIORITY — overrides every mood descriptor below):
- Corner ornaments, frame embellishments, edge filigree, and any decorative pieces MUST occupy the EXACT same bounding box and the SAME percentage of canvas area as in the source reference
- Measure each decorative element in the source and reproduce it at IDENTICAL pixel size — do NOT enlarge, inflate, expand, or scale up any ornament under any circumstances
- DO NOT add new decorative elements, new corner pieces, new floating particles, or new ornamental flourishes that aren't already present in the source
- DO NOT thicken or expand the corner decorations even if the target mood implies "ornate", "luxurious", "elaborate", "intricate", or "grand"
- Mood adjectives like "ornate" only affect material richness and surface detail texture — NEVER decoration size or count
- If the source has small subtle corner accents, the output must have small subtle corner accents — only the material and color may change
- Strong negative: NO oversized ornaments, NO inflated corner pieces, NO expanded frame decorations, NO added embellishments

MANDATORY BACKGROUND RULE — non-negotiable, overrides any reference background:
- The output background MUST be PURE jet-black RGB(0,0,0), perfectly solid, uniform, edge-to-edge
- Absolutely NO gradient, NO haze, NO ambient backlight, NO rim light spilling into the background
- NO atmospheric mist, NO soft halo, NO near-black gray — only true #000000
- The asset must be cleanly isolated for downstream alpha keying and transparent PNG extraction
- This rule applies even if the source or background reference shows a non-black background

ONLY VARY THE FOLLOWING on the asset itself:
- Dominant color palette and hue
- Material treatment, surface finish, and texture
- Decorative motif character (style and material only — STRICTLY NOT size, count, or position)
- Mood, lighting tone, and atmosphere on the asset surface

TARGET MOOD FOR THIS VARIATION (style descriptor — does NOT override the size lock above):
${themeHint}${bgContextBlock}

Output a single component image with the EXACT same proportions, outline thickness, and decoration sizes as the source asset, on pure RGB(0,0,0) jet-black background, ready for alpha extraction. High detail, 8k, masterpiece quality.`;
};

// ─── 아틀라스(디자인 시스템) 변형 프롬프트 ──────────────────────────────────
// 단일 에셋 변형과 결정적으로 다른 점:
//   1. 원본은 여러 sub-asset 이 한 캔버스에 배치된 시트/킷
//   2. 모든 sub-asset 이 동일한 새 테마를 공유해야 함 (한 UI 키트로 보이도록)
//   3. 그리드 자체(개수·위치·상대 크기)는 절대 변경 금지
//   4. 장식의 최소 수정으로 전체 테마 전환
export const buildAtlasVariationPrompt = ({ themeHint, hasBackgroundRef }) => {
  const refLabel = hasBackgroundRef
    ? 'TWO reference images are provided. The FIRST is the source DESIGN SYSTEM ATLAS to retheme. The SECOND is the destination background environment.'
    : 'Reference image is provided as the first input — it is a complete DESIGN SYSTEM ATLAS.';

  const bgContextBlock = hasBackgroundRef ? `

COMPOSITING CONTEXT (second reference image — destination background):
The atlas will be composited on a background visually similar to the second reference. Tune the unified palette and material of the atlas so the rethemed kit harmonizes with that background's hues and mood. DO NOT copy any element from the background reference — keep the atlas isolated on pure black.` : '';

  return `${refLabel}

The source image is a DESIGN SYSTEM ATLAS — a single canvas containing MULTIPLE distinct UI sub-assets (buttons, frames, panels, badges, dividers, corner decorations, etc.) arranged together in a fixed layout, similar to a sprite sheet or component kit for an entire page.

Produce ONE rethemed version of the entire atlas.

ATLAS PRESERVATION RULES (must remain IDENTICAL to the source):
- Before drawing, mentally inventory EVERY sub-asset visible in the source. The output must contain the EXACT same inventory — same count, same kinds, same order, same positions
- Atlas overall aspect ratio and canvas framing — do not crop, do not extend, do not change composition
- Every sub-asset's individual silhouette, outline shape, outline thickness, and corner radius
- Every sub-asset's position and relative size within the atlas grid — do NOT rearrange, scale, or relocate any sub-asset
- The grid/layout/spacing between sub-assets — do NOT pack tighter or spread wider
- All text labels and embedded typography (do NOT add new text or change existing text)

DECORATION SIZE LOCK (HIGHEST PRIORITY — overrides every mood descriptor below):
- Every corner ornament, frame embellishment, edge filigree, and decorative piece on EVERY sub-asset MUST occupy the EXACT same bounding box and percentage area as in the source
- Apply the MINIMUM possible modification to decoration shape — only material and color may change, NEVER size or count
- DO NOT enlarge, inflate, expand, or scale up any decoration on any sub-asset
- DO NOT add new decorative elements, sub-assets, or ornaments that aren't in the source
- DO NOT thicken or expand corner pieces even if the target mood implies "ornate", "luxurious", "elaborate", "intricate", "grand"
- Mood adjectives like "ornate" only affect material richness and surface detail — NEVER decoration size

CONSISTENCY REQUIREMENT (entire atlas must adopt the new theme COHERENTLY — single unified UI kit):
- EVERY sub-asset must share the SAME new color palette, the SAME new material treatment, the SAME new surface finish, and the SAME new accent color
- The button, frame, badge, panel, divider — they must all look like members of one unified UI kit under the new theme
- Do NOT theme different sub-assets with different palettes or materials — the whole atlas is ONE design system
- Highlights, gradients, and shadows must use a consistent light direction across all sub-assets

MANDATORY BACKGROUND RULE — non-negotiable:
- The background between and around all sub-assets MUST be PURE jet-black RGB(0,0,0), perfectly solid, uniform
- Absolutely NO gradient, NO haze, NO ambient backlight bleeding into the background
- Each sub-asset must remain cleanly isolated on the black canvas for alpha keying

ONLY VARY THE FOLLOWING — applied CONSISTENTLY to every sub-asset:
- Dominant color palette and hue
- Material treatment, surface finish, and texture
- Decorative motif character (style and material only — STRICTLY NOT size, count, or position)
- Lighting tone and atmosphere

TARGET MOOD FOR THIS RETHEME (style descriptor — does NOT override the size lock above):
${themeHint}${bgContextBlock}

Output: a redrawn atlas with EXACT same layout, EXACT same sub-asset count and positions, EXACT same decoration sizes, all sub-assets coherently sharing the new theme as one unified UI kit, on pure RGB(0,0,0) jet-black background. High detail, 8k, masterpiece quality.`;
};

// 아틀라스 단일 호출 — renderVariation 와 거의 동일하지만 buildAtlasVariationPrompt 사용.
export async function renderAtlasVariation(
  sourceDataUrl,
  themeHint,
  options = {}
) {
  if (!sourceDataUrl) return { ok: false, error: '원본 아틀라스가 없습니다.', prompt: null };
  if (!themeHint)     return { ok: false, error: '변형 테마 힌트가 없습니다.', prompt: null };

  const modelId = options.modelId || 'gemini-3.1-flash-image-preview';
  const backgroundRef = options.backgroundRefDataUrl || null;
  const refs = backgroundRef ? [sourceDataUrl, backgroundRef] : [sourceDataUrl];

  const prompt = buildAtlasVariationPrompt({ themeHint, hasBackgroundRef: !!backgroundRef });

  try {
    const result = await renderWithImagen(prompt, modelId, refs);
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt };
  }
}

// renderVariation: 원본 + (선택)배경참고 + 테마 hint → { ok, dataUrl, prompt, error }
// modelId 기본 Nano Banana 2 (빠르고 저렴) — 4개 병렬이라 빠른 모델이 UX 에 유리.
// prompt 는 실패 케이스에서도 반환 — 사용자가 어떤 입력으로 시도됐는지 다운받을 수 있도록.
export async function renderVariation(
  sourceDataUrl,
  themeHint,
  options = {}
) {
  if (!sourceDataUrl) return { ok: false, error: '원본 에셋이 없습니다.', prompt: null };
  if (!themeHint)     return { ok: false, error: '변형 테마 힌트가 없습니다.', prompt: null };

  const modelId = options.modelId || 'gemini-3.1-flash-image-preview';
  const backgroundRef = options.backgroundRefDataUrl || null;
  const refs = backgroundRef ? [sourceDataUrl, backgroundRef] : [sourceDataUrl];

  const prompt = buildVariationPrompt({ themeHint, hasBackgroundRef: !!backgroundRef });

  try {
    const result = await renderWithImagen(prompt, modelId, refs);
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId, prompt };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), prompt };
  }
}

// 검은 배경을 알파로 빼서 투명 PNG 로 변환.
// 단순 휘도 임계값 + 부드러운 페더링 — 배경이 정말 #000000 에 가까울 때 가장 깨끗.
// threshold: 이하 휘도는 완전 투명. featherRange: 그 위로 부드럽게 알파 보간.
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
          // 휘도 = max channel — 어두운 픽셀일수록 낮음. 검은 배경 키잉에 충분.
          const lum = Math.max(px[i], px[i + 1], px[i + 2]);
          if (lum <= threshold) {
            px[i + 3] = 0;
          } else if (lum < threshold + featherRange) {
            // 임계값 위로는 부드럽게 알파 보간 — 자글거리는 가장자리 방지
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
