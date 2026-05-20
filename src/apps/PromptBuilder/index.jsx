import { useEffect, useMemo, useState } from 'react';
import { useGlobal } from "../../context/GlobalContext";

/* ════════ Theme ════════ */
const T = {
  bg: "#0f1115", surface: "#1a1d23", card: "#16181d",
  border: "#272a31", borderHi: "#3a3e47",
  text: "#e3e3e3", textMuted: "#9aa0a8", textDim: "#5e636b",
  accent: "#A29BFE",
  critical: "#ef4444",
  essential: "#ffffff",
  editable: "#9aa0a8",
  optional: "#7e8590",
  advanced: "#8b5cf6",
};

/* ════════ Importance ════════ */
const IMPORTANCE = {
  critical:  { color: T.critical,  border: `1.5px solid ${T.critical}`, label: "핵심", icon: "🔒", editable: false },
  essential: { color: T.essential, border: `1.5px solid ${T.essential}`, label: "필수", icon: "",   editable: false },
  editable:  { color: T.editable,  border: `1px solid ${T.editable}`,    label: "편집가능", icon: "✏️", editable: true  },
  optional:  { color: T.optional,  border: `1px dashed ${T.optional}`,   label: "선택", icon: "",   editable: false },
  advanced:  { color: T.advanced,  border: `1px solid ${T.advanced}`,    label: "고급", icon: "",   editable: false },
};

/* ════════ Category definitions ════════ */
const CATEGORIES = [
  { id: "motion",     label: "모션",     emoji: "🎬" },
  { id: "rendering",  label: "렌더링",   emoji: "🎨" },
  { id: "typography", label: "타이포",   emoji: "✍️" },
  { id: "banner",     label: "배너",     emoji: "🖼️" },
  { id: "custom",     label: "커스텀",   emoji: "🎯" },
];

/* ════════ Card library ════════ */
const MOTION_CARDS = [
  { id: "core_intent",       title: "핵심 목적",       importance: "essential",
    summary: "전체 영상의 의도와 톤. 정적 히어로 아트워크에 절제된 모션을 더한다.", risk: "낮음",
    promptText: "A still hero artwork comes alive with subtle, controlled motion. Composition stays locked; only light, texture, and small auxiliary FX move. The piece reads as a high-end title card, not a video." },
  { id: "first_frame_lock",  title: "첫 프레임 고정",  importance: "critical",
    summary: "Frame 0이 소스 이미지와 동일해야 한다. 첫 프레임 재해석 금지.", risk: "높음 — 끄면 시작 프레임이 변형됨",
    promptText: "[LOCK] First Frame: Frame 0 must match the source image exactly — identical composition, identical silhouettes, identical color cast. No re-interpretation of layout in the first frame." },
  { id: "camera_lock",       title: "카메라 고정",     importance: "critical",
    summary: "카메라 움직임 제약. 체크된 항목은 금지된다.", risk: "높음 — 카메라 자유 허용 시 예측 불가",
    ui: "checkbox",
    checkboxes: [
      { key: "no_pan",      label: "패닝 금지",            default: true },
      { key: "no_zoom",     label: "줌 금지",              default: true },
      { key: "no_tilt",     label: "틸트 금지",            default: true },
      { key: "no_dolly",    label: "달리·푸시인 금지",     default: true },
      { key: "no_shake",    label: "핸드헬드 흔들림 금지", default: true },
      { key: "no_parallax", label: "패럴랙스 금지",        default: true },
      { key: "fixed_focal", label: "초점 거리 고정",       default: true },
    ],
    promptText: "[LOCK] Camera: fixed framing — no pan, no zoom, no tilt, no dolly, no handheld shake, no parallax, fixed focal length." },
  { id: "subject_lock",      title: "형태 보존",       importance: "critical",
    summary: "피사체 실루엣과 구조의 변형을 금지한다.", risk: "높음 — 실루엣이 변형될 수 있음",
    promptText: "[LOCK] Subject: subject silhouette, outline, and structural anatomy must remain frozen across all frames. Zero displacement, zero morphing of letters or primary shapes. Secondary motion of hair/cloth is disallowed unless explicitly enabled." },
  { id: "loop_timing",       title: "루프 타이밍",     importance: "essential",
    summary: "전체 길이와 Intro/Sustain/Outro 구간 분포.", risk: "보통 — 끄면 길이 기준이 사라짐",
    ui: "timeline",
    timeline: { duration: 4, intro: 20, sustain: 60, outro: 20, ease: "easeInOut", seamless: true },
    promptText: "Loop: 4s total, 20/60/20 intro·sustain·outro, easeInOut, seamless (frame N = frame 0)." },
  { id: "surface_fx",        title: "표면 효과",       importance: "editable",
    summary: "피사체 표면에 더해지는 광·재질 변화. 재질·강도·움직임을 조합한다.", risk: "낮음",
    ui: "options",
    options: [
      { key: "material", type: "select", label: "재질", choices: [
        { key: "gold",     label: "골드 메탈릭", en: "warm gold metallic" },
        { key: "chrome",   label: "크롬 실버",   en: "polished chrome silver" },
        { key: "bronze",   label: "브론즈",      en: "patinated bronze" },
        { key: "rosegold", label: "로즈골드",    en: "rose gold" },
        { key: "platinum", label: "플래티넘",    en: "cool platinum" },
      ], default: "gold" },
      { key: "intensity", type: "slider", label: "강도", min: 0.1, max: 1.0, step: 0.05, default: 0.4,
        hint: (v) => v < 0.34 ? "약" : v < 0.67 ? "중" : "강" },
      { key: "motion", type: "select", label: "움직임", choices: [
        { key: "subtle",   label: "미세한",   en: "subtle micro-shimmer breathing slowly" },
        { key: "moderate", label: "보통",     en: "moderate highlight sweep" },
        { key: "dramatic", label: "드라마틱", en: "dramatic light tracing dynamically" },
      ], default: "subtle" },
    ],
    optionsRender: (v, opts) => {
      const f = (k) => opts.find((o) => o.key === k)?.choices?.find((c) => c.key === v[k]);
      const m = f("material"), mo = f("motion");
      return {
        en: `Surface FX: ${m?.en} highlight, ${mo?.en} across the front face, intensity ${v.intensity}. Confined inside silhouette, maintaining razor-sharp readability.`,
        kr: `${m?.label} 재질에 ${mo?.label} 움직임, 강도 ${(+v.intensity).toFixed(2)}.`,
      };
    },
    promptText: "Surface FX: warm gold metallic highlight, subtle micro-shimmer breathing slowly across the front face, intensity 0.40. Confined inside silhouette, maintaining razor-sharp readability." },
  { id: "edge_fx",           title: "엣지 효과",       importance: "editable",
    summary: "외곽 라인에 더해지는 림라이트. 색상·두께·강도를 조합한다.", risk: "낮음",
    ui: "options",
    options: [
      { key: "color", type: "select", label: "림라이트 색상", choices: [
        { key: "white",  label: "화이트", en: "cool crystalline white" },
        { key: "gold",   label: "골드",   en: "warm gold" },
        { key: "blue",   label: "블루",   en: "electric blue" },
        { key: "purple", label: "퍼플",   en: "deep magenta-purple" },
        { key: "red",    label: "레드",   en: "fiery red-orange" },
      ], default: "gold" },
      { key: "thickness", type: "select", label: "두께", choices: [
        { key: "thin",   label: "얇게",   en: "thin (1px) line",   px: 4 },
        { key: "medium", label: "보통",   en: "medium (2px) line", px: 6 },
        { key: "thick",  label: "두껍게", en: "bold (4px) line",   px: 10 },
      ], default: "medium" },
      { key: "intensity", type: "slider", label: "강도", min: 0.1, max: 1.0, step: 0.05, default: 0.3,
        hint: (v) => v < 0.34 ? "약" : v < 0.67 ? "중" : "강" },
    ],
    optionsRender: (v, opts) => {
      const f = (k) => opts.find((o) => o.key === k)?.choices?.find((c) => c.key === v[k]);
      const c = f("color"), t = f("thickness");
      return {
        en: `Edge FX: ${c?.en} rim light on outline edges, ${t?.en}, intensity ${v.intensity}. Falloff terminates within ${t?.px ?? 4}px of the silhouette.`,
        kr: `${c?.label} 색상의 ${t?.label} 림라이트, 강도 ${(+v.intensity).toFixed(2)}.`,
      };
    },
    promptText: "Edge FX: warm gold rim light on outline edges, medium (2px) line, intensity 0.30. Falloff terminates within 6px of the silhouette." },
  { id: "ambient_fx",        title: "주변 효과",       importance: "optional",
    summary: "배경 공간의 파티클 분위기. 종류·밀도·범위를 조합한다.", risk: "낮음 — 끄면 배경이 완전히 정적",
    ui: "options",
    options: [
      { key: "particle", type: "select", label: "파티클 종류", choices: [
        { key: "gold_dust", label: "골드 더스트", en: "warm gold dust motes drifting upward" },
        { key: "fire",      label: "불꽃",        en: "floating embers and fire sparks" },
        { key: "ice",       label: "얼음 결정",   en: "frost crystals suspended in cold air" },
        { key: "magic",     label: "마법진",      en: "rotating magic circle glyphs glowing softly" },
        { key: "none",      label: "없음",        en: "none" },
      ], default: "gold_dust" },
      { key: "density", type: "select", label: "밀도", choices: [
        { key: "sparse", label: "희박", en: "sparse, low count" },
        { key: "medium", label: "보통", en: "moderate density" },
        { key: "dense",  label: "풍부", en: "dense and abundant" },
      ], default: "medium" },
      { key: "range", type: "select", label: "범위", choices: [
        { key: "very_close", label: "매우 가깝게", en: "very close to the subject, hugging the silhouette" },
        { key: "close",      label: "가깝게",      en: "near the subject within 30% of the canvas" },
        { key: "moderate",   label: "보통",        en: "moderate distance, filling background space" },
      ], default: "close" },
    ],
    optionsRender: (v, opts) => {
      const f = (k) => opts.find((o) => o.key === k)?.choices?.find((c) => c.key === v[k]);
      const p = f("particle"), d = f("density"), r = f("range");
      if (p?.key === "none") return { en: "Ambient FX: none.", kr: "주변 효과 없음." };
      return {
        en: `Ambient FX: ${p?.en}, ${d?.en}, positioned ${r?.en}.`,
        kr: `${p?.label}, ${d?.label} 밀도, ${r?.label} 범위에 배치.`,
      };
    },
    promptText: "Ambient FX: warm gold dust motes drifting upward, moderate density, positioned near the subject within 30% of the canvas." },
  { id: "fx_boundary",       title: "효과 경계",       importance: "critical",
    summary: "모든 FX는 피사체 실루엣 안에 머물러야 한다.", risk: "높음 — 끄면 효과가 배경으로 누출됨",
    promptText: "[LOCK] FX Boundary: all FX must stay strictly inside the subject silhouette. Zero bleed into the background. Zero spill onto adjacent letters. Glow falloff terminates within 4px of the edge." },
  { id: "negative_rules_motion", title: "금지 조건",   importance: "advanced", defaultCollapsed: true,
    summary: "모델이 절대 생성하면 안 되는 항목들.", risk: "낮음",
    promptText: "Negative: no morphing of letters, no camera movement, no parallax, no extra limbs, no background drift, no color shift on subject, no warping of geometry, no flicker, no dropped frames, no compression banding." },
  { id: "output_spec_motion", title: "출력 설정",      importance: "essential",
    summary: "해상도·프레임레이트·코덱 등 최종 출력 규격.", risk: "낮음",
    promptText: "Output: 1920x1080 @ 30fps, h264 / mp4, sRGB color space, 12 Mbps bitrate, looping seamlessly." },
];

