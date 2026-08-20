// 배너 코덱스 주간 자동 동기화 — 네트워크 공유 폴더의 새 배너를 찾아 등록한다.
// 대상 폴더는 banner-codex-sync.config.json 의 targets. 이미 등록된 배너는
// path(폴더 경로) 기준으로 건너뛰므로 매주 돌려도 새 폴더만 증분 등록된다.
//
// 파이프라인 (BannerCodex 앱과 동일):
//   마스터 배너 선택(1180x750 notice 우선, 하위 버전 폴더 재귀) → Cloudinary 업로드(1200/400)
//   → Gemini 2.5-pro 10지표 분석(앱의 커스텀 프롬프트·활성 평가 기준·가중치·보정 offset)
//   → Firestore banners 등록 (firebase-admin, service-account.json)
//
// 실행:  node scripts/banner-codex-sync.mjs [--dry]
// 스케줄: Windows 작업 스케줄러 "NexusBannerCodexSync" (주 1회) — mcp/README.md 아님,
//         등록/변경은 schtasks 또는 taskschd.msc 참조.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { DEFAULT_AI_PROMPT, EVALUATION_KEYS } from "./banner-codex-categories.bundle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "banner-codex-sync.config.json"), "utf8"));
const DRY = process.argv.includes("--dry");
const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (msg) => console.log(`[${stamp()}] ${msg}`);

// ─── env ─────────────────────────────────────────────────────────────────────
const env = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const GEMINI_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET;
if (!GEMINI_KEY || !CLOUD_NAME || !PRESET) { console.error("[sync] .env 의 GEMINI_API_KEY / VITE_CLOUDINARY_* 누락"); process.exit(1); }

// ─── firebase-admin ──────────────────────────────────────────────────────────
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path.join(ROOT, "service-account.json"), "utf8"))) });
const db = getFirestore();
const APP_ID = "promo-arc";
const bannersCol = db.collection("artifacts").doc(APP_ID).collection("public").doc("data").collection("banners");

// ─── 이미지 ──────────────────────────────────────────────────────────────────
function resizeJpeg(img, maxWidth, quality) {
  let w = img.width, h = img.height;
  if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
  const cv = createCanvas(w, h);
  cv.getContext("2d").drawImage(img, 0, 0, w, h);
  return cv.toBuffer("image/jpeg", Math.round(quality * 100));
}
async function uploadCloudinary(buf) {
  const form = new FormData();
  form.append("file", `data:image/jpeg;base64,${buf.toString("base64")}`);
  form.append("upload_preset", PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).secure_url;
}

