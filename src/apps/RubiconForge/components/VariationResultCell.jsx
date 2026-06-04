// 변형/아틀라스 결과 그리드의 단일 셀 — 두 모드에서 공유.
//   - showNineSlice=true (변형 모드): 9-슬라이스 편집기 버튼 노출
//   - showNineSlice=false (아틀라스 모드): 9-슬라이스 버튼 숨김 (전체 아틀라스는 9-슬라이스 대상 아님)
//   - filePrefix: 다운로드 파일명 prefix ("rubicon-variation" or "rubicon-atlas")

import { useState } from 'react';
import {
  Loader2, AlertCircle, Download, RefreshCcw, ImageOff, Eraser, Grid3x3, FileText,
} from 'lucide-react';
import { blackToTransparentPng } from '../services/variations';

export default function VariationResultCell({
  slot, idx, onRegenerate,
  onOpenNineSlice, showNineSlice = true,
  filePrefix = 'rubicon-variation',
  sourceLoaded,
}) {
  const { theme, dataUrl, error, prompt, isLoading } = slot;
  const [isExtracting, setIsExtracting] = useState(false);

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
        <img src={dataUrl} alt={theme.label} className="absolute inset-0 w-full h-full object-contain bg-black" />
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
          {prompt && (
            <button
              onClick={handleDownloadPrompt}
              title="실제 사용된 프롬프트 .txt 다운로드"
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
  );
}

