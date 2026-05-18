// 사이드바 상단 타이틀 + 뷰 전환 탭 (Component / Micro-Edit).
// 원본 index.jsx 의 사이드바 헤더 블록을 추출.

import { LayoutTemplate, Edit2 } from 'lucide-react';

export default function ForgeHeader({ currentView, setCurrentView }) {
  return (
    <div className="px-6 py-6 border-b border-zinc-800/50 flex flex-col gap-4">
      <div className="flex bg-[#111111] p-1.5 rounded-lg border border-zinc-800/50 w-full shadow-inner">
        <button onClick={() => setCurrentView('creation')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md text-[13px] font-bold transition-all ${currentView === 'creation' ? 'bg-[#2A2A2E] text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
           <LayoutTemplate className="w-4 h-4" /> Component
        </button>
        <button onClick={() => setCurrentView('micro-edit')} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md text-[13px] font-bold transition-all ${currentView === 'micro-edit' ? 'bg-[#2A2A2E] text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>
           <Edit2 className="w-4 h-4" /> Micro-Edit
        </button>
      </div>
    </div>
  );
}
