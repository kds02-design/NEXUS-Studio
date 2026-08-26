// Browser-independent FrameForge bridge for Node/MCP.
// Mirrors the app's simple complete-generation path without importing React/Firebase.
export const FRAMEFORGE_ASSET_TYPES = [
  { key:'button', ko:'버튼', en:'an empty horizontal game menu button frame' },
  { key:'box', ko:'박스', en:'an empty game UI content box or panel frame' },
  { key:'frame', ko:'프레임', en:'an empty decorative game UI frame' },
  { key:'badge', ko:'배지', en:'an empty compact game UI badge frame' },
  { key:'divider', ko:'디바이더', en:'a single straight horizontal game UI divider line' },
  { key:'icon', ko:'아이콘', en:'a single standalone game UI icon glyph, no frame, no background plate' },
];

export const FRAMEFORGE_SILHOUETTES = [
  { key:'button_hex_3', for:['button'], ko:'뾰족 육각 3:1', en:'an elongated 3:1 pointed hexagon menu-button frame with sharp spear-tip ends' },
  { key:'button_hex_4', for:['button'], ko:'뾰족 육각 4:1', en:'an ultra-wide 4:1 pointed hexagon button frame' },
  { key:'button_cut', for:['button'], ko:'컷코너 버튼', en:'an elongated 3:1 button with precise clipped corners' },
  { key:'button_pill', for:['button'], ko:'필 버튼', en:'a clean horizontal pill-shaped button' },
  { key:'button_stadium', for:['button'], ko:'좌우 원형', en:'a wide stadium-shaped button frame whose ends are perfect semicircles' },
  { key:'button_round', for:['button'], ko:'라운드 버튼', en:'a wide softly rounded rectangular button' },
  { key:'box_landscape', for:['box'], ko:'가로 박스', en:'a wide landscape content box with a large usable interior' },
  { key:'box_square', for:['box'], ko:'정사각 박스', en:'a square content box with a large usable interior' },
  { key:'box_portrait', for:['box'], ko:'세로 박스', en:'a tall portrait content box with a large usable interior' },
  { key:'box_tab', for:['box'], ko:'탭 박스', en:'a rectangular content box with one small integrated top tab' },
  { key:'box_banner', for:['box'], ko:'행잉 박스', en:'a hanging banner-shaped content box with a pointed lower edge' },
  { key:'frame_wide', for:['frame'], ko:'와이드 프레임', en:'a wide 16:9 decorative frame with a large open center' },
  { key:'frame_square', for:['frame'], ko:'정사각 프레임', en:'a square decorative frame with a large open center' },
  { key:'frame_portrait', for:['frame'], ko:'세로 프레임', en:'a portrait decorative frame with a large open center' },
  { key:'circle_plate', for:['frame'], ko:'원형 장식 사각판', en:'a rectangular UI plate incorporating a circular medallion' },
  { key:'perfect_circle', for:['frame','badge'], ko:'완전한 원', en:'one mathematically perfect circular silhouette' },
  { key:'oval', for:['frame','badge'], ko:'타원형', en:'a wide oval frame with a clean center and no rectangular backing' },
  { key:'badge_shield', for:['badge'], ko:'방패 배지', en:'a compact shield-shaped badge frame' },
  { key:'badge_hex', for:['badge'], ko:'육각 배지', en:'a compact regular hexagonal badge frame' },
  { key:'badge_ribbon', for:['badge'], ko:'리본 배지', en:'a compact ribbon-shaped badge frame' },
  { key:'divider_line', for:['divider'], ko:'일직선', en:'one perfectly straight horizontal separator line' },
  { key:'icon_arrow_right', for:['icon'], ko:'화살표 (오른쪽)', en:'a single bold arrow icon pointing right' },
  { key:'icon_arrow_down', for:['icon'], ko:'화살표 (아래)', en:'a single bold arrow icon pointing down' },
  { key:'icon_arrow_back', for:['icon'], ko:'화살표 (뒤로)', en:'a single bold arrow icon pointing left' },
  { key:'icon_scroll_down', for:['icon'], ko:'스크롤 다운 (셰브론)', en:'two stacked downward chevrons' },
  { key:'icon_scroll_mouse', for:['icon'], ko:'스크롤 다운 (마우스)', en:'a slim mouse outline and downward chevron' },
  { key:'icon_chevron_down', for:['icon'], ko:'셰브론 (아래)', en:'a single clean downward chevron' },
  { key:'icon_nav_prev', for:['icon'], ko:'이동 (왼쪽)', en:'a clean left navigation chevron' },
  { key:'icon_nav_next', for:['icon'], ko:'이동 (오른쪽)', en:'a clean right navigation chevron' },
  { key:'icon_play', for:['icon'], ko:'재생 (플레이)', en:'a single media play triangle' },
  { key:'icon_play_circle', for:['icon'], ko:'영상 플레이 (원형)', en:'a play triangle centered inside a circular ring' },
];

