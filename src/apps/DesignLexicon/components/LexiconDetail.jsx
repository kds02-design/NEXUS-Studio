import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { CATEGORY_MAP } from "../constants/categories";

// 상세 모달 — 텀의 이론·예시·참고 자료 전체 표시.
// ESC + 배경 클릭으로 닫힘.
export default function LexiconDetail({ term, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!term) return null;
  const cat = CATEGORY_MAP[term.category];
  const color = cat?.color || "#55EFC4";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] bg-[#111] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
              style={{ background: `${color}1A`, border: `1px solid ${color}55`, color }}
            >
              {cat?.label || "Lexicon"} · {cat?.ko}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              title="닫기 (ESC)"
            >
              <X size={16} />
            </button>
          </div>
          <h2
            className="text-white leading-tight"
            style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "0.3px" }}
          >
            {term.term}
          </h2>
          <div className="text-[13px] text-zinc-400 mt-1">{term.ko}</div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5 arc-scrollbar">
          <Section label="요약">
            <p className="text-[13px] text-zinc-200 leading-relaxed">{term.summary}</p>
          </Section>

          <Section label="이론 · 사용 시점">
            <p className="text-[12px] text-zinc-300 leading-[1.75] whitespace-pre-wrap">{term.theory}</p>
          </Section>

          {term.examples?.length > 0 && (
            <Section label="예시 · 사례">
              <ul className="space-y-1.5">
                {term.examples.map((ex, i) => (
                  <li key={i} className="text-[12px] text-zinc-300 leading-relaxed flex gap-2">
                    <span className="text-zinc-600 shrink-0">·</span>
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {term.references?.length > 0 && (
            <Section label="참고 자료">
              <ul className="space-y-1.5">
                {term.references.map((r, i) => {
                  const obj = typeof r === "string" ? { label: r } : r;
                  return (
                    <li key={i} className="text-[12px] leading-relaxed">
                      {obj.url ? (
                        <a href={obj.url} target="_blank" rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                        >
                          {obj.label} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-zinc-400">{obj.label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {term.tags?.length > 0 && (
            <Section label="연결 태그">
              <div className="flex flex-wrap gap-1.5">
                {term.tags.map((t, i) => (
                  <span key={i}
                    className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300"
                    title="향후 Prompt Arche 의 #태그 와 연결될 예정"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{label}</div>
      {children}
    </div>
  );
}
