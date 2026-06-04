// 변형(단일 에셋) 모드 우측 패널 — 1 ~ N 슬롯 동적 그리드.
// 사용자가 좌측에서 고른 스타일 개수만큼 결과가 표시되며, 도착 순서대로 채워진다.

import { useState } from 'react';
import { Loader2, Sparkles, ImagePlus } from 'lucide-react';
import VariationResultCell from './VariationResultCell';

// 결과 개수에 따른 그리드 컬럼 — 1: 단일, 2~4: 2열, 5+: 3열.
const gridColsClass = (n) => {
  if (n <= 1) return 'grid-cols-1';
  if (n <= 4) return 'grid-cols-2';
  return 'grid-cols-3';
};
import NineSliceModal from './NineSliceModal';

export default function ForgeVariationGrid({ forge }) {
  const {
    sourceAsset,
    variationResults,
    isGeneratingVariations,
    handleGenerateVariations,
  } = forge;

  const [nineSliceIdx, setNineSliceIdx] = useState(null);
  const nineSliceSlot = nineSliceIdx != null ? variationResults[nineSliceIdx] : null;

  const hasAnyResult = variationResults.some(s => s.dataUrl || s.error);
  const completedCount = variationResults.filter(s => s.dataUrl).length;
  const totalCount = variationResults.length;
  const cols = gridColsClass(totalCount);

  return (
    <div className="flex-1 flex flex-col bg-[#050507] overflow-y-auto custom-scrollbar relative">
      <div className="p-8 lg:p-12 max-w-[1200px] mx-auto w-full">

        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-zinc-300">
            <Sparkles className="w-5 h-5 text-[#76cee0]" />
            <h2 className="text-[18px] font-bold">변형(베리에이션) 생성</h2>
          </div>
          <p className="text-[12px] text-zinc-500 leading-relaxed break-keep-all">
            원본의 <span className="text-zinc-300">실루엣 · 외곽선 두께 · 장식 크기 · 비율</span>은 그대로, 좌측에서 고른 스타일 개수만큼 동시 렌더링합니다.
            배경은 <span className="text-zinc-300">리얼 블랙 #000000</span> 고정 — 각 결과에서 <span className="text-zinc-300">투명 PNG</span> 로 바로 추출 가능합니다.
          </p>
        </div>

        {/* 원본 프리뷰 + CTA 바 */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl border border-zinc-800/60 bg-[#0F0F12]">
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
            {sourceAsset ? (
              <img src={sourceAsset} alt="원본" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImagePlus className="w-6 h-6 text-zinc-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-zinc-300">원본 에셋</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 break-keep-all">
              {sourceAsset
                ? `준비 완료 — 변형 ${totalCount}개를 생성합니다`
                : '좌측 사이드바에서 PNG/JPG 를 업로드해주세요'}
            </div>
            {hasAnyResult && (
              <div className="text-[10px] text-[#76cee0] mt-1">완료 {completedCount}/{totalCount}</div>
            )}
          </div>
          <button
            onClick={handleGenerateVariations}
            disabled={!sourceAsset || isGeneratingVariations || totalCount === 0}
            className="px-5 py-3 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#92dceb] font-bold text-[13px] flex items-center gap-2 shadow-lg transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {isGeneratingVariations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGeneratingVariations ? '생성 중...' : `변형 ${totalCount}개 생성`}
          </button>
        </div>

        {/* 동적 그리드 */}
        <div className={`grid gap-4 ${cols}`}>
          {variationResults.map((slot, idx) => (
            <VariationResultCell
              key={slot.theme.id}
              slot={slot}
              idx={idx}
              onRegenerate={forge.handleRegenerateVariation}
              onOpenNineSlice={setNineSliceIdx}
              showNineSlice
              filePrefix="rubicon-variation"
              sourceLoaded={!!sourceAsset}
            />
          ))}
        </div>

        {/* 9-슬라이스 편집기 모달 */}
        <NineSliceModal
          key={nineSliceSlot?.dataUrl || 'closed'}
          open={nineSliceIdx != null && !!nineSliceSlot?.dataUrl}
          dataUrl={nineSliceSlot?.dataUrl}
          themeLabel={nineSliceSlot?.theme?.label}
          themeColor={nineSliceSlot?.theme?.color}
          onClose={() => setNineSliceIdx(null)}
        />

        {!sourceAsset && !hasAnyResult && (
          <div className="mt-8 text-[11px] text-zinc-600 leading-relaxed break-keep-all p-4 rounded-lg border border-zinc-800/40 bg-zinc-900/20">
            <div className="font-bold text-zinc-400 mb-2">사용 방법</div>
            1. 좌측에서 원본 에셋(PNG·JPG)을 업로드합니다.<br />
            2. 분위기 카테고리를 고른 뒤 그 안의 스타일을 원하는 개수(1개 이상)만큼 선택합니다.<br />
            3. (선택) 배경 참고 이미지를 추가하면 그 배경에 어울리는 컬러·형태로 조정됩니다.<br />
            4. "변형 N개 생성" 버튼을 누르면 결과가 도착 순서대로 표시되며, 호버 시 9-슬라이스 / 투명 PNG / 원본 PNG / 프롬프트 / 재시도 버튼이 나타납니다.
          </div>
        )}
      </div>
    </div>
  );
}
