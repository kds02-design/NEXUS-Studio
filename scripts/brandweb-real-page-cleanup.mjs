import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const ARTIFACT = /개발|팝업|popup|(^|[_\s-])(pop|layer\d*|button|state|thumb|thumbnail|menu|gnb|navi(?:gation)?|nav|open|레이어|버튼|상태|메뉴|네비|내비|중앙|폴라로이드|내용)([_\s.-]|$)/i;
const MOBILE_MENU = /_00(?:(?:_[a-z]{2,4})?_v\d+)?(?:\.[^.]+)?$/i;
const MOBILE_MAIN = /_01(?:_v\d+)?(?:\.[^.]+)?$/i;
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const db = getFirestore();
const collection = db.collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");

const logicalPageKey = page => {
  const stem = String(page.name || "").toLowerCase().replace(/\.[^.]+$/, "").replace(/[_-]v\d+$/i, "").replace(/20\d{6}/g, "");
  const numbers = [...stem.matchAll(/(?:^|[_\s-])(\d{1,2})(?=[_\s-]|$)/g)].map(match => Number(match[1]));
  // 상위 페이지 번호 뒤에 상태 번호가 붙은 파일만 하나의 실제 페이지로 축약.
  if (numbers.length < 2) return null;
  return `${page.device}|${page.sourcePhase || 1}|${numbers[0]}`;
};

const snapshot = await collection.get();
const reports = [];
for (const document of snapshot.docs) {
  const data = document.data();
  if (data.assetType !== "브랜드웹" && data.section !== "brandweb") continue;
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const kept = [];
  const removed = [];
  const seenLogical = new Set();
  for (const page of pages) {
    if (ARTIFACT.test(page.name || "") || (page.device === "mobile" && MOBILE_MENU.test(page.name || ""))) {
      removed.push({ name: page.name, reason: "개발/상태 자산" });
      continue;
    }
    const key = logicalPageKey(page);
    if (key && seenLogical.has(key)) {
      removed.push({ name: page.name, reason: "동일 페이지 상태 변형" });
      continue;
    }
    if (key) seenLogical.add(key);
    kept.push(page);
  }
  if (!removed.length || !kept.length) continue;
  const ordered = kept.map((page, index) => ({ ...page, order: index }));
  const pcPages = ordered.filter(page => page.device === "pc");
  const mobilePages = ordered.filter(page => page.device === "mobile").sort((a, b) => Number(MOBILE_MAIN.test(b.name || "")) - Number(MOBILE_MAIN.test(a.name || "")));
  const main = pcPages.find(page => Number(page.sourcePhase || 1) === 1) || pcPages[0] || ordered[0];
  reports.push({ id: document.id, game: data.game, title: data.title, before: pages.length, after: ordered.length, removed });
  if (!DRY) await document.ref.update({
    pages: ordered,
    pageCount: ordered.length,
    preview: main.url,
    full_image: main.url,
    mobile_image: mobilePages[0]?.url || "",
    mainPageId: main.id || null,
    realPagesCleanedAt: new Date().toISOString(),
  });
}

console.log(JSON.stringify(reports, null, 2));
console.log(`${DRY ? "DRY " : ""}정리 카드 ${reports.length}건 · 제외 페이지 ${reports.reduce((sum, report) => sum + report.removed.length, 0)}장`);
