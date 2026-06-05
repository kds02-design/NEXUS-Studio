// Imagen 렌더 핸들러 — TypecoreSovereign(current) 와 동일한 흐름.
// renderWithImagen → 결과 dataUrl → PromptArc 자동 저장 → RenderMatrix 송신 지원.
// Creation/Edit 두 뷰가 같은 핸들러 셋을 공유 (참조 이미지만 다름).

import { doc, setDoc } from 'firebase/firestore';
import { renderWithImagen } from '../../../lib/imagenRender';
import { uploadBase64 } from '../../../lib/storage';
import { db, appId } from '../../../lib/firebase';
import { serializeForFirestore } from '../../PromptArc/services/firebase';

// outputContent 는 string 또는 { en, ko } — 영문 버전 우선.
const pickEn = (c) => {
  if (!c) return '';
  if (typeof c === 'string') return c;
  return c.en || c.ko || JSON.stringify(c);
};

export const createRenderHandlers = (b, { user, navigate, IMAGEN_MODELS, isEditView, getPrompts, getEditPrompts }) => {
  // 새 렌더 결과가 들어오면 PromptArc 저장 상태 자동 초기화 — useEffect 가 BreezeContext 에 있음.
  const saveRenderToPromptArc = async (promptText, image) => {
    if (!user?.uid || !image?.dataUrl) return;
    b.setSavingToArc(true);
    try {
      const cloudinaryUrl = await uploadBase64(image.dataUrl);
      const id = Math.random().toString(36).slice(2);
      const now = Date.now();
      const modelLabel = IMAGEN_MODELS.find((m) => m.id === image.modelId)?.label || image.modelId || 'Imagen';
      const title = `TypecoreBreeze · ${new Date(now).toLocaleString('ko-KR')}`;
      const record = {
        id, title, content: promptText || '',
        images: [cloudinaryUrl], thumbnail: cloudinaryUrl,
        stepPrompts: [promptText || ''],
        stepLabels: ['TypecoreBreeze'],
        stepTags: [['TypecoreBreeze', 'Imagen', modelLabel]],
        stepKeywords: [''], stepDescriptions: [''],
        tags: ['TypecoreBreeze', 'Imagen', modelLabel],
        visibility: 'private',
        ownerUid: user.uid,
        authorName: user.displayName || user.email || '',
        likeCount: 0, relatedIds: [], type: 'image',
        createdAt: now, updatedAt: now,
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prompts', id), serializeForFirestore(record));
      b.setSavedToArcId(id);
      b.setSavedCloudinaryUrl(cloudinaryUrl);
      return { id, cloudinaryUrl };
    } catch (e) {
      console.error('[TypecoreBreeze] save to PromptArc failed', e);
    } finally {
      b.setSavingToArc(false);
    }
  };

  const handleRender = async () => {
    const useEdit = isEditView();
    const prompts = useEdit ? getEditPrompts() : getPrompts();
    const promptText = pickEn(prompts.outputContent) || pickEn(prompts.baseTechnical);
    if (!promptText) { b.setRenderError('먼저 프롬프트를 컴파일하세요.'); return; }
    const canGen = await b.ensureCanGenerate?.('image');
    if (canGen === false) { b.setRenderError('이번 주 크레딧이 부족합니다. (이미지 생성 10c 필요)'); return; }
    b.setRendering(true); b.setRenderError(null); b.setRenderedImage(null);
    try {
      // Edit 뷰는 업로드된 이미지를 reference 로 사용 (I2I 마이크로 에디트).
      const ref = useEdit ? b.editUploadedImage : null;
      const result = await renderWithImagen(promptText, b.selectedImagenModel, ref);
      b.setRenderedImage(result);
      if (user?.uid && result?.dataUrl) saveRenderToPromptArc(promptText, result);
    } catch (e) {
      console.error('[TypecoreBreeze] imagen failed', e);
      b.setRenderError(e.message || String(e));
    } finally { b.setRendering(false); }
  };

  const handleDownloadRendered = () => {
    if (!b.renderedImage?.dataUrl) return;
    const a = document.createElement('a');
    a.href = b.renderedImage.dataUrl;
    a.download = `typecore_breeze_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleSaveToPromptArc = async () => {
    if (!user?.uid) return;
    if (!b.renderedImage?.dataUrl || b.savingToArc) return;
    const useEdit = isEditView();
    const prompts = useEdit ? getEditPrompts() : getPrompts();
    const promptText = pickEn(prompts.outputContent) || pickEn(prompts.baseTechnical);
    await saveRenderToPromptArc(promptText, b.renderedImage);
  };

  // RenderMatrix 송신 — 자동 저장된 cloudinary URL 재사용. 없으면 즉시 업로드.
  const handleSendToRenderMatrix = async () => {
    if (!b.renderedImage?.dataUrl) return;
    b.setSendingToRenderMatrix(true);
    try {
      const url = b.savedCloudinaryUrl || await uploadBase64(b.renderedImage.dataUrl);
      const useEdit = isEditView();
      const prompts = useEdit ? getEditPrompts() : getPrompts();
      const text = pickEn(prompts.outputContent) || '';
      navigate?.('render-metrics', {
        source: 'typecore-breeze',
        mode: 'edit',
        prompt: { text, tags: ['TypecoreBreeze', 'Typography'] },
        image: { url, metadata: { from: 'TypecoreBreeze' } },
      });
    } catch (e) {
      console.error('[TypecoreBreeze] send to RenderMatrix failed', e);
    } finally {
      b.setSendingToRenderMatrix(false);
    }
  };

  return { handleRender, handleDownloadRendered, handleSaveToPromptArc, handleSendToRenderMatrix };
};
