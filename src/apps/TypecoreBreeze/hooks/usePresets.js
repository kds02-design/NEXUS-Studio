// 프리셋 적용 로직 — 순수 함수로 추출하여 어떤 setter 묶음이든 받아 사용 가능.
// applyScriptPreset(presetId, setters): 선택된 스크립트 프리셋에 매칭되는 옵션 일괄 setter 호출.
// applyCategoryChange(cat, setters): 카테고리 변경 시 페르소나/프리셋 동기화.

// 효과(스타일) → 가장 잘 맞는 페르소나 + 카테고리 매핑.
// 효과 갤러리에서 스타일을 고르면 페르소나를 함께 맞춰 [MORPHOLOGY]·[DIRECTOR PERSONA] 충돌을 방지.
// (사용자는 이후 페르소나를 수동으로 바꿔 의도적 믹스도 가능.)
const PERSONA_FOR_STYLE = {
  Calli_Brush:       ["ink_master", "calli"],
  Calli_Ribbon:      ["flourish_artist", "calli"],
  Diary_Pen:         ["monoline_crafter", "calli"],
  Calli_Ink:         ["ink_master", "calli"],
  Calli_Modern:      ["ink_master", "calli"],
  Calli_DryBrush:    ["ink_master", "calli"],
  Calli_Marker:      ["flourish_artist", "calli"],
  Casual_Bubble:     ["bubble_pop", "casual"],
  Casual_Jelly:      ["bubble_pop", "casual"],
  Casual_Marker:     ["bubble_pop", "casual"],
  Casual_Comic:      ["comic_artist", "casual"],
  Casual_Block:      ["block_architect", "casual"],
  Casual_Emblem:     ["block_architect", "casual"],
  Casual_Variety:    ["variety_director", "casual"],
  Casual_Racing:     ["action_retro", "casual"],
  Street_Graffiti:   ["action_retro", "casual"],
  Casual_Grunge:     ["action_retro", "casual"],
  Vintage_Chalk:     ["action_retro", "casual"],
  Casual_RetroChalk: ["action_retro", "casual"],
  Casual_Idol:       ["idol_trendsetter", "casual"],
  Casual_StencilBlock: ["block_architect", "casual"],
};

