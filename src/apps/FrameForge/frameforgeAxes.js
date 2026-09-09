// FrameForge 완성형 옵션 축 · 프롬프트 빌더 · 브랜드웹 키트 — React/브라우저 의존 없음.
// 앱(index.jsx)·MCP 브릿지(frameforgeMcp.js)·스킬 런타임(skills-runtime/frameforgeSkill.js)이 모두 이 파일을 본다.
// 예전엔 index.jsx 와 frameforgeMcp.js 가 같은 실루엣 목록을 따로 들고 있어 한쪽만 고치면 앱과 MCP 결과가 달라졌다.
//
// 2026-09 브랜드웹 라이브러리 조사(리니지M/리니지/리니지2/리니지2M/리니지클래식/아이온2/TL 8종)로 확장:
//   - 용도 2종 추가: ornament(타이틀·섹션·내비 장식) / slot(아이템 슬롯·홀더)
//   - 실루엣 +48 (장식 엔드캡 CTA, 사이드 탭, 모달, 리스트 행, 코너 브래킷, 펜넌트, 밀랍 봉인, 타임라인, 바닥 링 등)
//   - 실루엣마다 ratio — 렌더 캔버스 비율. 전부 1:1 로 렌더돼 가로 버튼·디바이더 해상도가 낭비되던 문제 해결.
//   - 브랜드웹 톤 프리셋·무드 5종 (골드 헤어라인 / 백청 광휘 / 붉은 왕가 / 서리 은청 / 모던 네온)
//   - BRANDWEB_KITS — 같은 스타일 축을 공유하는 부품 세트를 한 번에 큐로 생성 (사이트 한 벌 자동화용)

