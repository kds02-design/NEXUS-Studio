/* eslint-disable */
// 버전 스냅샷(아카이브): TypecoreSovereign current. 2043줄 단일 파일을 components/hooks/constants 로
// 격리 분리한 thin 진입점. versions/current/ 외부의 TypecoreSovereign 공유 모듈은 사용하지 않음 (격리 원칙).
// Imagen 렌더링은 lib/imagenRender + PromptArc 저장 흐름을 RenderMatrix 와 동일하게 재사용.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Edit3, Settings } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { GEMINI_API_KEY } from '../../services/gemini';
import { renderWithImagen, IMAGEN_MODELS } from '../../../../lib/imagenRender';
import { uploadBase64 } from '../../../../lib/storage';
import { db, appId } from '../../../../lib/firebase';
import { serializeForFirestore } from '../../../PromptArc/services/firebase';
import { useAuth } from '../../../../context/AuthContext';
import { useGlobal } from '../../../../context/GlobalContext';

import { useSovereignPromptCurrent } from './hooks/useSovereignPromptCurrent.js';
import Sidebar from './components/Sidebar.jsx';
import Workspace from './components/Workspace.jsx';
import TuningModal from './components/TuningModal.jsx';
import ImportModal from './components/ImportModal.jsx';

const App = ({ version, setVersion, versions } = {}) => {
  const apiKey = GEMINI_API_KEY;
  const rp = useSovereignPromptCurrent({ apiKey });
  const { user, grade } = useAuth();
  const { navigate, payload } = useGlobal();
  const canRender = grade === 'pro' || grade === 'expert';

  // 완전 자동 파이프라인 모드 — 인덱스의 "타이포그래피 자동화 1단계" 메뉴로 진입했을 때만 true.
  // (payload.params.autoPipeline 은 그 메뉴에서만 주입됨 → 일반 앱 목록 진입 시엔 자동 전송 안 함.)
  // 이 플래그가 켜져야 handleRender 가 렌더 직후 RenderMatrix 로 자동 전송한다.
  const [autoPipelineMode, setAutoPipelineMode] = useState(false);
  const autoPipelineConsumedRef = useRef(null);
  useEffect(() => {
    if (!payload || payload.target !== 'typecore-sovereign' || !payload.timestamp) return;
    if (autoPipelineConsumedRef.current === payload.timestamp) return;
    if (payload.params?.autoPipeline) {
      autoPipelineConsumedRef.current = payload.timestamp;
      setAutoPipelineMode(true);
    }
    // payload 정리는 useSovereignPromptCurrent 의 수신 effect 가 담당 (여기선 플래그만 캡처).
  }, [payload?.timestamp, payload?.target, payload?.params?.autoPipeline]);

  // Imagen 렌더링 — RenderMatrix 와 동일 흐름.
  const [rendering, setRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [savingToArc, setSavingToArc] = useState(false);
  const [selectedImagenModel, setSelectedImagenModel] = useState(IMAGEN_MODELS[0].id);
  // 자동 저장 결과 추적 — PromptArc doc id 가 있으면 "저장됨" 표시, null 이면 미저장.
  const [savedToArcId, setSavedToArcId] = useState(null);
  // 저장된 cloudinary URL 캐싱 — Render Matrix 송신 시 재업로드 회피.
  const [savedCloudinaryUrl, setSavedCloudinaryUrl] = useState(null);
  // Render Matrix 송신 진행 상태.
  const [sendingToRenderMatrix, setSendingToRenderMatrix] = useState(false);

  // 새 렌더 결과가 들어오면 저장 상태 초기화.
  useEffect(() => {
    setSavedToArcId(null);
    setSavedCloudinaryUrl(null);
  }, [renderedImage]);

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
      // 저장 상태 + URL 캐시.
      setSavedToArcId(id);
      setSavedCloudinaryUrl(cloudinaryUrl);
      rp.showToast?.('✨ PromptArc 내 폴더에 저장됐어요');
      return { id, cloudinaryUrl };
    } catch (e) {
      console.error('[TypecoreSovereign] save to PromptArc failed', e);
      rp.showToast?.(`PromptArc 저장 실패: ${e.message || e.code}`);
    } finally {
      setSavingToArc(false);
    }
  }, [user, rp]);

  // Render Matrix 로 송신 — 렌더된 이미지를 RenderMatrix edit 모드의 base image 로 자동 임포트.
  // 자동 저장된 cloudinary URL 이 있으면 재사용. 없으면 즉시 업로드.
  const handleSendToRenderMatrix = useCallback(async () => {
    if (!renderedImage?.dataUrl) return;
    setSendingToRenderMatrix(true);
    try {
      const url = savedCloudinaryUrl || await uploadBase64(renderedImage.dataUrl);
      const text = rp.currentOutputContent || '';
      navigate('render-metrics', {
        source: 'typecore-sovereign',
        mode: 'edit', // RenderMatrix 의 edit 뷰로 자동 전환되며 editImage(base image)에 들어감.
        prompt: { text, tags: ['TypecoreSovereign', 'Typography'] },
        image: { url, metadata: { from: 'TypecoreSovereign' } },
      });
      rp.showToast?.('🚀 Render Matrix 로 보냈어요');
    } catch (e) {
      console.error('[TypecoreSovereign] send to RenderMatrix failed', e);
      rp.showToast?.(`Render Matrix 전송 실패: ${e.message || e.code}`);
    } finally {
      setSendingToRenderMatrix(false);
    }
  }, [renderedImage, savedCloudinaryUrl, navigate, rp]);

  // 완전 자동 파이프라인 — 렌더된 이미지를 RenderMatrix 로 보내 자동으로 image-to-image 렌더까지 실행.
  // mode:'pipeline' 이면 RenderMatrix 가 base image 임포트 + 추천 옵션 자동 적용 + 자동 렌더한다.
  // cloudUrl(자동 저장 결과)이 있으면 재사용, 없으면 즉시 업로드.
  const autoSendToRenderMatrix = useCallback(async (image, promptText, cloudUrl) => {
    if (!image?.dataUrl) return;
    try {
      const url = cloudUrl || await uploadBase64(image.dataUrl);
      navigate('render-metrics', {
        source: 'typecore-sovereign',
        mode: 'pipeline',
        prompt: { text: rp.currentOutputContent || promptText || '', tags: ['TypecoreSovereign', 'Typography'] },
        image: { url, metadata: { from: 'TypecoreSovereign' } },
      });
      rp.showToast?.('🤖 완전 자동 파이프라인 — Render Matrix 로 보냈어요');
    } catch (e) {
      console.error('[TypecoreSovereign] auto pipeline send failed', e);
      rp.showToast?.(`자동 파이프라인 전송 실패: ${e.message || e.code}`);
    }
  }, [navigate, rp]);

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
      // PromptArc 자동 저장 → cloudinary URL 확보(파이프라인 전송 시 재업로드 회피).
      let cloudUrl = null;
      if (user?.uid && result?.dataUrl) {
        const saved = await saveRenderToPromptArc(promptText, result);
        cloudUrl = saved?.cloudinaryUrl || null;
      }
      // 완전 자동 파이프라인 — 인덱스 메뉴로 진입한 경우(autoPipelineMode)에만 RenderMatrix 로 자동 전송 + 자동 렌더.
      // 일반 진입 시엔 전송하지 않음 — 수동 "Render Matrix 로 보내기" 버튼은 그대로 사용 가능.
      if (autoPipelineMode) {
        await autoSendToRenderMatrix(result, promptText, cloudUrl);
      }
    } catch (e) {
      console.error('[TypecoreSovereign] imagen failed', e);
      setRenderError(e.message || String(e));
    } finally { setRendering(false); }
  }, [canRender, selectedImagenModel, user, saveRenderToPromptArc, autoSendToRenderMatrix, autoPipelineMode, rp]);

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
    savedToArcId,                       // null 이면 미저장, doc id 면 저장 완료.
    onSendToRenderMatrix: handleSendToRenderMatrix,
    sendingToRenderMatrix,
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
