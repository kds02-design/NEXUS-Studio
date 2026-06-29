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

// ─── 생성 배경색 — 결과물이 깔릴 단색 배경 ──────────────────────────────────────
// 기본은 블랙(발광 합성·기존 동작). 흰/회색/크로마(그린·마젠타·블루)를 고르면 그 단색 위에 렌더되어
// 마스크 포지(remove.bg) 또는 단색 키 추출로 깔끔히 누끼낼 수 있다 — 소프트 글로우의 검은 띠 방지.
//   hex: 프롬프트에 주입 + 투명 추출 시 키아웃할 타깃 색
//   chroma: 채도 높은 키 컬러(피사체에 그 색이 없을 때 가장 깨끗)
export const BG_COLORS = [
  { id: 'black',   label: '블랙',   hex: '#000000', desc: '기본 · 발광 합성', chroma: false },
  { id: 'white',   label: '화이트', hex: '#ffffff', desc: '밝은 단색',       chroma: false },
  { id: 'gray',    label: '그레이', hex: '#808080', desc: '중립 회색',       chroma: false },
  { id: 'green',   label: '그린',   hex: '#00b140', desc: '크로마키',         chroma: true  },
  { id: 'magenta', label: '마젠타', hex: '#ff00ff', desc: '크로마키',         chroma: true  },
  { id: 'blue',    label: '블루',   hex: '#1f4fff', desc: '크로마키',         chroma: true  },
];
export const BG_COLOR_BY_ID = Object.fromEntries(BG_COLORS.map(c => [c.id, c]));
export const DEFAULT_BG = BG_COLOR_BY_ID.black;

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

// ─── 분위기 미세조정(Atmosphere) — 무드/정제와 직교하는 3번째 축 ─────────────────
// 무드(VARIATION_*)는 테마 통째 스왑, 정제(REFINEMENT_*)는 장식 밀도 감산.
// Atmosphere 는 "같은 골격 유지 + 색온도/표면 마감만 미세하게" 트는 전역 축.
//   - TEMPERATURE: 광원 화이트밸런스만 (새 광원/글로우 추가 금지)
//   - AGE: 표면 마모/세월 (새 긁힘·크랙 도형 금지 — 셰이딩/재질로만)
// 두 축 모두 'neutral' = 빈 블록 = 변화 없음. promptBlock 은 정제와 동일하게
// "보존 규칙 위에 후처리로 추가 적용" 으로 명시 — 구조 잠금/순흑 배경 라인을 매 블록에 박음.
// 적용 순서는 services 의 getAtmosphereBlock 에서 온도 → 세월 (세월이 최종 표면 마감).

export const ATMOSPHERE_TEMPERATURE = [
  {
    id: 'coolStrong', label: '콜드 스틸', desc: '강한 월광·콜드', accent: '#7dd3fc',
    promptBlock: `ATMOSPHERE — LIGHTING TEMPERATURE (strong cool shift — applied on top of all preservation rules):
- Push the white balance of all lit surfaces firmly toward a cold moonlit steel-blue — highlights read icy, midtones carry a pronounced lunar cast
- This is a white-balance / color-temperature adjustment of the EXISTING illumination only — do NOT add any new light source, glow, halo, lens flare, bloom, or rim light
- Metals read distinctly cold (gold cools toward platinum/pewter; blues turn to sharp steel-silver); shadows cool noticeably
- Material, surface finish, silhouette, outline thickness, decoration count and size remain EXACTLY as the source — only the temperature of existing light changes
- The pure black background is unaffected — no cold spill, no ambient haze`,
  },
  {
    id: 'cool', label: '쿨', desc: '옅은 한기', accent: '#a5b4fc',
    promptBlock: `ATMOSPHERE — LIGHTING TEMPERATURE (subtle cool shift — applied on top of all preservation rules):
- Shift the white balance of all lit surfaces gently toward cool moonlit silver-blue — highlights take a soft cold cast, midtones cool slightly
- This is a white-balance / color-temperature adjustment of the EXISTING illumination only — do NOT add any new light source, glow, halo, lens flare, bloom, or rim light
- Metals read cooler (gold turns toward pale champagne; blues sharpen toward steel); shadows stay neutral-to-cool
- Material, surface finish, silhouette, outline thickness, decoration count and size remain EXACTLY as the source — only the temperature of existing light changes
- The pure black background is unaffected — no cold spill, no ambient haze`,
  },
  { id: 'neutral', label: '원본', desc: '광원 그대로', accent: '#9CA3AF', promptBlock: '' },
  {
    id: 'warm', label: '웜', desc: '옅은 온기', accent: '#fbbf24',
    promptBlock: `ATMOSPHERE — LIGHTING TEMPERATURE (subtle warm shift — applied on top of all preservation rules):
- Shift the white balance of all lit surfaces gently toward warm candlelit gold — highlights take a soft amber cast, midtones warm slightly
- This is a white-balance / color-temperature adjustment of the EXISTING illumination only — do NOT add any new light source, glow, halo, lens flare, bloom, or rim light
- Metals read warmer (gold deepens; cool blues drift toward warm teal); shadows stay neutral-to-warm
- Material, surface finish, silhouette, outline thickness, decoration count and size remain EXACTLY as the source — only the temperature of existing light changes
- The pure black background is unaffected — no warm spill, no ambient haze`,
  },
  {
    id: 'warmStrong', label: '촛불 골드', desc: '강한 촛불·앰버', accent: '#f59e0b',
    promptBlock: `ATMOSPHERE — LIGHTING TEMPERATURE (strong warm shift — applied on top of all preservation rules):
- Push the white balance of all lit surfaces firmly toward a warm firelit amber-gold — highlights glow warm, midtones carry a pronounced golden-hour cast
- This is a white-balance / color-temperature adjustment of the EXISTING illumination only — do NOT add any new light source, flame, glow, halo, lens flare, bloom, or rim light
- Metals read distinctly hot (gold turns rich; cool blues drift toward warm teal/bronze); shadows warm noticeably
- Material, surface finish, silhouette, outline thickness, decoration count and size remain EXACTLY as the source — only the temperature of existing light changes
- The pure black background is unaffected — no warm spill, no ambient haze`,
  },
];

