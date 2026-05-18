// Print mechanical (no-unused-vars + no-empty + no-useless-assignment + preserve-caught-error + no-ex-assign) errors per file,
// excluding files with top-level /* eslint-disable */.
// Usage: node scripts/lint-per-file.mjs [path-suffix-filter]
import { readFileSync } from 'node:fs';

const filter = process.argv[2] || '';
const tmp = process.env.TEMP;
const data = JSON.parse(readFileSync(`${tmp}/lint3.json`, 'utf8'));
const MECH = new Set(['no-unused-vars', 'no-empty', 'no-useless-assignment', 'preserve-caught-error', 'no-ex-assign']);

const grouped = [];
for (const f of data) {
  const norm = f.filePath.split(/[\\/]/).join('/');
  if (filter && !norm.includes(filter)) continue;
  const mech = f.messages.filter((m) => MECH.has(m.ruleId));
  if (mech.length === 0) continue;
  grouped.push({ path: norm, messages: mech });
}
grouped.sort((a, b) => b.messages.length - a.messages.length);

for (const g of grouped) {
  console.log(`\n=== ${g.path} (${g.messages.length}) ===`);
  for (const m of g.messages) {
    console.log(`  L${m.line}:${m.column}  ${m.ruleId}  ${m.message.replace(/\n.*/s, '').slice(0, 120)}`);
  }
}
console.log(`\nTotal files: ${grouped.length}`);
console.log(`Total errors: ${grouped.reduce((a, g) => a + g.messages.length, 0)}`);
