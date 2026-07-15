import { useEffect, useState } from 'react';
import { AlertCircle, ImagePlus, Loader2, MousePointer2 } from 'lucide-react';
import VariationResultCell from './VariationResultCell';
import NineSliceModal from './NineSliceModal';

export default function ForgeReskinGrid({ forge }) {
  const { creationSource, reskinResults, handleRegenerateReskin } = forge;
  const [selectedId, setSelectedId] = useState(null);
  const [nineSliceIdx, setNineSliceIdx] = useState(null);
  const newestId = reskinResults[0]?.resultId || null;

  // 새 렌더가 목록 맨 앞에 추가되면 그 결과를 즉시 선택한다.
  useEffect(() => {
    const timer = window.setTimeout(() => setSelectedId(newestId), 0);
    return () => window.clearTimeout(timer);
  }, [newestId]);

  const selectedIdx = Math.max(0, reskinResults.findIndex(slot => slot.resultId === selectedId));
  const selectedSlot = reskinResults[selectedIdx] || null;
  const nineSliceSlot = nineSliceIdx != null ? reskinResults[nineSliceIdx] : null;

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#050507] overflow-hidden">
      <header className="shrink-0 px-5 lg:px-7 pt-5 pb-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-2 text-zinc-300">
          <MousePointer2 className="w-4 h-4 text-[#76cee0]" />
          <h2 className="text-[15px] font-bold">렌더 결과</h2>
          <span className="text-[10px] text-zinc-500">최근 결과 최대 5개</span>
        </div>

        {reskinResults.length > 0 ? (
          <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1" aria-label="최근 렌더 결과">
            {reskinResults.map((slot, idx) => {
              const active = slot.resultId === selectedSlot?.resultId;
              return (
                <button
                  key={slot.resultId || `${slot.styleId}-${idx}`}
                  type="button"
                  onClick={() => setSelectedId(slot.resultId)}
                  className={`relative w-20 h-16 shrink-0 rounded-lg overflow-hidden border transition-colors bg-black ${active ? 'border-[#76cee0] ring-1 ring-[#76cee0]/30' : 'border-zinc-800 hover:border-zinc-600'}`}
                  title={`${idx + 1}번째 결과 선택`}
                >
                  {slot.dataUrl && <img src={slot.dataUrl} alt="생성 결과 썸네일" className="w-full h-full object-contain" />}
                  {slot.isLoading && <Loader2 className="absolute inset-0 m-auto w-4 h-4 animate-spin text-[#76cee0]" />}
                  {slot.error && <AlertCircle className="absolute inset-0 m-auto w-4 h-4 text-rose-400" />}
                  <span className="absolute left-1 bottom-1 min-w-4 h-4 px-1 rounded bg-black/75 text-[8px] text-zinc-300 flex items-center justify-center">{reskinResults.length - idx}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-zinc-600">좌측에서 설정한 뒤 생성하면 여기에 결과가 순서대로 쌓입니다.</p>
        )}
      </header>

      <main className="flex-1 min-h-0 px-4 lg:px-6 pt-4 lg:pt-6 pb-[100px] flex items-center justify-center overflow-hidden">
        {selectedSlot ? (
          <div className="w-full h-full min-h-0 max-w-[1100px]">
            <VariationResultCell
              key={selectedSlot.resultId}
              slot={selectedSlot}
              idx={selectedIdx}
              onRegenerate={handleRegenerateReskin}
              onOpenNineSlice={setNineSliceIdx}
              showNineSlice
              filePrefix="rubicon-reskin"
              sourceLoaded={!!creationSource}
              fitViewport
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-center text-zinc-600">
            <div className="w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center">
              <ImagePlus className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-zinc-400">아직 생성된 결과가 없습니다</div>
              <div className="text-[10px] mt-1">생성 버튼은 좌측 설정 영역 아래에 있습니다.</div>
            </div>
          </div>
        )}
      </main>

      <NineSliceModal
        key={nineSliceSlot?.dataUrl || 'closed'}
        open={nineSliceIdx != null && !!nineSliceSlot?.dataUrl}
        dataUrl={nineSliceSlot?.dataUrl}
        themeLabel={nineSliceSlot?.theme?.label}
        themeColor={nineSliceSlot?.theme?.color}
        bgHex={nineSliceSlot?.bgHex}
        onClose={() => setNineSliceIdx(null)}
      />
    </div>
  );
}
