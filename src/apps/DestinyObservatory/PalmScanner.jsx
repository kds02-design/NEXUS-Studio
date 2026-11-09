import { useEffect, useRef, useState } from "react";
import { C } from "./shared";
import { PALM_TYPES, photoPoint, editPoint, reviewLines, renderPalmOverlay, linePaths, controlIndices } from "./photoReview";
import { analyzePalmImage } from "./palmSegmentation";
import { buildPalmReading } from "./palmReading";
import { PALM_CONCEPT, PALM_LABELS, PALM_SOURCES } from "./palmContent";
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const buttonStyle = { padding: "10px 12px", border: `1px solid ${C.line}`, background: C.bg2, color: C.ink, cursor: "pointer", fontSize: 12, minHeight: 42 };

export function PalmScanner({ value, onChange }) {
  const inputRef = useRef(null);
  const galleryRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const runRef = useRef(null);
  useEffect(() => () => runRef.current?.abort(), []);
  const [analysis, setAnalysis] = useState(value || null);
  const [lines, setLines] = useState(() => reviewLines(value?.lines || []));
  const [original, setOriginal] = useState(() => reviewLines(value?.automaticLines || value?.lines || []));
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState("heart");
  const [drawing, setDrawing] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [confirmed, setConfirmed] = useState(value?.reviewStatus === "confirmed");
  const invalidate = () => { setConfirmed(false); onChange(null); };
  const saveUndo = () => setHistory(h => [...h.slice(-29), structuredClone(lines)]);
  const change = next => { setLines(next); invalidate(); };
  const handleFile = async event => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || busy) return;
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) { setError("12MB 이하 이미지 파일을 선택해 주세요."); return; }
    setBusy(true); setError(""); setAnalysis(null); invalidate(); setStage("손바닥을 찾고 있습니다.");
    try {
      const controller = new AbortController(); runRef.current = controller;
      const result = await analyzePalmImage(file, setStage, controller.signal);
      if (controller.signal.aborted) return;
      // Preserve every detected centerline pixel; never replace it with sparse chords.
      const editable = reviewLines(result.lines);
      setAnalysis(result); setLines(editable); setOriginal(structuredClone(editable));
      setHistory([]); setDrawing(false); setShowLines(true); setEditing(false); setShowEvidence(false);
      setSelected(editable[0]?.key || "heart");
    } catch (cause) { if(cause.name !== "AbortError") setError(cause.message || "사진을 읽지 못했습니다. JPG 또는 PNG로 다시 선택해 주세요."); }
    finally { setBusy(false); }
  };
  const beginDrag = (event, index, pathIndex) => {
    if (drawing) return;
    event.stopPropagation(); event.preventDefault(); saveUndo();
    dragRef.current = { index, pathIndex, pointerId: event.pointerId };
    svgRef.current.setPointerCapture(event.pointerId); invalidate();
  };
  const moveDrag = event => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const point = photoPoint(event.clientX, event.clientY, svgRef.current.getBoundingClientRect());
    const {index,pathIndex} = dragRef.current;
    setLines(current => editPoint(current, selected, index, point, pathIndex));
  };
  const stopDrag = () => { dragRef.current = null; };
  const addPoint = event => {
    if (!drawing) return;
    const point = photoPoint(event.clientX, event.clientY, svgRef.current.getBoundingClientRect());
    saveUndo();
    const existing = lines.find(line => line.key === selected);
    change(existing ? lines.map(line => line.key === selected ? { ...line, source: "manual", paths: undefined, controls: undefined, path: [...line.path, point] } : line)
      : [...lines, { ...PALM_TYPES.find(line => line.key === selected), source: "manual", path: [point] }]);
  };
  const reset = () => {
    runRef.current?.abort(); setAnalysis(null); setLines([]); setHistory([]); setDrawing(false); setError(""); invalidate();
  };
  const confirm = () => {
    const reviewed = reviewLines(lines);
    if (!reviewed.length) { setError("두 점 이상으로 선 하나를 표시하거나 사진을 삭제해 주세요."); return; }
    const result = { ...analysis, lines: reviewed, automaticLines: original, overlayUrl: renderPalmOverlay(reviewed),
      strongest: undefined, currentState: undefined, reviewStatus: "confirmed", reviewedAt: Date.now() };
    setAnalysis(result); setConfirmed(true); setError(""); onChange(result);
  };

  return <div style={{ color: C.ink, fontSize: 12, lineHeight: 1.7 }}>
    <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />
    <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} hidden />
    {!analysis && !busy && <>
      <p>손가락을 편 손바닥과 손목이 나오도록 정면에서 촬영해 주세요. 자동 후보를 확인하고 직접 보정한 뒤 적용합니다.</p>
      <p>손금 전용 모델로 감정선·두뇌선·생명선의 픽셀을 추출합니다. 운명선은 자동 추출하지 않습니다.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={buttonStyle} onClick={() => inputRef.current.click()}>손바닥 촬영</button>
        <button style={buttonStyle} onClick={() => galleryRef.current.click()}>사진 선택</button>
      </div>
    </>}
    {busy && <><p role="status" aria-live="polite">{stage}</p><button style={buttonStyle} onClick={() => runRef.current?.abort()}>분석 취소</button></>}
    {analysis && <>
      <p style={{ color: C.goldSoft }}>{confirmed ? "확인한 손금이 결과에 적용됐습니다." : "자동 후보입니다. 위치를 확인하고 아래에서 확정해 주세요."}</p>
      {analysis.automaticWarning && <p role="status">자동 분석: {analysis.automaticWarning} · 아래에서 직접 표시할 수 있습니다.</p>}
      <div style={{ position: "relative", aspectRatio: "4 / 5", width: "100%", background: "#111" }}>
        <img src={analysis.previewUrl} alt="손금 보정용 원본 사진" draggable={false} style={{ display: "block", width: "100%", height: "100%" }} />
        {showEvidence && analysis.evidenceUrl && <img src={analysis.evidenceUrl} alt="모델이 검출한 픽셀 영역" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}} />}
        {showLines && <svg ref={svgRef} viewBox="0 0 720 900" preserveAspectRatio="none"
          aria-label="손금 편집 영역" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: editing || drawing ? "none" : "pan-y" }}
          onClick={addPoint} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
          {lines.map(line => <g key={line.key}>
            {linePaths(line).map((path,pathIndex)=><g key={pathIndex}>
              <polyline points={path.map(p => `${p.x*7.2},${p.y*9}`).join(" ")}
                fill="none" stroke={line.color || "#fff"} strokeWidth={selected===line.key?3:2}
                strokeDasharray={line.confidence === "weak" && line.source !== "manual" ? "8 7" : undefined}
                opacity={selected===line.key?1:.6} pointerEvents="none" />
              {editing && selected===line.key && (line.controls?.[pathIndex] || controlIndices(path)).map(index=>{
                const point=path[index];
                return <circle key={index} cx={point.x*7.2} cy={point.y*9} r={22}
                  fill={line.color || "#55b89a"} fillOpacity=".55" stroke="#fff" strokeWidth={2}
                  role="button" tabIndex={drawing?-1:0} aria-label={`${line.name} 조각 ${pathIndex+1} 조절점 ${index+1}`}
                  onPointerDown={event=>beginDrag(event,index,pathIndex)}
                  onKeyDown={event=>{
                    const direction={ArrowLeft:[-.5,0],ArrowRight:[.5,0],ArrowUp:[0,-.5],ArrowDown:[0,.5]}[event.key];
                    if(!direction || drawing)return;
                    event.preventDefault(); saveUndo();
                    change(editPoint(lines,selected,index,{x:clamp(point.x+direction[0]),y:clamp(point.y+direction[1])},pathIndex));
                  }} />;
              })}
            </g>)}
          </g>)}
        </svg>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {PALM_TYPES.map(type => <button key={type.key} style={{ ...buttonStyle, borderColor: selected === type.key ? type.color : C.line }}
          aria-pressed={selected === type.key} disabled={drawing} onClick={() => setSelected(type.key)}>{type.name}{(() => { const found = lines.find(l => l.key === type.key); return !found ? (type.key === "fate" ? " · 직접 그리기" : " · 미검출") : found.confidence === "weak" && found.source !== "manual" ? " · 약한 후보" : ""; })()}</button>)}
      </div>
      <p>{drawing ? "사진의 실제 주름을 따라 순서대로 점을 찍고 ‘그리기 완료’를 누르세요." : "자동 추출은 실제 검출 픽셀의 중심을 표시합니다. 점선은 확신이 낮은 ‘약한 후보’이니 원본 주름과 꼭 비교하세요. 끊어진 조각은 연결하지 않습니다. 운명선은 ‘선 새로 그리기’로 직접 표시할 수 있어요."}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button style={buttonStyle} disabled={drawing} aria-pressed={editing} onClick={()=>{setEditing(!editing);setShowLines(true);}}>{editing?"보정 모드 종료":"보정 모드"}</button>
        <button style={buttonStyle} disabled={!analysis.evidenceUrl || drawing} aria-pressed={showEvidence} onClick={()=>setShowEvidence(!showEvidence)}>{showEvidence?"검출 픽셀 숨기기":"검출 픽셀 보기"}</button>
        <button style={buttonStyle} onClick={() => {
          if (drawing) { setDrawing(false); return; }
          saveUndo(); change(lines.filter(line => line.key !== selected)); setDrawing(true); setShowLines(true); setEditing(true);
        }}>{drawing ? "그리기 완료" : "선 새로 그리기"}</button>
        <button style={buttonStyle} disabled={drawing || !lines.some(l => l.key === selected)} onClick={() => { saveUndo(); change(lines.filter(l => l.key !== selected)); }}>선 삭제</button>
        <button style={buttonStyle} disabled={!history.length} onClick={() => { change(history.at(-1)); setHistory(h => h.slice(0, -1)); }}>되돌리기</button>
        <button style={buttonStyle} disabled={drawing} onClick={() => { saveUndo(); change(structuredClone(original)); }}>자동 후보 복원</button>
        <button style={buttonStyle} disabled={drawing} aria-pressed={!showLines} onClick={() => {setShowLines(!showLines);setShowEvidence(false);}}>{showLines ? "원본만 보기" : "선 보기"}</button>
      </div>
      <p style={{ color: C.dim }}>미확정 손금은 최종 결과에 포함되지 않습니다. 선의 위치 확인은 정확도 인증을 의미하지 않습니다.</p>
      <button style={{ ...buttonStyle, borderColor: C.gold, width: "100%" }} disabled={drawing || !reviewLines(lines).length || confirmed} onClick={confirm}>{confirmed ? "적용 완료" : "위치 확인 · 결과에 적용"}</button>
      <button style={{ ...buttonStyle, marginTop: 8 }} onClick={reset}>사진 삭제 · 다시 촬영</button>
      {confirmed && <PalmResult palm={analysis} compact />}
    </>}
    {error && <p role="alert" style={{ color: C.goldSoft }}>{error}</p>}
    <p style={{ color: C.dim }}>사진은 서버로 전송하지 않습니다. 손금 모델과 실행 파일만 최초 약 23MB 다운로드하며 기기 안에서 분석합니다. 자동 후보의 정확성은 반드시 원본과 비교해 확인해 주세요.</p>
  </div>;
}

