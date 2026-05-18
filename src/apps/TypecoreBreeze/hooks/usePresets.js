// 프리셋 적용 로직 — 순수 함수로 추출하여 어떤 setter 묶음이든 받아 사용 가능.
// applyScriptPreset(presetId, setters): 선택된 스크립트 프리셋에 매칭되는 옵션 일괄 setter 호출.
// applyCategoryChange(cat, setters): 카테고리 변경 시 페르소나/프리셋 동기화.

export const applyScriptPreset = (presetId, s) => {
  s.setScriptType(presetId);
  if (presetId === "Calli_Brush") { s.setStemWeight("Weight_Brush"); s.setTerminalStyle("End_Brush"); s.setStrokeTexture("Tex_Watercolor"); s.setAnalogImperfection("Imp_Bleed"); s.setStrokeExtension("Ext_Elegant"); s.setLetterConnection("CursiveFlow"); }
  else if (presetId === "Casual_Bubble") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Round"); s.setStrokeSharpness("Sharp_Soft"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setTextFlow("Bouncy"); s.setPlayfulDistortion("Distort_Squeeze"); }
  else if (presetId === "Casual_Comic") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Round"); s.setStrokeTexture("Tex_Smooth"); s.setInternalDecoration("PolkaDots"); s.setRhythmDynamic("Rhythm_Bouncy"); s.setPlayfulDistortion("Distort_Squeeze"); }
  else if (presetId === "Casual_Block") { s.setStemWeight("Weight_Chunky"); s.setTerminalStyle("End_Block"); s.setStrokeTexture("Tex_Smooth"); s.setRhythmDynamic("Rhythm_Calm"); s.setPlayfulDistortion("Distort_None"); }
  else if (presetId === "Casual_Marker") { s.setStemWeight("Weight_Marker"); s.setTerminalStyle("End_Round"); s.setStrokeSharpness("Sharp_Crisp"); s.setStrokeTexture("Tex_Smooth"); s.setRhythmDynamic("Rhythm_Calm"); }
  else if (presetId === "Calli_Ribbon") { s.setStemWeight("Weight_Brush"); s.setTerminalStyle("End_Swash"); s.setStrokeSharpness("Sharp_Crisp"); s.setCharProportion("P_Slim"); s.setStrokeExtension("Ext_Elegant"); s.setLetterConnection("CursiveFlow"); }
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
};

export const applyCategoryChange = (cat, s) => {
  s.setSelectedCategory(cat);
  if (cat === 'calli') { s.setAiPersona('ink_master'); applyScriptPreset('Calli_Brush', s); }
  else if (cat === 'casual') { s.setAiPersona('bubble_pop'); applyScriptPreset('Casual_Bubble', s); }
};
