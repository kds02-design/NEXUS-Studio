import { Trash2 } from "lucide-react";

export default function ArcConfirmDialog({ isOpen, batchCount, isDeleting, onCancel, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 p-6 rounded-xl max-w-sm w-full text-center shadow-2xl">
        <Trash2 size={32} className="mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">삭제하시겠습니까?</h3>
        {batchCount != null && <p className="text-xs text-zinc-500 mb-2">선택한 {batchCount}개 항목이 삭제됩니다.</p>}
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={onCancel} className="px-5 py-2 bg-zinc-800 text-white rounded-lg text-sm">취소</button>
          <button onClick={onConfirm} className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm">{isDeleting ? '삭제 중...' : '삭제하기'}</button>
        </div>
      </div>
    </div>
  );
}
