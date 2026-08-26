#!/usr/bin/env node
// NEXUS Studio MCP 서버 — 외부 AI(Claude Desktop/Code, 기타 MCP 클라이언트)가
// NEXUS Studio 의 프롬프트 엔진·렌더 파이프라인·픽셀 툴을 그대로 쓸 수 있게 노출한다.
//
// 단일 진실 소스: 프롬프트 빌더·옵션 카탈로그는 전부 src/ 의 실제 앱 모듈을 import 한다
// (esbuild 로 번들 — scripts: npm run mcp:build). 앱에서 프롬프트를 고치면 MCP 도 따라간다.
//
// 실행: node mcp/nexus-mcp.bundle.mjs   (stdio transport)
// 키: 환경변수 또는 리포 루트 .env 의 서버 전용 키(VITE_ 접두사 아님).
// Gemini: GEMINI_API_KEY · Remove.bg AI: REMOVE_BG_API_KEY

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── 실제 앱 모듈 (single source of truth) ────────────────────────────────────
import { buildLightFxPrompt, buildCompactLightFxPrompt } from "../src/apps/RubiconForge/services/lightfx";
import {
  LIGHTFX_CATEGORIES, LIGHTFX_CATEGORY_BY_ID,
  LIGHTFX_FORMS, LIGHTFX_FORM_BY_ID,
  LIGHTFX_STYLES, LIGHTFX_STYLE_BY_ID,
  LIGHTFX_COLORS, LIGHTFX_COLOR_BY_ID,
  LIGHTFX_MATERIALS, LIGHTFX_MATERIAL_BY_ID,
  LIGHTFX_GRAINS, LIGHTFX_GRAIN_BY_ID,
  LIGHTFX_BOKEHS, LIGHTFX_BOKEH_BY_ID,
} from "../src/apps/RubiconForge/constants/lightfx";
import { buildVariationPrompt, buildCompactVariationPrompt, buildDesignAlternativePrompt, buildCompactDesignAlternativePrompt } from "../src/apps/RubiconForge/services/variations";
import {
  BG_COLORS, BG_COLOR_BY_ID, DEFAULT_BG,
  VARIATION_MOODS, VARIATION_STYLES, ALL_VARIATION_STYLES, STYLE_BY_ID,
  REFINEMENT_LEVELS, ATMOSPHERE_TEMPERATURE, ATMOSPHERE_AGE,
  DESIGN_VARIATIONS, DESIGN_VARIATION_BY_ID,
  VARIATION_STRENGTH, VARIATION_STRENGTH_BY_ID,
} from "../src/apps/RubiconForge/constants/variations";
import { buildBundlePrompt, isColorableGround, BUNDLE_LIGHT_OPTIONS, BUNDLE_GROUND_OPTIONS, BUNDLE_MAGIC_COLORS, BUNDLE_BG_OPTIONS, BUNDLE_LAYOUT_OPTIONS } from "../src/apps/NexusPreview/services/bundlePrompt";
import { CHAR_LIGHT_OPTIONS, CHAR_PARTICLE_OPTIONS, CHAR_INTENSITY_OPTIONS, CHAR_BG_OPTIONS, CHAR_SKILLS, resolveCharBg } from "../src/apps/NexusPreview/services/characterPresets";
import { buildQualityUpSkillIds } from "../src/apps/NexusPreview/services/qualityUpSkills";
import { computeCharMask, CHAR_SPLIT_DEFAULTS } from "../src/lib/charEffectSplit";
import { buildPrompts as buildBreezePrompts } from "../src/apps/TypecoreBreeze/hooks/useBreezePrompt";
import { directorPersonas as breezePersonas } from "../src/apps/TypecoreBreeze/constants/categories";
import { coreArchetypes as sovereignArchetypes } from "../src/apps/TypecoreSovereign/versions/current/constants/personas";
import { staticOptions as sovereignOptions } from "../src/apps/TypecoreSovereign/versions/current/constants/options";
import { getOptionEn as sovereignOptionEn } from "../src/apps/TypecoreSovereign/versions/current/constants/utils";
import { resolveSovereignOptions, SCRIPT_PRESETS as sovereignPresets } from "../src/apps/TypecoreSovereign/versions/current/services/sovereignOptions";
import { compileSovereignImagenPrompt } from "../src/apps/TypecoreSovereign/versions/current/services/compileSovereignImagenPrompt";
import { FRAMEFORGE_ASSET_TYPES, FRAMEFORGE_SILHOUETTES, FRAMEFORGE_MOODS, FRAMEFORGE_RENDER_STYLES, buildFrameForgeMcpPrompt } from "../src/apps/FrameForge/frameforgeMcp.js";

// ─── 경로/키 ─────────────────────────────────────────────────────────────────
// 번들은 <repo>/mcp/ 에 있으므로 루트는 한 단계 위.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "src", "skills");
const RUBRIC_PATH = path.join(ROOT, ".codex", "skills", "nexus-design-evaluator", "references", "rubric.md");
const OUT_DIR = path.join(ROOT, ".tmp", "mcp-out");
const NEXUS_AUTH_DIR = path.join(process.env.APPDATA || path.join(os.homedir(), ".config"), "NexusStudio");
const NEXUS_AUTH_PATH = path.join(NEXUS_AUTH_DIR, "mcp-auth.json");
const NEXUS_LINK_PORT = Number(process.env.NEXUS_MCP_LINK_PORT || 47831);

function readNexusAuth() {
  try { return JSON.parse(fs.readFileSync(NEXUS_AUTH_PATH, "utf8")); }
  catch { return null; }
}

function writeNexusAuth(value) {
  fs.mkdirSync(NEXUS_AUTH_DIR, { recursive: true });
  fs.writeFileSync(NEXUS_AUTH_PATH, JSON.stringify(value, null, 2), { mode: 0o600 });
}

function decodeFirebaseClaims(idToken) {
  try {
    const payload = String(idToken || "").split(".")[1];
    return payload ? JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) : {};
  } catch { return {}; }
}

async function exchangeCustomToken(customToken) {
  const { apiKey } = firebaseConfig();
  if (!apiKey) throw new Error("Firebase API key가 없습니다.");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Firebase custom token 교환 실패");
  const claims = decodeFirebaseClaims(body.idToken);
  const auth = {
    uid: body.localId || claims.user_id || claims.sub || null,
    email: body.email || claims.email || null,
    idToken: body.idToken,
    refreshToken: body.refreshToken,
    expiresAt: Date.now() + Number(body.expiresIn || 3600) * 1000,
    connectedAt: Date.now(),
  };
  writeNexusAuth(auth);
  return auth;
}

async function currentNexusAuth() {
  const auth = readNexusAuth();
  if (!auth?.refreshToken) return null;
  if (auth.idToken && Number(auth.expiresAt || 0) > Date.now() + 60000) {
    if (!auth.uid || !auth.email) {
      const claims = decodeFirebaseClaims(auth.idToken);
      const repaired = {
        ...auth,
        uid: auth.uid || claims.user_id || claims.sub || null,
        email: auth.email || claims.email || null,
      };
      writeNexusAuth(repaired);
      return repaired;
    }
    return auth;
  }
  const { apiKey } = firebaseConfig();
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: auth.refreshToken }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Nexus 계정 토큰 갱신 실패");
  const next = {
    ...auth,
    uid: body.user_id || auth.uid,
    idToken: body.id_token,
    refreshToken: body.refresh_token || auth.refreshToken,
    expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000,
  };
  writeNexusAuth(next);
  return next;
}

function startNexusLinkBridge() {
  const bridge = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    if (req.method === "GET" && req.url === "/status") {
      const auth = readNexusAuth();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ connected:!!auth?.refreshToken, uid:auth?.uid || null, email:auth?.email || null }));
      return;
    }
    if (req.method === "DELETE" && req.url === "/connect") {
      try { fs.unlinkSync(NEXUS_AUTH_PATH); } catch {}
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok:true, connected:false }));
      return;
    }
    if (req.method === "POST" && req.url === "/connect") {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 1024 * 1024) throw new Error("요청이 너무 큽니다.");
      }
      try {
        const customToken = JSON.parse(raw || "{}").customToken;
        if (!customToken) throw new Error("customToken이 없습니다.");
        const auth = await exchangeCustomToken(customToken);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok:true, connected:true, uid:auth.uid, email:auth.email }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok:false, error:e?.message || String(e) }));
      }
      return;
    }
    res.writeHead(404); res.end();
  });
  bridge.on("error", () => {});
  bridge.listen(NEXUS_LINK_PORT, "127.0.0.1");
}

function geminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const m = env.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  } catch { /* .env 없음 */ }
  return null;
}

function envValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = env.match(new RegExp(`^\\s*${escaped}\\s*=\\s*(.+?)\\s*$`, "m"));
    if (m) return m[1].replace(/^['"]|['"]$/g, "");
  } catch { /* .env 없음 */ }
  return null;
}

function removeBgAllowedRoots() {
  const configured = envValue("REMOVE_BG_ALLOWED_ROOTS");
  return (configured ? configured.split(";") : [ROOT]).map((value) => path.resolve(value.trim())).filter(Boolean);
}

