// 2560 캔버스 위에 렌더되는 프로모션 페이지.
// hero 영역은 단일 이미지(single) / 분리 슬롯(composed) 모드 분기.
// 하단 섹션은 각각 imageOverride 가 있으면 통째 이미지로 대체.
import {
  Gift, Diamond, Package, Coins, Sparkles, Shirt, Gem, Crown, Search, Megaphone,
  User, Cat, Maximize2,
} from "lucide-react";
import {
  CANVAS_W, CONTENT_W, CONTENT_X, H_HERO, u, hx, shade, DATA, PARTICLES,
} from "../constants/presets";

const ICONS = { gift: Gift, diamond: Diamond, box: Package, coins: Coins, sparkles: Sparkles, shirt: Shirt, gem: Gem, crown: Crown };

function framePanel({ tokens: t, variants: v }) {
  const r = u(t.radius);
  if (v.frame === "metal")
    return { background: hx(t.panel, 0.85), border: `${u(1)}px solid ${shade(t.accent, -20)}`, borderRadius: r, boxShadow: `inset 0 0 ${u(12)}px ${hx("#000000", 0.4)}` };
  if (v.frame === "flat")
    return { background: hx(t.panel, 0.6), border: `${u(1)}px solid ${hx(t.primary, 0.55)}`, borderRadius: r };
  return { background: hx(t.panel, 0.5), border: `${u(1.5)}px solid ${t.primary}`, borderRadius: r, boxShadow: `0 0 ${u(t.glow)}px ${hx(t.primary, 0.4)}, inset 0 0 ${u(t.glow + 4)}px ${hx(t.primary, 0.22)}` };
}
function btnStyle({ tokens: t, variants: v }) {
  const base = { borderRadius: 999, fontWeight: 500, textAlign: "center", letterSpacing: ".3px" };
  if (v.button === "metal")
    return { ...base, background: `linear-gradient(180deg, ${shade(t.primary, 8)}, ${shade(t.primary, -32)})`, border: `${u(1)}px solid ${t.accent}`, color: shade(t.accent, 55), textShadow: `0 1px 0 ${hx("#000000", 0.4)}` };
  if (v.button === "flat")
    return { ...base, background: t.primary, border: "none", color: shade(t.primary, -68) };
  return { ...base, background: `linear-gradient(180deg, ${shade(t.primary, 12)}, ${shade(t.primary, -30)})`, border: `${u(1)}px solid ${shade(t.accent, 25)}`, color: shade(t.primary, -68), textShadow: `0 1px 0 ${hx("#ffffff", 0.4)}`, boxShadow: `0 0 ${u(t.glow)}px ${hx(t.primary, 0.45)}` };
}
function Motif({ theme }) {
  const v = theme.variants.motif, c = theme.tokens.accent;
  if (v === "none") return null;
  if (v === "gem") return <Diamond size={u(14)} style={{ color: c, filter: `drop-shadow(0 0 ${u(4)}px ${hx(c, 0.7)})` }} />;
  return <span style={{ color: c, fontSize: u(15), textShadow: `0 0 ${u(8)}px ${hx(c, 0.6)}` }}>◇</span>;
}

