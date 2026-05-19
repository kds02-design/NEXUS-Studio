import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Users, ListChecks, Ticket, Settings as SettingsIcon,
  Shield, Plus, Trash2, Edit2, X, RefreshCw, AlertTriangle,
} from "lucide-react";
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  listUsersByStatus, approveUser, rejectUser, deleteUserDoc,
  GRADES, GRADE_LABEL, STATUS,
} from "../../lib/grades";
import { migrateInitialCriteria } from "../../lib/evaluationCriteria";
import { DEFAULT_HERO_IMAGE, fetchDashboardSettings, updateDashboardHeroImage } from "../../lib/dashboardSettings";
import { uploadBase64 } from "../../lib/storage";

// 관리자 전용 보라색 포인트
const ACCENT = "#6C5CE7";

// 사이드바 섹션 구조 — 그룹 라벨 + 항목 리스트. PromptArc ARC_CATEGORIES 패턴 차용.
const NAV_SECTIONS = [
  {
    label: "운영",
    items: [
      { id: "users",   name: "사용자 관리",   icon: <Users size={18}/> },
      { id: "invites", name: "초대 코드",     icon: <Ticket size={18}/> },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { id: "criteria", name: "평가 기준",   icon: <ListChecks size={18}/> },
    ],
  },
  {
    label: "시스템",
    items: [
      { id: "settings", name: "시스템 설정", icon: <SettingsIcon size={18}/> },
    ],
  },
];

const formatTime = (ts) => {
  if (!ts) return "-";
  const ms = typeof ts === "number" ? ts : (ts?.toMillis ? ts.toMillis() : Date.parse(ts));
  if (!ms || Number.isNaN(ms)) return "-";
  return new Date(ms).toLocaleString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export default function NexusAdminApp() {
  const { isAdmin, isAuthLoading } = useAuth();
  const [tab, setTab] = useState("users");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // PromptArc 패턴 — 사이드바 빈 공간 클릭 시 펼침/접힘 토글.
  // 내부 버튼 클릭은 stopPropagation 으로 차단되도록 각 핸들러에서 처리.
  const handleSidebarClick = useCallback((e) => {
    if (e.target === e.currentTarget || e.target.tagName === "NAV") {
      setIsSidebarCollapsed(v => !v);
    }
  }, []);

  if (isAuthLoading) {
    return <FullPanel><div className="text-zinc-500 text-sm">로딩 중...</div></FullPanel>;
  }
  if (!isAdmin) {
    return (
      <FullPanel>
        <div className="flex flex-col items-center gap-3 text-center">
          <Shield className="w-10 h-10 text-zinc-700"/>
          <div className="text-base font-bold text-zinc-300">관리자 전용</div>
          <div className="text-xs text-zinc-500">이 페이지는 관리자만 접근할 수 있습니다.</div>
        </div>
      </FullPanel>
    );
  }

  return (
    <div className="flex bg-[#0a0a0c] text-zinc-200 font-sans overflow-hidden" style={{ height: "calc(100vh - 52px)" }}>
      <AdminSidebar
        tab={tab}
        setTab={setTab}
        isSidebarCollapsed={isSidebarCollapsed}
        handleSidebarClick={handleSidebarClick}
      />
      <main className="flex-1 my-3 mr-3 ml-3 rounded-[16px] border border-zinc-800/80 bg-[#0c0c0e] shadow-2xl overflow-hidden flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "users"    && <UsersPanel/>}
          {tab === "criteria" && <CriteriaPanel/>}
          {tab === "invites"  && <InvitesPanel/>}
          {tab === "settings" && <SettingsPanel/>}
        </div>
      </main>
    </div>
  );
}

// PromptArc ArcSidebar 패턴 — 둥근 모서리 카드형 사이드바 + 섹션 라벨 + 항목 리스트.
// 접힘 시 라벨/구분선 숨김, 항목 아이콘만 노출.
function AdminSidebar({ tab, setTab, isSidebarCollapsed, handleSidebarClick }) {
  return (
    <aside
      onClick={handleSidebarClick}
      className={`hidden md:flex flex-col bg-[#141414] my-3 ml-3 rounded-[16px] border border-zinc-800/80 shadow-2xl overflow-hidden transition-all duration-300 cursor-default shrink-0 ${isSidebarCollapsed ? "w-16" : "w-[200px]"}`}
      title={isSidebarCollapsed ? "클릭하면 사이드바가 펼쳐집니다" : undefined}
    >
      <div className={`flex items-center h-[60px] shrink-0 transition-all duration-300 ${isSidebarCollapsed ? "justify-center" : "px-4"}`} />
      <nav className="flex-1 overflow-y-auto arc-scrollbar py-2 flex flex-col gap-0.5">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.label} className={sIdx > 0 ? "mt-2" : ""}>
            {!isSidebarCollapsed && (
              <div className="px-4 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                {section.label}
              </div>
            )}
            {isSidebarCollapsed && sIdx > 0 && (
              <div className="h-px bg-white/5 my-1 mx-3" />
            )}
            {section.items.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); setTab(item.id); }}
                  className={`flex items-center h-10 w-full pr-3 transition-colors ${active ? "text-zinc-200 bg-white/5" : "text-zinc-500 hover:text-white hover:bg-white/5"}`}
                  style={active ? { boxShadow: `inset 2px 0 0 ${ACCENT}` } : undefined}
                >
                  <div className="w-16 flex justify-center shrink-0" style={active ? { color: ACCENT } : undefined}>
                    {item.icon}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className={`text-xs truncate min-w-0 ${active ? "font-bold" : ""}`}>{item.name}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function FullPanel({ children }) {
  return (
    <div className="flex items-center justify-center bg-[#0a0a0c]" style={{ height: "calc(100vh - 52px)" }}>
      {children}
    </div>
  );
}

