// 대시보드 히어로 배경 이미지 등 — 관리자가 NEXUS Admin에서 수정.
// Firestore: settings/dashboard 단일 문서.
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Unsplash 다크 시네마틱 — 크레딧: photographer pages on unsplash
export const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&w=2400&q=80";

const settingsRef = () => doc(db, "settings", "dashboard");

export async function fetchDashboardSettings() {
  try {
    const snap = await getDoc(settingsRef());
    if (snap.exists()) return snap.data();
  } catch (e) {
    console.warn("[dashboardSettings] fetch failed", e?.message || e);
  }
  return null;
}

// 라이브 구독 — 관리자가 저장하면 모든 클라이언트에서 즉시 갱신.
export function subscribeDashboardSettings(onChange) {
  try {
    return onSnapshot(settingsRef(), (snap) => {
      onChange(snap.exists() ? snap.data() : null);
    }, (err) => console.warn("[dashboardSettings] subscribe error", err?.message || err));
  } catch (e) {
    console.warn("[dashboardSettings] subscribe init failed", e?.message || e);
    return () => {};
  }
}

export async function updateDashboardHeroImage(url) {
  await setDoc(
    settingsRef(),
    { heroImageUrl: String(url || "").trim() || DEFAULT_HERO_IMAGE, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
