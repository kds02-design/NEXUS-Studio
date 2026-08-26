const textBlock = (x, y, w, align = 'center', titleSize = 64) => ({
  title: { x, y, w, align, size: titleSize },
  subtitle: { x, y: y + .14, w, align, size: 23 },
  period: { x, y: y + .235, w, align, size: 17 },
  rhythm: { titleSubtitleGap: .025, subtitlePeriodGap: .022, safeMargin: .035 },
});

const slot = (id, label, x, y, w, h, role, extra = {}) => ({ id, label, x, y, w, h, role, fit: 'contain', ...extra });
const hero = (x, y, w, h, label = '메인 캐릭터', extra = {}) => slot('hero', label, x, y, w, h, 'character', { fit: 'cover-from-landmarks', ...extra });
const reward = (id, x, y, w = .16, h = .22) => slot(id, `보상 ${id.replace(/\D/g, '')}`, x, y, w, h, 'reward', { ring: true });

const cropContract = (coreCenter, enforcedCrop = 'waist', overrides = {}) => ({
  authority: 'selected-layout-sample',
  proportionType: 'proportional-humanoid',
  identityCore: 'face and upper-torso gesture',
  enforcedCrop,
  requiredVisibleLandmarks: ['head', 'shoulders', 'chest'],
  forbiddenVisibleLandmarks: enforcedCrop === 'bust' ? ['upper-thigh', 'knees', 'ankles', 'feet'] : ['knees', 'ankles', 'feet'],
  coreCenter,
  lowerCutLandmark: enforcedCrop === 'bust' ? 'below-chest' : 'below-waist',
  headroom: .025,
  permittedCropExits: ['lower body', 'outer cloth', 'weapon tip', 'hair tips'],
  fitMode: 'cover-from-landmarks',
  status: 'locked-before-placement',
  ...overrides,
});

const make = (family, variant, name, description, tags, config) => ({
  id: `layout-${family}-${variant.toLowerCase()}`,
  family,
  variant,
  name,
  description,
  thumbnail: { sheet: family, variant },
  tags,
  canvas: { width: 1180, height: 750 },
  safeArea: { left: .025, top: .03, right: .025, bottom: .035 },
  readingOrder: config.readingOrder || ['hero', 'title', 'subtitle', 'period'],
  ...config,
});

