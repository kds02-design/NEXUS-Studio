// RubiconForge 엔트리포인트. 비지니스 로직은 useForgePrompt / usePresets 훅에 위임하고
// 여기서는 컴포넌트 컴포지션 + 글로벌 에러 토스트만 담당.
import { AlertCircle, X } from 'lucide-react';
import { useForgePrompt } from './hooks/useForgePrompt';
import { usePresets } from './hooks/usePresets';
import ForgeSidebar from './components/ForgeSidebar';
import ForgeResultPanel from './components/ForgeResultPanel';

export default function App() {
  const forge = useForgePrompt();
  usePresets(); // 추후 named-preset 도입 대비 자리만 확보 (현재는 no-op)

  return (
    <div className={`flex flex-col h-screen ${forge.theme === 'dark' ? 'bg-[#030304] text-zinc-100' : 'bg-white text-zinc-900'} overflow-hidden relative`} style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 2px; height: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.1); border-radius: 10px; transition: background 0.3s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.3); }
      `}</style>

      {forge.errorMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-red-500/95 text-white px-6 py-3 rounded-md font-bold text-[12px] shadow-[0_10px_30px_rgba(239,68,68,0.3)] z-[1000] flex items-center gap-3 animate-in slide-in-from-top-4">
            <AlertCircle className="w-4 h-4" />
            {forge.errorMsg}
            <button onClick={() => forge.setErrorMsg(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full transition-colors"><X className="w-3 h-3" /></button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        <ForgeSidebar forge={forge} />
        <ForgeResultPanel forge={forge} />
      </main>
    </div>
  );
}
