import { Image as ImageIcon, UploadCloud, X, MousePointerClick, MessageSquare } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';
import { editOptions } from '../constants/categories.jsx';
import { DropdownControl, Tooltip } from './ui.jsx';

// MICRO-EDIT 뷰의 좌측 사이드바 — 레퍼런스 이미지 / 타겟 카테고리 / 서브 스타일 / 추가 지시사항
export default function BreezePromptForm() {
  const {
    editUploadedImage, setEditUploadedImage,
    isDragging, handleDragOver, handleDragLeave, handleEditDrop, handleEditImageUpload,
    editTargetCategory, setEditTargetCategory,
    editTexStyle, setEditTexStyle,
    editEdgeStyle, setEditEdgeStyle,
    editExtStyle, setEditExtStyle,
    editRhythmStyle, setEditRhythmStyle,
    editObjLetter, setEditObjLetter,
    editObjItem, setEditObjItem,
    editInstruction, setEditInstruction,
    openEditTuningRoom,
  } = useBreeze();

  return (
    <aside className="w-[360px] shrink-0 border-r bg-[#111111] flex flex-col border-zinc-800/80 overflow-y-auto p-5 space-y-6 custom-scrollbar">
      <div className="space-y-3">
        <div className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> 1. Reference Image</div>
        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleEditDrop} className={`relative rounded-xl border-2 border-dashed p-5 text-center transition-all flex flex-col items-center justify-center min-h-[100px] ${isDragging ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-800 bg-[#16161D] hover:border-zinc-700'}`}>
          {editUploadedImage ? (
            <div className="w-full relative group">
              <img src={editUploadedImage} className="max-h-24 mx-auto object-contain rounded" />
              <button onClick={() => setEditUploadedImage(null)} className="absolute top-1 right-1 p-1 bg-black/70 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5 text-zinc-300" /></button>
            </div>
          ) : (
            <>
              <UploadCloud className="w-5 h-5 text-zinc-600 mb-2" />
              <div className="text-[11px] text-zinc-400">Click or drag image here</div>
            </>
          )}
          {!editUploadedImage && <input type="file" onChange={handleEditImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
        </div>
      </div>

      <hr className="border-zinc-800/80" />

      <div className={`transition-all duration-300 space-y-4 ${!editUploadedImage ? 'opacity-30 pointer-events-none' : ''}`}>
        <div className="text-[10px] font-bold uppercase text-zinc-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5" /> 2. Target Element</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {editOptions.categories.map(cat => (
            <button key={cat.id} onClick={() => setEditTargetCategory(cat.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${editTargetCategory === cat.id ? 'bg-[#1E1E1E] border-zinc-600' : 'bg-transparent border-transparent hover:bg-zinc-800/50 hover:border-zinc-800'}`}>
              <div className={`${editTargetCategory === cat.id ? 'text-zinc-200' : 'text-zinc-500'}`}>{cat.icon}</div>
              <div className="flex-1 overflow-hidden">
                <div className={`text-[11px] font-bold truncate ${editTargetCategory === cat.id ? 'text-zinc-100' : 'text-zinc-400'}`}>{cat.name}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-zinc-800/80">
          <div className="text-[10px] font-bold uppercase text-zinc-500 mb-3">Sub-Style</div>
          {editTargetCategory === 'texture' && <DropdownControl data={editOptions.textures} value={editTexStyle} onChange={setEditTexStyle} disabled={false} />}
          {editTargetCategory === 'edge' && <DropdownControl data={editOptions.edges} value={editEdgeStyle} onChange={setEditEdgeStyle} disabled={false} />}
          {editTargetCategory === 'extension' && <DropdownControl data={editOptions.extensions} value={editExtStyle} onChange={setEditExtStyle} disabled={false} />}
          {editTargetCategory === 'rhythm' && <DropdownControl data={editOptions.rhythms} value={editRhythmStyle} onChange={setEditRhythmStyle} disabled={false} />}
          {editTargetCategory === 'object' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={editObjLetter} onChange={e => setEditObjLetter(e.target.value)} placeholder="Target Letter (e.g. A)" className="w-1/3 bg-[#111111] border border-zinc-800 rounded-md p-2.5 text-[11px] text-white outline-none focus:border-zinc-500 transition-colors" />
                <input value={editObjItem} onChange={e => setEditObjItem(e.target.value)} placeholder="Object (e.g. Star, Heart)" className="flex-1 bg-[#111111] border border-zinc-800 rounded-md p-2.5 text-[11px] text-white outline-none focus:border-zinc-500 transition-colors" />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-zinc-800/80">
          <div className="text-[10px] font-bold uppercase text-zinc-500 mb-3 flex justify-between items-center">
            <span>Additional Instructions</span>
            {editInstruction && <button onClick={() => setEditInstruction("")} className="text-[9px] hover:text-zinc-300">Clear</button>}
          </div>
          <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="e.g., Make it look slightly worn out..." className="w-full bg-[#111111] border border-zinc-800 rounded-md p-3 outline-none min-h-[4rem] resize-none text-[11px] text-zinc-200 focus:border-zinc-500 transition-colors custom-scrollbar" />
          <div className="mt-3 flex justify-end gap-2">
            <Tooltip text="AI 튜닝 어시스턴트 열기">
              <button onClick={openEditTuningRoom} className="w-8 h-8 rounded-md flex items-center justify-center bg-[#1A1A1A] hover:bg-[#2C2C2C] border border-zinc-800 transition-colors text-violet-400 hover:text-violet-300">
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
}