function isInsideAllowedRoot(target, roots) {
  return roots.some((root) => {
    const relative = path.relative(root, target);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
}

// ─── fs 기반 composeSkills — lib/skills.js 의 Vite glob 대응 Node 재구현 ───────
// 스킬 본문(src/skills/**/*.md)은 파일 그대로 읽으므로 앱과 항상 동일 내용.
function composeSkillsFs(ids, ctx = {}) {
  const parts = [];
  for (const id of ids) {
    const file = path.join(SKILLS_DIR, ...id.split("/")) + ".md";
    let body;
    try { body = fs.readFileSync(file, "utf8").trim(); }
    catch { console.error(`[nexus-mcp] unknown skill id: ${id}`); continue; }
    const filled = body.replace(/\{\{(\w+)\}\}/g, (_, key) => (ctx[key] == null ? "" : String(ctx[key])));
    if (filled.trim()) parts.push(filled.trim());
  }
  return parts.join("\n\n");
}

// ─── 공용 헬퍼 ────────────────────────────────────────────────────────────────
const ids = (arr, key = "id") => arr.map((o) => o[key]);
const keyEnum = (arr) => z.enum(ids(arr, "key"));
const idEnum = (arr) => z.enum(ids(arr));
const text = (t) => ({ content: [{ type: "text", text: t }] });
const errText = (t) => ({ content: [{ type: "text", text: t }], isError: true });
// 구조화 응답: 사람이 읽는 text + 클라이언트가 파싱하는 structuredContent 를 함께 반환.
const data = (structuredContent, t) => ({ content: [{ type: "text", text: t }], structuredContent });

// 원격 이미지 URL을 MCP ImageContent 로 변환한다. URL 문자열만 반환하면 일부 클라이언트가
// 보안상 원격 이미지를 즉시 렌더하지 않으므로, 목록 미리보기는 작은 썸네일을 base64 로 첨부한다.
// 과도한 응답 크기를 막기 위해 호출당 최대 5개, 이미지당 5MB 로 제한한다.
async function remoteImageContent(url, { maxBytes = 5 * 1024 * 1024 } = {}) {
  if (!url || !/^https:\/\//i.test(url)) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`이미지 다운로드 실패 (${response.status})`);
  const mimeType = String(response.headers.get("content-type") || "image/jpeg").split(";")[0];
  if (!mimeType.startsWith("image/")) throw new Error(`이미지가 아닌 응답입니다: ${mimeType}`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error(`이미지가 ${Math.ceil(declared / 1024 / 1024)}MB로 미리보기 제한을 초과했습니다.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error(`이미지가 ${Math.ceil(bytes.length / 1024 / 1024)}MB로 미리보기 제한을 초과했습니다.`);
  return { type: "image", data: bytes.toString("base64"), mimeType };
}

async function dataWithRemoteImages(structuredContent, t, urls) {
  const content = [{ type: "text", text: t }];
  for (const url of urls.filter(Boolean).slice(0, 5)) {
    try {
      const preview = await remoteImageContent(url);
      if (preview) content.push(preview);
    } catch (error) {
      console.warn(`[nexus-mcp] image preview skipped: ${error.message}`);
    }
  }
  return { content, structuredContent };
}

// ─── 툴 동작 힌트 (MCP annotations) ───────────────────────────────────────────
// 클라이언트가 read-only/파괴성/멱등성/외부호출 여부를 판단하는 데 쓴다.
const PURE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };        // 순수 함수 — 프롬프트/카탈로그/루브릭
const READ_REMOTE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };  // 외부 저장소 읽기
const WRITE_LOCAL = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }; // 새 파일 생성 — 로컬 픽셀 툴
const RENDER = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };       // 외부 API 호출 + 파일 생성

// 프롬프트 툴 공통 출력 스키마.
const PROMPT_OUT = {
  prompt: z.string().describe("생성된 프로덕션 프롬프트 — 그대로 nexus_render_image 의 prompt 로 전달"),
  renderHint: z.string().optional().describe("권장 렌더 설정(aspectRatio·imageSize·참조 첨부 방법 등)"),
};

const TYPECORE_OUT = {
  ...PROMPT_OUT,
  engine: z.enum(["sovereign", "breeze"]),
  exactText: z.string(),
  background: z.literal("black"),
  nextTool: z.literal("nexus_render_image"),
  resolvedOptions: z.record(z.string(), z.any()).optional(),
  selectionReasons: z.array(z.string()).optional(),
};

const TYPECORE_ASPECTS = ["1:1", "16:9", "21:9"];
const TYPECORE_LAYOUTS = ["1Line", "2Lines", "3Lines"];

let _firebaseConfig = null;
function firebaseConfig() {
  if (_firebaseConfig) return _firebaseConfig;
  const values = { projectId: process.env.VITE_FIREBASE_PROJECT_ID, apiKey: process.env.VITE_FIREBASE_API_KEY };
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    for (const [key, field] of [["VITE_FIREBASE_PROJECT_ID", "projectId"], ["VITE_FIREBASE_API_KEY", "apiKey"]]) {
      if (values[field]) continue;
      const m = env.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, "m"));
      if (m) values[field] = m[1].replace(/^["']|["']$/g, "");
    }
  } catch { /* .env 없음 */ }
  _firebaseConfig = values;
  return values;
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return value;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function decodeFirestoreDocument(doc) {
  const id = String(doc?.name || "").split("/").pop();
  return { id, ...decodeFirestoreFields(doc?.fields || {}) };
}

function bannerTimestamp(value) {
  if (typeof value === "number") return value;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function bannerSummary(banner) {
  return {
    id: banner.id,
    title: banner.title || banner.originalTitle || "제목 없음",
    game: banner.game || null,
    year: banner.year || null,
    date: banner.date || null,
    character: banner.character || null,
    score: Number.isFinite(Number(banner.score)) ? Number(banner.score) : null,
    tags: Array.isArray(banner.tags) ? banner.tags : [],
    imageUrl: banner.imageUrl || null,
    thumbnailUrl: banner.thumbnailUrl || null,
    path: banner.path || null,
    featured: !!banner.featured,
    liked: !!banner.liked,
    createdAt: banner.createdAt || null,
  };
}

function brandWebSummary(entry) {
  const pages = Array.isArray(entry.pages) ? entry.pages : [];
  return {
    id: entry.id,
    title: entry.title || entry.sourceProjectName || "브랜드 웹",
    game: entry.game || null,
    year: entry.year || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    previewUrl: entry.preview || entry.full_image || pages[0]?.url || null,
    desktopUrl: entry.full_image || pages.find((page) => page?.device === "pc")?.url || null,
    mobileUrl: entry.mobile_image || pages.find((page) => page?.device === "mobile")?.url || null,
    pageCount: Number(entry.pageCount || pages.length || 0),
    devices: [...new Set(pages.map((page) => page?.device).filter(Boolean))],
    description: entry.sourceDescription || null,
    sourceProjectId: entry.sourceProjectId || null,
    visibility: entry.visibility || "public",
    liked: Number(entry.liked || 0),
    createdAt: entry.created_at || entry.createdAt || null,
  };
}

function promotionScore(entry) {
  const raw = entry.webAiScore ?? entry.designScore;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value > 10 ? Number((value / 10).toFixed(2)) : value;
}

function promotionSummary(entry) {
  return {
    id: entry.id,
    title: entry.title || "제목 없음",
    game: entry.game || null,
    year: entry.year || null,
    date: entry.date || entry.date_info || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    summary: entry.summary || entry.description || null,
    score: promotionScore(entry),
    previewUrl: entry.preview || entry.full_image || null,
    desktopUrl: entry.full_image || entry.preview || null,
    mobileUrl: entry.mobile_image || null,
    assetType: entry.assetType || "프로모션",
    visibility: entry.visibility || "public",
    liked: Number(entry.liked || 0),
    createdAt: entry.created_at || entry.createdAt || null,
  };
}

function promptArcArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const source = value.trim();
  if (!source.startsWith("[") || !source.endsWith("]")) return [];
  try { const parsed = JSON.parse(source); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function promptArcFlat(value) {
  return promptArcArray(value).flat(Infinity).filter((item) => typeof item === "string" && item.trim());
}

function promptArcSafeUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;
}

function promptArcNature(entry) {
  if (entry.type === "video" || entry.type === "모션") return "motion";
  const tags = new Set([...promptArcArray(entry.tags), ...promptArcFlat(entry.stepTags)].map(String));
  if (tags.has("Motion")) return "motion";
  const haystack = [entry.title, entry.aiKeywords, ...promptArcFlat(entry.stepKeywords), ...tags].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
  if (tags.has("광원") || /광원|이펙트|파티클|후광|오라|glow|light\s?fx|flare|particle/i.test(haystack)) return "lightfx";
  if (tags.has("버튼") || /버튼|프레임|배지|패널|블릿|리스킨|button|frame|badge|panel/i.test(haystack)) return "object";
  if (tags.has("타이포") || /타이포|캘리그라피|레터링|타이틀|로고|2d|흑백|typo|lettering|calligraphy/i.test(haystack)) return "typography";
  if (/키비주얼|key\s?visual|\bkv\b|일러스트|씬|장면|배경|풍경|illustration|scene/i.test(haystack)) return "kv";
  if (tags.has("visualFX")) return "lightfx";
  return "other";
}

function promptArcIsPublic(entry) {
  if (entry.trashed) return false;
  if (entry.visibility === "private") return false;
  if (entry.visibility === "public") return true;
  return !entry.ownerUid && !entry.temporary;
}

function nexusLibraryEntryReadable(entry) {
  if (!entry || entry.trashed) return false;
  if (promptArcIsPublic(entry)) return true;
  const uid = readNexusAuth()?.uid;
  return !!uid && (entry.ownerUid === uid || entry.authorId === uid);
}

function promptArcSummary(entry) {
  const images = promptArcArray(entry.images).map(promptArcSafeUrl).filter(Boolean);
  const videos = promptArcArray(entry.videos).map(promptArcSafeUrl).filter(Boolean);
  const thumbnailUrl = promptArcSafeUrl(entry.thumbnail) || images[0] || promptArcSafeUrl(entry.image) || null;
  return {
    id: entry.id,
    title: entry.title || "제목 없음",
    tags: promptArcArray(entry.tags).map(String),
    keywords: entry.aiKeywords || promptArcFlat(entry.stepKeywords).join(", ") || null,
    description: entry.description || null,
    nature: promptArcNature(entry),
    type: entry.type || null,
    thumbnailUrl,
    imageCount: images.length,
    videoCount: videos.length,
    model: entry.optimizedModel || null,
    isPinned: !!entry.isPinned,
    isLive: !!entry.isLive,
    views: Number(entry.views || 0),
    likeCount: Number(entry.likeCount || 0),
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null,
  };
}

async function firestoreRequest(documentPath, params = {}) {
  const { projectId, apiKey } = firebaseConfig();
  if (!projectId || !apiKey) throw new Error(".env에 VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY가 필요합니다.");
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const url = new URL(`${base}/${documentPath}`);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) if (value != null && value !== "") url.searchParams.set(key, String(value));
  const auth = await currentNexusAuth().catch(() => null);
  const headers = { Accept: "application/json" };
  if (auth?.idToken) headers.Authorization = `Bearer ${auth.idToken}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try { message = JSON.parse(body)?.error?.message || body; } catch { /* text 응답 */ }
    throw new Error(`Firestore ${response.status}: ${message}`);
  }
  return response.json();
}

async function firestoreCollectionAll(documentPath, { maxDocuments = 10000 } = {}) {
  const documents = [];
  let pageToken;
  do {
    const payload = await firestoreRequest(documentPath, {
      pageSize: 100,
      pageToken,
      showMissing: false,
    });
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || null;
    if (documents.length >= maxDocuments) {
      throw new Error(`전체 정렬 안전 제한(${maxDocuments}건)을 초과했습니다.`);
    }
  } while (pageToken);
  return documents;
}

function scorePageOffset(pageToken) {
  const match = String(pageToken || '').match(/^score:(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function normalizedTitleText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function titleLineDirective(value, layout) {
  const supplied = normalizedTitleText(value).split("\n").map((s) => s.trim()).filter(Boolean);
  if (supplied.length > 1) return supplied.map((line, i) => `Line ${i + 1}: "${line}"`).join(" / ");
  if (layout === "1Line") return `One horizontal row: "${supplied[0] || ""}"`;
  return `${layout === "3Lines" ? "Exactly three" : "Exactly two"} balanced rows; preserve word boundaries and reading order.`;
}

function buildSovereignMcpPrompt(a) {
  const title = normalizedTitleText(a.text);
  const resolved = resolveSovereignOptions({ archetype: a.archetype, preset: a.preset });
  const o = resolved.options;
  const persona = sovereignArchetypes.find((p) => p.id === resolved.archetype) || sovereignArchetypes[0];
  const option = (list, id, fallback = id) => sovereignOptionEn(list || [], id) || fallback;
  const shape = sovereignOptions.shapePresets?.find((item) => item.id === a.preset);
  const lineDirective = titleLineDirective(title, a.layout);
  const ir = {
    inputText: title,
    activeCoreData: persona,
    shapeStyleEn: shape?.en || "",
    weightEn: option(sovereignOptions.stemWeights, o.stemWeight),
    widthEn: option(sovereignOptions.widths, o.charWidth),
    proportionEn: option(sovereignOptions.proportions, o.charProportion),
    kerningEn: option(sovereignOptions.kerningOptions, o.kerning),
    letterConnEn: option(sovereignOptions.letterConnections, o.letterConnection),
    internalSpaceEn: option(sovereignOptions.internalSpaces, o.internalSpace),
    terminalEn: option(sovereignOptions.terminalStyles, o.terminalStyle),
    sharpnessEn: option(sovereignOptions.strokeSharpness, o.strokeSharpness),
    cornerEn: option(sovereignOptions.cornerStyles, o.cornerStyle),
    extensionEn: option(sovereignOptions.strokeExtensions, o.strokeExtension),
    userAuraEn: String(a.extra || "").trim() || "Standard deployment",
    modIntensityEn: a.enhanceMode === "deconstruct" ? "bold" : a.enhanceMode === "variation" ? "moderate" : "controlled",
    modAllowedEn: a.enhanceMode === "refine" ? "optical correction, edge cleanup, proportion refinement" : a.enhanceMode === "variation" ? "controlled stroke and counterform variation" : "intentional structural deconstruction within legibility limits",
    modForbiddenEn: "text mutation, layout drift, color, depth, material rendering",
    readabilityFloorEn: a.enhanceMode === "deconstruct" ? "70%" : "95%",
    momentumActive: !!a.momentum,
    kineticEn: option(sovereignOptions.kineticVelocities, o.kineticVelocity),
    slantEn: option(sovereignOptions.slantAngles, o.slantAngle),
    slicingEn: option(sovereignOptions.slicingIntensities, o.slicingIntensity),
    cgTextInstruction: `Render the requested title with this exact row contract: ${lineDirective}`,
    layoutEn: a.layout === "1Line" ? "strict single horizontal row, no stacking" : a.layout === "2Lines" ? "exactly two balanced stacked rows" : "exactly three balanced stacked rows",
    mmoSilhouetteEn: "centered title lockup with stable baseline and uncropped glyphs",
    occupancyEn: `${a.occupancy}% of the canvas`,
    aspectRatio: a.aspectRatio,
    bgDescEn: "solid opaque white letterforms on a uniform pure black (#000000) background",
    hasTexture: o.strokeTexture !== "Tex_Clean",
    hasDamage: o.deformationDamage !== "Damage_None",
    surfaceEn: `${option(sovereignOptions.strokeTextures, o.strokeTexture)}, ${option(sovereignOptions.deformationDamages, o.deformationDamage)}`,
    mmoSurroundingElementEn: "none",
  };
  return {
    prompt: compileSovereignImagenPrompt({ ir, isEnhanceModeEnabled: true, enhanceMode: a.enhanceMode, surroundingMode: "Clean" }),
    resolvedOptions: { archetype: resolved.archetype, preset: a.preset, ...o },
    selectionReasons: [
      `archetype ${resolved.archetype}: ${persona.shortTitle}`,
      a.preset ? `preset ${a.preset}: shared Sovereign preset applied after persona defaults` : "preset none: persona defaults retained",
      `layout ${a.layout}, aspect ${a.aspectRatio}, occupancy ${a.occupancy}%`,
    ],
  };
}

function buildBreezeMcpPrompt(a) {
  const title = normalizedTitleText(a.text);
  const raw = {
    inputText: title, aiPersona: a.persona, personaSliderValue: a.intensity,
    customDesignInjections: String(a.extra || "").trim(), enhanceMode: a.enhanceMode,
    momentumActive: !!a.momentum, baseStyle: "BlackWhite", aspectRatio: a.aspectRatio,
    occupancy: `${a.occupancy}%`, layoutType: a.layout,
    stemWeight: "Weight_Chunky", charWidth: "Normal", charProportion: "P_Std",
    kerning: "Kern_Std", scriptType: "Casual_Bubble", terminalStyle: "End_Round",
    strokeTexture: "Tex_Smooth", strokeSharpness: "Sharp_Soft", strokeExtension: "Ext_None",
    slantAngle: "Slant_0", rhythmDynamic: a.momentum ? "Rhythm_Bouncy" : "Rhythm_Calm",
    playfulDistortion: a.momentum ? "Distort_Squeeze" : "Distort_None",
    analogImperfection: "Imp_None", internalDecoration: "Solid",
    textFlow: a.momentum ? "Bouncy" : "Straight", letterConnection: "Separated",
    casualSurrounding: "Clean",
    dynamicOptions: { CasualStyles: [], strokeTextures: [], analogImperfections: [], strokeEnds: [], strokeWeights: [], strokeSharpness: [], widths: [], kerningOptions: [], strokeExtensions: [], rhythmDynamics: [], playfulDistortions: [] },
    isAdvancedOptionsEnabled: false, aiModel: "NanoBanana", isOutdated: true, nanoViewMode: "enhanced",
  };
  const built = buildBreezePrompts(raw);
  return `${built.baseTechnical.en}\n\n[TYPECORE BREEZE MCP OUTPUT CONTRACT]\nUse solid opaque white lettering on the native uniform pure black (#000000) background. Output typography only, ready for later Render Matrix material rendering.`;
}

function ensureOutDir(dir) { fs.mkdirSync(dir, { recursive: true }); return dir; }

function fileToInlineData(p) {
  const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
  return { mimeType, data: buf.toString("base64") };
}

const hexToRgb = (hex) => {
  const m = String(hex || "").trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// @napi-rs/canvas 는 네이티브 모듈 — 픽셀 툴에서만 지연 로드.
let _canvasMod = null;
async function canvasMod() {
  if (!_canvasMod) _canvasMod = await import("@napi-rs/canvas");
  return _canvasMod;
}
async function loadImageData(imagePath) {
  const { createCanvas, loadImage } = await canvasMod();
  const abs = path.isAbsolute(imagePath) ? imagePath : path.join(ROOT, imagePath);
  const img = await loadImage(abs);
  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return { imageData: ctx.getImageData(0, 0, img.width, img.height), width: img.width, height: img.height };
}
async function saveImageData(imageData, outPath) {
  const { createCanvas } = await canvasMod();
  const cv = createCanvas(imageData.width, imageData.height);
  cv.getContext("2d").putImageData(imageData, 0, 0);
  fs.writeFileSync(outPath, cv.toBuffer("image/png"));
  return outPath;
}
// 코너 4곳 샘플로 배경색 자동 감지 (최빈 코너색).
function detectBgColor(d, W, H) {
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const corners = [px(2, 2), px(W - 3, 2), px(2, H - 3), px(W - 3, H - 3)];
  corners.sort((a, b) => (a[0] * 65536 + a[1] * 256 + a[2]) - (b[0] * 65536 + b[1] * 256 + b[2]));
  return corners[1]; // 정렬 후 중간값 성격 — 한 코너에 피사체가 걸려도 안전
}

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

// ─── 옵션 카탈로그 (nexus_list_options 응답) ──────────────────────────────────
const brief = (arr, extra = []) => arr.map((o) => {
  const out = { id: o.id ?? o.key, label: o.label ?? o.ko ?? "" };
  for (const k of extra) if (o[k] != null) out[k] = o[k];
  return out;
});
const OPTION_CATALOG = () => ({
  frameforge: {
    assetType: brief(FRAMEFORGE_ASSET_TYPES),
    silhouette: FRAMEFORGE_SILHOUETTES.map((o) => ({ id: o.key, label: o.ko, for: o.for })),
    mood: brief(FRAMEFORGE_MOODS),
    renderStyle: brief(FRAMEFORGE_RENDER_STYLES),
  },
  lightfx: {
    category: brief(LIGHTFX_CATEGORIES, ["desc"]),
    form: brief(LIGHTFX_FORMS, ["desc"]),
    style: brief(LIGHTFX_STYLES, ["desc"]),
    color: brief(LIGHTFX_COLORS, ["desc"]),
    material: brief(LIGHTFX_MATERIALS, ["desc"]),
    grain: brief(LIGHTFX_GRAINS, ["desc"]),
    bokeh: brief(LIGHTFX_BOKEHS, ["desc"]),
    intensity: ["subtle", "medium", "strong"],
    shape: ["none", "square", "circle", "rectangle"],
    bg: brief(BG_COLORS, ["hex", "desc"]),
  },
  variation: {
    moods: brief(VARIATION_MOODS, ["desc"]),
    styles: Object.fromEntries(Object.entries(VARIATION_STYLES).map(([mood, list]) => [mood, brief(list)])),
    refinement: brief(REFINEMENT_LEVELS, ["desc"]),
    temperature: brief(ATMOSPHERE_TEMPERATURE, ["desc"]),
    age: brief(ATMOSPHERE_AGE, ["desc"]),
    bg: brief(BG_COLORS, ["hex", "desc"]),
  },
  designAlternative: {
    direction: brief(DESIGN_VARIATIONS, ["desc"]),
    strength: brief(VARIATION_STRENGTH, ["desc"]),
  },
  itemBundle: {
    light: brief(BUNDLE_LIGHT_OPTIONS),
    ground: brief(BUNDLE_GROUND_OPTIONS),
    magicColor: brief(BUNDLE_MAGIC_COLORS),
    bg: brief(BUNDLE_BG_OPTIONS),
    layout: brief(BUNDLE_LAYOUT_OPTIONS),
    note: "magicColor 는 colorable ground(마법진·연기·회오리·글로우 계열)에서만 적용",
  },
  characterFx: {
    light: brief(CHAR_LIGHT_OPTIONS),
    particle: brief(CHAR_PARTICLE_OPTIONS),
    intensity: brief(CHAR_INTENSITY_OPTIONS),
    bg: brief(CHAR_BG_OPTIONS, ["fill"]),
  },
  typecore: {
    sovereignArchetype: sovereignArchetypes.map((p) => ({ id: p.id, label: p.shortTitle, description: p.subtitle })),
    sovereignPreset: Object.keys(sovereignPresets),
    breezePersona: breezePersonas.map((p) => ({ id: p.id, label: p.shortTitle, description: p.subtitle })),
    aspectRatio: TYPECORE_ASPECTS,
    layout: TYPECORE_LAYOUTS,
  },
  renderModels: [
    { id: "gemini-3-pro-image-preview", label: "Nano Banana Pro — 고품질(1K/2K/4K)" },
    { id: "gemini-3.1-flash-image-preview", label: "Nano Banana 2 — 빠름(1K)" },
  ],
});

// ─── 서버 정의 ────────────────────────────────────────────────────────────────
const server = new McpServer({ name: "nexus-studio", version: "1.0.0" });

server.registerTool("nexus_guide", {
  title: "NEXUS Studio 가이드",
  description: "NEXUS Studio MCP 사용법 개요 — 어떤 툴을 어떤 순서로 조합하는지. 처음이라면 이 툴부터 호출하세요.",
  inputSchema: {},
  annotations: PURE,
}, async () => text(`NEXUS Studio MCP — NC 게임 프로모션 디자인 플랫폼의 프롬프트 엔진·렌더·픽셀 툴 모음.

■ 기본 흐름
1) nexus_list_options 로 옵션 카탈로그(id 목록) 확인
2) 프롬프트 툴로 검증된 프로덕션 프롬프트 생성:
   · nexus_frameforge_prompt     — FrameForge 프레임·버튼·박스·배지·디바이더·아이콘 생성
   · nexus_lightfx_prompt        — 광원/빛효과 에셋 (순흑/단색 배경, 합성용)
   · nexus_variation_prompt      — UI 에셋 리스킨(컬러·재질 오버레이 패스, 구조 보존)
   · nexus_design_alternative_prompt — 디자인 대안(모티프·재질 재해석, 골격 유지)
   · nexus_item_bundle_prompt    — 아이템 여러 개 → 꾸러미 합성 (원본 절대 보존)
   · nexus_quality_up_prompt     — KV 배경 품질 향상 (캐릭터·타이틀 형태 보존)
   · nexus_character_fx_prompt   — 캐릭터에 빛·파티클 연출 (형태 99%·얼굴 99.9% 보존)
   · nexus_typecore_sovereign_prompt — Typecore Sovereign RPG/게임 타이틀 프롬프트
   · nexus_typecore_breeze_prompt    — Typecore Breeze 캐주얼/캘리 타이틀 프롬프트
3) nexus_render_image 로 Gemini 이미지 모델 호출 (참조 이미지 파일 첨부 가능)
4) 후처리 픽셀 툴:
   · nexus_remove_background     — 단색 배경(블랙/크로마) 키잉 → 투명 PNG
   · nexus_split_character_effect — 캐릭터/발광 이펙트 분리 (스크린 블렌드 레이어)
   · nexus_remove_ai             — 위 로컬 방식의 QA가 실패한 경우에만 사용하는 Remove.bg AI 최종 fallback
   투명화 우선순위: 색상 키잉/이펙트 알파/캐릭터 분리 같은 로컬·결정적 방식 → 알파·가장자리·닫힌 공간 QA → 실패 시에만 nexus_remove_ai.
5) nexus_design_rubric — 결과물 평가용 디자인 루브릭
6) Banner Codex 라이브러리:
   · nexus_banner_codex_list — 저장 배너 목록·검색·필터
   · nexus_banner_codex_get  — 배너 1건 상세 메타데이터
7) Brand Web 라이브러리:
   · nexus_brand_web_library_list — 브랜드웹 목록·검색·필터
   · nexus_brand_web_library_get  — 브랜드웹 1건과 전체 페이지 상세
8) Promotion 라이브러리:
   · nexus_promotion_library_list — 프로모션 목록·검색·점수 필터
   · nexus_promotion_library_get  — 프로모션 1건과 PC/모바일·평가 상세
9) Prompt Arc 라이브러리:
   · nexus_prompt_arc_list — 공개 프롬프트·타이포·이미지 검색
   · nexus_prompt_arc_get  — 프롬프트 단계·이미지·연관 항목 상세

■ 규약
- 아이템 꾸러미 렌더는 참조를 "아이템 1개 = 이미지 1장" 으로 첨부해야 중복이 안 생깁니다 (itemCount = 참조 수).
- 캐릭터 연출·품질 향상 렌더는 원본 1장을 참조로 첨부, matchInputAspect 없이 4K 권장.
- 광원 에셋은 순흑 배경 렌더 후 nexus_remove_background(black) 로 알파 추출하거나 스크린 블렌드로 합성.`));

server.registerTool("nexus_list_options", {
  title: "옵션 카탈로그",
  description: "모든 프롬프트 툴의 선택지(id·한글 라벨)를 JSON 으로 반환. 프롬프트 툴 호출 전 참조.",
  inputSchema: {},
  outputSchema: {
    frameforge: z.record(z.string(), z.any()).describe("nexus_frameforge_prompt 선택지"),
    lightfx: z.record(z.string(), z.any()).describe("nexus_lightfx_prompt 선택지"),
    variation: z.record(z.string(), z.any()).describe("nexus_variation_prompt 선택지"),
    designAlternative: z.record(z.string(), z.any()).describe("nexus_design_alternative_prompt 선택지"),
    itemBundle: z.record(z.string(), z.any()).describe("nexus_item_bundle_prompt 선택지"),
    characterFx: z.record(z.string(), z.any()).describe("nexus_character_fx_prompt 선택지"),
    typecore: z.record(z.string(), z.any()).describe("Typecore Sovereign/Breeze 선택지"),
    renderModels: z.array(z.any()).describe("nexus_render_image 모델 목록"),
  },
  annotations: PURE,
}, async () => {
  const catalog = OPTION_CATALOG();
  return data(catalog, JSON.stringify(catalog, null, 2));
});

server.registerTool("nexus_frameforge_prompt", {
  title: "FrameForge UI 에셋 프롬프트",
  description: "Nexus FrameForge 앱의 실제 옵션과 buildCompletePrompt 엔진으로 프레임·버튼·박스·배지·디바이더·아이콘 생성 프롬프트를 만듭니다. 결과를 nexus_render_image에 전달하세요.",
  inputSchema: {
    assetType: z.enum(FRAMEFORGE_ASSET_TYPES.map((o) => o.key)).describe("용도: button, box, frame, badge, divider, icon"),
    silhouette: z.enum(FRAMEFORGE_SILHOUETTES.map((o) => o.key)).describe("nexus_list_options의 frameforge.silhouette id. 선택한 assetType과 for가 일치해야 함"),
    mood: z.enum(FRAMEFORGE_MOODS.map((o) => o.key)).default("dark_rpg").describe("분위기 프리셋"),
    renderStyle: z.enum(FRAMEFORGE_RENDER_STYLES.map((o) => o.key)).default("illustrated").describe("렌더 표현 방식"),
    userText: z.string().max(1000).optional().describe("추가 제작 의도. 결과 에셋 내부에 실제 글자를 생성하라는 의미로 사용하지 않음"),
  },
  outputSchema: {
    prompt: z.string(),
    renderHint: z.string(),
    resolvedOptions: z.record(z.string(), z.any()),
    nextTool: z.literal("nexus_render_image"),
  },
  annotations: PURE,
}, async (a) => {
  const assetType = FRAMEFORGE_ASSET_TYPES.find((o) => o.key === a.assetType);
  const silhouette = FRAMEFORGE_SILHOUETTES.find((o) => o.key === a.silhouette);
  if (!silhouette?.for?.includes(a.assetType)) {
    return errText(`FrameForge 형태 '${a.silhouette}'는 용도 '${a.assetType}'에 사용할 수 없습니다.`);
  }
  const mood = FRAMEFORGE_MOODS.find((o) => o.key === a.mood) || FRAMEFORGE_MOODS[0];
  const renderStyle = FRAMEFORGE_RENDER_STYLES.find((o) => o.key === a.renderStyle) || FRAMEFORGE_RENDER_STYLES[0];
  const prompt = buildFrameForgeMcpPrompt({ assetType, silhouette, mood, renderStyle, userText: a.userText || "" });
  const resolvedOptions = {
    assetType: assetType.key,
    silhouette: silhouette.key,
    mood: mood.key,
    preset: mood.preset,
    material: mood.material,
    ornament: mood.ornament,
    interior: "empty",
    renderStyle: renderStyle.key,
  };
  const renderHint = "참조 이미지 없음 · 프롬프트의 단색 고대비 배경 유지 · Pro 1K 또는 Flash 1K 초안 · 렌더 후 nexus_remove_background로 투명화";
  return data({ prompt, renderHint, resolvedOptions, nextTool: "nexus_render_image" }, `${prompt}\n\n[렌더 힌트] ${renderHint}`);
});

server.registerTool("nexus_typecore_sovereign_prompt", {
  title: "Typecore Sovereign 타이틀 프롬프트",
  description: "Nexus Typecore Sovereign의 실제 페르소나/조형 언어로 RPG·전투·시네마틱 게임 타이틀용 2D 흑백 프롬프트를 생성합니다. 결과를 nexus_render_image에 전달하세요.",
  inputSchema: {
    text: z.string().min(1).max(120).describe("정확히 렌더할 타이틀 문구. 줄바꿈 유지"),
    archetype: z.enum(sovereignArchetypes.map((p) => p.id)).default("core_fortress").describe("nexus_list_options의 typecore.sovereignArchetype id"),
    preset: z.enum(["", ...Object.keys(sovereignPresets)]).default("").describe("공용 Sovereign 글자 모양 프리셋. 빈 값은 페르소나 기본값"),
    aspectRatio: z.enum(TYPECORE_ASPECTS).default("16:9").describe("출력 비율"),
    layout: z.enum(TYPECORE_LAYOUTS).default("1Line").describe("타이틀 줄 구성 (1/2/3줄)"),
    occupancy: z.number().int().min(30).max(85).default(70).describe("캔버스 내 타이틀 점유율(%)"),
    enhanceMode: z.enum(["refine", "variation", "deconstruct"]).default("refine").describe("조형 정제 방식 — refine(정제)·variation(변주)·deconstruct(해체)"),
    momentum: z.boolean().default(false).describe("동세/율동감 강조"),
    extra: z.string().max(1000).optional().describe("추가 조형 방향"),
  },
  outputSchema: TYPECORE_OUT,
  annotations: PURE,
}, async (a) => {
  const exactText = normalizedTitleText(a.text);
  const compiled = buildSovereignMcpPrompt(a);
  const prompt = compiled.prompt;
  const renderHint = `aspectRatio: ${a.aspectRatio} · Flash 1K 초안 또는 Pro 1K · 참조 이미지 없음 · 순흑 배경`;
  return data({ prompt, renderHint, engine: "sovereign", exactText, background: "black", nextTool: "nexus_render_image", resolvedOptions: compiled.resolvedOptions, selectionReasons: compiled.selectionReasons }, `${prompt}\n\n[선택 옵션]\n${compiled.selectionReasons.join("\n")}\n\n[렌더 힌트] ${renderHint}`);
});

server.registerTool("nexus_typecore_breeze_prompt", {
  title: "Typecore Breeze 타이틀 프롬프트",
  description: "Nexus Typecore Breeze 앱의 실제 buildPrompts 엔진으로 캐주얼·캘리·스티커 타이틀용 2D 흑백 프롬프트를 생성합니다. 결과를 nexus_render_image에 전달하세요.",
  inputSchema: {
    text: z.string().min(1).max(120).describe("정확히 렌더할 타이틀 문구. 줄바꿈 유지"),
    persona: z.enum(breezePersonas.map((p) => p.id)).default("bubble_pop").describe("nexus_list_options의 typecore.breezePersona id"),
    aspectRatio: z.enum(TYPECORE_ASPECTS).default("16:9").describe("출력 비율"),
    layout: z.enum(TYPECORE_LAYOUTS).default("1Line").describe("타이틀 줄 구성 (1/2/3줄)"),
    occupancy: z.number().int().min(30).max(85).default(70).describe("캔버스 내 타이틀 점유율(%)"),
    intensity: z.number().int().min(0).max(100).default(50).describe("페르소나 강도 슬라이더 (0–100)"),
    enhanceMode: z.enum(["perfection", "wild", "creative"]).default("perfection").describe("정제 방식 — perfection(완성도)·wild(과감)·creative(창의)"),
    momentum: z.boolean().default(false).describe("동세/율동(바운시) 강조"),
    extra: z.string().max(1000).optional().describe("추가 조형 방향"),
  },
  outputSchema: TYPECORE_OUT,
  annotations: PURE,
}, async (a) => {
  const exactText = normalizedTitleText(a.text);
  const prompt = buildBreezeMcpPrompt(a);
  const renderHint = `aspectRatio: ${a.aspectRatio} · Flash 1K 초안 또는 Pro 1K · 참조 이미지 없음 · 순흑 배경`;
  const resolvedOptions = { persona: a.persona, aspectRatio: a.aspectRatio, layout: a.layout, occupancy: a.occupancy, intensity: a.intensity, enhanceMode: a.enhanceMode, momentum: a.momentum };
  const selectionReasons = [`persona ${a.persona}: native Breeze buildPrompts`, `layout ${a.layout}, aspect ${a.aspectRatio}, occupancy ${a.occupancy}%`];
  return data({ prompt, renderHint, engine: "breeze", exactText, background: "black", nextTool: "nexus_render_image", resolvedOptions, selectionReasons }, `${prompt}\n\n[선택 옵션]\n${selectionReasons.join("\n")}\n\n[렌더 힌트] ${renderHint}`);
});

// ─── 렌더 ─────────────────────────────────────────────────────────────────────
server.registerTool("nexus_render_image", {
  title: "Gemini 이미지 렌더",
  description: "프롬프트(+참조 이미지 파일)로 Gemini 이미지 모델을 호출해 PNG 를 저장하고 경로를 반환. 프롬프트 툴과 조합해 사용. GEMINI_API_KEY 필요.",
  inputSchema: {
    prompt: z.string().describe("이미지 생성 프롬프트 (nexus_*_prompt 툴 결과 권장)"),
    model: z.enum(["gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview"]).default("gemini-3-pro-image-preview").describe("Pro=고품질(2K/4K), Flash=빠름(1K)"),
    referenceImagePaths: z.array(z.string()).max(8).optional().describe("참조 이미지 파일 경로들 (png/jpg/webp). 아이템 꾸러미는 아이템당 1장"),
    aspectRatio: z.string().regex(/^\d{1,2}:\d{1,2}$/, "형식은 'W:H' (예: 1:1, 16:9, 4:3, 21:9)").optional().describe("가로:세로 비율 — 예: 1:1, 16:9, 4:3, 21:9. 생략 시 모델 기본"),
    imageSize: z.enum(["1K", "2K", "4K"]).optional().describe("Pro 모델 전용 해상도 (Flash 는 무시)"),
    outputPath: z.string().optional().describe("저장 경로(.png 권장). 생략 시 .tmp/mcp-out/ 아래 자동"),
  },
  outputSchema: {
    outputPath: z.string().describe("저장된 PNG 절대경로"),
    model: z.string().describe("사용된 모델 id"),
    imageSize: z.string().optional().describe("적용된 해상도 (Pro 만)"),
    aspectRatio: z.string().optional().describe("적용된 비율"),
  },
  annotations: RENDER,
}, async ({ prompt, model, referenceImagePaths, aspectRatio, imageSize, outputPath }) => {
  const key = geminiKey();
  if (!key) return errText("GEMINI_API_KEY 가 없습니다 — 환경변수 또는 리포 루트 .env 에 설정하세요 (VITE_ 접두사 아님).");
  const parts = [];
  for (const p of referenceImagePaths || []) {
    try { parts.push({ inlineData: fileToInlineData(p) }); }
    catch (e) { return errText(`참조 이미지를 읽을 수 없습니다: ${p} — ${e.message}`); }
  }
  parts.push({ text: prompt });
  const generationConfig = { responseModalities: ["IMAGE", "TEXT"] };
  const isPro = /-pro-/.test(model);
  const size = isPro ? (imageSize || "2K") : undefined;
  if (aspectRatio || size) {
    generationConfig.imageConfig = {};
    if (aspectRatio) generationConfig.imageConfig.aspectRatio = aspectRatio;
    if (size) generationConfig.imageConfig.imageSize = size;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig }),
    });
  } catch (e) {
    return errText(`Gemini API 호출 실패(네트워크): ${e.message} — 연결 상태를 확인하고 다시 시도하세요.`);
  }
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message || ""; } catch { /* 상태코드만 */ }
    const hint = res.status === 401 || res.status === 403 ? " — GEMINI_API_KEY 를 확인하세요."
      : res.status === 429 ? " — 요청 한도 초과, 잠시 후 재시도하세요." : "";
    return errText(`Gemini API ${res.status}${detail ? ` — ${detail}` : ""}${hint}`);
  }
  let payload;
  try { payload = await res.json(); }
  catch (e) { return errText(`Gemini 응답을 파싱할 수 없습니다: ${e.message}`); }
  const resParts = payload.candidates?.[0]?.content?.parts || [];
  const imgPart = resParts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
  if (!imgPart) {
    const reason = payload.candidates?.[0]?.finishReason || payload.promptFeedback?.blockReason || "unknown";
    const textOut = resParts.find((p) => p.text)?.text || "";
    return errText(`이미지가 반환되지 않았습니다 (finishReason: ${reason}) — 프롬프트를 완화하거나(안전 필터) 문구를 바꿔 재시도하세요.${textOut ? `\n모델 텍스트: ${textOut.slice(0, 500)}` : ""}`);
  }
  const out = outputPath
    ? (path.isAbsolute(outputPath) ? outputPath : path.join(ROOT, outputPath))
    : path.join(ensureOutDir(OUT_DIR), `render-${Date.now()}.png`);
  try {
    ensureOutDir(path.dirname(out));
    fs.writeFileSync(out, Buffer.from(imgPart.inlineData.data, "base64"));
  } catch (e) {
    return errText(`이미지 저장 실패: ${out} — 출력 경로(outputPath)를 확인하세요. (${e.message})`);
  }
  return data(
    { outputPath: out, model, imageSize: size, aspectRatio: aspectRatio || undefined },
    `저장 완료: ${out}\n모델: ${model}${size ? ` · ${size}` : ""}${aspectRatio ? ` · ${aspectRatio}` : ""}`
  );
});

// ─── 프롬프트 툴 ──────────────────────────────────────────────────────────────
server.registerTool("nexus_lightfx_prompt", {
  title: "광원/빛효과 프롬프트",
  description: "RubiconForge 광원·빛효과 프롬프트 생성 — 순흑(또는 단색) 배경 위 합성용 발광 에셋. 결과를 nexus_render_image 에 전달. 옵션 id 는 nexus_list_options 참조.",
  inputSchema: {
    category: idEnum(LIGHTFX_CATEGORIES).describe("효과 종류"),
    style: idEnum(LIGHTFX_STYLES).describe("빛 질감/스타일"),
    color: idEnum(LIGHTFX_COLORS).describe("빛 색상"),
    form: idEnum(LIGHTFX_FORMS).optional().describe("배치 형태 (생략=자유)"),
    material: idEnum(LIGHTFX_MATERIALS).optional().describe("재질/표면 (형태 변형)"),
    grain: idEnum(LIGHTFX_GRAINS).optional().describe("입자 크기"),
    bokeh: idEnum(LIGHTFX_BOKEHS).optional().describe("보케 크기"),
    intensity: z.enum(["subtle", "medium", "strong"]).default("medium"),
    shape: z.enum(["none", "square", "circle", "rectangle"]).default("none").describe("전체 실루엣 가이드"),
    bg: idEnum(BG_COLORS).default("black").describe("배경 단색"),
    userText: z.string().optional().describe("추가 요청 (자유 텍스트)"),
    hasRef: z.boolean().default(false).describe("참조 이미지를 첨부해 그 위치/실루엣에 앵커할지"),
    index: z.number().int().min(0).default(0).describe("베리에이션 번호"),
    compact: z.boolean().default(false).describe("true=챗 붙여넣기용 컴팩트 버전"),
  },
  outputSchema: PROMPT_OUT,
  annotations: PURE,
}, async (a) => {
  const cat = LIGHTFX_CATEGORY_BY_ID[a.category];
  const style = LIGHTFX_STYLE_BY_ID[a.style];
  const color = LIGHTFX_COLOR_BY_ID[a.color];
  const form = a.form ? LIGHTFX_FORM_BY_ID[a.form] : null;
  const args = {
    categoryHint: cat.promptHint,
    styleHint: style.hint,
    colorHint: color.hint,
    userText: a.userText || "",
    hasRef: !!a.hasRef,
    formHint: form?.placementHint || "",
    intensity: a.intensity,
    shape: a.shape,
    index: a.index,
    bg: BG_COLOR_BY_ID[a.bg] || DEFAULT_BG,
    materialHint: a.material ? (LIGHTFX_MATERIAL_BY_ID[a.material]?.hint || "") : "",
    grainHint: a.grain ? (LIGHTFX_GRAIN_BY_ID[a.grain]?.hint || "") : "",
    bokehHint: a.bokeh ? (LIGHTFX_BOKEH_BY_ID[a.bokeh]?.hint || "") : "",
    edgeHug: !!(a.hasRef && form?.edgeHug),
  };
  const prompt = a.compact ? buildCompactLightFxPrompt(args) : buildLightFxPrompt(args);
  const renderHint = !a.hasRef && cat.ratio ? `aspectRatio: ${cat.ratio}` : undefined;
  return data({ prompt, renderHint }, prompt + (renderHint ? `\n\n[렌더 힌트] ${renderHint}` : ""));
});

server.registerTool("nexus_variation_prompt", {
  title: "UI 에셋 리스킨 프롬프트",
  description: "RubiconForge 리스킨(변형) 프롬프트 — 원본 UI 에셋(버튼/카드/프레임)을 참조로 첨부하고 컬러·재질만 바꾸는 오버레이 패스. 구조·장식 수·두께 보존이 핵심.",
  inputSchema: {
    style: idEnum(ALL_VARIATION_STYLES).describe("테마 스타일 (mood 별 목록은 nexus_list_options)"),
    refinement: idEnum(REFINEMENT_LEVELS).default("source").describe("장식 밀도 정제"),
    temperature: idEnum(ATMOSPHERE_TEMPERATURE).optional().describe("분위기 온도"),
    age: idEnum(ATMOSPHERE_AGE).optional().describe("세월/마감"),
    bg: idEnum(BG_COLORS).default("black").describe("배경 단색"),
    stripAmbientLight: z.boolean().default(false).describe("주변 광원 제거 — 오브젝트만"),
    outlineOnly: z.boolean().default(false).describe("외곽선만 디자인·내부 단색"),
    hasBackgroundRef: z.boolean().default(false).describe("두 번째 참조(배치될 배경) 첨부 여부"),
    compact: z.boolean().default(false).describe("true=챗 붙여넣기용 컴팩트 버전"),
  },
  outputSchema: PROMPT_OUT,
  annotations: PURE,
}, async (a) => {
  const style = STYLE_BY_ID[a.style];
  const args = {
    themeHint: style.promptHint,
    hasBackgroundRef: !!a.hasBackgroundRef,
    refinementLevel: a.refinement,
    temperature: a.temperature,
    age: a.age,
    stripAmbientLight: !!a.stripAmbientLight,
    outlineOnly: !!a.outlineOnly,
    bg: BG_COLOR_BY_ID[a.bg] || DEFAULT_BG,
  };
  const prompt = a.compact ? buildCompactVariationPrompt(args) : buildVariationPrompt(args);
  return data({ prompt }, prompt);
});

server.registerTool("nexus_design_alternative_prompt", {
  title: "디자인 대안 프롬프트",
  description: "RubiconForge 디자인 대안(리디자인) 프롬프트 — 원본 UI 에셋을 참조로 첨부하고 모티프·재질·내부 구성을 재해석. 골격(두께·비율·실루엣)은 유지.",
  inputSchema: {
    direction: idEnum(DESIGN_VARIATIONS).describe("변형 방향"),
    strength: idEnum(VARIATION_STRENGTH).default("moderate").describe("변형 강도"),
    extraDirection: z.string().optional().describe("추가 방향 지시 (자유 텍스트)"),
    bg: idEnum(BG_COLORS).default("black").describe("배경 단색"),
    stripAmbientLight: z.boolean().default(false).describe("주변 광원 제거 — 오브젝트만"),
    outlineOnly: z.boolean().default(false).describe("외곽선만 디자인·내부 단색"),
    hasBackgroundRef: z.boolean().default(false).describe("두 번째 참조(배치될 배경) 첨부 여부"),
    compact: z.boolean().default(false).describe("true=챗 붙여넣기용 컴팩트 버전"),
  },
  outputSchema: PROMPT_OUT,
  annotations: PURE,
}, async (a) => {
  const dir = DESIGN_VARIATION_BY_ID[a.direction];
  const strength = VARIATION_STRENGTH_BY_ID[a.strength];
  const directionBlock = a.extraDirection ? `${dir.promptBlock} ${String(a.extraDirection).trim()}` : dir.promptBlock;
  const args = {
    directionBlock, directionHint: directionBlock,
    strengthBlock: strength?.promptBlock, strengthHint: strength?.promptBlock,
    hasBackgroundRef: !!a.hasBackgroundRef,
    stripAmbientLight: !!a.stripAmbientLight,
    outlineOnly: !!a.outlineOnly,
    bg: BG_COLOR_BY_ID[a.bg] || DEFAULT_BG,
  };
  const prompt = a.compact ? buildCompactDesignAlternativePrompt(args) : buildDesignAlternativePrompt(args);
  return data({ prompt }, prompt);
});

server.registerTool("nexus_item_bundle_prompt", {
  title: "아이템 꾸러미 프롬프트",
  description: "NexusPreview 아이템 꾸러미 합성 프롬프트 — 아이템 이미지 N장을 참조로 첨부(1장=1아이템)하면 원본 형태·텍스트 절대 보존으로 한 꾸러미에 배치. itemCount 는 참조 수와 일치시켜야 중복이 안 생김.",
  inputSchema: {
    itemCount: z.number().int().min(1).max(8).describe("아이템(참조 이미지) 수 — 반드시 첨부 수와 일치"),
    light: keyEnum(BUNDLE_LIGHT_OPTIONS).default("soft").describe("빛 효과"),
    ground: keyEnum(BUNDLE_GROUND_OPTIONS).default("shadow").describe("바닥 이펙트"),
    magicColor: keyEnum(BUNDLE_MAGIC_COLORS).default("gold").describe("바닥 이펙트 색 (colorable ground 만 적용)"),
    bg: keyEnum(BUNDLE_BG_OPTIONS).default("black").describe("배경 (블랙/크로마 그린)"),
    layout: keyEnum(BUNDLE_LAYOUT_OPTIONS).default("normal").describe("배치 (기본/좁게)"),
    intent: z.string().optional().describe("추가 요청 — 예: '상자는 크게'"),
  },
  outputSchema: {
    ...PROMPT_OUT,
    itemCount: z.number().int().describe("첨부해야 하는 참조 이미지 수 (아이템당 1장)"),
    magicColorApplied: z.boolean().describe("magicColor 가 실제 적용됐는지 (colorable ground 여부)"),
  },
  annotations: PURE,
}, async (a) => {
  const prompt = buildBundlePrompt(a.light, a.ground, a.magicColor, a.intent || "", a.itemCount, a.bg, a.layout);
  const magicColorApplied = isColorableGround(a.ground);
  const renderHint = `aspectRatio: 4:3 · 참조 = 아이템당 1장 (${a.itemCount}장)`;
  const colorNote = magicColorApplied ? "" : "\n\n[안내] 선택한 바닥 이펙트는 색 지정을 지원하지 않아 magicColor 가 무시됩니다.";
  return data(
    { prompt, renderHint, itemCount: a.itemCount, magicColorApplied },
    prompt + `\n\n[렌더 힌트] ${renderHint}` + colorNote
  );
});

server.registerTool("nexus_quality_up_prompt", {
  title: "KV 배경 품질 향상 프롬프트",
  description: "NexusPreview 배경 퀄리티업 프롬프트 — KV(키비주얼) 원본 1장을 참조로 첨부하면 캐릭터·타이틀 형태는 보존하고 배경의 빛·색·대기만 드라마틱하게 강화. 새 캐릭터/타이틀/텍스트 생성 금지 가드 포함.",
  inputSchema: {
    extra: z.string().optional().describe("추가 효과/지시 (형태 변경 요청은 이중 가드로 무시됨)"),
    moodPresets: z.string().optional().describe("분위기 프리셋 지시 라인들 (갓레이/파티클 등)"),
    themePalette: z.string().optional().describe("프로모션 컬러 시스템(테마 팔레트) 연동 지시"),
  },
  outputSchema: PROMPT_OUT,
  annotations: PURE,
}, async (a) => {
  const mood = String(a.moodPresets || "").trim();
  const palette = String(a.themePalette || "").trim();
  const e = String(a.extra || "").trim();
  const skillIds = buildQualityUpSkillIds(Boolean(mood || palette), Boolean(e));
  const prompt = composeSkillsFs(skillIds, { extraInstructions: e, moodPresets: mood, themePalette: palette });
  const renderHint = "원본 1장 참조 첨부 · imageSize 4K 권장";
  return data({ prompt, renderHint }, prompt + `\n\n[렌더 힌트] ${renderHint}`);
});

server.registerTool("nexus_character_fx_prompt", {
  title: "캐릭터 렌더 향상 프롬프트",
  description: "NexusPreview 캐릭터 연출 프롬프트 — 캐릭터 원본 1장을 참조로 첨부하면 형태 99%·얼굴 99.9% 보존 조건으로 빛·파티클 연출을 추가. 분리(누끼)하기 쉬운 배경색을 자동 결정.",
  inputSchema: {
    light: keyEnum(CHAR_LIGHT_OPTIONS).default("auto").describe("빛 효과"),
    particle: keyEnum(CHAR_PARTICLE_OPTIONS).default("auto").describe("파티클"),
    intensity: keyEnum(CHAR_INTENSITY_OPTIONS).default("normal").describe("연출 강도"),
    bg: keyEnum(CHAR_BG_OPTIONS).default("auto").describe("배경 — auto 는 연출로부터 분리 최적색 자동"),
    extra: z.string().optional().describe("추가 지시"),
  },
  outputSchema: {
    ...PROMPT_OUT,
    resolvedBg: z.string().describe("자동 결정된 배경 id (black/chroma/…)"),
    nextTool: z.string().describe("렌더 후 권장 후처리 툴"),
  },
  annotations: PURE,
}, async (a) => {
  const light = CHAR_LIGHT_OPTIONS.find((o) => o.key === a.light) || CHAR_LIGHT_OPTIONS[0];
  const particle = CHAR_PARTICLE_OPTIONS.find((o) => o.key === a.particle) || CHAR_PARTICLE_OPTIONS[0];
  const intensity = CHAR_INTENSITY_OPTIONS.find((o) => o.key === a.intensity) || CHAR_INTENSITY_OPTIONS[1];
  const bgResolved = resolveCharBg(a.light, a.particle, a.bg);
  const bg = CHAR_BG_OPTIONS.find((o) => o.key === bgResolved) || CHAR_BG_OPTIONS[1];
  const e = String(a.extra || "").trim();
  const skillIds = [...CHAR_SKILLS];
  if (e) skillIds.push("quality-up/user-extra-guard");
  const prompt = composeSkillsFs(skillIds, {
    lightDirective: light.en,
    particleDirective: particle.en,
    intensityDirective: intensity.en,
    bgDirective: bg.en,
    extraInstructions: e,
  });
  const nextTool = bgResolved === "black" ? "nexus_split_character_effect" : "nexus_remove_background";
  const renderHint = `원본 1장 참조 첨부 · imageSize 4K 권장 · 결정된 배경: ${bg.ko}${bg.fill ? ` (${bg.fill})` : ""}`;
  const full = prompt + `\n\n[렌더 힌트] ${renderHint} — 이후 ${bgResolved === "black" ? "nexus_split_character_effect 로 캐릭터/이펙트 분리" : "nexus_remove_background 로 키잉"} 가능`;
  return data({ prompt, renderHint, resolvedBg: bgResolved, nextTool }, full);
});

// ─── 픽셀 툴 ──────────────────────────────────────────────────────────────────
server.registerTool("nexus_remove_ai", {
  title: "배경 제거 (Remove.bg AI)",
  description: "색상 키잉·이펙트 알파·캐릭터 분리 등 로컬 투명화가 실패하거나 QA를 통과하지 못했을 때만 사용하는 최종 fallback. Remove.bg AI 피사체 세그멘테이션으로 허용된 로컬 이미지의 배경을 제거해 투명 PNG로 저장. 이미지를 외부 Remove.bg API로 전송하고 계정 크레딧을 사용할 수 있으므로 호출마다 명시적 확인이 필요함. REMOVE_BG_API_KEY 및 REMOVE_BG_ALLOWED_ROOTS 사용.",
  inputSchema: {
    imagePath: z.string().describe("REMOVE_BG_ALLOWED_ROOTS 아래의 입력 이미지 경로(png·jpg·webp)"),
    confirmExternalUpload: z.literal(true).describe("이미지를 Remove.bg로 전송하고 크레딧이 사용될 수 있음을 이번 호출에 한해 명시적으로 확인"),
    size: z.enum(["auto", "preview", "full"]).default("auto").describe("Remove.bg 출력 크기. auto 권장"),
    outputPath: z.string().optional().describe("허용된 루트 아래의 저장 경로(.png). 생략 시 .tmp/mcp-out 아래 자동"),
  },
  outputSchema: {
    outputPath: z.string().describe("저장된 투명 PNG 절대경로"),
    size: z.string(),
    creditsCharged: z.string().nullable(),
    freeCallsRemaining: z.string().nullable(),
  },
  annotations: { ...WRITE_LOCAL, openWorldHint: true },
}, async (a) => {
  const key = envValue("REMOVE_BG_API_KEY");
  if (!key) return errText("REMOVE_BG_API_KEY 가 없습니다 — 환경변수 또는 리포 루트 .env 에 설정하세요 (VITE_ 접두사 아님).");
  const allowedRoots = removeBgAllowedRoots();
  const input = path.resolve(a.imagePath);
  if (!isInsideAllowedRoot(input, allowedRoots)) return errText(`허용되지 않은 입력 경로입니다. REMOVE_BG_ALLOWED_ROOTS: ${allowedRoots.join("; ")}`);
  const out = a.outputPath
    ? path.resolve(a.outputPath)
    : path.join(ensureOutDir(OUT_DIR), `remove-ai-${Date.now()}.png`);
  if (!isInsideAllowedRoot(out, allowedRoots)) return errText(`허용되지 않은 출력 경로입니다. REMOVE_BG_ALLOWED_ROOTS: ${allowedRoots.join("; ")}`);
  let bytes;
  try { bytes = fs.readFileSync(input); }
  catch (e) { return errText(`이미지를 열 수 없습니다: ${input} — 경로를 확인하세요. (${e.message})`); }
  if (bytes.length > 22 * 1024 * 1024) return errText("Remove.bg 입력 제한을 초과했습니다 — 22MB 이하 이미지를 사용하세요.");

  let response;
  try {
    response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ image_file_b64: bytes.toString("base64"), size: a.size }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (e) {
    return errText(`Remove.bg 요청 실패: ${e.message}`);
  }
  if (!response.ok) {
    let message = `Remove.bg ${response.status}`;
    if (response.status === 402) message = "Remove.bg 크레딧이 부족합니다.";
    else if (response.status === 403) message = "REMOVE_BG_API_KEY가 올바르지 않습니다.";
    else if (response.status === 429) message = "Remove.bg 요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
    else {
      try { message = (await response.json())?.errors?.[0]?.title || message; } catch {}
    }
    return errText(message);
  }
  try {
    ensureOutDir(path.dirname(out));
    fs.writeFileSync(out, Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    return errText(`결과 저장 실패: ${out} — 출력 경로를 확인하세요. (${e.message})`);
  }
  const creditsCharged = response.headers.get("X-Credits-Charged");
  const freeCallsRemaining = response.headers.get("X-Free-Calls");
  return data(
    { outputPath: out, size: a.size, creditsCharged, freeCallsRemaining },
    `저장 완료: ${out}\nRemove.bg AI · size=${a.size}${creditsCharged ? ` · 사용 크레딧 ${creditsCharged}` : ""}${freeCallsRemaining ? ` · 무료 호출 잔여 ${freeCallsRemaining}` : ""}`,
  );
});

server.registerTool("nexus_remove_background", {
  title: "배경 제거 (키잉)",
  description: "단색 배경(블랙/크로마 그린/화이트/임의 색) 이미지를 색거리 키잉 + 배경색 역산(unmix)으로 투명 PNG 로 변환. 발광 이펙트 추출에도 사용 (bg=black).",
  inputSchema: {
    imagePath: z.string().describe("입력 이미지 경로"),
    bg: z.string().default("auto").describe("배경색 — auto(코너 자동감지) | black | white | chroma | #rrggbb"),
    threshold: z.number().min(0).max(255).default(10).describe("이 색거리 이하 = 완전 투명"),
    feather: z.number().min(1).max(255).default(60).describe("threshold 부터 이 범위까지 알파 램프"),
    outputPath: z.string().optional().describe("저장 경로(.png). 생략 시 .tmp/mcp-out/ 아래 자동"),
  },
  outputSchema: {
    outputPath: z.string().describe("저장된 투명 PNG 절대경로"),
    bgColor: z.object({ r: z.number(), g: z.number(), b: z.number() }).describe("제거에 사용된 배경색"),
    threshold: z.number(),
    feather: z.number(),
  },
  annotations: WRITE_LOCAL,
}, async (a) => {
  let imageData;
  try { ({ imageData } = await loadImageData(a.imagePath)); }
  catch (e) { return errText(`이미지를 열 수 없습니다: ${a.imagePath} — 경로/형식(png·jpg·webp)을 확인하세요. (${e.message})`); }
  const { width: W, height: H, data: d } = imageData;
  let bgRgb;
  if (a.bg === "auto") bgRgb = detectBgColor(d, W, H);
  else if (a.bg === "black") bgRgb = [0, 0, 0];
  else if (a.bg === "white") bgRgb = [255, 255, 255];
  else if (a.bg === "chroma") bgRgb = [0, 255, 0];
  else bgRgb = hexToRgb(a.bg);
  if (!bgRgb) return errText(`배경색을 해석할 수 없습니다: ${a.bg}`);
  const [br, bgC, bb] = bgRgb;
  const t0 = a.threshold, range = a.feather;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    const dist = Math.max(Math.abs(d[i] - br), Math.abs(d[i + 1] - bgC), Math.abs(d[i + 2] - bb));
    let alpha = dist <= t0 ? 0 : Math.min(1, (dist - t0) / range);
    if (alpha <= 0) { d[i + 3] = 0; continue; }
    if (alpha < 1) {
      // premultiplied unmix — F = (C − (1−A)·B) / A : 경계의 배경색 프린지 제거
      const inv = 1 - alpha;
      d[i] = clamp255((d[i] - inv * br) / alpha);
      d[i + 1] = clamp255((d[i + 1] - inv * bgC) / alpha);
      d[i + 2] = clamp255((d[i + 2] - inv * bb) / alpha);
    }
    d[i + 3] = clamp255(alpha * (d[i + 3] / 255) * 255);
  }
  const out = a.outputPath
    ? (path.isAbsolute(a.outputPath) ? a.outputPath : path.join(ROOT, a.outputPath))
    : path.join(ensureOutDir(OUT_DIR), `keyed-${Date.now()}.png`);
  try {
    ensureOutDir(path.dirname(out));
    await saveImageData(imageData, out);
  } catch (e) {
    return errText(`결과 저장 실패: ${out} — 출력 경로(outputPath)를 확인하세요. (${e.message})`);
  }
  return data(
    { outputPath: out, bgColor: { r: br, g: bgC, b: bb }, threshold: t0, feather: range },
    `저장 완료: ${out}\n배경색: rgb(${br},${bgC},${bb}) · threshold ${t0} · feather ${range}`
  );
});

server.registerTool("nexus_split_character_effect", {
  title: "캐릭터/이펙트 분리",
  description: "단색 배경 위 '불투명 캐릭터 + 발광 이펙트' 이미지를 두 레이어로 분리 — 캐릭터(straight-alpha PNG) + 이펙트(블랙 위 발광, 스크린 블렌드용 PNG). NexusPreview 캐릭터 렌더 향상 결과 후처리와 동일 알고리즘.",
  inputSchema: {
    imagePath: z.string().describe("입력 이미지 경로 (블랙 배경 권장)"),
    bg: z.string().default("black").describe("배경색 — auto | black | #rrggbb"),
    solidLevel: z.number().min(1).max(255).default(CHAR_SPLIT_DEFAULTS.solidLevel).describe("이 색거리 이상 = 확실한 피사체 시드"),
    closeRadius: z.number().min(1).max(64).default(CHAR_SPLIT_DEFAULTS.closeRadius).describe("형태학적 닫힘 반경(px) — 머리카락 틈 메움"),
    edgeSoft: z.number().min(1).max(32).default(CHAR_SPLIT_DEFAULTS.edgeSoft).describe("경계 페더(px)"),
    outputDir: z.string().optional().describe("출력 폴더 (생략 시 .tmp/mcp-out/)"),
  },
  outputSchema: {
    characterPath: z.string().describe("캐릭터 레이어 (straight-alpha PNG) 절대경로"),
    effectPath: z.string().describe("이펙트 레이어 (스크린 블렌드용 PNG) 절대경로"),
    width: z.number(),
    height: z.number(),
  },
  annotations: WRITE_LOCAL,
}, async (a) => {
  let imageData;
  try { ({ imageData } = await loadImageData(a.imagePath)); }
  catch (e) { return errText(`이미지를 열 수 없습니다: ${a.imagePath} — 경로/형식(png·jpg·webp)을 확인하세요. (${e.message})`); }
  const { width: W, height: H, data: s } = imageData;
  const bgRgb = a.bg === "auto" ? detectBgColor(s, W, H) : (a.bg === "black" ? [0, 0, 0] : hexToRgb(a.bg));
  if (!bgRgb) return errText(`배경색을 해석할 수 없습니다: ${a.bg}`);
  const [br, bgC, bb] = bgRgb;
  const { d, dComp, r3 } = computeCharMask(imageData, { bg: bgRgb, solidLevel: a.solidLevel, closeRadius: a.closeRadius });
  const edge3 = Math.max(1, a.edgeSoft) * 3;
  const { createCanvas } = await canvasMod();
  const charCv = createCanvas(W, H), fxCv = createCanvas(W, H);
  const charCtx = charCv.getContext("2d"), fxCtx = fxCv.getContext("2d");
  const co = charCtx.createImageData(W, H), c = co.data;
  const fo = fxCtx.createImageData(W, H), f = fo.data;
  // charSplitToBlobs (src/lib/charEffectSplit.js) 와 동일한 픽셀 루프 — DOM 캔버스만 @napi-rs 로 대체
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    const depth = dComp[p] - r3;
    const ramp = depth <= 0 ? 0 : Math.min(1, depth / edge3);
    if (ramp > 0) {
      const alpha = ramp * (s[i + 3] / 255);
      let r = s[i], g = s[i + 1], b = s[i + 2];
      if (ramp < 1) {
        const at = Math.max(d[p] / 255, ramp, 0.004), inv = 1 - at;
        r = clamp255((r - inv * br) / at);
        g = clamp255((g - inv * bgC) / at);
        b = clamp255((b - inv * bb) / at);
      }
      c[i] = r; c[i + 1] = g; c[i + 2] = b; c[i + 3] = clamp255(alpha * 255);
    }
    const keep = 1 - ramp;
    f[i] = clamp255(s[i] * keep);
    f[i + 1] = clamp255(s[i + 1] * keep);
    f[i + 2] = clamp255(s[i + 2] * keep);
    f[i + 3] = 255;
  }
  charCtx.putImageData(co, 0, 0);
  fxCtx.putImageData(fo, 0, 0);
  const dir = a.outputDir
    ? (path.isAbsolute(a.outputDir) ? a.outputDir : path.join(ROOT, a.outputDir))
    : OUT_DIR;
  ensureOutDir(dir);
  const stamp = Date.now();
  const charPath = path.join(dir, `char-${stamp}.png`);
  const fxPath = path.join(dir, `fx-screen-${stamp}.png`);
  try {
    fs.writeFileSync(charPath, charCv.toBuffer("image/png"));
    fs.writeFileSync(fxPath, fxCv.toBuffer("image/png"));
  } catch (e) {
    return errText(`결과 저장 실패: ${dir} — 출력 폴더(outputDir)를 확인하세요. (${e.message})`);
  }
  return data(
    { characterPath: charPath, effectPath: fxPath, width: W, height: H },
    `분리 완료 (${W}×${H})
캐릭터 (straight-alpha): ${charPath}
이펙트 (스크린 블렌드용, 블랙 위 발광): ${fxPath}
합성: 캐릭터를 normal, 이펙트를 screen(또는 add) 블렌드로 같은 위치에 겹치세요.`
  );
});

server.registerTool("nexus_design_rubric", {
  title: "디자인 평가 루브릭",
  description: "NEXUS 디자인 평가 루브릭(마크다운) 반환 — 생성 결과물을 평가·비교할 때 기준으로 사용.",
  inputSchema: {},
  outputSchema: { markdown: z.string().describe("디자인 평가 루브릭 (마크다운)") },
  annotations: PURE,
}, async () => {
  let md;
  try { md = fs.readFileSync(RUBRIC_PATH, "utf8"); }
  catch { return errText(`루브릭 파일을 찾을 수 없습니다: ${RUBRIC_PATH}`); }
  return data({ markdown: md }, md);
});

server.registerTool("nexus_banner_codex_list", {
  title: "Banner Codex 배너 목록",
  description: "NEXUS Studio Banner Codex에 저장된 배너를 읽기 전용으로 조회합니다. 제목·태그·게임·연도·점수 필터와 페이지 토큰을 지원하며, 상위 5개 썸네일을 MCP 이미지로 직접 표시합니다.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30).describe("한 번에 가져올 Firestore 문서 수 (최대 100)"),
    pageToken: z.string().optional().describe("이전 응답의 nextPageToken — 다음 페이지 조회 시 전달"),
    query: z.string().optional().describe("제목·원본 제목·태그·캐릭터·경로에서 찾을 검색어"),
    game: z.string().optional().describe("게임명 정확 일치 필터"),
    year: z.union([z.string(), z.number()]).optional().describe("연도 필터"),
    minScore: z.number().min(0).max(100).optional().describe("최소 평가 점수"),
    sort: z.enum(["newest", "oldest", "score"]).default("newest").describe("정렬 — score는 전체 컬렉션 평가순"),
  },
  outputSchema: {
    banners: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable(),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const collectionPath = `artifacts/${encodeURIComponent(projectId)}/public/data/banners`;
    const payload = a.sort === "score"
      ? { documents: await firestoreCollectionAll(collectionPath), nextPageToken: null }
      : await firestoreRequest(collectionPath, {
          pageSize: a.pageSize,
          pageToken: a.pageToken,
          showMissing: false,
        });
    const decoded = (payload.documents || []).map(decodeFirestoreDocument);
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const filtered = decoded.filter((banner) => {
      if (a.game && String(banner.game || "") !== a.game) return false;
      if (a.year != null && String(banner.year || "") !== String(a.year)) return false;
      if (a.minScore != null && Number(banner.score || 0) < a.minScore) return false;
      if (needle) {
        const haystack = [banner.title, banner.originalTitle, banner.character, banner.path, ...(Array.isArray(banner.tags) ? banner.tags : [])]
          .filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    filtered.sort((x, y) => a.sort === "score"
      ? Number(y.score || 0) - Number(x.score || 0)
      : a.sort === "oldest"
        ? bannerTimestamp(x.createdAt) - bannerTimestamp(y.createdAt)
        : bannerTimestamp(y.createdAt) - bannerTimestamp(x.createdAt));
    const offset = a.sort === "score" ? scorePageOffset(a.pageToken) : 0;
    const pageItems = a.sort === "score" ? filtered.slice(offset, offset + a.pageSize) : filtered;
    const banners = pageItems.map(bannerSummary);
    const nextPageToken = a.sort === "score"
      ? (offset + banners.length < filtered.length ? `score:${offset + banners.length}` : null)
      : (payload.nextPageToken || null);
    const result = { banners, returned: banners.length, scanned: decoded.length, nextPageToken };
    return dataWithRemoteImages(
      result,
      JSON.stringify(result, null, 2),
      banners.map((banner) => banner.thumbnailUrl || banner.imageUrl),
    );
  } catch (e) {
    return errText(`Banner Codex 목록 조회 실패: ${e.message}`);
  }
});

server.registerTool("nexus_banner_codex_get", {
  title: "Banner Codex 배너 상세",
  description: "NEXUS Studio Banner Codex의 배너 ID로 상세 메타데이터와 이미지 URL을 읽기 전용 조회합니다.",
  inputSchema: {
    id: z.string().min(1).describe("nexus_banner_codex_list가 반환한 배너 문서 ID"),
  },
  outputSchema: {
    banner: z.record(z.string(), z.any()),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/banners/${encodeURIComponent(a.id)}`);
    const banner = decodeFirestoreDocument(payload);
    return data({ banner }, JSON.stringify(banner, null, 2));
  } catch (e) {
    return errText(`Banner Codex 상세 조회 실패 (${a.id}): ${e.message}`);
  }
});

server.registerTool("nexus_prompt_arc_list", {
  title: "Prompt Arc 공개 라이브러리 목록",
  description: "NEXUS Studio Prompt Arc의 공개 프롬프트와 타이포·오브젝트·광원·모션 샘플을 읽기 전용으로 검색합니다. 비공개·휴지통 항목은 반환하지 않습니다.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30).describe("반환할 항목 수 (최대 100)"),
    pageToken: z.string().optional().describe("이전 응답의 nextPageToken — 다음 페이지 조회 시 전달"),
    query: z.string().optional().describe("제목·설명·태그·AI 키워드·프롬프트에서 찾을 검색어"),
    category: z.enum(["타이포", "버튼", "visualFX", "Motion", "기타"]).optional().describe("Prompt Arc 카테고리"),
    nature: z.enum(["typography", "object", "lightfx", "motion", "kv", "other"]).optional().describe("이미지 성격 필터"),
    style: z.enum(["2d_bw", "3d_render", "calligraphy"]).optional().describe("타이포 스타일: 2D/흑백·3D/렌더링·캘리그라피"),
    theme: z.enum(["rpg_fantasy", "casual_cartoon", "sf_cyberpunk"]).optional().describe("테마: RPG/판타지·캐주얼/카툰·SF/사이버펑크"),
    sort: z.enum(["newest", "oldest", "popular", "views"]).default("newest").describe("조회 결과 정렬"),
  },
  outputSchema: {
    prompts: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable(),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const styleTerms = {
      "2d_bw": ["2d/흑백", "2d", "흑백"],
      "3d_render": ["3d/렌더링", "3d", "렌더링"],
      calligraphy: ["캘리그라피", "calligraphy"],
    };
    const themeTerms = {
      rpg_fantasy: ["rpg", "판타지"],
      casual_cartoon: ["캐주얼", "카툰"],
      sf_cyberpunk: ["sf", "사이버펑크"],
    };
    const matches = [];
    let scanned = 0;
    let token = a.pageToken;
    let rounds = 0;
    do {
      const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/prompts`, {
        pageSize: 100,
        pageToken: token,
        showMissing: false,
      });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument);
      scanned += decoded.length;
      for (const entry of decoded) {
        if (!nexusLibraryEntryReadable(entry)) continue;
        const tags = [...promptArcArray(entry.tags), ...promptArcFlat(entry.stepTags)].map(String);
        if (a.category && !tags.includes(a.category)) continue;
        const nature = promptArcNature(entry);
        if (a.nature && nature !== a.nature) continue;
        const promptText = [entry.content, entry.text, ...promptArcFlat(entry.stepPrompts)].filter(Boolean).join(" ");
        const keywordText = [entry.aiKeywords, ...promptArcFlat(entry.stepKeywords)].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
        if (a.style && !styleTerms[a.style].some((term) => keywordText.includes(term))) continue;
        if (a.theme && !themeTerms[a.theme].some((term) => keywordText.includes(term))) continue;
        if (needle) {
          const haystack = [entry.title, entry.description, entry.aiKeywords, promptText, ...tags]
            .filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
          if (!haystack.includes(needle)) continue;
        }
        matches.push(entry);
      }
      token = payload.nextPageToken || null;
      rounds++;
    } while (token && rounds < 20);

    matches.sort((x, y) => {
      if (a.sort === "popular") return Number(y.likeCount || 0) - Number(x.likeCount || 0)
        || bannerTimestamp(y.createdAt) - bannerTimestamp(x.createdAt);
      if (a.sort === "views") return Number(y.views || 0) - Number(x.views || 0)
        || bannerTimestamp(y.createdAt) - bannerTimestamp(x.createdAt);
      return a.sort === "oldest"
        ? bannerTimestamp(x.createdAt) - bannerTimestamp(y.createdAt)
        : bannerTimestamp(y.createdAt) - bannerTimestamp(x.createdAt);
    });
    const prompts = matches.slice(0, a.pageSize).map(promptArcSummary);
    const result = { prompts, returned: prompts.length, scanned, nextPageToken: token };
    return data(result, JSON.stringify(result, null, 2));
  } catch (e) {
    return errText(`Prompt Arc 목록 조회 실패: ${e.message}`);
  }
});

