// 에셋 컬렉션 CRUD. PromptArc services 패턴.
// 경로: artifacts/{appId}/public/data/assets/{assetId}
import {
  collection, doc, addDoc, deleteDoc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "../../../lib/firebase";
import { uploadBase64 } from "../../../lib/storage";
import { cropImageToDataUrl } from "./cropper";

const assetsColRef = () => collection(db, "artifacts", appId, "public", "data", "assets");
const assetDocRef = (id) => doc(db, "artifacts", appId, "public", "data", "assets", id);

// 실시간 구독 — createdAt desc.
export function subscribeAssets(callback, onError) {
  try {
    const q = query(assetsColRef(), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("[AssetLibrary] subscribe ordered failed, fallback:", err);
      const u = onSnapshot(assetsColRef(), (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, onError);
      return u;
    });
  } catch (e) {
    onError?.(e);
    return () => {};
  }
}

// 단일 에셋 저장 — 크롭된 dataURL 을 Cloudinary 업로드 후 Firestore 문서 생성.
// source: { app, bannerId, bannerTitle, sourceImageUrl, rect } — 출처 추적용.
export async function createAsset({
  uid,
  dataUrl,
  width,
  height,
  category,
  source,
  title = "",
  tags = [],
}) {
  if (!uid) throw new Error("로그인이 필요합니다.");
  if (!dataUrl) throw new Error("이미지가 없습니다.");
  if (!category) throw new Error("카테고리를 선택하세요.");

  // Cloudinary 업로드.
  const ts = Date.now();
  const path = `users/${uid}/assets/${category}-${ts}.jpg`;
  const url = await uploadBase64(dataUrl, path);
  if (!url) throw new Error("Cloudinary 업로드 실패");

  // Firestore 문서 생성.
  const docData = {
    imageUrl: url,
    width: Number(width) || 0,
    height: Number(height) || 0,
    category,
    title: title || "",
    tags: Array.isArray(tags) ? tags : [],
    source: source || null,
    liked: 0,
    ownerUid: uid,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(assetsColRef(), docData);
  return { id: ref.id, ...docData };
}

// 잘라낸 영역(rect: 0-1) 을 직접 크롭 + 업로드 + 문서 생성. 호출부 1줄 헬퍼.
export async function captureAndSaveAsset({ uid, sourceImageUrl, rect, category, source }) {
  const { dataUrl, width, height } = await cropImageToDataUrl(sourceImageUrl, rect);
  return await createAsset({
    uid, dataUrl, width, height, category,
    source: { ...(source || {}), sourceImageUrl, rect },
  });
}

export async function deleteAsset(id) {
  await deleteDoc(assetDocRef(id));
}

export async function toggleAssetLike(id, currentLiked) {
  await updateDoc(assetDocRef(id), { liked: currentLiked ? 0 : 1 });
}

export async function updateAssetMeta(id, patch) {
  await updateDoc(assetDocRef(id), patch);
}
