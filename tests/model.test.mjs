import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, graphemes, normalizeText, validateProject, reconcileRows, foreground, contrast } from '../src/model.js';
import { buildScene, cellFrame, exportDimensions } from '../src/scene.js';
const measure = { font: '', measureText: text => ({ width: graphemes(text).length * 40 }) };
test('Graphemes preserve Czech combining marks and emoji sequences', () => {
  assert.deepEqual(graphemes('A\u0301👨‍👩‍👧‍👦'), ['Á', '👨‍👩‍👧‍👦']);
  assert.equal(normalizeText(' a\t\r\nb '), ' a    \nb ');
});
test('Input is never silently uppercased, removed, or trimmed', () => {
  const p = validateProject({ ...defaults(), text: '  čau!\n\n😃  ' });
  assert.equal(p.text, '  čau!\n\n😃  ');
  const s = buildScene(p, measure);
  assert.equal(s.rows.length, 3); assert.equal(s.cells.map(c => c.to).join(''), '  čau!😃  ');
});
test('Compact spaces stay idle and preserve repeated spaces', () => {
  const p = { ...defaults(), text: 'A  B', startText: '' };
  const s = buildScene(p, measure), spaces = s.cells.filter(c => !c.active);
  assert.equal(spaces.length, 2); assert.equal(spaces[0].width, p.size * p.ratio * p.spaceRatio);
  assert.equal(s.timeline.starts.size, 2);
  assert.equal(spaces[0].x + spaces[0].width, spaces[1].x);
});
test('Per-line alignment survives insertion before an unchanged line', () => {
  const rows = [{ id: 'a', align: 'left' }, { id: 'b', align: 'right' }];
  const next = reconcileRows('A\nB', 'X\nA\nB', rows);
  assert.equal(next[1].id, 'a'); assert.equal(next[2].id, 'b'); assert.equal(next[2].align, 'right');
});
test('Per-line alignment places complete rows within shared width', () => {
  const p = { ...defaults(), text: 'ABCD\nA\nA', rows: [{ align: 'left' }, { align: 'center' }, { align: 'right' }] };
  const s = buildScene(p, measure), a = s.rows[0], b = s.rows[1], c = s.rows[2];
  assert.equal(a.cells[0].x, 0); assert.equal(b.cells[0].x, (a.width - b.width) / 2); assert.equal(c.cells[0].x, a.width - c.width);
});
test('Panel mode treats entire lines and words as leaves', () => {
  const p = { ...defaults(), text: 'PRAHA HLAVNÍ\nNÁDRAŽÍ', mode: 'panels' };
  const lines = buildScene(p, measure).cells.filter(c => c.active);
  assert.deepEqual(lines.map(c => c.to), ['PRAHA HLAVNÍ', 'NÁDRAŽÍ']); assert.equal(lines[0].width, lines[1].width);
  const words = buildScene({ ...p, panelUnit: 'word' }, measure).cells;
  assert.deepEqual(words.filter(c => c.active).map(c => c.to), ['PRAHA', 'HLAVNÍ', 'NÁDRAŽÍ']);
  assert.equal(words.filter(c => !c.active).length, 1);
});
test('Words are paired by ordinal position even when whitespace differs', () => {
  const s = buildScene({ ...defaults(), mode: 'panels', panelUnit: 'word', text: ' NEW   WORD ', startText: 'OLD WORD' }, measure);
  const active = s.cells.filter(c => c.active);
  assert.deepEqual(active.map(c => [c.from, c.to]), [['OLD', 'NEW'], ['WORD', 'WORD']]);
  assert.deepEqual(s.cells.filter(c => !c.active).map(c => c.to), [' ', '   ', ' ']);
});
test('Timeline is deterministic, settles fully and holds before loop reset', () => {
  const p = { ...defaults(), text: 'ABC', startText: 'XYZ', loop: true };
  const a = buildScene(p, measure), b = buildScene(p, measure);
  assert.deepEqual([...a.timeline.starts], [...b.timeline.starts]);
  for (const c of a.cells) {
    assert.equal(cellFrame(a, c, 0).to, c.from);
    assert.equal(cellFrame(a, c, a.timeline.end + p.hold / 2).to, c.to);
    const last = cellFrame(a, c, a.timeline.duration); assert.equal(last.to, c.from); assert.equal(last.phase, 1);
    assert.equal(cellFrame(a, c, Infinity).to, c.to);
  }
});
test('Start and target have stable geometry even with disappearing content', () => {
  const s = buildScene({ ...defaults(), text: 'A', startText: 'ABCDE\nFG' }, measure);
  assert.equal(s.rows.length, 2); assert.equal(s.cells.length, 7);
  assert.equal(s.cells[4].to, ' '); assert.equal(s.timeline.starts.size, 6);
});
test('Wrapping keeps source alignment and original text', () => {
  const p = { ...defaults(), canvas: 'custom', width: 220, height: 600, padding: 10, text: 'ABC DEF GHI', wrap: true, rows: [{ align: 'right' }] };
  const s = buildScene(p, measure); assert.ok(s.rows.length > 1);
  assert.equal(s.rows.map(r => r.cells.map(c => c.to).join('')).join(''), p.text);
  assert.ok(s.rows.every(row => row.align === 'right'));
});
test('Stories and GIF dimensions preserve aspect ratio without upscaling', () => {
  const s = buildScene({ ...defaults(), canvas: 'stories' }, measure);
  assert.deepEqual([s.width, s.height], [1080, 1920]); assert.deepEqual(exportDimensions(s, 720), [405, 720]);
});
test('Theme text is legible; manual colors remain available', () => {
  for (const panelColor of ['#171717', '#e8dfc8', '#153b62', '#e5c331', '#1b4032']) {
    const p = { ...defaults(), panelColor }; assert.ok(contrast(panelColor, foreground(p)) >= 4.5);
  }
  assert.equal(foreground({ ...defaults(), textColorMode: 'custom', textColor: '#123456' }), '#123456');
});
test('Malformed imports and non-finite sizes are rejected', () => {
  for (const invalid of [null, [], { schemaVersion: 2 }, { ...defaults(), width: NaN }, { ...defaults(), panelColor: 'red' }, { ...defaults(), loop: 'yes' }]) assert.throws(() => validateProject(invalid));
  assert.equal(validateProject({ ...defaults(), size: 999 }).size, 160);
});
