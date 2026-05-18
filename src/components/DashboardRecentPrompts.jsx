// Index — Prompt Arche의 최근 4개 썸네일을 16:9로 표시.
// 라이브 딱지·제목 없이 순수 이미지만. 클릭 시 prompt-arc 앱으로 이동하면서
// payload.params.viewPromptId 로 해당 항목의 상세보기를 자동 오픈.
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { useGlobal } from "../context/GlobalContext";
import { THEME } from "../config/apps";

const toMillis = (t) => {
  if (!t) return 0;
  if (typeof t === "number") return t;
  if (typeof t === "string") { const n = Date.parse(t); return Number.isFinite(n) ? n : 0; }
  if (t.toMillis) return t.toMillis();
  if (t.seconds) return t.seconds * 1000;
  return 0;
};

const pickThumb = (p) => p.thumbnail || (p.images?.length > 0 ? p.images[0] : null);

export default function DashboardRecentPrompts() {
  const { navigate } = useGlobal();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    try {
      const ref = collection(db, "artifacts", appId, "public", "data", "prompts");
      const unsub = onSnapshot(ref, (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // 정렬: isLive > isPinned > createdAt desc
        all.sort((a, b) => {
          const al = a.isLive ? 1 : 0, bl = b.isLive ? 1 : 0;
          if (al !== bl) return bl - al;
          const ap = a.isPinned ? 1 : 0, bp = b.isPinned ? 1 : 0;
          if (ap !== bp) return bp - ap;
          return toMillis(b.createdAt) - toMillis(a.createdAt);
        });
        // 썸네일/이미지가 있는 것만 골라 최대 4개
        setItems(all.filter((p) => pickThumb(p)).slice(0, 4));
        setLoading(false);
      }, (err) => { console.warn("[DashboardRecent] subscribe err", err); setLoading(false); });
      return () => unsub();
    } catch (e) { console.warn("[DashboardRecent] init err", e); setLoading(false); }
  }, []);

  const openPrompt = (item) => {
    navigate("prompt-arc", {
      source: "index", target: "prompt-arc",
      prompt: { text: "", tags: [], style: "" },
      image: { url: "", metadata: {} },
      params: { viewPromptId: item.id },
    });
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div style={{ padding:"0 40px", maxWidth:1200, margin:"0 auto", width:"100%", boxSizing:"border-box", marginBottom: 36 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 14 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", color:THEME.textDim, textTransform:"uppercase", borderLeft:`2px solid ${THEME.border}`, paddingLeft:10 }}>최근 프롬프트</div>
        <button
          onClick={() => navigate("prompt-arc", { source:"index", target:"prompt-arc", prompt:{ text:"", tags:[], style:"" }, image:{ url:"", metadata:{} }, params:{} })}
          style={{ background:"none", border:`1px solid ${THEME.border}`, color:THEME.textMuted, padding:"4px 12px", borderRadius:6, fontSize:11, cursor:"pointer" }}
        >전체 보기 →</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
        {items.map((p) => (
          <button key={p.id} onClick={() => openPrompt(p)}
            title={p.title || "Untitled"}
            style={{
              display:"block", position:"relative", border:`1px solid ${THEME.border}`,
              borderRadius:10, overflow:"hidden", cursor:"pointer", padding:0,
              background:THEME.card, transition:"all 0.2s",
              aspectRatio:"16 / 9",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${THEME.accent}88`; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <img src={pickThumb(p)} alt=""
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </button>
        ))}
      </div>
    </div>
  );
}
