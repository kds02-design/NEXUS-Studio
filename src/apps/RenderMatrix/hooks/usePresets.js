import { useState } from "react";
import { PRESET_GROUPS } from "../constants/presets";

// 프리셋 그룹 + 적용 상태 관리.
// 적용 후 setters 객체를 통해 useRenderPrompt 의 setter 들을 호출하는 형태.
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
    if (s.enableGlint !== undefined) setters.enableGlint(s.enableGlint);
    if (s.enableVfx !== undefined) setters.enableVfx(s.enableVfx);
    if (s.enableShadow !== undefined) setters.enableShadow(s.enableShadow);
    setActivePresetId(preset.id);
    setIsPresetModified(false);
    onApplied?.(preset);
  };

  // useRenderPrompt 의 setter wrapper. 사용자가 어떤 옵션이든 직접 바꿨다면 '수정됨' 표시 트리거.
  const markModified = () => { if (activePresetId) setIsPresetModified(true); };

  return {
    activePresetGroup, setActivePresetGroup,
    activePresetId, setActivePresetId,
    isPresetModified, setIsPresetModified,
    handleApplyPreset,
    markModified,
  };
}
