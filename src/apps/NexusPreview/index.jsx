// NEXUS Preview — 프로모션 KV 워크스페이스.
// 목적 ① Figma 에서 조립될 키비주얼을 미리 구성해 컬러 시스템·분위기를 먼저 확인하고,
//      ② 레이어 + 피그마 변수 컬러 문서를 내보내 피그마 플러그인이 한 번에 불러오게 한다.
// 구조: 목록 페이지(타이틀 + 영역 세그먼트 탭 + 월별 카드 그리드 — 루비콘 포지 톤 딥 다크)
//       → 카드 클릭 시 워크스페이스(목록에서 고른 영역 전용 — 전환 탭 없음, 뱃지 표시).
// 저장은 문서(목록 항목) 갱신 방식 — 썸네일·수정일이 목록에 바로 반영된다.
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, X, LayoutGrid, Monitor } from "lucide-react";
import { useGlobal, useTheme } from "../../context/GlobalContext";
import { useAuth } from "../../context/AuthContext";
import { APP_MAP } from "../../config/apps";
import KvComposer from "./components/KvComposer";
import {
  ensureSeedPromotions, subscribeToPromotions, createPromotion, updatePromotion, deletePromotion,
} from "./services/promotions";

const ACCENT = APP_MAP["nexus-preview"]?.color || "#22B8CF";

const TOP_TABS = [
  { key: "promo", label: "프로모션", icon: LayoutGrid, desc: "프로모션 페이지 KV 를 조립하고 컬러 시스템을 추출해 피그마로 내보내세요." },
  { key: "brandweb", label: "브랜드웹", icon: Monitor, desc: "1920×1080 브랜드웹 히어로 — 전체 배경 / 중앙 캐릭터 / 좌우 캐릭터 구성을 미리 확인하세요." },
];
// KV 편집(독립 이미지 도구)은 RubiconForge '키비주얼 편집' 탭으로 이동. 여기는 KV 스튜디오 전용.

const toDate = (ts) => (ts?.toDate ? ts.toDate() : null);
const monthKey = (p) => {
  const d = toDate(p.updatedAt) || toDate(p.createdAt);
  return d ? `${d.getFullYear()}년 ${d.getMonth() + 1}월` : "날짜 미정";
};
const fmtDate = (p) => {
  const d = toDate(p.updatedAt) || toDate(p.createdAt);
  return d ? d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) + " 수정" : "";
};

