/* eslint-disable */
// friendly 모드 — 사용자가 첫 화면에서 '글자 모양'을 직접 보고 고른다.
// 카드 = 글자 스타일 10개 (SVG 글리프 미리보기 + 라벨). 용도는 자동 추정.
// 분위기 슬라이더 = 같은 스타일 안의 강도. 장식 = 사용자 명시적 ON 토글.
//
// 격리 원칙: current/v1/v2 의 어떤 모듈도 import 하지 않는다.

import React, { useMemo, useState } from 'react';
import {
  Sparkles, Dice5, ChevronDown, Loader2, Download, Copy, AlertCircle,
  CheckCircle, RefreshCcw, Wand,
} from 'lucide-react';

import { friendlyStyles, STYLE_MAP, SIZE_OPTIONS, LAYOUT_OPTIONS } from './constants/styles.jsx';
import { STYLE_GLYPHS } from './constants/styleGlyphs.jsx';
import { moodToOptions, moodLabel } from './constants/moodMap.js';
import { generateImage } from './services/imagen.js';

// ─── 친절 모드 자체 영문 데이터 ─────────────────────────────────────────
// 모두 weight 1.5~1.6 으로 Gemini 가 무시하기 어렵게 강제.
// 특히 비율은 "NOT vertical / NOT portrait" 를 명시해 세로로 길어지는 현상을 차단.

const FRIENDLY_RATIOS = {
  '16:9':   '(strict 16:9 horizontal widescreen format:1.6), landscape orientation, wider than tall, explicitly NOT vertical, NOT portrait',
  '1:1':    '(strict 1:1 square format:1.6), perfectly equal width and height, neither vertical nor horizontal stretched',
  '9:16':   '(strict 9:16 vertical portrait format:1.6), taller than wide, explicitly NOT horizontal',
  '2.76:1': '(strict 2.76:1 ultrawide cinematic format:1.6), extremely wide cinemascope letterbox, far wider than tall',
};

const FRIENDLY_OCC = {
  '40%': '(text occupies only 40% of the frame with massive empty void surrounding it:1.6), (small typography strictly confined to the center:1.5), vast negative space margins',
  '50%': '(text occupies exactly 50% of the frame with generous balanced margins:1.5), perfectly centered composition',
  '65%': '(text occupies 65% of the frame, screen-filling typography with moderate margins:1.5)',
  '80%': '(text occupies 80% of the frame, massive text pushing against canvas edges:1.5), tight cropping with minimal margins',
};

const FRIENDLY_LAYOUT = {
  '1Line':    '(single horizontal row of letters on one baseline:1.5), all characters strictly on the same horizontal line',
  '2Lines':   '(two-tier vertically stacked composition with letters on two horizontal lines:1.5), upper row and lower row of equal weight',
  'TitleSub': '(hierarchical composition with main title on top and smaller subtitle below:1.5), two-level scale hierarchy',
  'SubTitle': '(hierarchical composition with subtitle on top and main title below:1.5)',
  'Center':   '(centralized balanced composition with the text in the optical middle:1.4)',
};

// 분위기 슬라이더 — 글자 모양만 조절 (주변 장식은 별도 토글)
const MOOD_EN = {
  Stem_Std:    'medium balanced stems',
  Stem_Heavy:  'heavy thick stems',
  Stem_Ultra:  'massive ultra heavy block stems',
  Term_Round:  'smooth rounded terminals',
  Term_Clean:  'clean flat terminals',
  Term_Chisel: 'sharp chisel-cut terminals',
  Term_Blade:  'razor blade tips',
  Term_Claw:   'demonic claw terminals',
  Sharp_Soft:  'softened edges',
  Sharp_Std:   'crisp clean edges',
  Sharp_Crisp: 'sharp clean lines',
  Sharp_Razor: 'micro-chiseled razor-sharp edges',
  Slic_None:        'intact strokes',
  Slic_Partial:     'micro-incisions and structural cuts',
  Slic_Diagonal:    'diagonal slicing',
  Damage_None:      'pristine solid form, zero damage',
  Damage_Erosion:   'subtle weathered erosion',
  Damage_Cracking:  'intricate 2D cracks',
  Corner_Round: 'smooth rounded corners',
  Corner_Right: 'sharp 90-degree right-angle corners',
  Corner_Wedge: 'wedge-shaped corners',
  Corner_Blade: 'blade-like pointed corners',
};