server.registerTool("nexus_prompt_arc_get", {
  title: "Prompt Arc 공개 항목 상세",
  description: "Prompt Arc 공개 항목의 프롬프트 단계, 이미지·영상 URL, 태그, 키워드와 연관 항목 ID를 읽기 전용 조회합니다.",
  inputSchema: {
    id: z.string().min(1).describe("nexus_prompt_arc_list가 반환한 문서 ID"),
  },
  outputSchema: {
    prompt: z.record(z.string(), z.any()),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/prompts/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument(payload);
    if (!nexusLibraryEntryReadable(raw)) throw new Error("현재 연결된 Nexus 계정으로 접근할 수 없는 항목입니다.");
    const images = promptArcArray(raw.images).map(promptArcSafeUrl).filter(Boolean);
    const fallbackImage = promptArcSafeUrl(raw.image);
    if (fallbackImage && !images.includes(fallbackImage)) images.push(fallbackImage);
    const prompt = {
      ...promptArcSummary(raw),
      content: raw.content || raw.text || null,
      images,
      videos: promptArcArray(raw.videos).map(promptArcSafeUrl).filter(Boolean),
      videoPosterUrl: promptArcSafeUrl(raw.videoPoster),
      stepPrompts: promptArcArray(raw.stepPrompts).map(String),
      stepLabels: promptArcArray(raw.stepLabels).map(String),
      stepTags: promptArcArray(raw.stepTags),
      stepKeywords: promptArcArray(raw.stepKeywords),
      stepDescriptions: promptArcArray(raw.stepDescriptions),
      relatedIds: promptArcArray(raw.relatedIds).map(String),
      analysisStatus: raw.analysisStatus || null,
    };
    return data({ prompt }, JSON.stringify(prompt, null, 2));
  } catch (e) {
    return errText(`Prompt Arc 상세 조회 실패 (${a.id}): ${e.message}`);
  }
});

