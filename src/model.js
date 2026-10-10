export const FONTS = {
  narrow: { label: 'Úzké technické', family: 'Prago Narrow', file: 'narrow.ttf' },
  sans: { label: 'Dopravní grotesk', family: 'Prago Sans', file: 'sans.ttf' },
  mono: { label: 'Písmenové moduly', family: 'Prago Mono', file: 'mono.ttf' },
};
export const THEMES = {
  black: { label: 'Nádražní černá', panel: '#171717' },
  cream: { label: 'Krémová', panel: '#e8dfc8' },
  blue: { label: 'Modrá', panel: '#153b62' },
  yellow: { label: 'Žlutá', panel: '#e5c331' },
  green: { label: 'Tmavě zelená', panel: '#1b4032' },
};
export const defaults = () => ({
  schemaVersion: 1, text: 'PRAHA\nHLAVNÍ NÁDRAŽÍ', rows: [{ id: 'r0', align: 'inherit' }, { id: 'r1', align: 'inherit' }],
  mode: 'characters', panelUnit: 'line', alignment: 'center', uppercase: false, wrap: false,
  font: 'narrow', size: 100, ratio: 0.62, spaceRatio: 0.45, gap: 5, lineGap: 14, padding: 36,
  theme: 'black', panelColor: '#171717', textColorMode: 'auto', textColor: '#f4f1e7',
  frame: true, seam: 2, radius: 3, shadow: true, patina: false,
  canvas: 'crop', width: 1080, height: 1920, background: 'transparent', backgroundColor: '#ece8df', placement: 'center',
  startText: '', speed: 1, intermediate: 3, order: 'random', seed: 1970, hold: 3, loop: false,
  gifSize: 720, fps: 20,
});
export const normalizeText = text => text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').normalize('NFC');
const segmenter = new Intl.Segmenter('cs', { granularity: 'grapheme' });
export const graphemes = text => Array.from(segmenter.segment(normalizeText(text)), part => part.segment);
export const displayed = (p, text = p.text) => p.uppercase ? normalizeText(text).toLocaleUpperCase('cs') : normalizeText(text);
export function reconcileRows(oldText, newText, rows) {
  const before = normalizeText(oldText).split('\n'), after = normalizeText(newText).split('\n');
  const out = Array(after.length), used = new Set();
  // Preserve unique unchanged lines first, including lines shifted by an insertion.
  after.forEach((line, i) => {
    const candidates = before.map((v, n) => v === line && !used.has(n) ? n : -1).filter(n => n >= 0);
    const match = candidates.includes(i) ? i : candidates[0];
    if (match !== undefined) { out[i] = rows[match]; used.add(match); }
  });
  after.forEach((_, i) => {
    if (!out[i]) {
      const oldIndex = !used.has(i) && rows[i] ? i : undefined;
      if (oldIndex !== undefined) { out[i] = rows[i]; used.add(i); }
      else out[i] = { id: globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${i}`, align: 'inherit' };
    }
  });
  return out;
}
export function rgb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
export function luminance(hex) {
  return rgb(hex).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
export function contrast(a, b) {
  const l = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l[0] + .05) / (l[1] + .05);
}
export function foreground(p) {
  if (p.textColorMode === 'custom') return p.textColor;
  return contrast(p.panelColor, '#f4f1e7') >= contrast(p.panelColor, '#191919') ? '#f4f1e7' : '#191919';
}
const enums = {
  mode: ['characters', 'panels'], panelUnit: ['line', 'word'], alignment: ['left', 'center', 'right'],
  font: Object.keys(FONTS), theme: [...Object.keys(THEMES), 'custom'], textColorMode: ['auto', 'custom'],
  canvas: ['crop', 'stories', 'square', 'landscape', 'custom'], background: ['transparent', 'solid'],
  placement: ['top', 'center', 'bottom'], order: ['random', 'sequence', 'together'],
};
const bounds = {
  size: [36, 160], ratio: [.35, 1.2], spaceRatio: [.2, 1], gap: [0, 20], lineGap: [0, 80], padding: [0, 200],
  seam: [0, 5], radius: [0, 12], width: [100, 4096], height: [100, 4096], speed: [.4, 2.5],
  intermediate: [0, 8], seed: [0, 2147483647], hold: [1, 10], gifSize: [480, 1080], fps: [10, 25],
};
export function validateProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.schemaVersion !== 1) throw new Error('Neplatný projekt nebo nepodporovaná verze.');
  const p = defaults();
  for (const key of Object.keys(p)) {
    if (key === 'rows' || key === 'schemaVersion' || input[key] === undefined) continue;
    const value = input[key];
    if (enums[key]) { if (!enums[key].includes(value)) throw new Error(`Neplatná volba: ${key}.`); p[key] = value; }
    else if (bounds[key]) {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Neplatné číslo: ${key}.`);
      p[key] = Math.min(bounds[key][1], Math.max(bounds[key][0], value));
    } else if (typeof p[key] === 'boolean') { if (typeof value !== 'boolean') throw new Error(`Neplatná volba: ${key}.`); p[key] = value; }
    else if (typeof value === 'string') {
      if (/Color$/.test(key) && !/^#[a-f\d]{6}$/i.test(value)) throw new Error(`Neplatná barva: ${key}.`);
      p[key] = value;
    } else throw new Error(`Neplatné pole: ${key}.`);
  }
  p.text = normalizeText(p.text); p.startText = normalizeText(p.startText);
  p.intermediate = Math.round(p.intermediate); p.seed = Math.round(p.seed); p.fps = Math.round(p.fps);
  p.width = Math.round(p.width); p.height = Math.round(p.height);
  const validAlign = ['inherit', 'left', 'center', 'right'];
  const ids = new Set();
  p.rows = p.text.split('\n').map((_, i) => {
    const row = input.rows?.[i];
    const id = typeof row?.id === 'string' && !ids.has(row.id) ? row.id : `import-${i}`;
    ids.add(id);
    return { id, align: validAlign.includes(row?.align) ? row.align : 'inherit' };
  });
  return p;
}
export function hash(seed, index) {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}
