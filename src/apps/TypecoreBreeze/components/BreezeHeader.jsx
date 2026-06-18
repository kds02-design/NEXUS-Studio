// TypecoreBreeze 의 Creation 뷰 좌측 상단 — 초보자 5분 온보딩 패턴.
// TypecoreSovereign 의 StepCard / FRIENDLY 패턴을 차용해 ① 텍스트 → ② 분위기 → ③ 레퍼런스 순서로 단순화.
import { ChevronDown, Star, MessageSquare, Wand2 as Wand2Icon, Loader2, Image as ImageIcon, X, ScanLine, Type, Sparkles } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';
import { directorPersonas, sliderDesc } from '../constants/categories.jsx';
import { Tooltip } from './ui.jsx';
import { StepCard, FieldHeader } from '../../../components/SovereignKit.jsx';

const ACCENT = '#D4AF37';

// 친근 라벨 사전 — 전문용어를 한국어 직관 표현으로 매핑. 원본 용어는 pro 툴팁으로 보존.
const FRIENDLY = {
  text:     { label: '어떤 글자?',           hint: '실제로 그려질 텍스트',                      pro: 'Subject Text' },
  persona:  { label: '스타일 분위기',         hint: '글자가 풍기는 큰 톤 — 첫 결정 포인트',      pro: 'Director Persona' },
  aura:     { label: '분위기 묘사 (선택)',   hint: '원하는 느낌을 자유롭게 — 비워둬도 OK',      pro: 'Design Aura' },
  styleRef: { label: '레퍼런스 스타일 (선택)', hint: '비슷한 분위기 이미지를 올리면 스타일 추출', pro: 'Reference Style (I2P)' },
};

