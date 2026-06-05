import { useEffect, useRef, useState } from "react";
import { Menu, Lock, MoreHorizontal, Eye, EyeOff } from "lucide-react";
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
import DashboardHero from "./DashboardHero";
import DashboardRecentPrompts from "./DashboardRecentPrompts";
import IndexSearchBar from "./IndexSearchBar";
import CommandPalette from "./CommandPalette";
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
import MaskForgeApp from "../apps/MaskForge";
import VectorForgeApp from "../apps/VectorForge";
import LumKeyApp from "../apps/LumKey";
import FigmaL10nApp from "../apps/FigmaL10n";
import BriefStudioApp from "../apps/BriefStudio";
import NexusAdminApp from "../apps/NexusAdmin";
import PromptAuditApp from "../apps/PromptAudit";
import PlaceholderApp from "../apps/PlaceholderApp";

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

function Topbar({ scrollY = 0, onOpenPalette }) {
  const { currentApp, setCurrentApp, isLight } = useGlobal();
  const T = useTheme();
  const { user, profile, grade, openLoginModal } = useAuth();
  const { remaining, cap, used } = useWeeklyCredits();
  const [profileOpen, setProfileOpen] = useState(false);
  const app = currentApp ? APP_MAP[currentApp] : null;
  const isIndex = !app;

  const dynamicStyle = isIndex
    ? computeIndexTopbarStyle(scrollY, T, isLight)
    : { background: T.surface, backdropFilter: "none", WebkitBackdropFilter: "none", borderColor: T.border };

  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 20px", height:52, minHeight:52, maxHeight:52,
      borderBottom: "none",
      background: dynamicStyle.background,
      backdropFilter: dynamicStyle.backdropFilter,
      WebkitBackdropFilter: dynamicStyle.WebkitBackdropFilter,
      fontFamily:"'Noto Sans KR', sans-serif",
      position:"fixed", top:0, left:0, right:0, zIndex:1000,
      transition: "background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
    }}>
      {/* LEFT: [햄버거] [NEXUS STUDIO 로고] [(서브앱일 때) 앱 이름] */}
      <div style={{ display:"flex", alignItems:"center", gap:10, position:"relative" }}>
        {/* 햄버거 — Command Palette 오픈. 인덱스/서브앱 모두 노출. */}
        <button
          type="button"
          onClick={onOpenPalette}
          title="앱 검색 (Command Palette)"
          style={{
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:32, height:32, padding:0, border:0, borderRadius:6,
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
          <NexusLogo height={18} color={T.text} />
          <span style={{ display:"inline-flex", alignItems:"baseline", gap:6, fontFamily:"'Teko', sans-serif", fontSize:22, lineHeight:1, letterSpacing:"0.5px", whiteSpace:"nowrap", transform:"translateY(2px)" }}>
            <span style={{ color: T.text, fontWeight:600 }}>NEXUS</span>
            <span style={{ color: T.text, fontWeight:600 }}>STUDIO</span>
          </span>
        </div>
        {/* 서브앱일 때만: 앱 이름 (클릭 불가, 앱 포인트 컬러).
            전체 단일 span — Teko 일괄 적용. sub 없으면 label 폴백. */}
        {!isIndex && (() => {
          const display = (app.sub && String(app.sub).trim()) || app.label || "";
          if (!display) return null;
          return (
            <span style={{ fontFamily:"'Teko', sans-serif", fontSize:16, fontWeight:600, color: app.color, lineHeight:1, letterSpacing:"0.4px", whiteSpace:"nowrap", display:"inline-block", transform:"translateY(4px)", userSelect:"none", pointerEvents:"none" }}>
              {display}
            </span>
          );
        })()}
      </div>

      {/* RIGHT: 등급·크레딧 — 두 영역을 하나의 pill 박스로 묶어 시각 단위화. */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
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
              borderRadius: 999,
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

function AppCard({ app, onOpen, isAdmin, hiddenFromUsers = false, groupAccent = null }) {
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
  return (
    <div onClick={handleClick} onMouseEnter={() => !disabled && setHov(true)} onMouseLeave={() => setHov(false)}
      title={disabled ? "준비 중인 앱입니다" : (hiddenFromUsers && canToggleVisibility ? "일반 사용자에게는 숨겨진 앱 — 우측 [숨김] 뱃지를 눌러 공개로 전환" : (adminUnlocked ? "관리자 권한으로 활성화됨" : (hasVersions ? "버전 선택 후 카드를 눌러 실행" : undefined)))}
      style={{
        // 준비 중: 한층 더 어두운/연한 배경 + 점선 보더로 "미완성" 시그널
        // 숨김 카드 (admin 시점): 점선 보더로 "공개 안 됨" 시각화
        background: disabled ? disabledBg : (hov ? T.card : T.surface),
        border: disabled ? `1px dashed ${disabledBorder}` : (hiddenFromUsers && canToggleVisibility ? `1px dashed rgba(225,112,85,0.45)` : `1px solid ${T.border}`),
        borderRadius: 10, padding: "18px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : (adminUnlocked ? 0.85 : (hiddenFromUsers && canToggleVisibility ? 0.85 : 1)),
        filter: disabled ? "grayscale(0.8)" : "none",
        transition: "all 0.2s",
        transform: (!disabled && hov) ? "translateY(-2px)" : "none",
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

function AppCardGrid({ onScroll, initialScrollTop = 0 }) {
  const { navigate } = useGlobal();
  const { isAdmin } = useAuth();
  const overrides = useAppVisibility();
  const T = useTheme();
  const scrollRef = useRef(null);

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
  };
  const groups = [
    { key:"explore",    label:"허브 / 평가" },
    { key:"generate",   label:"프롬프트 생성" },
    { key:"production", label:"비주얼 생성" },
    // 관리자 그룹은 isAdmin일 때만 렌더 (아래 filter)
    ...(isAdmin ? [{ key:"admin", label:"Admin", adminLabel: true }] : []),
  ];
  return (
    <div ref={scrollRef} style={{ width:"100%", height:"100%", overflowY:"auto" }} onScroll={onScroll}>
      <DashboardHero />
      <IndexSearchBar />
      <DashboardRecentPrompts />
      <div style={{ padding:"0 40px 60px", maxWidth:1200, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      {groups.map(g => {
        // 숨김 처리된 앱(원래 adminOnly 또는 관리자 토글)은 비-관리자에게 보이지 않음.
        // 관리자에게는 보이되 '숨김' 표시 + 토글 가능.
        const apps = APP_REGISTRY.filter(a => a.group === g.key && (!isAppHidden(a, overrides) || isAdmin));
        if (!apps.length) return null;
        // Admin 그룹은 패널 wrapper 없이 기존 미니멀 톤 유지.
        if (g.adminLabel) {
          return (
            <div key={g.key} style={{ marginBottom:40 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color: T.accent, textTransform:"uppercase", marginBottom:14, borderLeft:"2px solid rgba(108,92,231,0.15)", paddingLeft:10 }}>{g.label}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
                {apps.map(app => <AppCard key={app.id} app={app} isAdmin={isAdmin} hiddenFromUsers={isAppHidden(app, overrides)} onOpen={(e) => {
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
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              {apps.map(app => <AppCard key={app.id} app={app} isAdmin={isAdmin} hiddenFromUsers={isAppHidden(app, overrides)} groupAccent={accent} onOpen={(e) => {
                if (e?.ctrlKey || e?.metaKey) { window.open(`/${app.id}`, "_blank", "noopener,noreferrer"); return; }
                navigate(app.id);
              }} />)}
            </div>
          </div>
        );
      })}
      </div>
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
    case "mask-forge":         return <MaskForgeApp />;
    case "vector-forge":       return <VectorForgeApp />;
    case "lumkey":             return <LumKeyApp />;
    case "figma-l10n":         return <FigmaL10nApp />;
    case "brief-studio":       return <BriefStudioApp />;
    case "prompt-audit":       return <PromptAuditApp />;
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
                fontSize:11, fontWeight:700, letterSpacing:"0.04em",
                fontFamily:"'Noto Sans KR', sans-serif", transition:"all 0.12s",
              }}>{v.label}</button>
          );
        })}
      </div>
    </div>
  );
}

export default function Shell() {
  const { currentApp } = useGlobal();
  const { loginModalOpen, closeLoginModal } = useAuth();
  const T = useTheme();
  const app = currentApp ? APP_MAP[currentApp] : null;
  const hasVersions = Array.isArray(app?.versions) && app.versions.length > 0;
  const [selectedVersion, setSelectedVersionRaw] = useState(() => readSelectedVersion(app));
  const [scrollY, setScrollY] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // 인덱스 스크롤 위치 — 앱 진입 시점에 보관, 복귀 시 AppCardGrid 가 컨테이너 scrollTop 복원에 사용.
  const indexScrollYRef = useRef(0);

  // 앱 전환 시 선택된 버전을 해당 앱 기준으로 다시 계산.
  // scrollY 상태: 앱 진입 시 0, 인덱스 복귀 시 보관된 위치로 복원 (Topbar 투명도 즉시 일치).
  useEffect(() => {
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
    <div style={{ height:"100vh", background:T.bg, color:T.text, fontFamily:"'Noto Sans KR', sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* 폰트 link 는 index.html <head> 에 위치 — CSS 파싱 대기 없이 즉시 다운로드 시작. */}
      <style>{`* { box-sizing:border-box; } @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)} } ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}`}</style>
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
        {currentApp ? <AppRouter appId={currentApp} version={selectedVersion} setVersion={setSelectedVersion} versions={app?.versions} /> : <AppCardGrid onScroll={handleIndexScroll} initialScrollTop={indexScrollYRef.current}/>}
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {loginModalOpen && <LoginScreen asModal onClose={closeLoginModal} />}
      <Notification/>
    </div>
  );
}
