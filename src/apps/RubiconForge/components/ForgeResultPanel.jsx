// 우측 결과 패널: ArchitectureBlueprint + 모델별 Prompt Output + Campaign Copy/Vibe.
// 원본 index.jsx 의 <main> 우측 영역을 그대로 이전.

import {
  Terminal, FileText, Loader2, Sparkle as SparkleIcon, Copy, Check,
  BookOpen, Stars,
} from 'lucide-react';
import ForgePresetPanel from './ForgePresetPanel';
import ForgeVariationGrid from './ForgeVariationGrid';
import ForgeAtlasGrid from './ForgeAtlasGrid';

export default function ForgeResultPanel({ forge }) {
  const {
    currentView,
    // blueprint
    validation, handleFixValidation, handleResetSettings, copyToClipboard,
    baseSpec, isCopiedBase,
    // model tabs / output
    aiModel, setAiModel,
    showOriginalPrompt, setShowOriginalPrompt,
    optimizedPrompts, translatedPrompts,
    handleOptimizePrompt, isOptimizing, isTranslating,
    outputLang, toggleLanguage,
    finalOutput, originalOutput,
    isCopiedEnhanced,
    // lore
    lore, isGeneratingLore, handleGenerateLore,
    // overlay flags
    isAnalyzingStyle, isExpandingIntent, isKeywordSetting,
  } = forge;

  // 변형 / 아틀라스 모드 — 별도 그리드 패널로 위임. Creation 모드의 PresetPanel/Prompt Output 와 자원 공유 없음.
  if (currentView === 'micro-edit') {
    return <ForgeVariationGrid forge={forge} />;
  }
  if (currentView === 'atlas') {
    return <ForgeAtlasGrid forge={forge} />;
  }

  return (
    <div className="flex-1 flex flex-col bg-[#050507] overflow-y-auto custom-scrollbar relative">

      {currentView === 'creation' && (
        <div className="p-12 lg:p-20 max-w-[1400px] mx-auto w-full space-y-16 pb-32">
          <div className="flex flex-col gap-10">
            <div className="max-w-[1000px] mx-auto w-full flex flex-col gap-10">

              <ForgePresetPanel
                validation={validation}
                handleFixValidation={handleFixValidation}
                handleResetSettings={handleResetSettings}
                copyToClipboard={copyToClipboard}
                baseSpec={baseSpec}
                isCopiedBase={isCopiedBase}
              />

              <div className="flex flex-col gap-6">
                  <div className="flex gap-2 p-2 bg-zinc-900/40 border border-zinc-800/50 rounded-sm shadow-xl w-full">
                      {["NanoBanana", "ChatGPT", "Midjourney", "Overview"].map(tab => (
                          <button key={tab} onClick={() => { setAiModel(tab); setShowOriginalPrompt(false); }} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all ${aiModel === tab ? 'bg-[#488c9c] text-white shadow-2xl scale-[1.02]' : 'text-zinc-500 hover:text-zinc-300'}`}>{tab}</button>
                      ))}
                  </div>

                  <div className="p-8 lg:p-10 rounded-sm border border-zinc-800/60 bg-[#0F0F12] relative shadow-[0_40px_120px_rgba(0,0,0,0.8)] flex flex-col min-h-[500px]">
                      <div className="flex justify-between items-center mb-8 relative z-20">
                          <div className="flex items-center gap-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">
                             <Terminal className="w-5 h-5 opacity-40" /> Prompt Output
                          </div>
                          <div className="flex items-center gap-3">
                              {aiModel !== 'Overview' && (
                                  <>
                                      {optimizedPrompts[aiModel] && (
                                          <button onClick={() => setShowOriginalPrompt(!showOriginalPrompt)} className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase rounded-sm border transition-all shadow-sm active:scale-95 ${showOriginalPrompt ? 'bg-zinc-800 border-zinc-500 text-white' : 'border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
                                              <FileText className="w-3.5 h-3.5" /> {showOriginalPrompt ? '✨ 최적화 뷰' : '📄 원문 뷰'}
                                          </button>
                                      )}
                                      <button onClick={handleOptimizePrompt} disabled={isOptimizing} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase rounded-sm border border-purple-500/40 text-purple-400 hover:bg-purple-600 hover:text-white transition-all shadow-sm active:scale-95">
                                          {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />} 프롬프트 최적화
                                      </button>
                                      <div className="flex bg-black/40 p-1 rounded-sm border border-white/5">
                                          {['EN', 'KR'].map(lang => (
                                              <button key={lang} onClick={toggleLanguage} className={`px-5 py-2 text-[9px] font-black rounded-sm transition-all ${outputLang === lang ? 'bg-[#488c9c] text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-300'}`}>{lang}</button>
                                          ))}
                                      </div>
                                  </>
                              )}
                              <button onClick={() => copyToClipboard(finalOutput, 'enhanced')} className={`p-3 rounded-md transition-all active:scale-90 ${isCopiedEnhanced ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30'}`}>
                                  {isCopiedEnhanced ? <Check className="w-4 h-4 animate-in zoom-in" /> : <Copy className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>

                      <div className={`flex-1 leading-relaxed text-zinc-300 transition-all duration-700 relative z-20 ${isOptimizing || isTranslating ? 'opacity-10 blur-xl scale-[0.98]' : 'opacity-100'}`}>
                          {aiModel === 'Overview' ? (
                              <div className="space-y-6">
                                  {finalOutput.split('\n').map((line, i) => (
                                      <p key={i} className={i === 0 ? "text-3xl font-black text-white mb-8 border-b-2 border-zinc-800/60 pb-6 tracking-tighter" : "text-zinc-500 text-[14px] font-bold leading-8 tracking-tight"}>{line}</p>
                                  ))}
                              </div>
                          ) : (
                              <div className="flex flex-col h-full gap-4 overflow-hidden">
                                  {optimizedPrompts[aiModel] && !showOriginalPrompt ? (
                                      <div className="font-mono text-[14px] leading-[1.6] whitespace-pre-wrap opacity-100 select-all tracking-tight bg-[#488c9c]/10 p-8 rounded-sm border border-[#488c9c]/30 shadow-inner relative flex-1 overflow-y-auto custom-scrollbar">
                                          <div className="absolute top-0 right-0 bg-[#488c9c] text-white text-[9px] px-4 py-1 rounded-bl-sm font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
                                              <SparkleIcon className="w-3 h-3" /> AI Optimized
                                          </div>
                                          {outputLang === "KR" ? (translatedPrompts[aiModel + optimizedPrompts[aiModel]] || optimizedPrompts[aiModel]) : optimizedPrompts[aiModel]}
                                      </div>
                                  ) : (
                                      <div className="font-mono text-[14px] leading-[1.6] whitespace-pre-wrap opacity-90 select-all tracking-tight bg-black/40 p-8 rounded-sm border border-white/5 shadow-inner relative flex-1 overflow-y-auto custom-scrollbar text-[#7ea6ae]">
                                          <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[9px] px-3 py-1 rounded-bl-sm font-bold uppercase">
                                              {optimizedPrompts[aiModel] ? 'Original Output (최적화 전)' : 'Basic Output'}
                                          </div>
                                          {outputLang === "KR" ? (translatedPrompts[aiModel + originalOutput] || originalOutput) : originalOutput}
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="mt-4 p-6 rounded-sm border border-zinc-800/60 bg-[#0F0F12] relative shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                              <BookOpen className="w-4 h-4" /> ✨ Campaign Copy & Vibe
                          </h4>
                          <button onClick={handleGenerateLore} disabled={isGeneratingLore || !finalOutput} className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold transition-all disabled:opacity-30 flex items-center gap-1.5">
                              {isGeneratingLore ? <Loader2 className="w-3 h-3 animate-spin" /> : <SparkleIcon className="w-3 h-3" />} {lore ? '다시 쓰기' : '카피 제안 생성'}
                          </button>
                      </div>
                      {isGeneratingLore ? (
                          <div className="h-16 flex items-center justify-center text-zinc-600 font-bold text-[11px] uppercase tracking-widest animate-pulse">Generating copy...</div>
                      ) : lore ? (
                          <p className="text-[13px] text-zinc-300 leading-loose">{lore}</p>
                      ) : (
                          <p className="text-[11px] text-zinc-600 leading-loose">현재 설정된 프롬프트를 바탕으로 이 에셋이 쓰일법한 매력적인 캠페인 타이틀과 분위기를 제안합니다.</p>
                      )}
                  </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {(isOptimizing || isTranslating || isAnalyzingStyle || isExpandingIntent || isKeywordSetting) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40 backdrop-blur-sm bg-black/20">
              <div className="relative mb-6 text-[#76cee0]">
                  <Stars className="w-24 h-24 animate-pulse" /><Loader2 className="w-12 h-12 absolute inset-0 m-auto animate-spin opacity-40" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.4em] text-[#76cee0] text-center px-20">
                  {isKeywordSetting ? 'Configuring Options...' :
                   isExpandingIntent ? 'Expanding Idea...' :
                   isAnalyzingStyle ? 'Analyzing Reference...' :
                   isTranslating ? 'Translating...' : 'Optimizing Prompt...'}
              </p>
          </div>
      )}
    </div>
  );
}
