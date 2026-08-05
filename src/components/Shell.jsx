import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Menu, Lock, MoreHorizontal, Eye, EyeOff, Zap, ArrowRight, Type, Sparkles, Scissors, Search, ChevronDown, LayoutTemplate, CircleHelp, X } from "lucide-react";
import { APP_MAP, APP_REGISTRY } from "../config/apps";
import { useGlobal, useTheme } from "../context/GlobalContext";
import { useAuth } from "../context/AuthContext";
import { GRADE_LABEL, GRADES } from "../lib/grades";
import useWeeklyCredits from "../lib/useWeeklyCredits";
import { useAppVisibility, isAppHidden, setAppHidden } from "../lib/appVisibility";

// 등급 컬러 — ProfilePopover 와 동일. lib/grades에 없어서 인라인 정의.
const GRADE_COLOR = {
  [GRADES.general]:  "#7A7A9A",
  [GRADES.pro]:      "#C8A969",
  [GRADES.pro_plus]: "#A29BFE",
  [GRADES.expert]:   "#0eb9b3",
};
import NexusLogo from "./NexusLogo";
// import ThemeToggle from "./ThemeToggle"; // 라이트 모드 미완성 — 임시 비활성화
import UserAvatar from "./UserAvatar";
import ProfilePopover from "./ProfilePopover";
import DashboardRecentPrompts from "./DashboardRecentPrompts";
import IndexSearchBar from "./IndexSearchBar";
import CommandPalette from "./CommandPalette";
import SkillChat from "../skills-runtime/SkillChat";
import LoginScreen from "./LoginScreen";
import PromptArcApp from "../apps/PromptArc";
import TypecoreSovereignApp from "../apps/TypecoreSovereign";
import TypecoreBreezeApp from "../apps/TypecoreBreeze";
import RenderMatrixApp from "../apps/RenderMatrix";
import RenderMatrixPopApp from "../apps/RenderMatrixPop";
import MotionMatrixApp from "../apps/MotionMatrix";
import PromptBuilderApp from "../apps/PromptBuilder";
import PromptBuilderV2App from "../apps/PromptBuilderV2";
import RubiconForgeApp from "../apps/RubiconForge";
import LogoForgeApp from "../apps/LogoForge";
import DesignEvaluatorApp from "../apps/DesignEvaluator";
import DesignLexiconApp from "../apps/DesignLexicon";
import PromotionArchiveApp from "../apps/PromotionArchive";
import BrandWebReviewApp from "../apps/BrandWebReview";
import CompetitorRadarApp from "../apps/CompetitorRadar";
import AssetLibraryApp from "../apps/AssetLibrary";
import BannerCodexApp from "../apps/BannerCodex";
import BannerCreatorApp from "../apps/BannerCreator";
import NexusPreviewApp from "../apps/NexusPreview";
import PromoSkinApp from "../apps/PromoSkin";
import MaskForgeApp from "../apps/MaskForge";
import ThemeForgeApp from "../apps/ThemeForge";
import FrameForgeApp from "../apps/FrameForge";
import VectorForgeApp from "../apps/VectorForge";
import LumKeyApp from "../apps/LumKey";
import FigmaL10nApp from "../apps/FigmaL10n";
import BriefStudioApp from "../apps/BriefStudio";
import NexusAdminApp from "../apps/NexusAdmin";
import PromptAuditApp from "../apps/PromptAudit";
import PlaceholderApp from "../apps/PlaceholderApp";
// recharts 를 메인 번들에서 분리 — 앱 진입 시에만 로드
const DestinyObservatoryApp = lazy(() => import("../apps/DestinyObservatory"));
const PetPersonaApp = lazy(() => import("../apps/PetPersona"));

// 인덱스 스크롤 → Topbar 배경/블러 동적 계산.
// 0px: 완전 투명 / 50px: 페이드인 시작 / 150px: 완전 불투명 + blur 16px.
// isLight 에 따라 배경 RGB 베이스 (다크: 10,10,15 / 라이트: 247,247,250)를 바꿔준다.
function computeIndexTopbarStyle(scrollY, T, isLight) {
  const start = 50, end = 150;
  const t = Math.max(0, Math.min(1, (scrollY - start) / (end - start)));
  const opacity = 0.95 * t;
  const blur = 16 * t;
  const rgb = isLight ? "247, 247, 250" : "10, 10, 15";
  return {
    background: opacity === 0 ? "transparent" : `rgba(${rgb}, ${opacity.toFixed(3)})`,
    backdropFilter: blur === 0 ? "none" : `blur(${blur.toFixed(1)}px)`,
    WebkitBackdropFilter: blur === 0 ? "none" : `blur(${blur.toFixed(1)}px)`,
    borderColor: t < 0.05 ? "transparent" : T.border,
  };
}

const APP_GUIDES = {
  explore: ["찾거나 업로드할 자료를 준비하세요.", "목록에서 한 항목을 선택해 내용을 확인하세요.", "필요한 결과만 저장하거나 다음 앱으로 보내세요."],
  generate: ["만들고 싶은 내용이나 참고 이미지를 입력하세요.", "처음에는 추천값만 고르고 세부 설정은 나중에 여세요.", "강조된 생성 버튼을 누른 뒤 결과를 확인하세요."],
  production: ["가공할 원본이나 작업 종류를 먼저 선택하세요.", "기본값으로 미리보기를 만든 뒤 필요한 항목만 조정하세요.", "오른쪽 또는 하단 결과에서 다운로드·전송하세요."],
  admin: ["관리할 대상을 선택하세요.", "변경 범위와 영향을 먼저 확인하세요.", "저장 후 목록에서 반영 여부를 확인하세요."],
  life: ["필요한 항목을 가볍게 입력하세요.", "실행 버튼을 누르고 결과를 확인하세요.", "결과는 복사해 공유할 수 있어요."],
};

function AppGuide({ app, T, onClose }) {
  const steps = APP_GUIDES[app?.group] || APP_GUIDES.generate;
  return (
    <div className="nx-glass" style={{ position:"fixed", top:62, right:20, zIndex:1200, width:"min(360px, calc(100vw - 24px))", padding:18, borderRadius:20, background:T.surface, border:`1px solid ${T.border}`, boxShadow:"0 24px 70px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.1)" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:9, display:"grid", placeItems:"center", color:app.color, background:`${app.color}18`, flexShrink:0 }}><CircleHelp size={18}/></div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:800, color:T.text }}>{app.label} 처음 사용하기</div>
          <div style={{ marginTop:4, fontSize:11, lineHeight:1.5, color:T.textMuted }}>{app.desc}</div>
        </div>
        <button onClick={onClose} aria-label="가이드 닫기" style={{ width:28, height:28, display:"grid", placeItems:"center", border:0, borderRadius:7, background:"transparent", color:T.textMuted, cursor:"pointer" }}><X size={14}/></button>
      </div>
      <div style={{ display:"grid", gap:8, marginTop:14 }}>
        {steps.map((step, index) => <div key={step} style={{ display:"flex", gap:9, alignItems:"flex-start", padding:"9px 10px", borderRadius:9, background:T.card, border:`1px solid ${T.border}` }}><span style={{ width:19, height:19, borderRadius:99, display:"grid", placeItems:"center", flexShrink:0, fontSize:10, fontWeight:900, color:app.color, border:`1px solid ${app.color}66`, background:`${app.color}12` }}>{index + 1}</span><span style={{ fontSize:11, lineHeight:1.55, color:T.text }}>{step}</span></div>)}
      </div>
      <div style={{ marginTop:10, fontSize:10.5, color:T.textDim }}>기본값으로 먼저 결과를 만든 뒤 부족한 부분만 조정하면 가장 쉽습니다.</div>
    </div>
  );
}

