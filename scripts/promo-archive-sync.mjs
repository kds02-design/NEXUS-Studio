// 브랜드웹 라이브러리(PromotionArchive) 프로모션 자동 등록 — 네트워크 공유의
// 프로모션 캠페인 폴더를 스캔해 새 캠페인을 promotion-banners 컬렉션에 등록한다.
//
// 앱(handleUpload)과 동일 규칙:
//   캠페인 폴더\03.디자인\{pc|web} · {mo|mobile|m} 의 "직속 자식" jpg/png 중 가장 큰 파일 각 1개
//   블랙리스트: 개발/팝업/popup/Thumbs.db/dotfile · PC 1920 폭 정규화(넘치면 중앙 크롭, 모자라면 블랙 패드)
//   모바일 750 폭 · detail q90 / thumbnail 800w q85 → Cloudinary → Firestore doc
//   중복: 같은 game + title(공백 제거) 이미 있으면 스킵 (앱과 동일) + 캠페인 폴더 path 매치도 스킵
//
// 대상: banner-codex-sync.config.json 의 targets[].promoShare (promoMinDate 이후 캠페인 폴더)
// 실행: node scripts/promo-archive-sync.mjs [--dry]   (주간 스케줄: banner-codex-sync.cmd 가 함께 실행)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createCanvas, loadImage } from "@napi-rs/canvas";
// 앱과 동일한 평가 로직 (인트로 템플릿·기준 포맷터·앵커 few-shot·보정) — firebase 스텁 번들.
// 재생성: node scripts/build-promo-eval-bundle.mjs
import {
  CRITERIA_TYPES, getIntroTemplateFor, formatCriteriaList, weightsMap, applyOffset,
  buildAnchorFewShot, formatAnchorsForPrompt, getSeedCriteria, getSeedRules,
} from "./promo-eval.bundle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "banner-codex-sync.config.json"), "utf8"));
const DRY = process.argv.includes("--dry");
const BRANDWEB_EVAL = process.argv.includes("--brandweb-eval");
const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (msg) => console.log(`[${stamp()}] ${msg}`);

const EXCLUDE_REGEX = /개발|팝업|popup|Thumbs\.db|^\./i;
const ALLOWED_EXT = /\.(jpe?g|png)$/i;
const MAX_BYTES = 50 * 1024 * 1024;

// ─── env / firebase ──────────────────────────────────────────────────────────
const env = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET;
const GEMINI_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
if (!CLOUD_NAME || !PRESET) { console.error("[promo-sync] .env 의 VITE_CLOUDINARY_* 누락"); process.exit(1); }
if (!GEMINI_KEY) console.warn("[promo-sync] GEMINI_API_KEY 없음 — 디자인 평가 없이 등록만 진행");

initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const db = getFirestore();
const promoCol = db.collection("artifacts").doc("promo-arc").collection("public").doc("data").collection("promotion-banners");

// ─── Cloudinary ──────────────────────────────────────────────────────────────
async function uploadCloudinary(buf) {
  const form = new FormData();
  form.append("file", `data:image/jpeg;base64,${buf.toString("base64")}`);
  form.append("upload_preset", PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).secure_url;
}

// ─── 이미지 정규화 (앱 utils/imageProcessor.js 재현) ──────────────────────────
// PC 1920 / 모바일 750 폭 고정: 넘치면 중앙 크롭, 모자라면 블랙 패드. 높이는 원본 그대로.
async function processImage(filePath, isMobile) {
  const st = fs.statSync(filePath);
  if (st.size === 0) throw new Error("0바이트 파일");
  if (st.size > MAX_BYTES) throw new Error(`50MB 초과 (${(st.size / 1048576).toFixed(1)}MB)`);
  const img = await loadImage(filePath);
  if (!img.width || !img.height) throw new Error("디코딩 실패");
  const targetW = isMobile ? 750 : 1920;
  const targetH = img.height;
  const cv = createCanvas(targetW, targetH);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, targetW, targetH);
  let sourceX = 0, sourceW = img.width;
  if (img.width > targetW) { sourceX = (img.width - targetW) / 2; sourceW = targetW; }
  ctx.drawImage(img, sourceX, 0, sourceW, targetH, (targetW - sourceW) / 2, 0, sourceW, targetH);
  const thumbW = 800;
  const thumbH = Math.round((targetH * thumbW) / targetW);
  const tcv = createCanvas(thumbW, thumbH);
  tcv.getContext("2d").drawImage(cv, 0, 0, thumbW, thumbH);
  return { detail: cv.toBuffer("image/jpeg", 90), thumbnail: tcv.toBuffer("image/jpeg", 85) };
}

