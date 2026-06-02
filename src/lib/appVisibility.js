// 앱 카드 공개/숨김 오버라이드 — 관리자가 인덱스 카드의 lock 토글로 변경.
// Firestore: settings/appVisibility 단일 문서.
//   { overrides: { [appId]: "hidden" | "public" }, updatedAt }
// 기본값(오버라이드 미설정)은 APP_REGISTRY 의 adminOnly 플래그. 관리자가
// 토글하면 그 결정이 모든 클라이언트에 라이브 반영된다.
import { useSyncExternalStore } from "react";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const ref = () => doc(db, "settings", "appVisibility");

// 모듈 레벨 단일 구독 — 여러 컴포넌트에서 useAppVisibility() 를 호출해도
// onSnapshot 은 한 번만 붙는다. 첫 응답이 오기 전까지는 빈 객체를 반환해
// 호출자가 adminOnly 기본값을 사용하도록 둔다.
let _overrides = {};
let _unsub = null;
const _listeners = new Set();

function ensureSubscription() {
  if (_unsub) return;
  try {
    _unsub = onSnapshot(
      ref(),
      (snap) => {
        // 새 객체 참조로 교체 — useSyncExternalStore 가 변경 감지하도록.
        _overrides = snap.exists() ? { ...(snap.data()?.overrides || {}) } : {};
        _listeners.forEach((fn) => fn());
      },
      (err) => console.warn("[appVisibility] subscribe error", err?.message || err),
    );
  } catch (e) {
    console.warn("[appVisibility] subscribe init failed", e?.message || e);
  }
}

const _subscribe = (cb) => {
  ensureSubscription();
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
};
const _getSnapshot = () => _overrides;

export function useAppVisibility() {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
}

// 효과적 hidden 여부 — 오버라이드가 있으면 그 값, 없으면 app.adminOnly.
export function isAppHidden(app, overrides) {
  if (!app) return false;
  const o = overrides?.[app.id];
  if (o === "hidden") return true;
  if (o === "public") return false;
  return !!app.adminOnly;
}

// admin 토글용 — appVisibility 단일 문서에 merge 저장. 다른 앱의 오버라이드는 보존됨.
export async function setAppHidden(appId, hidden) {
  await setDoc(
    ref(),
    { overrides: { [appId]: hidden ? "hidden" : "public" }, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
