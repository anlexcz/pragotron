import { defaults, validateProject, reconcileRows, THEMES, FONTS, foreground, contrast } from './model.js';
import { buildScene, exportDimensions } from './scene.js';
import { Renderer } from './renderer.js';
import { makePalette } from './gif.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'pragotron-project-v1';
let project = defaults(), scene, ready = false, animationId = 0, saveTimer, exportTask = null, lastFile = null, lastUrl = null;
const preview = $('preview'), ctx = preview.getContext('2d'), renderer = new Renderer();
const fields = [...document.querySelectorAll('[data-field]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let loadNotice = '';
try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { project = validateProject(JSON.parse(saved)); loadNotice = 'Rozepsaný projekt byl obnoven.'; } }
catch { loadNotice = 'Uložený projekt se nepodařilo obnovit. Můžeš pokračovat s novou tabulí.'; }

function notice(message, error = false) { $('notice').textContent = message; $('notice').classList.toggle('error', error); }
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { notice('Automatické uložení není dostupné. Projekt si můžeš stáhnout jako JSON.'); } }, 300);
}
function rowControls() {
  const container = $('row-alignments'); container.replaceChildren();
  project.text.split('\n').forEach((line, i) => {
    const div = document.createElement('div'); div.className = 'row-control';
    const text = document.createElement('span'); text.textContent = `${i + 1}. ${line || '(prázdný řádek)'}`; text.title = line;
    const select = document.createElement('select'); select.setAttribute('aria-label', `Zarovnání řádku ${i + 1}`);
    for (const [value, label] of [['inherit', 'Společné'], ['left', 'Vlevo'], ['center', 'Na střed'], ['right', 'Vpravo']]) {
      const option = new Option(label, value); select.add(option);
    }
    select.value = project.rows[i]?.align ?? 'inherit';
    select.addEventListener('change', () => { project.rows[i].align = select.value; update(); });
    div.append(text, select); container.append(div);
  });
}
function sync() {
  for (const el of fields) {
    const value = project[el.dataset.field];
    if (el.type === 'radio') el.checked = value === el.value;
    else if (el.type === 'checkbox') el.checked = value;
    else {
      if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === String(value))) el.add(new Option(String(value), String(value)));
      if (document.activeElement !== el || el.type === 'color') el.value = value;
    }
  }
  document.querySelectorAll('[data-output]').forEach(el => {
    const key = el.dataset.output, value = project[key];
    el.textContent = key === 'spaceRatio' || key === 'ratio' ? `${Math.round(value * 100)} %` : key === 'speed' ? `${value.toFixed(1)}×` : String(value);
  });
  $('panel-unit-wrap').hidden = project.mode !== 'panels';
  $('custom-size').hidden = project.canvas !== 'custom';
  $('background-color-wrap').hidden = project.background !== 'solid';
  $('auto-color').checked = project.textColorMode === 'auto';
  const textColor = document.querySelector('[data-field="textColor"]'); textColor.disabled = project.textColorMode === 'auto'; textColor.value = foreground(project);
  $('font-sample').style.fontFamily = `"${FONTS[project.font].family}", sans-serif`;
  $('font-sample').style.fontWeight = project.font === 'narrow' ? '400' : '700';
  document.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === project.theme)));
  const cr = contrast(project.panelColor, foreground(project));
  $('contrast-note').hidden = cr >= 4.5;
  $('contrast-note').textContent = `Text má slabší kontrast (${cr.toFixed(1)}:1). Pro lepší čitelnost zapni automatickou barvu.`;
  $('preview-stage').classList.toggle('transparent', project.background === 'transparent');
}
function stopAnimation() { cancelAnimationFrame(animationId); animationId = 0; $('stop').disabled = true; }
function update({ rows = false } = {}) {
  stopAnimation(); sync(); if (rows) rowControls(); persist();
  if (!ready) return;
  try {
    scene = buildScene(structuredClone(project), ctx);
    // Size the drawing surface, not the exported composition. CSS controls display size.
    const [w, h] = exportDimensions(scene, 1500); preview.width = w; preview.height = h;
    renderer.render(ctx, scene);
    preview.setAttribute('aria-label', `Pragotron: ${project.text}`);
    $('dimensions').textContent = `${scene.width} × ${scene.height} px`;
    $('duration').textContent = `${scene.timeline.duration.toFixed(1)} s`;
    $('empty-note').hidden = !!project.text.trim();
    refreshButtons();
  } catch (error) { notice(error.message, true); }
}
function refreshButtons() {
  const empty = !project.text.trim();
  $('play').disabled = !ready || empty;
  $('export-png').disabled = !ready || empty || !!exportTask;
  $('export-gif').disabled = !ready || empty || !!exportTask;
}
fields.forEach(el => el.addEventListener('input', () => {
  const key = el.dataset.field;
  if (el.type === 'radio' && !el.checked) return;
  let value = el.type === 'checkbox' ? el.checked : typeof defaults()[key] === 'number' ? Number(el.value) : el.value;
  if (typeof value === 'number' && (!Number.isFinite(value) || el.value === '')) return;
  if (key === 'text') project.rows = reconcileRows(project.text, value, project.rows);
  if (key === 'theme' && THEMES[value]) project.panelColor = THEMES[value].panel;
  if (key === 'panelColor') project.theme = 'custom';
  if (key === 'textColor') project.textColorMode = 'custom';
  if (key === 'mode') project.order = value === 'panels' ? 'sequence' : 'random';
  project[key] = value;
  try { project = validateProject(project); update({ rows: key === 'text' }); } catch (error) { notice(error.message, true); }
}));
$('auto-color').addEventListener('change', e => { project.textColorMode = e.target.checked ? 'auto' : 'custom'; if (!e.target.checked) project.textColor = foreground({ ...project, textColorMode: 'auto' }); update(); });
document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => { project.theme = button.dataset.theme; project.panelColor = THEMES[project.theme].panel; update(); }));
$('shuffle').addEventListener('click', () => { project.seed = crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff; update(); play(); });
function play() {
  if (!ready || !project.text.trim()) return;
  stopAnimation();
  if (reducedMotion.matches) { renderer.render(ctx, scene); notice('Máš zapnuté omezení pohybu. Náhled je statický, animovaný GIF lze stále stáhnout.'); return; }
  const snapshot = scene, start = performance.now(); $('stop').disabled = false;
  function tick(now) {
    const elapsed = (now - start) / 1000;
    if (!snapshot.p.loop && elapsed >= snapshot.timeline.duration) { renderer.render(ctx, snapshot); stopAnimation(); return; }
    renderer.render(ctx, snapshot, snapshot.p.loop ? elapsed % snapshot.timeline.duration : elapsed);
    animationId = requestAnimationFrame(tick);
  }
  animationId = requestAnimationFrame(tick);
}
$('play').addEventListener('click', play);
$('stop').addEventListener('click', () => { stopAnimation(); renderer.render(ctx, scene); });
document.addEventListener('visibilitychange', () => { if (document.hidden && animationId) { stopAnimation(); renderer.render(ctx, scene); } });