// ─── 디자인 평가 (앱 services/gemini.js analyzeWebDesign 재현) ─────────────────
// 평가 기준·채점 규칙·앵커·보정 offset 은 앱과 같은 Firestore 경로에서 읽는다.
const jpegResize = async (input, maxWidth, quality) => {
  const img = await loadImage(input);
  let w = img.width, h = img.height;
  if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
  const cv = createCanvas(w, h);
  cv.getContext("2d").drawImage(img, 0, 0, w, h);
  return cv.toBuffer("image/jpeg", quality);
};

async function loadPromoEvalConfig(type = CRITERIA_TYPES.promotion) {
  let items = [], rules = "";
  const versions = await db.collection(`evaluationCriteria/${type}/versions`).where("isActive", "==", true).limit(1).get();
  if (!versions.empty) {
    const v = versions.docs[0].data();
    if (Array.isArray(v.criteria) && v.criteria.length) items = v.criteria;
    if (typeof v.rules === "string" && v.rules.trim()) rules = v.rules;
  }
  if (!items.length) items = getSeedCriteria(type);
  if (!rules) rules = getSeedRules(type);
  const anchorsSnap = await db.collection(`evaluationCriteria/${type}/anchors`).get();
  const anchors = anchorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const calibSnap = await db.doc(`evaluationCriteria/${type}/calibration/current`).get();
  const offset = calibSnap.exists ? Number(calibSnap.data().offset) || 0 : 0;

  // 앵커 few-shot — 썸네일 있는 앵커는 512px 이미지로, 없는 앵커는 텍스트로 (앱과 동일).
  const { anchors: picked } = buildAnchorFewShot(anchors);
  const prepared = [];
  for (const a of picked) {
    try {
      const res = await fetch(a.thumbnailUrl);
      if (!res.ok) continue;
      const buf = await jpegResize(Buffer.from(await res.arrayBuffer()), 512, 80);
      prepared.push({ anchor: a, base64: buf.toString("base64") });
    } catch { /* 앵커 하나 실패는 무시 */ }
  }
  const fewShot = prepared.length ? buildAnchorFewShot(prepared.map(p => p.anchor)) : { text: "" };
  const textOnlyAnchors = anchors.filter(a => !a?.thumbnailUrl);
  const anchorBlock = `${fewShot.text || ""}${formatAnchorsForPrompt(textOnlyAnchors) || ""}`;
  const anchorImageParts = prepared.map(p => ({ inlineData: { mimeType: "image/jpeg", data: p.base64 } }));

  const introFilled = getIntroTemplateFor(type).replace("{{CRITERIA_LIST}}", formatCriteriaList(items));
  const ruleBlock = rules && rules.trim() ? `\n\n[채점 규칙]\n${rules.trim()}\n` : "";
  return { type, items, weights: weightsMap(items), offset, introFilled, ruleBlock, anchorBlock, anchorImageParts };
}

const isInvalidDate = (val) => !val || ["null", "none", "unknown", "없음", "불명"].some(s => String(val).toLowerCase().includes(s));