// ─── Gemini 분석 (앱 services/gemini.js 와 동일 스키마·온도·재시도) ────────────
const SCORE_OBJ = { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] };
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    date_info: { type: "OBJECT", properties: { year: { type: "STRING" }, month: { type: "STRING" }, full_date: { type: "STRING" } } },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    purpose: { type: "STRING" },
    scores_data: { type: "OBJECT", properties: Object.fromEntries(EVALUATION_KEYS.map(k => [k, SCORE_OBJ])), required: [...EVALUATION_KEYS] },
  },
  required: ["title", "tags", "purpose", "scores_data"],
};
async function analyze(prompt, jpegBuf) {
  const body = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: jpegBuf.toString("base64") } }] }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
    safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"]
      .map(category => ({ category, threshold: "BLOCK_NONE" })),
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      if (!res.ok) { const t = await res.text(); const e = new Error(`HTTP ${res.status} ${t.slice(0, 150)}`); e.status = res.status; throw e; }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("빈 응답 (안전필터 의심)");
      return JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (e) {
      const retryable = !e.status || e.status === 429 || e.status >= 500;
      if (attempt === 1 || !retryable) throw e;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// ─── 평가 기준/규칙/보정 (앱 설정을 Firestore 에서 그대로 읽음) ────────────────
function formatCriteriaList(items) {
  if (!items?.length) return "(평가 항목 없음)";
  return items.map((c, i) => {
    const w = typeof c.weight === "number" && !Number.isNaN(c.weight) ? `[${c.weight}%]` : "";
    const desc = c.description ? `\n     · ${c.description}` : "";
    return `${i + 1}. (${c.id}) ${c.name} ${w}${desc}`.trim();
  }).join("\n");
}
const applyOffset = (avg, off) => Math.max(0, Math.min(99, Math.round((Number(avg) || 0) + (Number(off) || 0))));

async function loadEvalConfig() {
  const promptSnap = await db.doc(`artifacts/${APP_ID}/public/data/settings/aiPrompt`).get();
  const basePrompt = (promptSnap.exists && promptSnap.data().text) || DEFAULT_AI_PROMPT;
  let criteria = [], rules = "";
  const versions = await db.collection("evaluationCriteria/banner/versions").where("isActive", "==", true).limit(1).get();
  if (!versions.empty) {
    const v = versions.docs[0].data();
    criteria = Array.isArray(v.criteria) ? v.criteria : [];
    if (typeof v.rules === "string") rules = v.rules;
  }
  const calibSnap = await db.doc("evaluationCriteria/banner/calibration/current").get();
  const offset = calibSnap.exists ? Number(calibSnap.data().offset) || 0 : 0;
  let prompt = basePrompt;
  if (prompt.includes("{{EVALUATION_CRITERIA_LIST}}")) prompt = prompt.replace("{{EVALUATION_CRITERIA_LIST}}", formatCriteriaList(criteria));
  if (prompt.includes("{{SCORING_RULES}}")) prompt = prompt.replace("{{SCORING_RULES}}", rules);
  if (prompt.includes("{{LEARNING_CONTEXT}}")) prompt = prompt.replace("{{LEARNING_CONTEXT}}", "");
  const weights = {}; criteria.forEach(c => { if (c.id) weights[c.id] = Number(c.weight) || 0; });
  return { prompt, weights, offset };
}

// ─── 폴더 → 마스터 배너 이미지 (사이즈 키워드 우선, 하위 2단계 재귀) ─────────────
// sizeKeyword: 블소·아이온 "1180" (1180x750_notice 등), 그 외 게임 "1200" (Facebook_1200x630 등).
// 디자인 폴더: "3. 배너" / "3.배너" / "03.디자인" 모두 대응.
function pickBannerImage(folderAbs, sizeKeyword = "1180") {
  const subs = fs.readdirSync(folderAbs, { withFileTypes: true }).filter(d => d.isDirectory());
  const designDir = subs.find(d => /^0?3[.\s]/.test(d.name.trim()));
  let dir = designDir ? path.join(folderAbs, designDir.name) : folderAbs;
  const collect = (root) => {
    const out = [];
    const walk = (d, depth) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        if (ent.isDirectory()) { if (depth < 2) walk(path.join(d, ent.name), depth + 1); }
        else if (/\.(jpe?g|png)$/i.test(ent.name)) out.push(path.join(d, ent.name));
      }
    };
    walk(root, 0);
    return out;
  };
  // 디자인 폴더 안에 banner/배너 하위폴더가 있으면 거기로 한정 — pc/mobile 페이지 스크린샷 오선택 방지.
  try {
    const bannerSub = fs.readdirSync(dir, { withFileTypes: true })
      .find(d => d.isDirectory() && /^(banner|배너)$/i.test(d.name.trim()));
    if (bannerSub) {
      const sub = path.join(dir, bannerSub.name);
      if (collect(sub).length) dir = sub;
    }
  } catch { /* 없으면 그대로 */ }
  const files = collect(dir);
  if (!files.length) return null;
  const byDesc = (arr) => [...arr].sort((a, b) => b.localeCompare(a, "ko"));
  const kwNotice = new RegExp(`${sizeKeyword}x\\d+.*notice`, "i");
  const kw = new RegExp(sizeKeyword, "i");
  // 키워드 매칭이 없으면 등록하지 않음 — PC웹 페이지 스크린샷 등 배너가 아닌 파일 오등록 방지.
  // (배너 파일이 나중에 올라오면 다음 주간 실행에서 자동으로 잡힌다.)
  return byDesc(files.filter(f => kwNotice.test(path.basename(f))))[0]
    || byDesc(files.filter(f => kw.test(path.basename(f))))[0]
    || byDesc(files.filter(f => /facebook|페북|(^|[^a-z])fb([^a-z]|$)/i.test(path.basename(f))))[0]
    || byDesc(files.filter(f => /1352/i.test(path.basename(f))))[0]
    || null;
}

