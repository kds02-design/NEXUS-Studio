import { collection, doc } from "firebase/firestore";
import { db, appId } from "../../../lib/firebase";

// Firestore는 (a) 배열 안의 배열, (b) `__...__` 패턴 필드명을 거부합니다.
// 중첩 배열은 자동 감지해서 JSON 문자열로 직렬화하고 마커 필드(_nestedKeys)에 키 목록을 기록.
// `__...__` 키는 import 시 들어오면 (Firestore 예약 패턴) 통째로 제거.
export const NESTED_MARKER = '_nestedKeys';

const isReservedKey = (k) => typeof k === 'string' && /^__.+__$/.test(k);

export const serializeForFirestore = (p) => {
  if (!p || typeof p !== 'object') return p;
  const out = {};
  const nestedKeys = [];
  for (const key in p) {
    if (isReservedKey(key)) continue;
    if (key === NESTED_MARKER) continue;
    const v = p[key];
    if (Array.isArray(v) && v.some(x => Array.isArray(x))) {
      out[key] = JSON.stringify(v);
      nestedKeys.push(key);
    } else {
      out[key] = v;
    }
  }
  if (nestedKeys.length > 0) out[NESTED_MARKER] = nestedKeys;
  return out;
};

export const deserializeFromFirestore = (p) => {
  if (!p || typeof p !== 'object') return p;
  const out = { ...p };
  const nestedKeys = Array.isArray(out[NESTED_MARKER]) ? out[NESTED_MARKER] : [];
  for (const key of nestedKeys) {
    if (typeof out[key] === 'string') {
      try {
        const parsed = JSON.parse(out[key]);
        if (Array.isArray(parsed)) out[key] = parsed;
      } catch { out[key] = []; }
    }
  }
  delete out[NESTED_MARKER];
  return out;
};

// Firestore 단일 문서 한도(~1MB)에 안전 마진. base64 이미지가 큰 문서는 스킵합니다.
export const APPROX_DOC_LIMIT = 900_000;
export const docSize = (obj) => {
  try { return JSON.stringify(obj).length; } catch { return Infinity; }
};

// ---- Collection / doc reference factories ----
export const promptsCollection = () =>
  db ? collection(db, "artifacts", appId, "public", "data", "prompts") : null;

export const promptDocRef = (id) =>
  db ? doc(db, "artifacts", appId, "public", "data", "prompts", id) : null;

export const favoritesCollection = (uid) =>
  uid && db ? collection(db, "artifacts", appId, "users", uid, "favorites") : null;

export const favoriteDocRef = (uid, id) =>
  uid && db ? doc(db, "artifacts", appId, "users", uid, "favorites", id) : null;

export const likesCollection = (uid) =>
  uid && db ? collection(db, "artifacts", appId, "users", uid, "likes") : null;

export const likeDocRef = (uid, id) =>
  uid && db ? doc(db, "artifacts", appId, "users", uid, "likes", id) : null;

export const foldersCollection = (uid) =>
  uid && db ? collection(db, "users", uid, "folders") : null;

export const folderDocRef = (uid, id) =>
  uid && db ? doc(db, "users", uid, "folders", id) : null;

export { db, appId };