export const ATMOSPHERE_AGE = [
  {
    id: 'restoredStrong', label: '광택 복원', desc: '갓 세공·박물관급', accent: '#fde68a',
    promptBlock: `ATMOSPHERE — SURFACE AGE (full restoration — applied on top of all preservation rules):
- Fully restore EXISTING surfaces to a pristine, freshly-crafted condition: remove all tarnish, grime, dust and wear, bring metals to a clean polished finish, make the whole material read brand-new and immaculate
- Adjust only material cleanliness and surface finish — do NOT add new highlights, glints, sparkles, bloom, or reflections as separate decorative elements, do NOT increase decoration count or size, and do NOT over-brighten into glow
- Silhouette, outline thickness, decoration count and layout remain EXACTLY as the source
- The pure black background is unaffected`,
  },
  {
    id: 'restored', label: '살짝 광택', desc: '때 제거·생기', accent: '#fef3c7',
    promptBlock: `ATMOSPHERE — SURFACE AGE (light restoration — applied on top of all preservation rules):
- Clean and freshen EXISTING surfaces: remove tarnish and grime from recesses, lift the material to a fresher finish, make metals read newly forged and any gems or accents read clearer
- Adjust only material cleanliness and surface finish — do NOT add new highlights, glints, sparkles, or reflections as separate decorative elements, and do NOT increase decoration count or size
- Silhouette, outline thickness, decoration count and layout remain EXACTLY as the source
- The pure black background is unaffected`,
  },
  { id: 'neutral', label: '원본', desc: '표면 그대로', accent: '#9CA3AF', promptBlock: '' },
  {
    id: 'worn', label: '가벼운 마모', desc: '모서리 마모·먼지', accent: '#a8a29e',
    promptBlock: `ATMOSPHERE — SURFACE AGE (light weathering — applied on top of all preservation rules):
- Add a light layer of age to EXISTING surfaces only: faint edge wear, subtle darkened patina settling into recesses, a thin film of dust in crevices, slightly dulled specular highlights
- Render wear PURELY as surface shading and material treatment — it must NOT introduce any new distinct scratch shape, crack, chip, or decorative element that changes a silhouette, outline, or the decoration count
- Do NOT erode, thin, or reshape any edge, frame, or ornament — the bounding box and count of every element stay identical
- Metals lose a little shine and gain tarnish in the darks; gold reads slightly antique
- The pure black background is unaffected`,
  },
  {
    id: 'wornStrong', label: '전장 패티나', desc: '산화·녹·전장감', accent: '#78716c',
    promptBlock: `ATMOSPHERE — SURFACE AGE (heavy weathering — applied on top of all preservation rules):
- Apply a heavy, battle-worn age to EXISTING surfaces: pronounced tarnish, oxidation and verdigris in recesses, grime and dust build-up, heavily dulled highlights, a weathered patina across the whole material
- Render all wear PURELY as surface shading, discoloration, and material treatment — it must NOT introduce any new distinct scratch shape, crack, chip, dent, or decorative element that changes a silhouette, outline, or the decoration count
- Do NOT erode, thin, pit, or reshape any edge, frame, or ornament — the bounding box and count of every element stay identical
- Metals look old and oxidized; gold turns deep antique; bright surfaces go muted and matte
- The pure black background is unaffected`,
  },
];

export const ATMOSPHERE_TEMPERATURE_BY_ID = Object.fromEntries(ATMOSPHERE_TEMPERATURE.map(t => [t.id, t]));
export const ATMOSPHERE_AGE_BY_ID = Object.fromEntries(ATMOSPHERE_AGE.map(a => [a.id, a]));