export const COMPLETE_AXES = {
  assetType: {
    label:'사용 용도', pick:true,
    opts:[
      { key:'button', ko:'버튼', en:'an empty horizontal game menu button frame' },
      { key:'box', ko:'박스', en:'an empty game UI content box or panel frame' },
      { key:'frame', ko:'프레임', en:'an empty decorative game UI frame' },
      { key:'badge', ko:'배지', en:'an empty compact game UI badge frame' },
      { key:'divider', ko:'디바이더', en:'a single straight horizontal game UI divider line' },
      { key:'icon', ko:'아이콘', en:'a single standalone game UI icon glyph, no frame, no background plate' },
      // 브랜드웹 라이브러리 조사(2026-09)에서 빈도 높았던 두 부류 — 타이틀·섹션 장식과 아이템 슬롯.
      { key:'ornament', ko:'장식', en:'a standalone decorative ornament element for a game promotion website (title flourish, section rule ornament, corner set or navigation marker) with no frame, no box and no plate' },
      { key:'slot', ko:'아이템 슬롯', en:'an empty game UI item slot or holder frame whose center stays open for an item icon' },
    ],
  },
  preset: {
    label: '스타일',
    opts: [
      { key:'dragon_slayer', ko:'드래곤 슬레이어', en:'restrained dragon-slayer accents, abstract mirrored dragon cues localized only at the four corners' },
      { key:'royal_crest', ko:'왕가 문장', en:'fallen royal dynasty crest, crown-like heraldic ornaments and restrained fleur-de-lis details' },
      { key:'black_thorn', ko:'흑철 가시', en:'black iron thorn armor, blade-like spikes and severe gothic corner guards' },
      // "룬 문자" 직접 요청이 결과물에 실제 룬 글자를 만들던 원인 → 추상 기하 홈 패턴으로 재정의.
      { key:'ancient_rune', ko:'고대 각인', en:'ancient clan engraving style — abstract geometric groove patterns and notches carved into austere medieval metal border segments, evoking rune aesthetics WITHOUT any actual rune characters or letter-like symbols' },
      { key:'minimal_gold', ko:'미니멀 골드', en:'minimal luxury gold trim with one soft highlight and no figurative ornament' },
      { key:'soft_glow', ko:'소프트 글로우', en:'clean soft-glowing rim with rounded modern fantasy restraint' },
      { key:'parchment', ko:'양피지', en:'lightly aged parchment edge with simple folded corners and no dense decoration' },
      { key:'nature', ko:'자연 정령', en:'restrained leaf and spirit-light accents localized to two corners' },
      { key:'arcane', ko:'아케인 마법', en:'one subtle arcane glow line and a small central glowing geometric accent — an abstract shape, never a rune or character' },
      { key:'dark_minimal', ko:'다크 미니멀', en:'plain charcoal surface, precise thin border and almost no ornament' },
      { key:'modern_ui', ko:'모던 UI', en:'clean contemporary product-UI styling — flat calm surfaces, ONE restrained thin border line as the only decoration, generous negative space; explicitly NOT futuristic: no sci-fi glow, no neon, no holographic effects, no tech greebles, no angular chamfer patterns' },
      { key:'red_lacquer', ko:'붉은 칠기', en:'restrained deep-red lacquer with narrow aged-gold edge accents' },
      { key:'crystal', ko:'크리스탈', en:'clean translucent crystal rim with sparse controlled highlights' },
      // ─── 브랜드웹 톤 5종 — 리니지M/리니지/리니지2M(골드 헤어라인), 아이온2(백청 광휘), 리니지클래식(붉은 왕가), TL(서리 은청), 룩북(모던 네온)
      { key:'gold_hairline', ko:'브랜드웹 골드 헤어라인', en:'brand-web gold hairline — ultra-thin aged-gold hairline rails over a translucent charcoal surface, tiny corner ticks as the only decoration, calm and premium' },
      { key:'celestial', ko:'백청 광휘', en:'celestial light — pale silver-white rails with a soft cool cyan glow, sparse tiny sparkle accents, airy and luminous, no heavy metal' },
      { key:'crimson_royal', ko:'붉은 왕가', en:'crimson royal — deep crimson lacquer surfaces edged with a slim aged-gold hairline, small pointed accents at the ends, regal and severe' },
      { key:'frost_silver', ko:'서리 은청', en:'frost silver — cool matte silver hairline rails with a faint icy-blue glow, minimal ornament, quiet and modern-classic' },
      { key:'modern_neon', ko:'모던 네온 (룩북)', en:'modern neon lookbook — flat magenta-to-violet gradient surfaces, sharp diagonal cuts, no ornament, fashion-editorial flatness' },
    ],
  },
  silhouette: {
    label:'형태',
    opts:[
      { key:'button_hex_3', ratio:'21:9', for:['button'], ko:'뾰족 육각 3:1', en:'an elongated 3:1 pointed hexagon menu-button frame with sharp spear-tip ends' },
      { key:'button_hex_4', ratio:'21:9', for:['button'], ko:'뾰족 육각 4:1', en:'an ultra-wide 4:1 pointed hexagon button frame' },
      { key:'button_cut', ratio:'21:9', for:['button'], ko:'컷코너 버튼', en:'an elongated 3:1 button with precise clipped corners' },
      { key:'button_pill', ratio:'21:9', for:['button'], ko:'필 버튼', en:'a clean horizontal pill-shaped button' },
      { key:'button_stadium', ratio:'21:9', for:['button'], ko:'좌우 원형', en:'a wide stadium-shaped button frame whose left and right ends are perfect full semicircles — true capsule geometry with the end radius equal to half the button height, never just softly rounded corners' },
      { key:'button_round', ratio:'21:9', for:['button'], ko:'라운드 버튼', en:'a wide softly rounded rectangular button' },
      { key:'box_landscape', ratio:'16:9', for:['box'], ko:'가로 박스', en:'a wide landscape content box with a large usable interior' },
      { key:'box_square', ratio:'1:1', for:['box'], ko:'정사각 박스', en:'a square content box with a large usable interior' },
      { key:'box_portrait', ratio:'3:4', for:['box'], ko:'세로 박스', en:'a tall portrait content box with a large usable interior' },
      { key:'box_tab', ratio:'4:3', for:['box'], ko:'탭 박스', en:'a rectangular content box with one small integrated top tab' },
      { key:'box_banner', ratio:'3:4', for:['box'], ko:'행잉 박스', en:'a hanging banner-shaped content box with a pointed lower edge' },
      { key:'frame_wide', ratio:'16:9', for:['frame'], ko:'와이드 프레임', en:'a wide 16:9 decorative frame with a large open center' },
      { key:'frame_square', ratio:'1:1', for:['frame'], ko:'정사각 프레임', en:'a square decorative frame with a large open center' },
      { key:'frame_portrait', ratio:'3:4', for:['frame'], ko:'세로 프레임', en:'a portrait decorative frame with a large open center' },
      { key:'circle_plate', ratio:'1:1', for:['frame'], ko:'원형 장식 사각판', en:'a rectangular UI plate incorporating a circular medallion or round ornament' },
      { key:'perfect_circle', ratio:'1:1', for:['frame','badge'], ko:'완전한 원', en:'one mathematically perfect circular silhouette, equal width and height, with no square or rectangular backing plate' },
      { key:'oval', ratio:'4:3', for:['frame','badge'], ko:'타원형', en:'a wide oval frame with a clean center and no rectangular backing' },
      { key:'badge_shield', ratio:'1:1', for:['badge'], ko:'방패 배지', en:'a compact shield-shaped badge frame' },
      { key:'badge_hex', ratio:'1:1', for:['badge'], ko:'육각 배지', en:'a compact regular hexagonal badge frame' },
      { key:'badge_ribbon', ratio:'16:9', for:['badge'], ko:'리본 배지', en:'a compact ribbon-shaped badge frame' },
      { key:'divider_line', ratio:'21:9', for:['divider'], ko:'일직선', en:'one perfectly straight horizontal separator line' },
      // ─── 아이콘 (화살표 · 스크롤다운) ───
      { key:'icon_arrow_right', ratio:'1:1', for:['icon'], ko:'화살표 (오른쪽)', en:'a single bold arrow icon pointing right, clean triangular arrowhead with a short straight tail, instantly readable silhouette' },
      { key:'icon_arrow_down', ratio:'1:1', for:['icon'], ko:'화살표 (아래)', en:'a single bold arrow icon pointing straight down, clean triangular arrowhead with a short straight tail' },
      { key:'icon_arrow_back', ratio:'1:1', for:['icon'], ko:'화살표 (뒤로)', en:'a single bold back-arrow icon pointing left, clean triangular arrowhead with a short straight tail' },
      { key:'icon_scroll_down', ratio:'1:1', for:['icon'], ko:'스크롤 다운 (셰브론)', en:'a scroll-down indicator icon made of two stacked downward chevrons, the lower chevron slightly smaller and fainter, clean game UI style' },
      { key:'icon_scroll_mouse', ratio:'1:1', for:['icon'], ko:'스크롤 다운 (마우스)', en:'a scroll-down indicator icon: a slim rounded mouse outline with a small inner scroll dot and one downward chevron beneath it' },
      { key:'icon_chevron_down', ratio:'1:1', for:['icon'], ko:'셰브론 (아래)', en:'a single clean downward chevron icon with crisp mitered joints and consistent stroke weight' },
      { key:'icon_nav_prev', ratio:'1:1', for:['icon'], ko:'이동 (왼쪽)', en:'a single clean left-pointing navigation chevron icon for a previous/back UI control — one crisp mitered chevron with consistent stroke weight, no tail, instantly readable as "go left" in a carousel or pager' },
      { key:'icon_nav_next', ratio:'1:1', for:['icon'], ko:'이동 (오른쪽)', en:'a single clean right-pointing navigation chevron icon for a next/forward UI control — one crisp mitered chevron with consistent stroke weight, no tail, instantly readable as "go right" in a carousel or pager' },
      { key:'icon_play', ratio:'1:1', for:['icon'], ko:'재생 (플레이)', en:'a single media play icon — one clean right-pointing triangle, video play button glyph, crisp even edges' },
      { key:'icon_play_circle', ratio:'1:1', for:['icon'], ko:'영상 플레이 (원형)', en:'a video play button icon: a right-pointing play triangle centered inside a clean circular ring, classic media player play glyph, balanced and instantly readable' },
      // ─── 브랜드웹 조사 기반 추가 (2026-09) — 버튼 변형
      { key:'button_ornate_caps', ratio:'21:9', for:['button'], ko:'장식 엔드캡 CTA', en:'a wide 4:1 call-to-action button frame with a plain dark center bar and two mirrored sculpted ornamental end caps at the far left and right, slim top and bottom rails' },
      { key:'button_ribbon_arrow', ratio:'21:9', for:['button'], ko:'리본 화살촉 버튼', en:'a wide ribbon-shaped button whose left and right ends are cut into sharp swallow-tail arrow notches, slim rails and a flat center panel' },
      { key:'button_outline_pill', ratio:'21:9', for:['button'], ko:'아웃라인 필 (보조)', en:'a small secondary text button — a slim hairline-outlined pill with a translucent dark fill and no ornament, for short labels such as notice or coupon lookup' },
      { key:'button_side_tab', ratio:'3:4', for:['button'], ko:'사이드 플로팅 탭', en:'a vertical floating side tab that clings to the right screen edge — a tall narrow plate with a folded diamond-shaped left tip, an empty center for two short lines of text' },
      { key:'button_circle_icon', ratio:'1:1', for:['button'], ko:'원형 아이콘 버튼', en:'a small round icon button — one thin circular ring over a translucent dark disc with an empty center for a plus or arrow glyph' },
      { key:'button_pager', ratio:'21:9', for:['button'], ko:'페이지네이션 필', en:'a compact pagination pill with a slim outline, a small left-arrow zone and right-arrow zone at the two ends and an empty center for a page counter' },
      { key:'button_text_ends', ratio:'21:9', for:['button'], ko:'텍스트 링크 양끝 장식', en:'a minimal text-link treatment — two tiny mirrored decorative ticks at the far left and far right with a completely empty middle where a short label sits, no box and no fill' },
      // ─── 박스 변형
      { key:'box_modal', ratio:'4:3', for:['box'], ko:'모달 다이얼로그', en:'a modal dialog panel — a rectangular translucent dark panel with a slim border, a thin header rule near the top, a small empty square zone at the top-right corner for a close glyph and a large empty body' },
      { key:'box_list_row', ratio:'21:9', for:['box'], ko:'리스트 행', en:'a single horizontal list-row panel — a wide low rectangle with a slim border, a small square icon well at the left end and an empty text area on the right' },
      { key:'box_parchment_seal', ratio:'3:4', for:['box'], ko:'양피지 + 리본 봉인', en:'an aged parchment scroll panel with softly torn edges and one small red ribbon carrying a round wax seal centered on the top edge, large empty body' },
      { key:'box_card_portrait', ratio:'3:4', for:['box'], ko:'세로 카드 (상단 장식)', en:'a tall portrait card frame with slim rails, one small mirrored ornament centered on the top rail, an empty image area above and an empty caption area below' },
      { key:'box_tabstrip', ratio:'16:9', for:['box'], ko:'탭 스트립 패널', en:'a content panel whose top edge carries a tab strip — three equal empty tab zones separated by thin vertical ticks, the first tab marked by a thin glowing underline, and a large empty body panel beneath' },
      { key:'box_glass', ratio:'16:9', for:['box'], ko:'스모크 유리 패널', en:'a translucent smoked-glass content panel with a hairline border and four tiny corner ticks, large empty interior' },
      // ─── 프레임 변형
      { key:'frame_bracket_corners', ratio:'16:9', for:['frame'], ko:'코너 브래킷', en:'four slim L-shaped corner brackets only — no continuous rails; the four corners of a wide rectangle marked by short mitered bracket strokes, completely open center' },
      { key:'frame_banner_ornate', ratio:'16:9', for:['frame'], ko:'배너 프레임 (코너 광 장식)', en:'a wide 2:1 banner image frame with slim rails and small glowing ornamental flourishes at the four corners, completely open center for a picture' },
      { key:'frame_media', ratio:'16:9', for:['frame'], ko:'영상 프레임', en:'a wide 16:9 media frame with slim rails, a small centered notch on the bottom rail for a caption and a completely open center for video' },
      // ─── 배지 변형
      { key:'badge_round_tag', ratio:'1:1', for:['badge'], ko:'원형 태그 (HOT)', en:'a small round tag badge — one solid circular disc with a slim rim and a soft outer glow, empty center for a two-letter label' },
      { key:'badge_corner_ribbon', ratio:'1:1', for:['badge'], ko:'모서리 리본 태그', en:'a small folded corner ribbon tag hanging from the top-left corner of a card — a short vertical ribbon with a notched bottom end and an empty face for a tiny label' },
      { key:'badge_count_pill', ratio:'21:9', for:['badge'], ko:'카운트 필 (x300)', en:'a small count-tag pill with a slim rim and a translucent dark fill, wide and low, empty center for a multiplier label' },
      { key:'badge_wax_seal', ratio:'1:1', for:['badge'], ko:'밀랍 봉인', en:'a round wax seal with soft irregular edges and a slim inner ring, an empty flat center disc, no letters' },
      { key:'badge_pennant', ratio:'2:3', for:['badge'], ko:'펜넌트 깃발', en:'a hanging pennant flag badge — a tall vertical banner with a small crossbar at the top and a pointed lower tip, slim edge trim, empty face' },
      { key:'badge_medallion', ratio:'1:1', for:['badge'], ko:'메달리온 엠블럼 판', en:'a round medallion emblem plate — a perfect circular disc with a slim double ring and an empty center reserved for an emblem' },
      { key:'badge_callout', ratio:'4:3', for:['badge'], ko:'말풍선 콜아웃', en:'a small speech-bubble callout badge with a slim rim and a tiny pointer tail at the bottom, empty center' },
      // ─── 디바이더 변형
      { key:'divider_center_gem', ratio:'21:9', for:['divider'], ko:'중앙 보석 라인', en:'a wide thin horizontal separator line with one small diamond-shaped gem at the exact center and both ends fading out softly' },
      { key:'divider_ornate', ratio:'21:9', for:['divider'], ko:'중앙 플러리시 라인', en:'a wide thin horizontal separator line with one small mirrored flourish at the center and tiny tapered ends' },
      { key:'divider_timeline', ratio:'21:9', for:['divider'], ko:'타임라인 (노드 7)', en:'a wide thin horizontal timeline line carrying seven small evenly spaced diamond nodes, the center node slightly larger, both ends fading out' },
      // ─── 장식 (ornament) — 타이틀·섹션·내비
      { key:'orn_title_sides', ratio:'21:9', for:['ornament'], ko:'타이틀 좌우 장식 라인', en:'a mirrored pair of thin horizontal ornament lines for a section title — a left line and a right line with small decorative ends, and a wide completely empty gap between them where the title sits' },
      { key:'orn_title_top', ratio:'3:2', for:['ornament'], ko:'타이틀 위 소형 장식', en:'one small centered ornament that sits above a title — a tiny sparkle or flourish with two short hairline wings, symmetrical, light and airy' },
      { key:'orn_title_bracket', ratio:'3:2', for:['ornament'], ko:'타이틀 상하 브래킷', en:'a pair of thin mirrored curved bracket lines, one arching above and one below an empty title area, each with a tiny centered accent' },
      { key:'orn_date_line', ratio:'21:9', for:['ornament'], ko:'날짜 라인 (양끝 다이아)', en:'a thin horizontal date rule — a short line on the left and a short line on the right, each terminating in a tiny diamond, with an empty center gap for a date' },
      { key:'orn_corner_set', ratio:'1:1', for:['ornament'], ko:'코너 장식 4종 세트', en:'a set of four mirrored corner ornaments placed at the four corners of a square canvas with nothing in the middle — slim filigree ticks that would decorate the corners of a panel' },
      { key:'orn_nav_marker', ratio:'3:2', for:['ornament'], ko:'내비 활성 마커', en:'a small navigation active-state marker — one tiny sparkle or diamond with a short glowing hairline extending to the right, meant to sit beside a menu label' },
      { key:'orn_flourish_center', ratio:'3:2', for:['ornament'], ko:'단독 플러리시', en:'one compact symmetrical flourish ornament standing alone with thin elegant strokes and no frame' },
      // ─── 아이템 슬롯 (slot)
      { key:'slot_diamond', ratio:'1:1', for:['slot'], ko:'다이아몬드 슬롯', en:'a diamond-shaped item slot frame (a square rotated 45 degrees) with slim rails and a completely empty center' },
      { key:'slot_circle_ring', ratio:'1:1', for:['slot'], ko:'원형 링 홀더', en:'a circular item holder — one slim ring with a soft outer glow and a completely empty center' },
      { key:'slot_hex', ratio:'1:1', for:['slot'], ko:'육각 슬롯', en:'a regular hexagonal item slot frame with slim rails and a completely empty center' },
      { key:'slot_square', ratio:'1:1', for:['slot'], ko:'라운드 사각 슬롯', en:'a softly rounded square item slot frame with slim rails and a completely empty center' },
      { key:'slot_ground_ring', ratio:'16:9', for:['slot'], ko:'바닥 링 플랫폼', en:'a flat elliptical ground ring platform seen from a slightly elevated angle — a thin glowing ring lying on the floor beneath an item position, empty inside, no item' },
      { key:'slot_icon_plate', ratio:'1:1', for:['slot'], ko:'원형 아이콘 판', en:'a round skill-icon plate — a dark circular disc with a slim rim and a faint inner glow, empty center for an icon' },
      // ─── 아이콘 추가 (유틸)
      { key:'icon_close_x', ratio:'1:1', for:['icon'], ko:'닫기 (X)', en:'a single clean close icon — two crossing strokes of equal length and consistent weight forming an X' },
      { key:'icon_plus_circle', ratio:'1:1', for:['icon'], ko:'플러스 (원형)', en:'a plus icon centered inside a thin circular ring, consistent stroke weight' },
      { key:'icon_check_circle', ratio:'1:1', for:['icon'], ko:'체크 (원형)', en:'a check-mark icon centered inside a thin circular ring, consistent stroke weight' },
      { key:'icon_bullet_diamond', ratio:'1:1', for:['icon'], ko:'불릿 (다이아)', en:'a single small solid diamond bullet glyph, crisp and symmetrical' },
      { key:'icon_external_link', ratio:'1:1', for:['icon'], ko:'외부 링크', en:'an external-link icon — a small square outline with an arrow leaving from its top-right corner' },
      { key:'icon_share', ratio:'1:1', for:['icon'], ko:'공유', en:'a share icon — three small dots connected by two thin lines' },
      { key:'icon_home', ratio:'1:1', for:['icon'], ko:'홈', en:'a simple house-shaped home icon with a pitched roof and a small door notch' },
      { key:'icon_hamburger', ratio:'1:1', for:['icon'], ko:'햄버거 메뉴', en:'a hamburger menu icon — three equal horizontal bars with consistent spacing' },
    ],
  },
  frameWeight: {
    label:'프레임 굵기',
    opts:[
      { ko:'초박형', en:'ultra-thin sleek hairline rails, never bulky' },
      { ko:'얇고 예리함', en:'thin razor-edged metal rails with precise bevels' },
      { ko:'장식부만 강조', en:'hairline straight rails with detail concentrated only at corners and ends' },
    ],
  },
  material: {
    label:'재질',
    opts:[
      { ko:'순금', en:'rich solid gold with controlled polished highlights' },
      { ko:'금박', en:'thin hand-applied gold leaf with subtle seams and restrained wear' },
      { ko:'고대 황금', en:'aged ancient gold with dark patina settled into recesses' },
      { ko:'전투 흔적 황금', en:'battle-worn gold with fine scratches, small dents and exposed dark under-metal' },
      { ko:'백금', en:'cool pale platinum with refined satin highlights' },
      { ko:'황동', en:'aged brass with warm brown patina' },
      { ko:'청동', en:'ancient bronze with restrained verdigris in recesses' },
      { ko:'은', en:'polished silver with cool controlled reflections' },
      { ko:'다마스커스 강철', en:'dark Damascus steel with subtle layered wave patterns' },
      { ko:'연마 강철', en:'polished forged steel with crisp cold highlights' },
      { ko:'무광 매트', en:'smooth matte non-metallic surface with a soft flat finish, minimal reflections and clean uniform color' },
      { ko:'전투로 단련된 흑철', en:'battle-hardened dark steel, subtly scratched and worn' },
      { ko:'기름 먹인 흑철', en:'oiled blackened steel with restrained cold highlights' },
      { ko:'그을린 강철', en:'smoke-darkened forged steel with worn edges' },
      { ko:'주철', en:'heavy matte cast iron with fine granular texture' },
      { ko:'흑요석', en:'deep black obsidian with sparse razor-sharp reflections' },
      { ko:'대리석', en:'dark fantasy marble with restrained natural veining' },
      { ko:'고대 석재', en:'weathered carved stone with shallow age cracks' },
      { ko:'룬 스톤', en:'dark ancient stone with one restrained engraved glowing groove — an abstract line, never a rune character or symbol' },
      { ko:'고목', en:'aged dark hardwood with visible grain and worn edges' },
      { ko:'가죽', en:'dark embossed leather with restrained stitched edging' },
      { ko:'뼈', en:'aged ivory bone with subtle porous texture and no gore' },
      { ko:'마력 크리스탈', en:'dark translucent magic crystal with controlled inner light' },
      { ko:'스모크 유리', en:'translucent smoked glass with a faint reflective sheen and a slim metallic rim' },
      { ko:'광휘 크리스탈', en:'pale luminous crystal glowing softly from within with cool white-cyan light' },
      { ko:'네온 그라데이션', en:'flat neon magenta-to-violet gradient surface with no texture' },
    ],
  },
  interior: {
    label:'프레임 내부',
    opts:[
      { key:'empty', ko:'비우기', en:'leave the interior completely empty and transparent-looking' },
      { key:'solid_dark', ko:'어두운 단색', en:'fill the interior with a clean flat near-black surface' },
      { key:'material_fill', ko:'동일 재질', en:'fill the interior with a restrained flat panel using the same material' },
      { key:'translucent', ko:'반투명', en:'fill the interior with a subtle translucent smoked panel' },
      { key:'gradient', ko:'은은한 그라데이션', en:'fill the interior with a low-contrast dark vertical gradient' },
      { key:'soft_glow', ko:'중앙 소프트광', en:'fill the interior with a dark surface and one restrained soft central glow' },
    ],
  },
  ornament: {
    label:'장식 배치',
    opts:[
      { ko:'절제된 테두리', en:'small ornament accents touch the perimeter but occupy no more than 20% of the total frame area' },
      { ko:'네 모서리 집중', en:'small mirrored ornaments localized at the four corners, connected only by clean hairline rails' },
      { ko:'좌우 대칭', en:'compact mirrored accents at both pointed ends with plain top and bottom hairline rails' },
    ],
  },
  renderStyle: {
    label:'렌더 표현 방식',
    opts:[
      { key:'realistic_3d', ko:'실사형 3D', en:'high-end physically based 3D game UI render; realistic metal, stone, leather and wood response; controlled real-world reflections, wear, micro-scratches and surface roughness; no painted outlines' },
      { key:'illustrated', ko:'일러스트형', en:'hand-painted game UI illustration; clear painted outer edges, simplified lighting and readable color masses; shape and color design take priority over physically realistic material response; no photorealism' },
      { key:'semi_realistic', ko:'반실사형', en:'semi-realistic RPG game UI rendering that combines believable material cues with controlled hand-painted shading; stable readable silhouette and restrained stylization' },
      { key:'flat_graphic', ko:'플랫 그래픽', en:'clean 2D vector-like or cel-shaded game UI graphic; simplified flat color planes, crisp silhouette and minimal shading; optimized for small buttons and mobile UI; no photorealistic depth' },
    ],
  },
};
export const COMPLETE_RANDOM = ['preset', 'silhouette', 'frameWeight', 'material', 'interior', 'ornament', 'renderStyle'];
export const SIMPLE_MOODS = [
  { key:'dark_rpg', ko:'어둡고 강한 RPG', preset:'black_thorn', material:'전투로 단련된 흑철', ornament:'절제된 테두리' },
  { key:'gold_kingdom', ko:'화려한 황금 왕국', preset:'royal_crest', material:'고대 황금', ornament:'네 모서리 집중' },
  { key:'magic', ko:'신비로운 마법', preset:'arcane', material:'마력 크리스탈', ornament:'좌우 대칭' },
  { key:'nature', ko:'자연과 정령', preset:'nature', material:'고목', ornament:'네 모서리 집중' },
  // '깔끔하고 현대적'(구: dark_minimal+연마강철)이 SF 풍으로 나온다는 피드백 →
  // 그 조합은 '미래적 SF'로 정직하게 이름 붙이고, 현대적은 모던 UI + 무광 매트로 재정의.
  { key:'clean', ko:'깔끔하고 현대적', preset:'modern_ui', material:'무광 매트', ornament:'절제된 테두리' },
  { key:'futuristic', ko:'미래적 SF', preset:'dark_minimal', material:'연마 강철', ornament:'절제된 테두리' },
  // ─── 브랜드웹 톤 (2026-09 라이브러리 조사) — 실제 사이트에서 가장 흔한 순서
  { key:'brandweb_gold', ko:'브랜드웹 골드 헤어라인', preset:'gold_hairline', material:'금박', ornament:'절제된 테두리' },
  { key:'celestial', ko:'백청 광휘 (아이온)', preset:'celestial', material:'광휘 크리스탈', ornament:'좌우 대칭' },
  { key:'crimson_royal', ko:'붉은 왕가', preset:'crimson_royal', material:'고대 황금', ornament:'좌우 대칭' },
  { key:'frost_silver', ko:'서리 은청', preset:'frost_silver', material:'백금', ornament:'절제된 테두리' },
  { key:'modern_neon', ko:'모던 네온 (룩북)', preset:'modern_neon', material:'네온 그라데이션', ornament:'절제된 테두리' },
];
export const SIMPLE_RENDER_STYLES = [
  { key:'illustrated', ko:'게임 일러스트' },
  { key:'realistic_3d', ko:'사실적인 3D' },
  { key:'flat_graphic', ko:'심플한 2D' },
];


