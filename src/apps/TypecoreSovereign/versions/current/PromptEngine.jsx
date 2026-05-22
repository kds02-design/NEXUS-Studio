/* eslint-disable */
// 버전 스냅샷(아카이브): TypecoreSovereign current. 2043줄 단일 파일을 components/hooks/constants 로
// 격리 분리한 thin 진입점. versions/current/ 외부의 TypecoreSovereign 공유 모듈은 사용하지 않음 (격리 원칙).
// Imagen 렌더링은 lib/imagenRender + PromptArc 저장 흐름을 RenderMatrix 와 동일하게 재사용.
import React, { useCallback, useState } from 'react';
import { Edit3, Settings } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { GEMINI_API_KEY } from '../../services/gemini';
import { renderWithImagen, IMAGEN_MODELS } from '../../../../lib/imagenRender';
import { uploadBase64 } from '../../../../lib/storage';
import { db, appId } from '../../../../lib/firebase';
import { serializeForFirestore } from '../../../PromptArc/services/firebase';
import { useAuth } from '../../../../context/AuthContext';

import { useSovereignPromptCurrent } from './hooks/useSovereignPromptCurrent.js';
import Sidebar from './components/Sidebar.jsx';
import Workspace from './components/Workspace.jsx';
import TuningModal from './components/TuningModal.jsx';
import ImportModal from './components/ImportModal.jsx';

