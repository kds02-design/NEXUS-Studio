// 관상 관측 노트 엔진 — MediaPipe 468점 얼굴 메시로 삼정·오형·부위 비율을 재고 전통 상징 카드를 고른다.
// 입력 landmarks 는 0~1 정규화 좌표, width/height 는 사진 픽셀 크기(비율 보정용). 모든 결과는 '사진상의 비율'이다.
import { FACE_SHAPES, SAMJEONG_CARDS, FEATURE_CARDS } from "./faceContent.js";

// MediaPipe Face Mesh 랜드마크 인덱스
export const FM = {
  foreheadTop: 10, glabella: 9, nasion: 168, noseTip: 1, subnasale: 2, lipTop: 0, lipInnerUpper: 13, lipInnerLower: 14, lipBottom: 17, chin: 152,
  cheekR: 234, cheekL: 454, jawR: 172, jawL: 397, foreheadR: 103, foreheadL: 332,
  eyeR: { outer: 33, inner: 133, top: 159, bottom: 145 }, eyeL: { outer: 263, inner: 362, top: 386, bottom: 374 },
  browR: 105, browL: 334, alaR: 129, alaL: 358, mouthR: 61, mouthL: 291,
};

const round = (v, d = 2) => Number(v.toFixed(d));

export function measureFace(landmarks, width, height) {
  if (!landmarks || landmarks.length < 468) return null;
  const P = (i) => ({ x: landmarks[i].x * width, y: landmarks[i].y * height });
  const d = (a, b) => Math.hypot(P(a).x - P(b).x, P(a).y - P(b).y);
  const dy = (a, b) => Math.abs(P(a).y - P(b).y);

  const faceW = d(FM.cheekR, FM.cheekL), faceH = dy(FM.foreheadTop, FM.chin);
  const jawW = d(FM.jawR, FM.jawL), foreheadW = d(FM.foreheadR, FM.foreheadL);
  // 메시의 이마 윗점(10)은 헤어라인이 아니라 이마 중간쯤이다. 헤어라인까지의 상정은 그 구간을 0.6 으로 나눠 추정한다(표기: 추정).
  const upper = dy(FM.foreheadTop, FM.glabella) / 0.6, middle = dy(FM.glabella, FM.subnasale), lower = dy(FM.subnasale, FM.chin);
  const total = upper + middle + lower;

  const eyeW = (d(FM.eyeR.outer, FM.eyeR.inner) + d(FM.eyeL.outer, FM.eyeL.inner)) / 2;
  const eyeH = (dy(FM.eyeR.top, FM.eyeR.bottom) + dy(FM.eyeL.top, FM.eyeL.bottom)) / 2;
  const interEye = d(FM.eyeR.inner, FM.eyeL.inner);
  // 눈꼬리 기울기: 바깥 끝이 안쪽 끝보다 위에 있으면 양수(올라간 눈). 좌우 평균으로 고개 기울기 영향을 상쇄.
  const tiltR = Math.atan2(P(FM.eyeR.inner).y - P(FM.eyeR.outer).y, P(FM.eyeR.inner).x - P(FM.eyeR.outer).x);
  const tiltL = Math.atan2(P(FM.eyeL.inner).y - P(FM.eyeL.outer).y, P(FM.eyeL.outer).x - P(FM.eyeL.inner).x);
  const eyeTilt = (tiltR + tiltL) / 2 * 180 / Math.PI;
  const browGap = (dy(FM.browR, FM.eyeR.top) + dy(FM.browL, FM.eyeL.top)) / 2;
  const noseW = d(FM.alaR, FM.alaL), noseL = dy(FM.nasion, FM.subnasale);
  const mouthW = d(FM.mouthR, FM.mouthL);
  const lipThick = dy(FM.lipTop, FM.lipInnerUpper) + dy(FM.lipInnerLower, FM.lipBottom);
  const philtrum = dy(FM.subnasale, FM.lipTop), chin = dy(FM.lipBottom, FM.chin);

  return {
    faceRatio: round(faceH / faceW), jawRatio: round(jawW / faceW), foreheadRatio: round(foreheadW / faceW),
    samjeong: { upper: round(upper / total * 100, 0), middle: round(middle / total * 100, 0), lower: round(lower / total * 100, 0) },
    eyeGap: round(interEye / eyeW), eyeOpen: round(eyeH / eyeW), eyeTilt: round(eyeTilt, 1), browGap: round(browGap / eyeW),
    noseWidth: round(noseW / interEye), noseLength: round(noseL / faceH), mouthWidth: round(mouthW / noseW), lipThickness: round(lipThick / mouthW),
    philtrum: round(philtrum / lower), chin: round(chin / lower),
  };
}

// 오형 분류 — 세로/가로, 턱/얼굴 너비, 이마/얼굴 너비 조합. 경계는 사진 메시(이마 윗점 10 ~ 턱 152) 기준의 경험값.
export function classifyShape(m) {
  if (!m) return null;
  let key;
  if (m.faceRatio >= 1.34) key = "목";
  else if (m.jawRatio >= 0.92) key = m.faceRatio <= 1.2 ? "토" : "금";
  else if (m.jawRatio <= 0.74 && m.foreheadRatio >= m.jawRatio) key = "화";
  else if (m.faceRatio <= 1.2) key = "수";
  else key = m.jawRatio >= 0.86 ? "토" : m.faceRatio >= 1.27 ? "목" : "수";
  return { key, ...FACE_SHAPES[key] };
}

