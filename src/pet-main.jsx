// 반려동물 MBTI 독립 PWA 엔트리 (pet.html) — Shell/Auth 없이 standalone 모드로 마운트.
// 홈 화면 설치(A2HS) + 오프라인 캐시(pet-sw.js). AI 리포트는 NEXUS 안에서만 제공.
import { createRoot } from "react-dom/client";
import App from "./apps/PetPersona";

createRoot(document.getElementById("root")).render(<App standalone />);

// 서비스 워커 — scope 를 /pet.html 로 좁혀 NEXUS 본체(/)에는 영향 없음.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/pet-sw.js", { scope: "/pet.html" }).catch((e) => {
      console.warn("[PetPersona] SW 등록 실패:", e?.message || e);
    });
  });
}
