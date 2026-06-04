import { useState } from "react";
import { PRESET_GROUPS } from "../constants/presets";

// 프리셋 그룹/선택 상태 + 적용 핸들러.
// RenderMatrix 와 거의 동일한 구조이지만 Pop 의 setter 키들과 일치하도록 별도 유지.
// onAnalyzeReference — "레퍼런스 완벽 복사" 프리셋(ref_copy)이 클릭됐을 때 정적 옵션 적용 대신
//                      분석 버튼과 동일한 흐름을 트리거. 사이드바 분석 버튼과 진입점 통일.
export function usePresets({ setters, onApplied, onAnalyzeReference }) {
  const [activePresetGroup, setActivePresetGroup] = useState(PRESET_GROUPS[0].id);
  const [activePresetId, setActivePresetId] = useState(null);
  const [isPresetModified, setIsPresetModified] = useState(false);

  const handleApplyPreset = (preset) => {
    if (!preset) return;
    // ref_copy — 정적 옵션 셋을 박지 않고 사이드바 "레퍼런스 분석" 흐름으로 위임.
    // 이미지에 맞춘 동적 매핑이 정적 카멜레온 세팅(HyperChrome 등)보다 정확.
    if (preset.id === "ref_copy") {
      setActivePresetId(preset.id);
      setIsPresetModified(false);
      onAnalyzeReference?.();
      return;
    }
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
