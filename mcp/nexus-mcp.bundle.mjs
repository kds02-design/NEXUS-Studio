#!/usr/bin/env node
// 자동 생성 파일 — 수정 금지. 원본: mcp/server.mjs (npm run mcp:build 로 재생성)

// mcp/server.mjs
import fs from "node:fs";
import path from "node:path";
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

\uCD5C\uC885 \uC790\uCCB4\uAC80\uC99D (\uCD9C\uB825 \uC804\uC5D0 \uBC18\uB4DC\uC2DC): \uCCA8\uBD80 \uC774\uBBF8\uC9C0\uB97C 1\uC7A5\uC529 \uC21C\uC11C\uB300\uB85C \uD655\uC778\uD558\uBA70 \u2014 \u2460\uADF8 \uC544\uC774\uD15C\uC774 \uACB0\uACFC\uC5D0 \uC815\uD655\uD788 1\uAC1C\uB9CC \uC788\uB294\uAC00 \u2461\uACB0\uACFC\uC758 \uC544\uC774\uD15C \uCD1D \uAC1C\uC218\uAC00 ${n}\uAC1C\uC778\uAC00 \u2462\uCCA8\uBD80\uC5D0 \uC5C6\uB294 \uC0C8 \uC624\uBE0C\uC81D\uD2B8\uAC00 \uC5C6\uB294\uAC00 \u2463\uAC01 \uC544\uC774\uD15C\uC774 \uC798\uB9AC\uC9C0 \uC54A\uACE0 \uC804\uCCB4\uAC00 \uC628\uC804\uD788 \uBCF4\uC774\uB294\uAC00 \u2464\uC6D0\uBCF8\uC5D0 \uC0C8\uACA8\uC838 \uC788\uB358 \uAE00\uC790\xB7\uB77C\uBCA8\xB7\uB514\uD14C\uC77C\uC774 \uC9C0\uC6CC\uC9C0\uC9C0 \uC54A\uACE0 \uADF8\uB300\uB85C\uC778\uAC00 \u2014 \uD558\uB098\uB77C\uB3C4 \uC544\uB2C8\uBA74 \uB2E4\uC2DC \uAD6C\uC131\uD558\uC138\uC694.
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
- \uD5C8\uC6A9\uB418\uB294 \uBCC0\uACBD\uC740 \uC624\uC9C1 \uC774 \uC138 \uAC00\uC9C0\uBFD0: \u2460\uBC30\uCE58 \uC704\uCE58 \u2461\uD06C\uAE30 \uC870\uC808 \u2462\uC804\uCCB4 \uC870\uBA85\uACFC \uC5B4\uC6B8\uB9AC\uB294 \uB9BC\uB77C\uC774\uD2B8\xB7\uADF8\uB9BC\uC790. \uC774 \uC678\uC758 \uC5B4\uB5A4 \uD53D\uC140 \uC218\uC900 \uBCC0\uACBD\uB3C4 \uAE08\uC9C0.
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
    { id: "P_Condensed", name: "5:10 (\uB9E4\uC6B0 \uC881\uC74C)", en: "Condensed 5:10 ratio" },
    { id: "P_Slim", name: "6:10 (\uC881\uC74C)", en: "Slim 6:10 ratio" },
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
    { id: "Casual_StencilBlock", name: "\uC2A4\uD150\uC2E4 \uBE14\uB85D (Stencil Block)", en: "Bold geometric stencil block lettering with hard right-angle corners, heavy condensed solid strokes, thick chunky mass, modern stamped block forms with sharp flat terminals", cat: "casual" }
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

