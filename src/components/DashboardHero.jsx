// 대시보드 풀스크린 히어로 — 다크 시네마틱 배경 이미지 + 그라데이션 + 중앙 텍스트.
// 배경 이미지 URL은 Firestore settings/dashboard에서 라이브 구독.
// 초기 렌더에는 이미지를 그리지 않고 배경색만 깐다 — Firestore 응답 도착 전까지
// 기본 이미지가 잠깐 보였다가 사용자 설정 이미지로 교체되는 깜빡임 방지.
import { useEffect, useState } from "react";
import { subscribeDashboardSettings } from "../lib/dashboardSettings";
import { useGlobal, useTheme } from "../context/GlobalContext";

export default function DashboardHero() {
  const T = useTheme();
  const { isLight } = useGlobal();
  const [bgUrl, setBgUrl] = useState(null);

  useEffect(() => {
    const unsub = subscribeDashboardSettings((data) => {
      setBgUrl(data?.heroImageUrl || null);
    });
    return () => unsub && unsub();
  }, []);

  // 라이트 모드에서도 이미지 위에 텍스트 가독성을 위해 dark overlay 는 유지.
  // 다만 하단 그라데이션은 페이지 배경(T.bg) 으로 자연스럽게 페이드.
  const gradientStart = isLight ? "rgba(247,247,250,0)"    : "rgba(10,10,15,0)";
  const gradientMid   = isLight ? "rgba(247,247,250,0.55)" : "rgba(10,10,15,0.55)";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        // 화면이 커져도 히어로가 무한정 늘어나지 않도록 상한 고정.
        // 320 ~ 45vh ~ 460 — 큰 모니터에서도 타이틀 위치가 일정 거리 안으로 고정됨.
        height: "clamp(320px, 45vh, 460px)",
        background: T.surface,
        overflow: "hidden",
        flexShrink: 0,
        marginBottom: 24,
      }}
    >
      {/* 배경 이미지 — bgUrl 도착 후에만 마운트. opacity fade-in 으로 부드럽게 노출. */}
      {bgUrl && (
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url("${bgUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transition: "opacity 0.4s ease",
          }}
        />
      )}
      {/* dark overlay — 이미지 위 텍스트 대비 확보. 두 테마 동일. */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "rgba(10, 10, 15, 0.55)",
        }}
      />
      {/* bottom gradient to dashboard bg — 라이트는 흰색으로 페이드 */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: "60%",
          background: `linear-gradient(to bottom, ${gradientStart} 0%, ${gradientMid} 50%, ${T.bg} 100%)`,
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
