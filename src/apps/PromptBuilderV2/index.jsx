// PromptBuilderV2 — CLI prompt-builder-v2.cjs 의 React 포트.
// NEXUS Studio 톤(RenderMatrix 패턴) 으로 통일: p-5 + bg-#09090B + 패널 rounded-2xl + border zinc-800 + bg-#18181B + shadow-2xl.
// 좌측 사이드바: 카테고리 탭 + 카드 토글 목록 + 선택된 카드들의 필드 폼.
// 우측 결과 패널: 컴파일된 영문 프롬프트 + 복사/다운로드/프리셋 저장 + 프리셋 목록.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy, Check, Download, Save, Trash2, FolderOpen, AlertCircle, ChevronDown,
  Film, Type as TypeIcon, Feather, Box, Sparkles, Wand,
} from 'lucide-react';

// 카테고리 → 아이콘 매핑 — 새 카테고리 추가 시 여기만 갱신.
const CATEGORY_ICONS = {
  motion:       Film,
  typography:   TypeIcon,
  typecore:     Feather,
  motionMatrix: Wand,
  renderMatrix: Box,
  renderPop:    Sparkles,
};
import { CARDS, CATEGORY_LABELS, IMPORTANCE_META, defaultEnabled, defaultValues, compileCard } from './constants/cards';

const ACCENT = '#FFD166';
const STORAGE_STATE   = 'promptBuilderV2:state';
const STORAGE_PRESETS = 'promptBuilderV2:presets';
const STORAGE_HISTORY = 'promptBuilderV2:history';

