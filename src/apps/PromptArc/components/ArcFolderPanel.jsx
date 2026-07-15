import { FolderHeart } from "lucide-react";

const PRIVATE_CATEGORY = 'my_private';

// 사이드바 "내 폴더" — 단일 진입 항목.
// 폴더 나열/추가/이름변경/삭제는 콘텐츠 우측 상단 탭(ArcFolderTabs)으로 이전됐다.
// 클릭 시 기본 탭(내 비공개)으로 진입, 이미 내 폴더 영역이면 유지.
export default function ArcFolderPanel({ category, setCategory, isSidebarCollapsed }) {
  const active = category === PRIVATE_CATEGORY || String(category || '').startsWith('folder:');
  const enter = () => { if (!active) setCategory(PRIVATE_CATEGORY); };

  if (isSidebarCollapsed) {
    return (
      <button onClick={enter} title="내 폴더"
        className={`flex items-center h-9 w-full transition-colors ${active ? 'text-slate-900 bg-black/5 dark:text-zinc-200 dark:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/5'}`}>
        <div className="w-16 flex justify-center"><FolderHeart size={14} className={active ? 'text-[#C8A969]' : ''} /></div>
      </button>
    );
  }

  return (
    <button onClick={enter}
      className={`flex items-center h-10 w-full pr-3 transition-colors ${active ? 'text-slate-900 bg-black/5 dark:text-zinc-200 dark:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/5'}`}>
      <div className="w-8 ml-2 flex justify-center shrink-0"><FolderHeart size={14} className={active ? 'text-[#C8A969]' : ''} /></div>
      <span className={`text-xs flex-1 truncate text-left ${active ? 'font-bold' : ''}`}>내 폴더</span>
    </button>
  );
}
