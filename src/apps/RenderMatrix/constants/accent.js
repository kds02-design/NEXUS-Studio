import { APP_MAP } from "../../../config/apps.js";

// 앱 포인트 컬러 단일 소스 — APP_REGISTRY 의 render-metrics color 를 그대로 사용.
// 하드코딩 금지 컨벤션(§7)에 따라 사이드바/결과 패널이 전부 이 값을 참조한다.
// Tailwind 클래스에서는 index.jsx 루트가 주입하는 --rm-accent CSS 변수로 사용.
export const ACCENT = APP_MAP["render-metrics"]?.color ?? "#00CEC9";
