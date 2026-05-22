/* eslint-disable */
// current 고급 옵션 영역 — 카드형 2x3 그리드.
//   1. 구조 배치        2. 서체 골격
//   3. 획 마감          4. 결속·흐름
//   5. 스타일·이펙트    6. 변형 모디파이어
// 펼친 카드는 col-span-2 로 한 줄을 차지한다 (PrimitiveUI.OptionGroupCard 안에서 처리).
import React from 'react';
import {
  Settings, Highlighter, LayoutTemplate, AlignCenter, Brush, Layers3, Box as BoxIcon, Wand, FastForward, Zap,
} from 'lucide-react';
import { DropdownControl, OptionGroupCard } from './PrimitiveUI.jsx';
import { staticOptions } from '../constants/options.js';
import { getOptionName } from '../constants/utils.js';

const AdvancedOptions = ({
  isEditMode, editUploadedImage,
  isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled,
  openCardId, editOpenCardId, handleToggleCard, handleEditToggleCard,
  dynamicOptions,
  // edit retouch
  editStrokeMod, setEditStrokeMod,
  editElementMod, setEditElementMod,
  editSurfaceMod, setEditSurfaceMod,
  // layout
  layoutType, setLayoutType,
  subTitleSize, setSubTitleSize,
  aspectRatio, setAspectRatio,
  occupancy, setOccupancy,
  layoutPreset, setLayoutPreset,
  handleLayoutPresetChange,
  mmoSilhouetteFraming, setMmoSilhouetteFraming,
  // skeleton & proportion
  stemWeight, setStemWeight,
  charWidth, setCharWidth,
  charProportion, setCharProportion,
  // terminal
  terminalStyle, setTerminalStyle,
  strokeSharpness, setStrokeSharpness,
  slicingIntensity, setSlicingIntensity,
  cornerStyle, setCornerStyle,
  strokeExtension, setStrokeExtension,
  // connection
  kerning, setKerning,
  letterConnection, setLetterConnection,
  internalSpace, setInternalSpace,
  logoDegree, setLogoDegree,
  // style guardrails
  baseStyle, setBaseStyle,
  deformationDamage, setDeformationDamage,
  mmoSurroundingElement, setMmoSurroundingElement,
  // modifier
  isEnhanceModeEnabled, setIsEnhanceModeEnabled,
  enhanceMode, setEnhanceMode,
  momentumActive, setMomentumActive,
}) => {
  // edit 모드에서는 editOpenCardId/handleEditToggleCard, creation 모드에서는 일반 핸들러
  const activeOpenId = isEditMode ? editOpenCardId : openCardId;
  const activeToggle = isEditMode ? handleEditToggleCard : handleToggleCard;

  const moodSummary = (key, opts) => getOptionName([...opts, ...(dynamicOptions[key] || [])], '').split(' ')[0];

  return (
    <div className={`transition-all duration-300 pb-8 ${(isEditMode && !editUploadedImage) ? 'opacity-30 pointer-events-none grayscale' : ''}`}>

      {/* Basic/Advanced 토글 헤더 */}
      <div className="shrink-0 my-4 p-2.5 rounded-[10px] border border-zinc-800/80 bg-[#171717] flex items-center justify-between shadow-sm transition-colors">
        <div className="flex items-center gap-2 pl-1">
          <Settings className="w-4 h-4 text-zinc-500" />
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-300 font-sans">Advanced Parameters</h3>
        </div>
        <div className="flex bg-[#0A0A0A] rounded-[6px] p-0.5 border border-zinc-800 shadow-inner">
          <button onClick={() => setIsAdvancedOptionsEnabled(false)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all font-sans ${!isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Basic</button>
          <div className="w-[1px] bg-zinc-800 my-1 mx-0.5" />
          <button onClick={() => setIsAdvancedOptionsEnabled(true)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all font-sans ${isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Advanced</button>
        </div>
      </div>

      {/* Edit 모드 전용 — Micro-Retouch 카드는 그리드 위에 단독 노출 (creation 모드와 의미가 다름) */}
      {isEditMode && (
        <div className="mb-4">
          <OptionGroupCard
            id="edit_retouch"
            number="·"
            openCardId={editOpenCardId}
            onToggle={handleEditToggleCard}
            title="마이크로 리터칭"
            icon={<Highlighter className="w-3.5 h-3.5 text-zinc-500" />}
            summaryLines={[
              getOptionName([...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])], editStrokeMod),
              getOptionName([...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])], editElementMod),
            ]}
          >
            <div className="space-y-3">
              <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} />
              <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} />
              <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} />
            </div>
          </OptionGroupCard>
        </div>
      )}

      {/* 6개 카드 2x3 그리드 */}
      {isAdvancedOptionsEnabled && (
        <div className="grid grid-cols-2 gap-3">

          {/* 1. 구조 배치 */}
          <OptionGroupCard
            id="layout"
            number={1}
            openCardId={activeOpenId}
            onToggle={activeToggle}
            title="구조 배치"
            icon={<LayoutTemplate className="w-3.5 h-3.5 text-zinc-500" />}
            summaryLines={[
              getOptionName(staticOptions.ratios, aspectRatio) + ' · ' + getOptionName(staticOptions.layouts, layoutType).split(' ')[0],
              '여백 ' + getOptionName(staticOptions.occupancies, occupancy).split(' ')[0],
            ]}
          >
            <div className="mb-3">
              <DropdownControl label="레이아웃 프리셋" data={staticOptions.layoutPresets} value={layoutPreset} onChange={handleLayoutPresetChange} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <DropdownControl label="비율" data={staticOptions.ratios} value={aspectRatio} onChange={(val) => { setAspectRatio(val); setLayoutPreset(''); }} />
              <DropdownControl label="크기/여백" data={staticOptions.occupancies} value={occupancy} onChange={(val) => { setOccupancy(val); setLayoutPreset(''); }} />
            </div>
            <div className="mb-3">
              <DropdownControl label="배열 방식" data={staticOptions.layouts} value={layoutType} onChange={(val) => { setLayoutType(val); setLayoutPreset(''); }} />
            </div>
            {(layoutType === "TitleSub" || layoutType === "SubTitle") && (
              <div className="mb-3">
                <DropdownControl label="서브 텍스트 크기" data={staticOptions.subTitleSizes} value={subTitleSize} onChange={setSubTitleSize} />
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-zinc-800/50">
              <DropdownControl label="고급 실루엣" data={staticOptions.MMOSilhouetteFramings} value={mmoSilhouetteFraming} onChange={(val) => { setMmoSilhouetteFraming(val); setLayoutPreset(''); }} />
            </div>
          </OptionGroupCard>

          {/* 2. 서체 골격 */}
          <OptionGroupCard
            id="stroke_body"
            number={2}
            openCardId={activeOpenId}
            onToggle={activeToggle}
            title="서체 골격"
            icon={<AlignCenter className="w-3.5 h-3.5 text-zinc-500" />}
            summaryLines={[
              getOptionName([...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])], stemWeight),
              '비례 ' + getOptionName(staticOptions.proportions, charProportion).split(' ')[0],
            ]}
          >
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="획 굵기 (Weight)" data={[...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])]} value={stemWeight} onChange={setStemWeight} />
              <DropdownControl label="글자 폭 (Width)" data={staticOptions.widths} value={charWidth} onChange={setCharWidth} />
            </div>
            <div className="mt-3">
              <DropdownControl label="골격 비례 (Proportion)" data={staticOptions.proportions} value={charProportion} onChange={setCharProportion} />
            </div>
          </OptionGroupCard>

          {/* 3. 획 마감 */}
          <OptionGroupCard
            id="terminal"
            number={3}
            openCardId={activeOpenId}
            onToggle={activeToggle}
            title="획 마감"
            icon={<Brush className="w-3.5 h-3.5 text-zinc-500" />}
            summaryLines={[
              getOptionName([...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])], terminalStyle),
              '예리함 ' + getOptionName([...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])], strokeSharpness).split(' ')[0],
            ]}
          >
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="마감(Terminal) 방식" data={[...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])]} value={terminalStyle} onChange={setTerminalStyle} />
              <DropdownControl label="예리함 강도" data={[...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <DropdownControl label="구조적 절단" data={[...staticOptions.slicingIntensities, ...(dynamicOptions.slicingIntensities || [])]} value={slicingIntensity} onChange={setSlicingIntensity} />
              <DropdownControl label="코너 모서리 성격" data={[...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])]} value={cornerStyle} onChange={setCornerStyle} />
            </div>
            <div className="mt-3">
              <DropdownControl label="끝단 연장선" data={[...staticOptions.strokeExtensions, ...(dynamicOptions.strokeExtensions || [])]} value={strokeExtension} onChange={setStrokeExtension} />
            </div>
          </OptionGroupCard>

          {/* 4. 결속·흐름 — edit 모드에서는 의미 약해서 숨김 */}
          {!isEditMode && (
            <OptionGroupCard
              id="connection"
              number={4}
              openCardId={activeOpenId}
              onToggle={activeToggle}
              title="결속·흐름"
              icon={<Layers3 className="w-3.5 h-3.5 text-zinc-500" />}
              summaryLines={[
                '자간 ' + getOptionName([...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])], kerning),
                '로고화 ' + getOptionName([...staticOptions.logoDegrees, ...(dynamicOptions.logoDegrees || [])], logoDegree).split(' ')[0],
              ]}
            >
              <div className="grid grid-cols-2 gap-3">
                <DropdownControl label="자간 조절" data={[...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])]} value={kerning} onChange={setKerning} />
                <DropdownControl label="문자 간 결합" data={[...staticOptions.letterConnections, ...(dynamicOptions.letterConnections || [])]} value={letterConnection} onChange={setLetterConnection} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <DropdownControl label="내부 공간(Counter)" data={[...staticOptions.internalSpaces, ...(dynamicOptions.internalSpaces || [])]} value={internalSpace} onChange={setInternalSpace} />
                <DropdownControl label="로고화 및 엠블럼" data={[...staticOptions.logoDegrees, ...(dynamicOptions.logoDegrees || [])]} value={logoDegree} onChange={setLogoDegree} />
              </div>
            </OptionGroupCard>
          )}

          {/* 5. 스타일·이펙트 */}
          <OptionGroupCard
            id="intensity"
            number={5}
            openCardId={activeOpenId}
            onToggle={activeToggle}
            title="스타일·이펙트"
            icon={<BoxIcon className="w-3.5 h-3.5 text-zinc-500" />}
            summaryLines={[
              getOptionName(staticOptions.base, baseStyle),
              'VFX ' + getOptionName([...staticOptions.MMOSurroundingElements, ...(dynamicOptions.MMOSurroundingElements || [])], mmoSurroundingElement).split(' ')[0],
            ]}
          >
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="배경 대비 제어" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} />
              <DropdownControl label="표면 부식 한계" data={[...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} />
            </div>
            <div className="mt-3">
              <DropdownControl label="주변 이펙트(VFX)" data={[...staticOptions.MMOSurroundingElements, ...(dynamicOptions.MMOSurroundingElements || [])]} value={mmoSurroundingElement} onChange={setMmoSurroundingElement} />
            </div>
          </OptionGroupCard>

          {/* 6. 변형 모디파이어 — 기존엔 카드 밖 별도 영역. 카드 안으로 흡수. */}
          <OptionGroupCard
            id="modifier"
            number={6}
            openCardId={activeOpenId}
            onToggle={activeToggle}
            title="변형 모디파이어"
            icon={<Wand className="w-3.5 h-3.5 text-zinc-500" />}
            summaryLines={[
              isEnhanceModeEnabled
                ? (enhanceMode === 'refine' ? 'Refine (다듬기)' : enhanceMode === 'variation' ? 'Variation (변형)' : 'Deconstruct (해체)')
                : 'OFF',
              '전투 동세 ' + (momentumActive ? 'ON' : 'OFF'),
            ]}
          >
            {/* Enhance Mode toggle + tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400">Enhance Mode</span>
                <button
                  onClick={() => setIsEnhanceModeEnabled(!isEnhanceModeEnabled)}
                  className={`flex items-center gap-2 transition-colors ${isEnhanceModeEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}
                >
                  <span className="text-[10px] font-bold font-sans">{isEnhanceModeEnabled ? 'ACTIVE' : 'OFF'}</span>
                  <div className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${isEnhanceModeEnabled ? 'bg-indigo-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${isEnhanceModeEnabled ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                  </div>
                </button>
              </div>
              <div className={`p-2 rounded-[10px] border bg-[#171717] border-zinc-800/80 shadow-sm transition-all ${!isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                <div className="flex bg-[#0A0A0A] rounded-[8px] p-1 border border-zinc-800/60">
                  <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('refine')} className={`flex-1 py-2 rounded-[6px] text-[11px] font-bold font-sans transition-all ${enhanceMode === 'refine' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}>Refine</button>
                  <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('variation')} className={`flex-1 py-2 rounded-[6px] text-[11px] font-bold font-sans transition-all ${enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}>Variation</button>
                  <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('deconstruct')} className={`flex-1 py-2 rounded-[6px] text-[11px] font-bold font-sans transition-all ${enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}>Deconstruct</button>
                </div>
              </div>
            </div>

            {/* Momentum toggle */}
            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FastForward className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px] font-bold text-zinc-400">전투 동세 (Momentum)</span>
              </div>
              <button
                onClick={() => setMomentumActive(!momentumActive)}
                className={`flex items-center gap-2 transition-colors ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`}
              >
                <span className="text-[10px] font-bold font-sans">{momentumActive ? 'ACTIVE' : 'OFF'}</span>
                <div className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${momentumActive ? 'bg-amber-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${momentumActive ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                </div>
              </button>
            </div>
          </OptionGroupCard>

        </div>
      )}
    </div>
  );
};

export default AdvancedOptions;
