// 변형(베리에이션) 옵션 — 2단계 픽업 구조.
//   2단 분위기 카테고리(VARIATION_MOODS): 5개 중 1개 — 큰 톤 분류
//   3단 구체적 스타일(VARIATION_STYLES[moodId]): 카테고리당 6개 — 사용자가 원하는 개수 만큼 선택
//
// promptHint 작성 원칙 (장식 인플레이션 방지):
//   - 컬러 팔레트 + 재질 + 표면 마감 어휘만 사용
//   - "highlights", "accents", "particles", "runes", "energy", "filigree", "ornaments" 등
//     장식 요소 추가를 암시하는 단어 금지
//   - "accent color" 처럼 명확히 컬러 스펙임을 표시한 경우만 허용
//   - "ornate", "elaborate", "intricate", "delicate engraved" 등 크기·복잡도 인플레이션 단어 금지
//   - 각 hint 는 "[mood] color palette and material" 로 시작 — 모델이 컬러·재질 spec 으로 해석하도록 anchoring

export const VARIATION_MOODS = [
  { id: 'flat',         label: '플랫',         desc: '깔끔한 벡터·미니멀',   accent: '#06b6d4' },
  { id: 'casual',       label: '캐주얼',       desc: '소프트·팝·친근',       accent: '#f9a8d4' },
  { id: 'darkFantasy',  label: '다크 판타지',  desc: 'MMORPG·럭셔리·전쟁',  accent: '#d4af37' },
  { id: 'modernTech',   label: '모던 테크',    desc: '글래스·뉴모피즘·네온', accent: '#a5b4fc' },
  { id: 'luxury',       label: '럭셔리',       desc: '프리미엄·시그니처',    accent: '#fde68a' },
];

