import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { makePalette } from '../src/gif.js';
test('Export worker streams frames, reports errors, and transfers a finished GIF', async () => {
  const workerUrl = new URL('../src/gif-worker.js', import.meta.url).href;
  const worker = new Worker(`
    const { parentPort } = require('node:worker_threads');
    globalThis.self = { postMessage: (data, transfer) => parentPort.postMessage(data, transfer) };
    import(${JSON.stringify(workerUrl)}).then(() => parentPort.on('message', data => self.onmessage({data})));
  `, { eval: true });
  const request = (data, transfer = []) => new Promise((resolve, reject) => {
    worker.once('message', resolve); worker.once('error', reject); worker.postMessage(data, transfer);
  });
  try {
    assert.equal((await request({ type: 'init', width: 2, height: 1, palette: makePalette('#171717', '#f4f1e7', '#ece8df'), loop: false })).type, 'ready');
    for (const delay of [5, 300]) {
      const frame = Uint8ClampedArray.of(0, 0, 0, 0, 245, 245, 245, 255);
      const response = await request({ type: 'frame', buffer: frame.buffer, delay }, [frame.buffer]);
      assert.equal(response.type, 'frame'); assert.ok(response.bytes > 781); assert.equal(frame.byteLength, 0);
    }
    const result = await request({ type: 'finish' }); assert.equal(result.type, 'done');
    const bytes = new Uint8Array(result.buffer); assert.equal(bytes.at(-1), 0x3b); assert.ok(bytes.length > 800);
    const bad = await request({ type: 'init', width: 0, height: 1, palette: makePalette('#171717', '#f4f1e7', '#ece8df') });
    assert.equal(bad.type, 'error');
  } finally { await worker.terminate(); }
});
