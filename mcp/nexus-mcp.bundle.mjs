#!/usr/bin/env node
// 자동 생성 파일 — 수정 금지. 원본: mcp/server.mjs (npm run mcp:build 로 재생성)
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// mcp/server.mjs
import fs2 from "node:fs";
import path2 from "node:path";
import os from "node:os";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// src/lib/imagenRender.js
var SUPPORTED_RATIOS = [
  { id: "1:1", v: 1 },
  { id: "2:3", v: 2 / 3 },
  { id: "3:2", v: 3 / 2 },
  { id: "3:4", v: 3 / 4 },
  { id: "4:3", v: 4 / 3 },
  { id: "4:5", v: 4 / 5 },
  { id: "5:4", v: 5 / 4 },
  { id: "9:16", v: 9 / 16 },
  { id: "16:9", v: 16 / 9 },
  { id: "21:9", v: 21 / 9 }
];

// src/apps/RubiconForge/constants/lightfx.js
var LIGHTFX_CATEGORIES = [
  {
    id: "lightSource",
    label: "\uAD11\uC6D0 \xB7 \uAC13\uB808\uC774",
    desc: "\uC911\uC2EC \uBC1C\uAD11 \xB7 \uBC29\uC0AC \uAD11\uC120",
    accent: "#fde68a",
    ratio: "1:1",
    promptHint: "a radiant central light source emitting volumetric god rays and light beams outward from the core, soft glowing bloom around the origin",
    placeholder: "\uC608: \uC911\uC2EC\uC5D0\uC11C \uD37C\uC9C0\uB294 \uD669\uAE08\uBE5B \uAC13\uB808\uC774 / \uAC15\uD55C \uBC29\uC0AC\uD615 \uAD11\uC120 \uBC84\uC2A4\uD2B8"
  },
  {
    id: "halo",
    label: "\uD6C4\uAD11 \xB7 \uC624\uB77C",
    desc: "\uC6D0\uD615 \uD6C4\uAD11 \xB7 \uBC31\uB77C\uC774\uD2B8 \uAE00\uB85C\uC6B0",
    accent: "#a5b4fc",
    ratio: "1:1",
    promptHint: "a soft circular halo / aura backlight glow \u2014 a luminous ring and rim-light bloom as if a subject is backlit, hollow soft center fading outward",
    placeholder: "\uC608: \uCE90\uB9AD\uD130 \uB4A4 \uB465\uADFC \uD6C4\uAD11 / \uC2E0\uC131\uD55C \uC624\uB77C \uB9C1 / \uBC31\uB77C\uC774\uD2B8 \uAE00\uB85C\uC6B0"
  },
  {
    id: "particle",
    label: "\uD30C\uD2F0\uD074 \xB7 \uC785\uC790",
    desc: "\uBC18\uC9DD\uC784 \xB7 \uBD88\uD2F0 \xB7 \uBCF4\uCF00",
    accent: "#7dd3fc",
    ratio: "1:1",
    promptHint: "floating luminous particles \u2014 sparkles, glowing embers, dust motes and bokeh of light drifting and scattered across the frame, varied sizes with soft falloff",
    placeholder: "\uC608: \uB5A0\uC624\uB974\uB294 \uD669\uAE08 \uBD88\uD2F0 / \uBC18\uC9DD\uC774\uB294 \uB9C8\uBC95 \uC785\uC790 / \uBCF4\uCF00 \uC2A4\uD30C\uD074"
  },
  {
    id: "lightStreak",
    label: "\uBE5B\uD6A8\uACFC \xB7 \uD50C\uB808\uC5B4",
    desc: "\uB80C\uC988 \uD50C\uB808\uC5B4 \xB7 \uAD11\uC120 \uC2A4\uD2B8\uB9AD",
    accent: "#f0abfc",
    ratio: "16:9",
    promptHint: "dynamic light effects \u2014 lens flares, light streaks and energy wisps, shimmering light trails sweeping across the frame with glints and bloom",
    placeholder: "\uC608: \uAC00\uB85C\uC9C0\uB974\uB294 \uBE5B\uC904\uAE30 / \uB80C\uC988 \uD50C\uB808\uC5B4 / \uC5D0\uB108\uC9C0 \uC704\uC2B5 \uD2B8\uB808\uC77C"
  },
  {
    id: "ground",
    label: "\uBC14\uB2E5 \uC774\uD399\uD2B8 \xB7 \uADF8\uB77C\uC6B4\uB4DC",
    desc: "\uBC14\uB2E5\uC5D0 \uAE54\uB9AC\uB294 \uBC1C\uAD11 \uD480\xB7\uC2A4\uD50C\uB798\uC2DC",
    accent: "#a5b4fc",
    ratio: "16:9",
    promptHint: "a low ground-level luminous FLOOR effect \u2014 a radiant pool / splash of light hugging the ground plane, spreading low and horizontally, brightest at the center core and fading softly outward into darkness, as if glowing energy is cast across the floor beneath a subject; low-lying, wide and grounded (not floating). Magic splash, glowing pool, swirling ground vortex or drifting low mist depending on style/material/color",
    placeholder: "\uC608: \uBC14\uB2E5\uC5D0 \uD37C\uC9C0\uB294 \uBCF4\uB77C \uB9C8\uBC95\uAD11 \uC2A4\uD50C\uB798\uC2DC / \uB0AE\uAC8C \uAE54\uB9AC\uB294 \uAE08\uBE5B \uBE5B \uD68C\uC624\uB9AC / \uBC14\uB2E5 \uAE00\uB85C\uC6B0 \uD480"
  }
];
var LIGHTFX_CATEGORY_BY_ID = Object.fromEntries(LIGHTFX_CATEGORIES.map((c) => [c.id, c]));
var LIGHTFX_FORMS = [
  {
    id: "free",
    label: "\uC790\uC720 \xB7 \uBC30\uCE58 \uC5C6\uC74C",
    desc: "\uC704\uCE58 \uC9C0\uC815 \uC5C6\uC774 \uBE5B\uB9CC",
    accent: "#9ca3af",
    placementHint: ""
  },
  {
    id: "iconBack",
    label: "\uC544\uC774\uCF58 \uB4A4 \uAD11\uC6D0",
    desc: "\uD53C\uC0AC\uCCB4 \uB4A4\uCABD\uC5D0\uC11C \uBC29\uC0AC",
    accent: "#fde68a",
    placementHint: "position the glow BEHIND the subject as a backlight \u2014 a radiant burst emanating from behind and around the silhouette, as if light shines out from behind an icon; brightest just outside the silhouette edge and fading outward"
  },
  {
    id: "boxGlow",
    label: "\uBC15\uC2A4 \uC544\uC6C3\uADF8\uB85C\uC6B0",
    desc: "\uC0AC\uAC01 \uC678\uACFD\uC744 \uAC10\uC2F8\uB294 \uC678\uBD80\uAD11",
    accent: "#7dd3fc",
    edgeHug: true,
    placementHint: "render an OUTER GLOW that hugs and traces the rectangular box/panel/button silhouette edges and spills outward \u2014 a clean luminous rim following the outline, glow only ON and OUTSIDE the perimeter, no fill inside"
  },
  {
    id: "circleGlow",
    label: "\uC6D0\uD615 \uC544\uC6C3\uADF8\uB85C\uC6B0",
    desc: "\uC6D0 \uC678\uACFD\uC744 \uAC10\uC2F8\uB294 \uC678\uBD80\uAD11",
    accent: "#a5b4fc",
    edgeHug: true,
    placementHint: "render an OUTER GLOW that hugs and traces a CIRCULAR / RING outline and spills outward \u2014 a clean luminous rim following the circle perimeter, brightest right along the circular edge and softly bleeding outward, with a HOLLOW DARK CENTER (no fill inside the circle). The overall silhouette reads clearly as a glowing ring/circle"
  },
  {
    id: "charAura",
    label: "\uCE90\uB9AD\uD130 \uC678\uACFD \uC544\uC6B0\uB77C",
    desc: "\uC2E4\uB8E8\uC5E3\uC744 \uB530\uB77C \uB3C4\uB294 \uC544\uC6B0\uB77C",
    accent: "#c084fc",
    edgeHug: true,
    placementHint: "render an AURA tracing the character/figure silhouette outline \u2014 a luminous rim-light contour wrapping the body shape, brightest along the silhouette edge and softly bleeding outward, following the organic outline"
  },
  {
    id: "textGlow",
    label: "\uD14D\uC2A4\uD2B8 \uAE00\uB85C\uC6B0",
    desc: "\uAE00\uC790 \uD68D\uC744 \uB530\uB77C \uBC1C\uAD11",
    accent: "#f0abfc",
    edgeHug: true,
    placementHint: "render glow that follows the letterform strokes of the referenced text \u2014 luminous emission tracing each stroke and outline, brightest along the letter edges; do NOT draw solid letters, glow only"
  },
  {
    id: "titleFront",
    label: "\uD0C0\uC774\uD2C0 \uC804\uBC29 FX",
    desc: "\uD0C0\uC774\uD2C0 \uC55E \uAE00\uB9B0\uD2B8\xB7\uC785\uC790",
    accent: "#f0abfc",
    refMode: "front",
    placementHint: "render a restrained FOREGROUND accent pass in front of the title position \u2014 sparse glints, short light streaks and fine particles crossing only selected lower edges and corners, with the title itself left completely absent"
  },
  {
    id: "itemFront",
    label: "\uC544\uC774\uD15C \uC804\uBC29 FX",
    desc: "\uC544\uC774\uD15C \uC55E \uC811\uCD09\uAD11\xB7\uC785\uC790",
    accent: "#fde68a",
    refMode: "front",
    placementHint: "render a restrained FOREGROUND accent pass in front of the item position \u2014 selective contact glow near the lower front edge, a few rising sparks and short wisps wrapping across small portions of the foreground, with the item itself left completely absent"
  },
  {
    id: "groundPool",
    label: "\uBC14\uB2E5 \uAD11 \uD480",
    desc: "\uD53C\uC0AC\uCCB4 \uC544\uB798 \uACE0\uC774\uB294 \uBE5B",
    accent: "#a5b4fc",
    placementHint: "render a pool of light gathering BENEATH the subject \u2014 a bright elliptical ground glow and soft cast radiance as if the object emits light onto the floor below, brightest at the base and fading upward/outward"
  }
];
var LIGHTFX_FORM_BY_ID = Object.fromEntries(LIGHTFX_FORMS.map((f) => [f.id, f]));
var LIGHTFX_PAD_PROFILES = {
  hug: { id: "hug", label: "\uBC00\uCC29 25%", targetMargin: 0.25, aspectRatio: null, desc: "\uC2E4\uB8E8\uC5E3\uC744 \uB530\uB77C\uAC00\uB294 \uD615\uD0DC \u2014 \uD53C\uC0AC\uCCB4\uB97C \uD06C\uAC8C \uC720\uC9C0\uD574 \uC724\uACFD \uC815\uBC00\uB3C4 \uD655\uBCF4" },
  front: { id: "front", label: "\uC804\uBC29 35%", targetMargin: 0.35, aspectRatio: null, desc: "\uC804\uBC29 \uAE00\uB9B0\uD2B8\xB7\uC811\uCD09\uAD11 \u2014 \uD558\uB2E8\xB7\uBAA8\uC11C\uB9AC \uBC14\uAE65\uC73C\uB85C \uC9E7\uAC8C \uD37C\uC9C8 \uACF5\uAC04" },
  spread: { id: "spread", label: "\uD655\uC0B0 60%", targetMargin: 0.6, aspectRatio: null, desc: "\uB4A4\uCABD \uAD11\uC6D0\xB7\uD6C4\uAD11\xB7\uD30C\uD2F0\uD074 \u2014 \uC2E4\uB8E8\uC5E3 \uBC14\uAE65\uC73C\uB85C \uB113\uAC8C \uD37C\uC9C8 \uACF5\uAC04" },
  ground: { id: "ground", label: "\uBC14\uB2E5 60% \xB7 16:9", targetMargin: 0.6, aspectRatio: 16 / 9, desc: "\uBC14\uB2E5 \uC774\uD399\uD2B8 \u2014 \uC606\uC73C\uB85C \uB113\uAC8C \uAE54\uB9AC\uB3C4\uB85D \uAC00\uB85C \uCE94\uBC84\uC2A4 \uD655\uBCF4" }
};
var LIGHTFX_STYLES = [
  {
    id: "soft",
    label: "\uC18C\uD504\uD2B8 \uAE00\uB85C\uC6B0",
    desc: "\uBD80\uB4DC\uB7EC\uC6B4 \uD655\uC0B0",
    hint: "soft diffuse glow, gentle gaussian falloff, dreamy hazy bloom, smooth gradients"
  },
  {
    id: "sharp",
    label: "\uC120\uBA85\uD55C \uAD11\uC120",
    desc: "\uB610\uB837\uD55C \uBE54\xB7\uAE00\uB9B0\uD2B8",
    hint: "sharp crisp light rays and glints, high-contrast beams, defined volumetric shafts, clean edges"
  },
  {
    id: "magical",
    label: "\uB9C8\uBC95 \xB7 \uD310\uD0C0\uC9C0",
    desc: "\uC544\uCF00\uC778\xB7\uC2E0\uBE44",
    hint: "magical fantasy energy, arcane swirling glow, mystical shimmer with fine sparkle accents"
  },
  {
    id: "realistic",
    label: "\uC0AC\uC2E4\uC801",
    desc: "\uC2DC\uB124\uB9C8\uD2F1 \uB80C\uB354",
    hint: "photorealistic cinematic lighting, physically-based bloom and lens optics, filmic glow"
  }
];
var LIGHTFX_STYLE_BY_ID = Object.fromEntries(LIGHTFX_STYLES.map((s) => [s.id, s]));
var LIGHTFX_COLORS = [
  {
    id: "gold",
    label: "\uACE8\uB4DC",
    color: "#fde68a",
    swatch: "radial-gradient(circle,#fff7d6,#d4af37)",
    hint: "warm golden-amber light"
  },
  {
    id: "crimson",
    label: "\uD06C\uB9BC\uC2A8",
    color: "#f87171",
    swatch: "radial-gradient(circle,#ffd2d2,#c41e3a)",
    hint: "deep crimson-red energy light"
  },
  {
    id: "cyan",
    label: "\uC2DC\uC548",
    color: "#7dd3fc",
    swatch: "radial-gradient(circle,#d6f6ff,#2f7d8c)",
    hint: "electric cyan-blue glow"
  },
  {
    id: "violet",
    label: "\uBC14\uC774\uC62C\uB81B",
    color: "#c084fc",
    swatch: "radial-gradient(circle,#ecd6ff,#7c3aed)",
    hint: "arcane violet-purple light"
  },
  {
    id: "white",
    label: "\uD654\uC774\uD2B8",
    color: "#ffffff",
    swatch: "radial-gradient(circle,#ffffff,#9ca3af)",
    hint: "pure white radiant light"
  },
  {
    id: "holo",
    label: "\uD640\uB85C",
    color: "#f0abfc",
    swatch: "conic-gradient(from 0deg,#f0abfc,#7dd3fc,#fde68a,#f0abfc)",
    hint: "iridescent holographic prismatic light with shifting spectral hues"
  }
];
var LIGHTFX_COLOR_BY_ID = Object.fromEntries(LIGHTFX_COLORS.map((c) => [c.id, c]));
var LIGHTFX_MATERIALS = [
  { id: "none", label: "\uAE30\uBCF8", desc: "\uC7AC\uC9C8 \uC5C6\uC74C", hint: "" },
  { id: "water", label: "\uBB3C", desc: "\uC561\uCCB4 \xB7 \uAD74\uC808 \xB7 \uCF54\uC2A4\uD2F1", hint: "give the light a WATER material \u2014 liquid luminous surface with wet sheen, refraction and rippling caustic highlights, glossy fluid texture as if made of glowing water" },
  { id: "fire", label: "\uBD88", desc: "\uD654\uC5FC \uC9C8\uAC10 \xB7 \uBD88\uD2F0", hint: "give the light a FIRE material \u2014 flickering flame texture, glowing embers and sparks, hot-to-cool heat gradient (white-hot core to amber edges) with a burning surface feel" },
  { id: "electric", label: "\uC804\uAE30", desc: "\uD50C\uB77C\uC988\uB9C8 \xB7 \uC544\uD06C", hint: "give the light an ELECTRIC / PLASMA material \u2014 crackling energy surface with fine branching arcs, current filaments and sharp luminous sparks threading through the glow" },
  { id: "smoke", label: "\uC5F0\uAE30", desc: "\uBC1C\uAD11 \uC2A4\uBAA8\uD06C \uACB0", hint: "give the light a SMOKE material \u2014 soft curling luminous smoke texture with silky turbulent wisps and gentle billowing detail across the surface" },
  { id: "mist", label: "\uC548\uAC1C", desc: "\uD50C\uB77C\uC988\uB9C8 \uD5E4\uC774\uC988", hint: "give the light a MIST / HAZE material \u2014 soft volumetric haze texture, diffuse veils and gentle depth, a nebulous glowing vapor surface" },
  { id: "crystal", label: "\uD06C\uB9AC\uC2A4\uD0C8", desc: "\uACB0\uC815 \xB7 \uD504\uB9AC\uC998", hint: "give the light a CRYSTAL material \u2014 faceted prismatic surface with sharp refractive glints, sparkling shards and clean geometric light dispersion" }
];
var LIGHTFX_MATERIAL_BY_ID = Object.fromEntries(LIGHTFX_MATERIALS.map((m) => [m.id, m]));
var LIGHTFX_GRAINS = [
  { id: "normal", label: "\uAE30\uBCF8", hint: "" },
  { id: "fine", label: "\uC138\uBC00", hint: "PARTICLE SCALE \u2014 FINE: render every particle, sparkle, glint and speck at a fine SMALL scale \u2014 many tiny delicate micro-particles instead of large blobs; crisp refined micro-detail throughout" }
];
var LIGHTFX_GRAIN_BY_ID = Object.fromEntries(LIGHTFX_GRAINS.map((g) => [g.id, g]));
var LIGHTFX_BOKEHS = [
  { id: "normal", label: "\uAE30\uBCF8", hint: "" },
  { id: "fine", label: "\uC138\uBC00", hint: "BOKEH SCALE \u2014 FINE: keep all bokeh discs and out-of-focus light circles SMALL and subtle \u2014 fine delicate bokeh specks, never oversized orbs dominating the frame" }
];
var LIGHTFX_BOKEH_BY_ID = Object.fromEntries(LIGHTFX_BOKEHS.map((b) => [b.id, b]));

// src/apps/RubiconForge/constants/variations.js
var BG_COLORS = [
  { id: "black", label: "\uBE14\uB799", hex: "#000000", desc: "\uAE30\uBCF8 \xB7 \uBC1C\uAD11 \uD569\uC131", chroma: false },
  { id: "white", label: "\uD654\uC774\uD2B8", hex: "#ffffff", desc: "\uBC1D\uC740 \uB2E8\uC0C9", chroma: false },
  { id: "gray", label: "\uADF8\uB808\uC774", hex: "#808080", desc: "\uC911\uB9BD \uD68C\uC0C9", chroma: false },
  { id: "green", label: "\uADF8\uB9B0", hex: "#00b140", desc: "\uD06C\uB85C\uB9C8\uD0A4", chroma: true },
  { id: "magenta", label: "\uB9C8\uC820\uD0C0", hex: "#ff00ff", desc: "\uD06C\uB85C\uB9C8\uD0A4", chroma: true },
  { id: "blue", label: "\uBE14\uB8E8", hex: "#1f4fff", desc: "\uD06C\uB85C\uB9C8\uD0A4", chroma: true }
];
var BG_COLOR_BY_ID = Object.fromEntries(BG_COLORS.map((c) => [c.id, c]));
var DEFAULT_BG = BG_COLOR_BY_ID.black;
var VARIATION_MOODS = [
  { id: "flat", label: "\uD50C\uB7AB", desc: "\uAE54\uB054\uD55C \uBCA1\uD130\xB7\uBBF8\uB2C8\uBA40", accent: "#06b6d4" },
  { id: "casual", label: "\uCE90\uC8FC\uC5BC", desc: "\uC18C\uD504\uD2B8\xB7\uD31D\xB7\uCE5C\uADFC", accent: "#f9a8d4" },
  { id: "darkFantasy", label: "\uB2E4\uD06C \uD310\uD0C0\uC9C0", desc: "MMORPG\xB7\uB7ED\uC154\uB9AC\xB7\uC804\uC7C1", accent: "#d4af37" },
  { id: "modernTech", label: "\uBAA8\uB358 \uD14C\uD06C", desc: "\uAE00\uB798\uC2A4\xB7\uB274\uBAA8\uD53C\uC998\xB7\uB124\uC628", accent: "#a5b4fc" },
  { id: "luxury", label: "\uB7ED\uC154\uB9AC", desc: "\uD504\uB9AC\uBBF8\uC5C4\xB7\uC2DC\uADF8\uB2C8\uCC98", accent: "#fde68a" }
];
var VARIATION_STYLES = {
  flat: [
    {
      id: "modernIT",
      label: "\uBAA8\uB358 IT",
      color: "#06b6d4",
      promptHint: "modern flat brand color palette and material, electric blue with white and charcoal solids, clean flat vector shading, single soft drop shadow as the only depth cue"
    },
    {
      id: "vividPop",
      label: "\uBE44\uBE44\uB4DC \uD31D",
      color: "#f43f5e",
      promptHint: "vivid pop art flat color palette and material, saturated complementary hues, posterized flat shading, clean hard color edges"
    },
    {
      id: "pastelFlat",
      label: "\uD30C\uC2A4\uD154 \uD50C\uB7AB",
      color: "#fbcfe8",
      promptHint: "pastel flat color palette and material, soft mint pink and lavender, gentle low-contrast tones, flat vector shading"
    },
    {
      id: "monoMinimal",
      label: "\uBAA8\uB178 \uBBF8\uB2C8\uBA40",
      color: "#94a3b8",
      promptHint: "monochrome minimalist color palette and material, single hue with neutral grays, restrained flat finish"
    },
    {
      id: "neoBrutal",
      label: "\uB124\uC624 \uBE0C\uB8E8\uD0C8",
      color: "#fde047",
      promptHint: "neo-brutalist color palette and material, raw saturated primary colors with hard black outlines as material treatment, intentionally clunky surface"
    },
    {
      id: "corporate",
      label: "\uCF54\uD37C\uB808\uC774\uD2B8",
      color: "#3b82f6",
      promptHint: "corporate flat color palette and material, navy and grey with single accent blue, professional matte finish"
    }
  ],
  casual: [
    {
      id: "softClay3D",
      label: "\uC18C\uD504\uD2B8 \uD074\uB808\uC774 3D",
      color: "#f9a8d4",
      promptHint: "soft 3D clay color palette and material, matte sculpted clay surface, bright pastel hues, smooth diffuse lighting"
    },
    {
      id: "jellySoft",
      label: "\uC824\uB9AC \uC18C\uD504\uD2B8",
      color: "#a5f3fc",
      promptHint: "jelly translucent color palette and material, glossy gel surface with refractive sheen, candy color hues"
    },
    {
      id: "kidsPop",
      label: "\uD0A4\uC988 \uD31D",
      color: "#fde047",
      promptHint: "kids-friendly pop color palette and material, primary colors with hand-drawn warm tones, soft matte finish"
    },
    {
      id: "macaron",
      label: "\uB9C8\uCE74\uB871 \uD30C\uC2A4\uD154",
      color: "#fbcfe8",
      promptHint: "macaron pastel color palette and material, layered cream pink and mint, soft baked matte surface"
    },
    {
      id: "plushToy",
      label: "\uBD09\uC81C\uC778\uD615",
      color: "#fed7aa",
      promptHint: "plush toy color palette and material, soft felt and fluff surface texture, warm yarn material"
    },
    {
      id: "bubbleGum",
      label: "\uBC84\uBE14\uAC80 \uD31D",
      color: "#f0abfc",
      promptHint: "bubble gum pop color palette and material, sticky candy shine, bubblegum pink and aqua, glossy chewy surface"
    }
  ],
  darkFantasy: [
    {
      id: "darkRoyalGold",
      label: "\uB2E4\uD06C \uB85C\uC5F4 \uACE8\uB4DC",
      color: "#d4af37",
      promptHint: "dark fantasy royal color palette and material, deep slate or rich brown base with luxurious gold metallic surface, deep red as accent color, classical MMORPG premium finish"
    },
    {
      id: "crimsonSiege",
      label: "\uD06C\uB9BC\uC2A8 \uC2DC\uC988",
      color: "#c41e3a",
      promptHint: "crimson siege war color palette and material, dark blood red with dark forged iron metal, battle-worn surface texture, dark fantasy combat tone"
    },
    {
      id: "imperialBronze",
      label: "\uC784\uD398\uB9AC\uC5BC \uBE0C\uB860\uC988",
      color: "#cd7f32",
      promptHint: "imperial bronze color palette and material, aged warm sepia metallic surface, antique patina texture, historical grand strategy tone"
    },
    {
      id: "obsidianVoid",
      label: "\uC635\uC2DC\uB514\uC5B8 \uBCF4\uC774\uB4DC",
      color: "#a78bfa",
      promptHint: "obsidian void color palette and material, glossy black volcanic glass surface, deep purple as accent color, mysterious dark material tone"
    },
    {
      id: "boneRelic",
      label: "\uBCF8 \uB810\uB9AD",
      color: "#fef3c7",
      promptHint: "bone relic ancient color palette and material, weathered ivory and aged parchment surface, archaeological dig tone"
    },
    {
      id: "frostbite",
      label: "\uD504\uB85C\uC2A4\uD2B8\uBC14\uC774\uD2B8",
      color: "#7dd3fc",
      promptHint: "frostbite ice color palette and material, crystalline pale blue and frozen silver, frost-cracked metal surface, breath-cold winter tone"
    }
  ],
  modernTech: [
    {
      id: "glassMorph",
      label: "\uAE00\uB798\uC2A4\uBAA8\uD53C\uC998",
      color: "#a5b4fc",
      promptHint: "glassmorphism color palette and material, translucent frosted glass surface, subtle inner light, modern fintech tone"
    },
    {
      id: "neumorphism",
      label: "\uB274\uBAA8\uD53C\uC998",
      color: "#cbd5e1",
      promptHint: "neumorphism color palette and material, soft monochrome surface with inset/extruded shadow as material treatment, low contrast tactile depth"
    },
    {
      id: "gradientMesh",
      label: "\uADF8\uB77C\uB514\uC5B8\uD2B8 \uBA54\uC2DC",
      color: "#c084fc",
      promptHint: "gradient mesh color palette and material, smooth blended multi-hue radial gradients, glossy color transitions, fluid digital tone"
    },
    {
      id: "cyberNeon",
      label: "\uC0AC\uC774\uBC84 \uB124\uC628",
      color: "#06b6d4",
      promptHint: "cyberpunk neon color palette and material, cyan and magenta plasma hues as accent colors, glowing material surface, Tron-inspired tech tone"
    },
    {
      id: "holoFoil",
      label: "\uD640\uB85C\uADF8\uB798\uD53D \uD3EC\uC77C",
      color: "#f0abfc",
      promptHint: "holographic iridescent foil color palette and material, shifting prismatic pastel reflections, metallic sticker surface sheen"
    },
    {
      id: "matteCarbon",
      label: "\uB9E4\uD2B8 \uCE74\uBCF8",
      color: "#52525b",
      promptHint: "matte carbon fiber color palette and material, woven dark carbon surface texture, subtle red as accent color"
    }
  ],
  luxury: [
    {
      id: "champagneGold",
      label: "\uC0F4\uD398\uC778 \uACE8\uB4DC",
      color: "#fde68a",
      promptHint: "champagne gold luxury color palette and material, soft warm satin gold surface, bridal premium tone"
    },
    {
      id: "platinumSheen",
      label: "\uD50C\uB798\uD2F0\uB118 \uC2DC\uC5B8",
      color: "#e2e8f0",
      promptHint: "platinum sheen luxury color palette and material, brushed cool silver-white metal surface, restrained jewelry tone"
    },
    {
      id: "rosegoldVelvet",
      label: "\uB85C\uC988\uACE8\uB4DC \uBCA8\uBCB3",
      color: "#fbcfe8",
      promptHint: "rose gold velvet luxury color palette and material, warm pink-gold metallic accent color, romantic retail tone"
    },
    {
      id: "midnightBlue",
      label: "\uBBF8\uB4DC\uB098\uC787 \uBE14\uB8E8",
      color: "#3730a3",
      promptHint: "midnight blue luxury color palette and material, deep sapphire with platinum accent color, formal evening tone"
    },
    {
      id: "emeraldJewel",
      label: "\uC5D0\uBA54\uB784\uB4DC \uC8FC\uC5BC",
      color: "#10b981",
      promptHint: "emerald jewel luxury color palette and material, deep emerald green with gold metallic accent color, gemstone surface tone"
    },
    {
      id: "marbleVein",
      label: "\uB300\uB9AC\uC11D \uBCA0\uC778",
      color: "#f1f5f9",
      promptHint: "marble veined luxury color palette and material, white carrara marble surface with gold veining as natural material pattern, classical refined finish"
    }
  ]
};
var ALL_VARIATION_STYLES = Object.entries(VARIATION_STYLES).flatMap(
  ([moodId, list]) => list.map((s) => ({ ...s, moodId }))
);
var STYLE_BY_ID = Object.fromEntries(ALL_VARIATION_STYLES.map((s) => [s.id, s]));
var REFINEMENT_LEVELS = [
  {
    id: "source",
    label: "\uC6D0\uBCF8",
    desc: "\uC6D0\uBCF8 \uC7A5\uC2DD \uBC00\uB3C4 \uC720\uC9C0",
    accent: "#9CA3AF",
    promptBlock: ""
  },
  {
    id: "refined",
    label: "\uC815\uC81C",
    desc: "\uC57D 60% \uB85C \uB2E8\uC21C\uD654",
    accent: "#76cee0",
    promptBlock: `REFINEMENT DIRECTIVE (moderate simplification \u2014 applied on top of all preservation rules):
- Reduce decorative complexity to approximately 60% of the source \u2014 keep only the most prominent corner accents and simplify all other ornaments into cleaner geometric strokes
- Replace ornate filigree, swirls, intricate scrollwork, and busy decorative patterns with cleaner reductions or simple geometric primitives
- Reduce specular glints, surface noise, and secondary highlight density by approximately half
- Maintain silhouette, outline thickness, aspect ratio, and overall layout EXACTLY \u2014 only INTERNAL decoration density is reduced
- The result should feel like a cleaner, more confident reinterpretation of the source \u2014 same shape, less ornament`
  },
  {
    id: "minimal",
    label: "\uBBF8\uB2C8\uBA40",
    desc: "\uD575\uC2EC \uC561\uC13C\uD2B8\uB9CC \uB0A8\uAE40",
    accent: "#a78bfa",
    promptBlock: `REFINEMENT DIRECTIVE (aggressive simplification \u2014 applied on top of all preservation rules):
- Strip all non-essential decorations \u2014 keep only the single most prominent accent on each element
- Replace ornate filigree, scrollwork, embellishments, and surface ornaments with simple clean geometric lines or solid color blocks
- Reduce frames to a single clean outline with one accent color
- Remove all secondary glints, highlights, particles, sparkles, and surface noise \u2014 flat or near-flat material treatment only
- Maintain silhouette, outline thickness, aspect ratio, and overall layout EXACTLY \u2014 only INTERNAL decoration density is aggressively reduced
- The result should be ultra-minimal modern UI carrying only the new theme's color and base material \u2014 no flourishes`
  }
];
var REFINEMENT_BY_ID = Object.fromEntries(REFINEMENT_LEVELS.map((r) => [r.id, r]));
var ATMOSPHERE_TEMPERATURE = [
  {
    id: "coolStrong",
    label: "\uCF5C\uB4DC \uC2A4\uD2F8",
    desc: "\uAC15\uD55C \uC6D4\uAD11\xB7\uCF5C\uB4DC",
    accent: "#7dd3fc",
    promptBlock: `ATMOSPHERE \u2014 LIGHTING TEMPERATURE (strong cool shift \u2014 applied on top of all preservation rules):
- Push the white balance of all lit surfaces firmly toward a cold moonlit steel-blue \u2014 highlights read icy, midtones carry a pronounced lunar cast
- This is a white-balance / color-temperature adjustment of the EXISTING illumination only \u2014 do NOT add any new light source, glow, halo, lens flare, bloom, or rim light
- Metals read distinctly cold (gold cools toward platinum/pewter; blues turn to sharp steel-silver); shadows cool noticeably
- Material, surface finish, silhouette, outline thickness, decoration count and size remain EXACTLY as the source \u2014 only the temperature of existing light changes
- The pure black background is unaffected \u2014 no cold spill, no ambient haze`
  },
  {
    id: "cool",
    label: "\uCFE8",
    desc: "\uC605\uC740 \uD55C\uAE30",
    accent: "#a5b4fc",
    promptBlock: `ATMOSPHERE \u2014 LIGHTING TEMPERATURE (subtle cool shift \u2014 applied on top of all preservation rules):
- Shift the white balance of all lit surfaces gently toward cool moonlit silver-blue \u2014 highlights take a soft cold cast, midtones cool slightly
- This is a white-balance / color-temperature adjustment of the EXISTING illumination only \u2014 do NOT add any new light source, glow, halo, lens flare, bloom, or rim light
- Metals read cooler (gold turns toward pale champagne; blues sharpen toward steel); shadows stay neutral-to-cool
- Material, surface finish, silhouette, outline thickness, decoration count and size remain EXACTLY as the source \u2014 only the temperature of existing light changes
- The pure black background is unaffected \u2014 no cold spill, no ambient haze`
  },
  { id: "neutral", label: "\uC6D0\uBCF8", desc: "\uAD11\uC6D0 \uADF8\uB300\uB85C", accent: "#9CA3AF", promptBlock: "" },
  {
    id: "warm",
    label: "\uC6DC",
    desc: "\uC605\uC740 \uC628\uAE30",
    accent: "#fbbf24",
    promptBlock: `ATMOSPHERE \u2014 LIGHTING TEMPERATURE (subtle warm shift \u2014 applied on top of all preservation rules):
- Shift the white balance of all lit surfaces gently toward warm candlelit gold \u2014 highlights take a soft amber cast, midtones warm slightly
- This is a white-balance / color-temperature adjustment of the EXISTING illumination only \u2014 do NOT add any new light source, glow, halo, lens flare, bloom, or rim light
- Metals read warmer (gold deepens; cool blues drift toward warm teal); shadows stay neutral-to-warm
- Material, surface finish, silhouette, outline thickness, decoration count and size remain EXACTLY as the source \u2014 only the temperature of existing light changes
- The pure black background is unaffected \u2014 no warm spill, no ambient haze`
  },
  {
    id: "warmStrong",
    label: "\uCD1B\uBD88 \uACE8\uB4DC",
    desc: "\uAC15\uD55C \uCD1B\uBD88\xB7\uC570\uBC84",
    accent: "#f59e0b",
    promptBlock: `ATMOSPHERE \u2014 LIGHTING TEMPERATURE (strong warm shift \u2014 applied on top of all preservation rules):
- Push the white balance of all lit surfaces firmly toward a warm firelit amber-gold \u2014 highlights glow warm, midtones carry a pronounced golden-hour cast
- This is a white-balance / color-temperature adjustment of the EXISTING illumination only \u2014 do NOT add any new light source, flame, glow, halo, lens flare, bloom, or rim light
- Metals read distinctly hot (gold turns rich; cool blues drift toward warm teal/bronze); shadows warm noticeably
- Material, surface finish, silhouette, outline thickness, decoration count and size remain EXACTLY as the source \u2014 only the temperature of existing light changes
- The pure black background is unaffected \u2014 no warm spill, no ambient haze`
  }
];
var ATMOSPHERE_AGE = [
  {
    id: "restoredStrong",
    label: "\uAD11\uD0DD \uBCF5\uC6D0",
    desc: "\uAC13 \uC138\uACF5\xB7\uBC15\uBB3C\uAD00\uAE09",
    accent: "#fde68a",
    promptBlock: `ATMOSPHERE \u2014 SURFACE AGE (full restoration \u2014 applied on top of all preservation rules):
- Fully restore EXISTING surfaces to a pristine, freshly-crafted condition: remove all tarnish, grime, dust and wear, bring metals to a clean polished finish, make the whole material read brand-new and immaculate
- Adjust only material cleanliness and surface finish \u2014 do NOT add new highlights, glints, sparkles, bloom, or reflections as separate decorative elements, do NOT increase decoration count or size, and do NOT over-brighten into glow
- Silhouette, outline thickness, decoration count and layout remain EXACTLY as the source
- The pure black background is unaffected`
  },
  {
    id: "restored",
    label: "\uC0B4\uC9DD \uAD11\uD0DD",
    desc: "\uB54C \uC81C\uAC70\xB7\uC0DD\uAE30",
    accent: "#fef3c7",
    promptBlock: `ATMOSPHERE \u2014 SURFACE AGE (light restoration \u2014 applied on top of all preservation rules):
- Clean and freshen EXISTING surfaces: remove tarnish and grime from recesses, lift the material to a fresher finish, make metals read newly forged and any gems or accents read clearer
- Adjust only material cleanliness and surface finish \u2014 do NOT add new highlights, glints, sparkles, or reflections as separate decorative elements, and do NOT increase decoration count or size
- Silhouette, outline thickness, decoration count and layout remain EXACTLY as the source
- The pure black background is unaffected`
  },
  { id: "neutral", label: "\uC6D0\uBCF8", desc: "\uD45C\uBA74 \uADF8\uB300\uB85C", accent: "#9CA3AF", promptBlock: "" },
  {
    id: "worn",
    label: "\uAC00\uBCBC\uC6B4 \uB9C8\uBAA8",
    desc: "\uBAA8\uC11C\uB9AC \uB9C8\uBAA8\xB7\uBA3C\uC9C0",
    accent: "#a8a29e",
    promptBlock: `ATMOSPHERE \u2014 SURFACE AGE (light weathering \u2014 applied on top of all preservation rules):
- Add a light layer of age to EXISTING surfaces only: faint edge wear, subtle darkened patina settling into recesses, a thin film of dust in crevices, slightly dulled specular highlights
- Render wear PURELY as surface shading and material treatment \u2014 it must NOT introduce any new distinct scratch shape, crack, chip, or decorative element that changes a silhouette, outline, or the decoration count
- Do NOT erode, thin, or reshape any edge, frame, or ornament \u2014 the bounding box and count of every element stay identical
- Metals lose a little shine and gain tarnish in the darks; gold reads slightly antique
- The pure black background is unaffected`
  },
  {
    id: "wornStrong",
    label: "\uC804\uC7A5 \uD328\uD2F0\uB098",
    desc: "\uC0B0\uD654\xB7\uB179\xB7\uC804\uC7A5\uAC10",
    accent: "#78716c",
    promptBlock: `ATMOSPHERE \u2014 SURFACE AGE (heavy weathering \u2014 applied on top of all preservation rules):
- Apply a heavy, battle-worn age to EXISTING surfaces: pronounced tarnish, oxidation and verdigris in recesses, grime and dust build-up, heavily dulled highlights, a weathered patina across the whole material
- Render all wear PURELY as surface shading, discoloration, and material treatment \u2014 it must NOT introduce any new distinct scratch shape, crack, chip, dent, or decorative element that changes a silhouette, outline, or the decoration count
- Do NOT erode, thin, pit, or reshape any edge, frame, or ornament \u2014 the bounding box and count of every element stay identical
- Metals look old and oxidized; gold turns deep antique; bright surfaces go muted and matte
- The pure black background is unaffected`
  }
];
var ATMOSPHERE_TEMPERATURE_BY_ID = Object.fromEntries(ATMOSPHERE_TEMPERATURE.map((t) => [t.id, t]));
var ATMOSPHERE_AGE_BY_ID = Object.fromEntries(ATMOSPHERE_AGE.map((a) => [a.id, a]));
var DESIGN_VARIATIONS = [
  {
    id: "ornateUp",
    label: "\uC7A5\uC2DD \uAC15\uD654",
    color: "#d4af37",
    desc: "\uAC19\uC740 \uC790\uB9AC\uC5D0 \uB354 \uC815\uAD50\uD55C \uBAA8\uD2F0\uD504",
    promptBlock: 'Push toward a FINER, more intricate decorative MOTIF \u2014 denser delicate carving and filigree in the SAME areas at a THIN, fine line weight, like detailed etching or inlay. Do NOT enlarge the ornaments, thicken the frame or border, deepen the relief, or let decoration grow into the content area \u2014 "richer" here means MORE fine detail, never heavier, thicker, or bulkier.'
  },
  {
    id: "simplify",
    label: "\uBBF8\uB2C8\uBA40 \uC815\uB9AC",
    color: "#a5b4fc",
    desc: "\uC7A5\uC2DD\uC744 \uB35C\uACE0 \uB354 \uAE54\uB054\uD558\uAC8C",
    promptBlock: "Reinterpret it as a cleaner, more minimal version \u2014 reduce ornament busyness and simplify into confident clean forms, while keeping the same component type, the same frame thickness, and the same footprint."
  },
  {
    id: "silhouette",
    label: "\uC2E4\uB8E8\uC5E3 \uBCC0\uC8FC",
    color: "#f472b6",
    desc: "\uC678\uACFD \uB514\uD14C\uC77C\xB7\uCF54\uB108 \uCC98\uB9AC\uB9CC",
    promptBlock: "Explore a different contour and corner / edge treatment within a SIMILAR overall silhouette and the SAME aspect ratio \u2014 refine the shape language and edge profile, while keeping the outer footprint, border thickness, and ornament scale close to the source."
  },
  {
    id: "proportion",
    label: "\uB0B4\uBD80 \uADE0\uD615",
    color: "#34d399",
    desc: "\uBB34\uAC8C\uC911\uC2EC\xB7\uAC15\uC870 \uADE0\uD615 \uBCC0\uACBD",
    promptBlock: "Rebalance the internal weighting and emphasis \u2014 shift which area feels heavier and how internal detailing is distributed, WITHOUT changing the outer aspect ratio, the border thickness, or the ornament sizes."
  },
  {
    id: "recompose",
    label: "\uAD6C\uC131 \uC7AC\uBC30\uCE58",
    color: "#22d3ee",
    desc: "\uB0B4\uBD80 \uB514\uD14C\uC77C \uBC30\uCE58\uB97C \uC7AC\uAD6C\uC131",
    promptBlock: "Rearrange the INTERNAL composition \u2014 restyle and relocate internal accents and detailing into a fresh arrangement within the same footprint, keeping the same outer shape, border thickness, and aspect ratio."
  },
  {
    id: "material",
    label: "\uC7AC\uC9C8 \uB300\uBE44",
    color: "#fb923c",
    desc: "\uC7AC\uC9C8\xB7\uB9C8\uAC10\uC744 \uACFC\uAC10\uD788 \uBCC0\uACBD",
    promptBlock: "Reimagine the material and surface finish boldly \u2014 try a distinctly different material treatment and finish, while keeping the same component type and silhouette family."
  },
  {
    id: "accentMove",
    label: "\uAC15\uC870 \uBCC0\uACBD",
    color: "#c084fc",
    desc: "\uD3EC\uCEEC \uAC15\uC870 \uC694\uC18C\uB97C \uB2E4\uB974\uAC8C",
    promptBlock: "Restyle and reposition the focal accent \u2014 change what draws the eye and how it is emphasized, while keeping the same component type."
  },
  {
    id: "genreShift",
    label: "\uC7A5\uB974 \uD1A4 \uC804\uD658",
    color: "#fbbf24",
    desc: "\uC2A4\uD0C0\uC77C \uC7A5\uB974\xB7\uC2DC\uB300 \uD1A4 \uC804\uD658",
    promptBlock: "Shift the stylistic genre/era tone (e.g. more modern, more classical, more rugged), while keeping the same component type and function."
  }
];
var DESIGN_VARIATION_BY_ID = Object.fromEntries(DESIGN_VARIATIONS.map((d) => [d.id, d]));
var defaultDesignVariationIds = DESIGN_VARIATIONS.slice(0, 4).map((d) => d.id);
var VARIATION_STRENGTH = [
  {
    id: "subtle",
    label: "\uBBF8\uC138",
    desc: "\uC6D0\uBCF8\uC5D0 \uB9E4\uC6B0 \uAC00\uAE5D\uAC8C",
    accent: "#76cee0",
    promptBlock: "VARIATION STRENGTH: subtle \u2014 this is a NEAR-MINIMAL edit. Stay extremely close to the reference: change mainly the surface material/finish and only the smallest interior motif detail, reading as the SAME asset lightly refreshed rather than a redesign. Keep ALL borders, frames, outlines, lines, and the space immediately around them essentially identical to the source \u2014 do NOT add or thicken any edge ornament. Structural envelope and every edge unchanged."
  },
  {
    id: "moderate",
    label: "\uC911\uAC04",
    desc: "\uB69C\uB837\uD558\uB098 \uB3D9\uC77C \uACE8\uACA9",
    accent: "#a78bfa",
    promptBlock: "VARIATION STRENGTH: moderate \u2014 a clearly distinct redesign of the motif, detail, and material, yet obviously the same component on the same structural envelope (same thickness, ornament scale, aspect ratio)."
  },
  {
    id: "bold",
    label: "\uACFC\uAC10",
    desc: "\uBAA8\uD2F0\uD504\xB7\uC7AC\uC9C8\uB9CC \uB300\uB2F4\uD788",
    accent: "#f472b6",
    promptBlock: "VARIATION STRENGTH: bold \u2014 boldly reinterpret the decorative motif, shape detail, material, and internal arrangement, while still respecting the structural envelope (same-or-slimmer border thickness, same ornament scale, same aspect ratio and footprint). Boldness lives in the motif and material \u2014 NEVER in thicker strokes, deeper relief, or heavier mass."
  }
];
var VARIATION_STRENGTH_BY_ID = Object.fromEntries(VARIATION_STRENGTH.map((s) => [s.id, s]));

// src/apps/RubiconForge/services/lightfx.js
var resolveBg = (bg) => bg || DEFAULT_BG;
var lightFxBackgroundBlock = (bg) => {
  const b = resolveBg(bg);
  if (b.id === "black") {
    return `MANDATORY OUTPUT RULES \u2014 non-negotiable (this is a COMPOSITABLE LIGHT ASSET, not a scene):
- The background MUST be PURE jet-black RGB(0,0,0), perfectly solid and uniform edge-to-edge. The ONLY non-black pixels are the glowing light itself.
- Render ONLY the luminous light effect \u2014 NO object, NO character, NO UI element, NO button, NO frame, NO icon, NO product, NO text, NO logo, NO scenery, NO floor or wall or horizon.
- The light must read as additive emission on black so it can be screen-blended / alpha-keyed over other artwork. Bright luminous core, smooth falloff into true black. Do NOT add a colored or gray backdrop, vignette card, or gradient panel.
- High dynamic range: hot bright core, rich mid glow, clean fade to #000000.`;
  }
  const chromaLine = b.chroma ? ` This is a chroma-key backdrop chosen for clean background removal \u2014 keep the ${b.label} perfectly flat and uniform so the light can be cut out.` : "";
  return `MANDATORY OUTPUT RULES \u2014 non-negotiable (this is a COMPOSITABLE LIGHT ASSET, not a scene):
- The background MUST be a PERFECTLY FLAT, SOLID, UNIFORM ${b.label} fill at exactly ${b.hex}, edge-to-edge. The light effect sits on top of this flat backdrop.${chromaLine}
- Render ONLY the luminous light effect on the flat ${b.label} \u2014 NO object, NO character, NO UI element, NO button, NO frame, NO icon, NO product, NO text, NO logo, NO scenery, NO floor or wall or horizon.
- Do NOT add any gradient, vignette, second backdrop card, or texture to the background \u2014 just the single flat ${b.label} color with the glowing light over it.
- Bright luminous core with smooth glow falloff; the surrounding empty area stays the flat uniform ${b.label} (${b.hex}).`;
};
var REF_SHAPE_BLOCK = `SHAPING REFERENCE (a reference image is attached): use it ONLY to shape and place the light \u2014 let the glow, halo, rays, or particles wrap, backlight, or emanate around the silhouette/position of the referenced subject. Do NOT draw, trace, recolor, or reproduce the referenced object itself \u2014 the OUTPUT contains light ONLY, on pure black. The reference is a placement guide that must not appear in the result.
CRITICAL \u2014 NO REPRODUCED OBJECTS: absolutely do NOT redraw, copy, or reconstruct any object from the reference \u2014 no orb, gem, crystal, emblem, medallion, jewel, badge, character, face, cloth, armor or any recognizable item. Bright or detailed areas inside the reference (a glowing orb, crystal, emblem, etc.) must NOT be reproduced as an object; instead replace each such focal point with a pure abstract GLOW \u2014 a soft luminous bloom at that position with no internal structure, facets, shapes or details. The final image is emitted light only on black, containing zero solid objects.`;
var REF_DETAIL_BLOCK = `EDGE-HUGGING DETAIL (refined & restrained): concentrate the light TIGHTLY along the OUTER CONTOUR and key silhouette edges of the reference \u2014 a crisp thin rim/edge light that traces the outline, with a few small tasteful sparkle glints and short delicate filament rays only at corners and tips. Keep the interior and the surrounding area almost entirely dark/empty \u2014 the effect must NOT flood, fill, or wash over the whole frame. Prioritize a clean sharp edge trace over volume. Aim for premium, understated elegance: sparse, precise, high-craft accents \u2014 NOT a dense energetic explosion. Most of the canvas stays true black; the light is a fine luminous outline plus a handful of restrained highlights.`;
var REF_BEHIND_BLOCK = `BEHIND / BACKDROP MODE \u2014 DO NOT TRACE THE SHAPE: the reference only shows WHERE the subject sits. Render the light as a free-form glow sitting BEHIND and around that position, as if backlighting the subject from behind. \u2605Do NOT trace, outline, rim-light, or reproduce the reference's silhouette, edges, or contour lines.\u2605 There must be NO line art, NO edge outline of the subject, NO shape-following stroke \u2014 just a soft volumetric glow / rays / particles behind the subject's location, spreading naturally. The subject's outline must NEVER appear as a bright line in the result.`;
var REF_FRONT_BLOCK = `FOREGROUND ACCENT MODE \u2014 LIGHT ONLY: use the reference only to locate the subject. Render a sparse, separable light pass that appears IN FRONT of selected lower edges, corners, or contact points. Keep the center readable and most of the canvas pure black. Do NOT trace the full silhouette, cover the subject area, reproduce any letter/object detail, or create an opaque smoke wall. Use only restrained glints, short wisps, fine particles, or localized contact glow.`;
var placementBlock = (formHint, hasRef, edgeHug) => {
  if (!formHint) return "";
  if (!hasRef) return `PLACEMENT / FORM: ${formHint}.`;
  return `PLACEMENT / FORM: ${formHint}. ${edgeHug ? "Anchor this placement to the ATTACHED reference silhouette \u2014 the light wraps/backlights that exact shape, but the reference object itself never appears (light only)." : "Use the ATTACHED reference ONLY to know where the subject is positioned \u2014 place the glow behind/around that position WITHOUT tracing or outlining its shape."}`;
};
var INTENSITY_HINT = { subtle: "low intensity, restrained bloom, soft narrow falloff", medium: "balanced medium intensity with a clear luminous core", strong: "strong high-energy emission with a hot core, while preserving clean edges and breathing room" };
var INTENSITY_HINT_REF = {
  subtle: "very low intensity \u2014 a whisper-thin edge glow with only 1-2 tiny glints; the canvas stays almost fully black",
  medium: "restrained intensity \u2014 a crisp fine edge trace with a few small tasteful highlights; do not fill the interior or background",
  strong: "confident but controlled \u2014 a bright clean edge light and slightly bolder tip rays, yet still sparse and edge-bound, never flooding the frame"
};
var SHAPE_HINT = {
  none: "",
  square: "arrange the entire light effect to form and follow a clean centered SQUARE outline \u2014 the luminous energy traces the four edges of a square, hollow darker center",
  circle: "arrange the entire light effect to form and follow a clean centered CIRCLE / RING outline \u2014 the luminous energy traces the circular perimeter, brightest along the ring edge with a hollow darker center (do NOT fill the disc)",
  rectangle: "arrange the entire light effect to form and follow a wide centered horizontal RECTANGLE outline \u2014 the luminous energy traces the rectangle edges, hollow darker center"
};
function buildLightFxPrompt({ categoryHint, styleHint, colorHint, userText, hasRef, formHint, intensity = "medium", shape = "none", index = 0, bg, materialHint = "", grainHint = "", bokehHint = "", edgeHug = false, refMode = "behind" }) {
  const b = resolveBg(bg);
  const subject = userText && userText.trim() ? userText.trim() : categoryHint;
  const bgName = b.id === "black" ? "pure black #000000" : `a flat uniform ${b.label} (${b.hex})`;
  const hugging = !!(hasRef && edgeHug);
  const place = placementBlock(formHint, hasRef, edgeHug);
  return `Create a single isolated LIGHT / GLOW EFFECT asset on ${bgName} background.

EFFECT: ${categoryHint}.
${userText && userText.trim() ? `SPECIFIC REQUEST: ${userText.trim()}.` : ""}
LIGHT QUALITY / STYLE: ${styleHint}.
LIGHT COLOR: ${colorHint}. Keep the palette coherent around this color (subtle complementary accents are fine). This chosen color OVERRIDES any color present in the reference image \u2014 ignore the reference's own colors and render the glow in this selected color.
INTENSITY: ${(hugging ? INTENSITY_HINT_REF : INTENSITY_HINT)[intensity] || (hugging ? INTENSITY_HINT_REF : INTENSITY_HINT).medium}.
${materialHint ? `MATERIAL / SURFACE: ${materialHint}. Apply this as the light's material and internal surface texture WITHIN its existing shape and placement \u2014 do NOT reshape the overall silhouette or turn it into that object; it stays the same light effect, just with this material feel. Still light-only emission, never a solid object or scene.
` : ""}${grainHint ? `${grainHint}.
` : ""}${bokehHint ? `${bokehHint}.
` : ""}${SHAPE_HINT[shape] ? `OVERALL SHAPE (important): ${SHAPE_HINT[shape]}. The overall silhouette of the whole effect MUST clearly read as this shape. The guide outline itself must not be drawn \u2014 render light only.
` : ""}
${place ? `${place}
` : ""}${hasRef ? `
${REF_SHAPE_BLOCK}
${hugging ? REF_DETAIL_BLOCK : refMode === "front" ? REF_FRONT_BLOCK : REF_BEHIND_BLOCK}
` : ""}
${lightFxBackgroundBlock(bg)}

COMPOSITION: center the effect with breathing room; balanced, production-ready, clean. This is variation #${index + 1} \u2014 vary the arrangement of the accents versus other variations${hugging ? " (without adding more light or filling more of the frame \u2014 keep every variation sparse and edge-bound)" : ", make its motion/arrangement visibly distinct"} while keeping the same effect type, style, and color.

FINAL: output ONE light effect (${subject}) glowing on ${bgName} \u2014 light only, no object, no text, no scene. Any orb/gem/crystal/emblem from the reference becomes a pure abstract glow, never a rendered object.`;
}
function buildCompactLightFxPrompt({ categoryHint, styleHint, colorHint, userText, formHint, intensity = "medium", shape = "none", bg, hasRef = false, materialHint = "", grainHint = "", bokehHint = "", edgeHug = false, refMode = "behind" }) {
  const hugging = !!(hasRef && edgeHug);
  const b = resolveBg(bg);
  const bgName = b.id === "black" ? "pure black #000000" : `a flat uniform ${b.label} (${b.hex})`;
  const tail = b.id === "black" ? "Bright luminous core with smooth falloff to true black; do NOT add any backdrop card, gray panel, vignette, or UI \u2014 only the glow on pure black." : `Bright luminous core with smooth glow falloff; the empty area stays a single flat ${b.label} (${b.hex}) \u2014 do NOT add any second backdrop card, vignette, gradient, or UI.`;
  return `Generate a single isolated LIGHT / GLOW EFFECT on ${bgName} background \u2014 light only, NO object, NO text, NO scene (a compositable light asset for background removal / keying).
Effect: ${userText && userText.trim() ? userText.trim() : categoryHint}.
Style: ${styleHint}. Color: ${colorHint}. Intensity: ${(hugging ? INTENSITY_HINT_REF : INTENSITY_HINT)[intensity] || (hugging ? INTENSITY_HINT_REF : INTENSITY_HINT).medium}.${materialHint ? `
Material: ${materialHint} \u2014 surface texture within the same shape (still light-only, no object).` : ""}${grainHint ? `
${grainHint}.` : ""}${bokehHint ? `
${bokehHint}.` : ""}${SHAPE_HINT[shape] ? `
Overall shape (important): ${SHAPE_HINT[shape]}; the whole effect must read as this shape, but do not draw the guide outline itself.` : ""}${formHint ? `
Placement: ${formHint}.` : ""}${hasRef ? (hugging ? `
EDGE-HUGGING & RESTRAINED: hug the outer contour of the reference with a crisp thin rim light plus a few small tasteful glints at corners/tips; keep the interior and background almost fully dark \u2014 do NOT flood or fill the frame. Premium, sparse, understated.` : refMode === "front" ? `
FOREGROUND ACCENT \u2014 LIGHT ONLY: place sparse glints, short wisps, fine particles, or localized contact glow in front of selected lower edges/corners. Keep the center clear and most of the canvas black. Do NOT reproduce, cover, or fully outline the reference subject.` : `
BEHIND / BACKDROP \u2014 DO NOT TRACE THE SHAPE: use the reference only to know where the subject sits; render a free-form glow behind/around that position. Do NOT trace, outline, or rim-light the silhouette \u2014 no edge line of the subject, no shape-following stroke.`) + `
NO REPRODUCED OBJECTS: never redraw any orb, gem, crystal, emblem or item from the reference \u2014 replace each bright focal point with a pure abstract glow (no internal shapes), rendered in the chosen color which overrides the reference's own colors.` : ""}
${tail}`;
}

// src/apps/RubiconForge/services/variations.js
var OVERLAY_FRAMING = `Apply a COLOR + MATERIAL OVERLAY PASS to the source. This is a recolor / retexture operation IN PLACE \u2014 NOT a regeneration, NOT a re-imagining of the composition. The source is the master template; you are only changing pigment, surface, and material \u2014 never structure, count, or size.`;
var COUNT_MATCH_BLOCK = `DECORATION COUNT + DENSITY MATCH (HIGHEST PRIORITY):
- Mentally count every distinct decorative element in the source: corner ornaments, edge filigree, accent shapes, highlight glints, particles, runes, halos, sparkles, dividers, gemstones, badges, ribbons, scrollwork
- The output must contain the EXACT same count \u2014 not one element more
- Total visual density of ornaments + highlights + accents + glows must match the source EXACTLY
- DO NOT add any decoration that is not already present in the source. Banned additions include but are not limited to: new corner pieces, new edge accents, new particle effects, new energy glows, new runes, new halos, new sparkles, new gemstones, new filigree, new ribbons, new badges, new glints
- If the source is restrained, the output is restrained. If the source is busy, match its busyness exactly \u2014 do not exceed it`;
var SIZE_LOCK_BLOCK = `DECORATION SIZE LOCK (HIGHEST PRIORITY \u2014 overrides every mood descriptor below):
- Every decorative element MUST occupy the EXACT same bounding box and percentage area as in the source
- Apply the MINIMUM possible modification to decoration shape \u2014 only material and color may change, NEVER size or count
- DO NOT enlarge, inflate, expand, or scale up any decoration
- DO NOT thicken or expand corner pieces, frames, or filigree even if a mood descriptor implies "ornate", "luxurious", "elaborate", "intricate", or "grand"
- Mood adjectives only affect material richness and surface detail \u2014 NEVER decoration size, count, or position`;
var resolveBg2 = (bg) => bg || DEFAULT_BG;
var BACKGROUND_BLOCK = (bg) => {
  const b = resolveBg2(bg);
  if (b.id === "black") {
    return `MANDATORY BACKGROUND RULE \u2014 non-negotiable:
- The output background MUST be PURE jet-black RGB(0,0,0), perfectly solid, uniform, edge-to-edge
- Absolutely NO gradient, NO haze, NO ambient backlight, NO rim light spilling into the background
- NO atmospheric mist, NO soft halo, NO near-black gray \u2014 only true #000000
- The asset must be cleanly isolated for downstream alpha keying and transparent PNG extraction`;
  }
  const chromaLine = b.chroma ? `
- This is a CHROMA-KEY backdrop: keep it a single saturated flat ${b.label} so the subject (which must NOT contain this exact color) can be cleanly keyed out.` : "";
  return `MANDATORY BACKGROUND RULE \u2014 non-negotiable:
- The output background MUST be a PERFECTLY FLAT, SOLID, UNIFORM ${b.label} fill at exactly ${b.hex}, edge-to-edge
- Absolutely NO gradient, NO vignette, NO texture, NO haze, NO ambient glow, NO drop shadow, NO rim light spilling into the background${chromaLine}
- The asset must sit cleanly on this uniform ${b.label} (${b.hex}) background for downstream background removal / keying`;
};
var ONLY_VARY_BLOCK = `ONLY VARY THE FOLLOWING \u2014 applied as a recolor / retexture pass on existing pixels:
- Dominant color palette and hue
- Material treatment, surface finish, and texture
- Decorative motif material and color (NOT size, NOT count, NOT position)
- Lighting tone and atmosphere on existing surfaces`;
var FINAL_REMINDER = `FINAL REMINDER: Layout, silhouette, aspect ratio, outline thickness, and decoration count must remain IDENTICAL to the source. Only color, material, and surface finish change. Match the source's rendering quality and detail level \u2014 do not exceed it.`;
var TEXT_REMOVAL_BLOCK = `TEXT REMOVAL \u2014 LEAVE THE TEXT AREA EMPTY (critical):
- The source has embedded text / a label inside its central area. In the OUTPUT, REMOVE that text completely.
- Do NOT redraw, re-render, translate, keep, or replace the text with new glyphs, placeholder words, symbols, numbers, or icons.
- Leave the central text zone as a CLEAN, EMPTY, smooth surface in the new material \u2014 the same reserved area, just blank, ready for a designer to add their own text later.
- Keep the panel / button surface, frame, and decorations fully intact around that empty zone \u2014 ONLY the text glyphs disappear, revealing the underlying surface beneath them.
- The empty area must read as intentional, clean negative space \u2014 NOT as a blurred, smeared, scratched, or damaged patch.`;
var FRAME_THICKNESS_LOCK = `FRAME / BORDER THICKNESS LOCK (HIGHEST PRIORITY \u2014 the frame must NOT grow):
- Trace the source's outer frame / border / rim and reproduce the SAME stroke WIDTH and the SAME proportion of the asset \u2014 do NOT thicken, fatten, inflate, bulk up, or deepen the relief of the frame.
- Switching to a richer material (ornate gold, heavy iron, etc.) must NOT add thickness, height, or bevel depth \u2014 it is the SAME thin frame in a new material, never a chunkier one.
- If the source frame is slim, the output frame stays slim. The inner content area must NOT shrink because the frame grew.
- WHEN IN DOUBT, ERR THINNER: render the frame and edge slightly thinner rather than thicker. A too-slim frame is acceptable; a thick, swollen, oversized frame is a failure.`;
var EDGE_LINE_RESTRAINT = `EDGE & LINE ORNAMENT SUPPRESSION (HIGHEST PRIORITY \u2014 keep every edge as plain as the source):
- This is a recolor only: do NOT add ANY new decoration along, beside, or near borders, frames, rims, outlines, dividers, separators, or lines. Specifically banned near any edge/line: a new inner border, a second / companion / parallel line, double-lining, piping, beading, dotted studs, rivets, bolts, notches, grooves, knurling, engraving, filigree, scrollwork, corner flourishes, edge glints, or glow / highlight strips.
- Every border, outline, and divider stays ONE single stroke at the SAME thickness as the source \u2014 never split into two, never given an inner or outer twin line, never embossed, beveled, or deepened.
- Keep the band of space immediately around each line and edge as clean and bare as in the source. If the source edge is a plain line, the output edge stays a plain line \u2014 only its color and material change.
- UNDER-decorate, never over-decorate: when unsure whether an edge or line detail existed in the source, OMIT it. The edges and lines must read as the SAME minimal edges, just re-materialized.`;
var BACKGROUND_RESKIN_EMPHASIS = (bg) => {
  const b = resolveBg2(bg);
  const target = b.id === "black" ? "pure black #000000" : `a uniform ${b.label} ${b.hex}`;
  return `BACKGROUND \u2014 EXTRA EMPHASIS (frequent failure on recolor): whatever backdrop the SOURCE asset sits on (white, light, gray, cream, colored, or scene), the OUTPUT background MUST be replaced with ${target}. NEVER place the asset on a card, sheet, panel, podium, table, or product-shot backdrop. Only the asset itself survives \u2014 everything behind and around it is a flat solid ${b.label} (${b.hex}).`;
};
var RESKIN_FINAL_CHECK = (bg) => {
  const b = resolveBg2(bg);
  const bgCheck = b.id === "black" ? "pure black #000000 \u2014 never white, light, or a card/backdrop" : `a flat uniform ${b.label} ${b.hex} \u2014 never a card, podium, or product-shot backdrop`;
  return `RE-SKIN FINAL CHECK (verify all four before output): (1) the background is ${bgCheck}; (2) the frame / border / outline is NO thicker than the source \u2014 slimmer is fine, never thicker; (3) if the source had embedded text, the central text area is now EMPTY \u2014 the original text is removed and NOT replaced, leaving clean blank surface; (4) NO new ornament, inner/companion line, beading, or glint was added near any border, edge, or line \u2014 every edge is as plain as the source, only recolored.`;
};
var STRIP_AMBIENT_LIGHT_BLOCK = `AMBIENT LIGHT REMOVAL \u2014 OBJECT ONLY (HIGHEST PRIORITY \u2014 this OVERRIDES the decoration-count match for light effects ONLY):
- The source object may be surrounded by AMBIENT / ENVIRONMENTAL light effects: god rays, light beams, a glowing halo or aura, backlight bloom, radial sunburst, floating sparkles or particles, energy glow spilling into the area around the object, lens flares, drifting embers.
- REMOVE all of these surrounding light effects completely. The output keeps ONLY the object itself, cleanly isolated on pure black #000000, as if the ambient lighting was switched off.
- This is the ONE exception to "match the source's glow/particle/halo count exactly": those AMBIENT effects that live AROUND or BEHIND the object must be deleted, not matched.
- KEEP the object's OWN integral surface shading, material highlights, and self-contained reflections that sit ON the object's surfaces \u2014 do NOT flatten or dull the object itself. Only the light that radiates OUTWARD into the surrounding space / background is removed.
- Do NOT shrink, recolor, restyle, or alter the object to compensate \u2014 the object stays exactly as specified by the other rules; only the detached ambient glow around it disappears, revealing pure black where that glow used to be.`;
var COMPACT_STRIP_HINT = `Also REMOVE any ambient light AROUND the object \u2014 god rays, halo/aura, backlight bloom, radial glow, floating sparkles/particles, lens flares spilling into the background. Keep ONLY the object itself on pure black (keep the object's own surface highlights; delete only the glow radiating around it).`;
var OUTLINE_ONLY_BLOCK = `EDGE-DESIGNED OUTLINE \u2014 FLAT SOLID INTERIOR (HIGHEST PRIORITY \u2014 this OVERRIDES and REVERSES any earlier rule about keeping edges plain or putting detail in the interior):
- Put ALL of the design, material, color, ornament, bevel, and highlight on the OUTER EDGE / RIM / OUTLINE of the asset ONLY \u2014 the slim border band that traces the silhouette contour. The outer line is the ONLY designed element.
- FILL the entire INTERIOR enclosed by that edge with a SINGLE FLAT SOLID color \u2014 a plain, uniform, dark near-black tone by default, kept distinctly readable against the background. The interior is completely flat: NO ornament, NO embedded text, NO inner frame or divider, NO texture, NO gradient, NO pattern, NO illustration, NO highlight or shading inside \u2014 one flat solid color only.
- Keep the source's outer contour shape, proportions, and aspect ratio EXACTLY. The rim stays a SLIM outline tracing that contour \u2014 apply material / finish / a subtle highlight to it, but do NOT thicken it into a wide frame and do NOT let any detail bleed inward across the flat interior.
- Target look: a solid-color plate / medallion with ONLY its outer edge lightly styled \u2014 a clean designed rim around a flat solid-color center.`;
var COMPACT_OUTLINE_HINT = `Keep the asset's outer outline/contour exactly (same shape, proportions, aspect ratio) and apply ALL design / material / color / highlight to the OUTER EDGE (rim) ONLY. FILL the entire interior with a SINGLE flat solid color \u2014 a plain dark near-black tone by default \u2014 completely flat: NO interior ornament, text, divider, texture, gradient, or detail. The rim is a slim styled outline; do NOT thicken it or let detail spill inward. Result: a solid-color plate with only the outer edge designed.`;
var getRefinementBlock = (refinementLevel) => {
  const lvl = REFINEMENT_BY_ID[refinementLevel || "source"];
  return lvl?.promptBlock ? `

${lvl.promptBlock}` : "";
};
var getAtmosphereBlock = (temperature, age) => {
  const temp = ATMOSPHERE_TEMPERATURE_BY_ID[temperature || "neutral"];
  const aged = ATMOSPHERE_AGE_BY_ID[age || "neutral"];
  const blocks = [temp?.promptBlock, aged?.promptBlock].filter(Boolean);
  return blocks.length ? `

${blocks.join("\n\n")}` : "";
};
var getBgContextBlock = (hasBackgroundRef, isAtlas) => {
  if (!hasBackgroundRef) return "";
  const subject = isAtlas ? "rethemed atlas" : "variation";
  return `

COMPOSITING CONTEXT (second reference image \u2014 destination background):
A second reference represents the destination background where this ${subject} will be placed. Use it ONLY to harmonize the palette and material \u2014 tune the color and surface so the result reads cleanly on that background's hues and mood. DO NOT copy any element from the background reference, and DO NOT add any decoration based on the background. Keep the output isolated on PURE BLACK as mandated.`;
};
var buildVariationPrompt = ({ themeHint, hasBackgroundRef, refinementLevel, temperature, age, stripAmbientLight, outlineOnly, bg }) => {
  const refLabel = hasBackgroundRef ? "TWO reference images are provided. The FIRST is the source asset to retheme. The SECOND is the destination background environment." : "Reference image is provided as the first input \u2014 it is the source asset to retheme.";
  const stripBlock = stripAmbientLight ? `

${STRIP_AMBIENT_LIGHT_BLOCK}` : "";
  const outlineBlock = outlineOnly ? `

${OUTLINE_ONLY_BLOCK}` : "";
  return `${refLabel}

${OVERLAY_FRAMING}

ABSOLUTE PRESERVATION RULES (must remain IDENTICAL to the source):
- The overall silhouette and outer shape outline
- The aspect ratio and canvas composition \u2014 do not crop, do not extend, do not change framing
- The thickness of the outer frame / outline / border stroke
- The component type (button / card / panel / badge) and overall layout
- The center text-safe zone's size and position \u2014 but it must be left EMPTY (see TEXT REMOVAL below)

${COUNT_MATCH_BLOCK}

${SIZE_LOCK_BLOCK}

${FRAME_THICKNESS_LOCK}

${EDGE_LINE_RESTRAINT}

${TEXT_REMOVAL_BLOCK}

${BACKGROUND_BLOCK(bg)}

${BACKGROUND_RESKIN_EMPHASIS(bg)}${stripBlock}

${ONLY_VARY_BLOCK}

PROMOTION-CONCEPT ADAPTATION (highest creative priority, subordinate only to preservation and restraint):
${themeHint}${getBgContextBlock(hasBackgroundRef, false)}${getRefinementBlock(refinementLevel)}${getAtmosphereBlock(temperature, age)}

CONCEPT TRANSLATION RULES:
- Express the promotion concept through palette hierarchy, controlled contrast, surface language, and at most one restrained focal accent. Do not literalize the concept by adding objects, symbols, scenery, or extra ornament.
- Keep the frame, border, corners, and dividers slim, simple, and nearly uniform. Never make them thicker than the source; when uncertain, make them slightly thinner.
- Decorative coverage must not exceed the source and should remain below roughly 15% of the asset. Use no more than ONE decorative layer. A plain source stays plain.
- Keep the central usable area calm and open. Do not let decoration intrude into the text-safe or content-safe area.
- Forbidden: dense filigree, webs, lattice, repeated spikes, bulky corner caps, double borders, stacked trims, large crests, extra gems, floating particles, and ornamental clutter.
- Produce ONE production-ready UI asset only, not a set, contact sheet, comparison, or four-item collection.

${FINAL_REMINDER}

${RESKIN_FINAL_CHECK(bg)}${outlineBlock}`;
};
var COMPACT_TEMP_HINT = {
  coolStrong: "Cool moonlit steel-blue lighting (white-balance shift only, no new light source).",
  cool: "Slightly cool lighting.",
  warm: "Slightly warm candlelit lighting.",
  warmStrong: "Warm firelit amber-gold lighting (white-balance shift only, no new light source)."
};
var COMPACT_AGE_HINT = {
  restoredStrong: "Pristine, freshly-crafted surfaces \u2014 remove all wear and tarnish.",
  restored: "Slightly cleaner, fresher surfaces.",
  worn: "Lightly aged and worn surfaces (shading/material only \u2014 no new scratches or cracks).",
  wornStrong: "Heavily weathered, battle-worn patina and oxidation (shading/material only \u2014 no new scratches or cracks)."
};
var COMPACT_REFINE_HINT = {
  refined: "Simplify decorative density to about 60% \u2014 keep the silhouette and outline exactly.",
  minimal: "Strip to only the single most prominent accent per element \u2014 keep the silhouette and outline exactly."
};
var compactExtras = (refinementLevel, temperature, age) => [
  COMPACT_TEMP_HINT[temperature],
  COMPACT_AGE_HINT[age],
  COMPACT_REFINE_HINT[refinementLevel]
].filter(Boolean).map((s) => `- ${s}`).join("\n");
var buildCompactVariationPrompt = ({ themeHint, refinementLevel, temperature, age, stripAmbientLight, outlineOnly, bg }) => {
  const extras = compactExtras(refinementLevel, temperature, age);
  const b = resolveBg2(bg);
  const bgRule = b.id === "black" ? "pure black #000000" : `a flat uniform ${b.label} ${b.hex}`;
  if (outlineOnly) {
    return `${COMPACT_OUTLINE_HINT}
Background MUST be ${bgRule}. Keep the asset's shapes, outlines, layout, and proportions exactly as the source \u2014 trace only, do not redesign. Remove any embedded text/label (leave that area empty).`;
  }
  return `Create ONE production-ready adaptation of the attached UI asset (button, bullet, framed box, frame, or arrow) for the supplied promotion concept. Keep the exact same component type, shapes, outlines, layout, proportions, and number of elements. Express the concept through palette hierarchy, controlled contrast, surface language, and at most one restrained focal accent \u2014 never by adding objects or ornament.
Remove any embedded text/label and leave that central area as a clean EMPTY space in the new material (do NOT redraw, keep, or replace the text). Keep the frame/border the SAME thickness as the source \u2014 do NOT thicken it (when unsure, err thinner).
Keep every edge plain: do NOT add any new ornament, inner/companion line, double-lining, beading, studs, engraving, or glint near borders, lines, or dividers \u2014 each line stays one stroke as in the source, only recolored. When unsure near an edge, leave it plain.
Promotion concept and adaptation direction: ${themeHint}
${extras ? `${extras}
` : ""}${stripAmbientLight ? `${COMPACT_STRIP_HINT}
` : ""}Restraint rules: background MUST be ${bgRule}; keep borders slim and nearly uniform; decoration below roughly 15% coverage and no more than one decorative layer; keep the central usable area calm and open. No dense filigree, web, lattice, repeated spikes, bulky corners, stacked trims, large crest, extra gems, floating particles, or ornamental clutter. Do not enlarge, resize, or rearrange decoration. Output ONE isolated asset only, never a set or comparison sheet.`;
};
var EDGE_LINE_RESTRAINT_REDESIGN = `EDGE & LINE RESTRAINT (HIGHEST PRIORITY \u2014 keep borders and lines a minimal edit):
- Confine the redesign to the broad INTERIOR field and the central motif. Do NOT pile new detail onto the structural lines themselves: borders, frames, rims, outlines, dividers, and separators stay as SIMPLE and CLEAN as the source.
- Banned near any edge or line: a new inner border, a second / companion / parallel line, double-lining, piping, beading, dotted studs, rivets, bolts, notches, grooves, knurling, extra engraving, corner flourishes, edge glints, or glow / highlight strips. One line stays ONE line at the source thickness.
- Keep the band of space immediately next to every edge and line as quiet and uncluttered as the source. If the source edge is a plain line, the output edge stays a plain line.
- Treat all structural lines as a near-minimal edit: expressive change lives in the interior motif and material, NEVER in busier, heavier, or more-decorated edges. When unsure near an edge, leave it plain \u2014 UNDER-decorate.`;
var DESIGN_TEXT_RULE = `TEXT REMOVAL \u2014 LEAVE THE TEXT AREA EMPTY: If the reference contains embedded text or a label (e.g. a button caption), REMOVE it in the output. Do NOT redraw, re-render, translate, keep, or replace it with new glyphs, placeholder words, symbols, numbers, or icons. Leave the central text-safe area as a clean, EMPTY surface in the redesigned material \u2014 the same reserved zone, just blank, ready for a designer to add their own text later. Keep the asset's surface, frame, and decorations intact around that empty zone; the empty area must read as intentional negative space, not a smeared or damaged patch. (Assets that have no text \u2014 frames, ornaments, badges \u2014 are unaffected by this rule.)`;
var buildDesignAlternativePrompt = ({ directionBlock, strengthBlock, hasBackgroundRef, stripAmbientLight, outlineOnly, bg }) => {
  const refLabel = hasBackgroundRef ? "TWO reference images are provided. The FIRST is the source detail asset to redesign. The SECOND is the destination background environment." : "Reference image is provided as the first input \u2014 it is the source detail asset to redesign.";
  const stripBlock = stripAmbientLight ? `

${STRIP_AMBIENT_LIGHT_BLOCK}
` : "";
  const outlineBlock = outlineOnly ? `

${OUTLINE_ONLY_BLOCK}
` : "";
  const b = resolveBg2(bg);
  const bgName = b.id === "black" ? "pure solid black #000000 / RGB(0,0,0)" : `a flat uniform ${b.label} ${b.hex}`;
  const bgHeading = b.id === "black" ? "PURE BLACK" : `SOLID ${b.label.toUpperCase()} (${b.hex})`;
  const bgChromaNote = b.chroma ? " (a chroma-key backdrop for clean removal \u2014 the asset itself must NOT contain this exact color)" : "";
  const designBgBlock = `BACKGROUND \u2014 ${bgHeading}, HIGHEST PRIORITY (frequent failure \u2014 do NOT get this wrong):
- The background MUST be ${bgName}, uniform edge-to-edge${bgChromaNote} \u2014 mandatory regardless of the design direction, material, or genre.
- NEVER place the asset on a card, paper, sheet, panel, podium, table, or product-shot backdrop \u2014 even if the new design reads "clean", "modern", "minimal", "flat", or "studio". The backdrop is ONE flat solid color only.
- Whatever backdrop the source asset sits on, REPLACE it with ${bgName} and keep ONLY the asset.`;
  return `${refLabel}

Generate a DESIGN ALTERNATIVE of the reference detail asset \u2014 a fresh REDESIGN of the SAME game-UI component, keeping the SAME structural proportions but changing the design language. Think of it as the same frame/button/badge redrawn by a different artist who kept the same blueprint: the motif, ornament style, material, and detailing change \u2014 the size, thickness, and footprint do NOT.

IDENTITY ANCHORS (must stay true to the reference):
- The component type / function / role \u2014 a button stays a button, a frame stays a frame, a badge stays a badge, an ornament stays an ornament; do NOT turn it into a different kind of asset
- A SINGLE, centered, isolated asset \u2014 same subject, not a scene, not a collection

${designBgBlock}

BORDER & LINE-WEIGHT LOCK (HIGHEST PRIORITY \u2014 overrides EVERY variation direction and strength below):
- Visually trace the source's outer frame / border and reproduce the SAME stroke WIDTH and THICKNESS \u2014 do NOT thicken, bulk up, fatten, or inflate the frame or border. If the source border is slim and delicate, the result MUST stay slim and delicate.
- Ornament, filigree, and engraving LINE WEIGHT and relief / bevel / emboss depth stay at the source level \u2014 you may change the MOTIF and pattern, but the strokes must stay as THIN and FINE as the source; do NOT make ornaments chunkier, bolder, heavier, thicker, or more raised
- The overall visual HEAVINESS / weight of the piece matches the source \u2014 match how much "ink" and metal mass the source uses; a light, airy source yields a light, airy result
- This lock is absolute: when a direction says "richer" or "more ornate", it means a more intricate FINE pattern in the same thin line weight \u2014 NEVER thicker or heavier strokes
- WHEN IN DOUBT, ERR THINNER: if the source stroke width is hard to judge, render the border and all ornament strokes SLIGHTLY THINNER and finer rather than thicker. A too-slim result is acceptable; a thickened, chunky frame is a failure.

${EDGE_LINE_RESTRAINT_REDESIGN}

FINENESS & PRECISION (global quality bias \u2014 apply throughout, second only to the locks above):
- Aim for a highly refined, precise, jeweler-grade result: crisp clean edges, delicate fine linework, tightly controlled detail. Favor finesse and elegance over heft.
- Render detail as FINE and intricate at a small scale \u2014 like fine engraving, etched metal, or inlay \u2014 NEVER as thick, blocky, molded, rounded, tube-like, or chunky relief.
- Keep frames, borders, and ornament strokes SLIM and sharp; resist any drift toward swollen, padded, bulky, or rope-like forms.

STRUCTURAL ENVELOPE \u2014 KEEP CLOSE TO THE SOURCE (high priority, do NOT exaggerate):
- Decoration and ornament SIZE / SCALE stays close to the source \u2014 you may change the ornament's motif and style, but each ornament must occupy roughly the SAME footprint and area; do NOT enlarge corner pieces, do NOT let ornaments grow inward over the content area
- Overall ASPECT RATIO and outer bounding proportions stay close to the source \u2014 do NOT restretch or reorient the canvas (landscape stays landscape, portrait stays portrait), do NOT change the asset's footprint
- The central content / text-safe area keeps roughly the same size and position
- The structural envelope and the border/line-weight lock are preserved at EVERY variation strength \u2014 strength only controls how boldly the MOTIF, shape DETAIL, MATERIAL, and ARRANGEMENT are reinterpreted, never the stroke thickness, ornament size, or aspect ratio

YOU MAY VARY (within the lock + envelope):
- The INTERIOR decorative MOTIF and pattern \u2014 the look of the carving / filigree / inlay in the FIELD away from the edges, NOT its line weight or size, and NOT added onto the border lines themselves
- Fine shape detail within a similar silhouette, the SAME border thickness, and the SAME aspect ratio \u2014 but keep edges and lines as plain as the source (see EDGE & LINE RESTRAINT)
- Color, material, and surface finish
- Internal arrangement and focal-accent styling in the interior field

EFFECTS \u2014 KEEP RESTRAINED (do NOT overdo borders or finishing effects):
- Match the source's level of glow, bloom, drop shadow, rim light, sparkle, and particle effects \u2014 do NOT add new or stronger effects than the source has. A clean source stays clean.
- No heavy outer glow, no large drop shadow, no halo, no lens flare, no floating particles or sparkles around the asset \u2014 subtle, contained finishing only.${stripBlock}

VARIATION DIRECTION (the primary axis to explore for THIS alternative):
${directionBlock || "Explore a tasteful, distinct redesign of the motif, detail, and material."}

${strengthBlock || "VARIATION STRENGTH: subtle \u2014 stay close to the reference; gentle redesign only."}

${DESIGN_TEXT_RULE}

ISOLATION (critical \u2014 overrides any direction that hints at a scene):
- ONE single asset, centered on the flat ${b.label} (${b.hex}) backdrop \u2014 absolutely NO environment, NO background scenery, NO floor / wall / pillars / landscape / props, NO scene, NO duplicate copies. If a direction mentions composition or proportion, it refers ONLY to the asset's own internal layout, never to building a scene around it.

${BACKGROUND_BLOCK(bg)}${getBgContextBlock(hasBackgroundRef, false)}${outlineBlock}

FINAL: Output ONE single redesigned detail asset on ${bgName} background (one flat solid color, no scene), centered and isolated \u2014 same component type, a border / frame stroke NO THICKER than the reference (slimmer is fine), the same thin fine ornament line weight, same ornament scale, same aspect ratio as the reference, EVERY edge / border / line kept as plain as the source with NO added inner line, beading, or edge ornament (expressive change only in the interior field), restrained finishing effects (no added glow / shadow / particles), the central text area left EMPTY (any source text removed, not replaced), but a distinct, finely-detailed and precise interior motif and material.`;
};
var buildCompactDesignAlternativePrompt = ({ directionHint, strengthHint, stripAmbientLight, outlineOnly, bg }) => {
  const b = resolveBg2(bg);
  const bgRule = b.id === "black" ? "pure black #000000" : `a flat uniform ${b.label} ${b.hex}`;
  if (outlineOnly) {
    return `${COMPACT_OUTLINE_HINT}
Background MUST be ${bgRule}. Keep the same outer shape, footprint, and aspect ratio as the source; the design direction applies to the RIM styling only, never to the flat interior. Remove any embedded text/label (leave the interior a flat solid color). Output one single asset only.
${directionHint ? `Rim direction: ${directionHint}
` : ""}`;
  }
  return `Redesign the attached game-UI detail asset into a DESIGN ALTERNATIVE \u2014 same component type and purpose (a button stays a button, a frame stays a frame), as a single centered asset isolated on ${bgRule}. Change the design language (motif, pattern, material, internal arrangement), but KEEP the structure close to the source: trace and reproduce the SAME border/frame stroke thickness, the SAME thin ornament line weight (do NOT make ornaments thicker, bolder, or more raised), the same ornament size/scale (don't enlarge), and the same aspect ratio and footprint. "Richer" means a finer, more intricate pattern at the same thin line weight, never heavier strokes. If unsure of the source stroke width, err THINNER. Aim for a refined, precise, finely-detailed result \u2014 never thick, chunky, or bulky. Keep every edge/border/line a minimal edit: do NOT add any new inner/companion line, double-lining, beading, studs, grooves, edge engraving, corner flourish, or glint near borders, lines, or dividers \u2014 vary the INTERIOR motif/material only, not the structural lines (under-decorate near edges when unsure). The background MUST be ${bgRule} even if the new design reads clean/minimal \u2014 one flat solid color, never a card or product-shot backdrop. Keep effects restrained: match the source's glow/shadow/particles, do NOT add new or stronger ones. NO background scene, NO environment.
${directionHint ? `Direction: ${directionHint}
` : ""}${strengthHint ? `Strength: ${strengthHint}
` : ""}${stripAmbientLight ? `${COMPACT_STRIP_HINT}
` : ""}If the source has embedded text/label, REMOVE it and leave that central area empty \u2014 do NOT redraw or replace it (assets without text are unaffected). Output one single redesigned asset only.`;
};

// src/apps/NexusPreview/services/bundlePrompt.js
var BUNDLE_LIGHT_OPTIONS = [
  { key: "none", ko: "\uC5C6\uC74C", en: "\uCD94\uAC00 \uBE5B\uD6A8\uACFC \uC5C6\uC74C \u2014 \uAC01 \uC544\uC774\uD15C\uC774 \uAC00\uC9C4 \uC6D0\uBCF8 \uB77C\uC774\uD305\uB9CC \uC720\uC9C0\uD558\uACE0 \uC0C8 \uBC1C\uAD11\uC744 \uB9CC\uB4E4\uC9C0 \uB9C8\uC138\uC694." },
  { key: "soft", ko: "\uC740\uC740\uD55C \uBE5B", en: "\uC544\uC774\uD15C \uAC00\uC7A5\uC790\uB9AC\uC5D0 \uC740\uC740\uD55C \uB9BC\uB77C\uC774\uD2B8\uC640 \uBD80\uB4DC\uB7EC\uC6B4 \uD558\uC774\uB77C\uC774\uD2B8\uB9CC \uC0B4\uC9DD \uB354\uD574 \uACE0\uAE09\uC2A4\uB7FD\uAC8C \uC815\uB9AC\uD558\uC138\uC694. \uACFC\uD55C \uBC1C\uAD11\xB7\uBE5B\uC904\uAE30\uB294 \uAE08\uC9C0." },
  { key: "glow", ko: "\uD654\uB824\uD55C \uBC1C\uAD11", en: "\uAFB8\uB7EC\uBBF8 \uB4A4\uC5D0\uC11C \uD37C\uC9C0\uB294 \uD654\uB824\uD55C \uBC1C\uAD11(radiant glow)\uACFC \uAC00\uB294 \uBE5B\uC904\uAE30, \uBC18\uC9DD\uC774\uB294 \uC2A4\uD30C\uD074 \uD30C\uD2F0\uD074\uC744 \uB354\uD574 \uBCF4\uC0C1 \uC5F0\uCD9C\uC744 \uADF9\uB300\uD654\uD558\uC138\uC694. \uB2E8, \uC544\uC774\uD15C \uC2E4\uB8E8\uC5E3\uC744 \uAC00\uB9AC\uC9C0 \uC54A\uAC8C." }
];
var BUNDLE_GROUND_OPTIONS = [
  { key: "none", ko: "\uC5C6\uC74C", en: "\uBC14\uB2E5 \uC774\uD399\uD2B8 \uC5C6\uC74C \u2014 \uC544\uC774\uD15C \uC544\uB798\uB97C \uC644\uC804\uD788 \uBE44\uC6CC\uB450\uC138\uC694." },
  { key: "shadow", ko: "\uADF8\uB9BC\uC790", en: "\uC544\uC774\uD15C \uC544\uB798\uC5D0 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC18C\uD504\uD2B8 \uCEE8\uD0DD\uD2B8 \uC100\uB3C4\uC6B0\uB9CC \uB123\uC73C\uC138\uC694. \uC0C9\uAD11\xB7\uC774\uD399\uD2B8\uB294 \uAE08\uC9C0." },
  { key: "magic", ko: "\uB9C8\uBC95\uAD11", colorable: true, en: "\uC544\uC774\uD15C \uC544\uB798\uC5D0 {color} \uB9C8\uBC95\uAD11 \uC2A4\uD50C\uB798\uC2DC\uAC00 \uB0AE\uAC8C \uD37C\uC9C0\uB294 \uD310\uD0C0\uC9C0 \uBC14\uB2E5 \uC774\uD399\uD2B8\uB97C \uB123\uC73C\uC138\uC694 \u2014 \uC911\uC559\uC774 \uBC1D\uACE0 \uAC00\uC7A5\uC790\uB9AC\uB85C \uBD80\uB4DC\uB7FD\uAC8C \uC0AC\uB77C\uC9C0\uB294 \uD615\uD0DC. \uC704\uB85C \uD280\uB294 \uC791\uC740 \uC785\uC790 \uC57D\uAC04 \uD5C8\uC6A9." },
  { key: "smoke", ko: "\uC5F0\uAE30", colorable: true, en: "\uC544\uC774\uD15C \uC544\uB798\uC5D0 {color} \uBE5B\uC744 \uBA38\uAE08\uC740, \uB0AE\uAC8C \uAE54\uB9AC\uB294 \uC2E0\uBE44\uB85C\uC6B4 \uC5F0\uAE30/\uC548\uAC1C\uB97C \uB123\uC73C\uC138\uC694. \uC544\uC774\uD15C \uD558\uB2E8\uB9CC \uC0B4\uC9DD \uAC10\uC2F8\uACE0 \uC704\uB85C\uB294 \uC62C\uB77C\uC624\uC9C0 \uC54A\uAC8C." },
  { key: "vortex", ko: "\uBE5B \uD68C\uC624\uB9AC", colorable: true, en: "\uC544\uC774\uD15C \uC544\uB798\uC5D0 {color} \uBE5B\uC785\uC790 \uD68C\uC624\uB9AC(swirling light vortex)\uAC00 \uB0AE\uAC8C \uAC10\uC544 \uB3C4\uB294 \uBC14\uB2E5 \uC774\uD399\uD2B8\uB97C \uB123\uC73C\uC138\uC694 \u2014 \uAC00\uB294 \uBE5B\uC904\uAE30\uC640 \uBC18\uC9DD\uC774 \uC785\uC790\uAC00 \uB098\uC120\uD615\uC73C\uB85C \uD750\uB974\uACE0, \uC911\uC559\uC774 \uAC00\uC7A5 \uBC1D\uC73C\uBA70 \uBC14\uAE65\uC73C\uB85C \uBD80\uB4DC\uB7FD\uAC8C \uC0AC\uB77C\uC9C0\uB294 \uD615\uD0DC. \uD68C\uC624\uB9AC\uB294 \uBC14\uB2E5\uC5D0 \uB0AE\uAC8C \uAE54\uB9AC\uACE0 \uC544\uC774\uD15C\uC744 \uAC00\uB9AC\uC9C0 \uC54A\uAC8C." },
  { key: "glow", ko: "\uAE00\uB85C\uC6B0 \uD480", colorable: true, en: "\uC544\uC774\uD15C \uC544\uB798\uC5D0 {color} \uBC1C\uAD11 \uD480(glowing light pool)\uC744 \uB123\uC73C\uC138\uC694 \u2014 \uBC14\uB2E5\uC5D0 \uACE0\uC774\uB294 \uBD80\uB4DC\uB7EC\uC6B4 \uD0C0\uC6D0\uD615 \uBE5B\uBB34\uB9AC\uB85C, \uC911\uC559\uC774 \uBC1D\uACE0 \uAC00\uC7A5\uC790\uB9AC\uB85C \uB9E4\uB044\uB7FD\uAC8C \uC0AC\uB77C\uC9C0\uBA70 \uC544\uC774\uD15C\uC744 \uC544\uB798\uC5D0\uC11C \uC740\uC740\uD788 \uBE44\uCD94\uB294 \uD615\uD0DC." }
];
var BUNDLE_MAGIC_COLORS = [
  { key: "purple", ko: "\uBCF4\uB77C", hex: "#a855f7", en: "\uC120\uBA85\uD55C \uBCF4\uB77C-\uB9C8\uC820\uD0C0" },
  { key: "cyan", ko: "\uCCAD\uB85D", hex: "#22d3ee", en: "\uCC28\uAC00\uC6B4 \uCCAD\uB85D-\uBE14\uB8E8" },
  { key: "gold", ko: "\uAE08\uBE5B", hex: "#f5c451", en: "\uB530\uB73B\uD55C \uACE8\uB4DC-\uC570\uBC84" },
  { key: "crimson", ko: "\uC9C4\uD64D", hex: "#ef4444", en: "\uAC15\uB82C\uD55C \uC9C4\uD64D-\uB808\uB4DC" },
  { key: "emerald", ko: "\uC5D0\uBA54\uB784\uB4DC", hex: "#10b981", en: "\uC120\uBA85\uD55C \uC5D0\uBA54\uB784\uB4DC-\uADF8\uB9B0" },
  { key: "azure", ko: "\uBE14\uB8E8", hex: "#3b82f6", en: "\uCCAD\uBA85\uD55C \uD558\uB298-\uBE14\uB8E8" },
  { key: "rose", ko: "\uB85C\uC988", hex: "#fb7185", en: "\uD654\uC0AC\uD55C \uB85C\uC988-\uD551\uD06C" },
  { key: "white", ko: "\uD654\uC774\uD2B8", hex: "#e5e7eb", en: "\uC21C\uBC31-\uC2E4\uBC84 \uD654\uC774\uD2B8 \uBC1C\uAD11" },
  { key: "holo", ko: "\uD640\uB85C", hex: "#c4b5fd", swatch: "conic-gradient(from 0deg,#f0abfc,#7dd3fc,#fde68a,#a7f3d0,#f0abfc)", en: "\uC5EC\uB7EC \uC2A4\uD399\uD2B8\uB7FC \uC0C9\uC774 \uC5B4\uC6B0\uB7EC\uC9C4 \uBB34\uC9C0\uAC1C\uBE5B \uD640\uB85C\uADF8\uB7A8" }
];
var isColorableGround = (key) => !!BUNDLE_GROUND_OPTIONS.find((o) => o.key === key)?.colorable;
var BUNDLE_LAYOUT_OPTIONS = [
  { key: "normal", ko: "\uAE30\uBCF8", en: "\uACB9\uCE68\uC740 \uAC00\uC7A5\uC790\uB9AC\uB9CC \uC0B4\uC9DD (\uAC01 \uC544\uC774\uD15C\uC758 80% \uC774\uC0C1\uC774 \uBCF4\uC774\uB3C4\uB85D \u2014 \uC544\uC774\uD15C\uB07C\uB9AC \uD569\uCCD0\uC9C0\uAC70\uB098 \uAC00\uB824\uC838 \uC0AC\uB77C\uC9C0\uBA74 \uC548 \uB428)." },
  { key: "tight", ko: "\uC881\uAC8C", en: "\uC544\uC774\uD15C\uB4E4\uC774 \uC11C\uB85C \uC870\uAE08\uC529 \uACB9\uCE58\uACE0 \uAE30\uB300\uBA70 \uBC00\uCC29\uB41C \uCF64\uD329\uD2B8\uD55C \u2605\uD55C \uB369\uC5B4\uB9AC(\uBCF4\uC0C1 \uBB34\uB354\uAE30)\u2605\uB85C \uC77D\uD788\uAC8C \uBC30\uCE58\uD558\uC138\uC694 \u2014 \uD2C8 \uC5C6\uC774 \uC639\uAE30\uC885\uAE30 \uBAA8\uC778 \uB290\uB08C. \uB2E8, \uAC01 \uC544\uC774\uD15C\uC758 60% \uC774\uC0C1\uC740 \uBCF4\uC5EC\uC57C \uD558\uACE0 \uC544\uC774\uD15C\uB07C\uB9AC \uD569\uCCD0\uC9C0\uAC70\uB098 \uC644\uC804\uD788 \uAC00\uB824\uC838 \uC0AC\uB77C\uC9C0\uBA74 \uC548 \uB429\uB2C8\uB2E4." }
];
var BUNDLE_BG_OPTIONS = [
  { key: "black", ko: "\uBE14\uB799", fill: "#000000", en: "\uC21C\uC218\uD55C \uAC80\uC815(#000000) \uB2E8\uC0C9 \uBC30\uACBD \u2014 \uBC1C\uAD11\xB7\uC774\uD399\uD2B8 \uCD94\uCD9C\uC6A9 \uB204\uB07C \uC791\uC5C5\uC5D0 \uCD5C\uC801" },
  { key: "chroma", ko: "\uD06C\uB85C\uB9C8 \uADF8\uB9B0", fill: "#00FF00", en: "\uC21C\uC218\uD55C \uD06C\uB85C\uB9C8\uD0A4 \uADF8\uB9B0(#00FF00) \uB2E8\uC0C9 \uBC30\uACBD. \u2605\uC544\uC774\uD15C\xB7\uBE5B\uD6A8\uACFC\xB7\uBC14\uB2E5 \uC774\uD399\uD2B8 \uC5B4\uB514\uC5D0\uB3C4 \uC774 \uCD08\uB85D\uC0C9 \uACC4\uC5F4\uC744 \uC0AC\uC6A9\uD558\uC9C0 \uB9D0 \uAC83 (\uD0A4\uC789 \uC2DC \uAC19\uC774 \uBE60\uC9D0)\u2605" },
  { key: "white", ko: "\uD654\uC774\uD2B8", fill: "#FFFFFF", en: "\uC21C\uC218\uD55C \uD770\uC0C9(#FFFFFF) \uB2E8\uC0C9 \uBC30\uACBD" }
];
var GROUND_REALISM_CORE = `[\uBC14\uB2E5 \uC774\uD399\uD2B8 \uD004\uB9AC\uD2F0 \u2014 \uC2E4\uC0AC\xB7\uC2DC\uB124\uB9C8\uD2F1 (\uC911\uC694)] \uBC14\uB2E5 \uC774\uD399\uD2B8\uB294 \u2605\uC77C\uB7EC\uC2A4\uD2B8\xB7\uCE74\uD230\xB7\uC140\uC170\uC774\uB529\xB7\uD50C\uB7AB \uBCA1\uD130\xB7\uC560\uB2C8\uBA54\uC774\uC158\uD48D\uC774 \uC544\uB2C8\uB77C, \uC2E4\uC81C \uC0AC\uC9C4\uC774\uB098 \uC601\uD654 VFX\uCC98\uB7FC \uC0AC\uC2E4\uC801\uC73C\uB85C(photorealistic, cinematic)\u2605 \uB80C\uB354\uD558\uC138\uC694:
- \uBB3C\uB9AC \uAE30\uBC18 \uBCFC\uB958\uBA54\uD2B8\uB9AD \uB77C\uC774\uD2B8\uC640 \uC2E4\uC81C \uBE5B \uC0B0\uB780(light scattering, god rays), \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uAD11\uC6D0 \uAC10\uC1E0\uC640 \uC18C\uD504\uD2B8 \uBE14\uB8F8.
- \uC2E4\uC81C \uD30C\uD2F0\uD074 \uC2DC\uBBAC\uB808\uC774\uC158 \uAC19\uC740 \uBBF8\uC138\uD55C \uC2A4\uD30C\uD06C\xB7\uBD88\uD2F0\xB7\uBA3C\uC9C0\xB7\uC5F0\uBB34 \uB514\uD14C\uC77C\uACFC \uBAA8\uC158 \uBE14\uB7EC, \uAE4A\uC774\uAC10(\uD53C\uC0AC\uACC4\uC2EC\uB3C4) \uC788\uB294 \uBCF4\uCF00.
- \uC0AC\uC2E4\uC801\uC778 \uD558\uC774\uB2E4\uC774\uB0B4\uBBF9\uB808\uC778\uC9C0(\uBC1D\uC740 \uCF54\uC5B4 \u2192 \uBD80\uB4DC\uB7EC\uC6B4 \uD3F4\uC624\uD504), \uD544\uB984 \uADF8\uB808\uC778\uAE09 \uC9C8\uAC10\uACFC \uACE0\uD574\uC0C1 \uB514\uD14C\uC77C.
- \u2605\uAE08\uC9C0: \uB0A9\uC791\uD55C \uB2E8\uC0C9 \uADF8\uB77C\uB370\uC774\uC158, \uB9CC\uD654\uD48D \uC544\uC6C3\uB77C\uC778, \uD50C\uB7AB \uCEEC\uB7EC, \uC2A4\uD2F0\uCEE4\xB7\uD074\uB9BD\uC544\uD2B8 \uB290\uB08C, \uB3C4\uD615\uC801\uC778 \uC2EC\uBCFC.\u2605`;
var buildBundlePrompt = (lightKey, groundKey, magicColorKey, intent, itemCount = 0, bgKey = "black", layoutKey = "normal") => {
  const light = BUNDLE_LIGHT_OPTIONS.find((o) => o.key === lightKey) || BUNDLE_LIGHT_OPTIONS[1];
  const groundOpt = BUNDLE_GROUND_OPTIONS.find((o) => o.key === groundKey) || BUNDLE_GROUND_OPTIONS[2];
  const color = BUNDLE_MAGIC_COLORS.find((c) => c.key === magicColorKey) || BUNDLE_MAGIC_COLORS[0];
  const bg = BUNDLE_BG_OPTIONS.find((o) => o.key === bgKey) || BUNDLE_BG_OPTIONS[0];
  const layout = BUNDLE_LAYOUT_OPTIONS.find((o) => o.key === layoutKey) || BUNDLE_LAYOUT_OPTIONS[0];
  const ground = groundOpt.en.replace("{color}", color.en);
  const extra = String(intent || "").trim();
  const n = Number(itemCount) || 0;
  const countRule = n ? `
\u26051:1 \uB300\uC751 (\uD575\uC2EC \uADDC\uCE59): \uCCA8\uBD80\uB41C \uC544\uC774\uD15C \uC774\uBBF8\uC9C0\uB294 \uC815\uD655\uD788 ${n}\uC7A5\uC774\uACE0, \uACB0\uACFC\uC5D0\uB294 \uC815\uD655\uD788 ${n}\uAC1C\uC758 \uC544\uC774\uD15C\uB9CC \uC788\uC5B4\uC57C \uD569\uB2C8\uB2E4. \u2605\uCCA8\uBD80 \uC774\uBBF8\uC9C0 1\uC7A5 = \uACB0\uACFC \uC18D \uC544\uC774\uD15C 1\uAC1C\u2605 \u2014 \uAC01 \uCCA8\uBD80 \uC774\uBBF8\uC9C0\uC758 \uC544\uC774\uD15C\uC744 \uC815\uD655\uD788 \uD55C \uBC88\uC529\uB9CC \uC0AC\uC6A9\uD558\uACE0, \uC77C\uBD80\uB97C \uBE7C\uC9C0\uB3C4 \uB9C8\uC138\uC694.\u2605

\u2605\u2605\uC911\uBCF5 \uAE08\uC9C0 (\uAC00\uC7A5 \uD754\uD55C \uC2E4\uD328 1): \uAC01 \uC544\uC774\uD15C\uC740 \uC138\uC0C1\uC5D0 \uB2E8 \uD558\uB098\uBFD0\uC778 \uC720\uBB3C\uC785\uB2C8\uB2E4 \u2014 \uBCF5\uC81C\uBCF8\xB7\uC30D\uB465\uC774\xB7\uAC19\uC740 \uC544\uC774\uD15C 2\uAC1C\uB294 \uC874\uC7AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uD558\uB098\uC758 \uCCA8\uBD80 \uC774\uBBF8\uC9C0\uC5D0\uC11C \uC544\uC774\uD15C\uC744 \uB450 \uBC88 \uC774\uC0C1 \uADF8\uB9AC\uBA74 \uADF8 \uC989\uC2DC \uC2E4\uD328\uC785\uB2C8\uB2E4. \uAD6C\uB3C4\uC758 \uADE0\uD615\xB7\uB300\uCE6D\uC744 \uB9DE\uCD94\uAC70\uB098 \uBE48 \uACF5\uAC04\uC744 \uCC44\uC6B0\uAE30 \uC704\uD574 \uC544\uC774\uD15C\uC744 \uBC18\uBCF5\uD574\uC11C \uADF8\uB9AC\uC9C0 \uB9C8\uC138\uC694 \u2014 \uBE48 \uACF5\uAC04\uC740 \uADF8\uB0E5 \uBE44\uC6CC\uB450\uAC70\uB098 \uBE5B\xB7\uC774\uD399\uD2B8\uB85C\uB9CC \uCC44\uC6B0\uC138\uC694.\u2605\u2605

\u2605\u2605\uC0C8 \uC544\uC774\uD15C \uBC1C\uBA85 \uC808\uB300 \uAE08\uC9C0 (\uAC00\uC7A5 \uD754\uD55C \uC2E4\uD328 2): \uCCA8\uBD80\uC5D0 \uC5C6\uB294 \uC624\uBE0C\uC81D\uD2B8\uB97C \uB2E8 \uD558\uB098\uB3C4 \uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uB9C8\uC138\uC694. \uD2B9\uD788 '\uBCF4\uC0C1 \uC5F0\uCD9C'\uC5D0 \uD754\uD55C \u2605\uBCF4\uBB3C\uC0C1\uC790\xB7\uADA4\uC9DD\xB7\uC790\uB8E8\xB7\uC8FC\uBA38\uB2C8\xB7\uB3D9\uC804 \uBB34\uB354\uAE30\xB7\uBCF4\uC11D \uB354\uBBF8\xB7\uC655\uAD00\xB7\uC5F4\uC1E0\xB7\uB9AC\uBCF8\u2605 \uAC19\uC740 \uC624\uBE0C\uC81D\uD2B8\uB97C \uAD6C\uB3C4\uC758 \uC911\uC2EC\uC774\uB098 \uB4A4\uCABD\uC5D0 \uCC44\uC6CC \uB123\uB294 \uAC83\uC774 \uB300\uD45C\uC801\uC778 \uC2E4\uD328 \uC0AC\uB840\uC785\uB2C8\uB2E4. \uD074\uB7EC\uC2A4\uD130\uC758 \uC911\uC2EC(\uAC00\uC7A5 \uD070 \uC544\uC774\uD15C)\uB3C4 \uBC18\uB4DC\uC2DC \uCCA8\uBD80\uB41C ${n}\uAC1C \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.\u2605\u2605

\uCD5C\uC885 \uC790\uCCB4\uAC80\uC99D (\uCD9C\uB825 \uC804\uC5D0 \uBC18\uB4DC\uC2DC): \uCCA8\uBD80 \uC774\uBBF8\uC9C0\uB97C 1\uC7A5\uC529 \uC21C\uC11C\uB300\uB85C \uD655\uC778\uD558\uBA70 \u2014 \u2460\uADF8 \uC544\uC774\uD15C\uC774 \uACB0\uACFC\uC5D0 \uC815\uD655\uD788 1\uAC1C\uB9CC \uC788\uB294\uAC00 \u2461\uACB0\uACFC\uC758 \uC544\uC774\uD15C \uCD1D \uAC1C\uC218\uAC00 ${n}\uAC1C\uC778\uAC00 \u2462\uCCA8\uBD80\uC5D0 \uC5C6\uB294 \uC0C8 \uC624\uBE0C\uC81D\uD2B8\uAC00 \uC5C6\uB294\uAC00 \u2463\uAC01 \uC544\uC774\uD15C\uC774 \uC798\uB9AC\uC9C0 \uC54A\uACE0 \uC804\uCCB4\uAC00 \uC628\uC804\uD788 \uBCF4\uC774\uB294\uAC00 \u2464\uC6D0\uBCF8\uC5D0 \uC0C8\uACA8\uC838 \uC788\uB358 \uAE00\uC790\xB7\uB77C\uBCA8\xB7\uB514\uD14C\uC77C\uC774 \uC9C0\uC6CC\uC9C0\uC9C0 \uC54A\uACE0 \uADF8\uB300\uB85C\uC778\uAC00 \u2465\uC544\uC774\uD15C\uC774 \uB298\uC5B4\uB098\uAC70\uB098 \uB20C\uB824 \uCC0C\uADF8\uB7EC\uC9C0\uC9C0 \uC54A\uACE0 \uC6D0\uBCF8 \uC885\uD6A1\uBE44\xB7\uD615\uD0DC\uAC00 \uADF8\uB300\uB85C\uC778\uAC00 \u2014 \uD558\uB098\uB77C\uB3C4 \uC544\uB2C8\uBA74 \uB2E4\uC2DC \uAD6C\uC131\uD558\uC138\uC694.
` : "";
  const groundHarmony = groundOpt.key !== "none" ? `
[\uBC14\uB2E5 \uC811\uC9C0\xB7\uC870\uD654] \uBC14\uB2E5 \uC774\uD399\uD2B8\uB294 \uC544\uC774\uD15C\uB4E4\uC758 \uC0C9\uAC10\xB7\uD1A4\uACFC \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC870\uD654\uB418\uB3C4\uB85D \uAE54\uACE0, \uBAA8\uB4E0 \uC544\uC774\uD15C\uC774 \uADF8 \uC704\uC5D0 \uC2E4\uC81C\uB85C \uB193\uC778 \uAC83\uCC98\uB7FC \uAC01 \uC544\uC774\uD15C \uC544\uB798\uC5D0 \uBD80\uB4DC\uB7EC\uC6B4 \uCEE8\uD0DD\uD2B8 \uC100\uB3C4\uC6B0\uB97C \uBC18\uB4DC\uC2DC \uB123\uC73C\uC138\uC694. \uC544\uC774\uD15C\uC774 \uC774\uD399\uD2B8 \uC704\uC5D0 \uB5A0 \uC788\uAC70\uB098 \uC624\uB824 \uBD99\uC778 \uCF5C\uB77C\uC8FC\uCC98\uB7FC \uBCF4\uC774\uBA74 \uC2E4\uD328\uC785\uB2C8\uB2E4.
` : "";
  const groundRealism = groundOpt.key !== "none" && groundOpt.key !== "shadow" ? `
${GROUND_REALISM_CORE}
\uBC14\uB2E5 \uC774\uD399\uD2B8\uB9CC \uC774\uB807\uAC8C \uC2E4\uC0AC\uB85C \uB80C\uB354\uD558\uACE0, \uC544\uC774\uD15C \uC790\uCCB4\uB294 \uC704\uC758 \uC6D0\uBCF8 \uBCF4\uC874 \uADDC\uCE59\uC744 \uADF8\uB300\uB85C \uC9C0\uD0A4\uC138\uC694.
` : "";
  return `\uAC8C\uC784 \uD504\uB85C\uBAA8\uC158\uC6A9 '\uBCF4\uC0C1 \uC544\uC774\uD15C \uAFB8\uB7EC\uBBF8' \uD569\uC131 \uC804\uBB38\uAC00\uB85C \uC791\uC5C5\uD558\uC138\uC694. \uC785\uB825\uC73C\uB85C \uC544\uC774\uD15C \uC774\uBBF8\uC9C0\uAC00 \uC5EC\uB7EC \uC7A5 \uCCA8\uBD80\uB418\uC5B4 \uC788\uC73C\uBA70, \u2605\uAC01 \uCCA8\uBD80 \uC774\uBBF8\uC9C0\uC5D0\uB294 \uC544\uC774\uD15C\uC774 \uC815\uD655\uD788 1\uAC1C\uC529\u2605 \uB4E4\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uC774 \uC544\uC774\uD15C\uB4E4\uB9CC\uC73C\uB85C \u2014 \uB2E4\uB978 \uC5B4\uB5A4 \uC624\uBE0C\uC81D\uD2B8\uB3C4 \uCD94\uAC00\uD558\uC9C0 \uC54A\uACE0 \u2014 \uD55C \uC7A5\uC758 \uAFB8\uB7EC\uBBF8 \uC774\uBBF8\uC9C0\uB97C \uD569\uC131\uD558\uC138\uC694.

\u2605\u2605\uC6D0\uBCF8 \uC808\uB300 \uBCF4\uC874 (\uCD5C\uC6B0\uC120 \uADDC\uCE59 \u2014 \uB2E4\uB978 \uBAA8\uB4E0 \uC9C0\uC2DC\uBCF4\uB2E4 \uC6B0\uC120):
\uAC01 \uC544\uC774\uD15C\uC758 \uC6D0\uBCF8 \uD615\uD0DC\uC640 \uB0B4\uC6A9\uC740 \uC808\uB300 \uBCC0\uACBD\uD558\uBA74 \uC548 \uB429\uB2C8\uB2E4. \uC544\uC774\uD15C\uC744 "\uB2E4\uC2DC \uADF8\uB9AC\uB294" \uAC83\uC774 \uC544\uB2C8\uB77C "\uC0AC\uC9C4\uC744 \uC624\uB824 \uC62E\uAE30\uB4EF" \uD53D\uC140 \uB2E8\uC704\uB85C \uCDA9\uC2E4\uD558\uAC8C \uC7AC\uBC30\uCE58\uD558\uC138\uC694.
- \uBCF4\uC874 \uB300\uC0C1 \uC804\uBD80: \uC678\uACFD \uC2E4\uB8E8\uC5E3, \uBE44\uC728, \uD615\uD0DC, \uC0C9\uC0C1, \uC7AC\uC9C8\xB7\uD14D\uC2A4\uCC98, \uADF8\uB9AC\uACE0 \u2605\uB0B4\uC6A9\uBB3C\u2605 \u2014 \uC544\uC774\uD15C \uD45C\uBA74\uC5D0 \uADF8\uB824\uC9C4 \uADF8\uB9BC\xB7\uBB38\uC591\xB7\uD328\uD134\xB7\uC544\uC774\uCF58\xB7\uBCF4\uC11D \uBC30\uCE58\xB7\uC7A5\uC2DD \uB514\uD14C\uC77C, \uADF8\uB9AC\uACE0 \u2605\uC544\uC774\uD15C\uC5D0 \uC0C8\uACA8\uC9C4 \uAE00\uC790\xB7\uC22B\uC790\xB7\uB77C\uBCA8\u2605\uAE4C\uC9C0 \uC6D0\uBCF8\uACFC \uC644\uC804\uD788 \uB3D9\uC77C\uD574\uC57C \uD569\uB2C8\uB2E4. \uCE74\uB4DC\uB77C\uBA74 \uCE74\uB4DC\uC758 \uADF8\uB9BC\uACFC \uAE00\uC790\uAC00, \uC0C1\uC790\uB77C\uBA74 \uC7A5\uC2DD\uACFC \uC7A0\uAE08\uC7A5\uCE58\uAC00 \uC6D0\uBCF8 \uADF8\uB300\uB85C. \uC6D0\uBCF8\uC5D0 \uC788\uB294 \uD14D\uC2A4\uD2B8\uB97C \uC9C0\uC6B0\uAC70\uB098 \uBB49\uAC1C\uAC70\uB098 \uB2E4\uB978 \uAE00\uC790\uB85C \uBC14\uAFB8\uB294 \uAC83\uB3C4 \uBCC0\uD615\uC774\uBA70 \uC2E4\uD328\uC785\uB2C8\uB2E4.
- \uD5C8\uC6A9\uB418\uB294 \uBCC0\uACBD\uC740 \uC624\uC9C1 \uC774 \uC138 \uAC00\uC9C0\uBFD0: \u2460\uBC30\uCE58 \uC704\uCE58 \u2461\uC885\uD6A1\uBE44\uB97C \uC720\uC9C0\uD55C \uB4F1\uBE44(uniform) \uD06C\uAE30 \uC870\uC808 \u2462\uC804\uCCB4 \uC870\uBA85\uACFC \uC5B4\uC6B8\uB9AC\uB294 \uB9BC\uB77C\uC774\uD2B8\xB7\uADF8\uB9BC\uC790. \uC774 \uC678\uC758 \uC5B4\uB5A4 \uD53D\uC140 \uC218\uC900 \uBCC0\uACBD\uB3C4 \uAE08\uC9C0.
- \u2605\uC885\uD6A1\uBE44(\uAC00\uB85C:\uC138\uB85C \uBE44\uC728)\xB7\uD615\uD0DC \uC808\uB300 \uBCF4\uC874: \uC544\uC774\uD15C\uC744 \uAC00\uB85C\uB098 \uC138\uB85C\uB85C \uB298\uC774\uAC70\uB098(stretch) \uB20C\uB7EC \uCC0C\uADF8\uB7EC\uB728\uB9AC\uB294(squash) \uBE44\uB4F1\uBC29(non-uniform) \uC2A4\uCF00\uC77C\uC740 \uC808\uB300 \uAE08\uC9C0\uC785\uB2C8\uB2E4. \uD06C\uAE30\uB97C \uBC14\uAFC0 \uB54C\uB294 \uC6D0\uBCF8 \uC885\uD6A1\uBE44\uB97C 100% \uC720\uC9C0\uD55C \uCC44 \uC804\uCCB4\uB97C \uB3D9\uC77C \uBC30\uC728\uB85C\uB9CC \uD655\uB300\xB7\uCD95\uC18C\uD558\uC138\uC694. \uC678\uACFD \uC2E4\uB8E8\uC5E3\uC758 \uACE1\uB960\xB7\uAD74\uACE1\xB7\uB450\uAED8 \uBE44\uC728, \uAC01 \uBD80\uBD84\uC758 \uC0C1\uB300 \uAE38\uC774\xB7\uD3ED \uBE44\uC728\uAE4C\uC9C0 \uC6D0\uBCF8\uACFC \uB3D9\uC77C\uD574\uC57C \uD569\uB2C8\uB2E4. \uAD6C\uB3C4\uB97C \uB9DE\uCD94\uAC70\uB098 \uBE48\uCE78\uC744 \uCC44\uC6B0\uB824\uACE0 \uD2B9\uC815 \uC544\uC774\uD15C\uC744 \uB298\uB824 \uBCC0\uD615\uD558\uC9C0 \uB9C8\uC138\uC694.\u2605
- \u2605\uC2DC\uC810\xB7\uD68C\uC804 \uACE0\uC815: \uAC01 \uC544\uC774\uD15C\uC758 \uC6D0\uBCF8 \uCE74\uBA54\uB77C \uAC01\uB3C4\xB7\uBC29\uD5A5\xB7\uAE30\uC6B8\uAE30\uB97C \uADF8\uB300\uB85C \uC720\uC9C0\uD558\uC138\uC694 \u2014 \uD68C\uC804, \uAE30\uC6B8\uC774\uAE30, \uC6D0\uADFC/\uD22C\uC2DC \uBCC0\uD615, 3D \uC2DC\uC810 \uBCC0\uACBD, \uC88C\uC6B0 \uBC18\uC804 \uC804\uBD80 \uAE08\uC9C0. \uC544\uC774\uD15C\uC740 \uC785\uB825\uC5D0 \uBCF4\uC774\uB294 \uAC01\uB3C4 \uADF8\uB300\uB85C '\uC62E\uAE30\uAE30'\uB9CC \uD558\uACE0, \uC624\uC9C1 \uBC30\uCE58(\uC704\uCE58\uC640 \uC55E\uB4A4 \uACB9\uCE68 \uAD00\uACC4)\uC5D0\uB9CC \uC9D1\uC911\uD558\uC138\uC694.\u2605
- \uC7AC\uD574\uC11D\xB7\uB2E8\uC21C\uD654\xB7\uB514\uD14C\uC77C \uCD94\uAC00\xB7\uC0C9 \uBCF4\uC815\xB7\uC2A4\uD0C0\uC77C \uBCC0\uACBD \uC804\uBD80 \uAE08\uC9C0. \uCD9C\uB825 \uC804\uC5D0 \uAC01 \uC544\uC774\uD15C\uC744 \uC785\uB825\uACFC 1:1\uB85C \uBE44\uAD50\uD574 \uD615\uD0DC\uB098 \uB0B4\uC6A9\uC774 \uC870\uAE08\uC774\uB77C\uB3C4 \uB2EC\uB77C\uC84C\uC73C\uBA74 \uC2E4\uD328\uB85C \uAC04\uC8FC\uD558\uACE0 \uB2E4\uC2DC \uADF8\uB300\uB85C \uC62E\uAE30\uC138\uC694.\u2605\u2605
${countRule}
\uAD6C\uB3C4: \uC544\uC774\uD15C\uB4E4\uC744 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uD558\uB098\uC758 \uAFB8\uB7EC\uBBF8(\uD074\uB7EC\uC2A4\uD130)\uB85C \uC7AC\uBC30\uCE58\uD558\uC138\uC694 \u2014 \uAC00\uC7A5 \uD070 \uC544\uC774\uD15C\uC774 \uB4A4 \uC911\uC559, \uC791\uC740 \uC544\uC774\uD15C\uB4E4\uC774 \uC55E\uACFC \uC606\uC758 \uC548\uC815\uC801\uC778 \uC0BC\uAC01\uD615 \uAD6C\uB3C4. [\uBC30\uCE58 \uBC00\uB3C4] ${layout.en} \uC811\uC9C0(\uBC14\uB2E5\uC5D0 \uC2E4\uC81C\uB85C \uB193\uC778 \uB290\uB08C)\uB97C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB9DE\uCD94\uACE0, \uC544\uC774\uD15C \uAC04 \uC811\uCD09\uBD80\uC5D0 \uC0C1\uD638 \uADF8\uB9BC\uC790\uB97C \uB123\uC5B4 \uD55C \uB369\uC5B4\uB9AC\uB85C \uC77D\uD788\uAC8C \uD558\uC138\uC694. \uC870\uBA85 \uBC29\uD5A5\uC740 \uC804\uCCB4\uAC00 \uD558\uB098\uB85C \uD1B5\uC77C. \uC544\uC774\uD15C\uC758 \uAC01\uB3C4\uB294 \uBC14\uAFB8\uC9C0 \uB9D0\uACE0 \uC704\uCE58\uC640 \uC55E\uB4A4 \uAD00\uACC4\uB85C\uB9CC \uAD6C\uB3C4\uB97C \uB9CC\uB4DC\uC138\uC694.

\u2605\uD06C\uAE30 \uADDC\uCE59: \uCCA8\uBD80 \uC774\uBBF8\uC9C0\uB4E4\uC758 \uD574\uC0C1\uB3C4\xB7\uD53D\uC140 \uD06C\uAE30 \uCC28\uC774\uB294 \uBB34\uC2DC\uD558\uACE0 \u2014
\u2460\u2605\uC720\uC0AC \uD615\uD0DC \uD06C\uAE30 \uC77C\uCE58 (\uAC00\uC7A5 \uC911\uC694)\u2605: \uD615\uD0DC\uB098 \uC885\uB958\uAC00 \uBE44\uC2B7\uD55C \uC544\uC774\uD15C\uB07C\uB9AC\uB294 \u2605\uBC18\uB4DC\uC2DC \uAC70\uC758 \uAC19\uC740 \uD06C\uAE30\u2605\uB85C \uADF8\uB9AC\uC138\uC694. \uC608: \uAC19\uC740 \uC2DC\uB9AC\uC988\uC758 \uBCD1/\uD50C\uB77C\uC2A4\uD06C 2\uAC1C, \uC0C9\uB9CC \uB2E4\uB978 \uBCF4\uC11D 2\uAC1C \u2014 \uC0C9\xB7\uBB38\uC591\uC774 \uB2EC\uB77C\uB3C4 \uD615\uD0DC\uAC00 \uBE44\uC2B7\uD558\uBA74 \uAC19\uC740 \uD06C\uAE30\uC785\uB2C8\uB2E4. \uD558\uB098\uB9CC \uD06C\uACE0 \uD558\uB098\uB9CC \uC791\uAC8C \uADF8\uB9AC\uBA74 \uC2E4\uD328\uC785\uB2C8\uB2E4.
\u2461\uAC00\uC7A5 \uD070 \uC544\uC774\uD15C\uB3C4 \uAC00\uC7A5 \uC791\uC740 \uC544\uC774\uD15C\uC758 1.8\uBC30\uB97C \uB118\uC9C0 \uC54A\uAC8C.
\u2462\uD2B9\uC815 \uC544\uC774\uD15C\uB9CC \uC784\uC758\uB85C \uACFC\uD558\uAC8C \uD0A4\uC6B0\uAC70\uB098 \uC904\uC774\uC9C0 \uB9D0 \uAC83.
\uC608\uC678: \uC544\uB798 [\uC0AC\uC6A9\uC790 \uCD94\uAC00 \uC9C0\uC2DC]\uC5D0\uC11C \uD2B9\uC815 \uC544\uC774\uD15C(\uC608: \uC0C1\uC790)\uC744 \uD06C\uAC8C \uD558\uB77C\uACE0 \uBA85\uC2DC\uD55C \uACBD\uC6B0, \uADF8 \uC544\uC774\uD15C\uC5D0 \uD55C\uD574\uC11C\uB9CC \uD655\uB300\uB97C \uD5C8\uC6A9\uD569\uB2C8\uB2E4.\u2605

[\uBE5B\uD6A8\uACFC] ${light.en}
[\uBC14\uB2E5 \uC774\uD399\uD2B8] ${ground}${groundHarmony}${groundRealism}
\u2605\uC544\uC774\uD15C \uC644\uC804\uC131: \uAC01 \uC544\uC774\uD15C\uC740 \u2605\uC804\uCCB4 \uD615\uD0DC\uAC00 \uC628\uC804\uD788\u2605 \uBCF4\uC5EC\uC57C \uD569\uB2C8\uB2E4 \u2014 \uC544\uC774\uD15C\uC758 \uC77C\uBD80\uB97C \uC798\uB77C\uB0B4\uAC70\uB098, \uCE94\uBC84\uC2A4 \uAC00\uC7A5\uC790\uB9AC\uC5D0 \uAC78\uCCD0 \uC798\uB9AC\uAC8C \uBC30\uCE58\uD558\uAC70\uB098, \uB2E4\uB978 \uC544\uC774\uD15C\uC5D0 \uACFC\uD558\uAC8C \uAC00\uB824 \uC77C\uBD80\uAC00 \uC0AC\uB77C\uC9C0\uAC8C \uD558\uC9C0 \uB9C8\uC138\uC694. \uBAA8\uB4E0 \uC544\uC774\uD15C\uC774 \uAC00\uC7A5\uC790\uB9AC \uC5EC\uBC31\uC744 \uB450\uACE0 \uD504\uB808\uC784 \uC548\uC5D0 \uC644\uC804\uD788 \uB4E4\uC5B4\uC640\uC57C \uD569\uB2C8\uB2E4. \uD544\uC694\uD558\uBA74 \uC544\uC774\uD15C\uB4E4\uC744 \uC870\uAE08 \uC791\uAC8C \uADF8\uB824\uC11C\uB77C\uB3C4 \uC804\uBD80 \uC628\uC804\uD788 \uB2F4\uC73C\uC138\uC694.\u2605

\uBC30\uACBD: ${bg.en}. \uAFB8\uB7EC\uBBF8\uAC00 \uBC30\uACBD\uC5D0\uC11C \uAE68\uB057\uD558\uAC8C \uBD84\uB9AC\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4 (\uB204\uB07C \uC791\uC5C5\uC6A9 \u2014 \uBC30\uACBD \uD14D\uC2A4\uCC98\xB7\uD48D\uACBD\xB7\uADF8\uB77C\uB370\uC774\uC158 \uAE08\uC9C0, \uBC14\uB2E5 \uC774\uD399\uD2B8\uB9CC \uC608\uC678).${bg.key === "black" ? `
\u2605\uBC30\uACBD \uD544\uC218 \uADDC\uCE59(\uC808\uB300\xB7\uD0C0\uD611 \uBD88\uAC00): \uCD9C\uB825 \uBC30\uACBD\uC740 \uBC18\uB4DC\uC2DC \uC644\uC804\uD55C \uC21C\uD751 RGB(0,0,0)=#000000 \uB2E8\uC0C9\uC774\uC5B4\uC57C \uD558\uBA70 \uAC00\uC7A5\uC790\uB9AC\uAE4C\uC9C0 \uC644\uBCBD\uD788 \uADE0\uC77C\uD574\uC57C \uD569\uB2C8\uB2E4. \uADF8\uB77C\uB370\uC774\uC158\xB7\uC548\uAC1C\xB7\uC8FC\uBCC0\uAD11(ambient)\xB7\uD6C4\uAD11\xB7\uBC14\uB2E5 \uBC18\uC0AC\uAD11\xB7\uB9BC\uB77C\uC774\uD2B8\uAC00 \uBC30\uACBD\uC73C\uB85C \uBC88\uC9C0\uB294 \uAC83, \uADF8\uB9AC\uACE0 \uADFC\uC0AC \uD751\uC0C9(\uC9C4\uD68C\uC0C9\xB7\uB0A8\uC0C9\uB07C) \uC804\uBD80 \uC808\uB300 \uAE08\uC9C0. \uAC01 \uC544\uC774\uD15C \uD45C\uBA74\uC758 \uC790\uCCB4 \uBC1C\uAD11\xB7\uD558\uC774\uB77C\uC774\uD2B8\uB9CC \uC544\uC774\uD15C \uC704\uC5D0 \uB0A8\uAE30\uACE0, \uC544\uC774\uD15C \uBC14\uAE65 \uC601\uC5ED\uC740 \uC804\uBD80 \uC21C\uC218 #000000 \uB85C \uCC44\uC6B0\uC138\uC694 (\uB2E4\uC6B4\uC2A4\uD2B8\uB9BC \uC0C9\uC0C1 \uD0A4 \uB204\uB07C\xB7\uD22C\uBA85 PNG \uCD94\uCD9C \uC815\uD655\uB3C4\uB97C \uC704\uD574).` : ""}
\u2605\uC0C8 \uBB38\uC790 \uC0DD\uC131 \uAE08\uC9C0 (\uC6D0\uBCF8 \uD14D\uC2A4\uD2B8\uC640 \uAD6C\uBD84\uD560 \uAC83): \u2605\uC0C8\uB85C\uC6B4\u2605 \uAE00\uC790\xB7\uC22B\uC790\xB7\uB85C\uACE0\xB7\uC6CC\uD130\uB9C8\uD06C\xB7UI \uD14D\uC2A4\uD2B8\uB97C \uB9CC\uB4E4\uC9C0 \uB9C8\uC138\uC694. \uC720\uC0AC \uBB38\uC790(gibberish)\uB3C4 \uAE08\uC9C0. \uB2E8, \u2605\uC6D0\uBCF8 \uC544\uC774\uD15C\uC5D0 \uC774\uBBF8 \uC0C8\uACA8\uC838 \uC788\uB294 \uAE00\uC790\xB7\uC22B\uC790\xB7\uB77C\uBCA8\uC740 \uC544\uC774\uD15C \uB514\uC790\uC778\uC758 \uC77C\uBD80\uC774\uBBC0\uB85C \uC9C0\uC6B0\uC9C0 \uB9D0\uACE0 \uC6D0\uBCF8 \uADF8\uB300\uB85C \uBCF4\uC874\u2605\uD574\uC57C \uD569\uB2C8\uB2E4 \u2014 \uC774 \uADDC\uCE59\uC740 '\uC5C6\uB358 \uD14D\uC2A4\uD2B8\uB97C \uB9CC\uB4E4\uC9C0 \uB9D0\uB77C'\uB294 \uAC83\uC774\uC9C0 '\uC788\uB358 \uD14D\uC2A4\uD2B8\uB97C \uC9C0\uC6B0\uB77C'\uB294 \uAC83\uC774 \uC808\uB300 \uC544\uB2D9\uB2C8\uB2E4.\u2605
\uACB0\uACFC\uC5D0\uB294 \uC644\uC131\uB41C \uAFB8\uB7EC\uBBF8 \uD55C \uC7A5\uB9CC \uCD9C\uB825\uD558\uC138\uC694.${extra ? `

[\uC0AC\uC6A9\uC790 \uCD94\uAC00 \uC9C0\uC2DC \u2014 \uD615\uD0DC \uBCF4\uC874 \uADDC\uCE59\uACFC \uCDA9\uB3CC\uD558\uBA74 \uBB34\uC2DC]
${extra}` : ""}`;
};

// src/apps/NexusPreview/services/characterPresets.js
var CHAR_LIGHT_OPTIONS = [
  { key: "auto", ko: "\uC790\uB3D9 (\uD615\uD0DC \uBD84\uC11D)", en: "\uCE90\uB9AD\uD130\uC758 \uD615\uD0DC\xB7\uCEE8\uC149\xB7\uAE30\uC874 \uC870\uBA85 \uBC29\uD5A5\uC744 \uBD84\uC11D\uD574 \uAC00\uC7A5 \uC5B4\uC6B8\uB9AC\uB294 \uBE5B \uC5F0\uCD9C\uC744 \uC2A4\uC2A4\uB85C \uC120\uD0DD\uD558\uC138\uC694 \u2014 \uB9BC\uB77C\uC774\uD2B8, \uBC31\uAE00\uB85C\uC6B0, \uC18D\uC131\uAD11(\uBD88/\uC5BC\uC74C/\uBC88\uAC1C \uB4F1) \uC911 \uCE90\uB9AD\uD130\uC640 \uAC00\uC7A5 \uC798 \uB9DE\uB294 \uAC83." },
  { key: "rim", ko: "\uB9BC\uB77C\uC774\uD2B8", en: "\uCE90\uB9AD\uD130 \uC678\uACFD\uC744 \uB530\uB77C \uC587\uACE0 \uB610\uB837\uD55C \uB9BC\uB77C\uC774\uD2B8(\uC724\uACFD\uAD11)\uB97C \uB123\uC73C\uC138\uC694 \u2014 \uC2E4\uB8E8\uC5E3\uC774 \uBC30\uACBD\uC5D0\uC11C \uC120\uBA85\uD558\uAC8C \uBD84\uB9AC\uB418\uB294 \uACE0\uAE09\uC2A4\uB7EC\uC6B4 \uC5F0\uCD9C." },
  { key: "backglow", ko: "\uBC31\uAE00\uB85C\uC6B0", en: "\uCE90\uB9AD\uD130 \uB4A4\uC5D0\uC11C \uC740\uC740\uD558\uAC8C \uD37C\uC9C0\uB294 \uBC31\uB77C\uC774\uD2B8 \uAE00\uB85C\uC6B0\uB97C \uB123\uC73C\uC138\uC694 \u2014 \uCE90\uB9AD\uD130\uAC00 \uBE5B\uC744 \uB4F1\uC9C0\uACE0 \uC120 \uB4EF\uD55C \uBD80\uB4DC\uB7EC\uC6B4 \uD6C4\uAD11." },
  { key: "intense", ko: "\uAC15\uB82C\uD55C \uBC1C\uAD11", en: "\uADF9\uC801\uC778 \uC5ED\uAD11\uACFC \uCE90\uB9AD\uD130 \uC18D\uC131\uC5D0 \uB9DE\uB294 \uC5D0\uB108\uC9C0 \uAD11\uC774 \uAC10\uB3C4\uB294 \uAC15\uB82C\uD55C \uBC1C\uAD11 \uC5F0\uCD9C\uC744 \uB123\uC73C\uC138\uC694 \u2014 \uB2E8, \uC6D0\uBCF8 \uB514\uD14C\uC77C\uC774 \uBE5B\uC5D0 \uBB3B\uD788\uBA74 \uC548 \uB429\uB2C8\uB2E4." },
  { key: "none", ko: "\uC5C6\uC74C", en: "\uBE5B \uD6A8\uACFC\uB294 \uCD94\uAC00\uD558\uC9C0 \uB9C8\uC138\uC694 \u2014 \uC6D0\uBCF8 \uC870\uBA85 \uADF8\uB300\uB85C \uC720\uC9C0\uD558\uACE0 \uD30C\uD2F0\uD074\uB9CC \uC801\uC6A9\uD569\uB2C8\uB2E4." }
];
var CHAR_PARTICLE_OPTIONS = [
  { key: "auto", ko: "\uC790\uB3D9 (\uCEE8\uC149 \uBD84\uC11D)", en: "\uCE90\uB9AD\uD130\uC758 \uC18D\uC131\xB7\uCEE8\uC149\uC744 \uBD84\uC11D\uD574 \uC5B4\uC6B8\uB9AC\uB294 \uD30C\uD2F0\uD074\uC744 \uC2A4\uC2A4\uB85C \uC120\uD0DD\uD558\uC138\uC694 \u2014 \uB9C8\uBC95 \uC785\uC790, \uBD88\uD2F0, \uBE5B\uC870\uAC01, \uAF43\uC78E \uB4F1." },
  { key: "magic", ko: "\uB9C8\uBC95 \uC785\uC790", en: "\uBC18\uC9DD\uC774\uB294 \uB9C8\uBC95 \uC785\uC790(\uC544\uCF00\uC778 \uC2A4\uD30C\uD06C\xB7\uAE00\uB85C\uC6B0 \uC810)\uAC00 \uCE90\uB9AD\uD130 \uC8FC\uC704\uB97C \uAC10\uB3CC\uAC8C \uD558\uC138\uC694." },
  { key: "ember", ko: "\uBD88\uD2F0\xB7\uC5E0\uBC84", en: "\uC704\uB85C \uB5A0\uC624\uB974\uB294 \uBD88\uD2F0(\uC5E0\uBC84) \uC785\uC790\uC640 \uC544\uC8FC \uBBF8\uC138\uD55C \uC5F0\uAE30\uB97C \uCE90\uB9AD\uD130 \uC8FC\uBCC0\uC5D0 \uB123\uC73C\uC138\uC694." },
  { key: "glint", ko: "\uBE5B\uC870\uAC01", en: "\uC0B0\uB780\uD558\uB294 \uBE5B \uD30C\uD3B8\uACFC \uC791\uC740 \uAE00\uB9B0\uD2B8\uAC00 \uCE90\uB9AD\uD130 \uC8FC\uBCC0 \uACF5\uAE30\uC5D0 \uD769\uC5B4\uC9C0\uAC8C \uD558\uC138\uC694." },
  { key: "petal", ko: "\uAF43\uC78E\xB7\uD30C\uD3B8", en: "\uD769\uB0A0\uB9AC\uB294 \uAF43\uC78E \uB610\uB294 \uAC00\uBCBC\uC6B4 \uD30C\uD3B8 \uC870\uAC01\uC774 \uCE90\uB9AD\uD130 \uC8FC\uC704\uB97C \uC2A4\uCE58\uAC8C \uD558\uC138\uC694." },
  { key: "none", ko: "\uC5C6\uC74C", en: "\uD30C\uD2F0\uD074\uC740 \uCD94\uAC00\uD558\uC9C0 \uB9C8\uC138\uC694 \u2014 \uBE5B \uD6A8\uACFC\uB9CC \uC801\uC6A9\uD569\uB2C8\uB2E4." }
];
var CHAR_INTENSITY_OPTIONS = [
  { key: "subtle", ko: "\uC57D\uD558\uAC8C", en: "\uC5F0\uCD9C \uAC15\uB3C4: \uC57D\uD558\uAC8C \u2014 \uC740\uC740\uD558\uACE0 \uC808\uC81C\uB41C \uC218\uC900. \uC6D0\uBCF8\uACFC\uC758 \uCC28\uC774\uAC00 \uC0B4\uC9DD \uB290\uAEF4\uC9C8 \uC815\uB3C4\uB85C\uB9CC, \uBE5B\uACFC \uD30C\uD2F0\uD074 \uBAA8\uB450 \uCD5C\uC18C\uD55C\uC73C\uB85C." },
  { key: "normal", ko: "\uD45C\uC900", en: "\uC5F0\uCD9C \uAC15\uB3C4: \uD45C\uC900 \u2014 \uC874\uC7AC\uAC10 \uC788\uB294 \uC5F0\uCD9C. \uB2E8, \uC6D0\uBCF8 \uB514\uD14C\uC77C\uC744 \uAC00\uB9AC\uC9C0 \uC54A\uB294 \uADE0\uD615\uC744 \uC720\uC9C0." },
  { key: "strong", ko: "\uAC15\uD558\uAC8C", en: "\uC5F0\uCD9C \uAC15\uB3C4: \uAC15\uD558\uAC8C \u2014 \uD654\uB824\uD558\uACE0 \uADF9\uC801\uC778 \uC5F0\uCD9C. \uBE5B\uACFC \uD30C\uD2F0\uD074\uC744 \uD48D\uC131\uD558\uAC8C, \uD504\uB85C\uBAA8\uC158 \uD788\uC5B4\uB85C \uCEF7 \uC218\uC900\uC73C\uB85C." }
];
var CHAR_BG_OPTIONS = [
  { key: "auto", ko: "\uC790\uB3D9 (\uBD84\uB9AC \uCD5C\uC801)" },
  { key: "keep", ko: "\uC6D0\uBCF8 \uC720\uC9C0", en: "\uC6D0\uBCF8 \uBC30\uACBD\uC774 \uD22C\uBA85/\uB2E8\uC0C9(\uB204\uB07C)\uC774\uBA74 \uADF8\uB300\uB85C \uC720\uC9C0\uD558\uACE0 \uC5F0\uCD9C\uB9CC \uC5B9\uC73C\uC138\uC694. \uC6D0\uBCF8\uC5D0 \uBC30\uACBD\uC774 \uC788\uC73C\uBA74 \uBC30\uACBD \uAD6C\uB3C4\xB7\uB0B4\uC6A9\uC744 \uC720\uC9C0\uD558\uC138\uC694." },
  { key: "black", ko: "\uBE14\uB799", fill: "#000000", en: "\uBC30\uACBD\uC744 \uC21C\uC218\uD55C \uAC80\uC815(#000000) \uB2E8\uC0C9\uC73C\uB85C \uD1B5\uC77C\uD558\uC138\uC694 \u2014 \uBC1C\uAD11\xB7\uD30C\uD2F0\uD074 \uC5F0\uCD9C\uC744 \uC774\uD399\uD2B8 \uCD94\uCD9C(\uC2A4\uD06C\uB9B0/\uB8E8\uB9C8 \uD0A4)\uB85C \uBD84\uB9AC\uD558\uAE30\uC5D0 \uCD5C\uC801. \uCE90\uB9AD\uD130\uC640 \uC5F0\uCD9C \uC678\uC758 \uBAA8\uB4E0 \uC601\uC5ED\uC740 \uC644\uC804\uD55C \uAC80\uC815\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4." },
  { key: "chroma", ko: "\uD06C\uB85C\uB9C8 \uADF8\uB9B0", fill: "#00FF00", en: "\uBC30\uACBD\uC744 \uC21C\uC218\uD55C \uD06C\uB85C\uB9C8\uD0A4 \uADF8\uB9B0(#00FF00) \uB2E8\uC0C9\uC73C\uB85C \uD1B5\uC77C\uD558\uC138\uC694. \u2605\uCE90\uB9AD\uD130\xB7\uBE5B\xB7\uD30C\uD2F0\uD074 \uC5B4\uB514\uC5D0\uB3C4 \uCD08\uB85D \uACC4\uC5F4 \uC0C9\uC744 \uC0AC\uC6A9\uD558\uC9C0 \uB9D0 \uAC83 (\uD0A4\uC789 \uC2DC \uAC19\uC774 \uBE60\uC9D0)\u2605." },
  { key: "white", ko: "\uD654\uC774\uD2B8", fill: "#FFFFFF", en: "\uBC30\uACBD\uC744 \uC21C\uC218\uD55C \uD770\uC0C9(#FFFFFF) \uB2E8\uC0C9\uC73C\uB85C \uD1B5\uC77C\uD558\uC138\uC694. \uD770\uC0C9\uC5D0 \uAC00\uAE4C\uC6B4 \uC5F0\uCD9C\uC740 \uD1A4\uC744 \uC0B4\uC9DD \uB20C\uB7EC \uBC30\uACBD\uACFC \uAD6C\uBD84\uB418\uAC8C." }
];
function resolveCharBg(lightKey, particleKey, bgKey = "auto") {
  if (bgKey !== "auto") return bgKey;
  const glowLight = lightKey !== "none";
  const glowParticle = ["auto", "magic", "ember", "glint"].includes(particleKey);
  return glowLight || glowParticle ? "black" : "chroma";
}
var CHAR_SKILLS = [
  "character-up/intro",
  "character-up/face-lock",
  "quality-up/preserve-face",
  "quality-up/preserve-subject",
  "quality-up/preserve-edge-fade",
  "quality-up/no-new-text",
  "character-up/char-bg",
  "character-up/char-light",
  "character-up/char-particles",
  "character-up/char-intensity",
  "quality-up/outro"
];

// src/apps/NexusPreview/services/qualityUpSkills.js
var ENHANCE_SKILLS_BG = [
  "quality-up/bg-intro",
  "quality-up/no-new-elements",
  "quality-up/no-new-text",
  "quality-up/preserve-letterform",
  "quality-up/preserve-face",
  "quality-up/preserve-subject",
  "quality-up/bg-preserve-layout",
  "quality-up/preserve-edge-fade",
  "quality-up/bg-dramatic-light",
  "quality-up/title-hero",
  "quality-up/allow-title-finish",
  "quality-up/outro"
];
function buildQualityUpSkillIds(hasBoost = false, hasExtra = false) {
  const ids2 = [...ENHANCE_SKILLS_BG];
  if (hasBoost) ids2.splice(ids2.indexOf("quality-up/title-hero"), 0, "quality-up/bg-mood-theme");
  if (hasExtra) ids2.push("quality-up/user-extra-guard");
  return ids2;
}

// src/lib/charEffectSplit.js
var CHAR_SPLIT_DEFAULTS = { solidLevel: 90, closeRadius: 12, edgeSoft: 4 };
function computeCharMask(srcData, { bg, solidLevel, closeRadius }) {
  const W2 = srcData.width, H = srcData.height, N = W2 * H, s = srcData.data;
  const [br, bgC, bb] = bg || [0, 0, 0];
  const d = new Uint8ClampedArray(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    d[p] = Math.max(Math.abs(s[i] - br), Math.abs(s[i + 1] - bgC), Math.abs(s[i + 2] - bb));
  }
  const chamfer = (isSeed) => {
    const INF = 1073741823;
    const dist = new Int32Array(N);
    for (let p = 0; p < N; p++) dist[p] = isSeed(p) ? 0 : INF;
    for (let y = 0; y < H; y++) for (let x = 0; x < W2; x++) {
      const i = y * W2 + x;
      let v = dist[i];
      if (v === 0) continue;
      if (x > 0 && dist[i - 1] + 3 < v) v = dist[i - 1] + 3;
      if (y > 0) {
        if (dist[i - W2] + 3 < v) v = dist[i - W2] + 3;
        if (x > 0 && dist[i - W2 - 1] + 4 < v) v = dist[i - W2 - 1] + 4;
        if (x < W2 - 1 && dist[i - W2 + 1] + 4 < v) v = dist[i - W2 + 1] + 4;
      }
      dist[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W2 - 1; x >= 0; x--) {
      const i = y * W2 + x;
      let v = dist[i];
      if (v === 0) continue;
      if (x < W2 - 1 && dist[i + 1] + 3 < v) v = dist[i + 1] + 3;
      if (y < H - 1) {
        if (dist[i + W2] + 3 < v) v = dist[i + W2] + 3;
        if (x < W2 - 1 && dist[i + W2 + 1] + 4 < v) v = dist[i + W2 + 1] + 4;
        if (x > 0 && dist[i + W2 - 1] + 4 < v) v = dist[i + W2 - 1] + 4;
      }
      dist[i] = v;
    }
    return dist;
  };
  const r3 = Math.max(1, closeRadius) * 3;
  const D = new Uint8Array(N);
  {
    const dS0 = chamfer((p) => d[p] >= solidLevel);
    for (let p = 0; p < N; p++) D[p] = dS0[p] <= r3 ? 1 : 0;
  }
  {
    const stack = [];
    const ext = new Uint8Array(N);
    const seed = (p) => {
      if (!D[p] && !ext[p]) {
        ext[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < W2; x++) {
      seed(x);
      seed((H - 1) * W2 + x);
    }
    for (let y = 0; y < H; y++) {
      seed(y * W2);
      seed(y * W2 + W2 - 1);
    }
    while (stack.length) {
      const p = stack.pop(), x = p % W2, y = p / W2 | 0;
      if (x > 0) seed(p - 1);
      if (x < W2 - 1) seed(p + 1);
      if (y > 0) seed(p - W2);
      if (y < H - 1) seed(p + W2);
    }
    for (let p = 0; p < N; p++) if (!D[p] && !ext[p]) D[p] = 1;
  }
  const dComp = chamfer((p) => !D[p]);
  return { d, dComp, r3 };
}

// src/lib/colorKeyExtract.js
var KEY_DEFAULTS = {
  tolerance: 40,
  // 배경으로 간주할 색 거리 (0~160)
  feather: 22,
  // 경계 페더링 폭 (1~120)
  holeSize: 2,
  // 사용자가 명시적으로 복원할 닫힌 영역 최대 크기 (0~100%)
  // 닫힌 배경도 피사체로 복원하는 옵션이라 한글 카운터(ㅇ·ㅁ·ㅂ)를 막을 수 있다.
  // 타이틀/로고의 음각 공간 보존을 위해 기본값은 반드시 false 이다.
  holeProtect: false,
  decontam: true,
  trim: false
};
var clamp255 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
var toRgb = (bg) => {
  if (Array.isArray(bg)) return bg;
  if (typeof bg === "string") {
    const h = bg.replace("#", "");
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const int = parseInt(n, 16);
    if (Number.isNaN(int)) return [0, 0, 0];
    return [int >> 16 & 255, int >> 8 & 255, int & 255];
  }
  return null;
};
function detectBg(d, w, h) {
  const buckets = {};
  const add = (x, y) => {
    const i = (y * w + x) * 4;
    const key = (d[i] >> 3) + "," + (d[i + 1] >> 3) + "," + (d[i + 2] >> 3);
    const bk = buckets[key] = buckets[key] || { n: 0, r: 0, g: 0, b: 0 };
    bk.n++;
    bk.r += d[i];
    bk.g += d[i + 1];
    bk.b += d[i + 2];
  };
  const step = Math.max(1, Math.floor(Math.min(w, h) / 120));
  for (let x = 0; x < w; x += step) {
    add(x, 0);
    add(x, h - 1);
  }
  for (let y = 0; y < h; y += step) {
    add(0, y);
    add(w - 1, y);
  }
  let best = null;
  for (const k in buckets) {
    if (!best || buckets[k].n > best.n) best = buckets[k];
  }
  if (!best) return [0, 0, 0];
  return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
}
function computeFillMask(alphaArr, W2, H, holeSizePct) {
  const N = W2 * H, OPAQUE = 250;
  const exterior = new Uint8Array(N);
  const stack = [];
  const seed = (idx) => {
    if (alphaArr[idx] < OPAQUE && !exterior[idx]) {
      exterior[idx] = 1;
      stack.push(idx);
    }
  };
  for (let x = 0; x < W2; x++) {
    seed(x);
    seed((H - 1) * W2 + x);
  }
  for (let y = 0; y < H; y++) {
    seed(y * W2);
    seed(y * W2 + W2 - 1);
  }
  while (stack.length) {
    const idx = stack.pop(), x = idx % W2, y = idx / W2 | 0;
    if (x > 0) seed(idx - 1);
    if (x < W2 - 1) seed(idx + 1);
    if (y > 0) seed(idx - W2);
    if (y < H - 1) seed(idx + W2);
  }
  const fill = new Uint8Array(N), seen = new Uint8Array(N);
  const maxFill = holeSizePct / 100 * N * 0.6;
  for (let i = 0; i < N; i++) {
    if (alphaArr[i] < OPAQUE && !exterior[i] && !seen[i]) {
      const comp = [], st = [i];
      seen[i] = 1;
      while (st.length) {
        const idx = st.pop();
        comp.push(idx);
        const x = idx % W2, y = idx / W2 | 0;
        if (x > 0 && alphaArr[idx - 1] < OPAQUE && !exterior[idx - 1] && !seen[idx - 1]) {
          seen[idx - 1] = 1;
          st.push(idx - 1);
        }
        if (x < W2 - 1 && alphaArr[idx + 1] < OPAQUE && !exterior[idx + 1] && !seen[idx + 1]) {
          seen[idx + 1] = 1;
          st.push(idx + 1);
        }
        if (y > 0 && alphaArr[idx - W2] < OPAQUE && !exterior[idx - W2] && !seen[idx - W2]) {
          seen[idx - W2] = 1;
          st.push(idx - W2);
        }
        if (y < H - 1 && alphaArr[idx + W2] < OPAQUE && !exterior[idx + W2] && !seen[idx + W2]) {
          seen[idx + W2] = 1;
          st.push(idx + W2);
        }
      }
      if (comp.length <= maxFill) for (const idx of comp) fill[idx] = 1;
    }
  }
  return fill;
}
function extractColorKeyPixels(srcData, { bg, tolerance, feather, holeProtect, holeSize, decontam }) {
  const W2 = srcData.width, H = srcData.height, N = W2 * H;
  const s = srcData.data;
  const [br, bgC, bb] = bg;
  const T = tolerance, S = Math.max(1, feather);
  const alphaArr = new Uint8ClampedArray(N);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const dr = s[i] - br, dg = s[i + 1] - bgC, db = s[i + 2] - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    alphaArr[p] = dist <= T ? 0 : dist >= T + S ? 255 : (dist - T) / S * 255;
  }
  const fill = holeProtect ? computeFillMask(alphaArr, W2, H, holeSize) : null;
  const out = new Uint8ClampedArray(s.length);
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0, restoredPixels = 0;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    let a = s[i + 3] / 255 * alphaArr[p];
    let r = s[i], g = s[i + 1], b = s[i + 2];
    if (fill && fill[p]) {
      a = s[i + 3];
      restoredPixels++;
    } else if (decontam && a >= 8 && a < 255) {
      const af = a / 255, inv = 1 - af;
      r = clamp255((r - inv * br) / af);
      g = clamp255((g - inv * bgC) / af);
      b = clamp255((b - inv * bb) / af);
    }
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = a;
    if (a === 0) transparentPixels++;
    else if (a >= 254) opaquePixels++;
    else partialPixels++;
  }
  return {
    data: out,
    width: W2,
    height: H,
    qa: { transparentPixels, opaquePixels, partialPixels, restoredPixels, totalPixels: N }
  };
}
function alphaTrimBox(o, W2, H) {
  let minX = W2, minY = H, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W2; x++) {
      if (o[(y * W2 + x) * 4 + 3] > 8) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(W2 - 1, maxX + pad);
  maxY = Math.min(H - 1, maxY + pad);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
function cropPixels({ data: data2, width, height }, box) {
  if (!box || box.x === 0 && box.y === 0 && box.w === width && box.h === height) return { data: data2, width, height };
  const out = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    const src = ((box.y + y) * width + box.x) * 4;
    out.set(data2.subarray(src, src + box.w * 4), y * box.w * 4);
  }
  return { data: out, width: box.w, height: box.h };
}

// src/lib/effectExtract.js
var EFFECT_DEFAULTS = { cutoff: 6, gamma: 0.85, opacity: 100, recoverColor: true, trim: false };
var clamp2552 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
function toRgb2(bg) {
  if (Array.isArray(bg)) return bg;
  if (typeof bg === "string") {
    const h = bg.replace("#", "");
    const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const int = parseInt(n, 16);
    if (Number.isNaN(int)) return [0, 0, 0];
    return [int >> 16 & 255, int >> 8 & 255, int & 255];
  }
  return [0, 0, 0];
}
function extractEffectPixels(srcData, { cutoff, gamma, opacity, recoverColor, bg }) {
  const W2 = srcData.width, H = srcData.height, s = srcData.data;
  const o = new Uint8ClampedArray(s.length);
  const threshold = Math.min(0.95, Math.max(0, cutoff / 255));
  const curve = Math.max(0.2, gamma);
  const gain = Math.max(0, opacity / 100);
  const rgb = toRgb2(bg);
  const br = (rgb[0] || 0) / 255, bgr = (rgb[1] || 0) / 255, bb = (rgb[2] || 0) / 255;
  let transparentPixels = 0, opaquePixels = 0, partialPixels = 0;
  let reconstructionError = 0, reconstructionSamples = 0;
  for (let i = 0; i < s.length; i += 4) {
    const sr = s[i] / 255, sg = s[i + 1] / 255, sb = s[i + 2] / 255;
    const d = Math.max(Math.abs(sr - br), Math.abs(sg - bgr), Math.abs(sb - bb));
    let matteAlpha = d <= threshold ? 0 : (d - threshold) / Math.max(1e-3, 1 - threshold);
    matteAlpha = Math.min(1, Math.pow(matteAlpha, curve) * gain);
    const sourceAlpha = s[i + 3] / 255;
    const outputAlpha = matteAlpha * sourceAlpha;
    if (outputAlpha <= 1e-4) {
      o[i] = o[i + 1] = o[i + 2] = o[i + 3] = 0;
      transparentPixels++;
      continue;
    }
    if (recoverColor && matteAlpha >= 8 / 255) {
      o[i] = clamp2552((sr - (1 - matteAlpha) * br) / matteAlpha * 255);
      o[i + 1] = clamp2552((sg - (1 - matteAlpha) * bgr) / matteAlpha * 255);
      o[i + 2] = clamp2552((sb - (1 - matteAlpha) * bb) / matteAlpha * 255);
    } else {
      o[i] = s[i];
      o[i + 1] = s[i + 1];
      o[i + 2] = s[i + 2];
    }
    o[i + 3] = clamp2552(outputAlpha * 255);
    if (o[i + 3] >= 254) opaquePixels++;
    else partialPixels++;
    if (recoverColor) {
      const rr = o[i] / 255 * matteAlpha + (1 - matteAlpha) * br;
      const rg = o[i + 1] / 255 * matteAlpha + (1 - matteAlpha) * bgr;
      const rb = o[i + 2] / 255 * matteAlpha + (1 - matteAlpha) * bb;
      reconstructionError += Math.abs(rr - sr) + Math.abs(rg - sg) + Math.abs(rb - sb);
      reconstructionSamples += 3;
    }
  }
  return {
    data: o,
    width: W2,
    height: H,
    qa: {
      transparentPixels,
      opaquePixels,
      partialPixels,
      totalPixels: W2 * H,
      reconstructionMae: reconstructionSamples ? reconstructionError / reconstructionSamples : 0
    }
  };
}

// src/apps/TypecoreBreeze/constants/presets.js
var staticOptions = {
  base: [{ id: "BlackWhite", name: "\uBE14\uB799 / \uD654\uC774\uD2B8", en: "JET BLACK Background, RADIANT WHITE Subject" }, { id: "WhiteBlack", name: "\uD654\uC774\uD2B8 / \uBE14\uB799", en: "STARK WHITE Background, SOLID BLACK Subject" }],
  ratios: [{ id: "1:1", name: "1:1 \uC815\uBC29\uD615", en: "1:1" }, { id: "16:9", name: "16:9 \uC640\uC774\uB4DC", en: "16:9" }, { id: "2.76:1", name: "\uC2DC\uB124\uB9C8\uD2F1", en: "2.76:1" }],
  occupancies: [
    { id: "30%", name: "30% (\uADF9\uAC15\uC758 \uC5EC\uBC31)", en: "EXTREME SPATIAL ISOLATION." },
    { id: "50%", name: "50% (\uCDA9\uBD84\uD55C \uC5EC\uBC31)", en: "STRICT CENTRAL BUFFER." },
    { id: "70%", name: "70% (\uD45C\uC900/\uAD8C\uC7A5)", en: "Balanced occupancy." },
    { id: "85%", name: "85% (\uACF5\uAC04 \uAC15\uC870)", en: "Dominant scale." },
    { id: "100%", name: "100% (\uAC00\uB4DD \uCC2C \uD615\uD0DC)", en: "MAXIMUM SCALE." }
  ],
  layouts: [
    { id: "1Line", name: "1\uC904 (\uAC00\uB85C)", en: "STRICT SINGLE HORIZONTAL LINE." },
    { id: "2Lines", name: "2\uC904 (\uC801\uCE35)", en: "Two-tier vertical stacked composition." },
    { id: "3Lines", name: "3\uC904 (\uC801\uCE35)", en: "Three-tier vertical stacked composition." }
  ],
  proportions: [
    { id: "P_Condensed", name: "5:10 \uC7A5\uCCB4 (\uBA85\uC2DC \uC120\uD0DD)", en: "Condensed tall-narrow 5:10 ratio" },
    { id: "P_Slim", name: "6:10 \uC7A5\uCCB4 (\uBA85\uC2DC \uC120\uD0DD)", en: "Slim tall-narrow 6:10 ratio" },
    { id: "P_Std", name: "7:10 (\uD45C\uC900)", en: "Standard 7:10 ratio" },
    { id: "P_Wide", name: "8.5:10 (\uB113\uC74C)", en: "Wide 8.5:10 ratio" },
    { id: "P_Extended", name: "12:10 (\uD655\uC7A5)", en: "Extended 12:10 ratio" }
  ],
  // cat — 좌측 카테고리(casual / calli) 필터용. 효과 갤러리가 selectedCategory 로 거른다.
  CasualStyles: [
    { id: "Calli_Brush", name: "\uAC10\uC131 \uBD93\uAE00\uC528 (Brush Calligraphy)", en: "Emotional watercolor brush calligraphy with variable thick-to-thin strokes", cat: "calli" },
    { id: "Calli_Ribbon", name: "\uC6B0\uC544\uD55C \uB9AC\uBCF8 (Elegant Ribbon)", en: "Flowing, elegant script typography resembling swirling ribbons", cat: "calli" },
    { id: "Diary_Pen", name: "\uB2E4\uAFB8 \uD39C\uAE00\uC528 (Diary Pen)", en: "Clean, minimal, cute monoline pen handwriting", cat: "calli" },
    { id: "Calli_Ink", name: "\uC218\uBB35 \uBA39\uAE00\uC528 (Ink Wash)", en: "Traditional East-Asian ink wash brush calligraphy with heavy wet ink bleed, soft tapered tips and meditative spacing", cat: "calli" },
    { id: "Calli_Modern", name: "\uBAA8\uB358 \uCE98\uB9AC (Modern Brush)", en: "Clean modern brush lettering with crisp confident thick-to-thin strokes and a playful bouncing rhythm", cat: "calli" },
    { id: "Calli_DryBrush", name: "\uAC08\uD544 \uB9C8\uB978\uBD93 (Dry Brush)", en: "Rough dry brush calligraphy with frayed, splintered strokes and high-speed friction texture", cat: "calli" },
    { id: "Calli_Marker", name: "\uBE0C\uB7EC\uC2DC \uB9C8\uCEE4 (Brush Marker)", en: "Energetic brush pen marker calligraphy, smooth tapered strokes with playful confident flicks", cat: "calli" },
    { id: "Casual_Bubble", name: "\uB9D0\uB791 \uBC84\uBE14 \uD31D (Bubble Pop)", en: "Chunky, cute, and bouncy bubble letters like balloons", cat: "casual" },
    { id: "Casual_Comic", name: "\uCF54\uBBF9\uBD81 \uD31D (Comic Book)", en: "Dynamic comic book style with bold black outlines and halftone dots", cat: "casual" },
    { id: "Casual_Block", name: "\uBAA8\uB358 \uD31D \uBE14\uB85D (Modern Block)", en: "Clean, straight geometric block lettering for modern sports or tech pop", cat: "casual" },
    { id: "Casual_Marker", name: "\uB9C8\uCE74\uD39C \uAC10\uC131 (Marker Pen)", en: "Round and smooth thick marker pen handwriting", cat: "casual" },
    { id: "Casual_Jelly", name: "\uB9D0\uB791\uB9D0\uB791 \uC824\uB9AC (Slime/Jelly)", en: "Soft, melting, jelly-like casual typographic forms", cat: "casual" },
    { id: "Street_Graffiti", name: "\uD799\uC2A4\uD130 \uADF8\uB798\uD53C\uD2F0 (Graffiti)", en: "Urban hipster street tagging style with sharp fast marker strokes", cat: "casual" },
    { id: "Vintage_Chalk", name: "\uBE48\uD2F0\uC9C0 \uBD84\uD544 (Chalkboard)", en: "Rough, textured vintage chalk lettering aesthetic", cat: "casual" },
    { id: "Casual_RetroChalk", name: "\uB808\uD2B8\uB85C \uD31D \uBD84\uD544 (Retro Chalk)", en: "Playful retro chalkboard lettering with dusty, rough chalk textures and bouncy baseline", cat: "casual" },
    { id: "Casual_Variety", name: "\uC608\uB2A5/\uC720\uD29C\uBE0C \uD31D (Variety Pop)", en: "K-variety show title style with 3D pop and thick sticker outlines", cat: "casual" },
    { id: "Casual_Emblem", name: "\uC2A4\uD3EC\uCE20 \uC5E0\uBE14\uB7FC (Sports Emblem)", en: "College sports team emblem style with arch and ribbon banners", cat: "casual" },
    { id: "Casual_Racing", name: "\uB808\uC774\uC2F1/\uC2A4\uD53C\uB4DC (Racing Action)", en: "Dynamic racing game title with high speed slant and sliced strokes", cat: "casual" },
    { id: "Casual_Idol", name: "\uC544\uC774\uB3CC/\uD558\uC774\uD2F4 (Idol Pop)", en: "Soft, clean, elegant and cute pastel idol group logo typography", cat: "casual" },
    { id: "Casual_Grunge", name: "\uAC70\uCE5C \uC601\uD654 \uD0C0\uC774\uD2C0 (Grunge Movie)", en: "Aggressive action thriller title with heavy grunge distressed textures", cat: "casual" },
    { id: "Casual_StencilBlock", name: "\uC2A4\uD150\uC2E4 \uBE14\uB85D (Stencil Block)", en: "Bold geometric stencil block lettering with hard right-angle corners, heavy condensed solid strokes, thick chunky mass, modern stamped block forms with sharp flat terminals", cat: "casual" },
    { id: "Story_IntimateMonoline", name: "\uC778\uD2F0\uBA54\uC774\uD2B8 \uBAA8\uB178\uB77C\uC778", en: "restrained Korean monoline drama title, intimate human-scale handwriting, quiet editorial spacing, clean single-color silhouette", cat: "story", narrative: true },
    { id: "Story_PoeticBrush", name: "\uD3EC\uC5D0\uD2F1 \uBE0C\uB7EC\uC2DC", en: "restrained poetic Korean brush title, measured pressure contrast, calm literary rhythm, clean edges without ink texture", cat: "story", narrative: true },
    { id: "Story_WarmImperfect", name: "\uC6DC \uC784\uD37C\uD399\uD2B8", en: "warm Korean human-drama title, subtly imperfect hand-shaped strokes, calm baseline, understated emotional character", cat: "story", narrative: true },
    { id: "Story_YouthDiary", name: "\uC720\uC2A4 \uB2E4\uC774\uC5B4\uB9AC", en: "contemporary Korean coming-of-age diary title, neat light handwriting, restrained youthful irregularity, generous negative space", cat: "story", narrative: true },
    { id: "Story_DryComedy", name: "\uB4DC\uB77C\uC774 \uCF54\uBBF8\uB514", en: "deadpan Korean comedy-drama title, neutral monoline skeleton, one quietly awkward structural detail, controlled spacing", cat: "story", narrative: true }
  ],
  InternalDecorations: [{ id: "Solid", name: "\uAF49 \uCC2C \uB2E8\uC0C9", en: "Solid filled internal mass" }, { id: "Hatched", name: "\uC2A4\uCF00\uCE58 \uBE57\uAE08", en: "Hand-drawn hatched sketch lines inside" }, { id: "Hatched_Chalk", name: "\uAC70\uCE5C \uBD84\uD544 \uBE57\uAE08", en: "rough chalk hatched shading inside" }, { id: "PolkaDots", name: "\uCF54\uBBF9 \uD558\uD504\uD1A4 \uB3C4\uD2B8", en: "Comic book pop-art halftone dots inside" }, { id: "Highlight", name: "\uBC18\uC9DD\uC784/\uAE00\uB85C\uC2DC", en: "Cartoonish glossy highlights and reflections" }, { id: "Extruded3D", name: "3D \uC785\uCCB4/\uADF8\uB9BC\uC790", en: "Thick 3D extruded block depth and heavy drop shadow" }, { id: "StickerBorder", name: "\uC2A4\uD2F0\uCEE4 \uCEF7\uC544\uC6C3 \uD14C\uB450\uB9AC", en: "Thick, bold white sticker cut-out border surrounding the text" }],
  TextFlows: [{ id: "Straight", name: "\uB2E8\uC815\uD558\uAC8C (\uC218\uD3C9)", en: "Straight horizontal baseline" }, { id: "Bouncy", name: "\uD1B5\uD1B5 \uD280\uB294 \uB9AC\uB4EC\uAC10", en: "Bouncy, playful baseline with alternating letter heights" }, { id: "Wave", name: "\uBB3C\uACB0 \uCE58\uB4EF", en: "Flowing wave-like baseline" }, { id: "Arch", name: "\uC544\uCE58\uD615", en: "Playful arching baseline" }],
  LetterConnections: [{ id: "Separated", name: "\uAC1C\uBCC4 \uBD84\uB9AC", en: "Clearly separated individual characters" }, { id: "CursiveFlow", name: "\uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC774\uC5B4\uC4F0\uAE30", en: "Organic cursive flow, characters seamlessly connecting" }, { id: "Overlapping", name: "\uCE90\uC8FC\uC5BC\uD55C \uACB9\uCE68", en: "Playful overlapping of letters, squished together" }],
  CasualSurroundings: [{ id: "Clean", name: "\uC5C6\uC74C", en: "Clean background" }, { id: "Sparkles", name: "\uBC18\uC9DD\uC774\uC640 \uBCC4\uC870\uAC01", en: "Decorated with cute sparkles, stars, and twinkles" }, { id: "Splatter", name: "\uC789\uD06C/\uBB3C\uBC29\uC6B8 \uD280\uAE40", en: "Artistic ink splatters and cute paint drops" }, { id: "HeartsClouds", name: "\uD558\uD2B8\uC640 \uB465\uADFC \uAD6C\uB984", en: "Surrounded by minimal cute hearts and fluffy clouds" }, { id: "SpeedLines", name: "\uC2A4\uD53C\uB4DC \uB77C\uC778/\uBAA8\uC158", en: "Dynamic speed lines and motion blur effects shooting from the letters" }, { id: "RibbonBanner", name: "\uD558\uB2E8 \uC5E0\uBE14\uB7FC \uB9AC\uBCF8", en: "A bold sports/collegiate ribbon banner framing the bottom" }, { id: "IconicLineArt", name: "\uD3EC\uC778\uD2B8 \uB77C\uC778\uC544\uD2B8 \uC544\uC774\uCF58", en: "Integrated playful line-art icons attached to strokes" }],
  strokeWeights: [{ id: "Weight_Thin", name: "\uC587\uC740 \uBAA8\uB178\uB77C\uC778", en: "thin consistent monoline pen strokes" }, { id: "Weight_Brush", name: "\uAC00\uBCC0\uC801\uC778 \uBD93\uD544\uC555", en: "variable pressure brush strokes (thick downstrokes, thin upstrokes)" }, { id: "Weight_Chunky", name: "\uB450\uD23C\uD55C \uBCFC\uB968\uAC10", en: "chunky, thick, fat stroke mass" }, { id: "Weight_Marker", name: "\uAD75\uC9C1\uD55C \uB9C8\uCE74\uD39C", en: "bold, uniform marker pen thickness" }],
  kerningOptions: [{ id: "Kern_Wide", name: "\uB113\uC740 \uC790\uAC04", en: "airy, relaxed wide letter spacing" }, { id: "Kern_Std", name: "\uD45C\uC900 \uC790\uAC04", en: "standard comfortable kerning" }, { id: "Kern_Tight", name: "\uC624\uBC00\uC870\uBC00\uD558\uAC8C", en: "tight, cozy, and playful squished kerning" }],
  strokeEnds: [{ id: "End_Round", name: "\uB465\uAE00\uACE0 \uADC0\uC5FD\uAC8C", en: "softly rounded, friendly terminals" }, { id: "End_Block", name: "\uB2E8\uB2E8\uD558\uACE0 \uC9C1\uC120\uC73C\uB85C", en: "solid, straight, sharp geometric flat terminals" }, { id: "End_Brush", name: "\uB0A0\uCE74\uB85C\uC6B4 \uBD93\uB05D", en: "tapered, sharp brush tips" }, { id: "End_Blunt", name: "\uBB49\uD22D\uD55C \uB9C8\uCE74", en: "blunt, flat marker cut terminals" }, { id: "End_Swash", name: "\uD654\uB824\uD55C \uC2A4\uC6CC\uC2DC", en: "decorative, elegant curly swash terminals" }],
  strokeTextures: [{ id: "Tex_Smooth", name: "\uAE54\uB054\uD55C \uBCA1\uD130", en: "perfectly smooth, crisp vector edges" }, { id: "Tex_Watercolor", name: "\uC218\uCC44\uD654 \uBC88\uC9D0", en: "soft watercolor ink bleed and organic texture" }, { id: "Tex_Chalk", name: "\uAC70\uCE5C \uD06C\uB808\uC6A9/\uBD84\uD544", en: "rough, dry chalk or crayon texture" }, { id: "Tex_DustyChalk", name: "\uD769\uB0A0\uB9AC\uB294 \uBD84\uD544 \uAC00\uB8E8", en: "dusty, scattered chalk powder texture" }, { id: "Tex_Grunge", name: "\uC2A4\uD06C\uB798\uCE58/\uD30C\uD3B8 (Grunge)", en: "Rough, distressed grunge texture with scratches and battle damage" }],
  strokeSharpness: [{ id: "Sharp_Soft", name: "\uB9D0\uB791\uB9D0\uB791\uD55C \uD14C\uB450\uB9AC", en: "soft, chewy, slightly rounded micro-edges" }, { id: "Sharp_Crisp", name: "\uC120\uBA85\uD558\uACE0 \uCA0D\uD558\uAC8C", en: "crisp, sharp, perfectly defined edges" }],
  strokeExtensions: [{ id: "Ext_None", name: "\uC7A5\uC2DD \uC5C6\uC74C", en: "contained, simple strokes" }, { id: "Ext_Playful", name: "\uC7A5\uB09C\uC2A4\uB7EC\uC6B4 \uAF2C\uB9AC", en: "playful, curly extending stroke tails" }, { id: "Ext_Elegant", name: "\uC6B0\uC544\uD55C \uD50C\uB85C\uB9AC\uC2DC", en: "elaborate, elegant calligraphic flourishes" }],
  rhythmDynamics: [{ id: "Rhythm_Calm", name: "\uCC28\uBD84\uD55C \uC815\uB82C", en: "calm, stable, well-aligned rhythm" }, { id: "Rhythm_Bouncy", name: "\uD1B5\uD1B5 \uD280\uB294 \uC990\uAC70\uC6C0", en: "joyful, bouncing kinetic rhythm" }, { id: "Rhythm_Fast", name: "\uBE60\uB978 \uD758\uB9BC\uCCB4 \uC18D\uB3C4\uAC10", en: "fast, energetic sweeping motion" }],
  slantAngles: [{ id: "Slant_0", name: "\uAE30\uC6B8\uAE30 \uC5C6\uC74C (0\uB3C4)", en: "perfectly upright verticality" }, { id: "Slant_Casual", name: "\uCE90\uC8FC\uC5BC\uD55C \uAE30\uC6B8\uAE30 (10\uB3C4)", en: "casual, playful 10-degree forward slant" }, { id: "Slant_Italic", name: "\uB0A0\uB835\uD55C \uD544\uAE30\uCCB4 (20\uB3C4)", en: "aggressive 20-degree italic slant" }],
  playfulDistortions: [{ id: "Distort_None", name: "\uBCC0\uD615 \uC5C6\uC74C", en: "perfectly intact, geometric shapes" }, { id: "Distort_Squeeze", name: "\uC0B4\uC9DD \uCC0C\uADF8\uB7EC\uC9D0", en: "cute, slightly squeezed and squished playful distortion" }, { id: "Distort_Jelly", name: "\uC824\uB9AC \uAC19\uC740 \uCD9C\uB801\uC784", en: "organic, wobbly jelly-like form distortion" }, { id: "Distort_SpeedCut", name: "\uC0AC\uC120 \uC2A4\uD53C\uB4DC \uC808\uB2E8", en: "Aggressive diagonal slices and speed cuts through the letterforms" }],
  analogImperfections: [{ id: "Imp_None", name: "\uC644\uBCBD\uD558\uAC8C \uAE68\uB057\uD568", en: "pristine, flawless digital vector form" }, { id: "Imp_Bleed", name: "\uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC789\uD06C \uBC88\uC9D0", en: "organic handwritten ink bleed and pooling" }, { id: "Imp_RoughEdge", name: "\uC544\uB0A0\uB85C\uADF8 \uC885\uC774 \uC9C8\uAC10", en: "subtle, rough paper texture edges" }, { id: "Imp_ChalkSmudge", name: "\uBD84\uD544 \uC9C0\uC6CC\uC9D0/\uBB38\uC9C8\uB7EC\uC9D0", en: "smudged and partially erased chalk marks" }],
  widths: [{ id: "Narrow", name: "\uC881\uAC8C", en: "condensed slim width" }, { id: "Normal", name: "\uD45C\uC900", en: "standard balanced width" }, { id: "Wide", name: "\uB113\uACE0 \uC2DC\uC6D0\uD558\uAC8C", en: "wide, airy expansive width" }]
};
var getOptionEn = (list, id) => {
  if (!Array.isArray(list)) return "";
  const found = list.find((o) => o.id === id);
  return found?.en_desc || found?.en || found?.name || "";
};
var getOptionName = (list, id) => {
  if (!Array.isArray(list)) return "";
  const found = list.find((o) => o.id === id);
  return found?.name || "";
};

// src/apps/TypecoreBreeze/constants/categoriesData.js
var directorPersonas = [
  { id: "bubble_pop", category: "casual", iconKey: "Smile", shortTitle: "\uB9D0\uB791 \uC824\uB9AC/\uD050\uD2B8 \uD31D", subtitle: "\uD1B5\uD1B5 \uD280\uB294 \uBC14\uC6B4\uC2A4\uC640 \uC824\uB9AC \uBCFC\uB968\uAC10", role: "\uB108\uB294 \uB300\uC911\uC801\uC774\uACE0 \uADC0\uC5EC\uC6B4 \uB9E4\uB825\uC744 \uB4EC\uBFCD \uB2F4\uC740 '\uCE90\uC8FC\uC5BC \uD31D\uC544\uD2B8 \uD06C\uB9AC\uC5D0\uC774\uD130'\uC57C. \uB0A0\uCE74\uB85C\uC6B4 \uBAA8\uC11C\uB9AC\uB97C \uBC30\uC81C\uD558\uACE0 \uB9D0\uB791\uD558\uAC8C \uB179\uC544\uB0B4\uB9AC\uB294 \uC824\uB9AC\uB098 \uD1B5\uD1B5\uD55C \uD48D\uC120\uCC98\uB7FC \uAE00\uC790\uB97C \uB514\uC790\uC778\uD574.", keywords: "Bouncy bubble letters, chewy jelly shapes, soft rounded corners, playful height variations, kawaii pastel pop sticker", tone: "[\uBC1C\uB784\uD558\uACE0 \uC5D0\uB108\uC9C0 \uB118\uCE58\uB294] \uD1A1\uD1A1 \uD280\uB294 \uC544\uC774\uB514\uC5B4\uC640 \uACBD\uCF8C\uD55C \uB9AC\uB4EC\uAC10\uC744 \uAC15\uC870\uD558\uB294 \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Focus on friendly, bouncy, and playful bubble shapes. Eliminate all sharp corners and apply dynamic bouncing rhythms." },
  { id: "comic_artist", category: "casual", iconKey: "MessageSquare", shortTitle: "\uB9CC\uD654/\uCF54\uBBF9\uBD81 \uD31D", subtitle: "\uAD75\uC740 \uC544\uC6C3\uB77C\uC778\uACFC \uD558\uD504\uD1A4 \uB3C4\uD2B8", role: "\uB108\uB294 \uC5ED\uB3D9\uC801\uC774\uACE0 \uD31D\uD55C \uB9CC\uD654\uCC45 \uD0C0\uC774\uD2C0\uC744 \uADF8\uB9AC\uB294 '\uCF54\uBBF9\uBD81 \uC544\uD2F0\uC2A4\uD2B8'\uC57C. \uAE00\uC790 \uC678\uACFD\uC5D0 \uAD75\uACE0 \uC120\uBA85\uD55C \uAE4C\uB9CC \uD14C\uB450\uB9AC\uB97C \uB450\uB974\uACE0, \uB0B4\uBD80\uB294 \uB9DD\uC810\uC774\uB098 \uC2A4\uD53C\uB4DC \uB77C\uC778\uC73C\uB85C \uCC44\uC6CC.", keywords: "Comic book pop art, bold black outlines, halftone dot patterns, dynamic cartoon energy, speech bubble typography, 2D illustration", tone: "[\uACBD\uCF8C\uD558\uACE0 \uB9CC\uD654\uC801\uC778] \uC561\uC158 \uB9CC\uD654\uC758 \uD55C \uCEF7\uC744 \uBB18\uC0AC\uD558\uB4EF \uACFC\uC7A5\uB418\uACE0 \uC720\uCF8C\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Emphasize 2D comic book styles. Use bold black outlines, pop-art halftone dots, and expressive cartoon-like deformations." },
  { id: "block_architect", category: "casual", iconKey: "Box", shortTitle: "\uC9C1\uC120/\uBAA8\uB358 \uBE14\uB85D", subtitle: "\uB2E8\uB2E8\uD558\uACE0 \uAD75\uC740 \uC9C1\uC120\uC758 \uC2E0\uB8B0\uAC10", role: "\uB108\uB294 \uAE54\uB054\uD558\uBA74\uC11C\uB3C4 \uC784\uD329\uD2B8 \uC788\uB294 \uD615\uD0DC\uB97C \uC124\uACC4\uD558\uB294 '\uBAA8\uB358 \uBE14\uB85D \uC544\uD0A4\uD14D\uD2B8'\uC57C. \uADC0\uC5EC\uC6B4 \uACE1\uC120\uBCF4\uB2E4\uB294 \uB2E8\uB2E8\uD558\uACE0 \uAD75\uC740 \uC9C1\uC120, \uB450\uD23C\uD55C \uB369\uC5B4\uB9AC\uAC10\uC744 \uD65C\uC6A9\uD574.", keywords: "Straight geometric blocks, thick chunky layout, college sports emblem, modern clean pop, solid flat graphics, architectural letters", tone: "[\uB2E8\uB2E8\uD558\uACE0 \uBA85\uD655\uD55C] \uD754\uB4E4\uB9BC \uC5C6\uC774 \uD2BC\uD2BC\uD55C \uAC74\uCD95\uBB3C\uC744 \uC124\uBA85\uD558\uB4EF \uAE54\uB054\uD558\uACE0 \uC2E0\uB8B0\uAC10 \uC788\uB294 \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Use straight, thick, blocky geometric letterforms. Avoid soft jelly curves and focus on solid, modern, and clean flat typography." },
  { id: "variety_director", category: "casual", iconKey: "Clapperboard", shortTitle: "\uC608\uB2A5/\uC378\uB124\uC77C \uD31D\uC5C5", subtitle: "\uC555\uB3C4\uC801\uC778 \uC2DC\uC778\uC131\uACFC 3D \uC785\uCCB4 \uD14C\uB450\uB9AC", role: "\uB108\uB294 \uC608\uB2A5 \uD504\uB85C\uADF8\uB7A8 \uD0C0\uC774\uD2C0\uC774\uB098 \uC720\uD29C\uBE0C \uC378\uB124\uC77C\uC744 \uB514\uC790\uC778\uD558\uB294 '\uBC29\uC1A1 \uD0C0\uC774\uD2C0 \uB514\uB809\uD130'\uC57C. \uD654\uBA74 \uBC16\uC73C\uB85C \uD280\uC5B4\uB098\uC62C \uB4EF\uD55C 3D \uC785\uCCB4\uAC10, \uC544\uC8FC \uB450\uAECD\uACE0 \uBA85\uD655\uD55C \uC2A4\uD2F0\uCEE4 \uD14C\uB450\uB9AC\uB97C \uD65C\uC6A9\uD574.", keywords: "K-variety show title, YouTube thumbnail pop, thick sticker border cut-out, 3D extruded shadow, bold high impact legibility", tone: "[\uC8FC\uBAA9\uB3C4 \uB192\uACE0 \uC9C1\uAD00\uC801\uC778] \uC2DC\uC120\uC744 \uB2E8\uBC88\uC5D0 \uC0AC\uB85C\uC7A1\uB294 \uBC29\uC1A1\uAD6D \uC790\uB9C9\uCC98\uB7FC \uD150\uC158 \uB192\uACE0 \uC2DC\uC6D0\uC2DC\uC6D0\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Prioritize extreme legibility and pop impact. Use very thick sticker borders and 3D extruded drop shadows for a variety show vibe." },
  { id: "action_retro", category: "casual", iconKey: "FastForward", shortTitle: "\uC2A4\uD53C\uB4DC/\uC561\uC158 \uB808\uD2B8\uB85C", subtitle: "\uAC15\uB82C\uD55C \uC18D\uB3C4\uAC10\uACFC \uD799\uC2A4\uD130 \uC2A4\uD2B8\uB9BF \uD14D\uC2A4\uCC98", role: "\uB108\uB294 \uC544\uCF00\uC774\uB4DC \uB808\uD2B8\uB85C \uAC10\uC131\uC774\uB098 \uC5ED\uB3D9\uC801\uC778 \uC561\uC158\uC744 \uD45C\uD604\uD558\uB294 '\uC561\uC158 & \uB808\uD2B8\uB85C \uB514\uB809\uD130'\uC57C. \uAC70\uCE5C \uC2A4\uD06C\uB798\uCE58 \uD14D\uC2A4\uCC98, \uADF8\uB798\uD53C\uD2F0 \uB9C8\uCEE4\uD39C\uC758 \uD754\uC801, \uC0AC\uC120 \uC808\uB2E8\uBA74\uC744 \uD65C\uC6A9\uD574.", keywords: "Dynamic racing speed, heavy grunge texture, retro arcade blocky shapes, sliced tension, urban street graffiti marker", tone: "[\uAC15\uB82C\uD558\uACE0 \uC5ED\uB3D9\uC801\uC778] \uC544\uB4DC\uB808\uB0A0\uB9B0\uC774 \uC19F\uAD6C\uCE58\uB4EF \uC18D\uB3C4\uAC10 \uC788\uACE0 \uD30C\uC6CC\uD480\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Inject high momentum or raw street energy. Use aggressive italic slants, speed cuts, chunky retro blocks, or heavy grunge/marker textures." },
  { id: "idol_trendsetter", category: "casual", iconKey: "Star", shortTitle: "\uC544\uC774\uB3CC/Y2K \uD31D", subtitle: "\uC0AC\uC774\uBC84\uD2F1 \uBC18\uC9DD\uC784\uACFC \uC138\uB828\uB41C \uD558\uC774\uD2F4 \uAC10\uC131", role: "\uB108\uB294 \uC138\uAE30\uB9D0\uC758 \uD654\uB824\uD568\uACFC K-Pop \uC544\uC774\uB3CC \uAC10\uC131\uC744 \uC0AC\uB791\uD558\uB294 'Y2K \uD2B8\uB80C\uB4DC\uC138\uD130'\uC57C. \uBA54\uD0C8\uB9AD\uD55C \uC9C8\uAC10, \uC601\uB871\uD558\uAC8C \uBE5B\uB098\uB294 \uBCC4\uC870\uAC01 \uC7A5\uC2DD, \uC587\uACE0 \uC138\uB828\uB41C \uC120\uC744 \uD65C\uC6A9\uD574.", keywords: "Y2K aesthetic, K-Pop idol logo, cyber metallic shine, retro futuristic, nostalgic teen pop, sparkly stars, elegant clean pop", tone: "[\uD654\uB824\uD558\uACE0 \uD2B8\uB80C\uB514\uD55C] \uD328\uC158 \uB9E4\uAC70\uC9C4\uCC98\uB7FC \uAC10\uAC01\uC801\uC774\uACE0 \uC138\uB828\uB41C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Emphasize 2000s Y2K or modern K-Pop aesthetics. Use clean lines, sparkling stars, glossy cyber textures, and a trendy high-teen vibe." },
  { id: "ink_master", category: "calli", iconKey: "Feather", shortTitle: "\uC218\uBB35/\uBD93\uAE00\uC528 \uC7A5\uC778", subtitle: "\uC544\uB0A0\uB85C\uADF8 \uD544\uC555\uACFC \uBA39 \uBC88\uC9D0\uC758 \uBBF8\uD559", role: "\uB108\uB294 \uC885\uC774\uC640 \uBD93\uC758 \uB9C8\uCC30, \uADF8\uB9AC\uACE0 \uBA39\uC774 \uBC88\uC9C0\uB294 \uBB3C\uC131\uC744 \uC870\uD615\uC73C\uB85C \uC2B9\uD654\uC2DC\uD0A4\uB294 '\uBD93\uAE00\uC528 \uC7A5\uC778'\uC774\uC57C.", keywords: "Emotional brush calligraphy, variable stroke pressure, wet ink bleed, traditional or modern elegant sweeps, human touch", tone: "[\uB530\uB73B\uD558\uACE0 \uC11C\uC815\uC801\uC778] \uBD93\uB05D\uC5D0\uC11C \uD53C\uC5B4\uB098\uB294 \uAC10\uC815\uACFC \uBA39\uBB3C\uC758 \uD750\uB984\uC744 \uC2DC\uC801\uC73C\uB85C \uC11C\uC220\uD558\uB77C.", instructionRule: "- Rule: Emphasize variable brush pressure (thick downstrokes, thin upstrokes) and organic, analogue ink bleeding textures." },
  { id: "monoline_crafter", category: "calli", iconKey: "PenTool", shortTitle: "\uB2E4\uAFB8/\uD39C\uAE00\uC528 \uC791\uAC00", subtitle: "\uC815\uAC08\uD558\uACE0 \uC77C\uC815\uD55C \uB450\uAED8\uC758 \uB2F4\uBC31\uD568", role: "\uB108\uB294 \uC77C\uC815\uD55C \uAD75\uAE30\uC758 \uD39C\uCD09\uC73C\uB85C \uC18C\uBC15\uD558\uACE0 \uAE54\uB054\uD55C \uAC10\uC131\uC744 \uB9CC\uB4E4\uC5B4\uB0B4\uB294 '\uD39C\uAE00\uC528 \uC791\uAC00'\uC57C.", keywords: "Clean monoline pen, neat handwritten script, minimalist diary aesthetic, uniform stroke thickness, cozy and simple vector", tone: "[\uCC28\uBD84\uD558\uACE0 \uC815\uAC08\uD55C] \uACFC\uC7A5 \uC5C6\uC774 \uB2F4\uBC31\uD558\uACE0 \uAE68\uB057\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Keep it clean, neat, and highly legible. Emphasize uniform monoline purity, minimal fuss, and a cozy layout." },
  { id: "flourish_artist", category: "calli", iconKey: "Edit2", shortTitle: "\uB9AC\uBCF8 \uC2A4\uD06C\uB9BD\uD2B8 \uC791\uAC00", subtitle: "\uD654\uB824\uD55C \uAF2C\uB9AC\uC640 \uC5F0\uC18D\uC801\uC778 \uACE1\uC120\uBBF8", role: "\uB108\uB294 \uAE00\uC790\uC640 \uAE00\uC790\uAC00 \uC720\uB824\uD558\uAC8C \uC774\uC5B4\uC9C0\uB294 \uACE1\uC120\uBBF8\uB97C \uADF9\uD55C\uC73C\uB85C \uB2E4\uB8E8\uB294 '\uB9AC\uBCF8 \uC2A4\uD06C\uB9BD\uD2B8 \uC791\uAC00'\uC57C.", keywords: "Elegant cursive script, decorative calligraphic flourishes, continuous ribbon flow, sophisticated swashes, graceful curves", tone: "[\uC6B0\uC544\uD558\uACE0 \uD654\uB824\uD55C] \uC815\uAD50\uD55C \uB4DC\uB85C\uC789\uC744 \uC124\uBA85\uD558\uB4EF \uB9E4\uB044\uB7FD\uACE0 \uC6B0\uC544\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Maximize elegant ligatures, decorative swashes on terminals, and continuous flowing ribbon-like connections between letters." },
  { id: "narrative_editor", category: "story", iconKey: "Type", shortTitle: "\uB4DC\uB77C\uB9C8 \uD0C0\uC774\uD2C0 \uC5D0\uB514\uD130", subtitle: "\uC911\uB9BD\uC801\uC778 \uAE00\uC790\uC5D0 \uC11C\uC0AC \uB2E8\uC11C \uD558\uB098", role: "\uB108\uB294 \uC601\uD654\uC640 \uB4DC\uB77C\uB9C8 \uD0A4\uBE44\uC8FC\uC5BC\uC744 \uBC29\uD574\uD558\uC9C0 \uC54A\uC73C\uBA74\uC11C \uAE00\uC790 \uAD6C\uC870 \uC548\uC5D0 \uC791\uD488\uC758 \uB2E8\uC11C \uD558\uB098\uB97C \uC228\uAE30\uB294 \uD3B8\uC9D1 \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uB514\uB809\uD130\uC57C.", keywords: "Restrained editorial title, neutral Korean letterforms, one narrative glyph intervention, disciplined negative space, monochrome silhouette", tone: "[\uC870\uC6A9\uD558\uACE0 \uC815\uD655\uD55C] \uAC10\uC815\uC744 \uACFC\uC7A5\uD558\uC9C0 \uC54A\uACE0 \uAD6C\uC870\uC640 \uC5EC\uBC31\uC73C\uB85C \uC124\uBA85\uD558\uB77C.", instructionRule: "- Rule: Keep 85-95% of the title neutral. Apply exactly one subtle narrative cue to one or two glyphs. Never use surrounding decoration, literal icons, textures, outlines, shadows, or 3D." }
];
var getSliderText = (val) => {
  if (val < 35) return `[INTENSITY]: Restrained, calm execution of the selected persona \u2014 gentle emphasis, minimal exaggeration.`;
  if (val > 65) return `[INTENSITY]: Bold, exaggerated execution of the selected persona \u2014 maximum emphasis on its signature traits.`;
  return `[INTENSITY]: Standard execution of the selected persona \u2014 its signature traits applied at full but not exaggerated.`;
};

// src/lib/narrativeTypography.js
var NARRATIVE_INTENSITIES = [
  { id: "off", name: "0 \xB7 \uAE30\uBCF8\uD615", budget: "0%", readability: "100%", maxGlyphs: 0 },
  { id: "subtle", name: "1 \xB7 \uBBF8\uC138", budget: "5-8%", readability: "92%", maxGlyphs: 1 },
  { id: "restrained", name: "2 \xB7 \uC808\uC81C", budget: "8-12%", readability: "88%", maxGlyphs: 2 },
  { id: "accent", name: "3 \xB7 \uAC15\uC870", budget: "12-15%", readability: "85%", maxGlyphs: 2 }
];
var NARRATIVE_SCOPES = [
  { id: "one", name: "\uD55C \uAE00\uC790", en: "exactly one syllable or glyph" },
  { id: "two", name: "\uCD5C\uB300 \uB450 \uAE00\uC790", en: "no more than two syllables or glyphs" },
  { id: "rhythm", name: "\uC804\uCCB4 \uB9AC\uB4EC", en: "the global spacing or baseline rhythm without redrawing individual glyphs" }
];
var NARRATIVE_MUTATIONS = [
  { id: "auto", name: "\uCF58\uC149\uD2B8 \uC790\uB3D9", en: "choose one restrained structural cue that best expresses the supplied story or emotional direction" },
  { id: "counter", name: "\uB0B4\uBD80 \uC5EC\uBC31", en: "reshape or narrow one internal counter or negative-space aperture" },
  { id: "terminal", name: "\uD68D \uB05D", en: "alter one terminal, serif, or stroke ending" },
  { id: "cut", name: "\uBBF8\uC138 \uC808\uB2E8", en: "introduce one small, clean structural cut without fragmenting the character" },
  { id: "connection", name: "\uD68D \uC5F0\uACB0", en: "create or release one subtle connection between neighboring strokes or glyphs" },
  { id: "proportion", name: "\uAD6D\uC18C \uBE44\uB840", en: "slightly compress or extend one selected glyph while preserving its skeleton" },
  { id: "baseline", name: "\uAE30\uC900\uC120", en: "apply a restrained spacing or baseline displacement as the single narrative cue" }
];
var findById = (items, id, fallbackId) => items.find((item) => item.id === id) || items.find((item) => item.id === fallbackId) || items[0];
function buildNarrativeDirective({
  active = false,
  intensity = "subtle",
  scope = "one",
  mutation = "auto",
  target = ""
} = {}) {
  if (!active) {
    return {
      active: false,
      en: "",
      ko: "",
      budget: "0%",
      readability: "100%",
      allowed: "None",
      forbidden: "Any narrative mutation"
    };
  }
  const intensityOption = findById(NARRATIVE_INTENSITIES, intensity, "subtle");
  const scopeOption = findById(NARRATIVE_SCOPES, scope, "one");
  const mutationOption = findById(NARRATIVE_MUTATIONS, mutation, "auto");
  if (intensityOption.id === "off") {
    return {
      active: true,
      en: `[NARRATIVE MINIMAL MODE \u2014 BASE ONLY]
- Use a restrained, neutral editorial title with disciplined negative space.
- Do not apply a story mutation. Preserve every glyph as a clean, conventional, highly legible silhouette.
- No surrounding symbols, particles, frames, textures, outlines, shadows, glow, gradients, materials, or 3D effects.`,
      ko: `[\uB0B4\uB7EC\uD2F0\uBE0C \uBBF8\uB2C8\uBA40 \uBAA8\uB4DC \u2014 \uAE30\uBCF8\uD615]
- \uC808\uC81C\uB41C \uC911\uB9BD \uD3B8\uC9D1 \uD0C0\uC774\uD2C0\uACFC \uCDA9\uBD84\uD55C \uC5EC\uBC31\uB9CC \uC801\uC6A9\uD569\uB2C8\uB2E4.
- \uC11C\uC0AC \uBCC0\uD615\uC744 \uC801\uC6A9\uD558\uC9C0 \uC54A\uACE0 \uBAA8\uB4E0 \uAE00\uC790\uB97C \uAD00\uC2B5\uC801\uC774\uBA70 \uBA85\uD655\uD55C \uC2E4\uB8E8\uC5E3\uC73C\uB85C \uC720\uC9C0\uD569\uB2C8\uB2E4.
- \uC8FC\uBCC0 \uC2EC\uBCFC\xB7\uD30C\uD2F0\uD074\xB7\uD504\uB808\uC784\xB7\uC9C8\uAC10\xB7\uC678\uACFD\uC120\xB7\uADF8\uB9BC\uC790\xB7\uAE00\uB85C\uC6B0\xB7\uADF8\uB77C\uB514\uC5B8\uD2B8\xB7\uC7AC\uC9C8\xB73D\uB97C \uAE08\uC9C0\uD569\uB2C8\uB2E4.`,
      budget: "0%",
      readability: "100%",
      allowed: "Optical spacing and balance only",
      forbidden: "Any glyph mutation, literal icon, texture, surrounding decoration, or readability loss"
    };
  }
  const targetText = (target || "").trim();
  const targetEn = targetText ? `Apply the cue only to the exact target "${targetText}".` : `Select the most semantically useful target automatically, but limit the intervention to ${scopeOption.en}.`;
  const targetKo = targetText ? `\uC815\uD655\uD55C \uB300\uC0C1 "${targetText}"\uC5D0\uB9CC \uB2E8\uC11C\uB97C \uC801\uC6A9\uD569\uB2C8\uB2E4.` : `\uC758\uBBF8\uC0C1 \uAC00\uC7A5 \uC801\uC808\uD55C \uB300\uC0C1\uC744 \uC790\uB3D9 \uC120\uD0DD\uD558\uB418 \uBC94\uC704\uB294 ${scopeOption.name}\uB85C \uC81C\uD55C\uD569\uB2C8\uB2E4.`;
  const en = `[NARRATIVE MINIMAL MODE]
- Keep 85-95% of the title neutral, editorial, and visually quiet.
- Express the story with exactly one structural idea: ${mutationOption.en}.
- ${targetEn}
- Mutation budget: ${intensityOption.budget}; readability floor: ${intensityOption.readability}.
- Preserve every Hangul syllable block and jamo. The title must read correctly before the concept cue is noticed.
- Use silhouette, spacing, terminals, connections, or negative space only. Do not insert literal illustrations or replace a glyph with an object.
- No surrounding symbols, particles, frames, textures, outlines, shadows, glow, gradients, materials, or 3D effects.
- If the creative direction contains several motifs, choose the single quietest and most structurally relevant one.`;
  const ko = `[\uB0B4\uB7EC\uD2F0\uBE0C \uBBF8\uB2C8\uBA40 \uBAA8\uB4DC]
- \uD0C0\uC774\uD2C0\uC758 85-95%\uB294 \uC911\uB9BD\uC801\uC774\uACE0 \uD3B8\uC9D1\uC801\uC774\uBA70 \uC870\uC6A9\uD55C \uD615\uD0DC\uB85C \uC720\uC9C0\uD569\uB2C8\uB2E4.
- \uD558\uB098\uC758 \uAD6C\uC870\uC801 \uC544\uC774\uB514\uC5B4\uB9CC \uC0AC\uC6A9\uD569\uB2C8\uB2E4: ${mutationOption.name}.
- ${targetKo}
- \uBCC0\uD615 \uC608\uC0B0 ${intensityOption.budget}, \uAC00\uB3C5\uC131 \uD558\uD55C ${intensityOption.readability}.
- \uBAA8\uB4E0 \uD55C\uAE00 \uC74C\uC808 \uBE14\uB85D\uACFC \uC790\uBAA8\uB97C \uBCF4\uC874\uD558\uACE0, \uCF58\uC149\uD2B8\uBCF4\uB2E4 \uCCA0\uC790 \uC778\uC9C0\uAC00 \uBA3C\uC800 \uC774\uB8E8\uC5B4\uC838\uC57C \uD569\uB2C8\uB2E4.
- \uC2E4\uB8E8\uC5E3\xB7\uAC04\uACA9\xB7\uD68D \uB05D\xB7\uC5F0\uACB0\xB7\uB0B4\uBD80 \uC5EC\uBC31\uB9CC \uC0AC\uC6A9\uD558\uBA70 \uAE00\uC790\uB97C \uC0AC\uBB3C \uADF8\uB9BC\uC73C\uB85C \uCE58\uD658\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.
- \uC8FC\uBCC0 \uC2EC\uBCFC\xB7\uD30C\uD2F0\uD074\xB7\uD504\uB808\uC784\xB7\uC9C8\uAC10\xB7\uC678\uACFD\uC120\xB7\uADF8\uB9BC\uC790\xB7\uAE00\uB85C\uC6B0\xB7\uADF8\uB77C\uB514\uC5B8\uD2B8\xB7\uC7AC\uC9C8\xB73D\uB97C \uAE08\uC9C0\uD569\uB2C8\uB2E4.
- \uC5EC\uB7EC \uBAA8\uD2F0\uD504\uAC00 \uC785\uB825\uB418\uBA74 \uAC00\uC7A5 \uC870\uC6A9\uD558\uACE0 \uAD6C\uC870\uC801\uC73C\uB85C \uC801\uD569\uD55C \uD558\uB098\uB9CC \uC120\uD0DD\uD569\uB2C8\uB2E4.`;
  return {
    active: true,
    en,
    ko,
    budget: intensityOption.budget,
    readability: intensityOption.readability,
    allowed: `${mutationOption.en}; limited to ${scopeOption.en}`,
    forbidden: "Multiple motifs, literal icons, object substitution, full-word deformation, texture, surrounding decoration, or readability loss"
  };
}

// src/apps/TypecoreBreeze/services/breezePrompt.js
var HANGUL_RX = /[ㄱ-ㅎㅏ-ㆎ가-힣]/;
var hasHangul = (text2) => HANGUL_RX.test(text2 || "");
var computeLineBreak = (text2) => {
  const cleaned = (text2 || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const tokens = cleaned.split(" ");
  if (tokens.length >= 2) {
    let bestSplit = 1, bestDiff = Infinity;
    for (let i = 1; i < tokens.length; i++) {
      const a = tokens.slice(0, i).join(" ").length;
      const b = tokens.slice(i).join(" ").length;
      const diff = Math.abs(a - b);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSplit = i;
      }
    }
    return [tokens.slice(0, bestSplit).join(" "), tokens.slice(bestSplit).join(" ")];
  }
  const arr = Array.from(cleaned);
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid).join(""), arr.slice(mid).join("")];
};
var resolveConflicts = (s) => {
  const out = { ...s };
  const conflicts = [];
  if (out.rhythmDynamic === "Rhythm_Bouncy" && out.textFlow === "Straight") {
    out.textFlow = "Bouncy";
    conflicts.push("\uB9AC\uB4EC Bouncy \u2194 \uBCA0\uC774\uC2A4\uB77C\uC778 Straight \u2192 Bouncy \uBCA0\uC774\uC2A4\uB77C\uC778\uC73C\uB85C \uD1B5\uC77C");
  } else if (out.rhythmDynamic === "Rhythm_Calm" && (out.textFlow === "Bouncy" || out.textFlow === "Wave")) {
    out.textFlow = "Straight";
    conflicts.push("\uB9AC\uB4EC Calm \u2194 \uBCA0\uC774\uC2A4\uB77C\uC778 Bouncy/Wave \u2192 Straight \uBCA0\uC774\uC2A4\uB77C\uC778\uC73C\uB85C \uD1B5\uC77C");
  }
  if (out.internalDecoration === "StickerBorder" && out.stemWeight === "Weight_Thin") {
    out.stemWeight = "Weight_Chunky";
    conflicts.push("\uC2A4\uD2F0\uCEE4 \uBCF4\uB354 \u2194 \uC587\uC740 \uBAA8\uB178\uB77C\uC778 \u2192 \uB450\uD23C\uD55C \uBCFC\uB968\uC73C\uB85C \uAC15\uC81C");
  }
  if (out.internalDecoration === "Extruded3D") {
    out.internalDecoration = "Solid";
    conflicts.push("2D \uD751\uBC31 \uCD9C\uB825 \uADDC\uCE59 \u2194 3D \uC785\uCCB4 \uC635\uC158 \u2192 \uD3C9\uBA74 \uCC44\uC6C0\uC73C\uB85C \uBCC0\uACBD");
  }
  if (out.internalDecoration === "Highlight" && ["Tex_Watercolor", "Tex_Chalk", "Tex_DustyChalk", "Tex_Grunge"].includes(out.strokeTexture)) {
    out.internalDecoration = "Solid";
    conflicts.push("\uAE00\uB85C\uC2DC \uD558\uC774\uB77C\uC774\uD2B8 \u2194 \uAC70\uCE5C/\uBC88\uC9D0 \uD14D\uC2A4\uCC98 \u2192 \uC194\uB9AC\uB4DC\uB85C \uD1B5\uC77C");
  }
  if (out.layoutType === "1Line" && out.charProportion === "P_Extended" && out.aspectRatio !== "2.76:1") {
    out.charProportion = "P_Std";
    conflicts.push("1\uC904 + \uD655\uC7A5 \uBE44\uB840 \u2192 \uD654\uBA74 \uD3ED \uCD08\uACFC \uBC29\uC9C0\uB97C \uC704\uD574 \uD45C\uC900 \uBE44\uB840\uB85C");
  }
  const visibleGlyphCount = Array.from((out.inputText || "").replace(/\s/g, "")).length;
  if (out.layoutType === "1Line" && visibleGlyphCount >= 9) {
    if (["P_Condensed", "P_Slim"].includes(out.charProportion)) {
      out.charProportion = "P_Std";
      conflicts.push("9\uC790 \uC774\uC0C1 1\uC904 + \uC7A5\uCCB4 \uBE44\uB840 \u2192 \uAE00\uC790 \uAC00\uB85C\uD3ED \uCD95\uC18C \uBC29\uC9C0\uB97C \uC704\uD574 \uD45C\uC900 \uC7A5\uD3C9\uC73C\uB85C");
    }
    if (out.charWidth === "Narrow") {
      out.charWidth = "Normal";
      conflicts.push("9\uC790 \uC774\uC0C1 1\uC904 + \uC881\uC740 \uC790\uD3ED \u2192 \uC790\uC5F0 \uAE00\uC790 \uBE44\uB840 \uBCF4\uC874\uC744 \uC704\uD574 \uD45C\uC900 \uC790\uD3ED\uC73C\uB85C");
    }
  }
  if ((out.scriptType || "").startsWith("Story_")) {
    const hadNarrativeConflict = out.internalDecoration !== "Solid" || out.casualSurrounding !== "Clean" || out.strokeTexture !== "Tex_Smooth" || out.strokeExtension !== "Ext_None" || out.playfulDistortion !== "Distort_None" || out.momentumActive;
    out.internalDecoration = "Solid";
    out.casualSurrounding = "Clean";
    out.strokeTexture = "Tex_Smooth";
    out.strokeExtension = "Ext_None";
    out.playfulDistortion = "Distort_None";
    out.momentumActive = false;
    if (hadNarrativeConflict) conflicts.push("\uB0B4\uB7EC\uD2F0\uBE0C \uBBF8\uB2C8\uBA40 \u2194 \uC7A5\uC2DD\xB7\uC9C8\uAC10\xB7\uACFC\uB3C4\uD55C \uB3D9\uC138 \u2192 \uB2E8\uC0C9 \uAD6C\uC870 \uBCC0\uD615\uB9CC \uB0A8\uAE40");
  }
  return { resolved: out, conflicts };
};
var W = (en, w = 1.2) => {
  if (!en) return "";
  if (/\([^)]+:\s*[\d.]+\s*\)/.test(en)) return en;
  return `(${en}:${w})`;
};
var buildPrompts = (raw) => {
  const { resolved: s, conflicts } = resolveConflicts(raw);
  const rawInput = s.inputText || "";
  const manualLines = rawInput.includes("\n") ? rawInput.split("\n").map((t) => t.trim()).filter(Boolean) : null;
  const manualLineCount = manualLines ? manualLines.length : 1;
  s.inputText = rawInput.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
  const layoutLines = manualLineCount >= 3 ? 3 : manualLineCount === 2 ? 2 : s.layoutType === "3Lines" ? 3 : s.layoutType === "2Lines" ? 2 : 1;
  const visibleGlyphCount = Array.from(s.inputText.replace(/\s/g, "")).length;
  const isLongSingleLine = layoutLines === 1 && visibleGlyphCount >= 9;
  const longTitleGeometryEn = isLongSingleLine ? `
[LONG SINGLE-LINE GLYPH ASPECT LOCK]: Preserve natural near-square Hangul skeletons with balanced width-to-height. Canvas aspect ratio and visible-title aspect ratio are independent. Use the available canvas width and generous symmetric top-and-bottom whitespace; never fit ${visibleGlyphCount} glyphs by condensed proportions, narrow character frames, reduced glyph width, or horizontal squeezing.` : "";
  const longTitleGeometryKo = isLongSingleLine ? `
[\uC7A5\uBB38 1\uC904 \uAE00\uC790 \uC7A5\uD3C9 \uC7A0\uAE08]: ${visibleGlyphCount}\uC790\uC758 \uAE00\uC790 \uAC00\uB85C\uD3ED\uC744 \uC904\uC774\uC9C0 \uB9D0\uACE0 \uC815\uBC29\uD615\uC5D0 \uAC00\uAE4C\uC6B4 \uC790\uC5F0 \uD55C\uAE00 \uACE8\uACA9\uC744 \uC720\uC9C0\uD569\uB2C8\uB2E4. \uCE94\uBC84\uC2A4 \uBE44\uC728\uACFC \uAC00\uC2DC \uD0C0\uC774\uD2C0 \uBE44\uC728\uC740 \uBCC4\uAC1C\uC774\uBA70, \uC704\xB7\uC544\uB798 \uB300\uCE6D \uC5EC\uBC31\uC73C\uB85C \uAE34 \uAC00\uB85C \uC2E4\uB8E8\uC5E3\uC744 \uC218\uC6A9\uD569\uB2C8\uB2E4. \uC7A5\uCCB4\xB7\uC881\uC740 \uC790\uD3ED\xB7\uAC00\uB85C \uC555\uCD95\uC744 \uAE08\uC9C0\uD569\uB2C8\uB2E4.` : "";
  const styleList = [...staticOptions.CasualStyles, ...s.dynamicOptions.CasualStyles || []];
  const activeStyle = styleList.find((style) => style.id === s.scriptType);
  const narrativeDirective = buildNarrativeDirective({
    active: Boolean(activeStyle?.narrative),
    intensity: s.narrativeIntensity,
    scope: s.narrativeScope,
    mutation: s.narrativeMutation,
    target: s.narrativeTarget
  });
  const weightList = [...staticOptions.strokeWeights, ...s.dynamicOptions.strokeWeights || []];
  const kerningList = [...staticOptions.kerningOptions, ...s.dynamicOptions.kerningOptions || []];
  const terminalList = [...staticOptions.strokeEnds, ...s.dynamicOptions.strokeEnds || []];
  const sharpnessList = [...staticOptions.strokeSharpness, ...s.dynamicOptions.strokeSharpness || []];
  const textureList = [...staticOptions.strokeTextures, ...s.dynamicOptions.strokeTextures || []];
  const rhythmList = [...staticOptions.rhythmDynamics, ...s.dynamicOptions.rhythmDynamics || []];
  const slantList = staticOptions.slantAngles;
  const destList = [...staticOptions.analogImperfections, ...s.dynamicOptions.analogImperfections || []];
  const styleEn = getOptionEn(styleList, s.scriptType);
  const weightEn = getOptionEn(weightList, s.stemWeight);
  const kerningEn = getOptionEn(kerningList, s.kerning);
  const terminalEn = getOptionEn(terminalList, s.terminalStyle);
  const sharpnessEn = getOptionEn(sharpnessList, s.strokeSharpness);
  const textureEn = getOptionEn(textureList, s.strokeTexture);
  const widthEn = getOptionEn(staticOptions.widths, s.charWidth);
  const proportionEn = getOptionEn(staticOptions.proportions, s.charProportion);
  const extensionEn = getOptionEn(staticOptions.strokeExtensions, s.strokeExtension);
  const rhythmEn = getOptionEn(rhythmList, s.rhythmDynamic);
  const slantEn = getOptionEn(slantList, s.slantAngle);
  const occupancyEn = getOptionEn(staticOptions.occupancies, s.occupancy);
  const internalEn = getOptionEn(staticOptions.InternalDecorations, s.internalDecoration);
  const textFlowEn = getOptionEn(staticOptions.TextFlows, s.textFlow);
  const connectionEn = getOptionEn(staticOptions.LetterConnections, s.letterConnection);
  const surroundEn = getOptionEn(staticOptions.CasualSurroundings, s.casualSurrounding);
  const styleKo = getOptionName(styleList, s.scriptType);
  const weightKo = getOptionName(weightList, s.stemWeight);
  const kerningKo = getOptionName(kerningList, s.kerning);
  const terminalKo = getOptionName(terminalList, s.terminalStyle);
  const sharpnessKo = getOptionName(sharpnessList, s.strokeSharpness);
  const textureKo = getOptionName(textureList, s.strokeTexture);
  const widthKo = getOptionName(staticOptions.widths, s.charWidth);
  const proportionKo = getOptionName(staticOptions.proportions, s.charProportion);
  const extensionKo = getOptionName(staticOptions.strokeExtensions, s.strokeExtension);
  const rhythmKo = getOptionName(rhythmList, s.rhythmDynamic);
  const slantKo = getOptionName(slantList, s.slantAngle);
  const occupancyKo = getOptionName(staticOptions.occupancies, s.occupancy);
  const internalKo = getOptionName(staticOptions.InternalDecorations, s.internalDecoration);
  const textFlowKo = getOptionName(staticOptions.TextFlows, s.textFlow);
  const connectionKo = getOptionName(staticOptions.LetterConnections, s.letterConnection);
  const surroundKo = getOptionName(staticOptions.CasualSurroundings, s.casualSurrounding);
  const distortionEn = getOptionEn(staticOptions.playfulDistortions, s.playfulDistortion);
  const funBlockEn = [
    s.rhythmDynamic !== "Rhythm_Calm" ? W(rhythmEn, 1.35) : "",
    s.textFlow !== "Straight" ? W(textFlowEn, 1.35) : "",
    s.playfulDistortion !== "Distort_None" ? W(distortionEn, 1.35) : "",
    s.internalDecoration !== "Solid" ? W(internalEn, 1.3) : "",
    s.casualSurrounding !== "Clean" ? W(surroundEn, 1.3) : ""
  ].filter(Boolean).join(", ");
  const funMandateEn = funBlockEn ? `
[PLAYFUL IDENTITY \u2014 MUST BE CLEARLY VISIBLE]: ${funBlockEn}. These playful traits are the heart of the design; make them unmistakable while keeping the text perfectly legible.` : "";
  const genreSpecEn = `- Fill Decoration: ${internalEn}
- Text Flow Baseline: ${textFlowEn}
- Connections: ${connectionEn}
- Surrounding Elements: ${surroundEn}
- Distortions: ${distortionEn}`;
  const layoutEn = layoutLines === 1 ? `[LAYOUT MANDATE]: STRICT SINGLE HORIZONTAL ROW. ABSOLUTELY NO VERTICAL STACKING.` : layoutLines === 3 ? `[LAYOUT MANDATE]: Balanced Three-tier vertical stacked composition (exactly 3 rows).` : `[LAYOUT MANDATE]: Balanced Two-tier vertical stacked composition.`;
  const layoutInlineEn = layoutLines === 1 ? "strictly one horizontal row, no stacking" : layoutLines === 3 ? "exactly three stacked rows" : "exactly two stacked rows";
  const userAuraEn = s.customDesignInjections ? `
[USER DESIGN DIRECTION / AURA]: ${s.customDesignInjections}` : "";
  const layoutKo = layoutLines === 1 ? `[\uB808\uC774\uC544\uC6C3 \uAC15\uC81C]: \uC5C4\uACA9\uD55C 1\uC904 \uAC00\uB85C \uBC30\uC5F4. \uC138\uB85C \uC801\uCE35 \uC808\uB300 \uAE08\uC9C0.` : layoutLines === 3 ? `[\uB808\uC774\uC544\uC6C3 \uAC15\uC81C]: \uADE0\uD615\uC7A1\uD78C 3\uC904 \uC138\uB85C \uC801\uCE35 \uAD6C\uC131.` : `[\uB808\uC774\uC544\uC6C3 \uAC15\uC81C]: \uADE0\uD615\uC7A1\uD78C 2\uC904 \uC138\uB85C \uC801\uCE35 \uAD6C\uC131.`;
  const layoutInlineKo = layoutLines === 1 ? "\uC5C4\uACA9\uD55C 1\uC904 \uAC00\uB85C \uBC30\uC5F4, \uC801\uCE35 \uAE08\uC9C0" : layoutLines === 3 ? "\uC815\uD655\uD788 3\uC904\uB85C \uC801\uCE35" : "\uC815\uD655\uD788 2\uC904\uB85C \uC801\uCE35";
  const userAuraKo = s.customDesignInjections ? `
[\uC0AC\uC6A9\uC790 \uB514\uC790\uC778 \uC9C0\uC2DC / \uC544\uC6B0\uB77C]: ${s.customDesignInjections}` : "";
  const subTraitContextKo = `
[\uC138\uBD80 \uC18D\uC131 \uC9D1\uC911\uB3C4]: ${getSliderText(s.personaSliderValue)}`;
  const subTraitContext = `
[SUB-TRAIT FOCUS]: ${getSliderText(s.personaSliderValue)}`;
  const artisticBoost = s.enhanceMode === "wild" ? `
[PLAYFUL CHAOS ENGINE]: ENABLED.
- ASYMMETRY ENFORCED: Strict prohibition of boring bilateral symmetry.
- DYNAMIC BOUNCE: Use size variation while preserving every character.
- SILHOUETTE HOOK: Create a charming, memorable outer shape that stands out.
- CONTROLLED DISTORTION: Distort only decorative contours; keep the text fully legible and correctly spelled.
- NO 3D MATERIALS: Rely purely on flat, vector or illustrated structural forms.` : "";
  const qualityBoost = s.enhanceMode === "perfection" ? `
[FLAWLESS VECTOR ENGINE]: ENABLED.
- PRISTINE CURVES: Bezier curves are perfectly clean with no jitter.
- COMMERCIAL QUALITY: Production-grade visual finish.
- CLEAN NEGATIVE SPACE: Internal counters are balanced and uncluttered.
- READABILITY FIRST: Text is highly legible regardless of stylistic choices.` : "";
  const transformationBoost = s.enhanceMode === "creative" ? `
[CALLIGRAPHIC ORNAMENT ENGINE]: ENABLED.
- FLOWING CONNECTIONS: Maximize elegant ligatures, swashes, and beautiful flourishes.
- UNIFIED COMPOSITION: Letters must interlock naturally like a single continuous artistic gesture.
- ANCHOR EXAGGERATION: Emphasize the first or last letter with dramatic, gorgeous sweeping curves.` : "";
  const momentumBoost = s.momentumActive ? `
[RHYTHMIC BOUNCE ENGINE]: ENABLED.
- DANCING TEXT: The typography must look like it is dancing, jumping, or flowing with energetic movement.
- ACTION TRAJECTORY: Follow a dynamic sweeping baseline.
- LIVELY ENERGY: Use slanted, stretching, or bouncing forms to convey pure joy or dynamic speed.` : "";
  const bgDesc = getOptionEn(staticOptions.base, s.baseStyle) || "JET BLACK Background";
  const bgDescKo = getOptionName(staticOptions.base, s.baseStyle) || "\uC81C\uD2B8 \uBE14\uB799 \uBC30\uACBD";
  const artisticBoostKo = s.enhanceMode === "wild" ? `
[\uC720\uCF8C\uD55C \uD63C\uB3C8 \uC2DC\uC2A4\uD15C]: \uD65C\uC131\uD654\uB428.
- \uBE44\uB300\uCE6D \uAC15\uC81C: \uC9C0\uB8E8\uD55C \uC88C\uC6B0 \uB300\uCE6D\uC744 \uC5C4\uACA9\uD788 \uAE08\uC9C0\uD569\uB2C8\uB2E4.
- \uB2E4\uC774\uB098\uBBF9 \uBC14\uC6B4\uC2A4: \uBAA8\uB4E0 \uAE00\uC790\uB97C \uBCF4\uC874\uD558\uB294 \uBC94\uC704\uC5D0\uC11C \uD06C\uAE30 \uBCC0\uD654\uB97C \uC801\uC6A9\uD558\uC138\uC694.
- \uC2E4\uB8E8\uC5E3 \uD6C5: \uBA40\uB9AC\uC11C\uB3C4 \uB208\uC5D0 \uB744\uB294 \uB9E4\uB825\uC801\uC774\uACE0 \uAE30\uC5B5\uC5D0 \uB0A8\uB294 \uC678\uACFD \uD615\uD0DC\uB97C \uB9CC\uB4DC\uC138\uC694.
- \uD1B5\uC81C\uB41C \uC65C\uACE1: \uC7A5\uC2DD \uC678\uACFD\uB9CC \uBCC0\uD615\uD558\uACE0 \uBCF8\uBB38\uC740 \uC644\uC804\uD788 \uC77D\uD788\uBA70 \uCCA0\uC790\uAC00 \uC815\uD655\uD574\uC57C \uD569\uB2C8\uB2E4.
- 3D \uC7AC\uC9C8 \uAE08\uC9C0: \uC21C\uC218\uD55C \uD3C9\uBA74, \uBCA1\uD130 \uB610\uB294 \uC77C\uB7EC\uC2A4\uD2B8 \uAD6C\uC870\uC5D0 \uC758\uC874\uD558\uC138\uC694.` : "";
  const qualityBoostKo = s.enhanceMode === "perfection" ? `
[\uBB34\uACB0\uC810 \uBCA1\uD130 \uC2DC\uC2A4\uD15C]: \uD65C\uC131\uD654\uB428.
- \uC644\uBCBD\uD55C \uACE1\uC120: \uB5A8\uB9BC \uC5C6\uB294 \uAE54\uB054\uD55C \uBCA0\uC9C0\uC5B4 \uACE1\uC120.
- \uC0C1\uC5C5\uC801 \uD004\uB9AC\uD2F0: \uD504\uB85C\uB355\uC158\uAE09 \uC2DC\uAC01 \uB9C8\uAC10.
- \uAE54\uB054\uD55C \uC5EC\uBC31: \uB0B4\uBD80 \uACF5\uAC04(\uCE74\uC6B4\uD130)\uC774 \uADE0\uD615 \uC7A1\uD788\uACE0 \uAE54\uB054\uD568.
- \uAC00\uB3C5\uC131 \uCD5C\uC6B0\uC120: \uC2A4\uD0C0\uC77C \uC120\uD0DD\uACFC \uBB34\uAD00\uD558\uAC8C \uD14D\uC2A4\uD2B8\uAC00 \uB9E4\uC6B0 \uC798 \uC77D\uD798.` : "";
  const transformationBoostKo = s.enhanceMode === "creative" ? `
[\uCE98\uB9AC\uADF8\uB77C\uD53C \uC7A5\uC2DD \uC2DC\uC2A4\uD15C]: \uD65C\uC131\uD654\uB428.
- \uD750\uB974\uB294 \uC5F0\uACB0\uC131: \uC6B0\uC544\uD55C \uD569\uC790(Ligature), \uC2A4\uC6CC\uC2DC, \uC544\uB984\uB2E4\uC6B4 \uD50C\uB85C\uB9AC\uC2DC(Flourishes)\uB97C \uADF9\uB300\uD654\uD558\uC138\uC694.
- \uD1B5\uD569\uB41C \uAD6C\uC131: \uAE00\uC790\uB4E4\uC774 \uB9C8\uCE58 \uD558\uB098\uC758 \uC5F0\uC18D\uB41C \uC608\uC220\uC801 \uC81C\uC2A4\uCC98\uCC98\uB7FC \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC5BD\uD600\uC57C \uD569\uB2C8\uB2E4.
- \uC575\uCEE4 \uACFC\uC7A5: \uCCAB \uAE00\uC790\uB098 \uB9C8\uC9C0\uB9C9 \uAE00\uC790\uB97C \uB4DC\uB77C\uB9C8\uD2F1\uD558\uACE0 \uBA4B\uC9C0\uAC8C \uBED7\uC5B4\uB098\uAC00\uB294 \uACE1\uC120\uC73C\uB85C \uAC15\uC870\uD558\uC138\uC694.` : "";
  const momentumBoostKo = s.momentumActive ? `
[\uB9AC\uB4EC \uBC14\uC6B4\uC2A4 \uC2DC\uC2A4\uD15C]: \uD65C\uC131\uD654\uB428.
- \uCDA4\uCD94\uB294 \uD14D\uC2A4\uD2B8: \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C\uAC00 \uCDA4\uC744 \uCD94\uAC70\uB098, \uC810\uD504\uD558\uAC70\uB098, \uC5D0\uB108\uC9C0 \uB118\uCE58\uB294 \uC6C0\uC9C1\uC784\uC73C\uB85C \uD750\uB974\uB294 \uAC83\uCC98\uB7FC \uBCF4\uC5EC\uC57C \uD569\uB2C8\uB2E4.
- \uC561\uC158 \uADA4\uC801: \uC5ED\uB3D9\uC801\uC774\uACE0 \uC2DC\uC6D0\uD558\uAC8C \uBED7\uC5B4\uB098\uAC00\uB294 \uBCA0\uC774\uC2A4\uB77C\uC778\uC744 \uB530\uB974\uC138\uC694.
- \uC0DD\uB3D9\uAC10 \uC788\uB294 \uC5D0\uB108\uC9C0: \uAE30\uC6B8\uC5B4\uC9C0\uAC70\uB098, \uB298\uC5B4\uB098\uAC70\uB098, \uD1B5\uD1B5 \uD280\uB294 \uD615\uD0DC\uB97C \uC0AC\uC6A9\uD574 \uC21C\uC218\uD55C \uC990\uAC70\uC6C0\uC774\uB098 \uC5ED\uB3D9\uC801\uC778 \uC18D\uB3C4\uAC10\uC744 \uC804\uB2EC\uD558\uC138\uC694.` : "";
  const activePersonaData = directorPersonas.find((p) => p.id === s.aiPersona) || directorPersonas[0];
  const morphologyBody = `${W(weightEn)}, ${W(kerningEn)}, Width(${W(widthEn)}), Specific Proportion(${W(proportionEn)}).`;
  const morphologyDetail = s.isAdvancedOptionsEnabled ? `
- Detail: ${W(terminalEn)}, ${W(sharpnessEn)}, Texture(${W(textureEn)}), Extension(${W(extensionEn)}).
${genreSpecEn}
- Slant: ${W(slantEn)}` : "";
  const morphologyBodyKo = `${weightKo}, ${kerningKo}, \uC790\uD3ED(${widthKo}), \uD2B9\uC815 \uBE44\uC728(${proportionKo}).`;
  const morphologyDetailKo = s.isAdvancedOptionsEnabled ? `
- \uB514\uD14C\uC77C: ${terminalKo}, ${sharpnessKo}, \uD14D\uC2A4\uCC98(${textureKo}), \uC5F0\uC7A5\uC120(${extensionKo}).
- \uCC44\uC6B0\uAE30 \uC7A5\uC2DD: ${internalKo}
- \uBCA0\uC774\uC2A4\uB77C\uC778 \uD750\uB984: ${textFlowKo}
- \uAE00\uC790 \uC5F0\uACB0\uC131: ${connectionKo}
- \uC8FC\uBCC0 \uC694\uC18C: ${surroundKo}
- \uC65C\uACE1: ${getOptionName(staticOptions.playfulDistortions, s.playfulDistortion)}
- \uAE30\uC6B8\uAE30: ${slantKo}` : "";
  const personaMandate = `
[DIRECTOR PERSONA MANDATE - ${activePersonaData.shortTitle}]:
- Focus: Apply '${activePersonaData.keywords}' aesthetics heavily.
${activePersonaData.instructionRule}`;
  const personaMandateKo = `
[\uB514\uB809\uD130 \uD398\uB974\uC18C\uB098 \uBA85\uB839 - ${activePersonaData.shortTitle}]:
- \uC5ED\uD560: ${activePersonaData.role}
- \uC9D1\uC911: '${activePersonaData.keywords}' \uBBF8\uD559\uC744 \uAC15\uB825\uD558\uAC8C \uC801\uC6A9\uD558\uC2ED\uC2DC\uC624.
${activePersonaData.instructionRule ? activePersonaData.instructionRule.replace("- Rule: ", "- \uAD6C\uC870\uC801 \uBC95\uCE59: ") : ""}`;
  const hangulBoostEn = hasHangul(s.inputText) ? `
[HANGUL LEGIBILITY]: (perfectly legible Korean Hangul "${s.inputText}":1.6), preserve every jamo and syllable block, absolutely no missing, substituted, or romanized characters, no spelling errors.` : "";
  let lineRows = null;
  if (manualLines && manualLineCount >= 2) {
    lineRows = manualLineCount >= 3 ? [manualLines[0], manualLines[1], manualLines.slice(2).join(" ")] : [manualLines[0], manualLines.slice(1).join(" ")];
  } else if (s.layoutType === "2Lines" && hasHangul(s.inputText)) {
    lineRows = computeLineBreak(s.inputText);
  }
  const lineBreakEn = lineRows ? `
[LINE BREAK]: ${lineRows.map((l, i) => `Line ${i + 1} "${l}"`).join(" / ")}.` : "";
  const arBoostEn = s.aspectRatio === "16:9" ? `(strict 16:9 horizontal widescreen format:1.6), landscape orientation, explicitly NOT vertical, NOT portrait` : s.aspectRatio === "2.76:1" ? `(strict 2.76:1 ultrawide cinematic letterbox:1.6), far wider than tall` : `(strict 1:1 perfect square format:1.5), equal width and height`;
  const baseTechnicalEn = `[MASTER TYPO SPECS V3.0] Text: "${s.inputText}". ${userAuraEn}${subTraitContext}
[CORE PHILOSOPHY]: DO NOT render standard flat fonts. Create artistic custom typography.
[CONFLICT POLICY]: Preserve exact TEXT, LINE BREAKS, LAYOUT, MONOCHROME, and 2D locks first; then USER DESIGN DIRECTION; then PERSONA and STYLE. Drop lower-priority contradictions rather than averaging them.
[STRICT MONOCHROME]: NO COLORS. STRICT BLACK AND WHITE ONLY.
[SPATIAL MANDATE]: ${occupancyEn}${longTitleGeometryEn}
${layoutEn}${lineBreakEn}${narrativeDirective.en ? `
${narrativeDirective.en}` : ""}${personaMandate}${hangulBoostEn}
[PROPORTION SAFETY]: Force each character's proportion to ${proportionEn} and width to ${widthEn}. Do not stretch or rotate individual characters vertically. Multi-row stacking is allowed only when required by the LAYOUT MANDATE.
[MORPHOLOGY]:
- Theme: ${W(styleEn, 1.3)}.
- Body: ${morphologyBody}${morphologyDetail}
[RHYTHM]: ${W(rhythmEn, 1.3)}.${funMandateEn}
[ENVIRONMENT]: AR ${arBoostEn}, ${bgDesc}.${artisticBoost}${qualityBoost}${transformationBoost}${momentumBoost}`.trim();
  const hangulBoostKo = hasHangul(s.inputText) ? `
[\uD55C\uAE00 \uAC00\uB3C5\uC131]: "${s.inputText}" \uC758 \uBAA8\uB4E0 \uC790\uBAA8\uC640 \uC74C\uC808 \uBE14\uB85D\uC744 \uC644\uBCBD\uD788 \uBCF4\uC874. \uAE00\uC790 \uB204\uB77D\xB7\uCE58\uD658\xB7\uB85C\uB9C8\uC790\uD654 \uC808\uB300 \uAE08\uC9C0, \uB9DE\uCDA4\uBC95 \uC624\uB958 \uAE08\uC9C0.` : "";
  const lineBreakKo = lineRows ? `
[\uC904 \uBD84\uD560]: ${lineRows.map((l, i) => `${i + 1}\uC904 "${l}"`).join(" / ")}.` : "";
  const baseTechnicalKo = `[\uB9C8\uC2A4\uD130 \uD0C0\uC774\uD3EC \uC2A4\uD399 V3.0 - \uCE90\uC8FC\uC5BC \uCF54\uC5B4] \uD14D\uC2A4\uD2B8: "${s.inputText}". ${userAuraKo}${subTraitContextKo}
[\uD575\uC2EC \uCCA0\uD559 \uBC0F \uC9C0\uC2DC\uC0AC\uD56D]:
1. \uC77C\uBC18 \uD3F0\uD2B8 \uB80C\uB354\uB9C1 \uAE08\uC9C0. '\uD45C\uC900 \uC2DC\uC2A4\uD15C \uD3F0\uD2B8' \uBBF8\uD559 \uBC30\uC81C.
2. \uC608\uC220\uC801\uC778 \uC218\uC791\uC5C5\uC774\uB098 \uC544\uB984\uB2F5\uAC8C \uC138\uACF5\uB41C \uCEE4\uC2A4\uD140 \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uC0DD\uC131.
[\uC5C4\uACA9\uD55C \uB2E8\uC0C9\uD654]: \uC0C9\uC0C1 \uAE08\uC9C0, \uCC44\uB3C4 0, \uC21C\uC218 \uD751\uBC31\uC73C\uB85C\uB9CC \uAD6C\uC131.
[2D \uAC15\uC81C]: \uC644\uBCBD\uD55C \uD3C9\uBA74 \uADF8\uB798\uD53D \uC2E4\uB8E8\uC5E3. \uAE4A\uC774\uAC10 \uC81C\uB85C. 3D \uAE08\uC9C0.
[\uACF5\uAC04 \uD560\uB2F9]: ${occupancyKo}${longTitleGeometryKo}
${layoutKo}${lineBreakKo}${narrativeDirective.ko ? `
${narrativeDirective.ko}` : ""}${personaMandateKo}${hangulBoostKo}
[\uCDA9\uB3CC \uC815\uCC45]: \uC815\uD655\uD55C \uBB38\uAD6C\xB7\uC904 \uBD84\uD560\xB7\uB808\uC774\uC544\uC6C3\xB7\uD751\uBC31\xB72D \uADDC\uCE59\uC744 \uCD5C\uC6B0\uC120\uC73C\uB85C \uBCF4\uC874\uD558\uACE0, \uADF8\uB2E4\uC74C \uC0AC\uC6A9\uC790 \uB514\uC790\uC778 \uC9C0\uC2DC, \uD398\uB974\uC18C\uB098, \uC2A4\uD0C0\uC77C \uC21C\uC73C\uB85C \uC801\uC6A9\uD569\uB2C8\uB2E4. \uD558\uC704 \uC6B0\uC120\uC21C\uC704\uC758 \uBAA8\uC21C \uD0A4\uC6CC\uB4DC\uB294 \uC81C\uAC70\uD558\uC138\uC694.
[\uBE44\uC728 \uC548\uC804\uC7A5\uCE58]: \uAC1C\uBCC4 \uAE00\uC790 \uBE44\uC728\uC744 ${proportionKo}(\uC73C)\uB85C, \uC790\uD3ED\uC744 ${widthKo}(\uC73C)\uB85C \uAC15\uC81C. \uAC1C\uBCC4 \uAE00\uC790\uB97C \uC138\uB85C\uB85C \uB298\uC774\uAC70\uB098 \uD68C\uC804\uD558\uC9C0 \uB9C8\uC138\uC694. \uC5EC\uB7EC \uC904 \uC801\uCE35\uC740 \uC704 \uB808\uC774\uC544\uC6C3 \uAC15\uC81C\uAC00 \uC694\uAD6C\uD560 \uB54C\uB9CC \uD5C8\uC6A9\uD569\uB2C8\uB2E4.
[\uD615\uD0DC\uD559]:
- \uD14C\uB9C8: ${styleKo}.
- \uBF08\uB300: ${morphologyBodyKo}${morphologyDetailKo}
[\uB9AC\uB4EC\uAC10]: ${rhythmKo}.
[\uD658\uACBD]: \uD654\uBA74\uBE44 ${s.aspectRatio}, ${bgDescKo}.${artisticBoostKo}${qualityBoostKo}${transformationBoostKo}${momentumBoostKo}`.trim();
  const baseTechnical = { en: baseTechnicalEn, ko: baseTechnicalKo };
  const overview = `[ V2.6 CASUAL & CALLI OVERVIEW ]
\u25A0 SUBJECT: "${s.inputText}"
\u25A0 DIRECTOR PERSONA: ${activePersonaData.shortTitle}
\u25A0 DESIGN AURA: ${s.customDesignInjections || "\uAE30\uBCF8 \uC14B\uC5C5"}

[ CORE SETTINGS ]
\u2022 Theme: ${styleEn}
\u2022 Ends/Terminals: ${terminalEn}
\u2022 Rhythm: ${rhythmEn}${narrativeDirective.active ? `
\u2022 Story Glyph: ${narrativeDirective.budget} mutation budget` : ""}`;
  const chatGPTOutput = {
    en: `Act as an expert Typography Engine. Render "${s.inputText}" in a 2D flat silhouette graphic.
1. Constraints: Pure black and white; preserve exact spelling.
2. Layout: ${layoutInlineEn}.${lineBreakEn}
3. Directing Aura: ${s.customDesignInjections || "Use the selected persona and style settings"}.
${narrativeDirective.en ? `${narrativeDirective.en}
` : ""}4. Details: ${s.isAdvancedOptionsEnabled ? `Texture(${textureEn}), Slant(${slantEn})` : "Aura Driven"}`,
    ko: `\uC804\uBB38 \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uC5D4\uC9C4\uC73C\uB85C \uB3D9\uC791\uD569\uB2C8\uB2E4. "${s.inputText}" \uD14D\uC2A4\uD2B8\uB97C 2D \uD751\uBC31 \uADF8\uB798\uD53D\uC73C\uB85C \uB80C\uB354\uB9C1\uD558\uC138\uC694.
1. \uC81C\uC57D \uC870\uAC74: \uC644\uC804\uD55C \uD751\uBC31, \uC815\uD655\uD55C \uCCA0\uC790 \uBCF4\uC874.
2. \uB808\uC774\uC544\uC6C3: ${layoutInlineKo}.${lineBreakKo}
3. \uC5F0\uCD9C \uBC29\uD5A5\uC131: ${s.customDesignInjections || "\uC120\uD0DD\uD55C \uD398\uB974\uC18C\uB098\uC640 \uC2A4\uD0C0\uC77C \uC124\uC815 \uC0AC\uC6A9"}.
${narrativeDirective.ko ? `${narrativeDirective.ko}
` : ""}4. \uC138\uBD80\uC0AC\uD56D: ${s.isAdvancedOptionsEnabled ? `\uD14D\uC2A4\uCC98(${textureKo}), \uAE30\uC6B8\uAE30(${slantKo})` : "\uC0AC\uC6A9\uC790 \uC544\uC6B0\uB77C \uAE30\uBC18"}`
  };
  const midjourneyOutput = {
    en: `"${s.inputText}" typography logotype, exact spelling, ${s.customDesignInjections || "selected casual typography style"}, ${narrativeDirective.active ? `narrative minimal title with ${narrativeDirective.budget} mutation budget, exactly one structural story cue, no literal icons, ` : ""}${s.isAdvancedOptionsEnabled ? textureEn : ""}, ${layoutInlineEn}${lineBreakEn}, pure black and white, flat 2D silhouette --ar ${s.aspectRatio} --no 3d color gradients`,
    ko: `"${s.inputText}" \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uB85C\uACE0\uD0C0\uC785, \uC815\uD655\uD55C \uCCA0\uC790, ${s.customDesignInjections || "\uC120\uD0DD\uD55C \uCE90\uC8FC\uC5BC \uD0C0\uC774\uD3EC \uC2A4\uD0C0\uC77C"}, ${narrativeDirective.active ? `\uB0B4\uB7EC\uD2F0\uBE0C \uBBF8\uB2C8\uBA40, \uBCC0\uD615 \uC608\uC0B0 ${narrativeDirective.budget}, \uAD6C\uC870\uC801 \uC11C\uC0AC \uB2E8\uC11C \uD55C \uAC1C, \uC0AC\uBB3C \uC544\uC774\uCF58 \uAE08\uC9C0, ` : ""}${s.isAdvancedOptionsEnabled ? textureKo : ""}, ${layoutInlineKo}${lineBreakKo}, \uC644\uC804\uD55C \uD751\uBC31, \uD3C9\uBA74 2D \uC2E4\uB8E8\uC5E3 --ar ${s.aspectRatio} --no 3d color gradients`
  };
  let finalOut = overview;
  if (s.aiModel === "NanoBanana") finalOut = s.isOutdated ? baseTechnical : s.nanoViewMode === "optimized" ? s.optimizedPrompt : s.dramaticPrompt || baseTechnical;
  else if (s.aiModel === "ChatGPT") finalOut = !s.isOutdated && s.cgEnhancedPrompt ? s.cgEnhancedPrompt : chatGPTOutput;
  else if (s.aiModel === "Midjourney") finalOut = !s.isOutdated && s.mjOptimizedPrompt ? s.mjOptimizedPrompt : midjourneyOutput;
  return { baseTechnical, outputContent: finalOut || overview, overview, conflicts };
};

// src/apps/TypecoreSovereign/versions/current/constants/personas.jsx
import React from "react";
import { Gamepad2, Swords, Landmark, Type, Wind, Film } from "lucide-react";
import { jsx } from "react/jsx-runtime";
var coreArchetypes = [
  {
    id: "core_fortress",
    icon: /* @__PURE__ */ jsx(Gamepad2, { className: "w-4 h-4 text-amber-400" }),
    nickname: "\uAC8C\uC784 \uB514\uB809\uD130",
    shortTitle: "\u{1F3AE} \uAC8C\uC784 \uC544\uD2B8 \uB514\uB809\uD130",
    subtitle: "AAA \uAC8C\uC784 \uBA54\uC778 \uD0C0\uC774\uD2C0, \uBB35\uC9C1\uD55C \uC704\uC5C4",
    role: `\uB108\uB294 AAA \uCF58\uC194 \uAC8C\uC784\uC758 \uBA54\uC778 \uD0A4 \uC544\uD2B8\uB97C \uCC45\uC784\uC9C0\uB294 \uC218\uC11D \uC544\uD2B8 \uB514\uB809\uD130\uC57C. \u3008Diablo\u3009, \u3008Elden Ring\u3009, \u3008God of War\u3009 \uAC19\uC740 \uD0C0\uC774\uD2C0 \uB85C\uACE0\uB97C \uB5A0\uC62C\uB9AC\uBA70 \uAE00\uC790\uB97C \uC124\uACC4\uD574. \uCE94\uBC84\uC2A4 \uBE44\uC728\uC774\uB098 \uACF5\uAC04 \uC810\uC720\uC728\uC740 \uC0AC\uC6A9\uC790\uAC00 \uC815\uD55C \uAC12 \uADF8\uB300\uB85C \uB450\uACE0 \uC808\uB300 \uAC04\uC12D\uD558\uC9C0 \uB9D0\uACE0, \uC624\uC9C1 '\uAE00\uC790 \uD68D \uC790\uCCB4\uC758 \uBB34\uAC8C\uC640 \uB9C8\uAC10'\uC5D0\uB9CC \uC9D1\uC911\uD574. \uD68D\uC740 \uAC70\uB300\uD55C \uAC15\uCCA0 \uAE30\uB465\uC774\uACE0 \uC790\uAC04\uC740 \uACAC\uACE0\uD55C \uC131\uBB38 \uC0AC\uC774\uC758 \uC555\uB825\uC73C\uB85C \uC124\uACC4\uD574 \u2014 \uAC8C\uC774\uBA38\uAC00 \uBC15\uC2A4 \uD328\uD0A4\uC9C0\uC5D0\uC11C \uBD24\uC744 \uB54C "\uC774 \uAC8C\uC784\uC740 \uBB35\uC9C1\uD558\uB2E4"\uACE0 \uC989\uC2DC \uB290\uB084 \uC778\uC0C1\uC744 \uAE00\uC790 \uBF08\uB300\uC5D0\uB9CC \uBD80\uC5EC\uD574.`,
    tone: "[\uC7A5\uC5C4\uD558\uACE0 \uBB35\uC9C1\uD55C] AAA \uAC8C\uC784 \uC2DC\uB124\uB9C8\uD2F1 \uCEF7\uCC98\uB7FC \uBB34\uAC8C\uAC10 \uC788\uB294 \uC2DC\uC2A4\uD15C \uBA85\uB839\uC5B4 \uBB38\uCCB4\uB85C \uC624\uC9C1 '\uAE00\uC790 \uD68D\uC758 \uC704\uC5C4\uACFC \uC0B0\uC5C5\uC801 \uBC00\uB3C4'\uB9CC\uC744 \uC2DC\uAC01\uC801 \uC5B8\uC5B4\uB85C \uCE58\uD658\uD560 \uAC83.",
    keywords: "AAA game title logo, monumental brutalist typography, heavy industrial metal block, dramatic rim lighting, console game packaging aesthetic, bottom-heavy pillar structure",
    language: "massive monolithic block letterforms, bottom-heavy industrial proportions, dense pillar-like stems, compact counters, chamfer-inspired angular corners expressed only through the flat silhouette, authoritative AAA game title structure",
    weightTags: "(massive architectural pillar stems:1.5), (impenetrable thick monolithic structure:1.4), heavy bottom-heavy visual mass, compact counters",
    forbidden: "NO extreme thin lines, NO fragile broken elements, NO fluid organic curves, NO playful rounded shapes, NO calligraphic flourishes, NO neon glow"
  },
  {
    id: "core_blade",
    icon: /* @__PURE__ */ jsx(Swords, { className: "w-4 h-4 text-rose-400" }),
    nickname: "\uB2E4\uD06C \uD310\uD0C0\uC9C0",
    shortTitle: "\u2694\uFE0F \uB2E4\uD06C \uD310\uD0C0\uC9C0 \uC77C\uB7EC\uC2A4\uD2B8\uB808\uC774\uD130",
    subtitle: "\uC804\uD22C\uC801\uC774\uACE0 \uB0A0\uCE74\uB85C\uC6B4 \uC561\uC158 \uD0C0\uC774\uD2C0",
    role: `\uB108\uB294 \uB2E4\uD06C \uD310\uD0C0\uC9C0 \uC561\uC158 \uAC8C\uC784\uC758 \uD0A4 \uC544\uD2B8\uC640 \uBCF4\uC2A4 \uCEF7\uC52C \uD0C0\uC774\uD2C0\uC744 \uADF8\uB9AC\uB294 \uC77C\uB7EC\uC2A4\uD2B8\uB808\uC774\uD130\uC57C. \u3008Bloodborne\u3009, \u3008Dark Souls\u3009, \u3008Sekiro\u3009\uC758 \uBCF4\uC2A4 \uB4F1\uC7A5 \uD0C0\uC774\uD2C0\uCC98\uB7FC \uD55C \uD68D \uD55C \uD68D\uC774 \uAC80\uB0A0\uC778 \uAE00\uC790\uB97C \uC124\uACC4\uD574. \uCE94\uBC84\uC2A4\uC758 \uB808\uC774\uC544\uC6C3\uC774\uB098 \uD06C\uAE30 \uD655\uB300\uC5D0 \uAD00\uC5EC\uD558\uC9C0 \uB9D0\uACE0, \uC624\uC9C1 '\uAE00\uC790 \uD68D \uB0B4\uBD80\uC758 \uD150\uC158\uACFC \uB2E8\uBD80(Terminal)'\uC5D0\uB9CC \uC9D1\uC911\uD574. \uD68D\uC740 \uAC80\uC2E0, \uB05D\uB2E8\uC740 \uCE7C\uB0A0, \uB0B4\uBD80 \uACF5\uAC04\uC740 \uBCA0\uC778 \uC0C1\uCC98\uB85C \uC124\uACC4\uD558\uBA70 \uACF5\uACA9\uC801\uC778 \uB300\uAC01\uC120 \uCEF7\uACFC \uAE08\uC18D\uC131 \uAD6C\uC870\uAC10\uB9CC \uBD80\uC5EC\uD574.`,
    tone: "[\uC804\uD22C\uC801\uC774\uACE0 \uB0A0\uCE74\uB85C\uC6B4] \uAC80\uC774 \uD5C8\uACF5\uC744 \uAC00\uB974\uB4EF \uC11C\uB298\uD558\uACE0 \uACF5\uACA9\uC801\uC778 \uBB38\uCCB4\uB85C \uC624\uC9C1 '\uAE00\uC790 \uD68D\uC758 \uAE34\uC7A5\uAC10\uACFC \uAC15\uCCA0\uC758 \uBB3C\uC131'\uB9CC\uC744 \uBB18\uC0AC\uD560 \uAC83.",
    keywords: "dark fantasy action title, forged steel blade serif, weaponized typography, slash cuts, battle scar, gothic metal, aggressive razor terminals, boss encounter logo",
    language: "extreme thick-thin stroke contrast, razor-sharp incisive terminals slicing the negative space, controlled diagonal cuts within the letterforms, dark fantasy action-title silhouette, lethal geometric tension, narrow counters balanced against bold primary stems",
    weightTags: "(extreme thick-thin stroke contrast:1.5), (thin hairline strokes against bold stems:1.4), (calligraphic stroke weight variation:1.3), (razor-sharp blade incisive terminals:1.5), (aggressive space-slashing diagonal cuts:1.4), weaponized lethal geometry",
    forbidden: "NO soft rounded corners, NO heavy uniform blocky mass, NO uniform stem thickness, NO decorative floral ornaments, NO classical serifs, NO calligraphic curves, NO playful shapes"
  },
  {
    id: "core_relic",
    icon: /* @__PURE__ */ jsx(Landmark, { className: "w-4 h-4 text-amber-600" }),
    nickname: "\uD788\uC2A4\uD1A0\uB9AC",
    shortTitle: "\u{1F3DB}\uFE0F \uD788\uC2A4\uD1A0\uB9AC \uB514\uC790\uC774\uB108",
    subtitle: "\uACE0\uB300 \uBE44\uC11D\xB7\uD48D\uD654\xB7\uC720\uBB3C\uC758 \uBB34\uAC8C",
    role: `\uB108\uB294 \uBC15\uBB3C\uAD00 \uC804\uC2DC \uADF8\uB798\uD53D\uACFC \uC0AC\uADF9\xB7\uC5ED\uC0AC \uB2E4\uD050\uBA58\uD130\uB9AC \uD0C0\uC774\uD2C0\uC744 \uC124\uACC4\uD558\uB294 \uD788\uC2A4\uD1A0\uB9AC \uB514\uC790\uC774\uB108\uC57C. \uCC9C \uB144 \uD48D\uD654\uB41C \uBE44\uC11D\uC5D0\uC11C \uBC1C\uAD74\uB41C \uAE00\uC790\uCC98\uB7FC \u2014 \uADE0\uC5F4, \uCE68\uC2DD, \uBE44\uB300\uCE6D\uC774 \uAE00\uC790\uC758 \uC815\uCCB4\uC131\uC774 \uB418\uB3C4\uB85D \uC124\uACC4\uD574. \uCE94\uBC84\uC2A4 \uC804\uCCB4 \uBE44\uC728\uC774\uB098 \uACF5\uAC04\uC740 \uC0AC\uC6A9\uC790 \uC9C0\uC815 \uADF8\uB300\uB85C \uB450\uACE0, \uC624\uC9C1 '\uAE00\uC790 \uD45C\uBA74\uC758 \uC2DC\uAC04\uC131'\uC5D0\uB9CC \uC9D1\uC911\uD574. \uC644\uBCBD\uD55C \uB300\uCE6D\uC740 \uAC70\uBD80\uD558\uACE0, \uBD80\uC11C\uC9C4 \uD55C\uCABD\uC774 \uC758\uB3C4\uC801\uC778 \uBBF8\uD559\uC774 \uB418\uB3C4\uB85D \uD760\uC9D1\uACFC \uC190\uC0C1\uC744 \uC2E0\uC911\uD558\uAC8C \uBC30\uCE58\uD574.`,
    tone: "[\uACE0\uB300\uC801\uC774\uACE0 \uC2E0\uBE44\uB85C\uC6B4] \uC2DC\uAC04\uC758 \uD48D\uD30C\uC640 \uC720\uAE30\uC801 \uC190\uC0C1\uC744 \uBB18\uC0AC\uD558\uB294 \uACE0\uACE0\uD559\uC790\uC758 \uBCF4\uACE0\uC11C \uBB38\uCCB4\uB85C \uC624\uC9C1 '\uAE00\uC790 \uD45C\uBA74\uC758 \uADE0\uC5F4\uACFC \uBD80\uC7AC\uC758 \uD754\uC801'\uB9CC\uC744 \uC2DC\uAC01\uC801 \uC5B8\uC5B4\uB85C \uCE58\uD658\uD560 \uAC83.",
    keywords: "ancient stone inscription, archaeological relic typography, weathered carved monument, time-eroded asymmetry, lost civilization rune, patina and oxidation, broken hairline cracks",
    language: "ancient eroded silhouette with controlled irregular edge loss, intricate hairline 2D cracks contained inside the strokes, time-weathered asymmetry, archaeological inscription proportions, a few deliberate missing chips without breaking readability",
    weightTags: "(irregular ancient eroded silhouette:1.5), (time-weathered broken symmetry:1.4), (intricate hairline 2D cracks:1.3), controlled edge erosion",
    forbidden: "NO perfectly pristine modern vectors, NO sci-fi futuristic clean lines, NO flawless symmetry, NO neon glow, NO smooth glossy surfaces, NO playful rounded shapes"
  },
  {
    id: "core_glyph",
    icon: /* @__PURE__ */ jsx(Type, { className: "w-4 h-4 text-indigo-400" }),
    nickname: "\uD0C0\uC774\uD3EC\uADF8\uB798\uD37C",
    shortTitle: "\u{1F521} \uD0C0\uC774\uD3EC\uADF8\uB798\uD37C",
    subtitle: "\uD65C\uC790 \uB514\uC790\uC774\uB108\xB7\uC5E0\uBE14\uB7FC\xB7\uAD11\uD559 \uADE0\uD615",
    role: `\uB108\uB294 \uD65C\uC790 \uB514\uC790\uC778\uC744 30\uB144 \uD55C \uC2DC\uB2C8\uC5B4 \uD0C0\uC774\uD3EC\uADF8\uB798\uD37C\uC57C. Adrian Frutiger, Erik Spiekermann \uAC19\uC740 \uAC70\uC7A5\uC758 \uC2DC\uC810\uC5D0\uC11C \uAE00\uC790\uB97C \uC124\uACC4\uD574. \uCE94\uBC84\uC2A4\uC758 \uC804\uCCB4 \uBE44\uC728\uC774\uB098 \uC810\uC720\uC728\uC5D0\uB294 \uAD00\uC5EC\uD558\uC9C0 \uB9D0\uACE0, \uC624\uC9C1 '\uBB38\uC790\uAC00 \uD558\uB098\uC758 \uD1B5\uD569\uB41C \uC5E0\uBE14\uB7FC\xB7\uC2EC\uBCFC\uB85C \uC735\uD569\uB418\uB294 \uAD11\uD559 \uADE0\uD615'\uC5D0\uB9CC \uC9D1\uC911\uD574. \uC790\uAC04\uC744 \uB2EB\uACE0, \uB0B4\uBD80 \uACF5\uAC04(counter)\uC744 \uD3D0\uC1C4\uD558\uC5EC, \uBAA8\uB4E0 \uAE00\uC790\uAC00 \uB2E8\uC77C \uC778\uC7A5(\u5370\u7AE0)\uCC98\uB7FC \uBCF4\uC774\uB3C4\uB85D \uC735\uD569\uC2DC\uCF1C. \uAC70\uC7A5\uC758 \uC815\uBC00\uD568\uC73C\uB85C \uBAA8\uB4E0 \uACE1\uC120\uC774 \uC758\uB3C4\uC801\uC774\uB3C4\uB85D.`,
    tone: "[\uC815\uAD50\uD558\uACE0 \uC808\uC81C\uB41C] \uD65C\uC790 \uB514\uC790\uC774\uB108\uC758 \uB9E4\uB274\uC5BC \uBB38\uCCB4\uB85C \uC624\uC9C1 '\uAE00\uC790\uC758 \uAD11\uD559 \uADE0\uD615, \uB2EB\uD78C \uCE74\uC6B4\uD130, \uC5E0\uBE14\uB7FC \uC735\uD569 \uAD6C\uC870'\uB9CC\uC744 \uC2DC\uAC01\uC801 \uC5B8\uC5B4\uB85C \uCE58\uD658\uD560 \uAC83.",
    keywords: "master typeface design, monogram emblem fusion, closed counters, heraldic seal, optical balance, Adrian Frutiger influence, refined sophisticated typography",
    language: "highly fused symbolic emblem structure forming a unified seal, closed internal negative space counters interlocking into a heraldic mark, abstract typographic crest, monogram badge aesthetic, the letters merge into a single coherent silhouette like a guild insignia, precise optical compensation",
    weightTags: "(highly fused symbolic emblem structure:1.5), (closed internal negative space counters:1.4), heraldic monogram seal, refined optical balance",
    forbidden: "NO widely separated letters, NO loose airy spacing, NO simple handwriting, NO motion streaks, NO scattered debris, NO weathered damage"
  },
  {
    // 고딕/게임 로고 편향 보완용 — Constantine·Priest 류 실사 영화 타이틀 세리프.
    // 다른 페르소나들이 전부 묵직한 블록·검날·비석 계열이라 얇고 우아한 앤티크 세리프가
    // 나올 경로가 없었음. forbidden 으로 게임 로고의 블록 질량을 명시적으로 차단한다.
    id: "core_cinema",
    icon: /* @__PURE__ */ jsx(Film, { className: "w-4 h-4 text-stone-300" }),
    nickname: "\uC601\uD654 \uD0C0\uC774\uD2C0",
    shortTitle: "\u{1F3AC} \uC601\uD654 \uD0C0\uC774\uD2C0 \uB514\uC790\uC774\uB108",
    subtitle: "\uC2E4\uC0AC \uC601\uD654 \uD3EC\uC2A4\uD130 \xB7 \uC564\uD2F0\uD06C \uC138\uB9AC\uD504 \xB7 \uBBF8\uC2A4\uD130\uB9AC",
    role: `\uB108\uB294 \uD560\uB9AC\uC6B0\uB4DC \uC601\uD654 \uD3EC\uC2A4\uD130\uC758 \uBA54\uC778 \uD0C0\uC774\uD2C0 \uB808\uD130\uB9C1\uC744 \uC124\uACC4\uD558\uB294 \uD0C0\uC774\uD2C0 \uB514\uC790\uC774\uB108\uC57C. \u3008Constantine\u3009, \u3008Priest\u3009, \u3008The Da Vinci Code\u3009 \uAC19\uC740 \uC624\uCEEC\uD2B8\xB7\uC2A4\uB9B4\uB7EC \uC601\uD654 \uD0C0\uC774\uD2C0\uC744 \uB5A0\uC62C\uB9AC\uBA70 \uAE00\uC790\uB97C \uC124\uACC4\uD574. \uCE94\uBC84\uC2A4 \uBE44\uC728\uC774\uB098 \uC810\uC720\uC728\uC740 \uC0AC\uC6A9\uC790 \uAC12 \uADF8\uB300\uB85C \uB450\uACE0, \uC624\uC9C1 '\uC138\uB9AC\uD504 \uB300\uBB38\uC790\uC758 \uD488\uACA9\uACFC \uC138\uC6D4\uC758 \uC9C8\uAC10'\uC5D0\uB9CC \uC9D1\uC911\uD574. \uD68D\uC740 \uAC00\uB298\uACE0 \uC6B0\uC544\uD55C \uC138\uB9AC\uD504, \uD45C\uBA74\uC740 \uBBF8\uC138\uD558\uAC8C \uD48D\uD654\uB41C \uC564\uD2F0\uD06C \uAE08\uC18D\uC774\uB098 \uC789\uD06C \u2014 \uAC8C\uC784 \uB85C\uACE0\uC758 \uBB35\uC9C1\uD55C \uBE14\uB85D\uAC10\uC774 \uC544\uB2C8\uB77C \uC2E4\uC0AC \uC601\uD654 \uD3EC\uC2A4\uD130\uC758 \uC808\uC81C\uB41C \uBBF8\uC2A4\uD130\uB9AC\uB97C \uAE00\uC790\uC5D0 \uBD80\uC5EC\uD574.`,
    tone: "[\uC808\uC81C\uB418\uACE0 \uBBF8\uC2A4\uD130\uB9AC\uD55C] \uC601\uD654 \uD3EC\uC2A4\uD130 \uD06C\uB808\uB527 \uBE14\uB85D\uCC98\uB7FC \uC808\uC81C\uB41C \uBB38\uCCB4\uB85C \uC624\uC9C1 '\uC138\uB9AC\uD504 \uB300\uBB38\uC790\uC758 \uD488\uACA9, \uC790\uAC04\uC758 \uD638\uD761, \uD45C\uBA74\uC758 \uC138\uC6D4\uAC10'\uB9CC\uC744 \uC2DC\uAC01\uC801 \uC5B8\uC5B4\uB85C \uCE58\uD658\uD560 \uAC83.",
    keywords: "cinematic movie title lettering, weathered antique serif capitals, occult thriller poster, wide letter spacing, distressed elegant serif, live-action film logotype",
    language: "elegant thin-stroke serif letterforms with tapered refined terminals, wide airy tracking, restrained antique proportions, subtly distressed flat edges, cinematic occult-thriller title silhouette, sophisticated live-action film-title rhythm",
    weightTags: "(weathered antique serif capitals:1.4), (elegant thin-stroke serif letterforms:1.4), (cinematic movie title lettering:1.3), (wide airy letter tracking:1.2), subtly distressed edges",
    forbidden: "NO heavy blocky industrial mass, NO thick monolithic game-logo stems, NO playful rounded shapes, NO neon glow, NO futuristic sci-fi lines"
  },
  {
    id: "core_kinetic",
    icon: /* @__PURE__ */ jsx(Wind, { className: "w-4 h-4 text-sky-400" }),
    nickname: "\uBAA8\uC158",
    shortTitle: "\u26A1 \uBAA8\uC158 \uB514\uC790\uC774\uB108",
    subtitle: "\uBC29\uD5A5\uC131\xB7\uC18D\uB3C4\uAC10\xB7\uD0A4\uB124\uD2F1 \uD0C0\uC774\uD3EC",
    role: `\uB108\uB294 F1 \uB808\uC774\uC2F1\uACFC \uC561\uC158 \uC601\uD654\uC758 \uD0A4 \uBE44\uC8FC\uC5BC\uC744 \uB9CC\uB4DC\uB294 \uBAA8\uC158 \uB514\uC790\uC774\uB108\uC57C. \u3008Top Gun: Maverick\u3009, \u3008Mad Max\u3009\uC758 \uD0C0\uC774\uD2C0\uCC98\uB7FC \u2014 \uAE00\uC790\uAC00 \uC815\uC9C0\uD574 \uC788\uC5B4\uB3C4 \uD654\uBA74 \uBC16\uC73C\uB85C \uC9C8\uC8FC\uD558\uB294 \uB290\uB08C\uC774 \uB4E4\uB3C4\uB85D \uC124\uACC4\uD574. \uCE94\uBC84\uC2A4 \uBE44\uC728\uC774\uB098 \uC810\uC720\uC728\uC740 \uC0AC\uC6A9\uC790 \uAC12 \uADF8\uB300\uB85C \uB450\uACE0, \uC624\uC9C1 '\uAE00\uC790 \uD68D\uC758 \uBC29\uD5A5\uC131\uACFC \uD2B8\uB808\uC77C'\uC5D0\uB9CC \uC9D1\uC911\uD574. \uBAA8\uB4E0 stem \uC740 \uD48D\uB3D9 \uC2DC\uBBAC\uB808\uC774\uC158\uC744 \uD1B5\uACFC\uD55C \uAC83\uCC98\uB7FC \uB4A4\uB85C \uC4F8\uB824\uC57C \uD558\uACE0, \uBE44\uB300\uCE6D \uB9AC\uB4EC\uC73C\uB85C \uC815\uC9C0\uD654\uBA74 \uC548\uC5D0 \uC6B4\uB3D9\uB7C9\uC744 \uAC00\uB46C.`,
    tone: "[\uC5ED\uB3D9\uC801\uC774\uACE0 \uBE60\uB978] \uD48D\uB3D9 \uC2DC\uBBAC\uB808\uC774\uC158 \uB9AC\uD3EC\uD2B8\uCC98\uB7FC \uC6B4\uB3D9\uB7C9\uACFC \uBCA1\uD130\uB97C \uBB18\uC0AC\uD558\uB294 \uBB38\uCCB4\uB85C \uC624\uC9C1 '\uAE00\uC790 \uD68D\uC758 \uBC29\uD5A5\uC131\uACFC \uC18D\uB3C4 \uD754\uC801'\uB9CC\uC744 \uC2DC\uAC01\uC801 \uC5B8\uC5B4\uB85C \uCE58\uD658\uD560 \uAC83.",
    keywords: "kinetic motion typography, racing aerodynamic letterforms, swept-back italic shear, velocity streaks, F1 visual identity, action movie title, directional momentum",
    language: "aggressive forward directional momentum with swept-back stems, fluid asymmetric trailing rhythm built into the letter contours, aerodynamic flat typography, tapered horizontal extensions, racing-title silhouette, controlled italic shear with kinetic energy",
    weightTags: "(aggressive forward directional momentum:1.5), (fluid asymmetric trailing rhythm:1.4), (aerodynamic swept-back structure:1.3), tapered horizontal extensions",
    forbidden: "NO static perfectly vertical alignment, NO stiff blocky stability, NO heavy uniform weight, NO calligraphic ornaments, NO classical serifs"
  }
];

// src/apps/TypecoreSovereign/versions/current/constants/options.js
var staticOptions2 = {
  // 글자 모양 프리셋 — 결과물 "형태" 기준 (게임별 구분에서 개편).
  // 선택 시 획·마감·동세 옵션을 한 번에 세팅(SCRIPT_PRESETS)하고,
  // en 토큰이 프롬프트 본문에 스타일 힌트로 주입된다 (buildPromptIR 의 shapeStyleBlock).
  // enKo: 입력 텍스트에 한글이 있을 때 대신 쓰는 번안 토큰 — 라틴 전용 개념(fraktur·serif capitals)은
  //       모델이 한글에 매핑하지 못해 평범한 한글로 나오므로, 스타일의 조형 원리를 한글 획 언어로 풀어쓴다.
  // w: 주입 가중치 override (기본 1.3) — 한글 재해석처럼 강한 변환이 필요한 프리셋만 올린다.
  shapePresets: [
    { id: "Shape_Clean", name: "\uAE54\uB054 \uAE30\uBCF8", emoji: "\u2728", hint: "\uAD70\uB354\uB354\uAE30 \uC5C6\uB294 \uD45C\uC900\uD615", en: "clean modern refined letterform structure" },
    { id: "Shape_Massive", name: "\uBB35\uC9C1\uD55C \uBC14\uC704", emoji: "\u{1F5FF}", hint: "\uB450\uAECD\uACE0 \uC6C5\uC7A5\uD558\uAC8C", en: "monolithic massive stone-slab letterform structure" },
    { id: "Shape_Blade", name: "\uB0A0\uCE74\uB85C\uC6B4 \uCE7C\uB0A0", emoji: "\u2694\uFE0F", hint: "\uBCA0\uC77C \uB4EF \uC608\uB9AC\uD55C \uB05D", en: "aggressive blade-sharp slashing letterforms" },
    { id: "Shape_Thorn", name: "\uAC00\uC2DC \uB3CB\uCE5C", emoji: "\u{1F940}", hint: "\uBFB0\uC871\uD55C \uAC00\uC2DC \uC7A5\uC2DD", en: "thorn-spiked dark fantasy letterforms" },
    {
      id: "Shape_Elegant",
      name: "\uC6B0\uC544\uD55C \uC138\uB9AC\uD504",
      emoji: "\u{1F451}",
      hint: "\uACE0\uAE09\uC2A4\uB7EC\uC6B4 \uD074\uB798\uC2DD",
      en: "elegant sophisticated serif typography",
      enKo: "elegant refined Korean Myeongjo-style serif Hangul letterforms, tapered brush-derived serif terminals on every stroke, classical sophisticated Korean typography"
    },
    { id: "Shape_Round", name: "\uB465\uAE00\uB465\uAE00", emoji: "\u{1FAE7}", hint: "\uBD80\uB4DC\uB7FD\uACE0 \uCE5C\uADFC\uD558\uAC8C", en: "soft rounded friendly letterforms" },
    { id: "Shape_Speed", name: "\uC18D\uB3C4\uAC10", emoji: "\u{1F4A8}", hint: "\uB2EC\uB824\uB098\uAC00\uB294 \uAE30\uC6B8\uAE30", en: "dynamic italic speed-driven letterforms" },
    { id: "Shape_Brush", name: "\uBD93\uAE00\uC528", emoji: "\u{1F58C}\uFE0F", hint: "\uBD93\uC73C\uB85C \uADF8\uB9B0 \uD544\uCCB4", en: "expressive brush calligraphy strokes" },
    {
      id: "Shape_Blackletter",
      name: "\uBE14\uB799\uB808\uD130",
      emoji: "\u{1F3F0}",
      hint: "\uC911\uC138 \uACE0\uB515 \uC131\uC11C\uCCB4",
      w: "1.45",
      en: "blackletter fraktur gothic script, medieval calligraphic broken strokes with angular diamond serifs",
      enKo: "Hangul letterforms reinterpreted in medieval blackletter fraktur style, every Korean stroke drawn with a gothic broad-nib pen: broken angular calligraphic strokes, sharp diamond-shaped terminals, dense heavy vertical stems with extreme thick-thin contrast, cathedral manuscript density applied to Hangul jamo structure"
    },
    {
      id: "Shape_Cinema",
      name: "\uC601\uD654 \uD0C0\uC774\uD2C0",
      emoji: "\u{1F3AC}",
      hint: "\uC2E4\uC0AC \uC601\uD654 \uD3EC\uC2A4\uD130 \uC138\uB9AC\uD504",
      en: "weathered antique serif capitals, cinematic movie title lettering, wide letter spacing, subtly distressed serif edges",
      enKo: "weathered antique Korean Myeongjo-serif title lettering, cinematic live-action movie poster Hangul typography, thin elegant strokes with refined serif terminals, wide airy letter spacing, subtly distressed eroded stroke edges"
    },
    {
      id: "Shape_EditorialSans",
      name: "\uC5D0\uB514\uD1A0\uB9AC\uC5BC \uC0B0\uC2A4",
      emoji: "\u25B1",
      hint: "\uC870\uC6A9\uD55C \uD604\uB300 \uB4DC\uB77C\uB9C8 \uC0B0\uC138\uB9AC\uD504",
      narrative: true,
      en: "restrained contemporary editorial sans-serif title, neutral geometric skeleton, calm optical spacing, quiet cinematic proportions",
      enKo: "restrained contemporary Korean Gothic sans-serif title, neutral Hangul skeleton, calm optical spacing, quiet cinematic proportions"
    },
    {
      id: "Shape_LiterarySerif",
      name: "\uBB38\uD559\uC801 \uBA85\uC870",
      emoji: "\xB6",
      hint: "\uC808\uC81C\uB41C \uBB38\uD559\xB7\uC2DC\uB300\uADF9 \uBA85\uC870",
      narrative: true,
      en: "restrained literary serif title, refined book typography, measured contrast, generous editorial spacing",
      enKo: "restrained literary Korean Myeongjo title, refined book-derived Hangul structure, measured thick-thin contrast, generous editorial spacing"
    },
    {
      id: "Shape_Psychological",
      name: "\uC2EC\uB9AC \uC2A4\uB9B4\uB7EC",
      emoji: "\u25D0",
      hint: "\uD3D0\uC1C4\uC801\uC778 \uC5EC\uBC31\uACFC \uAE34\uC7A5\uAC10",
      narrative: true,
      en: "quiet psychological thriller title, condensed neutral sans-serif skeleton, controlled closed counters, subtle asymmetric tension",
      enKo: "quiet Korean psychological thriller title, condensed neutral Hangul skeleton, controlled narrow counters, subtle asymmetric tension"
    },
    {
      id: "Shape_PeriodHumanist",
      name: "\uC2DC\uB300\uADF9 \uD734\uBA38\uB2C8\uC2A4\uD2B8",
      emoji: "\u231B",
      hint: "\uC9C8\uAC10 \uC5C6\uC774 \uC2DC\uB300\uAC10\uB9CC \uB2F4\uC740 \uAE00\uC790",
      narrative: true,
      en: "humanist period-drama title, historically informed proportions, warm restrained stroke modulation, clean unweathered silhouette",
      enKo: "Korean humanist period-drama title, historically informed Hangul proportions, warm restrained stroke modulation, clean unweathered silhouette"
    },
    {
      id: "Shape_QuietThriller",
      name: "\uCF70\uC774\uC5B4\uD2B8 \uC2A4\uB9B4\uB7EC",
      emoji: "\u2301",
      hint: "\uD55C \uACF3\uB9CC \uBBF8\uC138\uD558\uAC8C \uBD88\uC548\uD55C \uAD6C\uC870",
      narrative: true,
      en: "minimal quiet-thriller title, pristine neutral base letterforms, one controlled structural anomaly, high negative-space discipline",
      enKo: "minimal Korean quiet-thriller title, pristine neutral Hangul base, one controlled structural anomaly, high negative-space discipline"
    }
  ],
  // 리터칭 "느낌 미세 조절" 축 — 양방향 슬라이더 (-2..+2, 0=유지).
  // 0 이 아닌 축만 프롬프트에 주입: ±1 → "subtly …" 1.15 가중치, ±2 → "noticeably …" 1.35 가중치.
  // 형태 95% 보존 락과 함께 쓰여 "원본을 지키면서 느낌만 살짝" 이라는 리터칭 본연의 목적을 표현.
  editFeelAxes: [
    { id: "sharpness", label: "\uB05D \uC608\uB9AC\uD568", left: "\uBD80\uB4DC\uB7FD\uAC8C", right: "\uB0A0\uCE74\uB86D\uAC8C", negEn: "softer rounder stroke terminals and tips", posEn: "sharper crisper stroke terminals and tips" },
    // 모서리 꺾임 — 획이 꺾이는 관절/코너의 각도 성격. 끝 예리함(terminal)과 별개 축:
    // "내부 균열 말고 모서리 꺾임의 예리함을 조정하고 싶다"는 요구로 신설.
    { id: "corner", label: "\uBAA8\uC11C\uB9AC \uAEBE\uC784", left: "\uB465\uAE00\uAC8C", right: "\uAC01\uC9C0\uAC8C", negEn: "softer rounded corner joints, smoothly curved stroke bends", posEn: "sharper more angular corner joints, crisp hard-edged stroke bends with acute fold angles" },
    { id: "weight", label: "\uD68D \uAD75\uAE30", left: "\uC587\uAC8C", right: "\uB450\uAECD\uAC8C", negEn: "thinner lighter stroke weight", posEn: "thicker heavier stroke weight" },
    { id: "texture", label: "\uD45C\uBA74 \uC9C8\uAC10", left: "\uB9E4\uB048\uD558\uAC8C", right: "\uAC70\uCE60\uAC8C", negEn: "cleaner smoother pristine stroke surface", posEn: "more weathered rough eroded surface texture" },
    { id: "motion", label: "\uB3D9\uC138", left: "\uCC28\uBD84\uD558\uAC8C", right: "\uC5ED\uB3D9\uC801\uC73C\uB85C", negEn: "calmer static stable letterform posture", posEn: "more dynamic kinetic tension across strokes" },
    { id: "ornament", label: "\uC7A5\uC2DD", left: "\uBBF8\uB2C8\uBA40", right: "\uD654\uB824\uD558\uAC8C", negEn: "more minimal simplified stroke detailing", posEn: "richer ornamental decorative stroke detailing" }
  ],
  // Purpose-Driven Presets (V18)
  purposes: [
    { id: "Purpose_GameLogo", name: "\uAC8C\uC784 \uBA54\uC778 \uB85C\uACE0\uD615", en: "AAA Game Title Logo", layout: "Center", ratio: "16:9", occ: "50%", core: "core_fortress", frame: "Emblem" },
    { id: "Purpose_BrandHero", name: "\uBE0C\uB79C\uB4DC\uC0AC\uC774\uD2B8 \uD788\uC5B4\uB85C\uD615", en: "Brand Hero Title", layout: "1Line", ratio: "2.76:1", occ: "40%", core: "core_fortress", frame: "Horizontal" },
    { id: "Purpose_PromoVisual", name: "\uD504\uB85C\uBAA8\uC158 \uC0C1\uB2E8 \uBE44\uC8FC\uC5BC", en: "Promotion Top Visual", layout: "TitleSub", ratio: "16:9", occ: "65%", core: "core_kinetic", frame: "Expanded" },
    { id: "Purpose_EventTitle", name: "\uC774\uBCA4\uD2B8 \uAC15\uB82C\uD55C \uD0C0\uC774\uD2C0", en: "High-impact Event Title", layout: "2Lines", ratio: "1:1", occ: "80%", core: "core_blade", frame: "Compressed" },
    { id: "Purpose_Symbol", name: "\uC2EC\uBCFC / \uC5E0\uBE14\uB7FC\uD615", en: "Symbolic Emblem", layout: "Center", ratio: "1:1", occ: "65%", core: "core_glyph", frame: "Emblem" }
  ],
  layoutPresets: [{ id: "WideTitle", name: "\uC640\uC774\uB4DC \uD0C0\uC774\uD2C0\uD615", en: "Wide Title Layout" }, { id: "CenterLogo", name: "\uC911\uC559 \uB85C\uACE0\uD615", en: "Center Logo Layout" }, { id: "CinematicPan", name: "\uC2DC\uB124\uB9C8\uD2F1 \uD30C\uB178\uB77C\uB9C8\uD615", en: "Cinematic Panorama Layout" }, { id: "TitleSubPre", name: "\uBA54\uC778(\uC0C1) + \uC11C\uBE0C(\uD558)", en: "Main Title + Subtitle Layout" }, { id: "SubTitlePre", name: "\uC11C\uBE0C(\uC0C1) + \uBA54\uC778(\uD558)", en: "Subtitle + Main Title Layout" }],
  base: [{ id: "BlackWhite", name: "\uBE14\uB799 / \uD654\uC774\uD2B8", en: "JET BLACK Background, RADIANT WHITE Subject" }, { id: "WhiteBlack", name: "\uD654\uC774\uD2B8 / \uBE14\uB799", en: "STARK WHITE Background, SOLID BLACK Subject" }],
  ratios: [{ id: "16:9", name: "16:9 \uC640\uC774\uB4DC", en: "16:9" }, { id: "1:1", name: "1:1 \uC2A4\uD018\uC5B4", en: "1:1" }, { id: "9:16", name: "9:16 \uC138\uB85C\uD615", en: "9:16" }, { id: "2.76:1", name: "2.76:1 \uC2DC\uB124\uB9C8\uD2F1", en: "2.76:1" }, { id: "2.39:1", name: "2.39:1 \uC2DC\uB124\uB9C8\uC2A4\uCF54\uD504", en: "2.39:1" }],
  occupancies: [
    { id: "40%", name: "40% \uC5B5\uC81C", en: "(bold typography centered with expansive negative space:1.4), (text occupying 40-50% of canvas width:1.3), vast negative space margins" },
    { id: "50%", name: "50% \uD45C\uC900", en: "(generous negative space margins:1.3), perfectly centered balanced layout" },
    { id: "65%", name: "65% \uD655\uC7A5", en: "moderate margins, screen filling text layout" },
    { id: "80%", name: "80% \uCD5C\uB300", en: "(extreme tight margins:1.4), (massive text pushing canvas edges:1.4)" }
  ],
  layouts: [{ id: "1Line", name: "1\uC904 \uC218\uD3C9 \uAC15\uC81C", en: "single horizontal row typography" }, { id: "2Lines", name: "2\uC904 \uC0C1\uD558 \uC815\uB82C", en: "Two-tier vertical stacked composition." }, { id: "TitleSub", name: "\uBA54\uC778(\uC0C1) + \uC11C\uBE0C(\uD558)", en: "Hierarchical composition. Main title on top." }, { id: "SubTitle", name: "\uC11C\uBE0C(\uC0C1) + \uBA54\uC778(\uD558)", en: "Hierarchical composition. Subtitle on top." }, { id: "Center", name: "\uC911\uC559 \uC9D1\uC911\uD615", en: "Centralized balanced composition." }],
  subTitleSizes: [{ id: "Sub_Small", name: "\uC18C\uD615 (30%)", en: "Subtitle is strictly 30% scale." }, { id: "Sub_Medium", name: "\uC911\uD615 (50%)", en: "Subtitle is strictly 50% scale." }, { id: "Sub_Large", name: "\uB300\uD615 (70%)", en: "Subtitle is strictly 70% scale." }, { id: "Sub_Equal", name: "\uB3D9\uC77C \uD06C\uAE30", en: "Both rows have equal font scale." }],
  proportions: [
    { id: "P_Std", name: "\uAE30\uBCF8\uD615 (\uC815\uBC29\uD615)", en: "(balanced letterform skeleton with natural horizontal proportions:1.4)" },
    { id: "P_Condensed", name: "\uC7A5\uCCB4\uD615 (\uAC00\uB85C\uD3ED \uCD95\uC18C \xB7 \uBA85\uC2DC \uC120\uD0DD)", en: "intentionally condensed tall aspect ratio with narrow glyph width" },
    { id: "P_Extended", name: "\uD655\uC7A5\uD615 (\uAC00\uB85C\uC7A5\uD3C9)", en: "(extended wide panoramic letterforms:1.5), heavily stretched horizontally" },
    { id: "P_FlatWide", name: "\uB0A9\uC791 \uC640\uC774\uB4DC\uD615", en: "(compress vertical stroke proportions:1.4), (horizontally extended character frame:1.4), (wide aspect ratio letterforms:1.5), (flat low-profile characters:1.3)" }
  ],
  MMOSilhouetteFramings: [{ id: "Auto", name: "\uC790\uB3D9", en: "Automatic silhouette framing" }, { id: "Horizontal", name: "\uC218\uD3C9\uD615", en: "Strict horizontal alignment framing" }, { id: "Compressed", name: "\uC555\uCD95\uD615", en: "Tightly compressed inner structure framing" }, { id: "Expanded", name: "\uD655\uC7A5\uD615", en: "Outwardly expanded wing-like framing" }, { id: "Emblem", name: "\uC5E0\uBE14\uB7FC\uD615", en: "Cohesive unified emblem framing" }],
  MMOSurroundingElements: [{ id: "Clean", name: "\uC5C6\uC74C", en: "NO surrounding VFX, perfectly clean canvas" }, { id: "FloatingRunes", name: "\uBD80\uC720\uD558\uB294 \uB8EC", en: "Floating geometric runes around text" }, { id: "Shattered", name: "\uD30C\uAD34\uB41C \uD30C\uD3B8", en: "Shattered stone and metal debris floating" }, { id: "RadialSpikes", name: "\uB9C8\uBC95 \uBC29\uC0AC\uC120", en: "Sharp radial energy spikes" }],
  stemWeights: [{ id: "Stem_Light", name: "\uAC00\uBCBC\uC6C0", en: "light razor thin stems" }, { id: "Stem_Std", name: "\uD45C\uC900", en: "medium balanced stems" }, { id: "Stem_Heavy", name: "\uBB35\uC9C1\uD568", en: "heavy thick stems" }, { id: "Stem_Ultra", name: "\uCD08\uC911\uB7C9", en: "massive ultra heavy block stems" }],
  letterConnections: [{ id: "Conn_Indep", name: "\uB3C5\uB9BD\uD615", en: "Cleanly separated individual characters" }, { id: "Conn_Tight", name: "\uBC00\uCC29\uD615", en: "Tightly packed characters" }, { id: "Conn_Partial", name: "\uBD80\uBD84 \uACB0\uD569", en: "Partially merged letter structures" }, { id: "Conn_Full", name: "\uC644\uC804 \uACB0\uD569", en: "Fully fused typographic emblem" }],
  internalSpaces: [{ id: "Space_Loose", name: "\uC5EC\uC720", en: "Spacious internal negative space counters" }, { id: "Space_Std", name: "\uD45C\uC900", en: "Standard internal space" }, { id: "Space_Dense", name: "\uC870\uBC00", en: "Dense complex internal structures" }, { id: "Space_Closed", name: "\uD3D0\uC1C4\uC801", en: "Closed solid internal mass, completely filled counters" }],
  logoDegrees: [{ id: "Logo_Low", name: "\uD14D\uC2A4\uD2B8 \uC911\uC2EC", en: "Text-focused typography" }, { id: "Logo_Std", name: "\uD45C\uC900 \uB85C\uACE0\uD0C0\uC785", en: "Standard logotype" }, { id: "Logo_High", name: "\uAC15\uD55C \uB85C\uACE0\uD654", en: "Highly stylized logotype" }, { id: "Logo_Emblem", name: "\uC644\uC804 \uC5E0\uBE14\uB7FC\uD615", en: "Unified emblem structure" }],
  kerningOptions: [{ id: "Kern_Loose", name: "\uC5EC\uC720 (+\uC5EC\uBC31)", en: "wide loose spacing" }, { id: "Kern_Std", name: "\uD45C\uC900", en: "standard balanced kerning" }, { id: "Kern_Tight", name: "\uD0C0\uC774\uD2B8 (-\uC5EC\uBC31)", en: "tight kerning" }, { id: "Kern_Overlap", name: "\uCD08\uBC00\uCC29 (\uC624\uBC84\uB7A9)", en: "high density overlapping letters" }],
  terminalStyles: [{ id: "Term_Clean", name: "\uB2E8\uBA74\uD615 (Clean)", en: "clean flat terminals" }, { id: "Term_Chisel", name: "\uC870\uAC01\uD615 (Chisel)", en: "(sharp chisel-cut terminals:1.3), acute terminal angles" }, { id: "Term_Blade", name: "\uCE7C\uB0A0\uD615 (Blade)", en: "(razor-sharp blade tip terminals:1.4), blade-sharp stroke endings, acute terminal angles" }, { id: "Term_Slab", name: "\uC11D\uD310\uD615 (Slab)", en: "heavy slab serifs" }, { id: "Term_Flare", name: "\uD50C\uB808\uC5B4", en: "elegant flared terminals" }, { id: "Term_Round", name: "\uB77C\uC6B4\uB4DC", en: "smooth rounded terminals" }, { id: "Term_Serif", name: "\uC138\uB9AC\uD504", en: "classic serif" }, { id: "Term_Thorn", name: "\uAC00\uC2DC \uC090\uCE68", en: "(sharp thorn terminals:1.3), acute thorn angles" }, { id: "Term_Claw", name: "\uC545\uB9C8 \uBC1C\uD1B1", en: "demonic claw terminals" }, { id: "Term_BrushFray", name: "\uD544\uC120\uD615 (Brush)", en: "frayed brush terminals" }],
  strokeTextures: [{ id: "Tex_Clean", name: "\uC644\uC804 \uB9E4\uB044\uB7EC\uC6C0", en: "perfectly smooth pristine vector surface" }, { id: "Tex_Frayed", name: "\uD544\uC120 \uAC08\uB77C\uC9D0", en: "frayed ink texture" }, { id: "Tex_Scorched", name: "\uD0C4\uD654\uB41C \uD544\uC120", en: "scorched etched texture" }, { id: "Tex_Subtle", name: "\uBBF8\uC138 \uCE68\uC2DD", en: "subtle weathered micro-erosion" }, { id: "Tex_DryBrush", name: "\uAC74\uC870\uD55C \uBD93\uACB0", en: "dry brush strokes" }],
  strokeSharpness: [{ id: "Sharp_Soft", name: "\uBD80\uB4DC\uB7EC\uC6C0", en: "softened edges" }, { id: "Sharp_Std", name: "\uD45C\uC900", en: "crisp clean edges" }, { id: "Sharp_Crisp", name: "\uB0A0\uCE74\uB85C\uC6C0", en: "(sharp clean lines:1.3)" }, { id: "Sharp_Razor", name: "\uADF9\uC608\uB9AC", en: "(micro-chiseled razor-sharp edges:1.4)" }],
  strokeExtensions: [{ id: "Ext_None", name: "\uC5F0\uC7A5 \uC5C6\uC74C", en: "contained terminals" }, { id: "Ext_Elegant", name: "\uC720\uB824\uD55C \uC5F0\uC7A5", en: "elegant tapered extensions" }, { id: "Ext_Razor", name: "\uB0A0\uCE74\uB85C\uC6B4 \uB05D\uB2E8", en: "razor-sharp stroke tails" }, { id: "Ext_Infinite", name: "\uBB34\uD55C \uD655\uC7A5", en: "hyper-extended stroke ends" }],
  kineticVelocities: [{ id: "Vel_Static", name: "\uC815\uC911\uB3D9 (Static)", en: "perfectly still, static form" }, { id: "Vel_Swift", name: "\uC9C8\uC8FC (Swift)", en: "dynamic forward momentum" }, { id: "Vel_Slashing", name: "\uACA9\uBCA0\uAE30 (Slashing)", en: "aggressive slashing momentum" }],
  slantAngles: [{ id: "Slant_0", name: "0\uB3C4 (\uC218\uC9C1)", en: "perfect verticality" }, { id: "Slant_Forward", name: "15\uB3C4 (\uAE30\uC6B8\uAE30)", en: "15-degree dynamic slant" }, { id: "Slant_Extreme", name: "25\uB3C4 (\uAE09\uACA9\uD568)", en: "Aggressive 25-degree slant" }],
  slicingIntensities: [{ id: "Slic_None", name: "\uC808\uB2E8 \uC5C6\uC74C", en: "intact strokes" }, { id: "Slic_Partial", name: "\uBD80\uBD84 \uC808\uB2E8", en: "micro-incisions and structural cuts" }, { id: "Slic_Diagonal", name: "\uC0AC\uC120 \uC808\uB2E8", en: "diagonal slicing" }, { id: "Slic_Deep", name: "\uAE4A\uC740 \uC808\uB2E8", en: "deep structural severance" }, { id: "Slic_Total", name: "\uC804\uCCB4 \uC808\uB2E8", en: "massive severance" }],
  cornerStyles: [{ id: "Corner_Right", name: "\uC9C1\uAC01", en: "sharp 90-degree right-angle corners" }, { id: "Corner_Round", name: "\uB465\uADFC\uD615", en: "smooth rounded corners" }, { id: "Corner_Wedge", name: "\uC410\uAE30\uD615", en: "wedge-shaped corners" }, { id: "Corner_Blade", name: "\uCE7C\uB0A0\uD615", en: "blade-like pointed corners" }],
  deformationDamages: [{ id: "Damage_None", name: "\uC0C1\uD0DC \uAE68\uB057\uD568", en: "pristine solid form, zero damage" }, { id: "Damage_Erosion", name: "\uBBF8\uC138 \uCE68\uC2DD", en: "(subtle surface grain texture:1.2)" }, { id: "Damage_Cracking", name: "\uADE0\uC5F4\uACFC \uC2E4\uAE08", en: "(intricate 2D crack pattern:1.3)" }],
  widths: [{ id: "Narrow", name: "\uC881\uAC8C", en: "condensed slim width" }, { id: "Normal", name: "\uD45C\uC900", en: "standard balanced width" }, { id: "Wide", name: "\uB113\uAC8C", en: "wide expansive width" }, { id: "UltraWide", name: "\uCD08\uAD11\uD3ED", en: "ultra wide panoramic width" }],
  editStrokeMods: [{ id: "E_Stroke_None", name: "\uAE30\uBCF8 \uC720\uC9C0", en: "Keep original stroke intact" }, { id: "E_Stroke_Angled", name: "\uAEBE\uC784/\uC608\uB9AC\uD568 \uAC15\uC870", en: "Sharpen joints and emphasize jagged edges" }, { id: "E_Stroke_Extended", name: "\uC5F0\uC7A5 \uB77C\uC778 \uCD94\uAC00", en: "Pull and extend key stroke terminals" }, { id: "E_Stroke_Thickened", name: "\uB450\uAED8 \uB300\uBE44 \uADF9\uB300\uD654", en: "Exaggerate thick/thin stroke contrast" }],
  editElementMods: [{ id: "E_Elem_None", name: "\uAE30\uBCF8 \uC720\uC9C0", en: "Maintain original structure" }, { id: "E_Elem_Object", name: "\uC624\uBE0C\uC81C\uD654/\uBB34\uAE30\uD654", en: "Morph focal letters into weapons/objects" }, { id: "E_Elem_Rhythm", name: "\uC720\uAE30\uC801 \uB9AC\uB4EC\uAC10", en: "Inject rhythmic flow and bounce" }, { id: "E_Elem_Disconnect", name: "\uC758\uB3C4\uC801 \uB2E8\uC808", en: "Introduce micro-gaps for fragmentation" }],
  editSurfaceMods: [{ id: "E_Surf_None", name: "\uAE30\uBCF8 \uC720\uC9C0", en: "Keep flat surface" }, { id: "E_Surf_Speed", name: "\uC18D\uB3C4\uAC10 \uD14D\uC2A4\uCC98", en: "Apply directional motion scratches" }, { id: "E_Surf_Dry", name: "\uBD80\uC2DD/\uAC70\uCE5C \uC9C8\uAC10", en: "Apply heavy weathered erosion" }, { id: "E_Surf_Crystalline", name: "\uACB0\uC815/\uD30C\uD3B8\uD654", en: "Render crystalline shattered debris" }]
};

// src/apps/TypecoreSovereign/versions/current/constants/utils.js
var getOptionEn2 = (list, id) => {
  if (!Array.isArray(list)) return "";
  const found = list.find((o) => o.id === id);
  return found?.en_desc || found?.en || found?.name || "";
};

// src/apps/TypecoreSovereign/versions/current/services/sovereignOptions.js
var DEFAULT_SOVEREIGN_OPTIONS = Object.freeze({
  stemWeight: "Stem_Heavy",
  charWidth: "Normal",
  charProportion: "P_Std",
  kerning: "Kern_Std",
  terminalStyle: "Term_Chisel",
  strokeTexture: "Tex_Clean",
  strokeSharpness: "Sharp_Std",
  strokeExtension: "Ext_None",
  cornerStyle: "Corner_Right",
  slantAngle: "Slant_0",
  kineticVelocity: "Vel_Static",
  slicingIntensity: "Slic_None",
  deformationDamage: "Damage_None",
  letterConnection: "Conn_Indep",
  internalSpace: "Space_Std",
  logoDegree: "Logo_Std"
});
var PERSONA_MODIFIERS = Object.freeze({
  core_fortress: { stemWeight: "Stem_Ultra", strokeTexture: "Tex_Clean", deformationDamage: "Damage_None" },
  core_blade: { stemWeight: "Stem_Heavy", terminalStyle: "Term_Blade", strokeSharpness: "Sharp_Razor", kineticVelocity: "Vel_Slashing" },
  core_relic: { deformationDamage: "Damage_Erosion", strokeTexture: "Tex_Subtle", letterConnection: "Conn_Indep" },
  core_glyph: { letterConnection: "Conn_Full", logoDegree: "Logo_Emblem", kerning: "Kern_Tight" },
  core_kinetic: { kineticVelocity: "Vel_Swift", slantAngle: "Slant_Forward", strokeExtension: "Ext_Razor" },
  core_cinema: { stemWeight: "Stem_Light", terminalStyle: "Term_Serif", strokeSharpness: "Sharp_Crisp", kerning: "Kern_Loose", strokeTexture: "Tex_Subtle" }
});
var SCRIPT_PRESETS = Object.freeze({
  Shape_Clean: { stemWeight: "Stem_Std", terminalStyle: "Term_Clean", strokeSharpness: "Sharp_Std", kineticVelocity: "Vel_Static", slantAngle: "Slant_0", charProportion: "P_Std", strokeTexture: "Tex_Clean" },
  Shape_Massive: { stemWeight: "Stem_Ultra", terminalStyle: "Term_Slab", strokeSharpness: "Sharp_Std", kineticVelocity: "Vel_Static", charWidth: "Wide" },
  Shape_Blade: { stemWeight: "Stem_Heavy", terminalStyle: "Term_Blade", strokeSharpness: "Sharp_Razor", kineticVelocity: "Vel_Slashing" },
  Shape_Thorn: { stemWeight: "Stem_Std", terminalStyle: "Term_Thorn", strokeSharpness: "Sharp_Razor", charProportion: "P_Condensed" },
  Shape_Elegant: { stemWeight: "Stem_Light", terminalStyle: "Term_Serif", strokeSharpness: "Sharp_Crisp", kineticVelocity: "Vel_Static" },
  Shape_Round: { stemWeight: "Stem_Heavy", terminalStyle: "Term_Round", strokeSharpness: "Sharp_Soft", cornerStyle: "Corner_Round" },
  Shape_Speed: { stemWeight: "Stem_Std", terminalStyle: "Term_Blade", strokeSharpness: "Sharp_Crisp", kineticVelocity: "Vel_Swift", slantAngle: "Slant_Forward" },
  Shape_Brush: { stemWeight: "Stem_Heavy", terminalStyle: "Term_BrushFray", strokeTexture: "Tex_DryBrush", kineticVelocity: "Vel_Swift" },
  Shape_Blackletter: { stemWeight: "Stem_Heavy", terminalStyle: "Term_Thorn", strokeSharpness: "Sharp_Crisp", charProportion: "P_Condensed", kerning: "Kern_Tight", cornerStyle: "Corner_Wedge" },
  Shape_Cinema: { stemWeight: "Stem_Light", terminalStyle: "Term_Serif", strokeSharpness: "Sharp_Crisp", strokeTexture: "Tex_Subtle", deformationDamage: "Damage_Erosion", kerning: "Kern_Loose", persona: "core_cinema" },
  Shape_EditorialSans: { stemWeight: "Stem_Std", terminalStyle: "Term_Clean", strokeSharpness: "Sharp_Crisp", strokeTexture: "Tex_Clean", deformationDamage: "Damage_None", kerning: "Kern_Loose", charProportion: "P_Std", letterConnection: "Conn_Indep", internalSpace: "Space_Loose", logoDegree: "Logo_Low", persona: "core_cinema", narrative: true },
  Shape_LiterarySerif: { stemWeight: "Stem_Light", terminalStyle: "Term_Serif", strokeSharpness: "Sharp_Crisp", strokeTexture: "Tex_Clean", deformationDamage: "Damage_None", kerning: "Kern_Loose", charProportion: "P_Std", letterConnection: "Conn_Indep", internalSpace: "Space_Loose", logoDegree: "Logo_Low", persona: "core_cinema", narrative: true },
  Shape_Psychological: { stemWeight: "Stem_Std", terminalStyle: "Term_Clean", strokeSharpness: "Sharp_Crisp", strokeTexture: "Tex_Clean", deformationDamage: "Damage_None", kerning: "Kern_Std", charProportion: "P_Condensed", letterConnection: "Conn_Indep", internalSpace: "Space_Dense", logoDegree: "Logo_Low", persona: "core_cinema", narrative: true },
  Shape_PeriodHumanist: { stemWeight: "Stem_Light", terminalStyle: "Term_Flare", strokeSharpness: "Sharp_Crisp", strokeTexture: "Tex_Clean", deformationDamage: "Damage_None", kerning: "Kern_Loose", charProportion: "P_Std", letterConnection: "Conn_Indep", internalSpace: "Space_Loose", logoDegree: "Logo_Low", persona: "core_cinema", narrative: true },
  Shape_QuietThriller: { stemWeight: "Stem_Std", terminalStyle: "Term_Clean", strokeSharpness: "Sharp_Crisp", strokeTexture: "Tex_Clean", deformationDamage: "Damage_None", kerning: "Kern_Loose", charProportion: "P_Condensed", letterConnection: "Conn_Indep", internalSpace: "Space_Std", logoDegree: "Logo_Low", persona: "core_cinema", narrative: true }
});
function resolveSovereignOptions({ archetype = "core_fortress", preset = "", overrides = {} } = {}) {
  const presetOptions = SCRIPT_PRESETS[preset] || {};
  const resolvedArchetype = presetOptions.persona || archetype;
  const presetFields = { ...presetOptions };
  delete presetFields.persona;
  return {
    archetype: resolvedArchetype,
    preset,
    options: {
      ...DEFAULT_SOVEREIGN_OPTIONS,
      ...PERSONA_MODIFIERS[resolvedArchetype] || {},
      ...presetFields,
      ...overrides
    }
  };
}

// src/apps/TypecoreSovereign/versions/current/services/compileSovereignImagenPrompt.js
var cleanPromptToken = (value) => String(value || "").replace(/\(([^()]+?):\s*[\d.]+\)/g, "$1").replace(/\bNO\s+/gi, "avoid ").replace(/\s+/g, " ").trim();
function compileSovereignImagenPrompt({
  ir,
  isEnhanceModeEnabled = true,
  enhanceMode = "refine",
  surroundingMode = "Clean"
}) {
  if (!ir?.inputText || !ir?.activeCoreData) throw new Error("Sovereign prompt IR requires inputText and activeCoreData");
  const G = cleanPromptToken;
  const renderSurface = ir.hasTexture || ir.hasDamage ? `Apply only this flat, ink-like surface treatment inside the letter silhouettes: ${G(ir.surfaceEn)}. It must not create lighting, depth, bevels, or realistic material volume.` : "Use a perfectly uniform, opaque, matte fill with clean vector-like edges and no surface modulation.";
  const renderSurrounding = surroundingMode === "Clean" ? "Keep the area around the typography completely empty. Do not add symbols, particles, debris, frames, or scenery." : `Use the selected surrounding element sparingly and keep it clearly secondary to the readable title: ${G(ir.mmoSurroundingElementEn)}.`;
  return `Create one production-ready flat 2D typography logo asset.

TEXT \u2014 highest priority:
Render exactly this text and nothing else: "${ir.inputText}". Preserve every character, spelling, line break, and reading order. Do not add, omit, translate, or substitute characters.

LETTERFORM DESIGN:
Create custom-drawn letterforms based on ${ir.activeCoreData.shortTitle}. ${G(ir.activeCoreData.language)}. ${ir.shapeStyleEn ? `Shape direction: ${G(ir.shapeStyleEn)}.` : ""} Use ${G(ir.weightEn)}, ${G(ir.widthEn)}, ${G(ir.proportionEn)}, ${G(ir.kerningEn)}, ${G(ir.letterConnEn)}, and ${G(ir.internalSpaceEn)}. Edge treatment: ${G(ir.terminalEn)}, ${G(ir.sharpnessEn)}, ${G(ir.cornerEn)}, ${G(ir.extensionEn)}. ${ir.userAuraEn !== "Standard deployment" ? `Creative intent: ${G(ir.userAuraEn)}.` : ""}

CONTROLLED MODIFICATION:
${isEnhanceModeEnabled ? `Use ${enhanceMode} mode within a ${ir.modIntensityEn} change budget. Allowed: ${G(ir.modAllowedEn)} Forbidden: ${G(ir.modForbiddenEn)} Maintain at least ${ir.readabilityFloorEn} readability.` : "Keep the structure controlled, coherent, and highly readable."} ${ir.momentumActive ? `Apply controlled motion through ${G(ir.kineticEn)}, ${G(ir.slantEn)}, and ${G(ir.slicingEn)}, without changing the text.` : ""}
${ir.narrativeDirectiveEn ? `
${ir.narrativeDirectiveEn}` : ""}

COMPOSITION:
${ir.cgTextInstruction}. ${G(ir.layoutEn)} ${G(ir.mmoSilhouetteEn)}. The typography occupancy is ${G(ir.occupancyEn)}. Use ${ir.aspectRatio} canvas framing and keep comfortable margins on every side.

COLOR AND SURFACE:
${ir.bgDescEn}. Use exactly two flat colors with hard separation. ${renderSurface}

SURROUNDINGS:
${renderSurrounding}

ABSOLUTE RESTRICTIONS:
This is a front-facing flat graphic, not a photograph and not a 3D render. Do not create extrusion, bevel, embossing, perspective, shadows, highlights, gradients, glow, bloom, atmospheric effects, realistic materials, environmental backgrounds, mockups, or extra text. Keep the native uniform solid background and a crisp, readable silhouette suitable for later material rendering.`;
}

// src/apps/FrameForge/frameforgeAxes.js
var COMPLETE_AXES = {
  assetType: {
    label: "\uC0AC\uC6A9 \uC6A9\uB3C4",
    pick: true,
    opts: [
      { key: "button", ko: "\uBC84\uD2BC", en: "an empty horizontal game menu button frame" },
      { key: "box", ko: "\uBC15\uC2A4", en: "an empty game UI content box or panel frame" },
      { key: "frame", ko: "\uD504\uB808\uC784", en: "an empty decorative game UI frame" },
      { key: "badge", ko: "\uBC30\uC9C0", en: "an empty compact game UI badge frame" },
      { key: "divider", ko: "\uB514\uBC14\uC774\uB354", en: "a single straight horizontal game UI divider line" },
      { key: "icon", ko: "\uC544\uC774\uCF58", en: "a single standalone game UI icon glyph, no frame, no background plate" },
      // 브랜드웹 라이브러리 조사(2026-09)에서 빈도 높았던 두 부류 — 타이틀·섹션 장식과 아이템 슬롯.
      { key: "ornament", ko: "\uC7A5\uC2DD", en: "a standalone decorative ornament element for a game promotion website (title flourish, section rule ornament, corner set or navigation marker) with no frame, no box and no plate" },
      { key: "slot", ko: "\uC544\uC774\uD15C \uC2AC\uB86F", en: "an empty game UI item slot or holder frame whose center stays open for an item icon" }
    ]
  },
  preset: {
    label: "\uC2A4\uD0C0\uC77C",
    opts: [
      { key: "dragon_slayer", ko: "\uB4DC\uB798\uACE4 \uC2AC\uB808\uC774\uC5B4", en: "restrained dragon-slayer accents, abstract mirrored dragon cues localized only at the four corners" },
      { key: "royal_crest", ko: "\uC655\uAC00 \uBB38\uC7A5", en: "fallen royal dynasty crest, crown-like heraldic ornaments and restrained fleur-de-lis details" },
      { key: "black_thorn", ko: "\uD751\uCCA0 \uAC00\uC2DC", en: "black iron thorn armor, blade-like spikes and severe gothic corner guards" },
      // "룬 문자" 직접 요청이 결과물에 실제 룬 글자를 만들던 원인 → 추상 기하 홈 패턴으로 재정의.
      { key: "ancient_rune", ko: "\uACE0\uB300 \uAC01\uC778", en: "ancient clan engraving style \u2014 abstract geometric groove patterns and notches carved into austere medieval metal border segments, evoking rune aesthetics WITHOUT any actual rune characters or letter-like symbols" },
      { key: "minimal_gold", ko: "\uBBF8\uB2C8\uBA40 \uACE8\uB4DC", en: "minimal luxury gold trim with one soft highlight and no figurative ornament" },
      { key: "soft_glow", ko: "\uC18C\uD504\uD2B8 \uAE00\uB85C\uC6B0", en: "clean soft-glowing rim with rounded modern fantasy restraint" },
      { key: "parchment", ko: "\uC591\uD53C\uC9C0", en: "lightly aged parchment edge with simple folded corners and no dense decoration" },
      { key: "nature", ko: "\uC790\uC5F0 \uC815\uB839", en: "restrained leaf and spirit-light accents localized to two corners" },
      { key: "arcane", ko: "\uC544\uCF00\uC778 \uB9C8\uBC95", en: "one subtle arcane glow line and a small central glowing geometric accent \u2014 an abstract shape, never a rune or character" },
      { key: "dark_minimal", ko: "\uB2E4\uD06C \uBBF8\uB2C8\uBA40", en: "plain charcoal surface, precise thin border and almost no ornament" },
      { key: "modern_ui", ko: "\uBAA8\uB358 UI", en: "clean contemporary product-UI styling \u2014 flat calm surfaces, ONE restrained thin border line as the only decoration, generous negative space; explicitly NOT futuristic: no sci-fi glow, no neon, no holographic effects, no tech greebles, no angular chamfer patterns" },
      { key: "red_lacquer", ko: "\uBD89\uC740 \uCE60\uAE30", en: "restrained deep-red lacquer with narrow aged-gold edge accents" },
      { key: "crystal", ko: "\uD06C\uB9AC\uC2A4\uD0C8", en: "clean translucent crystal rim with sparse controlled highlights" },
      // ─── 브랜드웹 톤 5종 — 리니지M/리니지/리니지2M(골드 헤어라인), 아이온2(백청 광휘), 리니지클래식(붉은 왕가), TL(서리 은청), 룩북(모던 네온)
      { key: "gold_hairline", ko: "\uBE0C\uB79C\uB4DC\uC6F9 \uACE8\uB4DC \uD5E4\uC5B4\uB77C\uC778", en: "brand-web gold hairline \u2014 ultra-thin aged-gold hairline rails over a translucent charcoal surface, tiny corner ticks as the only decoration, calm and premium" },
      { key: "celestial", ko: "\uBC31\uCCAD \uAD11\uD718", en: "celestial light \u2014 pale silver-white rails with a soft cool cyan glow, sparse tiny sparkle accents, airy and luminous, no heavy metal" },
      { key: "crimson_royal", ko: "\uBD89\uC740 \uC655\uAC00", en: "crimson royal \u2014 deep crimson lacquer surfaces edged with a slim aged-gold hairline, small pointed accents at the ends, regal and severe" },
      { key: "frost_silver", ko: "\uC11C\uB9AC \uC740\uCCAD", en: "frost silver \u2014 cool matte silver hairline rails with a faint icy-blue glow, minimal ornament, quiet and modern-classic" },
      { key: "modern_neon", ko: "\uBAA8\uB358 \uB124\uC628 (\uB8E9\uBD81)", en: "modern neon lookbook \u2014 flat magenta-to-violet gradient surfaces, sharp diagonal cuts, no ornament, fashion-editorial flatness" }
    ]
  },
  silhouette: {
    label: "\uD615\uD0DC",
    opts: [
      { key: "button_hex_3", ratio: "21:9", for: ["button"], ko: "\uBFB0\uC871 \uC721\uAC01 3:1", en: "an elongated 3:1 pointed hexagon menu-button frame with sharp spear-tip ends" },
      { key: "button_hex_4", ratio: "21:9", for: ["button"], ko: "\uBFB0\uC871 \uC721\uAC01 4:1", en: "an ultra-wide 4:1 pointed hexagon button frame" },
      { key: "button_cut", ratio: "21:9", for: ["button"], ko: "\uCEF7\uCF54\uB108 \uBC84\uD2BC", en: "an elongated 3:1 button with precise clipped corners" },
      { key: "button_pill", ratio: "21:9", for: ["button"], ko: "\uD544 \uBC84\uD2BC", en: "a clean horizontal pill-shaped button" },
      { key: "button_stadium", ratio: "21:9", for: ["button"], ko: "\uC88C\uC6B0 \uC6D0\uD615", en: "a wide stadium-shaped button frame whose left and right ends are perfect full semicircles \u2014 true capsule geometry with the end radius equal to half the button height, never just softly rounded corners" },
      { key: "button_round", ratio: "21:9", for: ["button"], ko: "\uB77C\uC6B4\uB4DC \uBC84\uD2BC", en: "a wide softly rounded rectangular button" },
      { key: "box_landscape", ratio: "16:9", for: ["box"], ko: "\uAC00\uB85C \uBC15\uC2A4", en: "a wide landscape content box with a large usable interior" },
      { key: "box_square", ratio: "1:1", for: ["box"], ko: "\uC815\uC0AC\uAC01 \uBC15\uC2A4", en: "a square content box with a large usable interior" },
      { key: "box_portrait", ratio: "3:4", for: ["box"], ko: "\uC138\uB85C \uBC15\uC2A4", en: "a tall portrait content box with a large usable interior" },
      { key: "box_tab", ratio: "4:3", for: ["box"], ko: "\uD0ED \uBC15\uC2A4", en: "a rectangular content box with one small integrated top tab" },
      { key: "box_banner", ratio: "3:4", for: ["box"], ko: "\uD589\uC789 \uBC15\uC2A4", en: "a hanging banner-shaped content box with a pointed lower edge" },
      { key: "frame_wide", ratio: "16:9", for: ["frame"], ko: "\uC640\uC774\uB4DC \uD504\uB808\uC784", en: "a wide 16:9 decorative frame with a large open center" },
      { key: "frame_square", ratio: "1:1", for: ["frame"], ko: "\uC815\uC0AC\uAC01 \uD504\uB808\uC784", en: "a square decorative frame with a large open center" },
      { key: "frame_portrait", ratio: "3:4", for: ["frame"], ko: "\uC138\uB85C \uD504\uB808\uC784", en: "a portrait decorative frame with a large open center" },
      { key: "circle_plate", ratio: "1:1", for: ["frame"], ko: "\uC6D0\uD615 \uC7A5\uC2DD \uC0AC\uAC01\uD310", en: "a rectangular UI plate incorporating a circular medallion or round ornament" },
      { key: "perfect_circle", ratio: "1:1", for: ["frame", "badge"], ko: "\uC644\uC804\uD55C \uC6D0", en: "one mathematically perfect circular silhouette, equal width and height, with no square or rectangular backing plate" },
      { key: "oval", ratio: "4:3", for: ["frame", "badge"], ko: "\uD0C0\uC6D0\uD615", en: "a wide oval frame with a clean center and no rectangular backing" },
      { key: "badge_shield", ratio: "1:1", for: ["badge"], ko: "\uBC29\uD328 \uBC30\uC9C0", en: "a compact shield-shaped badge frame" },
      { key: "badge_hex", ratio: "1:1", for: ["badge"], ko: "\uC721\uAC01 \uBC30\uC9C0", en: "a compact regular hexagonal badge frame" },
      { key: "badge_ribbon", ratio: "16:9", for: ["badge"], ko: "\uB9AC\uBCF8 \uBC30\uC9C0", en: "a compact ribbon-shaped badge frame" },
      { key: "divider_line", ratio: "21:9", for: ["divider"], ko: "\uC77C\uC9C1\uC120", en: "one perfectly straight horizontal separator line" },
      // ─── 아이콘 (화살표 · 스크롤다운) ───
      { key: "icon_arrow_right", ratio: "1:1", for: ["icon"], ko: "\uD654\uC0B4\uD45C (\uC624\uB978\uCABD)", en: "a single bold arrow icon pointing right, clean triangular arrowhead with a short straight tail, instantly readable silhouette" },
      { key: "icon_arrow_down", ratio: "1:1", for: ["icon"], ko: "\uD654\uC0B4\uD45C (\uC544\uB798)", en: "a single bold arrow icon pointing straight down, clean triangular arrowhead with a short straight tail" },
      { key: "icon_arrow_back", ratio: "1:1", for: ["icon"], ko: "\uD654\uC0B4\uD45C (\uB4A4\uB85C)", en: "a single bold back-arrow icon pointing left, clean triangular arrowhead with a short straight tail" },
      { key: "icon_scroll_down", ratio: "1:1", for: ["icon"], ko: "\uC2A4\uD06C\uB864 \uB2E4\uC6B4 (\uC170\uBE0C\uB860)", en: "a scroll-down indicator icon made of two stacked downward chevrons, the lower chevron slightly smaller and fainter, clean game UI style" },
      { key: "icon_scroll_mouse", ratio: "1:1", for: ["icon"], ko: "\uC2A4\uD06C\uB864 \uB2E4\uC6B4 (\uB9C8\uC6B0\uC2A4)", en: "a scroll-down indicator icon: a slim rounded mouse outline with a small inner scroll dot and one downward chevron beneath it" },
      { key: "icon_chevron_down", ratio: "1:1", for: ["icon"], ko: "\uC170\uBE0C\uB860 (\uC544\uB798)", en: "a single clean downward chevron icon with crisp mitered joints and consistent stroke weight" },
      { key: "icon_nav_prev", ratio: "1:1", for: ["icon"], ko: "\uC774\uB3D9 (\uC67C\uCABD)", en: 'a single clean left-pointing navigation chevron icon for a previous/back UI control \u2014 one crisp mitered chevron with consistent stroke weight, no tail, instantly readable as "go left" in a carousel or pager' },
      { key: "icon_nav_next", ratio: "1:1", for: ["icon"], ko: "\uC774\uB3D9 (\uC624\uB978\uCABD)", en: 'a single clean right-pointing navigation chevron icon for a next/forward UI control \u2014 one crisp mitered chevron with consistent stroke weight, no tail, instantly readable as "go right" in a carousel or pager' },
      { key: "icon_play", ratio: "1:1", for: ["icon"], ko: "\uC7AC\uC0DD (\uD50C\uB808\uC774)", en: "a single media play icon \u2014 one clean right-pointing triangle, video play button glyph, crisp even edges" },
      { key: "icon_play_circle", ratio: "1:1", for: ["icon"], ko: "\uC601\uC0C1 \uD50C\uB808\uC774 (\uC6D0\uD615)", en: "a video play button icon: a right-pointing play triangle centered inside a clean circular ring, classic media player play glyph, balanced and instantly readable" },
      // ─── 브랜드웹 조사 기반 추가 (2026-09) — 버튼 변형
      { key: "button_ornate_caps", ratio: "21:9", for: ["button"], ko: "\uC7A5\uC2DD \uC5D4\uB4DC\uCEA1 CTA", en: "a wide 4:1 call-to-action button frame with a plain dark center bar and two mirrored sculpted ornamental end caps at the far left and right, slim top and bottom rails" },
      { key: "button_ribbon_arrow", ratio: "21:9", for: ["button"], ko: "\uB9AC\uBCF8 \uD654\uC0B4\uCD09 \uBC84\uD2BC", en: "a wide ribbon-shaped button whose left and right ends are cut into sharp swallow-tail arrow notches, slim rails and a flat center panel" },
      { key: "button_outline_pill", ratio: "21:9", for: ["button"], ko: "\uC544\uC6C3\uB77C\uC778 \uD544 (\uBCF4\uC870)", en: "a small secondary text button \u2014 a slim hairline-outlined pill with a translucent dark fill and no ornament, for short labels such as notice or coupon lookup" },
      { key: "button_side_tab", ratio: "3:4", for: ["button"], ko: "\uC0AC\uC774\uB4DC \uD50C\uB85C\uD305 \uD0ED", en: "a vertical floating side tab that clings to the right screen edge \u2014 a tall narrow plate with a folded diamond-shaped left tip, an empty center for two short lines of text" },
      { key: "button_circle_icon", ratio: "1:1", for: ["button"], ko: "\uC6D0\uD615 \uC544\uC774\uCF58 \uBC84\uD2BC", en: "a small round icon button \u2014 one thin circular ring over a translucent dark disc with an empty center for a plus or arrow glyph" },
      { key: "button_pager", ratio: "21:9", for: ["button"], ko: "\uD398\uC774\uC9C0\uB124\uC774\uC158 \uD544", en: "a compact pagination pill with a slim outline, a small left-arrow zone and right-arrow zone at the two ends and an empty center for a page counter" },
      { key: "button_text_ends", ratio: "21:9", for: ["button"], ko: "\uD14D\uC2A4\uD2B8 \uB9C1\uD06C \uC591\uB05D \uC7A5\uC2DD", en: "a minimal text-link treatment \u2014 two tiny mirrored decorative ticks at the far left and far right with a completely empty middle where a short label sits, no box and no fill" },
      // ─── 박스 변형
      { key: "box_modal", ratio: "4:3", for: ["box"], ko: "\uBAA8\uB2EC \uB2E4\uC774\uC5BC\uB85C\uADF8", en: "a modal dialog panel \u2014 a rectangular translucent dark panel with a slim border, a thin header rule near the top, a small empty square zone at the top-right corner for a close glyph and a large empty body" },
      { key: "box_list_row", ratio: "21:9", for: ["box"], ko: "\uB9AC\uC2A4\uD2B8 \uD589", en: "a single horizontal list-row panel \u2014 a wide low rectangle with a slim border, a small square icon well at the left end and an empty text area on the right" },
      { key: "box_parchment_seal", ratio: "3:4", for: ["box"], ko: "\uC591\uD53C\uC9C0 + \uB9AC\uBCF8 \uBD09\uC778", en: "an aged parchment scroll panel with softly torn edges and one small red ribbon carrying a round wax seal centered on the top edge, large empty body" },
      { key: "box_card_portrait", ratio: "3:4", for: ["box"], ko: "\uC138\uB85C \uCE74\uB4DC (\uC0C1\uB2E8 \uC7A5\uC2DD)", en: "a tall portrait card frame with slim rails, one small mirrored ornament centered on the top rail, an empty image area above and an empty caption area below" },
      { key: "box_tabstrip", ratio: "16:9", for: ["box"], ko: "\uD0ED \uC2A4\uD2B8\uB9BD \uD328\uB110", en: "a content panel whose top edge carries a tab strip \u2014 three equal empty tab zones separated by thin vertical ticks, the first tab marked by a thin glowing underline, and a large empty body panel beneath" },
      { key: "box_glass", ratio: "16:9", for: ["box"], ko: "\uC2A4\uBAA8\uD06C \uC720\uB9AC \uD328\uB110", en: "a translucent smoked-glass content panel with a hairline border and four tiny corner ticks, large empty interior" },
      // ─── 프레임 변형
      { key: "frame_bracket_corners", ratio: "16:9", for: ["frame"], ko: "\uCF54\uB108 \uBE0C\uB798\uD0B7", en: "four slim L-shaped corner brackets only \u2014 no continuous rails; the four corners of a wide rectangle marked by short mitered bracket strokes, completely open center" },
      { key: "frame_banner_ornate", ratio: "16:9", for: ["frame"], ko: "\uBC30\uB108 \uD504\uB808\uC784 (\uCF54\uB108 \uAD11 \uC7A5\uC2DD)", en: "a wide 2:1 banner image frame with slim rails and small glowing ornamental flourishes at the four corners, completely open center for a picture" },
      { key: "frame_media", ratio: "16:9", for: ["frame"], ko: "\uC601\uC0C1 \uD504\uB808\uC784", en: "a wide 16:9 media frame with slim rails, a small centered notch on the bottom rail for a caption and a completely open center for video" },
      // ─── 배지 변형
      { key: "badge_round_tag", ratio: "1:1", for: ["badge"], ko: "\uC6D0\uD615 \uD0DC\uADF8 (HOT)", en: "a small round tag badge \u2014 one solid circular disc with a slim rim and a soft outer glow, empty center for a two-letter label" },
      { key: "badge_corner_ribbon", ratio: "1:1", for: ["badge"], ko: "\uBAA8\uC11C\uB9AC \uB9AC\uBCF8 \uD0DC\uADF8", en: "a small folded corner ribbon tag hanging from the top-left corner of a card \u2014 a short vertical ribbon with a notched bottom end and an empty face for a tiny label" },
      { key: "badge_count_pill", ratio: "21:9", for: ["badge"], ko: "\uCE74\uC6B4\uD2B8 \uD544 (x300)", en: "a small count-tag pill with a slim rim and a translucent dark fill, wide and low, empty center for a multiplier label" },
      { key: "badge_wax_seal", ratio: "1:1", for: ["badge"], ko: "\uBC00\uB78D \uBD09\uC778", en: "a round wax seal with soft irregular edges and a slim inner ring, an empty flat center disc, no letters" },
      { key: "badge_pennant", ratio: "2:3", for: ["badge"], ko: "\uD39C\uB10C\uD2B8 \uAE43\uBC1C", en: "a hanging pennant flag badge \u2014 a tall vertical banner with a small crossbar at the top and a pointed lower tip, slim edge trim, empty face" },
      { key: "badge_medallion", ratio: "1:1", for: ["badge"], ko: "\uBA54\uB2EC\uB9AC\uC628 \uC5E0\uBE14\uB7FC \uD310", en: "a round medallion emblem plate \u2014 a perfect circular disc with a slim double ring and an empty center reserved for an emblem" },
      { key: "badge_callout", ratio: "4:3", for: ["badge"], ko: "\uB9D0\uD48D\uC120 \uCF5C\uC544\uC6C3", en: "a small speech-bubble callout badge with a slim rim and a tiny pointer tail at the bottom, empty center" },
      // ─── 디바이더 변형
      { key: "divider_center_gem", ratio: "21:9", for: ["divider"], ko: "\uC911\uC559 \uBCF4\uC11D \uB77C\uC778", en: "a wide thin horizontal separator line with one small diamond-shaped gem at the exact center and both ends fading out softly" },
      { key: "divider_ornate", ratio: "21:9", for: ["divider"], ko: "\uC911\uC559 \uD50C\uB7EC\uB9AC\uC2DC \uB77C\uC778", en: "a wide thin horizontal separator line with one small mirrored flourish at the center and tiny tapered ends" },
      { key: "divider_timeline", ratio: "21:9", for: ["divider"], ko: "\uD0C0\uC784\uB77C\uC778 (\uB178\uB4DC 7)", en: "a wide thin horizontal timeline line carrying seven small evenly spaced diamond nodes, the center node slightly larger, both ends fading out" },
      // ─── 장식 (ornament) — 타이틀·섹션·내비
      { key: "orn_title_sides", ratio: "21:9", for: ["ornament"], ko: "\uD0C0\uC774\uD2C0 \uC88C\uC6B0 \uC7A5\uC2DD \uB77C\uC778", en: "a mirrored pair of thin horizontal ornament lines for a section title \u2014 a left line and a right line with small decorative ends, and a wide completely empty gap between them where the title sits" },
      { key: "orn_title_top", ratio: "3:2", for: ["ornament"], ko: "\uD0C0\uC774\uD2C0 \uC704 \uC18C\uD615 \uC7A5\uC2DD", en: "one small centered ornament that sits above a title \u2014 a tiny sparkle or flourish with two short hairline wings, symmetrical, light and airy" },
      { key: "orn_title_bracket", ratio: "3:2", for: ["ornament"], ko: "\uD0C0\uC774\uD2C0 \uC0C1\uD558 \uBE0C\uB798\uD0B7", en: "a pair of thin mirrored curved bracket lines, one arching above and one below an empty title area, each with a tiny centered accent" },
      { key: "orn_date_line", ratio: "21:9", for: ["ornament"], ko: "\uB0A0\uC9DC \uB77C\uC778 (\uC591\uB05D \uB2E4\uC774\uC544)", en: "a thin horizontal date rule \u2014 a short line on the left and a short line on the right, each terminating in a tiny diamond, with an empty center gap for a date" },
      { key: "orn_corner_set", ratio: "1:1", for: ["ornament"], ko: "\uCF54\uB108 \uC7A5\uC2DD 4\uC885 \uC138\uD2B8", en: "a set of four mirrored corner ornaments placed at the four corners of a square canvas with nothing in the middle \u2014 slim filigree ticks that would decorate the corners of a panel" },
      { key: "orn_nav_marker", ratio: "3:2", for: ["ornament"], ko: "\uB0B4\uBE44 \uD65C\uC131 \uB9C8\uCEE4", en: "a small navigation active-state marker \u2014 one tiny sparkle or diamond with a short glowing hairline extending to the right, meant to sit beside a menu label" },
      { key: "orn_flourish_center", ratio: "3:2", for: ["ornament"], ko: "\uB2E8\uB3C5 \uD50C\uB7EC\uB9AC\uC2DC", en: "one compact symmetrical flourish ornament standing alone with thin elegant strokes and no frame" },
      // ─── 아이템 슬롯 (slot)
      { key: "slot_diamond", ratio: "1:1", for: ["slot"], ko: "\uB2E4\uC774\uC544\uBAAC\uB4DC \uC2AC\uB86F", en: "a diamond-shaped item slot frame (a square rotated 45 degrees) with slim rails and a completely empty center" },
      { key: "slot_circle_ring", ratio: "1:1", for: ["slot"], ko: "\uC6D0\uD615 \uB9C1 \uD640\uB354", en: "a circular item holder \u2014 one slim ring with a soft outer glow and a completely empty center" },
      { key: "slot_hex", ratio: "1:1", for: ["slot"], ko: "\uC721\uAC01 \uC2AC\uB86F", en: "a regular hexagonal item slot frame with slim rails and a completely empty center" },
      { key: "slot_square", ratio: "1:1", for: ["slot"], ko: "\uB77C\uC6B4\uB4DC \uC0AC\uAC01 \uC2AC\uB86F", en: "a softly rounded square item slot frame with slim rails and a completely empty center" },
      { key: "slot_ground_ring", ratio: "16:9", for: ["slot"], ko: "\uBC14\uB2E5 \uB9C1 \uD50C\uB7AB\uD3FC", en: "a flat elliptical ground ring platform seen from a slightly elevated angle \u2014 a thin glowing ring lying on the floor beneath an item position, empty inside, no item" },
      { key: "slot_icon_plate", ratio: "1:1", for: ["slot"], ko: "\uC6D0\uD615 \uC544\uC774\uCF58 \uD310", en: "a round skill-icon plate \u2014 a dark circular disc with a slim rim and a faint inner glow, empty center for an icon" },
      // ─── 아이콘 추가 (유틸)
      { key: "icon_close_x", ratio: "1:1", for: ["icon"], ko: "\uB2EB\uAE30 (X)", en: "a single clean close icon \u2014 two crossing strokes of equal length and consistent weight forming an X" },
      { key: "icon_plus_circle", ratio: "1:1", for: ["icon"], ko: "\uD50C\uB7EC\uC2A4 (\uC6D0\uD615)", en: "a plus icon centered inside a thin circular ring, consistent stroke weight" },
      { key: "icon_check_circle", ratio: "1:1", for: ["icon"], ko: "\uCCB4\uD06C (\uC6D0\uD615)", en: "a check-mark icon centered inside a thin circular ring, consistent stroke weight" },
      { key: "icon_bullet_diamond", ratio: "1:1", for: ["icon"], ko: "\uBD88\uB9BF (\uB2E4\uC774\uC544)", en: "a single small solid diamond bullet glyph, crisp and symmetrical" },
      { key: "icon_external_link", ratio: "1:1", for: ["icon"], ko: "\uC678\uBD80 \uB9C1\uD06C", en: "an external-link icon \u2014 a small square outline with an arrow leaving from its top-right corner" },
      { key: "icon_share", ratio: "1:1", for: ["icon"], ko: "\uACF5\uC720", en: "a share icon \u2014 three small dots connected by two thin lines" },
      { key: "icon_home", ratio: "1:1", for: ["icon"], ko: "\uD648", en: "a simple house-shaped home icon with a pitched roof and a small door notch" },
      { key: "icon_hamburger", ratio: "1:1", for: ["icon"], ko: "\uD584\uBC84\uAC70 \uBA54\uB274", en: "a hamburger menu icon \u2014 three equal horizontal bars with consistent spacing" }
    ]
  },
  frameWeight: {
    label: "\uD504\uB808\uC784 \uAD75\uAE30",
    opts: [
      { ko: "\uCD08\uBC15\uD615", en: "ultra-thin sleek hairline rails, never bulky" },
      { ko: "\uC587\uACE0 \uC608\uB9AC\uD568", en: "thin razor-edged metal rails with precise bevels" },
      { ko: "\uC7A5\uC2DD\uBD80\uB9CC \uAC15\uC870", en: "hairline straight rails with detail concentrated only at corners and ends" }
    ]
  },
  material: {
    label: "\uC7AC\uC9C8",
    opts: [
      { ko: "\uC21C\uAE08", en: "rich solid gold with controlled polished highlights" },
      { ko: "\uAE08\uBC15", en: "thin hand-applied gold leaf with subtle seams and restrained wear" },
      { ko: "\uACE0\uB300 \uD669\uAE08", en: "aged ancient gold with dark patina settled into recesses" },
      { ko: "\uC804\uD22C \uD754\uC801 \uD669\uAE08", en: "battle-worn gold with fine scratches, small dents and exposed dark under-metal" },
      { ko: "\uBC31\uAE08", en: "cool pale platinum with refined satin highlights" },
      { ko: "\uD669\uB3D9", en: "aged brass with warm brown patina" },
      { ko: "\uCCAD\uB3D9", en: "ancient bronze with restrained verdigris in recesses" },
      { ko: "\uC740", en: "polished silver with cool controlled reflections" },
      { ko: "\uB2E4\uB9C8\uC2A4\uCEE4\uC2A4 \uAC15\uCCA0", en: "dark Damascus steel with subtle layered wave patterns" },
      { ko: "\uC5F0\uB9C8 \uAC15\uCCA0", en: "polished forged steel with crisp cold highlights" },
      { ko: "\uBB34\uAD11 \uB9E4\uD2B8", en: "smooth matte non-metallic surface with a soft flat finish, minimal reflections and clean uniform color" },
      { ko: "\uC804\uD22C\uB85C \uB2E8\uB828\uB41C \uD751\uCCA0", en: "battle-hardened dark steel, subtly scratched and worn" },
      { ko: "\uAE30\uB984 \uBA39\uC778 \uD751\uCCA0", en: "oiled blackened steel with restrained cold highlights" },
      { ko: "\uADF8\uC744\uB9B0 \uAC15\uCCA0", en: "smoke-darkened forged steel with worn edges" },
      { ko: "\uC8FC\uCCA0", en: "heavy matte cast iron with fine granular texture" },
      { ko: "\uD751\uC694\uC11D", en: "deep black obsidian with sparse razor-sharp reflections" },
      { ko: "\uB300\uB9AC\uC11D", en: "dark fantasy marble with restrained natural veining" },
      { ko: "\uACE0\uB300 \uC11D\uC7AC", en: "weathered carved stone with shallow age cracks" },
      { ko: "\uB8EC \uC2A4\uD1A4", en: "dark ancient stone with one restrained engraved glowing groove \u2014 an abstract line, never a rune character or symbol" },
      { ko: "\uACE0\uBAA9", en: "aged dark hardwood with visible grain and worn edges" },
      { ko: "\uAC00\uC8FD", en: "dark embossed leather with restrained stitched edging" },
      { ko: "\uBF08", en: "aged ivory bone with subtle porous texture and no gore" },
      { ko: "\uB9C8\uB825 \uD06C\uB9AC\uC2A4\uD0C8", en: "dark translucent magic crystal with controlled inner light" },
      { ko: "\uC2A4\uBAA8\uD06C \uC720\uB9AC", en: "translucent smoked glass with a faint reflective sheen and a slim metallic rim" },
      { ko: "\uAD11\uD718 \uD06C\uB9AC\uC2A4\uD0C8", en: "pale luminous crystal glowing softly from within with cool white-cyan light" },
      { ko: "\uB124\uC628 \uADF8\uB77C\uB370\uC774\uC158", en: "flat neon magenta-to-violet gradient surface with no texture" }
    ]
  },
  interior: {
    label: "\uD504\uB808\uC784 \uB0B4\uBD80",
    opts: [
      { key: "empty", ko: "\uBE44\uC6B0\uAE30", en: "leave the interior completely empty and transparent-looking" },
      { key: "solid_dark", ko: "\uC5B4\uB450\uC6B4 \uB2E8\uC0C9", en: "fill the interior with a clean flat near-black surface" },
      { key: "material_fill", ko: "\uB3D9\uC77C \uC7AC\uC9C8", en: "fill the interior with a restrained flat panel using the same material" },
      { key: "translucent", ko: "\uBC18\uD22C\uBA85", en: "fill the interior with a subtle translucent smoked panel" },
      { key: "gradient", ko: "\uC740\uC740\uD55C \uADF8\uB77C\uB370\uC774\uC158", en: "fill the interior with a low-contrast dark vertical gradient" },
      { key: "soft_glow", ko: "\uC911\uC559 \uC18C\uD504\uD2B8\uAD11", en: "fill the interior with a dark surface and one restrained soft central glow" }
    ]
  },
  ornament: {
    label: "\uC7A5\uC2DD \uBC30\uCE58",
    opts: [
      { ko: "\uC808\uC81C\uB41C \uD14C\uB450\uB9AC", en: "small ornament accents touch the perimeter but occupy no more than 20% of the total frame area" },
      { ko: "\uB124 \uBAA8\uC11C\uB9AC \uC9D1\uC911", en: "small mirrored ornaments localized at the four corners, connected only by clean hairline rails" },
      { ko: "\uC88C\uC6B0 \uB300\uCE6D", en: "compact mirrored accents at both pointed ends with plain top and bottom hairline rails" }
    ]
  },
  renderStyle: {
    label: "\uB80C\uB354 \uD45C\uD604 \uBC29\uC2DD",
    opts: [
      { key: "realistic_3d", ko: "\uC2E4\uC0AC\uD615 3D", en: "high-end physically based 3D game UI render; realistic metal, stone, leather and wood response; controlled real-world reflections, wear, micro-scratches and surface roughness; no painted outlines" },
      { key: "illustrated", ko: "\uC77C\uB7EC\uC2A4\uD2B8\uD615", en: "hand-painted game UI illustration; clear painted outer edges, simplified lighting and readable color masses; shape and color design take priority over physically realistic material response; no photorealism" },
      { key: "semi_realistic", ko: "\uBC18\uC2E4\uC0AC\uD615", en: "semi-realistic RPG game UI rendering that combines believable material cues with controlled hand-painted shading; stable readable silhouette and restrained stylization" },
      { key: "flat_graphic", ko: "\uD50C\uB7AB \uADF8\uB798\uD53D", en: "clean 2D vector-like or cel-shaded game UI graphic; simplified flat color planes, crisp silhouette and minimal shading; optimized for small buttons and mobile UI; no photorealistic depth" }
    ]
  }
};
var SIMPLE_MOODS = [
  { key: "dark_rpg", ko: "\uC5B4\uB461\uACE0 \uAC15\uD55C RPG", preset: "black_thorn", material: "\uC804\uD22C\uB85C \uB2E8\uB828\uB41C \uD751\uCCA0", ornament: "\uC808\uC81C\uB41C \uD14C\uB450\uB9AC" },
  { key: "gold_kingdom", ko: "\uD654\uB824\uD55C \uD669\uAE08 \uC655\uAD6D", preset: "royal_crest", material: "\uACE0\uB300 \uD669\uAE08", ornament: "\uB124 \uBAA8\uC11C\uB9AC \uC9D1\uC911" },
  { key: "magic", ko: "\uC2E0\uBE44\uB85C\uC6B4 \uB9C8\uBC95", preset: "arcane", material: "\uB9C8\uB825 \uD06C\uB9AC\uC2A4\uD0C8", ornament: "\uC88C\uC6B0 \uB300\uCE6D" },
  { key: "nature", ko: "\uC790\uC5F0\uACFC \uC815\uB839", preset: "nature", material: "\uACE0\uBAA9", ornament: "\uB124 \uBAA8\uC11C\uB9AC \uC9D1\uC911" },
  // '깔끔하고 현대적'(구: dark_minimal+연마강철)이 SF 풍으로 나온다는 피드백 →
  // 그 조합은 '미래적 SF'로 정직하게 이름 붙이고, 현대적은 모던 UI + 무광 매트로 재정의.
  { key: "clean", ko: "\uAE54\uB054\uD558\uACE0 \uD604\uB300\uC801", preset: "modern_ui", material: "\uBB34\uAD11 \uB9E4\uD2B8", ornament: "\uC808\uC81C\uB41C \uD14C\uB450\uB9AC" },
  { key: "futuristic", ko: "\uBBF8\uB798\uC801 SF", preset: "dark_minimal", material: "\uC5F0\uB9C8 \uAC15\uCCA0", ornament: "\uC808\uC81C\uB41C \uD14C\uB450\uB9AC" },
  // ─── 브랜드웹 톤 (2026-09 라이브러리 조사) — 실제 사이트에서 가장 흔한 순서
  { key: "brandweb_gold", ko: "\uBE0C\uB79C\uB4DC\uC6F9 \uACE8\uB4DC \uD5E4\uC5B4\uB77C\uC778", preset: "gold_hairline", material: "\uAE08\uBC15", ornament: "\uC808\uC81C\uB41C \uD14C\uB450\uB9AC" },
  { key: "celestial", ko: "\uBC31\uCCAD \uAD11\uD718 (\uC544\uC774\uC628)", preset: "celestial", material: "\uAD11\uD718 \uD06C\uB9AC\uC2A4\uD0C8", ornament: "\uC88C\uC6B0 \uB300\uCE6D" },
  { key: "crimson_royal", ko: "\uBD89\uC740 \uC655\uAC00", preset: "crimson_royal", material: "\uACE0\uB300 \uD669\uAE08", ornament: "\uC88C\uC6B0 \uB300\uCE6D" },
  { key: "frost_silver", ko: "\uC11C\uB9AC \uC740\uCCAD", preset: "frost_silver", material: "\uBC31\uAE08", ornament: "\uC808\uC81C\uB41C \uD14C\uB450\uB9AC" },
  { key: "modern_neon", ko: "\uBAA8\uB358 \uB124\uC628 (\uB8E9\uBD81)", preset: "modern_neon", material: "\uB124\uC628 \uADF8\uB77C\uB370\uC774\uC158", ornament: "\uC808\uC81C\uB41C \uD14C\uB450\uB9AC" }
];
var SIMPLE_RENDER_STYLES = [
  { key: "illustrated", ko: "\uAC8C\uC784 \uC77C\uB7EC\uC2A4\uD2B8" },
  { key: "realistic_3d", ko: "\uC0AC\uC2E4\uC801\uC778 3D" },
  { key: "flat_graphic", ko: "\uC2EC\uD50C\uD55C 2D" }
];
function seedAspectRatio(seed) {
  return seed?.silhouette?.ratio || (seed?.assetType?.key === "divider" ? "21:9" : "1:1");
}
function buildCompletePrompt(seed, userIntent = "", opts = {}) {
  const isDivider = seed.assetType.key === "divider";
  const isIcon = seed.assetType.key === "icon";
  const isOrnament = seed.assetType.key === "ornament";
  const isSlot = seed.assetType.key === "slot";
  const plainDivider = isDivider && (!seed.silhouette?.en || seed.silhouette.key === "divider_line");
  const iconCreative = isIcon && opts.iconCreative;
  const isPerfectCircle = seed.silhouette.key === "perfect_circle";
  const structure = plainDivider ? "one perfectly straight horizontal separator line, very wide and extremely thin; ignore all plate, box and silhouette shapes" : isDivider ? `${seed.silhouette.en}; a wide, thin horizontal separator element with no plate, box or panel behind it` : isIcon ? iconCreative ? `${seed.silhouette.en}; reinterpret this icon with creative flair as a premium fantasy game UI icon \u2014 keep the core meaning instantly recognizable, but stylize the silhouette with bold dynamic shaping, sculpted facets, energy accents, motion or ornamental hints so it feels like a crafted game asset rather than a plain flat glyph; still ONE icon, no frame or plate around it` : `${seed.silhouette.en}; a solid glyph with consistent stroke weight, instantly readable even at small sizes; exactly ONE icon, no frame or plate around it` : isOrnament ? `${seed.silhouette.en}; a pure decorative element \u2014 NO frame, NO box, NO plate and NO background panel behind it, only the ornament itself drawn with thin elegant strokes` : isSlot ? `${seed.silhouette.en}; ${seed.frameWeight.en}; the inner area stays completely empty and open so an item icon can be placed later` : `${seed.silhouette.en}; ${seed.frameWeight.en}`;
  const interior = isDivider ? "no interior panel because this is a divider line" : isIcon ? "no interior panel \u2014 the icon itself is the solid shape" : isOrnament ? "no interior panel \u2014 the ornament is the whole asset" : isSlot ? "leave the slot interior completely empty and transparent-looking" : seed.interior.en;
  const ornamentEn = iconCreative ? "expressive decorative flourishes are welcome as long as the icon meaning stays clear" : isIcon ? "no ornament \u2014 keep the glyph pure and unadorned" : isOrnament ? "the asset itself is the ornament \u2014 one clean readable decorative motif with a single decorative layer" : seed.ornament.en;
  const circleLock = isPerfectCircle ? " CIRCLE LOCK: exact 1:1 outer boundary, one continuous perfect circle, absolutely no square corners, rectangular backing, tabs or side extensions." : "";
  const emptyRule = isIcon ? "The icon stands alone as a clean solid glyph." : isOrnament ? "The ornament stands alone with generous empty space around it." : isSlot || seed.interior.key === "empty" ? "The center must remain unfilled." : "Keep the selected interior fill simple and low contrast.";
  const isolationBg = isIcon || isOrnament || isSlot || seed.interior.key === "empty" ? "Use a plain neutral background clearly separated from the asset." : "BACKGROUND FOR EASY CUTOUT: place the finished asset on one perfectly flat solid background color with maximum hue and luminance contrast against the asset and its filled interior (white/light gray behind a dark asset, black/deep blue behind a bright gold or pale asset). Never reuse an asset color in the background; no background texture, gradient, glow, cast shadow or vignette.";
  const intent = userIntent.trim() ? ` USER INTENT \u2014 apply only when it does not violate the structural locks: ${userIntent.trim()}.` : "";
  const runeBan = " ABSOLUTELY NO runes, NO rune-like marks, NO glyphs, NO hieroglyphs, NO alphabet of any real or fictional language, NO letter-like or character-like symbols anywhere on the asset \u2014 engraved decoration must read only as abstract geometric grooves, notches or patterns.";
  const noList = (isIcon ? "no perspective, no text, no letters, no watermark, no extra objects, no duplicate icons" : "no perspective, no text, no letters, no icons, no watermark, no extra objects") + runeBan;
  const restraint = iconCreative ? "CREATIVE FREEDOM: bold stylization, dynamic shaping and decorative energy are encouraged, but the icon must stay one clear recognizable symbol with a crisp readable silhouette; avoid clutter that hides the meaning." : isOrnament ? "ORNAMENT RESTRAINT: one clear decorative motif with a single decorative layer and thin elegant strokes; no dense filigree; the shape must still read cleanly when scaled down to a website section header." : "STRICT RESTRAINT: ornament may occupy at most 15% of the asset area; use one clear silhouette with only 1 decorative layer and very low visual density. Frame rails must remain slim, visually light and nearly uniform in thickness; decorative masses must never make the frame look thick.";
  const negList = iconCreative ? `NO mixing with another render style, NO cluttered unreadable shape, ${noList}` : isOrnament ? `NO frame, NO box, NO plate, NO panel, NO background shape, NO thick strokes, NO dense filigree, NO repeated spikes, NO mixing with another render style, ${noList}` : `NO mixing with another render style, NO thick frame, NO bulky border, NO heavy corner blocks, NO dense filigree, NO spiderweb or lattice, NO repeated spikes, NO overlapping ornaments, NO extra decorative layer, ${noList}`;
  const canvasRule = `Canvas aspect ${seedAspectRatio(seed)}: the asset is centered and spans about 85% of the canvas width with even margins on all sides.`;
  return `Create ${seed.assetType.en}, production-ready for a game promotion website and game UI. Structure: ${structure}.${circleLock} Style direction: ${seed.preset.en}. Ornament placement: ${ornamentEn}. Interior treatment: ${interior}. RENDER EXPRESSION LOCK: ${seed.renderStyle.en}.${intent} ${restraint} Material and surface: ${seed.material.en}, refined finish, crisp controlled highlights interpreted strictly through the selected render expression. ${emptyRule} ${isolationBg} Make the asset nine-slice-safe where applicable. ${canvasRule} Front orthographic view, centered, 4K game UI asset render. ${negList}.`;
}
var BRANDWEB_KITS = [
  { key: "brandweb_core", ko: "\uBE0C\uB79C\uB4DC\uC6F9 \uAE30\uBCF8 \uD0A4\uD2B8", desc: "CTA \xB7 \uBCF4\uC870 \uBC84\uD2BC \xB7 \uC720\uB9AC \uD328\uB110 \xB7 \uCF54\uB108 \uBE0C\uB798\uD0B7 \xB7 \uD0C0\uC774\uD2C0 \uC7A5\uC2DD \xB7 \uB0B4\uBE44 \uB9C8\uCEE4 \xB7 \uB514\uBC14\uC774\uB354 \xB7 \uD0DC\uADF8 \xB7 \uC2AC\uB86F \xB7 \uB2EB\uAE30", items: [
    ["button", "button_ornate_caps"],
    ["button", "button_outline_pill"],
    ["box", "box_glass"],
    ["frame", "frame_bracket_corners"],
    ["ornament", "orn_title_sides"],
    ["ornament", "orn_nav_marker"],
    ["divider", "divider_center_gem"],
    ["badge", "badge_round_tag"],
    ["slot", "slot_diamond"],
    ["icon", "icon_close_x"]
  ] },
  { key: "brandweb_reward", ko: "\uBCF4\uC0C1 \xB7 \uCFE0\uD3F0 \uC139\uC158 \uD0A4\uD2B8", desc: "\uC6D0\uD615 \uB9C1 \uD640\uB354 \xB7 \uBC14\uB2E5 \uB9C1 \xB7 \uC544\uC774\uCF58 \uD310 \xB7 \uCE74\uC6B4\uD2B8 \uD544 \xB7 \uCF5C\uC544\uC6C3 \xB7 \uB9AC\uC2A4\uD2B8 \uD589 \xB7 \uBC30\uB108 \uD504\uB808\uC784 \xB7 \uD398\uC774\uC800", items: [
    ["slot", "slot_circle_ring"],
    ["slot", "slot_ground_ring"],
    ["slot", "slot_icon_plate"],
    ["badge", "badge_count_pill"],
    ["badge", "badge_callout"],
    ["box", "box_list_row"],
    ["frame", "frame_banner_ornate"],
    ["button", "button_pager"]
  ] },
  { key: "brandweb_nav", ko: "\uB0B4\uBE44 \xB7 \uC720\uD2F8 \uD0A4\uD2B8", desc: "\uC0AC\uC774\uB4DC \uD0ED \xB7 \uC6D0\uD615 \uC544\uC774\uCF58 \uBC84\uD2BC \xB7 \uD39C\uB10C\uD2B8 \xB7 \uD0ED \uC2A4\uD2B8\uB9BD \xB7 \uCCB4\uD06C \xB7 \uD50C\uB7EC\uC2A4 \xB7 \uC678\uBD80 \uB9C1\uD06C \xB7 \uBD88\uB9BF", items: [
    ["button", "button_side_tab"],
    ["button", "button_circle_icon"],
    ["badge", "badge_pennant"],
    ["box", "box_tabstrip"],
    ["icon", "icon_check_circle"],
    ["icon", "icon_plus_circle"],
    ["icon", "icon_external_link"],
    ["icon", "icon_bullet_diamond"]
  ] }
];
function buildKitSeeds(kit, shared, opts = {}) {
  const ts = Date.now();
  return kit.items.map(([typeKey, shapeKey], i) => {
    const assetType = COMPLETE_AXES.assetType.opts.find((o) => o.key === typeKey);
    const silhouette = COMPLETE_AXES.silhouette.opts.find((o) => o.key === shapeKey);
    if (!assetType || !silhouette) return null;
    const seed = { ...shared, assetType, silhouette };
    const tags = [kit.ko, assetType.ko, silhouette.ko, shared.preset?.ko, shared.material?.ko].filter(Boolean);
    return { id: `${ts}_kit_${i}`, seed, tags, enriched: null, prompt: buildCompletePrompt(seed, opts.userIntent || "", opts), kit: kit.key };
  }).filter(Boolean);
}

// src/apps/FrameForge/frameforgeMcp.js
var FRAMEFORGE_ASSET_TYPES = COMPLETE_AXES.assetType.opts;
var FRAMEFORGE_SILHOUETTES = COMPLETE_AXES.silhouette.opts;
var FRAMEFORGE_MOODS = SIMPLE_MOODS;
var FRAMEFORGE_RENDER_STYLES = SIMPLE_RENDER_STYLES;
var FRAMEFORGE_KITS = BRANDWEB_KITS;
function frameForgeSharedAxes(mood, renderStyle) {
  const A = COMPLETE_AXES;
  return {
    preset: A.preset.opts.find((o) => o.key === mood.preset) || A.preset.opts[0],
    material: A.material.opts.find((o) => o.ko === mood.material) || A.material.opts[0],
    ornament: A.ornament.opts.find((o) => o.ko === mood.ornament) || A.ornament.opts[0],
    frameWeight: A.frameWeight.opts[0],
    interior: A.interior.opts.find((o) => o.key === "empty") || A.interior.opts[0],
    renderStyle: A.renderStyle.opts.find((o) => o.key === renderStyle.key) || A.renderStyle.opts[0]
  };
}
function buildFrameForgeMcpPrompt({ assetType, silhouette, mood, renderStyle, userText = "" }) {
  const seed = { ...frameForgeSharedAxes(mood, renderStyle), assetType, silhouette };
  return buildCompletePrompt(seed, userText);
}

// scripts/lib/nexus-evaluation-criteria.mjs
import fs from "node:fs";
import path from "node:path";

// src/lib/designEvaluationCore.js
var NEXUS_BANNER_WEIGHTS = Object.freeze({
  impression: 14,
  concept: 9,
  layout: 8,
  typography: 18,
  color: 8,
  readability: 9,
  brand: 8,
  flow: 8,
  detail: 14,
  conversion: 4
});
var NEXUS_BANNER_CRITERIA = Object.freeze([
  { id: "impression", name: "\uCCAB\uC778\uC0C1 / \uC8FC\uBAA9\uB3C4", weight: NEXUS_BANNER_WEIGHTS.impression, maxScore: 100, description: "\uD55C\uB208\uC5D0 \uC2DC\uC120\uC744 \uC0AC\uB85C\uC7A1\uB294 \uAC15\uB82C\uD568\uACFC \uB9E4\uB825. \uB2E8\uC870\uB86D\uACE0 1\uCC28\uC6D0\uC801\uC778 \uC0C1\uC790 \uBC30\uCE58 \uC218\uC900\uC774\uBA74 80\uC810\uB300 \uBD80\uC5EC." },
  { id: "concept", name: "\uCF58\uC149\uD2B8 \uC804\uB2EC\uB825", weight: NEXUS_BANNER_WEIGHTS.concept, maxScore: 100, description: "\uC774\uBCA4\uD2B8\uB098 \uC5C5\uB370\uC774\uD2B8\uC758 \uC131\uACA9, \uB9E5\uB77D\uC774 \uC798 \uC804\uB2EC\uB418\uB294\uC9C0." },
  { id: "layout", name: "\uB808\uC774\uC544\uC6C3 \uADE0\uD615", weight: NEXUS_BANNER_WEIGHTS.layout, maxScore: 100, description: "\uC694\uC18C\uB4E4\uC758 \uD654\uBA74 \uBC30\uCE58\uC640 \uC2DC\uAC01\uC801 \uBB34\uAC8C \uC911\uC2EC. \uC911\uC559 \uC815\uB82C \uB2E8\uC21C \uB098\uC5F4\uC774\uBA74 80\uC810\uB300 \uCD08\uC911\uBC18, \uC0B0\uB9CC\uD558\uBA74 70\uC810\uB300." },
  { id: "typography", name: "\uD0C0\uC774\uD3EC\uADF8\uB798\uD53C", weight: NEXUS_BANNER_WEIGHTS.typography, maxScore: 100, description: "\uD3F0\uD2B8 \uB80C\uB354\uB9C1, \uC2DC\uAC01\uC801 \uC704\uACC4 \uBC0F \uC138\uB828\uBBF8. \uD0C0\uC774\uD2C0\uC774 \uBC30\uACBD\uACFC \uBB3B\uD788\uBA74 60~70\uC810\uB300." },
  { id: "color", name: "\uCEEC\uB7EC \uC644\uC131\uB3C4", weight: NEXUS_BANNER_WEIGHTS.color, maxScore: 100, description: "\uBC30\uB108 \uBB34\uB4DC\uC5D0 \uB9DE\uB294 \uC0C9\uC0C1 \uC870\uD569\uACFC \uC644\uC131\uB3C4. \uD14D\uC2A4\uD2B8\uC640 \uBC30\uACBD \uCEEC\uB7EC\uAC00 \uBD84\uB9AC\uB418\uC9C0 \uC54A\uACE0 \uACB9\uCE58\uBA74 70\uC810\uB300." },
  { id: "readability", name: "\uC815\uBCF4 \uAC00\uB3C5\uC131", weight: NEXUS_BANNER_WEIGHTS.readability, maxScore: 100, description: "\uD0C0\uC774\uD2C0, \uB0A0\uC9DC, \uD61C\uD0DD \uB4F1 \uD575\uC2EC \uC815\uBCF4\uC758 \uAC00\uB3C5\uC131." },
  { id: "brand", name: "\uBE0C\uB79C\uB4DC \uC801\uD569\uC131", weight: NEXUS_BANNER_WEIGHTS.brand, maxScore: 100, description: "\uD574\uB2F9 \uAC8C\uC784/\uC774\uBCA4\uD2B8 \uAC10\uC131\uC5D0 \uBD80\uD569\uD558\uB294 \uD1A4\uC564\uB9E4\uB108." },
  { id: "flow", name: "\uC2DC\uC120 \uD750\uB984", weight: NEXUS_BANNER_WEIGHTS.flow, maxScore: 100, description: "\uD14D\uC2A4\uD2B8\u2192\uCE90\uB9AD\uD130\u2192\uC544\uC774\uD15C\uC73C\uB85C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC774\uC5B4\uC9C0\uBA74 \uACE0\uB4DD\uC810, \uC2DC\uC120\uC774 \uBC29\uD669\uD558\uBA74 \uAC10\uC810." },
  { id: "detail", name: "\uC644\uC131\uB3C4 / \uB514\uD14C\uC77C", weight: NEXUS_BANNER_WEIGHTS.detail, maxScore: 100, description: "\uBC30\uACBD, \uBE5B, \uB381\uC2A4, \uD569\uC131\uC758 \uB514\uD14C\uC77C\uACFC \uB9C8\uAC10. \uCE90\uB9AD\uD130 \uC5C6\uB294 \uB2E8\uC21C \uB098\uC5F4\uC740 90\uC810 \uC774\uC0C1 \uAE08\uC9C0." },
  { id: "conversion", name: "\uD074\uB9AD/\uC804\uD658 \uAC00\uB2A5\uC131", weight: NEXUS_BANNER_WEIGHTS.conversion, maxScore: 100, description: "\uC720\uC800\uB85C \uD558\uC5EC\uAE08 \uD074\uB9AD\uD558\uACE0 \uC2F6\uAC8C \uB9CC\uB4DC\uB294 \uB9E4\uB825\uB3C4." }
].map((item) => Object.freeze(item)));
var NEXUS_QUALITY_GATE = Object.freeze({
  overall: 85,
  everyMetric: 75,
  hardFailures: 0
});
var finiteScore = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
};
function normalizeCriteria(items = []) {
  const seen = /* @__PURE__ */ new Set();
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    id: String(item?.id || "").trim(),
    name: String(item?.name || item?.id || "").trim(),
    description: String(item?.description || "").trim(),
    weight: Number(item?.weight),
    maxScore: Number(item?.maxScore) || 100
  })).filter((item) => {
    if (!item.id || seen.has(item.id) || !Number.isFinite(item.weight) || item.weight <= 0) return false;
    seen.add(item.id);
    return true;
  });
}
function validateCriteria(items = []) {
  const list = Array.isArray(items) ? items : [];
  const normalized = normalizeCriteria(list);
  const missingIds = list.filter((item) => !String(item?.id || "").trim()).map((item) => String(item?.name || "(\uC774\uB984 \uC5C6\uC74C)"));
  const ids2 = list.map((item) => String(item?.id || "").trim()).filter(Boolean);
  const duplicateIds = [...new Set(ids2.filter((id, index) => ids2.indexOf(id) !== index))];
  const invalidWeights = list.filter((item) => !Number.isFinite(Number(item?.weight)) || Number(item.weight) <= 0).map((item) => String(item?.id || item?.name || "(\uC774\uB984 \uC5C6\uC74C)"));
  const weightSum = normalized.reduce((sum, item) => sum + item.weight, 0);
  return {
    valid: normalized.length > 0 && normalized.length === list.length && missingIds.length === 0 && duplicateIds.length === 0 && invalidWeights.length === 0,
    normalized,
    missingIds,
    duplicateIds,
    invalidWeights,
    weightSum: Math.round(weightSum * 100) / 100
  };
}
function calculateEvaluationReport({
  criteria,
  scores,
  hardFailures = [],
  recommendedCorrections = [],
  offset = 0,
  gate = NEXUS_QUALITY_GATE
} = {}) {
  const items = normalizeCriteria(criteria);
  let weightedSum = 0;
  let totalWeight = 0;
  const metrics = items.map((criterion) => {
    const score = finiteScore(scores?.[criterion.id]?.score ?? scores?.[criterion.id]);
    if (score != null) {
      weightedSum += score * criterion.weight;
      totalWeight += criterion.weight;
    }
    return {
      key: criterion.id,
      name: criterion.name,
      weight: criterion.weight,
      score,
      reason: String(scores?.[criterion.id]?.reason || "")
    };
  });
  const rawOverall = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const adjustedOverall = Math.max(0, Math.min(99, Math.round((rawOverall + Number(offset || 0)) * 10) / 10));
  const failures = Array.isArray(hardFailures) ? hardFailures.map(String).filter(Boolean) : [];
  const missing = metrics.filter((metric) => metric.score == null).map((metric) => metric.key);
  const lowMetrics = metrics.filter((metric) => metric.score != null && metric.score < gate.everyMetric).sort((a, b) => a.score - b.score);
  const priorities = [...metrics].filter((metric) => metric.score != null).sort((a, b) => a.score - b.score).slice(0, 3);
  const pass = missing.length === 0 && adjustedOverall >= gate.overall && lowMetrics.length === 0 && failures.length <= gate.hardFailures;
  return {
    overall: adjustedOverall,
    rawOverall: Math.round(rawOverall * 10) / 10,
    pass,
    gate,
    hardFailures: failures,
    missing,
    lowMetrics,
    priorities,
    recommendedCorrections: (Array.isArray(recommendedCorrections) ? recommendedCorrections : []).map(String).filter(Boolean).slice(0, 3),
    metrics
  };
}
function criteriaSnapshot(items = []) {
  return normalizeCriteria(items).map(({ id, name, description, weight, maxScore }) => ({
    id,
    name,
    description,
    weight,
    maxScore
  }));
}

// src/lib/evaluationCriteriaSeeds.js
var CRITERIA_TYPES = {
  banner: "banner",
  promotion: "promotion",
  brandweb: "brandweb",
  brandwebSub: "brandwebSub",
  // 브랜드웹 서브 페이지 — 메인과 다른 가중치/기준.
  // ─── 모바일 전용 평가 타입 (2026-06 추가) ──────────────────
  // 모바일은 데스크톱과 폭/뷰포트/엄지 동선/스크롤 패턴이 달라 별도 기준이 필요.
  // 권장 입력 해상도: 브랜드웹 모바일 750×~1234 (단일 화면 기준 mockup),
  //                   프로모션 모바일 750×5000+ (긴 세로 스크롤 랜딩).
  brandwebMobile: "brandwebMobile",
  promotionMobile: "promotionMobile",
  // ─── 프로모션 상단 키비주얼(KV/히어로) 전용 (2026-06 추가) ───
  // 프로모션 페이지 전체가 아니라 최상단 키비주얼(히어로) 영역만 평가. 메인 일러스트·타이틀
  // 임팩트·카피 가독성 등 KV 본질에 가중치를 몰아준 별도 기준.
  promotionKv: "promotionKv",
  prompt: "prompt",
  // ─── 타이포그래피 전용 평가 타입 (2026-05 추가) ─────────────
  // 각 타이포 성격에 맞는 항목으로 시드. 관리자가 NexusAdmin 에서 가중치/항목 자유 조정.
  typo2d: "typo2d",
  // 2D 평면 타이포그래피 (벡터, 평면 디자인)
  typoRender: "typoRender",
  // 렌더링 타이포 (3D/PBR — Render Matrix 결과물)
  typoMotion: "typoMotion"
  // 모션 타이포 (영상/모션 — Motion Matrix 결과물 키프레임)
};
var BANNER_SEED = NEXUS_BANNER_CRITERIA.map((item) => ({ ...item }));
var PROMOTION_SEED = [
  { id: "impression", name: "\uCCAB \uD654\uBA74 \uD761\uC785\uB825", weight: 10, maxScore: 100, description: "Hook \u2014 \uD398\uC774\uC9C0 \uC9C4\uC785 \uC9C1\uD6C4 \uC2DC\uC120\uC744 \uC7A1\uB294\uAC00." },
  { id: "brand", name: "\uBE0C\uB79C\uB4DC\xB7\uC774\uBCA4\uD2B8 \uD1A4", weight: 8, maxScore: 100, description: "\uBE0C\uB79C\uB4DC \uC815\uCCB4\uC131 + \uCEA0\uD398\uC778 \uBD84\uC704\uAE30 \uC77C\uCE58\uB3C4." },
  { id: "concept", name: "\uCEA0\uD398\uC778 \uC774\uD574\uB3C4", weight: 10, maxScore: 100, description: "\uC774 \uCEA0\uD398\uC778\uC774 \uBB34\uC5C7\uC774\uACE0 \uC65C \uCC38\uC5EC\uD574\uC57C \uD558\uB294\uC9C0\uAC00 \uBA85\uB8CC\uD55C\uAC00." },
  { id: "color", name: "\uBCF4\uC0C1 \uB9E4\uB825\uB3C4", weight: 15, maxScore: 100, description: "Reward appeal \u2014 \uBCF4\uC0C1 \uC790\uCCB4\uC640 \uADF8 \uD45C\uD604\uC774 \uB9E4\uB825\uC801\uC778\uAC00." },
  { id: "layout", name: "\uBCF4\uC0C1 \uAD6C\uC870\xB7\uC870\uAC74", weight: 10, maxScore: 100, description: "Reward logic \u2014 \uC870\uAC74/\uB2E8\uACC4/\uD61C\uD0DD \uAD6C\uC870\uAC00 \uBA85\uD655\uD55C\uAC00." },
  { id: "typography", name: "\uC815\uBCF4 \uC704\uACC4", weight: 10, maxScore: 100, description: "\uD0C0\uC774\uD2C0/\uC11C\uBE0C/\uBCF8\uBB38 \uAC04 \uC2DC\uAC01\uC801 \uC704\uACC4." },
  { id: "conversion", name: "\uCC38\uC5EC \uB3D9\uC120\xB7CTA", weight: 10, maxScore: 100, description: "Participation flow \u2014 CTA \uC704\uCE58/\uBB38\uAD6C/\uC720\uB3C4\uAC00 \uD6A8\uACFC\uC801\uC778\uAC00." },
  { id: "readability", name: "\uC815\uBCF4 \uAC00\uB3C5\uC131", weight: 12, maxScore: 100, description: "\uAE34 \uD398\uC774\uC9C0 \uC548\uC5D0\uC11C \uD575\uC2EC \uC815\uBCF4\uAC00 \uC798 \uC77D\uD788\uB294\uAC00." },
  { id: "flow", name: "\uC2A4\uD06C\uB864 \uB9AC\uB4EC", weight: 8, maxScore: 100, description: "Scroll rhythm \u2014 \uC139\uC158 \uC804\uD658\uACFC \uC2DC\uC120 \uD750\uB984\uC758 \uC790\uC5F0\uC2A4\uB7EC\uC6C0." },
  { id: "detail", name: "\uC6B4\uC601 \uC2E0\uB8B0\uC131", weight: 7, maxScore: 100, description: "Operational trust \u2014 \uC548\uB0B4, \uBA74\uCC45, \uB9C8\uAC10 \uB4F1 \uB514\uD14C\uC77C\uC758 \uC2E0\uB8B0\uAC10." }
];
var BRANDWEB_SEED = [
  { id: "impression", name: "\uBE0C\uB79C\uB4DC \uC815\uCCB4\uC131", weight: 10, maxScore: 100, description: "Identity \u2014 \uCCAB \uD654\uBA74\uC5D0\uC11C \uBE0C\uB79C\uB4DC\uAC00 \uBA85\uD655\uD788 \uAC01\uC778\uB418\uB294\uAC00." },
  { id: "concept", name: "\uD788\uC5B4\uB85C \uC784\uD329\uD2B8", weight: 15, maxScore: 100, description: "Hero impact \u2014 \uBA54\uC778 \uBE44\uC8FC\uC5BC/\uCE74\uD53C\uC758 \uC784\uD329\uD2B8." },
  { id: "layout", name: "\uBA54\uC778 \uBE44\uC8FC\uC5BC", weight: 15, maxScore: 100, description: "Key visual \u2014 \uD575\uC2EC \uBE44\uC8FC\uC5BC \uAD6C\uB3C4/\uC2A4\uCF00\uC77C." },
  { id: "typography", name: "\uD0C0\uC774\uD2C0 \uC874\uC7AC\uAC10", weight: 12, maxScore: 100, description: "Title presence \u2014 \uD0C0\uC774\uD3EC\uC758 \uC874\uC7AC\uAC10\uACFC \uD1A4." },
  { id: "color", name: "\uC138\uACC4\uAD00 \uBAB0\uC785\uB3C4", weight: 12, maxScore: 100, description: "World immersion \u2014 \uCEEC\uB7EC\uB85C \uB9CC\uB4E4\uC5B4\uB0B4\uB294 \uC138\uACC4\uAD00 \uBAB0\uC785." },
  { id: "readability", name: "\uC2DC\uAC01\uC801 \uC704\uACC4", weight: 10, maxScore: 100, description: "Visual hierarchy \u2014 \uC815\uBCF4\uC758 \uC2DC\uAC01\uC801 \uC704\uACC4." },
  { id: "brand", name: "\uB808\uC774\uC544\uC6C3 \uADE0\uD615", weight: 8, maxScore: 100, description: "Layout balance \u2014 \uC804\uCCB4 \uB808\uC774\uC544\uC6C3\uC758 \uADE0\uD615\uAC10." },
  { id: "flow", name: "\uD0D0\uC0C9 \uC2A4\uD06C\uB864 \uC5F0\uCD9C", weight: 6, maxScore: 100, description: "Scroll interaction \u2014 \uC2A4\uD06C\uB864\uB85C \uD3BC\uCCD0\uC9C0\uB294 \uC5F0\uCD9C\uC758 \uB9E4\uB825." },
  { id: "detail", name: "\uC9C4\uC785 \uC804\uD658\uC131", weight: 6, maxScore: 100, description: "Gateway conversion \u2014 \uB2E4\uC74C \uD589\uB3D9/\uD398\uC774\uC9C0\uB85C\uC758 \uC720\uB3C4\uB825." },
  { id: "conversion", name: "\uAE30\uC5B5\uC131", weight: 6, maxScore: 100, description: "Memorability \u2014 \uC0AC\uC6A9\uC790\uC5D0\uAC8C \uB0A8\uB294 \uC794\uC0C1." }
];
var BRANDWEB_SUB_SEED = [
  { id: "impression", name: "\uCF58\uD150\uCE20 \uBA85\uD655\uC131", weight: 14, maxScore: 100, description: "\uC11C\uBE0C \uD398\uC774\uC9C0 \uC9C4\uC785 \uC2DC \uBB34\uC5C7\uC744 \uBCF4\uC5EC\uC8FC\uB294 \uD398\uC774\uC9C0\uC778\uC9C0 \uC989\uC2DC \uD30C\uC545\uB418\uB294\uAC00." },
  { id: "concept", name: "\uBE0C\uB79C\uB4DC \uC5F0\uC18D\uC131", weight: 10, maxScore: 100, description: "\uBA54\uC778\uACFC \uD1A4\xB7\uBE44\uC8FC\uC5BC \uC5B8\uC5B4\uAC00 \uC774\uC5B4\uC9C0\uB294\uAC00." },
  { id: "layout", name: "\uC815\uBCF4 \uAD6C\uC870", weight: 15, maxScore: 100, description: "\uCF58\uD150\uCE20 \uBE14\uB85D\uC758 \uAD6C\uC870\uC640 \uADF8\uB8F9\uD551\uC774 \uB17C\uB9AC\uC801\uC778\uAC00." },
  { id: "typography", name: "\uAC00\uB3C5\uC131", weight: 14, maxScore: 100, description: "\uBCF8\uBB38/\uC81C\uBAA9\uC758 \uAC00\uB3C5\uC131\uACFC \uC704\uACC4." },
  { id: "color", name: "\uC139\uC158 \uC704\uACC4", weight: 10, maxScore: 100, description: "\uC0C9\uC73C\uB85C \uC139\uC158/\uBAA8\uB4C8 \uC704\uACC4\uAC00 \uAD6C\uBD84\uB418\uB294\uAC00." },
  { id: "readability", name: "\uBAA8\uB4C8 \uB808\uC774\uC544\uC6C3", weight: 10, maxScore: 100, description: "\uBC18\uBCF5 \uBAA8\uB4C8\uC758 \uC815\uB82C\xB7\uAC04\uACA9 \uC77C\uAD00\uC131." },
  { id: "brand", name: "\uBCF4\uC870 \uBE44\uC8FC\uC5BC", weight: 8, maxScore: 100, description: "\uBCF4\uC870 \uC774\uBBF8\uC9C0/\uC544\uC774\uCF58\uC758 \uD488\uC9C8\uACFC \uC801\uD569\uC131." },
  { id: "flow", name: "\uD0D0\uC0C9 \uC2A4\uD06C\uB864 \uD750\uB984", weight: 8, maxScore: 100, description: "\uC2A4\uD06C\uB864\uC5D0 \uB530\uB978 \uC815\uBCF4 \uC804\uAC1C\uC758 \uC790\uC5F0\uC2A4\uB7EC\uC6C0." },
  { id: "detail", name: "\uB514\uD14C\uC77C \uC644\uC131\uB3C4", weight: 6, maxScore: 100, description: "\uC5EC\uBC31\xB7\uC815\uB82C\xB7\uB9C8\uAC10\uC758 \uD53D\uC140 \uC644\uC131\uB3C4." },
  { id: "conversion", name: "\uC6B4\uC601 \uC548\uC815\uC131", weight: 5, maxScore: 100, description: "\uB9C1\uD06C/CTA/\uC548\uB0B4 \uB4F1 \uC6B4\uC601 \uC694\uC18C\uC758 \uC2E0\uB8B0\uC131." }
];
var BRANDWEB_MOBILE_SEED = [
  { id: "impression", name: "\uCCAB \uD654\uBA74 \uC784\uD329\uD2B8", weight: 13, maxScore: 100, description: "\uBAA8\uBC14\uC77C \uCCAB \uD3F4\uB4DC(above-the-fold) \uD55C \uD3ED \uC548\uC5D0\uC11C \uC2DC\uC120\uC744 \uC0AC\uB85C\uC7A1\uB294\uAC00. \uC791\uC740 \uD654\uBA74\uC774\uB77C \uCCAB\uC778\uC0C1\uC758 \uBE44\uC911\uC774 \uB370\uC2A4\uD06C\uD1B1\uBCF4\uB2E4 \uD07C." },
  { id: "concept", name: "\uD0A4 \uBA54\uC2DC\uC9C0 \uC804\uB2EC", weight: 12, maxScore: 100, description: "\uC881\uC740 \uD3ED \uC548\uC5D0\uC11C \uCEA0\uD398\uC778/\uBE0C\uB79C\uB4DC \uBA54\uC2DC\uC9C0\uAC00 \uC989\uC2DC \uC77D\uD788\uB294\uAC00. \uBA54\uC778 \uCE74\uD53C\uC758 \uC555\uCD95\uB825." },
  { id: "layout", name: "\uB2E8\uC77C \uCEEC\uB7FC \uB9AC\uB4EC", weight: 11, maxScore: 100, description: "\uC138\uB85C \uD750\uB984\uC758 \uC790\uC5F0\uC2A4\uB7EC\uC6C0. \uC139\uC158 \uBD84\uC808\xB7\uC5EC\uBC31\xB7\uC815\uB82C\uC774 \uBAA8\uBC14\uC77C \uBDF0\uD3EC\uD2B8\uC5D0 \uCD5C\uC801\uD654\uB3FC \uC788\uB294\uAC00." },
  { id: "typography", name: "\uD0C0\uC774\uD2C0 \uC555\uCD95\uB825", weight: 12, maxScore: 100, description: "\uBA54\uC778 \uD0C0\uC774\uD2C0\uC774 \uC881\uC740 \uD3ED\uC5D0\uC11C\uB3C4 \uC704\uACC4\uC640 \uBC15\uB825\uC744 \uC783\uC9C0 \uC54A\uB294\uAC00. \uC904\uBC14\uAFC8/\uC798\uB9BC \uCC98\uB9AC\uC758 \uC758\uB3C4\uC131." },
  { id: "color", name: "\uC138\uACC4\uAD00\xB7\uD1A4 \uC720\uC9C0", weight: 9, maxScore: 100, description: "\uC791\uC740 \uCE94\uBC84\uC2A4\uC5D0\uC11C\uB3C4 \uBE0C\uB79C\uB4DC \uCEEC\uB7EC\uC640 \uD1A4\uC774 \uBD84\uB9AC\xB7\uAC01\uC778\uB418\uB294\uAC00." },
  { id: "readability", name: "\uBAA8\uBC14\uC77C \uBCF8\uBB38 \uAC00\uB3C5\uC131", weight: 11, maxScore: 100, description: "\uBCF8\uBB38/\uCEA1\uC158 \uD3F0\uD2B8 \uD06C\uAE30\xB7\uD589\uAC04\uC774 \uBAA8\uBC14\uC77C \uC2DC\uCCAD \uAC70\uB9AC\uC5D0 \uB9DE\uB294\uAC00 (\uBCF4\uD1B5 \u226514px, \uD589\uAC04 1.4 \uC774\uC0C1)." },
  { id: "brand", name: "\uBE0C\uB79C\uB4DC \uC815\uCCB4\uC131", weight: 8, maxScore: 100, description: "\uB370\uC2A4\uD06C\uD1B1\uACFC \uD1A4\uC774 \uB04A\uAE30\uC9C0 \uC54A\uACE0 \uC791\uC740 \uD654\uBA74\uC5D0\uC11C\uB3C4 \uBE0C\uB79C\uB4DC\uAC00 \uC0B4\uC544 \uC788\uB294\uAC00." },
  { id: "flow", name: "\uC5C4\uC9C0 \uB3D9\uC120\xB7CTA \uC704\uCE58", weight: 9, maxScore: 100, description: "Thumb reach \u2014 \uC8FC\uC694 CTA\xB7\uD575\uC2EC \uC694\uC18C\uAC00 \uC5C4\uC9C0\uAC00 \uB2FF\uAE30 \uC26C\uC6B4 \uD558\uB2E8 \uC601\uC5ED\uC5D0 \uBC30\uCE58\uB418\uC5C8\uB294\uAC00." },
  { id: "detail", name: "\uBAA8\uBC14\uC77C \uB514\uD14C\uC77C", weight: 8, maxScore: 100, description: "\uC548\uC804 \uC601\uC5ED(safe area)\xB7\uB178\uCE58 \uD68C\uD53C\xB7\uD130\uCE58 \uD0C0\uAE43 \uCD5C\uC18C \uD06C\uAE30(\u226544px)\xB7\uC815\uB82C \uD53D\uC140 \uC644\uC131\uB3C4." },
  { id: "conversion", name: "\uD0ED \uC720\uB3C4\uB825", weight: 7, maxScore: 100, description: "CTA \uAC00 \uBD84\uBA85\uD788 \uC778\uC9C0\uB418\uACE0 \uB204\uB974\uACE0 \uC2F6\uAC8C \uB9CC\uB4DC\uB294\uAC00 \u2014 \uD615\uD0DC\xB7\uC0C9 \uB300\uBE44\xB7\uBB38\uAD6C\uC758 \uBA85\uD655\uC131." }
];
var PROMOTION_MOBILE_SEED = [
  { id: "impression", name: "\uCCAB \uD654\uBA74 \uD761\uC785\uB825", weight: 12, maxScore: 100, description: "Hook \u2014 \uBAA8\uBC14\uC77C \uCCAB \uD3F4\uB4DC\uC5D0\uC11C \uBB34\uC5C7\uC744 \uC8FC\uB294 \uCEA0\uD398\uC778\uC778\uC9C0 \uC989\uC2DC \uC778\uC9C0\uB418\uB294\uAC00." },
  { id: "brand", name: "\uBE0C\uB79C\uB4DC\xB7\uC774\uBCA4\uD2B8 \uD1A4", weight: 7, maxScore: 100, description: "\uCEA0\uD398\uC778 \uBB34\uB4DC\uC640 \uBE0C\uB79C\uB4DC \uC815\uCCB4\uC131\uC774 \uBAA8\uBC14\uC77C \uC791\uC740 \uD3ED\uC5D0\uC11C\uB3C4 \uC77C\uAD00\uB418\uB294\uAC00." },
  { id: "concept", name: "\uCEA0\uD398\uC778 \uBA85\uB8CC\uC131", weight: 10, maxScore: 100, description: "\uCC38\uC5EC \uC870\uAC74\xB7\uD61C\uD0DD\uC758 \uD575\uC2EC\uC774 \uBAA8\uBC14\uC77C\uC5D0\uC11C\uB3C4 \uBA85\uB8CC\uD788 \uC555\uCD95\uB3FC \uC788\uB294\uAC00." },
  { id: "color", name: "\uBCF4\uC0C1 \uB9E4\uB825\uB3C4", weight: 13, maxScore: 100, description: "Reward appeal \u2014 \uC881\uC740 \uD3ED \uC548\uC5D0\uC11C\uB3C4 \uBCF4\uC0C1\uC758 \uB9E4\uB825\uC774 \uC2DC\uAC01\uC801\uC73C\uB85C \uC804\uB2EC\uB418\uB294\uAC00." },
  { id: "layout", name: "\uBCF4\uC0C1 \uAD6C\uC870\xB7\uC870\uAC74", weight: 10, maxScore: 100, description: "\uC870\uAC74/\uB2E8\uACC4 \uAD6C\uC870\uAC00 \uBAA8\uBC14\uC77C \uCE74\uB4DC/\uB9AC\uC2A4\uD2B8 \uD615\uD0DC\uB85C \uC798 \uC555\uCD95\uB3FC \uC788\uB294\uAC00." },
  { id: "typography", name: "\uC815\uBCF4 \uC704\uACC4", weight: 10, maxScore: 100, description: "\uD0C0\uC774\uD2C0/\uC11C\uBE0C/\uBCF8\uBB38\uC758 \uC704\uACC4\uAC00 \uC881\uC740 \uD3ED\uC5D0\uC11C\uB3C4 \uD55C\uB208\uC5D0 \uB4E4\uC5B4\uC624\uB294\uAC00." },
  { id: "conversion", name: "CTA\xB7\uD558\uB2E8 sticky", weight: 12, maxScore: 100, description: "\uC8FC\uC694 CTA \uC758 \uC704\uCE58\xB7\uBC18\uBCF5\xB7\uD558\uB2E8 \uACE0\uC815(sticky) \uCC98\uB9AC\uAC00 \uBAA8\uBC14\uC77C \uC804\uD658\uC5D0 \uD6A8\uACFC\uC801\uC778\uAC00." },
  { id: "readability", name: "\uC815\uBCF4 \uAC00\uB3C5\uC131", weight: 10, maxScore: 100, description: "\uAE34 \uC138\uB85C \uC2A4\uD06C\uB864 \uD398\uC774\uC9C0\uC5D0\uC11C \uBCF8\uBB38\uC774 \uCDA9\uBD84\uD788 \uD06C\uACE0 \uD589\uAC04\uC774 \uB2F5\uB2F5\uD558\uC9C0 \uC54A\uC740\uAC00." },
  { id: "flow", name: "\uC2A4\uD06C\uB864 \uD53C\uB85C\xB7\uB9AC\uB4EC", weight: 9, maxScore: 100, description: "Scroll fatigue \u2014 \uC139\uC158 \uAE38\uC774\xB7\uC804\uD658 \uC2E0\uD638\xB7\uC5EC\uBC31\uC73C\uB85C \uC0AC\uC6A9\uC790\uAC00 \uC2A4\uD06C\uB864\uC744 \uD3EC\uAE30\uD558\uC9C0 \uC54A\uAC8C \uC124\uACC4\uB410\uB294\uAC00." },
  { id: "detail", name: "\uC6B4\uC601 \uC2E0\uB8B0\uC131", weight: 7, maxScore: 100, description: "\uC548\uB0B4\xB7\uBA74\uCC45\xB7\uAE30\uAC04 \uBA85\uC2DC\xB7\uD130\uCE58 \uD0C0\uAE43 \uD06C\uAE30 \uB4F1 \uBAA8\uBC14\uC77C \uC6B4\uC601 \uB514\uD14C\uC77C\uC758 \uC644\uC131\uB3C4." }
];
var PROMOTION_KV_SEED = [
  { id: "impression", name: "\uCCAB\uC778\uC0C1 / \uC8FC\uBAA9\uB3C4 (Hook)", weight: 14, maxScore: 100, description: "\uD0A4\uBE44\uC8FC\uC5BC\uC774 \uD55C\uB208\uC5D0 \uC2DC\uC120\uC744 \uC0AC\uB85C\uC7A1\uB294 \uAC15\uB82C\uD568. \uB2E8\uC870\uB86D\uACE0 \uD3C9\uC774\uD55C \uBC30\uCE58\uBA74 80\uC810\uB300." },
  { id: "color", name: "\uD575\uC2EC \uBE44\uC8FC\uC5BC \uB9E4\uB825", weight: 15, maxScore: 100, description: "\uBA54\uC778 \uC77C\uB7EC\uC2A4\uD2B8/\uCE90\uB9AD\uD130/\uC624\uBE0C\uC81D\uD2B8\uC758 \uC644\uC131\uB3C4\uC640 \uB9E4\uB825 \u2014 KV \uC758 \uBCF8\uC9C8. \uBE48\uC57D\uD558\uBA74 70\uC810\uB300." },
  { id: "typography", name: "\uBA54\uC778 \uD0C0\uC774\uD2C0 \uC784\uD329\uD2B8", weight: 14, maxScore: 100, description: "\uD0C0\uC774\uD2C0/\uB85C\uACE0 \uD0C0\uC774\uD3EC\uC758 \uC874\uC7AC\uAC10\xB7\uC704\uACC4\xB7\uBC15\uB825. \uBC30\uACBD\uC5D0 \uBB3B\uD788\uBA74 60~70\uC810\uB300." },
  { id: "concept", name: "\uCEA0\uD398\uC778 \uCF58\uC149\uD2B8 \uC804\uB2EC", weight: 10, maxScore: 100, description: "\uD0A4\uBE44\uC8FC\uC5BC\uB9CC\uC73C\uB85C \uCEA0\uD398\uC778\uC758 \uC131\uACA9\xB7\uD14C\uB9C8\uAC00 \uC989\uC2DC \uC77D\uD788\uB294\uAC00." },
  { id: "layout", name: "\uAD6C\uB3C4\xB7\uC5EC\uBC31 \uADE0\uD615", weight: 10, maxScore: 100, description: "\uD0A4\uBE44\uC8FC\uC5BC\uC758 \uAD6C\uB3C4, \uC2DC\uAC01 \uBB34\uAC8C\uC911\uC2EC, \uC5EC\uBC31 \uC6B4\uC6A9. \uC0B0\uB9CC\uD558\uAC70\uB098 \uB2F5\uB2F5\uD558\uBA74 \uAC10\uC810." },
  { id: "readability", name: "\uCE74\uD53C\xB7\uC2AC\uB85C\uAC74 \uAC00\uB3C5\uC131", weight: 9, maxScore: 100, description: "\uD575\uC2EC \uCE74\uD53C/\uC2AC\uB85C\uAC74\uC774 \uBC30\uACBD\uACFC \uBD84\uB9AC\uB418\uC5B4 \uB610\uB837\uC774 \uC77D\uD788\uB294\uAC00." },
  { id: "flow", name: "\uC2DC\uC120 \uC720\uB3C4 / \uD3EC\uCEEC", weight: 8, maxScore: 100, description: "\uD0C0\uC774\uD2C0\u2192\uCE90\uB9AD\uD130\u2192\uD575\uC2EC \uC694\uC18C\uB85C \uC774\uC5B4\uC9C0\uB294 \uC2DC\uC120 \uD750\uB984\uACFC \uD3EC\uCEEC\uC758 \uBA85\uD655\uC131." },
  { id: "brand", name: "\uBE0C\uB79C\uB4DC\xB7\uD1A4 \uC77C\uCE58", weight: 8, maxScore: 100, description: "\uAC8C\uC784/\uBE0C\uB79C\uB4DC \uC815\uCCB4\uC131\uACFC \uCEA0\uD398\uC778 \uBB34\uB4DC\uC758 \uC77C\uCE58\uB3C4." },
  { id: "detail", name: "\uC644\uC131\uB3C4 / \uB514\uD14C\uC77C", weight: 8, maxScore: 100, description: "\uBE5B/\uB381\uC2A4/\uD569\uC131/\uB9C8\uAC10\uC758 \uB514\uD14C\uC77C. \uCE90\uB9AD\uD130 \uC5C6\uB294 \uB2E8\uC21C \uB098\uC5F4\uC740 90\uC810 \uC774\uC0C1 \uAE08\uC9C0." },
  { id: "conversion", name: "\uD074\uB9AD/\uC2A4\uD06C\uB864 \uC720\uB3C4\uB825", weight: 4, maxScore: 100, description: "\uC544\uB798 \uCF58\uD150\uCE20\uB85C \uB0B4\uB824\uAC00\uAC70\uB098 \uCC38\uC5EC\uD558\uACE0 \uC2F6\uAC8C \uB9CC\uB4DC\uB294 \uB9E4\uB825\uB3C4." }
];
var PROMPT_SEED = [];
var TYPO2D_SEED = [
  { id: "impression", name: "\uCCAB\uC778\uC0C1 / \uC2DC\uAC01 \uC784\uD329\uD2B8", weight: 10, maxScore: 100, description: "\uD55C\uB208\uC5D0 \uC2DC\uC120\uC744 \uC0AC\uB85C\uC7A1\uB294 \uAC15\uB82C\uD568. \uD3C9\uBC94\uD55C \uD3F0\uD2B8 + \uD3C9\uC774\uD55C \uC0C9 \uC870\uD569\uC774\uBA74 70\uC810\uB300." },
  { id: "concept", name: "\uCF58\uC149\uD2B8 \uD45C\uD604\uB825", weight: 10, maxScore: 100, description: "\uBA54\uC2DC\uC9C0/\uAC10\uC815\uC774 \uD0C0\uC774\uD3EC \uC790\uCCB4\uB85C \uC804\uB2EC\uB418\uB294\uC9C0. \uAE00\uAF34 \uC120\uD0DD\uC774 \uBA54\uC2DC\uC9C0 \uD1A4\uACFC \uB9DE\uB294\uC9C0." },
  { id: "layout", name: "\uAD6C\uC131/\uC5EC\uBC31", weight: 10, maxScore: 100, description: "\uD654\uBA74 \uBD84\uD560\uACFC \uC5EC\uBC31 \uD65C\uC6A9. \uB2F5\uB2F5\uD558\uC9C0 \uC54A\uACE0 \uC758\uB3C4\uB41C \uD638\uD761\uC774 \uC788\uB294\uC9C0." },
  { id: "typography", name: "\uC790\uAC04/\uC870\uD310 \uC815\uBC00\uB3C4", weight: 14, maxScore: 100, description: "\uC790\uAC04/\uC7A5\uD3C9/\uBCA0\uC774\uC2A4\uB77C\uC778 \uC815\uBC00\uB3C4. \uC790\uBAA8 \uADE0\uD615, \uAE00\uC790 \uAC04\uACA9\uC758 \uC77C\uAD00\uC131. \uD0C0\uC774\uD3EC \uB514\uC790\uC778\uC758 \uD575\uC2EC." },
  { id: "color", name: "\uC0C9 \uC870\uD654", weight: 10, maxScore: 100, description: "\uBC30\uACBD/\uD14D\uC2A4\uD2B8 \uC0C9 \uC870\uD569\uC758 \uC870\uD654. \uCF58\uD2B8\uB77C\uC2A4\uD2B8\uAC00 \uC801\uC808\uD558\uACE0 \uD1A4\uC774 \uC77C\uAD00\uB41C\uC9C0." },
  { id: "readability", name: "\uAC00\uB3C5\uC131", weight: 12, maxScore: 100, description: "\uD3F0\uD2B8 \uC120\uD0DD, \uD06C\uAE30, \uC0C9 \uB300\uBE44\uAC00 \uBE60\uB978 \uC2DD\uBCC4\uC131\uC744 \uBCF4\uC7A5\uD558\uB294\uC9C0. \uC791\uC740 \uD06C\uAE30\uC5D0\uC11C\uB3C4 \uC77D\uD788\uB294\uC9C0." },
  { id: "brand", name: "\uBE0C\uB79C\uB4DC \uD1A4 \uC77C\uCE58", weight: 8, maxScore: 100, description: "\uBE0C\uB79C\uB4DC/\uC81C\uD488\uC758 \uD1A4\uC564\uB9E4\uB108\uC5D0 \uBD80\uD569\uD558\uB294 \uD3F0\uD2B8\uC640 \uC2A4\uD0C0\uC77C\uC778\uC9C0." },
  { id: "flow", name: "\uC2DC\uAC01 \uB9AC\uB4EC", weight: 10, maxScore: 100, description: "\uAD75\uAE30 \uB300\uBE44, \uD06C\uAE30 \uB300\uBE44, \uAC04\uACA9\uC758 \uBC18\uBCF5 \uD328\uD134\uC774 \uC2DC\uAC01\uC801 \uB9AC\uB4EC\uC744 \uB9CC\uB4DC\uB294\uC9C0." },
  { id: "detail", name: "\uB9C8\uAC10/\uB514\uD14C\uC77C", weight: 8, maxScore: 100, description: "\uD53D\uC140 \uB2E8\uC704 \uB514\uD14C\uC77C\uC758 \uC644\uC131\uB3C4. \uAE68\uC9C4 \uC678\uACFD, \uC5B4\uC0C9\uD55C \uC790\uBAA8, \uBBF8\uC138 \uC815\uB82C \uC624\uCC28 \uC5C6\uC74C." },
  { id: "conversion", name: "\uC815\uB82C/\uADF8\uB9AC\uB4DC \uC815\uD655\uC131", weight: 8, maxScore: 100, description: "\uC218\uD559\uC801 \uC815\uB82C\uACFC \uADF8\uB9AC\uB4DC \uC900\uC218 + \uC2DC\uAC01\uC801 \uC815\uB82C(optical) \uBCF4\uC815." }
];
var TYPO_RENDER_SEED = [
  { id: "impression", name: "\uC2DC\uB124\uB9C8\uD2F1 \uC784\uD329\uD2B8", weight: 10, maxScore: 100, description: "\uD55C \uC7A5\uC758 \uC2DC\uC548\uC73C\uB85C \uC784\uD329\uD2B8\uAC00 \uC788\uB294\uC9C0. AAA \uAC8C\uC784 \uD0C0\uC774\uD2C0\uAE09 \uBB34\uAC8C\uAC10/\uC874\uC7AC\uAC10." },
  { id: "concept", name: "\uCF58\uC149\uD2B8 \uC77C\uCE58\uB3C4", weight: 10, maxScore: 100, description: "\uC758\uB3C4\uD55C \uBD84\uC704\uAE30(\uB2E4\uD06C\uD310\uD0C0\uC9C0/\uD558\uC774\uD14C\uD06C/\uD504\uB9AC\uBBF8\uC5C4 \uB4F1)\uAC00 \uC815\uD655\uD788 \uC804\uB2EC\uB418\uB294\uC9C0." },
  { id: "layout", name: "\uC785\uCCB4\uAC10 (Volume)", weight: 8, maxScore: 100, description: "\uC815\uBA74 \uBD80\uC870/\uD6C4\uBA74 \uB3CC\uCD9C\uC758 \uADE0\uD615. \uB450\uAED8\uAC00 \uACFC\uD558\uAC70\uB098 \uBD80\uC871\uD558\uC9C0 \uC54A\uACE0 \uC758\uB3C4\uB41C \uAE4A\uC774\uC778\uC9C0." },
  { id: "typography", name: "\uC2E4\uB8E8\uC5E3 \uBCF4\uC874", weight: 14, maxScore: 100, description: "\uC6D0\uBCF8 \uD0C0\uC774\uD3EC\uC758 \uC724\uACFD\uC774 \uC815\uD655\uD788 \uC720\uC9C0\uB418\uB294\uC9C0. \uBCC0\uD615/\uB179\uC544\uB0B4\uB9BC/\uD615\uD0DC \uC65C\uACE1\uC774 \uC5C6\uB294\uC9C0." },
  { id: "color", name: "\uCEEC\uB7EC \uADF8\uB808\uC774\uB529", weight: 8, maxScore: 100, description: "\uC2DC\uB124\uB9C8\uD2F1 \uD1A4\uB9E4\uD551. \uCC44\uB3C4/\uB300\uBE44/\uC0C9\uC628\uB3C4\uAC00 \uBD84\uC704\uAE30\uC5D0 \uB9DE\uACE0 \uC601\uC0C1\uBBF8\uAC00 \uC788\uB294\uC9C0." },
  { id: "readability", name: "\uBAA8\uC11C\uB9AC/\uC5E3\uC9C0 \uC815\uBC00\uB3C4", weight: 8, maxScore: 100, description: "\uC678\uACFD\uC120\uC774 \uAE54\uB054\uD558\uACE0 \uC0C9\uBC88\uC9D0/blob \uC5C6\uC74C. \uBAA8\uC11C\uB9AC\uAC00 \uC0B4\uC544 \uC788\uB294\uC9C0." },
  { id: "brand", name: "\uC7AC\uC9C8 \uD45C\uD604 (Material)", weight: 14, maxScore: 100, description: "PBR \uC7AC\uC9C8\uC758 \uC0AC\uC2E4\uC131. \uAE08\uC18D/\uC5BC\uC74C/\uB3CC \uB4F1\uC774 \uC9C4\uC9DC \uAC19\uC740\uC9C0, \uAC00\uC9DC \uC170\uC774\uB529\uC774\uB098 \uD50C\uB77C\uC2A4\uD2F1 \uB290\uB08C \uC5C6\uB294\uC9C0." },
  { id: "flow", name: "\uB77C\uC774\uD305 (Lighting)", weight: 10, maxScore: 100, description: "\uC8FC\uAD11/\uCE21\uAD11/\uB9BC\uB77C\uC774\uD2B8\uC758 \uC790\uC5F0\uC2A4\uB7EC\uC6C0. \uADF8\uB9BC\uC790/\uD558\uC774\uB77C\uC774\uD2B8\uAC00 \uD615\uD0DC\uC5D0 \uBD80\uD569\uD558\uACE0 \uC785\uCCB4\uAC10\uC744 \uC0B4\uB9AC\uB294\uC9C0." },
  { id: "detail", name: "\uD45C\uBA74 \uB514\uD14C\uC77C", weight: 10, maxScore: 100, description: "\uBBF8\uC138 \uD14D\uC2A4\uCC98(\uC2A4\uD06C\uB798\uCE58, \uACB0, \uADE0\uC5F4)\uC758 \uBC00\uB3C4\uC640 \uC0AC\uC2E4\uC131. \uB108\uBB34 \uB9E4\uB044\uB7FD\uAC70\uB098 \uB108\uBB34 \uC9C0\uC800\uBD84\uD558\uC9C0 \uC54A\uC740\uC9C0." },
  { id: "conversion", name: "\uBC30\uACBD \uBD84\uB9AC / \uAE30\uC220 \uC644\uC131\uB3C4", weight: 8, maxScore: 100, description: "\uAE54\uB054\uD55C \uCEF7\uC544\uC6C3. plaque(\uBCBD\uBA74 \uBD80\uC870)\uCC98\uB7FC \uBCF4\uC774\uC9C0 \uC54A\uACE0, AI \uC544\uD2F0\uD329\uD2B8/\uB178\uC774\uC988 \uC5C6\uC74C." }
];
var TYPO_MOTION_SEED = [
  { id: "impression", name: "\uBAA8\uC158 \uC784\uD329\uD2B8", weight: 10, maxScore: 100, description: "\uD0A4\uD504\uB808\uC784 \uD55C \uC7A5\uC5D0\uC11C\uB3C4 \uBAA8\uC158\uC758 \uBC15\uB825/\uB9E4\uB825\uC774 \uC804\uB2EC\uB418\uB294\uC9C0. Hollywood title sequence \uC758 \uD55C \uCEF7 \uAC19\uC740\uC9C0." },
  { id: "concept", name: "\uCF58\uC149\uD2B8 \uD45C\uD604", weight: 10, maxScore: 100, description: "\uBD84\uC704\uAE30/\uC7A5\uB974(\uB2E4\uD06C/\uD31D/\uD558\uC774\uD14C\uD06C)\uAC00 \uBAA8\uC158 \uC804\uBC18\uC5D0\uC11C \uC77C\uAD00\uB418\uAC8C \uC804\uB2EC\uB418\uB294\uC9C0." },
  { id: "layout", name: "\uCE74\uBA54\uB77C \uBB34\uBE59", weight: 8, maxScore: 100, description: "\uCE74\uBA54\uB77C \uC6C0\uC9C1\uC784\uC758 \uC548\uC815\uC131. \uC758\uB3C4 \uC5C6\uB294 zoom/drift \uAC00 \uC5C6\uACE0 \uC758\uB3C4\uD55C \uB3D9\uC120\uACFC \uBD80\uD569\uD558\uB294\uC9C0." },
  { id: "typography", name: "\uD615\uD0DC \uC548\uC815\uC131", weight: 14, maxScore: 100, description: "\uBAA8\uC158 \uC911\uC5D0\uB3C4 \uAE00\uC790 \uC678\uACFD\uC774 \uD754\uB4E4\uB9AC\uAC70\uB098 \uBCC0\uD615\uB418\uC9C0 \uC54A\uB294\uC9C0. wobble/morph/melting \uC5C6\uB294\uC9C0." },
  { id: "color", name: "\uCEEC\uB7EC \uADF8\uB808\uC774\uB529", weight: 8, maxScore: 100, description: "\uC2DC\uB124\uB9C8\uD2F1 \uCEEC\uB7EC \uB8E9. \uBAA8\uC158 \uC911 \uC0C9\uC0C1\uC774 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uD750\uB974\uB294\uC9C0." },
  { id: "readability", name: "\uBAA8\uC158 \uC911 \uAC00\uB3C5\uC131", weight: 10, maxScore: 100, description: "\uC6C0\uC9C1\uC774\uB294 \uB3D9\uC548\uC5D0\uB3C4 \uD14D\uC2A4\uD2B8\uAC00 \uC77D\uD788\uB294\uC9C0. \uBAA8\uC158 \uBE14\uB7EC/\uC774\uD399\uD2B8\uAC00 \uAC00\uB3C5\uC131\uC744 \uD574\uCE58\uC9C0 \uC54A\uB294\uC9C0." },
  { id: "brand", name: "\uBAA8\uC158 \uB9AC\uB4EC", weight: 10, maxScore: 100, description: "easing \uACE1\uC120\uACFC \uBC15\uC790\uAC10. \uAE30\uACC4\uC801\uC774\uC9C0 \uC54A\uACE0 \uC0B4\uC544\uC788\uB294 \uC6C0\uC9C1\uC784\uC758 \uD754\uC801\uC774 \uBCF4\uC774\uB294\uC9C0." },
  { id: "flow", name: "\uD0C0\uC774\uBC0D (\uD638\uD761)", weight: 12, maxScore: 100, description: "\uB4F1\uC7A5/\uC720\uC9C0/\uD1F4\uC7A5\uC758 \uD638\uD761. \uC2DC\uC791\uC774 \uB108\uBB34 \uAC11\uC791\uC2A4\uB7FD\uAC70\uB098 \uB05D\uC774 \uC5B4\uC0C9\uD558\uC9C0 \uC54A\uC740\uC9C0." },
  { id: "detail", name: "\uAE30\uC220 \uD488\uC9C8", weight: 8, maxScore: 100, description: "\uC555\uCD95 \uC544\uD2F0\uD329\uD2B8/\uAE5C\uBE61\uC784/\uD504\uB808\uC784 \uB4DC\uB86D \uC5C6\uC74C. \uC0C9 \uBC88\uC9D0\uC774\uB098 \uCF54\uB371 \uC774\uC288 \uC5C6\uB294\uC9C0." },
  { id: "conversion", name: "\uB8E8\uD504/\uC774\uD399\uD2B8 \uC644\uC131\uB3C4", weight: 10, maxScore: 100, description: "\uBB34\uD55C \uBC18\uBCF5\uC77C \uACBD\uC6B0 \uC2DC\uC791/\uB05D\uC810 \uC5F0\uACB0\uC758 \uC790\uC5F0\uC2A4\uB7EC\uC6C0 + \uD30C\uD2F0\uD074\uC774 \uD504\uB808\uC784\uC744 \uC774\uD0C8\uD558\uC9C0 \uC54A\uB294\uC9C0." }
];
var BANNER_SCORING_RULES = `[\uCC44\uC810 \uADDC\uCE59 \u2014 \uB9E4\uC6B0 \uC911\uC694]
1. [\u2605\uCD5C\uACE0\uC810 \uAE30\uC900 - \uD558\uC774\uC5D4\uB4DC \uD004\uB9AC\uD2F0] \uBC30\uACBD\uC744 \uB2E8\uC21C\uD654\uD558\uACE0 \uC2DC\uC120 \uC9D1\uC911\uB3C4\uB97C \uB192\uC778 \uAC83\uC740 \uC88B\uC73C\uB098, 90\uC810 \uC774\uC0C1(\uCD5C\uACE0\uC810)\uC744 \uC8FC\uB824\uBA74 \uD004\uB9AC\uD2F0 \uB192\uC740 \uCE90\uB9AD\uD130 \uC544\uD2B8, \uC138\uB828\uB41C \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C, \uB2E4\uC774\uB0B4\uBBF9\uD55C \uC5F0\uCD9C\uC774 \uB3D9\uBC18\uB41C '\uD558\uC774\uC5D4\uB4DC \uB514\uC790\uC778'\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.
2. [\uB9E4\uC6B0 \uC911\uC694 - \uB2E8\uC870\uB85C\uC6B4 \uAE30\uBCF8 \uAD6C\uB3C4 \uC0C1\uD55C\uC120] \uC911\uC559\uC5D0 \uBCF4\uBB3C\uC0C1\uC790 \uD558\uB098\uB9CC \uB369\uADF8\uB7EC\uB2C8 \uC788\uAC70\uB098, \uD5C8\uACF5\uC5D0 \uC544\uC774\uD15C \uBA87 \uAC1C\uAC00 \uB5A0 \uC788\uB294 \uC218\uC900\uC758 '1\uCC28\uC6D0\uC801\uC774\uACE0 \uD754\uD55C \uAE30\uBCF8 \uAD6C\uB3C4(Generic/Basic Layout)'\uB77C\uBA74, \uAC00\uB3C5\uC131\uACFC \uC2DC\uC120 \uC9D1\uC911\uB3C4\uAC00 \uC544\uBB34\uB9AC \uC88B\uB354\uB77C\uB3C4 \uC808\uB300 90\uC810 \uC774\uC0C1\uC744 \uC8FC\uC9C0 \uB9D0\uACE0 \uC804\uCCB4 \uCD1D\uC810\uC774 80\uC810\uB300 \uCD08\uC911\uBC18(80~85\uC810)\uC5D0 \uBA38\uBB3C\uB3C4\uB85D \uC810\uC218\uB97C \uC81C\uD55C(Cap)\uD558\uC138\uC694.
3. [\uB9E4\uC6B0 \uC911\uC694 - \uC0B0\uB9CC\uD568 \uBC0F \uAD6C\uB3C4 \uBD84\uC0B0 \uAC10\uC810] \uCE90\uB9AD\uD130\uAC00 \uC591\uC606\uC73C\uB85C \uBD84\uC0B0 \uBC30\uCE58\uB418\uACE0, \uD654\uBA74 \uACF3\uACF3\uC5D0 \uC544\uC774\uD15C\uC774\uB098 \uC624\uBE0C\uC81D\uD2B8\uAC00 \uADDC\uCE59 \uC5C6\uC774 \uD769\uC5B4\uC838 \uC0B0\uB9CC\uD55C \uB290\uB08C\uC744 \uC900\uB2E4\uBA74 'layout'\uACFC 'flow', 'impression' \uC810\uC218\uB97C 70\uC810\uB300\uB85C \uAC00\uCC28 \uC5C6\uC774 \uAE4E\uC544 \uC804\uCCB4 \uCD1D\uC810\uC774 80\uC810\uB300 \uCD08\uC911\uBC18(80~83\uC810) \uC774\uD558\uB85C \uB5A8\uC5B4\uC9C0\uAC8C \uB9CC\uB4DC\uC138\uC694.
4. [\uC911\uC694 \uAC10\uC810 - \uC0C9\uC0C1/\uBA85\uB3C4 \uB300\uBE44 \uBD80\uC871] \uBA54\uC778 \uD0C0\uC774\uD2C0\uC758 \uC0C9\uC0C1\uC774 \uBC30\uACBD \uC0C9\uC0C1\uACFC \uACB9\uCCD0\uC11C \uC2DC\uAC01\uC801\uC73C\uB85C \uBB3B\uD788\uB294 \uACBD\uC6B0, 'typography', 'readability', 'color'\uB97C 60~70\uC810\uB300\uB85C \uAE4E\uC73C\uC138\uC694. \uCE90\uB9AD\uD130 \uD004\uB9AC\uD2F0\uAC00 \uC88B\uB2E4\uBA74 \uB2E4\uB978 \uD56D\uBAA9\uC73C\uB85C \uBCF4\uC644\uD574 70\uC810\uB300 \uD6C4\uBC18~80\uC810\uB300 \uCD08\uBC18\uC73C\uB85C \uB9DE\uCD94\uC138\uC694.
5. [\uB9E4\uC6B0 \uC911\uC694 - \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uC77C\uAD00\uC131] \uBA54\uC778\uCE74\uD53C, \uC11C\uBE0C\uCE74\uD53C, \uB0A0\uC9DC \uD328\uB110 \uB514\uC790\uC778\uC774 \uCD0C\uC2A4\uB7FD\uAC70\uB098 \uC804\uCCB4 \uCEE8\uC149\uACFC \uAC89\uB3CC\uBA74 'typography'\uB97C \uAC15\uB825\uD788 \uAC10\uC810\uD558\uC138\uC694.
6. \uC804\uBC18\uC801\uC778 \uC810\uC218 \uB300\uC5ED\uC744 '60\uC810 ~ 95\uC810' \uC0AC\uC774\uB85C \uD3ED\uB113\uAC8C \uC0AC\uC6A9\uD558\uC5EC \uB514\uC790\uC778 \uD004\uB9AC\uD2F0\uC758 \uBCC0\uBCC4\uB825\uC744 \uD655\uC2E4\uD558\uAC8C \uB192\uC774\uC138\uC694.`;
var SCORING_RULES_SEED = {
  [CRITERIA_TYPES.banner]: BANNER_SCORING_RULES
};
var SEEDS = {
  [CRITERIA_TYPES.banner]: { items: BANNER_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: SCORING_RULES_SEED.banner || "" },
  [CRITERIA_TYPES.promotion]: { items: PROMOTION_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.brandweb]: { items: BRANDWEB_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.brandwebSub]: { items: BRANDWEB_SUB_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.brandwebMobile]: { items: BRANDWEB_MOBILE_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.promotionMobile]: { items: PROMOTION_MOBILE_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.promotionKv]: { items: PROMOTION_KV_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.prompt]: { items: PROMPT_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.typo2d]: { items: TYPO2D_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.typoRender]: { items: TYPO_RENDER_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" },
  [CRITERIA_TYPES.typoMotion]: { items: TYPO_MOTION_SEED, name: "v1.0 (\uC2DC\uB4DC)", rules: "" }
};
function getSeedCriteria(type) {
  return SEEDS[type]?.items || [];
}
function formatCriteriaList(items) {
  if (!Array.isArray(items) || items.length === 0) return "(\uD3C9\uAC00 \uD56D\uBAA9 \uC5C6\uC74C)";
  return items.map((c, i) => {
    const w = typeof c.weight === "number" && !Number.isNaN(c.weight) ? `[${c.weight}%]` : "";
    const desc = c.description ? `
     \xB7 ${c.description}` : "";
    return `${i + 1}. (${c.id}) ${c.name} ${w}${desc}`.trim();
  }).join("\n");
}
function getSeedRules(type) {
  return SEEDS[type]?.rules || "";
}

// scripts/lib/nexus-evaluation-criteria.mjs
var DEFAULT_TIMEOUT_MS = 15e3;
function readEnvFile(projectRoot) {
  try {
    const text2 = fs.readFileSync(path.join(projectRoot, ".env"), "utf8");
    return Object.fromEntries(text2.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) return [];
      return [[match[1], match[2].replace(/^(?:"(.*)"|'(.*)')$/, (_m, a, b) => a ?? b ?? "")]];
    }));
  } catch {
    return {};
  }
}
function firebaseConfig(projectRoot) {
  const fileEnv = readEnvFile(projectRoot);
  return {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || fileEnv.VITE_FIREBASE_PROJECT_ID || "",
    apiKey: process.env.VITE_FIREBASE_API_KEY || fileEnv.VITE_FIREBASE_API_KEY || ""
  };
}
function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return value;
}
function decodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}
function decodeFirestoreDocument(document2) {
  return {
    id: String(document2?.name || "").split("/").pop(),
    ...decodeFirestoreFields(document2?.fields || {}),
    _documentCreatedAt: document2?.createTime || null,
    _documentUpdatedAt: document2?.updateTime || null
  };
}
function timeOf(version) {
  for (const value of [version?.updatedAt, version?.createdAt, version?._documentUpdatedAt, version?._documentCreatedAt]) {
    const parsed = Date.parse(String(value || ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
function defaultCachePath(projectRoot, type) {
  return path.join(projectRoot, ".tmp", "nexus-skill-cache", `evaluation-criteria-${type}.json`);
}
async function listCriteriaVersions({ projectRoot, type, timeoutMs }) {
  const { projectId, apiKey } = firebaseConfig(projectRoot);
  if (!projectId) throw new Error("VITE_FIREBASE_PROJECT_ID\uAC00 \uC5C6\uC5B4 Nexus \uD65C\uC131 \uAE30\uC900\uC744 \uC870\uD68C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`${base}/evaluationCriteria/${encodeURIComponent(type)}/versions`);
    url.searchParams.set("pageSize", "100");
    if (apiKey) url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      const body = await response.text();
      let detail = body;
      try {
        detail = JSON.parse(body)?.error?.message || body;
      } catch {
      }
      throw new Error(`Firestore ${response.status}: ${detail}`);
    }
    const payload = await response.json();
    documents.push(...(payload.documents || []).map(decodeFirestoreDocument));
    pageToken = payload.nextPageToken || "";
  } while (pageToken && documents.length < 500);
  return documents;
}
function chooseVersion(versions, type) {
  if (!versions.length) throw new Error(`Nexus\uC5D0 ${type} \uD3C9\uAC00 \uAE30\uC900 \uBC84\uC804\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`);
  const active = versions.filter((version) => version.isActive === true);
  const candidates = (active.length ? active : versions).sort((a, b) => timeOf(b) - timeOf(a) || String(b.id).localeCompare(String(a.id)));
  const selected = candidates[0];
  const validation = validateCriteria(selected.criteria || []);
  if (!validation.valid) {
    const details = [
      validation.missingIds.length ? `ID \uB204\uB77D=${validation.missingIds.join(",")}` : "",
      validation.duplicateIds.length ? `\uC911\uBCF5 ID=${validation.duplicateIds.join(",")}` : "",
      validation.invalidWeights.length ? `\uAC00\uC911\uCE58 \uC624\uB958=${validation.invalidWeights.join(",")}` : ""
    ].filter(Boolean).join("; ");
    throw new Error(`Nexus \uD65C\uC131 \uAE30\uC900\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4${details ? `: ${details}` : ""}.`);
  }
  return {
    criteriaType: type,
    criteriaVersionId: selected.id,
    criteriaVersionName: selected.name || selected.id,
    criteria: criteriaSnapshot(validation.normalized),
    rules: typeof selected.rules === "string" ? selected.rules : "",
    gate: NEXUS_QUALITY_GATE,
    duplicateActiveCount: active.length,
    weightSum: validation.weightSum,
    remoteUpdatedAt: selected.updatedAt || selected._documentUpdatedAt || null
  };
}
function readCache(cachePath, type) {
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const validation = validateCriteria(cached.criteria || []);
    if (!validation.valid || cached.criteriaType !== type) return null;
    return { ...cached, criteria: criteriaSnapshot(validation.normalized) };
  } catch {
    return null;
  }
}
function writeCache(cachePath, snapshot) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(snapshot, null, 2)}
`, "utf8");
}
function seedFallback(type) {
  const items = getSeedCriteria(type);
  if (!items.length) return null;
  return {
    criteriaType: type,
    criteriaVersionId: "seed",
    criteriaVersionName: `${type} \uC2DC\uB4DC (v1.0)`,
    criteria: criteriaSnapshot(items),
    rules: getSeedRules(type) || "",
    gate: NEXUS_QUALITY_GATE,
    duplicateActiveCount: 0,
    remoteUpdatedAt: null
  };
}
async function loadActiveNexusCriteria({
  type = "banner",
  projectRoot = process.cwd(),
  cachePath = defaultCachePath(projectRoot, type),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  strictLive = false
} = {}) {
  const normalizedType = String(type || "banner").trim();
  try {
    const versions = await listCriteriaVersions({ projectRoot, type: normalizedType, timeoutMs });
    const selected = chooseVersion(versions, normalizedType);
    const warnings = [];
    if (selected.duplicateActiveCount > 1) warnings.push(`\uD65C\uC131 \uBC84\uC804\uC774 ${selected.duplicateActiveCount}\uAC1C\uB77C \uCD5C\uC2E0 \uBC84\uC804 ${selected.criteriaVersionId}\uC744 \uC120\uD0DD\uD588\uC2B5\uB2C8\uB2E4.`);
    if (Math.abs(selected.weightSum - 100) > 1e-3) warnings.push(`\uD65C\uC131 \uAE30\uC900\uC758 \uAC00\uC911\uCE58 \uD569\uC774 ${selected.weightSum}\uC785\uB2C8\uB2E4. \uACC4\uC0B0\uC740 \uC0C1\uB300 \uAC00\uC911\uCE58\uB85C \uC815\uADDC\uD654\uB429\uB2C8\uB2E4.`);
    const snapshot = {
      ...selected,
      source: "nexus-live",
      stale: false,
      syncWarning: warnings.join(" "),
      syncedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeCache(cachePath, snapshot);
    return snapshot;
  } catch (error) {
    if (strictLive) throw error;
    const cached = readCache(cachePath, normalizedType);
    if (cached) {
      return {
        ...cached,
        source: "last-known-good-cache",
        stale: true,
        syncWarning: [`Nexus \uC2E4\uC2DC\uAC04 \uC870\uD68C \uC2E4\uD328\uB85C \uB9C8\uC9C0\uB9C9 \uC815\uC0C1 \uAE30\uC900\uC744 \uC0AC\uC6A9\uD588\uC2B5\uB2C8\uB2E4: ${error.message}`, cached.syncWarning].filter(Boolean).join(" ")
      };
    }
    const fallback = seedFallback(normalizedType);
    if (!fallback) throw error;
    return {
      ...fallback,
      source: "bundled-seed-fallback",
      stale: true,
      syncWarning: `Nexus \uC2E4\uC2DC\uAC04 \uC870\uD68C \uC2E4\uD328 \uBC0F \uCE90\uC2DC \uC5C6\uC74C\uC73C\uB85C \uACF5\uC6A9 \uC2DC\uB4DC\uB97C \uC0AC\uC6A9\uD588\uC2B5\uB2C8\uB2E4: ${error.message}`,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
function formatNexusCriteriaMarkdown(snapshot) {
  const criteriaLines = snapshot.criteria.map(
    (item, index) => `${index + 1}. \`${item.id}\` \u2014 ${item.name} (\uAC00\uC911\uCE58 ${item.weight})${item.description ? `
   - ${item.description}` : ""}`
  ).join("\n");
  const rules = snapshot.rules?.trim() || "(\uCD94\uAC00 \uCC44\uC810 \uADDC\uCE59 \uC5C6\uC74C)";
  const warning = snapshot.syncWarning ? `
> \uB3D9\uAE30\uD654 \uACBD\uACE0: ${snapshot.syncWarning}
` : "";
  return `# Nexus \uD65C\uC131 \uB514\uC790\uC778 \uD3C9\uAC00 \uAE30\uC900

- \uC720\uD615: ${snapshot.criteriaType}
- \uBC84\uC804: ${snapshot.criteriaVersionName} (\`${snapshot.criteriaVersionId}\`)
- \uC18C\uC2A4: ${snapshot.source}
- \uB3D9\uAE30\uD654: ${snapshot.syncedAt}${warning}
## \uD3C9\uAC00 \uD56D\uBAA9

${criteriaLines}

## \uD65C\uC131 \uCC44\uC810 \uADDC\uCE59

${rules}

## \uD488\uC9C8 \uAC8C\uC774\uD2B8

- \uAC00\uC911 \uC885\uD569\uC810\uC218 ${snapshot.gate.overall} \uC774\uC0C1
- \uBAA8\uB4E0 \uD56D\uBAA9 ${snapshot.gate.everyMetric} \uC774\uC0C1
- \uCE58\uBA85\uC801 \uACB0\uD568 ${snapshot.gate.hardFailures}\uAC74 \uC774\uD558
`;
}

// src/apps/NexusPreview/services/titlePrompt.js
var TITLE_FX_EFFECTS = [
  { key: "speed", ko: "\uC18D\uB3C4\uAC10", en: "\uD0C0\uC774\uD2C0 \uB4A4\xB7\uC606\uC73C\uB85C \uD750\uB974\uB294 \uC2A4\uD53C\uB4DC \uB77C\uC778\uACFC \uC9C8\uC8FC\uD558\uB294 \uAE30\uB958 \uC2A4\uD2B8\uB9AD \u2014 \uAE00\uC790\uAC00 \uBE60\uB974\uAC8C \uB3CC\uC9C4\uD558\uB294 \uB4EF\uD55C \uC6B4\uB3D9\uAC10. \uC2A4\uD2B8\uB9AD\uC740 \uAE00\uC790 \uB4A4\uC5D0\uC11C \uD758\uB7EC\uB098\uC624\uB418 \uAE00\uC790 \uD68D\uC744 \uB36E\uC9C0 \uC54A\uAC8C." },
  { key: "blur", ko: "\uBAA8\uC158\uBE14\uB7EC", en: "\uD0C0\uC774\uD2C0\uC5D0 \uBC29\uD5A5\uC131 \uBAA8\uC158\uBE14\uB7EC \uC794\uC0C1(\uD2B8\uB808\uC77C)\uC744 \uB354\uD558\uC138\uC694 \u2014 \uAE00\uC790 \uBCF8\uCCB4\uB294 \uC120\uBA85\uD558\uAC8C \uB450\uACE0, \uC774\uB3D9 \uBC29\uD5A5 \uBC18\uB300\uCABD\uC73C\uB85C \uBC18\uD22C\uBA85 \uC794\uC0C1\uC774 \uACB9\uCCD0 \uD750\uB974\uB294 \uC2A4\uD53C\uB514\uD55C \uC5F0\uCD9C." },
  { key: "frost", ko: "\uC11C\uB9AC\xB7\uC131\uC5D0", en: "\uAE00\uC790 \uAC00\uC7A5\uC790\uB9AC\uC5D0 \uC5BC\uC5B4\uBD99\uB294 \uC11C\uB9AC\xB7\uC131\uC5D0 \uACB0\uC815\uACFC \uCC28\uAC00\uC6B4 \uB0C9\uAE30 \uC218\uC99D\uAE30 \u2014 \uAE00\uC790 \uD45C\uBA74 \uC704\uC544\uB798\uB85C \uC587\uC740 \uC5BC\uC74C \uC11C\uB9AC\uAC00 \uBC88\uC9C0\uACE0 \uD478\uB978 \uB0C9\uAE30\uAC00 \uC740\uC740\uD558\uAC8C \uD53C\uC5B4\uC624\uB974\uB294 \uC5F0\uCD9C." },
  { key: "aura", ko: "\uC544\uC6B0\uB77C", en: "\uAE00\uC790 \uC724\uACFD\uC744 \uB530\uB77C \uAC10\uB3C4\uB294 \uBC1C\uAD11 \uC544\uC6B0\uB77C\uC640 \uC678\uACFD \uAE00\uB85C\uC6B0 \u2014 \uAE00\uC790 \uC2E4\uB8E8\uC5E3\uC5D0\uC11C \uBE5B\uC774 \uBC30\uC5B4 \uB098\uC624\uB294 \uC2E0\uC131\uD55C/\uC5D0\uB108\uC9C0 \uD6C4\uAD11." },
  { key: "mist", ko: "\uC548\uAC1C", en: "\uD0C0\uC774\uD2C0 \uD558\uB2E8\uC5D0 \uB0AE\uAC8C \uAE54\uB9AC\uB294 \uC548\uAC1C\xB7\uC5F0\uBB34\uC640 \uAE00\uC790 \uC0AC\uC774\uB97C \uAC10\uB3C4\uB294 \uC605\uC740 \uBBF8\uC2A4\uD2B8 \u2014 \uC2E0\uBE44\uB86D\uACE0 \uBD84\uC704\uAE30 \uC788\uB294 \uBB34\uB4DC." },
  { key: "gold", ko: "\uAE08\uBE5B", en: "\uB530\uB73B\uD55C \uAE08\uBE5B \uAD11\uCC44, \uD769\uB0A0\uB9AC\uB294 \uAE08\uAC00\uB8E8 \uD30C\uD2F0\uD074, \uAE00\uC790 \uD68D\uC744 \uC2A4\uCE58\uB294 \uACE8\uB4DC \uAE00\uB9B0\uD2B8\uC640 \uBBF8\uC138\uD55C \uBE5B\uC904\uAE30 \u2014 \uACE0\uAE09\uC2A4\uB7FD\uACE0 \uD654\uB824\uD55C \uD504\uB9AC\uBBF8\uC5C4 \uC5F0\uCD9C." },
  { key: "glitch", ko: "\uAE00\uB9AC\uCE58", en: "\uB514\uC9C0\uD138 \uAE00\uB9AC\uCE58 \u2014 RGB \uCC44\uB110 \uBD84\uB9AC(\uC0C9\uC218\uCC28), \uC2A4\uCE94\uB77C\uC778, \uC21C\uAC04\uC801\uC73C\uB85C \uC5B4\uAE0B\uB098\uB294 \uC2AC\uB77C\uC774\uC2A4\uC640 \uB178\uC774\uC988 \uD504\uB798\uADF8\uBA3C\uD2B8\uAC00 \uAE00\uC790 \uC8FC\uBCC0\uC5D0 \uBC88\uCA4D\uC774\uB294 \uC0AC\uC774\uBC84/\uB514\uC9C0\uD138 \uC5F0\uCD9C. \uB2E8, \uAE00\uC790\uC758 \uD310\uB3C5\uC131\uC740 \uBC18\uB4DC\uC2DC \uC720\uC9C0." },
  { key: "spark", ko: "\uBD88\uD2F0\xB7\uC2A4\uD30C\uD06C", en: "\uAE00\uC790 \uC8FC\uC704\uB85C \uD280\uB294 \uBD88\uD2F0\xB7\uC5D0\uB108\uC9C0 \uC2A4\uD30C\uD06C\uC640 \uC704\uB85C \uB5A0\uC624\uB974\uB294 \uC5E0\uBC84 \uC785\uC790 \u2014 \uB728\uAC81\uACE0 \uC5ED\uB3D9\uC801\uC778 \uC5D0\uB108\uC9C0." },
  { key: "shatter", ko: "\uD30C\uD3B8\xB7\uBE44\uC0B0", en: "\uAE00\uC790 \uC8FC\uBCC0\uC73C\uB85C \uD769\uC5B4\uC9C0\uB294 \uD06C\uB9AC\uC2A4\uD0C8/\uC720\uB9AC \uD30C\uD3B8\uACFC \uBE44\uC0B0\uD558\uB294 \uC870\uAC01\uB4E4 \u2014 \uCDA9\uACA9\uC801\uC774\uACE0 \uC784\uD329\uD2B8 \uC788\uB294 \uC5F0\uCD9C. \uB2E8, \uAE00\uC790 \uBCF8\uCCB4\uB294 \uC628\uC804\uD788 \uC720\uC9C0." }
];
var TITLE_FX_COLORS = [
  { key: "auto", ko: "\uC790\uB3D9", en: "\uD0C0\uC774\uD2C0\uC758 \uAE30\uC874 \uC0C9\xB7\uCEE8\uC149\uC5D0 \uAC00\uC7A5 \uC5B4\uC6B8\uB9AC\uB294 \uC0C9\uC73C\uB85C \uC5F0\uCD9C\uD558\uC138\uC694." },
  { key: "gold", ko: "\uACE8\uB4DC", en: "\uB530\uB73B\uD55C \uACE8\uB4DC-\uC570\uBC84 \uD1A4\uC73C\uB85C \uC5F0\uCD9C\uC744 \uD1B5\uC77C." },
  { key: "cyan", ko: "\uC2DC\uC548", en: "\uCC28\uAC00\uC6B4 \uC2DC\uC548-\uBE14\uB8E8 \uD1A4\uC73C\uB85C \uC5F0\uCD9C\uC744 \uD1B5\uC77C." },
  { key: "crimson", ko: "\uD06C\uB9BC\uC2A8", en: "\uAC15\uB82C\uD55C \uC9C4\uD64D-\uB808\uB4DC \uD1A4\uC73C\uB85C \uC5F0\uCD9C\uC744 \uD1B5\uC77C." },
  { key: "violet", ko: "\uBC14\uC774\uC62C\uB81B", en: "\uC2E0\uBE44\uB85C\uC6B4 \uBC14\uC774\uC62C\uB81B-\uD37C\uD50C \uD1A4\uC73C\uB85C \uC5F0\uCD9C\uC744 \uD1B5\uC77C." },
  { key: "white", ko: "\uD654\uC774\uD2B8", en: "\uC21C\uBC31\uC758 \uBC1D\uC740 \uD1A4\uC73C\uB85C \uC5F0\uCD9C\uC744 \uD1B5\uC77C." }
];
var TITLE_FX_DIRECTIONS = [
  { key: "auto", ko: "\uC790\uB3D9", en: "" },
  { key: "ltr", ko: "\uC67C\u2192\uC624\uB978\uCABD", en: "\uC6B4\uB3D9\uAC10\xB7\uC2A4\uD2B8\uB9AD\xB7\uC794\uC0C1\uC758 \uD750\uB984 \uBC29\uD5A5\uC740 \uC67C\uCABD\uC5D0\uC11C \uC624\uB978\uCABD\uC73C\uB85C." },
  { key: "rtl", ko: "\uC624\uB978\u2192\uC67C\uCABD", en: "\uC6B4\uB3D9\uAC10\xB7\uC2A4\uD2B8\uB9AD\xB7\uC794\uC0C1\uC758 \uD750\uB984 \uBC29\uD5A5\uC740 \uC624\uB978\uCABD\uC5D0\uC11C \uC67C\uCABD\uC73C\uB85C." },
  { key: "up", ko: "\uC544\uB798\u2192\uC704", en: "\uC6B4\uB3D9\uAC10\xB7\uC785\uC790\xB7\uAE30\uB958\uB294 \uC544\uB798\uC5D0\uC11C \uC704\uB85C \uC19F\uAD6C\uCE58\uAC8C." },
  { key: "radial", ko: "\uBC29\uC0AC\uD615", en: "\uC6B4\uB3D9\uAC10\xB7\uBE5B\xB7\uC785\uC790\uAC00 \uD0C0\uC774\uD2C0 \uC911\uC2EC\uC5D0\uC11C \uC0AC\uBC29\uC73C\uB85C \uD37C\uC9C0\uAC8C." }
];
var TITLE_FX_INTENSITY = [
  { key: "subtle", ko: "\uC57D\uD558\uAC8C", en: "\uC5F0\uCD9C \uAC15\uB3C4: \uC57D\uD558\uAC8C \u2014 \uC740\uC740\uD558\uACE0 \uC808\uC81C\uB41C \uC218\uC900. \uC6D0\uBCF8\uACFC\uC758 \uCC28\uC774\uAC00 \uC0B4\uC9DD \uB290\uAEF4\uC9C8 \uC815\uB3C4\uB85C\uB9CC." },
  { key: "normal", ko: "\uD45C\uC900", en: "\uC5F0\uCD9C \uAC15\uB3C4: \uD45C\uC900 \u2014 \uC874\uC7AC\uAC10 \uC788\uB418 \uAE00\uC790\uB97C \uAC00\uB9AC\uC9C0 \uC54A\uB294 \uADE0\uD615." },
  { key: "strong", ko: "\uAC15\uD558\uAC8C", en: "\uC5F0\uCD9C \uAC15\uB3C4: \uAC15\uD558\uAC8C \u2014 \uD654\uB824\uD558\uACE0 \uADF9\uC801\uC778 \uD504\uB85C\uBAA8\uC158 \uD788\uC5B4\uB85C \uCEF7 \uC218\uC900." }
];
var TITLE_FX_BG_OPTIONS = [
  { key: "keep", ko: "\uC6D0\uBCF8 \uC720\uC9C0", en: "\uC6D0\uBCF8 \uBC30\uACBD(\uD22C\uBA85/\uB2E8\uC0C9\uC774\uBA74 \uADF8\uB300\uB85C)\uC744 \uC720\uC9C0\uD558\uACE0 \uC5F0\uCD9C\uB9CC \uC5B9\uC73C\uC138\uC694. \uC6D0\uBCF8\uC5D0 \uBC30\uACBD \uC7A5\uBA74\uC774 \uC788\uC73C\uBA74 \uADF8 \uAD6C\uB3C4\xB7\uC0C9\uAC10\uC744 \uC720\uC9C0\uD558\uC138\uC694." },
  { key: "black", ko: "\uBE14\uB799", fill: "#000000", en: "\uBC30\uACBD\uC744 \uC21C\uC218\uD55C \uAC80\uC815(#000000) \uB2E8\uC0C9\uC73C\uB85C \uD1B5\uC77C\uD558\uC138\uC694 \u2014 \uBC1C\uAD11\xB7\uD30C\uD2F0\uD074 \uC5F0\uCD9C\uC744 \uC774\uD399\uD2B8 \uCD94\uCD9C(\uC2A4\uD06C\uB9B0/\uB8E8\uB9C8 \uD0A4)\uB85C \uBD84\uB9AC\uD558\uAE30\uC5D0 \uCD5C\uC801. \uD0C0\uC774\uD2C0\uACFC \uC5F0\uCD9C \uC678 \uBAA8\uB4E0 \uC601\uC5ED\uC740 \uC644\uC804\uD55C \uAC80\uC815\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4." },
  { key: "chroma", ko: "\uD06C\uB85C\uB9C8 \uADF8\uB9B0", fill: "#00FF00", en: "\uBC30\uACBD\uC744 \uC21C\uC218\uD55C \uD06C\uB85C\uB9C8\uD0A4 \uADF8\uB9B0(#00FF00) \uB2E8\uC0C9\uC73C\uB85C \uD1B5\uC77C\uD558\uC138\uC694. \u2605\uAE00\uC790\xB7\uBE5B\xB7\uD30C\uD2F0\uD074 \uC5B4\uB514\uC5D0\uB3C4 \uCD08\uB85D \uACC4\uC5F4 \uC0C9\uC744 \uC0AC\uC6A9\uD558\uC9C0 \uB9D0 \uAC83 (\uD0A4\uC789 \uC2DC \uD568\uAED8 \uBE60\uC9D0)\u2605." },
  { key: "white", ko: "\uD654\uC774\uD2B8", fill: "#FFFFFF", en: "\uBC30\uACBD\uC744 \uC21C\uC218\uD55C \uD770\uC0C9(#FFFFFF) \uB2E8\uC0C9\uC73C\uB85C \uD1B5\uC77C\uD558\uC138\uC694. \uD770\uC0C9\uC5D0 \uAC00\uAE4C\uC6B4 \uC5F0\uCD9C\uC740 \uD1A4\uC744 \uC0B4\uC9DD \uB20C\uB7EC \uBC30\uACBD\uACFC \uAD6C\uBD84\uB418\uAC8C." }
];
var buildTitlePrompt = (effectKeys = [], { color = "auto", direction = "auto", intensity = "normal", bg = "keep", intent = "" } = {}) => {
  const picked = (effectKeys || []).map((k) => TITLE_FX_EFFECTS.find((o) => o.key === k)).filter(Boolean);
  const auto = picked.length === 0;
  const col = TITLE_FX_COLORS.find((o) => o.key === color) || TITLE_FX_COLORS[0];
  const dir = TITLE_FX_DIRECTIONS.find((o) => o.key === direction) || TITLE_FX_DIRECTIONS[0];
  const inten = TITLE_FX_INTENSITY.find((o) => o.key === intensity) || TITLE_FX_INTENSITY[1];
  const bgOpt = TITLE_FX_BG_OPTIONS.find((o) => o.key === bg) || TITLE_FX_BG_OPTIONS[0];
  const extra = String(intent || "").trim();
  const effectBlock = auto ? "\uD0C0\uC774\uD2C0\uC758 \uD615\uD0DC\xB7\uCEE8\uC149\xB7\uAE30\uC874 \uC0C9\uC744 \uBD84\uC11D\uD574 \uAC00\uC7A5 \uC5B4\uC6B8\uB9AC\uB294 \uC5F0\uCD9C\uC744 \uC2A4\uC2A4\uB85C \uACE8\uB77C \uC870\uD569\uD558\uC138\uC694 \u2014 \uC18D\uB3C4\uAC10\xB7\uC11C\uB9AC\xB7\uC544\uC6B0\uB77C\xB7\uC548\uAC1C\xB7\uAE08\uBE5B\xB7\uAE00\uB9AC\uCE58\xB7\uBAA8\uC158\uBE14\uB7EC\xB7\uBD88\uD2F0\xB7\uD30C\uD3B8 \uB4F1\uC5D0\uC11C." : picked.map((e, i) => `${i + 1}. [${e.ko}] ${e.en}`).join("\n");
  return `\uAC8C\uC784 \uD504\uB85C\uBAA8\uC158 '\uD0C0\uC774\uD2C0 \uC774\uD399\uD2B8' \uC5F0\uCD9C \uC804\uBB38\uAC00\uB85C \uC791\uC5C5\uD558\uC138\uC694. \uC785\uB825 \uC774\uBBF8\uC9C0\uC5D0\uB294 \uD398\uC774\uC9C0\uC5D0 \uD06C\uAC8C \uB4E4\uC5B4\uAC00\uB294 \uD0C0\uC774\uD2C0/\uD14D\uC2A4\uD2B8(\uB85C\uACE0 \uD0C0\uC774\uD2C0, 'COMING SOON' \uAC19\uC740 \uB300\uD615 \uCE74\uD53C \uB4F1)\uAC00 \uB4E4\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uC774 \uD0C0\uC774\uD2C0 \uC8FC\uC704\uC5D0 \uC0DD\uBA85\uB825 \uC788\uB294 \uC774\uD399\uD2B8\uB97C \uB354\uD574 \uC644\uC131\uB41C \uD55C \uC7A5\uC73C\uB85C \uB80C\uB354\uD558\uC138\uC694.

\u2605\u2605\uD0C0\uC774\uD2C0 \uC6D0\uBCF8 \uC808\uB300 \uBCF4\uC874 (\uCD5C\uC6B0\uC120 \uADDC\uCE59 \u2014 \uB2E4\uB978 \uBAA8\uB4E0 \uC9C0\uC2DC\uBCF4\uB2E4 \uC6B0\uC120):
- \uAE00\uC790\uC758 \u2605\uCCA0\uC790\xB7\uBB38\uAD6C\xB7\uAE00\uC790 \uC218\xB7\uC21C\uC11C\u2605\uB97C \uB2E8 \uD55C \uAE00\uC790\uB3C4 \uBC14\uAFB8\uC9C0 \uB9C8\uC138\uC694. \uC0C8 \uAE00\uC790\xB7\uB2E8\uC5B4\xB7\uAE30\uD638\uB97C \uCD94\uAC00\uD558\uC9C0\uB3C4, \uAE30\uC874 \uAE00\uC790\uB97C \uC9C0\uC6B0\uC9C0\uB3C4 \uB9C8\uC138\uC694.
- \uAE00\uC790\uC758 \u2605\uC11C\uCCB4(\uD3F0\uD2B8)\xB7\uAD75\uAE30\xB7\uC790\uAC04\xB7\uAE00\uC790 \uD615\uD0DC(\uB808\uD130\uD3FC)\xB7\uAE30\uC6B8\uAE30\xB7\uBC30\uCE58\xB7\uD06C\uAE30\xB7\uC0C9\uC0C1\xB7\uC7AC\uC9C8\xB7\uD14C\uB450\uB9AC\xB7\uAE30\uC874 \uC7A5\uC2DD\u2605\uC744 \uC6D0\uBCF8\uACFC 100% \uB3D9\uC77C\uD558\uAC8C \uC720\uC9C0\uD558\uC138\uC694. \uAE00\uC790\uB97C \uB2E4\uC2DC \uADF8\uB9AC\uC9C0 \uB9D0\uACE0 '\uADF8\uB300\uB85C \uB454 \uCC44' \uC8FC\uBCC0\uC5D0\uB9CC \uC5F0\uCD9C\uC744 \uC5B9\uC73C\uC138\uC694.
- \uAE00\uC790\uC758 \uD310\uB3C5\uC131\uC744 \uD574\uCE58\uC9C0 \uB9C8\uC138\uC694 \u2014 \uC774\uD399\uD2B8\uAC00 \uAE00\uC790 \uD68D\uC744 \uB450\uAECD\uAC8C \uAC00\uB9AC\uAC70\uB098 \uBB49\uAC1C\uBA74 \uC2E4\uD328\uC785\uB2C8\uB2E4. \uC774\uD399\uD2B8\uB294 \uAE00\uC790 \u2605\uB4A4\xB7\uC8FC\uBCC0\xB7\uAC00\uC7A5\uC790\uB9AC\u2605\uC5D0 \uC5B9\uD788\uACE0, \uAE00\uC790 \uD45C\uBA74\uC740 \uC6D0\uBCF8\uC774 \uADF8\uB300\uB85C \uBE44\uCCD0 \uBCF4\uC5EC\uC57C \uD569\uB2C8\uB2E4.
- \uCD9C\uB825 \uC804 \uC6D0\uBCF8\uACFC \uAE00\uC790\uB97C 1:1\uB85C \uB300\uC870\uD574 \uCCA0\uC790\xB7\uC11C\uCCB4\xB7\uD615\uD0DC\uAC00 \uC870\uAE08\uC774\uB77C\uB3C4 \uB2EC\uB77C\uC84C\uC73C\uBA74 \uC2E4\uD328\uB85C \uAC04\uC8FC\uD558\uACE0 \uB2E4\uC2DC \uD558\uC138\uC694.\u2605\u2605

[\uC801\uC6A9\uD560 \uC774\uD399\uD2B8]
${effectBlock}

[\uC0C9\uAC10] ${col.en}
${dir.en ? `[\uBC29\uD5A5] ${dir.en}
` : ""}[${inten.en}]

\uBC30\uACBD: ${bgOpt.en}
\u2605\uC0C8 \uBB38\uC790 \uC0DD\uC131 \uAE08\uC9C0: \uC6D0\uBCF8 \uD0C0\uC774\uD2C0 \uC678\uC5D0 \uC5B4\uB5A4 \uAE00\uC790\xB7\uC11C\uBE0C\uCE74\uD53C\xB7\uC6CC\uD130\uB9C8\uD06C\xB7\uB85C\uACE0\xB7UI \uD14D\uC2A4\uD2B8\uB3C4 \uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uB9C8\uC138\uC694. \uAE00\uC790\uCC98\uB7FC \uBCF4\uC774\uB294 \uC720\uC0AC \uBB38\uC790(gibberish)\uB3C4 \uAE08\uC9C0. (\uC6D0\uBCF8 \uD0C0\uC774\uD2C0\uC758 \uAE00\uC790\uB294 \uBC18\uB4DC\uC2DC \uBCF4\uC874 \u2014 \uC774 \uADDC\uCE59\uC740 '\uC5C6\uB358 \uAE00\uC790\uB97C \uB9CC\uB4E4\uC9C0 \uB9D0\uB77C'\uB294 \uAC83\uC774\uC9C0 '\uC788\uB358 \uAE00\uC790\uB97C \uC9C0\uC6B0\uB77C'\uB294 \uAC83\uC774 \uC808\uB300 \uC544\uB2D9\uB2C8\uB2E4.)
\uACB0\uACFC\uC5D0\uB294 \uC774\uD399\uD2B8\uAC00 \uC801\uC6A9\uB41C \uD0C0\uC774\uD2C0 \uD55C \uC7A5\uB9CC \uCD9C\uB825\uD558\uC138\uC694.${extra ? `

[\uC0AC\uC6A9\uC790 \uCD94\uAC00 \uC9C0\uC2DC \u2014 \uD0C0\uC774\uD2C0 \uBCF4\uC874 \uADDC\uCE59\uACFC \uCDA9\uB3CC\uD558\uBA74 \uBB34\uC2DC]
${extra}` : ""}`;
};

// src/apps/NexusPreview/services/bgPrompts.js
var buildBgComposePrompt = (intent, hasAsset) => `\uAC8C\uC784 \uD504\uB85C\uBAA8\uC158 KV \uD569\uC131 \uC804\uBB38\uAC00\uB85C \uC791\uC5C5\uD558\uC138\uC694. \uC785\uB825 \uC774\uBBF8\uC9C0\uC758 \uCE94\uBC84\uC2A4 \uBE44\uC728, \uAE30\uC874 \uBC30\uACBD \uAD6C\uB3C4, \uC0C9\uAC10\uACFC \uC8FC\uC694 \uC694\uC18C\uB97C \uC720\uC9C0\uD558\uC138\uC694.
${hasAsset ? "\uC785\uB825 \uC774\uBBF8\uC9C0 \uC911\uC559\uC5D0 \uC784\uC2DC \uBC30\uCE58\uB41C \uC5C5\uB85C\uB4DC \uC18C\uC2A4\uB97C \uD569\uC131 \uC7AC\uB8CC\uB85C \uC0AC\uC6A9\uD558\uC138\uC694. \uC18C\uC2A4\uC758 \uC815\uCCB4\uC131\uACFC \uC2E4\uB8E8\uC5E3\uC740 \uBCF4\uC874\uD558\uB418, \uC694\uCCAD \uC704\uCE58\uB85C \uC774\uB3D9\uD558\uACE0 \uBD88\uD544\uC694\uD55C \uC6D0\uBCF8 \uBC30\uACBD\uC740 \uC81C\uAC70\uD55C \uB4A4 \uC870\uBA85\xB7\uC6D0\uADFC\xB7\uADF8\uB9BC\uC790\xB7\uC0C9\uC628\uB3C4\uB97C \uBC30\uACBD\uACFC \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB9DE\uCD94\uC138\uC694." : "\uC0AC\uC6A9\uC790 \uC694\uCCAD\uC5D0 \uBA85\uC2DC\uB41C \uC694\uC18C\uB9CC \uC0C8\uB85C \uCD94\uAC00\uD558\uC138\uC694."}
\uD0C0\uC774\uD2C0, \uB85C\uACE0, \uC8FC\uC694 \uCE90\uB9AD\uD130\uB97C \uAC00\uB9AC\uC9C0 \uB9C8\uC138\uC694.
\u2605\uC0C8 \uBB38\uC790 \uC0DD\uC131 \uC808\uB300 \uAE08\uC9C0 (\uCD5C\uC6B0\uC120 \uADDC\uCE59): \uC6D0\uBCF8\uC5D0 \uC5C6\uB294 \uAE00\uC790\xB7\uB2E8\uC5B4\xB7\uD0C0\uC774\uD2C0\xB7\uB85C\uACE0\xB7\uC11C\uBE0C\uCE74\uD53C\xB7\uC22B\uC790\xB7\uC6CC\uD130\uB9C8\uD06C\xB7UI \uD14D\uC2A4\uD2B8\uB97C \uB2E8 \uD55C \uAE00\uC790\uB3C4 \uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uB9C8\uC138\uC694. \uC0C1\uB2E8/\uD558\uB2E8 \uBE48 \uC601\uC5ED\uC5D0 \uC81C\uBAA9\uC774\uB098 \uCE74\uD53C\uB97C \uCC44\uC6CC \uB123\uC9C0 \uB9D0\uACE0 \uBE48 \uACF5\uAC04\uC740 \uADF8\uB300\uB85C \uB450\uC138\uC694. \uAE00\uC790\uCC98\uB7FC \uBCF4\uC774\uB294 \uC720\uC0AC \uBB38\uC790(gibberish lettering)\uB3C4 \uAE08\uC9C0. \uC0AC\uC6A9\uC790 \uC694\uCCAD\uC5D0 \uAE00\uC790 \uCD94\uAC00\uAC00 \uC788\uC5B4\uB3C4 \uBB34\uC2DC\uD558\uC138\uC694.\u2605
\uACB0\uACFC\uC5D0\uB294 \uC644\uC131\uB41C KV \uD55C \uC7A5\uB9CC \uCD9C\uB825\uD558\uC138\uC694.

[\uC0AC\uC6A9\uC790 \uC694\uCCAD]
${intent}`;
var buildBgGeneratePrompt = (concept, hasRef) => `\uACE0\uD488\uC9C8 \uAC8C\uC784 \uD504\uB85C\uBAA8\uC158 KV \uBC30\uACBD\uC744 \uC0DD\uC131\uD558\uC138\uC694. ${hasRef ? "\uCC38\uACE0 \uC774\uBBF8\uC9C0\uB294 \uBD84\uC704\uAE30\uC640 \uC0C9\uAC10\uB9CC \uCC38\uACE0\uD558\uACE0 \uC778\uBB3C\xB7\uAE00\uC790\xB7\uB85C\uACE0\uB294 \uBCF5\uC81C\uD558\uC9C0 \uB9C8\uC138\uC694." : ""}
\uC778\uBB3C, \uD14D\uC2A4\uD2B8, \uB85C\uACE0, UI \uC5C6\uC774 \uBC30\uACBD\uB9CC \uB9CC\uB4E4\uACE0 \uC911\uC559\uACFC \uC8FC\uC694 \uBC30\uCE58 \uC601\uC5ED\uC5D0 \uCDA9\uBD84\uD55C \uC5EC\uBC31\uC744 \uB0A8\uAE30\uC138\uC694. \uBA85\uD655\uD55C \uC804\uACBD\xB7\uC911\uACBD\xB7\uD6C4\uACBD, \uC601\uD654\uC801 \uC870\uBA85\uACFC \uAE4A\uC774\uAC10\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.

[\uCF58\uC149\uD2B8]
${concept}`;

// src/apps/NexusPreview/services/floatingPrompt.js
var FLOATING_OUTPUT_OPTIONS = [
  { key: "layered-transparent", ko: "\uD22C\uBA85 \uB808\uC774\uC5B4 \uC790\uB3D9 \uD569\uC131", en: "render an integrated preservation master, derive aligned effect-only and item-only layers, remove both backgrounds, and export one transparent PNG" },
  { key: "integrated-preserve", ko: "\uD1B5\uD569 \uB80C\uB354+\uBCF4\uC874 \uBCF4\uC815", en: "render the supplied item(s) and effect together, harmonize low-resolution sources, then run an identity-preservation repair pass" },
  { key: "composite", ko: "\uC544\uC774\uD15C+\uD6A8\uACFC \uD569\uC131", en: "render the supplied item(s) together with the effect as one finished preview image" },
  { key: "effect-only", ko: "\uD6A8\uACFC\uB9CC \uBD84\uB9AC", en: "use the supplied item(s) only as position and silhouette references; output LIGHT AND ATMOSPHERE ONLY on pure black, with absolutely no item pixels, text, UI, scenery, floor, or frame" }
];
var FLOATING_EFFECT_OPTIONS = [
  { key: "bubble", ko: "\uBB3C\uBC29\uC6B8", en: "translucent water/glass with restrained refraction, soft rim highlights and sparse droplets" },
  { key: "lightning", ko: "\uBC88\uAC1C", en: "white-blue electric arcs with broken branches, ion sparks and sharp luminous cores" },
  { key: "gold", ko: "\uAE08\uBE5B", en: "premium warm-gold light dust, thin rays and elegant star glints" },
  { key: "vortex", ko: "\uD68C\uC624\uB9AC", en: "spiraling translucent energy ribbons and directional particles with clear rotational flow" },
  { key: "magic", ko: "\uB9C8\uB825", en: "violet-cyan arcane plasma with non-semantic geometric ticks; never letters, glyphs or readable runes" },
  { key: "aura", ko: "\uC624\uB77C", en: "soft luminous energy with broad falloff, localized bloom and an open center" },
  { key: "flame", ko: "\uD654\uC5FC", en: "incandescent flame tongues, heat haze and rising embers" },
  { key: "frost", ko: "\uC11C\uB9AC", en: "ice-blue crystalline fragments, cold vapor and prismatic sparkles" },
  { key: "wind", ko: "\uBC14\uB78C", en: "teal translucent air ribbons, wisps and sparse leaf-like motes" },
  { key: "shadow", ko: "\uADF8\uB9BC\uC790 \uC5F0\uAE30", en: "restrained dark mist with a thin luminous rim and open negative space" }
];
var FLOATING_FORM_OPTIONS = [
  { key: "sphere", ko: "\uAD6C\uCCB4", en: "a complete transparent sphere with readable front and rear curvature" },
  { key: "ring", ko: "\uC644\uC804\uD55C \uC6D0", en: "a clean circular ring" },
  { key: "broken-orbit", ko: "\uC5F4\uB9B0 \uADA4\uB3C4", en: "a partially open orbit ring with an intentional gap" },
  { key: "tilted-orbit", ko: "\uAE30\uC6B8\uC5B4\uC9C4 \uADA4\uB3C4", en: "a perspective ellipse tilted in depth, clearly passing behind and in front of the item position" },
  { key: "vertical-helix", ko: "\uC218\uC9C1 \uB098\uC120", en: "a tall vertical helix wrapping the item position from bottom to top" },
  { key: "lift-vortex", ko: "\uC0C1\uC2B9 \uD68C\uC624\uB9AC", en: "an upward-tapering levitation vortex, denser below and lighter above" },
  { key: "side-arcs", ko: "\uCE21\uBA74 \uC544\uD06C", en: "two asymmetric side arcs that leave the center open" }
];
var FLOATING_LAYOUT_OPTIONS = [
  { key: "each", ko: "\uAC1C\uBCC4 \uC624\uBE0C", en: "give each item position its own effect with exactly one item reference per effect" },
  { key: "grouped", ko: "\uD55C \uC6D0\uC5D0 \uBAA8\uC544\uC11C", en: "place all item positions inside one large shared effect" },
  { key: "arc", ko: "\uC544\uCE58 \uBC30\uC5F4", en: "arrange item positions along a shallow rising arc with balanced spacing" },
  { key: "diagonal", ko: "\uB300\uAC01\uC120 \uBC30\uC5F4", en: "arrange item positions on a dynamic lower-left to upper-right diagonal" },
  { key: "orbit", ko: "\uADA4\uB3C4 \uBC30\uC5F4", en: "arrange secondary item positions around one primary center position" }
];
var FLOATING_GROUP_OPTIONS = [
  { key: "auto", ko: "\uC790\uB3D9 \uC81C\uC548", en: "use the reviewed automatic group proposal" },
  { key: "all", ko: "\uBAA8\uB450 \uD55C \uAD11\uC6D0", en: "put every supplied item reference in one shared light-effect group" },
  { key: "each", ko: "\uC544\uC774\uD15C\uBCC4 \uAD11\uC6D0", en: "give every supplied item reference its own independent light-effect group" },
  { key: "custom", ko: "\uADF8\uB8F9 \uC9C1\uC811 \uC9C0\uC815", en: "follow the explicit per-item group assignments" },
  { key: "primary-satellites", ko: "\uC911\uC559 \uD575\uC2EC+\uC704\uC131", en: "give the selected primary item its own dominant center effect and give every secondary item an independent satellite effect" }
];
var FLOATING_COLORS = [
  { key: "auto", ko: "\uC790\uB3D9", en: "" },
  { key: "gold", ko: "\uACE8\uB4DC", en: "warm gold-amber" },
  { key: "cyan", ko: "\uC2DC\uC548", en: "cool cyan-blue" },
  { key: "purple", ko: "\uBCF4\uB77C", en: "violet-magenta" },
  { key: "crimson", ko: "\uC9C4\uD64D", en: "crimson-red" },
  { key: "blue", ko: "\uBE14\uB8E8", en: "deep sapphire blue" },
  { key: "green", ko: "\uC5D0\uBA54\uB784\uB4DC", en: "emerald green" },
  { key: "white", ko: "\uD654\uC774\uD2B8", en: "radiant white-silver" },
  { key: "holo", ko: "\uD640\uB85C", en: "restrained prismatic holographic spectrum" }
];
var FLOATING_INTENSITY_OPTIONS = [
  { key: "subtle", ko: "\uC740\uC740\uD568", en: "subtle; preserve generous negative space and avoid bloom washout" },
  { key: "medium", ko: "\uBCF4\uD1B5", en: "medium; clear premium effect without competing with item identity" },
  { key: "dramatic", ko: "\uADF9\uC801", en: "dramatic but controlled; stronger highlights while keeping the center readable" }
];
var FLOATING_MOTION_OPTIONS = [
  { key: "clockwise", ko: "\uC2DC\uACC4 \uBC29\uD5A5", en: "clockwise orbital flow" },
  { key: "counter-clockwise", ko: "\uBC18\uC2DC\uACC4 \uBC29\uD5A5", en: "counter-clockwise orbital flow" },
  { key: "upward", ko: "\uC0C1\uC2B9", en: "upward lifting flow" },
  { key: "outward", ko: "\uC678\uBD80 \uD655\uC0B0", en: "outward expanding flow" },
  { key: "inward", ko: "\uB0B4\uBD80 \uC218\uB834", en: "inward converging flow" }
];
var FLOATING_DENSITY_OPTIONS = [
  { key: "sparse", ko: "\uC801\uC74C", en: "sparse particles with deliberate rhythm" },
  { key: "medium", ko: "\uBCF4\uD1B5", en: "medium particle density" },
  { key: "dense", ko: "\uB9CE\uC74C", en: "dense at focal accents only; do not fill the center" }
];
var byKey = (list, key, fallback = 0) => list.find((o) => o.key === key) || list[fallback];
function resolveFloatingGroupPlan(itemCount, groupMode = "auto", groupAssignments = [], primaryIndex = 0) {
  const n = Math.max(0, Number(itemCount) || 0);
  if (!n) return { assignments: [], groups: [], confidence: "none", requiresReview: false, rationale: "No item references." };
  let assignments;
  let confidence = "high";
  let requiresReview = false;
  let rationale = "Explicit grouping rule.";
  if (groupMode === "all") assignments = Array(n).fill("A");
  else if (groupMode === "each") assignments = Array.from({ length: n }, (_, i) => `ITEM_${i + 1}`);
  else if (groupMode === "primary-satellites") {
    const primary = Math.max(0, Math.min(n - 1, Number(primaryIndex) || 0));
    assignments = Array.from({ length: n }, (_, i) => i === primary ? "PRIMARY" : `SATELLITE_${i + 1}`);
  } else if (groupMode === "custom") {
    assignments = Array.from({ length: n }, (_, i) => String(groupAssignments[i] || "A").trim() || "A");
    requiresReview = groupAssignments.length !== n;
    confidence = requiresReview ? "medium" : "high";
    rationale = requiresReview ? "Some items had no explicit group and were assigned to A." : "User-defined reward groups.";
  } else {
    assignments = Array(n).fill("A");
    confidence = n === 1 ? "high" : "low";
    requiresReview = n > 1;
    rationale = n === 1 ? "One supplied item requires one light-effect group." : "Image pixels alone do not reveal reward semantics; one shared group is only a proposal and must be reviewed.";
  }
  const map = /* @__PURE__ */ new Map();
  assignments.forEach((group, index) => {
    if (!map.has(group)) map.set(group, []);
    map.get(group).push(index + 1);
  });
  const groups = [...map.entries()].map(([id, itemIndices]) => ({ id, itemIndices }));
  return { assignments, groups, confidence, requiresReview, rationale };
}
function buildFloatingPrompt(options = {}) {
  const {
    effect = "bubble",
    form = "broken-orbit",
    layout = "each",
    color = "auto",
    intensity = "medium",
    motion = "clockwise",
    density = "medium",
    outputMode = "composite",
    opening = 25,
    frontCross = 10,
    itemCount = 0,
    groupMode = "auto",
    groupAssignments = [],
    primaryIndex = 0,
    bg = { en: "pure solid black #000000" },
    intent = ""
  } = options;
  const E = byKey(FLOATING_EFFECT_OPTIONS, effect);
  const F = byKey(FLOATING_FORM_OPTIONS, form, 2);
  const L = byKey(FLOATING_LAYOUT_OPTIONS, layout);
  const C = byKey(FLOATING_COLORS, color);
  const I = byKey(FLOATING_INTENSITY_OPTIONS, intensity, 1);
  const M = byKey(FLOATING_MOTION_OPTIONS, motion);
  const D = byKey(FLOATING_DENSITY_OPTIONS, density, 1);
  const O = byKey(FLOATING_OUTPUT_OPTIONS, outputMode);
  const G = byKey(FLOATING_GROUP_OPTIONS, groupMode);
  const n = Math.max(0, Number(itemCount) || 0);
  const gap = Math.max(0, Math.min(50, Number(opening) || 0));
  const cross = Math.max(0, Math.min(15, Number(frontCross) || 0));
  const effectOnly = O.key === "effect-only";
  const integrated = O.key === "integrated-preserve" || O.key === "layered-transparent";
  const groupPlan = resolveFloatingGroupPlan(n, G.key, groupAssignments, primaryIndex);
  const groupLine = groupPlan.groups.map((group) => `${group.id}=[references ${group.itemIndices.join(", ")}]`).join("; ");
  const countRule = n ? `There are exactly ${n} supplied item references. Use each exactly once as a placement/silhouette reference; never duplicate, omit or invent an item.` : "";
  const colorLine = C.en ? `Palette: ${C.en}.` : "Infer one coherent palette from the supplied item references.";
  const outputRule = effectOnly ? "OUTPUT EFFECT ONLY: reproduce zero item pixels. The result must contain only light, atmosphere and particles on pure #000000. Keep all item interiors and identifying details absent." : integrated ? "OUTPUT INTEGRATED PRESERVATION MASTER: render the supplied items and effect together. Harmonize resolution, edge quality, local contrast, bloom response and scene lighting so low-resolution items belong in the same image. Preserve identity-critical imagery: exact item category, silhouette, dominant color regions, emblem/seal, border, count and arrangement of major parts. Do not invent, remove, substitute, mirror or redesign identifying details. Upscale and relight conservatively; never turn pixel cleanup into a new design." : "OUTPUT COMPOSITE PREVIEW: preserve every supplied item exactly; do not redraw, relight, recolor, rotate, mirror or alter its pixels.";
  const extra = String(intent || "").trim();
  return `Create a production-grade floating-item presentation for a game promotion.

${outputRule}
${countRule}
Light grouping mode: ${G.en}. Exact group plan: ${groupLine || "none"}. Create exactly ${groupPlan.groups.length} light-effect group(s); items in the same group share one coherent light source, and different groups must remain visually separable.
Effect family/material: ${E.en}.
Form: ${F.en}. Opening/gap: ${gap}%.
Layout: ${L.en}.
Intensity: ${I.en}. Motion: ${M.en}. Particle density: ${D.en}.
${colorLine}
Depth: the coherent master effect must visibly pass behind the item position and may cross in front only as light/particles; front coverage must stay at or below ${cross}% of the visible item area. Keep the center readable and avoid a flat sticker-like ring.
Canvas: preserve comfortable margins, identical origin and unclipped decay. Background: ${effectOnly ? "pure solid black #000000" : bg.en}. No scenery, floor, text, logo, UI, border, fake labels or new objects.
${effectOnly ? "Do not create contact shadows or floor effects; those are separate downstream layers." : "Keep every item fully inside the frame and visually unobstructed."}${extra ? `

Additional direction (ignore if it conflicts with preservation rules):
${extra}` : ""}`;
}
function buildFloatingRepairPrompt(options = {}) {
  const { itemCount = 0, groupMode = "auto", groupAssignments = [], primaryIndex = 0 } = options;
  const n = Math.max(0, Number(itemCount) || 0);
  const groupPlan = resolveFloatingGroupPlan(n, groupMode, groupAssignments, primaryIndex);
  const groups = groupPlan.groups.map((g) => `${g.id}=[items ${g.itemIndices.join(", ")}]`).join("; ");
  return `Perform an identity-preservation audit and minimal repair of a finished floating-item render.
Reference 1 is the integrated render to keep. References 2 through ${n + 1} are the untouched original item images in item order.
Compare every rendered item against its matching original. Check silhouette, aspect ratio, orientation, dominant color blocks, emblem/seal, border, major internal parts, item count and category-defining imagery.
Repair only detected identity drift, hallucinated details, warped geometry, missing parts, incorrect colors or over-smoothed low-resolution pixel art. Preserve the integrated render's canvas, item positions, scale hierarchy, light grouping (${groups || "none"}), orbit shape, particles, palette and atmosphere.
Make the repaired items feel naturally lit by the surrounding effect using restrained edge light, shared bloom response and local contrast, but do not redesign them. Keep intentional pixel-art character where present; upscale cleanly without converting it into unrelated painted artwork.
Return one finished image only. No text, labels, UI, extra objects, duplicated items, comparison grid or annotations.`;
}
function buildFloatingSeparationPrompt(kind, options = {}) {
  const { itemCount = 0 } = options;
  const n = Math.max(0, Number(itemCount) || 0);
  const refs = `Reference 1 is the approved integrated master. References 2 through ${n + 1} are the untouched original items in exact order.`;
  if (kind === "effect") return `${refs}
Derive the BACKGROUND EFFECT LAYER only, on pure solid black #000000, at exactly the same canvas size and registration as reference 1. Remove every item pixel, item silhouette, shadow, text and UI. Reconstruct only light, orbit, mist and particles that belong behind the items. Do not put foreground crossings over item regions. Preserve the approved effect geometry, palette, intensity and decay. Return one flat image; no transparency or checkerboard.`;
  return `${refs}
Derive the ITEM LAYER only, on pure solid chroma green #00FF00, at exactly the same canvas size and registration as reference 1. Keep every rendered item's approved position, scale, orientation, harmonized lighting and identity-corrected appearance. Remove all orbit light, mist, particles, glow field, shadows, scenery, text and UI. The background must be uniform #00FF00 with no gradient or texture, and no green spill may be added to item interiors. Return one flat image; no transparency or checkerboard.`;
}

// src/apps/PromptAudit/services/auditPrompt.js
var PROMPT_MAX_LENGTH = 3e3;
var CONFLICT_TYPES = {
  LOGIC_CONFLICT: { label: "\uB17C\uB9AC \uCDA9\uB3CC", color: "#ef4444" },
  STYLE_MIX: { label: "\uC2A4\uD0C0\uC77C \uD63C\uC7AC", color: "#f59e0b" },
  TOKEN_REDUNDANCY: { label: "\uD1A0\uD070 \uC911\uBCF5", color: "#A29BFE" },
  NEGATIVE_CLASH: { label: "Neg/Pos \uBAA8\uC21C", color: "#fb7185" },
  RESOLUTION_ASPECT: { label: "\uD574\uC0C1\uB3C4/\uBE44\uC728", color: "#0ea5e9" },
  VAGUE_DIRECTION: { label: "\uC9C0\uC2DC \uBAA8\uD638", color: "#94a3b8" }
};
var SOURCE_CONTEXT = {
  "typecore-sovereign": "RPG/\uD310\uD0C0\uC9C0 \uAC8C\uC784 \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C. \uCE74\uBA54\uB77C \uB77D, \uC815\uBA74 \uC815\uB82C, \uBA54\uD0C8/\uC2A4\uD1A4 \uC7AC\uC9C8, \uB9BC\uB77C\uC774\uD2B8, VFX \uC808\uC81C\uAC00 \uC911\uC694.",
  "typecore-breeze": "\uCE90\uC8FC\uC5BC \uAC8C\uC784 \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C. \uBC1D\uC740 \uD1A4, \uB465\uADFC \uD615\uD0DC, \uC990\uAC70\uC6B4 \uBAA8\uC158\uC774 \uC911\uC2EC.",
  "render-metrics": "2D\u21922.5D \uC785\uCCB4\uD654 \uB80C\uB354\uB9C1 (Imagen). \uD615\uD0DC \uBCF4\uC874\uC774 \uCD5C\uC6B0\uC120\uC774\uBA70 \uCE74\uBA54\uB77C/\uC870\uBA85/\uC7AC\uC9C8\uC774 \uC77C\uAD00\uB3FC\uC57C \uD568.",
  "render-matrix-pop": "\uD31D \uC2A4\uD0C0\uC77C \uB80C\uB354\uB9C1. \uBE44\uBE44\uB4DC\uD55C \uCEEC\uB7EC\uC640 \uCE90\uC8FC\uC5BC \uD1A4.",
  "motion-metrics": "\uC601\uC0C1 \uBAA8\uC158 \uD504\uB86C\uD504\uD2B8 (Veo). \uCE74\uBA54\uB77C \uC6C0\uC9C1\uC784, \uC2DC\uAC04 \uD750\uB984, \uC2DC\uC791-\uC911\uAC04-\uB05D \uC77C\uAD00\uC131.",
  "prompt-arc": "\uACF5\uC720 \uD504\uB86C\uD504\uD2B8 \u2014 \uB2E4\uC591\uD55C \uB3C4\uBA54\uC778\uC774 \uC11E\uC5EC \uC788\uC744 \uC218 \uC788\uC74C. \uB3C4\uBA54\uC778 \uBA85\uC2DC \uC5EC\uBD80\uB3C4 \uAC80\uD1A0."
};
var ANALYZER_INSTRUCTIONS = `\uB2F9\uC2E0\uC740 \uC2DC\uAC01\xB7\uC601\uC0C1 \uD504\uB86C\uD504\uD2B8 \uAC10\uC0AC\uAD00(Prompt Auditor)\uC785\uB2C8\uB2E4.
\uC785\uB825 \uD504\uB86C\uD504\uD2B8\uC5D0\uC11C \uB2E4\uC74C \uCDA9\uB3CC \uC720\uD615\uC744 \uCC3E\uC544\uB0B4\uACE0, \uAC01 \uCDA9\uB3CC\uB9C8\uB2E4 2~3\uAC1C\uC758 \uB300\uC548 \uC218\uC815\uC548\uC744 \uC81C\uC2DC\uD558\uC138\uC694.

[\uCDA9\uB3CC \uC720\uD615]
- LOGIC_CONFLICT \u2014 \uC0C1\uD638 \uBC30\uD0C0\uC801 \uC9C0\uC2DC (\uC608: "static camera" + "panning")
- STYLE_MIX \u2014 \uC591\uB9BD \uBD88\uAC00 \uBBF8\uD559 (\uC608: "photorealistic" + "cartoon")
- TOKEN_REDUNDANCY \u2014 \uB3D9\uC758/\uBC18\uBCF5 (\uC608: "bright, luminous, glowing")
- NEGATIVE_CLASH \u2014 \uAE0D\uC815 \uD1A0\uD070\uACFC negative \uD1A0\uD070\uC774 \uBAA8\uC21C
- RESOLUTION_ASPECT \u2014 \uBE44\uC728/\uAD6C\uB3C4\uC640 \uD53C\uC0AC\uCCB4 \uD504\uB808\uC774\uBC0D \uBD88\uC77C\uCE58
- VAGUE_DIRECTION \u2014 "epic", "amazing" \uAC19\uC740 \uBAA8\uD638\uC5B4\uB85C \uCDA9\uB3CC\uC740 \uC544\uB2C8\uC9C0\uB9CC \uC57D\uC810

[\uC2EC\uAC01\uB3C4]
- high: \uACB0\uACFC\uB97C \uB9DD\uAC00\uB728\uB9B4 \uAC00\uB2A5\uC131\uC774 \uD070 \uCDA9\uB3CC
- med:  \uACB0\uACFC\uAC00 \uC57D\uAC04 \uC5B4\uAE0B\uB0A0 \uAC00\uB2A5\uC131
- low:  \uC2A4\uD0C0\uC77C/\uD45C\uD604 \uB2E4\uB4EC\uAE30 \uC218\uC900

[\uCD9C\uB825 \u2014 JSON \uB9CC, \uCF54\uB4DC\uBE14\uB85D/\uC124\uBA85 \uAE08\uC9C0]
{
  "summary": "\uD55C \uBB38\uC7A5 \uCD1D\uD3C9 (\uD55C\uAD6D\uC5B4)",
  "score": 0-100,           // \uBA85\uB8CC\uB3C4/\uC77C\uAD00\uC131 \uC885\uD569 \uC810\uC218
  "conflicts": [
    {
      "id": "c1",
      "type": "LOGIC_CONFLICT|STYLE_MIX|TOKEN_REDUNDANCY|NEGATIVE_CLASH|RESOLUTION_ASPECT|VAGUE_DIRECTION",
      "severity": "high|med|low",
      "title": "\uD55C\uAD6D\uC5B4 \uC9E7\uC740 \uC81C\uBAA9 (12\uC790 \uC774\uB0B4)",
      "evidence": "\uC6D0\uBB38\uC5D0\uC11C \uCD94\uCD9C\uD55C \uC778\uC6A9\uAD6C (\uC601\uC5B4 \uADF8\uB300\uB85C)",
      "explanation": "\uC65C \uBB38\uC81C\uC778\uC9C0 \uD55C\uAD6D\uC5B4\uB85C 1~2\uBB38\uC7A5",
      "suggestions": [
        { "label": "\uC635\uC158 \uC9E7\uC740 \uD55C\uAD6D\uC5B4 \uB77C\uBCA8", "rewrite": "\uC218\uC815\uB41C \uC601\uBB38 \uD45C\uD604" }
      ]
    }
  ],
  "globalSuggestions": ["\uC804\uBC18\uC801\uC73C\uB85C \uCD94\uAC00\uD558\uBA74 \uC88B\uC740 \uD55C\uAD6D\uC5B4 \uC870\uC5B8 1~3\uAC1C"],
  "improvedPrompt": "\uCDA9\uB3CC\uC744 \uC790\uB3D9\uC73C\uB85C \uD574\uC18C\uD55C \uCD5C\uC885 \uC601\uBB38 \uD504\uB86C\uD504\uD2B8 1\uBC8C"
}

\uADDC\uCE59:
1. conflicts \uAC00 \uC5C6\uC73C\uBA74 \uBE48 \uBC30\uC5F4\uB85C. summary \uC5D0 "\uCDA9\uB3CC \uC5C6\uC74C" \uBA85\uC2DC.
2. suggestions \uC758 rewrite \uB294 \uC6D0\uBB38 \uD1A4/\uAE38\uC774\uB97C \uC720\uC9C0\uD558\uACE0 \uC601\uBB38 \uADF8\uB300\uB85C.
3. improvedPrompt \uB294 \uD56D\uC0C1 1\uBC8C \u2014 \uCDA9\uB3CC \uC5C6\uC73C\uBA74 \uC6D0\uBB38\uC744 \uADF8\uB300\uB85C \uBC18\uD658.
4. JSON \uC678\uC758 \uD14D\uC2A4\uD2B8 \uC808\uB300 \uCD9C\uB825 \uAE08\uC9C0.
5. **conflicts \uB294 \uCD5C\uB300 5\uAC1C**, \uAC01 suggestions \uB294 **\uCD5C\uB300 3\uAC1C**. \uC6B0\uC120\uC21C\uC704 \uB192\uC740 \uD56D\uBAA9\uB9CC \uBCF4\uACE0.
6. summary \uB294 100\uC790 \uC774\uB0B4, explanation \uC740 80\uC790 \uC774\uB0B4 (\uD1A0\uD070 \uC808\uC57D).`;
function buildContents(prompt, sourceApp, sourceMeta) {
  const ctx = SOURCE_CONTEXT[sourceApp] || "";
  const ctxLine = ctx ? `[\uB3C4\uBA54\uC778 \uCEE8\uD14D\uC2A4\uD2B8] ${sourceApp}: ${ctx}

` : "";
  const metaLine = sourceMeta?.title ? `[\uC6D0\uBCF8 \uC81C\uBAA9] ${sourceMeta.title}
` : "";
  const user = `${ctxLine}${metaLine}[\uC785\uB825 \uD504\uB86C\uD504\uD2B8]
${prompt}`;
  return [{
    role: "user",
    parts: [{ text: `${ANALYZER_INSTRUCTIONS}

${user}` }]
  }];
}
function buildAuditPromptText(prompt, sourceApp = null, sourceMeta = null) {
  return buildContents(prompt, sourceApp, sourceMeta)[0].parts[0].text;
}

// src/apps/PromoSkin/services/themePrompt.js
var SYSTEM_PROMPT = `\uB108\uB294 \uD55C\uAD6D MMORPG \uD504\uB85C\uBAA8\uC158 \uD398\uC774\uC9C0\uC758 \uD14C\uB9C8 \uB514\uC790\uC774\uB108\uB2E4. \uD398\uC774\uC9C0 \uCEE8\uC149\uC744 \uBC1B\uC544 \uC544\uB798 JSON \uC2A4\uD0A4\uB9C8\uC5D0 \uC815\uD655\uD788 \uB9DE\uB294 \uD14C\uB9C8 \uD504\uB9AC\uC14B\uB9CC \uCD9C\uB825\uD55C\uB2E4. \uC124\uBA85\xB7\uB9C8\uD06C\uB2E4\uC6B4\xB7\uCF54\uB4DC\uD39C\uC2A4 \uC5C6\uC774 \uC21C\uC218 JSON\uB9CC \uCD9C\uB825\uD558\uB77C.
\uC2A4\uD0A4\uB9C8:
{"name": "\uC9E7\uC740 \uD55C\uAE00 \uC774\uB984", "tokens": {"primary":"#rrggbb(\uBC84\uD2BC\xB7\uD504\uB808\uC784 \uAC15\uC870\uC0C9)","accent":"#rrggbb(\uD0C0\uC774\uD2C0 \uAE00\uB85C\uC6B0\xB7\uAE08\uC7A5)","title":"#rrggbb(\uD0C0\uC774\uD2C0 \uAE00\uC790\uC0C9)","textLight":"#rrggbb(\uBCF8\uBB38 \uBC1D\uC740\uC0C9)","panel":"#rrggbb(\uD504\uB808\uC784 \uBC30\uACBD, \uBCF4\uD1B5 \uC5B4\uB450\uC6B4 \uC0C9)","bgTop":"#rrggbb(\uC0C1\uB2E8 \uBC1D\uC740 \uBC30\uACBD)","bgMid":"#rrggbb","bgBottom":"#rrggbb(\uD558\uB2E8 \uC9D9\uC740 \uBC30\uACBD)","radius": 8~24 \uC815\uC218, "glow": 0~30 \uC815\uC218}, "variants": {"background":"field|dark|snow|plain","frame":"glow|metal|flat","container":"scroll|box","button":"glow|metal|flat","motif":"diamond|gem|none"}}
\uADDC\uCE59: \uCEE8\uC149\uC758 \uACC4\uC808\xB7\uBB34\uB4DC\uC5D0 \uB9DE\uAC8C bgTop(\uBC1D\uC74C)->bgBottom(\uC9D9\uC74C) \uADF8\uB77C\uB370\uC774\uC158\uACFC \uAC15\uC870\uC0C9\uC744 \uC815\uD55C\uB2E4. \uBC1D\uC740 \uCEE8\uC149\uC774\uBA74 glow \uD504\uB808\uC784/\uB192\uC740 glow, \uBB34\uAC81\uACE0 \uC5B4\uB450\uC6B4 \uCEE8\uC149\uC774\uBA74 metal \uD504\uB808\uC784/\uB0AE\uC740 glow\uB97C \uACE0\uB978\uB2E4.`;
var RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    tokens: {
      type: "OBJECT",
      properties: {
        primary: { type: "STRING" },
        accent: { type: "STRING" },
        title: { type: "STRING" },
        textLight: { type: "STRING" },
        panel: { type: "STRING" },
        bgTop: { type: "STRING" },
        bgMid: { type: "STRING" },
        bgBottom: { type: "STRING" },
        radius: { type: "NUMBER" },
        glow: { type: "NUMBER" }
      }
    },
    variants: {
      type: "OBJECT",
      properties: {
        background: { type: "STRING" },
        frame: { type: "STRING" },
        container: { type: "STRING" },
        button: { type: "STRING" },
        motif: { type: "STRING" }
      }
    }
  },
  required: ["name", "tokens", "variants"]
};

// src/apps/MotionMatrix/constants/presets.js
var LOOP_SURFACE_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (None)", en: "Perfectly static surface.", shapeRisk: "low" },
  { id: "metallic_sweep", label: "\uAE08\uC18D\uC131 \uBE5B \uD6D1\uAE30 (Metallic Sweep)", en: "Metallic highlights shift across surface.", guardrail: "Zero geometry alteration.", shapeRisk: "low" },
  { id: "light_shimmer", label: "\uC740\uC740\uD55C \uBE5B \uBC18\uC9DD\uC784 (Light Shimmer)", en: "Micro-shimmer confined inside letters.", guardrail: "Maintain razor-sharp readability.", shapeRisk: "low" },
  { id: "crystal_refraction", label: "\uD06C\uB9AC\uC2A4\uD0C8 \uAD74\uC808 (Crystal Refraction)", en: "Internal prismatic light refracting.", guardrail: "Frozen solid silhouette.", shapeRisk: "medium" },
  { id: "liquid_reflection", label: "\uC5B4\uB450\uC6B4 \uC561\uCCB4 \uBC18\uC0AC (Liquid Reflection)", en: "Viscous dark liquid reflections ON surface.", guardrail: "Zero dripping outside text.", shapeRisk: "high", negExempt: [] },
  { id: "hologram_glitch", label: "\uD640\uB85C\uADF8\uB7A8 \uAE00\uB9AC\uCE58 (Hologram Glitch)", en: "Digital scan lines & micro glitches inside shapes.", guardrail: "Zero displacement of silhouette.", shapeRisk: "high" },
  { id: "data_scan", label: "\uB370\uC774\uD130 \uC2A4\uCE94 (Data Scan)", en: "Vertical digital scan lines across typography.", shapeRisk: "low" },
  { id: "internal_glow", label: "\uB0B4\uBD80 \uBC1C\uAD11 \uB9E5\uBC15 (Internal Glow)", en: "Deep stationary core glow intensifies organically.", guardrail: "Glow must not leak outside.", shapeRisk: "medium" },
  { id: "magma_cracks", label: "\uC6A9\uC554 \uADE0\uC5F4 (Magma Cracks)", en: "Fine glowing cracks brighten like cooling magma.", guardrail: "Zero breaking of structure.", shapeRisk: "high" },
  { id: "living_texture", label: "\uBBF8\uC138 \uC9C8\uAC10 \uC77C\uB801\uC784 (Living Texture)", en: "Base micro-texture shifts/morphs across flat face.", guardrail: "Confine morphing strictly inside letters. Zero black stains.", shapeRisk: "medium" },
  { id: "shifting_cracks", label: "\uAFC8\uD2C0\uAC70\uB9AC\uB294 \uADE0\uC5F4 (Shifting Cracks)", en: "Existing cracks aggressively shift and pulse internally.", guardrail: "Zero breaking of silhouette.", shapeRisk: "high" }
];
var LOOP_EDGE_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (None)", en: "Edges clean and static.", shapeRisk: "low" },
  { id: "rim_trace", label: "\uC724\uACFD\uC120 \uBE5B \uD750\uB984 (Rim Light Trace)", en: "Light particles trace outer contours.", guardrail: "Trace extremely tight to edge.", shapeRisk: "low" },
  { id: "soft_aura", label: "\uBBF8\uC138\uD55C \uBE5B \uBC88\uC9D0 (Soft Glow Aura)", en: "A soft glowing aura continuously breathes, gently pulsing and shifting its light intensity around the edges.", guardrail: "Allow dynamic light bleed. Do not alter solid core.", shapeRisk: "low", negExempt: ["wide aura"] },
  { id: "thin_electric", label: "\uC587\uC740 \uC804\uB958 \uC678\uACFD\uC120 (Thin Electric)", en: "Aggressively animate and bring to life any existing lightning, sparks, or electric motifs in the original image. Bright electric arcs crackle and travel along the strokes.", guardrail: "Zero wide aura expansion. Confine lightning strictly to the text surface.", shapeRisk: "medium" },
  { id: "edge_pulse", label: "\uC678\uACFD\uC120 \uBC1C\uAD11 \uD384\uC2A4 (Edge Glow Pulse)", en: "Soft edge illumination actively brightening and dimming rhythmically.", guardrail: "Tight to contours, zero wide aura.", shapeRisk: "low" },
  { id: "burning_outline", label: "\uBD88\uD0C0\uB294 \uC724\uACFD\uC120 (Burning Outline)", en: "Microscopic fire tongues tracing edges.", guardrail: "Fire strictly microscopic, zero spreading.", shapeRisk: "high", negExempt: ["no large flames"] }
];
var LOOP_AMBIENT_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (Clean Space)", en: "Pure black background. Zero ambient FX.", alphaRisk: "low" },
  { id: "animate_existing", label: "\uC6D0\uBCF8 \uC8FC\uBCC0 \uD6A8\uACFC \uC0B4\uB9AC\uAE30 (Animate Existing)", en: "CRITICAL: Actively animate any existing smoke, frost, aura, or glow surrounding the text in the original image. Make these ambient elements drift, flow, and dissipate naturally instead of being frozen.", guardrail: "Do not freeze ambient details. Allow natural atmospheric movement.", alphaRisk: "high", negExempt: ["no smoke", "no fog", "wide aura", "frozen frame"] },
  { id: "ash_particles", label: "\uC5B4\uB450\uC6B4 \uC7AC \uC785\uC790 (Dark Ash)", en: "Sparse dark ash trapped close to letters.", guardrail: "Particles dissolve before leaving center. Zero outward momentum.", alphaRisk: "low" },
  { id: "gold_dust", label: "\uAE08\uBE5B \uBA3C\uC9C0 (Gold Dust)", en: "Micro gold dust flickers in place within tight radius.", guardrail: "No outward drift, no expansion.", alphaRisk: "low" },
  { id: "energy_sparks", label: "\uBBF8\uC138 \uBD88\uAF43 \uC2A4\uD30C\uD06C (Micro Sparks)", en: "Tiny short-lived sparks snapping near letters.", guardrail: "Zero flying outwards.", alphaRisk: "medium" },
  { id: "haze_smoke", label: "\uBBF8\uC138\uD55C \uC5F0\uAE30 (Subtle Wisps)", en: "Subtle thin wisps attached near letters.", guardrail: "Dissipate instantly. Zero large smoke.", alphaRisk: "high", negExempt: ["no smoke", "no fog"] }
];
var INTRO_SURFACE_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (None)", en: "No extra surface FX during reveal.", shapeRisk: "low" },
  { id: "shimmer_reveal", label: "\uC740\uC740\uD55C \uBE5B \uC0DD\uC131 (Shimmer Reveal)", en: "Subtle light shimmers across surface as it materializes.", guardrail: "Do not alter original silhouette.", shapeRisk: "low" },
  { id: "energy_fill", label: "\uB0B4\uBD80 \uC5D0\uB108\uC9C0 \uCC28\uC624\uB984 (Energy Fill)", en: "Internal energy fills strokes from core outward.", guardrail: "Confine light inside strokes.", shapeRisk: "medium" },
  { id: "frost_form", label: "\uACB0\uBE59\uB418\uBA70 \uB4F1\uC7A5 (Frost Form)", en: "Ice crystals rapidly form across surface.", guardrail: "Keep silhouette locked.", shapeRisk: "medium" }
];
var INTRO_EDGE_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (None)", en: "No extra edge FX.", shapeRisk: "low" },
  { id: "soft_aura", label: "\uBE5B \uBC88\uC9C0\uBA70 \uB4F1\uC7A5 (Aura Bloom)", en: "A soft glowing aura actively pulses and blooms outward from the edges as the text reveals.", guardrail: "Allow dynamic light bleed. Keep core intact.", shapeRisk: "low", negExempt: ["wide aura"] },
  { id: "trace_reveal", label: "\uC724\uACFD\uC120 \uC2A4\uCE94 (Trace Reveal)", en: "Bright laser traces outline to reveal shape.", guardrail: "Trace strictly to edge.", shapeRisk: "low" },
  { id: "spark_ignite", label: "\uBD88\uAF43 \uD280\uBA70 \uB4F1\uC7A5 (Spark Ignite)", en: "Edges catch fire and spark violently.", guardrail: "Sparks must not obscure text.", shapeRisk: "medium" },
  { id: "electric_surge", label: "\uC804\uB958 \uC1C4\uB3C4 (Electric Surge)", en: "High voltage surges around borders to shock text into existence.", guardrail: "Zero wide aura.", shapeRisk: "medium" }
];
var INTRO_AMBIENT_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (Clean Space)", en: "Pure black background.", alphaRisk: "low" },
  { id: "animate_existing", label: "\uC6D0\uBCF8 \uC8FC\uBCC0 \uD6A8\uACFC \uC0B4\uB9AC\uAE30 (Animate Existing)", en: "CRITICAL: As the text reveals, actively animate the existing smoke, frost, or aura from the original image, making it billow and flow naturally rather than appearing as a static painting.", guardrail: "Do not freeze ambient details.", alphaRisk: "high", negExempt: ["no smoke", "no fog", "wide aura", "frozen frame"] },
  { id: "inward_dust", label: "\uBA3C\uC9C0 \uBAA8\uC5EC\uB4E6 (Inward Dust)", en: "Micro dust gathers inward to form text.", guardrail: "No outward drift. Do not trigger zoom out.", alphaRisk: "medium" },
  { id: "spark_burst", label: "\uC2A4\uD30C\uD06C \uC810\uD654 (Spark Burst)", en: "Quick contained burst of sparks flashes in place.", guardrail: "Confine sparks near text.", alphaRisk: "medium" },
  { id: "clearing_fog", label: "\uC5F0\uAE30 \uAC77\uD798 (Clearing Fog)", en: "Thick smoke clears rapidly in place to reveal text.", guardrail: "Smoke must clear completely.", alphaRisk: "high", negExempt: ["no smoke", "no fog"] }
];
var INTRO_STYLES = [
  { id: "fade_in", label: "\uC11C\uC11C\uD788 \uBC1D\uC544\uC9D0 (Fade In)", en: "Starts as PURE BLACK VOID. Text slowly fades in (0% to 100% opacity) in place." },
  { id: "light_sweep", label: "\uBE5B\uC73C\uB85C \uD6D1\uC73C\uBA70 \uB4F1\uC7A5 (Light Sweep)", en: "Starts as PURE BLACK VOID. A tight vertical band of light sweeps across text surface. Illumination STRICTLY CONFINED to letters. ZERO external light beams." },
  { id: "glitch_reveal", label: "\uAE00\uB9AC\uCE58 \uC810\uB4F1 (Glitch Reveal)", en: "Starts as PURE BLACK VOID. Text aggressively stutters, sparks, and glitches into full visibility in place." },
  { id: "ember_ignite", label: "\uBD88\uC528 \uC810\uD654 (Ember Ignite)", en: "Starts as PURE BLACK VOID. Glowing embers spark at center and spread outwards, burning text into existence." }
];
var TRANS_SURFACE_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (None)", en: "No extra companion surface FX.", shapeRisk: "low" },
  { id: "melting_heat", label: "\uACBD\uACC4\uC120 \uACE0\uC5F4 (Melting Heat)", en: "Surface glows intensely hot at active transition boundary.", guardrail: "Do not melt outline.", shapeRisk: "medium" },
  { id: "freezing_frost", label: "\uC5BC\uC5B4\uBD99\uB294 \uD30C\uB3D9 (Freezing Frost)", en: "Frost rapidly shoots ahead of transition line.", guardrail: "Do not grow text.", shapeRisk: "medium" },
  { id: "digital_glitch", label: "\uAE00\uB9AC\uCE58 \uD30C\uAD34 (Digital Glitch)", en: "Digital glitch blocks corrupt surface strictly along transition wave.", guardrail: "Zero slicing outside bounds.", shapeRisk: "high" },
  { id: "corrosion_spread", label: "\uC0B0\uD654/\uBD80\uC2DD \uD655\uC0B0 (Corrosion Spread)", en: "Heavy oxidation eats surface at transition front.", guardrail: "Keep geometry locked.", shapeRisk: "medium" }
];
var TRANS_EDGE_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (None)", en: "No extra companion edge FX.", shapeRisk: "low" },
  { id: "light_bleed", label: "\uACBD\uACC4\uC120 \uBE5B \uBC88\uC9D0 (Light Bleed)", en: "Intense glowing aura actively pulses and bleeds outward specifically from the moving transition boundary.", guardrail: "Allow dynamic glow expansion only at boundary.", shapeRisk: "low", negExempt: ["wide aura"] },
  { id: "burning_edge", label: "\uD0C0\uC624\uB974\uB294 \uACBD\uACC4 (Burning Edge)", en: "Transition line burns heavily as it eats original edge.", guardrail: "Strictly localized fire.", shapeRisk: "high", negExempt: ["no large flames"] },
  { id: "electric_zip", label: "\uACBD\uACC4\uC120 \uC804\uB958 (Electric Zip)", en: "Electricity actively zips strictly along boundary between materials.", guardrail: "Zero wide aura.", shapeRisk: "medium" },
  { id: "crystal_shatter", label: "\uACB0\uC815\uD654 \uD30C\uC5F4 (Crystal Shatter)", en: "Micro-shards of crystal burst at transition edge.", guardrail: "Do not distort main text body.", shapeRisk: "high" }
];
var TRANS_AMBIENT_FX = [
  { id: "none", label: "\uD6A8\uACFC \uC5C6\uC74C (Clean Space)", en: "Pure black background.", alphaRisk: "low" },
  { id: "animate_existing", label: "\uC6D0\uBCF8 \uC8FC\uBCC0 \uD6A8\uACFC \uC0B4\uB9AC\uAE30 (Animate Existing)", en: "Actively animate the existing ambient effects (smoke, frost, aura) from the base image around the transition boundary to make them flow dynamically.", guardrail: "Do not freeze ambient details.", alphaRisk: "high", negExempt: ["no smoke", "no fog", "wide aura", "frozen frame"] },
  { id: "ash_debris", label: "\uBD80\uC11C\uC9C0\uB294 \uD30C\uD3B8 (Ash Debris)", en: "Old material sheds dark debris particles.", guardrail: "Debris must dissolve quickly.", alphaRisk: "medium" },
  { id: "frost_dust", label: "\uC5BC\uC74C \uAC00\uB8E8 \uD769\uB0A0\uB9BC (Frost Dust)", en: "Cold frost dust blows off active transition boundary.", guardrail: "Do not obscure readability.", alphaRisk: "medium" },
  { id: "energy_sparks", label: "\uC2A4\uD30C\uD06C \uBC29\uCD9C (Energy Sparks)", en: "Bright sparks aggressively fly off transition boundary.", guardrail: "Sparks dissipate instantly.", alphaRisk: "medium" }
];
var FLOW_STYLES = [
  { id: "contour_trace", label: "\uC724\uACFD\uC120 \uD750\uB984 (Contour Trace)", loop_en: "Motion follows existing contours and stroke boundaries.", trans_en: "New material traces along contours, filling strokes." },
  { id: "core_radiate", label: "\uC911\uC2EC\uBD80 \uB9E5\uBC15 (Core Pulse)", loop_en: "Energy smoothly swells and pulses from the center core outward, remaining strictly inside the boundaries.", trans_en: "The material transformation radiates smoothly from the center to the edges without expanding the shape." },
  { id: "edge_creep", label: "\uC678\uACFD\uC120 \uCE68\uC2DD (Edge Creep)", loop_en: "FX actively bites inward from extreme outer edges to center core, then dissolves.", trans_en: "Aggressive erosion: New material bites and creeps inward from extreme edges." },
  { id: "particle_impact", label: "\uC785\uC790 \uCDA9\uB3CC \uD655\uC0B0 (Particle Impact)", loop_en: "FX erupts from localized micro-impact points, spreading and fading.", trans_en: "Micro-particles collide. New material aggressively spreads outward from impacts." },
  { id: "linear_sweep", label: "\uC120\uD615 \uC2A4\uCE94 \uD6D1\uAE30 (Linear Sweep)", loop_en: "Controlled wave of energy/FX sweeps linearly across typography.", trans_en: "Controlled wave of new material sweeps linearly across typography." }
];
var MOTION_DYNAMICS = [
  { id: "smooth", label: "\uC77C\uC815\uD558\uACE0 \uBD80\uB4DC\uB7FD\uAC8C (Smooth & Steady)", en: "Smooth consistent speed." },
  { id: "erratic_bursts", label: "\uBD88\uADDC\uCE59\uD55C \uAC15\uC57D (Erratic Bursts)", en: "Erratic unpredictable rhythm. Sharp flickers then calm. Never moves toward camera." },
  { id: "organic_swell", label: "\uB0B4\uBD80 \uC5D0\uB108\uC9C0 \uC9D1\uC911 (Internal Build-up)", en: "Localized internal intensity build-up. Peaks in thicker strokes. Zero breathing scale." }
];
var INTENSITY_LEVELS = [
  { id: "subtle", label: "\uC740\uC740\uD558\uAC8C (Subtle)", en: "Subtle minimal" },
  { id: "medium", label: "\uBCF4\uD1B5 (Medium)", en: "Noticeable precise" },
  { id: "intense", label: "\uAC15\uD558\uAC8C (Intense)", en: "High-energy strictly confined" }
];
var TRANSITION_TARGETS = [
  { id: "ice", label: "\uC5BC\uC74C/\uC11C\uB9AC (Frosted Ice)", base: "solid frosted ice and sharp ice crystals", auto: { surface: "freezing_frost", edge: "crystal_shatter", ambient: "frost_dust", intensity: "medium" } },
  { id: "rust", label: "\uBD80\uC2DD/\uB179 (Corroded Rust)", base: "rough flaky brown oxidation heavily corroded metal", auto: { surface: "corrosion_spread", edge: "none", ambient: "ash_debris", intensity: "subtle" } },
  { id: "magma", label: "\uBD88\uC528/\uC6A9\uC554 (Glowing Magma)", base: "cooling dark rock and intensely glowing red-hot embers", auto: { surface: "melting_heat", edge: "burning_edge", ambient: "energy_sparks", intensity: "intense" } },
  { id: "crystal", label: "\uD06C\uB9AC\uC2A4\uD0C8 (Shiny Crystal)", base: "transparent refractive shiny clear crystal glass", auto: { surface: "freezing_frost", edge: "crystal_shatter", ambient: "none", intensity: "medium" } },
  { id: "cyber", label: "\uB514\uC9C0\uD138\uD654 (Cyber Glitch)", base: "glowing neon circuits and holographic digital data blocks", auto: { surface: "digital_glitch", edge: "electric_zip", ambient: "none", intensity: "medium" } },
  { id: "stone", label: "\uC11D\uD654 (Petrification)", base: "ancient cracked dry petrified stone", auto: { surface: "corrosion_spread", edge: "none", ambient: "ash_debris", intensity: "subtle" } }
];
var EXPORT_MODES = [
  { id: "production", label: "Production (\uD45C\uC900)", desc: "\uC2E4\uBB34\uC6A9 \uC644\uBCBD \uD1B5\uC81C \uD504\uB86C\uD504\uD2B8" },
  { id: "lite_test", label: "Lite Test (\uD14C\uC2A4\uD2B8)", desc: "\uC800\uB834\uD55C \uD130\uBCF4 \uBAA8\uB378 \uD14C\uC2A4\uD2B8\uC6A9" },
  { id: "vfx_pass", label: "VFX Pass (\uD569\uC131\uC6A9)", desc: "Screen/Add \uD569\uC131\uC6A9 \uD751\uBC31 \uB9E4\uD2B8 \uCD94\uCD9C" },
  { id: "strict_lock", label: "Strict Lock (\uACE0\uC815)", desc: "\uD615\uD0DC \uC720\uC9C0\uAC00 \uC548 \uB420 \uB54C \uAC15\uC81C \uACE0\uC815" },
  { id: "web_alpha", label: "Web Alpha (\uCD94\uCD9C)", desc: "\uD22C\uBA85 \uCD94\uCD9C\uC744 \uC704\uD55C \uAC00\uC7A5\uC790\uB9AC/\uBE14\uB799 \uAC15\uC870" }
];
var PRESETS = [
  // ─── 기존 ────────────────────────────────────────────────────────────
  { id: "premium_metal", label: "Premium Metal", description: "\uAE08\uC18D\uC131 \uBE5B \uD750\uB984 + \uC724\uACFD\uC120 \uD2B8\uB808\uC774\uC2A4. \uC808\uC81C\uB41C \uD504\uB9AC\uBBF8\uC5C4 \uBAA8\uC158.", layers: { surface: "metallic_sweep", edge: "rim_trace", ambient: "none", intensity: "subtle", duration: "5s", flow: "contour_trace", intro: "fade_in", dynamics: "smooth" } },
  { id: "dark_fantasy", label: "Dark Fantasy Relic", description: "\uC6A9\uC554 \uADE0\uC5F4 + \uC678\uACFD\uC120 \uD384\uC2A4 + \uC5B4\uB450\uC6B4 \uC7AC. \uB2E4\uD06C \uD310\uD0C0\uC9C0 \uC720\uBB3C \uBD84\uC704\uAE30.", layers: { surface: "magma_cracks", edge: "edge_pulse", ambient: "ash_particles", intensity: "medium", duration: "5s", flow: "core_radiate", intro: "ember_ignite", dynamics: "organic_swell" } },
  { id: "cyber_scan", label: "Cyber Data Scan", description: "\uB370\uC774\uD130 \uC2A4\uCE94 + \uC587\uC740 \uC804\uB958. \uBE60\uB974\uACE0 \uBD88\uADDC\uCE59\uD55C \uC0AC\uC774\uBC84 \uB514\uC9C0\uD138 \uBAA8\uC158.", layers: { surface: "data_scan", edge: "thin_electric", ambient: "none", intensity: "medium", duration: "3s", flow: "linear_sweep", intro: "glitch_reveal", dynamics: "erratic_bursts" } },
  // ─── 메탈 무한 루프 5종 ───────────────────────────────────────────────
  { id: "metal_liquid_gold", label: "\uD669\uAE08 \uC77C\uB801\uC784", description: "\uD669\uAE08 \uD45C\uBA74 \uC704\uB85C \uC561\uCCB4 \uAC19\uC740 \uBE5B\uC774 \uCC9C\uCC9C\uD788 \uC77C\uB801\uC774\uB294 \uBB34\uD55C \uB8E8\uD504.", layers: { surface: "metallic_sweep", edge: "rim_trace", ambient: "gold_dust", intensity: "subtle", duration: "5s", flow: "contour_trace", intro: "fade_in", dynamics: "smooth" } },
  { id: "metal_steel_galvanic", label: "\uAC15\uCCA0 \uAC08\uBC14\uB2C9", description: "\uAC15\uCCA0 \uBAA8\uC11C\uB9AC\uB97C \uB530\uB77C \uD478\uB978 \uAC08\uBC14\uB2C9 \uC804\uB958\uAC00 \uB9E5\uB3D9\uD558\uB294 \uB8E8\uD504.", layers: { surface: "light_shimmer", edge: "thin_electric", ambient: "energy_sparks", intensity: "medium", duration: "5s", flow: "contour_trace", intro: "light_sweep", dynamics: "erratic_bursts" } },
  { id: "metal_chrome_wave", label: "\uD06C\uB86C \uBBF8\uB7EC \uD30C\uB3D9", description: "\uD06C\uB86C \uBBF8\uB7EC \uD45C\uBA74\uC744 \uAC00\uB85C\uC9C0\uB974\uB294 \uC5B4\uB450\uC6B4 \uBC18\uC0AC \uD30C\uB3D9\uC758 \uBB34\uD55C \uB8E8\uD504.", layers: { surface: "living_texture", edge: "rim_trace", ambient: "none", intensity: "subtle", duration: "5s", flow: "linear_sweep", intro: "light_sweep", dynamics: "smooth" } },
  { id: "metal_brushed_sweep", label: "\uBE0C\uB7EC\uC2DC\uB4DC \uACE8\uB4DC \uC2A4\uC715", description: "\uC218\uD3C9 \uBE0C\uB7EC\uC2DC \uACB0\uC744 \uB530\uB77C \uC88C\u2192\uC6B0\uB85C \uBE5B\uC774 \uC2A4\uC715\uD558\uB294 \uB8E8\uD504.", layers: { surface: "metallic_sweep", edge: "none", ambient: "gold_dust", intensity: "subtle", duration: "5s", flow: "linear_sweep", intro: "light_sweep", dynamics: "smooth" } },
  { id: "metal_ember_forge", label: "\uC5E0\uBC84 \uD3EC\uC9C0 \uD384\uC2A4", description: "\uB2E8\uC870\uB41C \uAE08\uC18D \uB0B4\uBD80\uC5D0\uC11C \uC794\uC5F4\uC774 \uD638\uD761\uD558\uB4EF \uB9E5\uB3D9\uD558\uB294 \uB8E8\uD504 (Dark Fantasy \uC640\uB294 \uB2E4\uB978 \uC794\uC794\uD55C \uD1A4).", layers: { surface: "internal_glow", edge: "edge_pulse", ambient: "ash_particles", intensity: "subtle", duration: "5s", flow: "core_radiate", intro: "fade_in", dynamics: "organic_swell" } },
  // ─── 얼음 무한 루프 5종 ───────────────────────────────────────────────
  { id: "ice_glacier_vapor", label: "\uBE59\uD558 \uC548\uAC1C \uD750\uB984", description: "\uBE59\uD558 \uACB0\uC815 \uC704\uB85C \uB05D\uC5C6\uC774 \uD750\uB974\uB294 \uCC28\uAC00\uC6B4 \uC548\uAC1C \uB8E8\uD504.", layers: { surface: "living_texture", edge: "soft_aura", ambient: "haze_smoke", intensity: "subtle", duration: "8s", flow: "contour_trace", intro: "fade_in", dynamics: "smooth" } },
  { id: "ice_crystal_refraction", label: "\uACB0\uC815 \uAD74\uC808 \uC0AC\uC774\uD074", description: "\uD06C\uB9AC\uC2A4\uD0C8 \uB0B4\uBD80\uC5D0\uC11C \uBE5B\uC774 \uB05D\uC5C6\uC774 \uAD74\uC808\uB418\uB294 \uB9CC\uD654\uACBD \uB8E8\uD504.", layers: { surface: "crystal_refraction", edge: "none", ambient: "none", intensity: "medium", duration: "5s", flow: "core_radiate", intro: "fade_in", dynamics: "organic_swell" } },
  { id: "ice_frost_crawl", label: "\uC11C\uB9AC \uAE30\uC5B4\uAC00\uAE30", description: "\uC5B4\uB450\uC6B4 \uD45C\uBA74 \uBAA8\uC11C\uB9AC\uC5D0\uC11C \uC11C\uB9AC\uAC00 \uC790\uB77C\uACE0 \uC0AC\uB77C\uC9C0\uB294 \uB8E8\uD504.", layers: { surface: "light_shimmer", edge: "rim_trace", ambient: "none", intensity: "subtle", duration: "8s", flow: "edge_creep", intro: "fade_in", dynamics: "smooth" } },
  { id: "ice_aurora_sheen", label: "\uC624\uB85C\uB77C \uAD11\uD0DD", description: "\uC5BC\uC74C \uD45C\uBA74\uC744 \uB300\uAC01\uC120\uC73C\uB85C \uD750\uB974\uB294 \uC624\uB85C\uB77C \uC0C9\uAC10\uC758 \uBB34\uD55C \uB8E8\uD504.", layers: { surface: "living_texture", edge: "soft_aura", ambient: "none", intensity: "subtle", duration: "5s", flow: "linear_sweep", intro: "fade_in", dynamics: "smooth" } },
  { id: "ice_polar_twinkle", label: "\uBD81\uADF9 \uBC18\uC9DD\uC784", description: "\uC5BC\uC74C \uBAA8\uC11C\uB9AC\uC758 \uBBF8\uC138\uD55C \uD770 \uBC18\uC9DD\uC784\uC774 \uAE5C\uBE61\uC774\uB294 \uB8E8\uD504.", layers: { surface: "light_shimmer", edge: "edge_pulse", ambient: "energy_sparks", intensity: "medium", duration: "3s", flow: "particle_impact", intro: "glitch_reveal", dynamics: "erratic_bursts" } },
  // ─── 화염 무한 루프 5종 ───────────────────────────────────────────────
  { id: "fire_lava_vein", label: "\uC6A9\uC554 \uB9E5\uB3D9", description: "\uD654\uC0B0\uC554 \uADE0\uC5F4 \uC18D \uC6A9\uC554 \uB9E5\uC774 \uAC15\uD558\uAC8C \uD638\uD761\uD558\uB294 \uBB34\uD55C \uB8E8\uD504 (Dark Fantasy \uBCF4\uB2E4 \uAC15\uB82C).", layers: { surface: "magma_cracks", edge: "burning_outline", ambient: "energy_sparks", intensity: "intense", duration: "5s", flow: "core_radiate", intro: "ember_ignite", dynamics: "organic_swell" } },
  { id: "fire_ember_drift", label: "\uBD88\uD2F0 \uD769\uB0A0\uB9BC", description: "\uAE00\uC790 \uBAA8\uC11C\uB9AC\uC5D0\uC11C \uC704\uB85C \uCC9C\uCC9C\uD788 \uB5A0\uC624\uB974\uB294 \uBD88\uD2F0 \uB8E8\uD504.", layers: { surface: "shifting_cracks", edge: "burning_outline", ambient: "energy_sparks", intensity: "medium", duration: "5s", flow: "edge_creep", intro: "ember_ignite", dynamics: "smooth" } },
  { id: "fire_phoenix_ring", label: "\uD53C\uB2C9\uC2A4 \uD654\uC5FC \uACE0\uB9AC", description: "\uAE00\uC790 \uC678\uACFD\uC120\uC744 \uB530\uB77C \uD68C\uC804\uD558\uB294 \uBD88\uAF43 \uACE0\uB9AC \uB8E8\uD504.", layers: { surface: "internal_glow", edge: "burning_outline", ambient: "energy_sparks", intensity: "medium", duration: "5s", flow: "contour_trace", intro: "ember_ignite", dynamics: "smooth" } },
  { id: "fire_heat_haze", label: "\uC5F4\uAE30 \uC544\uC9C0\uB791\uC774", description: "\uB2EC\uAD88\uC9C4 \uAE08\uC18D \uBAA8\uC11C\uB9AC\uC5D0\uC11C \uC5F4\uAE30 \uC544\uC9C0\uB791\uC774\uAC00 \uBBF8\uC138\uD558\uAC8C \uC77C\uB801\uC774\uB294 \uB8E8\uD504.", layers: { surface: "living_texture", edge: "soft_aura", ambient: "haze_smoke", intensity: "subtle", duration: "5s", flow: "core_radiate", intro: "fade_in", dynamics: "smooth" } },
  { id: "fire_magma_surge", label: "\uB9E4\uADF8\uB9C8 \uAC70\uD488", description: "\uAE00\uC790 \uADE0\uC5F4 \uC548\uC5D0\uC11C \uB053\uC5B4\uC624\uB974\uB294 \uC6A9\uC554 \uAC70\uD488\uC774 \uC19F\uAD6C\uCE58\uB294 \uB8E8\uD504.", layers: { surface: "magma_cracks", edge: "edge_pulse", ambient: "energy_sparks", intensity: "intense", duration: "8s", flow: "particle_impact", intro: "ember_ignite", dynamics: "erratic_bursts" } }
];
var _presetMap = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
var PRESET_GROUPS = [
  {
    id: "metal",
    icon: "\u{1F7E1}",
    name: "\uBA54\uD0C8",
    presets: [
      _presetMap.premium_metal,
      _presetMap.metal_liquid_gold,
      _presetMap.metal_steel_galvanic,
      _presetMap.metal_chrome_wave,
      _presetMap.metal_brushed_sweep,
      _presetMap.metal_ember_forge
    ]
  },
  {
    id: "ice",
    icon: "\u{1F9CA}",
    name: "\uC5BC\uC74C",
    presets: [
      _presetMap.ice_glacier_vapor,
      _presetMap.ice_crystal_refraction,
      _presetMap.ice_frost_crawl,
      _presetMap.ice_aurora_sheen,
      _presetMap.ice_polar_twinkle
    ]
  },
  {
    id: "fire",
    icon: "\u{1F525}",
    name: "\uD654\uC5FC",
    presets: [
      _presetMap.fire_lava_vein,
      _presetMap.fire_ember_drift,
      _presetMap.fire_phoenix_ring,
      _presetMap.fire_heat_haze,
      _presetMap.fire_magma_surge
    ]
  },
  {
    id: "fantasy",
    icon: "\u2694\uFE0F",
    name: "\uD310\uD0C0\uC9C0",
    presets: [_presetMap.dark_fantasy]
  },
  {
    id: "tech",
    icon: "\u{1F4BB}",
    name: "\uC0AC\uC774\uBC84",
    presets: [_presetMap.cyber_scan]
  }
];

// src/apps/MotionMatrix/services/motionCompiler.js
var MOTION_FX_LISTS = {
  loop: { surface: LOOP_SURFACE_FX, edge: LOOP_EDGE_FX, ambient: LOOP_AMBIENT_FX },
  intro: { surface: INTRO_SURFACE_FX, edge: INTRO_EDGE_FX, ambient: INTRO_AMBIENT_FX },
  transition: { surface: TRANS_SURFACE_FX, edge: TRANS_EDGE_FX, ambient: TRANS_AMBIENT_FX }
};
var inspectAndOptimizePrompt = (rawText, targetModel) => {
  let opt = rawText || "";
  const logs = [];
  let replacements = [
    { rx: /\b(sweeps across|sweeps|sweeping)\b/gi, rep: "scans in-place across", reason: "\uCE74\uBA54\uB77C \uD328\uB2DD \uC720\uBC1C \uBC29\uC9C0" },
    { rx: /\b(radiates outward|radiates|radiating)\b/gi, rep: "pulses in-place", reason: "\uD615\uD0DC \uD33D\uCC3D(Scale up) \uBC29\uC9C0" },
    { rx: /\b(creeps inward|creeping inward|creeps)\b/gi, rep: "materializes", reason: "Z\uCD95 \uC90C\uC778 \uC720\uBC1C \uBC29\uC9C0" },
    { rx: /\b(erupts from|erupts|erupting)\b/gi, rep: "flashes at", reason: "\uC624\uBE0C\uC81D\uD2B8 \uD30C\uAD34/\uBCC0\uD615 \uBC29\uC9C0" },
    { rx: /\b(fly off|flying outwards?)\b/gi, rep: "spark locally", reason: "\uC785\uC790 \uD504\uB808\uC784 \uC774\uD0C8 \uBC29\uC9C0" },
    { rx: /\b(blows off|blowing)\b/gi, rep: "dissolves near", reason: "\uC5F0\uAE30/\uAC00\uB8E8\uC758 \uD654\uBA74 \uC7A0\uC2DD \uBC29\uC9C0" },
    { rx: /\b(aggressively spreads|spreads outward|spreads)\b/gi, rep: "illuminates", reason: "\uC9C8\uAC10\uC758 \uC2A4\uCF00\uC77C \uD655\uC7A5 \uBC29\uC9C0" },
    { rx: /\b(organic swell)\b/gi, rep: "in-place swell", reason: "\uC2A4\uCF00\uC77C \uAFC0\uB801\uC784(Wobbling) \uBC29\uC9C0" },
    { rx: /\b(aggressively animate|animate heavily)\b/gi, rep: "animate in-place", reason: "\uACFC\uB3C4\uD55C \uD53D\uC140 \uBB49\uAC1C\uC9D0 \uBC29\uC9C0" }
  ];
  if (targetModel === "kling") {
    replacements = replacements.filter((r) => !["\uC624\uBE0C\uC81D\uD2B8 \uD30C\uAD34/\uBCC0\uD615 \uBC29\uC9C0", "\uACFC\uB3C4\uD55C \uD53D\uC140 \uBB49\uAC1C\uC9D0 \uBC29\uC9C0", "\uC2A4\uCF00\uC77C \uAFC0\uB801\uC784(Wobbling) \uBC29\uC9C0", "\uC9C8\uAC10\uC758 \uC2A4\uCF00\uC77C \uD655\uC7A5 \uBC29\uC9C0"].includes(r.reason));
  }
  replacements.forEach(({ rx, rep, reason }) => {
    const match = opt.match(rx);
    if (match && match.length > 0) {
      opt = opt.replace(rx, rep);
      logs.push(`\u26A0\uFE0F \uB2E8\uC5B4 \uAD50\uCCB4: "${match[0]}" \u27A1\uFE0F "${rep}" (${reason})`);
    }
  });
  const oldLen = opt.length;
  opt = opt.replace(/\n\s*\n/g, "\n");
  opt = opt.replace(/  +/g, " ");
  if (oldLen > opt.length + 20) logs.push(`\u2705 \uBE48\uCE78 \uBC0F \uD1A0\uD070 \uB0AD\uBE44 \uC555\uCD95 \uC644\uB8CC`);
  return { optimizedText: opt, logs };
};
var compileNegativePrompt = (layers, exportMode, animationMode, targetModel, surfaceOpts, edgeOpts, ambientOpts) => {
  const sOpt = surfaceOpts.find((o) => o.id === layers.surface);
  const eOpt = edgeOpts.find((o) => o.id === layers.edge);
  const aOpt = ambientOpts.find((o) => o.id === layers.ambient);
  const exempt = [...sOpt?.negExempt || [], ...eOpt?.negExempt || [], ...aOpt?.negExempt || []];
  let baseNegatives = [];
  if (exportMode === "lite_test") {
    baseNegatives = ["camera movement", "zoom", "lens flare", "external laser beams", "distortion", "morphing", "warping", "wobbling", "scenery", "3D"];
    if (animationMode === "loop") baseNegatives.push("non-looping");
  } else if (exportMode === "vfx_pass") {
    baseNegatives = [
      "camera movement",
      "zoom",
      "pan",
      "scale change",
      "morphing",
      "distortion",
      "typography changes",
      "visible text face",
      "textured letters",
      "lit background",
      "scenery",
      "background scene",
      "floor shadow",
      "lens flare",
      "anamorphic streak",
      "external laser beams",
      "audio",
      "original texture",
      "visible letters",
      "surface details",
      "base image colors",
      "lit text",
      "metal texture",
      "stone texture",
      "reflections on text",
      "ambient light on letters",
      "inner fill"
    ];
    if (animationMode === "loop") baseNegatives.push("lingering glow", "non-looping");
  } else {
    baseNegatives = [
      "camera movement",
      "zoom",
      "zoom out",
      "zoom in",
      "pan",
      "dolly",
      "parallax",
      "reframe",
      "crop shift",
      "scale change",
      "shrinking text",
      "growing text",
      "depth motion",
      "backward drift",
      "forward drift",
      "breathing scale",
      "morphing",
      "distortion",
      "typography changes",
      "warping",
      "wobbling",
      "liquefying",
      "jelly-like motion",
      "melting",
      "scenery",
      "background scene",
      "floor shadow",
      "large smoke",
      "messy particles",
      "clipping edges",
      "wide aura",
      "lens flare",
      "anamorphic streak",
      "volumetric light",
      "external laser beams",
      "flash",
      "glare",
      "amateur",
      "flat lighting",
      "audio",
      "abrupt cuts",
      "high contrast black stains"
    ];
    if (animationMode === "loop") baseNegatives.push("lingering glow", "non-looping", "one-way movement", "linear animation");
    else baseNegatives = baseNegatives.filter((n) => n !== "typography changes");
  }
  if (animationMode === "intro") baseNegatives.push("flying in", "scaling up", "zooming out from black", "pop in", "sliding text", "moving text", "visible at start");
  if (targetModel === "runway") baseNegatives.push("micro-zoom", "creeping scale", "subtle zoom", "slow push-in", "perspective shift");
  else if (targetModel === "gemini") baseNegatives.push("excessive effects", "flashy", "cluttered", "busy", "over-the-top", "chaotic");
  else if (targetModel === "kling") {
    baseNegatives = baseNegatives.filter((n) => !["typography changes"].includes(n));
    baseNegatives.push("frozen texture", "static photo", "dead pixels", "wobbling", "warping", "liquefying", "morphing letterforms", "letter deformation");
  }
  return baseNegatives.filter((n) => !exempt.includes(n)).join(", ");
};
var compileRawPrompt = (layers, exportMode, animationMode, targetMat, vfxTarget, targetModel, surfaceOpts, edgeOpts, ambientOpts) => {
  const sOpt = surfaceOpts.find((f) => f.id === layers.surface) || surfaceOpts[0];
  const eOpt = edgeOpts.find((f) => f.id === layers.edge) || edgeOpts[0];
  const aOpt = ambientOpts.find((f) => f.id === layers.ambient) || ambientOpts[0];
  const tMat = TRANSITION_TARGETS.find((t) => t.id === targetMat) || TRANSITION_TARGETS[0];
  const flowOpt = FLOW_STYLES.find((f) => f.id === layers.flow) || FLOW_STYLES[0];
  const introOpt = INTRO_STYLES.find((i) => i.id === layers.intro) || INTRO_STYLES[0];
  const intensity = (INTENSITY_LEVELS.find((f) => f.id === layers.intensity) || INTENSITY_LEVELS[0]).en;
  const dynamics = (MOTION_DYNAMICS.find((f) => f.id === layers.dynamics) || MOTION_DYNAMICS[0]).en;
  const guardrails = Array.from(new Set([sOpt.guardrail, eOpt.guardrail, aOpt.guardrail].filter(Boolean))).join(" ");
  const halfway = parseInt(layers.duration) / 2;
  let modelInjection = "";
  if (targetModel === "runway") modelInjection = `[ANTI-ZOOM] Do not scale, reframe, or zoom. Keep bounds identical. Zero depth motion.
`;
  else if (targetModel === "kling") modelInjection = `[KLING DYNAMICS] Outer silhouette is mathematically FROZEN. Zero morphing or shape distortion. BUT the INTERNAL textures, edges, and lighting MUST flow and animate vividly.
`;
  else if (targetModel === "gemini") modelInjection = `[MINIMALIST] Restrain effects. Subtle, clean motion. Do not over-render.
`;
  const cinematicTone = `[TONE] Hollywood title sequence, masterpiece, photorealistic, cinematic lighting.
`;
  if (exportMode === "vfx_pass") {
    let fxToRender = "";
    if (vfxTarget === "surface") fxToRender = `[SURFACE FX ONLY] ${sOpt.en} Zero edge/ambient.`;
    else if (vfxTarget === "edge") fxToRender = `[EDGE FX ONLY] ${eOpt.en} Zero surface/ambient.`;
    else if (vfxTarget === "ambient") fxToRender = `[AMBIENT FX ONLY] ${aOpt.en} Zero surface/edge.`;
    else fxToRender = `[FX] Surface: ${sOpt.en} Edge: ${eOpt.en} Ambient: ${aOpt.en}`;
    let modeLine = "";
    if (animationMode === "transition") modeLine = `Progression: ${flowOpt.trans_en} End: Full FX.`;
    else if (animationMode === "intro") modeLine = `Intro Reveal. Start(0s): Pitch black empty space. Progression: ${introOpt.en} End: Fully visible FX.`;
    else modeLine = `Seamless ${layers.duration} loop. ${flowOpt.loop_en} Dormant start -> peak ${halfway}s -> dormant end.`;
    return `${modelInjection}VFX Luma Matte Render Pass on pure #000000 background.
${cinematicTone}[MASK OVERRIDE] IGNORE input textures/colors. OVERWRITE base image. ${animationMode === "intro" ? "Frame 0 MUST be completely black." : ""} Transform typography into a flat, unlit, pure #000000 silhouette. Base text acts ONLY as hidden collision mesh. DO NOT render original material.
[MOTION] ${modeLine} ${dynamics} (${intensity}). Zero camera movement. Zero depth drift.
${fxToRender}
Render ONLY bright glowing FX for Add/Screen compositing.
[RULE] Preserve exact bounds & size. Pure #000000 BG. Zero flares, zero external lasers, zero scenery. --no-audio --zoom 0`;
  }
  if (exportMode === "lite_test") {
    let modeLine = "";
    let baseImgLock = "Use original image exactly as first frame.";
    if (animationMode === "transition") modeLine = `Linear trans to ${tMat.base}. ${flowOpt.trans_en}`;
    else if (animationMode === "intro") {
      modeLine = `Intro Reveal. ${introOpt.en}`;
      baseImgLock = "CRITICAL: Image is FINAL target frame. Frame 0 MUST be pitch black.";
    } else modeLine = `Seamless ${layers.duration} loop. ${flowOpt.loop_en}`;
    const motionLock = targetModel === "kling" ? "Outline is mathematically frozen. INTERNAL textures MUST animate vividly and shift continuously." : "Outer shape frozen. INTERNAL textures animate vividly.";
    return `${modelInjection}2D text on pure #000000. ${baseImgLock} 100% static camera. Zero zoom/pan/drift. Preserve exact size. Immutable shape.
[MOTION] ${motionLock} ${modeLine} ${dynamics} (${intensity}).
[FX] ${sOpt.en} ${eOpt.en} ${aOpt.en}
[RULE] ${guardrails} Zero flares/scenery. --no-audio --zoom 0`;
  }
  let lockSection = "";
  if (targetModel === "kling") {
    lockSection = animationMode === "intro" ? `[CAM/SHAPE] CRITICAL OVERRIDE: Provided image is FINAL TARGET FRAME. Frame 0 MUST be completely pitch black. Fixed camera. Text boundaries are mathematically frozen. Zero wobbling or warping.` : `[CAM/SHAPE] Fixed camera, zero zoom/pan/drift. Text boundaries are mathematically frozen. Zero morphing, wobbling, or warping. The letters MUST NOT deform. Only the internal textures and edge lighting can shift.`;
  } else if (animationMode === "intro") {
    lockSection = `[CAM/SHAPE LOCK]
CRITICAL OVERRIDE: The provided image is the FINAL TARGET FRAME, NOT the first frame. Frame 0 MUST be completely pitch black and invisible. 100% static locked-off camera. The outer silhouette and bounding box are completely frozen. Zero zoom, pan, parallax, or perspective shift. Preserve the exact original text size, position, and margins.`;
  } else {
    lockSection = `[CAM/SHAPE LOCK]
Use the provided image exactly as the first frame reference. 100% static locked-off camera. The outer silhouette and bounding box are completely frozen. Zero zoom, pan, parallax, or perspective shift. Preserve the exact original text size, position, and margins. CRITICAL: While the outer shape is locked, the INTERNAL textures, cracks, and existing electric/energy motifs MUST animate vividly.`;
  }
  let loopSection = "";
  let motionSection = "";
  if (animationMode === "transition") {
    loopSection = `[TRANSITION] ONE-WAY cinematic material transition. Start(0s): Original base texture. Progression: ${flowOpt.trans_en} End(${layers.duration}): Surface converts entirely into ${tMat.base}.`;
    motionSection = `[MOTION] ${dynamics} (${intensity}). FX animate heavily during transition. Never move toward camera. Zero depth drift. No outward expansion.`;
  } else if (animationMode === "intro") {
    loopSection = `[INTRO] ONE-WAY reveal animation. Start(0s): Typography is completely invisible, pitch black. Progression: ${introOpt.en} End(${layers.duration}): Text is 100% visible exactly as reference image.`;
    motionSection = `[MOTION] ${dynamics} (${intensity}). Text must reveal IN PLACE. Never move toward camera. Zero depth drift. No scaling/flying in.`;
  } else {
    loopSection = `[LOOP] Seamless ${layers.duration} loop. Frame 0 and final frame visually identical. Dormant start -> peak at ${halfway}s -> dormant end. Return to dormant affects only light intensity, never scale. Zero lingering FX.`;
    motionSection = `[MOTION] ${flowOpt.loop_en} Never move toward camera. Zero depth drift. ${dynamics} (${intensity}). Only internal FX animate. No expansion/shrink.`;
  }
  const fxSection = `[FX] Apply tracing & enhancing existing design elements (e.g. lightning, cracks).
Surface: ${sOpt.en}
Edge: ${eOpt.en}
Ambient: ${aOpt.en}`;
  let guardrailSection = `[RULE] Razor-sharp readability. Pure #000000 background. Zero heat haze/scenery/smoke. CRITICAL: Zero lens flares, zero anamorphic streaks, zero external laser beams from empty space. Confine FX strictly to text surface. Particles MUST NOT clip frame edges. ${guardrails}`;
  if (exportMode === "production" || exportMode === "strict_lock") guardrailSection += ` --no-audio --zoom 0`;
  else if (exportMode === "web_alpha") guardrailSection = `[RULE] Ultra-sharp edges. Zero wide glow. Particles dissolve before edges. ${guardrails} --no-audio --zoom 0`;
  if (targetModel === "luma") {
    const refInst = animationMode === "intro" ? "CRITICAL: Image represents FINAL frame. Video MUST start completely black (Frame 0)." : "Use image exactly as first frame reference.";
    return `Create a breathtaking Hollywood title sequence. Isolated 2D typography on pure #000000. Masterpiece, photorealistic cinematic lighting. ${refInst} 100% static camera. Zero zoom/pan/depth drift. Preserve exact text size.
Outer silhouette is completely frozen, but internal textures/motifs animate vividly.
${animationMode === "transition" ? `Cinematic material transition. ${flowOpt.trans_en} Surface converts into ${tMat.base}.` : animationMode === "intro" ? `Intro Reveal. ${introOpt.en} Fully visible by ${layers.duration}.` : `Seamless ${layers.duration} loop. ${flowOpt.loop_en} Dormant start, peak at ${halfway}s, completely dormant end.`}
Apply overlays: ${sOpt.en} ${eOpt.en} ${aOpt.en}
Dynamics: ${dynamics} (${intensity}). Razor-sharp readability. Zero lens flares, external lasers, volumetric light. Confine FX to text surface. ${guardrails} --no-audio --zoom 0`;
  }
  return `${modelInjection}Isolated 2D typography motion on pure #000000.
${cinematicTone}${lockSection}
${loopSection}
${motionSection}
${fxSection}
${guardrailSection}`;
};
var DEFAULT_LAYERS = { surface: "metallic_sweep", edge: "rim_trace", ambient: "none", intensity: "subtle", duration: "5s", flow: "contour_trace", intro: "fade_in", dynamics: "smooth" };

// src/lib/veoRender.js
var VEO_MODELS = [
  {
    id: "veo-3.1-generate-preview",
    label: "Veo 3.1",
    desc: "\uCD5C\uC2E0 \xB7 8s",
    color: "#FD79A8"
  },
  {
    id: "veo-3.0-generate-preview",
    label: "Veo 3",
    desc: "\uC548\uC815 \xB7 8s",
    color: "#FDCB6E"
  }
];
var POLL_TIMEOUT_MS = 5 * 6e4;

// src/apps/BriefStudio/prism/rules.js
var GENERIC_REVISION_RULES = `[\uC218\uC815\uC694\uCCAD\uC11C \uD574\uC11D \uADDC\uCE59 \u2014 \uBAA8\uB4E0 \uAC8C\uC784\xB7\uD398\uC774\uC9C0 \uACF5\uD1B5]
- \uC694\uCCAD\uC11C\uB294 \uBCF4\uD1B5 \uC704\uCABD "\uC218\uC815 \uD76C\uB9DD \uC601\uC5ED"(\uBC30\uB108/\uD654\uBA74 \uCEA1\uCC98, \uBC88\uD638 \u2460\u2461\u2462\u2463 \uD45C\uC2DC) + \uC544\uB798\uCABD "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"(\uBCC0\uACBD \uD45C\xB7\uBAA9\uB85D)\uC73C\uB85C \uAD6C\uC131\uB41C\uB2E4.
- "\uC218\uC815 \uD76C\uB9DD \uC601\uC5ED" \uCEA1\uCC98\uB294 \uBC14\uAFB8\uAE30 "\uC804"\uC758 \uC61B \uD654\uBA74\uC774\uB2E4. \uAC70\uAE30 \uBCF4\uC774\uB294 \uD0C0\uC774\uD2C0\xB7\uC0C1\uD488\uBA85\xB7\uAE30\uAC04\uC740 \uAD50\uCCB4\uB420 \uC61B \uAC12\uC774\uC9C0 \uCD94\uCD9C\uD560 \uB370\uC774\uD130\uAC00 \uC544\uB2C8\uB2E4. \uC0C8 \uAC12\uC740 \uC624\uC9C1 "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"\uC758 \uD45C/\uBAA9\uB85D\uC5D0 \uC788\uB2E4. \uB458\uC774 \uB2E4\uB974\uBA74 \uD56D\uC0C1 "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"\uC744 \uB530\uB978\uB2E4.
- \uD45C\uC5D0\uC11C \uAE00\uC790\uC0C9\uC774 \uBE68\uAC15(\uBD89\uC740) \uACC4\uC5F4\uB85C \uC778\uC1C4\uB41C \uD56D\uBAA9\uC740 \uAC15\uC870/\uB300\uD45C \uD56D\uBAA9\uC774\uB2E4. \uAC80\uC815\xB7\uD68C\uC0C9 \uD56D\uBAA9\uACFC \uAD6C\uBD84\uD574 \uD45C\uAE30\uD55C\uB2E4. \uBE68\uAC15 \uADFC\uAC70\uAC00 \uC5C6\uC73C\uBA74 \uCD94\uC815\uD558\uC9C0 \uC54A\uB294\uB2E4.
- "A \u2192 B" \uD45C\uAE30(\uD14D\uC2A4\uD2B8 \uC218\uC815\xB7\uAE30\uAC04 \uC218\uC815\xB7\uC81C\uBAA9 \uC218\uC815)\uB294 \uCE58\uD658 \uBAA9\uB85D\uC73C\uB85C \uBF51\uB294\uB2E4: before=A, after=B. A \uAC00 \uC5C6\uC73C\uBA74 before \uB97C \uBE44\uC6B0\uACE0 uncertain \uC5D0 \uC801\uB294\uB2E4.
- \uBB38\uC11C \uC591\uC2DD \uC694\uC18C\uB294 \uB370\uC774\uD130\uAC00 \uC544\uB2C8\uB2E4: \uD45C\uC9C0 \uC81C\uBAA9("[\uD504\uB85C\uBAA8\uC158] \u2026"), \uAC8C\uC784/\uD68C\uC0AC \uB85C\uACE0, \uD300\uBA85\xB7\uC791\uC131\uC790\xB7\uB0B4\uC120\uBC88\uD638\xB7\uC791\uC131\uC77C\xB7\uBC84\uC804/\uAC1C\uC815 \uC774\uB825 \uD45C, \uBA38\uB9AC\uB9D0\xB7\uAF2C\uB9AC\uB9D0\xB7\uD398\uC774\uC9C0 \uBC88\uD638. \uC5B4\uB5A4 \uC2AC\uB86F\uC5D0\uB3C4 \uB123\uC9C0 \uC54A\uB294\uB2E4.
- \uC218\uCE58\xB7\uB0A0\uC9DC\xB7\uB2E8\uC704\xB7\uAD04\uD638\xB7\uAC15\uD654\uC218\uCE58(+5~+7)\xB7\uC544\uC774\uD15C\uBA85\uC740 \uC6D0\uBB38 \uADF8\uB300\uB85C. \uC624\uD0C8\uC790 \uAD50\uC815\xB7\uC720\uC0AC \uB2E8\uC5B4 \uB300\uCCB4\xB7\uC694\uC57D\xB7\uCC3D\uC791 \uAE08\uC9C0. \uD655\uC2E0\uC774 \uC5C6\uC73C\uBA74 \uBE44\uC6B0\uC9C0 \uB9D0\uACE0 \uCD5C\uC120 \uCD94\uC815 \uD6C4 uncertain \uBC30\uC5F4\uC5D0 \uC0AC\uC720\uB97C \uC801\uB294\uB2E4.
- "\uBA54\uC778 \uB9AC\uC18C\uC2A4/\uBC30\uACBD \uBCC0\uACBD"\uCC98\uB7FC \uC774\uBBF8\uC9C0 \uAD50\uCCB4 \uC694\uCCAD\uC740 \uD14D\uC2A4\uD2B8 \uC2AC\uB86F\uC5D0 \uB123\uC9C0 \uC54A\uACE0 uncertain \uC5D0 "\uC774\uBBF8\uC9C0 \uAD50\uCCB4 \uC694\uCCAD" \uBA54\uBAA8\uB85C \uB0A8\uAE34\uB2E4.
- "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"\uC5D0 \uBA85\uC2DC\uB41C \uAC83\uB9CC \uBC18\uC601\uD55C\uB2E4. \uBAA9\uB85D\uC5D0 \uC5C6\uB294 \uBCF8\uBB38/\uD31D\uC5C5 \uB370\uC774\uD130\uB97C \uCD94\uC815\uD574 \uCC44\uC6B0\uC9C0 \uC54A\uB294\uB2E4.`;

// src/apps/BriefStudio/prism/prompts.js
var PATTERN_VOCAB = "craft-formula(\uC81C\uC791\uC2DD A+B\u2192C) | result-grid(\uACB0\uACFC \uADF8\uB9AC\uB4DC, \uD655\uB960\xB7OR \uBD84\uAE30) | package-card(\uC720\uB8CC \uD328\uD0A4\uC9C0 \uCE74\uB4DC: \uAC00\uACA9\xB7\uC778\uC7A5\xB7\uAD6C\uC131\uD488) | selection-grid(N\uC885 \uC911 \uD0DD1 \uC120\uD0DD \uC0C1\uC790 \uADF8\uB9AC\uB4DC) | craft-rows(\uAD50\uD658/\uD655\uC815\uC81C\uC791 \uD589 \uBC18\uBCF5: X\u2192Y, \uD69F\uC218 \uC81C\uD55C) | showcase(\uB300\uD45C \uC0C1\uD488 \uC1FC\uCF00\uC774\uC2A4: \uD61C\uD0DD \uD0DC\uADF8) | unknown(\uC5B4\uD718 \uBC16 \uC2E0\uADDC \uD328\uD134)";
function extractionPrompt(extraNote = "") {
  return [
    "\uB2F9\uC2E0\uC740 NCSOFT \uAC8C\uC784 \uD504\uB85C\uBAA8\uC158 \uD398\uC774\uC9C0 \uC81C\uC791\uC744 \uC704\uD55C \uC694\uCCAD\uC11C \uBD84\uC11D\uAE30\uB2E4.",
    "\uC785\uB825\uC740 \uC0AC\uC5C5\uBD80\uC11C\uC758 \uC81C\uC791\uC694\uCCAD\uC11C \uB610\uB294 \uC218\uC815\uC694\uCCAD\uC11C\uC774\uBA70 \uD615\uC2DD\uC774 \uC77C\uC815\uD558\uC9C0 \uC54A\uB2E4. \uB9E5\uB77D\uC744 \uC77D\uACE0 \uD398\uC774\uC9C0\uC758 \uC804\uCCB4 \uAD6C\uC870\uC640 \uC138\uBD80 \uB370\uC774\uD130\uB97C \uCD94\uCD9C\uD55C\uB2E4.",
    "",
    "\uC139\uC158 \uD328\uD134 \uC5B4\uD718: " + PATTERN_VOCAB,
    "",
    "\uADDC\uCE59:",
    "- \uC218\uCE58(X150, 99%, 50,000, \uACC4\uC815\uB2F9 8\uD68C, \uAE30\uAC04)\uB294 \uBB38\uC11C \uC6D0\uBB38 \uADF8\uB300\uB85C \uBCF4\uC874\uD55C\uB2E4.",
    "- \uC544\uC774\uD15C\uBA85\uC740 \uC815\uC2DD \uBA85\uCE6D \uADF8\uB300\uB85C, \uAD04\uD638\xB7\uAC15\uD654\uC218\uCE58(+5~+7) \uD3EC\uD568.",
    "- \uD574\uB2F9 \uC5C6\uB294 \uD544\uB4DC\uB294 \uBE48 \uBB38\uC790\uC5F4/\uBE48 \uBC30\uC5F4\uB85C \uB454\uB2E4. structure\uB294 \uD398\uC774\uC9C0 \uB4F1\uC7A5 \uC21C\uC11C.",
    '- \uD328\uD134 \uC5B4\uD718\uC5D0 \uB9DE\uC9C0 \uC54A\uC73C\uBA74 pattern\uC744 "unknown"\uC73C\uB85C \uB450\uACE0 note\uC5D0 \uD615\uD0DC\uB97C \uC124\uBA85\uD55C\uB2E4.',
    "- \uD655\uC2E0\uC774 \uC5C6\uB294 \uBD80\uBD84\uC740 \uBE44\uC6CC\uB450\uC9C0 \uB9D0\uACE0 \uCD5C\uC120 \uCD94\uC815 \uD6C4 uncertain \uBC30\uC5F4\uC5D0 \uC0AC\uC720\uB97C \uC801\uB294\uB2E4.",
    "",
    GENERIC_REVISION_RULES,
    extraNote ? "\n\uC0AC\uC6A9\uC790 \uAD50\uC815 \uC9C0\uC2DC (\uCD5C\uC6B0\uC120 \uBC18\uC601): " + extraNote : ""
  ].join("\n");
}
function opsPrompt(extractedJson, schemaJson) {
  return [
    "\uC544\uB798 [\uCD94\uCD9C\uB370\uC774\uD130]\uB294 \uC694\uCCAD\uC11C\uC5D0\uC11C \uBF51\uC740 \uD398\uC774\uC9C0 \uB370\uC774\uD130\uC774\uACE0, [\uC2A4\uD0A4\uB9C8]\uB294 Figma \uD15C\uD50C\uB9BF\uC758 \uC2AC\uB86F \uACE8\uACA9(ops)\uC774\uB2E4.",
    "\uC2A4\uD0A4\uB9C8\uC758 \uAC01 op\uC5D0\uC11C value(\uD14D\uC2A4\uD2B8\uB958) \uB610\uB294 match(\uC774\uBBF8\uC9C0\uB958)\uB9CC \uCD94\uCD9C\uB370\uC774\uD130\uC758 \uC62C\uBC14\uB978 \uAC12\uC73C\uB85C \uAD50\uCCB4\uD558\uB77C.",
    "",
    "\uADDC\uCE59:",
    "- id, slot, type \uD544\uB4DC\uB294 \uC808\uB300 \uBCC0\uACBD\xB7\uC0AD\uC81C\xB7\uCD94\uAC00\uD558\uC9C0 \uC54A\uB294\uB2E4. op \uC21C\uC11C\uB3C4 \uC720\uC9C0\uD55C\uB2E4.",
    "- type\uC774 image\uC778 op\uC758 match\uB294 \uD574\uB2F9 \uC140 \uC544\uC774\uD15C\uC758 \uC815\uC2DD \uBA85\uCE6D\uC73C\uB85C \uB123\uB294\uB2E4.",
    '- \uCD94\uCD9C\uB370\uC774\uD130\uC5D0 \uB300\uC751 \uAC12\uC774 \uC5C6\uAC70\uB098 \uB9E4\uCE6D\uC774 \uBD88\uD655\uC2E4\uD558\uBA74 \uC6D0\uB798 \uAC12\uC744 \uC720\uC9C0\uD558\uACE0 "_review" \uD544\uB4DC\uC5D0 \uC0AC\uC720\uB97C \uC801\uB294\uB2E4.',
    "",
    "[\uCD94\uCD9C\uB370\uC774\uD130]",
    extractedJson,
    "",
    "[\uC2A4\uD0A4\uB9C8]",
    schemaJson
  ].join("\n");
}

// src/apps/BriefStudio/prism/schema.js
var PATTERNS = ["craft-formula", "result-grid", "package-card", "selection-grid", "craft-rows", "showcase", "unknown"];
var namedCount = {
  type: "object",
  properties: { name: { type: "string" }, count: { type: "string" } }
};
var EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    meta: {
      type: "object",
      properties: {
        doc_type: { type: "string" },
        // 제작요청서 | 수정요청서
        game: { type: "string" },
        page_title: { type: "string" },
        period: { type: "string" },
        servers: { type: "string" },
        etc: { type: "string" }
      }
    },
    structure: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pattern: { type: "string", enum: PATTERNS },
          title: { type: "string" },
          note: { type: "string" }
        },
        required: ["pattern", "title"]
      }
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pattern: { type: "string", enum: PATTERNS },
          tag: { type: "string" },
          // 전서버 | 상시 | EVENT 등
          title: { type: "string" },
          desc: { type: "string" },
          heading: { type: "string" },
          formula: {
            type: "object",
            properties: {
              sources: { type: "array", items: namedCount },
              result: namedCount,
              arrow: { type: "string" }
              // 제작 | 확정 제작 | 성공확률 N% 등
            }
          },
          outcomes: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, count: { type: "string" }, prob: { type: "string" } }
            }
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, count: { type: "string" }, note: { type: "string" } }
            }
          },
          price: { type: "string" },
          seal: { type: "string" },
          notes: { type: "array", items: { type: "string" } }
          // ※ 원문 그대로
        },
        required: ["pattern", "title"]
      }
    },
    uncertain: { type: "array", items: { type: "string" } }
  },
  required: ["meta", "structure", "sections"]
};
var OPS_SCHEMA = {
  type: "object",
  properties: {
    ops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          scope: { type: "array", items: { type: "string" } },
          cellIndex: { type: "integer" },
          slot: { type: "string" },
          type: { type: "string" },
          value: { type: "string" },
          match: { type: "string" },
          asset: { type: "string" },
          _review: { type: "string" }
        },
        required: ["slot", "type"]
      }
    }
  },
  required: ["ops"]
};

// src/apps/BriefStudio/prism/promoPrompt.js
function promoExtractionPrompt(note = "") {
  return `\uB2F9\uC2E0\uC740 NC "\uC624\uB298\uC758 \uC0C1\uD488 \uC2A4\uD398\uC15C" \uC6D4\uAC04 \uD504\uB85C\uBAA8\uC158 \uD398\uC774\uC9C0\uC758 \uC218\uC815\uC694\uCCAD\uC11C\uB97C \uC77D\uACE0, \uB514\uC790\uC778 \uC2AC\uB86F \uAD6C\uC870\uC5D0 \uB9DE\uCDB0 \uB370\uC774\uD130\uB97C \uC804\uC0AC(\uCD94\uCD9C)\uD558\uB294 \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4.
\uC694\uCCAD\uC11C(\uC774\uBBF8\uC9C0/PDF/\uD14D\uC2A4\uD2B8)\uC5D0\uC11C \uAC12\uC744 **\uC6D0\uBB38 \uADF8\uB300\uB85C** \uBF51\uC544 \uC544\uB798 \uAD6C\uC870\uB85C \uCD9C\uB825\uD558\uC138\uC694. \uCD94\uC815/\uCC3D\uC791 \uAE08\uC9C0 \u2014 \uC5C6\uB294 \uAC12\uC740 \uBE48 \uBB38\uC790\uC5F4\uB85C \uB450\uACE0 uncertain \uC5D0 \uC801\uC2B5\uB2C8\uB2E4.

[\uD398\uC774\uC9C0 \uB514\uC790\uC778 \uAD6C\uC870 \u2014 \uC774 \uC2AC\uB86F\uB4E4\uC5D0 \uB9E4\uD551]
1) meta
   - game: \uAC8C\uC784\uBA85, month: \uB300\uC0C1 \uC6D4
   - title: **\uC2E4\uC81C \uD398\uC774\uC9C0/\uBC30\uB108\uC5D0 \uB178\uCD9C\uB418\uB294 \uD0C0\uC774\uD2C0\uB9CC**(\uC608 "6\uC6D4 \uC624\uB298\uC758 \uC0C1\uD488 \uC2A4\uD398\uC15C"). \uBB38\uC11C \uD45C\uC9C0 \uC81C\uBAA9\uC758 "[\uD504\uB85C\uBAA8\uC158]" \uAC19\uC740 \uB300\uAD04\uD638 \uC811\uB450\uC5B4\xB7\uBB38\uC11C \uC591\uC2DD \uD45C\uAE30\uB294 \uBE7C\uACE0 \uC21C\uC218 \uD398\uC774\uC9C0 \uD0C0\uC774\uD2C0\uB85C.
   - salePeriod: \uC0C1\uD488 \uD310\uB9E4 \uAE30\uAC04 \uC6D0\uBB38, rewardPeriod: \uBCF4\uC0C1 \uC218\uB839 \uAE30\uAC04 \uC6D0\uBB38
2) boxes (\uC2A4\uD398\uC15C \uC0C1\uD488 4\uCE78) \u2014 \uCE74\uB4DC\uB9C8\uB2E4 \uC717\uC904(top)+\uC544\uB7AB\uC904(name). \uBCF4\uD1B5 top="\uC624\uB298\uC758 \uC120\uBB3C\uC0C1\uC790", name=\uC2E4\uC81C \uC0C1\uD488\uBA85(\uC608 "\uAC01\uC131 \uC0AC\uB3C4\uC9C4","\uC0AC\uC120 \uD0DC\uADF9","\uD314\uC131 \uC218\uD638").
   "\uB514\uC790\uC778 \uC218\uC815" \uD45C / \uC0C1\uD488 \uCE74\uB4DC \uC601\uC5ED\uC758 \uC0C1\uD488\uBA85\uC5D0\uC11C \uADF8\uB300\uB85C \uAC00\uC838\uC628\uB2E4. top \uB77C\uBCA8\uC774 \uC5C6\uB294 \uC0C1\uD488(\uC608 "\uC601\uB871\uD55C \uC6D4\uC11D \uAE08\uD654 \uC0C1\uC790")\uC740 top \uBE44\uC6B0\uACE0 name \uB9CC.
   \uC694\uCCAD\uC11C \uC0C1\uD488 **\uC88C\u2192\uC6B0 \uC21C\uC11C \uADF8\uB300\uB85C** 1~4\uBC88\uC5D0 \uB123\uB294\uB2E4. **\uBC15\uC2A4 \uC0C1\uD488\uBA85\uC744 slotIcons \uC5D0 \uB123\uC9C0 \uB9D0 \uAC83.**
3) slotIcons \u2014 \uC0C1\uD488 1~4\uBC88 \uCE74\uB4DC\uC5D0 \uC0BD\uC785\uB420 **\uB300\uD45C \uC544\uC774\uCF58 \uC544\uC774\uD15C\uBA85** (boxes \uC21C\uC11C\uC640 1:1).
   \u2605 \uC785\uB825\uC5D0 "[\uBD89\uC740\uC0C9 \uB300\uD45C \uC544\uC774\uCF58 (\uC0C1\uC790\u2192\uC544\uC774\uD15C)]" \uBAA9\uB85D\uC774 \uC788\uC73C\uBA74, **\uADF8 \uBAA9\uB85D\uC758 item \uC744 boxes \uC21C\uC11C\uC5D0 \uB9DE\uCDB0 \uADF8\uB300\uB85C slotIcons \uB85C \uC4F4\uB2E4(\uCD5C\uC6B0\uC120).**
   \u2605\u2605 \uD55C \uC0C1\uC790\uC5D0 \uBE68\uAC15 \uD56D\uBAA9\uC774 **\uC5EC\uB7EC \uAC1C\uBA74 \uC804\uBD80**\uB97C  \uB85C \uC774\uC5B4\uBD99\uC5EC \uADF8 \uC0C1\uC790\uC758 slotIcons \uD55C \uD56D\uBAA9\uC73C\uB85C \uB123\uB294\uB2E4 (\uCCAB \uBC88\uC9F8\uB9CC \uB123\uC9C0 \uB9D0 \uAC83). **\uAD6C\uBD84\uC790\uB294 \uBC18\uB4DC\uC2DC  \u2014 <br>\xB7\uC904\uBC14\uAFC8\xB7\uC27C\uD45C \uAE08\uC9C0** (\uD50C\uB7EC\uADF8\uC778\uC774  \uB85C\uB9CC \uBD84\uB9AC\uD574 \uC5EC\uB7EC \uC544\uC774\uCF58\uC744 \uD55C \uC7A5\uC73C\uB85C \uD569\uC131\uD55C\uB2E4).
       \uC608: "\uD64D\uBB38\uC218 \uACB0\uC815 400\uAC1C + \uC218\uD638\uC218 \uACB0\uC815 400\uAC1C + \uAD11\uD63C\uC11D \uACB0\uC815 400\uAC1C" \u2014 \uD50C\uB7EC\uADF8\uC778\uC774 \uC774\uAC78 \uBD84\uB9AC\uD574 \uD55C \uC7A5\uC73C\uB85C \uD569\uC131\uD55C\uB2E4.
   \uADF8 \uBAA9\uB85D\uC774 \uC5C6\uC744 \uB54C\uB9CC: "\uC0C1\uC138 \uAD6C\uC131/\uC0BD\uC785\uC544\uC774\uCF58" \uD45C\uC758 **\uBD89\uC740\uC0C9([\uBE68\uAC15]) \uD56D\uBAA9**\uC744 \uB300\uD45C \uC544\uC774\uCF58\uC73C\uB85C(\uC5EC\uB7EC \uAC1C\uBA74 \uB3D9\uC77C\uD558\uAC8C  \uB85C \uC804\uBD80).
   (\uC608 "\uC9C4\uBB34\uAC15 200\uAC1C","\uD504\uB9AC\uBBF8\uC5C4 \uC0BC\uC120 \uC218\uD638 \uBCF4\uC11D \uC120\uD0DD \uC0C1\uC790","\uD0DC\uADF9 \uC624\uC120 \uBCF4\uC11D \uC120\uD0DD\uD568")
   \u203B \uBC15\uC2A4 \uC81C\uBAA9/\uC0C1\uD488\uBA85\uC774 \uC544\uB2C8\uB77C \uADF8 \uC0C1\uC790 \uAD6C\uC131\uD488 \uC911 \uD558\uB098\uC758 \uC544\uC774\uD15C \uC774\uB984\uC774\uB2E4. **\uC624\uC9C1 \uBE68\uAC04\uC0C9 \uAE00\uC790 \uD56D\uBAA9\uB9CC** \u2014 \uAC80\uC815/\uD68C\uC0C9 \uD56D\uBAA9\uC740 \uB300\uD45C \uC544\uC774\uCF58\uC774 \uC544\uB2C8\uB2E4. \uBD89\uC740\uC0C9 \uADFC\uAC70\uAC00 \uC5C6\uC73C\uBA74 \uBE48 \uBB38\uC790\uC5F4(\uCD94\uC815 \uAE08\uC9C0).
4) rollovers \u2014 \uAC01 \uC0C1\uD488 \uCE74\uB4DC(1~4)\uC5D0 \uB9C8\uC6B0\uC2A4 \uC62C\uB9AC\uBA74 \uB728\uB294 **\uC0C1\uC138 \uAD6C\uC131** \uBAA9\uB85D. card="1".."4", items=[{name, count}]. count \uC608 "5\uAC1C","3,000\uAC1C".
   "\uAC01 \uC544\uC774\uD15C\uC758 \uC0C1\uC138 \uAD6C\uC131" \uD45C\uC758 \uD574\uB2F9 \uC0C1\uC790 \uC5F4\uC5D0 \uC801\uD78C \uD56D\uBAA9\uC744 **\uD558\uB098\uB3C4 \uBE60\uC9D0\uC5C6\uC774 \uC804\uBD80** \uB123\uB294\uB2E4(4\uC904\uC774\uBA74 4\uC904, 5\uC904\uC774\uBA74 5\uC904).
   \uC784\uC758 \uC694\uC57D\xB7\uC0DD\uB7B5\xB7\uCD95\uC18C \uAE08\uC9C0. \uBD89\uC740\uC0C9(\uB300\uD45C \uC544\uC774\uCF58) \uD56D\uBAA9\uB3C4 \uC774 \uBAA9\uB85D\uC5D0 \uADF8\uB300\uB85C \uD3EC\uD568\uD55C\uB2E4.
5) milestones (\uBCF4\uB108\uC2A4 5\uB2E8\uACC4) \u2014 \uB204\uC801 \uBCF4\uB108\uC2A4 \uB2E8\uACC4 5\uAC1C. \uAC01 \uD56D\uBAA9: name, threshold, magnify.
   - threshold = \uADF8 \uCE74\uB4DC \uC0C1\uB2E8 "N \uB204\uC801 \uC2DC"\uC758 \uC22B\uC790 \uBB38\uAD6C("5,000 \uB204\uC801 \uC2DC"\u2192"5,000"). \uCE74\uB4DC\uB9C8\uB2E4 \uB2E4\uB974\uBA70 \uBCF4\uD1B5 \uC88C\u2192\uC6B0 \uC624\uB984\uCC28\uC21C(\uC608 5,000\xB710,000\xB720,000\xB730,000\xB740,000). \uC694\uCCAD\uC11C/\uC774\uBBF8\uC9C0\uC5D0 \uC801\uD78C \uAC12 \uADF8\uB300\uB85C, \uC784\uC758\uB85C \uAC19\uC740 \uAC12\uC744 \uBAA8\uB4E0 \uCE74\uB4DC\uC5D0 \uB123\uC9C0 \uB9D0 \uAC83.
   - magnify = **\uB3CB\uBCF4\uAE30(\uC0C1\uC138\uBCF4\uAE30) \uC544\uC774\uCF58\uC774 \uC2E4\uC81C\uB85C \uBD99\uC740 \uCE74\uB4DC\uB9CC** true. \uBCF4\uD1B5 5\uAC1C \uC911 \uC77C\uBD80(\uC608 2\uAC1C)\uB9CC true\uC774\uACE0 \uB098\uBA38\uC9C0\uB294 false. \uBAA8\uB4E0 \uCE74\uB4DC\uC5D0 true \uAE08\uC9C0 \u2014 \uB3CB\uBCF4\uAE30 \uD45C\uC2DC\uAC00 \uC5C6\uB294 \uCE74\uB4DC\uB294 \uBC18\uB4DC\uC2DC false.
   \uC608: \uD658\uC601\uBB34\uAE30 \uAD50\uD658\uAD8C(threshold "5,000", magnify true) \xB7 \uC9C4\uD654\uC11D \uACB0\uC815(10,000, false) \xB7 \uC758\uC0C1 \uAD50\uD658\uAD8C(20,000, true) \xB7 \uD654\uC2E0\uC11D(30,000, false) \xB7 \uACB0\uC815(40,000, false).
6) popupDays (\uC804\uCCB4\uC0C1\uD488 \uC790\uC138\uD788 \uBCF4\uAE30 \uD31D\uC5C5) \u2014 \uC77C\uC790\uBCC4 \uD45C. date="6\uC6D4 25\uC77C (\uBAA9)", rows=[{name, price}].
   price \uB294 \uCF64\uB9C8 \uD3EC\uD568 \uC6D0\uBB38("4,000"), \uBB34\uB8CC/\uBE44\uB9E4\uB294 "0". \uD558\uB8E8 \uCD5C\uB300 8\uD589.
7) popupTexts (\uAC1C\uBCC4 \uD31D\uC5C5 \uD0C0\uC774\uD2C0\xB7\uC544\uC774\uD15C\uBA85) \u2014 **\uB3CB\uBCF4\uAE30(magnify=true) \uBCF4\uB108\uC2A4\uB9C8\uB2E4 \uC0C1\uC138 \uD31D\uC5C5\uC774 1\uAC1C\uC529** \uC788\uACE0, \uADF8 \uD31D\uC5C5\uC758 \uC81C\uBAA9\xB7\uC544\uC774\uD15C\uBA85\uC744 \uC2AC\uB86F\uD0A4\uB85C \uCD94\uCD9C. key=\uC2AC\uB86F\uD0A4, value=\uBB38\uAD6C. \uC2AC\uB86F\uD0A4 \uADDC\uCE59:
   - \uBB34\uAE30\uC81C\uBAA9 = \uD658\uC601\uBB34\uAE30 \uC0C1\uC138 \uD31D\uC5C5 \uC81C\uBAA9 (\uC608 "\uD310\uB2E4 \uD658\uC601\uBB34\uAE30 \uC0C1\uC790")
   - \uCC9C\uCCB4\uC870\uAC01\uC81C\uBAA9 = \uCC9C\uCCB4\uC870\uAC01 \uC120\uD0DD\uAD8C \uD31D\uC5C5 \uC81C\uBAA9 (\uC608 "\uCC9C\uCCB4\uC870\uAC01 \uC120\uD0DD\uAD8C")
   - \uCC9C\uCCB4\uC870\uAC011\uBA85 / \uCC9C\uCCB4\uC870\uAC012\uBA85 = \uCC9C\uCCB4\uC870\uAC01 \uC120\uD0DD \uC544\uC774\uD15C 2\uAC1C(\uBCF4\uD1B5 "OR"\uB85C \uAC08\uB9AC\uB294 \uC88C/\uC6B0), \uAC1C\uC218\uAE4C\uC9C0 \uD3EC\uD568 (\uC608 "\uACE0\uB300\uC758 \uD0DC\uCC9C\uBA85\uC655 \uCC9C\uCCB4 \uC870\uAC01 60\uAC1C" / "\uC801\uD328\uC655 \uCC9C\uCCB4 \uC870\uAC01 60\uAC1C")
   - \uD751\uC7A5\uBBF8\uC81C\uBAA9 = \uD751\uC7A5\uBBF8 \uD658\uC601\uBE44\uAE09 \uD31D\uC5C5 \uC81C\uBAA9 (\uC608 "\uD751\uC7A5\uBBF8 \uD658\uC601\uBE44\uAE09")
   - \uC758\uC0C1\uC81C\uBAA9 = \uD310\uB2E4 \uC758\uC0C1 \uC138\uD2B8 \uD31D\uC5C5 \uC81C\uBAA9 (\uC608 "\uD310\uB2E4\uC640 \uD568\uAED8 \uC758\uC0C1 \uC138\uD2B8")
   \uC694\uCCAD\uC11C/\uC774\uBBF8\uC9C0\uC5D0 \uC801\uD78C \uD45C\uAE30 \uADF8\uB300\uB85C(\uB744\uC5B4\uC4F0\uAE30\xB7\uAC1C\uC218 \uD3EC\uD568) \uC62E\uAE30\uACE0, \uC784\uC758 \uCD95\uC57D \uAE08\uC9C0. \uC904\uBC14\uAFC8\uC740 value \uC548\uC5D0 \\n. \uD574\uB2F9 \uD31D\uC5C5\uC774 \uC774\uBC88 \uB2EC\uC5D0 \uC5C6\uC73C\uBA74 \uADF8 \uD0A4\uB294 \uC0DD\uB7B5.
8) replacements (\uC2AC\uB86F \uC5C6\uB294 \uACE0\uC815\uBB38\uAD6C \uCE58\uD658) \u2014 \uBC30\uB108 \uC81C\uBAA9/\uD310\uB9E4\xB7\uC218\uB839 \uAE30\uAC04/\uD31D\uC5C5 \uACF5\uC9C0 \uB0A0\uC9DC \uB4F1 "\uC774\uC804\u2192\uC0C8".
   before=\uC694\uCCAD\uC11C\uAC00 \uB9D0\uD558\uB294 \uAE30\uC874 \uBB38\uAD6C(\uC5C6\uC73C\uBA74 \uC9C1\uC804 \uC6D4 \uCD94\uC815 \uB300\uC2E0 \uBE44\uC6CC\uB450\uACE0 uncertain \uCC98\uB9AC), after=\uC0C8 \uBB38\uAD6C.

[\uBB34\uC2DC\uD560 \uBB38\uC11C \uC591\uC2DD \uC694\uC18C \u2014 \uC808\uB300 \uCD94\uCD9C/\uC2AC\uB86F\uC5D0 \uB123\uC9C0 \uB9D0 \uAC83]
- \uBB38\uC11C \uD45C\uC9C0\xB7\uC81C\uBAA9 \uD398\uC774\uC9C0: "[\uD504\uB85C\uBAA8\uC158] \u2026" \uAC19\uC740 **\uBB38\uC11C \uC81C\uBAA9**, \uAC8C\uC784/\uD68C\uC0AC \uB85C\uACE0(B&S \uB4F1), \uBB38\uC11C \uBA38\uB9AC\uB9D0\xB7\uAF2C\uB9AC\uB9D0, \uD398\uC774\uC9C0 \uBC88\uD638.
- \uC791\uC131 \uC815\uBCF4 \uD45C: **\uD300\uBA85 \xB7 \uC791\uC131\uC790\uBA85 \xB7 \uB0B4\uC120\uBC88\uD638 \xB7 \uC791\uC131\uC77C \xB7 \uBC84\uC804/\uAC1C\uC815 \uC774\uB825** \uD45C.
- \uC774\uB7F0 \uAC12\uC740 meta.title \uC744 \uD3EC\uD568\uD55C \uC5B4\uB5A4 \uC2AC\uB86F\xB7\uD544\uB4DC\uC5D0\uB3C4 \uB123\uC9C0 \uC54A\uB294\uB2E4. (\uC694\uCCAD\uC11C "\uB0B4\uC6A9"\uC774 \uC544\uB2C8\uB77C \uBB38\uC11C \uC591\uC2DD\uC774\uB2E4.)

[\u2605\u2605 \uAC00\uC7A5 \uC911\uC694 \u2014 "\uC218\uC815 \uD76C\uB9DD \uC601\uC5ED" \uC774\uBBF8\uC9C0\uB294 '\uC218\uC815 \uC804(\uC61B)' \uD654\uBA74\uC774\uB2E4]
- \uC694\uCCAD\uC11C\uB294 \uBCF4\uD1B5 \uC704\uCABD "\uC218\uC815 \uD76C\uB9DD \uC601\uC5ED"(\uBC30\uB108/\uD654\uBA74 \uCEA1\uCC98 \uC774\uBBF8\uC9C0, \uBC88\uD638 \u2460\u2461\u2462\u2463 \uD45C\uC2DC) + \uC544\uB798\uCABD "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"(\uBCC0\uACBD \uD45C\xB7\uBAA9\uB85D)\uC73C\uB85C \uAD6C\uC131\uB41C\uB2E4.
- **"\uC218\uC815 \uD76C\uB9DD \uC601\uC5ED" \uC774\uBBF8\uC9C0\uB294 \uBC14\uAFB8\uAE30 "\uC804"\uC758 \uC61B \uD654\uBA74\uC774\uB2E4.** \uAC70\uAE30 \uBCF4\uC774\uB294 \uD0C0\uC774\uD2C0\xB7\uC0C1\uD488\uBA85(\uC608 "5\uC6D4\uC758 \uC2A4\uD398\uC15C \uC0C1\uD488", "\uD0DC\uADF9 \uC624\uC120", "\uC9C4\uBB34\uBCF4\uD328\uD568 (A)/(B)", "\uC218\uD638 \uC0BC\uC120" \uB4F1)\uC740 **\uAD50\uCCB4\uB420 \uC61B \uAC12**\uC774\uC9C0 \uCD94\uCD9C\uD560 \uB370\uC774\uD130\uAC00 \uC544\uB2C8\uB2E4. **\uC774\uBBF8\uC9C0(\uBC30\uB108 \uCEA1\uCC98)\uC5D0\uC11C boxes\xB7slotIcons\xB7rollovers\xB7title \uC744 \uC808\uB300 \uAC00\uC838\uC624\uC9C0 \uB9D0 \uAC83.**
- \uCD94\uCD9C\uD560 **\uC0C8 \uB370\uC774\uD130\uB294 \uC624\uC9C1 "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"\uC758 \uD45C/\uBAA9\uB85D**\uC5D0 \uC788\uB2E4:
  - "\uB514\uC790\uC778 \uC218\uC815" \uD45C(IMG \uD5E4\uB354 + \uC0C1\uD488\uBA85 \uC904) \u2192 boxes (\uC717\uC904/\uC0C1\uD488\uBA85). **\uC0C8 \uC0C1\uD488\uBA85\uC740 \uC5EC\uAE30\uC11C\uB9CC** (\uC608 "\uC624\uB298\uC758 \uC120\uBB3C\uC0C1\uC790 \uC9C4\uBB34", "\uD654\uB824\uD55C \uACB0\uC815 \uAE08\uD654\uC0C1\uC790", "\uC624\uB298\uC758 \uC120\uBB3C\uC0C1\uC790 \uC218\uD638 \uC0BC\uC120", "\uC624\uB298\uC758 \uC120\uBB3C\uC0C1\uC790 \uD0DC\uADF9 \uC624\uC120").
  - "\uC0C1\uC790 \uBC0F \uC0BD\uC785\uC544\uC774\uCF58"\uC5D0\uC11C **\uBD89\uC740\uC0C9(\uBE68\uAC15)** \uC73C\uB85C \uD45C\uC2DC\uB41C \uD56D\uBAA9 \u2192 slotIcons (\uB300\uD45C \uC544\uC774\uCF58).
  - "\uAC01 \uC544\uC774\uD15C\uC758 \uC0C1\uC138 \uAD6C\uC131" \uD45C(\uC0C1\uC790\uBCC4 \uC5F4) \u2192 rollovers (\uD574\uB2F9 \uC5F4 \uC804\uBD80).
  - "\uD14D\uC2A4\uD2B8 \uC218\uC815  A \u2192 B"(\uC608 "5\uC6D4\uC758 \uC2A4\uD398\uC15C \uC0C1\uD488 \u2192 6\uC6D4\uC758 \uC2A4\uD398\uC15C \uC0C1\uD488") \u2192 meta.title=B + replacements{before:A, after:B}.
  - "\uC77C\uC815 \uC218\uC815 / \uD310\uB9E4 \uAE30\uAC04 A\u2192B" \u2192 meta.salePeriod=B + replacements; "\uC218\uB839 \uAE30\uAC04 A\u2192B" \u2192 meta.rewardPeriod=B + replacements.
  - "\uBA54\uC778 \uB9AC\uC18C\uC2A4/\uBC30\uACBD \uBCC0\uACBD"\uC740 \uC774\uBBF8\uC9C0 \uAD50\uCCB4\uB77C \uD14D\uC2A4\uD2B8 \uC2AC\uB86F\uC5D0 \uB123\uC9C0 \uB9D0\uACE0 uncertain \uC5D0 "\uBA54\uC778 \uB9AC\uC18C\uC2A4 \uBCC0\uACBD(\uC774\uBBF8\uC9C0)"\uB85C \uBA54\uBAA8.
- **\uC774\uBBF8\uC9C0\uC640 "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"\uC774 \uB2E4\uB974\uBA74 \uD56D\uC0C1 "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"\uC744 \uB530\uB978\uB2E4.** \uC774\uBBF8\uC9C0\uC758 \uC61B \uC0C1\uD488(\uD0DC\uADF9 \uC624\uC120\xB7\uC9C4\uBB34\uBCF4\uD328\uD568 \uB4F1)\uC744 \uACB0\uACFC(boxes \uB4F1)\uC5D0 \uC808\uB300 \uB123\uC9C0 \uB9D0 \uAC83.
- "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"\uC5D0 **\uBA85\uC2DC\uB41C \uAC83\uB9CC** \uBC18\uC601\uD558\uACE0, \uBAA9\uB85D\uC5D0 \uC5C6\uB294 \uBCF8\uBB38/\uD31D\uC5C5 \uB370\uC774\uD130\uB294 \uCD94\uC815\uD574 \uCC44\uC6B0\uC9C0 \uC54A\uB294\uB2E4.

[\uD544\uB4DC \uAD6C\uBD84 \u2014 \uC808\uB300 \uC11E\uC9C0 \uB9D0 \uAC83]
- \uD55C \uC0C1\uC790\uB294 \uC11C\uB85C \uB2E4\uB978 3\uAC1C \uAC12\uC744 \uAC16\uB294\uB2E4: \u2460 boxes[i].name = \uCE74\uB4DC \uC0C1\uD488\uBA85, \u2461 slotIcons[i] = \uADF8 \uC0C1\uC790 \uB300\uD45C \uC544\uC774\uCF58(\uBD89\uC740\uC0C9 \uC544\uC774\uD15C), \u2462 rollovers(card=i+1).items = \uC0C1\uC138 \uAD6C\uC131 \uC804\uCCB4.
- \uBC15\uC2A4 \uC0C1\uD488\uBA85\uC744 \uC544\uC774\uCF58 \uCE78\uC5D0, \uC544\uC774\uCF58\uC744 \uB864\uC624\uBC84\uC5D0 \uC798\uBABB \uB123\uC9C0 \uB9D0 \uAC83. \uAC19\uC740 i \uC758 \uC138 \uAC12\uC740 \uBAA8\uB450 \uB2E4\uB974\uB2E4.
- \uC0C1\uD488\uBA85\xB7\uC544\uC774\uD15C\uBA85\uC740 **\uC774\uBBF8\uC9C0 \uC6D0\uBB38 \uADF8\uB300\uB85C** \u2014 \uC624\uD0C8\uC790 \uAD50\uC815\xB7\uC720\uC0AC \uB2E8\uC5B4 \uB300\uCCB4\xB7\uCC3D\uC791 \uAE08\uC9C0. \uC694\uCCAD\uC11C\uC5D0 \uC5C6\uB294 \uC774\uB984(\uC608 \uC9C1\uC804 \uC6D4 \uC0C1\uD488\uBA85)\uC744 \uB9CC\uB4E4\uAC70\uB098 \uB04C\uC5B4\uC624\uC9C0 \uB9D0 \uAC83.
- boxes\xB7slotIcons\xB7rollovers\xB7milestones\xB7popupDays \uB294 \uC694\uCCAD\uC11C\uC5D0 \uB4F1\uC7A5\uD558\uB294 **\uC21C\uC11C \uADF8\uB300\uB85C** \uC815\uB82C.

[\uADDC\uCE59]
- **\uBAA8\uB4E0 \uBAA9\uB85D(\uC0C1\uD488 4\uCE78\xB7\uAC01 \uCE74\uB4DC \uB864\uC624\uBC84\xB7\uBCF4\uB108\uC2A4 5\uB2E8\uACC4\xB7\uD31D\uC5C5 \uC77C\uC790\uBCC4 \uD589)\uC740 \uC694\uCCAD\uC11C\uC5D0 \uC788\uB294 \uB9CC\uD07C \uC804\uBD80** \uCD94\uCD9C\uD55C\uB2E4. \uAC1C\uC218\uB97C \uC784\uC758\uB85C \uC904\uC774\uC9C0 \uC54A\uB294\uB2E4.
- \uC22B\uC790/\uB0A0\uC9DC/\uB2E8\uC704/\uAD04\uD638\uB294 \uC694\uCCAD\uC11C \uC6D0\uBB38 \uC720\uC9C0. \uC784\uC758 \uC815\uADDC\uD654 \uAE08\uC9C0.
- boxes \uC640 slotIcons \uB294 \uAC1C\uC218\xB7\uC21C\uC11C\uB97C \uB9DE\uCD98\uB2E4(\uBCF4\uD1B5 4\uAC1C).
- \uD310\uB2E8\uC774 \uC560\uB9E4\uD558\uAC70\uB098 \uC694\uCCAD\uC11C\uC5D0 \uADFC\uAC70 \uC5C6\uB294 \uAC12\uC740 uncertain \uBC30\uC5F4\uC5D0 \uD55C \uC904\uC529 \uC0AC\uC720\uC640 \uD568\uAED8.
- \uCD9C\uB825\uC740 JSON \uD558\uB098\uB9CC(\uCF54\uB4DC\uBE14\uB85D\xB7\uC124\uBA85 \uAE08\uC9C0).${note ? `

[\uCD94\uAC00 \uC9C0\uC2DC \u2014 \uC6B0\uC120 \uC801\uC6A9]
${note}` : ""}`;
}
function transcribePrompt() {
  return `\uC774 \uC218\uC815\uC694\uCCAD\uC11C\uC5D0\uC11C **"\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"** \uC139\uC158\uC758 \uBAA8\uB4E0 \uD14D\uC2A4\uD2B8\uB97C \uD45C\xB7\uBAA9\uB85D \uAD6C\uC870\uB97C \uC0B4\uB824 **\uBE60\uC9D0\uC5C6\uC774 \uADF8\uB300\uB85C \uC62E\uACA8 \uC801\uC5B4\uB77C(\uC804\uC0AC)**.

[\uC911\uC694]
- \uC704\uCABD **"\uC218\uC815 \uD76C\uB9DD \uC601\uC5ED"\uC758 \uBC30\uB108/\uD654\uBA74 \uCEA1\uCC98 \uC774\uBBF8\uC9C0(\uBC88\uD638 \u2460\u2461\u2462\u2463 \uD45C\uC2DC)\uB294 \uC644\uC804\uD788 \uBB34\uC2DC**\uD55C\uB2E4 \u2014 \uADF8\uAC74 \uC218\uC815 "\uC804" \uC61B \uD654\uBA74\uC774\uB77C \uC804\uC0AC\uD558\uC9C0 \uC54A\uB294\uB2E4.
- \uC544\uB798\uCABD "\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9"\uC758 \uBCC0\uACBD \uBAA9\uB85D\uB9CC \uC62E\uAE34\uB2E4: "\uD14D\uC2A4\uD2B8 \uC218\uC815", "\uB514\uC790\uC778 \uC218\uC815"(IMG \uD5E4\uB354 + \uC0C1\uD488\uBA85 \uD45C), "\uC0C1\uC790 \uBC0F \uC0BD\uC785\uC544\uC774\uCF58", "\uAC01 \uC544\uC774\uD15C\uC758 \uC0C1\uC138 \uAD6C\uC131"(\uC0C1\uC790\uBCC4 \uC5F4 \uD45C), "\uC77C\uC815 \uC218\uC815" \uB4F1.
- \uD45C\uB294 **\uC5B4\uB290 \uC0C1\uC790(\uC5F4)\uC5D0 \uC5B4\uB5A4 \uD56D\uBAA9(\uD589)\uC774 \uC788\uB294\uC9C0 \uC54C\uC544\uBCFC \uC218 \uC788\uAC8C** \uC62E\uAE34\uB2E4(\uC0C1\uC790\uBA85\uC744 \uBA38\uB9AC\uB85C, \uADF8 \uC544\uB798 \uD56D\uBAA9\uB4E4).
- \uC6D0\uBB38 \uADF8\uB300\uB85C \u2014 \uC624\uD0C8\uC790 \uAD50\uC815\xB7\uC694\uC57D\xB7\uCC3D\uC791 \uAE08\uC9C0.

[\u2605 \uBE68\uAC04\uC0C9 \uB300\uD45C \uC544\uC774\uCF58 \u2014 \uAC00\uC7A5 \uC911\uC694, \uC0C9\uC744 \uB611\uB611\uD788 \uBCF4\uACE0 \uD310\uB2E8]
- "\uC0C1\uC790 \uBC0F \uC0BD\uC785\uC544\uC774\uCF58 / \uAC01 \uC544\uC774\uD15C\uC758 \uC0C1\uC138 \uAD6C\uC131" \uD45C\uC5D0\uC11C, **\uAE00\uC790\uC0C9\uC774 \uBE68\uAC15(\uBD89\uC740) \uACC4\uC5F4\uB85C \uC778\uC1C4\uB41C \uD56D\uBAA9**\uC744 \uAC01 \uC0C1\uC790(\uC5F4)\uBCC4\uB85C \uCC3E\uC544\uB77C. \uAC80\uC815/\uD770\uC0C9/\uD68C\uC0C9 \uD56D\uBAA9\uC740 \uC81C\uC678, **\uBE68\uAC15\uC73C\uB85C \uAC15\uC870\uB41C \uAC83\uB9CC**.
- \uC774 \uBE68\uAC15 \uD56D\uBAA9\uB4E4\uC774 \uADF8 \uC0C1\uC790\uC758 "**\uB300\uD45C \uC544\uC774\uCF58**"\uC774\uB2E4. **\uD55C \uC0C1\uC790\uC5D0 \uBE68\uAC15\uC774 \uC5EC\uB7EC \uAC1C\uBA74 \uADF8 \uC804\uBD80\uAC00 \uB300\uD45C \uC544\uC774\uCF58** \u2014 \uD558\uB098\uB3C4 \uBE60\uB728\uB9AC\uC9C0 \uB9D0 \uAC83. (\uBE68\uAC15 4\uAC1C\uBA74 4\uAC1C \uC804\uBD80, \uCCAB \uBC88\uC9F8\uB9CC \uB123\uC9C0 \uB9D0 \uAC83.)
- \uCC3E\uC740 \uAC83\uC744 \uB450 \uACF3\uC5D0 \uB0A8\uACA8\uB77C: \u2460 transcript \uBCF8\uBB38 \uD574\uB2F9 \uD56D\uBAA9 \uB05D\uC5D0 [\uBE68\uAC15] \uD45C\uAE30, \u2461 **redItems \uBC30\uC5F4**\uC5D0 \uBE68\uAC15 \uD56D\uBAA9 **\uD558\uB098\uB2F9 \uD55C \uD56D\uBAA9\uC529** {box: \uC0C1\uC790 \uC0C1\uD488\uBA85, item: \uBE68\uAC15 \uD56D\uBAA9\uBA85} \uC73C\uB85C \uB123\uB294\uB2E4(\uC774 \uBC30\uC5F4\uC774 \uD575\uC2EC). \uAC19\uC740 \uC0C1\uC790\uC5D0 \uBE68\uAC15\uC774 4\uAC1C\uBA74 \uADF8 \uC0C1\uC790\uBA85\uC73C\uB85C redItems \uC5D0 **4\uAC1C \uD56D\uBAA9**\uC774 \uC0DD\uAE34\uB2E4.
- \uBE68\uAC15\uC774 \uD558\uB098\uB3C4 \uC5C6\uC73C\uBA74 redItems \uB294 \uBE48 \uBC30\uC5F4. \uC0C9\uC774 \uC560\uB9E4\uD558\uBA74 \uAC00\uC7A5 \uBE68\uAC15\uC5D0 \uAC00\uAE4C\uC6B4 \uD56D\uBAA9\uC744 \uB123\uB294\uB2E4.
- \uCD9C\uB825\uC740 {"transcript":"...\uC804\uC0AC...","redItems":[{"box":"...","item":"..."}]} JSON \uD558\uB098\uB9CC(\uCF54\uB4DC\uBE14\uB85D\xB7\uC124\uBA85 \uAE08\uC9C0).`;
}
function promoMergePrompt(prevJson, note = "") {
  return `${promoExtractionPrompt(note)}

[\u2605 2\uCC28 \uC218\uC815\uC694\uCCAD\uC11C \uBCD1\uD569 \uBAA8\uB4DC \u2014 \uAC00\uC7A5 \uC911\uC694]
\uC544\uB798 "\uAE30\uC874(\uC9C1\uC804 \uCC28\uC218) \uB370\uC774\uD130"\uB294 \uC774\uBBF8 \uD655\uC815\uB41C \uAC12\uC774\uB2E4. \uCCA8\uBD80/\uC785\uB825\uD55C \uC774\uBC88 \uCC28\uC218 \uC218\uC815\uC694\uCCAD\uC11C\uC5D0\uB294 \uBCF4\uD1B5 **\uC9C1\uC804 \uB300\uBE44 \uBCC0\uACBD\xB7\uCD94\uAC00\uB41C \uBD80\uBD84\uB9CC** \uB2F4\uACA8 \uC788\uB2E4.
- \uAE30\uC874 \uB370\uC774\uD130\uB97C **\uAE30\uC900(base)** \uC73C\uB85C \uC0BC\uC544, \uC774\uBC88 \uC694\uCCAD\uC11C\uC5D0\uC11C \uBC14\uB010/\uCD94\uAC00\uB41C \uD56D\uBAA9\uB9CC \uBC18\uC601\uD55C **\uC804\uCCB4 \uBCD1\uD569 \uACB0\uACFC**\uB97C \uCD9C\uB825\uD55C\uB2E4.
- \uC774\uBC88 \uC694\uCCAD\uC11C\uC5D0 \uC5B8\uAE09\uC774 \uC5C6\uB294 \uD56D\uBAA9\uC740 **\uAE30\uC874 \uAC12\uC744 \uADF8\uB300\uB85C \uC720\uC9C0**\uD55C\uB2E4(\uC784\uC758 \uC0AD\uC81C\xB7\uCD08\uAE30\uD654\xB7\uC7AC\uC791\uC131 \uAE08\uC9C0).
- \uC774\uBC88 \uC694\uCCAD\uC11C\uAC00 "\uC0AD\uC81C/\uC81C\uC678"\uB77C\uACE0 \uBA85\uC2DC\uD55C \uD56D\uBAA9\uB9CC \uC81C\uAC70\uD55C\uB2E4.
- popup(\uC77C\uC790\uBCC4 \uD45C)\xB7boxes\xB7milestones \uB4F1\uC740 \uAC19\uC740 \uC704\uCE58/\uAC19\uC740 \uD0A4\uB97C \uB36E\uC5B4\uC4F0\uACE0, \uC0C8 \uD56D\uBAA9\uC740 \uC54C\uB9DE\uC740 \uC790\uB9AC\uC5D0 \uCD94\uAC00\uD55C\uB2E4.
- \uB2E8, \uC774\uBC88 \uC694\uCCAD\uC11C\uAC00 \uC0C1\uD488 \uCE74\uB4DC("\uB514\uC790\uC778 \uC218\uC815"/\uC0C1\uD488 \uD45C)\uB97C **\uC0C8 \uC0C1\uD488\uB4E4\uB85C \uC804\uBA74 \uAD50\uCCB4**\uD558\uBA74, boxes\xB7slotIcons\xB7rollovers \uB97C \uADF8 \uD45C\uC758 \uC21C\uC11C\xB7\uC774\uB984\uB300\uB85C **\uC644\uC804\uD788 \uAD50\uCCB4**\uD55C\uB2E4(\uC774\uC804 \uCC28\uC218\uC758 \uC0C1\uD488\uBA85\xB7\uC544\uC774\uCF58\xB7\uB864\uC624\uBC84\uB97C \uC808\uB300 \uB0A8\uAE30\uC9C0 \uC54A\uB294\uB2E4). \uC0C8 \uC694\uCCAD\uC11C\uC5D0 \uC788\uB294 \uAC12\uB9CC \uC0AC\uC6A9\uD55C\uB2E4.
- \uBC18\uC601\uD55C \uBCC0\uACBD/\uCD94\uAC00/\uC0AD\uC81C \uB0B4\uC6A9\uC744 **changes \uBC30\uC5F4**\uC5D0 \uC0AC\uB78C\uC774 \uC77D\uC744 \uC218 \uC788\uAC8C \uD55C \uC904\uC529 \uC801\uB294\uB2E4(\uC608: "\uC0C1\uD4883 \uAC00\uACA9 4,000\u21925,000", "\uBCF4\uB108\uC2A45 \uAD50\uCCB4: \uB1CC\uCC9C\uC11D \uACB0\uC815\u2192\u2026", "7/8 \uC77C\uC790 \uCD94\uAC00").

[\uAE30\uC874(\uC9C1\uC804 \uCC28\uC218) \uB370\uC774\uD130]
${prevJson}`;
}

// src/apps/BriefStudio/prism/promoSchema.js
var strArr = { type: "array", items: { type: "string" } };
var TRANSCRIBE_SCHEMA = {
  type: "object",
  properties: {
    transcript: { type: "string" },
    // 상세구성/삽입아이콘 표에서 빨간색으로 인쇄된 항목 = 그 상자의 대표 아이콘.
    redItems: {
      type: "array",
      items: { type: "object", properties: { box: { type: "string" }, item: { type: "string" } }, required: ["box", "item"] }
    }
  },
  required: ["transcript"]
};
var PROMO_SCHEMA = {
  type: "object",
  properties: {
    meta: {
      type: "object",
      properties: {
        game: { type: "string" },
        // 게임명 (예: 블소 오상스)
        month: { type: "string" },
        // 대상 월 (예: 6월)
        title: { type: "string" },
        // 배너/페이지 타이틀 (예: 6월 오늘의 상품 스페셜)
        salePeriod: { type: "string" },
        // 판매 기간 원문
        rewardPeriod: { type: "string" }
        // 보상 수령 기간 원문
      }
    },
    // 상품 4칸 — 윗줄(top) / 아랫줄(name). 대표 아이콘 이름은 slotIcons 와 순서 일치.
    boxes: {
      type: "array",
      items: {
        type: "object",
        properties: { top: { type: "string" }, name: { type: "string" } },
        required: ["name"]
      }
    },
    slotIcons: strArr,
    // 상품 1~4번 대표 아이콘 이름 (boxes 순서와 1:1)
    // 카드 롤오버 1~4 — 각 카드의 구성품 목록
    rollovers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          card: { type: "string" },
          // "1" | "2" | "3" | "4"
          items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, count: { type: "string" } } } }
        },
        required: ["card"]
      }
    },
    // 보너스 5단계 마일스톤. magnify=돋보기(상세 팝업 연결) 표시.
    milestones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          threshold: { type: "string" },
          // 누적 신석 기준 (예 "5,000","10,000","40,000")
          magnify: { type: "boolean" }
          // 상세 팝업(돋보기) 연결 — 일부만 true
        },
        required: ["name"]
      }
    },
    // 전체상품 팝업 — 일자별 블록(날짜 + 상품|가격 행). 가격 0/무료는 "0".
    popupDays: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          // 예: "6월 25일 (목)"
          rows: { type: "array", items: { type: "object", properties: { name: { type: "string" }, price: { type: "string" } } } }
        },
        required: ["date"]
      }
    },
    // 개별 팝업 텍스트 — 타이틀/아이템명. key=ptxt 슬롯키(무기제목·천체조각제목·천체조각1명 등).
    popupTexts: {
      type: "array",
      items: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] }
    },
    // 공지/타이틀/기간 치환 — 슬롯 없는 고정문구 (이전→새).
    replacements: {
      type: "array",
      items: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } }, required: ["before", "after"] }
    },
    uncertain: strArr,
    // 불확실·확인 필요 항목
    changes: strArr
    // 2차 병합 시: 1차 대비 변경/추가/삭제 내역 (사람이 읽는 한 줄씩)
  },
  required: ["meta", "boxes", "milestones", "popupDays"]
};
var BOX_TOP_RE = /^(오늘의\s*선물\s*상자|화려한\s*결정)\s+(.+)$/;
function splitBoxName(top, name) {
  let t = String(top || "").trim();
  let nm = String(name || "").trim();
  if (!t && nm) {
    const m = nm.match(BOX_TOP_RE);
    if (m) {
      t = m[1].replace(/\s+/g, " ").trim();
      nm = m[2].trim();
    }
  }
  if (t && nm) {
    const st = t.replace(/\s+/g, "");
    let acc = "", cut = 0;
    for (let k = 0; k < nm.length && acc.length < st.length; k++) {
      cut = k + 1;
      if (!/\s/.test(nm[k])) acc += nm[k];
    }
    if (st && acc === st) {
      const rest = nm.slice(cut).trim();
      if (rest) nm = rest;
      else t = "";
    }
  }
  return { top: t, name: nm };
}
function formatIconPiece(piece) {
  const p = String(piece || "").trim();
  if (!p || p.includes("/")) return p;
  return p.replace(/\s+([\d][\d,]*\s*개)\s*$/, " / $1");
}
function toPluginJson(d) {
  d = d || {};
  const meta = d.meta || {};
  const cardPresets = {};
  (d.rollovers || []).forEach((r) => {
    if (!r || !r.card) return;
    cardPresets[String(r.card)] = (r.items || []).map((it) => it.count ? `${it.name} / ${it.count}` : it.name).filter(Boolean);
  });
  const popup = (d.popupDays || []).map((day) => [day.date, ...(day.rows || []).map((row) => `${row.name} | ${row.price != null && row.price !== "" ? row.price : "0"}`)].join("\n")).join("\n\n");
  const popupTexts = {};
  (d.popupTexts || []).forEach((t) => {
    if (t && t.key) popupTexts[t.key] = t.value || "";
  });
  return {
    version: "1.0",
    source: `${meta.game || "\uC624\uC0C1\uC2A4"} ${meta.month || ""} \uC624\uB298\uC758 \uC0C1\uD488 \uC2A4\uD398\uC15C`.trim(),
    salePeriod: meta.salePeriod || "",
    // 배너 slot/date 판매 기간
    rewardPeriod: meta.rewardPeriod || "",
    // 배너 slot/date 수령 기간
    boxes: (d.boxes || []).map((b) => {
      const s = splitBoxName(b && b.top, b && b.name);
      return s.top ? `${s.top} / ${s.name}` : s.name;
    }).filter(Boolean),
    // 대표 아이콘 구분자 정규화 — 모델이 한 슬롯의 여러 빨강 아이템을 <br>·줄바꿈으로 이어붙여 와도
    // 플러그인 buildSlotComposites 는 ' + ' 로만 분리해 여러 PNG 를 한 장으로 합성한다. 따라서 ' + ' 로 통일.
    // (쉼표는 "1,500개" 같은 개수와 충돌하므로 구분자로 쓰지 않음)
    slotIcons: (d.slotIcons || []).map((s) => String(s || "").replace(/<br\s*\/?>/gi, " + ").replace(/\s*[\n;]+\s*/g, " + ").replace(/\s*\+\s*/g, " + ").trim()).filter(Boolean).map((s) => s.split(" + ").map(formatIconPiece).filter(Boolean).join(" + ")),
    // 각 아이콘에 "이름 / 개수" 형식 적용
    // milestones: "보상명 / 조건(threshold) *" — 슬래시로 조건을 함께 실어야 플러그인이
    // milestone/cond(상단 [조건])까지 채운다. magnify(돋보기)는 끝의 " *". 조건 없으면 이름만.
    milestones: (d.milestones || []).map((m) => {
      if (!m || !m.name) return "";
      let line = m.name;
      if (m.threshold) {
        const th = String(m.threshold).trim();
        const cond = /누적/.test(th) ? th : `${th} \uB204\uC801 \uC2DC`;
        line = `${m.name} / ${cond}`;
      }
      if (m.magnify) line += " *";
      return line;
    }).filter(Boolean),
    cardPresets,
    popup,
    popupTexts,
    replacements: (d.replacements || []).filter((r) => r && r.before && r.after)
  };
}
function promoStats(d) {
  d = d || {};
  return {
    boxes: (d.boxes || []).length,
    milestones: (d.milestones || []).length,
    days: (d.popupDays || []).length,
    popupTexts: (d.popupTexts || []).length,
    replacements: (d.replacements || []).length,
    rollovers: (d.rollovers || []).length
  };
}
function groupRedItems(redItems) {
  const byBox = /* @__PURE__ */ new Map();
  for (const r of Array.isArray(redItems) ? redItems : []) {
    if (!r || !r.item) continue;
    const box = String(r.box || "?").trim();
    const it = String(r.item).trim();
    if (!it) continue;
    if (!byBox.has(box)) byBox.set(box, []);
    if (!byBox.get(box).includes(it)) byBox.get(box).push(it);
  }
  return [...byBox.entries()].map(([box, items]) => ({ box, items }));
}
function buildTranscriptSourceText({ transcript = "", redByBox = [], baseText = "" } = {}) {
  const redInfo = (redByBox || []).map(({ box, items }) => `${box} \u2192 ${(items || []).join(" + ")}`).join("\n");
  return [
    transcript,
    redInfo ? "[\uBD89\uC740\uC0C9 \uB300\uD45C \uC544\uC774\uCF58 (\uC0C1\uC790\u2192\uC544\uC774\uD15C)]\n" + redInfo : "",
    baseText ? "[\uCD94\uAC00 \uC785\uB825 \uD14D\uC2A4\uD2B8]\n" + baseText : ""
  ].filter(Boolean).join("\n\n");
}
function applyRedIconsToBoxes(out, redByBox) {
  if (!out || !Array.isArray(out.boxes) || !Array.isArray(redByBox) || !redByBox.length) return out;
  const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
  const slot = Array.isArray(out.slotIcons) ? out.slotIcons.slice() : [];
  out.boxes.forEach((b, i) => {
    const nm = norm(b && b.name);
    const full = norm(b && (b.top ? b.top + b.name : b.name));
    const hit = redByBox.find((rb) => {
      const k = norm(rb.box);
      if (!k) return false;
      return nm && (k.includes(nm) || nm.includes(k)) || full && (k.includes(full) || full.includes(k));
    });
    if (hit && hit.items && hit.items.length) slot[i] = hit.items.join(" + ");
  });
  out.slotIcons = slot;
  return out;
}

// src/apps/BriefStudio/prism/profiles/osangseu.js
var osangseuProfile = {
  key: "osangseu",
  label: "\uC624\uB298\uC758 \uC0C1\uD488 \uC2A4\uD398\uC15C (\uC624\uC0C1\uC2A4)",
  game: "\uBE14\uB808\uC774\uB4DC\uC564\uC18C\uC6B8",
  description: "\uC6D4\uAC04 \uC2A4\uD398\uC15C \uC0C1\uD488 4\uCE78 \xB7 \uB204\uC801 \uBCF4\uB108\uC2A4 5\uB2E8\uACC4 \xB7 \uC77C\uC790\uBCC4 \uC804\uCCB4\uC0C1\uD488 \uD31D\uC5C5 \xB7 \uB3CB\uBCF4\uAE30 \uC0C1\uC138 \uD31D\uC5C5. \uC624\uC0C1\uC2A4 Figma \uD50C\uB7EC\uADF8\uC778 JSON \uCD9C\uB825.",
  // 2단계 흐름: ① 전사(이미지/PDF → "반영 희망 내용" 텍스트 + 빨강 항목) ② 구조화 추출(전사 텍스트만, 이미지 미전달)
  stages: {
    transcribe: { prompt: () => transcribePrompt(), schema: TRANSCRIBE_SCHEMA, input: "image/pdf parts", note: "\uC61B \uCEA1\uCC98 \uBB34\uC2DC \xB7 \uBE68\uAC15 \uB300\uD45C \uC544\uC774\uCF58 \uC804\uBD80 redItems \uB85C" },
    extract: { prompt: (note = "") => promoExtractionPrompt(note), schema: PROMO_SCHEMA, input: "transcript text (+redItems)", note: "\uC2AC\uB86F \uAD6C\uC870 \uB9E4\uD551 \xB7 \uC6D0\uBB38 \uBCF4\uC874 \xB7 uncertain" },
    merge: { prompt: (prevJson, note = "") => promoMergePrompt(prevJson, note), schema: PROMO_SCHEMA, input: "prev data + \uC774\uBC88 \uCC28\uC218 \uC804\uC0AC", note: "2\uCC28 \uC774\uD6C4 \uC218\uC815\uC694\uCCAD\uC11C \uBCD1\uD569" }
  },
  toPluginJson,
  stats: promoStats,
  // 전사 → 추출 사이의 결정적 처리 (빨강 대표 아이콘). 앱 PromoSpecial 과 동일.
  groupRedItems,
  buildTranscriptSourceText,
  applyRedIconsToBoxes
};

// src/apps/BriefStudio/prism/profiles/index.js
var PRISM_PROFILES = { [osangseuProfile.key]: osangseuProfile };
var listPrismProfiles = () => Object.values(PRISM_PROFILES).map((p) => ({ id: p.key, label: p.label, game: p.game, description: p.description, stages: Object.keys(p.stages) }));
var getPrismProfile = (key) => PRISM_PROFILES[key] || null;

// src/apps/RenderMatrix/services/promptCompiler.js
var promptCompiler_exports = {};
__export(promptCompiler_exports, {
  buildFeelSummary: () => buildFeelSummary,
  calculateQualityScore: () => calculateQualityScore,
  compileChatGPT: () => compileChatGPT,
  compileEditChatGPT: () => compileEditChatGPT,
  compileEditMidjourney: () => compileEditMidjourney,
  compileEditNanoBanana: () => compileEditNanoBanana,
  compileLuma: () => compileLuma,
  compileMidjourney: () => compileMidjourney,
  compileNanoBanana: () => compileNanoBanana,
  compileRunway: () => compileRunway,
  compileSequence: () => compileSequence,
  compileVeo: () => compileVeo,
  generateEditIR: () => generateEditIR,
  generateIR: () => generateIR,
  generateMotionIR: () => generateMotionIR,
  getQualityFeedback: () => getQualityFeedback,
  performLogicAudit: () => performLogicAudit
});

// src/apps/RenderMatrix/constants/presets.js
var DIRECTOR_PERSONAS = [
  // shapeLockEn — 페르소나 지향이 글자 재설계를 유도하는 경우의 반박 지시.
  //   Cinematic("AAA game title"·"epic")과 Premium("structural perfection")은 모델이
  //   기본 이미지의 레터폼을 다시 그리게 만드는 주범 → 연출은 빛/재질에만 한정함을 명시.
  // mj_tags — "AAA game title aesthetic" 은 모델이 입력 레터폼을 게임 로고로 재설계하던 주범
  // (제국 황금 프리셋에서 확인) → "AAA 급 라이팅/재질 퀄리티" 로 의미를 연출 쪽에 한정.
  { id: "Cinematic", name: "\u{1F3AC} \uC2DC\uB124\uB9C8\uD2F1 \uB514\uB809\uD130", desc: "\uAC15\uD55C \uBA85\uC554, \uC11C\uC0AC\uC801\uC774\uACE0 \uBB35\uC9C1\uD55C \uD558\uC774\uC5D4\uB4DC \uC5F0\uCD9C", discipline: "MINDSET: 'Is this memorable and epic?' PRIORITY: 1. Visual Focus 2. Extreme Contrast 3. Heavy Metallic Feel.", mj_tags: "dramatic cinematic lighting, extreme cinematic contrast, punchy vibrant shading, emotional epic vibe, AAA blockbuster material and lighting quality applied to the original letterforms", shapeLockEn: "CRITICAL: the cinematic drama comes ONLY from lighting, material and contrast \u2014 NEVER from reshaping the letters. Keep the exact letterform silhouette of the input image, keep every serif, flourish, decorative detail and custom letterform quirk as-is. Do NOT restyle the typography into a different game-logo design", auditRules: { maxFx: "High", prefMaterial: "Metal", avoid: "Flat" } },
  { id: "Alchemist", name: "\u2697\uFE0F \uB9E4\uD14C\uB9AC\uC5BC \uC54C\uCF00\uBBF8\uC2A4\uD2B8", desc: "\uC7AC\uC9C8\uC758 \uBB3C\uB9AC\uC801 \uD2B9\uC131, \uD45C\uBA74 \uC9C8\uAC10 \uCD5C\uC6B0\uC120", discipline: "MINDSET: 'Does this look like a real, tangible substance?' PRIORITY: 1. Material Reality 2. Surface Density 3. Optical Reaction.", mj_tags: "insane micro-details, hyper-realistic material, macro photography style, extreme optical reaction, dense surface texture", auditRules: { maxFx: "Low", prefMaterial: "Complex", avoid: "None" } },
  { id: "DarkSmith", name: "\u2694\uFE0F \uB2E4\uD06C \uD310\uD0C0\uC9C0 \uB300\uC7A5\uC7A5\uC774", desc: "\uB2E4\uD06C \uD310\uD0C0\uC9C0, \uADF8\uC744\uB9B0 \uAE08\uC18D, \uC804\uD22C\uC758 \uD754\uC801", discipline: "MINDSET: 'Was this forged in the abyss?' PRIORITY: 1. Gritty Realism 2. Heavy Metal Focus 3. Battle-Forged Aesthetic on an ISOLATED standalone typography.", mj_tags: "dark fantasy aesthetic, heavy dark forged metal, battle-worn standalone emblem, scorched typography, gritty realism, abyssal energy, isolated cutout against pure black void", auditRules: { maxFx: "Mid", prefMaterial: "Gritty", avoid: "GlossyPlastic" } },
  // mj_tags — "structural perfection / clean edges / minimalist / sleek" 는 모델이 세리프·장식을
  // 노이즈로 해석해 산세리프로 단순화(고딕체화)하던 주범 → 표면 마감 어휘로 교체.
  { id: "Premium", name: "\u{1F48E} \uD074\uB9B0 \uD504\uB9AC\uBBF8\uC5C4", desc: "\uC5EC\uBC31, \uC808\uC81C\uB41C \uBE5B, \uC560\uD50C/\uB098\uC774\uD0A4\uD48D\uC758 \uACE0\uAE09\uAC10", discipline: "MINDSET: 'Is the FINISH flawless and elegant?' PRIORITY: 1. Shape Fidelity (original letterforms untouched) 2. Immaculate Surface Finish 3. Premium Luxury Material. FX MUST BE MINIMIZED.", mj_tags: "premium luxury surface finish, immaculate polished material, flawless noise-free rendering, elegant refined edge polish on the original letterforms, restrained lighting", shapeLockEn: "CRITICAL: premium refinement applies to surface finish ONLY \u2014 faithfully preserve the ORIGINAL letterforms of the input image exactly. Keep every serif, flourish and decorative detail as-is. Do NOT idealize, simplify, straighten the strokes, or convert the typography into a plain sans-serif font", auditRules: { maxFx: "None", prefMaterial: "Clean", avoid: "Rough" } },
  { id: "Tech", name: "\u{1F310} \uD4E8\uCC98 \uD14C\uD06C", desc: "\uD640\uB85C\uADF8\uB7A8\xB7\uB124\uC628\uC758 \uC815\uB3C8\uB41C \uBBF8\uB798\uAC10", discipline: "MINDSET: 'Is the technology precise and readable?' PRIORITY: 1. Exact Shape 2. Controlled Optical Color 3. Clean Edge Light.", mj_tags: "precise premium future-tech material finish applied only inside the original letterforms, controlled optical color, clean readable silhouette, no exterior haze", shapeLockEn: "CRITICAL: preserve the exact input letterforms and all counters; futuristic styling is limited to surface color and light only", auditRules: { maxFx: "Low", prefMaterial: "Clean", avoid: "Rough" } },
  { id: "Artifact", name: "\u{1F3FA} \uC544\uD2F0\uD329\uD2B8 \uD050\uB808\uC774\uD130", desc: "\uC804\uD1B5 \uC7AC\uB8CC\uC640 \uC218\uACF5\uC608 \uD45C\uBA74\uC758 \uD604\uC2E4\uAC10", discipline: "MINDSET: 'Does the material feel crafted and authentic?' PRIORITY: 1. Exact Shape 2. Material Truth 3. Restrained Craft Detail.", mj_tags: "authentic handcrafted material texture contained inside the original letterforms, restrained museum-grade lighting, exact clean silhouette", shapeLockEn: "CRITICAL: craft detail belongs on the surface only; never convert the letters into a signboard, plaque or emblem", auditRules: { maxFx: "None", prefMaterial: "Complex", avoid: "Glow" } },
  { id: "Clean", name: "\u{1F4D0} \uD50C\uB7AB \uADF8\uB798\uD53D", desc: "\uACF5\uC9C0\xB7\uCE90\uC8FC\uC5BC \uBC30\uB108\uC6A9 \uD3C9\uBA74\uC131\uACFC \uAC00\uB3C5\uC131", discipline: "MINDSET: 'Is it instantly readable at banner size?' PRIORITY: 1. Exact Shape 2. Flat Face 3. Clean Contrast.", mj_tags: "flat premium graphic finish on the exact original letterforms, simple clean contrast, crisp cut edges", shapeLockEn: "CRITICAL: keep the exact original silhouette; no added rear layers, backing, plaque or extrusion", auditRules: { maxFx: "None", prefMaterial: "Clean", avoid: "Depth" } },
  { id: "Playful", name: "\u{1F36C} \uCEEC\uB7EC \uD50C\uB808\uC774", desc: "\uCD95\uC81C\xB7\uBBF8\uB2C8\uAC8C\uC784\uC6A9 \uBC1D\uC740 \uCEEC\uB7EC\uC640 \uCE5C\uADFC\uD55C \uAD11\uD0DD", discipline: "MINDSET: 'Is it joyful and still readable?' PRIORITY: 1. Exact Shape 2. Color Clarity 3. Controlled Gloss.", mj_tags: "bright playful premium color and controlled glossy highlights contained inside the original letterforms, crisp silhouette", shapeLockEn: "CRITICAL: playful styling never changes, inflates or simplifies the original letterforms", auditRules: { maxFx: "Low", prefMaterial: "Glossy", avoid: "Gritty" } }
];
var RENDER_ENGINES = [
  { id: "Unreal", name: "\uC5B8\uB9AC\uC5BC \uC5D4\uC9C4 5 (\uC5D0\uD53D/\uAC8C\uC784)", en: "unreal engine 5 style, AAA-quality physically believable surface rendering" },
  { id: "Octane", name: "\uC625\uD14C\uC778 \uB80C\uB354 (\uC2E4\uC0AC/\uD06C\uB9AC\uC2A4\uD0C8)", en: "octane render, photorealistic, front-lit studio realism" },
  { id: "Redshift", name: "\uB808\uB4DC\uC2DC\uD504\uD2B8 (\uAD11\uACE0/\uD2B8\uB80C\uB514)", en: "redshift render, vibrant studio lighting, crisp reflections" },
  { id: "VRay", name: "\uBE0C\uC774\uB808\uC774 (\uCC28\uBD84/\uC2A4\uD29C\uB514\uC624)", en: "v-ray render, clean global illumination, realistic studio light" }
];
var PRESET_GROUPS_BASE = [
  {
    id: "gold",
    icon: "\u{1F7E1}",
    name: "\uD669\uAE08",
    presets: [
      { id: "gold_relic", label: "\uACE0\uB300 \uC720\uBB3C", settings: { directorPersona: "DarkSmith", material: "AntiqueGold", frontRelief: "MicroBevel", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "\uC218\uBC31 \uB144\uAC04 \uB545\uC5D0 \uBB3B\uD600\uC788\uB358 \uC9D9\uC740 \uC0B0\uD654\uC640 \uB179(Patina), \uAE68\uC9C4 \uBAA8\uC11C\uB9AC\uAC00 \uC0AC\uC2E4\uC801\uC73C\uB85C \uD45C\uD604\uB418\uB294 \uAC70\uCE60\uACE0 \uBB35\uC9C1\uD55C \uACE0\uB300 \uD669\uAE08." },
      { id: "gold_war", label: "\uC804\uD22C \uD754\uC801", settings: { directorPersona: "DarkSmith", material: "AntiqueGold", frontRelief: "MicroBevel", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "BattleDamage", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "\uC804\uC7C1\uC744 \uC218\uC5C6\uC774 \uACAA\uC5B4 \uCE7C\uC790\uAD6D, \uCC0D\uD798, \uC595\uC740 \uADE0\uC5F4\uC774 \uD45C\uBA74\uC5D0 \uAC70\uCE60\uAC8C \uB0A8\uC544 \uC788\uB294 \uB2E8\uB2E8\uD55C \uAE08\uC18D \uB369\uC5B4\uB9AC \uD615\uD0DC\uC758 \uD669\uAE08." },
      // surfaceDetail High + enableGlint — "미세하고 정교한 결이 명품처럼" 이라는 설명 대비
      // Standard/무광만으로는 정교함·금 광택이 안 살던 문제 보정.
      { id: "gold_holy", test: true, label: "\uC131\uC2A4\uB7EC\uC6B4 \uD669\uAE08", settings: { directorPersona: "Premium", material: "MatteGold", frontRelief: "HairlineBevel", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "None", rimThickness: "None", rimColor: "White", rimIntensity: "Subtle", projectionDepth: "None", cameraLens: "Standard", energyCore: "Sparkling", fxOrigin: "Overall", fxIntensity: "Subtle", enableGlint: true, background: "RealBlack", vfxPassMode: false }, description: "\uBBF8\uC138\uD558\uACE0 \uC815\uAD50\uD55C \uAE08\uC18D \uACB0(Micro-grain)\uC774 \uBA85\uD488\uCC98\uB7FC \uC0B4\uC544\uC788\uB294 \uC815\uC81C\uB41C \uC655\uC2E4 \uD669\uAE08. \uD2C8\uC5D0\uC11C \uC740\uC740\uD55C \uC2E0\uC131\uAD11\uC774 \uC0C8\uC5B4 \uB098\uC634." },
      { id: "gold_imperial", test: true, label: "\uC81C\uAD6D \uD669\uAE08", settings: { directorPersona: "Cinematic", material: "MatteGold", frontRelief: "MicroChiseled", surfaceDetail: "High", dramaticTex: "None", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Strong", background: "RealBlack", vfxPassMode: false }, description: "\uBBF8\uC138\uD55C \uC870\uAC01\uCE7C\uB85C \uC815\uBC00\uD558\uAC8C \uC138\uACF5\uB41C \uD45C\uBA74\uC774 \uBA85\uD488\uCC98\uB7FC \uC815\uAD50\uD558\uAC8C \uBE5B\uC744 \uBC18\uC0AC\uC2DC\uD0A4\uB294 \uB2E8\uB2E8\uD558\uACE0 \uBC00\uB3C4 \uB192\uC740 \uC81C\uAD6D\uC758 \uD669\uAE08." },
      { id: "gold_foil", test: true, label: "\uAE08\uBC15 \uC2A4\uD2F0\uCEE4", settings: { directorPersona: "Premium", material: "GoldFoil", frontRelief: "Flat", surfaceDetail: "Standard", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "White", rimIntensity: "Subtle", enableGlint: true, background: "RealBlack", vfxPassMode: false }, description: "\uACE0\uAE09 \uC778\uC1C4\uBB3C\uC758 \uD56B\uC2A4\uD0EC\uD551 \uAE08\uBC15 \uD3EC\uC77C \uC9C8\uAC10. \uC2A4\uD2F0\uCEE4\uCC98\uB7FC \uC587\uACE0 \uD3C9\uBA74\uC801\uC778 \uCEF7\uC774\uBA70, \uBBF8\uC138\uD558\uAC8C \uAD6C\uACA8\uC9C4 \uD3EC\uC77C \uACB0\uC774 \uBE5B\uC744 \uBC1B\uC544 \uAC70\uC6B8\uCC98\uB7FC \uBC18\uC9DD\uC785\uB2C8\uB2E4. \uAC00\uC7A5\uC790\uB9AC\uC5D0 \uC587\uC740 \uD558\uC774\uB77C\uC774\uD2B8 \uB77C\uC778." },
      { id: "gold_gilt", test: true, label: "\uB0A1\uC740 \uAE08\uBC15 (\uC131\uACBD\uCC45)", settings: { directorPersona: "Alchemist", material: "AgedGilt", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Macro", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "None", rimColor: "MutedGold", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "\uC131\uACBD\uCC45 \uD45C\uC9C0\uC5D0 \uB20C\uB7EC \uC785\uD78C \uC587\uC740 \uAE08\uBC15(\uAE38\uD2B8) \uB808\uD130\uB9C1. \uC138\uC6D4\uC5D0 \uAD11\uC774 \uC740\uC740\uD558\uAC8C \uC8FD\uACE0, \uBAA8\uC11C\uB9AC\uC640 \uD280\uC5B4\uB098\uC628 \uBD80\uBD84\uBD80\uD130 \uC0B4\uC9DD \uBC97\uACA8\uC838 \uC5B4\uB450\uC6B4 \uBC11\uBC14\uD0D5\uC774 \uBE44\uCE58\uB294 \uC624\uB798\uB41C \uAE08\uBC15 \uB290\uB08C." },
      { id: "gold_gilt_lift", test: true, label: "\uB0A1\uC740 \uAE08\uBC15 \xB7 \uB4E4\uB738", settings: { directorPersona: "Alchemist", material: "AgedGilt", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "FoilLift", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Macro", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "None", rimColor: "MutedGold", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "\uB0A1\uC740 \uAE08\uBC15\uC5D0\uC11C \uD3EC\uC77C\uC774 \uD45C\uBA74\uC5D0\uC11C \uC0B4\uC9DD \uB4E4\uB5A0 \uC77C\uC5B4\uB09C \uB290\uB08C. \uB4E4\uB72C \uAC00\uC7A5\uC790\uB9AC\uAC00 \uB9D0\uB824 \uC62C\uB77C\uAC00 \uBE5B\uC744 \uC608\uB9AC\uD558\uAC8C \uBC1B\uACE0, \uBC15 \uC544\uB798 \uACF5\uAE30\uCE35\xB7\uAE30\uD3EC\uC640 \uB5A8\uC5B4\uC9C0\uAE30 \uC9C1\uC804\uC758 \uC587\uC740 \uC870\uAC01\uB4E4\uC774 \uC811\uC0AC\uB85C \uC0B4\uC544\uC788\uB294 \uC9C8\uAC10." },
      { id: "gold_midnight", test: true, label: "\uBAA8\uB358 \uB2E4\uD06C \uACE8\uB4DC", settings: { directorPersona: "Cinematic", material: "MatteGold", frontRelief: "MicroBevel", surfaceTreatment: "BrushedMetal", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "MicroScratches", projectionDepth: "Shallow", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "Hairline", rimIntensity: "Strong", rimColor: "MutedGold", enableGlint: true, background: "RealBlack", vfxPassMode: false }, description: "\uC595\uC740 3D \uB3CC\uCD9C\uBD80(Shallow)\uB97C \uAC00\uC9C4 \uBB35\uC9C1\uD558\uACE0 \uBAA8\uB358\uD55C \uBB34\uAD11 \uACE8\uB4DC. \uC815\uBA74\uC740 \uC587\uAC8C \uAE4E\uC5EC \uC788\uC73C\uBA70, \uB0A0\uCE74\uB85C\uC6B4 \uC678\uACFD\uC120 \uD558\uC774\uB77C\uC774\uD2B8(Glint)\uAC00 \uACE0\uAE09\uC2A4\uB7EC\uC6B4 \uBB34\uAC8C\uAC10\uC744 \uC90D\uB2C8\uB2E4." }
    ]
  },
  {
    id: "steel",
    icon: "\u26AA",
    name: "\uAC15\uCCA0",
    presets: [
      { id: "steel_blade", test: true, label: "\uCE7C\uB0A0 \uAC15\uCCA0", settings: { directorPersona: "Cinematic", material: "HyperChrome", frontRelief: "HairlineBevel", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "\uB0A0\uCE74\uB86D\uAC8C \uBCBC\uB824\uB0B8 \uC804\uD22C\uC6A9 \uAC80\uC758 \uAE08\uC18D\uAC10. \uC608\uB9AC\uD55C \uCE7C\uAC01\uACFC \uD45C\uBA74\uC5D0 \uAC70\uCE5C \uC2A4\uD06C\uB798\uCE58, \uCC0D\uD798\uC774 \uC874\uC7AC\uD558\uC5EC \uC2E4\uC804 \uBB34\uAE30\uC758 \uAE34\uC7A5\uAC10\uC744 \uC90C." },
      { id: "steel_helm", test: true, label: "\uAE30\uC0AC \uD22C\uAD6C", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "MicroBevel", surfaceTreatment: "HammeredFinish", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "\uC804\uC7A5\uC744 \uB4B9\uAD70 \uB0A1\uC740 \uC7A5\uAC11\uD310 \uC7AC\uC9C8. \uB2E8\uC870\uB41C \uB9DD\uCE58 \uC790\uAD6D(Hammered)\uACFC \uC138\uC6D4\uC5D0 \uB9C8\uBAA8\uB41C \uBB35\uC9C1\uD558\uACE0 \uAC70\uCE5C \uAC15\uCCA0\uC758 \uB290\uB08C." },
      { id: "steel_heavy", test: true, label: "\uD5E4\uBE44 \uBE0C\uB7EC\uC2DC\uB4DC \uAC15\uCCA0", settings: { directorPersona: "Cinematic", material: "HyperChrome", frontRelief: "MicroBevel", surfaceTreatment: "BrushedMetal", surfaceDetail: "High", dramaticTex: "None", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "\uAC00\uB85C/\uC138\uB85C\uB85C \uAC70\uCE60\uAC8C \uC5F0\uB9C8\uB41C \uACF5\uC5C5\uC6A9 \uD5E4\uBE44 \uAE08\uC18D. \uC9C1\uC120\uC758 \uB0A0\uCE74\uB85C\uC6B4 \uBE0C\uB7EC\uC2DC \uACB0 \uC704\uC5D0 \uBBF8\uC138\uD55C \uC2A4\uD06C\uB798\uCE58\uB4E4\uC774 \uBC00\uB3C4 \uB192\uAC8C \uB36E\uC5EC\uC788\uB294 \uC9C8\uAC10." },
      { id: "steel_frost", test: true, label: "\uC11C\uB9BF\uBC1C \uAC15\uCCA0", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "MicroChiseled", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "ColdMist", fxOrigin: "BetweenLetters", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "\uCC28\uAC00\uC6B4 \uACF5\uAE30\uB97C \uBA38\uAE08\uC740 \uAC15\uCCA0 \uC7AC\uC9C8. \uC798\uAC8C \uCABC\uAC1C\uC9C4 \uD45C\uBA74 \uC704\uC5D0 \uCC28\uAC00\uC6B4 \uC11C\uB9AC\uAC00 \uB9FA\uD600 \uC788\uC73C\uBA70, \uAE00\uC790 \uC0AC\uC774\uB85C \uC740\uC740\uD55C \uB0C9\uAE30\uAC00 \uD750\uB984." },
      { id: "steel_hightech", test: true, label: "\uD558\uC774\uD14C\uD06C \uAE30\uD558\uD559 \uC2A4\uD2F8", settings: { directorPersona: "Cinematic", material: "PolishedSilver", frontRelief: "Crystalline", surfaceDetail: "Clean", dramaticTex: "GeometricMilling", wearLevel: "None", projectionDepth: "Shallow", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "Hairline", rimIntensity: "Subtle", rimColor: "Blue", enableGlint: true, enableVfx: false, enableShadow: true, background: "RealBlack", vfxPassMode: false }, description: "\uCC28\uAC00\uC6B4 \uD558\uC774\uD14C\uD06C \uD06C\uB86C \uAE08\uC18D\uC5D0 \uC815\uBC00\uD55C \uAE30\uD558\uD559\uC801 \uB2E4\uC774\uC544\uBAAC\uB4DC \uACA9\uC790 \uBB34\uB2AC\uAC00 \uC0C8\uACA8\uC9C4 \uC2A4\uD0C0\uC77C. \uC587\uC740 \uB450\uAED8\uAC10\uACFC \uB0A0\uCE74\uB85C\uC6B4 \uD06C\uB9AC\uC2A4\uD0C8 \uAC01\uC744 \uC720\uC9C0\uD558\uBA70, \uC740\uC740\uD55C \uBE14\uB8E8 \uB9BC\uB77C\uC774\uD2B8\uAC00 \uCC28\uAC00\uC6B4 \uB290\uB08C\uC744 \uC90D\uB2C8\uB2E4." },
      { id: "steel_mirror", test: true, label: "\uAC70\uC6B8 \uC5F0\uB9C8\uAC15", settings: { directorPersona: "Premium", material: "PolishedSilver", frontRelief: "Flat", surfaceTreatment: "Standard", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "None", rimIntensity: "Subtle", rimColor: "White", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uACE0\uAE09 \uC81C\uD488\uCC98\uB7FC \uB9E4\uB044\uB7FD\uAC8C \uACBD\uBA74 \uC5F0\uB9C8\uB41C \uBC1D\uC740 \uC2E4\uBC84 \uAC15\uCCA0. \uB113\uACE0 \uC720\uB824\uD55C \uBC18\uC0AC \uB760\uAC00 \uC815\uBA74\uC744 \uAC00\uB85C\uC9C0\uB974\uBA70 \uC2A4\uD06C\uB798\uCE58\uC640 \uC7A5\uC2DD\uC120 \uC5C6\uC774 \uAE68\uB057\uD55C \uAE08\uC18D \uAD11\uD0DD\uB9CC \uB0A8\uC2B5\uB2C8\uB2E4." },
      { id: "steel_blackoxide", test: true, label: "\uD751\uC0C9 \uC0B0\uD654\uAC15", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "Flat", surfaceTreatment: "Standard", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "Hairline", rimIntensity: "Subtle", rimColor: "Blue", enableGlint: false, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uAC80\uD478\uB978 \uC0B0\uD654 \uD53C\uB9C9\uC774 \uC785\uD600\uC9C4 \uCD1D\uAE30\xB7\uC815\uBC00 \uACF5\uAD6C \uACC4\uC5F4\uC758 \uAC15\uCCA0. \uBB34\uAD11\uC5D0 \uAC00\uAE4C\uC6B4 \uC9D9\uC740 \uD45C\uBA74 \uC704\uB85C \uC120\uD0DD\uC801\uC778 \uCCAD\uD68C\uC0C9 \uBC18\uC0AC\uB9CC \uB098\uD0C0\uB098\uB294 \uC808\uC81C\uB41C \uB2E4\uD06C \uBA54\uD0C8." },
      { id: "steel_damascus", test: true, label: "\uB2E4\uB9C8\uC2A4\uCEE4\uC2A4 \uC801\uCE35\uAC15", settings: { directorPersona: "Alchemist", material: "HyperChrome", frontRelief: "Flat", surfaceTreatment: "Standard", surfaceDetail: "High", dramaticTex: "Damascus", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimThickness: "None", rimIntensity: "Subtle", rimColor: "White", enableGlint: false, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uC11C\uB85C \uB2E4\uB978 \uAC15\uC7AC\uB97C \uBC18\uBCF5 \uC801\uCE35\uD558\uACE0 \uB2E8\uC870\uD574 \uB9CC\uB4E0 \uC720\uAE30\uC801\uC778 \uBB3C\uACB0\uBB34\uB2AC \uAC15\uCCA0. \uC740\uD68C\uC0C9\uACFC \uAC74\uBA54\uD0C8 \uCE35\uC774 \uAE00\uC790 \uB0B4\uBD80\uC5D0\uC11C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uD750\uB974\uBA70 \uCE7C\uB0A0 \uC18C\uC7AC \uD2B9\uC720\uC758 \uBC00\uB3C4\uAC10\uC744 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4." }
    ]
  },
  {
    id: "ice",
    icon: "\u{1F9CA}",
    name: "\uC5BC\uC74C",
    presets: [
      { id: "ice_glacier", test: true, label: "\uBE59\uD558 \uC218\uC815", settings: { directorPersona: "Alchemist", material: "IceCrystal", frontRelief: "Flat", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimColor: "Blue", rimIntensity: "Moderate", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uB9D1\uC740 \uCCAD\uBC31\uC0C9 \uBE59\uD558 \uC218\uC815\uC758 \uB0B4\uBD80 \uAD74\uC808\uACFC \uC595\uC740 \uACB0\uC815\uBA74\uB9CC \uC0B4\uB9B0 \uD3C9\uBA74\uD615 \uC5BC\uC74C. \uC678\uACFD \uC548\uAC1C\uC640 \uD6C4\uBA74 \uB3CC\uCD9C \uC5C6\uC774 \uD68D \uC548\uC5D0\uC11C \uAE4A\uC774\uAC10\uC774 \uBCF4\uC784." },
      { id: "ice_abyss", test: true, label: "\uC2EC\uC5F0 \uC5BC\uC74C", settings: { directorPersona: "Alchemist", material: "Obsidian", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimColor: "Blue", rimIntensity: "Moderate", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uC9D9\uC740 \uB0A8\uCCAD\uC0C9 \uD22C\uBA85 \uC5BC\uC74C \uC548\uCABD\uC5D0 \uAC00\uB294 \uCCAD\uBC31 \uADE0\uC5F4\uC774 \uD750\uB974\uB294 \uC2EC\uC5F0\uC758 \uC5BC\uC74C. \uAC80\uC740 \uBA74\uC774 \uD68D\uC744 \uC7A0\uC2DD\uD558\uC9C0 \uC54A\uB3C4\uB85D \uC911\uAC04\uD1A4\uACFC \uAC00\uC7A5\uC790\uB9AC \uBD84\uB9AC\uB97C \uAC15\uD654\uD568." },
      { id: "ice_relic", test: true, label: "\uC5BC\uC74C \uC720\uBB3C", settings: { directorPersona: "DarkSmith", material: "IceCrystal", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uC624\uB798\uB41C \uC11C\uB9AC\uCE35\uACFC \uC794\uADE0\uC5F4\uC774 \uD68D \uB0B4\uBD80\uC5D0\uB9CC \uB0A8\uC740 \uBE59\uACB0 \uC720\uBB3C. \uC678\uACFD \uB0C9\uAE30 \uC548\uAC1C \uB300\uC2E0 \uB9C8\uBAA8\uB41C \uC5BC\uC74C \uD45C\uBA74\uC758 \uC2DC\uAC04\uAC10\uC744 \uAC15\uC870\uD568." },
      { id: "ice_polar", test: true, label: "\uBD81\uADF9 \uD30C\uD3B8", settings: { directorPersona: "Cinematic", material: "IceCrystal", frontRelief: "Flat", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimColor: "Blue", rimIntensity: "Moderate", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uC120\uBA85\uD55C \uCCAD\uBC31\uC0C9 \uBD88\uD22C\uBA85 \uC5BC\uC74C\uACFC \uC587\uC740 \uC808\uB2E8\uBA74\uC744 \uAC00\uC9C4 \uBD81\uADF9 \uD30C\uD3B8. \uB450\uAEBC\uC6B4 \uBC1C\uAD11 \uBCA0\uBCA8\uC744 \uC904\uC5EC \uD615\uD0DC\uC640 \uCC28\uAC00\uC6B4 \uBC00\uB3C4\uB97C \uB610\uB837\uD558\uAC8C \uC720\uC9C0\uD568." },
      { id: "ice_glass", test: true, label: "\uD22C\uBA85 \uBE59\uC815", settings: { directorPersona: "Premium", material: "IceCrystal", frontRelief: "Flat", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimColor: "Blue", rimIntensity: "Subtle", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uAC70\uC758 \uBB34\uC0C9\uC5D0 \uAC00\uAE4C\uC6B4 \uACE0\uC21C\uB3C4 \uD22C\uBA85 \uBE59\uC815. \uB113\uACE0 \uAE68\uB057\uD55C \uB0B4\uBD80 \uAD74\uC808\uACFC \uC587\uC740 \uCCAD\uC0C9 \uAC00\uC7A5\uC790\uB9AC\uB9CC \uB0A8\uAE34 \uC815\uC81C\uB41C \uC720\uB9AC\uC5BC\uC74C." },
      { id: "ice_rime", test: true, label: "\uBC31\uC0C1 \uC131\uC5D0", settings: { directorPersona: "Alchemist", material: "IceCrystal", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uBBF8\uC138\uD55C \uBC31\uC0C9 \uC11C\uB9AC \uACB0\uC815\uC774 \uCD18\uCD18\uD788 \uC5C9\uAE34 \uBD88\uD22C\uBA85 \uC131\uC5D0. \uC720\uB9AC \uAD11\uD0DD\uBCF4\uB2E4 \uD3EC\uC2AC\uD55C \uACB0\uC815 \uC785\uC790\uC640 \uBB34\uAD11\uC758 \uB0C9\uAE30\uB97C \uAC15\uC870\uD568." },
      { id: "ice_jade", test: true, label: "\uCCAD\uC625 \uBE59\uD558", settings: { directorPersona: "Cinematic", material: "IceCrystal", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimColor: "Blue", rimIntensity: "Moderate", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uCCAD\uB85D\uACFC \uBE44\uCDE8\uC0C9 \uAD11\uBB3C\uCE35\uC774 \uAE4A\uAC8C \uBC34 \uACE0\uBC00\uB3C4 \uBE59\uD558. \uB0B4\uBD80\uC758 \uC0C9 \uB760\uC640 \uBBF8\uC138\uD55C \uAD11\uBB3C \uB0B4\uD3EC\uBB3C\uB85C \uB2E4\uB978 \uC5BC\uC74C\uACFC \uAD6C\uBD84\uB428." },
      { id: "ice_aurora", test: true, label: "\uC624\uB85C\uB77C \uC5BC\uC74C", settings: { directorPersona: "Premium", material: "IceCrystal", frontRelief: "Flat", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimColor: "Blue", rimIntensity: "Subtle", background: "RealBlack", enableGlint: true, enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uAE68\uB057\uD55C \uC5BC\uC74C \uB0B4\uBD80\uC5D0\uC11C \uCCAD\uB85D\xB7\uBCF4\uB77C \uC624\uB85C\uB77C\uC0C9\uC774 \uC587\uAC8C \uAC04\uC12D\uD558\uB294 \uBE59\uC815. \uD45C\uBA74\uC740 \uC815\uB3C8\uD558\uACE0 \uC0C9\uAD11\uC740 \uD68D \uB0B4\uBD80\uC5D0\uB9CC \uC81C\uD55C\uD568." }
    ]
  },
  {
    id: "lava",
    icon: "\u{1F30B}",
    name: "\uC6A9\uC554",
    presets: [
      { id: "lava_ember", test: true, label: "\uC6A9\uC554 \uB9E5", settings: { directorPersona: "DarkSmith", material: "VolcanicRock", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "GlowingVeins", wearLevel: "TimeWorn", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Edges", fxIntensity: "Subtle", rimColor: "Amber", rimIntensity: "Moderate", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uC911\uAC04 \uBA85\uB3C4\uC758 \uCC28\uCF5C \uD654\uC0B0\uC554 \uC548\uCABD\uC73C\uB85C \uAC00\uB294 \uC8FC\uD669\xB7\uC801\uC0C9 \uC6A9\uC554\uB9E5\uC774 \uD750\uB974\uB294 \uAE30\uBCF8\uD615. \uBD88\uADDC\uCE59\uD55C \uBC1D\uC740 \uC554\uC11D \uB2E8\uBA74\uC73C\uB85C \uC5B4\uB450\uC6B4 \uBC30\uACBD\uC5D0\uC11C\uB3C4 \uC2E4\uB8E8\uC5E3\uC744 \uC720\uC9C0\uD568." },
      { id: "lava_ashforge", test: true, label: "\uC5F4\uD654 \uAC15\uCCA0", settings: { directorPersona: "DarkSmith", material: "GothicSteel", frontRelief: "Flat", surfaceDetail: "Standard", dramaticTex: "MicroGrain", wearLevel: "MicroScratches", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Overall", fxIntensity: "Subtle", rimColor: "Amber", rimIntensity: "Moderate", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uAC80\uAC8C \uC2DD\uC740 \uB2E8\uC870 \uAC15\uCCA0 \uB0B4\uBD80\uC5D0 \uC794\uC5F4\uC774 \uB113\uAC8C \uBC30\uC5B4 \uC788\uB294 \uC5F4\uD654 \uAE08\uC18D. \uBD89\uC740 \uD6C4\uBA74 \uBAB8\uD1B5 \uB300\uC2E0 \uCCAD\uD68C\uC0C9 \uC815\uBA74\uACFC \uBD88\uADDC\uCE59\uD55C \uC5F4\uBCC0\uC0C9\uC744 \uAC15\uC870\uD568." },
      { id: "lava_core", test: true, label: "\uB9C8\uADF8\uB9C8 \uD575", settings: { directorPersona: "Cinematic", material: "VolcanicRock", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "GlowingVeins", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Overall", fxIntensity: "Moderate", rimColor: "Amber", rimIntensity: "Moderate", background: "RealBlack", enableVfx: false, enableShadow: false, vfxPassMode: false }, description: "\uAC80\uBD89\uC740 \uC554\uC11D \uAECD\uC9C8 \uC544\uB798 \uBC1D\uC740 \uD669\uBC31\uC0C9 \uB9C8\uADF8\uB9C8 \uD575\uC774 \uB113\uAC8C \uB4DC\uB7EC\uB098\uB294 \uACE0\uC5F4\uD615. \uC911\uC2EC\uC740 \uBC1D\uACE0 \uAC00\uC7A5\uC790\uB9AC\uB294 \uC2DD\uC740 \uC554\uC11D\uC73C\uB85C \uB300\uBE44\uB428." },
      { id: "fire_phoenix", test: true, label: "\uBD88\uC0AC\uC870 \uBD88\uAF43", settings: { directorPersona: "Cinematic", material: "Obsidian", frontRelief: "Flat", surfaceDetail: "Clean", dramaticTex: "GlowingVeins", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "Flame", fxOrigin: "Overall", fxIntensity: "Moderate", rimColor: "Amber", rimIntensity: "Strong", background: "RealBlack", enableVfx: true, enableShadow: false, vfxPassMode: false }, description: "\uD669\uAE08\uBE5B \uC911\uC2EC\uC5D0\uC11C \uC8FC\uD64D\uC0C9\uC73C\uB85C \uC774\uC5B4\uC9C0\uB294 \uBD88\uC0AC\uC870 \uD654\uC5FC\uC774 \uD68D \uB0B4\uBD80\uB97C \uB530\uB77C \uD750\uB974\uB294 \uBD88\uAF43\uD615. \uD070 \uD654\uC5FC \uB369\uC5B4\uB9AC \uC5C6\uC774 \uAC00\uB294 \uBD88\uAF43 \uACB0\uC744 \uC720\uC9C0\uD568." },
      { id: "fire_blue", test: true, label: "\uCCAD\uC5FC", settings: { directorPersona: "Alchemist", material: "Obsidian", frontRelief: "Flat", surfaceDetail: "Clean", dramaticTex: "GlowingVeins", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "Flame", fxOrigin: "Edges", fxIntensity: "Moderate", rimColor: "Blue", rimIntensity: "Strong", background: "RealBlack", enableVfx: true, enableShadow: false, vfxPassMode: false }, description: "\uD770 \uC911\uC2EC\uACFC \uCF54\uBC1C\uD2B8 \uBE14\uB8E8 \uC678\uACFD\uC744 \uAC00\uC9C4 \uACE0\uC628\uC758 \uCCAD\uC0C9 \uD654\uC5FC. \uAC80\uC740 \uC720\uB9AC\uC9C8 \uBC14\uD0D5 \uC704\uC5D0 \uC587\uACE0 \uB0A0\uCE74\uB85C\uC6B4 \uBD88\uAF43 \uD750\uB984\uB9CC \uBC30\uCE58\uD568." },
      { id: "lava_thunder", test: true, label: "\uB1CC\uC804 \uC6A9\uC554", settings: { directorPersona: "DarkSmith", material: "VolcanicRock", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "GlowingVeins", wearLevel: "TimeWorn", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "Electricity", fxOrigin: "Overall", fxIntensity: "Moderate", rimColor: "Amber", rimIntensity: "Moderate", background: "RealBlack", enableVfx: true, enableShadow: false, vfxPassMode: false }, description: "\uBD89\uC740 \uC6A9\uC554\uB9E5 \uC0AC\uC774\uC5D0 \uBC31\uCCAD\uC0C9 \uC804\uB958\uAC00 \uAD50\uCC28\uD558\uB294 \uD654\uC0B0\xB7\uBC88\uAC1C \uD63C\uD569\uD615. \uB450 \uC5D0\uB108\uC9C0 \uC0C9\uC744 \uAC00\uB294 \uB0B4\uBD80 \uADE0\uC5F4\uB85C \uBD84\uB9AC\uD574 \uAC00\uB3C5\uC131\uC744 \uC720\uC9C0\uD568." },
      { id: "lightning_storm", test: true, label: "\uD3ED\uD48D \uBC88\uAC1C", settings: { directorPersona: "Cinematic", material: "DarkTitanium", frontRelief: "Flat", surfaceDetail: "Clean", dramaticTex: "ExplosiveFracture", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "Electricity", fxOrigin: "BetweenLetters", fxIntensity: "Moderate", rimColor: "Blue", rimIntensity: "Strong", background: "RealBlack", enableVfx: true, enableShadow: false, vfxPassMode: false }, description: "\uBA39\uAD6C\uB984\uBE5B \uD2F0\uD0C0\uB284 \uC804\uBA74\uC5D0 \uBCF4\uB77C\xB7\uCCAD\uBC31 \uBC88\uAC1C\uAC00 \uD68D\uACFC \uAE00\uC790 \uC0AC\uC774\uB97C \uC9E7\uAC8C \uC5F0\uACB0\uD558\uB294 \uC21C\uC218 \uB1CC\uC804\uD615. \uC678\uBD80 \uBC88\uAC1C\uB294 \uC9E7\uACE0 \uC131\uAE30\uAC8C \uC81C\uD55C\uD568." },
      { id: "ember_ash", test: true, label: "\uC7BF\uBD88", settings: { directorPersona: "Alchemist", material: "VolcanicRock", frontRelief: "Flat", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "TimeWorn", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Edges", fxIntensity: "Subtle", rimColor: "Amber", rimIntensity: "Moderate", background: "RealBlack", enableVfx: true, enableShadow: false, vfxPassMode: false }, description: "\uD68C\uBC31\uC0C9 \uC7AC\uC640 \uC22F\uAC00\uB8E8\uB85C \uB36E\uC778 \uC911\uAC04 \uBA85\uB3C4\uC758 \uCC28\uCF5C \uD45C\uBA74 \uC544\uB798 \uC791\uC740 \uC8FC\uD64D\uC0C9 \uBD88\uC528\uAC00 \uB0A8\uC740 \uC800\uC628\uD615. \uBC1D\uC740 \uC7AC\uCE35\uACFC \uBD88\uADDC\uCE59\uD55C \uB9BC\uC73C\uB85C \uC5B4\uB450\uC6B4 \uBC30\uACBD\uC5D0\uC11C\uB3C4 \uD615\uD0DC\uAC00 \uBCF4\uC784." }
    ]
  },
  {
    id: "banner",
    icon: "\u{1F3F7}\uFE0F",
    name: "\uBC30\uB108",
    presets: [
      { id: "banner_season", label: "\uC2DC\uC98C \uBA54\uC778 \xB7 \uC2E4\uBC84 \uACE8\uB4DC", settings: { directorPersona: "Premium", material: "PolishedSilver", frontRelief: "RaisedRidge", surfaceTreatment: "Standard", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "StarGlints", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "MutedGold", rimIntensity: "Moderate", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uC2DC\uC98C\uBA85\xB7\uB300\uD615 \uC5C5\uB370\uC774\uD2B8\uC758 \uC8FC \uD0C0\uC774\uD2C0\uC6A9. \uD6C4\uBA74 \uB3CC\uCD9C \uC5C6\uC774 \uBC1D\uC740 \uC2E4\uBC84 \uC815\uBA74\uACFC \uC587\uC740 \uC6DC\uACE8\uB4DC \uC5E3\uC9C0\uB9CC \uC0AC\uC6A9\uD574 \uBCF5\uC7A1\uD55C KV \uC704\uC5D0\uC11C\uB3C4 \uACE0\uAE09\uC2A4\uB7FD\uACE0 \uC120\uBA85\uD558\uAC8C \uC77D\uD799\uB2C8\uB2E4." },
      { id: "banner_royal_update", label: "\uB300\uD615 \uC5C5\uB370\uC774\uD2B8 \xB7 \uB85C\uC5F4 \uACE8\uB4DC", settings: { directorPersona: "Cinematic", material: "SemiGlossGold", frontRelief: "MicroChiseled", surfaceTreatment: "Standard", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "White", rimIntensity: "Subtle", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uC2E0\uADDC \uD074\uB798\uC2A4\xB7\uD655\uC7A5\uD329\xB7\uB300\uD615 \uC5C5\uB370\uC774\uD2B8\uC6A9. \uD6C4\uBA74 \uBAB8\uD1B5 \uC5C6\uC774 \uC815\uBA74\uC758 \uC138\uBBF8\uAE00\uB85C\uC2A4 \uACE8\uB4DC\uC640 \uC815\uBC00 \uC138\uACF5\uB9CC\uC73C\uB85C \uADDC\uBAA8\uAC10\uACFC \uC548\uC815\uC801\uC778 \uAE00\uC790 \uD615\uD0DC\uB97C \uB9CC\uB4ED\uB2C8\uB2E4." },
      { id: "banner_dark", label: "\uB2E4\uD06C \uD310\uD0C0\uC9C0 \xB7 \uD751\uC694\uC11D", settings: { directorPersona: "DarkSmith", material: "DarkTitanium", frontRelief: "RaisedRidge", surfaceTreatment: "MultiFaceted", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "MicroScratches", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "DarkAura", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "BloodRed", rimIntensity: "Strong", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uB808\uC774\uB4DC\xB7\uBCF4\uC2A4\xB7\uD560\uB85C\uC708\uC6A9. \uD751\uC694\uC11D \uACC4\uC5F4 \uC815\uBA74\uC744 \uBC1D\uC740 \uAC74\uBA54\uD0C8 \uBC18\uC0AC\uB85C \uBCF4\uAC15\uD558\uACE0 \uC587\uC740 \uD608\uC0C9 \uC5E3\uC9C0\uB97C \uB458\uB7EC, \uC5B4\uB450\uC6B4 KV\uC5D0\uC11C\uB3C4 \uD68D\uACFC \uCE74\uC6B4\uD130\uAC00 \uC0AC\uB77C\uC9C0\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." },
      { id: "banner_silver_blue", label: "\uC2E0\uADDC \uC2DC\uC98C \xB7 \uC2E4\uBC84 \uBE14\uB8E8", settings: { directorPersona: "Premium", material: "PolishedSilver", frontRelief: "RaisedRidge", surfaceTreatment: "Standard", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "Blue", rimIntensity: "Moderate", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uC2E4\uBC84\uACE8\uB4DC\uC758 \uCC28\uAC00\uC6B4 \uBCC0\uC8FC. \uBC1D\uC740 \uC2E4\uBC84 \uC815\uBA74\uACFC \uC587\uC740 \uC544\uC774\uC2A4\uBE14\uB8E8 \uC5E3\uC9C0\uB85C \uC2E0\uADDC \uC2DC\uC98C\xB7\uC131\uC7A5\xB7\uAE30\uC220 \uD14C\uB9C8\uB97C \uAE68\uB057\uD558\uAC8C \uD45C\uD604\uD569\uB2C8\uB2E4." },
      { id: "banner_ivory_gold", label: "\uAE30\uB150 \uC774\uBCA4\uD2B8 \xB7 \uC544\uC774\uBCF4\uB9AC \uACE8\uB4DC", settings: { directorPersona: "Premium", material: "PearlEnamel", frontRelief: "HairlineBevel", surfaceTreatment: "Standard", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "MutedGold", rimIntensity: "Moderate", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uC8FC\uB144\xB7\uAC10\uC0AC\xB7\uC6E8\uB529\xB7\uCD95\uC81C\uC6A9. \uB530\uB73B\uD55C \uD384 \uC544\uC774\uBCF4\uB9AC \uC815\uBA74\uACFC \uC0F4\uD398\uC778 \uACE8\uB4DC \uC5E3\uC9C0\uB85C \uBD80\uB4DC\uB7FD\uACE0 \uACE0\uAE09\uC2A4\uB7EC\uC6B4 \uAC00\uB3C5\uC131\uC744 \uB9CC\uB4ED\uB2C8\uB2E4." },
      { id: "banner_crimson_gold", label: "\uBCF4\uC0C1 \uC774\uBCA4\uD2B8 \xB7 \uD06C\uB9BC\uC2A8 \uACE8\uB4DC", settings: { directorPersona: "Cinematic", material: "CrimsonEnamel", frontRelief: "RaisedRidge", surfaceTreatment: "Standard", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "MutedGold", rimIntensity: "Strong", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uCD9C\uC11D\xB7\uBCF4\uC0C1\xB7\uD56B\uB51C\xB7\uBA85\uC808\uC6A9. \uC120\uBA85\uD55C \uD06C\uB9BC\uC2A8 \uC5D0\uB098\uBA5C \uC815\uBA74\uACFC \uC587\uC740 \uACE8\uB4DC \uC5E3\uC9C0\uB85C \uC791\uC740 \uBC30\uB108\uC5D0\uC11C\uB3C4 \uC989\uC2DC \uC8FC\uBAA9\uB429\uB2C8\uB2E4." },
      { id: "banner_jade_gold", label: "\uB3D9\uC591 \uD310\uD0C0\uC9C0 \xB7 \uBE44\uCDE8 \uACE8\uB4DC", settings: { directorPersona: "Artifact", material: "JadeCeramic", frontRelief: "MicroChiseled", surfaceTreatment: "Standard", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "MutedGold", rimIntensity: "Moderate", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uB3D9\uC591\uD48D \uD074\uB798\uC2A4\xB7\uC9C0\uC5ED\xB7\uC218\uC9D1 \uC774\uBCA4\uD2B8\uC6A9. \uC605\uC740 \uBE44\uCDE8 \uC815\uBA74\uACFC \uC587\uC740 \uACE8\uB4DC \uC5E3\uC9C0\uAC00 \uC804\uD1B5\uC801\uC774\uBA74\uC11C\uB3C4 \uBC1D\uC740 \uC778\uC0C1\uC744 \uC720\uC9C0\uD569\uB2C8\uB2E4." },
      { id: "banner_aqua_silver", label: "\uC5EC\uB984 \uC774\uBCA4\uD2B8 \xB7 \uC544\uCFE0\uC544 \uC2E4\uBC84", settings: { directorPersona: "Premium", material: "AquaGlass", frontRelief: "HairlineBevel", surfaceTreatment: "Crystalline", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "White", rimIntensity: "Moderate", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uC5EC\uB984\xB7\uBC14\uB2E4\xB7\uC6CC\uD130\uD30C\uD06C \uC774\uBCA4\uD2B8\uC6A9. \uBD88\uD22C\uBA85 \uC544\uCFE0\uC544 \uCF54\uC5B4\uC640 \uC587\uC740 \uC2E4\uBC84\uD654\uC774\uD2B8 \uC5E3\uC9C0\uB85C \uD22C\uBA85\uD654 \uD6C4\uC5D0\uB3C4 \uB0B4\uBD80\uAC00 \uBE44\uAC70\uB098 \uC190\uC0C1\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }
    ]
  },
  {
    id: "variety",
    icon: "\u{1F3A8}",
    name: "\uB2E4\uC591\uD55C",
    presets: [
      { id: "variety_hologram", label: "\uBBF8\uB798 \uC774\uBCA4\uD2B8 \xB7 \uD640\uB85C\uADF8\uB7A8 \uD06C\uB86C", settings: { directorPersona: "Tech", material: "HolographicChrome", frontRelief: "HairlineBevel", surfaceTreatment: "Standard", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "White", rimIntensity: "Moderate", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uBBF8\uB798\xB7\uCF5C\uB77C\uBCF4\xB7\uC2E0\uAE30\uC220\uC6A9. \uC2E4\uBC84 \uD06C\uB86C \uC815\uBA74 \uC548\uC5D0\uB9CC \uC808\uC81C\uB41C \uD640\uB85C\uADF8\uB7A8 \uC0C9\uB760\uB97C \uB123\uC5B4 \uD654\uB824\uD558\uC9C0\uB9CC \uAE00\uC790 \uD615\uD0DC\uB294 \uB610\uB837\uD558\uAC8C \uC720\uC9C0\uD569\uB2C8\uB2E4." },
      { id: "variety_neon", label: "\uC0AC\uC774\uBC84 \uC774\uBCA4\uD2B8 \xB7 \uB124\uC628 \uAE00\uB77C\uC2A4", settings: { directorPersona: "Tech", material: "NeonGlass", frontRelief: "Flat", surfaceTreatment: "Standard", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "Blue", rimIntensity: "Strong", enableGlint: false, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uC0AC\uC774\uBC84\xB7PC\uBC29\xB7\uC57C\uAC04 \uC774\uBCA4\uD2B8\uC6A9. \uC678\uBD80 \uBC88\uC9D0 \uB300\uC2E0 \uD68D \uB0B4\uBD80\uC5D0\uB9CC \uC2DC\uC548\xB7\uB9C8\uC820\uD0C0 \uBC1C\uAD11 \uCC44\uB110\uC744 \uB123\uC5B4 \uD22C\uBA85 PNG\uC5D0\uC11C\uB3C4 \uC548\uC815\uC801\uC785\uB2C8\uB2E4." },
      { id: "variety_wood", label: "\uC804\uD1B5 \uC774\uBCA4\uD2B8 \xB7 \uB2E4\uD06C \uC6D4\uB11B \uBAA9\uAC01", settings: { directorPersona: "Artifact", material: "DarkWood", frontRelief: "MicroChiseled", surfaceTreatment: "Standard", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "Amber", rimIntensity: "Subtle", enableGlint: false, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uC804\uD1B5\xB7\uC0DD\uD65C\xB7\uC81C\uC791 \uC774\uBCA4\uD2B8\uC6A9. \uD68D\uC744 \uB530\uB77C \uD750\uB974\uB294 \uC6D4\uB11B \uACB0\uB9CC \uC0AC\uC6A9\uD558\uACE0 \uD6C4\uBA74 \uB098\uBB34\uD310\uC774\uB098 \uAC04\uD310 \uD615\uD0DC\uB294 \uB9CC\uB4E4\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." },
      { id: "variety_leather", label: "\uBAA8\uD5D8 \uC774\uBCA4\uD2B8 \xB7 \uC5E0\uBCF4\uC2A4 \uAC00\uC8FD", settings: { directorPersona: "Artifact", material: "EmbossedLeather", frontRelief: "RaisedEmboss", surfaceTreatment: "Standard", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "TimeWorn", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "MutedGold", rimIntensity: "Subtle", enableGlint: false, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uBAA8\uD5D8\uC77C\uC9C0\xB7\uC218\uC9D1\xB7\uC11C\uBD80 \uD14C\uB9C8\uC6A9. \uC9D9\uC740 \uC801\uAC08\uC0C9 \uAC00\uC8FD \uC815\uBA74\uACFC \uC587\uC740 \uD669\uB3D9 \uC5E3\uC9C0\uB85C \uB530\uB73B\uD55C \uBE48\uD2F0\uC9C0 \uC778\uC0C1\uC744 \uB0C5\uB2C8\uB2E4." },
      { id: "variety_paper", label: "\uCE90\uC8FC\uC5BC \uC774\uBCA4\uD2B8 \xB7 \uD398\uC774\uD37C \uCEF7", settings: { directorPersona: "Clean", material: "PaperCutout", frontRelief: "Flat", surfaceTreatment: "Standard", surfaceDetail: "High", dramaticTex: "MicroGrain", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "White", rimIntensity: "Subtle", enableGlint: false, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uCE90\uC8FC\uC5BC\xB7\uACF5\uC9C0\xB7\uCEE4\uBBA4\uB2C8\uD2F0\uC6A9. \uB530\uB73B\uD55C \uBC31\uC0C9 \uC885\uC774 \uC815\uBA74\uACFC \uC12C\uC138\uD55C \uC12C\uC720\uACB0\uB9CC \uB0A8\uAE34 \uD3C9\uBA74\uD615 \uD504\uB9AC\uC14B\uC785\uB2C8\uB2E4." },
      { id: "variety_candy", label: "\uCD95\uC81C \uC774\uBCA4\uD2B8 \xB7 \uCE94\uB514 \uB808\uC9C4", settings: { directorPersona: "Playful", material: "CandyResin", frontRelief: "RaisedDome", surfaceTreatment: "Standard", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Flat2D", cameraLens: "Telephoto", energyCore: "None", fxOrigin: "Edges", fxIntensity: "Subtle", rimThickness: "Hairline", rimColor: "White", rimIntensity: "Moderate", enableGlint: true, enableVfx: false, enableShadow: false, background: "RealBlack", vfxPassMode: false }, description: "\uCD95\uC81C\xB7\uBBF8\uB2C8\uAC8C\uC784\xB7\uCE90\uC8FC\uC5BC \uBCF4\uC0C1\uC6A9. \uCF54\uB784 \uCE94\uB514 \uB808\uC9C4\uC758 \uB0B4\uBD80 \uD558\uC774\uB77C\uC774\uD2B8\uB9CC \uC0B4\uB824 \uBC1D\uACE0 \uCE5C\uADFC\uD55C \uBCFC\uB968\uC744 \uB9CC\uB4ED\uB2C8\uB2E4." }
    ]
  }
];
var PRESET_STYLE_IDS = {
  banner_season: "BANNER-001",
  banner_royal_update: "BANNER-002",
  banner_dark: "BANNER-003",
  banner_silver_blue: "BANNER-004",
  banner_ivory_gold: "BANNER-005",
  banner_crimson_gold: "BANNER-006",
  banner_jade_gold: "BANNER-007",
  banner_aqua_silver: "BANNER-008",
  variety_hologram: "VARIETY-001",
  variety_neon: "VARIETY-002",
  variety_wood: "VARIETY-003",
  variety_leather: "VARIETY-004",
  variety_paper: "VARIETY-005",
  variety_candy: "VARIETY-006"
};
var PRESET_GROUPS2 = PRESET_GROUPS_BASE.map((group) => ({
  ...group,
  presets: group.presets.map((preset) => PRESET_STYLE_IDS[preset.id] ? { ...preset, styleId: PRESET_STYLE_IDS[preset.id] } : preset)
}));
var EDIT_BUDGETS = [
  { id: "Locked", name: "Locked (\uC678\uAD00\uB9CC \uCD5C\uC18C \uBCC0\uACBD)", en: "Conservative remix, strict shape lock, preserved exact typography" },
  { id: "Conservative", name: "Conservative (\uD45C\uBA74/\uBE5B \uC704\uC8FC)", en: "Balanced surface remix, strong shape retention" },
  { id: "Balanced", name: "Balanced (\uB0B4\uBD80/FX \uD655\uC7A5)", en: "Creative remix, moderate shape retention, enhanced internal structures" },
  { id: "Expressive", name: "Expressive (\uC5F0\uCD9C \uD655\uC7A5 \uC6B0\uC120)", en: "Expressive remix, flexible shape allowance for intense FX" }
];
var getOptionEn3 = (list, id) => list.find((o) => o.id === id)?.en || String(id);
var getOptionName2 = (list, id, dynamicNames = {}) => list.find((o) => o.id === id)?.name || dynamicNames[id] || String(id);

// src/apps/RenderMatrix/services/promptCompiler.js
var PERSONA_MOOD_KO = {
  Cinematic: "\uBB35\uC9C1\uD558\uACE0 \uADF9\uC801\uC778 \uBA85\uC554 \u2014 \uC2DC\uB124\uB9C8\uD2F1\uD55C \uBB34\uAC8C\uAC10",
  Alchemist: "\uC7AC\uC9C8\uC758 \uBB3C\uC131\uC774 \uC0B4\uC544\uC788\uB294 \uC0AC\uC2E4\uC801 \uC811\uC0AC \uBB34\uB4DC",
  DarkSmith: "\uADF8\uC744\uB9AC\uACE0 \uB2E8\uC870\uB41C \uB2E4\uD06C \uD310\uD0C0\uC9C0 \uBB34\uB4DC",
  Premium: "\uC808\uC81C\uB41C \uBE5B\uACFC \uD760 \uC5C6\uB294 \uB9C8\uAC10 \u2014 \uB7ED\uC154\uB9AC \uBB34\uB4DC"
};
var buildFeelSummary = (state, appOptions) => {
  const name = (list, id) => getOptionName2(list, id);
  const tex = state.dramaticTex !== "None" && state.dramaticTex !== "Auto" ? name(appOptions.dramaticTextures, state.dramaticTex) : null;
  const rim = state.rimColor !== "None" ? `${name(appOptions.rimColors, state.rimColor)} \uB9BC\uB77C\uC774\uD2B8(${name(appOptions.rimIntensities, state.rimIntensity)})` : null;
  const coreId = state.enableVfx ? state.energyCore === "None" ? "GoldenDust" : state.energyCore : "None";
  return {
    mood: PERSONA_MOOD_KO[state.directorPersona] || "",
    material: [name(appOptions.materials, state.material), name(appOptions.surfaceDetails, state.surfaceDetail), name(appOptions.wearLevels, state.wearLevel), tex].filter(Boolean).join(" \xB7 "),
    form: [name(appOptions.frontReliefs, state.frontRelief), name(appOptions.projectionDepths, state.projectionDepth)].filter(Boolean).join(" + "),
    lighting: [rim, state.enableGlint ? "\uBC18\uC0AC\uAD11 \uAE00\uB9B0\uD2B8" : null, state.enableShadow ? "\uBC14\uB2E5 \uADF8\uB9BC\uC790" : "\uADF8\uB9BC\uC790 \uC5C6\uC74C(\uD50C\uB85C\uD305)"].filter(Boolean).join(" \xB7 "),
    fx: coreId === "None" ? "\uC8FC\uBCC0 \uC774\uD399\uD2B8 \uC5C6\uC74C \u2014 \uAE68\uB057\uD55C \uCE94\uBC84\uC2A4" : `${name(appOptions.energyCores, coreId)} \xB7 ${name(appOptions.fxOrigins, state.fxOrigin)} \xB7 ${name(appOptions.fxIntensities, state.fxIntensity)}`,
    background: name(appOptions.backgrounds, state.background)
  };
};
var PERSONA_TONE = {
  Cinematic: {
    headlineKind: "epic cinematic typography graphic",
    subjectKind: "cinematic legendary logo",
    colorGrading: "cinematic color grading, dramatic contrast, deep rich blacks",
    remixTag: "cinematic remix",
    motionKind: "high-quality cinematic video"
  },
  Alchemist: {
    headlineKind: "hyper-realistic material study typography graphic",
    subjectKind: "macro material product emblem",
    colorGrading: "physically-based natural color, high tonal range, true-to-life palette, accurate optical reaction",
    remixTag: "material macro remix",
    motionKind: "high-quality macro material study video"
  },
  DarkSmith: {
    headlineKind: "dark fantasy forged typography graphic",
    subjectKind: "gritty dark fantasy battle emblem",
    colorGrading: "desaturated dark fantasy palette, brooding mood, deep shadow color grading, scorched warm undertones",
    remixTag: "dark fantasy forged remix",
    motionKind: "dark fantasy cinematic video"
  },
  // Premium 톤 — "editorial/minimalist" 는 모델이 세리프·장식을 걷어내고 산세리프로
  // 단순화(고딕체화)하는 방향으로 읽던 단어들 → 표면 마감 중심 표현으로 교체.
  Premium: {
    headlineKind: "premium luxury typography graphic",
    subjectKind: "luxury polished emblem",
    // "neutral tones / restrained palette" 는 금·보석 재질의 색을 탈색시키던 표현 →
    // 재질 고유색의 깊이를 존중하는 럭셔리 그레이딩으로 교체.
    colorGrading: "clean luxurious color grading, rich true-to-material color depth, high-key balance with deep shadow anchors, polished premium tonality",
    remixTag: "premium luxury remix",
    motionKind: "premium luxury video"
  }
};
var getTone = (personaId) => PERSONA_TONE[personaId] || PERSONA_TONE.Cinematic;
var FLAT_POSITIVE = "strictly flat letterform with zero extrusion depth, paper-thin profile, 2D surface only, no thickness, completely flat back face, razor-thin structure, front-face only rendering, zero rear depth, no 3D block, no side walls at all, no extrusion volume, flat planar surface, lighting strictly confined to the front face, nothing rendered behind the letterforms. Viewed perfectly straight-on, ONLY the front face of each letter is visible \u2014 no left or right side surfaces exist";
var FLAT_NEGATIVE = "(3d extrusion, rear depth, letter body thickness, block letters, visible side walls, extruded geometry:2.0), (deep letterpress, raised block, chunky 3d text:1.9), (lit or highlighted side planes, illuminated thickness, glowing chamfer, golden side faces:1.9)";
var FLAT_MJ_NEGATIVE = "3d extrusion, rear depth, letter body thickness, block letters, visible side walls, extruded geometry, deep letterpress, raised block, chunky 3d text, lit side planes, illuminated thickness, glowing chamfer, golden side faces";
var SCULPTED_RELIEF_IDS = ["MicroChiseled", "Crystalline", "DiamondPrism", "DeepVCarve", "ChunkyToy", "RaisedEmboss", "RaisedDome", "RaisedRidge"];
var FLAT_REAR_ONLY_POSITIVE = "zero rear extrusion depth, completely flat unlit back face, no side walls, no 3D block behind the letters, the letter body itself is razor-thin with no visible thickness \u2014 like the face of a minted coin: flat thin body, all depth carved into the front surface only (grooves, ridges, facets). Viewed perfectly straight-on, ONLY the front face of each letter is visible \u2014 the letters have no left or right side surfaces at all";
var FLAT_REAR_ONLY_NEGATIVE = "(3d extrusion, rear depth, visible letter body thickness, extruded letter body, 3d slab letters, visible side walls:2.0), (dark under-edge thickness:1.8), (lit or highlighted side planes, illuminated thickness, glowing chamfer, golden side faces:1.9)";
var FLAT_MJ_REAR_ONLY = "3d extrusion, rear depth, visible letter body thickness, extruded letter body, 3d slab letters, visible side walls, lit side planes, illuminated thickness, glowing chamfer, golden side faces";
var generateIR = (state, appOptions) => {
  const { directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, fxOrigin, fxIntensity, surfaceDetail, vfxPassMode, vfxPassOverlay, enableVfx, enableShadow } = state;
  const activeEnergyCore = enableVfx ? energyCore === "None" ? "GoldenDust" : energyCore : "None";
  const activeBackground = enableVfx ? "pure solid #000000 matte black void background, completely clean and uniform from corner to corner \u2014 no texture, no vignette, no gradient" : getOptionEn3(appOptions.backgrounds, background);
  const ir = {
    _meta: { version: "19.34", persona: DIRECTOR_PERSONAS.find((p) => p.id === directorPersona), complexityLevel: complexity },
    subject: { type: "typography graphic", scale: getOptionEn3(appOptions.typographyScales, typographyScale), fidelity_enforcement: "STRICT RULE: Use the input image as the exact structural reference. 95% shape preservation. EXACT ORIGINAL SILHOUETTE \u2014 same letterforms, same proportions, same spacing. NO TEXT MUTATION. NO extra letters. NO font substitution. Ensure high legibility.", intent: userIntent || null },
    // isFlat2D = 완전 평면 강제(razor-thin 코인) / isMinimal = 얇은 몸통 허용(원래 의미).
    camera_and_depth: { projectionId: projectionDepth, projection: getOptionEn3(appOptions.projectionDepths, projectionDepth), isFlat2D: projectionDepth === "Flat2D", isMinimal: projectionDepth === "None", lens: getOptionEn3(appOptions.cameraLenses, cameraLens) },
    surface_morphology: { reliefId: frontRelief, relief: getOptionEn3(appOptions.frontReliefs, frontRelief), treatment: getOptionEn3(appOptions.surfaceTreatments, surfaceTreatment), wear: getOptionEn3(appOptions.wearLevels, wearLevel) },
    material_stack: { base: getOptionEn3(appOptions.materials, material), intensity: getOptionEn3(appOptions.intensities, materialInt), internal_texture: dramaticTex === "Auto" ? "organically embedded dynamic textures" : getOptionEn3(appOptions.dramaticTextures, dramaticTex), surface_detail: getOptionEn3(appOptions.surfaceDetails, surfaceDetail), integration_rule: "Textures MUST be physically carved or etched INTO the base material. NO floating decals." },
    edge_and_lighting: {
      outline: rimThickness === "None" ? "strictly borderless, seamless organic edges, no outline" : `${getOptionEn3(appOptions.rimThicknesses, rimThickness)} using ${getOptionEn3(appOptions.materials, rimMaterial)}`,
      rim_light: rimColor === "None" ? "no artificial rim light" : `${getOptionEn3(appOptions.rimIntensities, rimIntensity)} ${getOptionEn3(appOptions.rimColors, rimColor)} ambient rim light organically wrapping the 3D surface edges, NOT a uniform line`,
      rimColorId: rimColor,
      glint: enableGlint ? "(sharp crisp metallic specular highlights mapped dynamically to the surface:1.35), polished reflective sweeps along raised edges, brilliant light catches on bevels" : "smooth balanced lighting without sharp glares",
      shadow: enableShadow
    },
    fx: { core: getOptionEn3(appOptions.energyCores, activeEnergyCore), origin: getOptionEn3(appOptions.fxOrigins, fxOrigin), intensity: getOptionEn3(appOptions.fxIntensities, fxIntensity), containment_rule: activeEnergyCore === "None" ? "No FX." : `Ensure FX is ${getOptionEn3(appOptions.fxIntensities, fxIntensity)} and ${getOptionEn3(appOptions.fxOrigins, fxOrigin)}. It MUST NOT overpower the main shape. All FX must stay tightly clustered around the typography and fade out completely BEFORE reaching the frame edges \u2014 the outer border of the canvas stays clean pure background.` },
    environment: { background: activeBackground, engine: RENDER_ENGINES.find((e) => e.id === renderEngine)?.en || RENDER_ENGINES[0].en },
    vfxPassMode,
    vfxPassOverlay: vfxPassMode ? !!vfxPassOverlay : false,
    typographyScale
  };
  if (vfxPassMode) {
    ir.subject.type = "pure pitch-black silhouette typography, holdout matte pass";
    ir.material_stack.base = "Vantablack, completely light-absorbing black hole material";
    ir.material_stack.internal_texture = "none, pure black flat void";
    ir.material_stack.integration_rule = "The text itself MUST be completely unlit and black (#000000). ONLY the surrounding FX should be visible. This is for alpha masking.";
    ir.edge_and_lighting.rim_light = "NO rim light on the text itself";
    ir.edge_and_lighting.glint = "ZERO specular highlights on the text";
    ir.surface_morphology.relief = "Flat 2D cutout silhouette";
  }
  return ir;
};
var generateEditIR = (state, appOptions) => {
  const { editBudget, activeEditIntents, cameraLens, frontRelief, editBg, editRearExtrusion, editIntent, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity, directorPersona } = state;
  const budgetLevel = EDIT_BUDGETS.find((b) => b.id === editBudget);
  const persona = DIRECTOR_PERSONAS.find((p) => p.id === directorPersona) || DIRECTOR_PERSONAS[0];
  const ir = {
    _meta: { mode: "Micro-Edit", version: "19.34", persona },
    locks: { glyph: "Strictly lock exact character types, sequence, and spacing.", contour: "Preserve original outer silhouette perfectly.", stroke: "Maintain exact stroke thickness and internal counter spaces." },
    budget: budgetLevel,
    camera: getOptionEn3(appOptions.cameraLenses, cameraLens),
    reliefId: frontRelief,
    constraints: {
      anti_mutation: "Do NOT reinterpret letters, do NOT add new text or watermarks. Render each line of text EXACTLY ONCE \u2014 NO duplicated title, NO text rendered twice, same line count as the base image.",
      fx_containment: "All FX MUST originate from surface cracks/edges and remain tightly bound to the shape. NO floating particles.",
      material_integration: "All textures/FX MUST be physically embedded into the base material. NO floating decals.",
      extrusionId: editRearExtrusion,
      extrusion: editRearExtrusion === "None" ? `[PROJECTION: MINIMAL] ${FLAT_POSITIVE}. Absolutely zero rear depth, NO 3D block, NO side walls.` : editRearExtrusion === "Shallow" ? "Allow ONLY very shallow thin backward 3D extrusion. NO thick blocks." : "Allow controlled backward 3D extrusion."
    },
    intents: activeEditIntents,
    details: {
      material: activeEditIntents.material ? `${getOptionEn3(appOptions.materials, editMaterial)}, ${getOptionEn3(appOptions.wearLevels, editWearLevel)}` : null,
      lighting: activeEditIntents.lighting ? `${getOptionEn3(appOptions.rimIntensities, editRimIntensity)} ${getOptionEn3(appOptions.rimColors, editRimColor)} rim light organically wrapping the edges, NOT a uniform line` : null,
      rimColorId: editRimColor,
      vfx: activeEditIntents.vfx ? `${getOptionEn3(appOptions.fxIntensities, editFxIntensity)} ${getOptionEn3(appOptions.energyCores, editEnergyCore)} originating from ${getOptionEn3(appOptions.fxOrigins, editFxOrigin)}` : null
    },
    customIntent: editIntent || "subtle surface enhancement",
    background: getOptionEn3(appOptions.backgrounds, editBg),
    vfxPassMode: editVfxPassMode
  };
  if (editVfxPassMode) {
    ir.constraints.vfx_pass = "Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. ZERO reflections, ZERO highlights. ONLY render the glowing FX surrounding this black void.";
  }
  return ir;
};
var generateMotionIR = (state, appOptions) => {
  const { cameraMotion, vfxDynamics, motionIntent, energyCore, directorPersona } = state;
  const persona = DIRECTOR_PERSONAS.find((p) => p.id === directorPersona) || DIRECTOR_PERSONAS[0];
  return {
    _meta: { mode: "Video-Motion", version: "19.34", persona },
    subject_lock: "CRITICAL: The main typography and object shapes MUST remain perfectly solid and absolutely static. DO NOT morph, warp, melt, or distort the text structural integrity.",
    motion: { camera: getOptionEn3(appOptions.cameraMotions, cameraMotion), dynamics: getOptionEn3(appOptions.motionDynamics, vfxDynamics) },
    customIntent: motionIntent || "",
    energyCore: getOptionEn3(appOptions.energyCores, energyCore)
  };
};
var performLogicAudit = (state) => {
  const issues = [];
  if (state.currentView === "editor") {
    const persona = DIRECTOR_PERSONAS.find((p) => p.id === state.directorPersona);
    if (persona.auditRules.maxFx === "None" && state.enableVfx) {
      issues.push({ code: "PERSONA_FX_CLASH", title: `[${persona.name}] \uB8F0 \uC704\uBC18: \uC774\uD399\uD2B8 \uACFC\uB2E4`, desc: "\uD604\uC7AC \uB514\uB809\uD130\uB294 \uC644\uBCBD\uD55C \uD615\uD0DC\uC640 \uC5EC\uBC31\uC744 \uC911\uC2DC\uD558\uBBC0\uB85C \uC8FC\uBCC0 \uC774\uD399\uD2B8\uB97C \uC5B5\uC81C\uD569\uB2C8\uB2E4.", options: [{ label: "A. \uC2DC\uC548 \uBAA8\uB4DC \uB044\uAE30", action: { enableVfx: false } }] });
    }
    if (state.vfxPassMode && !state.enableVfx) {
      issues.push({ code: "VFX_PASS_NO_FX", title: "\uC774\uD399\uD2B8 \uC18C\uC2A4 \uBD84\uB9AC \uBAA8\uB4DC \uCDA9\uB3CC", desc: "\uD0C0\uC774\uD3EC\uADF8\uB798\uD53C\uB97C \uBE14\uB799\uC544\uC6C3\uC2DC\uCF30\uC9C0\uB9CC, \uCD94\uCD9C\uD560 \uC8FC\uBCC0 \uD6A8\uACFC(VFX)\uAC00 \uAEBC\uC838\uC788\uC2B5\uB2C8\uB2E4.", options: [{ label: "A. \uC774\uD399\uD2B8 \uD65C\uC131\uD654", action: { enableVfx: true, energyCore: state.energyCore === "None" ? "MagmaEmbers" : state.energyCore } }, { label: "B. \uB9E4\uD2B8 \uD328\uC2A4 \uB044\uAE30", action: { vfxPassMode: false } }] });
    }
    if (state.typographyScale === "Dense" && (state.surfaceDetail === "High" || state.dramaticTex === "ExplosiveFracture")) {
      issues.push({ code: "DENSE_TEXT_NOISE", title: "\uAC00\uB3C5\uC131 \uC800\uD558 \uC704\uD5D8: \uB514\uD14C\uC77C \uACFC\uB2E4", desc: "\uC791\uAC70\uB098 \uBCF5\uC7A1\uD55C \uAE00\uC528\uC5D0 \uBBF8\uC138 \uC2A4\uD06C\uB798\uCE58\uB098 \uADE0\uC5F4\uC744 \uAC15\uD558\uAC8C \uB123\uC73C\uBA74 \uB80C\uB354\uB9C1\uC774 \uBB49\uAC1C\uC9C8 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", options: [{ label: "A. \uD45C\uBA74 \uB9E4\uB044\uB7FD\uAC8C", action: { surfaceDetail: "Standard", dramaticTex: "None" } }, { label: "B. \uB300\uD615 \uB85C\uACE0\uB85C \uAC04\uC8FC", action: { typographyScale: "Macro" } }] });
    }
  } else if (state.currentView === "edit") {
    if (state.editBudget === "Expressive" && state.editRearExtrusion === "None") {
      issues.push({ code: "EDIT_DEPTH_CONFLICT", title: "\uACFC\uD55C \uC5F0\uCD9C \uD655\uC7A5 + \uB3CC\uCD9C \uC81C\uD55C \uCDA9\uB3CC", desc: "\uC5F0\uCD9C\uC744 \uAC15\uD558\uAC8C \uB113\uD788\uBA74\uC11C(Expressive) \uD6C4\uBA74 \uB3CC\uCD9C\uC740 \uB9C9\uC73C\uBA74 \uC778\uACF5\uC9C0\uB2A5\uC774 \uD63C\uB780\uC744 \uACAA\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", options: [{ label: "A. \uC608\uC0B0 \uBCF4\uC218\uC801\uC73C\uB85C", action: { editBudget: "Conservative" } }, { label: "B. \uC785\uCCB4 \uD5C8\uC6A9", action: { editRearExtrusion: "Shallow" } }] });
    }
    if (state.editVfxPassMode && (!state.activeEditIntents.vfx || state.editEnergyCore === "None")) {
      issues.push({ code: "VFX_PASS_NO_FX", title: "\uC774\uD399\uD2B8 \uC18C\uC2A4 \uBD84\uB9AC \uBAA8\uB4DC \uCDA9\uB3CC", desc: "\uD0C0\uC774\uD3EC\uADF8\uB798\uD53C\uB97C \uBE14\uB799\uC544\uC6C3\uC2DC\uCF30\uC9C0\uB9CC, \uCD94\uCD9C\uD560 \uC8FC\uBCC0 \uD6A8\uACFC(VFX) \uB808\uC774\uC5B4\uAC00 \uD65C\uC131\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.", options: [{ label: "A. \uC774\uD399\uD2B8 \uD65C\uC131\uD654", action: { activeEditIntents: { ...state.activeEditIntents, vfx: true }, editEnergyCore: "GoldenDust" } }, { label: "B. \uC18C\uC2A4 \uBD84\uB9AC \uBAA8\uB4DC \uB044\uAE30", action: { editVfxPassMode: false } }] });
    }
  }
  return issues;
};
var calculateQualityScore = (state) => {
  let structure = 100, material = 90, visibility = 95, fxControl = 100;
  if (state.currentView === "editor") {
    if (state.projectionDepth === "Monumental") structure -= 25;
    else if (state.projectionDepth !== "None") structure -= 10;
    if (state.enableVfx && state.complexity === 3) fxControl -= 20;
    if (state.typographyScale === "Dense" && state.surfaceDetail === "High") visibility -= 20;
  } else if (state.currentView === "edit") {
    if (state.editBudget === "Expressive") structure = 70;
    else if (state.editBudget === "Balanced") structure = 85;
    else if (state.editBudget === "Locked") structure = 100;
    if (state.activeEditIntents.material) material = 95;
    if (state.activeEditIntents.vfx) fxControl = 80;
  } else if (state.currentView === "motion") {
    if (state.cameraMotion !== "Static") structure -= 15;
    if (state.vfxDynamics === "Turbulent") fxControl -= 30;
  }
  return {
    structure: Math.max(0, Math.min(100, structure)),
    material: Math.max(0, Math.min(100, material)),
    visibility: Math.max(0, Math.min(100, visibility)),
    fxControl: Math.max(0, Math.min(100, fxControl))
  };
};
var getQualityFeedback = (scores) => {
  const minScore = Math.min(scores.structure, scores.material, scores.visibility, scores.fxControl);
  if (minScore >= 90) return "\uD0C1\uC6D4\uD569\uB2C8\uB2E4. \uC548\uC815\uC801\uC774\uACE0 \uD004\uB9AC\uD2F0 \uB192\uC740 \uB80C\uB354\uB9C1\uC774 \uC608\uC0C1\uB429\uB2C8\uB2E4.";
  if (scores.structure === minScore) return "\uD615\uD0DC \uBCF4\uC874\uB825\uC774 \uBD88\uC548\uD569\uB2C8\uB2E4. '\uB3CC\uCD9C(Extrusion)'\uC744 \uC904\uC774\uAC70\uB098 \uD615\uD0DC\uB97C \uACE0\uC815\uD558\uC138\uC694.";
  if (scores.visibility === minScore) return "\uAC00\uC2DC\uC131\uC774 \uB0AE\uC2B5\uB2C8\uB2E4. \uAE00\uC528\uAC00 \uC791\uB2E4\uBA74 \uC2A4\uCF00\uC77C\uC744 \uBCC0\uACBD\uD558\uAC70\uB098 \uC870\uBA85\uC744 \uCD94\uAC00\uD558\uC138\uC694.";
  if (scores.fxControl === minScore) return "\uC774\uD399\uD2B8\uAC00 \uACFC\uD574 \uD615\uD0DC\uB97C \uAC00\uB9B4 \uC704\uD5D8\uC774 \uC788\uC2B5\uB2C8\uB2E4. \uC8FC\uBCC0 \uD6A8\uACFC\uB97C \uB0AE\uCD94\uC138\uC694.";
  if (scores.material === minScore) return "\uC7AC\uC9C8\uC774 \uB2E4\uC18C \uB2E8\uC870\uB86D\uAC70\uB098 \uC5B4\uC0C9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.";
  return "\uC124\uC815\uC744 \uB80C\uB354\uB9C1 \uC5D4\uC9C4\uC774 \uD574\uC11D\uD558\uAE30 \uC88B\uC740 \uC0C1\uD0DC\uB85C \uC720\uC9C0\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.";
};
var frontVolumeModifierFor = (reliefId) => {
  if (reliefId === "Flat") return "strictly flat front core without deep carving";
  if (reliefId === "MicroBevel") return "maintaining a flat core with only subtle edge bevels, NO deep carving";
  if (reliefId === "HairlineBevel") return "featuring a flat front with microscopic razor-thin edges";
  if (reliefId === "MicroChiseled") return "featuring densely micro-chiseled intricate cuts on the surface";
  if (reliefId === "RaisedEmboss") return "featuring raised flat-top emboss plateaus with crisp angled side slopes";
  if (reliefId === "RaisedDome") return "featuring smoothly domed convex raised letterforms";
  if (reliefId === "RaisedRidge") return "featuring a raised roof-like center ridge with a crisp apex line";
  if (reliefId === "EdgelessConcave") return "featuring a continuous edge-to-edge concave hollow without any outer borders";
  if (reliefId === "Crystalline") return "featuring sharp crystalline geometric facets and deep jewel-like cuts";
  if (reliefId === "DiamondPrism") return "featuring sharp prismatic V-carved angular facets with a prominent center ridge";
  if (reliefId === "DeepVCarve") return "featuring a sharp center ridge running along the strokes with deep V-carved inner facets";
  return "with balanced front volume";
};
var compileNanoBanana = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  const fxTag = ir.fx ? ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "" : "";
  if (isVFXPass) {
    const overlay = ir.vfxPassOverlay === true;
    const passDirective = overlay ? "the effects drift and pass FREELY IN FRONT of the black letterforms, crossing over the letter shapes \u2014 the black letters serve only as a position guide underneath the effects" : "the effects stay around and behind the letterforms \u2014 the black letters occlude any effect passing behind them (holdout matte)";
    const posTags2 = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, absolute flat 2d cutout, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", passDirective, ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""), fxTag, ir.environment.background, ir.environment.engine, ir.subject.intent].filter(Boolean).map((t) => t.trim()).join(", ");
    const negTags2 = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare", overlay ? "" : "(effects crossing in front of the letters:1.5)"].filter(Boolean).map((t) => t.trim()).join(", ");
    return `${posTags2}

Negative prompt: STRICTLY FORBIDDEN \u2014 the image must NOT contain any of the following: ${negTags2}`;
  }
  const scaleTag = ir.subject.scale;
  const lensTag = ir.camera_and_depth.lens;
  const hasSculptedRelief = SCULPTED_RELIEF_IDS.includes(ir.surface_morphology.reliefId);
  const projectionDesc = ir.camera_and_depth.isFlat2D ? hasSculptedRelief ? `It has absolutely no rear depth \u2014 completely flat back face, no side walls \u2014 BUT the front face is deeply carved: the front-face relief defines its entire dimensionality with real depth, ridges and internal shadows.` : `It is presented as a ${FLAT_POSITIVE}. The form has absolutely no rear depth \u2014 only the front face surface relief defines its dimensionality.` : ir.camera_and_depth.isMinimal ? `It has a solid but thin structural body with minimal side thickness \u2014 clearly front-facing, no deep rear extrusion, no heavy 3D block. The subtle natural thickness of a real object is allowed.` : ir.camera_and_depth.projectionId === "Shallow" ? "It is presented with only a very shallow front-face micro-depth \u2014 the rear face stays completely flat, unlit, and submerged in shadow. The sense of dimension comes from front-face bevel and lighting, NOT from rear extrusion. Absolutely zero rear 3D block." : "It is presented with bold 3D depth and rear extrusion.";
  const tone = getTone(ir._meta.persona.id);
  const prose = `An ${tone.headlineKind} rendered in a ${ir._meta.persona.name.split(" ")[1]} style. ${scaleTag}. ${lensTag}. The text is crafted from ${ir.material_stack.base} featuring ${ir.material_stack.internal_texture}. ${projectionDesc}`;
  const posTags = [
    prose,
    "masterpiece, best quality, ultra highres, insanely detailed, 8k resolution",
    "isolated standalone typography graphic, clear cutout text shape against background, highly legible",
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    // 프레이밍 가드 — 접사 줌/크롭으로 글자가 프레임 밖으로 잘리는 현상 방지.
    "(entire text fully inside the frame with safe margins:1.4), same framing and scale as the input image, no zoom-in",
    // 측면 그림자 지시는 돌출이 실제로 있을 때만 — 평면(Flat2D)에서 상시 주입하면 모델이
    // "어두운 돌출"을 만들기 위해 글자 뒤에 단색 오프셋 실루엣을 그리던 원인.
    ir.camera_and_depth.isFlat2D ? "" : ir.camera_and_depth.isMinimal ? "thin side edges fall into soft dark shadow, never brightly lit" : "deep shadowed side walls, dark unlit extrusion, heavy ambient occlusion on thickness",
    ir.subject.fidelity_enforcement.replace("STRICT RULE: ", ""),
    // 가중치 형태 락 — 무가중치 fidelity 문장만으로는 페르소나의 고밀도 연출 문맥
    // ("AAA game title"·"structural perfection")에 밀려 레터폼이 재설계되던 문제 보강.
    "(exact original letterform silhouette from the input image:1.5), (strict shape preservation lock:1.4), (same letter proportions and spacing as the input image:1.3)",
    // 디테일 보존 락 — 실루엣 보존만으로는 세리프·장식을 걷어내는 "산세리프화"가 그물을 빠져나감.
    "(preserve every serif, flourish and decorative detail of the original letterforms:1.45)",
    // 중복 렌더 차단 — image-to-image 에서 참조의 타이틀 줄을 한 번 더 그리는 현상 방지.
    // 무가중치 문장은 고밀도 연출 토큰에 밀려 무시되던 사례가 있어 가중치로 승격.
    "(single composition \u2014 each line of text rendered exactly once:1.5), (same line count and same text content as the input image:1.4), no additional copy of the title anywhere on the canvas",
    ir._meta.persona.shapeLockEn || "",
    ir._meta.persona.mj_tags.split(" --no ")[0],
    // 배경은 가중치로 — 무가중치일 땐 고가중치 재질 토큰이 배경 색까지 점령(금판化)하던 문제.
    `(${ir.environment.background}:1.4)`,
    ir.environment.engine,
    ir.subject.intent
  ];
  if (ir.edge_and_lighting.shadow) posTags.push("grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text");
  const negTags = [
    "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text, floating decal",
    "(duplicated or repeated text, any line rendered twice, extra copy of the title, mirrored or echoed text:1.8)",
    "(cropped or cut-off text, letters extending beyond the canvas, zoomed-in crop, extreme close-up:1.7)",
    "(redesigned or substituted font, altered proportions or spacing, simplified idealized letterforms, restyled logo:1.6)",
    "(sans-serif conversion, removed serifs or decorative details, straightened strokes:1.6)",
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together:1.5)",
    "(filigree, floral patterns, ornate engravings:1.5)",
    "(background plate, plaque, signboard, engraved on a wall, solid metal block background, framed box around text:1.9), text engraved on surface, shield, baseplate, flat paper cutout, flat 2d sticker, vector graphic",
    "(uniform stroke outline, even border thickness, artificial outline:1.9), cheap 3d effect, wordart, distorted stroke proportions, (low poly, messy bevel, crunchy artifacts:1.5)",
    "(photoshop bevel and emboss, cheap v-carve, uniform V-shape depth, inner shadow or inner stroke layer style, fake 2d deboss:1.9)",
    "disconnected or floating rim light, artificial halo, separated highlight, (messy edge blending:1.6)",
    "messy glow, background clutter",
    "(depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurry edges, smudged:1.9)",
    "(melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette:1.5)",
    "(circular brushing, radial metal grain, anisotropic reflection:1.5), curved scratches",
    ir.camera_and_depth.isFlat2D ? hasSculptedRelief ? FLAT_REAR_ONLY_NEGATIVE : FLAT_NEGATIVE : ir.camera_and_depth.isMinimal ? "(heavy extrusion, massive depth, thick 3d block, deep rear extrusion:1.8)" : ir.camera_and_depth.projectionId === "Shallow" ? "(thick extrusion, heavy 3d block, massive depth, deep rear extrusion, visible lit back face:1.9)" : ""
  ];
  if (ir.edge_and_lighting.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5), bright glow from below");
  if (!ir.edge_and_lighting.shadow) {
    posTags.push("floating perfectly without floor shadows, zero surface contact, no darkening of the background anywhere");
    negTags.push("(drop shadow, cast shadow, contact shadow, shadow or dark halo behind text, floor reflection, grounding shadow, darkened area under text:1.9)");
  }
  if (state.enableVfx) {
    posTags.push("(pure solid #000000 matte black background:1.5), background stays perfectly uniform black");
    negTags.push("(vignette:1.7), (background texture:1.6), (textured slate backdrop:1.6), (gradient background:1.6)");
    posTags.push("(all effects stay tightly clustered around the letterforms:1.4), fading out completely well before the frame edges, generous clean black margin along all four canvas borders");
    negTags.push("(effects touching the frame edges:1.7), (effects spreading across the whole canvas:1.6), (full-screen particle field:1.6), (edge-to-edge glow:1.6), (corner light flares:1.5)");
  }
  if (fxTag && state.fxIntensity === "Subtle") {
    posTags.push("(the effects are a quiet supporting accent for the typography's mood \u2014 barely visible, sparse, occupying only a small fraction of the canvas:1.4), the typography itself remains the absolute visual dominant");
    negTags.push("(dense particle field:1.7), (heavy thick effects:1.6), (effects covering large areas:1.6), (effects competing with the text:1.5), (strong bright glow:1.5), (abundant particles:1.5)");
  } else if (fxTag && state.fxIntensity === "Moderate") {
    negTags.push("(dense particle field:1.5), (effects overpowering the text:1.5)");
  }
  if (!state.enableVfx && ["RealBlack", "PureWhite", "ChromaGreen"].includes(state.background)) {
    const bgColorEn = state.background === "RealBlack" ? "pure solid #000000 matte black" : state.background === "PureWhite" ? "pure solid #FFFFFF white" : "pure solid #00FF00 chroma green";
    posTags.push(`(${bgColorEn} background:1.6), (perfectly uniform solid background, zero background gradient:1.4), background stays ${bgColorEn} from corner to corner, (strong color separation between the text material and the background:1.3)`);
    negTags.push("(vignette:1.7), (background gradient:1.7), (background texture:1.6), (spotlight falloff on background:1.6), (radial light on background:1.5), (smoky background:1.5), (dusty backdrop:1.5), (uneven background illumination:1.5)");
    negTags.push("(background sharing the text material color:1.8), (material color spreading into the background:1.7), (metallic backdrop:1.7), (gold background:1.7), (colored backdrop behind the text:1.5)");
    if (state.background === "RealBlack") negTags.push("(bright background:1.7), (white background:1.6), (warm-toned backdrop:1.5)");
    if (state.background === "PureWhite") negTags.push("(dark background:1.7), (black backdrop:1.6)");
  }
  if (hasSculptedRelief) {
    posTags.push("(the dimensional form exists strictly inside the letter strokes:1.4), background remains an untouched empty void");
    negTags.push("(carved background plate:1.9), (background filled with material:1.9), (relief slab behind the letters:1.8), (engraved backdrop:1.8)");
    const rid = ir.surface_morphology.reliefId;
    if (rid === "ChunkyToy") {
      posTags.push("(soft rounded chunky front volume with real depth:1.4), (inflated smooth surface transitions:1.3)");
    } else if (rid === "RaisedDome") {
      posTags.push("(smoothly domed convex letterforms with real raised depth:1.4), (polished metallic dome surface, coin-emboss precision:1.35)");
      negTags.push("(doughy toy-like puffiness:1.5), (clay-like organic sculpt:1.5)");
    } else if (rid === "MicroChiseled") {
      posTags.push("(dense small angular chisel-cut facets across the front face:1.45), (shallow low-relief depth with crisp flat cut planes:1.35), (clearly visible facet pattern \u2014 each cut face readable as a distinct plane with its own light value:1.3)");
      negTags.push("(deep carving:1.6), (thick puffy volume:1.6), (soft doughy surface:1.6), (clay-like organic sculpt:1.5), (blurred cut edges:1.5)");
    } else if (rid === "Crystalline") {
      posTags.push("(front face cut into many small flat crystalline facets:1.45), (fine gem-faceted micro-plane mosaic, each facet catching light at a different angle:1.4), (crisp facet borders, jewelry cutting precision:1.35)");
      negTags.push("(diagonal groove lattice:1.7), (cross-hatch carving:1.7), (diamond grid engraving:1.6), (deep V grooves:1.5), (soft doughy carving:1.6), (melted rounded facets:1.6), (blurred crease lines:1.5)");
    } else if (rid === "RaisedEmboss" || rid === "RaisedRidge") {
      posTags.push("(crisply raised letterforms with real emboss depth:1.45), (flat planes and slopes meeting at razor-sharp crease edges:1.4), (machined hard-surface precision, crisp specular breaks:1.35)");
      posTags.push("(strong tonal separation between adjacent planes, each plane one clean light value:1.35)");
      negTags.push("(soft doughy emboss:1.6), (melted rounded transitions:1.6), (clay-like organic sculpt:1.5), (blurred crease lines:1.5), (puffy inflated volume:1.5), (uniform flat shading across planes:1.4)");
    } else {
      posTags.push("(deep faceted front-face carving with real depth:1.45), (flat facet planes meeting at razor-sharp crease edges:1.4), (machined hard-surface precision, crisp specular breaks between facets:1.35)");
      negTags.push("(soft doughy carving:1.6), (melted rounded facets:1.6), (clay-like organic sculpt:1.5), (soft transitions between planes:1.5), (blurred crease lines:1.5), (puffy inflated volume:1.5)");
    }
    negTags.push("(completely flat front face:1.6), (featureless flat surface:1.5), (flat 2d sticker look:1.5), (missing carve depth:1.5)");
  }
  if (ir.camera_and_depth.isFlat2D) {
    negTags.push("(angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed:1.9)");
    negTags.push("(dark offset silhouette, solid extrusion shape or fake 3d backing behind the letters:1.8)");
    posTags.push(hasSculptedRelief ? `perfectly straight-on front facing view, dead center orthographic layout, ${FLAT_REAR_ONLY_POSITIVE}` : "perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition");
  } else if (ir.camera_and_depth.isMinimal) {
    posTags.push("straight-on front facing view, dead center, thin structural body with minimal natural side thickness");
    negTags.push("(extreme angled view, side view, tilt:1.5)");
  } else if (ir.camera_and_depth.projectionId === "Shallow") {
    posTags.push("straight-on front facing view, dead center, very shallow front-face micro-depth only, rear face flat and unlit, depth from front-face lighting not rear extrusion");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  } else {
    posTags.push("straight-on front facing view, dead center");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  }
  if (state.currentView === "editor" && !state.enableVfx) {
    negTags.push("(particle effects:1.9), (floating dust:1.9), (magic sparkles:1.9), (glowing embers:1.9), (smoke:1.9), (fog:1.9), (mist:1.9), (lens flare:1.9), (bloom:1.9), light leaks, fire, flames, glowing background");
  }
  if (ir.surface_morphology.reliefId !== "ChunkyToy") {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic toy balloon inflatable look, play-doh, marshmallow squishy, soft rounded bevels and blunt corners:1.6)");
  }
  if (["MicroBevel", "HairlineBevel", "Flat", "MicroChiseled"].includes(ir.surface_morphology.reliefId)) {
    negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (state.wearLevel === "None") negTags.push("(dirt specks, dark stains, grime spots, splatter marks, random black dots:1.6)");
  if (["SemiGlossGold", "PolishedGold", "GoldFoil", "HyperChrome", "PolishedSilver"].includes(state.material)) {
    posTags.push("(every notch, counter and recessed cut of the letterforms stays crisp and open:1.4)");
    negTags.push("(molten metal or reflections filling the letter gaps and notches, melted merged counters, smoothed-over details:1.6)");
  }
  if (state.typographyScale === "Dense") {
    posTags.push("clean legible typography, simplified readable shapes");
    negTags.push("(excessive noise, cluttered details, unreadable, chaotic textures:1.5)");
  }
  const darkMood = ir._meta.persona.id === "DarkSmith";
  posTags.push(darkMood ? `${tone.colorGrading}, rich deep colors` : `highly saturated, punchy vibrant colors, ${tone.colorGrading}, rich deep colors`);
  negTags.push(darkMood ? "(washed out, dull muddy colors:1.4), faded, grayscale" : "(washed out, desaturated, dull colors:1.5), faded, grayscale, (dark, underexposed, gloomy:1.5)");
  posTags.push("(uniform material application across every letter, consistent texture edge to edge:1.4), every letter fully rendered with identical treatment including the last characters, no letter left in darkness");
  negTags.push("(untextured or partially textured areas, material fading toward one side, unfinished last letters, letters swallowed by shadow:1.6)");
  posTags.push(`(dramatic directional lighting:1.4), clearly lit front face, ${ir.camera_and_depth.isFlat2D ? "" : "side thickness falls into deep shadow, "}preserve clean silhouette edges, flawless silhouette boundary, surface detail must not distort the outer contour, damage stays inside the front face only, clean and readable typography, (rich luminous midtones:1.3), (rich tactile material finish:1.4), (crisp sharp specular highlights:1.4), (high-end PBR physically-based shading:1.4), (strong material contrast:1.3), (deep tonal range, lustrous reflective surface, photorealistic material depth:1.4)`);
  const wearActive = state.wearLevel && state.wearLevel !== "None";
  posTags.push(hasSculptedRelief ? `(${ir.surface_morphology.relief}:1.4)` : ir.surface_morphology.relief, wearActive ? `(${ir.surface_morphology.wear}:1.35)` : "");
  if (wearActive) negTags.push("(flawless pristine untouched factory-new surface, showroom-perfect polish:1.5)");
  posTags.push(ir.edge_and_lighting.rim_light, ir.edge_and_lighting.glint, "texture physically embedded into material");
  if (fxTag) posTags.push(fxTag);
  if (state.surfaceDetail === "High") {
    posTags.push("(intense surface micro-details, fine hairline scratches, tactile material grain visible under raking light:1.45), dense refined micro-texture across the entire surface");
    negTags.push("(flat featureless surface, smooth plain material, blurry low-detail texture:1.5)");
  } else if (state.surfaceDetail === "Standard") {
    posTags.push(`(${ir.material_stack.surface_detail}:1.2)`);
  } else if (state.surfaceDetail === "Clean") {
    posTags.push("(perfectly smooth flawless pristine surface:1.3)");
    negTags.push("scratches, grunge, noise, dents, dust, imperfections, distressed surface");
  }
  posTags.push("(final rule \u2014 letterform shapes identical to the input image, restyle nothing:1.4)");
  return `${posTags.filter(Boolean).map((t) => t.trim()).join(", ")}

Negative prompt: STRICTLY FORBIDDEN \u2014 the image must NOT contain any of the following: ${negTags.filter(Boolean).map((t) => t.trim()).join(", ")}`;
};
var compileChatGPT = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  let depthStr = ir.camera_and_depth.projection;
  if (isVFXPass) {
    return `Create an epic masterpiece image based on the following exact specifications.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Constraint**: ${ir.subject.fidelity_enforcement}
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. The text itself must be an invisible black hole. ONLY render the glowing FX.
- **Layering**: ${ir.vfxPassOverlay ? "The effects drift and pass FREELY IN FRONT of the black letterforms, crossing over the letter shapes \u2014 the black letters are only a position guide underneath (front-layer compositing source)." : "The effects stay around and behind the letterforms \u2014 the black letters occlude effects passing behind them (holdout matte for behind-title compositing)."}

### 2. Surrounding VFX
- **FX Type**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."}
- **Rule**: ${ir.fx.containment_rule}

### 3. Environment
- **Canvas**: ${ir.environment.background}
- **Render Engine**: ${ir.environment.engine}`;
  }
  const cgSculpted = SCULPTED_RELIEF_IDS.includes(ir.surface_morphology.reliefId);
  if (ir.camera_and_depth.isFlat2D) depthStr = cgSculpted ? `CRITICAL RULE: Absolutely zero REAR depth \u2014 completely flat back face, NO 3D block, NO side walls, NO extruded geometry. The letter body itself is razor-thin with NO visible thickness. BUT the FRONT face MUST be deeply carved with MACHINED PRECISION: flat facet planes meeting at razor-sharp crease edges, crisp internal shadows inside the grooves, hard-surface exactness. NEVER soft, doughy, clay-like or melted transitions between planes. All dimensionality lives inside the front surface. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.` : `CRITICAL RULE: The typography must be a strictly flat letterform with zero extrusion depth and paper-thin profile. It is a 2D surface only with no thickness \u2014 completely flat back face, razor-thin structure, front-face only rendering. The outer contour reads as a flat 2D cutout shape. Absolutely zero rear depth, NO 3D block, NO side walls, NO extruded geometry, NO visible side planes, NO object thickness. All dimensionality must exist ONLY inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.`;
  else if (ir.camera_and_depth.projectionId === "Shallow") depthStr = `CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.`;
  const lensDirective = `
- **Lens & Perspective**: ${ir.camera_and_depth.lens}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let materialRule = ir.material_stack.integration_rule + " Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID cheap plastic, fake gold foil, or tacky over-shiny CGI look. Ensure extreme sharpness and elegant micro-details. The surface must not look chunky, blurry, or low-resolution. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. AVOID decorative filigree, floral patterns, or ornate engravings. Do NOT use fake inner shadow or inner stroke layer styles.";
  materialRule += " CRITICAL: Do NOT let transparent ice blend into the background. Do NOT let glowing lava melt or break the shape. High legibility is mandatory. Ensure strictly linear brushed patterns if brushed metal is used, NO circular or radial grain.";
  materialRule += " UNIFORM COVERAGE: Apply the material and texture EVENLY across every letter \u2014 the last characters, right side and bottom edges must receive exactly the same material treatment as the center. No untextured areas, no letters swallowed by shadow, no material fading toward one side.";
  if (ir.surface_morphology.reliefId !== "ChunkyToy") materialRule += " The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  if (state.surfaceDetail === "Clean") materialRule += " Ensure the surface is perfectly smooth and clean, absolutely NO scratches or grunge.";
  if (state.surfaceDetail === "High") materialRule += " Add INTENSE macro-photography-level micro-details: fine hairline scratches, tactile material grain visible under raking light, and dense refined micro-texture across the ENTIRE surface. The surface must never look flat, plain or blurry up close.";
  if (state.typographyScale === "Dense") materialRule += " VERY IMPORTANT: Because the text is dense/complex, prioritize legibility. Reduce excessive noise or overly deep fractures that might make the letters unreadable. Keep the boundaries crisp.";
  return `Create an epic masterpiece image based on the following exact specifications.

### 1. Core Directives
- **Type**: Isolated standalone typography graphic. ${ir.subject.scale}.
- **Vibe**: ${ir._meta.persona.discipline}
- **Constraint**: ${ir.subject.fidelity_enforcement}${ir._meta.persona.shapeLockEn ? ` ${ir._meta.persona.shapeLockEn}.` : ""} Render the composition EXACTLY ONCE \u2014 each line of text appears one single time, same line count as the input image. Absolutely NO duplicated title, NO text rendered twice.

### 2. Camera & Depth
- **Perspective**: ${depthStr}${lensDirective}
- **Front-Face Sculpting**: ${ir.surface_morphology.relief} with ${ir.surface_morphology.treatment}. CRITICAL: This describes the front-face carving of the isolated typography itself \u2014 it MUST NOT be interpreted as a relief carved onto a background wall, plaque, or solid slab. The text is a standalone graphic, not a relief mounted on a surface.

### 3. Layered Material Stack
- **Base Material**: ${ir.material_stack.base} (${ir.surface_morphology.wear})
- **Internal Texture**: ${ir.material_stack.internal_texture}
- **Color Grading**: ${getTone(ir._meta.persona.id).colorGrading}. Rich, naturally saturated colors with controlled highlights \u2014 avoid washed-out dullness, but EQUALLY avoid oversaturated neon harshness, blown-out contrast or HDR-like glare. Aim for physically-believable premium color depth. (Note: this model tends to over-boost saturation \u2014 keep it restrained and cinematic.)
- **Tone Stability**: ONE coherent lighting setup \u2014 a single key light with a soft fill, consistent light direction across the whole image. Balanced, stable exposure edge to edge: no HDR processing, no tone-mapped look, no crushed blacks or clipped highlights, stable midtones. The overall tone must read as one continuous photograph, not a composite of differently-lit parts.
- **Rule**: ${materialRule}

### 4. Lighting & VFX
- **Lighting**: Dramatic directional lighting. ${ir.camera_and_depth.isFlat2D ? "Clearly lit front face. There is NO side thickness at all \u2014 NEVER render dark side planes, offset silhouettes, or any solid dark shape behind the letters." : "Clearly lit front face, but any side thickness MUST fall into deep dark shadow. Avoid overlit side planes."} ${ir.edge_and_lighting.glint}. Add ${ir.edge_and_lighting.rim_light}. ${ir.edge_and_lighting.rimColorId === "None" ? "CRITICAL: Do not add any glowing underlight or bottom light." : ""} Ensure perfect exposure on the front, deep controlled shadows on the sides, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.
- **Optical Integration**: Edge highlights and rim lights MUST be physically integrated into the surface edges only. Strictly NO floating glow, detached halos, or separated stroke lines. Do NOT overexpose the side extrusions.
- **Edge/Outline**: ${ir.edge_and_lighting.outline}
- **Surrounding VFX**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."} ${ir.fx.containment_rule}
${state.currentView === "editor" && !state.enableVfx ? "- **VFX RULE**: Ensure absolutely ZERO particles, zero dust, zero smoke, and zero lens flares. Keep the background completely clean." : ""}

### 5. Environment
- **Canvas**: Maintain ${ir.environment.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.${!state.enableVfx && ["RealBlack", "PureWhite", "ChromaGreen"].includes(state.background) ? " The background MUST stay EXACTLY the specified color, perfectly uniform from corner to corner \u2014 absolutely NO vignette, NO gradient, NO texture, NO spotlight falloff. The background must NEVER share or borrow the text's material color (e.g. NO gold backdrop behind gold text \u2014 the text material exists ONLY inside the letterforms)." : ""}
- **Shadow**: ${ir.edge_and_lighting.shadow ? "MUST include grounded realistic drop shadow and cast shadows on the background canvas." : "ABSOLUTELY ZERO drop shadows. No cast shadows. No dark halo or ambient occlusion behind the text. No floor reflection. The text must appear to be floating with zero darkening of the background anywhere."}
- **Render Engine**: ${ir.environment.engine}
${ir.subject.intent ? `
### 6. Special Intent
- ${ir.subject.intent}` : ""}`;
};
var compileMidjourney = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  const fxPhrase = ir.fx ? ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "" : "";
  const intent = ir.subject.intent ? `, ${ir.subject.intent}` : "";
  if (isVFXPass) {
    const subject2 = ir.vfxPassOverlay ? `pure pitch-black silhouette typography, effects passing freely in front of and across the black letterforms, letters as position guide only` : `pure pitch-black silhouette typography, holdout matte pass, effects occluded behind the letterforms`;
    const lightingFx2 = `${fxPhrase}, ${ir.environment.background}`;
    const mjNegatives2 = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
    return `/imagine prompt: ${subject2}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx2} ${intent} ${mjNegatives2}--style raw --v 6.1`.replace(/\s+/g, " ").replace(/, ,/g, ",");
  }
  const lensTag = ir.camera_and_depth.lens;
  const mjTone = getTone(ir._meta.persona.id);
  const mjSculpted = SCULPTED_RELIEF_IDS.includes(ir.surface_morphology.reliefId);
  const mjFlat = ir.camera_and_depth.isFlat2D ? mjSculpted ? `${FLAT_REAR_ONLY_POSITIVE}, deep faceted front-face carving, flat facet planes meeting at razor-sharp crease edges, machined hard-surface precision, crisp internal shadows` : FLAT_POSITIVE : ir.camera_and_depth.projection;
  let subject = `${mjTone.subjectKind}, isolated standalone typography graphic, clear cutout text shape against background, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.subject.scale}, ${lensTag}, ${ir.subject.fidelity_enforcement}${ir._meta.persona.shapeLockEn ? `, ${ir._meta.persona.shapeLockEn}` : ""}, ${mjFlat}, ${ir.surface_morphology.relief}`;
  let detailTag = "";
  if (state.surfaceDetail === "Clean") detailTag = "perfectly smooth flawless clean surface, ";
  else if (state.surfaceDetail === "High") detailTag = "intense macro-level surface micro-details, fine hairline scratches, tactile material grain under raking light, dense refined micro-texture, ";
  const materialMood = `${ir._meta.persona.discipline}, ${ir._meta.persona.mj_tags}, highly saturated, punchy vibrant colors, ${detailTag}${ir.material_stack.base} material with ${ir.material_stack.internal_texture}, ${ir.surface_morphology.wear} surface, uniform material coverage across every letter edge to edge, no letter left untextured or in darkness`;
  let lightingFx = `${fxPhrase}, (dramatic directional lighting:1.4), ${ir.camera_and_depth.isFlat2D ? "clearly lit front face, no side walls at all, nothing rendered behind the letterforms" : ir.camera_and_depth.isMinimal ? "clearly lit front face, thin side edges in soft dark shadow" : "clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion"}, ${ir.edge_and_lighting.outline}, ${ir.edge_and_lighting.rim_light}, (physically attached crisp specular highlights:1.4), ${ir.edge_and_lighting.glint}, deep controlled shadows, clean high-value highlights, (strong material contrast:1.3), (high-end PBR physically-based shading, lustrous reflective surface, photorealistic material depth:1.4), ${ir.environment.background}`.replace(/^,\s*/, "");
  if (ir.edge_and_lighting.shadow) lightingFx += ", grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text";
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, floating effects, background clutter, text mutation, extra letters, duplicated text, repeated title, text rendered twice, stacked duplicate lines, altered silhouette, redesigned letterforms, different font, sans-serif conversion, removed serifs, stripped decorative details, idealized letter shapes, random text, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, filigree, floral patterns, decorative ornaments, ornate engravings, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, flat paper cutout, flat 2d sticker, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
  if (ir.edge_and_lighting.rimColorId === "None") mjNegatives += "bottom light, underglow, colored rim light, bright glow from below, ";
  if (!ir.edge_and_lighting.shadow) {
    subject += ", floating perfectly without floor shadows, zero darkening of the background";
    mjNegatives += "drop shadow, cast shadow, contact shadow, drop shadow on background, shadow behind text, dark halo around text, floor reflection, grounding shadow, ";
  }
  if (state.enableVfx) {
    subject += ", pure solid black uniform background, all effects tightly clustered around the letterforms and fading out well before the frame edges";
    mjNegatives += "vignette, background texture, gradient background, textured slate backdrop, effects touching the frame edges, full-screen particle field, edge-to-edge glow, ";
  }
  if (fxPhrase && state.fxIntensity === "Subtle") {
    subject += ", the effects are only a quiet sparse accent \u2014 the typography stays the absolute visual dominant";
    mjNegatives += "dense particle field, heavy effects, effects covering large areas, abundant particles, ";
  }
  if (!state.enableVfx && ["RealBlack", "PureWhite", "ChromaGreen"].includes(state.background)) {
    subject += ", perfectly uniform solid background color exactly as specified, zero background gradient, text material exists only inside the letterforms";
    mjNegatives += "vignette, background gradient, background texture, spotlight falloff, radial light on background, smoky background, metallic backdrop, gold background, background sharing the text material color, ";
  }
  if (ir.camera_and_depth.isFlat2D) {
    subject += mjSculpted ? `, perfectly straight-on front facing view, dead center orthographic layout, ${FLAT_REAR_ONLY_POSITIVE}` : `, perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition, ${FLAT_POSITIVE}`;
    mjNegatives += `angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, ${mjSculpted ? `${FLAT_MJ_REAR_ONLY}, completely flat front face, missing carve depth` : FLAT_MJ_NEGATIVE}, `;
  } else if (ir.camera_and_depth.isMinimal) {
    subject += ", straight-on front facing view, dead center, thin structural body with minimal natural side thickness";
    mjNegatives += "heavy 3d block, massive depth, deep rear extrusion, extreme angled view, side view, tilt, ";
  } else if (ir.camera_and_depth.projectionId === "Shallow") {
    subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
    mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, ";
  } else {
    subject += ", straight-on front facing view, dead center";
    mjNegatives += "extreme angled view, side view, tilt, ";
  }
  if (state.currentView === "editor" && !state.enableVfx) mjNegatives += "particle effects, floating dust, magic sparkles, glowing embers, smoke, fog, mist, lens flare, bloom, light leaks, fire, flames, glowing background, ";
  if (ir.surface_morphology.reliefId !== "ChunkyToy") {
    lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
    mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, ";
  }
  if (ir.camera_and_depth.isFlat2D || ir.camera_and_depth.isMinimal) mjNegatives += "heavy 3d block, perspective depth, deep rear extrusion, isometric, angled view ";
  if (state.surfaceDetail === "Clean") mjNegatives += "scratches, grunge, noise, dents, dust, imperfections ";
  if (state.typographyScale === "Dense") mjNegatives += "excessive noise, cluttered details, unreadable, chaotic textures ";
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (["MicroBevel", "HairlineBevel", "Flat", "MicroChiseled"].includes(ir.surface_morphology.reliefId)) mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  return `/imagine prompt: ${subject}, ${materialMood}, ${lightingFx}, ${ir.environment.engine}, perfectly exposed, vivid, highly detailed${intent} ${mjNegatives}--style raw --v 6.1`.replace(/\s+/g, " ").replace(/, ,/g, ",");
};
var compileEditNanoBanana = (ir, state) => {
  if (ir.vfxPassMode) {
    const posTags2 = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", ir.details.vfx || "", ir.background, ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : ""].filter(Boolean).map((t) => t.trim()).join(", ");
    const negTags2 = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"].filter(Boolean).map((t) => t.trim()).join(", ");
    return `${posTags2}

Negative prompt: STRICTLY FORBIDDEN \u2014 the image must NOT contain any of the following: ${negTags2}`;
  }
  const editTone = getTone(ir._meta?.persona?.id);
  const isFlatEdit = ir.constraints.extrusionId === "None";
  const frontVolumeModifier = frontVolumeModifierFor(ir.reliefId);
  const projectionTag = isFlatEdit ? `${FLAT_POSITIVE}, (preserve the original dimensionality and front-face relief of the base image exactly:1.4), do NOT add new carving, bevels, embossing or surface sculpting` : `allow 3d extrusion, ${frontVolumeModifier}`;
  const posTags = [
    "masterpiece, best quality, ultra highres, 8k resolution, perfectly exposed, bright base material",
    "isolated standalone typography graphic, clear cutout text shape against background",
    isFlatEdit ? "clean and readable typography, rich luminous midtones, faithful to the original material and shading style of the base image" : "clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights, clearly lit front face, deep shadowed side walls",
    `highly saturated, punchy vibrant colors, ${editTone.colorGrading}, rich deep colors`,
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    `${editTone.remixTag}, ${ir.budget.en}`,
    "Use the input image as the exact structural reference",
    "strict shape lock, exact silhouette preservation, preserve the original typography silhouette, spacing, stroke proportions, and letter shapes",
    ir.camera,
    projectionTag,
    ir.details.material ? `change material to ${ir.details.material}` : "",
    ir.details.lighting ? `dynamic lighting, ${ir.details.lighting}, physically attached specular highlights` : "",
    ir.details.vfx ? `surrounding VFX, ${ir.details.vfx}, contained energy` : "",
    ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : "",
    "texture physically embedded into material",
    ir.background
  ];
  const negTags = [
    "(worst quality, low quality:1.4), (washed out:1.5), (desaturated:1.5), (dull colors:1.5), (noisy, dirty surface, overcooked, dark patches, messy shading, burnt shadows:1.5), (dark, underexposed, gloomy:1.5)",
    "text mutation, shape drift, stroke swell, extra letters, hallucinated text, floating decal, material sticker, distorted stroke proportions, altered spacing",
    "(duplicated text:1.8), (repeated title:1.8), (two copies of the same text:1.8), (text rendered twice:1.7), (extra text lines:1.6)",
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
    "(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)",
    // 평면 유지 모드에선 "flat paper cutout / flat 2d sticker / vector graphic" 금지를 제외 —
    // 평면 그래픽 룩 자체를 배척해 모델을 입체 쪽으로 밀던 토큰들.
    isFlatEdit ? "(background plate:1.9), (plaque:1.9), (signboard:1.9), (engraved on a wall:1.9), (solid metal block background:1.9), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, mounted metal plate" : "(background plate:1.9), (plaque:1.9), (signboard:1.9), (engraved on a wall:1.9), (solid metal block background:1.9), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, flat paper cutout, flat 2d sticker, mounted metal plate, vector graphic",
    ir.constraints.extrusionId === "None" ? FLAT_NEGATIVE : ir.constraints.extrusionId === "Shallow" ? "(thick extrusion:1.8), (heavy 3d block:1.8), (massive depth:1.8), (deep rear extrusion:1.8), (chunky text:1.8)" : "(thick extrusion:1.4), (heavy 3d block:1.4)",
    "(uniform stroke:1.9), (even border thickness:1.9), (artificial outline:1.9), (unnatural outline:1.5), (glowing border:1.5), cheap 3d effect, wordart, 2d border, (low poly, jagged edges, messy bevel, crunchy artifacts, unrefined sculpt:1.5)",
    "(photoshop bevel and emboss:1.9), (cheap v-carve:1.9), (uniform V-shape depth:1.9), (inner shadow layer style:1.9), (inner stroke:1.9), (fake 2d deboss:1.9), (flat paper with bevel:1.9)",
    "floating FX, background noise, messy glow, overglare, disconnected rim light, floating edge light, artificial halo, separated highlight, (messy edge blending:1.6), detached stroke, (depth of field:1.9), (bokeh:1.9), (background blur:1.9), (lens blur:1.9), out of focus, soft focus, blurred foreground, blurry edges, smudged",
    "(melted shape:1.5), (illegible:1.5), (transparent text blending into background:1.5), (excessive glow destroying shape:1.5), (loss of silhouette:1.5)",
    "(bright side walls:1.5), (overlit extrusion:1.5), (glowing thickness:1.5)",
    "(circular brushing:1.5), (radial metal grain:1.5), (anisotropic reflection:1.5), curved scratches"
  ];
  if (ir.details.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5)");
  if (ir.constraints.extrusionId === "None") {
    posTags.push(`perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition, ${FLAT_POSITIVE}`);
    negTags.push("(angled view:1.9), (side view:1.9), (isometric:1.9), (3d perspective:1.9), (tilt:1.9), diagonal, skewed");
    negTags.push("(added bevel:1.7), (new embossed relief:1.7), (deep carving:1.6), (sculpted 3d surface:1.6), (letterpress depth:1.5)");
  } else if (ir.constraints.extrusionId === "Shallow") {
    posTags.push("straight-on front facing view, dead center, very shallow thin 3d extrusion");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  } else {
    posTags.push("straight-on front facing view, dead center");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  }
  if (ir.intents.material && ir.reliefId !== "ChunkyToy") {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (ir.reliefId === "MicroBevel" || ir.reliefId === "Flat" || ir.reliefId === "HairlineBevel") negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  return `${posTags.filter(Boolean).map((t) => t.trim()).join(", ")}

Negative prompt: STRICTLY FORBIDDEN \u2014 the image must NOT contain any of the following: ${negTags.filter(Boolean).map((t) => t.trim()).join(", ")}`;
};
var compileEditChatGPT = (ir) => {
  if (ir.vfxPassMode) {
    return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. ONLY render the glowing FX surrounding this black void.

### 2. Constraints & Integrity
- **Glyph Lock**: ${ir.locks.glyph}
- **Contour Lock**: ${ir.locks.contour}
- **Anti-Mutation**: ${ir.constraints.anti_mutation}

### 3. Edit Scope & VFX
- **Surrounding VFX**: ${ir.details.vfx || "No VFX specified."}
- **FX Containment**: ${ir.constraints.fx_containment}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}`;
  }
  const intentsArr = [];
  if (ir.details.material) intentsArr.push(`Material Override: ${ir.details.material}`);
  if (ir.details.lighting) intentsArr.push(`Lighting Enhance: ${ir.details.lighting}`);
  if (ir.details.vfx) intentsArr.push(`Contained VFX: ${ir.details.vfx}`);
  let extrConstraint = ir.constraints.extrusion;
  if (ir.constraints.extrusionId === "MINIMAL" || ir.constraints.extrusionId === "None") extrConstraint = "CRITICAL RULE: The typography must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. Preserve the original dimensionality of the base image \u2014 do NOT add new bevels, embossing, carving or surface relief that the base image does not already have. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.";
  else if (ir.constraints.extrusionId === "Shallow") extrConstraint = "CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.";
  const lensDirective = `
- **Lens & Perspective**: ${ir.camera}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let antiToyRule = " AVOID decorative filigree, floral patterns, or ornate engravings. Ensure high legibility and perfectly intact silhouette. Do NOT melt the shape.";
  if (ir.intents.material && ir.reliefId !== "ChunkyToy") antiToyRule += " The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  const opticalRule = ir.intents.material || ir.intents.lighting ? "Edge highlights and rim lights MUST be physically integrated into the surface. Strictly NO floating glow, detached halos, or separated stroke lines. Ensure a clearly lit and well-exposed subject. Deep controlled shadows, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders." : "Preserve the original lighting and shading style of the base image. Do NOT add new rim lights, edge highlights, specular effects or dramatic shadows that the base image does not already have.";
  return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. Structure Lock (CRITICAL)
- **Reference**: Use the input image as the exact structural reference.
- **Glyph Lock**: ${ir.locks.glyph}
- **Contour Lock**: ${ir.locks.contour}
- **Stroke Lock**: ${ir.locks.stroke}
- **Budget Level**: ${ir.budget.name}

### 2. Constraints & Integrity
- **Anti-Mutation**: ${ir.constraints.anti_mutation}
- **Material Integration**: ${ir.constraints.material_integration} Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID cheap plastic, fake gold foil, or tacky over-shiny CGI look. Ensure extreme sharpness and intricate micro-details on the facets. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. AVOID fake inner shadow or inner stroke layer styles.${antiToyRule} Ensure straight linear brushed lines, NO circular brushing.
- **Optical Integration**: ${opticalRule}
- **Color Grading**: Rich, naturally saturated colors with controlled highlights \u2014 avoid washed-out dullness, but EQUALLY avoid oversaturated neon harshness or blown-out contrast. Preserve the base image's original color mood. (Note: this model tends to over-boost saturation \u2014 keep it restrained.)
- **FX Containment**: ${ir.constraints.fx_containment}
- **Depth/Extrusion**: ${extrConstraint}${lensDirective} Ensure side planes (thickness) fall into deep shadow and do NOT glow brightly.

### 3. Edit Scope & Intents
- **Target Changes**: 
  - ${intentsArr.length > 0 ? intentsArr.join("\n  - ") : "Subtle Polish"}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.

*Ensure the output preserves 95%+ of the original core morphology while only swapping the outer aesthetic layers. Do not use cheap uniform 2D strokes or photoshop bevel effects.*`;
};
var compileEditMidjourney = (ir, state) => {
  if (ir.vfxPassMode) {
    const subject2 = `pure pitch-black silhouette typography, holdout matte pass`;
    const lightingFx2 = `${ir.details.vfx || ""}, ${ir.background}`;
    const mjNegatives2 = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
    return `/imagine prompt: ${subject2}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx2} ${mjNegatives2}--style raw --v 6.1`.replace(/\s+/g, " ").replace(/, ,/g, ",");
  }
  const intentsArr = [];
  if (ir.details.material) intentsArr.push(`material shift to ${ir.details.material}`);
  if (ir.details.lighting) intentsArr.push(`lighting tune: ${ir.details.lighting}`);
  if (ir.details.vfx) intentsArr.push(`surface VFX: ${ir.details.vfx}`);
  const editMjTone = getTone(ir._meta?.persona?.id);
  let subject = `${editMjTone.subjectKind} remix, isolated standalone typography graphic, strict shape lock, exact silhouette preservation, Use the input image as the exact structural reference, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.camera}, ${ir.budget.en}`;
  const scope = intentsArr.length > 0 ? intentsArr.join(", ") : "surface polish";
  const custom = ir.customIntent !== "subtle surface enhancement" ? `, ${ir.customIntent}` : "";
  const mjOptical = ir.intents.material || ir.intents.lighting ? ", physically attached specular highlights, deep controlled shadows, clean high-value highlights, strong material contrast" : ", preserve the original lighting and shading style of the base image";
  const constraints = `${ir.constraints.extrusion}, ${ir.constraints.material_integration}, ${ir.constraints.fx_containment}${mjOptical}, highly saturated, punchy vibrant colors`;
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, text mutation, shape drift, stroke swell, floating FX, background noise, material sticker, extra letters, duplicated text, repeated title, text rendered twice, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, filigree, floral patterns, decorative ornaments, ornate engravings, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, drop shadow, cast shadow revealing thickness, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
  if (ir.constraints.extrusionId === "None" || ir.constraints.extrusionId === "MINIMAL") {
    subject += `, perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition, ${FLAT_POSITIVE}`;
    mjNegatives += `angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, ${FLAT_MJ_NEGATIVE}, `;
  } else if (ir.constraints.extrusionId === "Shallow") {
    subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
    mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, ";
  } else {
    subject += ", straight-on front facing view, dead center";
    mjNegatives += "extreme angled view, side view, tilt, ";
  }
  let lightingFx = ir.constraints.extrusionId === "None" || ir.constraints.extrusionId === "MINIMAL" ? "flat graphic front-face rendering, preserve the original dimensionality and shading style of the base image, no added bevel or embossing" : "dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion";
  if (ir.intents.material && ir.reliefId !== "ChunkyToy") {
    lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
    mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, ";
  }
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (ir.reliefId === "MicroBevel" || ir.reliefId === "HairlineBevel" || ir.reliefId === "Flat") mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  const mj_iw = ir.budget.id === "Locked" ? "--iw 2.0" : ir.budget.id === "Conservative" ? "--iw 1.5" : ir.budget.id === "Balanced" ? "--iw 1.0" : "--iw 0.5";
  return `/imagine prompt: ${subject}, applied ${scope}${custom}, ${constraints}, ${lightingFx}, background ${ir.background} ${mjNegatives}${mj_iw} --style raw --v 6.1`.replace(/\s+/g, " ");
};
var compileRunway = (ir) => {
  const isStatic = ir.motion.camera.includes("ZERO zoom");
  const staticRule = isStatic ? "NO ZOOM IN. NO ZOOM OUT. NO CAMERA MOVEMENT. STRICTLY STATIC CAMERA. FIXED SCALE." : "";
  const fxRule = ir.energyCore !== "no surrounding FX" ? `${ir.energyCore}, highly controlled, strictly confined to the text area, pure black background must remain clean and unaffected by global color washes` : "None";
  const posTags = [`Camera: ${ir.motion.camera}`, staticRule, `Dynamics: ${ir.motion.dynamics}`, `VFX: ${fxRule}`, ir.customIntent, ir.subject_lock, "Do not deform. Maintain perfectly crisp edges. Do NOT fill the entire screen with effects."].filter(Boolean).join(". ");
  return posTags;
};
var compileLuma = (ir) => {
  const isStatic = ir.motion.camera.includes("ZERO zoom");
  const staticRule = isStatic ? "Strictly NO camera movement, NO zoom in, NO zoom out. The camera is locked." : "";
  const fxRule = ir.energyCore !== "no surrounding FX" ? `${ir.energyCore} effect, keeping the glow subtle, strictly confined to the letters, background must remain pure black, do NOT apply a full-screen gold filter` : "No FX";
  return `Cinematic motion, ${ir.motion.camera}. ${staticRule} Dynamics: ${ir.motion.dynamics}. VFX: ${fxRule}. ${ir.customIntent}. Keep the text absolutely solid and static, NO morphing, NO warping of the typography. Maintain perfectly crisp edges. Effects must not overwhelm the entire screen.`;
};
var compileSequence = (ir) => `// AE / Web Sequence Compositing Guide
// 1. Export Matte Pass from Creation Tab (VFX Source Extraction Mode)
// 2. Import into After Effects / WebGL Canvas
// 3. Blend Mode: Screen or Linear Dodge (Add)
// 4. Camera Dynamics: ${ir.motion.camera}
// 5. Particle/FX Behavior: ${ir.motion.dynamics} (${ir.energyCore})
// CRITICAL: To achieve a perfect seamless loop for web, ensure particle lifespans match the composition duration exactly.`;
var compileVeo = (ir) => {
  const isStatic = ir.motion.camera.includes("ZERO zoom");
  const staticRule = isStatic ? "ABSOLUTE CAMERA LOCK: The camera MUST NOT zoom out, MUST NOT zoom in, pan, or move. The text scale and position must remain perfectly fixed throughout the video." : "";
  const fxRule = ir.energyCore !== "no surrounding FX" ? `with ${ir.energyCore}` : "";
  const motionTone = getTone(ir._meta?.persona?.id);
  return `Create a ${motionTone.motionKind} of an isolated standalone typography graphic on a pure black background.
Camera Motion: ${ir.motion.camera}
Dynamics: ${ir.motion.dynamics} ${fxRule}
${ir.customIntent ? `Action: ${ir.customIntent}` : ""}

CRITICAL RULE: ${ir.subject_lock} Do not allow the text to distort or melt. Maintain perfectly crisp edges.
FX CONTAINMENT: Visual effects MUST be highly controlled and strictly confined to the text surface and immediate edges. Do NOT let effects fill the entire screen. The background MUST remain a pure, unaffected black void. NO global color washes or full-screen filters.
${staticRule}`;
};

// src/apps/RenderMatrix/constants/materials.js
var INITIAL_OPTIONS = {
  typographyScales: [
    // "macro photography" 는 모델이 접사 줌으로 해석해 글자가 프레임 밖으로 잘리던 표현 → 프레이밍 안전 표현으로 교체.
    { id: "Macro", name: "\uB300\uD615 \uB85C\uACE0 (Macro)", en: "hyper-detailed large-scale typography, single focal point, entire text fully visible inside the frame with comfortable margins" },
    { id: "Dense", name: "\uBCF5\uC7A1/\uC791\uC740 \uD14D\uC2A4\uD2B8 (Dense)", en: "centered composition, medium-wide framing, subject occupies around 50% of the frame, highly legible and clean typography, simplified surface details to maintain readability, crisp clean typographic boundaries, reduced noise" }
  ],
  cameraLenses: [
    { id: "Telephoto", name: "\uB9DD\uC6D0 \uB80C\uC988 (200mm) - \uC65C\uACE1 \uC81C\uAC70", en: "shot on 200mm telephoto lens, extreme perspective compression, flat focal plane, strictly zero perspective distortion" },
    { id: "Standard", name: "\uD45C\uC900 \uB80C\uC988 (50mm) - \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC2DC\uC57C", en: "shot on 50mm standard lens, natural human eye perspective" },
    { id: "Wide", name: "\uAD11\uAC01 \uB80C\uC988 (24mm) - \uADF9\uC801\uC778 \uC6D0\uADFC\uAC10", en: "shot on 24mm ultra wide angle lens, dramatic perspective distortion, dynamic vanishing point" },
    // "extreme close-up" 은 모델이 줌 크롭으로 해석해 글자가 잘리던 표현 → 디테일 의도만 남기고 교체.
    { id: "Macro", name: "\uB9E4\uD06C\uB85C (100mm) - \uADF9\uC811\uC0AC", en: "shot on 100mm macro lens for extreme surface detail, focus stacking, infinite depth of field, edge-to-edge sharp focus, entirely in focus, entire text fully visible inside the frame" }
  ],
  intensities: [
    { id: "Low", name: "Subtle (\uBBF8\uC138)", en: "ultra-subtle refined details" },
    { id: "Mid", name: "Balanced (\uD45C\uC900)", en: "refined balanced finish" },
    { id: "High", name: "High-Detail (\uACE0\uBC00\uB3C4)", en: "dense intricate macro detailing" }
  ],
  backgrounds: [
    { id: "RealBlack", name: "Deep Black (Matte)", en: "Pure solid #000000 matte black void, completely clean background" },
    { id: "StudioGray", name: "Neutral Gray", en: "Professional neutral gray with subtle depth" },
    { id: "PureWhite", name: "High-Key White", en: "Pristine white studio background" },
    { id: "ChromaGreen", name: "Chroma Green", en: "Pure chroma green screen #00FF00" }
  ],
  fxOrigins: [
    { id: "Edges", name: "\uAC00\uC7A5\uC790\uB9AC/\uB05D\uBD80\uBD84 \uC9D1\uC911", en: "originating strictly from the sharp edges and tips" },
    { id: "Overall", name: "\uAE00\uC790 \uC804\uCCB4\uB97C \uAC10\uC2F8\uB4EF", en: "softly enveloping the entire typography surface" },
    { id: "BetweenLetters", name: "\uAE00\uC790 \uC0AC\uC774\uB97C \uC5F0\uACB0\uD558\uB4EF", en: "arcing and intertwining between the gaps of the letters" }
  ],
  fxIntensities: [
    // 수량 표현 추가 — "subtle" 형용사만으로는 모델이 밀도를 줄이지 않아 과하게 나오던 문제.
    { id: "Subtle", name: "Subtle (\uC740\uC740\uD558\uAC8C)", en: "very subtle, minimalist, restrained \u2014 only a few sparse barely-visible" },
    { id: "Moderate", name: "Moderate (\uBCF4\uD1B5)", en: "balanced, clearly visible but non-overpowering" },
    { id: "Intense", name: "Intense (\uAC15\uD558\uAC8C)", en: "intense, highly dynamic, dramatic" }
  ],
  surfaceDetails: [
    { id: "Clean", name: "Clean (\uC644\uBCBD\uD788 \uB9E4\uB044\uB7EC\uC6C0)", en: "perfectly smooth, flawless clean surface, absolutely NO scratches" },
    { id: "Standard", name: "Standard (\uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uACB0)", en: "natural physical surface micro-texture" },
    { id: "High", name: "High (\uBBF8\uC138 \uAE30\uC2A4 \uBC00\uB3C4 \uADF9\uB300\uD654)", en: "intense micro-details, fine hairline scratches, refined elegant texture, rich tactile finish" }
  ],
  frontReliefs: [
    { id: "Flat", name: "\uD3C9\uBA74\uD615 (Flat)", en: "strictly flat core surface, no carved depth, subtle material treatment" },
    { id: "MicroBevel", name: "\uBBF8\uC138\uD55C \uAC01 (Micro Bevel)", en: "maintaining flat core with sharp crisp angled micro-bevel on edges ONLY, rigid mechanical corners, NO soft rounded bevels, NO deep carving" },
    { id: "HairlineBevel", name: "\uCD08\uBBF8\uC138 \uCE7C\uAC01 (Hairline Bevel)", en: "microscopic 1px razor-edge highlight, ultra-thin minimal bevel width, sharp crisp boundary" },
    // "미세 컷 텍스처"가 아니라 "얕은 입체 + 각진 면으로 깎인 표면"으로 재정의 (사용자 기대 반영).
    { id: "MicroChiseled", name: "\uB9C8\uC774\uD06C\uB85C \uCE58\uC990\uB9C1 (Micro-Chiseled)", en: "surface carved into dense small angular chisel-cut facets, shallow low-relief depth, each cut leaving a crisp flat angular face, fine jewelry chisel work with machined precision, NO deep carving, NO large low-poly facets, NO cheap photoshop bevel" },
    // ─── 양각(Raised) 계열 — 음각(깊은 컷)이 배경을 판처럼 칠하는 성질이 있어 양각 위주로 다양화 ───
    { id: "RaisedEmboss", name: "\uBA54\uB2EC \uC591\uAC01 (Raised Emboss)", en: "raised plateau letterforms rising from the front face, flat polished top surface with crisp angled side slopes, coin and medal embossing style, emboss contained strictly inside the letter strokes" },
    { id: "RaisedDome", name: "\uB465\uADFC \uC591\uAC01 (Raised Dome)", en: "smoothly domed convex letterforms rising from the front face, polished rounded emboss like a pressed metal coin, precise metallic dome surface, emboss contained strictly inside the letter strokes" },
    // "면이 큰 각으로 갈라져 명암이 뚝뚝 끊기는" 레퍼런스 룩 — 획 방향 능선 + 대형 평면 분할 명시.
    { id: "RaisedRidge", name: "\uB9BF\uC9C0 \uC591\uAC01 (Raised Ridge)", en: "raised roof-like ridge running along the full length of each stroke, positive V cross-section with a crisp continuous apex line, each side reads as one large clean angular plane \u2014 strong light/dark value separation between the two faces, blade-like prismatic elegance, machined precision, emboss contained strictly inside the letter strokes" },
    // "deep angular cuts" 가 사선 홈/격자 패턴으로 해석되던 문제 → "미세한 평면 파셋 모자이크" 로 재정의.
    { id: "Crystalline", name: "\uD06C\uB9AC\uC2A4\uD0C8 \uD30C\uC14B (Crystalline)", en: "front surface cut into many small flat crystalline facets at subtly varied angles, fine gem-faceted micro-plane mosaic covering the letterforms, each facet a clean flat plane catching light at a different angle, crisp facet borders, jewelry gem-cutting precision, NO diagonal groove lattice, NO cross-hatch pattern, NO soft bevels, facets contained strictly inside each letter stroke" },
    { id: "DiamondPrism", name: "\uB2E4\uC774\uC544\uBAAC\uB4DC \uD504\uB9AC\uC998 \uAC01 (Diamond Prism)", en: "sharp prismatic beveled edges, deep V-carved angular facets, prominent center ridge, highly reflective diamond-cut geometry, NO flat front face, cuts contained strictly inside each letter stroke, background stays an untouched empty void" },
    { id: "DeepVCarve", name: "V\uC790 \uC74C\uAC01 \uB9BF\uC9C0 (Deep V-Carve)", en: "deep V-carved angular facets, prominent sharp center ridge running along the center of the strokes, perfectly smooth and flat angled inner walls, highly reflective crisp multi-faceted geometry, NO messy distortion, NO flat front face, cuts contained strictly inside each letter stroke, background stays an untouched empty void" },
    { id: "ChunkyToy", name: "Chunky (\uB3C4\uD1B0\uD55C \uACE1\uBA74)", en: "soft, thick, rounded chunky toy-like front relief, inflated balloon volume" }
  ],
  projectionDepths: [
    // 완전 평면 — 기존에 "최소 돌출"에 강제로 얹혀 있던 razor-thin/코인 평면 강제를 분리한 전용 옵션.
    // 최소 돌출은 원래 의미(얇지만 물체다운 몸통 허용)로 복원 → 황금 유물 등 프리셋이 컨셉대로 나옴.
    { id: "Flat2D", name: "\uC644\uC804 \uD3C9\uBA74 (Flat 2D)", en: "[PROJECTION: FLAT-2D] strictly flat 2D graphic with zero thickness, front-face only, razor-thin coin-face rendering." },
    { id: "None", name: "\uCD5C\uC18C \uB3CC\uCD9C (Minimal)", en: "[PROJECTION: MINIMAL] solid structural body with minimal side thickness, absolutely no deep rear 3D extrusion, no heavy perspective block. All dimensional depth must exist exclusively on the front-face." },
    { id: "Shallow", name: "\uC587\uC740 \uB3CC\uCD9C (Shallow)", en: "[PROJECTION: SHALLOW] very thin shallow backward 3D extrusion, subtle slim side thickness, minimal perspective, NO heavy blocks." },
    { id: "Block", name: "\uBE14\uB85D \uB3CC\uCD9C (Blocky)", en: "[PROJECTION: BLOCKY] Solid structural block thickness, distinct side planes and 3D perspective." },
    { id: "Monumental", name: "\uAC70\uB300 \uB3CC\uCD9C (Epic 3D)", en: "[PROJECTION: MONUMENTAL] Massive cinematic backward 3D extrusion, epic perspective depth, deep architectural volume." }
  ],
  surfaceTreatments: [
    { id: "Standard", name: "Standard (\uD45C\uC900)", en: "standard physical surface reaction" },
    { id: "Crystalline", name: "\uACB0\uC815\uD615 \uAD74\uC808 (Crystalline)", en: "subtle crystalline optical reaction contained within the front face, crisp internal refraction without changing the silhouette" },
    { id: "SmoothFillet", name: "\uB465\uADFC \uAD74\uACE1 (Smooth)", en: "elegant smooth filleted transitions" },
    { id: "MultiFaceted", name: "\uB2E4\uAC01 \uBA74\uCE58\uAE30 (Faceted)", en: "highly luminous angular geometric facets" },
    { id: "HammeredFinish", name: "\uB9DD\uCE58 \uC790\uAD6D (Hammered)", en: "hand-hammered dimpled organic surface" },
    { id: "BrushedMetal", name: "\uC9C1\uC120 \uBE0C\uB7EC\uC2DC \uACB0 (Linear Brushed)", en: "straight linear horizontal brushed metal finish, perfectly parallel brushed lines, NO circular brushing, NO radial patterns" }
  ],
  energyCores: [
    { id: "None", name: "\uC5C6\uC74C (None)", en: "no surrounding FX" },
    { id: "GoldenDust", name: "\uD669\uAE08 \uAC00\uB8E8 \uD769\uBFCC\uB9BC", en: "glowing golden dust and scattering sparks" },
    { id: "ColdMist", name: "\uB0C9\uAE30\uC640 \uC548\uAC1C \uD750\uB984", en: "rising cold mist and flowing icy vapor" },
    { id: "Sparkling", name: "\uBC18\uC9DD\uC774\uB294 \uBE5B/\uAD11\uD0DD", en: "sparkling light effects and intense glossy lens flares" },
    { id: "Electricity", name: "\uD750\uB974\uB294 \uC804\uB958/\uC2A4\uD30C\uD06C", en: "flowing static electricity and micro lightning arcs" },
    { id: "Flame", name: "\uBD88\uAF43/\uD654\uC5FC", en: "controlled flame filaments flowing across the front face and contained mainly inside the letter strokes, with only a few short edge tongues, no large exterior fire plume and no silhouette obstruction" },
    { id: "MicroParticles", name: "\uBBF8\uC138 \uD30C\uD2F0\uD074 \uBC1C\uC0B0", en: "emitting luminous micro floating particles" },
    { id: "MagmaEmbers", name: "\uBD88\uD2F0\uC640 \uC544\uC9C0\uB791\uC774", en: "No flames, only very subtle glowing dust and faint residual heat shimmer at sharp edges" },
    { id: "DarkAura", name: "\uB2E4\uD06C \uC624\uB77C", en: "subtle dark wispy shadowy aura creeping tightly" },
    // ─── 황금·럭셔리용 드라마틱 이펙트 ───
    { id: "HolyRays", name: "\uC2E0\uC131 \uAD11\uC120 (God Rays)", en: "dramatic volumetric holy light rays radiating from behind the letters, divine golden beams piercing through the gaps between strokes, cathedral light shafts, rays stay strictly behind and around the text without covering the letterforms" },
    { id: "GoldFlakes", name: "\uAE08\uBC15 \uD30C\uD3B8 \uBD80\uC720", en: "delicate gold leaf flakes and gilded shards slowly drifting around the letters, each flake catching the light with tiny brilliant glints, luxurious golden confetti contained near the text" },
    { id: "StarGlints", name: "\uBCC4\uBE5B \uAE00\uB9B0\uD2B8 (Star Glints)", en: "a few precise star-shaped four-point light glints flashing on the sharpest edges and corners, jewelry commercial sparkle, cinematic starburst highlights, no hazy lens flare wash" }
  ],
  materials: [
    { id: "HyperChrome", name: "\uD558\uC774\uD37C \uD06C\uB86C (Mirror)", en: "High-contrast bright liquid mirror chrome" },
    { id: "PolishedSilver", name: "\uD3F4\uB9AC\uC26C\uB4DC \uC2E4\uBC84 (Polished Silver)", en: "highly polished dark silver metal, pristine reflective chrome surface, elegant gunmetal finish" },
    { id: "DarkTitanium", name: "\uB2E4\uD06C \uD2F0\uD0C0\uB284 (Dark Titanium)", en: "heavy dark titanium metal, black chrome, extreme high contrast reflections, deep pitch black shadows and brilliant crisp edge highlights, sleek gunmetal finish, absolutely clean surface" },
    // 완전 무광은 금속감(광택·반사)이 죽음 — 새틴 폴리시 베이스 + 엣지/베벨의 거울성 반사로 절충.
    { id: "MatteGold", name: "\uBB34\uAD11 \uACE8\uB4DC (Matte Gold)", en: "rich warm 24-karat gold with satin-polished metallic sheen, soft mirror-like reflections sweeping across raised edges and bevels, strong specular response to light, deep saturated golden hue, dense solid precious metal, jewelry-grade refined finish, strong tonal depth between lit faces and shadowed grooves" },
    // 유광·무광의 중간 — 유광의 liquid-metal 반사가 글자의 파인 부분(홈·카운터)을 메꿔버리는
    // 문제의 대안. 형태 보존(홈은 홈대로 열려 있게)을 재질 정의에 내장.
    { id: "SemiGlossGold", name: "\uC138\uBBF8\uAE00\uB85C\uC2A4 \uACE8\uB4DC (Semi-Gloss)", en: "semi-gloss 24-karat gold with softly polished lustre halfway between matte and mirror, controlled warm reflections that follow the letterform surfaces without flooding them, deep saturated golden hue, every notch, cut, counter and recessed detail of the letterforms stays crisp, open and clearly visible \u2014 reflections and highlights NEVER fill in, bridge or smooth over the carved gaps" },
    // "every surface"(측면 암시)·"flawless"(마모 옵션과 모순) 표현 제거 — 돌출 유발 + 마모 무시 원인.
    { id: "PolishedGold", name: "\uC720\uAD11 \uACE8\uB4DC (Polished Gold)", en: "high-gloss mirror-polished 24-karat gold, brilliant liquid-metal reflections flowing across the front face, intense crisp specular highlights, deep saturated warm golden hue with rich amber shadow tones, jewelry-showroom grade polish, luxurious dazzling shine, reflections stay on the surface and never fill in the carved recesses of the letterforms" },
    { id: "GoldFoil", name: "\uAE08\uBC15 \uD3EC\uC77C (Gold Foil)", en: "luxurious hot-stamped gold foil, ultra-glossy mirror-like specular reflections, thin metallic foil sheet with subtle crinkled micro-wrinkles catching the light, premium print-finishing aesthetic" },
    { id: "AgedGilt", name: "\uB0A1\uC740 \uAE08\uBC15 (Aged Gilt)", en: "antique gold leaf gilding pressed onto an old bible book cover, extremely thin hand-applied gilt foil, softly dulled warm sheen instead of mirror gloss, edges and high points gently rubbed off and flaked away revealing the darker base underneath, centuries-old gilt lettering aesthetic" },
    // 배너 실전용 컬러 재질 — 금속 계열만으로는 시즌/보상/여름 배너의 색상 위계를
    // 만들기 어려워, 형태를 덮지 않는 불투명·반투명 마감으로 분리한다.
    { id: "CrimsonEnamel", name: "\uD06C\uB9BC\uC2A8 \uC5D0\uB098\uBA5C (Crimson Enamel)", en: "deep premium crimson red vitreous enamel over a dense metal core, glossy lacquered front face, controlled ruby reflections, dark burgundy shadow tones, crisp gold-friendly edges, fully opaque color that preserves every counter and carved detail" },
    { id: "JadeCeramic", name: "\uBE44\uCDE8 \uC138\uB77C\uBBF9 (Jade Ceramic)", en: "polished pale jade ceramic with restrained milky translucency only at the thinnest edges, elegant celadon green body, subtle mineral clouding contained inside the strokes, solid readable core and crisp silhouette" },
    { id: "AquaGlass", name: "\uC544\uCFE0\uC544 \uAE00\uB77C\uC2A4 (Aqua Glass)", en: "bright aqua-blue architectural glass with a frosted opaque core, clean cyan edge refraction, sunlit water-like highlights contained inside the letterforms, high readability without transparent holes or background bleed" },
    { id: "PearlEnamel", name: "\uD384 \uC544\uC774\uBCF4\uB9AC (Pearl Ivory)", en: "warm ivory pearl enamel with a fine satin nacre sheen, softly luminous premium surface, restrained champagne reflections on bevels, opaque clean body with strong readability and no glitter noise" },
    // 기존 금속·원소 계열과 겹치지 않는 실무형 표현 재질. 외곽 3D 몸통이 아니라
    // 정면(face) 내부에서만 재질감이 읽히도록 정의한다.
    { id: "HolographicChrome", name: "\uD640\uB85C\uADF8\uB7A8 \uD06C\uB86C (Holographic Chrome)", en: "bright satin silver chrome front face with restrained cyan, violet and rose holographic interference bands contained inside the strokes, crisp neutral highlights, fully readable counters, no rainbow haze outside the silhouette" },
    { id: "NeonGlass", name: "\uB124\uC628 \uAE00\uB77C\uC2A4 (Neon Glass)", en: "opaque deep midnight glass front face with clean cyan and magenta luminous channels inset inside the strokes, crisp bright edges, readable solid core, no detached light tubes or ambient fog" },
    { id: "DarkWood", name: "\uB2E4\uD06C \uC6D4\uB11B \uBAA9\uAC01 (Dark Walnut)", en: "premium dark walnut wood front face, fine natural grain following the letter strokes, shallow hand-carved highlights, warm honey edge polish, dense solid readable core" },
    { id: "EmbossedLeather", name: "\uC5E0\uBCF4\uC2A4 \uAC00\uC8FD (Embossed Leather)", en: "dense oxblood full-grain leather front face, refined micro pebble texture, subtle pressed emboss highlights, dark burgundy body and warm brass-friendly edges, crisp silhouette" },
    { id: "PaperCutout", name: "\uD504\uB9AC\uBBF8\uC5C4 \uD398\uC774\uD37C (Paper Cutout)", en: "premium warm white art-paper front face with subtle cotton fibers, clean precision-cut edges, gentle printed shadow only within the face, flat graphic silhouette with no stacked rear layers" },
    { id: "CandyResin", name: "\uCE94\uB514 \uB808\uC9C4 (Candy Resin)", en: "glossy translucent coral candy resin front face with an opaque luminous core, smooth rounded internal highlights, jewel-like color depth contained inside the strokes, crisp readable edges" },
    { id: "RoughStone", name: "\uAC70\uCE5C \uC11D\uC7AC (Rough Stone)", en: "Raw porous rough stone texture" },
    { id: "VolcanicRock", name: "\uB2E8\uB2E8\uD55C \uD654\uC0B0\uC554 (Volcanic Rock)", en: "Solid dark hardened volcanic rock, deep porous texture, physically un-meltable structure" },
    { id: "FrostedGlass", name: "\uBC18\uD22C\uBA85 \uC720\uB9AC (Frosted)", en: "Frosted sandblasted glass" },
    { id: "IceCrystal", name: "\uB2E8\uB2E8\uD55C \uBE59\uACB0 \uC218\uC815 (Ice Crystal)", en: "Solid opaque ice crystal, frosted surface, crisp structural edges, completely opaque core" },
    { id: "Obsidian", name: "\uC635\uC2DC\uB514\uC5B8 (Obsidian)", en: "Ultra-glossy jet black volcanic glass" },
    { id: "GothicSteel", name: "\uACE0\uB515 \uAC15\uCCA0 (Hardened Steel)", en: "Cold hardened surgical steel" },
    { id: "AntiqueGold", name: "\uC564\uD2F1 \uACE8\uB4DC (Antique Gold)", en: "Aged and darkened rich antique gold" }
  ],
  dramaticTextures: [
    { id: "None", name: "None (\uB9E4\uB044\uB7EC\uC6C0)", en: "flawless polished uniform material" },
    { id: "Auto", name: "AI \uC790\uC728 (Auto)", en: "organically embedded detailed textures" },
    { id: "MicroGrain", name: "\uBBF8\uC138 \uC785\uC790\uACB0 (Micro Grain)", en: "ultra-fine brushed metal grain, intricate microscopic surface texture, highly refined elegant finish" },
    { id: "AncientErosion", name: "\uACE0\uB300 \uD48D\uD654/\uBD80\uC2DD (Erosion)", en: "heavily eroded ancient surface, deep oxidized patina, chipped and weathered organic degradation, physically integrated into the core material, NO written text, NO runes" },
    { id: "ExplosiveFracture", name: "\uC815\uAD50\uD55C \uADE0\uC5F4 (Fracture)", en: "Micro-detailed sharp fractures physically integrated into the core material" },
    { id: "GlowingVeins", name: "\uC740\uC740\uD55C \uBC1C\uAD11 \uB9E5 (Glowing Veins)", en: "Subtle glowing veins deeply etched into the solid core material, strictly contained inner glow, NO outer melting" },
    { id: "FoilLift", name: "\uB4E4\uB72C \uAE08\uBC15 (Foil Lift)", en: "thin gilt foil partially lifting and peeling away from the surface, delicately curled raised foil edges catching sharp light, tiny air pockets and blisters trapped under the leaf, fragile cracked flakes about to detach, subtle tactile depth from the lifted layer" },
    { id: "Damascus", name: "\uB2E4\uB9C8\uC2A4\uCFE0\uC2A4 (Flow)", en: "swirling organic layered ripples" },
    { id: "GeometricMilling", name: "\uC815\uBC00 \uAE30\uD558\uD559 \uBC00\uB9C1 (Geometric Milling)", en: "delicate geometric diamond grid micro-engravings, precision-milled high-tech surface pattern" }
  ],
  rimThicknesses: [
    { id: "None", name: "\uC5C6\uC74C (None)", en: "strictly borderless, seamless organic blending edges, no outline" },
    { id: "Hairline", name: "\uC544\uC8FC \uAC00\uB294\uC120", en: "microscopic elegant thin edge highlight, organic and uneven" },
    { id: "Normal", name: "\uBCF4\uD1B5 \uD14C\uB450\uB9AC", en: "solid structural outer edge, physically carved border with dynamic thickness, NOT a uniform stroke" }
  ],
  wearLevels: [
    { id: "None", name: "\uC0C8\uAC83 (Pristine)", en: "factory-new flawless state" },
    { id: "MicroScratches", name: "\uBBF8\uC138 \uAE30\uC2A4 (Light Wear)", en: "subtle surface micro-abrasions" },
    // 4단어짜리 약한 표현이라 재질의 폴리시 묘사에 항상 밀리던 문제 — 구체 묘사로 강화.
    { id: "TimeWorn", name: "\uC138\uC6D4\uC758 \uD754\uC801 (Time-Worn)", en: "aged and weathered patina, softly dulled sheen on high-touch areas, fine accumulated scratches and small dings from decades of use, oxidized darkening settled into the recesses" },
    { id: "BattleDamage", name: "\uC804\uD22C \uD754\uC801 (Battle-Damaged)", en: "heavy battle-worn damage, deep structural scars, sword cuts, severely chipped and dented edges" }
  ],
  rimColors: [
    { id: "None", name: "\uC5C6\uC74C (None)", en: "no secondary rim light" },
    { id: "White", name: "\uD4E8\uC5B4 \uD654\uC774\uD2B8", en: "clean sharp neutral white rim light" },
    { id: "Blue", name: "\uC544\uC774\uC2A4 \uBE14\uB8E8", en: "cold piercing bright blue rim light" },
    { id: "Amber", name: "\uC5E0\uBC84 \uC624\uB80C\uC9C0", en: "warm glowing intense orange rim light" },
    { id: "MutedGold", name: "\uCC28\uBD84\uD55C \uC6DC\uACE8\uB4DC", en: "desaturated muted gold rim light, subtle elegant warm edge highlight" },
    { id: "NeonPink", name: "\uB124\uC628 \uD551\uD06C", en: "vibrant highly saturated neon pink rim light" },
    { id: "Cyan", name: "\uC0AC\uC774\uBC84 \uC0AC\uC774\uC5B8", en: "vibrant cyber cyan bright rim light" },
    { id: "BloodRed", name: "\uBE14\uB7EC\uB4DC \uB808\uB4DC", en: "deep dark blood crimson red rim light" },
    { id: "SoftPurple", name: "\uBBA4\uD2B8 \uD37C\uD50C", en: "soft desaturated purple rim light, atmospheric purple edge glow" }
  ],
  rimIntensities: [
    { id: "Subtle", name: "\uC740\uC740\uD558\uAC8C (Subtle)", en: "very faint and subtle" },
    { id: "Moderate", name: "\uBCF4\uD1B5 (Moderate)", en: "clear and balanced" },
    { id: "Strong", name: "\uAC15\uB82C\uD558\uAC8C (Strong)", en: "intense and bright" }
  ],
  cameraMotions: [
    { id: "Static", name: "\uACE0\uC815 (Static)", en: "completely static camera, locked off shot on tripod, ZERO zoom in, ZERO zoom out, fixed text scale, absolutely NO camera movement" },
    { id: "SlowZoom", name: "\uCC9C\uCC9C\uD788 \uC90C\uC778 (Slow Zoom)", en: "very slow cinematic push in, subtle zoom" },
    { id: "Orbit", name: "\uAC00\uBCBC\uC6B4 \uADA4\uB3C4 \uD68C\uC804 (Orbit)", en: "subtle slow parallax orbit, shifting perspective slightly" }
  ],
  motionDynamics: [
    { id: "Flowing", name: "\uBD80\uB4DC\uB7FD\uAC8C \uD750\uB984 (Flowing)", en: "elegant slow flowing motion, highly viscous and smooth dynamics" },
    { id: "Turbulent", name: "\uAC70\uCE60\uAC8C \uD718\uBAB0\uC544\uCE68 (Turbulent)", en: "aggressive turbulent motion, fast swirling particles, high energy dynamics" },
    { id: "Pulsating", name: "\uB9E5\uB3D9/\uD638\uD761 (Pulsating)", en: "rhythmic pulsating glow, glowing intensely then fading smoothly" },
    { id: "SeamlessLoop", name: "\uBB34\uD55C \uBC18\uBCF5 (Seamless Web Loop)", en: "perfectly seamless loop, ending exactly where it begins, consistent infinite motion" }
  ]
};

// src/apps/RenderMatrixPop/services/promptCompiler.js
var promptCompiler_exports2 = {};
__export(promptCompiler_exports2, {
  calculateQualityScore: () => calculateQualityScore2,
  compileChatGPT: () => compileChatGPT2,
  compileEditChatGPT: () => compileEditChatGPT2,
  compileEditMidjourney: () => compileEditMidjourney2,
  compileEditNanoBanana: () => compileEditNanoBanana2,
  compileLuma: () => compileLuma,
  compileMidjourney: () => compileMidjourney2,
  compileNanoBanana: () => compileNanoBanana2,
  compileRunway: () => compileRunway,
  compileSequence: () => compileSequence,
  compileVeo: () => compileVeo,
  generateEditIR: () => generateEditIR2,
  generateIR: () => generateIR2,
  generateMotionIR: () => generateMotionIR2,
  getQualityFeedback: () => getQualityFeedback,
  performLogicAudit: () => performLogicAudit2
});

// src/apps/RenderMatrixPop/constants/presets.js
var DIRECTOR_PERSONAS2 = [
  { id: "Chameleon", name: "\u{1F98E} \uCE74\uBA5C\uB808\uC628 (\uB808\uD37C\uB7F0\uC2A4 \uC644\uBCBD \uBCF5\uC0AC)", desc: "\uC7A5\uB974 \uBD88\uBB38! AI\uC758 \uD3B8\uD5A5\uC744 \uC5C6\uC560\uACE0 \uB808\uD37C\uB7F0\uC2A4\uC758 \uC7AC\uC9C8/\uBE5B 1:1 \uCE74\uD53C", discipline: "MINDSET: 'I am a blank canvas mirroring the reference.' PRIORITY: 1. Exact Style Transfer 2. Identical Material Recreation 3. Match Lighting 1:1.", mj_tags: "exact aesthetic match, perfectly mimicking reference style, identical lighting setup, highly accurate material recreation, 1:1 style copy", auditRules: { maxFx: "Mid", prefMaterial: "Clean", avoid: "None" } },
  { id: "ToyMaker", name: "\u{1F9F8} \uD1A0\uC774 \uBA54\uC774\uCEE4", desc: "\uC544\uD2B8\uD1A0\uC774, \uD50C\uB77C\uC2A4\uD2F1/\uC2E4\uB9AC\uCF58 \uC9C8\uAC10, \uADC0\uC5FD\uACE0 \uB77C\uC6B4\uB4DC\uB41C 3D", discipline: "MINDSET: 'Is this playful, cute, and tactile?' PRIORITY: 1. Soft Rounded Shapes 2. Vibrant Playful Colors 3. Art Toy Aesthetic.", mj_tags: "designer art toy, smooth plastic finish, playful vibrant colors, soft lighting, cute aesthetic, 3d icon style", auditRules: { maxFx: "Low", prefMaterial: "Plastic", avoid: "Gritty" } },
  { id: "PopArt", name: "\u{1F3A8} \uD31D\uC544\uD2B8 \uCEEC\uB7EC\uB9AC\uC2A4\uD2B8", desc: "\uCA0D\uD558\uACE0 \uB300\uBE44\uAC00 \uAC15\uD55C \uD31D\uC544\uD2B8, \uB124\uC628, \uCE94\uB514 \uCEEC\uB7EC", discipline: "MINDSET: 'Does it pop out like candy?' PRIORITY: 1. Extreme Color Contrast 2. Glossy Reflections 3. Trendy Vibe.", mj_tags: "pop art aesthetic, extremely vibrant neon colors, glossy candy finish, trendy typography, editorial photography", auditRules: { maxFx: "Mid", prefMaterial: "Glossy", avoid: "Worn" } },
  { id: "Kawaii", name: "\u2601\uFE0F \uCE74\uC640\uC774 \uD06C\uB9AC\uC5D0\uC774\uD130", desc: "\uADC0\uC5FD\uACE0 \uBABD\uAE00\uBABD\uAE00\uD55C \uD30C\uC2A4\uD154 \uD1A4, \uC19C\uC0AC\uD0D5 \uBD84\uC704\uAE30", discipline: "MINDSET: 'Is this soft, dreamy, and sweet?' PRIORITY: 1. Pastel Colors 2. Soft Textures 3. Dreamy Atmosphere.", mj_tags: "kawaii aesthetic, dreamy pastel color palette, soft fluffy lighting, cute and sweet, dreamy atmosphere", auditRules: { maxFx: "Mid", prefMaterial: "Soft", avoid: "Metallic" } },
  { id: "Cinematic", name: "\u{1F3AC} \uC2DC\uB124\uB9C8\uD2F1 \uB514\uB809\uD130", desc: "\uAC15\uD55C \uBA85\uC554, \uC11C\uC0AC\uC801\uC774\uACE0 \uBB35\uC9C1\uD55C \uD558\uC774\uC5D4\uB4DC \uC5F0\uCD9C", discipline: "MINDSET: 'Is this memorable and epic?' PRIORITY: 1. Visual Focus 2. Extreme Contrast 3. Heavy Metallic Feel.", mj_tags: "dramatic lighting, extreme cinematic contrast, punchy vibrant shading, emotional vibe, AAA game title aesthetic", auditRules: { maxFx: "High", prefMaterial: "Metal", avoid: "Flat" } },
  { id: "DarkSmith", name: "\u2694\uFE0F \uB2E4\uD06C \uD310\uD0C0\uC9C0 \uB300\uC7A5\uC7A5\uC774", desc: "\uB2E4\uD06C \uD310\uD0C0\uC9C0, \uADF8\uC744\uB9B0 \uAE08\uC18D, \uC804\uD22C\uC758 \uD754\uC801", discipline: "MINDSET: 'Was this forged in the abyss?' PRIORITY: 1. Gritty Realism 2. Heavy Metal Focus 3. Ancient Relic Vibe.", mj_tags: "dark fantasy mood, heavy dark metal, ancient relic, forged in fire, battle-worn, gritty realism, abyssal energy", auditRules: { maxFx: "Mid", prefMaterial: "Gritty", avoid: "GlossyPlastic" } }
];
var RENDER_ENGINES2 = [
  { id: "Unreal", name: "\uC5B8\uB9AC\uC5BC \uC5D4\uC9C4 5 (\uC5D0\uD53D/\uAC8C\uC784)", en: "unreal engine 5 style, AAA-quality physically believable surface rendering" },
  { id: "Octane", name: "\uC625\uD14C\uC778 \uB80C\uB354 (\uC2E4\uC0AC/\uD06C\uB9AC\uC2A4\uD0C8/\uD1A0\uC774)", en: "octane render, photorealistic, front-lit studio realism" },
  { id: "Redshift", name: "\uB808\uB4DC\uC2DC\uD504\uD2B8 (\uAD11\uACE0/\uD31D\uC544\uD2B8)", en: "redshift render, vibrant studio lighting, crisp reflections" },
  { id: "VRay", name: "\uBE0C\uC774\uB808\uC774 (\uCC28\uBD84/\uC2A4\uD29C\uB514\uC624)", en: "v-ray render, clean global illumination, realistic studio light" }
];
var PRESET_GROUPS3 = [
  {
    id: "utility",
    icon: "\u{1F6E0}\uFE0F",
    name: "\uCE74\uD53C/\uD2B9\uC218",
    presets: [
      { id: "ref_copy", label: "\u{1F98E} \uB808\uD37C\uB7F0\uC2A4 \uBD84\uC11D \uC2E4\uD589 (1:1 \uCE74\uD53C)", settings: {}, description: '\uC0AC\uC774\uB4DC\uBC14\uC758 "\uB808\uD37C\uB7F0\uC2A4 \uC774\uBBF8\uC9C0" \uB97C \uC989\uC2DC \uBD84\uC11D\uD574 \uCE74\uBA5C\uB808\uC628 1:1 \uCE74\uD53C \uC138\uD305\uC744 \uC790\uB3D9 \uC801\uC6A9\uD569\uB2C8\uB2E4. (\uC774 \uBC84\uD2BC = \uC0AC\uC774\uB4DC\uBC14 "\uB808\uD37C\uB7F0\uC2A4 \uBD84\uC11D" \uBC84\uD2BC)' },
      { id: "vfx_pass", label: "\uC774\uD399\uD2B8 \uC18C\uC2A4 \uCD94\uCD9C (\uB9E4\uD2B8)", settings: { vfxPassMode: true, background: "RealBlack", cameraLens: "Telephoto", energyCore: "MagmaEmbers", fxOrigin: "Overall", fxIntensity: "Intense", rimIntensity: "None" }, description: "\uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uBCF8\uCCB4\uB294 \uC644\uC804\uD788 \uBE14\uB799\uC544\uC6C3 \uCC98\uB9AC\uD558\uACE0, \uC8FC\uBCC0\uC5D0 \uBC1C\uC0DD\uD558\uB294 \uC774\uD399\uD2B8 \uC694\uC18C\uB9CC \uBD84\uB9AC\uD558\uC5EC \uCD94\uCD9C\uD569\uB2C8\uB2E4." }
    ]
  },
  {
    id: "toy",
    icon: "\u{1F9F8}",
    name: "\uD1A0\uC774/\uD50C\uB77C\uC2A4\uD2F1",
    presets: [
      { id: "toy_glossy", label: "\uC720\uAD11 \uC544\uD2B8\uD1A0\uC774", settings: { directorPersona: "ToyMaker", material: "GlossyPlastic", frontRelief: "ChunkyToy", surfaceDetail: "Clean", dramaticTex: "None", wearLevel: "None", projectionDepth: "Block", cameraLens: "Standard", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Subtle", rimColor: "White", background: "PureWhite", vfxPassMode: false }, description: "\uB9E4\uB044\uB7FD\uACE0 \uBC18\uC9DD\uC774\uB294 \uC720\uAD11 \uD50C\uB77C\uC2A4\uD2F1 \uC7A5\uB09C\uAC10 \uC9C8\uAC10. \uB465\uAE00\uACE0 \uADC0\uC5EC\uC6B4 \uB369\uC5B4\uB9AC\uAC10\uC774 \uD2B9\uC9D5\uC785\uB2C8\uB2E4." },
      { id: "toy_matte", label: "\uC18C\uD504\uD2B8 \uBB34\uAD11 \uC2E4\uB9AC\uCF58", settings: { directorPersona: "ToyMaker", material: "SoftSilicone", frontRelief: "SoftRounded", surfaceDetail: "Standard", dramaticTex: "None", wearLevel: "None", projectionDepth: "Shallow", cameraLens: "Standard", energyCore: "None", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Moderate", rimColor: "PastelPink", background: "StudioGray", vfxPassMode: false }, description: "\uBCF4\uB4E4\uBCF4\uB4E4\uD558\uACE0 \uB9E4\uD2B8\uD55C \uC2E4\uB9AC\uCF58 \uC7AC\uC9C8. \uD30C\uC2A4\uD154 \uD1A4\uC758 \uCC28\uBD84\uD558\uACE0 \uACE0\uAE09\uC2A4\uB7EC\uC6B4 \uC544\uD2B8\uD1A0\uC774 \uAC10\uC131." }
    ]
  },
  {
    id: "candy",
    icon: "\u{1F36C}",
    name: "\uCE94\uB514/\uD48D\uC120",
    presets: [
      { id: "jelly_gummy", label: "\uD22C\uBA85 \uAD6C\uBBF8 \uC824\uB9AC", settings: { directorPersona: "Kawaii", material: "GummyJelly", frontRelief: "ChunkyToy", surfaceDetail: "Clean", dramaticTex: "SugarCoating", wearLevel: "None", projectionDepth: "Block", cameraLens: "Macro", energyCore: "SoapBubbles", fxOrigin: "Overall", fxIntensity: "Subtle", rimIntensity: "Strong", rimColor: "White", background: "PureWhite", vfxPassMode: false }, description: "\uBE5B\uC774 \uD22C\uACFC\uB418\uB294 \uBC18\uD22C\uBA85\uD558\uACE0 \uCAC0\uB4DD\uD55C \uC824\uB9AC \uC7AC\uC9C8. \uAC89\uBA74\uC5D0 \uB2EC\uCF64\uD55C \uC124\uD0D5 \uCF54\uD305\uC774 \uBB3B\uC5B4\uC788\uC2B5\uB2C8\uB2E4." },
      { id: "balloon_foil", label: "\uD638\uC77C \uD30C\uD2F0 \uD48D\uC120", settings: { directorPersona: "PopArt", material: "FoilBalloon", frontRelief: "PuffyBalloon", surfaceDetail: "Standard", dramaticTex: "None", wearLevel: "None", projectionDepth: "Shallow", cameraLens: "Wide", energyCore: "ConfettiPop", fxOrigin: "Overall", fxIntensity: "Moderate", rimIntensity: "Strong", rimColor: "White", background: "ChromaGreen", vfxPassMode: false }, description: "\uBE75\uBE75\uD558\uAC8C \uACF5\uAE30\uAC00 \uCC2C \uD638\uC77C \uD30C\uD2F0 \uD48D\uC120. \uCA0D\uD55C \uBC18\uC0AC\uC640 \uC8FC\uBCC0\uC5D0 \uD769\uB0A0\uB9AC\uB294 \uC0C9\uC885\uC774 \uD3ED\uC8FD \uD6A8\uACFC\uAC00 \uC5F0\uCD9C\uB429\uB2C8\uB2E4." }
    ]
  },
  {
    id: "gold",
    icon: "\u{1F7E1}",
    name: "\uD669\uAE08/\uAC15\uCCA0",
    presets: [
      { id: "gold_relic", label: "\uACE0\uB300 \uC720\uBB3C (MMO)", settings: { directorPersona: "DarkSmith", material: "AntiqueGold", frontRelief: "MicroBevel", surfaceDetail: "High", dramaticTex: "AncientErosion", wearLevel: "TimeWorn", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "GoldenDust", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Subtle", background: "RealBlack", vfxPassMode: false }, description: "\uC218\uBC31 \uC678\uACFD\uC120\uC774 \uBD80\uC2DD\uB41C \uACE0\uB300 \uD669\uAE08." },
      { id: "steel_blade", label: "\uCE7C\uB0A0 \uAC15\uCCA0 (MMO)", settings: { directorPersona: "Cinematic", material: "HyperChrome", frontRelief: "HairlineBevel", surfaceDetail: "High", dramaticTex: "ExplosiveFracture", wearLevel: "MicroScratches", projectionDepth: "None", cameraLens: "Telephoto", energyCore: "Sparkling", fxOrigin: "Edges", fxIntensity: "Subtle", rimIntensity: "Moderate", background: "RealBlack", vfxPassMode: false }, description: "\uB0A0\uCE74\uB86D\uAC8C \uBCBC\uB824\uB0B8 \uAE08\uC18D \uC7AC\uC9C8." }
    ]
  }
];
var EDIT_BUDGETS2 = [
  { id: "SilhouetteTrace", name: "\u2702\uFE0F Silhouette Trace (2D \uC2E4\uB8E8\uC5E3 \uC644\uBCBD \uBCF4\uC874)", en: "CRITICAL: EXACT SILHOUETTE TRACE. Treat the input image as an absolute 2D geometry mask. Do NOT regenerate or reinterpret the text. Extrude the exact provided shape into 3D. Preserve every detailed shape, cut, and character feature perfectly." },
  { id: "StyleTransfer", name: "\u{1F3AF} Style Transfer (\uD615\uD0DC \uACE0\uC815 + \uBD84\uC704\uAE30 1:1 \uC644\uBCBD \uBCF5\uC81C)", en: "extreme style transfer, strict shape lock, override original materials to completely match the target reference style 1:1, perfectly mimic the aesthetic" },
  { id: "Locked", name: "Locked (\uC678\uAD00\uB9CC \uCD5C\uC18C \uBCC0\uACBD)", en: "Conservative remix, strict shape lock, preserved exact typography" },
  { id: "Conservative", name: "Conservative (\uD45C\uBA74/\uBE5B \uC704\uC8FC)", en: "Balanced surface remix, strong shape retention" },
  { id: "Expressive", name: "Expressive (\uC5F0\uCD9C \uD655\uC7A5 \uC6B0\uC120)", en: "Expressive remix, flexible shape allowance for intense FX" }
];

// src/apps/RenderMatrixPop/services/promptCompiler.js
var CASUAL_RELIEFS = ["ChunkyToy", "SoftRounded", "PuffyBalloon"];
var HEAVY_MATERIALS = ["RoughStone", "VolcanicRock", "Obsidian", "GothicSteel", "AntiqueGold"];
var generateIR2 = (state, appOptions) => {
  const { directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, fxOrigin, fxIntensity, surfaceDetail, vfxPassMode, enableVfx, enableShadow } = state;
  const activeEnergyCore = enableVfx ? energyCore === "None" ? "GoldenDust" : energyCore : "None";
  const activeBackground = enableVfx ? "pitch black textured slate backdrop, extremely dark moody cinematic vignette, deep dark void, pure deep black presentation canvas highlighting the glowing effects" : getOptionEn3(appOptions.backgrounds, background);
  const ir = {
    _meta: { version: "20.6.1", persona: DIRECTOR_PERSONAS2.find((p) => p.id === directorPersona), complexityLevel: complexity },
    subject: { type: "typography graphic", scale: getOptionEn3(appOptions.typographyScales, typographyScale), fidelity_enforcement: "CRITICAL: Ensure the typography consists of individual, independent cutout letters. It MUST NOT be engraved, etched, or carved into a background plate, stone slab, or wall. EXACT ORIGINAL SILHOUETTE. NO TEXT MUTATION. NO extra letters. Ensure high legibility.", intent: userIntent || null },
    camera_and_depth: { projectionId: projectionDepth, projection: getOptionEn3(appOptions.projectionDepths, projectionDepth), isMinimal: projectionDepth === "None", lens: getOptionEn3(appOptions.cameraLenses, cameraLens) },
    surface_morphology: { reliefId: frontRelief, relief: getOptionEn3(appOptions.frontReliefs, frontRelief), treatment: getOptionEn3(appOptions.surfaceTreatments, surfaceTreatment), wear: getOptionEn3(appOptions.wearLevels, wearLevel) },
    material_stack: { baseId: material, base: getOptionEn3(appOptions.materials, material), intensity: getOptionEn3(appOptions.intensities, materialInt), internal_texture: dramaticTex === "Auto" ? "organically embedded dynamic textures" : getOptionEn3(appOptions.dramaticTextures, dramaticTex), surface_detail: getOptionEn3(appOptions.surfaceDetails, surfaceDetail), integration_rule: "Textures MUST be physically carved or etched INTO the base material. NO floating decals." },
    edge_and_lighting: {
      outline: rimThickness === "None" ? "strictly borderless, seamless organic edges, no outline" : `${getOptionEn3(appOptions.rimThicknesses, rimThickness)} using ${getOptionEn3(appOptions.materials, rimMaterial)}`,
      rim_light: rimColor === "None" ? "no artificial rim light" : `${getOptionEn3(appOptions.rimIntensities, rimIntensity)} ${getOptionEn3(appOptions.rimColors, rimColor)} ambient rim light organically wrapping the 3D surface edges, NOT a uniform line`,
      rimColorId: rimColor,
      glint: enableGlint ? "sharp intense specular highlights mapped dynamically to the uneven surface" : "smooth balanced lighting without sharp glares",
      shadow: enableShadow
    },
    fx: { core: getOptionEn3(appOptions.energyCores, activeEnergyCore), origin: getOptionEn3(appOptions.fxOrigins, fxOrigin), intensity: getOptionEn3(appOptions.fxIntensities, fxIntensity), containment_rule: activeEnergyCore === "None" ? "No FX." : `Ensure FX is ${getOptionEn3(appOptions.fxIntensities, fxIntensity)} and ${getOptionEn3(appOptions.fxOrigins, fxOrigin)}. It MUST NOT overpower the main shape.` },
    environment: { background: activeBackground, engine: RENDER_ENGINES2.find((e) => e.id === renderEngine)?.en || RENDER_ENGINES2[0].en },
    vfxPassMode,
    typographyScale
  };
  if (vfxPassMode) {
    ir.subject.type = "pure pitch-black silhouette typography, holdout matte pass";
    ir.material_stack.base = "Vantablack, completely light-absorbing black hole material";
    ir.material_stack.internal_texture = "none, pure black flat void";
    ir.material_stack.integration_rule = "The text itself MUST be completely unlit and black (#000000). ONLY the surrounding FX should be visible. This is for alpha masking.";
    ir.edge_and_lighting.rim_light = "NO rim light on the text itself";
    ir.edge_and_lighting.glint = "ZERO specular highlights on the text";
    ir.surface_morphology.relief = "Flat 2D cutout silhouette";
  }
  return ir;
};
var generateEditIR2 = (state, appOptions) => {
  const { editBudget, activeEditIntents, cameraLens, frontRelief, editBg, editRearExtrusion, editIntent, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity } = state;
  const budgetLevel = EDIT_BUDGETS2.find((b) => b.id === editBudget);
  const isTransferOrTrace = budgetLevel.id === "StyleTransfer" || budgetLevel.id === "SilhouetteTrace";
  const ir = {
    _meta: { mode: "Micro-Edit", version: "20.6.1" },
    locks: { glyph: "Strictly lock exact character types, sequence, and spacing.", contour: "Preserve original outer silhouette perfectly.", stroke: "Maintain exact stroke thickness and internal counter spaces." },
    budget: budgetLevel,
    camera: getOptionEn3(appOptions.cameraLenses, cameraLens),
    reliefId: frontRelief,
    constraints: {
      anti_mutation: "Do NOT reinterpret letters, do NOT add new text or watermarks.",
      anti_engraving: "CRITICAL: The text MUST be an isolated, individual cutout shape. It MUST NOT be engraved, embossed, or carved into a background plate, stone slab, or solid wall. Each letter must have its own independent 3D shape.",
      fx_containment: "All FX MUST originate from surface cracks/edges and remain tightly bound to the shape. NO floating particles.",
      material_integration: "All textures/FX MUST be physically embedded into the base material. NO floating decals.",
      extrusionId: editRearExtrusion,
      extrusion: editRearExtrusion === "None" ? `[PROJECTION: MINIMAL] solid structural body with minimal side thickness, NO deep rear extrusion, NO heavy 3D block.` : editRearExtrusion === "Shallow" ? "Allow ONLY very shallow thin backward 3D extrusion. NO thick blocks." : "Allow controlled backward 3D extrusion."
    },
    intents: activeEditIntents,
    details: {
      material: activeEditIntents.material || isTransferOrTrace ? `${getOptionEn3(appOptions.materials, editMaterial)}, ${getOptionEn3(appOptions.wearLevels, editWearLevel)}` : null,
      lighting: activeEditIntents.lighting || isTransferOrTrace ? `${getOptionEn3(appOptions.rimIntensities, editRimIntensity)} ${getOptionEn3(appOptions.rimColors, editRimColor)} rim light organically wrapping the edges, NOT a uniform line` : null,
      rimColorId: editRimColor,
      vfx: activeEditIntents.vfx ? `${getOptionEn3(appOptions.fxIntensities, editFxIntensity)} ${getOptionEn3(appOptions.energyCores, editEnergyCore)} originating from ${getOptionEn3(appOptions.fxOrigins, editFxOrigin)}` : null
    },
    customIntent: editIntent || "subtle surface enhancement",
    background: getOptionEn3(appOptions.backgrounds, editBg),
    vfxPassMode: editVfxPassMode
  };
  if (editVfxPassMode) {
    ir.constraints.vfx_pass = "Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. ZERO reflections, ZERO highlights. ONLY render the glowing FX surrounding this black void.";
  }
  return ir;
};
var generateMotionIR2 = (state, appOptions) => {
  const { cameraMotion, vfxDynamics, motionIntent, energyCore } = state;
  return {
    _meta: { mode: "Video-Motion", version: "20.6.1" },
    subject_lock: "CRITICAL: The main typography and object shapes MUST remain perfectly solid and absolutely static. DO NOT morph, warp, melt, or distort the text structural integrity.",
    motion: { camera: getOptionEn3(appOptions.cameraMotions, cameraMotion), dynamics: getOptionEn3(appOptions.motionDynamics, vfxDynamics) },
    customIntent: motionIntent || "",
    energyCore: getOptionEn3(appOptions.energyCores, energyCore)
  };
};
var performLogicAudit2 = (state) => {
  const issues = [];
  if (state.currentView === "editor") {
    const persona = DIRECTOR_PERSONAS2.find((p) => p.id === state.directorPersona);
    if (persona?.auditRules?.maxFx === "None" && state.enableVfx) {
      issues.push({ code: "PERSONA_FX_CLASH", title: `[${persona.name}] \uB8F0 \uC704\uBC18: \uC774\uD399\uD2B8 \uACFC\uB2E4`, desc: "\uD604\uC7AC \uB514\uB809\uD130\uB294 \uC644\uBCBD\uD55C \uD615\uD0DC\uC640 \uC5EC\uBC31\uC744 \uC911\uC2DC\uD558\uBBC0\uB85C \uC8FC\uBCC0 \uC774\uD399\uD2B8\uB97C \uC5B5\uC81C\uD569\uB2C8\uB2E4.", options: [{ label: "A. \uC2DC\uC548 \uBAA8\uB4DC \uB044\uAE30", action: { enableVfx: false } }] });
    }
    if (state.vfxPassMode && !state.enableVfx) {
      issues.push({ code: "VFX_PASS_NO_FX", title: "\uC774\uD399\uD2B8 \uC18C\uC2A4 \uBD84\uB9AC \uBAA8\uB4DC \uCDA9\uB3CC", desc: "\uD0C0\uC774\uD3EC\uADF8\uB798\uD53C\uB97C \uBE14\uB799\uC544\uC6C3\uC2DC\uCF30\uC9C0\uB9CC, \uCD94\uCD9C\uD560 \uC8FC\uBCC0 \uD6A8\uACFC(VFX)\uAC00 \uAEBC\uC838\uC788\uC2B5\uB2C8\uB2E4.", options: [{ label: "A. \uC774\uD399\uD2B8 \uD65C\uC131\uD654", action: { enableVfx: true, energyCore: state.energyCore === "None" ? "MagmaEmbers" : state.energyCore } }, { label: "B. \uB9E4\uD2B8 \uD328\uC2A4 \uB044\uAE30", action: { vfxPassMode: false } }] });
    }
    if (state.typographyScale === "Dense" && (state.surfaceDetail === "High" || state.dramaticTex === "ExplosiveFracture")) {
      issues.push({ code: "DENSE_TEXT_NOISE", title: "\uAC00\uB3C5\uC131 \uC800\uD558 \uC704\uD5D8: \uB514\uD14C\uC77C \uACFC\uB2E4", desc: "\uC791\uAC70\uB098 \uBCF5\uC7A1\uD55C \uAE00\uC528\uC5D0 \uBBF8\uC138 \uC2A4\uD06C\uB798\uCE58\uB098 \uADE0\uC5F4\uC744 \uAC15\uD558\uAC8C \uB123\uC73C\uBA74 \uB80C\uB354\uB9C1\uC774 \uBB49\uAC1C\uC9C8 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", options: [{ label: "A. \uD45C\uBA74 \uB9E4\uB044\uB7FD\uAC8C", action: { surfaceDetail: "Standard", dramaticTex: "None" } }, { label: "B. \uB300\uD615 \uB85C\uACE0\uB85C \uAC04\uC8FC", action: { typographyScale: "Macro" } }] });
    }
  } else if (state.currentView === "edit") {
    if (state.editBudget === "Expressive" && state.editRearExtrusion === "None") {
      issues.push({ code: "EDIT_DEPTH_CONFLICT", title: "\uACFC\uD55C \uC5F0\uCD9C \uD655\uC7A5 + \uB3CC\uCD9C \uC81C\uD55C \uCDA9\uB3CC", desc: "\uC5F0\uCD9C\uC744 \uAC15\uD558\uAC8C \uB113\uD788\uBA74\uC11C(Expressive) \uD6C4\uBA74 \uB3CC\uCD9C\uC740 \uB9C9\uC73C\uBA74 \uC778\uACF5\uC9C0\uB2A5\uC774 \uD63C\uB780\uC744 \uACAA\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", options: [{ label: "A. \uC608\uC0B0 \uBCF4\uC218\uC801\uC73C\uB85C", action: { editBudget: "Conservative" } }, { label: "B. \uC785\uCCB4 \uD5C8\uC6A9", action: { editRearExtrusion: "Shallow" } }] });
    }
    if (state.editVfxPassMode && (!state.activeEditIntents.vfx || state.editEnergyCore === "None")) {
      issues.push({ code: "VFX_PASS_NO_FX", title: "\uC774\uD399\uD2B8 \uC18C\uC2A4 \uBD84\uB9AC \uBAA8\uB4DC \uCDA9\uB3CC", desc: "\uD0C0\uC774\uD3EC\uADF8\uB798\uD53C\uB97C \uBE14\uB799\uC544\uC6C3\uC2DC\uCF30\uC9C0\uB9CC, \uCD94\uCD9C\uD560 \uC8FC\uBCC0 \uD6A8\uACFC(VFX) \uB808\uC774\uC5B4\uAC00 \uD65C\uC131\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.", options: [{ label: "A. \uC774\uD399\uD2B8 \uD65C\uC131\uD654", action: { activeEditIntents: { ...state.activeEditIntents, vfx: true }, editEnergyCore: "GoldenDust" } }, { label: "B. \uC18C\uC2A4 \uBD84\uB9AC \uBAA8\uB4DC \uB044\uAE30", action: { editVfxPassMode: false } }] });
    }
  }
  return issues;
};
var calculateQualityScore2 = (state) => {
  let structure = 100, material = 90, visibility = 95, fxControl = 100;
  if (state.currentView === "editor") {
    if (state.projectionDepth === "Monumental") structure -= 25;
    else if (state.projectionDepth !== "None") structure -= 10;
    if (state.enableVfx && state.complexity === 3) fxControl -= 20;
    if (state.typographyScale === "Dense" && state.surfaceDetail === "High") visibility -= 20;
  } else if (state.currentView === "edit") {
    if (state.editBudget === "Expressive") structure = 70;
    else if (state.editBudget === "Balanced") structure = 85;
    else if (state.editBudget === "Locked" || state.editBudget === "StyleTransfer" || state.editBudget === "SilhouetteTrace") structure = 100;
    if (state.activeEditIntents.material || state.editBudget === "StyleTransfer") material = 95;
    if (state.activeEditIntents.vfx) fxControl = 80;
  } else if (state.currentView === "motion") {
    if (state.cameraMotion !== "Static") structure -= 15;
    if (state.vfxDynamics === "Turbulent") fxControl -= 30;
  }
  return {
    structure: Math.max(0, Math.min(100, structure)),
    material: Math.max(0, Math.min(100, material)),
    visibility: Math.max(0, Math.min(100, visibility)),
    fxControl: Math.max(0, Math.min(100, fxControl))
  };
};
var frontVolumeModifierFor2 = (reliefId) => {
  if (reliefId === "Flat") return "strictly flat front core without deep carving";
  if (reliefId === "MicroBevel") return "maintaining a flat core with only subtle edge bevels, NO deep carving";
  if (reliefId === "HairlineBevel") return "featuring a flat front with microscopic razor-thin edges";
  if (reliefId === "MicroChiseled") return "featuring densely micro-chiseled intricate cuts on the surface";
  if (reliefId === "EdgelessConcave") return "featuring a continuous edge-to-edge concave hollow without any outer borders";
  return "with balanced front volume";
};
var compileNanoBanana2 = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  const fxTag = ir.fx ? ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "" : "";
  if (isVFXPass) {
    const posTags2 = ["masterpiece, best quality, ultra highres, 8k resolution", "pure pitch-black silhouette typography, absolute flat 2d cutout, holdout matte pass, vantablack text, completely unlit, pure #000000 shape", ir.subject.fidelity_enforcement.replace("CRITICAL: ", ""), fxTag, ir.environment.background, ir.environment.engine, ir.subject.intent].filter(Boolean).map((t) => t.trim()).join(", ");
    const negTags2 = ["(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text", "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)", "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"].filter(Boolean).map((t) => t.trim()).join(", ");
    return `${posTags2}

Negative prompt: ${negTags2}`;
  }
  const fvm = frontVolumeModifierFor2(ir.surface_morphology.reliefId);
  const isFlat2D = ir.surface_morphology.reliefId === "Flat" && ir.camera_and_depth.isMinimal;
  const projectionDesc = isFlat2D ? `It is a strictly flat 2D graphic with NO 3D extrusion, NO bevel, NO side thickness, NO depth. The letters lie flat on the canvas like a screen-print, poster art, or distressed paint graphic. All character is in the surface treatment (paint, grunge, distressed texture) \u2014 not in carved geometry.` : ir.camera_and_depth.isMinimal ? `It is presented as a solid structural body with minimal side thickness. Absolutely no rear extrusion, BUT ${fvm}.` : "It is presented with 3D depth and extrusion.";
  const proseLead = isFlat2D ? `A flat 2D typography graphic rendered in a ${ir._meta.persona?.name?.split(" ")[1] || "custom"} style.` : `An epic cinematic typography graphic rendered in a ${ir._meta.persona?.name?.split(" ")[1] || "custom"} style.`;
  const prose = `${proseLead} ${ir.subject.scale}. ${ir.camera_and_depth.lens}. The text is crafted from ${ir.material_stack.base} featuring ${ir.material_stack.internal_texture}. ${projectionDesc}`;
  const posTags = [
    prose,
    "masterpiece, best quality, ultra highres, insanely detailed, 8k resolution",
    isFlat2D ? "isolated standalone flat 2D typography graphic, individual flat letters with NO thickness, clear cutout text shape against background, highly legible, strict 2D planar composition, sticker-flat silhouette" : "isolated standalone typography graphic, individual independent 3D letters, clear cutout text shape against background, highly legible",
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    // 입체감 강제 태그는 3D 모드에서만.
    isFlat2D ? "" : "deep shadowed side walls, dark unlit extrusion, heavy ambient occlusion on thickness",
    // 2D 평면 강조 태그 — distressed/screen-print 표현 강제.
    isFlat2D ? "flat 2D screen-print aesthetic, distressed grunge surface treatment, poster art style, painterly texture inside flat shapes, zero rear extrusion, zero side wall, zero bevel, zero embossing, pure flat silhouette letters" : "",
    ir.subject.fidelity_enforcement.replace("CRITICAL: ", ""),
    ir._meta.persona?.mj_tags?.split(" --no ")[0] || "",
    ir.environment.background,
    // engine 은 3D 모드에서만. 2D 모드는 graphic design 으로.
    isFlat2D ? "2D graphic design, illustration, poster art, NOT a 3D render engine" : ir.environment.engine,
    ir.subject.intent
  ];
  if (ir.edge_and_lighting.shadow && !isFlat2D) posTags.push("grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text");
  const negTags = [
    "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text, floating decal",
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
    "(background plate:2.0), (plaque:2.0), (signboard:2.0), (engraved on a wall:2.0), (solid metal block background:2.0), (stone slab:2.0), (monolith:2.0), (carved into stone:2.0), (text etched into wall:2.0), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, mounted metal plate, flat paper cutout, flat 2d sticker, dull shading, vector graphic",
    "(uniform stroke:1.9), (even border thickness:1.9), (artificial outline:1.9), cheap 3d effect, wordart, 2d border, badge, distorted stroke proportions, altered spacing, (low poly, jagged edges, messy bevel, crunchy artifacts, unrefined sculpt:1.5)",
    "(photoshop bevel and emboss:1.9), (cheap v-carve:1.9), (uniform V-shape depth:1.9), (inner shadow layer style:1.9), (inner stroke:1.9), (fake 2d deboss:1.9), (flat paper with bevel:1.9)",
    "disconnected rim light, floating edge light, artificial halo, separated highlight, (messy edge blending:1.6), detached stroke",
    "(bright side walls:1.5), (overlit extrusion:1.5), (glowing thickness:1.5), washed out sides",
    "messy glow, background clutter",
    "(depth of field:1.9), (bokeh:1.9), (background blur:1.9), (lens blur:1.9), out of focus, soft focus, blurred foreground, blurry edges, smudged",
    "(melted shape:1.5), (illegible:1.5), (transparent text blending into background:1.5), (excessive glow destroying shape:1.5), (loss of silhouette:1.5)",
    "(circular brushing:1.5), (radial metal grain:1.5), (anisotropic reflection:1.5), curved scratches",
    ir.camera_and_depth.isMinimal ? "(heavy 3d block:1.8), (deep rear extrusion:1.8), (massive depth:1.8), visible side walls, tilt" : ir.camera_and_depth.projectionId === "Shallow" ? "(thick extrusion:1.8), (heavy 3d block:1.8), (massive depth:1.8), (deep rear extrusion:1.8)" : ""
  ];
  if (ir.edge_and_lighting.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5), bright glow from below");
  if (!ir.edge_and_lighting.shadow) {
    posTags.push("floating perfectly without floor shadows");
    negTags.push("(drop shadow:1.9), (cast shadow:1.9), (contact shadow:1.9), floating shadow, drop shadow on background");
  }
  if (ir.camera_and_depth.isMinimal) {
    posTags.push("perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition");
    negTags.push("(angled view:1.9), (side view:1.9), (isometric:1.9), (3d perspective:1.9), (tilt:1.9), diagonal, skewed");
  } else if (ir.camera_and_depth.projectionId === "Shallow") {
    posTags.push("straight-on front facing view, dead center, very shallow thin 3d extrusion");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  } else {
    posTags.push("straight-on front facing view, dead center");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  }
  if (state.currentView === "editor" && !state.enableVfx) {
    negTags.push("(particle effects:1.9), (floating dust:1.9), (magic sparkles:1.9), (glowing embers:1.9), (smoke:1.9), (fog:1.9), (mist:1.9), (lens flare:1.9), (bloom:1.9), light leaks, fire, flames, glowing background");
  }
  if (ir._meta.persona?.id === "Chameleon") {
    posTags.push("exactly mimic the lighting and material of the reference, 1:1 precise style copy, highly faithful replication");
  }
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.surface_morphology.reliefId);
  if (isFlat2D) {
    posTags.push("flat painted shapes, distressed brush-stroke surface, grunge ink texture inside the flat silhouette, no carved geometry");
    negTags.push("(rigid hard-surface:1.7), (precise metallic structure:1.7), (plastic, toy, balloon, inflatable, bubble text:1.4)");
  } else if (!isCasualRelief) {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
    negTags.push("(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)");
  } else {
    posTags.push("soft rounded edges, smooth playful design, delightful aesthetic, soft curves");
    negTags.push("(sharp edges:1.5), (dangerous:1.5), (aggressive geometric cuts:1.5), dark fantasy, gritty, grunge, battle damage");
  }
  if (HEAVY_MATERIALS.includes(ir.material_stack.baseId)) {
    posTags.push("CRITICAL: MUST BE INDIVIDUAL CUTOUT LETTERS ONLY, NO BACKGROUND SLAB");
    negTags.push("(massive stone slab:2.0), (engraved into rock:2.0), (carved monolith:2.0), (background stone wall:2.0), (text carved into a solid block:2.0)");
  }
  if (["MicroBevel", "HairlineBevel", "Flat"].includes(ir.surface_morphology.reliefId)) {
    negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (state.typographyScale === "Dense") {
    posTags.push("clean legible typography, simplified readable shapes");
    negTags.push("(excessive noise, cluttered details, unreadable, chaotic textures:1.5)");
  }
  const isChameleon = ir._meta.persona?.id === "Chameleon";
  if (isChameleon) {
    posTags.push("preserve the exact color palette from the reference image, maintain the reference's exact hue and saturation, 1:1 color matching, single-tone color fidelity if the reference is monochrome");
    negTags.push("(multi-color rainbow palette:2.0), (polychrome:2.0), (rainbow colors:1.9), (multi-hue gradient:1.8), (over-saturation:1.6), (color shifting:1.6), (introducing new colors not in the reference:1.8)");
  } else {
    posTags.push("highly saturated, punchy vibrant colors, rich deep colors");
    if (!isFlat2D) posTags.push("cinematic color grading");
    negTags.push("(washed out:1.5), (desaturated:1.5), (dull colors:1.5), faded, grayscale, (dark, underexposed, gloomy:1.5)");
  }
  if (isFlat2D) {
    posTags.push("uniform graphic lighting suitable for flat 2D poster, even illumination across the flat silhouette, NO volumetric lighting, NO specular highlights on side walls (there are no side walls), preserve clean silhouette edges, flawless silhouette boundary, surface treatment lives only inside the flat shape, clean and readable typography");
  } else {
    posTags.push("dramatic directional lighting, clearly lit front face, side thickness falls into deep shadow, preserve clean silhouette edges, flawless silhouette boundary, surface detail must not distort the outer contour, damage stays inside the front face only, clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights on edges, high-end PBR shading, strong material contrast");
  }
  posTags.push(ir.surface_morphology.relief, ir.surface_morphology.wear !== "factory-new flawless state" ? ir.surface_morphology.wear : "");
  if (isFlat2D) {
    posTags.push("painterly grunge texture printed onto the flat letter shape, distressed surface treatment");
  } else {
    posTags.push(ir.edge_and_lighting.rim_light, ir.edge_and_lighting.glint, "texture physically embedded into material");
  }
  if (fxTag) posTags.push(fxTag);
  if (state.surfaceDetail === "Clean") negTags.push("scratches, grunge, noise, dents, dust, imperfections, distressed surface");
  if (isFlat2D) {
    negTags.push("(3D extrusion:2.0), (rear extrusion:2.0), (side walls:2.0), (thickness:2.0), (depth:1.9), (bevel:2.0), (embossing:1.9), (chiseled:1.9), (carved:1.9), (relief:1.9), (sculpted volume:1.9), (3D render:1.7), (cinematic 3D:1.7), (AAA game logo:1.7), (PBR shading:1.7), (rim light wrapping around volume:1.5), (drop shadow:1.7), (cast shadow:1.7), (ambient occlusion:1.7), (specular highlight on side walls:1.8)");
  }
  return `${posTags.filter(Boolean).map((t) => t.trim()).join(", ")}

Negative prompt: ${negTags.filter(Boolean).map((t) => t.trim()).join(", ")}`;
};
var compileChatGPT2 = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  let depthStr = ir.camera_and_depth.projection;
  if (isVFXPass) {
    return `Create an epic masterpiece image based on the following exact specifications.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Constraint**: ${ir.subject.fidelity_enforcement}
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. The text itself must be an invisible black hole. ONLY render the glowing FX surrounding this black void.

### 2. Surrounding VFX
- **FX Type**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."}
- **Rule**: ${ir.fx.containment_rule}

### 3. Environment
- **Canvas**: ${ir.environment.background}
- **Render Engine**: ${ir.environment.engine}`;
  }
  if (ir.camera_and_depth.isMinimal) depthStr = `CRITICAL RULE: The typography must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. All dimensionality must exist only inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.`;
  else if (ir.camera_and_depth.projectionId === "Shallow") depthStr = `CRITICAL RULE: The typography must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.`;
  const lensDirective = `
- **Lens & Perspective**: ${ir.camera_and_depth.lens}. CRITICAL: Use infinite depth of field. Every part of the text must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let materialRule = ir.material_stack.integration_rule + " Must look highly organic, authentic, and photorealistic (PBR). Ensure extreme sharpness and elegant details. The surface must not look blurry or low-resolution. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving. Do NOT use fake inner shadow or inner stroke layer styles.";
  materialRule += " CRITICAL: The typography MUST consist of individual cutout letters. It MUST NOT be engraved, etched, or carved into a background plate or stone slab.";
  materialRule += " CRITICAL: Do NOT let transparent ice blend into the background. Do NOT let glowing lava melt or break the shape. High legibility is mandatory. Ensure strictly linear brushed patterns if brushed metal is used, NO circular or radial grain.";
  if (ir._meta.persona?.id === "Chameleon") {
    materialRule += " UNIVERSAL COPY RULE: Disregard inherent genre biases. You MUST PERFECTLY COPY AND REPLICATE the material, texture, lighting, and general aesthetic vibe from the provided reference or intent.";
  }
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.surface_morphology.reliefId);
  if (!isCasualRelief) {
    materialRule += " AVOID decorative filigree, floral patterns, or ornate engravings. The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  } else {
    materialRule += " The object should embrace soft, rounded, playful aesthetic without sharp, dangerous geometric corners. Emphasize delightful toy-like or inflatable volumes if applicable.";
  }
  if (HEAVY_MATERIALS.includes(ir.material_stack.baseId)) {
    materialRule += " CRITICAL WARNING: Because the material is stone/rock/metal, you MUST NOT render a massive stone background or a monolith. The letters MUST float individually without being carved into a wall.";
  }
  if (state.surfaceDetail === "Clean") materialRule += " Ensure the surface is perfectly smooth and clean, absolutely NO scratches or grunge.";
  if (state.surfaceDetail === "High") materialRule += " Add intense micro-details, fine hairline scratches, and rich tactile texture.";
  if (state.typographyScale === "Dense") materialRule += " VERY IMPORTANT: Because the text is dense/complex, prioritize legibility. Reduce excessive noise or overly deep fractures that might make the letters unreadable. Keep the boundaries crisp.";
  const isFlat2D = ir.surface_morphology.reliefId === "Flat" && ir.camera_and_depth.isMinimal;
  if (isFlat2D) {
    depthStr = `CRITICAL ABSOLUTE RULE: This is a FLAT 2D graphic. The letters lie completely flat on the canvas. There is NO 3D extrusion, NO rear depth, NO side walls, NO bevel, NO embossing, NO carved relief. All character must exist in the surface treatment (paint, grunge, distressed texture, screen-print) \u2014 not in geometry. Treat it like poster art, a movie title card, or a screen-printed graphic. The camera is perfectly straight-on, dead center.`;
    materialRule += " CRITICAL 2D OVERRIDE: This reference is flat 2D, NOT a 3D rendered object. The material must read as surface paint/grunge/distressed ink on a flat shape, NOT as PBR shaded geometry. DO NOT add rim lights wrapping around volume, DO NOT add specular highlights on side walls (there are no side walls), DO NOT add cast shadows that imply depth. Lighting must be uniform and graphic, NOT volumetric.";
  }
  return `Create an epic masterpiece image based on the following exact specifications.

### 1. Core Directives
- **Type**: ${isFlat2D ? "Isolated standalone FLAT 2D typography graphic with NO 3D depth, NO extrusion, NO bevel." : "Isolated standalone typography graphic."} ${ir.subject.scale}.
- **Vibe**: ${ir._meta.persona?.discipline || "custom"}
- **Constraint**: ${ir.subject.fidelity_enforcement}
${isFlat2D ? "- **Dimensional Read**: STRICTLY 2D FLAT. This is graphic art, not a rendered 3D object." : ""}

### 2. Camera & Depth
- **Perspective**: ${depthStr}${lensDirective}
- **Relief**: ${ir.surface_morphology.relief} with ${ir.surface_morphology.treatment}

### 3. Layered Material Stack
- **Base Material**: ${ir.material_stack.base} (${ir.surface_morphology.wear})
- **Internal Texture**: ${ir.material_stack.internal_texture}
- **Color Grading**: ${ir._meta?.persona?.id === "Chameleon" ? "CRITICAL: Preserve the EXACT color palette from the reference image. Match the reference hue and saturation 1:1. If the reference is monochrome (single hue), the output MUST also be monochrome. DO NOT introduce new colors. DO NOT create a rainbow / multi-color / polychrome palette. NO over-saturation." : "Highly saturated, punchy vibrant colors, rich deep colors. Never washed out or dull."}
- **Rule**: ${materialRule}

### 4. Lighting & VFX
- **Lighting**: ${isFlat2D ? `Uniform graphic lighting suitable for a flat 2D poster. NO volumetric lighting, NO rim lights wrapping around 3D forms, NO specular highlights on side walls. Keep everything inside the 2D plane.` : `Dramatic directional lighting. Clearly lit front face, but any side thickness MUST fall into deep dark shadow. Avoid overlit side planes. ${ir.edge_and_lighting.glint}. Add ${ir.edge_and_lighting.rim_light}. ${ir.edge_and_lighting.rimColorId === "None" ? "CRITICAL: Do not add any glowing underlight or bottom light." : ""} Ensure perfect exposure on the front, deep controlled shadows on the sides, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.`}
- **Optical Integration**: ${isFlat2D ? "Pure flat graphic \u2014 no optical depth cues." : "Edge highlights and rim lights MUST be physically integrated into the surface edges only. Strictly NO floating glow, detached halos, or separated stroke lines. Do NOT overexpose the side extrusions."}
- **Edge/Outline**: ${ir.edge_and_lighting.outline}
- **Surrounding VFX**: ${ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core}. Origin: ${ir.fx.origin}.` : "No surrounding FX."} ${ir.fx.containment_rule}
${state.currentView === "editor" && !state.enableVfx ? "- **VFX RULE**: Ensure absolutely ZERO particles, zero dust, zero smoke, and zero lens flares. Keep the background completely clean." : ""}

### 5. Environment
- **Canvas**: Maintain ${ir.environment.background}. CRITICAL: The text must be an isolated, standalone graphic. Do NOT engrave the text onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the text cutout.
- **Shadow**: ${isFlat2D ? "ABSOLUTELY ZERO 3D drop shadows. NO cast shadows that imply depth. The graphic exists in a pure 2D plane." : ir.edge_and_lighting.shadow ? "MUST include grounded realistic drop shadow and cast shadows on the background canvas." : "ABSOLUTELY ZERO drop shadows. No cast shadows. The text must appear to be floating."}
- **Render Engine**: ${isFlat2D ? "2D graphic design / illustration (NOT a 3D render engine)." : ir.environment.engine}
${ir.subject.intent ? `
### 6. Special Intent
- ${ir.subject.intent}` : ""}`;
};
var compileMidjourney2 = (ir, state) => {
  const isVFXPass = state.vfxPassMode || ir.vfxPassMode;
  const fxPhrase = ir.fx ? ir.fx.core !== "no surrounding FX" ? `${ir.fx.intensity} ${ir.fx.core} ${ir.fx.origin}` : "" : "";
  const intent = ir.subject.intent ? `, ${ir.subject.intent}` : "";
  if (isVFXPass) {
    const subject2 = `pure pitch-black silhouette typography, holdout matte pass`;
    const lightingFx2 = `${fxPhrase}, ${ir.environment.background}`;
    const mjNegatives2 = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
    return `/imagine prompt: ${subject2}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx2} ${intent} ${mjNegatives2}--style raw --v 6.1`.replace(/\s+/g, " ").replace(/, ,/g, ",");
  }
  const isFlat2D = ir.surface_morphology.reliefId === "Flat" && ir.camera_and_depth.isMinimal;
  let subject = isFlat2D ? `flat 2D typography graphic poster, screen-print aesthetic, isolated standalone graphic, clear cutout text shape against background, individual flat letters with NO thickness, NO 3D extrusion, NO bevel, NO embossing, distressed grunge surface treatment, painterly texture inside flat shapes, sticker-flat silhouette, strict 2D planar composition, highly legible, ${ir.subject.scale}, ${ir.camera_and_depth.lens}, ${ir.subject.fidelity_enforcement}, ${ir.surface_morphology.relief}` : `cinematic legendary logo, isolated standalone typography graphic, clear cutout text shape against background, individual independent 3D letters, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.subject.scale}, ${ir.camera_and_depth.lens}, ${ir.subject.fidelity_enforcement}, ${ir.camera_and_depth.isMinimal ? "solid structural body with minimal side thickness, zero deep rear extrusion" : ir.camera_and_depth.projection}, ${ir.surface_morphology.relief}`;
  let detailTag = "";
  if (state.surfaceDetail === "Clean") detailTag = "perfectly smooth flawless clean surface, ";
  else if (state.surfaceDetail === "High") detailTag = "intense micro-details, fine hairline scratches, rich surface noise, ";
  const colorMood = ir._meta.persona?.id === "Chameleon" ? "preserve exact reference color palette, 1:1 color matching, monochrome if reference is monochrome, no rainbow, no polychrome, no over-saturation" : "highly saturated, punchy vibrant colors";
  const materialMood = `${ir._meta.persona?.discipline || ""}, ${ir._meta.persona?.mj_tags || ""}, ${colorMood}, ${detailTag}${ir.material_stack.base} material with ${ir.material_stack.internal_texture}, ${ir.surface_morphology.wear} surface`;
  let lightingFx = isFlat2D ? `${fxPhrase}, uniform graphic lighting for flat 2D poster, no volumetric lighting, no rim wrapping around 3D volume, ${ir.edge_and_lighting.outline}, ${ir.environment.background}`.replace(/^,\s*/, "") : `${fxPhrase}, dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion, ${ir.edge_and_lighting.outline}, ${ir.edge_and_lighting.rim_light}, physically attached specular highlights, ${ir.edge_and_lighting.glint}, deep controlled shadows, clean high-value highlights, strong material contrast, ${ir.environment.background}`.replace(/^,\s*/, "");
  if (ir.edge_and_lighting.shadow) lightingFx += ", grounded with realistic drop shadow, soft cast shadow on backdrop, deep contact shadow anchoring the text";
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, stone slab, monolith, carved into stone, text etched into wall, floating effects, background clutter, text mutation, extra letters, altered silhouette, random text, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, flat paper cutout, flat 2d sticker, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
  if (ir.edge_and_lighting.rimColorId === "None") mjNegatives += "bottom light, underglow, colored rim light, bright glow from below, ";
  if (!ir.edge_and_lighting.shadow) {
    subject += ", floating perfectly without floor shadows";
    mjNegatives += "drop shadow, cast shadow, contact shadow, drop shadow on background, shadow behind text, ";
  }
  if (ir.camera_and_depth.isMinimal) {
    subject += ", perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition";
    mjNegatives += "angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, heavy 3d block, perspective depth, deep rear extrusion, ";
  } else if (ir.camera_and_depth.projectionId === "Shallow") {
    subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
    mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, chunky text, ";
  } else {
    subject += ", straight-on front facing view, dead center";
    mjNegatives += "extreme angled view, side view, tilt, ";
  }
  if (state.currentView === "editor" && !state.enableVfx) mjNegatives += "particle effects, floating dust, magic sparkles, glowing embers, smoke, fog, mist, lens flare, bloom, light leaks, fire, flames, glowing background, ";
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.surface_morphology.reliefId);
  if (!isCasualRelief) {
    lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
    mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, filigree, floral patterns, decorative ornaments, ornate engravings, ";
  }
  if (HEAVY_MATERIALS.includes(ir.material_stack.baseId)) {
    subject += ", CRITICAL: INDIVIDUAL CUTOUT LETTERS ONLY, NO BACKGROUND SLAB";
    mjNegatives += "massive stone slab, engraved into rock, carved monolith, background stone wall, text carved into a solid block, ";
  }
  if (ir.camera_and_depth.isMinimal) mjNegatives += "heavy 3d block, perspective depth, deep rear extrusion, isometric, angled view ";
  if (state.surfaceDetail === "Clean") mjNegatives += "scratches, grunge, noise, dents, dust, imperfections ";
  if (state.typographyScale === "Dense") mjNegatives += "excessive noise, cluttered details, unreadable, chaotic textures ";
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (["MicroBevel", "HairlineBevel", "Flat"].includes(ir.surface_morphology.reliefId)) {
    mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  }
  if (isFlat2D) {
    mjNegatives += "3D extrusion, rear extrusion, side walls, thickness, depth, bevel, embossing, chiseled, carved, relief, sculpted volume, 3D render, cinematic 3D, AAA game logo, PBR shading, rim light wrapping around volume, specular highlights on side walls, ambient occlusion, drop shadow implying depth, ";
  }
  if (ir._meta.persona?.id === "Chameleon") {
    mjNegatives += "multi-color rainbow palette, polychrome, multi-hue gradient, rainbow colors, color shifting, over-saturation, introducing new colors not in the reference, ";
  }
  const srefHint = ir._meta.persona?.id === "Chameleon" ? " --sref [INSERT_YOUR_REFERENCE_IMAGE_URL_HERE] --sw 1000" : "";
  const engineTag = isFlat2D ? "2D graphic design, illustration" : ir.environment.engine;
  return `/imagine prompt: ${subject}, ${materialMood}, ${lightingFx}, ${engineTag}, perfectly exposed, vivid, highly detailed${intent} ${mjNegatives}--style raw --v 6.1${srefHint}`.replace(/\s+/g, " ").replace(/, ,/g, ",");
};
var editFrontVolumeFor = (reliefId) => {
  if (reliefId === "Flat") return "strictly flat front core without deep carving";
  if (reliefId === "MicroBevel") return "maintaining a flat core with only subtle edge bevels, NO deep carving";
  if (reliefId === "HairlineBevel") return "featuring a flat front with microscopic razor-thin edges";
  if (reliefId === "MicroChiseled") return "featuring densely micro-chiseled intricate cuts on the surface";
  if (reliefId === "Crystalline") return "featuring sharp crystalline geometric facets and deep jewel-like cuts";
  return "with balanced front volume";
};
var compileEditNanoBanana2 = (ir, state) => {
  if (ir.vfxPassMode) {
    const posTags2 = [
      "masterpiece, best quality, ultra highres, 8k resolution",
      "pure pitch-black silhouette typography, holdout matte pass, vantablack text, completely unlit, pure #000000 shape",
      ir.details.vfx || "",
      ir.background,
      ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : ""
    ].filter(Boolean).map((t) => t.trim()).join(", ");
    const negTags2 = [
      "(worst quality, low quality:1.4), text mutation, extra letters, hallucinated text",
      "(rim light:1.8), (edge highlight:1.8), (glowing edge:1.8), (3d:1.8), (thickness:1.8), (extrusion:1.8), (bevel:1.8), (metallic:1.8), (reflections:1.8), (lighting on text:1.8), (3d block:1.8)",
      "lit text, text texture, outline, border, drop shadow, inner glow, lens flare"
    ].filter(Boolean).map((t) => t.trim()).join(", ");
    return `${posTags2}

Negative prompt: ${negTags2}`;
  }
  const fvm = editFrontVolumeFor(ir.reliefId);
  const projectionTag = ir.constraints.extrusion.includes("MINIMAL") ? `solid structural body with minimal side thickness, absolutely no rear extrusion, BUT ${fvm}` : "allow 3d extrusion";
  let budgetEn = ir.budget.en;
  if (ir.budget.id === "StyleTransfer") budgetEn = "CRITICAL: EXACT 1:1 STYLE TRANSFER FROM REFERENCE, perfectly mimic the aesthetic, identical material recreation";
  else if (ir.budget.id === "SilhouetteTrace") budgetEn = "CRITICAL: EXACT SILHOUETTE TRACE, perfect geometric replication of the input mask";
  const posTags = [
    "masterpiece, best quality, ultra highres, 8k resolution, perfectly exposed, bright base material",
    "isolated standalone typography graphic, individual independent 3D letters, clear cutout text shape against background",
    "CRITICAL: TEXT MUST NOT BE ENGRAVED INTO A WALL OR PLATE. Each letter is a separate 3D object.",
    "clean and readable typography, rich luminous midtones, elegant material finish, crisp specular highlights, clearly lit front face, deep shadowed side walls",
    "highly saturated, punchy vibrant colors, cinematic color grading, rich deep colors",
    "infinite depth of field, entirely in focus, edge-to-edge sharp focus, zero background blur, crisp and clear entire frame",
    budgetEn,
    "Use the input image as the exact structural reference",
    "strict shape lock, exact silhouette preservation, preserve the original typography silhouette, spacing, stroke proportions, and letter shapes",
    ir.camera,
    projectionTag,
    ir.details.material ? `change material to ${ir.details.material}` : "",
    ir.details.lighting ? `dynamic lighting, ${ir.details.lighting}, physically attached specular highlights` : "",
    ir.details.vfx ? `surrounding VFX, ${ir.details.vfx}, contained energy` : "",
    ir.customIntent !== "subtle surface enhancement" ? ir.customIntent : "",
    "texture physically embedded into material",
    ir.background
  ];
  const negTags = [
    "(worst quality, low quality:1.4), (washed out:1.5), (desaturated:1.5), (dull colors:1.5), (noisy, dirty surface, overcooked, dark patches, messy shading, burnt shadows:1.5), (dark, underexposed, gloomy:1.5)",
    "text mutation, shape drift, stroke swell, extra letters, hallucinated text, floating decal, material sticker, distorted stroke proportions, altered spacing",
    "(runes, hieroglyphs, symbols, written text on surface, watermark, gibberish:1.6), (merged letters, illegible blob, melted together, fused typography:1.5)",
    "(background plate:2.0), (plaque:2.0), (signboard:2.0), (engraved on a wall:2.0), (solid metal block background:2.0), (stone slab:2.0), (monolith:2.0), (carved into stone:2.0), (text etched into wall:2.0), (framed:1.8), (box around text:1.8), text engraved on surface, shield, baseplate, flat paper cutout, flat 2d sticker, mounted metal plate, vector graphic",
    ir.constraints.extrusionId === "None" ? "(heavy 3d block:1.8), (isometric:1.8), (perspective:1.8), (side view:1.8), (angled view:1.8), visible sides, tilt, (deep rear extrusion:1.8)" : ir.constraints.extrusionId === "Shallow" ? "(thick extrusion:1.8), (heavy 3d block:1.8), (massive depth:1.8), (deep rear extrusion:1.8), (chunky text:1.8)" : "(thick extrusion:1.4), (heavy 3d block:1.4)",
    "(uniform stroke:1.9), (even border thickness:1.9), (artificial outline:1.9), (unnatural outline:1.5), (glowing border:1.5), cheap 3d effect, wordart, 2d border, (low poly, jagged edges, messy bevel, crunchy artifacts, unrefined sculpt:1.5)",
    "(photoshop bevel and emboss:1.9), (cheap v-carve:1.9), (uniform V-shape depth:1.9), (inner shadow layer style:1.9), (inner stroke:1.9), (fake 2d deboss:1.9), (flat paper with bevel:1.9)",
    "floating FX, background noise, messy glow, overglare, disconnected rim light, floating edge light, artificial halo, separated highlight, (messy edge blending:1.6), detached stroke, (depth of field:1.9), (bokeh:1.9), (background blur:1.9), (lens blur:1.9), out of focus, soft focus, blurred foreground, blurry edges, smudged",
    "(melted shape:1.5), (illegible:1.5), (transparent text blending into background:1.5), (excessive glow destroying shape:1.5), (loss of silhouette:1.5)",
    "(bright side walls:1.5), (overlit extrusion:1.5), (glowing thickness:1.5)",
    "(circular brushing:1.5), (radial metal grain:1.5), (anisotropic reflection:1.5), curved scratches"
  ];
  if (ir.details.rimColorId === "None") negTags.push("(bottom light:1.8), (underglow:1.8), (colored rim light:1.5)");
  if (ir.constraints.extrusionId === "None") {
    posTags.push("perfectly straight-on front facing view, dead center orthographic layout, strict 2D planar composition");
    negTags.push("(angled view:1.9), (side view:1.9), (isometric:1.9), (3d perspective:1.9), (tilt:1.9), diagonal, skewed");
  } else if (ir.constraints.extrusionId === "Shallow") {
    posTags.push("straight-on front facing view, dead center, very shallow thin 3d extrusion");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  } else {
    posTags.push("straight-on front facing view, dead center");
    negTags.push("(extreme angled view:1.5), (side view:1.5), tilt");
  }
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.reliefId);
  if (!isCasualRelief) {
    posTags.push("rigid hard-surface, sharp geometric corners, precise metallic structure");
    negTags.push("(plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style:1.6), (soft rounded bevels, blunt corners, smooth edges:1.5)");
    negTags.push("(filigree, floral patterns, decorative ornaments, ornate engravings:1.5)");
  } else {
    posTags.push("soft rounded edges, smooth playful design, delightful aesthetic, soft curves");
    negTags.push("(sharp edges:1.5), (dangerous:1.5), (aggressive geometric cuts:1.5), dark fantasy, gritty, grunge, battle damage");
  }
  if (state.cameraLens === "Telephoto") negTags.push("(wide angle distortion:1.5), (perspective distortion:1.5), fisheye, vanishing point");
  if (["MicroBevel", "Flat", "HairlineBevel"].includes(ir.reliefId)) {
    negTags.push("(deeply carved:1.5), (heavy embossing:1.5), (intense 3d front:1.5), (deep valleys:1.5), deep chiseled");
  }
  return `${posTags.filter(Boolean).map((t) => t.trim()).join(", ")}

Negative prompt: ${negTags.filter(Boolean).map((t) => t.trim()).join(", ")}`;
};
var compileEditChatGPT2 = (ir) => {
  if (ir.vfxPassMode) {
    return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. VFX EXTRACTION PASS (CRITICAL)
- **Type**: Pure flat 2D pitch-black silhouette typography.
- **Vibe**: Technical Matte Pass for VFX Compositing.
- **Rule (ABSOLUTE)**: Render the typography as a pure Vantablack (#000000), completely unlit flat 2D shape. STRICTLY FORBIDDEN: Do NOT add any rim lights, edge highlights, 3D thickness, bevels, or reflections to the letters. ONLY render the glowing FX surrounding this black void.

### 2. Constraints & Integrity
- **Glyph Lock**: ${ir.locks.glyph}
- **Contour Lock**: ${ir.locks.contour}
- **Anti-Mutation**: ${ir.constraints.anti_mutation}

### 3. Edit Scope & VFX
- **Surrounding VFX**: ${ir.details.vfx || "No VFX specified."}
- **FX Containment**: ${ir.constraints.fx_containment}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}`;
  }
  const intentsArr = [];
  if (ir.details.material) intentsArr.push(`Material Override: ${ir.details.material}`);
  if (ir.details.lighting) intentsArr.push(`Lighting Enhance: ${ir.details.lighting}`);
  if (ir.details.vfx) intentsArr.push(`Contained VFX: ${ir.details.vfx}`);
  let extrConstraint = ir.constraints.extrusion;
  if (ir.constraints.extrusionId === "MINIMAL" || ir.constraints.extrusionId === "None") extrConstraint = "CRITICAL RULE: The object must remain a perfectly front-facing orthographic silhouette. The outer contour must read as a flat 2D cutout shape. Absolutely no rear extrusion, no visible side planes, and no object thickness. All dimensionality must exist only inside the front face as surface relief and shading. The camera MUST be positioned perfectly straight-on, dead center. Absolutely NO angled views, NO side views, NO isometric angles.";
  else if (ir.constraints.extrusionId === "Shallow") extrConstraint = "CRITICAL RULE: The object must have ONLY a very shallow, thin 3D extrusion. Absolutely NO thick heavy 3D blocks. Keep the depth minimal.";
  const lensDirective = `
- **Lens & Perspective**: ${ir.camera}. CRITICAL: Use infinite depth of field. Every part of the object must be entirely in focus. Absolutely NO background blur, NO bokeh, NO blurry edges.`;
  let antiToyRule = " AVOID fake inner shadow or inner stroke layer styles.";
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.reliefId);
  if (!isCasualRelief) antiToyRule += " AVOID decorative filigree, floral patterns, or ornate engravings. The object must have a rigid hard-surface with sharp metallic corners. It MUST NOT look like a plastic toy, a balloon, soft rounded bevels, or an inflatable bubble text.";
  else antiToyRule += " The object should embrace soft, rounded, playful aesthetic without sharp, dangerous geometric corners. Emphasize delightful toy-like or inflatable volumes if applicable.";
  const styleTransferRule = ir.budget.id === "StyleTransfer" ? "CRITICAL: You MUST perform an exact 1:1 style transfer. Override the original image's materials, textures, and lighting to completely match the target aesthetic vibe." : "";
  const silhouetteTraceRule = ir.budget.id === "SilhouetteTrace" ? "CRITICAL: EXACT SILHOUETTE TRACE. You MUST treat the input image as an absolute 2D geometry mask. Do NOT regenerate or reinterpret the text. Extrude the exact provided shape into 3D. Preserve every detailed shape, cut, decoration, and character feature perfectly as it is in the reference. Do NOT replace it with a generic font." : "";
  return `Create a Shape-Locked Image-to-Image Remix based on the exact specifications below.

### 1. Structure Lock (CRITICAL)
- **Reference**: Use the input image as the exact structural reference.
- **Budget Level**: ${ir.budget.name}
${silhouetteTraceRule ? `- **Geometry Mask**: ${silhouetteTraceRule}` : `- **Contour Lock**: ${ir.locks.contour}`}
${styleTransferRule ? `- **Style Transfer**: ${styleTransferRule}` : ""}

### 2. Constraints & Integrity
- **Anti-Mutation (CRITICAL)**: Do NOT hallucinate new typography. Do NOT reinterpret letters. Treat the reference image purely as a visual shape/mask.
- **Material Integration**: ${ir.constraints.material_integration} Must look highly organic, authentic, and photorealistic (PBR). STRICTLY AVOID tacky CGI look. Ensure extreme sharpness and intricate micro-details on the facets. STRICTLY FORBIDDEN: Do NOT use cheap photoshop bevel and emboss effects, and avoid uniform V-shaped carving.${antiToyRule} Ensure straight linear brushed lines, NO circular brushing.
- **Anti-Engraving (CRITICAL)**: ${ir.constraints.anti_engraving} The object MUST remain as independent cutout elements, exactly like the source image. It must NEVER turn into a solid block, monolith, or a wall with shapes etched into it.
- **Optical Integration**: Edge highlights and rim lights MUST be physically integrated into the surface. Strictly NO floating glow, detached halos, or separated stroke lines. Ensure a clearly lit and well-exposed subject. Deep controlled shadows, clean high-value highlights, strong material contrast. Avoid unnatural or uniform glowing borders.
- **Color Grading**: ${ir._meta?.persona?.id === "Chameleon" ? "CRITICAL: Preserve the EXACT color palette from the reference image. Match the reference hue and saturation 1:1. If the reference is monochrome (single hue), the output MUST also be monochrome. DO NOT introduce new colors. DO NOT create a rainbow / multi-color / polychrome palette. NO over-saturation." : "Highly saturated, punchy vibrant colors, rich deep colors. Never washed out or dull."}
- **FX Containment**: ${ir.constraints.fx_containment}
- **Depth/Extrusion**: ${extrConstraint}${lensDirective} Ensure side planes (thickness) fall into deep shadow and do NOT glow brightly.

### 3. Edit Scope & Intents
- **Target Changes**: 
  - ${intentsArr.length > 0 ? intentsArr.join("\n  - ") : "Subtle Polish"}
- **Custom Directive**: ${ir.customIntent}
- **Background**: Maintain ${ir.background}. CRITICAL: The object must be an isolated, standalone graphic. Do NOT engrave it onto a solid metal wall, plaque, or background plate. The background must remain a separate, simple canvas behind the cutout.

*Ensure the output preserves 100% of the original core morphology while only swapping the outer aesthetic layers. Do not use cheap uniform 2D strokes or photoshop bevel effects.*`;
};
var compileEditMidjourney2 = (ir, state) => {
  if (ir.vfxPassMode) {
    const subject2 = `pure pitch-black silhouette typography, holdout matte pass`;
    const lightingFx2 = `${ir.details.vfx || ""}, ${ir.background}`;
    const mjNegatives2 = "--no rim light, edge light, edge highlight, 3d, bevel, thickness, extrusion, metallic, reflections, lit text, text texture, outline, border, floating effects, background clutter, text mutation ";
    return `/imagine prompt: ${subject2}, completely unlit black hole material, zero reflections, zero highlights, ${lightingFx2} ${mjNegatives2}--style raw --v 6.1`.replace(/\s+/g, " ").replace(/, ,/g, ",");
  }
  const intentsArr = [];
  if (ir.details.material) intentsArr.push(`material shift to ${ir.details.material}`);
  if (ir.details.lighting) intentsArr.push(`lighting tune: ${ir.details.lighting}`);
  if (ir.details.vfx) intentsArr.push(`surface VFX: ${ir.details.vfx}`);
  const scope = intentsArr.length > 0 ? intentsArr.join(", ") : "surface polish";
  const custom = ir.customIntent !== "subtle surface enhancement" ? `, ${ir.customIntent}` : "";
  let subject = ir.budget.id === "SilhouetteTrace" ? `exact 3D geometric recreation of the provided image mask, CRITICAL: DO NOT reinterpret as text, treat input as absolute vector silhouette, perfect shape trace, exact detailed contours preserved, individual independent 3D elements, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.camera}` : `cinematic legendary logo remix, isolated standalone typography graphic, individual independent 3D letters, strict shape lock, exact silhouette preservation, Use the input image as the exact structural reference, highly legible, infinite depth of field, entirely in focus, crisp and clear entire frame, ${ir.camera}, ${ir.budget.en}`;
  const styleConstraint = ir.budget.id === "StyleTransfer" ? "CRITICAL: EXACT 1:1 STYLE TRANSFER FROM REFERENCE, perfectly mimic the aesthetic, " : "";
  const constraints = `${styleConstraint}MUST NOT BE ENGRAVED INTO A WALL, independent cutout elements, ${ir.constraints.extrusion}, ${ir.constraints.material_integration}, ${ir.constraints.fx_containment}, physically attached specular highlights, deep controlled shadows, clean high-value highlights, strong material contrast, highly saturated, punchy vibrant colors`;
  let mjNegatives = "--no background plate, plaque, signboard, engraved on a wall, solid metal block background, stone slab, monolith, carved into stone, text etched into wall, text hallucination, new typography, font replacement, shape drift, stroke swell, floating FX, background noise, material sticker, extra letters, runes, hieroglyphs, symbols, written text on surface, watermark, gibberish, merged letters, illegible blob, melted together, uniform stroke, photoshop bevel and emboss, cheap v-carve, wordart, disconnected rim light, floating edge light, artificial halo, separated highlight, dull gray midtones, framed, box around text, shield, emblem, baseplate, drop shadow, cast shadow revealing thickness, inner shadow layer style, inner stroke, fake 2d deboss, flat paper with bevel, washed out, desaturated, faded, unnatural outline, glowing border, depth of field, bokeh, background blur, lens blur, out of focus, soft focus, blurred foreground, blurry edges, smudged, melted shape, illegible, transparent text blending into background, excessive glow destroying shape, loss of silhouette, bright side walls, overlit extrusion, glowing thickness, washed out sides, circular brushing, radial metal grain, anisotropic reflection, curved scratches, ";
  if (ir.constraints.extrusionId === "None" || ir.constraints.extrusionId === "MINIMAL") {
    subject += ", perfectly straight-on front facing view, dead center orthographic layout, 2D flat composition";
    mjNegatives += "angled view, side view, isometric, 3d perspective, tilt, diagonal, skewed, heavy 3d block, perspective depth, deep rear extrusion, ";
  } else if (ir.constraints.extrusionId === "Shallow") {
    subject += ", straight-on front facing view, dead center, very shallow thin 3d extrusion";
    mjNegatives += "extreme angled view, side view, tilt, heavy 3d block, massive depth, thick extrusion, deep rear extrusion, ";
  } else {
    subject += ", straight-on front facing view, dead center";
    mjNegatives += "extreme angled view, side view, tilt, ";
  }
  let lightingFx = "dramatic directional lighting, clearly lit front face, dark shadowed side walls, deep ambient occlusion on extrusion";
  const isCasualRelief = CASUAL_RELIEFS.includes(ir.reliefId);
  if (!isCasualRelief) {
    lightingFx += ", rigid hard-surface, sharp geometric corners, precise metallic structure";
    mjNegatives += "plastic, toy, balloon, inflatable, bubble text, play-doh, soft rounded edges, marshmallow, squishy, 3d render style, soft rounded bevels, blunt corners, smooth edges, filigree, floral patterns, decorative ornaments, ornate engravings, ";
  }
  if (state.cameraLens === "Telephoto") mjNegatives += "wide angle distortion, perspective distortion, fisheye, vanishing point ";
  if (["MicroBevel", "HairlineBevel", "Flat"].includes(ir.reliefId)) mjNegatives += "deeply carved, heavy embossing, intense 3d front, deep valleys, deep chiseled ";
  let mj_iw = "--iw 1.0";
  if (ir.budget.id === "Locked" || ir.budget.id === "SilhouetteTrace") mj_iw = "--iw 2.0";
  else if (ir.budget.id === "Conservative") mj_iw = "--iw 1.5";
  else if (ir.budget.id === "Expressive") mj_iw = "--iw 0.5";
  else if (ir.budget.id === "StyleTransfer") mj_iw = "--iw 1.5";
  const srefHint = ir.budget.id === "StyleTransfer" || ir.budget.id === "SilhouetteTrace" ? " --sref [INSERT_STYLE_REFERENCE_IMAGE_URL_HERE] --sw 1000" : "";
  return `/imagine prompt: ${subject}, applied ${scope}${custom}, ${constraints}, ${lightingFx}, background ${ir.background} ${mjNegatives}${mj_iw}${srefHint} --style raw --v 6.1`.replace(/\s+/g, " ");
};

// src/apps/RenderMatrixPop/constants/categories.js
var INITIAL_OPTIONS2 = {
  typographyScales: [
    { id: "Macro", name: "\uB300\uD615 \uB85C\uACE0 (Macro)", en: "macro photography, hyper-detailed single focal point, large typography" },
    { id: "Dense", name: "\uBCF5\uC7A1/\uC791\uC740 \uD14D\uC2A4\uD2B8 (Dense)", en: "centered composition, medium-wide framing, subject occupies around 50% of the frame, highly legible and clean typography, simplified surface details to maintain readability, crisp clean typographic boundaries, reduced noise" }
  ],
  cameraLenses: [
    { id: "Telephoto", name: "\uB9DD\uC6D0 \uB80C\uC988 (200mm) - \uC65C\uACE1 \uC81C\uAC70", en: "shot on 200mm telephoto lens, extreme perspective compression, flat focal plane, strictly zero perspective distortion" },
    { id: "Standard", name: "\uD45C\uC900 \uB80C\uC988 (50mm) - \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uC2DC\uC57C", en: "shot on 50mm standard lens, natural human eye perspective" },
    { id: "Wide", name: "\uAD11\uAC01 \uB80C\uC988 (24mm) - \uADF9\uC801\uC778 \uC6D0\uADFC\uAC10", en: "shot on 24mm ultra wide angle lens, dramatic perspective distortion, dynamic vanishing point" },
    { id: "Macro", name: "\uB9E4\uD06C\uB85C (100mm) - \uADF9\uC811\uC0AC", en: "shot on 100mm macro lens, extreme close-up, focus stacking, infinite depth of field, edge-to-edge sharp focus, entirely in focus" }
  ],
  intensities: [{ id: "Low", name: "Subtle (\uBBF8\uC138)", en: "ultra-subtle refined details" }, { id: "Mid", name: "Balanced (\uD45C\uC900)", en: "refined balanced finish" }, { id: "High", name: "High-Detail (\uACE0\uBC00\uB3C4)", en: "dense intricate macro detailing" }],
  backgrounds: [
    { id: "RealBlack", name: "Deep Black (Matte)", en: "Pure solid #000000 matte black void, completely clean background" },
    { id: "StudioGray", name: "Neutral Gray", en: "Professional neutral gray with subtle depth" },
    { id: "PureWhite", name: "High-Key White", en: "Pristine white studio background" },
    { id: "ChromaGreen", name: "Chroma Green", en: "Pure chroma green screen #00FF00" }
  ],
  fxOrigins: [
    { id: "Edges", name: "\uAC00\uC7A5\uC790\uB9AC/\uB05D\uBD80\uBD84 \uC9D1\uC911", en: "originating strictly from the sharp edges and tips" },
    { id: "Overall", name: "\uAE00\uC790 \uC804\uCCB4\uB97C \uAC10\uC2F8\uB4EF", en: "softly enveloping the entire typography surface" },
    { id: "BetweenLetters", name: "\uAE00\uC790 \uC0AC\uC774\uB97C \uC5F0\uACB0\uD558\uB4EF", en: "arcing and intertwining between the gaps of the letters" }
  ],
  fxIntensities: [{ id: "Subtle", name: "Subtle (\uC740\uC740\uD558\uAC8C)", en: "very subtle, minimalist, restrained" }, { id: "Moderate", name: "Moderate (\uBCF4\uD1B5)", en: "balanced, clearly visible but non-overpowering" }, { id: "Intense", name: "Intense (\uAC15\uD558\uAC8C)", en: "intense, highly dynamic, dramatic" }],
  surfaceDetails: [
    { id: "Clean", name: "Clean (\uC644\uBCBD\uD788 \uB9E4\uB044\uB7EC\uC6C0)", en: "perfectly smooth, flawless clean surface, absolutely NO scratches" },
    { id: "Standard", name: "Standard (\uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uACB0)", en: "natural physical surface micro-texture" },
    { id: "High", name: "High (\uBBF8\uC138 \uAE30\uC2A4 \uBC00\uB3C4 \uADF9\uB300\uD654)", en: "intense micro-details, fine hairline scratches, refined elegant texture, rich tactile finish" }
  ],
  frontReliefs: [
    { id: "Flat", name: "\uD3C9\uBA74\uD615 (Flat)", en: "strictly flat core surface, no carved depth, subtle material treatment" },
    { id: "MicroBevel", name: "\uBBF8\uC138\uD55C \uAC01 (Micro Bevel)", en: "maintaining flat core with sharp crisp angled micro-bevel on edges ONLY, rigid mechanical corners, NO soft rounded bevels, NO deep carving" },
    { id: "HairlineBevel", name: "\uCD08\uBBF8\uC138 \uCE7C\uAC01 (Hairline Bevel)", en: "microscopic 1px razor-edge highlight, ultra-thin minimal bevel width, sharp crisp boundary" },
    { id: "MicroChiseled", name: "\uB9C8\uC774\uD06C\uB85C \uCE58\uC990\uB9C1 (Micro-Chiseled)", en: "densely micro-chiseled surface, hundreds of tiny intricate cuts, fine jewelry carving, NO large low-poly facets, NO cheap photoshop bevel" },
    { id: "Crystalline", name: "\uD06C\uB9AC\uC2A4\uD0C8 \uD30C\uC14B (Crystalline)", en: "sharp crystalline geometric facets, deep angular jewel-like cuts, rigid hard-surface ice formations, grand clear facets, NO soft bevels" },
    { id: "ChunkyToy", name: "\uB465\uADFC \uB369\uC5B4\uB9AC (Chunky Toy)", en: "soft, thick, rounded chunky toy-like front relief, inflated volume" },
    { id: "SoftRounded", name: "\uBD80\uB4DC\uB7EC\uC6B4 \uACE1\uBA74 (Soft Rounded)", en: "smooth rounded edges, soft filleted corners, gentle curves, NO sharp edges" },
    { id: "PuffyBalloon", name: "\uBE75\uBE75\uD55C \uD48D\uC120 (Puffy Balloon)", en: "puffy inflated balloon shape, thick and bulging volume, overly rounded toy-like form" }
  ],
  projectionDepths: [
    { id: "None", name: "\uCD5C\uC18C \uB3CC\uCD9C (Minimal)", en: "[PROJECTION: MINIMAL] solid structural body with minimal side thickness, absolutely no deep rear 3D extrusion, no heavy perspective block. All dimensional depth must exist exclusively on the front-face." },
    { id: "Shallow", name: "\uC587\uC740 \uB3CC\uCD9C (Shallow)", en: "[PROJECTION: SHALLOW] very thin shallow backward 3D extrusion, subtle slim side thickness, minimal perspective, NO heavy blocks." },
    { id: "Block", name: "\uBE14\uB85D \uB3CC\uCD9C (Blocky)", en: "[PROJECTION: BLOCKY] Solid structural block thickness, distinct side planes and 3D perspective." },
    { id: "Monumental", name: "\uAC70\uB300 \uB3CC\uCD9C (Epic 3D)", en: "[PROJECTION: MONUMENTAL] Massive cinematic backward 3D extrusion, epic perspective depth, deep architectural volume." }
  ],
  surfaceTreatments: [{ id: "Standard", name: "Standard (\uD45C\uC900)", en: "standard physical surface reaction" }, { id: "SmoothFillet", name: "\uB465\uADFC \uAD74\uACE1 (Smooth)", en: "elegant smooth filleted transitions" }, { id: "MultiFaceted", name: "\uB2E4\uAC01 \uBA74\uCE58\uAE30 (Faceted)", en: "highly luminous angular geometric facets" }, { id: "HammeredFinish", name: "\uB9DD\uCE58 \uC790\uAD6D (Hammered)", en: "hand-hammered dimpled organic surface" }, { id: "BrushedMetal", name: "\uC9C1\uC120 \uBE0C\uB7EC\uC2DC \uACB0 (Linear Brushed)", en: "straight linear horizontal brushed metal finish, perfectly parallel brushed lines, NO circular brushing, NO radial patterns" }],
  energyCores: [
    { id: "None", name: "\uC5C6\uC74C (None)", en: "no surrounding FX" },
    { id: "GoldenDust", name: "\uD669\uAE08 \uAC00\uB8E8 \uD769\uBFCC\uB9BC", en: "glowing golden dust and scattering sparks" },
    { id: "ColdMist", name: "\uB0C9\uAE30\uC640 \uC548\uAC1C \uD750\uB984", en: "rising cold mist and flowing icy vapor" },
    { id: "Sparkling", name: "\uBC18\uC9DD\uC774\uB294 \uBE5B/\uAD11\uD0DD", en: "sparkling light effects and intense glossy lens flares" },
    { id: "Electricity", name: "\uD750\uB974\uB294 \uC804\uB958/\uC2A4\uD30C\uD06C", en: "flowing static electricity and micro lightning arcs" },
    { id: "MicroParticles", name: "\uBBF8\uC138 \uD30C\uD2F0\uD074 \uBC1C\uC0B0", en: "emitting luminous micro floating particles" },
    { id: "MagmaEmbers", name: "\uBD88\uD2F0\uC640 \uC544\uC9C0\uB791\uC774", en: "No flames, only very subtle glowing dust and faint residual heat shimmer at sharp edges" },
    { id: "DarkAura", name: "\uB2E4\uD06C \uC624\uB77C", en: "subtle dark wispy shadowy aura creeping tightly" },
    { id: "ConfettiPop", name: "\uC0C9\uC885\uC774 \uD3ED\uC8FD (Confetti)", en: "bursting colorful confetti and party ribbons" },
    { id: "SoapBubbles", name: "\uBE44\uB217\uBC29\uC6B8 (Bubbles)", en: "floating iridescent soap bubbles" },
    { id: "PastelAura", name: "\uD30C\uC2A4\uD154 \uC624\uB77C (Pastel Aura)", en: "soft glowing pastel gradient aura, dreamy atmosphere" }
  ],
  materials: [
    { id: "HyperChrome", name: "\uD558\uC774\uD37C \uD06C\uB86C (Mirror)", en: "High-contrast bright liquid mirror chrome" },
    { id: "MatteGold", name: "\uBB34\uAD11 \uACE8\uB4DC (Matte Gold)", en: "Hardened premium matte gold metal finish, solid metallic structure" },
    { id: "RoughStone", name: "\uAC70\uCE5C \uC11D\uC7AC (Rough Stone)", en: "Raw porous rough stone texture" },
    { id: "VolcanicRock", name: "\uB2E8\uB2E8\uD55C \uD654\uC0B0\uC554 (Volcanic Rock)", en: "Solid dark hardened volcanic rock, deep porous texture, physically un-meltable structure" },
    { id: "FrostedGlass", name: "\uBC18\uD22C\uBA85 \uC720\uB9AC (Frosted)", en: "Frosted sandblasted glass" },
    { id: "IceCrystal", name: "\uB2E8\uB2E8\uD55C \uBE59\uACB0 \uC218\uC815 (Ice Crystal)", en: "Solid opaque ice crystal, frosted surface, crisp structural edges, completely opaque core" },
    { id: "Obsidian", name: "\uC635\uC2DC\uB514\uC5B8 (Obsidian)", en: "Ultra-glossy jet black volcanic glass" },
    { id: "GothicSteel", name: "\uACE0\uB515 \uAC15\uCCA0 (Hardened Steel)", en: "Cold hardened surgical steel" },
    { id: "AntiqueGold", name: "\uC564\uD2F1 \uACE8\uB4DC (Antique Gold)", en: "Aged and darkened rich antique gold" },
    { id: "GlossyPlastic", name: "\uC720\uAD11 \uD50C\uB77C\uC2A4\uD2F1 (Glossy Plastic)", en: "smooth high-gloss shiny plastic, designer art toy material, flawless reflections" },
    { id: "SoftSilicone", name: "\uBB34\uAD11 \uC2E4\uB9AC\uCF58 (Soft Silicone)", en: "soft matte silicone, velvet touch finish, smooth pastel aesthetic" },
    { id: "GummyJelly", name: "\uBC18\uD22C\uBA85 \uC824\uB9AC (Gummy Jelly)", en: "translucent squishy gummy jelly, subsurface scattering, soft inner glow" },
    { id: "FoilBalloon", name: "\uD638\uC77C \uD48D\uC120 (Foil Balloon)", en: "inflated mylar foil balloon material, wrinkled seams, highly reflective puffy metallic film" },
    { id: "FluffyFabric", name: "\uD50C\uB7EC\uC2DC \uC778\uD615 (Fluffy Plush)", en: "soft fluffy plush fabric, hairy fuzzy texture, stuffed animal material" }
  ],
  dramaticTextures: [
    { id: "None", name: "None (\uB9E4\uB044\uB7EC\uC6C0)", en: "flawless polished uniform material" },
    { id: "Auto", name: "AI \uC790\uC728 (Auto)", en: "organically embedded detailed textures" },
    { id: "MicroGrain", name: "\uBBF8\uC138 \uC785\uC790\uACB0 (Micro Grain)", en: "ultra-fine brushed metal grain, intricate microscopic surface texture, highly refined elegant finish" },
    { id: "AncientErosion", name: "\uACE0\uB300 \uD48D\uD654/\uBD80\uC2DD (Erosion)", en: "heavily eroded ancient surface, deep oxidized patina, chipped and weathered organic degradation, physically integrated into the core material, NO written text, NO runes" },
    { id: "ExplosiveFracture", name: "\uC815\uAD50\uD55C \uADE0\uC5F4 (Fracture)", en: "Micro-detailed sharp fractures physically integrated into the core material" },
    { id: "GlowingVeins", name: "\uC740\uC740\uD55C \uBC1C\uAD11 \uB9E5 (Glowing Veins)", en: "Subtle glowing veins deeply etched into the solid core material, strictly contained inner glow, NO outer melting" },
    { id: "Damascus", name: "\uB2E4\uB9C8\uC2A4\uCFE0\uC2A4 (Flow)", en: "swirling organic layered ripples" },
    { id: "GlitterDust", name: "\uAE00\uB9AC\uD130/\uD384 (Glitter)", en: "densely packed sparkling glitter dust embedded in the surface" },
    { id: "SugarCoating", name: "\uC124\uD0D5 \uCF54\uD305 (Sugar Sanded)", en: "coated with semi-translucent sugar crystals, sour patch texture" }
  ],
  rimThicknesses: [{ id: "None", name: "\uC5C6\uC74C (None)", en: "strictly borderless, seamless organic blending edges, no outline" }, { id: "Hairline", name: "\uC544\uC8FC \uAC00\uB294\uC120", en: "microscopic elegant thin edge highlight, organic and uneven" }, { id: "Normal", name: "\uBCF4\uD1B5 \uD14C\uB450\uB9AC", en: "solid structural outer edge, physically carved border with dynamic thickness, NOT a uniform stroke" }],
  wearLevels: [{ id: "None", name: "\uC0C8\uAC83 (Pristine)", en: "factory-new flawless state" }, { id: "MicroScratches", name: "\uBBF8\uC138 \uAE30\uC2A4 (Light Wear)", en: "subtle surface micro-abrasions" }, { id: "TimeWorn", name: "\uC138\uC6D4\uC758 \uD754\uC801 (Time-Worn)", en: "aged and weathered patina" }, { id: "BattleDamage", name: "\uC804\uD22C \uD754\uC801 (Battle-Damaged)", en: "heavy battle-worn damage, deep structural scars, sword cuts, severely chipped and dented edges" }],
  rimColors: [
    { id: "None", name: "\uC5C6\uC74C (None)", en: "no secondary rim light" },
    { id: "White", name: "\uD4E8\uC5B4 \uD654\uC774\uD2B8", en: "clean sharp neutral white rim light" },
    { id: "Blue", name: "\uC544\uC774\uC2A4 \uBE14\uB8E8", en: "cold piercing bright blue rim light" },
    { id: "Amber", name: "\uC5E0\uBC84 \uC624\uB80C\uC9C0", en: "warm glowing intense orange rim light" },
    { id: "MutedGold", name: "\uCC28\uBD84\uD55C \uC6DC\uACE8\uB4DC", en: "desaturated muted gold rim light, subtle elegant warm edge highlight" },
    { id: "NeonPink", name: "\uB124\uC628 \uD551\uD06C", en: "vibrant highly saturated neon pink rim light" },
    { id: "Cyan", name: "\uC0AC\uC774\uBC84 \uC0AC\uC774\uC5B8", en: "vibrant cyber cyan bright rim light" },
    { id: "BloodRed", name: "\uBE14\uB7EC\uB4DC \uB808\uB4DC", en: "deep dark blood crimson red rim light" },
    { id: "SoftPurple", name: "\uBBA4\uD2B8 \uD37C\uD50C", en: "soft desaturated purple rim light, atmospheric purple edge glow" },
    { id: "PastelPink", name: "\uD30C\uC2A4\uD154 \uD551\uD06C", en: "soft pastel pink rim light" },
    { id: "MintGreen", name: "\uBBFC\uD2B8 \uADF8\uB9B0", en: "fresh pastel mint green rim light" },
    { id: "NeonYellow", name: "\uB124\uC628 \uC610\uB85C\uC6B0", en: "vibrant pop neon yellow rim light" }
  ],
  rimIntensities: [
    { id: "Subtle", name: "\uC740\uC740\uD558\uAC8C (Subtle)", en: "very faint and subtle" },
    { id: "Moderate", name: "\uBCF4\uD1B5 (Moderate)", en: "clear and balanced" },
    { id: "Strong", name: "\uAC15\uB82C\uD558\uAC8C (Strong)", en: "intense and bright" }
  ],
  cameraMotions: [
    { id: "Static", name: "\uACE0\uC815 (Static)", en: "completely static camera, locked off shot on tripod, ZERO zoom in, ZERO zoom out, fixed text scale, absolutely NO camera movement" },
    { id: "SlowZoom", name: "\uCC9C\uCC9C\uD788 \uC90C\uC778 (Slow Zoom)", en: "very slow cinematic push in, subtle zoom" },
    { id: "Orbit", name: "\uAC00\uBCBC\uC6B4 \uADA4\uB3C4 \uD68C\uC804 (Orbit)", en: "subtle slow parallax orbit, shifting perspective slightly" }
  ],
  motionDynamics: [{ id: "Flowing", name: "\uBD80\uB4DC\uB7FD\uAC8C \uD750\uB984 (Flowing)", en: "elegant slow flowing motion, highly viscous and smooth dynamics" }, { id: "Turbulent", name: "\uAC70\uCE60\uAC8C \uD718\uBAB0\uC544\uCE68 (Turbulent)", en: "aggressive turbulent motion, fast swirling particles, high energy dynamics" }, { id: "Pulsating", name: "\uB9E5\uB3D9/\uD638\uD761 (Pulsating)", en: "rhythmic pulsating glow, glowing intensely then fading smoothly" }, { id: "SeamlessLoop", name: "\uBB34\uD55C \uBC18\uBCF5 (Seamless Web Loop)", en: "perfectly seamless loop, ending exactly where it begins, consistent infinite motion" }]
};

// src/lib/designEvaluationPrompt.js
var CRITERIA_PROMPT_LABELS = {
  banner: "\uBC30\uB108 / \uAE30\uD0C0",
  promotion: "\uD504\uB85C\uBAA8\uC158 \uD398\uC774\uC9C0",
  promotionMobile: "\uD504\uB85C\uBAA8\uC158 \uBAA8\uBC14\uC77C",
  promotionKv: "\uD504\uB85C\uBAA8\uC158 \uD0A4\uBE44\uC8FC\uC5BC",
  brandweb: "\uBE0C\uB79C\uB4DC\uC6F9_\uBA54\uC778",
  brandwebSub: "\uBE0C\uB79C\uB4DC\uC6F9_\uC11C\uBE0C",
  brandwebMobile: "\uBE0C\uB79C\uB4DC\uC6F9_\uBAA8\uBC14\uC77C",
  typo2d: "2D \uD0C0\uC774\uD3EC",
  typoRender: "\uB80C\uB354\uB9C1 \uD0C0\uC774\uD3EC",
  typoMotion: "\uBAA8\uC158 \uD0C0\uC774\uD3EC"
};
var buildCriteriaPromptText = (source) => `[\uC784\uBB34 2: \uCE74\uD14C\uACE0\uB9AC\uBCC4 \uD3C9\uAC00 \uD56D\uBAA9 (\uAC01 100\uC810 \uB9CC\uC810)]
\uAC01 \uD56D\uBAA9\uC5D0 \uB300\uD574 100\uC810 \uB9CC\uC810 \uAE30\uC900\uC758 \uC810\uC218(score)\uC640 \uAD00\uCC30 \uADFC\uAC70\uAC00 \uBD84\uBA85\uD55C \uD55C \uC904 \uD3C9\uAC00(reason)\uB97C \uC791\uC131\uD558\uC138\uC694.
\uD310\uBCC4/\uC9C0\uC815\uB41C \uCE74\uD14C\uACE0\uB9AC\uC758 \uD56D\uBAA9\uB9CC \uC0AC\uC6A9\uD558\uACE0, \uAD04\uD638 \uC548 JSON \uD0A4\uB97C \uC815\uD655\uD788 \uC720\uC9C0\uD558\uC138\uC694.

${Object.entries(source || {}).map(([type, entry]) => `\u25B6 [${CRITERIA_PROMPT_LABELS[type] || type}]
${formatCriteriaList(entry?.items || [])}`).join("\n\n")}

[\uD544\uC218 \uC0AC\uC804 \uAC80\uC0AC]
- \uC798\uBABB\uB41C \uCE74\uD53C\xB7\uB0A0\uC9DC\xB7\uB85C\uACE0, \uCF58\uD150\uCE20 \uC798\uB9BC, \uAE68\uC9C4 \uD22C\uBA85\uB3C4, \uCE90\uB9AD\uD130/FX \uC624\uC815\uB82C\uC744 \uBC1C\uACAC\uD558\uBA74 hardFailures\uC5D0 \uAE30\uB85D\uD558\uC138\uC694.
- \uC758\uB3C4\uC801\uC73C\uB85C \uD14D\uC2A4\uD2B8\uB098 CTA\uAC00 \uC5C6\uB294 \uC774\uBBF8\uC9C0\uD615 \uBC30\uB108\uC5D0\uB294 \uB204\uB77D \uC790\uCCB4\uB97C \uAC10\uC810\uD558\uC9C0 \uB9C8\uC138\uC694.
- recommendedCorrections\uC5D0\uB294 \uAC00\uC7A5 \uC601\uD5A5\uC774 \uD070 \uC218\uC815\uB9CC \uCD5C\uB300 3\uAC1C \uC791\uC131\uD558\uC138\uC694.

[reason \uC791\uC131 \uADDC\uCE59]
- 85\uC810 \uC774\uC0C1\uC740 \uC6B0\uC218\uD55C \uC694\uC18C\uC758 \uAD6C\uCCB4\uC801\uC778 \uC2DC\uAC01 \uADFC\uAC70\uB97C \uC791\uC131\uD558\uC138\uC694.
- 80\uC810 \uBBF8\uB9CC\uC740 \uBA85\uD655\uD55C \uBB38\uC81C\uC640 \uC218\uC815 \uBC29\uD5A5\uC744 \uC791\uC131\uD558\uC138\uC694.
- \uAD6C\uC5B4\uCCB4\uC640 \uBBF8\uC0AC\uC5EC\uAD6C\uB97C \uC81C\uC678\uD558\uC138\uC694.`;
var buildScoringRulesPromptText = (source) => {
  const blocks = Object.entries(source || {}).filter(([, value]) => value?.rules && value.rules.trim()).map(([type, value]) => `\u25B6 [${CRITERIA_PROMPT_LABELS[type] || type}] \uCC44\uC810 \uADDC\uCE59:
${value.rules.trim()}`);
  return blocks.length ? `
[\uCE74\uD14C\uACE0\uB9AC\uBCC4 \uCC44\uC810 \uADDC\uCE59]
${blocks.join("\n\n")}
` : "";
};
var AUTO_CATEGORY_INSTRUCTION = `- category: \uC774\uBBF8\uC9C0\uC758 \uD615\uD0DC\uC640 \uBAA9\uC801\uC5D0 \uB530\uB77C \uB2E4\uC74C \uC911 \uD558\uB098\uB85C \uC815\uD655\uD788 \uBD84\uB958\uD558\uC138\uC694:
  \xB7 "\uBC30\uB108" (\uCEA0\uD398\uC778/\uC774\uBCA4\uD2B8 \uBC30\uB108 \u2014 \uAC00\uB85C\uD615/\uC815\uC0AC\uAC01\uD615\uC758 \uB2E8\uC77C \uC2DC\uC548)
  \xB7 "\uD504\uB85C\uBAA8\uC158 \uD398\uC774\uC9C0" (\uB370\uC2A4\uD06C\uD1B1 \uC138\uB85C\uB85C \uAE34 \uB79C\uB529 \uD398\uC774\uC9C0 \u2014 \uD3ED\uC774 \uB113\uACE0 \uCEEC\uB7FC\uC774 \uC5EC\uB7FF \uAC00\uB2A5)
  \xB7 "\uD504\uB85C\uBAA8\uC158 \uBAA8\uBC14\uC77C" (\uBAA8\uBC14\uC77C \uC138\uB85C \uB79C\uB529 \uD398\uC774\uC9C0 \u2014 \uD3ED\uC774 \uC881\uACE0 \uB2E8\uC77C \uCEEC\uB7FC, \uBCF4\uD1B5 750\xD75000+ \uBE44\uC728)
  \xB7 "\uD504\uB85C\uBAA8\uC158 \uD0A4\uBE44\uC8FC\uC5BC" (\uD504\uB85C\uBAA8\uC158 \uCD5C\uC0C1\uB2E8 \uD0A4\uBE44\uC8FC\uC5BC/\uD788\uC5B4\uB85C \uC601\uC5ED\uB9CC \uC798\uB77C\uB0B8 \uB2E8\uC77C \uC2DC\uC548 \u2014 \uBA54\uC778 \uC77C\uB7EC\uC2A4\uD2B8+\uD0C0\uC774\uD2C0 \uC911\uC2EC, \uD558\uB2E8 \uBCF4\uC0C1/\uC57D\uAD00 \uC5C6\uC74C)
  \xB7 "\uBE0C\uB79C\uB4DC\uC6F9_\uBA54\uC778" / "\uBE0C\uB79C\uB4DC\uC6F9_\uC11C\uBE0C" (\uB370\uC2A4\uD06C\uD1B1 \uAC8C\uC784/\uBE0C\uB79C\uB4DC \uC0AC\uC774\uD2B8)
  \xB7 "\uBE0C\uB79C\uB4DC\uC6F9_\uBAA8\uBC14\uC77C" (\uBAA8\uBC14\uC77C \uBE0C\uB79C\uB4DC/\uAC8C\uC784 \uC0AC\uC774\uD2B8 \u2014 \uB2E8\uC77C \uD654\uBA74 mockup, \uBCF4\uD1B5 750\xD71234 \uB610\uB294 9:16~9:22 \uBE44\uC728)
  \xB7 "2D \uD0C0\uC774\uD3EC" (\uAE00\uC790 \uC790\uCCB4\uAC00 \uC8FC\uC778\uACF5\uC778 \uD3C9\uBA74 \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uB514\uC790\uC778 \u2014 \uBCA1\uD130/\uD50C\uB7AB, \uBC30\uACBD \uD6A8\uACFC \uAC70\uC758 \uC5C6\uC74C)
  \xB7 "\uB80C\uB354\uB9C1 \uD0C0\uC774\uD3EC" (3D/PBR \uB80C\uB354\uB9C1\uB41C \uD0C0\uC774\uD3EC \u2014 \uAE08\uC18D/\uC5BC\uC74C/\uB3CC \uC7AC\uC9C8\uAC10, \uB77C\uC774\uD305, \uAE4A\uC774\uAC10)
  \xB7 "\uBAA8\uC158 \uD0C0\uC774\uD3EC" (\uC601\uC0C1\uC774\uB098 \uBAA8\uC158\uC774 \uAC15\uD558\uAC8C \uB290\uAEF4\uC9C0\uB294 \uD0A4\uD504\uB808\uC784 \u2014 \uBAA8\uC158 \uBE14\uB7EC, \uD30C\uD2F0\uD074 \uADA4\uC801, \uC2DC\uD000\uC2A4 \uD754\uC801, \uAE00\uC790\uAC00 \uC2DC\uAC04 \uCD95\uC73C\uB85C \uC6C0\uC9C1\uC774\uB294 \uC778\uC0C1)
  \xB7 "\uAE30\uD0C0"
  \u2605 \uBAA8\uBC14\uC77C/\uB370\uC2A4\uD06C\uD1B1 \uAD6C\uBD84 \uAE30\uC900 (\uB9E4\uC6B0 \uC911\uC694):
     - \uC774\uBBF8\uC9C0 \uAC00\uB85C\uD3ED\uC774 \uCE94\uBC84\uC2A4 \uC9E7\uC740 \uBCC0 \uAE30\uC900 800px \uC774\uD558 \uB610\uB294 \uC881\uC740 \uD3ED(\uD3F0 \uBCA0\uC824\xB7\uB2E8\uC77C \uCEEC\uB7FC \uB808\uC774\uC544\uC6C3)\uC774 \uBA85\uD655\uD558\uBA74 \uBAA8\uBC14\uC77C.
     - \uB2E8\uC77C \uD3F0 \uD654\uBA74 mockup(\uC138\uB85C 9:14~9:22 \uBD80\uADFC, \uBCF4\uD1B5 750\xD7~1234) \u2192 "\uBE0C\uB79C\uB4DC\uC6F9_\uBAA8\uBC14\uC77C" \uB610\uB294 "\uD504\uB85C\uBAA8\uC158 \uBAA8\uBC14\uC77C".
     - \uAC19\uC740 \uBAA8\uBC14\uC77C\uC774\uB77C\uB3C4 \uB2E8\uC77C \uD654\uBA74 \uB2E8\uC704\uBA74 "\uBE0C\uB79C\uB4DC\uC6F9_\uBAA8\uBC14\uC77C", \uAE38\uAC8C \uC2A4\uD06C\uB864\uB418\uB294 \uB79C\uB529\uC774\uBA74 "\uD504\uB85C\uBAA8\uC158 \uBAA8\uBC14\uC77C".
  (\uD0C0\uC774\uD3EC \uAD6C\uBD84 \uD301: \uAE00\uC790 \uC790\uCCB4\uC5D0 3D \uC785\uCCB4\uAC10/\uC7AC\uC9C8\uAC10\uC774 \uC788\uC73C\uBA74 "\uB80C\uB354\uB9C1 \uD0C0\uC774\uD3EC". \uBAA8\uC158\uBE14\uB7EC\uB098 \uAE00\uC790 \uC8FC\uBCC0\uC5D0 \uC2DC\uAC04\uC131 \uD6A8\uACFC(\uADA4\uC801)\uAC00 \uC788\uC73C\uBA74 "\uBAA8\uC158 \uD0C0\uC774\uD3EC". \uD3C9\uBA74\uC774\uBA74 "2D \uD0C0\uC774\uD3EC".)`;
function buildCategoryInstruction(category = "auto") {
  return category === "auto" ? AUTO_CATEGORY_INSTRUCTION : `- category: \uC774 \uB514\uC790\uC778\uC740 "${category}"\uC785\uB2C8\uB2E4. \uBC18\uB4DC\uC2DC \uC774 \uAC12\uC73C\uB85C \uACE0\uC815\uD558\uC5EC \uCD9C\uB825\uD558\uACE0, \uD3C9\uAC00 \uAE30\uC900\uB3C4 \uD574\uB2F9 \uCE74\uD14C\uACE0\uB9AC\uC5D0 \uB9DE\uCDB0 \uC9C4\uD589\uD558\uC138\uC694.`;
}
function buildDesignEvaluationPrompt({
  category = "auto",
  criteriaSource = null,
  criteriaText = null,
  rulesText = null,
  anchorsText = ""
} = {}) {
  const introInstruction = category === "auto" ? "\uCCA8\uBD80\uB41C \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD558\uC5EC \uB514\uC790\uC778 \uCE74\uD14C\uACE0\uB9AC\uB97C \uBD84\uB958\uD558\uACE0," : `\uCCA8\uBD80\uB41C \uB514\uC790\uC778\uC740 [${category}]\uC785\uB2C8\uB2E4. \uC774 \uC0AC\uC2E4\uC744 \uBC14\uD0D5\uC73C\uB85C`;
  const criteriaBlock = criteriaText ?? buildCriteriaPromptText(criteriaSource);
  const rulesBlock = rulesText ?? buildScoringRulesPromptText(criteriaSource);
  return `\uB2F9\uC2E0\uC740 \uAC8C\uC784/IT \uB514\uC790\uC778\uC744 \uC2EC\uC0AC\uD558\uB294 \uCD5C\uACE0 \uAD8C\uC704\uC758 AI \uD3C9\uAC00\uB2E8\uC785\uB2C8\uB2E4.
${introInstruction} \uC120\uD0DD\uB41C \uD65C\uC131 \uAE30\uC900\uC758 \uD3C9\uAC00 \uD56D\uBAA9\uC744 \uD558\uB098\uB3C4 \uB204\uB77D\uD558\uC9C0 \uB9D0\uACE0 \uC815\uBC00 \uD3C9\uAC00\uD558\uC138\uC694.

[\uC784\uBB34 1: \uBA54\uD0C0\uB370\uC774\uD130 \uCD94\uCD9C]
- title: \uB514\uC790\uC778\uC758 \uBA54\uC778 \uD14D\uC2A4\uD2B8(\uC81C\uBAA9) \uCD94\uCD9C.
${buildCategoryInstruction(category)}
- date_info: \uC774\uBCA4\uD2B8 \uAE30\uAC04/\uB0A0\uC9DC (\uC788\uC744 \uACBD\uC6B0).
- tags: \uCEEC\uB7EC, \uBD84\uC704\uAE30, \uD2B9\uC9D5 \uC704\uC8FC\uB85C \uBC18\uB4DC\uC2DC '\uD55C\uAE00'\uB85C\uB9CC 3~5\uAC1C \uC791\uC131 (\uC608: "\uB2E4\uD06C\uD310\uD0C0\uC9C0", "\uD669\uAE08\uBE5B", "\uCE90\uC8FC\uC5BC", "\uD654\uB824\uD55C").

${criteriaBlock}
${rulesBlock}${anchorsText || ""}
\uBC18\uB4DC\uC2DC \uC9C0\uC815\uB41C JSON \uC2A4\uD0A4\uB9C8\uC5D0 \uB9DE\uCD94\uC5B4 \uD65C\uC131 \uD3C9\uAC00 \uD56D\uBAA9 \uC804\uCCB4\uB97C \uB2E8 \uD558\uB098\uB3C4 \uB204\uB77D \uC5C6\uC774 \uB2F5\uBCC0\uD558\uC138\uC694.`;
}
function buildEvaluationResponseSchema(scoreKeys = [], { includeCategory = true, includePurpose = false, includeSummary = false } = {}) {
  const keys = (Array.isArray(scoreKeys) ? scoreKeys : []).map(String).filter(Boolean);
  const properties = {
    title: { type: "STRING" },
    ...includeCategory ? { category: { type: "STRING" } } : {},
    date_info: { type: "OBJECT", properties: { year: { type: "STRING" }, month: { type: "STRING" }, full_date: { type: "STRING" } } },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    ...includePurpose ? { purpose: { type: "STRING" } } : {},
    ...includeSummary ? { summary: { type: "STRING" } } : {},
    scores_data: {
      type: "OBJECT",
      properties: Object.fromEntries(keys.map((key) => [key, {
        type: "OBJECT",
        properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } },
        required: ["score", "reason"]
      }])),
      required: [...keys]
    },
    hardFailures: { type: "ARRAY", items: { type: "STRING" } },
    recommendedCorrections: { type: "ARRAY", items: { type: "STRING" } }
  };
  const required = ["title", ...includeCategory ? ["category"] : [], "tags", "scores_data", "hardFailures", "recommendedCorrections"];
  return { type: "OBJECT", properties, required };
}
function criteriaSourceFromSnapshot(snapshot) {
  if (!snapshot?.criteriaType) return {};
  return {
    [snapshot.criteriaType]: {
      items: Array.isArray(snapshot.criteria) ? snapshot.criteria : [],
      rules: typeof snapshot.rules === "string" ? snapshot.rules : "",
      versionId: snapshot.criteriaVersionId || "",
      versionName: snapshot.criteriaVersionName || ""
    }
  };
}

// mcp/server.mjs
var ROOT = path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), "..");
var SKILLS_DIR = path2.join(ROOT, "src", "skills");
var RUBRIC_PATH = path2.join(ROOT, ".codex", "skills", "nexus-design-evaluator", "references", "rubric.md");
var OUT_DIR = path2.join(ROOT, ".tmp", "mcp-out");
var NEXUS_AUTH_DIR = path2.join(process.env.APPDATA || path2.join(os.homedir(), ".config"), "NexusStudio");
var NEXUS_AUTH_PATH = path2.join(NEXUS_AUTH_DIR, "mcp-auth.json");
var NEXUS_LINK_PORT = Number(process.env.NEXUS_MCP_LINK_PORT || 47831);
function readNexusAuth() {
  try {
    return JSON.parse(fs2.readFileSync(NEXUS_AUTH_PATH, "utf8"));
  } catch {
    return null;
  }
}
function writeNexusAuth(value) {
  fs2.mkdirSync(NEXUS_AUTH_DIR, { recursive: true });
  fs2.writeFileSync(NEXUS_AUTH_PATH, JSON.stringify(value, null, 2), { mode: 384 });
}
function decodeFirebaseClaims(idToken) {
  try {
    const payload = String(idToken || "").split(".")[1];
    return payload ? JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) : {};
  } catch {
    return {};
  }
}
async function exchangeCustomToken(customToken) {
  const { apiKey } = firebaseConfig2();
  if (!apiKey) throw new Error("Firebase API key\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      signal: AbortSignal.timeout(15e3)
    }
  );
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Firebase custom token \uAD50\uD658 \uC2E4\uD328");
  const claims = decodeFirebaseClaims(body.idToken);
  const auth = {
    uid: body.localId || claims.user_id || claims.sub || null,
    email: body.email || claims.email || null,
    idToken: body.idToken,
    refreshToken: body.refreshToken,
    expiresAt: Date.now() + Number(body.expiresIn || 3600) * 1e3,
    connectedAt: Date.now()
  };
  writeNexusAuth(auth);
  return auth;
}
async function currentNexusAuth() {
  const auth = readNexusAuth();
  if (!auth?.refreshToken) return null;
  if (auth.idToken && Number(auth.expiresAt || 0) > Date.now() + 6e4) {
    if (!auth.uid || !auth.email) {
      const claims = decodeFirebaseClaims(auth.idToken);
      const repaired = {
        ...auth,
        uid: auth.uid || claims.user_id || claims.sub || null,
        email: auth.email || claims.email || null
      };
      writeNexusAuth(repaired);
      return repaired;
    }
    return auth;
  }
  const { apiKey } = firebaseConfig2();
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: auth.refreshToken }),
    signal: AbortSignal.timeout(15e3)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Nexus \uACC4\uC815 \uD1A0\uD070 \uAC31\uC2E0 \uC2E4\uD328");
  const next = {
    ...auth,
    uid: body.user_id || auth.uid,
    idToken: body.id_token,
    refreshToken: body.refresh_token || auth.refreshToken,
    expiresAt: Date.now() + Number(body.expires_in || 3600) * 1e3
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
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "GET" && req.url === "/status") {
      const auth = readNexusAuth();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ connected: !!auth?.refreshToken, uid: auth?.uid || null, email: auth?.email || null }));
      return;
    }
    if (req.method === "DELETE" && req.url === "/connect") {
      try {
        fs2.unlinkSync(NEXUS_AUTH_PATH);
      } catch {
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, connected: false }));
      return;
    }
    if (req.method === "POST" && req.url === "/connect") {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 1024 * 1024) throw new Error("\uC694\uCCAD\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4.");
      }
      try {
        const customToken = JSON.parse(raw || "{}").customToken;
        if (!customToken) throw new Error("customToken\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
        const auth = await exchangeCustomToken(customToken);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, connected: true, uid: auth.uid, email: auth.email }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e?.message || String(e) }));
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });
  bridge.on("error", () => {
  });
  bridge.listen(NEXUS_LINK_PORT, "127.0.0.1");
}
function geminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const env = fs2.readFileSync(path2.join(ROOT, ".env"), "utf8");
    const m = env.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  } catch {
  }
  return null;
}
function envValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    const env = fs2.readFileSync(path2.join(ROOT, ".env"), "utf8");
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = env.match(new RegExp(`^\\s*${escaped}\\s*=\\s*(.+?)\\s*$`, "m"));
    if (m) return m[1].replace(/^['"]|['"]$/g, "");
  } catch {
  }
  return null;
}
function removeBgAllowedRoots() {
  const configured = envValue("REMOVE_BG_ALLOWED_ROOTS");
  return (configured ? configured.split(";") : [ROOT]).map((value) => path2.resolve(value.trim())).filter(Boolean);
}
function isInsideAllowedRoot(target, roots) {
  return roots.some((root) => {
    const relative = path2.relative(root, target);
    return relative === "" || !relative.startsWith("..") && !path2.isAbsolute(relative);
  });
}
function composeSkillsFs(ids2, ctx = {}) {
  const parts = [];
  for (const id of ids2) {
    const file = path2.join(SKILLS_DIR, ...id.split("/")) + ".md";
    let body;
    try {
      body = fs2.readFileSync(file, "utf8").trim();
    } catch {
      console.error(`[nexus-mcp] unknown skill id: ${id}`);
      continue;
    }
    const filled = body.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] == null ? "" : String(ctx[key]));
    if (filled.trim()) parts.push(filled.trim());
  }
  return parts.join("\n\n");
}
var ids = (arr, key = "id") => arr.map((o) => o[key]);
var keyEnum = (arr) => z.enum(ids(arr, "key"));
var idEnum = (arr) => z.enum(ids(arr));
var text = (t) => ({ content: [{ type: "text", text: t }] });
var errText = (t) => ({ content: [{ type: "text", text: t }], isError: true });
var data = (structuredContent, t) => ({ content: [{ type: "text", text: t }], structuredContent });
async function remoteImageContent(url, { maxBytes = 5 * 1024 * 1024 } = {}) {
  if (!url || !/^https:\/\//i.test(url)) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(15e3) });
  if (!response.ok) throw new Error(`\uC774\uBBF8\uC9C0 \uB2E4\uC6B4\uB85C\uB4DC \uC2E4\uD328 (${response.status})`);
  const mimeType = String(response.headers.get("content-type") || "image/jpeg").split(";")[0];
  if (!mimeType.startsWith("image/")) throw new Error(`\uC774\uBBF8\uC9C0\uAC00 \uC544\uB2CC \uC751\uB2F5\uC785\uB2C8\uB2E4: ${mimeType}`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error(`\uC774\uBBF8\uC9C0\uAC00 ${Math.ceil(declared / 1024 / 1024)}MB\uB85C \uBBF8\uB9AC\uBCF4\uAE30 \uC81C\uD55C\uC744 \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error(`\uC774\uBBF8\uC9C0\uAC00 ${Math.ceil(bytes.length / 1024 / 1024)}MB\uB85C \uBBF8\uB9AC\uBCF4\uAE30 \uC81C\uD55C\uC744 \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4.`);
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
var PURE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
var READ_REMOTE = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
var WRITE_REMOTE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };
var WRITE_LOCAL = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
var RENDER = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
var PROMPT_OUT = {
  prompt: z.string().describe("\uC0DD\uC131\uB41C \uD504\uB85C\uB355\uC158 \uD504\uB86C\uD504\uD2B8 \u2014 \uADF8\uB300\uB85C nexus_render_image \uC758 prompt \uB85C \uC804\uB2EC"),
  renderHint: z.string().optional().describe("\uAD8C\uC7A5 \uB80C\uB354 \uC124\uC815(aspectRatio\xB7imageSize\xB7\uCC38\uC870 \uCCA8\uBD80 \uBC29\uBC95 \uB4F1)")
};
var TYPECORE_OUT = {
  ...PROMPT_OUT,
  engine: z.enum(["sovereign", "breeze"]),
  exactText: z.string(),
  background: z.literal("black"),
  nextTool: z.literal("nexus_render_image"),
  resolvedOptions: z.record(z.string(), z.any()).optional(),
  selectionReasons: z.array(z.string()).optional()
};
var TYPECORE_ASPECTS = ["1:1", "16:9", "21:9"];
var TYPECORE_LAYOUTS = ["1Line", "2Lines", "3Lines"];
var _firebaseConfig = null;
function firebaseConfig2() {
  if (_firebaseConfig) return _firebaseConfig;
  const values = { projectId: process.env.VITE_FIREBASE_PROJECT_ID, apiKey: process.env.VITE_FIREBASE_API_KEY };
  try {
    const env = fs2.readFileSync(path2.join(ROOT, ".env"), "utf8");
    for (const [key, field] of [["VITE_FIREBASE_PROJECT_ID", "projectId"], ["VITE_FIREBASE_API_KEY", "apiKey"]]) {
      if (values[field]) continue;
      const m = env.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, "m"));
      if (m) values[field] = m[1].replace(/^["']|["']$/g, "");
    }
  } catch {
  }
  _firebaseConfig = values;
  return values;
}
function decodeFirestoreValue2(value) {
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
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue2);
  if ("mapValue" in value) return decodeFirestoreFields2(value.mapValue.fields || {});
  return value;
}
function decodeFirestoreFields2(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue2(value)]));
}
function decodeFirestoreDocument2(doc) {
  const id = String(doc?.name || "").split("/").pop();
  return { id, ...decodeFirestoreFields2(doc?.fields || {}) };
}
function encodeFirestoreValue(value) {
  if (value == null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreFields(value) } };
  return { stringValue: String(value) };
}
function encodeFirestoreFields(value) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, item]) => item !== void 0).map(([key, item]) => [key, encodeFirestoreValue(item)]));
}
function bannerTimestamp(value) {
  if (typeof value === "number") return value;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function bannerSummary(banner) {
  return {
    id: banner.id,
    title: banner.title || banner.originalTitle || "\uC81C\uBAA9 \uC5C6\uC74C",
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
    createdAt: banner.createdAt || null
  };
}
function brandWebSummary(entry) {
  const pages = Array.isArray(entry.pages) ? entry.pages : [];
  return {
    id: entry.id,
    title: entry.title || entry.sourceProjectName || "\uBE0C\uB79C\uB4DC \uC6F9",
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
    createdAt: entry.created_at || entry.createdAt || null
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
    title: entry.title || "\uC81C\uBAA9 \uC5C6\uC74C",
    game: entry.game || null,
    year: entry.year || null,
    date: entry.date || entry.date_info || null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    summary: entry.summary || entry.description || null,
    score: promotionScore(entry),
    previewUrl: entry.preview || entry.full_image || null,
    desktopUrl: entry.full_image || entry.preview || null,
    mobileUrl: entry.mobile_image || null,
    assetType: entry.assetType || "\uD504\uB85C\uBAA8\uC158",
    visibility: entry.visibility || "public",
    liked: Number(entry.liked || 0),
    createdAt: entry.created_at || entry.createdAt || null
  };
}
function promptArcArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const source = value.trim();
  if (!source.startsWith("[") || !source.endsWith("]")) return [];
  try {
    const parsed = JSON.parse(source);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function promptArcFlat(value) {
  return promptArcArray(value).flat(Infinity).filter((item) => typeof item === "string" && item.trim());
}
function promptArcSafeUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;
}
function promptArcNature(entry) {
  if (entry.type === "video" || entry.type === "\uBAA8\uC158") return "motion";
  const tags = new Set([...promptArcArray(entry.tags), ...promptArcFlat(entry.stepTags)].map(String));
  if (tags.has("Motion")) return "motion";
  const haystack = [entry.title, entry.aiKeywords, ...promptArcFlat(entry.stepKeywords), ...tags].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
  if (tags.has("\uAD11\uC6D0") || /광원|이펙트|파티클|후광|오라|glow|light\s?fx|flare|particle/i.test(haystack)) return "lightfx";
  if (tags.has("\uBC84\uD2BC") || /버튼|프레임|배지|패널|블릿|리스킨|button|frame|badge|panel/i.test(haystack)) return "object";
  if (tags.has("\uD0C0\uC774\uD3EC") || /타이포|캘리그라피|레터링|타이틀|로고|2d|흑백|typo|lettering|calligraphy/i.test(haystack)) return "typography";
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
    title: entry.title || "\uC81C\uBAA9 \uC5C6\uC74C",
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
    updatedAt: entry.updatedAt || null
  };
}
function assetLibrarySummary(entry) {
  return {
    id: entry.id,
    title: entry.title || "\uC81C\uBAA9 \uC5C6\uC74C",
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
    layerPath: promptArcArray(entry.source?.layerPath).map(String)
  };
}
async function firestoreRequest(documentPath, params = {}) {
  const { projectId, apiKey } = firebaseConfig2();
  if (!projectId || !apiKey) throw new Error(".env\uC5D0 VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const url = new URL(`${base}/${documentPath}`);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) if (value != null && value !== "") url.searchParams.set(key, String(value));
  const auth = await currentNexusAuth().catch(() => null);
  const headers = { Accept: "application/json" };
  if (auth?.idToken) headers.Authorization = `Bearer ${auth.idToken}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15e3) });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      message = JSON.parse(body)?.error?.message || body;
    } catch {
    }
    throw new Error(`Firestore ${response.status}: ${message}`);
  }
  return response.json();
}
async function firestoreWriteDocument(documentPath, value) {
  const { projectId, apiKey } = firebaseConfig2();
  if (!projectId || !apiKey) throw new Error(".env\uC5D0 VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  const auth = await currentNexusAuth();
  const claims = decodeFirebaseClaims(auth?.idToken);
  if (!auth?.idToken || !claims?.nexusCodex) throw new Error("Nexus Studio\uC5D0\uC11C Codex \uACC4\uC815\uC744 \uB2E4\uC2DC \uC5F0\uACB0\uD574 \uC8FC\uC138\uC694.");
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const url = new URL(`${base}/${documentPath}`);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, {
    method: "PATCH",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${auth.idToken}` },
    body: JSON.stringify({ fields: encodeFirestoreFields(value) }),
    signal: AbortSignal.timeout(2e4)
  });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      message = JSON.parse(body)?.error?.message || body;
    } catch {
    }
    throw new Error(`Firestore ${response.status}: ${message}`);
  }
  return response.json();
}
function bannerCodexUploadRoots() {
  const configured = envValue("NEXUS_BANNER_CODEX_UPLOAD_ROOTS");
  return (configured ? configured.split(";") : [ROOT]).map((value) => path2.resolve(value.trim())).filter(Boolean);
}
async function uploadBannerCodexImage(imagePath) {
  if (!imagePath) return null;
  const absolute = path2.resolve(imagePath);
  if (!isInsideAllowedRoot(absolute, bannerCodexUploadRoots())) throw new Error("\uC774\uBBF8\uC9C0 \uACBD\uB85C\uAC00 Banner Codex \uD5C8\uC6A9 \uB8E8\uD2B8 \uBC16\uC5D0 \uC788\uC2B5\uB2C8\uB2E4.");
  const stat = fs2.statSync(absolute);
  if (!stat.isFile() || stat.size > 25 * 1024 * 1024) throw new Error("\uC774\uBBF8\uC9C0\uB294 25MB \uC774\uD558 \uD30C\uC77C\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
  const ext = path2.extname(absolute).toLowerCase();
  const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[ext];
  if (!mime) throw new Error("PNG, JPG, WEBP \uC774\uBBF8\uC9C0\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
  const cloudName = envValue("VITE_CLOUDINARY_CLOUD_NAME");
  const preset = envValue("VITE_CLOUDINARY_UPLOAD_PRESET");
  if (!cloudName || !preset) throw new Error("Cloudinary \uC5C5\uB85C\uB4DC \uC124\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
  const form = new FormData();
  form.append("file", new Blob([fs2.readFileSync(absolute)], { type: mime }), path2.basename(absolute));
  form.append("upload_preset", preset);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(6e4)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Cloudinary ${response.status}`);
  return payload.secure_url || payload.url;
}
async function firestoreCollectionAll(documentPath, { maxDocuments = 1e4 } = {}) {
  const documents = [];
  let pageToken;
  do {
    const payload = await firestoreRequest(documentPath, {
      pageSize: 100,
      pageToken,
      showMissing: false
    });
    documents.push(...payload.documents || []);
    pageToken = payload.nextPageToken || null;
    if (documents.length >= maxDocuments) {
      throw new Error(`\uC804\uCCB4 \uC815\uB82C \uC548\uC804 \uC81C\uD55C(${maxDocuments}\uAC74)\uC744 \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4.`);
    }
  } while (pageToken);
  return documents;
}
function scorePageOffset(pageToken) {
  const match = String(pageToken || "").match(/^score:(\d+)$/);
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
  const persona = coreArchetypes.find((p) => p.id === resolved.archetype) || coreArchetypes[0];
  const option = (list, id, fallback = id) => getOptionEn2(list || [], id) || fallback;
  const shape = staticOptions2.shapePresets?.find((item) => item.id === a.preset);
  const lineDirective = titleLineDirective(title, a.layout);
  const ir = {
    inputText: title,
    activeCoreData: persona,
    shapeStyleEn: shape?.en || "",
    weightEn: option(staticOptions2.stemWeights, o.stemWeight),
    widthEn: option(staticOptions2.widths, o.charWidth),
    proportionEn: option(staticOptions2.proportions, o.charProportion),
    kerningEn: option(staticOptions2.kerningOptions, o.kerning),
    letterConnEn: option(staticOptions2.letterConnections, o.letterConnection),
    internalSpaceEn: option(staticOptions2.internalSpaces, o.internalSpace),
    terminalEn: option(staticOptions2.terminalStyles, o.terminalStyle),
    sharpnessEn: option(staticOptions2.strokeSharpness, o.strokeSharpness),
    cornerEn: option(staticOptions2.cornerStyles, o.cornerStyle),
    extensionEn: option(staticOptions2.strokeExtensions, o.strokeExtension),
    userAuraEn: String(a.extra || "").trim() || "Standard deployment",
    modIntensityEn: a.enhanceMode === "deconstruct" ? "bold" : a.enhanceMode === "variation" ? "moderate" : "controlled",
    modAllowedEn: a.enhanceMode === "refine" ? "optical correction, edge cleanup, proportion refinement" : a.enhanceMode === "variation" ? "controlled stroke and counterform variation" : "intentional structural deconstruction within legibility limits",
    modForbiddenEn: "text mutation, layout drift, color, depth, material rendering",
    readabilityFloorEn: a.enhanceMode === "deconstruct" ? "70%" : "95%",
    momentumActive: !!a.momentum,
    kineticEn: option(staticOptions2.kineticVelocities, o.kineticVelocity),
    slantEn: option(staticOptions2.slantAngles, o.slantAngle),
    slicingEn: option(staticOptions2.slicingIntensities, o.slicingIntensity),
    cgTextInstruction: `Render the requested title with this exact row contract: ${lineDirective}`,
    layoutEn: a.layout === "1Line" ? "strict single horizontal row, no stacking" : a.layout === "2Lines" ? "exactly two balanced stacked rows" : "exactly three balanced stacked rows",
    mmoSilhouetteEn: "centered title lockup with stable baseline and uncropped glyphs",
    occupancyEn: `${a.occupancy}% of the canvas`,
    aspectRatio: a.aspectRatio,
    bgDescEn: "solid opaque white letterforms on a uniform pure black (#000000) background",
    hasTexture: o.strokeTexture !== "Tex_Clean",
    hasDamage: o.deformationDamage !== "Damage_None",
    surfaceEn: `${option(staticOptions2.strokeTextures, o.strokeTexture)}, ${option(staticOptions2.deformationDamages, o.deformationDamage)}`,
    mmoSurroundingElementEn: "none"
  };
  return {
    prompt: compileSovereignImagenPrompt({ ir, isEnhanceModeEnabled: true, enhanceMode: a.enhanceMode, surroundingMode: "Clean" }),
    resolvedOptions: { archetype: resolved.archetype, preset: a.preset, ...o },
    selectionReasons: [
      `archetype ${resolved.archetype}: ${persona.shortTitle}`,
      a.preset ? `preset ${a.preset}: shared Sovereign preset applied after persona defaults` : "preset none: persona defaults retained",
      `layout ${a.layout}, aspect ${a.aspectRatio}, occupancy ${a.occupancy}%`
    ]
  };
}
function buildBreezeMcpPrompt(a) {
  const title = normalizedTitleText(a.text);
  const raw = {
    inputText: title,
    aiPersona: a.persona,
    personaSliderValue: a.intensity,
    customDesignInjections: String(a.extra || "").trim(),
    enhanceMode: a.enhanceMode,
    momentumActive: !!a.momentum,
    baseStyle: "BlackWhite",
    aspectRatio: a.aspectRatio,
    occupancy: `${a.occupancy}%`,
    layoutType: a.layout,
    stemWeight: "Weight_Chunky",
    charWidth: "Normal",
    charProportion: "P_Std",
    kerning: "Kern_Std",
    scriptType: "Casual_Bubble",
    terminalStyle: "End_Round",
    strokeTexture: "Tex_Smooth",
    strokeSharpness: "Sharp_Soft",
    strokeExtension: "Ext_None",
    slantAngle: "Slant_0",
    rhythmDynamic: a.momentum ? "Rhythm_Bouncy" : "Rhythm_Calm",
    playfulDistortion: a.momentum ? "Distort_Squeeze" : "Distort_None",
    analogImperfection: "Imp_None",
    internalDecoration: "Solid",
    textFlow: a.momentum ? "Bouncy" : "Straight",
    letterConnection: "Separated",
    casualSurrounding: "Clean",
    dynamicOptions: { CasualStyles: [], strokeTextures: [], analogImperfections: [], strokeEnds: [], strokeWeights: [], strokeSharpness: [], widths: [], kerningOptions: [], strokeExtensions: [], rhythmDynamics: [], playfulDistortions: [] },
    isAdvancedOptionsEnabled: false,
    aiModel: "NanoBanana",
    isOutdated: true,
    nanoViewMode: "enhanced"
  };
  const built = buildPrompts(raw);
  return `${built.baseTechnical.en}

[TYPECORE BREEZE MCP OUTPUT CONTRACT]
Use solid opaque white lettering on the native uniform pure black (#000000) background. Output typography only, ready for later Render Matrix material rendering.`;
}
function ensureOutDir(dir) {
  fs2.mkdirSync(dir, { recursive: true });
  return dir;
}
function fileToInlineData(p) {
  const abs = path2.isAbsolute(p) ? p : path2.join(ROOT, p);
  const buf = fs2.readFileSync(abs);
  const ext = path2.extname(abs).toLowerCase();
  const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
  return { mimeType, data: buf.toString("base64") };
}
var hexToRgb = (hex) => {
  const m = String(hex || "").trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
var _canvasMod = null;
async function canvasMod() {
  if (!_canvasMod) _canvasMod = await import("@napi-rs/canvas");
  return _canvasMod;
}
async function loadImageData(imagePath) {
  const { createCanvas, loadImage } = await canvasMod();
  const abs = path2.isAbsolute(imagePath) ? imagePath : path2.join(ROOT, imagePath);
  const img = await loadImage(abs);
  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return { imageData: ctx.getImageData(0, 0, img.width, img.height), width: img.width, height: img.height };
}
async function savePixels(px, outPath) {
  const { createCanvas } = await canvasMod();
  const cv = createCanvas(px.width, px.height);
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(px.width, px.height);
  img.data.set(px.data);
  ctx.putImageData(img, 0, 0);
  fs2.writeFileSync(outPath, cv.toBuffer("image/png"));
  return outPath;
}
function detectBgColor(d, W2, H) {
  const px = (x, y) => {
    const i = (y * W2 + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const corners = [px(2, 2), px(W2 - 3, 2), px(2, H - 3), px(W2 - 3, H - 3)];
  corners.sort((a, b) => a[0] * 65536 + a[1] * 256 + a[2] - (b[0] * 65536 + b[1] * 256 + b[2]));
  return corners[1];
}
var clamp2553 = (v) => Math.max(0, Math.min(255, Math.round(v)));
var brief = (arr, extra = []) => arr.map((o) => {
  const out = { id: o.id ?? o.key, label: o.label ?? o.ko ?? "" };
  for (const k of extra) if (o[k] != null) out[k] = o[k];
  return out;
});
var OPTION_CATALOG = () => ({
  frameforge: {
    assetType: brief(FRAMEFORGE_ASSET_TYPES),
    silhouette: FRAMEFORGE_SILHOUETTES.map((o) => ({ id: o.key, label: o.ko, for: o.for, ratio: o.ratio })),
    mood: brief(FRAMEFORGE_MOODS),
    renderStyle: brief(FRAMEFORGE_RENDER_STYLES),
    kit: FRAMEFORGE_KITS.map((k) => ({ id: k.key, label: k.ko, desc: k.desc, items: k.items.map(([t, s]) => `${t}/${s}`) }))
  },
  renderMatrix: {
    variant: [{ id: "render-matrix", label: "\uB80C\uB354 \uBA54\uD2B8\uB9AD\uC2A4 (RPG\xB7\uD504\uB9AC\uBBF8\uC5C4)" }, { id: "pop", label: "Render Matrix: Pop (\uCE90\uC8FC\uC5BC\xB7\uD31D)" }],
    ...Object.fromEntries(Object.entries(RM_VARIANTS).map(([id, v]) => [id, {
      directorPersona: brief(v.personas),
      renderEngine: brief(v.engines),
      ...Object.fromEntries(RM_OPTION_KEYS.map(([stateKey, listKey]) => [stateKey, brief(v.options[listKey] || [])])),
      preset: v.presets.flatMap((g) => g.presets.map((p) => ({ id: p.id, label: `${g.name} \xB7 ${p.label}`, settings: p.settings })))
    }]))
  },
  titleFx: {
    effect: brief(TITLE_FX_EFFECTS, ["desc"]),
    color: brief(TITLE_FX_COLORS),
    direction: brief(TITLE_FX_DIRECTIONS),
    intensity: brief(TITLE_FX_INTENSITY),
    bg: brief(TITLE_FX_BG_OPTIONS)
  },
  floating: {
    outputMode: brief(FLOATING_OUTPUT_OPTIONS),
    effect: brief(FLOATING_EFFECT_OPTIONS),
    form: brief(FLOATING_FORM_OPTIONS),
    layout: brief(FLOATING_LAYOUT_OPTIONS),
    groupMode: brief(FLOATING_GROUP_OPTIONS),
    color: brief(FLOATING_COLORS),
    intensity: brief(FLOATING_INTENSITY_OPTIONS),
    motion: brief(FLOATING_MOTION_OPTIONS),
    density: brief(FLOATING_DENSITY_OPTIONS)
  },
  motion: {
    animationMode: [{ id: "loop", label: "\uB8E8\uD504" }, { id: "intro", label: "\uC778\uD2B8\uB85C" }, { id: "transition", label: "\uD2B8\uB79C\uC9C0\uC158" }],
    exportMode: brief(EXPORT_MODES),
    introStyle: brief(INTRO_STYLES),
    flowStyle: brief(FLOW_STYLES),
    dynamics: brief(MOTION_DYNAMICS),
    intensity: brief(INTENSITY_LEVELS),
    transitionTarget: brief(TRANSITION_TARGETS),
    ...Object.fromEntries(Object.entries(MOTION_FX_LISTS).map(([mode, lists]) => [`${mode}Fx`, { surface: brief(lists.surface), edge: brief(lists.edge), ambient: brief(lists.ambient) }])),
    veoModel: VEO_MODELS.map((m) => ({ id: m.id, label: m.label || m.id }))
  },
  promptAudit: { sourceApp: Object.keys(SOURCE_CONTEXT).map((id) => ({ id, label: id })), conflictType: Object.entries(CONFLICT_TYPES).map(([id, v]) => ({ id, label: v.label })) },
  brief: { profile: listPrismProfiles().map((p) => ({ id: p.id, label: p.label, stages: p.stages })), stage: [{ id: "transcribe", label: "\uC804\uC0AC" }, { id: "extract", label: "\uAD6C\uC870\uD654 \uCD94\uCD9C" }, { id: "merge", label: "2\uCC28 \uBCD1\uD569" }] },
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
    bg: brief(BG_COLORS, ["hex", "desc"])
  },
  variation: {
    moods: brief(VARIATION_MOODS, ["desc"]),
    styles: Object.fromEntries(Object.entries(VARIATION_STYLES).map(([mood, list]) => [mood, brief(list)])),
    refinement: brief(REFINEMENT_LEVELS, ["desc"]),
    temperature: brief(ATMOSPHERE_TEMPERATURE, ["desc"]),
    age: brief(ATMOSPHERE_AGE, ["desc"]),
    bg: brief(BG_COLORS, ["hex", "desc"])
  },
  designAlternative: {
    direction: brief(DESIGN_VARIATIONS, ["desc"]),
    strength: brief(VARIATION_STRENGTH, ["desc"])
  },
  itemBundle: {
    light: brief(BUNDLE_LIGHT_OPTIONS),
    ground: brief(BUNDLE_GROUND_OPTIONS),
    magicColor: brief(BUNDLE_MAGIC_COLORS),
    bg: brief(BUNDLE_BG_OPTIONS),
    layout: brief(BUNDLE_LAYOUT_OPTIONS),
    note: "magicColor \uB294 colorable ground(\uB9C8\uBC95\uC9C4\xB7\uC5F0\uAE30\xB7\uD68C\uC624\uB9AC\xB7\uAE00\uB85C\uC6B0 \uACC4\uC5F4)\uC5D0\uC11C\uB9CC \uC801\uC6A9"
  },
  characterFx: {
    light: brief(CHAR_LIGHT_OPTIONS),
    particle: brief(CHAR_PARTICLE_OPTIONS),
    intensity: brief(CHAR_INTENSITY_OPTIONS),
    bg: brief(CHAR_BG_OPTIONS, ["fill"])
  },
  typecore: {
    sovereignArchetype: coreArchetypes.map((p) => ({ id: p.id, label: p.shortTitle, description: p.subtitle })),
    sovereignPreset: Object.keys(SCRIPT_PRESETS),
    breezePersona: directorPersonas.map((p) => ({ id: p.id, label: p.shortTitle, description: p.subtitle })),
    aspectRatio: TYPECORE_ASPECTS,
    layout: TYPECORE_LAYOUTS
  },
  renderModels: [
    { id: "gemini-3-pro-image-preview", label: "Nano Banana Pro \u2014 \uACE0\uD488\uC9C8(1K/2K/4K)" },
    { id: "gemini-3.1-flash-image-preview", label: "Nano Banana 2 \u2014 \uBE60\uB984(1K)" }
  ]
});
var server = new McpServer({ name: "nexus-studio", version: "1.0.0" });
server.registerTool("nexus_guide", {
  title: "NEXUS Studio \uAC00\uC774\uB4DC",
  description: "NEXUS Studio MCP \uC0AC\uC6A9\uBC95 \uAC1C\uC694 \u2014 \uC5B4\uB5A4 \uD234\uC744 \uC5B4\uB5A4 \uC21C\uC11C\uB85C \uC870\uD569\uD558\uB294\uC9C0. \uCC98\uC74C\uC774\uB77C\uBA74 \uC774 \uD234\uBD80\uD130 \uD638\uCD9C\uD558\uC138\uC694.",
  inputSchema: {},
  annotations: PURE
}, async () => text(`NEXUS Studio MCP \u2014 NC \uAC8C\uC784 \uD504\uB85C\uBAA8\uC158 \uB514\uC790\uC778 \uD50C\uB7AB\uD3FC\uC758 \uD504\uB86C\uD504\uD2B8 \uC5D4\uC9C4\xB7\uB80C\uB354\xB7\uD53D\uC140 \uD234 \uBAA8\uC74C.

\u25A0 \uAE30\uBCF8 \uD750\uB984
1) nexus_list_options \uB85C \uC635\uC158 \uCE74\uD0C8\uB85C\uADF8(id \uBAA9\uB85D) \uD655\uC778
2) \uD504\uB86C\uD504\uD2B8 \uD234\uB85C \uAC80\uC99D\uB41C \uD504\uB85C\uB355\uC158 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131:
   \xB7 nexus_frameforge_prompt     \u2014 FrameForge \uD504\uB808\uC784\xB7\uBC84\uD2BC\xB7\uBC15\uC2A4\xB7\uBC30\uC9C0\xB7\uB514\uBC14\uC774\uB354\xB7\uC544\uC774\uCF58\xB7\uC7A5\uC2DD\xB7\uC544\uC774\uD15C \uC2AC\uB86F \uC0DD\uC131
   \xB7 nexus_frameforge_kit_prompts \u2014 \uBE0C\uB79C\uB4DC\uC6F9 \uD0A4\uD2B8(\uAC19\uC740 \uC2A4\uD0C0\uC77C\uC758 \uBD80\uD488 \uC138\uD2B8) \uD504\uB86C\uD504\uD2B8 \uC77C\uAD04 \uC0DD\uC131
   \xB7 nexus_lightfx_prompt        \u2014 \uAD11\uC6D0/\uBE5B\uD6A8\uACFC \uC5D0\uC14B (\uC21C\uD751/\uB2E8\uC0C9 \uBC30\uACBD, \uD569\uC131\uC6A9)
   \xB7 nexus_variation_prompt      \u2014 UI \uC5D0\uC14B \uB9AC\uC2A4\uD0A8(\uCEEC\uB7EC\xB7\uC7AC\uC9C8 \uC624\uBC84\uB808\uC774 \uD328\uC2A4, \uAD6C\uC870 \uBCF4\uC874)
   \xB7 nexus_design_alternative_prompt \u2014 \uB514\uC790\uC778 \uB300\uC548(\uBAA8\uD2F0\uD504\xB7\uC7AC\uC9C8 \uC7AC\uD574\uC11D, \uACE8\uACA9 \uC720\uC9C0)
   \xB7 nexus_item_bundle_prompt    \u2014 \uC544\uC774\uD15C \uC5EC\uB7EC \uAC1C \u2192 \uAFB8\uB7EC\uBBF8 \uD569\uC131 (\uC6D0\uBCF8 \uC808\uB300 \uBCF4\uC874)
   \xB7 nexus_quality_up_prompt     \u2014 KV \uBC30\uACBD \uD488\uC9C8 \uD5A5\uC0C1 (\uCE90\uB9AD\uD130\xB7\uD0C0\uC774\uD2C0 \uD615\uD0DC \uBCF4\uC874)
   \xB7 nexus_character_fx_prompt   \u2014 \uCE90\uB9AD\uD130\uC5D0 \uBE5B\xB7\uD30C\uD2F0\uD074 \uC5F0\uCD9C (\uD615\uD0DC 99%\xB7\uC5BC\uAD74 99.9% \uBCF4\uC874)
   \xB7 nexus_render_matrix_prompt   \u2014 \uD50C\uB7AB \uD0C0\uC774\uD3EC \u2192 \uC7AC\uC9C8 \uB80C\uB354 \uD504\uB86C\uD504\uD2B8 (Render Matrix \uC571 \uCEF4\uD30C\uC77C\uB7EC \uB3D9\uC77C, render-matrix|pop)
   \xB7 nexus_title_effect_prompt / nexus_bg_generate_prompt / nexus_bg_compose_prompt / nexus_floating_items_prompt \u2014 NexusPreview \uD0A4\uBE44\uC8FC\uC5BC \uD3B8\uC9D1 4\uBAA8\uB4DC (\uC571 \uBE4C\uB354 \uB3D9\uC77C)
   \xB7 nexus_prompt_audit_prompt   \u2014 Prompt Audit \uAC10\uC0AC\uAD00 \uC9C0\uC2DC\uBB38 (\uBAA8\uB4E0 \uC2A4\uD0AC\uC758 \uD504\uB86C\uD504\uD2B8 QA \uAC8C\uC774\uD2B8)
   \xB7 nexus_theme_preset_prompt   \u2014 Promo Skin \uCEE8\uC149 \u2192 \uD14C\uB9C8 \uD1A0\uD070 \uD504\uB9AC\uC14B
   \xB7 nexus_motion_prompt         \u2014 Motion Matrix Veo \uBAA8\uC158 \uD504\uB86C\uD504\uD2B8
   \xB7 nexus_brief_extraction_prompt / nexus_brief_profile_prompt / nexus_brief_plugin_json \u2014 \uC218\uC815\uC694\uCCAD\uC11C \uBD84\uC11D (\uBC94\uC6A9 \uADDC\uCE59 + \uC624\uC0C1\uC2A4 \uD504\uB85C\uD544, Prism \uB3D9\uC77C)
   \xB7 nexus_typecore_sovereign_prompt \u2014 Typecore Sovereign RPG/\uAC8C\uC784 \uD0C0\uC774\uD2C0 \uD504\uB86C\uD504\uD2B8
   \xB7 nexus_typecore_breeze_prompt    \u2014 Typecore Breeze \uCE90\uC8FC\uC5BC/\uCE98\uB9AC \uD0C0\uC774\uD2C0 \uD504\uB86C\uD504\uD2B8
3) nexus_render_image \uB85C Gemini \uC774\uBBF8\uC9C0 \uBAA8\uB378 \uD638\uCD9C (\uCC38\uC870 \uC774\uBBF8\uC9C0 \uD30C\uC77C \uCCA8\uBD80 \uAC00\uB2A5)
4) \uD6C4\uCC98\uB9AC \uD53D\uC140 \uD234:
   \xB7 nexus_extract_effect      \u2014 Mask Forge \uC774\uD399\uD2B8 \uCEE4\uBE0C(cutoff 6\xB7gamma 0.85) \uD22C\uBA85\uD654, \uC571\uACFC \uB3D9\uC77C \uCF54\uB4DC
   \xB7 nexus_remove_background     \u2014 \uB2E8\uC0C9 \uBC30\uACBD(\uBE14\uB799/\uD06C\uB85C\uB9C8) \uD0A4\uC789 \u2192 \uD22C\uBA85 PNG
   \xB7 nexus_alpha_plan / nexus_alpha_batch \u2014 \uD3F4\uB354 \uB2E8\uC704 \uB300\uB7C9 \uD22C\uBA85\uD654: \uC790\uB3D9 \uBD84\uB958(flat/vignette/glow/nonflat) plan.json \u2192 \uB85C\uCEEC CLI \uBCD1\uB82C \uCC98\uB9AC(\uAC19\uC740 \uCF54\uB4DC). 3\uC7A5 \uC774\uC0C1\uC774\uBA74 \uB2E8\uAC74 \uD234 \uBC18\uBCF5 \uB300\uC2E0 \uC774\uCABD.
   \xB7 nexus_split_character_effect \u2014 \uCE90\uB9AD\uD130/\uBC1C\uAD11 \uC774\uD399\uD2B8 \uBD84\uB9AC (\uC2A4\uD06C\uB9B0 \uBE14\uB80C\uB4DC \uB808\uC774\uC5B4)
   \xB7 nexus_remove_ai             \u2014 \uC704 \uB85C\uCEEC \uBC29\uC2DD\uC758 QA\uAC00 \uC2E4\uD328\uD55C \uACBD\uC6B0\uC5D0\uB9CC \uC0AC\uC6A9\uD558\uB294 Remove.bg AI \uCD5C\uC885 fallback
   \uD22C\uBA85\uD654 \uC6B0\uC120\uC21C\uC704: \uC0C9\uC0C1 \uD0A4\uC789/\uC774\uD399\uD2B8 \uC54C\uD30C/\uCE90\uB9AD\uD130 \uBD84\uB9AC \uAC19\uC740 \uB85C\uCEEC\xB7\uACB0\uC815\uC801 \uBC29\uC2DD \u2192 \uC54C\uD30C\xB7\uAC00\uC7A5\uC790\uB9AC\xB7\uB2EB\uD78C \uACF5\uAC04 QA \u2192 \uC2E4\uD328 \uC2DC\uC5D0\uB9CC nexus_remove_ai.
5) nexus_design_rubric \u2014 \uACB0\uACFC\uBB3C \uD3C9\uAC00\uC6A9 \uB514\uC790\uC778 \uB8E8\uBE0C\uB9AD \xB7 nexus_design_evaluation_prompt \u2014 \uC571\uACFC \uB3D9\uC77C\uD55C \uD3C9\uAC00 \uD504\uB86C\uD504\uD2B8+\uC751\uB2F5 \uC2A4\uD0A4\uB9C8 \xB7 nexus_design_evaluation_score \u2014 \uC571\uACFC \uB3D9\uC77C\uD55C \uAC00\uC911 \uCC44\uC810
6) Banner Codex \uB77C\uC774\uBE0C\uB7EC\uB9AC:
   \xB7 nexus_banner_codex_list \u2014 \uC800\uC7A5 \uBC30\uB108 \uBAA9\uB85D\xB7\uAC80\uC0C9\xB7\uD544\uD130
   \xB7 nexus_banner_codex_get  \u2014 \uBC30\uB108 1\uAC74 \uC0C1\uC138 \uBA54\uD0C0\uB370\uC774\uD130
7) Brand Web \uB77C\uC774\uBE0C\uB7EC\uB9AC:
   \xB7 nexus_brand_web_library_list \u2014 \uBE0C\uB79C\uB4DC\uC6F9 \uBAA9\uB85D\xB7\uAC80\uC0C9\xB7\uD544\uD130
   \xB7 nexus_brand_web_library_get  \u2014 \uBE0C\uB79C\uB4DC\uC6F9 1\uAC74\uACFC \uC804\uCCB4 \uD398\uC774\uC9C0 \uC0C1\uC138
8) Promotion \uB77C\uC774\uBE0C\uB7EC\uB9AC:
   \xB7 nexus_promotion_library_list \u2014 \uD504\uB85C\uBAA8\uC158 \uBAA9\uB85D\xB7\uAC80\uC0C9\xB7\uC810\uC218 \uD544\uD130
   \xB7 nexus_promotion_library_get  \u2014 \uD504\uB85C\uBAA8\uC158 1\uAC74\uACFC PC/\uBAA8\uBC14\uC77C\xB7\uD3C9\uAC00 \uC0C1\uC138
9) Prompt Arc \uB77C\uC774\uBE0C\uB7EC\uB9AC:
   \xB7 nexus_prompt_arc_list \u2014 \uACF5\uAC1C \uD504\uB86C\uD504\uD2B8\xB7\uD0C0\uC774\uD3EC\xB7\uC774\uBBF8\uC9C0 \uAC80\uC0C9
   \xB7 nexus_asset_library_list \u2014 \uBC84\uD2BC\xB7\uD654\uC0B4\uD45C\xB7\uD504\uB808\uC784\xB7FX \uC5D0\uC14B \uAC80\uC0C9
   \xB7 nexus_prompt_arc_get  \u2014 \uD504\uB86C\uD504\uD2B8 \uB2E8\uACC4\xB7\uC774\uBBF8\uC9C0\xB7\uC5F0\uAD00 \uD56D\uBAA9 \uC0C1\uC138

\u25A0 \uADDC\uC57D
- \uC544\uC774\uD15C \uAFB8\uB7EC\uBBF8 \uB80C\uB354\uB294 \uCC38\uC870\uB97C "\uC544\uC774\uD15C 1\uAC1C = \uC774\uBBF8\uC9C0 1\uC7A5" \uC73C\uB85C \uCCA8\uBD80\uD574\uC57C \uC911\uBCF5\uC774 \uC548 \uC0DD\uAE41\uB2C8\uB2E4 (itemCount = \uCC38\uC870 \uC218).
- \uCE90\uB9AD\uD130 \uC5F0\uCD9C\xB7\uD488\uC9C8 \uD5A5\uC0C1 \uB80C\uB354\uB294 \uC6D0\uBCF8 1\uC7A5\uC744 \uCC38\uC870\uB85C \uCCA8\uBD80, matchInputAspect \uC5C6\uC774 4K \uAD8C\uC7A5.
- \uAD11\uC6D0 \uC5D0\uC14B\uC740 \uC21C\uD751 \uBC30\uACBD \uB80C\uB354 \uD6C4 nexus_remove_background(black) \uB85C \uC54C\uD30C \uCD94\uCD9C\uD558\uAC70\uB098 \uC2A4\uD06C\uB9B0 \uBE14\uB80C\uB4DC\uB85C \uD569\uC131.`));
server.registerTool("nexus_list_options", {
  title: "\uC635\uC158 \uCE74\uD0C8\uB85C\uADF8",
  description: "\uBAA8\uB4E0 \uD504\uB86C\uD504\uD2B8 \uD234\uC758 \uC120\uD0DD\uC9C0(id\xB7\uD55C\uAE00 \uB77C\uBCA8)\uB97C JSON \uC73C\uB85C \uBC18\uD658. \uD504\uB86C\uD504\uD2B8 \uD234 \uD638\uCD9C \uC804 \uCC38\uC870.",
  inputSchema: {},
  outputSchema: {
    frameforge: z.record(z.string(), z.any()).describe("nexus_frameforge_prompt \uC120\uD0DD\uC9C0"),
    renderMatrix: z.record(z.string(), z.any()).describe("nexus_render_matrix_prompt \uC120\uD0DD\uC9C0 (variant \uBCC4 \uC635\uC158 id\xB7\uD504\uB9AC\uC14B)"),
    titleFx: z.record(z.string(), z.any()).describe("nexus_title_effect_prompt \uC120\uD0DD\uC9C0"),
    floating: z.record(z.string(), z.any()).describe("nexus_floating_items_prompt \uC120\uD0DD\uC9C0"),
    motion: z.record(z.string(), z.any()).describe("nexus_motion_prompt \uC120\uD0DD\uC9C0"),
    promptAudit: z.record(z.string(), z.any()).describe("nexus_prompt_audit_prompt \uC120\uD0DD\uC9C0"),
    brief: z.record(z.string(), z.any()).describe("nexus_brief_* \uC120\uD0DD\uC9C0 (\uD398\uC774\uC9C0 \uD504\uB85C\uD544\xB7\uB2E8\uACC4)"),
    lightfx: z.record(z.string(), z.any()).describe("nexus_lightfx_prompt \uC120\uD0DD\uC9C0"),
    variation: z.record(z.string(), z.any()).describe("nexus_variation_prompt \uC120\uD0DD\uC9C0"),
    designAlternative: z.record(z.string(), z.any()).describe("nexus_design_alternative_prompt \uC120\uD0DD\uC9C0"),
    itemBundle: z.record(z.string(), z.any()).describe("nexus_item_bundle_prompt \uC120\uD0DD\uC9C0"),
    characterFx: z.record(z.string(), z.any()).describe("nexus_character_fx_prompt \uC120\uD0DD\uC9C0"),
    typecore: z.record(z.string(), z.any()).describe("Typecore Sovereign/Breeze \uC120\uD0DD\uC9C0"),
    renderModels: z.array(z.any()).describe("nexus_render_image \uBAA8\uB378 \uBAA9\uB85D")
  },
  annotations: PURE
}, async () => {
  const catalog = OPTION_CATALOG();
  return data(catalog, JSON.stringify(catalog, null, 2));
});
server.registerTool("nexus_frameforge_prompt", {
  title: "FrameForge UI \uC5D0\uC14B \uD504\uB86C\uD504\uD2B8",
  description: "Nexus FrameForge \uC571\uC758 \uC2E4\uC81C \uC635\uC158\uACFC buildCompletePrompt \uC5D4\uC9C4\uC73C\uB85C \uD504\uB808\uC784\xB7\uBC84\uD2BC\xB7\uBC15\uC2A4\xB7\uBC30\uC9C0\xB7\uB514\uBC14\uC774\uB354\xB7\uC544\uC774\uCF58\xB7\uC7A5\uC2DD(\uD0C0\uC774\uD2C0\xB7\uC139\uC158\xB7\uB0B4\uBE44)\xB7\uC544\uC774\uD15C \uC2AC\uB86F \uC0DD\uC131 \uD504\uB86C\uD504\uD2B8\uB97C \uB9CC\uB4ED\uB2C8\uB2E4. \uACB0\uACFC\uC758 prompt \uC640 aspectRatio \uB97C nexus_render_image\uC5D0 \uC804\uB2EC\uD558\uC138\uC694.",
  inputSchema: {
    assetType: z.enum(FRAMEFORGE_ASSET_TYPES.map((o) => o.key)).describe("\uC6A9\uB3C4: button, box, frame, badge, divider, icon, ornament(\uD0C0\uC774\uD2C0\xB7\uC139\uC158\xB7\uB0B4\uBE44 \uC7A5\uC2DD), slot(\uC544\uC774\uD15C \uC2AC\uB86F\xB7\uD640\uB354)"),
    silhouette: z.enum(FRAMEFORGE_SILHOUETTES.map((o) => o.key)).describe("nexus_list_options\uC758 frameforge.silhouette id. \uC120\uD0DD\uD55C assetType\uACFC for\uAC00 \uC77C\uCE58\uD574\uC57C \uD568"),
    mood: z.enum(FRAMEFORGE_MOODS.map((o) => o.key)).default("dark_rpg").describe("\uBD84\uC704\uAE30 \uD504\uB9AC\uC14B"),
    renderStyle: z.enum(FRAMEFORGE_RENDER_STYLES.map((o) => o.key)).default("illustrated").describe("\uB80C\uB354 \uD45C\uD604 \uBC29\uC2DD"),
    userText: z.string().max(1e3).optional().describe("\uCD94\uAC00 \uC81C\uC791 \uC758\uB3C4. \uACB0\uACFC \uC5D0\uC14B \uB0B4\uBD80\uC5D0 \uC2E4\uC81C \uAE00\uC790\uB97C \uC0DD\uC131\uD558\uB77C\uB294 \uC758\uBBF8\uB85C \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC74C")
  },
  outputSchema: {
    prompt: z.string(),
    aspectRatio: z.string(),
    renderHint: z.string(),
    resolvedOptions: z.record(z.string(), z.any()),
    nextTool: z.literal("nexus_render_image")
  },
  annotations: PURE
}, async (a) => {
  const assetType = FRAMEFORGE_ASSET_TYPES.find((o) => o.key === a.assetType);
  const silhouette = FRAMEFORGE_SILHOUETTES.find((o) => o.key === a.silhouette);
  if (!silhouette?.for?.includes(a.assetType)) {
    return errText(`FrameForge \uD615\uD0DC '${a.silhouette}'\uB294 \uC6A9\uB3C4 '${a.assetType}'\uC5D0 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
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
    renderStyle: renderStyle.key
  };
  const aspectRatio = seedAspectRatio({ assetType, silhouette });
  const renderHint = `aspectRatio ${aspectRatio} \uB85C \uB80C\uB354 \xB7 \uCC38\uC870 \uC774\uBBF8\uC9C0 \uC5C6\uC74C \xB7 \uD504\uB86C\uD504\uD2B8\uC758 \uB2E8\uC0C9 \uACE0\uB300\uBE44 \uBC30\uACBD \uC720\uC9C0 \xB7 Pro 1K \uB610\uB294 Flash 1K \uCD08\uC548 \xB7 \uB80C\uB354 \uD6C4 nexus_remove_background\uB85C \uD22C\uBA85\uD654`;
  return data({ prompt, aspectRatio, renderHint, resolvedOptions, nextTool: "nexus_render_image" }, `${prompt}

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
});
server.registerTool("nexus_frameforge_kit_prompts", {
  title: "FrameForge \uBE0C\uB79C\uB4DC\uC6F9 \uD0A4\uD2B8 \uD504\uB86C\uD504\uD2B8",
  description: "\uBE0C\uB79C\uB4DC\uC6F9 \uD55C \uBC8C\uC5D0 \uB4E4\uC5B4\uAC00\uB294 UI \uBD80\uD488 \uC138\uD2B8(CTA\xB7\uBCF4\uC870 \uBC84\uD2BC\xB7\uD328\uB110\xB7\uD0C0\uC774\uD2C0 \uC7A5\uC2DD\xB7\uB514\uBC14\uC774\uB354\xB7\uBC30\uC9C0\xB7\uC2AC\uB86F\xB7\uC544\uC774\uCF58 \uB4F1)\uB97C \uAC19\uC740 \uBD84\uC704\uAE30\xB7\uC7AC\uC9C8\uB85C \uC77C\uAD04 \uD504\uB86C\uD504\uD2B8\uD654\uD569\uB2C8\uB2E4. \uAC01 \uD56D\uBAA9\uC758 prompt \uC640 aspectRatio \uB97C nexus_render_image \uC5D0 \uC21C\uC11C\uB300\uB85C \uC804\uB2EC\uD558\uC138\uC694.",
  inputSchema: {
    kit: z.enum(FRAMEFORGE_KITS.map((k) => k.key)).default("brandweb_core").describe("\uD0A4\uD2B8: brandweb_core(\uAE30\uBCF8 10\uC885) / brandweb_reward(\uBCF4\uC0C1\xB7\uCFE0\uD3F0 8\uC885) / brandweb_nav(\uB0B4\uBE44\xB7\uC720\uD2F8 8\uC885). nexus_list_options \uC758 frameforge.kit \uCC38\uC870"),
    mood: z.enum(FRAMEFORGE_MOODS.map((o) => o.key)).default("brandweb_gold").describe("\uBD84\uC704\uAE30 \uD504\uB9AC\uC14B \u2014 \uBE0C\uB79C\uB4DC\uC6F9\uC740 brandweb_gold / celestial / crimson_royal / frost_silver / modern_neon \uAD8C\uC7A5"),
    renderStyle: z.enum(FRAMEFORGE_RENDER_STYLES.map((o) => o.key)).default("illustrated").describe("\uB80C\uB354 \uD45C\uD604 \uBC29\uC2DD"),
    userText: z.string().max(1e3).optional().describe("\uBAA8\uB4E0 \uD56D\uBAA9\uC5D0 \uACF5\uD1B5 \uC801\uC6A9\uD560 \uCD94\uAC00 \uC758\uB3C4 (\uAC8C\uC784\uBA85\xB7\uCEEC\uB7EC \uD78C\uD2B8 \uB4F1). \uAE00\uC790 \uC0DD\uC131 \uC9C0\uC2DC\uB85C \uC4F0\uC9C0 \uC54A\uC74C")
  },
  outputSchema: {
    kit: z.string(),
    items: z.array(z.object({ assetType: z.string(), silhouette: z.string(), label: z.string(), aspectRatio: z.string(), prompt: z.string() })),
    sharedStyle: z.record(z.string(), z.any()),
    nextTool: z.literal("nexus_render_image")
  },
  annotations: PURE
}, async (a) => {
  const kit = FRAMEFORGE_KITS.find((k) => k.key === a.kit) || FRAMEFORGE_KITS[0];
  const mood = FRAMEFORGE_MOODS.find((o) => o.key === a.mood) || FRAMEFORGE_MOODS[0];
  const renderStyle = FRAMEFORGE_RENDER_STYLES.find((o) => o.key === a.renderStyle) || FRAMEFORGE_RENDER_STYLES[0];
  const shared = frameForgeSharedAxes(mood, renderStyle);
  const seeds = buildKitSeeds(kit, shared, { userIntent: a.userText || "" });
  const items = seeds.map((q) => ({
    assetType: q.seed.assetType.key,
    silhouette: q.seed.silhouette.key,
    label: `${q.seed.assetType.ko} \xB7 ${q.seed.silhouette.ko}`,
    aspectRatio: seedAspectRatio(q.seed),
    prompt: q.prompt
  }));
  const sharedStyle = { mood: mood.key, preset: mood.preset, material: mood.material, ornament: mood.ornament, renderStyle: renderStyle.key, interior: "empty" };
  const text2 = items.map((it, i) => `${i + 1}. [${it.label} \xB7 ${it.aspectRatio}]
${it.prompt}`).join("\n\n");
  return data({ kit: kit.key, items, sharedStyle, nextTool: "nexus_render_image" }, `${kit.ko} \u2014 ${items.length}\uC885 (\uACF5\uD1B5: ${mood.ko} / ${renderStyle.ko})

${text2}`);
});
var RM_VARIANTS = {
  "render-matrix": { compiler: promptCompiler_exports, options: INITIAL_OPTIONS, personas: DIRECTOR_PERSONAS, engines: RENDER_ENGINES, presets: PRESET_GROUPS2, defaultPersona: "Cinematic", frontRelief: "MicroChiseled" },
  pop: { compiler: promptCompiler_exports2, options: INITIAL_OPTIONS2, personas: DIRECTOR_PERSONAS2, engines: RENDER_ENGINES2, presets: PRESET_GROUPS3, defaultPersona: "Chameleon", frontRelief: "MicroChiseled" }
};
var RM_OPTION_KEYS = [
  ["typographyScale", "typographyScales"],
  ["cameraLens", "cameraLenses"],
  ["background", "backgrounds"],
  ["frontRelief", "frontReliefs"],
  ["projectionDepth", "projectionDepths"],
  ["surfaceTreatment", "surfaceTreatments"],
  ["material", "materials"],
  ["dramaticTex", "dramaticTextures"],
  ["surfaceDetail", "surfaceDetails"],
  ["wearLevel", "wearLevels"],
  ["rimThickness", "rimThicknesses"],
  ["rimColor", "rimColors"],
  ["rimIntensity", "rimIntensities"],
  ["energyCore", "energyCores"],
  ["fxOrigin", "fxOrigins"],
  ["fxIntensity", "fxIntensities"]
];
function rmDefaultState(variant) {
  const v = RM_VARIANTS[variant];
  return {
    currentView: "editor",
    directorPersona: v.defaultPersona,
    complexity: 3,
    typographyScale: "Macro",
    cameraLens: "Telephoto",
    background: "RealBlack",
    frontRelief: v.frontRelief,
    projectionDepth: "None",
    surfaceTreatment: "Standard",
    enableVfx: false,
    enableShadow: false,
    energyCore: "None",
    fxOrigin: "Edges",
    fxIntensity: "Subtle",
    vfxPassMode: false,
    vfxPassOverlay: false,
    material: "HyperChrome",
    materialInt: "Mid",
    dramaticTex: "Auto",
    surfaceDetail: "Standard",
    rimMaterial: "None",
    rimThickness: "None",
    wearLevel: "None",
    rimColor: "White",
    rimIntensity: "Moderate",
    enableGlint: false,
    renderEngine: "Unreal",
    userIntent: "",
    imageRatio: "16:9"
  };
}
function rmValidate(variant, state) {
  const v = RM_VARIANTS[variant];
  const bad = [];
  for (const [stateKey, listKey] of RM_OPTION_KEYS) {
    const list = v.options[listKey] || [];
    if (state[stateKey] != null && !list.some((o) => o.id === state[stateKey])) bad.push(`${stateKey}=${state[stateKey]} (\uAC00\uB2A5: ${list.map((o) => o.id).join("|")})`);
  }
  if (!v.personas.some((p) => p.id === state.directorPersona)) bad.push(`directorPersona=${state.directorPersona} (\uAC00\uB2A5: ${v.personas.map((p) => p.id).join("|")})`);
  if (!v.engines.some((e) => e.id === state.renderEngine)) bad.push(`renderEngine=${state.renderEngine} (\uAC00\uB2A5: ${v.engines.map((e) => e.id).join("|")})`);
  return bad;
}
var RM_STATE_INPUT = {
  variant: z.enum(Object.keys(RM_VARIANTS)).default("render-matrix").describe("render-matrix(RPG\xB7\uD504\uB9AC\uBBF8\uC5C4) | pop(\uCE90\uC8FC\uC5BC\xB7\uD31D). nexus_list_options \uC758 renderMatrix \uCC38\uC870"),
  preset: z.string().optional().describe("PRESET_GROUPS \uD504\uB9AC\uC14B id (\uC608 gold_relic). \uC801\uC6A9 \uD6C4 \uC544\uB798 \uAC1C\uBCC4 \uC635\uC158\uC774 \uB36E\uC5B4\uC500"),
  directorPersona: z.string().optional(),
  typographyScale: z.string().optional(),
  cameraLens: z.string().optional(),
  background: z.string().optional(),
  frontRelief: z.string().optional(),
  projectionDepth: z.string().optional(),
  surfaceTreatment: z.string().optional(),
  material: z.string().optional(),
  dramaticTex: z.string().optional(),
  surfaceDetail: z.string().optional(),
  wearLevel: z.string().optional(),
  rimThickness: z.string().optional(),
  rimColor: z.string().optional(),
  rimIntensity: z.string().optional(),
  enableGlint: z.boolean().optional(),
  enableVfx: z.boolean().optional().describe("true \uBA74 energyCore \uAC00 None \uC774\uC5B4\uB3C4 GoldenDust \uB85C \uCF1C\uC9D0(\uC571 \uB3D9\uC791)"),
  energyCore: z.string().optional(),
  fxOrigin: z.string().optional(),
  fxIntensity: z.string().optional(),
  enableShadow: z.boolean().optional(),
  vfxPassMode: z.boolean().optional().describe("true \uBA74 \uC774\uD399\uD2B8 \uC804\uC6A9 \uD328\uC2A4(\uAC80\uC815 \uC2E4\uB8E8\uC5E3 + \uBC1C\uAD11\uB9CC) \uD504\uB86C\uD504\uD2B8"),
  vfxPassOverlay: z.boolean().optional(),
  renderEngine: z.string().optional(),
  userIntent: z.string().max(1e3).optional().describe("\uCD94\uAC00 \uC5F0\uCD9C \uC758\uB3C4"),
  exactText: z.string().max(400).optional().describe("\uD0C0\uC774\uD3EC \uB0B4\uC6A9 \uB77D \u2014 \uC815\uD655\uD55C \uBB38\uAD6C. \uC8FC\uBA74 \uC571\uACFC \uAC19\uC740 [TYPOGRAPHY CONTENT LOCK] \uC811\uBBF8\uAC00 \uBD99\uC74C"),
  lines: z.array(z.string()).optional().describe("\uD0C0\uC774\uD3EC \uD589 \uBC30\uC5F4 (exactText \uC640 \uD568\uAED8)"),
  strictLock: z.boolean().default(true).describe("render-matrix-typography \uC2A4\uD0AC \uAE30\uBCF8: projectionDepth None \xB7 cameraLens Telephoto \uAC15\uC81C (\uD50C\uB7AB \uD615\uD0DC \uBCF4\uC874)")
};
server.registerTool("nexus_render_matrix_prompt", {
  title: "Render Matrix \uC7AC\uC9C8 \uB80C\uB354 \uD504\uB86C\uD504\uD2B8 (\uC571 \uB3D9\uC77C)",
  description: "\uD50C\uB7AB \uB2E8\uC0C9 \uD0C0\uC774\uD3EC(Typecore \uACB0\uACFC)\uB97C \uC7AC\uC9C8\xB7\uC870\uBA85\xB7FX \uAC00 \uC785\uD600\uC9C4 \uD0C0\uC774\uD2C0\uB85C \uB80C\uB354\uD558\uB294 \uD504\uB86C\uD504\uD2B8\uB97C Render Matrix \uC571\uC758 \uCEF4\uD30C\uC77C\uB7EC(generateIR + compileNanoBanana)\uB85C \uB9CC\uB4ED\uB2C8\uB2E4. \uACB0\uACFC prompt \uB97C \uD50C\uB7AB \uD0C0\uC774\uD3EC \uC774\uBBF8\uC9C0\uB97C \uCC38\uC870\uB85C nexus_render_image \uC5D0 image-to-image \uB85C \uC804\uB2EC\uD558\uC138\uC694. \uC635\uC158 id \uB294 nexus_list_options \uC758 renderMatrix \uCC38\uC870.",
  inputSchema: RM_STATE_INPUT,
  outputSchema: {
    prompt: z.string().describe("NanoBanana(Gemini \uC774\uBBF8\uC9C0) \uC6A9 \u2014 nexus_render_image \uC5D0 \uADF8\uB300\uB85C"),
    prompts: z.record(z.string(), z.string()).describe("NanoBanana / ChatGPT / Midjourney"),
    feelSummary: z.any(),
    auditIssues: z.array(z.any()),
    qualityScores: z.record(z.string(), z.any()),
    state: z.record(z.string(), z.any()),
    renderHint: z.string(),
    nextTool: z.literal("nexus_render_image")
  },
  annotations: PURE
}, async (a) => {
  const variant = a.variant || "render-matrix";
  const v = RM_VARIANTS[variant];
  const state = rmDefaultState(variant);
  if (a.preset) {
    const preset = v.presets.flatMap((g) => g.presets).find((p) => p.id === a.preset);
    if (!preset) return errText(`\uD504\uB9AC\uC14B\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.preset} (\uAC00\uB2A5: ${v.presets.flatMap((g) => g.presets.map((p) => p.id)).join(", ")})`);
    Object.assign(state, preset.settings || {});
  }
  for (const key of Object.keys(RM_STATE_INPUT)) {
    if (["variant", "preset", "exactText", "lines", "strictLock"].includes(key)) continue;
    if (a[key] !== void 0) state[key] = a[key];
  }
  if (a.strictLock !== false) {
    state.projectionDepth = "None";
    state.cameraLens = "Telephoto";
  }
  const bad = rmValidate(variant, state);
  if (bad.length) return errText(`\uC635\uC158 id \uC624\uB958:
${bad.join("\n")}`);
  const C = v.compiler;
  const ir = C.generateIR(state, v.options);
  const lockSuffix = a.exactText ? `

[TYPOGRAPHY CONTENT LOCK \u2014 ABSOLUTE]
Exact text: ${JSON.stringify(a.exactText)}
Exact rows: ${JSON.stringify(a.lines || String(a.exactText).split("\n"))}
Preserve spelling, row count, line breaks, glyph silhouettes, spacing, and approved composition exactly. Change material, depth, lighting, and FX only.` : "";
  const prompts = {
    NanoBanana: C.compileNanoBanana(ir, state) + lockSuffix,
    ChatGPT: (C.compileChatGPT ? C.compileChatGPT(ir, state) : "") + lockSuffix,
    Midjourney: (C.compileMidjourney ? C.compileMidjourney(ir, state) : "") + lockSuffix
  };
  const feelSummary = C.buildFeelSummary ? C.buildFeelSummary(state, v.options) : null;
  const auditIssues = C.performLogicAudit ? C.performLogicAudit(state) : [];
  const qualityScores = C.calculateQualityScore ? C.calculateQualityScore(state) : {};
  const renderHint = `\uD50C\uB7AB \uD0C0\uC774\uD3EC PNG \uB97C \uCC38\uC870 \uC774\uBBF8\uC9C0\uB85C nexus_render_image \uC5D0 image-to-image \xB7 \uBE44\uC728\uC740 \uCC38\uC870 \uC790\uB3D9 \uAC10\uC9C0 \xB7 Pro 2K \uAD8C\uC7A5 \xB7 \uD615\uD0DC \uB77D: projectionDepth ${state.projectionDepth} / cameraLens ${state.cameraLens}${state.vfxPassMode ? " \xB7 \uC774\uD399\uD2B8 \uD328\uC2A4 \uACB0\uACFC\uB294 nexus_extract_effect \uB85C \uD22C\uBA85\uD654" : ""}`;
  const text2 = `${prompts.NanoBanana}

[state] ${JSON.stringify(state)}
[audit] ${auditIssues.length ? JSON.stringify(auditIssues) : "\uC5C6\uC74C"}
[quality] ${JSON.stringify(qualityScores)}
[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`;
  return data({ prompt: prompts.NanoBanana, prompts, feelSummary, auditIssues, qualityScores, state, renderHint, nextTool: "nexus_render_image" }, text2);
});
var idsOf = (list) => list.map((o) => o.key || o.id);
server.registerTool("nexus_title_effect_prompt", {
  title: "\uD0C0\uC774\uD2C0 \uC774\uD399\uD2B8 \uD504\uB86C\uD504\uD2B8 (KV \uD3B8\uC9D1 \uB3D9\uC77C)",
  description: "\uD0C0\uC774\uD2C0/\uB300\uD615 \uD14D\uC2A4\uD2B8 \uC774\uBBF8\uC9C0\uC5D0 \uC18D\uB3C4\uAC10\xB7\uC11C\uB9AC\xB7\uC544\uC6B0\uB77C\xB7\uC548\uAC1C\xB7\uAE08\uBE5B\xB7\uAE00\uB9AC\uCE58\xB7\uBAA8\uC158\uBE14\uB7EC \uB4F1 \uC5F0\uCD9C\uC744 \uB354\uD558\uB294 \uD504\uB86C\uD504\uD2B8\uB97C NexusPreview \uD0C0\uC774\uD2C0 \uC774\uD399\uD2B8 \uBAA8\uB4DC\uC640 \uAC19\uC740 \uBE4C\uB354\uB85C \uB9CC\uB4ED\uB2C8\uB2E4. \uAE00\uC790 \uCCA0\uC790\xB7\uB808\uD130\uD3FC\xB7\uC11C\uCCB4\uB294 100% \uBCF4\uC874. \uACB0\uACFC prompt \uC640 \uD0C0\uC774\uD2C0 PNG \uB97C nexus_render_image \uC5D0 image-to-image \uB85C \uC804\uB2EC\uD558\uC138\uC694.",
  inputSchema: {
    effects: z.array(z.enum(idsOf(TITLE_FX_EFFECTS))).default([]).describe("\uB2E4\uC911 \uC120\uD0DD. \uBE44\uC6B0\uBA74 \uC790\uB3D9(\uBAA8\uB378\uC774 \uBD84\uC11D\uD574 \uC870\uD569)"),
    color: z.enum(idsOf(TITLE_FX_COLORS)).default("auto"),
    direction: z.enum(idsOf(TITLE_FX_DIRECTIONS)).default("auto"),
    intensity: z.enum(idsOf(TITLE_FX_INTENSITY)).default("normal"),
    bg: z.enum(idsOf(TITLE_FX_BG_OPTIONS)).default("keep"),
    intent: z.string().max(800).optional().describe("\uCD94\uAC00 \uC5F0\uCD9C \uC758\uB3C4")
  },
  outputSchema: { prompt: z.string(), renderHint: z.string(), nextTool: z.literal("nexus_render_image") },
  annotations: PURE
}, async (a) => {
  const prompt = buildTitlePrompt(a.effects || [], { color: a.color, direction: a.direction, intensity: a.intensity, bg: a.bg, intent: a.intent || "" });
  const renderHint = "\uD0C0\uC774\uD2C0 PNG \uB97C \uCC38\uC870\uB85C image-to-image \xB7 \uBE44\uC728 \uC790\uB3D9 \xB7 \uACB0\uACFC\uAC00 \uAC80\uC815 \uB9E4\uD2B8\uBA74 nexus_extract_effect \uB85C \uC774\uD399\uD2B8\uB9CC \uBD84\uB9AC \uAC00\uB2A5";
  return data({ prompt, renderHint, nextTool: "nexus_render_image" }, `${prompt}

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
});
server.registerTool("nexus_bg_generate_prompt", {
  title: "KV \uBC30\uACBD \uC0DD\uC131 \uD504\uB86C\uD504\uD2B8 (KV \uD3B8\uC9D1 \uB3D9\uC77C)",
  description: "\uCEE8\uC149 \uD14D\uC2A4\uD2B8(+\uC120\uD0DD \uCC38\uACE0 \uC774\uBBF8\uC9C0)\uB85C \uC778\uBB3C\xB7\uD14D\uC2A4\uD2B8\xB7\uB85C\uACE0 \uC5C6\uB294 \uAC8C\uC784 \uD504\uB85C\uBAA8\uC158 KV \uBC30\uACBD\uC744 \uB9CC\uB4DC\uB294 \uD504\uB86C\uD504\uD2B8. NexusPreview \uBC30\uACBD \uC0DD\uC131 \uBAA8\uB4DC\uC640 \uB3D9\uC77C \uBB38\uAD6C.",
  inputSchema: {
    concept: z.string().min(1).max(1500).describe("\uBC30\uACBD \uCEE8\uC149 (\uD55C\uAD6D\uC5B4 \uC790\uC5F0\uC5B4)"),
    hasReference: z.boolean().default(false).describe("\uCC38\uACE0 \uC774\uBBF8\uC9C0\uB97C \uD568\uAED8 \uBCF4\uB0BC \uACBD\uC6B0 true \u2014 \uBD84\uC704\uAE30\xB7\uC0C9\uAC10\uB9CC \uCC38\uACE0\uD558\uACE0 \uC778\uBB3C\xB7\uAE00\uC790\xB7\uB85C\uACE0 \uBCF5\uC81C \uAE08\uC9C0 \uBB38\uAD6C \uD3EC\uD568"),
    aspectRatio: z.enum(["16:9", "21:9", "4:3", "1:1", "9:16"]).default("16:9")
  },
  outputSchema: { prompt: z.string(), aspectRatio: z.string(), renderHint: z.string(), nextTool: z.literal("nexus_render_image") },
  annotations: PURE
}, async (a) => {
  const prompt = buildBgGeneratePrompt(a.concept, !!a.hasReference);
  const renderHint = `aspectRatio ${a.aspectRatio} \xB7 Pro 2K/4K \uAD8C\uC7A5 \xB7 \uCC38\uACE0 \uC774\uBBF8\uC9C0\uAC00 \uC788\uC73C\uBA74 refs \uB85C \uC804\uB2EC`;
  return data({ prompt, aspectRatio: a.aspectRatio, renderHint, nextTool: "nexus_render_image" }, `${prompt}

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
});
server.registerTool("nexus_bg_compose_prompt", {
  title: "KV \uBC30\uACBD \uD569\uC131 \uD504\uB86C\uD504\uD2B8 (KV \uD3B8\uC9D1 \uB3D9\uC77C)",
  description: "\uAE30\uC874 KV \uBC30\uACBD \uC704\uC5D0 \uC694\uCCAD \uC694\uC18C\uB97C \uB354\uD558\uAC70\uB098(\uD14D\uC2A4\uD2B8 \uC9C0\uC2DC\uB9CC) \uC911\uC559\uC5D0 \uC784\uC2DC \uBC30\uCE58\uD55C \uC18C\uC2A4 \uC774\uBBF8\uC9C0\uB97C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uD569\uC131\uD558\uB294 \uD504\uB86C\uD504\uD2B8. \uC0C8 \uBB38\uC790 \uC0DD\uC131 \uC808\uB300 \uAE08\uC9C0 \uADDC\uCE59 \uD3EC\uD568. NexusPreview \uBC30\uACBD \uD569\uC131 \uBAA8\uB4DC\uC640 \uB3D9\uC77C \uBB38\uAD6C.",
  inputSchema: {
    intent: z.string().min(1).max(1500).describe("\uC0AC\uC6A9\uC790 \uC694\uCCAD (\uBB34\uC5C7\uC744 \uC5B4\uB514\uC5D0 \uC5B4\uB5BB\uAC8C)"),
    hasAsset: z.boolean().default(false).describe("\uC18C\uC2A4 \uC774\uBBF8\uC9C0\uB97C \uBC30\uACBD \uC911\uC559\uC5D0 \uC784\uC2DC \uBC30\uCE58\uD55C \uB4DC\uB798\uD504\uD2B8\uB97C \uCC38\uC870\uB85C \uBCF4\uB0BC \uACBD\uC6B0 true")
  },
  outputSchema: { prompt: z.string(), renderHint: z.string(), nextTool: z.literal("nexus_render_image") },
  annotations: PURE
}, async (a) => {
  const prompt = buildBgComposePrompt(a.intent, !!a.hasAsset);
  const renderHint = "\uBC30\uACBD(\uB610\uB294 \uC18C\uC2A4\uAC00 \uC911\uC559\uC5D0 \uC5B9\uD78C \uB4DC\uB798\uD504\uD2B8)\uC744 \uCC38\uC870\uB85C image-to-image \xB7 matchInputAspect \xB7 4K \uAD8C\uC7A5";
  return data({ prompt, renderHint, nextTool: "nexus_render_image" }, `${prompt}

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
});
server.registerTool("nexus_floating_items_prompt", {
  title: "\uACF5\uC911\uBD80\uC591 \uC544\uC774\uD15C \uD504\uB86C\uD504\uD2B8 (KV \uD3B8\uC9D1 \uB3D9\uC77C)",
  description: "\uC544\uC774\uD15C \uC774\uBBF8\uC9C0\uB4E4\uC744 \uBB3C\uBC29\uC6B8\xB7\uBC88\uAC1C\xB7\uAE08\uBE5B\xB7\uD68C\uC624\uB9AC \uB4F1 \uC6D0\uD615 \uC774\uD399\uD2B8\uB85C \uAC10\uC2F8 \uACF5\uC911\uC5D0 \uB744\uC6B0\uB294 \uD504\uB86C\uD504\uD2B8 \uC138\uD2B8. NexusPreview \uACF5\uC911\uBD80\uC591 \uBAA8\uB4DC\uC640 \uB3D9\uC77C \uBE4C\uB354 \u2014 \uB9C8\uC2A4\uD130 \uD504\uB86C\uD504\uD2B8\uC640, layered-transparent \uBAA8\uB4DC\uC77C \uB54C \uD544\uC694\uD55C \uBCF4\uC815\xB7\uBD84\uB9AC(\uC774\uD399\uD2B8/\uC544\uC774\uD15C) \uD504\uB86C\uD504\uD2B8\uB97C \uD568\uAED8 \uBC18\uD658\uD569\uB2C8\uB2E4.",
  inputSchema: {
    itemCount: z.number().int().min(1).max(12).describe("\uC544\uC774\uD15C \uCC38\uC870 \uC774\uBBF8\uC9C0 \uAC1C\uC218"),
    effect: z.enum(idsOf(FLOATING_EFFECT_OPTIONS)).default("bubble"),
    form: z.enum(idsOf(FLOATING_FORM_OPTIONS)).default("broken-orbit"),
    layout: z.enum(idsOf(FLOATING_LAYOUT_OPTIONS)).default("each"),
    color: z.enum(idsOf(FLOATING_COLORS)).default("auto"),
    intensity: z.enum(idsOf(FLOATING_INTENSITY_OPTIONS)).default("medium"),
    motion: z.enum(idsOf(FLOATING_MOTION_OPTIONS)).default("clockwise"),
    density: z.enum(idsOf(FLOATING_DENSITY_OPTIONS)).default("medium"),
    outputMode: z.enum(idsOf(FLOATING_OUTPUT_OPTIONS)).default("layered-transparent"),
    groupMode: z.enum(idsOf(FLOATING_GROUP_OPTIONS)).default("auto"),
    groupAssignments: z.array(z.number().int()).optional().describe("custom \uADF8\uB8F9 \uBAA8\uB4DC\uC77C \uB54C \uC544\uC774\uD15C\uBCC4 \uADF8\uB8F9 \uBC88\uD638"),
    primaryIndex: z.number().int().min(0).default(0),
    opening: z.number().min(0).max(100).optional().describe("\uB9C1 \uAC1C\uBC29 \uBE44\uC728 %"),
    frontCross: z.number().min(0).max(100).optional().describe("\uC804\uBC29 \uAD50\uCC28 \uD5C8\uC6A9 %"),
    bg: z.enum(idsOf(BUNDLE_BG_OPTIONS)).default("black"),
    extra: z.string().max(800).optional()
  },
  outputSchema: {
    prompt: z.string(),
    groupPlan: z.record(z.string(), z.any()),
    repairPrompt: z.string(),
    separationPrompts: z.record(z.string(), z.string()),
    aspectRatio: z.string(),
    renderHint: z.string(),
    nextTool: z.literal("nexus_render_image")
  },
  annotations: PURE
}, async (a) => {
  const bg = BUNDLE_BG_OPTIONS.find((o) => o.key === a.bg) || BUNDLE_BG_OPTIONS[0];
  const groupPlan = resolveFloatingGroupPlan(a.itemCount, a.groupMode, a.groupAssignments || [], a.primaryIndex);
  const opts = {
    effect: a.effect,
    form: a.form,
    layout: a.layout,
    color: a.color,
    intensity: a.intensity,
    motion: a.motion,
    density: a.density,
    outputMode: a.outputMode,
    opening: a.opening,
    frontCross: a.frontCross,
    groupMode: a.groupMode,
    groupAssignments: a.groupAssignments || [],
    primaryIndex: a.primaryIndex,
    itemCount: a.itemCount,
    bg,
    extra: a.extra || ""
  };
  const prompt = buildFloatingPrompt(opts);
  const repairPrompt = buildFloatingRepairPrompt({ itemCount: a.itemCount, groupMode: a.groupMode, groupAssignments: a.groupAssignments || [], primaryIndex: a.primaryIndex });
  const separationPrompts = a.outputMode === "layered-transparent" ? { effect: buildFloatingSeparationPrompt("effect", { itemCount: a.itemCount }), items: buildFloatingSeparationPrompt("items", { itemCount: a.itemCount }) } : {};
  const aspectRatio = a.itemCount === 1 ? "1:1" : "16:9";
  const renderHint = `\uC544\uC774\uD15C PNG ${a.itemCount}\uC7A5\uC744 \uC21C\uC11C\uB300\uB85C refs \uB85C \xB7 aspectRatio ${aspectRatio} \xB7 layered-transparent \uBA74 \uB9C8\uC2A4\uD130 \u2192 (\uBCF4\uC815) \u2192 \uBD84\uB9AC 2\uD68C \uB80C\uB354 \uD6C4 \uC774\uD399\uD2B8\uB294 nexus_extract_effect, \uC544\uC774\uD15C\uC740 nexus_remove_background(chroma) \uB85C \uD22C\uBA85\uD654`;
  return data(
    { prompt, groupPlan, repairPrompt, separationPrompts, aspectRatio, renderHint, nextTool: "nexus_render_image" },
    `${prompt}

[groupPlan] ${JSON.stringify(groupPlan)}
[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`
  );
});
server.registerTool("nexus_prompt_audit_prompt", {
  title: "\uD504\uB86C\uD504\uD2B8 \uAC10\uC0AC \uC9C0\uC2DC\uBB38 (Prompt Audit \uB3D9\uC77C)",
  description: "PromptAudit \uC571\uC774 Gemini \uC5D0 \uBCF4\uB0B4\uB294 \uAC10\uC0AC\uAD00 \uC9C0\uC2DC\uBB38(\uCDA9\uB3CC \uC720\uD615 6\uC885\xB7\uC2EC\uAC01\uB3C4\xB7JSON \uCD9C\uB825 \uD615\uC2DD\xB7\uB3C4\uBA54\uC778 \uCEE8\uD14D\uC2A4\uD2B8)\uC744 \uC785\uB825 \uD504\uB86C\uD504\uD2B8\uC640 \uD569\uCCD0 \uB3CC\uB824\uC90D\uB2C8\uB2E4. \uC774 \uD14D\uC2A4\uD2B8\uB97C \uADF8\uB300\uB85C \uBAA8\uB378\uC5D0 \uC8FC\uBA74 \uC571\uACFC \uAC19\uC740 \uD615\uC2DD\uC758 \uAC10\uC0AC \uACB0\uACFC(summary/score/conflicts/improvedPrompt JSON)\uB97C \uC5BB\uC2B5\uB2C8\uB2E4. \uC5B4\uB5A4 \uC2A4\uD0AC\uC774\uB4E0 \uACB0\uACFC \uD504\uB86C\uD504\uD2B8\uC758 QA \uAC8C\uC774\uD2B8\uB85C \uC0AC\uC6A9\uD558\uC138\uC694.",
  inputSchema: {
    prompt: z.string().min(1).max(PROMPT_MAX_LENGTH).describe(`\uAC10\uC0AC\uD560 \uD504\uB86C\uD504\uD2B8 (\uCD5C\uB300 ${PROMPT_MAX_LENGTH}\uC790)`),
    sourceApp: z.enum(Object.keys(SOURCE_CONTEXT)).optional().describe("\uB3C4\uBA54\uC778 \uCEE8\uD14D\uC2A4\uD2B8"),
    title: z.string().max(200).optional().describe("\uC6D0\uBCF8 \uC81C\uBAA9(\uC788\uC73C\uBA74)")
  },
  outputSchema: { auditPrompt: z.string(), expectedShape: z.string(), conflictTypes: z.array(z.string()) },
  annotations: PURE
}, async (a) => {
  const auditPrompt = buildAuditPromptText(a.prompt, a.sourceApp || null, a.title ? { title: a.title } : null);
  const expectedShape = '{ "summary": string, "score": 0-100, "conflicts": [{ id, type, severity: high|med|low, title, evidence, explanation, suggestions: [{ label, rewrite }] }], "globalSuggestions": string[], "improvedPrompt": string }';
  return data({ auditPrompt, expectedShape, conflictTypes: Object.keys(CONFLICT_TYPES) }, auditPrompt);
});
server.registerTool("nexus_theme_preset_prompt", {
  title: "\uD14C\uB9C8 \uD504\uB9AC\uC14B \uD504\uB86C\uD504\uD2B8 (Promo Skin \uB3D9\uC77C)",
  description: "\uD504\uB85C\uBAA8\uC158 \uD398\uC774\uC9C0 \uCEE8\uC149(\uD55C\uAD6D\uC5B4)\uC5D0\uC11C \uCEEC\uB7EC \uD1A0\uD070(primary/accent/title/bg \uADF8\uB77C\uB370\uC774\uC158 \uB4F1)\uACFC \uBCC0\uD615(frame/button/motif) \uD504\uB9AC\uC14B JSON \uC744 \uBF51\uB294 \uC2DC\uC2A4\uD15C \uD504\uB86C\uD504\uD2B8\uC640 \uC751\uB2F5 \uC2A4\uD0A4\uB9C8\uB97C \uB3CC\uB824\uC90D\uB2C8\uB2E4. Promo Skin \uC571\uACFC \uB3D9\uC77C. \uBE0C\uB79C\uB4DC\uC6F9 \uC790\uB3D9\uD654\uC758 \uCEEC\uB7EC \uC2DC\uC2A4\uD15C \uB2E8\uACC4\uC5D0 \uC0AC\uC6A9.",
  inputSchema: { concept: z.string().min(1).max(600).describe("\uD398\uC774\uC9C0 \uCEE8\uC149 (\uC608: \uACA8\uC6B8 \uC11C\uB9AC \uC655\uAD6D, \uD669\uAE08 \uCD95\uC81C)") },
  outputSchema: { systemPrompt: z.string(), userPrompt: z.string(), responseSchema: z.record(z.string(), z.any()) },
  annotations: PURE
}, async (a) => {
  const userPrompt = `\uCEE8\uC149: ${a.concept}`;
  return data({ systemPrompt: SYSTEM_PROMPT, userPrompt, responseSchema: RESPONSE_SCHEMA }, `${SYSTEM_PROMPT}

${userPrompt}`);
});
server.registerTool("nexus_motion_prompt", {
  title: "\uBAA8\uC158 \uD504\uB86C\uD504\uD2B8 (Motion Matrix \uB3D9\uC77C)",
  description: "\uB80C\uB354\uB41C \uD0C0\uC774\uD2C0/\uC624\uBE0C\uC81D\uD2B8 \uC774\uBBF8\uC9C0\uC5D0 \uB8E8\uD504\xB7\uC778\uD2B8\uB85C\xB7\uD2B8\uB79C\uC9C0\uC158 \uBAA8\uC158\uC744 \uC8FC\uB294 Veo \uD504\uB86C\uD504\uD2B8(+\uB124\uAC70\uD2F0\uBE0C)\uB97C Motion Matrix \uC571 \uCEF4\uD30C\uC77C\uB7EC\uB85C \uB9CC\uB4ED\uB2C8\uB2E4. \uC635\uC158 id \uB294 nexus_list_options \uC758 motion \uCC38\uC870. \uACB0\uACFC prompt \uB97C \uC774\uBBF8\uC9C0\uC640 \uD568\uAED8 Veo(30c) \uB80C\uB354\uC5D0 \uC0AC\uC6A9\uD558\uC138\uC694.",
  inputSchema: {
    animationMode: z.enum(["loop", "intro", "transition"]).default("loop"),
    exportMode: z.enum(idsOf(EXPORT_MODES)).default("production"),
    targetModel: z.string().default("universal").describe("universal | veo \uB4F1 \u2014 \uCD5C\uC801\uD654 \uB300\uC0C1 \uBAA8\uB378 \uD78C\uD2B8"),
    targetMaterial: z.string().default("ice"),
    vfxTarget: z.string().default("all"),
    layers: z.record(z.string(), z.any()).optional().describe("\uB808\uC774\uC5B4 \uC124\uC815 \uB36E\uC5B4\uC4F0\uAE30 \u2014 \uAE30\uBCF8\uC740 \uC571 DEFAULT_LAYERS. \uD0A4: surface/edge/ambient(\uBAA8\uB4DC\uBCC4 FX id), intensity, duration, flow, intro, dynamics"),
    optimize: z.boolean().default(true).describe("\uC571\uC758 inspectAndOptimizePrompt \uC801\uC6A9 (\uAE30\uBCF8 on)")
  },
  outputSchema: { prompt: z.string(), rawPrompt: z.string(), negativePrompt: z.string(), layers: z.record(z.string(), z.any()), optimizationLogs: z.array(z.any()), renderHint: z.string() },
  annotations: PURE
}, async (a) => {
  const lists = MOTION_FX_LISTS[a.animationMode] || MOTION_FX_LISTS.loop;
  const layers = { ...DEFAULT_LAYERS, ...a.layers || {} };
  for (const key of ["surface", "edge", "ambient"]) {
    if (!lists[key].some((o) => o.id === layers[key])) layers[key] = lists[key][0].id;
  }
  const rawPrompt = compileRawPrompt(layers, a.exportMode, a.animationMode, a.targetMaterial, a.vfxTarget, a.targetModel, lists.surface, lists.edge, lists.ambient);
  const negativePrompt = compileNegativePrompt(layers, a.exportMode, a.animationMode, a.targetModel, lists.surface, lists.edge, lists.ambient);
  const opt = a.optimize ? inspectAndOptimizePrompt(rawPrompt, a.targetModel) : { optimizedText: rawPrompt, logs: [] };
  const prompt = opt.optimizedText || rawPrompt;
  const renderHint = `Veo \uBAA8\uB378: ${VEO_MODELS.map((m) => m.id).join(" | ")} \xB7 \uC18C\uC2A4 \uC774\uBBF8\uC9C0\uB97C \uCCAB \uD504\uB808\uC784 \uCC38\uC870\uB85C \xB7 \uC601\uC0C1 30c`;
  return data({ prompt, rawPrompt, negativePrompt, layers, optimizationLogs: opt.logs || [], renderHint }, `${prompt}

[negative] ${negativePrompt}
[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
});
server.registerTool("nexus_brief_extraction_prompt", {
  title: "\uC218\uC815\uC694\uCCAD\uC11C \uBC94\uC6A9 \uCD94\uCD9C \uD504\uB86C\uD504\uD2B8 (Prism \uB3D9\uC77C)",
  description: "\uC5B4\uB5A4 \uAC8C\uC784\xB7\uD398\uC774\uC9C0\uC758 \uC81C\uC791/\uC218\uC815\uC694\uCCAD\uC11C\uB4E0 \uD398\uC774\uC9C0 \uAD6C\uC870(\uC139\uC158 \uD328\uD134 \uC5B4\uD718)\uC640 \uC138\uBD80 \uB370\uC774\uD130\uB97C \uBF51\uB294 \uBC94\uC6A9 \uCD94\uCD9C \uD504\uB86C\uD504\uD2B8 + \uC751\uB2F5 \uC2A4\uD0A4\uB9C8. \uC61B \uCEA1\uCC98 \uBB34\uC2DC\xB7\uBD89\uC740\uC0C9 \uAC15\uC870\xB7A\u2192B \uCE58\uD658\xB7\uBB38\uC11C \uC591\uC2DD \uBB34\uC2DC \uAC19\uC740 \uD574\uC11D \uADDC\uCE59\uC774 \uD3EC\uD568\uB3FC \uC788\uC2B5\uB2C8\uB2E4. \uD2B9\uC815 \uD398\uC774\uC9C0 \uD15C\uD50C\uB9BF(\uC624\uC0C1\uC2A4 \uB4F1)\uC740 nexus_brief_profile_prompt \uB97C \uC4F0\uC138\uC694.",
  inputSchema: { extraNote: z.string().max(1500).optional().describe("\uC0AC\uC6A9\uC790 \uAD50\uC815 \uC9C0\uC2DC (\uCD5C\uC6B0\uC120 \uBC18\uC601)"), includeOpsPrompt: z.boolean().default(false).describe("Figma \uD15C\uD50C\uB9BF ops \uACE8\uACA9\uC5D0 \uAC12\uC744 \uCC44\uC6B0\uB294 2\uB2E8\uACC4 \uD504\uB86C\uD504\uD2B8 \uC0AC\uC6A9\uBC95\uB3C4 \uD3EC\uD568") },
  outputSchema: { prompt: z.string(), responseSchema: z.record(z.string(), z.any()), patternVocab: z.string(), revisionRules: z.string(), opsPromptUsage: z.string().optional(), opsSchema: z.record(z.string(), z.any()).optional() },
  annotations: PURE
}, async (a) => {
  const prompt = extractionPrompt(a.extraNote || "");
  const out = { prompt, responseSchema: EXTRACTION_SCHEMA, patternVocab: PATTERN_VOCAB, revisionRules: GENERIC_REVISION_RULES };
  if (a.includeOpsPrompt) {
    out.opsPromptUsage = "\uCD94\uCD9C JSON \uACFC Figma \uD15C\uD50C\uB9BF ops \uC2A4\uD0A4\uB9C8 JSON \uC744 \uC778\uC790\uB85C opsPrompt(extractedJson, schemaJson) \uD615\uD0DC\uB85C \uACB0\uD569 \u2014 value/match \uB9CC \uAD50\uCCB4, id/slot/type/\uC21C\uC11C \uBD88\uBCC0. \uC608: " + opsPrompt("<extractedJson>", "<schemaJson>").slice(0, 400);
    out.opsSchema = OPS_SCHEMA;
  }
  return data(out, `${prompt}

[responseSchema] ${JSON.stringify(EXTRACTION_SCHEMA).slice(0, 600)}\u2026`);
});
server.registerTool("nexus_brief_profile_prompt", {
  title: "\uC218\uC815\uC694\uCCAD\uC11C \uD398\uC774\uC9C0 \uD504\uB85C\uD544 \uD504\uB86C\uD504\uD2B8 (Prism \uC624\uC0C1\uC2A4 \uB3D9\uC77C)",
  description: "\uD398\uC774\uC9C0 \uD15C\uD50C\uB9BF \uD504\uB85C\uD544(\uC624\uC0C1\uC2A4 = \uC624\uB298\uC758 \uC0C1\uD488 \uC2A4\uD398\uC15C)\uC758 \uB2E8\uACC4\uBCC4 \uD504\uB86C\uD504\uD2B8\uC640 \uC751\uB2F5 \uC2A4\uD0A4\uB9C8\uB97C \uC571(BriefStudio Prism)\uACFC \uB3D9\uC77C\uD558\uAC8C \uB3CC\uB824\uC90D\uB2C8\uB2E4. \uD750\uB984: transcribe(\uC774\uBBF8\uC9C0/PDF \u2192 \uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9 \uC804\uC0AC + \uBE68\uAC15 \uB300\uD45C \uC544\uC774\uCF58 redItems) \u2192 extract(\uC804\uC0AC \uD14D\uC2A4\uD2B8\uB9CC\uC73C\uB85C \uC2AC\uB86F \uAD6C\uC870\uD654, \uC774\uBBF8\uC9C0 \uBBF8\uC804\uB2EC) \u2192 \uD544\uC694 \uC2DC merge(2\uCC28 \uC694\uCCAD\uC11C \uBCD1\uD569). \uACB0\uACFC \uB370\uC774\uD130\uB294 nexus_brief_plugin_json \uC73C\uB85C \uD50C\uB7EC\uADF8\uC778 JSON \uD654.",
  inputSchema: {
    profile: z.string().default("osangseu").describe("\uD398\uC774\uC9C0 \uD504\uB85C\uD544 id \u2014 nexus_list_options \uC758 brief.profile"),
    stage: z.enum(["transcribe", "extract", "merge"]).default("transcribe"),
    note: z.string().max(1500).optional().describe("\uCD94\uAC00 \uC9C0\uC2DC (extract/merge)"),
    sourceText: z.string().max(2e4).optional().describe("extract/merge \uB2E8\uACC4: transcribe \uACB0\uACFC transcript \uD14D\uC2A4\uD2B8 \u2014 \uD504\uB86C\uD504\uD2B8 \uB4A4\uC5D0 [\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9 (\uC804\uC0AC)] \uB85C \uBD99\uC784"),
    redItems: z.array(z.object({ box: z.string(), item: z.string() })).optional().describe("transcribe \uACB0\uACFC redItems \u2014 \uC8FC\uBA74 \uC571\uACFC \uAC19\uC774 [\uBD89\uC740\uC0C9 \uB300\uD45C \uC544\uC774\uCF58 (\uC0C1\uC790\u2192\uC544\uC774\uD15C)] \uBAA9\uB85D\uC744 \uC804\uC0AC \uBCF8\uBB38\uC5D0 \uBD99\uC784"),
    baseText: z.string().max(2e4).optional().describe("\uC694\uCCAD\uC11C\uC640 \uD568\uAED8 \uC628 \uCD94\uAC00 \uC785\uB825 \uD14D\uC2A4\uD2B8"),
    prevJson: z.string().max(6e4).optional().describe("merge \uB2E8\uACC4: \uC9C1\uC804 \uCC28\uC218 \uD655\uC815 \uB370\uC774\uD130 JSON \uBB38\uC790\uC5F4")
  },
  outputSchema: { profile: z.string(), stage: z.string(), prompt: z.string(), responseSchema: z.record(z.string(), z.any()), input: z.string(), note: z.string(), nextStage: z.string() },
  annotations: PURE
}, async (a) => {
  const profile = getPrismProfile(a.profile);
  if (!profile) return errText(`\uD504\uB85C\uD544\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.profile} (\uAC00\uB2A5: ${listPrismProfiles().map((p) => p.id).join(", ")})`);
  const st = profile.stages[a.stage];
  if (!st) return errText(`\uD504\uB85C\uD544 ${profile.key} \uC5D0 ${a.stage} \uB2E8\uACC4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.`);
  let prompt;
  if (a.stage === "transcribe") prompt = st.prompt();
  else if (a.stage === "extract") {
    const redByBox = profile.groupRedItems ? profile.groupRedItems(a.redItems || []) : [];
    const body = profile.buildTranscriptSourceText ? profile.buildTranscriptSourceText({ transcript: a.sourceText || "", redByBox, baseText: a.baseText || "" }) : a.sourceText || "";
    prompt = st.prompt(a.note || "") + (body ? `

[\uBC18\uC601 \uD76C\uB9DD \uB0B4\uC6A9 (\uC804\uC0AC)]
${body}` : "");
  } else {
    if (!a.prevJson) return errText("merge \uB2E8\uACC4\uC5D0\uB294 prevJson(\uC9C1\uC804 \uCC28\uC218 \uB370\uC774\uD130)\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
    prompt = st.prompt(a.prevJson, a.note || "") + (a.sourceText ? `

[\uC774\uBC88 \uCC28\uC218 \uBCC0\uACBD (\uC804\uC0AC)]
${a.sourceText}` : "");
  }
  const nextStage = a.stage === "transcribe" ? "extract (transcript \uB97C sourceText \uB85C, redItems \uB294 boxes \uC21C\uC11C\uB300\uB85C slotIcons \uC5D0 ` + ` \uB85C \uACB0\uD569)" : "nexus_brief_plugin_json";
  return data(
    { profile: profile.key, stage: a.stage, prompt, responseSchema: st.schema, input: st.input, note: st.note, nextStage },
    `${prompt}

[input] ${st.input}
[responseSchema] ${JSON.stringify(st.schema).slice(0, 500)}\u2026
[next] ${nextStage}`
  );
});
server.registerTool("nexus_brief_plugin_json", {
  title: "\uD504\uB85C\uD544 \uB370\uC774\uD130 \u2192 \uD50C\uB7EC\uADF8\uC778 JSON (Prism \uB3D9\uC77C)",
  description: "extract/merge \uACB0\uACFC \uB370\uC774\uD130\uB97C \uD398\uC774\uC9C0 \uD504\uB85C\uD544\uC758 toPluginJson(\uC571\uACFC \uB3D9\uC77C)\uC73C\uB85C Figma \uD50C\uB7EC\uADF8\uC778 \uC785\uB825 JSON \uC73C\uB85C \uBC14\uAFB8\uACE0 \uD1B5\uACC4\uB97C \uB3CC\uB824\uC90D\uB2C8\uB2E4.",
  inputSchema: {
    profile: z.string().default("osangseu"),
    data: z.record(z.string(), z.any()).describe("extract/merge \uB2E8\uACC4 \uC751\uB2F5 JSON"),
    redItems: z.array(z.object({ box: z.string(), item: z.string() })).optional().describe("transcribe \uC758 redItems \u2014 \uC8FC\uBA74 \uC571\uACFC \uAC19\uC774 boxes \uC21C\uC11C\uC5D0 \uB9DE\uCDB0 slotIcons \uC5D0 \uACB0\uC815\uC801\uC73C\uB85C \uC8FC\uC785(` + ` \uACB0\uD569)")
  },
  outputSchema: { profile: z.string(), data: z.record(z.string(), z.any()), pluginJson: z.record(z.string(), z.any()), stats: z.record(z.string(), z.any()), uncertain: z.array(z.any()) },
  annotations: PURE
}, async (a) => {
  const profile = getPrismProfile(a.profile);
  if (!profile) return errText(`\uD504\uB85C\uD544\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.profile}`);
  let payload = JSON.parse(JSON.stringify(a.data || {}));
  if (a.redItems?.length && profile.applyRedIconsToBoxes) payload = profile.applyRedIconsToBoxes(payload, profile.groupRedItems(a.redItems));
  const pluginJson = profile.toPluginJson(payload);
  const stats = profile.stats(payload);
  const uncertain = Array.isArray(payload?.uncertain) ? payload.uncertain : [];
  return data({ profile: profile.key, data: payload, pluginJson, stats, uncertain }, `${JSON.stringify(pluginJson, null, 1).slice(0, 1500)}

[stats] ${JSON.stringify(stats)}${uncertain.length ? `
[uncertain] ${uncertain.length}\uAC74` : ""}`);
});
server.registerTool("nexus_typecore_sovereign_prompt", {
  title: "Typecore Sovereign \uD0C0\uC774\uD2C0 \uD504\uB86C\uD504\uD2B8",
  description: "Nexus Typecore Sovereign\uC758 \uC2E4\uC81C \uD398\uB974\uC18C\uB098/\uC870\uD615 \uC5B8\uC5B4\uB85C RPG\xB7\uC804\uD22C\xB7\uC2DC\uB124\uB9C8\uD2F1 \uAC8C\uC784 \uD0C0\uC774\uD2C0\uC6A9 2D \uD751\uBC31 \uD504\uB86C\uD504\uD2B8\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4. \uACB0\uACFC\uB97C nexus_render_image\uC5D0 \uC804\uB2EC\uD558\uC138\uC694.",
  inputSchema: {
    text: z.string().min(1).max(120).describe("\uC815\uD655\uD788 \uB80C\uB354\uD560 \uD0C0\uC774\uD2C0 \uBB38\uAD6C. \uC904\uBC14\uAFC8 \uC720\uC9C0"),
    archetype: z.enum(coreArchetypes.map((p) => p.id)).default("core_fortress").describe("nexus_list_options\uC758 typecore.sovereignArchetype id"),
    preset: z.enum(["", ...Object.keys(SCRIPT_PRESETS)]).default("").describe("\uACF5\uC6A9 Sovereign \uAE00\uC790 \uBAA8\uC591 \uD504\uB9AC\uC14B. \uBE48 \uAC12\uC740 \uD398\uB974\uC18C\uB098 \uAE30\uBCF8\uAC12"),
    aspectRatio: z.enum(TYPECORE_ASPECTS).default("16:9").describe("\uCD9C\uB825 \uBE44\uC728"),
    layout: z.enum(TYPECORE_LAYOUTS).default("1Line").describe("\uD0C0\uC774\uD2C0 \uC904 \uAD6C\uC131 (1/2/3\uC904)"),
    occupancy: z.number().int().min(30).max(85).default(70).describe("\uCE94\uBC84\uC2A4 \uB0B4 \uD0C0\uC774\uD2C0 \uC810\uC720\uC728(%)"),
    enhanceMode: z.enum(["refine", "variation", "deconstruct"]).default("refine").describe("\uC870\uD615 \uC815\uC81C \uBC29\uC2DD \u2014 refine(\uC815\uC81C)\xB7variation(\uBCC0\uC8FC)\xB7deconstruct(\uD574\uCCB4)"),
    momentum: z.boolean().default(false).describe("\uB3D9\uC138/\uC728\uB3D9\uAC10 \uAC15\uC870"),
    extra: z.string().max(1e3).optional().describe("\uCD94\uAC00 \uC870\uD615 \uBC29\uD5A5")
  },
  outputSchema: TYPECORE_OUT,
  annotations: PURE
}, async (a) => {
  const exactText = normalizedTitleText(a.text);
  const compiled = buildSovereignMcpPrompt(a);
  const prompt = compiled.prompt;
  const renderHint = `aspectRatio: ${a.aspectRatio} \xB7 Flash 1K \uCD08\uC548 \uB610\uB294 Pro 1K \xB7 \uCC38\uC870 \uC774\uBBF8\uC9C0 \uC5C6\uC74C \xB7 \uC21C\uD751 \uBC30\uACBD`;
  return data({ prompt, renderHint, engine: "sovereign", exactText, background: "black", nextTool: "nexus_render_image", resolvedOptions: compiled.resolvedOptions, selectionReasons: compiled.selectionReasons }, `${prompt}

[\uC120\uD0DD \uC635\uC158]
${compiled.selectionReasons.join("\n")}

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
});
server.registerTool("nexus_typecore_breeze_prompt", {
  title: "Typecore Breeze \uD0C0\uC774\uD2C0 \uD504\uB86C\uD504\uD2B8",
  description: "Nexus Typecore Breeze \uC571\uC758 \uC2E4\uC81C buildPrompts \uC5D4\uC9C4\uC73C\uB85C \uCE90\uC8FC\uC5BC\xB7\uCE98\uB9AC\xB7\uC2A4\uD2F0\uCEE4 \uD0C0\uC774\uD2C0\uC6A9 2D \uD751\uBC31 \uD504\uB86C\uD504\uD2B8\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4. \uACB0\uACFC\uB97C nexus_render_image\uC5D0 \uC804\uB2EC\uD558\uC138\uC694.",
  inputSchema: {
    text: z.string().min(1).max(120).describe("\uC815\uD655\uD788 \uB80C\uB354\uD560 \uD0C0\uC774\uD2C0 \uBB38\uAD6C. \uC904\uBC14\uAFC8 \uC720\uC9C0"),
    persona: z.enum(directorPersonas.map((p) => p.id)).default("bubble_pop").describe("nexus_list_options\uC758 typecore.breezePersona id"),
    aspectRatio: z.enum(TYPECORE_ASPECTS).default("16:9").describe("\uCD9C\uB825 \uBE44\uC728"),
    layout: z.enum(TYPECORE_LAYOUTS).default("1Line").describe("\uD0C0\uC774\uD2C0 \uC904 \uAD6C\uC131 (1/2/3\uC904)"),
    occupancy: z.number().int().min(30).max(85).default(70).describe("\uCE94\uBC84\uC2A4 \uB0B4 \uD0C0\uC774\uD2C0 \uC810\uC720\uC728(%)"),
    intensity: z.number().int().min(0).max(100).default(50).describe("\uD398\uB974\uC18C\uB098 \uAC15\uB3C4 \uC2AC\uB77C\uC774\uB354 (0\u2013100)"),
    enhanceMode: z.enum(["perfection", "wild", "creative"]).default("perfection").describe("\uC815\uC81C \uBC29\uC2DD \u2014 perfection(\uC644\uC131\uB3C4)\xB7wild(\uACFC\uAC10)\xB7creative(\uCC3D\uC758)"),
    momentum: z.boolean().default(false).describe("\uB3D9\uC138/\uC728\uB3D9(\uBC14\uC6B4\uC2DC) \uAC15\uC870"),
    extra: z.string().max(1e3).optional().describe("\uCD94\uAC00 \uC870\uD615 \uBC29\uD5A5")
  },
  outputSchema: TYPECORE_OUT,
  annotations: PURE
}, async (a) => {
  const exactText = normalizedTitleText(a.text);
  const prompt = buildBreezeMcpPrompt(a);
  const renderHint = `aspectRatio: ${a.aspectRatio} \xB7 Flash 1K \uCD08\uC548 \uB610\uB294 Pro 1K \xB7 \uCC38\uC870 \uC774\uBBF8\uC9C0 \uC5C6\uC74C \xB7 \uC21C\uD751 \uBC30\uACBD`;
  const resolvedOptions = { persona: a.persona, aspectRatio: a.aspectRatio, layout: a.layout, occupancy: a.occupancy, intensity: a.intensity, enhanceMode: a.enhanceMode, momentum: a.momentum };
  const selectionReasons = [`persona ${a.persona}: native Breeze buildPrompts`, `layout ${a.layout}, aspect ${a.aspectRatio}, occupancy ${a.occupancy}%`];
  return data({ prompt, renderHint, engine: "breeze", exactText, background: "black", nextTool: "nexus_render_image", resolvedOptions, selectionReasons }, `${prompt}

[\uC120\uD0DD \uC635\uC158]
${selectionReasons.join("\n")}

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
});
server.registerTool("nexus_render_image", {
  title: "Gemini \uC774\uBBF8\uC9C0 \uB80C\uB354",
  description: "\uD504\uB86C\uD504\uD2B8(+\uCC38\uC870 \uC774\uBBF8\uC9C0 \uD30C\uC77C)\uB85C Gemini \uC774\uBBF8\uC9C0 \uBAA8\uB378\uC744 \uD638\uCD9C\uD574 PNG \uB97C \uC800\uC7A5\uD558\uACE0 \uACBD\uB85C\uB97C \uBC18\uD658. \uD504\uB86C\uD504\uD2B8 \uD234\uACFC \uC870\uD569\uD574 \uC0AC\uC6A9. GEMINI_API_KEY \uD544\uC694.",
  inputSchema: {
    prompt: z.string().describe("\uC774\uBBF8\uC9C0 \uC0DD\uC131 \uD504\uB86C\uD504\uD2B8 (nexus_*_prompt \uD234 \uACB0\uACFC \uAD8C\uC7A5)"),
    model: z.enum(["gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview"]).default("gemini-3-pro-image-preview").describe("Pro=\uACE0\uD488\uC9C8(2K/4K), Flash=\uBE60\uB984(1K)"),
    referenceImagePaths: z.array(z.string()).max(8).optional().describe("\uCC38\uC870 \uC774\uBBF8\uC9C0 \uD30C\uC77C \uACBD\uB85C\uB4E4 (png/jpg/webp). \uC544\uC774\uD15C \uAFB8\uB7EC\uBBF8\uB294 \uC544\uC774\uD15C\uB2F9 1\uC7A5"),
    aspectRatio: z.string().regex(/^\d{1,2}:\d{1,2}$/, "\uD615\uC2DD\uC740 'W:H' (\uC608: 1:1, 16:9, 4:3, 21:9)").optional().describe("\uAC00\uB85C:\uC138\uB85C \uBE44\uC728 \u2014 \uC608: 1:1, 16:9, 4:3, 21:9. \uC0DD\uB7B5 \uC2DC \uBAA8\uB378 \uAE30\uBCF8"),
    imageSize: z.enum(["1K", "2K", "4K"]).optional().describe("Pro \uBAA8\uB378 \uC804\uC6A9 \uD574\uC0C1\uB3C4 (Flash \uB294 \uBB34\uC2DC)"),
    outputPath: z.string().optional().describe("\uC800\uC7A5 \uACBD\uB85C(.png \uAD8C\uC7A5). \uC0DD\uB7B5 \uC2DC .tmp/mcp-out/ \uC544\uB798 \uC790\uB3D9")
  },
  outputSchema: {
    outputPath: z.string().describe("\uC800\uC7A5\uB41C PNG \uC808\uB300\uACBD\uB85C"),
    model: z.string().describe("\uC0AC\uC6A9\uB41C \uBAA8\uB378 id"),
    imageSize: z.string().optional().describe("\uC801\uC6A9\uB41C \uD574\uC0C1\uB3C4 (Pro \uB9CC)"),
    aspectRatio: z.string().optional().describe("\uC801\uC6A9\uB41C \uBE44\uC728")
  },
  annotations: RENDER
}, async ({ prompt, model, referenceImagePaths, aspectRatio, imageSize, outputPath }) => {
  const key = geminiKey();
  if (!key) return errText("GEMINI_API_KEY \uAC00 \uC5C6\uC2B5\uB2C8\uB2E4 \u2014 \uD658\uACBD\uBCC0\uC218 \uB610\uB294 \uB9AC\uD3EC \uB8E8\uD2B8 .env \uC5D0 \uC124\uC815\uD558\uC138\uC694 (VITE_ \uC811\uB450\uC0AC \uC544\uB2D8).");
  const parts = [];
  for (const p of referenceImagePaths || []) {
    try {
      parts.push({ inlineData: fileToInlineData(p) });
    } catch (e) {
      return errText(`\uCC38\uC870 \uC774\uBBF8\uC9C0\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${p} \u2014 ${e.message}`);
    }
  }
  parts.push({ text: prompt });
  const generationConfig = { responseModalities: ["IMAGE", "TEXT"] };
  const isPro = /-pro-/.test(model);
  const size = isPro ? imageSize || "2K" : void 0;
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
      body: JSON.stringify({ contents: [{ parts }], generationConfig })
    });
  } catch (e) {
    return errText(`Gemini API \uD638\uCD9C \uC2E4\uD328(\uB124\uD2B8\uC6CC\uD06C): ${e.message} \u2014 \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uACE0 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.`);
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message || "";
    } catch {
    }
    const hint = res.status === 401 || res.status === 403 ? " \u2014 GEMINI_API_KEY \uB97C \uD655\uC778\uD558\uC138\uC694." : res.status === 429 ? " \u2014 \uC694\uCCAD \uD55C\uB3C4 \uCD08\uACFC, \uC7A0\uC2DC \uD6C4 \uC7AC\uC2DC\uB3C4\uD558\uC138\uC694." : "";
    return errText(`Gemini API ${res.status}${detail ? ` \u2014 ${detail}` : ""}${hint}`);
  }
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    return errText(`Gemini \uC751\uB2F5\uC744 \uD30C\uC2F1\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${e.message}`);
  }
  const resParts = payload.candidates?.[0]?.content?.parts || [];
  const imgPart = resParts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
  if (!imgPart) {
    const reason = payload.candidates?.[0]?.finishReason || payload.promptFeedback?.blockReason || "unknown";
    const textOut = resParts.find((p) => p.text)?.text || "";
    return errText(`\uC774\uBBF8\uC9C0\uAC00 \uBC18\uD658\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4 (finishReason: ${reason}) \u2014 \uD504\uB86C\uD504\uD2B8\uB97C \uC644\uD654\uD558\uAC70\uB098(\uC548\uC804 \uD544\uD130) \uBB38\uAD6C\uB97C \uBC14\uAFD4 \uC7AC\uC2DC\uB3C4\uD558\uC138\uC694.${textOut ? `
\uBAA8\uB378 \uD14D\uC2A4\uD2B8: ${textOut.slice(0, 500)}` : ""}`);
  }
  const out = outputPath ? path2.isAbsolute(outputPath) ? outputPath : path2.join(ROOT, outputPath) : path2.join(ensureOutDir(OUT_DIR), `render-${Date.now()}.png`);
  try {
    ensureOutDir(path2.dirname(out));
    fs2.writeFileSync(out, Buffer.from(imgPart.inlineData.data, "base64"));
  } catch (e) {
    return errText(`\uC774\uBBF8\uC9C0 \uC800\uC7A5 \uC2E4\uD328: ${out} \u2014 \uCD9C\uB825 \uACBD\uB85C(outputPath)\uB97C \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  return data(
    { outputPath: out, model, imageSize: size, aspectRatio: aspectRatio || void 0 },
    `\uC800\uC7A5 \uC644\uB8CC: ${out}
\uBAA8\uB378: ${model}${size ? ` \xB7 ${size}` : ""}${aspectRatio ? ` \xB7 ${aspectRatio}` : ""}`
  );
});
server.registerTool("nexus_lightfx_prompt", {
  title: "\uAD11\uC6D0/\uBE5B\uD6A8\uACFC \uD504\uB86C\uD504\uD2B8",
  description: "RubiconForge \uAD11\uC6D0\xB7\uBE5B\uD6A8\uACFC \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131 \u2014 \uC21C\uD751(\uB610\uB294 \uB2E8\uC0C9) \uBC30\uACBD \uC704 \uD569\uC131\uC6A9 \uBC1C\uAD11 \uC5D0\uC14B. \uACB0\uACFC\uB97C nexus_render_image \uC5D0 \uC804\uB2EC. \uC635\uC158 id \uB294 nexus_list_options \uCC38\uC870.",
  inputSchema: {
    category: idEnum(LIGHTFX_CATEGORIES).describe("\uD6A8\uACFC \uC885\uB958"),
    style: idEnum(LIGHTFX_STYLES).describe("\uBE5B \uC9C8\uAC10/\uC2A4\uD0C0\uC77C"),
    color: idEnum(LIGHTFX_COLORS).describe("\uBE5B \uC0C9\uC0C1"),
    form: idEnum(LIGHTFX_FORMS).optional().describe("\uBC30\uCE58 \uD615\uD0DC (\uC0DD\uB7B5=\uC790\uC720)"),
    material: idEnum(LIGHTFX_MATERIALS).optional().describe("\uC7AC\uC9C8/\uD45C\uBA74 (\uD615\uD0DC \uBCC0\uD615)"),
    grain: idEnum(LIGHTFX_GRAINS).optional().describe("\uC785\uC790 \uD06C\uAE30"),
    bokeh: idEnum(LIGHTFX_BOKEHS).optional().describe("\uBCF4\uCF00 \uD06C\uAE30"),
    intensity: z.enum(["subtle", "medium", "strong"]).default("medium"),
    shape: z.enum(["none", "square", "circle", "rectangle"]).default("none").describe("\uC804\uCCB4 \uC2E4\uB8E8\uC5E3 \uAC00\uC774\uB4DC"),
    bg: idEnum(BG_COLORS).default("black").describe("\uBC30\uACBD \uB2E8\uC0C9"),
    userText: z.string().optional().describe("\uCD94\uAC00 \uC694\uCCAD (\uC790\uC720 \uD14D\uC2A4\uD2B8)"),
    hasRef: z.boolean().default(false).describe("\uCC38\uC870 \uC774\uBBF8\uC9C0\uB97C \uCCA8\uBD80\uD574 \uADF8 \uC704\uCE58/\uC2E4\uB8E8\uC5E3\uC5D0 \uC575\uCEE4\uD560\uC9C0"),
    index: z.number().int().min(0).default(0).describe("\uBCA0\uB9AC\uC5D0\uC774\uC158 \uBC88\uD638"),
    compact: z.boolean().default(false).describe("true=\uCC57 \uBD99\uC5EC\uB123\uAE30\uC6A9 \uCEF4\uD329\uD2B8 \uBC84\uC804")
  },
  outputSchema: PROMPT_OUT,
  annotations: PURE
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
    materialHint: a.material ? LIGHTFX_MATERIAL_BY_ID[a.material]?.hint || "" : "",
    grainHint: a.grain ? LIGHTFX_GRAIN_BY_ID[a.grain]?.hint || "" : "",
    bokehHint: a.bokeh ? LIGHTFX_BOKEH_BY_ID[a.bokeh]?.hint || "" : "",
    edgeHug: !!(a.hasRef && form?.edgeHug)
  };
  const prompt = a.compact ? buildCompactLightFxPrompt(args) : buildLightFxPrompt(args);
  const renderHint = !a.hasRef && cat.ratio ? `aspectRatio: ${cat.ratio}` : void 0;
  return data({ prompt, renderHint }, prompt + (renderHint ? `

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}` : ""));
});
server.registerTool("nexus_variation_prompt", {
  title: "UI \uC5D0\uC14B \uB9AC\uC2A4\uD0A8 \uD504\uB86C\uD504\uD2B8",
  description: "RubiconForge \uB9AC\uC2A4\uD0A8(\uBCC0\uD615) \uD504\uB86C\uD504\uD2B8 \u2014 \uC6D0\uBCF8 UI \uC5D0\uC14B(\uBC84\uD2BC/\uCE74\uB4DC/\uD504\uB808\uC784)\uC744 \uCC38\uC870\uB85C \uCCA8\uBD80\uD558\uACE0 \uCEEC\uB7EC\xB7\uC7AC\uC9C8\uB9CC \uBC14\uAFB8\uB294 \uC624\uBC84\uB808\uC774 \uD328\uC2A4. \uAD6C\uC870\xB7\uC7A5\uC2DD \uC218\xB7\uB450\uAED8 \uBCF4\uC874\uC774 \uD575\uC2EC.",
  inputSchema: {
    style: idEnum(ALL_VARIATION_STYLES).describe("\uD14C\uB9C8 \uC2A4\uD0C0\uC77C (mood \uBCC4 \uBAA9\uB85D\uC740 nexus_list_options)"),
    refinement: idEnum(REFINEMENT_LEVELS).default("source").describe("\uC7A5\uC2DD \uBC00\uB3C4 \uC815\uC81C"),
    temperature: idEnum(ATMOSPHERE_TEMPERATURE).optional().describe("\uBD84\uC704\uAE30 \uC628\uB3C4"),
    age: idEnum(ATMOSPHERE_AGE).optional().describe("\uC138\uC6D4/\uB9C8\uAC10"),
    bg: idEnum(BG_COLORS).default("black").describe("\uBC30\uACBD \uB2E8\uC0C9"),
    stripAmbientLight: z.boolean().default(false).describe("\uC8FC\uBCC0 \uAD11\uC6D0 \uC81C\uAC70 \u2014 \uC624\uBE0C\uC81D\uD2B8\uB9CC"),
    outlineOnly: z.boolean().default(false).describe("\uC678\uACFD\uC120\uB9CC \uB514\uC790\uC778\xB7\uB0B4\uBD80 \uB2E8\uC0C9"),
    hasBackgroundRef: z.boolean().default(false).describe("\uB450 \uBC88\uC9F8 \uCC38\uC870(\uBC30\uCE58\uB420 \uBC30\uACBD) \uCCA8\uBD80 \uC5EC\uBD80"),
    compact: z.boolean().default(false).describe("true=\uCC57 \uBD99\uC5EC\uB123\uAE30\uC6A9 \uCEF4\uD329\uD2B8 \uBC84\uC804")
  },
  outputSchema: PROMPT_OUT,
  annotations: PURE
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
    bg: BG_COLOR_BY_ID[a.bg] || DEFAULT_BG
  };
  const prompt = a.compact ? buildCompactVariationPrompt(args) : buildVariationPrompt(args);
  return data({ prompt }, prompt);
});
server.registerTool("nexus_design_alternative_prompt", {
  title: "\uB514\uC790\uC778 \uB300\uC548 \uD504\uB86C\uD504\uD2B8",
  description: "RubiconForge \uB514\uC790\uC778 \uB300\uC548(\uB9AC\uB514\uC790\uC778) \uD504\uB86C\uD504\uD2B8 \u2014 \uC6D0\uBCF8 UI \uC5D0\uC14B\uC744 \uCC38\uC870\uB85C \uCCA8\uBD80\uD558\uACE0 \uBAA8\uD2F0\uD504\xB7\uC7AC\uC9C8\xB7\uB0B4\uBD80 \uAD6C\uC131\uC744 \uC7AC\uD574\uC11D. \uACE8\uACA9(\uB450\uAED8\xB7\uBE44\uC728\xB7\uC2E4\uB8E8\uC5E3)\uC740 \uC720\uC9C0.",
  inputSchema: {
    direction: idEnum(DESIGN_VARIATIONS).describe("\uBCC0\uD615 \uBC29\uD5A5"),
    strength: idEnum(VARIATION_STRENGTH).default("moderate").describe("\uBCC0\uD615 \uAC15\uB3C4"),
    extraDirection: z.string().optional().describe("\uCD94\uAC00 \uBC29\uD5A5 \uC9C0\uC2DC (\uC790\uC720 \uD14D\uC2A4\uD2B8)"),
    bg: idEnum(BG_COLORS).default("black").describe("\uBC30\uACBD \uB2E8\uC0C9"),
    stripAmbientLight: z.boolean().default(false).describe("\uC8FC\uBCC0 \uAD11\uC6D0 \uC81C\uAC70 \u2014 \uC624\uBE0C\uC81D\uD2B8\uB9CC"),
    outlineOnly: z.boolean().default(false).describe("\uC678\uACFD\uC120\uB9CC \uB514\uC790\uC778\xB7\uB0B4\uBD80 \uB2E8\uC0C9"),
    hasBackgroundRef: z.boolean().default(false).describe("\uB450 \uBC88\uC9F8 \uCC38\uC870(\uBC30\uCE58\uB420 \uBC30\uACBD) \uCCA8\uBD80 \uC5EC\uBD80"),
    compact: z.boolean().default(false).describe("true=\uCC57 \uBD99\uC5EC\uB123\uAE30\uC6A9 \uCEF4\uD329\uD2B8 \uBC84\uC804")
  },
  outputSchema: PROMPT_OUT,
  annotations: PURE
}, async (a) => {
  const dir = DESIGN_VARIATION_BY_ID[a.direction];
  const strength = VARIATION_STRENGTH_BY_ID[a.strength];
  const directionBlock = a.extraDirection ? `${dir.promptBlock} ${String(a.extraDirection).trim()}` : dir.promptBlock;
  const args = {
    directionBlock,
    directionHint: directionBlock,
    strengthBlock: strength?.promptBlock,
    strengthHint: strength?.promptBlock,
    hasBackgroundRef: !!a.hasBackgroundRef,
    stripAmbientLight: !!a.stripAmbientLight,
    outlineOnly: !!a.outlineOnly,
    bg: BG_COLOR_BY_ID[a.bg] || DEFAULT_BG
  };
  const prompt = a.compact ? buildCompactDesignAlternativePrompt(args) : buildDesignAlternativePrompt(args);
  return data({ prompt }, prompt);
});
server.registerTool("nexus_item_bundle_prompt", {
  title: "\uC544\uC774\uD15C \uAFB8\uB7EC\uBBF8 \uD504\uB86C\uD504\uD2B8",
  description: "NexusPreview \uC544\uC774\uD15C \uAFB8\uB7EC\uBBF8 \uD569\uC131 \uD504\uB86C\uD504\uD2B8 \u2014 \uC544\uC774\uD15C \uC774\uBBF8\uC9C0 N\uC7A5\uC744 \uCC38\uC870\uB85C \uCCA8\uBD80(1\uC7A5=1\uC544\uC774\uD15C)\uD558\uBA74 \uC6D0\uBCF8 \uD615\uD0DC\xB7\uD14D\uC2A4\uD2B8 \uC808\uB300 \uBCF4\uC874\uC73C\uB85C \uD55C \uAFB8\uB7EC\uBBF8\uC5D0 \uBC30\uCE58. itemCount \uB294 \uCC38\uC870 \uC218\uC640 \uC77C\uCE58\uC2DC\uCF1C\uC57C \uC911\uBCF5\uC774 \uC548 \uC0DD\uAE40.",
  inputSchema: {
    itemCount: z.number().int().min(1).max(8).describe("\uC544\uC774\uD15C(\uCC38\uC870 \uC774\uBBF8\uC9C0) \uC218 \u2014 \uBC18\uB4DC\uC2DC \uCCA8\uBD80 \uC218\uC640 \uC77C\uCE58"),
    light: keyEnum(BUNDLE_LIGHT_OPTIONS).default("soft").describe("\uBE5B \uD6A8\uACFC"),
    ground: keyEnum(BUNDLE_GROUND_OPTIONS).default("shadow").describe("\uBC14\uB2E5 \uC774\uD399\uD2B8"),
    magicColor: keyEnum(BUNDLE_MAGIC_COLORS).default("gold").describe("\uBC14\uB2E5 \uC774\uD399\uD2B8 \uC0C9 (colorable ground \uB9CC \uC801\uC6A9)"),
    bg: keyEnum(BUNDLE_BG_OPTIONS).default("black").describe("\uBC30\uACBD (\uBE14\uB799/\uD06C\uB85C\uB9C8 \uADF8\uB9B0)"),
    layout: keyEnum(BUNDLE_LAYOUT_OPTIONS).default("normal").describe("\uBC30\uCE58 (\uAE30\uBCF8/\uC881\uAC8C)"),
    intent: z.string().optional().describe("\uCD94\uAC00 \uC694\uCCAD \u2014 \uC608: '\uC0C1\uC790\uB294 \uD06C\uAC8C'")
  },
  outputSchema: {
    ...PROMPT_OUT,
    itemCount: z.number().int().describe("\uCCA8\uBD80\uD574\uC57C \uD558\uB294 \uCC38\uC870 \uC774\uBBF8\uC9C0 \uC218 (\uC544\uC774\uD15C\uB2F9 1\uC7A5)"),
    magicColorApplied: z.boolean().describe("magicColor \uAC00 \uC2E4\uC81C \uC801\uC6A9\uB410\uB294\uC9C0 (colorable ground \uC5EC\uBD80)")
  },
  annotations: PURE
}, async (a) => {
  const prompt = buildBundlePrompt(a.light, a.ground, a.magicColor, a.intent || "", a.itemCount, a.bg, a.layout);
  const magicColorApplied = isColorableGround(a.ground);
  const renderHint = `aspectRatio: 4:3 \xB7 \uCC38\uC870 = \uC544\uC774\uD15C\uB2F9 1\uC7A5 (${a.itemCount}\uC7A5)`;
  const colorNote = magicColorApplied ? "" : "\n\n[\uC548\uB0B4] \uC120\uD0DD\uD55C \uBC14\uB2E5 \uC774\uD399\uD2B8\uB294 \uC0C9 \uC9C0\uC815\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC544 magicColor \uAC00 \uBB34\uC2DC\uB429\uB2C8\uB2E4.";
  return data(
    { prompt, renderHint, itemCount: a.itemCount, magicColorApplied },
    prompt + `

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}` + colorNote
  );
});
server.registerTool("nexus_quality_up_prompt", {
  title: "KV \uBC30\uACBD \uD488\uC9C8 \uD5A5\uC0C1 \uD504\uB86C\uD504\uD2B8",
  description: "NexusPreview \uBC30\uACBD \uD004\uB9AC\uD2F0\uC5C5 \uD504\uB86C\uD504\uD2B8 \u2014 KV(\uD0A4\uBE44\uC8FC\uC5BC) \uC6D0\uBCF8 1\uC7A5\uC744 \uCC38\uC870\uB85C \uCCA8\uBD80\uD558\uBA74 \uCE90\uB9AD\uD130\xB7\uD0C0\uC774\uD2C0 \uD615\uD0DC\uB294 \uBCF4\uC874\uD558\uACE0 \uBC30\uACBD\uC758 \uBE5B\xB7\uC0C9\xB7\uB300\uAE30\uB9CC \uB4DC\uB77C\uB9C8\uD2F1\uD558\uAC8C \uAC15\uD654. \uC0C8 \uCE90\uB9AD\uD130/\uD0C0\uC774\uD2C0/\uD14D\uC2A4\uD2B8 \uC0DD\uC131 \uAE08\uC9C0 \uAC00\uB4DC \uD3EC\uD568.",
  inputSchema: {
    extra: z.string().optional().describe("\uCD94\uAC00 \uD6A8\uACFC/\uC9C0\uC2DC (\uD615\uD0DC \uBCC0\uACBD \uC694\uCCAD\uC740 \uC774\uC911 \uAC00\uB4DC\uB85C \uBB34\uC2DC\uB428)"),
    moodPresets: z.string().optional().describe("\uBD84\uC704\uAE30 \uD504\uB9AC\uC14B \uC9C0\uC2DC \uB77C\uC778\uB4E4 (\uAC13\uB808\uC774/\uD30C\uD2F0\uD074 \uB4F1)"),
    themePalette: z.string().optional().describe("\uD504\uB85C\uBAA8\uC158 \uCEEC\uB7EC \uC2DC\uC2A4\uD15C(\uD14C\uB9C8 \uD314\uB808\uD2B8) \uC5F0\uB3D9 \uC9C0\uC2DC")
  },
  outputSchema: PROMPT_OUT,
  annotations: PURE
}, async (a) => {
  const mood = String(a.moodPresets || "").trim();
  const palette = String(a.themePalette || "").trim();
  const e = String(a.extra || "").trim();
  const skillIds = buildQualityUpSkillIds(Boolean(mood || palette), Boolean(e));
  const prompt = composeSkillsFs(skillIds, { extraInstructions: e, moodPresets: mood, themePalette: palette });
  const renderHint = "\uC6D0\uBCF8 1\uC7A5 \uCC38\uC870 \uCCA8\uBD80 \xB7 imageSize 4K \uAD8C\uC7A5";
  return data({ prompt, renderHint }, prompt + `

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
});
server.registerTool("nexus_character_fx_prompt", {
  title: "\uCE90\uB9AD\uD130 \uB80C\uB354 \uD5A5\uC0C1 \uD504\uB86C\uD504\uD2B8",
  description: "NexusPreview \uCE90\uB9AD\uD130 \uC5F0\uCD9C \uD504\uB86C\uD504\uD2B8 \u2014 \uCE90\uB9AD\uD130 \uC6D0\uBCF8 1\uC7A5\uC744 \uCC38\uC870\uB85C \uCCA8\uBD80\uD558\uBA74 \uD615\uD0DC 99%\xB7\uC5BC\uAD74 99.9% \uBCF4\uC874 \uC870\uAC74\uC73C\uB85C \uBE5B\xB7\uD30C\uD2F0\uD074 \uC5F0\uCD9C\uC744 \uCD94\uAC00. \uBD84\uB9AC(\uB204\uB07C)\uD558\uAE30 \uC26C\uC6B4 \uBC30\uACBD\uC0C9\uC744 \uC790\uB3D9 \uACB0\uC815.",
  inputSchema: {
    light: keyEnum(CHAR_LIGHT_OPTIONS).default("auto").describe("\uBE5B \uD6A8\uACFC"),
    particle: keyEnum(CHAR_PARTICLE_OPTIONS).default("auto").describe("\uD30C\uD2F0\uD074"),
    intensity: keyEnum(CHAR_INTENSITY_OPTIONS).default("normal").describe("\uC5F0\uCD9C \uAC15\uB3C4"),
    bg: keyEnum(CHAR_BG_OPTIONS).default("auto").describe("\uBC30\uACBD \u2014 auto \uB294 \uC5F0\uCD9C\uB85C\uBD80\uD130 \uBD84\uB9AC \uCD5C\uC801\uC0C9 \uC790\uB3D9"),
    extra: z.string().optional().describe("\uCD94\uAC00 \uC9C0\uC2DC")
  },
  outputSchema: {
    ...PROMPT_OUT,
    resolvedBg: z.string().describe("\uC790\uB3D9 \uACB0\uC815\uB41C \uBC30\uACBD id (black/chroma/\u2026)"),
    nextTool: z.string().describe("\uB80C\uB354 \uD6C4 \uAD8C\uC7A5 \uD6C4\uCC98\uB9AC \uD234")
  },
  annotations: PURE
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
    extraInstructions: e
  });
  const nextTool = bgResolved === "black" ? "nexus_split_character_effect" : "nexus_remove_background";
  const renderHint = `\uC6D0\uBCF8 1\uC7A5 \uCC38\uC870 \uCCA8\uBD80 \xB7 imageSize 4K \uAD8C\uC7A5 \xB7 \uACB0\uC815\uB41C \uBC30\uACBD: ${bg.ko}${bg.fill ? ` (${bg.fill})` : ""}`;
  const full = prompt + `

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint} \u2014 \uC774\uD6C4 ${bgResolved === "black" ? "nexus_split_character_effect \uB85C \uCE90\uB9AD\uD130/\uC774\uD399\uD2B8 \uBD84\uB9AC" : "nexus_remove_background \uB85C \uD0A4\uC789"} \uAC00\uB2A5`;
  return data({ prompt, renderHint, resolvedBg: bgResolved, nextTool }, full);
});
server.registerTool("nexus_remove_ai", {
  title: "\uBC30\uACBD \uC81C\uAC70 (Remove.bg AI)",
  description: "\uC0C9\uC0C1 \uD0A4\uC789\xB7\uC774\uD399\uD2B8 \uC54C\uD30C\xB7\uCE90\uB9AD\uD130 \uBD84\uB9AC \uB4F1 \uB85C\uCEEC \uD22C\uBA85\uD654\uAC00 \uC2E4\uD328\uD558\uAC70\uB098 QA\uB97C \uD1B5\uACFC\uD558\uC9C0 \uBABB\uD588\uC744 \uB54C\uB9CC \uC0AC\uC6A9\uD558\uB294 \uCD5C\uC885 fallback. Remove.bg AI \uD53C\uC0AC\uCCB4 \uC138\uADF8\uBA58\uD14C\uC774\uC158\uC73C\uB85C \uD5C8\uC6A9\uB41C \uB85C\uCEEC \uC774\uBBF8\uC9C0\uC758 \uBC30\uACBD\uC744 \uC81C\uAC70\uD574 \uD22C\uBA85 PNG\uB85C \uC800\uC7A5. \uC774\uBBF8\uC9C0\uB97C \uC678\uBD80 Remove.bg API\uB85C \uC804\uC1A1\uD558\uACE0 \uACC4\uC815 \uD06C\uB808\uB527\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC73C\uBBC0\uB85C \uD638\uCD9C\uB9C8\uB2E4 \uBA85\uC2DC\uC801 \uD655\uC778\uC774 \uD544\uC694\uD568. REMOVE_BG_API_KEY \uBC0F REMOVE_BG_ALLOWED_ROOTS \uC0AC\uC6A9.",
  inputSchema: {
    imagePath: z.string().describe("REMOVE_BG_ALLOWED_ROOTS \uC544\uB798\uC758 \uC785\uB825 \uC774\uBBF8\uC9C0 \uACBD\uB85C(png\xB7jpg\xB7webp)"),
    confirmExternalUpload: z.literal(true).describe("\uC774\uBBF8\uC9C0\uB97C Remove.bg\uB85C \uC804\uC1A1\uD558\uACE0 \uD06C\uB808\uB527\uC774 \uC0AC\uC6A9\uB420 \uC218 \uC788\uC74C\uC744 \uC774\uBC88 \uD638\uCD9C\uC5D0 \uD55C\uD574 \uBA85\uC2DC\uC801\uC73C\uB85C \uD655\uC778"),
    size: z.enum(["auto", "preview", "full"]).default("auto").describe("Remove.bg \uCD9C\uB825 \uD06C\uAE30. auto \uAD8C\uC7A5"),
    outputPath: z.string().optional().describe("\uD5C8\uC6A9\uB41C \uB8E8\uD2B8 \uC544\uB798\uC758 \uC800\uC7A5 \uACBD\uB85C(.png). \uC0DD\uB7B5 \uC2DC .tmp/mcp-out \uC544\uB798 \uC790\uB3D9")
  },
  outputSchema: {
    outputPath: z.string().describe("\uC800\uC7A5\uB41C \uD22C\uBA85 PNG \uC808\uB300\uACBD\uB85C"),
    size: z.string(),
    creditsCharged: z.string().nullable(),
    freeCallsRemaining: z.string().nullable()
  },
  annotations: { ...WRITE_LOCAL, openWorldHint: true }
}, async (a) => {
  const key = envValue("REMOVE_BG_API_KEY");
  if (!key) return errText("REMOVE_BG_API_KEY \uAC00 \uC5C6\uC2B5\uB2C8\uB2E4 \u2014 \uD658\uACBD\uBCC0\uC218 \uB610\uB294 \uB9AC\uD3EC \uB8E8\uD2B8 .env \uC5D0 \uC124\uC815\uD558\uC138\uC694 (VITE_ \uC811\uB450\uC0AC \uC544\uB2D8).");
  const allowedRoots = removeBgAllowedRoots();
  const input = path2.resolve(a.imagePath);
  if (!isInsideAllowedRoot(input, allowedRoots)) return errText(`\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uC785\uB825 \uACBD\uB85C\uC785\uB2C8\uB2E4. REMOVE_BG_ALLOWED_ROOTS: ${allowedRoots.join("; ")}`);
  const out = a.outputPath ? path2.resolve(a.outputPath) : path2.join(ensureOutDir(OUT_DIR), `remove-ai-${Date.now()}.png`);
  if (!isInsideAllowedRoot(out, allowedRoots)) return errText(`\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uCD9C\uB825 \uACBD\uB85C\uC785\uB2C8\uB2E4. REMOVE_BG_ALLOWED_ROOTS: ${allowedRoots.join("; ")}`);
  let bytes;
  try {
    bytes = fs2.readFileSync(input);
  } catch (e) {
    return errText(`\uC774\uBBF8\uC9C0\uB97C \uC5F4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${input} \u2014 \uACBD\uB85C\uB97C \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  if (bytes.length > 22 * 1024 * 1024) return errText("Remove.bg \uC785\uB825 \uC81C\uD55C\uC744 \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4 \u2014 22MB \uC774\uD558 \uC774\uBBF8\uC9C0\uB97C \uC0AC\uC6A9\uD558\uC138\uC694.");
  let response;
  try {
    response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ image_file_b64: bytes.toString("base64"), size: a.size }),
      signal: AbortSignal.timeout(12e4)
    });
  } catch (e) {
    return errText(`Remove.bg \uC694\uCCAD \uC2E4\uD328: ${e.message}`);
  }
  if (!response.ok) {
    let message = `Remove.bg ${response.status}`;
    if (response.status === 402) message = "Remove.bg \uD06C\uB808\uB527\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4.";
    else if (response.status === 403) message = "REMOVE_BG_API_KEY\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";
    else if (response.status === 429) message = "Remove.bg \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.";
    else {
      try {
        message = (await response.json())?.errors?.[0]?.title || message;
      } catch {
      }
    }
    return errText(message);
  }
  try {
    ensureOutDir(path2.dirname(out));
    fs2.writeFileSync(out, Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    return errText(`\uACB0\uACFC \uC800\uC7A5 \uC2E4\uD328: ${out} \u2014 \uCD9C\uB825 \uACBD\uB85C\uB97C \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  const creditsCharged = response.headers.get("X-Credits-Charged");
  const freeCallsRemaining = response.headers.get("X-Free-Calls");
  return data(
    { outputPath: out, size: a.size, creditsCharged, freeCallsRemaining },
    `\uC800\uC7A5 \uC644\uB8CC: ${out}
Remove.bg AI \xB7 size=${a.size}${creditsCharged ? ` \xB7 \uC0AC\uC6A9 \uD06C\uB808\uB527 ${creditsCharged}` : ""}${freeCallsRemaining ? ` \xB7 \uBB34\uB8CC \uD638\uCD9C \uC794\uC5EC ${freeCallsRemaining}` : ""}`
  );
});
server.registerTool("nexus_remove_background", {
  title: "\uBC30\uACBD \uC81C\uAC70 (Mask Forge \uC0C9\uC0C1 \uD0A4)",
  description: "NEXUS Mask Forge \uC571\uC758 '\uC0C9\uC0C1 \uD0A4' \uC640 \uAC19\uC740 \uCF54\uB4DC(extractColorKeyPixels)\uB85C \uB2E8\uC0C9 \uBC30\uACBD\uC744 \uD22C\uBA85\uD654\uD569\uB2C8\uB2E4 \u2014 \uC720\uD074\uB9AC\uB4DC \uC0C9\uAC70\uB9AC tolerance/feather \uB7A8\uD504 + \uBC30\uACBD\uC0C9 \uC5ED\uC0B0(decontam) + \uC120\uD0DD\uC801 \uAD6C\uBA4D \uBCF4\uD638. \uD0C0\uC774\uD2C0\xB7\uCE90\uB9AD\uD130\xB7\uC544\uC774\uD15C \uAC19\uC740 '\uBD88\uD22C\uBA85 \uD53C\uC0AC\uCCB4' \uC6A9. \uAE00\uB85C\uC6B0\xB7\uC5F0\uAE30\xB7\uD30C\uD2F0\uD074 \uAC19\uC740 \uBC1C\uAD11 \uD50C\uB808\uC774\uD2B8\uB294 nexus_extract_effect \uB97C \uC4F0\uC138\uC694.",
  inputSchema: {
    imagePath: z.string().describe("\uC785\uB825 \uC774\uBBF8\uC9C0 \uACBD\uB85C"),
    bg: z.string().default("auto").describe("\uBC30\uACBD\uC0C9 \u2014 auto(\uD14C\uB450\uB9AC \uB9C1 \uC790\uB3D9\uAC10\uC9C0, \uC571\uACFC \uB3D9\uC77C) | black | white | chroma | #rrggbb"),
    tolerance: z.number().min(0).max(255).default(KEY_DEFAULTS.tolerance).describe("\uC774 \uC0C9\uAC70\uB9AC \uC774\uD558 = \uC644\uC804 \uD22C\uBA85 (\uC571 \uAE30\uBCF8 " + KEY_DEFAULTS.tolerance + ")"),
    feather: z.number().min(1).max(255).default(KEY_DEFAULTS.feather).describe("tolerance \uBD80\uD130 \uC774 \uBC94\uC704\uAE4C\uC9C0 \uC54C\uD30C \uB7A8\uD504 (\uC571 \uAE30\uBCF8 " + KEY_DEFAULTS.feather + ")"),
    holeProtect: z.boolean().default(KEY_DEFAULTS.holeProtect).describe("\uD53C\uC0AC\uCCB4 \uB0B4\uBD80\uC758 \uC791\uC740 \uAD6C\uBA4D\uC744 \uB2E4\uC2DC \uCC44\uC6C0(\uD615\uD0DC \uBCF4\uD638)"),
    holeSize: z.number().min(0).max(50).default(KEY_DEFAULTS.holeSize).describe("\uAD6C\uBA4D \uBCF4\uD638 \uC784\uACC4(\uC804\uCCB4 \uB300\uBE44 %)"),
    decontam: z.boolean().default(KEY_DEFAULTS.decontam).describe("\uBC18\uD22C\uBA85 \uAC00\uC7A5\uC790\uB9AC\uC5D0\uC11C \uBC30\uACBD\uC0C9 \uC5ED\uC0B0(\uB514\uD504\uB9B0\uC9C0)"),
    trim: z.boolean().default(false).describe("\uD22C\uBA85 \uC5EC\uBC31 \uC798\uB77C\uB0B4\uAE30"),
    threshold: z.number().min(0).max(255).optional().describe("(\uAD6C\uBC84\uC804 \uD638\uD658) tolerance \uC758 \uBCC4\uCE6D"),
    outputPath: z.string().optional().describe("\uC800\uC7A5 \uACBD\uB85C(.png). \uC0DD\uB7B5 \uC2DC .tmp/mcp-out/ \uC544\uB798 \uC790\uB3D9")
  },
  outputSchema: {
    outputPath: z.string().describe("\uC800\uC7A5\uB41C \uD22C\uBA85 PNG \uC808\uB300\uACBD\uB85C"),
    bgColor: z.object({ r: z.number(), g: z.number(), b: z.number() }).describe("\uC81C\uAC70\uC5D0 \uC0AC\uC6A9\uB41C \uBC30\uACBD\uC0C9"),
    tolerance: z.number(),
    feather: z.number(),
    width: z.number(),
    height: z.number(),
    qa: z.record(z.string(), z.any()).describe("\uC571\uACFC \uB3D9\uC77C\uD55C QA \uCE74\uC6B4\uD2B8 (transparent/partial/opaque/restored/total)")
  },
  annotations: WRITE_LOCAL
}, async (a) => {
  let imageData;
  try {
    ({ imageData } = await loadImageData(a.imagePath));
  } catch (e) {
    return errText(`\uC774\uBBF8\uC9C0\uB97C \uC5F4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.imagePath} \u2014 \uACBD\uB85C/\uD615\uC2DD(png\xB7jpg\xB7webp)\uC744 \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  const { width: W2, height: H, data: d } = imageData;
  let bgRgb;
  if (a.bg === "auto") bgRgb = detectBg(d, W2, H);
  else if (a.bg === "black") bgRgb = [0, 0, 0];
  else if (a.bg === "white") bgRgb = [255, 255, 255];
  else if (a.bg === "chroma") bgRgb = [0, 255, 0];
  else bgRgb = toRgb(a.bg);
  if (!bgRgb) return errText(`\uBC30\uACBD\uC0C9\uC744 \uD574\uC11D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.bg}`);
  const tolerance = a.threshold != null ? a.threshold : a.tolerance;
  const keyed = extractColorKeyPixels({ data: d, width: W2, height: H }, {
    bg: bgRgb,
    tolerance,
    feather: a.feather,
    holeProtect: a.holeProtect,
    holeSize: a.holeSize,
    decontam: a.decontam
  });
  const result = a.trim ? cropPixels(keyed, alphaTrimBox(keyed.data, W2, H)) : keyed;
  const out = a.outputPath ? path2.isAbsolute(a.outputPath) ? a.outputPath : path2.join(ROOT, a.outputPath) : path2.join(ensureOutDir(OUT_DIR), `keyed-${Date.now()}.png`);
  try {
    ensureOutDir(path2.dirname(out));
    await savePixels(result, out);
  } catch (e) {
    return errText(`\uACB0\uACFC \uC800\uC7A5 \uC2E4\uD328: ${out} \u2014 \uCD9C\uB825 \uACBD\uB85C(outputPath)\uB97C \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  const [br, bgC, bb] = bgRgb;
  return data(
    { outputPath: out, bgColor: { r: br, g: bgC, b: bb }, tolerance, feather: a.feather, width: result.width, height: result.height, qa: keyed.qa },
    `\uC800\uC7A5 \uC644\uB8CC: ${out}
\uBC30\uACBD\uC0C9 rgb(${br},${bgC},${bb}) \xB7 tolerance ${tolerance} \xB7 feather ${a.feather} \xB7 ${result.width}\xD7${result.height}
QA: \uD22C\uBA85 ${keyed.qa.transparentPixels} \xB7 \uBC18\uD22C\uBA85 ${keyed.qa.partialPixels} \xB7 \uBD88\uD22C\uBA85 ${keyed.qa.opaquePixels}${keyed.qa.restoredPixels ? ` \xB7 \uAD6C\uBA4D \uBCF5\uC6D0 ${keyed.qa.restoredPixels}` : ""}`
  );
});
server.registerTool("nexus_extract_effect", {
  title: "\uC774\uD399\uD2B8 \uD22C\uBA85\uD654 (Mask Forge \uC774\uD399\uD2B8 \uCEE4\uBE0C)",
  description: "NEXUS Mask Forge \uC571\uC758 '\uC774\uD399\uD2B8 \uCD94\uCD9C' \uACFC \uAC19\uC740 \uCF54\uB4DC(extractEffectPixels)\uB85C \uB2E8\uC0C9 \uB9E4\uD2B8 \uC704 \uBC1C\uAD11 \uD50C\uB808\uC774\uD2B8(\uAE00\uB85C\uC6B0\xB7\uC624\uB77C\xB7\uC5F0\uAE30\xB7\uC548\uAC1C\xB7\uD30C\uD2F0\uD074\xB7\uBE5B\uC904\uAE30)\uB97C straight-alpha PNG \uB85C \uBC14\uAFC9\uB2C8\uB2E4. \uAE30\uBCF8\uAC12\uC774 \uACE7 '\uB9C8\uC2A4\uD06C \uD3EC\uC9C0 \uC774\uD399\uD2B8 \uCEE4\uBE0C'(cutoff 6 \xB7 gamma 0.85 \xB7 opacity 100 \xB7 recoverColor). \uBD88\uD22C\uBA85 \uD53C\uC0AC\uCCB4(\uD0C0\uC774\uD2C0\xB7\uCE90\uB9AD\uD130\xB7\uC544\uC774\uD15C)\uB294 nexus_remove_background \uB97C \uC4F0\uC138\uC694.",
  inputSchema: {
    imagePath: z.string().describe("\uC785\uB825 \uC774\uBBF8\uC9C0 \uACBD\uB85C \u2014 \uC21C\uD751(\uB610\uB294 \uB2E8\uC0C9) \uB9E4\uD2B8 \uC704 \uC774\uD399\uD2B8"),
    bg: z.string().default("black").describe("\uB9E4\uD2B8 \uC0C9 \u2014 black | auto | #rrggbb (\uD06C\uB85C\uB9C8 \uADF8\uB9B0\uC740 \uBC1C\uAD11 \uAC10\uC1E0\uB97C \uB9DD\uAC00\uB728\uB9AC\uBBC0\uB85C \uBE44\uAD8C\uC7A5)"),
    cutoff: z.number().min(0).max(254).default(EFFECT_DEFAULTS.cutoff).describe("\uC774 \uC0C9\uAC70\uB9AC \uC774\uD558 = \uC644\uC804 \uD22C\uBA85 (\uAE30\uBCF8 6)"),
    gamma: z.number().min(0.2).max(4).default(EFFECT_DEFAULTS.gamma).describe("\uC54C\uD30C \uACE1\uC120 (\uAE30\uBCF8 0.85, \uB0AE\uC744\uC218\uB85D \uBD80\uB4DC\uB7EC\uC6B4 \uAC10\uC1E0 \uBCF4\uC874)"),
    opacity: z.number().min(0).max(100).default(EFFECT_DEFAULTS.opacity).describe("\uC804\uCCB4 \uAC15\uB3C4 % (\uAE30\uBCF8 100)"),
    recoverColor: z.boolean().default(EFFECT_DEFAULTS.recoverColor).describe("\uB9E4\uD2B8 \uC0C9 \uC5ED\uC0B0\uC73C\uB85C \uC6D0\uC0C9 \uBCF5\uC6D0 (\uAE30\uBCF8 true)"),
    trim: z.boolean().default(false).describe("\uD22C\uBA85 \uC5EC\uBC31 \uC798\uB77C\uB0B4\uAE30 \u2014 \uC815\uB82C \uD50C\uB808\uC774\uD2B8\uC5D0\uB294 \uB044\uAE30"),
    outputPath: z.string().optional().describe("\uC800\uC7A5 \uACBD\uB85C(.png). \uC0DD\uB7B5 \uC2DC .tmp/mcp-out/ \uC544\uB798 \uC790\uB3D9")
  },
  outputSchema: {
    outputPath: z.string(),
    bgColor: z.object({ r: z.number(), g: z.number(), b: z.number() }),
    width: z.number(),
    height: z.number(),
    qa: z.record(z.string(), z.any()).describe("transparent/partial/opaque/total \uD53D\uC140 \uC218 \xB7 reconstructionMae \xB7 coverage \uBE44\uC728"),
    warnings: z.array(z.string())
  },
  annotations: WRITE_LOCAL
}, async (a) => {
  let imageData;
  try {
    ({ imageData } = await loadImageData(a.imagePath));
  } catch (e) {
    return errText(`\uC774\uBBF8\uC9C0\uB97C \uC5F4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.imagePath} \u2014 \uACBD\uB85C/\uD615\uC2DD(png\xB7jpg\xB7webp)\uC744 \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  const { width: W2, height: H, data: d } = imageData;
  const bgRgb = a.bg === "auto" ? detectBg(d, W2, H) : a.bg === "black" ? [0, 0, 0] : toRgb(a.bg);
  if (!bgRgb) return errText(`\uB9E4\uD2B8 \uC0C9\uC744 \uD574\uC11D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.bg}`);
  const fx = extractEffectPixels({ data: d, width: W2, height: H }, {
    cutoff: a.cutoff,
    gamma: a.gamma,
    opacity: a.opacity,
    recoverColor: a.recoverColor,
    bg: bgRgb
  });
  const result = a.trim ? cropPixels(fx, alphaTrimBox(fx.data, W2, H)) : fx;
  const out = a.outputPath ? path2.isAbsolute(a.outputPath) ? a.outputPath : path2.join(ROOT, a.outputPath) : path2.join(ensureOutDir(OUT_DIR), `effect-${Date.now()}.png`);
  try {
    ensureOutDir(path2.dirname(out));
    await savePixels(result, out);
  } catch (e) {
    return errText(`\uACB0\uACFC \uC800\uC7A5 \uC2E4\uD328: ${out} \u2014 \uCD9C\uB825 \uACBD\uB85C(outputPath)\uB97C \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  const q = fx.qa;
  const visible = q.partialPixels + q.opaquePixels;
  const coverage = q.totalPixels ? visible / q.totalPixels : 0;
  const warnings = [];
  if (q.transparentPixels === 0) warnings.push("\uC644\uC804 \uD22C\uBA85 \uD53D\uC140\uC774 \uC5C6\uC74C \u2014 \uB9E4\uD2B8 \uC0C9(bg)\uC774 \uC2E4\uC81C \uBC30\uACBD\uACFC \uB2E4\uB974\uAC70\uB098 cutoff \uAC00 \uB108\uBB34 \uB0AE\uC2B5\uB2C8\uB2E4.");
  if (visible === 0) warnings.push("\uB0A8\uC740 \uC774\uD399\uD2B8\uAC00 \uC5C6\uC74C \u2014 cutoff \uB97C \uB0AE\uCD94\uAC70\uB098 \uB9E4\uD2B8 \uC0C9\uC744 \uD655\uC778\uD558\uC138\uC694.");
  else if (coverage < 2e-3) warnings.push("\uC774\uD399\uD2B8 \uCEE4\uBC84\uB9AC\uC9C0\uAC00 0.2% \uBBF8\uB9CC \u2014 \uB300\uBD80\uBD84 \uC0AC\uB77C\uC84C\uC2B5\uB2C8\uB2E4. gamma \uB97C \uB0AE\uCD94\uAC70\uB098 cutoff \uB97C \uB0AE\uCDB0 \uC7AC\uC2DC\uB3C4\uD558\uC138\uC694.");
  if (q.reconstructionMae > 0.02) warnings.push(`\uC5ED\uC0B0 \uC624\uCC28(MAE ${q.reconstructionMae.toFixed(4)})\uAC00 \uD07C \u2014 \uB9E4\uD2B8\uAC00 \uADE0\uC77C\uD558\uC9C0 \uC54A\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
  const [br, bgC, bb] = bgRgb;
  return data(
    { outputPath: out, bgColor: { r: br, g: bgC, b: bb }, width: result.width, height: result.height, qa: { ...q, coverage }, warnings },
    `\uC800\uC7A5 \uC644\uB8CC: ${out}
\uB9E4\uD2B8 rgb(${br},${bgC},${bb}) \xB7 cutoff ${a.cutoff} \xB7 gamma ${a.gamma} \xB7 opacity ${a.opacity} \xB7 recoverColor ${a.recoverColor}
QA: \uD22C\uBA85 ${q.transparentPixels} \xB7 \uBC18\uD22C\uBA85 ${q.partialPixels} \xB7 \uBD88\uD22C\uBA85 ${q.opaquePixels} \xB7 \uCEE4\uBC84\uB9AC\uC9C0 ${(coverage * 100).toFixed(2)}%${warnings.length ? `
\uACBD\uACE0: ${warnings.join(" / ")}` : ""}`
  );
});
var CLI_BUNDLE = path2.join(ROOT, "mcp", "nexus-cli.bundle.mjs");
async function runCli(args, cwd) {
  const { execFile } = await import("node:child_process");
  if (!fs2.existsSync(CLI_BUNDLE)) throw new Error("mcp/nexus-cli.bundle.mjs \uAC00 \uC5C6\uC2B5\uB2C8\uB2E4 \u2014 npm run mcp:build \uB97C \uBA3C\uC800 \uC2E4\uD589\uD558\uC138\uC694.");
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [CLI_BUNDLE, ...args], { cwd, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      if (err && !stdout) reject(new Error(`${err.message}
${stderr}`));
      else resolve({ stdout, stderr, code: err ? err.code : 0 });
    });
  });
}
var absOrRoot = (p) => path2.isAbsolute(p) ? p : path2.join(ROOT, p);
server.registerTool("nexus_alpha_plan", {
  title: "\uBC30\uCE58 \uD22C\uBA85\uD654 \uACC4\uD68D (\uC790\uB3D9 \uBD84\uB958)",
  description: "\uD3F4\uB354\uC758 \uC774\uBBF8\uC9C0\uB97C \uD6D1\uC5B4 \uD56D\uBAA9\uBCC4 \uD22C\uBA85\uD654 \uACBD\uB85C\uB97C \uC790\uB3D9 \uBD84\uB958(flat \uC0C9\uC0C1 \uD0A4 / vignette \uD5C8\uC6A9\uCE58 \uC0C1\uD5A5 / glow \uC774\uD399\uD2B8 \uCD94\uCD9C / nonflat AI \uB300\uC0C1)\uD55C \uD3B8\uC9D1 \uAC00\uB2A5\uD55C plan.json \uC744 \uB9CC\uB4ED\uB2C8\uB2E4. \uACB0\uACFC\uB97C \uAC80\uD1A0\xB7\uC218\uC815\uD55C \uB4A4 nexus_alpha_batch \uC5D0 \uB118\uAE30\uC138\uC694. \uD53D\uC140 \uB85C\uC9C1\uC740 \uC571\xB7MCP \uB2E8\uAC74 \uD234\uACFC \uAC19\uC740 src/lib.",
  inputSchema: {
    inputDir: z.string().describe("\uC774\uBBF8\uC9C0 \uD3F4\uB354(png\xB7jpg\xB7webp) \uB610\uB294 \uD30C\uC77C \uACBD\uB85C"),
    planPath: z.string().describe("\uC800\uC7A5\uD560 plan.json \uACBD\uB85C \u2014 \uD56D\uBAA9 src/out \uC740 \uC774 \uD30C\uC77C \uAE30\uC900 \uC0C1\uB300\uACBD\uB85C"),
    outDir: z.string().default("out").describe("plan \uAE30\uC900 \uCD9C\uB825 \uD3F4\uB354(\uC0C1\uB300/\uC808\uB300)"),
    triage: z.boolean().default(true).describe("\uC790\uB3D9 \uBD84\uB958 \uCF1C\uAE30 (false \uBA74 \uD14C\uB450\uB9AC \uC0C9 \uD1B5\uACC4\uB9CC \uAE30\uB85D)")
  },
  outputSchema: {
    planPath: z.string(),
    count: z.number(),
    triageCounts: z.record(z.string(), z.number()).optional(),
    items: z.array(z.object({ src: z.string(), mode: z.string().optional(), class: z.string().optional(), reason: z.string().optional() }))
  },
  annotations: WRITE_LOCAL
}, async (a) => {
  const planAbs = absOrRoot(a.planPath);
  const args = ["plan", "--in", absOrRoot(a.inputDir), "--out", planAbs, "--out-dir", a.outDir];
  if (!a.triage) args.push("--no-triage");
  let r;
  try {
    r = await runCli(args, ROOT);
  } catch (e) {
    return errText(`plan \uC2E4\uD328: ${e.message}`);
  }
  if (!fs2.existsSync(planAbs)) return errText(`plan \uC774 \uC0DD\uC131\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.
${r.stderr}`);
  const plan = JSON.parse(fs2.readFileSync(planAbs, "utf8"));
  const items = plan.items.map((it) => ({ src: it.src, mode: it.mode, class: it.triage?.class, reason: it.triage?.reason }));
  const lines = items.map((it) => `\xB7 ${it.src} \u2192 ${it.mode || plan.defaults.mode}${it.class ? ` [${it.class}] ${it.reason}` : ""}`).join("\n");
  return data(
    { planPath: planAbs, count: items.length, triageCounts: plan.triageCounts, items },
    `plan \uC800\uC7A5: ${planAbs} (${items.length}\uAC1C${plan.triageCounts ? " \xB7 " + Object.entries(plan.triageCounts).map(([k, v]) => `${k} ${v}`).join(", ") : ""})
${lines}

\uAC80\uD1A0 \uD6C4 \uD56D\uBAA9\uBCC4 mode/tolerance/feather/killFaint \uB97C \uACE0\uCE58\uACE0 nexus_alpha_batch(planPath) \uB85C \uC2E4\uD589\uD558\uC138\uC694. mode "ai" \uD56D\uBAA9\uC740 \uAC74\uB108\uB6F0\uBA70 nexus_remove_ai(\uC2B9\uC778 \uD544\uC694) \uB300\uC0C1\uC785\uB2C8\uB2E4.`
  );
});
server.registerTool("nexus_alpha_batch", {
  title: "\uBC30\uCE58 \uD22C\uBA85\uD654 \uC2E4\uD589 (\uB85C\uCEEC CLI)",
  description: "plan.json(\uB610\uB294 \uD3F4\uB354+\uBAA8\uB4DC)\uC744 \uB85C\uCEEC \uBC30\uCE58 CLI \uB85C \uBCD1\uB82C \uCC98\uB9AC\uD574 \uD22C\uBA85 PNG \uB4E4\uACFC report.json, \uC120\uD0DD\uC801 \uCCB4\uCEE4\uBCF4\uB4DC \uCEE8\uD0DD\uD2B8 \uC2DC\uD2B8\uB97C \uB9CC\uB4ED\uB2C8\uB2E4. nexus_remove_background/nexus_extract_effect \uC640 \uAC19\uC740 \uCF54\uB4DC\uC774\uBBC0\uB85C \uB2E8\uAC74 \uACB0\uACFC\uC640 \uAC19\uC2B5\uB2C8\uB2E4. \uC678\uBD80 \uD638\uCD9C \uC5C6\uC74C.",
  inputSchema: {
    planPath: z.string().optional().describe("nexus_alpha_plan \uC774 \uB9CC\uB4E0(\uB610\uB294 \uC218\uC815\uD55C) plan.json"),
    inputDir: z.string().optional().describe("plan \uC5C6\uC774 \uD3F4\uB354 \uC804\uCCB4\uB97C \uD55C \uBAA8\uB4DC\uB85C \uCC98\uB9AC\uD560 \uB54C"),
    outDir: z.string().optional().describe("inputDir \uBAA8\uB4DC\uC758 \uCD9C\uB825 \uD3F4\uB354"),
    mode: z.enum(["key", "effect"]).default("key").describe("inputDir \uBAA8\uB4DC\uC5D0\uC11C \uC4F8 \uBC29\uC2DD"),
    jobs: z.number().int().min(1).max(16).optional().describe("\uC6CC\uCEE4 \uC218 (\uAE30\uBCF8: CPU-1, \uCD5C\uB300 8)"),
    sheetPath: z.string().optional().describe("\uCCB4\uCEE4\uBCF4\uB4DC \uCEE8\uD0DD\uD2B8 \uC2DC\uD2B8 PNG \uC800\uC7A5 \uACBD\uB85C"),
    tolerance: z.number().optional(),
    feather: z.number().optional(),
    killFaint: z.number().optional(),
    cutoff: z.number().optional(),
    gamma: z.number().optional()
  },
  outputSchema: {
    reportPath: z.string(),
    total: z.number(),
    done: z.number(),
    failed: z.number(),
    skipped: z.number(),
    elapsedMs: z.number(),
    sheetPath: z.string().optional(),
    warnings: z.array(z.object({ src: z.string(), warnings: z.array(z.string()) })),
    outputs: z.array(z.string())
  },
  annotations: WRITE_LOCAL
}, async (a) => {
  if (!a.planPath && !a.inputDir) return errText("planPath \uB610\uB294 inputDir \uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  const args = ["alpha"];
  let reportPath;
  if (a.planPath) {
    const p = absOrRoot(a.planPath);
    args.push("--plan", p);
    reportPath = path2.join(path2.dirname(p), "report.json");
  } else {
    const o = absOrRoot(a.outDir || path2.join(path2.dirname(absOrRoot(a.inputDir)), "out"));
    args.push("--in", absOrRoot(a.inputDir), "--out-dir", o, "--mode", a.mode);
    reportPath = path2.join(o, "report.json");
  }
  if (a.jobs) args.push("--jobs", String(a.jobs));
  const sheet = a.sheetPath ? absOrRoot(a.sheetPath) : null;
  if (sheet) args.push("--sheet", sheet);
  for (const k of ["tolerance", "feather", "killFaint", "cutoff", "gamma"]) if (a[k] != null) args.push(`--${k}`, String(a[k]));
  let r;
  try {
    r = await runCli(args, ROOT);
  } catch (e) {
    return errText(`\uBC30\uCE58 \uC2E4\uD328: ${e.message}`);
  }
  if (!fs2.existsSync(reportPath)) return errText(`report \uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.
${r.stdout}
${r.stderr}`);
  const rep = JSON.parse(fs2.readFileSync(reportPath, "utf8"));
  const warnings = rep.items.filter((it) => it.warnings && it.warnings.length).map((it) => ({ src: it.src, warnings: it.warnings }));
  const outputs = rep.items.filter((it) => it.out).map((it) => it.out);
  const fails = rep.items.filter((it) => it.error).map((it) => `FAIL ${it.src}: ${it.error}`);
  return data(
    { reportPath, total: rep.total, done: rep.done, failed: rep.failed, skipped: rep.skipped, elapsedMs: rep.elapsedMs, sheetPath: sheet || void 0, warnings, outputs },
    `\uC644\uB8CC ${rep.done}/${rep.total}${rep.skipped ? ` \xB7 \uAC74\uB108\uB700(ai) ${rep.skipped}` : ""}${rep.failed ? ` \xB7 \uC2E4\uD328 ${rep.failed}` : ""} \xB7 ${(rep.elapsedMs / 1e3).toFixed(1)}s
report: ${reportPath}${sheet ? `
sheet: ${sheet}` : ""}${warnings.length ? `
\uACBD\uACE0 ${warnings.length}\uAC74:
` + warnings.map((w) => `\xB7 ${path2.basename(w.src)} \u2014 ${w.warnings.join(" / ")}`).join("\n") : ""}${fails.length ? "\n" + fails.join("\n") : ""}`
  );
});
server.registerTool("nexus_split_character_effect", {
  title: "\uCE90\uB9AD\uD130/\uC774\uD399\uD2B8 \uBD84\uB9AC",
  description: "\uB2E8\uC0C9 \uBC30\uACBD \uC704 '\uBD88\uD22C\uBA85 \uCE90\uB9AD\uD130 + \uBC1C\uAD11 \uC774\uD399\uD2B8' \uC774\uBBF8\uC9C0\uB97C \uB450 \uB808\uC774\uC5B4\uB85C \uBD84\uB9AC \u2014 \uCE90\uB9AD\uD130(straight-alpha PNG) + \uC774\uD399\uD2B8(\uBE14\uB799 \uC704 \uBC1C\uAD11, \uC2A4\uD06C\uB9B0 \uBE14\uB80C\uB4DC\uC6A9 PNG). NexusPreview \uCE90\uB9AD\uD130 \uB80C\uB354 \uD5A5\uC0C1 \uACB0\uACFC \uD6C4\uCC98\uB9AC\uC640 \uB3D9\uC77C \uC54C\uACE0\uB9AC\uC998.",
  inputSchema: {
    imagePath: z.string().describe("\uC785\uB825 \uC774\uBBF8\uC9C0 \uACBD\uB85C (\uBE14\uB799 \uBC30\uACBD \uAD8C\uC7A5)"),
    bg: z.string().default("black").describe("\uBC30\uACBD\uC0C9 \u2014 auto | black | #rrggbb"),
    solidLevel: z.number().min(1).max(255).default(CHAR_SPLIT_DEFAULTS.solidLevel).describe("\uC774 \uC0C9\uAC70\uB9AC \uC774\uC0C1 = \uD655\uC2E4\uD55C \uD53C\uC0AC\uCCB4 \uC2DC\uB4DC"),
    closeRadius: z.number().min(1).max(64).default(CHAR_SPLIT_DEFAULTS.closeRadius).describe("\uD615\uD0DC\uD559\uC801 \uB2EB\uD798 \uBC18\uACBD(px) \u2014 \uBA38\uB9AC\uCE74\uB77D \uD2C8 \uBA54\uC6C0"),
    edgeSoft: z.number().min(1).max(32).default(CHAR_SPLIT_DEFAULTS.edgeSoft).describe("\uACBD\uACC4 \uD398\uB354(px)"),
    outputDir: z.string().optional().describe("\uCD9C\uB825 \uD3F4\uB354 (\uC0DD\uB7B5 \uC2DC .tmp/mcp-out/)")
  },
  outputSchema: {
    characterPath: z.string().describe("\uCE90\uB9AD\uD130 \uB808\uC774\uC5B4 (straight-alpha PNG) \uC808\uB300\uACBD\uB85C"),
    effectPath: z.string().describe("\uC774\uD399\uD2B8 \uB808\uC774\uC5B4 (\uC2A4\uD06C\uB9B0 \uBE14\uB80C\uB4DC\uC6A9 PNG) \uC808\uB300\uACBD\uB85C"),
    width: z.number(),
    height: z.number()
  },
  annotations: WRITE_LOCAL
}, async (a) => {
  let imageData;
  try {
    ({ imageData } = await loadImageData(a.imagePath));
  } catch (e) {
    return errText(`\uC774\uBBF8\uC9C0\uB97C \uC5F4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.imagePath} \u2014 \uACBD\uB85C/\uD615\uC2DD(png\xB7jpg\xB7webp)\uC744 \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  const { width: W2, height: H, data: s } = imageData;
  const bgRgb = a.bg === "auto" ? detectBgColor(s, W2, H) : a.bg === "black" ? [0, 0, 0] : hexToRgb(a.bg);
  if (!bgRgb) return errText(`\uBC30\uACBD\uC0C9\uC744 \uD574\uC11D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.bg}`);
  const [br, bgC, bb] = bgRgb;
  const { d, dComp, r3 } = computeCharMask(imageData, { bg: bgRgb, solidLevel: a.solidLevel, closeRadius: a.closeRadius });
  const edge3 = Math.max(1, a.edgeSoft) * 3;
  const { createCanvas } = await canvasMod();
  const charCv = createCanvas(W2, H), fxCv = createCanvas(W2, H);
  const charCtx = charCv.getContext("2d"), fxCtx = fxCv.getContext("2d");
  const co = charCtx.createImageData(W2, H), c = co.data;
  const fo = fxCtx.createImageData(W2, H), f = fo.data;
  for (let p = 0; p < W2 * H; p++) {
    const i = p * 4;
    const depth = dComp[p] - r3;
    const ramp = depth <= 0 ? 0 : Math.min(1, depth / edge3);
    if (ramp > 0) {
      const alpha = ramp * (s[i + 3] / 255);
      let r = s[i], g = s[i + 1], b = s[i + 2];
      if (ramp < 1) {
        const at = Math.max(d[p] / 255, ramp, 4e-3), inv = 1 - at;
        r = clamp2553((r - inv * br) / at);
        g = clamp2553((g - inv * bgC) / at);
        b = clamp2553((b - inv * bb) / at);
      }
      c[i] = r;
      c[i + 1] = g;
      c[i + 2] = b;
      c[i + 3] = clamp2553(alpha * 255);
    }
    const keep = 1 - ramp;
    f[i] = clamp2553(s[i] * keep);
    f[i + 1] = clamp2553(s[i + 1] * keep);
    f[i + 2] = clamp2553(s[i + 2] * keep);
    f[i + 3] = 255;
  }
  charCtx.putImageData(co, 0, 0);
  fxCtx.putImageData(fo, 0, 0);
  const dir = a.outputDir ? path2.isAbsolute(a.outputDir) ? a.outputDir : path2.join(ROOT, a.outputDir) : OUT_DIR;
  ensureOutDir(dir);
  const stamp = Date.now();
  const charPath = path2.join(dir, `char-${stamp}.png`);
  const fxPath = path2.join(dir, `fx-screen-${stamp}.png`);
  try {
    fs2.writeFileSync(charPath, charCv.toBuffer("image/png"));
    fs2.writeFileSync(fxPath, fxCv.toBuffer("image/png"));
  } catch (e) {
    return errText(`\uACB0\uACFC \uC800\uC7A5 \uC2E4\uD328: ${dir} \u2014 \uCD9C\uB825 \uD3F4\uB354(outputDir)\uB97C \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  return data(
    { characterPath: charPath, effectPath: fxPath, width: W2, height: H },
    `\uBD84\uB9AC \uC644\uB8CC (${W2}\xD7${H})
\uCE90\uB9AD\uD130 (straight-alpha): ${charPath}
\uC774\uD399\uD2B8 (\uC2A4\uD06C\uB9B0 \uBE14\uB80C\uB4DC\uC6A9, \uBE14\uB799 \uC704 \uBC1C\uAD11): ${fxPath}
\uD569\uC131: \uCE90\uB9AD\uD130\uB97C normal, \uC774\uD399\uD2B8\uB97C screen(\uB610\uB294 add) \uBE14\uB80C\uB4DC\uB85C \uAC19\uC740 \uC704\uCE58\uC5D0 \uACB9\uCE58\uC138\uC694.`
  );
});
server.registerTool("nexus_design_rubric", {
  title: "\uB514\uC790\uC778 \uD3C9\uAC00 \uB8E8\uBE0C\uB9AD",
  description: "Nexus Admin\uC758 \uD604\uC7AC \uD65C\uC131 \uB514\uC790\uC778 \uD3C9\uAC00 \uAE30\uC900\xB7\uAC00\uC911\uCE58\xB7\uADDC\uCE59\xB7\uBC84\uC804\uC744 \uC2E4\uC2DC\uAC04 \uC870\uD68C\uD574 \uBC18\uD658\uD569\uB2C8\uB2E4.",
  inputSchema: { type: z.string().min(1).default("banner").describe("\uD3C9\uAC00 \uAE30\uC900 \uC720\uD615. \uAE30\uBCF8\uAC12 banner") },
  outputSchema: {
    criteriaType: z.string(),
    criteriaVersionId: z.string(),
    criteriaVersionName: z.string(),
    criteria: z.array(z.record(z.string(), z.any())),
    rules: z.string(),
    source: z.string(),
    stale: z.boolean(),
    syncWarning: z.string(),
    markdown: z.string().describe("\uD604\uC7AC \uD65C\uC131 \uAE30\uC900\uACFC \uACF5\uD1B5 \uD3C9\uAC00 \uACC4\uC57D (\uB9C8\uD06C\uB2E4\uC6B4)")
  },
  annotations: PURE
}, async ({ type }) => {
  let contract;
  try {
    contract = fs2.readFileSync(RUBRIC_PATH, "utf8");
  } catch {
    return errText(`\uB8E8\uBE0C\uB9AD \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${RUBRIC_PATH}`);
  }
  try {
    const snapshot = await loadActiveNexusCriteria({ type, projectRoot: ROOT });
    const markdown = `${formatNexusCriteriaMarkdown(snapshot)}

${contract}`;
    return data({
      criteriaType: snapshot.criteriaType,
      criteriaVersionId: snapshot.criteriaVersionId,
      criteriaVersionName: snapshot.criteriaVersionName,
      criteria: snapshot.criteria,
      rules: snapshot.rules,
      source: snapshot.source,
      stale: !!snapshot.stale,
      syncWarning: snapshot.syncWarning || "",
      markdown
    }, markdown);
  } catch (error) {
    return errText(`Nexus \uD3C9\uAC00 \uAE30\uC900 \uC870\uD68C \uC2E4\uD328: ${error.message}`);
  }
});
var EVAL_TYPE_LABELS = {
  banner: "\uBC30\uB108",
  promotion: "\uD504\uB85C\uBAA8\uC158 \uD398\uC774\uC9C0",
  promotionMobile: "\uD504\uB85C\uBAA8\uC158 \uBAA8\uBC14\uC77C",
  promotionKv: "\uD504\uB85C\uBAA8\uC158 \uD0A4\uBE44\uC8FC\uC5BC",
  brandweb: "\uBE0C\uB79C\uB4DC\uC6F9_\uBA54\uC778",
  brandwebSub: "\uBE0C\uB79C\uB4DC\uC6F9_\uC11C\uBE0C",
  brandwebMobile: "\uBE0C\uB79C\uB4DC\uC6F9_\uBAA8\uBC14\uC77C",
  typo2d: "2D \uD0C0\uC774\uD3EC",
  typoRender: "\uB80C\uB354\uB9C1 \uD0C0\uC774\uD3EC",
  typoMotion: "\uBAA8\uC158 \uD0C0\uC774\uD3EC"
};
var EVAL_TYPE_KEYS = Object.values(CRITERIA_TYPES).filter((t) => t !== "prompt");
server.registerTool("nexus_design_evaluation_prompt", {
  title: "\uB514\uC790\uC778 \uD3C9\uAC00 \uD504\uB86C\uD504\uD2B8 (\uC571 \uB3D9\uC77C)",
  description: "DesignEvaluator \uC571\uC774 Gemini \uC5D0 \uBCF4\uB0B4\uB294 \uAC83\uACFC \uB3D9\uC77C\uD55C \uD3C9\uAC00 \uD504\uB86C\uD504\uD2B8\uC640 \uC751\uB2F5 \uC2A4\uD0A4\uB9C8\uB97C \uB9CC\uB4ED\uB2C8\uB2E4. \uD65C\uC131 \uAE30\uC900(NexusAdmin)\uC744 \uC2E4\uC2DC\uAC04 \uC870\uD68C\uD574 [\uC784\uBB34 2] \uD3C9\uAC00 \uD56D\uBAA9\xB7\uCC44\uC810 \uADDC\uCE59\uC744 \uC8FC\uC785\uD569\uB2C8\uB2E4. \uC678\uBD80 \uBAA8\uB378(Claude \uB4F1)\uB85C \uD3C9\uAC00\uD560 \uB54C \uC774 \uD504\uB86C\uD504\uD2B8\uB97C \uADF8\uB300\uB85C \uC4F0\uACE0, \uACB0\uACFC scores_data \uB97C nexus_design_evaluation_score \uC5D0 \uB118\uAE30\uC138\uC694.",
  inputSchema: {
    type: z.enum(EVAL_TYPE_KEYS).default("banner").describe("\uD3C9\uAC00 \uAE30\uC900 \uC720\uD615 \u2014 banner / promotion / promotionMobile / promotionKv / brandweb / brandwebSub / brandwebMobile / typo2d / typoRender / typoMotion"),
    autoClassify: z.boolean().default(false).describe("true \uBA74 \uC571\uC758 auto \uBAA8\uB4DC\uCC98\uB7FC \uCE74\uD14C\uACE0\uB9AC \uBD84\uB958 \uC9C0\uC2DC\uB97C \uD3EC\uD568(\uC751\uB2F5 category \uD544\uC218). false \uBA74 type \uC5D0 \uB9DE\uB294 \uCE74\uD14C\uACE0\uB9AC\uB85C \uACE0\uC815"),
    anchorsText: z.string().max(8e3).optional().describe("\uAE30\uC900\uC810 \uC575\uCEE4(few-shot) \uD14D\uC2A4\uD2B8\uAC00 \uC788\uC73C\uBA74 \uADF8\uB300\uB85C \uC0BD\uC785")
  },
  outputSchema: {
    prompt: z.string(),
    category: z.string(),
    criteriaType: z.string(),
    criteriaVersionId: z.string(),
    criteriaVersionName: z.string(),
    scoreKeys: z.array(z.string()),
    responseSchema: z.record(z.string(), z.any()).describe("Gemini responseSchema. \uB2E4\uB978 \uBAA8\uB378\uC740 \uAC19\uC740 \uD615\uD0DC\uC758 JSON \uC744 \uC694\uAD6C\uD558\uBA74 \uB428"),
    gate: z.record(z.string(), z.any()),
    source: z.string(),
    stale: z.boolean(),
    syncWarning: z.string()
  },
  annotations: PURE
}, async (a) => {
  try {
    const snapshot = await loadActiveNexusCriteria({ type: a.type, projectRoot: ROOT });
    const criteriaSource = criteriaSourceFromSnapshot(snapshot);
    const category = a.autoClassify ? "auto" : EVAL_TYPE_LABELS[snapshot.criteriaType] || snapshot.criteriaType;
    const prompt = buildDesignEvaluationPrompt({ category, criteriaSource, anchorsText: a.anchorsText || "" });
    const scoreKeys = snapshot.criteria.map((c) => c.id).filter(Boolean);
    const responseSchema = buildEvaluationResponseSchema(scoreKeys, { includeCategory: true, includePurpose: true });
    const text2 = `${prompt}

[scoreKeys] ${scoreKeys.join(",")}
[criteriaVersion] ${snapshot.criteriaType}/${snapshot.criteriaVersionId} (${snapshot.source})${snapshot.syncWarning ? `
[syncWarning] ${snapshot.syncWarning}` : ""}`;
    return data({
      prompt,
      category,
      criteriaType: snapshot.criteriaType,
      criteriaVersionId: snapshot.criteriaVersionId,
      criteriaVersionName: snapshot.criteriaVersionName,
      scoreKeys,
      responseSchema,
      gate: snapshot.gate,
      source: snapshot.source,
      stale: !!snapshot.stale,
      syncWarning: snapshot.syncWarning || ""
    }, text2);
  } catch (error) {
    return errText(`\uD3C9\uAC00 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131 \uC2E4\uD328: ${error.message}`);
  }
});
server.registerTool("nexus_design_evaluation_score", {
  title: "\uB514\uC790\uC778 \uD3C9\uAC00 \uCC44\uC810 (\uC571 \uB3D9\uC77C)",
  description: "\uBAA8\uB378\uC774 \uB0B8 scores_data(\uD56D\uBAA9\uBCC4 score/reason)\uB97C \uC571\uACFC \uB3D9\uC77C\uD55C \uAC00\uC911 \uD3C9\uADE0\xB7\uD488\uC9C8 \uAC8C\uC774\uD2B8(\uCD1D\uC810 85\xB7\uD56D\uBAA9 75\xB7hardFailures 0)\uB85C \uCC44\uC810\uD569\uB2C8\uB2E4. \uD65C\uC131 \uAE30\uC900\uC744 \uC870\uD68C\uD574 \uD56D\uBAA9 \uB204\uB77D\uACFC \uBC84\uC804 \uBD88\uC77C\uCE58\uB97C \uAC80\uC0AC\uD569\uB2C8\uB2E4.",
  inputSchema: {
    type: z.enum(EVAL_TYPE_KEYS).default("banner").describe("\uD3C9\uAC00 \uAE30\uC900 \uC720\uD615"),
    scores: z.record(z.string(), z.any()).describe("{ [criterionId]: { score:0-100, reason } } \uB610\uB294 { [id]: number }"),
    hardFailures: z.array(z.string()).default([]),
    recommendedCorrections: z.array(z.string()).default([]),
    criteriaVersionId: z.string().optional().describe("\uD504\uB86C\uD504\uD2B8 \uB3C4\uAD6C\uAC00 \uC900 \uBC84\uC804 id. \uB2E4\uB974\uBA74 \uCC44\uC810\uC744 \uAC70\uBD80"),
    offset: z.number().min(-20).max(20).default(0).describe("\uCE98\uB9AC\uBE0C\uB808\uC774\uC158 \uC624\uD504\uC14B(\uC571\uC758 fetchCalibration \uAC12). \uAE30\uBCF8 0")
  },
  outputSchema: {
    overall: z.number(),
    rawOverall: z.number(),
    pass: z.boolean(),
    metrics: z.array(z.record(z.string(), z.any())),
    lowMetrics: z.array(z.record(z.string(), z.any())),
    priorities: z.array(z.record(z.string(), z.any())),
    missing: z.array(z.string()),
    hardFailures: z.array(z.string()),
    recommendedCorrections: z.array(z.string()),
    gate: z.record(z.string(), z.any()),
    criteriaType: z.string(),
    criteriaVersionId: z.string(),
    source: z.string(),
    stale: z.boolean()
  },
  annotations: PURE
}, async (a) => {
  try {
    const snapshot = await loadActiveNexusCriteria({ type: a.type, projectRoot: ROOT });
    if (a.criteriaVersionId && a.criteriaVersionId !== snapshot.criteriaVersionId) {
      return errText(`\uAE30\uC900 \uBC84\uC804 \uBD88\uC77C\uCE58: \uC694\uCCAD=${a.criteriaVersionId}, \uD65C\uC131=${snapshot.criteriaVersionId}. nexus_design_evaluation_prompt \uB97C \uB2E4\uC2DC \uD638\uCD9C\uD574 \uCD5C\uC2E0 \uAE30\uC900\uC73C\uB85C \uD3C9\uAC00\uD558\uC138\uC694.`);
    }
    const validation = validateCriteria(snapshot.criteria || []);
    if (!validation.valid) return errText("\uD65C\uC131 \uAE30\uC900\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    const criteria = criteriaSnapshot(validation.normalized);
    const report = calculateEvaluationReport({
      criteria,
      scores: a.scores,
      hardFailures: a.hardFailures,
      recommendedCorrections: a.recommendedCorrections,
      offset: a.offset || 0,
      gate: snapshot.gate
    });
    const lines = report.metrics.map((m) => `- ${m.key} (${m.weight}) : ${m.score ?? "\uB204\uB77D"}${m.reason ? ` \u2014 ${m.reason}` : ""}`).join("\n");
    const text2 = `\uCD1D\uC810 ${report.overall} (${report.pass ? "PASS" : "FAIL"}) \xB7 \uAE30\uC900 ${snapshot.criteriaType}/${snapshot.criteriaVersionId}${report.missing.length ? `
\uB204\uB77D \uD56D\uBAA9: ${report.missing.join(", ")}` : ""}${report.hardFailures.length ? `
hardFailures: ${report.hardFailures.join(" / ")}` : ""}
${lines}
\uC6B0\uC120 \uC218\uC815: ${report.priorities.map((m) => m.key).join(", ") || "-"}`;
    return data({
      ...report,
      criteriaType: snapshot.criteriaType,
      criteriaVersionId: snapshot.criteriaVersionId,
      source: snapshot.source,
      stale: !!snapshot.stale
    }, text2);
  } catch (error) {
    return errText(`\uCC44\uC810 \uC2E4\uD328: ${error.message}`);
  }
});
server.registerTool("nexus_banner_codex_list", {
  title: "Banner Codex \uBC30\uB108 \uBAA9\uB85D",
  description: "NEXUS Studio Banner Codex\uC5D0 \uC800\uC7A5\uB41C \uBC30\uB108\uB97C \uC77D\uAE30 \uC804\uC6A9\uC73C\uB85C \uC870\uD68C\uD569\uB2C8\uB2E4. \uC81C\uBAA9\xB7\uD0DC\uADF8\xB7\uAC8C\uC784\xB7\uC5F0\uB3C4\xB7\uC810\uC218 \uD544\uD130\uC640 \uD398\uC774\uC9C0 \uD1A0\uD070\uC744 \uC9C0\uC6D0\uD558\uBA70, \uC0C1\uC704 5\uAC1C \uC378\uB124\uC77C\uC744 MCP \uC774\uBBF8\uC9C0\uB85C \uC9C1\uC811 \uD45C\uC2DC\uD569\uB2C8\uB2E4.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30).describe("\uD55C \uBC88\uC5D0 \uAC00\uC838\uC62C Firestore \uBB38\uC11C \uC218 (\uCD5C\uB300 100)"),
    pageToken: z.string().optional().describe("\uC774\uC804 \uC751\uB2F5\uC758 nextPageToken \u2014 \uB2E4\uC74C \uD398\uC774\uC9C0 \uC870\uD68C \uC2DC \uC804\uB2EC"),
    query: z.string().optional().describe("\uC81C\uBAA9\xB7\uC6D0\uBCF8 \uC81C\uBAA9\xB7\uD0DC\uADF8\xB7\uCE90\uB9AD\uD130\xB7\uACBD\uB85C\uC5D0\uC11C \uCC3E\uC744 \uAC80\uC0C9\uC5B4"),
    game: z.string().optional().describe("\uAC8C\uC784\uBA85 \uC815\uD655 \uC77C\uCE58 \uD544\uD130"),
    year: z.union([z.string(), z.number()]).optional().describe("\uC5F0\uB3C4 \uD544\uD130"),
    minScore: z.number().min(0).max(100).optional().describe("\uCD5C\uC18C \uD3C9\uAC00 \uC810\uC218"),
    sort: z.enum(["newest", "oldest", "score"]).default("newest").describe("\uC815\uB82C \u2014 score\uB294 \uC804\uCCB4 \uCEEC\uB809\uC158 \uD3C9\uAC00\uC21C")
  },
  outputSchema: {
    banners: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable()
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const collectionPath = `artifacts/${encodeURIComponent(projectId)}/public/data/banners`;
    const payload = a.sort === "score" ? { documents: await firestoreCollectionAll(collectionPath), nextPageToken: null } : await firestoreRequest(collectionPath, {
      pageSize: a.pageSize,
      pageToken: a.pageToken,
      showMissing: false
    });
    const decoded = (payload.documents || []).map(decodeFirestoreDocument2);
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const filtered = decoded.filter((banner) => {
      if (a.game && String(banner.game || "") !== a.game) return false;
      if (a.year != null && String(banner.year || "") !== String(a.year)) return false;
      if (a.minScore != null && Number(banner.score || 0) < a.minScore) return false;
      if (needle) {
        const haystack = [banner.title, banner.originalTitle, banner.character, banner.path, banner.provenance, banner.reviewStatus, ...Array.isArray(banner.tags) ? banner.tags : [], ...Array.isArray(banner.codexBadges) ? banner.codexBadges : []].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    filtered.sort((x, y) => a.sort === "score" ? Number(y.score || 0) - Number(x.score || 0) : a.sort === "oldest" ? bannerTimestamp(x.createdAt) - bannerTimestamp(y.createdAt) : bannerTimestamp(y.createdAt) - bannerTimestamp(x.createdAt));
    const offset = a.sort === "score" ? scorePageOffset(a.pageToken) : 0;
    const pageItems = a.sort === "score" ? filtered.slice(offset, offset + a.pageSize) : filtered;
    const banners = pageItems.map(bannerSummary);
    const nextPageToken = a.sort === "score" ? offset + banners.length < filtered.length ? `score:${offset + banners.length}` : null : payload.nextPageToken || null;
    const result = { banners, returned: banners.length, scanned: decoded.length, nextPageToken };
    return dataWithRemoteImages(
      result,
      JSON.stringify(result, null, 2),
      banners.map((banner) => banner.thumbnailUrl || banner.imageUrl)
    );
  } catch (e) {
    return errText(`Banner Codex \uBAA9\uB85D \uC870\uD68C \uC2E4\uD328: ${e.message}`);
  }
});
server.registerTool("nexus_banner_codex_get", {
  title: "Banner Codex \uBC30\uB108 \uC0C1\uC138",
  description: "NEXUS Studio Banner Codex\uC758 \uBC30\uB108 ID\uB85C \uC0C1\uC138 \uBA54\uD0C0\uB370\uC774\uD130\uC640 \uC774\uBBF8\uC9C0 URL\uC744 \uC77D\uAE30 \uC804\uC6A9 \uC870\uD68C\uD569\uB2C8\uB2E4.",
  inputSchema: {
    id: z.string().min(1).describe("nexus_banner_codex_list\uAC00 \uBC18\uD658\uD55C \uBC30\uB108 \uBB38\uC11C ID")
  },
  outputSchema: {
    banner: z.record(z.string(), z.any())
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/banners/${encodeURIComponent(a.id)}`);
    const banner = decodeFirestoreDocument2(payload);
    return data({ banner }, JSON.stringify(banner, null, 2));
  } catch (e) {
    return errText(`Banner Codex \uC0C1\uC138 \uC870\uD68C \uC2E4\uD328 (${a.id}): ${e.message}`);
  }
});
server.registerTool("nexus_banner_codex_upsert_automation_draft", {
  title: "Banner Codex \uC790\uB3D9 \uC81C\uC791 \uBC30\uB108 \uB4F1\uB85D",
  description: "\uC608\uCE21 \uC81C\uC791\xB7\uC2A4\uD0C0\uC77C \uC5F0\uAD6C \uACB0\uACFC\uB97C Banner Codex\uC758 \uC6D4\uC694\uC77C \uAC80\uD1A0 \uB300\uAE30 \uCD08\uC548\uC73C\uB85C \uBA71\uB4F1 \uB4F1\uB85D\uD569\uB2C8\uB2E4. \uC790\uB3D9\uD654 \uC18C\uC720 \uBB38\uC11C\uB9CC \uAC19\uC740 automationKey\uB85C \uAC31\uC2E0\uD558\uBA70 \uC0AD\uC81C\uB098 \uC2B9\uC778 \uCC98\uB9AC\uB294 \uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  inputSchema: {
    automationKey: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/).describe("\uC8FC\uCC28\xB7\uAC8C\uC784\xB7\uD6C4\uBCF4\uAC00 \uD3EC\uD568\uB41C \uC548\uC815\uC801\uC778 \uC911\uBCF5 \uBC29\uC9C0 \uD0A4"),
    provenance: z.enum(["proactive-forecast", "style-research", "hybrid"]),
    title: z.string().min(1).max(160),
    game: z.string().min(1).max(80),
    year: z.union([z.string(), z.number()]).optional(),
    date: z.string().optional(),
    character: z.string().optional(),
    score: z.number().min(0).max(10).optional(),
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    imageUrl: z.string().url().optional(),
    imagePath: z.string().optional().describe("NEXUS_BANNER_CODEX_UPLOAD_ROOTS \uC544\uB798\uC758 \uB85C\uCEEC \uC774\uBBF8\uC9C0. imageUrl\uC774 \uC5C6\uC744 \uB54C Cloudinary\uB85C \uC5C5\uB85C\uB4DC"),
    path: z.string().optional(),
    notes: z.string().max(2e3).optional(),
    sourceUrls: z.array(z.string().url()).max(12).default([]),
    styleRecipeId: z.string().max(120).optional()
  },
  outputSchema: { banner: z.record(z.string(), z.any()), created: z.boolean() },
  annotations: WRITE_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const docPath = `artifacts/${encodeURIComponent(projectId)}/public/data/banners/${encodeURIComponent(a.automationKey)}`;
    let existing = null;
    try {
      existing = decodeFirestoreDocument2(await firestoreRequest(docPath));
    } catch (error) {
      if (!String(error?.message || error).includes("Firestore 404")) throw error;
    }
    if (existing && !existing.automationManaged) throw new Error("\uAC19\uC740 ID\uC758 \uC218\uB3D9 \uB4F1\uB85D \uBC30\uB108\uB294 \uC790\uB3D9\uD654\uAC00 \uB36E\uC5B4\uC4F8 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    const imageUrl = a.imageUrl || await uploadBannerCodexImage(a.imagePath);
    if (!imageUrl) throw new Error("imageUrl \uB610\uB294 \uD5C8\uC6A9\uB41C imagePath\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
    const provenanceBadges = {
      "proactive-forecast": ["\uC608\uCE21 \uC81C\uC791"],
      "style-research": ["\uC2A4\uD0C0\uC77C \uC5F0\uAD6C"],
      hybrid: ["\uC608\uCE21 \uC81C\uC791", "\uC2A4\uD0C0\uC77C \uC5F0\uAD6C"]
    }[a.provenance];
    const codexBadges = [...provenanceBadges, "\uC6D4\uC694\uC77C \uAC80\uD1A0"];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const banner = {
      title: a.title,
      originalTitle: a.title,
      game: a.game,
      year: a.year ?? (/* @__PURE__ */ new Date()).getFullYear(),
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
      updatedAt: now
    };
    const saved = decodeFirestoreDocument2(await firestoreWriteDocument(docPath, banner));
    return data({ banner: saved, created: !existing }, JSON.stringify({ banner: saved, created: !existing }, null, 2));
  } catch (e) {
    return errText(`Banner Codex \uC790\uB3D9 \uC81C\uC791 \uBC30\uB108 \uB4F1\uB85D \uC2E4\uD328: ${e.message}`);
  }
});
server.registerTool("nexus_asset_library_list", {
  title: "Nexus \uC7AC\uC0AC\uC6A9 \uC5D0\uC14B \uAC80\uC0C9",
  description: "2025\uB144 \uC774\uD6C4 \uD504\uB85C\uBAA8\uC158\xB7\uBE0C\uB79C\uB4DC\uC6F9\uC5D0\uC11C \uBD84\uB9AC\uD55C \uBC84\uD2BC\xB7\uD654\uC0B4\uD45C\xB7\uC2A4\uD06C\uB864\uB2E4\uC6B4\xB7\uD504\uB808\uC784\xB7\uAD6C\uBD84\uC120\uACFC FX \uD3EC\uD568 \uD22C\uBA85 PNG\uB97C \uC0AC\uB78C\uACFC AI\uAC00 \uC77D\uC744 \uC218 \uC788\uB294 \uBA54\uD0C0\uB370\uC774\uD130\uB85C \uAC80\uC0C9\uD569\uB2C8\uB2E4.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30),
    pageToken: z.string().optional(),
    query: z.string().optional().describe("\uC6A9\uB3C4\xB7\uD615\uD0DC\xB7\uAC8C\uC784\xB7\uCEA0\uD398\uC778\xB7\uD6A8\uACFC\uB97C \uC790\uC5F0\uC5B4\uB85C \uAC80\uC0C9"),
    category: z.enum(["button", "icon", "frame", "ornament", "bullet", "box", "lightfx", "etc"]).optional(),
    subtype: z.enum(["cta", "tab", "arrow", "scroll-down", "navigation", "badge", "frame", "divider", "bullet"]).optional(),
    game: z.string().optional(),
    year: z.number().int().min(2025).optional(),
    section: z.enum(["promotion", "brandweb"]).optional(),
    effects: z.enum(["any", "with_fx", "without_fx"]).default("any")
  },
  outputSchema: {
    assets: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable()
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const matches = [];
    let scanned = 0;
    let token = a.pageToken;
    let rounds = 0;
    do {
      const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/assets`, { pageSize: 100, pageToken: token, showMissing: false });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument2);
      scanned += decoded.length;
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
          const haystack = [entry.title, entry.aiSearchText, entry.subtype, entry.game, entry.campaign, entry.sectionKo, entry.source?.fileName, ...promptArcArray(entry.tags), ...promptArcArray(entry.source?.layerPath)].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
          if (!haystack.includes(needle)) continue;
        }
        matches.push(entry);
      }
      token = payload.nextPageToken || null;
      rounds++;
    } while (token && rounds < 30 && matches.length < a.pageSize);
    const assets = matches.slice(0, a.pageSize).map(assetLibrarySummary);
    const result = { assets, returned: assets.length, scanned, nextPageToken: token };
    return data(result, JSON.stringify(result, null, 2));
  } catch (e) {
    return errText(`\uC5D0\uC14B \uB77C\uC774\uBE0C\uB7EC\uB9AC \uAC80\uC0C9 \uC2E4\uD328: ${e.message}`);
  }
});
server.registerTool("nexus_asset_library_get", {
  title: "Nexus \uC7AC\uC0AC\uC6A9 \uC5D0\uC14B \uC0C1\uC138",
  description: "\uC5D0\uC14B\uC758 \uD22C\uBA85 PNG, \uC6D0\uBCF8 PSD \uACBD\uB85C, \uB808\uC774\uC5B4 \uACBD\uB85C\xB7\uC88C\uD45C, \uD3EC\uD568 \uD6A8\uACFC\uC640 \uCD9C\uCC98 \uCEA0\uD398\uC778\uC744 \uC870\uD68C\uD569\uB2C8\uB2E4.",
  inputSchema: { id: z.string().min(1) },
  outputSchema: { asset: z.record(z.string(), z.any()) },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const raw = decodeFirestoreDocument2(await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/assets/${encodeURIComponent(a.id)}`));
    if (raw.trashed || raw.visibility === "private" || raw.isTemp === true) throw new Error("\uACF5\uAC1C \uAC80\uC0C9 \uAC00\uB2A5\uD55C \uC5D0\uC14B\uC774 \uC544\uB2D9\uB2C8\uB2E4.");
    const asset = { ...assetLibrarySummary(raw), effectLayers: promptArcArray(raw.effectLayers), psdEffects: promptArcArray(raw.psdEffects), bundleRole: raw.bundleRole || null, source: raw.source || null, aiSearchText: raw.aiSearchText || null };
    return data({ asset }, JSON.stringify(asset, null, 2));
  } catch (e) {
    return errText(`\uC5D0\uC14B \uC0C1\uC138 \uC870\uD68C \uC2E4\uD328 (${a.id}): ${e.message}`);
  }
});
server.registerTool("nexus_prompt_arc_list", {
  title: "Prompt Arc \uACF5\uAC1C \uB77C\uC774\uBE0C\uB7EC\uB9AC \uBAA9\uB85D",
  description: "NEXUS Studio Prompt Arc\uC758 \uACF5\uAC1C \uD504\uB86C\uD504\uD2B8\uC640 \uD0C0\uC774\uD3EC\xB7\uC624\uBE0C\uC81D\uD2B8\xB7\uAD11\uC6D0\xB7\uBAA8\uC158 \uC0D8\uD50C\uC744 \uC77D\uAE30 \uC804\uC6A9\uC73C\uB85C \uAC80\uC0C9\uD569\uB2C8\uB2E4. \uBE44\uACF5\uAC1C\xB7\uD734\uC9C0\uD1B5 \uD56D\uBAA9\uC740 \uBC18\uD658\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30).describe("\uBC18\uD658\uD560 \uD56D\uBAA9 \uC218 (\uCD5C\uB300 100)"),
    pageToken: z.string().optional().describe("\uC774\uC804 \uC751\uB2F5\uC758 nextPageToken \u2014 \uB2E4\uC74C \uD398\uC774\uC9C0 \uC870\uD68C \uC2DC \uC804\uB2EC"),
    query: z.string().optional().describe("\uC81C\uBAA9\xB7\uC124\uBA85\xB7\uD0DC\uADF8\xB7AI \uD0A4\uC6CC\uB4DC\xB7\uD504\uB86C\uD504\uD2B8\uC5D0\uC11C \uCC3E\uC744 \uAC80\uC0C9\uC5B4"),
    category: z.enum(["\uD0C0\uC774\uD3EC", "\uBC84\uD2BC", "visualFX", "Motion", "\uAE30\uD0C0"]).optional().describe("Prompt Arc \uCE74\uD14C\uACE0\uB9AC"),
    nature: z.enum(["typography", "object", "lightfx", "motion", "kv", "other"]).optional().describe("\uC774\uBBF8\uC9C0 \uC131\uACA9 \uD544\uD130"),
    style: z.enum(["2d_bw", "3d_render", "calligraphy"]).optional().describe("\uD0C0\uC774\uD3EC \uC2A4\uD0C0\uC77C: 2D/\uD751\uBC31\xB73D/\uB80C\uB354\uB9C1\xB7\uCE98\uB9AC\uADF8\uB77C\uD53C"),
    theme: z.enum(["rpg_fantasy", "casual_cartoon", "sf_cyberpunk"]).optional().describe("\uD14C\uB9C8: RPG/\uD310\uD0C0\uC9C0\xB7\uCE90\uC8FC\uC5BC/\uCE74\uD230\xB7SF/\uC0AC\uC774\uBC84\uD391\uD06C"),
    sort: z.enum(["newest", "oldest", "popular", "views"]).default("newest").describe("\uC870\uD68C \uACB0\uACFC \uC815\uB82C")
  },
  outputSchema: {
    prompts: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable()
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const styleTerms = {
      "2d_bw": ["2d/\uD751\uBC31", "2d", "\uD751\uBC31"],
      "3d_render": ["3d/\uB80C\uB354\uB9C1", "3d", "\uB80C\uB354\uB9C1"],
      calligraphy: ["\uCE98\uB9AC\uADF8\uB77C\uD53C", "calligraphy"]
    };
    const themeTerms = {
      rpg_fantasy: ["rpg", "\uD310\uD0C0\uC9C0"],
      casual_cartoon: ["\uCE90\uC8FC\uC5BC", "\uCE74\uD230"],
      sf_cyberpunk: ["sf", "\uC0AC\uC774\uBC84\uD391\uD06C"]
    };
    const matches = [];
    let scanned = 0;
    let token = a.pageToken;
    let rounds = 0;
    do {
      const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/prompts`, {
        pageSize: 100,
        pageToken: token,
        showMissing: false
      });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument2);
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
          const haystack = [entry.title, entry.description, entry.aiKeywords, promptText, ...tags].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
          if (!haystack.includes(needle)) continue;
        }
        matches.push(entry);
      }
      token = payload.nextPageToken || null;
      rounds++;
    } while (token && rounds < 20);
    matches.sort((x, y) => {
      if (a.sort === "popular") return Number(y.likeCount || 0) - Number(x.likeCount || 0) || bannerTimestamp(y.createdAt) - bannerTimestamp(x.createdAt);
      if (a.sort === "views") return Number(y.views || 0) - Number(x.views || 0) || bannerTimestamp(y.createdAt) - bannerTimestamp(x.createdAt);
      return a.sort === "oldest" ? bannerTimestamp(x.createdAt) - bannerTimestamp(y.createdAt) : bannerTimestamp(y.createdAt) - bannerTimestamp(x.createdAt);
    });
    const prompts = matches.slice(0, a.pageSize).map(promptArcSummary);
    const result = { prompts, returned: prompts.length, scanned, nextPageToken: token };
    return data(result, JSON.stringify(result, null, 2));
  } catch (e) {
    return errText(`Prompt Arc \uBAA9\uB85D \uC870\uD68C \uC2E4\uD328: ${e.message}`);
  }
});
server.registerTool("nexus_prompt_arc_get", {
  title: "Prompt Arc \uACF5\uAC1C \uD56D\uBAA9 \uC0C1\uC138",
  description: "Prompt Arc \uACF5\uAC1C \uD56D\uBAA9\uC758 \uD504\uB86C\uD504\uD2B8 \uB2E8\uACC4, \uC774\uBBF8\uC9C0\xB7\uC601\uC0C1 URL, \uD0DC\uADF8, \uD0A4\uC6CC\uB4DC\uC640 \uC5F0\uAD00 \uD56D\uBAA9 ID\uB97C \uC77D\uAE30 \uC804\uC6A9 \uC870\uD68C\uD569\uB2C8\uB2E4.",
  inputSchema: {
    id: z.string().min(1).describe("nexus_prompt_arc_list\uAC00 \uBC18\uD658\uD55C \uBB38\uC11C ID")
  },
  outputSchema: {
    prompt: z.record(z.string(), z.any())
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/prompts/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument2(payload);
    if (!nexusLibraryEntryReadable(raw)) throw new Error("\uD604\uC7AC \uC5F0\uACB0\uB41C Nexus \uACC4\uC815\uC73C\uB85C \uC811\uADFC\uD560 \uC218 \uC5C6\uB294 \uD56D\uBAA9\uC785\uB2C8\uB2E4.");
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
      analysisStatus: raw.analysisStatus || null
    };
    return data({ prompt }, JSON.stringify(prompt, null, 2));
  } catch (e) {
    return errText(`Prompt Arc \uC0C1\uC138 \uC870\uD68C \uC2E4\uD328 (${a.id}): ${e.message}`);
  }
});
server.registerTool("nexus_promotion_library_list", {
  title: "Promotion \uB77C\uC774\uBE0C\uB7EC\uB9AC \uBAA9\uB85D",
  description: "NEXUS Studio Promotion Library\uC758 \uD504\uB85C\uBAA8\uC158\uC744 \uC77D\uAE30 \uC804\uC6A9\uC73C\uB85C \uC870\uD68C\uD569\uB2C8\uB2E4. \uBE0C\uB79C\uB4DC\uC6F9\uC740 \uC81C\uC678\uD558\uBA70 \uC81C\uBAA9\xB7\uD0DC\uADF8\xB7\uAC8C\uC784\xB7\uC5F0\uB3C4\xB7\uD3C9\uAC00\uC810\uC218 \uAC80\uC0C9\uACFC \uD398\uC774\uC9C0 \uD1A0\uD070\uC744 \uC9C0\uC6D0\uD569\uB2C8\uB2E4.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30).describe("\uBC18\uD658\uD560 \uD504\uB85C\uBAA8\uC158 \uC218 (\uCD5C\uB300 100)"),
    pageToken: z.string().optional().describe("\uC774\uC804 \uC751\uB2F5\uC758 nextPageToken \u2014 \uB2E4\uC74C \uD398\uC774\uC9C0 \uC870\uD68C \uC2DC \uC804\uB2EC"),
    query: z.string().optional().describe("\uC81C\uBAA9\xB7\uD0DC\uADF8\xB7\uC694\uC57D\xB7\uACBD\uB85C\uC5D0\uC11C \uCC3E\uC744 \uAC80\uC0C9\uC5B4"),
    game: z.string().optional().describe("\uAC8C\uC784\uBA85 \uC815\uD655 \uC77C\uCE58 \uD544\uD130"),
    year: z.union([z.string(), z.number()]).optional().describe("\uC5F0\uB3C4 \uD544\uD130"),
    minScore: z.number().min(0).max(10).optional().describe("\uCD5C\uC18C \uD3C9\uAC00\uC810\uC218 (10\uC810 \uB9CC\uC810)"),
    sort: z.enum(["newest", "oldest", "score", "liked"]).default("newest").describe("\uC870\uD68C \uACB0\uACFC \uC815\uB82C")
  },
  outputSchema: {
    promotions: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable()
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const matches = [];
    let scanned = 0;
    let token = a.pageToken;
    let rounds = 0;
    do {
      const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners`, {
        pageSize: 100,
        pageToken: token,
        showMissing: false
      });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument2);
      scanned += decoded.length;
      for (const entry of decoded) {
        if (String(entry.assetType || "") === "\uBE0C\uB79C\uB4DC\uC6F9") continue;
        if (!nexusLibraryEntryReadable(entry)) continue;
        if (a.game && String(entry.game || "") !== a.game) continue;
        if (a.year != null && String(entry.year || "") !== String(a.year)) continue;
        const score = promotionScore(entry);
        if (a.minScore != null && (score == null || score < a.minScore)) continue;
        if (needle) {
          const haystack = [
            entry.title,
            entry.summary,
            entry.description,
            entry.path,
            entry.game,
            ...Array.isArray(entry.tags) ? entry.tags : []
          ].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
          if (!haystack.includes(needle)) continue;
        }
        matches.push(entry);
      }
      token = payload.nextPageToken || null;
      rounds++;
    } while (token && rounds < 10);
    matches.sort((x, y) => {
      if (a.sort === "score") return (promotionScore(y) ?? -1) - (promotionScore(x) ?? -1) || bannerTimestamp(y.created_at || y.createdAt) - bannerTimestamp(x.created_at || x.createdAt);
      if (a.sort === "liked") return Number(y.liked || 0) - Number(x.liked || 0) || bannerTimestamp(y.created_at || y.createdAt) - bannerTimestamp(x.created_at || x.createdAt);
      return a.sort === "oldest" ? bannerTimestamp(x.created_at || x.createdAt) - bannerTimestamp(y.created_at || y.createdAt) : bannerTimestamp(y.created_at || y.createdAt) - bannerTimestamp(x.created_at || x.createdAt);
    });
    const promotions = matches.slice(0, a.pageSize).map(promotionSummary);
    const result = { promotions, returned: promotions.length, scanned, nextPageToken: token };
    return data(result, JSON.stringify(result, null, 2));
  } catch (e) {
    return errText(`Promotion Library \uBAA9\uB85D \uC870\uD68C \uC2E4\uD328: ${e.message}`);
  }
});
server.registerTool("nexus_promotion_library_get", {
  title: "Promotion \uB77C\uC774\uBE0C\uB7EC\uB9AC \uC0C1\uC138",
  description: "NEXUS Studio Promotion Library \uD56D\uBAA9\uC758 PC\xB7\uBAA8\uBC14\uC77C \uC774\uBBF8\uC9C0\uC640 \uD3C9\uAC00\uC810\uC218\xB7\uD56D\uBAA9\uBCC4 \uC0AC\uC720\uB97C \uC77D\uAE30 \uC804\uC6A9 \uC870\uD68C\uD569\uB2C8\uB2E4.",
  inputSchema: {
    id: z.string().min(1).describe("nexus_promotion_library_list\uAC00 \uBC18\uD658\uD55C \uBB38\uC11C ID")
  },
  outputSchema: {
    promotion: z.record(z.string(), z.any())
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument2(payload);
    if (String(raw.assetType || "") === "\uBE0C\uB79C\uB4DC\uC6F9") throw new Error("\uBE0C\uB79C\uB4DC\uC6F9 \uD56D\uBAA9\uC785\uB2C8\uB2E4. nexus_brand_web_library_get\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.");
    if (!nexusLibraryEntryReadable(raw)) throw new Error("\uD604\uC7AC \uC5F0\uACB0\uB41C Nexus \uACC4\uC815\uC73C\uB85C \uC811\uADFC\uD560 \uC218 \uC5C6\uB294 \uD56D\uBAA9\uC785\uB2C8\uB2E4.");
    const webScores = raw.webScores && typeof raw.webScores === "object" ? raw.webScores : {};
    const criteria = Object.fromEntries(Object.entries(webScores).map(([key, value]) => [key, {
      score: Number.isFinite(Number(value?.score)) ? Number(value.score) : null,
      reason: value?.reason || null
    }]));
    const promotion = {
      ...promotionSummary(raw),
      path: raw.path || null,
      originalTitle: raw.originalTitle || null,
      purpose: raw.purpose || null,
      evaluationType: raw.evaluationType || raw.webEvalType || null,
      criteria
    };
    return data({ promotion }, JSON.stringify(promotion, null, 2));
  } catch (e) {
    return errText(`Promotion Library \uC0C1\uC138 \uC870\uD68C \uC2E4\uD328 (${a.id}): ${e.message}`);
  }
});
server.registerTool("nexus_brand_web_library_list", {
  title: "Brand Web \uB77C\uC774\uBE0C\uB7EC\uB9AC \uBAA9\uB85D",
  description: "NEXUS Studio Brand Web Library\uC5D0 \uB4F1\uB85D\uB41C \uACF5\uAC1C \uBE0C\uB79C\uB4DC\uC6F9\uC744 \uC77D\uAE30 \uC804\uC6A9\uC73C\uB85C \uC870\uD68C\uD569\uB2C8\uB2E4. \uC81C\uBAA9\xB7\uD0DC\uADF8\xB7\uAC8C\uC784\xB7\uC5F0\uB3C4\xB7\uB514\uBC14\uC774\uC2A4 \uAC80\uC0C9\uACFC \uD398\uC774\uC9C0 \uD1A0\uD070\uC744 \uC9C0\uC6D0\uD569\uB2C8\uB2E4.",
  inputSchema: {
    pageSize: z.number().int().min(1).max(100).default(30).describe("\uBC18\uD658\uD560 \uBE0C\uB79C\uB4DC\uC6F9 \uC218 (\uCD5C\uB300 100)"),
    pageToken: z.string().optional().describe("\uC774\uC804 \uC751\uB2F5\uC758 nextPageToken \u2014 \uB2E4\uC74C \uD398\uC774\uC9C0 \uC870\uD68C \uC2DC \uC804\uB2EC"),
    query: z.string().optional().describe("\uC81C\uBAA9\xB7\uD0DC\uADF8\xB7\uC124\uBA85\xB7\uD398\uC774\uC9C0\uBA85\uC5D0\uC11C \uCC3E\uC744 \uAC80\uC0C9\uC5B4"),
    game: z.string().optional().describe("\uAC8C\uC784\uBA85 \uC815\uD655 \uC77C\uCE58 \uD544\uD130"),
    year: z.union([z.string(), z.number()]).optional().describe("\uC5F0\uB3C4 \uD544\uD130"),
    device: z.enum(["pc", "mobile"]).optional().describe("\uD574\uB2F9 \uB514\uBC14\uC774\uC2A4 \uD398\uC774\uC9C0\uAC00 \uC788\uB294 \uD56D\uBAA9\uB9CC \uC870\uD68C"),
    sort: z.enum(["newest", "oldest", "liked"]).default("newest").describe("\uC870\uD68C \uACB0\uACFC \uC815\uB82C")
  },
  outputSchema: {
    entries: z.array(z.record(z.string(), z.any())),
    returned: z.number(),
    scanned: z.number(),
    nextPageToken: z.string().nullable()
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const matches = [];
    let scanned = 0;
    let token = a.pageToken;
    let rounds = 0;
    do {
      const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners`, {
        pageSize: 100,
        pageToken: token,
        showMissing: false
      });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument2);
      scanned += decoded.length;
      for (const entry of decoded) {
        if (String(entry.assetType || "") !== "\uBE0C\uB79C\uB4DC\uC6F9") continue;
        if (!nexusLibraryEntryReadable(entry)) continue;
        if (a.game && String(entry.game || "") !== a.game) continue;
        if (a.year != null && String(entry.year || "") !== String(a.year)) continue;
        const pages = Array.isArray(entry.pages) ? entry.pages : [];
        if (a.device && !pages.some((page) => page?.device === a.device)) continue;
        if (needle) {
          const haystack = [
            entry.title,
            entry.sourceProjectName,
            entry.sourceDescription,
            entry.game,
            ...Array.isArray(entry.tags) ? entry.tags : [],
            ...pages.map((page) => page?.name)
          ].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
          if (!haystack.includes(needle)) continue;
        }
        matches.push(entry);
        if (matches.length >= a.pageSize) break;
      }
      token = payload.nextPageToken || null;
      rounds++;
    } while (matches.length < a.pageSize && token && rounds < 10);
    matches.sort((x, y) => a.sort === "liked" ? Number(y.liked || 0) - Number(x.liked || 0) : a.sort === "oldest" ? bannerTimestamp(x.created_at || x.createdAt) - bannerTimestamp(y.created_at || y.createdAt) : bannerTimestamp(y.created_at || y.createdAt) - bannerTimestamp(x.created_at || x.createdAt));
    const entries = matches.slice(0, a.pageSize).map(brandWebSummary);
    const result = { entries, returned: entries.length, scanned, nextPageToken: token };
    return data(result, JSON.stringify(result, null, 2));
  } catch (e) {
    return errText(`Brand Web Library \uBAA9\uB85D \uC870\uD68C \uC2E4\uD328: ${e.message}`);
  }
});
server.registerTool("nexus_brand_web_library_get", {
  title: "Brand Web \uB77C\uC774\uBE0C\uB7EC\uB9AC \uC0C1\uC138",
  description: "NEXUS Studio Brand Web Library \uD56D\uBAA9\uC758 \uBA54\uD0C0\uB370\uC774\uD130\uC640 PC\xB7\uBAA8\uBC14\uC77C \uC804\uCCB4 \uD398\uC774\uC9C0 \uC774\uBBF8\uC9C0 URL\uC744 \uC77D\uAE30 \uC804\uC6A9 \uC870\uD68C\uD569\uB2C8\uB2E4.",
  inputSchema: {
    id: z.string().min(1).describe("nexus_brand_web_library_list\uAC00 \uBC18\uD658\uD55C \uBB38\uC11C ID")
  },
  outputSchema: {
    entry: z.record(z.string(), z.any())
  },
  annotations: READ_REMOTE
}, async (a) => {
  try {
    const { projectId } = firebaseConfig2();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument2(payload);
    if (String(raw.assetType || "") !== "\uBE0C\uB79C\uB4DC\uC6F9") throw new Error("\uBE0C\uB79C\uB4DC\uC6F9 \uD56D\uBAA9\uC774 \uC544\uB2D9\uB2C8\uB2E4.");
    if (!nexusLibraryEntryReadable(raw)) throw new Error("\uD604\uC7AC \uC5F0\uACB0\uB41C Nexus \uACC4\uC815\uC73C\uB85C \uC811\uADFC\uD560 \uC218 \uC5C6\uB294 \uD56D\uBAA9\uC785\uB2C8\uB2E4.");
    const pages = (Array.isArray(raw.pages) ? raw.pages : []).map((page, index) => ({
      id: page?.id || null,
      name: page?.name || `page_${index + 1}`,
      device: page?.device || null,
      url: page?.url || null,
      order: Number.isFinite(Number(page?.order)) ? Number(page.order) : index,
      confirmedAt: page?.confirmedAt || null,
      noteCount: Number(page?.noteCount || 0)
    }));
    const entry = { ...brandWebSummary(raw), pages };
    return data({ entry }, JSON.stringify(entry, null, 2));
  } catch (e) {
    return errText(`Brand Web Library \uC0C1\uC138 \uC870\uD68C \uC2E4\uD328 (${a.id}): ${e.message}`);
  }
});
server.registerTool("nexus_account_status", {
  title: "Nexus \uACC4\uC815 \uC5F0\uACB0 \uC0C1\uD0DC",
  description: "Codex MCP\uC5D0 \uC5F0\uACB0\uB41C Nexus \uACC4\uC815\uACFC \uC790\uB3D9 \uD1A0\uD070 \uAC31\uC2E0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.",
  inputSchema: {},
  outputSchema: {
    connected: z.boolean(),
    uid: z.string().nullable(),
    email: z.string().nullable(),
    expiresAt: z.number().nullable()
  },
  annotations: PURE
}, async () => {
  const auth = await currentNexusAuth().catch(() => null);
  const result = {
    connected: !!auth?.refreshToken,
    uid: auth?.uid || null,
    email: auth?.email || null,
    expiresAt: auth?.expiresAt || null
  };
  return data(result, JSON.stringify(result, null, 2));
});
server.registerTool("nexus_account_disconnect", {
  title: "Nexus \uACC4\uC815 \uC5F0\uACB0 \uD574\uC81C",
  description: "Codex MCP\uC5D0 \uC800\uC7A5\uB41C Nexus \uC0AC\uC6A9\uC790 \uC138\uC158\uB9CC \uC81C\uAC70\uD569\uB2C8\uB2E4. Nexus Studio \uC6F9 \uB85C\uADF8\uC778\uC740 \uC720\uC9C0\uB429\uB2C8\uB2E4.",
  inputSchema: {},
  outputSchema: { disconnected: z.boolean() },
  annotations: RENDER
}, async () => {
  try {
    fs2.unlinkSync(NEXUS_AUTH_PATH);
  } catch {
  }
  const result = { disconnected: true };
  return data(result, JSON.stringify(result));
});
startNexusLinkBridge();
var transport = new StdioServerTransport();
await server.connect(transport);
console.error("[nexus-mcp] NEXUS Studio MCP server ready (stdio)");
