import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { APP_MAP, APP_REGISTRY, THEME } from "../config/apps";
import { useGlobal } from "../context/GlobalContext";
import { useAuth } from "../context/AuthContext";
import { GRADE_LABEL, GRADES } from "../lib/grades";

// 등급 컬러 — ProfilePopover 와 동일. lib/grades에 없어서 인라인 정의.
const GRADE_COLOR = {
  [GRADES.general]: "#7A7A9A",
  [GRADES.pro]:     "#C8A969",
  [GRADES.expert]:  "#0eb9b3",
};
import NexusLogo from "./NexusLogo";
// import ThemeToggle from "./ThemeToggle"; // 라이트 모드 미완성 — 임시 비활성화
import UserAvatar from "./UserAvatar";
import ProfilePopover from "./ProfilePopover";
import DashboardHero from "./DashboardHero";
import DashboardRecentPrompts from "./DashboardRecentPrompts";
import IndexSearchBar from "./IndexSearchBar";
import CommandPalette from "./CommandPalette";
import PromptArcApp from "../apps/PromptArc";
import TypecoreSovereignApp from "../apps/TypecoreSovereign";
import TypecoreBreezeApp from "../apps/TypecoreBreeze";
import RenderMatrixApp from "../apps/RenderMatrix";
import RenderMatrixPopApp from "../apps/RenderMatrixPop";
import MotionMatrixApp from "../apps/MotionMatrix";
import PromptBuilderApp from "../apps/PromptBuilder";
import RubiconForgeApp from "../apps/RubiconForge";
import LogoForgeApp from "../apps/LogoForge";
import DesignEvaluatorApp from "../apps/DesignEvaluator";
import PromotionArchiveApp from "../apps/PromotionArchive";
import BrandWebReviewApp from "../apps/BrandWebReview";
import BannerCodexApp from "../apps/BannerCodex";
import BriefStudioApp from "../apps/BriefStudio";
import NexusAdminApp from "../apps/NexusAdmin";
import PlaceholderApp from "../apps/PlaceholderApp";

// 인덱스 스크롤 → Topbar 배경/블러 동적 계산.
// 0px: 완전 투명 / 50px: 페이드인 시작 / 150px: 완전 불투명 + blur 16px.
function computeIndexTopbarStyle(scrollY) {
  const start = 50, end = 150;
  const t = Math.max(0, Math.min(1, (scrollY - start) / (end - start)));
  // 0 → 0.95 opacity / 0px → 16px blur
  const opacity = 0.95 * t;
  const blur = 16 * t;
  return {
    background: opacity === 0 ? "transparent" : `rgba(10, 10, 15, ${opacity.toFixed(3)})`,
    backdropFilter: blur === 0 ? "none" : `blur(${blur.toFixed(1)}px)`,
    WebkitBackdropFilter: blur === 0 ? "none" : `blur(${blur.toFixed(1)}px)`,
    borderColor: t < 0.05 ? "transparent" : THEME.border,
  };
}

