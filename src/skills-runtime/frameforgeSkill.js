// 스킬 매니페스트 — 프레임포지(Frame Forge).
// FrameForge '완성형' 생성의 옵션 축·무드 번들·프롬프트 빌더를 그대로 재사용한다.
// 실루엣은 용도(assetType)에 따라 달라지므로 options 를 함수로 준다(종속 슬롯 → 러너가 지원).
import { renderWithImagen, IMAGEN_MODELS } from "../lib/imagenRender";
import { COMPLETE_AXES, SIMPLE_MOODS, SIMPLE_RENDER_STYLES, buildCompletePrompt, seedAspectRatio } from "../apps/FrameForge/frameforgeAxes.js";

const DEFAULT_MODEL = IMAGEN_MODELS[0]?.id || "gemini-3.1-flash-image-preview";

const opt = (o) => ({ id: o.key, label: o.ko });
const silhouettesFor = (assetType) =>
  COMPLETE_AXES.silhouette.opts.filter((o) => o.for?.includes(assetType)).map(opt);

export const frameforgeSkill = {
  id: "frameforge",
  label: "프레임·버튼 생성",
  sub: "Frame Forge",
  color: "#4BCFFA",
  action: "image",
  transparent: "auto", // 대비 강한 플랫 배경으로 생성 → 색상 키로 자동 투명화 가능
  intro:
    "프레임·버튼·박스·배지·아이콘 같은 UI 부품을 용도와 분위기만 정하면 완성형으로 만들어 드려요. 필요한 걸 자유롭게 적어주세요.\n예: “어두운 RPG 느낌의 뾰족한 육각 버튼” · “오른쪽 화살표 아이콘” · “화려한 황금 왕가 프레임”",
  placeholder: "만들고 싶은 UI 부품을 설명하세요…",
  freeTextKey: "userText",
  slots: [
    { key: "assetType", label: "용도", question: "어떤 UI 부품인가요?", options: COMPLETE_AXES.assetType.opts.map(opt), required: true },
    // 종속 슬롯 — 용도가 정해져야 후보가 결정된다.
    { key: "silhouette", label: "형태", question: "형태(실루엣)를 골라주세요.", options: (v) => silhouettesFor(v.assetType), required: true },
    { key: "mood", label: "분위기", question: "분위기는 어떤 느낌으로?", options: SIMPLE_MOODS.map((m) => ({ id: m.key, label: m.ko })), required: true },
    { key: "renderStyle", label: "표현", question: "표현 방식은?", options: SIMPLE_RENDER_STYLES.map((s) => ({ id: s.key, label: s.ko })), default: "illustrated" },
  ],
  render: async (v) => {
    const assetType = COMPLETE_AXES.assetType.opts.find((o) => o.key === v.assetType);
    const silhouette = COMPLETE_AXES.silhouette.opts.find((o) => o.key === v.silhouette)
      || COMPLETE_AXES.silhouette.opts.find((o) => o.for?.includes(v.assetType));
    const mood = SIMPLE_MOODS.find((m) => m.key === v.mood) || SIMPLE_MOODS[0];
    const preset = COMPLETE_AXES.preset.opts.find((o) => o.key === mood.preset);
    const material = COMPLETE_AXES.material.opts.find((o) => o.ko === mood.material);
    const ornament = COMPLETE_AXES.ornament.opts.find((o) => o.ko === mood.ornament);
    const renderStyle = COMPLETE_AXES.renderStyle.opts.find((o) => o.key === v.renderStyle) || COMPLETE_AXES.renderStyle.opts[0];
    const frameWeight = COMPLETE_AXES.frameWeight.opts[0];
    const interior = COMPLETE_AXES.interior.opts.find((o) => o.key === "empty") || COMPLETE_AXES.interior.opts[0];
    const seed = { assetType, silhouette, preset, material, ornament, frameWeight, interior, renderStyle };
    const prompt = buildCompletePrompt(seed, v.userText || "");
    try {
      const r = await renderWithImagen(prompt, DEFAULT_MODEL, null, { aspectRatio: seedAspectRatio(seed) });
      if (!r?.dataUrl) return { ok: false, error: "결과가 비어 있습니다.", prompt };
      return { ok: true, dataUrl: r.dataUrl, prompt };
    } catch (e) {
      return { ok: false, error: e?.message || String(e), prompt };
    }
  },
};
