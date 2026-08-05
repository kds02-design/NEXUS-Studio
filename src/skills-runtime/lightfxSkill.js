// 스킬 매니페스트 — 광원·빛효과(Light FX) 파일럿.
// RubiconForge 라이트FX의 옵션 상수 + renderLightFx 를 그대로 재사용하고, "무엇을 되물을지"(slots)만
// 새로 정의한다. 러너(SkillChat)가 이 매니페스트만으로 대화→옵션확정→생성 루프를 돌린다.
import { renderLightFx } from "../apps/RubiconForge/services/lightfx";
import { LIGHTFX_CATEGORIES, LIGHTFX_STYLES, LIGHTFX_COLORS } from "../apps/RubiconForge/constants/lightfx";

const toOpts = (list) => list.map((o) => ({ id: o.id, label: o.label }));

const INTENSITY_OPTS = [
  { id: "subtle", label: "약하게" },
  { id: "medium", label: "표준" },
  { id: "strong", label: "강하게" },
];

export const lightfxSkill = {
  id: "lightfx",
  label: "광원·빛효과 생성",
  sub: "Light FX",
  color: "#76cee0",
  action: "image", // 크레딧 단가 (ensureCanGenerate)
  transparent: "auto", // 순흑 배경 → 루마키로 자동 투명화 가능
  intro:
    "순흑 배경 위에 합성용 발광 에셋을 만들어 드려요. 필요한 빛효과를 자유롭게 적어주세요.\n예: “중심에서 퍼지는 황금빛 갓레이” · “캐릭터 뒤 푸른 신성한 후광”",
  placeholder: "만들고 싶은 빛효과를 설명하세요…",
  freeTextKey: "userText",
  // slots: 러너가 자유텍스트로 못 채운 required 항목만 대화로 되묻는다. 나머지는 default 적용.
  slots: [
    { key: "category", label: "효과 종류", question: "어떤 종류의 빛효과인가요?", options: toOpts(LIGHTFX_CATEGORIES), default: "lightSource" },
    { key: "color", label: "빛 색상", question: "빛 색상을 골라주세요.", options: toOpts(LIGHTFX_COLORS), required: true },
    { key: "style", label: "스타일", question: "빛의 결은 어떤 느낌으로?", options: toOpts(LIGHTFX_STYLES), default: "soft" },
    { key: "intensity", label: "강도", question: "연출 강도는?", options: INTENSITY_OPTS, default: "medium" },
  ],
  // 옵션 확정 → 구글 이미지 API 호출. { ok, dataUrl, error, prompt, compactPrompt } 반환.
  render: (values) =>
    renderLightFx({
      category: values.category,
      style: values.style,
      color: values.color,
      intensity: values.intensity,
      userText: values.userText || "",
      shape: "none",
      index: 0,
      imageSize: "2K",
      // bg 미지정 → renderLightFx 가 DEFAULT_BG(순흑)로 처리.
    }),
};
