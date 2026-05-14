// 백업 JSON과 Firestore를 비교해, 백업엔 있지만 Firestore엔 빠진 이미지를 보완.
// - 백업 images 길이 > Firestore images 길이인 경우만 처리
// - 빠진 이미지(인덱스 fs.length 이후)만 Cloudinary 업로드
// - Firestore의 첫 N개는 그대로 두고, 뒤에 업로드된 URL만 append
// - stepPrompts/stepTags/... 도 같이 보정 (사용자가 편집했을 수 있는 앞쪽은 fs 우선)
//
// 사용:
//   node scripts/reconcile-prompt-images.mjs <백업.json>
//   또는 인자 없이 실행하면 ./prompt-arc-backup-*.json 중 가장 최근 파일 자동 사용
//
// 사전 준비:
//   1) npm install -D firebase-admin
//   2) ./service-account.json (Firebase Console → 프로젝트 설정 → 서비스 계정 → 키 생성)
//   3) .env 의 VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET / VITE_FIREBASE_PROJECT_ID

import { readFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const KEY_PATH = resolve(ROOT, "service-account.json");
const ENV_PATH = resolve(ROOT, ".env");

if (!existsSync(KEY_PATH)) {
  console.error(`[reconcile] service-account.json 누락: ${KEY_PATH}`);
  console.error(`Firebase Console → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" 후 ${KEY_PATH} 로 저장`);
  process.exit(1);
}

// .env 파싱 (dotenv 의존성 없이)
const env = {};
if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}
const CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET;
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || "promo-arc";
const APP_ID = PROJECT_ID;
if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.error("[reconcile] .env 의 VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET 필요");
  process.exit(1);
}

// 백업 파일 경로 결정
const cliArg = process.argv[2];
let backupPath;
if (cliArg) {
  backupPath = resolve(process.cwd(), cliArg);
} else {
  const candidates = readdirSync(ROOT).filter(f => /^prompt-arc-backup-.*\.json$/i.test(f));
  if (candidates.length === 0) {
    console.error("[reconcile] 백업 파일 경로를 인자로 주세요: node scripts/reconcile-prompt-images.mjs <백업.json>");
    process.exit(1);
  }
  candidates.sort();
  backupPath = resolve(ROOT, candidates[candidates.length - 1]);
  console.log(`[reconcile] 자동 감지: ${backupPath}`);
}
if (!existsSync(backupPath)) {
  console.error(`[reconcile] 백업 파일 없음: ${backupPath}`);
  process.exit(1);
}

const raw = readFileSync(backupPath, "utf8");
const parsed = JSON.parse(raw);
const backupPrompts = Array.isArray(parsed)
  ? parsed
  : (Array.isArray(parsed?.prompts) ? parsed.prompts
      : (Array.isArray(parsed?.data) ? parsed.data : null));
if (!backupPrompts) {
  console.error("[reconcile] 백업 형식 오류 (배열 또는 {prompts:[...]} 필요)");
  process.exit(1);
}
console.log(`[reconcile] 백업 프롬프트 수: ${backupPrompts.length}`);
console.log(`[reconcile] Firestore project: ${PROJECT_ID}`);
console.log(`[reconcile] Cloudinary cloud: ${CLOUD_NAME}\n`);

// Firebase Admin 초기화
initializeApp({ credential: cert(KEY_PATH) });
const db = getFirestore();
const promoCol = db
  .collection("artifacts").doc(APP_ID)
  .collection("public").doc("data")
  .collection("prompts");

const isHttpUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
const isDataUrl = (s) => typeof s === "string" && s.startsWith("data:");

