import { useEffect, useState, useCallback } from "react";
import { THEME } from "../config/apps";
import { listUsersByStatus, approveUser, rejectUser, deleteUserDoc, GRADES, STATUS, STATUS_LABEL } from "../lib/grades";

const formatTime = (ts) => {
  if (!ts) return "-";
  const ms = typeof ts === "number" ? ts : (ts?.toMillis ? ts.toMillis() : Date.parse(ts));
  if (!ms || isNaN(ms)) return "-";
  return new Date(ms).toLocaleString("ko-KR");
};

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState(STATUS.pending);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const list = await listUsersByStatus(tab);
      setUsers(list);
    } catch (e) {
      console.error("[AdminPanel] list failed", e);
      setError(e.code || e.message || "조회 실패");
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const onApprove = async (uid, grade = GRADES.general) => {
    setBusyUid(uid);
    try { await approveUser(uid, grade); await load(); }
    catch (e) { setError(e.message || "승인 실패"); }
    finally { setBusyUid(null); }
  };
  const onReject = async (uid) => {
    if (!confirm("이 사용자의 접근을 거절하시겠습니까?")) return;
    setBusyUid(uid);
    try { await rejectUser(uid); await load(); }
    catch (e) { setError(e.message || "거절 실패"); }
    finally { setBusyUid(null); }
  };
  const onDelete = async (uid, email) => {
    if (!confirm(`"${email || uid}" 의 사용자 데이터를 완전히 삭제하시겠습니까?\n(다음 로그인 시 새 프로필이 다시 생성될 수 있으므로 영구 차단이 목적이면 '거절'을 권장합니다.)`)) return;
    setBusyUid(uid);
    try { await deleteUserDoc(uid); await load(); }
    catch (e) { setError(e.message || "삭제 실패"); }
    finally { setBusyUid(null); }
  };

  const tabs = [
    { id: STATUS.pending,  label: "승인 대기",  color: "#FDCB6E" },
    { id: STATUS.approved, label: "승인됨",     color: "#0eb9b3" },
    { id: STATUS.rejected, label: "거절됨",     color: "#ff7575" },
  ];

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 720, maxHeight: "85vh", background: THEME.surface,
        border: `1px solid ${THEME.border}`, borderRadius: 14, color: THEME.text,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "18px 24px", borderBottom: `1px solid ${THEME.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: THEME.accent, textTransform: "uppercase" }}>Admin</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>사용자 승인 관리</div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: `1px solid ${THEME.border}`, color: THEME.textMuted,
            borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer",
          }}>닫기</button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", borderBottom: `1px solid ${THEME.border}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "9px 14px", background: "transparent",
              border: "none", borderBottom: tab === t.id ? `2px solid ${t.color}` : "2px solid transparent",
              color: tab === t.id ? t.color : THEME.textMuted,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}>{t.label}</button>
          ))}
          <div style={{ flex: 1 }}/>
          <button onClick={load} disabled={loading} style={{
            padding: "6px 12px", marginBottom: 8, background: "transparent",
            border: `1px solid ${THEME.border}`, color: THEME.textMuted,
            borderRadius: 6, fontSize: 11, cursor: loading ? "not-allowed" : "pointer",
          }}>{loading ? "로딩..." : "↻ 새로고침"}</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px 20px" }}>
          {error && (
            <div style={{
              fontSize: 12, color: "#ff7575", background: "rgba(255,117,117,0.08)",
              border: "1px solid rgba(255,117,117,0.2)", padding: "9px 12px",
              borderRadius: 6, margin: "12px 0",
            }}>{error}</div>
          )}

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", fontSize: 12, color: THEME.textMuted }}>로딩 중...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", fontSize: 12, color: THEME.textMuted }}>
              {STATUS_LABEL[tab]} 상태인 사용자가 없습니다.
            </div>
          ) : (
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr style={{ color: THEME.textDim, textAlign: "left", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 6px" }}>이메일</th>
                  <th style={{ padding: "8px 6px" }}>이름</th>
                  <th style={{ padding: "8px 6px" }}>가입일</th>
                  <th style={{ padding: "8px 6px" }}>등급</th>
                  <th style={{ padding: "8px 6px", textAlign: "right" }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid} style={{ borderTop: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: "10px 6px", color: THEME.text, wordBreak: "break-all" }}>{u.email || "(이메일 없음)"}</td>
                    <td style={{ padding: "10px 6px", color: THEME.textMuted }}>{u.displayName || "-"}</td>
                    <td style={{ padding: "10px 6px", color: THEME.textDim, fontSize: 11 }}>{formatTime(u.createdAt)}</td>
                    <td style={{ padding: "10px 6px", color: THEME.textMuted }}>{u.grade || "-"}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {tab === STATUS.pending && (
                        <>
                          <button onClick={() => onApprove(u.uid, GRADES.general)} disabled={busyUid === u.uid} title="General로 승인" style={btnStyle("#0eb9b3", busyUid === u.uid)}>
                            승인
                          </button>
                          <button onClick={() => onApprove(u.uid, GRADES.pro)} disabled={busyUid === u.uid} title="Pro로 승인" style={{ ...btnStyle("#74B9FF", busyUid === u.uid), marginLeft: 4 }}>
                            Pro 승인
                          </button>
                          <button onClick={() => onReject(u.uid)} disabled={busyUid === u.uid} style={{ ...btnStyle("#ff7575", busyUid === u.uid), marginLeft: 4 }}>
                            거절
                          </button>
                          <button onClick={() => onDelete(u.uid, u.email)} disabled={busyUid === u.uid} title="Firestore 사용자 데이터 완전 삭제" style={{ ...btnStyle(THEME.textDim, busyUid === u.uid), marginLeft: 4 }}>
                            삭제
                          </button>
                        </>
                      )}
                      {tab === STATUS.approved && (
                        <>
                          <button onClick={() => onReject(u.uid)} disabled={busyUid === u.uid} style={btnStyle("#ff7575", busyUid === u.uid)}>
                            접근 차단
                          </button>
                          <button onClick={() => onDelete(u.uid, u.email)} disabled={busyUid === u.uid} style={{ ...btnStyle(THEME.textDim, busyUid === u.uid), marginLeft: 4 }}>
                            삭제
                          </button>
                        </>
                      )}
                      {tab === STATUS.rejected && (
                        <>
                          <button onClick={() => onApprove(u.uid, GRADES.general)} disabled={busyUid === u.uid} style={btnStyle("#0eb9b3", busyUid === u.uid)}>
                            재승인
                          </button>
                          <button onClick={() => onDelete(u.uid, u.email)} disabled={busyUid === u.uid} style={{ ...btnStyle(THEME.textDim, busyUid === u.uid), marginLeft: 4 }}>
                            삭제
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function btnStyle(color, busy) {
  return {
    padding: "5px 10px", background: "transparent",
    border: `1px solid ${color}55`, color,
    borderRadius: 5, fontSize: 11, fontWeight: 600,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.5 : 1,
  };
}
