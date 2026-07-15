// 운명 관측소 — 본체(index.jsx)와 AI 섹션(AiSections.jsx)이 함께 쓰는 토큰·데이터.
// (컴포넌트 조각 Panel/Eyebrow 는 ./ui.jsx — react-refresh 규칙상 상수와 파일 분리)

/* ───────── 토큰 — 브루탈리스트 에디토리얼(블랙×크림×오렌지×코랄), 의도적 독자 팔레트 ─────────
   키 이름(gold/goldSoft 등)은 리스킨 전 역할명 그대로 유지 — 호출부 전면 수정 회피.
   gold=주황(CTA/액센트), goldSoft=코랄(강조 텍스트). */
export const C = {
  bg: "#161614", bg2: "#201F1C", panel: "#1D1C19",
  gold: "#F5870F", goldSoft: "#F04E45", ink: "#E9E4D6", dim: "#8F8A7E",
  line: "rgba(233,228,214,0.16)",
  목: "#3FA98A", 화: "#F04E45", 토: "#D2A24B", 금: "#C6CEDE", 수: "#4C74C4",
};

export const OH_GLYPH = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

// 오행을 일상어로: n=쉬운 이름, v=한 줄 느낌
export const OH_EASY = {
  목: { n: "새싹", v: "새로운 걸 시작하고 쭉쭉 뻗어나가는" },
  화: { n: "불꽃", v: "밝고 뜨겁게 타오르며 사람들과 어울리는" },
  토: { n: "땅", v: "든든하게 중심을 잡고 꾸준히 밀고 가는" },
  금: { n: "칼", v: "딱 부러지게 결정하고 깔끔하게 정리하는" },
  수: { n: "물", v: "깊이 생각하고 유연하게 흐르는" },
};

export const LUCK_COLOR = {
  목: { name: "초록 · 청록", hex: ["#3FA98A", "#2E7D5B", "#8ED0B4"] },
  화: { name: "빨강 · 자주", hex: ["#E0654A", "#C0392B", "#A83B63"] },
  토: { name: "노랑 · 베이지 · 황토", hex: ["#D2A24B", "#CBB682", "#E6D2A0"] },
  금: { name: "화이트 · 실버 · 골드", hex: ["#ECEEF3", "#C6CEDE", "#D4AF37"] },
  수: { name: "블랙 · 네이비", hex: ["#1B2233", "#2C3E6B", "#4C74C4"] },
};

export const inp = { flex: 1, padding: "13px 14px", border: `1px solid ${C.line}`, background: "rgba(24,24,22,0.7)", color: C.ink, fontFamily: "'Noto Sans KR',sans-serif", fontSize: 15, colorScheme: "dark" };

/* ───────── 명식 요약 — AI 프롬프트 공통 주입 블록 (순수 포매터) ─────────
   services/gemini.js 가 아닌 여기 두는 이유: services 는 lib/gemini(→firebase) 를 끌고 와
   독립 PWA 번들에 섞이면 안 되고, 이 함수는 의존성 없는 순수 문자열 조립이라서. */
export function buildChartBrief(d) {
  const L = [];
  L.push(`아키타입: 「${d.coined}」 · MBTI×혈액형 시너지 ${d.synergy}`);
  L.push(`기본: ${d.mbti}(${d.mbtiName}) · ${d.blood}형 · ${d.gender} · ${d.zodiac} · ${d.tti}띠 · 생일 ${d.birth}`);
  L.push(`사주(간이 만세력): ${d.pillars} — 일간 ${d.ilOh} · ${d.strength}(일간 지원 기운 ${d.ratioPct}%)`);
  L.push(`오행 분포(가중치 포함): ${d.dist}`);
  L.push(`억부용신: 용신 ${d.yong} / 희신 ${d.hee} / 한신 ${d.han} / 구신 ${d.gu} / 기신 ${d.gi} — ${d.reason}`);
  L.push(`십성 오행: ${d.sip}`);
  L.push(`성향 상위 3: ${d.topTraits}`);
  L.push(`다섯 갈래 운(십성 환산): ${d.cats}`);
  L.push(`대운: ${d.daewoon}`);
  L.push(`인생 12궁 요약: 가장 잘 풀림=${d.bestGung} · 주의=${d.warnGung}`);
  L.push(`삼재: ${d.samjae}`);
  if (d.petLine) L.push(`반려동물 풀이: ${d.petLine}`);
  if (d.relLine) L.push(`관계 풀이: ${d.relLine}`);
  if (d.lifeLine) L.push(`취미·공간 풀이: ${d.lifeLine}`);
  if (d.nameLine) L.push(`이름 풀이: ${d.nameLine}`);
  return L.join("\n");
}
