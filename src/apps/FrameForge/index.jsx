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
// 완성형 옵션 축·프롬프트 빌더·브랜드웹 키트는 React 없는 frameforgeAxes.js 로 분리 — 앱·MCP 브릿지·스킬 런타임이 한 파일을 본다.
import { COMPLETE_AXES, COMPLETE_RANDOM, SIMPLE_MOODS, SIMPLE_RENDER_STYLES, BRANDWEB_KITS, buildCompletePrompt, buildKitSeeds, seedAspectRatio } from './frameforgeAxes';

const ACCENT = APP_MAP['frame-forge']?.color || '#4BCFFA';
const OPTION_ACTIVE = {
  background:'rgba(75,207,250,0.16)',
  borderColor:'rgba(75,207,250,0.28)',
  color:'#C9F3FF',
};
const THEME_COLOR = APP_MAP['theme-forge']?.color || '#FF9F1C';
const FORM_STORAGE = 'frame-forge:form';
const MAT_STORAGE = 'frame-forge:material';
const COMPLETE_STORAGE = 'frame-forge:complete';
const COMPLETE_SETTINGS_STORAGE = 'frame-forge:complete-settings:v1';
const BATCH_OPTIONS = [8, 16, 32];
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

function defaultCompleteSelection(axes) {
  const initial = Object.fromEntries(Object.entries(axes).map(([key, axis]) => [key, axis.opts[0]]));
  initial.preset = axes.preset.opts.find((o) => o.key === 'black_thorn') || initial.preset;
  initial.material = axes.material.opts.find((o) => o.ko === '전투로 단련된 흑철') || initial.material;
  initial.ornament = axes.ornament.opts.find((o) => o.ko === '절제된 테두리') || initial.ornament;
  initial.renderStyle = axes.renderStyle.opts.find((o) => o.key === 'illustrated') || initial.renderStyle;
  return initial;
}

function restoreCompleteSettings(axes) {
  const fallback = defaultCompleteSelection(axes);
  try {
    const saved = JSON.parse(localStorage.getItem(COMPLETE_SETTINGS_STORAGE) || 'null');
    if (!saved?.selection) return { selection:fallback, userIntent:'', simpleMood:'dark_rpg', iconCreative:false, kitKey:null };
    const selection = { ...fallback };
    for (const [axisKey, savedId] of Object.entries(saved.selection)) {
      const axis = axes[axisKey];
      if (!axis) continue;
      selection[axisKey] = axis.opts.find((o) => (o.key || o.ko) === savedId) || selection[axisKey];
    }
    const validShape = axes.silhouette.opts.some((o) => o === selection.silhouette && (!o.for || o.for.includes(selection.assetType.key)));
    if (!validShape) selection.silhouette = axes.silhouette.opts.find((o) => !o.for || o.for.includes(selection.assetType.key));
    return {
      selection,
      userIntent:typeof saved.userIntent === 'string' ? saved.userIntent : '',
      simpleMood:SIMPLE_MOODS.some((o) => o.key === saved.simpleMood) ? saved.simpleMood : '',
      iconCreative:!!saved.iconCreative,
      kitKey:BRANDWEB_KITS.some((k) => k.key === saved.kitKey) ? saved.kitKey : null,
    };
  } catch {
    return { selection:fallback, userIntent:'', simpleMood:'dark_rpg', iconCreative:false, kitKey:null };
  }
}

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

