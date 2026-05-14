import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import {
  Search, Image as ImageIcon, FolderOpen, Upload, X, LayoutGrid, Loader2, Sparkles,
  FolderPlus, Download, FileJson, Save, Maximize2, CheckSquare, Heart, Trash2, Menu,
  ChevronDown, ChevronRight, ChevronUp, Check, Copy, Settings, Edit3, Calendar,
  ArrowUpDown, Plus, RotateCcw, Grip, Filter, Layers, MinusSquare, Bot,
  AlertCircle, Sun, Moon, ShieldCheck, Monitor, Star, Wand2, Cpu, Box, BrainCircuit,
  ArrowUp, MoreHorizontal, Zap, FileText, RefreshCw
} from 'lucide-react';

import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, limit, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { auth, db, appId } from "../../lib/firebase";
import { uploadBase64 } from "../../lib/storage";
import { GEMINI_API_KEY } from "../../lib/gemini";
import { useAuth } from "../../context/AuthContext";
import {
  pickDirectory, collectImageFiles, ensureReadPermission,
  saveDirectoryHandle, loadDirectoryHandle, clearDirectoryHandle,
} from "../../lib/folderPicker";

const gameNameMap = {
    'lineage': '리니지', 'aion': '아이온', 'bns': '블소', 'mmo_common': 'MMO공통',
    'lineage_w': '리니지W', 'lineage_m': '리니지M', 'lineage_2m': '리니지2M', 'etc': '기타'
};

const getFolderName = (game) => {
    if (!game) return "100.기타";
    const map = {
        '리니지': '1.리니지', '리니지2': '2.리니지2', '아이온': '3.아이온', '블소': '4.블레이드앤소울',
        '블레이드앤소울': '4.블레이드앤소울', 'MMO공통': '5.MMO공통', '러브비트': '6.러브비트',
        '리니지W': '10.리니지W', '리니지M': '11.리니지M', '리니지2M': '12.리니지2M',
        '프로야구H2': '13.프로야구H2', '프로야구H3': '14.프로야구H3', '트릭스터M': '15.트릭스터M',
        'TL': '16.TL', '블레이드앤소울2': '17.블레이드앤소울2', '리니지클래식': '18.리니지클래식',
        '유니버스': '19.유니버스', 'plaync': '20.plaync', 'PUZZUP': '21.PUZZUP',
        'BattleCrush': '22.BattleCrush', '호연': '23.호연', 'JM': '24.JM', '퍼플': '25.퍼플',
        '도구리어드벤처': '26.도구리어드벤처', '동남아L2M': '27.동남아L2M', '아이온2': '28.아이온2',
        '브레이커스': '29.브레이커스', '프로젝트 LLL': '30.프로젝트 LLL', 'NCfamily zone': '31_NCfamily zone',
        'BSH(NCA)': '32.BSH(NCA)', '동남아LW': '33.동남아LW', 'HSF': '34.HSF',
        '지원': '99.지원', '기타': '100.기타', '팀 전용': '999.팀 전용'
    };
    return map[game] || game;
};

const DEFAULT_AI_PROMPT = `당신은 게임 배너 디자인을 심사하는 최고 권위의 AI 평가단입니다.
첨부된 게임 배너 이미지를 10가지 세부 항목으로 나누어 정밀 평가하세요.

{{LEARNING_CONTEXT}}

[임무 1: 메타데이터 추출]
- title: 메인 텍스트(제목) 추출.
- date_info: 이벤트 기간/날짜.
- tags: 컬러, 분위기, 특징 위주로 반드시 '한글'로만 3~5개 작성 (예: "다크판타지", "황금빛", "캐주얼", "레트로", "화려한").
- purpose: "cinematic", "event_item", "casual_2d" 중 택 1.

[임무 2: 10대 평가 항목 (100점 만점)]
**⚠️ 반드시 아래 10개 항목 전부에 대해 score와 reason을 작성해야 합니다. 단 한 개도 생략·누락 금지.**
**누락된 항목이 있으면 응답이 무효 처리됩니다.**
각 항목에 대해 100점 만점 기준의 점수(score)와 핵심을 찌르는 심플한 한 줄 평가(reason)를 작성하세요.
(※ 매우 중요한 채점 기준:
1. [★최고점 기준 - 하이엔드 퀄리티] 배경을 단순화하고 시선 집중도를 높인 것은 좋으나, 90점 이상(최고점)을 주려면 퀄리티 높은 캐릭터 아트, 세련된 타이포그래피, 다이내믹한 연출이 동반된 '하이엔드 디자인'이어야 합니다.
2. [매우 중요 - 단조로운 기본 구도 상한선] 중앙에 보물상자 하나만 덩그러니 있거나, 허공에 아이템 몇 개가 떠 있는 수준의 '1차원적이고 흔한 기본 구도(Generic/Basic Layout)'라면, 가독성과 시선 집중도가 아무리 좋더라도 절대 90점 이상을 주지 말고 전체 총점이 80점대 초중반(80~85점)에 머물도록 점수를 제한(Cap)하세요.
3. [매우 중요 - 산만함 및 구도 분산 감점] 캐릭터가 양옆으로 분산 배치되고, 화면 곳곳에 아이템이나 오브젝트가 규칙 없이 흩어져 산만한 느낌을 준다면 'layout'과 'flow', 'impression' 점수를 70점대로 가차 없이 깎아 전체 총점이 80점대 초중반(80~83점) 이하로 떨어지게 만드세요.
4. [중요 감점 - 색상/명도 대비 부족] 메인 타이틀의 색상이 배경 색상과 겹쳐서 시각적으로 묻히는 경우, 'typography', 'readability', 'color'를 60~70점대로 깎으세요. 캐릭터 퀄리티가 좋다면 다른 항목으로 보완해 70점대 후반~80점대 초반으로 맞추세요.
5. [매우 중요 - 타이포그래피 일관성] 메인카피, 서브카피, 날짜 패널 디자인이 촌스럽거나 전체 컨셉과 겉돌면 'typography'를 강력히 감점하세요.
6. 전반적인 점수 대역을 '60점 ~ 95점' 사이로 폭넓게 사용하여 디자인 퀄리티의 변별력을 확실하게 높이세요.)

1. impression (첫인상 / 주목도): 한눈에 시선을 사로잡는 강렬함과 매력. (단조롭고 1차원적인 상자 배치 수준이면 80점대 부여)
2. concept (콘셉트 전달력): 이벤트나 업데이트의 성격, 맥락이 잘 전달되는지.
3. layout (레이아웃 균형): 요소들의 화면 배치와 시각적 무게 중심. (단순한 중앙 정렬 아이템 나열이면 80점대 초중반으로 제한, 산만하면 70점대 감점)
4. typography (타이포그래피): 폰트 렌더링, 시각적 위계 및 세련미. (타이틀 톤이 배경과 겹쳐서 묻히면 60~70점대로 감점)
5. color (컬러 완성도): 배너의 무드에 맞는 색상 조합과 완성도. (텍스트와 배경 컬러가 분리되지 않고 겹치면 70점대 감점)
6. readability (정보 가독성): 타이틀, 날짜, 혜택 등 핵심 정보의 가독성.
7. brand (브랜드 적합성): 해당 게임/이벤트 감성에 부합하는 톤앤매너.
8. flow (시선 흐름): 시선의 매끄러움. (텍스트->캐릭터->아이템으로 자연스럽게 이어지면 고득점, 시선이 방황하면 감점)
9. detail (완성도 / 디테일): 배경, 빛, 뎁스(Depth), 합성의 디테일과 마감. (캐릭터 없는 단순 상자/아이템 나열은 90점 이상 금지)
10. conversion (클릭/전환 가능성): 유저로 하여금 클릭하고 싶게 만드는 매력도.

* 이유(reason) 작성 시 주의사항: 구어체나 불필요한 미사여구를 빼고 핵심만 심플하게 작성하세요. (예: "시선 집중도는 좋으나 연출과 구도가 단조로워 퀄리티가 평이함")

반드시 지정된 JSON 스키마에 맞추어 답변하세요.`;

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

const blobUrlToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Blob conversion failed", e);
    return url;
  }
};

const compressImage = (base64Str, maxWidth = 400, quality = 0.7) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str);
    });
};

