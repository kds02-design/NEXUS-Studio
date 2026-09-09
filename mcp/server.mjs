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
// Mask Forge 픽셀 코어 — 앱(MaskForge)과 같은 함수. 예전엔 MCP 가 자체 키잉(threshold/feather 선형)을 써서 앱과 결과가 달랐다.
import { KEY_DEFAULTS, extractColorKeyPixels, detectBg as appDetectBg, alphaTrimBox, cropPixels, toRgb as appToRgb } from "../src/lib/colorKeyExtract.js";
import { EFFECT_DEFAULTS, extractEffectPixels } from "../src/lib/effectExtract.js";
// Typecore Breeze — 순수 모듈로 이동 (예전엔 훅 파일·jsx 를 import 했다)
import { buildPrompts as buildBreezePrompts } from "../src/apps/TypecoreBreeze/services/breezePrompt.js";
import { directorPersonas as breezePersonas } from "../src/apps/TypecoreBreeze/constants/categoriesData.js";
import { coreArchetypes as sovereignArchetypes } from "../src/apps/TypecoreSovereign/versions/current/constants/personas";
import { staticOptions as sovereignOptions } from "../src/apps/TypecoreSovereign/versions/current/constants/options";
import { getOptionEn as sovereignOptionEn } from "../src/apps/TypecoreSovereign/versions/current/constants/utils";
import { resolveSovereignOptions, SCRIPT_PRESETS as sovereignPresets } from "../src/apps/TypecoreSovereign/versions/current/services/sovereignOptions";
import { compileSovereignImagenPrompt } from "../src/apps/TypecoreSovereign/versions/current/services/compileSovereignImagenPrompt";
import { FRAMEFORGE_ASSET_TYPES, FRAMEFORGE_SILHOUETTES, FRAMEFORGE_MOODS, FRAMEFORGE_RENDER_STYLES, FRAMEFORGE_KITS, buildFrameForgeMcpPrompt, frameForgeSharedAxes, buildKitSeeds, seedAspectRatio } from "../src/apps/FrameForge/frameforgeMcp.js";
import { formatNexusCriteriaMarkdown, loadActiveNexusCriteria } from "../scripts/lib/nexus-evaluation-criteria.mjs";
// 2순위 (2026-09): NexusPreview 타이틀FX/배경 생성·합성/공중부양 · Prompt Audit · Promo Skin · Motion Matrix — 앱과 같은 순수 빌더
import { TITLE_FX_EFFECTS, TITLE_FX_COLORS, TITLE_FX_DIRECTIONS, TITLE_FX_INTENSITY, TITLE_FX_BG_OPTIONS, buildTitlePrompt } from "../src/apps/NexusPreview/services/titlePrompt.js";
import { buildBgComposePrompt, buildBgGeneratePrompt } from "../src/apps/NexusPreview/services/bgPrompts.js";
import { FLOATING_OUTPUT_OPTIONS, FLOATING_EFFECT_OPTIONS, FLOATING_FORM_OPTIONS, FLOATING_LAYOUT_OPTIONS, FLOATING_GROUP_OPTIONS, FLOATING_COLORS, FLOATING_INTENSITY_OPTIONS, FLOATING_MOTION_OPTIONS, FLOATING_DENSITY_OPTIONS, resolveFloatingGroupPlan, buildFloatingPrompt, buildFloatingRepairPrompt, buildFloatingSeparationPrompt } from "../src/apps/NexusPreview/services/floatingPrompt.js";
import { PROMPT_MAX_LENGTH as AUDIT_MAX_LENGTH, CONFLICT_TYPES as AUDIT_CONFLICT_TYPES, SOURCE_CONTEXT as AUDIT_SOURCE_CONTEXT, buildAuditPromptText } from "../src/apps/PromptAudit/services/auditPrompt.js";
import { SYSTEM_PROMPT as THEME_SYSTEM_PROMPT, RESPONSE_SCHEMA as THEME_RESPONSE_SCHEMA } from "../src/apps/PromoSkin/services/themePrompt.js";
import { DEFAULT_LAYERS as MOTION_DEFAULT_LAYERS, MOTION_FX_LISTS, compileRawPrompt as compileMotionRaw, compileNegativePrompt as compileMotionNegative, inspectAndOptimizePrompt as optimizeMotionPrompt } from "../src/apps/MotionMatrix/services/motionCompiler.js";
import { EXPORT_MODES as MOTION_EXPORT_MODES, INTRO_STYLES as MOTION_INTRO_STYLES, FLOW_STYLES as MOTION_FLOW_STYLES, MOTION_DYNAMICS, INTENSITY_LEVELS as MOTION_INTENSITY, TRANSITION_TARGETS as MOTION_TRANSITION_TARGETS } from "../src/apps/MotionMatrix/constants/presets.js";
import { VEO_MODELS } from "../src/lib/veoRender.js";
// Brief Studio Prism — 수정요청서 해석 (범용 규칙 + 페이지 프로필)
import { extractionPrompt as briefExtractionPrompt, opsPrompt as briefOpsPrompt, PATTERN_VOCAB as BRIEF_PATTERN_VOCAB } from "../src/apps/BriefStudio/prism/prompts.js";
import { EXTRACTION_SCHEMA as BRIEF_EXTRACTION_SCHEMA, OPS_SCHEMA as BRIEF_OPS_SCHEMA } from "../src/apps/BriefStudio/prism/schema.js";
import { GENERIC_REVISION_RULES } from "../src/apps/BriefStudio/prism/rules.js";
import { listPrismProfiles, getPrismProfile } from "../src/apps/BriefStudio/prism/profiles/index.js";
// Render Matrix(재질 렌더) — 앱 컴파일러를 그대로. 예전엔 MCP 도구가 없어 스킬이 소스를 읽고 흉내 냈다 (2026-09).
import * as RM_MAIN from "../src/apps/RenderMatrix/services/promptCompiler.js";
import { INITIAL_OPTIONS as RM_MAIN_OPTIONS } from "../src/apps/RenderMatrix/constants/materials.js";
import { DIRECTOR_PERSONAS as RM_MAIN_PERSONAS, RENDER_ENGINES as RM_MAIN_ENGINES, PRESET_GROUPS as RM_MAIN_PRESETS } from "../src/apps/RenderMatrix/constants/presets.js";
import * as RM_POP from "../src/apps/RenderMatrixPop/services/promptCompiler.js";
import { INITIAL_OPTIONS as RM_POP_OPTIONS } from "../src/apps/RenderMatrixPop/constants/categories.js";
import { DIRECTOR_PERSONAS as RM_POP_PERSONAS, RENDER_ENGINES as RM_POP_ENGINES, PRESET_GROUPS as RM_POP_PRESETS } from "../src/apps/RenderMatrixPop/constants/presets.js";
import { buildDesignEvaluationPrompt, buildEvaluationResponseSchema, criteriaSourceFromSnapshot } from "../src/lib/designEvaluationPrompt.js";
import { calculateEvaluationReport, criteriaSnapshot as evalCriteriaSnapshot, validateCriteria as validateEvalCriteria } from "../src/lib/designEvaluationCore.js";
import { CRITERIA_TYPES as EVAL_CRITERIA_TYPES } from "../src/lib/evaluationCriteriaSeeds.js";

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
const WRITE_REMOTE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }; // 외부 저장소 멱등 upsert
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

