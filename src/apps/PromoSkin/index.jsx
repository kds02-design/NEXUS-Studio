// Promo Skin Studio — 월별 프로모션 페이지 스킨 디자이너.
// 초보자 흐름:
//   ① 상단 비주얼 — 단일 이미지 한 장 업로드(기본) 또는 분리 슬롯 모드
//   ② 하단 섹션 — 각 섹션을 통째 이미지로 대체(자동화) 또는 표시 토글
//   ③ 테마 토큰/AI 프리셋 — 필요 시 고급 옵션에서 조정
// 외부 API 호출(컨셉→프리셋)은 services/gemini.js 의 공용 Gemini 키 경유.
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Wand2, Palette, Download, Copy, Check, RotateCcw, Loader2, Image as ImageIcon,
  Frame, Move, LayoutPanelTop, Eye, EyeOff, Sparkles, Upload, X,
} from "lucide-react";
import { useUsageGate } from "../../components/UsageGate";
import { StepCard, FieldHeader, AdvancedToggle } from "../../components/SovereignKit";
import PromoPage from "./components/PromoPage";
import { generateThemePreset } from "./services/gemini";
import {
  CANVAS_W, H_HERO,
  PRESETS, DEFAULT_CONTENT, DEFAULT_TITLE, DEFAULT_HERO,
  DEFAULT_SECTION_OVERRIDES, DEFAULT_SECTION_VISIBILITY,
  ENUMS, mergePreset,
} from "./constants/presets";

const ACCENT = "#5FCF7A";

/* ─────────── 공용 위젯 ─────────── */
function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] text-zinc-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}
function ColorRow({ label, value, onChange }) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-zinc-500 font-mono">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-8 h-7 rounded cursor-pointer bg-transparent border border-zinc-700" />
      </div>
    </Row>
  );
}
function RangeRow({ label, value, min, max, step = 1, onChange, display = (v) => v }) {
  return (
    <Row label={label}>
      <div className="flex items-center gap-2 w-full max-w-[170px]">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="flex-1" style={{ accentColor: ACCENT }} />
        <span className="text-[11px] text-zinc-300 w-10 text-right">{display(value)}</span>
      </div>
    </Row>
  );
}
function SelectRow({ label, value, options, onChange }) {
  return (
    <Row label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 capitalize focus:outline-none focus:border-zinc-500">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Row>
  );
}
function TextRow({ label, value, onChange }) {
  return (
    <Row label={label}>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-200 w-full max-w-[180px] focus:outline-none focus:border-zinc-500" />
    </Row>
  );
}

