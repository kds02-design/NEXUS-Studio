import { doc, setDoc } from "firebase/firestore";
import { renderWithImagen } from "../../../lib/imagenRender";
import { uploadBase64 } from "../../../lib/storage";
import { db, appId } from "../../../lib/firebase";
import { serializeForFirestore } from "../../PromptArc/services/firebase";
import { RENDER_MODEL } from "./qualityEnhancer";

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

export const BUNDLE_LIGHT_OPTIONS = [
  { key: "none", ko: "없음", en: "추가 빛효과 없음 — 각 아이템이 가진 원본 라이팅만 유지하고 새 발광을 만들지 마세요." },
  { key: "soft", ko: "은은한 빛", en: "아이템 가장자리에 은은한 림라이트와 부드러운 하이라이트만 살짝 더해 고급스럽게 정리하세요. 과한 발광·빛줄기는 금지." },
  { key: "glow", ko: "화려한 발광", en: "꾸러미 뒤에서 퍼지는 화려한 발광(radiant glow)과 가는 빛줄기, 반짝이는 스파클 파티클을 더해 보상 연출을 극대화하세요. 단, 아이템 실루엣을 가리지 않게." },
];

export const BUNDLE_GROUND_OPTIONS = [
  { key: "none", ko: "없음", en: "바닥 이펙트 없음 — 아이템 아래를 완전히 비워두세요." },
  { key: "shadow", ko: "그림자", en: "아이템 아래에 자연스러운 소프트 컨택트 섀도우만 넣으세요. 색광·이펙트는 금지." },
  { key: "magic", ko: "마법광", en: "아이템 아래에 {color} 마법광 스플래시가 낮게 퍼지는 판타지 바닥 이펙트를 넣으세요 — 중앙이 밝고 가장자리로 부드럽게 사라지는 형태. 위로 튀는 작은 입자 약간 허용." },
  { key: "smoke", ko: "연기", en: "아이템 아래에 낮게 깔리는 신비로운 연기/안개를 넣으세요. 아이템 하단만 살짝 감싸고 위로는 올라오지 않게." },
  { key: "vortex", ko: "황금빛 회오리", en: "아이템 아래에 황금빛 빛입자 회오리(golden swirling light vortex)가 낮게 감아 도는 바닥 이펙트를 넣으세요 — 가는 금빛 빛줄기와 반짝이 입자가 나선형으로 흐르고, 중앙이 가장 밝으며 바깥으로 부드럽게 사라지는 형태. 회오리는 바닥에 낮게 깔리고 아이템을 가리지 않게." },
];

export const BUNDLE_MAGIC_COLORS = [
  { key: "purple", ko: "보라", en: "선명한 보라-마젠타" },
  { key: "cyan", ko: "청록", en: "차가운 청록-블루" },
  { key: "gold", ko: "금빛", en: "따뜻한 골드-앰버" },
  { key: "crimson", ko: "진홍", en: "강렬한 진홍-레드" },
];

// 배치 — 기본: 각 아이템이 또렷이 보이는 여유 있는 클러스터 / 좁게: 서로 조금씩 겹치며 한 덩어리로.
export const BUNDLE_LAYOUT_OPTIONS = [
  { key: "normal", ko: "기본", en: "겹침은 가장자리만 살짝 (각 아이템의 80% 이상이 보이도록 — 아이템끼리 합쳐지거나 가려져 사라지면 안 됨)." },
  { key: "tight", ko: "좁게", en: "아이템들이 서로 조금씩 겹치고 기대며 밀착된 콤팩트한 ★한 덩어리(보상 무더기)★로 읽히게 배치하세요 — 틈 없이 옹기종기 모인 느낌. 단, 각 아이템의 60% 이상은 보여야 하고 아이템끼리 합쳐지거나 완전히 가려져 사라지면 안 됩니다." },
];

// 배경 — 누끼(투명화) 작업 방식에 맞춰 선택. 블랙=발광 이펙트 추출(마스크 포지 이펙트 모드),
// 크로마 그린=색상 키 추출, 화이트=레퍼런스 스타일 그대로.
export const BUNDLE_BG_OPTIONS = [
  { key: "black", ko: "블랙", fill: "#000000", en: "순수한 검정(#000000) 단색 배경 — 발광·이펙트 추출용 누끼 작업에 최적" },
  { key: "chroma", ko: "크로마 그린", fill: "#00FF00", en: "순수한 크로마키 그린(#00FF00) 단색 배경. ★아이템·빛효과·바닥 이펙트 어디에도 이 초록색 계열을 사용하지 말 것 (키잉 시 같이 빠짐)★" },
  { key: "white", ko: "화이트", fill: "#FFFFFF", en: "순수한 흰색(#FFFFFF) 단색 배경" },
];