function encodeFirestoreValue(value) {
  if (value == null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function encodeFirestoreFields(value) {
  return Object.fromEntries(Object.entries(value || {})
    .filter(([, item]) => item !== undefined)
    .map(([key, item]) => [key, encodeFirestoreValue(item)]));
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
    codexBadges: Array.isArray(banner.codexBadges) ? banner.codexBadges : [],
    reviewStatus: banner.reviewStatus || null,
    provenance: banner.provenance || null,
    automationManaged: !!banner.automationManaged,
    automationKey: banner.automationKey || null,
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

function assetLibrarySummary(entry) {
  return {
    id: entry.id,
    title: entry.title || "제목 없음",
    imageUrl: promptArcSafeUrl(entry.imageUrl),
    width: Number(entry.width || 0),
    height: Number(entry.height || 0),
    category: entry.category || "etc",
    subtype: entry.subtype || null,
    tags: promptArcArray(entry.tags).map(String),
    game: entry.game || null,
    year: Number(entry.year || 0) || null,
    section: entry.section || null,
    campaign: entry.campaign || null,
    hasEffects: !!entry.hasEffects,
    alpha: entry.alpha !== false,
    sourceKind: entry.source?.kind || null,
    sourceFile: entry.source?.fileName || null,
    layerPath: promptArcArray(entry.source?.layerPath).map(String),
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

async function firestoreWriteDocument(documentPath, value) {
  const { projectId, apiKey } = firebaseConfig();
  if (!projectId || !apiKey) throw new Error(".env에 VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY가 필요합니다.");
  const auth = await currentNexusAuth();
  const claims = decodeFirebaseClaims(auth?.idToken);
  if (!auth?.idToken || !claims?.nexusCodex) throw new Error("Nexus Studio에서 Codex 계정을 다시 연결해 주세요.");
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const url = new URL(`${base}/${documentPath}`);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, {
    method: "PATCH",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${auth.idToken}` },
    body: JSON.stringify({ fields: encodeFirestoreFields(value) }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try { message = JSON.parse(body)?.error?.message || body; } catch { /* text 응답 */ }
    throw new Error(`Firestore ${response.status}: ${message}`);
  }
  return response.json();
}

function bannerCodexUploadRoots() {
  const configured = envValue("NEXUS_BANNER_CODEX_UPLOAD_ROOTS");
  return (configured ? configured.split(";") : [ROOT]).map((value) => path.resolve(value.trim())).filter(Boolean);
}

async function uploadBannerCodexImage(imagePath) {
  if (!imagePath) return null;
  const absolute = path.resolve(imagePath);
  if (!isInsideAllowedRoot(absolute, bannerCodexUploadRoots())) throw new Error("이미지 경로가 Banner Codex 허용 루트 밖에 있습니다.");
  const stat = fs.statSync(absolute);
  if (!stat.isFile() || stat.size > 25 * 1024 * 1024) throw new Error("이미지는 25MB 이하 파일이어야 합니다.");
  const ext = path.extname(absolute).toLowerCase();
  const mime = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" })[ext];
  if (!mime) throw new Error("PNG, JPG, WEBP 이미지만 등록할 수 있습니다.");
  const cloudName = envValue("VITE_CLOUDINARY_CLOUD_NAME");
  const preset = envValue("VITE_CLOUDINARY_UPLOAD_PRESET");
  if (!cloudName || !preset) throw new Error("Cloudinary 업로드 설정이 없습니다.");
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(absolute)], { type: mime }), path.basename(absolute));
  form.append("upload_preset", preset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: "POST", body: form, signal: AbortSignal.timeout(60000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Cloudinary ${response.status}`);
  return payload.secure_url || payload.url;
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
// {data,width,height} 픽셀 결과 → PNG (앱 lib 결과를 그대로 저장)
async function savePixels(px, outPath) {
  const { createCanvas } = await canvasMod();
  const cv = createCanvas(px.width, px.height);
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(px.width, px.height);
  img.data.set(px.data);
  ctx.putImageData(img, 0, 0);
  fs.writeFileSync(outPath, cv.toBuffer("image/png"));
  return outPath;
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
    silhouette: FRAMEFORGE_SILHOUETTES.map((o) => ({ id: o.key, label: o.ko, for: o.for, ratio: o.ratio })),
    mood: brief(FRAMEFORGE_MOODS),
    renderStyle: brief(FRAMEFORGE_RENDER_STYLES),
    kit: FRAMEFORGE_KITS.map((k) => ({ id: k.key, label: k.ko, desc: k.desc, items: k.items.map(([t, s]) => `${t}/${s}`) })),
  },
  renderMatrix: {
    variant: [{ id: "render-matrix", label: "렌더 메트릭스 (RPG·프리미엄)" }, { id: "pop", label: "Render Matrix: Pop (캐주얼·팝)" }],
    ...Object.fromEntries(Object.entries(RM_VARIANTS).map(([id, v]) => [id, {
      directorPersona: brief(v.personas), renderEngine: brief(v.engines),
      ...Object.fromEntries(RM_OPTION_KEYS.map(([stateKey, listKey]) => [stateKey, brief(v.options[listKey] || [])])),
      preset: v.presets.flatMap((g) => g.presets.map((p) => ({ id: p.id, label: `${g.name} · ${p.label}`, settings: p.settings }))),
    }])),
  },
  titleFx: {
    effect: brief(TITLE_FX_EFFECTS, ["desc"]), color: brief(TITLE_FX_COLORS), direction: brief(TITLE_FX_DIRECTIONS), intensity: brief(TITLE_FX_INTENSITY), bg: brief(TITLE_FX_BG_OPTIONS),
  },
  floating: {
    outputMode: brief(FLOATING_OUTPUT_OPTIONS), effect: brief(FLOATING_EFFECT_OPTIONS), form: brief(FLOATING_FORM_OPTIONS), layout: brief(FLOATING_LAYOUT_OPTIONS),
    groupMode: brief(FLOATING_GROUP_OPTIONS), color: brief(FLOATING_COLORS), intensity: brief(FLOATING_INTENSITY_OPTIONS), motion: brief(FLOATING_MOTION_OPTIONS), density: brief(FLOATING_DENSITY_OPTIONS),
  },
  motion: {
    animationMode: [{ id: "loop", label: "루프" }, { id: "intro", label: "인트로" }, { id: "transition", label: "트랜지션" }],
    exportMode: brief(MOTION_EXPORT_MODES), introStyle: brief(MOTION_INTRO_STYLES), flowStyle: brief(MOTION_FLOW_STYLES), dynamics: brief(MOTION_DYNAMICS), intensity: brief(MOTION_INTENSITY), transitionTarget: brief(MOTION_TRANSITION_TARGETS),
    ...Object.fromEntries(Object.entries(MOTION_FX_LISTS).map(([mode, lists]) => [`${mode}Fx`, { surface: brief(lists.surface), edge: brief(lists.edge), ambient: brief(lists.ambient) }])),
    veoModel: VEO_MODELS.map((m) => ({ id: m.id, label: m.label || m.id })),
  },
  promptAudit: { sourceApp: Object.keys(AUDIT_SOURCE_CONTEXT).map((id) => ({ id, label: id })), conflictType: Object.entries(AUDIT_CONFLICT_TYPES).map(([id, v]) => ({ id, label: v.label })) },
  brief: { profile: listPrismProfiles().map((p) => ({ id: p.id, label: p.label, stages: p.stages })), stage: [{ id: "transcribe", label: "전사" }, { id: "extract", label: "구조화 추출" }, { id: "merge", label: "2차 병합" }] },
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
   · nexus_frameforge_prompt     — FrameForge 프레임·버튼·박스·배지·디바이더·아이콘·장식·아이템 슬롯 생성
   · nexus_frameforge_kit_prompts — 브랜드웹 키트(같은 스타일의 부품 세트) 프롬프트 일괄 생성
   · nexus_lightfx_prompt        — 광원/빛효과 에셋 (순흑/단색 배경, 합성용)
   · nexus_variation_prompt      — UI 에셋 리스킨(컬러·재질 오버레이 패스, 구조 보존)
   · nexus_design_alternative_prompt — 디자인 대안(모티프·재질 재해석, 골격 유지)
   · nexus_item_bundle_prompt    — 아이템 여러 개 → 꾸러미 합성 (원본 절대 보존)
   · nexus_quality_up_prompt     — KV 배경 품질 향상 (캐릭터·타이틀 형태 보존)
   · nexus_character_fx_prompt   — 캐릭터에 빛·파티클 연출 (형태 99%·얼굴 99.9% 보존)
   · nexus_render_matrix_prompt   — 플랫 타이포 → 재질 렌더 프롬프트 (Render Matrix 앱 컴파일러 동일, render-matrix|pop)
   · nexus_title_effect_prompt / nexus_bg_generate_prompt / nexus_bg_compose_prompt / nexus_floating_items_prompt — NexusPreview 키비주얼 편집 4모드 (앱 빌더 동일)
   · nexus_prompt_audit_prompt   — Prompt Audit 감사관 지시문 (모든 스킬의 프롬프트 QA 게이트)
   · nexus_theme_preset_prompt   — Promo Skin 컨셉 → 테마 토큰 프리셋
   · nexus_motion_prompt         — Motion Matrix Veo 모션 프롬프트
   · nexus_brief_extraction_prompt / nexus_brief_profile_prompt / nexus_brief_plugin_json — 수정요청서 분석 (범용 규칙 + 오상스 프로필, Prism 동일)
   · nexus_typecore_sovereign_prompt — Typecore Sovereign RPG/게임 타이틀 프롬프트
   · nexus_typecore_breeze_prompt    — Typecore Breeze 캐주얼/캘리 타이틀 프롬프트
3) nexus_render_image 로 Gemini 이미지 모델 호출 (참조 이미지 파일 첨부 가능)
4) 후처리 픽셀 툴:
   · nexus_extract_effect      — Mask Forge 이펙트 커브(cutoff 6·gamma 0.85) 투명화, 앱과 동일 코드
   · nexus_remove_background     — 단색 배경(블랙/크로마) 키잉 → 투명 PNG
   · nexus_alpha_plan / nexus_alpha_batch — 폴더 단위 대량 투명화: 자동 분류(flat/vignette/glow/nonflat) plan.json → 로컬 CLI 병렬 처리(같은 코드). 3장 이상이면 단건 툴 반복 대신 이쪽.
   · nexus_split_character_effect — 캐릭터/발광 이펙트 분리 (스크린 블렌드 레이어)
   · nexus_remove_ai             — 위 로컬 방식의 QA가 실패한 경우에만 사용하는 Remove.bg AI 최종 fallback
   투명화 우선순위: 색상 키잉/이펙트 알파/캐릭터 분리 같은 로컬·결정적 방식 → 알파·가장자리·닫힌 공간 QA → 실패 시에만 nexus_remove_ai.
5) nexus_design_rubric — 결과물 평가용 디자인 루브릭 · nexus_design_evaluation_prompt — 앱과 동일한 평가 프롬프트+응답 스키마 · nexus_design_evaluation_score — 앱과 동일한 가중 채점
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
   · nexus_asset_library_list — 버튼·화살표·프레임·FX 에셋 검색
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
    renderMatrix: z.record(z.string(), z.any()).describe("nexus_render_matrix_prompt 선택지 (variant 별 옵션 id·프리셋)"),
    titleFx: z.record(z.string(), z.any()).describe("nexus_title_effect_prompt 선택지"),
    floating: z.record(z.string(), z.any()).describe("nexus_floating_items_prompt 선택지"),
    motion: z.record(z.string(), z.any()).describe("nexus_motion_prompt 선택지"),
    promptAudit: z.record(z.string(), z.any()).describe("nexus_prompt_audit_prompt 선택지"),
    brief: z.record(z.string(), z.any()).describe("nexus_brief_* 선택지 (페이지 프로필·단계)"),
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
  description: "Nexus FrameForge 앱의 실제 옵션과 buildCompletePrompt 엔진으로 프레임·버튼·박스·배지·디바이더·아이콘·장식(타이틀·섹션·내비)·아이템 슬롯 생성 프롬프트를 만듭니다. 결과의 prompt 와 aspectRatio 를 nexus_render_image에 전달하세요.",
  inputSchema: {
    assetType: z.enum(FRAMEFORGE_ASSET_TYPES.map((o) => o.key)).describe("용도: button, box, frame, badge, divider, icon, ornament(타이틀·섹션·내비 장식), slot(아이템 슬롯·홀더)"),
    silhouette: z.enum(FRAMEFORGE_SILHOUETTES.map((o) => o.key)).describe("nexus_list_options의 frameforge.silhouette id. 선택한 assetType과 for가 일치해야 함"),
    mood: z.enum(FRAMEFORGE_MOODS.map((o) => o.key)).default("dark_rpg").describe("분위기 프리셋"),
    renderStyle: z.enum(FRAMEFORGE_RENDER_STYLES.map((o) => o.key)).default("illustrated").describe("렌더 표현 방식"),
    userText: z.string().max(1000).optional().describe("추가 제작 의도. 결과 에셋 내부에 실제 글자를 생성하라는 의미로 사용하지 않음"),
  },
  outputSchema: {
    prompt: z.string(),
    aspectRatio: z.string(),
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
  const aspectRatio = seedAspectRatio({ assetType, silhouette });
  const renderHint = `aspectRatio ${aspectRatio} 로 렌더 · 참조 이미지 없음 · 프롬프트의 단색 고대비 배경 유지 · Pro 1K 또는 Flash 1K 초안 · 렌더 후 nexus_remove_background로 투명화`;
  return data({ prompt, aspectRatio, renderHint, resolvedOptions, nextTool: "nexus_render_image" }, `${prompt}\n\n[렌더 힌트] ${renderHint}`);
});

// 브랜드웹 키트 — 같은 무드·렌더 표현을 공유하는 부품 세트 프롬프트를 한 번에. 사이트 한 벌 자동화용.
server.registerTool("nexus_frameforge_kit_prompts", {
  title: "FrameForge 브랜드웹 키트 프롬프트",
  description: "브랜드웹 한 벌에 들어가는 UI 부품 세트(CTA·보조 버튼·패널·타이틀 장식·디바이더·배지·슬롯·아이콘 등)를 같은 분위기·재질로 일괄 프롬프트화합니다. 각 항목의 prompt 와 aspectRatio 를 nexus_render_image 에 순서대로 전달하세요.",
  inputSchema: {
    kit: z.enum(FRAMEFORGE_KITS.map((k) => k.key)).default("brandweb_core").describe("키트: brandweb_core(기본 10종) / brandweb_reward(보상·쿠폰 8종) / brandweb_nav(내비·유틸 8종). nexus_list_options 의 frameforge.kit 참조"),
    mood: z.enum(FRAMEFORGE_MOODS.map((o) => o.key)).default("brandweb_gold").describe("분위기 프리셋 — 브랜드웹은 brandweb_gold / celestial / crimson_royal / frost_silver / modern_neon 권장"),
    renderStyle: z.enum(FRAMEFORGE_RENDER_STYLES.map((o) => o.key)).default("illustrated").describe("렌더 표현 방식"),
    userText: z.string().max(1000).optional().describe("모든 항목에 공통 적용할 추가 의도 (게임명·컬러 힌트 등). 글자 생성 지시로 쓰지 않음"),
  },
  outputSchema: {
    kit: z.string(),
    items: z.array(z.object({ assetType: z.string(), silhouette: z.string(), label: z.string(), aspectRatio: z.string(), prompt: z.string() })),
    sharedStyle: z.record(z.string(), z.any()),
    nextTool: z.literal("nexus_render_image"),
  },
  annotations: PURE,
}, async (a) => {
  const kit = FRAMEFORGE_KITS.find((k) => k.key === a.kit) || FRAMEFORGE_KITS[0];
  const mood = FRAMEFORGE_MOODS.find((o) => o.key === a.mood) || FRAMEFORGE_MOODS[0];
  const renderStyle = FRAMEFORGE_RENDER_STYLES.find((o) => o.key === a.renderStyle) || FRAMEFORGE_RENDER_STYLES[0];
  const shared = frameForgeSharedAxes(mood, renderStyle);
  const seeds = buildKitSeeds(kit, shared, { userIntent: a.userText || "" });
  const items = seeds.map((q) => ({
    assetType: q.seed.assetType.key, silhouette: q.seed.silhouette.key,
    label: `${q.seed.assetType.ko} · ${q.seed.silhouette.ko}`,
    aspectRatio: seedAspectRatio(q.seed), prompt: q.prompt,
  }));
  const sharedStyle = { mood: mood.key, preset: mood.preset, material: mood.material, ornament: mood.ornament, renderStyle: renderStyle.key, interior: "empty" };
  const text = items.map((it, i) => `${i + 1}. [${it.label} · ${it.aspectRatio}]\n${it.prompt}`).join("\n\n");
  return data({ kit: kit.key, items, sharedStyle, nextTool: "nexus_render_image" }, `${kit.ko} — ${items.length}종 (공통: ${mood.ko} / ${renderStyle.ko})\n\n${text}`);
});

// ─── Render Matrix — 플랫 타이포 → 재질 렌더 프롬프트 (앱 컴파일러 동일) ──────────
const RM_VARIANTS = {
  "render-matrix": { compiler: RM_MAIN, options: RM_MAIN_OPTIONS, personas: RM_MAIN_PERSONAS, engines: RM_MAIN_ENGINES, presets: RM_MAIN_PRESETS, defaultPersona: "Cinematic", frontRelief: "MicroChiseled" },
  pop: { compiler: RM_POP, options: RM_POP_OPTIONS, personas: RM_POP_PERSONAS, engines: RM_POP_ENGINES, presets: RM_POP_PRESETS, defaultPersona: "Chameleon", frontRelief: "MicroChiseled" },
};
// state 키 ↔ INITIAL_OPTIONS 리스트 키
const RM_OPTION_KEYS = [
  ["typographyScale", "typographyScales"], ["cameraLens", "cameraLenses"], ["background", "backgrounds"],
  ["frontRelief", "frontReliefs"], ["projectionDepth", "projectionDepths"], ["surfaceTreatment", "surfaceTreatments"],
  ["material", "materials"], ["dramaticTex", "dramaticTextures"], ["surfaceDetail", "surfaceDetails"], ["wearLevel", "wearLevels"],
  ["rimThickness", "rimThicknesses"], ["rimColor", "rimColors"], ["rimIntensity", "rimIntensities"],
  ["energyCore", "energyCores"], ["fxOrigin", "fxOrigins"], ["fxIntensity", "fxIntensities"],
];
// 앱 훅(useRenderPrompt / usePopPrompt)의 초기값과 동일한 기본 state
function rmDefaultState(variant) {
  const v = RM_VARIANTS[variant];
  return {
    currentView: "editor", directorPersona: v.defaultPersona, complexity: 3,
    typographyScale: "Macro", cameraLens: "Telephoto", background: "RealBlack", frontRelief: v.frontRelief,
    projectionDepth: "None", surfaceTreatment: "Standard", enableVfx: false, enableShadow: false,
    energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", vfxPassMode: false, vfxPassOverlay: false,
    material: "HyperChrome", materialInt: "Mid", dramaticTex: "Auto", surfaceDetail: "Standard",
    rimMaterial: "None", rimThickness: "None", wearLevel: "None", rimColor: "White", rimIntensity: "Moderate",
    enableGlint: false, renderEngine: "Unreal", userIntent: "", imageRatio: "16:9",
  };
}
function rmValidate(variant, state) {
  const v = RM_VARIANTS[variant];
  const bad = [];
  for (const [stateKey, listKey] of RM_OPTION_KEYS) {
    const list = v.options[listKey] || [];
    if (state[stateKey] != null && !list.some((o) => o.id === state[stateKey])) bad.push(`${stateKey}=${state[stateKey]} (가능: ${list.map((o) => o.id).join("|")})`);
  }
  if (!v.personas.some((p) => p.id === state.directorPersona)) bad.push(`directorPersona=${state.directorPersona} (가능: ${v.personas.map((p) => p.id).join("|")})`);
  if (!v.engines.some((e) => e.id === state.renderEngine)) bad.push(`renderEngine=${state.renderEngine} (가능: ${v.engines.map((e) => e.id).join("|")})`);
  return bad;
}
const RM_STATE_INPUT = {
  variant: z.enum(Object.keys(RM_VARIANTS)).default("render-matrix").describe("render-matrix(RPG·프리미엄) | pop(캐주얼·팝). nexus_list_options 의 renderMatrix 참조"),
  preset: z.string().optional().describe("PRESET_GROUPS 프리셋 id (예 gold_relic). 적용 후 아래 개별 옵션이 덮어씀"),
  directorPersona: z.string().optional(), typographyScale: z.string().optional(), cameraLens: z.string().optional(), background: z.string().optional(),
  frontRelief: z.string().optional(), projectionDepth: z.string().optional(), surfaceTreatment: z.string().optional(),
  material: z.string().optional(), dramaticTex: z.string().optional(), surfaceDetail: z.string().optional(), wearLevel: z.string().optional(),
  rimThickness: z.string().optional(), rimColor: z.string().optional(), rimIntensity: z.string().optional(), enableGlint: z.boolean().optional(),
  enableVfx: z.boolean().optional().describe("true 면 energyCore 가 None 이어도 GoldenDust 로 켜짐(앱 동작)"), energyCore: z.string().optional(), fxOrigin: z.string().optional(), fxIntensity: z.string().optional(),
  enableShadow: z.boolean().optional(), vfxPassMode: z.boolean().optional().describe("true 면 이펙트 전용 패스(검정 실루엣 + 발광만) 프롬프트"), vfxPassOverlay: z.boolean().optional(),
  renderEngine: z.string().optional(), userIntent: z.string().max(1000).optional().describe("추가 연출 의도"),
  exactText: z.string().max(400).optional().describe("타이포 내용 락 — 정확한 문구. 주면 앱과 같은 [TYPOGRAPHY CONTENT LOCK] 접미가 붙음"),
  lines: z.array(z.string()).optional().describe("타이포 행 배열 (exactText 와 함께)"),
  strictLock: z.boolean().default(true).describe("render-matrix-typography 스킬 기본: projectionDepth None · cameraLens Telephoto 강제 (플랫 형태 보존)"),
};

server.registerTool("nexus_render_matrix_prompt", {
  title: "Render Matrix 재질 렌더 프롬프트 (앱 동일)",
  description: "플랫 단색 타이포(Typecore 결과)를 재질·조명·FX 가 입혀진 타이틀로 렌더하는 프롬프트를 Render Matrix 앱의 컴파일러(generateIR + compileNanoBanana)로 만듭니다. 결과 prompt 를 플랫 타이포 이미지를 참조로 nexus_render_image 에 image-to-image 로 전달하세요. 옵션 id 는 nexus_list_options 의 renderMatrix 참조.",
  inputSchema: RM_STATE_INPUT,
  outputSchema: {
    prompt: z.string().describe("NanoBanana(Gemini 이미지) 용 — nexus_render_image 에 그대로"),
    prompts: z.record(z.string(), z.string()).describe("NanoBanana / ChatGPT / Midjourney"),
    feelSummary: z.any(), auditIssues: z.array(z.any()), qualityScores: z.record(z.string(), z.any()),
    state: z.record(z.string(), z.any()), renderHint: z.string(), nextTool: z.literal("nexus_render_image"),
  },
  annotations: PURE,
}, async (a) => {
  const variant = a.variant || "render-matrix";
  const v = RM_VARIANTS[variant];
  const state = rmDefaultState(variant);
  if (a.preset) {
    const preset = v.presets.flatMap((g) => g.presets).find((p) => p.id === a.preset);
    if (!preset) return errText(`프리셋을 찾을 수 없습니다: ${a.preset} (가능: ${v.presets.flatMap((g) => g.presets.map((p) => p.id)).join(", ")})`);
    Object.assign(state, preset.settings || {});
  }
  for (const key of Object.keys(RM_STATE_INPUT)) {
    if (["variant", "preset", "exactText", "lines", "strictLock"].includes(key)) continue;
    if (a[key] !== undefined) state[key] = a[key];
  }
  if (a.strictLock !== false) { state.projectionDepth = "None"; state.cameraLens = "Telephoto"; }
  const bad = rmValidate(variant, state);
  if (bad.length) return errText(`옵션 id 오류:\n${bad.join("\n")}`);
  const C = v.compiler;
  const ir = C.generateIR(state, v.options);
  const lockSuffix = a.exactText
    ? `\n\n[TYPOGRAPHY CONTENT LOCK — ABSOLUTE]\nExact text: ${JSON.stringify(a.exactText)}\nExact rows: ${JSON.stringify(a.lines || String(a.exactText).split("\n"))}\nPreserve spelling, row count, line breaks, glyph silhouettes, spacing, and approved composition exactly. Change material, depth, lighting, and FX only.`
    : "";
  const prompts = {
    NanoBanana: C.compileNanoBanana(ir, state) + lockSuffix,
    ChatGPT: (C.compileChatGPT ? C.compileChatGPT(ir, state) : "") + lockSuffix,
    Midjourney: (C.compileMidjourney ? C.compileMidjourney(ir, state) : "") + lockSuffix,
  };
  const feelSummary = C.buildFeelSummary ? C.buildFeelSummary(state, v.options) : null;
  const auditIssues = C.performLogicAudit ? C.performLogicAudit(state) : [];
  const qualityScores = C.calculateQualityScore ? C.calculateQualityScore(state) : {};
  const renderHint = `플랫 타이포 PNG 를 참조 이미지로 nexus_render_image 에 image-to-image · 비율은 참조 자동 감지 · Pro 2K 권장 · 형태 락: projectionDepth ${state.projectionDepth} / cameraLens ${state.cameraLens}${state.vfxPassMode ? " · 이펙트 패스 결과는 nexus_extract_effect 로 투명화" : ""}`;
  const text = `${prompts.NanoBanana}\n\n[state] ${JSON.stringify(state)}\n[audit] ${auditIssues.length ? JSON.stringify(auditIssues) : "없음"}\n[quality] ${JSON.stringify(qualityScores)}\n[렌더 힌트] ${renderHint}`;
  return data({ prompt: prompts.NanoBanana, prompts, feelSummary, auditIssues, qualityScores, state, renderHint, nextTool: "nexus_render_image" }, text);
});

// ─── NexusPreview 키비주얼 편집 — 타이틀 이펙트 / 배경 생성·합성 / 공중부양 아이템 (앱 빌더 동일, 2026-09) ──────────
const idsOf = (list) => list.map((o) => o.key || o.id);
server.registerTool("nexus_title_effect_prompt", {
  title: "타이틀 이펙트 프롬프트 (KV 편집 동일)",
  description: "타이틀/대형 텍스트 이미지에 속도감·서리·아우라·안개·금빛·글리치·모션블러 등 연출을 더하는 프롬프트를 NexusPreview 타이틀 이펙트 모드와 같은 빌더로 만듭니다. 글자 철자·레터폼·서체는 100% 보존. 결과 prompt 와 타이틀 PNG 를 nexus_render_image 에 image-to-image 로 전달하세요.",
  inputSchema: {
    effects: z.array(z.enum(idsOf(TITLE_FX_EFFECTS))).default([]).describe("다중 선택. 비우면 자동(모델이 분석해 조합)"),
    color: z.enum(idsOf(TITLE_FX_COLORS)).default("auto"),
    direction: z.enum(idsOf(TITLE_FX_DIRECTIONS)).default("auto"),
    intensity: z.enum(idsOf(TITLE_FX_INTENSITY)).default("normal"),
    bg: z.enum(idsOf(TITLE_FX_BG_OPTIONS)).default("keep"),
    intent: z.string().max(800).optional().describe("추가 연출 의도"),
  },
  outputSchema: { prompt: z.string(), renderHint: z.string(), nextTool: z.literal("nexus_render_image") },
  annotations: PURE,
}, async (a) => {
  const prompt = buildTitlePrompt(a.effects || [], { color: a.color, direction: a.direction, intensity: a.intensity, bg: a.bg, intent: a.intent || "" });
  const renderHint = "타이틀 PNG 를 참조로 image-to-image · 비율 자동 · 결과가 검정 매트면 nexus_extract_effect 로 이펙트만 분리 가능";
  return data({ prompt, renderHint, nextTool: "nexus_render_image" }, `${prompt}\n\n[렌더 힌트] ${renderHint}`);
});

server.registerTool("nexus_bg_generate_prompt", {
  title: "KV 배경 생성 프롬프트 (KV 편집 동일)",
  description: "컨셉 텍스트(+선택 참고 이미지)로 인물·텍스트·로고 없는 게임 프로모션 KV 배경을 만드는 프롬프트. NexusPreview 배경 생성 모드와 동일 문구.",
  inputSchema: {
    concept: z.string().min(1).max(1500).describe("배경 컨셉 (한국어 자연어)"),
    hasReference: z.boolean().default(false).describe("참고 이미지를 함께 보낼 경우 true — 분위기·색감만 참고하고 인물·글자·로고 복제 금지 문구 포함"),
    aspectRatio: z.enum(["16:9", "21:9", "4:3", "1:1", "9:16"]).default("16:9"),
  },
  outputSchema: { prompt: z.string(), aspectRatio: z.string(), renderHint: z.string(), nextTool: z.literal("nexus_render_image") },
  annotations: PURE,
}, async (a) => {
  const prompt = buildBgGeneratePrompt(a.concept, !!a.hasReference);
  const renderHint = `aspectRatio ${a.aspectRatio} · Pro 2K/4K 권장 · 참고 이미지가 있으면 refs 로 전달`;
  return data({ prompt, aspectRatio: a.aspectRatio, renderHint, nextTool: "nexus_render_image" }, `${prompt}\n\n[렌더 힌트] ${renderHint}`);
});

server.registerTool("nexus_bg_compose_prompt", {
  title: "KV 배경 합성 프롬프트 (KV 편집 동일)",
  description: "기존 KV 배경 위에 요청 요소를 더하거나(텍스트 지시만) 중앙에 임시 배치한 소스 이미지를 자연스럽게 합성하는 프롬프트. 새 문자 생성 절대 금지 규칙 포함. NexusPreview 배경 합성 모드와 동일 문구.",
  inputSchema: {
    intent: z.string().min(1).max(1500).describe("사용자 요청 (무엇을 어디에 어떻게)"),
    hasAsset: z.boolean().default(false).describe("소스 이미지를 배경 중앙에 임시 배치한 드래프트를 참조로 보낼 경우 true"),
  },
  outputSchema: { prompt: z.string(), renderHint: z.string(), nextTool: z.literal("nexus_render_image") },
  annotations: PURE,
}, async (a) => {
  const prompt = buildBgComposePrompt(a.intent, !!a.hasAsset);
  const renderHint = "배경(또는 소스가 중앙에 얹힌 드래프트)을 참조로 image-to-image · matchInputAspect · 4K 권장";
  return data({ prompt, renderHint, nextTool: "nexus_render_image" }, `${prompt}\n\n[렌더 힌트] ${renderHint}`);
});

server.registerTool("nexus_floating_items_prompt", {
  title: "공중부양 아이템 프롬프트 (KV 편집 동일)",
  description: "아이템 이미지들을 물방울·번개·금빛·회오리 등 원형 이펙트로 감싸 공중에 띄우는 프롬프트 세트. NexusPreview 공중부양 모드와 동일 빌더 — 마스터 프롬프트와, layered-transparent 모드일 때 필요한 보정·분리(이펙트/아이템) 프롬프트를 함께 반환합니다.",
  inputSchema: {
    itemCount: z.number().int().min(1).max(12).describe("아이템 참조 이미지 개수"),
    effect: z.enum(idsOf(FLOATING_EFFECT_OPTIONS)).default("bubble"),
    form: z.enum(idsOf(FLOATING_FORM_OPTIONS)).default("broken-orbit"),
    layout: z.enum(idsOf(FLOATING_LAYOUT_OPTIONS)).default("each"),
    color: z.enum(idsOf(FLOATING_COLORS)).default("auto"),
    intensity: z.enum(idsOf(FLOATING_INTENSITY_OPTIONS)).default("medium"),
    motion: z.enum(idsOf(FLOATING_MOTION_OPTIONS)).default("clockwise"),
    density: z.enum(idsOf(FLOATING_DENSITY_OPTIONS)).default("medium"),
    outputMode: z.enum(idsOf(FLOATING_OUTPUT_OPTIONS)).default("layered-transparent"),
    groupMode: z.enum(idsOf(FLOATING_GROUP_OPTIONS)).default("auto"),
    groupAssignments: z.array(z.number().int()).optional().describe("custom 그룹 모드일 때 아이템별 그룹 번호"),
    primaryIndex: z.number().int().min(0).default(0),
    opening: z.number().min(0).max(100).optional().describe("링 개방 비율 %"),
    frontCross: z.number().min(0).max(100).optional().describe("전방 교차 허용 %"),
    bg: z.enum(idsOf(BUNDLE_BG_OPTIONS)).default("black"),
    extra: z.string().max(800).optional(),
  },
  outputSchema: {
    prompt: z.string(), groupPlan: z.record(z.string(), z.any()), repairPrompt: z.string(),
    separationPrompts: z.record(z.string(), z.string()), aspectRatio: z.string(), renderHint: z.string(), nextTool: z.literal("nexus_render_image"),
  },
  annotations: PURE,
}, async (a) => {
  const bg = BUNDLE_BG_OPTIONS.find((o) => o.key === a.bg) || BUNDLE_BG_OPTIONS[0];
  const groupPlan = resolveFloatingGroupPlan(a.itemCount, a.groupMode, a.groupAssignments || [], a.primaryIndex);
  const opts = { effect: a.effect, form: a.form, layout: a.layout, color: a.color, intensity: a.intensity, motion: a.motion, density: a.density,
    outputMode: a.outputMode, opening: a.opening, frontCross: a.frontCross, groupMode: a.groupMode, groupAssignments: a.groupAssignments || [], primaryIndex: a.primaryIndex,
    itemCount: a.itemCount, bg, extra: a.extra || "" };
  const prompt = buildFloatingPrompt(opts);
  const repairPrompt = buildFloatingRepairPrompt({ itemCount: a.itemCount, groupMode: a.groupMode, groupAssignments: a.groupAssignments || [], primaryIndex: a.primaryIndex });
  const separationPrompts = a.outputMode === "layered-transparent"
    ? { effect: buildFloatingSeparationPrompt("effect", { itemCount: a.itemCount }), items: buildFloatingSeparationPrompt("items", { itemCount: a.itemCount }) }
    : {};
  const aspectRatio = a.itemCount === 1 ? "1:1" : "16:9";
  const renderHint = `아이템 PNG ${a.itemCount}장을 순서대로 refs 로 · aspectRatio ${aspectRatio} · layered-transparent 면 마스터 → (보정) → 분리 2회 렌더 후 이펙트는 nexus_extract_effect, 아이템은 nexus_remove_background(chroma) 로 투명화`;
  return data({ prompt, groupPlan, repairPrompt, separationPrompts, aspectRatio, renderHint, nextTool: "nexus_render_image" },
    `${prompt}\n\n[groupPlan] ${JSON.stringify(groupPlan)}\n[렌더 힌트] ${renderHint}`);
});

// ─── Prompt Audit — 앱 감사관 지시문 그대로 (외부 모델이 직접 수행) ──────────
server.registerTool("nexus_prompt_audit_prompt", {
  title: "프롬프트 감사 지시문 (Prompt Audit 동일)",
  description: "PromptAudit 앱이 Gemini 에 보내는 감사관 지시문(충돌 유형 6종·심각도·JSON 출력 형식·도메인 컨텍스트)을 입력 프롬프트와 합쳐 돌려줍니다. 이 텍스트를 그대로 모델에 주면 앱과 같은 형식의 감사 결과(summary/score/conflicts/improvedPrompt JSON)를 얻습니다. 어떤 스킬이든 결과 프롬프트의 QA 게이트로 사용하세요.",
  inputSchema: {
    prompt: z.string().min(1).max(AUDIT_MAX_LENGTH).describe(`감사할 프롬프트 (최대 ${AUDIT_MAX_LENGTH}자)`),
    sourceApp: z.enum(Object.keys(AUDIT_SOURCE_CONTEXT)).optional().describe("도메인 컨텍스트"),
    title: z.string().max(200).optional().describe("원본 제목(있으면)"),
  },
  outputSchema: { auditPrompt: z.string(), expectedShape: z.string(), conflictTypes: z.array(z.string()) },
  annotations: PURE,
}, async (a) => {
  const auditPrompt = buildAuditPromptText(a.prompt, a.sourceApp || null, a.title ? { title: a.title } : null);
  const expectedShape = '{ "summary": string, "score": 0-100, "conflicts": [{ id, type, severity: high|med|low, title, evidence, explanation, suggestions: [{ label, rewrite }] }], "globalSuggestions": string[], "improvedPrompt": string }';
  return data({ auditPrompt, expectedShape, conflictTypes: Object.keys(AUDIT_CONFLICT_TYPES) }, auditPrompt);
});

// ─── Promo Skin — 컨셉 → 테마 토큰 프리셋 (앱 시스템 프롬프트 그대로) ──────────
server.registerTool("nexus_theme_preset_prompt", {
  title: "테마 프리셋 프롬프트 (Promo Skin 동일)",
  description: "프로모션 페이지 컨셉(한국어)에서 컬러 토큰(primary/accent/title/bg 그라데이션 등)과 변형(frame/button/motif) 프리셋 JSON 을 뽑는 시스템 프롬프트와 응답 스키마를 돌려줍니다. Promo Skin 앱과 동일. 브랜드웹 자동화의 컬러 시스템 단계에 사용.",
  inputSchema: { concept: z.string().min(1).max(600).describe("페이지 컨셉 (예: 겨울 서리 왕국, 황금 축제)") },
  outputSchema: { systemPrompt: z.string(), userPrompt: z.string(), responseSchema: z.record(z.string(), z.any()) },
  annotations: PURE,
}, async (a) => {
  const userPrompt = `컨셉: ${a.concept}`;
  return data({ systemPrompt: THEME_SYSTEM_PROMPT, userPrompt, responseSchema: THEME_RESPONSE_SCHEMA }, `${THEME_SYSTEM_PROMPT}\n\n${userPrompt}`);
});

// ─── Motion Matrix — Veo 모션 프롬프트 (앱 컴파일러 동일) ──────────
server.registerTool("nexus_motion_prompt", {
  title: "모션 프롬프트 (Motion Matrix 동일)",
  description: "렌더된 타이틀/오브젝트 이미지에 루프·인트로·트랜지션 모션을 주는 Veo 프롬프트(+네거티브)를 Motion Matrix 앱 컴파일러로 만듭니다. 옵션 id 는 nexus_list_options 의 motion 참조. 결과 prompt 를 이미지와 함께 Veo(30c) 렌더에 사용하세요.",
  inputSchema: {
    animationMode: z.enum(["loop", "intro", "transition"]).default("loop"),
    exportMode: z.enum(idsOf(MOTION_EXPORT_MODES)).default("production"),
    targetModel: z.string().default("universal").describe("universal | veo 등 — 최적화 대상 모델 힌트"),
    targetMaterial: z.string().default("ice"),
    vfxTarget: z.string().default("all"),
    layers: z.record(z.string(), z.any()).optional().describe("레이어 설정 덮어쓰기 — 기본은 앱 DEFAULT_LAYERS. 키: surface/edge/ambient(모드별 FX id), intensity, duration, flow, intro, dynamics"),
    optimize: z.boolean().default(true).describe("앱의 inspectAndOptimizePrompt 적용 (기본 on)"),
  },
  outputSchema: { prompt: z.string(), rawPrompt: z.string(), negativePrompt: z.string(), layers: z.record(z.string(), z.any()), optimizationLogs: z.array(z.any()), renderHint: z.string() },
  annotations: PURE,
}, async (a) => {
  const lists = MOTION_FX_LISTS[a.animationMode] || MOTION_FX_LISTS.loop;
  const layers = { ...MOTION_DEFAULT_LAYERS, ...(a.layers || {}) };
  for (const key of ["surface", "edge", "ambient"]) {
    if (!lists[key].some((o) => o.id === layers[key])) layers[key] = lists[key][0].id;
  }
  const rawPrompt = compileMotionRaw(layers, a.exportMode, a.animationMode, a.targetMaterial, a.vfxTarget, a.targetModel, lists.surface, lists.edge, lists.ambient);
  const negativePrompt = compileMotionNegative(layers, a.exportMode, a.animationMode, a.targetModel, lists.surface, lists.edge, lists.ambient);
  const opt = a.optimize ? optimizeMotionPrompt(rawPrompt, a.targetModel) : { optimizedText: rawPrompt, logs: [] };
  const prompt = opt.optimizedText || rawPrompt;
  const renderHint = `Veo 모델: ${VEO_MODELS.map((m) => m.id).join(" | ")} · 소스 이미지를 첫 프레임 참조로 · 영상 30c`;
  return data({ prompt, rawPrompt, negativePrompt, layers, optimizationLogs: opt.logs || [], renderHint }, `${prompt}\n\n[negative] ${negativePrompt}\n[렌더 힌트] ${renderHint}`);
});

// ─── Brief Studio Prism — 수정요청서 분석 (범용 규칙 층 + 페이지 프로필 층, 2026-09) ──────────
server.registerTool("nexus_brief_extraction_prompt", {
  title: "수정요청서 범용 추출 프롬프트 (Prism 동일)",
  description: "어떤 게임·페이지의 제작/수정요청서든 페이지 구조(섹션 패턴 어휘)와 세부 데이터를 뽑는 범용 추출 프롬프트 + 응답 스키마. 옛 캡처 무시·붉은색 강조·A→B 치환·문서 양식 무시 같은 해석 규칙이 포함돼 있습니다. 특정 페이지 템플릿(오상스 등)은 nexus_brief_profile_prompt 를 쓰세요.",
  inputSchema: { extraNote: z.string().max(1500).optional().describe("사용자 교정 지시 (최우선 반영)"), includeOpsPrompt: z.boolean().default(false).describe("Figma 템플릿 ops 골격에 값을 채우는 2단계 프롬프트 사용법도 포함") },
  outputSchema: { prompt: z.string(), responseSchema: z.record(z.string(), z.any()), patternVocab: z.string(), revisionRules: z.string(), opsPromptUsage: z.string().optional(), opsSchema: z.record(z.string(), z.any()).optional() },
  annotations: PURE,
}, async (a) => {
  const prompt = briefExtractionPrompt(a.extraNote || "");
  const out = { prompt, responseSchema: BRIEF_EXTRACTION_SCHEMA, patternVocab: BRIEF_PATTERN_VOCAB, revisionRules: GENERIC_REVISION_RULES };
  if (a.includeOpsPrompt) {
    out.opsPromptUsage = "추출 JSON 과 Figma 템플릿 ops 스키마 JSON 을 인자로 opsPrompt(extractedJson, schemaJson) 형태로 결합 — value/match 만 교체, id/slot/type/순서 불변. 예: " + briefOpsPrompt("<extractedJson>", "<schemaJson>").slice(0, 400);
    out.opsSchema = BRIEF_OPS_SCHEMA;
  }
  return data(out, `${prompt}\n\n[responseSchema] ${JSON.stringify(BRIEF_EXTRACTION_SCHEMA).slice(0, 600)}…`);
});

server.registerTool("nexus_brief_profile_prompt", {
  title: "수정요청서 페이지 프로필 프롬프트 (Prism 오상스 동일)",
  description: "페이지 템플릿 프로필(오상스 = 오늘의 상품 스페셜)의 단계별 프롬프트와 응답 스키마를 앱(BriefStudio Prism)과 동일하게 돌려줍니다. 흐름: transcribe(이미지/PDF → 반영 희망 내용 전사 + 빨강 대표 아이콘 redItems) → extract(전사 텍스트만으로 슬롯 구조화, 이미지 미전달) → 필요 시 merge(2차 요청서 병합). 결과 데이터는 nexus_brief_plugin_json 으로 플러그인 JSON 화.",
  inputSchema: {
    profile: z.string().default("osangseu").describe("페이지 프로필 id — nexus_list_options 의 brief.profile"),
    stage: z.enum(["transcribe", "extract", "merge"]).default("transcribe"),
    note: z.string().max(1500).optional().describe("추가 지시 (extract/merge)"),
    sourceText: z.string().max(20000).optional().describe("extract/merge 단계: transcribe 결과 transcript 텍스트 — 프롬프트 뒤에 [반영 희망 내용 (전사)] 로 붙임"),
    redItems: z.array(z.object({ box: z.string(), item: z.string() })).optional().describe("transcribe 결과 redItems — 주면 앱과 같이 [붉은색 대표 아이콘 (상자→아이템)] 목록을 전사 본문에 붙임"),
    baseText: z.string().max(20000).optional().describe("요청서와 함께 온 추가 입력 텍스트"),
    prevJson: z.string().max(60000).optional().describe("merge 단계: 직전 차수 확정 데이터 JSON 문자열"),
  },
  outputSchema: { profile: z.string(), stage: z.string(), prompt: z.string(), responseSchema: z.record(z.string(), z.any()), input: z.string(), note: z.string(), nextStage: z.string() },
  annotations: PURE,
}, async (a) => {
  const profile = getPrismProfile(a.profile);
  if (!profile) return errText(`프로필을 찾을 수 없습니다: ${a.profile} (가능: ${listPrismProfiles().map((p) => p.id).join(", ")})`);
  const st = profile.stages[a.stage];
  if (!st) return errText(`프로필 ${profile.key} 에 ${a.stage} 단계가 없습니다.`);
  let prompt;
  if (a.stage === "transcribe") prompt = st.prompt();
  else if (a.stage === "extract") {
    const redByBox = profile.groupRedItems ? profile.groupRedItems(a.redItems || []) : [];
    const body = profile.buildTranscriptSourceText ? profile.buildTranscriptSourceText({ transcript: a.sourceText || "", redByBox, baseText: a.baseText || "" }) : (a.sourceText || "");
    prompt = st.prompt(a.note || "") + (body ? `\n\n[반영 희망 내용 (전사)]\n${body}` : "");
  }
  else {
    if (!a.prevJson) return errText("merge 단계에는 prevJson(직전 차수 데이터)이 필요합니다.");
    prompt = st.prompt(a.prevJson, a.note || "") + (a.sourceText ? `\n\n[이번 차수 변경 (전사)]\n${a.sourceText}` : "");
  }
  const nextStage = a.stage === "transcribe" ? "extract (transcript 를 sourceText 로, redItems 는 boxes 순서대로 slotIcons 에 ` + ` 로 결합)" : "nexus_brief_plugin_json";
  return data({ profile: profile.key, stage: a.stage, prompt, responseSchema: st.schema, input: st.input, note: st.note, nextStage },
    `${prompt}\n\n[input] ${st.input}\n[responseSchema] ${JSON.stringify(st.schema).slice(0, 500)}…\n[next] ${nextStage}`);
});

server.registerTool("nexus_brief_plugin_json", {
  title: "프로필 데이터 → 플러그인 JSON (Prism 동일)",
  description: "extract/merge 결과 데이터를 페이지 프로필의 toPluginJson(앱과 동일)으로 Figma 플러그인 입력 JSON 으로 바꾸고 통계를 돌려줍니다.",
  inputSchema: {
    profile: z.string().default("osangseu"),
    data: z.record(z.string(), z.any()).describe("extract/merge 단계 응답 JSON"),
    redItems: z.array(z.object({ box: z.string(), item: z.string() })).optional().describe("transcribe 의 redItems — 주면 앱과 같이 boxes 순서에 맞춰 slotIcons 에 결정적으로 주입(` + ` 결합)"),
  },
  outputSchema: { profile: z.string(), data: z.record(z.string(), z.any()), pluginJson: z.record(z.string(), z.any()), stats: z.record(z.string(), z.any()), uncertain: z.array(z.any()) },
  annotations: PURE,
}, async (a) => {
  const profile = getPrismProfile(a.profile);
  if (!profile) return errText(`프로필을 찾을 수 없습니다: ${a.profile}`);
  let payload = JSON.parse(JSON.stringify(a.data || {}));
  if (a.redItems?.length && profile.applyRedIconsToBoxes) payload = profile.applyRedIconsToBoxes(payload, profile.groupRedItems(a.redItems));
  const pluginJson = profile.toPluginJson(payload);
  const stats = profile.stats(payload);
  const uncertain = Array.isArray(payload?.uncertain) ? payload.uncertain : [];
  return data({ profile: profile.key, data: payload, pluginJson, stats, uncertain }, `${JSON.stringify(pluginJson, null, 1).slice(0, 1500)}\n\n[stats] ${JSON.stringify(stats)}${uncertain.length ? `\n[uncertain] ${uncertain.length}건` : ""}`);
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
  title: "배경 제거 (Mask Forge 색상 키)",
  description: "NEXUS Mask Forge 앱의 '색상 키' 와 같은 코드(extractColorKeyPixels)로 단색 배경을 투명화합니다 — 유클리드 색거리 tolerance/feather 램프 + 배경색 역산(decontam) + 선택적 구멍 보호. 타이틀·캐릭터·아이템 같은 '불투명 피사체' 용. 글로우·연기·파티클 같은 발광 플레이트는 nexus_extract_effect 를 쓰세요.",
  inputSchema: {
    imagePath: z.string().describe("입력 이미지 경로"),
    bg: z.string().default("auto").describe("배경색 — auto(테두리 링 자동감지, 앱과 동일) | black | white | chroma | #rrggbb"),
    tolerance: z.number().min(0).max(255).default(KEY_DEFAULTS.tolerance).describe("이 색거리 이하 = 완전 투명 (앱 기본 " + KEY_DEFAULTS.tolerance + ")"),
    feather: z.number().min(1).max(255).default(KEY_DEFAULTS.feather).describe("tolerance 부터 이 범위까지 알파 램프 (앱 기본 " + KEY_DEFAULTS.feather + ")"),
    holeProtect: z.boolean().default(KEY_DEFAULTS.holeProtect).describe("피사체 내부의 작은 구멍을 다시 채움(형태 보호)"),
    holeSize: z.number().min(0).max(50).default(KEY_DEFAULTS.holeSize).describe("구멍 보호 임계(전체 대비 %)"),
    decontam: z.boolean().default(KEY_DEFAULTS.decontam).describe("반투명 가장자리에서 배경색 역산(디프린지)"),
    trim: z.boolean().default(false).describe("투명 여백 잘라내기"),
    threshold: z.number().min(0).max(255).optional().describe("(구버전 호환) tolerance 의 별칭"),
    outputPath: z.string().optional().describe("저장 경로(.png). 생략 시 .tmp/mcp-out/ 아래 자동"),
  },
  outputSchema: {
    outputPath: z.string().describe("저장된 투명 PNG 절대경로"),
    bgColor: z.object({ r: z.number(), g: z.number(), b: z.number() }).describe("제거에 사용된 배경색"),
    tolerance: z.number(),
    feather: z.number(),
    width: z.number(),
    height: z.number(),
    qa: z.record(z.string(), z.any()).describe("앱과 동일한 QA 카운트 (transparent/partial/opaque/restored/total)"),
  },
  annotations: WRITE_LOCAL,
}, async (a) => {
  let imageData;
  try { ({ imageData } = await loadImageData(a.imagePath)); }
  catch (e) { return errText(`이미지를 열 수 없습니다: ${a.imagePath} — 경로/형식(png·jpg·webp)을 확인하세요. (${e.message})`); }
  const { width: W, height: H, data: d } = imageData;
  let bgRgb;
  if (a.bg === "auto") bgRgb = appDetectBg(d, W, H);
  else if (a.bg === "black") bgRgb = [0, 0, 0];
  else if (a.bg === "white") bgRgb = [255, 255, 255];
  else if (a.bg === "chroma") bgRgb = [0, 255, 0];
  else bgRgb = appToRgb(a.bg);
  if (!bgRgb) return errText(`배경색을 해석할 수 없습니다: ${a.bg}`);
  const tolerance = a.threshold != null ? a.threshold : a.tolerance;
  const keyed = extractColorKeyPixels({ data: d, width: W, height: H }, {
    bg: bgRgb, tolerance, feather: a.feather, holeProtect: a.holeProtect, holeSize: a.holeSize, decontam: a.decontam,
  });
  const result = a.trim ? cropPixels(keyed, alphaTrimBox(keyed.data, W, H)) : keyed;
  const out = a.outputPath
    ? (path.isAbsolute(a.outputPath) ? a.outputPath : path.join(ROOT, a.outputPath))
    : path.join(ensureOutDir(OUT_DIR), `keyed-${Date.now()}.png`);
  try {
    ensureOutDir(path.dirname(out));
    await savePixels(result, out);
  } catch (e) {
    return errText(`결과 저장 실패: ${out} — 출력 경로(outputPath)를 확인하세요. (${e.message})`);
  }
  const [br, bgC, bb] = bgRgb;
  return data(
    { outputPath: out, bgColor: { r: br, g: bgC, b: bb }, tolerance, feather: a.feather, width: result.width, height: result.height, qa: keyed.qa },
    `저장 완료: ${out}\n배경색 rgb(${br},${bgC},${bb}) · tolerance ${tolerance} · feather ${a.feather} · ${result.width}×${result.height}\nQA: 투명 ${keyed.qa.transparentPixels} · 반투명 ${keyed.qa.partialPixels} · 불투명 ${keyed.qa.opaquePixels}${keyed.qa.restoredPixels ? ` · 구멍 복원 ${keyed.qa.restoredPixels}` : ""}`
  );
});

server.registerTool("nexus_extract_effect", {
  title: "이펙트 투명화 (Mask Forge 이펙트 커브)",
  description: "NEXUS Mask Forge 앱의 '이펙트 추출' 과 같은 코드(extractEffectPixels)로 단색 매트 위 발광 플레이트(글로우·오라·연기·안개·파티클·빛줄기)를 straight-alpha PNG 로 바꿉니다. 기본값이 곧 '마스크 포지 이펙트 커브'(cutoff 6 · gamma 0.85 · opacity 100 · recoverColor). 불투명 피사체(타이틀·캐릭터·아이템)는 nexus_remove_background 를 쓰세요.",
  inputSchema: {
    imagePath: z.string().describe("입력 이미지 경로 — 순흑(또는 단색) 매트 위 이펙트"),
    bg: z.string().default("black").describe("매트 색 — black | auto | #rrggbb (크로마 그린은 발광 감쇠를 망가뜨리므로 비권장)"),
    cutoff: z.number().min(0).max(254).default(EFFECT_DEFAULTS.cutoff).describe("이 색거리 이하 = 완전 투명 (기본 6)"),
    gamma: z.number().min(0.2).max(4).default(EFFECT_DEFAULTS.gamma).describe("알파 곡선 (기본 0.85, 낮을수록 부드러운 감쇠 보존)"),
    opacity: z.number().min(0).max(100).default(EFFECT_DEFAULTS.opacity).describe("전체 강도 % (기본 100)"),
    recoverColor: z.boolean().default(EFFECT_DEFAULTS.recoverColor).describe("매트 색 역산으로 원색 복원 (기본 true)"),
    trim: z.boolean().default(false).describe("투명 여백 잘라내기 — 정렬 플레이트에는 끄기"),
    outputPath: z.string().optional().describe("저장 경로(.png). 생략 시 .tmp/mcp-out/ 아래 자동"),
  },
  outputSchema: {
    outputPath: z.string(),
    bgColor: z.object({ r: z.number(), g: z.number(), b: z.number() }),
    width: z.number(),
    height: z.number(),
    qa: z.record(z.string(), z.any()).describe("transparent/partial/opaque/total 픽셀 수 · reconstructionMae · coverage 비율"),
    warnings: z.array(z.string()),
  },
  annotations: WRITE_LOCAL,
}, async (a) => {
  let imageData;
  try { ({ imageData } = await loadImageData(a.imagePath)); }
  catch (e) { return errText(`이미지를 열 수 없습니다: ${a.imagePath} — 경로/형식(png·jpg·webp)을 확인하세요. (${e.message})`); }
  const { width: W, height: H, data: d } = imageData;
  const bgRgb = a.bg === "auto" ? appDetectBg(d, W, H) : (a.bg === "black" ? [0, 0, 0] : appToRgb(a.bg));
  if (!bgRgb) return errText(`매트 색을 해석할 수 없습니다: ${a.bg}`);
  const fx = extractEffectPixels({ data: d, width: W, height: H }, {
    cutoff: a.cutoff, gamma: a.gamma, opacity: a.opacity, recoverColor: a.recoverColor, bg: bgRgb,
  });
  const result = a.trim ? cropPixels(fx, alphaTrimBox(fx.data, W, H)) : fx;
  const out = a.outputPath
    ? (path.isAbsolute(a.outputPath) ? a.outputPath : path.join(ROOT, a.outputPath))
    : path.join(ensureOutDir(OUT_DIR), `effect-${Date.now()}.png`);
  try {
    ensureOutDir(path.dirname(out));
    await savePixels(result, out);
  } catch (e) {
    return errText(`결과 저장 실패: ${out} — 출력 경로(outputPath)를 확인하세요. (${e.message})`);
  }
  const q = fx.qa;
  const visible = q.partialPixels + q.opaquePixels;
  const coverage = q.totalPixels ? visible / q.totalPixels : 0;
  const warnings = [];
  if (q.transparentPixels === 0) warnings.push("완전 투명 픽셀이 없음 — 매트 색(bg)이 실제 배경과 다르거나 cutoff 가 너무 낮습니다.");
  if (visible === 0) warnings.push("남은 이펙트가 없음 — cutoff 를 낮추거나 매트 색을 확인하세요.");
  else if (coverage < 0.002) warnings.push("이펙트 커버리지가 0.2% 미만 — 대부분 사라졌습니다. gamma 를 낮추거나 cutoff 를 낮춰 재시도하세요.");
  if (q.reconstructionMae > 0.02) warnings.push(`역산 오차(MAE ${q.reconstructionMae.toFixed(4)})가 큼 — 매트가 균일하지 않을 수 있습니다.`);
  const [br, bgC, bb] = bgRgb;
  return data(
    { outputPath: out, bgColor: { r: br, g: bgC, b: bb }, width: result.width, height: result.height, qa: { ...q, coverage }, warnings },
    `저장 완료: ${out}\n매트 rgb(${br},${bgC},${bb}) · cutoff ${a.cutoff} · gamma ${a.gamma} · opacity ${a.opacity} · recoverColor ${a.recoverColor}\nQA: 투명 ${q.transparentPixels} · 반투명 ${q.partialPixels} · 불투명 ${q.opaquePixels} · 커버리지 ${(coverage * 100).toFixed(2)}%${warnings.length ? `\n경고: ${warnings.join(" / ")}` : ""}`
  );
});

// ─── 배치 투명화 (로컬 CLI 위임) ─────────────────────────────────────────────
// 수십~수백 장은 단건 툴 반복 대신 mcp/nexus-cli.bundle.mjs 를 자식 프로세스로 돌린다.
// CLI 는 이 서버와 같은 src/lib 번들이라 결과가 같고, 워커 병렬로 2048² 66장 ≈ 7초.
const CLI_BUNDLE = path.join(ROOT, "mcp", "nexus-cli.bundle.mjs");
async function runCli(args, cwd) {
  const { execFile } = await import("node:child_process");
  if (!fs.existsSync(CLI_BUNDLE)) throw new Error("mcp/nexus-cli.bundle.mjs 가 없습니다 — npm run mcp:build 를 먼저 실행하세요.");
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [CLI_BUNDLE, ...args], { cwd, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err && !stdout) reject(new Error(`${err.message}\n${stderr}`)); else resolve({ stdout, stderr, code: err ? err.code : 0 });
    });
  });
}
const absOrRoot = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));

