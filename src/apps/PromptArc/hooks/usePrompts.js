import { useState, useEffect, useCallback } from "react";
import {
  setDoc, deleteDoc, onSnapshot, writeBatch, updateDoc, increment,
  arrayUnion, arrayRemove,
} from "firebase/firestore";
import {
  db, promptsCollection, promptDocRef,
  favoritesCollection, favoriteDocRef,
  likesCollection, likeDocRef,
  serializeForFirestore, deserializeFromFirestore,
} from "../services/firebase";
import { uploadPromptImages } from "../services/cloudinary";
import { inferRelatedType } from "../constants/categories";

export function usePrompts({ user, showToast }) {
  const [prompts, setPrompts] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [likedIds, setLikedIds] = useState(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  // Prompts (public)
  useEffect(() => {
    const col = promptsCollection();
    if (!col) { setIsHydrated(true); return; }
    setIsHydrated(false);
    let resolved = false;
    const watchdog = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[PromptArc] Firestore listener watchdog: no response in 10s. 인증·네트워크·Rules를 확인하세요.');
        showToast('Firestore 응답이 10초 내에 없습니다. (F12 콘솔 확인)', 'error');
        setIsHydrated(true);
      }
    }, 10000);
    const unsubscribe = onSnapshot(
      col,
      (snap) => {
        resolved = true;
        clearTimeout(watchdog);
        const arr = snap.docs.map(d => deserializeFromFirestore({ ...d.data(), id: d.id }));
        setPrompts(arr);
        setIsHydrated(true);
      },
      (err) => {
        resolved = true;
        clearTimeout(watchdog);
        console.error('[PromptArc] Firestore listener error', err);
        showToast(`Firestore 연결 실패: ${err.code || err.message}`, 'error');
        setIsHydrated(true);
      }
    );
    return () => { clearTimeout(watchdog); unsubscribe(); };
  }, [showToast]);

  // Favorites (per-user, private)
  useEffect(() => {
    const col = favoritesCollection(user?.uid);
    if (!col) { setFavoriteIds(new Set()); return; }
    const unsub = onSnapshot(col,
      (snap) => setFavoriteIds(new Set(snap.docs.map(d => d.id))),
      (err) => console.error('[PromptArc] favorites listener error', err)
    );
    return () => unsub();
  }, [user]);

  // Likes (per-user, private — drives the heart on/off state)
  useEffect(() => {
    const col = likesCollection(user?.uid);
    if (!col) { setLikedIds(new Set()); return; }
    const unsub = onSnapshot(col,
      (snap) => setLikedIds(new Set(snap.docs.map(d => d.id))),
      (err) => console.error('[PromptArc] likes listener error', err)
    );
    return () => unsub();
  }, [user]);

  const savePrompt = useCallback(async (editingPrompt, data) => {
    if (!user) { showToast('로그인이 필요합니다.', 'error'); throw new Error('no user'); }
    const now = Date.now();
    const id = editingPrompt?.id || Math.random().toString(36).slice(2);
    const hasPendingVideo = Array.isArray(data.videos) && data.videos.some(v => v instanceof File);
    showToast(hasPendingVideo ? '미디어 업로드 중...' : '이미지 업로드 중...');
    const withUrls = await uploadPromptImages(user.uid, id, data);

    const aggregatedTags = (() => {
      const set = new Set();
      if (Array.isArray(withUrls.stepTags)) {
        for (const st of withUrls.stepTags) {
          if (Array.isArray(st)) st.forEach(t => t && set.add(t));
        }
      }
      if (Array.isArray(withUrls.tags)) withUrls.tags.forEach(t => t && set.add(t));
      const arr = [...set];
      return arr.length > 0 ? arr : ['기타'];
    })();
    const aggregatedKeywords = (() => {
      const set = new Set();
      if (Array.isArray(withUrls.stepKeywords)) {
        for (const sk of withUrls.stepKeywords) {
          if (typeof sk !== 'string') continue;
          sk.split(',').map(s => s.trim()).filter(Boolean).forEach(k => set.add(k));
        }
      }
      if (typeof withUrls.aiKeywords === 'string') {
        withUrls.aiKeywords.split(',').map(s => s.trim()).filter(Boolean).forEach(k => set.add(k));
      }
      return [...set].join(', ');
    })();
    const baseRecord = {
      ...withUrls, id,
      tags: aggregatedTags,
      aiKeywords: aggregatedKeywords,
      ownerUid: editingPrompt?.ownerUid || user.uid,
      likeCount: editingPrompt?.likeCount || 0,
      createdAt: editingPrompt?.createdAt || now,
      updatedAt: now,
      // 연관 아이템 필드 — 신규는 빈 값, 기존은 보존.
      parentId: editingPrompt?.parentId ?? null,
      relatedIds: Array.isArray(editingPrompt?.relatedIds) ? editingPrompt.relatedIds : [],
    };
    // type 은 저장 시점에 자동 분류. 기존에 명시된 'video' 표식은 inferRelatedType 안에서 '모션'으로 매핑됨.
    const cleaned = { ...baseRecord, type: inferRelatedType(baseRecord) };
    await setDoc(promptDocRef(id), serializeForFirestore(cleaned));
    return { id, isUpdate: !!editingPrompt?.id, savedRecord: cleaned };
  }, [user, showToast]);

  // 연관 아이템 양방향 연결: A.relatedIds += B, B.relatedIds += A.
  // 자기 자신·중복은 자동 제거. 권한 부족 시 호출부에서 toast 처리.
  const linkRelated = useCallback(async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceRef = promptDocRef(sourceId);
    const targetRef = promptDocRef(targetId);
    if (!sourceRef || !targetRef) throw new Error('Firestore 참조를 만들 수 없습니다.');
    await Promise.all([
      updateDoc(sourceRef, { relatedIds: arrayUnion(targetId), updatedAt: Date.now() }),
      updateDoc(targetRef, { relatedIds: arrayUnion(sourceId), updatedAt: Date.now() }),
    ]);
  }, []);

  const linkRelatedMany = useCallback(async (sourceId, targetIds) => {
    const ids = (targetIds || []).filter(id => id && id !== sourceId);
    if (ids.length === 0) return;
    await Promise.all(ids.map(id => linkRelated(sourceId, id)));
  }, [linkRelated]);

  const unlinkRelated = useCallback(async (sourceId, targetId) => {
    if (!sourceId || !targetId) return;
    const sourceRef = promptDocRef(sourceId);
    const targetRef = promptDocRef(targetId);
    if (!sourceRef || !targetRef) return;
    try {
      await Promise.all([
        updateDoc(sourceRef, { relatedIds: arrayRemove(targetId), updatedAt: Date.now() }),
        updateDoc(targetRef, { relatedIds: arrayRemove(sourceId), updatedAt: Date.now() }),
      ]);
    } catch (e) {
      // target doc이 이미 삭제된 경우 source만 정리
      console.warn('[PromptArc] unlinkRelated partial failure', e);
      try { await updateDoc(sourceRef, { relatedIds: arrayRemove(targetId), updatedAt: Date.now() }); } catch {}
    }
  }, []);

  const deletePrompt = useCallback(async (id) => {
    await deleteDoc(promptDocRef(id));
  }, []);

  const deletePromptBatch = useCallback(async (ids) => {
    const BATCH = 500;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = writeBatch(db);
      ids.slice(i, i + BATCH).forEach(id => batch.delete(promptDocRef(id)));
      await batch.commit();
    }
  }, []);

  const toggleLike = useCallback(async (id) => {
    if (!user) { showToast('로그인이 필요합니다.', 'error'); return; }
    const isAlreadyLiked = likedIds.has(id);
    try {
      if (isAlreadyLiked) {
        await Promise.all([
          deleteDoc(likeDocRef(user.uid, id)),
          updateDoc(promptDocRef(id), { likeCount: increment(-1) }),
        ]);
      } else {
        await Promise.all([
          setDoc(likeDocRef(user.uid, id), { createdAt: Date.now() }),
          updateDoc(promptDocRef(id), { likeCount: increment(1) }),
        ]);
      }
    } catch (e) { console.error('[PromptArc] like toggle failed', e); }
  }, [user, likedIds, showToast]);

  const togglePin = useCallback(async (id, isPinned) => {
    try {
      await updateDoc(promptDocRef(id), { isPinned: !isPinned });
      showToast(!isPinned ? '추천 고정됐어요.' : '고정 해제됐어요.');
    } catch (e) {
      console.error('[PromptArc] pin failed', e);
      showToast('고정 실패: 권한이 없거나 네트워크 오류', 'error');
    }
  }, [showToast]);

  const toggleLive = useCallback(async (id, isLive) => {
    try { await updateDoc(promptDocRef(id), { isLive: !isLive }); }
    catch (e) { console.error('[PromptArc] live toggle failed', e); }
  }, []);

  const toggleFavorite = useCallback(async (id) => {
    if (!user) { showToast('로그인이 필요합니다.', 'error'); return; }
    const isFav = favoriteIds.has(id);
    try {
      if (isFav) await deleteDoc(favoriteDocRef(user.uid, id));
      else await setDoc(favoriteDocRef(user.uid, id), { createdAt: Date.now() });
    } catch (e) {
      console.error('[PromptArc] favorite toggle failed', e);
      showToast('즐겨찾기 실패', 'error');
    }
  }, [user, favoriteIds, showToast]);

  return {
    prompts,
    favoriteIds,
    likedIds,
    isHydrated,
    savePrompt,
    deletePrompt,
    deletePromptBatch,
    toggleLike,
    togglePin,
    toggleLive,
    toggleFavorite,
    linkRelated,
    linkRelatedMany,
    unlinkRelated,
    setPrompts, // exposed for import flow
  };
}
