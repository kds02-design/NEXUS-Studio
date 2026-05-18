import { Sun, Moon } from "lucide-react";
import { useGlobal } from "../context/GlobalContext";

// 공용 라이트/다크 토글 버튼.
// 어떤 앱이든 이 한 컴포넌트만 가져다 두면 전역 테마 상태와 동기화됨.
//
// 두 가지 변형:
//   <ThemeToggle />               : tailwind/zinc 톤의 기본 스타일
//   <ThemeToggle variant="plain"/>: 색상/배경 없는 미니멀 버전 (사이드바 안쪽용)
export default function ThemeToggle({ variant = "default", size = 14, className = "" }) {
  const { isLight, toggleTheme } = useGlobal();
  const Icon = isLight ? Moon : Sun;
  const title = isLight ? "다크 모드로 전환" : "라이트 모드로 전환";

  if (variant === "plain") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={title}
        aria-label={title}
        className={`p-1.5 rounded-md transition-colors ${
          isLight
            ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            : "text-zinc-500 hover:text-white hover:bg-white/5"
        } ${className}`}
      >
        <Icon size={size} strokeWidth={1.6} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors border ${
        isLight
          ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
      } ${className}`}
    >
      <Icon size={size} strokeWidth={1.6} />
    </button>
  );
}