const RENDER_CARDS = [
  { id: "source_lock", title: "소스 고정", importance: "critical",
    summary: "소스 이미지의 레이아웃·구도·컬러를 그대로 보존한다.", risk: "높음 — 끄면 레이아웃이 재해석됨",
    promptText: "[LOCK] Source: preserve source image layout, composition, and color exactly. No re-interpretation of letterforms, no shifting of elements, no global color regrade." },
  { id: "material_layer", title: "재질 레이어", importance: "editable",
    summary: "피사체에 입힐 재질감. 재질 종류와 표면 처리를 조합한다.", risk: "보통 — 강할수록 가독성 저하 위험",
    ui: "options",
    options: [
      { key: "material", type: "select", label: "재질", choices: [
        { key: "metal",    label: "메탈",     en: "polished metal with metallic reflectance" },
        { key: "stone",    label: "스톤",     en: "carved natural stone" },
        { key: "crystal",  label: "크리스탈", en: "translucent crystal with internal refraction" },
        { key: "wood",     label: "나무",     en: "natural wood with visible grain" },
        { key: "leather",  label: "가죽",     en: "tooled and dyed leather" },
        { key: "obsidian", label: "옵시디안", en: "polished volcanic obsidian" },
        { key: "ice",      label: "얼음",     en: "frosted ice with subsurface scattering" },
      ], default: "metal" },
      { key: "surface", type: "select", label: "표면", choices: [
        { key: "smooth",    label: "매끄러운", en: "smooth and even" },
        { key: "rough",     label: "거친",     en: "rough with visible texture" },
        { key: "weathered", label: "마모된",   en: "weathered with subtle wear patterns" },
        { key: "glossy",    label: "광택",     en: "glossy with strong specular highlights" },
      ], default: "smooth" },
    ],
    optionsRender: (v, opts) => {
      const f = (k) => opts.find((o) => o.key === k)?.choices?.find((c) => c.key === v[k]);
      const m = f("material"), s = f("surface");
      return {
        en: `Material: ${s?.en} ${m?.en}. Surface response matches the material's natural behavior.`,
        kr: `${m?.label} 재질을 ${s?.label} 표면으로 처리.`,
      };
    },
    promptText: "Material: smooth polished metal with metallic reflectance. Surface response matches the material's natural behavior." },
  { id: "lighting_layer", title: "조명 레이어", importance: "editable",
    summary: "조명 방향·색온도·강도 조합으로 분위기를 설정한다.", risk: "보통",
    ui: "options",
    options: [
      { key: "direction", type: "select", label: "조명 방향", choices: [
        { key: "front",    label: "정면",          en: "front-on flat lighting" },
        { key: "key45",    label: "45도",          en: "classic 45° key light from upper-left" },
        { key: "side",     label: "드라마틱 측면", en: "dramatic side raking light" },
      ], default: "key45" },
      { key: "temperature", type: "select", label: "색온도", choices: [
        { key: "cool",    label: "차가운", en: "cool 6500K" },
        { key: "neutral", label: "중립",   en: "neutral 5000K" },
        { key: "warm",    label: "따뜻한", en: "warm 3200K" },
      ], default: "neutral" },
      { key: "intensity", type: "slider", label: "강도", min: 0.1, max: 1.0, step: 0.05, default: 0.7,
        hint: (v) => v < 0.34 ? "약" : v < 0.67 ? "중" : "강" },
    ],
    optionsRender: (v, opts) => {
      const f = (k) => opts.find((o) => o.key === k)?.choices?.find((c) => c.key === v[k]);
      const d = f("direction"), t = f("temperature");
      return {
        en: `Lighting: ${d?.en}, ${t?.en} color temperature, intensity ${v.intensity}. Soft fill from opposite side at 30% to retain shadow detail.`,
        kr: `${d?.label} 방향, ${t?.label} 색온도, 강도 ${(+v.intensity).toFixed(2)}.`,
      };
    },
    promptText: "Lighting: classic 45° key light from upper-left, neutral 5000K color temperature, intensity 0.70. Soft fill from opposite side at 30% to retain shadow detail." },
  { id: "relief_fx", title: "부조 효과", importance: "editable",
    summary: "엠보스·디보스 깊이감과 베벨 강도.", risk: "보통",
    promptText: "Bas-relief: 4mm extrusion depth with 0.6mm chamfered bevel. Ambient occlusion in recessed valleys, subtle catchlight on raised ridges." },
  { id: "edge_treatment", title: "엣지 처리", importance: "editable",
    summary: "외곽선 챔퍼·라운드 정도.", risk: "낮음",
    promptText: "Edges: 1px chamfer on letter edges with micro-bevel highlight. Edges remain perfectly clean and crisp — no fraying, no soft blur, no aliasing." },
  { id: "surface_detail", title: "표면 디테일", importance: "optional",
    summary: "마이크로 텍스처 강도.", risk: "낮음",
    promptText: "Surface Detail: micro-scratches and brushed texture @ density 0.4, scale 0.5mm. Visible only on close inspection — does not break global silhouette." },
  { id: "background_rule", title: "배경 규칙", importance: "critical",
    summary: "배경은 절대 변형하지 않는다.", risk: "높음 — 배경 변형 시 합성 불가",
    promptText: "[LOCK] Background: must remain completely untouched. Zero blur, zero color shift, zero added objects. Preserve every background pixel from the source." },
  { id: "negative_rules_render", title: "금지 조건", importance: "advanced", defaultCollapsed: true,
    summary: "렌더링 단계에서 금지할 항목.", risk: "낮음",
    promptText: "Negative: no warping of geometry, no color shift on letters, no replacement of background, no additional text, no extra elements, no over-baked highlights, no banding." },
];

