import { useCallback, useMemo, useState } from 'react';
import {
  Download, Copy, Archive, FileCode2,
  Check, X, Loader2, Languages, Maximize2, Type, Clock,
} from 'lucide-react';
import { useTheme } from '../../context/GlobalContext';
import { LANG_CONFIG } from './constants/langConfig';
import { getGamePlugin } from './constants/gamePlugins';
import { generateManifest, generateCodeJs, generateUiHtml } from './services/pluginGenerator';

// 포인트 컬러 — APP_REGISTRY 의 figma-l10n color 와 동일.
const ACCENT = '#5C7CFA';

// 다운로드 헬퍼 — MIME 을 text/plain 으로 통일하면 Windows Defender 의 .js 차단을 회피하기 쉽다.
function downloadBlob(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }
}

export default function FigmaL10nApp({ version }) {
  const T = useTheme();
  const game = useMemo(() => getGamePlugin(version), [version]);
  const gameColor = game.color || ACCENT;

  // 게임별 기본 플러그인 이름 (편집 가능). 게임 전환 시 기본값으로 리셋.
  const [pluginName, setPluginName] = useState(game.pluginName);
  const [nameGame, setNameGame] = useState(game.key);
  if (nameGame !== game.key) { setNameGame(game.key); setPluginName(game.pluginName); }

  const [logs, setLogs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [copyFiles, setCopyFiles] = useState(null);

  const pushLog = useCallback((text, cls) => setLogs(prev => [...prev, { text, cls }]), []);

  const langCodes = Object.keys(game.langMaps);
  const termCount = langCodes.length ? Object.keys(game.langMaps[langCodes[0]]).length : 0;

  const buildFiles = useCallback(() => {
    const name = pluginName.trim() || game.pluginName;
    return [
      { filename: 'manifest.json', content: generateManifest(name) },
      { filename: 'code.js', content: generateCodeJs(game.langMaps) },
      { filename: 'ui.html', content: generateUiHtml(game.langMaps, name) },
    ];
  }, [pluginName, game]);

  const handleDownload = useCallback(async (mode) => {
    if (!game.ready) return;
    setGenerating(true);
    setLogs([]);
    const name = pluginName.trim() || game.pluginName;
    try {
      pushLog(`→ ${game.name} 플러그인: ${name}`, 'info');
      pushLog(`→ 포함 언어: ${langCodes.join(', ')}`);
      pushLog(`→ 번역 항목: ${termCount.toLocaleString()}개 × ${langCodes.length}개 언어`);

      const files = buildFiles();

      if (mode === 'copy') {
        setCopyFiles(files);
        pushLog('✓ 복사 모드 — 모달에서 각 파일을 복사하세요.', 'ok');
      } else if (mode === 'zip') {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        files.forEach(f => zip.file(f.filename, f.content));
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `${name}.zip`, 'application/zip');
        pushLog('✓ ZIP 다운로드 완료.', 'ok');
      } else {
        files.forEach(f => downloadBlob(f.content, f.filename, 'text/plain'));
        pushLog('✓ 3개 파일 다운로드 완료. (manifest.json · code.js · ui.html)', 'ok');
      }
    } catch (e) {
      pushLog('✗ 오류: ' + (e?.message || e), 'err');
    } finally {
      setGenerating(false);
    }
  }, [game, pluginName, langCodes, termCount, buildFiles, pushLog]);

  // ── 공통 스타일 토큰 ──
  const panelStyle = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    padding: 24,
  };
  const labelStyle = {
    display: 'block',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: T.textMuted,
    marginBottom: 8,
  };
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: T.text,
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: T.bg, color: T.text, fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        .l10n-input:focus { border-color: ${gameColor} !important; }
        .l10n-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .l10n-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        @keyframes l10n-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 32px 80px' }}>

        {/* 인트로 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: gameColor,
            padding: '5px 11px', border: `1px solid ${gameColor}55`, borderRadius: 999,
            background: `${gameColor}12`, marginBottom: 14,
          }}>
            <Languages size={12} /> Figma Plugin · {game.label}
          </div>
          <p style={{ fontSize: 14, color: T.textMuted, maxWidth: 640, lineHeight: 1.6 }}>
            <strong style={{ color: T.text }}>{game.name}</strong> 용 완성 번역 플러그인을 다운로드합니다.
            3종 파일(<code style={codeChip(T)}>manifest.json</code> · <code style={codeChip(T)}>code.js</code> ·{' '}
            <code style={codeChip(T)}>ui.html</code>)을 받아 Figma 데스크톱에 설치하면, 텍스트를 선택 언어로 즉시 번역합니다.
          </p>
        </div>

        {!game.ready ? (
          /* 준비 중 게임 */
          <div style={{ ...panelStyle, textAlign: 'center', padding: '64px 32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: `${gameColor}18`, marginBottom: 18 }}>
              <Clock size={26} style={{ color: gameColor }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>{game.name} 번역 준비 중</div>
            <p style={{ fontSize: 13, color: T.textMuted, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
              {game.label} 용 번역 데이터가 아직 등록되지 않았습니다. 번역표가 준비되면 이 자리에서 바로
              완성 플러그인을 다운로드할 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            {/* 플러그인 정보 + 다운로드 */}
            <div style={{ ...panelStyle, marginBottom: 20 }}>
              <SectionTitle T={T} index="01" title="Plugin" />

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Plugin Name</label>
                <input
                  className="l10n-input" style={inputStyle}
                  value={pluginName} onChange={e => setPluginName(e.target.value)}
                  placeholder={game.pluginName}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                <StatCard T={T} num={langCodes.length} label="Languages" color={gameColor} />
                <StatCard T={T} num={termCount} label="Terms / Lang" />
                <StatCard T={T} num={termCount * langCodes.length} label="Total Mappings" />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>포함 언어</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {langCodes.map(code => {
                    const cfg = LANG_CONFIG[code];
                    if (!cfg) return null;
                    return (
                      <div key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 13px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, fontSize: 12 }}>
                        <span style={{ fontSize: 15 }}>{cfg.flag}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 10, color: gameColor }}>{code}</span>
                        <span style={{ color: T.text }}>{cfg.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 내장 동작 안내 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                <FeatureRow T={T} icon={<Maximize2 size={14} style={{ color: gameColor }} />}
                  title="박스 자동 확장" desc="번역 후 텍스트 넘침 시 박스 너비 자동 확장 (1줄 유지)" color={gameColor} />
                <FeatureRow T={T} icon={<Type size={14} style={{ color: gameColor }} />}
                  title="원본 폰트 유지" desc="언어별 폰트 교체 없이 TL 원본 폰트 그대로, 글자만 치환" color={gameColor} />
                <FeatureRow T={T} icon={<Languages size={14} style={{ color: gameColor }} />}
                  title="머리기호 유지" desc="'- 스토리' 처럼 접두어가 붙은 라벨도 기호를 유지한 채 번역" color={gameColor} />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => handleDownload('zip')} disabled={generating} style={ctaPrimary(generating, gameColor)}>
                  {generating ? <Loader2 size={15} style={{ animation: 'l10n-spin 0.8s linear infinite' }} /> : <Archive size={15} />}
                  ZIP 다운로드 (권장)
                </button>
                <button onClick={() => handleDownload('download')} disabled={generating} style={ctaSecondary(T)} title="개별 파일 3개 다운로드 — 같은 이름 파일이 있으면 (1) 이 붙어 인식 실패할 수 있음">
                  <Download size={15} /> 개별 파일
                </button>
                <button onClick={() => handleDownload('copy')} disabled={generating} style={ctaSecondary(T)} title="다운로드 차단 시: 코드 복사 모드">
                  <Copy size={15} /> 복사 모드
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: T.textDim, lineHeight: 1.55 }}>
                ZIP 으로 받아 압축을 풀면 <code style={codeChip(T)}>manifest.json</code> · <code style={codeChip(T)}>code.js</code> · <code style={codeChip(T)}>ui.html</code> 파일명이 그대로 유지됩니다.
              </div>

              {logs.length > 0 && (
                <div className="l10n-scroll" style={{ marginTop: 18, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.7, maxHeight: 220, overflowY: 'auto' }}>
                  {logs.map((l, i) => (
                    <div key={i} style={{ color: logColor(l.cls, T, gameColor) }}>{l.text}</div>
                  ))}
                </div>
              )}
            </div>

            {/* 설치 가이드 */}
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16, letterSpacing: '0.02em' }}>
                Figma 설치 방법
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <GuideStep T={T} num="1" color={gameColor}>다운받은 <code style={codeChip(T)}>manifest.json</code>, <code style={codeChip(T)}>code.js</code>, <code style={codeChip(T)}>ui.html</code> 세 파일을 같은 폴더에 모아둡니다.</GuideStep>
                <GuideStep T={T} num="2" color={gameColor}>Figma 데스크톱 앱을 열고 <code style={codeChip(T)}>Menu → Plugins → Development</code> 로 이동합니다.</GuideStep>
                <GuideStep T={T} num="3" color={gameColor}><code style={codeChip(T)}>Import plugin from manifest...</code> 클릭 후 폴더의 <code style={codeChip(T)}>manifest.json</code> 선택.</GuideStep>
                <GuideStep T={T} num="4" color={gameColor}>번역할 텍스트 선택(또는 페이지 전체) → 언어 선택 → 번역 적용.</GuideStep>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 코드 복사 모달 */}
      {copyFiles && (
        <CopyModal T={T} files={copyFiles} color={gameColor} onClose={() => setCopyFiles(null)} />
      )}
    </div>
  );
}

