/* eslint-disable */
// current 사이드바 통합 컨테이너.
import React, { useState } from 'react';
import {
  LayoutTemplate, Cpu, ChevronDown, Code, RefreshCcw,
  Users, PenTool, Edit3, Sliders,
} from 'lucide-react';
import SidebarHeader from './SidebarHeader.jsx';
import CreationPanel from './CreationPanel.jsx';
import EditPanel from './EditPanel.jsx';
import AdvancedOptions from './AdvancedOptions.jsx';
import { DropdownControl } from './PrimitiveUI.jsx';
import { coreArchetypes } from '../constants/personas.jsx';
import SectionGroup, { SectionGroupAccent } from '../../../../../components/SectionGroup.jsx';

// 아이콘 그리드 한 칸 — 활성 시 반투명 포인트 컬러 배경 + 강조 텍스트.
const IconGridButton = ({ active, onClick, title, icon, label }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border transition-all min-h-[68px] ${
      active
        ? 'bg-blue-500/12 border-blue-500/50 text-blue-300'
        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200'
    }`}
  >
    <span className={active ? 'text-blue-300' : 'text-zinc-400'}>{icon}</span>
    <span className="text-[10px] font-semibold leading-tight text-center truncate w-full">{label}</span>
  </button>
);

const Sidebar = ({ rp, version, setVersion, versions }) => {
  // 아코디언 — 한 번에 한 그룹만 열림. 첫 그룹(director)이 기본 열림 상태.
  // 열린 그룹 헤더를 다시 클릭하면 닫힘 → 모두 닫힌 상태로 갈 수 있음.
  const [openSection, setOpenSection] = useState('director');
  const toggleSection = (key) => (next) => setOpenSection((cur) => (next ? key : (cur === key ? null : cur)));

  if (!rp.isSidebarOpen) {
    return (
      <aside className="w-0 border-none opacity-0 m-0 p-0 shrink-0 bg-transparent rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 z-50" />
    );
  }

  return (
    <aside className="w-[540px] shrink-0 border border-zinc-800 bg-[#18181B] rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 shadow-2xl z-50">
      <SidebarHeader
        version={version}
        setVersion={setVersion}
        versions={versions}
        isEditMode={rp.isEditMode}
        setCurrentView={rp.setCurrentView}
      />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 custom-scrollbar">
        <SectionGroupAccent value="#A29BFE">
        {/* PURPOSE 영역은 제거됨 — 페르소나 시스템과 차원이 충돌해서.
            staticOptions.purposes / activePurpose / handlePurposeChange / PURPOSE_META 는
            extractRecipe 와 호환성 위해 코드는 보존, UI 만 숨김. */}

        {/* DIRECTOR — 디렉터 페르소나 (아이콘 그리드) */}
        <SectionGroup icon={<Users className="w-3.5 h-3.5" />} labelFont="sans" label="디렉터 페르소나" dotColor="#10b981"
          open={openSection === 'director'} onToggle={toggleSection('director')}>
          <div className="grid grid-cols-5 gap-2">
            {coreArchetypes.map(p => (
              <IconGridButton
                key={p.id}
                active={rp.coreArchetype === p.id}
                onClick={() => rp.setCoreArchetype(p.id)}
                title={`${p.shortTitle} — ${p.subtitle}`}
                icon={React.cloneElement(p.icon, { className: 'w-5 h-5' })}
                label={p.nickname || p.shortTitle}
              />
            ))}
          </div>
        </SectionGroup>

        {/* CONTENT — Creation 또는 Edit 입력 */}
        <SectionGroup
          icon={rp.isEditMode ? <Edit3 className="w-3.5 h-3.5" /> : <PenTool className="w-3.5 h-3.5" />}
          labelFont="sans"
          label={rp.isEditMode ? '리터칭 대상' : '컨텐츠 작성'}
          dotColor="#A29BFE"
          open={openSection === 'content'} onToggle={toggleSection('content')}>
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
        </SectionGroup>

        {/* ACTIONS — Export / Reset (creation 모드 전용) */}
        {!rp.isEditMode && (
          <SectionGroup icon={<Zap className="w-3.5 h-3.5" />} labelFont="sans" label="액션" dotColor="#FDCB6E"
            open={openSection === 'actions'} onToggle={toggleSection('actions')}>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={rp.extractRecipe} title="현재 설정들을 Typecore JSON Recipe 형태로 복사합니다" className="py-2 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/15 text-indigo-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                <Code className="w-3.5 h-3.5" /> <span className="text-[11px] font-semibold tracking-wide">Export</span>
              </button>
              <button onClick={rp.handleReset} title="초기화" className="py-2 bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200 text-zinc-400 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                <RefreshCcw className="w-3.5 h-3.5" /> <span className="text-[11px] font-semibold tracking-wide">Reset</span>
              </button>
            </div>
          </SectionGroup>
        )}

        {/* ADVANCED — Core Options Wrapper */}
        <SectionGroup icon={<Sliders className="w-3.5 h-3.5" />} labelFont="sans" label="고급 옵션" dotColor="#FD79A8"
          open={openSection === 'advanced'} onToggle={toggleSection('advanced')}>
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
        </SectionGroup>
        </SectionGroupAccent>
      </div>
    </aside>
  );
};

export default Sidebar;
