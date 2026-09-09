#!/usr/bin/env node
// NEXUS 로컬 배치 CLI — MCP 왕복 없이 폴더 단위로 투명화를 돌린다.
// 픽셀 로직은 MCP(nexus_remove_background / nexus_extract_effect)·앱(MaskForge)과 같은 src/lib 모듈을
// 그대로 import 하므로(esbuild 번들) 결과가 픽셀 단위로 같다. Python/numpy 재구현은 쓰지 않는다.
//
// 실행: node mcp/nexus-cli.bundle.mjs <command> [옵션]   (빌드: npm run mcp:build)
//
//   plan  --in <dir|파일...> --out <plan.json> [--out-dir <dir>] [--no-triage] [--mode key|effect] [키/이펙트 옵션]
//         입력을 훑어 편집 가능한 plan.json 을 만든다. 기본으로 자동 분류(src/lib/alphaTriage) 가 항목마다
//         flat/vignette/glow/nonflat 을 판정해 mode·tolerance·killFaint 를 채운다(--no-triage 면 통계만).
//         nonflat(사진 배경) 은 mode "ai" 로 표시되며 alpha 가 건너뛴다(Remove AI 대상). 고친 뒤 alpha 로 실행.
//   alpha --plan <plan.json> [--jobs N] [--sheet <png>] [--report <json>]
//   alpha --in <dir|파일...> --out-dir <dir> --mode key|effect [옵션] [--jobs N] [--sheet <png>]
//         plan 없이 폴더 전체를 한 모드로 처리.
//
// 항목 옵션(plan 항목 또는 --옵션): mode, bg, tolerance, feather, holeProtect, holeSize, decontam,
//   cutoff, gamma, opacity, recoverColor, trim, cleanIslands, killFaint(임계 알파, 0=끔)
// 출력: 항목별 PNG + report.json(QA 카운트·bg·경고) + (옵션) 체커보드 컨택트 시트.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";

import { KEY_DEFAULTS, extractColorKeyPixels, detectBg, alphaTrimBox, cropPixels, toRgb } from "../src/lib/colorKeyExtract.js";
import { EFFECT_DEFAULTS, extractEffectPixels } from "../src/lib/effectExtract.js";
import { cleanIslands, killFaintIslands, alphaStats, borderStats } from "../src/lib/alphaCleanup.js";
import { triageImage } from "../src/lib/alphaTriage.js";

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const ITEM_DEFAULTS = {
  mode: "key", bg: "auto", trim: false,
  ...KEY_DEFAULTS, ...EFFECT_DEFAULTS,
  cleanIslands: true, killFaint: 0,
};

// ─── 이미지 IO (@napi-rs/canvas 지연 로드 — MCP 서버와 동일) ───────────────────
let _canvas = null;
const canvasMod = async () => (_canvas ||= await import("@napi-rs/canvas"));
async function loadPixels(file) {
  const { createCanvas, loadImage } = await canvasMod();
  const img = await loadImage(file);
  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, img.width, img.height);
  return { data: id.data, width: id.width, height: id.height };
}
async function savePixels(px, file) {
  const { createCanvas } = await canvasMod();
  const cv = createCanvas(px.width, px.height);
  const ctx = cv.getContext("2d");
  const id = ctx.createImageData(px.width, px.height);
  id.data.set(px.data);
  ctx.putImageData(id, 0, 0);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, cv.toBuffer("image/png"));
}

function resolveBg(bg, px) {
  if (bg == null || bg === "auto") return detectBg(px.data, px.width, px.height);
  if (bg === "black") return [0, 0, 0];
  if (bg === "white") return [255, 255, 255];
  if (bg === "chroma") return [0, 255, 0];
  const rgb = toRgb(bg);
  if (!rgb) throw new Error(`배경색을 해석할 수 없습니다: ${bg}`);
  return rgb;
}

