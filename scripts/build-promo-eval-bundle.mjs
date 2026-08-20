// 프로모션 평가 헬퍼 번들 — 앱의 평가 로직(인트로 템플릿·기준 포맷터·앵커 few-shot·보정)을
// Node 에서 그대로 import 하기 위한 esbuild 번들. firebase 의존은 스텁으로 치환
// (순수 함수만 쓰고 Firestore 읽기는 sync 스크립트가 firebase-admin 으로 직접 수행).
// 재생성: node scripts/build-promo-eval-bundle.mjs  (webEvalCriteria/evaluationCriteria 수정 시)
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ENTRY = `
export { getIntroTemplateFor } from "${ROOT.replaceAll("\\", "/")}/src/apps/PromotionArchive/constants/webEvalCriteria.js";
export { CRITERIA_TYPES, formatCriteriaList, weightsMap, applyOffset, buildAnchorFewShot, formatAnchorsForPrompt, getSeedCriteria, getSeedRules, getActiveRules } from "${ROOT.replaceAll("\\", "/")}/src/lib/evaluationCriteria.js";
`;

const stubPlugin = {
  name: "firebase-stub",
  setup(b) {
    // firebase/firestore + lib/firebase 를 빈 스텁으로 — 번들에서 호출되지 않는 경로.
    b.onResolve({ filter: /^firebase\/firestore$/ }, () => ({ path: "fb-stub", namespace: "stub" }));
    // "./firebase" 상대 임포트(evaluationCriteria → lib/firebase)도 스텁 — lib/firebase.js 가 번들되지 않게.
    b.onResolve({ filter: /^\.{1,2}\/firebase(\.js)?$/ }, () => ({ path: "fb-stub", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: `const fn = () => null;
export const collection = fn, getDocs = fn, getDoc = fn, setDoc = fn, addDoc = fn, doc = fn, deleteDoc = fn, query = fn, where = fn, limit = fn, orderBy = fn, serverTimestamp = fn;
export const db = null, auth = null, appId = "promo-arc", firebaseApp = null, storage = null;`,
      loader: "js",
    }));
  },
};

await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, sourcefile: "promo-eval-entry.mjs" },
  outfile: "scripts/promo-eval.bundle.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  plugins: [stubPlugin],
  define: { "import.meta.env": "{}" },
  banner: { js: "// 자동 생성 — 수정 금지. 원본: src webEvalCriteria/evaluationCriteria (node scripts/build-promo-eval-bundle.mjs 로 재생성)" },
  logLevel: "info",
});