// ─── 세부 에셋 디자인 변형(대안) — '변형 생성'(micro-edit) 탭 전용 ───────────────
// retheme(색·재질만 바꾸는 구조 고정 변형)과 다르다. 같은 컴포넌트 정체성(버튼은 버튼,
// 프레임은 프레임)·기능은 유지하되 형태·장식·비율·구성을 적극 변주해 '고를 수 있는
// 여러 디자인 시안'을 만든다. 각 방향(direction)이 한 장의 대안에 대응 — 선택한 방향 수만큼 렌더.
// promptBlock 은 그 방향으로 디자인을 밀어붙이는 1문장 지시(영문). 색 테마 힌트가 아니라 디자인 방향.
// theme 셀이 그대로 쓰도록 id/label/color/desc 를 스타일 객체와 같은 형태로 맞춤.
export const DESIGN_VARIATIONS = [
  { id: 'ornateUp',   label: '장식 강화',   color: '#d4af37', desc: '같은 자리에 더 정교한 모티프',
    promptBlock: 'Push toward a FINER, more intricate decorative MOTIF — denser delicate carving and filigree in the SAME areas at a THIN, fine line weight, like detailed etching or inlay. Do NOT enlarge the ornaments, thicken the frame or border, deepen the relief, or let decoration grow into the content area — "richer" here means MORE fine detail, never heavier, thicker, or bulkier.' },
  { id: 'simplify',   label: '미니멀 정리', color: '#a5b4fc', desc: '장식을 덜고 더 깔끔하게',
    promptBlock: 'Reinterpret it as a cleaner, more minimal version — reduce ornament busyness and simplify into confident clean forms, while keeping the same component type, the same frame thickness, and the same footprint.' },
  { id: 'silhouette', label: '실루엣 변주', color: '#f472b6', desc: '외곽 디테일·코너 처리만',
    promptBlock: 'Explore a different contour and corner / edge treatment within a SIMILAR overall silhouette and the SAME aspect ratio — refine the shape language and edge profile, while keeping the outer footprint, border thickness, and ornament scale close to the source.' },
  { id: 'proportion', label: '내부 균형',   color: '#34d399', desc: '무게중심·강조 균형 변경',
    promptBlock: 'Rebalance the internal weighting and emphasis — shift which area feels heavier and how internal detailing is distributed, WITHOUT changing the outer aspect ratio, the border thickness, or the ornament sizes.' },
  { id: 'recompose',  label: '구성 재배치', color: '#22d3ee', desc: '내부 디테일 배치를 재구성',
    promptBlock: 'Rearrange the INTERNAL composition — restyle and relocate internal accents and detailing into a fresh arrangement within the same footprint, keeping the same outer shape, border thickness, and aspect ratio.' },
  { id: 'material',   label: '재질 대비',   color: '#fb923c', desc: '재질·마감을 과감히 변경',
    promptBlock: 'Reimagine the material and surface finish boldly — try a distinctly different material treatment and finish, while keeping the same component type and silhouette family.' },
  { id: 'accentMove', label: '강조 변경',   color: '#c084fc', desc: '포컬 강조 요소를 다르게',
    promptBlock: 'Restyle and reposition the focal accent — change what draws the eye and how it is emphasized, while keeping the same component type.' },
  { id: 'genreShift', label: '장르 톤 전환', color: '#fbbf24', desc: '스타일 장르·시대 톤 전환',
    promptBlock: 'Shift the stylistic genre/era tone (e.g. more modern, more classical, more rugged), while keeping the same component type and function.' },
];
export const DESIGN_VARIATION_BY_ID = Object.fromEntries(DESIGN_VARIATIONS.map(d => [d.id, d]));
export const defaultDesignVariationIds = DESIGN_VARIATIONS.slice(0, 4).map(d => d.id);

// 변형 강도 — 원본에서 얼마나 멀어질지. 선택한 모든 방향에 공통 적용.
export const VARIATION_STRENGTH = [
  { id: 'subtle',   label: '미세', desc: '원본에 매우 가깝게',  accent: '#76cee0',
    promptBlock: 'VARIATION STRENGTH: subtle — this is a NEAR-MINIMAL edit. Stay extremely close to the reference: change mainly the surface material/finish and only the smallest interior motif detail, reading as the SAME asset lightly refreshed rather than a redesign. Keep ALL borders, frames, outlines, lines, and the space immediately around them essentially identical to the source — do NOT add or thicken any edge ornament. Structural envelope and every edge unchanged.' },
  { id: 'moderate', label: '중간', desc: '뚜렷하나 동일 골격',  accent: '#a78bfa',
    promptBlock: 'VARIATION STRENGTH: moderate — a clearly distinct redesign of the motif, detail, and material, yet obviously the same component on the same structural envelope (same thickness, ornament scale, aspect ratio).' },
  { id: 'bold',     label: '과감', desc: '모티프·재질만 대담히', accent: '#f472b6',
    promptBlock: 'VARIATION STRENGTH: bold — boldly reinterpret the decorative motif, shape detail, material, and internal arrangement, while still respecting the structural envelope (same-or-slimmer border thickness, same ornament scale, same aspect ratio and footprint). Boldness lives in the motif and material — NEVER in thicker strokes, deeper relief, or heavier mass.' },
];
export const VARIATION_STRENGTH_BY_ID = Object.fromEntries(VARIATION_STRENGTH.map(s => [s.id, s]));
