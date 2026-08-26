// 2026 브랜드웹 공유 폴더 → Nexus Brand Web Library 자동 등록.
// 실행: node scripts/brandweb-library-sync.mjs --dry
//       node scripts/brandweb-library-sync.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "banner-codex-sync.config.json"), "utf8"));
const DRY = process.argv.includes("--dry");
const RESCAN_AION2 = process.argv.includes("--rescan-aion2-non-lookbook");
const YEAR = "2026";
const THROUGH = "20260820";
const MAX_PAGES_PER_DEVICE = 10;
const ALLOWED = /\.(jpe?g|png)$/i;
const EXCLUDED_SEGMENT = /^(old|backup|bak|banner|crop|m_crop|thumb|thumbnail|개발|팝업|popup)$/i;
const EXCLUDED_FILE = /개발|팝업|popup|(^|[_\s-])(pop|layer\d*|button|state|thumb|thumbnail|menu|gnb|navi(?:gation)?|nav|open|레이어|버튼|상태|메뉴|네비|내비|중앙|폴라로이드|내용)([_\s.-]|$)/i;
const MOBILE_MENU_SUFFIX = /_00(?:(?:_[a-z]{2,4})?_v\d+)?(?=\.[^.]+$)/i;
const MOBILE_MAIN_SUFFIX = /_01(?:_v\d+)?(?=\.[^.]+$)/i;

function preferMobileMain(pages) {
  return [...pages].sort((a, b) => Number(MOBILE_MAIN_SUFFIX.test(b.name || "")) - Number(MOBILE_MAIN_SUFFIX.test(a.name || "")));
}
function aion2Phase(file) {
  return Number(file?.relativeSegments?.map(segment => segment.match(/^v([1-9]\d*)$/i)?.[1]).find(Boolean)
    || file?.name?.match(/[_-]v([1-9]\d*)(?=\.[^.]+$)/i)?.[1]
    || 1);
}
function aion2ExplicitPhase(file) {
  const folderPhase = file?.relativeSegments?.map(segment => segment.match(/^v([1-9]\d*)$/i)?.[1]).find(Boolean);
  const filePhase = file?.name?.match(/[_-]v([1-9]\d*)(?=\.[^.]+$)/i)?.[1];
  return folderPhase || filePhase ? Number(folderPhase || filePhase) : null;
}
const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (message) => console.log(`[${stamp()}] ${message}`);

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}
const CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET;
if (!DRY && (!CLOUD_NAME || !PRESET)) throw new Error("Cloudinary 환경 변수가 없습니다.");

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const db = getFirestore();
const promoCol = db.collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");

const normalizeTitle = (value) => String(value || "").replace(/\s+/g, "").toLowerCase();
const normalizePath = (value) => String(value || "").replace(/[\\/]+/g, "\\").toLowerCase().replace(/\\$/, "");
const campaignDate = (name) => name.match(/^(?:[A-Za-z]+_)?(20\d{6})_/)?.[1] || null;
const cleanTitle = (name) => name.replace(/^(?:[A-Za-z]+_)?20\d{6}_\s*/, "").trim() || name;

function findDesignDir(campaignDir) {
  return fs.readdirSync(campaignDir, { withFileTypes: true })
    .find(entry => entry.isDirectory() && /^(?:0?3\.)?\s*디자인$/i.test(entry.name.trim()));
}

function versionInfo(name, game) {
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  const match = game === "아이온2" ? null : stem.match(/^(.*?)(?:[_-]v(\d+))$/i);
  return { key: (match?.[1] || stem).toLowerCase(), version: Number(match?.[2] || 0) };
}

