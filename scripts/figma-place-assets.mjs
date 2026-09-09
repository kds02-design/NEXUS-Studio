#!/usr/bin/env node
// 피그마 에셋 납품 도우미 — 투명 PNG/원본 이미지 폴더를 피그마 페이지에 섹션 그리드로 배치하는 3단계 흐름.
// Figma MCP 의 upload_assets 는 nodeIds 를 줘도 fill 이 자동 적용되지 않으므로(2026-09 확인)
// 응답의 imageHash 를 받아 use_figma 로 직접 fill 에 넣는다. 이 스크립트는 그 흐름에서
// "에이전트가 손으로 만들던 JSON/JS" 를 전부 생성하고 업로드를 대신 실행한다.
//
//   1) layout : 폴더 → manifest.json + 섹션 생성용 use_figma 코드(figma_section_*.js)
//        node scripts/figma-place-assets.mjs layout --in <루트폴더> --out <작업폴더> [--page-id 34:137] [--cell 512] [--cols 6]
//        루트 바로 아래 하위 폴더 하나가 섹션 하나. (하위 폴더가 없으면 루트가 섹션 하나)
//        → 에이전트: 각 figma_section_*.js 를 use_figma 로 실행하고 반환된 ids 를 ids.json 에 합친다
//          ({ "<파일명(확장자 없음)>": "37:4", ... })
//   2) upload : ids.json + upload_assets 응답(urls.json: {nodeId: submitUrl}) → 파일 POST → hashes.json
//        node scripts/figma-place-assets.mjs upload --work <작업폴더> --urls urls.json
//        → 에이전트: upload_assets(count ≤ 60, nodeIds=배치) 를 호출해 submitUrl 목록을 urls.json 으로 저장한 뒤 실행.
//          60개 넘으면 urls_1.json, urls_2.json … 여러 번. URL 은 10분 단발성.
//   3) apply  : hashes.json → fill 적용용 use_figma 코드(figma_apply.js)
//        node scripts/figma-place-assets.mjs apply --work <작업폴더>
//
// 산출물은 전부 --out/--work 폴더 안. manifest 항목: { group, name, path, mime, w, h, nodeId?, imageHash? }

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) { o._.push(t); continue; }
    const k = t.slice(2), v = argv[i + 1];
    if (v == null || v.startsWith("--")) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}
const num = (v, d) => (v == null ? d : Number(v));

async function imageSize(file) {
  const { loadImage } = await import(pathToFileURL(path.join(process.cwd(), "node_modules", "@napi-rs", "canvas", "index.js")).href).catch(() => import("@napi-rs/canvas"));
  const img = await loadImage(file);
  return { w: img.width, h: img.height };
}

// ─── 1) layout ─────────────────────────────────────────────────────────────────
async function cmdLayout(o) {
  const root = path.resolve(o.in);
  const work = path.resolve(o.out || "figma_work");
  fs.mkdirSync(work, { recursive: true });
  const CELL = num(o.cell, 512), GAP = num(o.gap, 48), COLS = num(o.cols, 6), PAD = 64, LABEL = 36, TITLE_H = 40, SEC_GAP = 120;
  const pageId = o["page-id"] || null;
  const subs = fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory());
  const groups = subs.length ? subs.map((d) => ({ name: d, dir: path.join(root, d) })) : [{ name: path.basename(root), dir: root }];
  const manifest = [];
  let y0 = 0, idx = 0;
  for (const g of groups) {
    const files = fs.readdirSync(g.dir).filter((f) => IMAGE_EXT.test(f)).sort();
    if (!files.length) continue;
    idx++;
    const items = [];
    for (const f of files) {
      const p = path.join(g.dir, f);
      const { w, h } = await imageSize(p);
      const name = f.replace(IMAGE_EXT, "");
      items.push({ group: g.name, name, path: p, mime: MIME[path.extname(f).toLowerCase()], w, h });
    }
    const rows = Math.ceil(items.length / COLS);
    const sw = PAD * 2 + COLS * CELL + (COLS - 1) * GAP;
    const sh = PAD * 2 + TITLE_H + rows * (CELL + LABEL) + (rows - 1) * GAP;
    const title = `${String(idx).padStart(2, "0")} ${g.name}`;
    const cells = items.map((m, i) => {
      const s = Math.min(CELL / m.w, CELL / m.h), w = Math.round(m.w * s), h = Math.round(m.h * s);
      const cx = PAD + (i % COLS) * (CELL + GAP), cy = PAD + TITLE_H + Math.floor(i / COLS) * (CELL + LABEL + GAP);
      return { name: m.name, x: cx + Math.floor((CELL - w) / 2), y: cy + Math.floor((CELL - h) / 2), w, h, lx: cx, ly: cy + CELL + 8 };
    });
    const js = `${pageId ? `const page = await figma.getNodeByIdAsync(${JSON.stringify(pageId)});\nawait figma.setCurrentPageAsync(page);` : "const page = figma.currentPage;"}
await figma.loadFontAsync({family:'Inter',style:'Regular'});
await figma.loadFontAsync({family:'Inter',style:'Bold'});
const cells = ${JSON.stringify(cells)};
const sec = figma.createSection(); sec.name = ${JSON.stringify(title)}; sec.x = 0; sec.y = ${y0}; sec.resizeWithoutConstraints(${sw}, ${sh});
sec.fills = [{type:'SOLID',color:{r:0.13,g:0.13,b:0.14}}];
page.appendChild(sec);
const t = figma.createText(); t.fontName={family:'Inter',style:'Bold'}; t.fontSize=28; t.characters=${JSON.stringify(title)}; t.fills=[{type:'SOLID',color:{r:1,g:1,b:1}}]; t.x=${PAD}; t.y=${PAD - 8}; sec.appendChild(t);
const ids = {};
for (const c of cells) {
  const r = figma.createRectangle(); r.name = c.name; r.resize(c.w, c.h); r.x = c.x; r.y = c.y; r.fills = [{type:'SOLID',color:{r:0.25,g:0.25,b:0.27}}]; sec.appendChild(r); ids[c.name] = r.id;
  const l = figma.createText(); l.fontName={family:'Inter',style:'Regular'}; l.fontSize=13; l.characters=c.name; l.fills=[{type:'SOLID',color:{r:0.75,g:0.75,b:0.78}}]; l.x=c.lx; l.y=c.ly; l.name='label/'+c.name; sec.appendChild(l);
}
return { sectionId: sec.id, group: ${JSON.stringify(g.name)}, count: cells.length, ids };
`;
    fs.writeFileSync(path.join(work, `figma_section_${String(idx).padStart(2, "0")}.js`), js, "utf8");
    manifest.push(...items);
    y0 += sh + SEC_GAP;
    console.log(`section ${title}: ${items.length}개, ${sw}x${sh}`);
  }
  // 같은 name 이 여러 그룹에 있으면 ids.json 키가 충돌한다 — group/name 키로 저장
  fs.writeFileSync(path.join(work, "manifest.json"), JSON.stringify(manifest, null, 1), "utf8");
  console.log(`manifest: ${path.join(work, "manifest.json")} (${manifest.length}개)\n다음: figma_section_*.js 를 use_figma 로 실행 → 반환 ids 를 ${path.join(work, "ids.json")} 에 { "<group>/<name>": nodeId } 로 저장`);
}