// ─────────────── 1. 사용자 관리 ───────────────
function UsersPanel() {
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [p, a, r] = await Promise.all([
        listUsersByStatus(STATUS.pending),
        listUsersByStatus(STATUS.approved),
        listUsersByStatus(STATUS.rejected),
      ]);
      setPending(p); setApproved(a); setRejected(r);
    } catch (e) {
      console.error("[NexusAdmin] users load failed", e);
      setError(e.code || e.message || "조회 실패");
    } finally { setLoading(false); }
  }, []);

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
    if (!confirm(`"${email || uid}" 의 사용자 데이터를 완전히 삭제하시겠습니까?\n다음 로그인 시 새 프로필이 다시 생성될 수 있어요.`)) return;
    setBusyUid(uid);
    try { await deleteUserDoc(uid); await load(); }
    catch (e) { setError(e.message || "삭제 실패"); }
    finally { setBusyUid(null); }
  };
  const onChangeGrade = async (uid, newGrade) => {
    setBusyUid(uid);
    try {
      await updateDoc(doc(db, "users", uid), { grade: newGrade, updatedAt: serverTimestamp() });
      await load();
    } catch (e) { setError(e.message || "등급 변경 실패"); }
    finally { setBusyUid(null); }
  };
  const onToggleAdmin = async (uid, makeAdmin) => {
    if (!confirm(makeAdmin ? "관리자 권한을 부여하시겠습니까?" : "관리자 권한을 해제하시겠습니까?")) return;
    setBusyUid(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role: makeAdmin ? "admin" : "user", updatedAt: serverTimestamp() });
      await load();
    } catch (e) { setError(e.message || "권한 변경 실패"); }
    finally { setBusyUid(null); }
  };

  return (
    <AdminSection
      title="사용자 관리"
      subtitle={`승인 대기 ${pending.length} · 승인됨 ${approved.length} · 거절됨 ${rejected.length}`}
      action={<RefreshButton onClick={load} loading={loading}/>}
    >
      {error && <ErrorBanner message={error}/>}

      {pending.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-amber-400 mb-2 flex items-center gap-2">
            <AlertTriangle size={12}/> 승인 대기 ({pending.length})
          </div>
          <UserTable users={pending} status="pending" busyUid={busyUid}
            onApprove={onApprove} onReject={onReject} onDelete={onDelete}
            onChangeGrade={onChangeGrade} onToggleAdmin={onToggleAdmin}
            loading={loading}
          />
        </div>
      )}

      <div>
        <div className="text-[11px] font-bold text-emerald-400 mb-2">승인된 사용자 ({approved.length})</div>
        <UserTable users={approved} status="approved" busyUid={busyUid}
          onApprove={onApprove} onReject={onReject} onDelete={onDelete}
          onChangeGrade={onChangeGrade} onToggleAdmin={onToggleAdmin}
          loading={loading}
        />
      </div>

      {rejected.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-rose-400 mb-2">거절된 사용자 ({rejected.length})</div>
          <UserTable users={rejected} status="rejected" busyUid={busyUid}
            onApprove={onApprove} onReject={onReject} onDelete={onDelete}
            onChangeGrade={onChangeGrade} onToggleAdmin={onToggleAdmin}
            loading={loading}
          />
        </div>
      )}
    </AdminSection>
  );
}

