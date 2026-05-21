/* eslint-disable */
// current 메인 워크스페이스: 헤더 액션바, 모델 탭, Spec Matrix, 컴파일 버튼, 출력 박스.
import React from 'react';
import {
  Menu, Edit3, PenTool, FileUp, ChevronDown, Shield, Loader2, RefreshCcw, CheckCircle, Copy
} from 'lucide-react';
import OverviewTab from './OverviewTab.jsx';
import AiOutputBox from './AiOutputBox.jsx';
import { staticOptions } from '../constants/options.js';
import { coreArchetypes } from '../constants/personas.jsx';
import { getOptionName, aiOptimizationModels } from '../constants/utils.js';

const Workspace = ({ rp }) => {
  const scores = rp.getValidationScores();

  return (
    <div className="flex-1 flex flex-col bg-[#141414] backdrop-blur-xl rounded-[16px] border border-zinc-800/80 shadow-2xl relative overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
        <div className="max-w-[850px] w-full mx-auto pb-20">

          {/* Header Action Bar */}
          <div className="flex items-center justify-between w-full pb-4 border-b border-zinc-800/60 mb-6">
            <div className="flex items-center gap-3">
              {!rp.isSidebarOpen && (
                <button onClick={() => rp.setIsSidebarOpen(true)} className="p-2 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[8px] border border-zinc-700 transition-colors shadow-sm shrink-0">
                  <Menu className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
                </button>
              )}
              <div>
                <h2 className="text-[20px] font-bold text-white flex items-center gap-2 font-mono">
                  {rp.isEditMode ? <><Edit3 className="w-5 h-5 text-zinc-400" /> L1-L7 Micro-Edit Assembly</> : <><PenTool className="w-5 h-5 text-zinc-400" /> L1-L7 Generator Assembly</>}
                </h2>
                <p className="text-[11px] font-mono tracking-tighter text-zinc-500 mt-1">{rp.isEditMode ? 'Enforces 95% shape preservation for structural modifications.' : 'Compiles parameter locks into a predictable model prompt.'}</p>
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
            <button onClick={() => rp.setModel('Overview')} className={`shrink-0 min-w-max px-6 py-2.5 rounded-[8px] text-[12px] font-bold tracking-wide font-mono transition-all shadow-sm ${rp.currentModel === 'Overview' ? 'bg-zinc-800 text-white' : 'bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>Validation</button>
            {aiOptimizationModels.map(model => (
              <button key={model.id} onClick={() => rp.setModel(model.id)} className={`shrink-0 min-w-max px-6 py-2.5 rounded-[8px] text-[12px] font-bold tracking-wide font-mono transition-all shadow-sm ${rp.currentModel === model.id ? 'bg-indigo-600 text-white' : 'bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>{model.name}</button>
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
              {/* System Specification Matrix */}
              <div className="bg-[#1C1C1C] border border-zinc-800/80 rounded-[12px] p-5 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-5 border-b border-zinc-800/50 pb-3">
                  <div>
                    <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest font-mono block mb-1">Source of Truth</span>
                    <h4 className="text-zinc-200 text-[13px] font-bold font-mono">System Specification Matrix</h4>
                  </div>
                  <button onClick={() => rp.setExpanded(!rp.isExpanded)} className="text-[11px] font-bold font-mono bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5">
                    {rp.isExpanded ? 'Summary' : 'View Raw'} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rp.isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {!rp.isExpanded ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#121212] p-3.5 rounded-[8px] border border-zinc-800/50">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block font-mono">[L1] Text Lock</span>
                      <p className="text-[13px] text-indigo-300 font-bold break-all font-mono">"{rp.inputText}"</p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-mono tracking-tighter">100% Mutation Prevention</p>
                    </div>
                    <div className="bg-[#121212] p-3.5 rounded-[8px] border border-zinc-800/50">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block font-mono">[L2] Layout Lock</span>
                      <p className="text-[12px] text-zinc-300 font-bold font-mono tracking-tight">{getOptionName(staticOptions.layouts, rp.layoutType).split(' ')[0]}</p>
                      <p className="text-[9px] text-zinc-500 mt-1 font-mono tracking-tighter">{getOptionName(staticOptions.ratios, rp.aspectRatio)} / {getOptionName(staticOptions.occupancies, rp.occupancy).split(' ')[0]}</p>
                    </div>
                    <div className="bg-[#121212] p-3.5 rounded-[8px] border border-zinc-800/50">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block font-mono">[L3] Morphology</span>
                      <p className="text-[12px] text-zinc-300 font-bold font-mono tracking-tight">{coreArchetypes.find(p => p.id === rp.coreArchetype)?.shortTitle}</p>
                    </div>
                    <div className="bg-[#121212] p-3.5 rounded-[8px] border border-zinc-800/50">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 font-mono"><Shield className="w-3 h-3 text-emerald-500" /> [L8] Active Guards</span>
                      <div className="flex flex-wrap gap-1.5 mt-1 font-mono">
                        {rp.activeGuards.includes('guard_mutation') && <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded">L1_TEXT</span>}
                        {rp.activeGuards.includes('guard_layout') && <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded">L2_LAYOUT</span>}
                        {rp.activeGuards.includes('guard_3d') && <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded">L6_STYLE</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0A0A0A] p-4 rounded-[8px] border border-zinc-800 relative">
                    <button onClick={() => rp.copyToClipboard(rp.currentPrompts.baseTechnicalEn, 'top')} className="absolute top-3 right-3 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] flex items-center gap-1 font-mono">
                      {rp.copiedTop ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                    </button>
                    <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed font-mono">{rp.currentPrompts.baseTechnicalEn}</pre>
                  </div>
                )}
              </div>

              {/* Action Button for the selected Model */}
              <div className="mt-8 flex justify-end">
                {rp.currentModel === 'NanoBanana' && (
                  <button onClick={rp.handleCompileNanoBanana} disabled={rp.isGeneratingNano} className={`px-6 py-3.5 rounded-[8px] font-bold font-mono text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingNano ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
                {rp.currentModel === 'Midjourney' && (
                  <button onClick={rp.handleCompileMj} disabled={rp.isGeneratingMj} className={`px-6 py-3.5 rounded-[8px] font-bold font-mono text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingMj ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
                {rp.currentModel === 'ChatGPT' && (
                  <button onClick={rp.handleCompileCg} disabled={rp.isGeneratingCg} className={`px-6 py-3.5 rounded-[8px] font-bold font-mono text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingCg ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
              </div>

              {/* Output Box */}
              {(rp.currentModel === 'NanoBanana' || rp.currentModel === 'Midjourney' || rp.currentModel === 'ChatGPT') && (
                <AiOutputBox
                  modelState={rp.currentModel}
                  content={rp.currentOutputContent}
                  outdatedFlag={rp.isPromptOutdated}
                  copiedBottom={rp.copiedBottom}
                  copyToClipboard={rp.copyToClipboard}
                />
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Workspace;
