#!/usr/bin/env node
// NEXUS Studio MCP 서버 — 외부 AI(Claude Desktop/Code, 기타 MCP 클라이언트)가
// NEXUS Studio 의 프롬프트 엔진·렌더 파이프라인·픽셀 툴을 그대로 쓸 수 있게 노출한다.
//
// 단일 진실 소스: 프롬프트 빌더·옵션 카탈로그는 전부 src/ 의 실제 앱 모듈을 import 한다
// (esbuild 로 번들 — scripts: npm run mcp:build). 앱에서 프롬프트를 고치면 MCP 도 따라간다.
//
// 실행: node mcp/nexus-mcp.bundle.mjs   (stdio transport)
// 키: 환경변수 GEMINI_API_KEY 또는 리포 루트 .env 의 GEMINI_API_KEY (VITE_ 아님 — 서버 전용).

import fs from "node:fs";
import path from "node:path";
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

// ─── 경로/키 ─────────────────────────────────────────────────────────────────
// 번들은 <repo>/mcp/ 에 있으므로 루트는 한 단계 위.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "src", "skills");
const RUBRIC_PATH = path.join(ROOT, ".codex", "skills", "nexus-design-evaluator", "references", "rubric.md");
const OUT_DIR = path.join(ROOT, ".tmp", "mcp-out");

function geminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const m = env.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  } catch { /* .env 없음 */ }
  return null;
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

// ─── 툴 동작 힌트 (MCP annotations) ───────────────────────────────────────────
// 클라이언트가 read-only/파괴성/멱등성/외부호출 여부를 판단하는 데 쓴다.
const PURE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };        // 순수 함수 — 프롬프트/카탈로그/루브릭
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
5) nexus_design_rubric — 결과물 평가용 디자인 루브릭

■ 규약
- 아이템 꾸러미 렌더는 참조를 "아이템 1개 = 이미지 1장" 으로 첨부해야 중복이 안 생깁니다 (itemCount = 참조 수).
- 캐릭터 연출·품질 향상 렌더는 원본 1장을 참조로 첨부, matchInputAspect 없이 4K 권장.
- 광원 에셋은 순흑 배경 렌더 후 nexus_remove_background(black) 로 알파 추출하거나 스크린 블렌드로 합성.`));

server.registerTool("nexus_list_options", {
  title: "옵션 카탈로그",
  description: "모든 프롬프트 툴의 선택지(id·한글 라벨)를 JSON 으로 반환. 프롬프트 툴 호출 전 참조.",
  inputSchema: {},
  outputSchema: {
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

// ─── 기동 ─────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[nexus-mcp] NEXUS Studio MCP server ready (stdio)");
