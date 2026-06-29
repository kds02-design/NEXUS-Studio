// 에셋 등록 모달 — 이미지 파일 업로드 + 카테고리/제목/태그 입력 후 Firestore 등록.
// NEXUS THEME_DARK 토큰 + 앱 컬러(#55EFC4). 원본 픽셀 보존(uploadImageFile).
import { useEffect, useRef, useState } from "react";
import { X, UploadCloud, Loader2, Sparkles } from "lucide-react";
import { ASSET_CATEGORY_LIST } from "../constants/categories";
import { createAssetFromFile } from "../services/firebase";
import { analyzeAssetImage } from "../services/gemini";

const APP_COLOR = "#55EFC4";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const fileToDataUrl = (f) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(f);
  });

export default function AssetUploadModal({ user, defaultCategory = "", onClose, onSaved, showToast, ensureCanGenerate }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [category, setCategory] = useState(defaultCategory || "");
  const [title, setTitle] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [isTemp, setIsTemp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const inputRef = useRef(null);

  // preview objectURL 정리
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // 이미지 → AI 자동 태그/제목/카테고리 추출. 비어있는 필드만 채우고 사용자 입력은 보존.
  const autoExtract = async (f, { manual = false } = {}) => {
    try {
      if (ensureCanGenerate) {
        const ok = await ensureCanGenerate("analysis");
        if (!ok) return; // 크레딧 부족 — usage 모달이 대신 안내
      }
      setExtracting(true);
      const dataUrl = await fileToDataUrl(f);
      const { title: aiTitle, tags: aiTags, suggestedCategory } = await analyzeAssetImage(dataUrl);
      if (aiTags?.length) {
        setTagsText((prev) => (manual || !prev.trim() ? aiTags.join(", ") : prev));
      }
      setTitle((prev) => (manual || !prev.trim() ? (aiTitle || prev) : prev));
      setCategory((prev) => (prev ? prev : (suggestedCategory || prev)));
    } catch (e) {
      console.warn("[AssetLibrary] auto tag extract failed", e?.message || e);
      if (manual) showToast?.(`자동 추출 실패: ${e.message}`, "error");
    } finally {
      setExtracting(false);
    }
  };

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type?.startsWith("image/")) { showToast?.("이미지 파일만 등록할 수 있어요", "error"); return; }
    if (f.size > MAX_BYTES) { showToast?.("10MB 이하 이미지만 가능해요", "error"); return; }
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    autoExtract(f); // 선택 즉시 백그라운드 자동 추출
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const canSave = !!file && !!category && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      const asset = await createAssetFromFile({
        uid: user?.uid,
        file,
        width: dims.w,
        height: dims.h,
        category,
        title: title.trim(),
        tags,
        isTemp,
      });
      onSaved?.(asset);
    } catch (e) {
      console.warn("[AssetLibrary] register failed", e);
      showToast?.(`등록 실패: ${e.message}`, "error");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose?.(); }}
    >
      <div className="w-full max-w-[480px] rounded-2xl border border-[#1E1E2E] bg-[#111118] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2E]">
          <h3 className="text-[15px] font-bold text-[#E8E6FF]">에셋 등록</h3>
          <button
            onClick={() => !saving && onClose?.()}
            className="text-[#7A7A9A] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Drop zone / preview */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <div
            onClick={() => !saving && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className="rounded-xl border border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center text-center"
            style={{
              minHeight: 180,
              borderColor: dragOver ? APP_COLOR : "#1E1E2E",
              background: dragOver ? `${APP_COLOR}0d` : "#0A0A0F",
            }}
          >
            {preview ? (
              <div className="w-full p-3">
                <img
                  src={preview}
                  alt="preview"
                  className="mx-auto rounded-lg"
                  style={{ maxHeight: 220, objectFit: "contain" }}
                />
                <div className="mt-2 text-[11px] text-[#7A7A9A]">
                  {dims.w}×{dims.h}px · 클릭하면 다른 이미지로 교체
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center gap-2 text-[#7A7A9A]">
                <UploadCloud className="w-8 h-8" strokeWidth={1.5} />
                <div className="text-[13px]">클릭 또는 드래그해서 이미지 업로드</div>
                <div className="text-[11px] text-[#7A7A9A]/70">PNG·JPG·WebP · 최대 10MB</div>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-[12px] font-semibold text-[#7A7A9A] mb-2">
              카테고리 <span style={{ color: APP_COLOR }}>*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ASSET_CATEGORY_LIST.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors"
                    style={
                      active
                        ? { background: `${c.color}24`, borderColor: `${c.color}80`, color: c.color, fontWeight: 600 }
                        : { background: "transparent", borderColor: "#1E1E2E", color: "#7A7A9A" }
                    }
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-[#7A7A9A] mb-2">제목 (선택)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 녹슨 메탈 화살표"
              className="w-full px-3 py-2 bg-[#16161F] border border-[#1E1E2E] rounded-lg text-[#E8E6FF] text-[13px] outline-none placeholder:text-[#7A7A9A] focus:border-[#55EFC4]/40"
            />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-semibold text-[#7A7A9A] flex items-center gap-1.5">
                태그 (쉼표로 구분, 선택)
                {extracting && (
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: APP_COLOR }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> AI 추출 중…
                  </span>
                )}
              </label>
              <button
                onClick={() => file && autoExtract(file, { manual: true })}
                disabled={!file || extracting}
                className="flex items-center gap-1 text-[11px] font-medium transition-colors disabled:opacity-40"
                style={{ color: APP_COLOR }}
                title="이미지에서 태그·제목·카테고리 다시 추출"
              >
                <Sparkles className="w-3 h-3" /> 자동 추출
              </button>
            </div>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="이미지를 올리면 AI가 자동으로 채워줍니다"
              className="w-full px-3 py-2 bg-[#16161F] border border-[#1E1E2E] rounded-lg text-[#E8E6FF] text-[13px] outline-none placeholder:text-[#7A7A9A] focus:border-[#55EFC4]/40"
            />
          </div>

          {/* Temp toggle */}
          <label className="flex items-center gap-2 text-[12px] text-[#7A7A9A] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isTemp}
              onChange={(e) => setIsTemp(e.target.checked)}
              style={{ accentColor: APP_COLOR }}
            />
            임시(가공 전)로 저장 — <span className="text-[#7A7A9A]/70">"임시" 폴더에만 표시됩니다</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#1E1E2E]">
          <button
            onClick={() => !saving && onClose?.()}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#7A7A9A] hover:text-white hover:bg-white/5 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold transition-opacity"
            style={{
              background: APP_COLOR,
              color: "#0A0A0F",
              opacity: canSave ? 1 : 0.45,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? "등록 중…" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
