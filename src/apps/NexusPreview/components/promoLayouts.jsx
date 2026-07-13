/* eslint-disable react-refresh/only-export-components -- 레이아웃 레지스트리(데이터)와 미리보기 컴포넌트를 한 파일에 유지 */
// 프로모션 페이지 레이아웃 프리셋 — KV 가이드 + 레이어 역할 + 프레임 슬롯 명칭 + 부품 미리보기.
// 프로모션마다 페이지 문법이 다르다:
//   · osangseu(블소 오상스형) — 좌우 캐릭터 + 중앙 타이틀, 상품 카드 4열 / 신석 현황 / 보너스 5열.
//   · refine(리니지 제련석형) — 좌측 메인 원화 + 우측 아이템 오브젝트 + 중앙 타이틀/기간/탭,
//     하단은 섹션 배지 → 그라데이션 타이틀 → 제작 레시피 컨테이너([재료]+[재료]→확정 제작→[결과]) → 패키지 카드.
//     (레퍼런스: 새로고침/아지트/전장의/바람의/UNLIMIT/투혼의/27주년 제련석 페이지 실측 비율)
// 프레임 슬롯 key(product/banner/bonus/mobile)는 레이아웃과 무관하게 고정 — 저장 스키마·몽타주
// 라운드트립(RubiconForge)이 공유되므로 라벨만 레이아웃별로 바뀐다.
import { KV_W, PAGE_H } from "../services/kvComposer";
import { shade } from "../services/theme";

const hxA = (hex, a) => { const h = (hex || "#000000").replace("#", ""); const r = parseInt(h.slice(0, 2), 16) || 0, g = parseInt(h.slice(2, 4), 16) || 0, b = parseInt(h.slice(4, 6), 16) || 0; return `rgba(${r},${g},${b},${a})`; };

/* ── 오상스형 부품 미리보기 ──────────────────────────────────────────────────
   Figma 문서(오상스 6월) 실측 좌표·크기 그대로. 페이지 3000 폭 기준. */
