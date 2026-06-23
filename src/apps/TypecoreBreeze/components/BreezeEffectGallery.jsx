// 효과 원클릭 갤러리 — Creation 뷰 상단(고급 옵션 밖)에 노출되는 1차 선택지.
// 16종 캐주얼 스타일을 큰 카드(이모지 + 한 줄 태그라인)로 보여주고, 클릭 한 번에
// applyScriptPreset(handleScriptPresetChange)으로 옵션 묶음을 일괄 적용한다.
// 기존엔 동일 카드가 "고급 옵션"(기본 닫힘) 안에 묻혀 있어 효과 선택이 어려웠음 → 밖으로 끌어올림.
import { Sparkles } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';
import { staticOptions } from '../constants/presets.js';

const ACCENT = '#A78BFA';

// 16 효과 메타 — 이모지 + 한 줄 태그라인. id 누락(동적 스타일)은 기본값 폴백.
const EFFECT_META = {
  Calli_Brush:       { emoji: '🖌️', tag: '수채 붓글씨 번짐' },
  Calli_Ink:         { emoji: '🌑', tag: '수묵 먹번짐' },
  Calli_Modern:      { emoji: '✍️', tag: '깔끔한 모던 붓' },
  Calli_DryBrush:    { emoji: '🪵', tag: '거친 갈필 질감' },
  Calli_Marker:      { emoji: '🖋️', tag: '브러시펜 마커' },
  Casual_Bubble:     { emoji: '🫧', tag: '말랑 버블 풍선' },
  Casual_Comic:      { emoji: '💥', tag: '코믹북 하프톤' },
  Casual_Block:      { emoji: '🔳', tag: '모던 기하 블록' },
  Casual_Marker:     { emoji: '🖊️', tag: '둥근 마카 손글씨' },
  Calli_Ribbon:      { emoji: '🎀', tag: '우아한 리본 스크립트' },
  Casual_Jelly:      { emoji: '🍮', tag: '말랑 젤리 광택' },
  Street_Graffiti:   { emoji: '🧢', tag: '힙스터 그래피티' },
  Vintage_Chalk:     { emoji: '🖍️', tag: '빈티지 분필 질감' },
  Diary_Pen:         { emoji: '📓', tag: '다꾸 펜 모노라인' },
  Casual_RetroChalk: { emoji: '🍩', tag: '레트로 분필 바운스' },
  Casual_Variety:    { emoji: '📺', tag: '예능 3D 스티커' },
  Casual_Emblem:     { emoji: '🏅', tag: '스포츠 엠블럼' },
  Casual_Racing:     { emoji: '🏁', tag: '레이싱 스피드' },
  Casual_Idol:       { emoji: '✨', tag: '파스텔 아이돌' },
  Casual_Grunge:     { emoji: '🎬', tag: '거친 그런지 무비' },
  Casual_StencilBlock: { emoji: '🧱', tag: '각진 스텐실 블록' },
};

export default function BreezeEffectGallery() {
  const b = useBreeze();
  // 좌측 카테고리(casual / calli)로 필터 — '캘리그라피' 선택 시 붓글씨 계열만 노출.
  // cat 미지정(동적 AI 생성 스타일)은 캐주얼로 간주.
  const allEffects = [...staticOptions.CasualStyles, ...(b.dynamicOptions.CasualStyles || [])];
  const effects = allEffects.filter((s) => (s.cat || 'casual') === b.selectedCategory);
  const isCalli = b.selectedCategory === 'calli';

  return (
    <section className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/30 to-[#0E0E0E] p-3">
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <Sparkles className="w-3.5 h-3.5 text-violet-300" />
        <h3 className="text-[11px] font-bold text-violet-100">{isCalli ? '붓글씨 효과' : '효과 선택'}</h3>
        <span className="text-[10px] text-zinc-500">— 클릭 한 번에 스타일 완성</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {effects.map((s) => {
          const active = b.scriptType === s.id;
          const meta = EFFECT_META[s.id] || { emoji: '🎨', tag: '' };
          const ko = s.name.split(/[(（]/)[0].trim();
          const tag = meta.tag || (s.name.match(/[(（]([^)）]+)[)）]/)?.[1] || '').trim();
          return (
            <button
              key={s.id}
              onClick={() => b.handleScriptPresetChange(s.id)}
              title={s.name}
              className={`flex items-start gap-2 text-left px-2.5 py-2 rounded-lg border transition-colors ${active ? 'bg-zinc-900 text-white' : 'bg-[#0F0F0F] border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'}`}
              style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}55` } : {}}
            >
              <span className="text-[16px] leading-none mt-0.5 shrink-0">{meta.emoji}</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold leading-tight truncate">{ko}</span>
                {tag && <span className="block text-[9px] text-zinc-500 mt-0.5 truncate">{tag}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
