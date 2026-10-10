import { displayed, graphemes, FONTS, foreground, hash } from './model.js';

export function canvasDimensions(p) {
  return { stories: [1080, 1920], square: [1080, 1080], landscape: [1920, 1080], custom: [p.width, p.height] }[p.canvas];
}
export function fontStyle(p) { return `normal ${p.font === 'narrow' ? 400 : 700} ${p.size * .67}px "${FONTS[p.font].family}", sans-serif`; }
export const fontWidth = p => p.font === 'narrow' ? .72 : 1;
export function buildScene(p, ctx) {
  ctx.font = fontStyle(p);
  const charW = p.size * p.ratio, panelPad = p.size * .22;
  const wordParts = text => {
    const words = [], spaces = [''];
    for (const token of text.match(/ +|[^ ]+/gu) ?? []) {
      if (/^ +$/.test(token)) spaces[words.length] += token;
      else { words.push(token); spaces.push(''); }
    }
    return { words, spaces };
  };
  const panelWidth = text => ctx.measureText(text).width * fontWidth(p) + (text ? panelPad * 2 : 0);
  const widthOf = text => {
    if (p.mode === 'panels' && p.panelUnit === 'line') return panelWidth(text);
    const tokens = p.mode === 'characters' ? graphemes(text) : text.match(/ +|[^ ]+/gu) ?? [];
    let total = 0, previous = false;
    for (const token of tokens) {
      const active = /[^ ]/u.test(token);
      if (active && previous) total += p.gap;
      total += active ? (p.mode === 'characters' ? charW : panelWidth(token)) : token.length * charW * p.spaceRatio;
      previous = active;
    }
    return total;
  };
  const dimensions = canvasDimensions(p);
  const maxLine = dimensions ? Math.max(50, dimensions[0] - p.padding * 2 - (p.frame ? 24 : 0)) : 1100;
  const wrapLines = (text, target) => {
    const rows = [];
    displayed(p, text).split('\n').forEach((line, sourceIndex) => {
      const align = target ? (p.rows[sourceIndex]?.align === 'inherit' ? p.alignment : p.rows[sourceIndex]?.align ?? p.alignment) : p.alignment;
      if (!p.wrap || widthOf(line) <= maxLine) { rows.push({ text: line, align, sourceIndex }); return; }
      const tokens = line.match(/ +|[^ ]+/gu) ?? [''];
      let current = '';
      for (const token of tokens) {
        if (current && !/^ +$/.test(token) && widthOf(current + token) > maxLine) { rows.push({ text: current, align, sourceIndex }); current = token; }
        else current += token;
      }
      rows.push({ text: current, align, sourceIndex });
    });
    return rows;
  };
  const targetRows = wrapLines(p.text, true), startRows = wrapLines(p.startText, false);
  const rowCount = Math.max(targetRows.length, startRows.length);
  const all = [], rows = [];
  for (let r = 0; r < rowCount; r++) {
    const target = targetRows[r]?.text ?? '', old = startRows[r]?.text ?? '';
    const align = targetRows[r]?.align ?? p.alignment;
    let x = 0; const cells = [];
    const add = (from, to, width, active) => { cells.push({ x, y: r * (p.size + p.lineGap), width, height: p.size, from, to, active, align: p.mode === 'panels' && p.panelUnit === 'line' ? align : 'center', index: all.length }); all.push(cells.at(-1)); x += width; };
    if (p.mode === 'characters') {
      const a = graphemes(old), b = graphemes(target);
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const from = a[i] ?? ' ', to = b[i] ?? ' ', active = from !== ' ' || to !== ' ';
        if (i && active && cells.at(-1)?.active) x += p.gap;
        add(from, to, active ? charW : charW * p.spaceRatio, active);
      }
    } else if (p.panelUnit === 'line') {
      if (target || old) add(old, target, Math.max(panelWidth(old), panelWidth(target), charW), true);
    } else {
      const a = wordParts(old), b = wordParts(target), count = Math.max(a.words.length, b.words.length);
      for (let i = 0; i <= count; i++) {
        const space = Math.max(a.spaces[i]?.length ?? 0, b.spaces[i]?.length ?? 0);
        if (space) add(a.spaces[i] ?? '', b.spaces[i] ?? '', space * charW * p.spaceRatio, false);
        if (i === count) break;
        const from = a.words[i] ?? '', to = b.words[i] ?? '';
        if (cells.at(-1)?.active) x += p.gap;
        add(from, to, Math.max(panelWidth(from), panelWidth(to), charW), true);
      }
    }
    rows.push({ cells, width: x, align });
  }
  const contentW = rows.reduce((max, row) => Math.max(max, row.width), charW);
  if (p.mode === 'panels' && p.panelUnit === 'line') rows.forEach(row => { row.cells.forEach(c => c.width = contentW); row.width = contentW; });
  rows.forEach(row => {
    const offset = row.align === 'right' ? contentW - row.width : row.align === 'center' ? (contentW - row.width) / 2 : 0;
    row.cells.forEach(cell => cell.x += offset);
  });
  const framePad = p.frame ? 14 : 0;
  const boardW = contentW + framePad * 2;
  const boardH = rowCount * p.size + Math.max(0, rowCount - 1) * p.lineGap + framePad * 2;
  const width = dimensions?.[0] ?? Math.ceil(boardW + p.padding * 2);
  const height = dimensions?.[1] ?? Math.ceil(boardH + p.padding * 2);
  const scale = dimensions ? Math.min(1.5, Math.max(1, width - p.padding * 2) / boardW, Math.max(1, height - p.padding * 2) / boardH) : 1;
  const x = (width - boardW * scale) / 2;
  const y = p.placement === 'top' ? Math.min(p.padding, Math.max(0, height - boardH * scale)) : p.placement === 'bottom' ? Math.max(0, height - p.padding - boardH * scale) : (height - boardH * scale) / 2;
  const scene = { p, cells: all, rows, width, height, boardW, boardH, scale, x, y, framePad, color: foreground(p) };
  scene.timeline = buildTimeline(scene);
  return scene;
}
export function buildTimeline(scene) {
  const p = scene.p;
  const changed = scene.cells.filter(c => c.active && c.from !== c.to);
  const cycles = p.intermediate + 1;
  const cycleDuration = .30 / p.speed;
  const stagger = Math.min(.055, .65 / Math.max(1, changed.length - 1)) / p.speed;
  const starts = new Map(changed.map((cell, i) => [cell.index, .3 + (p.order === 'together' ? 0 : p.order === 'sequence' ? i * stagger : hash(p.seed, cell.index) * .65 / p.speed)]));
  let end = .3;
  for (const start of starts.values()) end = Math.max(end, start + cycles * cycleDuration);
  const resetDuration = p.loop && changed.length ? .3 / p.speed : 0;
  return { starts, cycles, cycleDuration, end, resetDuration, duration: end + p.hold + resetDuration };
}
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ-';
export function intermediateText(scene, cell, cycle) {
  if (cycle < 0) return cell.from;
  if (cycle >= scene.timeline.cycles - 1) return cell.to;
  if (scene.p.mode === 'panels') return cycle % 2 ? '—' : '';
  return ALPHABET[Math.floor(hash(scene.p.seed + cycle * 101, cell.index) * ALPHABET.length)];
}
export function cellFrame(scene, cell, time) {
  if (!Number.isFinite(time)) return { from: cell.to, to: cell.to, phase: 1 };
  const t = scene.timeline, start = t.starts.get(cell.index);
  if (start === undefined) return { from: cell.to, to: cell.to, phase: 1 };
  if (scene.p.loop && time > t.end + scene.p.hold) return { from: cell.to, to: cell.from, phase: time >= t.duration - 1e-10 ? 1 : Math.min(1, (time - t.end - scene.p.hold) / t.resetDuration) };
  if (time < start) return { from: cell.from, to: cell.from, phase: 1 };
  const position = (time - start) / t.cycleDuration;
  if (position >= t.cycles - 1e-10) return { from: cell.to, to: cell.to, phase: 1 };
  const cycle = Math.floor(position);
  return { from: intermediateText(scene, cell, cycle - 1), to: intermediateText(scene, cell, cycle), phase: position - cycle };
}
export function exportDimensions(scene, longEdge) {
  const scale = longEdge ? Math.min(1, longEdge / Math.max(scene.width, scene.height)) : 1;
  return [Math.max(1, Math.round(scene.width * scale)), Math.max(1, Math.round(scene.height * scale))];
}
