import test from 'node:test';
import assert from 'node:assert/strict';
import { photoPoint, editPoint, reviewLines, renderPalmOverlay } from './photoReview.js';
import { inspectFace } from './faceObservation.js';

test('mobile and desktop map to identical photo coordinates, clamp outside drags', () => {
  assert.deepEqual(photoPoint(180, 275, { left: 0, top: 50, width: 360, height: 450 }), { x: 50, y: 50 });
  assert.deepEqual(photoPoint(460, 550, { left: 100, top: 100, width: 720, height: 900 }), { x: 50, y: 50 });
  assert.deepEqual(photoPoint(-50, 600, { left: 0, top: 0, width: 360, height: 450 }), { x: 0, y: 100 });
});
test('edits are immutable and correctly attributed, incomplete paths excluded', () => {
  const lines = [{ key: 'heart', path: [{ x: 0, y: 0 }, { x: 20, y: 30 }] }];
  const next = editPoint(lines, 'heart', 1, { x: 40, y: 60 });
  assert.equal(lines[0].path[1].x, 20);
  assert.equal(next[0].source, 'manual');
  assert.equal(reviewLines(next)[0].name, '감정선');
  assert.deepEqual(reviewLines([{ key: 'life', path: [{ x: 1, y: 2 }] }]), []);
});
test('saved overlay uses exactly the same coordinates as editor', () => {
  const calls = [];
  const ctx = Object.fromEntries(['beginPath','moveTo','lineTo','stroke'].map(name => [name, (...args) => calls.push([name, ...args])]));
  globalThis.document = { createElement: () => ({ getContext: () => ctx, toDataURL: () => 'png' }) };
  try { assert.equal(renderPalmOverlay([{ key: 'heart', path: [{ x: 10, y: 20 }, { x: 90, y: 80 }] }]), 'png'); }
  finally { delete globalThis.document; }
  assert.ok(calls.some(c => c[0] === 'moveTo' && c[1] === 72 && c[2] === 180));
  assert.ok(calls.some(c => c[0] === 'lineTo' && c[1] === 648 && c[2] === 720));
});
function frontal() {
  const p = Array.from({ length: 478 }, () => ({ x: .5, y: .5 }));
  p[234] = { x: .25, y: .5 }; p[454] = { x: .75, y: .5 };
  p[10] = { x: .5, y: .15 }; p[152] = { x: .5, y: .85 };
  p[33] = { x: .35, y: .4 }; p[263] = { x: .65, y: .4 };
  return p;
}
test('face checks reject no face, multiple faces and invalid coordinates', () => {
  assert.throws(() => inspectFace([], 720, 900), /얼굴을 찾지/);
  assert.throws(() => inspectFace([frontal(), frontal()], 720, 900), /한 사람/);
  const p = frontal(); p[1].x = NaN;
  assert.throws(() => inspectFace([p], 720, 900), /좌표/);
});
test('face ratios use pixel aspect and flag small, tilted and cropped photos', () => {
  const result = inspectFace([frontal()], 720, 900);
  assert.equal(result.ratio, 1.75); assert.deepEqual(result.warnings, []);
  assert.ok(inspectFace([frontal()], 200, 300).warnings.some(w => w.includes('작게')));
  const p = frontal(); p[263].y = .6; p[10].y = 0;
  const warnings = inspectFace([p], 720, 900).warnings;
  assert.ok(warnings.some(w => w.includes('기울'))); assert.ok(warnings.some(w => w.includes('가장자리')));
});
