// ThemeForge — 프로모션 UI 키트(프레임·버튼) 테마를 "대량 프롬프트 큐"로 뽑는 반자동 생성기.
// 워크플로우: NEXUS가 시드 축을 흔들어 수십 개 이미지 프롬프트를 큐레이션(거의 무료) →
//   퇴근 전 큐를 내보내 Gemini Ultra 앱에 붙여넣어 무료·고퀄 생성 → 결과 이미지를 갤러리로
//   드래그해 정리 + Mask Forge(누끼)/NEXUS Preview 로 라우팅.
//   * 이미지 API 를 직접 호출하지 않으므로 API 비용 0. Gemini 는 "프롬프트 보강" 텍스트 호출만(선택, analysis 1c).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, Copy, Download, Check, RotateCcw, Shuffle, Wand2, Loader2,
  Image as ImageIcon, X, Scissors, Send, LayoutGrid, ListChecks, Upload,
} from 'lucide-react';
import { useGlobal } from '../../context/GlobalContext';
import { useUsageGate } from '../../components/UsageGate';
import { APP_MAP } from '../../config/apps';
import { GEMINI_API_KEY } from '../../lib/gemini';

const ACCENT = APP_MAP['theme-forge']?.color || '#FF9F1C';
const MASK_COLOR = APP_MAP['mask-forge']?.color || '#FF3366';
const PREVIEW_COLOR = APP_MAP['nexus-preview']?.color || '#22B8CF';
const QUEUE_STORAGE = 'theme-forge:queue';

// ─── 시드 축 (프로모션 UI 키트 테마) ──────────────────────────────────
// 각 항목: ko(화면 태그) / en(이미지 프롬프트 조각). 파라메트릭 조합으로 다양성 확보.
const AXES = {
  component: {
    label: '컴포넌트', pick: true,
    opts: [
      { key: 'frame',  ko: '프레임/블릿', en: 'a decorative promotion UI frame plus small bullet and badge containers' },
      { key: 'button', ko: '버튼 세트',   en: 'a set of call-to-action buttons showing default, hover and pressed states' },
      { key: 'kit',    ko: '풀 UI 키트',  en: 'a cohesive promotion UI kit: frame, primary and secondary buttons, chips, badge, small card and a divider' },
    ],
  },
  mood: {
    label: '무드',
    opts: [
      { ko: '사이버펑크', en: 'cyberpunk neon-noir' },
      { ko: '하이판타지', en: 'ornate high-fantasy' },
      { ko: '미니멀',     en: 'clean minimal flat' },
      { ko: '럭셔리',     en: 'luxury premium gold-accented' },
      { ko: '팝 캐주얼',  en: 'playful pop casual, bouncy' },
      { ko: '네오브루탈', en: 'neo-brutalist bold high-contrast' },
      { ko: '글래스',     en: 'glassmorphism, frosted translucent' },
      { ko: '홀로그램',   en: 'iridescent holographic' },
      { ko: '다크 SF',    en: 'dark sci-fi HUD, technical' },
      { ko: '레트로',     en: 'retro arcade, chunky' },
    ],
  },
  palette: {
    label: '팔레트',
    opts: [
      { ko: '네온 시안',   en: 'neon cyan and magenta on near-black' },
      { ko: '로열 골드',   en: 'royal gold on deep navy' },
      { ko: '에메랄드',    en: 'emerald green on charcoal' },
      { ko: '선셋',        en: 'sunset orange-to-pink gradient' },
      { ko: '모노크롬',    en: 'monochrome, crisp white on black' },
      { ko: '퍼플 하이테크', en: 'electric purple and teal' },
      { ko: '크림슨',      en: 'crimson red and antique gold' },
      { ko: '파스텔',      en: 'soft pastel lilac and mint' },
    ],
  },
  material: {
    label: '재질',
    opts: [
      { ko: '네온 글로우',   en: 'glowing emissive neon edges' },
      { ko: '브러시드 메탈', en: 'brushed metal with beveled edges' },
      { ko: '프로스티드',    en: 'frosted glass with subtle blur and inner glow' },
      { ko: '플랫 벡터',     en: 'flat vector with crisp clean shapes' },
      { ko: '홀로 포일',     en: 'holographic foil with rainbow sheen' },
      { ko: '엠보스',        en: 'embossed matte texture' },
      { ko: '글로시 젤리',   en: 'glossy jelly with soft highlights' },
    ],
  },
  corner: {
    label: '코너',
    opts: [
      { ko: '샤프',   en: 'sharp angular corners' },
      { ko: '라운드', en: 'softly rounded corners' },
      { ko: '필',     en: 'fully rounded pill shape' },
      { ko: '컷코너', en: 'chamfered cut corners' },
    ],
  },
  detail: {
    label: '디테일',
    opts: [
      { ko: '코너장식', en: 'ornamental corner accents' },
      { ko: '이중보더', en: 'double-line border' },
      { ko: '리벳',     en: 'rivet and bolt hardware details' },
      { ko: '인레이',   en: 'inlaid glowing seam lines' },
      { ko: '클린',     en: 'no extra ornament, clean' },
    ],
  },
};
const AXIS_KEYS = ['mood', 'palette', 'material', 'corner', 'detail'];
const BATCH_OPTIONS = [12, 24, 48];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 시드 조합 → 이미지 생성 프롬프트(영문) + 화면 태그(국문).
function buildPrompt(seed) {
  const c = seed.component;
  const en = `Game promotion UI asset sheet — ${c.en}. Style: ${seed.mood.en}. Color palette: ${seed.palette.en}. Finish: ${seed.material.en}, ${seed.corner.en}, ${seed.detail.en}. Neatly arranged and isolated on a flat dark or transparent background, front orthographic view, generous padding between elements, crisp edges, production-ready game UI, high detail, 4k. No placeholder text, no watermark.`;
  return en;
}
function seedTags(seed) {
  return [seed.component.ko, seed.mood.ko, seed.palette.ko, seed.material.ko, seed.corner.ko, seed.detail.ko];
}