// src/apps/TypecoreBreeze/constants/categories.jsx
import {
  Activity,
  Star,
  Smile,
  Feather,
  PenTool,
  Edit2,
  Box,
  FastForward,
  Clapperboard,
  MessageSquare,
  Palette,
  Type
} from "lucide-react";
import { jsx } from "react/jsx-runtime";
var directorPersonas = [
  { id: "bubble_pop", category: "casual", icon: /* @__PURE__ */ jsx(Smile, { className: "w-4 h-4" }), shortTitle: "\uB9D0\uB791 \uC824\uB9AC/\uD050\uD2B8 \uD31D", subtitle: "\uD1B5\uD1B5 \uD280\uB294 \uBC14\uC6B4\uC2A4\uC640 \uC824\uB9AC \uBCFC\uB968\uAC10", role: "\uB108\uB294 \uB300\uC911\uC801\uC774\uACE0 \uADC0\uC5EC\uC6B4 \uB9E4\uB825\uC744 \uB4EC\uBFCD \uB2F4\uC740 '\uCE90\uC8FC\uC5BC \uD31D\uC544\uD2B8 \uD06C\uB9AC\uC5D0\uC774\uD130'\uC57C. \uB0A0\uCE74\uB85C\uC6B4 \uBAA8\uC11C\uB9AC\uB97C \uBC30\uC81C\uD558\uACE0 \uB9D0\uB791\uD558\uAC8C \uB179\uC544\uB0B4\uB9AC\uB294 \uC824\uB9AC\uB098 \uD1B5\uD1B5\uD55C \uD48D\uC120\uCC98\uB7FC \uAE00\uC790\uB97C \uB514\uC790\uC778\uD574.", keywords: "Bouncy bubble letters, chewy jelly shapes, soft rounded corners, playful height variations, kawaii pastel pop sticker", tone: "[\uBC1C\uB784\uD558\uACE0 \uC5D0\uB108\uC9C0 \uB118\uCE58\uB294] \uD1A1\uD1A1 \uD280\uB294 \uC544\uC774\uB514\uC5B4\uC640 \uACBD\uCF8C\uD55C \uB9AC\uB4EC\uAC10\uC744 \uAC15\uC870\uD558\uB294 \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Focus on friendly, bouncy, and playful bubble shapes. Eliminate all sharp corners and apply dynamic bouncing rhythms." },
  { id: "comic_artist", category: "casual", icon: /* @__PURE__ */ jsx(MessageSquare, { className: "w-4 h-4" }), shortTitle: "\uB9CC\uD654/\uCF54\uBBF9\uBD81 \uD31D", subtitle: "\uAD75\uC740 \uC544\uC6C3\uB77C\uC778\uACFC \uD558\uD504\uD1A4 \uB3C4\uD2B8", role: "\uB108\uB294 \uC5ED\uB3D9\uC801\uC774\uACE0 \uD31D\uD55C \uB9CC\uD654\uCC45 \uD0C0\uC774\uD2C0\uC744 \uADF8\uB9AC\uB294 '\uCF54\uBBF9\uBD81 \uC544\uD2F0\uC2A4\uD2B8'\uC57C. \uAE00\uC790 \uC678\uACFD\uC5D0 \uAD75\uACE0 \uC120\uBA85\uD55C \uAE4C\uB9CC \uD14C\uB450\uB9AC\uB97C \uB450\uB974\uACE0, \uB0B4\uBD80\uB294 \uB9DD\uC810\uC774\uB098 \uC2A4\uD53C\uB4DC \uB77C\uC778\uC73C\uB85C \uCC44\uC6CC.", keywords: "Comic book pop art, bold black outlines, halftone dot patterns, dynamic cartoon energy, speech bubble typography, 2D illustration", tone: "[\uACBD\uCF8C\uD558\uACE0 \uB9CC\uD654\uC801\uC778] \uC561\uC158 \uB9CC\uD654\uC758 \uD55C \uCEF7\uC744 \uBB18\uC0AC\uD558\uB4EF \uACFC\uC7A5\uB418\uACE0 \uC720\uCF8C\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Emphasize 2D comic book styles. Use bold black outlines, pop-art halftone dots, and expressive cartoon-like deformations." },
  { id: "block_architect", category: "casual", icon: /* @__PURE__ */ jsx(Box, { className: "w-4 h-4" }), shortTitle: "\uC9C1\uC120/\uBAA8\uB358 \uBE14\uB85D", subtitle: "\uB2E8\uB2E8\uD558\uACE0 \uAD75\uC740 \uC9C1\uC120\uC758 \uC2E0\uB8B0\uAC10", role: "\uB108\uB294 \uAE54\uB054\uD558\uBA74\uC11C\uB3C4 \uC784\uD329\uD2B8 \uC788\uB294 \uD615\uD0DC\uB97C \uC124\uACC4\uD558\uB294 '\uBAA8\uB358 \uBE14\uB85D \uC544\uD0A4\uD14D\uD2B8'\uC57C. \uADC0\uC5EC\uC6B4 \uACE1\uC120\uBCF4\uB2E4\uB294 \uB2E8\uB2E8\uD558\uACE0 \uAD75\uC740 \uC9C1\uC120, \uB450\uD23C\uD55C \uB369\uC5B4\uB9AC\uAC10\uC744 \uD65C\uC6A9\uD574.", keywords: "Straight geometric blocks, thick chunky layout, college sports emblem, modern clean pop, solid flat graphics, architectural letters", tone: "[\uB2E8\uB2E8\uD558\uACE0 \uBA85\uD655\uD55C] \uD754\uB4E4\uB9BC \uC5C6\uC774 \uD2BC\uD2BC\uD55C \uAC74\uCD95\uBB3C\uC744 \uC124\uBA85\uD558\uB4EF \uAE54\uB054\uD558\uACE0 \uC2E0\uB8B0\uAC10 \uC788\uB294 \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Use straight, thick, blocky geometric letterforms. Avoid soft jelly curves and focus on solid, modern, and clean flat typography." },
  { id: "variety_director", category: "casual", icon: /* @__PURE__ */ jsx(Clapperboard, { className: "w-4 h-4" }), shortTitle: "\uC608\uB2A5/\uC378\uB124\uC77C \uD31D\uC5C5", subtitle: "\uC555\uB3C4\uC801\uC778 \uC2DC\uC778\uC131\uACFC 3D \uC785\uCCB4 \uD14C\uB450\uB9AC", role: "\uB108\uB294 \uC608\uB2A5 \uD504\uB85C\uADF8\uB7A8 \uD0C0\uC774\uD2C0\uC774\uB098 \uC720\uD29C\uBE0C \uC378\uB124\uC77C\uC744 \uB514\uC790\uC778\uD558\uB294 '\uBC29\uC1A1 \uD0C0\uC774\uD2C0 \uB514\uB809\uD130'\uC57C. \uD654\uBA74 \uBC16\uC73C\uB85C \uD280\uC5B4\uB098\uC62C \uB4EF\uD55C 3D \uC785\uCCB4\uAC10, \uC544\uC8FC \uB450\uAECD\uACE0 \uBA85\uD655\uD55C \uC2A4\uD2F0\uCEE4 \uD14C\uB450\uB9AC\uB97C \uD65C\uC6A9\uD574.", keywords: "K-variety show title, YouTube thumbnail pop, thick sticker border cut-out, 3D extruded shadow, bold high impact legibility", tone: "[\uC8FC\uBAA9\uB3C4 \uB192\uACE0 \uC9C1\uAD00\uC801\uC778] \uC2DC\uC120\uC744 \uB2E8\uBC88\uC5D0 \uC0AC\uB85C\uC7A1\uB294 \uBC29\uC1A1\uAD6D \uC790\uB9C9\uCC98\uB7FC \uD150\uC158 \uB192\uACE0 \uC2DC\uC6D0\uC2DC\uC6D0\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Prioritize extreme legibility and pop impact. Use very thick sticker borders and 3D extruded drop shadows for a variety show vibe." },
  { id: "action_retro", category: "casual", icon: /* @__PURE__ */ jsx(FastForward, { className: "w-4 h-4" }), shortTitle: "\uC2A4\uD53C\uB4DC/\uC561\uC158 \uB808\uD2B8\uB85C", subtitle: "\uAC15\uB82C\uD55C \uC18D\uB3C4\uAC10\uACFC \uD799\uC2A4\uD130 \uC2A4\uD2B8\uB9BF \uD14D\uC2A4\uCC98", role: "\uB108\uB294 \uC544\uCF00\uC774\uB4DC \uB808\uD2B8\uB85C \uAC10\uC131\uC774\uB098 \uC5ED\uB3D9\uC801\uC778 \uC561\uC158\uC744 \uD45C\uD604\uD558\uB294 '\uC561\uC158 & \uB808\uD2B8\uB85C \uB514\uB809\uD130'\uC57C. \uAC70\uCE5C \uC2A4\uD06C\uB798\uCE58 \uD14D\uC2A4\uCC98, \uADF8\uB798\uD53C\uD2F0 \uB9C8\uCEE4\uD39C\uC758 \uD754\uC801, \uC0AC\uC120 \uC808\uB2E8\uBA74\uC744 \uD65C\uC6A9\uD574.", keywords: "Dynamic racing speed, heavy grunge texture, retro arcade blocky shapes, sliced tension, urban street graffiti marker", tone: "[\uAC15\uB82C\uD558\uACE0 \uC5ED\uB3D9\uC801\uC778] \uC544\uB4DC\uB808\uB0A0\uB9B0\uC774 \uC19F\uAD6C\uCE58\uB4EF \uC18D\uB3C4\uAC10 \uC788\uACE0 \uD30C\uC6CC\uD480\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Inject high momentum or raw street energy. Use aggressive italic slants, speed cuts, chunky retro blocks, or heavy grunge/marker textures." },
  { id: "idol_trendsetter", category: "casual", icon: /* @__PURE__ */ jsx(Star, { className: "w-4 h-4" }), shortTitle: "\uC544\uC774\uB3CC/Y2K \uD31D", subtitle: "\uC0AC\uC774\uBC84\uD2F1 \uBC18\uC9DD\uC784\uACFC \uC138\uB828\uB41C \uD558\uC774\uD2F4 \uAC10\uC131", role: "\uB108\uB294 \uC138\uAE30\uB9D0\uC758 \uD654\uB824\uD568\uACFC K-Pop \uC544\uC774\uB3CC \uAC10\uC131\uC744 \uC0AC\uB791\uD558\uB294 'Y2K \uD2B8\uB80C\uB4DC\uC138\uD130'\uC57C. \uBA54\uD0C8\uB9AD\uD55C \uC9C8\uAC10, \uC601\uB871\uD558\uAC8C \uBE5B\uB098\uB294 \uBCC4\uC870\uAC01 \uC7A5\uC2DD, \uC587\uACE0 \uC138\uB828\uB41C \uC120\uC744 \uD65C\uC6A9\uD574.", keywords: "Y2K aesthetic, K-Pop idol logo, cyber metallic shine, retro futuristic, nostalgic teen pop, sparkly stars, elegant clean pop", tone: "[\uD654\uB824\uD558\uACE0 \uD2B8\uB80C\uB514\uD55C] \uD328\uC158 \uB9E4\uAC70\uC9C4\uCC98\uB7FC \uAC10\uAC01\uC801\uC774\uACE0 \uC138\uB828\uB41C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Emphasize 2000s Y2K or modern K-Pop aesthetics. Use clean lines, sparkling stars, glossy cyber textures, and a trendy high-teen vibe." },
  { id: "ink_master", category: "calli", icon: /* @__PURE__ */ jsx(Feather, { className: "w-4 h-4" }), shortTitle: "\uC218\uBB35/\uBD93\uAE00\uC528 \uC7A5\uC778", subtitle: "\uC544\uB0A0\uB85C\uADF8 \uD544\uC555\uACFC \uBA39 \uBC88\uC9D0\uC758 \uBBF8\uD559", role: "\uB108\uB294 \uC885\uC774\uC640 \uBD93\uC758 \uB9C8\uCC30, \uADF8\uB9AC\uACE0 \uBA39\uC774 \uBC88\uC9C0\uB294 \uBB3C\uC131\uC744 \uC870\uD615\uC73C\uB85C \uC2B9\uD654\uC2DC\uD0A4\uB294 '\uBD93\uAE00\uC528 \uC7A5\uC778'\uC774\uC57C.", keywords: "Emotional brush calligraphy, variable stroke pressure, wet ink bleed, traditional or modern elegant sweeps, human touch", tone: "[\uB530\uB73B\uD558\uACE0 \uC11C\uC815\uC801\uC778] \uBD93\uB05D\uC5D0\uC11C \uD53C\uC5B4\uB098\uB294 \uAC10\uC815\uACFC \uBA39\uBB3C\uC758 \uD750\uB984\uC744 \uC2DC\uC801\uC73C\uB85C \uC11C\uC220\uD558\uB77C.", instructionRule: "- Rule: Emphasize variable brush pressure (thick downstrokes, thin upstrokes) and organic, analogue ink bleeding textures." },
  { id: "monoline_crafter", category: "calli", icon: /* @__PURE__ */ jsx(PenTool, { className: "w-4 h-4" }), shortTitle: "\uB2E4\uAFB8/\uD39C\uAE00\uC528 \uC791\uAC00", subtitle: "\uC815\uAC08\uD558\uACE0 \uC77C\uC815\uD55C \uB450\uAED8\uC758 \uB2F4\uBC31\uD568", role: "\uB108\uB294 \uC77C\uC815\uD55C \uAD75\uAE30\uC758 \uD39C\uCD09\uC73C\uB85C \uC18C\uBC15\uD558\uACE0 \uAE54\uB054\uD55C \uAC10\uC131\uC744 \uB9CC\uB4E4\uC5B4\uB0B4\uB294 '\uD39C\uAE00\uC528 \uC791\uAC00'\uC57C.", keywords: "Clean monoline pen, neat handwritten script, minimalist diary aesthetic, uniform stroke thickness, cozy and simple vector", tone: "[\uCC28\uBD84\uD558\uACE0 \uC815\uAC08\uD55C] \uACFC\uC7A5 \uC5C6\uC774 \uB2F4\uBC31\uD558\uACE0 \uAE68\uB057\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Keep it clean, neat, and highly legible. Emphasize uniform monoline purity, minimal fuss, and a cozy layout." },
  { id: "flourish_artist", category: "calli", icon: /* @__PURE__ */ jsx(Edit2, { className: "w-4 h-4" }), shortTitle: "\uB9AC\uBCF8 \uC2A4\uD06C\uB9BD\uD2B8 \uC791\uAC00", subtitle: "\uD654\uB824\uD55C \uAF2C\uB9AC\uC640 \uC5F0\uC18D\uC801\uC778 \uACE1\uC120\uBBF8", role: "\uB108\uB294 \uAE00\uC790\uC640 \uAE00\uC790\uAC00 \uC720\uB824\uD558\uAC8C \uC774\uC5B4\uC9C0\uB294 \uACE1\uC120\uBBF8\uB97C \uADF9\uD55C\uC73C\uB85C \uB2E4\uB8E8\uB294 '\uB9AC\uBCF8 \uC2A4\uD06C\uB9BD\uD2B8 \uC791\uAC00'\uC57C.", keywords: "Elegant cursive script, decorative calligraphic flourishes, continuous ribbon flow, sophisticated swashes, graceful curves", tone: "[\uC6B0\uC544\uD558\uACE0 \uD654\uB824\uD55C] \uC815\uAD50\uD55C \uB4DC\uB85C\uC789\uC744 \uC124\uBA85\uD558\uB4EF \uB9E4\uB044\uB7FD\uACE0 \uC6B0\uC544\uD55C \uBB38\uCCB4\uB97C \uC0AC\uC6A9\uD558\uB77C.", instructionRule: "- Rule: Maximize elegant ligatures, decorative swashes on terminals, and continuous flowing ribbon-like connections between letters." }
];
var getSliderText = (val) => {
  if (val < 35) return `[INTENSITY]: Restrained, calm execution of the selected persona \u2014 gentle emphasis, minimal exaggeration.`;
  if (val > 65) return `[INTENSITY]: Bold, exaggerated execution of the selected persona \u2014 maximum emphasis on its signature traits.`;
  return `[INTENSITY]: Standard execution of the selected persona \u2014 its signature traits applied at full but not exaggerated.`;
};

