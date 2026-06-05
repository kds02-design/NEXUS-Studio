// 공통 템플릿(아틀라스 골격) 분석 + 저장 + 송신 모달.
//   - 상단: 저장된 마스터 템플릿 브라우저 (collapsible) — RubiconForge 로 송신 / 삭제
//   - 중단: 다중 선택한 N 개를 분석 (Gemini 2.5 Pro JSON 모드)
//   - 하단: 결과 4 섹션 + 마스터 명세 + 저장 폼 + Export (JSON / Markdown)
//
// 부모(index.jsx) 가 user + navigate 를 prop 으로 주입 — useAuth/useGlobal 의존성을
// 모달 안으로 끌어들이지 않아 PromotionArchive 외부에서 재사용 가능.

import { useEffect, useState } from "react";
import {
  X, Sparkles, Loader2, AlertTriangle, Download, FileText, ImagePlus, Layers,
  ChevronDown, Save, Trash2, Send, BookOpen,
} from "lucide-react";
import { analyzeTemplateGroup, prepareImageForAI } from "../../services/gemini";
import {
  saveMasterTemplate, subscribeMasterTemplates, deleteMasterTemplate, buildHandoffPayload,
} from "../../services/masterTemplates";

const MAX_IMAGES = 16;
const TARGET_IMAGE_WIDTH = 1024;

