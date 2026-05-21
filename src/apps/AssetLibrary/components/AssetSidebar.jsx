// PromptArc ArcSidebar 패턴 — 카테고리 nav.
import { ASSET_NAV_ITEMS } from "../constants/categories";

export default function AssetSidebar({ isSidebarCollapsed, handleSidebarClick, category, setCategory }) {
  return (
    <aside
      onClick={handleSidebarClick}
      className={`hidden md:flex flex-col bg-[#141414] my-3 ml-3 rounded-[16px] border border-zinc-800/80 shadow-2xl overflow-hidden transition-all duration-300 cursor-default shrink-0 ${
        isSidebarCollapsed ? "w-16" : "w-[180px]"
      }`}
      title={isSidebarCollapsed ? "클릭하면 사이드바가 펼쳐집니다" : undefined}
    >
      <div className={`flex items-center h-[60px] shrink-0 transition-all duration-300 ${isSidebarCollapsed ? "justify-center" : "px-4"}`} />
      <nav className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5">
        {ASSET_NAV_ITEMS.map((it, idx) => {
          if (it.type === "divider") {
            return isSidebarCollapsed ? null : <div key={`div-${idx}`} className="h-px bg-white/5 my-1 mx-3" />;
          }
          const active = category === it.id;
          return (
            <button
              key={it.id}
              onClick={(e) => { e.stopPropagation(); setCategory(it.id); }}
              className={`flex items-center h-10 w-full pr-3 transition-colors ${
                active ? "text-zinc-200 bg-white/5" : "text-zinc-500 hover:text-white hover:bg-white/5"
              }`}
              style={active && it.color ? { boxShadow: `inset 2px 0 0 ${it.color}` } : undefined}
            >
              <div className="w-16 flex justify-center shrink-0" style={active && it.color ? { color: it.color } : undefined}>
                {it.icon}
              </div>
              {!isSidebarCollapsed && (
                <span className={`text-xs truncate min-w-0 ${active ? "font-bold" : ""}`}>{it.name}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
