// 공중부양 아이템 — 순수 옵션/프롬프트 모듈.
// NexusPreview UI, skills-runtime, Node 테스트가 같은 계약을 공유한다.

export const FLOATING_OUTPUT_OPTIONS = [
  { key: "layered-transparent", ko: "투명 레이어 자동 합성", en: "render an integrated preservation master, derive aligned effect-only and item-only layers, remove both backgrounds, and export one transparent PNG" },
  { key: "integrated-preserve", ko: "통합 렌더+보존 보정", en: "render the supplied item(s) and effect together, harmonize low-resolution sources, then run an identity-preservation repair pass" },
  { key: "composite", ko: "아이템+효과 합성", en: "render the supplied item(s) together with the effect as one finished preview image" },
  { key: "effect-only", ko: "효과만 분리", en: "use the supplied item(s) only as position and silhouette references; output LIGHT AND ATMOSPHERE ONLY on pure black, with absolutely no item pixels, text, UI, scenery, floor, or frame" },
];

export const FLOATING_EFFECT_OPTIONS = [
  { key: "bubble", ko: "물방울", en: "translucent water/glass with restrained refraction, soft rim highlights and sparse droplets" },
  { key: "lightning", ko: "번개", en: "white-blue electric arcs with broken branches, ion sparks and sharp luminous cores" },
  { key: "gold", ko: "금빛", en: "premium warm-gold light dust, thin rays and elegant star glints" },
  { key: "vortex", ko: "회오리", en: "spiraling translucent energy ribbons and directional particles with clear rotational flow" },
  { key: "magic", ko: "마력", en: "violet-cyan arcane plasma with non-semantic geometric ticks; never letters, glyphs or readable runes" },
  { key: "aura", ko: "오라", en: "soft luminous energy with broad falloff, localized bloom and an open center" },
  { key: "flame", ko: "화염", en: "incandescent flame tongues, heat haze and rising embers" },
  { key: "frost", ko: "서리", en: "ice-blue crystalline fragments, cold vapor and prismatic sparkles" },
  { key: "wind", ko: "바람", en: "teal translucent air ribbons, wisps and sparse leaf-like motes" },
  { key: "shadow", ko: "그림자 연기", en: "restrained dark mist with a thin luminous rim and open negative space" },
];

export const FLOATING_FORM_OPTIONS = [
  { key: "sphere", ko: "구체", en: "a complete transparent sphere with readable front and rear curvature" },
  { key: "ring", ko: "완전한 원", en: "a clean circular ring" },
  { key: "broken-orbit", ko: "열린 궤도", en: "a partially open orbit ring with an intentional gap" },
  { key: "tilted-orbit", ko: "기울어진 궤도", en: "a perspective ellipse tilted in depth, clearly passing behind and in front of the item position" },
  { key: "vertical-helix", ko: "수직 나선", en: "a tall vertical helix wrapping the item position from bottom to top" },
  { key: "lift-vortex", ko: "상승 회오리", en: "an upward-tapering levitation vortex, denser below and lighter above" },
  { key: "side-arcs", ko: "측면 아크", en: "two asymmetric side arcs that leave the center open" },
];

export const FLOATING_LAYOUT_OPTIONS = [
  { key: "each", ko: "개별 오브", en: "give each item position its own effect with exactly one item reference per effect" },
  { key: "grouped", ko: "한 원에 모아서", en: "place all item positions inside one large shared effect" },
  { key: "arc", ko: "아치 배열", en: "arrange item positions along a shallow rising arc with balanced spacing" },
  { key: "diagonal", ko: "대각선 배열", en: "arrange item positions on a dynamic lower-left to upper-right diagonal" },
  { key: "orbit", ko: "궤도 배열", en: "arrange secondary item positions around one primary center position" },
];

export const FLOATING_GROUP_OPTIONS = [
  { key: "auto", ko: "자동 제안", en: "use the reviewed automatic group proposal" },
  { key: "all", ko: "모두 한 광원", en: "put every supplied item reference in one shared light-effect group" },
  { key: "each", ko: "아이템별 광원", en: "give every supplied item reference its own independent light-effect group" },
  { key: "custom", ko: "그룹 직접 지정", en: "follow the explicit per-item group assignments" },
  { key: "primary-satellites", ko: "중앙 핵심+위성", en: "give the selected primary item its own dominant center effect and give every secondary item an independent satellite effect" },
];

export const FLOATING_COLORS = [
  { key: "auto", ko: "자동", en: "" },
  { key: "gold", ko: "골드", en: "warm gold-amber" },
  { key: "cyan", ko: "시안", en: "cool cyan-blue" },
  { key: "purple", ko: "보라", en: "violet-magenta" },
  { key: "crimson", ko: "진홍", en: "crimson-red" },
  { key: "blue", ko: "블루", en: "deep sapphire blue" },
  { key: "green", ko: "에메랄드", en: "emerald green" },
  { key: "white", ko: "화이트", en: "radiant white-silver" },
  { key: "holo", ko: "홀로", en: "restrained prismatic holographic spectrum" },
];

export const FLOATING_INTENSITY_OPTIONS = [
  { key: "subtle", ko: "은은함", en: "subtle; preserve generous negative space and avoid bloom washout" },
  { key: "medium", ko: "보통", en: "medium; clear premium effect without competing with item identity" },
  { key: "dramatic", ko: "극적", en: "dramatic but controlled; stronger highlights while keeping the center readable" },
];

