import { useState } from "react";
import { Folder, FolderPlus, Plus, Pencil, Trash2, Check, X } from "lucide-react";

export default function ArcFolderPanel({
  folders, category, setCategory, isSidebarCollapsed,
  onCreateFolder, onRenameFolder, onDeleteFolder,
}) {
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  if (isSidebarCollapsed) {
    return (
      <>
        {folders.map(f => {
          const fid = `folder:${f.id}`;
          const active = category === fid;
          return (
            <button key={f.id} onClick={() => setCategory(fid)} title={f.name}
              className={`flex items-center h-9 w-full transition-colors ${active ? 'text-slate-900 bg-black/5 dark:text-zinc-200 dark:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/5'}`}>
              <div className="w-16 flex justify-center"><Folder size={14} className={active ? 'text-[#C8A969]' : ''} /></div>
            </button>
          );
        })}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between pl-5 pr-2 mt-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-600">내 폴더</span>
        <button onClick={() => { setShowNewFolderInput(v => !v); setNewFolderName(''); }}
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/5 rounded" title="폴더 추가">
          <Plus size={12} />
        </button>
      </div>
      {folders.map(f => {
        const fid = `folder:${f.id}`;
        const active = category === fid;
        const isEditing = editingFolderId === f.id;
        const count = (f.items || []).length;
        return (
          <div key={f.id}
            onClick={() => { if (!isEditing) setCategory(fid); }}
            className={`group flex items-center h-9 w-full transition-colors cursor-pointer ${active ? 'text-slate-900 bg-black/5 dark:text-zinc-200 dark:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/5'}`}
          >
            <div className="w-10 ml-2 flex justify-center shrink-0">
              <Folder size={14} className={active ? 'text-[#C8A969]' : ''} />
            </div>
            {isEditing ? (
              <input autoFocus value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onRenameFolder(f.id, editingFolderName); setEditingFolderId(null); }
                  if (e.key === 'Escape') { setEditingFolderId(null); }
                }}
                onBlur={() => {
                  if (editingFolderName.trim() && editingFolderName !== f.name) onRenameFolder(f.id, editingFolderName);
                  setEditingFolderId(null);
                }}
                className="flex-1 bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded px-1.5 py-0.5 text-[11px] text-slate-900 dark:text-white outline-none focus:border-[#C8A969] mr-2"
              />
            ) : (
              <>
                <span className={`text-xs flex-1 truncate ${active ? 'font-bold' : ''}`}>{f.name}</span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-600 mr-1">{count || ''}</span>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 mr-1.5 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setEditingFolderId(f.id); setEditingFolderName(f.name); }}
                    className="p-1 text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white rounded" title="이름 변경"><Pencil size={11} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(f.id); }}
                    className="p-1 text-slate-500 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 rounded" title="폴더 삭제"><Trash2 size={11} /></button>
                </div>
              </>
            )}
          </div>
        );
      })}
      {showNewFolderInput && (
        <div className="flex items-center h-9 pl-5 pr-2 gap-1">
          <FolderPlus size={12} className="text-[#C8A969] shrink-0" />
          <input autoFocus value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onCreateFolder(newFolderName); setNewFolderName(''); setShowNewFolderInput(false); }
              if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(''); }
            }}
            placeholder="폴더 이름"
            className="flex-1 min-w-0 bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded px-1.5 py-0.5 text-[11px] text-slate-900 dark:text-white outline-none focus:border-[#C8A969]"
          />
          <button onClick={() => { onCreateFolder(newFolderName); setNewFolderName(''); setShowNewFolderInput(false); }}
            className="p-1 text-slate-500 hover:text-emerald-500 dark:text-zinc-500 dark:hover:text-emerald-400 rounded"><Check size={11} /></button>
          <button onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}
            className="p-1 text-slate-500 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 rounded"><X size={11} /></button>
        </div>
      )}
      {folders.length === 0 && !showNewFolderInput && (
        <button onClick={() => setShowNewFolderInput(true)}
          className="flex items-center h-9 w-full pl-5 text-[11px] text-slate-400 hover:text-slate-600 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
          <Plus size={12} className="mr-2" /> 폴더 추가
        </button>
      )}
    </>
  );
}