function Topbar({ scrollY = 0, onOpenPalette }) {
  const { currentApp, setCurrentApp } = useGlobal();
  const { user, profile, grade } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const app = currentApp ? APP_MAP[currentApp] : null;
  const isIndex = !app;

  const dynamicStyle = isIndex
    ? computeIndexTopbarStyle(scrollY)
    : { background: THEME.surface, backdropFilter: "none", WebkitBackdropFilter: "none", borderColor: THEME.border };

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
            background:"transparent", color: THEME.textMuted, cursor:"pointer",
            transition:"background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = THEME.textMuted; }}
        >
          <Menu size={18} />
        </button>
        {/* 로고 + NEXUS STUDIO — 항상 노출, 클릭 시 인덱스로 이동 */}
        <div
          onClick={() => setCurrentApp(null)}
          title="홈으로"
          style={{ display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}
        >
          <NexusLogo height={18} />
          <span style={{ display:"inline-flex", alignItems:"baseline", gap:6, fontFamily:"'Teko', sans-serif", fontSize:22, lineHeight:1, letterSpacing:"0.5px", whiteSpace:"nowrap", transform:"translateY(2px)" }}>
            <span style={{ color:"#ffffff", fontWeight:600 }}>NEXUS</span>
            <span style={{ color:"#ffffff", fontWeight:600 }}>STUDIO</span>
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

      {/* RIGHT: 등급 뱃지 + 프로필 아이콘 */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {user && grade && GRADE_LABEL[grade] && (() => {
          const gColor = GRADE_COLOR[grade] || THEME.accent;
          return (
            <div
              title={`현재 등급: ${GRADE_LABEL[grade]}`}
              style={{
                display:"inline-flex", alignItems:"center", gap:5,
                padding:"3px 9px", borderRadius:999,
                background:`${gColor}1A`, border:`1px solid ${gColor}55`,
                fontSize:10, fontWeight:700, color:gColor, letterSpacing:"0.08em",
                userSelect:"none",
              }}
            >
              <span style={{ width:5, height:5, borderRadius:999, background:gColor }} />
              {GRADE_LABEL[grade].toUpperCase()}
            </div>
          );
        })()}
        {user && (
          <button
            onClick={() => setProfileOpen((v) => !v)}
            title="프로필 메뉴"
            style={{
              padding:0, border:0, background:"transparent", cursor:"pointer",
              borderRadius:"50%", outline: "none",
            }}>
            <UserAvatar profile={profile} user={user} size={30} title={user.email || user.displayName || ""} />
          </button>
        )}
      </div>
      <ProfilePopover open={profileOpen} onClose={() => setProfileOpen(false)} />
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

const versionStorageKey = (appId) => `${appId}:version`;
const readSelectedVersion = (app) => {
  if (!app?.versions?.length) return null;
  try {
    const saved = localStorage.getItem(versionStorageKey(app.id));
    if (saved && app.versions.some(v => v.key === saved)) return saved;
  } catch {}
  return app.defaultVersion || app.versions[app.versions.length - 1].key;
};

function AppCard({ app, onOpen, isAdmin }) {
  const [hov, setHov] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(() => readSelectedVersion(app));
  const disabled = !!app.disabled && !isAdmin;
  const adminUnlocked = !!app.disabled && isAdmin;
  const hasVersions = Array.isArray(app.versions) && app.versions.length > 0;
  const handleClick = () => { if (!disabled) onOpen(); };
  const pickVersion = (e, key) => {
    e.stopPropagation();
    setSelectedVersion(key);
    try { localStorage.setItem(versionStorageKey(app.id), key); } catch {}
    if (!disabled) onOpen();
  };
  return (
    <div onClick={handleClick} onMouseEnter={() => !disabled && setHov(true)} onMouseLeave={() => setHov(false)}
      title={disabled ? "준비 중인 앱입니다" : (adminUnlocked ? "관리자 권한으로 활성화됨" : (hasVersions ? "버전 선택 후 카드를 눌러 실행" : undefined))}
      style={{
        background: disabled ? THEME.surface : (hov ? THEME.card : THEME.surface),
        border: `1px solid ${THEME.border}`,
        borderRadius: 10, padding: "18px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : (adminUnlocked ? 0.85 : 1),
        filter: disabled ? "grayscale(0.5)" : "none",
        transition: "all 0.2s",
        transform: (!disabled && hov) ? "translateY(-2px)" : "none",
        position: "relative",
      }}>
      {/* 우상단 뱃지 — 아이콘 제거, 영문 타이틀이 좌측을 차지하므로 뱃지만 우측에 정렬 */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"flex-end", minHeight:18, marginBottom:6 }}>
        {disabled ? (
          <span style={{ fontSize:9, letterSpacing:"0.1em", color:THEME.textMuted, textTransform:"uppercase", background:"rgba(122,122,154,0.15)", border:`1px solid ${THEME.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>준비 중</span>
        ) : app.beta ? (
          <span style={{ fontSize:9, letterSpacing:"0.1em", color:THEME.textMuted, textTransform:"uppercase", background:"transparent", border:`1px solid ${THEME.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>BETA</span>
        ) : app.badge ? (
          <span style={{ fontSize:9, letterSpacing:"0.08em", color:THEME.textMuted, background:"transparent", border:`1px solid ${THEME.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>{app.badge}</span>
        ) : adminUnlocked ? (
          <span style={{ fontSize:9, letterSpacing:"0.1em", color:THEME.textMuted, textTransform:"uppercase", background:"transparent", border:`1px solid ${THEME.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>Admin</span>
        ) : hasVersions ? (() => {
          const v = app.versions.find(x => x.key === selectedVersion);
          return <span style={{ fontSize:9, letterSpacing:"0.08em", color:THEME.textMuted, background:"transparent", border:`1px solid ${THEME.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>{v?.label || selectedVersion}</span>;
        })() : null}
      </div>
      {/* 메인 타이틀: 영문 sub */}
      <div style={{ fontSize:15, fontWeight:700, color:THEME.text, marginBottom:4, lineHeight:1.2 }}>{app.sub}</div>
      {/* 보조 타이틀: 한글 label */}
      <div style={{ fontSize:11, color:THEME.textMuted, marginBottom:4 }}>{app.label}</div>
      <div style={{ fontSize:11, color:THEME.textMuted, lineHeight:1.5 }}>{app.desc}</div>
      {hasVersions && (
        <div style={{ marginTop:12, display:"flex", gap:4 }}>
          {app.versions.map(v => {
            const active = v.key === selectedVersion;
            return (
              <button
                key={v.key}
                onClick={(e) => pickVersion(e, v.key)}
                title={`${v.label} 버전으로 실행`}
                style={{
                  flex:1,
                  fontSize:10, fontWeight:700, letterSpacing:"0.04em",
                  padding:"5px 6px", borderRadius:5, cursor:"pointer",
                  background: active ? `${v.color}22` : "transparent",
                  border: `1px solid ${active ? `${v.color}88` : THEME.border}`,
                  color: active ? v.color : THEME.textMuted,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${v.color}aa`; e.currentTarget.style.color = v.color; }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textMuted; } }}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}
      {!hasVersions && app.canReceive.length > 0 && (
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

function AppCardGrid({ onScroll }) {
  const { navigate } = useGlobal();
  const { isAdmin } = useAuth();
  const groups = [
    { key:"hub",      label:"허브" },
    { key:"evaluate", label:"탐색 / 평가" },
    { key:"generate", label:"프롬프트 생성" },
    // 관리자 그룹은 isAdmin일 때만 렌더 (아래 filter)
    ...(isAdmin ? [{ key:"admin", label:"Admin", adminLabel: true }] : []),
  ];
  return (
    <div style={{ width:"100%", height:"100%", overflowY:"auto" }} onScroll={onScroll}>
      <DashboardHero />
      <IndexSearchBar />
      <DashboardRecentPrompts />
      <div style={{ padding:"0 40px 60px", maxWidth:1200, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      {groups.map(g => {
        // adminOnly 앱은 비-관리자 화면에서 카드 자체가 보이지 않음
        const apps = APP_REGISTRY.filter(a => a.group === g.key && (!a.adminOnly || isAdmin));
        if (!apps.length) return null;
        const labelStyle = g.adminLabel
          ? { fontSize:10, fontWeight:700, letterSpacing:"0.14em", color: THEME.accent, textTransform:"uppercase", marginBottom:14, borderLeft:`2px solid ${THEME.accent}`, paddingLeft:10 }
          : { fontSize:10, fontWeight:600, letterSpacing:"0.14em", color:THEME.textDim, textTransform:"uppercase", marginBottom:14, borderLeft:`2px solid ${THEME.border}`, paddingLeft:10 };
        return (
          <div key={g.key} style={{ marginBottom:40 }}>
            <div style={labelStyle}>{g.label}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              {apps.map(app => <AppCard key={app.id} app={app} isAdmin={isAdmin} onOpen={() => navigate(app.id)} />)}
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
    case "rubicon-forge":      return <RubiconForgeApp />;
    case "logo-forge":         return <LogoForgeApp />;
    case "design-eval":        return <DesignEvaluatorApp />;
    case "promotion-archive":  return <PromotionArchiveApp />;
    case "brand-web-review":   return <BrandWebReviewApp />;
    case "banner-codex":       return <BannerCodexApp />;
    case "brief-studio":       return <BriefStudioApp />;
    case "nexus-admin":        return <NexusAdminApp />;
    default:                   return <PlaceholderApp appId={appId} />;
  }
}

// Topbar 아래 노출되는 버전 선택 서브헤더 — versions 있는 앱에서만 사용.
// position:fixed 로 두어 Topbar 와 동일하게 flow 에서 분리, 콘텐츠 위에 항상 떠 있음.
function VersionSubHeader({ versions, selectedVersion, onSelect }) {
  return (
    <div style={{ position:"fixed", top:52, left:0, right:0, zIndex:999, height:36, minHeight:36, background:THEME.surface, borderBottom:`1px solid ${THEME.border}`, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:4, background:THEME.bg, border:`1px solid ${THEME.border}`, borderRadius:999, padding:"3px 4px" }}>
        {versions.map((v) => {
          const active = v.key === selectedVersion;
          return (
            <button key={v.key}
              onClick={() => onSelect(v.key)}
              title={`${v.label} 버전으로 전환`}
              style={{
                padding:"4px 12px", borderRadius:999, border:0, cursor:"pointer",
                background: active ? `${v.color}22` : "transparent",
                color: active ? v.color : THEME.textMuted,
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
  const app = currentApp ? APP_MAP[currentApp] : null;
  const hasVersions = Array.isArray(app?.versions) && app.versions.length > 0;
  const [selectedVersion, setSelectedVersionRaw] = useState(() => readSelectedVersion(app));
  const [scrollY, setScrollY] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 앱 전환 시 선택된 버전을 해당 앱 기준으로 다시 계산 + 스크롤 리셋.
  useEffect(() => {
    setSelectedVersionRaw(readSelectedVersion(app));
    setScrollY(0);
  }, [currentApp]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSelectedVersion = (key) => {
    if (!app?.versions) return;
    setSelectedVersionRaw(key);
    try { localStorage.setItem(versionStorageKey(app.id), key); } catch {}
  };

  // 인덱스 페이지의 스크롤 위치 — Topbar 투명/블러 그라데이션 계산에 사용.
  const handleIndexScroll = (e) => {
    setScrollY(e.currentTarget.scrollTop);
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
    <div style={{ height:"100vh", background:THEME.bg, color:THEME.text, fontFamily:"'Noto Sans KR', sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* 폰트 link 는 index.html <head> 에 위치 — CSS 파싱 대기 없이 즉시 다운로드 시작. */}
      <style>{`* { box-sizing:border-box; } @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)} } ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${THEME.border};border-radius:2px}`}</style>
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
        {currentApp ? <AppRouter appId={currentApp} version={selectedVersion} setVersion={setSelectedVersion} versions={app?.versions} /> : <AppCardGrid onScroll={handleIndexScroll}/>}
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Notification/>
    </div>
  );
}
