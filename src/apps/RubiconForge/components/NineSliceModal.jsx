// 9-슬라이스 편집기 — 변형 결과 셀에서 열림.
//   - 좌측: 원본 + 4개 인셋 가이드 라인 SVG 오버레이
//   - 우측: 선택한 타깃 크기로 9-슬라이스 렌더한 실시간 미리보기
//   - 하단: CSS `border-image-slice` 복사 / 현재 크기 PNG / 투명 PNG 다운로드
//
// 인셋은 "원본 픽셀 기준" 정수. 사용자 입력은 % 슬라이더와 px 입력 모두 지원.
// 미리보기 사이즈는 4개 프리셋 + custom W/H.

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Copy, Check, Download, Eraser, Loader2 } from 'lucide-react';
import { drawNineSlice, renderNineSliceToDataUrl, insetsToCssBorderImageSlice } from '../../../lib/nineSlice';
import { blackToTransparentPng } from '../services/variations';

const SIZE_PRESETS = [
  { id: 'btnWide',  label: '버튼 와이드',  w: 480, h: 120 },
  { id: 'btnStd',   label: '버튼 표준',    w: 320, h: 160 },
  { id: 'panel',    label: '패널',         w: 720, h: 400 },
  { id: 'cardV',    label: '카드 세로',    w: 260, h: 380 },
];

