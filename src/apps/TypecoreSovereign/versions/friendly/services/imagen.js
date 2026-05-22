// friendly 모드 — Gemini Image (Nano Banana) 호출 헬퍼.
// src/lib/imagenRender.js 의 검증된 호출 로직을 그대로 사용하고, friendly UX 에 필요한
// 결과 형태 ({ ok, dataUrl, error }) 와 default 모델만 여기서 정한다.
import { IMAGEN_MODELS, renderWithImagen } from '../../../../../lib/imagenRender';

// 기본 모델 — 빠르고 저렴한 Nano Banana 2. 사용자가 모델을 토글할 수 있게 export.
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

export { IMAGEN_MODELS };

// prompt: Compile 결과 영문 프롬프트.
// 반환: { ok: true, dataUrl, modelId } | { ok: false, error: string }
export async function generateImage(prompt, opts = {}) {
  if (!prompt || !prompt.trim()) {
    return { ok: false, error: '프롬프트가 비어 있습니다.' };
  }

  const modelId = opts.modelId || DEFAULT_IMAGE_MODEL;
  const referenceImage = opts.referenceImage || null;

  try {
    const result = await renderWithImagen(prompt, modelId, referenceImage);
    return { ok: true, dataUrl: result.dataUrl, modelId: result.modelId };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}
