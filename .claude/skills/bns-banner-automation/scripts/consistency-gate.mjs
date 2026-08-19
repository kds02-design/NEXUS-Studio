#!/usr/bin/env node
// Consistency gate — the counterpart to evaluation-gate.mjs.
// evaluation-gate enforces the quality FLOOR (>=85). This enforces SAMENESS:
// the produced banner must match the locked recipe (structure, presets, seed),
// so every run applies title/FX effects by the identical rule. Catches upward drift.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!opt.recipe || !opt.manifest) {
  console.error('Usage: node consistency-gate.mjs --recipe recipes/bns-live-event.v1.json --manifest produced.json [--output drift.json]');
  console.error('  manifest = what the pipeline actually built: { title:{seed,preset,...}, layers:[...], anchors:{...}, fonts:{...}, characterFx:{...}, background:{...} }');
  process.exit(2);
}

const recipe = JSON.parse(fs.readFileSync(path.resolve(opt.recipe), 'utf8'));
const built = JSON.parse(fs.readFileSync(path.resolve(opt.manifest), 'utf8'));
const cfg = recipe.gate?.consistency || {};
const drift = [];
const add = (severity, where, expected, actual) => drift.push({ severity, where, expected, actual });

// 1. Layer order / names
if (cfg.checkLayerOrder && Array.isArray(recipe.structure?.layerOrder)) {
  const want = recipe.structure.layerOrder;
  const got = Array.isArray(built.layers) ? built.layers : [];
  // logo layer (07_로고) is only required on the 1200 frame; treat its absence as soft.
  want.forEach((name, i) => {
    if (got[i] !== name) {
      const soft = name === '07_로고';
      add(soft ? 'warn' : 'fail', `layers[${i}]`, name, got[i] ?? '<missing>');
    }
  });
}

// 2. Anchors within tolerance
if (cfg.checkAnchors && recipe.structure?.anchors) {
  const tol = recipe.structure.anchorTolerancePx ?? 0;
  for (const [k, want] of Object.entries(recipe.structure.anchors)) {
    const got = built.anchors?.[k];
    if (!Array.isArray(got)) { add('fail', `anchors.${k}`, want, '<missing>'); continue; }
    const off = want.map((v, i) => Math.abs(v - (got[i] ?? Infinity)));
    if (off.some((d) => d > tol)) add('fail', `anchors.${k} (tol ${tol}px)`, want, got);
  }
}

// 3. Fonts
if (cfg.checkFonts && recipe.structure?.fonts) {
  for (const [k, want] of Object.entries(recipe.structure.fonts)) {
    const got = built.fonts?.[k];
    if (got !== want) add('fail', `fonts.${k}`, want, got ?? '<missing>');
  }
}

// 4. Presets (title + characterFx) must match by id
if (cfg.checkPresets) {
  const pairs = [
    ['title.preset', recipe.titleEffect?.preset, built.title?.preset],
    ['characterFx.preset', recipe.characterFx?.preset, built.characterFx?.preset],
  ];
  for (const [where, want, got] of pairs) {
    if (want && got !== want) add('fail', where, want, got ?? '<missing>');
  }
  // Mask Forge curve must be the exact locked values
  const mf = recipe.characterFx?.maskForge || {};
  for (const [k, want] of Object.entries(mf)) {
    const got = built.characterFx?.maskForge?.[k];
    if (got !== want) add('fail', `characterFx.maskForge.${k}`, want, got ?? '<missing>');
  }
}

// 5. Seeds (title + background) — fixed seed keeps the generative step reproducible
if (cfg.checkSeed) {
  const seeds = [
    ['title.seed', recipe.titleEffect?.seed, built.title?.seed],
    ['background.seed', recipe.background?.seed, built.background?.seed],
  ];
  for (const [where, want, got] of seeds) {
    if (want != null && got !== want) add('fail', where, want, got ?? '<missing>');
  }
}

const fails = drift.filter((d) => d.severity === 'fail');
const warns = drift.filter((d) => d.severity === 'warn');
const report = {
  pass: fails.length === 0,
  recipe: recipe.recipe,
  failCount: fails.length,
  warnCount: warns.length,
  drift,
};
const json = `${JSON.stringify(report, null, 2)}\n`;
if (opt.output) fs.writeFileSync(path.resolve(opt.output), json, 'utf8');
else process.stdout.write(json);
if (!report.pass) process.exitCode = 1;
