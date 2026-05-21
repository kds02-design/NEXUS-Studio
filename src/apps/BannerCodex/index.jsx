import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, FolderOpen, Zap, Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGlobal } from '../../context/GlobalContext';
import {
  fetchActiveCriteria, getSeedCriteria, formatCriteriaList, CRITERIA_TYPES
} from '../../lib/evaluationCriteria';
import {
  pickDirectory, collectImageFiles, ensureReadPermission,
  saveDirectoryHandle, loadDirectoryHandle, clearDirectoryHandle,
} from '../../lib/folderPicker';

import { getFolderName } from './constants/categories';
import { auth, db, fetchBannerImage, saveGameLogo, removeGameLogo, delay, WRITE_DELAY_MS } from './services/firebase';
import { blobUrlToBase64, compressImage } from './services/cloudinary';
import { callGeminiAPI } from './services/gemini';
import { useBanners } from './hooks/useBanners';
import { useFilter } from './hooks/useFilter';
import { useEvaluation } from './hooks/useEvaluation';

import CodexSidebar from './components/CodexSidebar';
import CodexHeader from './components/CodexHeader';
import CodexGrid from './components/CodexGrid';
import CodexCard from './components/CodexCard';
import CodexDetailModal from './components/CodexDetailModal';
import {
  UploadModal, BatchEditModal, ConfirmModal, LogoManagerModal,
  DuplicateModal, OCRProgressModal, UploadProgressModal, ProcessingFilesModal,
  NotificationToast, BatchProcessingPill, GlobalDragOverlay, SelectionToolbar
} from './components/CodexEditModal';

const FS_HANDLE_KEY = 'bannerCodex.lastFolder';

const getUploadDuplicateKey = (title, path) => {
  let p = (path || '').replace(/\\/g, '/').trim().toLowerCase();
  let t = (title || '').trim().toLowerCase().replace(/\.[^/.]+$/, "");
  return `${p}_${t}`;
};

const getSmartDuplicateKey = (banner) => {
  if (banner.ocrProcessed && banner.title && banner.title !== '제목 없음') {
    const titleKey = banner.title.replace(/\s+/g, '').toLowerCase();
    const dateKey = banner.date || banner.year || '';
    return `ai_${titleKey}_${dateKey}`;
  }
  return `raw_${getUploadDuplicateKey(banner.originalTitle || banner.title, banner.path)}`;
};

const handleCopy = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text; textArea.style.position = "fixed"; textArea.style.left = "-9999px";
  document.body.appendChild(textArea); textArea.select();
  try { document.execCommand('copy'); return true; }
  catch { return false; }
  finally { document.body.removeChild(textArea); }
};

