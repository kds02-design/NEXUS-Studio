import { Layers, Edit3, X, Sparkles, Trash2, Wrench } from 'lucide-react';

// 하단 중앙 floating bar.
// - 다중 선택 시(selectedCount > 0): 메인 액션 그룹(담기/속성/선택 취소/AI/삭제) 표시.
// - 관리자 모드 시(onNormalizePaths 전달 시): 우측에 admin 액션 그룹 추가 ("경로 정규화").
// - 두 그룹은 selection 여부와 독립적이라 admin 작업만 따로 노출 가능.
const FloatingActionBar = ({
    selectedCount,
    onAddToCollection,
    onEditProperties,
    onDeselectAll,
    onAiAnalysis,
    onDelete,
    // admin 액션 (선택사항)
    onNormalizePaths,
    isNormalizing,
}) => {
    const hasSelection = selectedCount > 0;
    const hasAdminActions = !!onNormalizePaths;
    if (!hasSelection && !hasAdminActions) return null;

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
            <div className="flex items-center gap-1.5 bg-[#202024] border border-white/10 p-1.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">

                {hasSelection && (
                    <>
                        {/* 1. 카운터 뱃지 */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#18181b]">
                            <span className="text-emerald-400 font-black text-sm">{selectedCount}</span>
                        </div>

                        {/* 2. 메인 액션 그룹 (담기, 속성, 선택 취소) */}
                        <div className="flex items-center bg-[#27272a]/50 rounded-xl px-1 border border-white/5">
                            <button onClick={onAddToCollection} className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <Layers size={14} />
                                <span>담기</span>
                            </button>
                            <div className="w-[1px] h-3 bg-white/10 mx-1" />
                            <button onClick={onEditProperties} className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <Edit3 size={14} />
                                <span>속성</span>
                            </button>
                            <div className="w-[1px] h-3 bg-white/10 mx-1" />
                            <button onClick={onDeselectAll} className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <X size={14} />
                                <span>선택 취소</span>
                            </button>
                        </div>

                        {/* 3. AI 분석 버튼 */}
                        <button onClick={onAiAnalysis} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-xl transition-all">
                            <Sparkles size={14} />
                            <span>AI 분석</span>
                        </button>

                        <div className="w-[1px] h-4 bg-white/10 mx-1" />

                        {/* 4. 삭제 버튼 */}
                        <button onClick={onDelete} className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </>
                )}

                {/* Admin 액션 그룹 — selection 과 독립적으로 항상 표시 */}
                {hasAdminActions && (
                    <>
                        {hasSelection && <div className="w-[1px] h-4 bg-white/10 mx-1" />}
                        <button
                            onClick={onNormalizePaths}
                            disabled={isNormalizing}
                            title="모든 path 를 \\ppc-file\{게임폴더}\{연도}\... 형식으로 일괄 정규화"
                            className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 rounded-xl transition-all disabled:opacity-50"
                        >
                            <Wrench size={14} />
                            <span>{isNormalizing ? '정규화 중…' : '경로 정규화'}</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default FloatingActionBar;
