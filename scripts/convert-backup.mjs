// Convert a Promotion Archive backup JSON (~600MB w/ base64 images)
// → slim JSON whose image fields are Cloudinary URLs (each banner is
// well under Firestore's 1MB doc limit).
//
// Uses the same unsigned upload preset as src/lib/storage.js:
//   VITE_CLOUDINARY_CLOUD_NAME       (already in .env)
//   VITE_CLOUDINARY_UPLOAD_PRESET    (already in .env)
//
// Optional env:
//   CONCURRENT_UPLOADS   (default: 4)
//
// Usage:
//   npm run backup:convert
//   # The script will prompt for the backup file path.
//
// What it does:
//   1. Streams the JSON top-level array via stream-json (constant memory).
//   2. Deep-walks each item; any string matching `data:image/...;base64,...`
//      is uploaded to Cloudinary using the unsigned preset and replaced
//      with the returned secure_url.
//   3. SHA-1 of the image bytes is used as a local dedup key — repeats
//      within the same backup re-use the URL without re-uploading.
//   4. Writes scripts/out/<name>.cloudinary.json (the converted JSON)
//      and scripts/out/<name>.manifest.json (hash → URL map, persisted
//      so a re-run skips already-uploaded images).

import {
  createReadStream, createWriteStream,
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve, basename } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { chain } from "stream-chain";
import streamJson from "stream-json";
import streamArrayMod from "stream-json/streamers/stream-array.js";

const parser = streamJson.parser;
const streamArray = streamArrayMod.streamArray || streamArrayMod;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

loadDotEnv(resolve(ROOT, ".env"));

const CLOUD = process.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_CONCURRENT = Math.max(1, Number(process.env.CONCURRENT_UPLOADS || 4));

if (!CLOUD || !PRESET) {
  console.error("\n[convert] .env 에 다음이 비어 있습니다:");
  if (!CLOUD)  console.error("  VITE_CLOUDINARY_CLOUD_NAME");
  if (!PRESET) console.error("  VITE_CLOUDINARY_UPLOAD_PRESET");
  console.error();
  process.exit(1);
}

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`;

// ---------- 입력 경로 묻기 ----------
const rawInput = await prompt("백업 JSON 파일 경로를 입력하세요: ");
const ABS_INPUT = resolve(rawInput.trim().replace(/^['"]+|['"]+$/g, ""));
if (!existsSync(ABS_INPUT)) {
  console.error(`[convert] 파일이 존재하지 않습니다: ${ABS_INPUT}`);
  process.exit(1);
}

const OUT_DIR = resolve(ROOT, "scripts", "out");
mkdirSync(OUT_DIR, { recursive: true });

const baseName = basename(ABS_INPUT, ".json");
const OUT_PATH = resolve(OUT_DIR, `${baseName}.cloudinary.json`);
const MANIFEST_PATH = resolve(OUT_DIR, `${baseName}.manifest.json`);

// ---------- 매니페스트 (재실행 시 재업로드 방지) ----------
const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : {};
console.log(`[convert] cloud: ${CLOUD} · preset: ${PRESET}`);
console.log(`[convert] 기존 매니페스트 항목: ${Object.keys(manifest).length}`);

let manifestDirty = 0;
function persistManifestIfNeeded(force = false) {
  if (force || manifestDirty >= 25) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest));
    manifestDirty = 0;
  }
}

// ---------- 업로드 동시성 제한 ----------
let inFlight = 0;
const waitQueue = [];
function acquireSlot() {
  return new Promise((res) => {
    if (inFlight < MAX_CONCURRENT) { inFlight++; res(); return; }
    waitQueue.push(res);
  });
}
function releaseSlot() {
  inFlight--;
  if (waitQueue.length) { inFlight++; waitQueue.shift()(); }
}

// ---------- base64 data URL → Cloudinary URL ----------
const DATA_URL_RE = /^data:image\/[a-z0-9+.-]+;base64,/i;

async function uploadDataUrl(dataUrl) {
  const form = new FormData();
  form.append("file", dataUrl);
  form.append("upload_preset", PRESET);
  const res = await fetch(UPLOAD_URL, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary ${res.status} ${res.statusText}: ${text.slice(0, 280)}`);
  }
  const json = await res.json();
  const url = json.secure_url || json.url;
  if (!url) throw new Error("Cloudinary response missing secure_url");
  return url;
}

async function convertDataUrl(value) {
  if (!DATA_URL_RE.test(value)) return value;
  const commaIdx = value.indexOf(",");
  const b64 = value.slice(commaIdx + 1);
  if (!b64) return value;

  const hash = createHash("sha1").update(b64).digest("hex");
  if (manifest[hash]) return manifest[hash];

  await acquireSlot();
  try {
    let attempt = 0;
    let lastErr;
    while (attempt < 3) {
      try {
        const url = await uploadDataUrl(value);
        manifest[hash] = url;
        manifestDirty++;
        persistManifestIfNeeded();
        return url;
      } catch (e) {
        lastErr = e;
        attempt++;
        await sleep(800 * attempt);
      }
    }
    throw lastErr;
  } finally {
    releaseSlot();
  }
}

// 객체를 깊이 순회하며 data:image/...;base64,... 만 변환.
// 같은 banner 내 다중 이미지는 동시 업로드(슬롯이 허용하는 한).
async function deepConvert(node) {
  if (node == null) return node;
  if (typeof node === "string") {
    return DATA_URL_RE.test(node) ? await convertDataUrl(node) : node;
  }
  if (Array.isArray(node)) {
    return Promise.all(node.map(deepConvert));
  }
  if (typeof node === "object") {
    const keys = Object.keys(node);
    const vals = await Promise.all(keys.map((k) => deepConvert(node[k])));
    const out = {};
    keys.forEach((k, i) => { out[k] = vals[i]; });
    return out;
  }
  return node;
}

// ---------- 스트림 처리 ----------
const writer = createWriteStream(OUT_PATH, { encoding: "utf8" });
writer.write("[");
let count = 0;
let isFirst = true;
const t0 = Date.now();

const readStream = createReadStream(ABS_INPUT, { highWaterMark: 1 << 20 });
const pipeline = chain([readStream, parser(), streamArray()]);

await new Promise((resolveAll, rejectAll) => {
  pipeline.on("data", ({ value }) => {
    pipeline.pause();
    deepConvert(value)
      .then((converted) => {
        if (!isFirst) writer.write(",");
        const ok = writer.write(JSON.stringify(converted));
        isFirst = false;
        count++;
        if (count % 5 === 0) {
          const sec = ((Date.now() - t0) / 1000).toFixed(1);
          process.stdout.write(`\r[convert] ${count}개 처리 · ${sec}s elapsed · cache=${Object.keys(manifest).length}     `);
        }
        if (!ok) writer.once("drain", () => pipeline.resume());
        else pipeline.resume();
      })
      .catch(rejectAll);
  });
  pipeline.on("end", resolveAll);
  pipeline.on("error", rejectAll);
});

writer.write("]");
await new Promise((res) => writer.end(res));
persistManifestIfNeeded(true);

const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n[convert] ✓ 완료 — ${count}개 항목, ${totalSec}s`);
console.log(`         출력  : ${OUT_PATH}`);
console.log(`         매니페스트: ${MANIFEST_PATH}`);
console.log(`         업로드된 고유 이미지: ${Object.keys(manifest).length}`);

// ---------- helpers ----------
function prompt(q) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (ans) => { rl.close(); res(ans); });
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key]) continue;
    process.env[key] = raw.replace(/^['"]|['"]$/g, "");
  }
}
