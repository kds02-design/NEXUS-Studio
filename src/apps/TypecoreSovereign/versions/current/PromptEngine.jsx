/* eslint-disable */
// 버전 스냅샷(아카이브): TypecoreSovereign current. 2043줄 단일 파일을 components/hooks/constants 로
// 격리 분리한 thin 진입점. versions/current/ 외부의 TypecoreSovereign 공유 모듈은 사용하지 않음 (격리 원칙).
import React from 'react';
import { Edit3, Settings } from 'lucide-react';
import { GEMINI_API_KEY } from '../../services/gemini';

import { useSovereignPromptCurrent } from './hooks/useSovereignPromptCurrent.js';
import Sidebar from './components/Sidebar.jsx';
import Workspace from './components/Workspace.jsx';
import TuningModal from './components/TuningModal.jsx';
import ImportModal from './components/ImportModal.jsx';

const App = ({ version, setVersion, versions } = {}) => {
  const apiKey = GEMINI_API_KEY;
  const rp = useSovereignPromptCurrent({ apiKey });

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
        <Workspace rp={rp} />
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
