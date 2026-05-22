import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Eye, EyeOff, Loader2,
  Sparkles, RotateCcw, Image as ImageIcon, X, ExternalLink,
} from 'lucide-react';

const ACCENT = '#FF3366';
const API_KEY_STORAGE = 'mask-forge:apiKey';

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

export default function MaskForgeApp() {
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(API_KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [showKey, setShowKey] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(null);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);

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

  // blob URL 누수 방지.
  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  useEffect(() => () => {
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);

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
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setResultUrl(null);
    setProgress(0);
    setStatusMsg('이미지 준비 완료. 배경 제거를 실행하세요.', 'done');
  }, [previewUrl, resultUrl]);

  const handleProcess = useCallback(async () => {
    if (!apiKey.trim()) { setStatusMsg('API 키를 먼저 입력하세요', 'error'); return; }
    if (!uploadedFile) { setStatusMsg('이미지를 먼저 업로드하세요', 'error'); return; }
    setProcessing(true);
    setStatusMsg('Remove.bg AI에 이미지 전송 중...', 'active');
    setProgress(20);
    try {
      // 폴링 없는 동기 API — 사용자 체감용으로만 진행 바 80%까지 가짜 진행.
      const progTick = setTimeout(() => setProgress(60), 500);
      const { blob, remaining } = await removeBgWithApi(uploadedFile, apiKey.trim());
      clearTimeout(progTick);
      setProgress(90);
      const url = URL.createObjectURL(blob);
      if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
      setResultUrl(url);
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
  }, [apiKey, uploadedFile, resultUrl]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `bg_removed_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [resultUrl]);

  const handleReset = useCallback(() => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    if (resultUrl?.startsWith('blob:')) URL.revokeObjectURL(resultUrl);
    setUploadedFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
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

          {/* API Key bar */}
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
            <div className="relative aspect-[4/3] min-h-[220px] bg-maskforge-checker border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
              <div className="absolute top-3 left-3 z-10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-black/85 border border-zinc-800 rounded px-2 py-1">
                결과 (투명 배경)
              </div>
              {resultUrl ? (
                <img src={resultUrl} alt="결과" className="absolute inset-0 w-full h-full object-contain" />
              ) : (
                <Sparkles className="w-9 h-9 text-zinc-800" />
              )}
              {processing && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4 z-20">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
                  <span className="text-[11px] font-bold tracking-wider" style={{ color: ACCENT }}>
                    Remove.bg AI 처리 중...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2.5 flex-wrap">
            <button
              onClick={handleProcess}
              disabled={!uploadedFile || processing || !apiKey.trim()}
              className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-black shadow-[0_8px_20px_rgba(255,51,102,0.25)]"
              style={{ background: ACCENT }}
            >
              {processing ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 처리 중…</span>
              ) : '배경 제거 실행'}
            </button>
            <button
              onClick={handleReset}
              disabled={!uploadedFile && !resultUrl}
              className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 초기화
            </button>
          </div>

          {/* Download */}
          {resultUrl && (
            <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5 text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">결과물 저장</div>
              <button
                onClick={handleDownload}
                className="text-[11px] font-bold tracking-wider px-7 py-3 rounded-lg text-black inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110"
                style={{ background: ACCENT }}
              >
                <Download className="w-3.5 h-3.5" /> PNG 다운로드 (투명)
              </button>
            </div>
          )}

          {/* Info */}
          <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-5 py-4 text-[12px] text-zinc-400 leading-[1.9] mb-4">
            <div className="text-zinc-100 font-bold mb-1 flex items-center gap-2">
              <ImageIcon size={14} style={{ color: ACCENT }} /> Remove.bg API 안내
            </div>
            • <a href="https://www.remove.bg/api" target="_blank" rel="noreferrer" style={{ color: ACCENT }}>remove.bg/api</a>에서 무료 가입 후 API 키 발급<br />
            • 무료 플랜: 월 50크레딧 (이미지 1장 = 1크레딧)<br />
            • 입력한 API 키는 브라우저 localStorage 에만 저장되며 외부로 전송되지 않습니다<br />
            • 결과물은 최대 <b className="text-zinc-100">4K 해상도</b>, 머리카락·털·반투명 영역까지 정밀하게 처리
          </div>
        </div>
      </div>
    </div>
  );
}
