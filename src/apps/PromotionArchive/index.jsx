import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  collection, doc, updateDoc, onSnapshot, writeBatch, getDocs,
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

// 원본 폴더 경로 prefix — 실제 서버 share 루트.
// 정식 경로 형식: \\ppc-file\{게임폴더}\{연도}\프로모션\{캠페인폴더}\03.디자인\pc\
// localStorage('pa_pathPrefix') 로 prefix 자체를 덮어쓰기 가능.
const DEFAULT_PATH_PREFIX = '\\\\ppc-file\\';
const getCanonicalPrefix = () => {
    try { return localStorage.getItem('pa_pathPrefix') || DEFAULT_PATH_PREFIX; }
    catch { return DEFAULT_PATH_PREFIX; }
};

// 게임명 → 서버 폴더명 매핑. 새 게임 추가 시 여기에만 등록하면 path 자동 정규화됨.
// 사용자가 \\ppc-file\프로모션\ 같이 게임/연도가 빠진 폴더를 선택해도
// upload 시 game/year 폴더가 path 에 자동 prefix 된다.
// 한 폴더에 여러 game 표기가 매핑될 수 있음 (예: '리니지'/'리니지M'/'리니지2M' → '1.리니지').
const GAME_FOLDER_MAP = {
    '리니지':       '1.리니지',
    '리니지M':      '1.리니지',
    '리니지2M':     '1.리니지',
    '리니지W':      '1.리니지',
    'lineage':      '1.리니지',
    '아이온':       '2.아이온',
    '아이온2':      '2.아이온',
    'aion':         '2.아이온',
    '블소':         '4.블레이드앤소울',
    '블레이드앤소울': '4.블레이드앤소울',
    'bns':          '4.블레이드앤소울',
    '기타':         '',
};
// 정확 매치 우선, 실패 시 부분 일치 fallback — '리니지M' 같이 매핑 키와 다르게 저장된 값도 잡아냄.
const getGameFolder = (game) => {
    if (!game) return '';
    if (GAME_FOLDER_MAP[game] !== undefined) return GAME_FOLDER_MAP[game];
    const g = String(game).toLowerCase().trim();
    if (!g) return '';
    for (const [key, folder] of Object.entries(GAME_FOLDER_MAP)) {
        if (!folder) continue;
        const k = key.toLowerCase();
        // 양방향 부분 일치 — 'lineage' / '리니지' / '리니지M' 모두 '1.리니지' 로 보냄.
        if (g.includes(k) || k.includes(g)) return folder;
    }
    return '';
};
// path 가 이미 게임/연도 폴더 형태를 포함하는지 검사용.
// 게임 폴더는 \\ppc-file\ 직후 첫 segment 에서만 평가 — '03.디자인' 같은
// 중간 폴더(번호.단계)가 게임 폴더로 오인되는 것을 방지.
const hasGameSegment = (path) => {
    if (!path || typeof path !== 'string') return false;
    if (!path.startsWith(DEFAULT_PATH_PREFIX)) return false;
    const firstSeg = path.slice(DEFAULT_PATH_PREFIX.length).split('\\')[0] || '';
    // 게임 폴더 형식: '1.리니지', '2.아이온', '4.블레이드앤소울' 등 (1~2자리 숫자 + .)
    return /^\d{1,2}\./.test(firstSeg);
};
const hasYearSegment = (path) => /\\(20\d{2})\\/.test(path || '');

