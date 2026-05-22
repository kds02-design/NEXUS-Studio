// LumKey — 영상 배경 제거 (루마키 / 스크린 / 크로마블랙 / 멀티플라이)
// UI 톤은 NEXUS Studio 의 RenderMatrix 와 통일: 외곽 p-5 + bg #09090B,
// 패널/사이드바 모두 rounded-2xl + border zinc-800 + bg #18181B + shadow-2xl.
// 폰트는 본문 Noto Sans KR, 모노스페이스 JetBrains Mono 로 통일.
//
// 글로벌 selector(`*`, `body`)는 `.lumkey-root` 스코프로 한정해 다른 앱 영역과 격리한다.
// 컨트롤 값은 useState 로 UI 에 바인딩하면서 동시에 ref 로도 보관 — RAF 콜백이 항상 최신값을 읽도록.
import { useCallback, useEffect, useRef, useState } from 'react';

const KEY_MODES = [
  { id: 'luma',         label: '루마키',     sub: '밝기 기반 / 타이포·글로우' },
  { id: 'screen',       label: '스크린',     sub: '합성 블렌드 / 파티클·불꽃' },
  { id: 'chroma-black', label: '크로마블랙', sub: '순수 검정 / 단순 배경' },
  { id: 'multiply',     label: '멀티플라이', sub: '곱하기 / 흰 배경 제거' },
];

const BG_PREVIEWS = {
  checker: { label: '체커보드',   img: 'repeating-conic-gradient(#1a1a1a 0% 25%, #0d0d0d 0% 50%)', size: '14px 14px' },
  black:   { label: '블랙',       color: '#000000' },
  white:   { label: '화이트',     color: '#ffffff' },
  red:     { label: '레드',       color: '#ff2244' },
  green:   { label: '그린',       color: '#00cc55' },
  blue:    { label: '블루',       color: '#2255ff' },
  yellow:  { label: '옐로우',     color: '#ffd600' },
  dark:    { label: '다크그레이', color: '#1a1a2e' },
};

function pickMimeType() {
  // VP9 with alpha 가 WebM 에서 투명도를 보존하는 유일한 광범위 지원 코덱.
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp09', 'video/webm'];
  for (const t of types) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  return '';
}

