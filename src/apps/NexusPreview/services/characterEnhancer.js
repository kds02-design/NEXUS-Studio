// 캐릭터 렌더링 향상 — 캐릭터 이미지의 형태·컨셉을 분석해 어울리는 빛 효과와
// 외부 파티클 연출을 더해 렌더링. 원본 형태 99% · 얼굴 99.9% 보존이 절대 조건.
// 정책 본문은 src/skills/character-up/*.md (+ quality-up 보존 스킬 재사용).
// 렌더 호출 전 ensureCanGenerate("image") (프로젝트 규약).
import { doc, setDoc } from "firebase/firestore";
import { renderWithImagen } from "../../../lib/imagenRender";
import { composeSkills } from "../../../lib/skills";
import { uploadBase64 } from "../../../lib/storage";
import { db, appId } from "../../../lib/firebase";
import { serializeForFirestore } from "../../PromptArc/services/firebase";
import { RENDER_MODEL } from "./qualityEnhancer";
import { CHAR_LIGHT_OPTIONS, CHAR_PARTICLE_OPTIONS, CHAR_INTENSITY_OPTIONS, CHAR_BG_OPTIONS, CHAR_SKILLS, resolveCharBg } from "./characterPresets";

export { RENDER_MODEL };
// 프리셋·스킬 순서는 ./characterPresets (순수 모듈 — MCP 서버 공용) 로 분리, 여기서 재수출.
export * from "./characterPresets";

export const buildCharPrompt = (lightKey, particleKey, extra = "", intensityKey = "normal", bgKey = "auto") => {
  const light = CHAR_LIGHT_OPTIONS.find((o) => o.key === lightKey) || CHAR_LIGHT_OPTIONS[0];
  const particle = CHAR_PARTICLE_OPTIONS.find((o) => o.key === particleKey) || CHAR_PARTICLE_OPTIONS[0];
  const intensity = CHAR_INTENSITY_OPTIONS.find((o) => o.key === intensityKey) || CHAR_INTENSITY_OPTIONS[1];
  const bgResolved = resolveCharBg(lightKey, particleKey, bgKey);
  const bg = CHAR_BG_OPTIONS.find((o) => o.key === bgResolved) || CHAR_BG_OPTIONS[1];
  const e = String(extra || "").trim();
  const ids = [...CHAR_SKILLS];
  if (e) ids.push("quality-up/user-extra-guard");
  return composeSkills(ids, {
    lightDirective: light.en,
    particleDirective: particle.en,
    intensityDirective: intensity.en,
    bgDirective: bg.en,
    extraInstructions: e,
  });
};

// 캐릭터 향상 렌더 — 원본을 reference 로 주고 연출 프롬프트로 재생성. dataURL 반환.
// matchInputAspect: false — 표준 비율 매핑 후 크롭하지 않음(가장자리 잘림 방지, 퀄리티업과 동일 정책).
export async function renderCharEnhanced(dataUrl, { modelId = RENDER_MODEL, light = "auto", particle = "auto", intensity = "normal", bg = "auto", intent = "" } = {}) {
  const r = await renderWithImagen(buildCharPrompt(light, particle, intent, intensity, bg), modelId, dataUrl, {
    imageSize: "4K",
    matchInputAspect: false,
  });
  return r?.dataUrl || null;
}

// 향상 결과를 PromptArc 내 폴더(private)로 자동 저장 — 배경 퀄리티업과 동일 경로·스키마.
export async function saveCharToPromptArc(dataUrl, user, meta = {}) {
  if (!user?.uid || !dataUrl) return null;
  const cloudinaryUrl = await uploadBase64(dataUrl);
  const id = Math.random().toString(36).slice(2);
  const now = Date.now();
  const lightKo = CHAR_LIGHT_OPTIONS.find((o) => o.key === meta.light)?.ko || "";
  const particleKo = CHAR_PARTICLE_OPTIONS.find((o) => o.key === meta.particle)?.ko || "";
  const intensityKo = CHAR_INTENSITY_OPTIONS.find((o) => o.key === meta.intensity)?.ko || "";
  const bgKo = CHAR_BG_OPTIONS.find((o) => o.key === resolveCharBg(meta.light, meta.particle, meta.bg))?.ko || "";
  const tags = ["NexusPreview", "CharacterUp", lightKo, particleKo].filter(Boolean);
  const record = {
    id,
    title: `NexusPreview 캐릭터 렌더 향상 · ${new Date(now).toLocaleString("ko-KR")}`,
    content: [lightKo && `빛효과 ${lightKo}`, particleKo && `파티클 ${particleKo}`, intensityKo && `강도 ${intensityKo}`, bgKo && `배경 ${bgKo}`].filter(Boolean).join(" · "),
    images: [cloudinaryUrl], thumbnail: cloudinaryUrl,
    stepPrompts: [buildCharPrompt(meta.light, meta.particle, meta.intent || "", meta.intensity, meta.bg)],
    stepLabels: ["CharacterUp"],
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
