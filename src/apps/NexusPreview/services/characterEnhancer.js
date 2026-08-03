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

export { RENDER_MODEL };

// 빛 효과 프리셋 — "자동"은 모델이 캐릭터 형태를 분석해 스스로 선택.
export const CHAR_LIGHT_OPTIONS = [
  { key: "auto", ko: "자동 (형태 분석)", en: "캐릭터의 형태·컨셉·기존 조명 방향을 분석해 가장 어울리는 빛 연출을 스스로 선택하세요 — 림라이트, 백글로우, 속성광(불/얼음/번개 등) 중 캐릭터와 가장 잘 맞는 것." },
  { key: "rim", ko: "림라이트", en: "캐릭터 외곽을 따라 얇고 또렷한 림라이트(윤곽광)를 넣으세요 — 실루엣이 배경에서 선명하게 분리되는 고급스러운 연출." },
  { key: "backglow", ko: "백글로우", en: "캐릭터 뒤에서 은은하게 퍼지는 백라이트 글로우를 넣으세요 — 캐릭터가 빛을 등지고 선 듯한 부드러운 후광." },
  { key: "intense", ko: "강렬한 발광", en: "극적인 역광과 캐릭터 속성에 맞는 에너지 광이 감도는 강렬한 발광 연출을 넣으세요 — 단, 원본 디테일이 빛에 묻히면 안 됩니다." },
  { key: "none", ko: "없음", en: "빛 효과는 추가하지 마세요 — 원본 조명 그대로 유지하고 파티클만 적용합니다." },
];

// 파티클 프리셋
export const CHAR_PARTICLE_OPTIONS = [
  { key: "auto", ko: "자동 (컨셉 분석)", en: "캐릭터의 속성·컨셉을 분석해 어울리는 파티클을 스스로 선택하세요 — 마법 입자, 불티, 빛조각, 꽃잎 등." },
  { key: "magic", ko: "마법 입자", en: "반짝이는 마법 입자(아케인 스파크·글로우 점)가 캐릭터 주위를 감돌게 하세요." },
  { key: "ember", ko: "불티·엠버", en: "위로 떠오르는 불티(엠버) 입자와 아주 미세한 연기를 캐릭터 주변에 넣으세요." },
  { key: "glint", ko: "빛조각", en: "산란하는 빛 파편과 작은 글린트가 캐릭터 주변 공기에 흩어지게 하세요." },
  { key: "petal", ko: "꽃잎·파편", en: "흩날리는 꽃잎 또는 가벼운 파편 조각이 캐릭터 주위를 스치게 하세요." },
  { key: "none", ko: "없음", en: "파티클은 추가하지 마세요 — 빛 효과만 적용합니다." },
];

// 연출 강도 — 빛·파티클 공통 적용.
export const CHAR_INTENSITY_OPTIONS = [
  { key: "subtle", ko: "약하게", en: "연출 강도: 약하게 — 은은하고 절제된 수준. 원본과의 차이가 살짝 느껴질 정도로만, 빛과 파티클 모두 최소한으로." },
  { key: "normal", ko: "표준", en: "연출 강도: 표준 — 존재감 있는 연출. 단, 원본 디테일을 가리지 않는 균형을 유지." },
  { key: "strong", ko: "강하게", en: "연출 강도: 강하게 — 화려하고 극적인 연출. 빛과 파티클을 풍성하게, 프로모션 히어로 컷 수준으로." },
];

// 배경 — 분리(누끼) 작업 방식 기준. auto 는 선택한 연출로부터 분리가 쉬운 색을 자동 결정.
export const CHAR_BG_OPTIONS = [
  { key: "auto", ko: "자동 (분리 최적)" },
  { key: "keep", ko: "원본 유지", en: "원본 배경이 투명/단색(누끼)이면 그대로 유지하고 연출만 얹으세요. 원본에 배경이 있으면 배경 구도·내용을 유지하세요." },
  { key: "black", ko: "블랙", fill: "#000000", en: "배경을 순수한 검정(#000000) 단색으로 통일하세요 — 발광·파티클 연출을 이펙트 추출(스크린/루마 키)로 분리하기에 최적. 캐릭터와 연출 외의 모든 영역은 완전한 검정이어야 합니다." },
  { key: "chroma", ko: "크로마 그린", fill: "#00FF00", en: "배경을 순수한 크로마키 그린(#00FF00) 단색으로 통일하세요. ★캐릭터·빛·파티클 어디에도 초록 계열 색을 사용하지 말 것 (키잉 시 같이 빠짐)★." },
  { key: "white", ko: "화이트", fill: "#FFFFFF", en: "배경을 순수한 흰색(#FFFFFF) 단색으로 통일하세요. 흰색에 가까운 연출은 톤을 살짝 눌러 배경과 구분되게." },
];

// 자동 배경 결정 — 발광성 연출(빛효과 or 발광 입자)이 있으면 블랙(이펙트 추출이 가장 깔끔),
// 발광이 전혀 없으면(비발광 파편/무효과) 크로마 그린(색상 키)이 분리에 유리.
export function resolveCharBg(lightKey, particleKey, bgKey = "auto") {
  if (bgKey !== "auto") return bgKey;
  const glowLight = lightKey !== "none";
  const glowParticle = ["auto", "magic", "ember", "glint"].includes(particleKey);
  return glowLight || glowParticle ? "black" : "chroma";
}

const CHAR_SKILLS = [
  "character-up/intro",
  "character-up/face-lock",
  "quality-up/preserve-face",
  "quality-up/preserve-subject",
  "quality-up/preserve-edge-fade",
  "quality-up/no-new-text",
  "character-up/char-bg",
  "character-up/char-light",
  "character-up/char-particles",
  "character-up/char-intensity",
  "quality-up/outro",
];

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
