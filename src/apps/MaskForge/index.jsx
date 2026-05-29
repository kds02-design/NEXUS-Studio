import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Eye, EyeOff, Loader2,
  Sparkles, RotateCcw, Image as ImageIcon, X, ExternalLink,
  ZoomIn, ZoomOut, Send,
} from 'lucide-react';
import { useGlobal } from '../../context/GlobalContext';
import { APP_MAP } from '../../config/apps';

const ACCENT = '#FF3366';
const API_KEY_STORAGE = 'mask-forge:apiKey';
const PREVIEW_COLOR = APP_MAP['nexus-preview']?.color || '#22B8CF';

// 배경 제거 방식.
//  - api  : Remove.bg AI (피사체 누끼 / 무료키는 ~0.25MP preview 해상도 제한)
//  - luma : 블랙 배경을 루마키처럼 제거 (로컬 canvas · 원본 해상도 · 무료 · 빛/파티클/네온에 적합)
const METHOD_API = 'api';
const METHOD_LUMA = 'luma';
const METHOD_STORAGE = 'mask-forge:method';

// 결과 패널 배경 미리보기 프리셋 — 투명 컷아웃에 남은 잔여 엣지/헤일로를
// 다양한 배경(흰/검/회색 + 형광 녹·마젠타 = 잔여 픽셀 검출용)에서 검수.
const BG_PRESETS = [
  { key: 'checker', label: '투명' },
  { key: '#ffffff', label: '흰색' },
  { key: '#000000', label: '검정' },
  { key: '#808080', label: '회색' },
  { key: '#00e000', label: '녹색' },
  { key: '#ff00ff', label: '마젠타' },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// Remove.bg API — base64 → POST /v1.0/removebg → PNG blob (alpha)
async function removeBgWithApi(file, apiKey) {
  const base64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(String(e.target.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_file_b64: base64, size: 'auto' }),
  });
  if (!res.ok) {
    let msg = `Remove.bg ${res.status}`;
    if (res.status === 402) msg = '크레딧이 부족합니다. Remove.bg에서 충전하세요.';
    else if (res.status === 403) msg = 'API 키가 올바르지 않습니다.';
    else if (res.status === 429) msg = '요청이 너무 많습니다. 잠시 후 다시 시도하세요.';
    else {
      try { const j = await res.json(); msg = j.errors?.[0]?.title || msg; } catch { /* ignore */ }
    }
    throw new Error(msg);
  }
  const remaining = res.headers.get('X-Free-Calls');
  const charged = res.headers.get('X-Credits-Charged');
  const blob = await res.blob();
  return { blob, remaining, charged };
}

// 파일 → 디코딩된 HTMLImageElement. 한 번 디코딩 후 캐시해 실시간 재처리 비용을 줄임
// (디코딩이 가장 무거운 단계라 슬라이더 조절마다 다시 디코딩하지 않도록).
function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 불러올 수 없습니다.')); };
    im.src = url;
  });
}

// 블랙 배경 루마키 — 디코딩된 이미지 → 알파 적용 → PNG blob. 원본 해상도 유지(API 제약 없음).
// blackness = max(r,g,b) 채널 최대값. 검정(0)일수록 투명, 밝을수록 불투명.
// threshold 이하는 완전 투명, threshold+softness 이상은 완전 불투명, 사이는 선형 램프(앤티에일리어싱).
// 채널 최대값을 쓰는 이유: 채도 높은 컬러 피사체(빨강/파랑 등)는 한 채널이 살아 있어 보존됨.
function lumaKeyFromImage(img, { threshold = 24, softness = 48 } = {}) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  const hi = threshold + Math.max(1, softness);
  for (let i = 0; i < px.length; i += 4) {
    const lum = Math.max(px[i], px[i + 1], px[i + 2]);
    let a;
    if (lum <= threshold) a = 0;
    else if (lum >= hi) a = 255;
    else a = Math.round(((lum - threshold) / (hi - threshold)) * 255);
    // 원본 알파와 곱해 이미 투명한 부분 보존.
    px[i + 3] = Math.round((px[i + 3] / 255) * a);
  }
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve({ blob: b, width: w, height: h }) : reject(new Error('PNG 변환 실패'))), 'image/png');
  });
}