export default function BreezeHeader() {
  const {
    aiPersona, setAiPersona, personaDropdownOpen, setPersonaDropdownOpen,
    selectedCategory,
    inputText, setInputText,
    customDesignInjections, setCustomDesignInjections,
    personaSliderValue, setPersonaSliderValue,
    isExpandingIntent, handleExpandIntent, openTuningRoom,
    styleImage, setStyleImage,
    isStyleDragging, isAnalyzingStyle, analyzeStyleImage,
    handleStyleDragOver, handleStyleDragLeave, handleStyleDrop, handleStyleImageUpload,
  } = useBreeze();

  const activePersona = directorPersonas.find(p => p.id === aiPersona);

  return (
    <div className="space-y-3">
      {/* Step 1 — 어떤 글자? */}
      <StepCard step="1" accent={ACCENT} title={FRIENDLY.text.label} hint={FRIENDLY.text.hint} pro={FRIENDLY.text.pro}>
        <FieldHeader icon={<Type className="w-3 h-3" />} label="텍스트 입력" hint="짧을수록 또렷 · 엔터로 줄바꿈 (최대 3줄)" />
        <textarea
          value={inputText}
          onChange={e => {
            // 최대 3줄 — 초과 입력/붙여넣기는 앞 3줄로 자름.
            const lines = e.target.value.split('\n');
            setInputText(lines.length > 3 ? lines.slice(0, 3).join('\n') : e.target.value);
          }}
          rows={Math.min(3, (inputText.match(/\n/g)?.length || 0) + 1)}
          className="w-full bg-transparent border-b border-zinc-600 focus:border-[#D4AF37] text-[18px] font-bold outline-none pb-2 text-zinc-100 transition-colors placeholder:text-zinc-600 resize-none custom-scrollbar leading-tight"
          placeholder="예: BREEZE · 산들바람 (엔터로 줄바꿈, 최대 3줄)"
        />
      </StepCard>

      {/* Step 2 — 스타일 분위기 (페르소나 + 자유 묘사) */}
      <StepCard step="2" accent={ACCENT} title={FRIENDLY.persona.label} hint={FRIENDLY.persona.hint} pro={FRIENDLY.persona.pro}>
        {/* Director Persona dropdown */}
        <div>
          <FieldHeader icon={<Star className="w-3 h-3" />} label="페르소나 선택" hint="감독 스타일 — 한 줄 분위기" pro="Director Persona" />
          <div className="relative">
            <button onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)} className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-700/80 bg-[#16161D] hover:border-zinc-600 transition-all text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="text-zinc-400 bg-zinc-800 p-1.5 rounded">{activePersona?.icon || <Star className="w-3.5 h-3.5" />}</div>
                <div className="overflow-hidden">
                  <div className="text-[11px] font-bold text-zinc-200 truncate">{activePersona?.shortTitle || '페르소나 선택'}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{activePersona?.subtitle || '...'}</div>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform shrink-0 ${personaDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {personaDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-zinc-700 rounded-lg overflow-hidden shadow-2xl z-[1000] flex flex-col max-h-[280px] overflow-y-auto custom-scrollbar">
                {directorPersonas.filter(p => p.category === selectedCategory).map(p => (
                  <button key={p.id} onClick={() => { setAiPersona(p.id); setPersonaDropdownOpen(false); }} className={`w-full text-left p-2.5 flex items-center gap-2.5 transition-all ${aiPersona === p.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}>
                    <div className={`p-1.5 rounded ${aiPersona === p.id ? 'bg-white text-black' : 'bg-[#111] text-zinc-500'}`}>{p.icon}</div>
                    <div className="flex-1 overflow-hidden">
                      <div className={`text-[11px] font-bold truncate ${aiPersona === p.id ? 'text-white' : 'text-zinc-300'}`}>{p.shortTitle}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{p.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Design Aura — 자유 묘사 */}
        <div className="pt-1">
          <FieldHeader
            icon={<Sparkles className="w-3 h-3 text-violet-400" />}
            label={FRIENDLY.aura.label}
            hint={FRIENDLY.aura.hint}
            pro={FRIENDLY.aura.pro}
            right={(
              <div className="flex gap-1">
                <Tooltip text="AI 튜닝 어시스턴트">
                  <button onClick={openTuningRoom} disabled={!customDesignInjections.trim()} className={`w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!customDesignInjections.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-900/50 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/50'}`}>
                    <MessageSquare className="w-2.5 h-2.5" />
                  </button>
                </Tooltip>
                <Tooltip text="키워드 상세 구체화">
                  <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections.trim()} className={`w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isExpandingIntent ? 'bg-violet-600 text-white' : (!customDesignInjections.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-900/50 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/50')}`}>
                    {isExpandingIntent ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wand2Icon className="w-2.5 h-2.5" />}
                  </button>
                </Tooltip>
              </div>
            )}
          />
          <textarea
            value={customDesignInjections}
            onChange={e => setCustomDesignInjections(e.target.value)}
            placeholder="예: 미니멀, 바운시, 손글씨 느낌"
            className="w-full bg-[#1A1A24] border border-violet-500/30 text-[11px] rounded-md p-2.5 outline-none min-h-[3.5rem] resize-none text-violet-100 custom-scrollbar focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-zinc-600"
          />
          <div className="mt-2 px-0.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-bold text-zinc-500">{sliderDesc.leftLabel}</span>
              <span className="text-[9px] font-bold text-zinc-500">{sliderDesc.rightLabel}</span>
            </div>
            <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:rounded-full" />
          </div>
        </div>
      </StepCard>

      {/* Step 3 — 레퍼런스 스타일 (선택) */}
      <StepCard step="3" accent={ACCENT} title={FRIENDLY.styleRef.label} hint={FRIENDLY.styleRef.hint} pro={FRIENDLY.styleRef.pro}>
        <div
          onDragOver={handleStyleDragOver}
          onDragLeave={handleStyleDragLeave}
          onDrop={handleStyleDrop}
          className={`relative rounded-lg border-2 border-dashed p-3 transition-all flex flex-col items-center justify-center min-h-[80px] ${isStyleDragging ? 'border-violet-500 bg-violet-900/20' : 'border-zinc-700 bg-[#111] hover:border-zinc-500'}`}
        >
          {styleImage ? (
            <div className="w-full space-y-2.5">
              <div className="relative group mx-auto w-max">
                <img src={styleImage} alt="style reference" className="h-12 object-cover rounded border border-zinc-600" />
                <button onClick={() => setStyleImage(null)} className="absolute -top-1 -right-1 p-1 bg-black/80 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3 text-zinc-300" />
                </button>
              </div>
              <button onClick={analyzeStyleImage} disabled={isAnalyzingStyle} className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(139,92,246,0.3)] disabled:opacity-60">
                {isAnalyzingStyle ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />} 스타일 추출
              </button>
            </div>
          ) : (
            <div className="text-center pointer-events-none">
              <ImageIcon className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
              <div className="text-[10px] text-zinc-400">이미지를 끌어다 놓거나 클릭</div>
            </div>
          )}
          {!styleImage && <input type="file" accept="image/*" onChange={handleStyleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
        </div>
      </StepCard>
    </div>
  );
}