// ─── 항목 1건 처리 (워커에서 실행) ─────────────────────────────────────────────
export async function processItem(item) {
  const o = { ...ITEM_DEFAULTS, ...item };
  if (o.mode === "ai") {
    return { src: o.src, out: null, mode: "ai", skipped: true, qa: null, warnings: ["nonflat 배경 — 색상 키 대상 아님. nexus_remove_ai(승인 필요) 또는 수동 분리"] };
  }
  const src = await loadPixels(o.src);
  const bg = resolveBg(o.bg, src);
  const warnings = [];
  let px, qa;
  if (o.mode === "effect") {
    px = extractEffectPixels(src, { cutoff: o.cutoff, gamma: o.gamma, opacity: o.opacity, recoverColor: o.recoverColor, bg });
    qa = px.qa;
    if (qa.reconstructionMae > 0.02) warnings.push(`역산 오차 MAE ${qa.reconstructionMae.toFixed(4)} — 매트가 균일하지 않을 수 있음`);
  } else if (o.mode === "key") {
    px = extractColorKeyPixels(src, { bg, tolerance: o.tolerance, feather: o.feather, holeProtect: o.holeProtect, holeSize: o.holeSize, decontam: o.decontam });
    qa = px.qa;
  } else {
    throw new Error(`알 수 없는 mode: ${o.mode} (key | effect)`);
  }
  const removed = {};
  if (o.cleanIslands) removed.islands = cleanIslands(px);
  if (o.killFaint > 0) removed.faint = killFaintIslands(px, { faintAlpha: o.killFaint });
  if (removed.islands || removed.faint) qa = { ...qa, ...alphaStats(px) };
  if (qa.transparentPixels === 0) warnings.push("완전 투명 픽셀 없음 — bg 또는 tolerance/cutoff 확인");
  if (qa.opaquePixels + qa.partialPixels === 0) warnings.push("남은 피사체 없음");
  const box = o.trim ? alphaTrimBox(px.data, px.width, px.height) : null;
  const result = box ? cropPixels(px, box) : px;
  await savePixels(result, o.out);
  const stats = borderStats(src.data, src.width, src.height);
  return {
    src: o.src, out: o.out, mode: o.mode,
    params: o.mode === "effect"
      ? { cutoff: o.cutoff, gamma: o.gamma, opacity: o.opacity, recoverColor: o.recoverColor }
      : { tolerance: o.tolerance, feather: o.feather, holeProtect: o.holeProtect, holeSize: o.holeSize, decontam: o.decontam },
    bg: { r: bg[0], g: bg[1], b: bg[2] }, bgStd: Math.round(stats.std * 10) / 10,
    cleanup: { cleanIslands: !!o.cleanIslands, killFaint: o.killFaint, removed },
    size: { width: result.width, height: result.height }, cropBox: box || null,
    qa, warnings,
  };
}

// ─── 워커 진입점 ────────────────────────────────────────────────────────────────
if (!isMainThread && workerData && workerData.role === "alpha-worker") {
  parentPort.on("message", async (item) => {
    try { parentPort.postMessage({ ok: true, result: await processItem(item) }); }
    catch (e) { parentPort.postMessage({ ok: false, src: item.src, error: e.message }); }
  });
}

// ─── 워커 풀 ────────────────────────────────────────────────────────────────────
async function runPool(items, jobs, onDone) {
  const self = fileURLToPath(import.meta.url);
  const n = Math.max(1, Math.min(jobs, items.length));
  const results = new Array(items.length);
  const workers = [];
  let next = 0, finished = 0;
  try {
    await new Promise((resolve, reject) => {
      const spawn = () => {
        const w = new Worker(self, { workerData: { role: "alpha-worker" } });
        workers.push(w);
        let cur = -1;
        const feed = () => {
          if (next >= items.length) return; // 남은 일 없음 — 풀 종료 시 일괄 terminate
          cur = next++; w.postMessage(items[cur]);
        };
        w.on("message", (m) => {
          results[cur] = m.ok ? m.result : { src: m.src, error: m.error };
          onDone(cur, results[cur]);
          if (++finished === items.length) resolve();
          else feed();
        });
        w.on("error", reject);
        feed();
      };
      for (let i = 0; i < n; i++) spawn();
    });
  } finally {
    // 마지막 항목을 끝낸 워커가 살아 있으면 프로세스가 종료되지 않는다 — 전부 정리.
    await Promise.all(workers.map((w) => w.terminate()));
  }
  return results;
}

