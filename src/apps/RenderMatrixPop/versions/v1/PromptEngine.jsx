/* eslint-disable */
// 버전 스냅샷(아카이브): RenderMatrixPop v1. 의도적으로 동결된 버전.
// 1627줄 단일 파일을 components/hooks/constants 로 격리 분리한 thin 진입점.
// versions/v1/ 외부의 RenderMatrixPop 공유 모듈은 사용하지 않음 (격리 원칙).
import React from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { usePopPromptV1 } from './hooks/usePopPromptV1.js';
import ChatModal from './components/ChatModal.jsx';
import Sidebar from './components/Sidebar.jsx';
import Workspace from './components/Workspace.jsx';

const App = () => {
    const rp = usePopPromptV1();

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 p-5 overflow-hidden" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(236, 72, 153, 0.2); border-radius: 4px; transition: background 0.2s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(236, 72, 153, 0.5); }
      `}</style>

            {rp.toastMsg && (
                <div className={`fixed top-8 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full font-bold text-[12px] shadow-2xl z-[1000] flex items-center gap-2 animate-in slide-in-from-top-4 fade-in whitespace-nowrap border backdrop-blur-md transition-colors ${rp.toastMsg.includes('해제') ? 'bg-zinc-800/90 border-zinc-600' : 'bg-pink-500/90 border-pink-400/50'}`}>
                    {rp.toastMsg.includes('해제') ? <RefreshCw className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                    {rp.toastMsg}
                </div>
            )}

            <ChatModal
                isOpen={rp.isChatModalOpen}
                onClose={() => rp.setIsChatModalOpen(false)}
                tempIntent={rp.tempIntent}
                chatMessages={rp.chatMessages}
                chatInput={rp.chatInput}
                setChatInput={rp.setChatInput}
                isChatting={rp.isChatting}
                onSend={rp.handleSendChatMessage}
                onApply={rp.applyChatIntent}
                chatScrollRef={rp.chatScrollRef}
            />

            <main className="flex-1 flex gap-5 h-full overflow-hidden">
                <Sidebar
                    currentView={rp.currentView}
                    setCurrentView={rp.setCurrentView}
                    directorPersona={rp.directorPersona}
                    typographyScale={rp.typographyScale}
                    shapeFeel={rp.shapeFeel}
                    shapeFidelity={rp.shapeFidelity}
                    baseStyle={rp.baseStyle}
                    colorPalette={rp.colorPalette}
                    outlineStyle={rp.outlineStyle}
                    depthStyle={rp.depthStyle}
                    fxStyle={rp.fxStyle}
                    background={rp.background}
                    userIntent={rp.userIntent}
                    vfxPassMode={rp.vfxPassMode}
                    refImage={rp.refImage}
                    isAnalyzingRef={rp.isAnalyzingRef}
                    isDraggingRef={rp.isDraggingRef}
                    setIsDraggingRef={rp.setIsDraggingRef}
                    handleRefImageUpload={rp.handleRefImageUpload}
                    setRefImage={rp.setRefImage}
                    setExtractedRefDetails={rp.setExtractedRefDetails}
                    setShapeFidelity={rp.setShapeFidelity}
                    setDirectorPersona={rp.setDirectorPersona}
                    setBaseStyle={rp.setBaseStyle}
                    setColorPalette={rp.setColorPalette}
                    setEditBaseStyle={rp.setEditBaseStyle}
                    setEditColorPalette={rp.setEditColorPalette}
                    activePresetGroup={rp.activePresetGroup}
                    setActivePresetGroup={rp.setActivePresetGroup}
                    activePresetId={rp.activePresetId}
                    isPresetModified={rp.isPresetModified}
                    handleApplyPreset={rp.handleApplyPreset}
                    handleExpandIntent={rp.handleExpandIntent}
                    isExpandingIntent={rp.isExpandingIntent}
                    openChatModal={rp.openChatModal}
                    editImage={rp.editImage}
                    setEditImage={rp.setEditImage}
                    editBudget={rp.editBudget}
                    activeEditIntents={rp.activeEditIntents}
                    editBaseStyle={rp.editBaseStyle}
                    editColorPalette={rp.editColorPalette}
                    editOutlineStyle={rp.editOutlineStyle}
                    editFxStyle={rp.editFxStyle}
                    editBg={rp.editBg}
                    editIntent={rp.editIntent}
                    editVfxPassMode={rp.editVfxPassMode}
                    isDraggingEdit={rp.isDraggingEdit}
                    setIsDraggingEdit={rp.setIsDraggingEdit}
                    handleChange={rp.handleChange}
                    setUserIntent={rp.setUserIntent}
                    setTypographyScale={rp.setTypographyScale}
                    setShapeFeel={rp.setShapeFeel}
                    setOutlineStyle={rp.setOutlineStyle}
                    setDepthStyle={rp.setDepthStyle}
                    setFxStyle={rp.setFxStyle}
                    setBackground={rp.setBackground}
                    setVfxPassMode={rp.setVfxPassMode}
                    setEditVfxPassMode={rp.setEditVfxPassMode}
                    setActiveEditIntents={rp.setActiveEditIntents}
                    setEditBudget={rp.setEditBudget}
                    setEditOutlineStyle={rp.setEditOutlineStyle}
                    setEditFxStyle={rp.setEditFxStyle}
                    setEditBg={rp.setEditBg}
                    setEditIntent={rp.setEditIntent}
                />

                <Workspace
                    currentView={rp.currentView}
                    auditIssues={rp.auditIssues}
                    qualityScores={rp.qualityScores}
                    promptBudget={rp.promptBudget}
                    activeTroubleshoots={rp.activeTroubleshoots}
                    applyAction={rp.applyAction}
                    aiModel={rp.aiModel}
                    setAiModel={rp.setAiModel}
                    currentIR={rp.currentIR}
                    compiledOutputs={rp.compiledOutputs}
                    optimizedPrompts={rp.optimizedPrompts}
                    isOptimizing={rp.isOptimizing}
                    handleOptimizePrompt={rp.handleOptimizePrompt}
                    copyToClipboard={rp.copyToClipboard}
                    isCopied={rp.isCopied}
                />
            </main>
        </div>
    );
};

export default App;
