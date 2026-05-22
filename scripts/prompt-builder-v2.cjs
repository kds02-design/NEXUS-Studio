#!/usr/bin/env node
"use strict";

// ─── Prompt Builder CLI v2.0.0 ────────────────────────────────────────────────
// v1 대비 변경점:
//   [FIX-1] renderCardMenu 라인 카운팅: cards.length → cards.length + 2 (안내 줄 포함)
//           critical 경고도 통합 렌더러로 처리해 다음 렌더 시 깨지지 않게 함.
//   [FIX-2] raw mode + readline 충돌 해결: 카드 선택 raw TUI 진입 전 rl.close(),
//           메뉴 종료 후 createRL() 로 새 인터페이스 생성 — rl.question 정상 동작.
//   [FIX-3] loop_timing intro+sustain+outro 합 검증 (100 ± 5 허용).
//   추가:    변수 섀도잉 정리(`c` 콜백 인자 → `card` 등),
//           클립보드 Linux 폴백(wl-copy → xclip → xsel),
//           Windows PowerShell Set-Clipboard (UTF-8 안전),
//           preset 덮어쓰기 확인,
//           메뉴 폭 wrapping 안전 대비(라인 길이 출력 후 정확한 줄수 캡쳐).

const readline = require("readline");
const fs       = require("fs");
const path     = require("path");
const os       = require("os");
const { execSync } = require("child_process");

// ─── 컬러 ─────────────────────────────────────────────────────────────────────
const C = {
  reset:   "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red:     "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue:    "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m", white: "\x1b[37m",
};
const color  = (k, t) => `${C[k]}${t}${C.reset}`;
const bold   = (t)    => `${C.bold}${t}${C.reset}`;
const dim    = (t)    => `${C.dim}${t}${C.reset}`;

