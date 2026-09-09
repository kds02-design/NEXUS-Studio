import { PenTool, Edit3, Smile, Feather, Clapperboard } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';

export default function BreezeSidebar() {
  const {
    isSidebarOpen, setIsSidebarOpen,
    currentView, setCurrentView, setBaseLangView, enterMicroEdit,
    selectedCategory, handleCategoryChange,
  } = useBreeze();

  // 사이드바 토글은 빈 공간 클릭 — 햄버거 버튼 없음 (BannerCodex / PromptArc 컨벤션).
  const handleSidebarClick = (e) => {
    if (e.target === e.currentTarget) setIsSidebarOpen((v) => !v);
  };

  return (
    <aside
      onClick={handleSidebarClick}
      title={isSidebarOpen ? '빈 공간 클릭으로 접기' : '빈 공간 클릭으로 펼치기'}
      className={`${isSidebarOpen ? 'w-[200px]' : 'w-[64px]'} border-r bg-[#111111] border-zinc-800/80 flex flex-col transition-all duration-300 shrink-0 z-[200] cursor-pointer`}
    >
      <div className="p-4" onClick={handleSidebarClick}>
        <div className={`flex rounded-md p-1 bg-[#1A1A1A] border border-zinc-800 relative ${isSidebarOpen ? '' : 'flex-col gap-1'}`}>
          {/* 슬라이딩 인디케이터는 가로 배치 전용 — 접힌(세로) 상태에서는 버튼 자체 배경으로 표시. */}
          {isSidebarOpen && (
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-all duration-300 ${currentView === 'editor' ? 'left-1 bg-[#2C2C2C]' : 'left-[calc(50%+2px)] bg-[#2C2C2C]'}`}></div>
          )}
          <button onClick={() => { setCurrentView('editor'); setBaseLangView('ko'); }} title="새로 만들기" className={`flex-1 py-1.5 text-[10px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 ${currentView === 'editor' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'} ${!isSidebarOpen && currentView === 'editor' ? 'bg-[#2C2C2C]' : ''}`}><PenTool className="w-3.5 h-3.5" /> {isSidebarOpen && '새로 만들기'}</button>
          <button onClick={enterMicroEdit} title="부분 수정" className={`flex-1 py-1.5 text-[10px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 ${currentView === 'edit' ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'} ${!isSidebarOpen && currentView === 'edit' ? 'bg-[#2C2C2C]' : ''}`}><Edit3 className="w-3.5 h-3.5" /> {isSidebarOpen && '부분 수정'}</button>
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto py-2 space-y-2 custom-scrollbar ${isSidebarOpen ? 'px-4' : 'px-2'}`} onClick={handleSidebarClick}>
        {isSidebarOpen && <div className="text-[10px] font-bold text-zinc-600 mb-3 px-1 pointer-events-none">글자 종류</div>}
        <button onClick={() => handleCategoryChange('casual')} title="캐주얼·팝" className={`flex items-center w-full py-2.5 rounded-md gap-3 transition-all ${isSidebarOpen ? 'px-3 justify-start' : 'px-0 justify-center'} ${selectedCategory === 'casual' ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
          <Smile className={`w-4 h-4 shrink-0 ${selectedCategory === 'casual' ? 'text-zinc-300' : ''}`} /> {isSidebarOpen && <span className="text-[12px]">캐주얼·팝</span>}
        </button>
        <button onClick={() => handleCategoryChange('calli')} title="붓글씨" className={`flex items-center w-full py-2.5 rounded-md gap-3 transition-all ${isSidebarOpen ? 'px-3 justify-start' : 'px-0 justify-center'} ${selectedCategory === 'calli' ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
          <Feather className={`w-4 h-4 shrink-0 ${selectedCategory === 'calli' ? 'text-zinc-300' : ''}`} /> {isSidebarOpen && <span className="text-[12px]">붓글씨</span>}
        </button>
        <button onClick={() => handleCategoryChange('story')} title="드라마·영화" className={`flex items-center w-full py-2.5 rounded-md gap-3 transition-all ${isSidebarOpen ? 'px-3 justify-start' : 'px-0 justify-center'} ${selectedCategory === 'story' ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
          <Clapperboard className={`w-4 h-4 shrink-0 ${selectedCategory === 'story' ? 'text-zinc-300' : ''}`} /> {isSidebarOpen && <span className="text-[12px]">드라마·영화</span>}
        </button>
      </div>
    </aside>
  );
}
