import { AlertTriangle, Check } from "lucide-react";

export default function ArcToast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 z-[70] border text-sm font-medium ${toast.type === 'error' ? 'bg-red-950 border-red-800 text-red-200' : 'bg-zinc-900 border-zinc-800 text-white'}`}>
      {toast.type === 'error' ? <AlertTriangle size={14} /> : <Check size={14} />} {toast.message}
    </div>
  );
}
