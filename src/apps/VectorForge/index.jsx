// Vector Forge — 비트맵(타이포코어 흑백 타이틀 · 마스크포지 투명 PNG) → SVG 벡터.
// 엔진: potrace(wasm, 기본) / Legacy(Marching Squares, 비교용). 원본 해상도 유지(MAX_EDGE 4096).
// 수신: typecore-sovereign / typecore-breeze / mask-forge 가 navigate('vector-forge', { image:{url} }) 로 전송.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Image as ImageIcon, Loader2, ExternalLink, RotateCcw, SlidersHorizontal,
  Copy, Check, Layers, FlipHorizontal2, Wand2,
} from 'lucide-react';
import { useGlobal } from '../../context/GlobalContext';
import { APP_MAP } from '../../config/apps';
import { vectorize, DEFAULT_OPTIONS, ENGINES, PRESETS, REFINE_LEVELS, MAX_EDGE } from './services/vectorize';

const ACCENT = APP_MAP['vector-forge']?.color || '#3DDC84';
const ADOBE = '#FA0F00';

const EMPTY_STATS = { outerN: 0, holeN: 0, totalPts: 0, rawPts: 0, sizeKB: 0, width: 0, height: 0, threshold: 0, inkRatio: 0, engine: 'potrace', refine: { level: 'off', snapAngles: [], snapped: 0 } };