server.registerTool("nexus_alpha_plan", {
  title: "배치 투명화 계획 (자동 분류)",
  description: "폴더의 이미지를 훑어 항목별 투명화 경로를 자동 분류(flat 색상 키 / vignette 허용치 상향 / glow 이펙트 추출 / nonflat AI 대상)한 편집 가능한 plan.json 을 만듭니다. 결과를 검토·수정한 뒤 nexus_alpha_batch 에 넘기세요. 픽셀 로직은 앱·MCP 단건 툴과 같은 src/lib.",
  inputSchema: {
    inputDir: z.string().describe("이미지 폴더(png·jpg·webp) 또는 파일 경로"),
    planPath: z.string().describe("저장할 plan.json 경로 — 항목 src/out 은 이 파일 기준 상대경로"),
    outDir: z.string().default("out").describe("plan 기준 출력 폴더(상대/절대)"),
    triage: z.boolean().default(true).describe("자동 분류 켜기 (false 면 테두리 색 통계만 기록)"),
  },
  outputSchema: {
    planPath: z.string(), count: z.number(),
    triageCounts: z.record(z.string(), z.number()).optional(),
    items: z.array(z.object({ src: z.string(), mode: z.string().optional(), class: z.string().optional(), reason: z.string().optional() })),
  },
  annotations: WRITE_LOCAL,
}, async (a) => {
  const planAbs = absOrRoot(a.planPath);
  const args = ["plan", "--in", absOrRoot(a.inputDir), "--out", planAbs, "--out-dir", a.outDir];
  if (!a.triage) args.push("--no-triage");
  let r;
  try { r = await runCli(args, ROOT); } catch (e) { return errText(`plan 실패: ${e.message}`); }
  if (!fs.existsSync(planAbs)) return errText(`plan 이 생성되지 않았습니다.\n${r.stderr}`);
  const plan = JSON.parse(fs.readFileSync(planAbs, "utf8"));
  const items = plan.items.map((it) => ({ src: it.src, mode: it.mode, class: it.triage?.class, reason: it.triage?.reason }));
  const lines = items.map((it) => `· ${it.src} → ${it.mode || plan.defaults.mode}${it.class ? ` [${it.class}] ${it.reason}` : ""}`).join("\n");
  return data(
    { planPath: planAbs, count: items.length, triageCounts: plan.triageCounts, items },
    `plan 저장: ${planAbs} (${items.length}개${plan.triageCounts ? " · " + Object.entries(plan.triageCounts).map(([k, v]) => `${k} ${v}`).join(", ") : ""})\n${lines}\n\n검토 후 항목별 mode/tolerance/feather/killFaint 를 고치고 nexus_alpha_batch(planPath) 로 실행하세요. mode "ai" 항목은 건너뛰며 nexus_remove_ai(승인 필요) 대상입니다.`
  );
});

