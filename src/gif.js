// Original GIF89a encoder. Full-frame images, global palette, streaming LZW.
// Format reference: https://www.w3.org/Graphics/GIF/spec-gif89a.txt
import { rgb } from './model.js';

export function makePalette(panel, foreground, background) {
  const colors = [];
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) colors.push([r * 51, g * 51, b * 51]);
  const stops = [rgb(panel), rgb(foreground), rgb(background), [0, 0, 0], [255, 255, 255]];
  for (let i = 0; i < 39; i++) {
    const group = Math.floor(i / 13), t = (i % 13) / 12;
    const a = stops[group], b = group === 0 ? stops[3] : group === 1 ? stops[0] : stops[4];
    colors.push(a.map((v, n) => Math.round(v * (1 - t) + b[n] * t)));
  }
  colors.push([0, 0, 0]); // Reserved transparency index; opaque black uses another index.
  return colors;
}
export function indexPixels(data, palette, lookup) {
  const indexed = new Uint8Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    if (data[i + 3] < 128) { indexed[j] = 255; continue; }
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
    if (lookup[key] !== -1) { indexed[j] = lookup[key]; continue; }
    let best = 0, error = Infinity;
    for (let n = 0; n < 255; n++) {
      const c = palette[n], d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
      if (d < error) { error = d; best = n; if (!d) break; }
    }
    lookup[key] = best; indexed[j] = best;
  }
  return indexed;
}
export function lzw(indices) {
  const clear = 256, end = 257, out = [];
  let bits = 0, buffer = 0, width = 9, next = 258, dictionary = new Map();
  const emit = code => {
    buffer |= code << bits; bits += width;
    while (bits >= 8) { out.push(buffer & 255); buffer >>>= 8; bits -= 8; }
  };
  emit(clear);
  if (indices.length) {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const suffix = indices[i], key = prefix * 256 + suffix;
      const found = dictionary.get(key);
      if (found !== undefined) { prefix = found; continue; }
      emit(prefix);
      // Decoder's dictionary is one entry behind while reading emitted codes.
      if (next > (1 << width) - 1 && width < 12) width++;
      if (next < 4096) dictionary.set(key, next++);
      else { emit(clear); dictionary = new Map(); width = 9; next = 258; }
      prefix = suffix;
    }
    emit(prefix);
    if (next > (1 << width) - 1 && width < 12) width++;
  }
  emit(end);
  if (bits) out.push(buffer & 255);
  return Uint8Array.from(out);
}
export class GifEncoder {
  constructor(width, height, palette, loop = false) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 65535 || height > 65535) throw new Error('Neplatné rozměry GIFu.');
    this.width = width; this.height = height; this.palette = palette; this.parts = []; this.bytes = 0;
    this.lookup = new Int16Array(32768).fill(-1);
    const header = [...new TextEncoder().encode('GIF89a'), width & 255, width >> 8, height & 255, height >> 8, 0xf7, 255, 0, ...palette.flat()];
    if (loop) header.push(0x21, 0xff, 11, ...new TextEncoder().encode('NETSCAPE2.0'), 3, 1, 0, 0, 0);
    this.append(Uint8Array.from(header));
  }
  append(bytes) { this.parts.push(bytes); this.bytes += bytes.length; if (this.bytes > 100 * 1024 * 1024) throw new Error('GIF je příliš velký. Zvol nižší rozlišení nebo méně mezilistů.'); }
  addFrame(rgba, delay) {
    if (rgba.length !== this.width * this.height * 4) throw new Error('Nesouhlasí velikost snímku.');
    const cs = Math.max(1, Math.min(65535, Math.round(delay)));
    // Disposal 2 restores the transparent background between full-frame images.
    const header = [0x21, 0xf9, 4, 9, cs & 255, cs >> 8, 255, 0, 0x2c, 0, 0, 0, 0, this.width & 255, this.width >> 8, this.height & 255, this.height >> 8, 0, 8];
    this.append(Uint8Array.from(header));
    const compressed = lzw(indexPixels(rgba, this.palette, this.lookup));
    const blocks = new Uint8Array(compressed.length + Math.ceil(compressed.length / 255) + 1);
    let cursor = 0;
    for (let i = 0; i < compressed.length; i += 255) {
      const chunk = compressed.subarray(i, i + 255); blocks[cursor++] = chunk.length; blocks.set(chunk, cursor); cursor += chunk.length;
    }
    blocks[cursor] = 0; this.append(blocks);
  }
  finish() {
    this.append(Uint8Array.of(0x3b));
    const bytes = new Uint8Array(this.bytes); let offset = 0;
    for (const part of this.parts) { bytes.set(part, offset); offset += part.length; }
    this.parts = []; return bytes;
  }
}