function OsangseuParts({ theme, frames = {} }) {
  const t = theme.tokens;
  const frameCol = shade(t.panel, 42);
  const frameBox = (src, r) => src
    ? { backgroundImage: `url(${src})`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }
    : { background: t.panel, border: `3px solid ${frameCol}`, borderRadius: r };
  const productF = !!frames.product, bonusF = !!frames.bonus;
  const tTop = t.titleTop || t.title, tBot = t.titleBottom || t.accent;
  const note = t.textLight || "#F3E4BC";     // 색-기본텍스트/노트
  const catCol = t.accent || "#E2DC9D";      // 색-강조(분류)
  const btnBg = `linear-gradient(180deg, ${t.btnTop || t.primary}, ${t.btnBottom || t.primary})`;
  const btnBorder = t.btnBorder || t.primary;
  // 그라데이션 섹션 타이틀 (72/44px) — Figma title/grad 톤
  const gtitle = (y, size, text) => (
    <div style={{ position: "absolute", left: 0, width: KV_W, top: y, textAlign: "center", fontWeight: 800, fontSize: size,
      backgroundImage: `linear-gradient(180deg, ${tTop} 13%, ${tBot} 97%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}>{text}</div>
  );
  const subT = (y, text, size = 22) => <div style={{ position: "absolute", left: 0, width: KV_W, top: y, textAlign: "center", fontSize: size, color: note }}>{text}</div>;
  // 알약 버튼 (Figma btn/grad) — text 흰색 그라데이션
  const pill = (x, y, w, h, fs, label) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: h / 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, fontWeight: 700, color: "#ffffff", textShadow: "0 1px 2px rgba(26,51,5,0.5)" }}>{label}</div>
  );
  const PRODUCT_X = [948.5, 1223.5, 1498.5, 1773.5];  // 상품카드 4 (278w)
  const MILE_X = [930, 1158, 1386, 1614, 1842];       // 보너스카드 5 (228w)
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: KV_W, height: PAGE_H, pointerEvents: "none", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* ① 스페셜 상품 (heading 72 / subtitle 22) */}
      {gtitle(1026, 72, "이 달의 스페셜 상품")}
      {subT(1124, "매월 입고되는 스페셜 상품들을 확인해 보세요!", 22)}
      {PRODUCT_X.map((x, i) => (
        <div key={i} style={{ position: "absolute", left: x, top: 1176.7, width: 278, height: 366, ...frameBox(frames.product, 20) }}>
          {!productF && <div style={{ position: "absolute", left: 52, top: 56, width: 178, height: 171, borderRadius: 14, background: hxA(frameCol, 0.35), border: `3px solid ${frameCol}` }} />}
          <div style={{ position: "absolute", left: 19, top: 240, width: 237, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <div style={{ fontSize: 22, color: catCol }}>［분류］</div>
            <div style={{ fontSize: 34, color: note, fontWeight: 700 }}>［상품명］</div>
          </div>
        </div>
      ))}
      {pill(1321, 1580, 358, 100, 32, "전체 상품 자세히 보기")}

      {/* ② 오늘의 상품 (heading 72 / subtitle 22) */}
      {gtitle(1846, 72, "오늘의 상품")}
      {subT(1944, "오늘의 상품 스페셜 구매에 사용한 신석만큼 보너스 보상으로 돌려드려요!", 22)}

      {/* ③ 신석 사용 현황 (subheading 44) + 사용현황 박스 719×376 + 로그인 */}
      {gtitle(2022, 44, "＋ 신석 사용 현황 ＋")}
      <div style={{ position: "absolute", left: 1140.5, top: 2075.7, width: 719, height: 376, ...frameBox(frames.banner, 20), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <div style={{ fontSize: 30, color: note, textAlign: "center", lineHeight: 1.4 }}>로그인 후 신석 사용 현황을<br />확인해 보세요!</div>
        <div style={{ width: 200, height: 72, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(26,51,5,0.5)" }}>로그인</div>
      </div>
      {subT(2451, "※ 신석 사용 현황은 전일 사용 내역을 당일 10시 이후에 확인할 수 있습니다.", 20)}

      {/* ④ 획득 가능한 보너스 선물 (heading 44) + 카드 5 (228×402) */}
      {gtitle(2639, 44, "＋ 획득 가능한 보너스 선물 ＋")}
      {MILE_X.map((x, i) => (
        <div key={i} style={{ position: "absolute", left: x, top: 2714.7, width: 228, height: 402, ...frameBox(frames.bonus, 18) }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 56, textAlign: "center", fontSize: 22, color: note }}>［조건］</div>
          {!bonusF && <div style={{ position: "absolute", left: 61, top: 142, width: 107, height: 89, borderRadius: 12, background: hxA(t.accent, 0.35), border: `2px dashed ${frameCol}` }} />}
          <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", fontSize: 22, color: note }}>［보상명］</div>
          <div style={{ position: "absolute", left: 24, bottom: 34, width: 180, height: 50, background: btnBg, border: `1.5px solid ${btnBorder}`, borderRadius: 25, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>보상 받기</div>
        </div>
      ))}
      {subT(3143, "※ 보너스 보상은 아이템 별 계정당 1회만 획득 가능합니다.", 18)}
    </div>
  );
}

/* ── 제련석형 부품 미리보기 ──────────────────────────────────────────────────
   리니지 제련석 레퍼런스 공통 문법(1920 폭 → 3000 스케일 환산):
   섹션 배지 pill → 그라데이션 섹션 타이틀 → 기간 → 제작 컨테이너(레시피 행 2) → CTA → 패키지 카드. */
function RefineParts({ theme, frames = {} }) {
  const t = theme.tokens;
  const frameCol = shade(t.panel, 42);
  const note = t.textLight || "#F3E4BC";
  const catCol = t.accent || "#E2DC9D";
  const tTop = t.titleTop || t.title, tBot = t.titleBottom || t.accent;
  const btnBg = `linear-gradient(180deg, ${t.btnTop || t.primary}, ${t.btnBottom || t.primary})`;
  const btnBorder = t.btnBorder || t.primary;
  const slotF = !!frames.product, pkgF = !!frames.bonus;
  const frameBox = (src, r) => src
    ? { backgroundImage: `url(${src})`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }
    : { background: hxA(t.panel, 0.78), border: `3px solid ${frameCol}`, borderRadius: r };

  const gtitle = (y, size, text) => (
    <div style={{ position: "absolute", left: 0, width: KV_W, top: y, textAlign: "center", fontWeight: 800, fontSize: size,
      backgroundImage: `linear-gradient(180deg, ${tTop} 13%, ${tBot} 97%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}>{text}</div>
  );
  const subT = (y, text, size = 22) => <div style={{ position: "absolute", left: 0, width: KV_W, top: y, textAlign: "center", fontSize: size, color: note }}>{text}</div>;
  // 섹션 배지 pill (전서버/본서버) — 제련석 페이지 시그니처
  const badge = (y, text) => (
    <div style={{ position: "absolute", left: 0, width: KV_W, top: y, display: "flex", justifyContent: "center" }}>
      <span style={{ padding: "9px 40px", borderRadius: 999, border: `2px solid ${catCol}`, background: hxA(t.panel, 0.8), color: catCol, fontSize: 26, fontWeight: 800, letterSpacing: "0.08em" }}>{text}</span>
    </div>
  );
  const pill = (x, y, w, h, fs, label) => (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: h / 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, fontWeight: 700, color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>{label}</div>
  );
  // 아이템 슬롯(정사각) — frames.product 프레임 or 테마 박스. hero=결과 슬롯(강조 테두리+글로우).
  const slot = (x, y, s, name, count, hero) => (
    <div style={{
      position: "absolute", left: x, top: y, width: s, height: s,
      ...frameBox(frames.product, 14),
      ...(hero && !slotF ? { border: `3px solid ${catCol}` } : {}),
      ...(hero ? { boxShadow: `0 0 32px ${hxA(t.accent, 0.45)}` } : {}),
    }}>
      {!slotF && <div style={{ position: "absolute", left: "22%", top: "20%", width: "56%", height: "48%", borderRadius: 10, background: hxA(hero ? t.accent : frameCol, 0.3), border: `2px dashed ${frameCol}` }} />}
      {count && <div style={{ position: "absolute", right: 8, bottom: 5, fontSize: 22, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{count}</div>}
      {name && <div style={{ position: "absolute", left: -45, right: -45, top: s + 10, textAlign: "center", fontSize: 18, lineHeight: 1.35, color: hero ? catCol : note, wordBreak: "keep-all" }}>{name}</div>}
    </div>
  );
  // 레시피 행: [재료 ×1] ＋ [재료 ×N] → 확정 제작 → [결과 ×1]  (컨테이너 1100 내부 상대 좌표)
  const recipeRow = (y, m1, m2, res) => (
    <div style={{ position: "absolute", left: 0, top: y, width: "100%", height: 250 }}>
      {slot(115, 0, 170, m1, "×1")}
      <div style={{ position: "absolute", left: 300, top: 52, fontSize: 48, color: note, fontWeight: 700 }}>＋</div>
      {slot(365, 0, 170, m2, "×10")}
      <div style={{ position: "absolute", left: 580, top: 52, width: 170, height: 62, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>확정 제작</div>
      {slot(795, -10, 190, res, "×1", true)}
    </div>
  );

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: KV_W, height: PAGE_H, pointerEvents: "none", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* ① 제작 이벤트 — 탭 버튼(y~1020) 바로 아래에서 시작, KV 하단 페이드 위에 얹힘 (콘텐츠는 1100 = x950~2050) */}
      {badge(1050, "전서버")}
      {gtitle(1135, 72, "제련석 제작 이벤트")}
      {subT(1252, "제작 기간 : 2026. 3. 11.(수) 정기점검 후 ~ 2026. 3. 25.(수) 정기점검 전", 22)}

      <div style={{ position: "absolute", left: 950, top: 1320, width: 1100, height: 660, ...frameBox(frames.banner, 24) }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 42, textAlign: "center", fontSize: 32, fontWeight: 800, color: catCol, letterSpacing: "0.06em" }}>─◆ 4/5단계 갑옷 제련석 ◆─</div>
        {recipeRow(130, "제련석 3단계(갑옷)", "영웅의 갑옷 제련석 상자", "4단계 제련석(갑옷): AC")}
        {recipeRow(400, "제련석 4단계(갑옷)", "영웅의 갑옷 제련석 상자", "5단계 제련석(갑옷): AC")}
      </div>
      {pill(1290, 2040, 420, 92, 28, "제작 이벤트 자세히 보기")}

      {/* ② 패키지 — 배지 → 타이틀 → 패키지 카드(상자/가격/구매) */}
      {badge(2250, "전서버")}
      {gtitle(2325, 60, "제련석 패키지")}
      <div style={{ position: "absolute", left: 1120, top: 2430, width: 760, height: 440, ...frameBox(frames.bonus, 24) }}>
        {!pkgF && <div style={{ position: "absolute", left: 270, top: 30, width: 220, height: 150, borderRadius: 14, background: hxA(t.accent, 0.28), border: `2px dashed ${frameCol}` }} />}
        <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", fontSize: 30, fontWeight: 700, color: note }}>［패키지명］</div>
        <div style={{ position: "absolute", left: 260, top: 252, width: 240, height: 52, borderRadius: 26, border: `2px solid ${catCol}`, background: hxA(t.panel, 0.7), display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 24, fontWeight: 800, color: catCol }}>￦ 45,000</div>
        <div style={{ position: "absolute", left: 230, top: 320, width: 300, height: 66, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: 33, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>구매하기</div>
      </div>

      {/* ③ 메달 교환 — 주간 한정 교환 섹션 ([메달] → 교환 → [상자]) */}
      {badge(2990, "본서버 · 상시")}
      {gtitle(3062, 60, "용맹의 메달로 제련석 교환")}
      {subT(3160, "주간 5개 한정! 용맹의 메달을 제련석 상자로 교환하세요.", 22)}
      <div style={{ position: "absolute", left: 950, top: 3230, width: 1100, height: 300, ...frameBox(frames.banner, 24) }}>
        {slot(240, 55, 170, "용맹의 메달", "×50")}
        <div style={{ position: "absolute", left: 480, top: 107, width: 150, height: 62, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>교환</div>
        {slot(700, 45, 190, "영웅의 제련석 상자", "×1", true)}
      </div>
    </div>
  );
}

/* ── 주문서형 부품 미리보기 ──────────────────────────────────────────────────
   보호 주문서/장신구 마법주문서 레퍼런스 공통 문법: 리본 배지 → 그라데이션 타이틀 →
   큰 컨테이너(마름모 슬롯 레시피 [재료]+[재료]→확정 제작→[결과]) → CTA → 패키지 카드 2장 나란히. */
function ScrollParts({ theme, frames = {} }) {
  const t = theme.tokens;
  const frameCol = shade(t.panel, 42);
  const note = t.textLight || "#F3E4BC";
  const catCol = t.accent || "#E2DC9D";
  const tTop = t.titleTop || t.title, tBot = t.titleBottom || t.accent;
  const btnBg = `linear-gradient(180deg, ${t.btnTop || t.primary}, ${t.btnBottom || t.primary})`;
  const btnBorder = t.btnBorder || t.primary;
  const slotF = !!frames.product, pkgF = !!frames.bonus;
  const frameBox = (src, r) => src
    ? { backgroundImage: `url(${src})`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }
    : { background: hxA(t.panel, 0.72), border: `3px solid ${frameCol}`, borderRadius: r };

  const gtitle = (y, size, text) => (
    <div style={{ position: "absolute", left: 0, width: KV_W, top: y, textAlign: "center", fontWeight: 800, fontSize: size,
      backgroundImage: `linear-gradient(180deg, ${tTop} 13%, ${tBot} 97%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}>{text}</div>
  );
  const subT = (y, text, size = 22) => <div style={{ position: "absolute", left: 0, width: KV_W, top: y, textAlign: "center", fontSize: size, color: note }}>{text}</div>;
  // 리본형 섹션 배지 (EVENT 1 / 본 서버 전용) — 주문서 페이지 시그니처
  const ribbon = (y, text) => (
    <div style={{ position: "absolute", left: 0, width: KV_W, top: y, display: "flex", justifyContent: "center" }}>
      <span style={{ padding: "8px 46px", border: `2px solid ${catCol}`, background: hxA(t.panel, 0.85), color: catCol, fontSize: 24, fontWeight: 800, letterSpacing: "0.14em", clipPath: "polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)" }}>{text}</span>
    </div>
  );
  // 마름모(다이아) 아이템 슬롯 — 프레임 이미지가 있으면 그대로, 없으면 45° 회전 사각 placeholder.
  const dslot = (x, y, s, name, count, hero) => (
    <div style={{ position: "absolute", left: x, top: y, width: s, height: s }}>
      {slotF ? (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${frames.product})`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", ...(hero ? { filter: `drop-shadow(0 0 22px ${hxA(t.accent, 0.55)})` } : {}) }} />
      ) : (
        <div style={{ position: "absolute", left: "13%", top: "13%", width: "74%", height: "74%", transform: "rotate(45deg)", background: hxA(t.panel, 0.85), border: `3px solid ${hero ? catCol : frameCol}`, borderRadius: 12, boxShadow: hero ? `0 0 30px ${hxA(t.accent, 0.5)}` : "none" }} />
      )}
      {count && <div style={{ position: "absolute", right: 2, bottom: 2, fontSize: 22, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{count}</div>}
      {name && <div style={{ position: "absolute", left: -50, right: -50, top: s + 8, textAlign: "center", fontSize: 18, lineHeight: 1.35, color: hero ? catCol : note, wordBreak: "keep-all" }}>{name}</div>}
    </div>
  );
  // 레시피 행 (컨테이너 1100 내부 상대 좌표) — [재료]+[재료]→확정 제작→[결과]
  const recipeRow = (y, m1, m2, res) => (
    <div style={{ position: "absolute", left: 0, top: y, width: "100%", height: 260 }}>
      {dslot(105, 0, 180, m1, "×1")}
      <div style={{ position: "absolute", left: 300, top: 58, fontSize: 48, color: note, fontWeight: 700 }}>＋</div>
      {dslot(360, 0, 180, m2, "×10")}
      <div style={{ position: "absolute", left: 585, top: 58, width: 165, height: 62, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>확정 제작</div>
      {dslot(795, -10, 200, res, "×1", true)}
    </div>
  );
  // 패키지 카드 (530 폭) — 상자/패키지명/가격/구매
  const pkgCard = (x, name) => (
    <div style={{ position: "absolute", left: x, top: 2500, width: 530, height: 470, ...frameBox(frames.bonus, 20) }}>
      {!pkgF && <div style={{ position: "absolute", left: 175, top: 34, width: 180, height: 130, borderRadius: 12, background: hxA(t.accent, 0.28), border: `2px dashed ${frameCol}` }} />}
      <div style={{ position: "absolute", left: 0, right: 0, top: 190, textAlign: "center", fontSize: 27, fontWeight: 700, color: note }}>{name}</div>
      <div style={{ position: "absolute", left: 155, top: 244, width: 220, height: 50, borderRadius: 25, border: `2px solid ${catCol}`, background: hxA(t.panel, 0.7), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, fontWeight: 800, color: catCol }}>￦ 99,000</div>
      <div style={{ position: "absolute", left: 130, top: 312, width: 270, height: 62, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: 31, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>구매하기</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 398, textAlign: "center", fontSize: 19, color: note, opacity: 0.85 }}>구성품 · ［주문서 ×N］</div>
    </div>
  );

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: KV_W, height: PAGE_H, pointerEvents: "none", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* ① 제작 이벤트 — 리본 배지 → 타이틀 → 기간 → 마름모 레시피 컨테이너 (콘텐츠 1100 = x950~2050) */}
      {ribbon(1050, "본 서버 전용")}
      {gtitle(1135, 72, "＋10 확정 제작 기회!")}
      {subT(1252, "이벤트 기간 : 2026. 1. 21.(수) 정기점검 후 ~ 2026. 1. 28.(수) 정기점검 전", 22)}

      <div style={{ position: "absolute", left: 950, top: 1320, width: 1100, height: 700, ...frameBox(frames.banner, 24) }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 42, textAlign: "center", fontSize: 32, fontWeight: 800, color: catCol, letterSpacing: "0.06em" }}>─❖ 축복받은 장신구 마법주문서 ❖─</div>
        {recipeRow(140, "＋9 축복받은 반지", "축복받은 장신구 마법주문서", "＋10 축복받은 반지")}
        {recipeRow(430, "＋9 축복받은 귀걸이", "축복받은 장신구 마법주문서", "＋10 축복받은 귀걸이")}
      </div>
      <div style={{ position: "absolute", left: 1290, top: 2080, width: 420, height: 92, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: 46, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}>확률 세부 사항 보기</div>

      {/* ② 패키지 — 리본 → 타이틀 → 패키지 카드 2장 나란히 */}
      {ribbon(2290, "패키지")}
      {gtitle(2368, 60, "오림의 주문서 패키지")}
      {pkgCard(950, "［스페셜 패키지］")}
      {pkgCard(1520, "［확정 패키지］")}

      {/* ③ 조각 제작 — 미니 레시피 */}
      {gtitle(3072, 44, "─ 오림의 조각 제작 ─")}
      <div style={{ position: "absolute", left: 950, top: 3160, width: 1100, height: 340, ...frameBox(frames.banner, 20) }}>
        {recipeRow(50, "오림의 조각", "영웅의 제련석 상자", "축복받은 마법주문서")}
      </div>
    </div>
  );
}

/* ── 브랜드웹 공통 요소 ──────────────────────────────────────────────────────
   CNB(상단 글로벌 바) — 햄버거 + 게임 로고 + 로그인/회원가입 (L2M 레퍼런스 cng.png 구조). */
function CnbBar({ t }) {
  const note = t.textLight || "#F3E4BC";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 54, background: "rgba(8,8,10,0.55)", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 28px", gap: 20, boxSizing: "border-box" }}>
      {/* 햄버거 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 20, height: 2, background: hxA(note, 0.85) }} />)}
      </div>
      {/* 게임 로고 자리 */}
      <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "0.3em", color: note, fontFamily: "'Teko', sans-serif" }}>［게임 로고］</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 13, color: hxA(note, 0.85) }}>로그인</span>
      <span style={{ fontSize: 11, color: hxA(note, 0.35) }}>|</span>
      <span style={{ fontSize: 13, color: hxA(note, 0.85) }}>회원가입</span>
    </div>
  );
}

// 좌측 메뉴 — 메인/서브 공통(동일 위치·리스트), activeIdx 로 현재 페이지 강조.
const BW_MENU = ["ETERNAL BOND : 도원결의", "사전예약 이벤트", "신서버 업데이트", "성장 이벤트", "콜라보레이션", "쿠폰 등록"];
function LeftMenu({ t, activeIdx = 0 }) {
  const note = t.textLight || "#F3E4BC";
  const catCol = t.accent || "#E2DC9D";
  return (
    <div style={{ position: "absolute", left: 36, top: 340, width: 300, display: "flex", flexDirection: "column", gap: 20 }}>
      {BW_MENU.map((m, i) => {
        const on = i === activeIdx;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: on ? 17 : 15, fontWeight: on ? 800 : 500, color: on ? catCol : note, opacity: on ? 1 : 0.82, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? catCol : hxA(note, 0.5), flexShrink: 0 }} />
            {m}
          </div>
        );
      })}
    </div>
  );
}
// 우상단 유틸 버튼 (공유/홈) — 메인/서브 공통.
function UtilButtons({ t }) {
  const note = t.textLight || "#F3E4BC";
  return (
    <div style={{ position: "absolute", top: 72, right: 28, display: "flex", gap: 8 }}>
      {["⇱", "⌂"].map((g, i) => (
        <span key={i} style={{ width: 34, height: 34, borderRadius: 7, background: "rgba(8,8,10,0.5)", border: "1px solid rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: hxA(note, 0.85) }}>{g}</span>
      ))}
    </div>
  );
}

/* ── 브랜드웹 메인(히어로) 부품 미리보기 ─────────────────────────────────────
   CNB + 좌측 메뉴 + 날짜(배경 라인·엠블럼) + 중앙 버튼(frames.product 교체 가능)
   + 스토어 아이콘 + 스크롤 다운 (L2M 레퍼런스 요소). 타이틀은 레이어/임시 텍스트 담당. */
function BrandwebParts({ theme, frames = {}, dateText, buttonText }) {
  const t = theme.tokens;
  const note = t.textLight || "#F3E4BC";
  const catCol = t.accent || "#E2DC9D";
  const btnBg = `linear-gradient(180deg, ${t.btnTop || t.primary}, ${t.btnBottom || t.primary})`;
  const btnBorder = t.btnBorder || t.primary;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <CnbBar t={t} />
      <UtilButtons t={t} />
      <LeftMenu t={t} activeIdx={0} />
      {/* 날짜 배경 — 수평 라인 + 중앙 엠블럼(다이아) (날짜배경.png 구조) */}
      <div style={{ position: "absolute", left: 560, top: 636, width: 800, height: 1, background: `linear-gradient(90deg, transparent, ${hxA(catCol, 0.75)}, transparent)` }} />
      <div style={{ position: "absolute", left: 949, top: 626, width: 22, height: 22, transform: "rotate(45deg)", background: hxA(catCol, 0.25), border: `1.5px solid ${hxA(catCol, 0.8)}` }} />
      {/* 날짜 — 우측 패널 '날짜' 입력으로 수정 (비우면 샘플) */}
      <div style={{ position: "absolute", left: 0, width: 1920, top: 662, textAlign: "center", fontSize: 34, fontWeight: 600, letterSpacing: "0.24em", color: note, textShadow: "0 1px 6px rgba(0,0,0,0.6)", whiteSpace: "pre-wrap" }}>{dateText?.trim() || "2026. 3. 25. GRAND OPEN"}</div>
      {/* 중앙 버튼 — 박스 프레임(frames.product, 텍스트 없는 프레임) + 버튼 텍스트 오버레이.
          프레임이 없으면 테마 버튼 + 텍스트. */}
      {frames.product ? (
        <>
          <img src={frames.product} alt="cta" style={{ position: "absolute", left: 800, top: 728, width: 320, height: 104, objectFit: "contain" }} />
          <div style={{ position: "absolute", left: 800, top: 728, width: 320, height: 104, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: note, textShadow: "0 1px 4px rgba(0,0,0,0.7)", letterSpacing: "0.06em" }}>{buttonText?.trim() || "사전예약"}</div>
        </>
      ) : (
        <div style={{ position: "absolute", left: 806, top: 736, width: 308, height: 88, background: btnBg, border: `2px solid ${btnBorder}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.5)", boxShadow: `0 8px 26px ${hxA(t.primary, 0.4)}` }}>{buttonText?.trim() || "사전예약"}</div>
      )}
      {/* 스토어 아이콘 (구글/애플/원스토어 자리) */}
      <div style={{ position: "absolute", left: 0, width: 1920, top: 905, display: "flex", justifyContent: "center", gap: 14 }}>
        {["▶", "", "1"].map((g, i) => (
          <span key={i} style={{ width: 44, height: 44, borderRadius: 10, background: hxA(t.panel, 0.9), border: `1.5px solid ${hxA(note, 0.35)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: hxA(note, 0.85) }}>{g}</span>
        ))}
      </div>
      {/* 스크롤 다운 — V 셰브론 (스크롤다운.png) */}
      <div style={{ position: "absolute", left: 0, width: 1920, top: 1006, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        {[0.9, 0.45].map((op, i) => (
          <span key={i} style={{ width: 26, height: 26, borderRight: `3px solid ${hxA(catCol, op)}`, borderBottom: `3px solid ${hxA(catCol, op)}`, transform: "rotate(45deg)", marginTop: i ? -20 : 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ── 브랜드웹 서브 페이지 부품 미리보기 ──────────────────────────────────────
   L2M 서브 샘플(사전예약/신서버/페이백) 공통 구조:
   CNB + 좌측 메뉴(메인 동일, 현재 항목 강조) + 중앙 타이틀(y≈190, 레이어 담당)
   → 서브카피 → 데코 라인+엠블럼 → 날짜 → 리본 헤더 콘텐츠 박스 2장 → 안내문 + pill 버튼 2개. */
function BrandwebSubParts({ theme, frames = {}, dateText }) {
  const t = theme.tokens;
  const note = t.textLight || "#F3E4BC";
  const catCol = t.accent || "#E2DC9D";
  const frameCol = shade(t.panel, 42);
  // 리본 헤더 달린 콘텐츠 박스 — frames.banner 업로드 시 프레임 교체.
  const contentBox = (x, header) => (
    <div key={x} style={{ position: "absolute", left: x, top: 458, width: 460, height: 300 }}>
      {frames.banner ? (
        <img src={frames.banner} alt="box" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: hxA(t.panel, 0.82), border: `2px solid ${frameCol}` }} />
      )}
      {/* 리본 헤더 (샘플의 '전체 서버 공통 보상' 리본) */}
      <div style={{ position: "absolute", left: 100, top: -19, width: 260, height: 40, background: hxA(shade(t.panel, -20), 0.95), border: `1.5px solid ${hxA(catCol, 0.7)}`, clipPath: "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: note }}>{header}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center", fontSize: 18, color: hxA(note, 0.6) }}>［보상/콘텐츠 영역］</div>
    </div>
  );
  // 하단 pill 버튼 (유의사항/쿠폰 조회)
  const pillBtn = (x, label) => (
    <div key={label} style={{ position: "absolute", left: x, top: 878, width: 152, height: 46, clipPath: "polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)", background: hxA(shade(t.panel, -18), 0.92), border: `1.5px solid ${hxA(catCol, 0.65)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: note }}>{label}</div>
  );
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <CnbBar t={t} />
      <UtilButtons t={t} />
      <LeftMenu t={t} activeIdx={1} />
      {/* 서브카피 자리 → 데코 라인 + 엠블럼 (서브카피 아래) */}
      <div style={{ position: "absolute", left: 0, width: 1920, top: 333, textAlign: "center", fontSize: 21, color: hxA(note, 0.9), textShadow: "0 1px 5px rgba(0,0,0,0.6)" }}>［서브카피 — 페이지 설명 한 줄］</div>
      <div style={{ position: "absolute", left: 660, top: 381, width: 600, height: 1, background: `linear-gradient(90deg, transparent, ${hxA(catCol, 0.75)}, transparent)` }} />
      <div style={{ position: "absolute", left: 951, top: 372, width: 18, height: 18, transform: "rotate(45deg)", background: hxA(catCol, 0.25), border: `1.5px solid ${hxA(catCol, 0.8)}` }} />
      {/* 날짜 — 우측 패널 '날짜' 입력으로 수정 (비우면 샘플) */}
      <div style={{ position: "absolute", left: 0, width: 1920, top: 402, textAlign: "center", fontSize: 26, fontWeight: 600, letterSpacing: "0.1em", color: catCol, textShadow: "0 1px 5px rgba(0,0,0,0.6)", whiteSpace: "pre-wrap" }}>{dateText?.trim() || "2026. 3. 11.(수) 12:00 ~ 3. 24.(화) 23:59"}</div>
      {/* 콘텐츠 박스 2장 나란히 (리본 헤더) */}
      {contentBox(480, "［섹션 헤더 A］")}
      {contentBox(980, "［섹션 헤더 B］")}
      {/* 하단 안내문 + pill 버튼 2개 */}
      <div style={{ position: "absolute", left: 0, width: 1920, top: 822, textAlign: "center", fontSize: 17, color: hxA(note, 0.75) }}>참여 보상에 대한 자세한 내용은 공지사항에서 확인할 수 있습니다.</div>
      {pillBtn(795, "유의사항")}
      {pillBtn(973, "쿠폰 조회")}
    </div>
  );
}

/* ── 레이아웃 레지스트리 ── */
export const PROMO_LAYOUTS = {
  osangseu: {
    key: "osangseu",
    label: "오상스형 (블소)",
    canvas: { w: 3000, h: 3620, exportH: 1688 },
    defaultFadeStart: 62,
    safeWidths: [1920, 1100],
    layerLabels: { bgImage: "배경 이미지", female: "좌측 캐릭터", male: "우측 캐릭터", title: "타이틀" },
    frameSlots: [
      { key: "product", label: "상품 카드" },
      { key: "banner", label: "신석 현황" },
      { key: "bonus", label: "보너스 선물" },
      { key: "mobile", label: "모바일" },
    ],
    // Figma 문서 기준 가이드 영역(페이지 3000×3620 좌표) — 표시 전용.
    guideDefs: [
      { id: "title",   label: "타이틀",      color: "#FFD166", rect: { x: 950,  y: 300,  w: 1100, h: 400 } },
      { id: "female",  label: "좌측 캐릭터", color: "#FF7675", rect: { x: 620,  y: 240,  w: 840,  h: 1400 } },
      { id: "male",    label: "우측 캐릭터", color: "#74B9FF", rect: { x: 1560, y: 220,  w: 840,  h: 1420 } },
      { id: "date",    label: "날짜",        color: "#55EFC4", rect: { x: 900,  y: 760,  w: 1200, h: 110 } },
      { id: "product", label: "상품",        color: "#A29BFE", rect: { x: 800,  y: 1000, w: 1400, h: 660 } },
    ],
    Parts: OsangseuParts,
  },
  refine: {
    key: "refine",
    label: "제련석형 (리니지)",
    canvas: { w: 3000, h: 3620, exportH: 1688 },
    defaultFadeStart: 62,
    safeWidths: [1920, 1100], // 상단 이미지(KV 요소)는 1920 안, 콘텐츠(텍스트·부품)는 1100 안
    layerLabels: { bgImage: "배경 이미지", female: "좌측 캐릭터", male: "우측 캐릭터", title: "타이틀" },
    frameSlots: [
      { key: "product", label: "아이템 슬롯" },
      { key: "banner", label: "섹션 컨테이너" },
      { key: "bonus", label: "패키지 카드" },
      { key: "mobile", label: "모바일" },
    ],
    // 타이틀·캐릭터 위치는 오상스 기준으로 통일. 서브카피/기간/탭만 제련석 고유(타이틀 아래 순차).
    guideDefs: [
      { id: "title",  label: "타이틀",       color: "#FFD166", rect: { x: 950,  y: 300, w: 1100, h: 400 } },
      { id: "female", label: "좌측 캐릭터",  color: "#FF7675", rect: { x: 620,  y: 240, w: 840,  h: 1400 } },
      { id: "male",   label: "우측 캐릭터",  color: "#74B9FF", rect: { x: 1560, y: 220, w: 840,  h: 1420 } },
      { id: "sub",    label: "서브카피",     color: "#55EFC4", rect: { x: 1050, y: 720, w: 900,  h: 120 } },
      { id: "date",   label: "기간",         color: "#A29BFE", rect: { x: 1100, y: 860, w: 800,  h: 90 } },
      { id: "tabs",   label: "탭 버튼",      color: "#E17055", rect: { x: 1150, y: 970, w: 700,  h: 120 } },
    ],
    Parts: RefineParts,
  },
  scroll: {
    key: "scroll",
    label: "주문서형 (리니지)",
    canvas: { w: 3000, h: 3620, exportH: 1688 },
    defaultFadeStart: 62,
    safeWidths: [1920, 1100],
    layerLabels: { bgImage: "배경 원화 (전체)", female: "좌측 캐릭터", male: "우측 캐릭터", title: "타이틀" },
    frameSlots: [
      { key: "product", label: "아이템 슬롯 (마름모)" },
      { key: "banner", label: "섹션 컨테이너" },
      { key: "bonus", label: "패키지 카드" },
      { key: "mobile", label: "모바일" },
    ],
    // 타이틀·캐릭터 위치는 오상스 기준으로 통일. 서브카피/기간/탭만 주문서 고유(타이틀 아래 순차).
    guideDefs: [
      { id: "title",  label: "타이틀",              color: "#FFD166", rect: { x: 950,  y: 300, w: 1100, h: 400 } },
      { id: "female", label: "좌측 캐릭터",         color: "#FF7675", rect: { x: 620,  y: 240, w: 840,  h: 1400 } },
      { id: "male",   label: "우측 캐릭터",         color: "#74B9FF", rect: { x: 1560, y: 220, w: 840,  h: 1420 } },
      { id: "sub",    label: "서브카피",            color: "#55EFC4", rect: { x: 1050, y: 720, w: 900,  h: 120 } },
      { id: "date",   label: "기간",                color: "#A29BFE", rect: { x: 1100, y: 860, w: 800,  h: 90 } },
      { id: "tabs",   label: "탭 (본서버/특화서버)", color: "#E17055", rect: { x: 1150, y: 970, w: 700,  h: 120 } },
    ],
    Parts: ScrollParts,
  },
  // 브랜드웹 히어로 3케이스 — 공통(1920×1080, 페이드 없음, 좌측 메뉴/날짜/버튼)에 캐릭터 구성만 다름.
  ...(() => {
    const BW_BASE = {
      canvas: { w: 1920, h: 1080, exportH: 1080 },
      defaultFadeStart: 100, // 히어로는 하단 페이드 없음
      safeWidths: [],
      frameSlots: [
        { key: "product", label: "중앙 버튼" },
        { key: "banner", label: "콘텐츠 박스" },
        { key: "bonus", label: "배지/팝업" },
        { key: "mobile", label: "모바일" },
      ],
      Parts: BrandwebParts,
    };
    // 도원결의 히어로 실측 비율 — 타이틀 중앙, 날짜/버튼 그 아래, 좌측 메뉴 리스트 (공통 가이드).
    const BW_COMMON_GUIDES = [
      { id: "title",  label: "타이틀",     color: "#FFD166", rect: { x: 560, y: 170, w: 800, h: 450 } },
      { id: "date",   label: "날짜",       color: "#A29BFE", rect: { x: 660, y: 640, w: 600, h: 70 } },
      { id: "button", label: "버튼",       color: "#E17055", rect: { x: 806, y: 730, w: 308, h: 95 } },
      { id: "menu",   label: "좌측 메뉴",  color: "#55EFC4", rect: { x: 30,  y: 330, w: 310, h: 420 } },
    ];
    return {
      brandwebBgOnly: {
        ...BW_BASE, key: "brandwebBgOnly",
        label: "브랜드웹 — 전체 배경만",
        layerLabels: { bgImage: "전체 배경 (1920×1080)", female: "보조 요소 (좌)", male: "보조 요소 (우)", title: "타이틀" },
        guideDefs: BW_COMMON_GUIDES,
      },
      brandwebCenter: {
        ...BW_BASE, key: "brandwebCenter",
        label: "브랜드웹 — 배경 + 중앙 캐릭터",
        layerLabels: { bgImage: "전체 배경 (1920×1080)", female: "중앙 캐릭터", male: "보조 요소", title: "타이틀" },
        guideDefs: [
          ...BW_COMMON_GUIDES,
          { id: "female", label: "중앙 캐릭터", color: "#FF7675", rect: { x: 660, y: 100, w: 600, h: 980 } },
        ],
      },
      brandweb: {
        ...BW_BASE, key: "brandweb",
        label: "브랜드웹 — 배경 + 좌우 캐릭터",
        layerLabels: { bgImage: "전체 배경 (1920×1080)", female: "좌측 캐릭터", male: "우측 캐릭터", title: "타이틀" },
        guideDefs: [
          ...BW_COMMON_GUIDES,
          { id: "female", label: "좌측 캐릭터", color: "#FF7675", rect: { x: 60,  y: 60, w: 620, h: 960 } },
          { id: "male",   label: "우측 캐릭터", color: "#74B9FF", rect: { x: 1240, y: 60, w: 620, h: 960 } },
        ],
      },
      // 서브 페이지 — CNB + 좌측 메뉴(메인 동일) + 중앙 타이틀 + 콘텐츠 박스 2장 (서브/서브2 공용, 세션은 분리)
      // L2M 서브 샘플 실측: 타이틀 y190~310, 서브카피 y333, 라인 y381, 날짜 y402, 박스 y458~758, 하단 버튼 y878.
      brandwebSub: {
        ...BW_BASE, key: "brandwebSub",
        label: "브랜드웹 — 서브 페이지",
        layerLabels: { bgImage: "전체 배경 (1920×1080)", female: "보조 요소 (좌)", male: "보조 요소 (우)", title: "페이지 타이틀" },
        guideDefs: [
          { id: "marginTop", label: "상단 여백 (CNB→타이틀 136)", color: "#9aa0aa", rect: { x: 360, y: 54,  w: 1200, h: 136 } },
          { id: "title",     label: "페이지 타이틀",              color: "#FFD166", rect: { x: 560, y: 190, w: 800,  h: 120 } },
          { id: "sub",       label: "서브카피",                   color: "#55EFC4", rect: { x: 660, y: 322, w: 600,  h: 44 } },
          { id: "date",      label: "날짜",                       color: "#A29BFE", rect: { x: 710, y: 396, w: 500,  h: 44 } },
          { id: "content",   label: "콘텐츠 영역",                color: "#E17055", rect: { x: 480, y: 458, w: 960,  h: 300 } },
          { id: "menu",      label: "좌측 메뉴",                  color: "#55EFC4", rect: { x: 30,  y: 330, w: 310,  h: 430 } },
          { id: "marginBottom", label: "하단 여백 (버튼→끝 156)", color: "#9aa0aa", rect: { x: 360, y: 924, w: 1200, h: 156 } },
        ],
        Parts: BrandwebSubParts,
      },
    };
  })(),
};

// 영역(프로모션/브랜드웹 페이지)별 사용 가능한 레이아웃 — 페이지 구성 피커 필터.
// 브랜드웹은 페이지 단위(메인/서브/서브2)로 area 가 나뉜다.
export const AREA_LAYOUTS = {
  promo: ["osangseu", "refine", "scroll"],
  brandweb: ["brandwebBgOnly", "brandwebCenter", "brandweb"],
  "brandweb-sub": ["brandwebSub"],
  "brandweb-sub2": ["brandwebSub"],
};

// 프로모션 → 기본 레이아웃. doc 에 layout 필드가 있으면 우선, 없으면 영역/게임/id 로 추정.
export function defaultLayoutFor(promotion, area = "promo") {
  if (area === "brandweb") return "brandweb";
  if (area === "brandweb-sub" || area === "brandweb-sub2") return "brandwebSub";
  if (!promotion) return "osangseu";
  if (promotion.layout && PROMO_LAYOUTS[promotion.layout]) return promotion.layout;
  const id = promotion.id || "", game = promotion.game || "";
  if (id.startsWith("lineage") || game.includes("리니지")) return "refine";
  return "osangseu";
}
