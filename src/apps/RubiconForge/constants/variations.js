// 변형(베리에이션) 옵션 — 2단계 픽업 구조.
//   2단 분위기 카테고리(VARIATION_MOODS): 5개 중 1개 — 큰 톤 분류
//   3단 구체적 스타일(VARIATION_STYLES[moodId]): 카테고리당 6개 — 사용자가 4개 골라서 4개 변형 생성
//
// 모든 promptHint 는 영문 시각 어휘로 작성 — Nano Banana 가 모호한 형용사보다 구체적 재질·색·기법에 강함.

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
      promptHint: 'modern flat brand aesthetic with crisp vector edges, clean solid corporate colors (electric blue / white / charcoal), single soft drop shadow, no metallic or 3D shading, contemporary IT product promo style' },
    { id: 'vividPop',    label: '비비드 팝',   color: '#f43f5e',
      promptHint: 'vivid pop art flat aesthetic, saturated complementary colors, bold posterized shapes, clear hard edges, energetic playful mood' },
    { id: 'pastelFlat',  label: '파스텔 플랫', color: '#fbcfe8',
      promptHint: 'pastel flat aesthetic, soft mint pink and lavender, gentle low-contrast palette, fully flat vector shading' },
    { id: 'monoMinimal', label: '모노 미니멀', color: '#94a3b8',
      promptHint: 'monochrome minimalist flat aesthetic, single hue with neutral grays, clean Swiss design composition, ultra-restrained' },
    { id: 'neoBrutal',   label: '네오 브루탈', color: '#fde047',
      promptHint: 'neo-brutalist flat aesthetic, oversized hard black outlines, raw saturated primary colors, intentionally clunky charm' },
    { id: 'corporate',   label: '코퍼레이트',  color: '#3b82f6',
      promptHint: 'corporate flat aesthetic, navy and grey with single accent blue, professional trustworthy mood, B2B SaaS feel' },
  ],
  casual: [
    { id: 'softClay3D',  label: '소프트 클레이 3D', color: '#f9a8d4',
      promptHint: 'trendy soft 3D clay aesthetic, bubbly matte sculpted forms, bright pastel palette, smooth diffuse lighting, cute pop promo style' },
    { id: 'jellySoft',   label: '젤리 소프트',     color: '#a5f3fc',
      promptHint: 'jelly translucent soft material aesthetic, glossy gel-like surface, refractive highlights, candy color palette, playful tactile mood' },
    { id: 'kidsPop',     label: '키즈 팝',         color: '#fde047',
      promptHint: 'kids-friendly pop aesthetic, big rounded shapes, primary colors with playful accents, hand-drawn warmth' },
    { id: 'macaron',     label: '마카롱 파스텔',   color: '#fbcfe8',
      promptHint: 'macaron pastel dessert aesthetic, layered cream pink and mint, soft baked matte texture, sweet shop window feel' },
    { id: 'plushToy',    label: '봉제인형',        color: '#fed7aa',
      promptHint: 'plush toy textile aesthetic, soft felt and fluff surface, warm yarn and stitching details, cuddly tactile material' },
    { id: 'bubbleGum',   label: '버블검 팝',       color: '#f0abfc',
      promptHint: 'bubble gum pop aesthetic, sticky candy shine, bubblegum pink and aqua, playful chewy material feel' },
  ],
  darkFantasy: [
    { id: 'darkRoyalGold', label: '다크 로열 골드', color: '#d4af37',
      promptHint: 'dark fantasy royal aesthetic, deep slate or rich brown base with ornate luxurious gold metallic frames, subtle deep red gemstone highlights, classical MMORPG premium UI feel' },
    { id: 'crimsonSiege',  label: '크림슨 시즈',    color: '#c41e3a',
      promptHint: 'crimson siege war aesthetic, dark blood red tones with dark forged iron metal, aggressive battle-worn texture, epic dark fantasy combat mood' },
    { id: 'imperialBronze',label: '임페리얼 브론즈',color: '#cd7f32',
      promptHint: 'imperial bronze aesthetic, aged warm sepia metallic textures, historical grand strategy game vibe, antique patina' },
    { id: 'obsidianVoid',  label: '옵시디언 보이드',color: '#a78bfa',
      promptHint: 'obsidian void aesthetic, glossy black volcanic glass surface, deep purple energy accents, mysterious void rune highlights' },
    { id: 'boneRelic',     label: '본 렐릭',        color: '#fef3c7',
      promptHint: 'bone relic ancient aesthetic, weathered ivory and aged parchment, carved skeletal ornamentation, archaeological dig artifact feel' },
    { id: 'frostbite',     label: '프로스트바이트', color: '#7dd3fc',
      promptHint: 'frostbite ice aesthetic, crystalline pale blue and frozen silver, frost-cracked metal frames, breath-cold winter mood' },
  ],
  modernTech: [
    { id: 'glassMorph',   label: '글래스모피즘',   color: '#a5b4fc',
      promptHint: 'glassmorphism aesthetic, translucent frosted glass panel, subtle inner light, soft border glow, modern fintech UI feel' },
    { id: 'neumorphism',  label: '뉴모피즘',       color: '#cbd5e1',
      promptHint: 'neumorphism aesthetic, soft monochrome surface with dual inset/extruded shadow, low contrast tactile depth, modern UI feel' },
    { id: 'gradientMesh', label: '그라디언트 메시',color: '#c084fc',
      promptHint: 'gradient mesh aesthetic, smooth blended multi-hue radial gradients, glossy color transitions, modern fluid digital mood' },
    { id: 'cyberNeon',    label: '사이버 네온',    color: '#06b6d4',
      promptHint: 'cyberpunk neon aesthetic, glowing cyan and magenta plasma highlights, scanline glints, Tron-inspired tech mood' },
    { id: 'holoFoil',     label: '홀로그래픽 포일',color: '#f0abfc',
      promptHint: 'holographic iridescent foil aesthetic, shifting prismatic pastel reflections, metallic sticker sheen' },
    { id: 'matteCarbon',  label: '매트 카본',      color: '#52525b',
      promptHint: 'matte carbon fiber aesthetic, woven dark carbon texture with subtle red accent, precision engineered feel' },
  ],
  luxury: [
    { id: 'champagneGold', label: '샴페인 골드',   color: '#fde68a',
      promptHint: 'champagne gold luxury aesthetic, soft warm satin gold with delicate engraved patterns, bridal premium mood' },
    { id: 'platinumSheen', label: '플래티넘 시언', color: '#e2e8f0',
      promptHint: 'platinum sheen luxury aesthetic, brushed cool silver-white metal, restrained sophisticated jewelry feel' },
    { id: 'rosegoldVelvet',label: '로즈골드 벨벳', color: '#fbcfe8',
      promptHint: 'rose gold velvet luxury aesthetic, warm pink-gold metal accents, romantic premium retail mood' },
    { id: 'midnightBlue',  label: '미드나잇 블루', color: '#3730a3',
      promptHint: 'midnight blue luxury aesthetic, deep sapphire with platinum accents, formal evening signature mood' },
    { id: 'emeraldJewel',  label: '에메랄드 주얼', color: '#10b981',
      promptHint: 'emerald jewel luxury aesthetic, deep emerald green with gold filigree, gemstone signature mood' },
    { id: 'marbleVein',    label: '대리석 베인',   color: '#f1f5f9',
      promptHint: 'marble veined luxury aesthetic, white carrara marble with gold veining, classical refined material' },
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