export const VARIATION_STYLES = {
  flat: [
    { id: 'modernIT',    label: '모던 IT',     color: '#06b6d4',
      promptHint: 'modern flat brand color palette and material, electric blue with white and charcoal solids, clean flat vector shading, single soft drop shadow as the only depth cue' },
    { id: 'vividPop',    label: '비비드 팝',   color: '#f43f5e',
      promptHint: 'vivid pop art flat color palette and material, saturated complementary hues, posterized flat shading, clean hard color edges' },
    { id: 'pastelFlat',  label: '파스텔 플랫', color: '#fbcfe8',
      promptHint: 'pastel flat color palette and material, soft mint pink and lavender, gentle low-contrast tones, flat vector shading' },
    { id: 'monoMinimal', label: '모노 미니멀', color: '#94a3b8',
      promptHint: 'monochrome minimalist color palette and material, single hue with neutral grays, restrained flat finish' },
    { id: 'neoBrutal',   label: '네오 브루탈', color: '#fde047',
      promptHint: 'neo-brutalist color palette and material, raw saturated primary colors with hard black outlines as material treatment, intentionally clunky surface' },
    { id: 'corporate',   label: '코퍼레이트',  color: '#3b82f6',
      promptHint: 'corporate flat color palette and material, navy and grey with single accent blue, professional matte finish' },
  ],
  casual: [
    { id: 'softClay3D',  label: '소프트 클레이 3D', color: '#f9a8d4',
      promptHint: 'soft 3D clay color palette and material, matte sculpted clay surface, bright pastel hues, smooth diffuse lighting' },
    { id: 'jellySoft',   label: '젤리 소프트',     color: '#a5f3fc',
      promptHint: 'jelly translucent color palette and material, glossy gel surface with refractive sheen, candy color hues' },
    { id: 'kidsPop',     label: '키즈 팝',         color: '#fde047',
      promptHint: 'kids-friendly pop color palette and material, primary colors with hand-drawn warm tones, soft matte finish' },
    { id: 'macaron',     label: '마카롱 파스텔',   color: '#fbcfe8',
      promptHint: 'macaron pastel color palette and material, layered cream pink and mint, soft baked matte surface' },
    { id: 'plushToy',    label: '봉제인형',        color: '#fed7aa',
      promptHint: 'plush toy color palette and material, soft felt and fluff surface texture, warm yarn material' },
    { id: 'bubbleGum',   label: '버블검 팝',       color: '#f0abfc',
      promptHint: 'bubble gum pop color palette and material, sticky candy shine, bubblegum pink and aqua, glossy chewy surface' },
  ],
  darkFantasy: [
    { id: 'darkRoyalGold', label: '다크 로열 골드', color: '#d4af37',
      promptHint: 'dark fantasy royal color palette and material, deep slate or rich brown base with luxurious gold metallic surface, deep red as accent color, classical MMORPG premium finish' },
    { id: 'crimsonSiege',  label: '크림슨 시즈',    color: '#c41e3a',
      promptHint: 'crimson siege war color palette and material, dark blood red with dark forged iron metal, battle-worn surface texture, dark fantasy combat tone' },
    { id: 'imperialBronze',label: '임페리얼 브론즈',color: '#cd7f32',
      promptHint: 'imperial bronze color palette and material, aged warm sepia metallic surface, antique patina texture, historical grand strategy tone' },
    { id: 'obsidianVoid',  label: '옵시디언 보이드',color: '#a78bfa',
      promptHint: 'obsidian void color palette and material, glossy black volcanic glass surface, deep purple as accent color, mysterious dark material tone' },
    { id: 'boneRelic',     label: '본 렐릭',        color: '#fef3c7',
      promptHint: 'bone relic ancient color palette and material, weathered ivory and aged parchment surface, archaeological dig tone' },
    { id: 'frostbite',     label: '프로스트바이트', color: '#7dd3fc',
      promptHint: 'frostbite ice color palette and material, crystalline pale blue and frozen silver, frost-cracked metal surface, breath-cold winter tone' },
  ],
  modernTech: [
    { id: 'glassMorph',   label: '글래스모피즘',   color: '#a5b4fc',
      promptHint: 'glassmorphism color palette and material, translucent frosted glass surface, subtle inner light, modern fintech tone' },
    { id: 'neumorphism',  label: '뉴모피즘',       color: '#cbd5e1',
      promptHint: 'neumorphism color palette and material, soft monochrome surface with inset/extruded shadow as material treatment, low contrast tactile depth' },
    { id: 'gradientMesh', label: '그라디언트 메시',color: '#c084fc',
      promptHint: 'gradient mesh color palette and material, smooth blended multi-hue radial gradients, glossy color transitions, fluid digital tone' },
    { id: 'cyberNeon',    label: '사이버 네온',    color: '#06b6d4',
      promptHint: 'cyberpunk neon color palette and material, cyan and magenta plasma hues as accent colors, glowing material surface, Tron-inspired tech tone' },
    { id: 'holoFoil',     label: '홀로그래픽 포일',color: '#f0abfc',
      promptHint: 'holographic iridescent foil color palette and material, shifting prismatic pastel reflections, metallic sticker surface sheen' },
    { id: 'matteCarbon',  label: '매트 카본',      color: '#52525b',
      promptHint: 'matte carbon fiber color palette and material, woven dark carbon surface texture, subtle red as accent color' },
  ],
  luxury: [
    { id: 'champagneGold', label: '샴페인 골드',   color: '#fde68a',
      promptHint: 'champagne gold luxury color palette and material, soft warm satin gold surface, bridal premium tone' },
    { id: 'platinumSheen', label: '플래티넘 시언', color: '#e2e8f0',
      promptHint: 'platinum sheen luxury color palette and material, brushed cool silver-white metal surface, restrained jewelry tone' },
    { id: 'rosegoldVelvet',label: '로즈골드 벨벳', color: '#fbcfe8',
      promptHint: 'rose gold velvet luxury color palette and material, warm pink-gold metallic accent color, romantic retail tone' },
    { id: 'midnightBlue',  label: '미드나잇 블루', color: '#3730a3',
      promptHint: 'midnight blue luxury color palette and material, deep sapphire with platinum accent color, formal evening tone' },
    { id: 'emeraldJewel',  label: '에메랄드 주얼', color: '#10b981',
      promptHint: 'emerald jewel luxury color palette and material, deep emerald green with gold metallic accent color, gemstone surface tone' },
    { id: 'marbleVein',    label: '대리석 베인',   color: '#f1f5f9',
      promptHint: 'marble veined luxury color palette and material, white carrara marble surface with gold veining as natural material pattern, classical refined finish' },
  ],
};

