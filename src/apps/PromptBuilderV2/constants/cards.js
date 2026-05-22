// CLI prompt-builder-v2.cjs 의 CARDS 객체를 그대로 이식.
// promptFn / validateFn 은 React state 와 무관한 순수 함수라 그대로 사용 가능.
//
// 카테고리 확장 (2026-05): 각 앱(TypecoreSovereign / RenderMatrix / RenderMatrixPop / MotionMatrix)의
// 핵심 옵션 그룹을 별도 카테고리로 분리. 각 앱별 카드 정의는 cards/{앱}.js 에서 import.

import { typecoreCards } from './cards/typecore.js';
import { renderMatrixCards } from './cards/renderMatrix.js';
import { renderPopCards } from './cards/renderPop.js';
import { motionMatrixCards } from './cards/motionMatrix.js';
//
// field type:
//   bool     — 체크박스 토글
//   choice   — choices[] 중 하나 (옵션의 map 으로 영문 매핑)
//   number   — 정수 슬라이더/입력 (min/max)
//   float    — 소수 (0.01 단위)
//   text     — 자유 텍스트
//
// importance:
//   critical  — 끌 수 없는 핵심 (강제 enabled)
//   essential — 기본 활성
//   editable  — 사용자 편집 가능
//   optional  — 기본 off
//   advanced  — 고급 옵션 (기본 off)