// N개 시드 생성 — 선택된 컴포넌트 풀 안에서 축을 랜덤 조합, 중복 서명은 재시도.
function generateSeeds(n, componentKeys) {
  const comps = AXES.component.opts.filter((o) => componentKeys.includes(o.key));
  const pool = comps.length ? comps : AXES.component.opts;
  const seen = new Set();
  const out = [];
  let guard = 0;
  while (out.length < n && guard < n * 30) {
    guard++;
    const seed = {
      component: rnd(pool),
      mood: rnd(AXES.mood.opts),
      palette: rnd(AXES.palette.opts),
      material: rnd(AXES.material.opts),
      corner: rnd(AXES.corner.opts),
      detail: rnd(AXES.detail.opts),
    };
    const sig = seedTags(seed).join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ id: `${Date.now()}_${out.length}`, tags: seedTags(seed), prompt: buildPrompt(seed), enriched: null });
  }
  return out;
}

export default function ThemeForgeApp() {
  const { navigate } = useGlobal();
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();

  const [tab, setTab] = useState('queue'); // queue | gallery

  // ── 큐 상태 ──
  const [componentKeys, setComponentKeys] = useState(['frame', 'button', 'kit']);
  const [batch, setBatch] = useState(24);
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(QUEUE_STORAGE) || '[]'); } catch { return []; }
  });
  const [enriching, setEnriching] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    try { localStorage.setItem(QUEUE_STORAGE, JSON.stringify(queue)); } catch { /* quota — ignore */ }
  }, [queue]);

  const toggleComponent = (key) => {
    setComponentKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const handleGenerate = useCallback(() => {
    const seeds = generateSeeds(batch, componentKeys.length ? componentKeys : ['frame', 'button', 'kit']);
    setQueue(seeds);
    setNote(`${seeds.length}개 프롬프트 생성 (파라메트릭 · 무료). 필요하면 "Gemini로 보강" 후 내보내 Ultra에 붙여넣으세요.`);
  }, [batch, componentKeys]);

  // 하이브리드 — 큐 전체를 한 번의 Gemini 텍스트 호출로 다듬음 (analysis 1c).
  const handleEnrich = useCallback(async () => {
    if (!queue.length) { setNote('먼저 큐를 생성하세요.'); return; }
    if (!GEMINI_API_KEY) { setNote('Gemini 키가 없습니다.'); return; }
    if (!(await ensureCanGenerate('analysis'))) return;
    setEnriching(true);
    setNote('Gemini로 프롬프트 다듬는 중…');
    try {
      const sys = `You are a prompt engineer for game-promotion UI image generation (frames, buttons, UI kits).
Rewrite each seed prompt below into ONE polished, vivid, self-contained English image-generation prompt (2-3 sentences).
Keep the specified component, style, color palette and material of each seed. Increase concrete visual detail and variety between items. Keep them production-oriented (isolated components, clean background, no placeholder text).
Return ONLY a JSON array of strings, same length and same order as the input. No commentary.
Seeds:
${queue.map((q, i) => `${i + 1}. [${q.tags.join(', ')}] ${q.prompt}`).join('\n')}`;
      const body = {
        contents: [{ role: 'user', parts: [{ text: sys }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let arr = null;
      try { arr = JSON.parse(text); } catch {
        const a = text.indexOf('['); const b = text.lastIndexOf(']');
        if (a !== -1 && b !== -1) { try { arr = JSON.parse(text.slice(a, b + 1)); } catch { /* ignore */ } }
      }
      if (!Array.isArray(arr)) throw new Error('응답을 해석할 수 없습니다.');
      setQueue((prev) => prev.map((q, i) => ({ ...q, enriched: typeof arr[i] === 'string' ? arr[i] : q.enriched })));
      setNote('보강 완료 — 이제 내보내 Ultra에 붙여넣으세요.');
    } catch (e) {
      console.error('[ThemeForge] enrich failed', e);
      setNote(`보강 실패: ${e.message || e}`);
    } finally {
      setEnriching(false);
    }
  }, [queue, ensureCanGenerate]);

  const promptText = (q) => q.enriched || q.prompt;
  const allText = useMemo(() => queue.map((q, i) => `# ${i + 1}. ${q.tags.join(' · ')}\n${promptText(q)}`).join('\n\n'), [queue]);

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1200);
    } catch { setNote('클립보드 접근 실패 — 브라우저 권한을 확인하세요.'); }
  };
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };
  const exportTxt = () => downloadFile(allText, `theme-prompts_${Date.now()}.txt`, 'text/plain');
  const exportJson = () => downloadFile(
    JSON.stringify(queue.map((q) => ({ tags: q.tags, prompt: promptText(q) })), null, 2),
    `theme-prompts_${Date.now()}.json`, 'application/json',
  );

  // ── 갤러리 상태 (세션) ──
  const [images, setImages] = useState([]); // {id, url(dataURL), name}
  const [dragging, setDragging] = useState(false);
  const galleryInputRef = useRef(null);

  const addImages = useCallback(async (files) => {
    const imgs = Array.from(files || []).filter((f) => f.type?.startsWith('image/'));
    if (!imgs.length) return;
    const loaded = await Promise.all(imgs.map((f) => new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, url: String(r.result), name: f.name });
      r.onerror = () => resolve(null);
      r.readAsDataURL(f);
    })));
    setImages((prev) => [...loaded.filter(Boolean), ...prev]);
  }, []);
  const removeImage = (id) => setImages((prev) => prev.filter((im) => im.id !== id));
  const sendImage = (im, target) => navigate(target, { source: 'theme-forge', image: { url: im.url, metadata: {} } });

  return (
    <div className="flex flex-col h-full w-full bg-[#0A0A0A] text-zinc-100 overflow-hidden font-sans">
      {usageModal}
      <style>{`
        .tf-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .tf-scroll::-webkit-scrollbar-track { background: transparent; }
        .tf-scroll::-webkit-scrollbar-thumb { background: rgba(255,159,28,0.25); border-radius: 5px; }
        .tf-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,159,28,0.5); }
      `}</style>

      {/* 탭 */}
      <div className="shrink-0 px-6 pt-5">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          {[
            { k: 'queue', label: '프롬프트 큐', icon: <ListChecks size={13} /> },
            { k: 'gallery', label: `갤러리${images.length ? ` (${images.length})` : ''}`, icon: <LayoutGrid size={13} /> },
          ].map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide px-4 py-2 rounded-lg border transition-colors ${active ? 'text-black' : 'text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}
                style={active ? { background: ACCENT, borderColor: ACCENT } : undefined}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
          <div className="ml-auto text-[11px] text-zinc-600 hidden md:block">반자동 · 큐레이션은 NEXUS, 생성은 Gemini Ultra</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto tf-scroll p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-5">
          {tab === 'queue' ? (
            <>
              {/* 시드 설정 */}
              <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} style={{ color: ACCENT }} />
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">시드 · 프로모션 UI 키트</span>
                </div>

                {/* 컴포넌트 선택 */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-zinc-500 w-16">컴포넌트</span>
                  {AXES.component.opts.map((o) => {
                    const on = componentKeys.includes(o.key);
                    return (
                      <button
                        key={o.key}
                        onClick={() => toggleComponent(o.key)}
                        className={`text-[11px] font-bold tracking-wide px-3 py-1.5 rounded-full border transition-colors ${on ? 'text-black' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}
                        style={on ? { background: ACCENT, borderColor: ACCENT } : undefined}
                      >
                        {o.ko}
                      </button>
                    );
                  })}
                </div>

                {/* 흔들 축 미리보기 (읽기용) */}
                <div className="flex flex-wrap items-start gap-2">
                  <span className="text-[11px] font-bold text-zinc-500 w-16 mt-1.5">랜덤 축</span>
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {AXIS_KEYS.map((k) => (
                      <span key={k} className="text-[10px] text-zinc-500 border border-zinc-800 rounded-md px-2 py-1">
                        <b className="text-zinc-300">{AXES[k].label}</b> {AXES[k].opts.length}종
                      </span>
                    ))}
                  </div>
                </div>

                {/* 배치 수 + 생성 */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[11px] font-bold text-zinc-500 w-16">배치 수</span>
                  <div className="inline-flex items-center gap-1 bg-black/40 border border-zinc-800 rounded-lg p-1">
                    {BATCH_OPTIONS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setBatch(n)}
                        className={`text-[11px] font-bold tracking-wider px-3 py-1.5 rounded-md transition-colors ${batch === n ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                        style={batch === n ? { background: ACCENT } : undefined}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="text-[11px] font-bold tracking-wider px-6 py-2.5 rounded-lg text-black inline-flex items-center gap-2 transition-all active:scale-95 hover:brightness-110"
                    style={{ background: ACCENT }}
                  >
                    <Shuffle size={13} /> 큐 생성 (무료)
                  </button>
                  <button
                    onClick={handleEnrich}
                    disabled={!queue.length || enriching}
                    title="큐 전체를 한 번의 Gemini 호출로 다듬음 (analysis 1c)"
                    className="text-[11px] font-bold tracking-wider px-5 py-2.5 rounded-lg border inline-flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: ACCENT, borderColor: `${ACCENT}66` }}
                  >
                    {enriching ? <><Loader2 size={13} className="animate-spin" /> 보강 중…</> : <><Wand2 size={13} /> Gemini로 보강</>}
                  </button>
                </div>

                {note && <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-3">{note}</div>}
              </div>

              {/* 내보내기 바 */}
              {queue.length > 0 && (
                <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">내보내기 → Ultra에 붙여넣기</span>
                  <button onClick={() => copy(allText, '__all__')} className="ml-auto text-[11px] font-bold px-4 py-2 rounded-lg text-black inline-flex items-center gap-1.5 hover:brightness-110" style={{ background: ACCENT }}>
                    {copiedId === '__all__' ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 전체 복사</>}
                  </button>
                  <button onClick={exportTxt} className="text-[11px] font-bold px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 inline-flex items-center gap-1.5"><Download size={13} /> .txt</button>
                  <button onClick={exportJson} className="text-[11px] font-bold px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 inline-flex items-center gap-1.5"><Download size={13} /> .json</button>
                  <button onClick={() => { setQueue([]); setNote(''); }} className="text-[11px] font-bold px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-rose-300 hover:border-rose-500/50 inline-flex items-center gap-1.5"><RotateCcw size={13} /> 비우기</button>
                </div>
              )}

              {/* 큐 리스트 */}
              {queue.length === 0 ? (
                <div className="text-center py-20 text-zinc-600">
                  <Sparkles size={30} className="mx-auto mb-3 text-zinc-800" />
                  <div className="text-[12px] leading-relaxed">
                    배치 수를 고르고 <span style={{ color: ACCENT }}>[큐 생성]</span> 을 누르세요.<br />
                    수십 개 프롬프트가 만들어지면 내보내 Gemini Ultra 앱에 붙여넣어 생성합니다.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {queue.map((q, i) => (
                    <div key={q.id} className="bg-[#141417] border border-zinc-800 rounded-xl p-4 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-600 tabular-nums">#{String(i + 1).padStart(2, '0')}</span>
                        <div className="flex flex-wrap gap-1">
                          {q.tags.map((t, ti) => (
                            <span key={ti} className="text-[9px] font-bold text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.5">{t}</span>
                          ))}
                        </div>
                        {q.enriched && <span className="ml-auto text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full border" style={{ color: ACCENT, borderColor: `${ACCENT}55` }}>보강됨</span>}
                        <button onClick={() => copy(promptText(q), q.id)} className={`${q.enriched ? '' : 'ml-auto'} text-zinc-500 hover:text-white transition-colors shrink-0`} title="이 프롬프트 복사">
                          {copiedId === q.id ? <Check size={13} style={{ color: ACCENT }} /> : <Copy size={13} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-mono">{promptText(q)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 안내 */}
              <div className="bg-[#18181B] border border-zinc-800 rounded-xl px-5 py-4 text-[12px] text-zinc-400 leading-[1.9] mb-2">
                <div className="text-zinc-100 font-bold mb-1 flex items-center gap-2"><ImageIcon size={14} style={{ color: ACCENT }} /> 반자동 워크플로우</div>
                • <b className="text-zinc-100">퇴근 전</b>: 배치 수 크게(48) → 큐 생성 → (선택) Gemini 보강 → 전체 복사/파일 내보내기<br />
                • <b className="text-zinc-100">Gemini Ultra 앱</b>에 프롬프트를 붙여넣어 이미지 생성 (구독이라 무료·고퀄, API 비용 없음)<br />
                • <b className="text-zinc-100">아침</b>: 생성된 이미지를 <b style={{ color: ACCENT }}>갤러리</b> 탭으로 드래그 → 골라서 Mask Forge(누끼) / NEXUS Preview 로 전송<br />
                • 큐는 브라우저에 저장돼 새로고침해도 유지됩니다. 실제 이미지 생성은 API 를 쓰지 않습니다.
              </div>
            </>
          ) : (
            <>
              {/* 갤러리 드롭존 */}
              <div
                onClick={() => galleryInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addImages(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${dragging ? 'border-[#FF9F1C] bg-[#FF9F1C]/5' : 'border-zinc-800 hover:border-zinc-600'}`}
              >
                <Upload className="w-8 h-8 text-zinc-700" />
                <div className="text-[12px] font-bold text-zinc-300">Ultra에서 생성한 이미지를 드래그 · 클릭 업로드</div>
                <div className="text-[11px] text-zinc-600">여러 장 한 번에 · PNG / JPG / WEBP</div>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
              </div>

              {images.length === 0 ? (
                <div className="text-center py-16 text-zinc-600 text-[12px]">아직 이미지가 없습니다. 생성한 결과물을 여기 모아 정리하세요.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {images.map((im) => (
                    <div key={im.id} className="group relative rounded-xl overflow-hidden border border-zinc-800 bg-[#141417]">
                      <div className="aspect-square bg-maskforge-checker flex items-center justify-center overflow-hidden" style={{ backgroundImage: 'repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%)', backgroundSize: '18px 18px' }}>
                        <img src={im.url} alt={im.name} className="w-full h-full object-contain" />
                      </div>
                      <button onClick={() => removeImage(im.id)} className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 hover:bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity" title="제거"><X size={12} /></button>
                      <div className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => sendImage(im, 'mask-forge')} className="flex-1 py-1.5 text-[10px] font-bold inline-flex items-center justify-center gap-1 text-black hover:brightness-110" style={{ background: MASK_COLOR }} title="Mask Forge로 누끼">
                          <Scissors size={11} /> 누끼
                        </button>
                        <button onClick={() => sendImage(im, 'nexus-preview')} className="flex-1 py-1.5 text-[10px] font-bold inline-flex items-center justify-center gap-1 hover:brightness-110" style={{ background: `${PREVIEW_COLOR}22`, color: PREVIEW_COLOR }} title="NEXUS Preview로 전송">
                          <Send size={11} /> Preview
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[11px] text-zinc-600 leading-relaxed">
                * 갤러리는 현재 세션 동안만 유지됩니다(새로고침 시 초기화). 원본은 Ultra에서 저장해두세요 — 여기선 분류·라우팅 용도입니다.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
