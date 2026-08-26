// 광원·빛효과 옵션 패널 — KvEdit '광원·빛효과' 모드에서 사용.
// 기존 ForgeSidebar 의 lightfx 브랜치를 이관. lightfx 상태/핸들러는 forge(useForgePrompt)에서 받는다.
import { useState } from 'react';
import { ChevronDown, UploadCloud, X, Wand2, Loader2, Sparkles, Sun, CircleHelp, UserRound, Type, PackageOpen, SlidersHorizontal } from 'lucide-react';
import { LIGHTFX_CATEGORIES, LIGHTFX_FORMS, LIGHTFX_STYLES, LIGHTFX_COLORS, LIGHTFX_MATERIALS, LIGHTFX_GRAINS, LIGHTFX_BOKEHS } from '../constants/lightfx';
import { BG_COLORS } from '../constants/variations';
import { IMAGEN_MODELS, RENDER_SIZES, isProImageModel } from '../../../lib/imagenRender';

const QUICK_EFFECTS = [
  {
    id: 'character-outline', label: '캐릭터 외곽 이펙트', desc: '실루엣 가장자리에 절제된 림 블룸과 미세 글린트', icon: UserRound,
    settings: { category: 'halo', form: 'charAura', style: 'soft', color: 'cyan', intensity: 'subtle', material: 'mist', grain: 'fine', bokeh: 'fine', text: '캐릭터 외곽의 선택된 가장자리에만 부드러운 림 블룸과 소수의 미세 글린트. 얼굴과 몸통 중앙은 비우고 전체 테두리 선처럼 보이지 않게' },
  },
  {
    id: 'title-front', label: '타이틀 전방 이펙트', desc: '글자 앞에 얕게 교차하는 글린트·빛줄기·입자', icon: Type,
    settings: { category: 'lightStreak', form: 'titleFront', style: 'sharp', color: 'gold', intensity: 'subtle', material: 'none', grain: 'fine', bokeh: 'fine', text: '타이틀 전방의 일부 하단과 모서리에만 짧은 글린트, 얇은 빛줄기와 미세 입자. 글자 가독성과 자형을 가리지 않게' },
  },
  {
    id: 'item-front', label: '아이템 전방 이펙트', desc: '아이템 앞 접촉광과 상승 파티클로 입체감 강화', icon: PackageOpen,
    settings: { category: 'particle', form: 'itemFront', style: 'magical', color: 'gold', intensity: 'medium', material: 'none', grain: 'fine', bokeh: 'fine', text: '아이템 전방 하단의 국소 접촉광, 앞쪽을 짧게 감싸는 위습과 소수의 상승 파티클. 아이템 본체와 보상 아이콘은 재현하거나 가리지 않게' },
  },
];

function HelpPopover({ text }) {
  return (
    <span className="relative group/help inline-flex">
      <span tabIndex={0} className="p-0.5 text-zinc-600 hover:text-zinc-300 outline-none" aria-label="설명 보기"><CircleHelp className="w-3.5 h-3.5" /></span>
      <span className="pointer-events-none absolute right-0 bottom-full mb-2 z-[1000] hidden group-hover/help:block group-focus-within/help:block w-56 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-normal leading-relaxed text-zinc-300 shadow-xl">
        {text}
      </span>
    </span>
  );
}

function BgColorPicker({ value, onChange, hint }) {
  const [open, setOpen] = useState(false);
  const selected = BG_COLORS.find(c => c.id === value) || BG_COLORS[0];
  return (
    <section className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full h-9 px-3 rounded-md border border-zinc-800 bg-[#141417] flex items-center justify-between hover:border-zinc-700">
        <span className="flex items-center gap-2 text-[11px] text-zinc-300">
          <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: selected.hex }} />
          배경색 · {selected.label}
          <HelpPopover text={hint || '기본은 블랙입니다. 투명화 경계가 불안정할 때만 오브젝트와 대비되는 크로마 색을 선택하세요.'} />
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="absolute left-0 right-0 top-11 z-[900] grid grid-cols-3 gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
        {BG_COLORS.map(c => {
          const active = c.id === value;
          return (
            <button
              key={c.id}
              onClick={() => onChange(c.id)}
              title={`${c.label} · ${c.desc}`}
              className={`flex items-center gap-2 px-2 py-2 rounded-md border transition-colors ${active ? 'bg-zinc-800 border-zinc-500' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: c.hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}
              />
              <span className={`text-[9px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-400'}`}>{c.label}</span>
            </button>
          );
        })}
      </div>}
    </section>
  );
}

