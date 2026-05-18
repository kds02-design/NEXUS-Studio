import { Loader2 } from 'lucide-react';

const ProcessingModal = ({ isOpen, message, progress }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#18181b] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
                    <Loader2 className="relative w-12 h-12 text-cyan-400 animate-spin" />
                </div>
                
                <h3 className="text-lg font-black text-white mb-2 tracking-tight">데이터 처리 중</h3>
                <p className="text-[13px] text-zinc-400 mb-6 break-all min-h-[40px] flex items-center justify-center">{message}</p>

                {/* ✨ 진행률(Progress Bar) UI */}
                {progress && progress.total > 0 && (
                    <div className="w-full">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[20px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                {progress.percentage}%
                            </span>
                            <span className="text-[11px] font-bold text-zinc-500 bg-black/30 px-2 py-1 rounded-md">
                                {progress.current} / {progress.total}
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-black rounded-full overflow-hidden border border-white/5 shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out relative"
                                style={{ width: `${progress.percentage}%` }}
                            >
                                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProcessingModal;