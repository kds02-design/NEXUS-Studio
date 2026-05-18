import {
  Box, LayoutTemplate, Anchor, Settings, Activity, Star, Heart, Edit2,
  Cpu, Loader2, RefreshCcw,
} from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';
import { staticOptions } from '../constants/presets.js';
import { DropdownControl, SectionHeader, Tooltip } from './ui.jsx';

// CREATION 뷰 사이드바의 옵션 패널 묶음 — Base Layout / Smart Auto-Setup / Advanced Sections 02-05.
export default function BreezePresetPanel() {
  const {
    aspectRatio, setAspectRatio, occupancy, setOccupancy,
    baseStyle, setBaseStyle, layoutType, setLayoutType,
    charWidth, setCharWidth, charProportion, setCharProportion,
    stemWeight, setStemWeight, kerning, setKerning,
    dynamicOptions,
    handleAiRecommendation, isRecommending, handleReset,
    aiRecSummary,
    isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled,
    scriptType, handleScriptPresetChange,
    terminalStyle, setTerminalStyle,
    strokeSharpness, setStrokeSharpness,
    strokeTexture, setStrokeTexture,
    strokeExtension, setStrokeExtension,
    internalDecoration, setInternalDecoration,
    textFlow, setTextFlow,
    letterConnection, setLetterConnection,
    casualSurrounding, setCasualSurrounding,
    rhythmDynamic, setRhythmDynamic,
    slantAngle, setSlantAngle,
    playfulDistortion, setPlayfulDistortion,
    analogImperfection, setAnalogImperfection,
  } = useBreeze();

  return (
    <>
      <hr className="border-zinc-800/80" />

      <section>
        <SectionHeader id="01" label="Base Layout" icon={<LayoutTemplate className="w-3.5 h-3.5" />} />
        <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800/80 space-y-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <DropdownControl label="Ratio" data={staticOptions.ratios} value={aspectRatio} onChange={setAspectRatio} disabled={false} />
            <DropdownControl label="Occupancy" data={staticOptions.occupancies} value={occupancy} onChange={setOccupancy} disabled={false} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DropdownControl label="Background" icon={<Box className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} disabled={false} />
            <DropdownControl label="Layout" data={staticOptions.layouts} value={layoutType} onChange={setLayoutType} disabled={false} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/50">
            <DropdownControl label="Width" data={staticOptions.widths} value={charWidth} onChange={setCharWidth} disabled={false} />
            <DropdownControl label="Proportion" data={staticOptions.proportions} value={charProportion} onChange={setCharProportion} disabled={false} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DropdownControl label="Weight" data={[...staticOptions.strokeWeights, ...(dynamicOptions.strokeWeights || [])]} value={stemWeight} onChange={setStemWeight} disabled={false} />
            <DropdownControl label="Kerning" data={[...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])]} value={kerning} onChange={setKerning} disabled={false} />
          </div>

          <div className="flex gap-2 pt-3 border-t border-zinc-800/50">
            <button onClick={handleAiRecommendation} disabled={isRecommending} className="flex-1 py-2.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-colors shadow-md">
              {isRecommending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />} Smart Auto-Setup
            </button>
            <Tooltip text="옵션 초기화">
              <button onClick={handleReset} className="w-9 rounded-md border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center transition-colors text-zinc-500 hover:text-zinc-300 shrink-0">
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>

          {aiRecSummary && (
            <div className="mt-3 p-3 rounded-md bg-violet-900/10 border border-violet-500/20 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <Star className="w-3.5 h-3.5 text-violet-400" />
                <p className="text-[11px] font-bold text-violet-300">{aiRecSummary.title}</p>
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-400">{aiRecSummary.reason}</p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 mb-2 p-3 rounded-lg border border-zinc-800 bg-[#111111] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Settings className="w-4 h-4 text-zinc-500" />
          <h3 className="text-[10px] font-bold uppercase text-zinc-400">Advanced Controls</h3>
        </div>
        <button onClick={() => setIsAdvancedOptionsEnabled(!isAdvancedOptionsEnabled)} className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors duration-300 ${isAdvancedOptionsEnabled ? 'bg-zinc-300' : 'bg-zinc-800'}`}>
          <div className={`w-4 h-4 bg-[#111] rounded-full transition-transform duration-300 shadow-sm ${isAdvancedOptionsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className={`transition-all duration-500 space-y-4 ${!isAdvancedOptionsEnabled ? 'opacity-20 pointer-events-none grayscale max-h-0 overflow-hidden' : 'max-h-[2000px]'}`}>
        <section>
          <SectionHeader id="02" label="Preset Theme" icon={<Anchor className="w-3.5 h-3.5" />} />
          <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800 mt-3">
            <DropdownControl data={[...staticOptions.CasualStyles, ...(dynamicOptions.CasualStyles || [])]} value={scriptType} onChange={handleScriptPresetChange} disabled={false} />
          </div>
        </section>

        <section>
          <SectionHeader id="03" label="Stroke Details" icon={<Edit2 className="w-3.5 h-3.5" />} />
          <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800 space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="Terminal" data={[...staticOptions.strokeEnds, ...(dynamicOptions.strokeEnds || [])]} value={terminalStyle} onChange={setTerminalStyle} disabled={false} />
              <DropdownControl label="Sharpness" data={[...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} disabled={false} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="Texture" data={[...staticOptions.strokeTextures, ...(dynamicOptions.strokeTextures || [])]} value={strokeTexture} onChange={setStrokeTexture} disabled={false} />
              <DropdownControl label="Extension" data={[...staticOptions.strokeExtensions, ...(dynamicOptions.strokeExtensions || [])]} value={strokeExtension} onChange={setStrokeExtension} disabled={false} />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader id="04" label="Decorations" icon={<Heart className="w-3.5 h-3.5" />} />
          <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800 space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="Internal" data={staticOptions.InternalDecorations} value={internalDecoration} onChange={setInternalDecoration} disabled={false} />
              <DropdownControl label="Baseline Flow" data={staticOptions.TextFlows} value={textFlow} onChange={setTextFlow} disabled={false} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="Connections" data={staticOptions.LetterConnections} value={letterConnection} onChange={setLetterConnection} disabled={false} />
              <DropdownControl label="Surroundings" data={staticOptions.CasualSurroundings} value={casualSurrounding} onChange={setCasualSurrounding} disabled={false} />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader id="05" label="Rhythm & Deforms" icon={<Activity className="w-3.5 h-3.5" />} />
          <div className="p-4 rounded-xl border bg-[#111111] border-zinc-800 space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="Rhythm Dynamics" data={[...staticOptions.rhythmDynamics, ...(dynamicOptions.rhythmDynamics || [])]} value={rhythmDynamic} onChange={setRhythmDynamic} disabled={false} />
              <DropdownControl label="Slant Angle" data={staticOptions.slantAngles} value={slantAngle} onChange={setSlantAngle} disabled={false} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DropdownControl label="Distortion" data={[...staticOptions.playfulDistortions, ...(dynamicOptions.playfulDistortions || [])]} value={playfulDistortion} onChange={setPlayfulDistortion} disabled={false} />
              <DropdownControl label="Imperfections" data={[...staticOptions.analogImperfections, ...(dynamicOptions.analogImperfections || [])]} value={analogImperfection} onChange={setAnalogImperfection} disabled={false} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
