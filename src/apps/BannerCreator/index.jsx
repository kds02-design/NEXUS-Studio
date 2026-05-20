import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { uploadBase64 } from '../../lib/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Upload, Download, Save, Image as ImageIcon, Check } from 'lucide-react';

const T = {
  bg: '#0A0A0F', surface: '#111118', card: '#16161F',
  border: '#1E1E2E', borderHi: '#2E2E4E',
  text: '#E8E6FF', textMuted: '#7A7A9A', textDim: '#3A3A5A',
  accent: '#E17055',
};

const ARCHETYPES = [
  { id: 'split',      label: 'Split Heavy',  sub: '이미지 50 · 텍스트 50', enabled: true },
  { id: 'asymmetric', label: 'Asymmetric',   sub: '이미지 60 · 텍스트 40', enabled: false },
  { id: 'minimal',    label: 'Minimal',      sub: '풀스크린 + 오버레이',   enabled: false },
];

const COLOR_THEMES = [
  { id: 'dark',    label: '다크',      bg: '#0A0A0F', fg: '#E8E6FF' },
  { id: 'deep',    label: '딥 네이비', bg: '#0D1B2A', fg: '#D0E8FF' },
  { id: 'purple',  label: '퍼플',      bg: '#1E1030', fg: '#E8E0FF' },
  { id: 'crimson', label: '크림슨',    bg: '#1A0808', fg: '#FFE0E0' },
  { id: 'light',   label: '라이트',    bg: '#F0F0F5', fg: '#1A1A2E' },
];

// 이미지를 왼쪽 절반에 커버 크롭으로 그리기
function drawImageCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Canvas 텍스트 줄 바꿈
function measureWrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