// ── 작은 프레젠테이셔널 컴포넌트 ──

function SectionTitle({ T, index, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{title}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.textDim, letterSpacing: '0.1em' }}>[{index}]</div>
    </div>
  );
}

function FeatureRow({ T, icon, title, desc, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, opacity: 0.9 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{title}</div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color, background: `${color}18`, padding: '2px 7px', borderRadius: 999 }}>항상 켜짐</span>
    </div>
  );
}

function StatCard({ T, num, label, color }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 4, color: color || T.text, fontFamily: "'JetBrains Mono', monospace" }}>
        {Number(num).toLocaleString()}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.textMuted }}>{label}</div>
    </div>
  );
}

function GuideStep({ T, num, color, children }) {
  return (
    <div style={{ padding: 18, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>{num}</div>
      <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function CopyModal({ T, files, color, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, maxWidth: 680, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: T.text }}>
              <Copy size={16} style={{ color }} /> 복사 모드
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6, lineHeight: 1.5, maxWidth: 460 }}>
              Windows 가 .js 다운로드를 차단하는 경우, 각 파일 내용을 복사해서 메모장에 직접 저장하세요 (인코딩: UTF-8).
            </div>
          </div>
          <button onClick={onClose} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
          {files.map(f => <CopyCard key={f.filename} T={T} file={f} color={color} />)}
        </div>
      </div>
    </div>
  );
}

