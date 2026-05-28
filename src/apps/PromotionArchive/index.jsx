import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  collection, doc, updateDoc, onSnapshot, writeBatch, getDocs,
} from 'firebase/firestore';
import { db, appId } from '../../lib/firebase';
import { uploadBase64 } from '../../lib/storage';
import { subscribeToGameLogos } from '../../lib/gameLogos';
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
import { scanCampaigns } from './scanCampaigns';


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

// 정식 segment 시퀀스 [게임폴더, 연도, '프로모션', 캠페인폴더, '03.디자인'] 빌드.
// 입력 parts 가 어떤 순서·중복·영문 segment 를 가지고 있어도 위 형식으로 정규화.
//   - 비표준 영문 섹션('Promotion'/'BrandWeb' 등) 자동 제거
//   - 게임 폴더 뒤에 중복된 게임명 segment 자동 제거
//   - 캠페인 폴더(yyyymmdd_ prefix)에서 연도 자동 추출
//   - 디바이스 폴더(pc/mobile/web), 기존 '03.디자인', '디자인' segment 제거 후 끝에 재부착
const NON_STANDARD_SECTION = /^(promotion|brandweb|brand[\s_-]?web|promo)$/i;
const DEVICE_FOLDER = /^(pc|mobile|web|mo|m|design)$/i;
const buildCanonicalSegments = (parts, { gameFolder, yearStr }) => {
    // 게임 segment — 인자 우선, 없으면 parts 에서 찾기.
    let gameSeg = gameFolder || '';
    if (!gameSeg) {
        const found = parts.find(p => /^\d{1,2}\./.test(p));
        if (found) gameSeg = found;
    }
    // 연도 — 인자 우선, 없으면 yyyymmdd 캠페인 폴더에서, 다음 단독 연도 segment.
    let year = String(yearStr || '').trim();
    if (!/^20\d{2}$/.test(year)) {
        const dated = parts.find(p => /^20\d{2}\d{4}/.test(p));
        if (dated) year = dated.slice(0, 4);
    }
    if (!/^20\d{2}$/.test(year)) {
        const ySeg = parts.find(p => /^20\d{2}$/.test(p));
        if (ySeg) year = ySeg;
    }
    // 캠페인 폴더 — yyyymmdd_ prefix.
    const campaign = parts.find(p => /^20\d{2}\d{4}/.test(p));

    // 게임 키워드 (중복 게임명 segment 식별용).
    const gameKeywordSet = new Set();
    for (const key of Object.keys(GAME_FOLDER_MAP)) {
        if (key) gameKeywordSet.add(key.toLowerCase());
    }
    const isGameKeyword = (seg) => gameKeywordSet.has(String(seg || '').toLowerCase().trim());

    const segments = [];
    if (gameSeg) segments.push(gameSeg);
    if (year) segments.push(year);
    segments.push('프로모션');

    if (campaign) {
        segments.push(campaign);
    } else {
        // 캠페인 폴더 패턴이 없으면 알려진 segment 를 제외하고 마지막에 남는 폴더를 캠페인으로 추정.
        const reserved = new Set([gameSeg, year, '프로모션', '03.디자인']);
        const remaining = parts.filter(p => {
            if (!p) return false;
            if (reserved.has(p)) return false;
            if (/^\d{1,2}\./.test(p)) return false;          // 다른 게임 폴더
            if (/^20\d{2}$/.test(p)) return false;            // 다른 연도
            if (NON_STANDARD_SECTION.test(p)) return false;   // 영문 비표준 섹션
            if (isGameKeyword(p)) return false;               // 중복 게임명
            if (DEVICE_FOLDER.test(p)) return false;          // 디바이스 폴더
            if (/^0?3\.\s*디자인$/.test(p)) return false;     // 03.디자인 / 3.디자인
            if (p === '디자인') return false;
            return true;
        });
        if (remaining.length > 0) segments.push(remaining[remaining.length - 1]);
    }
    segments.push('03.디자인');
    return segments;
};

// path segment 에서 섹션('promotion'|'brandweb') 자동 추론.
//   '\프로모션\' / '/프로모션/' / 'Promotion' / 'promo' → 'promotion'
//   '\브랜드웹\' / '/브랜드웹-업데이트/' / 'BrandWeb' / 'brand_web' → 'brandweb'
// 슬래시·백슬래시 구분자 모두 매치 (webkitRelativePath '/' / Windows '\' 양쪽 지원).
// 브랜드웹이 더 구체적인 매치이므로 먼저 검사 — 'brandweb' 폴더 안에 'promo' 하위가 있는 케이스 우선순위.
// 어느 패턴에도 안 맞으면 null (수동 분류 필요).
const inferSectionFromPath = (path) => {
    if (!path || typeof path !== 'string') return null;
    if (/[\\/]브랜드웹/.test(path) || /brand[\s_-]?web/i.test(path)) return 'brandweb';
    if (/[\\/]프로모션[\\/]/.test(path) || /promotion|promo/i.test(path)) return 'promotion';
    return null;
};