// Hero (단일 이미지 모드) — NEXUS Preview 의 dim/vignette/bottomFade 패턴.
function HeroSingle({ hero, t }) {
  const bg = hero.singleImage
    ? { backgroundImage: `url(${hero.singleImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${t.bgTop}, ${t.bgMid})` };
  return (
    <div style={{ position: "relative", width: CANVAS_W, height: H_HERO, ...bg }}>
      {!hero.singleImage && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", opacity: 0.7 }}>
          <ImageIconLarge />
          <div style={{ fontSize: u(20), fontWeight: 700, marginTop: u(12), textShadow: `0 ${u(1)}px ${u(4)}px ${hx("#000000", 0.5)}` }}>상단 비주얼 이미지를 업로드하세요</div>
          <div style={{ fontSize: u(12), marginTop: u(6), opacity: 0.85 }}>배경 + 캐릭터 + 타이틀 + 날짜가 모두 포함된 합성 이미지 한 장</div>
        </div>
      )}
      {/* dim overlay */}
      {hero.dim > 0 && <div style={{ position: "absolute", inset: 0, background: "#000", opacity: hero.dim }} />}
      {/* vignette */}
      {hero.vignette > 0 && (
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 40%, ${hx("#000000", hero.vignette)} 100%)` }} />
      )}
      {/* bottom fade — 다음 섹션과 자연스럽게 연결 */}
      {hero.bottomFade > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${Math.round(hero.bottomFade * 100)}%`, background: `linear-gradient(180deg, transparent 0%, ${hero.fadeColor || t.bgMid} 100%)` }} />
      )}
    </div>
  );
}
function ImageIconLarge() {
  return (
    <svg width={u(40)} height={u(40)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// Hero (분리 슬롯 모드) — 기존 방식 + 표시 토글
function HeroComposed({ hero, assets, content, title, theme, onTitleDown, onResizeDown }) {
  const t = theme.tokens, v = theme.variants;
  const month = content.titleMonth || "";
  const titleShadow = `0 ${u(1)}px 0 ${shade(t.title, -60)}, 0 0 ${u(14)}px ${hx(t.accent, 0.5)}`;
  const bodyShadow = `0 ${u(1)}px ${u(4)}px ${hx("#003322", 0.5)}`;
  const particleColor = v.background === "field" ? "#F3FBE8" : v.background === "snow" ? "#FFFFFF" : v.background === "dark" ? hx(t.primary, 0.55) : null;

  const showBgImage = hero.showBackground && assets.bgImage;
  const heroBg = showBgImage
    ? { backgroundImage: `linear-gradient(180deg, ${hx(t.bgTop, 0.15)}, ${hx(t.bgMid, 0.7)}), url(${assets.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : hero.showBackground
      ? { background: `linear-gradient(180deg, ${shade(t.bgTop, 12)} 0%, ${t.bgMid} 100%)` }
      : { background: "transparent" };

  return (
    <div style={{ position: "relative", width: CANVAS_W, height: H_HERO, ...heroBg }}>
      {particleColor && !showBgImage && hero.showBackground && PARTICLES.map((p, i) => (
        <span key={i} style={{ position: "absolute", left: p.x, top: p.y, width: u(7), height: v.background === "field" ? u(11) : u(7), background: particleColor, borderRadius: v.background === "field" ? "60% 40% 60% 40%" : "50%", opacity: 0.7, transform: `rotate(${i * 37}deg)` }} />
      ))}

      {/* character art slots — 각각 표시 토글 */}
      {(hero.showChar1 || hero.showChar2) && (
        <div style={{ position: "absolute", left: CONTENT_X, top: u(40), width: CONTENT_W, height: u(150), display: "flex", gap: u(16) }}>
          {[
            { img: assets.heroChar1, show: hero.showChar1, Icon: User, label: "캐릭터 1" },
            { img: assets.heroChar2, show: hero.showChar2, Icon: Cat,  label: "캐릭터 2" },
          ].map((c, i) => {
            if (!c.show) return <div key={i} style={{ flex: 1 }} />;
            return c.img ? (
              <div key={i} style={{ flex: 1, borderRadius: u(10), overflow: "hidden", border: `${u(1)}px solid ${hx(t.textLight, 0.3)}` }}>
                <img src={c.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div key={i} style={{ flex: 1, border: `${u(1)}px dashed ${hx(t.textLight, 0.6)}`, borderRadius: u(10), background: hx(t.textLight, 0.12), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: u(5) }}>
                <c.Icon size={u(24)} color="#fff" />
                <span style={{ fontSize: u(11), color: "#fff" }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* DRAGGABLE TITLE */}
      {hero.showTitle && (
        <div onPointerDown={onTitleDown} style={{ position: "absolute", left: title.x, top: title.y, transform: `translate(-50%,-50%) scale(${title.scale})`, transformOrigin: "center", cursor: "grab", touchAction: "none", textAlign: "center" }}>
          <div style={{ position: "relative", padding: u(6), outline: `${u(1.5)}px dashed ${hx(t.accent, 0.8)}`, outlineOffset: u(8) }}>
            {assets.titleImage ? (
              <img src={assets.titleImage} alt="" style={{ height: u(110), display: "block", objectFit: "contain", pointerEvents: "none" }} />
            ) : (
              <h1 style={{ fontSize: u(34), fontWeight: 700, margin: 0, lineHeight: 1.12, color: t.title, textShadow: titleShadow, whiteSpace: "nowrap", pointerEvents: "none" }}>
                {month}<br />{content.titleMain}
              </h1>
            )}
            <div onPointerDown={onResizeDown} title="크기 조정" style={{ position: "absolute", right: -u(12), bottom: -u(12), width: u(22), height: u(22), borderRadius: u(6), background: "#10b981", border: `${u(2)}px solid #fff`, cursor: "nwse-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Maximize2 size={u(11)} color="#fff" />
            </div>
          </div>
        </div>
      )}

      {/* periods */}
      {hero.showDate && (
        <div style={{ position: "absolute", left: 0, width: CANVAS_W, top: H_HERO - u(96), textAlign: "center", color: t.textLight }}>
          <div style={{ fontSize: u(11), textShadow: bodyShadow }}>상품 판매 기간 : {content.sales}</div>
          <div style={{ fontSize: u(11), marginTop: u(4), textShadow: bodyShadow }}>보상 수령 기간 : {content.claim}</div>
        </div>
      )}
    </div>
  );
}

// 섹션 이미지 override — 통째 이미지로 대체. 비율은 width:CONTENT_W / height: auto.
function SectionImage({ src, alt }) {
  return (
    <div style={{ width: CONTENT_W, margin: "0 auto", padding: `${u(22)}px 0` }}>
      <img src={src} alt={alt} style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );
}

function ProductsSection({ theme, content, t, titleShadow, bodyShadow }) {
  const month = content.titleMonth || "";
  const Slot = ({ name, size }) => {
    const Ic = ICONS[name] || Gift;
    return (
      <div style={{ width: size, height: size, borderRadius: Math.min(u(12), u(t.radius) - u(4)), background: hx("#06231b", 0.65), border: `${u(1)}px solid ${hx(t.primary, 0.7)}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent }}>
        <Ic size={size * 0.46} />
      </div>
    );
  };
  return (
    <div style={{ width: CONTENT_W, margin: "0 auto", padding: `${u(22)}px 0 ${u(6)}px` }}>
      <h2 style={{ fontSize: u(21), fontWeight: 700, textAlign: "center", color: t.title, textShadow: titleShadow, margin: 0 }}>{month}의 스페셜 상품</h2>
      <p style={{ fontSize: u(12), textAlign: "center", margin: `${u(6)}px 0 0`, textShadow: bodyShadow }}>{DATA.subtitle}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: u(14), marginTop: u(18) }}>
        {DATA.products.map((p, i) => (
          <div key={i} style={{ ...framePanel(theme), padding: `${u(16)}px ${u(8)}px`, textAlign: "center" }}>
            <div style={{ position: "relative", width: u(54), margin: "0 auto" }}>
              <Slot name={p.icon} size={u(54)} />
              <span style={{ position: "absolute", right: -u(6), bottom: -u(6), width: u(22), height: u(22), borderRadius: "50%", background: `linear-gradient(180deg, ${shade(t.primary, 14)}, ${shade(t.primary, -30)})`, border: `${u(1)}px solid ${shade(t.accent, 25)}`, display: "flex", alignItems: "center", justifyContent: "center", color: shade(t.primary, -65) }}><Search size={u(12)} /></span>
            </div>
            <p style={{ fontSize: u(11), margin: `${u(12)}px 0 0`, lineHeight: 1.4 }}>{p.name[0]}<br />{p.name[1]}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: u(20) }}>
        <span style={{ ...btnStyle(theme), display: "inline-block", padding: `${u(11)}px ${u(30)}px`, fontSize: u(13) }}>전체 상품 자세히 보기</span>
      </div>
    </div>
  );
}

function BonusSection({ theme, content, t, v, titleShadow, bodyShadow }) {
  const month = content.titleMonth || "";
  return (
    <div style={{ width: CONTENT_W, margin: "0 auto", padding: `${u(26)}px 0 ${u(8)}px` }}>
      <h2 style={{ fontSize: u(22), fontWeight: 700, textAlign: "center", color: t.title, textShadow: titleShadow, margin: 0 }}>보너스 혜택</h2>
      <p style={{ fontSize: u(12), textAlign: "center", margin: `${u(6)}px 0 0`, textShadow: bodyShadow }}>{month} {DATA.bonusSub}</p>
      <div style={{ textAlign: "center", margin: `${u(24)}px 0 ${u(12)}px`, display: "flex", gap: u(8), alignItems: "center", justifyContent: "center" }}>
        <Motif theme={theme} /><span style={{ fontSize: u(17), fontWeight: 700, color: t.title, textShadow: titleShadow }}>신석 사용 현황</span><Motif theme={theme} />
      </div>
      {v.container === "scroll" ? (
        <div style={{ position: "relative", background: "linear-gradient(180deg,#F0F7F0,#D6E8DC)", border: `${u(1)}px solid ${shade(t.primary, 30)}`, borderRadius: u(8), padding: `${u(24)}px ${u(40)}px`, textAlign: "center", boxShadow: `0 0 ${u(16)}px ${hx(t.primary, 0.3)}` }}>
          <span style={{ position: "absolute", left: u(8), top: u(8), bottom: u(8), width: u(10), background: `linear-gradient(180deg,${shade(t.primary, 35)},${shade(t.primary, 5)})`, borderRadius: u(4) }} />
          <span style={{ position: "absolute", right: u(8), top: u(8), bottom: u(8), width: u(10), background: `linear-gradient(180deg,${shade(t.primary, 35)},${shade(t.primary, 5)})`, borderRadius: u(4) }} />
          <span style={{ fontSize: u(26), fontWeight: 700, color: shade(t.primary, -45) }}>{DATA.counter} <span style={{ fontSize: u(14) }}>개</span></span>
        </div>
      ) : (
        <div style={{ ...framePanel(theme), padding: `${u(22)}px ${u(24)}px`, textAlign: "center" }}>
          <span style={{ fontSize: u(26), fontWeight: 700, color: t.title, textShadow: titleShadow }}>{DATA.counter} <span style={{ fontSize: u(14), color: t.accent }}>개</span></span>
        </div>
      )}
      <p style={{ fontSize: u(11), marginTop: u(16), opacity: 0.92, textShadow: bodyShadow }}>※ 신석 사용 현황은 전일 00시 ~ 23시 59분 까지 사용한 내역을 당일 10시 이후에 확인할 수 있습니다.</p>
    </div>
  );
}

function MilestonesSection({ theme, t, titleShadow, bodyShadow }) {
  const Slot = ({ name, size }) => {
    const Ic = ICONS[name] || Gift;
    return (
      <div style={{ width: size, height: size, borderRadius: Math.min(u(12), u(t.radius) - u(4)), background: hx("#06231b", 0.65), border: `${u(1)}px solid ${hx(t.primary, 0.7)}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent }}>
        <Ic size={size * 0.46} />
      </div>
    );
  };
  return (
    <div style={{ width: CONTENT_W, margin: "0 auto", padding: `${u(22)}px 0 ${u(28)}px` }}>
      <div style={{ textAlign: "center", marginBottom: u(16), display: "flex", gap: u(8), alignItems: "center", justifyContent: "center" }}>
        <Motif theme={theme} /><span style={{ fontSize: u(18), fontWeight: 700, color: t.title, textShadow: titleShadow }}>획득 가능한 보너스 선물</span><Motif theme={theme} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: u(10) }}>
        {DATA.milestones.map((m, i) => (
          <div key={i} style={{ ...framePanel(theme), padding: `${u(12)}px ${u(6)}px`, textAlign: "center" }}>
            <div style={{ fontSize: u(11), color: t.accent, marginBottom: u(8) }}>{m.at} 누적 시</div>
            <div style={{ margin: "0 auto", width: u(54) }}><Slot name={m.icon} size={u(54)} /></div>
            <p style={{ fontSize: u(11), margin: `${u(8)}px 0`, lineHeight: 1.3 }}>{m.name}</p>
            <span style={{ ...(m.done ? { borderRadius: 999, background: hx("#000000", 0.35), color: hx(t.textLight, 0.7), border: `${u(1)}px solid ${hx(t.textLight, 0.25)}` } : btnStyle(theme)), display: "block", padding: `${u(6)}px 0`, fontSize: u(11) }}>{m.done ? "보상 완료" : "보상 받기"}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: u(11), textAlign: "center", marginTop: u(16), textShadow: bodyShadow }}>※ 보너스 보상은 아이템 별 계정당 1회만 획득 가능합니다.</p>
    </div>
  );
}

