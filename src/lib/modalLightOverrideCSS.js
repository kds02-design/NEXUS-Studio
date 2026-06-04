// 다크 톤이 하드코딩된 상세 모달들을 라이트 모드로 일괄 매핑하는 공유 CSS.
// 컨테이너에 data-modal-theme="light" 를 걸면 자식들의 dark Tailwind 클래스가 라이트 톤으로 뒤집힌다.
// 대상: PreviewModal (PromotionArchive), CodexDetailModal (BannerCodex), PromptArc 상세 등.
//
// 사용:
//   import { MODAL_LIGHT_OVERRIDE_CSS } from "../../../lib/modalLightOverrideCSS";
//   <style>{MODAL_LIGHT_OVERRIDE_CSS}</style>
//   <div data-modal-theme={isLight ? "light" : "dark"}> ...modal content... </div>
//
// 디자인 원칙:
//   - 자기 자신의 surface (bg-[#0c0c0e] 등 모달 패널 루트) 는 직접 conditional 로 swap.
//     이 override 는 *descendants* 만 매칭하므로 모달 루트는 별도 처리 필요.
//   - text-white:not(.bg-black) — 검은 원형 안의 흰 letter (게임 로고 등) 보호.
//   - device 베젤 (.bg-black) 과 브라우저 chrome (.bg-[#202124]) 은 일부러 매핑 제외 → 디바이스 외관 유지.
export const MODAL_LIGHT_OVERRIDE_CSS = `
[data-modal-theme="light"] .bg-\\[\\#111111\\],
[data-modal-theme="light"] .bg-\\[\\#111111\\]\\/95,
[data-modal-theme="light"] .bg-\\[\\#111\\] { background-color: #FAFAFA !important; }
[data-modal-theme="light"] .bg-\\[\\#181818\\] { background-color: #F4F4F5 !important; }
[data-modal-theme="light"] .bg-\\[\\#0A0A0A\\] { background-color: #FFFFFF !important; }
[data-modal-theme="light"] .bg-zinc-900 { background-color: #F4F4F5 !important; }
[data-modal-theme="light"] .bg-zinc-800 { background-color: #E4E4E7 !important; }
[data-modal-theme="light"] .bg-white\\/5 { background-color: rgba(0,0,0,0.04) !important; }
[data-modal-theme="light"] .hover\\:bg-zinc-700:hover { background-color: #D4D4D8 !important; }
[data-modal-theme="light"] .hover\\:bg-zinc-800:hover { background-color: #E4E4E7 !important; }
[data-modal-theme="light"] .border-zinc-700 { border-color: #D4D4D8 !important; }
[data-modal-theme="light"] .border-zinc-800 { border-color: #E4E4E7 !important; }
[data-modal-theme="light"] .border-white\\/5  { border-color: rgba(0,0,0,0.06) !important; }
[data-modal-theme="light"] .border-white\\/10 { border-color: rgba(0,0,0,0.10) !important; }
[data-modal-theme="light"] .border-white\\/20 { border-color: rgba(0,0,0,0.15) !important; }
/* floating glassmorphism — 다크 글래스를 라이트 글래스로 뒤집기 */
[data-modal-theme="light"] .bg-black\\/40 { background-color: rgba(255,255,255,0.82) !important; }
[data-modal-theme="light"] .bg-black\\/50 { background-color: rgba(255,255,255,0.82) !important; }
[data-modal-theme="light"] .bg-white\\/\\[0\\.02\\] { background-color: rgba(0,0,0,0.02) !important; }
[data-modal-theme="light"] .bg-white\\/\\[0\\.06\\] { background-color: rgba(0,0,0,0.06) !important; }
[data-modal-theme="light"] .bg-white\\/10 { background-color: rgba(0,0,0,0.06) !important; }
[data-modal-theme="light"] .bg-white\\/15 { background-color: rgba(0,0,0,0.10) !important; }
[data-modal-theme="light"] .bg-white\\/25 { background-color: rgba(0,0,0,0.15) !important; }
[data-modal-theme="light"] .hover\\:bg-white\\/10:hover { background-color: rgba(0,0,0,0.06) !important; }
/* 텍스트 — bg-black 안의 흰 letter (게임 로고 등) 만 보호. 나머지는 다크로. */
[data-modal-theme="light"] .text-white:not(.bg-black) { color: #1A1A1A !important; }
[data-modal-theme="light"] .text-white\\/70 { color: rgba(26,26,26,0.78) !important; }
[data-modal-theme="light"] .text-white\\/60 { color: rgba(26,26,26,0.65) !important; }
[data-modal-theme="light"] .text-white\\/40 { color: rgba(26,26,26,0.45) !important; }
[data-modal-theme="light"] .text-zinc-200 { color: #27272A !important; }
[data-modal-theme="light"] .text-zinc-300 { color: #3F3F46 !important; }
[data-modal-theme="light"] .text-zinc-400 { color: #52525B !important; }
[data-modal-theme="light"] .text-zinc-500 { color: #71717A !important; }
[data-modal-theme="light"] .text-zinc-600 { color: #A1A1AA !important; }
[data-modal-theme="light"] .hover\\:text-white:hover { color: #1A1A1A !important; }
[data-modal-theme="light"] .hover\\:text-zinc-200:hover { color: #27272A !important; }
`;
