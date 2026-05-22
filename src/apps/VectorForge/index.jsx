import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Image as ImageIcon, Loader2, ExternalLink, RotateCcw,
} from 'lucide-react';
import { vectorize } from './services/vectorize';

const ACCENT = '#3DDC84';
const ADOBE = '#FA0F00';

// 변환 결과 메타.
const EMPTY_STATS = { outerN: 0, holeN: 0, totalPts: 0, sizeKB: 0 };

function SliderField({ label, value, min, max, step, onChange, format }) {
  return (
    <div className="flex items-center gap-2.5 px-3 border-r border-zinc-800 shrink-0">
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="vector-slider w-[68px] h-[2px] bg-zinc-800 rounded-full appearance-none cursor-pointer"
      />
      <span className="text-[11px] font-bold tabular-nums min-w-[28px] text-right" style={{ color: ACCENT }}>
        {format ? format(value) : value}
      </span>
    </div>
  );
}

export default function VectorForgeApp() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const svgContainerRef = useRef(null);
  const debounceRef = useRef(null);

  // 옵션
  const [threshold, setThreshold] = useState(128);
  const [blur, setBlur] = useState(0.5);
  const [alpha, setAlpha] = useState(1.0);
  const [optimize, setOptimize] = useState(0.2);
  const [turd, setTurd] = useState(8);
  const [invert, setInvert] = useState(false);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fgColor, setFgColor] = useState('#000000');

  // 상태
  const [loaded, setLoaded] = useState(false);
  const [imgMeta, setImgMeta] = useState({ width: 0, height: 0, originalW: 0, originalH: 0 });
  const [svgStr, setSvgStr] = useState('');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ pct: 0, msg: '벡터화 중...' });
  const [isDragging, setIsDragging] = useState(false);

  const run = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return;
    setProcessing(true);
    setProgress({ pct: 0, msg: '벡터화 중...' });
    // 다음 tick 으로 미뤄 UI가 spinner 를 그릴 시간을 줌.
    setTimeout(() => {
      try {
        const result = vectorize(canvas, {
          threshold, blur, alpha, optimize, turd, invert, fg: fgColor, bg: bgColor,
        }, (pct, msg) => setProgress({ pct, msg }));
        setSvgStr(result.svg);
        setStats(result.stats);
      } catch (e) {
        console.error('[VectorForge] vectorize failed', e);
      } finally {
        setProcessing(false);
      }
    }, 50);
  }, [threshold, blur, alpha, optimize, turd, invert, fgColor, bgColor]);

  // 옵션 변경 시 디바운스 재실행.
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, 120);
    return () => clearTimeout(debounceRef.current);
  }, [threshold, blur, alpha, optimize, turd, invert, fgColor, bgColor, loaded, run]);

  // SVG 문자열 → DOM 삽입 (innerHTML). svg 요소 크기 보정.
  useEffect(() => {
    if (!svgContainerRef.current) return;
    svgContainerRef.current.innerHTML = svgStr || '';
    const svgEl = svgContainerRef.current.querySelector('svg');
    if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.maxHeight = '100%'; }
  }, [svgStr]);

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // 최대 800×700 으로 다운스케일 (메모리·성능).
        const MAX_W = 800, MAX_H = 700;
        let w = img.width, h = img.height;
        const originalW = img.width, originalH = img.height;
        if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
        if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        setImgMeta({ width: w, height: h, originalW, originalH });
        setLoaded(true);
      };
      img.src = String(e.target.result);
    };
    r.readAsDataURL(file);
  }, []);

  const handleDownload = useCallback(() => {
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vectorized_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }, [svgStr]);

  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    setLoaded(false);
    setSvgStr('');
    setStats(EMPTY_STATS);
    setImgMeta({ width: 0, height: 0, originalW: 0, originalH: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

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

      {/* ─── Toolbar (옵션 + 파일 액션) ─── */}
      <div className="h-[52px] flex items-stretch border-b border-zinc-800 bg-[#18181B] shrink-0">
        <div className="flex-1 flex items-center overflow-x-auto vector-custom-scrollbar">
          <SliderField label="임계값"     value={threshold} min={1}   max={254}  step={1}     onChange={setThreshold} format={(v) => Math.round(v)} />
          <SliderField label="블러"       value={blur}      min={0}   max={3}    step={0.5}   onChange={setBlur}      format={(v) => v.toFixed(1)} />
          <SliderField label="부드럽기"   value={alpha}     min={0}   max={1.34} step={0.01}  onChange={setAlpha}     format={(v) => v.toFixed(1)} />
          <SliderField label="최적화"     value={optimize}  min={0}   max={1}    step={0.05}  onChange={setOptimize}  format={(v) => v.toFixed(1)} />
          <SliderField label="노이즈제거" value={turd}      min={0}   max={100}  step={1}     onChange={setTurd}      format={(v) => Math.round(v)} />

          {/* 반전 토글 */}
          <label className="flex items-center gap-2 px-3 border-r border-zinc-800 shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
              className="w-[13px] h-[13px] cursor-pointer"
              style={{ accentColor: ACCENT }}
            />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">반전</span>
          </label>

          {/* Color pickers */}
          <div className="flex items-center gap-2 px-3 border-r border-zinc-800 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">배경</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-[22px] h-[22px] border border-zinc-700 rounded p-[1px] bg-black cursor-pointer"
            />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">전경</span>
            <input
              type="color"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              className="w-[22px] h-[22px] border border-zinc-700 rounded p-[1px] bg-black cursor-pointer"
            />
          </div>
        </div>

        {/* 파일 액션 */}
        <div className="flex items-center gap-2 px-4 border-l border-zinc-800 shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-bold transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> 열기
          </button>
          {loaded && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-bold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!svgStr || processing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-black"
            style={{ background: ACCENT }}
          >
            <Download className="w-3.5 h-3.5" /> SVG 저장
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/bmp"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) loadFile(e.target.files[0]); e.target.value = ''; }}
          />
        </div>
      </div>

      {/* ─── Workspace ─── */}
      <div className="flex-1 grid grid-cols-2 min-h-0">
        {/* Left — 원본 */}
        <div className="flex flex-col min-h-0 border-r border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#18181B] shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">원본 이미지</span>
            <span className="text-[10px] text-zinc-500">
              {imgMeta.width ? (
                <><b className="text-zinc-300 font-bold">{imgMeta.width}×{imgMeta.height}</b></>
              ) : '—'}
            </span>
          </div>
          <div
            onClick={() => { if (!loaded) fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
            }}
            className={`flex-1 flex items-center justify-center relative overflow-hidden min-h-0 vector-checker ${loaded ? 'cursor-default' : 'cursor-pointer'} ${isDragging ? 'outline outline-2 outline-dashed -outline-offset-2' : ''}`}
            style={isDragging ? { outlineColor: ACCENT } : undefined}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
              style={{ display: loaded ? 'block' : 'none' }}
            />
            {!loaded && (
              <div className="flex flex-col items-center gap-3 text-zinc-500 text-center px-5 pointer-events-none">
                <ImageIcon className="w-11 h-11 opacity-25" />
                <p className="text-[11px] leading-relaxed">이미지를 드래그하거나<br />클릭하여 업로드</p>
                <small className="text-[9px] opacity-60">PNG · JPG · WEBP · BMP</small>
              </div>
            )}
          </div>
          <div className="h-7 flex items-center gap-5 px-4 border-t border-zinc-800 bg-[#18181B] shrink-0 text-[9px] text-zinc-500 tracking-wide">
            <span>크기: <b className="text-zinc-300 font-semibold">{imgMeta.width ? `${imgMeta.width}×${imgMeta.height}` : '—'}</b></span>
            <span>원본: <b className="text-zinc-300 font-semibold">{imgMeta.originalW ? `${imgMeta.originalW}×${imgMeta.originalH}` : '—'}</b></span>
          </div>
        </div>

        {/* Right — 벡터 결과 */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#18181B] shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">벡터 결과</span>
            <span className="text-[10px] text-zinc-500">
              {svgStr ? (
                <>외곽 <b className="text-zinc-300 font-bold">{stats.outerN}</b> · 구멍 <b className="text-zinc-300 font-bold">{stats.holeN}</b> · {stats.totalPts} pts · {stats.sizeKB}KB</>
              ) : '—'}
            </span>
          </div>
          <div className="flex-1 relative overflow-hidden min-h-0 vector-checker flex items-center justify-center">
            {!svgStr && !processing && (
              <div className="flex flex-col items-center gap-3 text-zinc-500 text-center px-5 pointer-events-none">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-25">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <p className="text-[11px] leading-relaxed">이미지를 불러오면<br />자동으로 변환됩니다</p>
              </div>
            )}
            <div
              ref={svgContainerRef}
              className="flex items-center justify-center p-2"
              style={{ display: svgStr ? 'flex' : 'none', maxWidth: '100%', maxHeight: '100%' }}
            />
            {processing && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
                <div className="text-[11px] font-bold tracking-wider text-zinc-400">{progress.msg}</div>
                <div className="w-[160px] h-[2px] bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${progress.pct}%`, background: ACCENT }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="h-7 flex items-center gap-5 px-4 border-t border-zinc-800 bg-[#18181B] shrink-0 text-[9px] text-zinc-500 tracking-wide">
            <span>패스: <b className="text-zinc-300 font-semibold">{svgStr ? stats.outerN : '—'}</b></span>
            <span>구멍: <b className="text-zinc-300 font-semibold">{svgStr ? stats.holeN : '—'}</b></span>
            <span>포인트: <b className="text-zinc-300 font-semibold">{svgStr ? stats.totalPts : '—'}</b></span>
            <span>파일: <b className="text-zinc-300 font-semibold">{svgStr ? `${stats.sizeKB}KB` : '—'}</b></span>
          </div>
        </div>
      </div>

      {/* ─── Adobe Express 안내 배너 ─── */}
      <div className="h-[58px] flex items-center border-t border-zinc-800 bg-[#18181B] shrink-0">
        <div className="flex items-center gap-3 px-5 border-r border-zinc-800 h-full shrink-0">
          <div
            className="w-[26px] h-[26px] rounded flex items-center justify-center text-[12px] font-black text-white shrink-0"
            style={{ background: ADOBE }}
          >A</div>
          <div className="flex flex-col gap-0.5">
            <div className="text-[11px] font-bold text-zinc-200 tracking-wide">Adobe Express</div>
            <div className="text-[9px] text-zinc-500">고품질 벡터 변환</div>
          </div>
        </div>
        <div className="flex-1 px-5 text-[11px] text-zinc-400 leading-snug">
          위 결과가 만족스럽지 않다면 <b className="text-zinc-200">Adobe Illustrator 엔진</b> 기반 Adobe Express를 이용해보세요.<br />
          이미지를 새 탭에서 직접 업로드하면 훨씬 정교한 SVG로 변환할 수 있습니다. <b className="text-zinc-200">무료</b>로 제공됩니다.
        </div>
        <div className="flex items-center gap-2 px-4 border-l border-zinc-800 h-full shrink-0">
          <a
            href="https://www.adobe.com/express/feature/image/convert/svg"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold text-white transition-all active:scale-95 hover:brightness-110"
            style={{ background: ADOBE }}
          >
            <ExternalLink className="w-3 h-3" /> Adobe Express로 변환하기
          </a>
        </div>
      </div>
    </div>
  );
}
