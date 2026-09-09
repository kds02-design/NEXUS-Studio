import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'typecore-geometry-'));
const run = (script, args) => execFileSync(process.execPath, [path.join(root, 'scripts', script), ...args], {encoding: 'utf8'});

try {
  const shortPlan = JSON.parse(run('plan-title-geometry.mjs', ['--text', '무극상자', '--slot-width', '820', '--slot-height', '150']));
  assert.equal(shortPlan.schema, 'typecore-title-geometry-plan/v2');
  assert.equal(shortPlan.status, 'planned');
  assert.equal(shortPlan.selected.lineCount, 1);
  assert.equal(shortPlan.selected.horizontalScale, 1);
  assert.equal(shortPlan.selected.verticalScale, 1);
  assert.equal(shortPlan.selected.canvasAspectRatio, '2.76:1');

  const longPlanPath = path.join(temp, 'long-plan.json');
  const longPlan = JSON.parse(run('plan-title-geometry.mjs', ['--text', '가나다라마바사아자차', '--slot-width', '820', '--slot-height', '150', '--output', longPlanPath]));
  assert.equal(longPlan.titleLength, 10);
  assert.equal(longPlan.selected.lineCount, 1);
  assert.equal(longPlan.selected.horizontalScale, 1);
  assert.ok(longPlan.selected.artworkRatio > 8);
  assert.ok(longPlan.selected.renderPlacement.heightOccupancy > 0.25);
  assert.ok(longPlan.selected.renderPlacement.topBottomMargin > 0.35);
  assert.equal(longPlan.constraints.horizontalGlyphCondensationAllowed, false);
  assert.equal(longPlan.proxyRecomposition.eligible, true);

  const forced = spawnSync(process.execPath, [path.join(root, 'scripts', 'plan-title-geometry.mjs'), '--text', '가나다라마바사아자차', '--slot-width', '820', '--slot-height', '150', '--lines', '1'], {encoding: 'utf8'});
  assert.equal(forced.status, 0);
  const forcedResult = JSON.parse(forced.stdout);
  assert.equal(forcedResult.status, 'planned');
  assert.equal(forcedResult.selected.nonProportionalScaling, false);

  const extraLong = JSON.parse(run('plan-title-geometry.mjs', ['--text', '가나다라마바사아자차카타파하거너더러머버서', '--slot-width', '820', '--slot-height', '150']));
  assert.equal(extraLong.selected.lineCount, 2);
  assert.equal(extraLong.selected.horizontalScale, 1);
  assert.equal(extraLong.selected.requiresSemanticApproval, true);

  const brief = JSON.parse(run('build-title-brief.mjs', ['--text', '가나다라마바사아자차', '--geometry-plan', longPlanPath]));
  assert.equal(brief.version, 2);
  assert.equal(brief.lines.length, 1);
  assert.equal(brief.geometryPlan.verticalScale, 1);
  assert.equal(brief.ratio, '2.76:1');
  assert.equal(brief.geometryPlan.artworkRatio, longPlan.selected.artworkRatio);
  assert.ok(brief.prompt.includes('Do not narrow glyph width'));

  const noPlan = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-title-brief.mjs'), '--text', '가나다라마바사아자차'], {encoding: 'utf8'});
  assert.notEqual(noPlan.status, 0);
  assert.match(noPlan.stderr, /--geometry-plan/);

  const proxyBrief = JSON.parse(run('build-title-brief.mjs', ['--text', '가나다라마바사아자차', '--geometry-plan', longPlanPath, '--proxy-recompose']));
  assert.equal(proxyBrief.generationMode, 'two-row-proxy-for-single-line-recomposition');
  assert.equal(proxyBrief.lines.length, 2);
  assert.equal(proxyBrief.proxyRecomposition.finalRows.length, 1);
  assert.equal(proxyBrief.proxyRecomposition.canvasAspectRatio, '2.76:1');

  console.log(JSON.stringify({pass: true, tests: 29}, null, 2));
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
