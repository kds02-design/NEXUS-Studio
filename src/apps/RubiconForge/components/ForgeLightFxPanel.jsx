// 광원·빛효과(lightfx) 모드 우측 패널 — 순흑 배경 위 발광 에셋들을 그리드로 표시.
// 결과 셀은 변형/리스킨과 동일한 VariationResultCell 재사용:
//   순흑 배경이라 '투명 PNG'(검은배경 알파 추출) 버튼이 그대로 라이트 에셋 합성에 쓰인다.

import { Loader2, Sparkles } from 'lucide-react';
import VariationResultCell from './VariationResultCell';
import { LIGHTFX_CATEGORY_BY_ID } from '../constants/lightfx';

const gridColsClass = (n) => (n <= 1 ? 'grid-cols-1' : n <= 4 ? 'grid-cols-2' : 'grid-cols-3');

export default function ForgeLightFxPanel({ forge }) {
  const {
    lightFxResults, isGeneratingLightFx, handleGenerateLightFx, handleRegenerateLightFx,
    lightFxCategory, lightFxCount, lightFxRef,
  } = forge;

  const cat = LIGHTFX_CATEGORY_BY_ID[lightFxCategory];
  const total = lightFxResults.length;
  const done = lightFxResults.filter(s => s.dataUrl).length;
  const hasAny = lightFxResults.some(s => s.dataUrl || s.error);
  const cols = gridColsClass(total);

  return (
    <div className="flex-1 flex flex-col bg-[#050507] overflow-y-auto custom-scrollbar relative">
      <div className="p-8 lg:p-12 max-w-[1200px] mx-auto w-full">

        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-zinc-300">
            <Sparkles className="w-5 h-5 text-[#76cee0]" />
            <h2 className="text-[18px] font-bold">광원 · 빛효과 <span className="text-[12px] font-normal text-zinc-500">— 순흑 배경 발광 에셋</span></h2>
          </div>
          <p className="text-[12px] text-zinc-500 leading-relaxed break-keep-all">
            광원·후광·파티클·빛효과를 <span className="text-zinc-300">순흑(#000000) 배경 위 발광 에셋</span>으로 생성합니다.
            <span className="text-zinc-300"> 스크린/애드 블렌드</span>로 오브젝트 위에 바로 얹거나, 각 결과의 <span className="text-zinc-300">투명 PNG</span> 버튼으로 검은 배경을 빼서 합성하세요.
          </p>
        </div>

        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl border border-zinc-800/60 bg-[#0F0F12]">
          {lightFxRef && (
            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
              <img src={lightFxRef} alt="형태 참고" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-zinc-300">{cat?.label || '빛효과'}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 break-keep-all">
              {isGeneratingLightFx ? `${lightFxCount}개 생성 중...` : hasAny ? `완료 ${done}/${total}` : '좌측에서 종류·스타일·컬러를 고르고 생성하세요'}
            </div>
          </div>
          <button
            onClick={handleGenerateLightFx}
            disabled={isGeneratingLightFx}
            className="px-5 py-3 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#8ad8e8] font-bold text-[13px] flex items-center gap-2 transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {isGeneratingLightFx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGeneratingLightFx ? '생성 중...' : `${lightFxCount}개 생성`}
          </button>
        </div>

        {total > 0 ? (
          <div className={`grid gap-4 ${cols}`}>
            {lightFxResults.map((slot, idx) => (
              <VariationResultCell
                key={slot.theme.id}
                slot={slot}
                idx={idx}
                onRegenerate={handleRegenerateLightFx}
                showNineSlice={false}
                filePrefix="rubicon-lightfx"
                sourceLoaded
              />
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-600 leading-relaxed break-keep-all p-4 rounded-lg border border-zinc-800/40 bg-zinc-900/20">
            <div className="font-bold text-zinc-400 mb-2">사용 방법</div>
            1. 좌측에서 <span className="text-zinc-400 font-bold">종류</span>(광원·후광·파티클·빛효과), <span className="text-zinc-400 font-bold">스타일</span>, <span className="text-zinc-400 font-bold">컬러</span>를 고릅니다.<br />
            2. (선택) 빛을 감쌀 <span className="text-zinc-400 font-bold">형태 참고</span> 이미지를 올리면 그 실루엣에 맞춰 후광/광선이 배치됩니다 (참고 오브젝트 자체는 결과에 나오지 않음).<br />
            3. "N개 생성" → 변형 N개가 순흑 배경 발광 에셋으로 나옵니다. 투명 PNG / 원본 PNG / 프롬프트 / 재생성 가능.<br />
            <span className="text-zinc-500">로그인 시 결과는 PromptArc '광원 보관함' 폴더에 자동 저장됩니다.</span>
          </div>
        )}
      </div>
    </div>
  );
}
