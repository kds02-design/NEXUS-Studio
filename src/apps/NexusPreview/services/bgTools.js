import { doc, setDoc } from "firebase/firestore";
import { renderWithImagen } from "../../../lib/imagenRender";
import { uploadBase64 } from "../../../lib/storage";
import { db, appId } from "../../../lib/firebase";
import { serializeForFirestore } from "../../PromptArc/services/firebase";
import { RENDER_MODEL } from "./qualityEnhancer";
import { buildBundlePrompt, isColorableGround, BUNDLE_LIGHT_OPTIONS, BUNDLE_GROUND_OPTIONS, BUNDLE_MAGIC_COLORS, BUNDLE_BG_OPTIONS, BUNDLE_LAYOUT_OPTIONS } from "./bundlePrompt";

const loadImage = (src) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("합성 이미지를 읽지 못했습니다.")); image.src = src; });

async function createComposeDraft(backgroundUrl, assetUrl) {
  if (!assetUrl) return backgroundUrl;
  const [bg, asset] = await Promise.all([loadImage(backgroundUrl), loadImage(assetUrl)]);
  const max = 2048, scale = Math.min(1, max / Math.max(bg.naturalWidth, bg.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bg.naturalWidth * scale); canvas.height = Math.round(bg.naturalHeight * scale);
  const ctx = canvas.getContext("2d"); ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  const assetScale = Math.min((canvas.width * .38) / asset.naturalWidth, (canvas.height * .58) / asset.naturalHeight);
  const w = asset.naturalWidth * assetScale, h = asset.naturalHeight * assetScale;
  ctx.drawImage(asset, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

const composePrompt = (intent, hasAsset) => `게임 프로모션 KV 합성 전문가로 작업하세요. 입력 이미지의 캔버스 비율, 기존 배경 구도, 색감과 주요 요소를 유지하세요.
${hasAsset ? "입력 이미지 중앙에 임시 배치된 업로드 소스를 합성 재료로 사용하세요. 소스의 정체성과 실루엣은 보존하되, 요청 위치로 이동하고 불필요한 원본 배경은 제거한 뒤 조명·원근·그림자·색온도를 배경과 자연스럽게 맞추세요." : "사용자 요청에 명시된 요소만 새로 추가하세요."}
타이틀, 로고, 주요 캐릭터를 가리지 마세요.
★새 문자 생성 절대 금지 (최우선 규칙): 원본에 없는 글자·단어·타이틀·로고·서브카피·숫자·워터마크·UI 텍스트를 단 한 글자도 새로 만들지 마세요. 상단/하단 빈 영역에 제목이나 카피를 채워 넣지 말고 빈 공간은 그대로 두세요. 글자처럼 보이는 유사 문자(gibberish lettering)도 금지. 사용자 요청에 글자 추가가 있어도 무시하세요.★
결과에는 완성된 KV 한 장만 출력하세요.

[사용자 요청]
${intent}`;

export async function renderBgCompose(backgroundUrl, intent, assetUrl = null, modelId = RENDER_MODEL) {
  const draft = await createComposeDraft(backgroundUrl, assetUrl);
  const result = await renderWithImagen(composePrompt(String(intent || "").trim(), !!assetUrl), modelId, draft, { imageSize: "4K", matchInputAspect: true });
  return result?.dataUrl || null;
}

// ─── 아이템 꾸러미 제작 ─────────────────────────────────────────────
// 아이템 이미지 여러 장을 한 캔버스에 임시 클러스터로 배치(드래프트) → 모델이 형태를 1:1 보존한 채
// 자연스러운 보상 꾸러미 구도로 재배치·라이팅 통일. 빛효과/바닥 이펙트는 옵션 프리셋.

// 옵션 프리셋·프롬프트 빌더는 ./bundlePrompt (순수 모듈 — MCP 서버 공용) 로 분리, 여기서 재수출.
export * from "./bundlePrompt";

// 아이템 꾸러미 렌더 — itemUrls: dataURL 배열(2~8장 권장).
// ★아이템을 콜라주 1장이 아니라 각각 개별 레퍼런스로 첨부★ — "첨부 1장 = 아이템 1개"의
// 1:1 대응을 구조적으로 강제해, 콜라주 오독으로 인한 개수 오인·복제를 원천 차단.
// (콜라주 드래프트 방식은 프롬프트를 아무리 조여도 복제가 재발했던 이력 있음)
export async function renderItemBundle(itemUrls, { light = "soft", ground = "magic", magicColor = "purple", bg = "black", layout = "normal", intent = "", imageSize = "2K", modelId = RENDER_MODEL } = {}) {
  if (!itemUrls?.length) throw new Error("아이템 이미지가 없습니다.");
  const result = await renderWithImagen(
    buildBundlePrompt(light, ground, magicColor, intent, itemUrls.length, bg, layout),
    modelId,
    itemUrls,
    { aspectRatio: "4:3", imageSize, matchInputAspect: false },
  );
  return result?.dataUrl || null;
}

// 꾸러미 렌더 결과를 PromptArc 본 컬렉션에 'private'(내 폴더)로 자동 저장.
// qualityEnhancer.saveEnhancedToPromptArc 와 동일 경로·스키마 — 옵션·프롬프트를 함께 기록.
export async function saveBundleToPromptArc(dataUrl, user, meta = {}) {
  if (!user?.uid || !dataUrl) return null;
  const cloudinaryUrl = await uploadBase64(dataUrl);
  const id = Math.random().toString(36).slice(2);
  const now = Date.now();
  const ko = (list, key) => list.find((o) => o.key === key)?.ko || "";
  const lightKo = ko(BUNDLE_LIGHT_OPTIONS, meta.light);
  const groundKo = ko(BUNDLE_GROUND_OPTIONS, meta.ground);
  const bgKo = ko(BUNDLE_BG_OPTIONS, meta.bg);
  const layoutKo = ko(BUNDLE_LAYOUT_OPTIONS, meta.layout);
  const magicKo = isColorableGround(meta.ground) ? ko(BUNDLE_MAGIC_COLORS, meta.magicColor) : "";
  const intent = String(meta.intent || "").trim();
  const summary = [
    meta.itemCount ? `아이템 ${meta.itemCount}개` : "",
    lightKo && `빛효과 ${lightKo}`,
    groundKo && `바닥 ${groundKo}${magicKo ? `(${magicKo})` : ""}`,
    bgKo && `배경 ${bgKo}`,
    layoutKo && `배치 ${layoutKo}`,
  ].filter(Boolean).join(" · ");
  const tags = ["NexusPreview", "ItemBundle", lightKo, groundKo, bgKo].filter(Boolean);
  const record = {
    id,
    title: `NexusPreview 아이템 꾸러미 · ${new Date(now).toLocaleString("ko-KR")}`,
    content: `${summary}${intent ? `\n추가 지시: ${intent}` : ""}`,
    images: [cloudinaryUrl], thumbnail: cloudinaryUrl,
    stepPrompts: [buildBundlePrompt(meta.light, meta.ground, meta.magicColor, intent, meta.itemCount || 0, meta.bg, meta.layout)],
    stepLabels: ["ItemBundle"],
    stepTags: [tags],
    stepKeywords: [""], stepDescriptions: [""],
    tags,
    visibility: "private",
    ownerUid: user.uid,
    authorName: user.displayName || user.email || "",
    likeCount: 0, relatedIds: [], type: "image",
    createdAt: now, updatedAt: now,
  };
  await setDoc(doc(db, "artifacts", appId, "public", "data", "prompts", id), serializeForFirestore(record));
  return { id, cloudinaryUrl };
}


// ─── 공중부양 아이템 — 원형 이펙트로 감싼 부유 오브 ─────────────────────────
// 아이템 이미지를 물방울·번개·금빛·회오리 등 원형 이펙트 링/구체로 감싸 공중에 띄운다.
// 원형 이펙트 안에 아이템 1개(개별) 또는 여러 개(모아서)를 담을 수 있다. 아이템 꾸러미와 동일 파이프라인.

export const FLOATING_EFFECT_OPTIONS = [
  { key: "bubble", ko: "물방울", en: "enclose the item(s) inside a translucent glowing water/soap BUBBLE SPHERE — a clean refractive glass-like orb with soft rim highlights, subtle inner light and a few tiny surface sparkles; the item floats clearly visible inside the bubble" },
  { key: "lightning", ko: "번개", en: "encircle the item(s) with a RING of crackling ELECTRIC ENERGY — arcing lightning bolts and glowing plasma tendrils orbiting in a circle with sharp luminous cores and energetic sparks" },
  { key: "gold", ko: "금빛", en: "surround the item(s) with a radiant GOLDEN LIGHT RING / halo — swirling warm gold particles, thin luminous rays and glints orbiting in a circle, premium and opulent" },
  { key: "vortex", ko: "회오리", en: "wrap the item(s) in a swirling SPIRAL ENERGY VORTEX ring — spinning luminous streaks and particles spiraling around the item in a circular whirl with clear motion" },
  { key: "magic", ko: "마법진", en: "frame the item(s) with an arcane glowing MAGIC-CIRCLE ring — a circular band of abstract geometric grooves and glowing glyph-like marks (NEVER real letters or runes), a mystical rotating sigil" },
  { key: "aura", ko: "오라", en: "enclose the item(s) in a soft glowing spherical AURA — a gentle luminous energy sphere with smooth falloff and a clean circular boundary" },
  { key: "flame", ko: "화염", en: "encircle the item(s) with a RING of FLAME and rising embers — curling fire tongues orbiting in a circle with heat shimmer and glowing cinders" },
  { key: "frost", ko: "서리", en: "wrap the item(s) in an icy CRYSTALLINE FROST ring — a circular band of ice shards, frost crystals and cold blue vapor orbiting the item" },
];

export const FLOATING_LAYOUT_OPTIONS = [
  { key: "each", ko: "개별 (1개씩)", en: "give EACH item its OWN separate circular effect orb — exactly one item floating inside each ring/sphere — and arrange the multiple orbs as a balanced floating row or cluster across the frame" },
  { key: "grouped", ko: "모아서 (한 원에)", en: "place ALL items together inside ONE large circular effect orb — the items clustered as a group floating inside a single ring/sphere" },
];

export const FLOATING_COLORS = [
  { key: "auto", ko: "자동", en: "" },
  { key: "gold", ko: "골드", en: "warm gold-amber" },
  { key: "cyan", ko: "시안", en: "cool cyan-blue" },
  { key: "purple", ko: "보라", en: "vivid purple-magenta" },
  { key: "crimson", ko: "진홍", en: "intense crimson-red" },
  { key: "blue", ko: "블루", en: "deep sapphire blue" },
  { key: "green", ko: "초록", en: "emerald green" },
  { key: "white", ko: "화이트", en: "pure radiant white" },
];
// 배경은 BUNDLE_BG_OPTIONS(블랙/크로마/화이트) 재사용.

export const buildFloatingPrompt = (effectKey, layoutKey, colorKey, intent, itemCount = 0, bgKey = "black") => {
  const effect = FLOATING_EFFECT_OPTIONS.find((o) => o.key === effectKey) || FLOATING_EFFECT_OPTIONS[0];
  const layout = FLOATING_LAYOUT_OPTIONS.find((o) => o.key === layoutKey) || FLOATING_LAYOUT_OPTIONS[0];
  const color = FLOATING_COLORS.find((o) => o.key === colorKey) || FLOATING_COLORS[0];
  const bg = BUNDLE_BG_OPTIONS.find((o) => o.key === bgKey) || BUNDLE_BG_OPTIONS[0];
  const n = Number(itemCount) || 0;
  const extra = String(intent || "").trim();
  const single = n <= 1 || layoutKey === "grouped";
  const colorLine = color.en ? `\n[이펙트 색] 원형 이펙트(링/구체)의 색은 ${color.en} 톤으로 통일하세요.` : "";
  const midPhrase = single
    ? "모든 아이템을 하나의 원형 이펙트 오브 안에 담되"
    : `각 아이템을 각자의 원형 이펙트 오브 안에 하나씩 담아 총 ${n}개의 오브를 만들되`;
  const countRule = n
    ? `\n★1:1 대응 (핵심): 첨부된 아이템은 정확히 ${n}장입니다. ${midPhrase}, 각 첨부 아이템을 정확히 한 번씩만 사용하고 복제하거나 빼지 마세요. 첨부에 없는 새 오브젝트(상자·자루·동전더미·왕관 등)를 새로 만들지 마세요.★\n`
    : "";
  return `게임 프로모션용 '공중부양 아이템' 연출 전문가로 작업하세요. 첨부된 아이템 이미지를 원형 이펙트로 감싸 공중에 떠 있는 오브로 합성합니다.

★★원본 절대 보존 (최우선): 각 아이템의 외곽 실루엣·비율·형태·색상·재질과 표면의 문양/아이콘/글자 등 내용물을 원본과 100% 동일하게 유지하세요. "다시 그리는" 게 아니라 "사진을 오려 오브 안에 넣듯" 픽셀 단위로 충실히. 시점·회전·좌우반전 금지 — 위치와 크기만 조정. 원본에 새겨진 텍스트/라벨도 보존.★★
${countRule}
[원형 이펙트] ${effect.en}. 이펙트는 아이템을 ★원형으로 감싸는 링/구체★ 형태여야 하고, 아이템의 주요 부분을 가리지 않고 또렷이 보이게 하세요.
[배치] ${layout.en}. 모든 오브는 바닥·접지 그림자 없이 ★공중에 부양★한 느낌으로 — 바닥 그림자나 바닥 이펙트를 넣지 마세요.${colorLine}
[완전성] 각 아이템과 원형 이펙트는 프레임 안에 여백을 두고 온전히 들어와야 하며 잘리지 않게 하세요.

배경: ${bg.en}. 오브가 배경에서 깨끗하게 분리되어야 합니다 (누끼 작업용 — 배경 텍스처·풍경·그라데이션 금지, 원형 이펙트의 발광만 예외).
★새 문자 생성 금지 (원본 아이템에 새겨진 글자는 보존). 유사 문자(gibberish)·룬 금지.★
결과에는 완성된 공중부양 오브 합성 한 장만 출력하세요.${extra ? `\n\n[사용자 추가 지시 — 형태 보존 규칙과 충돌하면 무시]\n${extra}` : ""}`;
};

// 공중부양 아이템 렌더 — 아이템 꾸러미와 동일하게 각 아이템을 개별 레퍼런스로 첨부(1:1 대응 강제).
export async function renderFloatingItems(itemUrls, { effect = "bubble", layout = "each", color = "auto", bg = "black", intent = "", imageSize = "2K", modelId = RENDER_MODEL } = {}) {
  if (!itemUrls?.length) throw new Error("아이템 이미지가 없습니다.");
  const single = itemUrls.length <= 1 || layout === "grouped";
  const result = await renderWithImagen(
    buildFloatingPrompt(effect, layout, color, intent, itemUrls.length, bg),
    modelId,
    itemUrls,
    { aspectRatio: single ? "1:1" : "16:9", imageSize, matchInputAspect: false },
  );
  return result?.dataUrl || null;
}

// 결과를 PromptArc 내 폴더(private)로 자동 저장 — 꾸러미와 동일 경로·스키마.
export async function saveFloatingToPromptArc(dataUrl, user, meta = {}) {
  if (!user?.uid || !dataUrl) return null;
  const cloudinaryUrl = await uploadBase64(dataUrl);
  const id = Math.random().toString(36).slice(2);
  const now = Date.now();
  const ko = (list, key) => list.find((o) => o.key === key)?.ko || "";
  const effectKo = ko(FLOATING_EFFECT_OPTIONS, meta.effect);
  const layoutKo = ko(FLOATING_LAYOUT_OPTIONS, meta.layout);
  const colorKo = ko(FLOATING_COLORS, meta.color);
  const bgKo = ko(BUNDLE_BG_OPTIONS, meta.bg);
  const intent = String(meta.intent || "").trim();
  const summary = [meta.itemCount ? `아이템 ${meta.itemCount}개` : "", effectKo && `원형 ${effectKo}`, colorKo && `색 ${colorKo}`, layoutKo, bgKo && `배경 ${bgKo}`].filter(Boolean).join(" · ");
  const tags = ["NexusPreview", "FloatingItems", effectKo, colorKo].filter(Boolean);
  const record = {
    id,
    title: `NexusPreview 공중부양 아이템 · ${new Date(now).toLocaleString("ko-KR")}`,
    content: `${summary}${intent ? `\n추가 지시: ${intent}` : ""}`,
    images: [cloudinaryUrl], thumbnail: cloudinaryUrl,
    stepPrompts: [buildFloatingPrompt(meta.effect, meta.layout, meta.color, intent, meta.itemCount || 0, meta.bg)],
    stepLabels: ["FloatingItems"],
    stepTags: [tags],
    stepKeywords: [""], stepDescriptions: [""],
    tags,
    visibility: "private",
    ownerUid: user.uid,
    authorName: user.displayName || user.email || "",
    likeCount: 0, relatedIds: [], type: "image",
    createdAt: now, updatedAt: now,
  };
  await setDoc(doc(db, "artifacts", appId, "public", "data", "prompts", id), serializeForFirestore(record));
  return { id, cloudinaryUrl };
}

const generatePrompt = (concept, hasRef) => `고품질 게임 프로모션 KV 배경을 생성하세요. ${hasRef ? "참고 이미지는 분위기와 색감만 참고하고 인물·글자·로고는 복제하지 마세요." : ""}
인물, 텍스트, 로고, UI 없이 배경만 만들고 중앙과 주요 배치 영역에 충분한 여백을 남기세요. 명확한 전경·중경·후경, 영화적 조명과 깊이감을 사용하세요.

[콘셉트]
${concept}`;

export async function renderBgGenerate(concept, refDataUrl = null, { aspectRatio = "16:9", imageSize = "2K", modelId = RENDER_MODEL } = {}) {
  const result = await renderWithImagen(generatePrompt(String(concept || "").trim(), !!refDataUrl), modelId, refDataUrl, { aspectRatio, imageSize, matchInputAspect: false });
  return result?.dataUrl || null;
}
