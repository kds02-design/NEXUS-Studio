// 작업목록 모달 — 사용자의 nexusPreviewWorks 컬렉션 라이브 구독 + 그리드 카드 리스트.
// 카드 클릭 → 복원. 휴지통 → 삭제. 빈 상태 / 미로그인 상태 메시지 별도.
import { useEffect, useState } from "react";
import { X, FolderOpen, Trash2, Calendar, Loader2 } from "lucide-react";
import { subscribeToWorks, deleteWork } from "../services/works";

const ACCENT = "#22B8CF";

export default function WorksPanel({ open, onClose, uid, T, onRestore }) {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!open || !uid) { setWorks([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToWorks(uid,
      (arr) => { setWorks(arr); setLoading(false); },
      (err) => { console.warn("[WorksPanel] subscribe err", err?.message || err); setLoading(false); },
    );
    return () => { try { unsub && unsub(); } catch { /* noop */ } };
  }, [open, uid]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const fmtDate = (v) => {
    const ms = v?.toMillis?.() ?? (typeof v === "number" ? v : null);
    if (!ms) return "—";
    return new Date(ms).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("이 작업 항목을 삭제할까요?")) return;
    setBusyId(id);
    try { await deleteWork(uid, id); }
    catch (err) { alert("삭제 실패: " + (err.message || err)); }
    finally { setBusyId(null); }
  };

  const handleRestore = (w) => {
    if (busyId) return;
    onRestore?.(w);
    onClose?.();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 1100, maxHeight: "86vh",
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FolderOpen size={18} color={ACCENT} />
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>작업목록</div>
            <span style={{ fontSize: 11, color: T.textDim }}>{works.length}</span>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: 0, color: T.textMuted, cursor: "pointer",
            padding: 6, borderRadius: 6, display: "flex",
          }}><X size={18} /></button>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          {!uid ? (
            <Empty T={T} text="로그인하면 작업목록을 사용할 수 있습니다." />
          ) : loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, padding: 60, gap: 10 }}>
              <Loader2 size={16} className="animate-spin" /> 불러오는 중...
            </div>
          ) : works.length === 0 ? (
            <Empty T={T} text="저장된 작업이 없습니다. 상단의 '💾 저장' 버튼으로 현재 시안을 보관하세요." />
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14,
            }}>
              {works.map(w => (
                <WorkCard key={w.id} T={T} work={w}
                  busy={busyId === w.id}
                  onRestore={() => handleRestore(w)}
                  onDelete={(e) => handleDelete(e, w.id)}
                  fmtDate={fmtDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkCard({ T, work, busy, onRestore, onDelete, fmtDate }) {
  return (
    <div onClick={onRestore} style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
      overflow: "hidden", cursor: busy ? "wait" : "pointer", position: "relative",
      transition: "border-color 0.15s",
      opacity: busy ? 0.5 : 1,
    }}
      onMouseEnter={(e) => { if (!busy) e.currentTarget.style.borderColor = ACCENT; }}
      onMouseLeave={(e) => { if (!busy) e.currentTarget.style.borderColor = T.border; }}
    >
      {/* 썸네일 — 타이틀 이미지가 있으면 그걸로, 없으면 회색 placeholder */}
      <div style={{
        aspectRatio: "16/9", background: "#0a0a0e",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {work.titleUrl ? (
          <img src={work.titleUrl} alt={work.name}
            style={{ maxWidth: "85%", maxHeight: "85%", objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.2em" }}>NO TITLE</div>
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: T.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }} title={work.name}>{work.name || "(이름 없음)"}</div>
        <div style={{
          fontSize: 10, color: T.textDim, marginTop: 4,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <Calendar size={10} /> {fmtDate(work.createdAt)}
          {work.category && <span style={{ marginLeft: "auto", padding: "1px 6px", borderRadius: 999, background: `${ACCENT}22`, color: ACCENT, fontWeight: 700 }}>{work.category}</span>}
        </div>
      </div>
      <button
        onClick={onDelete}
        title="삭제"
        style={{
          position: "absolute", top: 6, right: 6,
          background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, color: "#ccc", padding: 5, cursor: "pointer",
          display: "flex", opacity: 0, transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(244,63,94,0.85)"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.55)"; e.currentTarget.style.color = "#ccc"; }}
        // hover 시에만 보이도록 — 카드 진입 시 부모가 opacity 1 로 토글
        // (Inline 으로 처리 위해 parent hover 셀렉터 대신 onMouseEnter 의 e.target 기준)
        ref={(el) => {
          if (!el) return;
          const card = el.parentElement;
          if (!card) return;
          const onEnter = () => { el.style.opacity = "1"; };
          const onLeave = () => { el.style.opacity = "0"; };
          card.addEventListener("mouseenter", onEnter);
          card.addEventListener("mouseleave", onLeave);
        }}
      ><Trash2 size={12} /></button>
    </div>
  );
}

function Empty({ T, text }) {
  return (
    <div style={{
      padding: 60, textAlign: "center",
      color: T.textMuted, fontSize: 12, lineHeight: 1.7,
    }}>
      <FolderOpen size={32} color={T.textDim} style={{ marginBottom: 12 }} />
      <div>{text}</div>
    </div>
  );
}
