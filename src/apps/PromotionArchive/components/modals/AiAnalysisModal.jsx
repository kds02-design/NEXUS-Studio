import { useState, useEffect } from 'react';
import { X, Sparkles, Cpu, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../../lib/dexie';

const AiAnalysisModal = ({ isOpen, onClose, selectedIds, onComplete }) => {
  const [status, setStatus] = useState('idle'); // idle, processing, complete
  const [progress, setProgress] = useState(0);
  const [_currentProcessingItem, setCurrentProcessingItem] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setProgress(0);
      setLogs([]);
    }
  }, [isOpen]);

  const addLog = (msg) => setLogs(prev => [...prev.slice(-4), msg]);

  const startAnalysis = async () => {
    setStatus('processing');
    const total = selectedIds.length;
    let completed = 0;

    for (const id of selectedIds) {
      try {
        const banner = await db.banners.get(id);
        if (!banner) continue;

        setCurrentProcessingItem(banner.title);
        addLog(`Analyzing image features for "${banner.title}"...`);
        
        // ✨ [Simulation] 실제 AI 분석 대기 시간 시뮬레이션 (1~2초)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // ✨ [Mock Data] 가상의 AI 분석 결과 생성
        // 실제 API 연동 시 이 부분을 fetch/axios 로직으로 대체하면 됩니다.
        const mockScore = (Math.random() * (9.8 - 7.0) + 7.0).toFixed(1); // 7.0 ~ 9.8 랜덤 점수
        const mockTags = ['High Contrast', 'Minimalism', 'Dark Theme', 'Action'];
        const randomTags = mockTags.sort(() => 0.5 - Math.random()).slice(0, 2); // 랜덤 태그 2개
        const newTags = [...new Set([...(banner.tags || []), ...randomTags])];

        // DB 업데이트
        await db.banners.update(id, {
            designScore: Number(mockScore),
            aiSummary: 'AI analysis completed. High readability and strong visual hierarchy detected.',
            tags: newTags,
            isAnalyzed: true
        });

        addLog(`Score: ${mockScore} / Updated tags.`);
        
        completed++;
        setProgress((completed / total) * 100);

      } catch (error) {
        console.error("Analysis failed", error);
        addLog(`Error processing ${id}`);
      }
    }

    setStatus('complete');
    setTimeout(() => {
        onComplete(); // 부모 컴포넌트에 완료 알림 (선택 해제 등)
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#18181b] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* 헤더 */}
        <div className="p-6 pb-4 flex justify-between items-start border-b border-zinc-800">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    AI Design Analysis
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                    {selectedIds.length}개의 프로모션 이미지를 분석합니다.
                </p>
            </div>
            {status !== 'processing' && (
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            )}
        </div>

        {/* 컨텐츠 영역 */}
        <div className="p-6 space-y-6">
            
            {status === 'idle' && (
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                        <Cpu className="w-8 h-8 text-violet-400" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-zinc-300 font-medium">분석을 시작할까요?</p>
                        <p className="text-xs text-zinc-500">디자인 점수 측정, 태그 자동 생성, 스타일 분석이 수행됩니다.</p>
                    </div>
                </div>
            )}

            {(status === 'processing' || status === 'complete') && (
                <div className="space-y-4">
                    {/* 진행률 바 */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                            <span className={status === 'complete' ? 'text-emerald-400' : 'text-violet-400'}>
                                {status === 'complete' ? '분석 완료' : 'AI 처리 중...'}
                            </span>
                            <span className="text-zinc-400">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ${status === 'complete' ? 'bg-emerald-500' : 'bg-violet-500'}`} 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* 로그 창 */}
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-hide">
                        {logs.map((log, i) => (
                            <div key={i} className="text-zinc-400 border-l-2 border-violet-500/30 pl-2">
                                <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span> {log}
                            </div>
                        ))}
                        {status === 'processing' && (
                            <div className="flex items-center gap-2 text-violet-400 animate-pulse">
                                <Loader2 size={10} className="animate-spin" /> Processing...
                            </div>
                        )}
                        {status === 'complete' && (
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 size={10} /> All tasks completed successfully.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-2">
            {status === 'idle' ? (
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
            ) : status === 'complete' ? (
                <button 
                    onClick={onClose}
                    className="w-full px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all"
                >
                    확인
                </button>
            ) : (
                <button disabled className="w-full px-4 py-2 rounded-lg text-sm font-bold bg-zinc-800 text-zinc-500 cursor-not-allowed flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> 분석 중입니다...
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default AiAnalysisModal;