import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function geminiUrl(model = DEFAULT_GEMINI_MODEL, key = GEMINI_API_KEY) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

// ─── Gemini 활성/비활성 게이트 ──────────────────────────────────────────
// settings/gemini.enabled === false 일 때 모든 Gemini API 호출 차단.
// 차단 방식: window.fetch 를 한 번만 wrap (init 시점). lib/gemini.js 의 GEMINI_API_KEY 를
// const export 로 받아간 services 들이 직접 URL 을 만들어 fetch 해도 모두 차단됨.
// 한 번이라도 init 됐는지 추적해서 중복 wrap 방지.

let _geminiEnabled = true;
let _geminiMeta = null; // { updatedAt, updatedBy }
let _gateInitialized = false;
const _subscribers = new Set(); // (enabled, meta) => void

export function isGeminiEnabled() { return _geminiEnabled; }
export function getGeminiMeta() { return _geminiMeta; }

// React 컴포넌트에서 상태 변화를 듣고 싶을 때 사용 (NexusAdmin 토글 UI 동기화 등).
export function subscribeGeminiGate(fn) {
  _subscribers.add(fn);
  fn(_geminiEnabled, _geminiMeta); // 즉시 1회 push
  return () => _subscribers.delete(fn);
}

function _notify() {
  _subscribers.forEach(fn => { try { fn(_geminiEnabled, _geminiMeta); } catch { /* ignore */ } });
}

// 앱 마운트 시 1회 호출. Firestore 구독 + fetch 후킹.
export function initGeminiGate() {
  if (_gateInitialized) return;
  _gateInitialized = true;

  // 1) settings/gemini 실시간 구독 — 단일 문서라 비용 미미.
  if (db) {
    try {
      const ref = doc(db, "settings", "gemini");
      onSnapshot(ref, (snap) => {
        const data = snap.exists() ? snap.data() : null;
        // 문서 없거나 enabled 필드 없으면 기본 활성(true). 명시적으로 false 일 때만 차단.
        _geminiEnabled = data?.enabled !== false;
        _geminiMeta = data ? {
          updatedAt: data.updatedAt || null,
          updatedBy: data.updatedBy || "",
        } : null;
        _notify();
      }, (err) => {
        console.warn("[gemini] settings subscribe failed (기본 활성 유지):", err?.message || err);
      });
    } catch (e) {
      console.warn("[gemini] gate init failed:", e?.message || e);
    }
  }

  // 2) window.fetch wrap — Gemini 도메인 호출을 가로채:
  //    (a) 관리자가 비활성화했으면 즉시 reject,
  //    (b) ★ 백엔드 프록시(/api/gemini)로 우회하고 key 파라미터 제거 ★
  //        → API 키가 클라이언트 번들/네트워크에 절대 노출되지 않음. 서버가 키를 주입.
  //    호출부(각 services/gemini.js, imagenRender, veoRender 등)는 수정 없이 그대로 동작.
  if (typeof window !== "undefined" && !window.__geminiGated) {
    window.__geminiGated = true;
    const _origFetch = window.fetch;
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : input?.url;
      if (url && url.includes("generativelanguage.googleapis.com")) {
        if (!_geminiEnabled) {
          return Promise.reject(new Error("GEMINI_DISABLED: 관리자가 Gemini API를 비활성화했습니다."));
        }
        try {
          const u = new URL(url);
          u.searchParams.delete("key"); // 클라이언트 키 제거 — 서버 프록시가 주입.
          const target = u.pathname + (u.search || "");
          // 이미지 생성 모델(경로에 'image')은 오래 걸려 Edge(25초)에서 504 → maxDuration 긴 Node 프록시로 분기.
          // 텍스트/영상(Veo)·일반 호출은 기존 Edge 프록시(스트리밍) 유지.
          const endpoint = /image/i.test(u.pathname) ? "/api/gemini-img" : "/api/gemini";
          const proxied = `${endpoint}?target=${encodeURIComponent(target)}`;
          if (typeof input === "string") return _origFetch.call(this, proxied, init);
          // Request 객체면 url 만 교체해 재구성(method/headers/body 보존).
          return _origFetch.call(this, new Request(proxied, input), init);
        } catch {
          // URL 파싱 실패 시 원본 그대로(방어적) — 정상 케이스에선 도달 안 함.
          return _origFetch.apply(this, arguments);
        }
      }
      return _origFetch.apply(this, arguments);
    };
  }
}

// 관리자가 토글할 때 호출. settings/gemini 에 merge.
export async function setGeminiEnabled(enabled, updatedBy = "") {
  if (!db) throw new Error("Firestore 미연결");
  await setDoc(doc(db, "settings", "gemini"), {
    enabled: !!enabled,
    updatedAt: serverTimestamp(),
    updatedBy: String(updatedBy || ""),
  }, { merge: true });
}
