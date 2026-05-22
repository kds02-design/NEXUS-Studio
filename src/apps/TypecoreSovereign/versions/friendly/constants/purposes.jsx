// friendly 모드 — 목적 5개 카드 메타데이터.
// 각 항목은 current 의 staticOptions.purposes 에 매핑되며 친절 모드 진입 시 기본 옵션을 자동 세팅한다.
import React from 'react';
import { Crown, Image as ImageIcon, Zap, Flame, Hexagon } from 'lucide-react';

export const friendlyPurposes = [
  {
    id: 'game-logo',
    sourceId: 'Purpose_GameLogo',
    icon: <Crown className="w-7 h-7" />,
    title: '게임 로고',
    desc: '묵직한 AAA 게임 타이틀',
    accent: '#FDCB6E',
    sample: '데스나이트',
  },
  {
    id: 'brand-hero',
    sourceId: 'Purpose_BrandHero',
    icon: <ImageIcon className="w-7 h-7" />,
    title: '브랜드 히어로',
    desc: '웹사이트 상단 와이드 타이틀',
    accent: '#A29BFE',
    sample: 'AURORA',
  },
  {
    id: 'promo',
    sourceId: 'Purpose_PromoVisual',
    icon: <Zap className="w-7 h-7" />,
    title: '프로모션',
    desc: '이벤트·할인 상단 비주얼',
    accent: '#55EFC4',
    sample: 'BIG SALE',
  },
  {
    id: 'event',
    sourceId: 'Purpose_EventTitle',
    icon: <Flame className="w-7 h-7" />,
    title: '이벤트 타이틀',
    desc: '강렬한 단일 이벤트 메인',
    accent: '#FD79A8',
    sample: 'FINAL BATTLE',
  },
  {
    id: 'symbol',
    sourceId: 'Purpose_Symbol',
    icon: <Hexagon className="w-7 h-7" />,
    title: '심볼·엠블럼',
    desc: '정사각형 상징 마크',
    accent: '#6C5CE7',
    sample: 'GUILD',
  },
];

export const PURPOSE_MAP = Object.fromEntries(friendlyPurposes.map(p => [p.id, p]));
