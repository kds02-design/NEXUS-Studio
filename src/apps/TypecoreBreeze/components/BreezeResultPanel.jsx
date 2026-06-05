import {
  PenTool, Shield, ChevronDown, Copy, CheckCircle2, Loader2, Sparkles, Star, Zap, RefreshCcw, ShieldAlert, AlertTriangle,
} from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';
import { aiOptimizationModels } from '../constants/categories.jsx';
import { AiOutputBox, Tooltip } from './ui.jsx';
import BreezeRenderArea from './BreezeRenderArea.jsx';

// 우측 메인 영역 — Creation/Edit 두 뷰 모두 처리.
export default function BreezeResultPanel() {
  const {
    currentView,
    baseLangView, setBaseLangView,
    isBaseContextExpanded, setIsBaseContextExpanded,
    isEditPromptExpanded, setIsEditPromptExpanded,
    copiedTop, copiedBottom, copyToClipboard,
    verifyPromptLogic, isVerifyingLogic, isAuditedHighlight,
    aiModel, setAiModel, editAiModel, setEditAiModel,
    nanoViewMode, setNanoViewMode,
    editNanoMode, setEditNanoMode,
    isOutdated, isEditOutdated,
    isEnhancing, isOptimizing, isMjOptimizing, isCgEnhancing,
    isEditEnhancing, isEditOptimizing, isEditMjOptimizing, isEditCgEnhancing,
    requestDramaticEnhancement, requestEditDramaticEnhancement,
    requestPromptOptimization, requestMidjourneyOptimization, requestChatGPTEnhancement,
    editUploadedImage,
    getPrompts, getEditPrompts,
  } = useBreeze();

  // ── Edit (Micro-Edit) 메인 영역 ────────────────────────────
  if (currentView === 'edit') {
    const editP = getEditPrompts();
    return (
      <div className="flex-1 flex flex-col p-8 lg:p-12 overflow-y-auto custom-scrollbar bg-[#0A0A0A]">
        <div className="max-w-[800px] w-full mx-auto space-y-6 pb-20">
          <div className="flex items-center gap-3 px-2">
            <Shield className="w-5 h-5 text-zinc-500" />
            <div>
              <h2 className="text-[13px] font-bold text-zinc-200">Surgical Micro-Edit Mode</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Strictly preserves 2D shape & layout while modifying specific textures or terminals.</p>
            </div>
          </div>

          <div className="rounded-xl border bg-[#111111] border-zinc-800 overflow-hidden">
            <div className="w-full flex justify-between items-center p-4 bg-[#141414]">
              <button onClick={() => setIsEditPromptExpanded(!isEditPromptExpanded)} className="flex items-center gap-2 hover:bg-zinc-800/50 p-1.5 rounded-md transition-all">
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isEditPromptExpanded ? 'rotate-180' : ''}`} />
                <span className="text-[11px] font-bold uppercase text-zinc-300">Base Technical Prompt (I2I)</span>
              </button>
              <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                <button onClick={(e) => { e.stopPropagation(); setBaseLangView('en'); }} className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded transition-all ${baseLangView === 'en' ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>EN</button>
                <button onClick={(e) => { e.stopPropagation(); setBaseLangView('ko'); }} className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded transition-all ${baseLangView === 'ko' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>KO</button>
              </div>
            </div>
            <div className={`font-mono text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed relative transition-all duration-300 ${isEditPromptExpanded ? 'max-h-[800px] p-5 opacity-100' : 'max-h-0 p-0 opacity-0'}`}>
              {baseLangView === 'ko' ? editP.baseTechnical.ko : editP.baseTechnical.en}
            </div>
          </div>

          <div className="flex p-1 bg-[#111111] rounded-lg border border-zinc-800">
            <button onClick={() => setEditAiModel('Overview')} className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase transition-all ${editAiModel === 'Overview' ? 'bg-[#2C2C2C] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Overview</button>
            {aiOptimizationModels.map(model => (
              <button key={model.id} onClick={() => setEditAiModel(model.id)} className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase transition-all ${editAiModel === model.id ? 'bg-[#2C2C2C] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>{model.name}</button>
            ))}
          </div>

          <div className="flex gap-2 w-full overflow-x-auto custom-scrollbar pb-1">
            {editAiModel === 'NanoBanana' && (
              <>
                <button onClick={() => requestEditDramaticEnhancement()} disabled={isEditEnhancing} className="flex-1 min-w-[150px] whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                  {isEditEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />} Generate Prompt
                </button>
                <button onClick={() => requestPromptOptimization(true)} disabled={isEditOptimizing} className="flex-1 min-w-[150px] whitespace-nowrap px-4 py-3 bg-violet-900/30 hover:bg-violet-900/50 text-violet-300 border border-violet-500/30 rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                  {isEditOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Optimize Tags
                </button>
              </>
            )}
            {editAiModel === 'Midjourney' && (
              <button onClick={() => requestMidjourneyOptimization(true)} disabled={isEditMjOptimizing} className="flex-1 whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                {isEditMjOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />} Generate MJ V6
              </button>
            )}
            {editAiModel === 'ChatGPT' && (
              <button onClick={() => requestChatGPTEnhancement(true)} disabled={isEditCgEnhancing} className="flex-1 whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                {isEditCgEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />} Generate DALL-E 3
              </button>
            )}
          </div>

          <AiOutputBox modelState={editAiModel} viewModeState={editNanoMode} setViewMode={setEditNanoMode} content={editP.outputContent} isEdit={true} outdatedFlag={isEditOutdated} onCopy={copyToClipboard} copiedState={copiedBottom}/>

          {editUploadedImage && (
            <div className="p-6 border bg-[#18181B] border-zinc-800 rounded-md flex justify-center">
              <img src={editUploadedImage} alt="Base" className="max-h-[400px] rounded border border-zinc-700" />
            </div>
          )}

          <BreezeRenderArea />
        </div>
      </div>
    );
  }

  // ── Creation 메인 영역 ─────────────────────────────────────
  const p = getPrompts();
  const conflicts = p.conflicts || [];
  const baseTechText = baseLangView === 'ko' ? p.baseTechnical.ko : p.baseTechnical.en;
  const lines = baseTechText.split('\n');
  const isLong = lines.length > 10;
  const truncated = (!isBaseContextExpanded && isLong) ? lines.slice(0, 10).join('\n') + '\n...' : baseTechText;

  return (
    <div className="flex-1 flex flex-col p-8 lg:p-12 overflow-y-auto custom-scrollbar bg-[#0A0A0A]">
      <div className="max-w-[800px] w-full mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3 px-2">
          <PenTool className="w-5 h-5 text-zinc-500" />
          <div>
            <h2 className="text-[13px] font-bold text-zinc-200">Creation Workspace</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Define your core aesthetic and generate robust prompts for text-to-image models.</p>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-amber-300 mb-1">옵션 충돌 자동 해결 ({conflicts.length}건)</p>
              <ul className="text-[10px] text-amber-200/80 space-y-0.5 leading-relaxed">
                {conflicts.map((c, i) => <li key={i}>· {c}</li>)}
              </ul>
            </div>
          </div>
        )}

        <div className="rounded-xl p-6 border bg-[#111111] border-zinc-800/80 shadow-xl relative">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase text-zinc-500">Base Context</span>
              <div className="flex bg-zinc-900 rounded p-0.5 border border-zinc-800">
                <button onClick={(e) => { e.stopPropagation(); setBaseLangView('en'); }} className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded transition-all ${baseLangView === 'en' ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>EN</button>
                <button onClick={(e) => { e.stopPropagation(); setBaseLangView('ko'); }} className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded transition-all ${baseLangView === 'ko' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>KO</button>
              </div>
            </div>
            <div className="flex gap-2">
              <Tooltip text="옵션 간 논리적 모순 수정">
                <button onClick={verifyPromptLogic} disabled={isVerifyingLogic} className="h-7 px-3 rounded text-[10px] font-bold bg-violet-900/30 text-violet-300 hover:bg-violet-900/50 hover:text-violet-200 transition-colors border border-violet-500/30 flex items-center gap-1.5 disabled:opacity-50">
                  {isVerifyingLogic ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />} Logic Audit
                </button>
              </Tooltip>
              <Tooltip text="프롬프트 복사">
                <button onClick={() => copyToClipboard(baseTechText, 'top')} className="h-7 w-8 flex items-center justify-center rounded bg-[#1A1A1A] text-zinc-400 border border-zinc-700 hover:bg-[#2C2C2C] hover:text-zinc-200 transition-colors">
                  {copiedTop ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              </Tooltip>
            </div>
          </div>

          <div className={`font-mono text-[11px] p-4 rounded border whitespace-pre-wrap leading-relaxed shadow-inner transition-all duration-500 ${isAuditedHighlight ? 'ring-1 ring-violet-500 bg-violet-900/10 text-violet-200 border-violet-500/50' : 'bg-[#0F0F0F] border-zinc-800 text-zinc-400'}`}>
            {truncated}
          </div>
          {isLong && (
            <button onClick={() => setIsBaseContextExpanded(!isBaseContextExpanded)} className="w-full mt-2 py-1.5 bg-[#141414] hover:bg-[#1E1E1E] border border-zinc-800/80 rounded text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1.5">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBaseContextExpanded ? 'rotate-180' : ''}`} />
              {isBaseContextExpanded ? '접기' : '더보기'}
            </button>
          )}
        </div>

        <div className="flex p-1 bg-[#111111] rounded-lg border border-zinc-800">
          <button onClick={() => setAiModel('Overview')} className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase transition-all ${aiModel === 'Overview' ? 'bg-[#2C2C2C] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Overview</button>
          {aiOptimizationModels.map(model => (
            <button key={model.id} onClick={() => setAiModel(model.id)} className={`flex-1 py-2.5 rounded-md text-[11px] font-bold uppercase transition-all ${aiModel === model.id ? 'bg-[#2C2C2C] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>{model.name}</button>
          ))}
        </div>

        <div className="flex gap-2 w-full overflow-x-auto custom-scrollbar pb-1">
          {aiModel === 'NanoBanana' && (
            <>
              <button onClick={() => requestDramaticEnhancement()} disabled={isEnhancing} className="flex-1 min-w-[150px] whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
                {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Generate Prompt
              </button>
              <button onClick={() => requestPromptOptimization(false)} disabled={isOptimizing} className="flex-1 min-w-[150px] whitespace-nowrap px-4 py-3 bg-violet-900/40 text-violet-300 hover:bg-violet-900/60 border border-violet-500/30 rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Optimize Tags
              </button>
            </>
          )}
          {aiModel === 'Midjourney' && (
            <button onClick={() => requestMidjourneyOptimization(false)} disabled={isMjOptimizing} className="flex-1 whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
              {isMjOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />} Generate MJ V6
            </button>
          )}
          {aiModel === 'ChatGPT' && (
            <button onClick={() => requestChatGPTEnhancement(false)} disabled={isCgEnhancing} className="flex-1 whitespace-nowrap px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[11px] uppercase flex justify-center items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
              {isCgEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Generate DALL-E 3
            </button>
          )}
        </div>

        <AiOutputBox modelState={aiModel} viewModeState={nanoViewMode} setViewMode={setNanoViewMode} content={p.outputContent} isEdit={false} outdatedFlag={isOutdated} onCopy={copyToClipboard} copiedState={copiedBottom}/>

        <BreezeRenderArea />
      </div>
    </div>
  );
}
