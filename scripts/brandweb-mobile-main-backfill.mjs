import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");
const ALLOWED = /\.(jpe?g|png)$/i;
const MOBILE_DIR = /^(mo|mobile|m)$/i;
const MENU_FILE = /_00(?:(?:_[a-z]{2,4})?_v\d+)?(?=\.[^.]+$)/i;
const ARTIFACT = /개발|팝업|popup|(^|[_\s-])(pop|layer\d*|button|state|thumb|thumbnail|menu|gnb|navi(?:gation)?|nav|open|레이어|버튼|상태|메뉴|네비|내비|중앙|폴라로이드|내용)([_\s.-]|$)/i;
const MAX_MOBILE = 10;

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}
if (!DRY && (!env.VITE_CLOUDINARY_CLOUD_NAME || !env.VITE_CLOUDINARY_UPLOAD_PRESET)) throw new Error("Cloudinary 환경 변수가 없습니다.");

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const collection = getFirestore().collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");

const normalizeName = value => String(value || "").toLowerCase().replace(/\.[^.]+$/, "").replace(/[_-]v\d+$/i, "");
const version = value => Number(String(value || "").match(/[_-]v(\d+)(?=\.[^.]+$)/i)?.[1] || 0);
const isMobileMain = value => {
  const stem = String(value || "").replace(/\.[^.]+$/, "");
  if (/(?:^|[_\s-])(main|메인)(?=[_\s.-]|$)/i.test(stem)) return true;
  const mobileMarker = stem.match(/(?:모바일|mobile)/i);
  const hasShortMobileMarker = /(?:^|[_-])m_(?=[^_])/i.test(stem);
  if (!mobileMarker && !hasShortMobileMarker) return false;
  const afterMarker = mobileMarker ? stem.slice(mobileMarker.index + mobileMarker[0].length) : stem.slice(stem.search(/(?:^|[_-])m_/i) + 2);
  const cleaned = afterMarker.replace(/20\d{6}/g, "").replace(/\d+차/g, "");
  const pageNumbers = [...cleaned.matchAll(/(?:^|[_\s-])(\d{1,2})(?=[_\s.-]|$)/g)].map(match => Number(match[1]));
  return pageNumbers[0] === 1;
};

function collectMainCandidates(designPath) {
  if (!designPath || !fs.existsSync(designPath)) return [];
  const mobileRoots = [];
  const findMobileDirs = (dir, depth = 0) => {
    if (depth > 4) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || /^(old|backup|bak|crop|m_crop|thumb|thumbnail|개발)$/i.test(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      if (MOBILE_DIR.test(entry.name.trim())) mobileRoots.push(absolute);
      else findMobileDirs(absolute, depth + 1);
    }
  };
  findMobileDirs(designPath);
  const files = [];
  const walkFiles = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory() && !/^(old|backup|bak|crop|m_crop|thumb|thumbnail|개발|NCT)$/i.test(entry.name)) walkFiles(absolute);
      else if (entry.isFile() && ALLOWED.test(entry.name) && isMobileMain(entry.name) && !MENU_FILE.test(entry.name) && !ARTIFACT.test(entry.name) && !/(?:^|[_-])(NCT|TW)(?:[_-]|$)/i.test(entry.name)) files.push({ absolute, name: entry.name });
    }
  };
  for (const mobileRoot of mobileRoots) walkFiles(mobileRoot);
  const latest = new Map();
  for (const file of files) {
    const key = normalizeName(file.name);
    if (!latest.has(key) || version(file.name) > version(latest.get(key).name)) latest.set(key, file);
  }
  return [...latest.values()].sort((a, b) => {
    const score = file => (/1차/i.test(file.absolute) ? 100 : 0) + (/(?:^|[_-])(NCK|KR)(?:[_-]|$)/i.test(file.name) ? 20 : 0) - (/(?:^|[_-])RU(?:[_-]|$)/i.test(file.name) ? 5 : 0);
    return score(b) - score(a) || a.name.localeCompare(b.name, "ko", { numeric: true });
  });
}

async function processImage(filePath) {
  const image = await loadImage(filePath);
  const scale = Math.min(1, 750 / image.width);
  const canvas = createCanvas(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toBuffer("image/jpeg", 90);
}

async function upload(buffer) {
  const form = new FormData();
  form.append("file", `data:image/jpeg;base64,${buffer.toString("base64")}`);
  form.append("upload_preset", env.VITE_CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Cloudinary ${response.status}`);
  return (await response.json()).secure_url;
}

const snapshot = await collection.get();
const reports = [];
for (const document of snapshot.docs) {
  const data = document.data();
  if (data.assetType !== "브랜드웹" && data.section !== "brandweb") continue;
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const existingMobilePages = pages.filter(page => page.device === "mobile");
  if (existingMobilePages.some(page => isMobileMain(page.name))) continue;
  const existingNames = new Set(existingMobilePages.map(page => normalizeName(page.name)));
  const sourcePaths = [...new Set([data.path, ...(data.sourcePaths || [])].filter(Boolean))];
  const candidates = sourcePaths.flatMap(sourcePath => {
    try { return collectMainCandidates(sourcePath); } catch { return []; }
  });
  const candidate = candidates.find(file => !existingNames.has(normalizeName(file.name)));
  if (!candidate) continue;
  reports.push({ id: document.id, game: data.game, title: data.title, file: candidate.name, source: candidate.absolute });
  if (DRY) continue;
  const url = await upload(await processImage(candidate.absolute));
  const pcPages = pages.filter(page => page.device === "pc");
  const mobilePages = pages.filter(page => page.device === "mobile");
  const newPage = { id: `m_main_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: candidate.name, device: "mobile", url, order: pcPages.length, sourcePhase: 1, confirmedAt: null, noteCount: 0 };
  const nextMobile = [newPage, ...mobilePages].slice(0, MAX_MOBILE);
  const nextPages = [...pcPages, ...nextMobile].map((page, order) => ({ ...page, order }));
  await document.ref.update({ pages: nextPages, pageCount: nextPages.length, mobile_image: url, mobileMainBackfilledAt: new Date().toISOString() });
}
console.table(reports.map(({ source, ...report }) => report));
console.log(`${DRY ? "DRY " : ""}모바일 메인 추가 대상 ${reports.length}건`);
