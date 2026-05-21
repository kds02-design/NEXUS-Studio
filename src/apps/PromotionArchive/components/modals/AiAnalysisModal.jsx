// 브랜드웹 라이브러리 전체 분석 모달.
// 단일 분석(`onAnalyze`)과 동일하게 실제 Gemini(analyzeWebDesign)를 호출하고
// Firestore(promo-banners)에 저장. 동시 3개 + 취소 + 분석된 항목 건너뛰기 지원.
import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Cpu, CheckCircle2, Loader2, AlertTriangle, SkipForward } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db as firestore, appId } from "../../../../lib/firebase";
// 일괄 분석은 의도적으로 공용 키(GEMINI_API_KEY) 사용. brandweb dedicated 키는 단일 분석에만.
// → analyzeWebDesign 호출 시 { apiKey: SHARED_GEMINI_KEY } 로 명시 override.
import { GEMINI_API_KEY as SHARED_GEMINI_KEY } from "../../../../lib/gemini";
import { analyzeWebDesign, prepareImageForAI } from "../../services/gemini";

const CONCURRENCY = 3;
const promoDocRef = (id) => doc(firestore, "artifacts", appId, "public", "data", "promotion-banners", id);

const AiAnalysisModal = ({ isOpen, onClose, selectedIds, onComplete }) => {
  const [status, setStatus] = useState("idle"); // idle | processing | complete | cancelled
  const [skipExisting, setSkipExisting] = useState(true);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [eta, setEta] = useState(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setStatus("idle"); setProgress(0); setLogs([]);
      setSuccessCount(0); setErrorCount(0); setSkippedCount(0);
      setEta(null); cancelRef.current = false;
    }
  }, [isOpen]);

  const addLog = (msg) => setLogs(prev => [...prev.slice(-19), msg]);

  // 한 항목 처리. 성공/실패/스킵 카운터를 직접 증가시키고 절대 throw 하지 않음 (배치 중단 방지).
  const processOne = async (id) => {
    let banner = null;
    try {
      const snap = await getDoc(promoDocRef(id));
      if (!snap.exists()) {
        addLog(`스킵 (문서 없음): ${id}`);
        setSkippedCount(c => c + 1);
        return;
      }
      banner = { id, ...snap.data() };

      if (skipExisting && banner.isWebAnalyzed) {
        addLog(`스킵 (분석됨): ${banner.title || id}`);
        setSkippedCount(c => c + 1);
        return;
      }

      // 평가 이미지 — 브랜드웹은 메인(+서브) 1~2장, 그 외는 PC+Mobile 2장.
      const imgSources = (() => {
        if (banner.assetType === '브랜드웹') {
          const pages = Array.isArray(banner.pages) ? banner.pages : [];
          const findUrl = (id) => (id ? pages.find(p => p?.id === id)?.url : null);
          const main = findUrl(banner.mainPageId) || banner.full_image || pages.find(p => p?.device === 'pc')?.url || banner.preview;
          const sub = findUrl(banner.subPageId) || (banner.mainPageId ? null : (banner.mobile_image || pages.find(p => p?.device === 'mobile')?.url));
          return [main, sub && sub !== main ? sub : null].filter(Boolean);
        }
        return [banner.full_image || banner.preview, banner.mobile_image].filter(Boolean);
      })();
      if (imgSources.length === 0) {
        addLog(`이미지 없음: ${banner.title || id}`);
        setErrorCount(c => c + 1);
        return;
      }

      const imagesBase64 = await Promise.all(
        imgSources.map(src => prepareImageForAI(src).catch(err => {
          console.warn("[BulkAnalyze] image prep failed:", err);
          return null;
        }))
      );
      const validImages = imagesBase64.filter(Boolean);
      if (validImages.length === 0) {
        addLog(`이미지 변환 실패: ${banner.title || id}`);
        setErrorCount(c => c + 1);
        return;
      }

      const result = await analyzeWebDesign(validImages, banner.webUserComment || "", { apiKey: SHARED_GEMINI_KEY });
      if (!result.ok) {
        addLog(`AI 실패: ${banner.title || id} — ${result.error}`);
        setErrorCount(c => c + 1);
        return;
      }

      const patch = {
        webScores: result.webScores,
        webAiScore: result.webAiScore,
        isWebAnalyzed: true,
        webAnalyzedAt: new Date().toISOString(),
        webManualScoreAdj: 0,
      };
      if (result.title) patch.title = result.title;
      if (result.year) patch.year = result.year;
      if (result.month) patch.month = result.month;
      if (result.fullDate) patch.webDateText = result.fullDate;
      if (result.tags?.length > 0) {
        patch.tags = [...new Set([...(banner.tags || []), ...result.tags])];
      }
      if (result.summary) patch.webSummary = result.summary;

      await updateDoc(promoDocRef(id), patch);
      addLog(`완료: ${banner.title || id} (${result.webAiScore})`);
      setSuccessCount(c => c + 1);
    } catch (e) {
      console.error("[BulkAnalyze]", e);
      addLog(`에러: ${banner?.title || id} — ${e.message}`);
      setErrorCount(c => c + 1);
    }
  };

  const startAnalysis = async () => {
    setStatus("processing");
    cancelRef.current = false;
    const startTime = Date.now();
    const total = selectedIds.length;
    let processed = 0;

    // 동시 CONCURRENCY 개 청크로 처리. Promise.allSettled 로 한 항목 실패 시에도 다음 청크 진행.
    for (let i = 0; i < selectedIds.length; i += CONCURRENCY) {
      if (cancelRef.current) break;
      const chunk = selectedIds.slice(i, i + CONCURRENCY);
      await Promise.allSettled(chunk.map(id => processOne(id)));
      processed += chunk.length;
      setProgress((processed / total) * 100);

      const elapsed = (Date.now() - startTime) / 1000;
      const avg = elapsed / Math.max(1, processed);
      const remaining = Math.max(0, Math.round(avg * (total - processed)));
      setEta(remaining);
    }

    if (cancelRef.current) {
      addLog("취소되었습니다.");
      setStatus("cancelled");
    } else {
      addLog("전체 분석 완료.");
      setStatus("complete");
    }
  };

  const cancelAnalysis = () => {
    cancelRef.current = true;
    addLog("취소 요청 — 진행 중인 항목이 끝나면 정지합니다...");
  };

  if (!isOpen) return null;

  const fmtEta = (s) => {
    if (s == null || s < 0) return "-";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}분 ${sec}초` : `${sec}초`;
  };

  const estimatedMinutes = Math.max(1, Math.ceil(selectedIds.length * 12 / CONCURRENCY / 60));
  const canClose = status === "idle" || status === "complete" || status === "cancelled";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#18181b] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* 헤더 */}
        <div className="p-6 pb-4 flex justify-between items-start border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" /> AI 전체 분석
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {selectedIds.length}개 항목을 Gemini 2.5 Flash로 분석합니다.
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
              일괄 분석은 공용 API 키 사용 (VITE_GEMINI_API_KEY)
            </p>
          </div>
          {canClose && (
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          )}
        </div>

        {/* 컨텐츠 */}
        <div className="p-6 space-y-5">

          {status === "idle" && (
            <>
              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Cpu className="w-7 h-7 text-violet-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-zinc-300 font-medium">분석을 시작할까요?</p>
                  <p className="text-xs text-zinc-500">
                    동시 {CONCURRENCY}개 처리 · 약 {estimatedMinutes}분 예상
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 cursor-pointer hover:bg-zinc-800 transition-colors">
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={e => setSkipExisting(e.target.checked)}
                  className="w-4 h-4 accent-violet-500"
                />
                <SkipForward size={14} className="text-zinc-400" />
                <span className="text-sm text-zinc-300 flex-1">이미 분석된 항목 건너뛰기</span>
                <span className="text-[10px] text-zinc-500 font-mono">isWebAnalyzed</span>
              </label>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>분석 중에는 페이지를 닫지 마세요. 중간에 멈추려면 "분석 취소" 버튼을 누르세요. 진행 중인 항목은 끝나면 정지합니다.</span>
              </div>
            </>
          )}

          {(status === "processing" || status === "complete" || status === "cancelled") && (
            <div className="space-y-4">
              {/* 진행률 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className={
                    status === "complete" ? "text-emerald-400"
                    : status === "cancelled" ? "text-amber-400"
                    : "text-violet-400"
                  }>
                    {status === "complete" ? "분석 완료"
                      : status === "cancelled" ? "취소됨"
                      : "AI 처리 중..."}
                  </span>
                  <span className="text-zinc-400">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      status === "complete" ? "bg-emerald-500"
                      : status === "cancelled" ? "bg-amber-500"
                      : "bg-violet-500"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* 카운터 */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-emerald-400 font-bold text-base">{successCount}</div>
                  <div className="text-[10px] text-emerald-400/70 mt-0.5">성공</div>
                </div>
                <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                  <div className="text-rose-400 font-bold text-base">{errorCount}</div>
                  <div className="text-[10px] text-rose-400/70 mt-0.5">실패</div>
                </div>
                <div className="p-2 rounded bg-zinc-500/10 border border-zinc-500/20">
                  <div className="text-zinc-400 font-bold text-base">{skippedCount}</div>
                  <div className="text-[10px] text-zinc-400/70 mt-0.5">스킵</div>
                </div>
                <div className="p-2 rounded bg-violet-500/10 border border-violet-500/20">
                  <div className="text-violet-400 font-bold text-sm leading-snug pt-0.5">{fmtEta(eta)}</div>
                  <div className="text-[10px] text-violet-400/70 mt-0.5">남은 시간</div>
                </div>
              </div>

              {/* 로그 */}
              <div className="bg-black/50 border border-zinc-800 rounded-lg p-3 h-40 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-hide">
                {logs.map((log, i) => (
                  <div key={i} className="text-zinc-400 border-l-2 border-violet-500/30 pl-2">
                    <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))}
                {status === "processing" && (
                  <div className="flex items-center gap-2 text-violet-400 animate-pulse">
                    <Loader2 size={10} className="animate-spin" /> Processing...
                  </div>
                )}
                {status === "complete" && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={10} /> 전체 작업 완료.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-2">
          {status === "idle" ? (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                취소
              </button>
              <button
                onClick={startAnalysis}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
              >
                <Sparkles size={16} /> 분석 시작
              </button>
            </>
          ) : status === "processing" ? (
            <button
              onClick={cancelAnalysis}
              className="w-full px-4 py-2 rounded-lg text-sm font-bold bg-rose-600/80 hover:bg-rose-600 text-white transition-all flex items-center justify-center gap-2"
            >
              <X size={16} /> 분석 취소
            </button>
          ) : (
            <button
              onClick={() => { onComplete?.(); onClose(); }}
              className={`w-full px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition-all ${
                status === "complete"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiAnalysisModal;