export default function MaskForgeApp() {
  const { navigate } = useGlobal();

  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(API_KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [showKey, setShowKey] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(null);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);

  // 배경 제거 방식 + 루마키 파라미터.
  const [method, setMethod] = useState(() => {
    try { return localStorage.getItem(METHOD_STORAGE) || METHOD_API; } catch { return METHOD_API; }
  });
  const [lumaThreshold, setLumaThreshold] = useState(24);
  const [lumaSoftness, setLumaSoftness] = useState(48);
  const [lumaBusy, setLumaBusy] = useState(false);
  const lumaImgRef = useRef(null); // 디코딩된 원본 캐시 — 실시간 재처리용

  // 결과 패널 배경 미리보기 (view-only — 다운로드 PNG 는 항상 투명 유지).
  const [bgPreset, setBgPreset] = useState('checker');
  const [customBg, setCustomBg] = useState('#3366ff');

  // 결과 확대/패닝 — 컷아웃 엣지를 픽셀 단위로 검수. 휠(커서 기준) + 드래그 이동.
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const resultRef = useRef(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const [status, setStatus] = useState({ msg: 'API 키를 입력하고 이미지를 업로드하세요', state: 'idle' });
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);

  const fileInputRef = useRef(null);

  // API 키는 브라우저 localStorage 에만 저장. 외부 전송 없음.
  useEffect(() => {
    try {
      if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch { /* quota or disabled — ignore */ }
  }, [apiKey]);

  useEffect(() => {
    try { localStorage.setItem(METHOD_STORAGE, method); } catch { /* ignore */ }
  }, [method]);

  // blob URL 누수 방지.
  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  useEffect(() => () => {
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);

  // 상태값을 ref 에 미러링 — 휠 핸들러가 stale closure 없이 최신값을 읽도록.
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // 휠 줌 — 커서 위치를 고정점으로 확대/축소. passive:false 라야 스크롤 차단 가능.
  useEffect(() => {
    const el = resultRef.current;
    if (!el || !resultUrl) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const z = zoomRef.current;
      const nz = clampZoom(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      if (nz === z) return;
      if (nz <= MIN_ZOOM + 1e-3) { setZoom(MIN_ZOOM); setOffset({ x: 0, y: 0 }); return; }
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      const ratio = nz / z;
      const o = offsetRef.current;
      setZoom(nz);
      setOffset({ x: mx + (o.x - mx) * ratio, y: my + (o.y - my) * ratio });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [resultUrl]);

  const resetZoom = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);

  // 버튼 줌 — 패널 중심 기준.
  const zoomBy = useCallback((factor) => {
    const z = zoomRef.current;
    const nz = clampZoom(z * factor);
    if (nz === z) return;
    if (nz <= MIN_ZOOM + 1e-3) { setZoom(MIN_ZOOM); setOffset({ x: 0, y: 0 }); return; }
    const ratio = nz / z;
    setZoom(nz);
    setOffset((o) => ({ x: o.x * ratio, y: o.y * ratio }));
  }, []);

  // 드래그 패닝 — 확대 상태에서만. pointer capture 로 패널 밖까지 추적.
  const onPanStart = useCallback((e) => {
    if (zoomRef.current <= MIN_ZOOM) return;
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ...offsetRef.current, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  }, []);
  const onPanMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.x + (e.clientX - d.sx), y: d.y + (e.clientY - d.sy) });
  }, []);
  const onPanEnd = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    e.currentTarget.releasePointerCapture?.(d.id);
    dragRef.current = null;
    setDragging(false);
  }, []);

  const setStatusMsg = (msg, state = 'idle') => setStatus({ msg, state });

  const loadFile = useCallback((file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setStatusMsg('이미지 파일만 가능합니다 (PNG · JPG · WEBP)', 'error');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatusMsg(`파일이 너무 큽니다 (최대 12MB · 현재 ${(file.size / 1024 / 1024).toFixed(1)}MB)`, 'error');
      return;
    }
    setUploadedFile(file);
    lumaImgRef.current = null; // 새 이미지 — 캐시 무효화
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setResultUrl(null);
    setProgress(0);
    setStatusMsg('이미지 준비 완료. 배경 제거를 실행하세요.', 'done');
  }, [previewUrl, resultUrl]);

  // 결과 blob 교체 (이전 blob URL 정리). 줌은 건드리지 않음.
  const applyResultQuiet = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    setResultUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const applyResult = useCallback((blob) => {
    applyResultQuiet(blob);
    setZoom(1); setOffset({ x: 0, y: 0 });
  }, [applyResultQuiet]);

  // 디코딩된 원본을 캐시에서 반환 (없으면 디코딩 후 캐시).
  const ensureLumaImg = useCallback(async () => {
    if (lumaImgRef.current) return lumaImgRef.current;
    if (!uploadedFile) return null;
    const img = await decodeImage(uploadedFile);
    lumaImgRef.current = img;
    return img;
  }, [uploadedFile]);

  // 루마키 실시간 미리보기 — 슬라이더/이미지/방식 변경 시 디바운스 후 재처리.
  // 오버레이/진행바 없이 조용히 결과만 교체 (resultUrl 은 deps 에서 제외 → 무한 루프 방지).
  useEffect(() => {
    if (method !== METHOD_LUMA || !uploadedFile) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLumaBusy(true);
      try {
        const img = await ensureLumaImg();
        if (!img || cancelled) return;
        const { blob, width, height } = await lumaKeyFromImage(img, { threshold: lumaThreshold, softness: lumaSoftness });
        if (cancelled) return;
        applyResultQuiet(blob);
        setStatus({ msg: `블랙 배경 제거 · 실시간 (${width}×${height})`, state: 'done' });
      } catch (e) {
        if (!cancelled) {
          console.error('[MaskForge] luma live failed', e);
          setStatus({ msg: `오류: ${e.message || e}`, state: 'error' });
        }
      } finally {
        setLumaBusy(false);
      }
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [method, uploadedFile, lumaThreshold, lumaSoftness, ensureLumaImg, applyResultQuiet]);

  const handleProcess = useCallback(async () => {
    if (!uploadedFile) { setStatusMsg('이미지를 먼저 업로드하세요', 'error'); return; }

    // 블랙 배경 루마키 — 로컬 처리, API 키 불필요, 원본 해상도 유지.
    if (method === METHOD_LUMA) {
      setProcessing(true);
      setStatusMsg('블랙 배경 제거 중... (로컬 처리)', 'active');
      setProgress(40);
      try {
        const img = await ensureLumaImg();
        if (!img) throw new Error('이미지를 불러올 수 없습니다.');
        const { blob, width, height } = await lumaKeyFromImage(img, { threshold: lumaThreshold, softness: lumaSoftness });
        applyResult(blob);
        setProgress(100);
        setStatusMsg(`완료! 블랙 배경 제거 (${width}×${height} 원본 해상도)`, 'done');
      } catch (e) {
        console.error('[MaskForge] luma failed', e);
        setStatusMsg(`오류: ${e.message || e}`, 'error');
        setProgress(0);
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Remove.bg AI.
    if (!apiKey.trim()) { setStatusMsg('API 키를 먼저 입력하세요', 'error'); return; }
    setProcessing(true);
    setStatusMsg('Remove.bg AI에 이미지 전송 중...', 'active');
    setProgress(20);
    try {
      // 폴링 없는 동기 API — 사용자 체감용으로만 진행 바 80%까지 가짜 진행.
      const progTick = setTimeout(() => setProgress(60), 500);
      const { blob, remaining } = await removeBgWithApi(uploadedFile, apiKey.trim());
      clearTimeout(progTick);
      setProgress(90);
      applyResult(blob);
      if (remaining !== null) setCreditsRemaining(remaining);
      setProgress(100);
      setStatusMsg('완료! 배경이 완벽하게 제거되었습니다.', 'done');
    } catch (e) {
      console.error('[MaskForge] failed', e);
      setStatusMsg(`오류: ${e.message || e}`, 'error');
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }, [apiKey, uploadedFile, method, lumaThreshold, lumaSoftness, applyResult, ensureLumaImg]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `bg_removed_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [resultUrl]);

  // 결과(투명 PNG)를 NEXUS Preview 로 타이틀로 전송.
  // blob URL 은 이 앱이 언마운트되면 revoke 되므로, 자가완결 dataURL 로 변환해 전달.
  const handleSendToPreview = useCallback(async () => {
    if (!resultUrl) return;
    try {
      const blob = await (await fetch(resultUrl)).blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      navigate('nexus-preview', { source: 'mask-forge', image: { url: dataUrl, metadata: {} } });
    } catch (e) {
      console.error('[MaskForge] send to preview failed', e);
      setStatusMsg(`보내기 실패: ${e.message || e}`, 'error');
    }
  }, [resultUrl, navigate]);

  const handleReset = useCallback(() => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
    setUploadedFile(null);
    lumaImgRef.current = null;
    setPreviewUrl(null);
    setResultUrl(null);
    setZoom(1); setOffset({ x: 0, y: 0 });
    setProgress(0);
    setStatusMsg('이미지를 업로드하세요');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl, resultUrl]);

  const dotClass =
    status.state === 'active' ? 'animate-pulse' : '';
  const dotColor =
    status.state === 'done' ? ACCENT
    : status.state === 'active' ? ACCENT
    : status.state === 'error' ? '#ff5566'
    : '#3f3f46';
  const textColor =
    status.state === 'done' ? 'text-zinc-100'
    : status.state === 'active' ? 'text-[#FF3366]'
    : status.state === 'error' ? 'text-rose-400'
    : 'text-zinc-500';

  return (
    <div className="flex flex-col h-full w-full bg-[#0A0A0A] text-zinc-100 p-5 overflow-hidden font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.2); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.5); }
        .bg-maskforge-checker {
          background-image: repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%);
          background-size: 20px 20px;
        }
        .bg-maskforge-grid {
          background-image:
            linear-gradient(rgba(255,51,102,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,51,102,.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-maskforge-grid -m-5 p-5">
        <div className="max-w-5xl mx-auto flex flex-col gap-5">

          {/* Hero — Noto Sans KR(font-sans) + font-black. Teko 는 한글 글리프가 없어 OS fallback 발생하므로 본문 폰트로 통일. */}
          <div className="text-center pt-4 pb-2">
            <h1 className="font-sans font-black tracking-tight leading-tight text-[clamp(26px,5vw,48px)]">
              배경을 <span style={{ color: ACCENT }}>완벽하게</span> 제거
            </h1>
            <p className="text-zinc-500 text-[12px] mt-2 tracking-wide">
              Remove.bg AI — 머리카락 · 반투명 · 복잡한 배경까지 전문가 수준으로 처리
            </p>
          </div>

          {/* 방식 선택 */}
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-1.5 flex gap-1.5">
            {[
              { key: METHOD_API, title: 'Remove.bg AI', desc: '피사체 누끼 · 무료키 저해상도(~0.25MP)' },
              { key: METHOD_LUMA, title: '블랙 배경 (루마키)', desc: '원본 해상도 · 무료 · 빛 / 네온 / 파티클' },
            ].map((m) => {
              const active = method === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => { setMethod(m.key); setZoom(1); setOffset({ x: 0, y: 0 }); }}
                  className={`flex-1 text-left rounded-lg px-4 py-3 transition-colors ${active ? '' : 'hover:bg-white/5'}`}
                  style={active ? { background: ACCENT, color: '#000' } : undefined}
                >
                  <div className="text-[12px] font-black tracking-wide">{m.title}</div>
                  <div className={`text-[10px] mt-0.5 tracking-wide ${active ? 'text-black/70' : 'text-zinc-500'}`}>{m.desc}</div>
                </button>
              );
            })}
          </div>

          {/* API Key bar — Remove.bg 방식에서만 */}
          {method === METHOD_API && (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap">API Key</span>
            <div className="flex-1 min-w-[200px] flex items-center border border-zinc-800 bg-black/40 rounded-lg px-3 gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Remove.bg API 키를 입력하세요"
                className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-zinc-100 py-2.5 placeholder:text-zinc-600 tracking-wider"
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                title={showKey ? '숨기기' : '보기'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <a
              href="https://www.remove.bg/api"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-bold tracking-wider whitespace-nowrap border-b border-[#FF3366]/30 hover:border-[#FF3366] transition-colors flex items-center gap-1"
              style={{ color: ACCENT }}
            >
              무료 키 발급 <ExternalLink size={10} />
            </a>
            {creditsRemaining !== null && (
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 border border-zinc-800 rounded px-2.5 py-1 whitespace-nowrap">
                잔여 {creditsRemaining} 크레딧
              </span>
            )}
          </div>
          )}

          {/* 루마키 설정 — 블랙 배경 방식에서만 */}
          {method === METHOD_LUMA && (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">루마키 설정</span>
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full border" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>실시간</span>
              {lumaBusy && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> 갱신 중
                </span>
              )}
            </div>
            <label className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 w-20 shrink-0">임계값</span>
              <input
                type="range" min={0} max={200} value={lumaThreshold}
                onChange={(e) => setLumaThreshold(Number(e.target.value))}
                className="flex-1 accent-[#FF3366]"
              />
              <span className="text-[11px] font-mono text-zinc-300 w-9 text-right tabular-nums">{lumaThreshold}</span>
            </label>
            <label className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-zinc-400 w-20 shrink-0">부드러움</span>
              <input
                type="range" min={1} max={150} value={lumaSoftness}
                onChange={(e) => setLumaSoftness(Number(e.target.value))}
                className="flex-1 accent-[#FF3366]"
              />
              <span className="text-[11px] font-mono text-zinc-300 w-9 text-right tabular-nums">{lumaSoftness}</span>
            </label>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              검정 배경 위의 빛·불꽃·파티클·네온 소재에 적합. <b className="text-zinc-300">임계값</b> 이하 밝기는 투명, <b className="text-zinc-300">부드러움</b>은 경계 페더링. 슬라이더를 움직이면 <b className="text-zinc-300">결과가 실시간으로 갱신</b>됩니다.
            </p>
          </div>
          )}

          {/* Status + Progress */}
          <div className="flex flex-col gap-1.5">
            <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 min-h-[44px]">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}
                style={{ background: dotColor }}
              />
              <span className={`text-[11px] font-bold tracking-wider flex-1 ${textColor}`}>
                {status.msg}
              </span>
            </div>
            <div className="h-[2px] bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, background: ACCENT }}
              />
            </div>
          </div>

          {/* Workspace */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upload panel */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingUpload(true); }}
              onDragLeave={() => setIsDraggingUpload(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingUpload(false);
                const f = e.dataTransfer.files?.[0];
                if (f) loadFile(f);
              }}
              className={`relative aspect-[4/3] min-h-[220px] bg-[#18181B] border border-dashed rounded-xl flex items-center justify-center overflow-hidden cursor-pointer transition-colors ${isDraggingUpload ? 'border-[#FF3366] bg-[#FF3366]/5' : 'border-zinc-800 hover:border-zinc-600'}`}
            >
              <div className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/85 border border-zinc-800 rounded px-2 py-1">
                원본
              </div>
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="원본" className="absolute inset-0 w-full h-full object-contain" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-black/70 hover:bg-rose-500/80 text-white text-xs transition-colors"
                    title="이미지 제거"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <Upload className="w-9 h-9 text-zinc-700" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">클릭 / 드래그</span>
                  <span className="text-[11px] text-zinc-600">PNG · JPG · WEBP · 최대 12MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) loadFile(e.target.files[0]); e.target.value = ''; }}
              />
            </div>

            {/* Result panel */}
            <div
              ref={resultRef}
              className={`relative aspect-[4/3] min-h-[220px] border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden ${bgPreset === 'checker' ? 'bg-maskforge-checker' : ''}`}
              style={bgPreset === 'checker' ? undefined : { backgroundColor: bgPreset === 'custom' ? customBg : bgPreset }}
            >
              <div className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/85 border border-zinc-800 rounded px-2 py-1">
                결과 (투명 배경)
              </div>
              {resultUrl ? (
                <img
                  src={resultUrl}
                  alt="결과"
                  draggable={false}
                  onPointerDown={onPanStart}
                  onPointerMove={onPanMove}
                  onPointerUp={onPanEnd}
                  onPointerCancel={onPanEnd}
                  className={`absolute inset-0 w-full h-full object-contain select-none ${zoom > MIN_ZOOM ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: dragging ? 'none' : 'transform 0.08s ease-out',
                    willChange: 'transform',
                  }}
                />
              ) : (
                <Sparkles className="w-9 h-9 text-zinc-800" />
              )}

              {/* 확대 컨트롤 — 결과가 있을 때만, 처리 중에는 숨김. */}
              {resultUrl && !processing && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 bg-black/75 backdrop-blur-sm border border-zinc-700 rounded-full px-1 py-1">
                  <button
                    onClick={() => zoomBy(1 / 1.3)}
                    disabled={zoom <= MIN_ZOOM}
                    title="축소"
                    className="p-1.5 text-zinc-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    onClick={resetZoom}
                    title="원본 크기"
                    className="text-[10px] font-bold tabular-nums text-zinc-300 hover:text-white transition-colors px-1 min-w-[34px]"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    onClick={() => zoomBy(1.3)}
                    disabled={zoom >= MAX_ZOOM}
                    title="확대"
                    className="p-1.5 text-zinc-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              )}

              {/* 배경색 미리보기 스와치 — 결과가 있을 때만, 처리 중에는 숨김. */}
              {resultUrl && !processing && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm border border-zinc-700 rounded-full px-2.5 py-1.5">
                  {BG_PRESETS.map((p) => {
                    const active = bgPreset === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setBgPreset(p.key)}
                        title={p.label}
                        className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${active ? 'ring-2 ring-offset-1 ring-offset-black ring-white' : 'border border-white/20'}`}
                        style={p.key === 'checker'
                          ? { backgroundImage: 'repeating-conic-gradient(#3a3a3a 0% 25%, #111 0% 50%)', backgroundSize: '8px 8px' }
                          : { backgroundColor: p.key }}
                      />
                    );
                  })}
                  <span className="w-px h-4 bg-zinc-700" />
                  <label
                    title="사용자 지정 색"
                    className={`relative w-5 h-5 rounded-full cursor-pointer overflow-hidden transition-transform hover:scale-110 ${bgPreset === 'custom' ? 'ring-2 ring-offset-1 ring-offset-black ring-white' : 'border border-white/20'}`}
                    style={{ backgroundColor: customBg }}
                  >
                    <input
                      type="color"
                      value={customBg}
                      onChange={(e) => { setCustomBg(e.target.value); setBgPreset('custom'); }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                </div>
              )}
              {processing && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4 z-20">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
                  <span className="text-[11px] font-bold tracking-wider" style={{ color: ACCENT }}>
                    {method === METHOD_LUMA ? '블랙 배경 제거 중...' : 'Remove.bg AI 처리 중...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2.5 flex-wrap">
            <button
              onClick={handleProcess}
              disabled={!uploadedFile || processing || (method === METHOD_API && !apiKey.trim())}
              className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-black shadow-[0_8px_20px_rgba(255,51,102,0.25)]"
              style={{ background: ACCENT }}
            >
              {processing ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 처리 중…</span>
              ) : method === METHOD_LUMA ? '블랙 배경 제거' : '배경 제거 실행'}
            </button>
            <button
              onClick={handleReset}
              disabled={!uploadedFile && !resultUrl}
              className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
          </div>

          {/* Download / 보내기 */}
          {resultUrl && (
            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5 text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">결과물 저장 / 보내기</div>
              <div className="flex justify-center gap-2.5 flex-wrap">
                <button
                  onClick={handleDownload}
                  className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg text-black inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110"
                  style={{ background: ACCENT }}
                >
                  <Download className="w-3.5 h-3.5" /> PNG 다운로드 (투명)
                </button>
                <button
                  onClick={handleSendToPreview}
                  title="투명 결과를 NEXUS Preview 의 타이틀로 전송"
                  className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110 border"
                  style={{ color: PREVIEW_COLOR, borderColor: `${PREVIEW_COLOR}66`, background: `${PREVIEW_COLOR}1A` }}
                >
                  <Send className="w-3.5 h-3.5" /> NEXUS Preview로 보내기
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          {method === METHOD_API ? (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-5 py-4 text-[12px] text-zinc-400 leading-[1.9] mb-4">
            <div className="text-zinc-100 font-bold mb-1 flex items-center gap-2">
              <ImageIcon size={14} style={{ color: ACCENT }} /> Remove.bg API 안내
            </div>
            • <a href="https://www.remove.bg/api" target="_blank" rel="noreferrer" style={{ color: ACCENT }}>remove.bg/api</a>에서 무료 가입 후 API 키 발급<br />
            • 무료 플랜: 월 50크레딧 (이미지 1장 = 1크레딧)<br />
            • <b className="text-zinc-100">무료 키는 미리보기 해상도(약 0.25MP · ~625×400)로 제한</b>됩니다. full / 4K(최대 25MP)는 유료 크레딧 필요<br />
            • 입력한 API 키는 브라우저 localStorage 에만 저장되며 외부로 전송되지 않습니다<br />
            • 머리카락·털·반투명 영역까지 정밀하게 처리되는 AI 누끼 방식
          </div>
          ) : (
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-5 py-4 text-[12px] text-zinc-400 leading-[1.9] mb-4">
            <div className="text-zinc-100 font-bold mb-1 flex items-center gap-2">
              <ImageIcon size={14} style={{ color: ACCENT }} /> 블랙 배경 루마키 안내
            </div>
            • 브라우저에서 직접 처리 — <b className="text-zinc-100">API 키 · 크레딧 불필요, 원본 해상도 그대로</b> 유지<br />
            • 검정(어두운) 픽셀을 투명화 — 빛·불꽃·연기·파티클·네온처럼 <b className="text-zinc-100">검정 배경 위의 발광 소재</b>에 최적<br />
            • 임계값/부드러움을 조절해 잔여 엣지를 제거하고, 결과 패널의 배경색·확대로 검수<br />
            • 일반 사진 누끼(인물·제품)는 Remove.bg AI 방식이 더 정확합니다
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
