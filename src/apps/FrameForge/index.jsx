// FrameForge — 프레임·버튼·배지를 "무에서" 생성하는 2단계 프롬프트 스튜디오.
// Typecore Sovereign(형태) → Render Matrix(재질) 철학을 UI 컴포넌트에 그대로 적용:
//   1단계 형태(Form)  = 실루엣·코너·슬롯·장식만 담은 "플랫 구조" 프롬프트 → Ultra 에서 형태 생성 후 lock.
//   2단계 재질(Material)= lock 한 형태 이미지를 첨부 전제로, 형태는 유지하고 재질/색/조명만 입히는 프롬프트.
// * 이미지 API 를 직접 호출하지 않는 프롬프트 생성기(비용 0). 선택적 Gemini 보강만 analysis 1c.
// * 루비콘 포지(기존 디자인 변형)와 달리 여기는 "생성". 배치 대량화는 Theme Forge/봇으로.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Copy, Download, Check, Shuffle, Wand2, Loader2, RotateCcw,
  Square, ArrowRight, Info, Image as ImageIcon,
} from 'lucide-react';
import { useUsageGate } from '../../components/UsageGate';
import { useAuth } from '../../context/AuthContext';
import { useGlobal } from '../../context/GlobalContext';
import { APP_MAP } from '../../config/apps';
import { GEMINI_API_KEY } from '../../lib/gemini';
import { IMAGEN_MODELS, renderWithImagen } from '../../lib/imagenRender';
import { savePromptToArc } from '../../lib/promptArcSave';

