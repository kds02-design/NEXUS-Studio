// 사용자 아바타 렌더링 단일 진입점.
// 우선순위: emoji → initial → photo(Cloudinary 업로드) → Google photoURL → 결정적 이니셜+컬러.
import { useMemo } from "react";

export const AVATAR_EMOJIS = ["⚔️", "🧙", "🏹", "🐉", "🦊", "🌙", "🎨", "🎮", "⚡", "💎", "🔥", "🌟"];
export const AVATAR_COLORS = [
  { key: "purple", hex: "#6C5CE7", label: "보라" },
  { key: "gold",   hex: "#C8A969", label: "골드" },
  { key: "teal",   hex: "#00CEC9", label: "청록" },
  { key: "red",    hex: "#E17055", label: "레드" },
  { key: "green",  hex: "#55EFC4", label: "그린" },
  { key: "pink",   hex: "#FD79A8", label: "핑크" },
];

// 이메일에서 결정적으로 컬러 하나 뽑기 (랜덤이지만 같은 이메일이면 항상 같은 컬러).
export function pickColorFromEmail(email) {
  if (!email) return AVATAR_COLORS[0].hex;
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length].hex;
}

// 사용자의 "유효한" 아바타 표시 정보를 계산. avatar 입력 안 한 사용자도 기본 값 채워서 반환.
// 우선순위:
//   1) profile.avatarType === "emoji"   → 이모지
//   2) profile.avatarType === "initial" → 이니셜 + 컬러
//   3) profile.avatarType === "photo"   → Cloudinary 업로드 사진 (avatarValue가 URL)
//   4) avatarType 미설정 + user.photoURL → Google 프로필 사진 폴백
//   5) 그 외 → 이메일 첫 글자 + 결정적 컬러
export function resolveAvatar({ profile, user }) {
  const email = user?.email || profile?.email || "";
  const initial = (user?.displayName || email || "?").charAt(0).toUpperCase() || "?";
  const type = profile?.avatarType;
  if (type === "emoji" && profile.avatarValue) {
    return { kind: "emoji", value: profile.avatarValue };
  }
  if (type === "initial" && profile.avatarValue) {
    return { kind: "initial", initial, color: profile.avatarValue };
  }
  if (type === "photo" && profile.avatarValue) {
    return { kind: "photo", url: profile.avatarValue };
  }
  // avatarType이 비어있을 때만 Google photoURL을 폴백으로 사용
  if (!type && user?.photoURL) {
    return { kind: "photo", url: user.photoURL };
  }
  // 이메일 로그인 사용자 — 이니셜 + 결정적 컬러
  return { kind: "initial", initial, color: pickColorFromEmail(email) };
}

export default function UserAvatar({ profile, user, size = 28, title }) {
  const a = useMemo(() => resolveAvatar({ profile, user }), [profile, user]);
  const base = {
    width: size, height: size, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, overflow: "hidden", userSelect: "none",
  };
  if (a.kind === "photo") {
    return (
      <div title={title} style={{ ...base, border: "1px solid #2a2a35" }}>
        <img src={a.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  if (a.kind === "emoji") {
    return (
      <div title={title} style={{ ...base, background: "rgba(255,255,255,0.06)", border: "1px solid #2a2a35", fontSize: Math.round(size * 0.55) }}>
        {a.value}
      </div>
    );
  }
  // initial
  const color = a.color;
  return (
    <div title={title} style={{ ...base, background: `${color}22`, color, border: `1px solid ${color}55`, fontSize: Math.round(size * 0.45), fontWeight: 700 }}>
      {a.initial}
    </div>
  );
}
