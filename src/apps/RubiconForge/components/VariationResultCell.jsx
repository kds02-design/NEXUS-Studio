// 변형/아틀라스 결과 그리드의 단일 셀 — 두 모드에서 공유.
//   - showNineSlice=true (변형 모드): 9-슬라이스 편집기 버튼 노출
//   - showNineSlice=false (아틀라스 모드): 9-슬라이스 버튼 숨김 (전체 아틀라스는 9-슬라이스 대상 아님)
//   - filePrefix: 다운로드 파일명 prefix ("rubicon-variation" or "rubicon-atlas")

import { useState, useEffect } from 'react';
import {
  Loader2, AlertCircle, Download, RefreshCcw, ImageOff, Eraser, Grid3x3, FileText, ClipboardCopy, Check, Maximize2, X,
} from 'lucide-react';
import { blackToTransparentPng } from '../services/variations';

export default function VariationResultCell({
  slot, idx, onRegenerate,
  onOpenNineSlice, showNineSlice = true,
  filePrefix = 'rubicon-variation',
  sourceLoaded,
}) {
  const { theme, dataUrl, error, prompt, compactPrompt, isLoading } = slot;
  const [isExtracting, setIsExtracting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  // 확대 보기 — Esc 로 닫기.
  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setZoomOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomOpen]);

  // 외부 Gemini / AI Studio 챗에 붙여넣을 컴팩트 프롬프트를 클립보드로 복사.
  // (앱 API 프롬프트 .txt 와 별개 — 그건 inlineData 전제라 외부 챗에선 깨짐)
  const handleCopyCompact = async () => {
    if (!compactPrompt) return;
    try {
      await navigator.clipboard.writeText(compactPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error('[VariationResultCell] compact prompt copy failed', e);
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filePrefix}-${theme.id}-${Date.now()}.png`;
    a.click();
  };

  const handleDownloadTransparent = async () => {
    if (!dataUrl || isExtracting) return;
    setIsExtracting(true);
    try {
      const transparentDataUrl = await blackToTransparentPng(dataUrl);
      const a = document.createElement('a');
      a.href = transparentDataUrl;
      a.download = `${filePrefix}-${theme.id}-transparent-${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error('[VariationResultCell] transparent extraction failed', e);
    } finally {
      setIsExtracting(false);
    }
  };

  // 실제 전송된 프롬프트 .txt 다운로드 — 실패 슬롯에서도 가능.
  const handleDownloadPrompt = () => {
    if (!prompt) return;
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePrefix}-${theme.id}-prompt-${Date.now()}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
    <div
      className="relative rounded-xl overflow-hidden bg-[#0F0F12] border border-zinc-800/60 aspect-square group"
      style={{ boxShadow: dataUrl ? `inset 0 0 0 1px ${theme.color}30` : undefined }}
    >
      {/* 헤더 — 테마 색 + 라벨 */}
      <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: theme.color }} />
          <span className="text-[11px] font-bold text-white truncate">{theme.label}</span>
        </div>
        <span className="text-[9px] text-zinc-400 truncate ml-2">{theme.desc}</span>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.color }} />
          <div className="text-[10px] text-zinc-500">렌더링 중...</div>
        </div>
      )}

      {!isLoading && dataUrl && (
        <img src={dataUrl} alt={theme.label} onClick={() => setZoomOpen(true)} title="클릭하면 크게 보기"
          className="absolute inset-0 w-full h-full object-contain bg-black cursor-zoom-in" />
      )}

      {!isLoading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-rose-400 text-center">
          <AlertCircle className="w-5 h-5" />
          <div className="text-[10px] font-bold">생성 실패</div>
          <div className="text-[9px] text-rose-400/70 leading-snug break-all">{error}</div>
        </div>
      )}

      {!isLoading && !dataUrl && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-600 p-4 text-center">
          <ImageOff className="w-5 h-5 opacity-50" />
          <div className="text-[10px]">{sourceLoaded ? '대기 중 — 생성 버튼을 눌러주세요' : '원본을 업로드하세요'}</div>
        </div>
      )}

      {/* 호버 액션 바 */}
      {!isLoading && (dataUrl || error) && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-2 py-2 flex items-center justify-end gap-1 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {dataUrl && (
            <>
              <button
                onClick={() => setZoomOpen(true)}
                title="크게 보기"
                className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              {showNineSlice && (
                <button
                  onClick={() => onOpenNineSlice?.(idx)}
                  title="9-슬라이스 편집기 (임의 크기로 늘려서 렌더)"
                  className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleDownloadTransparent}
                disabled={isExtracting}
                title="투명 PNG 다운로드 (검은 배경 알파 추출)"
                className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors disabled:opacity-50"
              >
                {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleDownload}
                title="원본 PNG 다운로드 (검은 배경 포함)"
                className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {compactPrompt && (
            <button
              onClick={handleCopyCompact}
              title="외부 Gemini · AI Studio 챗용 컴팩트 프롬프트 복사 (이미지 첨부 후 붙여넣기)"
              className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            </button>
          )}
          {prompt && (
            <button
              onClick={handleDownloadPrompt}
              title="앱 API 에 실제 전송된 전체 프롬프트 .txt 다운로드 (외부 챗엔 부적합)"
              className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onRegenerate(idx)}
            title="이 슬롯만 다시 생성"
            className="p-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>

    {/* 확대 보기 라이트박스 — 클릭/Maximize 로 열림, 배경·Esc·X 로 닫힘 */}
    {zoomOpen && dataUrl && (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-sm" onClick={() => setZoomOpen(false)}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: theme.color }} />
            <span className="text-[13px] font-bold text-white truncate">{theme.label}</span>
            <span className="text-[11px] text-zinc-400 truncate ml-1 hidden sm:inline">{theme.desc}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleDownload} title="원본 PNG 다운로드 (검은 배경 포함)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white text-[12px] font-medium transition-colors">
              <Download className="w-4 h-4" /> 원본 PNG
            </button>
            <button onClick={handleDownloadTransparent} disabled={isExtracting} title="투명 PNG 다운로드 (검은 배경 알파 추출)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white text-[12px] font-medium transition-colors disabled:opacity-50">
              {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />} 투명 PNG
            </button>
            <button onClick={() => setZoomOpen(false)} title="닫기 (Esc)"
              className="p-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <img src={dataUrl} alt={theme.label} onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain" />
        </div>
      </div>
    )}
    </>
  );
}

