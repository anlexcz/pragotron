import { GifEncoder } from './gif.js';
let encoder;
self.onmessage = ({ data }) => {
  try {
    if (data.type === 'init') { encoder = new GifEncoder(data.width, data.height, data.palette, data.loop); self.postMessage({ type: 'ready' }); }
    if (data.type === 'frame') { encoder.addFrame(new Uint8ClampedArray(data.buffer), data.delay); self.postMessage({ type: 'frame', bytes: encoder.bytes }); }
    if (data.type === 'finish') { const bytes = encoder.finish(); encoder = null; self.postMessage({ type: 'done', buffer: bytes.buffer }, [bytes.buffer]); }
  } catch (error) { encoder = null; self.postMessage({ type: 'error', message: error.message }); }
};
