import { X, Loader2 } from "lucide-react";

// 이미지 드롭존 + 미리보기. 분석 진행 중에는 dim 처리하고 로더 오버레이 노출.
// 원본 RenderMatrix 의 ImageDropzone 과 동일한 API. 향후 줌/패닝 viewer 가 필요해지면
// 여기에 useImageZoom 훅을 합성하면 됨.
export default function MatrixImageViewer({
  image, onClear, onUpload,
  onDragOver, onDragLeave, onDrop, isDragging,
  title, sub, icon: Icon, heightClass = "h-36", isLoading = false,
}) {
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={`relative border border-dashed rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden group ${heightClass} ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700/50 bg-[#18181B] hover:border-zinc-500'}`}>
      {image ? (
        <div className={`relative w-full h-full p-2 flex flex-col items-center justify-center transition-all ${isLoading ? 'opacity-30' : 'group-hover:opacity-90'}`}>
          <img src={image} className="w-full h-full object-contain drop-shadow-xl" alt="Source" />
          {!isLoading && (
            <button onClick={onClear} className="absolute top-2 right-2 bg-black/80 hover:bg-zinc-800 text-white p-1.5 rounded-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-10">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 opacity-40">
          {Icon ? <Icon className="w-6 h-6 text-zinc-500" /> : null}
          <div className="text-center">
            <p className="text-[9px] font-bold tracking-tight text-center leading-snug text-zinc-400">{title}</p>
            {sub && <p className="text-[8px] text-zinc-500 mt-0.5">{sub}</p>}
          </div>
        </div>
      )}
      {!image && !isLoading && (
        <input type="file" accept="image/*" onChange={onUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
      )}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
          <span className="text-[10px] font-bold text-indigo-300 tracking-widest uppercase">Analyzing...</span>
        </div>
      )}
    </div>
  );
}
