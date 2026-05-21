import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search, ShieldCheck, AlertTriangle, AlertCircle, Info, Loader2,
  Sparkles, Copy, Check, Save, Send, X, ChevronRight, FileText, Inbox,
  History,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useGlobal } from "../../context/GlobalContext";
import { useUsageGate } from "../../components/UsageGate";
import {
  analyzePrompt, CONFLICT_TYPES, SEVERITY_META, PROMPT_MAX_LENGTH,
} from "./services/gemini";
import { saveAudit, updateAuditFinal, subscribeAudits } from "./services/firebase";

const APP_COLOR = "#A29BFE";

const SOURCE_LABELS = {
  "prompt-arc": "Prompt Arc",
  "typecore-sovereign": "Typecore Sovereign",
  "typecore-breeze": "Typecore Breeze",
  "render-metrics": "Render Matrix",
  "render-matrix-pop": "Render Matrix: Pop",
  "motion-metrics": "Motion Matrix",
};

export default function PromptAuditApp() {
  const { user } = useAuth();
  const { payload, clearPayload, navigate } = useGlobal();
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();

  const [input, setInput] = useState("");
  const [sourceApp, setSourceApp] = useState(null);
  const [sourceId, setSourceId] = useState(null);
  const [sourceMeta, setSourceMeta] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);          // 분석 결과 객체
  const [error, setError] = useState(null);

  const [auditId, setAuditId] = useState(null);        // Firestore doc id (저장 후)
  const [finalPrompt, setFinalPrompt] = useState("");  // 사용자가 채택해서 다듬은 본문
  const [acceptedFixes, setAcceptedFixes] = useState({}); // { conflictId: suggestionIndex }
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [toast, setToast] = useState("");

  // 분석 이력
  const [historyOpen, setHistoryOpen] = useState(false);
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    if (!user?.uid) { setAudits([]); return; }
    const unsub = subscribeAudits(user.uid, setAudits, 50);
    return () => unsub?.();
  }, [user?.uid]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }, []);

  // payload 수신 — 다른 앱에서 보낸 프롬프트 자동 입력.
  useEffect(() => {
    if (payload?.target === "prompt-audit" && payload?.prompt?.text) {
      setInput(payload.prompt.text);
      setSourceApp(payload.source || null);
      setSourceId(payload.params?.sourceId || null);
      setSourceMeta(payload.params?.sourceMeta || null);
      clearPayload?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  // 충돌 통계
  const stats = useMemo(() => {
    if (!result) return null;
    const by = { high: 0, med: 0, low: 0 };
    for (const c of result.conflicts) by[c.severity] = (by[c.severity] || 0) + 1;
    return by;
  }, [result]);

  // ─── 액션 핸들러 ──────────────────────────────────────────
  const runAnalyze = async () => {
    setError(null);
    const text = input.trim();
    if (!text) { setError("프롬프트를 입력하세요."); return; }
    if (!user?.uid) { setError("로그인이 필요합니다."); return; }
    const canGen = await ensureCanGenerate("analysis");
    if (canGen === false) { setError("이번 주 크레딧이 부족합니다."); return; }

    setIsAnalyzing(true);
    setResult(null); setAuditId(null);
    setAcceptedFixes({});
    try {
      const r = await analyzePrompt({ prompt: text, sourceApp, sourceMeta });
      setResult(r);
      setFinalPrompt(r.improvedPrompt || text);
      // 자동 저장 — 분석 즉시 audits 컬렉션에 기록 (사용자 채택은 이후 갱신)
      try {
        const id = await saveAudit({
          user,
          sourcePrompt: text,
          result: r,
          sourceApp, sourceId,
        });
        setAuditId(id);
      } catch (e) {
        console.warn("[PromptAudit] save failed (silent)", e?.message);
      }
    } catch (e) {
      console.error("[PromptAudit] analyze failed", e);
      setError(e?.message || String(e));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 특정 충돌에 제안 채택/해제
  const toggleAccept = (conflictId, sugIdx) => {
    setAcceptedFixes(prev => {
      const cur = prev[conflictId];
      if (cur === sugIdx) {
        const { [conflictId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [conflictId]: sugIdx };
    });
  };

  // improvedPrompt 를 기반으로 사용자 채택 옵션을 반영한 최종 프롬프트 빌드 (간단 치환).
  // — Gemini improvedPrompt 가 이미 충돌 해소본이므로, 사용자가 다른 옵션 선택 시 evidence 를 rewrite 로 치환.
  const buildFinalFromAcceptances = useCallback(() => {
    if (!result) return finalPrompt;
    let base = result.improvedPrompt || input;
    for (const c of result.conflicts) {
      const idx = acceptedFixes[c.id];
      if (idx == null) continue;
      const sug = c.suggestions?.[idx];
      if (!sug?.rewrite) continue;
      if (c.evidence && base.includes(c.evidence)) {
        base = base.replaceAll(c.evidence, sug.rewrite);
      } else if (!base.includes(sug.rewrite)) {
        base = `${base.trim()}\n${sug.rewrite}`;
      }
    }
    return base;
  }, [result, acceptedFixes, finalPrompt, input]);

  useEffect(() => {
    if (!result) return;
    setFinalPrompt(buildFinalFromAcceptances());
  }, [acceptedFixes, result, buildFinalFromAcceptances]);

  const onCopyFinal = async () => {
    try {
      await navigator.clipboard.writeText(finalPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch { showToast("복사 실패"); }
  };

  const onPersistFinal = async () => {
    if (!auditId || !user?.uid) { showToast("저장할 세션이 없습니다"); return; }
    setIsSaving(true);
    try {
      const accepted = Object.entries(acceptedFixes).map(([cid, idx]) => {
        const c = result.conflicts.find(x => x.id === cid);
        const sug = c?.suggestions?.[idx];
        return { conflictId: cid, suggestionLabel: sug?.label || "", rewrite: sug?.rewrite || "" };
      });
      await updateAuditFinal(user, auditId, { finalPrompt, acceptedFixes: accepted });
      showToast("✓ 채택본 저장됨 (엔진 학습 데이터에 반영)");
    } catch (e) {
      console.error("[PromptAudit] persist failed", e);
      showToast(`저장 실패: ${e?.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onSendBack = (targetApp) => {
    if (!finalPrompt) return;
    navigate?.(targetApp, {
      source: "prompt-audit", target: targetApp,
      prompt: { text: finalPrompt, tags: ["audited"], style: "" },
      image: { url: "", metadata: {} },
      params: { auditId },
      timestamp: Date.now(),
    });
  };

  const reset = () => {
    setInput(""); setResult(null); setError(null);
    setAuditId(null); setAcceptedFixes({}); setFinalPrompt("");
    setSourceApp(null); setSourceId(null); setSourceMeta(null);
  };

  // 이력 항목 클릭 → 결과 패널 + 채택 상태까지 복원.
  const loadAudit = (a) => {
    if (!a) return;
    setInput(a.sourcePrompt || "");
    setSourceApp(a.sourceApp || null);
    setSourceId(a.sourceId || null);
    setSourceMeta(null);
    setResult({
      summary: a.summary || "",
      score: a.score || 0,
      conflicts: Array.isArray(a.conflicts) ? a.conflicts : [],
      globalSuggestions: Array.isArray(a.globalSuggestions) ? a.globalSuggestions : [],
      improvedPrompt: a.improvedPrompt || a.sourcePrompt || "",
    });
    setFinalPrompt(a.finalPrompt || a.improvedPrompt || a.sourcePrompt || "");
    setAuditId(a.id || null);
    // 채택된 옵션 복원 — conflictId → suggestionIndex 매핑.
    const accepted = {};
    if (Array.isArray(a.acceptedFixes)) {
      for (const f of a.acceptedFixes) {
        const cf = (a.conflicts || []).find(c => c.id === f.conflictId);
        const idx = cf?.suggestions?.findIndex(s => s.rewrite === f.rewrite);
        if (idx != null && idx >= 0) accepted[f.conflictId] = idx;
      }
    }
    setAcceptedFixes(accepted);
    setError(null);
    setHistoryOpen(false);
  };

  // 날짜 포맷 — 최근은 상대시간, 오래되면 yyyy-mm-dd.
  const formatWhen = (ts) => {
    if (!ts) return "";
    const ms = ts.seconds ? ts.seconds * 1000 : (ts.toMillis ? ts.toMillis() : Number(ts));
    if (!ms) return "";
    const diff = Date.now() - ms;
    if (diff < 60_000) return "방금";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}시간 전`;
    if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}일 전`;
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  // ─── 렌더 ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 p-5 font-sans overflow-hidden">
      {usageModal}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] px-5 py-2 rounded-full bg-emerald-500/90 text-white text-[12px] font-bold shadow-lg backdrop-blur-md border border-emerald-400/50">
          {toast}
        </div>
      )}

      <main className="flex-1 flex gap-5 overflow-hidden min-h-0">
        {/* 좌측 — 입력 */}
        <div className="flex-1 min-w-0 bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden relative">
          <div className="px-6 py-4 border-b border-zinc-800 bg-[#121214] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setHistoryOpen(true)}
                title={`내 분석 이력 (${audits.length}건)`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[10px] font-semibold transition-colors">
                <History className="w-3.5 h-3.5" />
                이력 {audits.length > 0 && <span className="text-zinc-500">{audits.length}</span>}
              </button>
              <div className="flex items-center gap-2 min-w-0" style={{ color: APP_COLOR }}>
                <FileText className="w-4 h-4 shrink-0" />
                <h2 className="text-[11px] font-black uppercase tracking-widest truncate">최적화 대상 프롬프트</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {sourceApp && (
                <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-semibold flex items-center gap-1">
                  <Inbox className="w-3 h-3" /> {SOURCE_LABELS[sourceApp] || sourceApp}
                </span>
              )}
              {(input || result) && (
                <button onClick={reset} title="초기화"
                  className="p-1.5 rounded-md border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 이력 슬라이드 패널 — 좌측에서 들어옴. 입력 패널 위에만 덮어씌움. */}
          {historyOpen && (
            <>
              <div
                onClick={() => setHistoryOpen(false)}
                className="absolute inset-0 bg-black/40 z-10 animate-in fade-in" />
              <div className="absolute top-0 left-0 bottom-0 w-full max-w-[420px] bg-[#18181B] border-r border-zinc-800 z-20 flex flex-col shadow-2xl animate-in slide-in-from-left">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#121214]">
                  <div className="flex items-center gap-2" style={{ color: APP_COLOR }}>
                    <History className="w-4 h-4" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">내 분석 이력</h3>
                    <span className="text-[10px] text-zinc-500">{audits.length}건</span>
                  </div>
                  <button onClick={() => setHistoryOpen(false)} title="닫기"
                    className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
                  {audits.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2 text-center py-12">
                      <History className="w-10 h-10 opacity-30" />
                      <p className="text-[12px] font-semibold">아직 분석 이력이 없습니다</p>
                      <p className="text-[10px] text-zinc-500">감사 시작 시 자동으로 저장됩니다</p>
                    </div>
                  ) : (
                    audits.map((a) => {
                      const isActive = a.id === auditId;
                      const scoreColor = (a.score || 0) >= 80 ? "#10b981" : (a.score || 0) >= 60 ? "#f59e0b" : "#ef4444";
                      const sourceLabel = SOURCE_LABELS[a.sourceApp] || a.sourceApp || "직접 입력";
                      const conflictCount = Array.isArray(a.conflicts) ? a.conflicts.length : 0;
                      const acceptedCount = Array.isArray(a.acceptedFixes) ? a.acceptedFixes.length : 0;
                      const preview = (a.sourcePrompt || "").slice(0, 80).replace(/\s+/g, " ").trim();
                      return (
                        <button
                          key={a.id}
                          onClick={() => loadAudit(a)}
                          className={`text-left rounded-lg border p-3 transition-colors ${isActive ? "border-[#A29BFE]/60 bg-[#A29BFE]/10" : "border-zinc-800 bg-black/20 hover:border-zinc-600 hover:bg-zinc-900/40"}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] font-bold text-zinc-300 truncate">{sourceLabel}</span>
                              {acceptedCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  채택 {acceptedCount}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-bold" style={{ color: scoreColor }}>{a.score ?? 0}</span>
                              <span className="text-[9px] text-zinc-500">{formatWhen(a.createdAt)}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                            {preview || <span className="italic text-zinc-600">(빈 프롬프트)</span>}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[9px] text-zinc-500">
                            <span>충돌 {conflictCount}</span>
                            <span>·</span>
                            <span className="truncate">{(a.summary || "").slice(0, 60)}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
          <div className="flex-1 flex flex-col p-6 gap-3 overflow-hidden min-h-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, PROMPT_MAX_LENGTH))}
              maxLength={PROMPT_MAX_LENGTH}
              placeholder={`여기에 프롬프트를 붙여넣거나, Typecore / Render / Motion / PromptArc 에서 [최적화] 버튼으로 보내세요. (최대 ${PROMPT_MAX_LENGTH.toLocaleString()}자)`}
              className="flex-1 min-h-0 w-full p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 text-[13px] font-mono leading-[1.7] text-zinc-200 outline-none focus:border-zinc-600 resize-none custom-scrollbar"
            />
            <div className="shrink-0 flex items-center justify-between gap-3">
              <span className={`text-[10px] ${input.length >= PROMPT_MAX_LENGTH ? "text-rose-400" : input.length >= PROMPT_MAX_LENGTH * 0.9 ? "text-amber-400" : "text-zinc-500"}`}>
                {input.length.toLocaleString()} / {PROMPT_MAX_LENGTH.toLocaleString()}자 · 분석 1c 차감
              </span>
              <button
                onClick={runAnalyze}
                disabled={isAnalyzing || !input.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 whitespace-nowrap text-black disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: APP_COLOR }}
              >
                {isAnalyzing
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 분석 중…</>
                  : <><Search className="w-3.5 h-3.5" /> 최적화 시작</>}
              </button>
            </div>
            {error && (
              <div className="shrink-0 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-[11px] text-rose-300/90 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="leading-snug break-words">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* 우측 — 분석 결과 */}
        <div className="flex-1 min-w-0 bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-[#121214] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2" style={{ color: APP_COLOR }}>
              <ShieldCheck className="w-4 h-4" />
              <h2 className="text-[11px] font-black uppercase tracking-widest">최적화 결과</h2>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">점수</span>
                <span className="text-[14px] font-bold" style={{ color: result.score >= 80 ? "#10b981" : result.score >= 60 ? "#f59e0b" : "#ef4444" }}>{result.score}</span>
                <span className="text-[10px] text-zinc-500">/ 100</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col p-6 gap-3 overflow-y-auto custom-scrollbar min-h-0">
            {!result && !isAnalyzing && (
              <div className="flex-1 min-h-0 rounded-xl border border-dashed border-zinc-800 bg-black/20 flex flex-col items-center justify-center text-zinc-600 gap-2 px-6 text-center">
                <ShieldCheck className="w-10 h-10 opacity-30" />
                <p className="text-[12px] font-semibold leading-relaxed">
                  좌측에서 프롬프트를 입력하고 [최적화 시작] 을 누르세요.
                </p>
              </div>
            )}
            {isAnalyzing && (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-zinc-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: APP_COLOR }} />
                <p className="text-[12px] font-semibold">충돌 패턴 추출 중…</p>
              </div>
            )}
            {result && (
              <>
                {/* 총평 + 통계 */}
                <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-[12px] text-zinc-200 leading-relaxed">{result.summary}</p>
                  {stats && (
                    <div className="mt-3 flex items-center gap-2">
                      <SeverityChip count={stats.high} sev="high" />
                      <SeverityChip count={stats.med} sev="med" />
                      <SeverityChip count={stats.low} sev="low" />
                      <span className="text-[10px] text-zinc-500 ml-auto">충돌 {result.conflicts.length}건</span>
                    </div>
                  )}
                </div>

                {/* 전역 권고 */}
                {result.globalSuggestions?.length > 0 && (
                  <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-zinc-400">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">전역 권고</span>
                    </div>
                    <ul className="space-y-1">
                      {result.globalSuggestions.map((s, i) => (
                        <li key={i} className="text-[11px] text-zinc-300 leading-snug flex gap-1.5">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-zinc-600" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 충돌 목록 */}
                {result.conflicts.map((c) => (
                  <ConflictCard
                    key={c.id}
                    conflict={c}
                    selectedIdx={acceptedFixes[c.id]}
                    onToggle={(idx) => toggleAccept(c.id, idx)}
                  />
                ))}

                {/* 최종 채택 영역 */}
                <div className="shrink-0 rounded-xl border bg-zinc-900/60 p-4 flex flex-col gap-3" style={{ borderColor: `${APP_COLOR}55` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5" style={{ color: APP_COLOR }}>
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">최종 채택본</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{Object.keys(acceptedFixes).length}건 채택</span>
                  </div>
                  <textarea
                    value={finalPrompt}
                    onChange={(e) => setFinalPrompt(e.target.value)}
                    rows={6}
                    className="w-full p-3 rounded-lg border border-zinc-800 bg-black/40 text-[12px] font-mono leading-[1.6] text-zinc-200 outline-none focus:border-zinc-600 resize-y custom-scrollbar"
                  />
                  <div className="flex items-center flex-wrap gap-2">
                    <button onClick={onCopyFinal}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${isCopied ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10" : "border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"}`}>
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopied ? "복사됨" : "복사"}
                    </button>
                    <button onClick={onPersistFinal} disabled={isSaving || !auditId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      채택본 저장
                    </button>
                    {/* 보내기 — 원본 앱이 있으면 그 앱으로 우선 */}
                    {sourceApp && SOURCE_LABELS[sourceApp] && (
                      <button onClick={() => onSendBack(sourceApp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[11px] font-semibold transition-colors"
                        style={{ borderColor: `${APP_COLOR}55`, color: APP_COLOR }}>
                        <Send className="w-3.5 h-3.5" />
                        {SOURCE_LABELS[sourceApp]}로 보내기
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.2); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.5); }
      `}</style>
    </div>
  );
}

function SeverityChip({ count, sev }) {
  const meta = SEVERITY_META[sev];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
      style={{ borderColor: `${meta.color}55`, background: `${meta.color}14`, color: meta.color }}>
      {sev === "high" && <AlertCircle className="w-3 h-3" />}
      {sev === "med" && <AlertTriangle className="w-3 h-3" />}
      {sev === "low" && <Info className="w-3 h-3" />}
      {meta.label} {count}
    </span>
  );
}

function ConflictCard({ conflict, selectedIdx, onToggle }) {
  const typeMeta = CONFLICT_TYPES[conflict.type] || CONFLICT_TYPES.VAGUE_DIRECTION;
  const sevMeta = SEVERITY_META[conflict.severity] || SEVERITY_META.med;
  return (
    <div className="shrink-0 rounded-xl border bg-zinc-900/40 p-4 flex flex-col gap-3"
      style={{ borderColor: `${sevMeta.color}33` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap"
            style={{ borderColor: `${typeMeta.color}55`, background: `${typeMeta.color}14`, color: typeMeta.color }}>
            {typeMeta.label}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap"
            style={{ background: `${sevMeta.color}14`, color: sevMeta.color }}>
            {sevMeta.label}
          </span>
          <span className="text-[12px] font-bold text-zinc-200 truncate">{conflict.title}</span>
        </div>
      </div>
      {conflict.evidence && (
        <div className="rounded-md bg-black/30 border border-zinc-800 px-3 py-2 font-mono text-[11px] text-zinc-300 leading-relaxed break-words">
          “{conflict.evidence}”
        </div>
      )}
      {conflict.explanation && (
        <p className="text-[11px] text-zinc-400 leading-relaxed">{conflict.explanation}</p>
      )}
      {conflict.suggestions?.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">대안 선택</span>
          {conflict.suggestions.map((s, i) => {
            const active = selectedIdx === i;
            return (
              <button key={i} onClick={() => onToggle(i)}
                className={`text-left rounded-md border p-2.5 transition-colors ${active ? "border-emerald-500/60 bg-emerald-500/10" : "border-zinc-800 bg-black/20 hover:border-zinc-600"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${active ? "border-emerald-500 bg-emerald-500" : "border-zinc-700"}`}>
                    {active && <Check className="w-2 h-2 text-black" />}
                  </span>
                  <span className={`text-[11px] font-bold ${active ? "text-emerald-300" : "text-zinc-300"}`}>{s.label}</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 leading-snug pl-5 break-words">{s.rewrite}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
