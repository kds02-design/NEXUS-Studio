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

// 이펙트 프리셋 — 다중 선택. 아무것도 고르지 않으면 '자동'(모델이 분석해 조합).
export const TITLE_FX_EFFECTS = [
  { key: "speed", ko: "속도감", en: "타이틀 뒤·옆으로 흐르는 스피드 라인과 질주하는 기류 스트릭 — 글자가 빠르게 돌진하는 듯한 운동감. 스트릭은 글자 뒤에서 흘러나오되 글자 획을 덮지 않게." },
  { key: "blur", ko: "모션블러", en: "타이틀에 방향성 모션블러 잔상(트레일)을 더하세요 — 글자 본체는 선명하게 두고, 이동 방향 반대쪽으로 반투명 잔상이 겹쳐 흐르는 스피디한 연출." },
  { key: "frost", ko: "서리·성에", en: "글자 가장자리에 얼어붙는 서리·성에 결정과 차가운 냉기 수증기 — 글자 표면 위아래로 얇은 얼음 서리가 번지고 푸른 냉기가 은은하게 피어오르는 연출." },
  { key: "aura", ko: "아우라", en: "글자 윤곽을 따라 감도는 발광 아우라와 외곽 글로우 — 글자 실루엣에서 빛이 배어 나오는 신성한/에너지 후광." },
  { key: "mist", ko: "안개", en: "타이틀 하단에 낮게 깔리는 안개·연무와 글자 사이를 감도는 옅은 미스트 — 신비롭고 분위기 있는 무드." },
  { key: "gold", ko: "금빛", en: "따뜻한 금빛 광채, 흩날리는 금가루 파티클, 글자 획을 스치는 골드 글린트와 미세한 빛줄기 — 고급스럽고 화려한 프리미엄 연출." },
  { key: "glitch", ko: "글리치", en: "디지털 글리치 — RGB 채널 분리(색수차), 스캔라인, 순간적으로 어긋나는 슬라이스와 노이즈 프래그먼트가 글자 주변에 번쩍이는 사이버/디지털 연출. 단, 글자의 판독성은 반드시 유지." },
  { key: "spark", ko: "불티·스파크", en: "글자 주위로 튀는 불티·에너지 스파크와 위로 떠오르는 엠버 입자 — 뜨겁고 역동적인 에너지." },
  { key: "shatter", ko: "파편·비산", en: "글자 주변으로 흩어지는 크리스탈/유리 파편과 비산하는 조각들 — 충격적이고 임팩트 있는 연출. 단, 글자 본체는 온전히 유지." },
];

// 연출 색감 — 발광·파티클·기류의 색.
export const TITLE_FX_COLORS = [
  { key: "auto", ko: "자동", en: "타이틀의 기존 색·컨셉에 가장 어울리는 색으로 연출하세요." },
  { key: "gold", ko: "골드", en: "따뜻한 골드-앰버 톤으로 연출을 통일." },
  { key: "cyan", ko: "시안", en: "차가운 시안-블루 톤으로 연출을 통일." },
  { key: "crimson", ko: "크림슨", en: "강렬한 진홍-레드 톤으로 연출을 통일." },
  { key: "violet", ko: "바이올렛", en: "신비로운 바이올렛-퍼플 톤으로 연출을 통일." },
  { key: "white", ko: "화이트", en: "순백의 밝은 톤으로 연출을 통일." },
];

// 방향 — 속도감·모션블러·기류·입자가 흐르는 방향.
export const TITLE_FX_DIRECTIONS = [
  { key: "auto", ko: "자동", en: "" },
  { key: "ltr", ko: "왼→오른쪽", en: "운동감·스트릭·잔상의 흐름 방향은 왼쪽에서 오른쪽으로." },
  { key: "rtl", ko: "오른→왼쪽", en: "운동감·스트릭·잔상의 흐름 방향은 오른쪽에서 왼쪽으로." },
  { key: "up", ko: "아래→위", en: "운동감·입자·기류는 아래에서 위로 솟구치게." },
  { key: "radial", ko: "방사형", en: "운동감·빛·입자가 타이틀 중심에서 사방으로 퍼지게." },
];

// 연출 강도.
export const TITLE_FX_INTENSITY = [
  { key: "subtle", ko: "약하게", en: "연출 강도: 약하게 — 은은하고 절제된 수준. 원본과의 차이가 살짝 느껴질 정도로만." },
  { key: "normal", ko: "표준", en: "연출 강도: 표준 — 존재감 있되 글자를 가리지 않는 균형." },
  { key: "strong", ko: "강하게", en: "연출 강도: 강하게 — 화려하고 극적인 프로모션 히어로 컷 수준." },
];

