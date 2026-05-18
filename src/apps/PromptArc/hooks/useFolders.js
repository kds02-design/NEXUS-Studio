import { useState, useEffect, useCallback } from "react";
import {
  addDoc, deleteDoc, onSnapshot, updateDoc,
  arrayUnion, arrayRemove, serverTimestamp,
} from "firebase/firestore";
import { foldersCollection, folderDocRef } from "../services/firebase";

export function useFolders({ user, showToast, setCategory, category }) {
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    const col = foldersCollection(user?.uid);
    if (!col) { setFolders([]); return; }
    const unsub = onSnapshot(col,
      (snap) => {
        const arr = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ax = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
            const bx = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
            return ax - bx;
          });
        setFolders(arr);
      },
      (err) => console.error('[PromptArc] folders listener error', err)
    );
    return () => unsub();
  }, [user]);

  const createFolder = useCallback(async (rawName) => {
    const name = String(rawName || '').trim();
    if (!name) { showToast('폴더 이름을 입력해주세요', 'error'); return; }
    const col = foldersCollection(user?.uid);
    if (!col) { showToast('로그인이 필요합니다', 'error'); return; }
    if (folders.some(f => f.name === name)) { showToast('이미 같은 이름의 폴더가 있어요', 'error'); return; }
    try {
      await addDoc(col, { name, items: [], createdAt: serverTimestamp() });
      showToast(`'${name}' 폴더가 만들어졌어요`);
    } catch (e) {
      console.error('[PromptArc] createFolder failed', e);
      showToast(`폴더 생성 실패: ${e.code || e.message}`, 'error');
    }
  }, [user, folders, showToast]);

  const renameFolder = useCallback(async (folderId, newName) => {
    const name = String(newName || '').trim();
    if (!name) { showToast('폴더 이름을 입력해주세요', 'error'); return; }
    const ref = folderDocRef(user?.uid, folderId);
    if (!ref) return;
    try {
      await updateDoc(ref, { name });
      showToast('폴더 이름이 변경됐어요');
    } catch (e) {
      console.error('[PromptArc] renameFolder failed', e);
      showToast(`폴더 이름 변경 실패: ${e.code || e.message}`, 'error');
    }
  }, [user, showToast]);

  const deleteFolder = useCallback(async (folderId) => {
    const target = folders.find(f => f.id === folderId);
    if (!target) return;
    if (!confirm(`'${target.name}' 폴더를 삭제할까요?\n폴더 안의 프롬프트 자체는 삭제되지 않습니다.`)) return;
    const ref = folderDocRef(user?.uid, folderId);
    if (!ref) return;
    try {
      await deleteDoc(ref);
      if (category === `folder:${folderId}`) setCategory('all');
      showToast('폴더가 삭제됐어요');
    } catch (e) {
      console.error('[PromptArc] deleteFolder failed', e);
      showToast(`폴더 삭제 실패: ${e.code || e.message}`, 'error');
    }
  }, [user, folders, category, setCategory, showToast]);

  const toggleFolderItem = useCallback(async (folderId, promptId) => {
    const f = folders.find(x => x.id === folderId);
    if (!f) return;
    const hasIt = (f.items || []).includes(promptId);
    const ref = folderDocRef(user?.uid, folderId);
    if (!ref) return;
    try {
      await updateDoc(ref, { items: hasIt ? arrayRemove(promptId) : arrayUnion(promptId) });
      showToast(hasIt ? `'${f.name}'에서 제거됐어요` : `'${f.name}'에 저장됐어요`);
    } catch (e) {
      console.error('[PromptArc] toggleFolderItem failed', e);
      showToast(`폴더 작업 실패: ${e.code || e.message}`, 'error');
    }
  }, [user, folders, showToast]);

  return {
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    toggleFolderItem,
  };
}
