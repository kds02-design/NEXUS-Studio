import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const collection = getFirestore().collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");
const versionMatch = page => String(page?.name || "").match(/(?:^|[_-])v([1-9]\d*)(?=[_.-]|$)/i);
const phaseOf = page => Number(versionMatch(page)?.[1] || page?.sourcePhase || 1);
const snapshot = await collection.where("game", "==", "아이온2").get();
const reports = [];
for (const document of snapshot.docs) {
  const data = document.data();
  if (data.assetType !== "브랜드웹" && data.section !== "brandweb") continue;
  const pages = Array.isArray(data.pages) ? data.pages : [];
  if (!pages.length) continue;
  if (!pages.some(page => versionMatch(page))) continue;
  const nextPages = pages.map(page => ({ ...page, sourcePhase: phaseOf(page) }));
  const pcPages = nextPages.filter(page => page.device === "pc");
  const mobilePages = nextPages.filter(page => page.device === "mobile");
  const phaseOnePc = pcPages.filter(page => page.sourcePhase === 1);
  const phaseOneMobile = mobilePages.filter(page => page.sourcePhase === 1);
  const existingMain = pcPages.find(page => page.id === data.mainPageId);
  const versionOnePc = phaseOnePc.find(page => Number(versionMatch(page)?.[1]) === 1);
  const main = versionOnePc || existingMain || phaseOnePc[0] || pcPages[0] || nextPages[0];
  const sub = phaseOnePc.find(page => page.id !== main.id) || pcPages.find(page => page.id !== main.id);
  const existingMobile = mobilePages.find(page => page.url === data.mobile_image);
  const versionOneMobile = phaseOneMobile.find(page => Number(versionMatch(page)?.[1]) === 1);
  const mobileMain = versionOneMobile || existingMobile || phaseOneMobile[0] || mobilePages[0];
  const changed = pages.some((page, index) => Number(page.sourcePhase || 1) !== nextPages[index].sourcePhase)
    || data.mainPageId !== main?.id || data.full_image !== main?.url || data.mobile_image !== (mobileMain?.url || "");
  if (!changed) continue;
  reports.push({ id: document.id, title: data.title, main: main?.name, phase: main?.sourcePhase, sub: sub?.name || "", mobile: mobileMain?.name || "" });
  if (!DRY) await document.ref.update({
    pages: nextPages,
    mainPageId: main?.id || null,
    subPageId: sub?.id || null,
    preview: main?.url || data.preview,
    full_image: main?.url || data.full_image,
    mobile_image: mobileMain?.url || "",
    aion2VersionPhaseUpdatedAt: new Date().toISOString(),
  });
}
console.table(reports);
console.log(`${DRY ? "DRY " : ""}아이온2 v차수 정리 ${reports.length}건`);