// ─── 카드 데이터베이스 ────────────────────────────────────────────────────────
const CARDS = {
  motion: [
    {
      id: "core_intent", title: "핵심 목적", importance: "essential",
      summary: "전체 영상의 의도와 톤",
      fields: [],
      promptFn: () => "A still hero artwork comes alive with subtle, controlled motion. Composition stays locked; only light, texture, and small auxiliary FX move.",
    },
    {
      id: "first_frame_lock", title: "첫 프레임 고정", importance: "critical",
      summary: "Frame 0 = 소스 이미지와 동일",
      fields: [],
      promptFn: () => "[LOCK] First Frame: Frame 0 must match the source image exactly — identical composition, identical silhouettes, identical color cast.",
    },
    {
      id: "camera_lock", title: "카메라 고정", importance: "critical",
      summary: "카메라 움직임 제약",
      fields: [
        { key: "no_pan",      label: "패닝 금지",            type: "bool", default: true },
        { key: "no_zoom",     label: "줌 금지",              type: "bool", default: true },
        { key: "no_tilt",     label: "틸트 금지",            type: "bool", default: true },
        { key: "no_parallax", label: "패럴랙스 금지",        type: "bool", default: true },
        { key: "no_shake",    label: "핸드헬드 흔들림 금지", type: "bool", default: true },
      ],
      promptFn: (v) => {
        const locks = Object.entries(v).filter(([, on]) => on).map(([k]) => k.replace("no_", "")).join(", ");
        return `[LOCK] Camera: fixed framing — no ${locks || "camera constraints set"}, fixed focal length.`;
      },
    },
    {
      id: "loop_timing", title: "루프 타이밍", importance: "essential",
      summary: "전체 길이와 Intro/Sustain/Outro 비율",
      fields: [
        { key: "duration", label: "전체 길이 (초, 1-12)", type: "number", default: 4,  min: 1,  max: 12 },
        { key: "intro",    label: "Intro 비율 (%, 0-100)", type: "number", default: 20, min: 0, max: 100 },
        { key: "sustain",  label: "Sustain 비율 (%)",      type: "number", default: 60, min: 0, max: 100 },
        { key: "outro",    label: "Outro 비율 (%)",        type: "number", default: 20, min: 0, max: 100 },
        { key: "ease",     label: "Ease (linear/easeIn/easeOut/easeInOut)", type: "choice",
          choices: ["linear","easeIn","easeOut","easeInOut"], default: "easeInOut" },
        { key: "seamless", label: "이음매 없는 루프", type: "bool", default: true },
      ],
      // [FIX-3] intro/sustain/outro 합 검증 — 100 ± 5 허용
      validateFn: (v) => {
        const sum = (v.intro || 0) + (v.sustain || 0) + (v.outro || 0);
        if (Math.abs(sum - 100) > 5) return `Intro/Sustain/Outro 합이 ${sum}% 입니다. 100% 가 되도록 다시 입력하세요.`;
        return null;
      },
      promptFn: (v) =>
        `Loop: ${v.duration}s total, ${v.intro}/${v.sustain}/${v.outro} intro·sustain·outro, ${v.ease}${v.seamless ? ", seamless (frame N = frame 0)" : ""}.`,
    },
    {
      id: "surface_fx", title: "표면 효과", importance: "editable",
      summary: "피사체 표면 광·재질 변화",
      fields: [
        { key: "material", label: "재질 (gold/chrome/bronze/rosegold/platinum)", type: "choice",
          choices: ["gold","chrome","bronze","rosegold","platinum"], default: "gold",
          map: { gold:"warm gold metallic", chrome:"polished chrome silver", bronze:"patinated bronze",
                 rosegold:"rose gold", platinum:"cool platinum" } },
        { key: "intensity", label: "강도 (0.1-1.0)", type: "float", default: 0.4, min: 0.1, max: 1.0 },
        { key: "motion",    label: "움직임 (subtle/moderate/dramatic)", type: "choice",
          choices: ["subtle","moderate","dramatic"], default: "subtle",
          map: { subtle:"subtle micro-shimmer breathing slowly", moderate:"moderate highlight sweep",
                 dramatic:"dramatic light tracing dynamically" } },
      ],
      promptFn: (v, f) => {
        const mat = f.find(x => x.key === "material").map[v.material];
        const mot = f.find(x => x.key === "motion").map[v.motion];
        return `Surface FX: ${mat} highlight, ${mot} across the front face, intensity ${Number(v.intensity).toFixed(2)}. Confined inside silhouette, maintaining razor-sharp readability.`;
      },
    },
    {
      id: "edge_fx", title: "엣지 효과", importance: "editable",
      summary: "외곽 라인 림라이트",
      fields: [
        { key: "color",     label: "색상 (white/gold/blue/purple/red)", type: "choice",
          choices: ["white","gold","blue","purple","red"], default: "gold",
          map: { white:"cool crystalline white", gold:"warm gold", blue:"electric blue",
                 purple:"deep magenta-purple", red:"fiery red-orange" } },
        { key: "thickness", label: "두께 (thin/medium/thick)", type: "choice",
          choices: ["thin","medium","thick"], default: "medium",
          map: { thin:"thin (1px) line", medium:"medium (2px) line", thick:"bold (4px) line" },
          px:  { thin: 4, medium: 6, thick: 10 } },
        { key: "intensity", label: "강도 (0.1-1.0)", type: "float", default: 0.3, min: 0.1, max: 1.0 },
      ],
      promptFn: (v, f) => {
        const col = f.find(x => x.key === "color").map[v.color];
        const thk = f.find(x => x.key === "thickness");
        return `Edge FX: ${col} rim light on outline edges, ${thk.map[v.thickness]}, intensity ${Number(v.intensity).toFixed(2)}. Falloff terminates within ${thk.px[v.thickness]}px of the silhouette.`;
      },
    },
    {
      id: "ambient_fx", title: "주변 효과", importance: "optional",
      summary: "배경 공간의 파티클 분위기",
      fields: [
        { key: "particle", label: "파티클 (gold_dust/fire/ice/magic/none)", type: "choice",
          choices: ["gold_dust","fire","ice","magic","none"], default: "gold_dust",
          map: { gold_dust:"warm gold dust motes drifting upward", fire:"floating embers and fire sparks",
                 ice:"frost crystals suspended in cold air", magic:"rotating magic circle glyphs glowing softly",
                 none:"none" } },
        { key: "density",  label: "밀도 (sparse/medium/dense)", type: "choice",
          choices: ["sparse","medium","dense"], default: "medium",
          map: { sparse:"sparse, low count", medium:"moderate density", dense:"dense and abundant" } },
        { key: "range",    label: "범위 (very_close/close/moderate)", type: "choice",
          choices: ["very_close","close","moderate"], default: "close",
          map: { very_close:"very close to the subject, hugging the silhouette",
                 close:"near the subject within 30% of the canvas",
                 moderate:"moderate distance, filling background space" } },
      ],
      promptFn: (v, f) => {
        if (v.particle === "none") return "Ambient FX: none.";
        const p   = f.find(x => x.key === "particle").map[v.particle];
        const den = f.find(x => x.key === "density").map[v.density];
        const rng = f.find(x => x.key === "range").map[v.range];
        return `Ambient FX: ${p}, ${den}, positioned ${rng}.`;
      },
    },
    {
      id: "fx_boundary", title: "효과 경계", importance: "critical",
      summary: "모든 FX는 실루엣 안에 머물어야 함",
      fields: [],
      promptFn: () => "[LOCK] FX Boundary: all FX must stay strictly inside the subject silhouette. Zero bleed into the background. Glow falloff terminates within 4px of the edge.",
    },
    {
      id: "negative_motion", title: "금지 조건", importance: "advanced",
      summary: "모델이 생성하면 안 되는 항목들",
      fields: [
        { key: "extra", label: "추가 금지 항목 (쉼표 구분, 엔터 시 기본값 사용)", type: "text", default: "" },
      ],
      promptFn: (v) => {
        const base = "no morphing of letters, no camera movement, no parallax, no extra limbs, no background drift, no color shift on subject, no warping of geometry, no flicker";
        return `Negative: ${base}${v.extra ? ", " + v.extra : ""}.`;
      },
    },
  ],
  typography: [
    {
      id: "text_input", title: "텍스트 입력", importance: "essential",
      summary: "타이포에 들어갈 실제 글자",
      fields: [
        { key: "text",     label: "텍스트 내용", type: "text", default: "DARK ELF" },
        { key: "language", label: "언어 (korean/english/mixed)", type: "choice",
          choices: ["korean","english","mixed"], default: "english",
          map: { korean:"Korean text", english:"English text", mixed:"Mixed Korean and English text" } },
      ],
      promptFn: (v, f) => {
        if (!v.text.trim()) return "Text content: (empty).";
        const lang = f.find(x => x.key === "language").map[v.language];
        const upper = v.language === "english" && v.text === v.text.toUpperCase() && /[A-Z]/.test(v.text) ? " (uppercase)" : "";
        return `Text content: ${lang} reads "${v.text.trim()}"${upper}, single line, no punctuation.`;
      },
    },
    {
      id: "stroke_contrast", title: "획 대비", importance: "editable",
      summary: "스타일·굵기 조합",
      fields: [
        { key: "style",  label: "스타일 (serif/sans_serif/slab/calligraphy)", type: "choice",
          choices: ["serif","sans_serif","slab","calligraphy"], default: "sans_serif",
          map: { serif:"traditional serif with bracketed terminals", sans_serif:"geometric sans-serif",
                 slab:"slab serif with rectangular terminals", calligraphy:"calligraphic with brush-modulated strokes" } },
        { key: "weight", label: "굵기 (ultra_thin/thin/regular/bold/ultra_bold)", type: "choice",
          choices: ["ultra_thin","thin","regular","bold","ultra_bold"], default: "bold",
          map: { ultra_thin:"ultra-thin (weight 100)", thin:"thin (weight 300)", regular:"regular (weight 400)",
                 bold:"bold (weight 700)", ultra_bold:"ultra-bold (weight 900)" } },
      ],
      promptFn: (v, f) => {
        const s = f.find(x => x.key === "style").map[v.style];
        const w = f.find(x => x.key === "weight").map[v.weight];
        return `Stroke: ${s} construction, ${w}. Stroke modulation matches the style's traditional axis.`;
      },
    },
    {
      id: "material_style", title: "재질 스타일", importance: "editable",
      summary: "타입 표면 효과·색상 방향",
      fields: [
        { key: "effect",    label: "효과 (flat2d/metal/stone/crystal/fire/ice)", type: "choice",
          choices: ["flat2d","metal","stone","crystal","fire","ice"], default: "metal",
          map: { flat2d:"flat 2D with no depth", metal:"metallic surface with specular reflections",
                 stone:"stone-carved with chiseled depth", crystal:"crystalline with internal refraction",
                 fire:"flame-textured with ember glow", ice:"ice-crystallized with frost layer" } },
        { key: "color_dir", label: "색상 방향 (solid/gradient/multi)", type: "choice",
          choices: ["solid","gradient","multi"], default: "solid",
          map: { solid:"solid single tone", gradient:"smooth gradient", multi:"multi-color palette" } },
      ],
      promptFn: (v, f) => {
        const e  = f.find(x => x.key === "effect").map[v.effect];
        const cd = f.find(x => x.key === "color_dir").map[v.color_dir];
        return `Material style: ${e}, with ${cd} color treatment.`;
      },
    },
    {
      id: "layout_rule", title: "레이아웃", importance: "essential",
      summary: "정렬·트래킹·줄간격",
      fields: [
        { key: "align",    label: "정렬 (center/left/right)", type: "choice",
          choices: ["center","left","right"], default: "center" },
        { key: "tracking", label: "트래킹 (px, 0-120)", type: "number", default: 60, min: 0, max: 120 },
      ],
      promptFn: (v) =>
        `Layout: ${v.align}-aligned, single line, ${v.tracking}px tracking, baseline at exact vertical center. No optical kerning adjustments beyond ±5px.`,
    },
  ],
};

