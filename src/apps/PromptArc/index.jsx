import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Plus, Search, Copy, Trash2, Edit2, X, Save, Tag, Layout, Type,
  Image as ImageIcon, Loader2, Wand2, Menu, Shield,
  Upload, Check, AlertTriangle, ArrowRight, Heart, Download, FileJson,
  PenTool, ChevronRight, ChevronLeft, Maximize2,
  Grid, ArrowUpDown, Folder, Box, ListChecks, ArrowUp, Video, Star,
  Film, Play, MoreHorizontal
} from "lucide-react";
import { APP_MAP } from "../../config/apps";
import { useGlobal } from "../../context/GlobalContext";
import { useAuth } from "../../context/AuthContext";
import { db, appId } from "../../lib/firebase";
import { uploadBase64, uploadBase64Many, uploadVideoFile, isVideoFile, VIDEO_MAX_BYTES, VIDEO_ACCEPT, VideoUploadError } from "../../lib/storage";
import { GEMINI_API_KEY } from "../../lib/gemini";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, updateDoc, increment,
  addDoc, arrayUnion, arrayRemove, serverTimestamp,
} from "firebase/firestore";
import { FolderPlus, Pencil, Filter as FilterIcon, Sparkles } from "lucide-react";

// Cloudinary 영상 URL → 자동 썸네일 URL (.mp4 → .jpg)
const cloudinaryVideoThumb = (url) => {
  if (typeof url !== "string") return null;
  if (!/^https?:\/\/res\.cloudinary\.com\//i.test(url)) return null;
  // 비디오 확장자만 .jpg로 교체. 이외 처리 안 함.
  return url.replace(/\.(mp4|webm|mov|m4v|ogv|mkv)(\?.*)?$/i, ".jpg$2");
};

// 영상의 첫 프레임을 캡처해서 data URL(image/jpeg) 반환.
// source는 File 또는 string URL.
async function captureVideoFirstFrame(source) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.playsInline = true;
    let blobUrl = null;
    if (source instanceof File) {
      blobUrl = URL.createObjectURL(source);
      video.src = blobUrl;
    } else if (typeof source === "string") {
      // 외부 URL은 CORS 허용이 필요 (Cloudinary는 기본 허용).
      video.crossOrigin = "anonymous";
      video.src = source;
    } else {
      reject(new Error("지원하지 않는 영상 소스입니다."));
      return;
    }
    const cleanup = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    const onError = () => { cleanup(); reject(new Error("영상 로드 실패 (CORS 또는 손상된 파일)")); };
    video.addEventListener("error", onError, { once: true });
    video.addEventListener("loadeddata", async () => {
      try {
        // 0초보다 살짝 뒤로 이동해야 첫 프레임이 확실히 paint됨
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        await new Promise((r) => video.addEventListener("seeked", r, { once: true }));
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        cleanup();
        resolve(dataUrl);
      } catch (e) { cleanup(); reject(e); }
    }, { once: true });
  });
}

// 상단 필터는 aiKeywords / stepKeywords 안에서 키워드 OR 매칭으로 동작.
// (tags / stepTags 는 '타이포'/'버튼'/'visualFX' 같은 카테고리 분류용이고,
//  실제 스타일·테마 정보는 키워드 필드에 저장되어 있음.)
// 각 필터의 keywords 항목은 substring + case-insensitive 로 검사됨.
const STYLE_FILTERS = [
  { id: '2d_bw',       label: '2D/흑백',       keywords: ['2D/흑백', '2d', '흑백'] },
  { id: '3d_render',   label: '3D/렌더링',     keywords: ['3D/렌더링', '3d', '렌더링'] },
  { id: 'calligraphy', label: '캘리그라피',     keywords: ['캘리그라피', 'calligraphy'] },
];

// ---- module-scope helpers (App + Modal에서 공유) ----
// stepTags / tags가 저장 시점·임포트 시점에 따라 모양이 다를 수 있어 정규화.
//   - 배열                       → 그대로
//   - JSON 문자열 ("[…]")         → JSON.parse 후 배열로 환원 (deserialize 실패 보강)
//   - 그 외                       → 빈 배열
const toArrayMaybeJson = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[') && s.endsWith(']')) {
      try { const parsed = JSON.parse(s); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
  }
  return [];
};

// stepTags가 [[t,t],[t]] (정상), [t,t] (평탄 단일 스텝), 또는 JSON 문자열일 수 있음.
// 어떤 모양이든 평탄화해 Set으로 반환.
const collectStepTags = (stepTags) => {
  const out = new Set();
  for (const entry of toArrayMaybeJson(stepTags)) {
    if (Array.isArray(entry)) {
      entry.forEach(t => { if (t) out.add(t); });
    } else if (typeof entry === 'string') {
      // 평탄 배열(스텝 1개)이거나, "[\"타이포\"]" 같은 JSON 문자열 항목
      const nested = toArrayMaybeJson(entry);
      if (nested.length > 0) nested.forEach(t => { if (t) out.add(t); });
      else if (entry) out.add(entry);
    }
  }
  return out;
};

const hasTagOf = (p, tag) => {
  if (!tag) return false;
  if (toArrayMaybeJson(p?.tags).includes(tag)) return true;
  return collectStepTags(p?.stepTags).has(tag);
};

// 프롬프트의 aiKeywords + stepKeywords 를 모두 합쳐 하나의 lowercase 문자열로 만든다.
// stepKeywords 가 JSON 문자열로 저장된 케이스(toArrayMaybeJson)도 흡수.
const buildKeywordHaystack = (p) => {
  const parts = [];
  if (typeof p?.aiKeywords === 'string' && p.aiKeywords) parts.push(p.aiKeywords);
  for (const sk of toArrayMaybeJson(p?.stepKeywords)) {
    if (typeof sk === 'string' && sk) parts.push(sk);
    else if (Array.isArray(sk)) {
      for (const x of sk) if (typeof x === 'string' && x) parts.push(x);
    }
  }
  return parts.join(' | ').toLowerCase();
};

// 필터 정의의 keywords 중 하나라도 prompt 의 키워드 haystack 에 substring 으로
// 포함되면 매칭 (case-insensitive). 예: '2d' → '... 2D/흑백 ...' 매칭됨.
const matchesFilter = (p, def) => {
  if (!def) return true;
  const list = def.keywords || [];
  if (list.length === 0) return true;
  const hay = buildKeywordHaystack(p);
  if (!hay) return false;
  return list.some(kw => hay.includes(String(kw).toLowerCase()));
};
const THEME_FILTERS = [
  { id: 'rpg_fantasy',     label: 'RPG/판타지',     keywords: ['RPG', '판타지'] },
  { id: 'casual_cartoon',  label: '캐주얼/카툰',    keywords: ['캐주얼', '카툰'] },
  { id: 'sf_cyberpunk',    label: 'SF/사이버펑크',  keywords: ['SF', '사이버펑크'] },
];

const ARC_CATEGORIES = [
  { id:'all', name:'전체 보기', icon:<ListChecks size={18}/> },
  { id:'즐겨찾기', name:'즐겨찾기', icon:<Heart size={18}/> },
  { type:'folders' },
  { type:'divider' },
  { id:'타이포', name:'타이포', icon:<Type size={18}/> },
  { id:'버튼', name:'버튼', icon:<Tag size={18}/> },
  { id:'visualFX', name:'VisualFX', icon:<Wand2 size={18}/> },
  { id:'Motion', name:'Motion', icon:<Play size={18}/> },
  { id:'기타', name:'기타', icon:<Folder size={18}/> },
];

const copyToClipboard = async (text, onSuccess) => {
  try { await navigator.clipboard.writeText(text); onSuccess?.(); }
  catch { const t = document.createElement('textarea'); t.value=text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); onSuccess?.(); }
};

const compressImage = (file, maxW=1600, maxH=1600, q=0.85) =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = ev => {
      const img = new Image(); img.src = ev.target.result;
      img.onload = () => {
        let w=img.width, h=img.height;
        if(w>h){ if(w>maxW){h*=maxW/w;w=maxW;} } else { if(h>maxH){w*=maxH/h;h=maxH;} }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        res(c.toDataURL('image/jpeg',q));
      };
      img.onerror=rej;
    };
    reader.onerror=rej;
  });

const processMultipleFiles = async (files, currentCount=0, callback, showToast) => {
  const results=[];
  let skipped=false;
  for(let i=0;i<files.length;i++){
    if(currentCount+results.length>=2){skipped=true;break;}
    if(files[i].type.startsWith('image/')){results.push(await compressImage(files[i]));}
  }
  if(skipped&&showToast) showToast('최대 2장까지만 업로드 가능합니다.','error');
  if(results.length>0) callback(results);
};

// Firestore는 (a) 배열 안의 배열, (b) `__...__` 패턴 필드명을 거부합니다.
// 중첩 배열은 자동 감지해서 JSON 문자열로 직렬화하고 마커 필드(_nestedKeys)에 키 목록을 기록.
// `__...__` 키는 import 시 들어오면 (Firestore 예약 패턴) 통째로 제거.
const NESTED_MARKER = '_nestedKeys';
const isReservedKey = (k) => typeof k === 'string' && /^__.+__$/.test(k);
const serializeForFirestore = (p) => {
  if (!p || typeof p !== 'object') return p;
  const out = {};
  const nestedKeys = [];
  for (const key in p) {
    if (isReservedKey(key)) continue; // strip Firestore-reserved field names
    if (key === NESTED_MARKER) continue;
    const v = p[key];
    if (Array.isArray(v) && v.some(x => Array.isArray(x))) {
      out[key] = JSON.stringify(v);
      nestedKeys.push(key);
    } else {
      out[key] = v;
    }
  }
  if (nestedKeys.length > 0) out[NESTED_MARKER] = nestedKeys;
  return out;
};
const deserializeFromFirestore = (p) => {
  if (!p || typeof p !== 'object') return p;
  const out = { ...p };
  const nestedKeys = Array.isArray(out[NESTED_MARKER]) ? out[NESTED_MARKER] : [];
  for (const key of nestedKeys) {
    if (typeof out[key] === 'string') {
      try {
        const parsed = JSON.parse(out[key]);
        if (Array.isArray(parsed)) out[key] = parsed;
      } catch { out[key] = []; }
    }
  }
  delete out[NESTED_MARKER];
  return out;
};

// Firestore 단일 문서 한도(~1MB)에 안전 마진. base64 이미지가 큰 문서는 스킵합니다.
const APPROX_DOC_LIMIT = 900_000;
const docSize = (obj) => {
  try { return JSON.stringify(obj).length; } catch { return Infinity; }
};

const PromptImage = ({ src, alt, className }) => {
  const [error,setError]=useState(false);
  useEffect(()=>{setError(false);},[src]);
  if(error||!src) return <div className={`flex items-center justify-center bg-zinc-900 text-zinc-600 ${className}`}><ImageIcon size={24}/></div>;
  return <img src={src} alt={alt} className={className} onError={()=>setError(true)} loading="lazy" onDragStart={e=>e.preventDefault()} />;
};

