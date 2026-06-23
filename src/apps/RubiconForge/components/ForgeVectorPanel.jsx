// 벡터 생성(vector) 모드 우측 패널 — Gemini 가 출력한 SVG 들을 인라인 프리뷰 + 복사/다운로드.
// SVG 는 viewBox 만 있고 width/height 가 없어 컨테이너 폭에 맞춰 종횡비대로 렌더된다.

import { useState } from 'react';
import { Loader2, PenTool, Copy, Check, Download, RefreshCcw, AlertCircle, Code2 } from 'lucide-react';
import { svgToPngDataUrl } from '../services/vectorGen';
import { VECTOR_CATEGORY_BY_ID } from '../constants/vectors';

const gridCols = (n) => (n <= 1 ? 'grid-cols-1' : n <= 4 ? 'grid-cols-2' : 'grid-cols-3');

// 투명 배경 체커 — 라이트/다크 톤이 섞여도 보이도록.
const CHECKER = {
  backgroundImage:
    'linear-gradient(45deg,#1a1a1d 25%,transparent 25%),linear-gradient(-45deg,#1a1a1d 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1d 75%),linear-gradient(-45deg,transparent 75%,#1a1a1d 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
  backgroundColor: '#0d0d10',
};

function VectorCell({ slot, idx, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const copySvg = async () => {
    if (!slot.svg) return;
    try {
      await navigator.clipboard.writeText(slot.svg);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = slot.svg; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadSvg = () => {
    if (!slot.svg) return;
    const blob = new Blob([slot.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rubicon-vector-${idx + 1}.svg`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPng = async () => {
    if (!slot.svg) return;
    try {
      const png = await svgToPngDataUrl(slot.svg, { width: 1024, background: null });
      const a = document.createElement('a');
      a.href = png; a.download = `rubicon-vector-${idx + 1}.png`; a.click();
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0F0F12] overflow-hidden flex flex-col">
      <div className="relative h-44 flex items-center justify-center p-5" style={CHECKER}>
        {slot.isLoading ? (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            <span className="text-[10px] font-semibold">SVG 생성 중...</span>
          </div>
        ) : slot.error ? (
          <div className="flex flex-col items-center gap-2 text-rose-400/80 px-4 text-center">
            <AlertCircle className="w-5 h-5" />
            <span className="text-[10px] leading-relaxed break-keep-all">{slot.error}</span>
          </div>
        ) : slot.svg ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: slot.svg }}
          />
        ) : (
          <span className="text-[10px] text-zinc-600">대기 중</span>
        )}
      </div>

      <div className="flex items-center gap-1 px-2 py-2 border-t border-zinc-800/70 bg-[#0b0b0d]">
        <button onClick={copySvg} disabled={!slot.svg} title="SVG 코드 복사"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} SVG
        </button>
        <button onClick={downloadSvg} disabled={!slot.svg} title="SVG 파일 다운로드"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30">
          <Download className="w-3 h-3" /> .svg
        </button>
        <button onClick={downloadPng} disabled={!slot.svg} title="PNG 로 다운로드"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30">
          <Download className="w-3 h-3" /> .png
        </button>
        <button onClick={() => setShowCode(v => !v)} disabled={!slot.svg} title="코드 보기"
          className={`px-2 py-1.5 rounded-md text-[10px] font-semibold transition-colors disabled:opacity-30 ${showCode ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
          <Code2 className="w-3 h-3" />
        </button>
        <button onClick={() => onRegenerate(idx)} disabled={slot.isLoading} title="다시 생성"
          className="px-2 py-1.5 rounded-md text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30">
          <RefreshCcw className="w-3 h-3" />
        </button>
      </div>

      {showCode && slot.svg && (
        <textarea
          readOnly
          value={slot.svg}
          onFocus={e => e.target.select()}
          spellCheck={false}
          className="w-full h-32 bg-[#08080a] border-t border-zinc-800 p-3 text-[10px] text-zinc-400 font-mono leading-relaxed resize-y outline-none custom-scrollbar"
        />
      )}
    </div>
  );
}

export default function ForgeVectorPanel({ forge }) {
  const {
    vectorResults, isGeneratingVector, handleGenerateVector, handleRegenerateVector,
    vectorCategory, vectorCount,
  } = forge;

  const cat = VECTOR_CATEGORY_BY_ID[vectorCategory];
  const total = vectorResults.length;
  const done = vectorResults.filter(s => s.svg).length;
  const hasAny = vectorResults.some(s => s.svg || s.error);

  return (
    <div className="flex-1 flex flex-col bg-[#050507] overflow-y-auto custom-scrollbar relative">
      <div className="p-8 lg:p-12 max-w-[1200px] mx-auto w-full">

        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 text-zinc-300">
            <PenTool className="w-5 h-5 text-[#76cee0]" />
            <h2 className="text-[18px] font-bold">벡터 생성 <span className="text-[12px] font-normal text-zinc-500">— 깔끔한 플랫 · 라인 SVG</span></h2>
          </div>
          <p className="text-[12px] text-zinc-500 leading-relaxed break-keep-all">
            불릿·아이콘·배지, 구분선·코너 장식, 프레임·패널을 <span className="text-zinc-300">진짜 벡터(SVG)</span>로 생성합니다. 무한 확대·편집 자유·초경량 — 각 결과에서 SVG 복사 / .svg · .png 다운로드 / 재생성 가능.
          </p>
        </div>

        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl border border-zinc-800/60 bg-[#0F0F12]">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-zinc-300">{cat?.label || '벡터'}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 break-keep-all">
              {isGeneratingVector ? `${vectorCount}개 생성 중...` : hasAny ? `완료 ${done}/${total}` : '좌측에서 종류·스타일·팔레트를 고르고 생성하세요'}
            </div>
          </div>
          <button
            onClick={handleGenerateVector}
            disabled={isGeneratingVector}
            className="px-5 py-3 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#8ad8e8] font-bold text-[13px] flex items-center gap-2 transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {isGeneratingVector ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
            {isGeneratingVector ? '생성 중...' : `${vectorCount}개 생성`}
          </button>
        </div>

        {total > 0 ? (
          <div className={`grid gap-4 ${gridCols(total)}`}>
            {vectorResults.map((slot, idx) => (
              <VectorCell key={slot.id} slot={slot} idx={idx} onRegenerate={handleRegenerateVector} />
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-600 leading-relaxed break-keep-all p-4 rounded-lg border border-zinc-800/40 bg-zinc-900/20">
            <div className="font-bold text-zinc-400 mb-2">사용 방법</div>
            1. 좌측에서 <span className="text-zinc-400 font-bold">종류</span>(불릿·구분선·프레임), <span className="text-zinc-400 font-bold">스타일</span>(라인/플랫/듀오톤/장식), <span className="text-zinc-400 font-bold">팔레트</span>를 고릅니다.<br />
            2. 원하는 모양을 한 줄로 적습니다 (예: "마름모 머릿점", "좌우 대칭 넝쿨 디바이더").<br />
            3. "N개 생성" → 변형 N개가 SVG 로 나옵니다. 마음에 드는 걸 복사하거나 .svg / .png 로 내려받으세요.<br />
            <span className="text-zinc-500">로그인 시 결과는 PromptArc '벡터 보관함' 폴더에 자동 저장됩니다.</span>
          </div>
        )}
      </div>
    </div>
  );
}
