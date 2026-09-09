import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const jobPath = path.resolve(value('--job') || 'banner-job.json');
const action = value('--action');
const stageId = value('--stage');
const reason = value('--reason');
if (!action) throw new Error('Usage: banner-workflow-gate.mjs --job banner-job.json --action status|complete|reopen|assert-delivery [--stage id] [--reason text]');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, data) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const job = readJson(jobPath);
if (job.schema !== 'game-banner-job/v1') throw new Error(`Unsupported job schema: ${job.schema}`);
const statePath = path.resolve(job.workflowControl.stateFile);
const state = readJson(statePath);
const project = path.resolve(job.projectWorkspace);

const objectEvidence = (name) => {
  const file = path.join(project, name);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) throw new Error(`Missing or empty evidence: ${name}`);
  return {file, data: name.endsWith('.json') ? readJson(file) : null};
};

const validateStage = (stage) => {
  const records = Object.fromEntries(stage.evidence.map((name) => [name, objectEvidence(name)]));
  const data = (name) => records[name]?.data;
  if (stage.id === '01-request-analysis') {
    const request = data('request-analysis.json');
    const detection = request?.itemPresentationDetection;
    if (request?.status !== 'analyzed') throw new Error('request-analysis.json must have status analyzed');
    if (!['required', 'not-required'].includes(detection?.decision) || !Array.isArray(detection?.signals) || detection.signals.length === 0) throw new Error('request-analysis.json requires an evidence-backed itemPresentationDetection decision');
    if (request.itemPresentationRequired !== (detection.decision === 'required')) throw new Error('itemPresentationRequired must agree with itemPresentationDetection.decision');
  }
  if (stage.id === '02-layout-selection') {
    const layout = data('layout-selection.json');
    const candidates = layout?.rankedCandidates;
    if (layout?.status !== 'locked' || layout.catalog !== 'aion-bns-shared-40' || !layout.selectedLayoutId || !Array.isArray(candidates) || candidates.length !== 40) throw new Error('layout-selection.json must lock one selection after ranking the shared 40-candidate pool');
    if (new Set(candidates.map((candidate) => candidate.id)).size !== 40) throw new Error('layout-selection.json candidate IDs must be unique');
    const sourceCounts = candidates.reduce((counts, candidate) => ({...counts, [candidate.sourceTag]: (counts[candidate.sourceTag] || 0) + 1}), {});
    if (sourceCounts.aion !== 20 || sourceCounts.bns !== 20) throw new Error('layout-selection.json must include 20 Aion-tagged and 20 BNS-tagged candidates');
  }
  if (stage.id === '03-title-shape') {
    const shape = data('title-shape-lock.json');
    if (!['locked', 'omitted'].includes(shape?.status)) throw new Error('title-shape-lock.json must be locked or omitted');
    if (shape.status === 'locked' && (!shape.exactText || !shape.layoutBlueprint)) throw new Error('locked title shape requires exactText and layoutBlueprint');
  }
  if (stage.id === '04-title-render') {
    const render = data('title-render-manifest.json');
    if (!['accepted', 'reused', 'omitted'].includes(render?.status) || render.shapePreserved !== true) throw new Error('title render must be accepted, reused, or omitted with shapePreserved true');
  }
  if (stage.id === '05-visual-asset-production') {
    const production = data('visual-asset-production-manifest.json');
    const item = data('item-presentation-manifest.json');
    const request = readJson(path.join(project, 'request-analysis.json'));
    if (production?.status !== 'accepted' || production.layoutPreserved !== true || production.identityPreserved !== true) throw new Error('visual asset production must preserve layout and identity');
    if (!['accepted', 'omitted'].includes(item?.status)) throw new Error('item presentation must be accepted or omitted');
    if (request.itemPresentationRequired === true && item.status !== 'accepted') throw new Error('an item-bearing request requires an accepted item presentation');
    if (item.status === 'accepted') {
      const routes = ['nexus-item-bundle', 'nexus-floating', 'primary-satellites', 'rubicon-effect-only', 'deterministic'];
      if (!routes.includes(item.route) || item.slotPreserved !== true || item.identityPreserved !== true || !Array.isArray(item.identityAudit) || !Array.isArray(item.layers) || !item.layers.length) throw new Error('accepted item presentation requires a valid route, slot parity, identity audit, and layers');
    }
  }
  if (stage.id === '06-master-assembly') {
    const profile = data('game-profile-lock.json');
    const master = data('master-assembly-manifest.json');
    const evaluation = data('master-evaluation.json');
    const approval = data('master-approval.json');
    if (profile?.status !== 'locked' || !profile.profileId || !profile.profileVersion || !profile.profile?.framePolicy?.frames?.length) throw new Error('game-profile-lock.json is not a valid locked profile snapshot');
    if (master?.status !== 'assembled' || master.masterFrame?.width !== 1180) throw new Error('master assembly must contain an assembled 1180-wide frame');
    if (!['pass', 'max-rounds', 'not-required'].includes(evaluation?.status)) throw new Error('master-evaluation.json has an invalid status');
    if (approval?.approved !== true || !approval.approvalSource || !approval.approvedFrameId) throw new Error('master-approval.json requires explicit approval evidence');
  }
  if (stage.id === '07-variant-assembly') {
    if (!data('variant-assembly-manifest.json')?.frames?.length) throw new Error('variant-assembly-manifest.json requires frames');
    if (!data('frame-manifest.json')?.frames?.length) throw new Error('frame-manifest.json requires frames');
    if (data('delivery-validation.json')?.pass !== true) throw new Error('delivery-validation.json must have pass true');
  }
  return Object.fromEntries(Object.entries(records).map(([name, record]) => [name, hash(record.file)]));
};

