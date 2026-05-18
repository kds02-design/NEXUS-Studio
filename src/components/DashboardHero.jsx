// 대시보드 풀스크린 히어로 — 다크 시네마틱 배경 이미지 + 그라데이션 + 중앙 텍스트.
// 배경 이미지 URL은 Firestore settings/dashboard에서 라이브 구독.
import { useEffect, useState } from "react";
import { DEFAULT_HERO_IMAGE, subscribeDashboardSettings } from "../lib/dashboardSettings";
import { THEME } from "../config/apps";

export default function DashboardHero() {
  const [bgUrl, setBgUrl] = useState(DEFAULT_HERO_IMAGE);

  useEffect(() => {
    const unsub = subscribeDashboardSettings((data) => {
      if (data?.heroImageUrl) setBgUrl(data.heroImageUrl);
      else setBgUrl(DEFAULT_HERO_IMAGE);
    });
    return () => unsub && unsub();
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "45vh",
        minHeight: 320,
        backgroundImage: `url("${bgUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
        flexShrink: 0,
        marginBottom: 24,
      }}
    >
      {/* dark overlay */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "rgba(10, 10, 15, 0.55)",
        }}
      />
      {/* bottom gradient to dashboard bg */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: "60%",
          background: `linear-gradient(to bottom, rgba(10,10,15,0) 0%, rgba(10,10,15,0.55) 50%, ${THEME.bg} 100%)`,
          pointerEvents: "none",
        }}
      />
      {/* center text */}
      <div
        style={{
          position: "relative",
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 12, padding: "0 24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "'Teko', sans-serif",
            fontSize: "clamp(40px, 8vw, 88px)",
            lineHeight: 1,
            letterSpacing: "0.04em",
            color: "#ffffff",
            fontWeight: 500,
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          CREATIVE NEXUS PLATFORM
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          NEXUS Studio · Design × Prompt × AI
        </p>
      </div>
    </div>
  );
}
