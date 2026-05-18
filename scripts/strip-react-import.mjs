// Strip the unused `React` default import from files. Handles CRLF.
import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  'src/apps/PromotionArchive/components/banner/BannerCard.jsx',
  'src/apps/PromotionArchive/components/banner/PromotionFilterBar.jsx',
  'src/apps/PromotionArchive/components/common/MobileMockup.jsx',
  'src/apps/PromotionArchive/components/common/ZoomableImage.jsx',
  'src/apps/PromotionArchive/components/dashboard/AnalysisDashboard.jsx',
  'src/apps/PromotionArchive/components/layout/FloatingActionBar.jsx',
  'src/apps/PromotionArchive/components/layout/Header.jsx',
  'src/apps/PromotionArchive/components/modals/AiAnalysisModal.jsx',
  'src/apps/PromotionArchive/components/modals/BatchEditModal.jsx',
  'src/apps/PromotionArchive/components/modals/ConfirmWorkspace.jsx',
  'src/apps/PromotionArchive/components/modals/DeleteConfirmModal.jsx',
  'src/apps/PromotionArchive/components/modals/PreviewModal.jsx',
  'src/apps/PromotionArchive/components/modals/ProcessingModal.jsx',
  'src/apps/PromotionArchive/components/modals/UploadModal.jsx',
];

const ROOT = 'C:/work/00_claude/';
let changed = 0;
for (const rel of files) {
  const abs = ROOT + rel;
  let src = readFileSync(abs, 'utf8');
  const before = src;
  src = src.replace(/^import\s+React\s*,\s*\{([\s\S]*?)\}\s*from\s+['"]react['"];?\r?\n/m, (_m, inner) => `import {${inner}} from 'react';\n`);
  src = src.replace(/^import\s+React\s+from\s+['"]react['"];?\r?\n/m, '');
  if (src !== before) {
    writeFileSync(abs, src);
    changed++;
    console.log('updated:', rel);
  } else {
    console.log('STILL NO MATCH:', rel);
  }
}
console.log(`\nUpdated ${changed}/${files.length}`);
