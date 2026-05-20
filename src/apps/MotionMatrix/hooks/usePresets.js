import { useState } from 'react';
import { PRESETS, PRESET_GROUPS, TRANSITION_TARGETS } from '../constants/presets';

// RenderMatrix usePresets 와 동일 패턴 — activePresetGroup/Id + isPresetModified.
// 적용 시 layers 객체를 통째로 set, group/id state 동시 추적.
// 사용자가 어떤 layer 라도 직접 바꾸면 markModified 로 'AMBER 수정됨' 표시 트리거.
export function usePresets({ setLayers, setTargetMaterial, showToast }) {
  const [activePresetGroup, setActivePresetGroup] = useState(PRESET_GROUPS[0].id);
  const [activePresetId, setActivePresetId] = useState('');
  const [isPresetModified, setIsPresetModified] = useState(false);

  // 카드 클릭 — preset 객체를 직접 받음 (RenderMatrix 패턴).
  const handleApplyPreset = (preset) => {
    if (!preset) return;
    setLayers(preset.layers);
    setActivePresetId(preset.id);
    setIsPresetModified(false);
    showToast?.(`✨ 프리셋 적용: ${preset.label}`);
  };

  // 하위호환 — 기존 applyPreset(id) 호출처 유지 (혹시 남은 import 가 있으면 깨지지 않게).
  const applyPreset = (presetId) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    handleApplyPreset(preset);
  };

  // 직접 layer 변경 시 호출 — 적용 중인 프리셋이 있으면 수정됨 표시.
  const markModified = () => { if (activePresetId) setIsPresetModified(true); };

  // Transition target material 변경 시 자동 surface/edge/ambient/intensity 채우기 (기존 로직 그대로).
  const handleTargetMaterialChange = (newTarget) => {
    setTargetMaterial(newTarget);
    const targetInfo = TRANSITION_TARGETS.find((t) => t.id === newTarget);
    if (targetInfo && targetInfo.auto) {
      setLayers((prev) => ({ ...prev, ...targetInfo.auto }));
      showToast?.(`✨ [${targetInfo.label}]에 최적화된 효과들이 자동 적용되었습니다.`);
    }
  };

  return {
    activePresetGroup, setActivePresetGroup,
    activePresetId, setActivePresetId,
    isPresetModified, setIsPresetModified,
    handleApplyPreset, applyPreset, markModified,
    handleTargetMaterialChange,
    // 하위호환 — 일부 호출처가 activePreset/setActivePreset 이름을 사용.
    activePreset: activePresetId, setActivePreset: setActivePresetId,
  };
}
