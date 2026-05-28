// 폴더 멀티 선택 popover — 단일 배너에 대해 폴더 멤버십을 일괄 변경.
// 호출 패턴:
//   <FolderPickerPopover
//     anchor={ref.current}             // 앵커 (생략하면 화면 중앙 모달처럼)
//     folders={[...]}                  // [{ id, name, bannerIds, ... }]
//     bannerId={"abc"}                 // 단일 배너 대상
//     onClose={fn}
//     onCommit={(folderUpdates) => fn} // folderUpdates = [{ id, add }]
//     onCreateFolder={(name) => Promise<folder>}
//   />
import { useEffect, useMemo, useState } from 'react';
import { X, FolderPlus, Check } from 'lucide-react';

export default function FolderPickerPopover({
  folders = [],
  bannerId,
  onClose,
  onCommit,
  onCreateFolder,
}) {
  // 현재 멤버십을 그대로 초기 선택 상태로.
  const initialSelected = useMemo(() => {
    const set = new Set();
    folders.forEach(f => { if ((f.bannerIds || []).includes(bannerId)) set.add(f.id); });
    return set;
  }, [folders, bannerId]);

  const [selected, setSelected] = useState(initialSelected);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  // bannerId 가 바뀌면 선택 상태 리셋
  useEffect(() => { setSelected(initialSelected); }, [initialSelected]);

  const toggle = (fid) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const f = await onCreateFolder?.(name);
      if (f?.id) setSelected(prev => new Set(prev).add(f.id));
      setNewName('');
      setCreating(false);
    } catch (e) {
      console.error('[FolderPickerPopover] create failed', e);
    } finally { setBusy(false); }
  };

  const handleApply = async () => {
    const updates = folders
      .map(f => ({ id: f.id, add: selected.has(f.id) }))
      // 변경된 것만
      .filter(u => initialSelected.has(u.id) !== u.add);
    setBusy(true);
    try { await onCommit?.(updates); onClose?.(); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-[#16161f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="text-sm font-bold text-white">폴더에 담기</div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16}/></button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
          {folders.length === 0 && !creating && (
            <div className="text-[11px] text-zinc-500 px-2 py-3 text-center">
              아직 폴더가 없어요. 아래에서 새 폴더를 만들어보세요.
            </div>
          )}
          {folders.map(f => {
            const checked = selected.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  checked ? 'bg-emerald-500/10 text-emerald-300' : 'text-zinc-300 hover:bg-white/5'
                }`}
              >
                <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                  checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                }`}>
                  {checked && <Check size={11} className="text-black" />}
                </span>
                <span className="flex-1 truncate text-left">{f.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono">{(f.bannerIds || []).length}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/5 p-2">
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                placeholder="새 폴더 이름"
                disabled={busy}
                autoFocus
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={busy || !newName.trim()}
                className="px-3 py-1.5 text-xs font-bold rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 disabled:opacity-40 hover:bg-emerald-500/30"
              >만들기</button>
              <button
                onClick={() => { setCreating(false); setNewName(''); }}
                className="px-2 py-1.5 text-xs text-zinc-400 hover:text-white"
              >취소</button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <FolderPlus size={14} /> 새 폴더 만들기
            </button>
          )}
        </div>

        <div className="flex gap-2 px-3 py-3 border-t border-white/5 bg-black/30">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-xs font-bold"
          >취소</button>
          <button onClick={handleApply}
            disabled={busy}
            className="flex-1 py-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors text-xs font-bold disabled:opacity-50"
          >{busy ? '저장 중…' : '적용'}</button>
        </div>
      </div>
    </div>
  );
}
