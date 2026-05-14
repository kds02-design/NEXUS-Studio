// One-shot: apply cors.json to Firebase Storage bucket.
// Usage: node scripts/set-cors.mjs
// Requires: ./service-account.json (Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성)

import { Storage } from "@google-cloud/storage";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const KEY_PATH = resolve(ROOT, "service-account.json");
const CORS_PATH = resolve(ROOT, "cors.json");
const PROJECT_ID = "promo-arc";
const BUCKET = "promo-arc.firebasestorage.app";

if (!existsSync(KEY_PATH)) {
  console.error(`\n[set-cors] service-account.json 파일이 없습니다.`);
  console.error(`경로: ${KEY_PATH}\n`);
  console.error(`아래 단계로 다운로드 받으세요:`);
  console.error(`  1. https://console.firebase.google.com/project/${PROJECT_ID}/settings/serviceaccounts/adminsdk`);
  console.error(`  2. "새 비공개 키 생성" 클릭 → JSON 파일 다운로드`);
  console.error(`  3. 다운로드한 파일을 ${KEY_PATH} 로 이동/이름변경\n`);
  process.exit(1);
}
if (!existsSync(CORS_PATH)) {
  console.error(`[set-cors] cors.json 파일이 없습니다: ${CORS_PATH}`);
  process.exit(1);
}

const storage = new Storage({ keyFilename: KEY_PATH, projectId: PROJECT_ID });
const corsConfig = JSON.parse(readFileSync(CORS_PATH, "utf8"));

// Allow override from CLI: `node scripts/set-cors.mjs <bucket-name>`
const cliBucket = process.argv[2];
const candidates = cliBucket ? [cliBucket] : [BUCKET, `${PROJECT_ID}.appspot.com`];

let bucket = null;
for (const name of candidates) {
  const b = storage.bucket(name);
  try {
    const [exists] = await b.exists();
    if (exists) { bucket = b; console.log(`[set-cors] using bucket: gs://${name}`); break; }
    console.log(`[set-cors] not found: gs://${name}`);
  } catch (e) {
    console.log(`[set-cors] check failed for gs://${name}: ${e.message}`);
  }
}

if (!bucket) {
  console.error(`\n[set-cors] 사용 가능한 버킷을 못 찾았습니다. 프로젝트의 버킷 목록을 조회합니다...\n`);
  try {
    const [buckets] = await storage.getBuckets();
    if (buckets.length === 0) {
      console.error(`프로젝트 "${PROJECT_ID}"에 버킷이 하나도 없습니다.`);
      console.error(`Firebase Console → Build → Storage → Get started 로 먼저 Storage를 활성화하세요.`);
      console.error(`https://console.firebase.google.com/project/${PROJECT_ID}/storage`);
    } else {
      console.error(`아래 버킷 중 하나를 골라 다시 실행하세요:`);
      buckets.forEach(b => console.error(`  npm run cors:set -- ${b.name}`));
    }
  } catch (e) {
    console.error(`버킷 목록 조회 실패:`, e.message);
  }
  process.exit(1);
}

console.log(`[set-cors] applying cors.json...`);
await bucket.setCorsConfiguration(corsConfig);
console.log(`[set-cors] verifying...`);
const [metadata] = await bucket.getMetadata();
console.log(JSON.stringify(metadata.cors, null, 2));
console.log(`\n[set-cors] ✓ done. (전파에 1~2분 걸릴 수 있습니다)`);
