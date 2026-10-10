import test from 'node:test';
import assert from 'node:assert/strict';
import { GifEncoder, lzw, makePalette } from '../src/gif.js';

// Decoder-side LZW implementation: validates code-width transitions and dictionary resets.
function decode(bytes) {
  let position = 0, width = 9, next = 258, dictionary, old, result = [];
  function reset() { dictionary = Array.from({ length: 256 }, (_, i) => [i]); width = 9; next = 258; old = undefined; }
  reset();
  for (;;) {
    let code = 0;
    for (let n = 0; n < width; n++, position++) code |= ((bytes[position >> 3] >> (position & 7)) & 1) << n;
    if (code === 256) { reset(); continue; }
    if (code === 257) return Uint8Array.from(result);
    if (position > bytes.length * 8) throw new Error('Missing end code');
    let entry = dictionary[code];
    if (!entry && code === next && old) entry = [...old, old[0]];
    if (!entry) throw new Error(`Invalid LZW code ${code}, expected <= ${next}`);
    for (const value of entry) result.push(value);
    if (old && next < 4096) { dictionary[next++] = [...old, entry[0]]; if (next === (1 << width) && width < 12) width++; }
    old = entry;
  }
}
test('LZW decodes long noisy inputs across 9–12 bit transitions and resets', () => {
  const pixels = new Uint8Array(100000); let seed = 1234567;
  for (let i = 0; i < pixels.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; pixels[i] = seed & 255; }
  assert.deepEqual(decode(lzw(pixels)), pixels);
});
test('LZW handles empty, single-pixel and repetitive frames', () => {
  for (const data of [new Uint8Array(), Uint8Array.of(255), new Uint8Array(20000).fill(17)]) assert.deepEqual(decode(lzw(data)), data);
});
test('GIF89a reserves transparency, encodes disposal and exact hold delay', () => {
  const palette = makePalette('#171717', '#f4f1e7', '#ece8df'); assert.equal(palette.length, 256);
  const e = new GifEncoder(2, 1, palette, false); e.addFrame(Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 255), 300);
  const data = e.finish(); assert.equal(new TextDecoder().decode(data.slice(0, 6)), 'GIF89a');
  assert.equal(new TextDecoder().decode(data).includes('NETSCAPE2.0'), false);
  assert.deepEqual([...data.slice(781, 789)], [0x21, 0xf9, 4, 9, 44, 1, 255, 0]);
  assert.equal(data.at(-1), 0x3b);
  const compressed = data.slice(801, 801 + data[800]);
  const indexed = decode(compressed); assert.equal(indexed[0], 255); assert.notEqual(indexed[1], 255);
});
test('Only looping GIFs receive a Netscape loop extension', () => {
  const e = new GifEncoder(1, 1, makePalette('#171717', '#f4f1e7', '#ece8df'), true);
  e.addFrame(Uint8Array.of(1, 2, 3, 255), 5);
  assert.ok(new TextDecoder().decode(e.finish()).includes('NETSCAPE2.0'));
});