export default function LumKey() {
  // ── refs ──
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);
  const animFrameRef = useRef(null);
  const fpsCountRef  = useRef(0);
  const fpsLastRef   = useRef(0);
  const recorderRef  = useRef(null);
  const recChunksRef = useRef([]);
  const objectUrlRef = useRef(null);
  const runningRef   = useRef(false);
  // 컨트롤 값을 ref 로도 보관 — RAF 콜백이 항상 최신값 읽도록.
  const ctrlRef = useRef({
    keyMode: 'luma',
    threshold: 15, gain: 1.0, edge: 8, gamma: 1.0,
    useR: true, useG: true, useB: true,
    tintAmount: 0, tintR: 255, tintG: 255, tintB: 255,
  });

  // ── ui state ──
  const [hasVideo,     setHasVideo]     = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const [keyMode,      setKeyMode]      = useState('luma');
  const [threshold,    setThreshold]    = useState(15);
  const [gain,         setGain]         = useState(100);   // 100~400 → 1.0~4.0
  const [edge,         setEdge]         = useState(8);
  const [gamma,        setGamma]        = useState(100);   // 50~300 → 0.5~3.0
  const [useR,         setUseR]         = useState(true);
  const [useG,         setUseG]         = useState(true);
  const [useB,         setUseB]         = useState(true);
  const [tintPct,      setTintPct]      = useState(0);
  const [tintHex,      setTintHex]      = useState('#ffffff');
  const [bgKey,        setBgKey]        = useState('checker');
  const [fpsLabel,     setFpsLabel]     = useState('-- FPS');
  const [modeLabel,    setModeLabel]    = useState('대기중');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingUi,  setIsPlayingUi]  = useState(false);
  const [resLabel,     setResLabel]     = useState('—');
  const [alphaPct,     setAlphaPct]     = useState('—');
  const [isRec,        setIsRec]        = useState(false);
  const [codecBadge,   setCodecBadge]   = useState('');
  const [saveInfo,     setSaveInfo]     = useState('');
  const [exportPct,    setExportPct]    = useState(0);
  const [exportLabel,  setExportLabel]  = useState('');
  const [isExporting,  setIsExporting]  = useState(false);

  // ── ctrlRef sync ──
  useEffect(() => { ctrlRef.current.keyMode    = keyMode;       }, [keyMode]);
  useEffect(() => { ctrlRef.current.threshold  = threshold;     }, [threshold]);
  useEffect(() => { ctrlRef.current.gain       = gain / 100;    }, [gain]);
  useEffect(() => { ctrlRef.current.edge       = edge;          }, [edge]);
  useEffect(() => { ctrlRef.current.gamma      = gamma / 100;   }, [gamma]);
  useEffect(() => { ctrlRef.current.useR       = useR;          }, [useR]);
  useEffect(() => { ctrlRef.current.useG       = useG;          }, [useG]);
  useEffect(() => { ctrlRef.current.useB       = useB;          }, [useB]);
  useEffect(() => { ctrlRef.current.tintAmount = tintPct / 100; }, [tintPct]);
  useEffect(() => {
    ctrlRef.current.tintR = parseInt(tintHex.slice(1, 3), 16);
    ctrlRef.current.tintG = parseInt(tintHex.slice(3, 5), 16);
    ctrlRef.current.tintB = parseInt(tintHex.slice(5, 7), 16);
  }, [tintHex]);

  // ── core: 한 프레임 처리 (RGBA 픽셀 in-place 가공) ──
  const processFrame = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return;
    const w = c.width, h = c.height;
    if (!w || !h) return;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    const { keyMode: km, threshold: th, gain: g, edge: ed, gamma: gm,
            useR: uR, useG: uG, useB: uB, tintAmount: ta, tintR, tintG, tintB } = ctrlRef.current;

    let transparentCount = 0;
    const total = w * h;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gv = d[i + 1], b = d[i + 2];
      const luma = r * 0.2126 + gv * 0.7152 + b * 0.0722;
      const cr = uR ? r : 0;
      const cg = uG ? gv : 0;
      const cb = uB ? b : 0;
      const chanLuma = cr * 0.2126 + cg * 0.7152 + cb * 0.0722;

      let alpha = 0;
      if (km === 'luma') {
        let a = Math.pow(chanLuma / 255, 1 / gm) * 255 * g;
        a = Math.max(0, Math.min(255, a));
        if (a < th) {
          a = Math.max(0, a - Math.max(0, th - ed));
          a = a / Math.max(1, ed) * Math.min(a, ed);
        }
        alpha = a;
      } else if (km === 'screen') {
        const maxC = Math.max(r, gv, b);
        let a = (maxC / 255) * 255 * g;
        a = Math.max(0, Math.min(255, a));
        if (a < th + ed) a = Math.max(0, (a - th) / Math.max(1, ed) * ed);
        alpha = a;
      } else if (km === 'chroma-black') {
        if (luma <= th) alpha = 0;
        else if (luma <= th + ed) alpha = ((luma - th) / Math.max(1, ed)) * 255;
        else alpha = 255;
        alpha = Math.min(255, alpha * g);
      } else if (km === 'multiply') {
        let a = (1 - luma / 255) * 255 * g;
        a = Math.max(0, Math.min(255, a));
        if (a < th) a = Math.max(0, a - th + ed);
        alpha = a;
      }

      if (gm !== 1) alpha = Math.pow(alpha / 255, 1 / gm) * 255;
      alpha = Math.max(0, Math.min(255, alpha));

      if (ta > 0 && alpha > 0) {
        d[i]     = Math.round(d[i]     * (1 - ta) + tintR * ta);
        d[i + 1] = Math.round(d[i + 1] * (1 - ta) + tintG * ta);
        d[i + 2] = Math.round(d[i + 2] * (1 - ta) + tintB * ta);
      }
      d[i + 3] = Math.round(alpha);
      if (alpha < 128) transparentCount++;
    }

    ctx.putImageData(imgData, 0, 0);
    const visiblePct = Math.round((1 - transparentCount / total) * 100);
    setAlphaPct(visiblePct + '%');
  }, []);

  // ── render loop ──
  const renderLoop = useCallback(() => {
    if (!runningRef.current) return;
    processFrame();
    fpsCountRef.current++;
    const now = performance.now();
    if (now - fpsLastRef.current >= 1000) {
      setFpsLabel(String(fpsCountRef.current).padStart(2, '0') + ' FPS');
      fpsCountRef.current = 0;
      fpsLastRef.current = now;
    }
    animFrameRef.current = requestAnimationFrame(renderLoop);
  }, [processFrame]);

  const startProcessing = useCallback(() => {
    runningRef.current = true;
    setIsProcessing(true);
    fpsLastRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(renderLoop);
  }, [renderLoop]);

  const stopProcessing = useCallback(() => {
    runningRef.current = false;
    setIsProcessing(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
  }, []);

  // ── unmount cleanup ──
  useEffect(() => () => {
    runningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  // ── file load ──
  const loadVideo = useCallback((file) => {
    if (!file) return;
    stopProcessing();
    setIsPlayingUi(false);
    const url = URL.createObjectURL(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
    const v = videoRef.current;
    v.src = url;
    v.onloadedmetadata = () => {
      const c = canvasRef.current;
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      setResLabel(`${v.videoWidth} × ${v.videoHeight}`);
      setHasVideo(true);
      setModeLabel('준비됨');
    };
  }, [stopProcessing]);

  const onFileInput = (e) => { if (e.target.files?.[0]) loadVideo(e.target.files[0]); };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) loadVideo(e.dataTransfer.files[0]);
  };

  // ── playback ──
  const handlePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
    setIsPlayingUi(true);
    startProcessing();
  }, [startProcessing]);

  const handlePause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setIsPlayingUi(false);
    stopProcessing();
  }, [stopProcessing]);

  const handleScreenshot = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'lumkey_frame_' + Date.now() + '.png';
    a.click();
  };

  // ── live recording ──
  const handleToggleRec = useCallback(() => {
    if (!isRec) {
      if (!runningRef.current) handlePlay();
      const mimeType = pickMimeType();
      if (!mimeType) {
        alert('이 브라우저는 WebM 녹화를 지원하지 않습니다.\nChrome 또는 Edge를 사용해 주세요.');
        return;
      }
      setCodecBadge(mimeType.includes('vp9') || mimeType.includes('vp09') ? 'VP9 (투명 알파 지원)' : 'VP8');
      recChunksRef.current = [];
      const fpsNum = parseInt(fpsLabel, 10) || 30;
      const stream = canvasRef.current.captureStream(fpsNum);
      let rec;
      try {
        rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      } catch {
        rec = new MediaRecorder(stream);
      }
      rec.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: 'video/webm' });
        const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'lumkey_alpha_' + Date.now() + '.webm';
        a.click();
        setSaveInfo(`저장 완료 · ${sizeMB}MB · WebM VP9 투명`);
        setCodecBadge('');
        setTimeout(() => setSaveInfo(''), 4000);
      };
      recorderRef.current = rec;
      rec.start(100);
      setIsRec(true);
    } else {
      recorderRef.current?.stop();
      setIsRec(false);
    }
  }, [isRec, fpsLabel, handlePlay]);

  // ── full export (frame by frame) ──
  const handleExport = useCallback(async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return;
    v.pause();
    stopProcessing();
    setIsPlayingUi(false);
    setIsExporting(true);
    setExportPct(0);
    setExportLabel('초기화 중...');

    const mimeType = pickMimeType();
    if (!mimeType) {
      alert('이 브라우저는 WebM 녹화를 지원하지 않습니다.\nChrome 또는 Edge를 사용해 주세요.');
      setIsExporting(false); return;
    }

    const videoFps = 30;
    const duration = v.duration;
    const chunks = [];
    const stream = c.captureStream(videoFps);
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lumkey_export_' + Date.now() + '.webm';
      a.click();
      setExportPct(100);
      setExportLabel(`완료! ${sizeMB}MB · WebM VP9 투명 알파`);
      setTimeout(() => setIsExporting(false), 3000);
    };

    v.currentTime = 0;
    await new Promise((r) => { v.onseeked = r; });
    rec.start(100);

    const frameInterval = 1 / videoFps;
    let t = 0;
    const stepFrame = async () => {
      if (t > duration + frameInterval) { rec.stop(); return; }
      v.currentTime = t;
      await new Promise((r) => { v.onseeked = r; });
      processFrame();
      const pct = Math.min(100, Math.round((t / duration) * 100));
      setExportPct(pct);
      setExportLabel(`처리 중... ${pct}% (${t.toFixed(2)}s / ${duration.toFixed(2)}s)`);
      t += frameInterval;
      await new Promise((r) => setTimeout(r, Math.max(10, 1000 / videoFps)));
      requestAnimationFrame(stepFrame);
    };
    requestAnimationFrame(stepFrame);
  }, [stopProcessing, processFrame]);

  const bg = BG_PREVIEWS[bgKey];

  return (
    <div className="lumkey-root">
      <style>{`
        .lumkey-root {
          --bg:      #09090B;
          --panel:   #18181B;
          --panel2:  #121214;
          --border:  #27272A;
          --border2: #3F3F46;
          --text:    #F4F4F5;
          --muted:   #A1A1AA;
          --muted2:  #71717A;
          --dim:     #52525B;
          --accent:  #C8FF00;
          --accent-glow: rgba(200,255,0,0.15);
          --red:     #EF4444;
          height: 100%; width: 100%;
          display: flex; flex-direction: column;
          background: var(--bg); color: var(--text);
          font-family: 'Noto Sans KR', sans-serif;
          padding: 20px;
          gap: 20px;
          overflow: hidden;
        }
        .lumkey-root *, .lumkey-root *::before, .lumkey-root *::after {
          box-sizing: border-box;
          font-family: inherit;
        }
        .lumkey-root .mono { font-family: 'JetBrains Mono', 'Noto Sans KR', monospace; }

        /* layout */
        .lumkey-root .main {
          flex: 1; display: flex; gap: 20px; min-height: 0; min-width: 0;
        }
        .lumkey-root .panel {
          flex: 1; min-width: 0; min-height: 0;
          display: flex; flex-direction: column;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .lumkey-root .sidebar {
          width: 320px; flex-shrink: 0;
          display: flex; flex-direction: column;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .lumkey-root .sidebar-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden;
        }
        .lumkey-root .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .lumkey-root .sidebar-scroll::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

        /* panel header */
        .lumkey-root .panel-header {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--panel2);
          flex-shrink: 0;
        }
        .lumkey-root .panel-title {
          font-size: 12px; font-weight: 600;
          color: var(--text);
        }
        .lumkey-root .panel-stat {
          font-size: 11px; color: var(--muted2);
          margin-left: auto;
        }
        .lumkey-root .panel-stat strong { color: var(--accent); font-weight: 600; }

        /* video area */
        .lumkey-root .video-area {
          flex: 1; position: relative;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; min-height: 0;
          background: #000;
        }
        .lumkey-root .video-area video,
        .lumkey-root .video-area canvas {
          max-width: 100%; max-height: 100%;
          object-fit: contain; display: block;
        }
        .lumkey-root .drop-zone {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; cursor: pointer; transition: background .2s;
        }
        .lumkey-root .drop-zone:hover { background: rgba(200,255,0,0.04); }
        .lumkey-root .drop-zone.drag-over { background: rgba(200,255,0,0.08); }
        .lumkey-root .dz-icon { font-size: 40px; opacity: .25; }
        .lumkey-root .dz-title { font-size: 13px; font-weight: 600; color: var(--muted); }
        .lumkey-root .dz-sub { font-size: 11px; color: var(--dim); }

        /* sidebar top — LUMKEY brand */
        .lumkey-root .brand-row {
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
          background: var(--panel2);
          flex-shrink: 0;
        }
        .lumkey-root .brand-title {
          font-family: 'Teko', 'Noto Sans KR', sans-serif;
          font-size: 22px; font-weight: 600;
          color: var(--accent); letter-spacing: 0.1em;
          line-height: 1;
        }
        .lumkey-root .brand-sub {
          font-size: 10px; color: var(--muted2);
          margin-top: 4px; letter-spacing: 0.04em;
        }

        /* status pills */
        .lumkey-root .pill-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .lumkey-root .pill {
          font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 3px 8px; border: 1px solid var(--border2);
          color: var(--muted2); border-radius: 999px;
        }
        .lumkey-root .pill.accent { border-color: var(--accent); color: var(--accent); }
        .lumkey-root .pill.pulse { animation: lk-pulse 1.5s infinite; }
        @keyframes lk-pulse { 0%,100%{opacity:1}50%{opacity:.4} }

        /* sections */
        .lumkey-root .sec { padding: 16px 18px; border-bottom: 1px solid var(--border); }
        .lumkey-root .sec:last-child { border-bottom: none; }
        .lumkey-root .sec-title {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--dim); margin-bottom: 12px;
        }

        /* blend mode tabs */
        .lumkey-root .blend-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .lumkey-root .blend-tab {
          font-size: 11px; font-weight: 600;
          background: transparent; border: 1px solid var(--border);
          color: var(--muted2); padding: 10px 8px; cursor: pointer;
          transition: all .15s; text-align: center; line-height: 1.3;
          border-radius: 8px;
        }
        .lumkey-root .blend-tab small {
          display: block; font-size: 9px; font-weight: 400;
          opacity: .7; margin-top: 3px;
        }
        .lumkey-root .blend-tab:hover { border-color: var(--accent); color: var(--accent); }
        .lumkey-root .blend-tab.active {
          border-color: var(--accent); color: var(--accent);
          background: var(--accent-glow);
        }

        /* slider rows */
        .lumkey-root .row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .lumkey-root .row:last-child { margin-bottom: 0; }
        .lumkey-root .rlabel {
          font-size: 11px; color: var(--muted); width: 64px; flex-shrink: 0;
        }
        .lumkey-root .rslider {
          flex: 1; -webkit-appearance: none; appearance: none;
          height: 3px; background: var(--border2); outline: none;
          cursor: pointer; border-radius: 999px;
        }
        .lumkey-root .rslider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 12px; height: 12px; background: var(--accent); border-radius: 50%;
          box-shadow: 0 0 8px rgba(200,255,0,.4); cursor: pointer;
        }
        .lumkey-root .rval {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: var(--accent);
          width: 32px; text-align: right; flex-shrink: 0;
        }

        /* channel toggles */
        .lumkey-root .ch-row { display: flex; gap: 6px; margin-bottom: 12px; }
        .lumkey-root .ch-btn {
          flex: 1; font-family: 'JetBrains Mono', monospace;
          font-size: 11px; font-weight: 700;
          border: 1px solid var(--border); background: transparent;
          padding: 8px 4px; cursor: pointer; transition: all .15s;
          text-align: center; border-radius: 8px;
        }
        .lumkey-root .ch-btn.r { color: #F87171; }
        .lumkey-root .ch-btn.g { color: #4ADE80; }
        .lumkey-root .ch-btn.b { color: #60A5FA; }
        .lumkey-root .ch-btn.active {
          background: rgba(255,255,255,.06);
          border-color: currentColor;
        }

        /* tint */
        .lumkey-root .tint-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
        .lumkey-root .tint-swatch {
          width: 28px; height: 28px; border: 1px solid var(--border2);
          position: relative; overflow: hidden; flex-shrink: 0; cursor: pointer;
          border-radius: 6px;
        }
        .lumkey-root .tint-swatch input[type=color] {
          position: absolute; inset: -4px;
          width: calc(100% + 8px); height: calc(100% + 8px);
          opacity: 0; cursor: pointer; border: 0; padding: 0;
        }
        .lumkey-root .tint-hex {
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          color: var(--text); letter-spacing: 0.04em;
        }

        /* buttons */
        .lumkey-root .btn {
          width: 100%; font-size: 11px; font-weight: 600;
          border: none; padding: 11px; cursor: pointer; transition: all .2s;
          margin-bottom: 6px; display: block; border-radius: 8px;
        }
        .lumkey-root .btn:last-child { margin-bottom: 0; }
        .lumkey-root .btn-primary { background: var(--accent); color: #000; font-weight: 700; }
        .lumkey-root .btn-primary:hover:not(:disabled) {
          background: #d8ff20; box-shadow: 0 0 20px rgba(200,255,0,.25);
        }
        .lumkey-root .btn-primary:disabled { opacity: .3; cursor: not-allowed; }
        .lumkey-root .btn-secondary {
          background: transparent; color: var(--muted);
          border: 1px solid var(--border);
        }
        .lumkey-root .btn-secondary:hover:not(:disabled) {
          border-color: var(--muted2); color: var(--text);
          background: rgba(255,255,255,0.02);
        }
        .lumkey-root .btn-secondary:disabled { opacity: .3; cursor: not-allowed; }
        .lumkey-root .btn-accent-outline {
          background: transparent; color: var(--accent);
          border: 1px solid var(--accent);
        }
        .lumkey-root .btn-accent-outline:hover:not(:disabled) {
          background: var(--accent-glow);
        }
        .lumkey-root .btn-accent-outline:disabled { opacity: .3; cursor: not-allowed; }
        .lumkey-root .btn-rec {
          background: transparent; color: var(--red); border: 1px solid var(--red);
        }
        .lumkey-root .btn-rec:hover:not(:disabled) { background: rgba(239,68,68,.1); }
        .lumkey-root .btn-rec.recording {
          background: var(--red); color: #fff; animation: lk-pulse 1s infinite;
        }
        .lumkey-root .btn-rec:disabled { opacity: .3; cursor: not-allowed; }

        /* note */
        .lumkey-root .note {
          font-size: 11px; color: var(--muted2); line-height: 1.7;
          padding-left: 10px; border-left: 2px solid var(--border2);
        }
        .lumkey-root .note strong { color: var(--muted); font-weight: 600; }

        /* preview bg grid */
        .lumkey-root .preview-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 6px; margin-bottom: 10px;
        }
        .lumkey-root .preview-bg-btn {
          height: 32px; border: 1px solid var(--border);
          cursor: pointer; padding: 0; border-radius: 6px;
        }
        .lumkey-root .preview-bg-btn.active {
          border: 2px solid var(--accent);
          box-shadow: 0 0 0 2px rgba(200,255,0,0.2);
        }
      `}</style>

      <div className="main">
        {/* 원본 패널 */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">원본 영상</div>
            <div className="panel-stat mono">
              {resLabel === '—' ? '—' : <><strong>{resLabel.split(' × ')[0]}</strong> × <strong>{resLabel.split(' × ')[1]}</strong></>}
            </div>
          </div>
          <div className="video-area">
            {!hasVideo && (
              <div className={`drop-zone${dragOver ? ' drag-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <div className="dz-icon">🎬</div>
                <div className="dz-title">클릭 또는 드래그</div>
                <div className="dz-sub">MP4 · MOV · WEBM · AVI</div>
              </div>
            )}
            <video ref={videoRef} playsInline loop style={{ display: hasVideo ? 'block' : 'none' }} />
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">배경 제거 결과</div>
            <div className="panel-stat mono">투명도 <strong>{alphaPct}</strong></div>
          </div>
          <div className="video-area"
            style={bg.color
              ? { backgroundColor: bg.color, backgroundImage: 'none' }
              : { backgroundImage: bg.img, backgroundSize: bg.size, backgroundColor: 'transparent' }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* 사이드바 */}
        <aside className="sidebar">
          {/* 브랜드 + 상태 pills */}
          <div className="brand-row">
            <div className="brand-title">LUMKEY</div>
            <div className="brand-sub">루마 키어 · 영상 배경 제거</div>
            <div className="pill-row" style={{ marginTop: 10 }}>
              <span className="pill mono">{fpsLabel}</span>
              <span className="pill mono">{modeLabel}</span>
              {isProcessing && <span className="pill accent pulse mono">처리중</span>}
            </div>
          </div>

          <div className="sidebar-scroll">
            {/* 키잉 방식 */}
            <div className="sec">
              <div className="sec-title">키잉 방식</div>
              <div className="blend-tabs">
                {KEY_MODES.map((m) => (
                  <button key={m.id}
                    className={`blend-tab${keyMode === m.id ? ' active' : ''}`}
                    onClick={() => { setKeyMode(m.id); setModeLabel(m.label); }}
                  >
                    {m.label}<small>{m.sub}</small>
                  </button>
                ))}
              </div>
            </div>

            {/* 조정 */}
            <div className="sec">
              <div className="sec-title">조정</div>
              <div className="row">
                <div className="rlabel">임계값</div>
                <input type="range" className="rslider" min="0" max="255" value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value, 10))} />
                <div className="rval">{threshold}</div>
              </div>
              <div className="row">
                <div className="rlabel">게인</div>
                <input type="range" className="rslider" min="100" max="400" value={gain}
                  onChange={(e) => setGain(parseInt(e.target.value, 10))} />
                <div className="rval">{(gain / 100).toFixed(1)}</div>
              </div>
              <div className="row">
                <div className="rlabel">가장자리</div>
                <input type="range" className="rslider" min="0" max="60" value={edge}
                  onChange={(e) => setEdge(parseInt(e.target.value, 10))} />
                <div className="rval">{edge}</div>
              </div>
              <div className="row">
                <div className="rlabel">감마</div>
                <input type="range" className="rslider" min="50" max="300" value={gamma}
                  onChange={(e) => setGamma(parseInt(e.target.value, 10))} />
                <div className="rval">{(gamma / 100).toFixed(1)}</div>
              </div>
            </div>

            {/* 채널 */}
            <div className="sec">
              <div className="sec-title">채널 선택</div>
              <div className="ch-row">
                <button className={`ch-btn r${useR ? ' active' : ''}`} onClick={() => setUseR((v) => !v)}>R</button>
                <button className={`ch-btn g${useG ? ' active' : ''}`} onClick={() => setUseG((v) => !v)}>G</button>
                <button className={`ch-btn b${useB ? ' active' : ''}`} onClick={() => setUseB((v) => !v)}>B</button>
              </div>
              <div className="row">
                <div className="rlabel">색조 보정</div>
                <input type="range" className="rslider" min="0" max="100" value={tintPct}
                  onChange={(e) => setTintPct(parseInt(e.target.value, 10))} />
                <div className="rval">{tintPct}</div>
              </div>
              <div className="tint-row">
                <div className="tint-swatch" style={{ background: tintHex }}>
                  <input type="color" value={tintHex} onChange={(e) => setTintHex(e.target.value)} />
                </div>
                <div className="tint-hex">{tintHex}</div>
              </div>
            </div>

            {/* 컨트롤 */}
            <div className="sec">
              <div className="sec-title">컨트롤</div>
              <button className="btn btn-primary" disabled={!hasVideo || isPlayingUi} onClick={handlePlay}>▶ 재생 + 처리</button>
              <button className="btn btn-secondary" disabled={!isPlayingUi} onClick={handlePause}>⏸ 일시정지</button>
              <button className="btn btn-secondary" disabled={!hasVideo} onClick={handleScreenshot}>📸 프레임 저장</button>
              <button className={`btn btn-rec${isRec ? ' recording' : ''}`} disabled={!hasVideo} onClick={handleToggleRec}>
                {isRec ? '■ STOP · 저장' : '● REC 녹화'}
              </button>
              <button className="btn btn-accent-outline" disabled={!hasVideo || isExporting} onClick={handleExport}>
                ⬇ 전체 영상 내보내기
              </button>
              {isExporting && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 3, background: 'var(--border2)', marginBottom: 8, overflow: 'hidden', borderRadius: 999 }}>
                    <div style={{ height: '100%', background: 'var(--accent)', width: exportPct + '%', transition: 'width 0.2s', borderRadius: 999 }} />
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', textAlign: 'center' }}>{exportLabel}</div>
                </div>
              )}
              {codecBadge && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--accent)', padding: '8px 0', textAlign: 'center', border: '1px solid rgba(200,255,0,0.2)', marginTop: 6, borderRadius: 6 }}>
                  ● 녹화중 · {codecBadge}
                </div>
              )}
              {saveInfo && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--muted2)', padding: '8px 0', textAlign: 'center', marginTop: 6 }}>
                  {saveInfo}
                </div>
              )}
            </div>

            {/* 배경 미리보기 */}
            <div className="sec">
              <div className="sec-title">투명도 확인 배경</div>
              <div className="preview-grid">
                {Object.entries(BG_PREVIEWS).map(([key, info]) => (
                  <button key={key}
                    className={`preview-bg-btn${bgKey === key ? ' active' : ''}`}
                    title={info.label}
                    style={info.color
                      ? { background: info.color }
                      : { backgroundImage: info.img, backgroundSize: info.size }}
                    onClick={() => setBgKey(key)}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted2)' }}>
                현재: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{bg.label}</span>
              </div>
            </div>

            {/* 안내 */}
            <div className="sec">
              <div className="note">
                <strong>루마키</strong> — 밝기로 알파 계산. 글로우·빛·타이포에 최적<br />
                <strong>스크린</strong> — 검은 픽셀 완전 투명. 파티클·불꽃 합성용<br />
                <strong>크로마블랙</strong> — 임계값 이하 완전 컷. 깔끔한 엣지<br />
                <strong>멀티플라이</strong> — 흰 배경 제거용
              </div>
            </div>
          </div>
        </aside>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={onFileInput} />
    </div>
  );
}
