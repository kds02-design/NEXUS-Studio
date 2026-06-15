// 좌측 사이드바 — 친절 모드 4단계 UI.
// "3가지만 고르면 5분 안에 결과가 나옵니다" 가 핵심 카피.
//   1단 종류 카드  → handleAssetTypeChange (layout/slot/shape 자동 cascade)
//   2단 분위기 카드 → handleThemeDnaChange  (surface/rim/deco/energyCore 자동 cascade)
//   3단 비율 칩
//   4단 원하는 느낌 textarea (+ AI 자동 셋업 / 구체화 / 리셋)
// "옵션 더보기" 패널 안에 출력 모드 · 색상 톤 · 표면 · 프레임 · 장식 · 배경 효과 · 텍스트 영역 · 형태 · 스타일 레퍼런스 노출.
// 모든 컨트롤은 chip(grid 버튼) 또는 토글로 통일 — 기존의 popover/dropdown 은 제거해 클릭 1번이면 끝나도록.

import {
  ChevronDown, UploadCloud, X,
  MousePointer2, Square, Trophy, LayoutPanelTop, LayoutTemplate,
  Columns2, PanelTop, Award, Crown, Dice5,
  Sparkle as SparkleIcon, MessageSquare, Wand, ScanLine, RefreshCw, Loader2, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { staticOptions } from '../constants/categories';
import { VARIATION_MOODS, VARIATION_STYLES, REFINEMENT_LEVELS, ATMOSPHERE_TEMPERATURE, ATMOSPHERE_AGE, DESIGN_VARIATIONS, VARIATION_STRENGTH } from '../constants/variations';
import { IMAGEN_MODELS, RENDER_SIZES, isProImageModel } from '../../../lib/imagenRender';
import ForgeHeader from './ForgeHeader';

// 1단 종류 카드용 아이콘 — 추상적인 SVG 글리프 대신 lucide 아이콘으로 한눈에 구분.
const COMPONENT_ICON = {
  Button:        MousePointer2,
  UtilityButton: Square,
  RewardCard:    Trophy,
  FeatureCard:   LayoutPanelTop,
  EventPanel:    LayoutTemplate,
  SplitPanel:    Columns2,
  HeaderTab:     PanelTop,
  BadgeStamp:    Award,
  DecoPart:      Crown,
};

// 2단 분위기 카드용 색상 그라데이션 — 사용자가 클릭 전에 분위기를 시각적으로 확인.
const THEME_SWATCH = {
  LineageDarkRoyal: { bg: 'linear-gradient(135deg,#1a1410 0%,#3d2914 55%,#d4af37 100%)', accent: '#d4af37' },
  ImperialBronze:   { bg: 'linear-gradient(135deg,#2a1f15 0%,#5a3f25 55%,#cd7f32 100%)', accent: '#cd7f32' },
  CrimsonSiege:     { bg: 'linear-gradient(135deg,#1a0808 0%,#4a1010 55%,#c41e3a 100%)', accent: '#c41e3a' },
  ModernFlatBrand:  { bg: 'linear-gradient(135deg,#ffffff 0%,#f0f4ff 55%,#06b6d4 100%)', accent: '#06b6d4' },
  SoftPastel3D:     { bg: 'linear-gradient(135deg,#fef0ee 0%,#fbcfe8 55%,#d8b4fe 100%)', accent: '#d8b4fe' },
};

const ACCENT = '#76cee0';

// 칩 버튼 — 활성/자동/비활성 3 상태. 자동 = 1·2단 선택이 cascade 한 값.
function Chip({ active, auto, disabled, onClick, children, title }) {
  let cls;
  if (active) cls = 'bg-zinc-800 border-zinc-600 text-white';
  else if (auto) cls = 'bg-zinc-900 border-zinc-700 text-zinc-300';
  else cls = 'bg-[#121212] border-zinc-800 text-zinc-500 hover:text-zinc-300';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors text-left ${cls} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

// 분위기 미세조정 다이얼의 한 행(축) — 5단계 칩. 모듈 레벨 컴포넌트(렌더 중 생성 금지).
function AtmosphereRow({ title, options, value, onChange }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-zinc-500 mb-2">{title}</div>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map(opt => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              title={opt.desc}
              className={`px-1 py-2 rounded-lg border text-[10px] font-bold leading-tight transition-all text-center break-keep-all ${active ? 'bg-zinc-900 text-white shadow' : 'bg-[#121212] border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
              style={active ? { borderColor: opt.accent, boxShadow: `0 0 0 1px ${opt.accent}40` } : {}}
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
        <h3 className="text-[12px] font-bold text-zinc-300">출력 해상도</h3>
        {!isPro && <span className="text-[10px] text-zinc-500">2K·4K 는 Pro 모델만</span>}
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
              className={`px-2.5 py-2 rounded-lg border transition-colors text-left ${active ? 'bg-zinc-900 shadow' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
              style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}40` } : {}}
            >
              <div className={`text-[11px] font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{sz.label}</div>
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
      <h3 className="text-[13px] font-bold text-zinc-200 mb-1">
        분위기 미세조정 <span className="text-[10px] font-normal text-zinc-500">(구조 유지 · 색온도/표면만)</span>
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
    themeDna, handleThemeDnaChange,
    assetType, handleAssetTypeChange,
    outputFormat, setOutputFormat,
    buttonShape, setButtonShape,
    buttonRatio, setButtonRatio,
    textSafeZone, setTextSafeZone,
    surfaceTreatment, setSurfaceTreatment,
    material, setMaterial,
    rimThickness, setRimThickness,
    rimMaterial, setRimMaterial,
    buttonDeco, setButtonDeco,
    energyCore, setEnergyCore,
    enableGlint, setEnableGlint,
    userIntent, setUserIntent,
    styleImage, isDraggingStyle,
    handleStyleImageUpload, handleStyleDragOver, handleStyleDragLeave, handleStyleDrop, handleClearStyleImage,
    isExpandingIntent, handleExpandIntent,
    openChatModal,
    isKeywordSetting, handleKeywordSetup,
    isAnalyzingStyle, analyzeStyle,
    handleResetSettings,
    isOptionDisabled,
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

  // 1단 종류 랜덤 — 9개 중 하나, 다른 단계는 그대로 둠 (분위기·비율 유지).
  const handleRandomComponent = () => {
    const ids = staticOptions.assetTypes.map(o => o.id);
    handleAssetTypeChange(ids[Math.floor(Math.random() * ids.length)]);
  };

  const selectedComponent = staticOptions.assetTypes.find(o => o.id === assetType);

  return (
    <aside className="w-[420px] border-r border-zinc-800/60 bg-[#0F0F12] flex flex-col shadow-2xl z-20 shrink-0">

      <ForgeHeader currentView={currentView} setCurrentView={setCurrentView} />

      {currentView === 'creation' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-7 pb-16">

          {/* 친절 모드 안내 — 5분 가이드 */}
          <div className="rounded-xl border border-[#76cee0]/30 bg-[#76cee0]/5 px-4 py-3">
            <div className="text-[11px] font-bold text-[#76cee0] flex items-center gap-1.5">
              <SparkleIcon className="w-3.5 h-3.5" /> 3가지만 고르면 됩니다
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
              종류 · 분위기 · 비율을 고르고 우측 <span className="text-zinc-200 font-bold">Prompt Output</span> 의 모델 탭에서 결과를 복사하세요. 나머지는 자동으로 맞춰집니다.
            </div>
          </div>

          {/* 1단 — 어떤 종류를 만들까요? */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">
              1. 어떤 종류를 만들까요?
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {staticOptions.assetTypes.map(opt => {
                const Icon = COMPONENT_ICON[opt.id] || Square;
                const active = opt.id === assetType;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAssetTypeChange(opt.id)}
                    title={opt.name}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col items-center text-center ${active ? 'bg-zinc-900 shadow-lg' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700 hover:bg-[#1a1a1a]'}`}
                    style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}40` } : {}}
                  >
                    <Icon className="w-6 h-6 mb-1.5" style={{ color: active ? ACCENT : '#9CA3AF' }} />
                    <div className={`text-[10px] font-bold leading-tight break-keep-all ${active ? 'text-white' : 'text-zinc-300'}`}>
                      {opt.name.split('(')[0].trim()}
                    </div>
                  </button>
                );
              })}
              {/* 10번째 칸 — 종류 랜덤 */}
              <button
                onClick={handleRandomComponent}
                className="p-2.5 rounded-xl border border-dashed border-zinc-700 bg-[#121212] hover:bg-[#1a1a1a] hover:border-zinc-500 transition-all flex flex-col items-center justify-center"
                title="종류 랜덤"
              >
                <Dice5 className="w-6 h-6 text-zinc-500 mb-1.5" />
                <div className="text-[10px] font-bold text-zinc-400">랜덤</div>
              </button>
            </div>
            {selectedComponent && (
              <div className="mt-2 text-[10px] text-zinc-500">
                선택: <span style={{ color: ACCENT }}>{selectedComponent.name}</span>
              </div>
            )}
          </section>

          {/* 2단 — 어떤 분위기로? */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">
              2. 어떤 분위기로?
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {staticOptions.themeDna.map(opt => {
                const swatch = THEME_SWATCH[opt.id] || { bg: '#222', accent: ACCENT };
                const active = opt.id === themeDna;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleThemeDnaChange(opt.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${active ? 'bg-zinc-900 shadow-lg' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700 hover:bg-[#1a1a1a]'}`}
                    style={active ? { borderColor: swatch.accent, boxShadow: `0 0 0 1px ${swatch.accent}40` } : {}}
                  >
                    <div
                      className="w-12 h-12 rounded-lg shrink-0 border border-black/40"
                      style={{ background: swatch.bg }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className={`text-[12px] font-bold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>
                        {opt.name.split('(')[0].trim()}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        {opt.name.match(/\(([^)]+)\)/)?.[1] || ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3단 — 비율 */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">
              3. 비율은?
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {staticOptions.buttonRatios.map(opt => (
                <Chip
                  key={opt.id}
                  active={buttonRatio === opt.id}
                  onClick={() => setButtonRatio(opt.id)}
                  title={opt.name}
                >
                  {opt.ar}
                </Chip>
              ))}
            </div>
            {selectedComponent && (
              <div className="mt-2 text-[10px] text-zinc-500">
                {staticOptions.buttonRatios.find(r => r.id === buttonRatio)?.name}
              </div>
            )}
          </section>

          {/* 4단 — 원하는 느낌 (선택) */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">
              4. 원하는 느낌 <span className="text-[10px] font-normal text-zinc-500">(선택 — 비워둬도 됩니다)</span>
            </h3>
            <div className="w-full flex flex-col bg-[#0A0A0A] border border-zinc-800 rounded-xl focus-within:border-zinc-600 transition-all overflow-hidden">
              <textarea
                value={userIntent}
                onChange={e => setUserIntent(e.target.value)}
                placeholder="예: 여름 세일, 청량한 느낌 / 신규 캐릭터 출시, 강렬한 화염..."
                className="w-full h-20 bg-transparent p-3 text-[12px] text-zinc-200 focus:outline-none resize-none custom-scrollbar"
              />
              <div className="flex justify-between items-center gap-1.5 px-2 pb-2">
                <div className="text-[9px] text-zinc-600 px-1">키워드만 적어도 됩니다</div>
                <div className="flex gap-1">
                  <button
                    onClick={handleExpandIntent}
                    disabled={isExpandingIntent || !userIntent}
                    title="키워드 구체화 (AI 가 문장으로 확장)"
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 disabled:opacity-40 transition-colors"
                  >
                    {isExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={openChatModal}
                    disabled={!userIntent}
                    title="대화로 다듬기"
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 disabled:opacity-40 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              <button
                onClick={handleKeywordSetup}
                disabled={isKeywordSetting || !userIntent}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-purple-500/30 bg-purple-500/5 text-purple-300 hover:bg-purple-500/15 transition-colors text-[11px] font-bold disabled:opacity-40"
              >
                {isKeywordSetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand className="w-3 h-3" />}
                AI 자동 설정
              </button>
              <button
                onClick={handleResetSettings}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-zinc-800 bg-[#121212] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors text-[11px] font-bold"
              >
                <RefreshCw className="w-3 h-3" /> 처음으로
              </button>
            </div>
          </section>

          {/* 옵션 더보기 — 출력 형식 · 색상 톤 · 표면 · 프레임 · 장식 · 배경 효과 · 텍스트 영역 · 형태 · 스타일 레퍼런스 */}
          <section className="border-t border-zinc-800 pt-5">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between text-[12px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <span>옵션 더보기 (출력·색·표면·프레임·장식)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-5">

                {/* 출력 형식 */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">출력 형식</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {staticOptions.outputFormats.map(opt => (
                      <Chip
                        key={opt.id}
                        active={outputFormat === opt.id}
                        onClick={() => setOutputFormat(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* 색상 톤 (material) */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">색상 톤</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {staticOptions.materials.map(opt => (
                      <Chip
                        key={opt.id}
                        active={material === opt.id}
                        disabled={isOptionDisabled('material')}
                        onClick={() => setMaterial(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* 표면 */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">표면 가공</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {staticOptions.surfaceTreatments.map(opt => (
                      <Chip
                        key={opt.id}
                        active={surfaceTreatment === opt.id}
                        disabled={isOptionDisabled('surfaceTreatment')}
                        onClick={() => setSurfaceTreatment(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* 프레임 두께 / 재질 */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">프레임 두께</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {staticOptions.rimThicknesses.map(opt => (
                      <Chip
                        key={opt.id}
                        active={rimThickness === opt.id}
                        disabled={isOptionDisabled('rimThickness')}
                        onClick={() => setRimThickness(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">프레임 재질</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {staticOptions.rimMaterials.map(opt => (
                      <Chip
                        key={opt.id}
                        active={rimMaterial === opt.id}
                        disabled={isOptionDisabled('rimMaterial')}
                        onClick={() => setRimMaterial(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* 장식 */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">장식</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {staticOptions.buttonDecos.map(opt => (
                      <Chip
                        key={opt.id}
                        active={buttonDeco === opt.id}
                        onClick={() => setButtonDeco(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* 배경 효과 */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">배경 효과</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {staticOptions.energyCores.map(opt => (
                      <Chip
                        key={opt.id}
                        active={energyCore === opt.id}
                        disabled={isOptionDisabled('energyCore')}
                        onClick={() => setEnergyCore(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* 글린트 토글 */}
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-zinc-500">강한 하이라이트 (Glint)</div>
                  <button
                    onClick={() => setEnableGlint(!enableGlint)}
                    disabled={isOptionDisabled('enableGlint')}
                    className={`flex items-center gap-2 transition-colors ${enableGlint ? 'text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <span className="text-[10px] font-bold">{enableGlint ? 'ON' : 'OFF'}</span>
                    <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors ${enableGlint ? 'bg-amber-500' : 'bg-zinc-800 border border-zinc-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${enableGlint ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>

                {/* 텍스트 세이프존 */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">텍스트 영역</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {staticOptions.textSafeZones.map(opt => (
                      <Chip
                        key={opt.id}
                        active={textSafeZone === opt.id}
                        onClick={() => setTextSafeZone(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* 기본 형태 */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-500 mb-2">기본 형태</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {staticOptions.buttonShapes.map(opt => (
                      <Chip
                        key={opt.id}
                        active={buttonShape === opt.id}
                        onClick={() => setButtonShape(opt.id)}
                        title={opt.name}
                      >
                        {opt.name.split('(')[0].trim()}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* 스타일 레퍼런스 이미지 — 1단~3단에서 빠진 옵션. 분석 한 번이면 5단 자동 셋업. */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-bold text-zinc-500">스타일 레퍼런스 이미지</div>
                    <button
                      onClick={analyzeStyle}
                      disabled={isAnalyzingStyle || !styleImage}
                      title="이미지에서 표면·프레임·장식 자동 추출"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-[#76cee0]/30 bg-[#76cee0]/5 text-[#76cee0] hover:bg-[#76cee0]/15 transition-colors text-[10px] font-bold disabled:opacity-40"
                    >
                      {isAnalyzingStyle ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
                      분석
                    </button>
                  </div>
                  <div
                    onDragOver={handleStyleDragOver}
                    onDragLeave={handleStyleDragLeave}
                    onDrop={handleStyleDrop}
                    className={`relative border border-dashed rounded-lg h-24 flex flex-col items-center justify-center transition-all overflow-hidden group ${isDraggingStyle ? 'border-[#76cee0] bg-[#76cee0]/10' : 'border-zinc-700/50 bg-[#111111] hover:border-[#76cee0]/50'}`}
                  >
                    {styleImage ? (
                      <div className="relative w-full h-full p-2 flex items-center justify-center">
                        <img src={styleImage} className="max-w-full max-h-full object-contain rounded-md" alt="Style ref" />
                        <button onClick={handleClearStyleImage} className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1 rounded-sm transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-center gap-1.5 opacity-40 text-zinc-400">
                          <UploadCloud className="w-4 h-4" />
                          <p className="text-[9px] font-bold uppercase tracking-widest">SHAPE REF</p>
                        </div>
                        <input type="file" accept="image/*" onChange={handleStyleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      ) : currentView === 'micro-edit' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-6 pb-16">

          {/* 변형 모드 안내 — 리얼 블랙 배경 + 알파 추출 가능 */}
          <div className="rounded-xl border border-[#76cee0]/30 bg-[#76cee0]/5 px-4 py-3">
            <div className="text-[11px] font-bold text-[#76cee0] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 세부 에셋 변형 생성
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 leading-relaxed break-keep-all">
              버튼·프레임·뱃지·오너먼트 같은 <span className="text-zinc-200">세부 에셋 1개</span>를 올리면, <span className="text-zinc-200">테두리 두께·장식 크기·비율은 원본과 비슷하게</span> 두고 모티프·재질·디테일만 재해석한 <span className="text-zinc-200">여러 디자인 대안</span>을 만듭니다.
              배경은 <span className="text-zinc-200">리얼 블랙(#000000)</span> 고정 — 결과에서 투명 PNG 로 바로 추출 가능.
            </div>
          </div>

          {/* 1단 — 원본 업로드 */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">1. 원본 에셋 업로드</h3>
            <div
              onDragOver={handleSourceDragOver}
              onDragLeave={handleSourceDragLeave}
              onDrop={handleSourceDrop}
              className={`relative border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center transition-all overflow-hidden group ${
                isDraggingSource
                  ? 'border-[#76cee0] bg-[#76cee0]/10'
                  : 'border-zinc-700/60 bg-[#111111] hover:border-[#76cee0]/50'
              }`}
            >
              {sourceAsset ? (
                <div className="relative w-full h-full p-3 flex items-center justify-center">
                  <img src={sourceAsset} alt="원본" className="max-w-full max-h-full object-contain rounded-md" />
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
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <UploadCloud className="w-7 h-7 opacity-50" />
                    <p className="text-[11px] font-bold">클릭 또는 드래그로 업로드</p>
                    <p className="text-[10px] text-zinc-500">PNG · JPG</p>
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

          {/* 2단 — 변형 방향 (다중 선택, 방향 수 = 대안 수) */}
          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-[13px] font-bold text-zinc-200">2. 변형 방향</h3>
              <span className={`text-[10px] font-bold ${selectedVariationIds.length > 0 ? 'text-[#76cee0]' : 'text-zinc-500'}`}>
                {selectedVariationIds.length}개 = {selectedVariationIds.length}장
              </span>
            </div>
            <p className="text-[10px] text-zinc-600 mb-3 leading-relaxed break-keep-all">
              탐색할 방향을 고르세요 — <span className="text-zinc-400">선택한 방향마다 한 장씩</span> 디자인 대안이 나옵니다. 컴포넌트 종류·기능은 유지됩니다.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {DESIGN_VARIATIONS.map(d => {
                const active = selectedVariationIds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => handleToggleVariation(d.id)}
                    title={d.desc}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all text-left ${active ? 'bg-zinc-900 shadow' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'}`}
                    style={active ? { borderColor: d.color, boxShadow: `0 0 0 1px ${d.color}40` } : {}}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-bold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{d.label}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{d.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3단 — 변형 강도 (원본에서 멀어지는 정도) */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">
              3. 변형 강도 <span className="text-[10px] font-normal text-zinc-500">(원본에서 멀어지는 정도)</span>
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {VARIATION_STRENGTH.map(lvl => {
                const active = lvl.id === variationStrength;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setVariationStrength(lvl.id)}
                    title={lvl.desc}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg border transition-all text-left ${active ? 'bg-zinc-900 shadow' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'}`}
                    style={active ? { borderColor: lvl.accent, boxShadow: `0 0 0 1px ${lvl.accent}40` } : {}}
                  >
                    <div className={`text-[11px] font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{lvl.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate w-full">{lvl.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              <span className="text-zinc-300">테두리 두께·장식 크기·비율</span>은 원본과 비슷하게 유지됩니다. 강도는 <span className="text-zinc-300">모티프·디테일·재질</span>을 얼마나 대담하게 재해석할지만 조절합니다.
            </p>
          </section>

          {/* 4단 — 배경 참고 이미지 (선택) */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-1">
              4. 배경 참고 이미지 <span className="text-[10px] font-normal text-zinc-500">(선택)</span>
            </h3>
            <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed break-keep-all">
              이 배경 위에 합성할 때 자연스럽도록 컬러·형태가 조정됩니다. 출력 배경은 여전히 리얼 블랙 유지.
            </p>
            <div
              onDragOver={handleBackgroundDragOver}
              onDragLeave={handleBackgroundDragLeave}
              onDrop={handleBackgroundDrop}
              className={`relative border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center transition-all overflow-hidden group ${
                isDraggingBackground
                  ? 'border-[#76cee0] bg-[#76cee0]/10'
                  : 'border-zinc-700/60 bg-[#111111] hover:border-[#76cee0]/50'
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
                  <div className="flex flex-col items-center gap-1.5 text-zinc-500">
                    <UploadCloud className="w-5 h-5 opacity-50" />
                    <p className="text-[10px] font-bold">배경 참고 추가</p>
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
              <h3 className="text-[12px] font-bold text-zinc-300">렌더 모델</h3>
              <span className="text-[10px] text-zinc-500">503 시 다른 모델 시도</span>
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
                    className={`px-2.5 py-2 rounded-lg border transition-colors text-left ${active ? 'bg-zinc-900 shadow' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'} disabled:opacity-40`}
                    style={active ? { borderColor: m.color, boxShadow: `0 0 0 1px ${m.color}40` } : {}}
                  >
                    <div className={`text-[11px] font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
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

          {/* 5단 — 생성 CTA */}
          <section>
            <button
              onClick={handleGenerateVariations}
              disabled={!sourceAsset || selectedVariationIds.length === 0 || isGeneratingVariations}
              className="w-full px-4 py-4 rounded-xl bg-[#76cee0] text-zinc-900 hover:bg-[#92dceb] font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
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
      ) : (
        // ─── 디자인 시스템(아틀라스) 모드 사이드바 ─────────────────────────
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-6 pb-16">

          <div className="rounded-xl border border-[#76cee0]/30 bg-[#76cee0]/5 px-4 py-3">
            <div className="text-[11px] font-bold text-[#76cee0] flex items-center gap-1.5">
              <SparkleIcon className="w-3.5 h-3.5" /> 디자인 시스템(아틀라스) 모드
            </div>
            <div className="text-[10px] text-zinc-400 mt-1 leading-relaxed break-keep-all">
              버튼·프레임·패널·뱃지가 한 시트에 정리된 <span className="text-zinc-200">디자인 시스템 아틀라스</span>를 업로드하세요.
              그리드/장식 크기는 그대로, 모든 서브 에셋이 동일한 새 테마를 공유하도록 일관 리테마합니다.
              배경은 리얼 블랙 고정. 페이지 전체(캐릭터·일러스트 포함) 리테마는 결과가 불안정해 제외했습니다.
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

          {/* 1단 — 아틀라스 업로드 */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">1. 아틀라스 업로드</h3>
            <div
              onDragOver={handleAtlasSourceDragOver}
              onDragLeave={handleAtlasSourceDragLeave}
              onDrop={handleAtlasSourceDrop}
              className={`relative border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center transition-all overflow-hidden group ${
                isDraggingAtlasSource
                  ? 'border-[#76cee0] bg-[#76cee0]/10'
                  : 'border-zinc-700/60 bg-[#111111] hover:border-[#76cee0]/50'
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
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <UploadCloud className="w-7 h-7 opacity-50" />
                    <p className="text-[11px] font-bold">페이지 전체 에셋 시트</p>
                    <p className="text-[10px] text-zinc-500">버튼·박스·프레임 모두 포함</p>
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

          {/* 2단 — 분위기 카테고리 */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">2. 분위기 카테고리</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {VARIATION_MOODS.map(m => {
                const active = m.id === selectedAtlasMoodId;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectAtlasMood(m.id)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all text-left ${active ? 'bg-zinc-900 shadow-lg' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700 hover:bg-[#1a1a1a]'}`}
                    style={active ? { borderColor: m.accent, boxShadow: `0 0 0 1px ${m.accent}40` } : {}}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.accent }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-bold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3단 — 구체 스타일 */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-[13px] font-bold text-zinc-200">3. 구체적 스타일</h3>
              <span className="text-[10px] font-bold text-[#76cee0]">
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
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all text-left ${active ? 'bg-zinc-900 shadow' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'}`}
                    style={active ? { borderColor: s.color, boxShadow: `0 0 0 1px ${s.color}40` } : {}}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <div className={`text-[11px] font-bold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{s.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              스타일 1개를 고르면 그 테마로 <span className="text-zinc-300">한 판</span>만 리테마됩니다. 분위기를 바꾸면 첫 스타일로 초기화.
            </p>
          </section>

          {/* 3.5단 — 정제 강도 (장식 밀도 조절) */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-3">
              정제 강도 <span className="text-[10px] font-normal text-zinc-500">(장식 밀도)</span>
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {REFINEMENT_LEVELS.map(lvl => {
                const active = lvl.id === atlasRefinementLevel;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setAtlasRefinementLevel(lvl.id)}
                    title={lvl.desc}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-lg border transition-all text-left ${active ? 'bg-zinc-900 shadow' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'}`}
                    style={active ? { borderColor: lvl.accent, boxShadow: `0 0 0 1px ${lvl.accent}40` } : {}}
                  >
                    <div className={`text-[11px] font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{lvl.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate w-full">{lvl.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              원본 아틀라스가 이미 과한 경우 <span className="text-zinc-300">정제</span>·<span className="text-zinc-300">미니멀</span> 로 모든 서브 에셋의 장식을 일괄적으로 깎습니다.
            </p>
          </section>

          {/* 3.6단 — 분위기 미세조정 (광원 온도 + 마모/세월감) — 전체 키트에 전역 일괄 적용 */}
          <AtmosphereDials
            temperature={atlasTemperature}
            age={atlasAge}
            onTemperature={setAtlasTemperature}
            onAge={setAtlasAge}
          />

          {/* 4단 — 배경 참고 (선택) */}
          <section>
            <h3 className="text-[13px] font-bold text-zinc-200 mb-1">
              4. 배경 참고 이미지 <span className="text-[10px] font-normal text-zinc-500">(선택)</span>
            </h3>
            <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed break-keep-all">
              이 배경 위에 배치할 때 어울리는 통일된 톤으로 조정됩니다.
            </p>
            <div
              onDragOver={handleAtlasBackgroundDragOver}
              onDragLeave={handleAtlasBackgroundDragLeave}
              onDrop={handleAtlasBackgroundDrop}
              className={`relative border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center transition-all overflow-hidden group ${
                isDraggingAtlasBackground
                  ? 'border-[#76cee0] bg-[#76cee0]/10'
                  : 'border-zinc-700/60 bg-[#111111] hover:border-[#76cee0]/50'
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
                  <div className="flex flex-col items-center gap-1.5 text-zinc-500">
                    <UploadCloud className="w-5 h-5 opacity-50" />
                    <p className="text-[10px] font-bold">배경 참고 추가</p>
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
              <h3 className="text-[12px] font-bold text-zinc-300">렌더 모델</h3>
              <span className="text-[10px] text-zinc-500">503 시 다른 모델 시도</span>
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
                    className={`px-2.5 py-2 rounded-lg border transition-colors text-left ${active ? 'bg-zinc-900 shadow' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700'} disabled:opacity-40`}
                    style={active ? { borderColor: m.color, boxShadow: `0 0 0 1px ${m.color}40` } : {}}
                  >
                    <div className={`text-[11px] font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
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

          {/* 5단 — 생성 CTA */}
          <section>
            <button
              onClick={handleGenerateAtlas}
              disabled={!atlasSource || selectedAtlasStyleIds.length === 0 || isGeneratingAtlas}
              className="w-full px-4 py-4 rounded-xl bg-[#76cee0] text-zinc-900 hover:bg-[#92dceb] font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
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