// ─── 등록 1건 ────────────────────────────────────────────────────────────────
async function registerFolder({ target, year, folder, uploadedBy, evalCfg }) {
  // "NR_20260318_..." 처럼 날짜 앞에 접두어가 붙는 폴더(리니지2M NR 등)도 허용.
  const m = folder.match(/^(?:[A-Za-z]+_)?(\d{4})(\d{2})(\d{2})_\s*(.*)$/);
  const [, yyyy, mm, dd] = m;
  const title = m[4].trim();
  const shareDir = target.share.replaceAll("{year}", year);
  const bannerPath = `${target.pathPrefix.replaceAll("{year}", year)}\\${folder}`;
  const imgPath = pickBannerImage(path.join(shareDir, folder), target.sizeKeyword || "1180");
  if (!imgPath) { log(`  ${folder} → ${target.sizeKeyword || "1180"} 키워드 배너 파일 없음, 스킵`); return "skip"; }
  const img = await loadImage(imgPath);
  const [orig, thumb, aiBuf] = [resizeJpeg(img, 1200, 0.8), resizeJpeg(img, 400, 0.8), resizeJpeg(img, 1024, 0.8)];
  if (DRY) { log(`  ${folder} → [dry] ${path.basename(imgPath)}`); return "ok"; }
  const imageUrl = await uploadCloudinary(orig);
  const thumbnailUrl = await uploadCloudinary(thumb);

  let ai = null;
  try { ai = await analyze(evalCfg.prompt, aiBuf); }
  catch (e) { log(`  ${folder} → 분석 실패(등록은 진행): ${e.message}`); }

  const docData = {
    title, originalTitle: title, game: target.game, year: yyyy, month: mm,
    date: `${yyyy}.${mm}.${dd}`, character: "Unknown", path: bannerPath,
    tags: [], linkUrl: "", ocrProcessed: false, liked: false, featured: false,
    imageUrl, thumbnailUrl, uploadedBy, createdAt: new Date().toISOString(),
  };
  if (ai) {
    docData.ocrProcessed = true;
    if (ai.title) docData.title = String(ai.title);
    const bad = v => !v || String(v).toLowerCase() === "null" || String(v).includes("없음") || String(v).includes("불명");
    if (ai.date_info?.month && !bad(ai.date_info.month)) docData.month = String(ai.date_info.month).padStart(2, "0");
    if (ai.date_info?.full_date && !bad(ai.date_info.full_date)) docData.date = String(ai.date_info.full_date);
    if (Array.isArray(ai.tags)) docData.tags = ai.tags.map(String);
    const merged = {}; let wSum = 0, wTot = 0, valid = 0;
    for (const key of EVALUATION_KEYS) {
      const s = ai.scores_data?.[key]?.score;
      const reason = ai.scores_data?.[key]?.reason || "";
      if (s == null) { merged[key] = { score: null, reason: reason || "(분석 누락 — AI 응답에 없음)" }; continue; }
      merged[key] = { score: Math.round(s), reason };
      const w = Number(evalCfg.weights[key]) > 0 ? Number(evalCfg.weights[key]) : 1;
      wSum += s * w; wTot += w; valid++;
    }
    const aiScore = Math.round((applyOffset(wTot > 0 ? wSum / wTot : 0, evalCfg.offset) / 10) * 10) / 10;
    docData.scores = merged; docData.aiScore = aiScore; docData.scoredCount = valid;
    docData.manualScoreAdj = 0;
    docData.score = Math.max(0.0, Math.min(9.9, aiScore)).toFixed(1);
  }
  await bannersCol.add(docData);
  log(`  ${folder} → 등록 완료${ai ? ` (score ${docData.score})` : " (분석 없음, 앱에서 재분석 가능)"}`);
  await new Promise(r => setTimeout(r, 400));
  return "ok";
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
log(`배너 코덱스 동기화 시작${DRY ? " [dry-run]" : ""} — 대상 ${CONFIG.targets.length}개 게임`);
const existing = await bannersCol.get();
// path 정규화(소문자·구분자 통일) prefix 매칭 — 앱 수동 등록분(경로 뒤에 \3. 디자인 등이 붙은 케이스)도 잡는다.
const normPath = (p) => String(p || "").toLowerCase().replace(/[/\\]+/g, "\\").trim();
const existingPaths = [];
const uidCount = {};
existing.forEach(d => {
  const b = d.data();
  if (b.path) existingPaths.push(normPath(b.path));
  if (b.uploadedBy) uidCount[b.uploadedBy] = (uidCount[b.uploadedBy] || 0) + 1;
});
const uploadedBy = Object.entries(uidCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "banner-sync";
const isRegistered = (folderPath) => { const fp = normPath(folderPath); return existingPaths.some(p => p.startsWith(fp)); };
log(`기존 배너 ${existing.size}건 로드`);

const evalCfg = await loadEvalConfig();
const nowYear = new Date().getFullYear();
let ok = 0, skip = 0, fail = 0;
for (const target of CONFIG.targets) {
  // 올해 + 작년 폴더 스캔 (연초 전환기 대응 — 등록된 건 전부 path 로 스킵되므로 안전)
  for (const year of [String(nowYear), String(nowYear - 1)]) {
    const shareDir = target.share.replaceAll("{year}", year);
    let names;
    try { names = fs.readdirSync(shareDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); }
    catch { continue; } // 해당 연도 폴더 없음 (작년 미존재 등)
    const targets = names
      .filter(n => { const m = n.match(/^(?:[A-Za-z]+_)?(\d{8})_/); return m && m[1] >= (CONFIG.minDate || "00000000"); })
      .sort();
    const fresh = targets.filter(n => !isRegistered(`${target.pathPrefix.replaceAll("{year}", year)}\\${n}`));
    log(`[${target.game} ${year}] 폴더 ${targets.length}개 중 신규 ${fresh.length}개`);
    for (const folder of fresh) {
      try {
        const r = await registerFolder({ target, year, folder, uploadedBy, evalCfg });
        if (r === "ok") ok++; else skip++;
      } catch (e) { log(`  ${folder} → 실패: ${e.message}`); fail++; }
    }
  }
}
log(`동기화 완료 — 등록 ${ok} · 스킵 ${skip} · 실패 ${fail}`);
process.exit(fail && !ok ? 1 : 0);
