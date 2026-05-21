// Dev-only — Firestore 요청 진단. fetch 후킹으로 Firestore 호출 카운트 + 경로별 집계 + stack trace 샘플링.
// production 빌드에서는 main.jsx 가 import 자체를 안 함 (import.meta.env.DEV 가드).
//
// 콘솔에서:
//   window.__fs                  → 전체 카운트
//   window.__fs.byPath           → 경로별 카운트
//   window.__fs.recent           → 최근 50건 (path + stack 첫 3줄)
//   window.__fs.report()         → 정렬된 요약 출력
//   window.__fs.reset()          → 카운트 초기화
//   window.__fs.sampleStack(p)   → 특정 path 의 호출 stack 보기

function classify(url) {
  if (!url) return { kind: "other", path: "?" };
  // Firestore
  if (url.includes("firestore.googleapis.com")) {
    const m1 = url.match(/\/documents\/([^?]+)/);
    if (m1) return { kind: "firestore", path: m1[1].split(":")[0] };
    if (url.includes("/Listen/")) return { kind: "firestore", path: "LISTEN_CHANNEL" };
    if (url.includes("/Write/"))  return { kind: "firestore", path: "WRITE_CHANNEL" };
    return { kind: "firestore", path: url.split("?")[0].split("/").slice(-3).join("/") };
  }
  // Gemini (generativelanguage)
  if (url.includes("generativelanguage.googleapis.com")) {
    // /v1beta/models/{model}:{method}?...
    const m = url.match(/\/models\/([^?:]+):?(\w+)?/);
    return { kind: "gemini", path: m ? `${m[1]}${m[2] ? ":" + m[2] : ""}` : "?" };
  }
  // Cloudinary 업로드
  if (url.includes("api.cloudinary.com") || url.includes("res.cloudinary.com")) {
    return { kind: "cloudinary", path: url.split("?")[0].split("/").slice(-2).join("/") };
  }
  return null;
}

function shortStack() {
  // Error stack 에서 react/firebase 내부 노이즈 제거 + 앱 코드 3줄만.
  const e = new Error();
  const lines = (e.stack || "").split("\n").slice(2); // 첫 2줄(Error + 이 함수) 스킵
  const appLines = lines
    .map(l => l.trim())
    .filter(l =>
      l &&
      !l.includes("node_modules") &&
      !l.includes("firebase_firestore") &&
      !l.includes("chunk-") &&
      !l.includes("react-dom"),
    )
    .slice(0, 3);
  return appLines;
}

if (typeof window !== "undefined" && !window.__fs) {
  const state = {
    total: 0,                       // 전체 (firestore + gemini + cloudinary)
    byKind: { firestore: 0, gemini: 0, cloudinary: 0 },
    byPath: {},                     // "{kind}:{path}" → count
    recent: [],
    reset() { state.total = 0; state.byKind = { firestore: 0, gemini: 0, cloudinary: 0 }; state.byPath = {}; state.recent = []; console.log("[fs] reset"); },
    report() {
      const sorted = Object.entries(state.byPath).sort((a, b) => b[1] - a[1]);
      console.group(`[fs] 총 ${state.total}건 — fs:${state.byKind.firestore} / gem:${state.byKind.gemini} / cld:${state.byKind.cloudinary}`);
      console.table(sorted.map(([k, count]) => ({ key: k, count })));
      console.groupEnd();
      return sorted;
    },
    sampleStack(pathSubstring) {
      const hit = state.recent.find(r => r.key.includes(pathSubstring));
      if (!hit) { console.warn(`[fs] '${pathSubstring}' 패턴 매칭 없음`); return; }
      console.group(`[fs] sample: ${hit.key}`);
      hit.stack.forEach(s => console.log(" ", s));
      console.groupEnd();
    },
  };
  window.__fs = state;

  const _origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url;
    const cls = classify(url);
    if (cls) {
      state.total++;
      state.byKind[cls.kind] = (state.byKind[cls.kind] || 0) + 1;
      const key = `${cls.kind}:${cls.path}`;
      state.byPath[key] = (state.byPath[key] || 0) + 1;
      const stack = shortStack();
      state.recent.push({ key, kind: cls.kind, path: cls.path, stack, t: Date.now() });
      if (state.recent.length > 80) state.recent.shift();
      // 같은 key 가 5초 안에 3번 이상이면 burst 경고.
      const now = Date.now();
      const recentSame = state.recent.filter(r => r.key === key && now - r.t < 5000);
      if (recentSame.length >= 3) {
        console.warn(`[fs] BURST [${cls.kind}] '${cls.path}' (${recentSame.length}회/5초)`, stack[0] || "");
      }
      // Gemini/Cloudinary burst 는 비용 직결이라 별도 표시.
      if (cls.kind === "gemini" && recentSame.length >= 3) {
        console.error(`[fs] ⚠️ GEMINI BURST — 비용/quota 위험. 호출처 확인 필요.`);
      }
    }
    return _origFetch.apply(this, arguments);
  };

  // 30초마다 자동 요약 — 누적 카운트가 늘었을 때만.
  let lastReportedTotal = 0;
  setInterval(() => {
    if (state.total > lastReportedTotal) {
      const delta = state.total - lastReportedTotal;
      lastReportedTotal = state.total;
      console.log(`[fs] 30s +${delta}건 (누적 fs:${state.byKind.firestore} gem:${state.byKind.gemini} cld:${state.byKind.cloudinary}). window.__fs.report() 로 상세.`);
    }
  }, 30000);

  console.log("[fs] 외부 API 추적 활성 (firestore + gemini + cloudinary). window.__fs.report() 로 누적 보기.");
}

export {}; // side-effect-only module
