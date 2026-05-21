import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore, initializeFirestore,
  persistentLocalCache, persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];
const missing = REQUIRED_KEYS.filter((k) => !firebaseConfig[k]);
if (missing.length > 0) {
  console.warn(
    `[firebase] Missing env vars: ${missing
      .map((k) => "VITE_FIREBASE_" + k.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase())
      .join(", ")}. .env 파일을 확인하고 dev 서버를 재시작하세요.`
  );
}

export const firebaseApp = getApps()[0] || initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Firestore — 사내망/프록시/VPN 환경에서 WebChannel 폴백이 실패해
// LISTEN_CHANNEL 을 초당 수십 회 재호출하는 burst 문제 해결을 위해 long-polling 강제.
// + persistentLocalCache 로 IndexedDB 캐시 활성화 (다중 탭 안전).
// initializeFirestore 는 첫 호출만 가능 → 이미 다른 모듈이 getFirestore 호출했으면 fallback.
let _db;
try {
  _db = initializeFirestore(firebaseApp, {
    experimentalAutoDetectLongPolling: true,   // WebChannel 자동 감지 → 실패 시 long-poll 폴백
    experimentalLongPollingOptions: { timeoutSeconds: 30 }, // 각 폴 30초 유지 → 호출 빈도 ↓
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  // 이미 초기화됐거나 IndexedDB 불가 환경 (시크릿 모드 일부) — 기본 인스턴스 사용.
  console.warn("[firebase] initializeFirestore 실패, 기본 getFirestore 사용:", e?.message || e);
  _db = getFirestore(firebaseApp);
}
export const db = _db;

export const storage = getStorage(firebaseApp);
export const appId = firebaseConfig.projectId || "default-app-id";
export const googleProvider = new GoogleAuthProvider();

export async function getAnalyticsLazy() {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.measurementId) return null;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) return getAnalytics(firebaseApp);
  } catch (err) {
    console.warn("[firebase] Analytics init failed:", err);
  }
  return null;
}