// src/apps/TypecoreBreeze/hooks/useBreezePrompt.js
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
  const styleList = [...staticOptions.CasualStyles, ...s.dynamicOptions.CasualStyles || []];
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
[SPATIAL MANDATE]: ${occupancyEn}
${layoutEn}${lineBreakEn}${personaMandate}${hangulBoostEn}
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
[\uACF5\uAC04 \uD560\uB2F9]: ${occupancyKo}
${layoutKo}${lineBreakKo}${personaMandateKo}${hangulBoostKo}
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
\u2022 Rhythm: ${rhythmEn}`;
  const chatGPTOutput = {
    en: `Act as an expert Typography Engine. Render "${s.inputText}" in a 2D flat silhouette graphic.
1. Constraints: Pure black and white; preserve exact spelling.
2. Layout: ${layoutInlineEn}.${lineBreakEn}
3. Directing Aura: ${s.customDesignInjections || "Use the selected persona and style settings"}.
4. Details: ${s.isAdvancedOptionsEnabled ? `Texture(${textureEn}), Slant(${slantEn})` : "Aura Driven"}`,
    ko: `\uC804\uBB38 \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uC5D4\uC9C4\uC73C\uB85C \uB3D9\uC791\uD569\uB2C8\uB2E4. "${s.inputText}" \uD14D\uC2A4\uD2B8\uB97C 2D \uD751\uBC31 \uADF8\uB798\uD53D\uC73C\uB85C \uB80C\uB354\uB9C1\uD558\uC138\uC694.
