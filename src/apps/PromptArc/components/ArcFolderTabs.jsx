import { useState } from "react";
import { Folder, FolderPlus, Lock, Plus, Pencil, Trash2, Check, X } from "lucide-react";

const PRIVATE_CATEGORY = 'my_private';

// 내 폴더 탭 바 — 콘텐츠 우측 상단. 사이드바에 세로 나열되던 폴더들을 탭으로 이전.
// [🔒 내 비공개] [폴더A] [폴더B] … [+]. 활성 폴더 탭 hover 시 이름변경/삭제 노출.
export default function ArcFolderTabs({
  folders, category, setCategory,
  onCreateFolder, onRenameFolder, onDeleteFolder,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  const tabCls = (active) =>
    `group flex items-center gap-1.5 h-8 px-3 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer border ${
      active
        ? 'bg-[#C8A969]/15 border-[#C8A969]/50 text-[#C8A969] font-bold'
        : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5'
    }`;

  const commitNew = () => {
    if (newName.trim()) onCreateFolder(newName);
    setNewName('');
    setShowNewInput(false);
  };

  return (
    <div className="flex items-center justify-end gap-1.5 flex-wrap px-6 pt-3">
      {/* 고정 탭: 내 비공개 */}
      <button onClick={() => setCategory(PRIVATE_CATEGORY)} className={tabCls(category === PRIVATE_CATEGORY)}>
        <Lock size={12} className="shrink-0" /> 내 비공개
      </button>

      {folders.map(f => {
        const fid = `folder:${f.id}`;
        const active = category === fid;
        const count = (f.items || []).length;
        if (editingId === f.id) {
          return (
            <div key={f.id} className="flex items-center gap-1 h-8 px-2 rounded-full border border-[#C8A969]/50 bg-[#C8A969]/10">
              <Folder size={12} className="text-[#C8A969] shrink-0" />
              <input autoFocus value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onRenameFolder(f.id, editingName); setEditingId(null); }
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => {
                  if (editingName.trim() && editingName !== f.name) onRenameFolder(f.id, editingName);
                  setEditingId(null);
                }}
                className="w-24 bg-transparent text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>
          );
        }
        return (
          <button key={f.id} onClick={() => setCategory(fid)} className={tabCls(active)} title={f.name}>
            <Folder size={12} className="shrink-0" />
            <span className="max-w-[120px] truncate">{f.name}</span>
            {count > 0 && <span className={`text-[10px] ${active ? 'text-[#C8A969]/70' : 'text-slate-400 dark:text-zinc-600'}`}>{count}</span>}
            {/* 관리 액션 — 활성 탭 hover 시에만 노출 (비활성 탭은 전환에 집중) */}
            {active && (
              <span className="hidden group-hover:inline-flex items-center gap-0.5 -mr-1">
                <span role="button" tabIndex={0} title="이름 변경"
                  onClick={(e) => { e.stopPropagation(); setEditingId(f.id); setEditingName(f.name); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setEditingId(f.id); setEditingName(f.name); } }}
                  className="p-0.5 rounded text-[#C8A969]/70 hover:text-[#C8A969]">
                  <Pencil size={11} />
                </span>
                <span role="button" tabIndex={0} title="폴더 삭제"
                  onClick={(e) => { e.stopPropagation(); onDeleteFolder(f.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDeleteFolder(f.id); } }}
                  className="p-0.5 rounded text-[#C8A969]/70 hover:text-red-400">
                  <Trash2 size={11} />
                </span>
              </span>
            )}
          </button>
        );
      })}

      {/* 폴더 추가 — 인라인 입력 */}
      {showNewInput ? (
        <div className="flex items-center gap-1 h-8 px-2 rounded-full border border-[#C8A969]/50 bg-[#C8A969]/10">
          <FolderPlus size={12} className="text-[#C8A969] shrink-0" />
          <input autoFocus value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNew();
              if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); }
            }}
            placeholder="폴더 이름"
            className="w-24 bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
          />
          <button onClick={commitNew} className="p-0.5 text-slate-500 hover:text-emerald-500 dark:text-zinc-500 dark:hover:text-emerald-400"><Check size={11} /></button>
          <button onClick={() => { setShowNewInput(false); setNewName(''); }} className="p-0.5 text-slate-500 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"><X size={11} /></button>
        </div>
      ) : (
        <button onClick={() => setShowNewInput(true)} title="폴더 추가"
          className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-white/15 text-slate-400 dark:text-zinc-600 hover:text-[#C8A969] hover:border-[#C8A969]/50 transition-colors">
          <Plus size={13} />
        </button>
      )}
    </div>
  );
}
