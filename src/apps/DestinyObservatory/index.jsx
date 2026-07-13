import { useState } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine, Legend,
} from "recharts";
import { useUsageGate } from "../../components/UsageGate";
import { buildChartBrief, generateOracleSummary, askOracle, generateTarotReading, generateTalisman } from "./services/gemini";

/* ═══════════════════════ 토큰 ═══════════════════════ */
// 앱 고유의 신비주의 무드(네이비×골드) — 글로벌 테마 토큰 대신 의도적 독자 팔레트.
const C = {
  bg: "#0C0F2B", bg2: "#12173C", panel: "rgba(28,35,78,0.55)",
  gold: "#C9A24B", goldSoft: "#E7CB84", ink: "#ECE7D8", dim: "#8B90BC",
  line: "rgba(201,162,75,0.20)",
  목: "#3FA98A", 화: "#E0654A", 토: "#D2A24B", 금: "#C6CEDE", 수: "#4C74C4",
};
const OH_GLYPH = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const OH_ORDER = ["목", "화", "토", "금", "수"];
const OH_DESC = {
  목: "성장·확장·기획의 기운", 화: "열정·표현·관계의 기운",
  토: "안정·신뢰·중심의 기운", 금: "원칙·결단·정제의 기운", 수: "지혜·직관·유연의 기운",
};
// 오행을 일상어로: n=쉬운 이름, v=한 줄 느낌
const OH_EASY = {
  목: { n: "새싹", v: "새로운 걸 시작하고 쭉쭉 뻗어나가는" },
  화: { n: "불꽃", v: "밝고 뜨겁게 타오르며 사람들과 어울리는" },
  토: { n: "땅", v: "든든하게 중심을 잡고 꾸준히 밀고 가는" },
  금: { n: "칼", v: "딱 부러지게 결정하고 깔끔하게 정리하는" },
  수: { n: "물", v: "깊이 생각하고 유연하게 흐르는" },
};
const REMEDY = {
  목: { 색: "초록·청록", 방위: "동쪽", 음식: "신맛 · 새싹채소 · 보리", 활동: "아침 산책 · 새로운 배움 · 식물 기르기", 소재: "목재 가구 · 화분 · 책" },
  화: { 색: "빨강·자주", 방위: "남쪽", 음식: "쓴맛 · 붉은 음식(대추·토마토)", 활동: "햇빛 쬐기 · 사람 만나기 · 유산소 운동", 소재: "조명 · 촛불 · 붉은 소품" },
  토: { 색: "노랑·황토·베이지", 방위: "중앙", 음식: "단맛 · 곡물(고구마·호박)", 활동: "규칙적 생활 · 명상 · 정리정돈", 소재: "도자기 · 흙 · 사각 물건" },
  금: { 색: "흰색·은색·금색", 방위: "서쪽", 음식: "매운맛 · 흰 음식(무·배·마늘)", 활동: "미니멀 정리 · 규율 루틴 · 호흡 운동", 소재: "금속 · 유리 · 원형 물건" },
  수: { 색: "검정·남색", 방위: "북쪽", 음식: "짠맛 · 검은 음식(검은콩·미역) · 충분한 물", 활동: "충분한 휴식 · 수영·목욕 · 사색·독서", 소재: "물 · 거울 · 곡선 물건" },
};
const PERSON = {
  목: { t: "성장과 확장의 사람", d: "늘 새 것을 기획하고 미래를 그리는 비전형(전략가·변론가 기질, B형). 정체된 흐름에 뻗어나갈 길을 열어줍니다." },
  화: { t: "열정과 표현의 사람", d: "밝고 사교적이며 분위기를 데우는 활동형(사업가·연예인 기질, O형). 식은 에너지에 불을 지펴줍니다." },
  토: { t: "신뢰와 중심의 사람", d: "듬직하고 약속을 지키는 안정형(현실주의자·경영자 기질). 흔들릴 때 단단히 붙들어줍니다." },
  금: { t: "원칙과 결단의 사람", d: "냉철하고 정돈된 판단형(A형, 사고(T)형 기질). 흐릿한 결정을 날카롭게 벼려줍니다." },
  수: { t: "지혜와 통찰의 사람", d: "깊이 사색하고 본질을 꿰뚫는 직관형(옹호자·중재자 기질, AB형). 조급함을 깊고 유연하게 다스려줍니다." },
};
const PERSON_MBTI = {
  목: ["ENTP", "INTP", "ENTJ", "INTJ"],
  화: ["ESFP", "ESTP", "ENFP", "ISFP"],
  토: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"],
  금: ["ESTJ", "ISTP", "INTJ", "ENTJ"],
  수: ["INFJ", "INFP", "ENFJ", "INTP"],
};
const LUCK_COLOR = {
  목: { name: "초록 · 청록", hex: ["#3FA98A", "#2E7D5B", "#8ED0B4"] },
  화: { name: "빨강 · 자주", hex: ["#E0654A", "#C0392B", "#A83B63"] },
  토: { name: "노랑 · 베이지 · 황토", hex: ["#D2A24B", "#CBB682", "#E6D2A0"] },
  금: { name: "화이트 · 실버 · 골드", hex: ["#ECEEF3", "#C6CEDE", "#D4AF37"] },
  수: { name: "블랙 · 네이비", hex: ["#1B2233", "#2C3E6B", "#4C74C4"] },
};
const EXERCISE = {
  목: "요가 · 필라테스 · 등산 · 클라이밍 — 몸을 길게 뻗고 유연하게 쓰는 운동",
  화: "러닝 · 댄스 · 스피닝 · 팀 스포츠 — 땀 흠뻑 나는 역동적 유산소",
  토: "걷기 · 골프 · 코어·웨이트 루틴 — 꾸준히 쌓는 근력·중심 운동",
  금: "복싱 · 무술 · 플랭크 · 호흡 트레이닝 — 절도 있고 집중되는 운동",
  수: "수영 · 아쿠아로빅 · 스트레칭 · 명상 요가 — 물과 이완 중심의 운동",
};
const HABIT = {
  목: "아침 햇살 쬐기 · 화분 가꾸기 · 새로운 것 배우기 · 나무 많은 길 산책",
  화: "사람들과 자주 어울리기 · 밝은 조명 · 웃고 표현하기 · 활동적인 취미",
  토: "규칙적인 생활 루틴 · 정리정돈 · 제때 식사 · 꾸준한 습관 하나 만들기",
  금: "공간 미니멀하게 비우기 · 깊은 호흡·명상 · 하루 마무리 루틴 · 계획 세우기",
  수: "충분한 수면 · 물 자주 마시기 · 조용한 사색·독서 · 반신욕으로 이완",
};

/* ═══════════════════════ 상수 데이터 ═══════════════════════ */
const TRAITS = ["리더십", "창의력", "사교성", "안정감", "직관력", "열정"];
const MBTI_NAME = {
  INTJ: "전략가", INTP: "논리술사", ENTJ: "통솔자", ENTP: "변론가",
  INFJ: "옹호자", INFP: "중재자", ENFJ: "선도자", ENFP: "활동가",
  ISTJ: "현실주의자", ISFJ: "수호자", ESTJ: "경영자", ESFJ: "집정관",
  ISTP: "장인", ISFP: "모험가", ESTP: "사업가", ESFP: "연예인",
};
const BLOOD = {
  A: { adj: "신중하게 벼리는", el: "금" },
  B: { adj: "자유롭게 뻗는", el: "목" },
  O: { adj: "뜨겁게 밀어붙이는", el: "화" },
  AB: { adj: "차갑게 꿰뚫는", el: "수" },
};
const ZODIAC = [
  { n: "염소자리", sym: "♑", we: "땅", from: [12, 22], to: [1, 19] },
  { n: "물병자리", sym: "♒", we: "공기", from: [1, 20], to: [2, 18] },
  { n: "물고기자리", sym: "♓", we: "물", from: [2, 19], to: [3, 20] },
  { n: "양자리", sym: "♈", we: "불", from: [3, 21], to: [4, 19] },
  { n: "황소자리", sym: "♉", we: "땅", from: [4, 20], to: [5, 20] },
  { n: "쌍둥이자리", sym: "♊", we: "공기", from: [5, 21], to: [6, 21] },
  { n: "게자리", sym: "♋", we: "물", from: [6, 22], to: [7, 22] },
  { n: "사자자리", sym: "♌", we: "불", from: [7, 23], to: [8, 22] },
  { n: "처녀자리", sym: "♍", we: "땅", from: [8, 23], to: [9, 22] },
  { n: "천칭자리", sym: "♎", we: "공기", from: [9, 23], to: [10, 22] },
  { n: "전갈자리", sym: "♏", we: "물", from: [10, 23], to: [11, 22] },
  { n: "사수자리", sym: "♐", we: "불", from: [11, 23], to: [12, 21] },
];
const WE_TO_OH = { 불: "화", 땅: "토", 물: "수", 공기: "목" };
// 생활 환경의 기운(형기론): 주변 형세를 오행 흐름으로 환산
const ENV_Q = [
  { key: "water", label: "가까이에 물(강·바다·호수·하천)이", opts: [["바로 곁", "수", 2], ["보이는 거리", "수", 1], ["거의 없음", null, 0]] },
  { key: "trees", label: "주변 초목(숲·공원·산·가로수)이", opts: [["울창하다", "목", 2], ["어느 정도", "목", 1], ["거의 없음", null, 0]] },
  { key: "elev", label: "사는 곳의 지대·높이는", opts: [["높다·전망 트임", "화", 1.5], ["평지·중간", "토", 1.5], ["낮다·분지", "수", 1]] },
  { key: "stone", label: "주변 바위·산·도심(금속) 기운이", opts: [["강하다", "금", 1.5], ["보통", "금", 0.8], ["약하다", null, 0]] },
];
const ENV_WORD = { 수: "물길", 목: "초목", 화: "높은 양지", 토: "너른 땅", 금: "바위·도심" };
// 반려동물 종류 → 오행 기운
const PET_EL = { 고양이: "수", 강아지: "화", 기타: "목" };
const PET_EL_DESC = { 고양이: "고요하고 유연한 물(水)", 강아지: "활동적이고 따뜻한 불(火)", 기타: "생기 도는 새싹(木)" };
// 취미 → 오행
const HOBBY = [
  ["운동·스포츠", "화"], ["등산·자연", "목"], ["독서·사색", "수"], ["그림·음악·창작", "목"],
  ["여행·모임", "화"], ["요리·베이킹", "화"], ["명상·요가", "수"], ["수집·정리·공예", "금"],
  ["원예·식물", "목"], ["게임·디지털", "금"],
];
// 집안 그림·인테리어 → 오행(풍수)
const ART = [
  ["산수화(산·강)", "수"], ["꽃·나무 그림", "목"], ["해·노을·붉은 그림", "화"],
  ["도시·금속·기하 추상", "금"], ["들판·대지·흙빛", "토"],
];
// 자미두수 12궁 (틀을 빌려 오행·십성으로 풀이)
const GUNG = [
  ["명궁", "命", "나·기질", "비겁"], ["형제궁", "兄", "형제·동료", "비겁"],
  ["부처궁", "夫", "배우자·연애", "배우자"], ["자녀궁", "子", "자녀·창작물", "식상"],
  ["재백궁", "財", "재물·수입", "재성"], ["질액궁", "疾", "건강·몸", "기신"],
  ["천이궁", "遷", "이동·바깥일", "식상"], ["교우궁", "友", "친구·인맥", "비겁"],
  ["관록궁", "官", "일·명예", "관성"], ["전택궁", "宅", "집·안식처", "인성"],
  ["복덕궁", "福", "복·마음", "인성"], ["부모궁", "父", "부모·윗사람", "인성"],
];
// 타로 메이저 아르카나 22장 (직접 작성한 오늘의 조언)
const TAROT = [
  ["0", "바보", "새로운 시작·순수", "계획보다 일단 한 발 떼봐요. 서툴러도 괜찮은 날."],
  ["I", "마법사", "실행력·재능", "마음먹은 걸 실제로 시작하기 딱 좋은 날."],
  ["II", "여사제", "직관·숨은 진실", "논리보다 직감을 믿어도 좋아요."],
  ["III", "여황제", "풍요·돌봄", "나를 다정하게 챙기고 누리는 하루."],
  ["IV", "황제", "질서·주도", "원칙대로 밀어붙이면 통하는 날."],
  ["V", "교황", "조언·전통", "경험자의 말 한마디에 힌트가 있어요."],
  ["VI", "연인", "선택·관계", "머리보다 마음이 끌리는 쪽을 택해요."],
  ["VII", "전차", "돌파·의지", "망설이지 말고 밀어붙이면 이기는 날."],
  ["VIII", "힘", "인내·부드러운 용기", "서두르지 말고 온화하게, 그게 진짜 힘."],
  ["IX", "은둔자", "성찰·고요", "잠시 물러나 혼자 정리하는 시간이 필요해요."],
  ["X", "운명의 수레바퀴", "전환·기회", "흐름이 바뀌는 날, 다가온 기회를 잡아요."],
  ["XI", "정의", "균형·공정", "정직하고 공정한 선택이 정답이에요."],
  ["XII", "매달린 사람", "관점 전환·멈춤", "반대로 뒤집어 보면 스르륵 풀려요."],
  ["XIII", "죽음", "끝과 새 시작", "낡은 하나를 놓아야 새것이 들어와요."],
  ["XIV", "절제", "조화·중용", "과하지도 모자라지도 않게 균형을."],
  ["XV", "악마", "유혹·집착", "놓지 못하고 붙든 게 뭔지 살펴봐요."],
  ["XVI", "탑", "급변·각성", "흔들려도 무너지는 건 낡은 것뿐이에요."],
  ["XVII", "별", "희망·치유", "작은 희망이 조용히 빛나는 날."],
  ["XVIII", "달", "불안·무의식", "흐릿할 땐 서두르지 말고 기다려요."],
  ["XIX", "태양", "성공·활기", "환하게 빛나는, 무엇을 해도 좋은 날!"],
  ["XX", "심판", "결단·부활", "미뤄둔 일을 이제 매듭지을 때."],
  ["XXI", "세계", "완성·성취", "하나의 사이클이 근사하게 마무리돼요."],
];
// 발음오행(초성 기준 성명학) · 운명수
const CHO_OH = ["목", "목", "화", "화", "화", "화", "수", "수", "수", "금", "금", "토", "금", "금", "금", "목", "화", "수", "토"];
const NUM_MEAN = { 1: "개척자 · 홀로 앞장서는 리더", 2: "조화자 · 함께일 때 빛나는 균형", 3: "표현가 · 밝고 창의적인 에너지", 4: "성실가 · 단단히 쌓는 안정", 5: "자유인 · 변화와 모험을 즐김", 6: "돌봄가 · 따뜻하게 품는 책임", 7: "탐구자 · 깊이 파고드는 지혜", 8: "성취가 · 크게 이루는 야망", 9: "완성자 · 넓게 품는 이상" };
function nameElements(name) {
  const dist = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }; let hangul = 0;
  for (const ch of (name || "")) { const code = ch.charCodeAt(0) - 0xAC00; if (code >= 0 && code < 11172) { dist[CHO_OH[Math.floor(code / 588)]]++; hangul++; } }
  return { dist, hangul };
}
function destinyNumber(name) { let s = 0; for (const ch of (name || "")) s += ch.charCodeAt(0); return (s % 9) + 1; }

const GAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const JI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const TTI = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
// 삼재: 삼합 그룹별 삼재 시작 지지 — 신자진(원숭이·쥐·용)→寅, 사유축(뱀·닭·소)→亥, 인오술(범·말·개)→申, 해묘미(돼지·토끼·양)→巳
const SAMJAE_START = { 8: 2, 0: 2, 4: 2, 5: 11, 9: 11, 1: 11, 2: 8, 6: 8, 10: 8, 11: 5, 3: 5, 7: 5 };
function samjaeInfo(yJiI, nowYear) {
  const start = SAMJAE_START[yJiI];
  const nowJi = ((nowYear - 4) % 12 + 12) % 12;
  const pos = ((nowJi - start) % 12 + 12) % 12; // 0=들, 1=눌, 2=날
  const inSamjae = pos <= 2;
  let nextStart = nowYear + (((start - nowJi) % 12) + 12) % 12;
  if (inSamjae) nextStart = nowYear - pos;
  const phase = ["들삼재(드는 해)", "눌삼재(머무는 해)", "날삼재(나가는 해)"][pos] || "";
  return { inSamjae, phase, years: [nextStart, nextStart + 1, nextStart + 2] };
}
const GAN_OH = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
const JI_OH = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];
const GAN_YY = (i) => (i % 2 === 0 ? "양" : "음");

/* ═══════════════════════ 사주 계산 ═══════════════════════ */
const mod = (n, m) => ((n % m) + m) % m;
const daysBetween = (y1, m1, d1, y2, m2, d2) => Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
const ANCHOR = jdn(2024, 1, 1); // 갑자일 (만세력 대조 검증)
const TERM_START = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7];
const MONTH_BRANCH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];

function computeSaju(y, m, d, hour) {
  const yYear = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y;
  const yGanI = mod(yYear - 4, 10), yJiI = mod(yYear - 4, 12);
  const mJiI = d >= TERM_START[m - 1] ? MONTH_BRANCH[m - 1] : MONTH_BRANCH[mod(m - 2, 12)];
  const posFromIn = mod(mJiI - 2, 12);
  const startGan = mod((yGanI % 5) * 2 + 2, 10);
  const mGanI = mod(startGan + posFromIn, 10);
  const dayIdx = mod(jdn(y, m, d) - ANCHOR, 60);
  const dGanI = dayIdx % 10, dJiI = dayIdx % 12;
  let hPillar = null;
  if (hour !== null && hour !== undefined && hour !== "") {
    const h = Number(hour);
    const hJiPos = Math.floor((mod(h + 1, 24)) / 2);
    const hStart = mod((dGanI % 5) * 2, 10);
    hPillar = { key: "시주", gan: GAN[mod(hStart + hJiPos, 10)], ji: JI[hJiPos], ganI: mod(hStart + hJiPos, 10), jiI: hJiPos };
  }
  const pillars = [
    { key: "년주", gan: GAN[yGanI], ji: JI[yJiI], ganI: yGanI, jiI: yJiI },
    { key: "월주", gan: GAN[mGanI], ji: JI[mJiI], ganI: mGanI, jiI: mJiI },
    { key: "일주", gan: GAN[dGanI], ji: JI[dJiI], ganI: dGanI, jiI: dJiI },
  ];
  if (hPillar) pillars.push(hPillar);

  const dist = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  pillars.forEach((p) => { dist[GAN_OH[p.gan]]++; dist[JI_OH[p.jiI]]++; });
  let yang = 0, eum = 0;
  pillars.forEach((p) => {
    (GAN_YY(p.ganI) === "양" ? yang++ : eum++);   // 천간 음양
    (p.jiI % 2 === 0 ? yang++ : eum++);            // 지지 음양(자·인·진·오·신·술=양)
  });

  return {
    yYear, tti: TTI[yJiI], yJiI, pillars, dist, yang, eum,
    yGanI, yGanYY: GAN_YY(yGanI),
    dominant: OH_ORDER.reduce((a, b) => (dist[b] > dist[a] ? b : a)),
  };
}

function computeDaewoon(saju, gender, y, m, d) {
  const forward = (saju.yGanYY === "양" && gender === "남") || (saju.yGanYY === "음" && gender === "여");
  // 절입일 근사(각 월 TERM_START). 순행=다음 절입까지, 역행=이전 절입부터의 일수 ÷ 3 = 대운수
  let days;
  const passed = d >= TERM_START[m - 1]; // 이번 달 절기에 들어섰는가
  if (forward) {
    if (passed) { const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y; days = daysBetween(y, m, d, ny, nm, TERM_START[nm - 1]); }
    else { days = daysBetween(y, m, d, y, m, TERM_START[m - 1]); }
  } else {
    if (passed) { days = daysBetween(y, m, TERM_START[m - 1], y, m, d); }
    else { const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y; days = daysBetween(py, pm, TERM_START[pm - 1], y, m, d); }
  }
  const su = Math.max(1, Math.min(10, Math.round(Math.abs(days) / 3) || 1));
  const mp = saju.pillars[1];
  const list = [];
  for (let i = 1; i <= 8; i++) {
    const g = mod(mp.ganI + (forward ? i : -i), 10);
    const j = mod(mp.jiI + (forward ? i : -i), 12);
    list.push({ age: su + (i - 1) * 10, gan: GAN[g], ji: JI[j], oh: GAN_OH[GAN[g]] });
  }
  return { forward, su, list };
}

/* ═══════════════════════ 정통 억부용신 (신강/신약) ═══════════════════════ */
function computeYongsin(saju) {
  const ilOh = GAN_OH[saju.pillars[2].gan]; // 일간 오행 = 나
  const di = OH_ORDER.indexOf(ilOh);
  const 비겁 = ilOh;                    // 나와 같은 오행
  const 인성 = OH_ORDER[(di + 4) % 5];  // 나를 生하는 오행
  const 식상 = OH_ORDER[(di + 1) % 5];  // 내가 生하는 오행
  const 재성 = OH_ORDER[(di + 2) % 5];  // 내가 剋하는 오행
  const 관성 = OH_ORDER[(di + 3) % 5];  // 나를 剋하는 오행
  const tenGod = (E) => E === 비겁 ? "비겁" : E === 인성 ? "인성" : E === 식상 ? "식상" : E === 재성 ? "재성" : "관성";
  // 강약 점수: 월지 최고 가중(득령), 일지·타지지·천간 순
  const W_JI = { 년: 1.5, 월: 3, 일: 2, 시: 1.5 };
  let support = 0, total = 0;
  const g = { 비겁: 0, 인성: 0, 식상: 0, 재성: 0, 관성: 0 };
  saju.pillars.forEach((p) => {
    const jw = W_JI[p.key[0]] ?? 1.5, je = JI_OH[p.jiI];
    total += jw; g[tenGod(je)] += jw; if (je === 비겁 || je === 인성) support += jw;
    if (p.key !== "일주") { const ge = GAN_OH[p.gan]; total += 1; g[tenGod(ge)] += 1; if (ge === 비겁 || ge === 인성) support += 1; }
  });
  const ratio = support / total;
  const strength = ratio >= 0.55 ? "신강" : ratio <= 0.45 ? "신약" : "중화";
  const strong = ratio >= 0.5;
  let yong, reason;
  if (strong) {
    if (g.인성 >= g.비겁) { yong = 재성; reason = `일간(${ilOh})이 인성으로 강해져, 재성 「${재성}」으로 인성을 덜어 균형을 잡습니다`; }
    else { yong = 관성; reason = `일간(${ilOh})이 비겁으로 강해져, 관성 「${관성}」으로 눌러 균형을 잡습니다`; }
  } else {
    const drain = [["식상", g.식상], ["재성", g.재성], ["관성", g.관성]].sort((a, b) => b[1] - a[1])[0][0];
    if (drain === "재성") { yong = 비겁; reason = `일간(${ilOh})이 재성에 기운을 빼앗겨 약하니, 비겁 「${비겁}」으로 힘을 보탭니다`; }
    else { yong = 인성; const w = drain === "관성" ? "관성에 눌려" : "식상에 설기되어"; reason = `일간(${ilOh})이 ${w} 약하니, 인성 「${인성}」으로 일간을 돕습니다`; }
  }
  const yi = OH_ORDER.indexOf(yong);
  const hee = OH_ORDER[(yi + 4) % 5];                       // 희신: 용신을 生하는 오행
  const gi = OH_ORDER[(yi + 3) % 5];                        // 기신: 용신을 剋하는 오행
  const gu = OH_ORDER[(OH_ORDER.indexOf(gi) + 4) % 5];      // 구신: 기신을 生하는 오행
  const han = OH_ORDER.find((e) => ![yong, hee, gi, gu].includes(e)); // 한신: 나머지
  const decisive = Math.min(1, Math.abs(ratio - 0.5) / 0.12); // 신강/신약이 얼마나 뚜렷한가
  const sip = { 비겁, 인성, 식상, 재성, 관성 }; // 일간 기준 십성 오행
  return { ilOh, strength, ratio, decisive, yong, hee, gi, gu, han, reason, sip };
}