const ACCENT = APP_MAP['frame-forge']?.color || '#4BCFFA';
const OPTION_ACTIVE = {
  background:'linear-gradient(135deg, #087EA4, #0E9FAD)',
  borderColor:'#4BCFFA',
  color:'#F2FDFF',
  boxShadow:'0 0 0 1px rgba(75,207,250,0.22), 0 4px 14px rgba(8,126,164,0.28)',
};
const THEME_COLOR = APP_MAP['theme-forge']?.color || '#FF9F1C';
const FORM_STORAGE = 'frame-forge:form';
const MAT_STORAGE = 'frame-forge:material';
const COMPLETE_STORAGE = 'frame-forge:complete';
const BATCH_OPTIONS = [8, 16, 32];
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function downloadTransparentPng(dataUrl) {
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently:true });
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  const sample = Math.max(2, Math.min(12, Math.floor(Math.min(canvas.width, canvas.height) * 0.01)));
  let rr = 0, gg = 0, bb = 0, count = 0;
  const corners = [[0,0], [canvas.width-sample,0], [0,canvas.height-sample], [canvas.width-sample,canvas.height-sample]];
  for (const [sx, sy] of corners) for (let y=sy; y<sy+sample; y++) for (let x=sx; x<sx+sample; x++) {
    const i = (y * canvas.width + x) * 4; rr += d[i]; gg += d[i+1]; bb += d[i+2]; count++;
  }
  const bg = [rr/count, gg/count, bb/count];
  const hard = 22, feather = 52;
  for (let i=0; i<d.length; i+=4) {
    const distance = Math.hypot(d[i]-bg[0], d[i+1]-bg[1], d[i+2]-bg[2]);
    if (distance <= hard) d[i+3] = 0;
    else if (distance < feather) d[i+3] = Math.round(d[i+3] * ((distance-hard)/(feather-hard)));
  }
  ctx.putImageData(image, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('투명 PNG 변환에 실패했습니다.');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `frame_forge_transparent_${canvas.width}x${canvas.height}.png`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── 1단계 · 형태(Form) 축 ────────────────────────────────
const FORM_AXES = {
  component: {
    label: '컴포넌트', pick: true,
    opts: [
      { key: 'frame',  ko: '프레임/블릿', en: 'a decorative promotion UI frame / bullet container' },
      { key: 'button', ko: '버튼',        en: 'a call-to-action button shape' },
      { key: 'badge',  ko: '배지/칩',     en: 'a badge or chip container' },
      { key: 'panel',  ko: '패널/카드',   en: 'a panel / card container' },
    ],
  },
  silhouette: {
    label: '실루엣',
    opts: [
      { ko: '클래식 사각', en: 'classic rectangular plate' },
      { ko: '라운드 리본', en: 'rounded ribbon banner' },
      { ko: '방패/엠블럼', en: 'shield / emblem crest' },
      { ko: '아치/창문',   en: 'arched window shape' },
      { ko: '육각/기하',   en: 'hexagonal geometric' },
      { ko: '유기 곡선',   en: 'organic flowing curves' },
      { ko: '티켓/스탬프', en: 'ticket / stamp with perforation' },
    ],
  },
  corner: {
    label: '코너',
    opts: [
      { ko: '샤프',   en: 'sharp angular corners' },
      { ko: '라운드', en: 'softly rounded corners' },
      { ko: '필',     en: 'fully rounded pill ends' },
      { ko: '컷코너', en: 'chamfered cut corners' },
      { ko: '노치',   en: 'notched / indented corners' },
    ],
  },
  slot: {
    label: '내부 구성',
    opts: [
      { ko: '단일 슬롯',    en: 'single centered content slot' },
      { ko: '헤더+본문',    en: 'header strip plus body area' },
      { ko: '좌아이콘+텍스트', en: 'left icon well plus right text area' },
      { ko: '리본 배너',    en: 'a title ribbon across the top' },
      { ko: '중앙 심볼',    en: 'a central emblem medallion' },
    ],
  },
  ornament: {
    label: '장식',
    opts: [
      { ko: '미니멀',     en: 'minimal, no ornament' },
      { ko: '코너 장식',  en: 'ornamental corner flourishes' },
      { ko: '테두리 문양', en: 'a patterned border trim' },
      { ko: '좌우 윙',    en: 'symmetrical side wings' },
      { ko: '볼트/리벳',  en: 'bolt and rivet hardware points' },
    ],
  },
  proportion: {
    label: '비율',
    opts: [
      { ko: '가로 와이드', en: 'wide horizontal proportion' },
      { ko: '정사각',      en: 'square proportion' },
      { ko: '세로형',      en: 'tall vertical proportion' },
      { ko: '배너 비율',   en: 'slim banner proportion' },
    ],
  },
};
const FORM_RANDOM = ['silhouette', 'corner', 'slot', 'ornament', 'proportion'];

// ─── 2단계 · 재질(Material) 축 ────────────────────────────
const MAT_AXES = {
  material: {
    label: '재질', pick: true,
    opts: [
      { ko: '브러시드 메탈', en: 'brushed metal with beveled edges' },
      { ko: '프로스티드 글래스', en: 'frosted glass with inner glow' },
      { ko: '네온 글로우',   en: 'emissive neon glowing edges' },
      { ko: '홀로 포일',     en: 'holographic foil with rainbow sheen' },
      { ko: '글로시 젤리',   en: 'glossy jelly with soft highlights' },
      { ko: '스톤 각인',     en: 'engraved carved stone' },
      { ko: '크리스탈',      en: 'faceted crystal, translucent' },
      { ko: '골드 도금',     en: 'polished gold plating' },
    ],
  },
  palette: {
    label: '팔레트',
    opts: [
      { ko: '네온 시안',   en: 'neon cyan and magenta' },
      { ko: '로열 골드',   en: 'royal gold on deep navy' },
      { ko: '에메랄드',    en: 'emerald green and charcoal' },
      { ko: '선셋',        en: 'sunset orange-to-pink' },
      { ko: '모노크롬',    en: 'monochrome silver on black' },
      { ko: '퍼플 하이테크', en: 'electric purple and teal' },
      { ko: '크림슨',      en: 'crimson red and antique gold' },
      { ko: '파스텔',      en: 'soft pastel lilac and mint' },
    ],
  },
  lighting: {
    label: '조명',
    opts: [
      { ko: '상단광',     en: 'top key light' },
      { ko: '림라이트',   en: 'rim backlight' },
      { ko: '내부 발광',  en: 'inner self-illumination' },
      { ko: '드라마틱',   en: 'dramatic spotlight' },
      { ko: '소프트 앰비언트', en: 'soft ambient light' },
    ],
  },
  finish: {
    label: '마감',
    opts: [
      { ko: '베벨 엣지',   en: 'beveled edges' },
      { ko: '인레이 심라인', en: 'inlaid glowing seam lines' },
      { ko: '이중 보더',   en: 'double-line border' },
      { ko: '고광택',      en: 'high-gloss lacquer' },
      { ko: '서브서피스',  en: 'subsurface translucency' },
    ],
  },
  mood: {
    label: '무드',
    opts: [
      { ko: '럭셔리',   en: 'luxury premium' },
      { ko: '사이버',   en: 'cyberpunk hi-tech' },
      { ko: '판타지',   en: 'ornate fantasy' },
      { ko: '미니멀',   en: 'clean minimal' },
      { ko: '팝',       en: 'playful pop' },
    ],
  },
};
const MAT_RANDOM = ['palette', 'lighting', 'finish', 'mood'];

// ─── 완성형 프레임 · 형태+장식+재질을 한 번에 생성 ──────────
const COMPLETE_AXES = {
  assetType: {
    label:'사용 용도', pick:true,
    opts:[
      { key:'button', ko:'버튼', en:'an empty horizontal game menu button frame' },
      { key:'box', ko:'박스', en:'an empty game UI content box or panel frame' },
      { key:'frame', ko:'프레임', en:'an empty decorative game UI frame' },
      { key:'badge', ko:'배지', en:'an empty compact game UI badge frame' },
      { key:'divider', ko:'디바이더', en:'a single straight horizontal game UI divider line' },
    ],
  },
  preset: {
    label: '스타일',
    opts: [
      { key:'dragon_slayer', ko:'드래곤 슬레이어', en:'restrained dragon-slayer accents, abstract mirrored dragon cues localized only at the four corners' },
      { key:'royal_crest', ko:'왕가 문장', en:'fallen royal dynasty crest, crown-like heraldic ornaments and restrained fleur-de-lis details' },
      { key:'black_thorn', ko:'흑철 가시', en:'black iron thorn armor, blade-like spikes and severe gothic corner guards' },
      { key:'ancient_rune', ko:'고대 룬', en:'ancient clan runes engraved into austere medieval metal border segments' },
      { key:'minimal_gold', ko:'미니멀 골드', en:'minimal luxury gold trim with one soft highlight and no figurative ornament' },
      { key:'soft_glow', ko:'소프트 글로우', en:'clean soft-glowing rim with rounded modern fantasy restraint' },
      { key:'parchment', ko:'양피지', en:'lightly aged parchment edge with simple folded corners and no dense decoration' },
      { key:'nature', ko:'자연 정령', en:'restrained leaf and spirit-light accents localized to two corners' },
      { key:'arcane', ko:'아케인 마법', en:'one subtle arcane glow line and a small central rune accent' },
      { key:'dark_minimal', ko:'다크 미니멀', en:'plain charcoal surface, precise thin border and almost no ornament' },
      { key:'red_lacquer', ko:'붉은 칠기', en:'restrained deep-red lacquer with narrow aged-gold edge accents' },
      { key:'crystal', ko:'크리스탈', en:'clean translucent crystal rim with sparse controlled highlights' },
    ],
  },
  silhouette: {
    label:'형태',
    opts:[
      { key:'button_hex_3', for:['button'], ko:'뾰족 육각 3:1', en:'an elongated 3:1 pointed hexagon menu-button frame with sharp spear-tip ends' },
      { key:'button_hex_4', for:['button'], ko:'뾰족 육각 4:1', en:'an ultra-wide 4:1 pointed hexagon button frame' },
      { key:'button_cut', for:['button'], ko:'컷코너 버튼', en:'an elongated 3:1 button with precise clipped corners' },
      { key:'button_pill', for:['button'], ko:'필 버튼', en:'a clean horizontal pill-shaped button' },
      { key:'button_round', for:['button'], ko:'라운드 버튼', en:'a wide softly rounded rectangular button' },
      { key:'box_landscape', for:['box'], ko:'가로 박스', en:'a wide landscape content box with a large usable interior' },
      { key:'box_square', for:['box'], ko:'정사각 박스', en:'a square content box with a large usable interior' },
      { key:'box_portrait', for:['box'], ko:'세로 박스', en:'a tall portrait content box with a large usable interior' },
      { key:'box_tab', for:['box'], ko:'탭 박스', en:'a rectangular content box with one small integrated top tab' },
      { key:'box_banner', for:['box'], ko:'행잉 박스', en:'a hanging banner-shaped content box with a pointed lower edge' },
      { key:'frame_wide', for:['frame'], ko:'와이드 프레임', en:'a wide 16:9 decorative frame with a large open center' },
      { key:'frame_square', for:['frame'], ko:'정사각 프레임', en:'a square decorative frame with a large open center' },
      { key:'frame_portrait', for:['frame'], ko:'세로 프레임', en:'a portrait decorative frame with a large open center' },
      { key:'circle_plate', for:['frame'], ko:'원형 장식 사각판', en:'a rectangular UI plate incorporating a circular medallion or round ornament' },
      { key:'perfect_circle', for:['frame','badge'], ko:'완전한 원', en:'one mathematically perfect circular silhouette, equal width and height, with no square or rectangular backing plate' },
      { key:'oval', for:['frame','badge'], ko:'타원형', en:'a wide oval frame with a clean center and no rectangular backing' },
      { key:'badge_shield', for:['badge'], ko:'방패 배지', en:'a compact shield-shaped badge frame' },
      { key:'badge_hex', for:['badge'], ko:'육각 배지', en:'a compact regular hexagonal badge frame' },
      { key:'badge_ribbon', for:['badge'], ko:'리본 배지', en:'a compact ribbon-shaped badge frame' },
      { key:'divider_line', for:['divider'], ko:'일직선', en:'one perfectly straight horizontal separator line' },
    ],
  },
  frameWeight: {
    label:'프레임 굵기',
    opts:[
      { ko:'초박형', en:'ultra-thin sleek hairline rails, never bulky' },
      { ko:'얇고 예리함', en:'thin razor-edged metal rails with precise bevels' },
      { ko:'장식부만 강조', en:'hairline straight rails with detail concentrated only at corners and ends' },
    ],
  },
  material: {
    label:'재질',
    opts:[
      { ko:'순금', en:'rich solid gold with controlled polished highlights' },
      { ko:'금박', en:'thin hand-applied gold leaf with subtle seams and restrained wear' },
      { ko:'고대 황금', en:'aged ancient gold with dark patina settled into recesses' },
      { ko:'전투 흔적 황금', en:'battle-worn gold with fine scratches, small dents and exposed dark under-metal' },
      { ko:'백금', en:'cool pale platinum with refined satin highlights' },
      { ko:'황동', en:'aged brass with warm brown patina' },
      { ko:'청동', en:'ancient bronze with restrained verdigris in recesses' },
      { ko:'은', en:'polished silver with cool controlled reflections' },
      { ko:'다마스커스 강철', en:'dark Damascus steel with subtle layered wave patterns' },
      { ko:'연마 강철', en:'polished forged steel with crisp cold highlights' },
      { ko:'전투로 단련된 흑철', en:'battle-hardened dark steel, subtly scratched and worn' },
      { ko:'기름 먹인 흑철', en:'oiled blackened steel with restrained cold highlights' },
      { ko:'그을린 강철', en:'smoke-darkened forged steel with worn edges' },
      { ko:'주철', en:'heavy matte cast iron with fine granular texture' },
      { ko:'흑요석', en:'deep black obsidian with sparse razor-sharp reflections' },
      { ko:'대리석', en:'dark fantasy marble with restrained natural veining' },
      { ko:'고대 석재', en:'weathered carved stone with shallow age cracks' },
      { ko:'룬 스톤', en:'dark rune stone with one restrained engraved glow line' },
      { ko:'고목', en:'aged dark hardwood with visible grain and worn edges' },
      { ko:'가죽', en:'dark embossed leather with restrained stitched edging' },
      { ko:'뼈', en:'aged ivory bone with subtle porous texture and no gore' },
      { ko:'마력 크리스탈', en:'dark translucent magic crystal with controlled inner light' },
    ],
  },
  interior: {
    label:'프레임 내부',
    opts:[
      { key:'empty', ko:'비우기', en:'leave the interior completely empty and transparent-looking' },
      { key:'solid_dark', ko:'어두운 단색', en:'fill the interior with a clean flat near-black surface' },
      { key:'material_fill', ko:'동일 재질', en:'fill the interior with a restrained flat panel using the same material' },
      { key:'translucent', ko:'반투명', en:'fill the interior with a subtle translucent smoked panel' },
      { key:'gradient', ko:'은은한 그라데이션', en:'fill the interior with a low-contrast dark vertical gradient' },
      { key:'soft_glow', ko:'중앙 소프트광', en:'fill the interior with a dark surface and one restrained soft central glow' },
    ],
  },
  ornament: {
    label:'장식 배치',
    opts:[
      { ko:'절제된 테두리', en:'small ornament accents touch the perimeter but occupy no more than 20% of the total frame area' },
      { ko:'네 모서리 집중', en:'small mirrored ornaments localized at the four corners, connected only by clean hairline rails' },
      { ko:'좌우 대칭', en:'compact mirrored accents at both pointed ends with plain top and bottom hairline rails' },
    ],
  },
  renderStyle: {
    label:'렌더 표현 방식',
    opts:[
      { key:'realistic_3d', ko:'실사형 3D', en:'high-end physically based 3D game UI render; realistic metal, stone, leather and wood response; controlled real-world reflections, wear, micro-scratches and surface roughness; no painted outlines' },
      { key:'illustrated', ko:'일러스트형', en:'hand-painted game UI illustration; clear painted outer edges, simplified lighting and readable color masses; shape and color design take priority over physically realistic material response; no photorealism' },
      { key:'semi_realistic', ko:'반실사형', en:'semi-realistic RPG game UI rendering that combines believable material cues with controlled hand-painted shading; stable readable silhouette and restrained stylization' },
      { key:'flat_graphic', ko:'플랫 그래픽', en:'clean 2D vector-like or cel-shaded game UI graphic; simplified flat color planes, crisp silhouette and minimal shading; optimized for small buttons and mobile UI; no photorealistic depth' },
    ],
  },
};
const COMPLETE_RANDOM = ['preset', 'silhouette', 'frameWeight', 'material', 'interior', 'ornament', 'renderStyle'];
const SIMPLE_MOODS = [
  { key:'dark_rpg', ko:'어둡고 강한 RPG', preset:'black_thorn', material:'전투로 단련된 흑철', ornament:'절제된 테두리' },
  { key:'gold_kingdom', ko:'화려한 황금 왕국', preset:'royal_crest', material:'고대 황금', ornament:'네 모서리 집중' },
  { key:'magic', ko:'신비로운 마법', preset:'arcane', material:'마력 크리스탈', ornament:'좌우 대칭' },
  { key:'nature', ko:'자연과 정령', preset:'nature', material:'고목', ornament:'네 모서리 집중' },
  { key:'clean', ko:'깔끔하고 현대적', preset:'dark_minimal', material:'연마 강철', ornament:'절제된 테두리' },
];
const SIMPLE_RENDER_STYLES = [
  { key:'illustrated', ko:'게임 일러스트' },
  { key:'realistic_3d', ko:'사실적인 3D' },
  { key:'flat_graphic', ko:'심플한 2D' },
];

// ─── 프롬프트 빌더 ────────────────────────────────────────
function buildFormPrompt(seed) {
  return `Flat structural design of ${seed.component.en} for a game promotion UI. Silhouette: ${seed.silhouette.en}. ${seed.corner.en}. Internal layout: ${seed.slot.en}. Ornament: ${seed.ornament.en}. Proportion: ${seed.proportion.en}. Render as a CLEAN FLAT greyscale line/vector shape — geometry and outline only, NO material, NO color, NO lighting, NO texture. Isolated on a plain neutral background, front orthographic view, crisp edges, centered with generous padding. This is a base FORM to be textured in a later pass.`;
}
function buildMatPrompt(seed) {
  return `Using the ATTACHED flat form image as the exact structural base, apply material and lighting WITHOUT changing its shape, proportions, corners or internal layout. Material: ${seed.material.en}. Color palette: ${seed.palette.en}. Lighting: ${seed.lighting.en}. Finish: ${seed.finish.en}. Mood: ${seed.mood.en}. Preserve the crisp silhouette and clean alpha edges. Isolated on a transparent or flat dark background, front orthographic view, high detail, production-ready game UI, 4k. No text, no watermark.`;
}
function buildCompletePrompt(seed, userIntent = '') {
  const isDivider = seed.assetType.key === 'divider';
  const isPerfectCircle = seed.silhouette.key === 'perfect_circle';
  const structure = isDivider
    ? 'one perfectly straight horizontal separator line, very wide and extremely thin; ignore all plate, box and silhouette shapes'
    : `${seed.silhouette.en}; ${seed.frameWeight.en}`;
  const interior = isDivider ? 'no interior panel because this is a divider line' : seed.interior.en;
  const circleLock = isPerfectCircle ? ' CIRCLE LOCK: exact 1:1 outer boundary, one continuous perfect circle, absolutely no square corners, rectangular backing, tabs or side extensions.' : '';
  const emptyRule = seed.interior.key === 'empty' ? 'The center must remain unfilled.' : 'Keep the selected interior fill simple and low contrast.';
  const isolationBg = seed.interior.key === 'empty'
    ? 'Use a plain neutral background clearly separated from the frame.'
    : 'BACKGROUND FOR EASY CUTOUT: place the finished asset on one perfectly flat solid background color with maximum hue and luminance contrast against the asset and its filled interior (white/light gray behind a dark asset, black/deep blue behind a bright gold or pale asset). Never reuse an asset color in the background; no background texture, gradient, glow, cast shadow or vignette.';
  const intent = userIntent.trim() ? ` USER INTENT — apply only when it does not violate the structural locks: ${userIntent.trim()}.` : '';
  return `Create ${seed.assetType.en}, production-ready for a game UI. Structure: ${structure}.${circleLock} Style direction: ${seed.preset.en}. Ornament placement: ${seed.ornament.en}. Interior treatment: ${interior}. RENDER EXPRESSION LOCK: ${seed.renderStyle.en}.${intent} STRICT RESTRAINT: ornament may occupy at most 15% of the asset area; use one clear silhouette with only 1 decorative layer and very low visual density. Frame rails must remain slim, visually light and nearly uniform in thickness; decorative masses must never make the frame look thick. Material and surface: ${seed.material.en}, refined finish, crisp controlled highlights interpreted strictly through the selected render expression. ${emptyRule} ${isolationBg} Make the asset nine-slice-safe where applicable. Front orthographic view, centered, 4K game UI asset render. NO mixing with another render style, NO thick frame, NO bulky border, NO heavy corner blocks, NO dense filigree, NO spiderweb or lattice, NO repeated spikes, NO overlapping ornaments, NO extra decorative layer, no perspective, no text, no letters, no icons, no watermark, no extra objects.`;
}
function tagsOf(seed, keys) { return keys.map((k) => seed[k].ko); }

function generateSeeds(n, axes, randomKeys, pickKeys) {
  const pickAxis = Object.keys(axes).find((key) => axes[key]?.pick) || Object.keys(axes)[0];
  const pool = axes[pickAxis].opts.filter((o) => !o.key || pickKeys.includes(o.key));
  const usePool = pool.length ? pool : axes[pickAxis].opts;
  const seen = new Set();
  const out = [];
  let guard = 0;
  while (out.length < n && guard < n * 30) {
    guard++;
    const seed = {};
    seed[pickAxis] = rnd(usePool);
    for (const k of randomKeys) seed[k] = rnd(axes[k].opts);
    const orderedKeys = [pickAxis, ...randomKeys];
    const tags = tagsOf(seed, orderedKeys);
    const sig = tags.join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ id: `${Date.now()}_${out.length}`, seed, tags, enriched: null });
  }
  return out;
}