function filename(extension) {
  const date = new Date(), pad = n => String(n).padStart(2, '0');
  return `pragotron-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.${extension}`;
}
function offerFile(blob, extension) {
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob); lastFile = new File([blob], filename(extension), { type: blob.type });
  const link = $('download-again'); link.href = lastUrl; link.download = lastFile.name;
  $('download-result').hidden = false; $('file-size').textContent = blob.size < 1048576 ? `${Math.round(blob.size / 1024)} kB` : `${(blob.size / 1048576).toFixed(1)} MB`;
  $('share-file').hidden = !navigator.canShare?.({ files: [lastFile] });
  link.click();
}
$('share-file').addEventListener('click', async () => {
  if (!lastFile) return;
  try { await navigator.share({ files: [lastFile], title: 'Můj pragotron' }); }
  catch (error) { if (error.name !== 'AbortError') notice('Sdílení se nepodařilo. Použij stažení souboru.', true); }
});
$('save-project').addEventListener('click', () => offerFile(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), 'json'));
$('import-project').addEventListener('click', () => $('project-file').click());
$('project-file').addEventListener('change', async e => {
  const file = e.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Projekt je větší než 5 MB. Vyber JSON uložený tímto editorem.');
    project = validateProject(JSON.parse(await file.text())); document.activeElement?.blur(); update({ rows: true }); notice('Projekt byl načten.');
  } catch (error) { notice(`Projekt se nepodařilo načíst: ${error.message}`, true); }
  e.target.value = '';
});
$('reset').addEventListener('click', () => { if (confirm('Smazat rozepsanou tabuli a vrátit výchozí nastavení?')) { project = defaults(); update({ rows: true }); notice('Nová tabule je připravená.'); } });

function beginExport() {
  stopAnimation(); renderer.render(ctx, scene);
  const task = { cancelled: false, worker: null, reject: null }; exportTask = task;
  $('export-progress').hidden = false; $('progress').value = 0; $('progress-label').textContent = 'Připravuji export…';
  refreshButtons(); notice('Exportuji aktuální podobu tabule. Nastavení můžeš dál upravovat.');
  return task;
}
function endExport(task) {
  task.worker?.terminate(); task.reject = null;
  if (exportTask === task) { exportTask = null; $('export-progress').hidden = true; refreshButtons(); }
}
$('cancel-export').addEventListener('click', () => {
  if (!exportTask) return;
  const task = exportTask; task.cancelled = true; task.worker?.terminate(); task.reject?.(new DOMException('Export zrušen.', 'AbortError'));
  endExport(task); notice('Export byl zrušen.');
});
function snapshotScene() {
  const c = document.createElement('canvas'); return buildScene(structuredClone(project), c.getContext('2d'));
}
$('export-png').addEventListener('click', async () => {
  if (exportTask || !ready) return;
  const snapshot = snapshotScene();
  if (snapshot.width > 16384 || snapshot.height > 16384 || snapshot.width * snapshot.height > 16_000_000) { notice('Tahle tabule je pro PNG příliš velká. Zvol pevný formát plátna, menší moduly nebo text rozděl do řádků.', true); return; }
  const task = beginExport();
  const canvas = document.createElement('canvas'); canvas.width = snapshot.width; canvas.height = snapshot.height;
  const r = new Renderer();
  try {
    r.render(canvas.getContext('2d'), snapshot); $('progress').value = 60; $('progress-label').textContent = 'Ukládám PNG…';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (task.cancelled) return;
    if (!blob) throw new Error('Prohlížeč obrázek nevytvořil. Zkus menší rozměry.');
    offerFile(blob, 'png'); notice('PNG je hotové. Pokud se stažení nespustilo, použij odkaz výše.');
  } catch (error) { if (!task.cancelled) notice(error.message, true); }
  finally { r.reset(); canvas.width = canvas.height = 1; endExport(task); }
});