/* ═══════════════════════ 융합 엔진 ═══════════════════════ */
function relation(a, b) {
  if (a === b) return "비화";
  const ia = OH_ORDER.indexOf(a), ib = OH_ORDER.indexOf(b);
  if ((ia + 1) % 5 === ib || (ib + 1) % 5 === ia) return "상생";
  return "상극";
}
function mbtiElement(t) {
  const isN = t[1] === "N", isF = t[2] === "F", isJ = t[3] === "J";
  if (isN && isF) return "수"; if (isN && !isF) return "목";
  if (!isN && isJ) return "토"; return "화";
}
const WORD = {
  목: { adj: ["움트는", "굽이쳐 뻗는", "우거진", "새벽을 여는"], noun: ["숲", "여명", "청람(靑嵐)", "넝쿨길"] },
  화: { adj: ["타오르는", "노을 진", "이글대는", "저물녘 붉은"], noun: ["노을", "불꽃", "화톳불", "잔불"] },
  토: { adj: ["굳건히 잠긴", "너른", "묵직한", "오래 다져진"], noun: ["반석", "능선", "너른 들", "언덕"] },
  금: { adj: ["벼려진", "서슬 푸른", "정갈한", "서리 어린"], noun: ["칼날", "서리", "백금(白金)", "달빛 검"] },
  수: { adj: ["깊은", "잔잔히 스미는", "굽이도는", "달빛 어린"], noun: ["심연", "물길", "여울", "먼 강"] },
};
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
const clamp = (v) => Math.max(4, Math.min(99, Math.round(v)));

function fuse({ mbti, blood, zodiac, saju, env, gender, birth, hour }) {
  const eMbti = mbtiElement(mbti), eBlood = BLOOD[blood].el, eZod = WE_TO_OH[zodiac.we], eSaju = saju.dominant;

  // 타고난 기운(사주 팔자 + MBTI·혈액형·별자리) — 환경과 분리
  const dist = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  OH_ORDER.forEach((k) => (dist[k] = saju.dist[k]));
  dist[eMbti] += 0.5; dist[eBlood] += 0.8; dist[eZod] += 1.4; // MBTI는 성향 레이더 중심, 오행 분포엔 최소만
  // 환경 기운(형기): 별도 집계 — 타고난 분포에는 섞지 않음
  const envAdd = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  ENV_Q.forEach((q) => { const o = q.opts[env[q.key]]; if (o && o[1]) envAdd[o[1]] += o[2]; });
  const envMain = OH_ORDER.reduce((a, b) => (envAdd[b] > envAdd[a] ? b : a));
  const envMainHas = envAdd[envMain] > 0 ? envMain : null;

  const dominant = OH_ORDER.reduce((a, b) => (dist[b] > dist[a] ? b : a));
  const deficient = OH_ORDER.reduce((a, b) => (dist[b] < dist[a] ? b : a));
  const ys = computeYongsin(saju); // 정통 억부용신 (사주 원국 기준)

  const sysEl = { MBTI: eMbti, 혈액형: eBlood, 별자리: eZod, 사주: eSaju };
  const keys = Object.keys(sysEl);
  let sang = 0, geuk = 0; const rels = [];
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const r = relation(sysEl[keys[i]], sysEl[keys[j]]);
      if (r === "상생") sang++; else if (r === "상극") geuk++;
      rels.push({ a: keys[i], b: keys[j], r });
    }
  const harmony = clamp(58 + (sang - geuk) * 9);

  const mbRel = relation(eMbti, eBlood);
  const synergy =
    mbRel === "비화" ? { t: "증폭형", d: "두 기운이 같은 방향으로 겹쳐 강점이 극대화되지만 편중도 커집니다." } :
    mbRel === "상생" ? { t: "조화형", d: "혈액형의 기질이 성격 유형을 자연스럽게 북돋아 안정적으로 발현됩니다." } :
    { t: "긴장형", d: "두 기운이 서로를 견제해 내적 갈등이 있지만, 조율되면 가장 입체적인 사람이 됩니다." };

  const nrnd = hashStr(`${blood}${birth}${gender}${hour}`); // MBTI 제외 → 이름이 MBTI에 흔들리지 않음
  const coined = `${pick(WORD[ys.yong].adj, nrnd())} ${pick(WORD[eSaju].noun, nrnd())}`;
  const persona = personality(mbti, blood, zodiac.we, eSaju, dominant, deficient);

  const seed = hashStr(`${mbti}|${blood}|${birth}|${hour}|${gender}|${Object.values(env).join("")}`);
  // 재물·직업·표현·인덕·활력을 개인 일간의 십성 오행으로 계산
  const CAT_SIP = [["재물운", "재성"], ["직업운", "관성"], ["표현운", "식상"], ["인덕운", "인성"], ["활력운", "비겁"]];
  const cats = CAT_SIP.map(([name, sipKey]) => {
    const el = ys.sip[sipKey];
    let v = harmony * 0.5 + 32 + (seed() - 0.5) * 14;
    if (el === ys.yong) v += 12; else if (el === ys.hee) v += 6;
    else if (el === ys.gi) v -= 10; else if (el === ys.gu) v -= 5;
    return { name, value: clamp(v), el, sip: sipKey };
  });
  const base = harmony * 0.4 + 42;
  const months = Array.from({ length: 12 }, (_, i) => ({
    m: `${i + 1}월`, value: clamp(base + Math.sin(i / 12 * Math.PI * 2 + seed() * 6) * 15 + (seed() - 0.5) * 12),
  }));

  // 월별 재물·연애·건강 (그 달의 지지 오행이 용신·분야를 돕는지 + 개인 위상)
  const MONTH_JI_OH = ["토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수", "수"]; // 1~12월
  const CAT_EL = { 재물: "금", 연애: "화", 건강: "토" };
  const phase = { 재물: seed() * 6.28, 연애: seed() * 6.28, 건강: seed() * 6.28 };
  const monthlyCats = Array.from({ length: 12 }, (_, i) => {
    const mo = MONTH_JI_OH[i];
    const seasonal = (mo === ys.yong ? 8 : mo === ys.hee ? 4 : mo === ys.gi ? -6 : mo === ys.gu ? -3 : 0);
    const row = { m: `${i + 1}월` };
    for (const c of ["재물", "연애", "건강"]) {
      const ce = CAT_EL[c];
      let v = harmony * 0.34 + 40 + seasonal;
      const r = relation(mo, ce);
      v += mo === ce ? 7 : r === "상생" ? 3 : r === "상극" ? -5 : 0;
      v += Math.sin((i / 12) * Math.PI * 2 + phase[c]) * 11;
      row[c] = clamp(v);
    }
    return row;
  });

  return { eMbti, eBlood, eZod, eSaju, envAdd, envMainHas, sysEl, dist, dominant, deficient, ...ys, harmony, rels, synergy, coined, persona, cats, months, monthlyCats };
}

function personality(mbti, blood, we, eSaju, dom, def) {
  const t = { 리더십: 50, 창의력: 50, 사교성: 50, 안정감: 50, 직관력: 50, 열정: 50 };
  const src = { 리더십: [], 창의력: [], 사교성: [], 안정감: [], 직관력: [], 열정: [] };
  const add = (k, v, label) => { t[k] += v; if (v > 0 && label) src[k].push({ label, v }); };
  const [a, b, c, d] = mbti;
  a === "E" ? (add("사교성", 15, "MBTI(E)"), add("열정", 8, "MBTI(E)"), add("리더십", 5, "MBTI(E)")) : (add("안정감", 12, "MBTI(I)"), add("직관력", 10, "MBTI(I)"), add("사교성", -10));
  b === "N" ? (add("창의력", 15, "MBTI(N)"), add("직관력", 12, "MBTI(N)")) : (add("안정감", 10, "MBTI(S)"), add("리더십", 6, "MBTI(S)"), add("창의력", -6));
  c === "T" ? (add("리더십", 12, "MBTI(T)"), add("안정감", 5, "MBTI(T)"), add("사교성", -5)) : (add("사교성", 12, "MBTI(F)"), add("열정", 6, "MBTI(F)"), add("리더십", -4));
  d === "J" ? (add("안정감", 12, "MBTI(J)"), add("리더십", 8, "MBTI(J)"), add("창의력", -4)) : (add("창의력", 12, "MBTI(P)"), add("열정", 8, "MBTI(P)"), add("안정감", -6));
  ({ A: () => (add("안정감", 7, `${blood}형`), add("창의력", 2, `${blood}형`)), B: () => (add("창의력", 7, `${blood}형`), add("열정", 6, `${blood}형`)), O: () => (add("리더십", 7, `${blood}형`), add("사교성", 6, `${blood}형`)), AB: () => (add("직관력", 7, `${blood}형`), add("창의력", 4, `${blood}형`)) })[blood]();
  ({ 불: () => (add("열정", 12, "별자리(불)"), add("리더십", 8, "별자리(불)")), 땅: () => add("안정감", 12, "별자리(땅)"), 공기: () => (add("사교성", 10, "별자리(공기)"), add("창의력", 8, "별자리(공기)")), 물: () => (add("직관력", 12, "별자리(물)"), add("열정", 4, "별자리(물)")) })[we]();
  const ohTrait = { 목: "창의력", 화: "열정", 토: "안정감", 금: "리더십", 수: "직관력" };
  add(ohTrait[eSaju], 10, "사주"); add(ohTrait[dom], 6, "타고난 최다"); add(ohTrait[def], -6);
  return TRAITS.map((k) => ({ trait: k, value: clamp(t[k]), sources: src[k].sort((x, y) => y.v - x.v).slice(0, 2).map((s) => s.label) }));
}

function getZodiac(m, d) {
  for (const z of ZODIAC) {
    const [fm, fd] = z.from, [tm, td] = z.to;
    if (fm === 12) { if ((m === 12 && d >= fd) || (m === 1 && d <= td)) return z; }
    else if ((m === fm && d >= fd) || (m === tm && d <= td)) return z;
  }
  return ZODIAC[0];
}