const CATEGORY_LABELS = { motion: "모션", typography: "타이포그래피" };
const IMPORTANCE_LABELS = {
  critical:  color("red",     "🔒 핵심"),
  essential: color("white",   "   필수"),
  editable:  color("green",   "✏️  편집가능"),
  optional:  color("yellow",  "   선택"),
  advanced:  color("magenta", "   고급"),
};

// ─── 저장소 ───────────────────────────────────────────────────────────────────
const SAVE_DIR     = path.join(os.homedir(), ".prompt-builder");
const PRESETS_FILE = path.join(SAVE_DIR, "presets.json");
const HISTORY_FILE = path.join(SAVE_DIR, "history.json");

function ensureSaveDir() {
  if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });
}
function loadPresets() {
  try { return JSON.parse(fs.readFileSync(PRESETS_FILE, "utf8")); } catch { return {}; }
}
function savePresets(p) {
  ensureSaveDir();
  fs.writeFileSync(PRESETS_FILE, JSON.stringify(p, null, 2));
}
function saveHistory(entry) {
  ensureSaveDir();
  let hist = [];
  try { hist = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")); } catch {}
  hist.unshift({ ...entry, ts: new Date().toISOString() });
  if (hist.length > 30) hist = hist.slice(0, 30);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(hist, null, 2));
}

