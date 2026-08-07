import fs from 'node:fs';
import { readPsd } from 'ag-psd';

const input = process.argv[2];
if (!input) throw new Error('usage: node scripts/psd-inventory.mjs <file.psd>');
const psd = readPsd(fs.readFileSync(input), {
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
  useImageData: false,
  totalMemoryLimit: undefined,
});
const rows = [];
function walk(nodes, depth = 0) {
  for (const node of nodes || []) {
    rows.push({
      depth,
      name: node.name || '',
      hidden: Boolean(node.hidden),
      group: Boolean(node.children?.length),
      left: node.left ?? null,
      top: node.top ?? null,
      right: node.right ?? null,
      bottom: node.bottom ?? null,
    });
    walk(node.children, depth + 1);
  }
}
walk(psd.children);
console.log(JSON.stringify({ width: psd.width, height: psd.height, layers: rows }, null, 2));
