import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const projectValue = value('--project');
if (!projectValue) throw new Error('Usage: build-game-banner-job.mjs --project <campaign-dir> --game <id-or-alias> [--title text] [--campaign name] [--output banner-job.json]');

const projectWorkspace = path.resolve(projectValue);
const requestedGame = value('--game') || null;
const output = path.resolve(value('--output') || path.join(projectWorkspace, 'banner-job.json'));
const stateFile = path.join(projectWorkspace, 'banner-workflow-state.json');
if (fs.existsSync(output)) throw new Error(`Refusing to overwrite existing job: ${output}`);
if (fs.existsSync(stateFile)) throw new Error(`Refusing to overwrite existing state: ${stateFile}`);
fs.mkdirSync(projectWorkspace, { recursive: true });

const pipeline = [
  {id: '01-request-analysis', evidence: ['request-analysis.json', 'asset-inventory.json', 'working-assets-manifest.json']},
  {id: '02-layout-selection', evidence: ['layout-selection.json', 'layout-blueprint-lock.json']},
  {id: '03-title-shape', evidence: ['title-shape-lock.json']},
  {id: '04-title-render', evidence: ['title-render-manifest.json']},
  {id: '05-visual-asset-production', evidence: ['visual-asset-production-manifest.json', 'item-presentation-manifest.json']},
  {id: '06-master-assembly', evidence: ['game-profile-lock.json', 'master-assembly-manifest.json', 'master-evaluation.json', 'master-approval.json']},
  {id: '07-variant-assembly', evidence: ['variant-assembly-manifest.json', 'frame-manifest.json', 'delivery-validation.json']}
];

const now = new Date().toISOString();
const job = {
  schema: 'game-banner-job/v1',
  createdAt: now,
  projectWorkspace,
  campaign: {name: value('--campaign'), title: value('--title'), requestedGame},
  visualAuthority: ['form', 'proportion', 'composition', 'image-quality', 'effects'],
  requestedGameRecordedStage: '01-request-analysis',
  profileResolutionStage: '06-master-assembly',
  profileApplicationStages: ['06-master-assembly', '07-variant-assembly'],
  pipeline,
  workflowControl: {
    stateFile,
    requireSequentialCompletion: true,
    invalidateDownstreamOnEvidenceChange: true,
    requireEvidenceHashes: true
  }
};

const state = {
  schema: 'game-banner-workflow-state/v1',
  jobFile: output,
  createdAt: now,
  updatedAt: now,
  activeStage: pipeline[0].id,
  stages: pipeline.map((stage, index) => ({
    ...stage,
    index,
    status: index === 0 ? 'ready' : 'blocked',
    completedAt: null,
    evidenceHashes: {},
    decision: null
  }))
};

fs.writeFileSync(output, `${JSON.stringify(job, null, 2)}\n`, 'utf8');
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({jobFile: output, stateFile, activeStage: state.activeStage, requestedGame}, null, 2));