export default function FrameForgeApp() {
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  // 기존 2단계 코드는 저장 데이터 호환을 위해 유지하되 UI는 완성형 프레임만 노출한다.
  const [stage, setStage] = useState('complete');

  return (
    <div className="flex flex-col h-full w-full bg-[#0A0A0A] text-zinc-100 overflow-hidden font-sans">
      {usageModal}
      <style>{`
        .ff-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .ff-scroll::-webkit-scrollbar-track { background: transparent; }
        .ff-scroll::-webkit-scrollbar-thumb { background: rgba(75,207,250,0.25); border-radius: 5px; }
        .ff-scroll:hover::-webkit-scrollbar-thumb { background: rgba(75,207,250,0.5); }
      `}</style>

      <div className="flex-1 overflow-y-auto ff-scroll p-3 sm:p-4 lg:p-6 2xl:p-8">
        <div className="w-full min-w-0">
          {stage === 'form' ? (
            <StagePanel
              key="form"
              kind="form"
              axes={FORM_AXES}
              randomKeys={FORM_RANDOM}
              storageKey={FORM_STORAGE}
              buildPrompt={buildFormPrompt}
              ensureCanGenerate={ensureCanGenerate}
              onNext={() => setStage('material')}
            />
          ) : stage === 'material' ? (
            <StagePanel
              key="material"
              kind="material"
              axes={MAT_AXES}
              randomKeys={MAT_RANDOM}
              storageKey={MAT_STORAGE}
              buildPrompt={buildMatPrompt}
              ensureCanGenerate={ensureCanGenerate}
            />
          ) : (
            <StagePanel
              key="complete"
              kind="complete"
              axes={COMPLETE_AXES}
              randomKeys={COMPLETE_RANDOM}
              storageKey={COMPLETE_STORAGE}
              buildPrompt={buildCompletePrompt}
              ensureCanGenerate={ensureCanGenerate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StagePanel({ kind, axes, randomKeys, storageKey, buildPrompt, ensureCanGenerate, onNext }) {
  const { user } = useAuth();
  const { navigate } = useGlobal();
  const isForm = kind === 'form';
  const isComplete = kind === 'complete';
  const pickAxisKey = axes.component ? 'component' : (axes.material?.pick ? 'material' : 'preset');
  const pickAxis = axes[pickAxisKey];

  const [pickKeys, setPickKeys] = useState(() => pickAxis.opts.map((o) => o.key).filter(Boolean));
  const [batch, setBatch] = useState(16);
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [enriching, setEnriching] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [note, setNote] = useState('');
  const [selectedModel, setSelectedModel] = useState(IMAGEN_MODELS[0].id);
  const [renderingId, setRenderingId] = useState(null);
  const [renderResults, setRenderResults] = useState({});
  const [renderErrors, setRenderErrors] = useState({});
  const [renderZoom, setRenderZoom] = useState({});
  const [modalImage, setModalImage] = useState(null);
  const [transparentBusyId, setTransparentBusyId] = useState(null);
  const [savingIds, setSavingIds] = useState({});
  const [userIntent, setUserIntent] = useState('');
  const [simpleMood, setSimpleMood] = useState('dark_rpg');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(true);
  const [completeSelection, setCompleteSelection] = useState(() => {
    const initial = Object.fromEntries(Object.entries(axes).map(([key, axis]) => [key, axis.opts[0]]));
    if (kind === 'complete') {
      initial.preset = axes.preset.opts.find((o) => o.key === 'black_thorn') || initial.preset;
      initial.material = axes.material.opts.find((o) => o.ko === '전투로 단련된 흑철') || initial.material;
      initial.ornament = axes.ornament.opts.find((o) => o.ko === '절제된 테두리') || initial.ornament;
      initial.renderStyle = axes.renderStyle.opts.find((o) => o.key === 'illustrated') || initial.renderStyle;
    }
    return initial;
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(queue)); } catch { /* quota */ }
  }, [queue, storageKey]);

  const togglePick = (key) => setPickKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const handleGenerate = useCallback(() => {
    if (isComplete) {
      const seed = completeSelection;
      const tags = Object.keys(axes).map((key) => seed[key]?.ko).filter(Boolean);
      const item = { id:`${Date.now()}_0`, seed, tags, enriched:null };
      setQueue([{ ...item, prompt:buildPrompt(seed, userIntent) }]);
      setNote('선택한 설정으로 완성형 프레임 프롬프트를 생성했습니다.');
      setSettingsDirty(false);
      return;
    }
    const keys = pickKeys.length ? pickKeys : pickAxis.opts.map((o) => o.key).filter(Boolean);
    const seeds = generateSeeds(batch, axes, randomKeys, keys).map((s) => ({ ...s, prompt: buildPrompt(s.seed) }));
    setQueue(seeds);
    setNote(`${seeds.length}개 ${isForm ? '형태' : isComplete ? '완성형 프레임' : '렌더링'} 프롬프트 생성 (무료).`);
  }, [batch, pickKeys, axes, randomKeys, pickAxis, buildPrompt, isForm, isComplete, completeSelection, userIntent]);

  const handleEnrich = useCallback(async () => {
    if (!queue.length) { setNote('먼저 큐를 생성하세요.'); return; }
    if (!GEMINI_API_KEY) { setNote('Gemini 키가 없습니다.'); return; }
    if (!(await ensureCanGenerate('analysis'))) return;
    setEnriching(true);
    setNote('Gemini로 다듬는 중…');
    try {
      const intent = isForm
        ? 'These are FORM prompts (flat structural shapes, no material). Keep them strictly flat/greyscale/outline-only — do not add color, material or lighting. Increase geometric clarity and variety.'
        : isComplete
          ? 'These are complete game UI frame prompts. You are a copy editor, NOT a designer. Do not add, intensify, reinterpret or visualize any detail. Preserve the user intent, the selected RENDER EXPRESSION LOCK, and every structural lock verbatim. Never mix photorealistic, illustrated, semi-realistic or flat-graphic rendering modes. The result must be visibly thinner and simpler than the input: ornament <=15%, exactly 1 decorative layer, slim nearly-uniform rails, no thick frame, heavy corner mass, dense filigree, web, lattice, repeated spikes or overlap. Delete decorative adjectives when uncertain.'
          : 'These are MATERIAL prompts meant to be run with a flat form image ATTACHED as reference. Keep the instruction to preserve the attached shape/proportions unchanged, and enrich only the material, color, lighting and finish detail.';
      const sys = `You are a prompt engineer for game-promotion UI image generation.
${intent}
Perform minimal copy-editing only: remove repetition and improve clarity without changing design content. Keep every number, user intent, structural lock, background rule and NO-clause. Do not invent or amplify ornament, lore, symbols, materials, lighting or effects.
Return ONLY a JSON array of strings, same length and order as the input. No commentary.
Seeds:
${queue.map((q, i) => `${i + 1}. [${q.tags.join(', ')}] ${q.prompt}`).join('\n')}`;
      const body = { contents: [{ role: 'user', parts: [{ text: sys }] }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let arr = null;
      try { arr = JSON.parse(text); } catch {
        const a = text.indexOf('['); const b = text.lastIndexOf(']');
        if (a !== -1 && b !== -1) { try { arr = JSON.parse(text.slice(a, b + 1)); } catch { /* ignore */ } }
      }
      if (!Array.isArray(arr)) throw new Error('응답을 해석할 수 없습니다.');
      const restraintLock = ' FINAL NON-NEGOTIABLE LOCK: ultra-slim nearly-uniform rails; ornament occupies no more than 15% of the asset; exactly one decorative layer; preserve large calm negative space. NO thick frame, bulky border, heavy corner blocks, dense filigree, web, lattice, repeated spikes, overlapping ornament or added decoration.';
      setQueue((prev) => prev.map((q, i) => ({ ...q, enriched: typeof arr[i] === 'string' ? `${arr[i]}${restraintLock}` : q.enriched })));
      setNote('보강 완료.');
    } catch (e) {
      console.error('[FrameForge] enrich failed', e);
      setNote(`보강 실패: ${e.message || e}`);
    } finally {
      setEnriching(false);
    }
  }, [queue, ensureCanGenerate, isForm, isComplete]);

  const promptText = (q) => q.enriched || q.prompt;
  const allText = useMemo(() => queue.map((q, i) => `# ${i + 1}. ${q.tags.join(' · ')}\n${promptText(q)}`).join('\n\n'), [queue]);

  const copy = async (text, id) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1200); }
    catch { setNote('클립보드 접근 실패.'); }
  };
  const renderPrompt = async (q) => {
    if (renderingId) return;
    if (!(await ensureCanGenerate('image'))) return;
    setRenderingId(q.id);
    setRenderErrors((prev) => ({ ...prev, [q.id]: '' }));
    try {
      const result = await renderWithImagen(promptText(q), selectedModel);
      setRenderResults((prev) => ({ ...prev, [q.id]: result }));
      if (result?.dataUrl && user?.uid) {
        setSavingIds((prev) => ({ ...prev, [q.id]: true }));
        const saved = await savePromptToArc(user.uid, {
          imageDataUrl:result.dataUrl,
          promptText:promptText(q),
          title:`Frame Forge · ${q.tags.slice(0, 3).join(' · ')}`,
          tags:['Frame Forge', ...q.tags],
          folderName:'Frame Forge 렌더',
          type:'UI 프레임',
          source:'frame-forge',
          temporary:false,
        });
        if (!saved.ok) setRenderErrors((prev) => ({ ...prev, [q.id]:`렌더링은 완료됐지만 Prompt Arche 저장 실패: ${saved.error}` }));
        setSavingIds((prev) => ({ ...prev, [q.id]:false }));
      }
    } catch (e) {
      setRenderErrors((prev) => ({ ...prev, [q.id]: e.message || String(e) }));
    } finally {
      setRenderingId(null);
    }
  };
  const downloadRendered = (q) => {
    const dataUrl = renderResults[q.id]?.dataUrl;
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl; a.download = `frame_forge_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const downloadTransparent = async (q) => {
    const dataUrl = renderResults[q.id]?.dataUrl;
    if (!dataUrl || transparentBusyId) return;
    setTransparentBusyId(q.id);
    try { await downloadTransparentPng(dataUrl); }
    catch (e) { setRenderErrors((prev) => ({ ...prev, [q.id]:e.message || String(e) })); }
    finally { setTransparentBusyId(null); }
  };
  const sendToMaskForge = (q) => {
    const dataUrl = renderResults[q.id]?.dataUrl;
    if (!dataUrl) return;
    navigate('mask-forge', {
      source:'frame-forge', target:'mask-forge',
      image:{ url:dataUrl, metadata:{ from:'Frame Forge', originalResolution:true } },
      params:{ method:'luma', maxResolution:true },
    });
  };
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 2xl:gap-6 items-start w-full min-w-0">
      {/* 워크플로우 배너 */}
      <div className="lg:col-span-2 rounded-xl border px-4 py-3 flex items-start gap-2.5 text-[11px] leading-relaxed" style={{ borderColor: `${ACCENT}33`, background: `${ACCENT}0d` }}>
        <Info size={14} style={{ color: ACCENT }} className="shrink-0 mt-0.5" />
        {isForm ? (
          <span className="text-zinc-300">
            <b className="text-zinc-100">1단계 · 형태</b> — 재질/색 없이 <b>구조(실루엣·코너·슬롯)</b>만 담은 플랫 프롬프트를 뽑습니다.
            Ultra에서 생성 후 <b>맘에 드는 형태를 저장(lock)</b> 하고, 2단계 렌더링에서 그 이미지를 첨부해 재질을 입히세요.
          </span>
        ) : isComplete ? (
          <span className="text-zinc-300">
            <b className="text-zinc-100">완성형 프레임</b> — 형태와 재질을 한 번에 생성합니다. <b style={{ color: ACCENT }}>드래곤 슬레이어</b>를 선택하면
            뾰족한 3:1 버튼, 초박형 흑철 레일, 테두리를 감싸는 용 장식, 비어 있는 텍스트 영역이 함께 지정됩니다.
          </span>
        ) : (
          <span className="text-zinc-300">
            <b className="text-zinc-100">2단계 · 렌더링</b> — 이 프롬프트들은 <b style={{ color: ACCENT }}>1단계 형태 이미지를 Ultra에 첨부한 상태</b>에서 쓰는 용도입니다.
            형태는 유지하고 재질/색/조명만 입혀 "형태 1종 × 렌더링 N종"으로 확장돼요. 대량 배치는 <b style={{ color: THEME_COLOR }}>Theme Forge</b>로.
          </span>
        )}
      </div>

      {/* 시드 설정 */}
      <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: ACCENT }} />
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{isForm ? '형태 시드' : isComplete ? '완성형 프레임 시드' : '렌더링 시드'}</span>
        </div>

        {/* 완성형은 모든 축을 사용자가 직접 선택. 기존 2단계는 대표축만 선택. */}
        {isComplete ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border px-4 py-4" style={{ borderColor:`${ACCENT}35`, background:`${ACCENT}08` }}>
              <div className="text-[12px] font-black text-zinc-200 mb-1">1. 무엇을 만들까요?</div>
              <div className="text-[10px] text-zinc-600 mb-3">필요한 UI 종류를 하나 골라주세요.</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {axes.assetType.opts.map((option) => {
                  const on = completeSelection.assetType === option;
                  return <button key={option.key} onClick={() => { setSettingsDirty(true); setCompleteSelection((prev) => {
                    const firstShape = axes.silhouette.opts.find((shape) => !shape.for || shape.for.includes(option.key));
                    return { ...prev, assetType:option, silhouette:firstShape || prev.silhouette };
                  }); }} className={`py-2.5 rounded-lg border text-[11px] font-bold ${on ? '' : 'text-zinc-400 border-zinc-700'}`} style={on ? OPTION_ACTIVE : undefined}>{option.ko}</button>;
                })}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black/20 px-4 py-4">
              <div className="text-[12px] font-black text-zinc-200 mb-1">2. 어떤 느낌인가요?</div>
              <div className="text-[10px] text-zinc-600 mb-3">분위기를 고르면 재질과 장식을 알아서 맞춰드려요.</div>
              <div className="flex flex-wrap gap-2">
                {SIMPLE_MOODS.map((mood) => <button key={mood.key} onClick={() => {
                  setSettingsDirty(true);
                  setSimpleMood(mood.key);
                  setCompleteSelection((prev) => ({ ...prev,
                    preset:axes.preset.opts.find((o) => o.key === mood.preset) || prev.preset,
                    material:axes.material.opts.find((o) => o.ko === mood.material) || prev.material,
                    ornament:axes.ornament.opts.find((o) => o.ko === mood.ornament) || prev.ornament,
                  }));
                }} className={`px-3 py-2 rounded-lg border text-[10px] font-bold ${simpleMood === mood.key ? '' : 'text-zinc-400 border-zinc-700'}`} style={simpleMood === mood.key ? OPTION_ACTIVE : undefined}>{mood.ko}</button>)}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black/20 px-4 py-4">
              <div className="text-[12px] font-black text-zinc-200 mb-1">3. 어떻게 보일까요?</div>
              <div className="text-[10px] text-zinc-600 mb-3">결과 이미지의 표현 방식을 골라주세요.</div>
              <div className="grid grid-cols-3 gap-2">
                {SIMPLE_RENDER_STYLES.map((item) => {
                  const option = axes.renderStyle.opts.find((o) => o.key === item.key);
                  const on = completeSelection.renderStyle?.key === item.key;
                  return <button key={item.key} onClick={() => { setSettingsDirty(true); setCompleteSelection((prev) => ({ ...prev, renderStyle:option || prev.renderStyle })); }} className={`py-2.5 rounded-lg border text-[10px] font-bold ${on ? '' : 'text-zinc-400 border-zinc-700'}`} style={on ? OPTION_ACTIVE : undefined}>{item.ko}</button>;
                })}
              </div>
            </div>
            <button onClick={() => setAdvancedOpen((open) => !open)} className="w-full flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3 text-[11px] font-bold text-zinc-400 hover:text-white">
              <span>세부 설정 직접 하기</span><span>{advancedOpen ? '접기 −' : '열기 +'}</span>
            </button>
            {advancedOpen && <div className="flex flex-col gap-3 border-l-2 pl-3" style={{ borderColor:`${ACCENT}55` }}>
              {Object.entries(axes).filter(([key]) => key !== 'assetType').map(([key, axis]) => (
                <div key={key} className="rounded-lg border border-zinc-800 bg-black/20 px-3 py-3">
                  <div className="flex items-center gap-2 mb-2.5"><span className="text-[10px] font-black text-zinc-400">{key === 'silhouette' ? `${completeSelection.assetType?.ko || ''} 형태` : axis.label}</span><span className="text-[9px] font-bold rounded-full px-2 py-0.5" style={{ color:ACCENT, background:`${ACCENT}18` }}>{completeSelection[key]?.ko}</span></div>
                  <div className="flex flex-wrap gap-2">{axis.opts.filter((option) => !option.for || option.for.includes(completeSelection.assetType?.key)).map((option) => { const on=completeSelection[key]===option; return <button key={option.key || option.ko} onClick={() => { setSettingsDirty(true); setCompleteSelection((prev) => ({ ...prev, [key]:option })); }} className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${on ? '' : 'text-zinc-400 border-zinc-700'}`} style={on ? OPTION_ACTIVE : undefined}>{option.ko}</button>; })}</div>
                </div>
              ))}
              <textarea value={userIntent} onChange={(e) => { setUserIntent(e.target.value); setSettingsDirty(true); }} placeholder="추가 요청을 자유롭게 적어주세요" className="w-full min-h-20 rounded-lg border border-zinc-700 bg-black/30 px-3 py-2.5 text-[11px] text-zinc-200 outline-none" />
            </div>}
          </div>
        ) : <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-500 w-16">{pickAxis.label}</span>
          {pickAxis.opts.map((o) => {
            const on = pickKeys.includes(o.key);
            return (
              <button key={o.key} onClick={() => togglePick(o.key)}
                className={`text-[11px] font-bold tracking-wide px-3 py-1.5 rounded-full border transition-colors ${on ? 'text-black' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                style={on ? { background: ACCENT, borderColor: ACCENT } : undefined}>
                {o.ko}
              </button>
            );
          })}
        </div>}

        {/* 랜덤 축 미리보기 */}
        {!isComplete && <div className="flex flex-wrap items-start gap-2">
          <span className="text-[11px] font-bold text-zinc-500 w-16 mt-1.5">랜덤 축</span>
          <div className="flex-1 flex flex-wrap gap-1.5">
            {randomKeys.map((k) => (
              <span key={k} className="text-[10px] text-zinc-500 border border-zinc-800 rounded-md px-2 py-1">
                <b className="text-zinc-300">{axes[k].label}</b> {axes[k].opts.length}종
              </span>
            ))}
          </div>
        </div>}

        {/* 배치 + 생성 */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isComplete && <><span className="text-[11px] font-bold text-zinc-500 w-16">배치 수</span>
          <div className="inline-flex items-center gap-1 bg-black/40 border border-zinc-800 rounded-lg p-1">
            {BATCH_OPTIONS.map((n) => (
              <button key={n} onClick={() => setBatch(n)}
                className={`text-[11px] font-bold tracking-wider px-3 py-1.5 rounded-md transition-colors ${batch === n ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                style={batch === n ? { background: ACCENT } : undefined}>{n}</button>
            ))}
          </div></>}
          <button onClick={handleGenerate}
            className="text-[11px] font-bold tracking-wider px-6 py-2.5 rounded-lg text-black inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110"
            style={settingsDirty
              ? { background:'linear-gradient(135deg, #F59E0B, #F97316)', color:'#1A0B00', boxShadow:'0 5px 18px rgba(249,115,22,0.28)' }
              : { background:'linear-gradient(135deg, #168A68, #20A878)', color:'#F1FFF9', boxShadow:'0 4px 14px rgba(32,168,120,0.2)' }}>
            <Shuffle size={13} /> {isComplete ? (queue.length ? (settingsDirty ? '변경사항을 프롬프트에 반영' : '현재 설정 반영 완료') : '이 설정으로 프롬프트 만들기') : '큐 생성 (무료)'}
          </button>
          <button onClick={handleEnrich} disabled={!queue.length || enriching}
            title="큐 전체를 한 번의 Gemini 호출로 다듬음 (analysis 1c)"
            className="text-[11px] font-bold tracking-wider px-5 py-2.5 rounded-lg border inline-flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: ACCENT, borderColor: `${ACCENT}66` }}>
            {enriching ? <><Loader2 size={13} className="animate-spin" /> 정제 중…</> : <><Wand2 size={13} /> Gemini로 문장 정제</>}
          </button>
        </div>

        {note && <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-3">{note}</div>}
        {isComplete && queue.length > 0 && settingsDirty && <div className="text-[10px] rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-amber-200/80">옵션이 변경되었습니다. 위 버튼을 눌러야 오른쪽 프롬프트에 반영됩니다.</div>}
      </div>

      {/* 우측 · 내보내기 + 프롬프트 + 렌더 */}
      <div className="flex flex-col gap-5 min-w-0">
      {/* 내보내기 */}
      {queue.length > 0 && (
        <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{isComplete ? '내보내기 → 이미지 생성 모델에 바로 붙여넣기' : `내보내기 → Ultra${isForm ? '에서 형태 생성' : '에 형태 첨부 + 붙여넣기'}`}</span>
          <button onClick={() => copy(allText, '__all__')} className="ml-auto text-[11px] font-bold px-4 py-2 rounded-lg text-black inline-flex items-center gap-1.5 hover:brightness-110" style={{ background: ACCENT }}>
            {copiedId === '__all__' ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 전체 복사</>}
          </button>
          <button onClick={() => downloadFile(allText, `${kind}-prompts_${Date.now()}.txt`, 'text/plain')} className="text-[11px] font-bold px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 inline-flex items-center gap-1.5"><Download size={13} /> .txt</button>
          <button onClick={() => downloadFile(JSON.stringify(queue.map((q) => ({ tags: q.tags, prompt: promptText(q) })), null, 2), `${kind}-prompts_${Date.now()}.json`, 'application/json')} className="text-[11px] font-bold px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 inline-flex items-center gap-1.5"><Download size={13} /> .json</button>
          <button onClick={() => { setQueue([]); setNote(''); setRenderResults({}); setRenderErrors({}); setRenderZoom({}); }} className="text-[11px] font-bold px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-rose-300 hover:border-rose-500/50 inline-flex items-center gap-1.5"><RotateCcw size={13} /> 비우기</button>
        </div>
      )}

      {/* 큐 리스트 */}
      {queue.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <Square size={28} className="mx-auto mb-3 text-zinc-800" />
          <div className="text-[12px] leading-relaxed">설정을 고르고 <span style={{ color: ACCENT }}>[선택 설정으로 생성]</span> 을 누르세요.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {queue.map((q, i) => (
            <div key={q.id} className="bg-[#141417] border border-zinc-800 rounded-xl p-4 grid grid-cols-1 gap-4">
              <div className="min-w-0 flex flex-col gap-3">
                {settingsDirty && <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-200/80">현재 프롬프트는 변경 전 설정입니다. 왼쪽의 반영 버튼을 눌러주세요.</div>}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-600 tabular-nums">#{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex flex-wrap gap-1">
                    {q.tags.map((t, ti) => (<span key={ti} className="text-[9px] font-bold text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.5">{t}</span>))}
                  </div>
                  {q.enriched && <span className="ml-auto text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full border" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>정제됨</span>}
                  <button onClick={() => copy(promptText(q), q.id)} className={`${q.enriched ? '' : 'ml-auto'} text-zinc-500 hover:text-white transition-colors shrink-0`} title="이 프롬프트 복사">
                    {copiedId === q.id ? <Check size={13} style={{ color: ACCENT }} /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">{promptText(q)}</p>
                {renderErrors[q.id] && <div className="text-[10px] text-rose-400">{renderErrors[q.id]}</div>}
              </div>
              <div className="min-w-0 rounded-lg border border-zinc-800 bg-black/50 p-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500">렌더 미리보기</span>
                  {renderResults[q.id]?.dataUrl && <span className="text-[9px] text-zinc-600">휠로 확대·축소 · {Math.round((renderZoom[q.id] || 1) * 100)}%</span>}
                  <div className="ml-auto flex gap-2">
                    {renderResults[q.id]?.dataUrl && <button onClick={() => downloadRendered(q)} className="text-[10px] font-bold px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 inline-flex items-center gap-1.5"><Download size={12} /> 원본</button>}
                    {renderResults[q.id]?.dataUrl && <button onClick={() => downloadTransparent(q)} disabled={!!transparentBusyId} className="text-[10px] font-bold px-3 py-1.5 rounded-md border border-emerald-500/40 text-emerald-300 inline-flex items-center gap-1.5 disabled:opacity-40">{transparentBusyId === q.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} 투명 PNG</button>}
                    {renderResults[q.id]?.dataUrl && <button onClick={() => sendToMaskForge(q)} className="text-[10px] font-bold px-3 py-1.5 rounded-md border border-fuchsia-500/40 text-fuchsia-300 inline-flex items-center gap-1.5"><ImageIcon size={12} /> Mask Forge</button>}
                    <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} title="렌더링 모델" className="max-w-36 bg-black/60 border border-zinc-700 rounded-md px-2 py-1.5 text-[9px] text-zinc-300 outline-none">
                      {IMAGEN_MODELS.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
                    </select>
                    <button onClick={() => renderPrompt(q)} disabled={!!renderingId}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 disabled:opacity-40" style={{ color:ACCENT, borderColor:`${ACCENT}55` }}>
                      {renderingId === q.id ? <><Loader2 size={12} className="animate-spin" /> 렌더링 중…</> : <><ImageIcon size={12} /> {renderResults[q.id] ? '다시 렌더링' : '바로 렌더링'}</>}
                    </button>
                  </div>
                </div>
                <div onWheel={(e) => {
                  if (!renderResults[q.id]?.dataUrl) return;
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 0.1 : -0.1;
                  setRenderZoom((prev) => ({ ...prev, [q.id]:Math.min(3, Math.max(0.5, (prev[q.id] || 1) + delta)) }));
                }} className="h-[clamp(240px,34vh,520px)] rounded-md border border-zinc-900 bg-black overflow-hidden flex items-center justify-center">
                  {renderResults[q.id]?.dataUrl ? <img onClick={() => setModalImage(renderResults[q.id].dataUrl)} src={renderResults[q.id].dataUrl} alt="렌더링된 프레임" draggable="false" title="클릭해서 크게 보기" className="max-w-full max-h-full object-contain transition-transform duration-100 select-none cursor-zoom-in" style={{ transform:`scale(${renderZoom[q.id] || 1})` }} /> : <div className="text-[10px] text-zinc-700 flex flex-col items-center gap-2"><ImageIcon size={24} />렌더링하면 여기에 표시됩니다</div>}
                </div>
                {renderResults[q.id]?.dataUrl && (
                  <div className="text-[9px] text-zinc-500">{savingIds[q.id] ? 'Prompt Arche · Frame Forge 렌더 폴더에 저장 중…' : user?.uid ? 'Prompt Arche · Frame Forge 렌더 폴더에 자동 저장됨' : '로그인하면 Prompt Arche 내 폴더에 자동 저장됩니다.'}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* 다음 단계 */}
      {isForm && queue.length > 0 && (
        <div className="flex justify-center">
          <button onClick={onNext} className="text-[11px] font-bold tracking-wider px-6 py-2.5 rounded-lg border inline-flex items-center gap-2 transition-colors" style={{ color: ACCENT, borderColor: `${ACCENT}66` }}>
            형태를 Ultra에서 만든 뒤 → 2단계 렌더링으로 <ArrowRight size={13} />
          </button>
        </div>
      )}
      {modalImage && (
        <div onClick={() => setModalImage(null)} className="fixed inset-0 z-[20000] bg-black/90 backdrop-blur-sm p-5 md:p-10 flex items-center justify-center cursor-zoom-out">
          <button onClick={() => setModalImage(null)} className="absolute top-5 right-5 w-10 h-10 rounded-full border border-white/20 bg-black/60 text-white text-xl">×</button>
          <img onClick={(e) => e.stopPropagation()} src={modalImage} alt="확대된 렌더링 결과" className="max-w-full max-h-full object-contain rounded-lg border border-white/10 shadow-2xl cursor-default" />
        </div>
      )}
    </div>
  );
}