export const buildBundlePrompt = (lightKey, groundKey, magicColorKey, intent, itemCount = 0, bgKey = "black", layoutKey = "normal") => {
  const light = BUNDLE_LIGHT_OPTIONS.find((o) => o.key === lightKey) || BUNDLE_LIGHT_OPTIONS[1];
  const groundOpt = BUNDLE_GROUND_OPTIONS.find((o) => o.key === groundKey) || BUNDLE_GROUND_OPTIONS[2];
  const color = BUNDLE_MAGIC_COLORS.find((c) => c.key === magicColorKey) || BUNDLE_MAGIC_COLORS[0];
  const bg = BUNDLE_BG_OPTIONS.find((o) => o.key === bgKey) || BUNDLE_BG_OPTIONS[0];
  const layout = BUNDLE_LAYOUT_OPTIONS.find((o) => o.key === layoutKey) || BUNDLE_LAYOUT_OPTIONS[0];
  const ground = groundOpt.en.replace("{color}", color.en);
  const extra = String(intent || "").trim();
  const n = Number(itemCount) || 0;
  const countRule = n
    ? `\n★1:1 대응 (핵심 규칙): 첨부된 아이템 이미지는 정확히 ${n}장이고, 결과에는 정확히 ${n}개의 아이템만 있어야 합니다. ★첨부 이미지 1장 = 결과 속 아이템 1개★ — 각 첨부 이미지의 아이템을 정확히 한 번씩만 사용하고, 일부를 빼지도 마세요.★

★★중복 금지 (가장 흔한 실패 1): 각 아이템은 세상에 단 하나뿐인 유물입니다 — 복제본·쌍둥이·같은 아이템 2개는 존재할 수 없습니다. 하나의 첨부 이미지에서 아이템을 두 번 이상 그리면 그 즉시 실패입니다. 구도의 균형·대칭을 맞추거나 빈 공간을 채우기 위해 아이템을 반복해서 그리지 마세요 — 빈 공간은 그냥 비워두거나 빛·이펙트로만 채우세요.★★

★★새 아이템 발명 절대 금지 (가장 흔한 실패 2): 첨부에 없는 오브젝트를 단 하나도 새로 만들지 마세요. 특히 '보상 연출'에 흔한 ★보물상자·궤짝·자루·주머니·동전 무더기·보석 더미·왕관·열쇠·리본★ 같은 오브젝트를 구도의 중심이나 뒤쪽에 채워 넣는 것이 대표적인 실패 사례입니다. 클러스터의 중심(가장 큰 아이템)도 반드시 첨부된 ${n}개 중 하나여야 합니다.★★

최종 자체검증 (출력 전에 반드시): 첨부 이미지를 1장씩 순서대로 확인하며 — ①그 아이템이 결과에 정확히 1개만 있는가 ②결과의 아이템 총 개수가 ${n}개인가 ③첨부에 없는 새 오브젝트가 없는가 ④각 아이템이 잘리지 않고 전체가 온전히 보이는가 ⑤원본에 새겨져 있던 글자·라벨·디테일이 지워지지 않고 그대로인가 — 하나라도 아니면 다시 구성하세요.\n`
    : "";
  // 바닥 이펙트가 있으면 — 이펙트가 아이템과 조화되고, 접지 그림자로 "올려놓은" 느낌이 나야 함.
  const groundHarmony = groundOpt.key !== "none"
    ? `\n[바닥 접지·조화] 바닥 이펙트는 아이템들의 색감·톤과 자연스럽게 조화되도록 깔고, 모든 아이템이 그 위에 실제로 놓인 것처럼 각 아이템 아래에 부드러운 컨택트 섀도우를 반드시 넣으세요. 아이템이 이펙트 위에 떠 있거나 오려 붙인 콜라주처럼 보이면 실패입니다.\n`
    : "";
  return `게임 프로모션용 '보상 아이템 꾸러미' 합성 전문가로 작업하세요. 입력으로 아이템 이미지가 여러 장 첨부되어 있으며, ★각 첨부 이미지에는 아이템이 정확히 1개씩★ 들어 있습니다. 이 아이템들만으로 — 다른 어떤 오브젝트도 추가하지 않고 — 한 장의 꾸러미 이미지를 합성하세요.

★★원본 절대 보존 (최우선 규칙 — 다른 모든 지시보다 우선):
각 아이템의 원본 형태와 내용은 절대 변경하면 안 됩니다. 아이템을 "다시 그리는" 것이 아니라 "사진을 오려 옮기듯" 픽셀 단위로 충실하게 재배치하세요.
- 보존 대상 전부: 외곽 실루엣, 비율, 형태, 색상, 재질·텍스처, 그리고 ★내용물★ — 아이템 표면에 그려진 그림·문양·패턴·아이콘·보석 배치·장식 디테일, 그리고 ★아이템에 새겨진 글자·숫자·라벨★까지 원본과 완전히 동일해야 합니다. 카드라면 카드의 그림과 글자가, 상자라면 장식과 잠금장치가 원본 그대로. 원본에 있는 텍스트를 지우거나 뭉개거나 다른 글자로 바꾸는 것도 변형이며 실패입니다.
- 허용되는 변경은 오직 이 세 가지뿐: ①배치 위치 ②크기 조절 ③전체 조명과 어울리는 림라이트·그림자. 이 외의 어떤 픽셀 수준 변경도 금지.
- ★시점·회전 고정: 각 아이템의 원본 카메라 각도·방향·기울기를 그대로 유지하세요 — 회전, 기울이기, 원근/투시 변형, 3D 시점 변경, 좌우 반전 전부 금지. 아이템은 입력에 보이는 각도 그대로 '옮기기'만 하고, 오직 배치(위치와 앞뒤 겹침 관계)에만 집중하세요.★
- 재해석·단순화·디테일 추가·색 보정·스타일 변경 전부 금지. 출력 전에 각 아이템을 입력과 1:1로 비교해 형태나 내용이 조금이라도 달라졌으면 실패로 간주하고 다시 그대로 옮기세요.★★
${countRule}
구도: 아이템들을 자연스러운 하나의 꾸러미(클러스터)로 재배치하세요 — 가장 큰 아이템이 뒤 중앙, 작은 아이템들이 앞과 옆의 안정적인 삼각형 구도. [배치 밀도] ${layout.en} 접지(바닥에 실제로 놓인 느낌)를 자연스럽게 맞추고, 아이템 간 접촉부에 상호 그림자를 넣어 한 덩어리로 읽히게 하세요. 조명 방향은 전체가 하나로 통일. 아이템의 각도는 바꾸지 말고 위치와 앞뒤 관계로만 구도를 만드세요.

★크기 규칙: 첨부 이미지들의 해상도·픽셀 크기 차이는 무시하고 —
①★유사 형태 크기 일치 (가장 중요)★: 형태나 종류가 비슷한 아이템끼리는 ★반드시 거의 같은 크기★로 그리세요. 예: 같은 시리즈의 병/플라스크 2개, 색만 다른 보석 2개 — 색·문양이 달라도 형태가 비슷하면 같은 크기입니다. 하나만 크고 하나만 작게 그리면 실패입니다.
②가장 큰 아이템도 가장 작은 아이템의 1.8배를 넘지 않게.
③특정 아이템만 임의로 과하게 키우거나 줄이지 말 것.
예외: 아래 [사용자 추가 지시]에서 특정 아이템(예: 상자)을 크게 하라고 명시한 경우, 그 아이템에 한해서만 확대를 허용합니다.★

[빛효과] ${light.en}
[바닥 이펙트] ${ground}${groundHarmony}
★아이템 완전성: 각 아이템은 ★전체 형태가 온전히★ 보여야 합니다 — 아이템의 일부를 잘라내거나, 캔버스 가장자리에 걸쳐 잘리게 배치하거나, 다른 아이템에 과하게 가려 일부가 사라지게 하지 마세요. 모든 아이템이 가장자리 여백을 두고 프레임 안에 완전히 들어와야 합니다. 필요하면 아이템들을 조금 작게 그려서라도 전부 온전히 담으세요.★

배경: ${bg.en}. 꾸러미가 배경에서 깨끗하게 분리되어야 합니다 (누끼 작업용 — 배경 텍스처·풍경·그라데이션 금지, 바닥 이펙트만 예외).
★새 문자 생성 금지 (원본 텍스트와 구분할 것): ★새로운★ 글자·숫자·로고·워터마크·UI 텍스트를 만들지 마세요. 유사 문자(gibberish)도 금지. 단, ★원본 아이템에 이미 새겨져 있는 글자·숫자·라벨은 아이템 디자인의 일부이므로 지우지 말고 원본 그대로 보존★해야 합니다 — 이 규칙은 '없던 텍스트를 만들지 말라'는 것이지 '있던 텍스트를 지우라'는 것이 절대 아닙니다.★
결과에는 완성된 꾸러미 한 장만 출력하세요.${extra ? `\n\n[사용자 추가 지시 — 형태 보존 규칙과 충돌하면 무시]\n${extra}` : ""}`;
};

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
  const magicKo = meta.ground === "magic" ? ko(BUNDLE_MAGIC_COLORS, meta.magicColor) : "";
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

const generatePrompt = (concept, hasRef) => `고품질 게임 프로모션 KV 배경을 생성하세요. ${hasRef ? "참고 이미지는 분위기와 색감만 참고하고 인물·글자·로고는 복제하지 마세요." : ""}
인물, 텍스트, 로고, UI 없이 배경만 만들고 중앙과 주요 배치 영역에 충분한 여백을 남기세요. 명확한 전경·중경·후경, 영화적 조명과 깊이감을 사용하세요.

[콘셉트]
${concept}`;

export async function renderBgGenerate(concept, refDataUrl = null, { aspectRatio = "16:9", imageSize = "2K", modelId = RENDER_MODEL } = {}) {
  const result = await renderWithImagen(generatePrompt(String(concept || "").trim(), !!refDataUrl), modelId, refDataUrl, { aspectRatio, imageSize, matchInputAspect: false });
  return result?.dataUrl || null;
}