// ─── readline 헬퍼 ────────────────────────────────────────────────────────────
function createRL() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}
async function ask(rl, prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

// ─── 필드 입력 ────────────────────────────────────────────────────────────────
async function askField(rl, field, existingValue) {
  const cur = existingValue !== undefined ? existingValue : field.default;
  const display = `  ${color("cyan", field.label)} ${dim("[현재: " + JSON.stringify(cur) + "]")} > `;

  while (true) {
    const raw = (await ask(rl, display)).trim();
    if (raw === "" || raw === "\n") return cur;

    if (field.type === "bool") {
      if (["y","yes","1","true","t","네"].includes(raw.toLowerCase())) return true;
      if (["n","no","0","false","f","아니오","아니"].includes(raw.toLowerCase())) return false;
      console.log(color("yellow", "  → y/n 또는 true/false로 입력해주세요"));
      continue;
    }
    if (field.type === "choice") {
      if (field.choices.includes(raw)) return raw;
      console.log(color("yellow", `  → 선택지: ${field.choices.join(" / ")}`));
      continue;
    }
    if (field.type === "number") {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= (field.min ?? -Infinity) && n <= (field.max ?? Infinity)) return n;
      console.log(color("yellow", `  → ${field.min ?? ""}~${field.max ?? ""} 사이 정수를 입력해주세요`));
      continue;
    }
    if (field.type === "float") {
      const f = parseFloat(raw);
      if (!isNaN(f) && f >= (field.min ?? -Infinity) && f <= (field.max ?? Infinity)) return Math.round(f * 100) / 100;
      console.log(color("yellow", `  → ${field.min ?? ""}~${field.max ?? ""} 사이 소수를 입력해주세요`));
      continue;
    }
    return raw;
  }
}

