export const DEFAULT_SOVEREIGN_OPTIONS = Object.freeze({
  stemWeight: 'Stem_Heavy', charWidth: 'Normal', charProportion: 'P_Std', kerning: 'Kern_Std',
  terminalStyle: 'Term_Chisel', strokeTexture: 'Tex_Clean', strokeSharpness: 'Sharp_Std',
  strokeExtension: 'Ext_None', cornerStyle: 'Corner_Right', slantAngle: 'Slant_0',
  kineticVelocity: 'Vel_Static', slicingIntensity: 'Slic_None', deformationDamage: 'Damage_None',
  letterConnection: 'Conn_Indep', internalSpace: 'Space_Std', logoDegree: 'Logo_Std',
});

// UI와 MCP가 공유하는 페르소나별 시작점. 사용자가 직접 지정한 값이 최종 우선이다.
export const PERSONA_MODIFIERS = Object.freeze({
  core_fortress: { stemWeight: 'Stem_Ultra', strokeTexture: 'Tex_Clean', deformationDamage: 'Damage_None' },
  core_blade: { stemWeight: 'Stem_Heavy', terminalStyle: 'Term_Blade', strokeSharpness: 'Sharp_Razor', kineticVelocity: 'Vel_Slashing' },
  core_relic: { deformationDamage: 'Damage_Erosion', strokeTexture: 'Tex_Subtle', letterConnection: 'Conn_Indep' },
  core_glyph: { letterConnection: 'Conn_Full', logoDegree: 'Logo_Emblem', kerning: 'Kern_Tight' },
  core_kinetic: { kineticVelocity: 'Vel_Swift', slantAngle: 'Slant_Forward', strokeExtension: 'Ext_Razor' },
  core_cinema: { stemWeight: 'Stem_Light', terminalStyle: 'Term_Serif', strokeSharpness: 'Sharp_Crisp', kerning: 'Kern_Loose', strokeTexture: 'Tex_Subtle' },
});

export const SCRIPT_PRESETS = Object.freeze({
  Shape_Clean: { stemWeight: 'Stem_Std', terminalStyle: 'Term_Clean', strokeSharpness: 'Sharp_Std', kineticVelocity: 'Vel_Static', slantAngle: 'Slant_0', charProportion: 'P_Std', strokeTexture: 'Tex_Clean' },
  Shape_Massive: { stemWeight: 'Stem_Ultra', terminalStyle: 'Term_Slab', strokeSharpness: 'Sharp_Std', kineticVelocity: 'Vel_Static', charWidth: 'Wide' },
  Shape_Blade: { stemWeight: 'Stem_Heavy', terminalStyle: 'Term_Blade', strokeSharpness: 'Sharp_Razor', kineticVelocity: 'Vel_Slashing' },
  Shape_Thorn: { stemWeight: 'Stem_Std', terminalStyle: 'Term_Thorn', strokeSharpness: 'Sharp_Razor', charProportion: 'P_Condensed' },
  Shape_Elegant: { stemWeight: 'Stem_Light', terminalStyle: 'Term_Serif', strokeSharpness: 'Sharp_Crisp', kineticVelocity: 'Vel_Static' },
  Shape_Round: { stemWeight: 'Stem_Heavy', terminalStyle: 'Term_Round', strokeSharpness: 'Sharp_Soft', cornerStyle: 'Corner_Round' },
  Shape_Speed: { stemWeight: 'Stem_Std', terminalStyle: 'Term_Blade', strokeSharpness: 'Sharp_Crisp', kineticVelocity: 'Vel_Swift', slantAngle: 'Slant_Forward' },
  Shape_Brush: { stemWeight: 'Stem_Heavy', terminalStyle: 'Term_BrushFray', strokeTexture: 'Tex_DryBrush', kineticVelocity: 'Vel_Swift' },
  Shape_Blackletter: { stemWeight: 'Stem_Heavy', terminalStyle: 'Term_Thorn', strokeSharpness: 'Sharp_Crisp', charProportion: 'P_Condensed', kerning: 'Kern_Tight', cornerStyle: 'Corner_Wedge' },
  Shape_Cinema: { stemWeight: 'Stem_Light', terminalStyle: 'Term_Serif', strokeSharpness: 'Sharp_Crisp', strokeTexture: 'Tex_Subtle', deformationDamage: 'Damage_Erosion', kerning: 'Kern_Loose', persona: 'core_cinema' },
});

export function resolveSovereignOptions({ archetype = 'core_fortress', preset = '', overrides = {} } = {}) {
  const presetOptions = SCRIPT_PRESETS[preset] || {};
  const resolvedArchetype = presetOptions.persona || archetype;
  const presetFields = { ...presetOptions };
  delete presetFields.persona;
  return {
    archetype: resolvedArchetype,
    preset,
    options: {
      ...DEFAULT_SOVEREIGN_OPTIONS,
      ...(PERSONA_MODIFIERS[resolvedArchetype] || {}),
      ...presetFields,
      ...overrides,
    },
  };
}
