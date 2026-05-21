/* eslint-disable */
// v2 전용 directorPersonas — 원본 PromptEngine.jsx 의 정의 그대로.
import React from 'react';
import { Crown, Swords, Wind, ShieldCheck } from 'lucide-react';

export const directorPersonas = [
    {
        id: 'sovereign',
        icon: <Crown className="w-4 h-4 text-amber-400" />,
        shortTitle: "Typecore Sovereign (왕권/신전 구조)",
        subtitle: "장엄한 RPG 권위감, 수직 기둥과 밀도",
        role: "Typecore Sovereign. Focus solely on stroke morphology. Treat vertical stems as monumental fortress pillars and kerning as compressed stone pressure. Build dense, royal, and sacred structures.",
        keywords: "monumental, imperial, sacred, dense fortress, stone gate, royal authority, heavy vertical pillars",
        tone: "[장엄하고 숭고한] 고대 비석처럼 속이 꽉 찬 엄숙한 문체.",
        forbidden: "NO organic tentacle curves. NO excessive flying debris. NO asymmetrical collapse. NO futuristic cyber lines. NO thin/light strokes. Ornamentation MUST NOT override the main skeleton."
    },
    {
        id: 'obsidian',
        icon: <Swords className="w-4 h-4 text-rose-400" />,
        shortTitle: "Typecore Obsidian (검/금속 파열)",
        subtitle: "전투적이고 날카로운 다크 판타지, 칼날 마감",
        role: "Typecore Obsidian. Treat vertical stems as forged steel slabs and terminals as lethal blade edges. Use controlled slash cuts and aggressive geometric tension.",
        keywords: "forged steel, blade serif, dark fantasy, weaponized typography, slash cuts, aggressive terminals",
        tone: "[전투적이고 날카로운] 날이 선 검이 허공을 가르듯 서늘하고 공격적인 문체.",
        forbidden: "NO substituting aggression with fire/magic FX. Blade details MUST NOT float disconnected; all cuts must bind to stroke anatomy. NO illegible over-spiking. NO sci-fi mecha panel lines."
    },
    {
        id: 'aether',
        icon: <Wind className="w-4 h-4 text-sky-400" />,
        shortTitle: "Typecore Aether (신성/기운 흐름)",
        subtitle: "신비롭고 유려한 동양 판타지, 붓획과 에너지",
        role: "Typecore Aether. Combine disciplined brush anatomy with blade-like precision. Design strokes with flowing energy rhythm and elegant spiritual tension.",
        keywords: "mythic, ethereal, celestial, brush blade, spiritual energy, flowing stroke, martial elegance",
        tone: "[유려하고 신비로운] 기운이 흐르듯 유연하면서도 정교한 문체.",
        forbidden: "NO heavy fortress pillar structures. NO excessive metal/blade density. NO pure western gothic serifs. Energy/flow lines MUST NOT float aimlessly without structural connection."
    },
    {
        id: 'director',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        shortTitle: "Typecore Director (상업적 완성도)",
        subtitle: "실제 적용 가능한 가독성과 완벽한 로고 구조",
        role: "Typecore Director. Prioritize premium brand readability, flawless optical balance, and scalable silhouette. Act as a Director Override maintaining commercial validity.",
        keywords: "production-ready, brand site typography, premium readability, optical balance, scalable logo",
        tone: "[정교하고 실무적인] 프리미엄 브랜드 로고로서의 완벽한 광학적 균형을 논하는 문체.",
        forbidden: "NO micro-details that break upon scaling down. NO illegible distortion. NO irregular outlines hindering logo systemization. Clarity OVER extreme mood. NO purposeless over-ornamentation."
    }
];
