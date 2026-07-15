export const BANNER_SIZE = { width: 1180, height: 750 };

// 2026 BNS 배너 작업 폴더의 반복 산출 규격.
export const BANNER_OUTPUT_SIZES = [
  { id:'notice', label:'공지', width:1180, height:750, mode:'full', content:'title', showBadge:true },
  { id:'facebook', label:'Facebook', width:1200, height:630, mode:'wide', content:'title', showBadge:true },
  { id:'purple', label:'PURPLE', width:1352, height:860, mode:'full', content:'image-only', showBadge:true },
  { id:'eventon', label:'이벤트온', width:600, height:340, mode:'wide', content:'image-only', showBadge:true },
  { id:'main', label:'메인', width:620, height:640, mode:'compact', content:'image-only', showBadge:true },
  { id:'toast', label:'토스트', width:375, height:230, mode:'compact', content:'image-only', showBadge:false },
  { id:'ingame', label:'인게임', width:266, height:280, mode:'compact', content:'image-only', showBadge:false, transparent:true },
  { id:'ingame-mini', label:'인게임 미니', width:72, height:40, mode:'micro', content:'image-only', showBadge:false },
];

export const BOX_BANNER_PRESETS = [
  {
    id: 'character_showcase',
    label: '캐릭터 중심',
    description: '중앙 캐릭터와 좌우 보상 묶음',
    title: { x: 0.22, y: 0.57, w: 0.56, align: 'center', size: 72 },
    subtitle: { x: 0.27, y: 0.72, w: 0.46, align: 'center', size: 24 },
    period: { x: 0.30, y: 0.84, w: 0.40, align: 'center', size: 18 },
    slots: [
      { id: 'hero', label: '메인 캐릭터', x: 0.24, y: 0.02, w: 0.52, h: 0.84, fit: 'contain' },
      { id: 'reward-left', label: '왼쪽 보상', x: 0.06, y: 0.24, w: 0.22, h: 0.34, fit: 'contain', ring: true },
      { id: 'reward-right', label: '오른쪽 보상', x: 0.75, y: 0.20, w: 0.20, h: 0.34, fit: 'contain', ring: true },
    ],
  },
  {
    id: 'three_packages',
    label: '3종 상품 비교',
    description: '상단에 세 상품과 구성품을 동일 비중으로 노출',
    title: { x: 0.15, y: 0.59, w: 0.70, align: 'center', size: 76 },
    subtitle: { x: 0.24, y: 0.75, w: 0.52, align: 'center', size: 22 },
    period: { x: 0.30, y: 0.87, w: 0.40, align: 'center', size: 18 },
    slots: [
      { id: 'package-1', label: '상품 1', x: 0.05, y: 0.08, w: 0.28, h: 0.42, fit: 'contain', ring: true },
      { id: 'package-2', label: '상품 2', x: 0.36, y: 0.08, w: 0.28, h: 0.42, fit: 'contain', ring: true },
      { id: 'package-3', label: '상품 3', x: 0.67, y: 0.08, w: 0.28, h: 0.42, fit: 'contain', ring: true },
    ],
  },
  {
    id: 'copy_first',
    label: '카피 중심',
    description: '상단 타이틀을 강조하고 하단에 상품 흐름 배치',
    title: { x: 0.07, y: 0.05, w: 0.86, align: 'center', size: 66 },
    subtitle: { x: 0.22, y: 0.22, w: 0.56, align: 'center', size: 22 },
    period: { x: 0.27, y: 0.34, w: 0.46, align: 'center', size: 18 },
    slots: [
      { id: 'step-1', label: '구성/단계 1', x: 0.08, y: 0.47, w: 0.25, h: 0.39, fit: 'contain', ring: true },
      { id: 'step-2', label: '구성/단계 2', x: 0.37, y: 0.47, w: 0.25, h: 0.39, fit: 'contain', ring: true },
      { id: 'step-3', label: '구성/단계 3', x: 0.66, y: 0.47, w: 0.25, h: 0.39, fit: 'contain', ring: true },
    ],
  },
  {
    id: 'radial_rewards',
    label: '중앙 상자 방사형',
    description: '대표 상자를 중심으로 핵심 보상을 원형 배치',
    title: { x: 0.18, y: 0.60, w: 0.64, align: 'center', size: 74 },
    subtitle: { x: 0.25, y: 0.75, w: 0.50, align: 'center', size: 21 },
    period: { x: 0.30, y: 0.87, w: 0.40, align: 'center', size: 18 },
    slots: [
      { id: 'main-box', label: '대표 상자', x: 0.35, y: 0.18, w: 0.30, h: 0.37, fit: 'contain' },
      { id: 'reward-1', label: '보상 1', x: 0.11, y: 0.08, w: 0.18, h: 0.22, fit: 'contain', ring: true },
      { id: 'reward-2', label: '보상 2', x: 0.71, y: 0.08, w: 0.18, h: 0.22, fit: 'contain', ring: true },
      { id: 'reward-3', label: '보상 3', x: 0.06, y: 0.35, w: 0.18, h: 0.22, fit: 'contain', ring: true },
      { id: 'reward-4', label: '보상 4', x: 0.76, y: 0.35, w: 0.18, h: 0.22, fit: 'contain', ring: true },
    ],
  },
  {
    id: 'character_reward_table',
    label: '캐릭터 + 2열 보상표',
    description: '좌측 캐릭터와 확정/추가 특전 그룹',
    title: { x:0.39, y:0.10, w:0.45, align:'center', size:34 },
    subtitle: { x:0.30, y:0.19, w:0.63, align:'center', size:20 },
    period: { x:0.31, y:0.33, w:0.60, align:'center', size:17 },
    groups: [
      { id:'fixed-group', label:'확정', x:0.27, y:0.47, w:0.33, h:0.50, color:'#126A85' },
      { id:'bonus-group', label:'추가 특전', x:0.67, y:0.47, w:0.31, h:0.50, color:'#126A85' },
    ],
    slots: [
      { id:'hero', label:'좌측 캐릭터', x:0.00, y:0.00, w:0.28, h:1.00, fit:'contain' },
      { id:'fixed-1', label:'확정 보상 1', x:0.30, y:0.55, w:0.10, h:0.15, fit:'contain' },
      { id:'fixed-2', label:'확정 보상 2', x:0.44, y:0.55, w:0.10, h:0.15, fit:'contain' },
      { id:'fixed-3', label:'확정 보상 3', x:0.52, y:0.55, w:0.10, h:0.15, fit:'contain' },
      { id:'fixed-4', label:'확정 보상 4', x:0.31, y:0.76, w:0.11, h:0.15, fit:'contain' },
      { id:'fixed-5', label:'확정 보상 5', x:0.44, y:0.76, w:0.11, h:0.15, fit:'contain' },
      { id:'fixed-6', label:'확정 보상 6', x:0.53, y:0.76, w:0.11, h:0.15, fit:'contain' },
      { id:'bonus-1', label:'추가 보상 1', x:0.70, y:0.55, w:0.11, h:0.15, fit:'contain' },
      { id:'bonus-2', label:'추가 보상 2', x:0.85, y:0.55, w:0.11, h:0.15, fit:'contain' },
      { id:'bonus-3', label:'추가 보상 3', x:0.70, y:0.76, w:0.11, h:0.15, fit:'contain' },
      { id:'bonus-4', label:'추가 보상 4', x:0.85, y:0.76, w:0.11, h:0.15, fit:'contain' },
    ],
  },
];
