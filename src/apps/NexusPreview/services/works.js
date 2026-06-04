// NEXUS Preview — 작업목록 (저장된 시안 세션) Firestore + Cloudinary 어댑터.
// 경로: artifacts/{appId}/users/{uid}/nexusPreviewWorks/{id}
//   - 타이틀/배경/서브 이미지는 Cloudinary 업로드 후 URL 만 저장 (Firestore 1MB 제한 회피).
//   - 가벼운 스칼라 설정(scale/dim/색상/텍스트 등) 만 doc 본문에 직접.

import { collection, doc, addDoc, deleteDoc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db, appId } from "../../../lib/firebase";
import { uploadBase64 } from "../../../lib/storage";

const worksCol = (uid) => collection(db, "artifacts", appId, "users", uid, "nexusPreviewWorks");

// dataURL 만 Cloudinary 로 업로드. 이미 http(s):// URL 이면 그대로 유지. null/빈값은 null 반환.
async function ensureRemoteUrl(src) {
  if (!src || typeof src !== "string") return null;
  if (src.startsWith("data:")) {
    try { return await uploadBase64(src); }
    catch (e) { console.warn("[NexusPreview/works] upload failed", e?.message || e); return null; }
  }
  return src;
}

// 동일 dataURL 이 여러 플랫폼에서 공유되는 흔한 케이스 — 한 번만 업로드하고 결과 URL 재사용.
function makeUrlCache() {
  const cache = new Map(); // dataURL → Promise<URL>
  return async (src) => {
    if (!src || !src.startsWith("data:")) return ensureRemoteUrl(src);
    if (cache.has(src)) return cache.get(src);
    const p = ensureRemoteUrl(src);
    cache.set(src, p);
    return p;
  };
}

// 저장 — 현재 NexusPreview 상태를 한 줄 객체로 받아 doc 1건 생성.
// snapshot 형태:
//   { name, category, mode, globalScale, knockout, knockoutThreshold,
//     commonCopy, commonDate, titleSrc, settings: { [platformId]: { ...스칼라, bgSrc, subImageSrc } } }
export async function saveWork(uid, snapshot) {
  if (!db) throw new Error("Firestore 미연결");
  if (!uid) throw new Error("로그인이 필요합니다");
  if (!snapshot || typeof snapshot !== "object") throw new Error("저장할 상태가 없습니다");

  const cachedUpload = makeUrlCache();
  // 타이틀
  const titleUrl = await cachedUpload(snapshot.titleSrc);
  // 플랫폼별 — bgSrc / subImageSrc 만 URL 화하고 나머지 스칼라는 그대로.
  const platforms = {};
  for (const [pid, s] of Object.entries(snapshot.settings || {})) {
    if (!s) continue;
    const { bgSrc, subImageSrc, ...rest } = s;
    const [bgUrl, subUrl] = await Promise.all([cachedUpload(bgSrc), cachedUpload(subImageSrc)]);
    platforms[pid] = { ...rest, bgUrl: bgUrl || null, subImageUrl: subUrl || null };
  }
  const doc_ = {
    name: String(snapshot.name || "").trim() || "(이름 없음)",
    category: snapshot.category || null,
    mode: snapshot.mode || null,
    globalScale: snapshot.globalScale ?? null,
    knockout: !!snapshot.knockout,
    knockoutThreshold: Number(snapshot.knockoutThreshold) || 0,
    commonCopy: snapshot.commonCopy || "",
    commonDate: snapshot.commonDate || "",
    titleUrl: titleUrl || null,
    platforms,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(worksCol(uid), doc_);
  return { id: ref.id, ...doc_ };
}

// 라이브 구독 — 최신순. 작업목록 모달에서 사용.
export function subscribeToWorks(uid, onData, onError) {
  if (!db || !uid) { onData?.([]); return () => {}; }
  try {
    const q = query(worksCol(uid), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      (snap) => onData?.(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => onError?.(err),
    );
  } catch (e) {
    // index 미생성 등 fallback — 정렬 없이라도 보여주기.
    console.warn("[NexusPreview/works] orderBy 실패, fallback", e?.message || e);
    return onSnapshot(worksCol(uid), (snap) => onData?.(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }
}

export async function deleteWork(uid, id) {
  if (!uid || !id) return;
  await deleteDoc(doc(db, "artifacts", appId, "users", uid, "nexusPreviewWorks", id));
}

// 저장된 doc → NexusPreview state 복원용 평탄화 객체.
// settings 의 bgUrl/subImageUrl 을 다시 bgSrc/subImageSrc 로 매핑해 컴포넌트가 그대로 표시.
export function workDocToSnapshot(doc_) {
  if (!doc_) return null;
  const settings = {};
  for (const [pid, s] of Object.entries(doc_.platforms || {})) {
    const { bgUrl, subImageUrl, ...rest } = s || {};
    settings[pid] = { ...rest, bgSrc: bgUrl || null, subImageSrc: subImageUrl || null };
  }
  return {
    name: doc_.name || "",
    category: doc_.category || null,
    mode: doc_.mode || null,
    globalScale: typeof doc_.globalScale === "number" ? doc_.globalScale : 2,
    knockout: !!doc_.knockout,
    knockoutThreshold: Number(doc_.knockoutThreshold) || 0,
    commonCopy: doc_.commonCopy || "",
    commonDate: doc_.commonDate || "",
    titleSrc: doc_.titleUrl || null,
    settings,
  };
}
