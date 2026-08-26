import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const db = getFirestore();
const collection = db.collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");
const menuPattern = /(^|[_\s-])(menu|gnb|navi(?:gation)?|nav|open|layer\d*|메뉴|네비|내비)([_\s.-]|$)|메뉴.*(열림|오픈)|(?:열림|오픈).*메뉴|_00(?:(?:_[a-z]{2,4})?_v\d+)?(?:\.[^.]+)?$/i;
const mobileMainPattern = /_01(?:_v\d+)?(?:\.[^.]+)?$/i;

const snapshot = await collection.get();
const changes = [];
for (const document of snapshot.docs) {
  const data = document.data();
  if (data.assetType !== "브랜드웹" && data.section !== "brandweb") continue;
  const patch = {};

  // 반복 발행되는 아이온2 LOOKBOOK은 공유 경로의 날짜를 제목에 포함해 서로 구분.
  if (data.game === "아이온2" && /^DEVA LOOKBOOK$/i.test(String(data.title || "").trim())) {
    const date = String(data.path || "").match(/[\\/](20\d{6})_DEVA LOOKBOOK/i)?.[1];
    if (date) patch.title = `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)} DEVA LOOKBOOK`;
  }

  // 모바일 메뉴가 펼쳐진 별도 캡처 페이지 제거.
  const originalPages = Array.isArray(data.pages) ? data.pages : [];
  const pages = originalPages.filter(page => {
    if (page.device === "pc" && /^m_/i.test(page.name || "")) return false;
    if (page.device === "mobile" && menuPattern.test(page.name || "")) return false;
    return true;
  });
  const preferredMobile = pages
    .filter(page => page.device === "mobile")
    .sort((a, b) => Number(mobileMainPattern.test(b.name || "")) - Number(mobileMainPattern.test(a.name || "")))[0];
  const shouldReplaceMobile = Boolean(preferredMobile?.url && preferredMobile.url !== data.mobile_image);
  if ((pages.length !== originalPages.length || shouldReplaceMobile) && pages.length > 0) {
    const ordered = pages.map((page, index) => ({ ...page, order: index }));
    const pcPages = ordered.filter(page => page.device === "pc");
    const mobilePages = ordered.filter(page => page.device === "mobile").sort((a, b) => Number(mobileMainPattern.test(b.name || "")) - Number(mobileMainPattern.test(a.name || "")));
    const first = pcPages[0] || mobilePages[0];
    Object.assign(patch, {
      pages: ordered,
      pageCount: ordered.length,
      preview: first.url,
      full_image: pcPages[0]?.url || first.url,
      mobile_image: preferredMobile?.url || mobilePages[0]?.url || "",
    });
  }

  if (Object.keys(patch).length) {
    changes.push({ id: document.id, beforeTitle: data.title, afterTitle: patch.title || data.title, removedPages: originalPages.length - pages.length });
    if (!DRY) await document.ref.update(patch);
  }
}

console.table(changes);
console.log(`${DRY ? "DRY " : ""}변경 대상 ${changes.length}건 · 제거 페이지 ${changes.reduce((sum, item) => sum + item.removedPages, 0)}장`);
