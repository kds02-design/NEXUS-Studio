import { useState, useEffect, useMemo } from "react";
import { X, FolderPlus, Sparkles, Loader2, Plus, Check } from "lucide-react";
import { inferGameFromImage } from "../services/gemini";

// BrandWebReview → Brand Web Library 발행 시 게임/연도 선택 모달.
// existingGames 는 Library 에 이미 있는 게임 카테고리 — 빠르게 선택 가능.
// onSubmit({ game, year }) — 사용자가 [등록] 클릭 시 호출.
export default function PublishModal({
  isOpen,
  onClose,
  project,
  thumbnailUrl,
  existingGames = [],
  onSubmit,
  isSubmitting = false,
}) {
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const ys = [];
    for (let y = currentYear; y >= currentYear - 8; y--) ys.push(String(y));
    return ys;
  }, [currentYear]);

  const [game, setGame] = useState("기타");
  const [customGame, setCustomGame] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [year, setYear] = useState(String(currentYear));

  const [inferring, setInferring] = useState(false);
  const [inference, setInference] = useState(null); // { game, confidence, note }
  const [inferError, setInferError] = useState("");

  // 모달 열릴 때 상태 초기화.
  useEffect(() => {
    if (!isOpen) return;
    setGame("기타");
    setCustomGame("");
    setIsAddingCustom(false);
    setYear(String(currentYear));
    setInference(null);
    setInferError("");
    setInferring(false);
  }, [isOpen, currentYear, project?.id]);

  if (!isOpen) return null;

  const handleInfer = async () => {
    if (!thumbnailUrl) { setInferError("분석할 이미지가 없습니다"); return; }
    setInferring(true); setInferError("");
    try {
      const result = await inferGameFromImage(thumbnailUrl, existingGames);
      setInference(result);
      // 기존 목록과 정확히 일치하면 select 로, 아니면 직접 입력 모드로.
      if (existingGames.includes(result.game)) {
        setGame(result.game);
        setIsAddingCustom(false);
      } else {
        setCustomGame(result.game);
        setIsAddingCustom(true);
      }
    } catch (e) {
      console.error("[PublishModal] infer failed", e);
      setInferError(e.message || String(e));
    } finally {
      setInferring(false);
    }
  };

  const finalGame = (isAddingCustom ? customGame : game).trim() || "기타";
  const canSubmit = !isSubmitting && !!finalGame && !!year;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({ game: finalGame, year });
  };

  const confidenceColor =
    inference?.confidence === "high" ? "#10b981"
    : inference?.confidence === "medium" ? "#FDCB6E"
    : "#71717a";
  const confidenceLabel =
    inference?.confidence === "high" ? "확신"
    : inference?.confidence === "medium" ? "보통"
    : "낮음";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181B] border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-4 h-4 text-[#C8A969]" />
            <h3 className="text-[13px] font-bold text-zinc-100">Brand Web Library 발행</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200" title="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* 프리뷰 + 프로젝트 정보 */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-zinc-800">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="thumb" className="w-16 h-16 object-cover rounded-md border border-zinc-800 bg-black shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-md border border-zinc-800 bg-black shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-zinc-100 truncate">{project?.name || "(이름 없음)"}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{project?.images?.length || 0}페이지 · 컨펌 완료</div>
            </div>
          </div>

          {/* AI 추천 */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleInfer}
              disabled={inferring || !thumbnailUrl}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-300 text-[11px] font-bold transition-colors hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {inferring ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI가 이미지 분석 중…</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> AI로 게임 추정</>
              )}
            </button>
            {inference && (
              <div className="px-3 py-2 rounded-md bg-violet-500/5 border border-violet-500/20 text-[10px] leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-zinc-100">AI 추정:</span>
                  <span className="text-violet-300 font-bold">{inference.game}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: `${confidenceColor}1A`, border: `1px solid ${confidenceColor}55`, color: confidenceColor }}
                  >
                    {confidenceLabel}
                  </span>
                </div>
                {inference.note && <div className="text-zinc-400">{inference.note}</div>}
              </div>
            )}
            {inferError && (
              <div className="px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/40 text-[10px] text-rose-300">
                {inferError}
              </div>
            )}
          </div>

          {/* 게임 선택 */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">게임</label>
            {!isAddingCustom ? (
              <div className="grid grid-cols-3 gap-1.5">
                {existingGames.slice(0, 8).map((g) => {
                  const active = game === g;
                  return (
                    <button
                      key={g}
                      onClick={() => { setGame(g); setIsAddingCustom(false); }}
                      className={`px-2.5 py-2 rounded-md text-[11px] font-bold border transition-colors truncate ${active ? "bg-[#C8A969]/15 border-[#C8A969]/50 text-[#C8A969]" : "bg-black/30 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600"}`}
                    >
                      {active && <Check className="w-3 h-3 inline mr-1" />}
                      {g}
                    </button>
                  );
                })}
                <button
                  onClick={() => { setIsAddingCustom(true); setCustomGame(""); }}
                  className="px-2.5 py-2 rounded-md text-[11px] font-bold border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-500 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 새 게임
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={customGame}
                  onChange={(e) => setCustomGame(e.target.value)}
                  placeholder="새 게임 이름 (예: 호연)"
                  className="flex-1 bg-black/40 border border-zinc-800 rounded-md px-3 py-2 text-[11px] text-zinc-100 outline-none focus:border-[#C8A969] placeholder:text-zinc-600"
                />
                <button
                  onClick={() => { setIsAddingCustom(false); setCustomGame(""); }}
                  className="px-3 py-2 rounded-md text-[10px] font-bold border border-zinc-700 text-zinc-400 hover:text-zinc-100"
                >
                  취소
                </button>
              </div>
            )}
          </div>

          {/* 연도 선택 */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">연도</label>
            <div className="flex gap-1.5 flex-wrap">
              {yearOptions.map((y) => {
                const active = year === y;
                return (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${active ? "bg-[#C8A969]/15 border-[#C8A969]/50 text-[#C8A969]" : "bg-black/30 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600"}`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-zinc-800 bg-black/20">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-[11px] font-bold border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-40"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-md text-[11px] font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black inline-flex items-center gap-1.5"
            style={{ background: "#C8A969" }}
          >
            {isSubmitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 등록 중…</>
            ) : (
              <><FolderPlus className="w-3.5 h-3.5" /> 발행</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