// 드롭존 — 큰 이미지 업로드 영역. 단일 hero/섹션 override 등에 사용.
function DropZone({ label, value, onUpload, onClear, height = 100 }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const onFile = (f) => {
    if (!f || !f.type?.startsWith("image/")) return;
    const r = new FileReader(); r.onload = () => onUpload(r.result); r.readAsDataURL(f);
  };
  return (
    <div
      onClick={() => !value && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
      style={{ height }}
      className={`relative rounded-lg border-2 border-dashed transition-colors flex items-center justify-center overflow-hidden ${
        drag ? "border-[#5FCF7A] bg-[#5FCF7A]/10" : value ? "border-zinc-700 bg-black/40" : "border-zinc-700 bg-zinc-900/60 hover:border-zinc-500 cursor-pointer"
      }`}
    >
      {value ? (
        <>
          <img src={value} alt={label} className="w-full h-full object-contain" />
          <div className="absolute top-1 right-1 flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); ref.current?.click(); }} className="text-[10px] px-2 py-1 bg-black/70 hover:bg-black/90 text-zinc-200 rounded">교체</button>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="p-1 bg-black/70 hover:bg-rose-500/80 text-zinc-200 rounded">
              <X size={11} />
            </button>
          </div>
        </>
      ) : (
        <div className="text-center text-zinc-500">
          <Upload size={18} className="mx-auto mb-1" />
          <div className="text-[11px] font-medium">{label}</div>
          <div className="text-[9px] mt-0.5">드래그 또는 클릭</div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

// 표시 토글 row — checkbox + 라벨 + 옆에 이미지 업로드 옵션
function ToggleRow({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer py-1.5 hover:bg-white/[0.02] rounded px-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 cursor-pointer" style={{ accentColor: ACCENT }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-zinc-300 font-medium">{label}</div>
        {hint && <div className="text-[10px] text-zinc-500 leading-snug">{hint}</div>}
      </div>
    </label>
  );
}

// NEXUS 톤 카드
function Card({ icon, title, action, children }) {
  return (
    <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-3">
      {(icon || title || action) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-200">
            {icon}{title}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─────────── app ─────────── */
export default function PromoSkinApp() {
  const { ensureCanGenerate, modal } = useUsageGate();
  const [theme, setTheme] = useState(PRESETS.april);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [assets, setAssets] = useState({ bgImage: null, heroChar1: null, heroChar2: null, titleImage: null });
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [hero, setHero] = useState(DEFAULT_HERO);
  const [sectionOverrides, setSectionOverrides] = useState(DEFAULT_SECTION_OVERRIDES);
  const [sectionVisibility, setSectionVisibility] = useState(DEFAULT_SECTION_VISIBILITY);
  const [concept, setConcept] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [previewW, setPreviewW] = useState(900);
  const [canvasH, setCanvasH] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver((es) => { for (const e of es) setPreviewW(e.contentRect.width); });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const ro = new ResizeObserver((es) => { for (const e of es) setCanvasH(e.contentRect.height); });
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  const fit = previewW > 0 ? previewW / CANVAS_W : 0.35;

  const getPt = useCallback((e) => {
    const el = canvasRef.current; if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect(); const k = CANVAS_W / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  }, []);

  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current; if (!d) return;
      const p = getPt(e);
      if (d.mode === "move") setTitle((s) => ({ ...s, x: Math.round(d.ox + (p.x - d.sx)), y: Math.round(d.oy + (p.y - d.sy)) }));
      else { const dist = Math.hypot(p.x - d.cx, p.y - d.cy); setTitle((s) => ({ ...s, scale: Math.max(0.3, Math.min(3, +(d.s0 * (dist / Math.max(1, d.d0))).toFixed(2))) })); }
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [getPt]);

  const onTitleDown = (e) => { e.stopPropagation(); const p = getPt(e); dragRef.current = { mode: "move", sx: p.x, sy: p.y, ox: title.x, oy: title.y }; };
  const onResizeDown = (e) => { e.stopPropagation(); const p = getPt(e); dragRef.current = { mode: "resize", cx: title.x, cy: title.y, d0: Math.hypot(p.x - title.x, p.y - title.y), s0: title.scale }; };

  const setTok = (k, val) => setTheme((s) => ({ ...s, tokens: { ...s.tokens, [k]: val } }));
  const setVar = (k, val) => setTheme((s) => ({ ...s, variants: { ...s.variants, [k]: val } }));
  const setCt = (k, val) => setContent((s) => ({ ...s, [k]: val }));
  const setHr = (k, val) => setHero((s) => ({ ...s, [k]: val }));
  const setSo = (k, val) => setSectionOverrides((s) => ({ ...s, [k]: val }));
  const setSv = (k, val) => setSectionVisibility((s) => ({ ...s, [k]: val }));
  const setAs = (k, val) => setAssets((s) => ({ ...s, [k]: val }));

  async function genPreset() {
    if (!concept.trim() || loading) return;
    if (!(await ensureCanGenerate("analysis"))) return;
    setLoading(true); setErr("");
    try {
      const parsed = await generateThemePreset(concept);
      setTheme((prev) => mergePreset(prev, parsed, concept));
    } catch (e) {
      console.error("[PromoSkin] preset generation failed", e);
      setErr("프리셋 생성에 실패했어요. 다시 시도하거나 아래 토큰을 직접 조정하세요.");
    }
    setLoading(false);
  }

  const exportObj = {
    name: theme.name, concept: theme.concept,
    canvas: { w: CANVAS_W, contentW: 1200 },
    title: { x: title.x, y: title.y, scale: title.scale },
    hero, sectionVisibility,
    tokens: theme.tokens, variants: theme.variants,
  };
  const json = JSON.stringify(exportObj, null, 2);
  function copyJson() { navigator.clipboard && navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `theme_${theme.name.replace(/\s+/g, "_")}.json`; a.click();
  }
  function resetAll() {
    setTheme(PRESETS.april); setContent(DEFAULT_CONTENT);
    setAssets({ bgImage: null, heroChar1: null, heroChar2: null, titleImage: null });
    setTitle(DEFAULT_TITLE);
    setHero(DEFAULT_HERO);
    setSectionOverrides(DEFAULT_SECTION_OVERRIDES);
    setSectionVisibility(DEFAULT_SECTION_VISIBILITY);
  }

  const frameLabel = { glow: "글로우", metal: "메탈", flat: "플랫" };

  return (
    <div className="h-full bg-[#0c0c0e] text-zinc-200 overflow-hidden" style={{ fontFamily: "'Noto Sans KR', ui-sans-serif, system-ui" }}>
      {modal}
      <div className="h-full flex gap-4 p-4 overflow-hidden">
        {/* CONTROLS */}
        <aside className="w-[340px] shrink-0 bg-[#111111] border border-zinc-800/80 rounded-2xl flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pl-4 pr-2 py-4 space-y-3 custom-scrollbar">

            {/* Step 1 — 상단 비주얼 */}
            <StepCard step="1" accent={ACCENT} title="상단 비주얼" hint="배경·캐릭터·타이틀·날짜가 한 장에 합쳐진 이미지를 올리는 것을 추천">
              <FieldHeader icon={<LayoutPanelTop size={11} />} label="모드 선택" hint={hero.mode === "single" ? "이미지 한 장으로 한 번에" : "각 요소를 개별로 표시"} />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => setHr("mode", "single")}
                  className="text-[11px] rounded-lg py-2 border transition"
                  style={hero.mode === "single"
                    ? { background: `${ACCENT}22`, borderColor: ACCENT, color: ACCENT }
                    : { background: "#1a1a1f", borderColor: "#3f3f46", color: "#a1a1aa" }}>
                  🎨 합성 이미지 1장
                </button>
                <button onClick={() => setHr("mode", "composed")}
                  className="text-[11px] rounded-lg py-2 border transition"
                  style={hero.mode === "composed"
                    ? { background: `${ACCENT}22`, borderColor: ACCENT, color: ACCENT }
                    : { background: "#1a1a1f", borderColor: "#3f3f46", color: "#a1a1aa" }}>
                  🧩 분리 슬롯
                </button>
              </div>

              {hero.mode === "single" ? (
                <>
                  <DropZone label="합성 이미지 (배경+캐릭터+타이틀+날짜)" value={hero.singleImage} onUpload={(v) => setHr("singleImage", v)} onClear={() => setHr("singleImage", null)} height={120} />
                  <div className="mt-2 space-y-1">
                    <RangeRow label="어두움" value={hero.dim} min={0} max={0.85} step={0.01} onChange={(v) => setHr("dim", v)} display={(v) => Math.round(v * 100) + "%"} />
                    <RangeRow label="비네팅" value={hero.vignette} min={0} max={0.9} step={0.01} onChange={(v) => setHr("vignette", v)} display={(v) => Math.round(v * 100) + "%"} />
                    <RangeRow label="하단 페이드" value={hero.bottomFade} min={0} max={0.9} step={0.01} onChange={(v) => setHr("bottomFade", v)} display={(v) => Math.round(v * 100) + "%"} />
                    <ColorRow label="페이드 색" value={hero.fadeColor} onChange={(v) => setHr("fadeColor", v)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-0.5">
                    <ToggleRow label="배경" checked={hero.showBackground} onChange={(v) => setHr("showBackground", v)} hint="배경 이미지 또는 그라데이션" />
                    <ToggleRow label="캐릭터 1" checked={hero.showChar1} onChange={(v) => setHr("showChar1", v)} hint="좌측 캐릭터 일러스트" />
                    <ToggleRow label="캐릭터 2" checked={hero.showChar2} onChange={(v) => setHr("showChar2", v)} hint="우측 캐릭터 일러스트" />
                    <ToggleRow label="타이틀" checked={hero.showTitle} onChange={(v) => setHr("showTitle", v)} hint="중앙 타이틀 (드래그·리사이즈 가능)" />
                    <ToggleRow label="날짜" checked={hero.showDate} onChange={(v) => setHr("showDate", v)} hint="판매·수령 기간" />
                  </div>
                  <div className="border-t border-zinc-800 my-2" />
                  <div className="text-[10px] text-zinc-500 mb-1.5 px-0.5">개별 이미지 (분리 모드)</div>
                  {hero.showBackground && <DropZone label="배경 이미지" value={assets.bgImage} onUpload={(v) => setAs("bgImage", v)} onClear={() => setAs("bgImage", null)} height={70} />}
                  {hero.showChar1 && <div className="mt-2"><DropZone label="캐릭터 1" value={assets.heroChar1} onUpload={(v) => setAs("heroChar1", v)} onClear={() => setAs("heroChar1", null)} height={70} /></div>}
                  {hero.showChar2 && <div className="mt-2"><DropZone label="캐릭터 2" value={assets.heroChar2} onUpload={(v) => setAs("heroChar2", v)} onClear={() => setAs("heroChar2", null)} height={70} /></div>}
                  {hero.showTitle && (
                    <div className="mt-2">
                      <DropZone label="타이틀 이미지 (없으면 텍스트)" value={assets.titleImage} onUpload={(v) => setAs("titleImage", v)} onClear={() => setAs("titleImage", null)} height={70} />
                      <div className="mt-1.5 space-y-1">
                        <TextRow label="타이틀 (월)" value={content.titleMonth} onChange={(v) => setCt("titleMonth", v)} />
                        <TextRow label="타이틀 (본문)" value={content.titleMain} onChange={(v) => setCt("titleMain", v)} />
                      </div>
                    </div>
                  )}
                  {hero.showDate && (
                    <div className="mt-2 space-y-1">
                      <TextRow label="판매 기간" value={content.sales} onChange={(v) => setCt("sales", v)} />
                      <TextRow label="수령 기간" value={content.claim} onChange={(v) => setCt("claim", v)} />
                    </div>
                  )}
                </>
              )}
            </StepCard>

            {/* Step 2 — 하단 섹션 */}
            <StepCard step="2" accent={ACCENT} title="하단 섹션 — 통째 이미지로 대체" hint="각 섹션을 PNG 한 장으로 갈음 가능. 비우면 자동 디자인.">
              <SectionSlot label="① 스페셜 상품" value={sectionOverrides.productsImage} visible={sectionVisibility.products}
                onImage={(v) => setSo("productsImage", v)} onClearImage={() => setSo("productsImage", null)}
                onVisible={(v) => setSv("products", v)} />
              <SectionSlot label="② 보너스 혜택" value={sectionOverrides.bonusImage} visible={sectionVisibility.bonus}
                onImage={(v) => setSo("bonusImage", v)} onClearImage={() => setSo("bonusImage", null)}
                onVisible={(v) => setSv("bonus", v)} />
              <SectionSlot label="③ 획득 보너스 선물" value={sectionOverrides.milestonesImage} visible={sectionVisibility.milestones}
                onImage={(v) => setSo("milestonesImage", v)} onClearImage={() => setSo("milestonesImage", null)}
                onVisible={(v) => setSv("milestones", v)} />
              <SectionSlot label="④ 푸터 · 주의사항" value={sectionOverrides.footerImage} visible={sectionVisibility.footer}
                onImage={(v) => setSo("footerImage", v)} onClearImage={() => setSo("footerImage", null)}
                onVisible={(v) => setSv("footer", v)} />
            </StepCard>

            {/* Step 3 — 테마 (분리 모드/이미지 없는 섹션이 있을 때만 의미) */}
            <StepCard step="3" accent={ACCENT} title="테마 (자동 디자인 색감)" hint="자동 디자인 섹션의 색·프레임·버튼 톤. 컨셉을 입력하면 AI 가 자동 생성.">
              <textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows={2}
                placeholder="예: 9월 가을, 단풍, 따뜻하고 차분한"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-[11px] text-zinc-200 resize-none focus:outline-none focus:border-zinc-500" />
              <button onClick={genPreset} disabled={loading || !concept.trim()}
                className="mt-2 w-full flex items-center justify-center gap-2 text-[11px] font-bold rounded-lg py-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: loading ? "#3f3f46" : ACCENT, color: loading ? "#a1a1aa" : "#073a1c" }}>
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                {loading ? "생성 중…" : "AI 프리셋 생성"}
              </button>
              {err && <p className="text-[11px] text-red-400 mt-1.5">{err}</p>}

              <div className="mt-3 grid grid-cols-3 gap-2">
                {Object.entries(PRESETS).map(([k, p]) => (
                  <button key={k} onClick={() => { setTheme(p); setConcept(p.concept); }}
                    className="text-[10px] rounded-lg border border-zinc-700 hover:border-zinc-500 py-2 px-1 transition truncate"
                    style={{ background: `linear-gradient(135deg, ${p.tokens.bgMid}, ${p.tokens.bgBottom})`, color: p.tokens.title }}>
                    {p.name.split(" · ")[1]}
                  </button>
                ))}
              </div>

              <div className="border-t border-zinc-800 my-2.5" />
              <FieldHeader icon={<Frame size={11} />} label="프레임 스타일" hint="자동 디자인 패널 외곽 톤" />
              <div className="grid grid-cols-3 gap-2">
                {ENUMS.frame.map((f) => {
                  const on = theme.variants.frame === f;
                  return (
                    <button key={f} onClick={() => setVar("frame", f)}
                      className="text-[11px] rounded-lg py-1.5 border transition"
                      style={on
                        ? { background: `${ACCENT}22`, borderColor: ACCENT, color: ACCENT }
                        : { background: "#1a1a1f", borderColor: "#3f3f46", color: "#d4d4d8" }}>
                      {frameLabel[f]}
                    </button>
                  );
                })}
              </div>
            </StepCard>

            {/* 고급 옵션 — 세부 토큰 / 변형 / JSON */}
            <AdvancedToggle open={showAdvanced} onToggle={() => setShowAdvanced(v => !v)} accent={ACCENT}
              label="고급 옵션" sublabel="색 토큰 · 변형 셀렉트 · 타이틀 위치/크기 · JSON 내보내기">
              {hero.mode === "composed" && hero.showTitle && (
                <Card icon={<Move size={13} />} title="타이틀 위치 · 크기"
                  action={<button onClick={() => setTitle(DEFAULT_TITLE)} className="text-[10px] text-zinc-500 hover:text-zinc-300">기본값</button>}>
                  <RangeRow label="X" value={title.x} min={0} max={CANVAS_W} step={10} onChange={(v) => setTitle(s => ({ ...s, x: v }))} display={(v) => Math.round(v)} />
                  <RangeRow label="Y" value={title.y} min={0} max={H_HERO} step={10} onChange={(v) => setTitle(s => ({ ...s, y: v }))} display={(v) => Math.round(v)} />
                  <RangeRow label="크기" value={title.scale} min={0.3} max={3} step={0.05} onChange={(v) => setTitle(s => ({ ...s, scale: v }))} display={(v) => v.toFixed(2) + "x"} />
                </Card>
              )}

              <Card title="컬러 · 라운드 · 글로우 토큰">
                <ColorRow label="강조색 primary" value={theme.tokens.primary} onChange={(v) => setTok("primary", v)} />
                <ColorRow label="글로우 accent" value={theme.tokens.accent} onChange={(v) => setTok("accent", v)} />
                <ColorRow label="타이틀 title" value={theme.tokens.title} onChange={(v) => setTok("title", v)} />
                <ColorRow label="본문 textLight" value={theme.tokens.textLight} onChange={(v) => setTok("textLight", v)} />
                <ColorRow label="프레임 panel" value={theme.tokens.panel} onChange={(v) => setTok("panel", v)} />
                <ColorRow label="배경 상단" value={theme.tokens.bgTop} onChange={(v) => setTok("bgTop", v)} />
                <ColorRow label="배경 중앙" value={theme.tokens.bgMid} onChange={(v) => setTok("bgMid", v)} />
                <ColorRow label="배경 하단" value={theme.tokens.bgBottom} onChange={(v) => setTok("bgBottom", v)} />
                <RangeRow label="라운드" value={theme.tokens.radius} min={8} max={24} onChange={(v) => setTok("radius", v)} />
                <RangeRow label="글로우" value={theme.tokens.glow} min={0} max={30} onChange={(v) => setTok("glow", v)} />
              </Card>

              <Card title="구성 요소 변형">
                {Object.keys(ENUMS).map((k) => (
                  <SelectRow key={k} label={k} value={theme.variants[k]} options={ENUMS[k]} onChange={(v) => setVar(k, v)} />
                ))}
              </Card>

              <Card title="레이아웃 JSON 내보내기"
                action={
                  <div className="flex gap-1">
                    <button onClick={copyJson} className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition" title="복사">
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <button onClick={downloadJson} className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition" title="다운로드">
                      <Download size={12} />
                    </button>
                  </div>
                }>
                <pre className="text-[10px] leading-relaxed text-zinc-400 bg-black/40 rounded-lg p-2 overflow-x-auto" style={{ maxHeight: 180 }}>{json}</pre>
              </Card>
            </AdvancedToggle>

            <div className="h-16 shrink-0" aria-hidden="true" />
          </div>
        </aside>

        {/* PREVIEW */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-zinc-200" style={{ fontFamily: "'Teko', sans-serif", fontSize: 18, letterSpacing: "0.5px" }}>
                PROMO SKIN STUDIO
              </span>
              <span className="text-[11px] text-zinc-500 truncate">· {theme.name} · 캔버스 2560 × {Math.round(canvasH)} px ({Math.round(fit * 100)}%) · Hero {hero.mode === "single" ? "단일" : "분리"}</span>
            </div>
            <button onClick={resetAll}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-900 transition">
              <RotateCcw size={12} /> 초기화
            </button>
          </div>

          <div className="flex-1 bg-[#18181B] border border-zinc-800 rounded-2xl p-3 overflow-hidden">
            <div ref={wrapRef} className="w-full h-full overflow-y-auto custom-scrollbar">
              <div style={{ height: canvasH * fit, position: "relative", overflow: "hidden" }}>
                <div ref={canvasRef} style={{ width: CANVAS_W, transformOrigin: "top left", transform: `scale(${fit})`, position: "absolute", top: 0, left: 0 }}>
                  <PromoPage
                    theme={theme} content={content} assets={assets} title={title}
                    hero={hero} sectionOverrides={sectionOverrides} sectionVisibility={sectionVisibility}
                    onTitleDown={onTitleDown} onResizeDown={onResizeDown}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 하단 섹션 슬롯 — 이미지 업로드 + 표시 토글이 한 단위.
function SectionSlot({ label, value, visible, onImage, onClearImage, onVisible }) {
  return (
    <div className="border border-zinc-800/80 bg-[#141417] rounded-lg p-2.5 mb-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-zinc-300">{label}</span>
        <button onClick={() => onVisible(!visible)} title={visible ? "섹션 숨기기" : "섹션 표시"}
          className={`p-1 rounded transition ${visible ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-600 hover:bg-zinc-800"}`}>
          {visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
      </div>
      <DropZone label="이미지로 대체 (선택)" value={value} onUpload={onImage} onClear={onClearImage} height={70} />
      {value && (
        <div className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1">
          <Sparkles size={10} /> 이미지가 자동 디자인을 덮습니다
        </div>
      )}
      {!value && !visible && (
        <div className="text-[10px] text-zinc-600 mt-1.5">이 섹션은 숨김 상태</div>
      )}
    </div>
  );
}