export default function NexusPreview() {
  const GT = useTheme();
  // 루비콘 포지 톤 — 딥 다크 zinc 팔레트 고정 (장시간 사용에 눈이 편한 저대비 다크).
  // 글로벌 토큰 위에 표면/보더만 오버라이드 — 하위(KvComposer/QualityEnhancer)는 T prop 으로 상속.
  const T = useMemo(() => ({
    ...GT,
    bg: "#0a0a0c", surface: "#101013", card: "#141417",
    border: "#27272a", text: "#f4f4f5", textMuted: "#a1a1aa", textDim: "#6b6b74",
  }), [GT]);
  const { payload } = useGlobal();
  const { user } = useAuth();

  const [topTab, setTopTab] = useState("promo");
  const [promotions, setPromotions] = useState(null); // null = 로딩 중
  const [activeId, setActiveId] = useState(null);     // null = 목록 페이지
  const [bwPage, setBwPage] = useState("main"); // 브랜드웹 페이지: main | sub | sub2
  const [form, setForm] = useState(null); // null | { mode:"create" } | { mode:"edit", promo }
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  // 프로모션 목록 구독 + 최초 1회 시드
  useEffect(() => {
    ensureSeedPromotions();
    const unsub = subscribeToPromotions(
      (list) => setPromotions(list),
      (e) => { console.warn("[NexusPreview] promotions subscribe failed", e); setPromotions([]); },
    );
    return () => { try { unsub && unsub(); } catch { /* noop */ } };
  }, []);

  const active = promotions?.find((p) => p.id === activeId) || null;
  // 문서의 소속 영역 — 워크스페이스 구성/세션/썸네일은 항상 문서 자신의 area 를 따른다.
  const areaOf = (p) => p?.area || "promo";
  const docArea = active ? areaOf(active) : topTab;
  const tabDef = TOP_TABS.find((t) => t.key === (active ? docArea : topTab)) || TOP_TABS[0];
  // 브랜드웹은 페이지(메인/서브/서브2) 단위로 세션이 분리 — KvComposer 에 넘길 실제 area.
  const BW_PAGES = [{ key: "main", label: "메인" }, { key: "sub", label: "서브" }, { key: "sub2", label: "서브2" }];
  const composerArea = docArea === "brandweb" ? (bwPage === "main" ? "brandweb" : `brandweb-${bwPage}`) : docArea;

  // 다른 앱에서 이미지 payload 수신 → 스튜디오 + 프로모션 탭으로. 열린 문서가 없으면 최신 프로모션 문서를 연다.
  useEffect(() => {
    if (!payload || payload.target !== "nexus-preview" || !payload.timestamp) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTopTab("promo");
    if (!activeId) {
      const first = promotions?.find((p) => areaOf(p) === "promo");
      if (first) setActiveId(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  // 목록 — 현재 탭 영역의 문서만, 최근 수정순 정렬 후 월별 그룹
  const grouped = useMemo(() => {
    if (!promotions) return null;
    const sorted = promotions.filter((p) => (p.area || "promo") === topTab).sort((a, b) => {
      const da = toDate(a.updatedAt) || toDate(a.createdAt), dbb = toDate(b.updatedAt) || toDate(b.createdAt);
      return (dbb?.getTime() || 0) - (da?.getTime() || 0);
    });
    const groups = [];
    for (const p of sorted) {
      const key = monthKey(p);
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) { g = { key, items: [] }; groups.push(g); }
      g.items.push(p);
    }
    return groups;
  }, [promotions, topTab]);

  const handleFormSubmit = async ({ game, name }) => {
    if (!user?.uid) { showToast("로그인이 필요합니다.", "error"); return; }
    try {
      if (form?.mode === "edit") {
        await updatePromotion(form.promo.id, { name, game });
        showToast(`'${name}' 수정됨`);
      } else {
        const id = await createPromotion(name, game, topTab); // 현재 탭 영역 소속으로 생성
        showToast(`'${name}' 생성됨`);
        setActiveId(id); // 새 문서는 바로 워크스페이스로
      }
      setForm(null);
    } catch (e) { showToast(`저장 실패: ${e.message || e}`, "error"); }
  };

  const handleDelete = async (p) => {
    if (!confirm(`'${p.name}' 문서를 삭제할까요?\n(팀 전체에서 사라집니다 — 저장된 세션 포함)`)) return;
    try {
      await deletePromotion(p.id);
      if (activeId === p.id) setActiveId(null);
      showToast(`'${p.name}' 삭제됨`);
    } catch (e) { showToast(`삭제 실패: ${e.message || e}`, "error"); }
  };

  const thumbOf = (p) => (areaOf(p) === "brandweb" ? p.brandwebThumbnailUrl : p.thumbnailUrl) || null;

  // 세그먼트 탭 (루비콘 포지 스타일 — 활성: zinc-800 표면 + zinc-600 보더)
  const segTab = (on) => ({
    display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 7,
    border: `1px solid ${on ? "#52525b" : "transparent"}`, cursor: "pointer",
    fontSize: 11.5, fontWeight: on ? 800 : 600,
    background: on ? "#27272a" : "transparent", color: on ? "#fff" : T.textDim,
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", background: T.bg, color: T.text,
      fontFamily: "'Noto Sans KR', sans-serif", overflow: "hidden",
    }}>
      {/* ── 워크스페이스 상단 바 — 영역은 목록에서 이미 선택됨(뱃지로만 표시) ── */}
      {active && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 24px", flexShrink: 0, borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <button onClick={() => setActiveId(null)} title="목록으로"
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, color: T.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            <ArrowLeft size={13} /> 목록
          </button>
          {/* 현재 영역 뱃지 — 목록에서 고른 영역에 최적화된 구성만 표시 */}
          <span style={{ padding: "5px 11px", borderRadius: 6, background: `${ACCENT}14`, border: `1px solid ${ACCENT}44`, color: ACCENT, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", flexShrink: 0 }}>{tabDef.label}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {active.game && <span style={{ color: T.textDim, fontWeight: 600, marginRight: 6 }}>{active.game}</span>}{active.name}
          </span>
          {/* 브랜드웹 페이지 탭 — 메인/서브/서브2 (페이지별 독립 세션) */}
          {docArea === "brandweb" && (
            <div style={{ display: "flex", gap: 2, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 2, marginLeft: 6 }}>
              {BW_PAGES.map((pg) => {
                const on = bwPage === pg.key;
                return (
                  <button key={pg.key} onClick={() => setBwPage(pg.key)} style={{
                    padding: "5px 12px", borderRadius: 6, border: `1px solid ${on ? "#52525b" : "transparent"}`,
                    background: on ? "#27272a" : "transparent", color: on ? "#fff" : T.textDim,
                    fontSize: 10.5, fontWeight: on ? 800 : 600, cursor: "pointer",
                  }}>{pg.label}</button>
                );
              })}
            </div>
          )}
          <div style={{ flex: 1 }} />
        </div>
      )}

      {/* ── 본문: 목록 페이지 / 워크스페이스 ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: active ? "hidden" : "auto" }}>
        {!active ? (
          /* ── 목록 페이지 — 히어로 타이틀 + pill 탭 + 월별 카드 그리드 ── */
          <div style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 32px 48px" }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.01em", color: T.text, margin: 0 }}>{tabDef.label}</h1>
            <p style={{ fontSize: 11.5, color: T.textDim, margin: "7px 0 22px", lineHeight: 1.6 }}>{tabDef.desc}</p>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 2, background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3 }}>
                {TOP_TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.key} onClick={() => setTopTab(t.key)} style={segTab(topTab === t.key)}>
                      <Icon size={13} /> {t.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setForm({ mode: "create" })} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8,
                border: "none", background: ACCENT, color: "#062125", fontSize: 11.5, fontWeight: 800, cursor: "pointer",
              }}><Plus size={14} /> 새로 만들기</button>
            </div>

            {grouped === null ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "80px 0", color: T.textMuted, fontSize: 12 }}>
                <Loader2 size={16} className="animate-spin" /> 불러오는 중…
              </div>
            ) : grouped.length === 0 ? (
              <div style={{ padding: "100px 0", textAlign: "center", color: T.textDim }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.textMuted, marginBottom: 8 }}>아직 문서가 없습니다</div>
                <div style={{ fontSize: 12 }}>우측 상단 <b style={{ color: T.textMuted }}>새로 만들기</b> 로 첫 프로모션을 시작하세요.</div>
              </div>
            ) : grouped.map((g) => (
              <div key={g.key} style={{ marginBottom: 30 }}>
                {/* 달 구분 헤더 */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted }}>{g.key}</span>
                  <span style={{ fontSize: 10, color: T.textDim }}>{g.items.length}건</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                  {g.items.map((p) => (
                    <div key={p.id} onClick={() => setActiveId(p.id)} style={{
                      borderRadius: 10, border: `1px solid ${T.border}`, background: T.card,
                      overflow: "hidden", cursor: "pointer",
                    }}>
                      {/* 썸네일 (영역별 — 프로모션/브랜드웹) */}
                      <div style={{ height: 124, background: "#0c0c12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {thumbOf(p)
                          ? <img src={thumbOf(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 10.5, color: T.textDim }}>저장된 시안 없음</span>}
                      </div>
                      <div style={{ padding: "11px 14px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          {/* 게임 구분 뱃지 */}
                          {p.game && <span style={{ fontSize: 9.5, fontWeight: 800, color: ACCENT, background: `${ACCENT}14`, border: `1px solid ${ACCENT}33`, borderRadius: 5, padding: "1.5px 7px", flexShrink: 0 }}>{p.game}</span>}
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                          <span style={{ fontSize: 10, color: T.textDim }}>{fmtDate(p)}</span>
                          <div style={{ flex: 1 }} />
                          <button title="게임/이름 수정" onClick={(e) => { e.stopPropagation(); setForm({ mode: "edit", promo: p }); }}
                            style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Pencil size={12} /></button>
                          <button title="삭제" onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                            style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "transparent", color: "#fda4af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // key 로 문서·페이지 전환 시 컴포저 상태 완전 리셋 → 영역(페이지)×문서별 독립 세션
          <KvComposer key={`${composerArea}:${active.id}`} T={T} accent={ACCENT} promotion={active} area={composerArea} />
        )}
      </div>

      {/* 새로 만들기 / 수정 모달 — 게임명 + 프로모션명 */}
      {form && (
        <PromoFormModal
          T={T}
          initial={form.mode === "edit" ? form.promo : null}
          onClose={() => setForm(null)}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          padding: "10px 18px", borderRadius: 999, zIndex: 10000,
          background: toast.type === "error" ? "rgba(244,63,94,0.95)" : "rgba(118,206,224,0.95)",
          ...(toast.type !== "error" ? { color: "#062125" } : {}),
          color: "#fff", fontSize: 11, fontWeight: 700,
          boxShadow: "0 12px 28px rgba(0,0,0,0.4)", pointerEvents: "none",
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

/* ── 새 문서/수정 모달 — 게임명 · 프로모션명 입력 ── */
function PromoFormModal({ T, initial, onClose, onSubmit }) {
  const [game, setGame] = useState(initial?.game || "");
  const [name, setName] = useState(initial?.name || "");
  const canSubmit = name.trim().length > 0;
  const submit = () => { if (canSubmit) onSubmit({ game: game.trim(), name: name.trim() }); };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 380, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: T.text }}>{initial ? "문서 정보 수정" : "새 프로모션 문서"}</div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: T.textMuted, cursor: "pointer" }}><X size={15} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, letterSpacing: "0.05em" }}>게임명</span>
            <input value={game} onChange={(e) => setGame(e.target.value)} placeholder="예) 리니지, 블레이드&소울"
              style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 12.5, outline: "none" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, letterSpacing: "0.05em" }}>프로모션명 *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 새로고침 제련석" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 12.5, outline: "none" }} />
          </label>
          <button onClick={submit} disabled={!canSubmit} style={{
            marginTop: 4, padding: "11px", borderRadius: 8, border: 0,
            background: canSubmit ? "#76CEE0" : T.card, color: canSubmit ? "#062125" : T.textDim,
            fontSize: 12, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed",
          }}>{initial ? "수정" : "만들기"}</button>
        </div>
      </div>
    </div>
  );
}
