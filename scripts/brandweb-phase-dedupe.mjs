import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const HASH_THRESHOLD = 10;
const MOBILE_MAIN = /_01(?:_v\d+)?(?:\.[^.]+)?$/i;
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const db = getFirestore();
const collection = db.collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");

async function differenceHash(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`이미지 다운로드 실패 ${response.status}`);
  const image = await loadImage(Buffer.from(await response.arrayBuffer()));
  const canvas = createCanvas(9, 8);
  const context = canvas.getContext("2d");
  // 메인 구조 비교가 목적이므로 전체 이미지를 9x8로 축소해 명암 배치를 비교.
  context.drawImage(image, 0, 0, 9, 8);
  const pixels = context.getImageData(0, 0, 9, 8).data;
  let bits = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = (pixels[(y * 9 + x) * 4] * 299 + pixels[(y * 9 + x) * 4 + 1] * 587 + pixels[(y * 9 + x) * 4 + 2] * 114) / 1000;
      const right = (pixels[(y * 9 + x + 1) * 4] * 299 + pixels[(y * 9 + x + 1) * 4 + 1] * 587 + pixels[(y * 9 + x + 1) * 4 + 2] * 114) / 1000;
      bits += left > right ? "1" : "0";
    }
  }
  return bits;
}

const hamming = (a, b) => {
  let distance = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) distance++;
  return distance + Math.abs(a.length - b.length);
};

const snapshot = await collection.get();
const merged = snapshot.docs
  .map(document => ({ id: document.id, ref: document.ref, ...document.data() }))
  .filter(item => Array.isArray(item.mergedPhases) && item.mergedPhases.length > 1 && Array.isArray(item.pages) && !item.phaseDedupedAt);

const reports = [];
for (const item of merged) {
  const pagesWithHash = [];
  for (const page of item.pages) {
    try { pagesWithHash.push({ ...page, hash: await differenceHash(page.url) }); }
    catch (error) { pagesWithHash.push({ ...page, hash: null, hashError: error.message }); }
  }

  const kept = [];
  const removed = [];
  for (const device of ["pc", "mobile"]) {
    const devicePages = pagesWithHash.filter(page => page.device === device);
    const phaseOne = devicePages.filter(page => Number(page.sourcePhase || 1) === 1);
    const later = devicePages.filter(page => Number(page.sourcePhase || 1) > 1);
    kept.push(...phaseOne);
    for (let index = 0; index < later.length; index++) {
      const page = later[index];
      // 2차의 첫 페이지는 메인 페이지로 간주하고 항상 제외.
      if (index === 0) {
        removed.push({ ...page, reason: "2차 메인" });
        continue;
      }
      const match = page.hash && phaseOne
        .filter(candidate => candidate.hash)
        .map(candidate => ({ candidate, distance: hamming(page.hash, candidate.hash) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (match && match.distance <= HASH_THRESHOLD) removed.push({ ...page, reason: `1차 유사(${match.distance})`, duplicateOf: match.candidate.name });
      else kept.push(page);
    }
  }
  kept.push(...pagesWithHash.filter(page => page.device !== "pc" && page.device !== "mobile"));
  const ordered = kept.map(({ hash: _hash, hashError: _hashError, ...page }, index) => ({ ...page, order: index }));
  reports.push({ game: item.game, title: item.title, before: item.pages.length, after: ordered.length, removed: removed.map(page => `${page.device}:${page.name} [${page.reason}]`) });

  if (!DRY && removed.length) {
    const pcPages = ordered.filter(page => page.device === "pc");
    const mobilePages = ordered.filter(page => page.device === "mobile").sort((a, b) => Number(MOBILE_MAIN.test(b.name || "")) - Number(MOBILE_MAIN.test(a.name || "")));
    const main = pcPages.find(page => Number(page.sourcePhase || 1) === 1) || pcPages[0] || ordered[0];
    await item.ref.update({
      pages: ordered,
      pageCount: ordered.length,
      preview: main.url,
      full_image: main.url,
      mobile_image: mobilePages[0]?.url || "",
      mainPageId: main.id || null,
      phaseDedupedAt: new Date().toISOString(),
    });
  }
}

console.log(JSON.stringify(reports, null, 2));
console.log(`${DRY ? "DRY " : ""}병합 카드 ${merged.length}건 · 제거 후보 ${reports.reduce((sum, report) => sum + report.removed.length, 0)}장`);
