// 손금 관측 노트 엔진 — 확인된 선의 기하 특징을 측정하고 전통 상징 카드를 고른다.
// 좌표계: 사진 표시 좌표(0~100%, 가로 720px·세로 900px 기준). 손 랜드마크(MediaPipe 21점)도 같은 좌표.
// 측정값은 '사진 위의 길이·각도'이며 실제 손의 치수가 아니다. 성향·능력·건강을 판정하지 않는다.
import { BASE_CARDS, SHAPE_CARDS, FRAGMENT_NOTE, HAND_TYPES } from "./palmContent.js";

const PX = (p) => ({ x: p.x * 7.2, y: p.y * 9 });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const round = (v, d = 2) => Number(v.toFixed(d));

function pathLength(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += dist(path[i], path[i - 1]);
  return total;
}

// 현(chord)에서 가장 멀리 떨어진 점까지의 거리 ÷ 현 길이 = 휨 지수(sagitta ratio). 부호: 휘어진 방향.
function sagitta(path) {
  const a = path[0], b = path.at(-1), chord = dist(a, b);
  if (chord < 1e-6) return { ratio: 0, side: 0, chord };
  let best = 0, side = 0;
  for (const p of path) {
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const d = Math.abs(cross) / chord;
    if (d > best) { best = d; side = Math.sign(cross); }
  }
  return { ratio: best / chord, side, chord };
}

// 손 기준 치수 — 손바닥 너비(검지 뿌리 5 ~ 새끼 뿌리 17), 손바닥 길이(손목 0 ~ 중지 뿌리 9), 중지 길이(9~12).
export function handMetrics(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const L = landmarks.map(PX);
  const palmWidth = dist(L[5], L[17]);
  const palmLength = dist(L[0], L[9]);
  const fingerLength = dist(L[9], L[12]);
  const thumbSide = L[5].x < L[17].x ? -1 : 1; // 엄지가 화면 왼쪽이면 -1
  return { L, palmWidth, palmLength, fingerLength, thumbSide,
    palmRatio: round(palmLength / palmWidth), fingerRatio: round(fingerLength / palmLength) };
}

// 서양 수상의 4원소 손 모양 분류. 경계값은 고전 분류(정사각형 손바닥·손가락이 손바닥의 약 3/4~4/5)를 따른다.
export function classifyHand(metrics) {
  if (!metrics) return null;
  const squarePalm = metrics.palmRatio < 1.12;
  const longFingers = metrics.fingerRatio >= 0.78;
  const key = squarePalm ? (longFingers ? "air" : "earth") : (longFingers ? "water" : "fire");
  return { key, ...HAND_TYPES[key], palmRatio: metrics.palmRatio, fingerRatio: metrics.fingerRatio };
}

function longestPath(line) {
  const paths = (line.paths || [line.path || []]).filter((p) => p.length >= 2).map((p) => p.map(PX));
  if (!paths.length) return null;
  return { paths, main: paths.reduce((a, b) => (pathLength(b) > pathLength(a) ? b : a)), total: paths.reduce((n, p) => n + pathLength(p), 0) };
}

// 감정선·두뇌선은 엄지 반대쪽(새끼 쪽)에서 시작해 엄지 쪽으로 흐른다고 보고 x 순서로 정렬한다.
function orientHorizontal(path, thumbSide) {
  const sorted = [...path].sort((a, b) => a.x - b.x);
  return thumbSide < 0 ? sorted.reverse() : sorted; // [새끼 쪽 … 엄지 쪽]
}

