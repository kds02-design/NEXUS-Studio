// 운명 관측소 독립 PWA 엔트리 (destiny.html) — Shell/Auth 없이 standalone 모드로 마운트.
// 홈 화면 설치(A2HS) + 오프라인 캐시(destiny-sw.js). AI 기능(예언·타로·부적·상담)은 NEXUS 안에서만 제공.
import { createRoot } from "react-dom/client";
import App from "./apps/DestinyObservatory";

createRoot(document.getElementById("root")).render(<App standalone />);

// 서비스 워커 — 배포 형태에 따라 scope 자동 결정:
//   NEXUS 동거 배포(/destiny.html): scope 를 그 페이지로 좁혀 본체(/)에 영향 없음
//   전용 도메인 배포(루트 index.html): scope "/" 전체
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const scope = window.location.pathname.endsWith("/destiny.html") ? "/destiny.html" : "/";
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/destiny-sw.js", { scope }).catch((e) => {
      console.warn("[DestinyObservatory] SW 등록 실패:", e?.message || e);
    });
  });
}
