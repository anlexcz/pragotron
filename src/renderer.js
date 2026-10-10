import { fontStyle, fontWidth, cellFrame } from './scene.js';
import { hash } from './model.js';

function rounded(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
export class Renderer {
  constructor(createCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }) {
    this.createCanvas = createCanvas; this.cache = new Map(); this.scene = null; this.cachePixels = 0;
  }
  reset() { this.cache.clear(); this.cachePixels = 0; this.scene = null; }
  sheet(scene, cell, text) {
    const key = `${cell.width}:${cell.height}:${cell.align}:${text}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = scene.p, w = Math.ceil(cell.width), h = Math.ceil(cell.height);
    const textureScale = Math.min(1, 8192 / w);
    const canvas = this.createCanvas(Math.ceil(w * textureScale), Math.ceil(h * textureScale)), c = canvas.getContext('2d');
    c.scale(textureScale, textureScale);
    c.fillStyle = p.panelColor; rounded(c, 0, 0, w, h, p.radius); c.fill();
    const shade = c.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(255,255,255,.045)'); shade.addColorStop(.48, 'rgba(0,0,0,.015)');
    shade.addColorStop(.50, 'rgba(0,0,0,.10)'); shade.addColorStop(1, 'rgba(0,0,0,.025)');
    c.fillStyle = shade; rounded(c, 0, 0, w, h, p.radius); c.fill();
    c.save(); c.beginPath(); c.rect(3, 1, Math.max(0, w - 6), h - 2); c.clip();
    c.font = fontStyle(p); c.fillStyle = scene.color; c.textBaseline = 'alphabetic';
    const metrics = c.measureText(text);
    const pad = p.mode === 'characters' ? 4 : p.size * .22;
    const squeeze = Math.min(fontWidth(p), Math.max(0.01, (w - pad * 2) / Math.max(1, metrics.width)));
    const tw = metrics.width * squeeze;
    const x = cell.align === 'left' ? pad : cell.align === 'right' ? w - pad - tw : (w - tw) / 2;
    // Fixed baseline across all glyphs. Capitals leave room for Czech accents.
    c.translate(x, h * .76); c.scale(squeeze, 1); c.fillText(text, 0, 0); c.restore();
    if (p.patina) {
      c.fillStyle = 'rgba(128,128,128,.18)';
      for (let n = 0; n < 36; n++) c.fillRect(hash(p.seed, n + 37) * w, hash(p.seed, n + 171) * h, 1.5, 1);
    }
    if (this.cachePixels + canvas.width * canvas.height > 8_000_000) { this.cache.clear(); this.cachePixels = 0; }
    this.cache.set(key, canvas); this.cachePixels += canvas.width * canvas.height;
    return canvas;
  }
  half(ctx, sheet, w, h, lower) { ctx.drawImage(sheet, 0, lower ? sheet.height / 2 : 0, sheet.width, sheet.height / 2, 0, lower ? h / 2 : 0, w, h / 2); }
  movingHalf(ctx, sheet, w, h, lower, factor) {
    if (factor < .004) return;
    // Horizontal strips approximate the perspective of a leaf rotating around its central hinge.
    const strips = 12;
    for (let i = 0; i < strips; i++) {
      const t0 = i / strips, t1 = (i + 1) / strips;
      const sy = (lower ? .5 : 0) * sheet.height + t0 * sheet.height / 2;
      const dy = lower ? h / 2 + t0 * h / 2 * factor : h / 2 - (1 - t0) * h / 2 * factor;
      const distance = lower ? (t0 + t1) / 2 : 1 - (t0 + t1) / 2;
      const inset = w * .018 * distance * (1 - factor);
      ctx.drawImage(sheet, 0, sy, sheet.width, sheet.height / (2 * strips), inset, dy, w - inset * 2, h / (2 * strips) * factor + .3);
    }
    ctx.fillStyle = `rgba(0,0,0,${(1 - factor) * .5})`;
    ctx.fillRect(0, lower ? h / 2 : h / 2 - h / 2 * factor, w, h / 2 * factor);
  }
  render(ctx, scene, time = Infinity) {
    if (this.scene !== scene) { this.reset(); this.scene = scene; }
    const p = scene.p, outW = ctx.canvas.width, outH = ctx.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, outW, outH);
    if (p.background === 'solid') { ctx.fillStyle = p.backgroundColor; ctx.fillRect(0, 0, outW, outH); }
    ctx.save(); ctx.scale(outW / scene.width, outH / scene.height); ctx.translate(scene.x, scene.y); ctx.scale(scene.scale, scene.scale);
    if (p.frame) {
      ctx.fillStyle = '#252827'; rounded(ctx, 0, 0, scene.boardW, scene.boardH, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#71756c';
      for (const [x, y] of [[7, 7], [scene.boardW - 7, 7], [7, scene.boardH - 7], [scene.boardW - 7, scene.boardH - 7]]) {
        ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.translate(scene.framePad, scene.framePad);
    for (const cell of scene.cells) {
      if (!cell.active) continue;
      ctx.save(); ctx.translate(cell.x, cell.y);
      const w = Math.ceil(cell.width), h = Math.ceil(cell.height), f = cellFrame(scene, cell, time);
      // An outgoing glyph resolves to empty space, rather than a permanent blank leaf.
      if (f.phase >= 1 && f.to === cell.to && !cell.to.trim()) { ctx.restore(); continue; }
      const old = this.sheet(scene, cell, f.from), next = this.sheet(scene, cell, f.to);
      if (f.phase >= 1 || f.from === f.to) ctx.drawImage(next, 0, 0, w, h);
      else {
        this.half(ctx, next, w, h, false); this.half(ctx, old, w, h, true);
        const eased = f.phase * f.phase * (3 - 2 * f.phase);
        if (eased < .5) this.movingHalf(ctx, old, w, h, false, Math.cos(eased * Math.PI));
        else this.movingHalf(ctx, next, w, h, true, -Math.cos(eased * Math.PI));
      }
      if (p.shadow && p.seam) {
        const gradient = ctx.createLinearGradient(0, h / 2 - 3, 0, h / 2 + 4);
        gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(.5, 'rgba(0,0,0,.25)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient; ctx.fillRect(0, h / 2 - 3, w, 7);
      }
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, h / 2 - p.seam / 2, w, p.seam);
      ctx.restore();
    }
    ctx.restore();
  }
}