async function evaluatePromo(evalCfg, imageBuffers, folderHint) {
  const SCORE_KEYS = evalCfg.items.map(c => c.id).filter(Boolean);
  const folderBlock = folderHint ? `\n\n[디자이너가 부여한 캠페인 폴더명]\n"${folderHint}"\n\n이 폴더명은 디자이너가 직접 작성한 캠페인의 공식 명칭에 가깝습니다. title 추출 시:\n- 이미지의 시각적 텍스트가 이 폴더명과 일치하거나 매우 유사하면 → 그 텍스트를 title로 채택.\n- 이미지의 가장 큰 텍스트와 폴더명이 명확히 다르면 → 이미지의 텍스트를 우선 (오타·신규 캠페인 가능성).\n- 단, 폴더명만 보고 만들지 마세요 — 이미지에 그 텍스트가 글자로 보일 때만 사용.\n` : "";
  const representativeSetBlock = evalCfg.type === CRITERIA_TYPES.brandweb && imageBuffers.length > 1
    ? `\n\n[브랜드웹 대표 평가 이미지 세트]\n- 첫 번째 이미지: 1차 메인 페이지\n- 두 번째 이미지: 1차 대표 서브 페이지\n- 두 이미지를 하나의 사이트 세트로 종합 평가하고 메인 페이지의 브랜드 임팩트를 우선하세요.\n`
    : "";
  const prompt = `${evalCfg.introFilled}${evalCfg.ruleBlock}${evalCfg.anchorBlock}${folderBlock}${representativeSetBlock}`;
  const SCORE_OBJ = { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] };
  const responseSchema = {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      date_info: { type: "OBJECT", properties: { year: { type: "STRING" }, month: { type: "STRING" }, full_date: { type: "STRING" } } },
      tags: { type: "ARRAY", items: { type: "STRING" } },
      summary: { type: "STRING" },
      scores_data: { type: "OBJECT", properties: Object.fromEntries(SCORE_KEYS.map(k => [k, SCORE_OBJ])), required: [...SCORE_KEYS] },
    },
    required: ["title", "tags", "scores_data"],
  };
  const targetMarker = evalCfg.anchorImageParts.length ? [{ text: "[평가 대상 이미지 — 위 참고 이미지들의 점수 감각으로 채점하세요]" }] : [];
  const imageParts = imageBuffers.filter(Boolean).map(b => ({ inlineData: { mimeType: "image/jpeg", data: b.toString("base64") } }));
  const body = {
    contents: [{ parts: [{ text: prompt }, ...evalCfg.anchorImageParts, ...targetMarker, ...imageParts] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema },
    safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"]
      .map(category => ({ category, threshold: "BLOCK_NONE" })),
  };
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      if (!res.ok) { const t = await res.text(); const e = new Error(`HTTP ${res.status} ${t.slice(0, 150)}`); e.status = res.status; throw e; }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("빈 응답 (안전필터 의심)");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      // 앱과 동일한 후처리 — 가중 평균 + 전역 보정, 제목/날짜/태그 정리.
      const scores = {}; let weightedSum = 0, totalW = 0;
      for (const key of SCORE_KEYS) {
        const item = parsed?.scores_data?.[key];
        if (item && typeof item.score === "number") {
          const w = Number(evalCfg.weights[key]) > 0 ? Number(evalCfg.weights[key]) : 1;
          scores[key] = { score: Math.round(item.score), reason: String(item.reason || ""), weight: w };
          weightedSum += item.score * w; totalW += w;
        } else scores[key] = { score: null, reason: "(분석 누락)" };
      }
      const adjusted100 = applyOffset(totalW > 0 ? weightedSum / totalW : 0, evalCfg.offset);
      const aiScore = totalW > 0 ? +(adjusted100 / 10).toFixed(1) : 0;
      const dateInfo = parsed?.date_info || {};
      let yearStr = !isInvalidDate(dateInfo.year) ? String(dateInfo.year).match(/\d{4}/)?.[0] : null;
      let monthStr = !isInvalidDate(dateInfo.month) ? String(dateInfo.month).match(/\d{1,2}/)?.[0]?.padStart(2, "0") : null;
      const fullDateStr = !isInvalidDate(dateInfo.full_date) ? String(dateInfo.full_date).trim() : null;
      if (!yearStr && fullDateStr) yearStr = fullDateStr.match(/(20\d{2})/)?.[1] || null;
      if (!monthStr && fullDateStr) { const m = fullDateStr.match(/20\d{2}\s*[.\-/년]\s*(\d{1,2})/); if (m) monthStr = m[1].padStart(2, "0"); }
      let titleClean = parsed?.title ? String(parsed.title).trim() : null;
      if (titleClean) {
        titleClean = titleClean.replace(/^["'[「『]+|["'\]」』]+$/g, "").trim();
        if (titleClean.length < 2) titleClean = null;
      }
      return {
        ok: true, webScores: scores, webAiScore: aiScore, title: titleClean,
        year: yearStr ? Number(yearStr) : null, month: monthStr ? Number(monthStr) : null,
        fullDate: fullDateStr, tags: Array.isArray(parsed?.tags) ? parsed.tags.map(String) : [],
        summary: parsed?.summary ? String(parsed.summary) : "",
      };
    } catch (e) {
      lastError = e;
      const retryable = !e.status || e.status === 429 || e.status >= 500;
      if (!retryable || attempt === 2) break;
      await new Promise(r => setTimeout(r, [1000, 2000][attempt] || 2000));
    }
  }
  return { ok: false, error: lastError?.message || "알 수 없는 오류" };
}

