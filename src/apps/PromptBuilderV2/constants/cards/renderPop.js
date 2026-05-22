// RenderMatrixPop 핵심 옵션 — 캐주얼/팝 톤 렌더링 빌더.
// staticOptions(shapeFeels, fidelityLevels, baseStyles, colorPalettes, outlineStyles, depthStyles, fxStyles, backgrounds) 기반.

export const renderPopCards = [
  {
    id: 'rp_shape', title: '형태 톤', importance: 'critical',
    summary: '형태감 · 디테일 충실도',
    fields: [
      { key: 'feel', label: '형태감', type: 'choice',
        choices: ['bouncy', 'chunky', 'cute', 'sharp', 'pillowy'], default: 'bouncy',
        map: { bouncy: 'bouncy soft squash-and-stretch form',
               chunky: 'chunky thick volumetric form',
               cute: 'cute miniature kawaii proportions',
               sharp: 'sharp pop-art geometric form',
               pillowy: 'pillowy inflated balloon volume' } },
      { key: 'fidelity', label: '디테일', type: 'choice',
        choices: ['minimal', 'standard', 'rich'], default: 'standard',
        map: { minimal: 'minimal flat detail', standard: 'standard cartoon detail',
               rich: 'richly detailed comic illustration' } },
    ],
    promptFn: (v, f) =>
      `Shape feel: ${f[0].map[v.feel]}, ${f[1].map[v.fidelity]}.`,
  },
  {
    id: 'rp_base', title: '베이스 스타일', importance: 'essential',
    summary: '팝 · 애니메 · 코믹 · 칠드런 등 톤',
    fields: [
      { key: 'style', label: '베이스 스타일', type: 'choice',
        choices: ['pop', 'anime', 'comic', 'sticker', 'children'], default: 'pop',
        map: { pop: 'bold pop-art primary palette, high impact',
               anime: 'Japanese anime cell-shaded style',
               comic: 'western comic book ink shades and bold outlines',
               sticker: 'die-cut sticker with white border',
               children: 'soft pastel children-book illustration' } },
    ],
    promptFn: (v, f) => `Base style: ${f[0].map[v.style]}.`,
  },
  {
    id: 'rp_color', title: '컬러 팔레트', importance: 'editable',
    summary: '컬러 분위기 · 외곽선',
    fields: [
      { key: 'palette', label: '팔레트', type: 'choice',
        choices: ['vibrant', 'pastel', 'duotone', 'rainbow', 'monochrome'], default: 'vibrant',
        map: { vibrant: 'vibrant saturated primary palette',
               pastel: 'soft pastel palette',
               duotone: 'duotone two-color contrast',
               rainbow: 'full rainbow gradient',
               monochrome: 'monochrome single-hue palette' } },
      { key: 'outline', label: '외곽선', type: 'choice',
        choices: ['none', 'thin', 'thick', 'double'], default: 'thick',
        map: { none: 'no outline', thin: 'thin clean outline',
               thick: 'bold thick black outline',
               double: 'double-layered outline (white inside, black outside)' } },
    ],
    promptFn: (v, f) =>
      `Color: ${f[0].map[v.palette]}, outline ${f[1].map[v.outline]}.`,
  },
  {
    id: 'rp_depth', title: '입체 · 그림자', importance: 'editable',
    summary: '깊이감 처리 방식',
    fields: [
      { key: 'depth', label: '깊이감', type: 'choice',
        choices: ['flat', 'offset', 'soft3d', 'isometric', 'extruded'], default: 'offset',
        map: { flat: 'flat 2D no depth', offset: 'offset shadow with crisp drop',
               soft3d: 'soft 3D-shaded cartoon volume',
               isometric: 'isometric 3D blocky perspective',
               extruded: 'extruded 3D block letters with side faces' } },
    ],
    promptFn: (v, f) => `Depth treatment: ${f[0].map[v.depth]}.`,
  },
  {
    id: 'rp_fx', title: 'FX · 배경', importance: 'optional',
    summary: '효과 스타일 · 배경 환경',
    fields: [
      { key: 'fx', label: 'FX', type: 'choice',
        choices: ['none', 'sparkles', 'speedlines', 'stars', 'bubbles', 'starburst'], default: 'none',
        map: { none: 'no extra FX', sparkles: 'sparkle stars and glints',
               speedlines: 'manga-style speed lines',
               stars: 'scattered star dust',
               bubbles: 'rising bubble particles',
               starburst: 'radial starburst behind the subject' } },
      { key: 'bg', label: '배경', type: 'choice',
        choices: ['solid', 'gradient', 'dots', 'stripes', 'burst', 'scene'], default: 'solid',
        map: { solid: 'solid color background', gradient: 'smooth gradient background',
               dots: 'polka dot pattern', stripes: 'diagonal stripe pattern',
               burst: 'comic burst radial background',
               scene: 'cute illustrated scene background' } },
    ],
    promptFn: (v, f) =>
      `FX: ${f[0].map[v.fx]}. Background: ${f[1].map[v.bg]}.`,
  },
];