export const BANNER_LAYOUT_LIBRARY = [
  make('01','BASE','캐릭터 좌측 · 카피 우측','대표 캐릭터의 손·무기 제스처를 크게 살리고 우측에 카피를 둡니다.',['character','single','copy-right'],{...textBlock(.61,.23,.32,'center',68),slots:[hero(.00,.01,.61,.99)],characterCrop:cropContract({x:.30,y:.27},'waist',{gazeDirection:'right',gazeRoom:.16})}),
  make('01','A','캐릭터 좌측 확장','좌측 인물을 더 작게 열어 우측 카피 공간을 넓힙니다.',['character','single','copy-right','loose'],{...textBlock(.58,.22,.36,'center',64),slots:[hero(.00,.03,.55,.96)],characterCrop:cropContract({x:.25,y:.28},'upper-thigh',{gazeDirection:'right',gazeRoom:.21})}),
  make('01','B','캐릭터 우측 · 카피 좌측','시선과 손동작이 중앙을 향하는 우측 캐릭터형입니다.',['character','single','copy-left'],{...textBlock(.08,.22,.35,'center',64),slots:[hero(.46,.02,.54,.98)],characterCrop:cropContract({x:.74,y:.28},'waist',{gazeDirection:'left',gazeRoom:.20})}),
  make('01','C','2인 좌측 · 카피 우측','주인공과 보조 캐릭터를 좌측에 겹쳐 배치합니다.',['character','ensemble','copy-right'],{...textBlock(.62,.22,.32,'center',62),slots:[hero(.00,.02,.49,.98),slot('support-1','보조 캐릭터',.16,.02,.42,.92,'character',{fit:'cover-from-landmarks'})],characterCrop:cropContract({x:.30,y:.29},'waist',{billing:'primary-secondary'})}),
  make('01','D','3인 좌측 · 카피 우측','세 인물을 깊이감 있게 중첩하는 군상형입니다.',['character','ensemble','copy-right'],{...textBlock(.65,.23,.30,'center',58),slots:[hero(.00,.08,.39,.90),slot('support-1','보조 캐릭터 1',.19,.00,.34,.91,'character',{fit:'cover-from-landmarks'}),slot('support-2','보조 캐릭터 2',.34,.08,.28,.85,'character',{fit:'cover-from-landmarks'})],characterCrop:cropContract({x:.21,y:.31},'bust',{billing:'primary-secondary-tertiary'})}),
  make('01','E','캐릭터 좌측 · 상품 우측','캐릭터와 핵심 상품을 양쪽 주인공으로 둡니다.',['character','product','copy-top-right'],{...textBlock(.59,.10,.34,'center',58),slots:[hero(.00,.01,.50,.99),slot('main-product','대표 상품',.57,.38,.34,.50,'product',{ring:true})],characterCrop:cropContract({x:.25,y:.26},'waist',{gazeDirection:'right'})}),
  make('01','F','캐릭터 좌측 · 보상열 우측','좌측 캐릭터와 우측 다중 보상 행을 결합합니다.',['character','rewards','copy-top-right'],{...textBlock(.57,.09,.36,'center',56),slots:[hero(.00,.02,.46,.98),reward('reward-1',.53,.48,.13,.22),reward('reward-2',.66,.48,.13,.22),reward('reward-3',.79,.48,.13,.22)],characterCrop:cropContract({x:.23,y:.27},'waist',{gazeDirection:'right'})}),
  make('01','G','캐릭터 좌측 · 보상 군집','큰 캐릭터와 큰 상품 군집을 대각선으로 맞섭니다.',['character','rewards','copy-top-right','cluster'],{...textBlock(.58,.08,.35,'center',54),slots:[hero(.00,.00,.55,1.00),slot('main-product','대표 상품',.56,.38,.34,.49,'product',{ring:true}),reward('reward-1',.50,.61,.14,.20),reward('reward-2',.79,.60,.14,.20)],characterCrop:cropContract({x:.25,y:.27},'bust',{gazeDirection:'right'})}),
  make('01','H','액션 캐릭터 · 우하단 상품','액션 포즈를 프레임 전체에 걸치고 상품을 우하단에 둡니다.',['character','action','product','copy-top-right'],{...textBlock(.60,.08,.34,'center',56),slots:[hero(.00,.00,.75,1.00),slot('main-product','대표 상품',.75,.57,.23,.36,'product',{ring:true})],characterCrop:cropContract({x:.38,y:.24},'bust',{gazeDirection:'right',permittedCropExits:['lower body','weapon tip','cape','outer arm']})}),

  make('02','BASE','중앙 영웅 · 군상','중앙 영웅을 가장 크게 두고 후방 군상과 중앙 타이틀을 겹칩니다.',['character','ensemble','center','cinematic'],{...textBlock(.28,.49,.44,'center',72),slots:[hero(.30,.00,.40,.98),slot('support-1','후방 군상',.02,.23,.96,.72,'character',{fit:'contain'})],characterCrop:cropContract({x:.50,y:.25},'waist',{billing:'primary-over-ensemble'})}),
  make('02','A','중앙 단독 영웅','중앙 캐릭터와 짧은 중앙 카피에 집중합니다.',['character','single','center'],{...textBlock(.25,.54,.50,'center',68),slots:[hero(.25,.00,.50,.98)],characterCrop:cropContract({x:.50,y:.25},'waist')}),
  make('02','B','양측 대결','좌우 캐릭터가 중앙 타이틀을 사이에 두고 대치합니다.',['character','duel','center'],{...textBlock(.30,.43,.40,'center',60),slots:[hero(.00,.01,.40,.98,'좌측 캐릭터'),slot('support-1','우측 캐릭터',.60,.01,.40,.98,'character',{fit:'cover-from-landmarks'})],characterCrop:cropContract({x:.23,y:.28},'waist',{pairCoreCenters:[{x:.23,y:.28},{x:.77,y:.28}]})}),
  make('02','C','3인 중앙 군상','중앙 주인공과 좌우 보조 인물을 삼각형으로 배치합니다.',['character','ensemble','center'],{...textBlock(.28,.48,.44,'center',62),slots:[hero(.30,.00,.40,.98),slot('support-1','좌측 보조',.00,.14,.35,.86,'character',{fit:'cover-from-landmarks'}),slot('support-2','우측 보조',.65,.14,.35,.86,'character',{fit:'cover-from-landmarks'})],characterCrop:cropContract({x:.50,y:.24},'waist',{billing:'primary-secondary-secondary'})}),
  make('02','D','4인 양측 군상','중앙 카피를 비우고 양측에 두 명씩 배치합니다.',['character','ensemble','copy-center'],{...textBlock(.31,.39,.38,'center',58),slots:[hero(.00,.12,.28,.88),slot('support-1','좌측 보조',.18,.18,.25,.82,'character',{fit:'cover-from-landmarks'}),slot('support-2','우측 보조 1',.57,.18,.25,.82,'character',{fit:'cover-from-landmarks'}),slot('support-3','우측 보조 2',.74,.12,.26,.88,'character',{fit:'cover-from-landmarks'})],characterCrop:cropContract({x:.16,y:.32},'bust',{copySafeZone:{x:.31,y:.30,w:.38,h:.42}})}),
  make('02','E','중앙 아이템 · 양측 캐릭터','중앙 아이템을 주인공으로 두고 캐릭터가 양측에서 가리킵니다.',['product','character','center'],{...textBlock(.30,.06,.40,'center',60),slots:[slot('main-product','대표 아이템',.36,.30,.28,.50,'product',{ring:true}),hero(.00,.19,.31,.81,'좌측 캐릭터'),slot('support-1','우측 캐릭터',.69,.19,.31,.81,'character',{fit:'cover-from-landmarks'})],characterCrop:cropContract({x:.15,y:.43},'upper-thigh',{pairCoreCenters:[{x:.15,y:.43},{x:.85,y:.43}]})}),
  make('02','F','중앙 아이템 스테이지','큰 아이템과 좌우 소형 캐릭터로 상품의 위계를 높입니다.',['product','character','center','rewards'],{...textBlock(.29,.05,.42,'center',58),slots:[slot('main-product','대표 아이템',.33,.25,.34,.57,'product',{ring:true}),hero(.03,.39,.25,.61,'좌측 캐릭터'),slot('support-1','우측 캐릭터',.72,.39,.25,.61,'character',{fit:'cover-from-landmarks'}),reward('reward-1',.36,.77,.12,.17),reward('reward-2',.52,.77,.12,.17)],characterCrop:cropContract({x:.15,y:.54},'upper-thigh')}),
  make('02','G','중앙 보스','보스 또는 몬스터의 코어를 중앙에 크게 고정합니다.',['monster','boss','center'],{...textBlock(.28,.05,.44,'center',60),slots:[hero(.17,.24,.66,.76,'보스/몬스터')],characterCrop:cropContract({x:.50,y:.51},'core-closeup',{proportionType:'ornate-monster',identityCore:'eyes, head crest, chest core',requiredVisibleLandmarks:['eyes','head crest','chest core'],forbiddenVisibleLandmarks:[]})}),
  make('02','H','배경 포털 · 하단 카피','배경 랜드마크를 크게 살리고 하단에 정보를 고정합니다.',['environment','portal','title-bottom','cinematic'],{...textBlock(.27,.65,.46,'center',60),slots:[slot('environment-focus','배경 랜드마크',.00,.00,1.00,1.00,'environment',{fit:'cover'})],readingOrder:['environment-focus','title','subtitle','period']}),

  make('03','BASE','카피 좌측 · 상자 중앙 · 보상 우측','상품 소개의 전형적인 3단 정보 구조입니다.',['product','rewards','copy-left'],{...textBlock(.05,.21,.32,'left',58),slots:[slot('main-product','대표 상자',.38,.08,.34,.75,'product',{ring:true}),reward('reward-1',.75,.08,.16,.21),reward('reward-2',.81,.30,.16,.21),reward('reward-3',.72,.55,.16,.21),reward('reward-4',.87,.58,.11,.16)]}),
  make('03','A','카피 좌측 · 상자 우측','좌측 설명과 우측 상품·보상을 안정적으로 분리합니다.',['product','rewards','copy-left'],{...textBlock(.04,.18,.34,'left',56),slots:[slot('main-product','대표 상자',.44,.06,.38,.67,'product',{ring:true}),reward('reward-1',.43,.68,.14,.20),reward('reward-2',.60,.68,.14,.20),reward('reward-3',.77,.68,.14,.20)]}),
  make('03','B','캐릭터 좌측 · 카피/보상 우측','캐릭터의 제스처가 우측 상품 정보로 이어집니다.',['character','rewards','copy-right'],{...textBlock(.55,.13,.38,'left',54),slots:[hero(.00,.00,.48,1.00),reward('reward-1',.54,.58,.13,.19),reward('reward-2',.68,.58,.13,.19),reward('reward-3',.82,.58,.13,.19)],characterCrop:cropContract({x:.23,y:.27},'waist',{gazeDirection:'right'})}),
  make('03','C','중앙 상자 · 방사형 보상','대표 상자 주변으로 개별 보상을 순환 배치합니다.',['product','rewards','radial','title-bottom'],{...textBlock(.30,.68,.40,'center',54),slots:[slot('main-product','대표 상자',.34,.18,.32,.46,'product',{ring:true}),reward('reward-1',.07,.10,.14,.18),reward('reward-2',.78,.08,.14,.18),reward('reward-3',.06,.42,.14,.18),reward('reward-4',.80,.42,.14,.18),reward('reward-5',.18,.57,.14,.18),reward('reward-6',.69,.57,.14,.18)]}),
  make('03','D','보상 5열 · 카피 상단','동일 위계의 보상을 한 줄로 비교합니다.',['rewards','five-items','copy-top'],{...textBlock(.24,.10,.52,'center',56),slots:[reward('reward-1',.05,.49,.16,.24),reward('reward-2',.235,.49,.16,.24),reward('reward-3',.42,.49,.16,.24),reward('reward-4',.605,.49,.16,.24),reward('reward-5',.79,.49,.16,.24)]}),
  make('03','E','대표 보상 좌측 · 카피 우측','큰 보상 하나와 보조 보상 두 개를 위계화합니다.',['product','rewards','copy-right'],{...textBlock(.46,.20,.35,'left',56),slots:[slot('main-product','대표 보상',.03,.08,.40,.78,'product',{ring:true}),reward('reward-1',.80,.14,.15,.22),reward('reward-2',.80,.55,.15,.22)]}),
  make('03','F','상품 양측 · 카피 중앙','두 상품군의 차이를 중앙 카피로 연결합니다.',['product','comparison','copy-center'],{...textBlock(.35,.22,.30,'center',52),slots:[slot('product-left','좌측 상품군',.02,.13,.32,.70,'product',{ring:true}),slot('product-right','우측 상품군',.66,.13,.32,.70,'product',{ring:true})]}),
  make('03','G','캐릭터 좌측 · 대형 보상 우측','캐릭터와 대형 보상을 동일 위계로 배치합니다.',['character','product','rewards'],{...textBlock(.35,.07,.32,'center',50),slots:[hero(.00,.00,.37,1.00),slot('main-product','대표 보상',.55,.20,.38,.62,'product',{ring:true}),reward('reward-1',.13,.68,.11,.17),reward('reward-2',.27,.68,.11,.17),reward('reward-3',.42,.68,.11,.17)],characterCrop:cropContract({x:.18,y:.27},'bust',{gazeDirection:'right'})}),
  make('03','H','카피 좌측 · 상품 우하단 폭발','큰 상품이 우하단에서 프레임 밖으로 튀어나옵니다.',['product','rewards','dynamic','copy-left'],{...textBlock(.07,.16,.38,'left',58),slots:[slot('main-product','대표 상자',.50,.40,.50,.60,'product',{ring:true}),reward('reward-1',.67,.08,.14,.19),reward('reward-2',.82,.18,.14,.19),reward('reward-3',.71,.34,.14,.19)]}),

  make('04','BASE','중앙 대형 타이틀 · 풍경','배경의 중앙 소실점과 대형 타이틀 실루엣을 일치시킵니다.',['title-hero','environment','center'],{...textBlock(.24,.29,.52,'center',92),slots:[],readingOrder:['title','environment','subtitle','period']}),
  make('04','A','중앙 타이틀 · 넓은 여백','풍경의 좌우 여백을 살린 안정적인 타이틀형입니다.',['title-hero','environment','center','loose'],{...textBlock(.23,.35,.54,'center',82),slots:[],readingOrder:['title','environment','subtitle','period']}),
  make('04','B','포털 배경 · 중앙 타이틀','강한 원형 배경 구조 안에 타이틀을 고정합니다.',['title-hero','environment','portal','center'],{...textBlock(.22,.45,.56,'center',80),slots:[],readingOrder:['environment','title','subtitle','period']}),
  make('04','C','심볼 상단 · 타이틀 하단','대형 심볼과 타이틀을 수직 축으로 연결합니다.',['title-hero','symbol','center'],{...textBlock(.21,.57,.58,'center',76),slots:[slot('symbol','대표 심볼',.36,.04,.28,.43,'symbol',{fit:'contain'})],readingOrder:['symbol','title','subtitle','period']}),
  make('04','D','보스 배경 · 중앙 타이틀','상단 보스 실루엣과 중앙 타이틀이 대치합니다.',['title-hero','monster','center'],{...textBlock(.22,.48,.56,'center',78),slots:[hero(.24,.00,.52,.53,'보스/몬스터')],characterCrop:cropContract({x:.50,y:.23},'core-closeup',{proportionType:'ornate-monster',identityCore:'eyes and head crest',requiredVisibleLandmarks:['eyes','head crest'],forbiddenVisibleLandmarks:[]})}),
  make('04','E','타이틀 좌측 · 시스템판 우측','좌측 타이틀과 우측 기능·보상 보드를 비교합니다.',['title-hero','system','copy-left'],{...textBlock(.04,.25,.39,'left',72),slots:[slot('system-board','시스템/보상판',.51,.10,.42,.72,'system',{fit:'contain'})],readingOrder:['title','system-board','subtitle','period']}),
  make('04','F','중앙 타이틀 · 기능 3열','타이틀 아래 핵심 기능 또는 보상을 세 칸으로 정리합니다.',['title-hero','features','three-items','center'],{...textBlock(.25,.13,.50,'center',72),slots:[slot('feature-1','기능 1',.19,.56,.17,.26,'feature',{ring:true}),slot('feature-2','기능 2',.415,.56,.17,.26,'feature',{ring:true}),slot('feature-3','기능 3',.64,.56,.17,.26,'feature',{ring:true})]}),
  make('04','G','타이틀 상단 · 캐릭터 5열','캠페인 타이틀 아래 캐릭터 라인업을 균등 배치합니다.',['title-hero','ensemble','five-characters'],{...textBlock(.23,.08,.54,'center',72),slots:[hero(.02,.39,.20,.58,'캐릭터 1'),slot('support-1','캐릭터 2',.205,.36,.19,.61,'character',{fit:'cover-from-landmarks'}),slot('support-2','캐릭터 3',.405,.32,.19,.65,'character',{fit:'cover-from-landmarks'}),slot('support-3','캐릭터 4',.605,.36,.19,.61,'character',{fit:'cover-from-landmarks'}),slot('support-4','캐릭터 5',.79,.39,.20,.58,'character',{fit:'cover-from-landmarks'})],characterCrop:cropContract({x:.12,y:.56},'upper-thigh',{billing:'equal-five'})}),
  make('04','H','타이틀 상단 · 시스템 중앙 · 캐릭터 우측','타이틀, 시스템 정보, 안내 캐릭터를 세 단계로 읽습니다.',['title-hero','system','character','copy-top'],{...textBlock(.06,.08,.58,'left',64),slots:[slot('system-board','시스템 정보',.18,.40,.47,.43,'system',{fit:'contain'}),hero(.69,.10,.31,.90,'우측 캐릭터')],characterCrop:cropContract({x:.84,y:.32},'waist',{gazeDirection:'left',gazeRoom:.18}),readingOrder:['title','system-board','hero','subtitle','period']}),
];