const loadJSON = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fb; } catch { return fb; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

// Set 은 JSON 직렬화가 안 되므로 toArray/fromArray 헬퍼.
const enabledToArray = (byCat) => Object.fromEntries(Object.entries(byCat).map(([k, set]) => [k, [...set]]));
const arrayToEnabled = (byCat) => {
  const out = {};
  for (const cat of Object.keys(CARDS)) {
    out[cat] = new Set(Array.isArray(byCat?.[cat]) ? byCat[cat] : []);
  }
  return out;
};

// ────────────────────────────────────────────────────────────────
// 필드 입력 위젯
// ────────────────────────────────────────────────────────────────
function FieldInput({ field, value, onChange }) {
  const v = value ?? field.default;
  if (field.type === 'bool') {
    return (
      <button onClick={() => onChange(!v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-[11px] font-bold transition-colors w-full ${v ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${v ? 'border-zinc-400' : 'border-zinc-600'}`} style={{ background: v ? ACCENT : 'transparent' }}>
          {v && <Check size={10} className="text-black" strokeWidth={3} />}
        </span>
        {field.label}
      </button>
    );
  }
  if (field.type === 'choice') {
    return (
      <div>
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{field.label}</div>
        <div className="flex flex-wrap gap-1.5">
          {field.choices.map((c) => {
            const active = v === c;
            return (
              <button key={c} onClick={() => onChange(c)}
                className={`px-2.5 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${active ? 'border-transparent text-black' : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
                style={active ? { background: ACCENT } : undefined}>
                {c}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.type === 'number') {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</div>
          <div className="text-[11px] font-mono" style={{ color: ACCENT }}>{v}</div>
        </div>
        <input type="range" min={field.min ?? 0} max={field.max ?? 100} value={v}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full"
          style={{ accentColor: ACCENT }} />
      </div>
    );
  }
  if (field.type === 'float') {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</div>
          <div className="text-[11px] font-mono" style={{ color: ACCENT }}>{Number(v).toFixed(2)}</div>
        </div>
        <input type="range" min={field.min ?? 0} max={field.max ?? 1} step="0.01" value={v}
          onChange={(e) => onChange(Math.round(parseFloat(e.target.value) * 100) / 100)}
          className="w-full"
          style={{ accentColor: ACCENT }} />
      </div>
    );
  }
  // text
  return (
    <div>
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">{field.label}</div>
      <input type="text" value={v ?? ''} onChange={(e) => onChange(e.target.value)}
        placeholder={field.default || ''}
        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-md px-3 py-2 text-[12px] text-zinc-200 outline-none focus:border-zinc-600 transition-colors" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 카드 한 개 — 헤더(체크박스+라벨+뱃지) + 펼침 시 필드 폼
// ────────────────────────────────────────────────────────────────
function CardBlock({ card, enabled, values, onToggle, onValueChange, expanded, onExpand, error }) {
  const meta = IMPORTANCE_META[card.importance];
  const isCritical = meta.forceOn;
  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${enabled ? 'border-zinc-700' : 'border-zinc-800/60 opacity-70'}`}
      style={enabled ? { background: 'rgba(255,209,102,0.04)' } : { background: 'rgba(255,255,255,0.01)' }}>
      <button onClick={() => { if (card.fields?.length) onExpand(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
        {/* 체크박스 */}
        <span
          role="checkbox"
          aria-checked={enabled}
          onClick={(e) => { e.stopPropagation(); if (!isCritical) onToggle(); }}
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isCritical ? 'cursor-not-allowed' : 'cursor-pointer'} ${enabled ? 'border-zinc-400' : 'border-zinc-700'}`}
          style={{ background: enabled ? ACCENT : 'transparent' }}
          title={isCritical ? '핵심 카드는 끌 수 없습니다' : (enabled ? '끄기' : '켜기')}
        >
          {enabled && <Check size={10} className="text-black" strokeWidth={3} />}
        </span>
        <span className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-zinc-100 truncate">{card.title}</span>
            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border"
              style={{ color: meta.color, borderColor: meta.color + '55', background: meta.color + '11' }}>
              {meta.label}
            </span>
          </div>
          <div className="text-[10.5px] text-zinc-500 truncate mt-0.5">{card.summary}</div>
        </span>
        {card.fields?.length > 0 && (
          <ChevronDown size={14} className={`text-zinc-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      {expanded && card.fields?.length > 0 && enabled && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-3 border-t border-zinc-800/60">
          {card.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={values?.[f.key]}
              onChange={(nv) => onValueChange(f.key, nv)} />
          ))}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 메인
// ────────────────────────────────────────────────────────────────
export default function PromptBuilderV2() {
  // ── persisted state ──
  const initial = loadJSON(STORAGE_STATE, null);
  const [category, setCategory] = useState(initial?.category || 'motion');
  // 모든 카테고리에 대해 기본 enabled/values 를 한 번에 초기화 — 신규 카테고리 추가 시 자동 반영.
  const initialEnabled = () => Object.fromEntries(Object.keys(CARDS).map((k) => [k, defaultEnabled(k)]));
  const initialValues  = () => Object.fromEntries(Object.keys(CARDS).map((k) => [k, defaultValues(k)]));
  const [enabledByCat, setEnabledByCat] = useState(() => {
    const saved = arrayToEnabled(initial?.enabledByCat);
    const base = initialEnabled();
    // 저장된 카테고리는 그대로 가져오되, 없는 카테고리는 기본값으로 채움 (마이그레이션).
    return { ...base, ...saved };
  });
  const [valuesByCat, setValuesByCat] = useState(() => ({
    ...initialValues(),
    ...(initial?.valuesByCat || {}),
  }));

  const [presets, setPresets] = useState(() => loadJSON(STORAGE_PRESETS, {}));
  const [history, setHistory] = useState(() => loadJSON(STORAGE_HISTORY, []));

  const [expandedCard, setExpandedCard] = useState(null);
  const [copied, setCopied] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const toastTimer = useRef(null);
  const [toast, setToast] = useState('');

  // ── persist on change ──
  useEffect(() => {
    saveJSON(STORAGE_STATE, {
      category,
      enabledByCat: enabledToArray(enabledByCat),
      valuesByCat,
    });
  }, [category, enabledByCat, valuesByCat]);

  useEffect(() => { saveJSON(STORAGE_PRESETS, presets); }, [presets]);
  useEffect(() => { saveJSON(STORAGE_HISTORY, history); }, [history]);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  };

  // ── derived ──
  const cards = CARDS[category] || [];
  const enabled = enabledByCat[category] || new Set();
  const values = valuesByCat[category] || {};

  // 카드별 검증 오류 — Map<cardId, errorMessage>
  const errors = useMemo(() => {
    const out = {};
    for (const card of cards) {
      if (!enabled.has(card.id) || typeof card.validateFn !== 'function') continue;
      const filled = { ...Object.fromEntries((card.fields || []).map((f) => [f.key, f.default])), ...(values[card.id] || {}) };
      const err = card.validateFn(filled);
      if (err) out[card.id] = err;
    }
    return out;
  }, [cards, enabled, values]);

  const compiled = useMemo(() => {
    const parts = [];
    for (const card of cards) {
      if (!enabled.has(card.id)) continue;
      // 검증 실패한 카드는 컴파일 결과에서 제외하지 않고 그대로 포함 (사용자에게 경고만)
      parts.push(compileCard(card, values[card.id]));
    }
    return parts.join('\n\n');
  }, [cards, enabled, values]);

  // ── handlers ──
  const toggleCard = (cardId) => {
    setEnabledByCat((prev) => {
      const set = new Set(prev[category]);
      if (set.has(cardId)) set.delete(cardId); else set.add(cardId);
      return { ...prev, [category]: set };
    });
  };

  const setCardValue = (cardId, key, val) => {
    setValuesByCat((prev) => ({
      ...prev,
      [category]: { ...prev[category], [cardId]: { ...(prev[category]?.[cardId] || {}), [key]: val } },
    }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compiled);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      showToast('클립보드에 복사됐어요');
    } catch {
      showToast('복사 실패 — 수동으로 복사하세요');
    }
  };

  const handleDownload = () => {
    // eslint-disable-next-line react-hooks/purity
    const ts = Date.now();
    const blob = new Blob([compiled], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-builder-v2_${category}_${ts}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('파일로 저장됨');
  };

  const pushHistory = (entry) => {
    // eslint-disable-next-line react-hooks/purity
    const ts = Date.now();
    setHistory((prev) => {
      const next = [{ ...entry, ts }, ...prev];
      return next.slice(0, 30);
    });
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) { showToast('프리셋 이름을 입력하세요'); return; }
    if (presets[name] && !confirm(`"${name}" 프리셋이 이미 있습니다. 덮어쓸까요?`)) return;
    // eslint-disable-next-line react-hooks/purity
    const ts = Date.now();
    setPresets((prev) => ({
      ...prev,
      [name]: {
        category,
        enabled: [...enabled],
        values: values,
        ts,
      },
    }));
    setPresetName('');
    pushHistory({ category, prompt: compiled, presetName: name });
    showToast(`프리셋 "${name}" 저장됨`);
  };

  const handleLoadPreset = (name) => {
    const p = presets[name];
    if (!p) return;
    if (p.category && CARDS[p.category]) setCategory(p.category);
    setEnabledByCat((prev) => ({ ...prev, [p.category]: new Set(p.enabled || []) }));
    setValuesByCat((prev) => ({ ...prev, [p.category]: p.values || defaultValues(p.category) }));
    setShowPresets(false);
    showToast(`프리셋 "${name}" 불러옴`);
  };

  const handleDeletePreset = (name) => {
    if (!confirm(`프리셋 "${name}"을 삭제할까요?`)) return;
    setPresets((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    showToast(`프리셋 "${name}" 삭제됨`);
  };

  const handleReset = () => {
    if (!confirm(`${CATEGORY_LABELS[category]} 카테고리의 모든 카드 설정을 초기화할까요?`)) return;
    setEnabledByCat((prev) => ({ ...prev, [category]: defaultEnabled(category) }));
    setValuesByCat((prev) => ({ ...prev, [category]: defaultValues(category) }));
    showToast('초기화됨');
  };

  const presetEntries = Object.entries(presets).sort((a, b) => (b[1]?.ts || 0) - (a[1]?.ts || 0));
  const enabledCount = enabled.size;
  const totalCount = cards.length;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="flex flex-col h-full bg-[#09090B] text-zinc-100 p-5 font-sans overflow-hidden">
      <main className="flex-1 flex gap-5 min-h-0 min-w-0">
        {/* ── 좌측 사이드바 ── */}
        <aside className="w-[360px] shrink-0 bg-[#18181B] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* 카테고리 탭 */}
          <div className="p-4 border-b border-zinc-800 shrink-0">
            {/* 카테고리 탭 — 6개로 늘어나면 한 줄에 다 안 들어가므로 flex-wrap 으로 두 줄 허용. */}
            <div className="flex flex-wrap bg-[#121214] p-1 rounded-lg border border-zinc-800/80 gap-1">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const active = category === key;
                const Icon = CATEGORY_ICONS[key] || TypeIcon;
                return (
                  <button key={key} onClick={() => { setCategory(key); setExpandedCard(null); }}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-[10.5px] font-bold transition-all ${active ? 'bg-[#27272A] text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <Icon size={12} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2.5 px-1">
              <span className="text-[10px] font-mono text-zinc-500">{enabledCount}/{totalCount} 카드 활성</span>
              <button onClick={handleReset} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-200 transition-colors">
                초기화
              </button>
            </div>
          </div>

          {/* 카드 목록 + 폼 */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
            {cards.map((card) => (
              <CardBlock key={card.id} card={card}
                enabled={enabled.has(card.id)}
                values={values[card.id]}
                expanded={expandedCard === card.id}
                error={errors[card.id]}
                onToggle={() => toggleCard(card.id)}
                onValueChange={(k, val) => setCardValue(card.id, k, val)}
                onExpand={() => setExpandedCard((prev) => prev === card.id ? null : card.id)}
              />
            ))}
          </div>
        </aside>

        {/* ── 우측 결과 패널 ── */}
        <section className="flex-1 min-w-0 bg-[#18181B] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* 헤더 — 액션 버튼 */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800 bg-[#121214] shrink-0">
            <div className="flex-1">
              <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">컴파일 결과</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{CATEGORY_LABELS[category]} · {enabledCount}장의 카드 조합</div>
            </div>
            {hasErrors && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                <AlertCircle size={11} /> 검증 경고 {Object.keys(errors).length}
              </span>
            )}
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-[11px] transition-all active:scale-95 text-black"
              style={{ background: ACCENT }}>
              {copied ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 복사</>}
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 text-[11px] font-semibold transition-colors">
              <Download size={13} /> .txt
            </button>
          </div>

          {/* 본문 — 컴파일된 프롬프트 */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {compiled ? (
              <pre className="text-[12px] text-zinc-200 leading-relaxed whitespace-pre-wrap break-words font-mono">
                {compiled}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                <FolderOpen size={32} className="opacity-30" />
                <p className="text-[12px] font-semibold">왼쪽에서 카드를 활성화하세요</p>
              </div>
            )}
          </div>

          {/* 프리셋 영역 */}
          <div className="border-t border-zinc-800 bg-[#121214] shrink-0">
            <div className="flex items-center px-5 py-3 gap-2">
              <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); }}
                placeholder="프리셋 이름…"
                className="flex-1 bg-[#0A0A0A] border border-zinc-800 rounded-md px-3 py-1.5 text-[12px] text-zinc-200 outline-none focus:border-zinc-600 transition-colors" />
              <button onClick={handleSavePreset}
                disabled={!compiled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Save size={12} /> 저장
              </button>
              <button onClick={() => setShowPresets((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${showPresets ? 'border-transparent text-black' : 'border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500'}`}
                style={showPresets ? { background: ACCENT } : undefined}>
                <FolderOpen size={12} /> 목록 ({presetEntries.length})
              </button>
            </div>
            {showPresets && (
              <div className="px-5 pb-3 max-h-[180px] overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
                {presetEntries.length === 0 ? (
                  <div className="text-[11px] text-zinc-600 text-center py-4">저장된 프리셋이 없어요</div>
                ) : presetEntries.map(([name, p]) => (
                  <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-800 hover:border-zinc-700 bg-[#0A0A0A] transition-colors group">
                    <button onClick={() => handleLoadPreset(name)} className="flex-1 text-left min-w-0">
                      <div className="text-[12px] font-bold text-zinc-200 truncate">{name}</div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        {CATEGORY_LABELS[p.category] || p.category} · 카드 {(p.enabled || []).length}장
                      </div>
                    </button>
                    <button onClick={() => handleDeletePreset(name)}
                      className="p-1.5 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 토스트 */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-[12px] font-bold shadow-2xl border animate-in slide-in-from-top-4 fade-in"
          style={{ background: '#18181B', borderColor: ACCENT + '55', color: ACCENT }}>
          {toast}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.2); border-radius: 4px; transition: background 0.2s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.5); }
      `}</style>
    </div>
  );
}
