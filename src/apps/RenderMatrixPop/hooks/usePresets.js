import { useState } from "react";
import { PRESET_GROUPS } from "../constants/presets";

// 프리셋 그룹/선택 상태 + 적용 핸들러.
// RenderMatrix 와 거의 동일한 구조이지만 Pop 의 setter 키들과 일치하도록 별도 유지.
export function usePresets({ setters, onApplied }) {
  const [activePresetGroup, setActivePresetGroup] = useState(PRESET_GROUPS[0].id);
  const [activePresetId, setActivePresetId] = useState(null);
  const [isPresetModified, setIsPresetModified] = useState(false);

  const handleApplyPreset = (preset) => {
    if (!preset) return;
    const s = preset.settings;
    if (s.directorPersona) setters.directorPersona(s.directorPersona);
    if (s.material) setters.material(s.material);
    if (s.frontRelief) setters.frontRelief(s.frontRelief);
    if (s.projectionDepth) setters.projectionDepth(s.projectionDepth);
    if (s.cameraLens) setters.cameraLens(s.cameraLens);
    if (s.dramaticTex) setters.dramaticTex(s.dramaticTex);
    if (s.surfaceTreatment !== undefined) setters.surfaceTreatment(s.surfaceTreatment);
    if (s.surfaceDetail) setters.surfaceDetail(s.surfaceDetail);
    if (s.wearLevel) setters.wearLevel(s.wearLevel);
    if (s.energyCore) setters.energyCore(s.energyCore);
    if (s.fxOrigin) setters.fxOrigin(s.fxOrigin);
    if (s.fxIntensity) setters.fxIntensity(s.fxIntensity);
    if (s.background) setters.background(s.background);
    if (s.rimThickness !== undefined) setters.rimThickness(s.rimThickness);
    if (s.rimColor !== undefined) setters.rimColor(s.rimColor);
    if (s.rimIntensity !== undefined) setters.rimIntensity(s.rimIntensity);
    if (s.vfxPassMode !== undefined) setters.vfxPassMode(s.vfxPassMode);
    setActivePresetId(preset.id);
    setIsPresetModified(false);
    onApplied?.(preset);
  };

  const markModified = () => { if (activePresetId) setIsPresetModified(true); };

  return {
    activePresetGroup, setActivePresetGroup,
    activePresetId, setActivePresetId,
    isPresetModified, setIsPresetModified,
    handleApplyPreset,
    markModified,
  };
}
