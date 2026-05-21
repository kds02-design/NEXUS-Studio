// watcher.js — 메인 진입점.
// chokidar 로 이벤트 기반 감시 + interval(분) 마다 풀 스캔(이벤트 누락 보정).
// 처리된 파일은 processed.json 에 캐싱하여 재시작 시 중복 업로드 방지.
//
// 실행:
//   node watcher.js              — 상주 (이벤트 + 주기 스캔)
//   node watcher.js --scan-only  — 한 번만 풀 스캔 후 종료
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import chokidar from 'chokidar';

import { walkDir, isExcluded, hasValidExtension, matchesInclude, waitForStableSize, buildFileMeta } from './scanner.js';
import { initFirebase, initCloudinary, findExistingDoc, createDoc, uploadToCloudinary } from './uploader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, 'config.json');
const PROCESSED_PATH = resolve(__dirname, 'processed.json');
const ERROR_LOG_PATH = resolve(__dirname, 'error.log');

// ─── CLI 옵션 ──────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const SCAN_ONLY = args.has('--scan-only');

// ─── 로거 ───────────────────────────────────────────────
const ts = () => new Date().toISOString();
const log = {
  info: (msg) => console.log(`[${ts()}] ${msg}`),
  warn: (msg) => console.warn(`[${ts()}] WARN ${msg}`),
  err: (msg, err) => {
    const line = `[${ts()}] ERROR ${msg}${err ? ` — ${err.stack || err.message || err}` : ''}`;
    console.error(line);
    try { appendFileSync(ERROR_LOG_PATH, line + '\n', 'utf8'); } catch {}
  },
};

// ─── 설정/캐시 로드 ─────────────────────────────────────
function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { log.warn(`${path} 파싱 실패 — 기본값 사용: ${e.message}`); return fallback; }
}
function saveJsonAtomic(path, obj) {
  const tmp = path + '.tmp';
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  // Windows 에서 rename 은 덮어쓰기 가능 (writeFileSync 도 가능하지만 atomicity 위해 tmp+rename)
  try { writeFileSync(path, JSON.stringify(obj, null, 2), 'utf8'); } catch (e) { log.err('processed.json 저장 실패', e); }
}

const config = loadJson(CONFIG_PATH, null);
if (!config || !Array.isArray(config.watch) || config.watch.length === 0) {
  log.err('config.json 의 watch 배열이 비어있거나 잘못되었습니다.');
  process.exit(1);
}
const extensions = (config.extensions || ['.jpg', '.jpeg', '.png', '.webp']).map((e) => e.toLowerCase());
const exclude = config.exclude || [];
const intervalSec = Math.max(60, Number(config.interval) || 300);

// 절대경로/UNC 정규화 — chokidar 는 백슬래시 / 슬래시 모두 처리.
const watchEntries = config.watch.map((w) => ({
  ...w,
  path: String(w.path),
}));

// ─── 서비스 초기화 ──────────────────────────────────────
let db;
try {
  initCloudinary();
  db = initFirebase();
  log.info(`Firebase / Cloudinary 초기화 완료. NEXUS_APP_ID=${process.env.NEXUS_APP_ID}`);
} catch (e) {
  log.err('서비스 초기화 실패 — .env 를 확인하세요.', e);
  process.exit(1);
}

// ─── processed.json 캐시 ─────────────────────────────────
// shape: { [fullPath]: { uploadedAt: ms, docId, publicId, app, sourcePath } }
const processed = loadJson(PROCESSED_PATH, {});
const inflight = new Set(); // 동시 처리 중인 파일 (이벤트 + 스캔 충돌 방지)
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveJsonAtomic(PROCESSED_PATH, processed); }, 1500);
}

// ─── 메인 파이프라인 ────────────────────────────────────
function findWatchEntryFor(filePath) {
  // 가장 긴 일치 경로의 watch entry 를 반환 (중첩 폴더 안전).
  const norm = filePath.split(sep).join('/').toLowerCase();
  let best = null;
  for (const w of watchEntries) {
    const wp = String(w.path).split(sep).join('/').toLowerCase().replace(/\/+$/, '');
    if (norm.startsWith(wp + '/') || norm === wp) {
      if (!best || wp.length > String(best.path).length) best = w;
    }
  }
  return best;
}