1. \uC81C\uC57D \uC870\uAC74: \uC644\uC804\uD55C \uD751\uBC31, \uC815\uD655\uD55C \uCCA0\uC790 \uBCF4\uC874.
2. \uB808\uC774\uC544\uC6C3: ${layoutInlineKo}.${lineBreakKo}
3. \uC5F0\uCD9C \uBC29\uD5A5\uC131: ${s.customDesignInjections || "\uC120\uD0DD\uD55C \uD398\uB974\uC18C\uB098\uC640 \uC2A4\uD0C0\uC77C \uC124\uC815 \uC0AC\uC6A9"}.
4. \uC138\uBD80\uC0AC\uD56D: ${s.isAdvancedOptionsEnabled ? `\uD14D\uC2A4\uCC98(${textureKo}), \uAE30\uC6B8\uAE30(${slantKo})` : "\uC0AC\uC6A9\uC790 \uC544\uC6B0\uB77C \uAE30\uBC18"}`
  };
  const midjourneyOutput = {
    en: `"${s.inputText}" typography logotype, exact spelling, ${s.customDesignInjections || "selected casual typography style"}, ${s.isAdvancedOptionsEnabled ? textureEn : ""}, ${layoutInlineEn}${lineBreakEn}, pure black and white, flat 2D silhouette --ar ${s.aspectRatio} --no 3d color gradients`,
    ko: `"${s.inputText}" \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C \uB85C\uACE0\uD0C0\uC785, \uC815\uD655\uD55C \uCCA0\uC790, ${s.customDesignInjections || "\uC120\uD0DD\uD55C \uCE90\uC8FC\uC5BC \uD0C0\uC774\uD3EC \uC2A4\uD0C0\uC77C"}, ${s.isAdvancedOptionsEnabled ? textureKo : ""}, ${layoutInlineKo}${lineBreakKo}, \uC644\uC804\uD55C \uD751\uBC31, \uD3C9\uBA74 2D \uC2E4\uB8E8\uC5E3 --ar ${s.aspectRatio} --no 3d color gradients`
  };
  let finalOut = overview;
  if (s.aiModel === "NanoBanana") finalOut = s.isOutdated ? baseTechnical : s.nanoViewMode === "optimized" ? s.optimizedPrompt : s.dramaticPrompt || baseTechnical;
  else if (s.aiModel === "ChatGPT") finalOut = !s.isOutdated && s.cgEnhancedPrompt ? s.cgEnhancedPrompt : chatGPTOutput;
  else if (s.aiModel === "Midjourney") finalOut = !s.isOutdated && s.mjOptimizedPrompt ? s.mjOptimizedPrompt : midjourneyOutput;
  return { baseTechnical, outputContent: finalOut || overview, overview, conflicts };
};

// src/apps/TypecoreSovereign/versions/current/constants/personas.jsx
import React from "react";
import { Gamepad2, Swords, Landmark, Type as Type2, Wind, Film } from "lucide-react";
import { jsx as jsx2 } from "react/jsx-runtime";
var coreArchetypes = [
  {
    id: "core_fortress",
    icon: /* @__PURE__ */ jsx2(Gamepad2, { className: "w-4 h-4 text-amber-400" }),
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
    icon: /* @__PURE__ */ jsx2(Swords, { className: "w-4 h-4 text-rose-400" }),
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
    icon: /* @__PURE__ */ jsx2(Landmark, { className: "w-4 h-4 text-amber-600" }),
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
    icon: /* @__PURE__ */ jsx2(Type2, { className: "w-4 h-4 text-indigo-400" }),
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
    icon: /* @__PURE__ */ jsx2(Film, { className: "w-4 h-4 text-stone-300" }),
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
    icon: /* @__PURE__ */ jsx2(Wind, { className: "w-4 h-4 text-sky-400" }),
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
    { id: "P_Condensed", name: "\uC555\uCD95\uD615 (\uC138\uB85C\uC7A5\uD3C9)", en: "condensed tall aspect ratio, narrow vertical stems" },
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
  Shape_Cinema: { stemWeight: "Stem_Light", terminalStyle: "Term_Serif", strokeSharpness: "Sharp_Crisp", strokeTexture: "Tex_Subtle", deformationDamage: "Damage_Erosion", kerning: "Kern_Loose", persona: "core_cinema" }
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

COMPOSITION:
${ir.cgTextInstruction}. ${G(ir.layoutEn)} ${G(ir.mmoSilhouetteEn)}. The typography occupancy is ${G(ir.occupancyEn)}. Use ${ir.aspectRatio} canvas framing and keep comfortable margins on every side.

COLOR AND SURFACE:
${ir.bgDescEn}. Use exactly two flat colors with hard separation. ${renderSurface}

SURROUNDINGS:
${renderSurrounding}

ABSOLUTE RESTRICTIONS:
This is a front-facing flat graphic, not a photograph and not a 3D render. Do not create extrusion, bevel, embossing, perspective, shadows, highlights, gradients, glow, bloom, atmospheric effects, realistic materials, environmental backgrounds, mockups, or extra text. Keep the native uniform solid background and a crisp, readable silhouette suitable for later material rendering.`;
}