// ─── 카드 빌드 (필드 입력 + validateFn 적용) ──────────────────────────────────
async function buildCard(rl, card, saved = {}) {
  console.log("\n" + bold(color("blue", `  ┌── ${card.title} `)) + IMPORTANCE_LABELS[card.importance]);
  console.log(bold(color("blue", `  │   `)) + dim(card.summary));
  if (card.fields.length === 0) {
    console.log(bold(color("blue", `  └── `)) + dim("(설정 항목 없음 — 고정 프롬프트)"));
    return {};
  }

  while (true) {
    const values = {};
    for (const field of card.fields) {
      values[field.key] = await askField(rl, field, saved[field.key]);
    }
    // [FIX-3] 카드 단위 검증
    if (typeof card.validateFn === "function") {
      const err = card.validateFn(values);
      if (err) {
        console.log(color("yellow", `  ⚠ ${err}`));
        continue; // 다시 입력
      }
    }
    return values;
  }
}

function renderPrompt(card, values) {
  return card.promptFn(values, card.fields);
}

// ─── 배너 / 도움말 ────────────────────────────────────────────────────────────
function printBanner() {
  console.clear();
  console.log(color("blue", `
  ╔═══════════════════════════════════════════════════════╗
  ║          🎴  Prompt Builder  CLI  v2.0.0              ║
  ║       카드형 AI 프롬프트 조립 도구 (한글 입력)         ║
  ╚═══════════════════════════════════════════════════════╝`));
  console.log();
}

function printHelp() {
  console.log(`
${bold("사용법:")}
  ${color("green","prompt-builder")} ${color("cyan","<명령어>")} [옵션]

${bold("명령어:")}
  ${color("cyan","build")}    [카테고리]    카드를 대화형으로 조립해 프롬프트 생성
  ${color("cyan","quick")}    [카드ID...]   지정한 카드만 빠르게 조합
  ${color("cyan","list")}                  사용 가능한 카드 목록 출력
  ${color("cyan","preset")}   <name>        저장된 프리셋 불러오기
  ${color("cyan","presets")}               저장된 프리셋 목록
  ${color("cyan","history")}               최근 생성 기록 (최대 30개)
  ${color("cyan","help")}                  이 도움말 출력

${bold("카테고리:")}
  ${color("yellow","motion")}      모션 카드 세트
  ${color("yellow","typography")}  타이포그래피 카드 세트

${bold("예시:")}
  ${dim("$ node prompt-builder-v2.cjs build motion")}
  ${dim("$ node prompt-builder-v2.cjs quick surface_fx edge_fx loop_timing")}
  ${dim("$ node prompt-builder-v2.cjs preset 골드브리딩")}
`);
}

function printCardList() {
  console.log();
  for (const [cat, cards] of Object.entries(CARDS)) {
    console.log(bold(`\n  ── ${CATEGORY_LABELS[cat] ?? cat} ──────────────────`));
    for (const card of cards) {
      const imp = IMPORTANCE_LABELS[card.importance];
      console.log(`  ${color("cyan", card.id.padEnd(22))} ${imp}  ${dim(card.summary)}`);
    }
  }
  console.log();
}