export function classifySamjeong(s) {
  const entries = [["upper", s.upper], ["middle", s.middle], ["lower", s.lower]];
  const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const min = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
  const key = max[1] - min[1] <= 8 ? "balanced" : max[0];
  return { key, ...SAMJEONG_CARDS[key] };
}

export function featureTags(m) {
  const tags = [];
  if (m.eyeGap >= 1.15) tags.push("eyes.wideGap"); else if (m.eyeGap <= 0.85) tags.push("eyes.narrowGap");
  if (m.eyeOpen >= 0.38) tags.push("eyes.open"); else if (m.eyeOpen <= 0.25) tags.push("eyes.narrow");
  if (m.eyeTilt >= 5) tags.push("eyes.upturned"); else if (m.eyeTilt <= -5) tags.push("eyes.downturned");
  if (m.browGap >= 0.6) tags.push("brow.high"); else if (m.browGap <= 0.3) tags.push("brow.low");
  if (m.noseWidth >= 1.3) tags.push("nose.wide"); else if (m.noseWidth <= 1.0) tags.push("nose.narrow");
  if (m.noseLength >= 0.31) tags.push("nose.long");
  if (m.mouthWidth >= 1.7) tags.push("mouth.wide"); else if (m.mouthWidth <= 1.25) tags.push("mouth.small");
  if (m.lipThickness >= 0.28) tags.push("lips.full"); else if (m.lipThickness <= 0.15) tags.push("lips.thin");
  if (m.philtrum >= 0.2) tags.push("philtrum.long"); else if (m.philtrum <= 0.12) tags.push("philtrum.short");
  if (m.chin >= 0.5) tags.push("chin.long"); else if (m.chin <= 0.33) tags.push("chin.short");
  if (m.foreheadRatio >= 0.82) tags.push("forehead.wide"); else if (m.foreheadRatio <= 0.66) tags.push("forehead.narrow");
  if (m.jawRatio >= 0.92) tags.push("jaw.wide"); else if (m.jawRatio <= 0.72) tags.push("jaw.narrow");
  return tags;
}

const OBSERVED = (m) => [
  `세로/가로 ${m.faceRatio}`, `턱 너비 ${Math.round(m.jawRatio * 100)}%`, `이마 너비 ${Math.round(m.foreheadRatio * 100)}%`,
  `삼정 ${m.samjeong.upper}:${m.samjeong.middle}:${m.samjeong.lower} (이마 추정)`, `눈 사이 ${m.eyeGap}눈`, `눈 열림 ${Math.round(m.eyeOpen * 100)}%`,
  `눈꼬리 ${m.eyeTilt > 0 ? "+" : ""}${m.eyeTilt}°`, `눈썹 높이 ${m.browGap}눈`, `코 너비 ${m.noseWidth}눈사이`, `코 길이 ${Math.round(m.noseLength * 100)}%`, `입/코 ${m.mouthWidth}`,
  `입술 두께 ${Math.round(m.lipThickness * 100)}%`, `인중 ${Math.round(m.philtrum * 100)}%`, `턱 길이 ${Math.round(m.chin * 100)}%`,
];

// 측정 보조선 — 오버레이에 그릴 선분(정규화 좌표)
export function faceGuides(landmarks) {
  const L = (i) => landmarks[i];
  const xs = landmarks.map((p) => p.x);
  const left = Math.min(...xs), right = Math.max(...xs);
  const h = (i) => ({ from: { x: left, y: L(i).y }, to: { x: right, y: L(i).y } });
  return {
    samjeong: [h(FM.foreheadTop), h(FM.glabella), h(FM.subnasale), h(FM.chin)],
    widths: [[FM.cheekR, FM.cheekL], [FM.jawR, FM.jawL], [FM.foreheadR, FM.foreheadL], [FM.alaR, FM.alaL], [FM.mouthR, FM.mouthL]].map(([a, b]) => ({ from: L(a), to: L(b) })),
    labels: [
      { at: { x: right, y: (L(FM.foreheadTop).y + L(FM.glabella).y) / 2 }, text: "상정" },
      { at: { x: right, y: (L(FM.glabella).y + L(FM.subnasale).y) / 2 }, text: "중정" },
      { at: { x: right, y: (L(FM.subnasale).y + L(FM.chin).y) / 2 }, text: "하정" },
    ],
  };
}

export function buildFaceReading(face) {
  const m = measureFace(face?.landmarks, face?.width || 1, face?.height || 1);
  if (!m) return null;
  const shape = classifyShape(m);
  const samjeong = classifySamjeong(m.samjeong);
  const tags = featureTags(m);
  const cards = tags.map((tag) => ({ tag, ...FEATURE_CARDS[tag] })).filter((c) => c.title);
  const titles = [samjeong.title, ...cards.slice(0, 2).map((c) => c.title)];
  const summary = `사진상 윤곽은 ${shape.name}(${shape.desc}), 삼정은 ${m.samjeong.upper}:${m.samjeong.middle}:${m.samjeong.lower}으로 재어졌어요. 오늘의 관측 주제는 「${titles.join("」「")}」. 얼굴로 사람을 판정하지 않아요 — 질문 하나만 골라 가져가세요.`;
  return { measures: m, observed: OBSERVED(m), shape, samjeong, tags, cards, summary };
}

export function faceShareText(reading) {
  if (!reading) return "";
  return [`윤곽: ${reading.shape.name} · 삼정 ${reading.measures.samjeong.upper}:${reading.measures.samjeong.middle}:${reading.measures.samjeong.lower} → ${reading.samjeong.title}`,
    ...reading.cards.slice(0, 4).map((c) => `${c.palace}: ${c.title}`),
    `질문: ${(reading.cards[0] || reading.samjeong).question}`].join("\n");
}
