/* eslint-disable */
// v1 전용 좌측 네비게이션 사이드바.
import React from 'react';
import { Menu, PenTool, Edit3, ShieldCheck } from 'lucide-react';

const LeftNav = ({ isSidebarOpen, setIsSidebarOpen, currentView, setCurrentView, version, setVersion, versions }) => {
    return (
        <aside className={`${isSidebarOpen ? 'w-[240px]' : 'w-[72px]'} shrink-0 border bg-[#1A1A1A]/50 backdrop-blur-xl border-zinc-800/60 rounded-[10px] flex flex-col transition-all duration-300 z-[200] overflow-hidden shadow-2xl`}>
            <div className="h-[72px] flex items-center px-5 justify-end border-b border-zinc-800/50 shrink-0">
                {!isSidebarOpen && (
                    <Menu className="w-5 h-5 mx-auto text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={() => setIsSidebarOpen(true)} />
                )}
            </div>
            <div className="p-4 shrink-0 space-y-3">
                {/* 버전 셀렉터는 사용자 요청으로 숨김 (모든 버전 공통). */}
                <div className="flex bg-[#121212] rounded-[10px] p-1 border border-zinc-800/60 shadow-inner">
                    <button onClick={() => setCurrentView('editor')} className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-[10px] flex items-center justify-center gap-1.5 transition-all duration-200 whitespace-nowrap ${currentView === 'editor' ? 'bg-[#2A2A2E] text-white shadow-sm border border-zinc-600/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1C1C1C] border border-transparent'}`}>
                        <PenTool className="w-3.5 h-3.5 shrink-0" /> {isSidebarOpen && <span>Creation</span>}
                    </button>
                    <button onClick={() => setCurrentView('edit')} className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-[10px] flex items-center justify-center gap-1.5 transition-all duration-200 whitespace-nowrap ${currentView === 'edit' ? 'bg-[#2A2A2E] text-white shadow-sm border border-zinc-600/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1C1C1C] border border-transparent'}`}>
                        <Edit3 className="w-3.5 h-3.5 shrink-0" /> {isSidebarOpen && <span>Micro-Edit</span>}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar mt-auto">
                <div className={`flex items-center w-full px-4 py-3 rounded-[10px] justify-start gap-3 bg-[#121212] border border-zinc-800/50 text-[#a6a6a6] cursor-default`} title="현재 코어 & RPG 특화 모드로 작동 중입니다.">
                    <ShieldCheck className="w-4 h-4 shrink-0 opacity-60" /> {isSidebarOpen && <span className="text-[11px] font-medium tracking-wide opacity-80">RPG 특화 엔진</span>}
                </div>
            </div>
        </aside>
    );
};

export default LeftNav;