export default function ForgeLightFxOptions({ forge }) {
  const [activeQuickEffect, setActiveQuickEffect] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const {
    lightFxCategory, setLightFxCategory,
    lightFxForm, setLightFxForm,
    lightFxStyle, setLightFxStyle,
    lightFxColor, setLightFxColor,
    lightFxIntensity, setLightFxIntensity,
    lightFxMaterial, setLightFxMaterial,
    lightFxGrain, setLightFxGrain,
    lightFxBokeh, setLightFxBokeh,
    lightFxShape, setLightFxShape,
    lightFxText, setLightFxText,
    lightFxRef, isDraggingLightFxRef,
    lightFxAutoPad, setLightFxAutoPad, lightFxRefPadded,
    handleLightFxRefUpload, handleLightFxRefDragOver, handleLightFxRefDragLeave, handleLightFxRefDrop, handleClearLightFxRef,
    lightFxBase, lightFxPreserveAlpha, setLightFxPreserveAlpha, isDraggingLightFxBase,
    handleClearLightFxBase, handleLightFxBaseUpload, handleLightFxBaseDragOver, handleLightFxBaseDragLeave, handleLightFxBaseDrop,
    lightFxRenderModel, setLightFxRenderModel,
    lightFxImageSize, setLightFxImageSize,
    lightFxBgColor, setLightFxBgColor,
    isGeneratingLightFx, handleGenerateLightFx,
  } = forge;
  const applyQuickEffect = (preset) => {
    const s = preset.settings;
    setActiveQuickEffect(preset.id);
    setLightFxCategory(s.category);
    setLightFxForm(s.form);
    setLightFxStyle(s.style);
    setLightFxColor(s.color);
    setLightFxIntensity(s.intensity);
    setLightFxMaterial(s.material);
    setLightFxGrain(s.grain);
    setLightFxBokeh(s.bokeh);
    setLightFxShape('none');
    setLightFxText(s.text);
    setLightFxBgColor('black');
  };
  return (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6 pb-16">

          {/* 안내 — 광원·빛효과 (중립 톤) */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
            <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-zinc-400" /> 광원 · 빛효과
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed break-keep-all">
              광원·후광·파티클·빛효과를 순흑(#000000) 배경 위 발광 에셋으로 만듭니다. 스크린/애드 블렌드 합성 또는 투명 PNG 추출에 최적. <span className="text-zinc-400">로그인 시 PromptArc '광원 보관함'에 자동 저장.</span>
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[12px] font-semibold text-zinc-200">빠른 작업</h3>
              <span className="text-[9px] text-zinc-600">목적을 고르면 권장값 자동 적용</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_EFFECTS.map(preset => {
                const active = activeQuickEffect === preset.id;
                const Icon = preset.icon;
                return (
                  <button key={preset.id} type="button" onClick={() => applyQuickEffect(preset)} className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${active ? 'border-[#76cee0]/60 bg-[#76cee0]/10' : 'border-zinc-800 bg-[#121215] hover:border-zinc-700'}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-[#76cee0] text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[11px] font-bold ${active ? 'text-[#9de4ef]' : 'text-zinc-200'}`}>{preset.label}</span>
                      <span className="mt-0.5 block text-[9px] leading-relaxed text-zinc-500">{preset.desc}</span>
                    </span>
                    {active && <span className="rounded-full bg-[#76cee0]/15 px-2 py-1 text-[8px] font-bold text-[#76cee0]">선택됨</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-zinc-600">아래 형태 참고에 캐릭터·타이틀·아이템 이미지를 올리면 원본은 그리지 않고 정렬된 빛효과만 생성합니다.</p>
          </section>

          <button type="button" onClick={() => setAdvancedOpen(v => !v)} className="flex h-10 w-full items-center justify-between rounded-lg border border-zinc-800 bg-[#101012] px-3 text-[10px] font-semibold text-zinc-400 hover:border-zinc-700 hover:text-zinc-200">
            <span className="flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /> 상세 옵션 {advancedOpen ? '접기' : '열기'}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>

          {advancedOpen && <>

          {/* 01 — 종류 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">01</span> 종류
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {LIGHTFX_CATEGORIES.map(c => {
                const active = c.id === lightFxCategory;
                return (
                  <button
                    key={c.id}
                    onClick={() => setLightFxCategory(c.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#17171a]'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.accent }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{c.label}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{c.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 02 — 스타일 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">02</span> 스타일
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {LIGHTFX_STYLES.map(s => {
                const active = s.id === lightFxStyle;
                return (
                  <button
                    key={s.id}
                    onClick={() => setLightFxStyle(s.id)}
                    title={s.hint}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{s.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate w-full">{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 03 — 컬러 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">03</span> 컬러
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {LIGHTFX_COLORS.map(c => {
                const active = c.id === lightFxColor;
                return (
                  <button
                    key={c.id}
                    onClick={() => setLightFxColor(c.id)}
                    title={c.label}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md border transition-colors ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <span className="w-4 h-4 rounded-full border border-black/40 shrink-0" style={{ background: c.swatch }} />
                    <span className={`text-[10px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-400'}`}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 04 — 무엇을 만들까요 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">04</span> 무엇을 만들까요?
            </h3>
            <textarea
              value={lightFxText}
              onChange={e => setLightFxText(e.target.value)}
              placeholder={LIGHTFX_CATEGORIES.find(c => c.id === lightFxCategory)?.placeholder || '만들 빛효과를 한 줄로 적어주세요'}
              className="w-full h-16 bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3 text-[12px] text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none custom-scrollbar leading-relaxed"
            />
            <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed break-keep-all">
              비워두면 종류 기본형으로 생성합니다. 빛의 모양·움직임만 적으면 됩니다 (색은 컬러에서).
            </p>
          </section>

          {/* 배치 형태 — 빛이 피사체에 어떻게 붙는지 (종류와 별개 축) */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">05</span> 배치 형태
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {LIGHTFX_FORMS.map(f => {
                const active = f.id === lightFxForm;
                return (
                  <button
                    key={f.id}
                    onClick={() => setLightFxForm(f.id)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#17171a]'}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.accent }} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[11px] font-semibold truncate ${active ? 'text-white' : 'text-zinc-300'}`}>{f.label}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{f.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed break-keep-all">
              빛이 붙는 <span className="text-zinc-400">위치</span>를 정합니다. 아래 <span className="text-zinc-400">형태 참고</span> 이미지를 함께 올리면 그 오브젝트에 맞는 <span className="text-zinc-400">광원만</span> 순흑 위에 별도로 렌더됩니다.
            </p>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5">빛 강도</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {[['subtle','약하게'],['medium','보통'],['strong','강하게']].map(([id, label]) => <button key={id} onClick={() => setLightFxIntensity(id)} className={`h-9 rounded-md border text-[10px] font-semibold ${lightFxIntensity === id ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-[#141417] border-zinc-800 text-zinc-400'}`}>{label}</button>)}
            </div>
          </section>

          {/* 재질 · 질감 — 빛의 표면 결을 물·불·전기 등으로 (형태는 유지, 종류·스타일과 별개 축) */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5">재질 · 질감</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {LIGHTFX_MATERIALS.map(m => {
                const active = m.id === lightFxMaterial;
                return (
                  <button
                    key={m.id}
                    onClick={() => setLightFxMaterial(m.id)}
                    title={m.hint}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-md border transition-colors text-left ${active ? 'bg-zinc-800 border-zinc-600' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
                  >
                    <div className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-300'}`}>{m.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate w-full">{m.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed break-keep-all">
              빛의 <span className="text-zinc-400">표면 재질·질감</span>만 물·불·전기처럼 바꿉니다. <span className="text-zinc-400">전체 형태·배치는 유지</span>돼요.
            </p>
          </section>

          {/* 디테일 스케일 — 입자·보케 크기 */}
          <section>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5">디테일 스케일</h3>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 w-16 shrink-0">입자 크기</span>
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                {LIGHTFX_GRAINS.map(g => <button key={g.id} onClick={() => setLightFxGrain(g.id)} title={g.hint} className={`h-8 rounded-md border text-[10px] font-semibold ${lightFxGrain === g.id ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-[#141417] border-zinc-800 text-zinc-400'}`}>{g.label}</button>)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-zinc-400 w-16 shrink-0">보케 사이즈</span>
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                {LIGHTFX_BOKEHS.map(b => <button key={b.id} onClick={() => setLightFxBokeh(b.id)} title={b.hint} className={`h-8 rounded-md border text-[10px] font-semibold ${lightFxBokeh === b.id ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-[#141417] border-zinc-800 text-zinc-400'}`}>{b.label}</button>)}
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed break-keep-all">
              <span className="text-zinc-400">세밀</span>을 고르면 파티클·빛망울이 작고 촘촘한 미세 디테일로 렌더됩니다.
            </p>
          </section>

          {(() => {
            const shapeGuideDisabled = !!(lightFxRef || lightFxBase);
            return (
              <section className={shapeGuideDisabled ? 'opacity-40' : ''}>
                <h3 className="text-[12px] font-semibold text-zinc-300 mb-2.5">
                  기본 형태 참고{shapeGuideDisabled && <span className="text-[10px] font-normal text-zinc-500"> · {lightFxBase ? '변형 중' : '형태 참고 이미지'} 사용 중이라 비활성</span>}
                </h3>
                <div className={`grid grid-cols-4 gap-1.5 ${shapeGuideDisabled ? 'pointer-events-none' : ''}`}>
                  {[['none','없음',''],['square','정사각형','w-5 h-5'],['circle','원','w-5 h-5 rounded-full'],['rectangle','직사각형','w-7 h-4']].map(([id,label,shapeClass]) => <button key={id} onClick={() => setLightFxShape(id)} disabled={shapeGuideDisabled} className={`h-14 rounded-md border flex flex-col items-center justify-center gap-1 ${lightFxShape === id ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-[#141417] border-zinc-800 text-zinc-400'}`}>{shapeClass && <span className={`border border-current ${shapeClass}`} />}<span className="text-[9px] font-semibold">{label}</span></button>)}
                </div>
                <p className="text-[9px] text-zinc-600 mt-1.5">
                  {shapeGuideDisabled
                    ? (lightFxBase ? '이전 광원 변형 중에는 base 의 형태가 우선하므로 기본 형태는 적용되지 않습니다.' : '형태 참고 이미지가 있으면 이미지 형태가 우선하므로 기본 형태는 적용되지 않습니다.')
                    : '빛 전체 실루엣을 이 도형(원·사각 등)으로 잡습니다. 형태 참고 이미지나 변형 base 가 없을 때만 적용됩니다.'}
                </p>
              </section>
            );
          })()}

          {/* 이전 광원 변형 (선택) — 알파(발광 형태) 유지, 색·질감만 리스킨 */}
          <section className={`rounded-lg border p-2.5 ${lightFxBase ? 'border-[#76cee0]/40 bg-[#76cee0]/[0.06]' : 'border-zinc-800/70 bg-[#101012]'}`}>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-1 flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5 text-[#76cee0]" /> 이전 광원 변형 <span className="text-[10px] font-normal text-zinc-500">· 선택 · 방식 유지·새 디테일</span>
            </h3>
            <p className="text-[10px] text-zinc-600 mb-2 leading-relaxed break-keep-all">
              이전에 만든 발광 에셋을 base 로 올리면 <span className="text-zinc-400">효과 종류·배치(방식)는 유지</span>하고 디테일은 <span className="text-zinc-400">새로 고품질로 다시 그립니다</span> — 레퍼런스가 저품질이어도 그대로 베끼지 않습니다. 우측 결과의 <span className="text-[#76cee0]">이 광원 변형</span> 버튼으로도 지정할 수 있습니다.
            </p>

            <div
              onDragOver={handleLightFxBaseDragOver}
              onDragLeave={handleLightFxBaseDragLeave}
              onDrop={handleLightFxBaseDrop}
              className={`relative border border-dashed rounded-lg h-24 flex flex-col items-center justify-center transition-colors overflow-hidden ${
                isDraggingLightFxBase ? 'border-[#76cee0] bg-[#76cee0]/10' : 'border-zinc-700/60 bg-[#0b0b0d] hover:border-zinc-600'
              }`}
            >
              {lightFxBase ? (
                <div className="relative w-full h-full p-2 flex items-center justify-center bg-black">
                  <img src={lightFxBase.dataUrl} alt="변형 base 광원" className="max-w-full max-h-full object-contain" />
                  <span className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-[#76cee0] font-semibold">{lightFxBase.label || '이전 광원'}</span>
                  <button onClick={handleClearLightFxBase} className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white p-1 rounded-md transition-colors" title="변형 base 제거">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1.5 text-zinc-600">
                    <UploadCloud className="w-5 h-5" />
                    <p className="text-[10px] font-semibold text-zinc-500">변형할 이전 광원 추가</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleLightFxBaseUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </>
              )}
            </div>

            {lightFxBase && (
              <button
                onClick={() => setLightFxPreserveAlpha(!lightFxPreserveAlpha)}
                className={`w-full h-9 flex items-center gap-2.5 px-3 mt-2 rounded-md border text-left transition-colors ${lightFxPreserveAlpha ? 'bg-[#76cee0]/10 border-[#76cee0]/40' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
              >
                <span className={`w-7 h-4 rounded-full shrink-0 relative transition-colors ${lightFxPreserveAlpha ? 'bg-[#76cee0]' : 'bg-zinc-700'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${lightFxPreserveAlpha ? 'left-[14px]' : 'left-0.5'}`} />
                </span>
                <div className="min-w-0">
                  <div className={`text-[11px] font-semibold ${lightFxPreserveAlpha ? 'text-[#76cee0]' : 'text-zinc-300'}`}>형태 영역 유지 · 부드럽게</div>
                  <p className="text-[9px] text-zinc-500 leading-tight">base 발광 영역에 맞춰 부드럽게 합성(배치 정렬). 끄면 프롬프트로만 방식 유지 — 더 자유롭게</p>
                </div>
              </button>
            )}

            {/* 디테일 안내 — Flash 는 1K 저디테일. 변형 리드로우는 Pro·고해상이라야 디테일이 산다. */}
            {lightFxBase && !isProImageModel(lightFxRenderModel) && (
              <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/[0.07] p-2">
                <p className="text-[10px] text-amber-300/90 leading-relaxed break-keep-all">
                  디테일이 부족하면 렌더 모델을 <span className="font-semibold">Nano Banana Pro · 2K↑</span> 로 올리세요. 현재 <span className="font-semibold">Nano Banana 2</span> 는 1K·저디테일이라 변형 리드로우가 뭉개질 수 있습니다.
                </p>
                <button
                  onClick={() => setLightFxRenderModel('gemini-3-pro-image-preview')}
                  className="mt-1.5 h-7 px-2.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors"
                >
                  Pro 로 전환
                </button>
              </div>
            )}
          </section>

          </>}

          {/* 형태 참고 (선택) — 빛이 감쌀 오브젝트 실루엣 */}
          <section className={lightFxBase ? 'opacity-40 pointer-events-none' : ''}>
            <h3 className="text-[12px] font-semibold text-zinc-300 mb-1 flex items-center gap-2">
              형태 참고 <span className="text-[10px] font-normal text-zinc-500">· 선택 · 광원만 추출{lightFxBase ? ' · 변형 중 비활성' : ''}</span>
            </h3>
            <p className="text-[10px] text-zinc-600 mb-2 leading-relaxed break-keep-all">
              샘플 이미지(아이콘·박스·캐릭터 등)를 올리면 위 <span className="text-zinc-400">배치 형태</span>대로 그 실루엣에 맞춰 <span className="text-zinc-400">빛효과만 별도 렌더</span>됩니다. <span className="text-zinc-400">참고 오브젝트 자체는 결과에 나오지 않습니다</span> — 빛만 순흑 위에.
            </p>

            {/* 여백 자동 추가 — 피사체가 프레임에 꽉 찬(여백 없는) 참고를 올리면 주변 여백을 만들어 빛이 퍼질 공간 확보 */}
            <button
              onClick={() => setLightFxAutoPad(!lightFxAutoPad)}
              className={`w-full h-9 flex items-center gap-2.5 px-3 mb-2 rounded-md border text-left transition-colors ${lightFxAutoPad ? 'bg-[#76cee0]/10 border-[#76cee0]/40' : 'bg-[#141417] border-zinc-800/80 hover:border-zinc-700'}`}
            >
              <span className={`w-7 h-4 rounded-full shrink-0 relative transition-colors ${lightFxAutoPad ? 'bg-[#76cee0]' : 'bg-zinc-700'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${lightFxAutoPad ? 'left-[14px]' : 'left-0.5'}`} />
              </span>
              <div className="min-w-0">
                <div className={`text-[11px] font-semibold ${lightFxAutoPad ? 'text-[#76cee0]' : 'text-zinc-300'}`}>여백 자동 추가 · 16:9</div>
                <p className="text-[9px] text-zinc-500 leading-tight">무조건 16:9 캔버스로 확장해 빛이 잘리지 않게 (원본은 크롭 없음)</p>
              </div>
            </button>
            {lightFxRefPadded && (
              <p className="text-[10px] text-[#76cee0] mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 16:9 비율로 여백을 자동 추가했습니다
              </p>
            )}

            <div
              onDragOver={handleLightFxRefDragOver}
              onDragLeave={handleLightFxRefDragLeave}
              onDrop={handleLightFxRefDrop}
              className={`relative border border-dashed rounded-lg h-24 flex flex-col items-center justify-center transition-colors overflow-hidden group ${
                isDraggingLightFxRef ? 'border-zinc-500 bg-zinc-800/30' : 'border-zinc-700/60 bg-[#101012] hover:border-zinc-600'
              }`}
            >
              {lightFxRef ? (
                <div className="relative w-full h-full p-2 flex items-center justify-center">
                  <img src={lightFxRef} alt="형태 참고" className="max-w-full max-h-full object-contain rounded-md" />
                  <button onClick={handleClearLightFxRef} className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white p-1 rounded-md transition-colors" title="형태 참고 제거">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1.5 text-zinc-600">
                    <UploadCloud className="w-5 h-5" />
                    <p className="text-[10px] font-semibold text-zinc-500">형태 참고 추가</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleLightFxRefUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </>
              )}
            </div>
          </section>

          {/* 생성 배경색 (광원·빛효과) */}
          <BgColorPicker
            value={lightFxBgColor}
            onChange={setLightFxBgColor}
            hint="발광 에셋은 순흑 배경을 권장합니다. Mask Forge 이펙트 추출(cutoff 6, gamma 0.85, 색상 복원)로 소프트 글로우까지 투명화하세요. 크로마는 발광 감쇠와 색을 손상시킬 수 있습니다."
          />

          <section className="rounded-lg border border-zinc-800/70 bg-[#101012] p-2.5">
            <div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-semibold text-zinc-400">렌더 설정</span><HelpPopover text="Flash는 빠르고 1K 고정입니다. Pro는 2K·4K 출력에 유리합니다." /></div>
            <div className="grid grid-cols-2 gap-2">
              <select value={lightFxRenderModel} onChange={(e) => setLightFxRenderModel(e.target.value)} disabled={isGeneratingLightFx} className="h-9 min-w-0 rounded-md border border-zinc-800 bg-[#17171a] px-2 text-[10px] font-semibold text-zinc-300 outline-none disabled:opacity-40" aria-label="렌더 모델">{IMAGEN_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
              <select value={isProImageModel(lightFxRenderModel) ? lightFxImageSize : '1K'} onChange={(e) => setLightFxImageSize(e.target.value)} disabled={isGeneratingLightFx || !isProImageModel(lightFxRenderModel)} className="h-9 min-w-0 rounded-md border border-zinc-800 bg-[#17171a] px-2 text-[10px] font-semibold text-zinc-300 outline-none disabled:opacity-40" aria-label="출력 해상도">{RENDER_SIZES.map(sz => <option key={sz.id} value={sz.id}>{sz.label}</option>)}</select>
            </div>
          </section>

          {/* 생성 CTA — 유일한 강조색 */}
          <section>
            <button
              onClick={handleGenerateLightFx}
              disabled={isGeneratingLightFx}
              className="w-full px-4 py-3.5 rounded-lg bg-[#76cee0] text-zinc-900 hover:bg-[#8ad8e8] font-bold text-[13px] flex items-center justify-center gap-2 transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              {isGeneratingLightFx ? <Loader2 className="w-4 h-4 animate-spin" /> : lightFxBase ? <Wand2 className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {isGeneratingLightFx ? '빛효과 생성 중...' : lightFxBase ? '이전 광원 변형 · 1장 생성' : '선택한 설정으로 1장 생성'}
            </button>
            <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed break-keep-all">
              결과는 우측 최근 목록에 추가됩니다. 이전 결과도 선택해 다운로드하거나 재생성할 수 있습니다.
            </p>
          </section>

        </div>
  );
}
