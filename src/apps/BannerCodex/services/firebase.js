import {
  collection, query, onSnapshot, addDoc, deleteDoc, doc, getDoc,
  setDoc, writeBatch
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

export const subscribeToBanners = (sortOrder, onData, onError) => {
  if (!db) return () => {};
  const q = query(bannersCol());
  return onSnapshot(q, (snapshot) => {
    const toMs = (v) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
      if (v && typeof v.toMillis === 'function') return v.toMillis();
      return 0;
    };
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (sortOrder === 'oldest') data.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
    else if (sortOrder === 'popular') data.sort((a, b) => (b.liked === a.liked ? 0 : b.liked ? 1 : -1));
    else if (sortOrder === 'score') data.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));
    else data.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
    onData(data);
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
