#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!opt.input) {
  console.error('Usage: node evaluation-gate.mjs --input evaluation.json [--output correction-plan.json]');
  process.exit(2);
}

const KEYS = ['impression','concept','layout','typography','color','readability','brand','flow','detail','conversion'];
const data = JSON.parse(fs.readFileSync(path.resolve(opt.input), 'utf8'));
const frames = Array.isArray(data) ? data : data.frames;
if (!Array.isArray(frames) || !frames.length) throw new Error('Input must contain a non-empty frames array');

const scale100 = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return v <= 10 ? v * 10 : v;
};
const toolScore = (tool, key) => scale100(tool?.scores?.[key]?.score ?? tool?.scores?.[key]);

const results = frames.map((frame) => {
  const de = frame.designEvaluator || {};
  const bc = frame.bannerCodex || {};
  const deOverall = scale100(de.overall);
  const bcOverall = scale100(bc.overall);
  const toolOveralls = [deOverall, bcOverall].filter(Number.isFinite);
  if (toolOveralls.length < 2) throw new Error(`${frame.frame || frame.name}: both evaluator results are required`);
  const combined = toolOveralls.reduce((a, b) => a + b, 0) / toolOveralls.length;
  const metrics = KEYS.map((key) => {
    const values = [toolScore(de, key), toolScore(bc, key)].filter(Number.isFinite);
    const score = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const reasons = [de.reasons?.[key] ?? de.scores?.[key]?.reason, bc.reasons?.[key] ?? bc.scores?.[key]?.reason].filter(Boolean);
    return { key, score: score == null ? null : Math.round(score * 10) / 10, reasons };
  });
  const hardFailures = Array.isArray(frame.hardFailures) ? frame.hardFailures.filter(Boolean) : [];
  const lowMetrics = metrics.filter((m) => m.score != null && m.score < 75).sort((a, b) => a.score - b.score);
  const pass = combined >= 85 && deOverall >= 82 && bcOverall >= 82 && !lowMetrics.length && !hardFailures.length;
  return {
    frame: frame.frame || frame.name,
    pass,
    combined: Math.round(combined * 10) / 10,
    toolScores: { designEvaluator: deOverall, bannerCodex: bcOverall },
    hardFailures,
    corrections: lowMetrics.slice(0, 3),
    metrics,
  };
});

const report = { pass: results.every((r) => r.pass), generatedAt: new Date().toISOString(), frames: results };
const json = `${JSON.stringify(report, null, 2)}\n`;
if (opt.output) fs.writeFileSync(path.resolve(opt.output), json, 'utf8');
else process.stdout.write(json);
if (!report.pass) process.exitCode = 1;