const App = ({ version, setVersion, versions } = {}) => {
  const apiKey = GEMINI_API_KEY;
  const rp = useSovereignPromptCurrent({ apiKey });
  const { user, grade } = useAuth();
  const canRender = grade === 'pro' || grade === 'expert';

  // Imagen 렌더링 — RenderMatrix 와 동일 흐름.
  const [rendering, setRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [savingToArc, setSavingToArc] = useState(false);
  const [selectedImagenModel, setSelectedImagenModel] = useState(IMAGEN_MODELS[0].id);

  const saveRenderToPromptArc = useCallback(async (promptText, image) => {
    if (!user?.uid || !image?.dataUrl) return;
    setSavingToArc(true);
    try {
      const cloudinaryUrl = await uploadBase64(image.dataUrl);
      const id = Math.random().toString(36).slice(2);
      const now = Date.now();
      const modelLabel = IMAGEN_MODELS.find(m => m.id === image.modelId)?.label || image.modelId || 'Imagen';
      const title = `TypecoreSovereign · ${new Date(now).toLocaleString('ko-KR')}`;
      const record = {
        id, title, content: promptText || '',
        images: [cloudinaryUrl], thumbnail: cloudinaryUrl,
        stepPrompts: [promptText || ''],
        stepLabels: ['TypecoreSovereign'],
        stepTags: [['TypecoreSovereign', 'Imagen', modelLabel]],
        stepKeywords: [''], stepDescriptions: [''],
        tags: ['TypecoreSovereign', 'Imagen', modelLabel],
        visibility: 'private',
        ownerUid: user.uid,
        authorName: user.displayName || user.email || '',
        likeCount: 0, relatedIds: [], type: 'image',
        createdAt: now, updatedAt: now,
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prompts', id), serializeForFirestore(record));
      rp.showToast?.('✨ PromptArc 내 폴더에 저장됐어요');
      return id;
    } catch (e) {
      console.error('[TypecoreSovereign] save to PromptArc failed', e);
      rp.showToast?.(`PromptArc 저장 실패: ${e.message || e.code}`);
    } finally {
      setSavingToArc(false);
    }
  }, [user, rp]);

  const handleRender = useCallback(async (promptText) => {
    if (!promptText) return;
    if (!canRender) { setRenderError('Imagen 렌더링은 Pro 등급 이상만 사용할 수 있습니다.'); return; }
    const canGen = await rp.ensureCanGenerate?.('image');
    if (canGen === false) { setRenderError('이번 주 크레딧이 부족합니다. (이미지 생성 10c 필요)'); return; }
    setRendering(true); setRenderError(null); setRenderedImage(null);
    try {
      // 참조 이미지 없이 텍스트 프롬프트만으로 호출.
      const result = await renderWithImagen(promptText, selectedImagenModel, null);
      setRenderedImage(result);
      if (user?.uid && result?.dataUrl) saveRenderToPromptArc(promptText, result);
    } catch (e) {
      console.error('[TypecoreSovereign] imagen failed', e);
      setRenderError(e.message || String(e));
    } finally { setRendering(false); }
  }, [canRender, selectedImagenModel, user, saveRenderToPromptArc, rp]);

  const handleDownloadRendered = useCallback(() => {
    if (!renderedImage?.dataUrl) return;
    const a = document.createElement('a');
    a.href = renderedImage.dataUrl;
    a.download = `typecore_sovereign_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }, [renderedImage]);

  const handleSaveToPromptArc = useCallback(async (promptText) => {
    if (!user?.uid) { rp.showToast?.('로그인이 필요합니다'); return; }
    if (!renderedImage?.dataUrl || savingToArc) return;
    await saveRenderToPromptArc(promptText, renderedImage);
  }, [user, renderedImage, savingToArc, rp, saveRenderToPromptArc]);

  const imagen = {
    imagenModels: IMAGEN_MODELS,
    selectedModel: selectedImagenModel, setSelectedModel: setSelectedImagenModel,
    onRender: handleRender,
    rendering, renderedImage, renderError,
    onDownloadRendered: handleDownloadRendered,
    onSaveToPromptArc: handleSaveToPromptArc,
    savingToArc,
    isLoggedIn: !!user?.uid,
    canRender, grade,
  };

  return (
    // RenderMatrix 와 톤·구성 동일화:
    //  - h-screen → h-full (Shell 내부에서 100vh 잡으면 Topbar 52px 만큼 하단 잘림)
    //  - 외곽 패딩 p-5 / 배경 #09090B / 사이드바·결과 패널 #18181B + zinc-800 + rounded-2xl
    <div className={`flex flex-col h-full ${rp.theme === 'dark' ? 'bg-[#09090B] text-zinc-100' : 'bg-slate-50 text-slate-900'} overflow-hidden transition-colors duration-500 relative p-5 font-sans`}>
      {rp.usageModal}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.2); border-radius: 4px; transition: background 0.2s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.5); }
      `}</style>

      <main className="flex-1 flex overflow-hidden gap-5 min-h-0">
        <Sidebar rp={rp} version={version} setVersion={setVersion} versions={versions} />
        <Workspace rp={rp} imagen={imagen} />
      </main>

      {/* Idea Tuning Room Modal */}
      <TuningModal
        isOpen={rp.isTuningModalOpen}
        onClose={() => rp.setIsTuningModalOpen(false)}
        title="L3 Aura Tuning Room"
        currentLabel="Current Normalized Aura"
        currentLabelIcon={<Edit3 className="w-3.5 h-3.5 text-zinc-500" />}
        currentValue={rp.currentTunedAura}
        chatHistory={rp.tuningChatHistory}
        chatScrollRef={rp.tuningChatRef}
        isLoading={rp.isTuningLoading}
        loadingMessage="Normalizing..."
        referenceImage={rp.tuningReferenceImage}
        setReferenceImage={rp.setTuningReferenceImage}
        inputValue={rp.tuningInputValue}
        setInputValue={rp.setTuningInputValue}
        onSend={rp.handleSendTuningMessage}
        onApply={() => { rp.setCustomDesignInjections(rp.currentTunedAura); rp.setIsTuningModalOpen(false); }}
        applyLabel="Apply Directives & Close"
        onImageUpload={(e) => rp.handleTuningImageUpload(e, false)}
      />

      {/* Edit Tuning Room Modal */}
      <TuningModal
        isOpen={rp.isEditTuningModalOpen}
        onClose={() => rp.setIsEditTuningModalOpen(false)}
        title="L4 Micro-Retouch Room"
        currentLabel="Current Instructions"
        currentLabelIcon={<Settings className="w-3.5 h-3.5 text-zinc-500" />}
        currentValue={rp.currentTunedEditAura}
        chatHistory={rp.editTuningChatHistory}
        chatScrollRef={rp.editTuningChatRef}
        isLoading={rp.isEditTuningLoading}
        loadingMessage="Normalizing..."
        referenceImage={rp.editTuningReferenceImage}
        setReferenceImage={rp.setEditTuningReferenceImage}
        inputValue={rp.editTuningInputValue}
        setInputValue={rp.setEditTuningInputValue}
        onSend={rp.handleSendEditTuningMessage}
        onApply={() => { rp.setEditInstruction(rp.currentTunedEditAura); rp.setIsEditTuningModalOpen(false); }}
        applyLabel="Apply Directives & Close"
        onImageUpload={(e) => rp.handleTuningImageUpload(e, true)}
        placeholder="예: 낡은 부식 효과를 더 추가해줘"
      />

      {/* Prompt Import Modal */}
      <ImportModal
        isOpen={rp.isImportModalOpen}
        onClose={() => rp.setIsImportModalOpen(false)}
        importInputValue={rp.importInputValue}
        setImportInputValue={rp.setImportInputValue}
        onImport={rp.handleImportPrompt}
      />
    </div>
  );
};

export default App;
