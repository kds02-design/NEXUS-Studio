// 좌측 사이드바 — 뷰별 컨트롤.
//   creation   → 버튼 리스킨: 기존 버튼 업로드 → 분위기 카테고리 → 테마 톤(다중) → 세부 조정 → 렌더 → 생성
//   micro-edit → 세부 에셋 디자인 대안
//   atlas      → 디자인 시스템(아틀라스) 리테마

import {
  ChevronDown, UploadCloud, X,
  MousePointer2,
  Sparkle as SparkleIcon, Loader2, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { VARIATION_MOODS, VARIATION_STYLES, REFINEMENT_LEVELS, ATMOSPHERE_TEMPERATURE, ATMOSPHERE_AGE, DESIGN_VARIATIONS, VARIATION_STRENGTH } from '../constants/variations';
import { VECTOR_CATEGORIES, VECTOR_STYLES, VECTOR_PALETTES, VECTOR_COUNTS } from '../constants/vectors';
import { IMAGEN_MODELS, RENDER_SIZES, isProImageModel } from '../../../lib/imagenRender';
import ForgeHeader from './ForgeHeader';

// 분위기 미세조정 다이얼의 한 행(축) — 5단계 칩. 모듈 레벨 컴포넌트(렌더 중 생성 금지).
function AtmosphereRow({ title, options, value, onChange }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">{title}</div>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map(opt => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              title={opt.desc}
              className={`px-1 py-2 rounded-md border text-[10px] font-semibold leading-tight transition-colors text-center break-keep-all ${active ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-[#141417] border-zinc-800/80 text-zinc-400 hover:border-zinc-700'}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 출력 해상도 토글 — 변형/아틀라스 공용. Pro 모델만 2K/4K 유효(Flash 는 1K 고정).
function ResolutionToggle({ modelId, value, onChange, disabled }) {
  const isPro = isProImageModel(modelId);
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">출력 해상도</h3>
        {!isPro && <span className="text-[10px] text-zinc-600">2K·4K 는 Pro 모델만</span>}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {RENDER_SIZES.map(sz => {
          const sizeDisabled = disabled || (!isPro && sz.id !== '1K');
          const active = isPro ? value === sz.id : sz.id === '1K';
          return (
            <button
              key={sz.id}
              onClick={() => onChange(sz.id)}
              disabled={sizeDisabled}
              title={sz.desc}
              className={`px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{sz.label}</div>
              <div className="text-[9px] text-zinc-500 truncate">{sz.desc}</div>
            </button>
          );
        })}
      </div>
      {isPro && value === '4K' && (
        <p className="text-[10px] text-amber-400/70 mt-2 leading-relaxed break-keep-all">
          4K 는 생성 시간·단가가 올라갑니다. 작은 서브 에셋이 많은 시트의 디테일·텍스트 보존에 특히 유리.
        </p>
      )}
    </section>
  );
}

// 분위기 미세조정 다이얼 — 변형/아틀라스 두 모드 공용. 무드·정제와 직교하는 3번째 축.
// 광원 온도(5단) + 마모/세월감(5단). 양 끝 사이 'neutral' 이 변화 없음(원본).
function AtmosphereDials({ temperature, age, onTemperature, onAge }) {
  return (
    <section>
      <h3 className="text-[12px] font-semibold text-zinc-300 mb-1">
        분위기 미세조정 <span className="text-[10px] font-normal text-zinc-500">· 구조 유지, 색온도/표면만</span>
      </h3>
      <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed break-keep-all">
        무드·정제와 별개로, 같은 골격을 유지한 채 <span className="text-zinc-400">광원 색온도</span>와 <span className="text-zinc-400">표면 세월감</span>만 미세하게 트는 축입니다. 가운데 <span className="text-zinc-400">원본</span>은 변화 없음.
      </p>
      <div className="space-y-3">
        <AtmosphereRow title="광원 온도" options={ATMOSPHERE_TEMPERATURE} value={temperature} onChange={onTemperature} />
        <AtmosphereRow title="마모 / 세월감" options={ATMOSPHERE_AGE} value={age} onChange={onAge} />
      </div>
    </section>
  );
}