export const getLayoutById = (id) => BANNER_LAYOUT_LIBRARY.find((layout) => layout.id === id) || BANNER_LAYOUT_LIBRARY[0];

// 좌측 36개 샘플과 우측 구성 가이드를 1:1로 고정한다. 슬롯 수나 태그로 추측하지 않는다.
export const LAYOUT_GUIDE_PRESETS = {
  'layout-01-e':{ item:'item-single' },
  'layout-01-f':{ item:'item-three-products' },
  'layout-01-g':{ item:'slot-aware' },
  'layout-01-h':{ item:'slot-aware' },
  'layout-02-e':{ item:'item-single' },
  'layout-02-f':{ item:'slot-aware' },
  'layout-02-g':{ character:'monster-core' },
  'layout-02-h':{ environment:'portal-landmark' },
  'layout-03-base':{ item:'slot-aware' },
  'layout-03-a':{ item:'slot-aware' },
  'layout-03-b':{ item:'item-three-products' },
  'layout-03-c':{ item:'item-radial' },
  'layout-03-d':{ item:'item-five-row' },
  'layout-03-e':{ item:'slot-aware' },
  'layout-03-f':{ item:'item-compare' },
  'layout-03-g':{ item:'slot-aware' },
  'layout-03-h':{ item:'item-burst' },
  'layout-04-base':{ environment:'mountain-title-space' },
  'layout-04-a':{ environment:'mountain-title-space' },
  'layout-04-b':{ environment:'portal-landmark' },
  'layout-04-d':{ character:'monster-background' },
  'layout-04-f':{ item:'item-three-products' },
};

