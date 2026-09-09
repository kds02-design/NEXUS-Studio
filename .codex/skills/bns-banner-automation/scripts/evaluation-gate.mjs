#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEXUS_QUALITY_GATE, criteriaSnapshot, validateCriteria } from '../../../../src/lib/designEvaluationCore.js';
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
  console.error('Usage: node evaluation-gate.mjs --input evaluation.json [--criteria criteria.json] [--strict-live] [--output correction-plan.json]');
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(path.resolve(opt.input), 'utf8'));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../../../..');
let criteriaState;
if (opt.criteria) {
  criteriaState = JSON.parse(fs.readFileSync(path.resolve(opt.criteria), 'utf8'));
  criteriaState.source ||= 'provided-snapshot';
} else {
  criteriaState = await loadActiveNexusCriteria({ type: 'banner', projectRoot, strictLive: !!opt['strict-live'] });
}
const validation = validateCriteria(criteriaState.criteria || []);
if (!validation.valid) throw new Error('Invalid or empty Nexus criteria snapshot');
const criteria = criteriaSnapshot(validation.normalized);
const KEYS = criteria.map((item) => item.id);
const WEIGHTS = Object.fromEntries(criteria.map((item) => [item.id, item.weight]));
const frames = Array.isArray(data) ? data : data.frames;
if (!Array.isArray(frames) || !frames.length) throw new Error('Input must contain a non-empty frames array');

const scale100 = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return v <= 10 ? v * 10 : v; // accept 0-10 or 0-100 inputs
};
const readScore = (set, key) => scale100(set?.[key]?.score ?? set?.[key]);
// If several model results are supplied (e.g. Gemini + ChatGPT), average per metric —
// this mirrors Banner Codex dual-AI merge. It is NOT two different rubrics.
const mergeSets = (sets, key) => {
  const vals = sets.map((s) => readScore(s, key)).filter(Number.isFinite);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

const results = frames.map((frame) => {
  // Accept frame.scores (a single merged set) and/or frame.models { gemini, openai, ... }.
  const modelSets = frame.models ? Object.values(frame.models).map((m) => m?.scores || m) : [];
  const sets = [frame.scores, ...modelSets].filter(Boolean);
  if (!sets.length) throw new Error(`${frame.frame || frame.name}: a "scores" object (or "models") is required`);

  const metrics = KEYS.map((key) => {
    const score = mergeSets(sets, key);
    const reasons = sets.map((s) => s?.[key]?.reason).filter(Boolean);
    return { key, weight: WEIGHTS[key], score: score == null ? null : Math.round(score * 10) / 10, reasons };
  });

  const missing = metrics.filter((m) => m.score == null).map((m) => m.key);
  if (missing.length) throw new Error(`${frame.frame || frame.name}: missing metric scores: ${missing.join(', ')}`);

  const totalWeight = metrics.reduce((a, m) => a + m.weight, 0);
  const weightedOverall = Math.round((metrics.reduce((a, m) => a + m.score * m.weight, 0) / totalWeight) * 10) / 10;

  const hardFailures = Array.isArray(frame.hardFailures) ? frame.hardFailures.filter(Boolean) : [];
  const gate = criteriaState.gate || NEXUS_QUALITY_GATE;
  const lowMetrics = metrics.filter((m) => m.score < gate.everyMetric).sort((a, b) => a.score - b.score);
  const pass = weightedOverall >= gate.overall
    && !metrics.some((m) => m.score < gate.everyMetric)
    && hardFailures.length <= gate.hardFailures;

  return {
    frame: frame.frame || frame.name,
    pass,
    weightedOverall,
    modelsAveraged: sets.length,
    hardFailures,
    corrections: lowMetrics.slice(0, 3).map(({ key, score, reasons }) => ({ key, score, reasons })),
    metrics,
  };
});

const report = {
  pass: results.every((result) => result.pass),
  rubric: 'nexus-banner (active Nexus criteria)',
  criteriaType: criteriaState.criteriaType,
  criteriaVersionId: criteriaState.criteriaVersionId,
  criteriaVersionName: criteriaState.criteriaVersionName,
  criteriaSource: criteriaState.source,
  criteriaStale: !!criteriaState.stale,
  criteriaSyncWarning: criteriaState.syncWarning || '',
  criteria,
  frames: results,
};
const json = `${JSON.stringify(report, null, 2)}\n`;
if (opt.output) fs.writeFileSync(path.resolve(opt.output), json, 'utf8');
else process.stdout.write(json);
if (!report.pass) process.exitCode = 1;
