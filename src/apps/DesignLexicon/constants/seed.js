// Design Lexicon MVP 시드 데이터 — 디자인 방법론 18개 텀.
// 각 텀 스키마:
//   id        : 고유 영문 슬러그 (kebab-case)
//   term      : 영문 정식명 (검색 키)
//   ko        : 한글 표기 (검색 키, 보조 라벨)
//   category  : categories.js 의 id
//   tags      : 프롬프트 아크의 #태그 와 매칭되는 키워드 배열 (향후 통합용)
//   summary   : 한 줄 정의 (카드 미리보기)
//   theory    : 본문 — 왜 중요한지, 어떻게 쓰는지 (한글 3~5문장)
//   examples  : (선택) 적용 예시 / 보기 좋은 사례
//   references: (선택) 참고 자료 — { label, url } 또는 문자열
// MVP 단계에서는 Firestore 없이 정적 모듈로 관리. 추후 lexicon 컬렉션으로 마이그레이션 예정.

export const LEXICON = [
  // ── Typography ─────────────────────────────────────────────────────────
  {
    id: "typographic-hierarchy",
    term: "Typographic Hierarchy",
    ko: "타이포그래피 위계",
    category: "typography",
    tags: ["타이포", "위계", "hierarchy"],
    summary: "크기·굵기·색·여백으로 정보의 읽기 순서를 시각적으로 설계하는 원칙.",
    theory: "독자가 어디부터 어떤 순서로 읽을지 디자이너가 미리 설계해야 한다. 일반적으로 H1 > H2 > Body > Caption 순으로 대비를 강하게 — 약하게 줘서 자연스럽게 시선이 흐르도록 만든다. 위계가 무너지면 모든 글자가 동등하게 보여 결국 아무것도 강조되지 않는다.",
    examples: ["뉴스 사이트의 헤드라인/리드/본문 대비", "프레젠테이션 슬라이드 타이틀과 부제"],
    references: [{ label: "Practical Typography — Hierarchy", url: "https://practicaltypography.com/" }],
  },
  {
    id: "kerning",
    term: "Kerning",
    ko: "커닝",
    category: "typography",
    tags: ["타이포", "spacing"],
    summary: "특정 두 글자 사이의 간격을 정밀하게 조정하는 작업.",
    theory: "트래킹(전체 자간)과 달리 커닝은 'AV', 'To' 처럼 시각적으로 어색하게 벌어지거나 붙어 보이는 페어를 1:1로 다듬는다. 헤드라인·로고처럼 큰 글자일수록 커닝 오차가 도드라지므로 수동 조정이 필요하다.",
    examples: ["로고 디자인", "거대 헤드라인 (60pt 이상)"],
  },
  {
    id: "drop-cap",
    term: "Drop Cap",
    ko: "드롭 캡",
    category: "typography",
    tags: ["타이포", "장식"],
    summary: "단락 첫 글자를 키워 본문 위에 떨어뜨려 강조하는 전통적 편집 기법.",
    theory: "중세 채식 필사본에서 유래. 현대에서는 매거진·블로그 도입부에 시선 진입점을 만드는 용도. 보통 3~5줄 높이로 떨어뜨리고, 본문은 첫 글자를 감싸며 흘러내린다.",
  },
  {
    id: "variable-fonts",
    term: "Variable Fonts",
    ko: "가변 폰트",
    category: "typography",
    tags: ["타이포", "기술"],
    summary: "한 파일 안에 여러 굵기·너비·기울기 축을 담는 OpenType 1.8+ 폰트 형식.",
    theory: "기존엔 Regular/Bold/Light 등 각각 별도 파일이었지만, 가변 폰트는 'wght' (100~900), 'wdth', 'slnt' 같은 연속 축을 가진다. 웹 페이로드가 줄고 애니메이션·반응형 타이포에 유리하다. CSS 의 font-variation-settings 로 정밀 제어.",
    examples: ["Inter, Recursive, Roboto Flex"],
  },

  // ── Color ──────────────────────────────────────────────────────────────
  {
    id: "complementary-colors",
    term: "Complementary Colors",
    ko: "보색",
    category: "color",
    tags: ["color", "대비"],
    summary: "색상환에서 서로 180° 반대편에 있는 두 색 — 최강의 대비를 만든다.",
    theory: "빨강↔초록, 파랑↔주황, 노랑↔보라 처럼 보색끼리 인접하면 채도가 극단적으로 부각된다. 강한 시선 끌기에 효과적이지만 면적이 비슷하면 진동(vibration) 현상이 생기므로 한쪽을 액센트로만 쓰는 게 안전하다.",
    examples: ["CTA 버튼 컬러", "스포츠 브랜드 로고"],
  },
  {
    id: "60-30-10-rule",
    term: "60-30-10 Rule",
    ko: "60-30-10 규칙",
    category: "color",
    tags: ["color", "비율"],
    summary: "메인 60% · 보조 30% · 액센트 10% 비율로 색을 분배하는 인테리어·UI 디자인 휴리스틱.",
    theory: "비율이 균형 잡혀 있으면 화면이 안정감 있고 액센트가 효과적으로 작동한다. UI 에서는 메인=배경/표면, 보조=텍스트/카드, 액센트=CTA/링크 로 매핑된다. 비율을 깨면 의도적인 강조나 시그너처 컬러 효과를 만들 수 있다.",
  },
  {
    id: "hsl-model",
    term: "HSL (Hue · Saturation · Lightness)",
    ko: "HSL 색 모델",
    category: "color",
    tags: ["color", "모델"],
    summary: "색상 / 채도 / 명도 세 축으로 색을 표기 — 인간 직관에 가까운 색 공간.",
    theory: "RGB 는 빛의 합성 기준이라 디자이너가 '조금 더 파랗게'를 직관적으로 조작하기 어렵다. HSL 은 색상(0~360°)·채도(0~100%)·명도(0~100%) 로 나뉘어 채도만 낮추거나 명도만 올리는 작업이 직관적이다. 디자인 토큰 시스템 설계 시 HSL 베이스를 권장.",
  },
  {
    id: "analogous-colors",
    term: "Analogous Colors",
    ko: "유사색",
    category: "color",
    tags: ["color", "팔레트"],
    summary: "색상환에서 30~60° 이내 인접한 색들로 구성한 부드러운 팔레트.",
    theory: "예: 파랑·청록·민트. 대비가 약하지만 조화롭고 차분한 인상을 줘서 자연·휴식·헬스케어 브랜드에 자주 쓰인다. 강조가 필요할 땐 보색을 액센트로 한 점 찍어주면 균형이 잡힌다.",
  },

  // ── Layout ─────────────────────────────────────────────────────────────
  {
    id: "grid-system",
    term: "Grid System",
    ko: "그리드 시스템",
    category: "layout",
    tags: ["layout", "그리드"],
    summary: "수직 컬럼·여백·거터로 구성된 격자 위에 콘텐츠를 정렬하는 레이아웃 프레임워크.",
    theory: "스위스 그래픽 디자인(Müller-Brockmann) 에서 시작. 12 컬럼 그리드가 웹 표준이 된 이유는 2·3·4·6 으로 정수 분할이 가능해서. 그리드는 자유를 제한하는 것이 아니라 결정을 줄여 일관성을 만들어주는 장치다.",
    examples: ["Bootstrap 12-col grid", "Material 8dp baseline grid"],
  },
  {
    id: "golden-ratio",
    term: "Golden Ratio",
    ko: "황금비",
    category: "layout",
    tags: ["layout", "비율"],
    summary: "1 : 1.618 의 비율 — 자연과 고대 건축에서 발견되는 미학적 비율.",
    theory: "Apple 로고, 파르테논 신전, 앵무조개 등에서 보이는 비율. 디자인에서는 페이지를 1.618:1 로 분할하거나 카드의 가로:세로 비율로 자주 쓰인다. 강제 적용보단 시각적 균형의 한 가이드로 사용하는 게 좋다.",
  },
  {
    id: "white-space",
    term: "White Space (Negative Space)",
    ko: "여백 / 네거티브 스페이스",
    category: "layout",
    tags: ["layout", "여백"],
    summary: "콘텐츠 사이의 비어있는 공간 — 그 자체가 디자인 요소다.",
    theory: "여백은 비어있는 게 아니라 '의도된 침묵'이다. 충분한 여백은 가독성·고급감·집중도를 만든다. 럭셔리 브랜드일수록 여백을 과감히 쓴다. 마이크로(자간·행간) / 매크로(섹션 간격) 여백을 구분해서 설계.",
    examples: ["Apple 제품 페이지", "MoMA 카탈로그"],
  },
  {
    id: "rule-of-thirds",
    term: "Rule of Thirds",
    ko: "삼분할 법칙",
    category: "layout",
    tags: ["layout", "구도"],
    summary: "화면을 3×3 으로 나눈 격자의 교차점·선 위에 주요 피사체를 두는 사진·구도 원칙.",
    theory: "중앙 배치는 안정적이지만 단조롭다. 교차점에 피사체를 두면 긴장감과 시각적 흐름이 생긴다. UI 히어로 섹션에도 적용 가능 — 카피와 이미지를 좌상/우하 교차점에 배치.",
  },

  // ── Composition / Visual Perception ───────────────────────────────────
  {
    id: "gestalt-principles",
    term: "Gestalt Principles",
    ko: "게슈탈트 원리",
    category: "composition",
    tags: ["composition", "지각"],
    summary: "근접·유사·연속·폐쇄·공통운명 등 인간이 시각적 요소를 묶어 인지하는 법칙들.",
    theory: "1920년대 독일 심리학자들의 연구. UI 그루핑이 자연스럽게 보이려면 게슈탈트 원리에 맞게 배열해야 한다. 예: 폼 라벨과 입력 필드를 '근접' 시키면 한 쌍으로 인지, '유사한 색' 의 카드들은 같은 카테고리로 인지.",
    examples: ["Apple Music 알범 그리드 (유사·근접)", "Netflix 행 구조 (공통운명)"],
  },
  {
    id: "f-pattern",
    term: "F-Pattern Reading",
    ko: "F 패턴 읽기",
    category: "composition",
    tags: ["composition", "ux", "패턴"],
    summary: "사용자가 텍스트 위주 페이지를 F 자 형태로 스캔한다는 Nielsen Norman 의 아이트래킹 연구 결과.",
    theory: "왼쪽 상단부터 가로로 첫 줄, 다시 가로로 짧게, 그 다음 왼쪽 세로로 스캔. 즉 첫 두 단락과 각 단락의 첫 단어가 결정적. 중요한 키워드를 왼쪽·앞쪽에 배치하고 핵심 정보는 처음 두 단락에 압축할 것.",
  },
  {
    id: "visual-hierarchy",
    term: "Visual Hierarchy",
    ko: "시각적 위계",
    category: "composition",
    tags: ["composition", "위계"],
    summary: "크기·대비·색·위치·여백을 조합해 시선의 흐름을 설계하는 메타 원칙.",
    theory: "타이포그래픽 위계의 상위 개념. 색·대비·아이콘·여백 등 모든 시각 요소가 동원된다. 'F-pattern' 같은 스캔 패턴을 만들기 위해서 디자이너가 의도적으로 강약을 설계하는 행위.",
  },

  // ── Motion ─────────────────────────────────────────────────────────────
  {
    id: "easing-curves",
    term: "Easing Curves",
    ko: "이징 곡선",
    category: "motion",
    tags: ["motion", "애니메이션"],
    summary: "시간에 따른 변화율을 정의하는 베지에 곡선 — 모션의 '느낌'을 결정한다.",
    theory: "선형(linear) 은 기계적이고 부자연스럽다. 자연스러운 모션은 가속과 감속을 동반한다. ease-in-out, cubic-bezier(0.4, 0, 0.2, 1) 같은 표준 곡선이 머티리얼 디자인의 기본. 빠르게 시작해 부드럽게 멈추는 ease-out 이 UI 진입 모션에 가장 잘 어울린다.",
    examples: ["Material 'standard easing'", "iOS spring animation"],
  },
  {
    id: "anticipation",
    term: "Anticipation",
    ko: "예비 동작 (앤티시페이션)",
    category: "motion",
    tags: ["motion", "12원칙"],
    summary: "주 동작 전에 반대 방향으로 살짝 움직여 다음 동작을 예고하는 디즈니 애니메이션 12원칙 중 하나.",
    theory: "공이 점프하기 전에 잠깐 웅크리는 모션. UI 에서는 버튼 클릭 시 0.05s 살짝 작아졌다 커지는 등 마이크로 인터랙션에 적용. 사용자가 변화를 '예상' 할 수 있어 인지 부하를 줄여준다.",
  },
  {
    id: "squash-and-stretch",
    term: "Squash and Stretch",
    ko: "찌그러짐과 늘어남",
    category: "motion",
    tags: ["motion", "12원칙"],
    summary: "물체의 부피를 유지한 채 모양을 변형해 무게감·탄성을 표현하는 애니메이션 원리.",
    theory: "공이 바닥에 닿을 때 가로로 퍼지고, 튀어오를 때 세로로 늘어난다. 부피는 보존되어야 함 — 안 그러면 풍선이 터지는 듯한 비현실감. UI 에서는 알림 토스트의 등장, 액정 잠금 해제 실패 시 흔들림 등.",
  },
];
