// 타이틀 이펙트 — 페이지에 크게 들어가는 타이틀/텍스트 이미지(로고 타이틀, 'COMING SOON' 등)를
// 올리면 글자 철자·레터폼·서체는 100% 보존한 채 주변에 속도감·서리·아우라·안개·금빛·글리치·
// 모션블러 등의 연출을 더해 타이틀에 생명력을 넣는다. (NexusPreview KV 편집 모드)
// bgTools.js 와 동일하게 인라인 프롬프트 방식. 렌더 전 ensureCanGenerate("image") (프로젝트 규약).
import { doc, setDoc } from "firebase/firestore";
import { renderWithImagen } from "../../../lib/imagenRender";
import { uploadBase64 } from "../../../lib/storage";
import { db, appId } from "../../../lib/firebase";
import { serializeForFirestore } from "../../PromptArc/services/firebase";
import { RENDER_MODEL } from "./qualityEnhancer";

export { RENDER_MODEL };

// 프리셋·프롬프트 빌더는 순수 모듈(titlePrompt.js) — MCP(nexus_title_effect_prompt)·스킬 런타임과 공유. 기존 import 경로 호환용 재수출.
import { TITLE_FX_EFFECTS, TITLE_FX_COLORS, TITLE_FX_DIRECTIONS, TITLE_FX_INTENSITY, TITLE_FX_BG_OPTIONS, buildTitlePrompt } from "./titlePrompt";
export { TITLE_FX_EFFECTS, TITLE_FX_COLORS, TITLE_FX_DIRECTIONS, TITLE_FX_INTENSITY, TITLE_FX_BG_OPTIONS, buildTitlePrompt };

export async function renderTitleEffect(dataUrl, { modelId = RENDER_MODEL, effects = [], color = "auto", direction = "auto", intensity = "normal", bg = "keep", intent = "" } = {}) {
  const r = await renderWithImagen(buildTitlePrompt(effects, { color, direction, intensity, bg, intent }), modelId, dataUrl, {
    imageSize: "4K",
    matchInputAspect: true,
  });
  return r?.dataUrl || null;
}

// 결과를 PromptArc 내 폴더(private)로 자동 저장 — 캐릭터/꾸러미 향상과 동일 경로·스키마.
export async function saveTitleToPromptArc(dataUrl, user, meta = {}) {
  if (!user?.uid || !dataUrl) return null;
  const cloudinaryUrl = await uploadBase64(dataUrl);
  const id = Math.random().toString(36).slice(2);
  const now = Date.now();
  const effectsKo = (meta.effects || []).map((k) => TITLE_FX_EFFECTS.find((o) => o.key === k)?.ko).filter(Boolean);
  const colorKo = TITLE_FX_COLORS.find((o) => o.key === meta.color)?.ko || "";
  const intensityKo = TITLE_FX_INTENSITY.find((o) => o.key === meta.intensity)?.ko || "";
  const bgKo = TITLE_FX_BG_OPTIONS.find((o) => o.key === meta.bg)?.ko || "";
  const summary = [
    effectsKo.length ? `이펙트 ${effectsKo.join("·")}` : "이펙트 자동",
    colorKo && `색 ${colorKo}`,
    intensityKo && `강도 ${intensityKo}`,
    bgKo && `배경 ${bgKo}`,
  ].filter(Boolean).join(" · ");
  const tags = ["NexusPreview", "TitleFx", ...effectsKo].filter(Boolean);
  const record = {
    id,
    title: `NexusPreview 타이틀 이펙트 · ${new Date(now).toLocaleString("ko-KR")}`,
    content: summary,
    images: [cloudinaryUrl], thumbnail: cloudinaryUrl,
    stepPrompts: [buildTitlePrompt(meta.effects || [], { color: meta.color, direction: meta.direction, intensity: meta.intensity, bg: meta.bg, intent: meta.intent || "" })],
    stepLabels: ["TitleFx"],
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
