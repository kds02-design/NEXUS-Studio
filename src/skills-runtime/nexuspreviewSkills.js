// 스킬 매니페스트 — NEXUS Preview 이미지 생성기들.
// 각 앱의 기존 render 함수·옵션 상수를 그대로 재사용. 이미지 입력형은 file/files 슬롯 사용.
import { renderBgGenerate, renderItemBundle, BUNDLE_LIGHT_OPTIONS, BUNDLE_LAYOUT_OPTIONS, renderFloatingItems, FLOATING_EFFECT_OPTIONS, FLOATING_LAYOUT_OPTIONS, FLOATING_COLORS } from "../apps/NexusPreview/services/bgTools";
import { renderEnhanced } from "../apps/NexusPreview/services/qualityEnhancer";
import { renderCharEnhanced, CHAR_LIGHT_OPTIONS, CHAR_PARTICLE_OPTIONS, CHAR_INTENSITY_OPTIONS } from "../apps/NexusPreview/services/characterEnhancer";
import { renderTitleEffect, TITLE_FX_EFFECTS, TITLE_FX_COLORS, TITLE_FX_INTENSITY } from "../apps/NexusPreview/services/titleEffect";

const NP = "#76CEE0";
const kv = (list) => list.map((o) => ({ id: o.key, label: o.ko }));

