/* eslint-disable */
// ============================================================
// TYPECORE STUDIO — Platform Shell v2 (아카이브)
// 프롬프트 아크 통합 완료
// ※ 현재 라우팅은 main.jsx → App.jsx → Shell.jsx 경로를 사용한다.
//   이 파일은 v3 설계 참고용으로만 보관되며 더 이상 import 되지 않는다.
//   따라서 ESLint 검사에서 전체 제외한다.
// ============================================================
import { useState, createContext, useContext, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Plus, Search, Copy, Trash2, Edit2, X, Save, Tag, Layout, Type,
  Image as ImageIcon, Sparkles, Loader2, Wand2, Menu, Shield,
  Download, Upload, Check, AlertTriangle, ArrowRight, RefreshCw, Users, User,
  PenTool, ChevronRight, ChevronLeft, Maximize2, Heart, Eye, Settings, Filter, MoreVertical, LogOut, Package,
  Grid, List, ArrowUpDown, Minimize2, Folder, Calendar, Box, CheckCircle2, ChevronDown, SlidersHorizontal, Sun, Moon, Laptop, ExternalLink, Video, Star, MoreHorizontal, ListChecks, ArrowUp
} from "lucide-react";

// ============================================================
// GLOBAL PLATFORM CONTEXT
// ============================================================
const GlobalContext = createContext(null);

const THEME = {
  bg: "#0A0A0F", surface: "#111118", card: "#16161F",
  border: "#1E1E2E", accent: "#6C5CE7", accentSoft: "#2D2A4A",
  text: "#E8E6FF", textMuted: "#7A7A9A", textDim: "#3A3A5A",
};

const APP_REGISTRY = [
  { id: "banner-codex",        label: "배너 코덱스",       sub: "Banner Codex",        icon: "◈", desc: "배너 탐색 및 평가 시스템",                        group: "evaluate", color: "#E17055", canReceive: [],                                                                              canSend: ["design-eval"] },
  { id: "prompt-arc",          label: "프롬프트 아크",      sub: "Prompt Arc",          icon: "⊕", desc: "이지와 함께하는 프롬프트 공유 플랫폼",              group: "hub",      color: "#6C5CE7", canReceive: ["typecore-sovereign","typecore-breeze","render-metrics","motion-metrics","design-lexicon"], canSend: ["typecore-sovereign","typecore-breeze","render-metrics","motion-metrics","design-eval"] },
  { id: "typecore-sovereign",  label: "타이프코어 소버린",  sub: "Typecore Sovereign",  icon: "⟁", desc: "RPG류 게임의 타이포그래피 프롬프트 생성",            group: "generate", color: "#A29BFE", canReceive: ["prompt-arc"],                                                                  canSend: ["prompt-arc","render-metrics"] },
  { id: "typecore-breeze",     label: "타이프코어 브리즈",  sub: "Typecore Breeze",     icon: "◎", desc: "캐주얼 게임 · 타이포 · 캘리그라피 프롬프트 생성",  group: "generate", color: "#74B9FF", canReceive: ["prompt-arc"],                                                                  canSend: ["prompt-arc","render-metrics"] },
  { id: "render-metrics",      label: "렌더 메트릭스",      sub: "Render Metrics",      icon: "⬡", desc: "2D 플랫 이미지에 입체감 · 재질감을 입히는 프롬프트 생성", group: "generate", color: "#00CEC9", canReceive: ["prompt-arc","typecore-sovereign","typecore-breeze"],                    canSend: ["prompt-arc","motion-metrics","design-eval"] },
  { id: "motion-metrics",      label: "모션 메트릭스",      sub: "Motion Metrics",      icon: "⟳", desc: "생성된 결과물에 모션 효과를 만드는 프롬프트 생성",    group: "generate", color: "#FDCB6E", canReceive: ["prompt-arc","render-metrics"],                                             canSend: ["prompt-arc","design-eval"] },
  { id: "design-lexicon",      label: "디자인 렉시콘",      sub: "Design Lexicon",      icon: "⬢", desc: "버튼 · 아이콘 등 에셋 생성 프롬프트 생성기",          group: "generate", color: "#55EFC4", canReceive: [],                                                                              canSend: ["prompt-arc","design-eval"] },
  { id: "design-eval",         label: "디자인 평가도구",    sub: "Design Evaluator",    icon: "◉", desc: "브랜드 사이트 · 프로모션 · 배너 디자인 평가",          group: "evaluate", color: "#FD79A8", canReceive: ["banner-codex","prompt-arc","render-metrics","motion-metrics","design-lexicon"], canSend: [] },
];
const APP_MAP = Object.fromEntries(APP_REGISTRY.map(a => [a.id, a]));
const emptyPayload = () => ({ source: null, target: null, timestamp: null, prompt: { text: "", tags: [], style: "" }, image: { url: "", metadata: {} }, params: {} });