// ─── 프롬프트 빌더 ────────────────────────────────────────
// 시드의 렌더 캔버스 비율 — 실루엣 ratio 우선. renderWithImagen 의 aspectRatio 로 전달한다.
export function seedAspectRatio(seed) {
  return seed?.silhouette?.ratio || (seed?.assetType?.key === 'divider' ? '21:9' : '1:1');
}

export function buildCompletePrompt(seed, userIntent = '', opts = {}) {
  const isDivider = seed.assetType.key === 'divider';
  const isIcon = seed.assetType.key === 'icon';
  const isOrnament = seed.assetType.key === 'ornament';
  const isSlot = seed.assetType.key === 'slot';
  // 디바이더 — 구형 '일직선' 은 기존 고정 문구, 신규(중앙 보석·플러리시·타임라인)는 실루엣 설명을 쓴다.
  const plainDivider = isDivider && (!seed.silhouette?.en || seed.silhouette.key === 'divider_line');
  const iconCreative = isIcon && opts.iconCreative;
  const isPerfectCircle = seed.silhouette.key === 'perfect_circle';
  const structure = plainDivider
    ? 'one perfectly straight horizontal separator line, very wide and extremely thin; ignore all plate, box and silhouette shapes'
    : isDivider
      ? `${seed.silhouette.en}; a wide, thin horizontal separator element with no plate, box or panel behind it`
    : isIcon
      // 아이콘 — 창의 모드면 게임풍 재해석 허용, 기본은 깔끔한 글리프.
      ? (iconCreative
        ? `${seed.silhouette.en}; reinterpret this icon with creative flair as a premium fantasy game UI icon — keep the core meaning instantly recognizable, but stylize the silhouette with bold dynamic shaping, sculpted facets, energy accents, motion or ornamental hints so it feels like a crafted game asset rather than a plain flat glyph; still ONE icon, no frame or plate around it`
        : `${seed.silhouette.en}; a solid glyph with consistent stroke weight, instantly readable even at small sizes; exactly ONE icon, no frame or plate around it`)
      : isOrnament
        ? `${seed.silhouette.en}; a pure decorative element — NO frame, NO box, NO plate and NO background panel behind it, only the ornament itself drawn with thin elegant strokes`
        : isSlot
          ? `${seed.silhouette.en}; ${seed.frameWeight.en}; the inner area stays completely empty and open so an item icon can be placed later`
          : `${seed.silhouette.en}; ${seed.frameWeight.en}`;
  const interior = isDivider ? 'no interior panel because this is a divider line'
    : isIcon ? 'no interior panel — the icon itself is the solid shape'
    : isOrnament ? 'no interior panel — the ornament is the whole asset'
    : isSlot ? 'leave the slot interior completely empty and transparent-looking'
    : seed.interior.en;
  const ornamentEn = iconCreative ? 'expressive decorative flourishes are welcome as long as the icon meaning stays clear'
    : isIcon ? 'no ornament — keep the glyph pure and unadorned'
    : isOrnament ? 'the asset itself is the ornament — one clean readable decorative motif with a single decorative layer'
    : seed.ornament.en;
  const circleLock = isPerfectCircle ? ' CIRCLE LOCK: exact 1:1 outer boundary, one continuous perfect circle, absolutely no square corners, rectangular backing, tabs or side extensions.' : '';
  const emptyRule = isIcon ? 'The icon stands alone as a clean solid glyph.' : isOrnament ? 'The ornament stands alone with generous empty space around it.' : (isSlot || seed.interior.key === 'empty') ? 'The center must remain unfilled.' : 'Keep the selected interior fill simple and low contrast.';
  const isolationBg = (isIcon || isOrnament || isSlot || seed.interior.key === 'empty')
    ? 'Use a plain neutral background clearly separated from the asset.'
    : 'BACKGROUND FOR EASY CUTOUT: place the finished asset on one perfectly flat solid background color with maximum hue and luminance contrast against the asset and its filled interior (white/light gray behind a dark asset, black/deep blue behind a bright gold or pale asset). Never reuse an asset color in the background; no background texture, gradient, glow, cast shadow or vignette.';
  const intent = userIntent.trim() ? ` USER INTENT — apply only when it does not violate the structural locks: ${userIntent.trim()}.` : '';
  // 아이콘 생성 시엔 "no icons" 금지어를 빼야 함 — 그대로 두면 아이콘 자체가 차단됨.
  // 룬 절대 금지 — "no text, no letters" 만으로는 모델이 룬을 문자로 인식하지 않아 계속 생성됨.
  const runeBan = ' ABSOLUTELY NO runes, NO rune-like marks, NO glyphs, NO hieroglyphs, NO alphabet of any real or fictional language, NO letter-like or character-like symbols anywhere on the asset — engraved decoration must read only as abstract geometric grooves, notches or patterns.';
  const noList = (isIcon
    ? 'no perspective, no text, no letters, no watermark, no extra objects, no duplicate icons'
    : 'no perspective, no text, no letters, no icons, no watermark, no extra objects') + runeBan;
  // 절제 규칙 — 창의 아이콘 모드에선 표현 자유를 위해 완화 (판독성만 유지).
  const restraint = iconCreative
    ? 'CREATIVE FREEDOM: bold stylization, dynamic shaping and decorative energy are encouraged, but the icon must stay one clear recognizable symbol with a crisp readable silhouette; avoid clutter that hides the meaning.'
    : isOrnament
      ? 'ORNAMENT RESTRAINT: one clear decorative motif with a single decorative layer and thin elegant strokes; no dense filigree; the shape must still read cleanly when scaled down to a website section header.'
    : 'STRICT RESTRAINT: ornament may occupy at most 15% of the asset area; use one clear silhouette with only 1 decorative layer and very low visual density. Frame rails must remain slim, visually light and nearly uniform in thickness; decorative masses must never make the frame look thick.';
  const negList = iconCreative
    ? `NO mixing with another render style, NO cluttered unreadable shape, ${noList}`
    : isOrnament
      ? `NO frame, NO box, NO plate, NO panel, NO background shape, NO thick strokes, NO dense filigree, NO repeated spikes, NO mixing with another render style, ${noList}`
    : `NO mixing with another render style, NO thick frame, NO bulky border, NO heavy corner blocks, NO dense filigree, NO spiderweb or lattice, NO repeated spikes, NO overlapping ornaments, NO extra decorative layer, ${noList}`;
  // 캔버스 비율 안내 — 가로 부품이 1:1 정사각 안에 작게 놓이던 문제를 막고, 비율에 맞춰 캔버스를 채우게 한다.
  const canvasRule = `Canvas aspect ${seedAspectRatio(seed)}: the asset is centered and spans about 85% of the canvas width with even margins on all sides.`;
  return `Create ${seed.assetType.en}, production-ready for a game promotion website and game UI. Structure: ${structure}.${circleLock} Style direction: ${seed.preset.en}. Ornament placement: ${ornamentEn}. Interior treatment: ${interior}. RENDER EXPRESSION LOCK: ${seed.renderStyle.en}.${intent} ${restraint} Material and surface: ${seed.material.en}, refined finish, crisp controlled highlights interpreted strictly through the selected render expression. ${emptyRule} ${isolationBg} Make the asset nine-slice-safe where applicable. ${canvasRule} Front orthographic view, centered, 4K game UI asset render. ${negList}.`;
}

