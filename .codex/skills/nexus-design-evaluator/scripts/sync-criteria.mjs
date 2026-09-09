#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatNexusCriteriaMarkdown,
  loadActiveNexusCriteria,
} from "../../../../scripts/lib/nexus-evaluation-criteria.mjs";

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 1) {
  const token = args[index];
  if (!token.startsWith("--")) continue;
  const key = token.slice(2);
  if (key === "strict-live") options[key] = true;
  else options[key] = args[++index];
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../../../..");
const snapshot = await loadActiveNexusCriteria({
  type: options.type || "banner",
  projectRoot,
  strictLive: !!options["strict-live"],
});
const payload = {
  ...snapshot,
  promptMarkdown: formatNexusCriteriaMarkdown(snapshot),
};
const output = `${JSON.stringify(payload, null, 2)}\n`;
if (options.output) {
  const outputPath = path.resolve(options.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, "utf8");
  process.stderr.write(`Nexus 기준 동기화: ${snapshot.criteriaType}/${snapshot.criteriaVersionId} (${snapshot.source})\n`);
  if (snapshot.syncWarning) process.stderr.write(`경고: ${snapshot.syncWarning}\n`);
} else {
  process.stdout.write(output);
}