function SliderField({ label, value, min, max, step, onChange, format, disabled, title }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 border-r border-zinc-800 shrink-0 ${disabled ? 'opacity-40' : ''}`} title={title}>
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="vector-slider w-[68px] h-[2px] bg-zinc-800 rounded-full appearance-none cursor-pointer"
      />
      <span className="text-[11px] font-bold tabular-nums min-w-[28px] text-right" style={{ color: ACCENT }}>
        {format ? format(value) : value}
      </span>
    </div>
  );
}

function Toggle({ label, checked, onChange, title }) {
  return (
    <label className="flex items-center gap-2 px-3 border-r border-zinc-800 shrink-0 cursor-pointer h-full" title={title}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-[13px] h-[13px] cursor-pointer" style={{ accentColor: ACCENT }} />
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">{label}</span>
    </label>
  );
}

const selectCls = 'bg-[#0f0f11] border border-zinc-700 rounded text-[10px] font-bold text-zinc-200 px-1.5 py-1 outline-none focus:border-zinc-500';

export default function VectorForgeApp() {
  const { payload, clearPayload } = useGlobal();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const debounceRef = useRef(null);
  const runIdRef = useRef(0);
  const consumedPayloadRef = useRef(null);

  const [opts, setOpts] = useState(DEFAULT_OPTIONS);
  const [preset, setPreset] = useState('title');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const setOpt = useCallback((key, value) => setOpts((prev) => ({ ...prev, [key]: value })), []);
  const applyPreset = useCallback((id) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) setOpts((prev) => ({ ...prev, ...p.values }));
  }, []);

  const [loaded, setLoaded] = useState(false);
  const [imgMeta, setImgMeta] = useState({ width: 0, height: 0, originalW: 0, originalH: 0 });
  const [srcDataUrl, setSrcDataUrl] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [svgStr, setSvgStr] = useState('');
  const [svgUrl, setSvgUrl] = useState('');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, msg: '벡터화 중...' });
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [compare, setCompare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');

  // SVG 문자열 → object URL (원본과 같은 <img> 로 그려 비교 오버레이가 정확히 정렬되게). 이전 URL 은 즉시 revoke.
  const svgUrlRef = useRef('');
  const publishSvg = useCallback((svg) => {
    if (svgUrlRef.current) URL.revokeObjectURL(svgUrlRef.current);
    const url = svg ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })) : '';
    svgUrlRef.current = url;
    setSvgStr(svg);
    setSvgUrl(url);
  }, []);
  useEffect(() => () => { if (svgUrlRef.current) URL.revokeObjectURL(svgUrlRef.current); }, []);

  const run = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return;
    const id = ++runIdRef.current;
    setProcessing(true);
    setError('');
    setProgress({ pct: 0, msg: '벡터화 중...' });
    try {
      const result = await vectorize(canvas, opts, (pct, msg) => { if (id === runIdRef.current) setProgress({ pct, msg }); });
      if (id !== runIdRef.current) return;
      publishSvg(result.svg);
      setStats(result.stats);
    } catch (e) {
      console.error('[VectorForge] vectorize failed', e);
      if (id === runIdRef.current) setError(e.message || String(e));
    } finally {
      if (id === runIdRef.current) setProcessing(false);
    }
  }, [opts, publishSvg]);

  // 옵션 변경 시 디바운스 재실행.
  useEffect(() => {
    if (!loaded) return undefined;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, 150);
    return () => clearTimeout(debounceRef.current);
  }, [opts, loaded, run]);

  const loadFile = useCallback((file, meta = {}) => {
    if (!file || !file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // 원본 해상도 유지. MAX_EDGE 초과분만 비율 유지 다운스케일(메모리 가드).
        const originalW = img.width; const originalH = img.height;
        let w = originalW; let h = originalH;
        const longest = Math.max(w, h);
        if (longest > MAX_EDGE) { const k = MAX_EDGE / longest; w = Math.round(w * k); h = Math.round(h * k); }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        setImgMeta({ width: w, height: h, originalW, originalH });
        setSrcDataUrl(String(e.target.result));
        setSourceLabel(meta.sourceLabel || '');
        publishSvg('');
        setStats(EMPTY_STATS);
        setLoaded(true);
        setStatus('');
      };
      img.src = String(e.target.result);
    };
    r.readAsDataURL(file);
  }, [publishSvg]);

  // 다른 앱(타이포코어·마스크포지)에서 navigate 로 보낸 이미지 자동 로드 — MaskForge 와 같은 패턴.
  useEffect(() => {
    if (!payload || payload.target !== 'vector-forge' || !payload.timestamp) return undefined;
    if (consumedPayloadRef.current === payload.timestamp) return undefined;
    const url = payload.image?.url;
    if (!url) return undefined;
    consumedPayloadRef.current = payload.timestamp;
    let cancelled = false;
    (async () => {
      try {
        setStatus('이미지 불러오는 중…');
        const res = await fetch(url, url.startsWith('data:') ? undefined : { mode: 'cors' });
        if (!res.ok) throw new Error(`이미지 fetch ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const ext = (blob.type && blob.type.split('/')[1]) || 'png';
        const file = new File([blob], `incoming_${payload.timestamp}.${ext}`, { type: blob.type || 'image/png' });
        const from = APP_MAP[payload.source]?.label || payload.image?.metadata?.from || payload.source || '';
        loadFile(file, { sourceLabel: from });
        const p = payload.params || {};
        // 송신 앱이 힌트를 주면 반영 — 마스크포지 투명 PNG 는 흰 글자일 수 있어 invert 힌트를 받는다.
        setOpts((prev) => ({
          ...prev,
          ...(typeof p.invert === 'boolean' ? { invert: p.invert } : {}),
          ...(p.preset && PRESETS.some((x) => x.id === p.preset) ? PRESETS.find((x) => x.id === p.preset).values : {}),
        }));
        if (p.preset && PRESETS.some((x) => x.id === p.preset)) setPreset(p.preset);
        try { clearPayload(); } catch { /* ignore */ }
      } catch (e) {
        if (!cancelled) {
          console.error('[VectorForge] payload 이미지 로드 실패', e);
          setStatus(`불러오기 실패: ${e.message || e}`);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target]);

  const handleDownload = useCallback(() => {
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vectorforge_${imgMeta.width}x${imgMeta.height}_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }, [svgStr, imgMeta]);

  const handleCopy = useCallback(async () => {
    if (!svgStr) return;
    try {
      await navigator.clipboard.writeText(svgStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setStatus(`복사 실패: ${e.message || e}`);
    }
  }, [svgStr]);

  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    runIdRef.current++;
    setLoaded(false);
    publishSvg('');
    setStats(EMPTY_STATS);
    setSrcDataUrl('');
    setSourceLabel('');
    setError('');
    setStatus('');
    setImgMeta({ width: 0, height: 0, originalW: 0, originalH: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [publishSvg]);

  const inkPct = Math.round(stats.inkRatio * 100);
  const suggestInvert = loaded && svgStr && stats.engine === 'potrace' && stats.inkRatio > 0.55;
  const downscaled = imgMeta.originalW > 0 && imgMeta.originalW !== imgMeta.width;

  return (
    <div className="flex flex-col h-full w-full bg-[#09090B] text-zinc-100 font-sans overflow-hidden">
      <style>{`
        .vector-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 11px; height: 11px;
          background: #e4e4e7; border-radius: 50%; cursor: pointer;
          transition: background 0.15s;
        }
        .vector-slider:hover::-webkit-slider-thumb { background: ${ACCENT}; }
        .vector-slider::-moz-range-thumb {
          width: 11px; height: 11px; background: #e4e4e7;
          border: none; border-radius: 50%; cursor: pointer;
        }
        .vector-slider:hover::-moz-range-thumb { background: ${ACCENT}; }
        .vector-checker {
          background: repeating-conic-gradient(#1a1a1a 0% 25%, #151515 0% 50%) 0 0 / 14px 14px;
        }
        .vector-custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .vector-custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .vector-custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.2); border-radius: 4px; }
      `}</style>

      {/* ─── Toolbar ─── */}
      <div className="h-[52px] flex items-stretch border-b border-zinc-800 bg-[#18181B] shrink-0">
        <div className="flex-1 flex items-center overflow-x-auto vector-custom-scrollbar">
          {/* 프리셋 */}
          <div className="flex items-center gap-2 px-3 border-r border-zinc-800 shrink-0 h-full">
            <Wand2 size={12} className="text-zinc-500" />
            <select value={preset} onChange={(e) => applyPreset(e.target.value)} className={selectCls} title="Image Trace 프리셋에 대응하는 potrace 값 묶음">
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          {/* 임계값 + 자동 */}
          <Toggle label="자동 임계값" checked={opts.autoThreshold} onChange={(v) => setOpt('autoThreshold', v)} title="Otsu 알고리즘으로 흑백 분리점을 자동 계산" />
          <SliderField label="임계값" value={opts.autoThreshold && stats.threshold ? stats.threshold : opts.threshold} min={1} max={254} step={1}
            onChange={(v) => setOpt('threshold', v)} disabled={opts.autoThreshold} format={(v) => Math.round(v)} title="이 휘도 미만을 잉크로 판정" />
          <Toggle label="반전" checked={opts.invert} onChange={(v) => setOpt('invert', v)} title="흰 글자 / 검정 배경일 때 켬" />
          <div className="flex items-center gap-2 px-3 border-r border-zinc-800 shrink-0 h-full" title="추적 후 정리: 직선화 · 꺾임 복원 · 각도 스냅. 진짜 곡선은 유지">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">직선 정리</span>
            <select value={opts.refine} onChange={(e) => setOpt('refine', e.target.value)} className={selectCls}>
              {REFINE_LEVELS.map((l) => <option key={l.id} value={l.id} title={l.desc}>{l.label}</option>)}
            </select>
          </div>

          {showAdvanced && <>
            <SliderField label="코너" value={opts.alphaMax} min={0} max={1.34} step={0.01} onChange={(v) => setOpt('alphaMax', v)} format={(v) => v.toFixed(2)} title="낮을수록 꼭짓점을 코너로 보존, 높을수록 곡선화 (potrace alphamax)" />
            <SliderField label="노이즈" value={opts.turdSize} min={0} max={50} step={1} onChange={(v) => setOpt('turdSize', v)} format={(v) => Math.round(v)} title="이 면적(px²) 이하의 얼룩 제거 (turdsize)" />
            <SliderField label="곡선 오차" value={opts.optTolerance} min={0} max={1} step={0.01} onChange={(v) => setOpt('optTolerance', v)} format={(v) => v.toFixed(2)} title="작을수록 원본 충실·앵커 증가 (opttolerance)" />
            <Toggle label="곡선 최적화" checked={opts.optCurve} onChange={(v) => setOpt('optCurve', v)} title="인접 베지어 병합 — 끄면 앵커가 크게 늘어남" />
            <SliderField label="블러" value={opts.blur} min={0} max={2} step={0.25} onChange={(v) => setOpt('blur', v)} format={(v) => v.toFixed(2)} title="이진화 전 미세 블러. 계단 노이즈가 심할 때만" />
            <div className="flex items-center gap-2 px-3 border-r border-zinc-800 shrink-0 h-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">엔진</span>
              <select value={opts.engine} onChange={(e) => setOpt('engine', e.target.value)} className={selectCls}>
                {ENGINES.map((en) => <option key={en.id} value={en.id} title={en.desc}>{en.label}</option>)}
              </select>
            </div>
          </>}

          {/* 색 / 배경 */}
          <Toggle label="투명 배경" checked={opts.transparentBg} onChange={(v) => setOpt('transparentBg', v)} />
          <div className="flex items-center gap-2 px-3 border-r border-zinc-800 shrink-0">
            {!opts.transparentBg && <>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">배경</span>
              <input type="color" value={opts.bg} onChange={(e) => setOpt('bg', e.target.value)} className="w-[22px] h-[22px] border border-zinc-700 rounded p-[1px] bg-black cursor-pointer" />
            </>}
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">전경</span>
            <input type="color" value={opts.fg} onChange={(e) => setOpt('fg', e.target.value)} className="w-[22px] h-[22px] border border-zinc-700 rounded p-[1px] bg-black cursor-pointer" />
          </div>
          <button onClick={() => setShowAdvanced((open) => !open)} aria-expanded={showAdvanced} className="h-full px-3 border-r border-zinc-800 text-[10px] font-bold text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal size={13} /> 세부 조정 {showAdvanced ? '−' : '+'}
          </button>
        </div>

        {/* 파일 액션 */}
        <div className="flex items-center gap-2 px-4 border-l border-zinc-800 shrink-0">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-bold transition-colors">
            <Upload className="w-3.5 h-3.5" /> 열기
          </button>
          {loaded && (
            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-bold transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
          )}
          <button onClick={handleCopy} disabled={!svgStr || processing} title="SVG 코드를 클립보드로 — Figma·일러스트레이터에 바로 붙여넣기" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            {copied ? <><Check className="w-3.5 h-3.5" style={{ color: ACCENT }} /> 복사됨</> : <><Copy className="w-3.5 h-3.5" /> SVG 복사</>}
          </button>
          <button onClick={handleDownload} disabled={!svgStr || processing} className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-black" style={{ background: ACCENT }}>
            <Download className="w-3.5 h-3.5" /> SVG 저장
          </button>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/bmp" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) loadFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
      </div>

      {/* ─── Workspace ─── */}
      <div className="flex-1 grid grid-cols-2 min-h-0">
        {/* Left — 원본 */}
        <div className="flex flex-col min-h-0 border-r border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#18181B] shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              원본 이미지
              {sourceLabel && <span className="ml-2 normal-case tracking-normal font-bold px-1.5 py-0.5 rounded" style={{ color: ACCENT, background: `${ACCENT}1A` }}>{sourceLabel} 에서 수신</span>}
            </span>
            <span className="text-[10px] text-zinc-500">
              {imgMeta.width ? <b className="text-zinc-300 font-bold">{imgMeta.width}×{imgMeta.height}</b> : '—'}
              {downscaled && <span className="ml-1.5 text-amber-400">↓ {MAX_EDGE}px 제한</span>}
            </span>
          </div>
          <div
            onClick={() => { if (!loaded) fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]); }}
            className={`flex-1 flex items-center justify-center relative overflow-hidden min-h-0 vector-checker p-2 ${loaded ? 'cursor-default' : 'cursor-pointer'} ${isDragging ? 'outline outline-2 outline-dashed -outline-offset-2' : ''}`}
            style={isDragging ? { outlineColor: ACCENT } : undefined}
          >
            <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" style={{ display: loaded ? 'block' : 'none' }} />
            {!loaded && (
              <div className="flex flex-col items-center gap-3 text-zinc-500 text-center px-5 pointer-events-none">
                <ImageIcon className="w-11 h-11 opacity-25" />
                <p className="text-[11px] leading-relaxed">{status || <>이미지를 드래그하거나<br />클릭하여 업로드</>}</p>
                <small className="text-[9px] opacity-60">PNG · JPG · WEBP · BMP — 타이포코어 · 마스크포지에서 "Vector Forge 로 보내기"</small>
              </div>
            )}
          </div>
          <div className="h-7 flex items-center gap-5 px-4 border-t border-zinc-800 bg-[#18181B] shrink-0 text-[9px] text-zinc-500 tracking-wide">
            <span>처리: <b className="text-zinc-300 font-semibold">{imgMeta.width ? `${imgMeta.width}×${imgMeta.height}` : '—'}</b></span>
            <span>원본: <b className="text-zinc-300 font-semibold">{imgMeta.originalW ? `${imgMeta.originalW}×${imgMeta.originalH}` : '—'}</b></span>
            {svgStr && stats.engine === 'potrace' && <span>임계값: <b className="text-zinc-300 font-semibold">{stats.threshold}</b>{opts.autoThreshold ? ' (auto)' : ''}</span>}
            {svgStr && stats.engine === 'potrace' && <span>잉크: <b className="text-zinc-300 font-semibold">{inkPct}%</b></span>}
            {suggestInvert && (
              <button onClick={() => setOpt('invert', !opts.invert)} className="ml-auto flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold">
                <FlipHorizontal2 size={11} /> 잉크 비율이 높음 — 반전 권장
              </button>
            )}
            {status && loaded && <span className="ml-auto text-amber-400">{status}</span>}
          </div>
        </div>

        {/* Right — 벡터 결과 */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#18181B] shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-3">
              벡터 결과
              {svgStr && (
                <button onClick={() => setCompare((v) => !v)} className={`flex items-center gap-1 normal-case tracking-normal font-bold px-1.5 py-0.5 rounded border transition-colors ${compare ? 'text-black' : 'text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}
                  style={compare ? { background: ACCENT, borderColor: ACCENT } : undefined} title="원본을 반투명으로 겹쳐 윤곽 오차 확인">
                  <Layers size={11} /> 원본 겹쳐보기
                </button>
              )}
            </span>
            <span className="text-[10px] text-zinc-500">
              {svgStr ? <>외곽 <b className="text-zinc-300 font-bold">{stats.outerN}</b> · 구멍 <b className="text-zinc-300 font-bold">{stats.holeN}</b> · {stats.totalPts} pts · {stats.sizeKB}KB</> : '—'}
            </span>
          </div>
          <div className="flex-1 relative overflow-hidden min-h-0 vector-checker flex items-center justify-center p-2">
            {!svgStr && !processing && !error && (
              <div className="flex flex-col items-center gap-3 text-zinc-500 text-center px-5 pointer-events-none">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-25">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <p className="text-[11px] leading-relaxed">이미지를 불러오면<br />자동으로 변환됩니다</p>
              </div>
            )}
            {error && !processing && (
              <div className="text-[11px] text-rose-400 text-center px-5">변환 실패: {error}</div>
            )}
            {svgUrl && (
              <div className="relative w-full h-full flex items-center justify-center">
                {compare && srcDataUrl && (
                  <img src={srcDataUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ opacity: 0.4, filter: 'invert(0.15) sepia(1) hue-rotate(320deg) saturate(3)' }} />
                )}
                <img src={svgUrl} alt="vector result" className="relative w-full h-full object-contain" style={compare ? { opacity: 0.85 } : undefined} />
              </div>
            )}
            {processing && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
                <div className="text-[11px] font-bold tracking-wider text-zinc-400">{progress.msg}</div>
                <div className="w-[160px] h-[2px] bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${progress.pct}%`, background: ACCENT }} />
                </div>
              </div>
            )}
          </div>
          <div className="h-7 flex items-center gap-5 px-4 border-t border-zinc-800 bg-[#18181B] shrink-0 text-[9px] text-zinc-500 tracking-wide">
            <span>엔진: <b className="text-zinc-300 font-semibold">{svgStr ? (ENGINES.find((e) => e.id === stats.engine)?.label || stats.engine) : '—'}</b></span>
            <span>패스: <b className="text-zinc-300 font-semibold">{svgStr ? stats.outerN : '—'}</b></span>
            <span>구멍: <b className="text-zinc-300 font-semibold">{svgStr ? stats.holeN : '—'}</b></span>
            <span>앵커: <b className="text-zinc-300 font-semibold">{svgStr ? stats.totalPts : '—'}</b>{svgStr && stats.rawPts && stats.rawPts !== stats.totalPts ? <span className="text-zinc-600"> (정리 전 {stats.rawPts})</span> : null}</span>
            {svgStr && stats.refine?.snapAngles?.length > 0 && (
              <span title="각도 스냅에 쓰인 주 방향">스냅: <b className="text-zinc-300 font-semibold">{stats.refine.snapAngles.map((a) => `${a}°`).join(' · ')}</b></span>
            )}
            <span>파일: <b className="text-zinc-300 font-semibold">{svgStr ? `${stats.sizeKB}KB` : '—'}</b></span>
          </div>
        </div>
      </div>

      {/* ─── 고품질 경로 안내 ─── */}
      <div className="h-[58px] flex items-center border-t border-zinc-800 bg-[#18181B] shrink-0">
        <div className="flex items-center gap-3 px-5 border-r border-zinc-800 h-full shrink-0">
          <div className="w-[26px] h-[26px] rounded flex items-center justify-center text-[12px] font-black text-white shrink-0" style={{ background: ADOBE }}>Ai</div>
          <div className="flex flex-col gap-0.5">
            <div className="text-[11px] font-bold text-zinc-200 tracking-wide">Illustrator Image Trace</div>
            <div className="text-[9px] text-zinc-500">최종 납품용 .ai / .svg</div>
          </div>
        </div>
        <div className="flex-1 px-5 text-[11px] text-zinc-400 leading-snug">
          납품용 벡터가 필요하면 Claude Code 에서 <b className="text-zinc-200 font-mono">/nexus-vector-forge</b> 스킬로 PNG 를 넘기세요.
          로컬 Illustrator 의 Image Trace 를 자동 실행해 <b className="text-zinc-200">.ai + .svg</b> 를 만들고 원본 대비 QA 까지 수행합니다.
          Illustrator 가 없는 환경에서는 Adobe Express 웹 변환을 쓸 수 있습니다.
        </div>
        <div className="flex items-center gap-2 px-4 border-l border-zinc-800 h-full shrink-0">
          <a href="https://www.adobe.com/express/feature/image/convert/svg" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold text-white transition-all active:scale-95 hover:brightness-110" style={{ background: ADOBE }}>
            <ExternalLink className="w-3 h-3" /> Adobe Express
          </a>
        </div>
      </div>
    </div>
  );
}
