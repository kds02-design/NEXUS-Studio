// 디자인 시스템(아틀라스) 모드 우측 패널 — 1 ~ N 슬롯 동적 그리드.
// 변형 모드와 결과 셀 컴포넌트는 공유하지만:
//   - 9-슬라이스 버튼 숨김 (전체 아틀라스는 늘려서 그릴 대상이 아님)
//   - 다운로드 파일 prefix 가 "rubicon-atlas"
//   - 헤더 카피가 "전체 UI 키트 일관 리테마" 로 다름

import { Loader2, Layers, ImagePlus } from 'lucide-react';
import VariationResultCell from './VariationResultCell';

const gridColsClass = (n) => {
  if (n <= 1) return 'grid-cols-1';
  if (n <= 4) return 'grid-cols-2';
  return 'grid-cols-3';
};

export default function ForgeAtlasGrid({ forge }) {
  const {
    atlasSource,
    atlasResults,
    isGeneratingAtlas,
    handleGenerateAtlas,
    handleRegenerateAtlas,
  } = forge;

  const hasAnyResult = atlasResults.some(s => s.dataUrl || s.error);
  const completedCount = atlasResults.filter(s => s.dataUrl).length;
  const totalCount = atlasResults.length;
  const cols = gridColsClass(totalCount);

  return (
    <div className="flex-1 flex flex-col bg-[#050507] overflow-y-auto custom-scrollbar relative">
      <div className="p-8 lg:p-12 max-w-[1200px] mx-auto w-full">

        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-zinc-300">
            <Layers className="w-5 h-5 text-[#76cee0]" />
            <h2 className="text-[18px] font-bold">디자인 시스템 — 아틀라스 리테마</h2>
          </div>
          <p className="text-[12px] text-zinc-500 leading-relaxed break-keep-all">
            원본 아틀라스의 <span className="text-zinc-300">서브 에셋 개수 · 위치 · 외곽선 · 장식 크기</span>는 그대로 두고,
            <span className="text-zinc-300"> 모든 서브 에셋이 동일한 새 테마</span>를 공유하도록 리테마합니다.
            배경은 <span className="text-zinc-300">리얼 블랙 #000000</span> 고정.
          </p>
        </div>

        {/* 원본 + CTA 바 */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl border border-zinc-800/60 bg-[#0F0F12]">
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
            {atlasSource ? (
              <img src={atlasSource} alt="아틀라스" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImagePlus className="w-6 h-6 text-zinc-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-zinc-300">원본 아틀라스</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 break-keep-all">
              {atlasSource
                ? '준비 완료 — 리테마 한 판을 생성합니다'
                : '좌측 사이드바에서 페이지 전체 에셋 시트를 업로드해주세요'}
            </div>
            {hasAnyResult && (
              <div className="text-[10px] text-[#76cee0] mt-1">완료 {completedCount}/{totalCount}</div>
            )}
          </div>
          <button
            onClick={handleGenerateAtlas}
            disabled={!atlasSource || isGeneratingAtlas || totalCount === 0}
            className="px-5 py-3 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#92dceb] font-bold text-[13px] flex items-center gap-2 shadow-lg transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {isGeneratingAtlas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            {isGeneratingAtlas ? '생성 중...' : '리테마 생성'}
          </button>
        </div>

        <div className={`grid gap-4 ${cols}`}>
          {atlasResults.map((slot, idx) => (
            <VariationResultCell
              key={slot.theme.id}
              slot={slot}
              idx={idx}
              onRegenerate={handleRegenerateAtlas}
              showNineSlice={false}
              filePrefix="rubicon-atlas"
              sourceLoaded={!!atlasSource}
            />
          ))}
        </div>

        {!atlasSource && !hasAnyResult && (
          <div className="mt-8 text-[11px] text-zinc-600 leading-relaxed break-keep-all p-4 rounded-lg border border-zinc-800/40 bg-zinc-900/20">
            <div className="font-bold text-zinc-400 mb-2">사용 방법</div>
            1. 좌측에서 원본 <span className="text-zinc-400 font-bold">아틀라스</span>(여러 UI 요소가 한 시트에 배치된 이미지)를 업로드합니다.<br />
            2. 분위기 카테고리·스타일을 고르고, 필요하면 분위기 미세조정(광원 온도·세월감)을 더합니다.<br />
            3. (선택) 배경 참고 이미지를 추가하면 그 배경에 어울리는 통일된 톤으로 조정됩니다.<br />
            4. "리테마 생성" — 결과는 <span className="text-zinc-400 font-bold">모든 서브 에셋이 동일한 테마</span>를 공유하는 새 아틀라스 한 판입니다. 그리드 구조와 장식 크기는 원본 그대로 유지.
          </div>
        )}
      </div>
    </div>
  );
}
