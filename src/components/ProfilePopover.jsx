// Topbar 우측 프로필 아이콘 클릭 → 팝오버. 외부 클릭으로 닫힘.
// 등급에 따른 조건부 행 + 관리자 단축 + 도움말/버전/로그아웃.
import { useEffect, useRef, useState } from "react";
import { THEME } from "../config/apps";
import { useAuth } from "../context/AuthContext";
import { useGlobal } from "../context/GlobalContext";
import { GRADE_LABEL, GRADES } from "../lib/grades";
import UserAvatar from "./UserAvatar";
import AvatarPicker from "./AvatarPicker";
import UpgradeRequestModal from "./UpgradeRequestModal";
import InviteCodeModal from "./InviteCodeModal";
import AdminPanel from "./AdminPanel";

const APP_VERSION = "NEXUS Studio v0.4.0";

const gradeColor = {
  [GRADES.general]: "#7A7A9A",
  [GRADES.pro]:     "#C8A969",
  [GRADES.expert]:  "#0eb9b3",
};

export default function ProfilePopover({ open, onClose }) {
  const { user, profile, grade, isAdmin, signOut, usageToday, dailyLimit } = useAuth();
  const { setCurrentApp } = useGlobal();
  const panelRef = useRef(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  if (!open && !avatarPickerOpen && !upgradeOpen && !inviteOpen && !adminPanelOpen) return null;
  if (!user) return null;

  const displayName = user.displayName || profile?.displayName || user.email?.split("@")[0] || "사용자";
  const gColor = gradeColor[grade] || THEME.accent;
  const showUpgrade = grade === GRADES.general || grade === GRADES.pro;
  const showInvite  = grade === GRADES.general;
  const limitText   = dailyLimit === Infinity ? "∞" : dailyLimit;

  const goAdmin = () => { setCurrentApp("nexus-admin"); onClose?.(); };
  const doLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    try { await signOut(); } catch (e) { console.error("[Auth] signOut failed", e); }
  };

  return (
    <>
      {open && (
        <div ref={panelRef} style={{
          position:"absolute", top: 56, right: 20, width: 280, zIndex: 200,
          background: THEME.surface, border: `1px solid ${THEME.border}`,
          borderRadius: 12, boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
          color: THEME.text, fontFamily:"'Noto Sans KR', sans-serif",
          animation: "fadeIn 0.15s ease-out",
        }}>
          {/* User header */}
          <div style={{ padding:"18px 18px 16px", borderBottom:`1px solid ${THEME.border}`, display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ position:"relative" }}>
              <UserAvatar profile={profile} user={user} size={48} />
              <button onClick={() => { setAvatarPickerOpen(true); onClose?.(); }} title="아바타 변경"
                style={{ position:"absolute", bottom:-2, right:-2, width:20, height:20, borderRadius:"50%", background:THEME.bg, border:`1px solid ${THEME.border}`, color:THEME.textMuted, fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>✎</button>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:THEME.text, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displayName}</div>
              <div style={{ fontSize:11, color:THEME.textMuted, marginBottom:8, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{user.email}</div>
              <div title={`오늘 사용 ${usageToday}/${limitText}`} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", background:`${gColor}1A`, border:`1px solid ${gColor}55`, borderRadius:999, fontSize:9, fontWeight:700, color:gColor, letterSpacing:"0.08em" }}>
                <span style={{ width:5, height:5, borderRadius:999, background:gColor }} />
                {GRADE_LABEL[grade]?.toUpperCase()}
                <span style={{ color:THEME.textMuted, fontWeight:500, letterSpacing:0, marginLeft:3 }}>{usageToday}/{limitText}</span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <Section>
            <Row icon="⚙️" label="설정" disabled hint="준비 중" />
            <Row icon="🌙" label="테마" rightText="다크" disabled hint="라이트 모드 준비 중" />
            <Row icon="🌐" label="언어" rightText="한국어" disabled hint="English 지원 준비 중" />
          </Section>

          {(showUpgrade || showInvite) && (
            <Section>
              {showUpgrade && <Row icon="📊" label="등급 업그레이드 요청" onClick={() => { setUpgradeOpen(true); onClose?.(); }} />}
              {showInvite && <Row icon="🔑" label="초대 코드 입력" onClick={() => { setInviteOpen(true); onClose?.(); }} />}
            </Section>
          )}

          {isAdmin && (
            <Section>
              <Row icon="👑" label="관리자 패널" onClick={() => { setAdminPanelOpen(true); onClose?.(); }} />
              <Row icon="👥" label="사용자 관리" onClick={goAdmin} />
            </Section>
          )}

          <Section>
            <Row icon="❓" label="고객센터 / 문의" onClick={() => window.open("mailto:kds02@ncsoft.com?subject=NEXUS%20Studio%20문의", "_blank")} />
            <Row icon="📋" label="버전 정보" rightText={APP_VERSION} />
            <Row icon="🚪" label="로그아웃" onClick={doLogout} danger />
          </Section>
        </div>
      )}

      {avatarPickerOpen && <AvatarPicker onClose={() => setAvatarPickerOpen(false)} />}
      {upgradeOpen && <UpgradeRequestModal onClose={() => setUpgradeOpen(false)} />}
      {inviteOpen && <InviteCodeModal onClose={() => setInviteOpen(false)} />}
      {adminPanelOpen && <AdminPanel onClose={() => setAdminPanelOpen(false)} />}
    </>
  );
}

function Section({ children }) {
  return <div style={{ padding:"6px 8px", borderBottom:`1px solid ${THEME.border}` }}>{children}</div>;
}

function Row({ icon, label, rightText, onClick, disabled, hint, danger }) {
  const [hov, setHov] = useState(false);
  const color = danger ? "#ff7575" : (disabled ? THEME.textDim : THEME.text);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      disabled={disabled}
      title={hint || undefined}
      style={{
        display:"flex", alignItems:"center", gap:10, width:"100%",
        padding:"8px 10px", borderRadius:6,
        background: hov && !disabled ? "rgba(255,255,255,0.04)" : "transparent",
        border:0, color, fontSize:12, fontWeight:500,
        cursor: disabled ? "not-allowed" : "pointer", textAlign:"left",
        opacity: disabled ? 0.5 : 1, transition:"background 0.12s",
        fontFamily:"inherit",
      }}>
      <span style={{ fontSize:14, width:18, textAlign:"center" }}>{icon}</span>
      <span style={{ flex:1 }}>{label}</span>
      {rightText && <span style={{ fontSize:10, color:THEME.textMuted, fontWeight:600 }}>{rightText}</span>}
      {disabled && hint && !rightText && <span style={{ fontSize:9, color:THEME.textDim, fontStyle:"italic" }}>{hint}</span>}
    </button>
  );
}
