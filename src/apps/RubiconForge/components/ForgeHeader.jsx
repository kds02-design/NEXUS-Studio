// 사이드바 상단 타이틀 + 뷰 전환 탭 (Component / Micro-Edit).
// 원본 index.jsx 의 사이드바 헤더 블록을 추출.

import { LayoutTemplate, Sparkles, Sun } from 'lucide-react';

export default function ForgeHeader({ currentView, setCurrentView }) {
  const tab = (id, Icon, label) => (
    <button
      onClick={() => setCurrentView(id)}
      className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-md text-[12px] font-bold transition-all ${currentView === id ? 'bg-[#2A2A2E] text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="px-4 py-5 border-b border-zinc-800/50 flex flex-col gap-4">
      <div className="flex bg-[#111111] p-1.5 rounded-lg border border-zinc-800/50 w-full shadow-inner gap-1">
        {tab('creation',   LayoutTemplate, '리스킨')}
        {tab('micro-edit', Sparkles,       '리디자인')}
        {tab('lightfx',    Sun,            '광원·빛효과')}
      </div>
    </div>
  );
}