// ─── 카드 선택 raw TUI ────────────────────────────────────────────────────────
// [FIX-1] 메뉴 출력 총 줄 수를 변수로 추적하고 그만큼 정확히 위로 올라가서 지움.
// [FIX-2] raw mode 진입은 readline interface 가 닫힌 상태에서만 — 호출자가 보장.
async function selectCardsRaw(cards) {
  const enabled = new Set(
    cards.filter(card => ["critical","essential"].includes(card.importance)).map(card => card.id)
  );
  let curIdx = 0;
  // 한 번의 메뉴 출력이 차지하는 줄 수 — 마지막 렌더에서 갱신.
  let lastRenderedLines = 0;

  const buildMenuLines = (warning = null) => {
    const lines = [];
    if (warning) { lines.push(color("red", `  ⚠  ${warning}`)); lines.push(""); }
    cards.forEach((card, i) => {
      const on  = enabled.has(card.id);
      const sel = i === curIdx;
      const chk = on ? color("green","[✓]") : color("yellow","[ ]");
      const imp = IMPORTANCE_LABELS[card.importance];
      const prefix = sel ? color("blue","▶ ") : "  ";
      lines.push(`${prefix}${chk} ${color("cyan", card.title.padEnd(14))} ${imp}  ${dim(card.summary)}`);
    });
    lines.push("");
    lines.push(dim(`  ↑↓ 이동  Space 토글  Enter 확정  a 전체  n 없음`));
    return lines;
  };

  const render = (warning = null) => {
    // 이전 출력 위로 올라가 지우기
    if (lastRenderedLines > 0) {
      process.stdout.write(`\x1b[${lastRenderedLines}A\x1b[J`);
    }
    const lines = buildMenuLines(warning);
    process.stdout.write(lines.join("\n") + "\n");
    lastRenderedLines = lines.length;
  };

  render(); // 최초 렌더

  await new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const handler = (key) => {
      if (key === "") { process.exit(); }     // Ctrl+C
      if (key === "\r" || key === "\n") {            // Enter
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", handler);
        resolve();
        return;
      }
      let warning = null;
      if (key === " ") {
        const card = cards[curIdx];
        if (card.importance === "critical") {
          warning = "핵심(critical) 카드는 끌 수 없습니다.";
        } else if (enabled.has(card.id)) {
          enabled.delete(card.id);
        } else {
          enabled.add(card.id);
        }
      } else if (key === "a") {
        cards.forEach(card => enabled.add(card.id));
      } else if (key === "n") {
        enabled.clear();
        cards.filter(card => card.importance === "critical").forEach(card => enabled.add(card.id));
      } else if (key === "\x1b[A") { curIdx = (curIdx - 1 + cards.length) % cards.length; }
      else   if (key === "\x1b[B") { curIdx = (curIdx + 1) % cards.length; }
      render(warning);
    };
    process.stdin.on("data", handler);
  });

  return enabled;
}