// ─── 컨택트 시트 (체커보드 위 합성) ────────────────────────────────────────────
async function contactSheet(results, file, { cell = 256, cols = 6 } = {}) {
  const { createCanvas, loadImage } = await canvasMod();
  const ok = results.filter((r) => r && !r.error && r.out);
  const rows = Math.ceil(ok.length / cols) || 1;
  const label = 20;
  const cv = createCanvas(cols * cell, rows * (cell + label));
  const ctx = cv.getContext("2d");
  const sq = 16;
  for (let y = 0; y < cv.height; y += sq) for (let x = 0; x < cv.width; x += sq) {
    ctx.fillStyle = ((x / sq + y / sq) % 2) ? "#b4b4b4" : "#787878"; ctx.fillRect(x, y, sq, sq);
  }
  ctx.font = "12px sans-serif"; ctx.textBaseline = "top";
  for (let i = 0; i < ok.length; i++) {
    const r = ok[i];
    const img = await loadImage(r.out);
    const s = Math.min(cell / img.width, cell / img.height);
    const w = img.width * s, h = img.height * s;
    const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + label);
    ctx.drawImage(img, x + (cell - w) / 2, y + (cell - h) / 2, w, h);
    ctx.fillStyle = "#000"; ctx.fillRect(x, y + cell, cell, label);
    ctx.fillStyle = r.warnings.length ? "#ffd166" : "#fff";
    ctx.fillText(path.basename(r.out, ".png").slice(0, 34), x + 4, y + cell + 4);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, cv.toBuffer("image/png"));
}

// ─── 인자 파싱 ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opt = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) { opt._.push(t); continue; }
    const k = t.slice(2);
    const v = argv[i + 1];
    if (v == null || v.startsWith("--")) { opt[k] = true; continue; }
    opt[k] = v; i++;
  }
  return opt;
}
const num = (v, d) => (v == null ? d : Number(v));
const bool = (v, d) => (v == null ? d : v === true || v === "true" || v === "1");

function listInputs(inputs) {
  const files = [];
  for (const p of inputs) {
    const abs = path.resolve(p);
    if (fs.statSync(abs).isDirectory()) {
      for (const f of fs.readdirSync(abs).sort()) if (IMAGE_EXT.test(f)) files.push(path.join(abs, f));
    } else if (IMAGE_EXT.test(abs)) files.push(abs);
  }
  return files;
}

function itemOptionsFromArgs(opt) {
  const o = {};
  if (opt.mode) o.mode = opt.mode;
  if (opt.bg) o.bg = opt.bg;
  for (const k of ["tolerance", "feather", "holeSize", "cutoff", "gamma", "opacity", "killFaint"]) if (opt[k] != null) o[k] = Number(opt[k]);
  for (const k of ["holeProtect", "decontam", "trim", "recoverColor", "cleanIslands"]) if (opt[k] != null) o[k] = bool(opt[k], true);
  return o;
}

async function buildItems(opt) {
  if (opt.plan) {
    const plan = JSON.parse(fs.readFileSync(path.resolve(opt.plan), "utf8"));
    const base = path.dirname(path.resolve(opt.plan));
    const defaults = plan.defaults || {};
    const outDir = plan.outDir ? path.resolve(base, plan.outDir) : base;
    return plan.items.map((it) => ({
      ...defaults, ...it,
      src: path.resolve(base, it.src),
      out: it.out ? path.resolve(base, it.out) : path.join(outDir, path.basename(it.src).replace(IMAGE_EXT, "") + ".png"),
    }));
  }
  const inputs = opt.in ? [opt.in, ...opt._.slice(1)] : opt._.slice(1);
  if (!inputs.length) throw new Error("--plan 또는 --in 이 필요합니다.");
  const outDir = path.resolve(opt["out-dir"] || "out");
  const common = itemOptionsFromArgs(opt);
  return listInputs(inputs).map((src) => ({ ...common, src, out: path.join(outDir, path.basename(src).replace(IMAGE_EXT, "") + ".png") }));
}

