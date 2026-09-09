#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateEvaluationReport,
  criteriaSnapshot,
  validateCriteria,
} from '../../../../src/lib/designEvaluationCore.js';
import { loadActiveNexusCriteria } from '../../../../scripts/lib/nexus-evaluation-criteria.mjs';

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

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../../../..');
const raw = JSON.parse(fs.readFileSync(path.resolve(opt.input), 'utf8'));
let criteriaState;
if (opt.criteria) {
  criteriaState = JSON.parse(fs.readFileSync(path.resolve(opt.criteria), 'utf8'));
  criteriaState.source ||= 'provided-snapshot';
  criteriaState.stale = !!criteriaState.stale;
} else {
  criteriaState = await loadActiveNexusCriteria({
    type: opt.type || raw.criteriaType || 'banner',
    projectRoot,
    strictLive: !!opt['strict-live'],
  });
}
const validation = validateCriteria(criteriaState.criteria || []);
if (!validation.valid) throw new Error('Invalid or empty criteria snapshot');
const criteria = criteriaSnapshot(validation.normalized);
for (const criterion of criteria) {
  const entry = raw.scores?.[criterion.id];
  const score = Number(entry?.score ?? entry);
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`Invalid score: ${criterion.id}`);
}
if (raw.criteriaVersionId && raw.criteriaVersionId !== criteriaState.criteriaVersionId) {
  throw new Error(`Criteria version mismatch: raw=${raw.criteriaVersionId}, scoring=${criteriaState.criteriaVersionId}`);
}
const hardFailures = Array.isArray(raw.hardFailures) ? raw.hardFailures.filter(Boolean) : [];
const coreReport = calculateEvaluationReport({
  criteria,
  scores: raw.scores,
  hardFailures,
  recommendedCorrections: raw.recommendedCorrections,
  gate: criteriaState.gate,
});
const report = {
  frame: raw.frame || '',
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