const DECORATION_EN = {
  runes:    '(small floating geometric runes around the text:1.1), faint magical glyphs in the background',
  shards:   '(scattered stone and metal debris floating around the text:1.1), broken fragments in the background',
  radial:   '(radial energy spikes emanating from the text:1.2), light streaks behind the subject',
};

const DECORATION_OPTIONS = [
  { id: 'runes',  label: '룬', desc: '부유하는 기하학적 문양' },
  { id: 'shards', label: '파편', desc: '주변에 돌·금속 조각' },
  { id: 'radial', label: '방사선', desc: '뒤로 뻗는 에너지 빛줄기' },
];

// 친절 모드 프롬프트 조립.
function buildFriendlyPrompt({ text, styleId, mood, customRatio, customSize, customLayout, decoration }) {
  const style = STYLE_MAP[styleId] || friendlyStyles[0];
  const moodOpt = moodToOptions(mood);
  const ratio  = customRatio  || style.aspectRatio;
  const size   = customSize   || style.occupancy;
  const layout = customLayout || style.layoutType;

  const moodTokens = [
    MOOD_EN[moodOpt.stemWeight],
    MOOD_EN[moodOpt.terminalStyle],
    MOOD_EN[moodOpt.strokeSharpness],
    MOOD_EN[moodOpt.slicingIntensity],
    MOOD_EN[moodOpt.deformationDamage],
    MOOD_EN[moodOpt.cornerStyle],
    moodOpt.momentumActive ? '(implied directional motion blur and velocity streaks:1.2)' : '',
  ].filter(Boolean).join(', ');

  // 장식 OFF (default) 일 때 강한 VFX 차단
  const cleanGuard = decoration
    ? ''
    : '(clear cutout text shape:1.4), (flawless outer silhouette boundary:1.3), absolutely NO floating particles, NO surrounding debris, NO runes, NO sparks, NO scattered fragments, NO background ornaments. ';

  const decorationToken = decoration && DECORATION_EN[decoration]
    ? DECORATION_EN[decoration] + '. '
    : '';

  // 네온 스타일은 배경이 다름
  const baseStyle = style.baseStyle === 'BlackNeon'
    ? 'DEEP BLACK void background with vivid neon emission from the letters'
    : 'JET BLACK background, RADIANT WHITE subject';

  return [
    `Typography illustration of the exact text "${text}".`,
    `(perfectly intact text legibility:1.4), (100% correct spelling:1.5), absolutely NO missing letters.`,
    style.promptTokens + '.',
    moodTokens + '.',
    FRIENDLY_LAYOUT[layout] + '.',
    FRIENDLY_OCC[size] + '.',
    FRIENDLY_RATIOS[ratio] + '.',
    `(strictly zero perspective distortion:1.5), (flat 2D focal plane:1.4), absolutely NO rear extrusion, NO depth blur.`,
    baseStyle + '.',
    cleanGuard + decorationToken + style.forbidden,
  ].join(' ');
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────

const Engine = ({ version, setVersion, versions }) => {
  // 사용자 입력
  const [styleId, setStyleId] = useState('metal-heavy');
  const [text, setText] = useState('데스나이트');
  const [mood, setMood] = useState(50);

  // 메인에 노출되는 세부 옵션 — 스타일 default 를 따라가다 사용자가 직접 칩을 누르면 그 값을 고정.
  const [customSize, setCustomSize] = useState('');
  const [customLayout, setCustomLayout] = useState('');

  // "옵션 더보기"
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customRatio, setCustomRatio] = useState('');
  const [decoration, setDecoration] = useState(null);

  // 결과
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStyleSelect = (id) => {
    setStyleId(id);
    // 스타일을 바꾸면 사이즈·레이아웃·비율 모두 새 스타일의 default 로 복귀.
    setCustomSize('');
    setCustomLayout('');
    setCustomRatio('');
  };

  // 주사위 — 스타일·분위기·사이즈·레이아웃까지 한꺼번에 랜덤. 장식은 default OFF 정책 유지.
  const handleRandom = () => {
    const ids = friendlyStyles.map(s => s.id);
    setStyleId(ids[Math.floor(Math.random() * ids.length)]);
    setMood(Math.floor(Math.random() * 100));
    setCustomSize(SIZE_OPTIONS[Math.floor(Math.random() * SIZE_OPTIONS.length)].id);
    setCustomLayout(LAYOUT_OPTIONS[Math.floor(Math.random() * LAYOUT_OPTIONS.length)].id);
    if (advancedOpen) {
      const ratios = Object.keys(FRIENDLY_RATIOS);
      setCustomRatio(ratios[Math.floor(Math.random() * ratios.length)]);
    }
  };

  const prompt = useMemo(
    () => buildFriendlyPrompt({ text, styleId, mood, customRatio, customSize, customLayout, decoration }),
    [text, styleId, mood, customRatio, customSize, customLayout, decoration]
  );

  const handleGenerate = async () => {
    if (!text.trim()) { setErrorMsg('텍스트를 입력해주세요.'); return; }
    setIsGenerating(true);
    setErrorMsg('');
    setImageDataUrl(null);
    const result = await generateImage(prompt);
    if (result.ok) {
      setImageDataUrl(result.dataUrl);
    } else {
      setErrorMsg(result.error);
    }
    setIsGenerating(false);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* ignore */ }
  };

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = `${text || 'typecore'}-${Date.now()}.png`;
    a.click();
  };

  const currentMoodLabel = moodLabel(mood);
  const currentStyle = STYLE_MAP[styleId] || friendlyStyles[0];
  const accent = currentStyle.accent;

  return (
    <div className="flex flex-col h-full bg-[#09090B] text-zinc-100 overflow-hidden relative p-5 font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.2); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161,161,170,0.5); }
        @keyframes pulse-soft { 0%,100%{box-shadow:0 0 0 0 rgba(253,203,110,0.4)} 50%{box-shadow:0 0 0 12px rgba(253,203,110,0)} }
        .cta-pulse { animation: pulse-soft 2s ease-in-out infinite; }
      `}</style>

      <main className="flex-1 flex overflow-hidden gap-5 min-h-0">
        {/* 왼쪽 — 입력 패널 */}
        <aside className="w-[420px] shrink-0 border border-zinc-800 bg-[#18181B] rounded-2xl flex flex-col relative overflow-hidden shadow-2xl">
          <div className="flex-1 overflow-y-auto p-6 space-y-7 custom-scrollbar">

            {/* 버전 셀렉터 */}
            {versions && versions.length > 1 && (
              <div className="flex items-center gap-2 -mt-1">
                {versions.map(v => (
                  <button
                    key={v.key}
                    onClick={() => setVersion?.(v.key)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide transition-colors ${version === v.key ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {/* 1단 — 스타일 카드 10개 + 주사위 */}
            <section>
              <h3 className="text-[13px] font-bold text-zinc-200 mb-3">어떤 글자 스타일이 맘에 드세요?</h3>
              <div className="grid grid-cols-3 gap-2">
                {friendlyStyles.map(s => {
                  const Glyph = STYLE_GLYPHS[s.id];
                  const active = s.id === styleId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleStyleSelect(s.id)}
                      title={s.desc}
                      className={`group p-2.5 rounded-xl border transition-all flex flex-col items-center text-center ${active ? 'bg-zinc-900 shadow-lg' : 'bg-[#121212] border-zinc-800 hover:border-zinc-700 hover:bg-[#1a1a1a]'}`}
                      style={active ? { borderColor: s.accent, boxShadow: `0 0 0 1px ${s.accent}40` } : {}}
                    >
                      <div className="mb-1.5" style={{ color: active ? s.accent : '#9CA3AF' }}>
                        {Glyph && <Glyph />}
                      </div>
                      <div className={`text-[11px] font-bold leading-tight ${active ? 'text-white' : 'text-zinc-300'}`}>{s.label}</div>
                    </button>
                  );
                })}
                {/* 11번째 칸 — 주사위 */}
                <button
                  onClick={handleRandom}
                  className="p-2.5 rounded-xl border border-dashed border-zinc-700 bg-[#121212] hover:bg-[#1a1a1a] hover:border-zinc-500 transition-all flex flex-col items-center justify-center"
                  title="스타일·분위기 랜덤"
                >
                  <Dice5 className="w-[40px] h-[40px] text-zinc-500 mb-1.5 p-1.5" />
                  <div className="text-[11px] font-bold text-zinc-400">랜덤</div>
                </button>
              </div>
              <div className="mt-2 text-[10px] text-zinc-500">선택: <span style={{ color: accent }}>{currentStyle.label}</span> — {currentStyle.desc}</div>
            </section>

            {/* 2단 — 텍스트 */}
            <section>
              <h3 className="text-[13px] font-bold text-zinc-200 mb-3">텍스트</h3>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="만들 글자를 입력하세요"
                className="w-full bg-[#0A0A0A] text-white text-[18px] font-bold outline-none border border-zinc-800 rounded-xl px-4 py-3 focus:border-zinc-600 transition-colors"
              />
            </section>

            {/* 3단 — 분위기 슬라이더 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-zinc-200">강도</h3>
                <span className="text-[12px] font-bold" style={{ color: accent }}>{currentMoodLabel}</span>
              </div>
              <input
                type="range" min="0" max="100" value={mood}
                onChange={e => setMood(Number(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: accent }}
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-2">
                <span>고요함</span><span>차분함</span><span>균형</span><span>강렬함</span><span>격렬함</span>
              </div>
            </section>

            {/* 4단 — 사이즈 (여백) — 메인 노출 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-zinc-200">글자 크기</h3>
                {!customSize && (
                  <span className="text-[10px] text-zinc-500">자동 — {currentStyle.occupancy}</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_OPTIONS.map(s => {
                  const isAuto = !customSize && currentStyle.occupancy === s.id;
                  const isActive = customSize === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCustomSize(isActive ? '' : s.id)}
                      className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors ${isActive ? 'bg-zinc-800 border-zinc-600 text-white' : isAuto ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-[#121212] border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5단 — 레이아웃 — 메인 노출 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-zinc-200">배치</h3>
                {!customLayout && (
                  <span className="text-[10px] text-zinc-500">자동 — {LAYOUT_OPTIONS.find(l => l.id === currentStyle.layoutType)?.label}</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {LAYOUT_OPTIONS.map(l => {
                  const isAuto = !customLayout && currentStyle.layoutType === l.id;
                  const isActive = customLayout === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setCustomLayout(isActive ? '' : l.id)}
                      className={`px-1.5 py-2 rounded-lg border text-[11px] font-bold transition-colors ${isActive ? 'bg-zinc-800 border-zinc-600 text-white' : isAuto ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-[#121212] border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 6단 — 옵션 더보기 */}
            <section className="border-t border-zinc-800 pt-5">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between text-[12px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <span>옵션 더보기 (장식·비율)</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </button>

              {advancedOpen && (
                <div className="mt-4 space-y-5">
                  {/* 장식 토글 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-bold text-zinc-500">장식 (글자 주변)</div>
                      <button
                        onClick={() => setDecoration(decoration ? null : 'runes')}
                        className={`flex items-center gap-2 transition-colors ${decoration ? 'text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <span className="text-[10px] font-bold">{decoration ? 'ON' : 'OFF'}</span>
                        <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors ${decoration ? 'bg-amber-500' : 'bg-zinc-800 border border-zinc-700'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${decoration ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </button>
                    </div>
                    {decoration && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {DECORATION_OPTIONS.map(d => (
                          <button
                            key={d.id}
                            onClick={() => setDecoration(d.id)}
                            className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors ${decoration === d.id ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-[#121212] border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                            title={d.desc}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {!decoration && (
                      <div className="text-[10px] text-zinc-600">기본: 글자 주변 깨끗하게 유지</div>
                    )}
                  </div>

                  {/* 비율 */}
                  <div>
                    <div className="text-[11px] font-bold text-zinc-500 mb-2">비율</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {Object.keys(FRIENDLY_RATIOS).map(r => {
                        const isAuto = !customRatio && currentStyle.aspectRatio === r;
                        const isActive = customRatio === r;
                        return (
                          <button
                            key={r}
                            onClick={() => setCustomRatio(isActive ? '' : r)}
                            className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors ${isActive ? 'bg-zinc-800 border-zinc-600 text-white' : isAuto ? 'bg-zinc-900 border-zinc-700 text-zinc-400' : 'bg-[#121212] border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                    {!customRatio && (
                      <div className="text-[10px] text-zinc-600 mt-1.5">스타일에 따라 자동 — {currentStyle.aspectRatio}</div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </aside>

        {/* 오른쪽 — 결과 패널 */}
        <section className="flex-1 min-w-0 flex flex-col bg-[#18181B] rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
            <div className="max-w-[850px] w-full mx-auto">

              {/* Compile CTA */}
              <div className="flex items-center justify-between mb-8 gap-4">
                <div>
                  <div className="text-[20px] font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5" style={{ color: accent }} />
                    {currentStyle.label}
                  </div>
                  <div className="text-[12px] text-zinc-500 mt-1">
                    텍스트 "{text || '...'}" · {currentMoodLabel}
                    {decoration && <span className="text-amber-400/80"> · 장식 {DECORATION_OPTIONS.find(d => d.id === decoration)?.label}</span>}
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !text.trim()}
                  className={`cta-pulse px-7 py-3.5 rounded-xl font-bold text-[14px] flex items-center gap-2.5 transition-all shadow-lg ${isGenerating ? 'bg-zinc-700 text-zinc-400 cursor-wait' : 'bg-white text-zinc-900 hover:bg-zinc-100'}`}
                  style={!isGenerating ? { backgroundColor: accent, color: '#1A1A24' } : {}}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand className="w-4 h-4" />}
                  {isGenerating ? '만드는 중...' : '만들기'}
                </button>
              </div>

              {/* 결과 영역 */}
              <div className="rounded-2xl bg-[#0F0F12] border border-zinc-800 aspect-[16/9] flex items-center justify-center overflow-hidden relative">
                {isGenerating && (
                  <div className="flex flex-col items-center gap-3 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: accent }} />
                    <div className="text-[12px]">Gemini Image 가 그리는 중...</div>
                    <div className="text-[10px] text-zinc-600">보통 5~15초 걸려요</div>
                  </div>
                )}
                {!isGenerating && imageDataUrl && (
                  <img src={imageDataUrl} alt={text} className="w-full h-full object-contain" />
                )}
                {!isGenerating && !imageDataUrl && !errorMsg && (
                  <div className="flex flex-col items-center gap-3 text-zinc-600">
                    <Sparkles className="w-10 h-10 opacity-30" />
                    <div className="text-[12px]">"만들기" 버튼을 누르면 여기에 결과가 나옵니다</div>
                  </div>
                )}
                {!isGenerating && errorMsg && (
                  <div className="flex flex-col items-center gap-2 text-rose-400 px-8 text-center">
                    <AlertCircle className="w-8 h-8" />
                    <div className="text-[12px] font-bold">생성 실패</div>
                    <div className="text-[11px] text-rose-400/70 max-w-md">{errorMsg}</div>
                  </div>
                )}
              </div>

              {/* 결과 액션 바 */}
              {imageDataUrl && !isGenerating && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[12px] font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> PNG 다운로드
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[12px] font-bold flex items-center justify-center gap-2 transition-colors border border-zinc-800"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" /> 같은 옵션으로 다시
                  </button>
                </div>
              )}

              {/* 프롬프트 보기 */}
              <div className="mt-8 border-t border-zinc-800 pt-5">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPrompt ? 'rotate-180' : ''}`} />
                  실제 보내는 영문 프롬프트 보기 (Midjourney·ChatGPT 등에 직접 붙여넣기도 가능)
                </button>
                {showPrompt && (
                  <div className="mt-3 p-4 rounded-lg bg-[#0A0A0A] border border-zinc-800 relative">
                    <button
                      onClick={handleCopyPrompt}
                      className="absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] flex items-center gap-1"
                    >
                      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? '복사됨' : '복사'}
                    </button>
                    <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed pr-16" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {prompt}
                    </pre>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Engine;
