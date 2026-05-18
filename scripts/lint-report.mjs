// One-off helper: inspect lint JSON, print unused-vars details for a file.
// Usage: node scripts/lint-report.mjs "<filename suffix>"
import { readFileSync } from 'node:fs';

const filter = process.argv[2] || '';
const tmp = process.env.TEMP;
const data = JSON.parse(readFileSync(`${tmp}/lint2.json`, 'utf8'));

for (const f of data) {
  const norm = f.filePath.split(/[\\/]/).join('/');
  if (!norm.endsWith(filter)) continue;
  console.log(norm);
  for (const m of f.messages) {
    console.log(`  L${m.line}:${m.column}  ${m.ruleId || '(parse)'}  ${m.message}`);
  }
}