function collectDeviceFiles(designDir, device, game) {
  const deviceDir = fs.readdirSync(designDir, { withFileTypes: true })
    .find(entry => entry.isDirectory() && (device === "pc" ? /^(pc|web)$/i : /^(mo|mobile|m)$/i).test(entry.name.trim()));
  if (!deviceDir) return [];
  const root = path.join(designDir, deviceDir.name);
  const candidates = [];
  const walk = (dir, relativeSegments = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (EXCLUDED_SEGMENT.test(entry.name.trim())) continue;
      // NCK/NCT가 함께 있으면 한국 서비스용 NCK만 사용.
      if (/^NCT$/i.test(entry.name.trim())) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute, [...relativeSegments, entry.name]);
      else if (entry.isFile() && ALLOWED.test(entry.name) && !EXCLUDED_FILE.test(entry.name) && !(device === "pc" && /^m_/i.test(entry.name)) && !(device === "mobile" && MOBILE_MENU_SUFFIX.test(entry.name)) && fs.statSync(absolute).size > 0) {
        candidates.push({ absolute, name: entry.name, relativeSegments });
      }
    }
  };
  walk(root);

  // 같은 논리 페이지의 _vN 파일은 가장 높은 버전만 유지.
  const latest = new Map();
  for (const file of candidates) {
    const info = versionInfo(file.name, game);
    const locale = file.relativeSegments.map(s => s.toLowerCase()).join("/");
    const key = `${locale}|${info.key}`;
    const current = latest.get(key);
    if (!current || info.version > current.version) latest.set(key, { ...file, version: info.version, sortKey: info.key });
  }
  const sorted = [...latest.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey, "ko", { numeric: true }));
  const seenPages = new Set();
  return sorted.filter(file => {
    const phase = game === "아이온2" ? String(aion2Phase(file)) : (file.absolute.match(/_([1-9]\d*)차(?:[\\/]|_)/)?.[1] || "1");
    const stem = file.name.toLowerCase().replace(/\.[^.]+$/, "").replace(game === "아이온2" ? /$^/ : /[_-]v\d+$/i, "").replace(/20\d{6}/g, "");
    const numbers = [...stem.matchAll(/(?:^|[_\s-])(\d{1,2})(?=[_\s-]|$)/g)].map(match => Number(match[1]));
    if (numbers.length < 2) return true;
    const key = `${phase}|${numbers[0]}`;
    if (seenPages.has(key)) return false;
    seenPages.add(key);
    return true;
  });
}

function sampleEvenly(files, limit) {
  if (files.length <= limit) return files;
  if (limit <= 1) return files.slice(0, Math.max(0, limit));
  const indexes = new Set();
  for (let i = 0; i < limit; i++) indexes.add(Math.round((i * (files.length - 1)) / (limit - 1)));
  return [...indexes].sort((a, b) => a - b).map(index => files[index]);
}

function limitPages(pc, mobile) {
  return {
    pc: sampleEvenly(pc, MAX_PAGES_PER_DEVICE),
    mobile: sampleEvenly(preferMobileMain(mobile), MAX_PAGES_PER_DEVICE),
  };
}

function scanCampaign(campaignDir, game) {
  const designEntry = findDesignDir(campaignDir);
  if (!designEntry) return null;
  const designDir = path.join(campaignDir, designEntry.name);
  const collectedPc = collectDeviceFiles(designDir, "pc", game);
  const collectedMobile = collectDeviceFiles(designDir, "mobile", game);
  if (game === "아이온2") {
    const score = file => (aion2Phase(file) === 1 ? 100 : 0) + (/(?:^|[_-])1메인(?=[_.-]|$)|main|메인/i.test(file.name) ? 20 : 0);
    collectedPc.sort((a, b) => score(b) - score(a));
    collectedMobile.sort((a, b) => score(b) - score(a));
  }
  const { pc, mobile } = limitPages(collectedPc, collectedMobile);
  return { designDir, pc, mobile, pages: [...pc.map(file => ({ ...file, device: "pc" })), ...mobile.map(file => ({ ...file, device: "mobile" }))] };
}

async function processImage(filePath, isMobile) {
  const image = await loadImage(filePath);
  if (!image.width || !image.height) throw new Error("이미지 디코딩 실패");
  const targetW = isMobile ? 750 : 1920;
  const scale = Math.min(1, targetW / image.width);
  const outputW = Math.max(1, Math.round(image.width * scale));
  const outputH = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(outputW, outputH);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, outputW, outputH);
  return canvas.toBuffer("image/jpeg", 90);
}

