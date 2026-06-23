// BriefStudio · Prism — 추출된 세부 데이터(meta + sections)를 패턴별로 시각화 (다크).
// extract() 결과(또는 사용자가 편집한 JSON)를 파싱해 받아, 사람이 눈으로 검증하기 쉬운
// 카드 형태로 렌더한다. 모든 필드는 방어적으로(있으면 표시) 처리 — 섹션마다 채워진 필드가 다름.
import { Fragment } from "react";

const PATTERN_LABEL = {
  "craft-formula": "제작식",
  "result-grid": "결과 그리드",
  "package-card": "패키지",
  "selection-grid": "선택 그리드",
  "craft-rows": "교환/확정",
  "showcase": "쇼케이스",
  "unknown": "미분류",
};

// {name, count} → "이름 ×수량" (count 없으면 이름만)
const nc = (o) => {
  if (!o) return "";
  const name = o.name || "";
  const count = o.count != null && String(o.count).trim() !== "" ? String(o.count) : "";
  return count ? `${name} ×${count}` : name;
};

export default function SectionsView({ data }) {
  if (!data) {
    return <div className="text-[12.5px] text-rose-400">JSON 파싱 오류 — JSON 탭에서 형식을 확인하세요.</div>;
  }
  const meta = data.meta || {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  return (
    <div className="space-y-3">
      <MetaBar meta={meta} />
      {sections.length === 0 ? (
        <div className="text-[12.5px] text-slate-400">섹션 데이터가 없습니다.</div>
      ) : (
        sections.map((s, i) => <SectionCard key={i} s={s} idx={i} />)
      )}
    </div>
  );
}

function MetaBar({ meta }) {
  const chips = [
    meta.doc_type && { k: "유형", v: meta.doc_type },
    meta.game && { k: "게임", v: meta.game },
    meta.page_title && { k: "페이지", v: meta.page_title },
    meta.period && { k: "기간", v: meta.period },
    meta.servers && { k: "서버", v: meta.servers },
    meta.etc && { k: "기타", v: meta.etc },
  ].filter(Boolean);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[12px]">
          <span className="text-slate-400">{c.k}</span>
          <span className="text-slate-200 font-medium">{c.v}</span>
        </span>
      ))}
    </div>
  );
}

function SectionCard({ s, idx }) {
  const isUnknown = s.pattern === "unknown";
  const patternLabel = PATTERN_LABEL[s.pattern] || s.pattern || "—";
  const f = s.formula || {};
  const hasFormula = (Array.isArray(f.sources) && f.sources.length) || (f.result && f.result.name) || f.arrow;
  const outcomes = Array.isArray(s.outcomes) ? s.outcomes : [];
  const items = Array.isArray(s.items) ? s.items : [];
  const notes = Array.isArray(s.notes) ? s.notes : [];

  return (
    <div className="rounded-xl p-3.5" style={{ background: "#16161F", border: "1px solid #23232f" }}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-mono text-slate-500">#{idx + 1}</span>
        <span className={`text-[11px] font-bold tracking-wide rounded px-1.5 py-0.5 border ${isUnknown ? "text-amber-400 border-amber-500/40 bg-amber-500/10" : "text-[#b3acff] border-[#A29BFE]/50 bg-[#A29BFE]/10"}`}>
          {patternLabel}
        </span>
        {s.tag && <span className="text-[11px] font-medium text-slate-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">{s.tag}</span>}
        <span className="text-[14px] font-bold text-slate-100 truncate">{s.title || "(제목 없음)"}</span>
      </div>

      {(s.heading || s.desc) && (
        <div className="mt-1.5 space-y-0.5">
          {s.heading && <div className="text-[13px] font-semibold text-slate-200">{s.heading}</div>}
          {s.desc && <div className="text-[12.5px] text-slate-400 leading-relaxed">{s.desc}</div>}
        </div>
      )}

      {/* 제작식: A + B → C */}
      {hasFormula && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {(f.sources || []).map((src, i) => (
            <Fragment key={i}>
              <Token>{nc(src)}</Token>
              {i < (f.sources || []).length - 1 && <Op>+</Op>}
            </Fragment>
          ))}
          {(f.sources || []).length > 0 && <Op>→</Op>}
          {f.result && f.result.name && <Token accent>{nc(f.result)}</Token>}
          {f.arrow && <span className="text-[12px] text-slate-400 ml-1">{f.arrow}</span>}
        </div>
      )}

      {/* 결과 그리드: 확률/수량 */}
      {outcomes.length > 0 && (
        <div className="mt-2.5">
          <Caption>결과</Caption>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
            {outcomes.map((o, i) => (
              <Fragment key={i}>
                <span className="text-[13px] text-slate-200 truncate">{o.name || "—"}</span>
                <span className="text-[13px] text-slate-400 font-mono text-right">{o.count != null && String(o.count).trim() !== "" ? `×${o.count}` : ""}</span>
                <span className="text-[13px] text-[#b3acff] font-mono text-right">{o.prob || ""}</span>
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* 구성품 / 선택지 */}
      {items.length > 0 && (
        <div className="mt-2.5">
          <Caption>구성</Caption>
          <div className="flex flex-col gap-1">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-x-3 items-baseline">
                <span className="text-[13px] text-slate-200">
                  {it.name || "—"}
                  {it.note && <span className="text-[11.5px] text-slate-500 ml-1.5">{it.note}</span>}
                </span>
                <span className="text-[13px] text-slate-400 font-mono">{it.count != null && String(it.count).trim() !== "" ? `×${it.count}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 가격 / 인장 */}
      {(s.price || s.seal) && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {s.price && <KV k="가격" v={s.price} />}
          {s.seal && <KV k="인장" v={s.seal} />}
        </div>
      )}

      {/* 주의문 (원문) */}
      {notes.length > 0 && (
        <ul className="mt-2.5 pl-4 list-disc space-y-0.5">
          {notes.map((n, i) => <li key={i} className="text-[12px] text-slate-400 leading-relaxed">{n}</li>)}
        </ul>
      )}
    </div>
  );
}

function Token({ children, accent }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[13px] border ${accent ? "bg-[#A29BFE]/15 border-[#A29BFE]/40 text-[#b3acff] font-semibold" : "bg-white/5 border-white/10 text-slate-200"}`}>
      {children}
    </span>
  );
}
function Op({ children }) {
  return <span className="text-[14px] font-bold text-slate-500">{children}</span>;
}
function Caption({ children }) {
  return <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{children}</div>;
}
function KV({ k, v }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[12.5px]">
      <span className="text-slate-400">{k}</span>
      <span className="text-slate-200 font-medium">{v}</span>
    </span>
  );
}
