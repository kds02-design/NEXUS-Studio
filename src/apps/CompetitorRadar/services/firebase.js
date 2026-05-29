// CompetitorRadar — Firestore CRUD + 실시간 구독 + URL 기반 중복제거.
// 경로 패턴은 PromotionArchive/BannerCodex 와 동일: artifacts/{appId}/public/data/...
import {
  collection, doc, addDoc, setDoc, deleteDoc, getDocs, onSnapshot,
  query, where, limit, increment, serverTimestamp,
} from "firebase/firestore";
import { db, appId, auth } from "../../../lib/firebase";
import { uploadBase64 } from "../../../lib/storage";

export { db, appId, auth };

const entriesCol = () => collection(db, "artifacts", appId, "public", "data", "competitor-entries");
const entryDoc = (id) => doc(db, "artifacts", appId, "public", "data", "competitor-entries", id);
const reportsCol = () => collection(db, "artifacts", appId, "public", "data", "competitor-reports");
const reportDoc = (id) => doc(db, "artifacts", appId, "public", "data", "competitor-reports", id);

// URL 정규화 — 중복 판정 키. 프로토콜/www/trailing slash/쿼리/해시 제거, 소문자.
export const normalizeUrlKey = (url) => {
  if (!url || typeof url !== "string") return "";
  let s = url.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split("#")[0].split("?")[0];
  s = s.replace(/\/+$/, "");
  return s;
};

const isDataUrl = (v) => typeof v === "string" && v.startsWith("data:");

// 실시간 구독 — 엔트리 전체 (capturedAt 내림차순 정렬은 클라이언트에서).
export const subscribeToEntries = (onData, onError) => {
  if (!db) return () => {};
  return onSnapshot(entriesCol(), (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => String(b.capturedAt || "").localeCompare(String(a.capturedAt || "")));
    onData(data);
  }, onError);
};

export const subscribeToReports = (onData, onError) => {
  if (!db) return () => {};
  return onSnapshot(reportsCol(), (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
    onData(data);
  }, onError);
};

const findByUrlKey = async (urlKey) => {
  if (!urlKey) return null;
  const snap = await getDocs(query(entriesCol(), where("urlKey", "==", urlKey), limit(1)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

// 엔트리 등록. images = { full: dataUrl|url, preview?: dataUrl|url, mobile?: dataUrl|url }.
// urlKey 중복 시 새로 만들지 않고 seenCount/lastSeenAt 갱신 → { dupId, isNew:false }.
export const addEntry = async ({ competitor, game, sourceUrl, category, images = {} }, currentUser) => {
  const u = currentUser || auth?.currentUser;
  if (!db) throw new Error("db 없음");
  const urlKey = normalizeUrlKey(sourceUrl);

  if (urlKey) {
    const existing = await findByUrlKey(urlKey);
    if (existing) {
      await setDoc(entryDoc(existing.id), { seenCount: increment(1), lastSeenAt: new Date().toISOString() }, { merge: true });
      return { dupId: existing.id, isNew: false };
    }
  }

  // 이미지 업로드 — dataURL 만 Cloudinary 로, 이미 URL 이면 그대로.
  const up = async (v) => (isDataUrl(v) ? await uploadBase64(v) : (v || null));
  const [full_image, preview, mobile_image] = await Promise.all([
    up(images.full), up(images.preview || images.full), up(images.mobile),
  ]);

  const now = new Date().toISOString();
  const data = {
    competitor: competitor || "미상",
    game: game || "",
    title: "",
    category: category || "promotion",
    sourceUrl: sourceUrl || "",
    urlKey,
    full_image, preview, mobile_image,
    capturedAt: now,
    promoDate: { year: "", month: "", fullDate: "" },
    tags: [], styleTraits: [], colorPalette: [], layoutPattern: "", copyTone: "", summary: "",
    isAnalyzed: false, analyzedAt: null,
    isNew: true, seenCount: 1, lastSeenAt: now,
    ownerUid: u?.uid || null,
    visibility: "public",
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(entriesCol(), data);
  return { id: ref.id, isNew: true };
};

export const updateEntry = async (id, patch) => {
  if (!db || !id) return;
  await setDoc(entryDoc(id), patch, { merge: true });
};

export const deleteEntry = async (id) => {
  if (!db || !id) return;
  await deleteDoc(entryDoc(id));
};

// 리포트 저장.
export const addReport = async ({ periodStart, periodEnd, markdown, entryIds = [] }, currentUser) => {
  const u = currentUser || auth?.currentUser;
  if (!db) throw new Error("db 없음");
  const ref = await addDoc(reportsCol(), {
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
    markdown: markdown || "",
    entryIds,
    generatedAt: new Date().toISOString(),
    generatedBy: u?.uid || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const deleteReport = async (id) => {
  if (!db || !id) return;
  await deleteDoc(reportDoc(id));
};