const label = { fontSize: 10, letterSpacing: 1.5, color: C.dim, marginTop: 8 };
const chip = { display: "inline-block", padding: "2px 7px", marginRight: 5, marginTop: 4, border: `1px solid ${C.line}`, color: C.dim, fontSize: 10.5 };

function Card({ card, accent }) {
  if (!card) return null;
  return <div style={{ padding: "10px 12px", marginTop: 8, borderLeft: `2px solid ${accent || C.gold}`, background: "rgba(24,24,22,0.5)" }}>
    <div style={{ color: C.ink, fontWeight: 700, fontSize: 13 }}>{card.title}</div>
    {card.tradition && <><div style={label}>{PALM_LABELS.tradition}</div><div>{card.tradition}</div></>}
    <div style={label}>{PALM_LABELS.reading}</div><div>{card.reading}</div>
    <div style={label}>{PALM_LABELS.question}</div><div style={{ color: C.goldSoft }}>{card.question}</div>
    <div style={label}>{PALM_LABELS.action}</div><div>{card.action}</div>
  </div>;
}

export function PalmResult({ palm, compact = false }) {
  if (!palm) return null;
  const reading = buildPalmReading({ ...palm, lines: reviewLines(palm.lines || []) });
  if (!reading) return null;
  return <div style={{ marginTop: compact ? 14 : 0, fontSize: 12, lineHeight: 1.7 }}>
    <div className="destiny-display" style={{ fontSize: 22, color: C.goldSoft }}>{PALM_CONCEPT.title}</div>
    <p style={{ color: C.dim, margin: "2px 0 8px" }}>{palm.hand?.handedness} · {palm.reviewStatus === "confirmed" ? "사용자 확인 완료" : "자동 후보 · 미확정"} · {reading.lines.length}종</p>
    <p style={{ margin: 0 }}>{reading.summary}</p>

    {reading.handType && <div style={{ padding: "10px 12px", marginTop: 10, border: `1px solid ${C.line}` }}>
      <div style={label}>손 모양 · 서양 수상의 4원소 분류</div>
      <div style={{ fontSize: 15, color: C.ink }}><span style={{ color: C.gold, marginRight: 6 }}>{reading.handType.glyph}</span>{reading.handType.name} <span style={{ color: C.dim, fontSize: 11 }}>· {reading.handType.desc}</span></div>
      <div><span style={chip}>손바닥 길이/너비 {reading.handType.palmRatio}</span><span style={chip}>중지/손바닥 {reading.handType.fingerRatio}</span></div>
      {!compact && <><div style={label}>{PALM_LABELS.tradition}</div><div>{reading.handType.tradition}</div>
        <div style={label}>{PALM_LABELS.reading}</div><div>{reading.handType.reading}</div>
        <div style={label}>{PALM_LABELS.question}</div><div style={{ color: C.goldSoft }}>{reading.handType.question}</div></>}
    </div>}

    {reading.lines.map(line => <div key={line.key} style={{ padding: "10px 12px", marginTop: 10, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: line.color, fontSize: 14, fontWeight: 700 }}>{line.name}</span>
        <span style={{ color: C.dim, fontSize: 10.5 }}>{line.source === "manual" ? "직접 표시" : line.confidence === "weak" ? "약한 후보 · 사용자 확인" : "자동 후보 · 사용자 확인"}</span>
      </div>
      <div style={label}>{PALM_LABELS.observed}</div>
      <div>{line.observed.map(text => <span key={text} style={chip}>{text}</span>)}</div>
      {compact
        ? <><div style={label}>{PALM_LABELS.reading}</div><div>{(line.cards[0] || line.base).reading}</div>
            <div style={label}>{PALM_LABELS.question}</div><div style={{ color: C.goldSoft }}>{(line.cards[0] || line.base).question}</div></>
        : <>
            <div style={label}>{PALM_LABELS.tradition}</div><div>{line.base.tradition}</div>
            {line.cards.map(card => <Card key={card.title} card={card} accent={line.color} />)}
            {!line.cards.length && <Card card={line.base} accent={line.color} />}
            {line.fragmentNote && <Card card={line.fragmentNote} accent={C.dim} />}
          </>}
    </div>)}

    {!compact && <details style={{ marginTop: 10, color: C.dim }}>
      <summary>{PALM_LABELS.sources}</summary>
      <p style={{ margin: "6px 0 0" }}>{PALM_CONCEPT.disclaimer} {PALM_CONCEPT.scoreNotice} 측정값은 사진 위의 길이·각도이며 촬영 각도와 검출 범위에 따라 달라집니다. 선의 이름과 기본 주제는 아래 자료를 참고했고, 제목·비유·질문·행동 제안은 관측소가 새로 쓴 창작입니다.</p>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{PALM_SOURCES.map(s => <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer" style={{ color: C.dim }}>{s.title}</a></li>)}</ul>
    </details>}
    <p style={{ color: C.dim, marginTop: 10 }}>{compact ? PALM_CONCEPT.disclaimer : PALM_CONCEPT.closing}</p>
  </div>;
}

