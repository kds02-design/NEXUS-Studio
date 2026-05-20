// Index — Prompt Arche의 최근 4개 썸네일을 16:9로 표시.
// 라이브 딱지·제목 없이 순수 이미지만. 클릭 시 prompt-arc 앱으로 이동하면서
// payload.params.viewPromptId 로 해당 항목의 상세보기를 자동 오픈.
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, appId } from "../lib/firebase";
import { useGlobal, useTheme } from "../context/GlobalContext";
import { cloudinaryVideoThumb } from "../apps/PromptArc/services/cloudinary";

const toMillis = (t) => {
  if (!t) return 0;
  if (typeof t === "number") return t;
  if (typeof t === "string") { const n = Date.parse(t); return Number.isFinite(n) ? n : 0; }
  if (t.toMillis) return t.toMillis();
  if (t.seconds) return t.seconds * 1000;
  return 0;
};

const pickThumb = (p) => p.thumbnail || (p.images?.length > 0 ? p.images[0] : null);
const pickVideo = (p) => (Array.isArray(p.videos) && typeof p.videos[0] === "string") ? p.videos[0] : null;
// 영상 전용 카드: 이미지 썸네일이 없고 영상만 있는 경우.
const isVideoOnly = (p) => !pickThumb(p) && !!pickVideo(p);

export default function DashboardRecentPrompts() {
  const { navigate, isLight } = useGlobal();
  const T = useTheme();
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
        // 썸네일/이미지 또는 영상이 있는 것만 골라 최대 4개
        setItems(all.filter((p) => pickThumb(p) || pickVideo(p)).slice(0, 4));
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
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", color:T.textDim, textTransform:"uppercase", borderLeft:`2px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"}`, paddingLeft:10 }}>최근 프롬프트</div>
        <button
          onClick={() => navigate("prompt-arc", { source:"index", target:"prompt-arc", prompt:{ text:"", tags:[], style:"" }, image:{ url:"", metadata:{} }, params:{} })}
          style={{ background:"none", border:`1px solid ${T.border}`, color:T.textMuted, padding:"4px 12px", borderRadius:6, fontSize:11, cursor:"pointer" }}
        >전체 보기 →</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
        {items.map((p) => {
          const videoUrl = pickVideo(p);
          const imgSrc = pickThumb(p);
          const videoOnly = isVideoOnly(p);
          // 영상 전용일 때만 video 태그 노출. 이미지가 있으면 정지 썸네일이 우선.
          // (대시보드는 4개 고정·above-the-fold라 IntersectionObserver 없이 바로 autoplay.)
          return (
            <button key={p.id} onClick={() => openPrompt(p)}
              title={p.title || "Untitled"}
              style={{
                display:"block", position:"relative", width:"100%", border:`1px solid ${T.border}`,
                borderRadius:10, overflow:"hidden", cursor:"pointer", padding:0, margin:0,
                background:T.card, transition:"all 0.2s",
                aspectRatio:"16 / 9",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${T.accent}88`; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {/* 블러 배경 — 같은 이미지(또는 영상 포스터)를 cover로 깔고 blur+scale 적용.
                  가로로 긴 이미지가 contain 으로 표시될 때 위/아래 빈 공간을 채워주는 역할.
                  scale(1.1) 은 blur 가장자리에 생기는 fade-out 을 가리기 위함. */}
              {(() => {
                const backdropSrc = videoOnly ? (p.videoPoster || cloudinaryVideoThumb(videoUrl)) : imgSrc;
                if (!backdropSrc) return null;
                return (
                  <img src={backdropSrc} alt="" aria-hidden="true"
                    style={{
                      position:"absolute", inset:0, width:"100%", height:"100%",
                      objectFit:"cover", display:"block",
                      filter:"blur(20px) saturate(1.1)",
                      transform:"scale(1.1)",
                      opacity:0.55,
                    }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                );
              })()}
              {videoOnly ? (
                <video
                  src={videoUrl}
                  poster={p.videoPoster || cloudinaryVideoThumb(videoUrl) || undefined}
                  autoPlay muted loop playsInline preload="metadata"
                  style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", display:"block" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <img src={imgSrc} alt=""
                  style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", display:"block" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )}
              {videoUrl && (
                <span style={{
                  position:"absolute", top:8, left:8,
                  padding:"2px 7px", borderRadius:4,
                  background:"rgba(0,0,0,0.65)", color:"#fff",
                  fontSize:9, fontWeight:700, letterSpacing:"0.08em",
                  display:"flex", alignItems:"center", gap:4,
                }}>
                  <span style={{ width:5, height:5, borderRadius:999, background:"#ff4d4d" }} />
                  VIDEO
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
