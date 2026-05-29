import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileSpreadsheet, Download, Copy, Archive, FileCode2,
  Check, X, Loader2, Languages, Maximize2, Type,
} from 'lucide-react';
import { useTheme } from '../../context/GlobalContext';
import { LANG_CONFIG } from './constants/langConfig';
import { readWorkbook, analyzeWorkbook } from './services/excelParser';
import { generateManifest, generateCodeJs, generateUiHtml } from './services/pluginGenerator';

// 포인트 컬러 — APP_REGISTRY 의 figma-l10n color 와 동일 (VectorForge ACCENT 패턴).
const ACCENT = '#5C7CFA';

const DEFAULT_PLUGIN_NAME = 'L10N 번역 적용기';

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

export default function FigmaL10nApp() {
  const T = useTheme();
  const fileInputRef = useRef(null);

  // 설정
  const [pluginName, setPluginName] = useState(DEFAULT_PLUGIN_NAME);
  const [sheetName, setSheetName] = useState('');
  const [splitParen, setSplitParen] = useState(true);

  // 파일 / 파싱
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // 생성
  const [logs, setLogs] = useState([]);
  const [generating, setGenerating] = useState(false);

  // 복사 모달
  const [copyFiles, setCopyFiles] = useState(null);

  const pushLog = useCallback((text, cls) => setLogs(prev => [...prev, { text, cls }]), []);

  // workbook / sheetName / splitParen 변경 시 재분석.
  useEffect(() => {
    if (!workbook) return;
    let cancelled = false;
    (async () => {
      const result = await analyzeWorkbook(workbook, { sheetName, splitParen });
      if (cancelled) return;
      if (result.ok) { setParsed(result); setParseError(''); }
      else { setParsed(null); setParseError(result.error); }
    })();
    return () => { cancelled = true; };
  }, [workbook, sheetName, splitParen]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setParseError('xlsx 또는 xls 파일만 업로드 가능합니다.');
      return;
    }
    setFileName(file.name);
    setParseError('');
    setLogs([]);
    try {
      const wb = await readWorkbook(file);
      setWorkbook(wb);
    } catch (e) {
      setWorkbook(null);
      setParsed(null);
      setParseError('파일을 읽을 수 없습니다: ' + (e?.message || e));
    }
  }, []);

  const buildFiles = useCallback(() => {
    const name = pluginName.trim() || DEFAULT_PLUGIN_NAME;
    return [
      { filename: 'manifest.json', content: generateManifest(name) },
      { filename: 'code.js', content: generateCodeJs(parsed.langMaps) },
      { filename: 'ui.html', content: generateUiHtml(parsed.langMaps, name) },
    ];
  }, [pluginName, parsed]);

  const handleGenerate = useCallback(async (mode) => {
    if (!parsed) return;
    setGenerating(true);
    setLogs([]);
    const name = pluginName.trim() || DEFAULT_PLUGIN_NAME;
    const { langMaps, detected, unknownCols } = parsed;
    try {
      pushLog(`→ 플러그인 이름: ${name}`, 'info');
      pushLog(`→ 감지된 언어: ${detected.map(d => d.code).join(', ')}`);
      if (unknownCols.length) pushLog(`! 무시된 컬럼: ${unknownCols.join(', ')}`, 'warn');
      const totalMappings = Object.values(langMaps).reduce((a, m) => a + Object.keys(m).length, 0);
      pushLog(`→ 총 매핑: ${totalMappings.toLocaleString()}개`);

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
  }, [parsed, pluginName, buildFiles, pushLog]);

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

  const totalMappings = parsed
    ? Object.values(parsed.langMaps).reduce((a, m) => a + Object.keys(m).length, 0)
    : 0;

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: T.bg, color: T.text, fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        .l10n-input:focus { border-color: ${ACCENT} !important; }
        .l10n-drop:hover { border-color: ${ACCENT}; background: ${ACCENT}0d; }
        .l10n-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .l10n-scroll::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        @keyframes l10n-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 32px 80px' }}>

        {/* 인트로 — 내부 앱 타이틀은 Topbar 담당이라 생략, 한 줄 설명만 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: ACCENT,
            padding: '5px 11px', border: `1px solid ${ACCENT}55`, borderRadius: 999,
            background: `${ACCENT}12`, marginBottom: 14,
          }}>
            <Languages size={12} /> Figma Plugin Generator
          </div>
          <p style={{ fontSize: 14, color: T.textMuted, maxWidth: 620, lineHeight: 1.6 }}>
            엑셀 번역표(<code style={codeChip(T)}>.xlsx</code>)를 업로드하면 언어를 자동 감지하여
            Figma 번역 플러그인 3종 파일(<code style={codeChip(T)}>manifest.json</code> ·{' '}
            <code style={codeChip(T)}>code.js</code> · <code style={codeChip(T)}>ui.html</code>)을 즉시 생성합니다.
          </p>
        </div>

        {/* 설정 + 업로드 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* 좌: 설정 */}
          <div style={panelStyle}>
            <SectionTitle T={T} index="01" title="Configure" />
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Plugin Name</label>
              <input
                className="l10n-input" style={inputStyle}
                value={pluginName} onChange={e => setPluginName(e.target.value)}
                placeholder="예: 스타일샵 L10N 번역기"
              />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Sheet Name</label>
              <input
                className="l10n-input" style={inputStyle}
                value={sheetName} onChange={e => setSheetName(e.target.value)}
                placeholder="시트명 (비워두면 첫 번째 시트)"
              />
            </div>
            <div>
              <label style={labelStyle}>Options</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 유일하게 생성 결과에 영향을 주는 토글 */}
                <label style={optionRow(T)}>
                  <input
                    type="checkbox" checked={splitParen}
                    onChange={e => setSplitParen(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: ACCENT, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>괄호 자동 분리</div>
                    <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                      '제목(필수)' → '제목' · '(필수)' 키 추가 생성
                    </div>
                  </div>
                </label>
                {/* 생성 플러그인에 항상 내장되는 동작 — 정보성 표기 */}
                <FeatureRow T={T} icon={<Maximize2 size={14} style={{ color: ACCENT }} />}
                  title="박스 자동 확장" desc="번역 후 텍스트 넘침 시 박스 너비 자동 확장 (1줄 유지)" />
                <FeatureRow T={T} icon={<Type size={14} style={{ color: ACCENT }} />}
                  title="언어별 폰트 자동 변경" desc="Noto Sans TC / JP / SC 등 언어에 맞는 폰트 적용" />
              </div>
            </div>
          </div>

          {/* 우: 업로드 */}
          <div style={panelStyle}>
            <SectionTitle T={T} index="02" title="Upload Spreadsheet" />
            <div
              className="l10n-drop"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
              style={{
                border: `2px dashed ${fileName || isDragging ? ACCENT : T.border}`,
                borderRadius: 14, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                background: fileName || isDragging ? `${ACCENT}0f` : T.surface, transition: 'all 0.2s',
              }}
            >
              <input
                ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
              />
              <FileSpreadsheet size={30} style={{ color: fileName ? ACCENT : T.textDim, marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: fileName ? 600 : 400, color: fileName ? ACCENT : T.textMuted, marginBottom: 4, wordBreak: 'break-all' }}>
                {fileName || 'Drop .xlsx file here, or click to browse'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.textDim }}>
                KR · TW · JA · EN · DE · ES · FR · ...
              </div>
            </div>

            {parseError && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#f8717118', border: '1px solid #f8717155', color: '#f87171', fontSize: 12, lineHeight: 1.5 }}>
                {parseError}
              </div>
            )}

            <div style={{ marginTop: 16, padding: 14, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.textDim, marginBottom: 10 }}>
                자동 감지 가능 언어
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
                {Object.entries(LANG_CONFIG).map(([code, cfg]) => (
                  <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.textMuted }}>
                    <span>{cfg.flag}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: ACCENT, fontSize: 10, background: `${ACCENT}14`, padding: '1px 5px', borderRadius: 3 }}>{code}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 감지 결과 + 생성 */}
        {parsed && (
          <div style={{ ...panelStyle, marginBottom: 20 }}>
            <SectionTitle T={T} index="03" title="Detected" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard T={T} num={parsed.rows.length} label="Total Rows" color={ACCENT} />
              <StatCard T={T} num={parsed.detected.length} label="Languages" color={ACCENT} />
              <StatCard T={T} num={totalMappings} label="Total Mappings" />
              <StatCard T={T} num={parsed.unknownCols.length} label="Unknown Columns" color={parsed.unknownCols.length ? '#E17055' : undefined} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {parsed.detected.map(({ code }) => {
                const cfg = LANG_CONFIG[code];
                return (
                  <div key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 13px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, fontSize: 12 }}>
                    <span style={{ fontSize: 15 }}>{cfg.flag}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 10, color: ACCENT }}>{code}</span>
                    <span style={{ color: T.text }}>{cfg.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.textDim }}>
                      {Object.keys(parsed.langMaps[code]).length} keys
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => handleGenerate('zip')} disabled={generating}
                style={ctaPrimary(generating)}
              >
                {generating ? <Loader2 size={15} style={{ animation: 'l10n-spin 0.8s linear infinite' }} /> : <Archive size={15} />}
                ZIP 다운로드 (권장)
              </button>
              <button onClick={() => handleGenerate('download')} disabled={generating} style={ctaSecondary(T)} title="개별 파일 3개 다운로드 — 같은 이름 파일이 있으면 (1) 이 붙어 인식 실패할 수 있음">
                <Download size={15} /> 개별 파일
              </button>
              <button onClick={() => handleGenerate('copy')} disabled={generating} style={ctaSecondary(T)} title="다운로드 차단 시: 코드 복사 모드">
                <Copy size={15} /> 복사 모드
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: T.textDim, lineHeight: 1.55 }}>
              ZIP 으로 받아 압축을 풀면 <code style={codeChip(T)}>manifest.json</code> · <code style={codeChip(T)}>code.js</code> · <code style={codeChip(T)}>ui.html</code> 파일명이 그대로 유지됩니다.
              개별 다운로드는 같은 이름 파일이 이미 있으면 <code style={codeChip(T)}>code(1).js</code> 처럼 번호가 붙어 플러그인이 파일을 못 찾을 수 있으니, 그때는 이름을 정확히 되돌려 주세요.
            </div>

            {logs.length > 0 && (
              <div className="l10n-scroll" style={{ marginTop: 18, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.7, maxHeight: 220, overflowY: 'auto' }}>
                {logs.map((l, i) => (
                  <div key={i} style={{ color: logColor(l.cls, T) }}>{l.text}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 설치 가이드 */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16, letterSpacing: '0.02em' }}>
            Figma 설치 방법
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <GuideStep T={T} num="1" >다운받은 <code style={codeChip(T)}>manifest.json</code>, <code style={codeChip(T)}>code.js</code>, <code style={codeChip(T)}>ui.html</code> 세 파일을 같은 폴더에 모아둡니다.</GuideStep>
            <GuideStep T={T} num="2" >Figma 데스크톱 앱을 열고 <code style={codeChip(T)}>Menu → Plugins → Development</code> 로 이동합니다.</GuideStep>
            <GuideStep T={T} num="3" ><code style={codeChip(T)}>Import plugin from manifest...</code> 클릭 후 폴더의 <code style={codeChip(T)}>manifest.json</code> 선택.</GuideStep>
            <GuideStep T={T} num="4" >플러그인 실행 → 언어 선택 → 번역 적용.</GuideStep>
          </div>
        </div>
      </div>

      {/* 코드 복사 모달 */}
      {copyFiles && (
        <CopyModal T={T} files={copyFiles} onClose={() => setCopyFiles(null)} />
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

function FeatureRow({ T, icon, title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, opacity: 0.9 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{title}</div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: ACCENT, background: `${ACCENT}18`, padding: '2px 7px', borderRadius: 999 }}>항상 켜짐</span>
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

function GuideStep({ T, num, children }) {
  return (
    <div style={{ padding: 18, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>{num}</div>
      <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function CopyModal({ T, files, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, maxWidth: 680, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: T.text }}>
              <Copy size={16} style={{ color: ACCENT }} /> 복사 모드
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
          {files.map(f => <CopyCard key={f.filename} T={T} file={f} />)}
        </div>
      </div>
    </div>
  );
}

function CopyCard({ T, file }) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: ACCENT }}>
            <FileCode2 size={14} /> {file.filename}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.textDim, marginTop: 4 }}>
            {file.content.length.toLocaleString()} characters
          </div>
        </div>
        <button
          onClick={onCopy}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: copied === 'ok' ? '#4ade80' : ACCENT, color: '#0a0a0f', border: 'none', padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
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
function optionRow(T) {
  return { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer' };
}
function ctaPrimary(disabled) {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    flex: 1, minWidth: 200, padding: '15px 24px', border: 'none', borderRadius: 12,
    fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#3a3a5a' : ACCENT, color: disabled ? '#7a7a9a' : '#0a0a0f',
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
function logColor(cls, T) {
  if (cls === 'ok') return '#4ade80';
  if (cls === 'warn') return '#E17055';
  if (cls === 'err') return '#f87171';
  if (cls === 'info') return ACCENT;
  return T.textMuted;
}
