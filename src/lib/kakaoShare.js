// 공유 유틸 — 카카오톡(JS SDK) → OS 공유시트(Web Share API) → 클립보드 순 폴백.
// 카카오 SDK 는 VITE_KAKAO_JS_KEY 가 설정된 경우에만 동적 로드 (Kakao Developers 앱 키 + 도메인 등록 필요).
// 키가 없어도 모바일에선 OS 공유시트에 카카오톡이 뜨므로 공유 자체는 동작한다.
const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY || "";
const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

export const hasKakaoKey = !!KAKAO_KEY;

let kakaoLoading = null;
function loadKakao() {
  if (!KAKAO_KEY || typeof window === "undefined") return Promise.resolve(null);
  if (window.Kakao?.isInitialized?.()) return Promise.resolve(window.Kakao);
  if (!kakaoLoading) {
    kakaoLoading = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = SDK_URL;
      s.onload = () => {
        try {
          if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_KEY);
          resolve(window.Kakao);
        } catch (e) { console.warn("[kakaoShare] init 실패:", e?.message || e); resolve(null); }
      };
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }
  return kakaoLoading;
}

// 결과 공유. 반환: "kakao" | "share" | "copied" | null(사용자 취소/실패)
export async function shareResult({ title, text, url }) {
  // 1) 카카오톡 — 텍스트 템플릿 (본문 최대 200자 제한)
  const kakao = await loadKakao();
  if (kakao?.Share) {
    try {
      kakao.Share.sendDefault({
        objectType: "text",
        text: text.length > 190 ? text.slice(0, 187) + "…" : text,
        link: { webUrl: url, mobileWebUrl: url },
        buttonTitle: "나도 해보기",
      });
      return "kakao";
    } catch (e) { console.warn("[kakaoShare] 카카오 공유 실패, 폴백:", e?.message || e); }
  }
  // 2) OS 공유시트 — 모바일이면 카카오톡·메시지 등으로 보낼 수 있음
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return "share"; }
    catch (e) { if (e?.name === "AbortError") return null; }
  }
  // 3) 클립보드
  try { await navigator.clipboard.writeText(`${text}\n${url}`); return "copied"; } catch { /* noop */ }
  return null;
}
