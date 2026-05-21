/* eslint-disable */
// 버전 스냅샷(아카이브): TypecoreSovereign v2. 이 파일은 의도적으로 동결되어 있어 ESLint 검사에서 제외한다.
// 1702줄 단일 파일을 components/hooks/constants 로 격리 분리한 thin 진입점.
// versions/v2/ 외부의 TypecoreSovereign 공유 모듈은 사용하지 않음 (격리 원칙).
import React from 'react';
import { Edit3, Settings } from 'lucide-react';
import { GEMINI_API_KEY } from '../../services/gemini';
import { useUsageGate } from '../../../../components/UsageGate';
import { useGlobal } from '../../../../context/GlobalContext';

import { useSovereignPromptV2 } from './hooks/useSovereignPromptV2.js';
import Sidebar from './components/Sidebar.jsx';
import Workspace from './components/Workspace.jsx';
import TuningModal from './components/TuningModal.jsx';
import InspectorModal from './components/InspectorModal.jsx';
import ImportModal from './components/ImportModal.jsx';

const App = ({ version, setVersion, versions } = {}) => {
    const apiKey = GEMINI_API_KEY;
    const { modal: usageModal } = useUsageGate();
    const { isLight } = useGlobal();
    // 전역 테마와 동기화 — 루트 컨테이너만 light 대응. 내부 위젯은 다크 하드코딩.
    const theme = isLight ? "light" : "dark";

    const rp = useSovereignPromptV2({ apiKey });

    const t = {
        bg: theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-slate-50',
        textColor: theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900',
    };

    return (
        <div className={`flex flex-col h-screen ${t.bg} ${t.textColor} overflow-hidden transition-colors duration-500 relative p-4 font-sans`}>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { margin: 10px; background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(63, 63, 70, 0.5); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(82, 82, 91, 0.5); }
            `}</style>

            <main className="flex-1 flex overflow-hidden gap-5">
                <Sidebar rp={rp} theme={theme} version={version} setVersion={setVersion} versions={versions} />
                <Workspace rp={rp} />
            </main>

            <TuningModal
                isOpen={rp.isTuningModalOpen}
                onClose={() => rp.setIsTuningModalOpen(false)}
                title="형태 아이디어 튜닝룸"
                currentLabel="현재 묘사 내용"
                currentLabelIcon={<Edit3 className="w-3.5 h-3.5 text-zinc-500" />}
                currentValue={rp.currentTunedAura}
                chatHistory={rp.tuningChatHistory}
                chatScrollRef={rp.tuningChatRef}
                isLoading={rp.isTuningLoading}
                loadingMessage="분석 및 튜닝 중..."
                referenceImage={rp.tuningReferenceImage}
                setReferenceImage={rp.setTuningReferenceImage}
                inputValue={rp.tuningInputValue}
                setInputValue={rp.setTuningInputValue}
                onSend={rp.handleSendTuningMessage}
                onApply={() => { rp.setCustomDesignInjections(rp.currentTunedAura); rp.setIsTuningModalOpen(false); }}
                applyLabel="튜닝 완료 및 닫기"
                onImageUpload={(e) => rp.handleTuningImageUpload(e, false)}
            />

            <TuningModal
                isOpen={rp.isEditTuningModalOpen}
                onClose={() => rp.setIsEditTuningModalOpen(false)}
                title="마이크로 리터칭 룸"
                currentLabel="현재 편집 지시 내용"
                currentLabelIcon={<Settings className="w-3.5 h-3.5 text-zinc-500" />}
                currentValue={rp.currentTunedEditAura}
                chatHistory={rp.editTuningChatHistory}
                chatScrollRef={rp.editTuningChatRef}
                isLoading={rp.isEditTuningLoading}
                loadingMessage="파라미터 튜닝 중..."
                referenceImage={rp.editTuningReferenceImage}
                setReferenceImage={rp.setEditTuningReferenceImage}
                inputValue={rp.editTuningInputValue}
                setInputValue={rp.setEditTuningInputValue}
                onSend={rp.handleSendEditTuningMessage}
                onApply={() => { rp.setEditInstruction(rp.currentTunedEditAura); rp.setIsEditTuningModalOpen(false); }}
                applyLabel="리터칭 지시 완료"
                onImageUpload={(e) => rp.handleTuningImageUpload(e, true)}
                placeholder="예: 낡은 부식 효과를 더 추가해줘"
            />

            <InspectorModal
                isOpen={rp.isInspectorModalOpen}
                onClose={() => rp.setIsInspectorModalOpen(false)}
                result={rp.inspectionResult}
                selectedResolutionIndex={rp.selectedResolutionIndex}
                setSelectedResolutionIndex={rp.setSelectedResolutionIndex}
                onApplyResolution={() => {
                    const selectedRes = rp.inspectionResult.resolutions[rp.selectedResolutionIndex];
                    if (rp.inspectionResult.isEdit) rp.setEditManualBasePrompt({ en: selectedRes.resolvedPromptEn, ko: selectedRes.resolvedPromptKo });
                    else rp.setManualBasePrompt({ en: selectedRes.resolvedPromptEn, ko: selectedRes.resolvedPromptKo });
                    rp.setIsInspectorModalOpen(false);
                }}
            />

            <ImportModal
                isOpen={rp.isImportModalOpen}
                onClose={() => rp.setIsImportModalOpen(false)}
                importInputValue={rp.importInputValue}
                setImportInputValue={rp.setImportInputValue}
                onImport={rp.handleImportPrompt}
            />

            {usageModal}
        </div>
    );
};

export default App;