export const FLOATING_MOTION_OPTIONS = [
  { key: "clockwise", ko: "시계 방향", en: "clockwise orbital flow" },
  { key: "counter-clockwise", ko: "반시계 방향", en: "counter-clockwise orbital flow" },
  { key: "upward", ko: "상승", en: "upward lifting flow" },
  { key: "outward", ko: "외부 확산", en: "outward expanding flow" },
  { key: "inward", ko: "내부 수렴", en: "inward converging flow" },
];

export const FLOATING_DENSITY_OPTIONS = [
  { key: "sparse", ko: "적음", en: "sparse particles with deliberate rhythm" },
  { key: "medium", ko: "보통", en: "medium particle density" },
  { key: "dense", ko: "많음", en: "dense at focal accents only; do not fill the center" },
];

const byKey = (list, key, fallback = 0) => list.find((o) => o.key === key) || list[fallback];

export function resolveFloatingGroupPlan(itemCount, groupMode = "auto", groupAssignments = [], primaryIndex = 0) {
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
    rationale = n === 1
      ? "One supplied item requires one light-effect group."
      : "Image pixels alone do not reveal reward semantics; one shared group is only a proposal and must be reviewed.";
  }
  const map = new Map();
  assignments.forEach((group, index) => {
    if (!map.has(group)) map.set(group, []);
    map.get(group).push(index + 1);
  });
  const groups = [...map.entries()].map(([id, itemIndices]) => ({ id, itemIndices }));
  return { assignments, groups, confidence, requiresReview, rationale };
}

export function buildFloatingPrompt(options = {}) {
  const {
    effect = "bubble", form = "broken-orbit", layout = "each", color = "auto",
    intensity = "medium", motion = "clockwise", density = "medium",
    outputMode = "composite", opening = 25, frontCross = 10, itemCount = 0,
    groupMode = "auto", groupAssignments = [], primaryIndex = 0,
    bg = { en: "pure solid black #000000" }, intent = "",
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
  const outputRule = effectOnly
    ? "OUTPUT EFFECT ONLY: reproduce zero item pixels. The result must contain only light, atmosphere and particles on pure #000000. Keep all item interiors and identifying details absent."
    : integrated
      ? "OUTPUT INTEGRATED PRESERVATION MASTER: render the supplied items and effect together. Harmonize resolution, edge quality, local contrast, bloom response and scene lighting so low-resolution items belong in the same image. Preserve identity-critical imagery: exact item category, silhouette, dominant color regions, emblem/seal, border, count and arrangement of major parts. Do not invent, remove, substitute, mirror or redesign identifying details. Upscale and relight conservatively; never turn pixel cleanup into a new design."
      : "OUTPUT COMPOSITE PREVIEW: preserve every supplied item exactly; do not redraw, relight, recolor, rotate, mirror or alter its pixels.";
  const extra = String(intent || "").trim();
  return `Create a production-grade floating-item presentation for a game promotion.\n\n${outputRule}\n${countRule}\nLight grouping mode: ${G.en}. Exact group plan: ${groupLine || "none"}. Create exactly ${groupPlan.groups.length} light-effect group(s); items in the same group share one coherent light source, and different groups must remain visually separable.\nEffect family/material: ${E.en}.\nForm: ${F.en}. Opening/gap: ${gap}%.\nLayout: ${L.en}.\nIntensity: ${I.en}. Motion: ${M.en}. Particle density: ${D.en}.\n${colorLine}\nDepth: the coherent master effect must visibly pass behind the item position and may cross in front only as light/particles; front coverage must stay at or below ${cross}% of the visible item area. Keep the center readable and avoid a flat sticker-like ring.\nCanvas: preserve comfortable margins, identical origin and unclipped decay. Background: ${effectOnly ? "pure solid black #000000" : bg.en}. No scenery, floor, text, logo, UI, border, fake labels or new objects.\n${effectOnly ? "Do not create contact shadows or floor effects; those are separate downstream layers." : "Keep every item fully inside the frame and visually unobstructed."}${extra ? `\n\nAdditional direction (ignore if it conflicts with preservation rules):\n${extra}` : ""}`;
}

export function buildFloatingRepairPrompt(options = {}) {
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

export function buildFloatingSeparationPrompt(kind, options = {}) {
  const { itemCount = 0 } = options;
  const n = Math.max(0, Number(itemCount) || 0);
  const refs = `Reference 1 is the approved integrated master. References 2 through ${n + 1} are the untouched original items in exact order.`;
  if (kind === "effect") return `${refs}
Derive the BACKGROUND EFFECT LAYER only, on pure solid black #000000, at exactly the same canvas size and registration as reference 1. Remove every item pixel, item silhouette, shadow, text and UI. Reconstruct only light, orbit, mist and particles that belong behind the items. Do not put foreground crossings over item regions. Preserve the approved effect geometry, palette, intensity and decay. Return one flat image; no transparency or checkerboard.`;
  return `${refs}
Derive the ITEM LAYER only, on pure solid chroma green #00FF00, at exactly the same canvas size and registration as reference 1. Keep every rendered item's approved position, scale, orientation, harmonized lighting and identity-corrected appearance. Remove all orbit light, mist, particles, glow field, shadows, scenery, text and UI. The background must be uniform #00FF00 with no gradient or texture, and no green spill may be added to item interiors. Return one flat image; no transparency or checkerboard.`;
}
