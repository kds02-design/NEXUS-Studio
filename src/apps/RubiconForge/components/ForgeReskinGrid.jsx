// 버튼 리스킨(creation) 모드 우측 패널 — 업로드한 기존 버튼을 선택한 테마 톤마다 한 장씩
// recolor/retexture 한 결과를 동적 그리드로 표시. 구조·텍스트·비율은 보존되고 색/재질만 바뀐다.
// 결과 셀은 변형 모드와 동일한 VariationResultCell 을 재사용(9-슬라이스 / 투명 PNG / 프롬프트 / 재시도).

import { useState } from 'react';
import { Loader2, MousePointer2, ImagePlus } from 'lucide-react';
import VariationResultCell from './VariationResultCell';
import NineSliceModal from './NineSliceModal';

// 결과 개수에 따른 그리드 컬럼 — 1: 단일, 2~4: 2열, 5+: 3열.
const gridColsClass = (n) => {
  if (n <= 1) return 'grid-cols-1';
  if (n <= 4) return 'grid-cols-2';
  return 'grid-cols-3';
};

export default function ForgeReskinGrid({ forge }) {
  const {
    creationSource,
    reskinResults,
    isGeneratingReskin,
    handleGenerateReskin,
    handleRegenerateReskin,
  } = forge;

  const [nineSliceIdx, setNineSliceIdx] = useState(null);
  const nineSliceSlot = nineSliceIdx != null ? reskinResults[nineSliceIdx] : null;

  const hasAnyResult = reskinResults.some(s => s.dataUrl || s.error);
  const completedCount = reskinResults.filter(s => s.dataUrl).length;
  const totalCount = reskinResults.length;
  const cols = gridColsClass(totalCount);

  return (
    <div className="flex-1 flex flex-col bg-[#050507] overflow-y-auto custom-scrollbar relative">
      <div className="p-8 lg:p-12 max-w-[1200px] mx-auto w-full">

        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-zinc-300">
            <MousePointer2 className="w-5 h-5 text-[#76cee0]" />
            <h2 className="text-[18px] font-bold">리스킨 <span className="text-[12px] font-normal text-zinc-500">— 형태 유지, 색·재질만 교체</span></h2>
          </div>
          <p className="text-[12px] text-zinc-500 leading-relaxed break-keep-all">
            이미 만든 에셋(버튼·프레임·아이콘 등) 1개를 올리면, <span className="text-zinc-300">형태·테두리 두께·텍스트·비율은 그대로</span> 두고 좌측에서 고른 <span className="text-zinc-300">테마 톤</span>마다 색·표면·재질만 갈아끼운 버전을 한 장씩 만듭니다.
            배경은 <span className="text-zinc-300">리얼 블랙 #000000</span> 고정 — 결과에서 <span className="text-zinc-300">투명 PNG</span> 로 바로 추출 가능합니다.
          </p>
        </div>

        {/* 원본 프리뷰 + CTA 바 */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl border border-zinc-800/60 bg-[#0F0F12]">
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
            {creationSource ? (
              <img src={creationSource} alt="원본 에셋" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImagePlus className="w-6 h-6 text-zinc-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-zinc-300">원본 에셋</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 break-keep-all">
              {creationSource
                ? `준비 완료 — 테마 톤 ${totalCount}개로 리스킨합니다`
                : '좌측 사이드바에서 원본 에셋(PNG/JPG)을 업로드해주세요'}
            </div>
            {hasAnyResult && (
              <div className="text-[10px] text-[#76cee0] mt-1">완료 {completedCount}/{totalCount}</div>
            )}
          </div>
          <button
            onClick={handleGenerateReskin}
            disabled={!creationSource || isGeneratingReskin || totalCount === 0}
            className="px-5 py-3 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#92dceb] font-bold text-[13px] flex items-center gap-2 shadow-lg transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {isGeneratingReskin ? <Loader2 className="w-4 h-4 animate-spin" /> : <MousePointer2 className="w-4 h-4" />}
            {isGeneratingReskin ? '생성 중...' : `${totalCount}종 리스킨`}
          </button>
        </div>

        {/* 동적 그리드 */}
        <div className={`grid gap-4 ${cols}`}>
          {reskinResults.map((slot, idx) => (
            <VariationResultCell
              key={slot.theme.id}
              slot={slot}
              idx={idx}
              onRegenerate={handleRegenerateReskin}
              onOpenNineSlice={setNineSliceIdx}
              showNineSlice
              filePrefix="rubicon-reskin"
              sourceLoaded={!!creationSource}
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
          bgHex={nineSliceSlot?.bgHex}
          onClose={() => setNineSliceIdx(null)}
        />

        {!creationSource && !hasAnyResult && (
          <div className="mt-8 text-[11px] text-zinc-600 leading-relaxed break-keep-all p-4 rounded-lg border border-zinc-800/40 bg-zinc-900/20">
            <div className="font-bold text-zinc-400 mb-2">사용 방법</div>
            1. 좌측에서 바꾸고 싶은 <span className="text-zinc-400 font-bold">원본 에셋</span>(버튼·프레임·아이콘 · PNG·JPG) 1개를 업로드합니다.<br />
            2. <span className="text-zinc-400 font-bold">분위기 카테고리</span>를 고르고, 적용할 <span className="text-zinc-400 font-bold">테마 톤</span>을 원하는 만큼 선택합니다(톤 수 = 생성 장수).<br />
            3. (선택) 정제 강도·분위기 미세조정·배경 참고로 결과를 더 다듬습니다.<br />
            4. "N종 리스킨" 을 누르면 톤마다 한 장씩 표시되며, 호버 시 9-슬라이스 / 투명 PNG / 원본 PNG / 프롬프트 / 재시도 버튼이 나타납니다.
          </div>
        )}
      </div>
    </div>
  );
}