server.registerTool("nexus_promotion_library_list", {
  title: "Promotion 라이브러리 목록",
  description: "NEXUS Studio Promotion Library의 프로모션을 읽기 전용으로 조회합니다. 브랜드웹은 제외하며 제목·태그·게임·연도·평가점수 검색과 페이지 토큰을 지원합니다.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30).describe("반환할 프로모션 수 (최대 100)"),
    pageToken: z.string().optional().describe("이전 응답의 nextPageToken — 다음 페이지 조회 시 전달"),
    query: z.string().optional().describe("제목·태그·요약·경로에서 찾을 검색어"),
    game: z.string().optional().describe("게임명 정확 일치 필터"),
    year: z.union([z.string(), z.number()]).optional().describe("연도 필터"),
    minScore: z.number().min(0).max(10).optional().describe("최소 평가점수 (10점 만점)"),
    sort: z.enum(["newest", "oldest", "score", "liked"]).default("newest").describe("조회 결과 정렬"),
  },
  outputSchema: {
    promotions: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable(),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const matches = [];
    let scanned = 0;
    let token = a.pageToken;
    let rounds = 0;
    do {
      const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners`, {
        pageSize: 100,
        pageToken: token,
        showMissing: false,
      });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument);
      scanned += decoded.length;
      for (const entry of decoded) {
        if (String(entry.assetType || "") === "브랜드웹") continue;
        if (!nexusLibraryEntryReadable(entry)) continue;
        if (a.game && String(entry.game || "") !== a.game) continue;
        if (a.year != null && String(entry.year || "") !== String(a.year)) continue;
        const score = promotionScore(entry);
        if (a.minScore != null && (score == null || score < a.minScore)) continue;
        if (needle) {
          const haystack = [entry.title, entry.summary, entry.description, entry.path, entry.game,
            ...(Array.isArray(entry.tags) ? entry.tags : [])]
            .filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
          if (!haystack.includes(needle)) continue;
        }
        matches.push(entry);
      }
      token = payload.nextPageToken || null;
      rounds++;
    } while (token && rounds < 10);

    matches.sort((x, y) => {
      if (a.sort === "score") return (promotionScore(y) ?? -1) - (promotionScore(x) ?? -1)
        || bannerTimestamp(y.created_at || y.createdAt) - bannerTimestamp(x.created_at || x.createdAt);
      if (a.sort === "liked") return Number(y.liked || 0) - Number(x.liked || 0)
        || bannerTimestamp(y.created_at || y.createdAt) - bannerTimestamp(x.created_at || x.createdAt);
      return a.sort === "oldest"
        ? bannerTimestamp(x.created_at || x.createdAt) - bannerTimestamp(y.created_at || y.createdAt)
        : bannerTimestamp(y.created_at || y.createdAt) - bannerTimestamp(x.created_at || x.createdAt);
    });
    const promotions = matches.slice(0, a.pageSize).map(promotionSummary);
    const result = { promotions, returned: promotions.length, scanned, nextPageToken: token };
    return data(result, JSON.stringify(result, null, 2));
  } catch (e) {
    return errText(`Promotion Library 목록 조회 실패: ${e.message}`);
  }
});

server.registerTool("nexus_promotion_library_get", {
  title: "Promotion 라이브러리 상세",
  description: "NEXUS Studio Promotion Library 항목의 PC·모바일 이미지와 평가점수·항목별 사유를 읽기 전용 조회합니다.",
  inputSchema: {
    id: z.string().min(1).describe("nexus_promotion_library_list가 반환한 문서 ID"),
  },
  outputSchema: {
    promotion: z.record(z.string(), z.any()),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument(payload);
    if (String(raw.assetType || "") === "브랜드웹") throw new Error("브랜드웹 항목입니다. nexus_brand_web_library_get을 사용하세요.");
    if (!nexusLibraryEntryReadable(raw)) throw new Error("현재 연결된 Nexus 계정으로 접근할 수 없는 항목입니다.");
    const webScores = raw.webScores && typeof raw.webScores === "object" ? raw.webScores : {};
    const criteria = Object.fromEntries(Object.entries(webScores).map(([key, value]) => [key, {
      score: Number.isFinite(Number(value?.score)) ? Number(value.score) : null,
      reason: value?.reason || null,
    }]));
    const promotion = {
      ...promotionSummary(raw),
      path: raw.path || null,
      originalTitle: raw.originalTitle || null,
      purpose: raw.purpose || null,
      evaluationType: raw.evaluationType || raw.webEvalType || null,
      criteria,
    };
    return data({ promotion }, JSON.stringify(promotion, null, 2));
  } catch (e) {
    return errText(`Promotion Library 상세 조회 실패 (${a.id}): ${e.message}`);
  }
});

server.registerTool("nexus_brand_web_library_list", {
  title: "Brand Web 라이브러리 목록",
  description: "NEXUS Studio Brand Web Library에 등록된 공개 브랜드웹을 읽기 전용으로 조회합니다. 제목·태그·게임·연도·디바이스 검색과 페이지 토큰을 지원합니다.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30).describe("반환할 브랜드웹 수 (최대 100)"),
    pageToken: z.string().optional().describe("이전 응답의 nextPageToken — 다음 페이지 조회 시 전달"),
    query: z.string().optional().describe("제목·태그·설명·페이지명에서 찾을 검색어"),
    game: z.string().optional().describe("게임명 정확 일치 필터"),
    year: z.union([z.string(), z.number()]).optional().describe("연도 필터"),
    device: z.enum(["pc", "mobile"]).optional().describe("해당 디바이스 페이지가 있는 항목만 조회"),
    sort: z.enum(["newest", "oldest", "liked"]).default("newest").describe("조회 결과 정렬"),
  },
  outputSchema: {
    entries: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable(),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const matches = [];
    let scanned = 0;
    let token = a.pageToken;
    let rounds = 0;
    do {
      const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners`, {
        pageSize: 100,
        pageToken: token,
        showMissing: false,
      });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument);
      scanned += decoded.length;
      for (const entry of decoded) {
        if (String(entry.assetType || "") !== "브랜드웹") continue;
        if (!nexusLibraryEntryReadable(entry)) continue;
        if (a.game && String(entry.game || "") !== a.game) continue;
        if (a.year != null && String(entry.year || "") !== String(a.year)) continue;
        const pages = Array.isArray(entry.pages) ? entry.pages : [];
        if (a.device && !pages.some((page) => page?.device === a.device)) continue;
        if (needle) {
          const haystack = [entry.title, entry.sourceProjectName, entry.sourceDescription, entry.game,
            ...(Array.isArray(entry.tags) ? entry.tags : []), ...pages.map((page) => page?.name)]
            .filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
          if (!haystack.includes(needle)) continue;
        }
        matches.push(entry);
        if (matches.length >= a.pageSize) break;
      }
      token = payload.nextPageToken || null;
      rounds++;
    } while (matches.length < a.pageSize && token && rounds < 10);

    matches.sort((x, y) => a.sort === "liked"
      ? Number(y.liked || 0) - Number(x.liked || 0)
      : a.sort === "oldest"
        ? bannerTimestamp(x.created_at || x.createdAt) - bannerTimestamp(y.created_at || y.createdAt)
        : bannerTimestamp(y.created_at || y.createdAt) - bannerTimestamp(x.created_at || x.createdAt));
    const entries = matches.slice(0, a.pageSize).map(brandWebSummary);
    const result = { entries, returned: entries.length, scanned, nextPageToken: token };
    return data(result, JSON.stringify(result, null, 2));
  } catch (e) {
    return errText(`Brand Web Library 목록 조회 실패: ${e.message}`);
  }
});

