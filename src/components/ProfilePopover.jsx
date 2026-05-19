// Topbar 우측 프로필 아이콘 클릭 → 팝오버. 외부 클릭으로 닫힘.
// Vercel 대시보드 설정 페이지 스타일: 섹션 라벨 + [아이콘+항목명][우측 값] 행 구조.
import { useEffect, useRef, useState, isValidElement } from "react";
import {
  Settings, Moon, Sun, Globe, TrendingUp, Key,
  LayoutDashboard, KeyRound, Bot, Activity,
  Mail, Info, LogOut,
} from "lucide-react";
import { THEME } from "../config/apps";
import { useAuth } from "../context/AuthContext";
import { useGlobal } from "../context/GlobalContext";
import { GRADE_LABEL, GRADES } from "../lib/grades";
import UserAvatar from "./UserAvatar";
import AvatarPicker from "./AvatarPicker";
import UpgradeRequestModal from "./UpgradeRequestModal";
import InviteCodeModal from "./InviteCodeModal";

const APP_VERSION = "NEXUS Studio v0.4.0";

const gradeColor = {
  [GRADES.general]: "#7A7A9A",
  [GRADES.pro]:     "#C8A969",
  [GRADES.expert]:  "#0eb9b3",
};

// GlobalContext.toggleTheme이 no-op으로 잠겨있는 동안엔 이 플래그를 true로 유지.
// 라이트 모드 전체 롤아웃 후 false 로 변경하면 자동으로 풀림.
const THEME_SWITCH_LOCKED = true;