// src/apps/FrameForge/frameforgeMcp.js
var FRAMEFORGE_ASSET_TYPES = [
  { key: "button", ko: "\uBC84\uD2BC", en: "an empty horizontal game menu button frame" },
  { key: "box", ko: "\uBC15\uC2A4", en: "an empty game UI content box or panel frame" },
  { key: "frame", ko: "\uD504\uB808\uC784", en: "an empty decorative game UI frame" },
  { key: "badge", ko: "\uBC30\uC9C0", en: "an empty compact game UI badge frame" },
  { key: "divider", ko: "\uB514\uBC14\uC774\uB354", en: "a single straight horizontal game UI divider line" },
  { key: "icon", ko: "\uC544\uC774\uCF58", en: "a single standalone game UI icon glyph, no frame, no background plate" }
];
var FRAMEFORGE_SILHOUETTES = [
  { key: "button_hex_3", for: ["button"], ko: "\uBFB0\uC871 \uC721\uAC01 3:1", en: "an elongated 3:1 pointed hexagon menu-button frame with sharp spear-tip ends" },
  { key: "button_hex_4", for: ["button"], ko: "\uBFB0\uC871 \uC721\uAC01 4:1", en: "an ultra-wide 4:1 pointed hexagon button frame" },
  { key: "button_cut", for: ["button"], ko: "\uCEF7\uCF54\uB108 \uBC84\uD2BC", en: "an elongated 3:1 button with precise clipped corners" },
  { key: "button_pill", for: ["button"], ko: "\uD544 \uBC84\uD2BC", en: "a clean horizontal pill-shaped button" },
  { key: "button_stadium", for: ["button"], ko: "\uC88C\uC6B0 \uC6D0\uD615", en: "a wide stadium-shaped button frame whose ends are perfect semicircles" },
  { key: "button_round", for: ["button"], ko: "\uB77C\uC6B4\uB4DC \uBC84\uD2BC", en: "a wide softly rounded rectangular button" },
  { key: "box_landscape", for: ["box"], ko: "\uAC00\uB85C \uBC15\uC2A4", en: "a wide landscape content box with a large usable interior" },
  { key: "box_square", for: ["box"], ko: "\uC815\uC0AC\uAC01 \uBC15\uC2A4", en: "a square content box with a large usable interior" },
  { key: "box_portrait", for: ["box"], ko: "\uC138\uB85C \uBC15\uC2A4", en: "a tall portrait content box with a large usable interior" },
  { key: "box_tab", for: ["box"], ko: "\uD0ED \uBC15\uC2A4", en: "a rectangular content box with one small integrated top tab" },
  { key: "box_banner", for: ["box"], ko: "\uD589\uC789 \uBC15\uC2A4", en: "a hanging banner-shaped content box with a pointed lower edge" },
  { key: "frame_wide", for: ["frame"], ko: "\uC640\uC774\uB4DC \uD504\uB808\uC784", en: "a wide 16:9 decorative frame with a large open center" },
  { key: "frame_square", for: ["frame"], ko: "\uC815\uC0AC\uAC01 \uD504\uB808\uC784", en: "a square decorative frame with a large open center" },
  { key: "frame_portrait", for: ["frame"], ko: "\uC138\uB85C \uD504\uB808\uC784", en: "a portrait decorative frame with a large open center" },
  { key: "circle_plate", for: ["frame"], ko: "\uC6D0\uD615 \uC7A5\uC2DD \uC0AC\uAC01\uD310", en: "a rectangular UI plate incorporating a circular medallion" },
  { key: "perfect_circle", for: ["frame", "badge"], ko: "\uC644\uC804\uD55C \uC6D0", en: "one mathematically perfect circular silhouette" },
  { key: "oval", for: ["frame", "badge"], ko: "\uD0C0\uC6D0\uD615", en: "a wide oval frame with a clean center and no rectangular backing" },
  { key: "badge_shield", for: ["badge"], ko: "\uBC29\uD328 \uBC30\uC9C0", en: "a compact shield-shaped badge frame" },
  { key: "badge_hex", for: ["badge"], ko: "\uC721\uAC01 \uBC30\uC9C0", en: "a compact regular hexagonal badge frame" },
  { key: "badge_ribbon", for: ["badge"], ko: "\uB9AC\uBCF8 \uBC30\uC9C0", en: "a compact ribbon-shaped badge frame" },
  { key: "divider_line", for: ["divider"], ko: "\uC77C\uC9C1\uC120", en: "one perfectly straight horizontal separator line" },
  { key: "icon_arrow_right", for: ["icon"], ko: "\uD654\uC0B4\uD45C (\uC624\uB978\uCABD)", en: "a single bold arrow icon pointing right" },
  { key: "icon_arrow_down", for: ["icon"], ko: "\uD654\uC0B4\uD45C (\uC544\uB798)", en: "a single bold arrow icon pointing down" },
  { key: "icon_arrow_back", for: ["icon"], ko: "\uD654\uC0B4\uD45C (\uB4A4\uB85C)", en: "a single bold arrow icon pointing left" },
  { key: "icon_scroll_down", for: ["icon"], ko: "\uC2A4\uD06C\uB864 \uB2E4\uC6B4 (\uC170\uBE0C\uB860)", en: "two stacked downward chevrons" },
  { key: "icon_scroll_mouse", for: ["icon"], ko: "\uC2A4\uD06C\uB864 \uB2E4\uC6B4 (\uB9C8\uC6B0\uC2A4)", en: "a slim mouse outline and downward chevron" },
  { key: "icon_chevron_down", for: ["icon"], ko: "\uC170\uBE0C\uB860 (\uC544\uB798)", en: "a single clean downward chevron" },
  { key: "icon_nav_prev", for: ["icon"], ko: "\uC774\uB3D9 (\uC67C\uCABD)", en: "a clean left navigation chevron" },
  { key: "icon_nav_next", for: ["icon"], ko: "\uC774\uB3D9 (\uC624\uB978\uCABD)", en: "a clean right navigation chevron" },
  { key: "icon_play", for: ["icon"], ko: "\uC7AC\uC0DD (\uD50C\uB808\uC774)", en: "a single media play triangle" },
  { key: "icon_play_circle", for: ["icon"], ko: "\uC601\uC0C1 \uD50C\uB808\uC774 (\uC6D0\uD615)", en: "a play triangle centered inside a circular ring" }
];
var FRAMEFORGE_MOODS = [
  { key: "dark_rpg", ko: "\uC5B4\uB461\uACE0 \uAC15\uD55C RPG", preset: "black iron thorn armor", material: "battle-hardened dark steel", ornament: "restrained perimeter accents" },
  { key: "gold_kingdom", ko: "\uD654\uB824\uD55C \uD669\uAE08 \uC655\uAD6D", preset: "fallen royal dynasty crest", material: "aged ancient gold", ornament: "small mirrored ornaments at four corners" },
  { key: "magic", ko: "\uC2E0\uBE44\uB85C\uC6B4 \uB9C8\uBC95", preset: "subtle arcane glow line", material: "dark translucent magic crystal", ornament: "compact mirrored accents at both ends" },
  { key: "nature", ko: "\uC790\uC5F0\uACFC \uC815\uB839", preset: "restrained leaf and spirit-light accents", material: "aged dark hardwood", ornament: "small mirrored ornaments at four corners" },
  { key: "clean", ko: "\uAE54\uB054\uD558\uACE0 \uD604\uB300\uC801", preset: "clean contemporary product UI", material: "smooth matte surface", ornament: "restrained perimeter accents" },
  { key: "futuristic", ko: "\uBBF8\uB798\uC801 SF", preset: "plain charcoal precision", material: "polished forged steel", ornament: "restrained perimeter accents" }
];
var FRAMEFORGE_RENDER_STYLES = [
  { key: "illustrated", ko: "\uAC8C\uC784 \uC77C\uB7EC\uC2A4\uD2B8", en: "hand-painted game UI illustration with clear edges and readable color masses" },
  { key: "realistic_3d", ko: "\uC0AC\uC2E4\uC801\uC778 3D", en: "high-end physically based 3D game UI render with controlled reflections" },
  { key: "flat_graphic", ko: "\uC2EC\uD50C\uD55C 2D", en: "clean 2D vector-like game UI graphic with crisp silhouette and minimal shading" }
];
function buildFrameForgeMcpPrompt({ assetType, silhouette, mood, renderStyle, userText = "" }) {
  const isIcon = assetType.key === "icon";
  const isDivider = assetType.key === "divider";
  const structure = isDivider ? "one perfectly straight, very wide and extremely thin separator line" : silhouette.en;
  const interior = isIcon || isDivider ? "no interior panel" : "leave the center completely empty and visually open";
  const intent = userText.trim() ? ` User intent: ${userText.trim()}.` : "";
  return `Create ${assetType.en}, production-ready for a game UI. Structure: ${structure}. Style direction: ${mood.preset}. Ornament placement: ${mood.ornament}. Interior treatment: ${interior}. RENDER EXPRESSION LOCK: ${renderStyle.en}.${intent} Material and surface: ${mood.material}, refined finish and crisp controlled highlights. STRICT RESTRAINT: ornament may occupy at most 15% of the asset area; keep rails slim and nine-slice-safe where applicable. Front orthographic view, centered, generous safe padding, isolated on one perfectly flat high-contrast solid background for deterministic cutout. No text, no letters, no watermark, no extra objects, no perspective, no background texture, no gradient, no cast shadow, no runes or letter-like symbols. 4K game UI asset render.`;
}

