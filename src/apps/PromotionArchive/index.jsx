import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  collection, doc, updateDoc, onSnapshot, writeBatch,
} from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { uploadBase64 } from '../../lib/storage';
import { useAuth } from '../../context/AuthContext';
import { useGlobal } from '../../context/GlobalContext';
import { processAndCropImage } from './utils/imageProcessor';

import BannerCard from './components/banner/BannerCard';
import UploadModal from './components/modals/UploadModal';
import PreviewModal from './components/modals/PreviewModal';
import BatchEditModal from './components/modals/BatchEditModal';
import ProcessingModal from './components/modals/ProcessingModal';
import AnalysisDashboard from './components/dashboard/AnalysisDashboard';
import AiAnalysisModal from './components/modals/AiAnalysisModal';
import WebDesignEvalModal from './components/modals/WebDesignEvalModal';
import ConfirmWorkspace from './components/modals/ConfirmWorkspace';
import { analyzeWebDesign, prepareImageForAI } from './services/gemini';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import FloatingActionBar from './components/layout/FloatingActionBar';


const GAMES = ['아이온', '블소', '리니지', '기타'];

// 컬렉션 경로 — BannerCodex/PromptArc와 같은 패턴으로 통일.
const promoColRef = () => collection(db, 'artifacts', appId, 'public', 'data', 'promotion-banners');
const promoDocRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'promotion-banners', id);

// base64 이미지를 Cloudinary로 업로드하고, 받은 URL로 교체. (이미 URL이면 그대로 둠)
const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:');
async function uploadBannerImagesToCloud(banner) {
  const out = { ...banner };
  if (isDataUrl(out.preview)) out.preview = await uploadBase64(out.preview);
  if (isDataUrl(out.full_image)) out.full_image = await uploadBase64(out.full_image);
  if (isDataUrl(out.mobile_image)) out.mobile_image = await uploadBase64(out.mobile_image);
  if (Array.isArray(out.history)) {
    out.history = await Promise.all(out.history.map(async (h) => ({
      ...h,
      img: isDataUrl(h?.img) ? await uploadBase64(h.img) : h?.img,
    })));
  }
  return out;
}

