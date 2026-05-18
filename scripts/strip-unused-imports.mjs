// Remove specific unused imports/identifiers per file. One-off cleanup.
import { readFileSync, writeFileSync } from 'node:fs';

const tasks = [
  ['src/apps/BannerCodex/components/CodexEditModal.jsx',
    [['FileJson, ', ''], [', FileJson', ''], ['const ModalShell = ', '// eslint-disable-next-line no-unused-vars\nconst ModalShell = '],
     ['isLightMode', '_isLightMode']]],
  ['src/apps/BannerCodex/components/CodexSidebar.jsx',
    [['FolderOpen, ', ''], [', FolderOpen', ''], ['setIsDesktopSidebarOpen', '_setIsDesktopSidebarOpen']]],
  ['src/apps/BannerCodex/components/CodexGrid.jsx', [['ImageIcon, ', ''], [', ImageIcon', '']]],
  ['src/apps/BannerCodex/components/CodexHeader.jsx', [[' user,\n', ' _user,\n'], ['(user)', '(_user)']]],
  ['src/apps/BannerCodex/services/firebase.js', [['updateDoc, ', ''], [', updateDoc', '']]],
  ['src/lib/evaluationCriteria.js', [['doc, ', ''], [', doc', ''], ['writeBatch, ', ''], [', writeBatch', '']]],
  ['src/apps/MotionMatrix/components/MatrixPromptForm.jsx', [['setImage,', '_setImage,'], [', setImage', ', _setImage'], ['setImage ', '_setImage ']]],
  ['src/apps/PromotionArchive/components/banner/BannerCard.jsx', [['isProcessing,', '_isProcessing,'], [', isProcessing', ', _isProcessing']]],
  ['src/apps/PromotionArchive/components/dashboard/AnalysisDashboard.jsx', [['(_, idx)', '(_, _idx)']]],
  ['src/apps/PromotionArchive/components/layout/Sidebar.jsx', [['setIsDesktopSidebarOpen,', '_setIsDesktopSidebarOpen,'], [', setIsDesktopSidebarOpen', ', _setIsDesktopSidebarOpen']]],
  ['src/apps/PromotionArchive/components/modals/AiAnalysisModal.jsx', [['currentProcessingItem,', '_currentProcessingItem,'], [', currentProcessingItem', ', _currentProcessingItem']]],
  ['src/apps/PromotionArchive/components/modals/UploadModal.jsx', [['Plus, ', ''], [', Plus', '']]],
  ['src/apps/PromptArc/components/ArcDetailModal.jsx', [[' onPin, ', ' onPin: _onPin, '], [' onLive, ', ' onLive: _onLive, ']]],
  ['src/apps/PromptArc/components/ArcEditModal.jsx', [['isDragImg,', '_isDragImg,']]],
  ['src/apps/PromptArc/components/ArcQuickDrawer.jsx', [[' onClose, ', ' onClose: _onClose, '], [' onClose }', ' onClose: _onClose }']]],
  ['src/apps/PromptArc/components/ArcSidebar.jsx', [['setSidebarCollapsed,', '_setSidebarCollapsed,'], [', setSidebarCollapsed', ', _setSidebarCollapsed']]],
  ['src/apps/TypecoreBreeze/components/ui.jsx', [['isEdit,', 'isEdit: _isEdit,'], [', isEdit ', ', isEdit: _isEdit ']]],
];

const ROOT = 'C:/work/00_claude/';
let total = 0;
for (const [rel, edits] of tasks) {
  const abs = ROOT + rel;
  let src;
  try { src = readFileSync(abs, 'utf8'); } catch { console.log('SKIP missing:', rel); continue; }
  const before = src;
  let applied = 0;
  for (const [find, replace] of edits) {
    if (src.includes(find)) {
      src = src.replace(find, replace);
      applied++;
    }
  }
  if (src !== before) {
    writeFileSync(abs, src);
    console.log(`updated ${rel} (${applied}/${edits.length} edits)`);
    total++;
  } else {
    console.log(`NO MATCH ${rel}`);
  }
}
console.log(`\nTotal files updated: ${total}/${tasks.length}`);