async function processFile(filePath) {
  if (inflight.has(filePath)) return;
  inflight.add(filePath);
  try {
    if (!hasValidExtension(filePath, extensions)) return;
    if (isExcluded(filePath, exclude)) return;

    // 로컬 캐시 — 이미 처리한 파일.
    if (processed[filePath]) return;

    // 어느 watch entry 인지 매칭.
    const entry = findWatchEntryFor(filePath);
    if (!entry) { log.warn(`watch 매칭 실패: ${filePath}`); return; }

    // entry 별 include 규칙 (연도/경로/파일명 화이트리스트) 통과 여부.
    if (!matchesInclude(filePath, entry)) {
      // 너무 많이 찍히지 않도록 debug 레벨로만 흘려둠 (지금은 info 로 남겨 확인).
      log.info(`SKIP (include 규칙 미충족) [${entry.app}] ${filePath}`);
      return;
    }

    // 파일이 아직 복사 중이면 안정될 때까지 대기.
    const stable = await waitForStableSize(filePath);
    if (!stable) { log.warn(`크기 안정 실패 (skip): ${filePath}`); return; }

    // 메타데이터 생성.
    const meta = await buildFileMeta(filePath, entry.path, { year: entry.year, game: entry.game });

    // Firestore 에 동일 sourcePath 가 있으면 skip + 캐시 동기화.
    const existing = await findExistingDoc(db, entry.app, meta.relativePath);
    if (existing) {
      processed[filePath] = {
        uploadedAt: Date.now(),
        docId: existing.id,
        publicId: existing.data?.cloudinaryPublicId || null,
        app: entry.app,
        sourcePath: meta.relativePath,
        fromFirestore: true,
      };
      scheduleSave();
      log.info(`SKIP (이미 Firestore 존재) [${entry.app}] ${meta.relativePath}`);
      return;
    }

    // Cloudinary 업로드.
    log.info(`UPLOAD 시작 [${entry.app}] ${meta.relativePath}`);
    const cloud = await uploadToCloudinary(filePath, { appKey: entry.app });

    // Firestore 문서 생성.
    const doc = await createDoc(db, entry.app, meta, cloud);

    processed[filePath] = {
      uploadedAt: Date.now(),
      docId: doc.id,
      publicId: cloud.publicId,
      app: entry.app,
      sourcePath: meta.relativePath,
    };
    scheduleSave();
    log.info(`DONE [${entry.app}] ${meta.relativePath} → docId=${doc.id}`);
  } catch (e) {
    log.err(`처리 실패: ${filePath}`, e);
  } finally {
    inflight.delete(filePath);
  }
}

// ─── 풀 스캔 (시작 시 + 주기) ──────────────────────────
async function fullScan() {
  for (const entry of watchEntries) {
    log.info(`풀 스캔 시작: ${entry.path}`);
    let files = [];
    try {
      files = await walkDir(entry.path, { extensions, exclude });
    } catch (e) {
      log.err(`디렉터리 스캔 실패: ${entry.path}`, e);
      continue;
    }
    log.info(`발견: ${files.length} 개 → ${entry.path}`);
    for (const f of files) {
      // 직렬 처리 — Cloudinary 무료 plan / Firestore write rate 안정성 확보.
      await processFile(f);
    }
  }
  saveJsonAtomic(PROCESSED_PATH, processed);
  log.info('풀 스캔 완료');
}

// ─── 진입 ───────────────────────────────────────────────
(async () => {
  // error.log 디렉터리 보장
  try { mkdirSync(dirname(ERROR_LOG_PATH), { recursive: true }); } catch {}

  log.info(`watch 대상: ${watchEntries.length} 개`);
  watchEntries.forEach((w, i) => log.info(`  [${i + 1}] app=${w.app} path=${w.path} game=${w.game || '-'} year=${w.year || '-'}`));

  // 1) 초기 풀 스캔
  await fullScan();

  if (SCAN_ONLY) { log.info('--scan-only 종료'); process.exit(0); }

  // 2) chokidar 이벤트 감시
  const paths = watchEntries.map((w) => w.path);
  const watcher = chokidar.watch(paths, {
    ignored: (p) => isExcluded(p, exclude),
    ignoreInitial: true, // 초기 스캔은 위에서 이미 수행
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 },
    persistent: true,
    usePolling: true, // UNC/SMB 공유는 polling 이 더 안정적
    interval: 5000,
    binaryInterval: 5000,
  });
  watcher.on('add', (filePath) => {
    log.info(`이벤트 add: ${filePath}`);
    processFile(filePath);
  });
  watcher.on('error', (e) => log.err('watcher error', e));
  log.info('chokidar 감시 시작');

  // 3) 주기적 풀 스캔 (이벤트 누락 보정)
  setInterval(() => { fullScan().catch((e) => log.err('주기 스캔 실패', e)); }, intervalSec * 1000);
  log.info(`주기 스캔 간격: ${intervalSec}초`);
})();

// 종료 시 캐시 flush
const shutdown = (signal) => {
  log.info(`${signal} 수신 — 종료 처리 중`);
  try { saveJsonAtomic(PROCESSED_PATH, processed); } catch {}
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (e) => log.err('uncaughtException', e));
process.on('unhandledRejection', (e) => log.err('unhandledRejection', e));