async function uploadToCloudinary(value) {
  if (!value) return null;
  if (isHttpUrl(value)) return value; // 이미 URL이면 그대로
  const dataUrl = isDataUrl(value) ? value : `data:image/jpeg;base64,${value}`;
  const formData = new FormData();
  formData.append("file", dataUrl);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cloudinary ${res.status}: ${text.slice(0, 200)}`);
  }
  const j = await res.json();
  return j.secure_url || j.url;
}

// Firestore 직렬화 — 브라우저 코드와 동일하게 nested-array를 stringify + 마커 기록
const NESTED_MARKER = "_nestedKeys";
const isReservedKey = (k) => /^__.+__$/.test(k);
function serializeForFirestore(obj) {
  const out = {};
  const nested = [];
  for (const [k, v] of Object.entries(obj)) {
    if (isReservedKey(k)) continue;
    if (Array.isArray(v) && v.some(x => Array.isArray(x))) {
      out[k] = JSON.stringify(v);
      nested.push(k);
    } else {
      out[k] = v;
    }
  }
  if (nested.length > 0) out[NESTED_MARKER] = nested;
  return out;
}

let processed = 0, updated = 0, skipped = 0, failed = 0, uploadedTotal = 0;

for (const bp of backupPrompts) {
  if (!bp || bp.id == null) { skipped++; continue; }
  if (!Array.isArray(bp.images) || bp.images.length <= 1) { skipped++; continue; }

  processed++;
  const id = String(bp.id);
  console.log(`[${processed}] ${id}  — 백업:${bp.images.length}장`);

  let fsSnap;
  try { fsSnap = await promoCol.doc(id).get(); }
  catch (e) { console.error(`  ❌ Firestore 조회 실패: ${e.message}`); failed++; continue; }
  if (!fsSnap.exists) { console.log("  ⏭️  Firestore 문서 없음"); skipped++; continue; }

  const fs = fsSnap.data();
  const fsImages = Array.isArray(fs.images) ? fs.images : [];
  if (fsImages.length >= bp.images.length) {
    console.log(`  ⏭️  fs:${fsImages.length}장 ≥ backup:${bp.images.length}장 — 보완 불필요`);
    skipped++; continue;
  }

  const startIdx = fsImages.length;
  const missing = bp.images.slice(startIdx);
  console.log(`  🔼 ${missing.length}장 누락 (인덱스 ${startIdx}부터) — Cloudinary 업로드`);

  const uploaded = [];
  for (let i = 0; i < missing.length; i++) {
    try {
      const url = await uploadToCloudinary(missing[i]);
      if (url) {
        uploaded.push(url);
        console.log(`    [${i + 1}/${missing.length}] ✓ ${url.slice(0, 70)}${url.length > 70 ? "..." : ""}`);
      } else {
        console.log(`    [${i + 1}/${missing.length}] ⚠️  업로드 결과 null`);
      }
    } catch (e) {
      console.error(`    [${i + 1}/${missing.length}] ❌ ${e.message}`);
    }
  }
  if (uploaded.length === 0) { console.log("  ❌ 업로드 0장 — 스킵"); failed++; continue; }

  // 새 배열 구성: 앞쪽 N개는 fs 그대로, 뒤에 업로드된 URL append
  const newImages = [...fsImages, ...uploaded];
  const newCount = newImages.length;

  // step 배열 보정: 앞쪽은 fs 우선 (사용자가 편집했을 수 있음), 뒤는 backup
  const fixStep = (key, fallback) => {
    const bpArr = Array.isArray(bp[key]) ? bp[key] : null;
    const fsArr = Array.isArray(fs[key]) ? fs[key] : null;
    if (!bpArr && !fsArr) return undefined;
    const out = [];
    for (let i = 0; i < newCount; i++) {
      if (i < startIdx) {
        out.push(fsArr && fsArr[i] !== undefined ? fsArr[i]
              : bpArr && bpArr[i] !== undefined ? bpArr[i]
              : fallback);
      } else {
        out.push(bpArr && bpArr[i] !== undefined ? bpArr[i] : fallback);
      }
    }
    return out;
  };

  const patch = { images: newImages, updatedAt: Date.now() };
  const sp = fixStep("stepPrompts", "");        if (sp) patch.stepPrompts = sp;
  const sl = fixStep("stepLabels", "");         if (sl) patch.stepLabels = sl;
  const st = fixStep("stepTags", ["기타"]);     if (st) patch.stepTags = st;
  const sk = fixStep("stepKeywords", "");       if (sk) patch.stepKeywords = sk;
  const sd = fixStep("stepDescriptions", "");   if (sd) patch.stepDescriptions = sd;

  const serialized = serializeForFirestore(patch);
  try {
    await promoCol.doc(id).update(serialized);
    console.log(`  ✅ Firestore 업데이트: images ${fsImages.length} → ${newCount}`);
    updated++; uploadedTotal += uploaded.length;
  } catch (e) {
    console.error(`  ❌ Firestore update 실패: ${e.message}`);
    failed++;
  }
}

console.log("\n=================================================");
console.log("[reconcile] 완료");
console.log(`  처리 대상     : ${processed}건 (백업에 images ≥ 2)`);
console.log(`  ✅ 업데이트   : ${updated}건`);
console.log(`  ⏭️  스킵      : ${skipped}건`);
console.log(`  ❌ 실패       : ${failed}건`);
console.log(`  🔼 신규 업로드: ${uploadedTotal}장`);
console.log("=================================================");
process.exit(0);
