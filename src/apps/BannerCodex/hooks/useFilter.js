import { useState, useEffect, useMemo } from 'react';

const getDateValue = (b) => {
  if (b.date) {
    const cleanDate = b.date.replace(/[^0-9]/g, '');
    if (cleanDate.length >= 8) return parseInt(cleanDate.substring(0, 8));
    if (cleanDate.length === 6) return parseInt(`20${cleanDate}`);
  }
  if (b.year && b.month) return parseInt(`${b.year}${b.month.padStart(2, '0')}00`);
  if (b.year) return parseInt(`${b.year}0000`);
  if (b.createdAt) {
    const d = new Date(b.createdAt);
    return parseInt(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
  }
  return 0;
};

export const useFilter = ({
  banners, tempBanners, cartIds, activeCategory, sortOrder,
  searchQuery, isAiSearchMode, aiSearchIds, filters,
  folders = [], activeFolderId = null,
}) => {
  const [filteredBanners, setFilteredBanners] = useState([]);

  const availableGames = useMemo(() => {
    const dataGames = banners.map(b => b.game).filter(Boolean);
    return [...new Set(dataGames)].sort();
  }, [banners]);

  const recentGames = useMemo(() => {
    const sortedGames = [...new Set(
      banners.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(b => b.game)
    )].filter(Boolean);
    return sortedGames.slice(0, 2);
  }, [banners]);

  const topTags = useMemo(() => {
    const counts = {};
    banners.forEach(b => {
      if (Array.isArray(b.tags)) {
        b.tags.forEach(t => { if (t && t !== '기타') counts[t] = (counts[t] || 0) + 1; });
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
  }, [banners]);

  useEffect(() => {
    let results = activeCategory === 'temp' ? [...tempBanners] : [...banners];
    if (isAiSearchMode) {
      if (aiSearchIds !== null) results = results.filter(b => aiSearchIds.includes(b.id));
    } else if (searchQuery.trim() !== '') {
      const queryNoSpace = searchQuery.replace(/\s+/g, '').toLowerCase();
      results = results.filter(b => {
        const titleNoSpace = (b.title || '').replace(/\s+/g, '').toLowerCase();
        const pathNoSpace = (b.path || '').replace(/\s+/g, '').toLowerCase();
        const tagsMatch = b.tags?.some(t => (t || '').replace(/\s+/g, '').toLowerCase().includes(queryNoSpace));
        return titleNoSpace.includes(queryNoSpace) || pathNoSpace.includes(queryNoSpace) || tagsMatch;
      });
    }
    if (activeCategory === 'favorites') results = results.filter(b => b.liked);
    else if (activeCategory === 'cart') results = results.filter(b => cartIds.includes(b.id));
    else if (activeFolderId) {
      const folder = folders.find(f => f.id === activeFolderId);
      const ids = new Set(folder?.bannerIds || []);
      results = results.filter(b => ids.has(b.id));
    } else if (activeCategory !== 'all' && activeCategory !== 'temp') {
      const gameMap = { 'aion': '아이온', 'bns': '블소', 'etc': '기타' };
      const filterGame = gameMap[activeCategory] || activeCategory;
      results = results.filter(b => b.game === filterGame);
    }
    if (filters.assetType !== 'all') results = results.filter(b => (b.path || '').toLowerCase().includes(filters.assetType.toLowerCase()));
    if (filters.year !== 'all') {
      if (filters.year === 'custom') {
        if (filters.customStart && filters.customEnd) {
          results = results.filter(b => {
            let bDate = null;
            if (b.date) bDate = new Date(b.date.replace(/\./g, '-').replace(/\//g, '-'));
            else if (b.createdAt) bDate = new Date(b.createdAt);
            if (!bDate || isNaN(bDate.getTime())) return false;
            const start = new Date(filters.customStart);
            const end = new Date(filters.customEnd); end.setHours(23, 59, 59, 999);
            return bDate >= start && bDate <= end;
          });
        }
      } else results = results.filter(b => b.year === filters.year);
    }
    if (filters.quality !== 'all') {
      results = results.filter(b => {
        const score = parseFloat(b.score) || 0;
        if (filters.quality === '8.7_up') return score >= 8.7;
        if (filters.quality === '8.2_8.6') return score >= 8.2 && score <= 8.6;
        if (filters.quality === '7.5_7.9') return score >= 7.5 && score <= 7.9;
        if (filters.quality === '7.5_down') return score < 7.5;
        return true;
      });
    }
    if (filters.tag !== 'all') results = results.filter(b => Array.isArray(b.tags) && b.tags.includes(filters.tag));
    if (filters.game !== 'all') results = results.filter(b => b.game === filters.game);
    if (filters.ocr !== 'all') {
      if (filters.ocr === 'done') results = results.filter(b => b.ocrProcessed);
      if (filters.ocr === 'pending') results = results.filter(b => !b.ocrProcessed);
    }
    results.sort((a, b) => {
      if (activeCategory === 'all' && sortOrder === 'newest') {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
      }
      if (sortOrder === 'newest') return getDateValue(b) - getDateValue(a);
      if (sortOrder === 'oldest') return getDateValue(a) - getDateValue(b);
      if (sortOrder === 'popular') return (b.liked === a.liked ? 0 : b.liked ? 1 : -1);
      if (sortOrder === 'score') return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
      if (sortOrder === 'name') return (a.originalTitle || a.title || '').localeCompare(b.originalTitle || b.title || '');
      return 0;
    });
    setFilteredBanners(results);
  }, [searchQuery, banners, tempBanners, activeCategory, sortOrder, filters, cartIds, isAiSearchMode, aiSearchIds, folders, activeFolderId]);

  return { filteredBanners, availableGames, recentGames, topTags };
};
