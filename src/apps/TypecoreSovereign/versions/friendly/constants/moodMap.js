// friendly 모드 — 분위기 슬라이더(0~100)를 current 의 옵션 셋으로 매핑.
// 5단계로 양자화해서 한 슬라이더가 ~10개 옵션을 동시에 조정한다.
// 사용자는 "고요함 ↔ 격렬함" 하나만 보지만, 내부에서는 stem/terminal/slicing/damage/momentum 등이 함께 움직임.

export const moodLevels = [
  {
    threshold: 0,
    label: '고요함',
    stemWeight: 'Stem_Std',
    terminalStyle: 'Term_Round',
    strokeSharpness: 'Sharp_Soft',
    slicingIntensity: 'Slic_None',
    deformationDamage: 'Damage_None',
    mmoSurroundingElement: 'Clean',
    cornerStyle: 'Corner_Round',
    momentumActive: false,
  },
  {
    threshold: 25,
    label: '차분함',
    stemWeight: 'Stem_Std',
    terminalStyle: 'Term_Clean',
    strokeSharpness: 'Sharp_Std',
    slicingIntensity: 'Slic_None',
    deformationDamage: 'Damage_None',
    mmoSurroundingElement: 'Clean',
    cornerStyle: 'Corner_Right',
    momentumActive: false,
  },
  {
    threshold: 50,
    label: '균형',
    stemWeight: 'Stem_Heavy',
    terminalStyle: 'Term_Chisel',
    strokeSharpness: 'Sharp_Std',
    slicingIntensity: 'Slic_None',
    deformationDamage: 'Damage_None',
    mmoSurroundingElement: 'Clean',
    cornerStyle: 'Corner_Right',
    momentumActive: false,
  },
  {
    threshold: 75,
    label: '강렬함',
    stemWeight: 'Stem_Heavy',
    terminalStyle: 'Term_Blade',
    strokeSharpness: 'Sharp_Crisp',
    slicingIntensity: 'Slic_Partial',
    deformationDamage: 'Damage_Erosion',
    mmoSurroundingElement: 'FloatingRunes',
    cornerStyle: 'Corner_Wedge',
    momentumActive: false,
  },
  {
    threshold: 100,
    label: '격렬함',
    stemWeight: 'Stem_Ultra',
    terminalStyle: 'Term_Claw',
    strokeSharpness: 'Sharp_Razor',
    slicingIntensity: 'Slic_Diagonal',
    deformationDamage: 'Damage_Cracking',
    mmoSurroundingElement: 'Shattered',
    cornerStyle: 'Corner_Blade',
    momentumActive: true,
  },
];

export function moodToOptions(value) {
  const v = Number(value) || 0;
  let best = moodLevels[0];
  for (const lv of moodLevels) {
    if (v >= lv.threshold) best = lv;
  }
  return best;
}

export function moodLabel(value) {
  return moodToOptions(value).label;
}