// File 의 webkitRelativePath 에서 부모 폴더만 추출 → prefix + 슬래시→백슬래시 변환.
// game/year 인자가 주어지면 webkitRelativePath 가 게임/연도 폴더로 시작하지 않을 때 자동 보정.
// year 가 비어있어도 폴더명(예: '20260121_새로...')의 앞 4자리에서 자동 추출 시도.
const buildCanonicalPath = (file, game, year) => {
    if (!file) return '';
    const rel = file.webkitRelativePath || file.name || '';
    const parts = rel.split('/');
    parts.pop(); // 파일명 제거 → 부모 폴더만

    // game/year 자동 prefix 삽입.
    const gameFolder = getGameFolder(game);
    let yearStr = String(year || '').trim();
    if (!/^20\d{2}$/.test(yearStr)) {
        // 폴더명 prefix 에서 추출 (예: '20260121_새로...' → 2026).
        const dated = parts.find(p => /^20\d{2}\d{4}/.test(p));
        if (dated) yearStr = dated.slice(0, 4);
        else {
            const ySeg = parts.find(p => /^20\d{2}$/.test(p));
            if (ySeg) yearStr = ySeg;
        }
    }
    const firstSeg = parts[0] || '';
    const startsWithGameFolder = /^\d+\./.test(firstSeg);

    if (gameFolder && !startsWithGameFolder) {
        // 게임 폴더 누락 — 맨 앞에 삽입.
        parts.unshift(gameFolder);
        // 연도도 빠져 있으면 게임 폴더 바로 다음에 삽입 (정식 형식 맞춤).
        if (yearStr && !parts.slice(1).some(p => /^20\d{2}$/.test(p))) {
            parts.splice(1, 0, yearStr);
        }
    } else if (yearStr && !parts.some(p => /^20\d{2}$/.test(p))) {
        // 게임 폴더는 있는데 연도가 없으면 게임 폴더 다음 위치에 연도 삽입.
        parts.splice(1, 0, yearStr);
    }

    const folderRel = parts.join('/');
    if (!folderRel) return getCanonicalPrefix();
    return getCanonicalPrefix() + folderRel.replace(/\//g, '\\') + '\\';
};

// 기존 doc 의 path 한 건 정규화 — game/year 매핑에 따라 누락된 segment 를 채워 넣음.
// 이미 올바른 형식이면 null 반환 (변경 불필요).
// year 는 doc.year 가 비어 있어도 path 자체에서 추출 시도:
//   1) 8자리 yyyymmdd 폴더명 prefix (예: \20260401_시그니처\) → 앞 4자리
//   2) 4자리 연도 단독 segment (예: \2026\)
const extractYearFromPath = (path) => {
    if (!path) return '';
    // \20260401_ ... 형태 — 8자리 숫자 + _ 로 시작하는 폴더명에서 앞 4자리
    const m8 = path.match(/\\(20\d{2})\d{4}[_\-\\]/);
    if (m8) return m8[1];
    // \2026\ 형태 — 단독 4자리 연도 폴더
    const m4 = path.match(/\\(20\d{2})\\/);
    if (m4) return m4[1];
    return '';
};
const normalizePromoPath = (oldPath, game, year) => {
    if (!oldPath || typeof oldPath !== 'string') return null;
    const prefix = DEFAULT_PATH_PREFIX;
    if (!oldPath.startsWith(prefix)) return null;
    const gameFolder = getGameFolder(game);
    // year 우선순위:
    //  1) path 의 yyyymmdd 폴더명 prefix (예: '20260121_새로...' → 2026) — 실제 캠페인 날짜라 가장 신뢰.
    //  2) doc.year (4자리 유효) — fallback.
    //  3) ''  — 둘 다 없으면 skip.
    let yearStr = extractYearFromPath(oldPath);
    if (!yearStr) {
        const docY = String(year || '').trim();
        if (/^20\d{2}$/.test(docY)) yearStr = docY;
    }
    const needGame = gameFolder && !hasGameSegment(oldPath);
    // path 안에 이미 들어가 있는 year segment 가 yearStr 와 다르면 교정 필요.
    const existingYear = (oldPath.match(/\\(20\d{2})\\/) || [])[1] || '';
    const needYear = !!yearStr && (!existingYear || existingYear !== yearStr);
    if (!needGame && !needYear) return null;
    // 잘못된 기존 year segment 가 있으면 먼저 교체 후 가공.
    let workingPath = oldPath;
    if (existingYear && existingYear !== yearStr) {
        workingPath = workingPath.replace(new RegExp('\\\\' + existingYear + '\\\\'), '\\' + yearStr + '\\');
    }
    const rest = workingPath.slice(prefix.length);
    let restWithFix = rest;
    if (needGame) {
        // 게임 폴더 누락 — 맨 앞에 game/year 삽입.
        restWithFix = gameFolder + '\\' + (yearStr && !hasYearSegment(workingPath) ? yearStr + '\\' : '') + rest;
    } else if (yearStr && !hasYearSegment(workingPath)) {
        // 게임 폴더는 있는데 year segment 자체가 없으면 게임 폴더 다음에 삽입.
        restWithFix = rest.replace(/^(\d{1,2}\.[^\\]+)\\/, `$1\\${yearStr}\\`);
    }
    const newPath = prefix + restWithFix;
    return newPath === oldPath ? null : newPath;
};

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

    // 일괄 경로 정규화 — 기존 doc 의 path 에 게임/연도 폴더가 누락된 항목을 GAME_FOLDER_MAP 기반으로 보정.
    // 관리자 모드에서 한 번만 실행하면 됨. dry-run preview 후 confirm.
    const [isNormalizing, setIsNormalizing] = useState(false);
    const handleNormalizePaths = useCallback(async () => {
        if (!isAdmin) { alert('관리자 권한이 필요합니다.'); return; }
        if (isNormalizing) return;
        setIsNormalizing(true);
        try {
            const snap = await getDocs(promoColRef());
            const updates = [];
            const skipped = { wrongPrefix: 0, noGameMapping: 0, alreadyNormalized: 0, noPath: 0 };
            const skipSamples = { wrongPrefix: [], noGameMapping: [], alreadyNormalized: [] };
            snap.docs.forEach(d => {
                const data = d.data();
                const oldPath = data.path || '';
                if (!oldPath || typeof oldPath !== 'string') { skipped.noPath++; return; }
                if (!oldPath.startsWith(DEFAULT_PATH_PREFIX)) {
                    skipped.wrongPrefix++;
                    if (skipSamples.wrongPrefix.length < 2) skipSamples.wrongPrefix.push(`${data.game || '?'}: ${oldPath}`);
                    return;
                }
                const gameFolder = getGameFolder(data.game);
                if (!gameFolder) {
                    skipped.noGameMapping++;
                    if (skipSamples.noGameMapping.length < 2) skipSamples.noGameMapping.push(`game="${data.game || '?'}"`);
                    return;
                }
                const newPath = normalizePromoPath(oldPath, data.game, data.year);
                if (newPath) {
                    updates.push({ id: d.id, old: oldPath, new: newPath, game: data.game, year: data.year });
                } else {
                    skipped.alreadyNormalized++;
                    if (skipSamples.alreadyNormalized.length < 2) skipSamples.alreadyNormalized.push(oldPath);
                }
            });
            const total = snap.docs.length;
            const report = [
                `검사 결과 (총 ${total}건):`,
                `  • 변경 대상: ${updates.length}`,
                `  • 이미 정상: ${skipped.alreadyNormalized}${skipSamples.alreadyNormalized.length ? '\n     예: ' + skipSamples.alreadyNormalized.join('\n     ') : ''}`,
                `  • 게임 매핑 없음: ${skipped.noGameMapping}${skipSamples.noGameMapping.length ? '\n     예: ' + skipSamples.noGameMapping.join(', ') : ''}`,
                `  • prefix 불일치: ${skipped.wrongPrefix}${skipSamples.wrongPrefix.length ? '\n     예: ' + skipSamples.wrongPrefix.join('\n     ') : ''}`,
                `  • path 없음: ${skipped.noPath}`,
            ].join('\n');
            console.log('[PromotionArchive] normalize report\n' + report);

            if (updates.length === 0) {
                alert(`변경할 경로가 없습니다.\n\n${report}\n\n게임 매핑이 없으면 GAME_FOLDER_MAP 에 추가하세요.`);
                return;
            }
            const preview = updates.slice(0, 5).map(u => `[${u.game}/${u.year || '?'}]\n  ${u.old}\n  → ${u.new}`).join('\n\n');
            if (!confirm(`${report}\n\n미리보기 (처음 5건):\n\n${preview}\n\n계속할까요?`)) return;

            // 400개씩 batch — Firestore 단일 batch 최대 500.
            const CHUNK = 400;
            for (let i = 0; i < updates.length; i += CHUNK) {
                const batch = writeBatch(db);
                updates.slice(i, i + CHUNK).forEach(u => batch.update(promoDocRef(u.id), { path: u.new }));
                await batch.commit();
            }
            alert(`✅ ${updates.length}건 경로 정규화 완료`);
        } catch (e) {
            console.error('[PromotionArchive] normalize paths failed', e);
            alert(`❌ 정규화 실패: ${e.message || e.code}`);
        } finally {
            setIsNormalizing(false);
        }
    }, [isAdmin, isNormalizing]);

    // 게임 로고 — BannerCodex 와 동일한 Firestore 컬렉션 공유 (artifacts/{appId}/public/data/settings/gameLogos).
    // PreviewModal 헤더에서 게임 로고 표시용. 관리자가 BannerCodex 설정에서 등록하면 여기에도 자동 반영.
    const [gameLogos, setGameLogos] = useState({});
    useEffect(() => {
        if (!db) return;
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameLogos');
        return onSnapshot(ref, snap => setGameLogos(snap.exists() ? snap.data() : {}));
    }, []);

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
    // BannerCodex 와 동일한 필터 스키마. 'quality' 는 5-tier 점수 등급.
    // 'ocr' 은 AI 분석 완료 상태(isWebAnalyzed)를 의미하며 관리자 모드에서만 노출.
    const [activeFilters, setActiveFilters] = useState({
        assetType: 'all',
        year: 'all',
        customStart: '',
        customEnd: '',
        quality: 'all',
        tag: 'all',
        game: 'all',
        ocr: 'all',
    });
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('latest');

    // 태그 빈도 Top 5 — BannerCodex useFilter.js 동일 로직.
    const topTags = useMemo(() => {
        const counts = {};
        allBanners.forEach(b => {
            if (Array.isArray(b.tags)) {
                b.tags.forEach(t => { if (t && t !== '기타') counts[t] = (counts[t] || 0) + 1; });
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    }, [allBanners]);

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

        // 에셋 타입 — b.assetType 직접 비교. 없는 데이터는 'all' 외 필터에서 자동 제외됨.
        if (activeFilters.assetType !== 'all') {
            result = result.filter(b => (b.assetType || '').toLowerCase() === activeFilters.assetType.toLowerCase());
        }

        // 년도 — 'custom' 일 때는 created_at 기준 날짜 범위 비교.
        if (activeFilters.year !== 'all') {
            if (activeFilters.year === 'custom') {
                if (activeFilters.customStart && activeFilters.customEnd) {
                    const start = new Date(activeFilters.customStart);
                    const end = new Date(activeFilters.customEnd); end.setHours(23, 59, 59, 999);
                    result = result.filter(b => {
                        const d = new Date(b.created_at || b.createdAt || 0);
                        return !isNaN(d.getTime()) && d >= start && d <= end;
                    });
                }
            } else {
                result = result.filter(b => String(b.year) === activeFilters.year);
            }
        }

        // 디자인 품질 5-tier — webAiScore(실제 Gemini) 우선, fallback designScore.
        if (activeFilters.quality !== 'all') {
            result = result.filter(b => {
                const score = parseFloat(b.webAiScore ?? b.designScore) || 0;
                if (activeFilters.quality === '8.7_up') return score >= 8.7;
                if (activeFilters.quality === '8.2_8.6') return score >= 8.2 && score <= 8.6;
                if (activeFilters.quality === '7.5_7.9') return score >= 7.5 && score <= 7.9;
                if (activeFilters.quality === '7.5_down') return score < 7.5;
                return true;
            });
        }

        // 스타일 태그
        if (activeFilters.tag !== 'all') {
            result = result.filter(b => Array.isArray(b.tags) && b.tags.includes(activeFilters.tag));
        }

        // 게임/IP (고급 필터)
        if (activeFilters.game !== 'all') {
            result = result.filter(b => b.game === activeFilters.game);
        }

        // AI 분석 상태 (관리자 전용 고급 필터)
        if (activeFilters.ocr !== 'all') {
            if (activeFilters.ocr === 'done') result = result.filter(b => !!b.isWebAnalyzed);
            if (activeFilters.ocr === 'pending') result = result.filter(b => !b.isWebAnalyzed);
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
            // 허용 확장자 — jpg/jpeg/png 만 통과. psd/ai/gif/webp/tif 등은 모두 제외.
            const allowedExtRegex = /\.(jpe?g|png)$/i;

            pendingFiles.forEach(file => {
                if (excludeRegex.test(file.name)) return;
                if (!allowedExtRegex.test(file.name)) return;

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
                        path: buildCanonicalPath(item.pcFile || item.mobileFile, uploadSettings.game, uploadSettings.year),
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
                    isAdvancedFilterOpen={isAdvancedFilterOpen} setIsAdvancedFilterOpen={setIsAdvancedFilterOpen}
                    topTags={topTags} availableGames={availableGames} pinnedGames={pinnedGames}
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

                {/* 하단 중앙 floating bar — 다중 선택 또는 admin 액션 있을 때 표시.
                    FloatingActionBar 내부에서 selection/admin 그룹을 독립적으로 렌더. */}
                {isAdminMode && (
                    <FloatingActionBar
                        selectedCount={selectedItems.length}
                        onAddToCollection={handleBulkAddToCollection}
                        onEditProperties={() => setIsBatchEditOpen(true)}
                        onDeselectAll={() => setSelectedItems([])}
                        onAiAnalysis={() => setIsAiModalOpen(true)}
                        onDelete={handleDelete}
                        // admin 전용 — admin 모드일 때 항상 노출
                        onNormalizePaths={isAdmin ? handleNormalizePaths : undefined}
                        isNormalizing={isNormalizing}
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
                        gameLogos={gameLogos}
                        isAdminMode={isAdminMode}
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
