// 월 테마 — PromoSkin 의 테마 토큰 모델을 재사용하고, KV 이미지/컨셉에서 테마를 추출한다.
//   tokens: primary/accent/title/textLight/panel/bgTop/bgMid/bgBottom/radius/glow
//   variants: background/frame/container/button/motif
import { Vibrant } from "node-vibrant/browser";
import { GEMINI_API_KEY } from "../../../lib/gemini";
import { PRESETS, mergePreset, shade } from "../../PromoSkin/constants/presets";

export { mergePreset, shade } from "../../PromoSkin/constants/presets";
export const ENUM_LIST = {
  background: ["field", "dark", "snow", "plain"],
  frame: ["glow", "metal", "flat"],
  container: ["scroll", "box"],
  button: ["glow", "metal", "flat"],
  motif: ["diamond", "gem", "none"],
};

// 기본 테마(다크 판타지 프리셋 기반) — 추출 전 시드/폴백. Figma 변수 구조에 맞춰 그라데이션 키 확장.
const jt = PRESETS.january.tokens;
export const BASE_THEME = {
  name: "월 테마", concept: "",
  tokens: {
    ...jt,
    titleTop: shade(jt.title, 22), titleBottom: jt.title,
    btnTop: shade(jt.primary, 22), btnBottom: shade(jt.primary, -22), btnBorder: shade(jt.primary, 18),
  },
  variants: { ...PRESETS.january.variants },
};

// node-vibrant 로 역할 기반 스와치 추출 → 다양한 팔레트로 매핑(단조 방지).
//   Vibrant=히어로(버튼/강조), Dark/Muted=패널·배경, Light=타이틀·텍스트
export async function extractPalette(dataUrl) {
  let p;
  try { p = await Vibrant.from(dataUrl).getPalette(); }
  catch { return null; }
  const H = (sw) => (sw && sw.hex) || null;
  const V = H(p.Vibrant), LV = H(p.LightVibrant), DV = H(p.DarkVibrant);
  const M = H(p.Muted), LM = H(p.LightMuted), DM = H(p.DarkMuted);
  const hero = V || M || DV || "#5FCF7A";
  const lightSrc = LV || LM || hero;
  const deep = DM || DV || shade(hero, -55);
  const mid = M || DV || shade(hero, -15);
  return {
    primary: hero,                                  // 버튼·강조 히어로
    accent: LV || shade(hero, 28),                  // 강조(밝은 비비드)
    title: shade(lightSrc, 42),                     // 타이틀 기본(밝게 보정)
    titleTop: shade(lightSrc, 48),                  // 타이틀 그라데이션 위(가장 밝음)
    titleBottom: LV || shade(hero, 8),              // 아래(살짝 짙게)
    textLight: shade(LM || lightSrc, 40),           // 본문 밝은색(가독성)
    panel: DM || shade(deep, 5),                    // 사용처/카드 배경(어두움)
    bgTop: M || shade(mid, 14),                     // 배경 그라데이션
    bgMid: shade(mid, -8),
    bgBottom: shade(deep, -22),
    btnTop: LV || shade(hero, 22),                  // 버튼 그라데이션 위(밝은 히어로)
    btnBottom: DV || shade(hero, -25),              // 아래(짙은 히어로)
    btnBorder: V || shade(hero, 10),                // 버튼 테두리
  };
}

// KV 이미지(dataURL) → Gemini 비전으로 프로모션 테마 프리셋 추출.
const SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    tokens: { type: "OBJECT", properties: { primary: { type: "STRING" }, accent: { type: "STRING" }, title: { type: "STRING" }, textLight: { type: "STRING" }, panel: { type: "STRING" }, bgTop: { type: "STRING" }, bgMid: { type: "STRING" }, bgBottom: { type: "STRING" }, radius: { type: "NUMBER" }, glow: { type: "NUMBER" } } },
    variants: { type: "OBJECT", properties: { background: { type: "STRING" }, frame: { type: "STRING" }, container: { type: "STRING" }, button: { type: "STRING" }, motif: { type: "STRING" } } },
  },
  required: ["tokens", "variants"],
};
const PROMPT = `첨부 이미지는 게임 프로모션 페이지 상단 키비주얼(KV)이다. 이 KV의 지배색·강조색·재질·무드에 어울리도록, 그 아래 페이지 부품(상품 카드/버튼/프레임/배너/배경)에 쓸 프로모션 테마 프리셋을 JSON 으로만 출력하라(설명·코드펜스 금지).
- primary: 버튼·프레임 강조색(KV에서 가장 특징적인 액센트, 예: 캐릭터 의상색)
- accent: 타이틀 글로우·금장
- title: 타이틀 글자색(밝게)
- textLight: 본문 밝은색
- panel: 프레임/카드 배경(어두운 색)
- bgTop(밝음)→bgMid→bgBottom(짙음): 하단 페이지 배경 그라데이션, KV 하단 톤과 이어지게
- radius 8~24, glow 0~30
- variants.frame/button: 밝고 화사하면 "glow", 무겁고 어두우면 "metal"; container "scroll"|"box"; motif "diamond"|"gem"|"none"; background "field"|"dark"|"snow"|"plain"`;

const toB64 = (u) => { const i = u.indexOf("base64,"); return i >= 0 ? u.slice(i + 7) : u; };
const mime = (u) => (u.match(/^data:(image\/[a-z+]+);base64,/)?.[1]) || "image/jpeg";

export async function analyzeKvTheme(dataUrl, prev = BASE_THEME) {
  if (!GEMINI_API_KEY) throw new Error("Gemini 키 없음");
  const body = {
    contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: mime(dataUrl), data: toB64(dataUrl) } }] }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json", responseSchema: SCHEMA },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("응답 비어있음");
  let parsed; try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { throw new Error("파싱 실패"); }
  return mergePreset(prev, parsed, parsed.name || "KV 테마");
}
