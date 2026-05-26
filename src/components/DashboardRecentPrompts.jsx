// Index — Prompt Arche의 최근 4개 썸네일을 16:9로 표시.
// 라이브 딱지·제목 없이 순수 이미지만. 클릭 시 prompt-arc 앱으로 이동하면서
// payload.params.viewPromptId 로 해당 항목의 상세보기를 자동 오픈.
import { useEffect, useRef, useState } from "react";
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

// 영상 썸네일 — hover 시 재생, 떠나면 정지. 한 번의 hover 안에서 최대 2회 재생.
function VideoThumb({ src, poster, play, style }) {
  const ref = useRef(null);
  const playsRef = useRef(0);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (play) {
      playsRef.current = 0;
      try { v.currentTime = 0; const p = v.play(); if (p?.catch) p.catch(() => {}); } catch { /* ignore */ }
    } else {
      try { v.pause(); v.currentTime = 0; } catch { /* ignore */ }
    }
  }, [play]);

  const handleEnded = () => {
    playsRef.current += 1;
    if (playsRef.current < 2 && play) {
      const v = ref.current;
      if (v) { try { v.currentTime = 0; const p = v.play(); if (p?.catch) p.catch(() => {}); } catch { /* ignore */ } }
    }
  };

  return (
    <video
      ref={ref}
      src={src}
      poster={poster || undefined}
      muted playsInline preload="metadata"
      onEnded={handleEnded}
      style={style}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
}

const pickThumb = (p) => p.thumbnail || (p.images?.length > 0 ? p.images[0] : null);
const pickVideo = (p) => (Array.isArray(p.videos) && typeof p.videos[0] === "string") ? p.videos[0] : null;
// 영상 전용 카드: 이미지 썸네일이 없고 영상만 있는 경우.
const isVideoOnly = (p) => !pickThumb(p) && !!pickVideo(p);

function RecentCard({ item, T, onOpen }) {
  const [hov, setHov] = useState(false);
  const videoUrl = pickVideo(item);
  const imgSrc = pickThumb(item);
  const videoOnly = isVideoOnly(item);
  const backdropSrc = videoOnly ? (item.videoPoster || cloudinaryVideoThumb(videoUrl)) : imgSrc;
  return (
    <button
      onClick={() => onOpen(item)}
      title={item.title || "Untitled"}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"block", position:"relative", width:"100%",
        border:`1px solid ${hov ? `${T.accent}88` : T.border}`,
        borderRadius:10, overflow:"hidden", cursor:"pointer", padding:0, margin:0,
        background:T.card, transition:"all 0.2s",
        aspectRatio:"16 / 9",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {backdropSrc && (
        <img src={backdropSrc} alt="" aria-hidden="true"
          style={{
            position:"absolute", inset:0, width:"100%", height:"100%",
            objectFit:"cover", display:"block",
            filter:"blur(20px) saturate(1.1)",
            transform:"scale(1.1)",
            opacity:0.55,
          }}
          onError={(e) => { e.currentTarget.style.display = "none"; }} />
      )}
      {videoOnly ? (
        <VideoThumb
          src={videoUrl}
          poster={item.videoPoster || cloudinaryVideoThumb(videoUrl)}
          play={hov}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", display:"block" }}
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
}

function SkeletonCard({ T }) {
  return (
    <div style={{
      position:"relative", width:"100%",
      border:`1px solid ${T.border}`,
      borderRadius:10, overflow:"hidden",
      background:T.card,
      aspectRatio:"16 / 9",
      opacity:0.5,
    }} />
  );
}

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
        // 인덱스는 공개 쇼케이스 — visibility='private' (RenderMatrix 자동 등록 등) 은 제외.
        // 썸네일/이미지 또는 영상이 있는 것만 골라 최대 4개.
        setItems(all.filter((p) => p.visibility !== 'private' && (pickThumb(p) || pickVideo(p))).slice(0, 4));
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

  // 로딩 완료 + 결과 없음 → 영역 숨김. 로딩 중에는 스켈레톤으로 공간 예약 (갑자기 등장 방지).
  if (!loading && items.length === 0) return null;

  return (
    <div style={{ padding:"0 40px", maxWidth:1200, margin:"0 auto", width:"100%", boxSizing:"border-box", marginBottom: 36 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 14 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", color:T.textDim, textTransform:"uppercase", borderLeft:`2px solid ${isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"}`, paddingLeft:10 }}>최근 프롬프트</div>
        <button
          onClick={() => navigate("prompt-arc", { source:"index", target:"prompt-arc", prompt:{ text:"", tags:[], style:"" }, image:{ url:"", metadata:{} }, params:{} })}
          style={{ background:"none", border:`1px solid ${T.border}`, color:T.textMuted, padding:"4px 12px", borderRadius:6, fontSize:11, cursor:"pointer" }}
        >전체 보기 →</button>
      </div>
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12,
        opacity: loading ? 0.6 : 1, transition: "opacity 0.4s ease",
      }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} T={T} />)
          : items.map((p) => <RecentCard key={p.id} item={p} T={T} onOpen={openPrompt} />)}
      </div>
    </div>
  );
}
