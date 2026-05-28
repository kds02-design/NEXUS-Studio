import {
  collection, query, onSnapshot, addDoc, deleteDoc, doc, getDoc, getDocs,
  setDoc, writeBatch, arrayUnion, arrayRemove
} from "firebase/firestore";
import { auth, db, appId } from "../../../lib/firebase";
import { uploadBase64 } from "./cloudinary";
import { compressImage } from "./cloudinary";

export { db, appId, auth };

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export const WRITE_DELAY_MS = 100;

export const sanitizeFirestoreData = (data) => {
  if (!data) return data;
  const sanitized = { ...data };
  for (const key in sanitized) {
    if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].flat(Infinity)
        .filter(item => item != null && typeof item !== 'object' && typeof item !== 'function');
    }
  }
  return sanitized;
};

export const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms (Firestore Rules가 막고 있을 수 있습니다)`)),
      ms
    ))
  ]);

const bannersCol = () => collection(db, 'artifacts', appId, 'public', 'data', 'banners');
const bannerDoc = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'banners', id);
const bannerImageDoc = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'banner_images', id);
const settingsDoc = (key) => doc(db, 'artifacts', appId, 'public', 'data', 'settings', key);
const bookmarkDoc = (uid, id) => doc(db, 'artifacts', appId, 'users', uid, 'bookmarks', id);
const bookmarksCol = (uid) => collection(db, 'artifacts', appId, 'users', uid, 'bookmarks');

// banners 컬렉션 일회성 fetch — 이전엔 onSnapshot 으로 통째 구독해서 다른 사용자/본인 모든 변경마다
// read 1회 카운트 (Firestore 무료 한도 빠르게 소진). 페이지 마운트 시 한 번만 읽고, 필요 시
// 호출자가 명시적으로 refresh() 호출.
const sortBanners = (data, sortOrder) => {
  const toMs = (v) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
    if (v && typeof v.toMillis === 'function') return v.toMillis();
    return 0;
  };
  if (sortOrder === 'oldest') return data.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
  if (sortOrder === 'popular') return data.sort((a, b) => (b.liked === a.liked ? 0 : b.liked ? 1 : -1));
  if (sortOrder === 'score') return data.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));
  return data.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
};

export const fetchBannersOnce = async (sortOrder) => {
  if (!db) return [];
  const snap = await getDocs(query(bannersCol()));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return sortBanners(data, sortOrder);
};

// 실시간 구독 — banners 컬렉션 전체. read 폭주의 진짜 원인은 cartIds 무한 루프였고 그건 해결됐으므로
// 실시간 구독 복원 (다른 사용자/탭 변경 즉시 반영).
export const subscribeToBanners = (sortOrder, onData, onError) => {
  if (!db) return () => {};
  return onSnapshot(query(bannersCol()), (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(sortBanners(data, sortOrder));
  }, onError);
};

export const subscribeToBookmarks = (uid, onData, onError) => {
  if (!db || !uid) return () => {};
  return onSnapshot(bookmarksCol(uid), snap => onData(snap.docs.map(d => d.id)), onError);
};

// 게임 로고 구독·CRUD는 `src/lib/gameLogos.js` 로 이전됨. NexusAdmin 에서 단일 관리.

export const subscribeToPrompt = (onData, onError) => {
  if (!db) return () => {};
  return onSnapshot(settingsDoc('aiPrompt'),
    snap => onData(snap.exists() && snap.data().text ? snap.data().text : ""),
    onError
  );
};

export const addBannerToCloud = async (bannerData, currentUser) => {
  const u = currentUser || auth?.currentUser;
  if (!u || !db) {
    console.warn('[BannerCodex] addBannerToCloud: no user or db', { hasUser: !!u, hasDb: !!db });
    return;
  }
  const { preview, imageUrl: existingUrl, thumbnailUrl: existingThumbUrl, ...metaData } = bannerData;
  let imageUrl = existingUrl || null;
  let thumbnailUrl = existingThumbUrl || null;
  if (preview && !imageUrl) {
    const thumbnail = await compressImage(preview, 400, 0.8);
    const original = await compressImage(preview, 1200, 0.8);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    [imageUrl, thumbnailUrl] = await Promise.all([
      withTimeout(uploadBase64(original, `banners/${u.uid}/${id}-orig.jpg`), 30000, 'storage upload (original)'),
      withTimeout(uploadBase64(thumbnail, `banners/${u.uid}/${id}-thumb.jpg`), 30000, 'storage upload (thumb)'),
    ]);
  }
  const cleanData = sanitizeFirestoreData({
    ...metaData, imageUrl, thumbnailUrl,
    uploadedBy: u.uid,
    featured: metaData.featured || false,
    createdAt: metaData.createdAt || Date.now(),
  });
  await withTimeout(addDoc(bannersCol(), cleanData), 20000, 'addDoc(banners)');
  await delay(WRITE_DELAY_MS);
};

export const updateBannerInCloud = async (id, data) => {
  if (!db) return;
  const cleanData = sanitizeFirestoreData(data);
  await setDoc(bannerDoc(id), cleanData, { merge: true });
};

export const deleteBannerFromCloud = async (id) => {
  if (!db) return;
  await deleteDoc(bannerDoc(id));
};

export const fetchBannerImage = async (imageId) => {
  if (!db || !imageId) return null;
  const snap = await getDoc(bannerImageDoc(imageId));
  return snap.exists() ? snap.data() : null;
};

export const savePromptToCloud = async (text) => {
  if (!db) return;
  await setDoc(settingsDoc('aiPrompt'), { text }, { merge: true });
};

export const addBookmark = async (uid, id) => {
  if (!db || !uid) return;
  await setDoc(bookmarkDoc(uid, id), { createdAt: Date.now() });
};

export const removeBookmark = async (uid, id) => {
  if (!db || !uid) return;
  await deleteDoc(bookmarkDoc(uid, id));
};

export const batchAddBookmarks = async (uid, ids) => {
  if (!db || !uid || !ids?.length) return;
  const BATCH = 500;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = writeBatch(db);
    ids.slice(i, i + BATCH).forEach(id => batch.set(bookmarkDoc(uid, id), { createdAt: Date.now() }));
    await batch.commit();
  }
};

export const batchRemoveBookmarks = async (uid, ids) => {
  if (!db || !uid || !ids?.length) return;
  const BATCH = 500;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = writeBatch(db);
    ids.slice(i, i + BATCH).forEach(id => batch.delete(bookmarkDoc(uid, id)));
    await batch.commit();
  }
};

// ─── 개인 폴더 (codexFolders) ─────────────────────────────────────────────
// 멤버십은 폴더 doc 안의 bannerIds 배열로 표현. PromptArc 폴더와 분리된 별도 컬렉션.
//   artifacts/{appId}/users/{uid}/codexFolders/{folderId} = { name, bannerIds: [], createdAt, updatedAt }
const folderCol = (uid) => collection(db, 'artifacts', appId, 'users', uid, 'codexFolders');
const folderDoc = (uid, fid) => doc(db, 'artifacts', appId, 'users', uid, 'codexFolders', fid);

export const fetchFoldersOnce = async (uid) => {
  if (!db || !uid) return [];
  const snap = await getDocs(folderCol(uid));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createFolder = async (uid, name) => {
  if (!db || !uid) throw new Error('login required');
  const ref = doc(folderCol(uid));
  const now = Date.now();
  const data = { name, bannerIds: [], createdAt: now, updatedAt: now };
  await setDoc(ref, data);
  return { id: ref.id, ...data };
};

export const renameFolder = async (uid, fid, name) => {
  if (!db || !uid) return;
  await setDoc(folderDoc(uid, fid), { name, updatedAt: Date.now() }, { merge: true });
};

export const deleteFolder = async (uid, fid) => {
  if (!db || !uid) return;
  await deleteDoc(folderDoc(uid, fid));
};

// 배너를 여러 폴더에 toggle — Firestore arrayUnion/arrayRemove 로 race-free 처리.
//   folderUpdates = [{ id, add }]  add=true: 추가, false: 제거
export const setBannerInFolders = async (uid, bannerId, folderUpdates) => {
  if (!db || !uid || !bannerId || !folderUpdates?.length) return;
  const now = Date.now();
  const batch = writeBatch(db);
  for (const { id: fid, add } of folderUpdates) {
    const ref = folderDoc(uid, fid);
    batch.set(ref, {
      bannerIds: add ? arrayUnion(bannerId) : arrayRemove(bannerId),
      updatedAt: now,
    }, { merge: true });
  }
  await batch.commit();
};

// 기존 bookmarks 컬렉션을 '내 모음' 기본 폴더로 1회 마이그레이션. 이미 마이그레이션 됐는지는
// codexFolders 컬렉션이 비어 있는지로 판정. 안전하게 idempotent.
export const migrateBookmarksToFolderIfNeeded = async (uid) => {
  if (!db || !uid) return null;
  const foldersSnap = await getDocs(folderCol(uid));
  if (!foldersSnap.empty) return null; // 이미 폴더 있음 → 마이그레이션 건너뜀
  const bookmarksSnap = await getDocs(bookmarksCol(uid));
  if (bookmarksSnap.empty) return null;
  const bannerIds = bookmarksSnap.docs.map(d => d.id);
  const ref = doc(folderCol(uid));
  const now = Date.now();
  await setDoc(ref, { name: '내 모음', bannerIds, createdAt: now, updatedAt: now });
  // bookmarks 는 그대로 둠 (안전). 별도 마이그레이션 후 cleanup 가능.
  return { id: ref.id, name: '내 모음', bannerIds, createdAt: now, updatedAt: now };
};