const TemplateAnalysisModal = ({ isOpen, onClose, selectedBanners, user, navigate }) => {
  const [status, setStatus] = useState("idle"); // idle | preparing | analyzing | done | error
  const [groupHint, setGroupHint] = useState(() => {
    const titles = (selectedBanners || []).map(b => b.title || "").filter(Boolean);
    return titles.length ? guessGroupLabel(titles) : "";
  });
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 저장 폼
  const [saveTitle, setSaveTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  // 저장된 마스터 — 실시간 구독
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [browserOpen, setBrowserOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = subscribeMasterTemplates(user.uid, setSavedTemplates);
    return () => unsub && unsub();
  }, [user?.uid]);

  const tooMany = (selectedBanners?.length || 0) > MAX_IMAGES;
  const tooFew = (selectedBanners?.length || 0) < 2;
  const canRun = !tooMany && !tooFew && (status === "idle" || status === "error");

  const handleRun = async () => {
    if (!canRun) return;
    setStatus("preparing");
    setErrorMsg("");
    setSaveOk(false);
    try {
      const sources = selectedBanners.map(b => b.full_image || b.preview || b.mobile_image).filter(Boolean);
      const base64Imgs = [];
      for (const src of sources) {
        try {
          const b64 = await prepareImageForAI(src, TARGET_IMAGE_WIDTH, 0.85);
          if (b64) base64Imgs.push(b64);
        } catch (e) {
          console.warn("[TemplateAnalysisModal] prepare failed", e);
        }
      }
      if (base64Imgs.length < 2) {
        throw new Error(`사용 가능한 이미지가 ${base64Imgs.length} 장뿐입니다 (최소 2 장 필요).`);
      }
      setStatus("analyzing");
      const res = await analyzeTemplateGroup(base64Imgs, { groupHint: groupHint.trim() || undefined });
      if (!res.ok) throw new Error(res.error || "분석 실패");
      setResult(res);
      // 저장 폼 기본 제목: 그룹힌트 + 그룹 요약 앞부분.
      setSaveTitle((groupHint || res.summary || "마스터 템플릿").slice(0, 80));
      setStatus("done");
    } catch (e) {
      console.error("[TemplateAnalysisModal] failed", e);
      setErrorMsg(e?.message || "알 수 없는 오류");
      setStatus("error");
    }
  };

  const handleSave = async () => {
    if (!user?.uid || !result || isSaving) return;
    setIsSaving(true);
    try {
      await saveMasterTemplate(user.uid, {
        title: saveTitle.trim() || "제목 없음",
        groupHint,
        ...result,
        sourceBannerIds: (selectedBanners || []).map(b => b.id),
        sourceCount: selectedBanners.length,
        sampleImageUrl:
          selectedBanners[0]?.full_image
          || selectedBanners[0]?.preview
          || selectedBanners[0]?.mobile_image
          || null,
      });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e) {
      console.error("[TemplateAnalysisModal] save failed", e);
      setErrorMsg(`저장 실패: ${e?.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleHandoff = (template) => {
    if (!navigate) return;
    const payload = buildHandoffPayload(template);
    navigate('rubicon-forge', payload);
    onClose();
  };

  const handleDeleteSaved = async (template) => {
    if (!user?.uid || !template?.id) return;
    if (!window.confirm(`"${template.title}" 마스터를 삭제할까요?`)) return;
    try {
      await deleteMasterTemplate(user.uid, template.id);
    } catch (e) {
      alert(`삭제 실패: ${e?.message || e}`);
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const payload = { groupHint, ...result, sourceCount: selectedBanners.length };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-analysis-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadMarkdown = () => {
    if (!result) return;
    const md = renderReportMarkdown(result, groupHint, selectedBanners.length);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-analysis-${Date.now()}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[92vh] bg-[#0F0F12] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-5 h-5 text-violet-400" />
            <h3 className="text-[14px] font-bold text-zinc-100 truncate">
              공통 템플릿 분석 — {selectedBanners?.length || 0} 건
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          {/* 저장된 마스터 브라우저 — collapsible */}
          <section className="rounded-lg border border-zinc-800 bg-[#0A0A0A]">
            <button
              onClick={() => setBrowserOpen(!browserOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-bold text-zinc-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                저장된 마스터 ({savedTemplates.length})
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${browserOpen ? 'rotate-180' : ''}`} />
            </button>
            {browserOpen && (
              <div className="border-t border-zinc-800 p-3 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {savedTemplates.length === 0 ? (
                  <div className="text-[11px] text-zinc-600 italic px-2 py-3">저장된 마스터가 없습니다 — 아래에서 분석한 결과를 저장하면 여기 나타납니다.</div>
                ) : savedTemplates.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-[#121214] border border-zinc-800/60 hover:border-zinc-700 transition-colors">
                    <div className="w-12 h-16 shrink-0 rounded overflow-hidden bg-black border border-zinc-900">
                      {t.sampleImageUrl ? (
                        <img src={t.sampleImageUrl} alt={t.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <ImagePlus className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-zinc-200 truncate">{t.title}</div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        {t.sourceCount || 0}건 · {t.fixedRegions?.length || 0} 영역 · {t.fixedCopy?.length || 0} 고정카피
                      </div>
                      {t.summary && (
                        <div className="text-[10px] text-zinc-600 truncate mt-0.5">{t.summary}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleHandoff(t)}
                      disabled={!navigate}
                      title="RubiconForge 디자인 시스템으로 보내기"
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-fuchsia-500/15 border border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/25 text-[10px] font-bold transition-colors disabled:opacity-40"
                    >
                      <Send className="w-3 h-3" />
                      Forge로
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(t)}
                      title="삭제"
                      className="shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 썸네일 그리드 */}
          <section>
            <div className="text-[11px] font-bold text-zinc-400 mb-2">선택된 페이지</div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-1 rounded-lg border border-zinc-800 bg-[#050507]">
              {(selectedBanners || []).map(b => (
                <div key={b.id} className="aspect-[3/4] rounded-md overflow-hidden bg-black border border-zinc-900">
                  {(b.full_image || b.preview || b.mobile_image) ? (
                    <img src={b.full_image || b.preview || b.mobile_image} alt={b.title || b.id} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <ImagePlus className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {tooMany && (
              <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {MAX_IMAGES} 장 이하로 선택해주세요 (현재 {selectedBanners.length} 장).
              </div>
            )}
            {tooFew && (
              <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> 2 장 이상이 필요합니다.
              </div>
            )}
          </section>

          <section>
            <div className="text-[11px] font-bold text-zinc-400 mb-2">
              그룹 컨텍스트 <span className="font-normal text-zinc-600">(선택 — 모델 정확도 향상)</span>
            </div>
            <input
              value={groupHint}
              onChange={e => setGroupHint(e.target.value)}
              placeholder="예: 블소 오늘의 상품 스페셜 월별 페이지"
              disabled={status === "preparing" || status === "analyzing"}
              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-200 outline-none focus:border-zinc-600 disabled:opacity-50"
            />
          </section>

          <section>
            <button
              onClick={handleRun}
              disabled={!canRun}
              className="w-full px-4 py-3 rounded-lg bg-violet-500 text-white hover:bg-violet-400 font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              {(status === "preparing" || status === "analyzing")
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Sparkles className="w-4 h-4" />}
              {status === "preparing" && "이미지 준비 중..."}
              {status === "analyzing" && "Gemini 분석 중 (최대 2 분)..."}
              {(status === "idle" || status === "done" || status === "error") && (status === "done" ? "다시 분석" : "분석 시작")}
            </button>
            {errorMsg && (
              <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {errorMsg}
              </div>
            )}
          </section>

          {status === "done" && result && (
            <section className="space-y-5 pt-2 border-t border-zinc-800">

              {result.summary && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3">
                  <div className="text-[11px] font-bold text-violet-300 mb-1">그룹 요약</div>
                  <div className="text-[12px] text-zinc-200 leading-relaxed break-keep-all">{result.summary}</div>
                </div>
              )}

              <ReportSection
                title="100% 공통 — 구조 영역"
                desc="모든 페이지에 같은 위치·크기·역할로 존재"
                items={result.fixedRegions}
                renderRow={(r, i) => (
                  <div key={i} className="rounded-md border border-zinc-800 bg-[#0A0A0A] px-3 py-2">
                    <div className="text-[12px] font-bold text-zinc-200">{r.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      위치: {r.position}{r.sizePercent ? ` · 크기: ${r.sizePercent}` : ''}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{r.role}</div>
                  </div>
                )}
              />

              <ReportSection
                title="100% 공통 — 고정 카피"
                desc="글자 그대로 동일하게 들어가는 텍스트"
                items={result.fixedCopy}
                renderRow={(c, i) => (
                  <div key={i} className="rounded-md border border-zinc-800 bg-[#0A0A0A] px-3 py-2 flex items-center gap-3">
                    <div className="text-[12px] font-mono text-emerald-300 truncate">{c.text}</div>
                    <div className="text-[10px] text-zinc-500 ml-auto shrink-0">{c.where}</div>
                  </div>
                )}
              />

              <ReportSection
                title="동적 데이터 슬롯"
                desc="자리·포맷은 같고 값만 매번 바뀜"
                items={result.dynamicPlaceholders}
                renderRow={(p, i) => (
                  <div key={i} className="rounded-md border border-zinc-800 bg-[#0A0A0A] px-3 py-2">
                    <div className="text-[12px] font-bold text-zinc-200">{p.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      위치: {p.where}{p.format ? ` · 포맷: ` : ''}
                      {p.format && <span className="font-mono text-amber-300">{p.format}</span>}
                    </div>
                  </div>
                )}
              />

              <ReportSection
                title="케이스별 가변 — 스킨 요소"
                desc="월·캠페인별로 바뀌는 디자인 변수"
                items={result.variableElements}
                renderRow={(v, i) => (
                  <div key={i} className="rounded-md border border-zinc-800 bg-[#0A0A0A] px-3 py-2">
                    <div className="text-[11px] font-bold text-fuchsia-300">{v.category}</div>
                    <div className="text-[11px] text-zinc-300 mt-1 leading-relaxed break-keep-all">{v.description}</div>
                  </div>
                )}
              />

              {result.masterTemplateSpec && (
                <div>
                  <div className="text-[12px] font-bold text-zinc-200 mb-1">마스터 템플릿 명세</div>
                  <div className="text-[10px] text-zinc-500 mb-2">디자이너가 이 명세만 보고 새 케이스를 만들 수 있도록 정리된 가이드</div>
                  <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed bg-[#050507] border border-zinc-800 rounded-md px-4 py-3 max-h-72 overflow-y-auto custom-scrollbar font-mono">{result.masterTemplateSpec}</pre>
                </div>
              )}

              {/* 저장 폼 */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 space-y-2">
                <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> 마스터로 저장
                </div>
                <div className="text-[10px] text-zinc-500 leading-relaxed break-keep-all">
                  저장하면 다음에 RubiconForge 디자인 시스템 탭으로 직접 보낼 수 있습니다. 위 "저장된 마스터" 섹션에 누적됩니다.
                </div>
                <div className="flex gap-2">
                  <input
                    value={saveTitle}
                    onChange={e => setSaveTitle(e.target.value)}
                    placeholder="마스터 제목"
                    disabled={isSaving}
                    className="flex-1 bg-[#0A0A0A] border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-200 outline-none focus:border-zinc-600 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !saveTitle.trim() || !user?.uid}
                    className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-900 font-bold text-[12px] flex items-center gap-1.5 transition-colors disabled:bg-zinc-700 disabled:text-zinc-500"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saveOk ? '저장됨' : '저장'}
                  </button>
                </div>
                {!user?.uid && (
                  <div className="text-[10px] text-amber-400">로그인 필요</div>
                )}
              </div>
            </section>
          )}
        </div>

        {status === "done" && result && (
          <div className="border-t border-zinc-800 px-6 py-3 flex items-center justify-end gap-2">
            <button
              onClick={downloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Markdown
            </button>
            <button
              onClick={downloadJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-violet-500 hover:bg-violet-400 text-white text-[11px] font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ReportSection = ({ title, desc, items, renderRow }) => {
  const empty = !items || items.length === 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[12px] font-bold text-zinc-200">{title}</div>
        <div className="text-[10px] text-zinc-500">{empty ? '항목 없음' : `${items.length}개`}</div>
      </div>
      <div className="text-[10px] text-zinc-500 mb-2">{desc}</div>
      {empty ? (
        <div className="text-[10px] text-zinc-600 px-3 py-2 rounded-md border border-zinc-800/50 bg-zinc-900/20 italic">분석에서 식별된 항목 없음</div>
      ) : (
        <div className="space-y-1.5">{items.map(renderRow)}</div>
      )}
    </div>
  );
};

function guessGroupLabel(titles) {
  const tokens = {};
  titles.forEach(t => {
    String(t).split(/[\s/\-_,()]+/).forEach(w => {
      if (w.length >= 2) tokens[w] = (tokens[w] || 0) + 1;
    });
  });
  const top = Object.entries(tokens)
    .filter(([, c]) => c >= Math.max(2, Math.floor(titles.length * 0.5)))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([w]) => w);
  return top.join(' ');
}

function renderReportMarkdown(r, groupHint, sourceCount) {
  const lines = [];
  lines.push(`# 공통 템플릿 분석`);
  lines.push('');
  lines.push(`- 분석 대상: ${sourceCount} 건`);
  if (groupHint) lines.push(`- 그룹 컨텍스트: ${groupHint}`);
  lines.push('');
  if (r.summary) { lines.push(`## 요약`); lines.push(r.summary); lines.push(''); }

  if (r.fixedRegions?.length) {
    lines.push(`## 공통 구조 영역`);
    r.fixedRegions.forEach(x => {
      lines.push(`- **${x.name}** — 위치: ${x.position}${x.sizePercent ? ` · 크기: ${x.sizePercent}` : ''}`);
      if (x.role) lines.push(`  - 역할: ${x.role}`);
    });
    lines.push('');
  }
  if (r.fixedCopy?.length) {
    lines.push(`## 고정 카피`);
    r.fixedCopy.forEach(x => lines.push(`- \`${x.text}\` — ${x.where}`));
    lines.push('');
  }
  if (r.dynamicPlaceholders?.length) {
    lines.push(`## 동적 데이터 슬롯`);
    r.dynamicPlaceholders.forEach(x => {
      lines.push(`- **${x.name}** — ${x.where}${x.format ? ` · 포맷: \`${x.format}\`` : ''}`);
    });
    lines.push('');
  }
  if (r.variableElements?.length) {
    lines.push(`## 가변 — 스킨 요소`);
    r.variableElements.forEach(x => lines.push(`- **${x.category}** — ${x.description}`));
    lines.push('');
  }
  if (r.masterTemplateSpec) {
    lines.push(`## 마스터 템플릿 명세`);
    lines.push(r.masterTemplateSpec);
  }
  return lines.join('\n');
}

export default TemplateAnalysisModal;
