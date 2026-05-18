import { useCallback } from "react";
import { writeBatch } from "firebase/firestore";
import {
  db, promptDocRef, serializeForFirestore, docSize, APPROX_DOC_LIMIT,
} from "../services/firebase";
import { uploadPromptImages } from "../services/cloudinary";

export function useImportExport({ user, prompts, showToast, setVisibleCount }) {
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), prompts }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url; a.download = `prompt-arc-backup-${ts}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${prompts.length}개 프롬프트 내보냈어요.`);
  }, [prompts, showToast]);

  const importData = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user) { showToast('로그인이 필요합니다.', 'error'); return; }
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    showToast(`파일 읽는 중... (${sizeMB}MB)`);
    try {
      const text = await file.text();
      let data;
      try { data = JSON.parse(text); }
      catch (parseErr) {
        console.error('[PromptArc] JSON parse failed', parseErr);
        showToast(`파싱 실패: ${parseErr.message}`, 'error');
        return;
      }
      const incoming = Array.isArray(data) ? data
        : (Array.isArray(data?.prompts) ? data.prompts
          : (Array.isArray(data?.data) ? data.data : null));
      if (!incoming) { showToast('형식이 올바르지 않습니다. (배열 또는 {prompts:[...]} 형식)', 'error'); return; }
      if (incoming.length === 0) { showToast('파일이 비어있습니다.', 'error'); return; }
      if (prompts.length > 0 && !confirm(`기존 ${prompts.length}개 프롬프트가 있어요.\n[확인] 병합 (같은 ID는 덮어씀)\n[취소] 중단`)) {
        showToast('가져오기 취소했어요.');
        return;
      }
      const BATCH_SIZE = 10;
      const total = incoming.length;
      let written = 0, failed = 0, oversized = 0, imgFailed = 0;
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = incoming.slice(i, i + BATCH_SIZE);
        showToast(`이미지 업로드 중... ${i} / ${total}`);
        const prepared = await Promise.all(chunk.map(async (p) => {
          if (!p || typeof p !== 'object') return null;
          const id = (p.id != null ? String(p.id) : Math.random().toString(36).slice(2));
          try {
            const withUrls = await uploadPromptImages(user.uid, id, p);
            return { id, prompt: { ...withUrls, id, ownerUid: user.uid, likeCount: p.likeCount || 0 } };
          } catch (err) { console.error(`[PromptArc] image upload failed for ${id}`, err); imgFailed++; return null; }
        }));
        const batch = writeBatch(db);
        let inBatch = 0;
        prepared.forEach(item => {
          if (!item) return;
          const serialized = serializeForFirestore(item.prompt);
          const size = docSize(serialized);
          if (size > APPROX_DOC_LIMIT) {
            console.warn(`[PromptArc] oversized doc skipped: id=${item.id}, size=${(size / 1024).toFixed(0)}KB`);
            oversized++;
            return;
          }
          batch.set(promptDocRef(item.id), serialized);
          inBatch++;
        });
        if (inBatch === 0) continue;
        try {
          await batch.commit();
          written += inBatch;
          showToast(`Firestore 저장 중... ${Math.min(i + BATCH_SIZE, total)} / ${total}`);
        } catch (batchErr) {
          console.error(`[PromptArc] batch starting at ${i} (${inBatch} docs) failed`, batchErr);
          failed += inBatch;
        }
      }
      setVisibleCount(written + prompts.length);
      const parts = [`${written}개 업로드`];
      if (imgFailed > 0) parts.push(`${imgFailed}개 이미지실패`);
      if (oversized > 0) parts.push(`${oversized}개 용량초과 스킵`);
      if (failed > 0) parts.push(`${failed}개 실패`);
      showToast(parts.join(', ') + (failed > 0 || imgFailed > 0 || oversized > 0 ? ' (콘솔 F12 확인)' : ' 완료!'),
        failed > 0 || imgFailed > 0 ? 'error' : 'success');
    } catch (err) {
      console.error('[PromptArc] Import failed', err);
      showToast(`가져오기 실패: ${err.message || err}`, 'error');
    }
  }, [user, prompts, showToast, setVisibleCount]);

  return { exportData, importData };
}