export function measureLine(line, metrics, allLines = []) {
  const geo = longestPath(line);
  if (!geo) return null;
  const { main, total, paths } = geo;
  const m = metrics || { palmWidth: 300, palmLength: 360, thumbSide: -1, L: null };
  const W = m.palmWidth, H = m.palmLength;
  const sag = sagitta(main);
  const features = { key: line.key, fragments: paths.length, lengthRatio: round(total / W), curve: round(sag.ratio, 3), tags: [] };

  if (line.key === "heart" || line.key === "head") {
    const ordered = orientHorizontal(main, m.thumbSide);
    const start = ordered[0], end = ordered.at(-1);
    const dx = Math.abs(end.x - start.x) || 1e-6;
    // 기울기(도): 새끼 쪽 끝이 엄지 쪽 끝보다 손목 쪽(아래)으로 얼마나 내려가는가. 사진은 손가락이 위를 향하도록 정규화돼 있다.
    features.slopeDeg = round(Math.atan2(start.y - end.y, dx) * 180 / Math.PI, 1);
    if (line.key === "heart") {
      features.tags.push(sag.ratio >= 0.09 ? "heart.curved" : "heart.straight");
      if (m.L) {
        // 엄지 쪽 끝점이 어느 손가락 뿌리 아래에 있는가 — 검지(5)·중지(9) 뿌리의 x 를 기준으로 판정.
        const xi = m.L[5].x, xm = m.L[9].x, t = (end.x - xm) / ((xi - xm) || 1e-6); // 0=중지, 1=검지
        features.endZone = t >= 0.7 ? "index" : t <= 0.25 ? "middle" : "between";
        features.tags.push(`heart.end.${features.endZone}`);
      }
    }
    if (line.key === "head") {
      features.tags.push(features.slopeDeg >= 14 ? "head.sloping" : "head.straight");
      if (features.lengthRatio >= 0.85) features.tags.push("head.long");
      else if (features.lengthRatio < 0.5) features.tags.push("head.short");
      const life = allLines.find((l) => l.key === "life");
      const lifeGeo = life && longestPath(life);
      if (lifeGeo) {
        const lifeTop = [...lifeGeo.main].sort((a, b) => a.y - b.y)[0];
        features.gapToLife = round(dist(end, lifeTop) / W, 2);
        features.tags.push(features.gapToLife <= 0.16 ? "head.joined" : "head.separate");
      }
    }
  }

  if (line.key === "life") {
    const byY = [...main].sort((a, b) => a.y - b.y);
    const top = byY[0], bottom = byY.at(-1);
    features.verticalRatio = round((bottom.y - top.y) / H);
    if (m.L) {
      // 엄지 뿌리(2)에서 손바닥 중앙 쪽으로 선이 얼마나 벌어져 나오는가.
      const thumbBase = m.L[2], centerDir = -m.thumbSide; // 손바닥 중앙 방향
      const reach = Math.max(...main.map((p) => (p.x - thumbBase.x) * centerDir));
      features.arcReach = round(reach / W, 2);
      features.tags.push(features.arcReach >= 0.42 ? "life.wide" : features.arcReach <= 0.26 ? "life.close" : null);
      const wristY = m.L[0].y;
      features.tags.push(bottom.y >= wristY - 0.3 * H ? "life.long" : features.verticalRatio < 0.45 ? "life.short" : null);
    } else {
      features.tags.push(sag.ratio >= 0.2 ? "life.wide" : "life.close");
    }
  }

  if (line.key === "fate") {
    const byY = [...main].sort((a, b) => a.y - b.y);
    const half = Math.floor(byY.length / 2);
    const ang = (p, q) => Math.atan2(q.x - p.x, q.y - p.y) * 180 / Math.PI;
    const turn = half >= 2 ? Math.abs(ang(byY[0], byY[half]) - ang(byY[half], byY.at(-1))) : 0;
    features.turnDeg = round(turn, 1);
    features.tags.push(turn >= 18 || sag.ratio >= 0.12 ? "fate.bent" : "fate.straight");
    if (m.L) {
      const startFromWrist = (m.L[0].y - byY.at(-1).y) / H; // 아래 끝이 손목에서 얼마나 떨어졌나
      features.tags.push(startFromWrist <= 0.3 ? "fate.fromWrist" : "fate.fromMiddle");
    }
  }
  features.tags = features.tags.filter(Boolean);
  return features;
}

function describe(features) {
  const parts = [`길이 손바닥 너비의 ${features.lengthRatio}배`];
  if (features.curve != null) parts.push(`휨 ${Math.round(features.curve * 100)}%`);
  if (features.slopeDeg != null) parts.push(`기울기 ${features.slopeDeg}°`);
  if (features.arcReach != null) parts.push(`벌어짐 ${Math.round(features.arcReach * 100)}%`);
  if (features.gapToLife != null) parts.push(`생명선 출발점과 거리 ${Math.round(features.gapToLife * 100)}%`);
  if (features.turnDeg != null) parts.push(`방향 변화 ${features.turnDeg}°`);
  if (features.fragments > 1) parts.push(`${features.fragments}조각`);
  return parts;
}

// 최종 관측 노트. palm: PalmScanner 가 확정한 결과({lines, hand}).
export function buildPalmReading(palm) {
  if (!palm?.lines?.length) return null;
  const metrics = handMetrics(palm.hand?.landmarks);
  const handType = classifyHand(metrics);
  const lines = palm.lines.map((line) => {
    const features = measureLine(line, metrics, palm.lines);
    if (!features) return null;
    const shapeCards = features.tags.map((tag) => SHAPE_CARDS[tag]).filter(Boolean);
    return { key: line.key, name: line.name, color: line.color, source: line.source, confidence: line.confidence || "confident",
      features, observed: describe(features), base: BASE_CARDS[line.key], cards: shapeCards,
      fragmentNote: features.fragments > 1 ? FRAGMENT_NOTE : null };
  }).filter(Boolean);
  const order = ["heart", "head", "life", "fate"];
  lines.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return { handType, metrics: metrics && { palmRatio: metrics.palmRatio, fingerRatio: metrics.fingerRatio }, lines,
    summary: summarize(lines, handType) };
}

function summarize(lines, handType) {
  const names = lines.map((l) => l.name).join("·");
  const titles = lines.flatMap((l) => l.cards.slice(0, 1).map((c) => c.title));
  const head = handType ? `${handType.name}(${handType.desc})에 ${names}을 관측했어요.` : `${names}을 관측했어요.`;
  const body = titles.length ? ` 오늘의 관측 주제는 「${titles.join("」「")}」.` : "";
  return head + body + " 선은 결론이 아니라 질문이에요. 마음에 걸리는 질문 하나만 골라 오늘 작은 실험을 해 보세요.";
}

// 공유 텍스트용 요약
export function palmShareText(reading) {
  if (!reading) return "";
  const lines = reading.lines.map((l) => `${l.name}: ${l.observed.join(" · ")}${l.cards[0] ? ` → ${l.cards[0].title}` : ""}`);
  return [reading.handType ? `손 모양: ${reading.handType.name} (${reading.handType.desc})` : null, ...lines,
    `질문: ${reading.lines.map((l) => (l.cards[0] || l.base).question).slice(0, 2).join(" / ")}`].filter(Boolean).join("\n");
}
