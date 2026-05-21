/* eslint-disable */
// current 사이드바 통합 컨테이너.
import React from 'react';
import {
  LayoutTemplate, Cpu, ChevronDown, Code, RefreshCcw
} from 'lucide-react';
import SidebarHeader from './SidebarHeader.jsx';
import CreationPanel from './CreationPanel.jsx';
import EditPanel from './EditPanel.jsx';
import AdvancedOptions from './AdvancedOptions.jsx';
import { DropdownControl } from './PrimitiveUI.jsx';
import { staticOptions } from '../constants/options.js';
import { coreArchetypes } from '../constants/personas.jsx';

const Sidebar = ({ rp, version, setVersion, versions }) => {
  if (!rp.isSidebarOpen) {
    return (
      <aside className="w-0 border-none opacity-0 m-0 p-0 shrink-0 bg-transparent rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 z-50" />
    );
  }

  return (
    <aside className="w-[340px] shrink-0 border border-zinc-800 bg-[#18181B] rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 shadow-2xl z-50">
      <SidebarHeader
        version={version}
        setVersion={setVersion}
        versions={versions}
        isEditMode={rp.isEditMode}
        setCurrentView={rp.setCurrentView}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* 1. Purpose & Archetype Selector */}
        <div className="shrink-0 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2 px-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <LayoutTemplate className="w-3 h-3 text-zinc-500" />
              <h3 className="text-[11px] font-semibold tracking-wide text-zinc-400" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
                목적 프리셋
              </h3>
            </div>
            <DropdownControl data={staticOptions.purposes} value={rp.activePurpose} onChange={rp.handlePurposeChange} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2 px-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <Cpu className="w-3 h-3 text-zinc-500" />
              <h3 className="text-[11px] font-semibold tracking-wide text-zinc-400" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
                형태 철학 (Core Archetype)
              </h3>
            </div>
            <div className={`relative ${rp.coreDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
              <button onClick={() => rp.setCoreDropdownOpen(!rp.coreDropdownOpen)} className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 transition-colors text-left outline-none">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 opacity-80">{coreArchetypes.find(p => p.id === rp.coreArchetype)?.icon}</div>
                  <div>
                    <div className="text-[12px] font-semibold text-zinc-200 tracking-tight">{coreArchetypes.find(p => p.id === rp.coreArchetype)?.shortTitle}</div>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${rp.coreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {rp.coreDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-[#16161A] border border-zinc-800 rounded-lg overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                  {coreArchetypes.map(p => (
                    <button key={p.id} onClick={() => { rp.setCoreArchetype(p.id); rp.setCoreDropdownOpen(false); }} className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors ${rp.coreArchetype === p.id ? 'bg-zinc-800' : 'hover:bg-zinc-900'}`}>
                      <div className="mt-0.5 opacity-80">{p.icon}</div>
                      <div className="flex-1">
                        <div className={`text-[12px] font-semibold tracking-tight ${rp.coreArchetype === p.id ? 'text-emerald-300' : 'text-zinc-300'}`}>{p.shortTitle}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 tracking-tight">{p.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Specific Inputs (Creation vs Edit) */}
        {!rp.isEditMode ? (
          <CreationPanel
            inputText={rp.inputText}
            setInputText={rp.setInputText}
            incomingFromArc={rp.incomingFromArc}
            setIncomingFromArc={rp.setIncomingFromArc}
            isAnalyzingCreation={rp.isAnalyzingCreation}
            creationUploadedImage={rp.creationUploadedImage}
            setCreationUploadedImage={rp.setCreationUploadedImage}
            isCreationDragging={rp.isCreationDragging}
            handleCreationDragOver={rp.handleCreationDragOver}
            handleCreationDragLeave={rp.handleCreationDragLeave}
            handleCreationDrop={rp.handleCreationDrop}
            handleCreationImageUpload={rp.handleCreationImageUpload}
            analyzeCreationImage={rp.analyzeCreationImage}
            customDesignInjections={rp.customDesignInjections}
            setCustomDesignInjections={rp.setCustomDesignInjections}
            hasKoreanAura={rp.hasKoreanAura}
            handleExpandIntent={rp.handleExpandIntent}
            isExpandingIntent={rp.isExpandingIntent}
            personaSliderValue={rp.personaSliderValue}
            setPersonaSliderValue={rp.setPersonaSliderValue}
          />
        ) : (
          <EditPanel
            editUploadedImage={rp.editUploadedImage}
            setEditUploadedImage={rp.setEditUploadedImage}
            isDragging={rp.isDragging}
            handleDragOver={rp.handleDragOver}
            handleDragLeave={rp.handleDragLeave}
            handleEditDrop={rp.handleEditDrop}
            handleEditImageUpload={rp.handleEditImageUpload}
            editInstruction={rp.editInstruction}
            setEditInstruction={rp.setEditInstruction}
            hasKoreanEdit={rp.hasKoreanEdit}
            openEditTuningRoom={rp.openEditTuningRoom}
            handleEditExpandIntent={rp.handleEditExpandIntent}
            isEditExpandingIntent={rp.isEditExpandingIntent}
            personaSliderValue={rp.personaSliderValue}
            setPersonaSliderValue={rp.setPersonaSliderValue}
            applyAiRecInEdit={rp.applyAiRecInEdit}
            setApplyAiRecInEdit={rp.setApplyAiRecInEdit}
            applyAutoRefine={rp.applyAutoRefine}
            setApplyAutoRefine={rp.setApplyAutoRefine}
          />
        )}

        {/* 3. Export / Reset (Common, only creation) */}
        {!rp.isEditMode && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={rp.extractRecipe} title="현재 설정들을 Typecore JSON Recipe 형태로 복사합니다" className="py-2 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/15 text-indigo-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              <Code className="w-3.5 h-3.5" /> <span className="text-[11px] font-semibold tracking-wide">Export</span>
            </button>
            <button onClick={rp.handleReset} title="초기화" className="py-2 bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200 text-zinc-400 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              <RefreshCcw className="w-3.5 h-3.5" /> <span className="text-[11px] font-semibold tracking-wide">Reset</span>
            </button>
          </div>
        )}

        {/* 4. Core Options Wrapper */}
        <AdvancedOptions
          isEditMode={rp.isEditMode}
          editUploadedImage={rp.editUploadedImage}
          isAdvancedOptionsEnabled={rp.isAdvancedOptionsEnabled}
          setIsAdvancedOptionsEnabled={rp.setIsAdvancedOptionsEnabled}
          openCardId={rp.openCardId}
          editOpenCardId={rp.editOpenCardId}
          handleToggleCard={rp.handleToggleCard}
          handleEditToggleCard={rp.handleEditToggleCard}
          dynamicOptions={rp.dynamicOptions}
          editStrokeMod={rp.editStrokeMod} setEditStrokeMod={rp.setEditStrokeMod}
          editElementMod={rp.editElementMod} setEditElementMod={rp.setEditElementMod}
          editSurfaceMod={rp.editSurfaceMod} setEditSurfaceMod={rp.setEditSurfaceMod}
          layoutType={rp.layoutType} setLayoutType={rp.setLayoutType}
          subTitleSize={rp.subTitleSize} setSubTitleSize={rp.setSubTitleSize}
          aspectRatio={rp.aspectRatio} setAspectRatio={rp.setAspectRatio}
          occupancy={rp.occupancy} setOccupancy={rp.setOccupancy}
          layoutPreset={rp.layoutPreset} setLayoutPreset={rp.setLayoutPreset}
          handleLayoutPresetChange={rp.handleLayoutPresetChange}
          mmoSilhouetteFraming={rp.mmoSilhouetteFraming} setMmoSilhouetteFraming={rp.setMmoSilhouetteFraming}
          stemWeight={rp.stemWeight} setStemWeight={rp.setStemWeight}
          charWidth={rp.charWidth} setCharWidth={rp.setCharWidth}
          charProportion={rp.charProportion} setCharProportion={rp.setCharProportion}
          terminalStyle={rp.terminalStyle} setTerminalStyle={rp.setTerminalStyle}
          strokeSharpness={rp.strokeSharpness} setStrokeSharpness={rp.setStrokeSharpness}
          slicingIntensity={rp.slicingIntensity} setSlicingIntensity={rp.setSlicingIntensity}
          cornerStyle={rp.cornerStyle} setCornerStyle={rp.setCornerStyle}
          strokeExtension={rp.strokeExtension} setStrokeExtension={rp.setStrokeExtension}
          kerning={rp.kerning} setKerning={rp.setKerning}
          letterConnection={rp.letterConnection} setLetterConnection={rp.setLetterConnection}
          internalSpace={rp.internalSpace} setInternalSpace={rp.setInternalSpace}
          logoDegree={rp.logoDegree} setLogoDegree={rp.setLogoDegree}
          baseStyle={rp.baseStyle} setBaseStyle={rp.setBaseStyle}
          deformationDamage={rp.deformationDamage} setDeformationDamage={rp.setDeformationDamage}
          mmoSurroundingElement={rp.mmoSurroundingElement} setMmoSurroundingElement={rp.setMmoSurroundingElement}
          isEnhanceModeEnabled={rp.isEnhanceModeEnabled} setIsEnhanceModeEnabled={rp.setIsEnhanceModeEnabled}
          enhanceMode={rp.enhanceMode} setEnhanceMode={rp.setEnhanceMode}
          momentumActive={rp.momentumActive} setMomentumActive={rp.setMomentumActive}
        />
      </div>
    </aside>
  );
};

export default Sidebar;
