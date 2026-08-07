import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const text = get('text').trim();
if (!text) throw new Error('--text is required');
const concept = get('concept', 'production-ready Korean game title');
const ratio = get('ratio', '2.76:1');
const requested = get('engine', 'auto').toLowerCase();
const breezeRx = /casual|cute|friendly|festival|sticker|rounded|brush|calligraph|soft|flower|wind|water|캐주얼|귀여|축제|스티커|둥근|붓|캘리|부드|꽃|바람|물/i;
const engine = requested === 'auto' ? (breezeRx.test(concept) ? 'breeze' : 'sovereign') : requested;
if (!['sovereign', 'breeze'].includes(engine)) throw new Error('--engine must be auto, sovereign, or breeze');

const normalizedText = text.replace(/\\n/g, '\n');
const lines = normalizedText.includes('\n') ? normalizedText.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [normalizedText];
const style = engine === 'sovereign'
  ? 'custom MMORPG title lettering with a strong silhouette, disciplined stroke hierarchy, controlled ornamental detail'
  : 'custom casual or calligraphic title lettering with expressive rhythm, friendly silhouette, controlled decorative detail';

const brief = {
  version: 1,
  engine,
  sourceLogic: engine === 'sovereign' ? 'Typecore Sovereign' : 'Typecore Breeze',
  exactText: normalizedText.replace(/\s*\r?\n\s*/g, ' '),
  lines,
  concept,
  ratio,
  occupancy: '70%',
  prompt: [
    `[TEXT LOCK] Render exactly: "${lines.join(' / ')}". Preserve every Korean syllable and spacing.`,
    `[LAYOUT LOCK] ${lines.length} row(s), aspect ratio ${ratio}, title occupies about 70% of the canvas.`,
    `[TYPECORE ENGINE] ${style}.`,
    `[ART DIRECTION] ${concept}.`,
    '[READABILITY] Commercial game-publishing quality; readable at banner size; no missing, substituted, duplicated, or romanized characters.',
    '[ISOLATION] Typography artwork only. No character, landscape, UI, logo, date, subtitle, mockup, frame, or unrelated words.',
    '[COMPOSITING] Transparent background. Generate the lettering body without glow or cast light; lighting effects will be produced as a separate transparent layer.'
  ].join('\n'),
  negativePrompt: 'misspelled Hangul, extra text, English translation, character, scenery, black rectangle, opaque background, merged glow, illegible distortion',
  deliverables: ['title-body.png', 'title-light.png', 'title-brief.json']
};

const output = get('output');
const json = JSON.stringify(brief, null, 2);
if (output) {
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, json, 'utf8');
}
process.stdout.write(json + '\n');
