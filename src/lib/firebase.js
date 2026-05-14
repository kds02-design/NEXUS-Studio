import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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
export const db = getFirestore(firebaseApp);
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