/* ═══════════════════════ UI 조각 ═══════════════════════ */
function Panel({ children, style }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, backdropFilter: "blur(6px)", ...style }}>{children}</div>;
}
function Eyebrow({ children }) {
  return <div style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 11, letterSpacing: 3, color: C.gold, textTransform: "uppercase", marginBottom: 12 }}>{children}</div>;
}
function OhTag({ el }) {
  return <span style={{ color: C[el], fontFamily: "'Noto Sans KR', sans-serif" }}>{OH_GLYPH[el]}<span style={{ fontSize: 12, marginLeft: 2 }}>{el}</span></span>;
}
function Seg({ children, on, onClick, mono, serif, big }) {
  return <button onClick={onClick} style={{
    flex: 1, padding: big ? "14px 0" : "12px 0", borderRadius: 10, cursor: "pointer",
    fontFamily: mono ? "'Noto Sans KR',sans-serif" : serif ? "'Noto Sans KR',sans-serif" : "inherit",
    fontSize: big ? 18 : 16, fontWeight: 500,
    border: `1px solid ${on ? C.gold : C.line}`, background: on ? "rgba(201,162,75,0.14)" : "transparent",
    color: on ? C.goldSoft : C.dim, transition: "all .15s",
  }}>{children}</button>;
}
const inp = { flex: 1, padding: "13px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: "rgba(12,15,43,0.6)", color: C.ink, fontFamily: "'Noto Sans KR',sans-serif", fontSize: 15, colorScheme: "dark" };
const btnGold = { padding: "17px 0", borderRadius: 12, cursor: "pointer", border: "none", background: `linear-gradient(100deg, ${C.gold}, ${C.goldSoft})`, color: "#20180a", fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 2, boxShadow: "0 8px 28px rgba(201,162,75,0.25)" };
const tip = { background: "#0C0F2B", border: `1px solid ${C.line}`, borderRadius: 8, color: "#ECE7D8", fontFamily: "'Noto Sans KR',sans-serif", fontSize: 12 };

/* ═══════════════════════ 메인 ═══════════════════════ */
export default function App() {
  const [ei, setEi] = useState("E"), [ns, setNs] = useState("N"), [tf, setTf] = useState("F"), [jp, setJp] = useState("P");
  const [blood, setBlood] = useState("O");
  const [gender, setGender] = useState("남");
  const [birth, setBirth] = useState("1974-03-19");
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [env, setEnv] = useState({ water: 2, trees: 2, elev: 1, stone: 2 });
  const [pet, setPet] = useState("");
  const [rel, setRel] = useState("");
  const [petType, setPetType] = useState("");
  const [petCount, setPetCount] = useState("");
  const [hobbies, setHobbies] = useState([]);
  const [art, setArt] = useState("");
  const [phase, setPhase] = useState("input");
  const [R, setR] = useState(null);
  const [err, setErr] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const mbti = ei + ns + tf + jp;

  const observe = () => {
    const dt = new Date(birth);
    if (!birth || isNaN(dt.getTime())) { setErr("생년월일을 올바르게 입력해 주세요."); return; }
    if (dt.getTime() > Date.now()) { setErr("미래 날짜는 관측할 수 없어요."); return; }
    if (dt.getFullYear() < 1900) { setErr("1900년 이후 날짜를 입력해 주세요."); return; }
    setErr("");
    const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate();
    const zodiac = getZodiac(m, d);
    const hour = time ? Number(time.split(":")[0]) : null;
    const saju = computeSaju(y, m, d, hour);
    const daewoon = computeDaewoon(saju, gender, y, m, d);
    const F = fuse({ mbti, blood, zodiac, saju, env, gender, birth, hour });
    setR({ y, m, d, zodiac, saju, daewoon, F, hour, pet, rel, petType, petCount, hobbies, art, name });
    setPhase("reading");
    setTimeout(() => setPhase("result"), 1150);
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: `radial-gradient(120% 80% at 50% -10%, ${C.bg2} 0%, ${C.bg} 55%)`, color: C.ink, fontFamily: "'Noto Sans KR', system-ui, sans-serif", padding: "26px 15px 56px" }}>
      <style>{`
        @keyframes destinySpin{to{transform:rotate(360deg)}}
        @keyframes destinyFloatUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes destinyGp{0%,100%{opacity:.35}50%{opacity:1}}
        .destiny-reveal{animation:destinyFloatUp .55s cubic-bezier(.2,.7,.2,1) both}
        @media(prefers-reduced-motion:reduce){.destiny-reveal{animation:none}}
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* 앱 이름은 Shell Topbar가 표시 — 무드 카피만 남김 */}
        <header style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 5, color: C.gold }}>五行 · 相生相剋 融合</div>
          <p style={{ color: C.dim, fontSize: 12.5, margin: "9px 0 0" }}>네 기운을 오행으로 겹쳐, 조합에서 태어나는 당신을 읽습니다</p>
        </header>

        {phase === "input" && (
          <div className="destiny-reveal" style={{ display: "grid", gap: 14 }}>
            <Panel>
              <Eyebrow>01 · MBTI</Eyebrow>
              <div style={{ display: "grid", gap: 9 }}>
                {[["E", "I", ei, setEi], ["N", "S", ns, setNs], ["T", "F", tf, setTf], ["J", "P", jp, setJp]].map(([l, r, v, s], i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    {[l, r].map((o) => <Seg key={o} on={v === o} onClick={() => s(o)} mono>{o}</Seg>)}
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 11, fontSize: 17, color: C.goldSoft, letterSpacing: 2 }}>{mbti} · {MBTI_NAME[mbti]}</div>
            </Panel>

            <Panel>
              <Eyebrow>02 · 혈액형 · 성별</Eyebrow>
              <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
                {["A", "B", "O", "AB"].map((bt) => <Seg key={bt} on={blood === bt} onClick={() => setBlood(bt)} serif big>{bt}</Seg>)}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["남", "여"].map((g) => <Seg key={g} on={gender === g} onClick={() => setGender(g)} serif>{g}</Seg>)}
              </div>
            </Panel>

            <Panel>
              <Eyebrow>03 · 생년월일 · 태어난 시각(선택)</Eyebrow>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (선택 · 성명학에 사용)" maxLength={10}
                style={{ ...inp, width: "100%", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={birth} min="1900-01-01" max={today} onChange={(e) => { setBirth(e.target.value); setErr(""); }} style={inp} />
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inp, flex: "0 0 120px" }} />
              </div>
              <p style={{ color: C.dim, fontSize: 11, margin: "8px 0 0" }}>시각을 넣으면 시주가 생겨 사주팔자가 완성됩니다.</p>
            </Panel>

            <Panel>
              <Eyebrow>04 · 생활 환경의 기운 (형기)</Eyebrow>
              <div style={{ display: "grid", gap: 13 }}>
                {ENV_Q.map((q) => (
                  <div key={q.key}>
                    <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 6 }}>{q.label}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {q.opts.map((o, idx) => {
                        const on = env[q.key] === idx;
                        return (
                          <button key={idx} onClick={() => setEnv({ ...env, [q.key]: idx })} style={{
                            flex: 1, padding: "10px 2px", borderRadius: 9, cursor: "pointer", fontSize: 12.5,
                            border: `1px solid ${on ? C.gold : C.line}`, background: on ? "rgba(201,162,75,0.14)" : "transparent",
                            color: on ? C.goldSoft : C.dim, transition: "all .15s",
                          }}>{o[0]}{o[1] && <span style={{ color: on ? C[o[1]] : C.dim, marginLeft: 3 }}>{OH_GLYPH[o[1]]}</span>}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ color: C.dim, fontSize: 11, margin: "10px 0 0" }}>주변 물·초목·지대·암석의 기운이 오행 흐름에 더해져, 부족한 기운을 채우는지 반영합니다.</p>
            </Panel>

            <Panel>
              <Eyebrow>05 · 반려동물 · 관계 (선택)</Eyebrow>
              <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 6 }}>반려동물을 키우나요?</div>
              <div style={{ display: "flex", gap: 8, marginBottom: pet === "있음" ? 10 : 12 }}>
                {["있음", "없음"].map((v) => <Seg key={v} on={pet === v} onClick={() => setPet(pet === v ? "" : v)} serif>{v}</Seg>)}
              </div>
              {pet === "있음" && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {["고양이", "강아지", "기타"].map((v) => <Seg key={v} on={petType === v} onClick={() => setPetType(petType === v ? "" : v)}>{v}</Seg>)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["1", "2", "여러"].map((v) => <Seg key={v} on={petCount === v} onClick={() => setPetCount(petCount === v ? "" : v)}>{v === "여러" ? "여러 마리" : v + "마리"}</Seg>)}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 6 }}>지금 관계 상태는?</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["싱글", "연애 중", "기혼"].map((v) => <Seg key={v} on={rel === v} onClick={() => setRel(rel === v ? "" : v)} serif>{v}</Seg>)}
              </div>
              <p style={{ color: C.dim, fontSize: 11, margin: "10px 0 0" }}>반려동물은 '돌봄(식상)' + 종류별 기운(고양이=水·강아지=火), 배우자는 남=재성·여=관성으로 봅니다.</p>
            </Panel>

            <Panel>
              <Eyebrow>06 · 취미 · 집안 그림 (선택)</Eyebrow>
              <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 7 }}>즐기는 취미 (여러 개 선택 가능)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                {HOBBY.map(([label, el], i) => {
                  const on = hobbies.includes(i);
                  return (
                    <button key={i} onClick={() => setHobbies(on ? hobbies.filter((x) => x !== i) : [...hobbies, i])} style={{
                      padding: "8px 12px", borderRadius: 20, cursor: "pointer", fontSize: 12.5,
                      border: `1px solid ${on ? C.gold : C.line}`, background: on ? "rgba(201,162,75,0.14)" : "transparent",
                      color: on ? C.goldSoft : C.dim, transition: "all .15s",
                    }}>{label}<span style={{ color: on ? C[el] : C.dim, marginLeft: 4 }}>{OH_GLYPH[el]}</span></button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 6 }}>집에 주로 걸어둔 그림·인테리어</div>
              <select value={art} onChange={(e) => setArt(e.target.value)} style={{ ...inp, width: "100%" }}>
                <option value="">모름 / 없음</option>
                {ART.map(([label, el], i) => <option key={i} value={i}>{label} ({el})</option>)}
              </select>
              <p style={{ color: C.dim, fontSize: 11, margin: "10px 0 0" }}>취미·공간의 기운이 용신을 채우는지 봐서, 생활 개운 조언을 드려요.</p>
            </Panel>

            {err && <p style={{ textAlign: "center", color: "#E0654A", fontSize: 12.5, margin: "0 0 -4px", fontWeight: 600 }}>{err}</p>}
            <button onClick={observe} style={btnGold}>운명 관측하기</button>
            <p style={{ textAlign: "center", color: C.dim, fontSize: 11, margin: 0, lineHeight: 1.6 }}>
              ※ 재미로 보는 콘텐츠입니다. 사주는 절기·간지 규칙 기반 간이 계산이며 만세력 정밀도와는 차이가 있습니다.
            </p>
          </div>
        )}

        {phase === "reading" && (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 26 }}>
              {OH_ORDER.map((e, i) => <span key={e} style={{ fontSize: 27, color: C[e], animation: `destinyGp 1.1s ${i * 0.12}s infinite` }}>{OH_GLYPH[e]}</span>)}
            </div>
            <div style={{ width: 40, height: 40, margin: "0 auto 18px", borderRadius: "50%", border: `2px solid ${C.line}`, borderTopColor: C.gold, animation: "destinySpin .8s linear infinite" }} />
            <p style={{ color: C.gold, letterSpacing: 3, fontSize: 13 }}>상생상극을 셈하는 중…</p>
          </div>
        )}

        {phase === "result" && R && <Results R={R} mbti={mbti} blood={blood} gender={gender} onReset={() => { setPhase("input"); setR(null); }} />}
      </div>
    </div>
  );
}

/* ═══════════════════════ 결과 ═══════════════════════ */
function Results({ R, mbti, blood, gender, onReset }) {
  const { zodiac, saju, daewoon, F } = R;
  const maxDist = Math.max(...OH_ORDER.map((k) => F.dist[k]));
  const [copied, setCopied] = useState(false);
  const [tarotOpen, setTarotOpen] = useState(false);
  // ── AI(Gemini) 상태 — 계산은 로컬 로직, Gemini 는 해석·이미지만 담당 ──
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const [oracle, setOracle] = useState({ loading: false, text: "", error: "" });
  const [tarotAi, setTarotAi] = useState({ loading: false, text: "", error: "" });
  const [talisman, setTalisman] = useState({ loading: false, url: "", error: "" });
  const [chat, setChat] = useState([]); // [{ q, a }]
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatErr, setChatErr] = useState("");

  // 대운 길흉: 억부용신 기준 + 원국 일지 대비 충·합(변동)까지 반영
  const scoreOh = (oh) => {
    if (oh === F.yong) return 25;   // 용신 = 대길
    if (oh === F.hee) return 12;    // 희신
    if (oh === F.gi) return -15;    // 기신 = 흉
    if (oh === F.gu) return -8;     // 구신
    return 0;                       // 한신
  };
  const HAP6 = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  const ilJi = saju.pillars[2].jiI; // 원국 일지(나)
  const amp = 0.4 + 0.6 * F.decisive; // 중화(애매)일수록 용신 진폭 완만
  const daewoonCurve = daewoon.list.map((dw) => {
    const dwJi = JI.indexOf(dw.ji);
    let v = 50 + (scoreOh(GAN_OH[dw.gan]) * 0.6 + scoreOh(JI_OH[dwJi]) * 0.4) * amp;
    let tag = "";
    if ((dwJi + 6) % 12 === ilJi) { v -= 9; tag = "충"; }        // 충/합은 구조적 요인이라 완만화 제외
    else if (HAP6[dwJi] === ilJi) { v += 6; tag = "합"; }
    return { age: `${dw.age}세`, value: clamp(v), 간지: `${dw.gan}${dw.ji}`, tag };
  });

  const sorted = [...F.persona].sort((a, b) => b.value - a.value);
  const topCat = [...F.cats].sort((a, b) => b.value - a.value)[0];
  const relText = F.rels.filter((r) => r.r !== "비화").map((r) => `${r.a}${r.r === "상생" ? "→" : "✕"}${r.b}`);

  const t1 = sorted[0].trait, t2 = sorted[1].trait;
  const yE = OH_EASY[F.yong], gE = OH_EASY[F.gi];
  const envGood = F.envAdd[F.yong] || 0, envBad = F.envAdd[F.gi] || 0;
  const envLine =
    envGood > 0 && envGood >= envBad ? `그대가 선 땅은 이미 '${yE.n}'의 기운을 머금었으니, 발밑의 축복을 밟고도 모르는 어리석은 자가 되지 말라. ` :
    envBad > 0 && envBad > envGood ? `그대가 사는 곳엔 '${gE.n}'의 기운이 고여 있다 — 익숙함이라는 이름의 늪이니, 그 물가에서 한 걸음 물러서라. ` : "";
  const summary =
    `보라, 여기 「${F.coined}」이 있다.\n` +
    `${MBTI_NAME[mbti]}의 얼굴과 ${zodiac.n}의 별을 지녔으며, ${t1}과 ${t2}을 품고도 그것을 짐처럼 지고 걷는 자다.\n\n` +
    `그대를 살리는 것은 '${gE.n}'이 아니라 '${yE.n}'이다. ${yE.v} 자만이 스스로를 넘어선다.\n` +
    `허나 명심하라 — 그대를 지치게 하는 것은 그대와 가장 닮은 '${gE.n}'이니, 제 깊이에 빠져 죽지 않도록 스스로를 경계하라.\n\n` +
    `그러니 나아가 타올라라. 머무는 자는 고이고, 고인 자는 끝내 제 안에서 익사하는 법이다.\n` +
    `${daewoon.su}살에 그대의 강은 처음으로 굽이쳤고, '${yE.n}'의 계절이 돌아올 때마다 그대는 잿더미에서 다시 일어서리라.\n` +
    `타고난 별들 가운데 '${topCat.name}'의 불꽃이 가장 밝게 타오르니, 그 빛을 따르되 눈멀지는 말라. ` +
    envLine + `\n\n` +
    `— 그러나 그대는 이 모든 예언을 읽고도, 오늘 밤 다시 익숙한 무기력의 이불 속으로 기어들어가 아무것도 하지 않을 것이다. 그리고 그것이야말로 신들조차 끝내 바꾸지 못한, 그대의 가장 확고부동한 운명이다.`;

  // 반려동물(식상) · 관계(남=재성·여=관성) 기운 판정
  const favorGood = (el) => el === F.yong || el === F.hee;
  const favorBad = (el) => el === F.gi || el === F.gu;
  const petEl = F.sip.식상, spouseEl = gender === "남" ? F.sip.재성 : F.sip.관성;
  const petE = OH_EASY[petEl], spE = OH_EASY[spouseEl], yName = OH_EASY[F.yong].n;
  const petTypeEl = R.petType ? PET_EL[R.petType] : null;
  const petCnt = R.petCount === "여러" ? 2 : R.petCount === "2" ? 1.5 : 1;
  const yongPet = Object.entries(PET_EL).find(([_k, v]) => v === F.yong)?.[0];
  let petLine = "";
  if (R.pet === "있음") {
    const base = favorGood(petEl) ? `반려동물을 돌보는 일이 힘이 되는 '${petE.n}(${petEl})' 기운을 돌게 해, 함께할수록 당신이 살아나요.`
      : favorBad(petEl) ? `돌봄은 기운을 내어주는 '${petE.n}(${petEl})' 활동이라 다 쏟으면 지칠 수 있으니, 너무 애쓰지 않게 조절이 필요해요.`
      : `반려동물은 기운에 부담도 도움도 크지 않은, 순수한 정서적 동반자예요.`;
    const flavor = petTypeEl
      ? (favorGood(petTypeEl) ? ` 특히 ${R.petType}의 ${PET_EL_DESC[R.petType]} 기운이 용신과 맞아 더할 나위 없어요.`
        : favorBad(petTypeEl) ? ` 다만 ${R.petType}의 ${PET_EL_DESC[R.petType]} 기운은 당신을 좀 가라앉힐 수 있으니, 밝고 활동적인 교감으로 균형을 맞춰요.`
        : ` ${R.petType}의 ${PET_EL_DESC[R.petType]} 기운은 무난하게 어울려요.`) : "";
    const many = petCnt > 1 ? ` 여러 마리라 그 기운이 한층 강하게 작용해요.` : "";
    petLine = base + flavor + many;
  } else if (R.pet === "없음") {
    petLine = favorGood(petEl) ? `혹시 반려동물을 들인다면 큰 힘이 될 사주예요 — 돌봄이 곧 부족한 '${petE.n}(${petEl})' 기운을 채워주거든요.${yongPet ? ` 특히 용신 기운을 지닌 ${yongPet}가 잘 맞아요.` : ""}`
      : `반려동물이 꼭 필요한 사주는 아니에요. 함께하고 싶다면 ${yongPet ? `용신 기운의 ${yongPet}가 그나마 잘 맞고, ` : ""}'${petE.n}' 기운을 다 소진하지 않을 만큼만.`;
  }
  const spouseName = gender === "남" ? "아내 자리(재성)" : "남편 자리(관성)";
  const relLine = !R.rel ? "" :
    R.rel === "싱글"
      ? (favorGood(spouseEl) ? `좋은 인연이 힘이 되는 사주예요. ${spouseName}가 '${spE.n}(${spouseEl})'로 당신을 살리니, 맞는 사람을 만나면 운이 트입니다 — 위 '부족한 에너지를 채워주는 유형'이 곧 인연의 힌트예요.`
        : favorBad(spouseEl) ? `혼자일 때 오히려 기운이 편안한 사주라 조급할 필요 없어요. 인연이라면 당신 용신 '${yName}'을 채워주는 사람이라야 서로 편합니다.`
        : `인연은 있어도 없어도 기운엔 큰 영향이 없어요. 조급함 대신 당신 리듬대로.`)
      : (favorGood(spouseEl) ? `지금의 인연은 힘이 되는 '${spE.n}(${spouseEl})' 기운을 더해줘요. 관계가 당신을 살립니다.`
        : favorBad(spouseEl) ? `관계가 기운을 눌러 지치게 할 때가 있어요. 상대를 탓하기보다 당신 용신 '${yName}'을 스스로 채우면 관계도 한결 편해집니다.`
        : `관계는 기운에 무난하게 흐릅니다. 서로의 리듬만 존중하면 충분해요.`);

  // 취미·집안 그림 → 생활 기운
  const lifeAdd = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  (R.hobbies || []).forEach((i) => { lifeAdd[HOBBY[i][1]]++; });
  if (R.art !== "" && R.art != null) lifeAdd[ART[R.art][1]]++;
  const hasLife = OH_ORDER.some((e) => lifeAdd[e] > 0);
  const lifeGood = lifeAdd[F.yong] + lifeAdd[F.hee], lifeBad = lifeAdd[F.gi] + lifeAdd[F.gu];
  const lifeMain = OH_ORDER.reduce((a, b) => (lifeAdd[b] > lifeAdd[a] ? b : a));
  const badMain = lifeAdd[F.gi] >= lifeAdd[F.gu] ? F.gi : F.gu;
  const yongHobby = HOBBY.find((h) => h[1] === F.yong);
  const lifeLine = !hasLife ? "" :
    lifeGood > lifeBad ? `지금 취미·공간은 주로 힘이 되는 '${OH_EASY[lifeMain].n}(${lifeMain})' 기운을 채워주고 있어요. 결이 좋으니 그대로 유지하세요.` :
    lifeBad > lifeGood ? `취미·공간이 지치게 하는 '${OH_EASY[badMain].n}(${badMain})' 쪽으로 기운 편이라, ${yongHobby ? `'${yongHobby[0]}' 같은 ` : ""}용신 '${yName}' 취미를 하나 더하면 균형이 좋아져요.` :
    `취미·공간은 기운에 큰 영향 없이 무난하게 흐릅니다.`;

  // 이름 성명학 (발음오행 + 운명수)
  const nm = nameElements(R.name);
  const nameMain = OH_ORDER.reduce((a, b) => (nm.dist[b] > nm.dist[a] ? b : a));
  const nameNum = destinyNumber(R.name);
  const nameGood = (nm.dist[F.yong] || 0) + (nm.dist[F.hee] || 0);
  const nameBad = (nm.dist[F.gi] || 0) + (nm.dist[F.gu] || 0);
  const nameLine = !R.name ? "" : nm.hangul === 0
    ? `한글 이름이 아니라 소리 오행은 못 봤지만, 이름 운명수는 ${nameNum} — ${NUM_MEAN[nameNum]}.`
    : nameGood > nameBad ? `이름의 소리엔 힘이 되는 '${OH_EASY[nameMain].n}(${nameMain})' 기운이 담겨, 부를수록 당신 용신을 불러주는 좋은 이름이에요. 운명수는 ${nameNum} — ${NUM_MEAN[nameNum]}.`
    : nameBad > nameGood ? `이름의 소리 기운(${OH_EASY[nameMain].n}·${nameMain})은 살짝 아쉬운 편이지만, 이름은 바꾸기보다 아는 걸로 충분해요. 부를 때 용신 '${OH_EASY[F.yong].n}'을 떠올려 보세요. 운명수는 ${nameNum} — ${NUM_MEAN[nameNum]}.`
    : `이름의 소리 기운은 무난하게 흐릅니다. 운명수는 ${nameNum} — ${NUM_MEAN[nameNum]}.`;

  // 자미두수 12궁 (오행·십성으로 풀이)
  const gungEl = (key) => key === "배우자" ? (gender === "남" ? F.sip.재성 : F.sip.관성) : key === "기신" ? F.gi : F.sip[key];
  const gungLevel = (el) => el === F.yong ? { t: "아주 좋음", c: C.goldSoft, r: 4 } : el === F.hee ? { t: "좋음", c: C.목, r: 3 } : el === F.gu ? { t: "주의", c: C.토, r: 1 } : el === F.gi ? { t: "약함", c: C.화, r: 0 } : { t: "보통", c: C.dim, r: 2 };
  const gungCards = GUNG.map(([kn, hz, dom, key]) => { const el = gungEl(key); return { kn, hz, dom, el, ...gungLevel(el) }; });
  const bestGung = gungCards.reduce((a, b) => (b.r > a.r ? b : a));
  const warnGung = gungCards.reduce((a, b) => (b.r < a.r ? b : a));

  // 오늘의 타로 (오늘 날짜 + 생일 + 이름으로 결정)
  const todayStr = new Date().toISOString().slice(0, 10);
  const nowYear = new Date().getFullYear();
  const sj = samjaeInfo(saju.yJiI, nowYear);
  const todayCard = TAROT[Math.floor(hashStr(`${todayStr}|${R.y}-${R.m}-${R.d}|${R.name}`)() * TAROT.length) % TAROT.length];

  const shareText =
    `🔮 운명 관측소 결과\n\n` +
    `[ 나의 유형 ]\n「${F.coined}」\n${MBTI_NAME[mbti]}(${mbti}) · ${blood}형 · ${gender} · ${zodiac.n} · ${saju.tti}띠\n` +
    `도드라지는 성향: ${sorted[0].trait} ${sorted[0].value} / ${sorted[1].trait} ${sorted[1].value} / ${sorted[2].trait} ${sorted[2].value}\n\n` +
    `[ 사주 팔자(간이) ]\n${saju.pillars.map((p) => `${p.key} ${p.gan}${p.ji}`).join(" · ")}\n` +
    `일간 ${F.ilOh} · ${F.strength} (지원 기운 ${Math.round(F.ratio * 100)}%)\n` +
    `힘이 되는 기운: ${OH_EASY[F.yong].n}(${F.yong}) / 도와주는: ${OH_EASY[F.hee].n}(${F.hee}) / 지치게 하는: ${OH_EASY[F.gi].n}(${F.gi})\n` +
    `대운: ${daewoon.forward ? "순행" : "역행"} · ${daewoon.su}세 시작\n\n` +
    `[ 운을 트이게 하는 법 · ${OH_EASY[F.yong].n} 채우기 ]\n` +
    `행운 컬러(옷·자동차·소품): ${LUCK_COLOR[F.yong].name}\n운동: ${EXERCISE[F.yong]}\n생활습관: ${HABIT[F.yong]}\n음식: ${REMEDY[F.yong].음식}\n\n` +
    `[ 부족한 에너지를 채워주는 유형 ]\n${PERSON[F.yong].t}\n이런 MBTI: ${PERSON_MBTI[F.yong].join(", ")}\n\n` +
    ((R.pet || R.rel || hasLife) ? `[ 반려동물·관계·생활 ]\n${petLine ? "반려동물 — " + petLine + "\n" : ""}${relLine ? "관계 — " + relLine + "\n" : ""}${lifeLine ? "취미·공간 — " + lifeLine + "\n" : ""}\n` : "") +
    (R.name ? `[ 이름 풀이 ]\n${nameLine}\n\n` : "") +
    `[ 인생 12영역 요약 ]\n가장 잘 풀리는 영역: ${bestGung.dom}(${bestGung.t}) · 신경 쓸 영역: ${warnGung.dom}(${warnGung.t})\n\n` +
    `[ 삼재 ]\n${sj.inSamjae ? `지금 삼재 기간(${sj.years[0]}~${sj.years[2]}년, 올해는 ${sj.phase})` : `지금은 삼재 아님 · 다음 삼재 ${sj.years[0]}~${sj.years[2]}년`}\n\n` +
    `[ 오늘의 타로 ]\n${todayCard[1]} (${todayCard[0]}) · ${todayCard[2]}\n${todayCard[3]}\n\n` +
    `[ 운명은 이렇게 말한다 ]\n${summary}\n\n` +
    (oracle.text ? `[ AI 관측사의 심층 예언 ]\n${oracle.text}\n\n` : "") +
    `— 재미로 보는 콘텐츠 · 실제 만세력과 차이가 있어요`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareText; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); setCopied(true); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  // ── AI 공통 컨텍스트 — 이미 계산된 명식을 텍스트 블록으로 (Gemini 는 해석만) ──
  const brief = buildChartBrief({
    coined: F.coined, synergy: F.synergy.t,
    mbti, mbtiName: MBTI_NAME[mbti], blood, gender,
    zodiac: zodiac.n, tti: saju.tti,
    birth: `${R.y}년 ${R.m}월 ${R.d}일${R.hour != null ? ` ${R.hour}시` : ""}`,
    pillars: saju.pillars.map((p) => `${p.key} ${p.gan}${p.ji}`).join(" · "),
    ilOh: F.ilOh, strength: F.strength, ratioPct: Math.round(F.ratio * 100),
    dist: OH_ORDER.map((e) => `${e} ${F.dist[e].toFixed(1)}`).join(" / "),
    yong: `${OH_EASY[F.yong].n}(${F.yong})`, hee: `${OH_EASY[F.hee].n}(${F.hee})`,
    han: `${OH_EASY[F.han].n}(${F.han})`, gu: `${OH_EASY[F.gu].n}(${F.gu})`, gi: `${OH_EASY[F.gi].n}(${F.gi})`,
    reason: F.reason,
    sip: Object.entries(F.sip).map(([k, v]) => `${k}=${v}`).join(" · "),
    topTraits: sorted.slice(0, 3).map((s) => `${s.trait} ${s.value}`).join(" / "),
    cats: F.cats.map((c) => `${c.name} ${c.value}`).join(" / "),
    daewoon: `${daewoon.forward ? "순행" : "역행"} · ${daewoon.su}세 시작 · ` +
      daewoonCurve.map((d) => `${d.age} ${d.간지}${d.tag ? `(${d.tag})` : ""} ${d.value}점`).join(", "),
    bestGung: `${bestGung.kn}(${bestGung.dom})`, warnGung: `${warnGung.kn}(${warnGung.dom})`,
    samjae: sj.inSamjae ? `삼재 기간(${sj.years[0]}~${sj.years[2]}년, 올해 ${sj.phase})` : `해당 없음(다음 삼재 ${sj.years[0]}~${sj.years[2]}년)`,
    petLine, relLine, lifeLine, nameLine,
  });

  const runOracle = async () => {
    if (oracle.loading) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setOracle({ loading: true, text: "", error: "" });
    try {
      const text = await generateOracleSummary(brief, summary);
      setOracle({ loading: false, text, error: "" });
    } catch (e) {
      setOracle({ loading: false, text: "", error: e?.message || String(e) });
    }
  };

  const runTarotAi = async () => {
    if (tarotAi.loading) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setTarotAi({ loading: true, text: "", error: "" });
    try {
      const text = await generateTarotReading(brief,
        { no: todayCard[0], name: todayCard[1], keyword: todayCard[2], base: todayCard[3] }, todayStr);
      setTarotAi({ loading: false, text, error: "" });
    } catch (e) {
      setTarotAi({ loading: false, text: "", error: e?.message || String(e) });
    }
  };

  const runTalisman = async () => {
    if (talisman.loading) return;
    if (!(await ensureCanGenerate("image"))) return;
    setTalisman((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const url = await generateTalisman({
        yongGlyph: OH_GLYPH[F.yong],
        luckColorNames: LUCK_COLOR[F.yong].name,
        luckColorHex: LUCK_COLOR[F.yong].hex.join(", "),
        archetype: F.coined,
      });
      setTalisman({ loading: false, url, error: "" });
    } catch (e) {
      setTalisman((prev) => ({ ...prev, loading: false, error: e?.message || String(e) }));
    }
  };

  const submitChat = async () => {
    const q = chatInput.trim();
    if (!q || chatBusy) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setChatBusy(true); setChatErr("");
    try {
      const a = await askOracle(brief, q, chat.slice(-4));
      setChat((prev) => [...prev, { q, a }]);
      setChatInput("");
    } catch (e) {
      setChatErr(e?.message || String(e));
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="destiny-reveal" style={{ display: "grid", gap: 16 }}>
      <Panel style={{ textAlign: "center", background: "rgba(201,162,75,0.07)" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: C.dim }}>융합 아키타입 · MBTI × 혈액형</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.goldSoft, margin: "8px 0 6px" }}>{F.coined}</div>
        <div style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <OhTag el={F.eMbti} /> <span style={{ color: C.dim }}>{F.synergy.t === "증폭형" ? "≡" : F.synergy.t === "조화형" ? "→" : "✕"}</span> <OhTag el={F.eBlood} />
          <span style={{ marginLeft: 6, padding: "2px 10px", borderRadius: 20, border: `1px solid ${C.line}`, color: C.goldSoft, fontSize: 12 }}>{F.synergy.t}</span>
        </div>
        <p style={{ fontSize: 12.5, color: C.dim, margin: "10px 0 0", lineHeight: 1.6 }}>{F.synergy.d}</p>
      </Panel>

      <Panel>
        <Eyebrow>네 기운의 오행 환산</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[["MBTI", mbti, F.eMbti], ["혈액형", blood + "형", F.eBlood], ["별자리", zodiac.sym, F.eZod], ["사주", saju.tti + "띠", F.eSaju]].map(([t, s, e]) => (
            <div key={t} style={{ textAlign: "center", padding: "12px 4px", borderRadius: 12, border: `1px solid ${C.line}`, background: "rgba(12,15,43,0.4)" }}>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1 }}>{t}</div>
              <div style={{ fontSize: 15, margin: "3px 0", color: C.ink }}>{s}</div>
              <div style={{ fontSize: 22, color: C[e] }}>{OH_GLYPH[e]}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>타고난 기운 분포</Eyebrow>
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {OH_ORDER.map((e) => (
            <div key={e} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 62, color: C[e], fontSize: 13 }}>{OH_GLYPH[e]} {OH_EASY[e].n}<span style={{ fontSize: 10, color: C.dim }}>({e})</span></span>
              <div style={{ flex: 1, height: 10, borderRadius: 6, background: "rgba(12,15,43,0.6)", overflow: "hidden" }}>
                <div style={{ width: `${(F.dist[e] / maxDist) * 100}%`, height: "100%", background: C[e], borderRadius: 6, transition: "width .6s" }} />
              </div>
              {e === F.yong && <span style={{ fontSize: 10, color: C.goldSoft }}>힘이 됨</span>}
              {e === F.hee && e !== F.yong && <span style={{ fontSize: 10, color: C.dim }}>도움</span>}
              {e === F.gi && <span style={{ fontSize: 10, color: C.화 }}>지치게 함</span>}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: C.dim, margin: "0 0 12px", lineHeight: 1.6 }}>
          막대가 길수록 그 기운이 많다는 뜻이에요. <b style={{ color: C.goldSoft }}>힘이 되는</b> 기운을 채우고 <b style={{ color: C.화 }}>지치게 하는</b> 기운은 덜어내면 균형이 좋아집니다.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {relText.map((r, i) => <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.line}`, color: r.includes("→") ? C.목 : C.화 }}>{r}</span>)}
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(201,162,75,0.14)", color: C.goldSoft }}>조화도 {F.harmony}</span>
        </div>
      </Panel>

      <Panel>
        <Eyebrow>성향 관측 · 종합 레이더</Eyebrow>
        <ResponsiveContainer width="100%" height={270}>
          <RadarChart data={F.persona} outerRadius="72%">
            <PolarGrid stroke={C.line} />
            <PolarAngleAxis dataKey="trait" tick={{ fill: C.ink, fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke={C.gold} fill={C.gold} fillOpacity={0.32} />
            <Tooltip contentStyle={tip} />
          </RadarChart>
        </ResponsiveContainer>
        <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
          {sorted.slice(0, 3).map((s, i) => (
            <div key={s.trait} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.line}`, color: i === 0 ? C.goldSoft : C.ink }}>{i + 1}. {s.trait} {s.value}</span>
              {s.sources.length > 0 && <span style={{ fontSize: 10.5, color: C.dim }}>← {s.sources.join(" · ")}</span>}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: C.dim, margin: "10px 0 0", textAlign: "center" }}>점수는 MBTI·혈액형·별자리·사주의 기여를 합산한 값이에요.</p>
      </Panel>

      {/* ── 이하 원본 유실 구간(50k 잘림)을 동일 스타일로 재구성 ── */}
      <Panel>
        <Eyebrow>사주 팔자 · 간이 만세력</Eyebrow>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {saju.pillars.map((p) => (
            <div key={p.key} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 6 }}>{p.key}</div>
              <div style={{ padding: "10px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "rgba(12,15,43,0.4)" }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: C[GAN_OH[p.gan]] }}>{p.gan}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: C[JI_OH[p.jiI]] }}>{p.ji}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 12, fontSize: 12, color: C.dim, flexWrap: "wrap" }}>
          <span>{saju.yYear}년 {saju.tti}띠</span>
          <span>일간 <OhTag el={F.ilOh} /></span>
          <span>양 {saju.yang} · 음 {saju.eum}</span>
          {saju.pillars.length < 4 && <span style={{ color: C.dim }}>시주 없음(시각 미입력)</span>}
        </div>
        <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "rgba(201,162,75,0.08)", border: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "rgba(201,162,75,0.14)", color: C.goldSoft }}>{F.strength}</span>
            <span style={{ fontSize: 11, color: C.dim }}>일간을 돕는 기운 {Math.round(F.ratio * 100)}%</span>
          </div>
          <p style={{ fontSize: 12.5, color: C.ink, margin: 0, lineHeight: 1.7 }}>{F.reason}.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {[["용신", F.yong, C.goldSoft], ["희신", F.hee, C.목], ["한신", F.han, C.dim], ["구신", F.gu, C.토], ["기신", F.gi, C.화]].map(([label, el, col]) => (
              <span key={label} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, border: `1px solid ${C.line}`, color: col }}>
                {label} {OH_GLYPH[el]}{el}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.dim, margin: "8px 0 0", lineHeight: 1.6 }}>
            용신 「{F.yong}」 — {OH_DESC[F.yong]}. 이 기운을 채우는 게 개운의 핵심이에요.
          </p>
        </div>
      </Panel>

      <Panel>
        <Eyebrow>대운의 흐름 · {daewoon.forward ? "순행" : "역행"} · {daewoon.su}세 시작</Eyebrow>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={daewoonCurve} margin={{ top: 14, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
            <XAxis dataKey="age" tick={{ fill: C.dim, fontSize: 10.5 }} axisLine={{ stroke: C.line }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
            <ReferenceLine y={50} stroke={C.dim} strokeDasharray="4 4" />
            <Tooltip contentStyle={tip} formatter={(v, _k, { payload }) => [`${v}${payload.tag ? ` (${payload.tag})` : ""}`, payload.간지]} />
            <Line type="monotone" dataKey="value" stroke={C.gold} strokeWidth={2} dot={{ fill: C.goldSoft, r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 }}>
          {daewoonCurve.map((dw) => (
            <span key={dw.age} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.line}`, color: dw.value >= 58 ? C.goldSoft : dw.value <= 42 ? C.화 : C.dim }}>
              {dw.age} {dw.간지}{dw.tag && ` ${dw.tag}`}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 11, color: C.dim, margin: "10px 0 0", lineHeight: 1.6 }}>10년 단위 큰 흐름이에요. 50 위는 용신 기운이 도는 시기, 아래는 아껴 가야 하는 시기. 충(衝)은 변동, 합(合)은 안정을 뜻해요.</p>
      </Panel>

      {nameLine && (
        <Panel>
          <Eyebrow>이름 풀이 · 발음오행 · 운명수</Eyebrow>
          <p style={{ fontSize: 12.5, color: C.ink, margin: 0, lineHeight: 1.7 }}>{nameLine}</p>
        </Panel>
      )}

      <Panel>
        <Eyebrow>인생 12영역 · 자미두수의 틀</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
          {gungCards.map((g) => (
            <div key={g.kn} style={{ textAlign: "center", padding: "10px 4px", borderRadius: 10, border: `1px solid ${C.line}`, background: "rgba(12,15,43,0.4)" }}>
              <div style={{ fontSize: 17, color: C[g.el] }}>{g.hz}</div>
              <div style={{ fontSize: 11.5, color: C.ink, margin: "3px 0 2px" }}>{g.kn}</div>
              <div style={{ fontSize: 10, color: C.dim }}>{g.dom}</div>
              <div style={{ fontSize: 10.5, color: g.c, marginTop: 4 }}>{g.t}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: C.dim, margin: "12px 0 0", lineHeight: 1.65 }}>
          가장 잘 풀리는 곳은 <b style={{ color: bestGung.c }}>{bestGung.kn}({bestGung.dom})</b>,
          마음 써야 할 곳은 <b style={{ color: warnGung.c }}>{warnGung.kn}({warnGung.dom})</b> 이에요.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>삼재 · {nowYear}년 기준</Eyebrow>
        <p style={{ fontSize: 12.5, color: C.ink, margin: 0, lineHeight: 1.7 }}>
          {sj.inSamjae
            ? <>지금은 <b style={{ color: C.화 }}>삼재 기간</b>({sj.years[0]}~{sj.years[2]}년)이에요. 올해는 <b style={{ color: C.goldSoft }}>{sj.phase}</b> — 큰 결정은 한 템포 늦추고, 용신 '{yE.n}' 기운을 채우며 지나가면 무탈합니다.</>
            : <>지금은 삼재가 아니에요. 다음 삼재는 <b style={{ color: C.goldSoft }}>{sj.years[0]}~{sj.years[2]}년</b> — 그 전에 벌여둘 일은 지금 벌이는 게 좋아요.</>}
        </p>
      </Panel>

      <Panel>
        <Eyebrow>다섯 갈래 운 · 십성 환산</Eyebrow>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={F.cats} margin={{ top: 6, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: C.ink, fontSize: 11 }} axisLine={{ stroke: C.line }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tip} cursor={{ fill: "rgba(201,162,75,0.06)" }} formatter={(v, _k, { payload }) => [`${v} · ${payload.sip}(${payload.el})`, payload.name]} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {F.cats.map((c) => <Cell key={c.name} fill={C[c.el]} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 11, color: C.dim, margin: "6px 0 0", textAlign: "center" }}>막대 색은 각 운을 맡는 오행이에요. 가장 높은 건 {topCat.name} — {topCat.sip}({topCat.el}) 기운.</p>
      </Panel>

      {/* ── 이하 원본 코드 (사용자 제공 하단부) ── */}
      <Panel>
        <Eyebrow>기운 리듬 · 상징적 흐름 (콘텐츠용)</Eyebrow>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={F.monthlyCats} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={C.line} vertical={false} />
            <XAxis dataKey="m" tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis domain={[20, 95]} tick={{ fill: C.dim, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tip} />
            <Legend wrapperStyle={{ fontFamily: "'Noto Sans KR',sans-serif", fontSize: 11, paddingTop: 6 }} />
            <Line dataKey="재물" stroke={C.goldSoft} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
            <Line dataKey="연애" stroke={C.화} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
            <Line dataKey="건강" stroke={C.목} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ color: C.dim, fontSize: 11.5, margin: 0, textAlign: "center", lineHeight: 1.6 }}>
          특정 연도의 실제 운세 예측이 아니라, 계절 오행 리듬을 상징적으로 표현한 <b style={{ color: C.dim }}>재미용 흐름</b>이에요. 봄엔 목, 여름엔 화… 식으로 각 분야 기운이 어떻게 오르내리는지 감각적으로 보여줍니다.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>오늘의 타로 · {todayStr}</Eyebrow>
        {!tarotOpen ? (
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div onClick={() => setTarotOpen(true)} style={{ cursor: "pointer", width: 120, height: 180, margin: "0 auto 14px", borderRadius: 14, background: `linear-gradient(155deg, ${C.bg2}, #1c1140)`, border: `2px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(201,162,75,0.2)" }}>
              <span className="serif" style={{ fontSize: 44, color: C.gold, opacity: 0.9 }}>✦</span>
            </div>
            <button onClick={() => setTarotOpen(true)} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: `linear-gradient(100deg, ${C.gold}, ${C.goldSoft})`, color: "#20180a", fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>오늘의 카드 뽑기</button>
          </div>
        ) : (
          <div className="destiny-reveal" style={{ textAlign: "center", padding: "4px 0" }}>
            <div style={{ width: 128, height: 188, margin: "0 auto 14px", borderRadius: 14, background: "linear-gradient(155deg, #201643, #120b2e)", border: `2px solid ${C.gold}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 8px 24px rgba(201,162,75,0.25)" }}>
              <span className="mono" style={{ fontSize: 13, color: C.gold, letterSpacing: 2 }}>{todayCard[0]}</span>
              <span className="serif" style={{ fontSize: 34, color: C.goldSoft }}>✦</span>
              <span className="serif" style={{ fontSize: 19, color: C.ink, fontWeight: 600 }}>{todayCard[1]}</span>
            </div>
            <div className="mono" style={{ fontSize: 11.5, color: C.gold, letterSpacing: 1, marginBottom: 8 }}>{todayCard[2]}</div>
            <p style={{ fontSize: 14.5, color: C.ink, margin: 0, lineHeight: 1.7, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>{todayCard[3]}</p>
            {/* AI 맞춤 풀이 — 뽑힌 카드 × 본인 명식 × 오늘 날짜 */}
            <div style={{ marginTop: 14 }}>
              {!tarotAi.text && (
                <button onClick={runTarotAi} disabled={tarotAi.loading} style={{
                  padding: "10px 20px", borderRadius: 10, cursor: tarotAi.loading ? "wait" : "pointer",
                  border: `1px solid ${C.gold}`, background: "rgba(201,162,75,0.10)", color: C.goldSoft,
                  fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600, fontSize: 12.5,
                  opacity: tarotAi.loading ? 0.7 : 1,
                }}>{tarotAi.loading ? "카드를 명식에 비추는 중…" : "내 명식으로 카드 풀이 (AI · 1c)"}</button>
              )}
              {tarotAi.error && <p style={{ fontSize: 11.5, color: C.화, margin: "8px 0 0" }}>{tarotAi.error}</p>}
              {tarotAi.text && (
                <p className="destiny-reveal" style={{
                  fontSize: 13, color: C.ink, margin: "4px auto 0", lineHeight: 1.8, maxWidth: 340,
                  whiteSpace: "pre-line", textAlign: "left", padding: "12px 14px",
                  borderRadius: 10, border: `1px solid ${C.line}`, background: "rgba(12,15,43,0.4)",
                }}>{tarotAi.text}</p>
              )}
            </div>
          </div>
        )}
      </Panel>

      {(petLine || relLine || lifeLine) && (
        <Panel>
          <Eyebrow>반려동물 · 관계 · 생활의 기운</Eyebrow>
          {petLine && (
            <div style={{ display: "flex", gap: 8, marginBottom: (relLine || lifeLine) ? 12 : 0 }}>
              <span style={{ flex: "0 0 54px", fontSize: 12, color: C.goldSoft, fontFamily: "'Noto Sans KR',sans-serif", paddingTop: 1 }}>반려동물</span>
              <p style={{ flex: 1, fontSize: 13.5, color: C.ink, margin: 0, lineHeight: 1.7 }}>{petLine}</p>
            </div>
          )}
          {relLine && (
            <div style={{ display: "flex", gap: 8, marginBottom: lifeLine ? 12 : 0 }}>
              <span style={{ flex: "0 0 54px", fontSize: 12, color: C.goldSoft, fontFamily: "'Noto Sans KR',sans-serif", paddingTop: 1 }}>관계</span>
              <p style={{ flex: 1, fontSize: 13.5, color: C.ink, margin: 0, lineHeight: 1.7 }}>{relLine}</p>
            </div>
          )}
          {lifeLine && (
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ flex: "0 0 54px", fontSize: 12, color: C.goldSoft, fontFamily: "'Noto Sans KR',sans-serif", paddingTop: 1 }}>취미·공간</span>
              <p style={{ flex: 1, fontSize: 13.5, color: C.ink, margin: 0, lineHeight: 1.7 }}>{lifeLine}</p>
            </div>
          )}
          {F.envMainHas && (
            <p style={{ fontSize: 11, color: C.dim, margin: "12px 0 0", lineHeight: 1.6 }}>
              사는 곳의 형세는 {ENV_WORD[F.envMainHas]}({F.envMainHas}) 기운이 가장 강하게 흐르고 있어요.
            </p>
          )}
        </Panel>
      )}

      <Panel style={{ background: "rgba(201,162,75,0.06)" }}>
        <Eyebrow>운명은 이렇게 말한다</Eyebrow>
        <p className="serif" style={{ fontSize: 15, lineHeight: 1.95, margin: 0, whiteSpace: "pre-line", letterSpacing: "0.01em" }}>{summary}</p>
        <p style={{ fontSize: 10.5, color: C.dim, margin: "14px 0 0", textAlign: "right" }}>※ 니체의 문체를 흉내 낸 창작이며, 실제 인용은 아니에요.</p>
        {/* AI 심층 예언 — 위 템플릿 예언은 그대로 두고(폴백), 명식 전체를 근거로 한 생성 예언을 아래에 추가 */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          {!oracle.text && (
            <button onClick={runOracle} disabled={oracle.loading} style={{
              width: "100%", padding: "13px 0", borderRadius: 12, cursor: oracle.loading ? "wait" : "pointer",
              border: `1px solid ${C.gold}`, background: "rgba(201,162,75,0.10)", color: C.goldSoft,
              fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1,
              opacity: oracle.loading ? 0.7 : 1,
            }}>{oracle.loading ? "관측사가 별을 읽는 중…" : "✦ AI 관측사의 심층 예언 듣기 (1c)"}</button>
          )}
          {oracle.error && <p style={{ fontSize: 11.5, color: C.화, margin: "8px 0 0", textAlign: "center" }}>{oracle.error}</p>}
          {oracle.text && (
            <div className="destiny-reveal">
              <div style={{ fontSize: 11, letterSpacing: 3, color: C.gold, marginBottom: 10 }}>AI 관측사의 심층 예언</div>
              <p className="serif" style={{ fontSize: 14.5, lineHeight: 1.95, margin: 0, whiteSpace: "pre-line", letterSpacing: "0.01em" }}>{oracle.text}</p>
              <button onClick={runOracle} disabled={oracle.loading} style={{
                marginTop: 12, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11.5,
                border: `1px solid ${C.line}`, background: "transparent", color: C.dim,
              }}>{oracle.loading ? "다시 읽는 중…" : "다시 예언 듣기 (1c)"}</button>
            </div>
          )}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>이렇게 하면 운이 트여요 · {OH_EASY[F.yong].n}({F.yong}) 채우기</Eyebrow>
        <p style={{ fontSize: 12.5, color: C.dim, margin: "0 0 14px", lineHeight: 1.6 }}>
          당신에게 가장 힘이 되는 건 '{OH_EASY[F.yong].n}({F.yong})'의 기운이에요. {OH_EASY[F.yong].v} 에너지를 일상에 조금씩 더하면 흐름이 살아납니다.
        </p>
        <div>
          <div style={{ fontSize: 11.5, color: C[F.yong], fontFamily: "'Noto Sans KR',sans-serif", marginBottom: 8 }}>행운 컬러 (옷·자동차·소품)</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {LUCK_COLOR[F.yong].hex.map((h) => <span key={h} style={{ width: 30, height: 30, borderRadius: 8, background: h, border: `1px solid ${C.line}` }} />)}
            <span style={{ fontSize: 13.5, color: C.ink, marginLeft: 2 }}>{LUCK_COLOR[F.yong].name}</span>
          </div>
          <p style={{ fontSize: 11.5, color: C.dim, margin: "8px 0 14px" }}>옷·가방·자동차·소품에 이 색을 더하면 기운이 살아나요.</p>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {[["음식", REMEDY[F.yong].음식], ["운동", EXERCISE[F.yong]], ["생활습관", HABIT[F.yong]], ["소품·소재", REMEDY[F.yong].소재]].map(([lab, val]) => (
            <div key={lab} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ flex: "0 0 62px", fontSize: 11.5, color: C[F.yong], fontFamily: "'Noto Sans KR',sans-serif" }}>{lab}</span>
              <span style={{ flex: 1, fontSize: 13.5, color: C.ink, lineHeight: 1.55 }}>{val}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel style={{ textAlign: "center" }}>
        <Eyebrow>행운 부적 · AI 생성</Eyebrow>
        {talisman.url ? (
          <div className="destiny-reveal">
            <img src={talisman.url} alt={`${OH_EASY[F.yong].n}(${F.yong}) 행운 부적`} style={{
              width: 220, maxWidth: "80%", borderRadius: 14, border: `2px solid ${C.gold}`,
              display: "block", margin: "0 auto 12px", boxShadow: "0 10px 30px rgba(201,162,75,0.25)",
            }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <a href={talisman.url} download={`행운부적_${OH_EASY[F.yong].n}.png`} style={{
                padding: "10px 20px", borderRadius: 10, textDecoration: "none",
                background: `linear-gradient(100deg, ${C.gold}, ${C.goldSoft})`, color: "#20180a",
                fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 12.5,
              }}>부적 다운로드</a>
              <button onClick={runTalisman} disabled={talisman.loading} style={{
                padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: 12,
                border: `1px solid ${C.line}`, background: "transparent", color: C.dim,
              }}>{talisman.loading ? "그리는 중…" : "다시 생성 (10c)"}</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: C.dim, margin: "0 0 12px", lineHeight: 1.65 }}>
              용신 '{OH_EASY[F.yong].n}({F.yong})' 문양과 행운 컬러({LUCK_COLOR[F.yong].name})를 담은
              나만의 부적 카드를 AI가 그려드려요.
            </p>
            <button onClick={runTalisman} disabled={talisman.loading} style={{
              padding: "13px 32px", borderRadius: 12, cursor: talisman.loading ? "wait" : "pointer", border: "none",
              background: `linear-gradient(100deg, ${C.gold}, ${C.goldSoft})`, color: "#20180a",
              fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 1,
              opacity: talisman.loading ? 0.7 : 1,
            }}>{talisman.loading ? "부적을 그리는 중… (최대 1분)" : `☾ ${OH_GLYPH[F.yong]} 부적 생성하기 (10c)`}</button>
          </>
        )}
        {talisman.error && <p style={{ fontSize: 11.5, color: C.화, margin: "10px 0 0" }}>{talisman.error}</p>}
      </Panel>

      <Panel>
        <Eyebrow>이런 사람과 가까이 · {OH_EASY[F.yong].n}({F.yong}) 기운</Eyebrow>
        <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.line}`, background: "rgba(12,15,43,0.4)" }}>
          <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: C[F.yong], marginBottom: 6 }}>{PERSON[F.yong].t}</div>
          <p style={{ fontSize: 13, color: C.ink, margin: "0 0 11px", lineHeight: 1.7 }}>{PERSON[F.yong].d}</p>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 6, fontFamily: "'Noto Sans KR',sans-serif" }}>부족한 에너지를 채워주는 유형</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PERSON_MBTI[F.yong].map((m) => (
              <span key={m} className="mono" style={{ fontSize: 12.5, padding: "5px 10px", borderRadius: 7, background: "rgba(201,162,75,0.14)", color: C.goldSoft }}>{m}</span>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: C.dim, margin: "12px 0 0", lineHeight: 1.75 }}>
          '{OH_EASY[F.hee].n}({F.hee})' 기운의 사람({PERSON[F.hee].t}, {PERSON_MBTI[F.hee].slice(0, 2).join("·")} 등)도 곁에 두면 당신의 힘을 은근히 북돋아줍니다. 반대로 당신을 지치게 하는 <span style={{ color: C[F.gi] }}>'{OH_EASY[F.gi].n}({F.gi})'</span> 기운의 사람에만 둘러싸이면 쉽게 소진되니, 적당한 거리를 두는 게 좋아요.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>관측소에 물어보기 · AI 상담</Eyebrow>
        {chat.length > 0 && (
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            {chat.map((c, i) => (
              <div key={i} className="destiny-reveal">
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                  <span style={{ maxWidth: "85%", padding: "9px 13px", borderRadius: "12px 12px 3px 12px", background: "rgba(201,162,75,0.14)", border: `1px solid ${C.line}`, color: C.goldSoft, fontSize: 13, lineHeight: 1.6 }}>{c.q}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ maxWidth: "92%", padding: "11px 14px", borderRadius: "12px 12px 12px 3px", background: "rgba(12,15,43,0.5)", border: `1px solid ${C.line}`, color: C.ink, fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-line" }}>{c.a}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitChat(); }}
            placeholder="고민을 한 줄로 적어보세요 (예: 올해 이직해도 될까요?)"
            maxLength={200} disabled={chatBusy}
            style={{ ...inp, width: "auto" }}
          />
          <button onClick={submitChat} disabled={chatBusy || !chatInput.trim()} style={{
            flex: "0 0 92px", borderRadius: 10, cursor: chatBusy ? "wait" : "pointer", border: "none",
            background: `linear-gradient(100deg, ${C.gold}, ${C.goldSoft})`, color: "#20180a",
            fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 13,
            opacity: (chatBusy || !chatInput.trim()) ? 0.55 : 1,
          }}>{chatBusy ? "읽는 중…" : "묻기 (1c)"}</button>
        </div>
        {chatErr && <p style={{ fontSize: 11.5, color: C.화, margin: "8px 0 0" }}>{chatErr}</p>}
        <p style={{ fontSize: 10.5, color: C.dim, margin: "10px 0 0", lineHeight: 1.6 }}>
          ※ AI 기능(예언·타로 풀이·상담·부적)을 사용하면 생년월일·이름 등 명식 정보가 Gemini API로 전송돼요.
          답변은 재미로만 참고해 주세요. 크레딧: 텍스트 1c · 부적 이미지 10c.
        </p>
      </Panel>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleCopy} style={{ flex: 1, padding: "15px 0", borderRadius: 12, cursor: "pointer", border: "none", background: copied ? "rgba(63,169,138,0.92)" : `linear-gradient(100deg, ${C.gold}, ${C.goldSoft})`, color: copied ? "#fff" : "#20180a", fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 1, transition: "background .2s" }}>{copied ? "복사됐어요 ✓" : "결과 복사"}</button>
        <button onClick={onReset} style={{ flex: 1, padding: "15px 0", borderRadius: 12, cursor: "pointer", border: `1px solid ${C.gold}`, background: "transparent", color: C.goldSoft, fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600, fontSize: 15, letterSpacing: 1 }}>다시 관측하기</button>
      </div>
      {usageModal}
    </div>
  );
}
