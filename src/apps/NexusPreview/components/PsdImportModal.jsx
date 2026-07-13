// PSD 임포트 모달 — PSD 합성본 + 내부 레이어를 PNG 로 추출해 다운로드 / KV 슬롯에 추가.
//   · 폴더는 기본 "합쳐진 1장". 필요하면 폴더 카드의 [펼치기]로 내부 레이어를 개별 카드로 분해.
//   · 여러 항목(펼친 내부 레이어 포함)을 체크 선택하면 PSD 원본 배치 그대로 한 장으로 합쳐 추가/다운로드.
import { useEffect, useMemo, useState } from "react";
import { X, Download, Loader2, CheckSquare, Square, Combine, FolderOpen, FolderClosed } from "lucide-react";
import { parsePsdFile, parsePsdFileServer, canServerExtract, mergeItems, expandLeaves, PSD_BROWSER_LIMIT } from "../services/psdImport";

const SLOTS = [
  { id: "bgImage", t: "배경" },
  { id: "female", t: "좌캐" },
  { id: "male", t: "우캐" },
  { id: "title", t: "타이틀" },
];

const sanitize = (s) => (s || "layer").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 60);
function download(dataUrl, name) { const a = document.createElement("a"); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function PsdImportModal({ T, accent, file, onClose, onAdd, slots = SLOTS }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(() => new Set()); // 병합 대상 row id
  const [merging, setMerging] = useState(false);
  const [expanded, setExpanded] = useState({}); // { [topIdx]: "loading" | subItems[] }

  // 대용량 PSD 는 dev 서버(Node) 추출 경로 — 브라우저 탭 메모리 한계를 우회.
  const useServer = canServerExtract() && file?.size > PSD_BROWSER_LIMIT;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = useServer ? await parsePsdFileServer(file) : await parsePsdFile(file);
        if (!cancelled) { setData(d); setSelected(new Set()); setExpanded({}); setLoading(false); }
      }
      catch (e) { if (!cancelled) { setError(e.message || "PSD 파싱 실패"); setLoading(false); } }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // 추출 결과 = [합성본(포토샵 완성 렌더 — 원본과 동일)] + 보이는 최상위 항목(폴더=합침, 레이어=그대로).
  // 플랫 레이어 PSD 를 "전체 한 장"으로 쓸 땐 병합 대신 합성본을 쓰는 게 원본과 일치(조정 레이어·마스크 반영).
  const items = useMemo(() => {
    if (!data) return [];
    const list = [];
    if (data.composite?.dataUrl) {
      list.push({
        name: "합성본 (전체 · 원본 렌더)", composite: true,
        dataUrl: data.composite.dataUrl, w: data.composite.w, h: data.composite.h,
        x: 0, y: 0, origW: data.width, origH: data.height,
      });
    }
    return [...list, ...(data.layers || [])];
  }, [data]);

  // 렌더 행 — 최상위 항목 + (펼친 폴더의) 내부 레이어. id 로 선택 상태를 고정(펼침/접기에도 안전).
  // 행 순서 = PSD 스택 순서 → 병합 시 앞뒤 겹침이 원본과 동일.
  const rows = useMemo(() => {
    const out = [];
    items.forEach((it, i) => {
      out.push({ ...it, id: `t${i}`, topIdx: i });
      const subs = expanded[i];
      if (Array.isArray(subs)) subs.forEach((s, j) => out.push({ ...s, id: `t${i}s${j}`, parentName: it.name }));
    });
    return out;
  }, [items, expanded]);

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // 폴더 펼치기/접기 — 펼칠 때만 내부 레이어를 다운스케일(지연 비용). 접으면 그 서브 선택도 해제.
  const toggleExpand = async (i, it) => {
    if (expanded[i]) {
      setExpanded((m) => { const n = { ...m }; delete n[i]; return n; });
      setSelected((prev) => new Set([...prev].filter((id) => !id.startsWith(`t${i}s`))));
      return;
    }
    setExpanded((m) => ({ ...m, [i]: "loading" }));
    try {
      const subs = await expandLeaves(it.leaves);
      setExpanded((m) => ({ ...m, [i]: subs }));
    } catch {
      setExpanded((m) => { const n = { ...m }; delete n[i]; return n; });
    }
  };

  // 선택 항목을 행 순서(=PSD 스택 아래→위)대로 병합 — 원본과 같은 앞뒤 관계 유지.
  const buildMerged = async () => mergeItems(rows.filter((r) => selected.has(r.id)));
  const mergedName = () => {
    const names = rows.filter((r) => selected.has(r.id)).map((r) => r.name);
    return sanitize(names.slice(0, 3).join("+")) + (names.length > 3 ? `_외${names.length - 3}` : "");
  };
  const addMerged = async (slotId) => {
    if (merging || selected.size < 2) return;
    setMerging(true);
    try {
      const m = await buildMerged();
      if (m?.dataUrl) onAdd?.(slotId, m.dataUrl);
    } finally { setMerging(false); }
  };
  const downloadMerged = async () => {
    if (merging || selected.size < 2) return;
    setMerging(true);
    try {
      const m = await buildMerged();
      if (m?.dataUrl) download(m.dataUrl, `${mergedName()}.png`);
    } finally { setMerging(false); }
  };

  const downloadAll = async () => {
    for (const it of items) { download(it.dataUrl, `${sanitize(it.name)}.png`); await wait(300); }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ width: "100%", maxWidth: 760, maxHeight: "86vh", display: "flex", flexDirection: "column", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>PSD 가져오기 — PNG 변환 · 레이어 추출</div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: T.textMuted, cursor: "pointer" }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 0", color: T.textMuted }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Loader2 size={18} className="animate-spin" /> {useServer ? "대용량 PSD — 개발 서버(Node)에서 추출 중…" : "PSD 파싱 중…"} ({file?.name})
              </div>
              {useServer && <div style={{ fontSize: 11, color: T.textDim }}>{Math.round(file.size / 1024 / 1024)}MB · 파일 크기에 따라 수십 초~수 분 걸릴 수 있습니다</div>}
            </div>
          ) : error ? (
            <div style={{ color: "#fda4af", fontSize: 13, padding: 20 }}>{error}</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: T.textMuted }}>{data.width}×{data.height} · 추출 {items.length}개 (폴더=합침, [펼치기]로 분해) · 체크 선택 → 하나로 합치기</div>
                <button onClick={downloadAll} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <Download size={13} /> 전체 PNG 다운로드
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
                {rows.map((it) => {
                  const on = selected.has(it.id);
                  const exp = it.topIdx != null ? expanded[it.topIdx] : null;
                  const canExpand = it.group && it.leaves?.length > 1;
                  return (
                    <div key={it.id} style={{
                      position: "relative", borderRadius: 12, overflow: "hidden", background: T.bg,
                      border: `1px ${it.sub ? "dashed" : "solid"} ${on ? accent : it.composite ? accent : T.border}`,
                      boxShadow: on ? `0 0 0 1px ${accent}` : "none",
                    }}>
                      {/* 병합 선택 체크 */}
                      <button onClick={() => toggleSelect(it.id)} title={on ? "병합 선택 해제" : "병합 대상으로 선택"} style={{
                        position: "absolute", top: 6, left: 6, zIndex: 2, width: 26, height: 26, borderRadius: 7,
                        border: `1px solid ${on ? accent : T.border}`, background: on ? accent : "rgba(0,0,0,0.55)",
                        color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{on ? <CheckSquare size={14} /> : <Square size={14} />}</button>
                      <div onClick={() => toggleSelect(it.id)} style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "#0A0A0F", backgroundImage: `linear-gradient(45deg,#ffffff08 25%,transparent 25%),linear-gradient(-45deg,#ffffff08 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ffffff08 75%),linear-gradient(-45deg,transparent 75%,#ffffff08 75%)`, backgroundSize: "16px 16px", backgroundPosition: "0 0,0 8px,8px -8px,-8px 0" }}>
                        <img src={it.dataUrl} alt="" style={{ maxWidth: "94%", maxHeight: 118, objectFit: "contain" }} />
                      </div>
                      <div style={{ padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: it.composite ? accent : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={it.sub ? `${it.parentName} / ${it.name}` : it.name}>
                          {it.sub && <span style={{ color: T.textDim, fontWeight: 500 }}>└ </span>}{it.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: it.composite || it.group || it.sub ? accent : T.textDim, marginTop: 2 }}>
                          {it.w}×{it.h}{it.composite ? " · 조정 레이어·마스크·블렌드 완전 반영" : ""}{it.group ? " · 폴더 합침" : ""}{it.sub ? " · 내부 레이어" : ""}
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                          <button onClick={() => download(it.dataUrl, `${sanitize(it.name)}.png`)} title="PNG 다운로드" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 11, cursor: "pointer" }}><Download size={11} /> PNG</button>
                          {slots.map((s) => (
                            <button key={s.id} onClick={() => onAdd?.(s.id, it.dataUrl)} title={`${s.t} 슬롯에 추가`} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${accent}55`, background: `${accent}14`, color: accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{s.t}</button>
                          ))}
                          {canExpand && (
                            <button onClick={() => toggleExpand(it.topIdx, it)} disabled={exp === "loading"}
                              title={exp ? "내부 레이어 접기" : `내부 레이어 ${it.leaves.length}장을 개별 카드로 분해`}
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: exp ? `${accent}14` : "transparent", color: exp ? accent : T.textMuted, fontSize: 11, fontWeight: 700, cursor: exp === "loading" ? "wait" : "pointer" }}>
                              {exp === "loading" ? <Loader2 size={11} className="animate-spin" /> : exp ? <FolderClosed size={11} /> : <FolderOpen size={11} />}
                              {exp === "loading" ? "분해 중…" : exp ? "접기" : `펼치기 ${it.leaves.length}`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 병합 액션 바 — 2개 이상 선택 시 표시. PSD 원본 배치 그대로 한 장으로 합쳐 추가/다운로드. */}
        {selected.size >= 2 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderTop: `1px solid ${T.border}`, background: `${accent}0D`, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: accent }}>
              {merging ? <Loader2 size={14} className="animate-spin" /> : <Combine size={14} />} {selected.size}개 선택 — 원본 배치대로 합쳐서
            </span>
            {slots.map((s) => (
              <button key={s.id} onClick={() => addMerged(s.id)} disabled={merging} title={`선택 ${selected.size}개를 합쳐 ${s.t} 슬롯에 추가`} style={{ padding: "7px 14px", borderRadius: 8, border: 0, background: accent, color: "#04222a", fontSize: 12, fontWeight: 800, cursor: merging ? "wait" : "pointer", opacity: merging ? 0.6 : 1 }}>{s.t}</button>
            ))}
            <button onClick={downloadMerged} disabled={merging} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text, fontSize: 12, fontWeight: 700, cursor: merging ? "wait" : "pointer" }}>
              <Download size={12} /> PNG
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => setSelected(new Set())} style={{ fontSize: 11.5, color: T.textDim, background: "transparent", border: "none", cursor: "pointer" }}>선택 해제</button>
          </div>
        )}
      </div>
    </div>
  );
}
