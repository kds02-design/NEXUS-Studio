import { useEffect, useRef, useState } from 'react';
import { C } from './shared';
import { observeFace } from './faceLandmarker';
import { buildFaceReading, faceGuides } from './faceReading';
import { FACE_CONCEPT, FACE_LABELS, FACE_SOURCES } from './faceContent';

const button = { background: C.bg2, color: C.ink, border: `1px solid ${C.line}`, padding: '10px 12px', minHeight: 44, cursor: 'pointer' };
const label = { fontSize: 10, letterSpacing: 1.5, color: C.dim, marginTop: 8 };
const chip = { display: 'inline-block', padding: '2px 7px', marginRight: 5, marginTop: 4, border: `1px solid ${C.line}`, color: C.dim, fontSize: 10.5 };
const groups = [
  { name: '윤곽', ids: [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10] },
  { name: '눈', ids: [33,160,158,133,153,144,33] },
  { name: '눈', ids: [263,387,385,362,380,373,263] },
  { name: '코', ids: [168,6,1,2] },
  { name: '입', ids: [61,40,0,270,291,321,17,91,61] },
];

// overlay: 'mesh' = 윤곽·눈·코·입, 'guides' = 삼정·너비 측정선, 'none'
function FacePreview({ face, overlay = 'mesh' }) {
  const W = face.width, H = face.height, px = p => `${p.x * W},${p.y * H}`;
  const guides = overlay === 'guides' ? faceGuides(face.landmarks) : null;
  return <div style={{ position: 'relative', maxWidth: 420, margin: 'auto' }}>
    <img src={face.previewUrl} alt="관상 촬영 사진" style={{ width: '100%', display: 'block' }} />
    {overlay !== 'none' && <svg aria-label={overlay === 'guides' ? '삼정과 너비 측정선' : '얼굴 윤곽과 눈 코 입 위치'} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {overlay === 'mesh' && groups.map((group, index) => <polyline key={index} fill="none" stroke="#55b89a" strokeWidth="2" vectorEffect="non-scaling-stroke"
        points={group.ids.map(i => px(face.landmarks[i])).join(' ')} />)}
      {guides && <>
        {guides.samjeong.map((g, i) => <line key={`s${i}`} x1={g.from.x * W} y1={g.from.y * H} x2={g.to.x * W} y2={g.to.y * H} stroke={C.gold} strokeWidth="1.5" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />)}
        {guides.widths.map((g, i) => <line key={`w${i}`} x1={g.from.x * W} y1={g.from.y * H} x2={g.to.x * W} y2={g.to.y * H} stroke="#729ff0" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
        {guides.labels.map(l => <text key={l.text} x={l.at.x * W + W * 0.01} y={l.at.y * H} fill={C.gold} fontSize={Math.max(11, W * 0.028)} dominantBaseline="middle">{l.text}</text>)}
      </>}
    </svg>}
  </div>;
}

function Card({ card, accent }) {
  return <div style={{ padding: '10px 12px', marginTop: 8, borderLeft: `2px solid ${accent || C.gold}`, background: 'rgba(24,24,22,0.5)' }}>
    <div style={{ color: C.ink, fontWeight: 700, fontSize: 13 }}>{card.palace && <span style={{ color: C.dim, fontWeight: 400, fontSize: 11, marginRight: 6 }}>{card.palace}</span>}{card.title}</div>
    <div style={label}>{FACE_LABELS.tradition}</div><div>{card.tradition}</div>
    <div style={label}>{FACE_LABELS.reading}</div><div>{card.reading}</div>
    <div style={label}>{FACE_LABELS.question}</div><div style={{ color: C.goldSoft }}>{card.question}</div>
    <div style={label}>{FACE_LABELS.action}</div><div>{card.action}</div>
  </div>;
}

export function FaceResult({ face, preview = false, compact = false }) {
  const [overlay, setOverlay] = useState('guides');
  if (!face) return null;
  const reading = buildFaceReading(face);
  if (!reading) return <p>얼굴 측정값을 계산하지 못했습니다. 다시 촬영해 주세요.</p>;
  const { shape, samjeong, cards, measures } = reading;
  return <div style={{ fontSize: 12, lineHeight: 1.8 }}>
    {preview && <>
      <FacePreview face={face} overlay={overlay} />
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {[['guides', '측정선'], ['mesh', '윤곽'], ['none', '원본']].map(([key, text]) => <button key={key} style={{ ...button, flex: 1, borderColor: overlay === key ? C.gold : C.line }} aria-pressed={overlay === key} onClick={() => setOverlay(key)}>{text}</button>)}
      </div>
    </>}
    <div className="destiny-display" style={{ fontSize: 22, color: C.goldSoft, marginTop: preview ? 12 : 0 }}>{FACE_CONCEPT.title}</div>
    <p style={{ margin: '2px 0 8px' }}>{reading.summary}</p>
    <div style={label}>{FACE_LABELS.observed}</div>
    <div>{reading.observed.map(text => <span key={text} style={chip}>{text}</span>)}</div>

    <div style={{ padding: '10px 12px', marginTop: 10, border: `1px solid ${C.line}` }}>
      <div style={label}>오형(五形) · 전통 관상의 오행 얼굴 분류</div>
      <div style={{ fontSize: 15, color: C.ink }}><span style={{ color: C[shape.key] || C.gold, marginRight: 6 }}>{shape.glyph}</span>{shape.name} <span style={{ color: C.dim, fontSize: 11 }}>· {shape.desc}</span></div>
      {!compact && <><div style={label}>{FACE_LABELS.tradition}</div><div>{shape.tradition}</div>
        <div style={label}>{FACE_LABELS.reading}</div><div>{shape.reading}</div>
        <div style={label}>{FACE_LABELS.question}</div><div style={{ color: C.goldSoft }}>{shape.question}</div>
        <div style={label}>{FACE_LABELS.action}</div><div>{shape.action}</div></>}
    </div>

    <div style={{ padding: '10px 12px', marginTop: 10, border: `1px solid ${C.line}` }}>
      <div style={label}>삼정(三停) · 상정 {measures.samjeong.upper} : 중정 {measures.samjeong.middle} : 하정 {measures.samjeong.lower}</div>
      <div style={{ display: 'flex', height: 10, marginTop: 6, border: `1px solid ${C.line}` }}>
        {[['upper', measures.samjeong.upper, C.목], ['middle', measures.samjeong.middle, C.gold], ['lower', measures.samjeong.lower, C.수]].map(([k, v, color]) => <div key={k} style={{ width: `${v}%`, background: color, opacity: samjeong.key === k || samjeong.key === 'balanced' ? 1 : .35 }} />)}
      </div>
      <Card card={samjeong} accent={C.gold} />
    </div>

    {!compact && cards.length > 0 && <div style={{ marginTop: 10 }}>
      <div style={label}>십이궁(十二宮) 부위 관측 · {cards.length}곳</div>
      {cards.map(card => <Card key={card.tag} card={card} accent="#729ff0" />)}
    </div>}
    {compact && cards.length > 0 && <div style={{ marginTop: 10 }}>
      <div style={label}>십이궁 부위 관측</div>
      <div>{cards.map(card => <span key={card.tag} style={{ ...chip, color: C.ink }}>{card.palace.split('(')[0]} · {card.title}</span>)}</div>
    </div>}
    {!compact && cards.length === 0 && <p style={{ color: C.dim }}>부위 비율이 모두 중간 범위라 별도 부위 카드는 없어요. 삼정과 오형 카드의 질문을 가져가세요.</p>}

    <p style={{ color: C.dim, marginTop: 10 }}>{FACE_CONCEPT.disclaimer} {FACE_CONCEPT.scoreNotice}</p>
    {!compact && <details style={{ color: C.dim }}>
      <summary>{FACE_LABELS.sources}</summary>
      <p style={{ margin: '6px 0 0' }}>상정은 메시에 헤어라인이 없어 이마 윗점에서 추정한 값입니다. 오형·십이궁 분류 경계는 사진 메시 비율의 경험값이며, 웃음·고개 각도·렌즈 왜곡에 따라 달라집니다. 부위 이름은 전통 관상 용어를 빌렸고 제목·비유·질문·행동 제안은 관측소 창작입니다.</p>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{FACE_SOURCES.map(s => <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer" style={{ color: C.dim }}>{s.title}</a></li>)}</ul>
    </details>}
    {!compact && <p style={{ color: C.dim }}>{FACE_CONCEPT.closing}</p>}
  </div>;
}

export function FaceScanner({ value, onChange }) {
  const camera = useRef(null), gallery = useRef(null), run = useRef(0);
  const [face, setFace] = useState(value), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [stage, setStage] = useState(''), [overlay, setOverlay] = useState('mesh');
  const [checked, setChecked] = useState(false);
  useEffect(() => () => { run.current += 1; }, []);
  const reset = () => { run.current += 1; setFace(null); setBusy(false); setError(''); setChecked(false); onChange(null); };
  const pick = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy) return;
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) { setError('12MB 이하 사진을 선택해 주세요.'); return; }
    const id = ++run.current;
    setBusy(true); setFace(null); setChecked(false); setError(''); onChange(null); setStage('사진을 준비하고 있습니다.');
    try {
      const result = await observeFace(file, text => { if (run.current === id) setStage(text); });
      if (run.current === id) { setFace(result); setOverlay('mesh'); }
    } catch (cause) { if (run.current === id) setError(cause.message || '사진 처리에 실패했습니다. 다시 촬영해 주세요.'); }
    finally { if (run.current === id) setBusy(false); }
  };
  const confirmed = face?.reviewStatus === 'confirmed';
  return <div style={{ fontSize: 12, lineHeight: 1.8 }}>
    <p>한 사람의 얼굴 전체를 정면에서, 무표정에 가깝게 촬영해 주세요. 웃으면 눈·입 비율이 달라져요. 안경 반사·마스크·강한 그림자·뷰티 필터는 피해 주세요.</p>
    <p style={{ color: C.dim }}>얼굴 사진은 서버로 전송하거나 저장하지 않고 기기 안에서 처리합니다. 468점 얼굴 메시로 삼정·오형·부위 비율을 재어 전통 관상의 상징과 나란히 보여줘요. 최초 모델 다운로드에는 인터넷 연결이 필요합니다.</p>
    <input hidden ref={camera} type="file" accept="image/*" capture="user" onChange={pick} />
    <input hidden ref={gallery} type="file" accept="image/*" onChange={pick} />
    {!face && !busy && <div style={{ display: 'flex', gap: 8 }}><button style={button} onClick={() => camera.current.click()}>얼굴 촬영</button><button style={button} onClick={() => gallery.current.click()}>사진 선택</button></div>}
    {busy && <p role="status">{stage}</p>}
    {error && <p role="alert">{error}</p>}
    {face && <>
      <FacePreview face={face} overlay={overlay} />
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {[['mesh', '윤곽 보기'], ['guides', '측정선 보기'], ['none', '원본만']].map(([key, text]) => <button key={key} style={{ ...button, flex: 1, borderColor: overlay === key ? C.gold : C.line }} aria-pressed={overlay === key} onClick={() => setOverlay(key)}>{text}</button>)}
      </div>
      {face.warnings.length > 0 ? <div role="alert"><p>다시 촬영해 주세요. 아래 상태에서는 결과에 적용할 수 없습니다.</p><ul>{face.warnings.map(text => <li key={text}>{text}</li>)}</ul></div> : <>
        <div style={{ marginTop: 10 }}><FaceResult face={face} compact /></div>
        <label style={{ display: 'flex', gap: 8, margin: '12px 0' }}><input type="checkbox" checked={checked || confirmed} disabled={confirmed} onChange={e => setChecked(e.target.checked)} />윤곽·눈·코·입 표시가 맞고 사진이 선명한지 확인했습니다.</label>
        <button style={{ ...button, width: '100%', borderColor: C.gold }} disabled={!checked || confirmed} onClick={() => { const result = { ...face, reviewStatus: 'confirmed' }; setFace(result); onChange(result); }}>{confirmed ? '적용 완료' : '얼굴 관측 결과에 적용'}</button>
      </>}
    </>}
    {(face || busy) && <button style={{ ...button, marginTop: 8 }} onClick={reset}>{busy ? '취소' : '사진 삭제 · 다시 촬영'}</button>}
  </div>;
}
