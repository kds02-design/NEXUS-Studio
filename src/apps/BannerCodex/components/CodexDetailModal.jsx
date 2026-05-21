import { useState } from 'react';
import {
  X, Download, Loader2, Copy, Check, Trash2, Edit3, Heart, Layers, Star,
  Bot, Wand2, MoreHorizontal, Cpu, Box, Save, Scissors,
} from 'lucide-react';
import CodexEvalPanel, { getFinalScore100 } from './CodexEvalPanel';
import RegionPicker from '../../AssetLibrary/components/RegionPicker';

const safeRender = (v, fb = '') => {
  if (v == null) return fb;
  if (typeof v === 'object') return fb;
  return String(v);
};

const CodexDetailModal = ({
  isOpen, selectedBanner, editedBanner, hasChanges, isEditingPreview, setIsEditingPreview,
  highResImage, isLightMode, isAdminMode, gameLogos, availableGames, cartIds,
  zoomScale, setZoomScale, panPos, isDragging, dragHandlers,
  isScorePopoverOpen, setIsScorePopoverOpen, isScoreAdjExpanded, setIsScoreAdjExpanded,
  newTagInput, setNewTagInput, isCopied,
  onClose, handleDownloadImage, handleEditChange, handleSaveEdit, handleCancelEdit,
  handleAddTag, handleRemoveTag, handleCopyPathModal,
  toggleLike, toggleFeature, handleToggleCart, handleDeleteSingleBanner,
  handleSmartAnalysis, processingBannerId, handleCopy, showNotification,
}) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [pickToast, setPickToast] = useState(null);
  const showPickToast = (msg, type = "info") => {
    setPickToast({ msg, type });
    setTimeout(() => setPickToast(null), 2000);
  };
  if (!isOpen || !selectedBanner) return null;
  const wantsConfirmClose = (action) => {
    if (hasChanges || isEditingPreview) {
      if (confirm("변경사항을 취소하시겠습니까?")) action();
    } else action();
  };

  return (
    <div className="fixed top-[52px] left-0 right-0 bottom-0 z-[2000] flex items-center justify-center p-6 sm:p-10 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => wantsConfirmClose(() => { onClose(); setIsEditingPreview(false); })}>
      <button onClick={(e) => { e.stopPropagation(); wantsConfirmClose(() => { onClose(); setIsEditingPreview(false); }); }}
        className={`absolute top-6 right-6 sm:top-8 sm:right-8 p-2.5 rounded-full transition-colors z-[600] border ${isLightMode ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white shadow-lg'}`}>
        <X className="w-5 h-5" />
      </button>
      <div className={`w-full max-w-[1520px] flex rounded-[24px] overflow-hidden shadow-2xl relative ${isLightMode ? 'bg-white border border-slate-200' : 'bg-[#0c0c0e] border border-white/10'}`}
        style={{ height: '85vh', maxHeight: '750px' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-black"
          onWheel={dragHandlers.onWheel} onMouseDown={dragHandlers.onMouseDown} onMouseMove={dragHandlers.onMouseMove}
          onMouseUp={dragHandlers.onMouseUp} onMouseLeave={dragHandlers.onMouseLeave}>
          <div className="absolute top-6 left-6 z-[510] flex gap-1.5">
            <button onClick={handleDownloadImage} className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold border bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all">
              <Download className="w-3.5 h-3.5" /> 이미지 저장
            </button>
            <button
              onClick={() => setPickMode((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold border backdrop-blur-md transition-all ${
                pickMode
                  ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200'
                  : 'bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
              title="배너에서 타이틀/버튼/아이콘 영역을 드래그로 잘라 에셋 라이브러리에 저장"
            >
              <Scissors className="w-3.5 h-3.5" /> {pickMode ? '에셋 추출 ON' : '에셋 추출'}
            </button>
          </div>
          {/* 에셋 추출 오버레이 */}
          <RegionPicker
            active={pickMode}
            imageUrl={highResImage}
            onCancel={() => setPickMode(false)}
            onSaved={(asset) => { showPickToast(`에셋 저장: ${asset.category}`); }}
            source={{
              app: 'banner-codex',
              bannerId: selectedBanner?.id || null,
              bannerTitle: selectedBanner?.title || '',
            }}
            showToast={showPickToast}
          />
          {pickToast && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[2020] pointer-events-none animate-in fade-in slide-in-from-bottom-2">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xl border ${
                pickToast.type === "error"
                  ? "bg-rose-500/90 border-rose-400 text-white"
                  : "bg-emerald-500/90 border-emerald-400 text-white"
              }`}>{pickToast.msg}</div>
            </div>
          )}
          {highResImage ? (
            <img src={highResImage} alt="Preview"
              style={{ transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomScale})`, cursor: isDragging ? 'grabbing' : 'grab', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}
              className="max-w-full max-h-full object-contain pointer-events-none" />
          ) : (
            <Loader2 className="w-10 h-10 text-[#0eb9b3] animate-spin" />
          )}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 z-[510] px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-lg"
            onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-bold text-white w-9 text-center tabular-nums shrink-0">{Math.round(zoomScale * 100)}%</span>
            <div className="relative flex items-center w-[100px] md:w-[120px] h-11" style={{ touchAction: "none" }}>
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[5px] bg-white/15 rounded-full pointer-events-none"></div>
              <input type="range" min="1" max="5" step="0.1" value={zoomScale} onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                onWheel={(e) => { e.stopPropagation(); const a = e.deltaY * -0.002; setZoomScale(prev => Math.min(Math.max(1, prev + a), 5)); }}
                style={{ touchAction: "none" }}
                className="w-full h-full bg-transparent appearance-none cursor-pointer outline-none relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-11 [&::-webkit-slider-thumb]:h-11 [&::-webkit-slider-thumb]:bg-[#7895c2] [&::-webkit-slider-thumb]:bg-clip-content [&::-webkit-slider-thumb]:p-[10px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing active:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-11 [&::-moz-range-thumb]:h-11 [&::-moz-range-thumb]:bg-[#7895c2] [&::-moz-range-thumb]:bg-clip-content [&::-moz-range-thumb]:p-[10px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-lg active:[&::-moz-range-thumb]:scale-110 transition-transform" />
            </div>
          </div>
          {isScorePopoverOpen && (
            <CodexEvalPanel editedBanner={editedBanner} isScoreAdjExpanded={isScoreAdjExpanded} setIsScoreAdjExpanded={setIsScoreAdjExpanded}
              onClose={() => setIsScorePopoverOpen(false)} handleEditChange={handleEditChange} />
          )}
        </div>

        <div className={`w-[340px] shrink-0 flex flex-col h-full shadow-2xl z-[510] relative ${isLightMode ? 'bg-white border-l border-slate-200' : 'bg-[#111111] border-l border-white/5'}`}>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-12 pb-24">
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden border ${isLightMode ? 'bg-slate-50 border-slate-200 text-[#0eb9b3]' : 'bg-black border-zinc-800 text-white'}`}>
                {gameLogos[editedBanner?.game] ? <img src={gameLogos[editedBanner?.game]} alt={editedBanner?.game} className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold">{editedBanner?.game ? editedBanner.game.substring(0, 1) : '기'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                {isEditingPreview ? (
                  <div className="space-y-2">
                    <input type="text" value={editedBanner?.title || ''} onChange={(e) => handleEditChange('title', e.target.value)}
                      className={`w-full text-base font-bold px-2 py-1.5 border rounded-lg focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-300 focus:border-[#0eb9b3] text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]'}`} placeholder="배너 제목" />
                    <div className="flex gap-2">
                      <select value={editedBanner?.game || ''} onChange={(e) => handleEditChange('game', e.target.value)}
                        className={`w-1/2 text-xs px-2 py-1.5 border rounded-lg focus:outline-none transition-colors appearance-none ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
                        {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
                        {!availableGames.includes(editedBanner?.game) && <option value={editedBanner?.game}>{editedBanner?.game}</option>}
                      </select>
                      <input type="text" value={editedBanner?.year || ''} onChange={(e) => handleEditChange('year', e.target.value)}
                        className={`w-1/4 text-xs px-2 py-1.5 border rounded-lg focus:outline-none transition-colors text-center ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]'}`} placeholder="연도" />
                      <input type="text" value={editedBanner?.month || ''} onChange={(e) => handleEditChange('month', e.target.value)}
                        className={`w-1/4 text-xs px-2 py-1.5 border rounded-lg focus:outline-none transition-colors text-center ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]'}`} placeholder="월" />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className={`text-lg font-bold leading-tight mb-1.5 break-words pr-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`} title={safeRender(editedBanner?.title)}>{safeRender(editedBanner?.title)}</h2>
                    <div className={`text-[11px] font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>{editedBanner?.year}년 {editedBanner?.month && `${editedBanner.month}월`}</div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-8">
              {(isAdminMode || editedBanner?.isTemp) && (
                <button onClick={() => handleDeleteSingleBanner(editedBanner?.id)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`} title="삭제">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {(isAdminMode || editedBanner?.isTemp) && (
                <button onClick={() => setIsEditingPreview(!isEditingPreview)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isEditingPreview ? 'bg-[#0eb9b3] text-white border-[#0eb9b3]' : isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`} title="속성 직접 편집">
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button onClick={(e) => toggleLike(editedBanner?.id, e)}
                className={`flex items-center gap-1.5 h-10 px-4 rounded-full border text-[13px] font-bold transition-colors ${editedBanner?.liked ? 'border-red-500/50 text-red-400 bg-red-500/10' : isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                <Heart className={`w-4 h-4 ${editedBanner?.liked ? 'fill-current text-red-400' : ''}`} /> <span>{editedBanner?.liked ? '1' : '0'}</span>
              </button>
              <button onClick={() => handleToggleCart(editedBanner?.id)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${cartIds.includes(editedBanner?.id) ? 'border-[#0eb9b3]/50 text-[#0eb9b3] bg-[#0eb9b3]/10' : isLightMode ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'}`} title="담기">
                <Layers className={`w-4 h-4 ${cartIds.includes(editedBanner?.id) ? 'fill-current' : ''}`} />
              </button>
              <div className="flex-1"></div>
              {isAdminMode && (
                <button onClick={(e) => toggleFeature(editedBanner?.id, e)}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${editedBanner?.featured ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : isLightMode ? 'border-slate-200 text-slate-400 hover:bg-slate-50' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-white'}`} title="추천 배너 지정">
                  <Star className={`w-4 h-4 ${editedBanner?.featured ? 'fill-current text-yellow-400' : ''}`} />
                </button>
              )}
            </div>

            <div className="mb-8">
              <div className={`text-[10px] font-bold mb-3 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>태그</div>
              {isEditingPreview ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {editedBanner?.tags?.filter(tag => tag !== '기타').map((tag, idx) => (
                      <span key={idx} className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1.5 border transition-colors ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                        #{tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      className={`flex-1 text-xs px-3 py-2 border rounded-lg focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-300 focus:border-[#0eb9b3] text-slate-900' : 'bg-zinc-900 border-zinc-700 text-white focus:border-[#0eb9b3]'}`} placeholder="새 태그 입력 후 엔터" />
                    <button onClick={handleAddTag} className="px-4 py-2 bg-[#0eb9b3] text-white text-xs font-bold rounded-lg hover:bg-[#39d4ce] transition-colors shadow-md shadow-[#0eb9b3]/20">추가</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {editedBanner?.game && editedBanner.game !== '기타' && (
                    <span className={`px-3 py-1.5 text-[11px] font-bold rounded border ${isLightMode ? 'bg-[#0eb9b3]/10 border-[#0eb9b3]/30 text-[#0b948f]' : 'bg-[#0eb9b3]/20 border-[#0eb9b3]/50 text-[#39d4ce]'}`}>{editedBanner.game}</span>
                  )}
                  {editedBanner?.tags?.filter(tag => tag !== '기타').map((tag, idx) => (
                    <span key={idx} className={`px-3 py-1.5 text-[11px] font-medium rounded border ${isLightMode ? 'bg-transparent border-slate-200 text-slate-600' : 'bg-transparent border-zinc-800 text-zinc-400'}`}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-8">
              <div className={`text-[10px] font-bold mb-3 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{'>_ DIRECTORY PATH'}</div>
              {isEditingPreview ? (
                <textarea value={editedBanner?.path || ''} onChange={(e) => handleEditChange('path', e.target.value)}
                  className={`w-full text-xs font-mono p-3 border rounded-xl resize-none min-h-[80px] focus:outline-none focus:border-[#0eb9b3] transition-colors custom-scrollbar ${isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-900 border-zinc-700 text-zinc-300'}`} placeholder="디렉토리 경로 (ex: \\ppc-file\...)" />
              ) : (
                <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors duration-300 ${isCopied ? 'bg-[#0eb9b3]/20 border-[#0eb9b3] text-[#0eb9b3]' : isLightMode ? 'bg-transparent border-slate-200 text-slate-600' : 'bg-transparent border-white/10 text-zinc-400'}`}>
                  <div className="text-[11px] font-mono break-all whitespace-pre-wrap mr-2 flex-1 select-all">{editedBanner?.path || '경로 없음'}</div>
                  <button onClick={() => handleCopyPathModal(editedBanner?.path)} className={`shrink-0 transition-colors ${isLightMode ? 'hover:text-slate-900' : 'hover:text-white'}`}>
                    {isCopied ? <Check className="w-4 h-4 text-[#0eb9b3]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            <div className="relative mt-4">
              <button onClick={() => setIsScorePopoverOpen(true)}
                className={`w-full py-3 px-5 rounded-2xl border flex items-center justify-between transition-all group ${isLightMode ? 'bg-transparent border-slate-200 hover:border-[#0eb9b3] hover:bg-[#0eb9b3]/5' : 'bg-transparent border-white/10 hover:border-[#0eb9b3] hover:bg-[#0eb9b3]/5'}`}>
                <div className="flex items-center gap-2">
                  <Bot className={`w-4 h-4 ${isLightMode ? 'text-slate-400 group-hover:text-[#0eb9b3]' : 'text-zinc-500 group-hover:text-[#0eb9b3]'}`} />
                  <span className={`text-xs font-bold ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>AI 10대 지표 평가</span>
                </div>
                <div className="text-3xl font-black text-[#0eb9b3] font-mono tracking-tighter">{getFinalScore100(editedBanner)}</div>
              </button>
              {(isAdminMode || editedBanner?.isTemp) && (
                <div className="flex justify-end mt-2">
                  <button onClick={(e) => { e.stopPropagation(); handleSmartAnalysis(editedBanner, null, false); }} disabled={processingBannerId === editedBanner?.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${processingBannerId === editedBanner?.id ? 'bg-violet-500/20 text-violet-300 border-violet-500/30 cursor-not-allowed' : isLightMode ? 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100' : 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20'}`}>
                    {processingBannerId === editedBanner?.id ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> 재분석 중...</>) : (<><Wand2 className="w-3.5 h-3.5" /> AI 재분석</>)}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`absolute right-6 z-[600] transition-all duration-300 ease-in-out ${hasChanges || isEditingPreview ? 'bottom-[92px]' : 'bottom-6'}`}>
            <button onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className={`p-3 rounded-2xl transition-colors shadow-lg border ${isActionMenuOpen ? (isLightMode ? 'bg-slate-200 border-slate-300' : 'bg-zinc-800 border-zinc-700') : (isLightMode ? 'bg-white/80 backdrop-blur border-transparent hover:border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-[#1c1c1e]/80 backdrop-blur border-transparent hover:border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200')}`}>
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {isActionMenuOpen && (
              <div className={`absolute bottom-full right-0 mb-4 w-[210px] rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1c1c1e] border-white/5'}`}>
                <button onClick={() => { setIsActionMenuOpen(false); showNotification("Transmute Asset 요청이 전송되었습니다."); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left ${isLightMode ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}>
                  <Wand2 className="w-3.5 h-3.5 shrink-0" /> <span className="leading-snug flex-1">Transmute Asset</span>
                </button>
                <button onClick={() => { setIsActionMenuOpen(false); handleDownloadImage(); showNotification("Dispatch to Matrix 요청이 전송되었습니다."); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left ${isLightMode ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}>
                  <Cpu className="w-3.5 h-3.5 shrink-0" /> <span className="leading-snug flex-1">Dispatch to Matrix</span>
                </button>
                <button onClick={() => { setIsActionMenuOpen(false); handleCopy(JSON.stringify(editedBanner, null, 2)); showNotification("Transmit to Metric Core 요청이 전송되었습니다."); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors text-left ${isLightMode ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' : 'text-[#a1a1aa] hover:bg-white/5 hover:text-white'}`}>
                  <Box className="w-3.5 h-3.5 shrink-0" /> <span className="leading-snug flex-1">Transmit to Metric Core</span>
                </button>
              </div>
            )}
          </div>

          {(hasChanges || isEditingPreview) && (
            <div className={`absolute bottom-0 left-0 right-0 p-4 border-t flex gap-2 shrink-0 ${isLightMode ? 'bg-white/90 backdrop-blur border-slate-200' : 'bg-[#111111]/90 backdrop-blur border-white/5'}`}>
              <button onClick={handleCancelEdit} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors border ${isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'}`}>취소</button>
              <button onClick={handleSaveEdit} className="flex-[2] py-3 rounded-xl text-xs font-bold bg-[#0b948f] hover:bg-[#0eb9b3] text-white transition-colors shadow-lg shadow-[#0eb9b3]/20 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> 저장</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodexDetailModal;