// ─── 대화형 빌드 ──────────────────────────────────────────────────────────────
async function cmdBuild(category) {
  printBanner();

  // 1) 카테고리 결정 — readline 사용
  let rl = createRL();
  let cat = category;
  if (!cat || !CARDS[cat]) {
    console.log(bold("카테고리를 선택하세요:"));
    Object.entries(CATEGORY_LABELS).forEach(([k, v], i) => {
      console.log(`  ${color("cyan", String(i+1) + ".")} ${v} ${dim("(" + k + ")")}`);
    });
    const keys = Object.keys(CARDS);
    const raw = (await ask(rl, "\n  번호 또는 이름 > ")).trim();
    const n = parseInt(raw, 10);
    cat = isNaN(n) ? raw : keys[n - 1];
    if (!CARDS[cat]) {
      console.log(color("red", "  알 수 없는 카테고리입니다."));
      rl.close();
      return;
    }
  }

  // 2) 카드 선택 raw TUI — readline 을 닫고 진입.
  //    [FIX-2] readline + raw mode 가 stdin 을 동시에 점유하면 충돌하므로
  //    raw TUI 직전에 rl.close(), 끝난 후 createRL() 로 새로 만든다.
  const cards = CARDS[cat];
  console.log(`\n${bold(`  ${CATEGORY_LABELS[cat]} 카드 목록`)}\n`);
  console.log(dim("  Space = 토글, Enter = 완료, a = 전체선택, n = 핵심만\n"));
  rl.close();
  const enabled = await selectCardsRaw(cards);

  // 3) 각 카드 필드 입력 — readline 재생성
  rl = createRL();
  const assembled = [];
  for (const card of cards) {
    if (!enabled.has(card.id)) continue;
    const values = await buildCard(rl, card, {});
    const text = renderPrompt(card, values);
    assembled.push({ card, values, text });
    console.log("\n  " + color("green","✓") + " " + dim(text.slice(0, 70) + (text.length > 70 ? "…" : "")));
  }

  // 4) 결과
  const finalPrompt = assembled.map(a => a.text).join("\n\n");
  console.log(`\n${bold(color("blue","═".repeat(60)))}`);
  console.log(bold("  📋 최종 프롬프트 (영문):\n"));
  console.log(finalPrompt);
  console.log(`\n${bold(color("blue","═".repeat(60)))}\n`);

  // 5) 프리셋 저장 — 덮어쓰기 확인
  const saveName = (await ask(rl, `  💾 프리셋으로 저장하려면 이름 입력 (엔터 = 건너뜀): `)).trim();
  if (saveName) {
    const ps = loadPresets();
    let proceed = true;
    if (ps[saveName]) {
      const yes = (await ask(rl, `  같은 이름의 프리셋이 있습니다. 덮어쓸까요? (y/n) `)).trim().toLowerCase();
      proceed = ["y","yes","네"].includes(yes);
    }
    if (proceed) {
      ps[saveName] = { category: cat, cards: assembled.map(a => ({ id: a.card.id, values: a.values })) };
      savePresets(ps);
      console.log(color("green", `  ✓ 프리셋 "${saveName}" 저장 완료`));
    } else {
      console.log(dim("  저장 취소됨"));
    }
  }

  saveHistory({ category: cat, prompt: finalPrompt });
  tryClipboard(finalPrompt);

  const outFile = (await ask(rl, `  📄 파일로 저장할 경로 (엔터 = 건너뜀): `)).trim();
  if (outFile) {
    fs.writeFileSync(outFile, finalPrompt);
    console.log(color("green", `  ✓ ${outFile} 에 저장됨`));
  }

  rl.close();
}

// ─── 빠른 조합 ────────────────────────────────────────────────────────────────
async function cmdQuick(cardIds) {
  if (!cardIds.length) {
    console.log(color("yellow","  카드 ID를 인수로 전달해주세요.\n  예: prompt-builder quick surface_fx edge_fx loop_timing"));
    return;
  }
  const rl = createRL();
  const allCards = Object.values(CARDS).flat();
  const parts = [];

  for (const id of cardIds) {
    const card = allCards.find(x => x.id === id);
    if (!card) { console.log(color("yellow",`  ⚠ 카드 "${id}" 를 찾을 수 없습니다.`)); continue; }
    const values = await buildCard(rl, card, {});
    parts.push(renderPrompt(card, values));
  }

  const finalPrompt = parts.join("\n\n");
  console.log(`\n${bold("📋 결과:")}\n\n${finalPrompt}\n`);
  saveHistory({ cardIds, prompt: finalPrompt });
  tryClipboard(finalPrompt);
  rl.close();
}

