import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { measureFace, classifyShape, classifySamjeong, featureTags, buildFaceReading, faceShareText, faceGuides } from "./faceReading.js";
import { FEATURE_CARDS, FACE_SHAPES, SAMJEONG_CARDS } from "./faceContent.js";

// 실제 468점 메시 샘플(공개 인물 사진에서 추출한 좌표만 저장, 사진은 포함하지 않음)
const sample = JSON.parse(readFileSync(new URL("./fixtures/face-landmarks-sample.json", import.meta.url), "utf8"));

test("measures a real 468-point mesh into plausible photo ratios", () => {
  const m = measureFace(sample.lm, sample.w, sample.h);
  assert.ok(m.faceRatio > 1.0 && m.faceRatio < 1.6, `faceRatio ${m.faceRatio}`);
  assert.equal(m.samjeong.upper + m.samjeong.middle + m.samjeong.lower, 100);
  assert.ok(m.eyeGap > 0.7 && m.eyeGap < 1.6);
  assert.ok(m.noseWidth > 0.8 && m.noseWidth < 1.8);
  assert.ok(m.mouthWidth > 1.0 && m.mouthWidth < 2.2);
  assert.ok(Math.abs(m.eyeTilt) < 10, "near-level eyes on a frontal portrait");
});

test("shape and samjeong classification are stable and every tag has a card", () => {
  const m = measureFace(sample.lm, sample.w, sample.h);
  assert.ok(FACE_SHAPES[classifyShape(m).key]);
  assert.ok(SAMJEONG_CARDS[classifySamjeong(m.samjeong).key]);
  for (const tag of featureTags(m)) assert.ok(FEATURE_CARDS[tag], tag);
  assert.equal(classifyShape({ faceRatio: 1.5, jawRatio: .8, foreheadRatio: .75 }).key, "목");
  assert.equal(classifyShape({ faceRatio: 1.15, jawRatio: .95, foreheadRatio: .8 }).key, "토");
  assert.equal(classifyShape({ faceRatio: 1.28, jawRatio: .95, foreheadRatio: .8 }).key, "금");
  assert.equal(classifyShape({ faceRatio: 1.25, jawRatio: .7, foreheadRatio: .78 }).key, "화");
  assert.equal(classifyShape({ faceRatio: 1.1, jawRatio: .8, foreheadRatio: .7 }).key, "수");
  assert.equal(classifySamjeong({ upper: 33, middle: 34, lower: 33 }).key, "balanced");
  assert.equal(classifySamjeong({ upper: 40, middle: 30, lower: 30 }).key, "upper");
});

test("feature tags fire on the documented thresholds without contradictions", () => {
  const base = { eyeGap: 1, eyeOpen: .3, eyeTilt: 0, browGap: .45, noseWidth: 1.1, noseLength: .27, mouthWidth: 1.5, lipThickness: .2, philtrum: .16, chin: .42, foreheadRatio: .75, jawRatio: .82 };
  assert.deepEqual(featureTags(base), []);
  assert.deepEqual(featureTags({ ...base, eyeGap: 1.2, eyeTilt: 6, mouthWidth: 1.8 }), ["eyes.wideGap", "eyes.upturned", "mouth.wide"]);
  assert.deepEqual(featureTags({ ...base, eyeOpen: .2, browGap: .2, chin: .3, jawRatio: .7 }), ["eyes.narrow", "brow.low", "chin.short", "jaw.narrow"]);
});

test("reading, share text and overlay guides assemble; missing mesh returns null", () => {
  const reading = buildFaceReading({ landmarks: sample.lm, width: sample.w, height: sample.h });
  assert.ok(reading.summary.includes("삼정"));
  assert.ok(reading.observed.length >= 12);
  assert.ok(faceShareText(reading).includes("윤곽:"));
  const guides = faceGuides(sample.lm);
  assert.equal(guides.samjeong.length, 4);
  assert.equal(guides.widths.length, 5);
  assert.equal(buildFaceReading({ landmarks: [], width: 1, height: 1 }), null);
  assert.equal(buildFaceReading(null), null);
});
