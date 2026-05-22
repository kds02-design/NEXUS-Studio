import { useState, useEffect, createContext, useContext } from "react";
import { ChevronDown } from "lucide-react";

// 앱별 포인트 컬러를 SectionGroup 들에 일괄 전달하기 위한 Context.
// 각 앱 사이드바 최상단을 <SectionGroupAccent value="#XXXXXX"> 로 감싸면 펼쳐진 카드 배경/보더가 그 컬러로 tint 된다.
const AccentContext = createContext(null);
export const SectionGroupAccent = AccentContext.Provider;

// 사이드바를 의미 단위로 묶는 접기/펴기 그룹.
// 번호(NN) + 컬러 dot + Teko 라벨로 구분되고, 헤더 클릭으로 토글된다.
// storageKey 주면 localStorage 에 열림/닫힘 상태 영속화 — 앱 재진입 시 사용자 마지막 상태 복원.
export default function SectionGroup({
  // index/dotColor 는 더 이상 헤더에 노출하지 않음 — 호환을 위해 prop 은 받지만 무시한다.
  index: _legacyIndex,
  dotColor: _legacyDotColor,
  // icon 주면 라벨 좌측에 아이콘이 노출됨. lucide 아이콘 또는 임의 ReactNode.
  icon,
  label,
  defaultOpen = true,
  storageKey,
  children,
  className = "",
  // controlled 모드 — open + onToggle 을 함께 주면 외부에서 상태 제어 (아코디언용).
  // 둘 다 안 주면 기존처럼 내부 state + localStorage 영속화.
  open: openProp,
  onToggle,
  // 라벨 폰트 — 'sans'(Noto Sans KR, 기본) | 'display'(Teko).
  // 전체 통일을 위해 기본을 sans 로 변경. display 가 필요하면 명시적으로 지정.
  labelFont = 'sans',
  // 펼쳐진 카드 tint 컬러 — 명시 prop > Context > 폴백.
  accent,
}) {
  const contextAccent = useContext(AccentContext);
  const finalAccent = accent || contextAccent || '#71717A';
  const isControlled = openProp !== undefined && typeof onToggle === 'function';
  const lsKey = (!isControlled && storageKey) ? `nx:section:${storageKey}` : null;
  const [openLocal, setOpenLocal] = useState(() => {
    if (!lsKey) return defaultOpen;
    try {
      const v = localStorage.getItem(lsKey);
      if (v === "0") return false;
      if (v === "1") return true;
    } catch { /* ignore */ }
    return defaultOpen;
  });

  const open = isControlled ? openProp : openLocal;
  const handleClick = () => {
    if (isControlled) onToggle(!open);
    else setOpenLocal((v) => !v);
  };

  useEffect(() => {
    if (!lsKey || isControlled) return;
    try { localStorage.setItem(lsKey, openLocal ? "1" : "0"); } catch { /* ignore */ }
  }, [openLocal, lsKey, isControlled]);

  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        className="group flex items-center gap-2.5 px-1 py-1 -mx-1 rounded-md hover:bg-white/[0.03] transition-colors text-left"
        aria-expanded={open}
      >
        {icon && (
          <span
            className="inline-flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0"
            style={{ minWidth: 16, width: 16, height: 16 }}
          >
            {icon}
          </span>
        )}
        <h2
          className={labelFont === 'sans'
            ? "font-sans text-[14px] font-bold tracking-tight leading-none text-zinc-200"
            : "font-display text-[20px] font-light tracking-wide leading-none text-zinc-200"}
          style={{ transform: "translateY(1px)" }}
        >
          {label}
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-zinc-800 to-transparent" />
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div
          className="flex flex-col gap-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            // 앱 포인트 컬러를 8자리 hex 의 alpha 채널로 반투명하게.
            // 14 ≈ 8% 배경 / 33 ≈ 20% 보더.
            background: `${finalAccent}14`,
            borderColor: `${finalAccent}33`,
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}