// File 의 webkitRelativePath 에서 부모 폴더만 추출 → 정식 형식으로 정규화 + prefix 부착.
//   \\ppc-file\{게임폴더}\{연도}\프로모션\{캠페인}\03.디자인\
const buildCanonicalPath = (file, game, year) => {
    if (!file) return '';
    const rel = file.webkitRelativePath || file.name || '';
    const parts = rel.split('/');
    parts.pop(); // 파일명 제거 → 부모 폴더만

    const gameFolder = getGameFolder(game);
    const segments = buildCanonicalSegments(parts, { gameFolder, yearStr: year });
    if (segments.length === 0) return getCanonicalPrefix();
    return getCanonicalPrefix() + segments.join('\\') + '\\';
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
// 기존 doc 의 path 한 건 정규화 — buildCanonicalSegments 와 동일 로직 적용.
//   - 비표준 영문 섹션 'Promotion'/'BrandWeb' 제거 후 한국어 '프로모션' 으로 치환
//   - 게임 폴더 뒤에 중복된 게임명 segment 제거
//   - '03.디자인' suffix 자동 부착
// 이미 정식 형식이면 null 반환 (변경 불필요).
const normalizePromoPath = (oldPath, game, year) => {
    if (!oldPath || typeof oldPath !== 'string') return null;
    const prefix = DEFAULT_PATH_PREFIX;
    if (!oldPath.startsWith(prefix)) return null;

    // prefix 제거 후 segment 분해. trailing 백슬래시는 무시.
    const rest = oldPath.slice(prefix.length).replace(/\\+$/, '');
    const parts = rest.split('\\').filter(Boolean);

    const gameFolder = getGameFolder(game);
    // year 우선순위: 인자 → path 의 yyyymmdd 캠페인 prefix → 단독 연도 segment.
    let yearStr = String(year || '').trim();
    if (!/^20\d{2}$/.test(yearStr)) {
        const fromPath = extractYearFromPath(oldPath);
        if (fromPath) yearStr = fromPath;
    }

    const segments = buildCanonicalSegments(parts, { gameFolder, yearStr });
    if (segments.length === 0) return null;
    const newPath = prefix + segments.join('\\') + '\\';
    // trailing 백슬래시 차이만 있는 경우(이미 정규형)는 변경 없음으로 처리.
    if (newPath === oldPath || newPath === oldPath + '\\') return null;
    return newPath;
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
    const { isLight, payload, clearPayload, navigate } = useGlobal();
    const consumedPayloadRef = useRef(null);
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
    // 선택된 항목들 중 path 가 빈 것만 자동 채움 — handleAutoFillPaths 는 selectedItems
    // (useState 선언 위치가 아래) 를 deps 로 가지므로 변수 선언 이후로 옮김. 여기서는 isAutoFilling 만 선언.
    const [isAutoFilling, setIsAutoFilling] = useState(false);

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
            await refreshBanners();
            alert(`✅ ${updates.length}건 경로 정규화 완료`);
        } catch (e) {
            console.error('[PromotionArchive] normalize paths failed', e);
            alert(`❌ 정규화 실패: ${e.message || e.code}`);
        } finally {
            setIsNormalizing(false);
        }
    }, [isAdmin, isNormalizing]);

    // 게임 로고 — NexusAdmin → "게임 로고" 패널에서 단일 관리. 공유 lib 으로 구독만 함.
    // (저장 위치: artifacts/{appId}/public/data/settings/gameLogos)
    const [gameLogos, setGameLogos] = useState({});
    useEffect(() => subscribeToGameLogos(setGameLogos, (e) => console.error('[PromotionArchive] logos', e)), []);

    // Firestore 일회성 fetch + 낙관적 갱신.
    // 이전엔 onSnapshot 으로 통째 실시간 구독 → 분석/수정 시 매번 read 카운트되어 무료 한도 초과.
    // 다른 사용자 변경은 refresh() 수동 호출로 반영.
    const refreshBanners = useCallback(async () => {
        if (!db) return;
        try {
            const snap = await getDocs(promoColRef());
            const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllBanners(arr);
        } catch (err) {
            console.error('[PromotionArchive] fetch error:', err);
            alert(`데이터 로딩 실패: ${err.code || err.message}`);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (!db) { setIsLoadingData(false); return; }
        const watchdog = setTimeout(() => {
            setIsLoadingData(prev => {
                if (prev) console.warn('[PromotionArchive] watchdog: still loading after 8s');
                return false;
            });
        }, 8000);
        refreshBanners().finally(() => clearTimeout(watchdog));
        return () => clearTimeout(watchdog);
    }, [refreshBanners]);

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
        pathStatus: 'all', // 'all' | 'missing' | 'present' — 경로 누락 일괄 처리용 필터.
        section: 'all',    // 'all' | 'promotion' | 'brandweb' | 'none' — 섹션 분류 필터.
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

    // 그리드 크기 — BannerCodex 와 동일한 3단계 (small/medium/large). 기본 medium.
    const [gridSize, setGridSize] = useState('medium');

    const filterRef = useRef(null);
    const sortRef = useRef(null);
    const settingsRef = useRef(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [selectedItems, setSelectedItems] = useState([]);
    // 관리자 모드 토글 → 다중 선택 초기화
    useEffect(() => {
        if (!isAdminMode) setSelectedItems(prev => (prev.length > 0 ? [] : prev));
    }, [isAdminMode]);

    // 선택된 항목들 중 path 가 빈 것만 골라서 game/year 기준 표준 prefix 자동 채움.
    // (selectedItems 선언 직후에 위치 — 그 전에 두면 useCallback deps 에서 TDZ ReferenceError 로 화면 crash)
    const handleAutoFillPaths = useCallback(async () => {
        if (!isAdmin) { alert('관리자 권한이 필요합니다.'); return; }
        if (isAutoFilling) return;
        if (selectedItems.length === 0) { alert('선택된 항목이 없습니다.'); return; }

        const targets = allBanners.filter(b =>
            selectedItems.includes(b.id) &&
            (!b.path || (typeof b.path === 'string' && b.path.trim() === ''))
        );
        if (targets.length === 0) {
            alert('선택된 항목 모두 이미 경로가 있습니다.');
            return;
        }

        // game/year 으로 표준 prefix 조합 — 캠페인 폴더명은 모르므로 prefix 까지만.
        const buildPrefixOnly = (game, year) => {
            const gameFolder = getGameFolder(game);
            if (!gameFolder) return '';
            const y = /^20\d{2}$/.test(String(year || '').trim()) ? String(year).trim() : '';
            return getCanonicalPrefix() + gameFolder + '\\' + (y ? y + '\\' : '');
        };

        const updates = [];
        const skipNoGame = [];
        targets.forEach(b => {
            const prefix = buildPrefixOnly(b.game, b.year);
            if (!prefix) { skipNoGame.push({ id: b.id, game: b.game, title: b.title }); return; }
            updates.push({ id: b.id, path: prefix });
        });

        const report = [
            `선택된 ${selectedItems.length}건 중 경로 없는 항목: ${targets.length}건`,
            `  • 자동 채울 대상: ${updates.length}`,
            `  • 게임 매핑 없음(스킵): ${skipNoGame.length}${skipNoGame.length ? '\n     예: ' + skipNoGame.slice(0, 3).map(s => `${s.title || '?'} (game="${s.game || '?'}")`).join(', ') : ''}`,
            '',
            '※ 캠페인 폴더명은 자동 추론 불가 → game/year 까지의 prefix 만 채웁니다.',
            '   이후 PreviewModal 에서 개별 항목별로 끝부분을 보완하세요.',
        ].join('\n');
        console.log('[PromotionArchive] autoFill report\n' + report);

        if (updates.length === 0) {
            alert(`자동 채울 항목이 없습니다.\n\n${report}\n\nGAME_FOLDER_MAP 에 게임이 등록돼 있는지 확인하세요.`);
            return;
        }

        const preview = updates.slice(0, 5).map(u => {
            const b = allBanners.find(x => x.id === u.id);
            return `[${b?.game || '?'}/${b?.year || '?'}] ${b?.title || '?'}\n  → ${u.path}`;
        }).join('\n\n');
        if (!confirm(`${report}\n\n미리보기 (처음 5건):\n\n${preview}\n\n계속할까요?`)) return;

        setIsAutoFilling(true);
        try {
            const CHUNK = 400;
            for (let i = 0; i < updates.length; i += CHUNK) {
                const batch = writeBatch(db);
                updates.slice(i, i + CHUNK).forEach(u => batch.update(promoDocRef(u.id), { path: u.path }));
                await batch.commit();
            }
            await refreshBanners();
            alert(`✅ ${updates.length}건 경로 prefix 자동 채움 완료`);
        } catch (e) {
            console.error('[PromotionArchive] autoFill paths failed', e);
            alert(`❌ 자동 채움 실패: ${e.message || e.code}`);
        } finally {
            setIsAutoFilling(false);
        }
    }, [isAdmin, isAutoFilling, selectedItems, allBanners]);

    // 섹션 자동 분류 — 전체 doc 의 path 에서 '\프로모션\' / '\브랜드웹\' 패턴을 보고 section 채움.
    // section 이 이미 있는 doc 은 스킵. path 가 없거나 추론 불가면 스킵.
    const [isClassifying, setIsClassifying] = useState(false);
    const handleAutoClassifySections = useCallback(async () => {
        if (!isAdmin) { alert('관리자 권한이 필요합니다.'); return; }
        if (isClassifying) return;
        setIsClassifying(true);
        try {
            const snap = await getDocs(promoColRef());
            const updates = [];
            const skipped = { alreadyClassified: 0, noInference: 0, noPath: 0 };
            const noInferenceSamples = [];
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.section) { skipped.alreadyClassified++; return; }
                if (!data.path) { skipped.noPath++; return; }
                const inferred = inferSectionFromPath(data.path);
                if (!inferred) {
                    skipped.noInference++;
                    if (noInferenceSamples.length < 3) noInferenceSamples.push(`${data.title || '?'}: ${data.path}`);
                    return;
                }
                updates.push({ id: d.id, section: inferred, title: data.title });
            });
            const total = snap.docs.length;
            const promoCount = updates.filter(u => u.section === 'promotion').length;
            const brandwebCount = updates.filter(u => u.section === 'brandweb').length;
            const report = [
                `검사 결과 (총 ${total}건):`,
                `  • 자동 분류 대상: ${updates.length} (프로모션 ${promoCount} / 브랜드웹 ${brandwebCount})`,
                `  • 이미 분류됨: ${skipped.alreadyClassified}`,
                `  • path 에서 추론 불가: ${skipped.noInference}${noInferenceSamples.length ? '\n     예: ' + noInferenceSamples.join('\n     ') : ''}`,
                `  • path 없음: ${skipped.noPath}`,
            ].join('\n');
            console.log('[PromotionArchive] classify report\n' + report);

            if (updates.length === 0) {
                alert(`자동 분류할 항목이 없습니다.\n\n${report}`);
                return;
            }
            if (!confirm(`${report}\n\n계속할까요?`)) return;

            const CHUNK = 400;
            for (let i = 0; i < updates.length; i += CHUNK) {
                const batch = writeBatch(db);
                updates.slice(i, i + CHUNK).forEach(u => batch.update(promoDocRef(u.id), { section: u.section }));
                await batch.commit();
            }
            await refreshBanners();
            alert(`✅ ${updates.length}건 섹션 자동 분류 완료 (프로모션 ${promoCount} / 브랜드웹 ${brandwebCount})`);
        } catch (e) {
            console.error('[PromotionArchive] classify sections failed', e);
            alert(`❌ 자동 분류 실패: ${e.message || e.code}`);
        } finally {
            setIsClassifying(false);
        }
    }, [isAdmin, isClassifying]);

    // 선택된 항목들 일괄로 section='promotion' 으로 설정 — path 추론 안 되는 케이스를 위한 수동 백업.
    const [isSettingSection, setIsSettingSection] = useState(false);
    const handleSetSectionPromotion = useCallback(async () => {
        if (!isAdmin) { alert('관리자 권한이 필요합니다.'); return; }
        if (isSettingSection) return;
        if (selectedItems.length === 0) { alert('선택된 항목이 없습니다.'); return; }
        if (!confirm(`선택된 ${selectedItems.length}건을 '프로모션'으로 설정합니다. 계속할까요?`)) return;
        setIsSettingSection(true);
        try {
            const CHUNK = 400;
            for (let i = 0; i < selectedItems.length; i += CHUNK) {
                const batch = writeBatch(db);
                selectedItems.slice(i, i + CHUNK).forEach(id => batch.update(promoDocRef(id), { section: 'promotion' }));
                await batch.commit();
            }
            await refreshBanners();
            alert(`✅ ${selectedItems.length}건 프로모션으로 설정 완료`);
        } catch (e) {
            console.error('[PromotionArchive] set section failed', e);
            alert(`❌ 설정 실패: ${e.message || e.code}`);
        } finally {
            setIsSettingSection(false);
        }
    }, [isAdmin, isSettingSection, selectedItems]);

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
    // 사전 스캔 결과 — handleFileUpload 에서 무거운 스캔을 ProcessingModal 안에서 실행한 뒤 저장.
    // UploadModal 은 prop 으로 받아서 즉시 표시 (useMemo 동기 계산으로 UI freeze 되는 걸 막음).
    const [uploadScan, setUploadScan] = useState(null);
    const [uploadSettings, setUploadSettings] = useState({ game: '아이온', year: new Date().getFullYear().toString(), visibility: 'public' });
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
        // visibility 가드 — private 은 본인만 볼 수 있음.
        const currentUid = user?.uid || null;
        result = result.filter(b => {
            if (b.visibility !== 'private') return true;
            return !!currentUid && b.ownerUid === currentUid;
        });
        if (isCollectionMode) result = result.filter(b => collectionIds.includes(b.id));
        if (activeCategory === 'favorites') result = result.filter(b => b.liked === 1);
        else if (activeCategory === 'my_private') result = result.filter(b => b.visibility === 'private' && currentUid && b.ownerUid === currentUid);
        else if (activeCategory !== 'all' && activeCategory !== 'analysis') result = result.filter(b => b.game === activeCategory);

        if (searchQuery && !isAiSearchMode) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(b =>
                b.title?.toLowerCase().includes(lower) ||
                b.tags?.some(t => t.toLowerCase().includes(lower)) ||
                b.game?.toLowerCase().includes(lower)
            );
        }

        // 에셋 타입 — b.assetType 직접 비교 + 누락 시 section / path 에서 fallback 추론.
        //   '프로모션' ↔ section='promotion' / path '\프로모션\'
        //   '브랜드웹'  ↔ section='brandweb'  / path '\브랜드웹\'
        // 기존 데이터에 assetType 안 채워진 경우에도 즉석 분류로 필터 작동.
        if (activeFilters.assetType !== 'all') {
            const target = activeFilters.assetType;
            const sectionMap = { '프로모션': 'promotion', '브랜드웹': 'brandweb' };
            const targetSection = sectionMap[target];
            result = result.filter(b => {
                if ((b.assetType || '').toLowerCase() === target.toLowerCase()) return true;
                if (!targetSection) return false;
                const inferred = b.section || inferSectionFromPath(b.path);
                return inferred === targetSection;
            });
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

        // 경로 누락/존재 필터 — 관리자 일괄 보정용.
        if (activeFilters.pathStatus === 'missing') {
            result = result.filter(b => !b.path || (typeof b.path === 'string' && b.path.trim() === ''));
        } else if (activeFilters.pathStatus === 'present') {
            result = result.filter(b => b.path && typeof b.path === 'string' && b.path.trim() !== '');
        }

        // 섹션 필터 (프로모션 / 브랜드웹 / 미분류).
        //   section 필드가 비어 있는 기존 doc 도 path 에서 즉석 추론해서 분류 — '섹션 자동 분류' 버튼을
        //   누르지 않아도 필터가 작동하도록. 'none' 은 추론마저 실패한 진짜 미분류만 표시.
        const resolveSection = (b) => b.section || inferSectionFromPath(b.path);
        if (activeFilters.section === 'promotion') {
            result = result.filter(b => resolveSection(b) === 'promotion');
        } else if (activeFilters.section === 'brandweb') {
            result = result.filter(b => resolveSection(b) === 'brandweb');
        } else if (activeFilters.section === 'none') {
            result = result.filter(b => !resolveSection(b));
        }

        // 정렬 키 추출 헬퍼.
        //   - 제작 날짜: path 의 캠페인 폴더 prefix(yyyymmdd) > year+month > created_at fallback.
        //     업로드 시점(created_at) 이 아니라 실제 제작 시점 기준으로 정렬되도록 함.
        //   - 평가 점수: webAiScore(실제 Gemini 분석) > designScore(레거시 fallback).
        const productionTime = (b) => {
            if (b?.path) {
                const m = String(b.path).match(/[\\/](20\d{2})(\d{2})(\d{2})[_\-]/);
                if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
            }
            const y = parseInt(b?.year, 10);
            if (Number.isFinite(y) && y > 2000) {
                const mo = parseInt(b?.month, 10);
                const monthIdx = Number.isFinite(mo) && mo >= 1 && mo <= 12 ? mo - 1 : 0;
                return Date.UTC(y, monthIdx, 1);
            }
            return new Date(b?.created_at || 0).getTime();
        };
        const evalScore = (b) => parseFloat(b?.webAiScore ?? b?.designScore) || 0;

        const sorted = [...result];
        sorted.sort((a, b) => {
            switch (sortOrder) {
                case 'latest':     return productionTime(b) - productionTime(a);
                case 'oldest':     return productionTime(a) - productionTime(b);
                case 'score_desc': return evalScore(b) - evalScore(a);
                case 'score_asc':  return evalScore(a) - evalScore(b);
                default: return 0;
            }
        });
        return sorted;
    }, [allBanners, searchQuery, activeCategory, isCollectionMode, collectionIds, isAiSearchMode, activeFilters, sortOrder, user?.uid]);

    const handleGameClick = (game) => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
        if (game === 'all') {
            setCurrentView('grid'); setActiveCategory('all'); setIsCollectionMode(false); setActiveFilters(prev => ({ ...prev, year: 'all' }));
        } else if (game === 'analysis') {
            setCurrentView('dashboard'); setActiveCategory('analysis'); setIsCollectionMode(false);
        } else if (game === 'favorites') {
            setCurrentView('grid'); setActiveCategory('favorites'); setIsCollectionMode(false); setActiveFilters(prev => ({ ...prev, year: 'all' }));
        } else if (game === 'my_private') {
            setCurrentView('grid'); setActiveCategory('my_private'); setIsCollectionMode(false); setActiveFilters(prev => ({ ...prev, year: 'all' }));
        } else {
            setCurrentView('grid'); setActiveCategory(game); setIsCollectionMode(false); setActiveFilters(prev => ({ ...prev, year: 'all' }));
            setIsAllGamesModalOpen(false);
        }
    };

    const handleFileUpload = (e) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;
        // 큰 폴더의 경우 FileList → Array 변환만으로도 수 초 freeze 가능.
        // 단계별로 setTimeout 으로 끊어서 ProcessingModal 의 메시지가 매 단계마다 paint 되도록 함.
        const inputEl = e.target;
        setProcessingMessage(`폴더 분석 중… 파일 ${fileList.length.toLocaleString()}개 확인 중`);
        setUploadProgress({ current: 0, total: 0, percentage: 0 });
        setIsProcessingModalOpen(true);

        // 단계 1: FileList → Array (큰 폴더일수록 무거움)
        setTimeout(() => {
            try {
                const all = Array.from(fileList);
                // size === 0 은 OneDrive/네트워크 드라이브의 보안 차단으로 읽지 못한 파일.
                // 통째로 막지 말고 정상 파일만 추려 업로드 진행 — 사용자에게는 건너뛴 개수만 안내.
                const validFiles = [];
                const invalidNames = [];
                for (const f of all) {
                    if (f.size === 0) invalidNames.push(f.webkitRelativePath || f.name);
                    else validFiles.push(f);
                }
                if (validFiles.length === 0) {
                    setIsProcessingModalOpen(false);
                    alert(`⚠️ 폴더 안 모든 파일을 읽을 수 없습니다 (size 0).\n해당 폴더를 '바탕화면'으로 복사한 뒤 다시 시도해주세요.`);
                    inputEl.value = '';
                    return;
                }

                // 단계 2: 캠페인 구조 사전 스캔 (handleUpload 와 동일 규칙) — UploadModal 이 즉시 표시할 수 있도록.
                setProcessingMessage(`캠페인 구조 분석 중… (파일 ${validFiles.length.toLocaleString()}개)`);
                // 다시 macrotask 로 미뤄 메시지가 paint 된 뒤 무거운 스캔 실행.
                setTimeout(() => {
                    try {
                        const scan = scanCampaigns(validFiles);
                        setPendingFiles(validFiles);
                        setUploadScan(scan);
                        setIsProcessingModalOpen(false);
                        if (invalidNames.length > 0) {
                            const preview = invalidNames.slice(0, 5).join('\n');
                            const more = invalidNames.length > 5 ? `\n…외 ${invalidNames.length - 5}개` : '';
                            alert(`보안 차단으로 ${invalidNames.length}개 파일을 건너뜁니다.\n나머지 ${validFiles.length}개로 업로드를 진행합니다.\n\n[건너뛴 파일]\n${preview}${more}\n\n읽지 못한 파일은 폴더를 '바탕화면'으로 복사하면 해결됩니다.`);
                        }
                        setIsUploadModalOpen(true);
                    } catch (err) {
                        console.error('[PromotionArchive] campaign scan failed', err);
                        setIsProcessingModalOpen(false);
                        alert(`캠페인 분석 실패: ${err.message || err}`);
                    } finally {
                        inputEl.value = '';
                    }
                }, 30);
            } catch (err) {
                console.error('[PromotionArchive] file scan failed', err);
                setIsProcessingModalOpen(false);
                alert(`파일 분석 실패: ${err.message || err}`);
                inputEl.value = '';
            }
        }, 30);
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
            // 블랙리스트 — 원본 키 비주얼이 아닌 보조 파일 제외.
            // 명세상 '개발 / 팝업 / popup' 만 핵심이지만 Thumbs.db·dotfile 같은 시스템 노이즈도 같이 차단.
            const excludeRegex = /개발|팝업|popup|Thumbs\.db|^\./i;
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

                // [필수] 디자인 폴더 식별 — '디자인' segment 가 없으면 키 비주얼이 아니므로 무시.
                const designIndex = pathParts.findIndex(p => p.includes('디자인'));
                if (designIndex < 0 || designIndex === 0) return;

                // [필수] pc/mobile 폴더의 '직속 자식' 파일만 처리.
                //   허용 구조: [상위…, '03.디자인', 'pc'|'mobile', '<파일명>']
                //   → pathParts.length 는 designIndex + 3 이어야 함.
                // crop / m_crop / banner 같은 하위 폴더는 자동 무시 — 키 비주얼이 가공물·잘림본과
                // 한 그룹에 섞이지 않음.
                if (pathParts.length !== designIndex + 3) return;

                const deviceFolder = pathParts[designIndex + 1] || '';
                let type = null;
                if (/^(pc|web)$/i.test(deviceFolder)) type = 'pc';
                else if (/^(mo|mobile|m)$/i.test(deviceFolder)) type = 'mobile';
                if (!type) return;

                // 타이틀 — 디자인 폴더 바로 위 segment (캠페인 폴더명).
                const title = pathParts[designIndex - 1].trim() || '미분류';

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
                    batch.set(docRef, { ...b, ownerUid: user.uid, visibility: uploadSettings.visibility || 'public' });
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

                    const sourceFile = item.pcFile || item.mobileFile;
                    const canonicalPath = buildCanonicalPath(sourceFile, uploadSettings.game, uploadSettings.year);
                    // section 추론은 원본 webkitRelativePath 에서 해야 함 —
                    // canonicalPath 는 정규화 과정에서 항상 '\프로모션\' 을 강제 삽입하므로
                    // 거기서 추론하면 브랜드웹 폴더에서 업로드해도 'promotion' 으로 잘못 분류됨.
                    const sourceRel = sourceFile?.webkitRelativePath || '';
                    const inferredSection = inferSectionFromPath(sourceRel) || 'promotion';
                    chunkBanners.push({
                        title: item.title,
                        game: uploadSettings.game,
                        year: uploadSettings.year,
                        path: canonicalPath,
                        section: inferredSection,
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
            // 업로드 완료 — local state 동기화 (onSnapshot 제거됨).
            await refreshBanners();

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
                        // 복원된 데이터의 visibility 가 있으면 보존, 없으면 public 디폴트.
                        batch.set(docRef, { ...rest, ownerUid: user.uid, visibility: rest.visibility || 'public' });
                    });
                    await batch.commit();
                    written += slice.length;
                    setUploadProgress({ current: written, total: data.length, percentage: Math.round((written / data.length) * 100) });
                }
                await refreshBanners();
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
                const idsToDelete = new Set(selectedItems);
                for (let i = 0; i < selectedItems.length; i += 500) {
                    const batch = writeBatch(db);
                    selectedItems.slice(i, i + 500).forEach(id => batch.delete(promoDocRef(id)));
                    await batch.commit();
                }
                // 낙관적 갱신 — refresh 대신 local 에서 직접 제거 (추가 read 회피).
                setAllBanners(prev => prev.filter(b => !idsToDelete.has(b.id)));
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
            await refreshBanners();
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

    // AssetLibrary 에서 "출처로 이동" → payload.params.viewBannerId 로 진입.
    // banner 데이터가 로드된 후에만 동작. timestamp 로 dedup.
    // sourceRect/sourceImageUrl 이 있으면 PreviewModal 에서 캡처 위치 하이라이트.
    // returnToAssetId 가 있으면 닫기 시 다시 AssetLibrary 로 돌아감.
    const [jumpHighlight, setJumpHighlight] = useState(null); // { rect, imageUrl } | null
    const [returnTarget, setReturnTarget] = useState(null);   // { app, assetId } | null
    useEffect(() => {
        if (!payload || payload.target !== 'promotion-archive') return;
        const id = payload.params?.viewBannerId;
        if (!id) return;
        if (consumedPayloadRef.current === payload.timestamp) return;
        if (isLoadingData) return; // Firestore 응답 대기
        if (allBanners.length === 0) {
            // 로딩 끝났는데 데이터가 0건이면 빈 컬렉션 — 더 기다려도 안 옴.
            console.warn('[PromotionArchive] viewBannerId payload received but allBanners is empty', { id });
            alert('배너 데이터를 불러올 수 없어 출처를 열 수 없어요.');
            consumedPayloadRef.current = payload.timestamp;
            clearPayload?.();
            return;
        }
        const banner = allBanners.find(b => b.id === id);
        if (banner) {
            handleOpenPreview(banner);
            // 캡처 위치 정보가 있으면 모달이 받아 스크롤 + 하이라이트.
            const r = payload.params?.sourceRect;
            const u = payload.params?.sourceImageUrl;
            if (r && typeof r.x === 'number') setJumpHighlight({ rect: r, imageUrl: u || null });
            else setJumpHighlight(null);
            // 돌아갈 경로 기억 — payload.source 가 어떤 앱이든(asset-library 등) returnToAssetId 와 묶어 보관.
            const retId = payload.params?.returnToAssetId;
            if (retId && payload.source) setReturnTarget({ app: payload.source, assetId: retId });
            else setReturnTarget(null);
            consumedPayloadRef.current = payload.timestamp;
            clearPayload?.();
        } else {
            // 데이터는 있는데 그 id 가 없음 → 배너가 삭제됐거나 다른 컬렉션의 id 임.
            console.warn('[PromotionArchive] viewBannerId not found', {
                id,
                totalBanners: allBanners.length,
                sample: allBanners.slice(0, 3).map(b => b.id),
            });
            alert('해당 배너를 찾을 수 없어요. 출처가 삭제됐거나 다른 라이브러리의 항목일 수 있습니다.');
            consumedPayloadRef.current = payload.timestamp;
            clearPayload?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payload?.timestamp, payload?.target, allBanners.length, isLoadingData]);

    // PreviewModal 닫기 — returnTarget 이 있으면 그 앱으로 돌아가 detail 자동 오픈, 아니면 일반 닫기.
    const closePreview = useCallback(() => {
        setIsPreviewOpen(false);
        setJumpHighlight(null);
        if (returnTarget?.app && returnTarget?.assetId) {
            navigate(returnTarget.app, {
                source: 'promotion-archive',
                target: returnTarget.app,
                prompt: { text: '', tags: [], style: '' },
                image: { url: '', metadata: {} },
                params: { openAssetId: returnTarget.assetId },
                timestamp: Date.now(),
            });
            setReturnTarget(null);
        }
    }, [returnTarget, navigate]);

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

    // 브랜드웹 카드 — 메인/서브 페이지 지정. mainPageId/subPageId 필드 갱신 + 썸네일/대표 이미지 동기화.
    // pageId 는 pages[] 안의 id. role: 'main' | 'sub'. 같은 값을 다시 누르면 해제(null).
    const setBrandWebRole = useCallback(async (role, pageId) => {
        if (!selectedBanner || selectedBanner.assetType !== '브랜드웹') return;
        const pages = Array.isArray(selectedBanner.pages) ? selectedBanner.pages : [];
        const target = pages.find(p => p?.id === pageId);
        if (!target) return;
        const isUnset =
            (role === 'main' && selectedBanner.mainPageId === pageId) ||
            (role === 'sub' && selectedBanner.subPageId === pageId);
        const updateData = {};
        if (role === 'main') {
            updateData.mainPageId = isUnset ? null : pageId;
            // 그리드 썸네일/외부 전송용 대표 이미지 동기화.
            if (!isUnset) {
                updateData.full_image = target.url;
                updateData.preview = target.url;
            }
        } else {
            updateData.subPageId = isUnset ? null : pageId;
            if (!isUnset && target.device === 'mobile') updateData.mobile_image = target.url;
        }
        try {
            await updateDoc(promoDocRef(selectedBanner.id), updateData);
            const updated = { ...selectedBanner, ...updateData };
            setSelectedBanner(updated);
            setEditedBanner(updated);
        } catch (e) {
            console.error('[PromotionArchive] set brand-web role failed', e);
            alert(`설정 실패: ${e.message || e.code}`);
        }
    }, [selectedBanner]);
    const handleSetMainPage = useCallback((pageId) => setBrandWebRole('main', pageId), [setBrandWebRole]);
    const handleSetSubPage = useCallback((pageId) => setBrandWebRole('sub', pageId), [setBrandWebRole]);

    // 브랜드웹 카드 — 페이지 한 장 삭제. mainPageId/subPageId/preview/full_image/mobile_image 정합성도 같이 정리.
    const handleDeletePageFromBanner = useCallback(async (pageId) => {
        if (!selectedBanner || selectedBanner.assetType !== '브랜드웹') return;
        const pages = Array.isArray(selectedBanner.pages) ? selectedBanner.pages : [];
        if (pages.length <= 1) { alert('마지막 페이지는 삭제할 수 없습니다.'); return; }
        const target = pages.find(p => p?.id === pageId);
        if (!target) return;
        if (!confirm(`이 페이지(${target.name || ''})를 삭제할까요?`)) return;
        const nextPages = pages.filter(p => p?.id !== pageId);
        // 대표/메인/서브가 삭제 대상이면 fallback 재계산.
        const firstPc = nextPages.find(p => p?.device === 'pc');
        const firstMobile = nextPages.find(p => p?.device === 'mobile');
        const updateData = {
            pages: nextPages,
            pageCount: nextPages.length,
            mainPageId: selectedBanner.mainPageId === pageId ? null : (selectedBanner.mainPageId || null),
            subPageId: selectedBanner.subPageId === pageId ? null : (selectedBanner.subPageId || null),
        };
        if (selectedBanner.full_image === target.url) updateData.full_image = firstPc?.url || nextPages[0].url;
        if (selectedBanner.preview === target.url) updateData.preview = firstPc?.url || nextPages[0].url;
        if (selectedBanner.mobile_image === target.url) updateData.mobile_image = firstMobile?.url || '';
        try {
            await updateDoc(promoDocRef(selectedBanner.id), updateData);
            const updated = { ...selectedBanner, ...updateData };
            setSelectedBanner(updated);
            setEditedBanner(updated);
        } catch (e) {
            console.error('[PromotionArchive] delete page failed', e);
            alert(`삭제 실패: ${e.message || e.code}`);
        }
    }, [selectedBanner]);

    // 브랜드웹 카드 — 페이지 이미지 교체. file → Cloudinary 업로드 → 해당 페이지의 url 만 갱신.
    // name 도 새 파일명으로 변경. device 는 유지.
    const handleReplacePageInBanner = useCallback(async (pageId, file) => {
        if (!selectedBanner || selectedBanner.assetType !== '브랜드웹' || !file) return;
        const pages = Array.isArray(selectedBanner.pages) ? selectedBanner.pages : [];
        const target = pages.find(p => p?.id === pageId);
        if (!target) return;
        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onloadend = () => resolve(String(r.result));
                r.onerror = reject;
                r.readAsDataURL(file);
            });
            const newUrl = await uploadBase64(dataUrl);
            const oldUrl = target.url;
            const nextPages = pages.map(p => p?.id === pageId
                ? { ...p, url: newUrl, name: file.name || p.name }
                : p
            );
            const updateData = { pages: nextPages };
            // 대표/메인/서브가 같은 url 을 참조했으면 새 url 로 동기화.
            if (selectedBanner.full_image === oldUrl) updateData.full_image = newUrl;
            if (selectedBanner.preview === oldUrl) updateData.preview = newUrl;
            if (selectedBanner.mobile_image === oldUrl) updateData.mobile_image = newUrl;
            await updateDoc(promoDocRef(selectedBanner.id), updateData);
            const updated = { ...selectedBanner, ...updateData };
            setSelectedBanner(updated);
            setEditedBanner(updated);
        } catch (e) {
            console.error('[PromotionArchive] replace page failed', e);
            alert(`교체 실패: ${e.message || e.code}`);
        }
    }, [selectedBanner]);

    // 브랜드웹 카드에 모바일 페이지(이미지)를 별도 업로드 — Cloudinary 업로드 후 pages[] 에 추가 + mobile_image 갱신.
    // 같은 카드의 PC 페이지는 그대로 유지. 한 번에 여러 장 업로드 가능.
    const handleAddMobilePagesToBanner = useCallback(async (files) => {
        if (!selectedBanner) return;
        const arr = Array.from(files || []).filter(f => f.type?.startsWith('image/'));
        if (arr.length === 0) return;
        try {
            // dataURL → Cloudinary URL
            const uploadedUrls = await Promise.all(arr.map(async (f) => {
                const dataUrl = await new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onloadend = () => resolve(String(r.result));
                    r.onerror = reject;
                    r.readAsDataURL(f);
                });
                return uploadBase64(dataUrl);
            }));
            const existingPages = Array.isArray(selectedBanner.pages) ? selectedBanner.pages : [];
            const baseOrder = existingPages.length;
            const newPages = uploadedUrls.map((url, i) => ({
                id: `m_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
                name: arr[i].name || `mobile_${baseOrder + i + 1}`,
                device: 'mobile',
                url,
                order: baseOrder + i,
                confirmedAt: null,
                noteCount: 0,
            }));
            const nextPages = [...existingPages, ...newPages];
            const updateData = {
                pages: nextPages,
                pageCount: nextPages.length,
                mobile_image: selectedBanner.mobile_image || newPages[0].url,
            };
            await updateDoc(promoDocRef(selectedBanner.id), updateData);
            const updated = { ...selectedBanner, ...updateData };
            setSelectedBanner(updated);
            setEditedBanner(updated);
        } catch (e) {
            console.error('[PromotionArchive] addMobilePages failed', e);
            alert(`모바일 업로드 실패: ${e.message || e.code}`);
        }
    }, [selectedBanner]);

    const toggleLike = useCallback(async (id, currentLiked) => {
        const next = currentLiked ? 0 : 1;
        // 낙관적 local 갱신 — onSnapshot 제거로 인한 stale UI 방지.
        setAllBanners(prev => prev.map(b => b.id === id ? { ...b, liked: next } : b));
        try {
            await updateDoc(promoDocRef(id), { liked: next });
        } catch (e) {
            console.error('[PromotionArchive] like toggle failed', e);
            // 실패 시 롤백.
            setAllBanners(prev => prev.map(b => b.id === id ? { ...b, liked: currentLiked } : b));
        }
    }, []);

    const getGridClass = () => {
        // 3단계 — small(촘촘) / medium(기본) / large(크게). 사이드바 열림 여부에 따라 컬럼 한 단계씩 줄임.
        if (gridSize === 'small') {
            return isDesktopSidebarOpen
                ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'
                : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8';
        }
        if (gridSize === 'large') {
            return isDesktopSidebarOpen
                ? 'grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5';
        }
        // medium
        return isDesktopSidebarOpen
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6';
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
                    gridSize={gridSize} setGridSize={setGridSize}
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
                        onAutoFillPaths={isAdmin ? handleAutoFillPaths : undefined}
                        isAutoFilling={isAutoFilling}
                        onAutoClassifySections={isAdmin ? handleAutoClassifySections : undefined}
                        isClassifying={isClassifying}
                        onSetSectionPromotion={isAdmin ? handleSetSectionPromotion : undefined}
                        isSettingSection={isSettingSection}
                    />
                )}

                {isPreviewOpen && (
                    <PreviewModal
                        isOpen={isPreviewOpen}
                        onClose={closePreview}
                        jumpHighlight={jumpHighlight}
                        onJumpHandled={() => setJumpHighlight(null)}
                        returnTo={returnTarget ? { app: returnTarget.app, label: '에셋 라이브러리' } : null}
                        onAddMobilePages={handleAddMobilePagesToBanner}
                        onSetMainPage={handleSetMainPage}
                        onSetSubPage={handleSetSubPage}
                        onDeletePage={handleDeletePageFromBanner}
                        onReplacePage={handleReplacePageInBanner}
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
                                // 평가에 보낼 이미지 소스 — 브랜드웹은 메인(+서브) 1~2장, 그 외는 PC+Mobile 2장.
                                const imgSources = (() => {
                                    if (target.assetType === '브랜드웹') {
                                        const pages = Array.isArray(target.pages) ? target.pages : [];
                                        const findUrl = (id) => (id ? pages.find(p => p?.id === id)?.url : null);
                                        const main = findUrl(target.mainPageId) || target.full_image || pages.find(p => p?.device === 'pc')?.url || target.preview;
                                        const sub = findUrl(target.subPageId) || (target.mainPageId ? null : (target.mobile_image || pages.find(p => p?.device === 'mobile')?.url));
                                        return [main, sub && sub !== main ? sub : null].filter(Boolean);
                                    }
                                    return [target.full_image || target.preview, target.mobile_image].filter(Boolean);
                                })();
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

                                const result = await analyzeWebDesign(validImages, target.webUserComment || '', {
                                    isBrandWeb: target.assetType === '브랜드웹',
                                });
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

                <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} pendingFiles={pendingFiles} setPendingFiles={setPendingFiles} scan={uploadScan} uploadSettings={uploadSettings} setUploadSettings={setUploadSettings} confirmUpload={handleUpload} />
                <ProcessingModal isOpen={isProcessingModalOpen} message={processingMessage} progress={uploadProgress} />
                <BatchEditModal isOpen={isBatchEditOpen} onClose={() => setIsBatchEditOpen(false)} selectedCount={selectedItems.length} availableGames={GAMES} onApply={handleBatchUpdate} />
                <AiAnalysisModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} selectedIds={selectedItems} onComplete={() => { setIsAiModalOpen(false); setSelectedItems([]); }} />
            </div>
        </div>
    );
}

export default App;