// macOS 메뉴바 우측 시계 — "7월 13일 (월) 오후 2:15". 30초 간격 갱신.
function MenuBarClock({ color }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const h = now.getHours();
  const label = `${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]}) ${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")}`;
  return (
    <span className="hidden md:inline" style={{ fontSize: 12, fontWeight: 500, color, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", userSelect: "none", letterSpacing: "-0.01em" }}>
      {label}
    </span>
  );
}

function Topbar({ scrollY = 0, onOpenPalette }) {
  const { currentApp, setCurrentApp, isLight } = useGlobal();
  const T = useTheme();
  const { user, profile, grade, openLoginModal } = useAuth();
  const { remaining, cap, used } = useWeeklyCredits();
  const [profileOpen, setProfileOpen] = useState(false);
  const [guideAppId, setGuideAppId] = useState(null);
  const app = currentApp ? APP_MAP[currentApp] : null;
  const isIndex = !app;

  const dynamicStyle = isIndex
    ? computeIndexTopbarStyle(scrollY, T, isLight)
    : { background: T.surface, backdropFilter: "saturate(150%) blur(24px)", WebkitBackdropFilter: "saturate(150%) blur(24px)", borderColor: T.border };

  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 20px", height:52, minHeight:52, maxHeight:52,
      borderBottom: `1px solid ${isIndex && scrollY < 55 ? "transparent" : dynamicStyle.borderColor}`,
      background: dynamicStyle.background,
      backdropFilter: dynamicStyle.backdropFilter,
      WebkitBackdropFilter: dynamicStyle.WebkitBackdropFilter,
      fontFamily:"inherit",
      position:"fixed", top:0, left:0, right:0, zIndex:1000,
      transition: "background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
    }}>
      {/* LEFT: [햄버거] [NEXUS Studio 워드마크] [(서브앱일 때) 앱 이름] */}
      <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
        {/* 햄버거 — Command Palette 오픈. 인덱스/서브앱 모두 노출. */}
        <button
          type="button"
          onClick={onOpenPalette}
          title="앱 검색 (Command Palette)"
          style={{
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:32, height:32, padding:0, border:0, borderRadius:9,
            background:"transparent", color: T.textMuted, cursor:"pointer",
            transition:"background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.hoverBg; e.currentTarget.style.color = T.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMuted; }}
        >
          <Menu size={18} />
        </button>
        {/* 로고 + NEXUS STUDIO — 항상 노출, 클릭 시 인덱스로 이동. Ctrl/Cmd+클릭 → 새 창에서 인덱스 오픈. */}
        <div
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) { window.open("/", "_blank", "noopener,noreferrer"); return; }
            setCurrentApp(null);
          }}
          title="홈으로 (Ctrl/⌘+클릭 → 새 창)"
          style={{ display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}
        >
          <NexusLogo height={16} color={T.text} />
          {/* macOS 메뉴바의 앱 이름처럼 — 시스템 폰트 13px 세미볼드 */}
          <span style={{ fontSize:13, fontWeight:700, color:T.text, lineHeight:1, letterSpacing:"-0.01em", whiteSpace:"nowrap" }}>
            NEXUS Studio
          </span>
        </div>
        {/* 서브앱일 때만: 앱 이름 (클릭 불가, 앱 포인트 컬러).
            전체 단일 span — Teko 일괄 적용. sub 없으면 label 폴백. */}
        {!isIndex && (() => {
          const display = (app.sub && String(app.sub).trim()) || app.label || "";
          if (!display) return null;
          return (
            <span style={{ fontSize:13, fontWeight:600, color: app.color, lineHeight:1, letterSpacing:"-0.01em", whiteSpace:"nowrap", display:"inline-block", userSelect:"none", pointerEvents:"none" }}>
              {display}
            </span>
          );
        })()}
      </div>

      {/* RIGHT: 등급·크레딧 pill + 시계 + 아바타 — macOS 메뉴바 우측 상태 영역. */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <MenuBarClock color={isIndex ? (isLight ? "rgba(29,29,31,0.75)" : "rgba(255,255,255,0.85)") : T.textMuted} />
        {!isIndex && (
          <button
            type="button"
            onClick={() => setGuideAppId((id) => id === app.id ? null : app.id)}
            aria-expanded={guideAppId === app.id}
            title="처음 사용 가이드"
            style={{ display:"inline-flex", alignItems:"center", gap:6, height:30, padding:"0 10px", borderRadius:8, border:`1px solid ${guideAppId === app.id ? `${app.color}66` : T.border}`, background:guideAppId === app.id ? `${app.color}16` : T.hoverBg, color:guideAppId === app.id ? app.color : T.textMuted, fontSize:10.5, fontWeight:700, cursor:"pointer" }}
          >
            <CircleHelp size={14}/> <span className="hidden sm:inline">처음 사용</span>
          </button>
        )}
        {user && grade && (() => {
          const gColor = GRADE_COLOR[grade] || T.accent;
          const low = remaining === 0;
          const warn = !low && remaining <= Math.max(1, Math.ceil(cap * 0.1));
          // 인덱스는 박스 배경을 어두운 회색으로 강제 — 박스 내부 텍스트도 라이트 계열로 매핑해
          // 라이트 테마에서 검은 텍스트가 사라지는 사고를 막는다.
          const inkMuted = isIndex ? "rgba(255,255,255,0.62)" : T.textMuted;
          const inkDim   = isIndex ? "rgba(255,255,255,0.40)" : T.textDim;
          const inkText  = isIndex ? "rgba(255,255,255,0.92)" : T.text;
          const dividerColor = isIndex ? "rgba(255,255,255,0.10)" : T.border;
          const creditColor = low ? "#ef4444" : warn ? "#f59e0b" : inkMuted;
          return (
            <div style={{
              display:"inline-flex", alignItems:"stretch",
              background: isIndex ? "rgba(24,24,27,0.78)" : T.hoverBg,
              border: `1px solid ${isIndex ? "rgba(255,255,255,0.08)" : T.border}`,
            borderRadius: 12,
              padding: "1px 2px",
              userSelect:"none",
              backdropFilter: isIndex ? "blur(8px)" : "none",
              WebkitBackdropFilter: isIndex ? "blur(8px)" : "none",
            }}>
              {GRADE_LABEL[grade] && (
                <div
                  title={`현재 등급: ${GRADE_LABEL[grade]}`}
                  style={{
                    display:"inline-flex", alignItems:"center", gap:5,
                    padding:"3px 9px",
                    fontSize:10, fontWeight:700, color: gColor, letterSpacing:"0.1em",
                  }}
                >
                  <span style={{ width:6, height:6, borderRadius:999, background:gColor, flexShrink:0 }} />
                  {GRADE_LABEL[grade].toUpperCase()}
                </div>
              )}
              <span style={{ width:1, alignSelf:"stretch", background:dividerColor, margin:"3px 0" }} />
              <div
                title={`이번 주 크레딧 잔여 ${remaining} / 총 ${cap}\n· 이미지 생성 = 10c\n· 영상 생성 = 30c\n· 분석/최적화 = 1c\n사용량 ${used}c`}
                style={{
                  display:"inline-flex", alignItems:"baseline", gap:4,
                  padding:"3px 10px",
                  fontSize:11, fontWeight:600, color: creditColor,
                  fontFamily:"'JetBrains Mono', 'Noto Sans KR', monospace",
                }}
              >
                <span style={{ color: low || warn ? creditColor : inkText }}>{remaining}</span>
                <span style={{ color: inkDim, fontSize: 10 }}>/{cap}</span>
              </div>
            </div>
          );
        })()}
        {user ? (
          <button
            onClick={() => setProfileOpen((v) => !v)}
            title="프로필 메뉴"
            style={{
              padding:0, border:0, background:"transparent", cursor:"pointer",
              borderRadius:"50%", outline: "none",
            }}>
            <UserAvatar profile={profile} user={user} size={30} title={user.email || user.displayName || ""} />
          </button>
        ) : (
          <button
            onClick={openLoginModal}
            title="로그인 / 회원가입"
            style={{
              padding:"6px 14px", border:0,
              background: isIndex ? "rgba(255,255,255,0.92)" : T.accent,
              color: isIndex ? "#0a0a0f" : "#fff",
              borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.06em",
              cursor:"pointer", fontFamily:"inherit",
              textTransform:"uppercase",
            }}
          >
            로그인
          </button>
        )}
        {!isIndex && guideAppId === app.id && <AppGuide app={app} T={T} onClose={() => setGuideAppId(null)} />}
      </div>
      <ProfilePopover open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function Notification() {
  const { notification } = useGlobal();
  const T = useTheme();
  if (!notification) return null;
  return (
    <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", background:T.accent, color:"#fff", padding:"10px 22px", borderRadius:8, fontSize:13, fontWeight:500, zIndex:999 }}>
      ✓ {notification}
    </div>
  );
}

const versionStorageKey = (appId) => `${appId}:version`;

// 앱 sub 영문 라벨에서 2글자 약자 생성 (Adobe CC 스타일).
// "Banner Codex" → "Bc", "Render Matrix: Pop" → "Rp", "NEXUS Admin" → "Na".
const cardAbbr = (sub) => {
  const words = String(sub || "").split(/[\s:]+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) {
    const w = words[0];
    return ((w[0] || "?").toUpperCase()) + ((w[1] || "").toLowerCase());
  }
  return ((words[0][0] || "?").toUpperCase()) + ((words[words.length - 1][0] || "").toLowerCase());
};

const readSelectedVersion = (app) => {
  if (!app?.versions?.length) return null;
  try {
    const saved = localStorage.getItem(versionStorageKey(app.id));
    if (saved && app.versions.some(v => v.key === saved)) return saved;
  } catch {}
  return app.defaultVersion || app.versions[app.versions.length - 1].key;
};

function AppCard({ app, onOpen, isAdmin, hiddenFromUsers = false, groupAccent = null, compact = false }) {
  // groupAccent 가 있으면 아이콘 칩은 그 컬러로 (인덱스에서 그룹 단위 식별).
  // 없으면 기존 app.color (admin 그룹 / 다른 호출처 호환).
  const chipColor = groupAccent || app.color;
  const T = useTheme();
  const { isLight } = useGlobal();
  const [hov, setHov] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(() => readSelectedVersion(app));
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [visBusy, setVisBusy] = useState(false);
  const versionMenuRef = useRef(null);
  const disabled = !!app.disabled && !isAdmin;
  const adminUnlocked = !!app.disabled && isAdmin;
  const hasVersions = Array.isArray(app.versions) && app.versions.length > 0;
  // 관리자에게만 보이는 가시성 토글 — 원래 adminOnly 였던 카드에서만 의미 있음.
  // 일반 카드는 토글 대상이 아님 (의도치 않은 숨김 방지).
  const canToggleVisibility = isAdmin && !!app.adminOnly;
  const toggleVisibility = async (e) => {
    e.stopPropagation();
    if (visBusy) return;
    setVisBusy(true);
    try { await setAppHidden(app.id, !hiddenFromUsers); }
    catch (err) { console.warn("[appVisibility] toggle failed", err?.message || err); }
    finally { setVisBusy(false); }
  };
  // 카드 본문 클릭은 항상 selectedVersion (기본 최신) 으로 실행.
  const handleClick = (e) => { if (!disabled) onOpen(e); };
  // ... 메뉴에서 다른 버전 선택 → localStorage 저장 + 그 버전으로 실행.
  const pickVersion = (e, key) => {
    e.stopPropagation();
    setSelectedVersion(key);
    setVersionMenuOpen(false);
    try { localStorage.setItem(versionStorageKey(app.id), key); } catch {}
    if (!disabled) onOpen(e);
  };
  useEffect(() => {
    if (!versionMenuOpen) return;
    const onDocClick = (e) => { if (versionMenuRef.current && !versionMenuRef.current.contains(e.target)) setVersionMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [versionMenuOpen]);
  // 라이트/다크 disabled 색상 — 라이트에선 더 옅은 회색이 자연스러움.
  const disabledBg     = isLight ? "#ECECEF"             : "#06060C";
  const disabledBorder = isLight ? "rgba(0,0,0,0.08)"    : "rgba(122,122,154,0.25)";
  if (compact) {
    const version = hasVersions ? app.versions.find(v => v.key === selectedVersion) : null;
    return (
      <div onClick={handleClick} style={{
        display:"flex", alignItems:"center", gap:14, minHeight:68, padding:"12px 14px",
        background:disabled ? disabledBg : T.surface,
        border:`1px ${hiddenFromUsers && canToggleVisibility ? "dashed" : "solid"} ${disabled ? disabledBorder : T.border}`,
        borderRadius:14, opacity:disabled ? .55 : 1, cursor:disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 12px 32px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.06)",
        backdropFilter:"saturate(140%) blur(18px)", WebkitBackdropFilter:"saturate(140%) blur(18px)",
      }}>
        <span style={{ width:38, height:38, borderRadius:9, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:`${chipColor}1f`, color:chipColor, fontSize:13, fontWeight:800 }}>
          {app.abbr || cardAbbr(app.sub)}
        </span>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
            <strong style={{ fontSize:13, color:disabled ? T.textMuted : T.text }}>{app.label}</strong>
            {app.beta && <span style={{ fontSize:8, color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:4, padding:"1px 5px" }}>BETA</span>}
            {version && <span style={{ fontSize:8, color:version.color || T.textMuted }}>{version.label}</span>}
            {disabled && <span style={{ fontSize:8, color:T.textMuted }}>준비 중</span>}
            {hiddenFromUsers && canToggleVisibility && <span style={{ fontSize:8, color:"#E17055" }}>사용자에게 숨김</span>}
          </div>
          <div style={{ fontSize:11, lineHeight:1.45, color:T.textMuted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{app.desc}</div>
        </div>
        {canToggleVisibility && (
          <button type="button" onClick={toggleVisibility} disabled={visBusy} title={hiddenFromUsers ? "사용자에게 공개" : "사용자에게 숨기기"} style={{ border:0, background:"transparent", color:hiddenFromUsers ? "#E17055" : T.textDim, cursor:"pointer", padding:7 }}>
            {hiddenFromUsers ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        <span style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, padding:"7px 10px", borderRadius:7, background:disabled ? T.hoverBg : `${chipColor}20`, color:disabled ? T.textMuted : chipColor, fontSize:10, fontWeight:800 }}>
          {disabled ? "준비 중" : "시작"} {!disabled && <ArrowRight size={12} />}
        </span>
      </div>
    );
  }
  return (
    <div onClick={handleClick} onMouseEnter={() => !disabled && setHov(true)} onMouseLeave={() => setHov(false)}
      title={disabled ? "준비 중인 앱입니다" : (hiddenFromUsers && canToggleVisibility ? "일반 사용자에게는 숨겨진 앱 — 우측 [숨김] 뱃지를 눌러 공개로 전환" : (adminUnlocked ? "관리자 권한으로 활성화됨" : (hasVersions ? "버전 선택 후 카드를 눌러 실행" : undefined)))}
      style={{
        // 준비 중: 한층 더 어두운/연한 배경 + 점선 보더로 "미완성" 시그널
        // 숨김 카드 (admin 시점): 점선 보더로 "공개 안 됨" 시각화
        background: disabled ? disabledBg : (hov ? T.card : T.surface),
        border: disabled ? `1px dashed ${disabledBorder}` : (hiddenFromUsers && canToggleVisibility ? `1px dashed rgba(225,112,85,0.45)` : `1px solid ${T.border}`),
        borderRadius: 16, padding: "18px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : (adminUnlocked ? 0.85 : (hiddenFromUsers && canToggleVisibility ? 0.85 : 1)),
        filter: disabled ? "grayscale(0.8)" : "none",
        transition: "transform 0.22s cubic-bezier(.2,.8,.2,1), background .2s, border-color .2s, box-shadow .2s",
        transform: (!disabled && hov) ? "translateY(-2px)" : "none",
        boxShadow: disabled ? "none" : (hov ? "0 20px 48px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.1)" : "0 10px 30px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.06)"),
        backdropFilter:"saturate(140%) blur(20px)", WebkitBackdropFilter:"saturate(140%) blur(20px)",
        position: "relative",
        // 버전 팝오버 열린 카드는 형제 카드들 위로. transform 으로 stacking context 가
        // 이미 형성되어 있어서 zIndex 만 올리면 grid 안에서 최상위로 떠 가려짐 방지.
        zIndex: versionMenuOpen ? 50 : "auto",
        userSelect: disabled ? "none" : undefined,
      }}>
      {/* 상단 행: [아이콘 + 타이틀] ............ [뱃지] */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, flex:1 }}>
          {/* 2글자 아이콘 — 톤다운된 컬러 배경 + 컬러 텍스트 (Linear/Notion 스타일) */}
          <div style={{
            width:36, height:36, borderRadius:8, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            background: disabled ? T.hoverBg : `${chipColor}1f`,
            border: disabled ? `1px solid ${disabledBorder}` : `1px solid ${chipColor}40`,
          }}>
            <span style={{
              fontSize:14, fontWeight:700, letterSpacing:"0.01em", lineHeight:1,
              color: disabled ? T.textMuted : chipColor,
              fontFamily:"'Noto Sans KR', sans-serif",
            }}>{app.abbr || cardAbbr(app.sub)}</span>
          </div>
          {/* 메인 타이틀: 영문 sub — 준비 중은 더 흐리게 */}
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color: disabled ? T.textMuted : T.text, lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{app.sub}</div>
          </div>
        </div>
        {/* 우상단 뱃지 */}
        <div style={{ display:"flex", alignItems:"center", gap:6, shrink:0, flexShrink:0 }}>
          {/* 관리자 전용 가시성 토글 — adminOnly 카드에만 노출.
              숨김 상태: 주황 톤 "숨김" pill / 공개 상태: 옅은 Eye 아이콘 버튼. */}
          {canToggleVisibility && (
            hiddenFromUsers ? (
              <button type="button" onClick={toggleVisibility} disabled={visBusy}
                title="이 카드는 일반 사용자에게 숨겨져 있습니다. 클릭하면 공개로 전환됩니다."
                style={{
                  display:"inline-flex", alignItems:"center", gap:4,
                  fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:700,
                  color:"#E17055", background:"rgba(225,112,85,0.12)",
                  border:"1px solid rgba(225,112,85,0.45)", borderRadius:999,
                  padding:"3px 8px", cursor: visBusy ? "wait" : "pointer",
                  fontFamily:"inherit",
                }}>
                <EyeOff size={10} strokeWidth={2.5} /> 숨김
              </button>
            ) : (
              <button type="button" onClick={toggleVisibility} disabled={visBusy}
                title="현재 일반 사용자에게도 공개됨. 클릭하면 다시 숨김 처리됩니다."
                style={{
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                  width:22, height:22, padding:0, border:0, borderRadius:6,
                  background:"transparent", color:T.textDim,
                  cursor: visBusy ? "wait" : "pointer", opacity:0.7,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.hoverBg; e.currentTarget.style.color = T.text; e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textDim; e.currentTarget.style.opacity = "0.7"; }}
              >
                <Eye size={12} strokeWidth={2} />
              </button>
            )
          )}
          {disabled ? (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:9, letterSpacing:"0.1em", color: T.textMuted, textTransform:"uppercase", background: T.hoverBg, border:`1px solid ${disabledBorder}`, padding:"3px 8px", borderRadius:999, fontWeight:700 }}>
              <Lock size={9} strokeWidth={2.5} /> 준비 중
            </span>
          ) : app.beta ? (
            <span style={{ fontSize:9, letterSpacing:"0.1em", color:T.textMuted, textTransform:"uppercase", background:"transparent", border:`1px solid ${T.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>BETA</span>
          ) : app.badge ? (
            <span style={{ fontSize:9, letterSpacing:"0.08em", color:T.textMuted, background:"transparent", border:`1px solid ${T.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>{app.badge}</span>
          ) : adminUnlocked ? (
            <span style={{ fontSize:9, letterSpacing:"0.1em", color:T.textMuted, textTransform:"uppercase", background:"transparent", border:`1px solid ${T.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>Admin</span>
          ) : hasVersions ? (() => {
            const v = app.versions.find(x => x.key === selectedVersion);
            return (
              <div ref={versionMenuRef} style={{ display:"inline-flex", alignItems:"center", gap:4, position:"relative" }}>
                <span title={`현재 선택: ${v?.label || selectedVersion} — 카드 클릭 시 실행`}
                  style={{ fontSize:9, letterSpacing:"0.08em", color: v?.color || T.textMuted, background:"transparent", border:`1px solid ${v?.color ? `${v.color}55` : T.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>
                  {v?.label || selectedVersion}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setVersionMenuOpen(o => !o); }}
                  title="다른 버전 선택"
                  style={{
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    width:22, height:22, padding:0, border:0, borderRadius:6,
                    background: versionMenuOpen ? T.hoverBg : "transparent",
                    color: T.textMuted, cursor:"pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.hoverBg; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={(e) => { if (!versionMenuOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMuted; } }}
                >
                  <MoreHorizontal size={14} />
                </button>
                {versionMenuOpen && (
                  <div onClick={(e) => e.stopPropagation()}
                    style={{
                      position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:40,
                      minWidth:180, padding:6,
                      background: T.surface, border:`1px solid ${T.border}`, borderRadius:10,
                      boxShadow:"0 10px 30px rgba(0,0,0,0.45)",
                    }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", color:T.textDim, textTransform:"uppercase", padding:"6px 8px 4px" }}>버전 선택</div>
                    {app.versions.map(ver => {
                      const active = ver.key === selectedVersion;
                      return (
                        <button key={ver.key}
                          onClick={(e) => pickVersion(e, ver.key)}
                          style={{
                            display:"flex", alignItems:"center", gap:8, width:"100%",
                            padding:"7px 9px", borderRadius:6, border:0,
                            background: active ? `${ver.color}1a` : "transparent",
                            color: active ? ver.color : T.text,
                            fontSize:11, fontWeight: active ? 700 : 500, cursor:"pointer", textAlign:"left",
                            fontFamily:"inherit",
                          }}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = T.hoverBg; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                        >
                          <span style={{ width:6, height:6, borderRadius:999, background: ver.color, flexShrink:0 }} />
                          <span style={{ flex:1 }}>{ver.label}</span>
                          {active && <span style={{ fontSize:9, letterSpacing:"0.1em", color: ver.color }}>현재</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })() : null}
        </div>
      </div>
      {/* 보조 타이틀: 한글 label */}
      <div style={{ fontSize:11, color: disabled ? T.textDim : T.textMuted, marginBottom:4 }}>{app.label}</div>
      <div style={{ fontSize:11, color: disabled ? T.textDim : T.textMuted, lineHeight:1.5 }}>{app.desc}</div>
      {!hasVersions && app.canReceive.length > 0 && (
        <div style={{ marginTop:12, display:"flex", gap:4, flexWrap:"wrap" }}>
          {app.canReceive.slice(0,3).map(rid => (
            <span key={rid} style={{ fontSize:9, color:T.textDim, background:T.border, padding:"2px 5px", borderRadius:3 }}>{APP_MAP[rid]?.sub.split(" ")[0]}</span>
          ))}
          {app.canReceive.length > 3 && <span style={{ fontSize:9, color:T.textDim }}>+{app.canReceive.length-3}</span>}
        </div>
      )}
    </div>
  );
}

// 인덱스 전용 자동화 파이프라인 메뉴.
// "타이포그래피 자동화 1단계" — 타이포코어 소버린(current)을 autoPipeline 모드로 진입시킨다.
// 이 플래그(payload.params.autoPipeline)는 인덱스의 이 메뉴를 통해서만 주입되므로,
// 완전 자동(타이포 생성 → RenderMatrix 자동 렌더)은 여기서 시작했을 때만 작동한다.
function AutomationMenu() {
  const { navigate } = useGlobal();
  const T = useTheme();
  const typo = APP_MAP['typecore-sovereign'];
  const render = APP_MAP['render-metrics'];
  const c1 = typo?.color || '#A29BFE';
  const c2 = render?.color || '#00CEC9';

  const startStep1 = (e) => {
    if (e?.ctrlKey || e?.metaKey) return; // 새 탭 진입은 payload 가 유지되지 않으므로 무시.
    navigate('typecore-sovereign', { source: 'index-automation', params: { autoPipeline: true } });
  };

  return (
    <div style={{ padding:"0 40px 8px", maxWidth:1200, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <div style={{
        fontSize:10, fontWeight:700, letterSpacing:"0.14em",
        color: c2, textTransform:"uppercase", marginBottom:14,
        display:"flex", alignItems:"center", gap:8,
      }}>
        <span style={{ width:6, height:6, borderRadius:999, background:c2, boxShadow:`0 0 8px ${c2}66`, flexShrink:0 }} />
        자동화 파이프라인
      </div>

      <button
        onClick={startStep1}
        style={{
          width:"100%", textAlign:"left", cursor:"pointer",
          border:`1px solid ${c1}55`, borderRadius:16, padding:"20px 22px",
          background:`linear-gradient(120deg, ${c1}1f 0%, ${T.card} 45%, ${c2}1f 100%)`,
          display:"flex", alignItems:"center", gap:18,
          transition:"border-color .15s, transform .1s",
        }}
        onMouseEnter={(e)=>{ e.currentTarget.style.borderColor = c1; }}
        onMouseLeave={(e)=>{ e.currentTarget.style.borderColor = `${c1}55`; }}
      >
        <div style={{
          width:46, height:46, borderRadius:12, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:`${c1}22`, border:`1px solid ${c1}55`, color:c1,
        }}>
          <Zap size={22} />
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <span style={{ fontSize:15, fontWeight:800, color:T.text, letterSpacing:"-0.01em" }}>타이포그래피 자동화 1단계</span>
            <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.1em", color:c2, border:`1px solid ${c2}66`, borderRadius:999, padding:"2px 7px" }}>STEP 1</span>
          </div>
          <div style={{ fontSize:12, color:T.textMuted, lineHeight:1.6 }}>
            타이포코어에서 타이포를 만들면 <b style={{ color:T.text }}>렌더 매트릭스 렌더링 이미지까지 자동</b>으로 생성됩니다.
            <span style={{ color:T.textDim }}> · 인덱스 전용 · Imagen 렌더는 Pro 등급 이상</span>
          </div>
          {/* 흐름 칩 */}
          <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:10 }}>
            <span style={{ fontSize:10, fontWeight:700, color:c1, border:`1px solid ${c1}44`, borderRadius:6, padding:"3px 8px" }}>타이포코어 소버린</span>
            <ArrowRight size={13} style={{ color:T.textDim }} />
            <span style={{ fontSize:10, fontWeight:700, color:c2, border:`1px solid ${c2}44`, borderRadius:6, padding:"3px 8px" }}>렌더 매트릭스</span>
            <ArrowRight size={13} style={{ color:T.textDim }} />
            <span style={{ fontSize:10, fontWeight:700, color:T.textMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"3px 8px" }}>자동 렌더링</span>
          </div>
        </div>

        <div style={{
          flexShrink:0, display:"flex", alignItems:"center", gap:7,
          fontSize:12, fontWeight:800, color:"#0A0A0F",
          background:c1, borderRadius:10, padding:"10px 16px",
        }}>
          시작 <ArrowRight size={15} />
        </div>
      </button>
    </div>
  );
}

const BEGINNER_TASKS = [
  { id:"nexus-preview", title:"프로모션 키비주얼 만들기", desc:"프로모션 KV의 배경, 캐릭터와 타이틀 배치를 한 화면에서 구성해요.", icon:LayoutTemplate, color:"#22B8CF" },
  { id:"typecore-breeze", title:"멋진 글자 만들기", desc:"제목이나 로고 글자를 쉽고 재미있게 만들어요.", icon:Type, color:"#74B9FF" },
  { id:"render-metrics", title:"이미지를 더 멋지게", desc:"평면 이미지에 빛과 재질 느낌을 더해요.", icon:Sparkles, color:"#00CEC9" },
  { id:"mask-forge", title:"배경 지우기", desc:"사진에서 필요한 그림만 깔끔하게 남겨요.", icon:Scissors, color:"#FF3366" },
  { id:"prompt-arc", title:"아이디어 찾아보기", desc:"다른 사람이 만든 프롬프트와 결과를 구경해요.", icon:Search, color:"#6C5CE7" },
];

function BeginnerStart({ onOpen }) {
  const T = useTheme();
  return (
    <section style={{ padding:"0 40px", maxWidth:1200, margin:"0 auto 36px", width:"100%", boxSizing:"border-box" }}>
      <div style={{ marginBottom:14 }}>
        <h2 style={{ margin:0, fontSize:20, color:T.text, letterSpacing:"-0.02em" }}>무엇을 하고 싶나요?</h2>
        <p style={{ margin:"6px 0 0", fontSize:12, color:T.textMuted }}>하고 싶은 일을 하나 골라 바로 시작해 보세요.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:12 }}>
        {BEGINNER_TASKS.map((task) => {
          const Icon = task.icon;
          return (
            <button key={task.id} onClick={() => onOpen(task.id)} style={{
              minHeight:132, padding:"20px", textAlign:"left", cursor:"pointer",
              background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
              color:T.text, fontFamily:"inherit", display:"flex", flexDirection:"column", alignItems:"flex-start",
              transition:"transform .15s ease, border-color .15s ease, background .15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderColor=`${task.color}88`; e.currentTarget.style.background=T.card; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform="none"; e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.surface; }}>
              <span style={{ width:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:`${task.color}1f`, color:task.color, marginBottom:14 }}>
                <Icon size={20} />
              </span>
              <strong style={{ fontSize:15, marginBottom:6 }}>{task.title}</strong>
              <span style={{ fontSize:11, lineHeight:1.55, color:T.textMuted }}>{task.desc}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// macOS Dock — 인덱스 하단 고정 유리 패널. 자주 쓰는 앱 바로가기 + 호버 확대/라벨 툴팁.
// 스타일은 index.css .nx-dock*. 서브앱에서는 작업 영역을 가리므로 인덱스에서만 렌더.
const DOCK_APP_IDS = ["nexus-preview", "typecore-sovereign", "typecore-breeze", "render-metrics", "motion-metrics", "mask-forge", "prompt-arc", "banner-codex"];
function MacDock() {
  const { navigate } = useGlobal();
  const { isAdmin } = useAuth();
  const overrides = useAppVisibility();
  const apps = DOCK_APP_IDS
    .map((id) => APP_MAP[id])
    .filter((a) => a && !a.disabled && (!isAppHidden(a, overrides) || isAdmin));
  if (!apps.length) return null;
  return (
    <nav className="nx-dock" aria-label="독">
      {apps.map((app) => (
        <span key={app.id} style={{ display: "inline-flex", alignItems: "flex-end" }}>
          {/* 생성 그룹과 허브 그룹 사이 구분선 — macOS 독의 앱/문서 구분선처럼 */}
          {app.id === "prompt-arc" && <span className="nx-dock-sep" aria-hidden="true" />}
          <button type="button" className="nx-dock-item" onClick={(e) => {
            if (e.ctrlKey || e.metaKey) { window.open(`/${app.id}`, "_blank", "noopener,noreferrer"); return; }
            navigate(app.id);
          }}>
            <span className="nx-dock-icon" style={{ background: `linear-gradient(145deg, ${app.color} 0%, ${app.color}99 100%)` }}>
              {app.abbr || cardAbbr(app.sub)}
            </span>
            <span className="nx-dock-label">{app.label}</span>
          </button>
        </span>
      ))}
    </nav>
  );
}

function AppCardGrid({ onScroll, initialScrollTop = 0 }) {
  const { navigate } = useGlobal();
  const { isAdmin } = useAuth();
  const overrides = useAppVisibility();
  const T = useTheme();
  const scrollRef = useRef(null);
  const [showAllApps, setShowAllApps] = useState(false);
  const [toolGroup, setToolGroup] = useState("all");
  const [toolQuery, setToolQuery] = useState("");

  // 인덱스로 복귀 시 마지막 스크롤 위치 복원. 컨텐츠 비동기 로드 대비해 RAF 두 번 보정.
  useEffect(() => {
    if (!scrollRef.current || initialScrollTop <= 0) return;
    scrollRef.current.scrollTop = initialScrollTop;
    let raf1 = requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = initialScrollTop;
      raf1 = requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = initialScrollTop;
      });
    });
    return () => cancelAnimationFrame(raf1);
    // initialScrollTop 은 mount 시점 값만 쓴다 — 의도적 deps 빈 배열
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 그룹별 액센트 — 인덱스 섹션을 시각적으로 구분.
  // explore=Cyan(탐색/관찰), generate=Violet(AI 생성), production=Amber(출력/제작).
  // admin 은 별도 미니멀 처리(아래 분기).
  const GROUP_ACCENTS = {
    explore:    "#22B8CF",
    generate:   "#A29BFE",
    production: "#FDCB6E",
    life:       "#C9A24B",
  };
  const groups = [
    { key:"explore",    label:"허브 / 평가" },
    { key:"generate",   label:"프롬프트 생성" },
    { key:"production", label:"비주얼 생성" },
    { key:"life",       label:"생활" },
    // 관리자 그룹은 isAdmin일 때만 렌더 (아래 filter)
    ...(isAdmin ? [{ key:"admin", label:"Admin", adminLabel: true }] : []),
  ];
  return (
    <div ref={scrollRef} style={{ width:"100%", height:"100%", overflowY:"auto" }} onScroll={onScroll}>
      <IndexSearchBar />
      <BeginnerStart onOpen={(id) => navigate(id)} />
      <DashboardRecentPrompts />
      {/* 하단 여백 140 — 고정 Dock 이 마지막 콘텐츠를 가리지 않도록 */}
      <div style={{ padding:"0 40px 140px", maxWidth:1200, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
        <button onClick={() => setShowAllApps(v => !v)} aria-expanded={showAllApps} style={{
          width:"100%", padding:"14px 18px", borderRadius:14, cursor:"pointer", fontFamily:"inherit",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:T.surface, border:`1px solid ${T.border}`, color:T.text, fontSize:13, fontWeight:700,
          boxShadow:"0 10px 30px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.07)", backdropFilter:"blur(20px)",
          marginBottom:showAllApps ? 28 : 0,
        }}>
          <span>{showAllApps ? "도구 목록 접기" : "모든 도구 보기"}</span>
          <ChevronDown size={17} style={{ color:T.textMuted, transform:showAllApps ? "rotate(180deg)" : "none", transition:"transform .2s" }} />
        </button>
      {showAllApps && <>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:12 }}>
          {[
            ["all","전체"], ["explore","자료 찾기"], ["generate","글자·이미지 만들기"], ["production","다듬기·내보내기"], ["life","생활"],
            ...(isAdmin ? [["admin","관리"]] : []),
          ].map(([key,label]) => (
            <button key={key} onClick={() => setToolGroup(key)} style={{ padding:"7px 12px", borderRadius:999, cursor:"pointer", fontFamily:"inherit", fontSize:11, fontWeight:700, color:toolGroup === key ? "#fff" : T.textMuted, background:toolGroup === key ? T.accent : T.hoverBg, border:`1px solid ${toolGroup === key ? T.accent : T.border}` }}>{label}</button>
          ))}
        </div>
        <div style={{ position:"relative" }}>
          <Search size={15} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:T.textDim }} />
          <input value={toolQuery} onChange={(e) => setToolQuery(e.target.value)} placeholder="도구 이름이나 하고 싶은 일을 검색하세요" style={{ width:"100%", boxSizing:"border-box", padding:"11px 14px 11px 40px", borderRadius:9, background:T.surface, border:`1px solid ${T.border}`, color:T.text, outline:"none", fontFamily:"inherit", fontSize:12 }} />
        </div>
      </div>
      {groups.map(g => {
        // 숨김 처리된 앱(원래 adminOnly 또는 관리자 토글)은 비-관리자에게 보이지 않음.
        // 관리자에게는 보이되 '숨김' 표시 + 토글 가능.
        if (toolGroup !== "all" && toolGroup !== g.key) return null;
        const query = toolQuery.trim().toLowerCase();
        // adminLocked 앱은 가시성 오버라이드("공개" 토글)와 무관하게 비관리자에게 미노출.
        const apps = APP_REGISTRY.filter(a => a.group === g.key && (!isAppHidden(a, overrides) || isAdmin) && (!a.adminLocked || isAdmin))
          .filter(a => !query || `${a.label} ${a.sub} ${a.desc}`.toLowerCase().includes(query));
        if (!apps.length) return null;
        // Admin 그룹은 패널 wrapper 없이 기존 미니멀 톤 유지.
        if (g.adminLabel) {
          return (
            <div key={g.key} style={{ marginBottom:40 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color: T.accent, textTransform:"uppercase", marginBottom:14, borderLeft:"2px solid rgba(108,92,231,0.15)", paddingLeft:10 }}>{g.label}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {apps.map(app => <AppCard compact key={app.id} app={app} isAdmin={isAdmin} hiddenFromUsers={isAppHidden(app, overrides)} onOpen={(e) => {
                  if (e?.ctrlKey || e?.metaKey) { window.open(`/${app.id}`, "_blank", "noopener,noreferrer"); return; }
                  navigate(app.id);
                }} />)}
              </div>
            </div>
          );
        }
        // 일반 그룹 — 패널 wrapper 없이 헤더(dot + 라벨) + 카드 그리드만.
        // 그룹 식별은 카드의 아이콘 칩 컬러(groupAccent)로 — 한 그룹의 카드들이 같은 색 칩으로 줄지어 보임.
        const accent = GROUP_ACCENTS[g.key] || T.accent;
        return (
          <div key={g.key} style={{ marginBottom: 40 }}>
            <div style={{
              fontSize:10, fontWeight:700, letterSpacing:"0.14em",
              color: accent, textTransform:"uppercase",
              marginBottom:14,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{
                width:6, height:6, borderRadius:999, background: accent,
                boxShadow:`0 0 8px ${accent}66`,
                flexShrink:0,
              }} />
              {g.label}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {apps.map(app => <AppCard compact key={app.id} app={app} isAdmin={isAdmin} hiddenFromUsers={isAppHidden(app, overrides)} groupAccent={accent} onOpen={(e) => {
                if (e?.ctrlKey || e?.metaKey) { window.open(`/${app.id}`, "_blank", "noopener,noreferrer"); return; }
                navigate(app.id);
              }} />)}
            </div>
          </div>
        );
      })}
      <AutomationMenu />
      </>}
      </div>
      <MacDock />
    </div>
  );
}

function AppRouter({ appId, version, setVersion, versions }) {
  switch (appId) {
    case "prompt-arc":         return <PromptArcApp />;
    case "typecore-sovereign": return <TypecoreSovereignApp version={version} setVersion={setVersion} versions={versions} />;
    case "typecore-breeze":    return <TypecoreBreezeApp />;
    case "render-metrics":     return <RenderMatrixApp />;
    case "render-matrix-pop":  return <RenderMatrixPopApp version={version} />;
    case "motion-metrics":     return <MotionMatrixApp />;
    case "prompt-builder":     return <PromptBuilderApp />;
    case "prompt-builder-v2":  return <PromptBuilderV2App />;
    case "rubicon-forge":      return <RubiconForgeApp />;
    case "frame-forge":        return <FrameForgeApp />;
    case "logo-forge":         return <LogoForgeApp />;
    case "design-eval":        return <DesignEvaluatorApp />;
    case "design-lexicon":     return <DesignLexiconApp />;
    case "promotion-archive":  return <PromotionArchiveApp />;
    case "brand-web-review":   return <BrandWebReviewApp />;
    case "competitor-radar":   return <CompetitorRadarApp />;
    case "asset-library":      return <AssetLibraryApp />;
    case "banner-codex":       return <BannerCodexApp />;
    case "banner-creator":     return <BannerCreatorApp />;
    case "nexus-preview":      return <NexusPreviewApp />;
    case "promo-skin":         return <PromoSkinApp />;
    case "mask-forge":         return <MaskForgeApp />;
    case "theme-forge":        return <ThemeForgeApp />;
    case "vector-forge":       return <VectorForgeApp />;
    case "lumkey":             return <LumKeyApp />;
    case "figma-l10n":         return <FigmaL10nApp version={version} />;
    case "brief-studio":       return <BriefStudioApp version={version} />;
    case "prompt-audit":       return <PromptAuditApp />;
    case "destiny-observatory": return <Suspense fallback={null}><DestinyObservatoryApp /></Suspense>;
    case "pet-persona":        return <Suspense fallback={null}><PetPersonaApp /></Suspense>;
    case "nexus-admin":        return <NexusAdminApp />;
    default:                   return <PlaceholderApp appId={appId} />;
  }
}

// Topbar 아래 노출되는 버전 선택 서브헤더 — versions 있는 앱에서만 사용.
// position:fixed 로 두어 Topbar 와 동일하게 flow 에서 분리, 콘텐츠 위에 항상 떠 있음.
function VersionSubHeader({ versions, selectedVersion, onSelect }) {
  const T = useTheme();
  return (
    <div style={{ position:"fixed", top:52, left:0, right:0, zIndex:999, height:36, minHeight:36, background:T.surface, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:4, background:T.bg, border:`1px solid ${T.border}`, borderRadius:999, padding:"3px 4px" }}>
        {versions.map((v) => {
          const active = v.key === selectedVersion;
          return (
            <button key={v.key}
              onClick={() => onSelect(v.key)}
              title={`${v.label} 버전으로 전환`}
              style={{
                padding:"4px 12px", borderRadius:999, border:0, cursor:"pointer",
                background: active ? `${v.color}22` : "transparent",
                color: active ? v.color : T.textMuted,
                fontSize:11, fontWeight:700, letterSpacing:"0.01em",
                fontFamily:"inherit", transition:"all 0.12s",
              }}>{v.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// adminLocked 앱을 비관리자가 열었을 때의 차단 화면 — 가시성 오버라이드/직접 URL 우회 방지.
function AdminOnlyBlock() {
  const { setCurrentApp } = useGlobal();
  const T = useTheme();
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:24, textAlign:"center" }}>
      <div style={{ width:52, height:52, borderRadius:14, display:"grid", placeItems:"center", background:T.hoverBg, border:`1px solid ${T.border}`, color:T.textMuted }}>
        <Lock size={24} />
      </div>
      <div>
        <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:6 }}>관리자 전용 도구입니다</div>
        <div style={{ fontSize:12, color:T.textMuted, lineHeight:1.6 }}>이 앱은 관리자 계정만 사용할 수 있어요.</div>
      </div>
      <button onClick={() => setCurrentApp(null)} className="nx-btn nx-btn-primary" style={{ marginTop:4 }}>홈으로 돌아가기</button>
    </div>
  );
}

export default function Shell() {
  const { currentApp } = useGlobal();
  const { loginModalOpen, closeLoginModal, isAdmin } = useAuth();
  const T = useTheme();
  const app = currentApp ? APP_MAP[currentApp] : null;
  const hasVersions = Array.isArray(app?.versions) && app.versions.length > 0;
  const [selectedVersion, setSelectedVersionRaw] = useState(() => readSelectedVersion(app));
  const [scrollY, setScrollY] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [skillChatId, setSkillChatId] = useState(null); // 대화형 스킬 오버레이 (null=닫힘)
  // 인덱스 스크롤 위치 — 앱 진입 시점에 보관, 복귀 시 AppCardGrid 가 컨테이너 scrollTop 복원에 사용.
  const indexScrollYRef = useRef(0);

  // 앱 전환 시 선택된 버전을 해당 앱 기준으로 다시 계산.
  // scrollY 상태: 앱 진입 시 0, 인덱스 복귀 시 보관된 위치로 복원 (Topbar 투명도 즉시 일치).
  useEffect(() => {
    // 앱 전환이라는 외부 내비게이션 상태에 맞춰 버전/스크롤 UI를 동기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedVersionRaw(readSelectedVersion(app));
    setScrollY(currentApp ? 0 : indexScrollYRef.current);
  }, [currentApp]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSelectedVersion = (key) => {
    if (!app?.versions) return;
    setSelectedVersionRaw(key);
    try { localStorage.setItem(versionStorageKey(app.id), key); } catch {}
  };

  // 인덱스 페이지의 스크롤 위치 — Topbar 투명/블러 그라데이션 + 앱 진입 후 복귀 시 위치 복원에 사용.
  const handleIndexScroll = (e) => {
    const y = e.currentTarget.scrollTop;
    indexScrollYRef.current = y;
    setScrollY(y);
  };

  // Topbar(52) + VersionSubHeader(36) 모두 position:fixed 라 flex flow 에서 빠짐.
  // AppRouter 영역은 그만큼 paddingTop 으로 회피.
  // - 인덱스: 0 (Hero 가 투명 Topbar 뒤로 깔리는 Runway 스타일)
  // - 서브앱(versions 없음): 52 (Topbar 만)
  // - 서브앱(versions 있음): 52 + 36 = 88 (Topbar + SubHeader)
  // 자체 인라인 버전 셀렉터를 가진 앱들 — 글로벌 VersionSubHeader 건너뜀
  const inlineVersionApps = ['typecore-sovereign'];
  const usesInlineVersion = currentApp && inlineVersionApps.includes(currentApp);
  const subHeaderHeight = (currentApp && hasVersions && !usesInlineVersion) ? 36 : 0;
  const innerPaddingTop = currentApp ? 52 : 0;

  return (
    <div className="nexus-shell" style={{ height:"100vh", background:T.bg, color:T.text, fontFamily:"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Noto Sans KR', sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* 폰트 link 는 index.html <head> 에 위치 — CSS 파싱 대기 없이 즉시 다운로드 시작. */}
      <style>{`
        * { box-sizing:border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:999px}
        :where(button, a, input, textarea, select, [role="button"]):focus-visible {
          outline:2px solid ${T.accent} !important;
          outline-offset:2px !important;
        }
        :where(button, [role="button"]):disabled { cursor:not-allowed; }
        @media (prefers-reduced-motion:reduce) {
          *, *::before, *::after { scroll-behavior:auto !important; animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
        }
      `}</style>
      {/* 폰트 프리로드 — Teko 5개 가중치를 각각 span 으로 명시해 Shell 마운트 시점에
          전 가중치 다운로드 trigger. lazy 로 로드되는 서브앱들이 도착할 때면 폰트 준비 완료. */}
      <div aria-hidden="true" style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        fontFamily: "'Teko', sans-serif",
        fontWeight: 300,
        opacity: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}>
        <span style={{ fontWeight: 300 }}>.</span>
        <span style={{ fontWeight: 400 }}>.</span>
        <span style={{ fontWeight: 500 }}>.</span>
        <span style={{ fontWeight: 600 }}>.</span>
        <span style={{ fontWeight: 700 }}>.</span>
      </div>
      <Topbar scrollY={scrollY} onOpenPalette={() => setPaletteOpen(true)} />
      {/* VersionSubHeader — 인라인 셀렉터를 쓰는 앱(sovereign 등)은 제외 */}
      {currentApp && hasVersions && !inlineVersionApps.includes(currentApp) && (
        <VersionSubHeader versions={app.versions} selectedVersion={selectedVersion} onSelect={setSelectedVersion} />
      )}
      <div style={{ flex:1, overflow:"hidden", paddingTop: innerPaddingTop + subHeaderHeight, minHeight:0 }}>
        {/* 인덱스 재마운트 시 직전 스크롤 위치를 초기값으로 한 번 전달한다. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {currentApp
          ? (app?.adminLocked && !isAdmin
            ? <AdminOnlyBlock />
            : <AppRouter appId={currentApp} version={selectedVersion} setVersion={setSelectedVersion} versions={app?.versions} />)
          : <AppCardGrid onScroll={handleIndexScroll} initialScrollTop={indexScrollYRef.current}/>}
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onLaunchSkill={(id) => setSkillChatId(id ?? "")} />
      <SkillChat key={skillChatId ?? "closed"} openId={skillChatId} onClose={() => setSkillChatId(null)} />
      {loginModalOpen && <LoginScreen asModal onClose={closeLoginModal} />}
      <Notification/>
    </div>
  );
}
