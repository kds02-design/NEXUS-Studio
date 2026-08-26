import { doc, setDoc } from "firebase/firestore";
import { renderWithImagen } from "../../../lib/imagenRender";
import { uploadBase64 } from "../../../lib/storage";
import { db, appId } from "../../../lib/firebase";
import { serializeForFirestore } from "../../PromptArc/services/firebase";
import { colorKeyToTransparentPng } from "../../../lib/colorKeyExtract";
import { effectToTransparentPng } from "../../../lib/effectExtract";
import { RENDER_MODEL } from "./qualityEnhancer";
import { buildBundlePrompt, isColorableGround, BUNDLE_LIGHT_OPTIONS, BUNDLE_GROUND_OPTIONS, BUNDLE_MAGIC_COLORS, BUNDLE_BG_OPTIONS, BUNDLE_LAYOUT_OPTIONS } from "./bundlePrompt";
import {
  buildFloatingPrompt,
  buildFloatingRepairPrompt,
  buildFloatingSeparationPrompt,
  FLOATING_OUTPUT_OPTIONS, FLOATING_EFFECT_OPTIONS, FLOATING_FORM_OPTIONS,
  FLOATING_LAYOUT_OPTIONS, FLOATING_GROUP_OPTIONS, FLOATING_COLORS, FLOATING_INTENSITY_OPTIONS,
  FLOATING_MOTION_OPTIONS, FLOATING_DENSITY_OPTIONS,
  resolveFloatingGroupPlan,
} from "./floatingPrompt";

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

export {
  buildFloatingPrompt,
  buildFloatingRepairPrompt,
  buildFloatingSeparationPrompt,
  FLOATING_OUTPUT_OPTIONS, FLOATING_EFFECT_OPTIONS, FLOATING_FORM_OPTIONS,
  FLOATING_LAYOUT_OPTIONS, FLOATING_GROUP_OPTIONS, FLOATING_COLORS, FLOATING_INTENSITY_OPTIONS,
  FLOATING_MOTION_OPTIONS, FLOATING_DENSITY_OPTIONS,
  resolveFloatingGroupPlan,
};