const TYPO_CARDS = [
  { id: "text_input", title: "텍스트 입력", importance: "essential",
    summary: "최종 타이포에 들어갈 실제 글자. 언어를 선택하면 자동으로 영문 프롬프트가 생성됩니다.",
    risk: "낮음",
    ui: "textinput",
    inputDefault: "DARK ELF",
    languageDefault: "english",
    promptText: 'Text content: English text reads "DARK ELF".' },
  { id: "silhouette_rule", title: "실루엣 규칙", importance: "critical",
    summary: "글자 실루엣의 가독성과 일관성을 보장한다.", risk: "높음 — 끄면 가독성 붕괴",
    promptText: "[LOCK] Silhouette: letter silhouettes must remain crisp and instantly readable at all sizes. No connecting ligatures between letters, no merged counters, no broken stems." },
  { id: "stroke_contrast", title: "획 대비", importance: "editable",
    summary: "타입의 스타일 계열과 획 굵기를 조합한다.", risk: "보통",
    ui: "options",
    options: [
      { key: "style", type: "select", label: "스타일", choices: [
        { key: "serif",       label: "세리프",     en: "traditional serif with bracketed terminals" },
        { key: "sans_serif",  label: "산세리프",   en: "geometric sans-serif" },
        { key: "slab",        label: "슬랩세리프", en: "slab serif with rectangular terminals" },
        { key: "calligraphy", label: "캘리그라피", en: "calligraphic with brush-modulated strokes" },
      ], default: "sans_serif" },
      { key: "weight", type: "select", label: "획 굵기", choices: [
        { key: "ultra_thin", label: "극세", en: "ultra-thin (weight 100)" },
        { key: "thin",       label: "세",   en: "thin (weight 300)" },
        { key: "regular",    label: "보통", en: "regular (weight 400)" },
        { key: "bold",       label: "굵",   en: "bold (weight 700)" },
        { key: "ultra_bold", label: "극굵", en: "ultra-bold (weight 900)" },
      ], default: "bold" },
    ],
    optionsRender: (v, opts) => {
      const f = (k) => opts.find((o) => o.key === k)?.choices?.find((c) => c.key === v[k]);
      const s = f("style"), w = f("weight");
      return {
        en: `Stroke: ${s?.en} construction, ${w?.en}. Stroke modulation matches the style's traditional axis.`,
        kr: `${s?.label} 스타일, ${w?.label} 굵기.`,
      };
    },
    promptText: "Stroke: geometric sans-serif construction, bold (weight 700). Stroke modulation matches the style's traditional axis." },
  { id: "material_style", title: "재질 스타일", importance: "editable",
    summary: "타입 표면 효과와 색상 방향을 조합한다.", risk: "보통",
    ui: "options",
    options: [
      { key: "effect", type: "select", label: "효과", choices: [
        { key: "flat2d",  label: "2D 평면", en: "flat 2D with no depth" },
        { key: "metal",   label: "메탈",    en: "metallic surface with specular reflections" },
        { key: "stone",   label: "스톤",    en: "stone-carved with chiseled depth" },
        { key: "crystal", label: "크리스탈", en: "crystalline with internal refraction" },
        { key: "fire",    label: "불꽃",    en: "flame-textured with ember glow" },
        { key: "ice",     label: "얼음",    en: "ice-crystallized with frost layer" },
      ], default: "metal" },
      { key: "color_dir", type: "select", label: "색상 방향", choices: [
        { key: "solid",    label: "단색",       en: "solid single tone" },
        { key: "gradient", label: "그라데이션", en: "smooth gradient" },
        { key: "multi",    label: "멀티컬러",   en: "multi-color palette" },
      ], default: "solid" },
    ],
    optionsRender: (v, opts) => {
      const f = (k) => opts.find((o) => o.key === k)?.choices?.find((c) => c.key === v[k]);
      const e = f("effect"), c = f("color_dir");
      return {
        en: `Material style: ${e?.en}, with ${c?.en} color treatment.`,
        kr: `${e?.label} 효과, ${c?.label} 컬러.`,
      };
    },
    promptText: "Material style: metallic surface with specular reflections, with solid single tone color treatment." },
  { id: "layout_rule", title: "레이아웃 규칙", importance: "essential",
    summary: "정렬·트래킹·줄간격.", risk: "보통",
    promptText: "Layout: center-aligned, single line, 60px tracking, baseline at exact vertical center. No optical kerning adjustments beyond ±5px." },
  { id: "output_constraint", title: "출력 제약", importance: "essential",
    summary: "해상도·배경·포맷.", risk: "낮음",
    promptText: "Output: 2400x1200, transparent background, PNG with alpha channel, sRGB, 300dpi equivalent." },
  { id: "negative_rules_typo", title: "금지 조건", importance: "advanced", defaultCollapsed: true,
    summary: "타이포 단계에서 금지할 항목.", risk: "낮음",
    promptText: "Negative: no ligatures, no italics, no decorative serifs, no extra glyphs, no drop shadows, no outlines, no 3D extrusion unless explicitly enabled." },
];

const BANNER_CARDS = [
  { id: "composition", title: "구도 설정", importance: "essential",
    summary: "캔버스 비율과 주요 요소의 배치.", risk: "낮음",
    promptText: "Composition: 16:9 horizontal banner, hero element centered with 8% safe-area on all sides. Visual weight balanced left-to-right." },
  { id: "banner_typography", title: "타이포그래피", importance: "editable",
    summary: "헤드라인·서브헤드의 폰트 스타일.", risk: "보통",
    promptText: "Typography: headline in bold sans-serif (Pretendard ExtraBold 72px), subhead in medium (24px). Korean uses Pretendard, English uses Inter." },
  { id: "color_palette", title: "컬러 팔레트", importance: "editable",
    summary: "브랜드 컬러와 강조색 구성.", risk: "보통",
    promptText: "Color palette: primary brand red #E84393, accent gold #C8A969, neutral charcoal #1A1D23, off-white #F5F5F0. No off-brand colors." },
  { id: "brand_rule", title: "브랜드 규칙", importance: "essential",
    summary: "로고·상표 위치와 안전 영역.", risk: "보통 — 위반 시 브랜드 가이드 어긋남",
    promptText: "Brand: logo placed bottom-right corner, 80px height, full opacity, 40px clearance from edges. Trademark mark placed inline with logo. No filters on logo." },
  { id: "output_banner", title: "출력 설정", importance: "essential",
    summary: "최종 배너 해상도와 포맷.", risk: "낮음",
    promptText: "Output: 1920x1080 PNG, sRGB color space, 8-bit, no compression artifacts, embedded color profile." },
  { id: "negative_rules_banner", title: "금지 조건", importance: "advanced", defaultCollapsed: true,
    summary: "배너 단계에서 금지할 항목.", risk: "낮음",
    promptText: "Negative: no off-brand colors, no decorative fonts, no stock photo elements, no AI-generated faces, no copyrighted imagery, no extreme drop shadows." },
];

const CARD_LIBRARY = {
  motion: MOTION_CARDS,
  rendering: RENDER_CARDS,
  typography: TYPO_CARDS,
  banner: BANNER_CARDS,
  custom: [],
};

