// cleanup.js — 기존에 잘못 업로드된 processed.json 항목을 새 규칙으로 재검사 + 정리.
// 기본은 DRY-RUN. 실제로 삭제하려면 --execute 를 붙여 실행.
//
// 실행:
//   node cleanup.js              — 삭제 대상만 출력 (dry-run)
//   node cleanup.js --execute    — Firestore + Cloudinary + processed.json 실제 삭제
//   node cleanup.js --app=promotion-archive  — 특정 앱만 대상
//   node cleanup.js --exclude-only  — exclude 키워드 매치만 삭제 (include rule fail 은 보존)
//   node cleanup.js --before-year=2020  — 경로에서 추출한 연도 < 2020 인 항목만 삭제 (다른 규칙 검사 skip)
//
// 삭제 대상 판정:
//   1. config.json 의 exclude 키워드가 경로 segment 에 포함됨 → 삭제
//   2. entry 의 include 규칙(includeYears / includeSegments / includeFilenameKeywords)
//      을 통과하지 못함 → 삭제

import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { initFirebase, initCloudinary, getCollectionPath } from './uploader.js';
import { isExcluded, matchesInclude } from './scanner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, 'config.json');
const PROCESSED_PATH = resolve(__dirname, 'processed.json');

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const EXCLUDE_ONLY = args.includes('--exclude-only');
const APP_FILTER = (args.find((a) => a.startsWith('--app=')) || '').split('=')[1] || null;
const BEFORE_YEAR_ARG = (args.find((a) => a.startsWith('--before-year=')) || '').split('=')[1];
const BEFORE_YEAR = BEFORE_YEAR_ARG ? parseInt(BEFORE_YEAR_ARG, 10) : null;