// ─── 2) upload ──────────────────────────────────────────────────────────────────
async function cmdUpload(o) {
  const work = path.resolve(o.work);
  const manifest = JSON.parse(fs.readFileSync(path.join(work, "manifest.json"), "utf8"));
  const ids = JSON.parse(fs.readFileSync(path.join(work, "ids.json"), "utf8"));
  const urls = JSON.parse(fs.readFileSync(path.resolve(o.urls), "utf8"));
  const hashesPath = path.join(work, "hashes.json");
  const hashes = fs.existsSync(hashesPath) ? JSON.parse(fs.readFileSync(hashesPath, "utf8")) : {};
  const key = (m) => `${m.group}/${m.name}`;
  for (const m of manifest) m.nodeId = ids[key(m)] || ids[m.name] || m.nodeId;
  const todo = manifest.filter((m) => m.nodeId && urls[m.nodeId] && !hashes[m.nodeId]);
  if (!todo.length) { console.log("업로드할 항목이 없습니다 (urls.json 의 nodeId 가 manifest/ids 와 맞는지 확인)."); return; }
  const limit = num(o.jobs, 6);
  let i = 0, ok = 0, fail = 0;
  const one = async (m) => {
    const url = urls[m.nodeId].startsWith("http") ? urls[m.nodeId] : `https://mcp.figma.com/mcp/upload/${urls[m.nodeId]}/submit?scaleMode=FIT`;
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": m.mime }, body: fs.readFileSync(m.path) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.imageHash) { hashes[m.nodeId] = j.imageHash; m.imageHash = j.imageHash; ok++; console.log(`OK   ${key(m)} ${j.imageHash}`); }
      else { fail++; console.error(`FAIL ${key(m)} ${res.status} ${JSON.stringify(j).slice(0, 120)}`); }
    } catch (e) { fail++; console.error(`FAIL ${key(m)} ${e.message}`); }
  };
  await Promise.all(Array.from({ length: Math.min(limit, todo.length) }, async () => { while (i < todo.length) await one(todo[i++]); }));
  fs.writeFileSync(hashesPath, JSON.stringify(hashes, null, 1), "utf8");
  fs.writeFileSync(path.join(work, "manifest.json"), JSON.stringify(manifest, null, 1), "utf8");
  console.log(`업로드 ${ok} 성공 · ${fail} 실패 · hashes: ${hashesPath} (누적 ${Object.keys(hashes).length})`);
  if (fail) process.exitCode = 1;
}

// ─── 3) apply ───────────────────────────────────────────────────────────────────
function cmdApply(o) {
  const work = path.resolve(o.work);
  const hashes = JSON.parse(fs.readFileSync(path.join(work, "hashes.json"), "utf8"));
  const pageId = o["page-id"] || null;
  const js = `${pageId ? `const page = await figma.getNodeByIdAsync(${JSON.stringify(pageId)});\nawait figma.setCurrentPageAsync(page);` : ""}
const H = ${JSON.stringify(hashes)};
const done = [], missing = [];
for (const [id, hash] of Object.entries(H)) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { missing.push(id); continue; }
  n.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FIT' }];
  done.push(id);
}
return { applied: done.length, missing, mutatedNodeIds: done };
`;
  const out = path.join(work, "figma_apply.js");
  fs.writeFileSync(out, js, "utf8");
  console.log(`${out} 생성 (${Object.keys(hashes).length}개) → use_figma 로 실행`);
}

const o = parseArgs(process.argv.slice(2));
const cmd = o._[0];
try {
  if (cmd === "layout") await cmdLayout(o);
  else if (cmd === "upload") await cmdUpload(o);
  else if (cmd === "apply") cmdApply(o);
  else { console.error("사용: layout --in <폴더> --out <작업폴더> [--page-id] | upload --work <작업폴더> --urls urls.json | apply --work <작업폴더> [--page-id]"); process.exitCode = 2; }
} catch (e) { console.error(`오류: ${e.message}`); process.exitCode = 1; }