function UserTable({ users, status, busyUid, onApprove, onReject, onDelete, onChangeGrade, onToggleAdmin, loading }) {
  if (loading && users.length === 0) {
    return <div className="text-zinc-600 text-xs text-center py-6">로딩 중...</div>;
  }
  if (users.length === 0) {
    return <div className="text-zinc-600 text-xs text-center py-6 border border-dashed border-white/5 rounded-lg">해당 상태의 사용자가 없습니다.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-white/5">
      <table className="w-full text-xs">
        <thead className="bg-[#111118]">
          <tr className="text-zinc-500 text-left text-[10px] uppercase tracking-wider">
            <th className="px-3 py-2 font-bold">이메일</th>
            <th className="px-3 py-2 font-bold">이름</th>
            <th className="px-3 py-2 font-bold">가입일</th>
            <th className="px-3 py-2 font-bold">등급</th>
            <th className="px-3 py-2 font-bold">권한</th>
            <th className="px-3 py-2 font-bold text-right">작업</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => {
            const busy = busyUid === u.uid;
            const isAdmin = u.role === "admin";
            return (
              <tr key={u.uid} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2.5 text-zinc-200 break-all">{u.email || "(이메일 없음)"}</td>
                <td className="px-3 py-2.5 text-zinc-400">{u.displayName || "-"}</td>
                <td className="px-3 py-2.5 text-zinc-600 text-[10px] font-mono">{formatTime(u.createdAt)}</td>
                <td className="px-3 py-2.5">
                  <select value={u.grade || GRADES.general} disabled={busy}
                    onChange={(e) => onChangeGrade(u.uid, e.target.value)}
                    className="bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-white/20 disabled:opacity-40">
                    <option value={GRADES.general}>{GRADE_LABEL.general}</option>
                    <option value={GRADES.pro}>{GRADE_LABEL.pro}</option>
                    <option value={GRADES.expert}>{GRADE_LABEL.expert}</option>
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <button onClick={() => onToggleAdmin(u.uid, !isAdmin)} disabled={busy}
                    className="text-[10px] font-bold px-2 py-1 rounded border transition-colors"
                    style={isAdmin
                      ? { color: ACCENT, background: `${ACCENT}15`, borderColor: `${ACCENT}55` }
                      : { color: "#52525b", background: "transparent", borderColor: "rgba(255,255,255,0.08)" }}
                    title={isAdmin ? "관리자 권한 해제" : "관리자 권한 부여"}>
                    {isAdmin ? "ADMIN" : "USER"}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  {status === "pending" && (
                    <>
                      <ActionButton onClick={() => onApprove(u.uid, GRADES.general)} disabled={busy} color="#0eb9b3" label="승인"/>
                      <ActionButton onClick={() => onApprove(u.uid, GRADES.pro)} disabled={busy} color="#74B9FF" label="Pro 승인"/>
                      <ActionButton onClick={() => onReject(u.uid)} disabled={busy} color="#ff7575" label="거절"/>
                    </>
                  )}
                  {status === "approved" && (
                    <>
                      <ActionButton onClick={() => onReject(u.uid)} disabled={busy} color="#ff7575" label="차단"/>
                      <ActionButton onClick={() => onDelete(u.uid, u.email)} disabled={busy} color="#52525b" label="삭제"/>
                    </>
                  )}
                  {status === "rejected" && (
                    <>
                      <ActionButton onClick={() => onApprove(u.uid, GRADES.general)} disabled={busy} color="#0eb9b3" label="재승인"/>
                      <ActionButton onClick={() => onDelete(u.uid, u.email)} disabled={busy} color="#52525b" label="삭제"/>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────── 2. 평가 기준 관리 ───────────────
const CRITERIA_TYPE_LIST = [
  { id: "banner",    label: "배너" },
  { id: "promotion", label: "프로모션" },
  { id: "brandweb",  label: "브랜드웹" },
  { id: "prompt",    label: "프롬프트" },
];

function CriteriaPanel() {
  const [type, setType] = useState("banner");
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingVersion, setEditingVersion] = useState(null); // { id?, name, criteria[], isActive, note, _mode }
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);

  const versionsRef = collection(db, "evaluationCriteria", type, "versions");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = query(versionsRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // index 없으면 fallback
      try {
        const snap = await getDocs(versionsRef);
        setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e2) {
        setError(e2.message || "버전 조회 실패");
      }
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => { load(); }, [load]);

  // 첫 진입 시 자동 마이그레이션 — 모든 type 의 versions 비어있으면 시드 등록
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const KEY = "nexus.criteria.migrated.v1";
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(KEY)) return;
      setMigrating(true);
      try {
        const r = await migrateInitialCriteria();
        if (!cancelled) {
          setMigrationResult(r);
          if (typeof sessionStorage !== "undefined") sessionStorage.setItem(KEY, "1");
          await load();
        }
      } finally { if (!cancelled) setMigrating(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeVersion = useMemo(() => versions.find(v => v.isActive), [versions]);

  const handleNew = () => {
    setEditingVersion({
      _mode: "create",
      name: `${CRITERIA_TYPE_LIST.find(t => t.id === type)?.label} v${versions.length + 1}`,
      isActive: false,
      note: "",
      criteria: [{ id: cryptoId(), name: "", weight: 10, description: "", maxScore: 100 }],
    });
  };

  const handleEdit = (v) => {
    setEditingVersion({ ...v, _mode: "edit", criteria: [...(v.criteria || [])] });
  };

  // "복사" — 기존 버전을 새 버전으로 만들기 위해 폼에 채워서 열기
  const handleCloneAsNew = (v) => {
    setEditingVersion({
      _mode: "create",
      name: `${v.name} (복사본)`,
      isActive: false,
      note: `${v.name} 에서 복사`,
      criteria: (v.criteria || []).map(c => ({ ...c })),
    });
  };

  // "새 버전으로 저장" — 편집 중인 버전을 새 doc 으로 저장 (id 무시)
  const handleSaveAsNew = (versionData) => handleSave({ ...versionData, id: null, _mode: "create" });

  const handleSave = async (versionData) => {
    setError("");
    try {
      const payload = {
        name: versionData.name || "untitled",
        isActive: !!versionData.isActive,
        note: versionData.note || "",
        criteria: (versionData.criteria || []).map(c => ({
          id: c.id || cryptoId(),
          name: c.name || "",
          weight: Number(c.weight) || 0,
          description: c.description || "",
          maxScore: Number(c.maxScore) || 100,
        })),
        updatedAt: serverTimestamp(),
      };
      // 활성화 토글 시 다른 버전들은 자동으로 비활성화
      if (payload.isActive) {
        const batch = writeBatch(db);
        versions.forEach(v => {
          if (v.id !== versionData.id && v.isActive) {
            batch.update(doc(versionsRef, v.id), { isActive: false });
          }
        });
        if (versionData.id) {
          batch.set(doc(versionsRef, versionData.id), payload, { merge: true });
        } else {
          batch.set(doc(versionsRef), { ...payload, createdAt: serverTimestamp() });
        }
        await batch.commit();
      } else {
        if (versionData.id) {
          await setDoc(doc(versionsRef, versionData.id), payload, { merge: true });
        } else {
          await addDoc(versionsRef, { ...payload, createdAt: serverTimestamp() });
        }
      }
      setEditingVersion(null);
      await load();
    } catch (e) {
      setError(e.message || "저장 실패");
    }
  };

  const handleToggleActive = async (v) => {
    try {
      const batch = writeBatch(db);
      // 활성화 시 다른 모든 버전 비활성화
      if (!v.isActive) {
        versions.forEach(vv => {
          if (vv.id !== v.id && vv.isActive) {
            batch.update(doc(versionsRef, vv.id), { isActive: false, updatedAt: serverTimestamp() });
          }
        });
      }
      batch.update(doc(versionsRef, v.id), { isActive: !v.isActive, updatedAt: serverTimestamp() });
      await batch.commit();
      await load();
    } catch (e) { setError(e.message || "활성화 실패"); }
  };

  const handleDelete = async (v) => {
    if (!confirm(`"${v.name}" 버전을 삭제하시겠습니까?`)) return;
    try { await deleteDoc(doc(versionsRef, v.id)); await load(); }
    catch (e) { setError(e.message || "삭제 실패"); }
  };

  const handleManualMigrate = async () => {
    if (!confirm("아직 시드가 없는 평가 유형에 대해 v1.0 시드를 생성합니다. 진행할까요?")) return;
    setMigrating(true); setError("");
    try {
      const r = await migrateInitialCriteria();
      setMigrationResult(r);
      await load();
    } catch (e) { setError(e.message || "마이그레이션 실패"); }
    finally { setMigrating(false); }
  };

  return (
    <AdminSection
      title="평가 기준 관리"
      subtitle="평가 유형별로 기준 항목과 버전을 관리합니다."
      action={
        <div className="flex flex-col gap-2">
          <button onClick={handleManualMigrate} disabled={migrating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold text-zinc-400 border border-white/10 hover:bg-white/5 disabled:opacity-40">
            {migrating ? "마이그레이션 중..." : "시드 마이그레이션"}
          </button>
          <button onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors"
            style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}55` }}>
            <Plus size={12}/> 새 버전
          </button>
          <RefreshButton onClick={load} loading={loading}/>
        </div>
      }
    >
      {migrationResult && (
        <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
          <div className="font-bold mb-1">마이그레이션 결과</div>
          <div className="font-mono text-[10px] text-emerald-400/80">
            seeded: [{migrationResult.seeded.join(", ") || "-"}] · skipped: [{migrationResult.skipped.join(", ") || "-"}]
            {migrationResult.failed?.length > 0 && ` · failed: ${migrationResult.failed.length}`}
          </div>
        </div>
      )}

      {/* 평가 유형 탭 */}
      <div className="flex gap-1 border-b border-white/5">
        {CRITERIA_TYPE_LIST.map(t => {
          const active = type === t.id;
          return (
            <button key={t.id} onClick={() => setType(t.id)}
              className="px-4 py-2 text-xs font-bold transition-colors border-b-2"
              style={{
                color: active ? "#fafafa" : "#7A7A9A",
                borderBottomColor: active ? "#fafafa" : "transparent",
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {error && <ErrorBanner message={error}/>}

      {/* 활성 버전 카드 */}
      {activeVersion ? (
        <div className="rounded-lg border" style={{ borderColor: `${ACCENT}55`, background: `${ACCENT}08` }}>
          <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: `${ACCENT}33` }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: ACCENT }}>현재 활성 버전</span>
              <span className="text-sm font-bold text-white truncate">{activeVersion.name}</span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">{formatTime(activeVersion.createdAt)}</span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => handleEdit(activeVersion)} className="text-[10px] px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-white/5">
                <Edit2 size={10} className="inline mr-1"/>편집
              </button>
              <button onClick={() => handleCloneAsNew(activeVersion)} className="text-[10px] px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-white/5">
                복사
              </button>
            </div>
          </div>
          {activeVersion.note && (
            <div className="px-3 pt-2 text-[10px] text-zinc-400 italic">"{activeVersion.note}"</div>
          )}
          <div className="p-3">
            <CriteriaList items={activeVersion.criteria || []} readOnly/>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
          활성화된 버전이 없습니다. 새 버전을 만들고 활성화해주세요.
        </div>
      )}

      {/* 버전 히스토리 */}
      <div>
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">버전 히스토리 ({versions.length})</div>
        {versions.length === 0 ? (
          <div className="text-zinc-600 text-xs text-center py-6 border border-dashed border-white/5 rounded-lg">
            등록된 버전이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map(v => (
              <div key={v.id} className="p-3 rounded-lg border border-white/5 bg-[#111118] hover:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-sm font-bold text-zinc-200 truncate">{v.name}</span>
                    {v.isActive && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: `${ACCENT}20`, color: ACCENT }}>● 활성</span>
                    )}
                    <span className="text-[10px] text-zinc-600 font-mono shrink-0">{formatTime(v.createdAt)}</span>
                    <span className="text-[10px] text-zinc-500 shrink-0">항목 {v.criteria?.length || 0}개</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEdit(v)} className="text-[10px] px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-white/5">보기/편집</button>
                    <button onClick={() => handleToggleActive(v)}
                      className="text-[10px] px-2 py-1 rounded font-bold"
                      style={v.isActive
                        ? { color: "#fb7185", background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.3)" }
                        : { color: "#34d399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
                      {v.isActive ? "비활성화" : "활성화"}
                    </button>
                    <button onClick={() => handleCloneAsNew(v)} className="text-[10px] px-2 py-1 rounded text-zinc-400 hover:text-white hover:bg-white/5">복사</button>
                    <button onClick={() => handleDelete(v)} className="text-[10px] px-2 py-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10">삭제</button>
                  </div>
                </div>
                {v.note && (
                  <div className="mt-1.5 text-[10px] text-zinc-500 italic pl-1">"{v.note}"</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingVersion && (
        <CriteriaVersionEditor
          version={editingVersion}
          onClose={() => setEditingVersion(null)}
          onSave={handleSave}
          onSaveAsNew={handleSaveAsNew}
        />
      )}
    </AdminSection>
  );
}

function CriteriaVersionEditor({ version, onClose, onSave, onSaveAsNew }) {
  const [name, setName] = useState(version.name || "");
  const [isActive, setIsActive] = useState(!!version.isActive);
  const [note, setNote] = useState(version.note || "");
  const [criteria, setCriteria] = useState(version.criteria || []);
  const [saving, setSaving] = useState(false);
  const isEditingExisting = !!version.id;

  const updateItem = (idx, patch) => {
    setCriteria(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };
  const addItem = () => {
    setCriteria(prev => [...prev, { id: cryptoId(), name: "", weight: 10, description: "", maxScore: 100 }]);
  };
  const removeItem = (idx) => {
    setCriteria(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveOverwrite = async () => {
    setSaving(true);
    try { await onSave({ ...version, name, isActive, note, criteria }); }
    finally { setSaving(false); }
  };
  const handleSaveAsNew = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSaveAsNew({ ...version, name, isActive, note, criteria }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] bg-[#0c0c0e] border border-white/10 rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
              {isEditingExisting ? "버전 편집" : "새 버전"}
            </div>
            <div className="text-base font-bold text-white mt-0.5">평가 기준 버전</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1.5 rounded hover:bg-white/5">
            <X size={16}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">버전명</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="예: 배너 평가 v2 (2026 Q2)"
              className="w-full bg-[#0a0a0c] border border-white/10 rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/20"/>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">변경 메모 (선택)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="예: 가중치 조정 및 항목 추가 / 디자인 평가도구 v2 와 동기화"
              className="w-full h-16 bg-[#0a0a0c] border border-white/10 rounded px-3 py-2 text-xs text-zinc-300 outline-none focus:border-white/20 resize-none"/>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}/>
            <span className="text-xs text-zinc-300">저장 시 이 버전을 활성화 (기존 활성 버전은 자동 비활성화)</span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">평가 항목 ({criteria.length})</label>
              <button onClick={addItem} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded"
                style={{ background: `${ACCENT}15`, color: ACCENT }}>
                <Plus size={10}/> 항목 추가
              </button>
            </div>
            <div className="space-y-2">
              {criteria.map((c, idx) => (
                <div key={c.id || idx} className="p-3 rounded-lg border border-white/5 bg-[#111118] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 font-mono shrink-0">#{idx + 1}</span>
                    <input value={c.id || ""} onChange={e => updateItem(idx, { id: e.target.value })}
                      placeholder="id (예: impression)"
                      className="w-32 bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-zinc-400 outline-none"/>
                    <input value={c.name} onChange={e => updateItem(idx, { name: e.target.value })}
                      placeholder="항목 이름 (예: 첫인상 / 주목도)"
                      className="flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"/>
                    <button onClick={() => removeItem(idx)} className="text-zinc-500 hover:text-rose-400 p-1">
                      <Trash2 size={11}/>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" value={c.weight} onChange={e => updateItem(idx, { weight: e.target.value })}
                      placeholder="가중치 %" min="0" step="0.5"
                      className="w-24 bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none"/>
                    <input type="number" value={c.maxScore} onChange={e => updateItem(idx, { maxScore: e.target.value })}
                      placeholder="만점" min="1"
                      className="w-24 bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none"/>
                    <input value={c.description} onChange={e => updateItem(idx, { description: e.target.value })}
                      placeholder="설명 (예: 좌우/상하 비율과 시선 흐름)"
                      className="flex-1 bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-400 outline-none"/>
                  </div>
                </div>
              ))}
              {criteria.length === 0 && (
                <div className="text-zinc-600 text-xs text-center py-4 border border-dashed border-white/5 rounded">
                  항목이 없습니다. "항목 추가"를 눌러 시작하세요.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs border border-white/10 text-zinc-400 rounded-md hover:bg-white/5">취소</button>
          <div className="flex gap-2">
            {isEditingExisting && (
              <button onClick={handleSaveAsNew} disabled={saving || !name.trim()}
                className="px-4 py-2 text-xs font-bold rounded-md text-zinc-200 border border-white/10 hover:bg-white/5 disabled:opacity-40">
                새 버전으로 저장
              </button>
            )}
            <button onClick={handleSaveOverwrite} disabled={saving || !name.trim()}
              className="px-4 py-2 text-xs font-bold rounded-md disabled:opacity-40"
              style={{ background: ACCENT, color: "#fff" }}>
              {saving ? "저장 중..." : isEditingExisting ? "덮어쓰기 저장" : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CriteriaList({ items, readOnly: _readOnly }) {
  if (!items.length) return <div className="text-zinc-600 text-xs">평가 항목이 없습니다.</div>;
  return (
    <div className="space-y-1.5">
      {items.map((c, i) => (
        <div key={c.id || i} className="flex items-start gap-3 p-2 rounded bg-[#0a0a0c]">
          <span className="text-[10px] font-mono text-zinc-600 mt-0.5 w-6 shrink-0">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-zinc-200">{c.name || "(이름 없음)"}</span>
              <span className="text-[10px] text-zinc-500">×{c.weight} · 만점 {c.maxScore}</span>
            </div>
            {c.description && <div className="text-[10px] text-zinc-500 mt-0.5">{c.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────── 3. 초대 코드 관리 ───────────────
function InvitesPanel() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState({ code: "", grade: GRADES.expert, maxUses: 1 });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const snap = await getDocs(collection(db, "inviteCodes"));
      setCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { setError(e.message || "조회 실패"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setError("");
    const code = (newCode.code || generateCode()).toUpperCase().trim();
    if (!code) { setError("코드를 입력하거나 자동 생성 버튼을 눌러주세요."); return; }
    try {
      await setDoc(doc(db, "inviteCodes", code), {
        active: true,
        grade: newCode.grade,
        maxUses: Number(newCode.maxUses) || 1,
        usedCount: 0,
        createdAt: serverTimestamp(),
      });
      setNewCode({ code: "", grade: GRADES.expert, maxUses: 1 });
      setCreating(false);
      await load();
    } catch (e) { setError(e.message || "생성 실패"); }
  };

  const handleToggle = async (c) => {
    try {
      await updateDoc(doc(db, "inviteCodes", c.id), { active: !c.active });
      await load();
    } catch (e) { setError(e.message || "변경 실패"); }
  };

  const handleDelete = async (c) => {
    if (!confirm(`코드 "${c.id}" 를 삭제하시겠습니까?`)) return;
    try { await deleteDoc(doc(db, "inviteCodes", c.id)); await load(); }
    catch (e) { setError(e.message || "삭제 실패"); }
  };

  return (
    <AdminSection
      title="초대 코드 관리"
      subtitle={`총 ${codes.length}개 · 활성 ${codes.filter(c => c.active).length}개`}
      action={
        <div className="flex flex-col gap-2">
          <button onClick={() => setCreating(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors"
            style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}55` }}>
            <Plus size={12}/> 새 코드
          </button>
          <RefreshButton onClick={load} loading={loading}/>
        </div>
      }
    >
      {error && <ErrorBanner message={error}/>}

      {creating && (
        <div className="p-4 rounded-lg border border-white/10 bg-[#111118] space-y-3">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">새 초대 코드</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">코드 (비워두면 자동 생성)</label>
              <div className="flex gap-1">
                <input value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value })}
                  placeholder="예: VIP2026"
                  className="flex-1 bg-[#0a0a0c] border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none uppercase"/>
                <button onClick={() => setNewCode({ ...newCode, code: generateCode() })}
                  className="px-2 py-1.5 text-[10px] text-zinc-400 border border-white/10 rounded hover:text-white hover:bg-white/5">
                  생성
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">부여 등급</label>
              <select value={newCode.grade} onChange={e => setNewCode({ ...newCode, grade: e.target.value })}
                className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none">
                <option value={GRADES.general}>{GRADE_LABEL.general}</option>
                <option value={GRADES.pro}>{GRADE_LABEL.pro}</option>
                <option value={GRADES.expert}>{GRADE_LABEL.expert}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">최대 사용 횟수</label>
              <input type="number" min="1" value={newCode.maxUses} onChange={e => setNewCode({ ...newCode, maxUses: e.target.value })}
                className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none"/>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 text-[11px] text-zinc-400 border border-white/10 rounded hover:bg-white/5">취소</button>
            <button onClick={handleCreate} className="px-3 py-1.5 text-[11px] font-bold rounded" style={{ background: ACCENT, color: "#fff" }}>
              생성
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-white/5">
        <table className="w-full text-xs">
          <thead className="bg-[#111118]">
            <tr className="text-zinc-500 text-left text-[10px] uppercase tracking-wider">
              <th className="px-3 py-2 font-bold">코드</th>
              <th className="px-3 py-2 font-bold">등급</th>
              <th className="px-3 py-2 font-bold">사용</th>
              <th className="px-3 py-2 font-bold">상태</th>
              <th className="px-3 py-2 font-bold">생성일</th>
              <th className="px-3 py-2 font-bold text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-600 text-xs">초대 코드가 없습니다.</td></tr>
            )}
            {codes.map(c => (
              <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2.5 font-mono text-zinc-200 font-bold">{c.id}</td>
                <td className="px-3 py-2.5 text-zinc-400">{GRADE_LABEL[c.grade] || c.grade || "-"}</td>
                <td className="px-3 py-2.5 text-zinc-500 font-mono">{c.usedCount || 0} / {c.maxUses || "∞"}</td>
                <td className="px-3 py-2.5">
                  {c.active ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">ACTIVE</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded text-zinc-500 bg-zinc-700/30 border border-zinc-700">INACTIVE</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-zinc-600 text-[10px] font-mono">{formatTime(c.createdAt)}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <ActionButton onClick={() => handleToggle(c)} color={c.active ? "#fb7185" : "#34d399"} label={c.active ? "비활성화" : "활성화"}/>
                  <ActionButton onClick={() => handleDelete(c)} color="#52525b" label="삭제"/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminSection>
  );
}

// ─────────────── 4. 시스템 설정 ───────────────
// Vercel Build Settings 스타일 — 섹션 헤더(굵은 라벨 + 하단 구분선) + 각 row 3열 그리드.
function SettingsSectionDivider({ title, subtitle }) {
  return (
    <div className="border-b border-white/10 pb-3 pt-2">
      <div className="text-sm font-bold text-white">{title}</div>
      {subtitle && <div className="text-[11px] text-zinc-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// 한 설정 항목 = [이름 | 설명 | 컨트롤] 3열 grid. 마지막 row 는 borderBottom 없도록 lastClass.
function SettingRow({ name, description, control, lastInGroup = false }) {
  return (
    <div className={`grid grid-cols-12 gap-6 py-5 ${lastInGroup ? "" : "border-b border-white/5"}`}>
      <div className="col-span-3">
        <div className="text-xs font-bold text-zinc-100">{name}</div>
      </div>
      <div className="col-span-5">
        <div className="text-[11px] text-zinc-500 leading-relaxed">{description}</div>
      </div>
      <div className="col-span-4">{control}</div>
    </div>
  );
}

function SettingsPanel() {
  const settingsRef = doc(db, "systemSettings", "global");
  const [data, setData] = useState({ platformName: "NEXUS Studio", notice: "", appsEnabled: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(settingsRef);
        if (snap.exists()) setData(prev => ({ ...prev, ...snap.data() }));
      } catch (e) { setError(e.message || "조회 실패"); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await setDoc(settingsRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      setSavedAt(Date.now());
    } catch (e) { setError(e.message || "저장 실패"); }
    finally { setSaving(false); }
  };

  // 토글 가능한 앱 목록은 APP_REGISTRY를 직접 참조하지 않고, 사용자가 등록한 ID만 노출.
  const [newAppId, setNewAppId] = useState("");
  const toggleApp = (id) => {
    setData(prev => ({ ...prev, appsEnabled: { ...prev.appsEnabled, [id]: !prev.appsEnabled?.[id] } }));
  };
  const addApp = () => {
    if (!newAppId.trim()) return;
    setData(prev => ({ ...prev, appsEnabled: { ...prev.appsEnabled, [newAppId.trim()]: true } }));
    setNewAppId("");
  };
  const removeApp = (id) => {
    setData(prev => {
      const next = { ...prev.appsEnabled };
      delete next[id];
      return { ...prev, appsEnabled: next };
    });
  };

  return (
    <AdminSection
      title="시스템 설정"
      subtitle="플랫폼 전역 설정 (Firestore systemSettings/global)"
    >
      {error && <ErrorBanner message={error}/>}

      <DashboardHeroSettings />

      {/* ─── General ─────────────────────────────────────────── */}
      <section>
        <SettingsSectionDivider title="General" subtitle="플랫폼 전반 설정" />
        <div>
          <SettingRow
            name="플랫폼 이름"
            description="이 값은 Firestore 에만 저장됩니다. UI 에 적용하려면 Shell 에서 이 값을 읽도록 별도 작업이 필요합니다."
            control={
              <input value={data.platformName || ""} onChange={e => setData({ ...data, platformName: e.target.value })}
                className="w-full bg-[#0a0a0c] border border-white/10 rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/20"/>
            }
          />
          <SettingRow
            name="공지사항"
            description="모든 사용자에게 보여줄 공지 메시지. 점검 안내 · 변경사항 알림 등에 사용합니다."
            lastInGroup
            control={
              <textarea value={data.notice || ""} onChange={e => setData({ ...data, notice: e.target.value })}
                placeholder="예: 6/1 02:00 ~ 04:00 점검 예정"
                className="w-full h-20 bg-[#0a0a0c] border border-white/10 rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/20 resize-none"/>
            }
          />
        </div>
      </section>

      {/* ─── App Toggles ─────────────────────────────────────── */}
      <section>
        <SettingsSectionDivider title="App Toggles" subtitle="앱별 활성화 / 비활성화 (라우팅 차단은 별도 적용 필요)" />
        <div>
          <SettingRow
            name="등록된 앱"
            description="앱 ID 를 등록한 뒤 토글로 활성/비활성을 관리합니다. apps.js 와는 분리된 동적 레지스트리입니다."
            lastInGroup
            control={
              <div className="space-y-1.5">
                {Object.keys(data.appsEnabled || {}).map(id => (
                  <div key={id} className="flex items-center justify-between p-2 rounded bg-[#0a0a0c] border border-white/5">
                    <span className="text-xs text-zinc-200 font-mono truncate">{id}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleApp(id)}
                        className="text-[10px] font-bold px-2 py-1 rounded transition-colors"
                        style={data.appsEnabled[id]
                          ? { color: "#34d399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }
                          : { color: "#52525b", background: "transparent", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {data.appsEnabled[id] ? "ENABLED" : "DISABLED"}
                      </button>
                      <button onClick={() => removeApp(id)} className="text-zinc-500 hover:text-rose-400 p-1">
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </div>
                ))}
                {Object.keys(data.appsEnabled || {}).length === 0 && (
                  <div className="text-zinc-600 text-[11px] text-center py-3 border border-dashed border-white/10 rounded">
                    등록된 앱이 없습니다.
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <input value={newAppId} onChange={e => setNewAppId(e.target.value)} placeholder="앱 ID (예: prompt-arc)"
                    className="flex-1 bg-[#0a0a0c] border border-white/10 rounded px-2 py-1.5 text-xs text-zinc-200 outline-none font-mono"/>
                  <button onClick={addApp} className="px-3 py-1.5 text-[11px] font-bold rounded text-zinc-300 border border-white/10 hover:bg-white/5">
                    <Plus size={11} className="inline mr-1"/>추가
                  </button>
                </div>
              </div>
            }
          />
        </div>
      </section>

      {/* 하단 저장 바 — sticky 로 항상 노출. */}
      <div className="flex items-center justify-between sticky bottom-0 bg-[#0a0a0c] py-3 border-t border-white/10 -mx-1 px-1">
        <span className="text-[10px] text-zinc-600">
          {savedAt && `최근 저장 ${formatTime(savedAt)}`}
          {loading && "로딩 중..."}
        </span>
        <button onClick={handleSave} disabled={saving || loading}
          className="px-4 py-2 text-xs font-bold rounded-md disabled:opacity-40"
          style={{ background: ACCENT, color: "#fff" }}>
          {saving ? "저장 중..." : "설정 저장"}
        </button>
      </div>
    </AdminSection>
  );
}

// ─────────────── 대시보드 히어로 설정 ───────────────
function DashboardHeroSettings() {
  const [url, setUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const d = await fetchDashboardSettings();
      setUrl(d?.heroImageUrl || DEFAULT_HERO_IMAGE);
      setLoaded(true);
    })();
  }, []);

  const save = async () => {
    setSaving(true); setErr("");
    try {
      await updateDashboardHeroImage(url || DEFAULT_HERO_IMAGE);
      setSavedAt(Date.now());
    } catch (e) { setErr(e.message || "저장 실패"); }
    finally { setSaving(false); }
  };
  const reset = async () => {
    setUrl(DEFAULT_HERO_IMAGE);
    setSaving(true); setErr("");
    try {
      await updateDashboardHeroImage(DEFAULT_HERO_IMAGE);
      setSavedAt(Date.now());
    } catch (e) { setErr(e.message || "기본값 복원 실패"); }
    finally { setSaving(false); }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("이미지 파일만 업로드 가능합니다."); return; }
    if (file.size > 8 * 1024 * 1024) { setErr("파일 크기가 8MB를 초과합니다."); return; }
    setUploading(true); setErr("");
    try {
      // base64로 읽어서 Cloudinary 업로드 → secure_url 받기
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const cloudUrl = await uploadBase64(dataUrl);
      if (!cloudUrl) throw new Error("업로드 실패");
      setUrl(cloudUrl);
      await updateDashboardHeroImage(cloudUrl);
      setSavedAt(Date.now());
    } catch (e) {
      console.error("[Hero upload]", e);
      setErr(e.message || "업로드 실패");
    } finally { setUploading(false); }
  };

  return (
    <div className="rounded-lg border border-white/5 bg-[#111118] p-4 space-y-3">
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">대시보드 히어로 배경 이미지</label>
        <p className="text-[10px] text-zinc-600">파일 업로드(Cloudinary) 또는 URL 직접 입력. Firestore <code className="font-mono">settings/dashboard</code>에 저장되어 모든 사용자에게 실시간 반영됩니다.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading || saving}
          className="px-3 py-2 text-[11px] font-bold rounded bg-white/5 border border-white/10 text-zinc-200 hover:bg-white/10 disabled:opacity-40 flex items-center gap-2">
          {uploading ? <RefreshCw size={11} className="animate-spin"/> : <Plus size={11}/>}
          {uploading ? "업로드 중..." : "이미지 업로드"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="또는 URL 직접 입력"
          className="flex-1 bg-[#0a0a0c] border border-white/10 rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/20 font-mono" />
      </div>

      {loaded && url && (
        <div className="rounded-md overflow-hidden border border-white/5 relative" style={{ height: 140 }}>
          <img src={url} alt="hero preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(10,10,15,0.4), rgba(10,10,15,0.85))" }} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span style={{ fontFamily: "'Teko', sans-serif", fontSize: 28, color: "#fff", letterSpacing: "0.04em" }}>CREATIVE NEXUS PLATFORM</span>
          </div>
        </div>
      )}
      {err && <div className="text-[11px] text-rose-400">{err}</div>}
      <div className="flex gap-2 items-center justify-end">
        <span className="text-[10px] text-zinc-600 mr-auto">{savedAt && `저장됨 ${formatTime(savedAt)}`}</span>
        <button onClick={reset} disabled={saving || uploading}
          className="px-3 py-1.5 text-[11px] text-rose-400 border border-rose-500/30 rounded hover:bg-rose-500/10 disabled:opacity-40 flex items-center gap-1.5">
          <Trash2 size={11}/> 삭제 (기본값)
        </button>
        <button onClick={save} disabled={saving || uploading} style={{ background: ACCENT, color: "#fff" }}
          className="px-4 py-1.5 text-[11px] font-bold rounded disabled:opacity-40">
          {saving ? "저장 중..." : "URL 저장"}
        </button>
      </div>
    </div>
  );
}

// ─────────────── 공용 유틸 ───────────────
function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className="text-base font-bold text-white">{title}</div>
        {subtitle && <div className="text-[11px] text-zinc-500 mt-1">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

// Vercel Settings 스타일 레이아웃 — 좌측 sticky 타이틀 + 우측 컨텐츠.
// 4개 패널이 모두 같은 형태이므로 outer wrapper 와 SectionHeader 호출을 한 컴포넌트로 흡수.
// md 미만에서는 좌측이 위로 stack 되어 모바일/좁은 화면에서도 깨지지 않음.
function AdminSection({ title, subtitle, action, children }) {
  return (
    <div className="grid grid-cols-12 gap-x-10 gap-y-4 max-w-6xl mx-auto">
      <aside className="col-span-12 md:col-span-3">
        <div className="md:sticky md:top-0">
          <div className="text-base font-bold text-white">{title}</div>
          {subtitle && <div className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{subtitle}</div>}
          {action && <div className="mt-3">{action}</div>}
        </div>
      </aside>
      <main className="col-span-12 md:col-span-9 min-w-0 space-y-5">
        {children}
      </main>
    </div>
  );
}

function RefreshButton({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-zinc-400 border border-white/10 rounded-md hover:bg-white/5 disabled:opacity-40">
      <RefreshCw size={11} className={loading ? "animate-spin" : ""}/>
      {loading ? "로딩..." : "새로고침"}
    </button>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-md text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30">
      <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
      <span>{message}</span>
    </div>
  );
}

function ActionButton({ onClick, disabled, color, label }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="ml-1 px-2 py-1 text-[10px] font-bold rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color, background: "transparent", border: `1px solid ${color}55` }}>
      {label}
    </button>
  );
}

function cryptoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

function generateCode() {
  // 사람이 보고 외우기 쉽게 6자리 알파벳+숫자
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I, O, 0, 1 제외
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
