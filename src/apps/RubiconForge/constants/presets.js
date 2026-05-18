// TODO: RubiconForge 는 현재 정식 'preset' 데이터를 갖고 있지 않다.
// 대신 handleAssetTypeChange / handleThemeDnaChange 가 동적으로 기본값을 갱신하는
// '의사 프리셋' 패턴으로 동작한다. (useForgePrompt 훅 내부)
//
// 추후 진짜 named preset 묶음이 도입되면 여기에 PRESET_GROUPS 등으로 정의할 것.
// 폴더 구조 유지를 위해 빈 스텁만 유지.

export const PRESETS = [];
