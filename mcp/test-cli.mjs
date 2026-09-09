// nexus-cli 검증 — (1) CLI 배치 결과가 src/lib 직접 호출과 픽셀 단위로 같은지(패리티)
//                 (2) plan → alpha 흐름 · 워커 병렬 · 후처리(cleanIslands/killFaint) · 시트/리포트 생성
// 실행: npm run mcp:test (선행: npm run mcp:build). 외부 호출 없음.
import { execFileSync } from "node:child_process";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, "")), "..");
const SCRATCH = path.join(ROOT, ".tmp", "cli-test");
fs.rmSync(SCRATCH, { recursive: true, force: true });
fs.mkdirSync(path.join(SCRATCH, "in"), { recursive: true });

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { if (cond) { pass++; console.log(`PASS ${name}`); } else { fail++; console.log(`FAIL ${name} ${detail}`); } };

// 픽셀 라이브러리 직접 import (번들과 같은 원본)
const { extractColorKeyPixels, detectBg } = await import(pathToFileURL(path.join(ROOT, "src/lib/colorKeyExtract.js")).href);
const { extractEffectPixels } = await import(pathToFileURL(path.join(ROOT, "src/lib/effectExtract.js")).href);
const { cleanIslands, killFaintIslands, labelAlphaComponents } = await import(pathToFileURL(path.join(ROOT, "src/lib/alphaCleanup.js")).href);