/* Templates importable from Custom tab. 시네마틱 줌 demonstrates conflictsWith with camera_lock. */
const CUSTOM_TEMPLATES = [
  { id: "tpl_cinematic_zoom", title: "시네마틱 줌", importance: "editable",
    summary: "느린 줌인으로 영화적 긴장감을 부여한다.", risk: "보통 — 카메라 고정 카드와 상충됨",
    promptText: "Cinematic Zoom: slow 8% push-in over loop duration, gentle easeInOut. Adds cinematic build-up to the hero element.",
    conflictsWith: ["camera_lock"] },
  { id: "tpl_chromatic_aberration", title: "색수차 효과", importance: "optional",
    summary: "RGB 채널 분리로 빈티지 렌즈 느낌.", risk: "낮음",
    promptText: "Chromatic Aberration: 1.5px RGB channel shift on letter edges, increasing toward corners. Subtle vintage lens character.",
    conflictsWith: [] },
  { id: "tpl_film_grain", title: "필름 그레인", importance: "optional",
    summary: "정밀한 필름 노이즈 입자.", risk: "낮음",
    promptText: "Film Grain: fine 35mm-style grain @ intensity 0.15, animated noise (different each frame), monochromatic for stability.",
    conflictsWith: [] },
];

/* ════════ Built-in presets ════════ */
const BUILTIN_PRESETS = [
  { name: "타이포 루프 기본", category: "typography",
    description: "핵심+필수 카드만 활성. 가장 안정적인 베이스라인.",
    apply: ({ cards, defs }) => ({
      cards: cards.map((c) => {
        const imp = (defs.find((d) => d.id === c.id) || {}).importance;
        return { ...c, enabled: imp === "critical" || imp === "essential" };
      }),
    }) },
  { name: "골드 브리딩", category: "motion",
    description: "표면·엣지·주변 FX를 골드 톤으로 조합.",
    apply: ({ cards }) => {
      const overrides = {
        surface_fx: "Surface FX: warm gold light shimmer breathing across the surface, intensity 0.55. Highlights bloom and fade in 3s cycle, confined inside silhouette.",
        edge_fx:    "Edge FX: soft amber glow pulsing on outline edges, intensity 0.45, breathing in sync with surface shimmer. Falloff within 6px.",
        ambient_fx: "Ambient FX: faint warm gold particles drifting upward, intensity 0.3, slight depth-of-field bokeh.",
      };
      return { cards: cards.map((c) => overrides[c.id] ? { ...c, enabled: true, promptText: overrides[c.id] } : c) };
    } },
  { name: "프로즌 베인", category: "motion",
    description: "차가운 크리스탈 굴절 + 정적 인텐시티.",
    apply: ({ cards }) => {
      const overrides = {
        surface_fx: "Surface FX: internal prismatic light refraction (crystal), intensity 0.6. Frozen solid silhouette, light shifts inside the volume.",
        edge_fx:    "Edge FX: cold cyan rim light, intensity 0.35, sharp and brittle. Falloff within 3px.",
        ambient_fx: "Ambient FX: faint frost particles suspended in air, intensity 0.2, near-zero motion.",
      };
      return { cards: cards.map((c) => overrides[c.id] ? { ...c, enabled: true, promptText: overrides[c.id] } : c) };
    } },
];

/* ════════ Persistence ════════ */
const STORAGE_PRESETS = "prompt-builder:user-presets";
const STORAGE_STATE   = "prompt-builder:state";
const loadJSON = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? fb; } catch { return fb; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ════════ State builders ════════ */
const buildCategoryState = (catId) => {
  const defs = CARD_LIBRARY[catId] || [];
  return defs.map((d) => ({
    id: d.id,
    enabled: true,
    promptText: d.promptText,
    checkboxes:   d.ui === "checkbox"  ? Object.fromEntries(d.checkboxes.map((cb) => [cb.key, cb.default])) : null,
    timeline:     d.ui === "timeline"  ? { ...d.timeline } : null,
    inputText:    d.ui === "textinput" ? d.inputDefault    : null,
    language:     d.ui === "textinput" ? d.languageDefault : null,
    mode:         d.ui === "options"   ? "basic" : null,
    optionValues: d.ui === "options"   ? Object.fromEntries(d.options.map((o) => [o.key, o.default])) : null,
  }));
};
const buildInitialState = () => ({
  motion:     buildCategoryState("motion"),
  rendering:  buildCategoryState("rendering"),
  typography: buildCategoryState("typography"),
  banner:     buildCategoryState("banner"),
  custom:     [],
});

/* ════════ Primitives ════════ */
const btn = (bg, fg = T.text, border = bg) => ({
  background: bg, color: fg, border: `1px solid ${border}`, borderRadius: 6,
  padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "filter 0.12s",
});
const lbl = { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textMuted, marginBottom: 6 };
const inp = { width: "100%", background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, outline: "none", fontFamily: "inherit" };
const ta  = { ...inp, resize: "vertical", lineHeight: 1.55 };

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{ width: 30, height: 16, borderRadius: 999, background: on ? T.accent : T.border, border: 0, cursor: "pointer", position: "relative", flexShrink: 0 }}
      title={on ? "끄기" : "켜기"}
    >
      <span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 12, height: 12, borderRadius: "50%", background: "#0f1115", transition: "left 0.12s" }} />
    </button>
  );
}

function Badge({ importance, size = "sm" }) {
  const m = IMPORTANCE[importance];
  const fs = size === "lg" ? 11 : 9;
  return (
    <span style={{ fontSize: fs, fontWeight: 700, letterSpacing: "0.08em", color: m.color, padding: "2px 6px", border: `1px solid ${m.color}55`, borderRadius: 3, background: `${m.color}11`, whiteSpace: "nowrap" }}>
      {m.icon} {m.label}
    </span>
  );
}

function WarnModal({ title, message, onConfirm, onCancel, confirmLabel = "끄기", danger }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: T.surface, border: `1.5px solid ${danger ? T.critical : T.border}`, borderRadius: 12, padding: 24, color: T.text }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: danger ? T.critical : T.accent, marginBottom: 8 }}>⚠ 확인 필요</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6, marginBottom: 20 }}>{message}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btn(T.border)}>취소</button>
          <button onClick={onConfirm} style={btn(danger ? T.critical : T.accent, "#fff", danger ? T.critical : T.accent)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ════════ Editors ════════ */
function CheckboxEditor({ defs, values, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", padding: "14px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
      {defs.map((cb) => (
        <label key={cb.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: T.text }}>
          <input type="checkbox" checked={!!values[cb.key]} onChange={(e) => onChange(cb.key, e.target.checked)} style={{ accentColor: T.accent }} />
          {cb.label}
        </label>
      ))}
    </div>
  );
}

