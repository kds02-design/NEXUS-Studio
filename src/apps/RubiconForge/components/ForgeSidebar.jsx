// 좌측 사이드바: 옵션 카테고리 (Brand, Architecture, Form, Surface, Decoration) + AI Directive.
// 원본 index.jsx 의 <aside> 블록을 그대로 이전. ForgeHeader / ForgePromptForm 와 조합.

import {
  UploadCloud, Palette, X, MonitorCheck, UserCog, Columns,
  Shapes, PaintBucket, Sparkles as SparkleFX, Edit2,
} from 'lucide-react';
import { staticOptions } from '../constants/categories';
import { PopoverSelect, DropdownControl, ToggleControl } from './_controls';
import ForgeHeader from './ForgeHeader';
import ForgePromptForm from './ForgePromptForm';

export default function ForgeSidebar({ forge }) {
  const {
    theme, currentView, setCurrentView,
    themeDna, handleThemeDnaChange,
    assetType, handleAssetTypeChange,
    outputFormat, setOutputFormat,
    layoutArchetype, setLayoutArchetype,
    slotStructure, setSlotStructure,
    buttonShape, setButtonShape,
    buttonRatio, setButtonRatio,
    textSafeZone, setTextSafeZone,
    surfaceTreatment, setSurfaceTreatment,
    material, setMaterial,
    dramaticTex, setDramaticTex,
    rimThickness, setRimThickness,
    rimMaterial, setRimMaterial,
    buttonDeco, setButtonDeco,
    energyCore, setEnergyCore,
    enableGlint, setEnableGlint,
    shapeDistortion, setShapeDistortion,
    userIntent, setUserIntent,
    styleImage, isDraggingStyle,
    handleStyleImageUpload, handleStyleDragOver, handleStyleDragLeave, handleStyleDrop, handleClearStyleImage,
    isExpandingIntent, handleExpandIntent,
    openChatModal,
    isKeywordSetting, handleKeywordSetup,
    isAnalyzingStyle, analyzeStyle,
    handleResetSettings,
    isOptionDisabled,
  } = forge;

  return (
    <aside className="w-[420px] border-r border-zinc-800/60 bg-[#0F0F12] flex flex-col shadow-2xl z-20 shrink-0">

      <ForgeHeader currentView={currentView} setCurrentView={setCurrentView} />

      {currentView === 'creation' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-10 pb-20">

          <div className="space-y-5">
              <div className="flex items-center gap-2 text-zinc-500 mb-2"><UserCog className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">1. Brand & Theme</h3></div>
              <PopoverSelect label="THEME DNA (브랜드 모티프)" icon={<></>} value={themeDna} options={staticOptions.themeDna} onChange={handleThemeDnaChange} highlight="step" />
          </div>

          <div className="border-t border-zinc-800/50 pt-8 space-y-5">
              <div className="flex items-center gap-2 text-zinc-500 mb-2"><Columns className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">2. Architecture (구조 설계)</h3></div>
              <PopoverSelect label="COMPONENT TYPE (에셋 종류)" icon={<></>} value={assetType} options={staticOptions.assetTypes} onChange={handleAssetTypeChange} highlight="step" />
              <PopoverSelect label="LAYOUT ARCHETYPE (레이아웃 골격)" icon={<></>} value={layoutArchetype} options={staticOptions.layoutArchetypes} onChange={setLayoutArchetype} highlight="step" />
              <PopoverSelect label="SLOT STRUCTURE (정보/여백 슬롯)" icon={<></>} value={slotStructure} options={staticOptions.slotStructures} onChange={setSlotStructure} highlight="step" />
              <DropdownControl label="출력 모드 (Output Mode)" icon={<MonitorCheck className="w-3.5 h-3.5" />} data={staticOptions.outputFormats} value={outputFormat} onChange={setOutputFormat} theme={theme} />
          </div>

          <div className="border-t border-zinc-800/50 pt-8 space-y-4">
              <div className="flex items-center gap-2 text-zinc-500 mb-4"><Shapes className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">3. Base Form & Shape</h3></div>

              <div className="flex gap-3 mb-6">
                  <div onDragOver={handleStyleDragOver} onDragLeave={handleStyleDragLeave} onDrop={handleStyleDrop} className={`relative border border-dashed rounded-lg h-24 flex-1 flex flex-col items-center justify-center transition-all overflow-hidden group ${isDraggingStyle ? 'border-[#76cee0] bg-[#76cee0]/10' : 'border-zinc-700/50 bg-[#111111] hover:border-[#76cee0]/50'}`}>
                    {styleImage ? (
                        <div className="relative w-full h-full p-2 flex flex-col items-center justify-center group-hover:opacity-90 transition-all">
                            <img src={styleImage} className="w-full h-full object-cover rounded-md" alt="Style Source" />
                            <button onClick={handleClearStyleImage} className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"><X className="w-3 h-3" /></button>
                        </div>
                    ) : <div className="flex flex-col items-center gap-1.5 opacity-40 text-zinc-400"><UploadCloud className="w-4 h-4" /><p className="text-[9px] font-bold uppercase tracking-widest text-center">SHAPE REF</p></div>}
                    {!styleImage && <input type="file" onChange={handleStyleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
                  </div>
                  <div className="relative border border-dashed rounded-lg h-24 flex-1 flex flex-col items-center justify-center transition-all overflow-hidden opacity-50 border-zinc-700/50 bg-[#111111] cursor-not-allowed">
                      <div className="flex flex-col items-center gap-1.5 text-zinc-500"><Palette className="w-4 h-4" /><p className="text-[9px] font-bold uppercase tracking-widest text-center">TEXTURE REF</p></div>
                  </div>
              </div>

              <DropdownControl label="기본 형태 (Base Shape)" data={staticOptions.buttonShapes} value={buttonShape} onChange={setButtonShape} theme={theme} />
              <DropdownControl label="비율 (Aspect Ratio)" data={staticOptions.buttonRatios} value={buttonRatio} onChange={setButtonRatio} theme={theme} />
              <DropdownControl label="텍스트 세이프존 (가독성 여백)" data={staticOptions.textSafeZones} value={textSafeZone} onChange={setTextSafeZone} theme={theme} />
              <DropdownControl label="형태 왜곡 (Distortion)" data={staticOptions.shapeDistortions} value={shapeDistortion} onChange={setShapeDistortion} theme={theme} disabled={isOptionDisabled('shapeDistortion')} />
          </div>

          <div className="border-t border-zinc-800/50 pt-8 space-y-4">
              <div className="flex items-center gap-2 text-zinc-500 mb-4"><PaintBucket className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">4. Surface & Polish</h3></div>
              <DropdownControl label="표면 가공 (Surface)" data={staticOptions.surfaceTreatments} value={surfaceTreatment} onChange={setSurfaceTreatment} theme={theme} disabled={isOptionDisabled('surfaceTreatment')} />
              <DropdownControl label="바디 색상/재질 (Color/Mat)" data={staticOptions.materials} value={material} onChange={setMaterial} theme={theme} disabled={isOptionDisabled('material')} />
              <DropdownControl label="내부 질감/패턴 (Texture)" data={staticOptions.dramaticTextures} value={dramaticTex} onChange={setDramaticTex} theme={theme} disabled={isOptionDisabled('dramaticTex')} />
              <div className="pt-2 pb-2 border-l-2 border-[#76cee0]/30 pl-4 ml-1 space-y-4">
                 <DropdownControl label="프레임 두께 및 굵기" data={staticOptions.rimThicknesses} value={rimThickness} onChange={setRimThickness} theme={theme} disabled={isOptionDisabled('rimThickness')} />
                 <DropdownControl label="프레임 재질" data={staticOptions.rimMaterials} value={rimMaterial} onChange={setRimMaterial} theme={theme} disabled={isOptionDisabled('rimMaterial')} />
              </div>
          </div>

          <div className="border-t border-zinc-800/50 pt-8 space-y-4">
              <div className="flex items-center gap-2 text-zinc-500 mb-4"><SparkleFX className="w-4 h-4 text-[#76cee0]" /><h3 className="text-[11px] font-black uppercase tracking-widest text-[#76cee0]">5. Decoration & FX</h3></div>
              <DropdownControl label="장식 요소 (Deco)" data={staticOptions.buttonDecos} value={buttonDeco} onChange={setButtonDeco} theme={theme} />
              <DropdownControl label="배경 효과/광원 (Background FX)" data={staticOptions.energyCores} value={energyCore} onChange={setEnergyCore} theme={theme} disabled={isOptionDisabled('energyCore')} />
              <div className="pt-2">
                 <ToggleControl label="강렬한 스페큘러/하이라이트 (Glint)" enabled={enableGlint} onChange={() => setEnableGlint(!enableGlint)} theme={theme} disabled={isOptionDisabled('enableGlint')} />
              </div>
          </div>

          <ForgePromptForm
            userIntent={userIntent} setUserIntent={setUserIntent}
            isExpandingIntent={isExpandingIntent} handleExpandIntent={handleExpandIntent}
            openChatModal={openChatModal}
            isKeywordSetting={isKeywordSetting} handleKeywordSetup={handleKeywordSetup}
            isAnalyzingStyle={isAnalyzingStyle} analyzeStyle={analyzeStyle} styleImage={styleImage}
            handleResetSettings={handleResetSettings}
          />

        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col items-center justify-center text-zinc-500">
             <Edit2 className="w-12 h-12 mb-4 opacity-20" />
             <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Micro-Edit Mode</h2>
             <p className="text-xs opacity-60 mt-2 text-center break-keep-all">기존 컴포넌트의 레이아웃은 유지한 채, 재질/테마/광원만 교체하는 모드입니다. (준비 중)</p>
        </div>
      )}
    </aside>
  );
}