export default function NineSliceModal({ open, dataUrl, themeLabel, themeColor, onClose }) {
  const [img, setImg] = useState(null);
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [preset, setPreset] = useState('btnWide');
  const [customW, setCustomW] = useState(480);
  const [customH, setCustomH] = useState(120);
  const [isCustom, setIsCustom] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [draggingSide, setDraggingSide] = useState(null); // 'top' | 'right' | 'bottom' | 'left' | null

  const previewCanvasRef = useRef(null);
  const svgRef = useRef(null);

  // dataUrl → HTMLImageElement + 기본 인셋(원본 25%). 모달은 부모에서 key={dataUrl} 로 재마운트하므로
  // 다른 슬롯 전환 시 깨끗하게 새 상태로 시작 (별도 cleanup effect 불필요).
  useEffect(() => {
    if (!open || !dataUrl) return;
    const next = new Image();
    next.onload = () => {
      setImg(next);
      const sw = next.naturalWidth;
      const sh = next.naturalHeight;
      setInsets({
        top:    Math.round(sh * 0.25),
        bottom: Math.round(sh * 0.25),
        left:   Math.round(sw * 0.25),
        right:  Math.round(sw * 0.25),
      });
    };
    next.src = dataUrl;
  }, [open, dataUrl]);

  const targetSize = useMemo(() => {
    if (isCustom) return { w: Math.max(1, customW), h: Math.max(1, customH) };
    const p = SIZE_PRESETS.find(p => p.id === preset) || SIZE_PRESETS[0];
    return { w: p.w, h: p.h };
  }, [preset, customW, customH, isCustom]);

  // 미리보기 캔버스 갱신 — 이미지·인셋·타깃 크기 변경 시.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !img) return;
    canvas.width = targetSize.w;
    canvas.height = targetSize.h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawNineSlice(ctx, img, insets, targetSize.w, targetSize.h);
  }, [img, insets, targetSize]);

  if (!open) return null;

  const sw = img?.naturalWidth || 0;
  const sh = img?.naturalHeight || 0;
  const cssSlice = insetsToCssBorderImageSlice(insets, true);

  // 원본 SVG 오버레이 좌표 — 원본 px 단위로 그리고 viewBox 로 스케일.
  const guideColor = themeColor || '#76cee0';

  const handleCopyCss = () => {
    navigator.clipboard.writeText(`border-image-slice: ${cssSlice};`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  // 가이드 라인 드래그 — 클라이언트 좌표 → SVG 의 원본 px 좌표 변환 후 인셋 갱신.
  // SVG 가 preserveAspectRatio="none" 으로 늘어나 그려지므로 단순 비율 변환만 하면 됨.
  // 4 변 모두 서로를 침범하지 않도록 [0, dim - oppositeInset - 1] 로 clamp.
  const updateInsetFromPointer = (side, clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const localX = ((clientX - rect.left) / rect.width) * sw;
    const localY = ((clientY - rect.top) / rect.height) * sh;
    setInsets(prev => {
      const next = { ...prev };
      if (side === 'left') {
        next.left = Math.max(0, Math.min(sw - prev.right - 1, Math.round(localX)));
      } else if (side === 'right') {
        next.right = Math.max(0, Math.min(sw - prev.left - 1, Math.round(sw - localX)));
      } else if (side === 'top') {
        next.top = Math.max(0, Math.min(sh - prev.bottom - 1, Math.round(localY)));
      } else if (side === 'bottom') {
        next.bottom = Math.max(0, Math.min(sh - prev.top - 1, Math.round(sh - localY)));
      }
      return next;
    });
  };
  const handleLinePointerDown = (side) => (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDraggingSide(side);
    updateInsetFromPointer(side, e.clientX, e.clientY);
  };
  const handleLinePointerMove = (side) => (e) => {
    if (draggingSide !== side) return;
    updateInsetFromPointer(side, e.clientX, e.clientY);
  };
  const handleLinePointerUp = (side) => (e) => {
    if (draggingSide !== side) return;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* noop */ }
    setDraggingSide(null);
  };

  const handleDownload = async (transparent) => {
    if (!img || isExporting) return;
    setIsExporting(true);
    try {
      let outDataUrl = await renderNineSliceToDataUrl(img, insets, targetSize.w, targetSize.h);
      if (transparent) {
        outDataUrl = await blackToTransparentPng(outDataUrl);
      }
      const a = document.createElement('a');
      a.href = outDataUrl;
      const tag = transparent ? 'transparent-' : '';
      a.download = `rubicon-9slice-${tag}${targetSize.w}x${targetSize.h}-${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error('[NineSliceModal] export failed', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[92vh] bg-[#0F0F12] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: guideColor }} />
            <h3 className="text-[14px] font-bold text-zinc-100 truncate">
              9-슬라이스 편집기 — {themeLabel}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 본문 — 2단 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 좌측 — 원본 + 가이드 + 인셋 입력 */}
          <div className="flex flex-col gap-4 min-w-0">
            <div>
              <div className="text-[11px] font-bold text-zinc-400 mb-2">원본 + 슬라이스 가이드</div>
              <div className="relative w-full rounded-lg overflow-hidden bg-black border border-zinc-800">
                {img && (() => {
                  // 가이드 두께/대시 — 원본 해상도에 비례. 드래그 중인 변은 두께 ↑·실선.
                  const vStrokeW = Math.max(2, sw / 400);
                  const hStrokeW = Math.max(2, sh / 400);
                  const vDash = `${sw / 80} ${sw / 80}`;
                  const hDash = `${sh / 80} ${sh / 80}`;
                  const hitW = Math.max(14, Math.min(sw, sh) / 35); // 충분히 두꺼운 hit zone
                  const handleR = Math.max(5, Math.min(sw, sh) / 90);
                  const sideLine = (side, x1, y1, x2, y2, isVertical) => {
                    const active = draggingSide === side;
                    const cx = isVertical ? x1 : (x1 + x2) / 2;
                    const cy = isVertical ? (y1 + y2) / 2 : y1;
                    return (
                      <g key={side}>
                        {/* 보이는 점선 — non-interactive */}
                        <line
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke={guideColor}
                          strokeWidth={active ? (isVertical ? vStrokeW * 1.8 : hStrokeW * 1.8) : (isVertical ? vStrokeW : hStrokeW)}
                          strokeDasharray={active ? undefined : (isVertical ? vDash : hDash)}
                          opacity={active ? 1 : 0.85}
                          pointerEvents="none"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* 가운데 그립 핸들 — 드래그 가능함을 시각적으로 알림 */}
                        <circle
                          cx={cx} cy={cy} r={active ? handleR * 1.3 : handleR}
                          fill={guideColor}
                          stroke="#000"
                          strokeWidth={Math.max(1, handleR / 4)}
                          pointerEvents="none"
                        />
                        {/* 투명 hit zone — 두껍게 깔아서 드래그 받기 쉽게 */}
                        <line
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke="transparent"
                          strokeWidth={hitW}
                          style={{ cursor: isVertical ? 'ew-resize' : 'ns-resize', touchAction: 'none' }}
                          pointerEvents="stroke"
                          onPointerDown={handleLinePointerDown(side)}
                          onPointerMove={handleLinePointerMove(side)}
                          onPointerUp={handleLinePointerUp(side)}
                          onPointerCancel={handleLinePointerUp(side)}
                        />
                      </g>
                    );
                  };
                  return (
                    <>
                      <img src={dataUrl} alt="원본" className="w-full h-auto block pointer-events-none select-none" draggable={false} />
                      <svg
                        ref={svgRef}
                        className="absolute inset-0 w-full h-full"
                        viewBox={`0 0 ${sw} ${sh}`}
                        preserveAspectRatio="none"
                        style={{ touchAction: 'none' }}
                      >
                        {/* 중앙 영역 하이라이트 — 어디가 늘어나는지 시각화 */}
                        <rect
                          x={insets.left}
                          y={insets.top}
                          width={Math.max(0, sw - insets.left - insets.right)}
                          height={Math.max(0, sh - insets.top - insets.bottom)}
                          fill={guideColor}
                          opacity={draggingSide ? 0.14 : 0.08}
                          pointerEvents="none"
                        />
                        {sideLine('left',   insets.left,       0,  insets.left,       sh, true)}
                        {sideLine('right',  sw - insets.right, 0,  sw - insets.right, sh, true)}
                        {sideLine('top',    0, insets.top,        sw, insets.top,        false)}
                        {sideLine('bottom', 0, sh - insets.bottom, sw, sh - insets.bottom, false)}
                      </svg>
                    </>
                  );
                })()}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1.5">
                원본 {sw} × {sh} px — 점선 / 가운데 동그라미를 드래그해서 인셋을 조정하세요
              </div>
            </div>

            {/* 인셋 입력 */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 mb-2">슬라이스 인셋 (px)</div>
              <div className="grid grid-cols-2 gap-2">
                {(['top', 'right', 'bottom', 'left']).map(side => {
                  const max = (side === 'top' || side === 'bottom') ? sh : sw;
                  const label = { top: '상', right: '우', bottom: '하', left: '좌' }[side];
                  return (
                    <div key={side} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-zinc-500 w-6 shrink-0">{label}</span>
                      <input
                        type="number"
                        min={0}
                        max={max}
                        value={insets[side]}
                        onChange={e => setInsets(prev => ({ ...prev, [side]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) }))}
                        className="flex-1 min-w-0 bg-[#0A0A0A] border border-zinc-800 rounded-md px-2 py-1.5 text-[12px] text-zinc-200 outline-none focus:border-zinc-600"
                      />
                      <input
                        type="range"
                        min={0}
                        max={max}
                        value={insets[side]}
                        onChange={e => setInsets(prev => ({ ...prev, [side]: Number(e.target.value) }))}
                        className="flex-1 min-w-0 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: guideColor }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 우측 — 미리보기 사이즈 + 결과 캔버스 */}
          <div className="flex flex-col gap-4 min-w-0">
            <div>
              <div className="text-[11px] font-bold text-zinc-400 mb-2">미리보기 사이즈</div>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setPreset(p.id); setIsCustom(false); }}
                    className={`px-2 py-2 rounded-lg border text-[10px] font-bold transition-colors ${(!isCustom && preset === p.id) ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-[#121212] border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {p.label}<br /><span className="text-[9px] text-zinc-500">{p.w}×{p.h}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${isCustom ? 'text-[#76cee0]' : 'text-zinc-500 hover:text-zinc-300'} cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={isCustom}
                    onChange={e => setIsCustom(e.target.checked)}
                    className="accent-[#76cee0]"
                  />
                  Custom
                </label>
                <input
                  type="number"
                  min={1}
                  value={customW}
                  onChange={e => { setCustomW(Math.max(1, Number(e.target.value) || 1)); setIsCustom(true); }}
                  className="w-20 bg-[#0A0A0A] border border-zinc-800 rounded-md px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-600"
                />
                <span className="text-zinc-500 text-[11px]">×</span>
                <input
                  type="number"
                  min={1}
                  value={customH}
                  onChange={e => { setCustomH(Math.max(1, Number(e.target.value) || 1)); setIsCustom(true); }}
                  className="w-20 bg-[#0A0A0A] border border-zinc-800 rounded-md px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-zinc-600"
                />
                <span className="text-zinc-600 text-[10px]">px</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-zinc-400 mb-2">
                결과 미리보기 ({targetSize.w}×{targetSize.h})
              </div>
              <div className="rounded-lg border border-zinc-800 bg-[#050507] p-4 flex items-center justify-center overflow-auto custom-scrollbar" style={{ maxHeight: 360 }}>
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 320,
                    display: 'block',
                    imageRendering: 'auto',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 하단 — Export */}
        <div className="border-t border-zinc-800 px-6 py-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <code className="flex-1 min-w-0 truncate text-[11px] font-mono text-zinc-300 bg-[#0A0A0A] border border-zinc-800 rounded-md px-3 py-2">
              border-image-slice: {cssSlice};
            </code>
            <button
              onClick={handleCopyCss}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#76cee0]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '복사됨' : 'CSS 복사'}
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleDownload(true)}
              disabled={isExporting || !img}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold transition-colors disabled:opacity-40"
              title="검은 배경 알파 추출 후 다운로드"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5" />}
              투명 PNG
            </button>
            <button
              onClick={() => handleDownload(false)}
              disabled={isExporting || !img}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#76cee0] hover:bg-[#92dceb] text-zinc-900 text-[11px] font-bold transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              PNG 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