function TimelineEditor({ values, onChange }) {
  const sum = (values.intro || 0) + (values.sustain || 0) + (values.outro || 0);
  const pct = (n) => sum > 0 ? (n / sum) * 100 : 0;
  return (
    <div style={{ padding: "14px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>전체 길이 ({values.duration}초)</label>
        <input type="range" min={1} max={12} step={0.5} value={values.duration} onChange={(e) => onChange("duration", parseFloat(e.target.value))} style={{ width: "100%" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>구간 분포</label>
        <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
          <div style={{ width: `${pct(values.intro)}%`,   background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>Intro {Math.round(pct(values.intro))}%</div>
          <div style={{ width: `${pct(values.sustain)}%`, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>Sustain {Math.round(pct(values.sustain))}%</div>
          <div style={{ width: `${pct(values.outro)}%`,   background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#000", fontWeight: 700 }}>Outro {Math.round(pct(values.outro))}%</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {["intro", "sustain", "outro"].map((k) => (
          <div key={k}>
            <label style={lbl}>{k} ({values[k]}%)</label>
            <input type="range" min={0} max={100} step={5} value={values[k]} onChange={(e) => onChange(k, parseInt(e.target.value, 10))} style={{ width: "100%" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={lbl}>Ease</label>
          <select value={values.ease} onChange={(e) => onChange("ease", e.target.value)} style={inp}>
            <option value="linear">linear</option>
            <option value="easeIn">easeIn</option>
            <option value="easeOut">easeOut</option>
            <option value="easeInOut">easeInOut</option>
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, paddingTop: 22 }}>
          <input type="checkbox" checked={values.seamless} onChange={(e) => onChange("seamless", e.target.checked)} style={{ accentColor: T.accent }} />
          이음매 없는 루프
        </label>
      </div>
    </div>
  );
}

function TextInputEditor({ values, onChange }) {
  const txt = values.inputText ?? "";
  const lang = values.language ?? "english";
  const len = [...txt].length; // Unicode-aware count
  let guide, guideColor;
  if (len === 0)       { guide = "글자를 입력해주세요.";              guideColor = T.textDim; }
  else if (len <= 12)  { guide = "권장 범위 — 짧고 임팩트 있음.";        guideColor = "#10b981"; }
  else if (len <= 20)  { guide = "여전히 가독성 좋음.";                  guideColor = T.editable; }
  else if (len <= 32)  { guide = "좀 김 — 좁은 트래킹 필요.";            guideColor = "#f59e0b"; }
  else                 { guide = "너무 김 — 한 줄 타이포에 부적합.";      guideColor = T.critical; }
  return (
    <div style={{ padding: "14px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>실제 입력 텍스트</label>
        <input
          type="text"
          value={txt}
          onChange={(e) => onChange("inputText", e.target.value)}
          placeholder="예: DARK ELF, 다크 엘프, NCSOFT"
          style={{ ...inp, fontSize: 14, padding: "10px 12px", fontWeight: 600, letterSpacing: "0.04em" }}
          maxLength={80}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
          <span style={{ color: guideColor }}>{guide}</span>
          <span style={{ color: T.textDim }}>{len} / 80자</span>
        </div>
      </div>

      <div>
        <label style={lbl}>언어</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[
            { key: "korean",  label: "한글",  desc: "한국어" },
            { key: "english", label: "영문",  desc: "English" },
            { key: "mixed",   label: "혼합",  desc: "Korean+English" },
          ].map((opt) => {
            const active = lang === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onChange("language", opt.key)}
                style={{
                  background: active ? T.accent : T.bg,
                  color: active ? "#0f1115" : T.text,
                  border: `1px solid ${active ? T.accent : T.border}`,
                  borderRadius: 6,
                  padding: "10px 8px",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div>{opt.label}</div>
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OptionsEditor({ options, values, summaryKr, onChange }) {
  return (
    <div style={{ padding: "14px 16px", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
      {options.map((opt) => {
        const cur = values[opt.key] ?? opt.default;
        if (opt.type === "select") {
          return (
            <div key={opt.key} style={{ marginBottom: 14 }}>
              <label style={lbl}>{opt.label}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {opt.choices.map((ch) => {
                  const active = cur === ch.key;
                  return (
                    <button
                      key={ch.key}
                      onClick={() => onChange(opt.key, ch.key)}
                      style={{
                        background: active ? T.accent : T.bg,
                        color: active ? "#0f1115" : T.text,
                        border: `1px solid ${active ? T.accent : T.border}`,
                        borderRadius: 6, padding: "6px 12px", fontSize: 12,
                        fontWeight: active ? 700 : 500, cursor: "pointer",
                      }}
                    >
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        if (opt.type === "slider") {
          return (
            <div key={opt.key} style={{ marginBottom: 14 }}>
              <label style={lbl}>
                {opt.label}
                <span style={{ color: T.textDim, marginLeft: 8, fontWeight: 500, textTransform: "none" }}>
                  {(+cur).toFixed(2)} {opt.hint ? `· ${opt.hint(cur)}` : ""}
                </span>
              </label>
              <input
                type="range"
                min={opt.min} max={opt.max} step={opt.step} value={cur}
                onChange={(e) => onChange(opt.key, parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: T.accent }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textDim, marginTop: 2 }}>
                <span>약</span><span>강</span>
              </div>
            </div>
          );
        }
        return null;
      })}
      {summaryKr && (
        <div style={{ marginTop: 4, padding: "10px 12px", background: T.bg, border: `1px dashed ${T.border}`, borderRadius: 6, fontSize: 12, color: T.text, lineHeight: 1.6 }}>
          <span style={{ color: T.textDim, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", marginRight: 8 }}>선택 요약</span>
          {summaryKr}
        </div>
      )}
    </div>
  );
}

/* ════════ Prompt assembly ════════ */
function renderCard(def, state) {
  if (def.ui === "checkbox") {
    const enLabels = def.checkboxes
      .filter((cb) => state.checkboxes?.[cb.key])
      .map((cb) => cb.key.replace(/_/g, " "))
      .join(", ");
    return enLabels ? `[LOCK] Camera: ${enLabels}.` : `[LOCK] Camera: no constraints (warning: camera is free).`;
  }
  if (def.ui === "timeline") {
    const v = state.timeline || def.timeline;
    return `Loop: ${v.duration}s total, ${v.intro}/${v.sustain}/${v.outro} intro·sustain·outro, ${v.ease}${v.seamless ? ", seamless" : ""}.`;
  }
  if (def.ui === "textinput") {
    const txt = (state.inputText ?? def.inputDefault ?? "").trim();
    const lang = state.language ?? def.languageDefault ?? "english";
    if (!txt) return "Text content: (empty — please enter the actual letters).";
    const langTag = lang === "korean" ? "Korean text" : lang === "mixed" ? "Mixed Korean and English text" : "English text";
    const caseHint = lang === "english" && txt === txt.toUpperCase() && /[A-Z]/.test(txt) ? " (uppercase)" : "";
    return `Text content: ${langTag} reads "${txt}"${caseHint}, single line, no punctuation.`;
  }
  if (def.ui === "options") {
    const mode = state.mode ?? "basic";
    if (mode === "advanced") return state.promptText ?? def.promptText;
    const values = state.optionValues ?? Object.fromEntries(def.options.map((o) => [o.key, o.default]));
    return def.optionsRender(values, def.options).en;
  }
  return state.promptText ?? def.promptText;
}

/* ════════ Custom card edit modal ════════ */
function CustomCardModal({ mode, card, allCards, onClose, onSave }) {
  const [draft, setDraft] = useState(card);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: "85vh", overflowY: "auto", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, color: T.text }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: T.accent, marginBottom: 6 }}>커스텀 카드 {mode === "create" ? "생성" : "편집"}</div>
        <h3 style={{ margin: "0 0 18px", fontSize: 18 }}>{draft.title || "(이름 없음)"}</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>카드 이름 (한글)</label>
          <input value={draft.title} onChange={(e) => set("title", e.target.value)} style={inp} placeholder="예: 시네마틱 줌" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>중요도</label>
          <select value={draft.importance} onChange={(e) => set("importance", e.target.value)} style={inp}>
            {Object.entries(IMPORTANCE).map(([k, m]) => <option key={k} value={k}>{m.label} {m.icon}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>요약 설명 (한글)</label>
          <textarea rows={2} value={draft.summary} onChange={(e) => set("summary", e.target.value)} style={ta} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>위험도 (한글)</label>
          <select value={draft.risk} onChange={(e) => set("risk", e.target.value)} style={inp}>
            <option value="낮음">낮음</option>
            <option value="보통">보통</option>
            <option value="높음">높음</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>promptText (영문)</label>
          <textarea rows={6} value={draft.promptText} onChange={(e) => set("promptText", e.target.value)} style={{ ...ta, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={lbl}>충돌 카드 id (선택, 쉼표 구분)</label>
          <input value={(draft.conflictsWith || []).join(", ")} onChange={(e) => set("conflictsWith", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} style={inp} placeholder="camera_lock, subject_lock" />
          <div style={{ fontSize: 10, color: T.textDim, marginTop: 4 }}>
            id 예시: {allCards.slice(0, 6).map((c) => c.id).join(", ")}…
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btn(T.border)}>취소</button>
          <button onClick={() => onSave(draft)} style={btn(T.accent, "#0f1115", T.accent)} disabled={!draft.title.trim()}>{mode === "create" ? "추가" : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

/* ════════ Template picker modal ════════ */
function TemplatePickerModal({ onClose, onPickTemplate, onPickFromCategory }) {
  const [tab, setTab] = useState("templates");
  const allByCat = { motion: MOTION_CARDS, rendering: RENDER_CARDS, typography: TYPO_CARDS, banner: BANNER_CARDS };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 640, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text }}>
        <div style={{ padding: 18, borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>📥 가져오기</h3>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setTab("templates")} style={{ ...btn(tab === "templates" ? T.accent : T.border, tab === "templates" ? "#0f1115" : T.text), padding: "6px 12px", fontSize: 11 }}>템플릿</button>
            <button onClick={() => setTab("other")} style={{ ...btn(tab === "other" ? T.accent : T.border, tab === "other" ? "#0f1115" : T.text), padding: "6px 12px", fontSize: 11 }}>다른 탭에서</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
          {tab === "templates" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CUSTOM_TEMPLATES.map((tpl) => (
                <div key={tpl.id} style={{ border: IMPORTANCE[tpl.importance].border, borderRadius: 8, padding: 14, background: T.card }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{tpl.title}</strong>
                      <Badge importance={tpl.importance} />
                    </div>
                    <button onClick={() => onPickTemplate(tpl)} style={{ ...btn(T.accent, "#0f1115", T.accent), padding: "4px 10px", fontSize: 11 }}>가져오기</button>
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>{tpl.summary}</div>
                  {tpl.conflictsWith?.length > 0 && (
                    <div style={{ fontSize: 11, color: T.critical }}>⚠ 충돌: {tpl.conflictsWith.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {tab === "other" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {Object.entries(allByCat).map(([catId, cards]) => {
                const catMeta = CATEGORIES.find((c) => c.id === catId);
                return (
                  <div key={catId}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: T.textMuted, marginBottom: 8 }}>{catMeta.emoji} {catMeta.label}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {cards.map((c) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 6, background: T.card }}>
                          <span style={{ fontSize: 12, display: "inline-flex", gap: 8, alignItems: "center" }}>{c.title} <Badge importance={c.importance} /></span>
                          <button onClick={() => onPickFromCategory(catId, c)} style={{ ...btn(T.border), padding: "4px 10px", fontSize: 11 }}>+</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, textAlign: "right" }}>
          <button onClick={onClose} style={btn(T.border)}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* ════════ Main ════════ */
export default function PromptBuilder() {
  const { setNotification, isLight } = useGlobal();
  // Phase 2.5 — 루트만 light 대응. 내부 위젯은 T 토큰(다크) 그대로.
  const rootBg   = isLight ? "#F7F7FA" : T.bg;
  const rootText = isLight ? "#1A1A24" : T.text;
  const [category, setCategory] = useState("motion");
  const [allCards, setAllCards] = useState(() => loadJSON(STORAGE_STATE, null) || buildInitialState());
  const [selectedByCat, setSelectedByCat] = useState({
    motion: MOTION_CARDS[0].id, rendering: RENDER_CARDS[0].id,
    typography: TYPO_CARDS[0].id, banner: BANNER_CARDS[0].id, custom: null,
  });
  const [collapsedDetail, setCollapsedDetail] = useState({});
  const [warn, setWarn] = useState(null);
  const [userPresets, setUserPresets] = useState(() => loadJSON(STORAGE_PRESETS, {}));
  const [presetName, setPresetName] = useState("");
  const [flash, setFlash] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [editingCustom, setEditingCustom] = useState(null);

  useEffect(() => { saveJSON(STORAGE_STATE, allCards); }, [allCards]);

  /* Defs / state for current category. Custom category builds defs from saved cards. */
  const defsForCat = (cat) => {
    if (cat === "custom") {
      return (allCards.custom || []).map((c) => ({
        id: c.id, title: c.title, importance: c.importance, summary: c.summary, risk: c.risk,
        promptText: c.promptText, conflictsWith: c.conflictsWith || [],
      }));
    }
    return CARD_LIBRARY[cat];
  };
  const currentDefs  = defsForCat(category);
  const currentState = category === "custom"
    ? (allCards.custom || []).map((c) => ({ id: c.id, enabled: c.enabled, promptText: c.promptText, checkboxes: null, timeline: null }))
    : (allCards[category] || []);

  const selectedId = selectedByCat[category];
  const selectedDef   = currentDefs.find((d) => d.id === selectedId);
  const selectedState = currentState.find((c) => c.id === selectedId);

  /* — derived: assembled prompt — */
  const promptFull = useMemo(() => (
    currentState.filter((s) => s.enabled).map((s) => {
      const def = currentDefs.find((d) => d.id === s.id);
      return def ? renderCard(def, s) : null;
    }).filter(Boolean).join("\n\n")
  ), [currentState, currentDefs]);

  const promptEssential = useMemo(() => (
    currentState.filter((s) => {
      if (!s.enabled) return false;
      const def = currentDefs.find((d) => d.id === s.id);
      return def && (def.importance === "critical" || def.importance === "essential");
    }).map((s) => {
      const def = currentDefs.find((d) => d.id === s.id);
      return renderCard(def, s);
    }).join("\n\n")
  ), [currentState, currentDefs]);

  /* — conflict detection — */
  const conflicts = useMemo(() => {
    const enabledIds = new Set(currentState.filter((s) => s.enabled).map((s) => s.id));
    const found = [];
    const seen = new Set();
    currentDefs.forEach((d) => {
      if (!enabledIds.has(d.id)) return;
      (d.conflictsWith || []).forEach((otherId) => {
        if (enabledIds.has(otherId)) {
          const key = [d.id, otherId].sort().join("|");
          if (seen.has(key)) return;
          seen.add(key);
          const other = currentDefs.find((x) => x.id === otherId);
          if (other) found.push({ a: d.title, b: other.title });
        }
      });
    });
    return found;
  }, [currentState, currentDefs]);

  /* — actions — */
  const updateCardInCat = (cat, cardId, patch) => {
    if (cat === "custom") {
      setAllCards((all) => ({ ...all, custom: all.custom.map((c) => c.id === cardId ? { ...c, ...patch } : c) }));
    } else {
      setAllCards((all) => ({ ...all, [cat]: all[cat].map((c) => c.id === cardId ? { ...c, ...patch } : c) }));
    }
  };

  const toggleCard = (id, next) => {
    const def = currentDefs.find((d) => d.id === id);
    if (!next && def?.importance === "critical") {
      setWarn({
        title: `${def.title}을(를) 끄시겠습니까?`,
        message: "이 카드는 결과물의 안정성을 보장하는 핵심 잠금 규칙입니다. 끄면 카메라 이동·실루엣 변형·경계 누출 등 예측 불가한 결과가 나올 수 있습니다.",
        confirmLabel: "그래도 끄기", danger: true,
        onConfirm: () => { updateCardInCat(category, id, { enabled: false }); setWarn(null); },
      });
      return;
    }
    updateCardInCat(category, id, { enabled: next });
  };

  const updatePromptText = (id, text) => updateCardInCat(category, id, { promptText: text });
  const updateCheckbox = (id, key, val) => {
    const cur = currentState.find((c) => c.id === id);
    updateCardInCat(category, id, { checkboxes: { ...cur.checkboxes, [key]: val } });
  };
  const updateTimeline = (id, key, val) => {
    const cur = currentState.find((c) => c.id === id);
    updateCardInCat(category, id, { timeline: { ...cur.timeline, [key]: val } });
  };
  const updateInput = (id, key, val) => updateCardInCat(category, id, { [key]: val });
  const updateOption = (id, key, val) => {
    const cur = currentState.find((c) => c.id === id);
    updateCardInCat(category, id, { optionValues: { ...(cur.optionValues || {}), [key]: val } });
  };
  const switchMode = (id, nextMode) => {
    const cur = currentState.find((c) => c.id === id);
    const def = currentDefs.find((d) => d.id === id);
    if (nextMode === "advanced") {
      const seeded = def.optionsRender(cur.optionValues || {}, def.options).en;
      updateCardInCat(category, id, { mode: "advanced", promptText: seeded });
    } else {
      updateCardInCat(category, id, { mode: "basic" });
    }
  };

  /* — copy / save / presets — */
  const showFlash = (m) => { setFlash(m); setTimeout(() => setFlash(""), 1500); };
  const doCopy = async (txt, label) => {
    try { await navigator.clipboard.writeText(txt); showFlash(`복사됨: ${label}`); } catch { showFlash("복사 실패"); }
  };
  const saveToArc = () => {
    setNotification?.(`Prompt Arche로 전송: ${category} (${currentState.filter((s) => s.enabled).length}개 카드)`);
    showFlash("아크에 저장됨");
  };

  const saveUserPreset = () => {
    const n = presetName.trim();
    if (!n) { showFlash("프리셋 이름을 입력하세요"); return; }
    const snap = { category, cards: JSON.parse(JSON.stringify(category === "custom" ? (allCards.custom || []) : currentState)) };
    const next = { ...userPresets, [n]: snap };
    setUserPresets(next); saveJSON(STORAGE_PRESETS, next); setPresetName("");
    showFlash(`프리셋 저장됨: ${n}`);
  };
  const loadUserPreset = (n) => {
    const p = userPresets[n]; if (!p) return;
    setCategory(p.category);
    setAllCards((all) => ({ ...all, [p.category]: p.cards }));
    showFlash(`불러옴: ${n}`);
  };
  const deleteUserPreset = (n) => {
    const next = { ...userPresets }; delete next[n];
    setUserPresets(next); saveJSON(STORAGE_PRESETS, next); showFlash(`삭제됨: ${n}`);
  };
  const applyBuiltin = (p) => {
    setCategory(p.category);
    setAllCards((all) => {
      const defs = CARD_LIBRARY[p.category];
      const next = p.apply({ cards: all[p.category], defs });
      return { ...all, [p.category]: next.cards };
    });
    showFlash(`프리셋 적용: ${p.name}`);
  };

  const resetCategory = () => {
    const catLabel = CATEGORIES.find((c) => c.id === category).label;
    if (!confirm(`${catLabel} 분야의 모든 카드를 기본값으로 되돌리시겠습니까?`)) return;
    if (category === "custom") setAllCards((all) => ({ ...all, custom: [] }));
    else setAllCards((all) => ({ ...all, [category]: buildCategoryState(category) }));
    showFlash("초기화됨");
  };

  /* — custom card management — */
  const addCustomCard = (card) => {
    const id = `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newCard = { id, title: card.title, importance: card.importance, summary: card.summary, risk: card.risk, promptText: card.promptText, conflictsWith: card.conflictsWith || [], enabled: true };
    setAllCards((all) => ({ ...all, custom: [...(all.custom || []), newCard] }));
    setSelectedByCat((s) => ({ ...s, custom: id }));
    setCategory("custom");
    showFlash(`커스텀 카드 추가: ${card.title}`);
  };
  const editCustomCard = (id, patch) => {
    setAllCards((all) => ({ ...all, custom: all.custom.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  };
  const deleteCustomCard = (id) => {
    if (!confirm("이 커스텀 카드를 삭제하시겠습니까?")) return;
    setAllCards((all) => ({ ...all, custom: all.custom.filter((c) => c.id !== id) }));
    showFlash("커스텀 카드 삭제됨");
  };
  const importFromTemplate = (tpl) => {
    addCustomCard({ title: tpl.title, importance: tpl.importance, summary: tpl.summary, risk: tpl.risk, promptText: tpl.promptText, conflictsWith: tpl.conflictsWith });
    setShowTemplatePicker(false);
  };
  const importFromOtherCategory = (catId, cardDef) => {
    addCustomCard({ title: `${CATEGORIES.find((c) => c.id === catId).label} · ${cardDef.title}`, importance: cardDef.importance, summary: cardDef.summary, risk: cardDef.risk, promptText: cardDef.promptText });
    setShowTemplatePicker(false);
  };

  const isEditableText = (def) => {
    if (def.ui === "options") {
      const st = currentState.find((c) => c.id === def.id);
      return (st?.mode ?? "basic") === "advanced";
    }
    return IMPORTANCE[def.importance].editable || category === "custom";
  };

  /* — render — */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: rootBg, color: rootText, fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 11, color: T.textMuted }}>카드형 프롬프트 조립 시스템</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value="" onChange={(e) => { const p = BUILTIN_PRESETS.find((x) => x.name === e.target.value); if (p) applyBuiltin(p); }} style={{ ...inp, width: 160 }}>
            <option value="">기본 프리셋…</option>
            {BUILTIN_PRESETS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="내 프리셋 이름" style={{ ...inp, width: 140 }} />
          <button onClick={saveUserPreset} style={btn(T.border)}>저장</button>
          <select value="" onChange={(e) => e.target.value && loadUserPreset(e.target.value)} style={{ ...inp, width: 140 }}>
            <option value="">내 프리셋…</option>
            {Object.keys(userPresets).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={resetCategory} style={btn(T.border)} title="현재 분야 초기화">↺ 초기화</button>
        </div>
      </div>

      {/* 3-PANEL BODY */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr 420px", overflow: "hidden" }}>
        {/* ─── LEFT: tabs + cards ─── */}
        <aside style={{ borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", background: T.surface }}>
          {/* Category tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                style={{
                  background: category === c.id ? T.bg : "transparent",
                  border: 0, borderBottom: `2px solid ${category === c.id ? T.accent : "transparent"}`,
                  color: category === c.id ? "#fff" : T.textMuted,
                  padding: "10px 4px", fontSize: 11, fontWeight: 600, cursor: "pointer", lineHeight: 1.4,
                }}
                title={c.label}
              >
                <div style={{ fontSize: 16 }}>{c.emoji}</div>
                <div style={{ marginTop: 2 }}>{c.label}</div>
              </button>
            ))}
          </div>

          {/* Card list */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {category === "custom" && (
              <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={() => setEditingCustom({ mode: "create", card: { title: "", importance: "editable", summary: "", risk: "낮음", promptText: "", conflictsWith: [] } })} style={btn(T.accent, "#0f1115", T.accent)}>+ 빈 카드 추가</button>
                <button onClick={() => setShowTemplatePicker(true)} style={btn(T.border)}>📥 다른 탭에서 가져오기</button>
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>
              카드 ({currentState.filter((c) => c.enabled).length} / {currentDefs.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {currentDefs.length === 0 && (
                <div style={{ padding: 16, textAlign: "center", color: T.textDim, fontSize: 12, border: `1px dashed ${T.border}`, borderRadius: 8 }}>
                  아직 커스텀 카드가 없습니다.<br/>위 버튼으로 추가하세요.
                </div>
              )}
              {currentDefs.map((def, idx) => {
                const state = currentState.find((c) => c.id === def.id);
                if (!state) return null;
                const meta = IMPORTANCE[def.importance];
                const active = selectedId === def.id;
                return (
                  <div
                    key={def.id}
                    onClick={() => setSelectedByCat((s) => ({ ...s, [category]: def.id }))}
                    style={{
                      border: meta.border, borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                      background: active ? T.card : "transparent",
                      boxShadow: active ? `0 0 0 1px ${T.accent}66` : "none",
                      opacity: state.enabled ? 1 : 0.45, transition: "background 0.12s, opacity 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 10, color: T.textDim, fontWeight: 700, width: 18, flexShrink: 0 }}>{String(idx + 1).padStart(2, "0")}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{def.title}</span>
                        {def.importance === "critical" && <span style={{ fontSize: 11 }}>🔒</span>}
                      </div>
                      <Toggle on={state.enabled} onChange={(v) => toggleCard(def.id, v)} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                      <Badge importance={def.importance} />
                      {category === "custom" && (
                        <button onClick={(e) => { e.stopPropagation(); setEditingCustom({ mode: "edit", card: { ...def } }); }} style={{ background: "none", border: 0, color: T.textDim, cursor: "pointer", fontSize: 10, padding: 0 }}>편집</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ─── CENTER: editor ─── */}
        <main style={{ overflowY: "auto", padding: 24, background: T.bg }}>
          {conflicts.length > 0 && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: `${T.critical}11`, border: `1px solid ${T.critical}55`, borderRadius: 8, color: T.text }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.critical, letterSpacing: "0.1em", marginBottom: 6 }}>⚠ 카드 충돌 감지</div>
              {conflicts.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: T.text }}>「{c.a}」 카드와 「{c.b}」 카드가 충돌합니다.</div>
              ))}
            </div>
          )}

          {!selectedDef ? (
            <div style={{ color: T.textDim, fontSize: 13, textAlign: "center", padding: 60 }}>편집할 카드를 선택하세요.</div>
          ) : (
            <>
              {!selectedState?.enabled && (
                <div style={{ marginBottom: 16, padding: "8px 12px", background: `${T.textMuted}11`, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, color: T.textMuted }}>
                  이 카드는 비활성 상태입니다. 좌측 토글로 켜야 프롬프트에 포함됩니다.
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <h2 style={{ fontSize: 22, margin: 0, color: "#fff" }}>{selectedDef.title}</h2>
                <Badge importance={selectedDef.importance} size="lg" />
                {selectedDef.ui === "options" && (
                  <button
                    onClick={() => switchMode(selectedId, (selectedState.mode ?? "basic") === "basic" ? "advanced" : "basic")}
                    style={{ ...btn((selectedState.mode ?? "basic") === "advanced" ? T.accent : T.border, (selectedState.mode ?? "basic") === "advanced" ? "#0f1115" : T.text), padding: "4px 10px", fontSize: 11 }}
                    title={(selectedState.mode ?? "basic") === "basic" ? "텍스트에어리어 직접 편집" : "옵션 버튼 편집으로 복귀"}
                  >
                    {(selectedState.mode ?? "basic") === "basic" ? "📝 고급 편집" : "🛠 기본 모드로"}
                  </button>
                )}
                {selectedDef.defaultCollapsed && (
                  <button onClick={() => setCollapsedDetail((s) => ({ ...s, [selectedId]: !(s[selectedId] ?? true) }))} style={{ ...btn(T.border), padding: "4px 10px", fontSize: 11 }}>
                    {(collapsedDetail[selectedId] ?? selectedDef.defaultCollapsed) ? "▼ 펼치기" : "▲ 접기"}
                  </button>
                )}
                {category === "custom" && (
                  <button onClick={() => deleteCustomCard(selectedDef.id)} style={{ ...btn(T.border), padding: "4px 10px", fontSize: 11, color: T.critical, borderColor: `${T.critical}55` }}>삭제</button>
                )}
              </div>

              <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, margin: "0 0 6px" }}>{selectedDef.summary}</p>
              <p style={{ fontSize: 11, color: T.textDim, margin: "0 0 20px" }}>
                위험도: <span style={{ color: selectedDef.risk?.startsWith("높음") ? T.critical : selectedDef.risk?.startsWith("보통") ? "#f59e0b" : T.textMuted }}>{selectedDef.risk}</span>
              </p>

              {!(collapsedDetail[selectedId] ?? selectedDef.defaultCollapsed) && (
                <div>
                  {selectedDef.ui === "checkbox" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={lbl}>카메라 제약 (한글)</label>
                      <CheckboxEditor defs={selectedDef.checkboxes} values={selectedState.checkboxes || {}} onChange={(k, v) => updateCheckbox(selectedId, k, v)} />
                    </div>
                  )}
                  {selectedDef.ui === "timeline" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={lbl}>타이밍 (한글 UI)</label>
                      <TimelineEditor values={selectedState.timeline || selectedDef.timeline} onChange={(k, v) => updateTimeline(selectedId, k, v)} />
                    </div>
                  )}
                  {selectedDef.ui === "textinput" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={lbl}>텍스트 입력</label>
                      <TextInputEditor
                        values={{ inputText: selectedState.inputText ?? selectedDef.inputDefault, language: selectedState.language ?? selectedDef.languageDefault }}
                        onChange={(k, v) => updateInput(selectedId, k, v)}
                      />
                    </div>
                  )}
                  {selectedDef.ui === "options" && (selectedState.mode ?? "basic") === "basic" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={lbl}>옵션 선택 (기본 모드)</label>
                      <OptionsEditor
                        options={selectedDef.options}
                        values={selectedState.optionValues || {}}
                        summaryKr={selectedDef.optionsRender(selectedState.optionValues || Object.fromEntries(selectedDef.options.map((o) => [o.key, o.default])), selectedDef.options).kr}
                        onChange={(k, v) => updateOption(selectedId, k, v)}
                      />
                    </div>
                  )}

                  <div>
                    <label style={lbl}>
                      promptText (영문)
                      {isEditableText(selectedDef)
                        ? <span style={{ color: T.editable, marginLeft: 6, textTransform: "none", fontSize: 10 }}>편집 가능</span>
                        : <span style={{ color: T.textDim, marginLeft: 6, textTransform: "none", fontSize: 10 }}>🔒 읽기 전용 (Critical/Essential은 잠금)</span>}
                    </label>
                    <textarea
                      value={renderCard(selectedDef, selectedState)}
                      onChange={(e) => isEditableText(selectedDef) && updatePromptText(selectedId, e.target.value)}
                      readOnly={!isEditableText(selectedDef)}
                      rows={selectedDef.ui ? 4 : 8}
                      style={{
                        ...ta, fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                        background: isEditableText(selectedDef) ? T.bg : T.card,
                        cursor: isEditableText(selectedDef) ? "text" : "default",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Built-in presets quick row */}
              <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px dashed ${T.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>기본 프리셋</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {BUILTIN_PRESETS.map((p) => (
                    <button key={p.name} onClick={() => applyBuiltin(p)} title={p.description} style={{ ...btn(T.surface), padding: "6px 12px", fontSize: 11 }}>
                      {CATEGORIES.find((c) => c.id === p.category)?.emoji} {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* User presets chip strip */}
              {Object.keys(userPresets).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>내 프리셋</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.keys(userPresets).map((n) => (
                      <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, border: `1px solid ${T.border}`, fontSize: 11, background: T.surface }}>
                        <button onClick={() => loadUserPreset(n)} style={{ background: "none", border: 0, color: T.text, cursor: "pointer", padding: 0, fontSize: 11 }}>{n}</button>
                        <button onClick={() => deleteUserPreset(n)} style={{ background: "none", border: 0, color: T.textDim, cursor: "pointer", padding: 0, fontSize: 11 }} title="삭제">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* ─── RIGHT: preview ─── */}
        <aside style={{ borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", background: T.surface }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: T.textMuted, textTransform: "uppercase" }}>프롬프트 미리보기 (영문)</div>
              <div style={{ fontSize: 10, color: T.textDim }}>{promptFull.length.toLocaleString()} chars</div>
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
              {CATEGORIES.find((c) => c.id === category)?.emoji} {CATEGORIES.find((c) => c.id === category)?.label} · 활성 {currentState.filter((s) => s.enabled).length}개
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: T.text, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'JetBrains Mono', monospace" }}>
              {promptFull || <span style={{ color: T.textDim }}>활성화된 카드가 없습니다.</span>}
            </pre>
          </div>
          <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => doCopy(promptFull, "전체")} style={btn(T.accent, "#0f1115", T.accent)}>📋 전체 복사</button>
            <button onClick={() => doCopy(promptEssential, "핵심")} style={btn(T.border)}>핵심만 복사</button>
            <button onClick={saveToArc} style={btn(T.border)}>↪ 아크에 저장</button>
            <button onClick={saveUserPreset} style={btn(T.border)}>💾 프리셋 저장</button>
          </div>
        </aside>
      </div>

      {flash && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.accent, color: "#0f1115", padding: "10px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 998, boxShadow: "0 10px 40px rgba(162,155,254,0.3)" }}>
          ✓ {flash}
        </div>
      )}

      {warn && <WarnModal {...warn} onCancel={() => setWarn(null)} />}

      {editingCustom && (
        <CustomCardModal
          mode={editingCustom.mode}
          card={editingCustom.card}
          allCards={[...MOTION_CARDS, ...RENDER_CARDS, ...TYPO_CARDS, ...BANNER_CARDS]}
          onClose={() => setEditingCustom(null)}
          onSave={(patched) => {
            if (editingCustom.mode === "create") addCustomCard(patched);
            else editCustomCard(editingCustom.card.id, patched);
            setEditingCustom(null);
          }}
        />
      )}

      {showTemplatePicker && (
        <TemplatePickerModal
          onClose={() => setShowTemplatePicker(false)}
          onPickTemplate={importFromTemplate}
          onPickFromCategory={importFromOtherCategory}
        />
      )}
    </div>
  );
}