async function renderBannerToCanvas(imageDataUrl, mainText, subText, theme) {
  const W = 1920, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 폰트 로딩 대기
  await document.fonts.ready;

  // 오른쪽 텍스트 패널
  ctx.fillStyle = theme.bg;
  ctx.fillRect(W / 2, 0, W / 2, H);

  // 왼쪽 이미지 패널
  if (imageDataUrl) {
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        drawImageCover(ctx, img, 0, 0, W / 2, H);
        resolve();
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  } else {
    ctx.fillStyle = '#16161F';
    ctx.fillRect(0, 0, W / 2, H);
  }

  // 텍스트 영역
  const panelX = W / 2;
  const panelW = W / 2;
  const padH = 96;
  const padV = H * 0.1;

  if (mainText) {
    const fontSize = Math.floor(H * 0.095);
    ctx.fillStyle = theme.fg;
    ctx.font = `700 ${fontSize}px 'Teko', sans-serif`;
    ctx.textBaseline = 'alphabetic';
    const lines = measureWrap(ctx, mainText, panelW - padH * 2);
    const lineH = fontSize * 1.1;
    const totalH = lines.length * lineH;
    const baseY = (H - totalH) / 2 + fontSize * 0.85;
    lines.forEach((line, i) => {
      ctx.fillText(line, panelX + padH, baseY + i * lineH);
    });

    if (subText) {
      const subSize = Math.floor(H * 0.028);
      ctx.font = `400 ${subSize}px 'Noto Sans KR', sans-serif`;
      ctx.fillStyle = theme.fg + 'AA';
      const subY = baseY + totalH + subSize * 1.6;
      ctx.fillText(subText, panelX + padH, subY);
    }
  } else if (subText) {
    const subSize = Math.floor(H * 0.035);
    ctx.font = `400 ${subSize}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = theme.fg;
    ctx.textBaseline = 'middle';
    ctx.fillText(subText, panelX + padH, H / 2);
  }

  return canvas;
}

export default function BannerCreator() {
  const { user } = useAuth();

  const [archetype, setArchetype] = useState('split');
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [mainText, setMainText] = useState('');
  const [subText, setSubText] = useState('');
  const [colorTheme, setColorTheme] = useState(COLOR_THEMES[0]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | done | error

  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageDataUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);

  const handleDownload = async () => {
    const canvas = await renderBannerToCanvas(imageDataUrl, mainText, subText, colorTheme);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `banner_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    setSaveState('saving');
    try {
      const canvas = await renderBannerToCanvas(imageDataUrl, mainText, subText, colorTheme);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const cloudUrl = await uploadBase64(dataUrl);
      await addDoc(collection(db, 'artifacts/banner-creator/public/data/banners'), {
        uid: user.uid,
        imageUrl: cloudUrl,
        archetype,
        mainText,
        subText,
        colorThemeId: colorTheme.id,
        createdAt: serverTimestamp(),
      });
      setSaveState('done');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (e) {
      console.error('[BannerCreator] save failed:', e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const theme = colorTheme;

  return (
    <div style={{
      display: 'flex', height: '100%',
      background: T.bg, color: T.text,
      fontFamily: "'Noto Sans KR', sans-serif",
      overflow: 'hidden',
    }}>

      {/* ── Panel 1: 아키타입 선택 ────────────────────────────── */}
      <div style={{
        width: 196, minWidth: 196,
        borderRight: `1px solid ${T.border}`,
        padding: '24px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
        overflowY: 'auto',
      }}>
        <SectionLabel>아키타입</SectionLabel>
        {ARCHETYPES.map(a => (
          <button
            key={a.id}
            disabled={!a.enabled}
            onClick={() => a.enabled && setArchetype(a.id)}
            style={{
              padding: '12px 14px', borderRadius: 8, textAlign: 'left',
              border: `1px solid ${archetype === a.id ? T.accent : T.border}`,
              background: archetype === a.id ? `${T.accent}15` : T.card,
              color: a.enabled ? T.text : T.textDim,
              cursor: a.enabled ? 'pointer' : 'not-allowed',
              opacity: a.enabled ? 1 : 0.45,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{a.sub}</div>
            {!a.enabled && (
              <div style={{
                display: 'inline-block', marginTop: 6,
                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                color: T.textDim, background: T.surface,
                padding: '2px 6px', borderRadius: 4,
              }}>준비 중</div>
            )}
          </button>
        ))}
      </div>

      {/* ── Panel 2: 배너 스테이지 ────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '28px 32px', overflow: 'hidden', gap: 16,
      }}>
        <div style={{ alignSelf: 'flex-start' }}>
          <SectionLabel>배너 스테이지</SectionLabel>
        </div>

        {/* 16:9 프리뷰 */}
        <div style={{
          width: '100%', aspectRatio: '16/9',
          maxHeight: 'calc(100% - 52px)',
          display: 'flex', borderRadius: 8, overflow: 'hidden',
          border: `1px solid ${T.border}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          flexShrink: 0,
        }}>
          {/* 이미지 슬롯 */}
          <div
            style={{
              width: '50%', height: '100%', position: 'relative',
              background: isDragOver ? `${T.accent}18` : '#111118',
              border: isDragOver ? `2px dashed ${T.accent}` : 'none',
              cursor: 'pointer', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt="banner source"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: T.textMuted, padding: 20, pointerEvents: 'none' }}>
                <ImageIcon size={28} style={{ marginBottom: 8, opacity: 0.35 }} />
                <div style={{ fontSize: 12 }}>드래그 또는 클릭</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>이미지를 여기에</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {/* 텍스트 슬롯 */}
          <div style={{
            width: '50%', height: '100%',
            background: theme.bg,
            display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', justifyContent: 'center',
            padding: '8% 10%',
            gap: '4%',
            overflow: 'hidden',
          }}>
            {mainText ? (
              <div style={{
                fontFamily: "'Teko', sans-serif", fontWeight: 700,
                fontSize: 'clamp(16px, 3.8vw, 56px)', lineHeight: 1.05,
                color: theme.fg, wordBreak: 'break-word',
                maxWidth: '100%',
              }}>
                {mainText}
              </div>
            ) : (
              <div style={{
                fontFamily: "'Teko', sans-serif",
                fontSize: 'clamp(16px, 3.8vw, 56px)', lineHeight: 1.05,
                color: theme.fg, opacity: 0.15, userSelect: 'none',
              }}>
                메인 텍스트
              </div>
            )}
            {subText ? (
              <div style={{
                fontSize: 'clamp(10px, 1.3vw, 16px)', lineHeight: 1.6,
                color: theme.fg + 'AA', wordBreak: 'break-word', maxWidth: '100%',
              }}>
                {subText}
              </div>
            ) : (
              <div style={{
                fontSize: 'clamp(10px, 1.3vw, 16px)',
                color: theme.fg, opacity: 0.15, userSelect: 'none',
              }}>
                서브 텍스트
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Panel 3: 슬롯 편집 ───────────────────────────────── */}
      <div style={{
        width: 256, minWidth: 256,
        borderLeft: `1px solid ${T.border}`,
        padding: '24px 16px',
        display: 'flex', flexDirection: 'column', gap: 20,
        overflowY: 'auto',
      }}>

        {/* 이미지 업로드 */}
        <div>
          <SectionLabel>이미지</SectionLabel>
          <GhostButton onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} />
            {imageDataUrl ? '이미지 교체' : '이미지 업로드'}
          </GhostButton>
        </div>

        {/* 메인 텍스트 */}
        <div>
          <SectionLabel>메인 텍스트</SectionLabel>
          <StyledTextarea
            value={mainText}
            onChange={(e) => setMainText(e.target.value)}
            placeholder="타이틀을 입력하세요"
            rows={3}
          />
        </div>

        {/* 서브 텍스트 */}
        <div>
          <SectionLabel>서브 텍스트</SectionLabel>
          <StyledTextarea
            value={subText}
            onChange={(e) => setSubText(e.target.value)}
            placeholder="서브타이틀 또는 설명"
            rows={2}
          />
        </div>

        {/* 컬러 테마 */}
        <div>
          <SectionLabel>컬러 테마</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
            {COLOR_THEMES.map(ct => (
              <button
                key={ct.id}
                onClick={() => setColorTheme(ct)}
                title={ct.label}
                style={{
                  width: 32, height: 32, borderRadius: 7,
                  background: ct.bg,
                  border: colorTheme.id === ct.id
                    ? `2px solid ${T.accent}`
                    : `2px solid ${T.border}`,
                  cursor: 'pointer',
                  boxShadow: colorTheme.id === ct.id ? `0 0 0 1px ${T.accent}` : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  outline: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 라이트 테마 가시성용 포인트 */}
                {ct.id === 'light' && (
                  <div style={{
                    position: 'absolute', bottom: 3, right: 3,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#1A1A2E',
                  }} />
                )}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
            {colorTheme.label}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleDownload}
            style={{
              width: '100%', padding: '11px', borderRadius: 8,
              border: `1px solid ${T.border}`, background: T.card,
              color: T.text, fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.surface;
              e.currentTarget.style.borderColor = T.borderHi;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.card;
              e.currentTarget.style.borderColor = T.border;
            }}
          >
            <Download size={14} />
            다운로드 (PNG)
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '11px', borderRadius: 8,
              border: `1px solid ${saveState === 'done' ? '#00b894' : T.accent}55`,
              background: saveState === 'done'
                ? '#00b89420'
                : saveState === 'error'
                  ? '#d6336c20'
                  : `${T.accent}18`,
              color: saveState === 'done' ? '#00b894'
                : saveState === 'error' ? '#d6336c'
                  : T.accent,
              fontSize: 13, fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = `${T.accent}28`;
            }}
            onMouseLeave={(e) => {
              if (!saving && saveState !== 'done' && saveState !== 'error')
                e.currentTarget.style.background = `${T.accent}18`;
            }}
          >
            {saveState === 'done' ? <Check size={14} /> : <Save size={14} />}
            {saveState === 'saving' ? '저장 중...'
              : saveState === 'done' ? '저장됨'
                : saveState === 'error' ? '저장 실패'
                  : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 공통 소형 컴포넌트 ─────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: T.textMuted,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function GhostButton({ onClick, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: `1px dashed ${hov ? T.accent : T.border}`,
        background: T.card,
        color: T.textMuted, fontSize: 12,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'border-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function StyledTextarea({ value, onChange, placeholder, rows }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: `1px solid ${focused ? T.accent : T.border}`,
        background: T.card, color: T.text,
        fontSize: 13, resize: 'none',
        fontFamily: "'Noto Sans KR', sans-serif",
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      }}
    />
  );
}