// 평가 결과 → doc 패치 (앱 단일 분석의 patch 와 동일 필드).
function evalPatch(result, existingTags = []) {
  const patch = {
    webScores: result.webScores,
    webAiScore: result.webAiScore,
    isWebAnalyzed: true,
    webAnalyzedAt: new Date().toISOString(),
    webManualScoreAdj: 0,
  };
  if (result.title) patch.title = result.title;
  if (result.year) patch.year = result.year;
  if (result.month) patch.month = result.month;
  if (result.fullDate) patch.webDateText = result.fullDate;
  if (result.tags?.length > 0) patch.tags = [...new Set([...(existingTags || []), ...result.tags])];
  if (result.summary) patch.webSummary = result.summary;
  return patch;
}

// ─── 캠페인 폴더 → pc/mobile 대표 파일 (하위 납품 폴더 포함 · 최대 크기) ──────────
function pickDeviceFiles(campaignAbs) {
  const subs = fs.readdirSync(campaignAbs, { withFileTypes: true }).filter(d => d.isDirectory());
  const designDir = subs.find(d => d.name.includes("디자인"));
  if (!designDir) return null;
  const designAbs = path.join(campaignAbs, designDir.name);
  const pick = (re) => {
    const dev = fs.readdirSync(designAbs, { withFileTypes: true })
      .find(d => d.isDirectory() && re.test(d.name.trim()));
    if (!dev) return null;
    const devAbs = path.join(designAbs, dev.name);
    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (EXCLUDE_REGEX.test(e.name) || /^(old|backup|bak|crop|m_crop|thumb|thumbnail)$/i.test(e.name.trim())) continue;
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f);
        else if (e.isFile() && ALLOWED_EXT.test(e.name)) files.push({ f, size: fs.statSync(f).size });
      }
    };
    walk(devAbs);
    files.sort((a, b) => b.size - a.size);
    return files[0]?.f || null;
  };
  return { pcFile: pick(/^(pc|web)$/i), moFile: pick(/^(mo|mobile|m)$/i) };
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
log(`프로모션 동기화 시작${DRY ? " [dry-run]" : ""}`);
const existing = await promoCol.get();
const normTitle = (t) => String(t || "").replace(/\s+/g, "").toLowerCase();
const normPath = (p) => String(p || "").toLowerCase().replace(/[/\\]+/g, "\\").trim();
const titleKeys = new Set();
const pathKeys = [];
const uidCount = {};
existing.forEach(d => {
  const b = d.data();
  titleKeys.add(`${b.game}|${normTitle(b.title)}`);
  if (b.path) pathKeys.push(normPath(b.path));
  if (b.ownerUid) uidCount[b.ownerUid] = (uidCount[b.ownerUid] || 0) + 1;
});
const ownerUid = Object.entries(uidCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "promo-sync";
log(`기존 프로모션 ${existing.size}건 로드`);

const evalType = BRANDWEB_EVAL ? CRITERIA_TYPES.brandweb : CRITERIA_TYPES.promotion;
const evalCfg = GEMINI_KEY && !DRY ? await loadPromoEvalConfig(evalType) : null;
if (evalCfg) log(`평가 설정: 기준 ${evalCfg.items.length}항목 · offset ${evalCfg.offset} · 앵커 이미지 ${evalCfg.anchorImageParts.length}개`);

const minDate = CONFIG.promoMinDate || "00000000";
const nowYear = new Date().getFullYear();
let ok = 0, skip = 0, fail = 0;
for (const target of (BRANDWEB_EVAL ? [] : CONFIG.targets)) {
  if (!target.promoShare) continue;
  for (const year of [String(nowYear), String(nowYear - 1)]) {
    const shareDir = target.promoShare.replaceAll("{year}", year);
    let names;
    try { names = fs.readdirSync(shareDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); }
    catch { continue; }
    const campaigns = names
      .filter(n => { const m = n.match(/^(?:[A-Za-z]+_)?(\d{8})_/); return m && m[1] >= minDate; })
      .sort();
    const fresh = [];
    for (const folder of campaigns) {
      const m = folder.match(/^(?:[A-Za-z]+_)?(\d{8})_\s*(.*)$/);
      const title = m[2].trim() || folder;
      const campaignPath = `${target.promoPathPrefix.replaceAll("{year}", year)}\\${folder}`;
      const np = normPath(campaignPath);
      if (titleKeys.has(`${target.game}|${normTitle(title)}`)) continue;
      if (pathKeys.some(p => p.startsWith(np))) continue;
      fresh.push({ folder, title, campaignPath, yyyy: m[1].slice(0, 4) });
    }
    if (campaigns.length || fresh.length) log(`[${target.game} ${year}] 캠페인 ${campaigns.length}개 중 신규 ${fresh.length}개`);
    for (const { folder, title, campaignPath, yyyy } of fresh) {
      try {
        const picked = pickDeviceFiles(path.join(shareDir, folder));
        if (!picked || (!picked.pcFile && !picked.moFile)) { log(`  ${folder} → 디자인 pc/mobile 이미지 없음, 스킵`); skip++; continue; }
        if (DRY) { log(`  ${folder} → [dry] pc:${picked.pcFile ? path.basename(picked.pcFile) : "-"} mo:${picked.moFile ? path.basename(picked.moFile) : "-"}`); ok++; continue; }
        const pcData = picked.pcFile ? await processImage(picked.pcFile, false) : null;
        const moData = picked.moFile ? await processImage(picked.moFile, true) : null;
        const preview = await uploadCloudinary((pcData || moData).thumbnail);
        const full_image = pcData ? await uploadCloudinary(pcData.detail) : null;
        const mobile_image = moData ? await uploadCloudinary(moData.detail) : null;
        const docData = {
          title,
          game: target.game,
          year: yyyy,
          path: `${campaignPath}\\03.디자인\\`,
          section: "promotion",
          preview, full_image, mobile_image,
          created_at: new Date().toISOString(),
          liked: 0, tags: [], history: [],
          ownerUid, visibility: "public",
        };
        // 디자인 평가 — 앱의 단일 분석과 동일 (PC+모바일 1280px 첨부, 폴더명 힌트).
        let evalNote = " (평가 없음)";
        if (evalCfg) {
          const evalImages = [];
          if (pcData) evalImages.push(await jpegResize(pcData.detail, 1280, 80));
          if (moData) evalImages.push(await jpegResize(moData.detail, 1280, 80));
          const r = await evaluatePromo(evalCfg, evalImages, title);
          if (r.ok) { Object.assign(docData, evalPatch(r, docData.tags)); evalNote = ` (평가 ${r.webAiScore})`; }
          else { evalNote = ` (평가 실패: ${r.error} — 앱에서 재분석 가능)`; }
        }
        await promoCol.add(docData);
        titleKeys.add(`${target.game}|${normTitle(title)}`);
        log(`  ${folder} → 등록 완료 (pc:${pcData ? "O" : "-"} mo:${moData ? "O" : "-"})${evalNote}`);
        ok++;
        await new Promise(r => setTimeout(r, 300));
      } catch (e) { log(`  ${folder} → 실패: ${e.message}`); fail++; }
    }
  }
}
// ─── 미평가 등록분 평가 백필 — 대상 게임 · promoMinDate 연도 이후 · isWebAnalyzed 아님 ──
let evalOk = 0, evalFail = 0;
if (evalCfg || DRY) {
  const minYear = Number((CONFIG.promoMinDate || "20260101").slice(0, 4));
  const targetGames = new Set(CONFIG.targets.filter(t => t.promoShare).map(t => t.game));
  const pending = [];
  existing.forEach(d => {
    const b = d.data();
    if (!BRANDWEB_EVAL && b.isWebAnalyzed) return;
    if (BRANDWEB_EVAL) {
      if (b.assetType !== "브랜드웹") return;
    } else if (!targetGames.has(b.game)) return;
    if (!BRANDWEB_EVAL && Number(b.year) < minYear) return;
    if (!b.full_image && !b.preview) return;
    pending.push({ id: d.id, b });
  });
  if (pending.length) log(`미평가 등록분 ${pending.length}건 평가 시작`);
  for (const { id, b } of pending) {
    if (DRY) { log(`  ${b.game} · ${b.title} → [dry] 평가 대상`); evalOk++; continue; }
    try {
      const evalImages = [];
      const evalUrls = (() => {
        if (!BRANDWEB_EVAL) return [b.full_image, b.mobile_image].filter(Boolean);
        const pages = Array.isArray(b.pages) ? b.pages : [];
        const phaseOnePc = pages.filter(p => p.device === "pc" && Number(p.sourcePhase || 1) === 1 && p.url);
        const pc = phaseOnePc.length ? phaseOnePc : pages.filter(p => p.device === "pc" && p.url);
        const main = pc.find(p => p.id === b.mainPageId) || pc[0];
        const sub = pc.find(p => p.id !== main?.id);
        return [main?.url || b.full_image || b.preview, sub?.url].filter((url, index, values) => url && values.indexOf(url) === index).slice(0, 2);
      })();
      for (const url of evalUrls) {
        if (!url) continue;
        const res = await fetch(url);
        if (res.ok) evalImages.push(await jpegResize(Buffer.from(await res.arrayBuffer()), 1280, 80));
      }
      if (!evalImages.length) { log(`  ${b.game} · ${b.title} → 이미지 다운로드 실패, 스킵`); evalFail++; continue; }
      const folderHint = (() => {
        const parts = String(b.path || "").split(/[\\/]+/).filter(Boolean);
        while (parts.length && /^\d+\.\S/.test(parts[parts.length - 1])) parts.pop();
        const last = parts[parts.length - 1] || "";
        const dated = last.match(/^\d{8}_(.+)$/);
        return (dated ? dated[1] : last).trim() || b.title;
      })();
      const r = await evaluatePromo(evalCfg, evalImages, folderHint);
      if (!r.ok) { log(`  ${b.game} · ${b.title} → 평가 실패: ${r.error}`); evalFail++; continue; }
      await promoCol.doc(id).update({ ...evalPatch(r, b.tags), evaluationImageUrls: evalUrls, evaluationImagePolicy: BRANDWEB_EVAL ? "phase1-main-plus-sub" : "pc-plus-mobile" });
      log(`  ${b.game} · ${b.title} → 평가 완료 (${r.webAiScore})`);
      evalOk++;
      await new Promise(r2 => setTimeout(r2, 400));
    } catch (e) { log(`  ${b.game} · ${b.title} → 평가 실패: ${e.message}`); evalFail++; }
  }
}

log(`프로모션 동기화 완료 — 등록 ${ok} · 스킵 ${skip} · 실패 ${fail} · 평가 백필 ${evalOk}${evalFail ? ` (평가 실패 ${evalFail})` : ""}`);
process.exit(fail && !ok ? 1 : 0);
