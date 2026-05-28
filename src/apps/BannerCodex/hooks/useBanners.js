import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  fetchBannersOnce, subscribeToBanners, subscribeToPrompt,
  addBannerToCloud, updateBannerInCloud, deleteBannerFromCloud,
  delay, WRITE_DELAY_MS, db,
  fetchFoldersOnce, createFolder as createFolderCloud,
  renameFolder as renameFolderCloud, deleteFolder as deleteFolderCloud,
  setBannerInFolders, migrateBookmarksToFolderIfNeeded,
} from '../services/firebase';
import { subscribeToGameLogos } from '../../../lib/gameLogos';

export const useBanners = (user, sortOrder) => {
  const [banners, setBanners] = useState([]);
  const [tempBanners, setTempBanners] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [folders, setFolders] = useState([]); // [{ id, name, bannerIds, createdAt, updatedAt }]
  const [gameLogos, setGameLogos] = useState({});
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const prevSortOrderRef = useRef(sortOrder);

  useEffect(() => {
    const watchdog = setTimeout(() => {
      setIsLoadingData(prev => {
        if (prev) console.warn('[BannerCodex] watchdog: still loading after 8s, releasing spinner');
        return false;
      });
    }, 8000);
    return () => clearTimeout(watchdog);
  }, []);


  // 폴더 로드 + 기존 bookmarks 1회 마이그레이션. onSnapshot 제거 — 일회성 fetch.
  useEffect(() => {
    if (!user || !db) { setFolders([]); return; }
    (async () => {
      try {
        const migrated = await migrateBookmarksToFolderIfNeeded(user.uid);
        const arr = await fetchFoldersOnce(user.uid);
        // 마이그레이션 직후엔 fetch 가 빈 결과를 반환할 수도 있어서 migrated 포함해 set.
        const merged = migrated && !arr.find(f => f.id === migrated.id) ? [...arr, migrated] : arr;
        setFolders(merged);
      } catch (e) { console.error('[BannerCodex] folders load failed', e); }
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !db) return;
    const unsubLogos = subscribeToGameLogos(setGameLogos, (e) => console.error('logo listener', e));
    const unsubPrompt = subscribeToPrompt(setCustomAiPrompt, (e) => console.error('prompt listener', e));
    return () => { unsubLogos(); unsubPrompt(); };
  }, [user]);

  // 수동 새로고침 — 일회성 fetch (필요 시 호출).
  const refresh = useCallback(async () => {
    if (!user || !db) return;
    try {
      const data = await fetchBannersOnce(sortOrder);
      setBanners(data);
    } catch (e) {
      console.error('[BannerCodex] refresh failed', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [user, sortOrder]);

  // 실시간 구독 복원 — read 폭주의 진짜 원인(cartIds 무한 루프)은 해결됨.
  useEffect(() => {
    if (!user || !db) return;
    const isMajorChange = prevSortOrderRef.current !== sortOrder || banners.length === 0;
    if (isMajorChange) setIsLoadingData(true);
    prevSortOrderRef.current = sortOrder;
    const dataWatchdog = setTimeout(() => {
      console.warn('[BannerCodex] data listener: no response in 8s. Releasing spinner.');
      setIsLoadingData(false);
    }, 8000);
    const unsub = subscribeToBanners(sortOrder, (data) => {
      clearTimeout(dataWatchdog);
      setBanners(data);
      setIsLoadingData(false);
    }, (error) => {
      clearTimeout(dataWatchdog);
      console.error('[BannerCodex] listener error:', error);
      setIsLoadingData(false);
    });
    return () => { clearTimeout(dataWatchdog); unsub(); };
  }, [user, sortOrder]);

  // ─ 본인 변경은 낙관적 local 갱신 ─
  // onSnapshot 을 제거했으니 cloud 만 갱신하면 화면이 stale. 모든 mutate 함수가
  // local state 도 즉시 반영하도록 변경 (실패 시 콘솔에만 남기고 사용자에겐 그대로 노출).
  const addBanner = useCallback(async (data) => {
    try {
      const newBanner = await addBannerToCloud(data, user);
      if (newBanner?.id) setBanners(prev => [newBanner, ...prev]);
      else await refresh(); // 반환값 모르면 안전하게 새로고침
    }
    catch (e) { console.error('[BannerCodex] addBanner failed:', e); throw e; }
  }, [user, refresh]);

  const updateBanner = useCallback(async (id, data) => {
    if (id?.startsWith?.('temp_')) {
      setTempBanners(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
      return;
    }
    if (!user || !db) return;
    // 낙관적 갱신 — Firestore write 와 무관하게 local 즉시 반영.
    setBanners(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    try { await updateBannerInCloud(id, data); }
    catch (e) { console.error("Update failed", e); }
  }, [user]);

  const deleteBanner = useCallback(async (id) => {
    if (id?.startsWith?.('temp_')) {
      setTempBanners(prev => prev.filter(b => b.id !== id));
      return;
    }
    if (!user || !db) return;
    setBanners(prev => prev.filter(b => b.id !== id));
    try { await deleteBannerFromCloud(id); }
    catch (e) { console.error("Delete failed", e); }
  }, [user]);

  const addTempBanners = useCallback((newTemps) => {
    setTempBanners(prev => [...prev, ...newTemps]);
  }, []);

  // 호환 alias — 기존 cartIds 호출처를 깨뜨리지 않기 위해 모든 폴더의 bannerIds 합집합 반환.
  // useMemo 필수 — 매 렌더마다 새 배열 reference 를 만들면 useFilter 의 deps 가 매번 바뀌어
  // setState 무한 루프 (Maximum update depth exceeded) 발생.
  const cartIds = useMemo(() => {
    const set = new Set();
    folders.forEach(f => (f.bannerIds || []).forEach(id => set.add(id)));
    return Array.from(set);
  }, [folders]);

  // ─── 폴더 CRUD ────────────────────────────────────────────────────────
  const createFolder = useCallback(async (name) => {
    if (!user || !db) return null;
    try {
      const f = await createFolderCloud(user.uid, name);
      setFolders(prev => [...prev, f]);
      return f;
    } catch (e) { console.error('[BannerCodex] createFolder failed', e); throw e; }
  }, [user]);

  const renameFolder = useCallback(async (fid, name) => {
    if (!user || !db) return;
    setFolders(prev => prev.map(f => f.id === fid ? { ...f, name } : f));
    try { await renameFolderCloud(user.uid, fid, name); }
    catch (e) { console.error('[BannerCodex] renameFolder failed', e); }
  }, [user]);

  const deleteFolder = useCallback(async (fid) => {
    if (!user || !db) return;
    setFolders(prev => prev.filter(f => f.id !== fid));
    try { await deleteFolderCloud(user.uid, fid); }
    catch (e) { console.error('[BannerCodex] deleteFolder failed', e); }
  }, [user]);

  // 배너 1개를 여러 폴더에 toggle. folderUpdates = [{ id, add }]
  const updateFolderMembership = useCallback(async (bannerId, folderUpdates) => {
    if (!user || !db || !folderUpdates?.length) return;
    // 낙관적 갱신
    setFolders(prev => prev.map(f => {
      const upd = folderUpdates.find(u => u.id === f.id);
      if (!upd) return f;
      const current = f.bannerIds || [];
      const has = current.includes(bannerId);
      if (upd.add && !has) return { ...f, bannerIds: [...current, bannerId] };
      if (!upd.add && has) return { ...f, bannerIds: current.filter(id => id !== bannerId) };
      return f;
    }));
    try { await setBannerInFolders(user.uid, bannerId, folderUpdates); }
    catch (e) { console.error('[BannerCodex] setBannerInFolders failed', e); }
  }, [user]);

  // 다중 배너 → 한 폴더에 일괄 추가/제거
  const bulkSetFolderMembership = useCallback(async (folderId, bannerIds, add) => {
    if (!user || !db || !folderId || !bannerIds?.length) return;
    // 낙관적
    setFolders(prev => prev.map(f => {
      if (f.id !== folderId) return f;
      const current = new Set(f.bannerIds || []);
      bannerIds.forEach(id => add ? current.add(id) : current.delete(id));
      return { ...f, bannerIds: Array.from(current) };
    }));
    try {
      // 순차 처리 — Firestore arrayUnion/arrayRemove 는 batch 안에서 단일 doc 다중 op 안 됨.
      for (const bid of bannerIds) {
        await setBannerInFolders(user.uid, bid, [{ id: folderId, add }]);
      }
    } catch (e) { console.error('[BannerCodex] bulkSetFolderMembership failed', e); }
  }, [user]);

  // ─── 기존 cart 호출처 호환 alias ──────────────────────────────────────
  // 단일 toggle: '내 모음' 또는 첫 폴더에 toggle. 멀티 폴더 선택은 popover 별도.
  const ensureDefaultFolder = useCallback(async () => {
    let defaultFolder = folders.find(f => f.name === '내 모음') || folders[0];
    if (!defaultFolder) defaultFolder = await createFolder('내 모음');
    return defaultFolder;
  }, [folders, createFolder]);

  const toggleCartItem = useCallback(async (id) => {
    const f = await ensureDefaultFolder();
    if (!f) return false;
    const has = (f.bannerIds || []).includes(id);
    await updateFolderMembership(id, [{ id: f.id, add: !has }]);
    return true;
  }, [ensureDefaultFolder, updateFolderMembership]);

  const addToCart = useCallback(async (ids) => {
    if (!ids?.length) return;
    const f = await ensureDefaultFolder();
    if (!f) return;
    await bulkSetFolderMembership(f.id, ids, true);
  }, [ensureDefaultFolder, bulkSetFolderMembership]);

  const removeFromCart = useCallback(async (ids) => {
    if (!ids?.length) return;
    const f = await ensureDefaultFolder();
    if (!f) return;
    await bulkSetFolderMembership(f.id, ids, false);
  }, [ensureDefaultFolder, bulkSetFolderMembership]);

  const deleteMany = useCallback(async (ids, chunkSize = 3) => {
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      await Promise.all(chunk.map(id => deleteBanner(id)));
      await delay(WRITE_DELAY_MS);
    }
  }, [deleteBanner]);

  return {
    banners, tempBanners, isLoadingData, cartIds, gameLogos, customAiPrompt,
    setTempBanners, setCustomAiPrompt, setGameLogos,
    addBanner, updateBanner, deleteBanner, deleteMany,
    addTempBanners,
    // 폴더 시스템 (신규)
    folders, createFolder, renameFolder, deleteFolder,
    updateFolderMembership, bulkSetFolderMembership,
    // 기존 cart 호출처 호환 alias
    toggleCartItem, addToCart, removeFromCart,
    refresh,
  };
};
