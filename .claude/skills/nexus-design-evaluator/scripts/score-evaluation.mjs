#!/usr/bin/env node
// 채점 — NEXUS Studio 의 designEvaluationCore.calculateEvaluationReport 를 그대로 호출한다.
// 가중치·게이트를 여기서 다시 적지 않는다 (앱 점수 = 스킬 점수).
// 사용: node score-evaluation.mjs --input raw.json [--criteria criteria.json] [--type banner] [--strict-live] [--output report.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// NEXUS Studio 루트 찾기 — 1) NEXUS_STUDIO_ROOT 환경변수 2) 스크립트 위치에서 위로 올라가며 src/lib/designEvaluationCore.js 탐색 3) 기본 경로.
function resolveProjectRoot() {
  const probe = (dir) => fs.existsSync(path.join(dir, 'src', 'lib', 'designEvaluationCore.js'));
  const env = process.env.NEXUS_STUDIO_ROOT;
  if (env && probe(env)) return path.resolve(env);
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    if (probe(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const fallback = 'C:/work/00_claude';
  if (probe(fallback)) return fallback;
  throw new Error('NEXUS Studio 루트를 찾지 못했습니다. NEXUS_STUDIO_ROOT 환경변수를 설정하세요.');
}
const projectRoot = resolveProjectRoot();
const lib = (rel) => import(pathToFileURL(path.join(projectRoot, rel)).href);

const { calculateEvaluationReport, criteriaSnapshot, validateCriteria } = await lib('src/lib/designEvaluationCore.js');
const { loadActiveNexusCriteria } = await lib('scripts/lib/nexus-evaluation-criteria.mjs');

const argv = process.argv.slice(2), opt = {};
for (let index = 0; index < argv.length; index += 1) {
  const token = argv[index];
  if (!token.startsWith('--')) continue;
  const key = token.slice(2);
  if (key === 'strict-live') opt[key] = true;
  else opt[key] = argv[++index];
}
if (!opt.input) {
  console.error('Usage: node score-evaluation.mjs --input raw.json [--criteria criteria.json] [--type banner] [--strict-live] [--output report.json]');
  process.exit(2);
}
const raw = JSON.parse(fs.readFileSync(path.resolve(opt.input), 'utf8'));
let criteriaState;
if (opt.criteria) {
  criteriaState = JSON.parse(fs.readFileSync(path.resolve(opt.criteria), 'utf8'));
  criteriaState.source ||= 'provided-snapshot';
  criteriaState.stale = !!criteriaState.stale;
} else {
  criteriaState = await loadActiveNexusCriteria({ type: opt.type || raw.criteriaType || 'banner', projectRoot, strictLive: !!opt['strict-live'] });
}
const validation = validateCriteria(criteriaState.criteria || []);
if (!validation.valid) throw new Error('Invalid or empty criteria snapshot');
const criteria = criteriaSnapshot(validation.normalized);
for (const criterion of criteria) {
  const entry = raw.scores?.[criterion.id];
  const score = Number(entry?.score ?? entry);
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`Invalid score: ${criterion.id}`);
}
if (raw.criteriaVersionId && criteriaState.criteriaVersionId && raw.criteriaVersionId !== criteriaState.criteriaVersionId) {
  throw new Error(`Criteria version mismatch: raw=${raw.criteriaVersionId}, scoring=${criteriaState.criteriaVersionId}`);
}
const hardFailures = Array.isArray(raw.hardFailures) ? raw.hardFailures.filter(Boolean) : [];
const coreReport = calculateEvaluationReport({ criteria, scores: raw.scores, hardFailures, recommendedCorrections: raw.recommendedCorrections, gate: criteriaState.gate });
const report = {
  frame: raw.frame || '',
  profile: raw.profile || criteriaState.profile || '',
  criteriaType: criteriaState.criteriaType,
  criteriaVersionId: criteriaState.criteriaVersionId,
  criteriaVersionName: criteriaState.criteriaVersionName,
  criteriaSource: criteriaState.source,
  criteriaSyncedAt: criteriaState.syncedAt || null,
  criteriaStale: !!criteriaState.stale,
  criteriaSyncWarning: criteriaState.syncWarning || '',
  criteria,
  ...coreReport,
};
const out = `${JSON.stringify(report, null, 2)}\n`;
if (opt.output) fs.writeFileSync(path.resolve(opt.output), out, 'utf8');
else process.stdout.write(out);
if (!report.pass) process.exitCode = 1;
