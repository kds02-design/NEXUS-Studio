import { useState } from "react";
import { APP_MAP, APP_REGISTRY, THEME } from "../config/apps";
import { useGlobal } from "../context/GlobalContext";
import { useAuth } from "../context/AuthContext";
import { GradeBadge } from "./UsageGate";
import AdminPanel from "./AdminPanel";
import NexusTitle from "./NexusTitle";
import PromptArcApp from "../apps/PromptArc";
import TypecoreSovereignApp from "../apps/TypecoreSovereign";
import TypecoreBreezeApp from "../apps/TypecoreBreeze";
import RenderMatrixApp from "../apps/RenderMatrix";
import MotionMatrixApp from "../apps/MotionMatrix";
import RubiconForgeApp from "../apps/RubiconForge";
import DesignEvaluatorApp from "../apps/DesignEvaluator";
import PromotionArchiveApp from "../apps/PromotionArchive";
import BannerCodexApp from "../apps/BannerCodex";
import BriefStudioApp from "../apps/BriefStudio";
import PlaceholderApp from "../apps/PlaceholderApp";

function Topbar() {
  const { currentApp, setCurrentApp } = useGlobal();
  const { user, signOut, isAdmin } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const app = currentApp ? APP_MAP[currentApp] : null;
  const initial = (user?.displayName || user?.email || "?").charAt(0).toUpperCase();
  const onLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    try { await signOut(); } catch (e) { console.error("[Auth] signOut failed", e); }
  };
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", height:52, borderBottom:`1px solid ${THEME.border}`, background:THEME.surface, flexShrink:0, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div
        onClick={() => app && setCurrentApp(null)}
        title={app ? "대시보드로 이동" : undefined}
        style={{
          display:"flex", alignItems:"center",
          cursor: app ? "pointer" : "default",
          padding:"4px 6px", margin:"-4px -6px", borderRadius:6,
          opacity: 1,
          transition: "opacity 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => { if (app) { e.currentTarget.style.opacity = "0.75"; e.currentTarget.style.background = `${THEME.accent}10`; } }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "transparent"; }}
      >
        <NexusTitle first="NEXUS" second="STUDIO" color={THEME.accent} size={24} />
        {app && <><span style={{ color:THEME.textDim, margin:"0 10px", fontSize:14 }}>›</span><span style={{ fontSize:12, color:THEME.textMuted, letterSpacing:"0.02em" }}>{app.sub}</span></>}
        {!app && <span style={{ fontSize:11, color:THEME.textMuted, letterSpacing:"0.06em", marginLeft:10 }}>Creative Nexus Platform</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {app && (
          <button onClick={() => setCurrentApp(null)} style={{ background:"none", border:`1px solid ${THEME.border}`, borderRadius:6, color:THEME.textMuted, padding:"4px 12px", fontSize:12, cursor:"pointer" }}>
            ← 대시보드
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setAdminOpen(true)} title="사용자 승인 관리" style={{ background:`${THEME.accent}1A`, border:`1px solid ${THEME.accent}55`, borderRadius:6, color:THEME.accent, padding:"4px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Admin
          </button>
        )}
        {user && (
          <>
            <GradeBadge />
            <div title={user.email || user.displayName || ""} style={{ width:28, height:28, borderRadius:"50%", background:THEME.accentSoft, color:THEME.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, border:`1px solid ${THEME.border}`, overflow:"hidden" }}>
              {user.photoURL ? <img src={user.photoURL} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : initial}
            </div>
            <button onClick={onLogout} style={{ background:"none", border:`1px solid ${THEME.border}`, borderRadius:6, color:THEME.textMuted, padding:"4px 12px", fontSize:12, cursor:"pointer" }}>
              로그아웃
            </button>
          </>
        )}
      </div>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
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

function AppCard({ app, onOpen, isAdmin }) {
  const [hov, setHov] = useState(false);
  const disabled = !!app.disabled && !isAdmin;
  const adminUnlocked = !!app.disabled && isAdmin;
  const handleClick = () => { if (!disabled) onOpen(); };
  return (
    <div onClick={handleClick} onMouseEnter={() => !disabled && setHov(true)} onMouseLeave={() => setHov(false)}
      title={disabled ? "준비 중인 앱입니다" : (adminUnlocked ? "관리자 권한으로 활성화됨" : undefined)}
      style={{
        background: disabled ? THEME.surface : (hov ? THEME.card : THEME.surface),
        border: `1px solid ${disabled ? THEME.border : (hov ? app.color+"55" : THEME.border)}`,
        borderRadius: 10, padding: "18px 20px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : (adminUnlocked ? 0.85 : 1),
        filter: disabled ? "grayscale(0.5)" : "none",
        transition: "all 0.2s",
        transform: (!disabled && hov) ? "translateY(-2px)" : "none",
        position: "relative",
      }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ fontSize:22, color:app.color, lineHeight:1 }}>{app.icon}</span>
        {disabled ? (
          <span style={{ fontSize:9, letterSpacing:"0.1em", color:THEME.textMuted, textTransform:"uppercase", background:"rgba(122,122,154,0.15)", border:`1px solid ${THEME.border}`, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>준비 중</span>
        ) : adminUnlocked ? (
          <span style={{ fontSize:9, letterSpacing:"0.1em", color:"#FDCB6E", textTransform:"uppercase", background:"rgba(253,203,110,0.12)", border:"1px solid rgba(253,203,110,0.4)", padding:"2px 6px", borderRadius:4, fontWeight:700 }}>Admin</span>
        ) : (
          <span style={{ fontSize:9, letterSpacing:"0.1em", color:THEME.textDim, textTransform:"uppercase", background:THEME.border, padding:"2px 6px", borderRadius:4 }}>{app.sub.split(" ")[0]}</span>
        )}
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

function AppCardGrid() {
  const { navigate } = useGlobal();
  const { isAdmin } = useAuth();
  const groups = [
    { key:"hub",      label:"허브" },
    { key:"evaluate", label:"탐색 / 평가" },
    { key:"generate", label:"프롬프트 생성" },
  ];
  return (
    <div style={{ padding:"36px 40px", maxWidth:960, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      <div style={{ marginBottom:40 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:THEME.text, margin:0, marginBottom:6 }}>Creative Nexus Platform</h1>
        <p style={{ fontSize:13, color:THEME.textMuted, margin:0 }}>NEXUS Studio 대시보드</p>
      </div>
      {groups.map(g => {
        const apps = APP_REGISTRY.filter(a => a.group === g.key);
        if (!apps.length) return null;
        return (
          <div key={g.key} style={{ marginBottom:40 }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.14em", color:THEME.textDim, textTransform:"uppercase", marginBottom:14, borderLeft:`2px solid ${THEME.border}`, paddingLeft:10 }}>{g.label}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              {apps.map(app => <AppCard key={app.id} app={app} isAdmin={isAdmin} onOpen={() => navigate(app.id)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AppRouter({ appId }) {
  switch (appId) {
    case "prompt-arc":         return <PromptArcApp />;
    case "typecore-sovereign": return <TypecoreSovereignApp />;
    case "typecore-breeze":    return <TypecoreBreezeApp />;
    case "render-metrics":     return <RenderMatrixApp />;
    case "motion-metrics":     return <MotionMatrixApp />;
    case "rubicon-forge":      return <RubiconForgeApp />;
    case "design-eval":        return <DesignEvaluatorApp />;
    case "promotion-archive":  return <PromotionArchiveApp />;
    case "banner-codex":       return <BannerCodexApp />;
    case "brief-studio":       return <BriefStudioApp />;
    default:                   return <PlaceholderApp appId={appId} />;
  }
}

export default function Shell() {
  const { currentApp } = useGlobal();
  return (
    <div style={{ minHeight:"100vh", background:THEME.bg, color:THEME.text, fontFamily:"'Noto Sans KR', sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`* { box-sizing:border-box; } @keyframes fadeUp { from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)} } ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1E1E2E;border-radius:2px}`}</style>
      <Topbar/>
      <div style={{ flex:1, overflow:"hidden" }}>
        {currentApp ? <AppRouter appId={currentApp}/> : <AppCardGrid/>}
      </div>
      <Notification/>
    </div>
  );
}
