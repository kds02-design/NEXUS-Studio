// 게임 로고 — 전역 단일 진실 소스.
// 저장 위치: artifacts/{appId}/public/data/settings/gameLogos
//   { [gameName]: base64 dataURL }
// 관리 UI 는 NexusAdmin → "게임 로고" 패널 한 곳에서만. BannerCodex / PromotionArchive 등
// 다른 앱은 `subscribeToGameLogos` 로 읽기만 한다.
//
// 로고 이미지는 150px 폭 JPEG 로 압축해서 base64 그대로 doc 에 저장한다.
// Cloudinary URL 을 쓰지 않는 이유:
//   1) 로고 한 장이 ~5KB 수준이라 doc 1MB 제한 안에 수십 개 들어간다.
//   2) 사이드바 칩처럼 동시에 많이 그려져서 외부 GET 라운드트립을 줄이는 게 유리.

import { onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { db, appId } from "./firebase";

const logosDocRef = () => doc(db, "artifacts", appId, "public", "data", "settings", "gameLogos");

export function subscribeToGameLogos(onData, onError) {
  if (!db) return () => {};
  return onSnapshot(
    logosDocRef(),
    (snap) => onData(snap.exists() ? snap.data() : {}),
    onError,
  );
}

export async function getGameLogosOnce() {
  if (!db) return {};
  const snap = await getDoc(logosDocRef());
  return snap.exists() ? snap.data() : {};
}

export async function saveGameLogo(gameName, base64) {
  if (!db || !gameName) return;
  await setDoc(logosDocRef(), { [gameName]: base64 }, { merge: true });
}

export async function removeGameLogo(gameName) {
  if (!db || !gameName) return;
  const snap = await getDoc(logosDocRef());
  if (!snap.exists()) return;
  const data = { ...snap.data() };
  delete data[gameName];
  await setDoc(logosDocRef(), data);
}

// 업로드 파일 → 150px 폭 JPEG base64 dataURL.
// File 또는 Blob 을 받아 압축하고 dataURL 반환.
export function compressLogoFile(file, maxWidth = 150, quality = 0.9) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = String(e.target?.result || "");
      if (!base64) { resolve(null); return; }
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
