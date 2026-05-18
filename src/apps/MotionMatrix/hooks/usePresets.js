import { useState } from 'react';
import { PRESETS, TRANSITION_TARGETS } from '../constants/presets';

// Manages "Production Presets" selection + Transition target auto-apply.
// `setLayers` and `showToast` are injected from the parent (App).
export function usePresets({ setLayers, setTargetMaterial, showToast }) {
  const [activePreset, setActivePreset] = useState('');

  const applyPreset = (presetId) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setLayers(preset.layers);
      setActivePreset(presetId);
      showToast(`✨ 프리셋 적용: ${preset.label}`);
    }
  };

  // Switching the Transition target material auto-fills surface/edge/ambient/intensity.
  const handleTargetMaterialChange = (newTarget) => {
    setTargetMaterial(newTarget);
    const targetInfo = TRANSITION_TARGETS.find((t) => t.id === newTarget);
    if (targetInfo && targetInfo.auto) {
      setLayers((prev) => ({ ...prev, ...targetInfo.auto }));
      showToast(`✨ [${targetInfo.label}]에 최적화된 효과들이 자동 적용되었습니다.`);
    }
  };

  return { activePreset, setActivePreset, applyPreset, handleTargetMaterialChange };
}