// 평탄화 — id 로 스타일 조회 (mood 정보 포함).
export const ALL_VARIATION_STYLES = Object.entries(VARIATION_STYLES).flatMap(([moodId, list]) =>
  list.map(s => ({ ...s, moodId }))
);
export const STYLE_BY_ID = Object.fromEntries(ALL_VARIATION_STYLES.map(s => [s.id, s]));

// 분위기 변경 시 자동으로 채울 기본 4개 — 각 카테고리 앞에서부터 4개.
export const defaultStyleIdsFor = (moodId) =>
  (VARIATION_STYLES[moodId] || []).slice(0, 4).map(s => s.id);

// ─── 정제 강도 — 사용자가 직접 장식 밀도를 깎을 수 있는 레버 ─────────────────────
// source: 기본값. 원본 장식 밀도 그대로 보존 (추가 지시 없음).
// refined: 약 60% 로 단순화 — ornate filigree 를 clean stroke 로 치환.
// minimal: 핵심 1~2 개 액센트만 남기고 나머지 제거. 단일 컬러·플랫 톤.
//
// 모든 directive 는 "보존 규칙 위에 추가 적용되는 후처리" 로 명시 — 보존이 base, 정제가 overlay.
// 보존 규칙 안의 outline thickness / silhouette / aspect ratio 는 정제 모드에서도 변경 금지.
export const REFINEMENT_LEVELS = [
  {
    id: 'source',
    label: '원본',
    desc: '원본 장식 밀도 유지',
    accent: '#9CA3AF',
    promptBlock: '',
  },
  {
    id: 'refined',
    label: '정제',
    desc: '약 60% 로 단순화',
    accent: '#76cee0',
    promptBlock: `REFINEMENT DIRECTIVE (moderate simplification — applied on top of all preservation rules):
- Reduce decorative complexity to approximately 60% of the source — keep only the most prominent corner accents and simplify all other ornaments into cleaner geometric strokes
- Replace ornate filigree, swirls, intricate scrollwork, and busy decorative patterns with cleaner reductions or simple geometric primitives
- Reduce specular glints, surface noise, and secondary highlight density by approximately half
- Maintain silhouette, outline thickness, aspect ratio, and overall layout EXACTLY — only INTERNAL decoration density is reduced
- The result should feel like a cleaner, more confident reinterpretation of the source — same shape, less ornament`,
  },
  {
    id: 'minimal',
    label: '미니멀',
    desc: '핵심 액센트만 남김',
    accent: '#a78bfa',
    promptBlock: `REFINEMENT DIRECTIVE (aggressive simplification — applied on top of all preservation rules):
- Strip all non-essential decorations — keep only the single most prominent accent on each element
- Replace ornate filigree, scrollwork, embellishments, and surface ornaments with simple clean geometric lines or solid color blocks
- Reduce frames to a single clean outline with one accent color
- Remove all secondary glints, highlights, particles, sparkles, and surface noise — flat or near-flat material treatment only
- Maintain silhouette, outline thickness, aspect ratio, and overall layout EXACTLY — only INTERNAL decoration density is aggressively reduced
- The result should be ultra-minimal modern UI carrying only the new theme's color and base material — no flourishes`,
  },
];

export const REFINEMENT_BY_ID = Object.fromEntries(REFINEMENT_LEVELS.map(r => [r.id, r]));
