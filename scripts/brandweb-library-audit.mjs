import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const db = getFirestore();
const collection = db.collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");

const normPath = value => String(value || "").toLowerCase().replace(/[\\/]+/g, "\\").replace(/\\(?:0?3\.)?디자인\\?$/, "").replace(/\\$/, "").trim();
const normTitle = value => String(value || "").toLowerCase().replace(/^(?:nr_)?20\d{6}_?/, "").replace(/\s+/g, "").trim();
const menuPattern = /(^|[_\s-])(menu|gnb|navi(?:gation)?|nav|open|layer\d*|메뉴|네비|내비)([_\s.-]|$)|메뉴.*(열림|오픈)|(?:열림|오픈).*메뉴|_00(?:(?:_[a-z]{2,4})?_v\d+)?(?:\.[^.]+)?$/i;

const snapshot = await collection.get();
const items = snapshot.docs
  .map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
  .filter(item => item.assetType === "브랜드웹" || item.section === "brandweb");

function duplicateGroups(keyFor) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFor(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()].filter(([, values]) => values.length > 1);
}

const pathDuplicates = duplicateGroups(item => normPath(item.path));
const titleDuplicates = duplicateGroups(item => `${item.game}|${normTitle(item.title)}`);
const sourceDuplicates = duplicateGroups(item => item.sourceProjectId ? `source:${item.sourceProjectId}` : "");
const menuCandidates = [];
const pageUrlOwners = new Map();
for (const item of items) {
  for (const page of item.pages || []) {
    if (page.device === "mobile" && menuPattern.test(page.name || "")) {
      menuCandidates.push({ id: item.id, game: item.game, title: item.title, path: item.path, pageId: page.id, pageName: page.name, url: page.url });
    }
    if (page.url) {
      if (!pageUrlOwners.has(page.url)) pageUrlOwners.set(page.url, []);
      pageUrlOwners.get(page.url).push({ id: item.id, game: item.game, title: item.title, pageId: page.id, pageName: page.name });
    }
  }
}
const duplicatePageUrls = [...pageUrlOwners.entries()]
  .filter(([, owners]) => owners.length > 1)
  .map(([url, owners]) => ({ url, owners }));

const simplify = groups => groups.map(([key, values]) => ({
  key,
  count: values.length,
  items: values.map(item => ({ id: item.id, game: item.game, title: item.title, path: item.path, pageCount: item.pages?.length || item.pageCount || 0, source: item.source || "", created_at: item.created_at || "" })),
}));

console.log(JSON.stringify({
  totalBrandWeb: items.length,
  pathDuplicates: simplify(pathDuplicates),
  titleDuplicates: simplify(titleDuplicates),
  sourceDuplicates: simplify(sourceDuplicates),
  duplicatePageUrls,
  menuCandidates,
}, null, 2));