// 배경 — 분리(누끼) 작업 방식 기준. 블랙=발광 추출 · 크로마=색상 키 · 화이트=레퍼런스.
export const TITLE_FX_BG_OPTIONS = [
  { key: "keep", ko: "원본 유지", en: "원본 배경(투명/단색이면 그대로)을 유지하고 연출만 얹으세요. 원본에 배경 장면이 있으면 그 구도·색감을 유지하세요." },
  { key: "black", ko: "블랙", fill: "#000000", en: "배경을 순수한 검정(#000000) 단색으로 통일하세요 — 발광·파티클 연출을 이펙트 추출(스크린/루마 키)로 분리하기에 최적. 타이틀과 연출 외 모든 영역은 완전한 검정이어야 합니다." },
  { key: "chroma", ko: "크로마 그린", fill: "#00FF00", en: "배경을 순수한 크로마키 그린(#00FF00) 단색으로 통일하세요. ★글자·빛·파티클 어디에도 초록 계열 색을 사용하지 말 것 (키잉 시 함께 빠짐)★." },
  { key: "white", ko: "화이트", fill: "#FFFFFF", en: "배경을 순수한 흰색(#FFFFFF) 단색으로 통일하세요. 흰색에 가까운 연출은 톤을 살짝 눌러 배경과 구분되게." },
];

export const buildTitlePrompt = (effectKeys = [], { color = "auto", direction = "auto", intensity = "normal", bg = "keep", intent = "" } = {}) => {
  const picked = (effectKeys || []).map((k) => TITLE_FX_EFFECTS.find((o) => o.key === k)).filter(Boolean);
  const auto = picked.length === 0;
  const col = TITLE_FX_COLORS.find((o) => o.key === color) || TITLE_FX_COLORS[0];
  const dir = TITLE_FX_DIRECTIONS.find((o) => o.key === direction) || TITLE_FX_DIRECTIONS[0];
  const inten = TITLE_FX_INTENSITY.find((o) => o.key === intensity) || TITLE_FX_INTENSITY[1];
  const bgOpt = TITLE_FX_BG_OPTIONS.find((o) => o.key === bg) || TITLE_FX_BG_OPTIONS[0];
  const extra = String(intent || "").trim();

  const effectBlock = auto
    ? "타이틀의 형태·컨셉·기존 색을 분석해 가장 어울리는 연출을 스스로 골라 조합하세요 — 속도감·서리·아우라·안개·금빛·글리치·모션블러·불티·파편 등에서."
    : picked.map((e, i) => `${i + 1}. [${e.ko}] ${e.en}`).join("\n");

  return `게임 프로모션 '타이틀 이펙트' 연출 전문가로 작업하세요. 입력 이미지에는 페이지에 크게 들어가는 타이틀/텍스트(로고 타이틀, 'COMING SOON' 같은 대형 카피 등)가 들어 있습니다. 이 타이틀 주위에 생명력 있는 이펙트를 더해 완성된 한 장으로 렌더하세요.

★★타이틀 원본 절대 보존 (최우선 규칙 — 다른 모든 지시보다 우선):
- 글자의 ★철자·문구·글자 수·순서★를 단 한 글자도 바꾸지 마세요. 새 글자·단어·기호를 추가하지도, 기존 글자를 지우지도 마세요.
- 글자의 ★서체(폰트)·굵기·자간·글자 형태(레터폼)·기울기·배치·크기·색상·재질·테두리·기존 장식★을 원본과 100% 동일하게 유지하세요. 글자를 다시 그리지 말고 '그대로 둔 채' 주변에만 연출을 얹으세요.
- 글자의 판독성을 해치지 마세요 — 이펙트가 글자 획을 두껍게 가리거나 뭉개면 실패입니다. 이펙트는 글자 ★뒤·주변·가장자리★에 얹히고, 글자 표면은 원본이 그대로 비쳐 보여야 합니다.
- 출력 전 원본과 글자를 1:1로 대조해 철자·서체·형태가 조금이라도 달라졌으면 실패로 간주하고 다시 하세요.★★

[적용할 이펙트]
${effectBlock}

[색감] ${col.en}
${dir.en ? `[방향] ${dir.en}\n` : ""}[${inten.en}]

배경: ${bgOpt.en}
★새 문자 생성 금지: 원본 타이틀 외에 어떤 글자·서브카피·워터마크·로고·UI 텍스트도 새로 만들지 마세요. 글자처럼 보이는 유사 문자(gibberish)도 금지. (원본 타이틀의 글자는 반드시 보존 — 이 규칙은 '없던 글자를 만들지 말라'는 것이지 '있던 글자를 지우라'는 것이 절대 아닙니다.)
결과에는 이펙트가 적용된 타이틀 한 장만 출력하세요.${extra ? `\n\n[사용자 추가 지시 — 타이틀 보존 규칙과 충돌하면 무시]\n${extra}` : ""}`;
};

// 타이틀 이펙트 렌더 — 원본을 reference 로 주고 연출 프롬프트로 재생성. dataURL 반환.
// matchInputAspect: true — 타이틀(주로 가로 배너)의 원본 비율·구도를 유지.
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