function App() {
    const { user, isAdmin } = useAuth();
    const { isLight } = useGlobal();
    const [allBanners, setAllBanners] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // 관리자 모드 (체크박스/플로팅 액션바 노출 토글) — 관리자만 켤 수 있음, localStorage 영속화
    const [isAdminMode, setIsAdminMode] = useState(() => {
        try { return localStorage.getItem('pa_isAdminMode') === 'true'; } catch { return false; }
    });
    useEffect(() => {
        try { localStorage.setItem('pa_isAdminMode', String(isAdminMode)); } catch { /* noop */ }
    }, [isAdminMode]);
    // 권한이 사라지면 강제로 꺼야 함 (관리자 권한 회수 등 안전장치)
    useEffect(() => {
        if (!isAdmin && isAdminMode) setIsAdminMode(false);
    }, [isAdmin, isAdminMode]);
    // 관리자 모드 토글 시 다중 선택 초기화는 setSelectedItems 선언 이후로 이동 (아래 별도 effect)

    // Firestore 실시간 구독 — Dexie의 useLiveQuery 대체
    useEffect(() => {
        if (!db) { setIsLoadingData(false); return; }
        const watchdog = setTimeout(() => {
            setIsLoadingData(prev => {
                if (prev) console.warn('[PromotionArchive] watchdog: still loading after 8s');
                return false;
            });
        }, 8000);
        const unsub = onSnapshot(promoColRef(),
            (snap) => {
                clearTimeout(watchdog);
                const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllBanners(arr);
                setIsLoadingData(false);
            },
            (err) => {
                clearTimeout(watchdog);
                console.error('[PromotionArchive] listener error:', err);
                alert(`데이터 로딩 실패: ${err.code || err.message}`);
                setIsLoadingData(false);
            });
        return () => { clearTimeout(watchdog); unsub(); };
    }, []);

    const [currentView, setCurrentView] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);

    // BannerCodex 패턴 — 사이드바 빈 공간 클릭 시 데스크톱에서 토글.
    const handleSidebarClick = useCallback((e) => {
        const isInteractive = e.target.closest("button, input, label, select, a, span");
        if (!isInteractive && window.innerWidth >= 768) setIsDesktopSidebarOpen(prev => !prev);
    }, []);

    const [collectionIds, setCollectionIds] = useState([]);
    const [isCollectionMode, setIsCollectionMode] = useState(false);
    const [expandedGames, setExpandedGames] = useState([]);
    const [isAllGamesModalOpen, setIsAllGamesModalOpen] = useState(false);
    const [pinnedGames, setPinnedGames] = useState(() => {
        try {
            const saved = localStorage.getItem('pinnedGames_promotion');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    useEffect(() => {
        localStorage.setItem('pinnedGames_promotion', JSON.stringify(pinnedGames));
    }, [pinnedGames]);
    const togglePinGame = (game) => {
        setPinnedGames(prev => prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]);
    };
    const availableGames = useMemo(() => {
        const fromData = allBanners.map(b => b.game).filter(Boolean);
        return [...new Set([...GAMES, ...fromData])].sort();
    }, [allBanners]);
    const recentGames = useMemo(() => {
        const sortedByDate = [...allBanners].sort((a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        const ordered = [];
        for (const b of sortedByDate) {
            if (b.game && !ordered.includes(b.game)) ordered.push(b.game);
        }
        return ordered.filter(g => !pinnedGames.includes(g)).slice(0, 2);
    }, [allBanners, pinnedGames]);

    const [isAiSearchMode, setIsAiSearchMode] = useState(false);
    const [isAiQuerying] = useState(false);
    const [aiSearchKeywords, setAiSearchKeywords] = useState([]);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({ score: 'all', year: 'all', status: 'all' });
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('latest');

    const [isLargeGrid, setIsLargeGrid] = useState(false);

    const filterRef = useRef(null);
    const sortRef = useRef(null);
    const settingsRef = useRef(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [selectedItems, setSelectedItems] = useState([]);
    // 관리자 모드 토글 → 다중 선택 초기화
    useEffect(() => {
        if (!isAdminMode) setSelectedItems(prev => (prev.length > 0 ? [] : prev));
    }, [isAdminMode]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState(null);

    const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isWebEvalOpen, setIsWebEvalOpen] = useState(false);
    const [evalTargetBanner, setEvalTargetBanner] = useState(null);
    const [isEvalRunning, setIsEvalRunning] = useState(false);

    const [pendingFiles, setPendingFiles] = useState([]);
    const [uploadSettings, setUploadSettings] = useState({ game: '아이온', year: new Date().getFullYear().toString() });
    const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
    const [processingMessage, setProcessingMessage] = useState("");
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percentage: 0 });

    const [editedBanner, setEditedBanner] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const storedCollection = localStorage.getItem('myCollection');
        if (storedCollection) setCollectionIds(JSON.parse(storedCollection));
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
            if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortMenuOpen(false);
            if (settingsRef.current && !settingsRef.current.contains(event.target)) setIsSettingsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen, isSortMenuOpen, isSettingsOpen]);

    const filteredBanners = useMemo(() => {
        let result = allBanners;
        if (isCollectionMode) result = result.filter(b => collectionIds.includes(b.id));
        if (activeCategory === 'favorites') result = result.filter(b => b.liked === 1);
        else if (activeCategory !== 'all' && activeCategory !== 'analysis') result = result.filter(b => b.game === activeCategory);

        if (searchQuery && !isAiSearchMode) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(b =>
                b.title?.toLowerCase().includes(lower) ||
                b.tags?.some(t => t.toLowerCase().includes(lower)) ||
                b.game?.toLowerCase().includes(lower)
            );
        }

        if (activeFilters.year !== 'all') result = result.filter(b => String(b.year) === activeFilters.year);
        if (activeFilters.score !== 'all') {
            if (activeFilters.score === 'high') result = result.filter(b => (b.designScore || 0) >= 8);
            if (activeFilters.score === 'medium') result = result.filter(b => (b.designScore || 0) < 8);
        }

        const sorted = [...result];
        sorted.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            const scoreA = a.designScore || 0;
            const scoreB = b.designScore || 0;
            switch (sortOrder) {
                case 'latest': return dateB - dateA;
                case 'oldest': return dateA - dateB;
                case 'score_desc': return scoreB - scoreA;
                case 'score_asc': return scoreA - scoreB;
                default: return 0;
            }
        });
        return sorted;
    }, [allBanners, searchQuery, activeCategory, isCollectionMode, collectionIds, isAiSearchMode, activeFilters, sortOrder]);

    const handleGameClick = (game) => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
        if (game === 'all') {
            setCurrentView('grid'); setActiveCategory('all'); setIsCollectionMode(false); setActiveFilters(prev => ({ ...prev, year: 'all' }));
        } else if (game === 'analysis') {
            setCurrentView('dashboard'); setActiveCategory('analysis'); setIsCollectionMode(false);
        } else if (game === 'favorites') {
            setCurrentView('grid'); setActiveCategory('favorites'); setIsCollectionMode(false); setActiveFilters(prev => ({ ...prev, year: 'all' }));
        } else {
            setCurrentView('grid'); setActiveCategory(game); setIsCollectionMode(false); setActiveFilters(prev => ({ ...prev, year: 'all' }));
            setIsAllGamesModalOpen(false);
        }
    };

    const handleFileUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const invalidFiles = files.filter(f => f.size === 0);
            if (invalidFiles.length > 0) {
                alert(`⚠️ 보안 문제로 일부 파일을 읽을 수 없습니다.\n해당 폴더를 '바탕화면'으로 복사한 뒤 다시 시도해주세요!`);
                e.target.value = '';
                return;
            }
            setPendingFiles(files);
            setIsUploadModalOpen(true);
            e.target.value = '';
        }
    };

    // 업로드 — 5장 단위 chunk → Cloudinary 업로드 → Firestore writeBatch
    const handleUpload = async () => {
        if (!user) { alert("로그인이 필요합니다."); return; }
        setIsUploadModalOpen(false);
        setIsProcessingModalOpen(true);
        setProcessingMessage("하위 폴더 구조 분석 중...");
        setUploadProgress({ current: 0, total: 0, percentage: 0 });

        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const directItems = [];
            const groups = {};
            const excludeRegex = /개발|팝업|popup|가이드|guide|Thumbs\.db|^\./i;

            pendingFiles.forEach(file => {
                if (excludeRegex.test(file.name)) return;

                if (!file.webkitRelativePath || file.webkitRelativePath.split('/').length < 2) {
                    directItems.push({ title: file.name.split('.')[0], pcFile: file, mobileFile: null });
                    return;
                }

                const pathParts = file.webkitRelativePath.split('/');
                const folderName = pathParts[pathParts.length - 2].toLowerCase();
                const fileName = file.name.toLowerCase();

                let type = null;
                if (/(?:^|[^a-z])(pc|web)(?:[^a-z]|$)/i.test(folderName)) type = 'pc';
                else if (/(?:^|[^a-z])(mo|mobile|m)(?:[^a-z]|$)/i.test(folderName)) type = 'mobile';

                if (!type) {
                    if (/(?:_|-|\[|\(|^| )(pc|web)(?:_|-|\]|\)|\.| |$)/i.test(fileName)) type = 'pc';
                    else if (/(?:_|-|\[|\(|^| )(mo|mobile|mb)(?:_|-|\]|\)|\.| |$)/i.test(fileName)) type = 'mobile';
                }

                if (!type) return;

                const designIndex = pathParts.findIndex(p => p.includes('디자인'));
                let title;
                if (designIndex > 0) title = pathParts[designIndex - 1].trim();
                else title = pathParts.length >= 3 ? pathParts[pathParts.length - 3].trim() : pathParts[pathParts.length - 2].trim();
                if (!title) title = "미분류";

                if (!groups[title]) groups[title] = { title, pcCandidates: [], moCandidates: [] };

                if (type === 'pc') groups[title].pcCandidates.push(file);
                else groups[title].moCandidates.push(file);
            });

            const groupItems = Object.values(groups).map(g => ({
                title: g.title,
                pcFile: g.pcCandidates.sort((a, b) => b.size - a.size)[0] || null,
                mobileFile: g.moCandidates.sort((a, b) => b.size - a.size)[0] || null
            }));

            const itemsToProcess = [...directItems, ...groupItems].filter(item => {
                if (!item.pcFile && !item.mobileFile) return false;
                const isDup = allBanners.some(b => b.game === uploadSettings.game && b.title.replace(/\s+/g, '') === item.title.replace(/\s+/g, ''));
                return !isDup;
            });

            if (itemsToProcess.length === 0) {
                alert("업로드할 유효한 새 항목이 없습니다.");
                setIsProcessingModalOpen(false);
                return;
            }

            let successCount = 0;
            let failedItems = [];
            const CHUNK = 5;
            let chunkBanners = [];

            const flushChunk = async () => {
                if (chunkBanners.length === 0) return;
                setProcessingMessage("Cloudinary 업로드 + Firestore 저장 중...");
                // Cloudinary upload (parallel within chunk)
                const uploaded = await Promise.all(chunkBanners.map(uploadBannerImagesToCloud));
                // Firestore write batch
                const batch = writeBatch(db);
                uploaded.forEach(b => {
                    const docRef = doc(promoColRef()); // auto ID
                    batch.set(docRef, { ...b, ownerUid: user.uid });
                });
                await batch.commit();
                chunkBanners = [];
                await new Promise(r => setTimeout(r, 100));
            };

            for (let i = 0; i < itemsToProcess.length; i++) {
                const item = itemsToProcess[i];
                setProcessingMessage(`[${item.title}] 최적화 중... (${i + 1}/${itemsToProcess.length})`);
                setUploadProgress({ current: i + 1, total: itemsToProcess.length, percentage: Math.round(((i + 1) / itemsToProcess.length) * 100) });

                await new Promise(resolve => setTimeout(resolve, 50));

                try {
                    const [pcData, moData] = await Promise.all([
                        item.pcFile ? processAndCropImage(item.pcFile, false) : Promise.resolve(null),
                        item.mobileFile ? processAndCropImage(item.mobileFile, true) : Promise.resolve(null)
                    ]);

                    if (!pcData && !moData) throw new Error("이미지 로드 실패");

                    chunkBanners.push({
                        title: item.title,
                        game: uploadSettings.game,
                        year: uploadSettings.year,
                        preview: pcData?.thumbnail || moData?.thumbnail,
                        full_image: pcData?.detail || null,
                        mobile_image: moData?.detail || null,
                        created_at: new Date().toISOString(),
                        liked: 0,
                        tags: [],
                        history: []
                    });
                    successCount++;

                    if (chunkBanners.length >= CHUNK) await flushChunk();
                } catch (err) {
                    console.error(`❌ 실패: ${item.title}`, err);
                    failedItems.push(item.title);
                }
            }

            if (chunkBanners.length > 0) await flushChunk();

            if (failedItems.length > 0) alert(`완료되었습니다. (성공: ${successCount}, 실패: ${failedItems.length})`);

        } catch (err) {
            console.error(err);
            alert("업로드 중 치명적인 오류가 발생했습니다.");
        } finally {
            setIsProcessingModalOpen(false);
            setPendingFiles([]);
        }
    };

    // 백업 — Firestore에서 모두 읽어서 JSON으로 다운로드
    const handleSaveLibrary = async () => {
        try {
            setProcessingMessage("백업 데이터 생성 중...");
            setIsProcessingModalOpen(true);

            const allData = allBanners; // 이미 listener가 들고있음
            if (allData.length === 0) {
                alert("백업할 데이터가 없습니다.");
                setIsProcessingModalOpen(false);
                return;
            }

            const blobParts = ["["];
            for (let i = 0; i < allData.length; i++) {
                blobParts.push(JSON.stringify(allData[i]));
                if (i < allData.length - 1) blobParts.push(",");
                if (i % 20 === 0) await new Promise(resolve => setTimeout(resolve, 0));
            }
            blobParts.push("]");

            const blob = new Blob(blobParts, { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const node = document.createElement('a');
            node.href = url;
            node.download = `promotion_full_backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(node);
            node.click();

            document.body.removeChild(node);
            URL.revokeObjectURL(url);

            setProcessingMessage("백업 완료!");
            setTimeout(() => setIsProcessingModalOpen(false), 1000);
        } catch (error) {
            console.error(error);
            alert("백업 파일 생성 실패");
            setIsProcessingModalOpen(false);
        }
    };

    // 복원 — 기존 모두 삭제(batch) → Cloudinary 업로드 → Firestore 저장(batch 10개씩)
    const handleLoadLibrary = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        if (!user) { alert("로그인이 필요합니다."); return; }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) { alert("형식이 올바르지 않습니다."); return; }
                if (!confirm(`기존 ${allBanners.length}개를 모두 삭제하고 ${data.length}개로 복원하시겠습니까?`)) return;

                setIsProcessingModalOpen(true);
                setProcessingMessage("기존 데이터 삭제 중...");
                // batch delete (500/chunk)
                const ids = allBanners.map(b => b.id);
                for (let i = 0; i < ids.length; i += 500) {
                    const batch = writeBatch(db);
                    ids.slice(i, i + 500).forEach(id => batch.delete(promoDocRef(id)));
                    await batch.commit();
                }

                setProcessingMessage(`복원 시작 (${data.length}개)...`);
                setUploadProgress({ current: 0, total: data.length, percentage: 0 });
                let written = 0;
                const CHUNK = 10;
                for (let i = 0; i < data.length; i += CHUNK) {
                    const slice = data.slice(i, i + CHUNK);
                    setProcessingMessage(`이미지 업로드 중... ${i} / ${data.length}`);
                    const uploaded = await Promise.all(slice.map(b => uploadBannerImagesToCloud(b).catch(err => {
                        console.error('[PromotionArchive] image upload failed', err);
                        return null;
                    })));
                    const batch = writeBatch(db);
                    uploaded.forEach(b => {
                        if (!b) return;
                        const { id: _id, ...rest } = b;
                        const docRef = doc(promoColRef());
                        batch.set(docRef, { ...rest, ownerUid: user.uid });
                    });
                    await batch.commit();
                    written += slice.length;
                    setUploadProgress({ current: written, total: data.length, percentage: Math.round((written / data.length) * 100) });
                }
                alert(`복원 완료: ${written}개`);
            } catch (err) {
                console.error(err);
                alert(`복원 실패: ${err.message || err}`);
            } finally {
                setIsProcessingModalOpen(false);
            }
        };
        reader.readAsText(file);
    };

    const handleDelete = async () => {
        if (selectedItems.length === 0) return;
        if (window.confirm("선택한 항목을 삭제하시겠습니까?")) {
            try {
                for (let i = 0; i < selectedItems.length; i += 500) {
                    const batch = writeBatch(db);
                    selectedItems.slice(i, i + 500).forEach(id => batch.delete(promoDocRef(id)));
                    await batch.commit();
                }
                setSelectedItems([]);
            } catch (e) { alert(`삭제 실패: ${e.message}`); }
        }
    };

    const handleBulkAddToCollection = () => {
        const next = [...new Set([...collectionIds, ...selectedItems])];
        setCollectionIds(next);
        localStorage.setItem('myCollection', JSON.stringify(next));
        setSelectedItems([]);
    };

    const handleBatchUpdate = async (batchForm) => {
        try {
            const items = allBanners.filter(b => selectedItems.includes(b.id));
            const BATCH = 500;
            for (let i = 0; i < items.length; i += BATCH) {
                const batch = writeBatch(db);
                items.slice(i, i + BATCH).forEach(item => {
                    let newTags = [...(item.tags || [])];
                    if (batchForm.addTags.length > 0) newTags = [...new Set([...newTags, ...batchForm.addTags])];
                    if (batchForm.removeTags.length > 0) newTags = newTags.filter(t => !batchForm.removeTags.includes(t));
                    batch.update(promoDocRef(item.id), {
                        tags: newTags,
                        ...(batchForm.game ? { game: batchForm.game } : {}),
                        ...(batchForm.year ? { year: batchForm.year } : {})
                    });
                });
                await batch.commit();
            }
            setIsBatchEditOpen(false);
            setSelectedItems([]);
        } catch (e) { alert(`일괄 업데이트 실패: ${e.message}`); }
    };

    const handleOpenPreview = (banner) => {
        setSelectedBanner(banner);
        setEditedBanner({ ...banner });
        setHasChanges(false);
        setIsPreviewOpen(true);
    };

    const handleUpdateHistory = async (newHistory) => {
        if (!selectedBanner) return;
        try {
            // 새로 추가된 history 항목의 base64 이미지를 Cloudinary로 업로드
            const uploadedHistory = await Promise.all(newHistory.map(async (h) => ({
                ...h,
                img: isDataUrl(h?.img) ? await uploadBase64(h.img) : h?.img,
            })));
            const latestImg = uploadedHistory[uploadedHistory.length - 1]?.img;
            const updateData = {
                history: uploadedHistory,
                preview: latestImg || selectedBanner.preview,
                isCompleted: false,
                completedAt: null
            };
            await updateDoc(promoDocRef(selectedBanner.id), updateData);
            const updated = { ...selectedBanner, ...updateData };
            setSelectedBanner(updated);
            setEditedBanner(updated);
        } catch (e) { alert(`업데이트 실패: ${e.message}`); }
    };

    const toggleLike = useCallback(async (id, currentLiked) => {
        try {
            await updateDoc(promoDocRef(id), { liked: currentLiked ? 0 : 1 });
        } catch (e) { console.error('[PromotionArchive] like toggle failed', e); }
    }, []);

    const getGridClass = () => {
        if (isLargeGrid) return isDesktopSidebarOpen ? 'grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5';
        return isDesktopSidebarOpen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6';
    };

    return (
        <div
            data-pa-theme={isLight ? 'light' : 'dark'}
            className={`flex h-full font-sans selection:bg-[#d8b17e]/30 overflow-hidden ${isLight ? 'bg-[#F5F5F5] text-[#1A1A1A]' : 'bg-[#0c0c0e] text-zinc-300'}`}
        >
            {/* 라이트 모드 오버라이드 — 하드코딩된 다크 컬러 surface 를 light 토큰으로 매핑 */}
            <style>{`
              [data-pa-theme="light"] .bg-\\[\\#0c0c0e\\] { background-color: #F5F5F5 !important; }
              [data-pa-theme="light"] .bg-\\[\\#111\\] { background-color: #FFFFFF !important; }
              [data-pa-theme="light"] .bg-\\[\\#111111\\] { background-color: #FFFFFF !important; }
              [data-pa-theme="light"] .bg-\\[\\#1A1A1A\\] { background-color: #FFFFFF !important; }
              [data-pa-theme="light"] .bg-zinc-900 { background-color: #FFFFFF !important; }
              [data-pa-theme="light"] .bg-zinc-800 { background-color: #F0F0F0 !important; }
              [data-pa-theme="light"] .bg-zinc-800\\/60 { background-color: rgba(240,240,240,0.6) !important; }
              [data-pa-theme="light"] .bg-zinc-800\\/80 { background-color: rgba(240,240,240,0.85) !important; }
              [data-pa-theme="light"] .bg-zinc-900\\/50 { background-color: rgba(255,255,255,0.5) !important; }
              [data-pa-theme="light"] .bg-black\\/50 { background-color: rgba(0,0,0,0.35) !important; }
              [data-pa-theme="light"] .bg-black\\/70 { background-color: rgba(0,0,0,0.5) !important; }
              [data-pa-theme="light"] .text-zinc-200 { color: #1A1A1A !important; }
              [data-pa-theme="light"] .text-zinc-300 { color: #1A1A1A !important; }
              [data-pa-theme="light"] .text-zinc-400 { color: #555555 !important; }
              [data-pa-theme="light"] .text-zinc-500 { color: #666666 !important; }
              [data-pa-theme="light"] .text-zinc-600 { color: #888888 !important; }
              [data-pa-theme="light"] .text-white { color: #1A1A1A !important; }
              [data-pa-theme="light"] .border-zinc-800 { border-color: #E0E0E0 !important; }
              [data-pa-theme="light"] .border-zinc-800\\/80 { border-color: #E0E0E0 !important; }
              [data-pa-theme="light"] .border-white\\/5 { border-color: #E5E5E5 !important; }
              [data-pa-theme="light"] .border-white\\/10 { border-color: #DCDCDC !important; }
              [data-pa-theme="light"] .border-white\\/20 { border-color: #C8C8C8 !important; }
              [data-pa-theme="light"] .hover\\:bg-zinc-800:hover { background-color: #F0F0F0 !important; }
              [data-pa-theme="light"] .hover\\:bg-white\\/5:hover { background-color: rgba(0,0,0,0.04) !important; }
              [data-pa-theme="light"] .hover\\:bg-white\\/10:hover { background-color: rgba(0,0,0,0.07) !important; }
              [data-pa-theme="light"] .hover\\:text-white:hover { color: #1A1A1A !important; }
            `}</style>
            <Sidebar
                isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
                isDesktopSidebarOpen={isDesktopSidebarOpen} setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
                handleSidebarClick={handleSidebarClick}
                activeCategory={activeCategory} handleGameClick={handleGameClick}
                isCollectionMode={isCollectionMode} setIsCollectionMode={setIsCollectionMode}
                collectionIds={collectionIds} availableGames={availableGames}
                pinnedGames={pinnedGames} togglePinGame={togglePinGame} recentGames={recentGames}
                isAllGamesModalOpen={isAllGamesModalOpen} setIsAllGamesModalOpen={setIsAllGamesModalOpen}
                expandedGames={expandedGames} setExpandedGames={setExpandedGames}
                activeYear={activeFilters.year === 'all' ? null : Number(activeFilters.year)}
                handleYearClick={(g, y) => { setActiveCategory(g); setActiveFilters(p => ({ ...p, year: String(y) })); setCurrentView('grid'); }}
                isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen} settingsRef={settingsRef}
                handleFolderUpload={handleFileUpload} handleFileUpload={handleFileUpload}
                handleSaveLibrary={handleSaveLibrary} handleLoadLibrary={handleLoadLibrary}
                banners={allBanners}
                isAdminMode={isAdminMode} setIsAdminMode={setIsAdminMode}
            />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header
                    setIsSidebarOpen={setIsSidebarOpen}
                    // search
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    isAiSearchMode={isAiSearchMode} setIsAiSearchMode={setIsAiSearchMode}
                    isAiQuerying={isAiQuerying} handleAiSearch={() => { }} setAiSearchKeywords={setAiSearchKeywords}
                    aiSearchKeywords={aiSearchKeywords}
                    // context
                    isCollectionMode={isCollectionMode} setIsCollectionMode={setIsCollectionMode}
                    activeCategory={activeCategory}
                    filteredBanners={filteredBanners} banners={allBanners}
                    // admin selection
                    isAdminMode={isAdminMode}
                    selectedIds={selectedItems}
                    handleSelectAll={() => setSelectedItems(selectedItems.length === filteredBanners.length ? [] : filteredBanners.map(b => b.id))}
                    // filters
                    isFilterOpen={isFilterOpen} setIsFilterOpen={setIsFilterOpen}
                    activeFilters={activeFilters} setActiveFilters={setActiveFilters}
                    availableYears={[2026, 2025, 2024, 2023]} filterRef={filterRef}
                    // sort
                    isSortMenuOpen={isSortMenuOpen} setIsSortMenuOpen={setIsSortMenuOpen}
                    sortOrder={sortOrder} setSortOrder={setSortOrder} sortRef={sortRef}
                    // grid
                    isLargeGrid={isLargeGrid} setIsLargeGrid={setIsLargeGrid}
                />

                <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 pt-4 relative scrollbar-hide">
                    {currentView === 'dashboard' ? (
                        <AnalysisDashboard banners={filteredBanners} onOpenPreview={handleOpenPreview} />
                    ) : (
                        <>
                            {isLoadingData && allBanners.length === 0 ? (
                                <div className="text-center py-20 text-zinc-500 text-sm">데이터를 불러오는 중...</div>
                            ) : (
                                <div className={`grid gap-5 transition-all duration-300 pb-24 ${getGridClass()}`}>
                                    {filteredBanners.map(banner => (
                                        <div key={banner.id} className="relative group">
                                            <BannerCard
                                                banner={banner}
                                                selected={selectedItems.includes(banner.id)}
                                                toggleSelection={(id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                                                toggleLike={(id) => toggleLike(id, banner.liked)}
                                                onOpenPreview={handleOpenPreview}
                                                isCollectionMode={isCollectionMode}
                                                onRemove={(id) => { const next = collectionIds.filter(c => c !== id); setCollectionIds(next); localStorage.setItem('myCollection', JSON.stringify(next)); }}
                                                isAdminMode={isAdminMode}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>

                {isAdminMode && selectedItems.length > 0 && (
                    <FloatingActionBar
                        selectedCount={selectedItems.length}
                        onAddToCollection={handleBulkAddToCollection}
                        onEditProperties={() => setIsBatchEditOpen(true)}
                        onDeselectAll={() => setSelectedItems([])}
                        onAiAnalysis={() => setIsAiModalOpen(true)}
                        onDelete={handleDelete}
                    />
                )}

                {isPreviewOpen && (
                    <PreviewModal
                        isOpen={isPreviewOpen}
                        onClose={() => setIsPreviewOpen(false)}
                        banner={selectedBanner}
                        editedBanner={editedBanner}
                        onEditChange={(field, value) => { setEditedBanner(prev => ({ ...prev, [field]: value })); setHasChanges(true); }}
                        hasChanges={hasChanges}
                        onToggleLike={(id) => toggleLike(id, selectedBanner?.liked)}
                        onSave={async () => {
                            if (!editedBanner) return;
                            try {
                                // 편집 중 새 base64 이미지가 들어왔다면 Cloudinary 업로드
                                const uploaded = await uploadBannerImagesToCloud(editedBanner);
                                const { id: _id, ...rest } = uploaded;
                                await updateDoc(promoDocRef(selectedBanner.id), rest);
                                setHasChanges(false); setSelectedBanner(uploaded);
                                alert("저장되었습니다.");
                            } catch (e) { alert(`저장 실패: ${e.message}`); }
                        }}
                        collectionIds={collectionIds}
                        onToggleCollection={(id) => {
                            const next = collectionIds.includes(id)
                                ? collectionIds.filter(c => c !== id)
                                : [...collectionIds, id];
                            setCollectionIds(next);
                            localStorage.setItem('myCollection', JSON.stringify(next));
                        }}
                        availableGames={GAMES}
                        onOpenAnalysis={(b) => {
                            setEvalTargetBanner(b || selectedBanner);
                            setIsWebEvalOpen(true);
                        }}
                    />
                )}

                {isWebEvalOpen && (
                    <WebDesignEvalModal
                        isOpen={isWebEvalOpen}
                        onClose={() => setIsWebEvalOpen(false)}
                        banner={evalTargetBanner || selectedBanner}
                        onEditChange={async (field, value) => {
                            const target = evalTargetBanner || selectedBanner;
                            if (!target?.id) return;
                            try {
                                await updateDoc(promoDocRef(target.id), { [field]: value });
                                setEvalTargetBanner(prev => prev ? { ...prev, [field]: value } : prev);
                                if (selectedBanner?.id === target.id) {
                                    setSelectedBanner(prev => prev ? { ...prev, [field]: value } : prev);
                                    setEditedBanner(prev => prev ? { ...prev, [field]: value } : prev);
                                }
                            } catch (e) { alert(`업데이트 실패: ${e.message}`); }
                        }}
                        onAnalyze={async (b) => {
                            const target = b || evalTargetBanner || selectedBanner;
                            if (!target?.id) return;
                            setIsEvalRunning(true);
                            try {
                                // PC + 모바일 이미지를 모두 base64로 변환 (둘 다 있으면 둘 다 보냄)
                                const imgSources = [
                                    target.full_image || target.preview,
                                    target.mobile_image,
                                ].filter(Boolean);
                                if (imgSources.length === 0) {
                                    alert("분석할 이미지가 없습니다.");
                                    return;
                                }
                                const imagesBase64 = await Promise.all(
                                    imgSources.map(src => prepareImageForAI(src).catch(err => {
                                        console.error('[PromotionArchive] image prep failed:', err);
                                        return null;
                                    }))
                                );
                                const validImages = imagesBase64.filter(Boolean);
                                if (validImages.length === 0) {
                                    alert("이미지 변환에 실패했습니다. (CORS 문제일 가능성 있음)");
                                    return;
                                }

                                const result = await analyzeWebDesign(validImages, target.webUserComment || '');
                                if (!result.ok) {
                                    alert(`AI 분석 실패: ${result.error}`);
                                    return;
                                }

                                const patch = {
                                    webScores: result.webScores,
                                    webAiScore: result.webAiScore,
                                    isWebAnalyzed: true,
                                    webAnalyzedAt: new Date().toISOString(),
                                    webManualScoreAdj: 0,
                                };
                                // AI가 뽑은 메타데이터로 banner 자체도 업데이트 (제목/날짜)
                                if (result.title) patch.title = result.title;
                                if (result.year) patch.year = result.year;
                                if (result.month) patch.month = result.month;
                                if (result.fullDate) patch.webDateText = result.fullDate;
                                // AI가 뽑은 태그가 있으면 기존 태그와 병합
                                if (result.tags?.length > 0) {
                                    patch.tags = [...new Set([...(target.tags || []), ...result.tags])];
                                }
                                if (result.summary) patch.webSummary = result.summary;

                                await updateDoc(promoDocRef(target.id), patch);
                                setEvalTargetBanner(prev => prev ? { ...prev, ...patch } : prev);
                                if (selectedBanner?.id === target.id) {
                                    setSelectedBanner(prev => prev ? { ...prev, ...patch } : prev);
                                    setEditedBanner(prev => prev ? { ...prev, ...patch } : prev);
                                }
                                if (result.missingCount > 0) {
                                    console.warn(`[PromotionArchive] ${result.missingCount}/10 항목 누락`);
                                }
                            } catch (e) {
                                console.error('[PromotionArchive] analyze error:', e);
                                alert(`분석 실패: ${e.message}`);
                            }
                            finally { setIsEvalRunning(false); }
                        }}
                        isAnalyzing={isEvalRunning}
                        isAdmin={false}
                    />
                )}

                {isConfirmOpen && (
                    <ConfirmWorkspace
                        isOpen={isConfirmOpen}
                        onClose={() => setIsConfirmOpen(false)}
                        banner={selectedBanner}
                        initialHistory={selectedBanner?.history}
                        onUpdate={handleUpdateHistory}
                        onSaveNewVersion={async (finalHistory, pcImage, mobileImage, isComplete) => {
                            let finalPreview = pcImage;
                            let finalFullImage = pcImage;
                            let finalMobileImage = mobileImage;
                            let finalUpdatedHistory = finalHistory;

                            if (pcImage instanceof Blob) {
                                setProcessingMessage("이미지를 최적화하고 있습니다...");
                                setIsProcessingModalOpen(true);
                                try {
                                    const processedData = await processAndCropImage(pcImage, false);
                                    finalPreview = processedData.thumbnail;
                                    finalFullImage = processedData.detail;
                                    finalUpdatedHistory = finalHistory.map((h, i) =>
                                        i === finalHistory.length - 1 ? { ...h, img: processedData.detail } : h
                                    );
                                } catch (err) {
                                    alert("이미지 처리 오류");
                                } finally {
                                    setIsProcessingModalOpen(false);
                                }
                            }

                            try {
                                // base64 → Cloudinary
                                const uploadedPreview = isDataUrl(finalPreview) ? await uploadBase64(finalPreview) : finalPreview;
                                const uploadedFull = isDataUrl(finalFullImage) ? await uploadBase64(finalFullImage) : finalFullImage;
                                const uploadedMobile = isDataUrl(finalMobileImage) ? await uploadBase64(finalMobileImage) : finalMobileImage;
                                const uploadedHistory = await Promise.all(finalUpdatedHistory.map(async h => ({
                                    ...h,
                                    img: isDataUrl(h?.img) ? await uploadBase64(h.img) : h?.img,
                                })));
                                const updateData = {
                                    history: uploadedHistory,
                                    preview: uploadedPreview,
                                    full_image: uploadedFull,
                                    mobile_image: uploadedMobile,
                                    isCompleted: isComplete,
                                    completedAt: isComplete ? new Date().toISOString() : (selectedBanner.completedAt || null)
                                };

                                await updateDoc(promoDocRef(selectedBanner.id), updateData);
                                setSelectedBanner({ ...selectedBanner, ...updateData });
                                setEditedBanner({ ...selectedBanner, ...updateData });
                                if (isComplete) { setIsConfirmOpen(false); alert("최종 승인 완료"); }
                            } catch (e) { alert(`저장 실패: ${e.message}`); }
                        }}
                    />
                )}

                <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} pendingFiles={pendingFiles} setPendingFiles={setPendingFiles} uploadSettings={uploadSettings} setUploadSettings={setUploadSettings} confirmUpload={handleUpload} />
                <ProcessingModal isOpen={isProcessingModalOpen} message={processingMessage} progress={uploadProgress} />
                <BatchEditModal isOpen={isBatchEditOpen} onClose={() => setIsBatchEditOpen(false)} selectedCount={selectedItems.length} availableGames={GAMES} onApply={handleBatchUpdate} />
                <AiAnalysisModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} selectedIds={selectedItems} onComplete={() => { setIsAiModalOpen(false); setSelectedItems([]); }} />
            </div>
        </div>
    );
}

export default App;