export const applyScriptPreset = (presetId, s) => {
  s.setScriptType(presetId);
  // 효과에 맞는 페르소나/카테고리 자동 동기화 — 충돌 방지.
  const pc = PERSONA_FOR_STYLE[presetId];
  if (pc) { s.setAiPersona?.(pc[0]); s.setSelectedCategory?.(pc[1]); }
  if (presetId === "Calli_Brush") { s.setStemWeight("Weight_Brush"); s.setTerminalStyle("End_Brush"); s.setStrokeTexture("Tex_Watercolor"); s.setAnalogImperfection("Imp_Bleed"); s.setStrokeExtension("Ext_Elegant"); s.setLetterConnection("CursiveFlow"); }
  else if (presetId === "Casual_Bubble") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Round"); s.setStrokeSharpness("Sharp_Soft"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setTextFlow("Bouncy"); s.setPlayfulDistortion("Distort_Squeeze"); }
  else if (presetId === "Casual_Comic") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Round"); s.setStrokeTexture("Tex_Smooth"); s.setInternalDecoration("PolkaDots"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setPlayfulDistortion("Distort_Squeeze"); }
  else if (presetId === "Casual_Block") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Block"); s.setStrokeTexture("Tex_Smooth"); s.setRhythmDynamic("Rhythm_Calm"); s.setPlayfulDistortion("Distort_None"); }
  else if (presetId === "Casual_Marker") { s.setStemWeight("Weight_Marker"); s.setTerminalStyle("End_Round"); s.setStrokeSharpness("Sharp_Crisp"); s.setStrokeTexture("Tex_Smooth"); s.setRhythmDynamic("Rhythm_Calm"); }
  else if (presetId === "Calli_Ribbon") { s.setStemWeight("Weight_Brush"); s.setTerminalStyle("End_Swash"); s.setStrokeSharpness("Sharp_Crisp"); s.setCharProportion("P_Slim"); s.setStrokeExtension("Ext_Elegant"); s.setLetterConnection("CursiveFlow"); }
  // 수묵 먹글씨 — 전통 동양 붓글씨. 젖은 먹 번짐 + 부드러운 붓끝 + 명상적 여백(개별 분리).
  else if (presetId === "Calli_Ink") { s.setStemWeight("Weight_Brush"); s.setTerminalStyle("End_Brush"); s.setStrokeTexture("Tex_Watercolor"); s.setStrokeSharpness("Sharp_Soft"); s.setAnalogImperfection("Imp_Bleed"); s.setStrokeExtension("Ext_None"); s.setRhythmDynamic("Rhythm_Calm"); s.setLetterConnection("Separated"); s.setTextFlow("Straight"); s.setSlantAngle("Slant_0"); }
  // 모던 캘리 — 깔끔·자신감 있는 붓 선, 살짝 바운스. 디지털 클린(번짐 없음).
  else if (presetId === "Calli_Modern") { s.setStemWeight("Weight_Brush"); s.setTerminalStyle("End_Brush"); s.setStrokeTexture("Tex_Smooth"); s.setStrokeSharpness("Sharp_Crisp"); s.setAnalogImperfection("Imp_None"); s.setStrokeExtension("Ext_Playful"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setLetterConnection("CursiveFlow"); s.setTextFlow("Bouncy"); s.setSlantAngle("Slant_Casual"); }
  // 갈필 마른붓 — 거친 마찰 갈라짐 + 빠른 속도감 + 사선.
  else if (presetId === "Calli_DryBrush") { s.setStemWeight("Weight_Brush"); s.setTerminalStyle("End_Brush"); s.setStrokeTexture("Tex_Grunge"); s.setStrokeSharpness("Sharp_Crisp"); s.setAnalogImperfection("Imp_RoughEdge"); s.setStrokeExtension("Ext_None"); s.setRhythmDynamic("Rhythm_Fast"); s.setSlantAngle("Slant_Italic"); s.setLetterConnection("Separated"); s.setTextFlow("Straight"); }
  // 브러시 마커 — 매끈한 붓펜 마커, 경쾌한 플릭.
  else if (presetId === "Calli_Marker") { s.setStemWeight("Weight_Marker"); s.setTerminalStyle("End_Brush"); s.setStrokeTexture("Tex_Smooth"); s.setStrokeSharpness("Sharp_Crisp"); s.setStrokeExtension("Ext_Playful"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setSlantAngle("Slant_Casual"); s.setLetterConnection("CursiveFlow"); s.setTextFlow("Bouncy"); }
  else if (presetId === "Casual_Jelly") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Round"); s.setPlayfulDistortion("Distort_Jelly"); s.setStrokeSharpness("Sharp_Soft"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setInternalDecoration("Highlight"); }
  else if (presetId === "Street_Graffiti") { s.setCharProportion("P_Condensed"); s.setStemWeight("Weight_Marker"); s.setTerminalStyle("End_Brush"); s.setRhythmDynamic("Rhythm_Fast"); s.setLetterConnection("Overlapping"); s.setCasualSurrounding("Splatter"); }
  else if (presetId === "Vintage_Chalk") { s.setTerminalStyle("End_Blunt"); s.setStrokeTexture("Tex_Chalk"); s.setAnalogImperfection("Imp_RoughEdge"); s.setCharProportion("P_Std"); s.setInternalDecoration("Hatched"); }
  else if (presetId === "Diary_Pen") { s.setStemWeight("Weight_Thin"); s.setTerminalStyle("End_Round"); s.setStrokeSharpness("Sharp_Crisp"); s.setRhythmDynamic("Rhythm_Calm"); s.setSlantAngle("Slant_0"); s.setTextFlow("Straight"); }
  else if (presetId === "Casual_RetroChalk") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Blunt"); s.setStrokeTexture("Tex_DustyChalk"); s.setAnalogImperfection("Imp_ChalkSmudge"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setInternalDecoration("Hatched_Chalk"); }
  else if (presetId === "Casual_Variety") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Round"); s.setInternalDecoration("Extruded3D"); s.setStrokeSharpness("Sharp_Crisp"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setCasualSurrounding("Clean"); }
  else if (presetId === "Casual_Emblem") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Blunt"); s.setTextFlow("Arch"); s.setCasualSurrounding("RibbonBanner"); s.setRhythmDynamic("Rhythm_Calm"); s.setInternalDecoration("Solid"); }
  else if (presetId === "Casual_Racing") { s.setStemWeight("Weight_Marker"); s.setTerminalStyle("End_Blunt"); s.setSlantAngle("Slant_Italic"); s.setPlayfulDistortion("Distort_SpeedCut"); s.setCasualSurrounding("SpeedLines"); s.setRhythmDynamic("Rhythm_Fast"); }
  else if (presetId === "Casual_Idol") { s.setStemWeight("Weight_Thin"); s.setTerminalStyle("End_Round"); s.setStrokeSharpness("Sharp_Soft"); s.setInternalDecoration("Solid"); s.setCasualSurrounding("Sparkles"); s.setRhythmDynamic("Rhythm_Calm"); }
  else if (presetId === "Casual_Grunge") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Blunt"); s.setStrokeTexture("Tex_Grunge"); s.setCasualSurrounding("Clean"); s.setSlantAngle("Slant_0"); s.setRhythmDynamic("Rhythm_Calm"); }
  // 스텐실 블록 — 첨부 레퍼런스(두꺼운 기하 블록 스탬프) 형태. 질감(거친 잉크)은 Micro-Edit 의 "잉크 스탬프"로 얹음.
  else if (presetId === "Casual_StencilBlock") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Block"); s.setStrokeTexture("Tex_Smooth"); s.setStrokeSharpness("Sharp_Crisp"); s.setCharProportion("P_Std"); s.setRhythmDynamic("Rhythm_Calm"); s.setSlantAngle("Slant_0"); s.setPlayfulDistortion("Distort_None"); s.setInternalDecoration("Solid"); s.setLetterConnection("Separated"); s.setCasualSurrounding("Clean"); }
};

export const applyCategoryChange = (cat, s) => {
  s.setSelectedCategory(cat);
  if (cat === 'calli') { s.setAiPersona('ink_master'); applyScriptPreset('Calli_Brush', s); }
  else if (cat === 'casual') { s.setAiPersona('bubble_pop'); applyScriptPreset('Casual_Bubble', s); }
};