export default function PromptArcApp() {
  const { navigate, payload, clearPayload } = useGlobal();
  const { user, isAdmin } = useAuth();
  // Public — everyone reads, writes restricted by Firestore Rules to ownerUid
  const promptsCol = useMemo(
    () => (db ? collection(db, "artifacts", appId, "public", "data", "prompts") : null),
    []
  );
  const promptDoc = useCallback(
    (id) => (db ? doc(db, "artifacts", appId, "public", "data", "prompts", id) : null),
    []
  );
  // Per-user private collections
  const favoritesCol = useMemo(
    () => (user && db ? collection(db, "artifacts", appId, "users", user.uid, "favorites") : null),
    [user]
  );
  const favoriteDoc = useCallback(
    (id) => (user && db ? doc(db, "artifacts", appId, "users", user.uid, "favorites", id) : null),
    [user]
  );
  const likeDoc = useCallback(
    (id) => (user && db ? doc(db, "artifacts", appId, "users", user.uid, "likes", id) : null),
    [user]
  );
  const likesCol = useMemo(
    () => (user && db ? collection(db, "artifacts", appId, "users", user.uid, "likes") : null),
    [user]
  );
  // Personal folders — strictly private per user.
  // Path: users/{uid}/folders/{folderId} = { name, createdAt, items: [promptId] }
  const foldersCol = useMemo(
    () => (user && db ? collection(db, "users", user.uid, "folders") : null),
    [user]
  );
  const folderDoc = useCallback(
    (id) => (user && db ? doc(db, "users", user.uid, "folders", id) : null),
    [user]
  );

  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [likedIds, setLikedIds] = useState(new Set());
  const [folders, setFolders] = useState([]);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  const [prompts, setPrompts] = useState([]);
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('latest');
  const [viewMode, setViewMode] = useState('normal');
  const [colCount, setColCount] = useState(4);
  // filters: 단일 선택형 (style 한 개, theme 한 개) + boolean unanalyzed
  const [filters, setFilters] = useState({ style: null, theme: null, unanalyzed: false });
  const filterCount = (filters.style ? 1 : 0) + (filters.theme ? 1 : 0) + (filters.unanalyzed ? 1 : 0);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const filterPopoverRef = useRef(null);
  const sortPopoverRef = useRef(null);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [viewPrompt, setViewPrompt] = useState(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen:false, id:null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isQuickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const mainScrollRef = useRef(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const observerTarget = useRef(null);
  const [theme, setTheme] = useState('dark');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [isHydrated, setIsHydrated] = useState(false);

  const showToast = useCallback((msg, type='success') => {
    setToast({ message:String(msg), type });
    setTimeout(()=>setToast(null),3000);
  },[]);

  // 팝오버 외부 스크롤 시 자동 닫기 (capture 단계로 모든 스크롤 컨테이너 감지)
  useEffect(() => {
    if (!filterPopoverOpen && !sortPopoverOpen) return;
    const onScroll = (e) => {
      if (filterPopoverOpen && filterPopoverRef.current?.contains(e.target)) return;
      if (sortPopoverOpen && sortPopoverRef.current?.contains(e.target)) return;
      if (filterPopoverOpen) setFilterPopoverOpen(false);
      if (sortPopoverOpen) setSortPopoverOpen(false);
    };
    window.addEventListener('wheel', onScroll, { capture: true, passive: true });
    window.addEventListener('touchmove', onScroll, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('wheel', onScroll, { capture: true });
      window.removeEventListener('touchmove', onScroll, { capture: true });
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [filterPopoverOpen, sortPopoverOpen]);

  useEffect(() => {
    if (!promptsCol) { setIsHydrated(true); return; }
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
      promptsCol,
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
  }, [promptsCol]);

  // 한 번만 실행되는 데이터 구조 진단 로그.
  // Firestore에서 들어온 tags / stepTags 가 어떤 모양인지 확인하기 위함.
  const debugLoggedRef = useRef(false);
  useEffect(() => {
    if (debugLoggedRef.current) return;
    if (!prompts || prompts.length === 0) return;
    debugLoggedRef.current = true;

    const shapeOf = (v) => {
      if (v === null) return 'null';
      if (v === undefined) return 'undefined';
      if (Array.isArray(v)) {
        if (v.length === 0) return 'array(empty)';
        if (v.some(x => Array.isArray(x))) return 'array-of-arrays';
        return `array<${typeof v[0]}>`;
      }
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed.startsWith('[')) return 'string(json-like)';
        return 'string';
      }
      return typeof v;
    };

    const tagsShape = new Map();
    const stepTagsShape = new Map();
    let aiKwString = 0, aiKwOther = 0;
    for (const p of prompts) {
      const ts = shapeOf(p.tags); tagsShape.set(ts, (tagsShape.get(ts) || 0) + 1);
      const sts = shapeOf(p.stepTags); stepTagsShape.set(sts, (stepTagsShape.get(sts) || 0) + 1);
      if (typeof p.aiKeywords === 'string') aiKwString++; else aiKwOther++;
    }
    const sample = prompts[0];

    // 콘솔 console.log 가 객체를 "예쁘게" 보여주려 변환할 수 있어, JSON.stringify로
    // 실제 저장된 리터럴 모양을 함께 출력한다. (특히 문자열로 저장된 JSON을 식별하기 위함)
    const stringifyShort = (v) => {
      try { const s = JSON.stringify(v); return s.length > 240 ? s.slice(0, 240) + '…' : s; }
      catch { return String(v); }
    };

    console.group(`[PromptArc] 🔍 Firestore 데이터 구조 진단 (총 ${prompts.length}개)`);
    console.log('📌 표본 #1 (첫 프롬프트) — 화면 표시값');
    console.log('  id        :', sample.id);
    console.log('  title     :', sample.title);
    console.log('  tags      :', sample.tags, `← shape: ${shapeOf(sample.tags)}, typeof: ${typeof sample.tags}`);
    console.log('  stepTags  :', sample.stepTags, `← shape: ${shapeOf(sample.stepTags)}, typeof: ${typeof sample.stepTags}`);
    console.log('  aiKeywords:', sample.aiKeywords);
    console.log('📌 표본 #1 — JSON 리터럴 (저장된 실제 모양)');
    console.log('  tags     JSON:', stringifyShort(sample.tags));
    console.log('  stepTags JSON:', stringifyShort(sample.stepTags));
    // 표본을 3개까지 더 보여줘서 다양한 케이스를 한눈에
    for (let i = 1; i < Math.min(prompts.length, 4); i++) {
      const p = prompts[i];
      console.log(`📌 표본 #${i + 1} [${p.id}]`);
      console.log('  tags     :', stringifyShort(p.tags),     `(${shapeOf(p.tags)})`);
      console.log('  stepTags :', stringifyShort(p.stepTags), `(${shapeOf(p.stepTags)})`);
    }
    console.log('📊 전체 분포');
    console.log('  tags    모양:', Object.fromEntries(tagsShape));
    console.log('  stepTags 모양:', Object.fromEntries(stepTagsShape));
    console.log('  aiKeywords: string=' + aiKwString + ', other=' + aiKwOther);

    // 비정상(평탄 배열/문자열) 케이스 샘플
    const oddStepTags = prompts.filter(p => {
      const v = p.stepTags;
      if (!Array.isArray(v)) return v !== undefined && v !== null;
      if (v.length === 0) return false;
      return !v.some(x => Array.isArray(x));
    }).slice(0, 3);
    if (oddStepTags.length > 0) {
      console.warn('⚠️  비표준 stepTags 샘플 (평탄 배열/문자열):');
      oddStepTags.forEach(p => console.log('  •', p.id, '→', stringifyShort(p.stepTags)));
    }

    // 모든 프롬프트에서 실제로 발견된 고유 태그값 목록 — 필터 정의(STYLE_FILTERS/THEME_FILTERS)
    // 와 정확히 같은 문자열인지 비교할 수 있게 노출.
    const allTagsFound = new Set();
    for (const p of prompts) {
      for (const t of toArrayMaybeJson(p.tags)) if (typeof t === 'string') allTagsFound.add(t);
      for (const t of collectStepTags(p.stepTags)) allTagsFound.add(t);
    }
    console.log('🏷️  데이터에 실존하는 고유 태그 (카테고리, 총 ' + allTagsFound.size + '개):');
    console.log('  ', [...allTagsFound].sort());

    // aiKeywords + stepKeywords 안에서 가장 자주 나오는 토큰을 뽑아 본다 (필터 키워드 점검용).
    const kwBag = new Map();
    for (const p of prompts) {
      const hay = buildKeywordHaystack(p);
      if (!hay) continue;
      for (const tok of hay.split(/[\s,\/|·•\-]+/).map(s => s.trim()).filter(Boolean)) {
        kwBag.set(tok, (kwBag.get(tok) || 0) + 1);
      }
    }
    const topKws = [...kwBag.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    console.log('🔤 키워드 빈도 상위 30개 (aiKeywords + stepKeywords lowercase 토큰):');
    console.log('  ', topKws);

    console.log('🎯 필터가 찾고 있는 키워드 (STYLE_FILTERS):');
    console.log('  ', STYLE_FILTERS.map(f => `${f.id} → ${JSON.stringify(f.keywords)}`));
    console.log('🎯 필터가 찾고 있는 키워드 (THEME_FILTERS):');
    console.log('  ', THEME_FILTERS.map(f => `${f.id} → ${JSON.stringify(f.keywords)}`));

    // 데이터의 키워드 haystack 어디에도 안 잡히는 필터 키워드 후보 표시.
    const allHay = prompts.map(buildKeywordHaystack).join(' || ');
    const missingFromData = [];
    for (const f of [...STYLE_FILTERS, ...THEME_FILTERS]) {
      for (const kw of f.keywords) {
        if (!allHay.includes(String(kw).toLowerCase())) {
          missingFromData.push({ filterId: f.id, expected: kw });
        }
      }
    }
    if (missingFromData.length > 0) {
      console.warn('⚠️  데이터에 어디에도 안 잡히는 필터 키워드 (= 항상 0개로 빠짐):');
      console.table(missingFromData);
    }
    console.groupEnd();
  }, [prompts]);

  // Favorites (per-user, private)
  useEffect(() => {
    if (!favoritesCol) { setFavoriteIds(new Set()); return; }
    const unsub = onSnapshot(favoritesCol,
      (snap) => setFavoriteIds(new Set(snap.docs.map(d => d.id))),
      (err) => console.error('[PromptArc] favorites listener error', err)
    );
    return () => unsub();
  }, [favoritesCol]);

  // Likes (per-user, private — drives the heart on/off state)
  useEffect(() => {
    if (!likesCol) { setLikedIds(new Set()); return; }
    const unsub = onSnapshot(likesCol,
      (snap) => setLikedIds(new Set(snap.docs.map(d => d.id))),
      (err) => console.error('[PromptArc] likes listener error', err)
    );
    return () => unsub();
  }, [likesCol]);

  // Personal folders (per-user, private)
  useEffect(() => {
    if (!foldersCol) { setFolders([]); return; }
    const unsub = onSnapshot(foldersCol,
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
  }, [foldersCol]);

  const handleCreateFolder = async (rawName) => {
    const name = String(rawName || '').trim();
    if (!name) { showToast('폴더 이름을 입력해주세요', 'error'); return; }
    if (!foldersCol) { showToast('로그인이 필요합니다', 'error'); return; }
    if (folders.some(f => f.name === name)) { showToast('이미 같은 이름의 폴더가 있어요', 'error'); return; }
    try {
      await addDoc(foldersCol, { name, items: [], createdAt: serverTimestamp() });
      showToast(`'${name}' 폴더가 만들어졌어요`);
    } catch (e) {
      console.error('[PromptArc] createFolder failed', e);
      showToast(`폴더 생성 실패: ${e.code || e.message}`, 'error');
    }
  };

  const handleRenameFolder = async (folderId, newName) => {
    const name = String(newName || '').trim();
    if (!name) { showToast('폴더 이름을 입력해주세요', 'error'); return; }
    const ref = folderDoc(folderId);
    if (!ref) return;
    try {
      await updateDoc(ref, { name });
      showToast('폴더 이름이 변경됐어요');
    } catch (e) {
      console.error('[PromptArc] renameFolder failed', e);
      showToast(`폴더 이름 변경 실패: ${e.code || e.message}`, 'error');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const target = folders.find(f => f.id === folderId);
    if (!target) return;
    if (!confirm(`'${target.name}' 폴더를 삭제할까요?\n폴더 안의 프롬프트 자체는 삭제되지 않습니다.`)) return;
    try {
      await deleteDoc(folderDoc(folderId));
      if (category === `folder:${folderId}`) setCategory('all');
      showToast('폴더가 삭제됐어요');
    } catch (e) {
      console.error('[PromptArc] deleteFolder failed', e);
      showToast(`폴더 삭제 실패: ${e.code || e.message}`, 'error');
    }
  };

  const handleToggleFolderItem = async (folderId, promptId) => {
    const f = folders.find(x => x.id === folderId);
    if (!f) return;
    const hasIt = (f.items || []).includes(promptId);
    const ref = folderDoc(folderId);
    if (!ref) return;
    try {
      await updateDoc(ref, { items: hasIt ? arrayRemove(promptId) : arrayUnion(promptId) });
      showToast(hasIt ? `'${f.name}'에서 제거됐어요` : `'${f.name}'에 저장됐어요`);
    } catch (e) {
      console.error('[PromptArc] toggleFolderItem failed', e);
      showToast(`폴더 작업 실패: ${e.code || e.message}`, 'error');
    }
  };

  useEffect(()=>{
    if(payload.source && payload.target==='prompt-arc' && payload.prompt?.text){
      setEditingPrompt({
        title:'', tags:['기타'], description:'', content:payload.prompt.text,
        images:[], stepPrompts:[payload.prompt.text], stepLabels:[''], stepTags:[['기타']], stepKeywords:[''], stepDescriptions:[''],
        aiKeywords:'', optimizedModel:'나노바나나2', thumbnail:'', isPinned:false, isLive:false, views:0, likeCount:0, likedBy:[], analysisStatus:'completed'
      });
      setEditModalOpen(true);
      clearPayload();
      showToast(`${APP_MAP[payload.source]?.label}에서 프롬프트가 전달됐어요`);
    }
  },[payload]);

  useEffect(()=>{
    const mq=window.matchMedia('(prefers-color-scheme: dark)');
    const upd=()=>{ if(theme==='system') setIsDarkMode(mq.matches); else setIsDarkMode(theme==='dark'); };
    upd(); mq.addEventListener('change',upd); return ()=>mq.removeEventListener('change',upd);
  },[theme]);

  useEffect(()=>{
    const upd=()=>{
      const w=window.innerWidth;
      if(viewMode==='large') setColCount(w>=768?2:1);
      else if(viewMode==='small'){ if(w>=1536)setColCount(8); else if(w>=1280)setColCount(6); else if(w>=1024)setColCount(5); else if(w>=768)setColCount(4); else setColCount(3); }
      else { if(w>=1280)setColCount(5); else if(w>=1024)setColCount(4); else if(w>=768)setColCount(3); else setColCount(2); }
    };
    upd(); window.addEventListener('resize',upd); return ()=>window.removeEventListener('resize',upd);
  },[viewMode]);

  const lastAutoLoadRef = useRef(0);

  const handleNewPrompt = () => {
    setEditingPrompt({ title:'', tags:['기타'], description:'', content:'', images:[], stepPrompts:[], stepLabels:[], stepTags:[], stepKeywords:[], stepDescriptions:[], aiKeywords:'', optimizedModel:'나노바나나2', thumbnail:'', isPinned:false, isLive:false, views:0, likeCount:0, likedBy:[], analysisStatus:'completed' });
    setEditModalOpen(true);
  };

  // Upload base64 images and any pending video Files in `prompt` to Cloudinary.
  // - images: each entry is uploaded sequentially with individual error tolerance.
  //           If an upload fails, that slot becomes null and is then removed —
  //           companion step arrays are realigned so index N stays in sync.
  // - videos: entries may be File (new) or string (already uploaded URL).
  const uploadPromptImages = async (uid, promptId, prompt) => {
    const out = { ...prompt };
    const ts = Date.now();
    if (Array.isArray(out.images) && out.images.length > 0) {
      const uploaded = await uploadBase64Many(out.images, (i) =>
        `users/${uid}/prompts/${promptId}/img-${i}-${ts}.jpg`);
      // Identify successfully-uploaded slots; drop nulls and keep step arrays aligned.
      const keep = uploaded.map((u) => !!u);
      const droppedCount = keep.filter((k) => !k).length;
      if (droppedCount > 0) {
        console.warn(`[uploadPromptImages] dropped ${droppedCount}/${uploaded.length} failed image(s) for ${promptId}`);
      }
      out.images = uploaded.filter(Boolean);
      const STEP_KEYS = ['stepPrompts', 'stepLabels', 'stepTags', 'stepKeywords', 'stepDescriptions'];
      for (const key of STEP_KEYS) {
        if (Array.isArray(out[key]) && out[key].length === keep.length) {
          out[key] = out[key].filter((_, i) => keep[i]);
        }
      }
    }
    if (out.thumbnail) {
      try {
        const url = await uploadBase64(out.thumbnail,
          `users/${uid}/prompts/${promptId}/thumb-${ts}.jpg`);
        out.thumbnail = url || '';
      } catch (e) {
        console.warn(`[uploadPromptImages] thumbnail upload failed for ${promptId}:`, e?.message || e);
        out.thumbnail = '';
      }
    }
    if (Array.isArray(out.videos) && out.videos.length > 0) {
      const uploaded = [];
      for (const v of out.videos) {
        if (typeof v === 'string') { uploaded.push(v); continue; }
        if (v instanceof File) {
          try {
            const url = await uploadVideoFile(v);
            uploaded.push(url);
          } catch (e) {
            console.error(`[uploadPromptImages] video upload failed for ${promptId}:`, e?.message || e);
          }
        }
      }
      out.videos = uploaded;
    }
    return out;
  };

  const handleSave = async (data) => {
    if (!promptDoc || !user) { showToast('로그인이 필요합니다.', 'error'); return; }
    setIsSaving(true);
    const now = Date.now();
    const id = editingPrompt?.id || Math.random().toString(36).slice(2);
    try {
      const hasPendingVideo = Array.isArray(data.videos) && data.videos.some(v => v instanceof File);
      showToast(hasPendingVideo ? '미디어 업로드 중...' : '이미지 업로드 중...');
      const withUrls = await uploadPromptImages(user.uid, id, data);
      // Aggregate tags + keywords across all steps so search/filter sees every step.
      // Without this, p.tags is just the *last edited* step's tags, breaking tag filtering for multi-step prompts.
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
      const cleaned = {
        ...withUrls, id,
        tags: aggregatedTags,
        aiKeywords: aggregatedKeywords,
        ownerUid: editingPrompt?.ownerUid || user.uid,
        likeCount: editingPrompt?.likeCount || 0,
        createdAt: editingPrompt?.createdAt || now,
        updatedAt: now,
      };
      await setDoc(promptDoc(id), serializeForFirestore(cleaned));
      showToast(editingPrompt?.id ? '수정되었습니다.' : '저장되었습니다.');
      setEditModalOpen(false); setEditingPrompt(null);
    } catch (e) {
      console.error('[PromptArc] save failed', e);
      showToast(`저장 실패: ${e.message || e}`, 'error');
    } finally { setIsSaving(false); }
  };

  const performDelete = async () => {
    if (!promptDoc) { showToast('로그인이 필요합니다.', 'error'); return; }
    setIsDeleting(true);
    try {
      if (deleteConfirm.id === 'BATCH') {
        const ids = Array.from(selectedItems);
        const BATCH = 500;
        for (let i = 0; i < ids.length; i += BATCH) {
          const batch = writeBatch(db);
          ids.slice(i, i + BATCH).forEach(id => batch.delete(promptDoc(id)));
          await batch.commit();
        }
        showToast(`${ids.length}개 삭제됐어요.`);
        setSelectedItems(new Set());
      } else {
        await deleteDoc(promptDoc(deleteConfirm.id));
        showToast('삭제되었습니다.');
        if (viewPrompt?.id === deleteConfirm.id) setViewPrompt(null);
      }
    } catch (e) {
      console.error('[PromptArc] delete failed', e);
      showToast(`삭제 실패: ${e.message || e}`, 'error');
    } finally {
      setDeleteConfirm({isOpen:false,id:null}); setIsDeleting(false);
    }
  };

  // Like = 공개 카운터 + 개인 마커. 같은 사용자가 두 번 누르면 토글.
  const handleLike = async (id /*, _ignoredOldFlag */) => {
    if (!promptDoc || !likeDoc) { showToast('로그인이 필요합니다.', 'error'); return; }
    const isAlreadyLiked = likedIds.has(id);
    try {
      if (isAlreadyLiked) {
        await Promise.all([
          deleteDoc(likeDoc(id)),
          updateDoc(promptDoc(id), { likeCount: increment(-1) }),
        ]);
      } else {
        await Promise.all([
          setDoc(likeDoc(id), { createdAt: Date.now() }),
          updateDoc(promptDoc(id), { likeCount: increment(1) }),
        ]);
      }
    } catch (e) { console.error('[PromptArc] like toggle failed', e); }
  };

  // Pin = admin/owner 전용 공개 추천 표시 (공개 문서 필드).
  const handleTogglePin = async (id, isPinned) => {
    if (!promptDoc) return;
    try {
      await updateDoc(promptDoc(id), { isPinned: !isPinned });
      showToast(!isPinned ? '추천 고정됐어요.' : '고정 해제됐어요.');
    } catch (e) {
      console.error('[PromptArc] pin failed', e);
      showToast('고정 실패: 권한이 없거나 네트워크 오류', 'error');
    }
  };

  const handleToggleLive = async (id, isLive) => {
    if (!promptDoc) return;
    try { await updateDoc(promptDoc(id), { isLive: !isLive }); }
    catch (e) { console.error('[PromptArc] live toggle failed', e); }
  };

  // Favorite = 개인 즐겨찾기 (users/{uid}/favorites/{promptId} 존재 여부).
  const handleToggleFavorite = async (id) => {
    if (!favoriteDoc) { showToast('로그인이 필요합니다.', 'error'); return; }
    const isFav = favoriteIds.has(id);
    try {
      if (isFav) await deleteDoc(favoriteDoc(id));
      else await setDoc(favoriteDoc(id), { createdAt: Date.now() });
    } catch (e) {
      console.error('[PromptArc] favorite toggle failed', e);
      showToast('즐겨찾기 실패', 'error');
    }
  };

  const importInputRef = useRef(null);
  const handleExportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), prompts }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
    a.href = url; a.download = `prompt-arc-backup-${ts}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${prompts.length}개 프롬프트 내보냈어요.`);
  };
  const handleImportData = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!promptDoc) { showToast('로그인이 필요합니다.', 'error'); return; }
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    console.log(`[PromptArc] Import start: ${file.name} (${sizeMB}MB)`);
    showToast(`파일 읽는 중... (${sizeMB}MB)`);
    try {
      console.time('[PromptArc] file.text + parse');
      const text = await file.text();
      let data;
      try { data = JSON.parse(text); }
      catch (parseErr) {
        console.timeEnd('[PromptArc] file.text + parse');
        console.error('[PromptArc] JSON parse failed', parseErr);
        showToast(`파싱 실패: ${parseErr.message}`, 'error');
        return;
      }
      console.timeEnd('[PromptArc] file.text + parse');

      const incoming = Array.isArray(data)
        ? data
        : (Array.isArray(data?.prompts) ? data.prompts
            : (Array.isArray(data?.data) ? data.data : null));
      if (!incoming) {
        console.error('[PromptArc] Unrecognized format. Top-level:', data && typeof data === 'object' ? Object.keys(data) : typeof data);
        showToast('형식이 올바르지 않습니다. (배열 또는 {prompts:[...]} 형식)', 'error');
        return;
      }
      if (incoming.length === 0) { showToast('파일이 비어있습니다.', 'error'); return; }
      console.log(`[PromptArc] Parsed ${incoming.length} items`);

      if (prompts.length > 0 && !confirm(`기존 ${prompts.length}개 프롬프트가 있어요.\n[확인] 병합 (같은 ID는 덮어씀)\n[취소] 중단`)) {
        showToast('가져오기 취소했어요.');
        return;
      }

      const BATCH_SIZE = 10; // 작게 — 이미지 URL만 들어있어도 안전 마진
      const total = incoming.length;
      let written = 0; let failed = 0; let oversized = 0; let imgFailed = 0;
      console.time('[PromptArc] storage upload + writeBatch');
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = incoming.slice(i, i + BATCH_SIZE);
        showToast(`이미지 업로드 중... ${i} / ${total}`);
        // Upload images for the chunk in parallel (Storage uploads happen first, then one Firestore batch).
        const prepared = await Promise.all(chunk.map(async (p) => {
          if (!p || typeof p !== 'object') return null;
          const id = (p.id != null ? String(p.id) : Math.random().toString(36).slice(2));
          try {
            const withUrls = await uploadPromptImages(user.uid, id, p);
            return { id, prompt: { ...withUrls, id, ownerUid: user.uid, likeCount: p.likeCount || 0 } };
          } catch (e) {
            console.error(`[PromptArc] image upload failed for ${id}`, e);
            imgFailed++;
            return null;
          }
        }));

        const batch = writeBatch(db);
        let inBatch = 0;
        prepared.forEach(item => {
          if (!item) return;
          const serialized = serializeForFirestore(item.prompt);
          const size = docSize(serialized);
          if (size > APPROX_DOC_LIMIT) {
            console.warn(`[PromptArc] oversized doc skipped: id=${item.id}, size=${(size/1024).toFixed(0)}KB`);
            oversized++;
            return;
          }
          batch.set(promptDoc(item.id), serialized);
          inBatch++;
        });
        if (inBatch === 0) continue;
        try {
          await batch.commit();
          written += inBatch;
          showToast(`Firestore 저장 중... ${Math.min(i + BATCH_SIZE, total)} / ${total}`);
        } catch (batchErr) {
          console.error(`[PromptArc] batch starting at ${i} (${inBatch} docs) failed`, batchErr);
          failed += inBatch;
        }
      }
      console.timeEnd('[PromptArc] storage upload + writeBatch');
      setVisibleCount(written + prompts.length);
      const parts = [`${written}개 업로드`];
      if (imgFailed > 0) parts.push(`${imgFailed}개 이미지실패`);
      if (oversized > 0) parts.push(`${oversized}개 용량초과 스킵`);
      if (failed > 0) parts.push(`${failed}개 실패`);
      showToast(parts.join(', ') + (failed > 0 || imgFailed > 0 || oversized > 0 ? ' (콘솔 F12 확인)' : ' 완료!'),
                failed > 0 || imgFailed > 0 ? 'error' : 'success');
    } catch (err) {
      console.error('[PromptArc] Import failed', err);
      showToast(`가져오기 실패: ${err.message || err}`, 'error');
    }
  };

  const handleSendToApp = (targetId, prompt) => {
    navigate(targetId, {
      source:'prompt-arc', target:targetId,
      prompt:{ text:prompt.content||prompt.stepPrompts?.[0]||'', tags:prompt.tags||[], style:prompt.optimizedModel||'' },
      image:{ url:prompt.thumbnail||prompt.images?.[0]||'', metadata:{} },
      params:{}
    });
    showToast(`${APP_MAP[targetId]?.label}로 전달 중...`);
  };

  // 모듈-스코프 헬퍼를 그대로 사용 (hasTagOf / matchesFilter)
  const hasTag = hasTagOf;
  const isUnanalyzed = (p) =>
    !p.aiKeywords && !p.description &&
    !(Array.isArray(p.tags) && p.tags.some(t => t && t !== '기타'));

  const filteredPrompts = useMemo(()=>{
    let folderItems = null;
    if (typeof category === 'string' && category.startsWith('folder:')) {
      const fid = category.slice(7);
      const f = folders.find(x => x.id === fid);
      folderItems = new Set(f?.items || []);
    }
    const styleDef = filters.style ? STYLE_FILTERS.find(f => f.id === filters.style) : null;
    const themeDef = filters.theme ? THEME_FILTERS.find(f => f.id === filters.theme) : null;
    let result = prompts.filter(p=>{
      const term=searchTerm.toLowerCase();
      const matchSearch = [p.title,p.content,p.description,p.aiKeywords,...(p.stepPrompts||[]),...(p.stepKeywords||[]),...(p.stepDescriptions||[])].some(s=>(s||'').toLowerCase().includes(term));
      const matchCategory =
        category==='all' ? true :
        category==='즐겨찾기' ? favoriteIds.has(p.id) :
        folderItems ? folderItems.has(p.id) :
        hasTag(p, category);
      // 상단 필터 적용 (style / theme / unanalyzed) — tags / stepTags만 검사
      let matchTopFilter = true;
      if (styleDef && !matchesFilter(p, styleDef)) matchTopFilter = false;
      if (matchTopFilter && themeDef && !matchesFilter(p, themeDef)) matchTopFilter = false;
      if (matchTopFilter && filters.unanalyzed && !isUnanalyzed(p)) matchTopFilter = false;
      return matchSearch && matchCategory && matchTopFilter;
    });
    if (styleDef || themeDef) {
      // 필터 적용 시: 처음 5개 프롬프트의 비교 과정을 그대로 노출.
      const expectedKeywords = [
        ...(styleDef?.keywords || []),
        ...(themeDef?.keywords || []),
      ];
      const stringifyShort = (v) => {
        try { const s = JSON.stringify(v); return s.length > 200 ? s.slice(0, 200) + '…' : s; }
        catch { return String(v); }
      };
      console.group(`[PromptArc] 🎯 필터 매칭 추적 — style=${styleDef?.id || '-'}, theme=${themeDef?.id || '-'}`);
      console.log('찾는 키워드(하나라도 substring 매칭되면 통과, case-insensitive):', expectedKeywords);
      const sampleSize = Math.min(prompts.length, 5);
      const rows = [];
      for (let i = 0; i < sampleSize; i++) {
        const p = prompts[i];
        const haystack = buildKeywordHaystack(p);
        const styleHit = styleDef ? matchesFilter(p, styleDef) : null;
        const themeHit = themeDef ? matchesFilter(p, themeDef) : null;
        rows.push({
          id: p.id,
          title: (p.title || '').slice(0, 20),
          'aiKeywords':    stringifyShort(p.aiKeywords),
          'stepKeywords':  stringifyShort(p.stepKeywords),
          'haystack(lower)': haystack.slice(0, 120),
          styleHit, themeHit,
          passes: (styleHit !== false) && (themeHit !== false),
        });
      }
      console.table(rows);
      console.log(`결과: ${result.length}/${prompts.length} 통과`);
      console.groupEnd();
    }
    return result.sort((a,b)=>{
      // 1순위: LIVE
      const aLive = a.isLive ? 1 : 0;
      const bLive = b.isLive ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      // 2순위: 추천(isPinned)
      const aPin = a.isPinned ? 1 : 0;
      const bPin = b.isPinned ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      // 3순위: 사용자 정렬 옵션
      if (sortOption==='popular') return (b.views||0)-(a.views||0);
      if (sortOption==='top_rated') return (b.likeCount||0)-(a.likeCount||0);
      if (sortOption==='oldest') return (a.createdAt||0)-(b.createdAt||0);
      return (b.createdAt||0)-(a.createdAt||0);
    });
  },[prompts,searchTerm,category,sortOption,favoriteIds,folders,filters]);

  useEffect(() => {
    // No loader rendered → nothing to observe
    if (visibleCount >= filteredPrompts.length) return;
    if (!observerTarget.current) return;
    const ob = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      const now = Date.now();
      if (now - lastAutoLoadRef.current < 250) return;
      lastAutoLoadRef.current = now;
      setVisibleCount(p => Math.min(p + 50, filteredPrompts.length));
    }, { threshold: 0, rootMargin: '400px' });
    ob.observe(observerTarget.current);
    return () => ob.disconnect();
  }, [visibleCount, filteredPrompts.length]);

  const visiblePrompts = filteredPrompts.slice(0,visibleCount);
  const masonryColumns = useMemo(()=>{
    const cols=Array.from({length:colCount},()=>[]);
    visiblePrompts.forEach((p,i)=>cols[i%colCount].push(p));
    return cols;
  },[visiblePrompts,colCount]);

  const handleGlobalPaste = useCallback((e)=>{
    if(isEditModalOpen||isQuickDrawerOpen) return;
    const items=Array.from(e.clipboardData.items).filter(i=>i.type.includes('image'));
    if(items.length>0){
      processMultipleFiles(items.map(i=>i.getAsFile()),0,(res)=>{
        setEditingPrompt({ title:'', tags:['기타'], description:'', content:'', images:res, stepPrompts:res.map(()=>''), stepLabels:res.map(()=>''), stepTags:res.map(()=>['기타']), stepKeywords:res.map(()=>''), stepDescriptions:res.map(()=>''), aiKeywords:'', optimizedModel:'나노바나나2', thumbnail:'', isPinned:false, isLive:false, views:0, likeCount:0, likedBy:[], analysisStatus:'completed' });
        setEditModalOpen(true);
      },showToast);
    }
  },[isEditModalOpen,isQuickDrawerOpen,showToast]);

  const handleDrop = useCallback((e)=>{
    e.preventDefault(); dragCounter.current=0; setIsDragging(false);
    if(isEditModalOpen||isQuickDrawerOpen) return;
    processMultipleFiles(e.dataTransfer.files,0,(res)=>{
      setEditingPrompt({ title:'', tags:['기타'], description:'', content:'', images:res, stepPrompts:res.map(()=>''), stepLabels:res.map(()=>''), stepTags:res.map(()=>['기타']), stepKeywords:res.map(()=>''), stepDescriptions:res.map(()=>''), aiKeywords:'', optimizedModel:'나노바나나2', thumbnail:'', isPinned:false, isLive:false, views:0, likeCount:0, likedBy:[], analysisStatus:'completed' });
      setEditModalOpen(true);
    },showToast);
  },[isEditModalOpen,isQuickDrawerOpen,showToast]);

  const sortLabel = { latest:'최신순', oldest:'오래된 순', popular:'조회순', top_rated:'인기순' }[sortOption]||'정렬';

  return (
    <div className={isDarkMode?'dark':''}>
      <div className="flex h-full bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-[#EAEAEA] font-sans overflow-hidden relative"
        onPaste={handleGlobalPaste}
        onDragEnter={e=>{e.preventDefault();dragCounter.current+=1;setIsDragging(true);}}
        onDragLeave={e=>{e.preventDefault();dragCounter.current-=1;if(dragCounter.current===0)setIsDragging(false);}}
        onDragOver={e=>e.preventDefault()} onDrop={handleDrop}
        style={{ height:"calc(100vh - 52px)" }}
      >
        <style>{`
          .arc-wrap { font-family:'Noto Sans KR',sans-serif; }
          .arc-scrollbar::-webkit-scrollbar{width:4px;height:4px}.arc-scrollbar::-webkit-scrollbar-thumb{background:#333;border-radius:4px}.arc-scrollbar::-webkit-scrollbar-track{background:transparent}
        `}</style>

        {isDragging && (
          <div className="fixed inset-0 z-[100] bg-[#C8A969]/10 backdrop-blur-sm border-[6px] border-dashed border-[#C8A969] flex flex-col items-center justify-center pointer-events-none m-4 rounded-xl">
            <Upload size={64} className="text-[#C8A969] mb-6 animate-bounce"/>
            <h2 className="text-3xl font-black text-white">이미지를 드롭해서 바로 등록</h2>
          </div>
        )}

        {/* Sidebar */}
        <aside className={`hidden md:flex flex-col bg-[#121212] border-r border-white/5 transition-all duration-300 ${isSidebarCollapsed?'w-[40px]':'w-[160px]'}`}>
          <div className="h-14 flex items-center justify-center border-b border-white/5">
            <button onClick={()=>setSidebarCollapsed(!isSidebarCollapsed)} className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"><Menu size={18}/></button>
          </div>
          <nav className="flex-1 overflow-y-auto arc-scrollbar py-2 flex flex-col gap-0.5">
            {ARC_CATEGORIES.map((cat,idx)=>{
              if(cat.type==='divider') return <div key={idx} className="h-px bg-white/5 my-1 mx-3"/>;
              if(cat.type==='folders') {
                if (!user) return null;
                return (
                  <div key={idx} className="mt-1">
                    {!isSidebarCollapsed && (
                      <div className="flex items-center justify-between pl-5 pr-2 mt-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">내 폴더</span>
                        <button
                          onClick={()=>{ setShowNewFolderInput(v=>!v); setNewFolderName(''); }}
                          className="p-1 text-zinc-500 hover:text-white hover:bg-white/5 rounded"
                          title="폴더 추가"
                        >
                          <Plus size={12}/>
                        </button>
                      </div>
                    )}
                    {folders.map(f => {
                      const fid = `folder:${f.id}`;
                      const active = category === fid;
                      const isEditing = editingFolderId === f.id;
                      const count = (f.items || []).length;
                      return (
                        <div
                          key={f.id}
                          onClick={()=>{ if(!isEditing) setCategory(fid); }}
                          className={`group flex items-center h-9 w-full transition-colors cursor-pointer ${active?'text-zinc-200 bg-white/5':'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        >
                          <div className="w-[40px] flex justify-center shrink-0">
                            <Folder size={14} className={active?'text-[#C8A969]':''}/>
                          </div>
                          {!isSidebarCollapsed && (
                            isEditing ? (
                              <input
                                autoFocus value={editingFolderName}
                                onChange={(e)=>setEditingFolderName(e.target.value)}
                                onClick={(e)=>e.stopPropagation()}
                                onKeyDown={(e)=>{
                                  if(e.key==='Enter'){ handleRenameFolder(f.id, editingFolderName); setEditingFolderId(null); }
                                  if(e.key==='Escape'){ setEditingFolderId(null); }
                                }}
                                onBlur={()=>{
                                  if(editingFolderName.trim() && editingFolderName !== f.name) handleRenameFolder(f.id, editingFolderName);
                                  setEditingFolderId(null);
                                }}
                                className="flex-1 bg-[#1A1A1A] border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white outline-none focus:border-[#C8A969] mr-2"
                              />
                            ) : (
                              <>
                                <span className={`text-xs flex-1 truncate ${active?'font-bold':''}`}>{f.name}</span>
                                <span className="text-[10px] text-zinc-600 mr-1">{count || ''}</span>
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 mr-1.5 transition-opacity">
                                  <button
                                    onClick={(e)=>{ e.stopPropagation(); setEditingFolderId(f.id); setEditingFolderName(f.name); }}
                                    className="p-1 text-zinc-500 hover:text-white rounded"
                                    title="이름 변경"
                                  ><Pencil size={11}/></button>
                                  <button
                                    onClick={(e)=>{ e.stopPropagation(); handleDeleteFolder(f.id); }}
                                    className="p-1 text-zinc-500 hover:text-red-400 rounded"
                                    title="폴더 삭제"
                                  ><Trash2 size={11}/></button>
                                </div>
                              </>
                            )
                          )}
                        </div>
                      );
                    })}
                    {!isSidebarCollapsed && showNewFolderInput && (
                      <div className="flex items-center h-9 pl-5 pr-2 gap-1">
                        <FolderPlus size={12} className="text-[#C8A969] shrink-0"/>
                        <input
                          autoFocus value={newFolderName}
                          onChange={(e)=>setNewFolderName(e.target.value)}
                          onKeyDown={(e)=>{
                            if(e.key==='Enter'){ handleCreateFolder(newFolderName); setNewFolderName(''); setShowNewFolderInput(false); }
                            if(e.key==='Escape'){ setShowNewFolderInput(false); setNewFolderName(''); }
                          }}
                          placeholder="폴더 이름"
                          className="flex-1 min-w-0 bg-[#1A1A1A] border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white outline-none focus:border-[#C8A969]"
                        />
                        <button
                          onClick={()=>{ handleCreateFolder(newFolderName); setNewFolderName(''); setShowNewFolderInput(false); }}
                          className="p-1 text-zinc-500 hover:text-emerald-400 rounded"
                        ><Check size={11}/></button>
                        <button
                          onClick={()=>{ setShowNewFolderInput(false); setNewFolderName(''); }}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded"
                        ><X size={11}/></button>
                      </div>
                    )}
                    {!isSidebarCollapsed && folders.length === 0 && !showNewFolderInput && (
                      <button
                        onClick={()=>setShowNewFolderInput(true)}
                        className="flex items-center h-9 w-full pl-5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        <Plus size={12} className="mr-2"/> 폴더 추가
                      </button>
                    )}
                    {isSidebarCollapsed && folders.map(f => {
                      const fid = `folder:${f.id}`;
                      const active = category === fid;
                      return (
                        <button
                          key={f.id}
                          onClick={()=>setCategory(fid)}
                          title={f.name}
                          className={`flex items-center h-9 w-full transition-colors ${active?'text-zinc-200 bg-white/5':'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        >
                          <div className="w-[40px] flex justify-center"><Folder size={14} className={active?'text-[#C8A969]':''}/></div>
                        </button>
                      );
                    })}
                  </div>
                );
              }
              const active=category===cat.id;
              return (
                <button key={cat.id} onClick={()=>setCategory(cat.id)}
                  className={`flex items-center h-10 w-full transition-colors ${active?'text-zinc-200 bg-white/5':'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                  <div className="w-[40px] flex justify-center shrink-0">{cat.icon}</div>
                  {!isSidebarCollapsed && <span className={`text-xs ${active?'font-bold':''}`}>{cat.name}</span>}
                </button>
              );
            })}
            <div className="h-px bg-white/5 my-1 mx-3"/>
            <button onClick={handleNewPrompt} className="flex items-center h-10 w-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
              <div className="w-[40px] flex justify-center"><Plus size={18}/></div>
              {!isSidebarCollapsed && <span className="text-xs">새 프롬프트</span>}
            </button>
            <button onClick={()=>setQuickDrawerOpen(true)} className="flex items-center h-10 w-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
              <div className="w-[40px] flex justify-center"><PenTool size={16}/></div>
              {!isSidebarCollapsed && <span className="text-xs">아이디어 튜닝룸</span>}
            </button>
          </nav>
          {isAdmin && (
            <>
              <div className="border-t border-white/5 py-2 flex flex-col gap-0.5">
                <button onClick={handleExportData} className="flex items-center h-10 w-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors" title="데이터 내보내기">
                  <div className="w-[40px] flex justify-center"><Download size={16}/></div>
                  {!isSidebarCollapsed && <span className="text-xs">내보내기</span>}
                </button>
                <button onClick={()=>importInputRef.current?.click()} className="flex items-center h-10 w-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors" title="데이터 가져오기">
                  <div className="w-[40px] flex justify-center"><FileJson size={16}/></div>
                  {!isSidebarCollapsed && <span className="text-xs">가져오기</span>}
                </button>
                <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportData} />
              </div>
              <div className="h-14 flex items-center justify-center border-t border-white/5">
                <button onClick={()=>setIsAdminMode(!isAdminMode)} className={`p-2 rounded-lg transition-colors ${isAdminMode?'text-purple-400 bg-purple-500/10':'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'}`} title="관리자 모드">
                  <Shield size={16}/>
                </button>
              </div>
            </>
          )}
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b border-white/5 bg-[#050505]/90 flex items-center px-6 gap-4 shrink-0">
            <div className="flex items-baseline gap-1.5">
              <h1 className="app-title text-2xl tracking-wide flex items-baseline gap-1.5 text-white"><span className="font-light">Prompt</span> <span className="font-semibold">Arc</span></h1>
              <span className="text-[10px] text-[#C8A969] font-bold tracking-widest">v3.0</span>
            </div>
            <div className="flex-1 relative max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13}/>
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="검색..."
                className="w-full bg-[#121212] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-white outline-none focus:border-[#C8A969]/50 placeholder:text-zinc-600"/>
              {searchTerm && <button onClick={()=>setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"><X size={12}/></button>}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 rounded-lg p-0.5">
                <button onClick={()=>setViewMode('small')} className={`p-1.5 rounded transition-colors ${viewMode==='small'?'bg-[#1A1A1A] text-[#C8A969]':'text-zinc-500'}`}><Grid size={13}/></button>
                <button onClick={()=>setViewMode('normal')} className={`p-1.5 rounded transition-colors ${viewMode==='normal'?'bg-[#1A1A1A] text-[#C8A969]':'text-zinc-500'}`}><Layout size={13}/></button>
                <button onClick={()=>setViewMode('large')} className={`p-1.5 rounded transition-colors ${viewMode==='large'?'bg-[#1A1A1A] text-[#C8A969]':'text-zinc-500'}`}><Maximize2 size={13}/></button>
              </div>
              <div className="relative">
                <button
                  onClick={()=>{ setFilterPopoverOpen(!filterPopoverOpen); setSortPopoverOpen(false); }}
                  className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${filterCount>0 ? 'text-[#C8A969] bg-[#C8A969]/10 hover:bg-[#C8A969]/15' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                  title="필터"
                >
                  <FilterIcon size={12}/> 필터
                  {/* 배지 자리 항상 확보 — filterCount === 0 일 땐 invisible로 폭만 유지 */}
                  <span
                    aria-hidden={filterCount === 0}
                    className={`ml-0.5 px-1.5 py-0.5 rounded bg-[#C8A969]/20 text-[#C8A969] text-[9px] font-bold leading-none inline-block text-center ${filterCount > 0 ? '' : 'invisible'}`}
                    style={{ minWidth: 14 }}
                  >{filterCount > 0 ? filterCount : 0}</span>
                </button>
                {filterPopoverOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={()=>setFilterPopoverOpen(false)}/>
                    <div ref={filterPopoverRef} className="nx-popover-panel absolute top-9 right-0 w-56 z-50 py-1">
                      <div className="flex items-center justify-between px-4 pt-2 pb-1">
                        <span className="nx-popover-section-label" style={{padding:0}}>스타일</span>
                        {filterCount > 0 && (
                          <button
                            onClick={()=>setFilters({ style:null, theme:null, unanalyzed:false })}
                            className="text-[10px] text-zinc-500 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
                          >초기화</button>
                        )}
                      </div>
                      {STYLE_FILTERS.map(f=>(
                        <button key={f.id}
                          onClick={()=>setFilters(prev=>({ ...prev, style: prev.style===f.id ? null : f.id }))}
                          className={`nx-popover-item ${filters.style===f.id ? 'is-active' : ''}`}
                        >
                          <span>{f.label}</span>{filters.style===f.id && <Check size={12}/>}
                        </button>
                      ))}
                      <div className="nx-popover-divider"/>
                      <div className="nx-popover-section-label">테마</div>
                      {THEME_FILTERS.map(f=>(
                        <button key={f.id}
                          onClick={()=>setFilters(prev=>({ ...prev, theme: prev.theme===f.id ? null : f.id }))}
                          className={`nx-popover-item ${filters.theme===f.id ? 'is-active' : ''}`}
                        >
                          <span>{f.label}</span>{filters.theme===f.id && <Check size={12}/>}
                        </button>
                      ))}
                      {isAdmin && (
                        <>
                          <div className="nx-popover-divider"/>
                          <div className="nx-popover-section-label" style={{color:'#a78bfa'}}>관리자</div>
                          <button
                            onClick={()=>setFilters(prev=>({ ...prev, unanalyzed: !prev.unanalyzed }))}
                            className={`nx-popover-item ${filters.unanalyzed ? 'is-active' : ''}`}
                            style={filters.unanalyzed ? {color:'#c4b5fd'} : undefined}
                          >
                            <span>미분석</span>{filters.unanalyzed && <Check size={12}/>}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="relative">
                <button onClick={()=>{ setSortPopoverOpen(!sortPopoverOpen); setFilterPopoverOpen(false); }} className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg">
                  <ArrowUpDown size={12}/> {sortLabel}
                </button>
                {sortPopoverOpen && (
                  <div ref={sortPopoverRef} className="nx-popover-panel absolute top-9 right-0 w-36 z-50 py-1">
                    {['latest','oldest','popular','top_rated'].map(s=>(
                      <button key={s} onClick={()=>{setSortOption(s);setSortPopoverOpen(false);}}
                        className={`nx-popover-item ${sortOption===s ? 'is-active' : ''}`}>
                        <span>{({latest:'최신순',oldest:'오래된 순',popular:'조회순',top_rated:'인기순'})[s]}</span>
                        {sortOption===s&&<Check size={12}/>}
                      </button>
                    ))}
                    <div className="fixed inset-0 -z-10" onClick={()=>setSortPopoverOpen(false)}/>
                  </div>
                )}
              </div>
              <span className="text-xs font-mono text-[#C8A969] font-bold">{filteredPrompts.length}</span>
            </div>
          </header>

          <main ref={mainScrollRef} onScroll={e=>setShowTopBtn(e.target.scrollTop>300)} className="flex-1 overflow-y-auto arc-scrollbar px-6 pt-4 pb-8">
            {prompts.length===0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center">
                  <Plus size={24} className="text-zinc-600"/>
                </div>
                <p className="text-sm text-zinc-500">아직 저장된 프롬프트가 없어요</p>
                <div className="flex gap-3">
                  <button onClick={handleNewPrompt} className="px-4 py-2 bg-[#C8A969] text-black rounded-lg text-xs font-bold">새 프롬프트 추가</button>
                  <button onClick={()=>{}} className="px-4 py-2 bg-white/5 border border-white/10 text-zinc-300 rounded-lg text-xs">이미지 드래그 & 드롭</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                {masonryColumns.map((col,ci)=>(
                  <div key={ci} className="flex flex-col gap-3 flex-1 min-w-0">
                    {col.map(p=>(
                      <ArcPromptCard key={p.id} prompt={p} currentUserId="local" isAdminMode={isAdminMode} isSelected={selectedItems.has(p.id)}
                        onClick={()=>setViewPrompt(p)}
                        onDelete={id=>setDeleteConfirm({isOpen:true,id})}
                        onToggleSelect={id=>{ const s=new Set(selectedItems); s.has(id)?s.delete(id):s.add(id); setSelectedItems(s); }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
            {visibleCount<filteredPrompts.length && <div ref={observerTarget} className="flex justify-center py-8"><Loader2 className="animate-spin text-zinc-600" size={20}/></div>}
          </main>
        </div>

        {/* Modals */}
        {isEditModalOpen && <ArcEditModal initialData={editingPrompt} onSave={handleSave} onClose={()=>{setEditModalOpen(false);setEditingPrompt(null);}} showToast={showToast} isSaving={isSaving}/>}
        {viewPrompt && (
          <ArcDetailModal
            prompt={prompts.find(p=>p.id===viewPrompt.id)||viewPrompt}
            onClose={()=>setViewPrompt(null)}
            onEdit={stepIdx=>{ const p=prompts.find(q=>q.id===viewPrompt.id)||viewPrompt; setEditingPrompt({...p,initialStep:stepIdx}); setViewPrompt(null); setEditModalOpen(true); }}
            onDelete={id=>setDeleteConfirm({isOpen:true,id})}
            onLike={handleLike} onPin={handleTogglePin} onLive={handleToggleLive}
            onFavorite={handleToggleFavorite}
            isLiked={likedIds.has(viewPrompt.id)}
            isFavorite={favoriteIds.has(viewPrompt.id)}
            onSendToApp={handleSendToApp}
            folders={folders}
            onToggleFolderItem={handleToggleFolderItem}
            onCreateFolder={handleCreateFolder}
            showToast={showToast} currentUserId={user?.uid || 'anonymous'}
          />
        )}
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 p-6 rounded-xl max-w-sm w-full text-center shadow-2xl">
              <Trash2 size={32} className="mx-auto text-red-500 mb-4"/>
              <h3 className="text-lg font-bold text-white mb-2">삭제하시겠습니까?</h3>
              {deleteConfirm.id==='BATCH' && <p className="text-xs text-zinc-500 mb-2">선택한 {selectedItems.size}개 항목이 삭제됩니다.</p>}
              <div className="flex gap-3 justify-center mt-6">
                <button onClick={()=>setDeleteConfirm({isOpen:false,id:null})} className="px-5 py-2 bg-zinc-800 text-white rounded-lg text-sm">취소</button>
                <button onClick={performDelete} className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm">{isDeleting?'삭제 중...':'삭제하기'}</button>
              </div>
            </div>
          </div>
        )}
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 z-[70] border text-sm font-medium ${toast.type==='error'?'bg-red-950 border-red-800 text-red-200':'bg-zinc-900 border-zinc-800 text-white'}`}>
            {toast.type==='error'?<AlertTriangle size={14}/>:<Check size={14}/>} {toast.message}
          </div>
        )}
        {showTopBtn && (
          <button onClick={()=>mainScrollRef.current?.scrollTo({top:0,behavior:'smooth'})}
            className="fixed bottom-8 right-8 z-[60] p-3 bg-[#1A1A1A] text-zinc-400 hover:bg-[#C8A969] hover:text-black rounded-full shadow-2xl border border-white/10 transition-all">
            <ArrowUp size={18}/>
          </button>
        )}
      </div>
    </div>
  );
}

function ArcPromptCard({ prompt, onClick, onDelete, currentUserId, isAdminMode, isSelected, onToggleSelect }) {
  const videoUrl = Array.isArray(prompt.videos) && typeof prompt.videos[0] === 'string' ? prompt.videos[0] : null;
  // 영상 단독 카드 = type 'video' 명시 OR 이미지/썸네일 없이 영상만 있는 경우.
  const baseImage = prompt.thumbnail||(prompt.images?.length>0?prompt.images[0]:prompt.image);
  // 이미지가 없으면 Cloudinary 자동 비디오 썸네일을 시도.
  const videoPoster = !baseImage && videoUrl ? cloudinaryVideoThumb(videoUrl) : null;
  const displayImage = baseImage || videoPoster;
  const isVideoOnly = (prompt.type === 'video') || (!baseImage && !!videoUrl);
  const [hov,setHov]=useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hov) {
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [hov, videoUrl]);

  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className={`group bg-[#111111] rounded-xl border transition-all cursor-pointer overflow-hidden relative break-inside-avoid ${isSelected?'border-purple-500/50':'border-white/5 hover:border-[#C8A969]/50'}`}
      style={{ boxShadow: hov?'0 8px 32px rgba(200,169,105,0.08)':'none' }}
    >
      <div className="relative w-full">
        {isVideoOnly && !displayImage ? (
          // 🎬 영상 전용 + 자동 썸네일도 없는 경우 (Cloudinary 외부 URL 등)
          <div className="relative w-full aspect-video bg-gradient-to-br from-[#1a1521] to-[#0a0a0a] flex items-center justify-center">
            <div className={`text-5xl transition-transform ${hov ? 'scale-90 opacity-30' : 'scale-100 opacity-80'}`}>🎬</div>
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                muted
                loop
                playsInline
                preload="metadata"
                className={`absolute inset-0 w-full h-full object-cover bg-black ${hov ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`}
              />
            )}
          </div>
        ) : (
          <>
            <PromptImage src={displayImage} alt={prompt.title} className={`w-full h-auto object-scale-down block bg-[#0A0A0A] ${videoUrl && hov ? 'opacity-0' : 'opacity-100'} transition-opacity`}/>
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                muted
                loop
                playsInline
                preload="metadata"
                className={`absolute inset-0 w-full h-full object-cover bg-black ${hov ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`}
              />
            )}
          </>
        )}
      </div>
      {prompt.isLive && <div className="absolute top-0 left-0 px-2 py-0.5 bg-rose-950/80 text-rose-200 text-[9px] font-bold rounded-br-lg z-30 tracking-wider">LIVE</div>}
      {/* 영상 카드: ▶ VIDEO 배지 + hover 시 옆에 태그 한 줄로 노출 */}
      {videoUrl && (
        <div className="absolute bottom-2 left-2 z-30 flex items-center gap-1.5 max-w-[calc(100%-1rem)]">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-bold text-white shrink-0">
            <Play size={10} fill="currentColor"/> VIDEO
          </div>
          <div className={`flex items-center gap-1 overflow-hidden transition-opacity ${hov ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {(prompt.tags || []).slice(0, 4).map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-bold text-zinc-200 whitespace-nowrap">#{tag}</span>
            ))}
          </div>
        </div>
      )}
      {prompt.images?.length>1 && <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white z-20">+{prompt.images.length-1}</div>}
      {isAdminMode && (
        <div className="absolute top-2 left-2 z-40" onClick={e=>e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={e=>{e.stopPropagation();onToggleSelect(prompt.id);}} className="w-3.5 h-3.5 accent-purple-500 cursor-pointer"/>
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-40">
        <button onClick={e=>{e.stopPropagation();onDelete(prompt.id);}} className="p-1.5 rounded-lg bg-[#151515]/80 text-zinc-300 hover:text-red-400 backdrop-blur-sm"><Trash2 size={13}/></button>
      </div>
      {/* 이미지 카드 hover: 하단 태그 (기존 유지) */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 z-20 pointer-events-none">
        {!videoUrl && (prompt.tags||[]).map((tag,i)=><span key={i} className="px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-bold text-zinc-300">#{tag}</span>)}
      </div>
    </div>
  );
}

function ArcEditModal({ initialData, onSave, onClose, showToast, isSaving }) {
  const { user, isAdmin } = useAuth();
  const currentUid = user?.uid || null;
  const ownerUid = initialData?.ownerUid || initialData?.authorId || null;
  const isAuthor = !ownerUid || (currentUid && currentUid === ownerUid);
  const canModerate = isAdmin || isAuthor;
  const initImages = initialData?.images?.length?[...initialData.images]:(initialData?.image?[initialData.image]:[]);
  const initSP = initialData?.stepPrompts?.length?[...initialData.stepPrompts]:[initialData?.content||''];
  const initST = initialData?.stepTags?.length?[...initialData.stepTags]:initImages.map(()=>initialData?.tags||['기타']);
  const initSK = initialData?.stepKeywords?.length?[...initialData.stepKeywords]:initImages.map(()=>'');
  const initSD = initialData?.stepDescriptions?.length?[...initialData.stepDescriptions]:initImages.map(()=>'');
  const initSL = initialData?.stepLabels?.length?[...initialData.stepLabels]:initImages.map(()=>'');
  const initVideos = Array.isArray(initialData?.videos) ? [...initialData.videos] : [];

  // type: 'image' (기본) | 'video'. 명시 안 됐으면 데이터로 추론.
  const initType = initialData?.type
    || (initVideos.length > 0 && initImages.length === 0 ? 'video' : 'image');
  const [data,setData]=useState({...initialData,type:initType,images:initImages,videos:initVideos,stepPrompts:initSP,stepTags:initST,stepKeywords:initSK,stepDescriptions:initSD,stepLabels:initSL});
  const [mainIdx,setMainIdx]=useState(0);
  const [copied,setCopied]=useState(false);
  const [isDragImg,setIsDragImg]=useState(false);

  // Object URLs for unsaved video File previews — track to revoke on cleanup.
  const videoPreviews = useMemo(() => {
    return (data.videos || []).map(v => (v instanceof File) ? URL.createObjectURL(v) : v);
  }, [data.videos]);
  useEffect(() => {
    return () => { videoPreviews.forEach(u => { if (u?.startsWith?.('blob:')) URL.revokeObjectURL(u); }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVideoFiles = (files) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;
    if ((data.videos || []).length >= 1) {
      showToast?.('영상은 1개까지만 첨부할 수 있어요', 'error');
      return;
    }
    const file = arr[0];
    if (!isVideoFile(file)) {
      showToast?.('지원하지 않는 영상 형식이에요 (mp4, webm, mov만 가능)', 'error');
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      showToast?.(`영상은 50MB 이하만 가능해요 (현재 ${mb}MB)`, 'error');
      return;
    }
    setData(prev => ({ ...prev, videos: [...(prev.videos || []), file] }));
  };

  const handleRemoveVideo = (idx) => {
    setData(prev => {
      const next = [...(prev.videos || [])];
      const removed = next.splice(idx, 1);
      // Revoke any object URL associated with a File that we're dropping.
      if (removed[0] instanceof File) {
        // The preview URL is in videoPreviews — recompute happens on next render.
      }
      return { ...prev, videos: next };
    });
  };

  const handleTabChange=(idx)=>{ setMainIdx(idx); setData(p=>({...p,content:p.stepPrompts?.[idx]||''})); };

  const toggleTag=(tagId)=>{
    setData(prev=>{
      const raw=Array.isArray(prev.stepTags?.[mainIdx])?prev.stepTags[mainIdx]:['기타'];
      const cur=raw.filter(t => t && typeof t === 'string'); // 빈 값/null 제거
      let newT;
      if(cur.includes(tagId)){ newT=cur.filter(t=>t!==tagId); if(!newT.length)newT=['기타']; }
      else { newT=tagId==='기타'?['기타']:[...cur.filter(t=>t!=='기타'),tagId]; }
      const st=[...(prev.stepTags||[])]; st[mainIdx]=newT;
      return {...prev,tags:newT,stepTags:st};
    });
  };

  const handleImgFiles=(files)=>{
    processMultipleFiles(files,data.images.length,(res)=>{
      setData(prev=>{
        const ni=[...(prev.images||[]),...res];
        return {...prev,images:ni,stepPrompts:[...(prev.stepPrompts||[]),...res.map(()=>'')],stepLabels:[...(prev.stepLabels||[]),...res.map(()=>'')],stepTags:[...(prev.stepTags||[]),...res.map(()=>['기타'])],stepKeywords:[...(prev.stepKeywords||[]),...res.map(()=>'')],stepDescriptions:[...(prev.stepDescriptions||[]),...res.map(()=>'')]};
      });
    },showToast);
  };

  // 현재 표시 중인 미디어를 Gemini-2.5-flash로 분석.
  // - 이미지: 디자인/스타일 키워드 + 분류 태그
  // - 영상: 모션/움직임/속도감/타이포 애니메이션 + 자동 'Motion' 태그
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const runAiAnalyze = async () => {
    // 영상 모드 판정: type 명시 OR videos 배열에 뭔가 있으면 (File 또는 URL).
    const videoEntry = data.videos?.[0];
    const hasVideo = videoEntry instanceof File || (typeof videoEntry === 'string' && videoEntry);
    const isVideoMode = data.type === 'video' || (hasVideo && !data.images?.length);
    const currentImg = data.images?.[mainIdx];

    if (isVideoMode && !hasVideo) {
      showToast?.('분석할 영상이 없어요. 영상을 먼저 업로드하세요.', 'error'); return;
    }
    if (!isVideoMode && !currentImg) {
      showToast?.('분석할 이미지가 없어요. 먼저 이미지를 업로드하세요.', 'error'); return;
    }
    if (!GEMINI_API_KEY) { showToast?.('Gemini API 키가 설정되지 않았습니다.', 'error'); return; }
    setIsAiAnalyzing(true);
    showToast?.(isVideoMode ? '영상 첫 프레임 캡처 중...' : 'AI 분석 중...');
    try {
      let base64Data;
      if (isVideoMode) {
        // File 또는 URL 어느 쪽이든 canvas로 첫 프레임 추출.
        // Cloudinary URL은 cloudinaryVideoThumb로 빠르게 처리 가능하지만,
        // 일관성을 위해 동일하게 captureVideoFirstFrame 사용.
        let dataUrl;
        try {
          dataUrl = await captureVideoFirstFrame(videoEntry);
        } catch (capErr) {
          // captureVideoFirstFrame 실패 시 (CORS 등) Cloudinary 자동 썸네일로 fallback
          console.warn('[PromptArc] 첫 프레임 캡처 실패, Cloudinary 썸네일 fallback 시도', capErr);
          const thumbUrl = typeof videoEntry === 'string' ? cloudinaryVideoThumb(videoEntry) : null;
          if (!thumbUrl) throw capErr;
          const res = await fetch(thumbUrl);
          if (!res.ok) throw new Error(`썸네일 fetch 실패: ${res.status}`);
          const blob = await res.blob();
          dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(String(r.result));
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        }
        base64Data = dataUrl.split(',')[1];
        showToast?.('영상 모션 분석 중...');
      } else {
        // 이미지 모드: 기존 로직
        const target = currentImg;
        if (target.startsWith('data:')) {
          base64Data = target.split(',')[1];
        } else {
          const res = await fetch(target);
          if (!res.ok) throw new Error(`미디어 fetch 실패: ${res.status}`);
          const blob = await res.blob();
          base64Data = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(String(r.result).split(',')[1]);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        }
      }
      const TAG_OPTIONS = ARC_CATEGORIES
        .filter(c => c.id !== 'all' && c.type !== 'divider' && c.type !== 'folders' && c.id !== '즐겨찾기')
        .map(c => c.id);

      const STYLE_REQ = '2D/흑백, 3D/렌더링, 캘리그라피 중 하나';
      const THEME_REQ = 'RPG/판타지, 캐주얼/카툰, SF/사이버펑크 중 하나';
      const prompt = isVideoMode
        ? `이 영상의 첫 프레임 썸네일을 보고 영상 모션을 추정 분석하세요. 모션 스타일, 움직임 방식, 속도감, 타이포그래피 애니메이션 특징, 분위기를 중심으로 작성하세요.\n반드시 다음 형식의 JSON만 출력 (코드블록·설명 금지):\n{"title": "2~4단어 한글 제목", "keywords": "콤마로 구분된 한글 모션 키워드 4~6개 (반드시 [${STYLE_REQ}] 1개 + [${THEME_REQ}] 1개를 포함)", "description": "이 영상의 모션 스타일/속도감/분위기를 한 문장으로 설명 (한글 40~100자)"}`
        : `이 이미지와 프롬프트를 분석해서 JSON으로 반환하세요.\n허용 태그 ID 목록: ${TAG_OPTIONS.join(', ')}\n반드시 다음 형식의 JSON만 출력 (코드블록·설명 금지):\n{"title": "2~4단어 한글 제목", "tags": ["태그ID1","태그ID2"], "keywords": "콤마로 구분된 한글 키워드 4~6개 (반드시 [${STYLE_REQ}] 1개 + [${THEME_REQ}] 1개를 포함)", "description": "이 이미지를 한 문장으로 설명 (한글 30~80자)"}`;

      const body = {
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      };
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(new Error("Gemini timeout 30s")), 30000);
      let response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal }
        );
      } finally { clearTimeout(t); }
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini ${response.status}: ${errText.slice(0, 200)}`);
      }
      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('AI 응답이 비어있어요');
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { throw new Error('AI 응답 JSON 파싱 실패'); }

      setData(prev => {
        const sk = [...(prev.stepKeywords || [])]; sk[mainIdx] = parsed.keywords || sk[mainIdx] || '';
        const sd = [...(prev.stepDescriptions || [])]; sd[mainIdx] = parsed.description || sd[mainIdx] || '';
        const st = [...(prev.stepTags || [])];
        if (isVideoMode) {
          // 영상은 무조건 'Motion' 태그
          st[mainIdx] = ['Motion'];
        } else if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
          const filtered = parsed.tags.filter(t => TAG_OPTIONS.includes(t));
          st[mainIdx] = filtered.length > 0 ? filtered : ['기타'];
        }
        // 제목은 비어있을 때만 자동 입력 (사용자가 이미 적은 제목은 덮어쓰지 않음)
        const nextTitle = (!prev.title || !prev.title.trim()) && parsed.title
          ? String(parsed.title).trim()
          : prev.title;
        return {
          ...prev,
          title: nextTitle,
          stepKeywords: sk, aiKeywords: sk[mainIdx],
          stepDescriptions: sd, description: sd[mainIdx],
          stepTags: st, tags: st[mainIdx] || prev.tags,
        };
      });
      showToast?.(isVideoMode ? '영상 분석 완료! Motion 태그 자동 적용됨' : 'AI 분석 완료!');
    } catch (e) {
      console.error('[PromptArc] AI 분석 실패', e);
      showToast?.(`AI 분석 실패: ${e.message || e}`, 'error');
    } finally { setIsAiAnalyzing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="fixed top-4 right-4 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10"><X size={22}/></button>
      <div className="w-full max-w-5xl h-[90vh] bg-[#111] rounded-2xl border border-white/10 flex overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
        {/* Left: media (image OR video) */}
        <div className="w-[60%] bg-[#050505] relative flex flex-col"
          onDragOver={e=>data.type === 'image' && e.preventDefault()}
          onDragEnter={()=>data.type === 'image' && setIsDragImg(true)}
          onDragLeave={()=>setIsDragImg(false)}
          onDrop={e=>{ if(data.type !== 'image') return; e.preventDefault();setIsDragImg(false);handleImgFiles(e.dataTransfer.files);}}>
          {/* Type tabs (only meaningful before media is added) */}
          <div className="absolute top-3 left-3 z-20 flex gap-1 p-1 rounded-lg bg-black/50 border border-white/10 backdrop-blur-sm">
            <button
              onClick={() => setData(prev => ({ ...prev, type: 'image' }))}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1.5 ${data.type === 'image' ? 'bg-[#C8A969]/20 text-[#C8A969]' : 'text-zinc-500 hover:text-zinc-300'}`}
            ><ImageIcon size={11}/> 이미지</button>
            <button
              onClick={() => setData(prev => ({ ...prev, type: 'video' }))}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1.5 ${data.type === 'video' ? 'bg-[#C8A969]/20 text-[#C8A969]' : 'text-zinc-500 hover:text-zinc-300'}`}
            ><Film size={11}/> 영상</button>
          </div>

          {/* LIVE / 추천 토글 (관리자 또는 작성자 전용) */}
          {canModerate && (
            <div className="absolute top-3 right-3 z-20 flex gap-1 p-1 rounded-lg bg-black/50 border border-white/10 backdrop-blur-sm">
              <button
                onClick={() => setData(prev => ({ ...prev, isLive: !prev.isLive }))}
                title="LIVE 딱지 토글"
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-colors ${data.isLive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-zinc-500 hover:text-rose-300 border border-transparent'}`}
              >LIVE</button>
              <button
                onClick={() => setData(prev => ({ ...prev, isPinned: !prev.isPinned }))}
                title="추천 고정 토글"
                className={`px-2 py-1.5 rounded-md text-[10px] transition-colors flex items-center gap-1 ${data.isPinned ? 'bg-[#C8A969]/20 text-[#C8A969] border border-[#C8A969]/40' : 'text-zinc-500 hover:text-[#C8A969] border border-transparent'}`}
              >
                <Star size={11} fill={data.isPinned ? 'currentColor' : 'none'}/> 추천
              </button>
            </div>
          )}

          {data.type === 'video' ? (
            // Video-only mode
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              {videoPreviews.length === 0 ? (
                <label className="flex flex-col items-center gap-3 cursor-pointer p-12 border-2 border-dashed border-white/10 rounded-xl hover:border-white/30 transition-colors">
                  <Film size={40} className="text-zinc-600"/>
                  <span className="text-sm text-zinc-400 font-bold">영상을 클릭해서 추가</span>
                  <span className="text-[11px] text-zinc-600">mp4 / webm / mov · 최대 50MB</span>
                  <input type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={e=>{ handleVideoFiles(e.target.files); e.target.value=''; }}/>
                </label>
              ) : (
                <div className="relative w-full max-w-xl">
                  <video
                    src={videoPreviews[0]}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full bg-black rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => handleRemoveVideo(0)}
                    className="absolute -top-2 -right-2 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full shadow-lg"
                    title="영상 제거"
                  ><X size={14}/></button>
                  {data.videos[0] instanceof File && (
                    <div className="mt-2 text-[10px] text-zinc-500 text-center font-mono">
                      {data.videos[0].name} · {(data.videos[0].size/1024/1024).toFixed(1)}MB
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
          <>
          {!data.images?.length ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <label className="flex flex-col items-center gap-3 cursor-pointer p-8 border-2 border-dashed border-white/10 rounded-xl hover:border-white/30 transition-colors">
                <ImageIcon size={32} className="text-zinc-600"/>
                <span className="text-sm text-zinc-500">이미지를 드롭하거나 클릭해서 추가</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleImgFiles(e.target.files)}/>
              </label>
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center p-4">
                <PromptImage src={data.images[mainIdx]} className="max-w-full max-h-full object-scale-down"/>
              </div>
              {data.images.length>1 && (
                <>
                  <button onClick={()=>handleTabChange(mainIdx>0?mainIdx-1:data.images.length-1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronLeft size={18}/></button>
                  <button onClick={()=>handleTabChange(mainIdx<data.images.length-1?mainIdx+1:0)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronRight size={18}/></button>
                </>
              )}
              <div className="absolute bottom-4 left-4 flex gap-2 z-10">
                {data.images.map((img,idx)=>(
                  <div key={idx} onClick={()=>handleTabChange(idx)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer ${idx===mainIdx?'border-[#C8A969]':'border-transparent hover:border-white/30'}`}>
                    <img src={img} className="w-full h-full object-cover" alt=""/>
                  </div>
                ))}
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 text-zinc-600 hover:text-zinc-400">
                  <Plus size={18}/><input type="file" multiple accept="image/*" className="hidden" onChange={e=>handleImgFiles(e.target.files)}/>
                </label>
              </div>
            </>
          )}

          {/* Video slot (1 max) — only in image mode (image+video hybrid). 영상 전용 모드는 위에서 따로 처리. */}
          <div className={`absolute right-4 z-10 ${canModerate ? 'top-[60px]' : 'top-4'}`}>
            {videoPreviews.length === 0 ? (
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-[11px] text-zinc-500 hover:text-zinc-300 hover:border-white/40 cursor-pointer bg-black/30 backdrop-blur-sm">
                <Film size={13}/> 영상 추가
                <input type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={e=>{ handleVideoFiles(e.target.files); e.target.value=''; }}/>
              </label>
            ) : (
              <div className="relative group/video w-32 h-20 rounded-lg overflow-hidden border-2 border-[#C8A969]/60 bg-black">
                <video src={videoPreviews[0]} muted playsInline preload="metadata" className="w-full h-full object-cover"/>
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <Film size={18} className="text-white/90"/>
                </div>
                <button
                  onClick={()=>handleRemoveVideo(0)}
                  className="absolute top-1 right-1 p-1 bg-black/70 text-zinc-200 hover:text-red-400 rounded opacity-0 group-hover/video:opacity-100 transition-opacity"
                  title="영상 제거"
                ><X size={11}/></button>
                {data.videos[0] instanceof File && (
                  <div className="absolute bottom-1 left-1 text-[9px] text-white/80 font-mono bg-black/60 px-1.5 py-0.5 rounded">
                    {(data.videos[0].size/1024/1024).toFixed(1)}MB
                  </div>
                )}
              </div>
            )}
          </div>
          </>
          )}
        </div>
        {/* Right: form */}
        <div className="flex-1 flex flex-col bg-[#111]">
          <div className="px-5 pt-5 pb-3 border-b border-white/5 space-y-3">
            <div className="flex items-center gap-3">
              <input value={data.title||''} onChange={e=>setData({...data,title:e.target.value})} placeholder="제목을 입력하세요"
                className="flex-1 bg-transparent text-base font-bold text-zinc-200 outline-none placeholder:text-zinc-600 border-none"/>
              <button
                onClick={runAiAnalyze}
                disabled={isAiAnalyzing || (!data.images?.length && !(data.type === 'video' && data.videos?.[0]))}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="현재 미디어를 Gemini 2.5 Flash로 분석해서 제목·태그·키워드·설명을 자동 입력"
              >
                {isAiAnalyzing
                  ? <><Loader2 size={13} className="animate-spin"/> 분석 중...</>
                  : <><Sparkles size={13}/> AI 스마트 분석</>}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 arc-scrollbar space-y-5">
            {/* 카테고리 태그 (배경색 있는 뱃지) */}
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">카테고리 태그</div>
              <div className="flex flex-wrap gap-1.5">
                {ARC_CATEGORIES.filter(c=>c.id && c.name && c.type!=='divider' && c.type!=='folders' && c.id!=='all' && c.id!=='즐겨찾기').map(c=>{
                  const active=(data.stepTags?.[mainIdx]||[]).filter(Boolean).includes(c.id);
                  return <button key={c.id} onClick={()=>toggleTag(c.id)} className={`px-3 py-1.5 rounded-md text-[10px] border transition-colors ${active?'bg-[#C8A969]/20 text-[#C8A969] border-[#C8A969]/40 font-bold':'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>#{c.name}</button>;
                })}
              </div>
            </div>
            {/* 스타일 키워드 (테두리만 있는 작은 태그) */}
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">스타일 키워드</div>
              <input value={data.stepKeywords?.[mainIdx]||''} onChange={e=>{const a=[...(data.stepKeywords||[])];a[mainIdx]=e.target.value;setData({...data,stepKeywords:a,aiKeywords:e.target.value});}}
                placeholder="예) 2D/흑백, SF/사이버펑크, 네온" className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-3 text-[11px] text-zinc-300 outline-none focus:border-white/20"/>
              {(() => {
                const kws = (data.stepKeywords?.[mainIdx]||'').split(',').map(k=>k.trim()).filter(Boolean);
                if (!kws.length) return null;
                return (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {kws.map((k,i)=>(
                      <span key={i} className="px-2 py-0.5 border border-white/10 text-zinc-400 text-[9px] rounded">{k}</span>
                    ))}
                  </div>
                );
              })()}
            </div>
            {/* 설명 */}
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">설명</div>
              <textarea value={data.stepDescriptions?.[mainIdx]||''} onChange={e=>{const a=[...(data.stepDescriptions||[])];a[mainIdx]=e.target.value;setData({...data,stepDescriptions:a,description:e.target.value});}}
                className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-3 text-[11px] text-zinc-300 h-20 resize-none outline-none focus:border-white/20 arc-scrollbar"/>
            </div>
            {/* 스텝 탭 + 스텝별 목적/설명 */}
            {data.images?.length>1 && (
              <div className="space-y-2">
                <div className="flex gap-2 overflow-x-auto arc-scrollbar pb-1">
                  {data.images.map((_,idx)=>(
                    <button key={idx} onClick={()=>handleTabChange(idx)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border ${idx===mainIdx?'bg-[#C8A969]/20 text-[#C8A969] border-[#C8A969]/40':'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>
                      Step {idx+1}{data.stepLabels?.[idx]?` · ${data.stepLabels[idx]}`:''}
                    </button>
                  ))}
                </div>
                <input
                  value={data.stepLabels?.[mainIdx]||''}
                  onChange={e=>{ const a=[...(data.stepLabels||[])]; a[mainIdx]=e.target.value; setData({...data,stepLabels:a}); }}
                  placeholder="스텝 목적을 입력하세요 (예: 스케치, VisualFX 적용 등)"
                  className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-2.5 text-[11px] text-zinc-300 outline-none focus:border-white/20 placeholder:text-zinc-600"
                />
              </div>
            )}
            {/* 프롬프트 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono font-bold text-zinc-500">&gt;_ PROMPT{data.images?.length>1?` (Step ${mainIdx+1})`:''}</span>
                {(data.stepPrompts?.[mainIdx]) && (
                  <button onClick={()=>copyToClipboard(data.stepPrompts[mainIdx],()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);showToast('복사됐어요!');})}
                    className="px-3 py-1 text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    {copied?<><Check size={10}/>Copied!</>:<><Copy size={10}/>복사</>}
                  </button>
                )}
              </div>
              <textarea value={data.stepPrompts?.[mainIdx]||''} onChange={e=>{const a=[...(data.stepPrompts||[])];a[mainIdx]=e.target.value;setData({...data,stepPrompts:a,content:e.target.value});}}
                placeholder="프롬프트를 입력하세요..." className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-4 text-[11px] text-zinc-300 h-40 resize-none font-mono outline-none focus:border-white/20 arc-scrollbar"/>
            </div>
          </div>
          <div className="p-5 border-t border-white/5 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs border border-white/10 text-zinc-400 rounded-lg hover:bg-white/5">취소</button>
            <button onClick={()=>{ if(!data.title) return showToast('제목을 입력해주세요.','error'); onSave(data); }}
              disabled={isSaving} className="px-6 py-2 text-xs font-bold bg-[#C8A969] text-black rounded-lg hover:bg-[#A88949] disabled:opacity-50">
              {isSaving?'저장 중...':'저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArcDetailModal({ prompt, onClose, onEdit, onDelete, onLike, onPin, onLive, onFavorite, isLiked, isFavorite, onSendToApp, folders, onToggleFolderItem, onCreateFolder, showToast, currentUserId }) {
  const images = prompt.images?.length?prompt.images:(prompt.image?[prompt.image]:[]);
  const videoUrl = Array.isArray(prompt.videos) && typeof prompt.videos[0] === 'string' ? prompt.videos[0] : null;
  // Media tabs: 'video' (if present) + each image as own entry.
  const mediaTabs = [
    ...(videoUrl ? [{ type: 'video', src: videoUrl }] : []),
    ...images.map(src => ({ type: 'image', src })),
  ];
  const [mediaIdx, setMediaIdx] = useState(0);
  const activeMedia = mediaTabs[mediaIdx] || null;
  // Keep image-step semantics for the right-side form (uses mainIdx into prompt.stepXxx).
  const mainIdx = activeMedia?.type === 'image' ? (mediaIdx - (videoUrl ? 1 : 0)) : 0;
  const [copied,setCopied]=useState(false);
  const [showActions,setShowActions]=useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const folderMenuRef = useRef(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef(null);
  const isAuthor = (prompt.ownerUid && prompt.ownerUid === currentUserId) || (!prompt.ownerUid && (!prompt.authorId || prompt.authorId === currentUserId));
  const inAnyFolder = (folders || []).some(f => (f.items || []).includes(prompt.id));

  useEffect(() => {
    if (!folderMenuOpen) return;
    const onDocClick = (e) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target)) setFolderMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [folderMenuOpen]);

  useEffect(() => {
    if (!actionMenuOpen) return;
    const onDocClick = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setActionMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [actionMenuOpen]);

  const currentPrompt=prompt.stepPrompts?.[mainIdx]||prompt.content||'';
  const currentTags=Array.isArray(prompt.stepTags?.[mainIdx])?prompt.stepTags[mainIdx]:(prompt.tags||[]);
  const currentDesc=prompt.stepDescriptions?.[mainIdx]||prompt.description||'';
  const currentKws=(prompt.stepKeywords?.[mainIdx]||prompt.aiKeywords||'').split(',').map(k=>k.trim()).filter(Boolean);

  // STYLE_FILTERS 기반 — 태그만으로 어떤 스타일인지 판정
  const detectedStyles = useMemo(() => {
    const out = new Set();
    for (const f of STYLE_FILTERS) {
      if (matchesFilter(prompt, f)) out.add(f.id);
    }
    return out;
  }, [prompt]);

  const sendTargets = useMemo(() => {
    const list = [
      // 항상 표시
      { id:'typecore-sovereign', label:'타이프코어 소버린으로 편집', icon:<Type size={13}/> },
    ];
    // 2D/흑백 또는 캘리그라피 → 입체화
    if (detectedStyles.has('2d_bw') || detectedStyles.has('calligraphy')) {
      list.push({ id:'render-metrics', label:'렌더 메트릭스로 입체화', icon:<Box size={13}/> });
    }
    // 3D/렌더링 → 애니메이션
    if (detectedStyles.has('3d_render')) {
      list.push({ id:'motion-metrics', label:'모션 메트릭스로 애니메이션', icon:<Video size={13}/> });
    }
    // 항상 표시
    list.push({ id:'design-eval', label:'디자인 평가도구로 평가', icon:<Star size={13}/> });
    return list;
  }, [detectedStyles]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="fixed top-4 right-4 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10"><X size={22}/></button>
      <div className="w-full max-w-5xl h-[90vh] bg-[#111] rounded-2xl border border-white/10 flex overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
        {/* Left */}
        <div className="w-[60%] bg-[#050505] relative flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            {activeMedia?.type === 'video' ? (
              <video
                src={activeMedia.src}
                controls
                playsInline
                preload="metadata"
                className="max-w-full max-h-full bg-black rounded"
              />
            ) : (
              <PromptImage src={activeMedia?.src} className="max-w-full max-h-full object-scale-down"/>
            )}
          </div>
          {mediaTabs.length>1 && (
            <>
              <button onClick={()=>setMediaIdx(p=>p>0?p-1:mediaTabs.length-1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronLeft size={18}/></button>
              <button onClick={()=>setMediaIdx(p=>p<mediaTabs.length-1?p+1:0)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronRight size={18}/></button>
              <div className="absolute bottom-4 left-4 flex gap-2">
                {mediaTabs.map((m,idx)=>(
                  <div key={idx} onClick={()=>setMediaIdx(idx)} className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${idx===mediaIdx?'border-[#C8A969]':'border-transparent hover:border-white/30'}`}>
                    {m.type === 'video' ? (
                      <>
                        <video src={m.src} muted playsInline preload="metadata" className="w-full h-full object-cover bg-black"/>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                          <Play size={14} className="text-white" fill="currentColor"/>
                        </div>
                      </>
                    ) : (
                      <img src={m.src} className="w-full h-full object-cover" alt=""/>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Right */}
        <div className="flex-1 flex flex-col bg-[#111] relative">
          <div className="p-5 border-b border-white/5">
            <div className="text-base font-bold text-zinc-200 mb-1">{prompt.title||'Untitled'}</div>
            <div className="flex items-center gap-2 mt-3">
              {isAuthor && <>
                <button onClick={()=>onDelete(prompt.id)} className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13}/></button>
                <button onClick={()=>onEdit(mainIdx)} className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"><Edit2 size={13}/></button>
              </>}
              <button onClick={()=>onLike(prompt.id,isLiked)} className={`flex items-center gap-1 p-2 rounded-full bg-white/5 text-xs ${isLiked?'text-rose-400':'text-zinc-400 hover:text-white'}`} title="좋아요">
                <Heart size={13} fill={isLiked?'currentColor':'none'}/> {prompt.likeCount||0}
              </button>
              <button onClick={()=>onFavorite&&onFavorite(prompt.id)} className={`flex items-center gap-1 p-2 rounded-full bg-white/5 text-xs ${isFavorite?'text-[#C8A969]':'text-zinc-400 hover:text-white'}`} title="즐겨찾기 (개인)">
                <Star size={13} fill={isFavorite?'currentColor':'none'}/>
              </button>
              <div className="relative" ref={folderMenuRef}>
                <button
                  onClick={()=>setFolderMenuOpen(v=>!v)}
                  className={`flex items-center gap-1 p-2 rounded-full bg-white/5 text-xs ${inAnyFolder?'text-[#C8A969]':'text-zinc-400 hover:text-white'}`}
                  title="내 폴더에 저장"
                >
                  <FolderPlus size={13}/> 내 폴더
                </button>
                {folderMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#181818] border border-white/10 rounded-xl shadow-2xl p-2 z-[120]">
                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">내 폴더에 저장</div>
                    <div className="max-h-56 overflow-y-auto arc-scrollbar">
                      {(folders || []).length === 0 ? (
                        <div className="px-3 py-3 text-[11px] text-zinc-500 text-center">아직 폴더가 없어요</div>
                      ) : (
                        folders.map(f => {
                          const checked = (f.items || []).includes(prompt.id);
                          return (
                            <button
                              key={f.id}
                              onClick={()=>onToggleFolderItem && onToggleFolderItem(f.id, prompt.id)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-white/5 ${checked?'text-[#C8A969]':'text-zinc-300'}`}
                            >
                              <span className={`w-4 h-4 inline-flex items-center justify-center rounded border ${checked?'border-[#C8A969] bg-[#C8A969]/10':'border-white/20'}`}>
                                {checked && <Check size={10}/>}
                              </span>
                              <Folder size={12} className="text-zinc-500"/>
                              <span className="flex-1 truncate">{f.name}</span>
                              <span className="text-[9px] text-zinc-600">{(f.items || []).length}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="border-t border-white/5 mt-1 pt-2 px-1 flex items-center gap-1">
                      <input
                        value={newFolderName}
                        onChange={(e)=>setNewFolderName(e.target.value)}
                        onKeyDown={async (e)=>{
                          if(e.key==='Enter' && newFolderName.trim()){
                            await onCreateFolder?.(newFolderName.trim());
                            setNewFolderName('');
                          }
                        }}
                        placeholder="+ 새 폴더"
                        className="flex-1 bg-[#0A0A0A] border border-white/5 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-[#C8A969]"
                      />
                      <button
                        onClick={async ()=>{ if(newFolderName.trim()){ await onCreateFolder?.(newFolderName.trim()); setNewFolderName(''); } }}
                        className="p-1.5 text-zinc-500 hover:text-[#C8A969] rounded"
                      ><Plus size={12}/></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 arc-scrollbar space-y-4">
            {(() => {
              const cleanTags = currentTags.filter(t => t && typeof t === 'string');
              const cleanKws = currentKws.filter(Boolean);
              if (cleanTags.length === 0 && cleanKws.length === 0) return null;
              return (
                <div className="space-y-2">
                  {cleanTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cleanTags.map((t,i)=>(
                        <span key={i} className="px-2.5 py-1 bg-[#C8A969]/15 border border-[#C8A969]/30 text-[#C8A969] text-[10px] font-bold rounded-md">#{t}</span>
                      ))}
                    </div>
                  )}
                  {cleanKws.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cleanKws.map((k,i)=>(
                        <span key={`k${i}`} className="px-2 py-0.5 border border-white/10 text-zinc-500 text-[9px] rounded">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {currentDesc && <p className="text-[11px] text-zinc-400 leading-relaxed">{currentDesc}</p>}
            {images.length>1 && activeMedia?.type === 'image' && (
              <div className="flex gap-2 overflow-x-auto arc-scrollbar pb-1">
                {images.map((_,idx)=>(
                  <button key={idx} onClick={()=>setMediaIdx(idx + (videoUrl ? 1 : 0))}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border ${idx===mainIdx?'bg-[#C8A969]/20 text-[#C8A969] border-[#C8A969]/40':'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>
                    Step {idx+1}
                  </button>
                ))}
              </div>
            )}
            {currentPrompt && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-500">&gt;_ FINAL PROMPT{images.length>1?` (Step ${mainIdx+1})`:''}</span>
                  <button onClick={()=>copyToClipboard(currentPrompt,()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);showToast('복사됐어요!');})}
                    className="px-3 py-1 text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    {copied?<><Check size={10}/>Copied!</>:<><Copy size={10}/>복사</>}
                  </button>
                </div>
                <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4">
                  <pre className="text-[11px] text-zinc-300 font-mono whitespace-pre-wrap break-words leading-relaxed">{currentPrompt}</pre>
                </div>
              </div>
            )}

          </div>
          {/* 우측 하단 floating 액션 버튼 + 팝오버 (배너 코덱스 동일 스타일) */}
          <div ref={actionMenuRef} className="absolute right-6 bottom-6 z-[600]">
            <button
              onClick={()=>setActionMenuOpen(v=>!v)}
              className={`p-3 rounded-2xl transition-colors shadow-lg border ${actionMenuOpen ? 'bg-zinc-800 border-zinc-700' : 'bg-[#1c1c1e]/80 backdrop-blur border-transparent hover:border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'}`}
              title="이 프롬프트로 이어서 작업"
            >
              <MoreHorizontal className="w-5 h-5"/>
            </button>
            {actionMenuOpen && (
              <div className="absolute bottom-full right-0 mb-4 w-[210px] rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 border bg-[#1c1c1e] border-white/5">
                {sendTargets.map(t=>{
                  const isDisabled = !!APP_MAP[t.id]?.disabled;
                  return (
                  <button
                    key={t.id}
                    disabled={isDisabled}
                    onClick={()=>{
                      if (isDisabled) return;
                      setActionMenuOpen(false);
                      // 현재 step의 이미지/프롬프트를 명시적으로 payload에 실어 전달
                      const currentImageUrl = activeMedia?.type === 'image'
                        ? activeMedia.src
                        : (prompt.thumbnail || prompt.images?.[0] || '');
                      const enriched = {
                        ...prompt,
                        content: currentPrompt || prompt.content || '',
                        thumbnail: currentImageUrl,
                        // handleSendToApp이 prompt.images?.[0]도 보므로 첫 번째도 동기화
                        images: currentImageUrl ? [currentImageUrl, ...(prompt.images || []).slice(1)] : (prompt.images || []),
                      };
                      onSendToApp(t.id, enriched);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left ${isDisabled ? 'text-zinc-600 cursor-not-allowed opacity-50' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}
                    title={isDisabled ? '준비 중인 앱입니다' : undefined}
                  >
                    <span className="shrink-0" style={{color: APP_MAP[t.id]?.color}}>{t.icon}</span>
                    <span className="leading-snug flex-1">{t.label}</span>
                    {isDisabled && <span className="text-[8px] font-bold tracking-wider text-zinc-600 uppercase">준비중</span>}
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
