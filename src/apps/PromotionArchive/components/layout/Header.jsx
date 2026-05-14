import React from 'react';
import { Archive, Search, Sparkles, Loader2, X, Menu } from 'lucide-react';

const Header = ({
  setIsSidebarOpen,
  isAiSearchMode,
  setIsAiSearchMode,
  isAiQuerying,
  searchQuery,
  setSearchQuery,
  handleAiSearch,
  setAiSearchKeywords
}) => {
  return (
    <header className="bg-[#0c0c0e] shrink-0 z-50 flex flex-col">
      <div className="px-4 md:px-8 py-4 flex items-center justify-between gap-3 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
          
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-[#d8b17e]" strokeWidth={1.5} />
            <span className="app-title text-2xl tracking-wide flex items-baseline gap-1.5 text-white">
              <span className="font-light">Promotion</span> <span className="font-semibold">Archive</span>
            </span>
            <span className="text-[10px] bg-[#d8b17e]/10 text-[#d8b17e] px-1.5 py-0.5 rounded border border-[#d8b17e]/20 ml-1 font-bold hidden sm:inline-block">
              v2.5
            </span>
          </div>
        </div>
        
        {/* Search Input Group */}
        <div className="relative group w-full max-w-sm ml-auto">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isAiSearchMode ? 'text-violet-400' : 'text-zinc-500'}`}>
            {isAiQuerying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isAiSearchMode ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4" strokeWidth={1.5} />
            )}
          </div>
          
          <input 
            type="text" 
            placeholder={isAiSearchMode ? "AI 검색: 분위기나 느낌 입력..." : "검색..."}
            className={`w-full pl-10 pr-20 py-2 bg-zinc-900 border rounded-lg text-white text-sm transition-all placeholder:text-zinc-600 focus:outline-none 
              ${isAiSearchMode 
                ? 'border-violet-500/50 focus:border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                : 'border-zinc-800 focus:border-[#d8b17e]'
              }`} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isAiSearchMode) handleAiSearch();
            }}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setAiSearchKeywords([]); }} 
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
            
            <button 
              onClick={() => { setIsAiSearchMode(!isAiSearchMode); setAiSearchKeywords([]); }}
              className={`p-1.5 rounded-md transition-all ${isAiSearchMode ? 'bg-violet-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              title={isAiSearchMode ? "AI 검색 끄기" : "AI 스마트 검색 켜기"}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;