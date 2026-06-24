// 생성 앱(RubiconForge 리스킨 등) → PromptArc 자동 저장 헬퍼.
// 렌더 결과 이미지 + 프롬프트를 PromptArc 공개 컬렉션에 prompt 문서로 만들고,
// 사용자의 지정 폴더(없으면 생성)에 담는다. 스키마는 PromptArc usePrompts.savePrompt 와 호환:
//   prompts: artifacts/{appId}/public/data/prompts/{id}  — content/images/thumbnail/tags/ownerUid/visibility/type ...
//   folders: users/{uid}/folders/{id}                     — { name, items:[promptId], createdAt }

import {
  collection, doc, setDoc, deleteDoc, getDocs, query, where, addDoc, updateDoc, arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "./firebase";
import { uploadBase64 } from "./storage";

const promptsCol = () => (db ? collection(db, "artifacts", appId, "public", "data", "prompts") : null);
const foldersCol = (uid) => (uid && db ? collection(db, "users", uid, "folders") : null);

// 자동 저장물은 '임시 파일' — 2단계 수명:
//   활성 보관(TEMP_TTL_DAYS) → 만료 시 '쓰레기통' 폴더로 이동 → 휴지통 보관(TRASH_TTL_DAYS) → 영구 삭제.
export const TEMP_TTL_DAYS = 15;   // 활성 보관 기간 (이후 휴지통 이동)
export const TRASH_TTL_DAYS = 15;  // 휴지통 보관 기간 (이후 영구 삭제)
export const TRASH_FOLDER_NAME = "쓰레기통";
const DAY_MS = 24 * 60 * 60 * 1000;
const TEMP_TTL_MS = TEMP_TTL_DAYS * DAY_MS;
const TRASH_TTL_MS = TRASH_TTL_DAYS * DAY_MS;

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
      // 임시 파일 — 10일 뒤 자동 삭제 대상(클라이언트 스윕). sweepExpiredTempPrompts 참조.
      temporary: true,
      expiresAt: now + TEMP_TTL_MS,
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

// 임시 파일 2단계 수명 스윕 — 백엔드 크론이 없으므로 클라이언트에서 처리.
// 이미 메모리에 로드된 prompts 배열을 재사용(추가 쿼리 없음). 본인 소유 + 비공개(visibility!=='public') 만 대상:
//   1) 활성 만료(!trashed, expiresAt<now)  → trashed 마킹 + 쓰레기통 폴더로 이동
//   2) 휴지통 만료(trashed, trashExpiresAt<now) → 영구 삭제
// 공개로 전환한 항목은 두 단계 모두 제외(보존). 반환: { trashed, deleted } 건수.
export async function sweepExpiredTempPrompts(uid, prompts, now = Date.now()) {
  const empty = { trashed: 0, deleted: 0 };
  if (!uid || !Array.isArray(prompts) || prompts.length === 0) return empty;
  const mine = prompts.filter(p => p && p.ownerUid === uid && p.temporary === true && p.visibility !== "public");
  if (mine.length === 0) return empty;

  const toTrash = mine.filter(p => p.trashed !== true && typeof p.expiresAt === "number" && p.expiresAt < now);
  const toDelete = mine.filter(p => p.trashed === true && typeof p.trashExpiresAt === "number" && p.trashExpiresAt < now);
  if (toTrash.length === 0 && toDelete.length === 0) return empty;

  const col = promptsCol();
  if (!col) return empty;

  // 1) 문서 상태 변경: 활성 만료 → trashed 마킹(+휴지통 만료시각), 휴지통 만료 → 삭제.
  await Promise.all([
    ...toTrash.map(p => updateDoc(doc(col, p.id), {
      trashed: true, trashExpiresAt: now + TRASH_TTL_MS, updatedAt: now,
    }).catch(e => console.warn("[tempSweep] trash mark failed", p.id, e?.code || e))),
    ...toDelete.map(p => deleteDoc(doc(col, p.id))
      .catch(e => console.warn("[tempSweep] delete failed", p.id, e?.code || e))),
  ]);

  // 2) 폴더 재배치: 새로 버린 것 → 쓰레기통 추가 + 원래 폴더에서 제거, 삭제분 → 쓰레기통에서도 제거.
  try {
    const fcol = foldersCol(uid);
    if (fcol) {
      const trashId = toTrash.length ? await ensureFolder(uid, TRASH_FOLDER_NAME) : null;
      const trashSet = new Set(toTrash.map(p => p.id));
      const delSet = new Set(toDelete.map(p => p.id));
      const snap = await getDocs(fcol);
      await Promise.all(snap.docs.map(d => {
        const items = Array.isArray(d.data().items) ? d.data().items : [];
        let next;
        if (d.id === trashId) {
          next = items.filter(id => !delSet.has(id));                 // 휴지통: 삭제분 제거
          for (const id of trashSet) if (!next.includes(id)) next.push(id); // + 새로 버린 것 추가
        } else {
          next = items.filter(id => !trashSet.has(id) && !delSet.has(id)); // 다른 폴더: 버린/삭제분 제거
        }
        const changed = next.length !== items.length || next.some((v, i) => v !== items[i]);
        return changed ? updateDoc(doc(fcol, d.id), { items: next }).catch(() => {}) : null;
      }));
    }
  } catch (e) {
    console.warn("[tempSweep] folder reorg skipped", e?.code || e);
  }
  return { trashed: toTrash.length, deleted: toDelete.length };
}
