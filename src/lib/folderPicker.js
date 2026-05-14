// File System Access API helper.
// - showDirectoryPicker → DirectoryHandle
// - 재귀로 이미지(jpg/jpeg/png/webp/gif)만 수집
// - DirectoryHandle을 IndexedDB에 저장 → 재방문 시 같은 폴더 다시 열기 가능
//   (FileSystemHandle은 structured-cloneable이라 IDB에 저장 가능. localStorage엔 못 저장)

export const SUPPORTED_IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

const isSupportedImage = (name) => {
  const ext = String(name).split(".").pop()?.toLowerCase();
  return SUPPORTED_IMAGE_EXTS.has(ext);
};

const IDB_DB = "fs-handles";
const IDB_STORE = "handles";

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirectoryHandle(key, handle) {
  const idb = await openIdb();
  await new Promise((res, rej) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(handle, key);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
  idb.close();
}

export async function loadDirectoryHandle(key) {
  const idb = await openIdb();
  const result = await new Promise((res, rej) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const r = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
  idb.close();
  return result;
}

export async function clearDirectoryHandle(key) {
  const idb = await openIdb();
  await new Promise((res, rej) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
  idb.close();
}

// 권한 확인/요청 (브라우저 보안 정책상 반드시 user gesture 안에서 호출돼야 함)
export async function ensureReadPermission(handle) {
  if (!handle?.queryPermission) return false;
  const opts = { mode: "read" };
  try {
    if ((await handle.queryPermission(opts)) === "granted") return true;
    return (await handle.requestPermission(opts)) === "granted";
  } catch (e) {
    console.warn("[folderPicker] permission check failed", e);
    return false;
  }
}

// 사용자에게 폴더 선택 다이얼로그 띄우기
export async function pickDirectory(options = {}) {
  if (typeof window === "undefined" || !window.showDirectoryPicker) {
    throw new Error("이 브라우저는 폴더 선택 기능을 지원하지 않습니다. (Chrome/Edge 권장)");
  }
  return await window.showDirectoryPicker({ mode: "read", ...options });
}

// 재귀적으로 이미지 파일만 수집. 각 File에 webkitRelativePath 속성 부여 (UploadModal과 호환).
export async function* walkImageFiles(dirHandle, currentPath = "") {
  for await (const [name, h] of dirHandle.entries()) {
    const p = currentPath ? `${currentPath}/${name}` : name;
    if (h.kind === "file") {
      if (!isSupportedImage(name)) continue;
      let file;
      try { file = await h.getFile(); } catch { continue; }
      try { Object.defineProperty(file, "webkitRelativePath", { value: p, configurable: true }); }
      catch {}
      yield file;
    } else if (h.kind === "directory") {
      yield* walkImageFiles(h, p);
    }
  }
}

export async function collectImageFiles(dirHandle, onProgress) {
  const files = [];
  let n = 0;
  for await (const f of walkImageFiles(dirHandle)) {
    files.push(f);
    n++;
    if (onProgress && n % 50 === 0) onProgress(n);
  }
  if (onProgress) onProgress(n);
  return files;
}
