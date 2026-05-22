// friendly 모드 — 첫 화면의 글자 스타일 카드 10개.
// 각 스타일은 시각적 글리프 미리보기 + 영문 프롬프트 매핑을 가진다.
// 사용자가 보는 것: 라벨 + 글리프 + 한 줄 설명.
// 시스템 내부: layout/ratio/occupancy/promptTokens 자동 적용.
//
// promptTokens 작성 원칙 (피드백 4 이후):
//   - 추상적 단어("heavy", "sharp") 대신 구체적 시각 어휘 (재질·기법·참조)
//   - 핵심 정체성 토큰은 weight 1.3~1.5
//   - 다른 스타일과 헷갈리지 않을 고유 어휘 1~2개 (예: Trajan, Bauhaus, brushed steel)

export const friendlyStyles = [
  {
    id: 'metal-heavy',
    label: '메탈 헤비',
    desc: '두껍고 묵직한 게임 로고',
    accent: '#FDCB6E',
    layoutType: 'Center', aspectRatio: '16:9', occupancy: '65%',
    promptTokens: '(massive monolithic block letterforms carved from dark iron:1.5), (brushed steel surface with subtle scratches and hammered texture:1.3), (deeply chiseled bottom-heavy industrial mass:1.4), brutalist game logo typography, AAA video game title aesthetic, dense pillar stems with chamfered edges, dramatic rim lighting',
    forbidden: 'NO extreme thin lines, NO fragile broken elements, NO fluid organic curves, NO serif decorations, NO handwriting irregularities',
  },
  {
    id: 'sharp-action',
    label: '샤프 액션',
    desc: '날카로운 절단, 전투 타이틀',
    accent: '#FD79A8',
    layoutType: '2Lines', aspectRatio: '16:9', occupancy: '80%',
    promptTokens: '(extreme thick-thin stroke contrast like a katana blade:1.5), (razor-sharp incisive terminals slicing the space:1.5), (aggressive diagonal cuts severing the letterforms:1.3), action movie poster typography, combat game title aesthetic, dramatic chromatic accent on cut edges, high-contrast lethal geometry',
    forbidden: 'NO soft rounded corners, NO heavy blocky uniform mass, NO decorative floral ornaments, NO classical serifs, NO calligraphic curves',
  },
  {
    id: 'weathered-relic',
    label: '풍화 유물',
    desc: '균열·침식·비대칭',
    accent: '#C8A969',
    layoutType: 'Center', aspectRatio: '1:1', occupancy: '65%',
    promptTokens: '(ancient eroded silhouette with irregular weather damage:1.5), (intricate hairline 2D cracks fracturing the letterforms:1.4), (time-weathered broken asymmetry on a carved stone surface:1.3), archaeological inscription aesthetic, lost civilization rune typography, patina and oxidation across the strokes, missing chunks revealing inner structure',
    forbidden: 'NO perfectly pristine modern vectors, NO sci-fi futuristic clean lines, NO flawless symmetry, NO neon glow, NO smooth glossy surfaces',
  },
  {
    id: 'emblem-glyph',
    label: '엠블럼·심볼',
    desc: '문자가 하나의 문양으로',
    accent: '#6C5CE7',
    layoutType: 'Center', aspectRatio: '1:1', occupancy: '65%',
    promptTokens: '(highly fused symbolic emblem structure forming a unified seal:1.5), (closed internal negative space counters interlocking into a heraldic mark:1.4), abstract typographic crest, monogram badge aesthetic, the letters merge into a single coherent silhouette like a guild insignia',
    forbidden: 'NO widely separated letters, NO loose airy spacing, NO simple handwriting, NO motion streaks, NO scattered debris',
  },
  {
    id: 'kinetic-flow',
    label: '키네틱 동세',
    desc: '흐르는 방향성·속도감',
    accent: '#0eb9b3',
    layoutType: '1Line', aspectRatio: '2.76:1', occupancy: '65%',
    promptTokens: '(aggressive forward directional momentum with swept-back stems:1.5), (fluid asymmetric trailing rhythm dragging behind each letter:1.4), aerodynamic typography as if sculpted by wind tunnel, (implied motion blur and velocity streaks pulling the strokes:1.3), racing game aesthetic, italic shear with kinetic energy',
    forbidden: 'NO static perfectly vertical alignment, NO stiff blocky stability, NO heavy weight, NO calligraphic ornaments',
  },
  {
    id: 'neon-cyber',
    label: '네온 사이버',
    desc: '형광 글로우, 사이버펑크',
    accent: '#00CEC9',
    layoutType: 'Center', aspectRatio: '16:9', occupancy: '50%',
    promptTokens: '(luminous neon tube letterforms with electric cyan and magenta plasma:1.5), (intense outer glow halo emanating from the strokes:1.4), (thin uniform stroke width like bent glass tubes:1.3), cyberpunk arcade aesthetic, vivid light emission on a pitch-black void, subtle scanline reflection on the tube surface, Tron-inspired',
    forbidden: 'NO dull matte surfaces, NO earth tones, NO weathered textures, NO heavy block mass',
    baseStyle: 'BlackNeon',
  },
  {
    id: 'classic-serif',
    label: '클래식 세리프',
    desc: '우아한 세리프, 영화 타이틀',
    accent: '#A29BFE',
    layoutType: 'TitleSub', aspectRatio: '2.76:1', occupancy: '40%',
    promptTokens: '(elegant Trajan-inspired Roman capital letterforms:1.5), (refined hairline strokes with bracketed serifs and subtle entasis:1.4), (high contrast between thick and thin stroke modulation:1.3), dignified film title aesthetic, classical Latin inscription quality, perfect optical balance, restrained sophistication',
    forbidden: 'NO sans-serif, NO playful rounded shapes, NO aggressive cuts, NO neon glow, NO weathered damage',
  },
  {
    id: 'modern-sans',
    label: '모던 산세리프',
    desc: '깔끔한 미니멀',
    accent: '#74B9FF',
    layoutType: 'Center', aspectRatio: '16:9', occupancy: '50%',
    promptTokens: '(clean geometric sans-serif typography in the Helvetica/Inter family:1.5), (uniform monoline stroke thickness without optical compensation:1.4), Swiss International Style design clarity, perfectly horizontal baseline, optical-grade letter spacing, no decorative ornaments, flat editorial poster aesthetic',
    forbidden: 'NO serifs, NO weathered textures, NO decorative VFX, NO emblem fusion, NO calligraphic curves',
  },
  {
    id: 'geometric',
    label: '기하 모듈러',
    desc: '도형·격자 기반 구성',
    accent: '#55EFC4',
    layoutType: 'Center', aspectRatio: '1:1', occupancy: '65%',
    promptTokens: '(strict Bauhaus-inspired geometric letterforms constructed from circles squares and triangles:1.5), (modular grid-based composition with mathematical proportions:1.4), Herbert Bayer universal typeface aesthetic, primary shapes interlocking, visible construction guides, De Stijl influence',
    forbidden: 'NO organic curves, NO handwriting irregularities, NO weathered surfaces, NO classical serifs, NO motion blur',
  },
  {
    id: 'handwritten',
    label: '손글씨 캘리',
    desc: '유려한 필체·캘리그래피',
    accent: '#FD79A8',
    layoutType: '1Line', aspectRatio: '2.76:1', occupancy: '50%',
    promptTokens: '(fluid handwritten brush calligraphy with varying pressure:1.5), (organic ink strokes with natural pen lift and dry brush texture:1.4), expressive cursive script with asymmetric flourishes, ink wash bleeding subtly into the paper, master calligrapher single-stroke composition, Edward Johnston influence',
    forbidden: 'NO rigid geometric shapes, NO mechanical uniformity, NO sharp blade cuts, NO neon glow, NO block mass',
  },
];

export const STYLE_MAP = Object.fromEntries(friendlyStyles.map(s => [s.id, s]));

// 사용자 노출용 사이즈(occupancy) · 레이아웃 선택지.
// 영문 토큰은 PromptEngine.jsx 의 FRIENDLY_OCC / FRIENDLY_LAYOUT 에 정의되어 있고,
// 여기서는 라벨과 mapping 만 둔다.
export const SIZE_OPTIONS = [
  { id: '40%', label: '작게' },
  { id: '50%', label: '중간' },
  { id: '65%', label: '크게' },
  { id: '80%', label: '꽉' },
];

export const LAYOUT_OPTIONS = [
  { id: 'Center',   label: '중앙'         },
  { id: '1Line',    label: '한 줄'         },
  { id: '2Lines',   label: '두 줄'         },
  { id: 'TitleSub', label: '메인+서브'    },
];
