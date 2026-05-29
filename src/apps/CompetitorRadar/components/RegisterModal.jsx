import { useState, useCallback } from "react";
import { X, Link2, Image as ImageIcon, Loader2 } from "lucide-react";
import { useTheme } from "../../../context/GlobalContext";
import { fileToDataUrl, compressDataUrl, extractImageFile } from "../utils/image";
import { COMPETITOR_SEED, CATEGORY_OPTIONS, CATEGORY_LABELS } from "../constants/competitorCriteria";

// 드롭/붙여넣기/파일선택 이미지 입력 한 칸.
function ImageDrop({ label, dataUrl, onPick, onClear, color, T }) {
  const [over, setOver] = useState(false);
  const handle = useCallback(async (e) => {
    e.preventDefault(); setOver(false);
    const file = extractImageFile(e) || e.target?.files?.[0];
    if (file) onPick(await fileToDataUrl(file));
  }, [onPick]);
  return (
    <div className="flex-1">
      <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.textMuted }}>{label}</div>
      <label
        onDrop={handle} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onPaste={handle}
        className="relative flex items-center justify-center rounded-lg border border-dashed cursor-pointer overflow-hidden h-36 transition-colors"
        style={{ borderColor: over ? color : T.border, background: T.bg }}>
        {dataUrl ? (
          <>
            <img src={dataUrl} alt={label} className="w-full h-full object-contain" />
            <button type="button" onClick={(e) => { e.preventDefault(); onClear(); }}
              className="absolute top-1 right-1 p-1 rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}>
              <X className="w-3 h-3 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center px-3" style={{ color: T.textDim }}>
            <ImageIcon className="w-5 h-5" />
            <span className="text-[10px] leading-tight">클릭·드롭·붙여넣기<br/>(전체 페이지 스크린샷)</span>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={handle} />
      </label>
    </div>
  );
}

export default function RegisterModal({ color, onClose, onRegister }) {
  const T = useTheme();
  const [competitor, setCompetitor] = useState(COMPETITOR_SEED[0]);
  const [customCompetitor, setCustomCompetitor] = useState("");
  const [game, setGame] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState("promotion");
  const [pcImg, setPcImg] = useState(null);
  const [mobileImg, setMobileImg] = useState(null);
  const [busy, setBusy] = useState(false);

  const resolvedCompetitor = competitor === "기타" ? customCompetitor.trim() : competitor;
  const canSubmit = !!resolvedCompetitor && (!!pcImg || !!mobileImg) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const full = pcImg ? await compressDataUrl(pcImg, 1280, 0.82) : null;
      const preview = pcImg ? await compressDataUrl(pcImg, 480, 0.75) : (mobileImg ? await compressDataUrl(mobileImg, 480, 0.75) : null);
      const mobile = mobileImg ? await compressDataUrl(mobileImg, 900, 0.8) : null;
      await onRegister({ competitor: resolvedCompetitor, game: game.trim(), sourceUrl: sourceUrl.trim(), category, images: { full, preview, mobile } });
    } finally { setBusy(false); }
  };

  const fieldStyle = { background: T.bg, border: `1px solid ${T.border}`, color: T.text };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
        style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-base font-bold">경쟁사 디자인 등록</div>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: T.hoverBg }}><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.textMuted }}>경쟁사</div>
            <select value={competitor} onChange={(e) => setCompetitor(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={fieldStyle}>
              {COMPETITOR_SEED.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {competitor === "기타" && (
              <input value={customCompetitor} onChange={(e) => setCustomCompetitor(e.target.value)} placeholder="경쟁사명 입력"
                className="w-full mt-2 px-3 py-2 rounded-lg text-sm focus:outline-none" style={fieldStyle} />
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.textMuted }}>게임/IP (선택)</div>
            <input value={game} onChange={(e) => setGame(e.target.value)} placeholder="예: 리니지W"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={fieldStyle} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.textMuted }}>원본 URL (중복 판정 키)</div>
            <div className="relative">
              <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textDim }} />
              <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none" style={fieldStyle} />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: T.textMuted }}>유형</div>
          <div className="flex gap-1.5">
            {CATEGORY_OPTIONS.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                style={category === c
                  ? { background: `${color}22`, color, border: `1px solid ${color}66` }
                  : { background: T.bg, color: T.textMuted, border: `1px solid ${T.border}` }}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-5">
          <ImageDrop label="PC 스크린샷" dataUrl={pcImg} onPick={setPcImg} onClear={() => setPcImg(null)} color={color} T={T} />
          <ImageDrop label="모바일 (선택)" dataUrl={mobileImg} onPick={setMobileImg} onClear={() => setMobileImg(null)} color={color} T={T} />
        </div>

        <button onClick={submit} disabled={!canSubmit}
          className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
          style={{ background: color, color: "#fff", opacity: canSubmit ? 1 : 0.4 }}>
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중…</> : "등록하고 분석"}
        </button>
        <p className="text-[10px] mt-2 text-center" style={{ color: T.textDim }}>
          등록 후 자동으로 트렌드 분석이 실행됩니다 · 같은 URL은 중복 등록되지 않습니다
        </p>
      </div>
    </div>
  );
}
