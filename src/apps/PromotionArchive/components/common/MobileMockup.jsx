import { memo } from 'react';
import { Loader2 } from 'lucide-react';

const MobileMockup = memo(({ src, isLoading }) => {
    return (
        <div className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden">
             {src && (
                <div className="absolute inset-0 overflow-hidden z-0">
                      <div className="absolute inset-0 bg-zinc-950/80 z-10" />
                      <img src={src} alt="Background" className="w-full h-full object-cover blur-3xl opacity-40 scale-125" />
                </div>
             )}
             
             <div className="relative z-10 w-[340px] h-[700px] max-h-[85vh] bg-black rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden ring-1 ring-white/10 shrink-0">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-800 rounded-b-2xl z-20 flex justify-center items-center pointer-events-none">
                     <div className="w-16 h-1.5 bg-black/50 rounded-full" />
                 </div>

                 <div className="w-full h-full bg-zinc-900 overflow-y-auto scrollbar-hide relative" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
                    
                    {isLoading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500">
                             <Loader2 className="w-8 h-8 animate-spin" />
                             <span className="text-xs">Loading Mobile...</span>
                        </div>
                    ) : (
                        <img src={src} alt="Mobile Preview" className="w-full h-auto block" />
                    )}
                 </div>
                 
                 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-20 pointer-events-none mix-blend-difference" />
             </div>
        </div>
    )
});

export default MobileMockup;