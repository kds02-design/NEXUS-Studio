#!/usr/bin/env node
// 활성 평가 기준 동기화 — NEXUS Studio 의 scripts/lib/nexus-evaluation-criteria.mjs 를 그대로 사용.
// (Claude 변환본: 리포 밖 ~/.claude/skills 에서도 동작하도록 루트를 동적으로 찾는다.)
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

const { formatNexusCriteriaMarkdown, loadActiveNexusCriteria } = await lib('scripts/lib/nexus-evaluation-criteria.mjs');

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 1) {
  const token = args[index];
  if (!token.startsWith('--')) continue;
  const key = token.slice(2);
  if (key === 'strict-live') options[key] = true;
  else options[key] = args[++index];
}
const snapshot = await loadActiveNexusCriteria({ type: options.type || 'banner', projectRoot, strictLive: !!options['strict-live'] });
const payload = { ...snapshot, promptMarkdown: formatNexusCriteriaMarkdown(snapshot) };
const output = `${JSON.stringify(payload, null, 2)}\n`;
if (options.output) {
  const outputPath = path.resolve(options.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, 'utf8');
  process.stderr.write(`Nexus 기준 동기화: ${snapshot.criteriaType}/${snapshot.criteriaVersionId} (${snapshot.source})\n`);
  if (snapshot.syncWarning) process.stderr.write(`경고: ${snapshot.syncWarning}\n`);
} else {
  process.stdout.write(output);
}
