// Centralized evaluation criteria service.
//
// Firestore: evaluationCriteria/{type}/versions/{versionId}
//   { name, isActive, note?, criteria: [{ id, name, weight, description, maxScore }],
//     createdAt, updatedAt }
//
// 각 앱은 fetchActiveCriteria(type) 으로 활성 버전 항목을 가져와 사용합니다.
// 첫 실행 시 마이그레이션 (앱 최초 로드되거나 NexusAdmin 첫 진입 시) 으로
// 하드코딩 시드를 v1.0 으로 자동 등록합니다.

import {
  collection, getDocs, addDoc, query, where, limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export const CRITERIA_TYPES = {
  banner: "banner",
  promotion: "promotion",
  brandweb: "brandweb",
  prompt: "prompt",
  // ─── 타이포그래피 전용 평가 타입 (2026-05 추가) ─────────────
  // 각 타이포 성격에 맞는 항목으로 시드. 관리자가 NexusAdmin 에서 가중치/항목 자유 조정.
  typo2d: "typo2d",         // 2D 평면 타이포그래피 (벡터, 평면 디자인)
  typoRender: "typoRender", // 렌더링 타이포 (3D/PBR — Render Matrix 결과물)
  typoMotion: "typoMotion", // 모션 타이포 (영상/모션 — Motion Matrix 결과물 키프레임)
};

// ─── 시드 (v1.0) ────────────────────────────────────────
// id 는 Gemini scores_data 키와 1:1 매칭. 함부로 바꾸지 마세요.

const BANNER_SEED = [
  { id: "impression", name: "첫인상 / 주목도",   weight: 10, maxScore: 100, description: "한눈에 시선을 사로잡는 강렬함과 매력. 단조롭고 1차원적인 상자 배치 수준이면 80점대 부여." },
  { id: "concept",    name: "콘셉트 전달력",      weight: 10, maxScore: 100, description: "이벤트나 업데이트의 성격, 맥락이 잘 전달되는지." },
  { id: "layout",     name: "레이아웃 균형",      weight: 10, maxScore: 100, description: "요소들의 화면 배치와 시각적 무게 중심. 중앙 정렬 단순 나열이면 80점대 초중반, 산만하면 70점대." },
  { id: "typography", name: "타이포그래피",       weight: 10, maxScore: 100, description: "폰트 렌더링, 시각적 위계 및 세련미. 타이틀이 배경과 묻히면 60~70점대." },
  { id: "color",      name: "컬러 완성도",        weight: 10, maxScore: 100, description: "배너 무드에 맞는 색상 조합과 완성도. 텍스트와 배경 컬러가 분리되지 않고 겹치면 70점대." },
  { id: "readability",name: "정보 가독성",        weight: 10, maxScore: 100, description: "타이틀, 날짜, 혜택 등 핵심 정보의 가독성." },
  { id: "brand",      name: "브랜드 적합성",      weight: 10, maxScore: 100, description: "해당 게임/이벤트 감성에 부합하는 톤앤매너." },
  { id: "flow",       name: "시선 흐름",          weight: 10, maxScore: 100, description: "텍스트→캐릭터→아이템으로 자연스럽게 이어지면 고득점, 시선이 방황하면 감점." },
  { id: "detail",     name: "완성도 / 디테일",    weight: 10, maxScore: 100, description: "배경, 빛, 뎁스, 합성의 디테일과 마감. 캐릭터 없는 단순 나열은 90점 이상 금지." },
  { id: "conversion", name: "클릭/전환 가능성",   weight: 10, maxScore: 100, description: "유저로 하여금 클릭하고 싶게 만드는 매력도." },
];

const PROMOTION_SEED = [
  { id: "impression", name: "첫 화면 흡입력",       weight: 10, maxScore: 100, description: "Hook — 페이지 진입 직후 시선을 잡는가." },
  { id: "brand",      name: "브랜드·이벤트 톤",     weight: 8,  maxScore: 100, description: "브랜드 정체성 + 캠페인 분위기 일치도." },
  { id: "concept",    name: "캠페인 이해도",         weight: 10, maxScore: 100, description: "이 캠페인이 무엇이고 왜 참여해야 하는지가 명료한가." },
  { id: "color",      name: "보상 매력도",           weight: 15, maxScore: 100, description: "Reward appeal — 보상 자체와 그 표현이 매력적인가." },
  { id: "layout",     name: "보상 구조·조건",        weight: 10, maxScore: 100, description: "Reward logic — 조건/단계/혜택 구조가 명확한가." },
  { id: "typography", name: "정보 위계",             weight: 10, maxScore: 100, description: "타이틀/서브/본문 간 시각적 위계." },
  { id: "conversion", name: "참여 동선·CTA",         weight: 10, maxScore: 100, description: "Participation flow — CTA 위치/문구/유도가 효과적인가." },
  { id: "readability",name: "정보 가독성",           weight: 12, maxScore: 100, description: "긴 페이지 안에서 핵심 정보가 잘 읽히는가." },
  { id: "flow",       name: "스크롤 리듬",           weight: 8,  maxScore: 100, description: "Scroll rhythm — 섹션 전환과 시선 흐름의 자연스러움." },
  { id: "detail",     name: "운영 신뢰성",           weight: 7,  maxScore: 100, description: "Operational trust — 안내, 면책, 마감 등 디테일의 신뢰감." },
];

const BRANDWEB_SEED = [
  { id: "impression", name: "브랜드 정체성",       weight: 10, maxScore: 100, description: "Identity — 첫 화면에서 브랜드가 명확히 각인되는가." },
  { id: "concept",    name: "히어로 임팩트",        weight: 15, maxScore: 100, description: "Hero impact — 메인 비주얼/카피의 임팩트." },
  { id: "layout",     name: "메인 비주얼",          weight: 15, maxScore: 100, description: "Key visual — 핵심 비주얼 구도/스케일." },
  { id: "typography", name: "타이틀 존재감",        weight: 12, maxScore: 100, description: "Title presence — 타이포의 존재감과 톤." },
  { id: "color",      name: "세계관 몰입도",        weight: 12, maxScore: 100, description: "World immersion — 컬러로 만들어내는 세계관 몰입." },
  { id: "readability",name: "시각적 위계",          weight: 10, maxScore: 100, description: "Visual hierarchy — 정보의 시각적 위계." },
  { id: "brand",      name: "레이아웃 균형",        weight: 8,  maxScore: 100, description: "Layout balance — 전체 레이아웃의 균형감." },
  { id: "flow",       name: "탐색 스크롤 연출",     weight: 6,  maxScore: 100, description: "Scroll interaction — 스크롤로 펼쳐지는 연출의 매력." },
  { id: "detail",     name: "진입 전환성",          weight: 6,  maxScore: 100, description: "Gateway conversion — 다음 행동/페이지로의 유도력." },
  { id: "conversion", name: "기억성",               weight: 6,  maxScore: 100, description: "Memorability — 사용자에게 남는 잔상." },
];

// 프롬프트 평가 — placeholder. 사용자가 NexusAdmin 에서 직접 채워 넣을 수 있도록 빈 시드.
const PROMPT_SEED = [];

// ─── 2D 타이포그래피 (평면 디자인 — 벡터/플랫) ───────────────────────────
// 조판/리듬/그리드 같은 평면 디자인 본질에 집중.
// id 는 Gemini responseSchema 가 강제하는 10개 표준 키와 동일하게 유지.
// (관리자가 NexusAdmin 에서 name/weight/description 자유 편집 가능. id 는 schema 호환 위해 유지 권장.)
const TYPO2D_SEED = [
  { id: "impression",  name: "첫인상 / 시각 임팩트", weight: 10, maxScore: 100, description: "한눈에 시선을 사로잡는 강렬함. 평범한 폰트 + 평이한 색 조합이면 70점대." },
  { id: "concept",     name: "콘셉트 표현력",        weight: 10, maxScore: 100, description: "메시지/감정이 타이포 자체로 전달되는지. 글꼴 선택이 메시지 톤과 맞는지." },
  { id: "layout",      name: "구성/여백",            weight: 10, maxScore: 100, description: "화면 분할과 여백 활용. 답답하지 않고 의도된 호흡이 있는지." },
  { id: "typography",  name: "자간/조판 정밀도",     weight: 14, maxScore: 100, description: "자간/장평/베이스라인 정밀도. 자모 균형, 글자 간격의 일관성. 타이포 디자인의 핵심." },
  { id: "color",       name: "색 조화",              weight: 10, maxScore: 100, description: "배경/텍스트 색 조합의 조화. 콘트라스트가 적절하고 톤이 일관된지." },
  { id: "readability", name: "가독성",               weight: 12, maxScore: 100, description: "폰트 선택, 크기, 색 대비가 빠른 식별성을 보장하는지. 작은 크기에서도 읽히는지." },
  { id: "brand",       name: "브랜드 톤 일치",       weight: 8,  maxScore: 100, description: "브랜드/제품의 톤앤매너에 부합하는 폰트와 스타일인지." },
  { id: "flow",        name: "시각 리듬",            weight: 10, maxScore: 100, description: "굵기 대비, 크기 대비, 간격의 반복 패턴이 시각적 리듬을 만드는지." },
  { id: "detail",      name: "마감/디테일",          weight: 8,  maxScore: 100, description: "픽셀 단위 디테일의 완성도. 깨진 외곽, 어색한 자모, 미세 정렬 오차 없음." },
  { id: "conversion",  name: "정렬/그리드 정확성",   weight: 8,  maxScore: 100, description: "수학적 정렬과 그리드 준수 + 시각적 정렬(optical) 보정." },
];

// ─── 렌더링 타이포 (3D/PBR — Render Matrix 산출물) ───────────────────────
// 재질/조명/실루엣 보존/이펙트 통합 등 3D 렌더의 본질에 집중.
const TYPO_RENDER_SEED = [
  { id: "impression",  name: "시네마틱 임팩트",      weight: 10, maxScore: 100, description: "한 장의 시안으로 임팩트가 있는지. AAA 게임 타이틀급 무게감/존재감." },
  { id: "concept",     name: "콘셉트 일치도",        weight: 10, maxScore: 100, description: "의도한 분위기(다크판타지/하이테크/프리미엄 등)가 정확히 전달되는지." },
  { id: "layout",      name: "입체감 (Volume)",      weight: 8,  maxScore: 100, description: "정면 부조/후면 돌출의 균형. 두께가 과하거나 부족하지 않고 의도된 깊이인지." },
  { id: "typography",  name: "실루엣 보존",          weight: 14, maxScore: 100, description: "원본 타이포의 윤곽이 정확히 유지되는지. 변형/녹아내림/형태 왜곡이 없는지." },
  { id: "color",       name: "컬러 그레이딩",        weight: 8,  maxScore: 100, description: "시네마틱 톤매핑. 채도/대비/색온도가 분위기에 맞고 영상미가 있는지." },
  { id: "readability", name: "모서리/엣지 정밀도",   weight: 8,  maxScore: 100, description: "외곽선이 깔끔하고 색번짐/blob 없음. 모서리가 살아 있는지." },
  { id: "brand",       name: "재질 표현 (Material)", weight: 14, maxScore: 100, description: "PBR 재질의 사실성. 금속/얼음/돌 등이 진짜 같은지, 가짜 셰이딩이나 플라스틱 느낌 없는지." },
  { id: "flow",        name: "라이팅 (Lighting)",    weight: 10, maxScore: 100, description: "주광/측광/림라이트의 자연스러움. 그림자/하이라이트가 형태에 부합하고 입체감을 살리는지." },
  { id: "detail",      name: "표면 디테일",          weight: 10, maxScore: 100, description: "미세 텍스처(스크래치, 결, 균열)의 밀도와 사실성. 너무 매끄럽거나 너무 지저분하지 않은지." },
  { id: "conversion",  name: "배경 분리 / 기술 완성도", weight: 8, maxScore: 100, description: "깔끔한 컷아웃. plaque(벽면 부조)처럼 보이지 않고, AI 아티팩트/노이즈 없음." },
];

// ─── 모션 타이포 (영상/모션 — Motion Matrix 산출물 / 키프레임) ───────────
// 영상은 대표 키프레임 기준으로 평가하지만 motion blur / sequential frames / easing 흔적도 추론하여 채점.
const TYPO_MOTION_SEED = [
  { id: "impression",  name: "모션 임팩트",          weight: 10, maxScore: 100, description: "키프레임 한 장에서도 모션의 박력/매력이 전달되는지. Hollywood title sequence 의 한 컷 같은지." },
  { id: "concept",     name: "콘셉트 표현",          weight: 10, maxScore: 100, description: "분위기/장르(다크/팝/하이테크)가 모션 전반에서 일관되게 전달되는지." },
  { id: "layout",      name: "카메라 무빙",          weight: 8,  maxScore: 100, description: "카메라 움직임의 안정성. 의도 없는 zoom/drift 가 없고 의도한 동선과 부합하는지." },
  { id: "typography",  name: "형태 안정성",          weight: 14, maxScore: 100, description: "모션 중에도 글자 외곽이 흔들리거나 변형되지 않는지. wobble/morph/melting 없는지." },
  { id: "color",       name: "컬러 그레이딩",        weight: 8,  maxScore: 100, description: "시네마틱 컬러 룩. 모션 중 색상이 자연스럽게 흐르는지." },
  { id: "readability", name: "모션 중 가독성",       weight: 10, maxScore: 100, description: "움직이는 동안에도 텍스트가 읽히는지. 모션 블러/이펙트가 가독성을 해치지 않는지." },
  { id: "brand",       name: "모션 리듬",            weight: 10, maxScore: 100, description: "easing 곡선과 박자감. 기계적이지 않고 살아있는 움직임의 흔적이 보이는지." },
  { id: "flow",        name: "타이밍 (호흡)",        weight: 12, maxScore: 100, description: "등장/유지/퇴장의 호흡. 시작이 너무 갑작스럽거나 끝이 어색하지 않은지." },
  { id: "detail",      name: "기술 품질",            weight: 8,  maxScore: 100, description: "압축 아티팩트/깜빡임/프레임 드롭 없음. 색 번짐이나 코덱 이슈 없는지." },
  { id: "conversion",  name: "루프/이펙트 완성도",   weight: 10, maxScore: 100, description: "무한 반복일 경우 시작/끝점 연결의 자연스러움 + 파티클이 프레임을 이탈하지 않는지." },
];

const SEEDS = {
  [CRITERIA_TYPES.banner]:     { items: BANNER_SEED,       name: "v1.0 (시드)" },
  [CRITERIA_TYPES.promotion]:  { items: PROMOTION_SEED,    name: "v1.0 (시드)" },
  [CRITERIA_TYPES.brandweb]:   { items: BRANDWEB_SEED,     name: "v1.0 (시드)" },
  [CRITERIA_TYPES.prompt]:     { items: PROMPT_SEED,       name: "v1.0 (시드)" },
  [CRITERIA_TYPES.typo2d]:     { items: TYPO2D_SEED,       name: "v1.0 (시드)" },
  [CRITERIA_TYPES.typoRender]: { items: TYPO_RENDER_SEED,  name: "v1.0 (시드)" },
  [CRITERIA_TYPES.typoMotion]: { items: TYPO_MOTION_SEED,  name: "v1.0 (시드)" },
};

const versionsCol = (type) => collection(db, "evaluationCriteria", type, "versions");

// ─── 마이그레이션 ──────────────────────────────────────
// 각 type 의 versions 컬렉션이 비어있으면 시드를 v1.0(active) 로 추가.
// 한 번만 실행되도록 호출부에서 가드 (sessionStorage 또는 첫 admin 진입 시점).
export async function migrateInitialCriteria() {
  const result = { seeded: [], skipped: [], failed: [] };
  for (const type of Object.values(CRITERIA_TYPES)) {
    try {
      const snap = await getDocs(query(versionsCol(type), limit(1)));
      if (!snap.empty) { result.skipped.push(type); continue; }
      const seed = SEEDS[type];
      if (!seed || seed.items.length === 0) {
        // 빈 시드라도 placeholder 빈 버전으로 마킹해두어 다음 실행에서 또 시도하지 않게 함
        await addDoc(versionsCol(type), {
          name: seed?.name || "v1.0 (빈 시드)",
          isActive: true,
          note: "초기 빈 버전. NexusAdmin 에서 항목을 추가하세요.",
          criteria: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(versionsCol(type), {
          name: seed.name,
          isActive: true,
          note: "초기 버전 (앱 하드코딩에서 자동 마이그레이션)",
          criteria: seed.items,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      result.seeded.push(type);
    } catch (e) {
      console.error(`[evaluationCriteria] migrate failed for type=${type}`, e);
      result.failed.push({ type, error: e.message });
    }
  }
  return result;
}

// ─── 활성 버전 조회 ────────────────────────────────────
// 활성 버전이 없으면 가장 최근 버전 fallback. 둘 다 없으면 null.
export async function fetchActiveCriteria(type) {
  try {
    // 1) isActive == true
    const q1 = query(versionsCol(type), where("isActive", "==", true), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const d = snap1.docs[0];
      return { id: d.id, ...d.data() };
    }
    // 2) fallback — 아무 버전이나 1개
    const snap2 = await getDocs(query(versionsCol(type), limit(50)));
    if (snap2.empty) return null;
    // createdAt 기준 최신 것
    const all = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
    all.sort((a, b) => {
      const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bt - at;
    });
    return all[0];
  } catch (e) {
    console.warn(`[evaluationCriteria] fetchActive(${type}) failed`, e);
    return null;
  }
}

// ─── 시드(fallback) 직접 노출 ───────────────────────────
// Firestore 실패 시 앱이 안전하게 fallback 으로 사용.
export function getSeedCriteria(type) {
  return SEEDS[type]?.items || [];
}

// ─── 프롬프트용 포맷터 ───────────────────────────────
// Gemini 프롬프트 안에 그대로 끼워 넣을 수 있는 마크다운 형태의 항목 리스트.
//   "1. (id) 라벨 [N%]
//       · description"
export function formatCriteriaList(items) {
  if (!Array.isArray(items) || items.length === 0) return "(평가 항목 없음)";
  return items.map((c, i) => {
    const w = (typeof c.weight === "number" && !Number.isNaN(c.weight)) ? `[${c.weight}%]` : "";
    const desc = c.description ? `\n     · ${c.description}` : "";
    return `${i + 1}. (${c.id}) ${c.name} ${w}${desc}`.trim();
  }).join("\n");
}

// ─── 가중치/라벨 맵 ─────────────────────────────────
// 점수 합산이나 UI 라벨에 쓰기 위한 맵 변환.
export function weightsMap(items) {
  const out = {};
  (items || []).forEach(c => { if (c.id) out[c.id] = Number(c.weight) || 0; });
  return out;
}
export function labelsMap(items) {
  const out = {};
  (items || []).forEach(c => { if (c.id) out[c.id] = c.name || c.id; });
  return out;
}
