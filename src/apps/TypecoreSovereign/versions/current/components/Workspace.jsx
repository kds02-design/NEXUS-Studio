/* eslint-disable */
// current 메인 워크스페이스: 헤더 액션바, 모델 탭, 컴파일 버튼, 출력 박스.
// "현재 설정 요약" 카드 그리드는 사용성 문제로 제거 — 모든 옵션 편집은 좌측 사이드바
// (Quick Start + 고급 옵션)로 일원화됐다.
import React from 'react';
import { Menu, Edit3, PenTool, FileUp, Loader2, RefreshCcw, CheckCircle } from 'lucide-react';
import OverviewTab from './OverviewTab.jsx';
import AiOutputBox from './AiOutputBox.jsx';
import ImagenRenderArea from './ImagenRenderArea.jsx';
import { aiOptimizationModels } from '../constants/utils.js';

const Workspace = ({ rp, imagen }) => {
  const scores = rp.getValidationScores();

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#18181B] rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
        <div className="w-full pb-20">

          {/* Header Action Bar */}
          <div className="flex items-center justify-between w-full pb-4 border-b border-zinc-800/60 mb-6">
            <div className="flex items-center gap-3">
              {!rp.isSidebarOpen && (
                <button onClick={() => rp.setIsSidebarOpen(true)} className="p-2 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[8px] border border-zinc-700 transition-colors shadow-sm shrink-0">
                  <Menu className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
                </button>
              )}
              <div>
                <h2 className="text-[17px] font-bold text-white flex items-center gap-2">
                  {rp.isEditMode ? <><Edit3 className="w-4 h-4 text-zinc-400" /> 마이크로 리터칭</> : <><PenTool className="w-4 h-4 text-zinc-400" /> 프롬프트 생성</>}
                </h2>
                <p className="text-[10px] tracking-tight text-zinc-500 mt-1">{rp.isEditMode ? '기준 이미지의 형태를 95% 보존하면서 표면·디테일만 리터칭합니다.' : '왼쪽에서 고른 옵션이 모델별 프롬프트로 자동 조립됩니다.'}</p>
              </div>
            </div>
            {!rp.isEditMode && (
              <button onClick={() => rp.setIsImportModalOpen(true)} title="프롬프트 역설계 (텍스트/JSON)" className="p-2.5 rounded-[10px] bg-[#1C1C1C] border border-zinc-700 hover:bg-[#262626] text-zinc-400 transition-colors flex items-center justify-center shadow-sm">
                <FileUp className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Model Adapters Tabs */}
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar mb-6">
            <button onClick={() => rp.setModel('Overview')} className={`shrink-0 min-w-max px-5 py-2 rounded-[8px] text-[11px] font-bold tracking-wide font-sans transition-all shadow-sm ${rp.currentModel === 'Overview' ? 'bg-zinc-800 text-white' : 'bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>Validation</button>
            {aiOptimizationModels.map(model => (
              <button key={model.id} onClick={() => rp.setModel(model.id)} className={`shrink-0 min-w-max px-5 py-2 rounded-[8px] text-[11px] font-bold tracking-wide font-sans transition-all shadow-sm ${rp.currentModel === model.id ? 'bg-indigo-600 text-white' : 'bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>{model.name}</button>
            ))}
          </div>

          {/* Dynamic Content based on selected Model */}
          {rp.currentModel === 'Overview' ? (
            <OverviewTab
              scores={scores}
              executeAutoCorrection={rp.executeAutoCorrection}
              handleApplyAllCorrections={rp.handleApplyAllCorrections}
            />
          ) : (
            <>
              {/* Action Button for the selected Model */}
              <div className="flex justify-end">
                {rp.currentModel === 'NanoBanana' && (
                  <button onClick={rp.handleCompileNanoBanana} disabled={rp.isGeneratingNano} className={`px-5 py-3 rounded-[8px] font-bold font-sans text-[12px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingNano ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
                {rp.currentModel === 'Midjourney' && (
                  <button onClick={rp.handleCompileMj} disabled={rp.isGeneratingMj} className={`px-5 py-3 rounded-[8px] font-bold font-sans text-[12px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingMj ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
                {rp.currentModel === 'ChatGPT' && (
                  <button onClick={rp.handleCompileCg} disabled={rp.isGeneratingCg} className={`px-5 py-3 rounded-[8px] font-bold font-sans text-[12px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingCg ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
              </div>

              {/* 프롬프트(좌) · 렌더링(우) — 페이지 폭에 따라 늘어나는 2-컬럼 grid.
                  좁은 폭에선 자동으로 세로로 쌓임. */}
              {(rp.currentModel === 'NanoBanana' || rp.currentModel === 'Midjourney' || rp.currentModel === 'ChatGPT') && (
                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
                  <div className="min-w-0 flex flex-col">
                    <AiOutputBox
                      modelState={rp.currentModel}
                      content={rp.currentOutputContent}
                      outdatedFlag={rp.isPromptOutdated}
                      copiedBottom={rp.copiedBottom}
                      copyToClipboard={rp.copyToClipboard}
                    />
                  </div>
                  {imagen && (
                    <div className="min-w-0 flex flex-col">
                      <ImagenRenderArea
                        promptText={rp.currentOutputContent}
                        {...imagen}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Workspace;
