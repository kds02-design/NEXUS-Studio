import { useState } from "react";
import { APP_MAP, THEME } from "../config/apps";
import { useGlobal } from "../context/GlobalContext";

export default function PlaceholderApp({ appId }) {
  const app = APP_MAP[appId];
  const { navigate, payload, clearPayload } = useGlobal();
  const [demoPrompt, setDemoPrompt] = useState("");

  const send = (targetId) => {
    navigate(targetId, { source: appId, target: targetId, prompt: { text: demoPrompt || `[${app.label}에서 생성된 프롬프트]`, tags:[], style: app.id }, image:{ url:"", metadata:{} }, params:{} });
  };

  return (
    <div style={{ padding:"32px 40px", maxWidth:860, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>
      {payload.source && payload.target === appId && (
        <div style={{ background:THEME.accentSoft, border:`1px solid ${THEME.accent}55`, borderRadius:8, padding:"10px 14px", marginBottom:20, fontSize:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ color:THEME.accent }}>📥 {APP_MAP[payload.source]?.label}에서 데이터가 전달됐어요
            {payload.prompt?.text && <span style={{ color:THEME.textMuted, marginLeft:8 }}>"{payload.prompt.text.slice(0,30)}..."</span>}
          </span>
          <button onClick={clearPayload} style={{ background:"none", border:"none", color:THEME.textMuted, cursor:"pointer", fontSize:11 }}>✕</button>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
        <span style={{ fontSize:28, color:app.color }}>{app.icon}</span>
        <div>
          <div style={{ fontSize:20, fontWeight:600, color:THEME.text }}>{app.label}</div>
          <div style={{ fontSize:12, color:THEME.textMuted }}>{app.sub}</div>
        </div>
      </div>
      <p style={{ fontSize:13, color:THEME.textMuted, marginBottom:32 }}>{app.desc}</p>
      <div style={{ background:THEME.card, border:`1px dashed ${THEME.border}`, borderRadius:10, padding:"60px 40px", textAlign:"center", marginBottom:24 }}>
        <div style={{ fontSize:40, marginBottom:16, color:app.color, opacity:0.6 }}>{app.icon}</div>
        <div style={{ fontSize:14, color:THEME.textMuted, marginBottom:6 }}>{app.label} 앱이 여기에 들어와요</div>
        <div style={{ fontSize:12, color:THEME.textDim }}>기존 코드를 이 영역에 붙여넣기하면 돼요</div>
      </div>
      {app.canSend.length > 0 && (
        <div style={{ background:THEME.card, border:`1px solid ${THEME.border}`, borderRadius:10, padding:20 }}>
          <div style={{ fontSize:11, color:THEME.textMuted, marginBottom:10, letterSpacing:"0.08em", textTransform:"uppercase" }}>결과물 전달하기</div>
          <input value={demoPrompt} onChange={e => setDemoPrompt(e.target.value)} placeholder="전달할 프롬프트 내용 (테스트용)"
            style={{ width:"100%", background:THEME.surface, border:`1px solid ${THEME.border}`, borderRadius:6, padding:"8px 12px", color:THEME.text, fontSize:13, marginBottom:12, boxSizing:"border-box", outline:"none" }} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {app.canSend.map(tid => {
              const t = APP_MAP[tid];
              return (
                <button key={tid} onClick={() => send(tid)} style={{ background:"none", border:`1px solid ${t.color}55`, borderRadius:6, color:t.color, padding:"6px 14px", fontSize:12, cursor:"pointer" }}>
                  → {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