export default function ForgeSidebar({ forge }) {
  const {
    currentView, setCurrentView,
    // 버튼 리스킨(creation) 모드
    creationSource, isDraggingCreationSource,
    handleCreationSourceUpload, handleCreationSourceDragOver, handleCreationSourceDragLeave, handleCreationSourceDrop, handleClearCreationSource,
    creationBgRef, isDraggingCreationBg,
    handleCreationBgUpload, handleCreationBgDragOver, handleCreationBgDragLeave, handleCreationBgDrop, handleClearCreationBg,
    reskinMoodId, selectedReskinStyleIds, handleSelectReskinMood, handleToggleReskinStyle,
    isGeneratingReskin, handleGenerateReskin,
    reskinRefinementLevel, setReskinRefinementLevel,
    reskinTemperature, setReskinTemperature, reskinAge, setReskinAge,
    reskinImageSize, setReskinImageSize,
    creationRenderModel, setCreationRenderModel,
    // 벡터 생성 모드
    vectorCategory, setVectorCategory,
    vectorStyle, setVectorStyle,
    vectorPalette, setVectorPalette,
    vectorText, setVectorText,
    vectorCount, setVectorCount,
    isGeneratingVector, handleGenerateVector,
    // 변형 모드
    sourceAsset, isDraggingSource,
    handleSourceUpload, handleSourceDragOver, handleSourceDragLeave, handleSourceDrop, handleClearSource,
    backgroundRef, isDraggingBackground,
    handleBackgroundUpload, handleBackgroundDragOver, handleBackgroundDragLeave, handleBackgroundDrop, handleClearBackground,
    selectedVariationIds, handleToggleVariation,
    variationStrength, setVariationStrength,
    isGeneratingVariations, handleGenerateVariations,
    variationRenderModel, setVariationRenderModel,
    variationImageSize, setVariationImageSize,
    // 아틀라스 모드
    atlasSource, isDraggingAtlasSource,
    handleAtlasSourceUpload, handleAtlasSourceDragOver, handleAtlasSourceDragLeave, handleAtlasSourceDrop, handleClearAtlasSource,
    atlasBackgroundRef, isDraggingAtlasBackground,
    handleAtlasBackgroundUpload, handleAtlasBackgroundDragOver, handleAtlasBackgroundDragLeave, handleAtlasBackgroundDrop, handleClearAtlasBackground,
    selectedAtlasMoodId, selectedAtlasStyleIds,
    handleSelectAtlasMood, handleToggleAtlasStyle,
    isGeneratingAtlas, handleGenerateAtlas,
    atlasRefinementLevel, setAtlasRefinementLevel,
    atlasTemperature, setAtlasTemperature, atlasAge, setAtlasAge,
    atlasRenderModel, setAtlasRenderModel,
    atlasImageSize, setAtlasImageSize,
    atlasSpec, setAtlasSpec, atlasSpecTitle, setAtlasSpecTitle,
  } = forge;

  // 마스터 명세 패널 — 펼침 상태. 명세가 있으면 사용자가 실제 모델로 전송되는 텍스트를 확인·편집 가능.
  const [atlasSpecOpen, setAtlasSpecOpen] = useState(false);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const reskinStyles = VARIATION_STYLES[reskinMoodId] || [];

  return (
    <aside className="w-[420px] border-r border-zinc-800/60 bg-[#0F0F12] flex flex-col shadow-2xl z-20 shrink-0">

      <ForgeHeader currentView={currentView} setCurrentView={setCurrentView} />

      {currentView === 'creation' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6 pb-16">

          {/* 안내 — 리스킨 (중립 톤) */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
            <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
              <MousePointer2 className="w-3.5 h-3.5 text-zinc-400" /> 리스킨
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed break-keep-all">
              원본 에셋을 올리면 형태·테두리·텍스트·비율은 그대로 두고, 고른 테마 톤마다 색·표면·재질만 갈아끼웁니다. 배경은 리얼 블랙 고정 — 투명 PNG 추출 가능. <span className="text-zinc-400">결과는 PromptArc '리스킨 보관함' 폴더에 자동 저장됩니다.</span>
            </div>
          </div>

          {/* 01 — 원본 에셋 업로드 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">01</span> 원본 에셋 업로드
            </h3>
            <div
              onDragOver={handleCreationSourceDragOver}
              onDragLeave={handleCreationSourceDragLeave}
              onDrop={handleCreationSourceDrop}
              className={`relative border border-dashed rounded-lg h-40 flex flex-col items-center justify-center transition-colors overflow-hidden group ${
                isDraggingCreationSource
                  ? 'border-zinc-500 bg-zinc-800/30'
                  : 'border-zinc-700/60 bg-[#101012] hover:border-zinc-600'
              }`}
            >
              {creationSource ? (
                <div className="relative w-full h-full p-3 flex items-center justify-center">
                  <img src={creationSource} alt="원본 에셋" className="max-w-full max-h-full object-contain rounded-md" />
                  <button
                    onClick={handleClearCreationSource}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white p-1.5 rounded-md transition-colors"
                    title="원본 제거"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <UploadCloud className="w-6 h-6" />
                    <p className="text-[11px] font-semibold text-zinc-400">클릭 또는 드래그로 업로드</p>
                    <p className="text-[10px] text-zinc-600">버튼·프레임·아이콘 등 에셋 1개 · PNG · JPG</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCreationSourceUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          </section>

          {/* 02 — 분위기 카테고리 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">02</span> 분위기 카테고리
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {VARIATION_MOODS.map(m => {
                const active = m.id === reskinMoodId;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectReskinMood(m.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#17171a]'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.accent }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 03 — 테마 톤 (다중 선택, 톤 수 = 생성 장수) */}
          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-[12px] font-semibold text-zinc-300 flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 tabular-nums">03</span> 테마 톤
              </h3>
              <span className="text-[10px] font-medium text-zinc-400 tabular-nums">
                {selectedReskinStyleIds.length}개 선택 · {selectedReskinStyleIds.length}장
              </span>
            </div>
            <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed break-keep-all">
              적용할 테마 톤을 원하는 만큼 고르세요 — 톤마다 한 장씩, 같은 에셋이 그 색·재질로 리스킨됩니다. 형태는 유지됩니다.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {reskinStyles.map(s => {
                const active = selectedReskinStyleIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => handleToggleReskinStyle(s.id)}
                    title={s.promptHint}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#17171a]'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <div className={`text-[11px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{s.label}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 세부 조정 (선택) — 정제 강도 · 분위기 미세조정 · 배경 참고 */}
          <section className="border-t border-zinc-800/70 pt-5">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <span>세부 조정 <span className="font-normal text-zinc-600">— 정제 · 색온도 · 배경 (선택)</span></span>
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-5">

                {/* 정제 강도 — 원본 장식이 과할 때 일괄 감산 */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">정제 강도 <span className="normal-case font-normal text-zinc-600">· 장식 밀도</span></div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {REFINEMENT_LEVELS.map(lvl => {
                      const active = lvl.id === reskinRefinementLevel;
                      return (
                        <button
                          key={lvl.id}
                          onClick={() => setReskinRefinementLevel(lvl.id)}
                          title={lvl.desc}
                          className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                        >
                          <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{lvl.label}</div>
                          <div className="text-[9px] text-zinc-500 truncate w-full">{lvl.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 분위기 미세조정 — 광원 색온도 + 표면 세월감 (구조 유지) */}
                <AtmosphereDials
                  temperature={reskinTemperature}
                  age={reskinAge}
                  onTemperature={setReskinTemperature}
                  onAge={setReskinAge}
                />

                {/* 배경 참고 (선택) — 배치될 배경에 어울리는 톤으로 조정 */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">배경 참고 <span className="normal-case font-normal text-zinc-600">· 선택</span></div>
                  <p className="text-[10px] text-zinc-600 mb-2 leading-relaxed break-keep-all">
                    이 배경 위에 배치할 때 어울리도록 컬러·톤이 조정됩니다. 출력 배경은 여전히 리얼 블랙 유지.
                  </p>
                  <div
                    onDragOver={handleCreationBgDragOver}
                    onDragLeave={handleCreationBgDragLeave}
                    onDrop={handleCreationBgDrop}
                    className={`relative border border-dashed rounded-lg h-24 flex flex-col items-center justify-center transition-colors overflow-hidden group ${
                      isDraggingCreationBg ? 'border-zinc-500 bg-zinc-800/30' : 'border-zinc-700/60 bg-[#101012] hover:border-zinc-600'
                    }`}
                  >
                    {creationBgRef ? (
                      <div className="relative w-full h-full p-2 flex items-center justify-center">
                        <img src={creationBgRef} alt="배경 참고" className="max-w-full max-h-full object-contain rounded-md" />
                        <button onClick={handleClearCreationBg} className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white p-1 rounded-md transition-colors" title="배경 참고 제거">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-center gap-1.5 text-zinc-600">
                          <UploadCloud className="w-5 h-5" />
                          <p className="text-[10px] font-semibold text-zinc-500">배경 참고 추가</p>
                        </div>
                        <input type="file" accept="image/*" onChange={handleCreationBgUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 렌더 모델 — 503 회피 / 품질 토글 */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">렌더 모델</h3>
              <span className="text-[10px] text-zinc-600">503 시 다른 모델</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {IMAGEN_MODELS.map(m => {
                const active = creationRenderModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setCreationRenderModel(m.id)}
                    disabled={isGeneratingReskin}
                    title={m.desc}
                    className={`px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'} disabled:opacity-40`}
                  >
                    <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 출력 해상도 — Pro 선택 시 2K/4K */}
          <ResolutionToggle
            modelId={creationRenderModel}
            value={reskinImageSize}
            onChange={setReskinImageSize}
            disabled={isGeneratingReskin}
          />

          {/* 생성 CTA — 유일한 강조색 */}
          <section>
            <button
              onClick={handleGenerateReskin}
              disabled={!creationSource || selectedReskinStyleIds.length === 0 || isGeneratingReskin}
              className="w-full px-4 py-3.5 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#8ad8e8] font-bold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              {isGeneratingReskin ? <Loader2 className="w-4 h-4 animate-spin" /> : <MousePointer2 className="w-4 h-4" />}
              {isGeneratingReskin
                ? `${selectedReskinStyleIds.length}종 리스킨 중...`
                : !creationSource
                  ? '원본 에셋을 업로드하세요'
                  : selectedReskinStyleIds.length === 0
                    ? '테마 톤을 선택하세요'
                    : `${selectedReskinStyleIds.length}종 리스킨 생성`}
            </button>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              톤마다 한 장씩, 우측 그리드에 도착 순서대로 표시됩니다. 형태·텍스트·비율은 원본 유지 — 각 슬롯에서 9-슬라이스 / 투명 PNG / 프롬프트 / 재시도 가능.
            </p>
          </section>

        </div>
      ) : currentView === 'micro-edit' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6 pb-16">

          {/* 안내 — 리디자인 (중립 톤) */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
            <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" /> 리디자인
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed break-keep-all">
              세부 에셋(버튼·프레임·뱃지 등) 1개를 올리면, 테두리 두께·장식 크기·비율은 원본과 비슷하게 두고 모티프·재질·디테일만 재해석한 여러 디자인 대안을 만듭니다. 배경은 리얼 블랙 고정 — 투명 PNG 추출 가능.
            </div>
          </div>

          {/* 01 — 원본 에셋 업로드 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">01</span> 원본 에셋 업로드
            </h3>
            <div
              onDragOver={handleSourceDragOver}
              onDragLeave={handleSourceDragLeave}
              onDrop={handleSourceDrop}
              className={`relative border border-dashed rounded-lg h-40 flex flex-col items-center justify-center transition-colors overflow-hidden group ${
                isDraggingSource ? 'border-zinc-500 bg-zinc-800/30' : 'border-zinc-700/60 bg-[#101012] hover:border-zinc-600'
              }`}
            >
              {sourceAsset ? (
                <div className="relative w-full h-full p-3 flex items-center justify-center">
                  <img src={sourceAsset} alt="원본 에셋" className="max-w-full max-h-full object-contain rounded-md" />
                  <button
                    onClick={handleClearSource}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white p-1.5 rounded-md transition-colors"
                    title="원본 제거"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <UploadCloud className="w-6 h-6" />
                    <p className="text-[11px] font-semibold text-zinc-400">클릭 또는 드래그로 업로드</p>
                    <p className="text-[10px] text-zinc-600">버튼·프레임·아이콘 등 에셋 1개 · PNG · JPG</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSourceUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          </section>

          {/* 02 — 변형 방향 (다중 선택, 방향 수 = 대안 수) */}
          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-[12px] font-semibold text-zinc-300 flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 tabular-nums">02</span> 변형 방향
              </h3>
              <span className="text-[10px] font-medium text-zinc-400 tabular-nums">
                {selectedVariationIds.length}개 선택 · {selectedVariationIds.length}장
              </span>
            </div>
            <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed break-keep-all">
              탐색할 방향을 고르세요 — 선택한 방향마다 한 장씩 디자인 대안이 나옵니다. 컴포넌트 종류·기능은 유지됩니다.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {DESIGN_VARIATIONS.map(d => {
                const active = selectedVariationIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => handleToggleVariation(d.id)}
                    title={d.desc}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#17171a]'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{d.label}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{d.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 03 — 변형 강도 (원본에서 멀어지는 정도) */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">03</span> 변형 강도 <span className="text-[10px] font-normal text-zinc-500">· 원본에서 멀어지는 정도</span>
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {VARIATION_STRENGTH.map(lvl => {
                const active = lvl.id === variationStrength;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setVariationStrength(lvl.id)}
                    title={lvl.desc}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{lvl.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate w-full">{lvl.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              테두리 두께·장식 크기·비율은 원본과 비슷하게 유지됩니다. 강도는 모티프·디테일·재질을 얼마나 대담하게 재해석할지만 조절합니다.
            </p>
          </section>

          {/* 04 — 배경 참고 이미지 (선택) */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-1 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">04</span> 배경 참고 이미지 <span className="text-[10px] font-normal text-zinc-500">· 선택</span>
            </h3>
            <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed break-keep-all">
              이 배경 위에 합성할 때 자연스럽도록 컬러·형태가 조정됩니다. 출력 배경은 여전히 리얼 블랙 유지.
            </p>
            <div
              onDragOver={handleBackgroundDragOver}
              onDragLeave={handleBackgroundDragLeave}
              onDrop={handleBackgroundDrop}
              className={`relative border border-dashed rounded-lg h-28 flex flex-col items-center justify-center transition-colors overflow-hidden group ${
                isDraggingBackground ? 'border-zinc-500 bg-zinc-800/30' : 'border-zinc-700/60 bg-[#101012] hover:border-zinc-600'
              }`}
            >
              {backgroundRef ? (
                <div className="relative w-full h-full p-2 flex items-center justify-center">
                  <img src={backgroundRef} alt="배경 참고" className="max-w-full max-h-full object-contain rounded-md" />
                  <button
                    onClick={handleClearBackground}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white p-1 rounded-md transition-colors"
                    title="배경 참고 제거"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1.5 text-zinc-600">
                    <UploadCloud className="w-5 h-5" />
                    <p className="text-[10px] font-semibold text-zinc-500">배경 참고 추가</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          </section>

          {/* 렌더 모델 — 503 회피 / 품질 토글. 생성 직전에 보이게 배치. */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">렌더 모델</h3>
              <span className="text-[10px] text-zinc-600">503 시 다른 모델</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {IMAGEN_MODELS.map(m => {
                const active = variationRenderModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setVariationRenderModel(m.id)}
                    disabled={isGeneratingVariations}
                    title={m.desc}
                    className={`px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'} disabled:opacity-40`}
                  >
                    <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 출력 해상도 — Pro 선택 시 2K/4K */}
          <ResolutionToggle
            modelId={variationRenderModel}
            value={variationImageSize}
            onChange={setVariationImageSize}
            disabled={isGeneratingVariations}
          />

          {/* 생성 CTA — 유일한 강조색 */}
          <section>
            <button
              onClick={handleGenerateVariations}
              disabled={!sourceAsset || selectedVariationIds.length === 0 || isGeneratingVariations}
              className="w-full px-4 py-3.5 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#8ad8e8] font-bold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              {isGeneratingVariations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGeneratingVariations
                ? `${selectedVariationIds.length}개 대안 생성 중...`
                : selectedVariationIds.length === 0
                  ? '변형 방향을 선택하세요'
                  : `디자인 대안 ${selectedVariationIds.length}장 생성`}
            </button>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              선택한 방향마다 한 장씩, 우측 그리드에 도착 순서대로 표시됩니다. 각 슬롯에서 9-슬라이스 / PNG / 투명 PNG / 프롬프트 / 재시도 가능.
            </p>
          </section>
        </div>
      ) : currentView === 'vector' ? (
        // ─── 벡터 생성 모드 사이드바 ─────────────────────────
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6 pb-16">

          {/* 안내 — 벡터 생성 (중립 톤) */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
            <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
              <SparkleIcon className="w-3.5 h-3.5 text-zinc-400" /> 벡터 생성
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed break-keep-all">
              불릿·구분선·프레임을 진짜 벡터(SVG)로 만듭니다. 깔끔한 플랫·라인 스타일에 최적 — 무한 확대·편집 자유. <span className="text-zinc-400">로그인 시 PromptArc '벡터 보관함'에 자동 저장.</span>
            </div>
          </div>

          {/* 01 — 종류 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">01</span> 종류
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {VECTOR_CATEGORIES.map(c => {
                const active = c.id === vectorCategory;
                return (
                  <button
                    key={c.id}
                    onClick={() => setVectorCategory(c.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#17171a]'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.accent }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{c.label}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{c.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 02 — 스타일 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">02</span> 스타일
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {VECTOR_STYLES.map(s => {
                const active = s.id === vectorStyle;
                return (
                  <button
                    key={s.id}
                    onClick={() => setVectorStyle(s.id)}
                    title={s.hint}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{s.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate w-full">{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 03 — 팔레트 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">03</span> 팔레트
            </h3>
            <div className="grid grid-cols-5 gap-1.5">
              {VECTOR_PALETTES.map(p => {
                const active = p.id === vectorPalette;
                return (
                  <button
                    key={p.id}
                    onClick={() => setVectorPalette(p.id)}
                    title={p.label}
                    className={`flex flex-col items-center gap-1 px-1 py-2 rounded-md border transition-colors ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <span className="w-5 h-5 rounded-full border border-black/40" style={{ background: p.swatch }} />
                    <span className={`text-[9px] font-semibold truncate w-full text-center ${active ? 'text-white' : 'text-zinc-400'}`}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 04 — 무엇을 만들까요 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">04</span> 무엇을 만들까요?
            </h3>
            <textarea
              value={vectorText}
              onChange={e => setVectorText(e.target.value)}
              placeholder={VECTOR_CATEGORIES.find(c => c.id === vectorCategory)?.placeholder || '만들 모양을 한 줄로 적어주세요'}
              className="w-full h-16 bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3 text-[12px] text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none custom-scrollbar leading-relaxed"
            />
            <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed break-keep-all">
              비워두면 종류 기본형으로 생성합니다. 모양·모티프만 적으면 됩니다 (색은 팔레트에서).
            </p>
          </section>

          {/* 생성 수 */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">한 번에 생성</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {VECTOR_COUNTS.map(n => {
                const active = n === vectorCount;
                return (
                  <button
                    key={n}
                    onClick={() => setVectorCount(n)}
                    className={`px-2.5 py-2 rounded-md border text-[11px] font-semibold transition-colors ${active ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-[#141417] border-zinc-800/80 text-zinc-300 hover:border-zinc-700'}`}
                  >
                    {n}개
                  </button>
                );
              })}
            </div>
          </section>

          {/* 생성 CTA — 유일한 강조색 */}
          <section>
            <button
              onClick={handleGenerateVector}
              disabled={isGeneratingVector}
              className="w-full px-4 py-3.5 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#8ad8e8] font-bold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              {isGeneratingVector ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparkleIcon className="w-4 h-4" />}
              {isGeneratingVector ? `${vectorCount}개 생성 중...` : `벡터 ${vectorCount}개 생성`}
            </button>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              변형 {vectorCount}개가 SVG 로 나옵니다. 우측에서 SVG 복사 / .svg · .png 다운로드 / 개별 재생성 가능.
            </p>
          </section>

        </div>
      ) : (
        // ─── 디자인 시스템(아틀라스) 모드 사이드바 ─────────────────────────
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6 pb-16">

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
            <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
              <SparkleIcon className="w-3.5 h-3.5 text-zinc-400" /> 디자인 시스템 (아틀라스)
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed break-keep-all">
              버튼·프레임·패널·뱃지가 한 시트에 정리된 디자인 시스템 아틀라스를 업로드하세요. 그리드/장식 크기는 그대로, 모든 서브 에셋이 동일한 새 테마를 공유하도록 일관 리테마합니다. 배경은 리얼 블랙 고정. 페이지 전체(캐릭터·일러스트 포함) 리테마는 결과가 불안정해 제외했습니다.
            </div>
          </div>

          {/* 마스터 명세 패널 — atlasSpec 이 있을 때만 노출. PromotionArchive 송신으로 들어온 명세를
              사용자가 실제 프롬프트에 들어가는 텍스트 그대로 보고 편집 가능. 직접 해제도 가능. */}
          {atlasSpec && (
            <section className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/5 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <SparkleIcon className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-fuchsia-300 truncate">
                      마스터 명세 적용 중{atlasSpecTitle ? ` — ${atlasSpecTitle}` : ''}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      이 텍스트가 모든 변형 호출에 함께 전송됩니다 ({atlasSpec.length.toLocaleString()} 자).
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setAtlasSpec(''); setAtlasSpecTitle(''); }}
                  title="명세 해제 — 명세 없이 순수 이미지 기반 리테마로 전환"
                  className="shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => setAtlasSpecOpen(!atlasSpecOpen)}
                className="w-full px-4 py-2 border-t border-fuchsia-500/20 flex items-center justify-between text-[10px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <span>{atlasSpecOpen ? '명세 숨기기' : '명세 보기 / 직접 편집'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${atlasSpecOpen ? 'rotate-180' : ''}`} />
              </button>
              {atlasSpecOpen && (
                <div className="px-4 pb-4 border-t border-fuchsia-500/20">
                  <textarea
                    value={atlasSpec}
                    onChange={e => setAtlasSpec(e.target.value)}
                    spellCheck={false}
                    className="mt-2 w-full h-64 bg-[#0A0A0A] border border-zinc-800 rounded-md p-3 text-[11px] text-zinc-200 outline-none focus:border-fuchsia-500/50 resize-y font-mono leading-relaxed custom-scrollbar"
                    placeholder="ATLAS STRUCTURE SPEC 텍스트"
                  />
                  <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed break-keep-all">
                    프롬프트 내 <span className="text-zinc-300 font-mono">ATLAS STRUCTURE SPEC</span> 블록에 그대로 삽입됩니다. 항목을 추가/삭제하거나 표현을 강화하면 다음 생성부터 적용됩니다.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* 01 — 아틀라스 업로드 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">01</span> 아틀라스 업로드
            </h3>
            <div
              onDragOver={handleAtlasSourceDragOver}
              onDragLeave={handleAtlasSourceDragLeave}
              onDrop={handleAtlasSourceDrop}
              className={`relative border border-dashed rounded-lg h-40 flex flex-col items-center justify-center transition-colors overflow-hidden group ${
                isDraggingAtlasSource ? 'border-zinc-500 bg-zinc-800/30' : 'border-zinc-700/60 bg-[#101012] hover:border-zinc-600'
              }`}
            >
              {atlasSource ? (
                <div className="relative w-full h-full p-3 flex items-center justify-center">
                  <img src={atlasSource} alt="아틀라스" className="max-w-full max-h-full object-contain rounded-md" />
                  <button
                    onClick={handleClearAtlasSource}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white p-1.5 rounded-md transition-colors"
                    title="아틀라스 제거"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <UploadCloud className="w-6 h-6" />
                    <p className="text-[11px] font-semibold text-zinc-400">페이지 전체 에셋 시트</p>
                    <p className="text-[10px] text-zinc-600">버튼·박스·프레임 모두 포함</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAtlasSourceUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          </section>

          {/* 02 — 분위기 카테고리 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">02</span> 분위기 카테고리
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {VARIATION_MOODS.map(m => {
                const active = m.id === selectedAtlasMoodId;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectAtlasMood(m.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#17171a]'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.accent }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 03 — 구체 스타일 */}
          <section>
            <div className="flex items-baseline justify-between mb-2.5">
              <h3 className="text-[12px] font-semibold text-zinc-300 flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500 tabular-nums">03</span> 구체적 스타일
              </h3>
              <span className="text-[10px] font-medium text-zinc-400 truncate max-w-[150px]">
                {VARIATION_STYLES[selectedAtlasMoodId]?.find(s => s.id === selectedAtlasStyleIds[0])?.label || '미선택'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(VARIATION_STYLES[selectedAtlasMoodId] || []).map(s => {
                const active = selectedAtlasStyleIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => handleToggleAtlasStyle(s.id)}
                    title={s.promptHint}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <div className={`text-[11px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{s.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              스타일 1개를 고르면 그 테마로 한 판만 리테마됩니다. 분위기를 바꾸면 첫 스타일로 초기화.
            </p>
          </section>

          {/* 정제 강도 (장식 밀도 조절) */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">정제 강도 <span className="normal-case font-normal text-zinc-600">· 장식 밀도</span></h3>
            <div className="grid grid-cols-3 gap-1.5">
              {REFINEMENT_LEVELS.map(lvl => {
                const active = lvl.id === atlasRefinementLevel;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setAtlasRefinementLevel(lvl.id)}
                    title={lvl.desc}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{lvl.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate w-full">{lvl.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              원본 아틀라스가 이미 과한 경우 정제·미니멀 로 모든 서브 에셋의 장식을 일괄적으로 깎습니다.
            </p>
          </section>

          {/* 3.6단 — 분위기 미세조정 (광원 온도 + 마모/세월감) — 전체 키트에 전역 일괄 적용 */}
          <AtmosphereDials
            temperature={atlasTemperature}
            age={atlasAge}
            onTemperature={setAtlasTemperature}
            onAge={setAtlasAge}
          />

          {/* 04 — 배경 참고 (선택) */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-1 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">04</span> 배경 참고 이미지 <span className="text-[10px] font-normal text-zinc-500">· 선택</span>
            </h3>
            <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed break-keep-all">
              이 배경 위에 배치할 때 어울리는 통일된 톤으로 조정됩니다.
            </p>
            <div
              onDragOver={handleAtlasBackgroundDragOver}
              onDragLeave={handleAtlasBackgroundDragLeave}
              onDrop={handleAtlasBackgroundDrop}
              className={`relative border border-dashed rounded-lg h-28 flex flex-col items-center justify-center transition-colors overflow-hidden group ${
                isDraggingAtlasBackground ? 'border-zinc-500 bg-zinc-800/30' : 'border-zinc-700/60 bg-[#101012] hover:border-zinc-600'
              }`}
            >
              {atlasBackgroundRef ? (
                <div className="relative w-full h-full p-2 flex items-center justify-center">
                  <img src={atlasBackgroundRef} alt="배경 참고" className="max-w-full max-h-full object-contain rounded-md" />
                  <button
                    onClick={handleClearAtlasBackground}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white p-1 rounded-md transition-colors"
                    title="배경 참고 제거"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1.5 text-zinc-600">
                    <UploadCloud className="w-5 h-5" />
                    <p className="text-[10px] font-semibold text-zinc-500">배경 참고 추가</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAtlasBackgroundUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          </section>

          {/* 렌더 모델 — 503 회피 / 품질 토글 */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">렌더 모델</h3>
              <span className="text-[10px] text-zinc-600">503 시 다른 모델</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {IMAGEN_MODELS.map(m => {
                const active = atlasRenderModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setAtlasRenderModel(m.id)}
                    disabled={isGeneratingAtlas}
                    title={m.desc}
                    className={`px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'} disabled:opacity-40`}
                  >
                    <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 출력 해상도 — Pro 선택 시 2K/4K */}
          <ResolutionToggle
            modelId={atlasRenderModel}
            value={atlasImageSize}
            onChange={setAtlasImageSize}
            disabled={isGeneratingAtlas}
          />

          {/* 생성 CTA — 유일한 강조색 */}
          <section>
            <button
              onClick={handleGenerateAtlas}
              disabled={!atlasSource || selectedAtlasStyleIds.length === 0 || isGeneratingAtlas}
              className="w-full px-4 py-3.5 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#8ad8e8] font-bold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              {isGeneratingAtlas ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparkleIcon className="w-4 h-4" />}
              {isGeneratingAtlas
                ? '생성 중...'
                : selectedAtlasStyleIds.length === 0
                  ? '스타일을 선택하세요'
                  : '리테마 생성'}
            </button>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              각 결과는 원본의 그리드 / 서브 에셋 개수 / 장식 크기를 그대로 유지하고, 모든 서브 에셋이 동일한 새 테마를 공유합니다.
            </p>
          </section>
        </div>
      )}
    </aside>
  );
}