function workerRequest(task, message, transfer = []) {
  return new Promise((resolve, reject) => {
    if (task.cancelled) { reject(new DOMException('Export zrušen.', 'AbortError')); return; }
    task.reject = reject;
    task.worker.onmessage = ({ data }) => {
      task.reject = null;
      if (data.type === 'error') reject(new Error(data.message)); else resolve(data);
    };
    task.worker.onerror = event => { task.reject = null; reject(new Error(event.message || 'Prohlížeč nespustil exportní worker. Otevři stránku přes HTTP nebo HTTPS.')); };
    task.worker.postMessage(message, transfer);
  });
}
$('export-gif').addEventListener('click', async () => {
  if (exportTask || !ready) return;
  const snapshot = snapshotScene(), p = snapshot.p;
  const [w, h] = exportDimensions(snapshot, p.gifSize), t = snapshot.timeline;
  const animationFrames = Math.ceil(t.end * p.fps), resetFrames = Math.ceil(t.resetDuration * p.fps);
  const count = animationFrames + 1 + resetFrames;
  if (w * h * count > 500_000_000) { notice('GIF by byl na tomto nastavení příliš náročný. Zvol 480 px, méně mezilistů nebo vyšší rychlost.', true); return; }
  const task = beginExport();
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const context = canvas.getContext('2d', { willReadFrequently: true }), r = new Renderer();
  try {
    task.worker = new Worker(new URL('./gif-worker.js', import.meta.url), { type: 'module' });
    await workerRequest(task, { type: 'init', width: w, height: h, palette: makePalette(p.panelColor, foreground(p), p.backgroundColor), loop: p.loop });
    let completed = 0;
    const frame = async (time, delay) => {
      if (task.cancelled) throw new DOMException('Export zrušen.', 'AbortError');
      r.render(context, snapshot, time);
      const data = context.getImageData(0, 0, w, h).data;
      await workerRequest(task, { type: 'frame', buffer: data.buffer, delay }, [data.buffer]);
      completed++; $('progress').value = completed / count * 95;
      $('progress-label').textContent = `Překlápím a kóduji · ${completed} / ${count} snímků`;
    };
    // Sample in centiseconds so the exported timing equals GIF's actual timing.
    for (let i = 0; i < animationFrames; i++) {
      const start = Math.round(i * 100 / p.fps), end = Math.round((i + 1) * 100 / p.fps);
      await frame(start / 100, end - start);
    }
    await frame(t.end, Math.round(p.hold * 100));
    for (let i = 1; i <= resetFrames; i++) await frame(t.end + p.hold + t.resetDuration * i / resetFrames, Math.round(100 / p.fps));
    $('progress-label').textContent = 'Dokončuji GIF…';
    const result = await workerRequest(task, { type: 'finish' });
    if (task.cancelled) return;
    offerFile(new Blob([result.buffer], { type: 'image/gif' }), 'gif');
    notice('GIF je hotový. Průhledné okolí a opakování respektuje podle možností aplikace, ve které ho otevřeš.');
  } catch (error) { if (!task.cancelled) notice(error.message, true); }
  finally { r.reset(); canvas.width = canvas.height = 1; endExport(task); }
});

sync(); rowControls();
Promise.all(Object.values(FONTS).map(async font => {
  const face = new FontFace(font.family, `url(${new URL(`../assets/fonts/${font.file}`, import.meta.url)})`, { weight: font.family === 'Prago Narrow' ? '400' : '700' });
  document.fonts.add(await face.load());
})).then(() => {
  ready = true; update(); notice(loadNotice || 'Tabule je připravená. Zkus změnit text nebo přehrát přetočení.');
}).catch(() => notice('Písma se nepodařilo načíst. Obnov stránku a ověř, že na hostingu nechybí složka assets/fonts.', true));
window.addEventListener('beforeunload', () => {
  if (lastUrl) URL.revokeObjectURL(lastUrl); exportTask?.worker?.terminate();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { /* Optional local persistence. */ }
});
