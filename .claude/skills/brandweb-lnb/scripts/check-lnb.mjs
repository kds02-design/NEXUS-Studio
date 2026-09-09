#!/usr/bin/env node
// use_figma 실행 결과(JSON 배열)를 lnb-spec.json 과 대조: 블록 중심 = anchor ±tol, 엠블럼 y 일치.
// 사용: node scripts/check-lnb.mjs --spec lnb-out/lnb-spec.json --result result.json [--tol 2]
import fs from 'node:fs';
const a = process.argv.slice(2); const get = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
const spec = JSON.parse(fs.readFileSync(get('--spec'), 'utf8'));
const res = JSON.parse(fs.readFileSync(get('--result'), 'utf8'));
const tol = Number(get('--tol') || 2);
let fail = 0;
for (const r of res) {
  const p = spec.pages.find(x => x.frame === r.frame);
  if (r.error || !p) { console.log(`FAIL ${r.frame}: ${r.error || 'no spec page'}`); fail++; continue; }
  const dc = Math.abs(r.measured.center - spec.style.structure.blockAnchorY);
  const de = p.layout.emblem && r.emblemY != null ? Math.abs(r.emblemY - p.layout.emblem.y) : 0;
  const ok = dc <= tol && de <= tol;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${r.frame}  center ${r.measured.center} (Δ${dc.toFixed(1)})  emblem Δ${de}`);
}
console.log(fail ? `${fail} page(s) failed` : 'all pages within tolerance');
process.exit(fail ? 1 : 0);
