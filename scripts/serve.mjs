import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(new URL('../', import.meta.url).pathname), port = Number(process.env.PORT || 8080);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + sep) && path !== root) { res.writeHead(403); res.end(); return; }
    const actual = (await stat(path)).isDirectory() ? resolve(path, 'index.html') : path;
    const data = await readFile(actual); res.writeHead(200, { 'Content-Type': mime[extname(actual)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data);
  } catch { res.writeHead(404); res.end('Nenalezeno'); }
}).listen(port, '127.0.0.1', () => console.log(`Pragotron: http://localhost:${port}`));