export default function ProfilePopover({ open, onClose }) {
  const { user, profile, grade, isAdmin, signOut, usageToday, dailyLimit } = useAuth();
  const { setCurrentApp, isLight, toggleTheme } = useGlobal();
  const panelRef = useRef(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  if (!open && !avatarPickerOpen && !upgradeOpen && !inviteOpen) return null;
  if (!user) return null;

  const displayName = user.displayName || profile?.displayName || user.email?.split("@")[0] || "사용자";
  const gColor = gradeColor[grade] || THEME.accent;
  const showUpgrade = grade === GRADES.general || grade === GRADES.pro;
  const showInvite  = grade === GRADES.general;
  const limitText   = dailyLimit === Infinity ? "∞" : dailyLimit;

  const goNexusAdmin = () => { setCurrentApp("nexus-admin"); onClose?.(); };
  const doLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    try { await signOut(); } catch (e) { console.error("[Auth] signOut failed", e); }
  };

  return (
    <>
      {open && (
        <div ref={panelRef} style={{
          position:"absolute", top: 56, right: 20, width: 300, zIndex: 200,
          background: THEME.surface, border: `1px solid ${THEME.border}`,
          borderRadius: 12, boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
          color: THEME.text, fontFamily:"'Noto Sans KR', sans-serif",
          animation: "fadeIn 0.15s ease-out",
          overflow: "hidden",
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

          {/* Preferences */}
          <Section label="환경">
            <Row icon={<Settings size={14} />} label="설정" disabled hint="준비 중" />
            <ThemeSwitchRow isLight={isLight} onToggle={toggleTheme} locked={THEME_SWITCH_LOCKED} />
            <Row icon={<Globe size={14} />} label="언어" rightText="한국어" disabled />
          </Section>

          {(showUpgrade || showInvite) && (
            <Section label="계정">
              {showUpgrade && <Row icon={<TrendingUp size={14} />} label="등급 업그레이드 요청" onClick={() => { setUpgradeOpen(true); onClose?.(); }} />}
              {showInvite && <Row icon={<Key size={14} />} label="초대 코드 입력" onClick={() => { setInviteOpen(true); onClose?.(); }} />}
            </Section>
          )}

          {isAdmin && (
            <Section label="관리자">
              <Row icon={<LayoutDashboard size={14} />} label="NEXUS Admin" onClick={goNexusAdmin} />
              <Row icon={<KeyRound size={14} />} label="API 키 관리" disabled hint="준비 중" />
              <Row icon={<Bot size={14} />} label="AI 에이전트 실행" disabled hint="준비 중" />
              <Row icon={<Activity size={14} />} label="시스템 상태 확인" disabled hint="준비 중" />
            </Section>
          )}

          <Section label="지원">
            <Row icon={<Mail size={14} />} label="고객센터 / 문의" onClick={() => window.open("mailto:kds02@ncsoft.com?subject=NEXUS%20Studio%20문의", "_blank")} />
            <Row icon={<Info size={14} />} label="버전 정보" rightText={APP_VERSION} />
          </Section>

          <Section last>
            <Row icon={<LogOut size={14} />} label="로그아웃" onClick={doLogout} danger />
          </Section>
        </div>
      )}

      {avatarPickerOpen && <AvatarPicker onClose={() => setAvatarPickerOpen(false)} />}
      {upgradeOpen && <UpgradeRequestModal onClose={() => setUpgradeOpen(false)} />}
      {inviteOpen && <InviteCodeModal onClose={() => setInviteOpen(false)} />}
    </>
  );
}

// 다크/라이트 테마 토글 행. 우측에 세그먼트 스위치(☀/🌙). locked=true 면 시각적으로 disabled.
// (GlobalContext.toggleTheme 이 현재 no-op 이라 라이트 모드 미완성 동안 잠금 — 스위치 UI는 노출.)
function ThemeSwitchRow({ isLight, onToggle, locked }) {
  const [hov, setHov] = useState(false);
  const handlePick = (target) => {
    if (locked) return;
    if ((target === 'light') !== isLight) onToggle?.();
  };
  const segBase = {
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    width:28, height:22, borderRadius:999, border:0, cursor: locked ? "not-allowed" : "pointer",
    background:"transparent", color:THEME.textDim, transition:"background 0.12s, color 0.12s",
    padding:0,
  };
  const activeBg  = locked ? `${THEME.textDim}33` : `${THEME.accent}33`;
  const activeFg  = locked ? THEME.textMuted    : "#fff";

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={locked ? "라이트 모드 준비 중 — 일부 앱만 지원합니다" : undefined}
      style={{
        display:"flex", alignItems:"center", gap:11, width:"100%",
        padding:"9px 10px", borderRadius:6,
        background: hov && !locked ? "rgba(255,255,255,0.03)" : "transparent",
        color: locked ? THEME.textDim : THEME.text, fontSize:12.5, fontWeight:500,
        opacity: locked ? 0.7 : 1, transition:"background 0.12s",
      }}
    >
      <span style={{ width:20, display:"inline-flex", alignItems:"center", justifyContent:"center", color: locked ? THEME.textDim : THEME.textMuted, flexShrink:0 }}>
        {isLight ? <Sun size={14} /> : <Moon size={14} />}
      </span>
      <span style={{ flex:1 }}>테마</span>
      <div style={{ display:"inline-flex", alignItems:"center", gap:2, padding:2, borderRadius:999, background:THEME.bg, border:`1px solid ${THEME.border}` }}>
        <button type="button" onClick={() => handlePick('light')} disabled={locked} aria-label="라이트 모드"
          style={{ ...segBase, background: isLight ? activeBg : "transparent", color: isLight ? activeFg : THEME.textDim }}>
          <Sun size={12} />
        </button>
        <button type="button" onClick={() => handlePick('dark')} disabled={locked} aria-label="다크 모드"
          style={{ ...segBase, background: !isLight ? activeBg : "transparent", color: !isLight ? activeFg : THEME.textDim }}>
          <Moon size={12} />
        </button>
      </div>
      {locked && (
        <span style={{
          fontSize:9.5, color:THEME.textDim, fontWeight:600, letterSpacing:"0.04em",
          padding:"2px 7px", background:THEME.bg, borderRadius:999,
          border:`1px solid ${THEME.border}`,
        }}>
          준비 중
        </span>
      )}
    </div>
  );
}

function Section({ label, children, last }) {
  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${THEME.border}` }}>
      {label && (
        <div style={{
          padding:"12px 18px 4px",
          fontSize:9.5,
          fontWeight:700,
          letterSpacing:"0.14em",
          color:THEME.textDim,
          textTransform:"uppercase",
        }}>
          {label}
        </div>
      )}
      <div style={{ padding: label ? "2px 8px 8px" : "6px 8px" }}>
        {children}
      </div>
    </div>
  );
}

// icon prop: string(이모지) 또는 ReactNode(lucide 아이콘) 모두 허용.
function Row({ icon, label, rightText, onClick, disabled, hint, danger }) {
  const [hov, setHov] = useState(false);
  const textColor = danger ? "#ff7575" : (disabled ? THEME.textDim : THEME.text);
  const iconColor = danger ? "#ff7575" : (disabled ? THEME.textDim : THEME.textMuted);
  const isNode = isValidElement(icon);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      disabled={disabled}
      title={hint || undefined}
      style={{
        display:"flex", alignItems:"center", gap:11, width:"100%",
        padding:"9px 10px", borderRadius:6,
        background: hov && !disabled ? "rgba(255,255,255,0.05)" : "transparent",
        border:0, color: textColor, fontSize:12.5, fontWeight:500,
        cursor: disabled ? "not-allowed" : "pointer", textAlign:"left",
        opacity: disabled ? 0.6 : 1, transition:"background 0.12s",
        fontFamily:"inherit",
      }}>
      <span style={{
        width:20, display:"inline-flex", alignItems:"center", justifyContent:"center",
        color: iconColor, fontSize: isNode ? undefined : 14, flexShrink:0,
      }}>
        {icon}
      </span>
      <span style={{ flex:1, fontWeight: danger ? 600 : 500 }}>{label}</span>
      {rightText && (
        <span style={{ fontSize:11, color:THEME.textMuted, fontWeight:500 }}>
          {rightText}
        </span>
      )}
      {disabled && hint && !rightText && (
        <span style={{
          fontSize:9.5, color:THEME.textDim, fontWeight:600, letterSpacing:"0.04em",
          padding:"2px 7px", background:THEME.bg, borderRadius:999,
          border:`1px solid ${THEME.border}`,
        }}>
          {hint}
        </span>
      )}
    </button>
  );
}