const safeRender = (value, fallback = '') => {
    if (value == null) return fallback;
    if (typeof value === 'object') return fallback;
    return String(value);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const WRITE_DELAY_MS = 100;

const sanitizeFirestoreData = (data) => {
    if (!data) return data;
    const sanitized = { ...data };
    for (const key in sanitized) {
        if (Array.isArray(sanitized[key])) {
            sanitized[key] = sanitized[key].flat(Infinity).filter(item => item != null && typeof item !== 'object' && typeof item !== 'function');
        }
    }
    return sanitized;
};

const VirtualGrid = ({ items, renderItem, gridSize, isLoading, isLightMode, onScrollChange, resetTrigger }) => {
    const containerRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            for (let entry of entries) { setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height }); }
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }, [resetTrigger]);

    const handleScroll = (e) => {
        const top = e.currentTarget.scrollTop; setScrollTop(top);
        if (top > 10) onScrollChange?.(true); else onScrollChange?.(false);
    };

    const scrollToTop = () => { if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: 'smooth' }); };

    const getColumns = (width) => {
        if (gridSize === 'small') { if (width >= 1536) return 7; if (width >= 1280) return 6; if (width >= 1024) return 5; if (width >= 768) return 4; if (width >= 640) return 3; return 2; }
        else if (gridSize === 'large') { if (width >= 1024) return 3; if (width >= 640) return 2; return 1; }
        else { if (width >= 1280) return 5; if (width >= 1024) return 4; if (width >= 768) return 3; if (width >= 640) return 2; return 1; }
    };

    const columns = getColumns(containerSize.width);
    const gap = containerSize.width >= 768 ? 12 : 8;
    const padding = containerSize.width >= 768 ? 32 : 16;
    const effectiveWidth = containerSize.width - (padding * 2);
    const cardWidth = Math.max(0, Math.floor((effectiveWidth - (columns - 1) * gap) / columns));
    const cardHeight = cardWidth * (750 / 1180);
    const totalRows = Math.ceil(items.length / columns);
    const totalHeight = totalRows * cardHeight + Math.max(0, totalRows - 1) * gap + (padding * 2);
    const buffer = 3;
    const rowHeightWithGap = cardHeight + gap;
    const effectiveScrollTop = Math.max(0, scrollTop - padding);
    const startRow = Math.max(0, Math.floor(effectiveScrollTop / rowHeightWithGap) - buffer);
    const endRow = Math.min(totalRows, Math.ceil((effectiveScrollTop + containerSize.height) / rowHeightWithGap) + buffer);

    const visibleItems = [];
    if (cardWidth > 0) {
        for (let r = startRow; r < endRow; r++) {
            for (let c = 0; c < columns; c++) {
                const index = r * columns + c;
                if (index < items.length) {
                    visibleItems.push({ index, item: items[index], top: r * rowHeightWithGap + padding, left: c * (cardWidth + gap) + padding, width: cardWidth, height: cardHeight });
                }
            }
        }
    }

    return (
        <div ref={containerRef} className={`flex-1 overflow-y-auto relative custom-scrollbar ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0c0c0e]'}`} onScroll={handleScroll}>
            <div style={{ height: Math.max(0, totalHeight), position: 'relative', width: '100%' }}>
                {visibleItems.map(({ item, top, left, width, height }) => (
                    <div key={item.id} style={{ position: 'absolute', top, left, width, height }}>{renderItem(item)}</div>
                ))}
            </div>
            <button onClick={scrollToTop} className={`fixed bottom-8 right-8 z-[100] px-4 py-3 rounded-full shadow-2xl border transition-all duration-300 flex items-center justify-center ${scrollTop > 400 ? 'opacity-100 translate-y-0 pointer-events-auto hover:scale-110' : 'opacity-0 translate-y-10 pointer-events-none'} ${isLightMode ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-[#1c1c1e] text-zinc-300 border-zinc-700 hover:bg-zinc-800'}`} title="위로 가기">
                <ArrowUp className="w-4 h-4" /><span className="text-xs font-bold ml-1.5 uppercase tracking-wider">Top</span>
            </button>
            {isLoading && items.length === 0 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center py-4">
                    <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border backdrop-blur-sm ${isLightMode ? 'bg-white/80 border-slate-200 text-slate-500' : 'bg-zinc-900/80 border-zinc-800 text-zinc-500'}`}>
                        <Loader2 className="w-4 h-4 animate-spin text-[#0eb9b3]" /><span>데이터 불러오는 중...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const BannerCard = memo(({ banner, db, appId, selected, toggleSelection, onOpenPreview, onCopyPath, isProcessing, isAdminMode, isLightMode, isLastViewed, isInCart, onToggleCart }) => {
    const initialSrc = banner.preview || banner.imageUrl || banner.thumbnailUrl || null;
    const [imageData, setImageData] = useState(initialSrc);
    const [isLoadingImage, setIsLoadingImage] = useState(!initialSrc && !!banner.imageId);

    useEffect(() => {
        let isMounted = true;
        // New format (imageUrl/thumbnailUrl/preview) — no fetch needed.
        if (initialSrc) { setIsLoadingImage(false); return () => { isMounted = false; }; }
        // Legacy: image stored in Firestore banner_images collection.
        if (banner.imageId && !banner.isTemp && db) {
            const fetchImage = async () => {
                try {
                    const imgDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banner_images', banner.imageId));
                    if (imgDoc.exists() && isMounted) setImageData(imgDoc.data().thumbnail || imgDoc.data().original);
                } catch (e) { console.error("Image load failed", e); } finally { if (isMounted) setIsLoadingImage(false); }
            };
            fetchImage();
        } else { if (isMounted) setIsLoadingImage(false); }
        return () => { isMounted = false; };
    }, [banner.imageId, banner.isTemp, db, appId, initialSrc]);

    const safeTitle = safeRender(banner.title, '제목 없음');
    const displayScore = safeRender(banner.score, null);
    const displayTag = Array.isArray(banner.tags) && banner.tags.length > 0 ? safeRender(banner.tags[0], null) : null;

    return (
        <div onClick={() => onOpenPreview({ ...banner, loadedImage: banner.isTemp ? banner.loadedImage : imageData })} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpenPreview({ ...banner, loadedImage: banner.isTemp ? banner.loadedImage : imageData })}
            className={`group relative rounded-lg overflow-hidden border transition-all duration-300 flex flex-col cursor-pointer w-full h-full ${selected && (isAdminMode || banner.isTemp) ? isLightMode ? 'bg-white border-[#0eb9b3] ring-2 ring-[#0eb9b3] shadow-lg' : 'bg-[#111] border-[#0eb9b3] ring-2 ring-[#0eb9b3] shadow-lg' : isLastViewed ? isLightMode ? 'bg-white border-[#4285f4] ring-2 ring-[#4285f4]/50 shadow-md' : 'bg-[#111] border-[#4285f4] ring-2 ring-[#4285f4]/50 shadow-lg shadow-[#4285f4]/10' : isLightMode ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10 hover:bg-[#151515]'}`}
        >
            {(isAdminMode || banner.isTemp) && (
                <button onClick={(e) => toggleSelection(banner.id, e)} className={`absolute top-3 left-3 z-30 p-1.5 rounded-lg backdrop-blur-sm transition-colors ${selected ? 'bg-[#0eb9b3] text-white shadow-sm' : 'bg-black/50 text-white hover:bg-black/70 border border-white/20'}`}>
                    {selected ? <Check className="w-4 h-4 stroke-[3]" /> : <div className="w-4 h-4 border-2 border-current rounded-sm" />}
                </button>
            )}
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black/5">
                {isLoadingImage ? (
                    <div className="w-full h-full animate-pulse flex items-center justify-center"><ImageIcon className={`w-8 h-8 ${isLightMode ? 'text-slate-300' : 'text-zinc-800'} opacity-50`} /></div>
                ) : (
                    <img src={imageData} alt={safeTitle} className={`w-full h-full object-cover transition-transform duration-500 ${selected && (isAdminMode || banner.isTemp) ? 'scale-105' : 'group-hover:scale-105'}`} />
                )}
                <div className={`absolute inset-0 transition-colors pointer-events-none ${selected && (isAdminMode || banner.isTemp) ? 'bg-[#0eb9b3]/10' : 'bg-black/0 group-hover:bg-black/40'}`} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-between p-3 z-20">
                    <div className="flex justify-end w-full gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onToggleCart(banner.id); }} className={`pointer-events-auto p-2 rounded-lg backdrop-blur-sm transition-colors shadow-lg border border-white/10 ${isInCart ? 'bg-[#0eb9b3] text-white hover:bg-[#0b948f]' : 'bg-black/60 hover:bg-[#0eb9b3] text-white'}`} title={isInCart ? "담기 해제" : "담기"}>
                            <Layers className={`w-3.5 h-3.5 ${isInCart ? 'fill-current' : ''}`} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onCopyPath(banner.path); }} className="pointer-events-auto p-2 bg-black/60 hover:bg-[#0eb9b3] text-white rounded-lg backdrop-blur-sm transition-colors shadow-lg border border-white/10" title="경로 복사">
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex justify-start items-center gap-1.5 w-full">
                        {displayScore && (
                            <span className={`pointer-events-auto px-2 py-1 bg-black/60 text-[11px] font-bold rounded-md border border-white/10 backdrop-blur-sm shadow-lg flex items-center gap-1 ${parseFloat(displayScore) >= 8.7 ? 'text-[#0eb9b3]' : parseFloat(displayScore) >= 8.2 ? 'text-[#0eb9b3]' : parseFloat(displayScore) >= 7.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {displayScore}
                            </span>
                        )}
                        {displayTag && (
                            <span className="pointer-events-auto px-2.5 py-1 bg-black/60 text-white text-[11px] font-medium rounded-md border border-white/10 backdrop-blur-sm shadow-lg">#{displayTag}</span>
                        )}
                        {banner.isTemp && (
                            <span className="pointer-events-auto px-2.5 py-1 bg-violet-600/80 text-white text-[10px] font-bold rounded-md border border-white/10 backdrop-blur-sm shadow-lg flex items-center gap-1"><Zap className="w-3 h-3 fill-current"/>임시</span>
                        )}
                    </div>
                </div>
                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
                        <Loader2 className="w-6 h-6 text-[#0eb9b3] animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
});

const DuplicateItem = memo(({ banner, isToDelete, onToggle, db, appId, isLightMode }) => {
    const [img, setImg] = useState(banner.preview || null);
    useEffect(() => {
        let isMounted = true;
        if (!img && banner.imageId && db) {
            getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banner_images', banner.imageId))
              .then(d => { if(d.exists() && isMounted) setImg(d.data().thumbnail || d.data().original); });
        }
        return () => { isMounted = false; };
    }, [banner.imageId, db, appId, img]);
    const safeTitle = safeRender(banner.title, '제목 없음');
    const safePath = safeRender(banner.path, '경로 없음');
    const safeCreatedAt = safeRender(banner.createdAt, '');

    return (
        <div onClick={() => onToggle(banner.id)} className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all aspect-[2/1] ${isToDelete ? 'border-red-500 scale-95 opacity-70' : (isLightMode ? 'border-[#0eb9b3] shadow-md' : 'border-[#0eb9b3]')} bg-black/20`}>
            {img ? <img src={img} className="w-full h-full object-cover" alt={safeTitle} /> : <div className={`w-full h-full animate-pulse ${isLightMode ? 'bg-slate-200' : 'bg-zinc-800'}`} />}
            <div className={`absolute inset-0 transition-colors pointer-events-none ${isToDelete ? 'bg-red-500/20' : 'bg-black/0 hover:bg-white/10'}`} />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex flex-col gap-0.5">
                <div className="text-[10px] text-white/70 font-mono leading-none truncate">{safePath.split('\\').pop()}</div>
                <div className="text-xs text-white font-bold font-mono leading-none">{safeCreatedAt.slice(0, 16).replace('T', ' ')}</div>
            </div>
            <div className={`absolute top-2 left-2 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-md flex items-center gap-1 ${isToDelete ? 'bg-red-500 text-white' : 'bg-[#0eb9b3] text-white'}`}>
                {isToDelete ? <span className="flex items-center gap-1"><Trash2 className="w-3 h-3"/> 삭제 예정</span> : <span className="flex items-center gap-1"><Check className="w-3 h-3"/> 원본 (Keep)</span>}
            </div>
        </div>
    );
});

export default function App() {
  const { user, isAdmin } = useAuth();
  const [banners, setBanners] = useState([]);
  const [tempBanners, setTempBanners] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isDraggingOverGlobal, setIsDraggingOverGlobal] = useState(false);
  const dragCounter = useRef(0);

  const [themeSetting, setThemeSetting] = useState(() => {
      if (typeof window !== 'undefined') return localStorage.getItem('themeSetting') || 'dark';
      return 'dark';
  });

  const isLightMode = useMemo(() => {
      if (themeSetting === 'light') return true;
      if (themeSetting === 'dark') return false;
      return false;
  }, [themeSetting]);

  useEffect(() => { localStorage.setItem('themeSetting', themeSetting); }, [themeSetting]);

  // 관리자 모드는 더 이상 비밀번호 토글이 아니라 AuthContext의 isAdmin 그대로 사용.
  // 기존 JSX 호환을 위해 같은 이름으로 alias.
  const isAdminMode = isAdmin;
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [isPromptManagerOpen, setIsPromptManagerOpen] = useState(false);
  const [editingPromptText, setEditingPromptText] = useState("");

  const [geminiApiKey, setGeminiApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '');
  const [openAiApiKey, setOpenAiApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('openAiApiKey') || '' : '');

  useEffect(() => {
      localStorage.setItem('geminiApiKey', geminiApiKey);
      localStorage.setItem('openAiApiKey', openAiApiKey);
  }, [geminiApiKey, openAiApiKey]);

  const [activeView, setActiveView] = useState('grid');
  const [sortOrder, setSortOrder] = useState('score');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [gridSize, setGridSize] = useState('medium');

  const [isAiSearchMode, setIsAiSearchMode] = useState(false);
  const [aiSearchIds, setAiSearchIds] = useState(null);

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const filterMenuRef = useRef(null);

  const [filters, setFilters] = useState({
      assetType: 'all', year: 'all', customStart: '', customEnd: '', quality: 'all',
      tag: 'all', game: 'all', creator: 'all', ocr: 'all'
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const [pinnedGames, setPinnedGames] = useState(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('pinnedGames');
          return saved ? JSON.parse(saved) : ['리니지2M', '리니지M', '블소'];
      }
      return ['리니지2M', '리니지M', '블소'];
  });

  useEffect(() => { localStorage.setItem('pinnedGames', JSON.stringify(pinnedGames)); }, [pinnedGames]);

  const [isAllGamesModalOpen, setIsAllGamesModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, skipped: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const settingsRef = useRef(null);
  const themeRef = useRef(null);

  const [isLogoManagerOpen, setIsLogoManagerOpen] = useState(false);
  const [gameLogos, setGameLogos] = useState({});

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadSettings, setUploadSettings] = useState({ game: '리니지', year: new Date().getFullYear().toString() });
  const [fileFilters, setFileFilters] = useState({ include: '1180', exclude: 'old', startDate: '' });
  const [isAddingNewGame, setIsAddingNewGame] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const abortUploadRef = useRef(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const [isCustomGameInput, setIsCustomGameInput] = useState(false);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ game: '', year: '', isCustomGame: false, customGame: '', path: '' });

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isEditingPreview, setIsEditingPreview] = useState(false);

  const [selectedBanner, setSelectedBanner] = useState(null);
  const [editedBanner, setEditedBanner] = useState(null);
  const [highResImage, setHighResImage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [cartIds, setCartIds] = useState([]);
  const [isCopied, setIsCopied] = useState(false);

  const [lastViewedId, setLastViewedId] = useState(null);

  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ isOpen: false, status: 'idle', current: 0, total: 0, target: '' });
  const stopBatchRef = useRef(false);
  // 진행 중인 Gemini fetch의 AbortController. "분석 중지" 클릭 시 즉시 abort 가능.
  const activeFetchControllerRef = useRef(null);
  const [processingBannerId, setProcessingBannerId] = useState(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [duplicateIdsToDelete, setDuplicateIdsToDelete] = useState([]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isScorePopoverOpen, setIsScorePopoverOpen] = useState(false);
  const [isScoreAdjExpanded, setIsScoreAdjExpanded] = useState(false);

  const [filteredBanners, setFilteredBanners] = useState([]);
  const [notification, setNotification] = useState(null);

  const [zoomScale, setZoomScale] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
      if (activeCategory === 'temp' && tempBanners.length === 0) setActiveCategory('all');
  }, [tempBanners.length, activeCategory]);

  useEffect(() => {
      if (previewModalOpen && selectedBanner && !hasChanges && !isEditingPreview) {
          const sourceBanners = selectedBanner.id.startsWith('temp_') ? tempBanners : banners;
          const liveBanner = sourceBanners.find(b => b.id === selectedBanner.id);
          if (liveBanner) {
              const checkDiff = () => {
                  const keysToSync = ['score', 'aiScore', 'manualScoreAdj', 'userComment', 'scores', 'title', 'tags', 'ocrProcessed', 'liked', 'featured', 'game', 'year', 'month', 'path'];
                  for (const key of keysToSync) {
                      if (JSON.stringify(liveBanner[key]) !== JSON.stringify(selectedBanner[key])) return true;
                  }
                  return false;
              };
              if (checkDiff()) {
                  setSelectedBanner(prev => ({ ...liveBanner, loadedImage: prev.loadedImage }));
                  setEditedBanner(prev => ({ ...liveBanner, loadedImage: prev.loadedImage }));
              }
          }
      }
  }, [banners, tempBanners, previewModalOpen, selectedBanner, hasChanges, isEditingPreview]);

  const handleSidebarClick = useCallback((e) => {
      const isInteractive = e.target.closest('button') || e.target.closest('input') || e.target.closest('label') || e.target.closest('select') || e.target.closest('a') || e.target.closest('span');
      if (!isInteractive && window.innerWidth >= 768) setIsDesktopSidebarOpen(prev => !prev);
  }, []);

  const prevSortOrderRef = useRef(sortOrder);

  useEffect(() => {
      if (!user || !db) return;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameLogos');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) setGameLogos(docSnap.data()); else setGameLogos({});
      }, (error) => console.error("Game logos listener error", error));

      const promptRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'aiPrompt');
      const unsubscribePrompt = onSnapshot(promptRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().text) setCustomAiPrompt(docSnap.data().text);
          else setCustomAiPrompt("");
      }, (error) => console.error("AI Prompt listener error", error));

      return () => { unsubscribe(); unsubscribePrompt(); };
  }, [user]);

  const showNotification = (msg) => {
    let message = '알림';
    if (typeof msg === 'string') message = msg;
    else if (msg instanceof Error) message = msg.message;
    else if (msg && typeof msg === 'object') { try { message = JSON.stringify(msg); } catch(e) { message = '알 수 없는 오류'; } }
    setNotification(message); setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateLogo = async (gameName, file) => {
      if (!file || !db) return;
      try {
          const url = URL.createObjectURL(file);
          const base64 = await blobUrlToBase64(url);
          const compressed = await compressImage(base64, 150, 0.9);
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameLogos');
          await setDoc(docRef, { [gameName]: compressed }, { merge: true });
          showNotification(`${gameName} 로고가 설정되었습니다.`);
      } catch (e) { console.error(e); showNotification("로고 업로드에 실패했습니다."); }
  };

  const handleRemoveLogo = async (gameName) => {
      if (!db) return;
      try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gameLogos');
          const snap = await getDoc(docRef);
          if(snap.exists()){
              const data = snap.data(); delete data[gameName];
              await setDoc(docRef, data);
              showNotification(`${gameName} 로고가 삭제되었습니다.`);
          }
      } catch (e) { showNotification("로고 삭제에 실패했습니다."); }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            if (previewModalOpen) {
                if(hasChanges || isEditingPreview) { if(confirm("변경사항을 취소하시겠습니까?")) { setPreviewModalOpen(false); setIsEditingPreview(false); } }
                else setPreviewModalOpen(false);
            } else if (isAllGamesModalOpen) setIsAllGamesModalOpen(false);
            else if (isPromptManagerOpen) setIsPromptManagerOpen(false);
            else if (isDuplicateModalOpen) setIsDuplicateModalOpen(false);
            else if (isLogoManagerOpen) setIsLogoManagerOpen(false);
            else if (isUploadModalOpen) setIsUploadModalOpen(false);
            else if (isBatchEditModalOpen) setIsBatchEditModalOpen(false);
            else if (ocrProgress.isOpen && ocrProgress.status === 'confirm') setOcrProgress(prev => ({ ...prev, isOpen: false }));
            else if (isSettingsOpen) setIsSettingsOpen(false);
            else if (isThemeMenuOpen) setIsThemeMenuOpen(false);
            else if (isFilterMenuOpen) setIsFilterMenuOpen(false);
            else if (isSidebarOpen) setIsSidebarOpen(false);
            else if (selectedIds.length > 0) setSelectedIds([]);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalOpen, isUploadModalOpen, isBatchEditModalOpen, isSettingsOpen, isThemeMenuOpen, isFilterMenuOpen, isSidebarOpen, hasChanges, isEditingPreview, selectedIds, isDuplicateModalOpen, ocrProgress.isOpen, ocrProgress.status, isPromptManagerOpen, isAllGamesModalOpen]);

  useEffect(() => {
      const handleClickOutside = (event) => {
          if (settingsRef.current && !settingsRef.current.contains(event.target)) setIsSettingsOpen(false);
          if (themeRef.current && !themeRef.current.contains(event.target)) setIsThemeMenuOpen(false);
          if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) setIsFilterMenuOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableGames = useMemo(() => {
    const dataGames = banners.map(b => b.game).filter(Boolean);
    return [...new Set([...dataGames])].sort();
  }, [banners]);

  const recentGames = useMemo(() => {
      const sortedGames = [...new Set(banners.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(b => b.game))].filter(Boolean);
      return sortedGames.filter(g => !pinnedGames.includes(g)).slice(0, 2);
  }, [banners, pinnedGames]);

  const topTags = useMemo(() => {
      const counts = {};
      banners.forEach(b => {
          if (Array.isArray(b.tags)) {
              b.tags.forEach(t => { if (t && t !== '기타') counts[t] = (counts[t] || 0) + 1; });
          }
      });
      return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
  }, [banners]);

  const isAllSelected = filteredBanners.length > 0 && selectedIds.length >= filteredBanners.length;

  const getCategoryDisplayName = () => {
    if (activeCategory === 'all') return '전체 보기';
    if (activeCategory === 'favorites') return '좋아요';
    if (activeCategory === 'cart') return '담기';
    if (activeCategory === 'temp') return '임시 평가 폴더';
    return gameNameMap[activeCategory] || activeCategory;
  };

  const handleGlobalDragEnter = (e) => {
      e.preventDefault(); e.stopPropagation();
      dragCounter.current += 1;
      if (dragCounter.current === 1) setIsDraggingOverGlobal(true);
  };
  const handleGlobalDragLeave = (e) => {
      e.preventDefault(); e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) setIsDraggingOverGlobal(false);
  };
  const handleGlobalDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  const handleGlobalDrop = async (e) => {
      e.preventDefault(); e.stopPropagation();
      dragCounter.current = 0;
      setIsDraggingOverGlobal(false);
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
          setTempBanners(prev => [...prev, ...newTemps]);
          setActiveCategory('temp');
          setSearchQuery('');
          showNotification(`임시 평가 폴더에 ${files.length}개의 이미지가 추가되었습니다.`);
          if (newTemps.length > 0) handleOpenPreview(newTemps[0]);
      } catch (err) {
          showNotification("파일 처리 중 오류가 발생했습니다.");
      } finally { setIsProcessingFiles(false); }
  };

  const handleCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text; textArea.style.position = "fixed"; textArea.style.left = "-9999px";
    document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); return true; } catch (err) { return false; } finally { document.body.removeChild(textArea); }
  };

  const handleCopyPathGrid = useCallback((path) => {
      if (!path) { showNotification("경로가 지정되지 않았습니다."); return; }
      if (handleCopy(path)) showNotification("클립보드에 복사되었습니다.");
  }, []);

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
            const pathParts = selectedBanner.path.split(/[\\/]/).filter(Boolean);
            if (pathParts.length > 0) folderName = pathParts[pathParts.length - 1];
        }
        const cleanFolderName = folderName.replace(/[<>:"/\\|?*]/g, '_');
        const filename = `${cleanFolderName}.jpg`;
        a.download = filename; document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
        showNotification("이미지 다운로드가 시작되었습니다.");
    } catch (e) {
        showNotification("다운로드 실패 (CORS 또는 네트워크 오류)"); window.open(imageUrl, '_blank');
    }
  };

  const handleGameClick = (gameKey) => {
      if (!isDesktopSidebarOpen) setIsDesktopSidebarOpen(true);
      setActiveCategory(gameKey);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const togglePinGame = (gameKey, e) => {
      if(e) e.stopPropagation();
      setPinnedGames(prev => {
          if (prev.includes(gameKey)) return prev.filter(g => g !== gameKey);
          return [...prev, gameKey];
      });
  };

  // user는 AuthContext에서 직접 받습니다 (App.jsx의 AuthProvider가 제공).
  // 8초 watchdog만 남겨서 인증/네트워크 문제로 데이터가 안 와도 spinner는 풀리게 합니다.
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
    if (user) console.log(`[BannerCodex] auth ready: ${user.uid} (${user.email || 'anonymous'})`);
  }, [user]);

  // Per-user bookmarks (담기) — replaces client-only cartIds.
  useEffect(() => {
    if (!user || !db) { setCartIds([]); return; }
    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'bookmarks');
    const unsub = onSnapshot(colRef,
      (snap) => setCartIds(snap.docs.map(d => d.id)),
      (err) => console.error('[BannerCodex] bookmarks listener error', err)
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !db) {
        // No user yet: don't keep the spinner on indefinitely, the auth watchdog also handles this.
        if (!user) console.log('[BannerCodex] data effect waiting for user');
        return;
    }
    const isMajorChange = prevSortOrderRef.current !== sortOrder || banners.length === 0;
    if (isMajorChange) setIsLoadingData(true);
    prevSortOrderRef.current = sortOrder;

    // No orderBy — Firestore would silently DROP documents missing the field, hiding restored items.
    // Sort client-side with safe fallback for missing/string createdAt.
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'banners');
    const q = query(collectionRef);

    const dataWatchdog = setTimeout(() => {
        console.warn('[BannerCodex] data listener: no response in 8s. Releasing spinner.');
        setIsLoadingData(false);
    }, 8000);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        clearTimeout(dataWatchdog);
        const toMs = (v) => {
            if (typeof v === 'number') return v;
            if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
            if (v && typeof v.toMillis === 'function') return v.toMillis();
            return 0;
        };
        const newBanners = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (sortOrder === 'oldest') newBanners.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
        else if (sortOrder === 'popular') newBanners.sort((a, b) => (b.liked === a.liked ? 0 : b.liked ? 1 : -1));
        else if (sortOrder === 'score') newBanners.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));
        else newBanners.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)); // newest default
        console.log(`[BannerCodex] received ${newBanners.length} banners`);
        setBanners(newBanners);
        setIsLoadingData(false);
    }, (error) => {
        clearTimeout(dataWatchdog);
        console.error('[BannerCodex] Firestore listener error:', error);
        showNotification(`데이터 로딩 실패: ${error.code || error.message}`);
        setIsLoadingData(false);
    });
    return () => { clearTimeout(dataWatchdog); unsubscribe(); };
  }, [user, sortOrder]);

  const withTimeout = (promise, ms, label) =>
      Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms (Firestore Rules가 막고 있을 수 있습니다)`)), ms))
      ]);
  const addBannerToCloud = async (bannerData) => {
      const currentUser = auth?.currentUser || user;
      if (!currentUser || !db) { console.warn('[BannerCodex] addBannerToCloud: no user or db', { hasUser: !!currentUser, hasDb: !!db }); return; }
      try {
          const { preview, imageUrl: existingUrl, thumbnailUrl: existingThumbUrl, ...metaData } = bannerData;
          let imageUrl = existingUrl || null;
          let thumbnailUrl = existingThumbUrl || null;
          if (preview && !imageUrl) {
              const thumbnail = await compressImage(preview, 400, 0.8);
              const original = await compressImage(preview, 1200, 0.8);
              const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              [imageUrl, thumbnailUrl] = await Promise.all([
                  withTimeout(uploadBase64(original, `banners/${currentUser.uid}/${id}-orig.jpg`), 30000, 'storage upload (original)'),
                  withTimeout(uploadBase64(thumbnail, `banners/${currentUser.uid}/${id}-thumb.jpg`), 30000, 'storage upload (thumb)'),
              ]);
          }
          const cleanData = sanitizeFirestoreData({
              ...metaData,
              imageUrl, thumbnailUrl,
              uploadedBy: currentUser.uid,
              featured: metaData.featured || false,
              createdAt: metaData.createdAt || Date.now(),
          });
          await withTimeout(
              addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'banners'), cleanData),
              20000, 'addDoc(banners)'
          );
          await delay(WRITE_DELAY_MS);
      } catch (e) {
          console.error('[BannerCodex] addBannerToCloud failed:', e);
          throw e; // let caller decide (restore loop counts as skipped)
      }
  };

  const updateBannerInCloud = async (id, data) => {
      if (id.startsWith('temp_')) {
          setTempBanners(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
          return;
      }
      if (!user || !db) return;
      try {
          const cleanData = sanitizeFirestoreData(data);
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'banners', id);
          await setDoc(docRef, cleanData, { merge: true });
      } catch (e) { console.error("Update failed", e); }
  };

  const deleteBannerFromCloud = async (id) => {
      if (id.startsWith('temp_')) {
          setTempBanners(prev => prev.filter(b => b.id !== id));
          return;
      }
      if (!user || !db) return;
      try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'banners', id);
          await deleteDoc(docRef);
      } catch (e) { console.error("Delete failed", e); }
  };

  const toggleLike = async (id, e) => {
      if (e) e.stopPropagation();
      const sourceBanners = id.startsWith('temp_') ? tempBanners : banners;
      const banner = sourceBanners.find(b => b.id === id);
      if (banner) {
          const newState = !banner.liked;
          await updateBannerInCloud(id, { liked: newState });
          if (selectedBanner && selectedBanner.id === id) {
              setEditedBanner(prev => ({ ...prev, liked: newState }));
              setSelectedBanner(prev => ({ ...prev, liked: newState }));
          }
      }
  };

  const toggleFeature = async (id, e) => {
      e.stopPropagation();
      const sourceBanners = id.startsWith('temp_') ? tempBanners : banners;
      const banner = sourceBanners.find(b => b.id === id);
      if (banner) {
          const newState = !banner.featured;
          await updateBannerInCloud(id, { featured: newState });
          showNotification(newState ? "추천 배너로 설정되었습니다." : "추천이 해제되었습니다.");
          if (selectedBanner && selectedBanner.id === id) {
              setEditedBanner(prev => ({...prev, featured: newState}));
              setSelectedBanner(prev => ({...prev, featured: newState}));
          }
      }
  };

  const handleDeleteSelected = async () => {
    const count = selectedIds.length;
    showNotification(`${count}개의 배너를 삭제 중...`);
    const chunk_size = 3;
    for (let i = 0; i < selectedIds.length; i += chunk_size) {
        const chunk = selectedIds.slice(i, i + chunk_size);
        await Promise.all(chunk.map(id => deleteBannerFromCloud(id)));
        await delay(WRITE_DELAY_MS);
    }
    setSelectedIds([]);
    showNotification("삭제가 완료되었습니다.");
  };

  const handleResetAI = () => { if (selectedIds.length === 0) return; setIsResetModalOpen(true); };

  const executeResetAI = async () => {
      setIsResetModalOpen(false);
      showNotification(`${selectedIds.length}개 항목의 AI 데이터 초기화 중...`);
      try {
          const chunk_size = 5;
          for (let i = 0; i < selectedIds.length; i += chunk_size) {
              const chunk = selectedIds.slice(i, i + chunk_size);
              await Promise.all(chunk.map(async (id) => {
                  const sourceBanners = id.startsWith('temp_') ? tempBanners : banners;
                  const banner = sourceBanners.find(b => b.id === id);
                  if (!banner) return;
                  const updateData = {
                      ocrProcessed: false, score: null, aiScore: null, manualScoreAdj: null, scores: null,
                      tags: [], date: null, month: '', title: banner.originalTitle || '제목 없음'
                  };
                  await updateBannerInCloud(id, updateData);
              }));
              await delay(WRITE_DELAY_MS);
          }
          showNotification("AI 데이터 초기화가 완료되었습니다."); setSelectedIds([]);
      } catch (e) { console.error(e); showNotification("초기화 중 오류가 발생했습니다."); }
  };

  const handleConfirmDelete = async () => {
      const allTempSelected = selectedIds.length > 0 && selectedIds.every(id => id.startsWith('temp_'));
      // admin이면 비밀번호 검증 생략. 임시 선택은 그대로 통과.
      if (allTempSelected || isAdmin || deletePassword === '1234') {
          setIsDeleteModalOpen(false); setDeletePassword('');
          await handleDeleteSelected();
      } else { showNotification("비밀번호가 올바르지 않습니다."); setDeletePassword(''); }
  };

  const handleSelectAll = () => {
    const filteredIds = filteredBanners.map(b => b.id);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
  };

  const handleOpenBatchEdit = useCallback((targetIds = null) => {
      const idsToEdit = targetIds || selectedIds;
      if (idsToEdit.length === 0) return;
      const sourceBanners = activeCategory === 'temp' ? tempBanners : banners;
      const targetBanners = sourceBanners.filter(b => idsToEdit.includes(b.id));
      const uniqueGames = [...new Set(targetBanners.map(b => b.game))];
      const uniqueYears = [...new Set(targetBanners.map(b => b.year))];
      setBatchForm({
          game: uniqueGames.length === 1 ? uniqueGames[0] : 'mixed',
          year: uniqueYears.length === 1 ? uniqueYears[0] : 'mixed',
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
          const chunk_size = 3;
          for (let i = 0; i < selectedIds.length; i += chunk_size) {
              const chunk = selectedIds.slice(i, i + chunk_size);
              await Promise.all(chunk.map(async (id) => {
                  const sourceBanners = id.startsWith('temp_') ? tempBanners : banners;
                  const banner = sourceBanners.find(b => b.id === id);
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
                              const restOfPath = parts.slice(3).join('\\');
                              updateData.path = `\\\\ppc-file\\${folderName}\\${newYear}\\${restOfPath}`;
                          } else updateData.path = `\\\\ppc-file\\${folderName}\\${newYear}\\배너`;
                      } else updateData.path = `\\\\ppc-file\\${folderName}\\${newYear}\\배너`;
                  }
                  if (Object.keys(updateData).length > 0) {
                      await updateBannerInCloud(id, updateData);
                      if (selectedBanner && selectedBanner.id === id) {
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
      } catch (e) { showNotification("오류가 발생했습니다."); }
  };

  const handleSavePrompt = async () => {
      if (!user || !db) return;
      try {
          const promptRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'aiPrompt');
          await setDoc(promptRef, { text: editingPromptText }, { merge: true });
          setCustomAiPrompt(editingPromptText);
          setIsPromptManagerOpen(false);
          showNotification("AI 평가 프롬프트가 성공적으로 저장되었습니다.");
      } catch (e) { console.error("Save prompt failed", e); showNotification("프롬프트 저장에 실패했습니다."); }
  };

  const handlePromptFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          setEditingPromptText(event.target.result);
          showNotification("파일에서 프롬프트를 불러왔습니다. 확인 후 저장해주세요.");
      };
      reader.onerror = () => showNotification("파일 읽기에 실패했습니다.");
      reader.readAsText(file);
      e.target.value = '';
  };

  const handlePromptFileDownload = () => {
      if (!editingPromptText) { showNotification("내보낼 프롬프트 내용이 없습니다."); return; }
      const blob = new Blob([editingPromptText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `ai_prompt_backup_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification("프롬프트가 .txt 파일로 저장되었습니다.");
  };

  const callOpenAIAPI = async (prompt, imageBase64) => {
    if (!openAiApiKey) return null;
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: "system", content: "You are a professional design evaluation AI. You must output only valid JSON matching the exact schema requested by the user." },
                    { role: "user", content: [ { type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } } ] }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            })
        });
        if (!response.ok) throw new Error("OpenAI API Error");
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (e) { console.error("OpenAI API Failed:", e); return null; }
  };

  const callGeminiAPI = async (prompt, imageBase64 = null, isJson = false, isBatchCall = false) => {
    const apiKey = geminiApiKey || GEMINI_API_KEY;
    // 재시도는 일시적 네트워크/5xx에만. 4xx는 모델·인증·요청 문제라 무한 재시도 무의미.
    const MAX_ATTEMPTS = 3;
    const delays = [1000, 2000];
    try {
      const generationConfig = { temperature: 0.1 };
      if (isJson) {
          generationConfig.responseMimeType = "application/json";
          generationConfig.responseSchema = {
              type: "OBJECT",
              properties: {
                  title: { type: "STRING" },
                  date_info: { type: "OBJECT", properties: { year: { type: "STRING" }, month: { type: "STRING" }, full_date: { type: "STRING" } } },
                  tags: { type: "ARRAY", items: { type: "STRING" } },
                  purpose: { type: "STRING" },
                  scores_data: {
                      type: "OBJECT",
                      properties: {
                          impression: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          concept:    { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          layout:     { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          typography: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          color:      { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          readability:{ type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          brand:      { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          flow:       { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          detail:     { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] },
                          conversion: { type: "OBJECT", properties: { score: { type: "NUMBER" }, reason: { type: "STRING" } }, required: ["score", "reason"] }
                      },
                      required: ["impression","concept","layout","typography","color","readability","brand","flow","detail","conversion"]
                  }
              },
              required: ["title", "tags", "purpose", "scores_data"]
          };
      }
      const requestBody = {
          contents: [{ parts: [ { text: prompt }, ...(imageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] : []) ] }],
          generationConfig,
          safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
      };
      // gemini-2.5-pro는 이미지 분석 + JSON schema 강제 시 응답이 느려서 60초 권장.
      // 자체 타임아웃에만 abort됨 — 컴포넌트 언마운트/리렌더와 무관 (src 전체에 cleanup-abort 없음).
      const REQUEST_TIMEOUT_MS = 60000;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (isBatchCall && stopBatchRef.current) return null;
        const controller = new AbortController();
        // 사용자가 "분석 중지" 누르면 진행 중인 fetch도 즉시 abort.
        if (isBatchCall) activeFetchControllerRef.current = controller;
        let didTimeout = false;
        const timeoutId = setTimeout(() => {
          didTimeout = true;
          try { controller.abort(new Error(`Gemini timeout ${REQUEST_TIMEOUT_MS / 1000}s`)); }
          catch { controller.abort(); }
        }, REQUEST_TIMEOUT_MS);
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody), signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (!response.ok) {
              let errorMsg = `HTTP ${response.status}`;
              try { const errData = await response.json(); if (errData.error && errData.error.message) errorMsg += ` - ${errData.error.message}`; } catch (e) {}
              const err = new Error(errorMsg);
              err.status = response.status;
              throw err;
          }
          const data = await response.json();
          if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
             return data.candidates[0].content.parts[0].text;
          }
          return "ERROR:응답 결과가 없습니다. (API 안전 필터 차단 의심)";
        } catch (e) {
          clearTimeout(timeoutId);
          // AbortError ("signal is aborted without reason" 포함) 를 명확한 메시지로 정규화.
          // didTimeout 플래그가 true면 자체 타임아웃이 원인.
          const isAbort = e?.name === 'AbortError' || e?.code === 20 || didTimeout;
          if (isAbort) {
              const reasonMsg = controller.signal?.reason?.message
                              || (didTimeout ? `타임아웃 (${REQUEST_TIMEOUT_MS / 1000}s)` : '요청 취소됨');
              e = new Error(reasonMsg);
              // status 없음 → isRetryable=true 로 자동 재시도
          }
          // 4xx (모델 미존재/잘못된 키/요청 형식) 는 재시도 무의미 → 즉시 중단.
          // 429 (rate limit) / 5xx (서버 장애) / 네트워크 오류 / 타임아웃만 재시도.
          const isRetryable = !e.status || e.status === 429 || e.status >= 500;
          if (!isRetryable) {
              console.warn(`[BannerCodex] Gemini ${e.status} — 재시도 안 함:`, e.message);
              throw e;
          }
          if (attempt === MAX_ATTEMPTS - 1 || (isBatchCall && stopBatchRef.current)) throw e;
          console.warn(`[BannerCodex] Gemini 재시도 ${attempt + 1}/${MAX_ATTEMPTS - 1} (${e.message})`);
          const delayMs = delays[attempt] || 2000;
          for (let t = 0; t < delayMs; t += 100) {
              if (isBatchCall && stopBatchRef.current) return null;
              await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    } catch (error) {
        console.error("Gemini API Error:", error); return `ERROR:${error.message}`;
    }
    return null;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setAiSearchIds(null); return; }
    if (isAiSearchMode) {
        setIsSearching(true);
        try {
            const sourceBanners = activeCategory === 'temp' ? tempBanners : banners;
            const bannerMetadata = sourceBanners.slice(0, 200).map(b => ({ id: b.id, title: b.title, tags: b.tags?.join(', '), mood: b.mood }));
            const prompt = `사용자가 다음 쿼리로 배너를 찾고 있습니다: "${searchQuery}"\n아래 배너 목록 중에서 사용자의 요청과 의미적으로 가장 관련성이 높은 배너들의 ID를 찾으세요.\n[배너 목록]\n${JSON.stringify(bannerMetadata)}\n**출력 형식**: 오직 JSON 배열 형식으로 ID 목록만 반환하세요. 예: ["id1", "id2"]`;
            const result = await callGeminiAPI(prompt, null, false, false);
            if (result) {
                const jsonStr = result.replace(/```json|```/g, '').trim();
                const ids = JSON.parse(jsonStr);
                if (Array.isArray(ids)) {
                    setAiSearchIds(ids);
                    if (ids.length === 0) showNotification("AI 검색 결과가 없습니다.");
                    else showNotification(`${ids.length}개의 관련 배너를 찾았습니다.`);
                } else setAiSearchIds([]);
            }
        } catch (e) { showNotification("AI 검색 중 오류가 발생했습니다."); setAiSearchIds([]); }
        finally { setIsSearching(false); }
    }
  };

  const handleSmartAnalysis = async (banner, e, isBatch = false) => {
    if(e) e.stopPropagation();
    setProcessingBannerId(banner.id);
    if (!isBatch) {
        if (openAiApiKey) showNotification("듀얼 AI(Gemini + ChatGPT) 10대 지표 분석 중...");
        else showNotification("AI 10대 지표 분석 중... (단일 모델)");
    }
    try {
      // 이미지 소스 우선순위: loadedImage(미리보기에서 받아온 base64) → preview(임시) →
      //                      imageUrl/thumbnailUrl(Cloudinary) → imageId(legacy banner_images)
      let imgSource = banner.loadedImage
                    || banner.preview
                    || banner.imageUrl
                    || banner.thumbnailUrl
                    || null;
      if (!imgSource && banner.imageId && !banner.isTemp && db) {
          try {
              const imgDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banner_images', banner.imageId));
              if (imgDoc.exists()) imgSource = imgDoc.data().original || imgDoc.data().thumbnail;
          } catch (err) { console.error("[BannerCodex] legacy image load failed", err); }
      }
      if (!imgSource) {
          showNotification("분석할 이미지 데이터를 불러올 수 없습니다.");
          setProcessingBannerId(null); return;
      }

      // Gemini API의 inlineData는 raw base64를 요구. URL이면 fetch → data URL → strip prefix.
      let base64Image;
      try {
          if (imgSource.startsWith('data:image')) {
              const compressed = await compressImage(imgSource, 1024, 0.8);
              base64Image = compressed.split(',')[1];
          } else if (imgSource.startsWith('http') || imgSource.startsWith('blob:')) {
              const dataUrl = await blobUrlToBase64(imgSource);
              if (!dataUrl) throw new Error("이미지 다운로드 실패 (CORS 또는 네트워크)");
              const compressed = await compressImage(dataUrl, 1024, 0.8);
              base64Image = compressed.split(',')[1];
          } else if (imgSource.includes(',')) {
              base64Image = imgSource.split(',')[1];
          } else {
              base64Image = imgSource; // 이미 raw base64
          }
      } catch (err) {
          console.error("[BannerCodex] image conversion failed", err);
          showNotification(`이미지 변환 실패: ${err.message || err}`);
          setProcessingBannerId(null); return;
      }
      if (!base64Image) {
          showNotification("이미지를 base64로 변환하지 못했습니다.");
          setProcessingBannerId(null); return;
      }

      const otherFeedbacks = banners
          .filter(b => b.id !== banner.id && (b.userComment || (b.manualScoreAdj && b.manualScoreAdj !== 0)))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 4)
          .map(b => `- [특징: ${b.tags?.join(', ')}] 수동 점수 보정: ${b.manualScoreAdj > 0 ? '+' : ''}${b.manualScoreAdj}점 / 과거 코멘트: "${b.userComment || '없음'}"`);

      const currentFeedback = [];
      if (banner.userComment || (banner.manualScoreAdj && banner.manualScoreAdj !== 0)) {
          currentFeedback.push(`- [★★★현재 평가 중인 이미지에 대한 사용자의 직접 지시 (0순위 반영)★★★] 수동 점수 보정: ${banner.manualScoreAdj > 0 ? '+' : ''}${banner.manualScoreAdj || 0}점 / 코멘트 내용: "${banner.userComment || '없음'}"`);
      }

      const allFeedbacks = [...currentFeedback, ...otherFeedbacks].join('\n');
      const learningContext = allFeedbacks.length > 0 ? `\n[사용자 피드백 학습 데이터]\n${allFeedbacks}\n` : '';
      let basePromptToUse = customAiPrompt || DEFAULT_AI_PROMPT;
      let dynamicPrompt = basePromptToUse.includes('{{LEARNING_CONTEXT}}')
          ? basePromptToUse.replace('{{LEARNING_CONTEXT}}', learningContext)
          : `${basePromptToUse}\n\n${learningContext}`;

      let geminiResult = null;
      let openaiResult = null;
      try {
          const promises = [callGeminiAPI(dynamicPrompt, base64Image, true, isBatch)];
          if (openAiApiKey) promises.push(callOpenAIAPI(dynamicPrompt, base64Image));
          const results = await Promise.allSettled(promises);
          if (results[0].status === 'fulfilled' && !results[0].value?.startsWith('ERROR:')) geminiResult = results[0].value;
          else if (!isBatch) showNotification(`Gemini API 오류: ${results[0].value?.replace('ERROR:', '')}`);
          if (openAiApiKey && results[1]?.status === 'fulfilled' && results[1].value) openaiResult = results[1].value;
      } catch (err) { console.error("병렬 API 호출 실패", err); }

      if (!geminiResult && !openaiResult) {
          if (!isBatch) showNotification("AI 분석에 실패했습니다. (API 응답 없음)");
          setProcessingBannerId(null); return;
      }

      let geminiData = null;
      let openaiData = null;
      if (geminiResult) try { geminiData = JSON.parse(geminiResult.replace(/```json|```/g, '').trim()); } catch (e) { console.error("Gemini JSON Parse Error", e); }
      if (openaiResult) try { openaiData = JSON.parse(openaiResult.replace(/```json|```/g, '').trim()); } catch (e) { console.error("OpenAI JSON Parse Error", e); }

      const primaryData = geminiData || openaiData;
      if (primaryData) {
            const updateData = { ocrProcessed: true };
            if (primaryData.title) updateData.title = String(primaryData.title);
            if (primaryData.date_info) {
                const isInvalid = (val) => !val || String(val).toLowerCase() === "null" || String(val).includes("없음") || String(val).includes("불명");
                if (primaryData.date_info.year && !isInvalid(primaryData.date_info.year)) updateData.year = String(primaryData.date_info.year);
                if (primaryData.date_info.month && !isInvalid(primaryData.date_info.month)) updateData.month = String(primaryData.date_info.month).padStart(2, '0');
                if (primaryData.date_info.full_date && !isInvalid(primaryData.date_info.full_date)) updateData.date = String(primaryData.date_info.full_date);
            }
            if (Array.isArray(primaryData.tags)) updateData.tags = primaryData.tags.map(String);
            if (primaryData.scores_data) {
                // null이면 미분석 항목으로 표시 (이전엔 80으로 채워서 가짜 점수가 들어갔음).
                const mergeScore = (gScore, oScore) => {
                    if (gScore != null && oScore != null) return (gScore + oScore) / 2;
                    if (gScore != null) return gScore;
                    if (oScore != null) return oScore;
                    return null; // 둘 다 누락
                };
                const mergeReason = (gReason, oReason) => gReason || oReason || '';
                const keys = ['impression', 'concept', 'layout', 'typography', 'color', 'readability', 'brand', 'flow', 'detail', 'conversion'];
                const mergedScoresData = {};
                let totalScoreSum = 0;
                let validScoreCount = 0;
                const missingKeys = [];
                keys.forEach(key => {
                    const gScore = geminiData?.scores_data?.[key]?.score;
                    const oScore = openaiData?.scores_data?.[key]?.score;
                    const score = mergeScore(gScore, oScore);
                    const reason = mergeReason(geminiData?.scores_data?.[key]?.reason, openaiData?.scores_data?.[key]?.reason);
                    if (score == null) {
                        missingKeys.push(key);
                        mergedScoresData[key] = { score: null, reason: reason || '(분석 누락 — AI 응답에 없음)' };
                    } else {
                        mergedScoresData[key] = { score: Math.round(score), reason };
                        totalScoreSum += score;
                        validScoreCount++;
                    }
                });
                if (missingKeys.length > 0) {
                    console.warn(`[BannerCodex] AI 응답에서 누락된 항목 ${missingKeys.length}/10: ${missingKeys.join(', ')}`);
                }
                // 평균은 실제 분석된 항목 수로만 계산
                const avg100 = validScoreCount > 0 ? totalScoreSum / validScoreCount : 0;
                let aiScore = avg100 / 10;
                aiScore = Math.round(aiScore * 10) / 10;
                updateData.scores = mergedScoresData;
                updateData.aiScore = aiScore;
                updateData.scoredCount = validScoreCount; // UI에서 "8/10 분석됨" 표시 가능
                updateData.manualScoreAdj = 0;
                let finalScore = aiScore;
                finalScore = Math.max(0.0, Math.min(9.9, finalScore));
                updateData.score = finalScore.toFixed(1);
                if (validScoreCount < 10 && !isBatch) {
                    showNotification(`분석 완료 — 단, ${10 - validScoreCount}개 항목이 AI 응답에서 누락됨`);
                }
            }
            await updateBannerInCloud(banner.id, updateData);
            if (selectedBanner && selectedBanner.id === banner.id) {
                setSelectedBanner(prev => ({ ...prev, ...updateData }));
                setEditedBanner(prev => ({ ...prev, ...updateData }));
            }
            if (!isBatch) showNotification("분석 완료");
      } else { if (!isBatch) showNotification("정보를 찾을 수 없습니다."); }
    } catch (e) { if (!isBatch) showNotification("오류가 발생했습니다."); }
    finally { setProcessingBannerId(null); }
  };

  // ⚠️ 중요: 이 함수는 오직 모달의 "분석 시작" 버튼 onClick에서만 호출됩니다.
  // 데이터 로드/리스너/useEffect로 자동 호출되는 코드 없음 (전체 src 검증 완료).
  // 자동 트리거를 추가하려면 사용자 명시적 동의 후에만 진행할 것.
  const runSelectedOCR = async () => {
      if (isBatchProcessing) { stopBatchRef.current = true; return; }
      const sourceBanners = activeCategory === 'temp' ? tempBanners : banners;
      const targetBanners = sourceBanners.filter(b => selectedIds.includes(b.id));
      if (targetBanners.length === 0) return;
      setIsBatchProcessing(true); stopBatchRef.current = false;
      setOcrProgress({ isOpen: true, status: 'processing', current: 0, total: targetBanners.length, target: '' });
      showNotification(`${targetBanners.length}개의 선택된 배너 분석 시작 (1개씩 순차)`);
      try {
          for (let i = 0; i < targetBanners.length; i++) {
              const banner = targetBanners[i];
              if (stopBatchRef.current) break;
              setOcrProgress(prev => ({ ...prev, current: i + 1, target: safeRender(banner.title) || '분석 중...' }));
              try {
                  // 한 번에 1개씩만 처리. handleSmartAnalysis가 이미지 소스 fallback도 알아서 처리.
                  await handleSmartAnalysis(banner, null, true);
              } catch (err) { console.error(`[BannerCodex] 분석 실패 (계속 진행):`, err); }

              // 마지막 항목 뒤엔 딜레이 불필요
              if (i < targetBanners.length - 1) {
                  const BATCH_DELAY = 3000; const interval = 100;
                  for (let t = 0; t < BATCH_DELAY; t += interval) {
                      if (stopBatchRef.current) break;
                      await new Promise(r => setTimeout(r, interval));
                  }
              }
          }
      } finally {
          activeFetchControllerRef.current = null;
          setIsBatchProcessing(false);
          setOcrProgress({ isOpen: false, status: 'idle', current: 0, total: 0, target: '' });
          if (!stopBatchRef.current) showNotification("선택된 항목 분석 완료");
          else showNotification("분석이 중지되었습니다.");
          setSelectedIds([]);
      }
  };

  // "분석 중지" 버튼 핸들러 — 진행 중인 fetch도 즉시 abort.
  const handleCancelBatch = () => {
      stopBatchRef.current = true;
      try { activeFetchControllerRef.current?.abort(new Error("사용자가 분석을 중지했습니다.")); }
      catch {}
  };

  const handleOpenPreview = useCallback(async (banner) => {
      const sanitizeStr = (val, fallback = '') => (val != null && typeof val !== 'object') ? String(val) : fallback;
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
      setHasChanges(false); setIsCustomGameInput(false); setIsEditingPreview(false); setIsActionMenuOpen(false);
      setZoomScale(1); setPanPos({ x: 0, y: 0 }); setPreviewModalOpen(true); setIsScorePopoverOpen(false);
      setIsScoreAdjExpanded(false);
      if (banner.loadedImage) setHighResImage(banner.loadedImage);
      else if (banner.preview) setHighResImage(banner.preview);
      if (banner.imageId && !banner.isTemp && db) {
          try {
              const imgDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banner_images', banner.imageId));
              if (imgDoc.exists()) {
                  const originalImg = imgDoc.data().original; if (originalImg) setHighResImage(originalImg);
              }
          } catch (e) {}
      }
  }, []);

  const handleMouseDown = (e) => { e.preventDefault(); setIsDragging(true); setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y }); };
  const handleMouseMove = (e) => { if (!isDragging) return; setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);
  const handleWheel = (e) => { const scaleAdjust = e.deltaY * -0.001; setZoomScale(prev => Math.min(Math.max(1, prev + scaleAdjust), 5)); };

  const handleDeleteSingleBanner = async (id) => { setSelectedIds([id]); setIsDeleteModalOpen(true); };

  const handleEditChange = (field, value) => {
      if (!editedBanner) return;
      setEditedBanner(prev => {
          const next = { ...prev, [field]: value };
          if (field === 'manualScoreAdj') {
              const adj = parseInt(value || 0);
              const prevAiScore = parseFloat(next.aiScore);
              const prevScore = parseFloat(selectedBanner.score);
              let aiBase100 = 0;
              if (!isNaN(prevAiScore)) aiBase100 = Math.round(prevAiScore * 10);
              else if (!isNaN(prevScore)) aiBase100 = Math.round(prevScore * 10) - (parseInt(selectedBanner.manualScoreAdj) || 0);
              const newScore100 = Math.max(0, Math.min(99, aiBase100 + adj));
              next.score = (newScore100 / 10).toFixed(1);
          }
          const { loadedImage, ...origin } = selectedBanner;
          const { loadedImage: l2, ...curr } = next;
          setHasChanges(JSON.stringify(origin) !== JSON.stringify(curr));
          return next;
      });
  };

  const handleQuickSave = async (updates) => {
      if (!editedBanner) return;
      const newData = { ...editedBanner, ...updates };
      setEditedBanner(newData);
      setSelectedBanner(prev => ({ ...prev, ...updates }));
      await updateBannerInCloud(editedBanner.id, updates);
  };

  const handleSaveEdit = async () => {
      if (!editedBanner) return;
      const { id, loadedImage, ...data } = editedBanner;
      await updateBannerInCloud(id, data);
      setSelectedBanner({ ...selectedBanner, ...data });
      setHasChanges(false); showNotification("변경사항이 저장되었습니다."); setIsEditingPreview(false);
  };

  const handleCancelEdit = () => {
      const { loadedImage, ...origin } = selectedBanner;
      setEditedBanner(origin); setHasChanges(false); setIsEditingPreview(false); showNotification("편집이 취소되었습니다.");
  };

  const handleAddTag = () => {
      if (!newTagInput.trim()) return;
      const currentTags = editedBanner.tags || [];
      const newTag = newTagInput.trim().replace(/,/g, '');
      if (!currentTags.includes(newTag) && newTag) handleEditChange('tags', [...currentTags, newTag]);
      setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
      const currentTags = editedBanner.tags || [];
      handleEditChange('tags', currentTags.filter(t => t !== tagToRemove));
  };

  const handleTagSearch = (tag) => { setSearchQuery(tag); showNotification(`'#${tag}' 태그로 검색`); setPreviewModalOpen(false); };

  const toggleSelection = (id, e) => {
      e.stopPropagation();
      setSelectedIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const bookmarkDoc = (id) => (user && db ? doc(db, 'artifacts', appId, 'users', user.uid, 'bookmarks', id) : null);
  const handleToggleCart = async (id) => {
      if (!user || !db) { showNotification("로그인이 필요합니다."); return; }
      try {
          if (cartIds.includes(id)) { await deleteDoc(bookmarkDoc(id)); showNotification("담기 취소되었습니다."); }
          else { await setDoc(bookmarkDoc(id), { createdAt: Date.now() }); showNotification("담기 완료되었습니다."); }
      } catch (e) { console.error('[BannerCodex] bookmark toggle failed', e); showNotification("담기 변경 실패"); }
  };

  const handleAddToCart = async () => {
      if (!user || !db || selectedIds.length === 0) return;
      try {
          const BATCH = 500;
          for (let i = 0; i < selectedIds.length; i += BATCH) {
              const batch = writeBatch(db);
              selectedIds.slice(i, i + BATCH).forEach(id => batch.set(bookmarkDoc(id), { createdAt: Date.now() }));
              await batch.commit();
          }
          showNotification(`${selectedIds.length}개의 배너를 담았습니다.`); setSelectedIds([]);
      } catch (e) { console.error('[BannerCodex] add to cart failed', e); showNotification("담기 실패"); }
  };

  const handleRemoveFromCart = async () => {
      if (!user || !db || selectedIds.length === 0) return;
      try {
          const BATCH = 500;
          for (let i = 0; i < selectedIds.length; i += BATCH) {
              const batch = writeBatch(db);
              selectedIds.slice(i, i + BATCH).forEach(id => batch.delete(bookmarkDoc(id)));
              await batch.commit();
          }
          showNotification(`${selectedIds.length}개의 배너를 담기 취소했습니다.`); setSelectedIds([]);
      } catch (e) { console.error('[BannerCodex] remove from cart failed', e); showNotification("담기 취소 실패"); }
  };

  const filteredPendingFiles = useMemo(() => {
      let startInt = null;
      if (fileFilters.startDate) startInt = parseInt(fileFilters.startDate.replace(/-/g, ''));
      const extractDateAsInt = (str) => {
          const match8 = str.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
          if (match8) return parseInt(`${match8[1]}${match8[2]}${match8[3]}`);
          const match6 = str.match(/(?:^|[^\d])([2-9]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:$|[^\d])/);
          if (match6) return parseInt(`20${match6[1]}${match6[2]}${match6[3]}`);
          return null;
      };
      return pendingFiles.filter(f => {
          const targetStr = (f.webkitRelativePath || f.name).toLowerCase();
          if (fileFilters.include) {
              const includes = fileFilters.include.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
              if (includes.length > 0 && !includes.some(inc => targetStr.includes(inc))) return false;
          }
          if (fileFilters.exclude) {
              const excludes = fileFilters.exclude.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
              if (excludes.length > 0 && excludes.some(exc => targetStr.includes(exc))) return false;
          }
          if (startInt) {
              const fileDateInt = extractDateAsInt(targetStr);
              if (!fileDateInt || fileDateInt < startInt) return false;
          }
          return true;
      });
  }, [pendingFiles, fileFilters]);

  const confirmUpload = async () => {
      if (filteredPendingFiles.length === 0) { showNotification("업로드할 파일이 없습니다. 필터 설정을 확인하세요."); return; }
      setIsUploadModalOpen(false); showNotification(`${filteredPendingFiles.length}개 업로드 진행 중...`);
      await processFiles(filteredPendingFiles, uploadSettings.game, uploadSettings.year);
      setPendingFiles([]); setIsAddingNewGame(false); setNewGameName('');
  };

  const handleCancelUpload = () => { abortUploadRef.current = true; showNotification("작업 취소 중..."); };

  const processFiles = async (files, selectedGame, selectedYear) => {
    if (files.length === 0) return;
    setIsUploading(true); setUploadProgress({ current: 0, total: files.length, skipped: 0 });
    abortUploadRef.current = false;
    try {
      let count = 0; let skippedCount = 0;
      const existingKeys = new Set(banners.map(b => getUploadDuplicateKey(b.originalTitle || b.title, b.path)));
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (abortUploadRef.current) break;
        const titleStr = file.name.replace(/\.[^/.]+$/, "");
        let folderName = getFolderName(selectedGame);
        let fileYear = selectedYear;
        const timestamp = file.lastModified || Date.now();
        const dateObj = new Date(timestamp);
        let yyyy = dateObj.getFullYear().toString(); let mm = String(dateObj.getMonth() + 1).padStart(2, '0'); let dd = String(dateObj.getDate()).padStart(2, '0');
        let fileDateStr = `${yyyy}.${mm}.${dd}`;
        let sourceFolder = "";
        if (file.webkitRelativePath) {
            const pathForDate = file.webkitRelativePath || file.name;
            const dateMatch8 = pathForDate.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
            const dateMatch6 = pathForDate.match(/(?:^|[^\d])([2-9]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:$|[^\d])/);
            if (dateMatch8) { fileYear = dateMatch8[1]; mm = dateMatch8[2]; dd = dateMatch8[3]; fileDateStr = `${fileYear}.${mm}.${dd}`; }
            else if (dateMatch6) { fileYear = `20${dateMatch6[1]}`; mm = dateMatch6[2]; dd = dateMatch6[3]; fileDateStr = `${fileYear}.${mm}.${dd}`; }
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
        if (sourceFolder) generatedPath += sourceFolder;
        else generatedPath += "\\배너";
        const fileKey = getUploadDuplicateKey(titleStr, generatedPath);
        if (skipDuplicates && existingKeys.has(fileKey)) { skippedCount++; setUploadProgress({ current: i + 1, total: files.length, skipped: skippedCount }); if (i % 50 === 0) await delay(10); continue; }
        existingKeys.add(fileKey);
        const url = URL.createObjectURL(file);
        let base64 = await blobUrlToBase64(url);
        const newBanner = {
          title: titleStr, originalTitle: titleStr, game: selectedGame, year: fileYear, date: fileDateStr, month: mm, character: "Unknown", path: generatedPath, tags: [], linkUrl: '', ocrProcessed: false, liked: false, featured: false, createdAt: new Date().toISOString(),
        };
        await addBannerToCloud({ ...newBanner, preview: base64 });
        count++; setUploadProgress({ current: i + 1, total: files.length, skipped: skippedCount });
      }
      if (abortUploadRef.current) showNotification("업로드가 취소되었습니다.");
      else showNotification(`총 ${files.length}개 중 ${files.length - skippedCount}개 업로드 완료${skippedCount > 0 ? ` (중복 스킵: ${skippedCount}개)` : ''}`);
    } catch (err) { showNotification("업로드 중 일부 오류 발생"); }
    finally { setTimeout(() => { setIsUploading(false); setUploadProgress({ current: 0, total: 0, skipped: 0 }); abortUploadRef.current = false; }, 1000); }
  };

  const handleFileUpload = async (e) => {
      setIsProcessingFiles(true); await new Promise(resolve => setTimeout(resolve, 100));
      try {
          const fileList = e.target.files;
          const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
          if (files.length === 0) { showNotification("유효한 이미지 파일이 없습니다."); return; }
          setPendingFiles(files);
          setFileFilters({ include: '', exclude: '', startDate: '' });
          setUploadSettings(prev => ({ ...prev, game: '리니지', year: new Date().getFullYear().toString() }));
          setIsUploadModalOpen(true); setIsSettingsOpen(false);
      } catch (err) { showNotification("파일을 불러오는 중 오류가 발생했습니다."); }
      finally { setIsProcessingFiles(false); e.target.value = ''; }
  };

  const handleFolderUpload = async (e) => {
    setIsProcessingFiles(true); await new Promise(resolve => setTimeout(resolve, 100));
    try {
        const fileList = e.target.files;
        const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) { showNotification("유효한 이미지 파일이 없습니다."); return; }
        setPendingFiles(files);
        setFileFilters({ include: '1180', exclude: 'old', startDate: '' });
        setUploadSettings(prev => ({ ...prev, game: '리니지', year: new Date().getFullYear().toString() }));
        setIsUploadModalOpen(true); setIsSettingsOpen(false);
    } catch (err) { showNotification("폴더를 불러오는 중 오류가 발생했습니다."); }
    finally { setIsProcessingFiles(false); e.target.value = ''; }
  };

  // File System Access API 기반 폴더 선택. 마지막 폴더는 IDB+localStorage에 저장.
  const FS_HANDLE_KEY = 'bannerCodex.lastFolder';
  const [lastFolderName, setLastFolderName] = useState(() => {
    try { return localStorage.getItem(FS_HANDLE_KEY + '.name') || ''; } catch { return ''; }
  });

  const loadFromDirectoryHandle = async (handle) => {
    setIsProcessingFiles(true);
    showNotification(`"${handle.name}" 폴더 스캔 중...`);
    try {
      const granted = await ensureReadPermission(handle);
      if (!granted) { showNotification('폴더 읽기 권한이 거부되었습니다.'); return; }
      const files = await collectImageFiles(handle, (n) => {
        if (n % 100 === 0) showNotification(`${n}개 발견...`);
      });
      if (files.length === 0) { showNotification('이미지 파일(jpg/jpeg/png/webp/gif)이 없습니다.'); return; }
      // 다음번을 위해 핸들 저장
      try {
        await saveDirectoryHandle(FS_HANDLE_KEY, handle);
        localStorage.setItem(FS_HANDLE_KEY + '.name', handle.name);
        setLastFolderName(handle.name);
      } catch (e) { console.warn('[BannerCodex] handle save failed', e); }

      setPendingFiles(files);
      setFileFilters({ include: '', exclude: '', startDate: '' });
      setUploadSettings(prev => ({ ...prev, game: '리니지', year: new Date().getFullYear().toString() }));
      setIsUploadModalOpen(true); setIsSettingsOpen(false);
      showNotification(`${files.length}개 이미지 로드 완료`);
    } catch (err) {
      console.error('[BannerCodex] folder pick failed', err);
      showNotification(`폴더 로드 실패: ${err.message || err}`);
    } finally { setIsProcessingFiles(false); }
  };

  const handlePickFolder = async () => {
    try {
      const handle = await pickDirectory();
      await loadFromDirectoryHandle(handle);
    } catch (e) {
      if (e.name === 'AbortError') return; // 사용자 취소
      console.error(e);
      showNotification(e.message || '폴더 선택 실패');
    }
  };

  const handleReopenLastFolder = async () => {
    try {
      const handle = await loadDirectoryHandle(FS_HANDLE_KEY);
      if (!handle) { showNotification('저장된 폴더가 없습니다.'); setLastFolderName(''); return; }
      await loadFromDirectoryHandle(handle);
    } catch (e) {
      console.error(e);
      showNotification(`마지막 폴더 열기 실패: ${e.message || e}`);
    }
  };

  const handleForgetLastFolder = async () => {
    try { await clearDirectoryHandle(FS_HANDLE_KEY); } catch {}
    try { localStorage.removeItem(FS_HANDLE_KEY + '.name'); } catch {}
    setLastFolderName('');
    showNotification('저장된 폴더 정보를 지웠습니다.');
  };

  const handleLoadLibrary = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      e.target.value = '';
      setIsSettingsOpen(false);
      if (!db) {
          showNotification("Firebase가 초기화되지 않았습니다. .env 파일을 확인해주세요.");
          return;
      }
      if (!user) {
          showNotification("로그인 대기 중... (최대 8초)");
          const start = Date.now();
          while (!auth?.currentUser && Date.now() - start < 8000) {
              await delay(200);
          }
          if (!auth?.currentUser) {
              showNotification("로그인이 완료되지 않았습니다. 페이지를 새로고침한 후 잠시 기다려주세요.");
              return;
          }
      }
      setIsUploading(true);
      setUploadProgress({ current: 0, total: 1, skipped: 0 });
      showNotification("백업 파일을 읽는 중...");
      const reader = new FileReader();
      reader.onerror = () => {
          console.error('[BannerCodex restore] FileReader error', reader.error);
          showNotification("파일을 읽을 수 없습니다.");
          setUploadProgress({ current: 0, total: 0, skipped: 0 });
          setIsUploading(false);
      };
      reader.onload = async (event) => {
          try {
              const parsed = JSON.parse(event.target.result);
              const loadedBanners = Array.isArray(parsed)
                  ? parsed
                  : (Array.isArray(parsed?.banners) ? parsed.banners
                      : (Array.isArray(parsed?.data) ? parsed.data : null));
              if (!loadedBanners) {
                  console.error('[BannerCodex restore] Unrecognized format. Top-level keys:', parsed && typeof parsed === 'object' ? Object.keys(parsed) : typeof parsed);
                  showNotification("올바른 백업 파일 형식이 아닙니다. (배열 또는 {banners:[...]} 형식이어야 함)");
                  return;
              }
              if (loadedBanners.length === 0) { showNotification("백업 파일이 비어있습니다."); return; }
              const liveUser = auth?.currentUser;
              console.log(`[BannerCodex restore] Start: ${loadedBanners.length} items. User:`, liveUser ? `${liveUser.uid} (${liveUser.email || 'anonymous'})` : 'NULL');
              showNotification(`${loadedBanners.length}개 항목 복원 시작...`);
              setUploadProgress({ current: 0, total: loadedBanners.length, skipped: 0 });
              abortUploadRef.current = false; let count = 0; let skippedCount = 0;
              const existingKeys = new Set(banners.map(b => getUploadDuplicateKey(b.originalTitle || b.title, b.path)));
              let consecutiveFails = 0;
              for(let i = 0; i < loadedBanners.length; i++) {
                  const b = loadedBanners[i];
                  if (abortUploadRef.current) break;
                  if (b.path && String(b.path).toLowerCase().split(/[\\/]/).includes('old')) {
                      skippedCount++;
                      setUploadProgress({ current: i + 1, total: loadedBanners.length, skipped: skippedCount });
                      continue;
                  }
                  const { id, ...data } = b;
                  const dataKey = getUploadDuplicateKey(data.originalTitle || data.title, data.path);
                  if (skipDuplicates && existingKeys.has(dataKey)) {
                      skippedCount++;
                      setUploadProgress({ current: i + 1, total: loadedBanners.length, skipped: skippedCount });
                      if (i % 20 === 0) await delay(10);
                      continue;
                  }
                  try {
                      existingKeys.add(dataKey);
                      if (i === 0 || i % 10 === 0) console.log(`[BannerCodex restore] Uploading item ${i + 1}/${loadedBanners.length}: "${data.title || data.originalTitle || '(untitled)'}"`);
                      await addBannerToCloud(data);
                      count++;
                      consecutiveFails = 0;
                  } catch (uploadErr) {
                      console.error(`[BannerCodex restore] Item ${i + 1} failed:`, uploadErr);
                      skippedCount++;
                      consecutiveFails++;
                      if (consecutiveFails >= 3) {
                          console.error('[BannerCodex restore] 3 consecutive failures - aborting. Likely Firestore Rules issue or auth problem.');
                          showNotification(`연속 3건 실패로 중단합니다. 콘솔(F12)을 확인하세요. (실패 사유: ${uploadErr.message || uploadErr})`);
                          break;
                      }
                  }
                  setUploadProgress({ current: i + 1, total: loadedBanners.length, skipped: skippedCount });
              }
              if (abortUploadRef.current) showNotification("복원이 취소되었습니다.");
              else if (count === 0 && skippedCount > 0) showNotification(`모든 데이터가 이미 존재하거나 스킵되었습니다. (${skippedCount}개)`);
              else showNotification(`총 ${loadedBanners.length}개 중 ${count}개 복원 완료 (스킵 ${skippedCount})`);
          } catch (err) {
              console.error('[BannerCodex restore] Parse/restore error', err);
              showNotification(`파일 파싱 중 오류: ${err.message || err}`);
          }
          finally { setTimeout(() => { setUploadProgress({ current: 0, total: 0, skipped: 0 }); setIsUploading(false); abortUploadRef.current = false; }, 1000); }
      };
      reader.readAsText(file);
  };

  const handleOpenDuplicateManager = () => {
      setIsProcessingFiles(true); showNotification("중복 데이터 검색 중...");
      setTimeout(() => {
          const groups = {};
          banners.forEach(b => {
              const key = getSmartDuplicateKey(b);
              if (!groups[key]) groups[key] = [];
              groups[key].push(b);
          });
          const dupes = Object.values(groups).filter(group => group.length > 1);
          if (dupes.length === 0) { showNotification("중복된 데이터가 없습니다."); setIsProcessingFiles(false); setIsSettingsOpen(false); return; }
          const initialToDelete = [];
          dupes.forEach(group => {
              group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              for (let i = 1; i < group.length; i++) initialToDelete.push(group[i].id);
          });
          setDuplicateGroups(dupes); setDuplicateIdsToDelete(initialToDelete); setIsProcessingFiles(false); setIsSettingsOpen(false); setIsDuplicateModalOpen(true);
      }, 500);
  };

  const toggleDuplicateSelection = (id) => setDuplicateIdsToDelete(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);

  const processDuplicateDeletion = async () => {
      if (duplicateIdsToDelete.length === 0) { setIsDuplicateModalOpen(false); return; }
      setIsDuplicateModalOpen(false); showNotification(`${duplicateIdsToDelete.length}개의 데이터를 삭제합니다...`);
      try {
          const chunk_size = 5;
          for (let i = 0; i < duplicateIdsToDelete.length; i += chunk_size) {
              const chunk = duplicateIdsToDelete.slice(i, i + chunk_size);
              await Promise.all(chunk.map(id => deleteBannerFromCloud(id)));
              await delay(WRITE_DELAY_MS);
          }
          showNotification(`${duplicateIdsToDelete.length}개의 데이터가 삭제되었습니다.`);
      } catch(e) { showNotification("데이터 삭제 중 오류가 발생했습니다."); }
  };

  const handleSaveLibrary = async () => {
      if (banners.length === 0) { showNotification("백업할 데이터가 없습니다."); return; }
      setIsSaving(true); showNotification(`총 ${banners.length}개의 항목 백업 중... (이미지 포함)`);
      try {
          const backupData = []; const chunk_size = 5;
          for (let i = 0; i < banners.length; i += chunk_size) {
              const chunk = banners.slice(i, i + chunk_size);
              const processedChunk = await Promise.all(chunk.map(async (b) => {
                  const bannerCopy = { ...b };
                  if (bannerCopy.imageId && db) {
                      try {
                          const imgDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'banner_images', bannerCopy.imageId));
                          if (imgDoc.exists()) { const imgData = imgDoc.data(); bannerCopy.preview = imgData.original || imgData.thumbnail; }
                      } catch (e) {}
                  }
                  return bannerCopy;
              }));
              backupData.push(...processedChunk);
          }
          const dataStr = JSON.stringify(backupData, null, 2);
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
          a.download = `banner_archive_backup_${new Date().toISOString().slice(0,10)}.json`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          showNotification("백업 파일(이미지 포함)이 생성되었습니다.");
      } catch (err) { showNotification("백업 중 오류가 발생했습니다."); }
      finally { setIsSaving(false); setIsSettingsOpen(false); }
  };

  useEffect(() => {
    let results = activeCategory === 'temp' ? [...tempBanners] : [...banners];
    if (isSearching) setTimeout(() => setIsSearching(false), 800);
    if (isAiSearchMode) {
        if (aiSearchIds !== null) results = results.filter(b => aiSearchIds.includes(b.id));
    } else {
        if (searchQuery.trim() !== '') {
            const queryNoSpace = searchQuery.replace(/\s+/g, '').toLowerCase();
            results = results.filter(b => {
                const titleNoSpace = (b.title || '').replace(/\s+/g, '').toLowerCase();
                const pathNoSpace = (b.path || '').replace(/\s+/g, '').toLowerCase();
                const tagsMatch = b.tags?.some(t => (t || '').replace(/\s+/g, '').toLowerCase().includes(queryNoSpace));
                return titleNoSpace.includes(queryNoSpace) || pathNoSpace.includes(queryNoSpace) || tagsMatch;
            });
        }
    }
    if (activeCategory === 'favorites') results = results.filter(b => b.liked);
    else if (activeCategory === 'cart') results = results.filter(b => cartIds.includes(b.id));
    else if (activeCategory !== 'all' && activeCategory !== 'temp') {
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
    results.sort((a, b) => {
        if (activeCategory === 'all' && sortOrder === 'newest') { if (a.featured && !b.featured) return -1; if (!a.featured && b.featured) return 1; }
        if (sortOrder === 'newest') return getDateValue(b) - getDateValue(a);
        else if (sortOrder === 'oldest') return getDateValue(a) - getDateValue(b);
        else if (sortOrder === 'popular') return (b.liked === a.liked ? 0 : b.liked ? 1 : -1);
        else if (sortOrder === 'score') return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
        else if (sortOrder === 'name') return (a.originalTitle || a.title || '').localeCompare(b.originalTitle || b.title || '');
        return 0;
    });
    setFilteredBanners(results);
  }, [searchQuery, banners, tempBanners, activeCategory, sortOrder, filters, selectedIds, cartIds, isAiSearchMode, aiSearchIds]);

  const isChildContextActive = useMemo(() => searchQuery, [searchQuery]);

  const getScoreLabel = (key) => {
      const map = {
          impression: '첫인상 / 주목도', concept: '콘셉트 전달력', layout: '레이아웃 균형', typography: '타이포그래피',
          color: '컬러 완성도', readability: '정보 가독성', brand: '브랜드 적합성', flow: '시선 흐름',
          detail: '완성도 / 디테일', conversion: '클릭/전환 가능성'
      };
      return map[key.toLowerCase()] || key;
  };

  const getFinalScore100 = (banner) => {
      const aiBase100 = banner?.aiScore != null
          ? Math.round(parseFloat(banner.aiScore) * 10)
          : Math.round(parseFloat(banner?.score || 0) * 10) - parseInt(banner?.manualScoreAdj || 0);
      return Math.min(99, Math.max(0, aiBase100 + parseInt(banner?.manualScoreAdj || 0)));
  };

  const renderGameItem = (gameKey) => {
      const displayGameName = gameNameMap[gameKey] || gameKey;
      const gameBannerCount = banners.filter(b => b.game === displayGameName).length;
      const isActiveGame = activeCategory === displayGameName || (gameNameMap[activeCategory] === displayGameName);
      return (
          <button key={gameKey} onClick={(e) => { e.stopPropagation(); handleGameClick(gameKey); }} className={`w-full flex items-center justify-between py-1.5 px-2 transition-all group ${isActiveGame ? 'bg-[#0eb9b3]/10 rounded-lg' : ''}`}>
              <div className="flex items-center gap-2.5 pl-1.5">
                  <span onClick={(e) => togglePinGame(displayGameName, e)} className={`cursor-pointer flex items-center justify-center w-5 h-5 transition-colors`}>
                      {pinnedGames.includes(displayGameName) ? (
                          <Star className={`w-4 h-4 transition-colors ${isActiveGame ? 'text-[#0eb9b3] fill-[#0eb9b3]' : isLightMode ? 'text-slate-400 fill-slate-400 hover:text-slate-500' : 'text-zinc-500 fill-zinc-500 hover:text-zinc-400'}`} />
                      ) : (
                          <Star className={`w-4 h-4 ${isLightMode ? 'text-slate-300 hover:text-slate-400' : 'text-zinc-600 hover:text-zinc-500'}`} />
                      )}
                  </span>
                  <span className={`capitalize text-[13px] font-medium leading-none transition-colors ${isActiveGame ? 'text-[#0eb9b3] font-bold' : isLightMode ? 'text-slate-600 group-hover:text-slate-900' : 'text-zinc-400 group-hover:text-white'}`}>
                      {displayGameName}
                  </span>
              </div>
              {gameBannerCount > 0 && (
                  <span className={`text-[11px] font-bold mr-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                      {gameBannerCount}
                  </span>
              )}
          </button>
      );
  };

  return (
    <div
        className={`flex h-screen font-sans overflow-hidden selection:bg-[#0eb9b3]/30 ${isLightMode ? 'bg-[#f8f9fa] text-slate-900' : 'bg-[#0c0c0e] text-zinc-300'}`}
        onDragOver={handleGlobalDragOver}
        onDragEnter={handleGlobalDragEnter}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
    >
      <style>{`
        .font-banner { font-family: 'Teko', sans-serif; font-weight: 300; letter-spacing: 0.5px; }
        .font-codex { font-family: 'Teko', sans-serif; font-weight: 600; letter-spacing: 0.5px; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(150, 150, 150, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(150, 150, 150, 0.5); }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(150, 150, 150, 0.3) transparent; }
        input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #6b8af0; cursor: pointer; }
        input[type=range]::-moz-range-thumb { height: 16px; width: 16px; border-radius: 50%; background: #6b8af0; cursor: pointer; border: none; }
      `}</style>

      {isDraggingOverGlobal && (
        <div className="fixed inset-0 bg-[#0c0c0e]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 pointer-events-none">
            <div className="w-full max-w-2xl h-96 border-4 border-dashed border-violet-500/50 rounded-[40px] flex flex-col items-center justify-center bg-violet-500/10 animate-in zoom-in-95 duration-200 shadow-2xl">
                <div className="w-24 h-24 bg-violet-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <Upload className="w-10 h-10 text-violet-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">이미지 파일을 이곳에 놓으세요</h2>
                <p className="text-zinc-400 text-center">임시 평가 폴더가 생성되며 즉시 디자인 평가를 시작할 수 있습니다.<br/>(새로고침 시 임시 파일은 삭제됩니다)</p>
            </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <aside
          onClick={handleSidebarClick}
          className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-[width] duration-300 ease-in-out cursor-default md:relative
            ${isSidebarOpen ? 'translate-x-0 w-[190px]' : '-translate-x-full md:translate-x-0'}
            ${isDesktopSidebarOpen ? 'md:w-[190px]' : 'md:w-20'}
            ${isLightMode ? 'bg-white border-r border-slate-200' : 'bg-[#111] border-r border-white/5'}
          `}
      >
        <div className={`flex items-center h-[60px] shrink-0 transition-all duration-300 ${isDesktopSidebarOpen ? 'pl-[18px] pr-4' : 'justify-center'}`}>
           <div className="flex justify-center shrink-0">
               <button onClick={(e) => { e.stopPropagation(); setIsDesktopSidebarOpen(prev => !prev); }} className={`transition-colors p-1.5 -ml-1.5 rounded-lg ${isLightMode ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title={isDesktopSidebarOpen ? "메뉴 접기" : "메뉴 펼치기"}>
                   <Menu className="w-5 h-5" strokeWidth={1.5} />
               </button>
           </div>
            <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }} className={`md:hidden absolute right-4 ${isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-500 hover:text-white'}`}><X className="w-5 h-5" strokeWidth={1.5} /></button>
        </div>

        <div className="relative flex-1 flex flex-col h-full overflow-hidden">
            <nav className={`flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-6`}>
               <div className="space-y-1 w-full">
                <button onClick={(e) => { e.stopPropagation(); handleGameClick('all'); }} className={`w-full flex items-center py-3 transition-all group ${isDesktopSidebarOpen ? 'pl-5 pr-4 justify-start' : 'justify-center'} ${activeCategory === 'all' ? 'bg-[#0eb9b3]/10 text-[#0eb9b3]' : isLightMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
                    <div className="flex items-center justify-center shrink-0 w-5 h-5"><LayoutGrid className="w-[18px] h-[18px]" strokeWidth={1.5} /></div>
                    <div className={`overflow-hidden transition-all duration-300 flex items-center justify-between ${isDesktopSidebarOpen ? 'w-full opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                        <span className="whitespace-nowrap text-[13px] font-medium leading-none">전체 보기</span>
                        {banners.length > 0 && <span className={`text-[11px] font-bold leading-none ${activeCategory === 'all' ? 'text-[#0eb9b3]' : isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{banners.length}</span>}
                    </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleGameClick('favorites'); }} className={`w-full flex items-center py-3 transition-all group ${isDesktopSidebarOpen ? 'pl-5 pr-4 justify-start' : 'justify-center'} ${activeCategory === 'favorites' ? 'bg-[#0eb9b3]/10 text-[#0eb9b3]' : isLightMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
                    <div className="flex items-center justify-center shrink-0 w-5 h-5"><Heart className="w-[18px] h-[18px]" strokeWidth={1.5} /></div>
                    <div className={`overflow-hidden transition-all duration-300 flex items-center justify-between ${isDesktopSidebarOpen ? 'w-full opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                        <span className="whitespace-nowrap text-[13px] font-medium leading-none">좋아요</span>
                        {banners.filter(b => b.liked).length > 0 && <span className={`text-[11px] font-bold leading-none ${activeCategory === 'favorites' ? 'text-[#0eb9b3]' : isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{banners.filter(b => b.liked).length}</span>}
                    </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleGameClick('cart'); }} className={`w-full flex items-center py-3 transition-all group ${isDesktopSidebarOpen ? 'pl-5 pr-4 justify-start' : 'justify-center'} ${activeCategory === 'cart' ? 'bg-[#0eb9b3]/10 text-[#0eb9b3]' : isLightMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
                    <div className="flex items-center justify-center shrink-0 w-5 h-5"><Layers className="w-[18px] h-[18px]" strokeWidth={1.5} /></div>
                    <div className={`overflow-hidden transition-all duration-300 flex items-center justify-between ${isDesktopSidebarOpen ? 'w-full opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                        <span className="whitespace-nowrap text-[13px] font-medium leading-none">담기</span>
                        {cartIds.length > 0 && <span className={`text-[11px] font-bold leading-none ${activeCategory === 'cart' ? 'text-[#0eb9b3]' : isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{cartIds.length}</span>}
                    </div>
                </button>

                {tempBanners.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); handleGameClick('temp'); }} className={`w-full flex items-center py-3 mt-1 transition-all group ${isDesktopSidebarOpen ? 'pl-5 pr-4 justify-start' : 'justify-center'} ${activeCategory === 'temp' ? 'bg-violet-500/10 text-violet-500' : isLightMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
                        <div className="flex items-center justify-center shrink-0 w-5 h-5 relative"><Zap className="w-[18px] h-[18px]" strokeWidth={1.5} /></div>
                        <div className={`overflow-hidden transition-all duration-300 flex items-center justify-between ${isDesktopSidebarOpen ? 'w-full opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
                            <span className="whitespace-nowrap text-[13px] font-medium leading-none">임시 평가</span>
                            <span className="text-[10px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-full leading-none">{tempBanners.length}</span>
                        </div>
                    </button>
                )}

                {isDesktopSidebarOpen && (
                    <>
                        <div className={`pt-2 mt-2 w-full mx-auto ${isLightMode ? 'border-t border-slate-200' : 'border-t border-white/5'}`}></div>
                        <div className="px-3 py-2 space-y-6">
                            <div>
                                <h4 className={`text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Pinned</h4>
                                <div className="space-y-1">
                                    {pinnedGames.length > 0 ? pinnedGames.map(game => renderGameItem(game)) : (
                                        <div className={`text-[10px] ml-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>게임 옆의 별을 눌러 고정하세요</div>
                                    )}
                                </div>
                            </div>
                            {recentGames.length > 0 && (
                                <div>
                                    <h4 className={`text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Recent</h4>
                                    <div className="space-y-1">{recentGames.map(game => renderGameItem(game))}</div>
                                </div>
                            )}
                            <div>
                                <h4 className={`text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>All Games</h4>
                                <button onClick={(e) => { e.stopPropagation(); setIsAllGamesModalOpen(true); }} className={`w-full flex items-center py-2 px-1 text-[13px] font-medium transition-colors ${isLightMode ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white'}`}>
                                    전체 게임 보기
                                </button>
                            </div>
                        </div>
                    </>
                )}
              </div>
            </nav>

            {isAllGamesModalOpen && (
                <div className={`absolute inset-0 z-20 flex flex-col animate-in fade-in slide-in-from-bottom-2 ${isLightMode ? 'bg-white' : 'bg-[#111]'}`}>
                    <div className={`flex items-center justify-between p-4 border-b ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
                        <h3 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>전체 게임</h3>
                        <button onClick={(e) => { e.stopPropagation(); setIsAllGamesModalOpen(false); }} className={`p-1.5 rounded-lg transition-colors ${isLightMode ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400'}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {availableGames.length > 0 ? availableGames.map(game => renderGameItem(game)) : (
                            <div className="text-xs text-center py-8 text-zinc-500">등록된 게임이 없습니다.</div>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className={`w-full pt-4 pb-10 flex transition-all duration-300 ${isDesktopSidebarOpen ? 'flex-row items-center justify-center gap-6' : 'flex-col items-center gap-6'} ${isLightMode ? 'bg-white' : 'bg-[#111]'}`}>
            <div className="relative" ref={settingsRef}>
                <button onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); setIsThemeMenuOpen(false); }} className={`p-1.5 rounded-lg transition-colors ${isSettingsOpen ? (isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-zinc-800 text-white') : (isLightMode ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800')}`}>
                    <Settings className="w-4 h-4" strokeWidth={1.5} />
                </button>
                {isSettingsOpen && (
                    <div className={`absolute bottom-full mb-3 w-56 rounded-xl shadow-xl p-2 z-[100] animate-in slide-in-from-bottom-2 duration-200 border ${isDesktopSidebarOpen ? 'left-0' : 'left-full ml-4'} ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e1e1e] border-white/5'}`}>
                        <div className="flex flex-col gap-1">
                            {!isAdmin && (
                                <div className={`px-3 py-3 text-xs ${isLightMode ? 'text-slate-500' : 'text-zinc-500'} text-center`}>
                                    설정 항목이 없습니다.
                                </div>
                            )}
                            {isAdmin && (
                                <>
                                    <div className="px-2 pb-2">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-500'} flex items-center gap-1`}><BrainCircuit className="w-3 h-3" /> Gemini API Key</label>
                                        <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="Gemini API Key 입력" className={`w-full border rounded-md px-2 py-1.5 text-xs mb-1.5 focus:border-[#0eb9b3] focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500'}`} />
                                        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 mt-3 ${isLightMode ? 'text-violet-500' : 'text-violet-400'} flex items-center gap-1`}><Sparkles className="w-3 h-3" /> OpenAI API Key <span className="text-[8px] font-normal opacity-70">(Cross-Check)</span></label>
                                        <input type="password" value={openAiApiKey} onChange={(e) => setOpenAiApiKey(e.target.value)} placeholder="ChatGPT (선택사항)" className={`w-full border rounded-md px-2 py-1.5 text-xs focus:border-violet-500 focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600'}`} />
                                        <p className={`text-[9px] mt-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>입력 시 두 AI의 평가 평균값을 사용합니다.</p>
                                    </div>
                                    <div className={`h-px w-full my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
                                    <button onClick={(e) => { e.stopPropagation(); handleSaveLibrary(); }} disabled={isSaving} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                                        <Save className="w-4 h-4 shrink-0" /> <span>데이터 내보내기</span>
                                    </button>
                                    <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                                        <FileJson className="w-4 h-4 shrink-0" /> <span>데이터 가져오기</span> <input type="file" accept=".json" className="hidden" onChange={handleLoadLibrary} />
                                    </label>
                                    <div className={`h-px w-full my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingPromptText(customAiPrompt || DEFAULT_AI_PROMPT); setIsPromptManagerOpen(true); setIsSettingsOpen(false); }} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'text-[#0eb9b3] hover:bg-slate-100' : 'text-[#0eb9b3] hover:bg-white/5'}`}>
                                        <FileText className="w-4 h-4 shrink-0" /> <span className="font-bold">AI 평가 프롬프트 관리</span>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setIsLogoManagerOpen(true); setIsSettingsOpen(false); }} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                                        <ImageIcon className="w-4 h-4 shrink-0" /> <span>로고 관리</span>
                                    </button>
                                    <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                                        <FolderPlus className="w-4 h-4 shrink-0" /> <span>폴더 추가</span> <input type="file" webkitdirectory="true" directory="" multiple className="hidden" onChange={handleFolderUpload} disabled={isUploading} />
                                    </label>
                                    <button onClick={(e) => { e.stopPropagation(); handlePickFolder(); }} disabled={isUploading || isProcessingFiles} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                                        <FolderOpen className="w-4 h-4 shrink-0" /> <span>폴더 선택 (Z:\, 네트워크)</span>
                                    </button>
                                    {lastFolderName && (
                                      <div className="flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleReopenLastFolder(); }} disabled={isUploading || isProcessingFiles} className={`flex-1 flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/5 text-zinc-500'}`} title={`마지막 폴더 다시 열기: ${lastFolderName}`}>
                                          <RefreshCw className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">↺ {lastFolderName}</span>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleForgetLastFolder(); }} className={`p-2 rounded-lg ${isLightMode ? 'text-slate-400 hover:text-red-500 hover:bg-slate-100' : 'text-zinc-500 hover:text-red-400 hover:bg-white/5'}`} title="기억 지우기">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                    <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                                        <Upload className="w-4 h-4 shrink-0" /> <span>파일 추가</span> <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                    </label>
                                    <div className={`h-px w-full my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
                                    <button onClick={(e) => { e.stopPropagation(); setSkipDuplicates(!skipDuplicates); }} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                                        <div className="flex items-center gap-3"><CheckSquare className={`w-4 h-4 shrink-0 ${skipDuplicates ? 'text-[#0eb9b3]' : ''}`} /><span className={skipDuplicates ? 'text-[#0eb9b3] font-bold' : ''}>중복 방지</span></div>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenDuplicateManager(); }} disabled={isProcessingFiles} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-red-50 text-red-500' : 'hover:bg-red-500/10 text-red-500'}`}>
                                        <Trash2 className="w-4 h-4 shrink-0" /> <span>중복 데이터 정리</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="relative" ref={themeRef}>
                <button onClick={(e) => { e.stopPropagation(); setIsThemeMenuOpen(!isThemeMenuOpen); setIsSettingsOpen(false); }} className={`p-1.5 rounded-lg transition-colors ${isThemeMenuOpen ? (isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-zinc-800 text-white') : (isLightMode ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800')}`}>
                    {themeSetting === 'light' ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : themeSetting === 'dark' ? <Moon className="w-4 h-4" strokeWidth={1.5} /> : <Monitor className="w-4 h-4" strokeWidth={1.5} />}
                </button>
                {isThemeMenuOpen && (
                    <div className={`absolute bottom-full mb-3 w-32 rounded-xl shadow-xl p-1.5 z-[100] animate-in slide-in-from-bottom-2 duration-200 border ${isDesktopSidebarOpen ? 'right-0' : 'left-full ml-4'} ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e1e1e] border-white/5'}`}>
                        <button onClick={() => { setThemeSetting('light'); setIsThemeMenuOpen(false); }} className={`flex items-center gap-3 w-full p-2 rounded-lg text-xs font-medium transition-colors ${themeSetting === 'light' ? (isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-white/10 text-white') : (isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-400 hover:bg-white/5 hover:text-white')}`}><Sun className="w-4 h-4" /> Light</button>
                        <button onClick={() => { setThemeSetting('dark'); setIsThemeMenuOpen(false); }} className={`flex items-center gap-3 w-full p-2 rounded-lg text-xs font-medium transition-colors ${themeSetting === 'dark' ? (isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-white/10 text-white') : (isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-400 hover:bg-white/5 hover:text-white')}`}><Moon className="w-4 h-4" /> Dark</button>
                        <button onClick={() => { setThemeSetting('system'); setIsThemeMenuOpen(false); }} className={`flex items-center gap-3 w-full p-2 rounded-lg text-xs font-medium transition-colors ${themeSetting === 'system' ? (isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-white/10 text-white') : (isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-400 hover:bg-white/5 hover:text-white')}`}><Monitor className="w-4 h-4" /> System</button>
                    </div>
                )}
            </div>
        </div>
      </aside>

      {isPromptManagerOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4 sm:p-8 animate-in fade-in" onClick={() => setIsPromptManagerOpen(false)}>
              <div className={`w-full max-w-4xl h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-zinc-800'}`} onClick={e => e.stopPropagation()}>
                  <div className={`flex items-center justify-between p-5 border-b ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-[#111]'}`}>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0eb9b3]/10 flex items-center justify-center"><FileText className="w-5 h-5 text-[#0eb9b3]" /></div>
                          <div>
                              <h3 className={`text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>AI 평가 프롬프트 관리</h3>
                              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>클라우드에 저장되어 모든 사용자에게 실시간 반영됩니다.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsPromptManagerOpen(false)} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}><X className="w-5 h-5" /></button>
                  </div>
                  <div className={`p-4 border-b flex flex-wrap items-center gap-3 ${isLightMode ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-[#0c0c0e]'}`}>
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${isLightMode ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}>
                          <Upload className="w-4 h-4" /> .txt 파일에서 불러오기
                          <input type="file" accept=".txt" className="hidden" onChange={handlePromptFileUpload} />
                      </label>
                      <button onClick={handlePromptFileDownload} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${isLightMode ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}>
                          <Download className="w-4 h-4" /> .txt 파일로 내보내기
                      </button>
                      <button onClick={() => setEditingPromptText(DEFAULT_AI_PROMPT)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${isLightMode ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-red-400 border-red-900/50 hover:bg-red-900/20'}`}>
                          <RotateCcw className="w-4 h-4" /> 기본값으로 초기화
                      </button>
                      <div className="flex-1"></div>
                      <div className={`text-[10px] px-3 py-1.5 rounded-md ${isLightMode ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                          💡 <span className="font-mono font-bold">{"{{LEARNING_CONTEXT}}"}</span> 문구를 삽입하면 그 위치에 사용자의 학습(코멘트) 데이터가 자동으로 들어갑니다.
                      </div>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden">
                      <textarea value={editingPromptText} onChange={(e) => setEditingPromptText(e.target.value)} className={`w-full h-full p-4 rounded-xl text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#0eb9b3]/50 transition-all custom-scrollbar ${isLightMode ? 'bg-slate-50 border border-slate-300 text-slate-800' : 'bg-black border border-zinc-800 text-zinc-300'}`} spellCheck="false" />
                  </div>
                  <div className={`p-5 border-t flex justify-end gap-3 ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-[#111]'}`}>
                      <button onClick={() => setIsPromptManagerOpen(false)} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors border ${isLightMode ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>취소</button>
                      <button onClick={handleSavePrompt} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#0eb9b3] hover:bg-[#39d4ce] text-white shadow-lg shadow-[#0eb9b3]/20 flex items-center gap-2 transition-all">
                          <Save className="w-4 h-4" /> 클라우드에 저장 적용
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isLogoManagerOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4 sm:p-8 animate-in fade-in" onClick={() => setIsLogoManagerOpen(false)}>
              <div className={`w-full max-w-2xl h-[80vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-zinc-800'}`} onClick={e => e.stopPropagation()}>
                  <div className={`flex items-center justify-between p-5 border-b ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-[#111]'}`}>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0eb9b3]/10 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-[#0eb9b3]" /></div>
                          <div>
                              <h3 className={`text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>로고 관리</h3>
                              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>사이드바에 표시될 각 게임별 로고를 설정합니다.</p>
                          </div>
                      </div>
                      <button onClick={() => setIsLogoManagerOpen(false)} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-8">
                      <div>
                          <h4 className={`text-sm font-bold mb-4 uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>게임별 로고 설정</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {availableGames.map(game => (
                                  <div key={game} className={`flex items-center justify-between p-3 rounded-xl border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-black border-zinc-800'}`}>
                                      <div className="flex items-center gap-3">
                                          <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-700'}`}>
                                              {gameLogos[game] ? <img src={gameLogos[game]} alt={game} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-zinc-500">{game.substring(0,1)}</span>}
                                          </div>
                                          <span className={`text-sm font-bold ${isLightMode ? 'text-slate-800' : 'text-zinc-300'}`}>{game}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <label className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${isLightMode ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`} title="로고 업로드">
                                              <Upload className="w-4 h-4" />
                                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpdateLogo(game, e.target.files[0])} />
                                          </label>
                                          {gameLogos[game] && (
                                              <button onClick={() => handleRemoveLogo(game)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-red-500/20 text-red-500 hover:bg-red-500/10" title="로고 삭제">
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className={`p-5 border-t flex justify-end gap-3 ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-[#111]'}`}>
                      <button onClick={() => setIsLogoManagerOpen(false)} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors border ${isLightMode ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>닫기</button>
                  </div>
              </div>
          </div>
      )}

      {isUploadModalOpen && (
          <div className="fixed inset-0 bg-[#0c0c0e]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white">업로드 설정</h3>
                      <button onClick={() => { setIsUploadModalOpen(false); setPendingFiles([]); }} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="text-sm text-zinc-400">
                      탐색된 <span className="text-white font-bold">{pendingFiles.length}</span>개의 파일 중<br/>
                      <span className="text-[#0eb9b3] font-bold text-base">{filteredPendingFiles.length}</span>개를 업로드합니다.
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">게임 선택</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['리니지', '리니지M', '리니지2M'].map(g => (
                                  <button key={g} onClick={() => { setUploadSettings(p => ({ ...p, game: g })); setIsAddingNewGame(false); }} className={`px-3 py-2 rounded-lg text-xs font-medium border ${uploadSettings.game === g ? 'bg-[#0c0c0e] text-[#0eb9b3] border-[#0eb9b3]' : 'bg-[#0c0c0e] text-zinc-400 border-zinc-800'}`}>{g}</button>
                              ))}
                              <button onClick={() => setIsAddingNewGame(!isAddingNewGame)} className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 col-span-3 ${isAddingNewGame ? 'bg-[#0c0c0e] text-[#0eb9b3] border-[#0eb9b3]' : 'bg-[#0c0c0e] text-zinc-400 border-zinc-800'}`}>{isAddingNewGame ? '취소' : '+ 다른 게임 직접 추가'}</button>
                          </div>
                          {isAddingNewGame && (
                            <div className="mt-2 animate-in slide-in-from-top-1">
                                <input type="text" placeholder="새 게임 이름 입력" value={newGameName} onChange={(e) => { setNewGameName(e.target.value); setUploadSettings(p => ({ ...p, game: e.target.value })); }} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-[#0eb9b3] focus:outline-none" />
                            </div>
                          )}
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">연도 설정</label>
                          <select className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-[#0eb9b3] focus:outline-none focus:border-[#0eb9b3]" value={uploadSettings.year} onChange={(e) => setUploadSettings(p => ({ ...p, year: e.target.value }))}>
                              {[0, 1, 2, 3, 4].map(i => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}년</option> })}
                          </select>
                      </div>
                      <div className="pt-3 border-t border-zinc-800">
                          <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">파일 필터링 (경로/파일명)</label>
                          <div className="space-y-3">
                              <div>
                                  <label className={`flex items-center gap-1.5 text-[10px] font-bold mb-1 ${isLightMode ? 'text-[#0b948f]' : 'text-[#0eb9b3]'}`}>
                                      <Plus className="w-3 h-3" /> 포함 키워드 <span className="font-normal opacity-70">(쉼표로 다중 입력)</span>
                                  </label>
                                  <input type="text" placeholder="예: 1180, banner" value={fileFilters.include} onChange={(e) => setFileFilters(p => ({...p, include: e.target.value}))} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0eb9b3] placeholder:text-slate-400' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3] placeholder:text-zinc-600'}`} />
                              </div>
                              <div>
                                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 mb-1">
                                      <MinusSquare className="w-3 h-3" /> 제외 키워드 <span className="font-normal opacity-70">(쉼표로 다중 입력)</span>
                                  </label>
                                  <input type="text" placeholder="예: old, draft" value={fileFilters.exclude} onChange={(e) => setFileFilters(p => ({...p, exclude: e.target.value}))} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-red-500 placeholder:text-slate-400' : 'bg-zinc-900 border-zinc-700 text-white focus:border-red-500 placeholder:text-zinc-600'}`} />
                              </div>
                              <div className={`flex items-center justify-between gap-2 pt-2 border-t ${isLightMode ? 'border-slate-200' : 'border-zinc-800'}`}>
                                  <label className={`flex items-center gap-1.5 text-[10px] font-bold whitespace-nowrap ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>
                                      <Calendar className="w-3 h-3" /> 이후 날짜만 업로드:
                                  </label>
                                  <input type="date" value={fileFilters.startDate} onChange={(e) => setFileFilters(p => ({...p, startDate: e.target.value}))} className={`w-[140px] border rounded-lg px-2 py-1.5 text-xs focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0eb9b3]' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3] [color-scheme:dark]'}`} />
                              </div>
                          </div>
                      </div>
                      <div className="pt-2">
                          <label onClick={() => setSkipDuplicates(!skipDuplicates)} className="flex items-center gap-2 cursor-pointer group w-max">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${skipDuplicates ? 'bg-[#0eb9b3] border-[#0eb9b3]' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                                  {skipDuplicates && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">중복 데이터 건너뛰기</span>
                          </label>
                      </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                      <button onClick={() => { setIsUploadModalOpen(false); setPendingFiles([]); }} className="flex-1 py-3 rounded-lg text-xs font-bold text-zinc-400 border border-zinc-700 hover:text-white hover:bg-zinc-800 transition-colors">취소</button>
                      <button onClick={confirmUpload} className="flex-[2] border border-zinc-700 hover:border-[#0eb9b3] text-[#0eb9b3] hover:text-[#39d4ce] py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors"><Upload className="w-4 h-4" /> 업로드 시작</button>
                  </div>
              </div>
          </div>
      )}

      {isDuplicateModalOpen && (
          <div className="fixed inset-0 bg-[#0c0c0e]/95 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in">
              <div className={`w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#050505] border-zinc-800'}`}>
                  <div className={`p-6 border-b flex justify-between items-center ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-white/5'}`}>
                      <div>
                          <h2 className={`text-xl font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}><Trash2 className="w-6 h-6 text-red-500" /> 중복 데이터 정리</h2>
                          <p className={`text-sm mt-1 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>가장 최근에 생성된 배너가 <span className="text-[#0eb9b3] font-bold">원본(Keep)</span>으로 설정됩니다.</p>
                      </div>
                      <button onClick={() => setIsDuplicateModalOpen(false)} className={`p-2 rounded-full transition-colors ${isLightMode ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}><X className="w-6 h-6" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                      {duplicateGroups.map((group, groupIdx) => (
                          <div key={groupIdx} className={`space-y-4 p-6 rounded-2xl border ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0c0c0e] border-white/5'}`}>
                              <h3 className="text-sm font-bold flex items-center gap-2">
                                  <span className="bg-[#0eb9b3]/20 px-2 py-0.5 rounded text-[#0eb9b3]">{group[0].game}</span>
                                  <span className={isLightMode ? 'text-slate-900' : 'text-white'}>
                                      {group[0].ocrProcessed && group[0].title !== '제목 없음'
                                          ? `${group[0].title} (${group[0].date || group[0].year})`
                                          : safeRender(group[0].originalTitle)}
                                  </span>
                                  {group[0].ocrProcessed && <span className="px-1.5 py-0.5 ml-1 text-[9px] border border-violet-500/50 text-violet-400 rounded-sm">AI 판단</span>}
                                  <span className={`text-xs ml-2 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>({group.length}개)</span>
                              </h3>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                  {group.map(banner => <DuplicateItem key={banner.id} banner={banner} isToDelete={duplicateIdsToDelete.includes(banner.id)} onToggle={toggleDuplicateSelection} db={db} appId={appId} isLightMode={isLightMode} />)}
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className={`p-6 border-t flex justify-end gap-3 ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-white/5'}`}>
                      <button onClick={() => setIsDuplicateModalOpen(false)} className={`py-3 px-6 rounded-xl text-sm font-bold transition-colors ${isLightMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'}`}>취소</button>
                      <button onClick={processDuplicateDeletion} className="py-3 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"><Trash2 className="w-4 h-4" /> 선택 {duplicateIdsToDelete.length}개 삭제</button>
                  </div>
              </div>
          </div>
      )}

      {isBatchEditModalOpen && (
          <div className="fixed inset-0 bg-[#0c0c0e]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-[#0eb9b3]" /><h3 className="text-base font-bold text-white">{selectedIds.length > 1 ? '속성 일괄 변경' : '속성 변경'}</h3></div>
                      <button onClick={() => setIsBatchEditModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>
                  </div>
                  <div className="bg-[#0eb9b3]/10 border border-[#0eb9b3]/20 rounded-lg p-2.5 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#0eb9b3] shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                          <p className="text-xs text-[#9ef2ef] font-bold">{selectedIds.length > 1 ? `${selectedIds.length}개 항목 선택됨` : '1개 항목 선택됨'}</p>
                          <p className="text-[10px] text-zinc-400">{selectedIds.length > 1 ? '선택한 모든 배너의 속성을 한 번에 변경합니다. 변경하지 않을 항목은 그대로 두세요.' : '배너의 속성 및 경로를 변경합니다. 변경하지 않을 항목은 그대로 두세요.'}</p>
                      </div>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">게임명 변경</label>
                              <button onClick={() => setBatchForm(prev => ({ ...prev, isCustomGame: !prev.isCustomGame, game: prev.isCustomGame ? 'mixed' : '', customGame: '' }))} className="text-[10px] text-[#0eb9b3] hover:text-[#39d4ce] transition-colors">{batchForm.isCustomGame ? '목록에서 선택' : '직접 입력'}</button>
                          </div>
                          {batchForm.isCustomGame ? (
                              <input type="text" value={batchForm.customGame} onChange={(e) => setBatchForm(prev => ({ ...prev, customGame: e.target.value }))} placeholder="새로운 게임 이름 입력" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-[#0eb9b3] focus:outline-none placeholder:text-zinc-600" />
                          ) : (
                              <select value={batchForm.game} onChange={(e) => setBatchForm(prev => ({ ...prev, game: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-[#0eb9b3] focus:outline-none appearance-none">
                                  {batchForm.game === 'mixed' && <option value="mixed">여러 게임 혼합 (변경 안 함)</option>}
                                  <option value="">변경 안 함 (기존 유지)</option>
                                  {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                          )}
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">연도 변경</label>
                          <select value={batchForm.year} onChange={(e) => setBatchForm(prev => ({ ...prev, year: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-[#0eb9b3] focus:outline-none appearance-none">
                              {batchForm.year === 'mixed' && <option value="mixed">여러 연도 혼합 (변경 안 함)</option>}
                              <option value="">변경 안 함 (기존 유지)</option>
                              {[0, 1, 2, 3, 4, 5].map(i => { const y = new Date().getFullYear() - i + 1; return y.toString(); }).map(y => <option key={y} value={y}>{y}년</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">디렉토리 경로 일괄 변경 (옵션)</label>
                          <input type="text" value={batchForm.path} onChange={(e) => setBatchForm(prev => ({ ...prev, path: e.target.value }))} placeholder="예: \\\\ppc-file\\... (비워두면 자동 생성)" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-[#0eb9b3] focus:outline-none placeholder:text-zinc-600" />
                          <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">입력 시 선택된 모든 항목의 경로가 해당 텍스트로 <span className="text-white">강제 덮어쓰기</span> 됩니다.</p>
                      </div>
                  </div>
                  <div className="pt-1 flex gap-2">
                      <button onClick={() => setIsBatchEditModalOpen(false)} className="flex-1 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">취소</button>
                      <button onClick={handleBatchSave} className="flex-1 bg-[#0b948f] hover:bg-[#0eb9b3] text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-[#086663]/20 transition-all flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> {selectedIds.length > 1 ? '일괄 적용' : '적용'}</button>
                  </div>
              </div>
          </div>
      )}

      <main className={`flex-1 flex flex-col relative overflow-hidden ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0c0c0e]'}`}>
        <header className={`flex flex-col z-40 shrink-0 sticky top-0 transition-colors duration-300 ${isLightMode ? 'bg-white border-b border-slate-200' : 'bg-[#0c0c0e] border-b border-white/5'}`}>
          <div className="px-4 md:px-8 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className={`md:hidden ${isLightMode ? 'text-slate-400 hover:text-slate-900' : 'text-zinc-400 hover:text-white'}`}>
                    <Menu className="w-6 h-6" strokeWidth={1.5} />
                </button>
                <div className="flex items-center gap-1.5 relative h-full pt-1">
                    <span className={`flex items-baseline ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                        <h1 className="app-title text-2xl tracking-wide flex items-baseline gap-1.5 text-white"><span className="font-light">Banner</span> <span className="font-semibold">Codex</span></h1>
                        <span className="text-[11px] font-bold text-[#0eb9b3] ml-2 tracking-normal font-sans opacity-90 translate-y-[2px]">v3.0</span>
                    </span>
                </div>
            </div>
            <div className="relative group w-full max-w-md ml-auto">
                <div className={`absolute inset-0 rounded-lg transition-colors ${isAiSearchMode ? 'bg-violet-500/10 ring-1 ring-violet-500/50' : 'bg-transparent'}`}></div>
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-10 ${isAiSearchMode ? 'text-violet-400' : isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                    {isAiSearchMode ? <Bot className="w-4 h-4" /> : <Search className="w-4 h-4" strokeWidth={1.5} />}
                </div>
                <input type="text" placeholder={isAiSearchMode ? "AI에게 물어보세요... (예: 붉은 색감의 배너)" : "검색..."} className={`w-full pl-10 pr-24 py-1.5 border rounded-lg focus:outline-none text-sm transition-colors relative z-0 ${isLightMode ? 'bg-white text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 text-white placeholder:text-zinc-600'} ${isAiSearchMode ? 'border-violet-500/50 focus:border-violet-500 placeholder:text-violet-500/30' : isLightMode ? 'border-slate-300 focus:border-[#0eb9b3]' : 'border-zinc-800 focus:border-[#0eb9b3]'}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} disabled={isSearching} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                    {isSearching && <Loader2 className="w-4 h-4 animate-spin text-violet-500 mr-1" />}
                    {searchQuery && !isSearching && <button onClick={() => { setSearchQuery(''); setAiSearchIds(null); }} className={`p-1 rounded-full hover:bg-black/10 transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-white'}`}><X className="w-3.5 h-3.5" strokeWidth={1.5} /></button>}
                    <div className={`w-px h-3 mx-1 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-700'}`}></div>
                    <button onClick={() => setIsAiSearchMode(!isAiSearchMode)} className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all text-xs font-bold ${isAiSearchMode ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : isLightMode ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`} title="AI 의미 검색"><span>AI</span></button>
                </div>
            </div>
            {user && <div className="w-8 h-8 rounded-full bg-[#0b948f]/20 border border-[#0eb9b3]/30 flex items-center justify-center text-xs font-bold text-[#0eb9b3] select-none ml-3">{user.email?.[0].toUpperCase() || 'U'}</div>}
          </div>
        </header>

        <div className={`flex-none relative z-40 px-4 md:px-8 border-b transition-all duration-300 ${isScrolled ? 'max-h-0 opacity-0 py-0 border-transparent overflow-hidden' : 'max-h-[120px] opacity-100 py-4 overflow-visible ' + (isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-white/5')}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                    <h2 className="text-sm md:text-base flex items-center gap-2">
                        {activeCategory !== 'all' && <span className={`${isChildContextActive ? (isLightMode ? 'text-slate-500' : 'text-zinc-500') + ' font-normal' : (isLightMode ? 'text-slate-900' : 'text-white') + ' font-bold'}`}>{getCategoryDisplayName()}</span>}
                        {activeCategory !== 'all' && isChildContextActive && <span className={isLightMode ? 'text-slate-400' : 'text-zinc-700'}>/</span>}
                        {searchQuery && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[13px] font-bold ${isAiSearchMode ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-[#0eb9b3]/20 border-[#0eb9b3]/50 text-[#39d4ce]'}`}>
                                    {isAiSearchMode && <Sparkles className="w-3.5 h-3.5 mr-1" />}<span>{isAiSearchMode ? "AI 검색: " : "#"}{searchQuery}</span>
                                    <button onClick={() => { setSearchQuery(''); setAiSearchIds(null); }} className={`transition-colors ${isAiSearchMode ? 'hover:text-violet-200' : 'hover:text-[#9ef2ef]'}`}><X className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        )}
                    </h2>
                    {isAdminMode && (
                        <button onClick={handleSelectAll} className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isAllSelected ? (isLightMode ? 'text-white bg-slate-700 border-slate-600' : 'text-white bg-zinc-700 border-zinc-600') : (isLightMode ? 'text-slate-500 border-slate-300 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800')}`}>
                            {isAllSelected ? <MinusSquare className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}<span>{isAllSelected ? '선택 해제' : '전체 선택'}</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors relative ${filters.quality !== 'all' || filters.year !== 'all' || filters.ocr !== 'all' || filters.assetType !== 'all' || filters.tag !== 'all' || filters.game !== 'all' ? 'text-[#0eb9b3] hover:bg-[#0eb9b3]/10' : (isLightMode ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800')}`}>
                            <Filter className="w-4 h-4" />{(filters.quality !== 'all' || filters.year !== 'all' || filters.ocr !== 'all' || filters.assetType !== 'all' || filters.tag !== 'all' || filters.game !== 'all') && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0eb9b3] ring-1 ring-[#0c0c0e]"></span>}
                        </button>
                        {isFilterMenuOpen && (
                            <div ref={filterMenuRef} className={`absolute right-0 top-full mt-2 w-[340px] md:w-[400px] border rounded-xl shadow-2xl z-[100] flex flex-col p-5 animate-in fade-in slide-in-from-top-2 duration-200 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                                <div className="flex items-center justify-between mb-5">
                                    <h4 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>필터</h4>
                                    <button onClick={() => { setFilters({ assetType: 'all', year: 'all', customStart: '', customEnd: '', quality: 'all', tag: 'all', game: 'all', creator: 'all', ocr: 'all' }); }} className={`text-[11px] px-2 py-1 rounded border transition-colors ${isLightMode ? 'border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>초기화</button>
                                </div>
                                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>캠페인 목적 (에셋 타입)</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[{ label: '전체', value: 'all' }, { label: '브랜드웹', value: '브랜드웹' }, { label: '프로모션', value: '프로모션' }, { label: '배너', value: '배너' }].map(opt => (
                                                <button key={opt.value} onClick={() => setFilters(prev => ({ ...prev, assetType: opt.value }))} className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${filters.assetType === opt.value ? 'bg-[#0eb9b3]/20 text-[#39d4ce] border-[#0eb9b3]/40' : isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}>{opt.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>제작 년도</label>
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            {['all', '2026', '2025', '2024'].map(y => (
                                                <button key={y} onClick={() => setFilters(prev => ({ ...prev, year: y }))} className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${filters.year === y ? 'bg-[#0eb9b3]/20 text-[#39d4ce] border-[#0eb9b3]/40' : isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}>{y === 'all' ? '전체' : y}</button>
                                            ))}
                                            <button onClick={() => setFilters(prev => ({ ...prev, year: 'custom' }))} className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${filters.year === 'custom' ? 'bg-[#0eb9b3]/20 text-[#39d4ce] border-[#0eb9b3]/40' : isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}>직접 선택</button>
                                        </div>
                                        {filters.year === 'custom' && (
                                            <div className="flex gap-2 mt-2 animate-in slide-in-from-top-1">
                                                <input type="date" value={filters.customStart} onChange={(e) => setFilters(prev => ({ ...prev, customStart: e.target.value }))} className={`flex-1 text-[10px] px-2 py-1.5 rounded border focus:border-[#0eb9b3] outline-none ${isLightMode ? 'bg-white text-slate-900 border-slate-300' : 'bg-zinc-900 text-white border-zinc-700 [color-scheme:dark]'}`} />
                                                <input type="date" value={filters.customEnd} onChange={(e) => setFilters(prev => ({ ...prev, customEnd: e.target.value }))} className={`flex-1 text-[10px] px-2 py-1.5 rounded border focus:border-[#0eb9b3] outline-none ${isLightMode ? 'bg-white text-slate-900 border-slate-300' : 'bg-zinc-900 text-white border-zinc-700 [color-scheme:dark]'}`} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>디자인 품질</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[{ label: '전체', value: 'all' }, { label: '대표 사례 (8.7 이상)', value: '8.7_up' }, { label: '우수 (8.2~8.6)', value: '8.2_8.6' }, { label: '양호 (7.5~7.9)', value: '7.5_7.9' }, { label: '개선 필요 (7.5 미만)', value: '7.5_down' }].map(opt => (
                                                <button key={opt.value} onClick={() => setFilters(prev => ({ ...prev, quality: opt.value }))} className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${filters.quality === opt.value ? 'bg-[#0eb9b3]/20 text-[#39d4ce] border-[#0eb9b3]/40' : (isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700')}`}>{opt.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>스타일 태그 (Top 5)</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            <button onClick={() => setFilters(prev => ({ ...prev, tag: 'all' }))} className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${filters.tag === 'all' ? 'bg-[#0eb9b3]/20 text-[#39d4ce] border-[#0eb9b3]/40' : (isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700')}`}>전체</button>
                                            {topTags.map(tag => (
                                                <button key={tag} onClick={() => setFilters(prev => ({ ...prev, tag }))} className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${filters.tag === tag ? 'bg-[#0eb9b3]/20 text-[#39d4ce] border-[#0eb9b3]/40' : (isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700')}`}>#{tag}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`pt-4 border-t ${isLightMode ? 'border-slate-200' : 'border-zinc-800'}`}>
                                        <button onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)} className={`flex items-center justify-between w-full text-[11px] font-bold uppercase tracking-wider transition-colors ${isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                            <span>고급 필터</span>
                                            {isAdvancedFilterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        {isAdvancedFilterOpen && (
                                            <div className="pt-5 space-y-5 animate-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>게임 / IP</label>
                                                    <select value={filters.game} onChange={(e) => setFilters(prev => ({ ...prev, game: e.target.value }))} className={`w-full text-xs border rounded-lg px-2.5 py-2 pr-8 focus:border-[#0eb9b3] focus:outline-none appearance-none ${isLightMode ? 'bg-slate-50 text-slate-900 border-slate-200' : 'bg-zinc-900 text-white border-zinc-700'}`}>
                                                        <option value="all">전체</option>
                                                        {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
                                                    </select>
                                                </div>
                                                {isAdminMode && (
                                                    <>
                                                        <div className="space-y-2">
                                                            <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>제작자</label>
                                                            <select value={filters.creator} onChange={(e) => setFilters(prev => ({ ...prev, creator: e.target.value }))} className={`w-full text-xs border rounded-lg px-2.5 py-2 pr-8 focus:border-[#0eb9b3] focus:outline-none appearance-none ${isLightMode ? 'bg-slate-50 text-slate-900 border-slate-200' : 'bg-zinc-900 text-white border-zinc-700'}`}>
                                                                <option value="all">전체</option>
                                                                <option value="내부">내부</option>
                                                                <option value="외주">외주</option>
                                                                <option value="담당자명">담당자명</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>AI 분석 상태</label>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {[{ label: '전체', value: 'all' }, { label: '완료', value: 'done' }, { label: '대기', value: 'pending' }].map(opt => (
                                                                    <button key={opt.value} onClick={() => setFilters(prev => ({ ...prev, ocr: opt.value }))} className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${filters.ocr === opt.value ? 'bg-violet-500/20 text-violet-400 border-violet-500/40' : isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}>{opt.label}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => { setGridSize(prev => prev === 'small' ? 'medium' : prev === 'medium' ? 'large' : 'small'); }} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="크기 변경">
                        {gridSize === 'small' ? <Grip className="w-4 h-4" /> : gridSize === 'medium' ? <LayoutGrid className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <div className="relative">
                        <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className={`flex items-center gap-1.5 px-2 h-8 rounded-lg transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="정렬"><ArrowUpDown className="w-4 h-4" /></button>
                        {isSortMenuOpen && (
                            <div className={`absolute right-0 top-full mt-2 w-32 border rounded-lg shadow-xl z-[100] flex flex-col py-1 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                                <button onClick={() => { setSortOrder('newest'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-xs ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-zinc-800'} ${sortOrder === 'newest' ? 'text-[#0eb9b3] font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>최신순</button>
                                <button onClick={() => { setSortOrder('oldest'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-xs ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-zinc-800'} ${sortOrder === 'oldest' ? 'text-[#0eb9b3] font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>오래된순</button>
                                <button onClick={() => { setSortOrder('popular'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-xs ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-zinc-800'} ${sortOrder === 'popular' ? 'text-[#0eb9b3] font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>인기순</button>
                                <button onClick={() => { setSortOrder('score'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-xs ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-zinc-800'} ${sortOrder === 'score' ? 'text-[#0eb9b3] font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>평가순</button>
                                <button onClick={() => { setSortOrder('name'); setIsSortMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-xs ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-zinc-800'} ${sortOrder === 'name' ? 'text-[#0eb9b3] font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>이름순</button>
                            </div>
                        )}
                    </div>
                    <span className={`text-xs font-mono flex items-center justify-center min-w-[40px] h-8 gap-1 select-none ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}><span className="text-[#0eb9b3] font-bold">{filteredBanners.length}</span></span>
                </div>
            </div>
        </div>

        {!isSearching && (
            isLoadingData && banners.length === 0 && tempBanners.length === 0 ? (
                <div className={`flex-1 flex items-center justify-center ${isLightMode ? 'bg-slate-50' : 'bg-[#0c0c0e]'}`}><Loader2 className="w-8 h-8 text-[#0eb9b3] animate-spin" /></div>
            ) : filteredBanners.length === 0 ? (
                <div className={`flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300 ${isLightMode ? 'bg-[#f8f9fa] text-slate-500' : 'bg-[#0c0c0e] text-zinc-500'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
                        {activeCategory === 'temp' ? <Zap className="w-8 h-8 opacity-50" /> : <FolderOpen className="w-8 h-8 opacity-50" />}
                    </div>
                    <p className="text-sm font-medium">표시할 배너가 없습니다.</p>
                    {activeCategory === 'temp' && <p className="text-xs">파일을 화면에 드래그하여 추가하세요.</p>}
                </div>
            ) : (
                <VirtualGrid items={filteredBanners} gridSize={gridSize} isLoading={isLoadingData} isLightMode={isLightMode} onScrollChange={setIsScrolled} resetTrigger={`${activeCategory}-${searchQuery}`}
                    renderItem={(banner) => (
                        <BannerCard banner={banner} db={db} appId={appId} selected={selectedIds.includes(banner.id)} toggleSelection={toggleSelection} onOpenPreview={handleOpenPreview} onCopyPath={handleCopyPathGrid} isProcessing={processingBannerId === banner.id} isAdminMode={isAdminMode} isLightMode={isLightMode} isLastViewed={lastViewedId === banner.id} isInCart={cartIds.includes(banner.id)} onToggleCart={handleToggleCart} />
                    )}
                />
            )
        )}

        {selectedIds.length > 0 && activeView === 'grid' && (isAdminMode || activeCategory === 'temp') && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center p-1.5 border rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in ${isLightMode ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-[#1c1c1e] border-zinc-800/50 shadow-black/50'}`}>
            <div className={`flex items-center justify-center min-w-[40px] px-2 h-10 rounded-xl text-[#0eb9b3] font-bold text-base mr-1.5 shadow-inner ${isLightMode ? 'bg-slate-100' : 'bg-zinc-900'}`}>
                {selectedIds.length}
            </div>
            <div className={`flex items-center rounded-xl h-10 border backdrop-blur-md ${isLightMode ? 'bg-slate-100/50 border-slate-200' : 'bg-[#2c2c2e]/50 border-white/5'}`}>
                <button onClick={() => handleOpenBatchEdit()} className={`w-11 h-10 flex items-center justify-center transition-colors rounded-l-xl ${isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`} title="속성 일괄 변경">
                    <Edit3 className="w-4 h-4" />
                </button>
                <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
                {activeCategory === 'cart' ? (
                    <button onClick={handleRemoveFromCart} className={`w-11 h-10 flex items-center justify-center transition-colors ${isLightMode ? 'text-slate-600 hover:bg-slate-200/50' : 'text-zinc-400 hover:bg-zinc-700/50'}`} title="선택한 항목 빼기">
                        <MinusSquare className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={handleAddToCart} className={`w-11 h-10 flex items-center justify-center transition-colors ${isLightMode ? 'text-[#0b948f] hover:bg-[#0eb9b3]/10' : 'text-[#39d4ce] hover:bg-[#0eb9b3]/20'}`} title="선택한 항목 담기">
                        <Layers className="w-4 h-4" />
                    </button>
                )}
                <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
                <button onClick={handleResetAI} disabled={isBatchProcessing} className={`w-11 h-10 flex items-center justify-center transition-colors ${isBatchProcessing ? 'opacity-50 cursor-not-allowed' : isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`} title="AI 분석 결과 초기화">
                    <RotateCcw className="w-4 h-4" />
                </button>
                <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
                <button onClick={() => setOcrProgress({ isOpen: true, status: 'confirm', current: 0, total: selectedIds.length, target: '' })} className={`w-11 h-10 flex items-center justify-center transition-colors group ${isLightMode ? 'hover:bg-slate-200/50' : 'hover:bg-zinc-700/50'}`} title="일괄 AI 분석">
                    <Sparkles className="w-4 h-4 text-violet-400 group-hover:text-violet-500 transition-colors" />
                </button>
                <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
                <button onClick={() => setIsDeleteModalOpen(true)} className={`w-11 h-10 flex items-center justify-center transition-colors ${isLightMode ? 'text-red-500 hover:bg-red-50' : 'text-red-500 hover:bg-red-900/20'}`} title="선택 항목 삭제">
                    <Trash2 className="w-4 h-4" />
                </button>
                <div className={`w-px h-4 ${isLightMode ? 'bg-slate-300' : 'bg-zinc-600'}`}></div>
                <button onClick={() => setSelectedIds([])} className={`w-11 h-10 flex items-center justify-center transition-colors rounded-r-xl ${isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}`} title="선택 취소">
                    <X className="w-4 h-4" />
                </button>
            </div>
          </div>
        )}

        {isDeleteModalOpen && (() => {
            const allTempSelected = selectedIds.length > 0 && selectedIds.every(id => id.startsWith('temp_'));
            return (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setIsDeleteModalOpen(false)}>
                  <div className={`w-full max-w-sm p-6 rounded-xl border shadow-2xl ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-zinc-800'}`} onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col items-center gap-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2"><Trash2 className="w-6 h-6" /></div>
                          <h3 className={`text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>삭제 확인</h3>
                          <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>선택한 {selectedIds.length}개의 항목을 삭제하시겠습니까?<br/>{!allTempSelected && '삭제하려면 비밀번호를 입력하세요.'}</p>
                          {!allTempSelected && (
                              <input type="password" placeholder="비밀번호 입력" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConfirmDelete()} className={`w-full text-center px-4 py-3 rounded-lg border text-sm focus:outline-none focus:border-red-500 transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'}`} autoFocus />
                          )}
                          <div className="flex gap-3 w-full mt-2">
                              <button onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); }} className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-colors ${isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}>취소</button>
                              <button onClick={handleConfirmDelete} className="flex-1 py-3 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20">삭제</button>
                          </div>
                      </div>
                  </div>
              </div>
            );
        })()}

        {isResetModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setIsResetModalOpen(false)}>
              <div className={`w-full max-w-sm p-6 rounded-xl border shadow-2xl ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-zinc-800'}`} onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2"><RotateCcw className="w-6 h-6" /></div>
                      <h3 className={`text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>AI 데이터 초기화</h3>
                      <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>선택한 <span className="font-bold text-yellow-500">{selectedIds.length}개</span> 배너의 AI 분석 데이터를 초기화하시겠습니까?<br/><span className="text-xs text-yellow-500/80 mt-1 block">(점수, 태그, 추출된 텍스트가 지워집니다)</span></p>
                      <div className="flex gap-3 w-full mt-4">
                          <button onClick={() => setIsResetModalOpen(false)} className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-colors ${isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}>취소</button>
                          <button onClick={executeResetAI} className="flex-1 py-3 rounded-lg text-sm font-bold bg-yellow-500 hover:bg-yellow-600 text-white transition-colors shadow-lg shadow-yellow-500/20">초기화 진행</button>
                      </div>
                  </div>
              </div>
          </div>
        )}

        {ocrProgress.isOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={() => { if (ocrProgress.status === 'confirm') setOcrProgress(prev => ({...prev, isOpen: false})); }}>
                <div className={`w-full max-w-sm rounded-3xl p-8 flex flex-col items-center shadow-2xl border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-zinc-800'}`} onMouseDown={(e) => e.stopPropagation()}>
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full"></div>
                        {ocrProgress.status === 'processing' ? <Bot className="w-12 h-12 text-violet-500 animate-pulse relative z-10" /> : <Sparkles className="w-12 h-12 text-violet-500 relative z-10" />}
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                        {ocrProgress.status === 'processing' ? 'AI 분석 진행 중...' : '일괄 AI 분석'}
                    </h3>
                    {ocrProgress.status === 'processing' ? (
                        <>
                            <p className={`text-sm mb-2 text-center ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{ocrProgress.current} / {ocrProgress.total} 개 완료</p>
                            <p className={`text-xs font-mono w-full text-center truncate mb-6 px-4 py-2 rounded-lg ${isLightMode ? 'bg-slate-100 text-slate-600' : 'bg-zinc-900 text-zinc-500'}`}>{ocrProgress.target || '분석 준비 중...'}</p>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${isLightMode ? 'bg-slate-200' : 'bg-zinc-800'}`}>
                                <div className="h-full bg-violet-500 transition-all duration-300 ease-out" style={{ width: `${(ocrProgress.current / Math.max(1, ocrProgress.total)) * 100}%` }} />
                            </div>
                            <div className="w-full flex justify-between mt-2 mb-6">
                                <span className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>0%</span><span className="text-[10px] text-violet-500 font-bold">{Math.round((ocrProgress.current / Math.max(1, ocrProgress.total)) * 100)}%</span>
                            </div>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setOcrProgress(prev => ({ ...prev, isOpen: false }))} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors border ${isLightMode ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'}`}>창 숨기기</button>
                                <button onClick={handleCancelBatch} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 group border ${isLightMode ? 'bg-white border-red-200 text-red-500 hover:bg-red-50' : 'bg-zinc-900 border-red-900/50 text-red-400 hover:bg-red-900/30'}`}><X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />분석 중지</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className={`text-sm mb-6 text-center ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                                선택한 <span className="font-bold text-violet-500">{ocrProgress.total}개</span> 배너의 AI 분석을 시작하시겠습니까?<br/>
                                <span className="text-xs text-violet-500/80 mt-2 block">(대량 분석 시 다소 시간이 소요될 수 있습니다)</span>
                            </p>
                            <div className="flex w-full gap-3">
                                <button onClick={() => setOcrProgress(prev => ({ ...prev, isOpen: false }))} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors border ${isLightMode ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'}`}>취소</button>
                                <button onClick={runSelectedOCR} className="flex-1 py-3 rounded-xl text-sm font-bold bg-violet-500 hover:bg-violet-600 text-white transition-colors shadow-lg shadow-violet-500/20">분석 시작</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {isBatchProcessing && !ocrProgress.isOpen && (
            <button onClick={() => setOcrProgress(prev => ({ ...prev, isOpen: true }))} className="fixed bottom-6 left-6 z-[1000] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl bg-violet-600 hover:bg-violet-500 text-white transition-all animate-in slide-in-from-bottom-4 border border-violet-400/30 group" title="진행 상황 보기">
                <div className="relative flex items-center justify-center w-6 h-6"><Loader2 className="w-5 h-5 animate-spin text-white" /><div className="absolute inset-0 bg-white/20 rounded-full blur-md animate-pulse"></div></div>
                <div className="flex flex-col text-left"><span className="text-xs font-bold leading-tight">AI 분석 진행 중</span><span className="text-[10px] text-violet-200 leading-none mt-0.5">{ocrProgress.current} / {ocrProgress.total} 완료</span></div>
                <Maximize2 className="w-3.5 h-3.5 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
        )}

        {isUploading && uploadProgress.total > 0 && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className={`w-full max-w-sm rounded-2xl p-8 flex flex-col items-center shadow-2xl border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-zinc-800'}`}>
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-[#0eb9b3]/20 blur-xl rounded-full"></div>
                        <Loader2 className="w-12 h-12 text-[#0eb9b3] animate-spin relative z-10" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>데이터 처리 중...</h3>
                    <p className={`text-sm mb-1 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>잠시만 기다려주세요 ({uploadProgress.current} / {uploadProgress.total})</p>
                    {uploadProgress.skipped > 0 ? (
                        <p className="text-[#0eb9b3] text-xs mb-6 font-medium bg-[#0eb9b3]/10 px-3 py-1 rounded-full border border-[#0eb9b3]/20">✨ 중복 스킵: {uploadProgress.skipped}개</p>
                    ) : (<div className="mb-6"></div>)}
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isLightMode ? 'bg-slate-200' : 'bg-zinc-800'}`}>
                        <div className="h-full bg-[#0eb9b3] transition-all duration-300 ease-out" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                    </div>
                    <div className="w-full flex justify-between mt-2">
                        <span className={`text-[10px] ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>0%</span><span className="text-[10px] text-[#0eb9b3] font-bold">{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                    </div>
                    <button onClick={handleCancelUpload} className={`mt-6 px-6 py-2 rounded-full text-xs font-medium transition-colors flex items-center gap-2 group border ${isLightMode ? 'border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'bg-zinc-800 hover:bg-red-900/30 text-zinc-400 hover:text-red-400 border-zinc-700 hover:border-red-900/50'}`}>
                        <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />취소하기
                    </button>
                </div>
            </div>
        )}

        {isProcessingFiles && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className={`rounded-2xl p-8 flex flex-col items-center shadow-2xl border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-zinc-800'}`}>
                    <Loader2 className="w-12 h-12 text-[#0eb9b3] animate-spin mb-4" />
                    <h3 className={`text-xl font-bold mb-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>작업을 준비하는 중...</h3>
                    <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>대량의 데이터를 처리하고 있습니다. 잠시만 기다려주세요.</p>
                </div>
            </div>
        )}

        {notification && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 z-[2000] w-max ${isLightMode ? 'bg-white text-slate-900 border-slate-200 shadow-slate-200/50' : 'bg-zinc-900 text-white border-zinc-800'}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${isLightMode ? 'bg-[#0eb9b3]' : 'bg-white'}`} />
                <span className="text-sm font-medium">{typeof notification === 'string' ? notification : '알림'}</span>
            </div>
        )}

        {previewModalOpen && selectedBanner && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 sm:p-10 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { if(hasChanges || isEditingPreview){ if(confirm("변경사항을 취소하시겠습니까?")) { setPreviewModalOpen(false); setIsEditingPreview(false); } } else setPreviewModalOpen(false); }}>
                <button onClick={(e) => { e.stopPropagation(); if(hasChanges || isEditingPreview){ if(confirm("변경사항을 취소하시겠습니까?")) { setPreviewModalOpen(false); setIsEditingPreview(false); } } else setPreviewModalOpen(false); }} className={`absolute top-6 right-6 sm:top-8 sm:right-8 p-2.5 rounded-full transition-colors z-[600] border ${isLightMode ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white shadow-lg'}`}>
                    <X className="w-5 h-5" />
                </button>
                <div className={`w-full max-w-[1520px] flex rounded-[24px] overflow-hidden shadow-2xl relative ${isLightMode ? 'bg-white border border-slate-200' : 'bg-[#0c0c0e] border border-white/10'}`} style={{ height: '85vh', maxHeight: '750px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-black" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
                        <div className="absolute top-6 left-6 z-[510]">
                            <button onClick={handleDownloadImage} className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold border bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all">
                                <Download className="w-3.5 h-3.5" /> 이미지 저장
                            </button>
                        </div>
                        {highResImage ? (
                            <img src={highResImage} alt="Preview" style={{ transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomScale})`, cursor: isDragging ? 'grabbing' : 'grab', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }} className="max-w-full max-h-full object-contain pointer-events-none" />
                        ) : (
                            <Loader2 className="w-10 h-10 text-[#0eb9b3] animate-spin" />
                        )}
                        <div className="absolute bottom-6 right-6 flex items-center gap-3 z-[510] px-4 py-3 bg-[#111] border border-white/10 rounded-full shadow-2xl" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                            <span className="text-[13px] font-bold text-white w-10 text-center tracking-wider shrink-0">{Math.round(zoomScale * 100)}%</span>
                            <div className="relative flex items-center w-[120px] md:w-[150px] h-8 touch-none">
                                <div className="absolute inset-x-0 h-[8px] bg-[#333] rounded-full pointer-events-none"></div>
                                <input type="range" min="1" max="5" step="0.1" value={zoomScale} onChange={(e) => setZoomScale(parseFloat(e.target.value))} onWheel={(e) => { e.stopPropagation(); const scaleAdjust = e.deltaY * -0.002; setZoomScale(prev => Math.min(Math.max(1, prev + scaleAdjust), 5)); }} className="w-full h-full bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[24px] [&::-webkit-slider-thumb]:h-[24px] [&::-webkit-slider-thumb]:bg-[#7895c2] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-[24px] [&::-moz-range-thumb]:h-[24px] [&::-moz-range-thumb]:bg-[#7895c2] [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-lg active:[&::-webkit-slider-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-110 transition-all outline-none relative z-10" />
                            </div>
                        </div>

                        {isScorePopoverOpen && (() => {
                            const fixedOrder = ['impression', 'concept', 'layout', 'typography', 'color', 'readability', 'brand', 'flow', 'detail', 'conversion'];
                            const validScores = fixedOrder.map(k => editedBanner?.scores?.[k]?.score).filter(s => s != null).map(s => Math.round(s));
                            const maxScore = validScores.length > 0 ? Math.max(...validScores) : -1;
                            const minScore = validScores.length > 0 ? Math.min(...validScores) : 101;
                            return (
                               <div className="absolute inset-0 bg-black/75 backdrop-blur-lg z-[520] flex flex-col animate-in fade-in duration-300 text-white p-8 md:p-10 overflow-y-auto custom-scrollbar" onClick={() => setIsScorePopoverOpen(false)} onWheel={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onMouseMove={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
                                   <button onClick={() => setIsScorePopoverOpen(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm border border-white/20 z-10">
                                       <X className="w-4 h-4 text-white" />
                                   </button>
                                   <div className="mt-auto flex flex-col gap-5 w-full max-w-5xl mx-auto" onClick={e => e.stopPropagation()}>
                                       <div className="flex items-end justify-between shrink-0">
                                           <div>
                                               <h3 className="text-2xl font-bold text-white">AI 10대 지표 상세 평가</h3>
                                               <p className="text-zinc-400 text-[13px] mt-1.5">AI 모델이 분석한 디자인 세부 점수 및 의견입니다.</p>
                                           </div>
                                           <div className="text-right">
                                               <div className="text-zinc-400 text-[10px] font-bold mb-1 tracking-wider uppercase">최종 환산 점수</div>
                                               <div className="text-[72px] font-black text-[#0eb9b3] font-mono tracking-tighter drop-shadow-[0_4px_16px_rgba(14,185,179,0.3)] leading-none mt-2">
                                                   {getFinalScore100(editedBanner)}
                                               </div>
                                           </div>
                                       </div>
                                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2 shrink-0">
                                           {fixedOrder.map((key) => {
                                               const data = editedBanner?.scores?.[key];
                                               if (!data) return null;
                                               const isMissing = data.score == null;
                                               const scoreVal = isMissing ? null : Math.round(data.score);
                                               const isMax = !isMissing && validScores.length > 1 && scoreVal === maxScore && maxScore !== minScore;
                                               const isMin = !isMissing && validScores.length > 1 && scoreVal === minScore && maxScore !== minScore;
                                               const boxBgClass = isMissing
                                                   ? 'bg-zinc-900/40 border-dashed border-zinc-700/40 opacity-60'
                                                   : isMax ? 'bg-[#0eb9b3]/15 border-[#0eb9b3]/20 hover:bg-[#0eb9b3]/25'
                                                   : isMin ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                                                   : 'bg-black/40 border-white/[0.05] hover:bg-black/60';
                                               return (
                                                   <div key={key} className={`${boxBgClass} border rounded-lg px-4 py-2.5 transition-colors flex items-center gap-4 shadow-sm`}>
                                                       <div className="w-[110px] shrink-0 flex items-center justify-between">
                                                           <span className="text-[11px] text-zinc-300 font-medium">{getScoreLabel(key)}</span>
                                                           <span className={`text-lg font-mono font-bold leading-none ${isMissing ? 'text-zinc-600' : 'text-[#0eb9b3]'}`}>{isMissing ? '—' : scoreVal}</span>
                                                       </div>
                                                       <div className="w-px h-5 bg-white/10 shrink-0"></div>
                                                       <p className={`text-[11px] font-normal leading-tight break-keep flex-1 ${isMissing ? 'text-zinc-500 italic' : 'text-zinc-300'}`}>{data.reason}</p>
                                                   </div>
                                               );
                                           })}
                                       </div>
                                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
                                           <div className="bg-black/40 border border-white/[0.05] rounded-xl p-4 col-span-1 shadow-lg flex flex-col justify-start transition-all duration-300 self-start w-full">
                                               <button onClick={(e) => { e.stopPropagation(); setIsScoreAdjExpanded(!isScoreAdjExpanded); }} className="flex justify-between items-center w-full group cursor-pointer">
                                                   <label className="text-[13px] font-bold text-white flex items-center gap-2 group-hover:text-[#0eb9b3] transition-colors cursor-pointer pointer-events-none">
                                                       <Settings className="w-4 h-4 text-[#0eb9b3]" />
                                                       점수 보정
                                                       {isScoreAdjExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                                                   </label>
                                                   <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border pointer-events-none ${parseInt(editedBanner?.manualScoreAdj || 0) > 0 ? 'bg-[#0eb9b3]/20 text-[#0eb9b3] border-[#0eb9b3]/30' : parseInt(editedBanner?.manualScoreAdj || 0) < 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-zinc-300 border-white/10'}`}>
                                                       {parseInt(editedBanner?.manualScoreAdj || 0) > 0 ? '+' : ''}{parseInt(editedBanner?.manualScoreAdj || 0)}점
                                                   </span>
                                               </button>
                                               {isScoreAdjExpanded && (
                                                   <div className="flex items-center gap-2 px-1 mt-5 animate-in fade-in slide-in-from-top-2">
                                                       <button onClick={(e) => { e.stopPropagation(); handleEditChange('manualScoreAdj', Math.max(-3, parseInt(editedBanner?.manualScoreAdj || 0) - 1)); }} className="text-[16px] font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition-colors cursor-pointer">-</button>
                                                       <input type="range" min="-3" max="3" step="1" value={parseInt(editedBanner?.manualScoreAdj || 0)} onChange={(e) => handleEditChange('manualScoreAdj', parseInt(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none shadow-inner mx-2" style={{ background: `linear-gradient(to right, #ef4444 0%, #52525b 50%, #14b8a6 100%)` }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} />
                                                       <button onClick={(e) => { e.stopPropagation(); handleEditChange('manualScoreAdj', Math.min(3, parseInt(editedBanner?.manualScoreAdj || 0) + 1)); }} className="text-[16px] font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition-colors cursor-pointer">+</button>
                                                   </div>
                                               )}
                                           </div>
                                           <div className="bg-black/40 border border-white/[0.05] rounded-xl p-4 col-span-1 lg:col-span-2 flex flex-col shadow-lg">
                                               <label className="text-[13px] font-bold flex items-center gap-2 text-white mb-2"><Edit3 className="w-4 h-4 text-violet-400" /> AI 학습용 피드백 코멘트</label>
                                               <textarea value={editedBanner?.userComment || ''} onChange={(e) => handleEditChange('userComment', e.target.value)} placeholder="이 배너 디자인에 대한 평가 기준이나 피드백을 적어주세요. (입력 시 다음 AI 분석에 반영됩니다)" className="w-full flex-1 p-2.5 rounded-lg border border-white/10 bg-black/30 text-[11px] font-normal resize-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all text-white placeholder:text-zinc-500 custom-scrollbar min-h-[50px]" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} />
                                           </div>
                                       </div>
                                   </div>
                               </div>
                           );
                        })()}
                    </div>

                    <div className={`w-[340px] shrink-0 flex flex-col h-full shadow-2xl z-[510] relative ${isLightMode ? 'bg-white border-l border-slate-200' : 'bg-[#111111] border-l border-white/5'}`}>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-12 pb-24">
                            <div className="flex items-center gap-4 mb-8">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden border ${isLightMode ? 'bg-slate-50 border-slate-200 text-[#0eb9b3]' : 'bg-black border-zinc-800 text-white'}`}>
                                    {gameLogos[editedBanner?.game] ? (
                                        <img src={gameLogos[editedBanner?.game]} alt={editedBanner?.game} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold">{editedBanner?.game ? editedBanner.game.substring(0,1) : '기'}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isEditingPreview ? (
                                        <div className="space-y-2">
                                            <input type="text" value={editedBanner?.title || ''} onChange={(e) => handleEditChange('title', e.target.value)} className={`w-full text-base font-bold px-2 py-1.5 border rounded-lg focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-300 focus:border-[#0eb9b3] text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]'}`} placeholder="배너 제목" />
                                            <div className="flex gap-2">
                                                <select value={editedBanner?.game || ''} onChange={(e) => handleEditChange('game', e.target.value)} className={`w-1/2 text-xs px-2 py-1.5 border rounded-lg focus:outline-none transition-colors appearance-none ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
                                                    {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
                                                    {!availableGames.includes(editedBanner?.game) && <option value={editedBanner?.game}>{editedBanner?.game}</option>}
                                                </select>
                                                <input type="text" value={editedBanner?.year || ''} onChange={(e) => handleEditChange('year', e.target.value)} className={`w-1/4 text-xs px-2 py-1.5 border rounded-lg focus:outline-none transition-colors text-center ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]'}`} placeholder="연도" />
                                                <input type="text" value={editedBanner?.month || ''} onChange={(e) => handleEditChange('month', e.target.value)} className={`w-1/4 text-xs px-2 py-1.5 border rounded-lg focus:outline-none transition-colors text-center ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]'}`} placeholder="월" />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h2 className={`text-lg font-bold leading-tight mb-1.5 break-words pr-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`} title={safeRender(editedBanner?.title)}>{safeRender(editedBanner?.title)}</h2>
                                            <div className={`text-[11px] font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>{editedBanner?.year}년 {editedBanner?.month && `${editedBanner.month}월`}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-8">
                                {(isAdminMode || editedBanner?.isTemp) && (
                                    <button onClick={() => handleDeleteSingleBanner(editedBanner?.id)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`} title="삭제">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                {(isAdminMode || editedBanner?.isTemp) && (
                                    <button onClick={() => setIsEditingPreview(!isEditingPreview)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isEditingPreview ? 'bg-[#0eb9b3] text-white border-[#0eb9b3]' : isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`} title="속성 직접 편집">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={(e) => toggleLike(editedBanner?.id, e)} className={`flex items-center gap-1.5 h-10 px-4 rounded-full border text-[13px] font-bold transition-colors ${editedBanner?.liked ? 'border-red-500/50 text-red-400 bg-red-500/10' : isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                                    <Heart className={`w-4 h-4 ${editedBanner?.liked ? 'fill-current text-red-400' : ''}`} /> <span>{editedBanner?.liked ? '1' : '0'}</span>
                                </button>
                                <button onClick={() => handleToggleCart(editedBanner?.id)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${cartIds.includes(editedBanner?.id) ? 'border-[#0eb9b3]/50 text-[#0eb9b3] bg-[#0eb9b3]/10' : isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`} title="담기">
                                    <Layers className={`w-4 h-4 ${cartIds.includes(editedBanner?.id) ? 'fill-current' : ''}`} />
                                </button>
                                <div className="flex-1"></div>
                                {isAdminMode && (
                                    <button onClick={(e) => toggleFeature(editedBanner?.id, e)} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${editedBanner?.featured ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : isLightMode ? 'border-slate-200 text-slate-400 hover:bg-slate-50' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-white'}`} title="추천 배너 지정">
                                        <Star className={`w-4 h-4 ${editedBanner?.featured ? 'fill-current text-yellow-400' : ''}`} />
                                    </button>
                                )}
                            </div>

                            <div className="mb-8">
                                <div className={`text-[10px] font-bold mb-3 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>태그</div>
                                {isEditingPreview ? (
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            {editedBanner?.tags?.filter(tag => tag !== '기타').map((tag, idx) => (
                                                <span key={idx} className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1.5 border transition-colors ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                                                    #{tag}
                                                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} className={`flex-1 text-xs px-3 py-2 border rounded-lg focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-300 focus:border-[#0eb9b3] text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]'}`} placeholder="새 태그 입력 후 엔터" />
                                            <button onClick={handleAddTag} className="px-4 py-2 bg-[#0eb9b3] text-white text-xs font-bold rounded-lg hover:bg-[#39d4ce] transition-colors shadow-md shadow-[#0eb9b3]/20">추가</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {editedBanner?.game && editedBanner.game !== '기타' && (
                                            <span className={`px-3 py-1.5 text-[11px] font-bold rounded border ${isLightMode ? 'bg-[#0eb9b3]/10 border-[#0eb9b3]/30 text-[#0b948f]' : 'bg-[#0eb9b3]/20 border-[#0eb9b3]/50 text-[#39d4ce]'}`}>
                                                {editedBanner.game}
                                            </span>
                                        )}
                                        {editedBanner?.tags?.filter(tag => tag !== '기타').map((tag, idx) => (
                                            <span key={idx} className={`px-3 py-1.5 text-[11px] font-medium rounded border ${isLightMode ? 'bg-transparent border-slate-200 text-slate-600' : 'bg-transparent border-zinc-800 text-zinc-400'}`}>
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mb-8">
                                <div className={`text-[10px] font-bold mb-3 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{'>_ DIRECTORY PATH'}</div>
                                {isEditingPreview ? (
                                    <textarea value={editedBanner?.path || ''} onChange={(e) => handleEditChange('path', e.target.value)} className={`w-full text-xs font-mono p-3 border rounded-xl resize-none min-h-[80px] focus:outline-none focus:border-[#0eb9b3] transition-colors custom-scrollbar ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-zinc-300'}`} placeholder="디렉토리 경로 (ex: \\ppc-file\...)" />
                                ) : (
                                    <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors duration-300 ${isCopied ? 'bg-[#0eb9b3]/20 border-[#0eb9b3] text-[#0eb9b3]' : isLightMode ? 'bg-transparent border-slate-200 text-slate-600' : 'bg-transparent border-white/10 text-zinc-400'}`}>
                                        <div className="text-[11px] font-mono break-all whitespace-pre-wrap mr-2 flex-1 select-all">{editedBanner?.path || '경로 없음'}</div>
                                        <button onClick={() => handleCopyPathModal(editedBanner?.path)} className={`shrink-0 transition-colors ${isLightMode ? 'hover:text-slate-900' : 'hover:text-white'}`}>
                                            {isCopied ? <Check className="w-4 h-4 text-[#0eb9b3]" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="relative mt-4">
                                <button onClick={() => setIsScorePopoverOpen(true)} className={`w-full py-3 px-5 rounded-2xl border flex items-center justify-between transition-all group ${isLightMode ? 'bg-transparent border-slate-200 hover:border-[#0eb9b3] hover:bg-[#0eb9b3]/5' : 'bg-transparent border-white/10 hover:border-[#0eb9b3] hover:bg-[#0eb9b3]/5'}`}>
                                    <div className="flex items-center gap-2">
                                        <Bot className={`w-4 h-4 ${isLightMode ? 'text-slate-400 group-hover:text-[#0eb9b3]' : 'text-zinc-500 group-hover:text-[#0eb9b3]'}`} />
                                        <span className={`text-xs font-bold ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>AI 10대 지표 평가</span>
                                    </div>
                                    <div className="text-3xl font-black text-[#0eb9b3] font-mono tracking-tighter">
                                        {getFinalScore100(editedBanner)}
                                    </div>
                                </button>
                                {(isAdminMode || editedBanner?.isTemp) && (
                                    <div className="flex justify-end mt-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleSmartAnalysis(editedBanner, null, false); }} disabled={processingBannerId === editedBanner?.id} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${processingBannerId === editedBanner?.id ? 'bg-violet-500/20 text-violet-300 border-violet-500/30 cursor-not-allowed' : isLightMode ? 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100' : 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20'}`}>
                                            {processingBannerId === editedBanner?.id ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> 재분석 중...</>) : (<><Wand2 className="w-3.5 h-3.5" /> AI 재분석</>)}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`absolute right-6 z-[600] transition-all duration-300 ease-in-out ${hasChanges || isEditingPreview ? 'bottom-[92px]' : 'bottom-6'}`}>
                            <button onClick={() => setIsActionMenuOpen(!isActionMenuOpen)} className={`p-3 rounded-2xl transition-colors shadow-lg border ${isActionMenuOpen ? (isLightMode ? 'bg-slate-200 border-slate-300' : 'bg-zinc-800 border-zinc-700') : (isLightMode ? 'bg-white/80 backdrop-blur border-transparent hover:border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-[#1c1c1e]/80 backdrop-blur border-transparent hover:border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200')}`}>
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            {isActionMenuOpen && (
                                <div className={`absolute bottom-full right-0 mb-4 w-[210px] rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-white/5'}`}>
                                    <button onClick={() => { setIsActionMenuOpen(false); showNotification("Transmute Asset 요청이 전송되었습니다."); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left ${isLightMode ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}>
                                        <Wand2 className="w-3.5 h-3.5 shrink-0" /> <span className="leading-snug flex-1">Transmute Asset</span>
                                    </button>
                                    <button onClick={() => { setIsActionMenuOpen(false); handleDownloadImage(); showNotification("Dispatch to Matrix 요청이 전송되었습니다."); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left ${isLightMode ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}>
                                        <Cpu className="w-3.5 h-3.5 shrink-0" /> <span className="leading-snug flex-1">Dispatch to Matrix</span>
                                    </button>
                                    <button onClick={() => { setIsActionMenuOpen(false); handleCopy(JSON.stringify(editedBanner, null, 2)); showNotification("Transmit to Metric Core 요청이 전송되었습니다."); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left ${isLightMode ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}>
                                        <Box className="w-3.5 h-3.5 shrink-0" /> <span className="leading-snug flex-1">Transmit to Metric Core</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {(hasChanges || isEditingPreview) && (
                            <div className={`absolute bottom-0 left-0 right-0 p-4 border-t flex gap-2 shrink-0 ${isLightMode ? 'bg-white/90 backdrop-blur border-slate-200' : 'bg-[#111111]/90 backdrop-blur border-white/5'}`}>
                                <button onClick={handleCancelEdit} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors border ${isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'}`}>취소</button>
                                <button onClick={handleSaveEdit} className="flex-[2] py-3 rounded-xl text-xs font-bold bg-[#0b948f] hover:bg-[#0eb9b3] text-white transition-colors shadow-lg shadow-[#0eb9b3]/20 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> 저장</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </main>

    </div>
  );

}

