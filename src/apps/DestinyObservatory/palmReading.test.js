import test from "node:test";
import assert from "node:assert/strict";
import { handMetrics, classifyHand, measureLine, buildPalmReading, palmShareText } from "./palmReading.js";
import { SHAPE_CARDS, BASE_CARDS, HAND_TYPES } from "./palmContent.js";

// 합성 손 — 엄지가 화면 왼쪽, 손가락이 위. 표시 좌표(%)로 적는다. px = (x*7.2, y*9)
const pct = (x, y) => ({ x: x / 7.2, y: y / 9 });
const landmarks = Array.from({ length: 21 }, () => pct(360, 760));
landmarks[0] = pct(360, 760); // 손목
landmarks[1] = pct(250, 680); landmarks[2] = pct(200, 560); landmarks[3] = pct(150, 480); landmarks[4] = pct(110, 420);
landmarks[5] = pct(210, 400); landmarks[9] = pct(360, 400); landmarks[13] = pct(440, 410); landmarks[17] = pct(510, 430);
landmarks[12] = pct(360, 120); // 중지 끝

const curve = (from, to, bulge, n = 40) => Array.from({ length: n }, (_, i) => {
  const t = i / (n - 1);
  return pct(from[0] + (to[0] - from[0]) * t + bulge[0] * Math.sin(Math.PI * t), from[1] + (to[1] - from[1]) * t + bulge[1] * Math.sin(Math.PI * t));
});

test("hand metrics and four-element classification follow palm/finger ratios", () => {
  const m = handMetrics(landmarks);
  assert.equal(m.thumbSide, -1);
  assert.ok(Math.abs(m.palmWidth - Math.hypot(300, 30)) < 1);
  assert.equal(m.palmRatio, 1.19); // 긴 손바닥
  assert.equal(m.fingerRatio, 0.78); // 긴 손가락 → 물의 손
  assert.equal(classifyHand(m).key, "water");
  assert.equal(classifyHand({ palmRatio: 1.0, fingerRatio: 0.7 }).key, "earth");
  assert.equal(classifyHand({ palmRatio: 1.0, fingerRatio: 0.85 }).key, "air");
  assert.equal(classifyHand({ palmRatio: 1.3, fingerRatio: 0.7 }).key, "fire");
  assert.equal(classifyHand(null), null);
});

test("heart line: curvature and end zone under the index finger", () => {
  const m = handMetrics(landmarks);
  const curved = { key: "heart", paths: [curve([520, 440], [225, 400], [0, -45])] };
  const f = measureLine(curved, m);
  assert.ok(f.curve >= 0.09, `curve ${f.curve}`);
  assert.equal(f.endZone, "index");
  assert.deepEqual(f.tags, ["heart.curved", "heart.end.index"]);
  const straight = { key: "heart", paths: [curve([520, 440], [350, 420], [0, 0])] };
  const g = measureLine(straight, m);
  assert.deepEqual(g.tags, ["heart.straight", "heart.end.middle"]);
});

test("head line: slope toward the wrist on the pinky side, length and joined start", () => {
  const m = handMetrics(landmarks);
  const life = { key: "life", paths: [curve([240, 470], [300, 740], [60, 0])] };
  const sloping = { key: "head", paths: [curve([245, 470], [520, 570], [0, 0])] };
  const f = measureLine(sloping, m, [sloping, life]);
  assert.ok(f.slopeDeg > 14, `slope ${f.slopeDeg}`);
  assert.ok(f.tags.includes("head.sloping"));
  assert.ok(f.tags.includes("head.long"));
  assert.ok(f.tags.includes("head.joined"), f.tags.join());
  const separate = { key: "head", paths: [curve([330, 440], [450, 448], [0, 0])] };
  const g = measureLine(separate, m, [separate, life]);
  assert.ok(g.tags.includes("head.straight"));
  assert.ok(g.tags.includes("head.short"));
  assert.ok(g.tags.includes("head.separate"));
});

test("life line: arc reach and length relative to the wrist", () => {
  const m = handMetrics(landmarks);
  const wide = { key: "life", paths: [curve([240, 470], [320, 740], [90, 0])] };
  const f = measureLine(wide, m);
  assert.ok(f.tags.includes("life.wide"), f.tags.join());
  assert.ok(f.tags.includes("life.long"), f.tags.join());
  const close = { key: "life", paths: [curve([240, 470], [250, 580], [10, 0])] };
  const g = measureLine(close, m);
  assert.ok(g.tags.includes("life.close"));
  assert.ok(g.tags.includes("life.short"));
});

test("fate line: straight from the wrist vs bent from the middle", () => {
  const m = handMetrics(landmarks);
  const straight = { key: "fate", paths: [curve([380, 740], [370, 450], [0, 0])] };
  assert.deepEqual(measureLine(straight, m).tags, ["fate.straight", "fate.fromWrist"]);
  const bentPath = [...curve([380, 600], [360, 520], [0, 0], 10), ...curve([360, 520], [300, 450], [0, 0], 10)];
  const bent = { key: "fate", paths: [bentPath] };
  const f = measureLine(bent, m);
  assert.ok(f.tags.includes("fate.bent"), f.tags.join());
  assert.ok(f.tags.includes("fate.fromMiddle"));
});

test("every shape tag has a card and the reading assembles without the hand landmarks too", () => {
  const tags = ["heart.curved", "heart.straight", "heart.end.index", "heart.end.middle", "heart.end.between", "head.straight", "head.sloping", "head.long", "head.short", "head.joined", "head.separate", "life.wide", "life.close", "life.long", "life.short", "fate.straight", "fate.bent", "fate.fromWrist", "fate.fromMiddle"];
  for (const tag of tags) assert.ok(SHAPE_CARDS[tag], tag);
  for (const key of ["heart", "head", "life", "fate"]) assert.ok(BASE_CARDS[key]);
  assert.equal(Object.keys(HAND_TYPES).length, 4);
  const palm = { hand: { landmarks }, lines: [
    { key: "heart", name: "감정선", color: "#f04e45", paths: [curve([520, 440], [225, 400], [0, -45])] },
    { key: "life", name: "생명선", color: "#55b89a", paths: [curve([240, 470], [320, 740], [90, 0]), curve([330, 750], [340, 780], [0, 0], 5)] },
  ] };
  const reading = buildPalmReading(palm);
  assert.equal(reading.handType.key, "water");
  assert.equal(reading.lines.length, 2);
  assert.ok(reading.lines[1].fragmentNote, "two fragments produce a fragment note");
  assert.ok(reading.summary.includes("물의 손"));
  assert.ok(palmShareText(reading).includes("감정선"));
  const noHand = buildPalmReading({ lines: palm.lines });
  assert.equal(noHand.handType, null);
  assert.ok(noHand.lines[0].cards.length >= 1);
  assert.equal(buildPalmReading({ lines: [] }), null);
});