server.registerTool("nexus_brand_web_library_get", {
  title: "Brand Web 라이브러리 상세",
  description: "NEXUS Studio Brand Web Library 항목의 메타데이터와 PC·모바일 전체 페이지 이미지 URL을 읽기 전용 조회합니다.",
  inputSchema: {
    id: z.string().min(1).describe("nexus_brand_web_library_list가 반환한 문서 ID"),
  },
  outputSchema: {
    entry: z.record(z.string(), z.any()),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument(payload);
    if (String(raw.assetType || "") !== "브랜드웹") throw new Error("브랜드웹 항목이 아닙니다.");
    if (!nexusLibraryEntryReadable(raw)) throw new Error("현재 연결된 Nexus 계정으로 접근할 수 없는 항목입니다.");
    const pages = (Array.isArray(raw.pages) ? raw.pages : []).map((page, index) => ({
      id: page?.id || null,
      name: page?.name || `page_${index + 1}`,
      device: page?.device || null,
      url: page?.url || null,
      order: Number.isFinite(Number(page?.order)) ? Number(page.order) : index,
      confirmedAt: page?.confirmedAt || null,
      noteCount: Number(page?.noteCount || 0),
    }));
    const entry = { ...brandWebSummary(raw), pages };
    return data({ entry }, JSON.stringify(entry, null, 2));
  } catch (e) {
    return errText(`Brand Web Library 상세 조회 실패 (${a.id}): ${e.message}`);
  }
});