// 테스트 이미지 3장 — 검정 매트 위 불투명 원(+노이즈 점), 비네팅 배경 위 흰 사각형(+떠 있는 옅은 얼룩), 검정 위 글로우
const W = 240, H = 240;
function png(file, draw) {
  const cv = createCanvas(W, H); const ctx = cv.getContext("2d"); draw(ctx); fs.writeFileSync(file, cv.toBuffer("image/png"));
}
png(path.join(SCRATCH, "in", "solid.png"), (ctx) => {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e8b06a"; ctx.beginPath(); ctx.arc(120, 120, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1b1b1b"; ctx.fillRect(20, 20, 3, 3); // 옅은 점 (dist≈47 → tolerance 40 통과, 알파≈79 < islandAlpha 96)
});
png(path.join(SCRATCH, "in", "vignette.png"), (ctx) => {
  const g = ctx.createRadialGradient(120, 120, 20, 120, 120, 170); g.addColorStop(0, "#30343c"); g.addColorStop(1, "#14161a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f2f2f2"; ctx.fillRect(80, 80, 80, 80);
});
png(path.join(SCRATCH, "in", "glow.png"), (ctx) => {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(120, 120, 0, 120, 120, 110); g.addColorStop(0, "rgba(120,80,255,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
});

const cli = path.join(ROOT, "mcp", "nexus-cli.bundle.mjs");
const run = (args) => execFileSync(process.execPath, [cli, ...args], { cwd: SCRATCH, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// 1) plan 생성
run(["plan", "--in", "in", "--out", "plan.json", "--out-dir", "out"]);
const plan = JSON.parse(fs.readFileSync(path.join(SCRATCH, "plan.json"), "utf8"));
ok("plan 항목 3개", plan.items.length === 3);
const byName = Object.fromEntries(plan.items.map((i) => [path.basename(i.src, ".png"), i]));
ok("triage: 검정 매트 위 원 → flat/key", byName.solid.triage.class === "flat" && byName.solid.mode === "key", JSON.stringify(byName.solid.triage));
ok("triage: 글로우 → glow/effect (hardRatio " + byName.glow.triage.hardRatio + ")", byName.glow.triage.class === "glow" && byName.glow.mode === "effect", JSON.stringify(byName.glow.triage));
ok("triage: 비네팅 → vignette 또는 flat (std " + byName.vignette.triage.bgStd + ")", ["vignette", "flat"].includes(byName.vignette.triage.class), JSON.stringify(byName.vignette.triage));
// --no-triage 는 bgStats 만
run(["plan", "--in", "in", "--out", "plan_stats.json", "--out-dir", "out", "--no-triage"]);
const planStats = JSON.parse(fs.readFileSync(path.join(SCRATCH, "plan_stats.json"), "utf8"));
ok("plan --no-triage: bgStats 기록·mode 없음", planStats.items.every((i) => i.bgStats && i.mode == null));
// nonflat 항목은 alpha 가 건너뛴다
plan.items.push({ src: "in/solid.png", mode: "ai", out: "out/skip.png" });

// 2) 항목별 모드/옵션 편집 후 alpha 실행 (워커 2개)
byName.glow.mode = "effect"; byName.glow.cleanIslands = false;
byName.vignette.mode = "key"; byName.vignette.tolerance = 90; byName.vignette.feather = 30; byName.vignette.killFaint = 160;
fs.writeFileSync(path.join(SCRATCH, "plan.json"), JSON.stringify(plan));
const out = run(["alpha", "--plan", "plan.json", "--jobs", "2", "--sheet", "sheet.png"]);
ok("alpha 완료 메시지(3 처리 + 1 건너뜀)", /완료 3\/4 · 건너뜀\(ai\) 1/.test(out), out);
const report = JSON.parse(fs.readFileSync(path.join(SCRATCH, "report.json"), "utf8"));
ok("report 4건·실패 0·skipped 1", report.total === 4 && report.failed === 0 && report.skipped === 1 && !fs.existsSync(path.join(SCRATCH, "out", "skip.png")));
ok("sheet.png 생성", fs.existsSync(path.join(SCRATCH, "sheet.png")));

const readPx = async (f) => { const img = await loadImage(f); const cv = createCanvas(img.width, img.height); const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0); const d = ctx.getImageData(0, 0, img.width, img.height); return { data: d.data, width: d.width, height: d.height }; };


// 3) 패리티 — solid(key 기본값 + cleanIslands) 를 라이브러리로 직접 재현
{
  const src = await readPx(path.join(SCRATCH, "in", "solid.png"));
  const ref = extractColorKeyPixels(src, { bg: detectBg(src.data, W, H), tolerance: 40, feather: 22, holeProtect: false, holeSize: 2, decontam: true });
  cleanIslands(ref);
  const got = await readPx(path.join(SCRATCH, "out", "solid.png"));
  // 캔버스 PNG 저장은 프리멀티플라이 왕복이라 반투명 픽셀의 RGB 는 양자화된다(MCP 저장도 동일).
  // 알파 채널은 전 픽셀, RGB 는 완전 불투명 픽셀만 정확 비교한다.
  let ma = 0, mc = 0;
  for (let p = 0; p < W * H; p++) {
    ma = Math.max(ma, Math.abs(ref.data[p * 4 + 3] - got.data[p * 4 + 3]));
    if (ref.data[p * 4 + 3] === 255) for (let c = 0; c < 3; c++) mc = Math.max(mc, Math.abs(ref.data[p * 4 + c] - got.data[p * 4 + c]));
  }
  ok("패리티 key: CLI 결과 == extractColorKeyPixels+cleanIslands (alpha maxdiff " + ma + ", rgb@opaque maxdiff " + mc + ")", ma === 0 && mc === 0);
  const item = report.items.find((i) => i.src.endsWith("solid.png"));
  ok("cleanIslands 가 노이즈 점 제거", item.cleanup.removed.islands > 0 && item.qa.opaquePixels > 10000, JSON.stringify(item.cleanup));
}
// 4) 패리티 — glow(effect) 라이브러리 직접 재현
{
  const src = await readPx(path.join(SCRATCH, "in", "glow.png"));
  const ref = extractEffectPixels(src, { cutoff: 6, gamma: 0.85, opacity: 100, recoverColor: true, bg: detectBg(src.data, W, H) });
  const got = await readPx(path.join(SCRATCH, "out", "glow.png"));
  let m = 0; for (let p = 0; p < W * H; p++) { if (ref.data[p * 4 + 3] === 0 && got.data[p * 4 + 3] === 0) continue; m = Math.max(m, Math.abs(ref.data[p * 4 + 3] - got.data[p * 4 + 3])); }
  ok("패리티 effect: 알파 채널 일치 (maxdiff " + m + ")", m <= 1);
  const item = report.items.find((i) => i.src.endsWith("glow.png"));
  ok("effect 모드 기록", item.mode === "effect" && item.qa.partialPixels > 0);
}
// 5) 비네팅 — killFaint 로 떠 있는 얼룩이 사라지고 사각형만 남는지
{
  const got = await readPx(path.join(SCRATCH, "out", "vignette.png"));
  const comps = labelAlphaComponents(got.data, W, H);
  ok("killFaint 후 성분 1개(사각형)", comps.count === 1, String(comps.count));
  const item = report.items.find((i) => i.src.endsWith("vignette.png"));
  ok("비네팅 항목 bgStd 기록", item.bgStd > 3, String(item.bgStd));
}
// 6) 폴더 모드(plan 없음)
{
  const o = run(["alpha", "--in", "in", "--out-dir", "out2", "--mode", "key", "--jobs", "1"]);
  ok("폴더 모드 3/3", /완료 3\/3/.test(o) && fs.existsSync(path.join(SCRATCH, "out2", "glow.png")));
}
// 7) killFaintIslands 단위: 전부 옅으면 전부 제거, 본체는 유지
{
  const px = { data: new Uint8ClampedArray(16 * 16 * 4), width: 16, height: 16 };
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) px.data[(y * 16 + x) * 4 + 3] = 255;   // 본체
  for (let y = 10; y < 13; y++) for (let x = 10; x < 13; x++) px.data[(y * 16 + x) * 4 + 3] = 60; // 옅은 얼룩
  const removed = killFaintIslands(px, { faintAlpha: 150 });
  ok("killFaintIslands 옅은 성분만 제거", removed === 9 && px.data[3] === 255);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