const refreshStaleState = () => {
  let firstChanged = null;
  for (const stage of state.stages) {
    if (stage.status !== 'complete') continue;
    for (const [name, oldHash] of Object.entries(stage.evidenceHashes || {})) {
      const file = path.join(project, name);
      if (!fs.existsSync(file) || hash(file) !== oldHash) {
        firstChanged = stage.index;
        break;
      }
    }
    if (firstChanged !== null) break;
  }
  if (firstChanged === null) return;
  for (const stage of state.stages) {
    if (stage.index < firstChanged) continue;
    stage.status = stage.index === firstChanged ? 'stale' : 'blocked';
    stage.completedAt = null;
    stage.evidenceHashes = {};
  }
  state.activeStage = state.stages[firstChanged].id;
};

refreshStaleState();

if (action === 'status') {
  state.updatedAt = new Date().toISOString();
  writeJson(statePath, state);
  console.log(JSON.stringify({stateFile: statePath, activeStage: state.activeStage, stages: state.stages.map(({id, status}) => ({id, status}))}, null, 2));
} else if (action === 'complete') {
  if (!stageId || stageId !== state.activeStage) throw new Error(`Complete only the active stage: ${state.activeStage}`);
  const stage = state.stages.find((candidate) => candidate.id === stageId);
  if (!stage || !['ready', 'stale'].includes(stage.status)) throw new Error(`${stageId} is not ready`);
  if (state.stages.some((candidate) => candidate.index < stage.index && candidate.status !== 'complete')) throw new Error(`${stageId}: prior stages are incomplete`);
  stage.evidenceHashes = validateStage(stage);
  stage.status = 'complete';
  stage.completedAt = new Date().toISOString();
  const next = state.stages[stage.index + 1];
  if (next) {
    next.status = 'ready';
    state.activeStage = next.id;
  } else {
    state.activeStage = null;
  }
  state.updatedAt = new Date().toISOString();
  writeJson(statePath, state);
  console.log(JSON.stringify({completed: stageId, activeStage: state.activeStage}, null, 2));
} else if (action === 'reopen') {
  if (!stageId || !reason?.trim()) throw new Error('reopen requires --stage and --reason');
  const stage = state.stages.find((candidate) => candidate.id === stageId);
  if (!stage) throw new Error(`Unknown stage: ${stageId}`);
  for (const candidate of state.stages) {
    if (candidate.index < stage.index) continue;
    candidate.status = candidate.index === stage.index ? 'ready' : 'blocked';
    candidate.completedAt = null;
    candidate.evidenceHashes = {};
    candidate.decision = candidate.index === stage.index ? {type: 'reopen', reason: reason.trim(), at: new Date().toISOString()} : null;
  }
  state.activeStage = stage.id;
  state.updatedAt = new Date().toISOString();
  writeJson(statePath, state);
  console.log(JSON.stringify({reopened: stageId, reason: reason.trim()}, null, 2));
} else if (action === 'assert-delivery') {
  const incomplete = state.stages.filter((stage) => stage.status !== 'complete');
  if (incomplete.length) throw new Error(`Delivery blocked: ${incomplete.map((stage) => `${stage.id}:${stage.status}`).join(', ')}`);
  console.log(JSON.stringify({pass: true, completedStages: state.stages.length, profileResolutionStage: job.profileResolutionStage}, null, 2));
} else {
  throw new Error(`Unknown action: ${action}`);
}
