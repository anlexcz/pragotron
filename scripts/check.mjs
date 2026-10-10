import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { FONTS } from '../src/model.js';
for (const name of await readdir(new URL('../src/', import.meta.url))) {
  if (!name.endsWith('.js')) continue;
  const result = spawnSync(process.execPath, ['--check', new URL(`../src/${name}`, import.meta.url).pathname], { encoding: 'utf8' });
  if (result.status) throw new Error(result.stderr);
}
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) await access(new URL(`../${match[1]}`, import.meta.url));
for (const font of Object.values(FONTS)) await access(new URL(`../assets/fonts/${font.file}`, import.meta.url));
console.log('Syntaxe modulů a lokální soubory jsou v pořádku.');