// ─── 완성형 축·프롬프트 빌더·브랜드웹 키트는 frameforgeAxes.js 참조 ──────────
// ─── 2단계(형태/재질) 프롬프트 빌더 — UI 미노출, 저장 데이터 호환용 ────────────
function buildFormPrompt(seed) {
  return `Flat structural design of ${seed.component.en} for a game promotion UI. Silhouette: ${seed.silhouette.en}. ${seed.corner.en}. Internal layout: ${seed.slot.en}. Ornament: ${seed.ornament.en}. Proportion: ${seed.proportion.en}. Render as a CLEAN FLAT greyscale line/vector shape — geometry and outline only, NO material, NO color, NO lighting, NO texture. Isolated on a plain neutral background, front orthographic view, crisp edges, centered with generous padding. This is a base FORM to be textured in a later pass.`;
}
function buildMatPrompt(seed) {
  return `Using the ATTACHED flat form image as the exact structural base, apply material and lighting WITHOUT changing its shape, proportions, corners or internal layout. Material: ${seed.material.en}. Color palette: ${seed.palette.en}. Lighting: ${seed.lighting.en}. Finish: ${seed.finish.en}. Mood: ${seed.mood.en}. Preserve the crisp silhouette and clean alpha edges. Isolated on a transparent or flat dark background, front orthographic view, high detail, production-ready game UI, 4k. No text, no watermark.`;
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
    <div className="flex flex-col h-full w-full bg-[#101113] text-zinc-100 overflow-hidden font-sans">
      {usageModal}
      <style>{`
        .ff-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .ff-scroll::-webkit-scrollbar-track { background: transparent; }
        .ff-scroll::-webkit-scrollbar-thumb { background: rgba(75,207,250,0.25); border-radius: 5px; }
        .ff-scroll:hover::-webkit-scrollbar-thumb { background: rgba(75,207,250,0.5); }
        .ff-step { padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .ff-step:first-child { padding-top: 4px; }
        .ff-step:last-child { border-bottom: 0; }
        .ff-subtle-button { background: rgba(255,255,255,0.025); }
        .ff-subtle-button:hover { background: rgba(255,255,255,0.055); }
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
  const restoredComplete = useMemo(() => isComplete ? restoreCompleteSettings(axes) : null, [isComplete, axes]);
  const [userIntent, setUserIntent] = useState(() => restoredComplete?.userIntent || '');
  const [simpleMood, setSimpleMood] = useState(() => restoredComplete?.simpleMood || 'dark_rpg');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(true);
  const [completeSelection, setCompleteSelection] = useState(() => restoredComplete?.selection || Object.fromEntries(Object.entries(axes).map(([key, axis]) => [key, axis.opts[0]])));

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(queue)); } catch { /* quota */ }
  }, [queue, storageKey]);

  // 아이콘 창의적 재해석 토글 — 아이콘일 때만 의미. buildCompletePrompt 에 opts 로 전달.
  const [iconCreative, setIconCreative] = useState(() => restoredComplete?.iconCreative || false);
  // 브랜드웹 키트 모드 — 키트를 고르면 스타일 축(프리셋·재질·장식·굵기·내부·렌더)은 공유하고 용도·형태는 키트 항목별로 정해진다.
  const [kitKey, setKitKey] = useState(() => restoredComplete?.kitKey || null);
  const [batchBusy, setBatchBusy] = useState(false);
  const activeKit = kitKey ? BRANDWEB_KITS.find((k) => k.key === kitKey) || null : null;

  useEffect(() => {
    if (!isComplete) return;
    const selection = Object.fromEntries(Object.entries(completeSelection).map(([key, value]) => [key, value?.key || value?.ko]));
    try { localStorage.setItem(COMPLETE_SETTINGS_STORAGE, JSON.stringify({ selection, userIntent, simpleMood, iconCreative, kitKey })); } catch { /* quota */ }
  }, [isComplete, completeSelection, userIntent, simpleMood, iconCreative, kitKey]);

  // 완성형 — 옵션/의도 변경 시 우측 프롬프트 실시간 갱신 (반영 버튼 없이도 즉시 반영).
  // buildPrompt(=buildCompletePrompt)·axes 는 안정적 참조라 사용자 액션에만 재실행된다.
  // 단일 부품이면 현재 선택 1건, 키트면 스타일 축을 공유한 항목 N건.
  const makeCompleteQueue = useCallback(() => {
    const seed = completeSelection;
    if (activeKit) {
      const { preset, material, ornament, frameWeight, interior, renderStyle } = seed;
      return buildKitSeeds(activeKit, { preset, material, ornament, frameWeight, interior, renderStyle }, { userIntent, iconCreative });
    }
    const tags = Object.keys(axes).map((key) => seed[key]?.ko).filter(Boolean);
    return [{ id:'live', seed, tags, enriched:null, prompt:buildPrompt(seed, userIntent, { iconCreative }) }];
  }, [completeSelection, activeKit, userIntent, iconCreative, axes, buildPrompt]);
  useEffect(() => {
    if (!isComplete) return;
    setQueue(makeCompleteQueue());
    setSettingsDirty(false);
  }, [isComplete, makeCompleteQueue]);

  const togglePick = (key) => setPickKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const randomizeComplete = () => {
    setSimpleMood('');
    setSettingsDirty(true);
    setCompleteSelection((prev) => {
      const candidates = axes.silhouette.opts.filter((shape) => !shape.for || shape.for.includes(prev.assetType.key));
      return { ...prev,
        silhouette:rnd(candidates), preset:rnd(axes.preset.opts), frameWeight:rnd(axes.frameWeight.opts),
        material:rnd(axes.material.opts), interior:rnd(axes.interior.opts), ornament:rnd(axes.ornament.opts),
      };
    });
    setNote('용도와 표현 방식은 유지하고 형태·스타일·재질을 새로 조합했습니다.');
  };

  const resetComplete = () => {
    setCompleteSelection(defaultCompleteSelection(axes));
    setUserIntent(''); setSimpleMood('dark_rpg'); setIconCreative(false); setAdvancedOpen(false);
    setNote('기본 추천 설정으로 복원했습니다.');
  };

  const handleGenerate = useCallback(() => {
    if (isComplete) {
      // 실시간 useEffect 가 큐를 최신으로 유지 — 버튼은 정제(enriched) 초기화 겸 재생성용.
      setQueue(makeCompleteQueue());
      setNote(activeKit ? `${activeKit.ko} ${activeKit.items.length}종 프롬프트를 새로 만들었습니다.` : '현재 설정으로 프롬프트를 새로 만들었습니다.');
      setSettingsDirty(false);
      return;
    }
    const keys = pickKeys.length ? pickKeys : pickAxis.opts.map((o) => o.key).filter(Boolean);
    const seeds = generateSeeds(batch, axes, randomKeys, keys).map((s) => ({ ...s, prompt: buildPrompt(s.seed) }));
    setQueue(seeds);
    setNote(`${seeds.length}개 ${isForm ? '형태' : isComplete ? '완성형 프레임' : '렌더링'} 프롬프트 생성 (무료).`);
  }, [batch, pickKeys, axes, randomKeys, pickAxis, buildPrompt, isForm, isComplete, activeKit, makeCompleteQueue]);

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
  // 반환값: false = 크레딧 게이트에서 막힘(배치 렌더 중단용), true = 시도 완료(성공/실패 무관).
  const renderPrompt = async (q) => {
    if (renderingId) return true;
    if (!(await ensureCanGenerate('image'))) return false;
    setRenderingId(q.id);
    setRenderErrors((prev) => ({ ...prev, [q.id]: '' }));
    try {
      // 실루엣별 캔버스 비율 — 가로 버튼·디바이더·장식 라인은 21:9, 세로 카드는 3:4 등. (예전엔 전부 1:1)
      const result = await renderWithImagen(promptText(q), selectedModel, null, { aspectRatio: seedAspectRatio(q.seed) });
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
    return true;
  };
  // 키트 전체 렌더 — 큐를 순서대로 1장씩. 이미 렌더된 항목은 건너뛰고, 크레딧이 막히면 중단.
  const renderAllQueued = async () => {
    if (batchBusy || renderingId || !queue.length) return;
    setBatchBusy(true);
    const done = { ...renderResults };
    try {
      for (const q of queue) {
        if (done[q.id]?.dataUrl) continue;
        const ok = await renderPrompt(q);
        if (ok === false) { setNote('크레딧이 부족해 전체 렌더를 중단했습니다.'); break; }
      }
    } finally {
      setBatchBusy(false);
    }
  };
  // 일반(원본) 저장 — 생성 배경 그대로. 투명 저장은 옆의 '투명 PNG' 버튼으로 선택.
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
      <div className="lg:col-span-2 border-b border-zinc-800 px-1 pb-4 flex items-start gap-2.5 text-[11px] leading-relaxed">
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
      <div className="min-w-0 lg:pr-5 lg:border-r lg:border-zinc-800 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: ACCENT }} />
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{isForm ? '형태 시드' : isComplete ? '완성형 프레임 시드' : '렌더링 시드'}</span>
        </div>

        {/* 완성형은 모든 축을 사용자가 직접 선택. 기존 2단계는 대표축만 선택. */}
        {isComplete ? (
          <div className="flex flex-col gap-3">
            <div className="ff-step">
              <div className="text-[12px] font-black text-zinc-200 mb-1">1. 무엇을 만들까요?</div>
              <div className="text-[10px] text-zinc-600 mb-3">필요한 UI 종류를 하나 골라주세요.</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {axes.assetType.opts.map((option) => {
                  const on = completeSelection.assetType === option;
                  return <button key={option.key} onClick={() => { setSettingsDirty(true); setCompleteSelection((prev) => {
                    const firstShape = axes.silhouette.opts.find((shape) => !shape.for || shape.for.includes(option.key));
                    return { ...prev, assetType:option, silhouette:firstShape || prev.silhouette };
                  }); }} className={`py-2.5 rounded-lg border text-[11px] font-bold ${on ? '' : 'text-zinc-400 border-zinc-700'}`} style={on ? OPTION_ACTIVE : undefined}>{option.ko}</button>;
                })}
              </div>
            </div>
            <div className="ff-step">
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
            <div className="ff-step">
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
            <div className="ff-step">
              <div className="text-[12px] font-black text-zinc-200 mb-1">4. 브랜드웹 한 벌로 만들까요?</div>
              <div className="text-[10px] text-zinc-600 mb-3">키트를 고르면 같은 분위기·재질로 부품 세트를 한 번에 큐로 만듭니다. 용도·형태는 키트가 항목별로 정합니다.</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setSettingsDirty(true); setKitKey(null); }} className={`px-3 py-2 rounded-lg border text-[10px] font-bold ${!kitKey ? '' : 'text-zinc-400 border-zinc-700'}`} style={!kitKey ? OPTION_ACTIVE : undefined}>단일 부품</button>
                {BRANDWEB_KITS.map((kit) => (
                  <button key={kit.key} onClick={() => { setSettingsDirty(true); setKitKey(kit.key); }} title={kit.desc} className={`px-3 py-2 rounded-lg border text-[10px] font-bold ${kitKey === kit.key ? '' : 'text-zinc-400 border-zinc-700'}`} style={kitKey === kit.key ? OPTION_ACTIVE : undefined}>{kit.ko} · {kit.items.length}종</button>
                ))}
              </div>
              {activeKit && <div className="mt-2 text-[9px] leading-relaxed text-zinc-500">{activeKit.desc}</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-black/20 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black text-zinc-300">현재 조합{activeKit ? ` · ${activeKit.ko}` : ''}</div>
                <div className="mt-1 text-[9px] leading-relaxed text-zinc-500">
                  {activeKit ? `${activeKit.items.length}종 공통 스타일: ` : `${completeSelection.silhouette?.ko} · `}{completeSelection.preset?.ko} · {completeSelection.material?.ko} · {completeSelection.interior?.ko}
                </div>
              </div>
              <button onClick={randomizeComplete} className="text-[10px] font-bold px-3 py-2 rounded-lg border inline-flex items-center gap-1.5 hover:brightness-110" style={{ color:ACCENT, borderColor:`${ACCENT}55` }} title="사용 용도와 렌더 표현은 유지합니다">
                <Shuffle size={12} /> 안전 랜덤 변형
              </button>
              <button onClick={resetComplete} className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 inline-flex items-center gap-1.5 hover:text-white">
                <RotateCcw size={12} /> 기본값
              </button>
            </div>
            {/* 아이콘 전용 — 창의적 재해석 토글. 일률적인 글리프 대신 게임풍으로 자유롭게 변형. */}
            {completeSelection.assetType?.key === 'icon' && (
              <button
                onClick={() => setIconCreative((v) => !v)}
                className={`ff-step flex items-center justify-between text-left rounded-lg px-3 py-2.5 transition-colors ${iconCreative ? '' : 'border border-zinc-700'}`}
                style={iconCreative ? OPTION_ACTIVE : undefined}
              >
                <span>
                  <span className="text-[11px] font-black block">✨ 창의적 아이콘 {iconCreative ? 'ON' : 'OFF'}</span>
                  <span className="text-[9px] opacity-70">일률적인 모양 대신 게임풍으로 개성 있게 재해석해요</span>
                </span>
                <span className={`w-8 h-4 rounded-full p-0.5 flex items-center shrink-0 ${iconCreative ? 'bg-black/30' : 'bg-zinc-700'}`}>
                  <span className={`w-3 h-3 rounded-full bg-white transition-transform ${iconCreative ? 'translate-x-4' : ''}`} />
                </span>
              </button>
            )}
            <button onClick={() => setAdvancedOpen((open) => !open)} className="ff-subtle-button w-full flex items-center justify-between rounded-lg px-3 py-3 text-[11px] font-bold text-zinc-400 hover:text-white">
              <span>세부 설정 직접 하기</span><span>{advancedOpen ? '접기 −' : '열기 +'}</span>
            </button>
            {advancedOpen && <div className="flex flex-col gap-3 border-l-2 pl-3" style={{ borderColor:`${ACCENT}55` }}>
              {Object.entries(axes).filter(([key]) => key !== 'assetType').map(([key, axis]) => (
                <div key={key} className="py-3 border-b border-zinc-800/80 last:border-0">
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
            className="text-[11px] font-bold tracking-wider px-6 py-2.5 rounded-lg inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110"
            style={isComplete && !settingsDirty
              ? { background:'rgba(255,255,255,0.08)', color:'#A1A1AA' }
              : { background:ACCENT, color:'#071216' }}>
            <Shuffle size={13} /> {isComplete ? '프롬프트 새로 만들기' : '큐 생성 (무료)'}
          </button>
          <button onClick={handleEnrich} disabled={!queue.length || enriching}
            title="큐 전체를 한 번의 Gemini 호출로 다듬음 (analysis 1c)"
            className="text-[11px] font-bold tracking-wider px-5 py-2.5 rounded-lg border inline-flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: ACCENT, borderColor: `${ACCENT}66` }}>
            {enriching ? <><Loader2 size={13} className="animate-spin" /> 정제 중…</> : <><Wand2 size={13} /> Gemini로 문장 정제</>}
          </button>
        </div>

        {note && <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-3">{note}</div>}
        {isComplete && <div className="text-[10px] border-l-2 border-emerald-400/50 pl-3 py-1 text-emerald-200/70">옵션을 바꾸면 오른쪽 프롬프트에 실시간으로 반영됩니다.</div>}
      </div>

      {/* 우측 · 내보내기 + 프롬프트 + 렌더 */}
      <div className="flex flex-col gap-5 min-w-0">
      {/* 내보내기 */}
      {queue.length > 0 && (
        <div className="border-b border-zinc-800 pb-3 flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{isComplete ? '내보내기 → 이미지 생성 모델에 바로 붙여넣기' : `내보내기 → Ultra${isForm ? '에서 형태 생성' : '에 형태 첨부 + 붙여넣기'}`}</span>
          {isComplete && queue.length > 1 && (
            <button onClick={renderAllQueued} disabled={batchBusy || !!renderingId} title={`큐 ${queue.length}장을 순서대로 렌더 (이미지 크레딧 10c × ${queue.length})`} className="ml-auto text-[11px] font-bold px-4 py-2 rounded-lg border inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50" style={{ color: ACCENT, borderColor: `${ACCENT}66` }}>
              {batchBusy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} 키트 전체 렌더 ({queue.length}장)
            </button>
          )}
          <button onClick={() => copy(allText, '__all__')} className={`${isComplete && queue.length > 1 ? '' : 'ml-auto'} text-[11px] font-bold px-4 py-2 rounded-lg text-black inline-flex items-center gap-1.5 hover:brightness-110`} style={{ background: ACCENT }}>
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
            <div key={q.id} className="grid grid-cols-1 gap-4">
              <div className="min-w-0 flex flex-col gap-3">
                {settingsDirty && <div className="border-l-2 border-amber-400/60 pl-3 py-1 text-[10px] text-amber-200/80">현재 프롬프트는 변경 전 설정입니다. 왼쪽의 반영 버튼을 눌러주세요.</div>}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-600 tabular-nums">#{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex flex-wrap gap-1">
                    {q.tags.map((t, ti) => (<span key={ti} className="text-[9px] font-bold text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.5">{t}</span>))}
                    {isComplete && q.seed && <span className="text-[9px] font-mono text-zinc-600 border border-zinc-800/60 rounded px-1.5 py-0.5" title="렌더 캔버스 비율">{seedAspectRatio(q.seed)}</span>}
                  </div>
                  {q.enriched && <span className="ml-auto text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full border" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>정제됨</span>}
                  <button onClick={() => copy(promptText(q), q.id)} className={`${q.enriched ? '' : 'ml-auto'} text-zinc-500 hover:text-white transition-colors shrink-0`} title="이 프롬프트 복사">
                    {copiedId === q.id ? <Check size={13} style={{ color: ACCENT }} /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">{promptText(q)}</p>
                {renderErrors[q.id] && <div className="text-[10px] text-rose-400">{renderErrors[q.id]}</div>}
              </div>
              <div className="min-w-0 pt-3 border-t border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500">렌더 미리보기</span>
                  {renderResults[q.id]?.dataUrl && <span className="text-[9px] text-zinc-600">휠로 확대·축소 · {Math.round((renderZoom[q.id] || 1) * 100)}%</span>}
                  <div className="ml-auto flex flex-wrap justify-end gap-2">
                    {renderResults[q.id]?.dataUrl && <button onClick={() => downloadRendered(q)} title="일반 PNG 저장 (생성 배경 포함)" className="text-[10px] font-bold px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 inline-flex items-center gap-1.5"><Download size={12} /> 원본</button>}
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
