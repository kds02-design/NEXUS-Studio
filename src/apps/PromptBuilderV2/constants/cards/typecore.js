// TypecoreSovereign 핵심 옵션을 PromptBuilderV2 카드 시스템에 통합.
// v1 (Calligraphy Engine V10) 의 6 장르와 핵심 필드를 추출 — 영문 매핑은 .map 에 인라인.

export const typecoreCards = [
  {
    id: 'tc_genre', title: '장르 선택', importance: 'critical',
    summary: 'RPG / Casual / Calli / Western / Cyber / Street',
    fields: [
      { key: 'genre', label: '장르', type: 'choice',
        choices: ['MMO', 'Casual', 'Calli', 'Western', 'Cyber', 'Street'], default: 'MMO',
        map: {
          MMO: 'Hardcore RPG, dark fantasy, heavy stone-metal structures, medieval authority',
          Casual: 'Casual mobile/anime, bouncy volume, pop art, sticker energy',
          Calli: 'Oriental calligraphy, ink wash, brush pressure, martial-arts elegance',
          Western: 'Western pen calligraphy, Gothic Blackletter, Copperplate flourishes',
          Cyber: 'Cyberpunk / Sci-Fi, digital noise, glitch, neon, modular geometry',
          Street: 'Graffiti / Street Art, hip-hop, spray texture, paint drips, wildstyle',
        } },
    ],
    promptFn: (v, f) => `Genre direction: ${f[0].map[v.genre]}.`,
  },
  {
    id: 'tc_layout', title: '기본 레이아웃', importance: 'essential',
    summary: '비율 · 비중(여백) · 배치',
    fields: [
      { key: 'ratio', label: '비율', type: 'choice',
        choices: ['1:1', '16:9', '2.76:1'], default: '16:9',
        map: { '1:1': '1:1', '16:9': '16:9', '2.76:1': '2.76:1 cinematic' } },
      { key: 'occupancy', label: '비중', type: 'choice',
        choices: ['30%', '50%', '70%', '85%', '100%'], default: '50%',
        map: {
          '30%': 'extreme spatial isolation, 70% empty void',
          '50%': 'strict central buffer, large negative margins',
          '70%': 'balanced occupancy with comfortable margins',
          '85%': 'dominant scale, thin margins',
          '100%': 'maximum scale, hits edges',
        } },
      { key: 'layout', label: '배치', type: 'choice',
        choices: ['1Line', '2Lines'], default: '1Line',
        map: { '1Line': 'strict single horizontal row, no vertical stacking',
               '2Lines': 'two-tier vertically stacked composition' } },
      { key: 'bg', label: '배경', type: 'choice',
        choices: ['BlackWhite', 'WhiteBlack'], default: 'BlackWhite',
        map: { BlackWhite: 'jet black background, radiant white subject',
               WhiteBlack: 'stark white background, solid black subject' } },
    ],
    promptFn: (v, f) => {
      const r = f[0].map[v.ratio], o = f[1].map[v.occupancy], l = f[2].map[v.layout], b = f[3].map[v.bg];
      return `Layout: AR ${r}, occupancy = ${o}, ${l}. Background: ${b}.`;
    },
  },
  {
    id: 'tc_morphology', title: '핵심 조형', importance: 'essential',
    summary: '뼈대 두께 · 자간 · 자폭 · 글자 비율',
    fields: [
      { key: 'weight', label: '뼈대', type: 'choice',
        choices: ['thin', 'std', 'block', 'kinetic'], default: 'kinetic',
        map: { thin: 'razor thin stems', std: 'medium balanced stems',
               block: 'massive heavy block stems',
               kinetic: 'kinetic variable stems, heavy impact transitioning to razor-thin tapering' } },
      { key: 'kerning', label: '자간', type: 'choice',
        choices: ['wide', 'std', 'overlap'], default: 'std',
        map: { wide: 'wide letter spacing', std: 'standard kerning',
               overlap: 'tight overlapping architectural kerning' } },
      { key: 'width', label: '자폭', type: 'choice',
        choices: ['narrow', 'normal', 'wide'], default: 'normal',
        map: { narrow: 'condensed slim width', normal: 'standard balanced width', wide: 'expansive epic width' } },
      { key: 'proportion', label: '글자 비율 W:H', type: 'choice',
        choices: ['5:10', '7:10', '10:10', '12:10', '15:10'], default: '7:10',
        map: { '5:10': 'condensed 5:10 tall', '7:10': 'standard 7:10', '10:10': 'square 10:10',
               '12:10': 'extended 12:10 horizontal', '15:10': 'panoramic 15:10' } },
    ],
    promptFn: (v, f) =>
      `Morphology: ${f[0].map[v.weight]}, ${f[1].map[v.kerning]}, ${f[2].map[v.width]} width, ${f[3].map[v.proportion]} ratio.`,
  },
  {
    id: 'tc_stroke', title: '필획 세부', importance: 'editable',
    summary: '끝 마감 · 예리함 · 질감 · 확장',
    fields: [
      { key: 'terminal', label: '끝 획', type: 'choice',
        choices: ['serif', 'round', 'blade', 'thorn', 'chisel'], default: 'chisel',
        map: { serif: 'classic serif terminals', round: 'smooth rounded terminals',
               blade: 'razor blade terminal tips', thorn: 'sharp thorn terminals',
               chisel: 'faceted chisel-cut terminals with defined metal planes' } },
      { key: 'sharpness', label: '예리함', type: 'choice',
        choices: ['razor', 'crisp', 'soft'], default: 'razor',
        map: { razor: 'razor-sharp aggressive cutting edges',
               crisp: 'crisp clean vector lines',
               soft: 'softened diffused organic edges' } },
      { key: 'texture', label: '질감', type: 'choice',
        choices: ['frayed', 'clean', 'scorched', 'subtle', 'hologram'], default: 'frayed',
        map: { frayed: 'frayed ink texture', clean: 'perfectly smooth vector edge',
               scorched: 'scorched etched charred-steel texture', subtle: 'subtle weathered erosion',
               hologram: 'ethereal holographic edge diffraction' } },
      { key: 'extension', label: '획 확장', type: 'choice',
        choices: ['none', 'elegant', 'razor', 'infinite'], default: 'razor',
        map: { none: 'contained terminals',
               elegant: 'elegant tapered stroke extensions flowing into margins',
               razor: 'razor-sharp elongated stroke tails stretching horizontally',
               infinite: 'hyper-extended stroke ends piercing boundaries' } },
    ],
    promptFn: (v, f) =>
      `Stroke detail: ${f[0].map[v.terminal]}, ${f[1].map[v.sharpness]}, ${f[2].map[v.texture]}, ${f[3].map[v.extension]}.`,
  },
  {
    id: 'tc_dynamics', title: '동세 및 변형', importance: 'editable',
    summary: '운동량 · 기울기 · 절단 · 손상',
    fields: [
      { key: 'kinetic', label: '운동량', type: 'choice',
        choices: ['static', 'swift', 'slashing', 'warp'], default: 'slashing',
        map: { static: 'zero momentum, stable balance',
               swift: 'dynamic forward momentum with subtle horizontal stretching',
               slashing: 'aggressive slashing diagonal energy as if cut by a blade',
               warp: 'extreme kinetic acceleration, warped edges' } },
      { key: 'slant', label: '기울기', type: 'choice',
        choices: ['0', '15', '25'], default: '0',
        map: { '0': 'perfectly upright', '15': '15-degree forward slant', '25': 'aggressive 25-degree slant' } },
      { key: 'slicing', label: '절단', type: 'choice',
        choices: ['none', 'partial', 'deep', 'total'], default: 'partial',
        map: { none: 'intact strokes', partial: 'micro-incisions within characters',
               deep: 'aggressive diagonal slicing through clusters',
               total: 'monolithic block with massive severance' } },
      { key: 'damage', label: '손상', type: 'choice',
        choices: ['none', 'erosion', 'cracking', 'glitch'], default: 'none',
        map: { none: 'pristine solid form', erosion: 'subtle weathered erosion',
               cracking: 'intricate 2D cracks and micro-fractures',
               glitch: 'digital noise and boundary glitch artifacts' } },
    ],
    promptFn: (v, f) =>
      `Dynamics: ${f[0].map[v.kinetic]}, ${f[1].map[v.slant]}, slicing(${f[2].map[v.slicing]}), damage(${f[3].map[v.damage]}).`,
  },
  {
    id: 'tc_boosters', title: '창작 부스터', importance: 'optional',
    summary: '4 가지 강화 토글 (조형/품질/변형/동적)',
    fields: [
      { key: 'artistic',   label: '조형적 파격 (Artistic)', type: 'bool', default: false },
      { key: 'quality',    label: '디자인 완성도 (Quality)', type: 'bool', default: false },
      { key: 'transform',  label: '창조적 변형 (Transformation)', type: 'bool', default: false },
      { key: 'momentum',   label: '동적 운동량 (Momentum)', type: 'bool', default: false },
    ],
    promptFn: (v) => {
      const tags = [];
      if (v.artistic) tags.push('[ARTISTIC] prioritize unique morphological breakthroughs and iconic silhouette');
      if (v.quality) tags.push('[QUALITY] premium commercial logotype synthesis, zero generic font resemblance');
      if (v.transform) tags.push('[TRANSFORMATION] aggressive structural rule-breaking per genre');
      if (v.momentum) tags.push('[MOMENTUM] pure kinetic energy and sharp cutting trajectories over symmetry');
      return tags.length ? `Boosters: ${tags.join('. ')}.` : 'Boosters: none.';
    },
  },
];
