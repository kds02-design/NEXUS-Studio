import { Sparkles, Cpu, Loader2, RefreshCcw, Star, Palette, Type, Layers, Wand2, Activity } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';
import { staticOptions } from '../constants/presets.js';
import { ChipGroup, Collapsible, Tooltip } from './ui.jsx';

// 단계별 흐름: ① 추천 / ② 스타일 / ③ 핵심 설정 / ④ 더 세밀하게(collapsible)
// 모든 옵션은 chip 그리드로 통일 — 한 눈에 스캔 가능, dropdown 열기 단계 제거.
export default function BreezePresetPanel() {
  const b = useBreeze();
  const accent = '#A78BFA';

  // 16개 스타일 — 5개씩 줄바꿈(2-col 카드). 카드 안은 짧은 한글명 + 영문 한 줄.
  const styleCards = [...staticOptions.CasualStyles, ...(b.dynamicOptions.CasualStyles || [])];

  return (
    <div className="space-y-4">
      {/* ① 빠른 시작 — Smart Auto-Setup + Reset + 추천 메시지 */}
      <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 to-[#111111] p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-300" />
          <p className="text-[11px] font-bold text-violet-200">AI 가 모든 옵션을 한 번에 추천</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={b.handleAiRecommendation}
            disabled={b.isRecommending}
            className="flex-1 py-2 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            {b.isRecommending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
            Smart Auto-Setup
          </button>
          <Tooltip text="모든 옵션 초기화">
            <button onClick={b.handleReset} className="w-9 rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center">
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
        {b.aiRecSummary && (
          <div className="rounded-md bg-black/30 border border-violet-500/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1"><Star className="w-3 h-3 text-violet-400" /><p className="text-[10px] font-bold text-violet-300">{b.aiRecSummary.title}</p></div>
            <p className="text-[10px] leading-relaxed text-zinc-400">{b.aiRecSummary.reason}</p>
          </div>
        )}
      </div>

      {/* ② 글자 스타일 — 가장 임팩트 큰 단일 선택. 시각적 2-col 카드. */}
      <section>
        <div className="flex items-center gap-2 mb-2 px-0.5">
          <Palette className="w-3.5 h-3.5 text-zinc-500" />
          <h3 className="text-[11px] font-bold text-zinc-200">글자 스타일</h3>
          <span className="text-[10px] text-zinc-500">— 가장 큰 영향</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {styleCards.map((s) => {
            const active = b.scriptType === s.id;
            const ko = s.name.split(/[(（]/)[0].trim();
            const en = (s.name.match(/[(（]([^)）]+)[)）]/)?.[1] || '').trim();
            return (
              <button
                key={s.id}
                onClick={() => b.handleScriptPresetChange(s.id)}
                title={s.name}
                className={`text-left px-2.5 py-2 rounded-lg border transition-colors ${active ? 'bg-zinc-900 text-white' : 'bg-[#0F0F0F] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
                style={active ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}40` } : {}}
              >
                <div className="text-[11px] font-bold leading-tight">{ko}</div>
                {en && <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{en}</div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* ③ 핵심 설정 — 한 화면에서 빠르게 결정 가능한 4개. */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-0.5">
          <Type className="w-3.5 h-3.5 text-zinc-500" />
          <h3 className="text-[11px] font-bold text-zinc-200">핵심 설정</h3>
        </div>
        <div className="p-3 rounded-xl border border-zinc-800 bg-[#0E0E0E] space-y-3">
          <ChipGroup label="배경" data={staticOptions.base} value={b.baseStyle} onChange={b.setBaseStyle} columns={2} accent={accent} />
          <ChipGroup label="비율" data={staticOptions.ratios} value={b.aspectRatio} onChange={b.setAspectRatio} columns={3} accent={accent} />
          <ChipGroup label="배치" data={staticOptions.layouts} value={b.layoutType} onChange={b.setLayoutType} columns={2} accent={accent} />
          <ChipGroup label="글자 두께" data={[...staticOptions.strokeWeights, ...(b.dynamicOptions.strokeWeights || [])]} value={b.stemWeight} onChange={b.setStemWeight} columns={4} accent={accent} />
        </div>
      </section>

      {/* ④ 더 세밀하게 — 토글 켜야 프롬프트에 반영. */}
      <section>
        <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-[#0F0F0F]">
          <div className="flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-zinc-500" />
            <div>
              <p className="text-[11px] font-bold text-zinc-200">더 세밀하게</p>
              <p className="text-[9px] text-zinc-500 mt-0.5">글자 형태·획·장식·리듬을 직접 조정</p>
            </div>
          </div>
          <button onClick={() => b.setIsAdvancedOptionsEnabled(!b.isAdvancedOptionsEnabled)} className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${b.isAdvancedOptionsEnabled ? 'bg-violet-500' : 'bg-zinc-800'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${b.isAdvancedOptionsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        {b.isAdvancedOptionsEnabled && (
          <div className="mt-3 space-y-2">
            <Collapsible title="글자 형태" icon={<Type className="w-3.5 h-3.5 text-zinc-500" />} accent={accent} defaultOpen>
              <ChipGroup label="자간" data={[...staticOptions.kerningOptions, ...(b.dynamicOptions.kerningOptions || [])]} value={b.kerning} onChange={b.setKerning} columns={3} accent={accent} />
              <ChipGroup label="비례" data={staticOptions.proportions} value={b.charProportion} onChange={b.setCharProportion} columns={5} accent={accent} />
              <ChipGroup label="너비" data={staticOptions.widths} value={b.charWidth} onChange={b.setCharWidth} columns={3} accent={accent} />
              <ChipGroup label="여백 점유율" data={staticOptions.occupancies} value={b.occupancy} onChange={b.setOccupancy} columns={5} accent={accent} />
            </Collapsible>

            <Collapsible title="획 디자인" icon={<Activity className="w-3.5 h-3.5 text-zinc-500" />} accent={accent}>
              <ChipGroup label="마감" data={[...staticOptions.strokeEnds, ...(b.dynamicOptions.strokeEnds || [])]} value={b.terminalStyle} onChange={b.setTerminalStyle} columns={3} accent={accent} />
              <ChipGroup label="질감" data={[...staticOptions.strokeTextures, ...(b.dynamicOptions.strokeTextures || [])]} value={b.strokeTexture} onChange={b.setStrokeTexture} columns={3} accent={accent} />
              <ChipGroup label="선명도" data={[...staticOptions.strokeSharpness, ...(b.dynamicOptions.strokeSharpness || [])]} value={b.strokeSharpness} onChange={b.setStrokeSharpness} columns={2} accent={accent} />
              <ChipGroup label="연장" data={[...staticOptions.strokeExtensions, ...(b.dynamicOptions.strokeExtensions || [])]} value={b.strokeExtension} onChange={b.setStrokeExtension} columns={3} accent={accent} />
            </Collapsible>

            <Collapsible title="장식 · 배경 효과" icon={<Layers className="w-3.5 h-3.5 text-zinc-500" />} accent={accent}>
              <ChipGroup label="내부 채움" data={staticOptions.InternalDecorations} value={b.internalDecoration} onChange={b.setInternalDecoration} columns={3} accent={accent} />
              <ChipGroup label="베이스라인 흐름" data={staticOptions.TextFlows} value={b.textFlow} onChange={b.setTextFlow} columns={4} accent={accent} />
              <ChipGroup label="글자 연결" data={staticOptions.LetterConnections} value={b.letterConnection} onChange={b.setLetterConnection} columns={3} accent={accent} />
              <ChipGroup label="주변 장식" data={staticOptions.CasualSurroundings} value={b.casualSurrounding} onChange={b.setCasualSurrounding} columns={3} accent={accent} />
            </Collapsible>

            <Collapsible title="리듬 · 변형" icon={<Wand2 className="w-3.5 h-3.5 text-zinc-500" />} accent={accent}>
              <ChipGroup label="리듬" data={[...staticOptions.rhythmDynamics, ...(b.dynamicOptions.rhythmDynamics || [])]} value={b.rhythmDynamic} onChange={b.setRhythmDynamic} columns={3} accent={accent} />
              <ChipGroup label="기울기" data={staticOptions.slantAngles} value={b.slantAngle} onChange={b.setSlantAngle} columns={3} accent={accent} />
              <ChipGroup label="왜곡" data={[...staticOptions.playfulDistortions, ...(b.dynamicOptions.playfulDistortions || [])]} value={b.playfulDistortion} onChange={b.setPlayfulDistortion} columns={2} accent={accent} />
              <ChipGroup label="아날로그 결점" data={[...staticOptions.analogImperfections, ...(b.dynamicOptions.analogImperfections || [])]} value={b.analogImperfection} onChange={b.setAnalogImperfection} columns={2} accent={accent} />
            </Collapsible>
          </div>
        )}
      </section>
    </div>
  );
}