// mcp/server.mjs
var ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
var SKILLS_DIR = path.join(ROOT, "src", "skills");
var RUBRIC_PATH = path.join(ROOT, ".codex", "skills", "nexus-design-evaluator", "references", "rubric.md");
var OUT_DIR = path.join(ROOT, ".tmp", "mcp-out");
var NEXUS_AUTH_DIR = path.join(process.env.APPDATA || path.join(os.homedir(), ".config"), "NexusStudio");
var NEXUS_AUTH_PATH = path.join(NEXUS_AUTH_DIR, "mcp-auth.json");
var NEXUS_LINK_PORT = Number(process.env.NEXUS_MCP_LINK_PORT || 47831);
function readNexusAuth() {
  try {
    return JSON.parse(fs.readFileSync(NEXUS_AUTH_PATH, "utf8"));
  } catch {
    return null;
  }
}
function writeNexusAuth(value) {
  fs.mkdirSync(NEXUS_AUTH_DIR, { recursive: true });
  fs.writeFileSync(NEXUS_AUTH_PATH, JSON.stringify(value, null, 2), { mode: 384 });
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
  const { apiKey } = firebaseConfig();
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
  const { apiKey } = firebaseConfig();
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
        fs.unlinkSync(NEXUS_AUTH_PATH);
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
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const m = env.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  } catch {
  }
  return null;
}
function envValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = env.match(new RegExp(`^\\s*${escaped}\\s*=\\s*(.+?)\\s*$`, "m"));
    if (m) return m[1].replace(/^['"]|['"]$/g, "");
  } catch {
  }
  return null;
}
function removeBgAllowedRoots() {
  const configured = envValue("REMOVE_BG_ALLOWED_ROOTS");
  return (configured ? configured.split(";") : [ROOT]).map((value) => path.resolve(value.trim())).filter(Boolean);
}
function isInsideAllowedRoot(target, roots) {
  return roots.some((root) => {
    const relative = path.relative(root, target);
    return relative === "" || !relative.startsWith("..") && !path.isAbsolute(relative);
  });
}
function composeSkillsFs(ids2, ctx = {}) {
  const parts = [];
  for (const id of ids2) {
    const file = path.join(SKILLS_DIR, ...id.split("/")) + ".md";
    let body;
    try {
      body = fs.readFileSync(file, "utf8").trim();
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
  } catch {
  }
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
    title: banner.title || banner.originalTitle || "\uC81C\uBAA9 \uC5C6\uC74C",
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
async function firestoreRequest(documentPath, params = {}) {
  const { projectId, apiKey } = firebaseConfig();
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
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function fileToInlineData(p) {
  const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
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
function detectBgColor(d, W2, H) {
  const px = (x, y) => {
    const i = (y * W2 + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const corners = [px(2, 2), px(W2 - 3, 2), px(2, H - 3), px(W2 - 3, H - 3)];
  corners.sort((a, b) => a[0] * 65536 + a[1] * 256 + a[2] - (b[0] * 65536 + b[1] * 256 + b[2]));
  return corners[1];
}
var clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
var brief = (arr, extra = []) => arr.map((o) => {
  const out = { id: o.id ?? o.key, label: o.label ?? o.ko ?? "" };
  for (const k of extra) if (o[k] != null) out[k] = o[k];
  return out;
});
var OPTION_CATALOG = () => ({
  frameforge: {
    assetType: brief(FRAMEFORGE_ASSET_TYPES),
    silhouette: FRAMEFORGE_SILHOUETTES.map((o) => ({ id: o.key, label: o.ko, for: o.for })),
    mood: brief(FRAMEFORGE_MOODS),
    renderStyle: brief(FRAMEFORGE_RENDER_STYLES)
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
   \xB7 nexus_frameforge_prompt     \u2014 FrameForge \uD504\uB808\uC784\xB7\uBC84\uD2BC\xB7\uBC15\uC2A4\xB7\uBC30\uC9C0\xB7\uB514\uBC14\uC774\uB354\xB7\uC544\uC774\uCF58 \uC0DD\uC131
   \xB7 nexus_lightfx_prompt        \u2014 \uAD11\uC6D0/\uBE5B\uD6A8\uACFC \uC5D0\uC14B (\uC21C\uD751/\uB2E8\uC0C9 \uBC30\uACBD, \uD569\uC131\uC6A9)
   \xB7 nexus_variation_prompt      \u2014 UI \uC5D0\uC14B \uB9AC\uC2A4\uD0A8(\uCEEC\uB7EC\xB7\uC7AC\uC9C8 \uC624\uBC84\uB808\uC774 \uD328\uC2A4, \uAD6C\uC870 \uBCF4\uC874)
   \xB7 nexus_design_alternative_prompt \u2014 \uB514\uC790\uC778 \uB300\uC548(\uBAA8\uD2F0\uD504\xB7\uC7AC\uC9C8 \uC7AC\uD574\uC11D, \uACE8\uACA9 \uC720\uC9C0)
   \xB7 nexus_item_bundle_prompt    \u2014 \uC544\uC774\uD15C \uC5EC\uB7EC \uAC1C \u2192 \uAFB8\uB7EC\uBBF8 \uD569\uC131 (\uC6D0\uBCF8 \uC808\uB300 \uBCF4\uC874)
   \xB7 nexus_quality_up_prompt     \u2014 KV \uBC30\uACBD \uD488\uC9C8 \uD5A5\uC0C1 (\uCE90\uB9AD\uD130\xB7\uD0C0\uC774\uD2C0 \uD615\uD0DC \uBCF4\uC874)
   \xB7 nexus_character_fx_prompt   \u2014 \uCE90\uB9AD\uD130\uC5D0 \uBE5B\xB7\uD30C\uD2F0\uD074 \uC5F0\uCD9C (\uD615\uD0DC 99%\xB7\uC5BC\uAD74 99.9% \uBCF4\uC874)
   \xB7 nexus_typecore_sovereign_prompt \u2014 Typecore Sovereign RPG/\uAC8C\uC784 \uD0C0\uC774\uD2C0 \uD504\uB86C\uD504\uD2B8
   \xB7 nexus_typecore_breeze_prompt    \u2014 Typecore Breeze \uCE90\uC8FC\uC5BC/\uCE98\uB9AC \uD0C0\uC774\uD2C0 \uD504\uB86C\uD504\uD2B8
3) nexus_render_image \uB85C Gemini \uC774\uBBF8\uC9C0 \uBAA8\uB378 \uD638\uCD9C (\uCC38\uC870 \uC774\uBBF8\uC9C0 \uD30C\uC77C \uCCA8\uBD80 \uAC00\uB2A5)
4) \uD6C4\uCC98\uB9AC \uD53D\uC140 \uD234:
   \xB7 nexus_remove_background     \u2014 \uB2E8\uC0C9 \uBC30\uACBD(\uBE14\uB799/\uD06C\uB85C\uB9C8) \uD0A4\uC789 \u2192 \uD22C\uBA85 PNG
   \xB7 nexus_split_character_effect \u2014 \uCE90\uB9AD\uD130/\uBC1C\uAD11 \uC774\uD399\uD2B8 \uBD84\uB9AC (\uC2A4\uD06C\uB9B0 \uBE14\uB80C\uB4DC \uB808\uC774\uC5B4)
   \xB7 nexus_remove_ai             \u2014 \uC704 \uB85C\uCEEC \uBC29\uC2DD\uC758 QA\uAC00 \uC2E4\uD328\uD55C \uACBD\uC6B0\uC5D0\uB9CC \uC0AC\uC6A9\uD558\uB294 Remove.bg AI \uCD5C\uC885 fallback
   \uD22C\uBA85\uD654 \uC6B0\uC120\uC21C\uC704: \uC0C9\uC0C1 \uD0A4\uC789/\uC774\uD399\uD2B8 \uC54C\uD30C/\uCE90\uB9AD\uD130 \uBD84\uB9AC \uAC19\uC740 \uB85C\uCEEC\xB7\uACB0\uC815\uC801 \uBC29\uC2DD \u2192 \uC54C\uD30C\xB7\uAC00\uC7A5\uC790\uB9AC\xB7\uB2EB\uD78C \uACF5\uAC04 QA \u2192 \uC2E4\uD328 \uC2DC\uC5D0\uB9CC nexus_remove_ai.
5) nexus_design_rubric \u2014 \uACB0\uACFC\uBB3C \uD3C9\uAC00\uC6A9 \uB514\uC790\uC778 \uB8E8\uBE0C\uB9AD
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
  description: "Nexus FrameForge \uC571\uC758 \uC2E4\uC81C \uC635\uC158\uACFC buildCompletePrompt \uC5D4\uC9C4\uC73C\uB85C \uD504\uB808\uC784\xB7\uBC84\uD2BC\xB7\uBC15\uC2A4\xB7\uBC30\uC9C0\xB7\uB514\uBC14\uC774\uB354\xB7\uC544\uC774\uCF58 \uC0DD\uC131 \uD504\uB86C\uD504\uD2B8\uB97C \uB9CC\uB4ED\uB2C8\uB2E4. \uACB0\uACFC\uB97C nexus_render_image\uC5D0 \uC804\uB2EC\uD558\uC138\uC694.",
  inputSchema: {
    assetType: z.enum(FRAMEFORGE_ASSET_TYPES.map((o) => o.key)).describe("\uC6A9\uB3C4: button, box, frame, badge, divider, icon"),
    silhouette: z.enum(FRAMEFORGE_SILHOUETTES.map((o) => o.key)).describe("nexus_list_options\uC758 frameforge.silhouette id. \uC120\uD0DD\uD55C assetType\uACFC for\uAC00 \uC77C\uCE58\uD574\uC57C \uD568"),
    mood: z.enum(FRAMEFORGE_MOODS.map((o) => o.key)).default("dark_rpg").describe("\uBD84\uC704\uAE30 \uD504\uB9AC\uC14B"),
    renderStyle: z.enum(FRAMEFORGE_RENDER_STYLES.map((o) => o.key)).default("illustrated").describe("\uB80C\uB354 \uD45C\uD604 \uBC29\uC2DD"),
    userText: z.string().max(1e3).optional().describe("\uCD94\uAC00 \uC81C\uC791 \uC758\uB3C4. \uACB0\uACFC \uC5D0\uC14B \uB0B4\uBD80\uC5D0 \uC2E4\uC81C \uAE00\uC790\uB97C \uC0DD\uC131\uD558\uB77C\uB294 \uC758\uBBF8\uB85C \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC74C")
  },
  outputSchema: {
    prompt: z.string(),
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
  const renderHint = "\uCC38\uC870 \uC774\uBBF8\uC9C0 \uC5C6\uC74C \xB7 \uD504\uB86C\uD504\uD2B8\uC758 \uB2E8\uC0C9 \uACE0\uB300\uBE44 \uBC30\uACBD \uC720\uC9C0 \xB7 Pro 1K \uB610\uB294 Flash 1K \uCD08\uC548 \xB7 \uB80C\uB354 \uD6C4 nexus_remove_background\uB85C \uD22C\uBA85\uD654";
  return data({ prompt, renderHint, resolvedOptions, nextTool: "nexus_render_image" }, `${prompt}

[\uB80C\uB354 \uD78C\uD2B8] ${renderHint}`);
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
  const out = outputPath ? path.isAbsolute(outputPath) ? outputPath : path.join(ROOT, outputPath) : path.join(ensureOutDir(OUT_DIR), `render-${Date.now()}.png`);
  try {
    ensureOutDir(path.dirname(out));
    fs.writeFileSync(out, Buffer.from(imgPart.inlineData.data, "base64"));
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
  const input = path.resolve(a.imagePath);
  if (!isInsideAllowedRoot(input, allowedRoots)) return errText(`\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uC785\uB825 \uACBD\uB85C\uC785\uB2C8\uB2E4. REMOVE_BG_ALLOWED_ROOTS: ${allowedRoots.join("; ")}`);
  const out = a.outputPath ? path.resolve(a.outputPath) : path.join(ensureOutDir(OUT_DIR), `remove-ai-${Date.now()}.png`);
  if (!isInsideAllowedRoot(out, allowedRoots)) return errText(`\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uCD9C\uB825 \uACBD\uB85C\uC785\uB2C8\uB2E4. REMOVE_BG_ALLOWED_ROOTS: ${allowedRoots.join("; ")}`);
  let bytes;
  try {
    bytes = fs.readFileSync(input);
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
    ensureOutDir(path.dirname(out));
    fs.writeFileSync(out, Buffer.from(await response.arrayBuffer()));
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
  title: "\uBC30\uACBD \uC81C\uAC70 (\uD0A4\uC789)",
  description: "\uB2E8\uC0C9 \uBC30\uACBD(\uBE14\uB799/\uD06C\uB85C\uB9C8 \uADF8\uB9B0/\uD654\uC774\uD2B8/\uC784\uC758 \uC0C9) \uC774\uBBF8\uC9C0\uB97C \uC0C9\uAC70\uB9AC \uD0A4\uC789 + \uBC30\uACBD\uC0C9 \uC5ED\uC0B0(unmix)\uC73C\uB85C \uD22C\uBA85 PNG \uB85C \uBCC0\uD658. \uBC1C\uAD11 \uC774\uD399\uD2B8 \uCD94\uCD9C\uC5D0\uB3C4 \uC0AC\uC6A9 (bg=black).",
  inputSchema: {
    imagePath: z.string().describe("\uC785\uB825 \uC774\uBBF8\uC9C0 \uACBD\uB85C"),
    bg: z.string().default("auto").describe("\uBC30\uACBD\uC0C9 \u2014 auto(\uCF54\uB108 \uC790\uB3D9\uAC10\uC9C0) | black | white | chroma | #rrggbb"),
    threshold: z.number().min(0).max(255).default(10).describe("\uC774 \uC0C9\uAC70\uB9AC \uC774\uD558 = \uC644\uC804 \uD22C\uBA85"),
    feather: z.number().min(1).max(255).default(60).describe("threshold \uBD80\uD130 \uC774 \uBC94\uC704\uAE4C\uC9C0 \uC54C\uD30C \uB7A8\uD504"),
    outputPath: z.string().optional().describe("\uC800\uC7A5 \uACBD\uB85C(.png). \uC0DD\uB7B5 \uC2DC .tmp/mcp-out/ \uC544\uB798 \uC790\uB3D9")
  },
  outputSchema: {
    outputPath: z.string().describe("\uC800\uC7A5\uB41C \uD22C\uBA85 PNG \uC808\uB300\uACBD\uB85C"),
    bgColor: z.object({ r: z.number(), g: z.number(), b: z.number() }).describe("\uC81C\uAC70\uC5D0 \uC0AC\uC6A9\uB41C \uBC30\uACBD\uC0C9"),
    threshold: z.number(),
    feather: z.number()
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
  if (a.bg === "auto") bgRgb = detectBgColor(d, W2, H);
  else if (a.bg === "black") bgRgb = [0, 0, 0];
  else if (a.bg === "white") bgRgb = [255, 255, 255];
  else if (a.bg === "chroma") bgRgb = [0, 255, 0];
  else bgRgb = hexToRgb(a.bg);
  if (!bgRgb) return errText(`\uBC30\uACBD\uC0C9\uC744 \uD574\uC11D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${a.bg}`);
  const [br, bgC, bb] = bgRgb;
  const t0 = a.threshold, range = a.feather;
  for (let p = 0; p < W2 * H; p++) {
    const i = p * 4;
    const dist = Math.max(Math.abs(d[i] - br), Math.abs(d[i + 1] - bgC), Math.abs(d[i + 2] - bb));
    let alpha = dist <= t0 ? 0 : Math.min(1, (dist - t0) / range);
    if (alpha <= 0) {
      d[i + 3] = 0;
      continue;
    }
    if (alpha < 1) {
      const inv = 1 - alpha;
      d[i] = clamp255((d[i] - inv * br) / alpha);
      d[i + 1] = clamp255((d[i + 1] - inv * bgC) / alpha);
      d[i + 2] = clamp255((d[i + 2] - inv * bb) / alpha);
    }
    d[i + 3] = clamp255(alpha * (d[i + 3] / 255) * 255);
  }
  const out = a.outputPath ? path.isAbsolute(a.outputPath) ? a.outputPath : path.join(ROOT, a.outputPath) : path.join(ensureOutDir(OUT_DIR), `keyed-${Date.now()}.png`);
  try {
    ensureOutDir(path.dirname(out));
    await saveImageData(imageData, out);
  } catch (e) {
    return errText(`\uACB0\uACFC \uC800\uC7A5 \uC2E4\uD328: ${out} \u2014 \uCD9C\uB825 \uACBD\uB85C(outputPath)\uB97C \uD655\uC778\uD558\uC138\uC694. (${e.message})`);
  }
  return data(
    { outputPath: out, bgColor: { r: br, g: bgC, b: bb }, threshold: t0, feather: range },
    `\uC800\uC7A5 \uC644\uB8CC: ${out}
\uBC30\uACBD\uC0C9: rgb(${br},${bgC},${bb}) \xB7 threshold ${t0} \xB7 feather ${range}`
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
        r = clamp255((r - inv * br) / at);
        g = clamp255((g - inv * bgC) / at);
        b = clamp255((b - inv * bb) / at);
      }
      c[i] = r;
      c[i + 1] = g;
      c[i + 2] = b;
      c[i + 3] = clamp255(alpha * 255);
    }
    const keep = 1 - ramp;
    f[i] = clamp255(s[i] * keep);
    f[i + 1] = clamp255(s[i + 1] * keep);
    f[i + 2] = clamp255(s[i + 2] * keep);
    f[i + 3] = 255;
  }
  charCtx.putImageData(co, 0, 0);
  fxCtx.putImageData(fo, 0, 0);
  const dir = a.outputDir ? path.isAbsolute(a.outputDir) ? a.outputDir : path.join(ROOT, a.outputDir) : OUT_DIR;
  ensureOutDir(dir);
  const stamp = Date.now();
  const charPath = path.join(dir, `char-${stamp}.png`);
  const fxPath = path.join(dir, `fx-screen-${stamp}.png`);
  try {
    fs.writeFileSync(charPath, charCv.toBuffer("image/png"));
    fs.writeFileSync(fxPath, fxCv.toBuffer("image/png"));
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
  description: "NEXUS \uB514\uC790\uC778 \uD3C9\uAC00 \uB8E8\uBE0C\uB9AD(\uB9C8\uD06C\uB2E4\uC6B4) \uBC18\uD658 \u2014 \uC0DD\uC131 \uACB0\uACFC\uBB3C\uC744 \uD3C9\uAC00\xB7\uBE44\uAD50\uD560 \uB54C \uAE30\uC900\uC73C\uB85C \uC0AC\uC6A9.",
  inputSchema: {},
  outputSchema: { markdown: z.string().describe("\uB514\uC790\uC778 \uD3C9\uAC00 \uB8E8\uBE0C\uB9AD (\uB9C8\uD06C\uB2E4\uC6B4)") },
  annotations: PURE
}, async () => {
  let md;
  try {
    md = fs.readFileSync(RUBRIC_PATH, "utf8");
  } catch {
    return errText(`\uB8E8\uBE0C\uB9AD \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${RUBRIC_PATH}`);
  }
  return data({ markdown: md }, md);
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
    const { projectId } = firebaseConfig();
    const collectionPath = `artifacts/${encodeURIComponent(projectId)}/public/data/banners`;
    const payload = a.sort === "score" ? { documents: await firestoreCollectionAll(collectionPath), nextPageToken: null } : await firestoreRequest(collectionPath, {
      pageSize: a.pageSize,
      pageToken: a.pageToken,
      showMissing: false
    });
    const decoded = (payload.documents || []).map(decodeFirestoreDocument);
    const needle = String(a.query || "").trim().toLocaleLowerCase("ko-KR");
    const filtered = decoded.filter((banner) => {
      if (a.game && String(banner.game || "") !== a.game) return false;
      if (a.year != null && String(banner.year || "") !== String(a.year)) return false;
      if (a.minScore != null && Number(banner.score || 0) < a.minScore) return false;
      if (needle) {
        const haystack = [banner.title, banner.originalTitle, banner.character, banner.path, ...Array.isArray(banner.tags) ? banner.tags : []].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
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
    const { projectId } = firebaseConfig();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/banners/${encodeURIComponent(a.id)}`);
    const banner = decodeFirestoreDocument(payload);
    return data({ banner }, JSON.stringify(banner, null, 2));
  } catch (e) {
    return errText(`Banner Codex \uC0C1\uC138 \uC870\uD68C \uC2E4\uD328 (${a.id}): ${e.message}`);
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
    const { projectId } = firebaseConfig();
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
    const { projectId } = firebaseConfig();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/prompts/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument(payload);
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
        showMissing: false
      });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument);
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
    const { projectId } = firebaseConfig();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument(payload);
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
        showMissing: false
      });
      const decoded = (payload.documents || []).map(decodeFirestoreDocument);
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
    const { projectId } = firebaseConfig();
    const payload = await firestoreRequest(`artifacts/${encodeURIComponent(projectId)}/public/data/promotion-banners/${encodeURIComponent(a.id)}`);
    const raw = decodeFirestoreDocument(payload);
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
    fs.unlinkSync(NEXUS_AUTH_PATH);
  } catch {
  }
  const result = { disconnected: true };
  return data(result, JSON.stringify(result));
});
startNexusLinkBridge();
var transport = new StdioServerTransport();
await server.connect(transport);
console.error("[nexus-mcp] NEXUS Studio MCP server ready (stdio)");