// render 함수들은 dataURL(string)|null 을 반환 → 러너가 기대하는 { ok, dataUrl, error } 로 정규화.
const wrap = async (promise) => {
  try {
    const url = await promise;
    return url ? { ok: true, dataUrl: url } : { ok: false, error: "결과가 비어 있습니다." };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
};

export const bgGenerateSkill = {
  id: "nexus-bg", label: "KV 배경 생성", sub: "BG Generate", color: NP, action: "image", transparent: "ai", // 씬 배경 → 로컬 키잉 불가, Mask Forge AI 제거로
  intro: "프로모션 KV 배경을 콘셉트만으로 만들어 드려요. 인물·글자 없이 배경만, 중앙 여백 확보.\n예: “어두운 중세 성채, 중앙은 타이틀 여백, 좌우에 푸른 마법광”",
  placeholder: "배경 콘셉트를 적어주세요…",
  freeTextKey: "concept",
  slots: [
    { key: "aspect", label: "비율", question: "화면 비율은?", options: [{ id: "16:9", label: "16:9" }, { id: "21:9", label: "21:9" }, { id: "4:3", label: "4:3" }], default: "16:9" },
  ],
  render: (v) => wrap(renderBgGenerate(v.concept || "", null, { aspectRatio: v.aspect || "16:9", imageSize: "2K" })),
};

export const bgQualitySkill = {
  id: "nexus-quality", label: "배경 품질 개선", sub: "Quality Up", color: NP, action: "image", transparent: "ai", // 씬 배경 → Mask Forge
  intro: "업로드한 배경의 구도는 유지하고 빛·분위기·디테일을 끌어올려요. 원하는 방향을 적고 이미지를 올려주세요.\n예: “더 선명하고 영화적인 조명으로”",
  placeholder: "원하는 개선 방향 (없으면 ‘개선’ 입력)…",
  freeTextKey: "intent",
  slots: [
    { key: "image", label: "원본 이미지", question: "개선할 배경 이미지를 올려주세요.", type: "file", required: true },
  ],
  render: (v) => wrap(renderEnhanced(v.image, undefined, v.intent || "")),
};

export const charEnhanceSkill = {
  id: "nexus-char", label: "캐릭터 렌더 향상", sub: "Character Up", color: NP, action: "image", transparent: "auto", // 배경 auto(블랙/크로마) → 자동 키잉
  intro: "캐릭터 형태·얼굴은 보존하고 어울리는 빛·파티클 연출을 더해요. 원하는 느낌을 적고 캐릭터 이미지를 올려주세요.\n예: “차가운 푸른 빛, 파티클은 위로 떠오르게”",
  placeholder: "원하는 연출 느낌 (없으면 ‘자동’ 입력)…",
  freeTextKey: "intent",
  slots: [
    { key: "image", label: "캐릭터 이미지", question: "캐릭터 이미지를 올려주세요.", type: "file", required: true },
    { key: "light", label: "빛 효과", question: "빛 효과는?", options: kv(CHAR_LIGHT_OPTIONS), default: "auto" },
    { key: "particle", label: "파티클", question: "파티클은?", options: kv(CHAR_PARTICLE_OPTIONS), default: "auto" },
    { key: "intensity", label: "강도", question: "연출 강도는?", options: kv(CHAR_INTENSITY_OPTIONS), default: "normal" },
  ],
  render: (v) => wrap(renderCharEnhanced(v.image, { light: v.light, particle: v.particle, intensity: v.intensity, bg: "auto", intent: v.intent || "" })),
};

export const titleFxSkill = {
  id: "nexus-title", label: "타이틀 이펙트", sub: "Title FX", color: NP, action: "image", transparent: "auto", // 배경 유지형이라 자동 시도 후 복잡하면 Mask Forge 권유
  intro: "타이틀·대형 텍스트에 속도감·서리·아우라·금빛·글리치 등 연출을 더해요 (글자 철자·서체 보존). 느낌을 적고 타이틀 이미지를 올려주세요.\n예: “금빛으로 화려하게”",
  placeholder: "원하는 이펙트 느낌 (없으면 ‘자동’ 입력)…",
  freeTextKey: "intent",
  slots: [
    { key: "image", label: "타이틀 이미지", question: "타이틀 이미지를 올려주세요.", type: "file", required: true },
    { key: "effect", label: "주 효과", question: "주된 이펙트는?", options: [{ id: "auto", label: "자동" }, ...kv(TITLE_FX_EFFECTS)], default: "auto" },
    { key: "color", label: "색감", question: "색감은?", options: kv(TITLE_FX_COLORS), default: "auto" },
    { key: "intensity", label: "강도", question: "강도는?", options: kv(TITLE_FX_INTENSITY), default: "normal" },
  ],
  render: (v) => wrap(renderTitleEffect(v.image, { effects: v.effect && v.effect !== "auto" ? [v.effect] : [], color: v.color, intensity: v.intensity, bg: "keep" })),
};

export const itemBundleSkill = {
  id: "nexus-bundle", label: "아이템 꾸러미", sub: "Item Bundle", color: NP, action: "image", transparent: "auto", // 블랙 배경 → 루마/색상 키
  intro: "아이템 이미지 여러 장을 형태 그대로 하나의 보상 꾸러미로 합성해요. 원하는 연출을 적고 아이템들을 올려주세요 (2장 이상).\n바닥 이펙트는 RubiconForge 광원 효과(바닥 이펙트·그라운드)에서 따로 만들어 겹쳐 쓰세요.",
  placeholder: "원하는 연출 (없으면 ‘기본’ 입력)…",
  freeTextKey: "intent",
  slots: [
    { key: "items", label: "아이템 이미지", question: "아이템 이미지를 2장 이상 올려주세요.", type: "files", min: 2, required: true },
    { key: "light", label: "빛효과", question: "빛효과는?", options: kv(BUNDLE_LIGHT_OPTIONS), default: "soft" },
    { key: "layout", label: "배치", question: "배치는?", options: kv(BUNDLE_LAYOUT_OPTIONS), default: "normal" },
  ],
  render: (v) => wrap(renderItemBundle(v.items, { light: v.light, ground: "none", bg: "black", layout: v.layout, intent: v.intent || "", imageSize: "2K" })),
};

export const floatingItemsSkill = {
  id: "nexus-floating", label: "공중부양 아이템", sub: "Floating Items", color: NP, action: "image", transparent: "auto",
  intro: "아이템을 물방울·번개·금빛·회오리 등 원형 이펙트로 감싸 공중에 띄워요. 원 하나에 1개 또는 여러 개. 느낌을 적고 아이템을 올려주세요 (1장 이상).\n예: “금빛 회오리로 화려하게”",
  placeholder: "원하는 연출 (없으면 ‘자동’ 입력)…",
  freeTextKey: "intent",
  slots: [
    { key: "items", label: "아이템 이미지", question: "아이템 이미지를 올려주세요 (1장 이상).", type: "files", min: 1, required: true },
    { key: "effect", label: "원형 이펙트", question: "원형 이펙트는?", options: kv(FLOATING_EFFECT_OPTIONS), default: "bubble" },
    { key: "layout", label: "배치", question: "배치는? (개별 원 / 한 원에 모아서)", options: kv(FLOATING_LAYOUT_OPTIONS), default: "each" },
    { key: "color", label: "이펙트 색", question: "이펙트 색은?", options: kv(FLOATING_COLORS), default: "auto" },
  ],
  render: (v) => wrap(renderFloatingItems(v.items, { effect: v.effect, layout: v.layout, color: v.color, bg: "black", intent: v.intent || "", imageSize: "2K" })),
};

export const nexusPreviewSkills = [bgGenerateSkill, bgQualitySkill, charEnhanceSkill, titleFxSkill, itemBundleSkill, floatingItemsSkill];