function FooterSection({ t }) {
  return (
    <div style={{ background: "#0E1714", padding: `${u(22)}px 0` }}>
      <div style={{ width: CONTENT_W, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: u(8), color: shade(t.primary, 30), fontSize: u(13), fontWeight: 500, marginBottom: u(10) }}><Megaphone size={u(15)} /> 필독! 주의사항</div>
        <div style={{ fontSize: u(11), color: "#A9B8B0", lineHeight: 1.9 }}>· 본 이벤트는 게임 이벤트 규약을 따릅니다.<br />· 신석 사용 현황은 전일 사용 내역을 당일 10시 이후 확인할 수 있습니다.<br />· 보너스 선물은 계정당 1회만 교환할 수 있습니다.</div>
      </div>
    </div>
  );
}

export default function PromoPage({ theme, content, assets, title, hero, sectionOverrides, sectionVisibility, onTitleDown, onResizeDown }) {
  const t = theme.tokens, v = theme.variants;
  const titleShadow = `0 ${u(1)}px 0 ${shade(t.title, -60)}, 0 0 ${u(14)}px ${hx(t.accent, 0.5)}`;
  const bodyShadow = `0 ${u(1)}px ${u(4)}px ${hx("#003322", 0.5)}`;

  return (
    <div style={{ width: CANVAS_W, background: `linear-gradient(180deg, ${t.bgTop} 0%, ${t.bgMid} 45%, ${t.bgBottom} 100%)`, fontFamily: "ui-sans-serif, system-ui", color: t.textLight }}>
      {/* ── HERO ── */}
      {hero.mode === "single"
        ? <HeroSingle hero={hero} t={t} />
        : <HeroComposed hero={hero} assets={assets} content={content} title={title} theme={theme} onTitleDown={onTitleDown} onResizeDown={onResizeDown} />
      }

      {/* ── PRODUCTS ── */}
      {sectionOverrides.productsImage
        ? <SectionImage src={sectionOverrides.productsImage} alt="스페셜 상품" />
        : sectionVisibility.products && <ProductsSection theme={theme} content={content} t={t} titleShadow={titleShadow} bodyShadow={bodyShadow} />
      }

      {/* ── BONUS ── */}
      {sectionOverrides.bonusImage
        ? <SectionImage src={sectionOverrides.bonusImage} alt="보너스 혜택" />
        : sectionVisibility.bonus && <BonusSection theme={theme} content={content} t={t} v={v} titleShadow={titleShadow} bodyShadow={bodyShadow} />
      }

      {/* ── MILESTONES ── */}
      {sectionOverrides.milestonesImage
        ? <SectionImage src={sectionOverrides.milestonesImage} alt="보너스 선물" />
        : sectionVisibility.milestones && <MilestonesSection theme={theme} t={t} titleShadow={titleShadow} bodyShadow={bodyShadow} />
      }

      {/* ── FOOTER ── */}
      {sectionOverrides.footerImage
        ? <SectionImage src={sectionOverrides.footerImage} alt="주의사항" />
        : sectionVisibility.footer && <FooterSection t={t} />
      }
    </div>
  );
}
