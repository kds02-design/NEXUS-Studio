import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'game-banner-automation-'));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (script, args) => execFileSync(process.execPath, [path.join(root, 'scripts', script), ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});

try {
  const aionLock = path.join(testDir, 'aion-lock.json');
  run('resolve-game-profile.mjs', ['--game', '아이온', '--output', aionLock]);
  assert.equal(JSON.parse(fs.readFileSync(aionLock, 'utf8')).profileId, 'aion');

  const bnsLock = path.join(testDir, 'bns-lock.json');
  run('resolve-game-profile.mjs', ['--game', '블소', '--output', bnsLock]);
  const bns = JSON.parse(fs.readFileSync(bnsLock, 'utf8'));
  assert.equal(bns.profileId, 'bns');
  assert.equal(bns.profile.framePolicy.frames.length, 8);

  const campaign = path.join(testDir, 'campaign');
  run('build-game-banner-job.mjs', ['--project', campaign, '--game', 'bns', '--title', '테스트']);
  const jobPath = path.join(campaign, 'banner-job.json');
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  assert.deepEqual(job.visualAuthority, ['form', 'proportion', 'composition', 'image-quality', 'effects']);
  assert.equal(job.pipeline.length, 7);
  const status = JSON.parse(run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'status']));
  assert.equal(status.activeStage, '01-request-analysis');

  const write = (name, data) => fs.writeFileSync(path.join(campaign, name), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  write('request-analysis.json', {status: 'analyzed', itemPresentationRequired: true});
  write('asset-inventory.json', {assets: []});
  write('working-assets-manifest.json', {assets: []});
  let missingDetectionBlocked = false;
  try {
    run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '01-request-analysis']);
  } catch {
    missingDetectionBlocked = true;
  }
  assert.equal(missingDetectionBlocked, true);
  write('request-analysis.json', {
    status: 'analyzed',
    itemPresentationRequired: true,
    itemPresentationDetection: {decision: 'required', signals: ['multiple-item-authorities', 'promoted-floating-cluster']}
  });
  run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '01-request-analysis']);

  write('layout-selection.json', {status: 'locked', catalog: 'aion-bns-shared-40', selectedLayoutId: 'A01', rankedCandidates: Array.from({length: 40}, (_, index) => ({id: `${index < 20 ? 'A' : 'B'}${String((index % 20) + 1).padStart(2, '0')}`, sourceTag: index < 20 ? 'aion' : 'bns', rank: index + 1}))});
  write('layout-blueprint-lock.json', {status: 'locked'});
  run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '02-layout-selection']);

  write('title-shape-lock.json', {status: 'locked', exactText: '테스트', layoutBlueprint: 'layout-blueprint-lock.json'});
  run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '03-title-shape']);
  write('title-render-manifest.json', {status: 'accepted', shapePreserved: true});
  run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '04-title-render']);
  write('visual-asset-production-manifest.json', {status: 'accepted', layoutPreserved: true, identityPreserved: true});
  write('item-presentation-manifest.json', {status: 'accepted', route: 'nexus-item-bundle', slotPreserved: true, identityPreserved: true, identityAudit: [{item: 'reward-1', pass: true}], layers: ['FX_BACK', 'GROUND_OR_CONTACT', 'ITEMS', 'FX_FRONT']});
  run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '05-visual-asset-production']);

  fs.copyFileSync(bnsLock, path.join(campaign, 'game-profile-lock.json'));
  write('master-assembly-manifest.json', {status: 'assembled', masterFrame: {width: 1180, height: 750}});
  write('master-evaluation.json', {status: 'pass'});
  write('master-approval.json', {approved: true, approvalSource: 'user', approvedFrameId: '1180:1'});
  run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '06-master-assembly']);
  write('variant-assembly-manifest.json', {frames: [{name: '1200x628'}]});
  write('frame-manifest.json', {frames: [{name: '1180x750'}, {name: '1200x628'}]});
  write('delivery-validation.json', {pass: true});
  run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '07-variant-assembly']);
  const delivery = JSON.parse(run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'assert-delivery']));
  assert.equal(delivery.completedStages, 7);

  run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'reopen', '--stage', '05-visual-asset-production', '--reason', 'verify item gate']);
  write('item-presentation-manifest.json', {status: 'omitted'});
  let itemGateBlocked = false;
  try {
    run('banner-workflow-gate.mjs', ['--job', jobPath, '--action', 'complete', '--stage', '05-visual-asset-production']);
  } catch {
    itemGateBlocked = true;
  }
  assert.equal(itemGateBlocked, true);

  console.log(JSON.stringify({pass: true, tests: 14}, null, 2));
} finally {
  fs.rmSync(testDir, {recursive: true, force: true});
}