async function cmdPlan(opt) {
  const inputs = opt.in ? [opt.in, ...opt._.slice(1)] : opt._.slice(1);
  if (!inputs.length || !opt.out) throw new Error("사용: plan --in <dir> --out <plan.json> [--out-dir <dir>] [--no-triage] [--mode key|effect]");
  const planPath = path.resolve(opt.out);
  const base = path.dirname(planPath);
  const files = listInputs(inputs);
  const useTriage = !opt["no-triage"];
  const items = [];
  const counts = {};
  for (const f of files) {
    const px = await loadPixels(f);
    const item = { src: path.relative(base, f).split(path.sep).join("/"), size: [px.width, px.height] };
    if (useTriage) {
      const t = triageImage(px);
      Object.assign(item, { mode: t.mode, ...t.params, triage: { class: t.class, ...t.stats, reason: t.reason } });
      counts[t.class] = (counts[t.class] || 0) + 1;
      process.stderr.write(`scan ${path.basename(f)} ${px.width}x${px.height} → ${t.class} (${t.reason})
`);
    } else {
      const st = borderStats(px.data, px.width, px.height);
      item.bgStats = { mean: st.mean, std: Math.round(st.std * 10) / 10, maxDist: Math.round(st.maxDist) };
      process.stderr.write(`scan ${path.basename(f)} ${px.width}x${px.height} bg std ${st.std.toFixed(1)}
`);
    }
    items.push(item);
  }
  const plan = {
    outDir: opt["out-dir"] || "out",
    defaults: { mode: opt.mode || "key", bg: opt.bg || "auto", cleanIslands: true, killFaint: 0, ...itemOptionsFromArgs(opt) },
    note: useTriage
      ? "triage.class — flat: 색상 키 기본값 · vignette: tolerance 상향+killFaint · glow: 이펙트 추출 · nonflat(mode ai): 색상 키 불가, AI 분리 대상(alpha 가 건너뜀). 자동 판정은 출발점이며 항목별 mode/tolerance/feather/killFaint 를 고쳐 쓴다."
      : "bgStats.std 가 6 이하면 평탄 매트(key 기본값으로 충분). 15~40 은 비네팅/그라디언트 — tolerance 를 올리고 killFaint(150~200)를 켤 것. 60 이상은 사진/텍스처 배경 — 색상 키 대상이 아님(AI 분리).",
    triageCounts: useTriage ? counts : undefined,
    items,
  };
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 1), "utf8");
  console.log(`plan 저장: ${planPath} (${items.length}개${useTriage ? " · " + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ") : ""})`);
}

async function cmdAlpha(opt) {
  const items = await buildItems(opt);
  if (!items.length) throw new Error("처리할 이미지가 없습니다.");
  const jobs = num(opt.jobs, Math.max(1, Math.min(os.cpus().length - 1, 8)));
  const t0 = Date.now();
  const results = await runPool(items, jobs, (i, r) => {
    const tag = r.error ? `FAIL ${r.error}` : r.skipped ? `SKIP ${r.warnings[0]}` : `${r.mode} bg(${r.bg.r},${r.bg.g},${r.bg.b}) std ${r.bgStd} · 투명 ${r.qa.transparentPixels} 반투명 ${r.qa.partialPixels} 불투명 ${r.qa.opaquePixels}${r.warnings.length ? " · ⚠ " + r.warnings.join(" / ") : ""}`;
    process.stderr.write(`[${i + 1}/${items.length}] ${path.basename(r.src || items[i].src)} — ${tag}\n`);
  });
  // 리포트 기본 위치: plan 이 있으면 plan 옆, 폴더 모드면 --out-dir 안
  const reportPath = path.resolve(opt.report || (opt.plan ? path.join(path.dirname(path.resolve(opt.plan)), "report.json") : path.join(opt["out-dir"] || "out", "report.json")));
  const failed = results.filter((r) => r.error);
  const skipped = results.filter((r) => r.skipped);
  const report = { engine: "nexus-studio/src/lib (colorKeyExtract · effectExtract · alphaCleanup · alphaTriage)", jobs, elapsedMs: Date.now() - t0, total: results.length, done: results.length - failed.length - skipped.length, failed: failed.length, skipped: skipped.length, items: results };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 1), "utf8");
  if (opt.sheet) await contactSheet(results, path.resolve(opt.sheet), { cell: num(opt["sheet-cell"], 256), cols: num(opt["sheet-cols"], 6) });
  console.log(`완료 ${report.done}/${results.length}${skipped.length ? ` · 건너뜀(ai) ${skipped.length}` : ""} · ${((Date.now() - t0) / 1000).toFixed(1)}s · report ${reportPath}${opt.sheet ? ` · sheet ${path.resolve(opt.sheet)}` : ""}`);
  if (failed.length) { for (const f of failed) console.error(`FAIL ${f.src}: ${f.error}`); process.exitCode = 1; }
}

if (isMainThread) {
  const opt = parseArgs(process.argv.slice(2));
  const cmd = opt._[0];
  try {
    if (cmd === "plan") await cmdPlan(opt);
    else if (cmd === "alpha") await cmdAlpha(opt);
    else {
      console.error("사용:\n  nexus-cli plan  --in <dir> --out plan.json [--mode key|effect] [--out-dir out]\n  nexus-cli alpha --plan plan.json [--jobs N] [--sheet sheet.png]\n  nexus-cli alpha --in <dir> --out-dir out --mode key|effect [--tolerance 40 --feather 22 --killFaint 150 ...]");
      process.exitCode = 2;
    }
  } catch (e) { console.error(`오류: ${e.message}`); process.exitCode = 1; }
}