// ─── 브랜드웹 키트 — 한 사이트에 들어가는 부품 세트. 스타일·재질·장식·렌더 표현은 공유하고 용도·형태만 항목별로 다르다.
export const BRANDWEB_KITS = [
  { key:'brandweb_core', ko:'브랜드웹 기본 키트', desc:'CTA · 보조 버튼 · 유리 패널 · 코너 브래킷 · 타이틀 장식 · 내비 마커 · 디바이더 · 태그 · 슬롯 · 닫기', items:[
    ['button','button_ornate_caps'], ['button','button_outline_pill'], ['box','box_glass'], ['frame','frame_bracket_corners'],
    ['ornament','orn_title_sides'], ['ornament','orn_nav_marker'], ['divider','divider_center_gem'], ['badge','badge_round_tag'],
    ['slot','slot_diamond'], ['icon','icon_close_x'],
  ] },
  { key:'brandweb_reward', ko:'보상 · 쿠폰 섹션 키트', desc:'원형 링 홀더 · 바닥 링 · 아이콘 판 · 카운트 필 · 콜아웃 · 리스트 행 · 배너 프레임 · 페이저', items:[
    ['slot','slot_circle_ring'], ['slot','slot_ground_ring'], ['slot','slot_icon_plate'], ['badge','badge_count_pill'], ['badge','badge_callout'],
    ['box','box_list_row'], ['frame','frame_banner_ornate'], ['button','button_pager'],
  ] },
  { key:'brandweb_nav', ko:'내비 · 유틸 키트', desc:'사이드 탭 · 원형 아이콘 버튼 · 펜넌트 · 탭 스트립 · 체크 · 플러스 · 외부 링크 · 불릿', items:[
    ['button','button_side_tab'], ['button','button_circle_icon'], ['badge','badge_pennant'], ['box','box_tabstrip'],
    ['icon','icon_check_circle'], ['icon','icon_plus_circle'], ['icon','icon_external_link'], ['icon','icon_bullet_diamond'],
  ] },
];

// 키트 → 큐 시드 목록. shared 는 { preset, material, ornament, frameWeight, interior, renderStyle } 옵션 객체.
export function buildKitSeeds(kit, shared, opts = {}) {
  const ts = Date.now();
  return kit.items.map(([typeKey, shapeKey], i) => {
    const assetType = COMPLETE_AXES.assetType.opts.find((o) => o.key === typeKey);
    const silhouette = COMPLETE_AXES.silhouette.opts.find((o) => o.key === shapeKey);
    if (!assetType || !silhouette) return null;
    const seed = { ...shared, assetType, silhouette };
    const tags = [kit.ko, assetType.ko, silhouette.ko, shared.preset?.ko, shared.material?.ko].filter(Boolean);
    return { id:`${ts}_kit_${i}`, seed, tags, enriched:null, prompt:buildCompletePrompt(seed, opts.userIntent || '', opts), kit:kit.key };
  }).filter(Boolean);
}
