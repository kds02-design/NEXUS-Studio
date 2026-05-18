import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToBanners, subscribeToBookmarks, subscribeToGameLogos, subscribeToPrompt,
  addBannerToCloud, updateBannerInCloud, deleteBannerFromCloud,
  addBookmark, removeBookmark, batchAddBookmarks, batchRemoveBookmarks,
  delay, WRITE_DELAY_MS, db
} from '../services/firebase';

export const useBanners = (user, sortOrder) => {
  const [banners, setBanners] = useState([]);
  const [tempBanners, setTempBanners] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [cartIds, setCartIds] = useState([]);
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


  useEffect(() => {
    if (!user || !db) { setCartIds([]); return; }
    return subscribeToBookmarks(user.uid, setCartIds, (err) =>
      console.error('[BannerCodex] bookmarks listener error', err));
  }, [user]);

  useEffect(() => {
    if (!user || !db) return;
    const unsubLogos = subscribeToGameLogos(setGameLogos, (e) => console.error('logo listener', e));
    const unsubPrompt = subscribeToPrompt(setCustomAiPrompt, (e) => console.error('prompt listener', e));
    return () => { unsubLogos(); unsubPrompt(); };
  }, [user]);

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
      console.error('[BannerCodex] Firestore listener error:', error);
      setIsLoadingData(false);
    });
    return () => { clearTimeout(dataWatchdog); unsub(); };
  }, [user, sortOrder]);

  const addBanner = useCallback(async (data) => {
    try { await addBannerToCloud(data, user); }
    catch (e) { console.error('[BannerCodex] addBanner failed:', e); throw e; }
  }, [user]);

  const updateBanner = useCallback(async (id, data) => {
    if (id?.startsWith?.('temp_')) {
      setTempBanners(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
      return;
    }
    if (!user || !db) return;
    try { await updateBannerInCloud(id, data); }
    catch (e) { console.error("Update failed", e); }
  }, [user]);

  const deleteBanner = useCallback(async (id) => {
    if (id?.startsWith?.('temp_')) {
      setTempBanners(prev => prev.filter(b => b.id !== id));
      return;
    }
    if (!user || !db) return;
    try { await deleteBannerFromCloud(id); }
    catch (e) { console.error("Delete failed", e); }
  }, [user]);

  const addTempBanners = useCallback((newTemps) => {
    setTempBanners(prev => [...prev, ...newTemps]);
  }, []);

  const toggleCartItem = useCallback(async (id) => {
    if (!user || !db) return false;
    try {
      if (cartIds.includes(id)) await removeBookmark(user.uid, id);
      else await addBookmark(user.uid, id);
      return true;
    } catch (e) { console.error('[BannerCodex] bookmark toggle failed', e); return false; }
  }, [user, cartIds]);

  const addToCart = useCallback(async (ids) => {
    if (!user || !db || !ids?.length) return;
    await batchAddBookmarks(user.uid, ids);
  }, [user]);

  const removeFromCart = useCallback(async (ids) => {
    if (!user || !db || !ids?.length) return;
    await batchRemoveBookmarks(user.uid, ids);
  }, [user]);

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
    addTempBanners, toggleCartItem, addToCart, removeFromCart,
  };
};