server.registerTool("nexus_alpha_batch", {
  title: "배치 투명화 실행 (로컬 CLI)",
  description: "plan.json(또는 폴더+모드)을 로컬 배치 CLI 로 병렬 처리해 투명 PNG 들과 report.json, 선택적 체커보드 컨택트 시트를 만듭니다. nexus_remove_background/nexus_extract_effect 와 같은 코드이므로 단건 결과와 같습니다. 외부 호출 없음.",
  inputSchema: {
    planPath: z.string().optional().describe("nexus_alpha_plan 이 만든(또는 수정한) plan.json"),
    inputDir: z.string().optional().describe("plan 없이 폴더 전체를 한 모드로 처리할 때"),
    outDir: z.string().optional().describe("inputDir 모드의 출력 폴더"),
    mode: z.enum(["key", "effect"]).default("key").describe("inputDir 모드에서 쓸 방식"),
    jobs: z.number().int().min(1).max(16).optional().describe("워커 수 (기본: CPU-1, 최대 8)"),
    sheetPath: z.string().optional().describe("체커보드 컨택트 시트 PNG 저장 경로"),
    tolerance: z.number().optional(), feather: z.number().optional(), killFaint: z.number().optional(),
    cutoff: z.number().optional(), gamma: z.number().optional(),
  },
  outputSchema: {
    reportPath: z.string(), total: z.number(), done: z.number(), failed: z.number(), skipped: z.number(), elapsedMs: z.number(),
    sheetPath: z.string().optional(),
    warnings: z.array(z.object({ src: z.string(), warnings: z.array(z.string()) })),
    outputs: z.array(z.string()),
  },
  annotations: WRITE_LOCAL,
}, async (a) => {
  if (!a.planPath && !a.inputDir) return errText("planPath 또는 inputDir 가 필요합니다.");
  const args = ["alpha"];
  let reportPath;
  if (a.planPath) { const p = absOrRoot(a.planPath); args.push("--plan", p); reportPath = path.join(path.dirname(p), "report.json"); }
  else { const o = absOrRoot(a.outDir || path.join(path.dirname(absOrRoot(a.inputDir)), "out")); args.push("--in", absOrRoot(a.inputDir), "--out-dir", o, "--mode", a.mode); reportPath = path.join(o, "report.json"); }
  if (a.jobs) args.push("--jobs", String(a.jobs));
  const sheet = a.sheetPath ? absOrRoot(a.sheetPath) : null;
  if (sheet) args.push("--sheet", sheet);
  for (const k of ["tolerance", "feather", "killFaint", "cutoff", "gamma"]) if (a[k] != null) args.push(`--${k}`, String(a[k]));
  let r;
  try { r = await runCli(args, ROOT); } catch (e) { return errText(`배치 실패: ${e.message}`); }
  if (!fs.existsSync(reportPath)) return errText(`report 가 없습니다.\n${r.stdout}\n${r.stderr}`);
  const rep = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const warnings = rep.items.filter((it) => it.warnings && it.warnings.length).map((it) => ({ src: it.src, warnings: it.warnings }));
  const outputs = rep.items.filter((it) => it.out).map((it) => it.out);
  const fails = rep.items.filter((it) => it.error).map((it) => `FAIL ${it.src}: ${it.error}`);
  return data(
    { reportPath, total: rep.total, done: rep.done, failed: rep.failed, skipped: rep.skipped, elapsedMs: rep.elapsedMs, sheetPath: sheet || undefined, warnings, outputs },
    `완료 ${rep.done}/${rep.total}${rep.skipped ? ` · 건너뜀(ai) ${rep.skipped}` : ""}${rep.failed ? ` · 실패 ${rep.failed}` : ""} · ${(rep.elapsedMs / 1000).toFixed(1)}s\nreport: ${reportPath}${sheet ? `
sheet: ${sheet}` : ""}${warnings.length ? `
경고 ${warnings.length}건:
` + warnings.map((w) => `· ${path.basename(w.src)} — ${w.warnings.join(" / ")}`).join("\n") : ""}${fails.length ? "\n" + fails.join("\n") : ""}`
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
  description: "Nexus Admin의 현재 활성 디자인 평가 기준·가중치·규칙·버전을 실시간 조회해 반환합니다.",
  inputSchema: { type: z.string().min(1).default("banner").describe("평가 기준 유형. 기본값 banner") },
  outputSchema: {
    criteriaType: z.string(),
    criteriaVersionId: z.string(),
    criteriaVersionName: z.string(),
    criteria: z.array(z.record(z.string(), z.any())),
    rules: z.string(),
    source: z.string(),
    stale: z.boolean(),
    syncWarning: z.string(),
    markdown: z.string().describe("현재 활성 기준과 공통 평가 계약 (마크다운)"),
  },
  annotations: PURE,
}, async ({ type }) => {
  let contract;
  try { contract = fs.readFileSync(RUBRIC_PATH, "utf8"); }
  catch { return errText(`루브릭 파일을 찾을 수 없습니다: ${RUBRIC_PATH}`); }
  try {
    const snapshot = await loadActiveNexusCriteria({ type, projectRoot: ROOT });
    const markdown = `${formatNexusCriteriaMarkdown(snapshot)}\n\n${contract}`;
    return data({
      criteriaType: snapshot.criteriaType,
      criteriaVersionId: snapshot.criteriaVersionId,
      criteriaVersionName: snapshot.criteriaVersionName,
      criteria: snapshot.criteria,
      rules: snapshot.rules,
      source: snapshot.source,
      stale: !!snapshot.stale,
      syncWarning: snapshot.syncWarning || "",
      markdown,
    }, markdown);
  } catch (error) {
    return errText(`Nexus 평가 기준 조회 실패: ${error.message}`);
  }
});

// ─── 디자인 평가 — 앱(DesignEvaluator)과 동일한 프롬프트·스키마·채점 (2026-09) ──────────
// 예전엔 앱 인라인 프롬프트 / 스킬 자체 채점 / MCP 루브릭이 따로 놀아 "앱 점수 ≠ 스킬 점수"가 났다.
// 두 도구 모두 src/lib/designEvaluationPrompt.js · designEvaluationCore.js 를 그대로 호출한다.
const EVAL_TYPE_LABELS = {
  banner: "배너", promotion: "프로모션 페이지", promotionMobile: "프로모션 모바일", promotionKv: "프로모션 키비주얼",
  brandweb: "브랜드웹_메인", brandwebSub: "브랜드웹_서브", brandwebMobile: "브랜드웹_모바일",
  typo2d: "2D 타이포", typoRender: "렌더링 타이포", typoMotion: "모션 타이포",
};
const EVAL_TYPE_KEYS = Object.values(EVAL_CRITERIA_TYPES).filter((t) => t !== "prompt");

server.registerTool("nexus_design_evaluation_prompt", {
  title: "디자인 평가 프롬프트 (앱 동일)",
  description: "DesignEvaluator 앱이 Gemini 에 보내는 것과 동일한 평가 프롬프트와 응답 스키마를 만듭니다. 활성 기준(NexusAdmin)을 실시간 조회해 [임무 2] 평가 항목·채점 규칙을 주입합니다. 외부 모델(Claude 등)로 평가할 때 이 프롬프트를 그대로 쓰고, 결과 scores_data 를 nexus_design_evaluation_score 에 넘기세요.",
  inputSchema: {
    type: z.enum(EVAL_TYPE_KEYS).default("banner").describe("평가 기준 유형 — banner / promotion / promotionMobile / promotionKv / brandweb / brandwebSub / brandwebMobile / typo2d / typoRender / typoMotion"),
    autoClassify: z.boolean().default(false).describe("true 면 앱의 auto 모드처럼 카테고리 분류 지시를 포함(응답 category 필수). false 면 type 에 맞는 카테고리로 고정"),
    anchorsText: z.string().max(8000).optional().describe("기준점 앵커(few-shot) 텍스트가 있으면 그대로 삽입"),
  },
  outputSchema: {
    prompt: z.string(),
    category: z.string(),
    criteriaType: z.string(),
    criteriaVersionId: z.string(),
    criteriaVersionName: z.string(),
    scoreKeys: z.array(z.string()),
    responseSchema: z.record(z.string(), z.any()).describe("Gemini responseSchema. 다른 모델은 같은 형태의 JSON 을 요구하면 됨"),
    gate: z.record(z.string(), z.any()),
    source: z.string(),
    stale: z.boolean(),
    syncWarning: z.string(),
  },
  annotations: PURE,
}, async (a) => {
  try {
    const snapshot = await loadActiveNexusCriteria({ type: a.type, projectRoot: ROOT });
    const criteriaSource = criteriaSourceFromSnapshot(snapshot);
    const category = a.autoClassify ? "auto" : (EVAL_TYPE_LABELS[snapshot.criteriaType] || snapshot.criteriaType);
    const prompt = buildDesignEvaluationPrompt({ category, criteriaSource, anchorsText: a.anchorsText || "" });
    const scoreKeys = snapshot.criteria.map((c) => c.id).filter(Boolean);
    const responseSchema = buildEvaluationResponseSchema(scoreKeys, { includeCategory: true, includePurpose: true });
    const text = `${prompt}\n\n[scoreKeys] ${scoreKeys.join(",")}\n[criteriaVersion] ${snapshot.criteriaType}/${snapshot.criteriaVersionId} (${snapshot.source})${snapshot.syncWarning ? `\n[syncWarning] ${snapshot.syncWarning}` : ""}`;
    return data({
      prompt, category, criteriaType: snapshot.criteriaType, criteriaVersionId: snapshot.criteriaVersionId,
      criteriaVersionName: snapshot.criteriaVersionName, scoreKeys, responseSchema, gate: snapshot.gate,
      source: snapshot.source, stale: !!snapshot.stale, syncWarning: snapshot.syncWarning || "",
    }, text);
  } catch (error) {
    return errText(`평가 프롬프트 생성 실패: ${error.message}`);
  }
});

server.registerTool("nexus_design_evaluation_score", {
  title: "디자인 평가 채점 (앱 동일)",
  description: "모델이 낸 scores_data(항목별 score/reason)를 앱과 동일한 가중 평균·품질 게이트(총점 85·항목 75·hardFailures 0)로 채점합니다. 활성 기준을 조회해 항목 누락과 버전 불일치를 검사합니다.",
  inputSchema: {
    type: z.enum(EVAL_TYPE_KEYS).default("banner").describe("평가 기준 유형"),
    scores: z.record(z.string(), z.any()).describe("{ [criterionId]: { score:0-100, reason } } 또는 { [id]: number }"),
    hardFailures: z.array(z.string()).default([]),
    recommendedCorrections: z.array(z.string()).default([]),
    criteriaVersionId: z.string().optional().describe("프롬프트 도구가 준 버전 id. 다르면 채점을 거부"),
    offset: z.number().min(-20).max(20).default(0).describe("캘리브레이션 오프셋(앱의 fetchCalibration 값). 기본 0"),
  },
  outputSchema: {
    overall: z.number(), rawOverall: z.number(), pass: z.boolean(),
    metrics: z.array(z.record(z.string(), z.any())),
    lowMetrics: z.array(z.record(z.string(), z.any())),
    priorities: z.array(z.record(z.string(), z.any())),
    missing: z.array(z.string()),
    hardFailures: z.array(z.string()),
    recommendedCorrections: z.array(z.string()),
    gate: z.record(z.string(), z.any()),
    criteriaType: z.string(), criteriaVersionId: z.string(), source: z.string(), stale: z.boolean(),
  },
  annotations: PURE,
}, async (a) => {
  try {
    const snapshot = await loadActiveNexusCriteria({ type: a.type, projectRoot: ROOT });
    if (a.criteriaVersionId && a.criteriaVersionId !== snapshot.criteriaVersionId) {
      return errText(`기준 버전 불일치: 요청=${a.criteriaVersionId}, 활성=${snapshot.criteriaVersionId}. nexus_design_evaluation_prompt 를 다시 호출해 최신 기준으로 평가하세요.`);
    }
    const validation = validateEvalCriteria(snapshot.criteria || []);
    if (!validation.valid) return errText("활성 기준이 유효하지 않습니다.");
    const criteria = evalCriteriaSnapshot(validation.normalized);
    const report = calculateEvaluationReport({
      criteria, scores: a.scores, hardFailures: a.hardFailures, recommendedCorrections: a.recommendedCorrections,
      offset: a.offset || 0, gate: snapshot.gate,
    });
    const lines = report.metrics.map((m) => `- ${m.key} (${m.weight}) : ${m.score ?? "누락"}${m.reason ? ` — ${m.reason}` : ""}`).join("\n");
    const text = `총점 ${report.overall} (${report.pass ? "PASS" : "FAIL"}) · 기준 ${snapshot.criteriaType}/${snapshot.criteriaVersionId}${report.missing.length ? `\n누락 항목: ${report.missing.join(", ")}` : ""}${report.hardFailures.length ? `\nhardFailures: ${report.hardFailures.join(" / ")}` : ""}\n${lines}\n우선 수정: ${report.priorities.map((m) => m.key).join(", ") || "-"}`;
    return data({
      ...report,
      criteriaType: snapshot.criteriaType, criteriaVersionId: snapshot.criteriaVersionId,
      source: snapshot.source, stale: !!snapshot.stale,
    }, text);
  } catch (error) {
    return errText(`채점 실패: ${error.message}`);
  }
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
        const haystack = [banner.title, banner.originalTitle, banner.character, banner.path, banner.provenance, banner.reviewStatus, ...(Array.isArray(banner.tags) ? banner.tags : []), ...(Array.isArray(banner.codexBadges) ? banner.codexBadges : [])]
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

server.registerTool("nexus_banner_codex_upsert_automation_draft", {
  title: "Banner Codex 자동 제작 배너 등록",
  description: "예측 제작·스타일 연구 결과를 Banner Codex의 월요일 검토 대기 초안으로 멱등 등록합니다. 자동화 소유 문서만 같은 automationKey로 갱신하며 삭제나 승인 처리는 하지 않습니다.",
  inputSchema: {
    automationKey: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/).describe("주차·게임·후보가 포함된 안정적인 중복 방지 키"),
    provenance: z.enum(["proactive-forecast", "style-research", "hybrid"]),
    title: z.string().min(1).max(160),
    game: z.string().min(1).max(80),
    year: z.union([z.string(), z.number()]).optional(),
    date: z.string().optional(),
    character: z.string().optional(),
    score: z.number().min(0).max(10).optional(),
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    imageUrl: z.string().url().optional(),
    imagePath: z.string().optional().describe("NEXUS_BANNER_CODEX_UPLOAD_ROOTS 아래의 로컬 이미지. imageUrl이 없을 때 Cloudinary로 업로드"),
    path: z.string().optional(),
    notes: z.string().max(2000).optional(),
    sourceUrls: z.array(z.string().url()).max(12).default([]),
    styleRecipeId: z.string().max(120).optional(),
  },
  outputSchema: { banner: z.record(z.string(), z.any()), created: z.boolean() },
  annotations: WRITE_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const docPath = `artifacts/${encodeURIComponent(projectId)}/public/data/banners/${encodeURIComponent(a.automationKey)}`;
    let existing = null;
    try { existing = decodeFirestoreDocument(await firestoreRequest(docPath)); }
    catch (error) { if (!String(error?.message || error).includes("Firestore 404")) throw error; }
    if (existing && !existing.automationManaged) throw new Error("같은 ID의 수동 등록 배너는 자동화가 덮어쓸 수 없습니다.");
    const imageUrl = a.imageUrl || await uploadBannerCodexImage(a.imagePath);
    if (!imageUrl) throw new Error("imageUrl 또는 허용된 imagePath가 필요합니다.");
    const provenanceBadges = {
      "proactive-forecast": ["예측 제작"],
      "style-research": ["스타일 연구"],
      hybrid: ["예측 제작", "스타일 연구"],
    }[a.provenance];
    const codexBadges = [...provenanceBadges, "월요일 검토"];
    const now = new Date().toISOString();
    const banner = {
      title: a.title,
      originalTitle: a.title,
      game: a.game,
      year: a.year ?? new Date().getFullYear(),
      date: a.date || now.slice(0, 10).replaceAll("-", "."),
      month: String(a.date || now).slice(5, 7),
      character: a.character || "Unknown",
      score: a.score ?? null,
      tags: Array.from(new Set(a.tags.filter((tag) => !codexBadges.includes(tag)))),
      codexBadges,
      provenance: a.provenance,
      reviewStatus: "pending-monday-review",
      automationManaged: true,
      automationKey: a.automationKey,
      sourceUrls: a.sourceUrls,
      styleRecipeId: a.styleRecipeId || null,
      automationNotes: a.notes || null,
      imageUrl,
      thumbnailUrl: imageUrl,
      path: a.path || a.imagePath || "Nexus automation",
      uploadedBy: (await currentNexusAuth())?.uid || null,
      featured: false,
      liked: false,
      ocrProcessed: false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    const saved = decodeFirestoreDocument(await firestoreWriteDocument(docPath, banner));
    return data({ banner: saved, created: !existing }, JSON.stringify({ banner: saved, created: !existing }, null, 2));
  } catch (e) {
    return errText(`Banner Codex 자동 제작 배너 등록 실패: ${e.message}`);
  }
});

server.registerTool("nexus_asset_library_list", {
  title: "Nexus 재사용 에셋 검색",
  description: "2025년 이후 프로모션·브랜드웹에서 분리한 버튼·화살표·스크롤다운·프레임·구분선과 FX 포함 투명 PNG를 사람과 AI가 읽을 수 있는 메타데이터로 검색합니다.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30),
    pageToken: z.string().optional(),
    query: z.string().optional().describe("용도·형태·게임·캠페인·효과를 자연어로 검색"),
    category: z.enum(["button", "icon", "frame", "ornament", "bullet", "box", "lightfx", "etc"]).optional(),
    subtype: z.enum(["cta", "tab", "arrow", "scroll-down", "navigation", "badge", "frame", "divider", "bullet"]).optional(),
    game: z.string().optional(),
    year: z.number().int().min(2025).optional(),
    section: z.enum(["promotion", "brandweb"]).optional(),
    effects: z.enum(["any", "with_fx", "without_fx"]).default("any"),
  },
  outputSchema: {
    assets: z.array(z.record(z.string(), z.any())), returned: z.number(), scanned: z.number(), nextPageToken: z.string().nullable(),
  },
  annotations: READ_REMOTE,
}, async (a) => {
  try {
    const { projectId } = firebaseConfig();
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const matches=[]; let scanned=0; let token=a.pageToken; let rounds=0;
    do {
      const payload=await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/assets`, { pageSize:100, pageToken:token, showMissing:false });
      const decoded=(payload.documents || []).map(decodeFirestoreDocument); scanned+=decoded.length;
      for (const entry of decoded) {
        if (entry.trashed || entry.visibility === "private" || entry.isTemp === true) continue;
        if (a.category && entry.category !== a.category) continue;
        if (a.subtype && entry.subtype !== a.subtype) continue;
        if (a.game && String(entry.game || "").toLocaleLowerCase("ko-KR") !== a.game.toLocaleLowerCase("ko-KR")) continue;
        if (a.year && Number(entry.year) !== a.year) continue;
        if (a.section && entry.section !== a.section) continue;
        if (a.effects === "with_fx" && !entry.hasEffects) continue;
        if (a.effects === "without_fx" && entry.hasEffects) continue;
        if (needle) {
          const haystack=[entry.title,entry.aiSearchText,entry.subtype,entry.game,entry.campaign,entry.sectionKo,entry.source?.fileName,...promptArcArray(entry.tags),...promptArcArray(entry.source?.layerPath)].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
          if (!haystack.includes(needle)) continue;
        }
        matches.push(entry);
      }
      token=payload.nextPageToken || null; rounds++;
    } while (token && rounds < 30 && matches.length < a.pageSize);
    const assets=matches.slice(0,a.pageSize).map(assetLibrarySummary);
    const result={assets,returned:assets.length,scanned,nextPageToken:token};
    return data(result,JSON.stringify(result,null,2));
  } catch (e) { return errText(`에셋 라이브러리 검색 실패: ${e.message}`); }
});

server.registerTool("nexus_asset_library_get", {
  title: "Nexus 재사용 에셋 상세",
  description: "에셋의 투명 PNG, 원본 PSD 경로, 레이어 경로·좌표, 포함 효과와 출처 캠페인을 조회합니다.",
  inputSchema: { id:z.string().min(1) },
  outputSchema: { asset:z.record(z.string(),z.any()) }, annotations:READ_REMOTE,
}, async (a) => {
  try {
    const { projectId }=firebaseConfig();
    const raw=decodeFirestoreDocument(await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/assets/${encodeURIComponent(a.id)}`));
    if (raw.trashed || raw.visibility === "private" || raw.isTemp === true) throw new Error("공개 검색 가능한 에셋이 아닙니다.");
    const asset={...assetLibrarySummary(raw),effectLayers:promptArcArray(raw.effectLayers),psdEffects:promptArcArray(raw.psdEffects),bundleRole:raw.bundleRole||null,source:raw.source||null,aiSearchText:raw.aiSearchText||null};
    return data({asset},JSON.stringify(asset,null,2));
  } catch(e) { return errText(`에셋 상세 조회 실패 (${a.id}): ${e.message}`); }
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
