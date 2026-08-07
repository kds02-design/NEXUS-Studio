#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace(/^--/, '');
  if (!key || args[i + 1] == null) throw new Error(`Invalid argument near ${args[i] ?? '<end>'}`);
  opts[key] = args[i + 1];
}

const required = ['season', 'project-dir', 'subcopy', 'date', 'figma-file'];
const missing = required.filter((key) => !opts[key]);
if (missing.length) {
  console.error(`Missing: ${missing.map((x) => `--${x}`).join(', ')}`);
  console.error('Usage: node build-banner-job.mjs --season 5 --project-dir "C:\\path" --subcopy "..." --date "..." --figma-file FILE_KEY [--logo "C:\\logo.png"] [--output job.json]');
  process.exit(2);
}

const root = path.resolve(opts['project-dir']);
const job = {
  schema: 'bns-banner-job/v1',
  season: String(opts.season),
  pageName: opts['page-name'] || `봉마 소울패스 진무 시즌${opts.season}`,
  title: {
    engine: opts.engine || 'sovereign',
    mode: 'two-line-flat-then-render-matrix',
    eyebrow: opts.eyebrow || '봉마 소울패스',
    main: opts.title || `진무 시즌${opts.season}`,
  },
  copy: { subcopy: opts.subcopy, date: opts.date },
  source: { projectDir: root, logo: opts.logo ? path.resolve(opts.logo) : null },
  figma: { fileKey: opts['figma-file'], referencePageNode: '31:16', newPage: true },
  frames: [
    ['1180x750_Notice', 1180, 750, 'full-text'],
    ['1200x628_Facebook', 1200, 628, 'full-text-logo'],
    ['1352x860_PURPLE', 1352, 860, 'image-only-centered'],
    ['620x640_PC_MO', 620, 640, 'image-only-centered'],
    ['600x340_EventON', 600, 340, 'image-only-centered'],
    ['357x230_Toast', 357, 230, 'image-only-transparent-top-70'],
    ['266x280_Ingame', 266, 280, 'transparent-character-only'],
    ['72x40_List', 72, 40, 'image-only-face-crop'],
  ].map(([name, width, height, composition]) => ({ name, width, height, composition })),
  pipeline: ['psd-extract', 'typecore-flat', 'render-matrix-locked', 'background-enhance', 'mask-forge-fx-alpha', 'figma-master-1180', 'duplicate-1200', 'image-only-variants', 'qa'],
};

const output = path.resolve(opts.output || `bns-season-${opts.season}-job.json`);
fs.writeFileSync(output, `${JSON.stringify(job, null, 2)}\n`, 'utf8');
console.log(output);