function CopyCard({ T, file, color }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    const ok = await copyToClipboard(file.content);
    setCopied(ok ? 'ok' : 'fail');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color }}>
            <FileCode2 size={14} /> {file.filename}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.textDim, marginTop: 4 }}>
            {file.content.length.toLocaleString()} characters
          </div>
        </div>
        <button
          onClick={onCopy}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: copied === 'ok' ? '#4ade80' : color, color: '#0a0a0f', border: 'none', padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {copied === 'ok' ? <><Check size={13} /> 복사됨</> : copied === 'fail' ? <><X size={13} /> 실패</> : <><Copy size={13} /> 복사</>}
        </button>
      </div>
    </div>
  );
}

// ── 스타일 헬퍼 ──
function codeChip(T) {
  return { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: T.surface, padding: '1px 6px', borderRadius: 4, border: `1px solid ${T.border}`, color: ACCENT };
}
function ctaPrimary(disabled, color) {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    flex: 1, minWidth: 200, padding: '15px 24px', border: 'none', borderRadius: 12,
    fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#3a3a5a' : color, color: disabled ? '#7a7a9a' : '#0a0a0f',
    transition: 'all 0.2s',
  };
}
function ctaSecondary(T) {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '15px 20px', border: `1px solid ${T.border}`, borderRadius: 12,
    fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    background: T.surface, color: T.text, transition: 'all 0.2s',
  };
}
function logColor(cls, T, accent) {
  if (cls === 'ok') return '#4ade80';
  if (cls === 'warn') return '#E17055';
  if (cls === 'err') return '#f87171';
  if (cls === 'info') return accent;
  return T.textMuted;
}