export const CARDS = {
  motion: [
    {
      id: 'core_intent', title: '핵심 목적', importance: 'essential',
      summary: '전체 영상의 의도와 톤',
      fields: [],
      promptFn: () => 'A still hero artwork comes alive with subtle, controlled motion. Composition stays locked; only light, texture, and small auxiliary FX move.',
    },
    {
      id: 'first_frame_lock', title: '첫 프레임 고정', importance: 'critical',
      summary: 'Frame 0 = 소스 이미지와 동일',
      fields: [],
      promptFn: () => '[LOCK] First Frame: Frame 0 must match the source image exactly — identical composition, identical silhouettes, identical color cast.',
    },
    {
      id: 'camera_lock', title: '카메라 고정', importance: 'critical',
      summary: '카메라 움직임 제약',
      fields: [
        { key: 'no_pan',      label: '패닝 금지',            type: 'bool', default: true },
        { key: 'no_zoom',     label: '줌 금지',              type: 'bool', default: true },
        { key: 'no_tilt',     label: '틸트 금지',            type: 'bool', default: true },
        { key: 'no_parallax', label: '패럴랙스 금지',        type: 'bool', default: true },
        { key: 'no_shake',    label: '핸드헬드 흔들림 금지', type: 'bool', default: true },
      ],
      promptFn: (v) => {
        const locks = Object.entries(v).filter(([, on]) => on).map(([k]) => k.replace('no_', '')).join(', ');
        return `[LOCK] Camera: fixed framing — no ${locks || 'camera constraints set'}, fixed focal length.`;
      },
    },
    {
      id: 'loop_timing', title: '루프 타이밍', importance: 'essential',
      summary: '전체 길이와 Intro/Sustain/Outro 비율',
      fields: [
        { key: 'duration', label: '전체 길이 (초)',    type: 'number', default: 4,  min: 1,  max: 12 },
        { key: 'intro',    label: 'Intro 비율 (%)',    type: 'number', default: 20, min: 0, max: 100 },
        { key: 'sustain',  label: 'Sustain 비율 (%)',  type: 'number', default: 60, min: 0, max: 100 },
        { key: 'outro',    label: 'Outro 비율 (%)',    type: 'number', default: 20, min: 0, max: 100 },
        { key: 'ease',     label: 'Ease', type: 'choice',
          choices: ['linear', 'easeIn', 'easeOut', 'easeInOut'], default: 'easeInOut' },
        { key: 'seamless', label: '이음매 없는 루프', type: 'bool', default: true },
      ],
      // intro+sustain+outro 합 100±5 검증.
      validateFn: (v) => {
        const sum = (v.intro || 0) + (v.sustain || 0) + (v.outro || 0);
        if (Math.abs(sum - 100) > 5) return `Intro+Sustain+Outro 합이 ${sum}% 입니다 (100% 권장).`;
        return null;
      },
      promptFn: (v) =>
        `Loop: ${v.duration}s total, ${v.intro}/${v.sustain}/${v.outro} intro·sustain·outro, ${v.ease}${v.seamless ? ', seamless (frame N = frame 0)' : ''}.`,
    },
    {
      id: 'surface_fx', title: '표면 효과', importance: 'editable',
      summary: '피사체 표면 광·재질 변화',
      fields: [
        { key: 'material', label: '재질', type: 'choice',
          choices: ['gold', 'chrome', 'bronze', 'rosegold', 'platinum'], default: 'gold',
          map: { gold: 'warm gold metallic', chrome: 'polished chrome silver', bronze: 'patinated bronze',
                 rosegold: 'rose gold', platinum: 'cool platinum' } },
        { key: 'intensity', label: '강도', type: 'float', default: 0.4, min: 0.1, max: 1.0 },
        { key: 'motion', label: '움직임', type: 'choice',
          choices: ['subtle', 'moderate', 'dramatic'], default: 'subtle',
          map: { subtle: 'subtle micro-shimmer breathing slowly', moderate: 'moderate highlight sweep',
                 dramatic: 'dramatic light tracing dynamically' } },
      ],
      promptFn: (v, f) => {
        const mat = f.find((x) => x.key === 'material').map[v.material];
        const mot = f.find((x) => x.key === 'motion').map[v.motion];
        return `Surface FX: ${mat} highlight, ${mot} across the front face, intensity ${Number(v.intensity).toFixed(2)}. Confined inside silhouette, maintaining razor-sharp readability.`;
      },
    },
    {
      id: 'edge_fx', title: '엣지 효과', importance: 'editable',
      summary: '외곽 라인 림라이트',
      fields: [
        { key: 'color', label: '색상', type: 'choice',
          choices: ['white', 'gold', 'blue', 'purple', 'red'], default: 'gold',
          map: { white: 'cool crystalline white', gold: 'warm gold', blue: 'electric blue',
                 purple: 'deep magenta-purple', red: 'fiery red-orange' } },
        { key: 'thickness', label: '두께', type: 'choice',
          choices: ['thin', 'medium', 'thick'], default: 'medium',
          map: { thin: 'thin (1px) line', medium: 'medium (2px) line', thick: 'bold (4px) line' },
          px:  { thin: 4, medium: 6, thick: 10 } },
        { key: 'intensity', label: '강도', type: 'float', default: 0.3, min: 0.1, max: 1.0 },
      ],
      promptFn: (v, f) => {
        const col = f.find((x) => x.key === 'color').map[v.color];
        const thk = f.find((x) => x.key === 'thickness');
        return `Edge FX: ${col} rim light on outline edges, ${thk.map[v.thickness]}, intensity ${Number(v.intensity).toFixed(2)}. Falloff terminates within ${thk.px[v.thickness]}px of the silhouette.`;
      },
    },
    {
      id: 'ambient_fx', title: '주변 효과', importance: 'optional',
      summary: '배경 공간의 파티클 분위기',
      fields: [
        { key: 'particle', label: '파티클', type: 'choice',
          choices: ['gold_dust', 'fire', 'ice', 'magic', 'none'], default: 'gold_dust',
          map: { gold_dust: 'warm gold dust motes drifting upward', fire: 'floating embers and fire sparks',
                 ice: 'frost crystals suspended in cold air', magic: 'rotating magic circle glyphs glowing softly',
                 none: 'none' } },
        { key: 'density', label: '밀도', type: 'choice',
          choices: ['sparse', 'medium', 'dense'], default: 'medium',
          map: { sparse: 'sparse, low count', medium: 'moderate density', dense: 'dense and abundant' } },
        { key: 'range', label: '범위', type: 'choice',
          choices: ['very_close', 'close', 'moderate'], default: 'close',
          map: { very_close: 'very close to the subject, hugging the silhouette',
                 close: 'near the subject within 30% of the canvas',
                 moderate: 'moderate distance, filling background space' } },
      ],
      promptFn: (v, f) => {
        if (v.particle === 'none') return 'Ambient FX: none.';
        const p   = f.find((x) => x.key === 'particle').map[v.particle];
        const den = f.find((x) => x.key === 'density').map[v.density];
        const rng = f.find((x) => x.key === 'range').map[v.range];
        return `Ambient FX: ${p}, ${den}, positioned ${rng}.`;
      },
    },
    {
      id: 'fx_boundary', title: '효과 경계', importance: 'critical',
      summary: '모든 FX는 실루엣 안에 머물어야 함',
      fields: [],
      promptFn: () => '[LOCK] FX Boundary: all FX must stay strictly inside the subject silhouette. Zero bleed into the background. Glow falloff terminates within 4px of the edge.',
    },
    {
      id: 'negative_motion', title: '금지 조건', importance: 'advanced',
      summary: '모델이 생성하면 안 되는 항목들',
      fields: [
        { key: 'extra', label: '추가 금지 항목 (쉼표 구분)', type: 'text', default: '' },
      ],
      promptFn: (v) => {
        const base = 'no morphing of letters, no camera movement, no parallax, no extra limbs, no background drift, no color shift on subject, no warping of geometry, no flicker';
        return `Negative: ${base}${v.extra ? ', ' + v.extra : ''}.`;
      },
    },
  ],
  typography: [
    {
      id: 'text_input', title: '텍스트 입력', importance: 'essential',
      summary: '타이포에 들어갈 실제 글자',
      fields: [
        { key: 'text', label: '텍스트 내용', type: 'text', default: 'DARK ELF' },
        { key: 'language', label: '언어', type: 'choice',
          choices: ['korean', 'english', 'mixed'], default: 'english',
          map: { korean: 'Korean text', english: 'English text', mixed: 'Mixed Korean and English text' } },
      ],
      promptFn: (v, f) => {
        if (!v.text.trim()) return 'Text content: (empty).';
        const lang = f.find((x) => x.key === 'language').map[v.language];
        const upper = v.language === 'english' && v.text === v.text.toUpperCase() && /[A-Z]/.test(v.text) ? ' (uppercase)' : '';
        return `Text content: ${lang} reads "${v.text.trim()}"${upper}, single line, no punctuation.`;
      },
    },
    {
      id: 'stroke_contrast', title: '획 대비', importance: 'editable',
      summary: '스타일·굵기 조합',
      fields: [
        { key: 'style', label: '스타일', type: 'choice',
          choices: ['serif', 'sans_serif', 'slab', 'calligraphy'], default: 'sans_serif',
          map: { serif: 'traditional serif with bracketed terminals', sans_serif: 'geometric sans-serif',
                 slab: 'slab serif with rectangular terminals', calligraphy: 'calligraphic with brush-modulated strokes' } },
        { key: 'weight', label: '굵기', type: 'choice',
          choices: ['ultra_thin', 'thin', 'regular', 'bold', 'ultra_bold'], default: 'bold',
          map: { ultra_thin: 'ultra-thin (weight 100)', thin: 'thin (weight 300)', regular: 'regular (weight 400)',
                 bold: 'bold (weight 700)', ultra_bold: 'ultra-bold (weight 900)' } },
      ],
      promptFn: (v, f) => {
        const s = f.find((x) => x.key === 'style').map[v.style];
        const w = f.find((x) => x.key === 'weight').map[v.weight];
        return `Stroke: ${s} construction, ${w}. Stroke modulation matches the style's traditional axis.`;
      },
    },
    {
      id: 'material_style', title: '재질 스타일', importance: 'editable',
      summary: '타입 표면 효과·색상 방향',
      fields: [
        { key: 'effect', label: '효과', type: 'choice',
          choices: ['flat2d', 'metal', 'stone', 'crystal', 'fire', 'ice'], default: 'metal',
          map: { flat2d: 'flat 2D with no depth', metal: 'metallic surface with specular reflections',
                 stone: 'stone-carved with chiseled depth', crystal: 'crystalline with internal refraction',
                 fire: 'flame-textured with ember glow', ice: 'ice-crystallized with frost layer' } },
        { key: 'color_dir', label: '색상 방향', type: 'choice',
          choices: ['solid', 'gradient', 'multi'], default: 'solid',
          map: { solid: 'solid single tone', gradient: 'smooth gradient', multi: 'multi-color palette' } },
      ],
      promptFn: (v, f) => {
        const e  = f.find((x) => x.key === 'effect').map[v.effect];
        const cd = f.find((x) => x.key === 'color_dir').map[v.color_dir];
        return `Material style: ${e}, with ${cd} color treatment.`;
      },
    },
    {
      id: 'layout_rule', title: '레이아웃', importance: 'essential',
      summary: '정렬·트래킹·줄간격',
      fields: [
        { key: 'align', label: '정렬', type: 'choice',
          choices: ['center', 'left', 'right'], default: 'center' },
        { key: 'tracking', label: '트래킹 (px)', type: 'number', default: 60, min: 0, max: 120 },
      ],
      promptFn: (v) =>
        `Layout: ${v.align}-aligned, single line, ${v.tracking}px tracking, baseline at exact vertical center. No optical kerning adjustments beyond ±5px.`,
    },
  ],
  // 신규 카테고리들 — 각 앱의 핵심 옵션을 카드화. 카드 정의는 cards/{앱}.js 에서 import.
  typecore:      typecoreCards,
  motionMatrix:  motionMatrixCards,
  renderMatrix:  renderMatrixCards,
  renderPop:     renderPopCards,
};