export const FRAMEFORGE_MOODS = [
  { key:'dark_rpg', ko:'어둡고 강한 RPG', preset:'black iron thorn armor', material:'battle-hardened dark steel', ornament:'restrained perimeter accents' },
  { key:'gold_kingdom', ko:'화려한 황금 왕국', preset:'fallen royal dynasty crest', material:'aged ancient gold', ornament:'small mirrored ornaments at four corners' },
  { key:'magic', ko:'신비로운 마법', preset:'subtle arcane glow line', material:'dark translucent magic crystal', ornament:'compact mirrored accents at both ends' },
  { key:'nature', ko:'자연과 정령', preset:'restrained leaf and spirit-light accents', material:'aged dark hardwood', ornament:'small mirrored ornaments at four corners' },
  { key:'clean', ko:'깔끔하고 현대적', preset:'clean contemporary product UI', material:'smooth matte surface', ornament:'restrained perimeter accents' },
  { key:'futuristic', ko:'미래적 SF', preset:'plain charcoal precision', material:'polished forged steel', ornament:'restrained perimeter accents' },
];

export const FRAMEFORGE_RENDER_STYLES = [
  { key:'illustrated', ko:'게임 일러스트', en:'hand-painted game UI illustration with clear edges and readable color masses' },
  { key:'realistic_3d', ko:'사실적인 3D', en:'high-end physically based 3D game UI render with controlled reflections' },
  { key:'flat_graphic', ko:'심플한 2D', en:'clean 2D vector-like game UI graphic with crisp silhouette and minimal shading' },
];

export function buildFrameForgeMcpPrompt({ assetType, silhouette, mood, renderStyle, userText = '' }) {
  const isIcon = assetType.key === 'icon';
  const isDivider = assetType.key === 'divider';
  const structure = isDivider ? 'one perfectly straight, very wide and extremely thin separator line' : silhouette.en;
  const interior = isIcon || isDivider ? 'no interior panel' : 'leave the center completely empty and visually open';
  const intent = userText.trim() ? ` User intent: ${userText.trim()}.` : '';
  return `Create ${assetType.en}, production-ready for a game UI. Structure: ${structure}. Style direction: ${mood.preset}. Ornament placement: ${mood.ornament}. Interior treatment: ${interior}. RENDER EXPRESSION LOCK: ${renderStyle.en}.${intent} Material and surface: ${mood.material}, refined finish and crisp controlled highlights. STRICT RESTRAINT: ornament may occupy at most 15% of the asset area; keep rails slim and nine-slice-safe where applicable. Front orthographic view, centered, generous safe padding, isolated on one perfectly flat high-contrast solid background for deterministic cutout. No text, no letters, no watermark, no extra objects, no perspective, no background texture, no gradient, no cast shadow, no runes or letter-like symbols. 4K game UI asset render.`;
}