function extractMinYearFromPath(filePath) {
  const segments = filePath.split(/[\\/]/);
  let minYear = null;
  for (const seg of segments) {
    const m = seg.match(/(20\d{2})/);
    if (m) {
      const y = parseInt(m[1], 10);
      if (minYear === null || y < minYear) minYear = y;
    }
  }
  return minYear;
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const exclude = config.exclude || [];
const watchEntries = config.watch || [];

// 어느 watch entry 에 속하는 경로인지 — watcher.js 와 동일 로직.
function findWatchEntryFor(filePath) {
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

function classify(filePath, info) {
  // app filter
  if (APP_FILTER && info.app !== APP_FILTER) return { keep: true, reason: 'app filter skip' };

  // --before-year 모드: 다른 규칙 다 건너뛰고 연도만 본다.
  if (BEFORE_YEAR !== null) {
    const y = extractMinYearFromPath(filePath);
    if (y !== null && y < BEFORE_YEAR) return { keep: false, reason: `path year ${y} < ${BEFORE_YEAR}` };
    return { keep: true };
  }

  const entry = findWatchEntryFor(filePath);
  if (!entry) return { keep: true, reason: 'no watch entry — left untouched' };

  if (isExcluded(filePath, exclude)) return { keep: false, reason: 'exclude segment match' };
  if (EXCLUDE_ONLY) return { keep: true, reason: 'include rule fail skipped (--exclude-only)' };
  if (!matchesInclude(filePath, entry)) {
    const rules = [];
    if (entry.includeYears?.length) rules.push(`year∈[${entry.includeYears.join(',')}]`);
    if (entry.includeSegments?.length) rules.push(`segment⊇[${entry.includeSegments.join(',')}]`);
    if (entry.includeFilenameKeywords?.length) rules.push(`filename⊇[${entry.includeFilenameKeywords.join(',')}]`);
    return { keep: false, reason: `include rule fail (${rules.join(' AND ')})` };
  }
  return { keep: true };
}

async function main() {
  if (!existsSync(PROCESSED_PATH)) {
    console.error(`processed.json 이 없습니다: ${PROCESSED_PATH}`);
    process.exit(1);
  }
  initCloudinary();
  const db = initFirebase();

  const processed = JSON.parse(readFileSync(PROCESSED_PATH, 'utf8'));
  const total = Object.keys(processed).length;

  console.log(`\n[Cleanup] 모드: ${EXECUTE ? '\x1b[31mEXECUTE\x1b[0m' : '\x1b[33mDRY-RUN\x1b[0m'}`);
  if (EXCLUDE_ONLY) console.log(`[Cleanup] --exclude-only: exclude segment match 만 삭제`);
  if (BEFORE_YEAR !== null) console.log(`[Cleanup] --before-year=${BEFORE_YEAR}: 경로 연도 < ${BEFORE_YEAR} 만 삭제`);
  if (APP_FILTER) console.log(`[Cleanup] app filter: ${APP_FILTER}`);
  console.log(`[Cleanup] 총 ${total}개 항목 검사 중...\n`);

  const toDelete = [];
  const byApp = {};
  for (const [filePath, info] of Object.entries(processed)) {
    byApp[info.app] = (byApp[info.app] || 0) + 1;
    const c = classify(filePath, info);
    if (!c.keep) toDelete.push({ filePath, info, reason: c.reason });
  }

  console.log(`[Cleanup] 앱별 현재:`);
  Object.entries(byApp).forEach(([app, n]) => console.log(`  ${app}: ${n}`));
  console.log(`\n[Cleanup] 삭제 대상: \x1b[31m${toDelete.length}\x1b[0m / ${total}`);

  if (toDelete.length === 0) {
    console.log('정리할 항목이 없습니다.');
    return;
  }

  // 사유별 집계
  const reasonCount = {};
  toDelete.forEach((d) => { reasonCount[d.reason] = (reasonCount[d.reason] || 0) + 1; });
  console.log(`\n사유별:`);
  Object.entries(reasonCount).sort((a, b) => b[1] - a[1]).forEach(([r, n]) => console.log(`  ${n}× ${r}`));

  console.log(`\n예시 (앞 20개):`);
  for (const item of toDelete.slice(0, 20)) {
    console.log(`  - [${item.info.app}] ${item.filePath}`);
    console.log(`      → ${item.reason}`);
  }
  if (toDelete.length > 20) console.log(`  ... ${toDelete.length - 20}개 더 있음`);

  if (!EXECUTE) {
    console.log(`\n실제 삭제하려면: \x1b[36mnode cleanup.js --execute\x1b[0m`);
    return;
  }

  console.log(`\n실제 삭제 시작...`);
  let firestoreOk = 0, firestoreFail = 0;
  let cloudOk = 0, cloudFail = 0;

  for (const { filePath, info } of toDelete) {
    // Firestore
    if (info.docId) {
      try {
        const colPath = getCollectionPath(info.app);
        await db.doc(`${colPath}/${info.docId}`).delete();
        firestoreOk++;
      } catch (e) {
        firestoreFail++;
        console.warn(`  Firestore 실패 [${info.docId}]:`, e.message);
      }
    }
    // Cloudinary
    if (info.publicId) {
      try {
        await cloudinary.uploader.destroy(info.publicId, { resource_type: 'image' });
        cloudOk++;
      } catch (e) {
        cloudFail++;
        console.warn(`  Cloudinary 실패 [${info.publicId}]:`, e.message);
      }
    }
    delete processed[filePath];
  }

  writeFileSync(PROCESSED_PATH, JSON.stringify(processed, null, 2), 'utf8');

  console.log(`\n[Cleanup] 완료:`);
  console.log(`  Firestore 삭제: ${firestoreOk} 성공 / ${firestoreFail} 실패`);
  console.log(`  Cloudinary 삭제: ${cloudOk} 성공 / ${cloudFail} 실패`);
  console.log(`  processed.json 항목 제거: ${toDelete.length}`);
  console.log(`  남은 항목: ${Object.keys(processed).length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