async function uploadCloudinary(buffer) {
  const form = new FormData();
  form.append("file", `data:image/jpeg;base64,${buffer.toString("base64")}`);
  form.append("upload_preset", PRESET);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Cloudinary ${response.status}: ${(await response.text()).slice(0, 160)}`);
  return (await response.json()).secure_url;
}

const snapshot = await promoCol.get();
const existingKeys = new Set();
const existingPaths = new Set();
const existingDocsByPath = new Map();
const ownerCounts = {};
const cleanupTasks = [];
snapshot.forEach(document => {
  const data = document.data();
  if (data.assetType !== "브랜드웹" && data.section !== "brandweb") return;
  if (data.source === "brandweb-library-sync" && Array.isArray(data.pages)) {
    const pages = data.pages.filter(page => !EXCLUDED_FILE.test(page?.name || "") && !(page?.device === "mobile" && MOBILE_MENU_SUFFIX.test(page?.name || "")));
    if (pages.length !== data.pages.length && pages.length > 0) cleanupTasks.push({ ref: document.ref, data, pages });
  }
  existingKeys.add(`${data.game}|${normalizeTitle(data.title)}`);
  if (data.path) {
    existingPaths.add(normalizePath(data.path));
    existingDocsByPath.set(normalizePath(data.path), { ref: document.ref, data });
  }
  for (const sourcePath of data.sourcePaths || []) {
    existingPaths.add(normalizePath(sourcePath));
    existingDocsByPath.set(normalizePath(sourcePath), { ref: document.ref, data });
  }
  if (data.ownerUid) ownerCounts[data.ownerUid] = (ownerCounts[data.ownerUid] || 0) + 1;
});
if (!DRY && !RESCAN_AION2) {
  for (const task of cleanupTasks) {
    const pcPages = task.pages.filter(page => page.device === "pc");
    const mobilePages = preferMobileMain(task.pages.filter(page => page.device === "mobile"));
    const first = pcPages[0] || mobilePages[0];
    await task.ref.update({
      pages: task.pages.map((page, index) => ({ ...page, order: index })),
      pageCount: task.pages.length,
      preview: first.url,
      full_image: pcPages[0]?.url || first.url,
      mobile_image: mobilePages[0]?.url || "",
    });
    log(`정리 완료: ${task.data.game}/${task.data.title} (${task.data.pages.length} → ${task.pages.length}장)`);
  }
}
const ownerUid = Object.entries(ownerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "brandweb-sync";

let found = 0;
let registered = 0;
let skipped = 0;
let failed = 0;
let totalPages = 0;
const report = [];

for (const target of CONFIG.targets) {
  if (!target.share || !/브랜드웹/.test(target.share)) continue;
  if (RESCAN_AION2 && target.game !== "아이온2") continue;
  const shareDir = target.share.replaceAll("{year}", YEAR);
  const pathPrefix = target.pathPrefix.replaceAll("{year}", YEAR);
  let campaigns = [];
  try { campaigns = fs.readdirSync(shareDir, { withFileTypes: true }).filter(entry => entry.isDirectory()); }
  catch (error) { log(`[${target.game}] 공유 폴더 접근 실패: ${error.message}`); continue; }

  for (const campaign of campaigns) {
    if (/복사본|copy/i.test(campaign.name)) continue;
    if (RESCAN_AION2 && /(?:DAEVA|DEVA|DAIVA)\s*LOOKBOOK|데바\s*룩북/i.test(campaign.name)) continue;
    const date = campaignDate(campaign.name);
    if (!date || date.slice(0, 4) !== YEAR || date > THROUGH) continue;
    const title = cleanTitle(campaign.name);
    const canonicalPath = `${pathPrefix}\\${campaign.name}\\03.디자인`;
    const existingDoc = existingDocsByPath.get(normalizePath(canonicalPath));
    found++;
    // 같은 제목의 월간/차수 캠페인이 존재하므로 브랜드웹 중복은 전체 공유 경로로만 판정.
    if (!RESCAN_AION2 && existingPaths.has(normalizePath(canonicalPath))) {
      skipped++;
      report.push({ game: target.game, campaign: campaign.name, status: "기존 등록" });
      continue;
    }
    if (RESCAN_AION2 && !existingDoc) {
      skipped++;
      report.push({ game: target.game, campaign: campaign.name, status: "기존 카드 없음" });
      continue;
    }

    try {
      let scanned;
      if (RESCAN_AION2) {
        const sourcePaths = [...new Set([existingDoc.data.path, ...(existingDoc.data.sourcePaths || [])].filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
        if (normalizePath(canonicalPath) !== normalizePath(sourcePaths[0])) {
          skipped++;
          report.push({ game: target.game, campaign: campaign.name, status: "병합 카드의 첫 경로에서 처리" });
          continue;
        }
        const combinedPc = [];
        const combinedMobile = [];
        for (const sourcePath of sourcePaths) {
          const sourceScan = scanCampaign(path.dirname(sourcePath), target.game);
          if (!sourceScan) continue;
          const campaignPhase = Number(sourcePath.match(/_([1-9]\d*)차(?:[\\/]|_)/)?.[1] || 1);
          combinedPc.push(...sourceScan.pc.map(file => ({ ...file, sourcePhase: aion2ExplicitPhase(file) || campaignPhase })));
          combinedMobile.push(...sourceScan.mobile.map(file => ({ ...file, sourcePhase: aion2ExplicitPhase(file) || campaignPhase })));
        }
        const score = file => (Number(file.sourcePhase || 1) === 1 ? 100 : 0) + (/(?:^|[_-])1메인(?=[_.-]|$)|main|메인/i.test(file.name) ? 20 : 0);
        combinedPc.sort((a, b) => score(b) - score(a));
        combinedMobile.sort((a, b) => score(b) - score(a));
        const limited = limitPages(combinedPc, combinedMobile);
        scanned = { pc: limited.pc, mobile: limited.mobile, pages: [...limited.pc.map(file => ({ ...file, device: "pc" })), ...limited.mobile.map(file => ({ ...file, device: "mobile" }))] };
      } else {
        scanned = scanCampaign(path.join(shareDir, campaign.name), target.game);
      }
      if (!scanned?.pages.length) {
        skipped++;
        report.push({ game: target.game, campaign: campaign.name, status: "페이지 없음" });
        continue;
      }
      totalPages += scanned.pages.length;
      if (DRY) {
        registered++;
        report.push({ game: target.game, campaign: campaign.name, pc: scanned.pc.length, mobile: scanned.mobile.length, status: RESCAN_AION2 ? "재스캔 예정" : "등록 예정" });
        continue;
      }

      const pages = [];
      for (let index = 0; index < scanned.pages.length; index++) {
        const page = scanned.pages[index];
        log(`  [${target.game}/${campaign.name}] ${index + 1}/${scanned.pages.length} ${page.device} ${page.name}`);
        const buffer = await processImage(page.absolute, page.device === "mobile");
        const url = await uploadCloudinary(buffer);
        const sourcePhase = target.game === "아이온2" ? Number(page.sourcePhase || aion2Phase(page)) : 1;
        pages.push({ id: `page_${Date.now()}_${index}`, name: page.name, device: page.device, sourcePhase, url, order: index });
      }
      const pcPages = pages.filter(page => page.device === "pc");
      const mobilePages = preferMobileMain(pages.filter(page => page.device === "mobile"));
      const first = pcPages[0] || mobilePages[0];
      const phaseOnePc = pcPages.filter(page => Number(page.sourcePhase || 1) === 1);
      const main = phaseOnePc.find(page => /(?:^|[_-])1메인(?=[_.-]|$)|main|메인/i.test(page.name || "")) || phaseOnePc[0] || pcPages[0] || first;
      const sub = phaseOnePc.find(page => page.id !== main?.id) || pcPages.find(page => page.id !== main?.id);
      const payload = {
        title: RESCAN_AION2 ? existingDoc.data.title : title,
        assetType: "브랜드웹",
        game: target.game,
        year: YEAR,
        path: RESCAN_AION2 ? (existingDoc.data.path || canonicalPath) : canonicalPath,
        section: "brandweb",
        preview: main?.url || first.url,
        full_image: main?.url || first.url,
        mobile_image: mobilePages[0]?.url || "",
        pages,
        pageCount: pages.length,
        mainPageId: main?.id || null,
        subPageId: sub?.id || null,
        ownerUid: RESCAN_AION2 ? (existingDoc.data.ownerUid || ownerUid) : ownerUid,
        source: "brandweb-library-sync",
        ...(RESCAN_AION2 ? { aion2RescannedAt: new Date().toISOString() } : {
          created_at: new Date().toISOString(), visibility: "public", liked: 0, tags: [], history: [],
        }),
      };
      if (RESCAN_AION2) await existingDoc.ref.update(payload);
      else await promoCol.add(payload);
      existingPaths.add(normalizePath(canonicalPath));
      registered++;
      report.push({ game: target.game, campaign: campaign.name, pc: pcPages.length, mobile: mobilePages.length, status: RESCAN_AION2 ? "재스캔 완료" : "등록 완료" });
    } catch (error) {
      failed++;
      report.push({ game: target.game, campaign: campaign.name, status: `실패: ${error.message}` });
    }
  }
}

console.table(report);
log(`${DRY ? "DRY " : ""}완료 — 대상 ${found}, 등록 ${registered}, 기존/제외 ${skipped}, 실패 ${failed}, 신규 페이지 ${totalPages}`);
if (!DRY && !failed && !RESCAN_AION2) {
  const cleanup = spawnSync(process.execPath, [path.join(ROOT, "scripts", "brandweb-phase-cleanup.mjs")], { stdio: "inherit" });
  if (cleanup.status !== 0) {
    console.error("[brandweb-sync] 차수 병합 정리 실패");
    process.exitCode = 1;
  }
}
if (failed) process.exitCode = 1;