server.registerTool("nexus_account_status", {
  title: "Nexus 계정 연결 상태",
  description: "Codex MCP에 연결된 Nexus 계정과 자동 토큰 갱신 상태를 확인합니다.",
  inputSchema: {},
  outputSchema: {
    connected: z.boolean(),
    uid: z.string().nullable(),
    email: z.string().nullable(),
    expiresAt: z.number().nullable(),
  },
  annotations: PURE,
}, async () => {
  const auth = await currentNexusAuth().catch(() => null);
  const result = {
    connected: !!auth?.refreshToken,
    uid: auth?.uid || null,
    email: auth?.email || null,
    expiresAt: auth?.expiresAt || null,
  };
  return data(result, JSON.stringify(result, null, 2));
});

server.registerTool("nexus_account_disconnect", {
  title: "Nexus 계정 연결 해제",
  description: "Codex MCP에 저장된 Nexus 사용자 세션만 제거합니다. Nexus Studio 웹 로그인은 유지됩니다.",
  inputSchema: {},
  outputSchema: { disconnected: z.boolean() },
  annotations: RENDER,
}, async () => {
  try { fs.unlinkSync(NEXUS_AUTH_PATH); } catch {}
  const result = { disconnected: true };
  return data(result, JSON.stringify(result));
});

// ─── 기동 ─────────────────────────────────────────────────────────────────────
startNexusLinkBridge();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[nexus-mcp] NEXUS Studio MCP server ready (stdio)");
