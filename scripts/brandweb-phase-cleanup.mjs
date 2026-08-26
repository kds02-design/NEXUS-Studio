import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const MAX_PAGES_PER_DEVICE = 10;
const MOBILE_MAIN = /_01(?:_v\d+)?(?:\.[^.]+)?$/i;
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const db = getFirestore();
const collection = db.collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");

const campaignFolder = value => {
  const segments = String(value || "").split(/[\\/]/).filter(Boolean);
  const designIndex = segments.findIndex(segment => /^(?:0?3\.)?\s*디자인$/i.test(segment));
  return designIndex > 0 ? segments[designIndex - 1] : "";
};
const phaseInfo = folder => {
  const withoutDate = folder.replace(/^(?:[A-Za-z]+_)?20\d{6}_\s*/, "").trim();
  const match = withoutDate.match(/^(.*?)_([1-9]\d*)차$/);
  if (!match) return null;
  return { series: match[1].trim(), key: match[1].replace(/\s+/g, "").toLowerCase(), phase: Number(match[2]) };
};
const sampleEvenly = (values, limit) => {
  if (values.length <= limit) return values;
  const indexes = new Set();
  for (let i = 0; i < limit; i++) indexes.add(Math.round((i * (values.length - 1)) / (limit - 1)));
  return [...indexes].sort((a, b) => a - b).map(index => values[index]);
};
const limitPages = pages => {
  const unique = [...new Map(pages.filter(page => page?.url).map(page => [page.url, page])).values()];
  const pc = unique.filter(page => page.device === "pc");
  const mobile = unique.filter(page => page.device === "mobile");
  return [...sampleEvenly(pc, MAX_PAGES_PER_DEVICE), ...sampleEvenly(mobile, MAX_PAGES_PER_DEVICE)];
};

const snapshot = await collection.get();
const items = snapshot.docs
  .map(document => ({ id: document.id, ref: document.ref, ...document.data() }))
  .filter(item => item.assetType === "브랜드웹" || item.section === "brandweb");

const groups = new Map();
for (const item of items) {
  const folder = campaignFolder(item.path);
  const info = phaseInfo(folder);
  if (!info) continue;
  const key = `${item.game}|${info.key}`;
  if (!groups.has(key)) groups.set(key, { game: item.game, series: info.series, items: [] });
  groups.get(key).items.push({ ...item, folder, phase: info.phase });
}

const merges = [...groups.values()]
  .filter(group => group.items.some(item => item.phase === 1) && group.items.some(item => item.phase > 1))
  .map(group => ({ ...group, items: group.items.sort((a, b) => a.phase - b.phase) }));

console.table(merges.map(group => ({
  game: group.game,
  series: group.series,
  phases: group.items.map(item => `${item.phase}차`).join(" + "),
  cards: group.items.length,
  sourcePages: group.items.reduce((sum, item) => sum + (item.pages?.length || 0), 0),
  resultPages: limitPages(group.items.flatMap(item => item.pages || [])).length,
})));
console.log(`병합 대상 ${merges.length}개 시리즈${DRY ? " [DRY]" : ""}`);

if (!DRY) {
  for (const group of merges) {
    const primary = group.items.find(item => item.phase === 1);
    const secondary = group.items.filter(item => item.id !== primary.id);
    const pages = limitPages(group.items.flatMap(item => (item.pages || []).map(page => ({ ...page, sourcePhase: item.phase }))))
      .map((page, index) => ({ ...page, order: index }));
    const mobilePages = pages.filter(page => page.device === "mobile").sort((a, b) => Number(MOBILE_MAIN.test(b.name || "")) - Number(MOBILE_MAIN.test(a.name || "")));
    const main = (primary.pages || []).find(page => page.device === "pc") || pages.find(page => page.device === "pc") || pages[0];
    const sourcePaths = [...new Set(group.items.flatMap(item => [item.path, ...(item.sourcePaths || [])]).filter(Boolean))];
    await primary.ref.update({
      title: group.series,
      pages,
      pageCount: pages.length,
      preview: main.url,
      full_image: main.url,
      mobile_image: mobilePages[0]?.url || "",
      mainPageId: main.id || null,
      subPageId: null,
      sourcePaths,
      mergedPhases: group.items.map(item => item.phase),
      mergedAt: new Date().toISOString(),
    });
    for (const item of secondary) await item.ref.delete();
  }
  if (merges.length) {
    const dedupe = spawnSync(process.execPath, [path.join(ROOT, "scripts", "brandweb-phase-dedupe.mjs")], { stdio: "inherit" });
    if (dedupe.status !== 0) process.exitCode = 1;
  }
}
