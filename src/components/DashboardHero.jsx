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
        // 초보자 홈에서는 첫 화면에 실제 시작 메뉴가 함께 보이도록 높이를 작게 유지.
        height: "clamp(220px, 30vh, 300px)",
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
            fontSize: "clamp(36px, 6vw, 64px)",
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
          만들고 싶은 것을 골라 바로 시작해 보세요
        </p>
      </div>
    </div>
  );
}