function GlobalProvider({ children }) {
  const [currentApp, setCurrentApp] = useState(null);
  const [payload, setPayload] = useState(emptyPayload());
  const [arcSaved, setArcSaved] = useState([]);
  const [notification, setNotification] = useState(null);

  const navigate = useCallback((targetId, incomingPayload = null) => {
    if (incomingPayload) setPayload({ ...incomingPayload, target: targetId, timestamp: Date.now() });
    setCurrentApp(targetId);
  }, []);

  const saveToArc = useCallback((item) => {
    setArcSaved(prev => [{ ...item, savedAt: Date.now(), id: Math.random().toString(36).slice(2) }, ...prev]);
    setNotification("아크에 저장됐어요");
    setTimeout(() => setNotification(null), 2200);
  }, []);

  const clearPayload = useCallback(() => setPayload(emptyPayload()), []);

  return (
    <GlobalContext.Provider value={{ currentApp, setCurrentApp, navigate, payload, setPayload, clearPayload, arcSaved, saveToArc, notification }}>
      {children}
    </GlobalContext.Provider>
  );
}
function useGlobal() { return useContext(GlobalContext); }

// ============================================================
// SHELL UI
// ============================================================
function Topbar() {
  const { currentApp, setCurrentApp } = useGlobal();
  const app = currentApp ? APP_MAP[currentApp] : null;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", height:52, borderBottom:`1px solid ${THEME.border}`, background:THEME.surface, flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:700, letterSpacing:"0.18em", color:THEME.accent, textTransform:"uppercase" }}>Typecore Studio</span>
        {app && <><span style={{ color:THEME.textDim, margin:"0 8px", fontSize:14 }}>›</span><span style={{ fontSize:13, color:THEME.textMuted }}>{app.label}</span></>}
        {!app && <span style={{ fontSize:11, color:THEME.textMuted, letterSpacing:"0.06em", marginLeft:10 }}>Creative Platform</span>}
      </div>
      {app && (
        <button onClick={() => setCurrentApp(null)} style={{ background:"none", border:`1px solid ${THEME.border}`, borderRadius:6, color:THEME.textMuted, padding:"4px 12px", fontSize:12, cursor:"pointer" }}>
          ← 대시보드
        </button>
      )}
    </div>
  );
}

function Notification() {
  const { notification } = useGlobal();
  if (!notification) return null;
  return (
    <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:THEME.accent, color:"#fff", padding:"10px 22px", borderRadius:8, fontSize:13, fontWeight:500, zIndex:999 }}>
      ✓ {notification}
    </div>
  );
}

