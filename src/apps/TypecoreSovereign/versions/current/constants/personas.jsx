/* eslint-disable */
// 버전 스냅샷: TypecoreSovereign current. coreArchetypes + safetyGuards 격리 사본.
import React from 'react';
import { Crown, Swords, Database, Hexagon, Wind } from 'lucide-react';

// --- CORE ARCHETYPES (V18 SYSTEM) ---
export const coreArchetypes = [
  {
    id: 'core_fortress',
    icon: <Crown className="w-4 h-4 text-amber-400" />,
    shortTitle: "Core / Fortress (성채)",
    subtitle: "거대한 수직 기둥, 압축된 구조",
    role: "Typecore Architect. Focus on impenetrable structural mass.",
    tone: "[장엄/엄숙] 강한 구조적 압력을 강제하는 시스템 명령어 톤.",
    keywords: "monumental, dense fortress, bottom-heavy, architectural",
    language: "dominant vertical pillar rhythm, heavily compressed structural spacing, bottom-heavy mass, impenetrable solid monolith",
    weightTags: "(massive architectural pillar stems:1.4), (impenetrable thick monolithic structure:1.3), (heavily compressed spacing:1.2), bottom-heavy typographic mass",
    forbidden: "NO extreme thin lines. NO fragile/broken elements. NO fluid organic curves."
  },
  {
    id: 'core_blade',
    icon: <Swords className="w-4 h-4 text-rose-400" />,
    shortTitle: "Core / Blade (검날)",
    subtitle: "극단적 얇은 획, 날카로운 절단",
    role: "Typecore Assassin. Focus on lethal geometric precision and sharp incisions.",
    tone: "[전투/예리함] 공간을 분할하는 날카로움을 강제하는 시스템 명령어 톤.",
    keywords: "forged steel, razor-sharp, weaponized typography, slash cuts",
    language: "extreme thick/thin stroke contrast, razor-sharp incisive terminals, space-slashing geometric tension, aggressive lethal cuts",
    weightTags: "(extreme thick-thin stroke contrast:1.4), (razor-sharp blade incisive terminals:1.5), (lethal geometric space-slashing cuts:1.3)",
    forbidden: "NO soft rounded corners. NO heavy blocky mass. NO decorative floral ornaments."
  },
  {
    id: 'core_relic',
    icon: <Database className="w-4 h-4 text-amber-600" />,
    shortTitle: "Core / Relic (유물)",
    subtitle: "균열/침식/마모, 비대칭 구조",
    role: "Typecore Archaeologist. Focus on ancient weathering and asymmetrical history.",
    tone: "[고대/신비] 시간의 풍파와 유기적 손상을 묘사하는 시스템 명령어 톤.",
    keywords: "ancient, weathered, irregular erosion, broken symmetry",
    language: "broken symmetry, irregular historical erosion, ancient structural damage, time-weathered organic imperfections",
    weightTags: "(irregular ancient eroded silhouette:1.4), (time-weathered broken symmetry:1.3), (intricate microscopic cracks and damage:1.2)",
    forbidden: "NO perfectly pristine modern vectors. NO sci-fi futuristic lines. NO flawless symmetry."
  },
  {
    id: 'core_glyph',
    icon: <Hexagon className="w-4 h-4 text-indigo-400" />,
    shortTitle: "Core / Glyph (문장)",
    subtitle: "문자 → 문양화, 내부 공간 폐쇄",
    role: "Typecore Symbologist. Focus on converting text into a unified emblem seal.",
    tone: "[주술/상징] 문자를 하나의 엠블럼 덩어리로 융합하는 시스템 명령어 톤.",
    keywords: "symbolic, emblem fusion, closed counters, esoteric",
    language: "closed internal counters, emblem-like symbolic fusion, highly codified abstract letterforms, impenetrable typographic seal",
    weightTags: "(highly fused symbolic emblem structure:1.5), (closed internal negative space counters:1.3), abstract typographic seal",
    forbidden: "NO widely separated letters. NO loose airy spacing. NO simple handwriting."
  },
  {
    id: 'core_kinetic',
    icon: <Wind className="w-4 h-4 text-sky-400" />,
    shortTitle: "Core / Kinetic (동세)",
    subtitle: "흐름/방향성, 비대칭 리듬",
    role: "Typecore Animator. Focus on implied velocity and directional momentum.",
    tone: "[역동/속도] 움직임의 궤적과 비대칭 텐션을 강제하는 시스템 명령어 톤.",
    keywords: "fluid, directional momentum, aerodynamic, velocity",
    language: "aggressive directional momentum, fluid asymmetric rhythm, velocity-implied trailing structures, dynamic sweeping flow",
    weightTags: "(aggressive forward directional momentum:1.4), (fluid asymmetric trailing rhythm:1.3), aerodynamic swept-back structure",
    forbidden: "NO static perfectly vertical alignment. NO stiff blocky stability."
  }
];

// --- SAFETY GUARDS ---
export const safetyGuards = [
  { id: 'guard_mutation', label: '[L1] 텍스트 보존 락', desc: '원문 100% 유지. 철자 누락/변형 절대 금지.', fixEn: '(perfectly intact text legibility:1.4), (100% correct spelling:1.5), absolutely NO missing letters' },
  { id: 'guard_3d', label: '[L6] 2D 평면 강제 락', desc: '뎁스, 베벨, 그림자 생성 원천 차단.', fixEn: '(strictly zero perspective distortion:1.5), (flat focal plane:1.4), absolutely NO rear extrusion' },
  { id: 'guard_layout', label: '[L2] 세로 붕괴 방지 락', desc: '세로 찌그러짐/늘어남 방지. 1:1 골격 강제.', fixEn: '(strictly normal horizontal text proportions:1.5), (perfect text baseline:1.4), NO vertical stretching, NO tall letters' },
  { id: 'guard_noise', label: '[L7] VFX 억제 락', desc: '실루엣을 해치는 부유물 및 파편 제거.', fixEn: '(clear cutout text shape:1.4), (flawless outer silhouette boundary:1.3), NO floating noise' }
];
