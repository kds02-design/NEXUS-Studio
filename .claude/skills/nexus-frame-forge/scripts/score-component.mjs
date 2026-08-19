#!/usr/bin/env node
// 버튼/프레임 등 UI 부품 전용 채점기 — nexus-design-evaluator/score-evaluation.mjs 산식 계승.
// 배너 rubric 과 달리 '투명 UI 부품'에 맞는 지표·가중치를 쓰고, 합격선은 80점.
// 라벨이 없는 프레임/아이콘은 raw.scores 에서 labelText 를 생략하면 자동으로 가중치에서 빠진다
// (존재하는 지표끼리만 재정규화).
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!opt.input) { console.error('Usage: node score-component.mjs --input raw.json [--output report.json] [--pass 80]'); process.exit(2); }

// 전체 가중치 합 100. raw 에 없는 지표는 건너뛰고 남은 지표끼리 재정규화한다.
const WEIGHTS = {
  silhouette: 18,   // 요청한 용도·형태(실루엣) 정확도
  styleMatch: 16,   // 분위기·프리셋·표현 방식 부합
  material: 12,     // 재질·마감 완성도
  edgeAlpha: 20,    // 에지·알파 클린니스 (투명 부품의 핵심)
  labelText: 12,    // 라벨 텍스트 정확·가독 (텍스트 버튼일 때만)
  colorHarmony: 10, // 색 조화·대비
  usability: 12,    // 실사용 적합성 (여백/스케일/상태 일관성)
};
const PASS = Number(opt.pass ?? 80);
const METRIC_FLOOR = Number(opt.floor ?? 70); // 개별 지표 최저선

const raw = JSON.parse(fs.readFileSync(path.resolve(opt.input), 'utf8'));
let weighted = 0, total = 0;
const metrics = Object.entries(WEIGHTS)
  .filter(([key]) => raw.scores?.[key] != null)
  .map(([key, weight]) => {
    const entry = raw.scores[key];
    const score = Number(entry?.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`Invalid score: ${key}`);
    weighted += score * weight; total += weight;
    return { key, weight, score, reason: String(entry.reason || '') };
  });
if (!total) throw new Error('No valid metrics in raw.scores');

const overall = Math.round((weighted / total) * 10) / 10;
const hardFailures = Array.isArray(raw.hardFailures) ? raw.hardFailures.filter(Boolean) : [];
const lows = metrics.filter((x) => x.score < METRIC_FLOOR).sort((a, b) => a.score - b.score);
const priorities = [...metrics].sort((a, b) => a.score - b.score).slice(0, 3);

const report = {
  asset: raw.asset || '',
  overall,
  pass: overall >= PASS && !lows.length && !hardFailures.length,
  passThreshold: PASS,
  metricFloor: METRIC_FLOOR,
  hardFailures,
  metrics,
  priorities,
  recommendedCorrections: (raw.recommendedCorrections || []).slice(0, 3),
};
const out = JSON.stringify(report, null, 2) + '\n';
if (opt.output) fs.writeFileSync(path.resolve(opt.output), out, 'utf8'); else process.stdout.write(out);
if (!report.pass) process.exitCode = 1;
