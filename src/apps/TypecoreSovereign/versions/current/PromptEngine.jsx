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

  const t = {
    bg: rp.theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-slate-50',
    textColor: rp.theme === 'dark' ? 'text-zinc-100' : 'text-slate-900',
  };

  return (
    <div className={`flex flex-col h-screen ${t.bg} ${t.textColor} overflow-hidden transition-colors duration-500 relative p-4 font-sans`}>
      {rp.usageModal}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { margin: 10px; background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(63, 63, 70, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(82, 82, 91, 0.5); }
      `}</style>

      <main className="flex-1 flex overflow-hidden gap-5">
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
