// TODO: 현재 RubiconForge 는 명시적 preset 시스템이 없다.
// AssetType / ThemeDna 변경 시 자동으로 기본값을 갱신하는 '의사 프리셋'은
// useForgePrompt 내부의 handleAssetTypeChange / handleThemeDnaChange 가 담당한다.
//
// 추후 named preset (e.g. "리니지 시그니처 CTA", "캐주얼 팝 배지") 도입 시 이 훅을 확장.
// 일관된 폴더 구조 유지를 위해 빈 스텁 형태로 유지한다.

import { PRESETS } from "../constants/presets";

export function usePresets() {
  return {
    presets: PRESETS,
    // 추후 확장: activePresetId, applyPreset, isModified, markModified ...
  };
}
