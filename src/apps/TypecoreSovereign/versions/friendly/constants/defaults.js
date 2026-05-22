// friendly 모드 — 사용자에게 노출하지 않는 옵션의 합리적 기본값.
// current 의 옵션 키를 그대로 재사용해서 buildPrompts 와 호환된다.
// 사용자는 5개 목적 + 텍스트 + 분위기만 다루고, 나머지는 여기서 자동 세팅.

export const friendlyDefaults = {
  coreArchetype: 'core_fortress',     // 목적 카드에 의해 덮어쓰여짐
  layoutType: 'Center',
  layoutPreset: 'CenterLogo',
  aspectRatio: '16:9',
  occupancy: '50%',
  subTitleSize: 'Sub_Small',
  mmoSilhouetteFraming: 'Emblem',
  charWidth: 'Normal',
  charProportion: 'P_Std',
  kerning: 'Kern_Std',
  letterConnection: 'Conn_Indep',
  internalSpace: 'Space_Std',
  logoDegree: 'Logo_Std',
  baseStyle: 'BlackWhite',
  strokeExtension: 'Ext_None',
  isEnhanceModeEnabled: true,
  enhanceMode: 'refine',
  activeGuards: ['guard_mutation', 'guard_3d', 'guard_layout', 'guard_noise'],
  personaSliderValue: 50,
};

// 목적 카드 id → current 의 Purpose_* 가 가진 layout/ratio/occ/core/frame 덮어쓰기 매핑.
// staticOptions.purposes 와 동일 데이터를 친절 모드 진입 시 자동 적용한다.
export const purposeOverrides = {
  'game-logo':    { layoutType: 'Center',   aspectRatio: '16:9',   occupancy: '50%', coreArchetype: 'core_fortress', mmoSilhouetteFraming: 'Emblem',     layoutPreset: 'CenterLogo' },
  'brand-hero':   { layoutType: '1Line',    aspectRatio: '2.76:1', occupancy: '40%', coreArchetype: 'core_fortress', mmoSilhouetteFraming: 'Horizontal', layoutPreset: 'WideTitle' },
  'promo':        { layoutType: 'TitleSub', aspectRatio: '16:9',   occupancy: '65%', coreArchetype: 'core_kinetic',  mmoSilhouetteFraming: 'Expanded',   layoutPreset: 'CinematicPan' },
  'event':        { layoutType: '2Lines',   aspectRatio: '1:1',    occupancy: '80%', coreArchetype: 'core_blade',    mmoSilhouetteFraming: 'Compressed', layoutPreset: '' },
  'symbol':       { layoutType: 'Center',   aspectRatio: '1:1',    occupancy: '65%', coreArchetype: 'core_glyph',    mmoSilhouetteFraming: 'Emblem',     layoutPreset: 'CenterLogo' },
};