export default function App() {
  const { user, isAdmin } = useAuth();
  const { theme } = useGlobal();
  const isLightMode = theme === 'light';

  // 관리자 권한(isAdmin) 과 별도로, 설정에서 명시적으로 켠 "관리 모드" 토글.
  // 관리자라도 토글 OFF 면 일반 사용자처럼 보이고 (체크박스/편집 UI 숨김), 토글 ON 시에만 admin UI 노출.
  // localStorage 에 저장되어 새로고침 후에도 유지.
  const [adminModeEnabled, setAdminModeEnabled] = useState(() => {
    try { return localStorage.getItem('bannerCodex:adminMode') === '1'; } catch { return false; }
  });
  const isAdminMode = isAdmin && adminModeEnabled;
  const toggleAdminMode = useCallback(() => {
    setAdminModeEnabled(v => {
      const next = !v;
      try { localStorage.setItem('bannerCodex:adminMode', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // UI state
  const [activeView] = useState('grid');
  const [sortOrder, setSortOrder] = useState('score');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [gridSize, setGridSize] = useState('medium');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearchMode, setIsAiSearchMode] = useState(false);
  const [aiSearchIds, setAiSearchIds] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);
  const [isAllGamesModalOpen, setIsAllGamesModalOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [filters, setFilters] = useState({ assetType: 'all', year: 'all', customStart: '', customEnd: '', quality: 'all', tag: 'all', game: 'all', creator: 'all', ocr: 'all' });
  const [pinnedGames, setPinnedGames] = useState(() => { try { const s = localStorage.getItem('pinnedGames'); return s ? JSON.parse(s) : ['리니지2M', '리니지M', '블소']; } catch { return ['리니지2M', '리니지M', '블소']; } });
  useEffect(() => { localStorage.setItem('pinnedGames', JSON.stringify(pinnedGames)); }, [pinnedGames]);

  // API keys
  const [geminiApiKey, setGeminiApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '');
  const [openAiApiKey, setOpenAiApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('openAiApiKey') || '' : '');
  useEffect(() => { localStorage.setItem('geminiApiKey', geminiApiKey); localStorage.setItem('openAiApiKey', openAiApiKey); }, [geminiApiKey, openAiApiKey]);

  // Selection / interaction state
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [editedBanner, setEditedBanner] = useState(null);
  const [highResImage, setHighResImage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [lastViewedId, setLastViewedId] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isScorePopoverOpen, setIsScorePopoverOpen] = useState(false);
  const [isScoreAdjExpanded, setIsScoreAdjExpanded] = useState(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadSettings, setUploadSettings] = useState({ game: '리니지', year: new Date().getFullYear().toString() });
  const [fileFilters, setFileFilters] = useState({ include: '1180', exclude: 'old', startDate: '' });
  const [isAddingNewGame, setIsAddingNewGame] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ game: '', year: '', isCustomGame: false, customGame: '', path: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isLogoManagerOpen, setIsLogoManagerOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [duplicateIdsToDelete, setDuplicateIdsToDelete] = useState([]);

  // Other state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, skipped: 0 });
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraggingOverGlobal, setIsDraggingOverGlobal] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [notification, setNotification] = useState(null);
  const [activeCriteria, setActiveCriteria] = useState(null);
  const [lastFolderName, setLastFolderName] = useState(() => { try { return localStorage.getItem(FS_HANDLE_KEY + '.name') || ''; } catch { return ''; } });

  const settingsRef = useRef(null);
  const filterMenuRef = useRef(null);
  const dragCounter = useRef(0);
  const abortUploadRef = useRef(false);

  const showNotification = useCallback((msg) => {
    let message = '알림';
    if (typeof msg === 'string') message = msg;
    else if (msg instanceof Error) message = msg.message;
    else if (msg && typeof msg === 'object') { try { message = JSON.stringify(msg); } catch { message = '알 수 없는 오류'; } }
    setNotification(message); setTimeout(() => setNotification(null), 3000);
  }, []);

  // Hooks
  const bannersHook = useBanners(user, sortOrder);
  const { banners, tempBanners, isLoadingData, cartIds, gameLogos, customAiPrompt,
    addBanner, updateBanner, deleteMany, addTempBanners, toggleCartItem, addToCart, removeFromCart } = bannersHook;

  const { filteredBanners, availableGames, recentGames, topTags } = useFilter({
    banners, tempBanners, cartIds, activeCategory, sortOrder, searchQuery, isAiSearchMode, aiSearchIds, filters
  });

  // Active evaluation criteria (Firestore w/ seed fallback)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await fetchActiveCriteria(CRITERIA_TYPES.banner);
        if (!cancelled) {
          if (v && Array.isArray(v.criteria) && v.criteria.length > 0) setActiveCriteria(v);
          else setActiveCriteria({ name: "(시드 fallback)", criteria: getSeedCriteria(CRITERIA_TYPES.banner) });
        }
      } catch (e) {
        if (!cancelled) setActiveCriteria({ name: "(시드 fallback)", criteria: getSeedCriteria(CRITERIA_TYPES.banner) });
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const criteriaListText = useMemo(() => formatCriteriaList(activeCriteria?.criteria || []), [activeCriteria]);

  const onSelectionAffect = useCallback((id, updateData) => {
    if (selectedBanner?.id === id) {
      setSelectedBanner(prev => ({ ...prev, ...updateData }));
      setEditedBanner(prev => ({ ...prev, ...updateData }));
    }
  }, [selectedBanner]);

  const evalHook = useEvaluation({
    banners, updateBanner, customAiPrompt, criteriaListText,
    geminiApiKey, openAiApiKey, showNotification, onSelectionAffect
  });
  const { processingBannerId, isBatchProcessing, ocrProgress, setOcrProgress,
    handleSmartAnalysis, runSelectedOCR, handleCancelBatch } = evalHook;

  // Sync selected banner when underlying data changes
  useEffect(() => {
    if (previewModalOpen && selectedBanner && !hasChanges && !isEditingPreview) {
      const source = selectedBanner.id.startsWith('temp_') ? tempBanners : banners;
      const live = source.find(b => b.id === selectedBanner.id);
      if (live) {
        const keys = ['score', 'aiScore', 'manualScoreAdj', 'userComment', 'scores', 'title', 'tags', 'ocrProcessed', 'liked', 'featured', 'game', 'year', 'month', 'path'];
        for (const k of keys) if (JSON.stringify(live[k]) !== JSON.stringify(selectedBanner[k])) {
          setSelectedBanner(prev => ({ ...live, loadedImage: prev.loadedImage }));
          setEditedBanner(prev => ({ ...live, loadedImage: prev.loadedImage }));
          return;
        }
      }
    }
  }, [banners, tempBanners, previewModalOpen, selectedBanner, hasChanges, isEditingPreview]);

  useEffect(() => {
    if (activeCategory === 'temp' && tempBanners.length === 0) setActiveCategory('all');
  }, [tempBanners.length, activeCategory]);

  // ESC handler
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (previewModalOpen) {
        if (hasChanges || isEditingPreview) { if (confirm("변경사항을 취소하시겠습니까?")) { setPreviewModalOpen(false); setIsEditingPreview(false); } }
        else setPreviewModalOpen(false);
      } else if (isAllGamesModalOpen) setIsAllGamesModalOpen(false);
      else if (isDuplicateModalOpen) setIsDuplicateModalOpen(false);
      else if (isLogoManagerOpen) setIsLogoManagerOpen(false);
      else if (isUploadModalOpen) setIsUploadModalOpen(false);
      else if (isBatchEditModalOpen) setIsBatchEditModalOpen(false);
      else if (ocrProgress.isOpen && ocrProgress.status === 'confirm') setOcrProgress(prev => ({ ...prev, isOpen: false }));
      else if (isSettingsOpen) setIsSettingsOpen(false);
      else if (isFilterMenuOpen) setIsFilterMenuOpen(false);
      else if (isSidebarOpen) setIsSidebarOpen(false);
      else if (selectedIds.length > 0) setSelectedIds([]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewModalOpen, isUploadModalOpen, isBatchEditModalOpen, isSettingsOpen, isFilterMenuOpen, isSidebarOpen, hasChanges, isEditingPreview, selectedIds, isDuplicateModalOpen, ocrProgress.isOpen, ocrProgress.status, isAllGamesModalOpen, isLogoManagerOpen, setOcrProgress]);

  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setIsSettingsOpen(false);
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) setIsFilterMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filtered pending files (for upload modal)
  const filteredPendingFiles = useMemo(() => {
    let startInt = null;
    if (fileFilters.startDate) startInt = parseInt(fileFilters.startDate.replace(/-/g, ''));
    const extractDateAsInt = (str) => {
      const m8 = str.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
      if (m8) return parseInt(`${m8[1]}${m8[2]}${m8[3]}`);
      const m6 = str.match(/(?:^|[^\d])([2-9]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:$|[^\d])/);
      if (m6) return parseInt(`20${m6[1]}${m6[2]}${m6[3]}`);
      return null;
    };
    return pendingFiles.filter(f => {
      const targetStr = (f.webkitRelativePath || f.name).toLowerCase();
      if (fileFilters.include) {
        const inc = fileFilters.include.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        if (inc.length > 0 && !inc.some(i => targetStr.includes(i))) return false;
      }
      if (fileFilters.exclude) {
        const exc = fileFilters.exclude.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
        if (exc.length > 0 && exc.some(i => targetStr.includes(i))) return false;
      }
      if (startInt) {
        const fd = extractDateAsInt(targetStr);
        if (!fd || fd < startInt) return false;
      }
      return true;
    });
  }, [pendingFiles, fileFilters]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleGameClick = (key) => {
    if (!isDesktopSidebarOpen) setIsDesktopSidebarOpen(true);
    setActiveCategory(key);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const togglePinGame = (key, e) => {
    if (e) e.stopPropagation();
    setPinnedGames(prev => prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]);
  };

  const handleSidebarClick = useCallback((e) => {
    const isInteractive = e.target.closest('button, input, label, select, a, span');
    if (!isInteractive && window.innerWidth >= 768) setIsDesktopSidebarOpen(prev => !prev);
  }, []);

  const handleCopyPathGrid = useCallback((path) => {
    if (!path) { showNotification("경로가 지정되지 않았습니다."); return; }
    if (handleCopy(path)) showNotification("클립보드에 복사되었습니다.");
  }, [showNotification]);

  const handleCopyPathModal = (path) => {
    if (!path) return;
    if (handleCopy(path)) { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }
    else showNotification("복사에 실패했습니다.");
  };

  const handleDownloadImage = async () => {
    if (!highResImage && !selectedBanner?.loadedImage) return;
    const imageUrl = highResImage || selectedBanner.loadedImage;
    try {
      showNotification("다운로드 준비 중...");
      const response = await fetch(imageUrl); const blob = await response.blob();
      const url = window.URL.createObjectURL(blob); const a = document.createElement('a');
      a.style.display = 'none'; a.href = url;
      let folderName = 'banner';
      if (selectedBanner.path) {
        const parts = selectedBanner.path.split(/[\\/]/).filter(Boolean);
        if (parts.length > 0) folderName = parts[parts.length - 1];
      }
      a.download = `${folderName.replace(/[<>:"/\\|?*]/g, '_')}.jpg`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
      showNotification("이미지 다운로드가 시작되었습니다.");
    } catch (e) {
      showNotification("다운로드 실패 (CORS 또는 네트워크 오류)");
      window.open(imageUrl, '_blank');
    }
  };

  const toggleLike = async (id, e) => {
    if (e) e.stopPropagation();
    const source = id.startsWith('temp_') ? tempBanners : banners;
    const banner = source.find(b => b.id === id);
    if (!banner) return;
    const newState = !banner.liked;
    await updateBanner(id, { liked: newState });
    if (selectedBanner?.id === id) {
      setEditedBanner(prev => ({ ...prev, liked: newState }));
      setSelectedBanner(prev => ({ ...prev, liked: newState }));
    }
  };

  const toggleFeature = async (id, e) => {
    if (e) e.stopPropagation();
    const source = id.startsWith('temp_') ? tempBanners : banners;
    const banner = source.find(b => b.id === id);
    if (!banner) return;
    const newState = !banner.featured;
    await updateBanner(id, { featured: newState });
    showNotification(newState ? "추천 배너로 설정되었습니다." : "추천이 해제되었습니다.");
    if (selectedBanner?.id === id) {
      setEditedBanner(prev => ({ ...prev, featured: newState }));
      setSelectedBanner(prev => ({ ...prev, featured: newState }));
    }
  };

  const handleToggleCart = async (id) => {
    if (!user || !db) { showNotification("로그인이 필요합니다."); return; }
    const wasInCart = cartIds.includes(id);
    const ok = await toggleCartItem(id);
    if (ok) showNotification(wasInCart ? "담기 취소되었습니다." : "담기 완료되었습니다.");
    else showNotification("담기 변경 실패");
  };

  const handleAddToCart = async () => {
    if (selectedIds.length === 0) return;
    try { await addToCart(selectedIds); showNotification(`${selectedIds.length}개의 배너를 담았습니다.`); setSelectedIds([]); }
    catch { showNotification("담기 실패"); }
  };
  const handleRemoveFromCart = async () => {
    if (selectedIds.length === 0) return;
    try { await removeFromCart(selectedIds); showNotification(`${selectedIds.length}개의 배너를 담기 취소했습니다.`); setSelectedIds([]); }
    catch { showNotification("담기 취소 실패"); }
  };

  const handleSelectAll = () => {
    const ids = filteredBanners.map(b => b.id);
    const all = ids.every(id => selectedIds.includes(id));
    if (all) setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...ids])]);
  };

  const toggleSelection = (id, e) => {
    e?.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    showNotification(`${selectedIds.length}개의 배너를 삭제 중...`);
    await deleteMany(selectedIds);
    setSelectedIds([]); showNotification("삭제가 완료되었습니다.");
  };

  const handleConfirmDelete = async () => {
    const allTempSelected = selectedIds.length > 0 && selectedIds.every(id => id.startsWith('temp_'));
    if (allTempSelected || isAdmin || deletePassword === '1234') {
      setIsDeleteModalOpen(false); setDeletePassword('');
      await handleDeleteSelected();
    } else { showNotification("비밀번호가 올바르지 않습니다."); setDeletePassword(''); }
  };

  const handleDeleteSingleBanner = async (id) => { setSelectedIds([id]); setIsDeleteModalOpen(true); };

  const handleResetAI = () => { if (selectedIds.length === 0) return; setIsResetModalOpen(true); };

  const executeResetAI = async () => {
    setIsResetModalOpen(false);
    showNotification(`${selectedIds.length}개 항목의 AI 데이터 초기화 중...`);
    try {
      for (let i = 0; i < selectedIds.length; i += 5) {
        const chunk = selectedIds.slice(i, i + 5);
        await Promise.all(chunk.map(async (id) => {
          const source = id.startsWith('temp_') ? tempBanners : banners;
          const banner = source.find(b => b.id === id);
          if (!banner) return;
          await updateBanner(id, {
            ocrProcessed: false, score: null, aiScore: null, manualScoreAdj: null, scores: null,
            tags: [], date: null, month: '', title: banner.originalTitle || '제목 없음'
          });
        }));
        await delay(WRITE_DELAY_MS);
      }
      showNotification("AI 데이터 초기화가 완료되었습니다.");
      setSelectedIds([]);
    } catch (e) { showNotification("초기화 중 오류가 발생했습니다."); }
  };

  const handleOpenBatchEdit = useCallback((targetIds = null) => {
    const ids = targetIds || selectedIds;
    if (ids.length === 0) return;
    const source = activeCategory === 'temp' ? tempBanners : banners;
    const targets = source.filter(b => ids.includes(b.id));
    const games = [...new Set(targets.map(b => b.game))];
    const years = [...new Set(targets.map(b => b.year))];
    setBatchForm({
      game: games.length === 1 ? games[0] : 'mixed',
      year: years.length === 1 ? years[0] : 'mixed',
      isCustomGame: false, customGame: '', path: ''
    });
    if (targetIds) setSelectedIds(targetIds);
    setIsBatchEditModalOpen(true);
  }, [selectedIds, activeCategory, tempBanners, banners]);

  const handleBatchSave = async () => {
    const gameToUpdate = batchForm.isCustomGame ? batchForm.customGame : (batchForm.game !== 'mixed' ? batchForm.game : '');
    const yearToUpdate = batchForm.year !== 'mixed' ? batchForm.year : '';
    const pathToUpdate = batchForm.path.trim();
    if (!gameToUpdate && !yearToUpdate && !pathToUpdate) { showNotification("변경할 내용이 없습니다."); return; }
    showNotification(`${selectedIds.length}개 항목 일괄 수정 중...`);
    setIsBatchEditModalOpen(false);
    try {
      for (let i = 0; i < selectedIds.length; i += 3) {
        const chunk = selectedIds.slice(i, i + 3);
        await Promise.all(chunk.map(async (id) => {
          const source = id.startsWith('temp_') ? tempBanners : banners;
          const banner = source.find(b => b.id === id);
          if (!banner) return;
          let updateData = {}; let newGame = banner.game; let newYear = banner.year;
          if (gameToUpdate && gameToUpdate !== banner.game) { updateData.game = gameToUpdate; newGame = gameToUpdate; }
          if (yearToUpdate && yearToUpdate !== banner.year) { updateData.year = yearToUpdate; newYear = yearToUpdate; }
          if (pathToUpdate) updateData.path = pathToUpdate;
          else if (updateData.game || updateData.year) {
            let folderName = getFolderName(newGame);
            if (banner.path) {
              const parts = banner.path.replace(/\//g, '\\').split('\\').filter(Boolean);
              if (parts[0] === 'ppc-file' && parts.length >= 3) {
                const rest = parts.slice(3).join('\\');
                updateData.path = `\\\\ppc-file\\${folderName}\\${newYear}\\${rest}`;
              } else updateData.path = `\\\\ppc-file\\${folderName}\\${newYear}\\배너`;
            } else updateData.path = `\\\\ppc-file\\${folderName}\\${newYear}\\배너`;
          }
          if (Object.keys(updateData).length > 0) {
            await updateBanner(id, updateData);
            if (selectedBanner?.id === id) {
              setSelectedBanner(prev => ({ ...prev, ...updateData }));
              setEditedBanner(prev => ({ ...prev, ...updateData }));
            }
          }
        }));
        await delay(WRITE_DELAY_MS);
      }
      showNotification("일괄 변경이 완료되었습니다.");
      setBatchForm({ game: '', year: '', isCustomGame: false, customGame: '', path: '' });
      setSelectedIds([]);
    } catch { showNotification("오류가 발생했습니다."); }
  };

  // Logo / prompt
  const handleUpdateLogo = async (gameName, file) => {
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      const base64 = await blobUrlToBase64(url);
      const compressed = await compressImage(base64, 150, 0.9);
      await saveGameLogo(gameName, compressed);
      showNotification(`${gameName} 로고가 설정되었습니다.`);
    } catch (e) { showNotification("로고 업로드에 실패했습니다."); }
  };
  const handleRemoveLogo = async (gameName) => {
    try { await removeGameLogo(gameName); showNotification(`${gameName} 로고가 삭제되었습니다.`); }
    catch { showNotification("로고 삭제에 실패했습니다."); }
  };
  // AI search
  const handleSearch = async () => {
    if (!searchQuery.trim()) { setAiSearchIds(null); return; }
    if (!isAiSearchMode) return;
    setIsSearching(true);
    try {
      const source = activeCategory === 'temp' ? tempBanners : banners;
      const meta = source.slice(0, 200).map(b => ({ id: b.id, title: b.title, tags: b.tags?.join(', '), mood: b.mood }));
      const prompt = `사용자가 다음 쿼리로 배너를 찾고 있습니다: "${searchQuery}"\n아래 배너 목록 중에서 사용자의 요청과 의미적으로 가장 관련성이 높은 배너들의 ID를 찾으세요.\n[배너 목록]\n${JSON.stringify(meta)}\n**출력 형식**: 오직 JSON 배열 형식으로 ID 목록만 반환하세요. 예: ["id1", "id2"]`;
      const result = await callGeminiAPI(prompt, null, false, { apiKey: geminiApiKey });
      if (result) {
        const ids = JSON.parse(result.replace(/```json|```/g, '').trim());
        if (Array.isArray(ids)) {
          setAiSearchIds(ids);
          showNotification(ids.length === 0 ? "AI 검색 결과가 없습니다." : `${ids.length}개의 관련 배너를 찾았습니다.`);
        } else setAiSearchIds([]);
      }
    } catch { showNotification("AI 검색 중 오류가 발생했습니다."); setAiSearchIds([]); }
    finally { setIsSearching(false); }
  };

  // Drag/drop temp banners
  const handleGlobalDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current += 1; if (dragCounter.current === 1) setIsDraggingOverGlobal(true); };
  const handleGlobalDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current -= 1; if (dragCounter.current === 0) setIsDraggingOverGlobal(false); };
  const handleGlobalDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleGlobalDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0; setIsDraggingOverGlobal(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setIsProcessingFiles(true);
    showNotification(`${files.length}개의 임시 이미지를 처리 중입니다...`);
    try {
      const newTemps = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = URL.createObjectURL(file);
        const base64 = await blobUrlToBase64(url);
        const compressedPreview = await compressImage(base64, 400, 0.8);
        const d = new Date();
        const yyyy = d.getFullYear().toString();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        newTemps.push({
          id: `temp_${Date.now()}_${i}`, isTemp: true,
          title: file.name.split('.')[0], originalTitle: file.name.split('.')[0],
          game: 'temp', year: yyyy, month: mm, date: `${yyyy}.${mm}.${dd}`,
          path: '임시 평가 (서버 저장 안 됨)', tags: [],
          preview: compressedPreview, loadedImage: base64,
          createdAt: new Date().toISOString(),
          ocrProcessed: false, liked: false, featured: false
        });
      }
      addTempBanners(newTemps);
      setActiveCategory('temp'); setSearchQuery('');
      showNotification(`임시 평가 폴더에 ${files.length}개의 이미지가 추가되었습니다.`);
      if (newTemps.length > 0) handleOpenPreview(newTemps[0]);
    } catch { showNotification("파일 처리 중 오류가 발생했습니다."); }
    finally { setIsProcessingFiles(false); }
  };

  // File upload (button-triggered)
  const handleFileUpload = async (e) => {
    setIsProcessingFiles(true); await new Promise(r => setTimeout(r, 100));
    try {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) { showNotification("유효한 이미지 파일이 없습니다."); return; }
      setPendingFiles(files);
      setFileFilters({ include: '', exclude: '', startDate: '' });
      setUploadSettings(p => ({ ...p, game: '리니지', year: new Date().getFullYear().toString() }));
      setIsUploadModalOpen(true); setIsSettingsOpen(false);
    } catch { showNotification("파일을 불러오는 중 오류가 발생했습니다."); }
    finally { setIsProcessingFiles(false); e.target.value = ''; }
  };

  const handleFolderUpload = async (e) => {
    setIsProcessingFiles(true); await new Promise(r => setTimeout(r, 100));
    try {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) { showNotification("유효한 이미지 파일이 없습니다."); return; }
      setPendingFiles(files);
      setFileFilters({ include: '1180', exclude: 'old', startDate: '' });
      setUploadSettings(p => ({ ...p, game: '리니지', year: new Date().getFullYear().toString() }));
      setIsUploadModalOpen(true); setIsSettingsOpen(false);
    } catch { showNotification("폴더를 불러오는 중 오류가 발생했습니다."); }
    finally { setIsProcessingFiles(false); e.target.value = ''; }
  };

  // Folder picker (network drive)
  const loadFromDirectoryHandle = async (handle) => {
    setIsProcessingFiles(true);
    showNotification(`"${handle.name}" 폴더 스캔 중...`);
    try {
      const granted = await ensureReadPermission(handle);
      if (!granted) { showNotification('폴더 읽기 권한이 거부되었습니다.'); return; }
      const files = await collectImageFiles(handle, (n) => { if (n % 100 === 0) showNotification(`${n}개 발견...`); });
      if (files.length === 0) { showNotification('이미지 파일(jpg/jpeg/png/webp/gif)이 없습니다.'); return; }
      try {
        await saveDirectoryHandle(FS_HANDLE_KEY, handle);
        localStorage.setItem(FS_HANDLE_KEY + '.name', handle.name);
        setLastFolderName(handle.name);
      } catch (e) { console.warn('[BannerCodex] handle save failed', e); }
      setPendingFiles(files);
      setFileFilters({ include: '', exclude: '', startDate: '' });
      setUploadSettings(p => ({ ...p, game: '리니지', year: new Date().getFullYear().toString() }));
      setIsUploadModalOpen(true); setIsSettingsOpen(false);
      showNotification(`${files.length}개 이미지 로드 완료`);
    } catch (err) { showNotification(`폴더 로드 실패: ${err.message || err}`); }
    finally { setIsProcessingFiles(false); }
  };
  const handlePickFolder = async () => {
    try { const handle = await pickDirectory(); await loadFromDirectoryHandle(handle); }
    catch (e) { if (e.name !== 'AbortError') showNotification(e.message || '폴더 선택 실패'); }
  };
  const handleReopenLastFolder = async () => {
    try {
      const handle = await loadDirectoryHandle(FS_HANDLE_KEY);
      if (!handle) { showNotification('저장된 폴더가 없습니다.'); setLastFolderName(''); return; }
      await loadFromDirectoryHandle(handle);
    } catch (e) { showNotification(`마지막 폴더 열기 실패: ${e.message || e}`); }
  };
  const handleForgetLastFolder = async () => {
    try { await clearDirectoryHandle(FS_HANDLE_KEY); } catch {}
    try { localStorage.removeItem(FS_HANDLE_KEY + '.name'); } catch {}
    setLastFolderName('');
    showNotification('저장된 폴더 정보를 지웠습니다.');
  };
  const handleCancelUpload = () => { abortUploadRef.current = true; showNotification("작업 취소 중..."); };

  // Upload pipeline
  const processFiles = async (files, selectedGame, selectedYear) => {
    if (files.length === 0) return;
    setIsUploading(true); setUploadProgress({ current: 0, total: files.length, skipped: 0 });
    abortUploadRef.current = false;
    try {
      let skippedCount = 0;
      const existingKeys = new Set(banners.map(b => getUploadDuplicateKey(b.originalTitle || b.title, b.path)));
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (abortUploadRef.current) break;
        const titleStr = file.name.replace(/\.[^/.]+$/, "");
        let folderName = getFolderName(selectedGame);
        let fileYear = selectedYear;
        const dateObj = new Date(file.lastModified || Date.now());
        let yyyy = dateObj.getFullYear().toString();
        let mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        let dd = String(dateObj.getDate()).padStart(2, '0');
        let fileDateStr = `${yyyy}.${mm}.${dd}`;
        let sourceFolder = "";
        if (file.webkitRelativePath) {
          const pathForDate = file.webkitRelativePath || file.name;
          const m8 = pathForDate.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
          const m6 = pathForDate.match(/(?:^|[^\d])([2-9]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:$|[^\d])/);
          if (m8) { fileYear = m8[1]; mm = m8[2]; dd = m8[3]; fileDateStr = `${fileYear}.${mm}.${dd}`; }
          else if (m6) { fileYear = `20${m6[1]}`; mm = m6[2]; dd = m6[3]; fileDateStr = `${fileYear}.${mm}.${dd}`; }
          const parts = file.webkitRelativePath.split('/'); parts.pop();
          const cleanFolderName = folderName.replace(/^[0-9_]+\./, '');
          while (parts.length > 0) {
            const part = parts[0];
            if (part === fileYear.toString() || part === selectedGame || part === folderName || part === cleanFolderName) parts.shift();
            else break;
          }
          if (parts.length > 0) sourceFolder = "\\" + parts.join('\\');
        }
        let generatedPath = `\\\\ppc-file\\${folderName}\\${fileYear}`;
        if (sourceFolder) generatedPath += sourceFolder; else generatedPath += "\\배너";
        const fileKey = getUploadDuplicateKey(titleStr, generatedPath);
        if (skipDuplicates && existingKeys.has(fileKey)) {
          skippedCount++;
          setUploadProgress({ current: i + 1, total: files.length, skipped: skippedCount });
          if (i % 50 === 0) await delay(10);
          continue;
        }
        existingKeys.add(fileKey);
        const url = URL.createObjectURL(file);
        const base64 = await blobUrlToBase64(url);
        const newBanner = {
          title: titleStr, originalTitle: titleStr, game: selectedGame, year: fileYear, date: fileDateStr, month: mm,
          character: "Unknown", path: generatedPath, tags: [], linkUrl: '', ocrProcessed: false, liked: false, featured: false,
          createdAt: new Date().toISOString(),
        };
        await addBanner({ ...newBanner, preview: base64 });
        setUploadProgress({ current: i + 1, total: files.length, skipped: skippedCount });
      }
      if (abortUploadRef.current) showNotification("업로드가 취소되었습니다.");
      else showNotification(`총 ${files.length}개 중 ${files.length - skippedCount}개 업로드 완료${skippedCount > 0 ? ` (중복 스킵: ${skippedCount}개)` : ''}`);
    } catch { showNotification("업로드 중 일부 오류 발생"); }
    finally { setTimeout(() => { setIsUploading(false); setUploadProgress({ current: 0, total: 0, skipped: 0 }); abortUploadRef.current = false; }, 1000); }
  };

  const confirmUpload = async () => {
    if (filteredPendingFiles.length === 0) { showNotification("업로드할 파일이 없습니다. 필터 설정을 확인하세요."); return; }
    setIsUploadModalOpen(false);
    showNotification(`${filteredPendingFiles.length}개 업로드 진행 중...`);
    await processFiles(filteredPendingFiles, uploadSettings.game, uploadSettings.year);
    setPendingFiles([]); setIsAddingNewGame(false); setNewGameName('');
  };

  // Library save / load (export/import)
  const handleSaveLibrary = async () => {
    if (banners.length === 0) { showNotification("백업할 데이터가 없습니다."); return; }
    setIsSaving(true);
    showNotification(`총 ${banners.length}개의 항목 백업 중... (이미지 포함)`);
    try {
      const backupData = [];
      for (let i = 0; i < banners.length; i += 5) {
        const chunk = banners.slice(i, i + 5);
        const processed = await Promise.all(chunk.map(async (b) => {
          const copy = { ...b };
          if (copy.imageId) {
            try {
              const data = await fetchBannerImage(copy.imageId);
              if (data) copy.preview = data.original || data.thumbnail;
            } catch {}
          }
          return copy;
        }));
        backupData.push(...processed);
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `banner_archive_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showNotification("백업 파일(이미지 포함)이 생성되었습니다.");
    } catch { showNotification("백업 중 오류가 발생했습니다."); }
    finally { setIsSaving(false); setIsSettingsOpen(false); }
  };

  const handleLoadLibrary = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = ''; setIsSettingsOpen(false);
    if (!db) { showNotification("Firebase가 초기화되지 않았습니다."); return; }
    if (!user) {
      showNotification("로그인 대기 중... (최대 8초)");
      const start = Date.now();
      while (!auth?.currentUser && Date.now() - start < 8000) await delay(200);
      if (!auth?.currentUser) { showNotification("로그인이 완료되지 않았습니다. 페이지를 새로고침한 후 잠시 기다려주세요."); return; }
    }
    setIsUploading(true); setUploadProgress({ current: 0, total: 1, skipped: 0 });
    showNotification("백업 파일을 읽는 중...");
    const reader = new FileReader();
    reader.onerror = () => { showNotification("파일을 읽을 수 없습니다."); setIsUploading(false); };
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const loaded = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.banners) ? parsed.banners : (Array.isArray(parsed?.data) ? parsed.data : null));
        if (!loaded) { showNotification("올바른 백업 파일 형식이 아닙니다."); return; }
        if (loaded.length === 0) { showNotification("백업 파일이 비어있습니다."); return; }
        showNotification(`${loaded.length}개 항목 복원 시작...`);
        setUploadProgress({ current: 0, total: loaded.length, skipped: 0 });
        abortUploadRef.current = false; let count = 0; let skippedCount = 0;
        const existingKeys = new Set(banners.map(b => getUploadDuplicateKey(b.originalTitle || b.title, b.path)));
        let consecutiveFails = 0;
        for (let i = 0; i < loaded.length; i++) {
          const b = loaded[i];
          if (abortUploadRef.current) break;
          if (b.path && String(b.path).toLowerCase().split(/[\\/]/).includes('old')) {
            skippedCount++;
            setUploadProgress({ current: i + 1, total: loaded.length, skipped: skippedCount });
            continue;
          }
          const { id: _id, ...data } = b;
          const dataKey = getUploadDuplicateKey(data.originalTitle || data.title, data.path);
          if (skipDuplicates && existingKeys.has(dataKey)) {
            skippedCount++;
            setUploadProgress({ current: i + 1, total: loaded.length, skipped: skippedCount });
            if (i % 20 === 0) await delay(10);
            continue;
          }
          try {
            existingKeys.add(dataKey);
            await addBanner(data);
            count++; consecutiveFails = 0;
          } catch (uploadErr) {
            skippedCount++; consecutiveFails++;
            if (consecutiveFails >= 3) {
              showNotification(`연속 3건 실패로 중단합니다. (실패 사유: ${uploadErr.message || uploadErr})`);
              break;
            }
          }
          setUploadProgress({ current: i + 1, total: loaded.length, skipped: skippedCount });
        }
        if (abortUploadRef.current) showNotification("복원이 취소되었습니다.");
        else if (count === 0 && skippedCount > 0) showNotification(`모든 데이터가 이미 존재하거나 스킵되었습니다. (${skippedCount}개)`);
        else showNotification(`총 ${loaded.length}개 중 ${count}개 복원 완료 (스킵 ${skippedCount})`);
      } catch (err) { showNotification(`파일 파싱 중 오류: ${err.message || err}`); }
      finally { setTimeout(() => { setUploadProgress({ current: 0, total: 0, skipped: 0 }); setIsUploading(false); abortUploadRef.current = false; }, 1000); }
    };
    reader.readAsText(file);
  };

  // Duplicate manager
  const handleOpenDuplicateManager = () => {
    setIsProcessingFiles(true);
    showNotification("중복 데이터 검색 중...");
    setTimeout(() => {
      const groups = {};
      banners.forEach(b => { const k = getSmartDuplicateKey(b); if (!groups[k]) groups[k] = []; groups[k].push(b); });
      const dupes = Object.values(groups).filter(g => g.length > 1);
      if (dupes.length === 0) { showNotification("중복된 데이터가 없습니다."); setIsProcessingFiles(false); setIsSettingsOpen(false); return; }
      const initialToDelete = [];
      dupes.forEach(g => { g.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); for (let i = 1; i < g.length; i++) initialToDelete.push(g[i].id); });
      setDuplicateGroups(dupes); setDuplicateIdsToDelete(initialToDelete);
      setIsProcessingFiles(false); setIsSettingsOpen(false); setIsDuplicateModalOpen(true);
    }, 500);
  };
  const toggleDuplicateSelection = (id) => setDuplicateIdsToDelete(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const processDuplicateDeletion = async () => {
    if (duplicateIdsToDelete.length === 0) { setIsDuplicateModalOpen(false); return; }
    setIsDuplicateModalOpen(false);
    showNotification(`${duplicateIdsToDelete.length}개의 데이터를 삭제합니다...`);
    try {
      await deleteMany(duplicateIdsToDelete, 5);
      showNotification(`${duplicateIdsToDelete.length}개의 데이터가 삭제되었습니다.`);
    } catch { showNotification("데이터 삭제 중 오류가 발생했습니다."); }
  };

  // Detail modal helpers
  const handleOpenPreview = useCallback(async (banner) => {
    const sanitizeStr = (val, fb = '') => (val != null && typeof val !== 'object') ? String(val) : fb;
    const editCopy = { ...banner };
    if ('loadedImage' in editCopy) delete editCopy.loadedImage;
    if (!editCopy.linkUrl) editCopy.linkUrl = '';
    editCopy.title = sanitizeStr(editCopy.title, '제목 없음');
    editCopy.game = sanitizeStr(editCopy.game, '기타');
    editCopy.year = sanitizeStr(editCopy.year, new Date().getFullYear().toString());
    editCopy.month = sanitizeStr(editCopy.month, '');
    editCopy.path = sanitizeStr(editCopy.path, '');
    editCopy.score = sanitizeStr(editCopy.score, '');
    editCopy.userComment = sanitizeStr(editCopy.userComment, '');
    editCopy.createdAt = sanitizeStr(editCopy.createdAt, new Date().toISOString());
    if (!Array.isArray(editCopy.tags)) editCopy.tags = [];
    else editCopy.tags = editCopy.tags.filter(t => t != null && typeof t !== 'object').map(String);
    if (!editCopy.scores || typeof editCopy.scores !== 'object') editCopy.scores = null;
    setSelectedBanner(editCopy); setLastViewedId(editCopy.id); setEditedBanner({ ...editCopy });
    setHasChanges(false); setIsEditingPreview(false);
    setZoomScale(1); setPanPos({ x: 0, y: 0 });
    setPreviewModalOpen(true); setIsScorePopoverOpen(false); setIsScoreAdjExpanded(false);
    if (banner.loadedImage) setHighResImage(banner.loadedImage);
    else if (banner.preview) setHighResImage(banner.preview);
    if (banner.imageId && !banner.isTemp) {
      try { const data = await fetchBannerImage(banner.imageId); if (data?.original) setHighResImage(data.original); } catch {}
    }
  }, []);

  const handleEditChange = (field, value) => {
    if (!editedBanner) return;
    setEditedBanner(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'manualScoreAdj') {
        const adj = parseInt(value || 0);
        const prevAi = parseFloat(next.aiScore);
        const prevSc = parseFloat(selectedBanner.score);
        let aiBase100 = !isNaN(prevAi) ? Math.round(prevAi * 10) : Math.round(prevSc * 10) - (parseInt(selectedBanner.manualScoreAdj) || 0);
        const newScore100 = Math.max(0, Math.min(99, aiBase100 + adj));
        next.score = (newScore100 / 10).toFixed(1);
      }
      const { loadedImage: _li1, ...origin } = selectedBanner;
      const { loadedImage: _li2, ...curr } = next;
      setHasChanges(JSON.stringify(origin) !== JSON.stringify(curr));
      return next;
    });
  };

  const handleSaveEdit = async () => {
    if (!editedBanner) return;
    const { id, loadedImage: _li, ...data } = editedBanner;
    await updateBanner(id, data);
    setSelectedBanner({ ...selectedBanner, ...data });
    setHasChanges(false); setIsEditingPreview(false);
    showNotification("변경사항이 저장되었습니다.");
  };

  const handleCancelEdit = () => {
    const { loadedImage: _li, ...origin } = selectedBanner;
    setEditedBanner(origin); setHasChanges(false); setIsEditingPreview(false);
    showNotification("편집이 취소되었습니다.");
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const cur = editedBanner.tags || [];
    const tag = newTagInput.trim().replace(/,/g, '');
    if (!cur.includes(tag) && tag) handleEditChange('tags', [...cur, tag]);
    setNewTagInput('');
  };
  const handleRemoveTag = (t) => handleEditChange('tags', (editedBanner.tags || []).filter(x => x !== t));

  const dragHandlers = {
    onMouseDown: (e) => { e.preventDefault(); setIsDragging(true); setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y }); },
    onMouseMove: (e) => { if (!isDragging) return; setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); },
    onMouseUp: () => setIsDragging(false),
    onMouseLeave: () => setIsDragging(false),
    onWheel: (e) => { const a = e.deltaY * -0.001; setZoomScale(prev => Math.min(Math.max(1, prev + a), 5)); },
  };

  const isAllSelected = filteredBanners.length > 0 && selectedIds.length >= filteredBanners.length;
  const isChildContextActive = !!searchQuery;

  return (
    <div className={`flex h-full font-sans overflow-hidden selection:bg-[#0eb9b3]/30 ${isLightMode ? 'bg-[#f8f9fa] text-slate-900' : 'bg-[#0c0c0e] text-zinc-300'}`}
      onDragOver={handleGlobalDragOver} onDragEnter={handleGlobalDragEnter} onDragLeave={handleGlobalDragLeave} onDrop={handleGlobalDrop}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(150, 150, 150, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(150, 150, 150, 0.5); }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(150, 150, 150, 0.3) transparent; }
      `}</style>

      <GlobalDragOverlay isDraggingOverGlobal={isDraggingOverGlobal} />

      <CodexSidebar
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        isDesktopSidebarOpen={isDesktopSidebarOpen} setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
        isLightMode={isLightMode} isAdmin={isAdmin} banners={banners} tempBanners={tempBanners} cartIds={cartIds}
        activeCategory={activeCategory} handleGameClick={handleGameClick}
        pinnedGames={pinnedGames} togglePinGame={togglePinGame}
        recentGames={recentGames} availableGames={availableGames}
        isAllGamesModalOpen={isAllGamesModalOpen} setIsAllGamesModalOpen={setIsAllGamesModalOpen}
        isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen} settingsRef={settingsRef}
        adminModeEnabled={adminModeEnabled} toggleAdminMode={toggleAdminMode}
        handleSaveLibrary={handleSaveLibrary} handleLoadLibrary={handleLoadLibrary} isSaving={isSaving}
        setIsLogoManagerOpen={setIsLogoManagerOpen} handleFolderUpload={handleFolderUpload} isUploading={isUploading}
        lastFolderName={lastFolderName} handlePickFolder={handlePickFolder}
        handleReopenLastFolder={handleReopenLastFolder} handleForgetLastFolder={handleForgetLastFolder}
        isProcessingFiles={isProcessingFiles} handleFileUpload={handleFileUpload}
        skipDuplicates={skipDuplicates} setSkipDuplicates={setSkipDuplicates}
        handleOpenDuplicateManager={handleOpenDuplicateManager} handleSidebarClick={handleSidebarClick}
      />

      <LogoManagerModal isOpen={isLogoManagerOpen} onClose={() => setIsLogoManagerOpen(false)}
        isLightMode={isLightMode} availableGames={availableGames} gameLogos={gameLogos}
        handleUpdateLogo={handleUpdateLogo} handleRemoveLogo={handleRemoveLogo} />
      <UploadModal isOpen={isUploadModalOpen} onClose={() => { setIsUploadModalOpen(false); setPendingFiles([]); }}
        pendingFiles={pendingFiles} filteredPendingFiles={filteredPendingFiles}
        uploadSettings={uploadSettings} setUploadSettings={setUploadSettings}
        fileFilters={fileFilters} setFileFilters={setFileFilters}
        isAddingNewGame={isAddingNewGame} setIsAddingNewGame={setIsAddingNewGame}
        newGameName={newGameName} setNewGameName={setNewGameName}
        skipDuplicates={skipDuplicates} setSkipDuplicates={setSkipDuplicates}
        confirmUpload={confirmUpload} isLightMode={isLightMode} />
      <DuplicateModal isOpen={isDuplicateModalOpen} onClose={() => setIsDuplicateModalOpen(false)}
        isLightMode={isLightMode} duplicateGroups={duplicateGroups} duplicateIdsToDelete={duplicateIdsToDelete}
        toggleDuplicateSelection={toggleDuplicateSelection} processDuplicateDeletion={processDuplicateDeletion} />
      <BatchEditModal isOpen={isBatchEditModalOpen} onClose={() => setIsBatchEditModalOpen(false)}
        batchForm={batchForm} setBatchForm={setBatchForm} selectedIds={selectedIds}
        availableGames={availableGames} handleBatchSave={handleBatchSave} />

      <main className={`flex-1 flex flex-col relative overflow-hidden ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0c0c0e]'}`}>
        <CodexHeader user={user} isLightMode={isLightMode} isAdminMode={isAdminMode}
          isAiSearchMode={isAiSearchMode} setIsAiSearchMode={setIsAiSearchMode}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} isSearching={isSearching} handleSearch={handleSearch}
          setIsSidebarOpen={setIsSidebarOpen} activeCategory={activeCategory} setAiSearchIds={setAiSearchIds}
          isScrolled={isScrolled} isAllSelected={isAllSelected} handleSelectAll={handleSelectAll}
          filters={filters} setFilters={setFilters}
          isFilterMenuOpen={isFilterMenuOpen} setIsFilterMenuOpen={setIsFilterMenuOpen} filterMenuRef={filterMenuRef}
          isAdvancedFilterOpen={isAdvancedFilterOpen} setIsAdvancedFilterOpen={setIsAdvancedFilterOpen}
          topTags={topTags} availableGames={availableGames}
          gridSize={gridSize} setGridSize={setGridSize}
          sortOrder={sortOrder} setSortOrder={setSortOrder}
          isSortMenuOpen={isSortMenuOpen} setIsSortMenuOpen={setIsSortMenuOpen}
          filteredBannersCount={filteredBanners.length} isChildContextActive={isChildContextActive} />

        {!isSearching && (
          isLoadingData && banners.length === 0 && tempBanners.length === 0 ? (
            <div className={`flex-1 flex items-center justify-center ${isLightMode ? 'bg-slate-50' : 'bg-[#0c0c0e]'}`}>
              <Loader2 className="w-8 h-8 text-[#0eb9b3] animate-spin" />
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className={`flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300 ${isLightMode ? 'bg-[#f8f9fa] text-slate-500' : 'bg-[#0c0c0e] text-zinc-500'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                {activeCategory === 'temp' ? <Zap className="w-8 h-8 opacity-50" /> : <FolderOpen className="w-8 h-8 opacity-50" />}
              </div>
              <p className="text-sm font-medium">표시할 배너가 없습니다.</p>
              {activeCategory === 'temp' && <p className="text-xs">파일을 화면에 드래그하여 추가하세요.</p>}
            </div>
          ) : (
            <CodexGrid items={filteredBanners} gridSize={gridSize} isLoading={isLoadingData} isLightMode={isLightMode}
              onScrollChange={setIsScrolled} resetTrigger={`${activeCategory}-${searchQuery}`}
              renderItem={(banner) => (
                <CodexCard banner={banner} selected={selectedIds.includes(banner.id)} toggleSelection={toggleSelection}
                  onOpenPreview={handleOpenPreview} onCopyPath={handleCopyPathGrid}
                  isProcessing={processingBannerId === banner.id} isAdminMode={isAdminMode} isLightMode={isLightMode}
                  isLastViewed={lastViewedId === banner.id} isInCart={cartIds.includes(banner.id)} onToggleCart={handleToggleCart} />
              )} />
          )
        )}

        <SelectionToolbar selectedCount={selectedIds.length} isLightMode={isLightMode} isAdminMode={isAdminMode}
          isBatchProcessing={isBatchProcessing} activeView={activeView} activeCategory={activeCategory}
          handleOpenBatchEdit={handleOpenBatchEdit} handleAddToCart={handleAddToCart} handleRemoveFromCart={handleRemoveFromCart}
          handleResetAI={handleResetAI} openOCRConfirm={() => setOcrProgress({ isOpen: true, status: 'confirm', current: 0, total: selectedIds.length, target: '' })}
          openDeleteConfirm={() => setIsDeleteModalOpen(true)} clearSelection={() => setSelectedIds([])} />

        <ConfirmModal isOpen={isDeleteModalOpen} isLightMode={isLightMode} icon={Trash2} color="red"
          title="삭제 확인" confirmLabel="삭제"
          message={`선택한 ${selectedIds.length}개의 항목을 삭제하시겠습니까?<br/>${selectedIds.every(id => id.startsWith('temp_')) ? '' : '삭제하려면 비밀번호를 입력하세요.'}`}
          onClose={() => { setIsDeleteModalOpen(false); setDeletePassword(''); }}
          onConfirm={handleConfirmDelete}
          extra={!selectedIds.every(id => id.startsWith('temp_')) && (
            <input type="password" placeholder="비밀번호 입력" value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmDelete()}
              className={`w-full text-center px-4 py-3 rounded-lg border text-sm focus:outline-none focus:border-red-500 transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'}`}
              autoFocus />
          )} />

        <ConfirmModal isOpen={isResetModalOpen} isLightMode={isLightMode} icon={RotateCcw} color="yellow"
          title="AI 데이터 초기화" confirmLabel="초기화 진행"
          message={`선택한 <span class="font-bold text-yellow-500">${selectedIds.length}개</span> 배너의 AI 분석 데이터를 초기화하시겠습니까?<br/><span class="text-xs text-yellow-500/80 mt-1 block">(점수, 태그, 추출된 텍스트가 지워집니다)</span>`}
          onClose={() => setIsResetModalOpen(false)} onConfirm={executeResetAI} />

        <OCRProgressModal ocrProgress={ocrProgress} setOcrProgress={setOcrProgress} isLightMode={isLightMode}
          runSelectedOCR={() => runSelectedOCR(selectedIds, activeCategory === 'temp' ? tempBanners : banners, () => setSelectedIds([]))}
          handleCancelBatch={handleCancelBatch} />
        <BatchProcessingPill isBatchProcessing={isBatchProcessing} isOpen={ocrProgress.isOpen} ocrProgress={ocrProgress}
          onClick={() => setOcrProgress(prev => ({ ...prev, isOpen: true }))} />
        <UploadProgressModal isUploading={isUploading} uploadProgress={uploadProgress} isLightMode={isLightMode}
          handleCancelUpload={handleCancelUpload} />
        <ProcessingFilesModal isOpen={isProcessingFiles} isLightMode={isLightMode} />
        <NotificationToast notification={notification} isLightMode={isLightMode} />

        <CodexDetailModal isOpen={previewModalOpen} selectedBanner={selectedBanner} editedBanner={editedBanner}
          hasChanges={hasChanges} isEditingPreview={isEditingPreview} setIsEditingPreview={setIsEditingPreview}
          highResImage={highResImage} isLightMode={isLightMode} isAdminMode={isAdminMode}
          gameLogos={gameLogos} availableGames={availableGames} cartIds={cartIds}
          zoomScale={zoomScale} setZoomScale={setZoomScale} panPos={panPos} isDragging={isDragging} dragHandlers={dragHandlers}
          isScorePopoverOpen={isScorePopoverOpen} setIsScorePopoverOpen={setIsScorePopoverOpen}
          isScoreAdjExpanded={isScoreAdjExpanded} setIsScoreAdjExpanded={setIsScoreAdjExpanded}
          newTagInput={newTagInput} setNewTagInput={setNewTagInput} isCopied={isCopied}
          onClose={() => setPreviewModalOpen(false)} handleDownloadImage={handleDownloadImage}
          handleEditChange={handleEditChange} handleSaveEdit={handleSaveEdit} handleCancelEdit={handleCancelEdit}
          handleAddTag={handleAddTag} handleRemoveTag={handleRemoveTag} handleCopyPathModal={handleCopyPathModal}
          toggleLike={toggleLike} toggleFeature={toggleFeature} handleToggleCart={handleToggleCart}
          handleDeleteSingleBanner={handleDeleteSingleBanner} handleSmartAnalysis={handleSmartAnalysis}
          processingBannerId={processingBannerId} handleCopy={handleCopy} showNotification={showNotification} />
      </main>
    </div>
  );
}
