/* eslint-disable */
// v1 전용 사이드바 (editor + edit 양 모드 통합).
import React from 'react';
import {
    Smile, Sparkles, Box, Palette, Layers, ImagePlus, MessageSquare,
    Eraser, PenTool, Scissors, Star, CheckCircle,
} from 'lucide-react';
import { DropdownControl, ImageDropzone, ToggleControl } from './Controls.jsx';
import { DIRECTOR_PERSONAS, PRESET_GROUPS, EDIT_BUDGETS, staticOptions } from '../constants/options.js';

export default function Sidebar(props) {
    const {
        currentView, setCurrentView,
        // creation state
        directorPersona, typographyScale, shapeFeel, shapeFidelity,
        baseStyle, colorPalette, outlineStyle, depthStyle, fxStyle, background,
        userIntent, vfxPassMode,
        // ref image
        refImage, isAnalyzingRef, isDraggingRef, setIsDraggingRef,
        handleRefImageUpload, setRefImage, setExtractedRefDetails, setShapeFidelity,
        setDirectorPersona, setBaseStyle, setColorPalette, setEditBaseStyle, setEditColorPalette,
        // preset
        activePresetGroup, setActivePresetGroup, activePresetId, isPresetModified, handleApplyPreset,
        // custom intent
        handleExpandIntent, isExpandingIntent, openChatModal,
        // edit mode state
        editImage, setEditImage, editBudget, activeEditIntents,
        editBaseStyle, editColorPalette, editOutlineStyle, editFxStyle, editBg,
        editIntent, editVfxPassMode,
        isDraggingEdit, setIsDraggingEdit,
        // change handler
        handleChange, setUserIntent, setTypographyScale, setShapeFeel,
        setOutlineStyle, setDepthStyle, setFxStyle, setBackground, setVfxPassMode,
        setEditVfxPassMode, setActiveEditIntents, setEditBudget,
        setEditOutlineStyle, setEditFxStyle, setEditBg, setEditIntent,
    } = props;

    return (
        <aside className="w-[340px] bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col shrink-0 shadow-2xl overflow-y-auto custom-scrollbar relative z-10">
            <div className="p-6 border-b border-zinc-800">
                <h1 className="text-xl font-black text-white">Render Matrix: <span className="text-pink-400">Pop</span></h1>
                <span className="text-[10px] font-bold text-zinc-500">v2.2 - Cinematic Faceted Steal</span>
            </div>

            <div className="p-6 space-y-6">

                <div className="flex bg-[#121214] p-1.5 rounded-xl border border-zinc-800/80 shadow-inner">
                    <button onClick={() => setCurrentView('editor')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${currentView === 'editor' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <PenTool className="w-3.5 h-3.5 shrink-0" /> Pop Creation
                    </button>
                    <button onClick={() => setCurrentView('edit')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${currentView === 'edit' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <Eraser className="w-3.5 h-3.5 shrink-0" /> Pop Remix
                    </button>
                </div>

                {currentView === "editor" && (
                    <>
                        {/* Persona */}
                        <div className={`space-y-3 p-4 transition-all ${directorPersona === 'AutoRef' ? 'bg-emerald-950/10 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-pink-950/10 border border-pink-500/20'} rounded-xl relative`}>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <Smile className={`w-4 h-4 ${directorPersona === 'AutoRef' ? 'text-emerald-400' : 'text-pink-400'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${directorPersona === 'AutoRef' ? 'text-emerald-400' : 'text-pink-400'}`}>
                                    AI Director Persona {directorPersona === 'AutoRef' && '(Auto)'}
                                </span>
                            </div>
                            <DropdownControl data={DIRECTOR_PERSONAS.map(p => ({ id: p.id, name: p.name }))} value={directorPersona} onChange={handleChange(setDirectorPersona)} disabled={vfxPassMode} />
                        </div>

                        {/* Reference Image Upload */}
                        <div className={`space-y-3 pt-2 transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <ImagePlus className="w-4 h-4 shrink-0" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Style/Color Reference</h3>
                                </div>
                                {refImage && !isAnalyzingRef && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">Auto Override</span>}
                            </div>
                            <ImageDropzone
                                image={refImage}
                                isLoading={isAnalyzingRef}
                                onClear={(e) => {
                                    e.stopPropagation();
                                    setRefImage(null);
                                    setExtractedRefDetails("");
                                    setShapeFidelity("Strict");
                                    if (directorPersona === "AutoRef") setDirectorPersona("CasualUI");
                                    if (baseStyle === "AutoRef") { setBaseStyle("PopChrome"); setEditBaseStyle("PopChrome"); }
                                    if (colorPalette === "AutoRef") { setColorPalette("VividPop"); setEditColorPalette("VividPop"); }
                                }}
                                onUpload={(e) => handleRefImageUpload(e.target.files[0])}
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingRef(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDraggingRef(false); }}
                                onDrop={(e) => { e.preventDefault(); setIsDraggingRef(false); handleRefImageUpload(e.dataTransfer.files[0]); }}
                                isDragging={isDraggingRef}
                                title="COLOR & STYLE UPLOAD"
                                sub="가져오고 싶은 색감이나 분위기 이미지"
                                icon={Palette}
                                heightClass="h-28"
                            />
                        </div>

                        {/* Presets */}
                        <div className={`transition-all duration-300 ${refImage ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 pl-1 flex justify-between items-center">
                                Theme Presets
                                {refImage && <span className="text-[8px] text-amber-500 font-normal normal-case">레퍼런스 모드 작동 중</span>}
                            </label>
                            <div className="flex gap-1 bg-[#121214] p-1 rounded-xl border border-zinc-800/80 mb-2 shadow-inner">
                                {PRESET_GROUPS.map(group => (
                                    <button key={group.id} onClick={() => setActivePresetGroup(group.id)} className={`flex-1 text-[10px] py-2 rounded-lg transition-colors font-bold flex items-center justify-center gap-1 ${activePresetGroup === group.id ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                        {group.icon} {group.name}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col gap-1.5 p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                {PRESET_GROUPS.find(g => g.id === activePresetGroup)?.presets.map(p => {
                                    const isSelected = activePresetId === p.id && !refImage;
                                    return (
                                        <button key={p.id} onClick={() => handleApplyPreset(p)} className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all group flex flex-col gap-0.5 ${isSelected ? (isPresetModified ? 'bg-amber-950/20 border-amber-500/40 shadow-sm' : 'bg-pink-950/20 border-pink-500/40 shadow-sm') : 'bg-[#1A1A1E] hover:bg-zinc-800 border-zinc-800 hover:border-zinc-600 text-zinc-300'}`}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`text-[11px] font-bold transition-colors flex items-center gap-1.5 ${isSelected ? (isPresetModified ? 'text-amber-400' : 'text-pink-400') : 'text-white'}`}>
                                                    {isSelected && !isPresetModified && <CheckCircle className="w-3.5 h-3.5" />} {p.label}
                                                </span>
                                            </div>
                                            <span className="text-[9px] text-zinc-500 truncate w-full">{p.settings.userIntent}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Intent */}
                        <div className="space-y-1 pt-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Custom Directive</label>
                            <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-pink-500 transition-all shadow-inner">
                                <textarea value={userIntent} onChange={e => handleChange(setUserIntent)(e.target.value)} placeholder="원하는 분위기 (예: 슬라임처럼 녹아내리는 느낌)" className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600" />
                                <div className="flex justify-end gap-1 p-1 bg-transparent border-t border-zinc-800">
                                    <button onClick={handleExpandIntent} disabled={isExpandingIntent || !userIntent} className="p-1.5 text-zinc-400 hover:text-pink-400" title="구체화"><Sparkles className="w-3.5 h-3.5" /></button>
                                    <button onClick={openChatModal} className="p-1.5 text-zinc-400 hover:text-pink-400"><MessageSquare className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        </div>

                        {/* Shape Feel */}
                        <div className={`space-y-3 p-4 bg-orange-950/10 border border-orange-500/20 rounded-xl transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 text-orange-400 mb-2">
                                <Box className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Shape Feel (형태감)</span>
                            </div>
                            <DropdownControl label="Scale (화면 비중)" data={staticOptions.typographyScales} value={typographyScale} onChange={handleChange(setTypographyScale)} />
                            <DropdownControl label="Corner & Volume (표면 볼륨)" data={staticOptions.shapeFeels} value={shapeFeel} onChange={handleChange(setShapeFeel)} />

                            <div className="pt-2 border-t border-orange-500/20">
                                <DropdownControl label="Shape Fidelity (형태 보존력)" data={staticOptions.fidelityLevels} value={shapeFidelity} onChange={handleChange(setShapeFidelity)} />
                            </div>
                        </div>

                        {/* Color & Material */}
                        <div className={`space-y-3 p-4 transition-all ${baseStyle === 'AutoRef' ? 'bg-emerald-950/10 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-cyan-950/10 border border-cyan-500/20'} rounded-xl ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Palette className={`w-4 h-4 ${baseStyle === 'AutoRef' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${baseStyle === 'AutoRef' ? 'text-emerald-400' : 'text-cyan-400'}`}>Color & Material (재질)</span>
                            </div>
                            <DropdownControl label="Base Material (베이스 재질)" data={staticOptions.baseStyles} value={baseStyle} onChange={handleChange(setBaseStyle)} disabled={baseStyle === 'AutoRef'} />
                            <DropdownControl label="Color Palette (색상 팔레트)" data={staticOptions.colorPalettes} value={colorPalette} onChange={handleChange(setColorPalette)} disabled={colorPalette === 'AutoRef'} />
                        </div>

                        {/* Outline & Depth */}
                        <div className={`space-y-3 transition-opacity ${vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                            <DropdownControl label="Outline Style (외곽선)" data={staticOptions.outlineStyles} value={outlineStyle} onChange={handleChange(setOutlineStyle)} />
                            <DropdownControl label="Depth & Shadow (입체/그림자)" data={staticOptions.depthStyles} value={depthStyle} onChange={handleChange(setDepthStyle)} />
                        </div>

                        {/* Decorations & Env */}
                        <div className="space-y-3 pt-4 border-t border-zinc-800">
                            <DropdownControl label="Decoration FX (장식 이펙트)" data={staticOptions.fxStyles} value={fxStyle} onChange={handleChange(setFxStyle)} />

                            <ToggleControl
                                label="VFX 소스 분리 렌더링 모드"
                                desc="타이포를 블랙아웃시키고 이펙트만 추출합니다."
                                enabled={vfxPassMode}
                                onChange={() => handleChange(setVfxPassMode)(!vfxPassMode)}
                                colorClass="bg-pink-500"
                            />

                            <DropdownControl label="Background (배경)" data={staticOptions.backgrounds} value={background} onChange={handleChange(setBackground)} />
                        </div>
                    </>
                )}

                {currentView === "edit" && (
                    <>
                        <div className="space-y-3">
                            <div
                                onClick={() => handleChange(setEditVfxPassMode)(!editVfxPassMode)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all shadow-md group ${editVfxPassMode ? 'bg-pink-500/20 border-pink-500/50' : 'bg-black/30 border-zinc-700/50 hover:bg-black/50 hover:border-zinc-500'}`}
                            >
                                <div className={`p-1.5 rounded-lg ${editVfxPassMode ? 'bg-pink-500' : 'bg-zinc-800'}`}>
                                    <Scissors className={`w-4 h-4 ${editVfxPassMode ? 'text-white' : 'text-zinc-400'}`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-[11px] font-bold ${editVfxPassMode ? 'text-pink-400' : 'text-zinc-300'}`}>VFX 소스 분리 매트 패스</span>
                                    <span className="text-[9px] text-zinc-500">타이포를 블랙아웃하고 이펙트만 추출</span>
                                </div>
                                <div className={`ml-auto w-3 h-3 rounded-full border ${editVfxPassMode ? 'border-pink-400 bg-pink-400' : 'border-zinc-600 bg-transparent'}`} />
                            </div>

                            <div className={`space-y-3 p-4 transition-all ${directorPersona === 'AutoRef' ? 'bg-emerald-950/10 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-pink-950/10 border border-pink-500/20'} rounded-xl relative ${editVfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                                <div className="flex items-center gap-2 mb-2 relative z-10">
                                    <Smile className={`w-4 h-4 ${directorPersona === 'AutoRef' ? 'text-emerald-400' : 'text-pink-400'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${directorPersona === 'AutoRef' ? 'text-emerald-400' : 'text-pink-400'}`}>
                                        AI Director Persona {directorPersona === 'AutoRef' && '(Auto)'}
                                    </span>
                                </div>
                                <DropdownControl data={DIRECTOR_PERSONAS.map(p => ({ id: p.id, name: p.name }))} value={directorPersona} onChange={handleChange(setDirectorPersona)} />
                            </div>

                            <ImageDropzone image={editImage} onClear={(e) => { e.stopPropagation(); setEditImage(null); }} onUpload={(e) => { if (e.target.files[0]) { const r = new FileReader(); r.onload = () => setEditImage(r.result); r.readAsDataURL(e.target.files[0]); } }} onDragOver={(e) => { e.preventDefault(); setIsDraggingEdit(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDraggingEdit(false); }} onDrop={(e) => { e.preventDefault(); setIsDraggingEdit(false); if (e.dataTransfer.files[0]) { const r = new FileReader(); r.onload = () => setEditImage(r.result); r.readAsDataURL(e.dataTransfer.files[0]); } }} isDragging={isDraggingEdit} title="TARGET UPLOAD" sub="리믹스할 원본 로고 이미지" icon={ImagePlus} heightClass="h-40" />
                        </div>

                        <div className="space-y-1 pt-4 border-t border-zinc-800/80">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Custom Directive</label>
                            <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-pink-500 shadow-inner">
                                <textarea value={editIntent} onChange={e => handleChange(setEditIntent)(e.target.value)} placeholder="원하는 분위기..." className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar" />
                            </div>
                        </div>

                        <div className={`pt-4 border-t border-zinc-800/80 space-y-3 ${editVfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
                            <DropdownControl label="Edit Budget (형태 변형 허용)" data={EDIT_BUDGETS} value={editBudget} onChange={handleChange(setEditBudget)} />
                        </div>

                        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                            <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                <Layers className="w-4 h-4 shrink-0" />
                                <h3 className="text-[10px] font-bold uppercase tracking-widest">Edit Scope (레이어)</h3>
                            </div>
                            <div className="flex flex-col gap-2">

                                <div className={`rounded-xl border transition-all ${activeEditIntents.material ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${editVfxPassMode ? 'hidden' : ''}`}>
                                    <div onClick={() => handleChange(setActiveEditIntents)(p => ({ ...p, material: !p.material }))} className="p-3 cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-3"><Palette className={`w-4 h-4 ${activeEditIntents.material ? 'text-cyan-400' : 'text-zinc-500'}`} />
                                            <div className="flex flex-col"><span className={`text-[11px] font-bold ${activeEditIntents.material ? 'text-white' : 'text-zinc-300'}`}>재질 덮어쓰기</span></div>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full border ${activeEditIntents.material ? 'border-cyan-400 bg-cyan-400' : 'border-zinc-600 bg-transparent'}`} />
                                    </div>
                                    {activeEditIntents.material && (
                                        <div className="p-3 bg-black/20 border-t border-cyan-500/20 space-y-3">
                                            <DropdownControl label="Target Material" data={staticOptions.baseStyles.filter(s => s.id !== 'AutoRef')} value={editBaseStyle} onChange={handleChange(setEditBaseStyle)} />
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-xl border transition-all ${activeEditIntents.color ? 'bg-orange-500/10 border-orange-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${editVfxPassMode ? 'hidden' : ''}`}>
                                    <div onClick={() => handleChange(setActiveEditIntents)(p => ({ ...p, color: !p.color }))} className="p-3 cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-3"><Smile className={`w-4 h-4 ${activeEditIntents.color ? 'text-orange-400' : 'text-zinc-500'}`} />
                                            <div className="flex flex-col"><span className={`text-[11px] font-bold ${activeEditIntents.color ? 'text-white' : 'text-zinc-300'}`}>색상 팔레트</span></div>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full border ${activeEditIntents.color ? 'border-orange-400 bg-orange-400' : 'border-zinc-600 bg-transparent'}`} />
                                    </div>
                                    {activeEditIntents.color && (
                                        <div className="p-3 bg-black/20 border-t border-orange-500/20 space-y-3">
                                            <DropdownControl label="Target Colors" data={staticOptions.colorPalettes.filter(s => s.id !== 'AutoRef')} value={editColorPalette} onChange={handleChange(setEditColorPalette)} />
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-xl border transition-all ${activeEditIntents.outline ? 'bg-pink-500/10 border-pink-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${editVfxPassMode ? 'hidden' : ''}`}>
                                    <div onClick={() => handleChange(setActiveEditIntents)(p => ({ ...p, outline: !p.outline }))} className="p-3 cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-3"><Box className={`w-4 h-4 ${activeEditIntents.outline ? 'text-pink-400' : 'text-zinc-500'}`} />
                                            <div className="flex flex-col"><span className={`text-[11px] font-bold ${activeEditIntents.outline ? 'text-white' : 'text-zinc-300'}`}>외곽선 변경</span></div>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full border ${activeEditIntents.outline ? 'border-pink-400 bg-pink-400' : 'border-zinc-600 bg-transparent'}`} />
                                    </div>
                                    {activeEditIntents.outline && (
                                        <div className="p-3 bg-black/20 border-t border-pink-500/20 space-y-3">
                                            <DropdownControl label="Outline" data={staticOptions.outlineStyles} value={editOutlineStyle} onChange={handleChange(setEditOutlineStyle)} />
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-xl border transition-all ${activeEditIntents.vfx || editVfxPassMode ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                                    <div onClick={() => !editVfxPassMode && handleChange(setActiveEditIntents)(p => ({ ...p, vfx: !p.vfx }))} className="p-3 cursor-pointer flex items-center justify-between group">
                                        <div className="flex items-center gap-3"><Star className={`w-4 h-4 ${activeEditIntents.vfx || editVfxPassMode ? 'text-indigo-400' : 'text-zinc-500'}`} />
                                            <div className="flex flex-col"><span className={`text-[11px] font-bold ${activeEditIntents.vfx || editVfxPassMode ? 'text-white' : 'text-zinc-300'}`}>장식/이펙트</span></div>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full border ${activeEditIntents.vfx || editVfxPassMode ? 'border-indigo-400 bg-indigo-400' : 'border-zinc-600 bg-transparent'}`} />
                                    </div>
                                    {(activeEditIntents.vfx || editVfxPassMode) && (
                                        <div className="p-3 bg-black/20 border-t border-indigo-500/20 space-y-3">
                                            <DropdownControl label="FX Style" data={staticOptions.fxStyles} value={editFxStyle} onChange={handleChange(setEditFxStyle)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                            <DropdownControl label="Background" data={staticOptions.backgrounds} value={editBg} onChange={handleChange(setEditBg)} />
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
}