export function recommendLayouts(analysis = {}) {
  const wanted = new Set();
  const priority = analysis.visualPriority;
  if (priority === 'character') ['character','single'].forEach((tag) => wanted.add(tag));
  if (priority === 'three_products') ['product','comparison','three-items'].forEach((tag) => wanted.add(tag));
  if (priority === 'copy_first') ['title-hero','copy-top'].forEach((tag) => wanted.add(tag));
  if (priority === 'radial_rewards') ['rewards','radial'].forEach((tag) => wanted.add(tag));
  if (priority === 'character_reward_table') ['character','rewards'].forEach((tag) => wanted.add(tag));
  if ((analysis.rewards?.length || 0) >= 4) wanted.add('rewards');
  if (/보스|몬스터/i.test(analysis.mainObject || '')) wanted.add('monster');
  if (/상자|패키지|상품|보상|아이템/i.test(analysis.mainObject || '')) wanted.add('product');
  return BANNER_LAYOUT_LIBRARY
    .map((layout) => ({ layout, score: layout.tags.reduce((sum, tag) => sum + (wanted.has(tag) ? 2 : 0), 0) + (layout.variant === 'BASE' ? .25 : 0) }))
    .sort((a,b) => b.score-a.score || a.layout.id.localeCompare(b.layout.id))
    .slice(0,3)
    .map(({layout}) => layout.id);
}

export function toPreset(layout) {
  return {
    id: layout.id,
    label: `${layout.family}-${layout.variant} · ${layout.name}`,
    description: layout.description,
    title: layout.title,
    subtitle: layout.subtitle,
    period: layout.period,
    slots: layout.slots || [],
    groups: layout.groups || [],
  };
}
