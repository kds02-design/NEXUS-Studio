/* eslint-disable */
// 버전 스냅샷: TypecoreSovereign current. 디렉터 페르소나 5명 + safetyGuards.
//
// 원래 기획 의도: 페르소나를 다르게 가져가서 결과물을 다양하게 만든다.
// v1 의 directorPersonas 패턴을 current 에 복원하면서 각 페르소나가 영문 프롬프트(language/forbidden)와
// Gemini optimize 의 systemPrompt(role) 양쪽 모두에 명확히 다른 입력을 주도록 강화했다.
//
// id 는 기존 5개를 유지 — options.js 의 Purpose 매핑이 이 id 를 참조하므로 호환성 유지.
// 라벨은 직업 페르소나로 재해석:
//   core_fortress → 게임 아트 디렉터
//   core_blade    → 다크 판타지 일러스트레이터
//   core_relic    → 히스토리 디자이너
//   core_glyph    → 타이포그래퍼
//   core_kinetic  → 모션 디자이너
import React from 'react';
import { Gamepad2, Swords, Landmark, Type, Wind } from 'lucide-react';

export const coreArchetypes = [
  {
    id: 'core_fortress',
    icon: <Gamepad2 className="w-4 h-4 text-amber-400" />,
    nickname: "게임 디렉터",
    shortTitle: "🎮 게임 아트 디렉터",
    subtitle: "AAA 게임 메인 타이틀, 묵직한 위엄",
    role: `너는 AAA 콘솔 게임의 메인 키 아트를 책임지는 수석 아트 디렉터야. 〈Diablo〉, 〈Elden Ring〉, 〈God of War〉 같은 타이틀 로고를 떠올리며 글자를 설계해. 캔버스 비율이나 공간 점유율은 사용자가 정한 값 그대로 두고 절대 간섭하지 말고, 오직 '글자 획 자체의 무게와 마감'에만 집중해. 획은 거대한 강철 기둥이고 자간은 견고한 성문 사이의 압력으로 설계해 — 게이머가 박스 패키지에서 봤을 때 "이 게임은 묵직하다"고 즉시 느낄 인상을 글자 뼈대에만 부여해.`,
    tone: "[장엄하고 묵직한] AAA 게임 시네마틱 컷처럼 무게감 있는 시스템 명령어 문체로 오직 '글자 획의 위엄과 산업적 밀도'만을 시각적 언어로 치환할 것.",
    keywords: "AAA game title logo, monumental brutalist typography, heavy industrial metal block, dramatic rim lighting, console game packaging aesthetic, bottom-heavy pillar structure",
    language: "massive monolithic block letterforms carved from dark iron, brushed steel surface with subtle hammered texture, deeply chiseled bottom-heavy industrial mass, AAA video game title typography, dense pillar stems with chamfered edges, dramatic side rim light",
    weightTags: "(massive architectural pillar stems:1.5), (hammered geometric surface pattern:1.3), (impenetrable thick monolithic structure:1.4), heavy bottom-heavy industrial mass",
    forbidden: "NO extreme thin lines, NO fragile broken elements, NO fluid organic curves, NO playful rounded shapes, NO calligraphic flourishes, NO neon glow",
  },
  {
    id: 'core_blade',
    icon: <Swords className="w-4 h-4 text-rose-400" />,
    nickname: "다크 판타지",
    shortTitle: "⚔️ 다크 판타지 일러스트레이터",
    subtitle: "전투적이고 날카로운 액션 타이틀",
    role: `너는 다크 판타지 액션 게임의 키 아트와 보스 컷씬 타이틀을 그리는 일러스트레이터야. 〈Bloodborne〉, 〈Dark Souls〉, 〈Sekiro〉의 보스 등장 타이틀처럼 한 획 한 획이 검날인 글자를 설계해. 캔버스의 레이아웃이나 크기 확대에 관여하지 말고, 오직 '글자 획 내부의 텐션과 단부(Terminal)'에만 집중해. 획은 검신, 끝단은 칼날, 내부 공간은 베인 상처로 설계하며 공격적인 대각선 컷과 금속성 구조감만 부여해.`,
    tone: "[전투적이고 날카로운] 검이 허공을 가르듯 서늘하고 공격적인 문체로 오직 '글자 획의 긴장감과 강철의 물성'만을 묘사할 것.",
    keywords: "dark fantasy action title, forged steel blade serif, weaponized typography, slash cuts, battle scar, gothic metal, aggressive razor terminals, boss encounter logo",
    language: "extreme thick-thin stroke contrast like a forged katana blade, razor-sharp incisive terminals slicing the negative space, aggressive diagonal cuts severing the letterforms, dark fantasy action poster aesthetic, lethal geometric tension, chromatic accent on cut edges",
    weightTags: "(extreme thick-thin stroke contrast:1.5), (razor-sharp blade incisive terminals:1.5), (aggressive space-slashing diagonal cuts:1.4), weaponized lethal geometry",
    forbidden: "NO soft rounded corners, NO heavy uniform blocky mass, NO decorative floral ornaments, NO classical serifs, NO calligraphic curves, NO playful shapes",
  },
  {
    id: 'core_relic',
    icon: <Landmark className="w-4 h-4 text-amber-600" />,
    nickname: "히스토리",
    shortTitle: "🏛️ 히스토리 디자이너",
    subtitle: "고대 비석·풍화·유물의 무게",
    role: `너는 박물관 전시 그래픽과 사극·역사 다큐멘터리 타이틀을 설계하는 히스토리 디자이너야. 천 년 풍화된 비석에서 발굴된 글자처럼 — 균열, 침식, 비대칭이 글자의 정체성이 되도록 설계해. 캔버스 전체 비율이나 공간은 사용자 지정 그대로 두고, 오직 '글자 표면의 시간성'에만 집중해. 완벽한 대칭은 거부하고, 부서진 한쪽이 의도적인 미학이 되도록 흠집과 손상을 신중하게 배치해.`,
    tone: "[고대적이고 신비로운] 시간의 풍파와 유기적 손상을 묘사하는 고고학자의 보고서 문체로 오직 '글자 표면의 균열과 부재의 흔적'만을 시각적 언어로 치환할 것.",
    keywords: "ancient stone inscription, archaeological relic typography, weathered carved monument, time-eroded asymmetry, lost civilization rune, patina and oxidation, broken hairline cracks",
    language: "ancient eroded silhouette with irregular weather damage, intricate hairline 2D cracks fracturing the letterforms, time-weathered broken asymmetry on a carved stone surface, archaeological inscription aesthetic, patina across the strokes, missing chunks revealing inner structure",
    weightTags: "(irregular ancient eroded silhouette:1.5), (time-weathered broken symmetry:1.4), (intricate hairline 2D cracks:1.3), patina and oxidation",
    forbidden: "NO perfectly pristine modern vectors, NO sci-fi futuristic clean lines, NO flawless symmetry, NO neon glow, NO smooth glossy surfaces, NO playful rounded shapes",
  },
  {
    id: 'core_glyph',
    icon: <Type className="w-4 h-4 text-indigo-400" />,
    nickname: "타이포그래퍼",
    shortTitle: "🔡 타이포그래퍼",
    subtitle: "활자 디자이너·엠블럼·광학 균형",
    role: `너는 활자 디자인을 30년 한 시니어 타이포그래퍼야. Adrian Frutiger, Erik Spiekermann 같은 거장의 시점에서 글자를 설계해. 캔버스의 전체 비율이나 점유율에는 관여하지 말고, 오직 '문자가 하나의 통합된 엠블럼·심볼로 융합되는 광학 균형'에만 집중해. 자간을 닫고, 내부 공간(counter)을 폐쇄하여, 모든 글자가 단일 인장(印章)처럼 보이도록 융합시켜. 거장의 정밀함으로 모든 곡선이 의도적이도록.`,
    tone: "[정교하고 절제된] 활자 디자이너의 매뉴얼 문체로 오직 '글자의 광학 균형, 닫힌 카운터, 엠블럼 융합 구조'만을 시각적 언어로 치환할 것.",
    keywords: "master typeface design, monogram emblem fusion, closed counters, heraldic seal, optical balance, Adrian Frutiger influence, refined sophisticated typography",
    language: "highly fused symbolic emblem structure forming a unified seal, closed internal negative space counters interlocking into a heraldic mark, abstract typographic crest, monogram badge aesthetic, the letters merge into a single coherent silhouette like a guild insignia, precise optical compensation",
    weightTags: "(highly fused symbolic emblem structure:1.5), (closed internal negative space counters:1.4), heraldic monogram seal, refined optical balance",
    forbidden: "NO widely separated letters, NO loose airy spacing, NO simple handwriting, NO motion streaks, NO scattered debris, NO weathered damage",
  },
  {
    id: 'core_kinetic',
    icon: <Wind className="w-4 h-4 text-sky-400" />,
    nickname: "모션",
    shortTitle: "⚡ 모션 디자이너",
    subtitle: "방향성·속도감·키네틱 타이포",
    role: `너는 F1 레이싱과 액션 영화의 키 비주얼을 만드는 모션 디자이너야. 〈Top Gun: Maverick〉, 〈Mad Max〉의 타이틀처럼 — 글자가 정지해 있어도 화면 밖으로 질주하는 느낌이 들도록 설계해. 캔버스 비율이나 점유율은 사용자 값 그대로 두고, 오직 '글자 획의 방향성과 트레일'에만 집중해. 모든 stem 은 풍동 시뮬레이션을 통과한 것처럼 뒤로 쓸려야 하고, 비대칭 리듬으로 정지화면 안에 운동량을 가둬.`,
    tone: "[역동적이고 빠른] 풍동 시뮬레이션 리포트처럼 운동량과 벡터를 묘사하는 문체로 오직 '글자 획의 방향성과 속도 흔적'만을 시각적 언어로 치환할 것.",
    keywords: "kinetic motion typography, racing aerodynamic letterforms, swept-back italic shear, velocity streaks, F1 visual identity, action movie title, directional momentum",
    language: "aggressive forward directional momentum with swept-back stems, fluid asymmetric trailing rhythm dragging behind each letter, aerodynamic typography as if sculpted by wind tunnel, implied motion blur and velocity streaks pulling the strokes, racing game aesthetic, italic shear with kinetic energy",
    weightTags: "(aggressive forward directional momentum:1.5), (fluid asymmetric trailing rhythm:1.4), (aerodynamic swept-back structure:1.3), implied velocity streaks",
    forbidden: "NO static perfectly vertical alignment, NO stiff blocky stability, NO heavy uniform weight, NO calligraphic ornaments, NO classical serifs",
  },
];

// --- SAFETY GUARDS (변경 없음) ---
export const safetyGuards = [
  { id: 'guard_mutation', label: '텍스트 보존 락', desc: '원문 100% 유지. 철자 누락/변형 절대 금지.', fixEn: '(perfectly intact text legibility:1.4), (100% correct spelling:1.5), absolutely NO missing letters' },
  { id: 'guard_3d',       label: '2D 평면 강제 락', desc: '뎁스, 베벨, 그림자 생성 원천 차단.', fixEn: '(zero depth flat 2D geometry:1.5), NO rear extrusion, NO volumetric form' },
  { id: 'guard_layout',   label: '세로 붕괴 방지 락', desc: '세로 찌그러짐/늘어남 방지. 1:1 골격 강제.', fixEn: '(strictly normal horizontal text proportions:1.5), (perfect text baseline:1.4), NO vertical stretching, NO tall letters' },
  { id: 'guard_noise',    label: 'VFX 억제 락', desc: '실루엣을 해치는 부유물 및 파편 제거.', fixEn: '(clear cutout text shape:1.4), (flawless silhouette boundary:1.5), NO floating noise' },
];
