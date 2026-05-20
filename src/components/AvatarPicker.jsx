// 아바타 선택 모달 — 세 탭(이모지 / 이니셜 + 컬러 / 사진 업로드).
// 선택 즉시 Firestore 저장 + AuthContext.refreshProfile() 호출로 Topbar 실시간 반영.
import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/GlobalContext";
import { updateUserAvatar } from "../lib/grades";
import { uploadBase64 } from "../lib/storage";
import UserAvatar, { AVATAR_EMOJIS, AVATAR_COLORS, resolveAvatar } from "./UserAvatar";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function AvatarPicker({ onClose }) {
  const T = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState("emoji");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef(null);
  const current = resolveAvatar({ profile, user });
  const initial = (user?.displayName || user?.email || "?").charAt(0).toUpperCase() || "?";

  const apply = async (type, value) => {
    if (!user?.uid || busy) return;
    setBusy(true);
    try {
      await updateUserAvatar(user.uid, type, value);
      await refreshProfile();
    } catch (e) {
      console.error("[Avatar] save failed", e);
    } finally { setBusy(false); }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadErr("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadErr("JPEG/PNG/WebP 형식만 업로드 가능합니다.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadErr("파일 크기가 5MB를 초과합니다.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result || ""));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const url = await uploadBase64(dataUrl, "avatar");
      if (!url) throw new Error("업로드 실패");
      await apply("photo", url);
    } catch (err) {
      console.error("[Avatar upload]", err);
      setUploadErr(err.message || "업로드 실패");
    } finally { setUploading(false); }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:"100%", maxWidth:420, background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, color:T.text, overflow:"hidden", fontFamily:"'Noto Sans KR', sans-serif" }}>
        <div style={{ padding:"20px 22px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:14 }}>
          <UserAvatar profile={profile} user={user} size={48} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:700, color:T.text }}>아바타 변경</div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>선택 즉시 저장됩니다.</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:0, color:T.textMuted, fontSize:18, cursor:"pointer", padding:4 }}>✕</button>
        </div>

        <div style={{ display:"flex", padding:"10px 14px 0", gap:6 }}>
          {[
            { key:"emoji",   label:"이모지" },
            { key:"initial", label:"이니셜 + 컬러" },
            { key:"photo",   label:"사진 업로드" },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex:1, padding:"8px 10px", fontSize:11, fontWeight:600,
                background: active ? T.bg : "transparent",
                border:`1px solid ${active ? T.accent : T.border}`,
                color: active ? T.accent : T.textMuted,
                borderRadius:6, cursor:"pointer", transition:"all 0.12s",
              }}>{t.label}</button>
            );
          })}
        </div>

        <div style={{ padding:"16px 18px 20px" }}>
          {tab === "emoji" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:8 }}>
              {AVATAR_EMOJIS.map((emoji) => {
                const isCurrent = current.kind === "emoji" && current.value === emoji;
                return (
                  <button key={emoji} onClick={() => apply("emoji", emoji)} disabled={busy}
                    style={{
                      aspectRatio:"1 / 1", fontSize:24, cursor:"pointer",
                      background: isCurrent ? `${T.accent}22` : "rgba(255,255,255,0.04)",
                      border:`1px solid ${isCurrent ? T.accent : T.border}`,
                      borderRadius:8, transition:"all 0.12s",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>{emoji}</button>
                );
              })}
            </div>
          )}

          {tab === "initial" && (
            <>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:10 }}>이메일 첫 글자: <strong style={{ color:T.text }}>{initial}</strong></div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
                {AVATAR_COLORS.map((c) => {
                  const isCurrent = current.kind === "initial" && current.color?.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button key={c.key} onClick={() => apply("initial", c.hex)} disabled={busy}
                      style={{
                        padding:"14px 8px", cursor:"pointer",
                        background: isCurrent ? `${c.hex}22` : "rgba(255,255,255,0.03)",
                        border:`1.5px solid ${isCurrent ? c.hex : T.border}`,
                        borderRadius:10, transition:"all 0.12s",
                        display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                      }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:`${c.hex}22`, border:`1px solid ${c.hex}55`, color:c.hex, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700 }}>{initial}</div>
                      <div style={{ fontSize:10, color:isCurrent ? c.hex : T.textMuted, fontWeight:600 }}>{c.label}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {tab === "photo" && (
            <div>
              {/* 현재 사진 아바타라면 미리보기 */}
              {current.kind === "photo" && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginBottom:14 }}>
                  <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", border:`2px solid ${T.border}` }}>
                    <img src={current.url} alt="현재 아바타" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                  <div style={{ fontSize:10, color:T.textDim, letterSpacing:"0.08em", textTransform:"uppercase" }}>현재 아바타</div>
                </div>
              )}

              {/* 업로드 영역 */}
              <button
                onClick={() => !uploading && !busy && fileRef.current?.click()}
                disabled={uploading || busy}
                style={{
                  width:"100%", padding:"28px 16px", cursor: uploading || busy ? "not-allowed" : "pointer",
                  background:"rgba(255,255,255,0.03)",
                  border:`1.5px dashed ${uploading ? T.accent : T.border}`,
                  borderRadius:10, transition:"all 0.12s",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:10,
                  color: T.textMuted,
                  fontFamily:"inherit",
                }}
                onMouseEnter={(e) => { if (!uploading && !busy) e.currentTarget.style.borderColor = T.accent; }}
                onMouseLeave={(e) => { if (!uploading && !busy) e.currentTarget.style.borderColor = T.border; }}
              >
                {uploading ? (
                  <>
                    <div style={{ width:24, height:24, border:`2px solid ${T.border}`, borderTopColor: T.accent, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                    <div style={{ fontSize:12, fontWeight:600, color:T.accent }}>업로드 중…</div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:28 }}>📷</div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>이미지 선택하기</div>
                    <div style={{ fontSize:10, color:T.textDim }}>JPEG · PNG · WebP · 최대 5MB</div>
                  </>
                )}
              </button>

              <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(",")} style={{ display:"none" }} onChange={onFileChange} />

              {uploadErr && (
                <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:6, fontSize:11, color:"#fca5a5" }}>
                  {uploadErr}
                </div>
              )}

              <div style={{ fontSize:10, color:T.textDim, marginTop:12, lineHeight:1.6 }}>
                업로드한 이미지는 Cloudinary에 저장되며, 프로필 사진으로 즉시 적용됩니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
