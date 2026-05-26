import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Users, ListChecks, Ticket, Settings as SettingsIcon,
  Shield, Plus, Trash2, Edit2, X, RefreshCw, AlertTriangle,
  FileText, Upload, Download, Save, RotateCcw, Sparkles, Power,
  ShieldCheck, BarChart3, Image as ImageIcon,
} from "lucide-react";
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  query, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db, appId } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  listUsersByStatus, approveUser, rejectUser, deleteUserDoc,
  GRADES, GRADE_LABEL, STATUS,
} from "../../lib/grades";
import { migrateInitialCriteria } from "../../lib/evaluationCriteria";
import { DEFAULT_AI_PROMPT } from "../BannerCodex/constants/categories";
import { DEFAULT_HERO_IMAGE, fetchDashboardSettings, updateDashboardHeroImage } from "../../lib/dashboardSettings";
import { uploadBase64 } from "../../lib/storage";
import { subscribeGeminiGate, setGeminiEnabled } from "../../lib/gemini";
import { subscribeAllAudits } from "../PromptAudit/services/firebase";
import { CONFLICT_TYPES } from "../PromptAudit/services/gemini";
import { subscribeToGameLogos, saveGameLogo, removeGameLogo, compressLogoFile } from "../../lib/gameLogos";

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
      { id: "criteria",  name: "평가 기준",        icon: <ListChecks size={18}/> },
      { id: "prompt",    name: "AI 평가 프롬프트", icon: <FileText size={18}/> },
      { id: "gameLogos", name: "게임 로고",        icon: <ImageIcon size={18}/> },
    ],
  },
  {
    label: "분석",
    items: [
      { id: "audits", name: "감사 이력", icon: <ShieldCheck size={18}/> },
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
    <div className="flex bg-slate-50 text-slate-900 dark:bg-[#0a0a0c] dark:text-zinc-200 font-sans overflow-hidden" style={{ height: "calc(100vh - 52px)" }}>
      <AdminSidebar
        tab={tab}
        setTab={setTab}
        isSidebarCollapsed={isSidebarCollapsed}
        handleSidebarClick={handleSidebarClick}
      />
      <main className="flex-1 my-3 mr-3 ml-3 rounded-[16px] border border-zinc-800/80 bg-[#0c0c0e] shadow-2xl overflow-hidden flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "users"     && <UsersPanel/>}
          {tab === "criteria"  && <CriteriaPanel/>}
          {tab === "prompt"    && <PromptPanel/>}
          {tab === "gameLogos" && <GameLogosPanel/>}
          {tab === "invites"   && <InvitesPanel/>}
          {tab === "audits"    && <AuditsPanel/>}
          {tab === "settings"  && <SettingsPanel/>}
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
                    <option value={GRADES.pro_plus}>{GRADE_LABEL.pro_plus} (내부 관계자)</option>
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
  { id: "banner",     label: "배너" },
  { id: "promotion",  label: "프로모션" },
  { id: "brandweb",   label: "브랜드웹" },
  { id: "prompt",     label: "프롬프트" },
  // ─── 타이포그래피 평가 (디자인 평가도구 v2 — 2026-05) ───
  { id: "typo2d",     label: "2D 타이포" },
  { id: "typoRender", label: "렌더링 타이포" },
  { id: "typoMotion", label: "모션 타이포" },
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
                <option value={GRADES.pro_plus}>{GRADE_LABEL.pro_plus}</option>
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

// ─────────────────────────────────────────────────────────────────────────────
// 감사 이력 대시보드 — 전체 사용자 audits 집계.
//   · sourceApp × conflictType 매트릭스
//   · 채택률 / 빈도 / 점수 분포
//   · 빈도 높은 evidence 토큰 (룰화 후보)
//   · JSONL 내보내기 (학습 데이터)
// ─────────────────────────────────────────────────────────────────────────────
const SOURCE_APP_LABEL = {
  "prompt-arc": "Prompt Arc",
  "typecore-sovereign": "Typecore Sovereign",
  "typecore-breeze": "Typecore Breeze",
  "render-metrics": "Render Matrix",
  "render-matrix-pop": "Render Matrix: Pop",
  "motion-metrics": "Motion Matrix",
  "": "직접 입력",
};

function AuditsPanel() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterApp, setFilterApp] = useState("all");

  useEffect(() => {
    setLoading(true); setError("");
    let cancelled = false;
    const unsub = subscribeAllAudits((arr) => {
      if (cancelled) return;
      setAudits(Array.isArray(arr) ? arr : []);
      setLoading(false);
    }, 500);
    return () => { cancelled = true; unsub?.(); };
  }, []);

  // ─── 집계 ───
  const stats = useMemo(() => {
    const total = audits.length;
    let totalConflicts = 0;
    let acceptedTotal = 0;
    let withAccept = 0;
    let scoreSum = 0;
    const byApp = {};            // sourceApp → count
    const byAppType = {};        // sourceApp → { conflictType → count }
    const evidenceFreq = {};     // evidence(소문자) → { count, types:Set, examples:[] }
    const typeFreq = {};         // conflictType → count

    for (const a of audits) {
      const src = a.sourceApp || "";
      byApp[src] = (byApp[src] || 0) + 1;
      scoreSum += Number(a.score || 0);

      const conflicts = Array.isArray(a.conflicts) ? a.conflicts : [];
      totalConflicts += conflicts.length;
      for (const c of conflicts) {
        const t = c.type || "VAGUE_DIRECTION";
        typeFreq[t] = (typeFreq[t] || 0) + 1;
        if (!byAppType[src]) byAppType[src] = {};
        byAppType[src][t] = (byAppType[src][t] || 0) + 1;
        const ev = String(c.evidence || "").trim().toLowerCase();
        if (ev && ev.length >= 3 && ev.length <= 80) {
          if (!evidenceFreq[ev]) evidenceFreq[ev] = { count: 0, types: new Set(), examples: [] };
          evidenceFreq[ev].count++;
          evidenceFreq[ev].types.add(t);
          if (evidenceFreq[ev].examples.length < 2) evidenceFreq[ev].examples.push(c.evidence);
        }
      }

      const accepted = Array.isArray(a.acceptedFixes) ? a.acceptedFixes.length : 0;
      acceptedTotal += accepted;
      if (accepted > 0) withAccept++;
    }

    const topEvidence = Object.entries(evidenceFreq)
      .map(([ev, v]) => ({ evidence: ev, count: v.count, types: [...v.types], example: v.examples[0] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const appList = Object.keys(byApp).sort((a, b) => (byApp[b] - byApp[a]));
    const typeList = Object.keys(typeFreq).sort((a, b) => (typeFreq[b] - typeFreq[a]));

    return {
      total, totalConflicts, acceptedTotal, withAccept,
      avgScore: total ? Math.round(scoreSum / total) : 0,
      acceptRate: total ? Math.round((withAccept / total) * 100) : 0,
      byApp, byAppType, appList, typeList, typeFreq, topEvidence,
    };
  }, [audits]);

  // ─── 필터 적용 (최근 이력 테이블용) ───
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return audits.filter((a) => {
      if (filterApp !== "all" && (a.sourceApp || "") !== filterApp) return false;
      if (kw) {
        const blob = `${a.sourcePrompt || ""} ${a.summary || ""} ${a.displayName || ""}`.toLowerCase();
        if (!blob.includes(kw)) return false;
      }
      return true;
    });
  }, [audits, search, filterApp]);

  // ─── JSONL export ───
  const exportJsonl = () => {
    const data = audits.map(a => JSON.stringify({
      id: a.id,
      uid: a.uid,
      sourceApp: a.sourceApp || "",
      sourceId: a.sourceId || "",
      sourcePrompt: a.sourcePrompt || "",
      improvedPrompt: a.improvedPrompt || "",
      finalPrompt: a.finalPrompt || "",
      score: a.score || 0,
      summary: a.summary || "",
      conflicts: a.conflicts || [],
      acceptedFixes: a.acceptedFixes || [],
      globalSuggestions: a.globalSuggestions || [],
      createdAt: a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toISOString() : null,
    })).join("\n");
    const blob = new Blob([data], { type: "application/x-ndjson" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prompt-audits-${new Date().toISOString().slice(0, 10)}.jsonl`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: ACCENT }} />
            감사 이력 대시보드
          </h1>
          <p className="text-[11px] text-zinc-500 mt-1">전체 사용자 프롬프트 최적화 기록 집계 — 엔진 룰화 후보 식별</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportJsonl}
            disabled={audits.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors disabled:opacity-40"
            title="audits 전체를 JSONL로 다운로드 (학습 데이터)"
          >
            <Download className="w-3.5 h-3.5" /> JSONL 내보내기 ({audits.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md border border-rose-500/30 bg-rose-950/20 text-[11px] text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {/* 통계 카드 4종 */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="총 분석" value={stats.total.toLocaleString()} sub="audits" />
        <StatCard label="평균 점수" value={`${stats.avgScore}`} sub="/ 100" valueColor={stats.avgScore >= 80 ? "#10b981" : stats.avgScore >= 60 ? "#f59e0b" : "#ef4444"} />
        <StatCard label="총 충돌 검출" value={stats.totalConflicts.toLocaleString()} sub={`평균 ${stats.total ? (stats.totalConflicts / stats.total).toFixed(1) : 0}건/감사`} />
        <StatCard label="대안 채택률" value={`${stats.acceptRate}%`} sub={`${stats.withAccept}/${stats.total} 세션`} valueColor={ACCENT} />
      </div>

      {/* sourceApp × conflictType 매트릭스 */}
      {stats.total > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-[#141416] p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4" style={{ color: ACCENT }} />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">소스앱 × 충돌 유형 매트릭스</h2>
            <span className="text-[10px] text-zinc-500">— 어떤 엔진이 어떤 충돌을 만드는지</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left px-2 py-2 font-semibold">소스앱</th>
                  <th className="text-right px-2 py-2 font-semibold">총감사</th>
                  {stats.typeList.map(t => (
                    <th key={t} className="text-right px-2 py-2 font-semibold whitespace-nowrap">
                      <span style={{ color: CONFLICT_TYPES[t]?.color || "#A29BFE" }}>
                        {CONFLICT_TYPES[t]?.label || t}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.appList.map(src => (
                  <tr key={src} className="border-b border-zinc-900 hover:bg-white/5">
                    <td className="px-2 py-2 text-zinc-300 font-medium">{SOURCE_APP_LABEL[src] ?? src}</td>
                    <td className="px-2 py-2 text-right text-zinc-400">{stats.byApp[src]}</td>
                    {stats.typeList.map(t => {
                      const v = stats.byAppType[src]?.[t] || 0;
                      const max = Math.max(...stats.typeList.map(tt => Math.max(...stats.appList.map(s => stats.byAppType[s]?.[tt] || 0))));
                      const intensity = max > 0 ? v / max : 0;
                      return (
                        <td key={t} className="px-2 py-2 text-right tabular-nums"
                          style={{ background: v > 0 ? `rgba(108,92,231,${0.05 + intensity * 0.25})` : "transparent", color: v === 0 ? "#3f3f46" : "#e4e4e7" }}>
                          {v || "·"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 빈도 높은 evidence 토큰 — 룰화 후보 */}
      {stats.topEvidence.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-[#141416] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">빈도 높은 충돌 근거 (룰화 후보 TOP 20)</h2>
          </div>
          <ul className="space-y-1.5">
            {stats.topEvidence.map((e, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/30 border border-zinc-800/60">
                <span className="w-8 text-[10px] font-bold text-zinc-600 tabular-nums shrink-0">#{i + 1}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tabular-nums shrink-0"
                  style={{ background: `${ACCENT}20`, color: ACCENT, minWidth: 30, textAlign: "center" }}>
                  {e.count}
                </span>
                <span className="font-mono text-[11px] text-zinc-300 truncate flex-1" title={e.example}>{e.example}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {e.types.slice(0, 3).map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap"
                      style={{ background: `${CONFLICT_TYPES[t]?.color || "#A29BFE"}20`, color: CONFLICT_TYPES[t]?.color || "#A29BFE" }}>
                      {CONFLICT_TYPES[t]?.label || t}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 최근 이력 — 검색/필터 */}
      <div className="rounded-lg border border-zinc-800 bg-[#141416] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: ACCENT }} />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">최근 이력 ({filtered.length}/{stats.total})</h2>
          </div>
          <div className="flex items-center gap-2">
            <select value={filterApp} onChange={(e) => setFilterApp(e.target.value)}
              className="bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none">
              <option value="all">전체 소스</option>
              {stats.appList.map(s => (
                <option key={s} value={s}>{SOURCE_APP_LABEL[s] ?? s} ({stats.byApp[s]})</option>
              ))}
            </select>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="검색 — 프롬프트/요약/사용자"
              className="bg-[#0a0a0c] border border-white/10 rounded px-2 py-1 text-[11px] text-zinc-200 outline-none w-56" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left px-2 py-2 font-semibold w-32">일시</th>
                <th className="text-left px-2 py-2 font-semibold w-28">소스</th>
                <th className="text-right px-2 py-2 font-semibold w-12">점수</th>
                <th className="text-right px-2 py-2 font-semibold w-12">충돌</th>
                <th className="text-right px-2 py-2 font-semibold w-12">채택</th>
                <th className="text-left px-2 py-2 font-semibold">요약</th>
                <th className="text-left px-2 py-2 font-semibold w-32">사용자</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-600">데이터 없음</td></tr>
              ) : filtered.slice(0, 100).map(a => {
                const score = a.score || 0;
                const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
                const accepted = Array.isArray(a.acceptedFixes) ? a.acceptedFixes.length : 0;
                const conflictN = Array.isArray(a.conflicts) ? a.conflicts.length : 0;
                return (
                  <tr key={a.id} className="border-b border-zinc-900 hover:bg-white/5">
                    <td className="px-2 py-2 text-zinc-500 font-mono text-[10px]">{formatTime(a.createdAt)}</td>
                    <td className="px-2 py-2 text-zinc-400">{SOURCE_APP_LABEL[a.sourceApp || ""] ?? a.sourceApp}</td>
                    <td className="px-2 py-2 text-right font-bold tabular-nums" style={{ color: scoreColor }}>{score}</td>
                    <td className="px-2 py-2 text-right text-zinc-400 tabular-nums">{conflictN}</td>
                    <td className="px-2 py-2 text-right tabular-nums" style={{ color: accepted > 0 ? "#10b981" : "#3f3f46" }}>{accepted}</td>
                    <td className="px-2 py-2 text-zinc-300 truncate max-w-md" title={a.summary || ""}>{a.summary || <span className="italic text-zinc-600">(요약 없음)</span>}</td>
                    <td className="px-2 py-2 text-zinc-500 truncate max-w-[8rem]" title={a.displayName || a.uid}>{a.displayName || a.uid?.slice(0, 8) || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <div className="mt-2 text-[10px] text-zinc-600 text-center">
              상위 100건 표시 중 — 전체 {filtered.length}건은 JSONL 내보내기로 확인하세요
            </div>
          )}
        </div>
      </div>

      {loading && audits.length === 0 && (
        <div className="text-center text-zinc-500 text-[11px] py-4">데이터 불러오는 중…</div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, valueColor }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#141416] p-4 flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      <span className="text-2xl font-bold tabular-nums" style={{ color: valueColor || "#e4e4e7" }}>{value}</span>
      {sub && <span className="text-[10px] text-zinc-500">{sub}</span>}
    </div>
  );
}

// ─────────────── 게임 로고 관리 ───────────────
// BannerCodex 사이드바·PromotionArchive 헤더 등에서 공통 사용되는 게임별 로고를
// 한 곳에서 관리. 게임 이름은 banners + promotion-banners 두 컬렉션에서 자동 수집되며,
// 어느 쪽에도 아직 등록되지 않은 신규 게임은 텍스트 입력으로 추가 가능.
function GameLogosPanel() {
  const [logos, setLogos] = useState({});
  const [discoveredGames, setDiscoveredGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [newGameName, setNewGameName] = useState("");
  const [pendingGameName, setPendingGameName] = useState(null); // 업로드 중 상태 표시용
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const unsub = subscribeToGameLogos(
      (data) => { setLogos(data || {}); setIsLoading(false); },
      (e) => { setError(e?.message || "로고 로드 실패"); setIsLoading(false); },
    );
    return unsub;
  }, []);

  // 두 컬렉션에서 game 필드를 한 번 긁어와 distinct 목록 생성. 큰 컬렉션이라 realtime 까지는 불필요.
  useEffect(() => {
    (async () => {
      try {
        const games = new Set();
        const [bannersSnap, promoSnap] = await Promise.all([
          getDocs(collection(db, "artifacts", appId, "public", "data", "banners")),
          getDocs(collection(db, "artifacts", appId, "public", "data", "promotion-banners")),
        ]);
        bannersSnap.forEach(d => { const g = d.data()?.game; if (g) games.add(g); });
        promoSnap.forEach(d => { const g = d.data()?.game; if (g) games.add(g); });
        setDiscoveredGames(Array.from(games).sort());
      } catch (e) {
        console.warn("[GameLogosPanel] discover games failed", e);
      }
    })();
  }, []);

  const allGames = useMemo(() => {
    const set = new Set([...discoveredGames, ...Object.keys(logos || {})]);
    return Array.from(set).sort();
  }, [discoveredGames, logos]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 2500); };

  const handleUpload = async (gameName, file) => {
    if (!gameName || !file) return;
    setPendingGameName(gameName);
    try {
      const compressed = await compressLogoFile(file, 150, 0.9);
      if (!compressed) throw new Error("이미지 압축 실패");
      await saveGameLogo(gameName, compressed);
      flash(`${gameName} 로고가 업데이트되었습니다.`);
    } catch (e) {
      setError(e?.message || "로고 업로드 실패");
    } finally {
      setPendingGameName(null);
    }
  };

  const handleRemove = async (gameName) => {
    if (!gameName) return;
    if (!confirm(`${gameName} 로고를 삭제하시겠습니까?`)) return;
    try {
      await removeGameLogo(gameName);
      flash(`${gameName} 로고가 삭제되었습니다.`);
    } catch (e) {
      setError(e?.message || "로고 삭제 실패");
    }
  };

  const handleAddGame = () => {
    const name = newGameName.trim();
    if (!name) return;
    if (allGames.includes(name)) { flash(`'${name}' 은 이미 목록에 있습니다.`); return; }
    setDiscoveredGames(prev => Array.from(new Set([...prev, name])).sort());
    setNewGameName("");
    flash(`'${name}' 추가됨. 로고를 업로드하세요.`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" style={{ color: ACCENT }}/> 게임 로고 관리
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            BannerCodex 사이드바 · Brand Web Library 헤더 등에서 공통 사용됩니다.
            게임 목록은 등록된 배너에서 자동 추출되며, 신규 게임은 아래 입력란으로 추가하세요.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0"/> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newGameName}
          onChange={(e) => setNewGameName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddGame(); }}
          placeholder="새 게임 이름 (예: 리니지W)"
          className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-zinc-700 bg-[#141416] text-zinc-200 text-sm focus:outline-none focus:border-[#6C5CE7]"
        />
        <button
          onClick={handleAddGame}
          className="px-3 py-2 rounded-lg border border-zinc-700 bg-[#141416] text-zinc-300 text-xs font-bold hover:bg-white/5 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5"/> 게임 추가
        </button>
      </div>

      {isLoading ? (
        <div className="text-zinc-500 text-sm">로딩 중...</div>
      ) : allGames.length === 0 ? (
        <div className="text-zinc-500 text-sm py-8 text-center border border-dashed border-zinc-800 rounded-lg">
          등록된 게임이 없습니다. 위 입력란으로 추가하세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allGames.map((game) => {
            const hasLogo = !!logos[game];
            const isPending = pendingGameName === game;
            return (
              <div key={game} className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-[#141416]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                    {hasLogo
                      ? <img src={logos[game]} alt={game} className="w-full h-full object-cover"/>
                      : <span className="text-sm font-bold text-zinc-500">{game.substring(0, 1)}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-zinc-200 truncate">{game}</div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">
                      {hasLogo ? "로고 등록됨" : "로고 없음"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label
                    className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white ${isPending ? "opacity-50 pointer-events-none" : ""}`}
                    title="로고 업로드"
                  >
                    {isPending ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(game, f); e.target.value = ""; }}
                    />
                  </label>
                  {hasLogo && (
                    <button
                      onClick={() => handleRemove(game)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-red-500/20 text-red-500 hover:bg-red-500/10"
                      title="로고 삭제"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
      <GeminiGateSettings />

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
// ─── Gemini API 활성/비활성 ─────────────────────────────────────────
// settings/gemini 문서를 lib/gemini.js 의 subscribeGeminiGate 로 구독.
// 비활성화 시 window.fetch wrap 에 의해 모든 generativelanguage.googleapis.com
// 호출이 reject 됨 → 비용/quota 응급 차단 용도.
function GeminiGateSettings() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = subscribeGeminiGate((en, m) => {
      setEnabled(en);
      setMeta(m);
    });
    return () => unsub && unsub();
  }, []);

  const handleToggle = async () => {
    if (busy) return;
    const next = !enabled;
    if (!next && !confirm("Gemini API 호출을 차단합니다.\n프롬프트 최적화·AI 분석·이미지 렌더링 등 모든 Gemini 기능이 즉시 중단됩니다.\n\n계속할까요?")) return;
    setBusy(true); setError("");
    try {
      await setGeminiEnabled(next, user?.email || user?.displayName || "admin");
      // subscribeGeminiGate 가 곧 새 값으로 업데이트하므로 setEnabled 호출 불필요.
    } catch (e) {
      setError(e.message || "토글 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <SettingsSectionDivider title="Gemini API" subtitle="settings/gemini · 응급 차단용 전역 게이트" />
      <SettingRow
        name="Gemini API 활성화"
        description={
          <>
            비활성화하면 모든 사용자의 Gemini 호출(프롬프트 최적화, AI 분석, Imagen 렌더링 등)이 즉시 차단됩니다.
            <br/>
            quota 폭주·비용 의심 시 응급 차단 용도. 활성화 상태에서는 평상시 동작.
            {meta?.updatedAt && (
              <span className="block mt-1 text-zinc-600">
                마지막 변경: {formatTime(meta.updatedAt)}{meta.updatedBy ? ` · ${meta.updatedBy}` : ""}
              </span>
            )}
          </>
        }
        lastInGroup
        control={
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggle}
              disabled={busy}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                enabled ? "bg-emerald-500" : "bg-zinc-700"
              }`}
              title={enabled ? "비활성화" : "활성화"}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
            <span className={`flex items-center gap-1.5 text-[11px] font-bold ${enabled ? "text-emerald-400" : "text-rose-400"}`}>
              {enabled
                ? (<><Sparkles className="w-3.5 h-3.5"/> 활성</>)
                : (<><Power className="w-3.5 h-3.5"/> 차단됨</>)}
            </span>
            {busy && <RefreshCw className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
            {error && <span className="text-[10px] text-rose-400">{error}</span>}
          </div>
        }
      />
    </section>
  );
}

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

// ─────────────── AI 평가 프롬프트 ───────────────
// BannerCodex 가 분석 시 subscribeToPrompt 로 읽어가는 단일 Firestore 문서를 편집.
// 경로: artifacts/{appId}/public/data/settings/aiPrompt
// 프롬프트 내부의 {{EVALUATION_CRITERIA_LIST}} placeholder 는 활성 평가 기준이 자동으로 끼어들고,
// {{LEARNING_CONTEXT}} placeholder 는 사용자 피드백이 자동으로 끼어든다.
function PromptPanel() {
  const promptRef = doc(db, "artifacts", appId, "public", "data", "settings", "aiPrompt");
  const [text, setText] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(promptRef);
        const v = snap.exists() && typeof snap.data().text === "string" ? snap.data().text : "";
        if (!cancelled) { setText(v); setOriginal(v); }
      } catch (e) {
        if (!cancelled) setError(e.message || "로드 실패");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = text !== original;
  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await setDoc(promptRef, { text }, { merge: true });
      setOriginal(text);
      setSavedAt(Date.now());
    } catch (e) { setError(e.message || "저장 실패"); }
    finally { setSaving(false); }
  };
  const handleReset = () => {
    if (!confirm("프롬프트를 기본값으로 되돌리시겠습니까? (저장 버튼을 눌러야 실제 반영됩니다)")) return;
    setText(DEFAULT_AI_PROMPT);
  };
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(String(ev.target.result || ""));
    reader.onerror = () => setError("파일 읽기에 실패했습니다.");
    reader.readAsText(file);
    e.target.value = "";
  };
  const handleFileDownload = () => {
    if (!text) { setError("내보낼 프롬프트 내용이 없습니다."); return; }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai_prompt_backup_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminSection
      title="AI 평가 프롬프트"
      subtitle="BannerCodex AI 분석 시 사용되는 시스템 프롬프트 (Firestore settings/aiPrompt 단일 문서). {{EVALUATION_CRITERIA_LIST}} / {{LEARNING_CONTEXT}} 자동 치환."
    >
      {error && <ErrorBanner message={error}/>}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-zinc-300 border border-white/10 rounded-md hover:bg-white/5 cursor-pointer">
          <Upload size={11}/> .txt 불러오기
          <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload}/>
        </label>
        <button onClick={handleFileDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-zinc-300 border border-white/10 rounded-md hover:bg-white/5">
          <Download size={11}/> .txt 내보내기
        </button>
        <button onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-rose-300 border border-rose-500/30 rounded-md hover:bg-rose-500/10">
          <RotateCcw size={11}/> 기본값으로 초기화
        </button>
        <div className="flex-1"/>
        <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
          💡 <span className="font-mono font-bold">{"{{LEARNING_CONTEXT}}"}</span> · <span className="font-mono font-bold">{"{{EVALUATION_CRITERIA_LIST}}"}</span> placeholder 자동 치환
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
        spellCheck="false"
        className="w-full min-h-[60vh] p-4 rounded-lg text-[12px] font-mono leading-relaxed resize-y bg-black border border-zinc-800 text-zinc-300 outline-none focus:border-zinc-600 disabled:opacity-50"
      />

      <div className="flex items-center justify-end gap-3">
        {savedAt && !dirty && (
          <span className="text-[11px] text-emerald-400">저장됨 · {new Date(savedAt).toLocaleTimeString("ko-KR")}</span>
        )}
        <button onClick={() => setText(original)} disabled={!dirty || saving}
          className="px-4 py-2 rounded-md text-[12px] text-zinc-300 border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed">
          되돌리기
        </button>
        <button onClick={handleSave} disabled={!dirty || saving || loading}
          className="flex items-center gap-1.5 px-5 py-2 rounded-md text-[12px] font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: ACCENT }}>
          <Save size={12}/> {saving ? "저장 중..." : "클라우드에 저장"}
        </button>
      </div>
    </AdminSection>
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
