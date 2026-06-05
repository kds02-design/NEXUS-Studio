// Skills — 마크다운 정책 파일을 빌드 타임에 번들하고, 호출 시점에 ID 목록으로 조합.
// 큰 prompt 거대 문자열을 코드에서 분리해 운영/리뷰 비용을 낮춤.
//
// 사용:
//   import { composeSkills } from "../../lib/skills";
//   const prompt = composeSkills(
//     ["quality-up/intro", "quality-up/preserve-face", ...],
//     { extraInstructions }
//   );
//
// 새 스킬 추가: src/skills/<group>/<id>.md 파일만 만들면 끝. 자동 번들.
// 본문 안에 {{key}} 가 있으면 ctx[key] 로 치환. 빈/누락 키는 빈 문자열.

// Vite glob — 모든 .md 를 raw 텍스트로 빌드 타임에 번들. eager:true 로 동기 접근.
const modules = import.meta.glob("../skills/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

// "/src/skills/quality-up/preserve-face.md" -> "quality-up/preserve-face"
function pathToId(path) {
  const m = path.match(/\/skills\/(.+)\.md$/);
  return m ? m[1] : path;
}

const SKILLS = Object.create(null);
for (const [path, body] of Object.entries(modules)) {
  SKILLS[pathToId(path)] = String(body || "").trim();
}

// {{key}} 치환 — 누락 키는 빈 문자열. 중첩 보간은 지원 안 함(불필요).
function interpolate(body, ctx) {
  if (!ctx) return body;
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = ctx[key];
    return v == null ? "" : String(v);
  });
}

export function getSkill(id) {
  return SKILLS[id];
}

export function listSkills() {
  return Object.keys(SKILLS).sort();
}

// ids 가 누락된 스킬은 콘솔 경고 후 빈 문자열로 스킵.
// 조합 결과는 빈 청크를 걸러내고 두 줄 띄움으로 연결.
export function composeSkills(ids, ctx = {}) {
  if (!Array.isArray(ids)) return "";
  const parts = ids.map(id => {
    const body = SKILLS[id];
    if (body == null) {
      if (typeof window !== "undefined") console.warn(`[skills] unknown skill id: ${id}`);
      return "";
    }
    return interpolate(body, ctx);
  }).map(s => s.trim()).filter(Boolean);
  return parts.join("\n\n");
}
