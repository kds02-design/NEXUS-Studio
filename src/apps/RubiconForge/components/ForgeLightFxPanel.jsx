import { useEffect, useState } from 'react';
import { AlertCircle, ImagePlus, Loader2, Sparkles, Wand2, Check } from 'lucide-react';
import VariationResultCell from './VariationResultCell';

export default function ForgeLightFxPanel({ forge }) {
  const { lightFxResults, handleRegenerateLightFx, lightFxRef, handleUseAsLightFxBase, lightFxBase } = forge;
  const [selectedId, setSelectedId] = useState(null);
  const newestId = lightFxResults[0]?.resultId || null;

  useEffect(() => {
    const timer = window.setTimeout(() => setSelectedId(newestId), 0);
    return () => window.clearTimeout(timer);
  }, [newestId]);

  const selectedIdx = Math.max(0, lightFxResults.findIndex(slot => slot.resultId === selectedId));
  const selectedSlot = lightFxResults[selectedIdx] || null;

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#050507] overflow-hidden">
      <header className="shrink-0 px-5 lg:px-7 pt-5 pb-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-2 text-zinc-300">
          <Sparkles className="w-4 h-4 text-[#76cee0]" /><h2 className="text-[15px] font-bold">광원·빛효과 결과</h2><span className="text-[10px] text-zinc-500">최근 결과 최대 5개</span>
          {selectedSlot?.dataUrl && !selectedSlot.isLoading && (() => {
            const isBase = lightFxBase?.resultId && lightFxBase.resultId === selectedSlot.resultId;
            return (
              <button
                onClick={() => handleUseAsLightFxBase?.(selectedSlot)}
                title="이 광원을 변형 base 로 지정 — 방식·배치는 유지하고 디테일은 새로 고품질로"
                className={`ml-auto shrink-0 h-7 px-2.5 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${isBase ? 'bg-[#76cee0]/15 border-[#76cee0]/50 text-[#76cee0]' : 'bg-[#141417] border-zinc-700 text-zinc-300 hover:border-[#76cee0]/50 hover:text-[#76cee0]'}`}>
                {isBase ? <><Check className="w-3.5 h-3.5" /> 변형 base</> : <><Wand2 className="w-3.5 h-3.5" /> 이 광원 변형</>}
              </button>
            );
          })()}
        </div>
        {lightFxResults.length > 0 ? <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
          {lightFxResults.map((slot, idx) => <button key={slot.resultId || idx} onClick={() => setSelectedId(slot.resultId)} className={`relative w-20 h-16 shrink-0 rounded-lg overflow-hidden border bg-black ${slot.resultId === selectedSlot?.resultId ? 'border-[#76cee0] ring-1 ring-[#76cee0]/30' : 'border-zinc-800 hover:border-zinc-600'}`}>
            {slot.dataUrl && <img src={slot.dataUrl} alt="빛효과 썸네일" className="w-full h-full object-contain" />}
            {slot.isLoading && <Loader2 className="absolute inset-0 m-auto w-4 h-4 animate-spin text-[#76cee0]" />}
            {slot.error && <AlertCircle className="absolute inset-0 m-auto w-4 h-4 text-rose-400" />}
            <span className="absolute left-1 bottom-1 min-w-4 h-4 px-1 rounded bg-black/75 text-[8px] text-zinc-300">{lightFxResults.length - idx}</span>
          </button>)}
        </div> : <p className="mt-2 text-[10px] text-zinc-600">좌측에서 설정한 뒤 생성하면 결과가 순서대로 쌓입니다.</p>}
      </header>
      <main className="flex-1 min-h-0 px-4 lg:px-6 pt-4 lg:pt-6 pb-[100px] flex items-center justify-center overflow-hidden">
        {selectedSlot ? <div className="w-full h-full min-h-0 max-w-[800px]"><VariationResultCell key={selectedSlot.resultId} slot={selectedSlot} idx={selectedIdx} onRegenerate={handleRegenerateLightFx} showNineSlice={false} filePrefix="rubicon-lightfx" compositeRef={lightFxRef} sourceLoaded fitViewport maskForgeMethod="effect" /></div>
          : <div className="flex flex-col items-center gap-3 text-center text-zinc-600"><div className="w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center"><ImagePlus className="w-6 h-6" /></div><div><div className="text-[12px] font-semibold text-zinc-400">아직 생성된 결과가 없습니다</div><div className="text-[10px] mt-1">생성 버튼은 좌측 설정 영역 아래에 있습니다.</div></div></div>}
      </main>
    </div>
  );
}
