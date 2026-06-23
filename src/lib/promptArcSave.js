// 생성 앱(RubiconForge 리스킨 등) → PromptArc 자동 저장 헬퍼.
// 렌더 결과 이미지 + 프롬프트를 PromptArc 공개 컬렉션에 prompt 문서로 만들고,
// 사용자의 지정 폴더(없으면 생성)에 담는다. 스키마는 PromptArc usePrompts.savePrompt 와 호환:
//   prompts: artifacts/{appId}/public/data/prompts/{id}  — content/images/thumbnail/tags/ownerUid/visibility/type ...
//   folders: users/{uid}/folders/{id}                     — { name, items:[promptId], createdAt }

import {
  collection, doc, setDoc, getDocs, query, where, addDoc, updateDoc, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "./firebase";
import { uploadBase64 } from "./storage";

const promptsCol = () => (db ? collection(db, "artifacts", appId, "public", "data", "prompts") : null);
const foldersCol = (uid) => (uid && db ? collection(db, "users", uid, "folders") : null);

// 이름으로 폴더 조회 → 없으면 생성. folderId 반환(실패 시 null).
async function ensureFolder(uid, name) {
  const col = foldersCol(uid);
  if (!col || !name) return null;
  try {
    const snap = await getDocs(query(col, where("name", "==", name)));
    if (!snap.empty) return snap.docs[0].id;
    const ref = await addDoc(col, { name, items: [], createdAt: serverTimestamp() });
    return ref.id;
  } catch (e) {
    console.warn("[promptArcSave] ensureFolder failed", e);
    return null;
  }
}

/**
 * 렌더 결과 1건을 PromptArc 에 저장.
 * @param {string} uid 로그인 사용자 uid
 * @param {{imageDataUrl:string, promptText?:string, title?:string, tags?:string[], folderName?:string, type?:string}} payload
 * @returns {Promise<{ok:boolean, id?:string, error?:string}>}
 */
export async function savePromptToArc(uid, payload = {}) {
  if (!uid) return { ok: false, error: "로그인이 필요합니다." };
  const col = promptsCol();
  if (!col) return { ok: false, error: "Firestore 가 초기화되지 않았습니다." };
  const { imageDataUrl, promptText = "", title, tags = [], folderName, type = "3D/렌더링" } = payload;
  try {
    // dataURL 이면 Cloudinary 업로드 → URL 저장(Firestore 1MB 한도 회피). 이미 URL 이면 그대로.
    let imageUrl = imageDataUrl || "";
    if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
      imageUrl = await uploadBase64(imageUrl);
    }
    const id = Math.random().toString(36).slice(2);
    const now = Date.now();
    const record = {
      id,
      title: title || "리스킨 결과",
      content: promptText || "",
      images: imageUrl ? [imageUrl] : [],
      thumbnail: imageUrl || "",
      tags: tags.length ? tags : ["리스킨"],
      aiKeywords: "",
      ownerUid: uid,
      authorId: uid,
      // 자동 저장물은 본인만 보이도록 private — 공개 피드 오염 방지.
      visibility: "private",
      likeCount: 0,
      type,
      source: "rubicon-forge",
      parentId: null,
      relatedIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(col, id), record);
    if (folderName) {
      const folderId = await ensureFolder(uid, folderName);
      const fcol = foldersCol(uid);
      if (folderId && fcol) {
        try { await updateDoc(doc(fcol, folderId), { items: arrayUnion(id) }); }
        catch (e) { console.warn("[promptArcSave] folder attach failed", e); }
      }
    }
    return { ok: true, id };
  } catch (e) {
    console.error("[promptArcSave] save failed", e);
    return { ok: false, error: e?.message || String(e) };
  }
}
