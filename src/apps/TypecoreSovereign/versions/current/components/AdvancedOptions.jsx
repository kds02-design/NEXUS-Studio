/* eslint-disable */
// current 고급 옵션 영역: Advanced Parameters 토글, OptionGroupCard 들, Modifier Engine, Combat Dynamics.
import React from 'react';
import {
  Settings, Highlighter, LayoutTemplate, AlignCenter, Brush, Layers3, Box as BoxIcon, Wand, FastForward
} from 'lucide-react';
import { DropdownControl, OptionGroupCard, SectionHeader } from './PrimitiveUI.jsx';
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
}) => (
  <div className={`transition-all duration-300 pb-8 ${(isEditMode && !editUploadedImage) ? 'opacity-30 pointer-events-none grayscale' : ''}`}>

    <div className="shrink-0 my-4 p-2.5 rounded-[10px] border border-zinc-800/80 bg-[#171717] flex items-center justify-between shadow-sm transition-colors">
      <div className="flex items-center gap-2 pl-1">
        <Settings className="w-4 h-4 text-zinc-500" />
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-300 font-mono">Advanced Parameters</h3>
      </div>
      <div className="flex bg-[#0A0A0A] rounded-[6px] p-0.5 border border-zinc-800 shadow-inner">
        <button onClick={() => setIsAdvancedOptionsEnabled(false)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all font-mono ${!isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Basic</button>
        <div className="w-[1px] bg-zinc-800 my-1 mx-0.5" />
        <button onClick={() => setIsAdvancedOptionsEnabled(true)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all font-mono ${isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Advanced</button>
      </div>
    </div>

    {isEditMode && (
      <OptionGroupCard
        id="edit_retouch"
        openCardId={editOpenCardId}
        onToggle={handleEditToggleCard}
        title="[L4] 마이크로 리터칭"
        icon={<Highlighter className="w-3.5 h-3.5 text-zinc-500" />}
        summary={`${getOptionName([...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])], editStrokeMod).split(' ')[0]} · ${getOptionName([...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])], editElementMod).split(' ')[0]}`}
      >
        <div className="space-y-3">
          <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} />
          <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} />
          <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} />
        </div>
      </OptionGroupCard>
    )}

    {isAdvancedOptionsEnabled && (
      <OptionGroupCard
        id="layout"
        openCardId={isEditMode ? editOpenCardId : openCardId}
        onToggle={isEditMode ? handleEditToggleCard : handleToggleCard}
        title="[L2] 구조 배치"
        icon={<LayoutTemplate className="w-3.5 h-3.5 text-zinc-500" />}
        summary={`${getOptionName(staticOptions.ratios, aspectRatio)} · ${getOptionName(staticOptions.layouts, layoutType).split(' ')[0]}`}
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
    )}

    {isAdvancedOptionsEnabled && (
      <OptionGroupCard
        id="stroke_body"
        openCardId={isEditMode ? editOpenCardId : openCardId}
        onToggle={isEditMode ? handleEditToggleCard : handleToggleCard}
        title="[L3] 서체 골격 & 비례"
        icon={<AlignCenter className="w-3.5 h-3.5 text-zinc-500" />}
        summary={`${getOptionName([...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])], stemWeight).split(' ')[0]} · ${getOptionName(staticOptions.proportions, charProportion).split(' ')[0]}`}
      >
        <div className="grid grid-cols-2 gap-3">
          <DropdownControl label="획 굵기 (Weight)" data={[...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])]} value={stemWeight} onChange={setStemWeight} />
          <DropdownControl label="글자 폭 (Width)" data={staticOptions.widths} value={charWidth} onChange={setCharWidth} />
        </div>
        <div className="mt-3">
          <DropdownControl label="골격 비례 (Proportion)" data={staticOptions.proportions} value={charProportion} onChange={setCharProportion} />
        </div>
      </OptionGroupCard>
    )}

    {isAdvancedOptionsEnabled && (
      <OptionGroupCard
        id="terminal"
        openCardId={isEditMode ? editOpenCardId : openCardId}
        onToggle={isEditMode ? handleEditToggleCard : handleToggleCard}
        title="[L3] 획 마감 & 엣지"
        icon={<Brush className="w-3.5 h-3.5 text-zinc-500" />}
        summary={`${getOptionName([...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])], terminalStyle).split(' ')[0]} · ${getOptionName([...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])], strokeSharpness).split(' ')[0]}`}
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
    )}

    {(!isEditMode && isAdvancedOptionsEnabled) && (
      <OptionGroupCard
        id="connection"
        openCardId={openCardId}
        onToggle={handleToggleCard}
        title="[L3] 결속 & 흐름"
        icon={<Layers3 className="w-3.5 h-3.5 text-zinc-500" />}
        summary={`${getOptionName([...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])], kerning).split(' ')[0]}`}
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

    {isAdvancedOptionsEnabled && (
      <OptionGroupCard
        id="intensity"
        openCardId={isEditMode ? editOpenCardId : openCardId}
        onToggle={isEditMode ? handleEditToggleCard : handleToggleCard}
        title="[L6/L7] 스타일 가드레일 & VFX"
        icon={<BoxIcon className="w-3.5 h-3.5 text-zinc-500" />}
        summary={`${getOptionName(staticOptions.base, baseStyle).split(' ')[0]}`}
      >
        <div className="grid grid-cols-2 gap-3">
          <DropdownControl label="배경 대비 제어" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} />
          <DropdownControl label="표면 부식 한계" data={[...staticOptions.deformationDamages, ...(dynamicOptions.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} />
        </div>
        <div className="mt-3">
          <DropdownControl label="주변 이펙트(VFX)" data={[...staticOptions.MMOSurroundingElements, ...(dynamicOptions.MMOSurroundingElements || [])]} value={mmoSurroundingElement} onChange={setMmoSurroundingElement} />
        </div>
      </OptionGroupCard>
    )}

    <section className="mt-6 border-t border-zinc-800/50 pt-4 px-3">
      <div className="flex items-center justify-between">
        <SectionHeader id="[L4]" label="모디파이어 (구조 강제)" icon={<Wand className="w-3.5 h-3.5" />} />
        <div className="flex items-center gap-2 mt-3 cursor-pointer" onClick={() => setIsEnhanceModeEnabled(!isEnhanceModeEnabled)}>
          <span className={`text-[11px] font-bold uppercase tracking-wide font-mono ${isEnhanceModeEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}>{isEnhanceModeEnabled ? 'ACTIVE' : 'OFF'}</span>
          <div className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${isEnhanceModeEnabled ? 'bg-indigo-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
            <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${isEnhanceModeEnabled ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
          </div>
        </div>
      </div>
      <div className={`p-3 rounded-[10px] border bg-[#171717] border-zinc-800/80 mt-3 shadow-sm transition-all duration-300 ${!isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
        <div className="flex bg-[#0A0A0A] rounded-[10px] p-1 border border-zinc-800/60">
          <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('refine')} className={`flex-1 py-2.5 rounded-[8px] text-[12px] font-bold font-mono transition-all ${enhanceMode === 'refine' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>Refine</button>
          <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('variation')} className={`flex-1 py-2.5 rounded-[8px] text-[12px] font-bold font-mono transition-all ${enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>Variation</button>
          <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('deconstruct')} className={`flex-1 py-2.5 rounded-[8px] text-[12px] font-bold font-mono transition-all ${enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>Deconstruct</button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800/50">
        <div className="flex items-center justify-between pl-1">
          <div className="flex items-center gap-2">
            <FastForward className="w-3.5 h-3.5 text-zinc-500" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 font-mono">[L5] 전투 동세</h3>
          </div>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMomentumActive(!momentumActive)}>
            <span className={`text-[10px] font-bold uppercase tracking-wide font-mono ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`}>{momentumActive ? 'ACTIVE' : 'OFF'}</span>
            <div className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${momentumActive ? 'bg-amber-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
              <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${momentumActive ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default AdvancedOptions;