// ─── 프리셋 ───────────────────────────────────────────────────────────────────
async function cmdPreset(name) {
  const presets = loadPresets();
  if (!name) {
    const keys = Object.keys(presets);
    if (!keys.length) { console.log(color("yellow","  저장된 프리셋이 없습니다.")); return; }
    console.log(bold("\n  저장된 프리셋:"));
    keys.forEach((k, i) => console.log(`  ${color("cyan", String(i+1) + ".")} ${k}  ${dim("카테고리: " + (presets[k].category ?? ""))}`));
    const rl = createRL();
    const raw = (await ask(rl, "\n  번호 또는 이름 > ")).trim();
    const n = parseInt(raw, 10);
    name = isNaN(n) ? raw : keys[n - 1];
    rl.close();
  }

  const p = presets[name];
  if (!p) { console.log(color("red",`  프리셋 "${name}"을 찾을 수 없습니다.`)); return; }

  const allCards = Object.values(CARDS).flat();
  const parts = [];
  for (const saved of p.cards) {
    const card = allCards.find(x => x.id === saved.id);
    if (!card) continue;
    parts.push(renderPrompt(card, saved.values ?? {}));
  }

  const finalPrompt = parts.join("\n\n");
  console.log(`\n${bold(color("blue","  프리셋: " + name))}\n\n${finalPrompt}\n`);
  tryClipboard(finalPrompt);
}

// ─── 기록 ─────────────────────────────────────────────────────────────────────
function cmdHistory() {
  let hist = [];
  try { hist = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")); } catch {}
  if (!hist.length) { console.log(color("yellow","  기록이 없습니다.")); return; }
  console.log(bold("\n  최근 생성 기록:\n"));
  hist.slice(0, 10).forEach((h, i) => {
    const ts = new Date(h.ts).toLocaleString("ko-KR");
    const preview = (h.prompt || "").slice(0, 60).replace(/\n/g," ");
    console.log(`  ${color("cyan", String(i+1).padStart(2, " ") + ".")} ${dim(ts)}`);
    console.log(`      ${preview}…`);
    console.log();
  });
}

// ─── 클립보드 (Linux 폴백 체인 · Windows PowerShell UTF-8 안전) ───────────────
function tryClipboard(text) {
  const linuxCmds = [
    { cmd: "wl-copy", args: [] },
    { cmd: "xclip",   args: ["-selection","clipboard"] },
    { cmd: "xsel",    args: ["--clipboard","--input"] },
  ];
  try {
    if (process.platform === "darwin") {
      execSync("pbcopy", { input: text, timeout: 2000 });
      console.log(color("green","  ✓ 클립보드에 복사됨"));
      return;
    }
    if (process.platform === "win32") {
      // PowerShell Set-Clipboard 가 UTF-8 안전. 한글 텍스트도 깨지지 않음.
      execSync(`powershell -NoProfile -Command "$input | Set-Clipboard"`, { input: text, timeout: 4000 });
      console.log(color("green","  ✓ 클립보드에 복사됨"));
      return;
    }
    // Linux — wl-copy → xclip → xsel 순서로 시도.
    for (const { cmd, args } of linuxCmds) {
      try {
        execSync(`${cmd} ${args.join(" ")}`, { input: text, timeout: 2000 });
        console.log(color("green",`  ✓ 클립보드에 복사됨 (${cmd})`));
        return;
      } catch { /* 다음 후보로 */ }
    }
    console.log(dim("  · 클립보드 도구를 찾지 못했어요 (wl-copy / xclip / xsel 설치 필요)"));
  } catch { /* 무시 */ }
}

// ─── 엔트리 ───────────────────────────────────────────────────────────────────
async function main() {
  const [,, cmd, ...args] = process.argv;

  if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
    printBanner();
    printHelp();
    return;
  }

  printBanner();

  switch (cmd) {
    case "build":    await cmdBuild(args[0]); break;
    case "quick":    await cmdQuick(args); break;
    case "list":     printCardList(); break;
    case "preset":   await cmdPreset(args[0]); break;
    case "presets":  await cmdPreset(); break;
    case "history":  cmdHistory(); break;
    default:
      console.log(color("red", `  알 수 없는 명령어: ${cmd}`));
      printHelp();
  }
}

main().catch(err => {
  console.error(color("red", "\n  오류: " + err.message));
  process.exit(1);
});