// 공중부양 아이템 렌더 — 아이템 꾸러미와 동일하게 각 아이템을 개별 레퍼런스로 첨부(1:1 대응 강제).
export async function renderFloatingItems(itemUrls, {
  effect = "bubble", form = "broken-orbit", layout = "each", color = "auto",
  intensity = "medium", motion = "clockwise", density = "medium",
  outputMode = "composite", opening = 25, frontCross = 10,
  groupMode = "auto", groupAssignments = [], primaryIndex = 0,
  bg = "black", intent = "", imageSize = "2K", modelId = RENDER_MODEL,
} = {}) {
  if (!itemUrls?.length) throw new Error("아이템 이미지가 없습니다.");
  const single = itemUrls.length <= 1 || layout === "grouped";
  const bgOption = BUNDLE_BG_OPTIONS.find((o) => o.key === bg) || BUNDLE_BG_OPTIONS[0];
  const layered = outputMode === "layered-transparent";
  const renderMode = layered ? "integrated-preserve" : outputMode;
  const result = await renderWithImagen(
    buildFloatingPrompt({ effect, form, layout, color, intensity, motion, density, outputMode: renderMode, opening, frontCross, groupMode, groupAssignments, primaryIndex, itemCount: itemUrls.length, bg: bgOption, intent }),
    modelId,
    itemUrls,
    { aspectRatio: single ? "1:1" : "16:9", imageSize, matchInputAspect: false },
  );
  const firstPass = result?.dataUrl || null;
  if (!firstPass || (renderMode !== "integrated-preserve" && !layered)) return firstPass;
  const repaired = await renderWithImagen(
    buildFloatingRepairPrompt({ itemCount: itemUrls.length, groupMode, groupAssignments, primaryIndex }),
    modelId,
    [firstPass, ...itemUrls],
    { aspectRatio: single ? "1:1" : "16:9", imageSize, matchInputAspect: false },
  );
  const master = repaired?.dataUrl || firstPass;
  if (!layered) return master;

  const separationRefs = [master, ...itemUrls];
  const [effectResult, itemsResult] = await Promise.all([
    renderWithImagen(buildFloatingSeparationPrompt("effect", { itemCount: itemUrls.length }), modelId, separationRefs, { aspectRatio: single ? "1:1" : "16:9", imageSize, matchInputAspect: false }),
    renderWithImagen(buildFloatingSeparationPrompt("items", { itemCount: itemUrls.length }), modelId, separationRefs, { aspectRatio: single ? "1:1" : "16:9", imageSize, matchInputAspect: false }),
  ]);
  if (!effectResult?.dataUrl || !itemsResult?.dataUrl) throw new Error("효과/아이템 레이어 분리 렌더가 비어 있습니다.");
  const [effectPng, itemsPng] = await Promise.all([
    effectToTransparentPng(effectResult.dataUrl, { bg: [0, 0, 0], cutoff: 6, gamma: 0.85, opacity: 100, recoverColor: true, trim: false }),
    colorKeyToTransparentPng(itemsResult.dataUrl, { bg: [0, 255, 0], tolerance: 42, feather: 20, holeProtect: true, decontam: true, trim: false }),
  ]);
  const [effectImage, itemsImage] = await Promise.all([loadImage(effectPng), loadImage(itemsPng)]);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(effectImage.naturalWidth, itemsImage.naturalWidth);
  canvas.height = Math.max(effectImage.naturalHeight, itemsImage.naturalHeight);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(effectImage, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(itemsImage, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

// 결과를 PromptArc 내 폴더(private)로 자동 저장 — 꾸러미와 동일 경로·스키마.
export async function saveFloatingToPromptArc(dataUrl, user, meta = {}) {
  if (!user?.uid || !dataUrl) return null;
  const cloudinaryUrl = await uploadBase64(dataUrl);
  const id = Math.random().toString(36).slice(2);
  const now = Date.now();
  const ko = (list, key) => list.find((o) => o.key === key)?.ko || "";
  const effectKo = ko(FLOATING_EFFECT_OPTIONS, meta.effect);
  const formKo = ko(FLOATING_FORM_OPTIONS, meta.form);
  const layoutKo = ko(FLOATING_LAYOUT_OPTIONS, meta.layout);
  const groupKo = ko(FLOATING_GROUP_OPTIONS, meta.groupMode);
  const colorKo = ko(FLOATING_COLORS, meta.color);
  const intensityKo = ko(FLOATING_INTENSITY_OPTIONS, meta.intensity);
  const outputKo = ko(FLOATING_OUTPUT_OPTIONS, meta.outputMode);
  const bgKo = ko(BUNDLE_BG_OPTIONS, meta.bg);
  const intent = String(meta.intent || "").trim();
  const groupPlan = resolveFloatingGroupPlan(meta.itemCount || 0, meta.groupMode, meta.groupAssignments, meta.primaryIndex);
  const groupSummary = groupPlan.groups.length ? `${groupKo || "광원 그룹"} ${groupPlan.groups.length}개 (${groupPlan.assignments.join("/")})` : "";
  const summary = [meta.itemCount ? `아이템 ${meta.itemCount}개` : "", outputKo, effectKo, formKo, groupSummary, colorKo && `색 ${colorKo}`, intensityKo && `강도 ${intensityKo}`, layoutKo, bgKo && `배경 ${bgKo}`].filter(Boolean).join(" · ");
  const tags = ["NexusPreview", "FloatingItems", outputKo, effectKo, formKo, groupKo, colorKo].filter(Boolean);
  const record = {
    id,
    title: `NexusPreview 공중부양 아이템 · ${new Date(now).toLocaleString("ko-KR")}`,
    content: `${summary}${intent ? `\n추가 지시: ${intent}` : ""}`,
    images: [cloudinaryUrl], thumbnail: cloudinaryUrl,
    stepPrompts: [buildFloatingPrompt({ ...meta, itemCount: meta.itemCount || 0, bg: BUNDLE_BG_OPTIONS.find((o) => o.key === meta.bg) || BUNDLE_BG_OPTIONS[0], intent })],
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