function ArcPanel() {
  const { arcSaved } = useGlobal();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"fixed", right:20, bottom:20, zIndex:100 }}>
      <button onClick={() => setOpen(!open)} style={{ background:THEME.accentSoft, border:`1px solid ${THEME.accent}55`, borderRadius:20, padding:"8px 16px", color:THEME.accent, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
        ⊕ 아크 {arcSaved.length > 0 && <span style={{ background:THEME.accent, color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10 }}>{arcSaved.length}</span>}
      </button>
      {open && (
        <div style={{ position:"absolute", bottom:44, right:0, width:300, background:THEME.card, border:`1px solid ${THEME.border}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${THEME.border}`, fontSize:12, fontWeight:600, color:THEME.text }}>저장된 결과물</div>
          <div style={{ maxHeight:300, overflowY:"auto" }}>
            {arcSaved.length === 0 && <div style={{ padding:"20px 16px", fontSize:12, color:THEME.textMuted, textAlign:"center" }}>아직 저장된 항목이 없어요</div>}
            {arcSaved.map(item => (
              <div key={item.id} style={{ padding:"10px 16px", borderBottom:`1px solid ${THEME.border}`, fontSize:12 }}>
                <div style={{ color:THEME.textMuted, fontSize:10, marginBottom:3 }}>{APP_MAP[item.source]?.label} · {new Date(item.savedAt).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}</div>
                <div style={{ color:THEME.text }}>{String(item.prompt?.text || "").slice(0,60)}...</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AppCardGrid() {
  const { navigate } = useGlobal();
  const groups = [
    { key:"hub",      label:"허브" },
    { key:"evaluate", label:"탐색 / 평가" },
    { key:"generate", label:"프롬프트 생성" },
  ];
  return (
    <div style={{ padding:"36px 40px", maxWidth:960, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <div style={{ marginBottom:40 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:THEME.text, margin:0, marginBottom:6 }}>Creative Studio</h1>
        <p style={{ fontSize:13, color:THEME.textMuted, margin:0 }}>8개의 앱으로 구성된 프롬프트 생성 · 평가 플랫폼</p>
      </div>
      {groups.map(g => {
        const apps = APP_REGISTRY.filter(a => a.group === g.key);
        if (!apps.length) return null;
        return (
          <div key={g.key} style={{ marginBottom:40 }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.14em", color:THEME.textDim, textTransform:"uppercase", marginBottom:14, borderLeft:`2px solid ${THEME.border}`, paddingLeft:10 }}>{g.label}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              {apps.map(app => <AppCard key={app.id} app={app} onOpen={() => navigate(app.id)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AppCard({ app, onOpen }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onOpen} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov ? THEME.card : THEME.surface, border:`1px solid ${hov ? app.color+"55" : THEME.border}`, borderRadius:10, padding:"18px 20px", cursor:"pointer", transition:"all 0.2s", transform:hov?"translateY(-2px)":"none" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ fontSize:22, color:app.color, lineHeight:1 }}>{app.icon}</span>
        <span style={{ fontSize:9, letterSpacing:"0.1em", color:THEME.textDim, textTransform:"uppercase", background:THEME.border, padding:"2px 6px", borderRadius:4 }}>{app.sub.split(" ")[0]}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:THEME.text, marginBottom:4 }}>{app.label}</div>
      <div style={{ fontSize:11, color:THEME.textMuted, lineHeight:1.5 }}>{app.desc}</div>
      {app.canReceive.length > 0 && (
        <div style={{ marginTop:12, display:"flex", gap:4, flexWrap:"wrap" }}>
          {app.canReceive.slice(0,3).map(rid => (
            <span key={rid} style={{ fontSize:9, color:THEME.textDim, background:THEME.border, padding:"2px 5px", borderRadius:3 }}>{APP_MAP[rid]?.sub.split(" ")[0]}</span>
          ))}
          {app.canReceive.length > 3 && <span style={{ fontSize:9, color:THEME.textDim }}>+{app.canReceive.length-3}</span>}
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP ROUTER — 앱 ID별 컴포넌트 분기
// ============================================================
function AppRouter({ appId }) {
  const { payload } = useGlobal();
  switch (appId) {
    case "prompt-arc": return <PromptArcApp />;
    default:           return <PlaceholderApp appId={appId} />;
  }
}

function PlaceholderApp({ appId }) {
  const app = APP_MAP[appId];
  const { navigate, payload, clearPayload, saveToArc } = useGlobal();
  const [demoPrompt, setDemoPrompt] = useState("");

  const send = (targetId) => {
    navigate(targetId, { source: appId, target: targetId, prompt: { text: demoPrompt || `[${app.label}에서 생성된 프롬프트]`, tags:[], style: app.id }, image:{ url:"", metadata:{} }, params:{} });
  };

  return (
    <div style={{ padding:"32px 40px", maxWidth:860, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      {payload.source && payload.target === appId && (
        <div style={{ background:THEME.accentSoft, border:`1px solid ${THEME.accent}55`, borderRadius:8, padding:"10px 14px", marginBottom:20, fontSize:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ color:THEME.accent }}>📥 {APP_MAP[payload.source]?.label}에서 데이터가 전달됐어요
            {payload.prompt?.text && <span style={{ color:THEME.textMuted, marginLeft:8 }}>"{payload.prompt.text.slice(0,30)}..."</span>}
          </span>
          <button onClick={clearPayload} style={{ background:"none", border:"none", color:THEME.textMuted, cursor:"pointer", fontSize:11 }}>✕</button>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
        <span style={{ fontSize:28, color:app.color }}>{app.icon}</span>
        <div>
          <div style={{ fontSize:20, fontWeight:600, color:THEME.text }}>{app.label}</div>
          <div style={{ fontSize:12, color:THEME.textMuted }}>{app.sub}</div>
        </div>
      </div>
      <p style={{ fontSize:13, color:THEME.textMuted, marginBottom:32 }}>{app.desc}</p>
      <div style={{ background:THEME.card, border:`1px dashed ${THEME.border}`, borderRadius:10, padding:"60px 40px", textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:16, color:app.color, opacity:0.6 }}>{app.icon}</div>
        <div style={{ fontSize:14, color:THEME.textMuted, marginBottom:6 }}>{app.label} 앱이 여기에 들어와요</div>
        <div style={{ fontSize:12, color:THEME.textDim }}>기존 코드를 이 영역에 붙여넣기하면 돼요</div>
      </div>
      {app.canSend.length > 0 && (
        <div style={{ background:THEME.card, border:`1px solid ${THEME.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:11, color:THEME.textMuted, marginBottom:10, letterSpacing:"0.08em", textTransform:"uppercase" }}>결과물 전달하기</div>
          <input value={demoPrompt} onChange={e => setDemoPrompt(e.target.value)} placeholder="전달할 프롬프트 내용 (테스트용)"
            style={{ width:"100%", background:THEME.surface, border:`1px solid ${THEME.border}`, borderRadius:6, padding:"8px 12px", color:THEME.text, fontSize:13, marginBottom:12, boxSizing:"border-box", outline:"none" }} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {app.canSend.map(tid => {
              const t = APP_MAP[tid];
              return (
                <button key={tid} onClick={() => send(tid)} style={{ background:"none", border:`1px solid ${t.color}55`, borderRadius:6, color:t.color, padding:"6px 14px", fontSize:12, cursor:"pointer" }}>
                  → {t.label}
                </button>
              );
            })}
            <button onClick={() => saveToArc({ prompt:{ text: demoPrompt || `[${app.label} 결과물]` }, source: appId })}
              style={{ background:"none", border:`1px solid ${THEME.accent}55`, borderRadius:6, color:THEME.accent, padding:"6px 14px", fontSize:12, cursor:"pointer" }}>
              ☆ 아크에 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROMPT ARC APP — 프롬프트 아크 (Firebase 없이 로컬 상태로 동작)
// ============================================================

// Prompt Arc 전용 상수
const ARC_CATEGORIES = [
  { id:'all', name:'전체 보기', icon:<ListChecks size={18}/> },
  { id:'즐겨찾기', name:'즐겨찾기', icon:<Heart size={18}/> },
  { type:'divider' },
  { id:'타이포', name:'타이포', icon:<Type size={18}/> },
  { id:'버튼', name:'버튼', icon:<Tag size={18}/> },
  { id:'visualFX', name:'VisualFX', icon:<Wand2 size={18}/> },
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

const PromptImage = ({ src, alt, className }) => {
  const [error,setError]=useState(false);
  useEffect(()=>{setError(false);},[src]);
  if(error||!src) return <div className={`flex items-center justify-center bg-zinc-900 text-zinc-600 ${className}`}><ImageIcon size={24}/></div>;
  return <img src={src} alt={alt} className={className} onError={()=>setError(true)} loading="lazy" onDragStart={e=>e.preventDefault()} />;
};

function PromptArcApp() {
  const { navigate, payload, clearPayload, saveToArc } = useGlobal();

  // 로컬 상태 (Firebase 대신)
  const [prompts, setPrompts] = useState([]);
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('latest');
  const [viewMode, setViewMode] = useState('normal');
  const [colCount, setColCount] = useState(4);
  const [activeFilter, setActiveFilter] = useState('');
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
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
  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef(null);
  const [theme, setTheme] = useState('dark');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const showToast = useCallback((msg, type='success') => {
    setToast({ message:String(msg), type });
    setTimeout(()=>setToast(null),3000);
  },[]);

  // payload 수신 시 자동으로 새 프롬프트 창 열기
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

  useEffect(()=>{
    const ob=new IntersectionObserver(entries=>{ if(entries[0].isIntersecting) setVisibleCount(p=>p+20); },{threshold:0.1});
    if(observerTarget.current) ob.observe(observerTarget.current);
    return ()=>ob.disconnect();
  },[visibleCount]);

  const handleNewPrompt = () => {
    setEditingPrompt({ title:'', tags:['기타'], description:'', content:'', images:[], stepPrompts:[], stepLabels:[], stepTags:[], stepKeywords:[], stepDescriptions:[], aiKeywords:'', optimizedModel:'나노바나나2', thumbnail:'', isPinned:false, isLive:false, views:0, likeCount:0, likedBy:[], analysisStatus:'completed' });
    setEditModalOpen(true);
  };

  const handleSave = (data) => {
    setIsSaving(true);
    const now = Date.now();
    const cleaned = { ...data, id: editingPrompt?.id || Math.random().toString(36).slice(2), createdAt: editingPrompt?.createdAt || now, updatedAt: now };
    if(editingPrompt?.id){
      setPrompts(prev => prev.map(p => p.id===editingPrompt.id ? cleaned : p));
      showToast('수정되었습니다.');
    } else {
      setPrompts(prev => [cleaned, ...prev]);
      showToast('저장되었습니다.');
    }
    setEditModalOpen(false); setEditingPrompt(null); setIsSaving(false);
  };

  const performDelete = () => {
    setIsDeleting(true);
    if(deleteConfirm.id==='BATCH'){
      setPrompts(prev => prev.filter(p => !selectedItems.has(p.id)));
      showToast(`${selectedItems.size}개 삭제됐어요.`);
      setSelectedItems(new Set());
    } else {
      setPrompts(prev => prev.filter(p => p.id!==deleteConfirm.id));
      showToast('삭제되었습니다.');
      if(viewPrompt?.id===deleteConfirm.id) setViewPrompt(null);
    }
    setDeleteConfirm({isOpen:false,id:null}); setIsDeleting(false);
  };

  const handleLike = (id, isLiked) => {
    setPrompts(prev => prev.map(p => p.id===id ? {...p, likeCount:(p.likeCount||0)+(isLiked?-1:1), likedBy: isLiked?(p.likedBy||[]).filter(u=>u!=='local'):([...(p.likedBy||[]),'local'])} : p));
  };
  const handleTogglePin = (id, isPinned) => {
    setPrompts(prev => prev.map(p => p.id===id ? {...p, isPinned:!isPinned} : p));
    showToast(!isPinned?'추천 고정됐어요.':'고정 해제됐어요.');
  };
  const handleToggleLive = (id, isLive) => {
    setPrompts(prev => prev.map(p => p.id===id ? {...p, isLive:!isLive} : p));
  };

  // 앱 간 전달 (DetailModal 더보기에서)
  const handleSendToApp = (targetId, prompt) => {
    navigate(targetId, {
      source:'prompt-arc', target:targetId,
      prompt:{ text:prompt.content||prompt.stepPrompts?.[0]||'', tags:prompt.tags||[], style:prompt.optimizedModel||'' },
      image:{ url:prompt.thumbnail||prompt.images?.[0]||'', metadata:{} },
      params:{}
    });
    showToast(`${APP_MAP[targetId]?.label}로 전달 중...`);
  };

  const filteredPrompts = useMemo(()=>{
    let result = prompts.filter(p=>{
      const term=searchTerm.toLowerCase();
      const matchSearch = [p.title,p.content,p.description,p.aiKeywords,...(p.stepPrompts||[]),...(p.stepKeywords||[]),...(p.stepDescriptions||[])].some(s=>(s||'').toLowerCase().includes(term));
      const matchCategory = category==='all' ? true : category==='즐겨찾기' ? p.isPinned||(p.likedBy||[]).includes('local') : (p.tags||[]).includes(category)||(p.stepTags||[]).some(st=>Array.isArray(st)&&st.includes(category));
      return matchSearch && matchCategory;
    });
    return result.sort((a,b)=>{
      if((b.isPinned?1:0)!==(a.isPinned?1:0)) return (b.isPinned?1:0)-(a.isPinned?1:0);
      if(sortOption==='popular') return (b.views||0)-(a.views||0);
      if(sortOption==='top_rated') return (b.likeCount||0)-(a.likeCount||0);
      if(sortOption==='oldest') return (a.createdAt||0)-(b.createdAt||0);
      return (b.createdAt||0)-(a.createdAt||0);
    });
  },[prompts,searchTerm,category,sortOption]);

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
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Teko:wght@300;400;500;600;700&display=swap');
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
        <aside className={`hidden md:flex flex-col bg-[#121212] border-r border-white/5 transition-all duration-300 ${isSidebarCollapsed?'w-[60px]':'w-[160px]'}`}>
          <div className="h-14 flex items-center justify-center border-b border-white/5">
            <button onClick={()=>setSidebarCollapsed(!isSidebarCollapsed)} className="text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"><Menu size={18}/></button>
          </div>
          <nav className="flex-1 overflow-y-auto arc-scrollbar py-2 flex flex-col gap-0.5">
            {ARC_CATEGORIES.map((cat,idx)=>{
              if(cat.type==='divider') return <div key={idx} className="h-px bg-white/5 my-1 mx-3"/>;
              const active=category===cat.id;
              return (
                <button key={cat.id} onClick={()=>setCategory(cat.id)}
                  className={`flex items-center h-10 w-full transition-colors ${active?'text-zinc-200 bg-white/5':'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                  <div className="w-[60px] flex justify-center shrink-0">{cat.icon}</div>
                  {!isSidebarCollapsed && <span className={`text-xs ${active?'font-bold':''}`}>{cat.name}</span>}
                </button>
              );
            })}
            <div className="h-px bg-white/5 my-1 mx-3"/>
            <button onClick={handleNewPrompt} className="flex items-center h-10 w-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
              <div className="w-[60px] flex justify-center"><Plus size={18}/></div>
              {!isSidebarCollapsed && <span className="text-xs">새 프롬프트</span>}
            </button>
            <button onClick={()=>setQuickDrawerOpen(true)} className="flex items-center h-10 w-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
              <div className="w-[60px] flex justify-center"><PenTool size={16}/></div>
              {!isSidebarCollapsed && <span className="text-xs">아이디어 튜닝룸</span>}
            </button>
          </nav>
          <div className="h-14 flex items-center justify-center border-t border-white/5">
            <button onClick={()=>setIsAdminMode(!isAdminMode)} className={`p-2 rounded-lg transition-colors ${isAdminMode?'text-purple-400 bg-purple-500/10':'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'}`} title="관리자 모드">
              <Shield size={16}/>
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b border-white/5 bg-[#050505]/90 flex items-center px-6 gap-4 shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-['Teko'] text-2xl text-white tracking-wide"><span className="font-light">Prompt</span><span className="font-semibold text-[#C8A969]">Arche</span></span>
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
                <button onClick={()=>setSortPopoverOpen(!sortPopoverOpen)} className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg">
                  <ArrowUpDown size={12}/> {sortLabel}
                </button>
                {sortPopoverOpen && (
                  <div className="absolute top-9 right-0 w-36 bg-[#1A1A1A] border border-white/10 rounded-lg p-1.5 z-50 shadow-xl">
                    {['latest','oldest','popular','top_rated'].map(s=>(
                      <button key={s} onClick={()=>{setSortOption(s);setSortPopoverOpen(false);}}
                        className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded transition-colors ${sortOption===s?'text-[#C8A969]':'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                        {({latest:'최신순',oldest:'오래된 순',popular:'조회순',top_rated:'인기순'})[s]} {sortOption===s&&<Check size={11}/>}
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
            onSaveToArc={item=>saveToArc({...item,source:'prompt-arc'})}
            onSendToApp={handleSendToApp}
            showToast={showToast} currentUserId="local"
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
  const displayImage = prompt.thumbnail||(prompt.images?.length>0?prompt.images[0]:prompt.image);
  const [hov,setHov]=useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className={`group bg-[#111111] rounded-xl border transition-all cursor-pointer overflow-hidden relative break-inside-avoid ${isSelected?'border-purple-500/50':'border-white/5 hover:border-[#C8A969]/50'}`}
      style={{ boxShadow: hov?'0 8px 32px rgba(200,169,105,0.08)':'none' }}
    >
      <PromptImage src={displayImage} alt={prompt.title} className="w-full h-auto object-scale-down block bg-[#0A0A0A]"/>
      {prompt.isLive && <div className="absolute top-0 left-0 px-2 py-0.5 bg-rose-950/80 text-rose-200 text-[9px] font-bold rounded-br-lg z-30 tracking-wider">LIVE</div>}
      {prompt.images?.length>1 && <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white z-20">+{prompt.images.length-1}</div>}
      {isAdminMode && (
        <div className="absolute top-2 left-2 z-40" onClick={e=>e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={e=>{e.stopPropagation();onToggleSelect(prompt.id);}} className="w-3.5 h-3.5 accent-purple-500 cursor-pointer"/>
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-40">
        <button onClick={e=>{e.stopPropagation();onDelete(prompt.id);}} className="p-1.5 rounded-lg bg-[#151515]/80 text-zinc-300 hover:text-red-400 backdrop-blur-sm"><Trash2 size={13}/></button>
      </div>
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 z-20 pointer-events-none">
        {(prompt.tags||[]).map((tag,i)=><span key={i} className="px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-bold text-zinc-300">#{tag}</span>)}
      </div>
    </div>
  );
}

// ============================================================
// ARC EDIT MODAL (simplified, core functionality preserved)
// ============================================================
function ArcEditModal({ initialData, onSave, onClose, showToast, isSaving }) {
  const initImages = initialData?.images?.length?[...initialData.images]:(initialData?.image?[initialData.image]:[]);
  const initSP = initialData?.stepPrompts?.length?[...initialData.stepPrompts]:[initialData?.content||''];
  const initST = initialData?.stepTags?.length?[...initialData.stepTags]:initImages.map(()=>initialData?.tags||['기타']);
  const initSK = initialData?.stepKeywords?.length?[...initialData.stepKeywords]:initImages.map(()=>'');
  const initSD = initialData?.stepDescriptions?.length?[...initialData.stepDescriptions]:initImages.map(()=>'');
  const initSL = initialData?.stepLabels?.length?[...initialData.stepLabels]:initImages.map(()=>'');

  const [data,setData]=useState({...initialData,images:initImages,stepPrompts:initSP,stepTags:initST,stepKeywords:initSK,stepDescriptions:initSD,stepLabels:initSL});
  const [mainIdx,setMainIdx]=useState(0);
  const [copied,setCopied]=useState(false);
  const [isDragImg,setIsDragImg]=useState(false);

  const handleTabChange=(idx)=>{ setMainIdx(idx); setData(p=>({...p,content:p.stepPrompts?.[idx]||''})); };

  const toggleTag=(tagId)=>{
    setData(prev=>{
      const cur=Array.isArray(prev.stepTags?.[mainIdx])?prev.stepTags[mainIdx]:['기타'];
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="fixed top-4 right-4 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10"><X size={22}/></button>
      <div className="w-full max-w-5xl h-[90vh] bg-[#111] rounded-2xl border border-white/10 flex overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
        {/* Left: image */}
        <div className="w-[60%] bg-[#050505] relative flex flex-col"
          onDragOver={e=>e.preventDefault()} onDragEnter={()=>setIsDragImg(true)} onDragLeave={()=>setIsDragImg(false)}
          onDrop={e=>{e.preventDefault();setIsDragImg(false);handleImgFiles(e.dataTransfer.files);}}>
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
        </div>
        {/* Right: form */}
        <div className="flex-1 flex flex-col bg-[#111]">
          <div className="p-5 border-b border-white/5">
            <input value={data.title||''} onChange={e=>setData({...data,title:e.target.value})} placeholder="제목을 입력하세요"
              className="w-full bg-transparent text-base font-bold text-zinc-200 outline-none placeholder:text-zinc-600 border-none"/>
          </div>
          <div className="flex-1 overflow-y-auto p-5 arc-scrollbar space-y-5">
            {/* 태그 */}
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">태그</div>
              <div className="flex flex-wrap gap-1.5">
                {ARC_CATEGORIES.filter(c=>c.id!=='all'&&c.type!=='divider'&&c.id!=='즐겨찾기').map(c=>{
                  const active=(data.stepTags?.[mainIdx]||[]).includes(c.id);
                  return <button key={c.id} onClick={()=>toggleTag(c.id)} className={`px-3 py-1.5 rounded-md text-[10px] border transition-colors ${active?'bg-white/20 text-white border-white/30 font-bold':'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>{c.name}</button>;
                })}
              </div>
            </div>
            {/* 키워드 */}
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">검색 키워드</div>
              <input value={data.stepKeywords?.[mainIdx]||''} onChange={e=>{const a=[...(data.stepKeywords||[])];a[mainIdx]=e.target.value;setData({...data,stepKeywords:a,aiKeywords:e.target.value});}}
                placeholder="예) 사이버펑크, 네온" className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-3 text-[11px] text-zinc-300 outline-none focus:border-white/20"/>
            </div>
            {/* 설명 */}
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">설명</div>
              <textarea value={data.stepDescriptions?.[mainIdx]||''} onChange={e=>{const a=[...(data.stepDescriptions||[])];a[mainIdx]=e.target.value;setData({...data,stepDescriptions:a,description:e.target.value});}}
                className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg p-3 text-[11px] text-zinc-300 h-20 resize-none outline-none focus:border-white/20 arc-scrollbar"/>
            </div>
            {/* 스텝 탭 */}
            {data.images?.length>1 && (
              <div className="flex gap-2 overflow-x-auto arc-scrollbar pb-1">
                {data.images.map((_,idx)=>(
                  <button key={idx} onClick={()=>handleTabChange(idx)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border ${idx===mainIdx?'bg-[#C8A969]/20 text-[#C8A969] border-[#C8A969]/40':'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20'}`}>
                    Step {idx+1}
                  </button>
                ))}
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

// ============================================================
// ARC DETAIL MODAL — 플랫폼 워크플로우 연결 포함
// ============================================================
function ArcDetailModal({ prompt, onClose, onEdit, onDelete, onLike, onPin, onLive, onSaveToArc, onSendToApp, showToast, currentUserId }) {
  const images = prompt.images?.length?prompt.images:(prompt.image?[prompt.image]:[]);
  const [mainIdx,setMainIdx]=useState(0);
  const [copied,setCopied]=useState(false);
  const [showActions,setShowActions]=useState(false);
  const isLiked=(prompt.likedBy||[]).includes(currentUserId);
  const isAuthor=!prompt.authorId||prompt.authorId===currentUserId;

  const currentPrompt=prompt.stepPrompts?.[mainIdx]||prompt.content||'';
  const currentTags=Array.isArray(prompt.stepTags?.[mainIdx])?prompt.stepTags[mainIdx]:(prompt.tags||[]);
  const currentDesc=prompt.stepDescriptions?.[mainIdx]||prompt.description||'';
  const currentKws=(prompt.stepKeywords?.[mainIdx]||prompt.aiKeywords||'').split(',').map(k=>k.trim()).filter(Boolean);

  const sendTargets = [
    { id:'typecore-sovereign', label:'타이프코어 소버린으로 편집', icon:<Type size={13}/> },
    { id:'render-metrics',     label:'렌더 메트릭스로 입체화',    icon:<Box size={13}/> },
    { id:'motion-metrics',     label:'모션 메트릭스로 애니메이션', icon:<Video size={13}/> },
    { id:'design-eval',        label:'디자인 평가도구로 평가',     icon:<Star size={13}/> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="fixed top-4 right-4 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10"><X size={22}/></button>
      <div className="w-full max-w-5xl h-[90vh] bg-[#111] rounded-2xl border border-white/10 flex overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
        {/* Left */}
        <div className="w-[60%] bg-[#050505] relative flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            <PromptImage src={images[mainIdx]} className="max-w-full max-h-full object-scale-down"/>
          </div>
          {images.length>1 && (
            <>
              <button onClick={()=>setMainIdx(p=>p>0?p-1:images.length-1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronLeft size={18}/></button>
              <button onClick={()=>setMainIdx(p=>p<images.length-1?p+1:0)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70"><ChevronRight size={18}/></button>
              <div className="absolute bottom-4 left-4 flex gap-2">
                {images.map((img,idx)=>(
                  <div key={idx} onClick={()=>setMainIdx(idx)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${idx===mainIdx?'border-[#C8A969]':'border-transparent hover:border-white/30'}`}>
                    <img src={img} className="w-full h-full object-cover" alt=""/>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Right */}
        <div className="flex-1 flex flex-col bg-[#111]">
          <div className="p-5 border-b border-white/5">
            <div className="text-base font-bold text-zinc-200 mb-1">{prompt.title||'Untitled'}</div>
            <div className="flex items-center gap-2 mt-3">
              {isAuthor && <>
                <button onClick={()=>onDelete(prompt.id)} className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13}/></button>
                <button onClick={()=>onEdit(mainIdx)} className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"><Edit2 size={13}/></button>
              </>}
              <button onClick={()=>onLike(prompt.id,isLiked)} className={`flex items-center gap-1 p-2 rounded-full bg-white/5 text-xs ${isLiked?'text-[#C8A969]':'text-zinc-400 hover:text-white'}`}>
                <Heart size={13} fill={isLiked?'currentColor':'none'}/> {prompt.likeCount||0}
              </button>
              <button onClick={()=>onSaveToArc({prompt:{text:currentPrompt},source:'prompt-arc'})} className="flex items-center gap-1 p-2 rounded-full bg-white/5 text-zinc-400 hover:text-[#C8A969] text-xs">
                <Save size={13}/> 아크 저장
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 arc-scrollbar space-y-4">
            {currentTags.length>0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentTags.map((t,i)=><span key={i} className="px-2 py-1 bg-white/5 border border-white/10 text-zinc-300 text-[10px] rounded-md">{t}</span>)}
                {currentKws.map((k,i)=><span key={`k${i}`} className="px-2 py-1 bg-[#050505] border border-white/5 text-zinc-500 text-[10px] rounded-md">#{k}</span>)}
              </div>
            )}
            {currentDesc && <p className="text-[11px] text-zinc-400 leading-relaxed">{currentDesc}</p>}
            {images.length>1 && (
              <div className="flex gap-2 overflow-x-auto arc-scrollbar pb-1">
                {images.map((_,idx)=>(
                  <button key={idx} onClick={()=>setMainIdx(idx)}
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

            {/* 워크플로우 전달 섹션 — 핵심 기능 */}
            <div className="border border-[#6C5CE7]/30 bg-[#6C5CE7]/5 rounded-xl p-4">
              <div className="text-[10px] font-bold text-[#6C5CE7] mb-3 flex items-center gap-1.5">
                <ArrowRight size={12}/> 이 프롬프트로 이어서 작업
              </div>
              <div className="flex flex-col gap-2">
                {sendTargets.map(t=>(
                  <button key={t.id} onClick={()=>{onSendToApp(t.id,prompt);onClose();}}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-zinc-300 hover:text-white rounded-lg text-[11px] font-medium transition-all text-left">
                    <span style={{color:APP_MAP[t.id]?.color}}>{t.icon}</span> {t.label}
                    <ChevronRight size={12} className="ml-auto text-zinc-600"/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROOT
// ============================================================
export default function App() {
  return (
    <GlobalProvider>
      <Shell />
    </GlobalProvider>
  );
}

function Shell() {
  const { currentApp } = useGlobal();
  return (
    <div style={{ minHeight:"100vh", background:THEME.bg, color:THEME.text, fontFamily:"'Noto Sans KR', sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`* { box-sizing:border-box; } @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)} } ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1E1E2E;border-radius:2px}`}</style>
      <Topbar/>
      <div style={{ flex:1, overflow:"hidden" }}>
        {currentApp ? <AppRouter appId={currentApp}/> : <AppCardGrid/>}
      </div>
      <ArcPanel/>
      <Notification/>
    </div>
  );
}
