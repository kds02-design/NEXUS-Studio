#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// Nexus banner rubric — the DesignEvaluator banner mode uses the SAME criteria and weights
// as Banner Codex (src/lib/evaluationCriteria.js `promo` defaults). One rubric, one source.
const WEIGHTS = {
  impression: 14, concept: 9, layout: 8, typography: 18, color: 8,
  readability: 9, brand: 8, flow: 8, detail: 14, conversion: 4,
};
const KEYS = Object.keys(WEIGHTS);

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!opt.input) {
  console.error('Usage: node evaluation-gate.mjs --input evaluation.json [--output correction-plan.json]');
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(path.resolve(opt.input), 'utf8'));
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
  const lowMetrics = metrics.filter((m) => m.score < 75).sort((a, b) => a.score - b.score);
  const pass = weightedOverall >= 85 && !lowMetrics.length && !hardFailures.length;

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

const report = { pass: results.every((r) => r.pass), rubric: 'nexus-banner (== banner-codex promo)', frames: results };
const json = `${JSON.stringify(report, null, 2)}\n`;
if (opt.output) fs.writeFileSync(path.resolve(opt.output), json, 'utf8');
else process.stdout.write(json);
if (!report.pass) process.exitCode = 1;