export const CATEGORY_LABELS = {
  motion:       '모션 (Generic)',
  typography:   '타이포그래피 (Generic)',
  typecore:     'Typecore Sovereign',
  motionMatrix: 'Motion Matrix',
  renderMatrix: 'Render Matrix',
  renderPop:    'Render Matrix: Pop',
};

export const IMPORTANCE_META = {
  critical:  { label: '핵심',     color: '#EF4444', forceOn: true  },
  essential: { label: '필수',     color: '#F4F4F5', forceOn: false },
  editable:  { label: '편집가능', color: '#A1A1AA', forceOn: false },
  optional:  { label: '선택',     color: '#71717A', forceOn: false },
  advanced:  { label: '고급',     color: '#A78BFA', forceOn: false },
};

// 기본 enabled 집합 — critical + essential 만 켜짐
export function defaultEnabled(category) {
  const set = new Set();
  for (const card of CARDS[category] || []) {
    if (card.importance === 'critical' || card.importance === 'essential') set.add(card.id);
  }
  return set;
}

// 기본 values 집합 — 각 카드의 fields default 로
export function defaultValues(category) {
  const out = {};
  for (const card of CARDS[category] || []) {
    out[card.id] = {};
    for (const f of card.fields || []) out[card.id][f.key] = f.default;
  }
  return out;
}

// 카드 컴파일 — values 가 비어 있으면 default 로 채워서 promptFn 호출
export function compileCard(card, values) {
  const filled = { ...Object.fromEntries((card.fields || []).map((f) => [f.key, f.default])), ...(values || {}) };
  return card.promptFn(filled, card.fields || []);
}
