// Wires the page: layouts, grades, photos, caption, export.
// State lives in one object; every control mutates it and calls redraw().
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, GRADES, CAPTIONS, panelsFor } from './cover.js';
import { runShot } from './shots.js';

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const thumbsEl = document.getElementById('thumbs');
const panelBtnsEl = document.getElementById('panel-btns');
const zoomEl = document.getElementById('zoom');
const zoomValEl = document.getElementById('zoom-val');

const state = {
  layout: 'grid',
  grade: 'sunset',
  size: '1080x1080',
  title: 'Sunset Heist',
  subtitle: 'Vice City',
  selected: 0,
  library: [], // { img, name }
  panels: [
    { img: null, ox: 0, oy: 0, zoom: 1 },
    { img: null, ox: 0, oy: 0, zoom: 1 },
    { img: null, ox: 0, oy: 0, zoom: 1 },
    { img: null, ox: 0, oy: 0, zoom: 1 },
  ],
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function redraw() {
  drawCover(canvas, state);
  renderPanelButtons();
  renderThumbs();
}

function setSize(key) {
  state.size = key;
  const [w, h] = SIZES[key];
  canvas.width = w;
  canvas.height = h;
  canvas.style.aspectRatio = `${w} / ${h}`;
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === key));
  redraw();
}

function setLayout(key) {
  state.layout = key;
  state.selected = 0;
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === key));
  redraw();
}

function setGrade(key) {
  state.grade = key;
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === key));
  redraw();
}

/** Applies one of the ready-made GTA-style caption pairs. */
function applyCaption(i) {
  const pair = CAPTIONS[i];
  if (!pair) return;
  [state.title, state.subtitle] = pair;
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.querySelectorAll('[data-preset]').forEach((b) =>
    b.classList.toggle('active', Number(b.dataset.preset) === i));
  statusEl.textContent = `Caption: “${state.title}” — ${state.subtitle}`;
  drawCover(canvas, state);
}

function selectPanel(i) {
  state.selected = Math.min(i, panelCount() - 1);
  const p = state.panels[state.selected];
  zoomEl.value = String(Math.round((p.zoom || 1) * 100));
  zoomValEl.textContent = `${Math.round((p.zoom || 1) * 100)}%`;
  redraw();
}

function assignPhoto(libIndex) {
  const lib = state.library[libIndex];
  if (!lib) return;
  const p = state.panels[state.selected];
  p.img = lib.img;
  p.ox = 0;
  p.oy = 0;
  p.zoom = 1;
  zoomEl.value = '100';
  zoomValEl.textContent = '100%';
  statusEl.textContent = `Panel ${state.selected + 1} ← ${lib.name}`;
  redraw();
}

/** Empties the selected panel (its photo stays in the library). */
function clearPanel() {
  const p = state.panels[state.selected];
  p.img = null;
  p.ox = 0;
  p.oy = 0;
  p.zoom = 1;
  zoomEl.value = '100';
  zoomValEl.textContent = '100%';
  statusEl.textContent = `Panel ${state.selected + 1} cleared`;
  redraw();
}

function renderPanelButtons() {
  panelBtnsEl.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === state.selected ? ' active' : '');
    const p = state.panels[i];
    const name = p.img ? photoName(p.img) : 'empty';
    b.textContent = `Panel ${i + 1} · ${name}`;
    b.addEventListener('click', () => selectPanel(i));
    panelBtnsEl.appendChild(b);
  }
}

function photoName(img) {
  const lib = state.library.find((l) => l.img === img);
  return lib ? lib.name : 'photo';
}

function renderThumbs() {
  thumbsEl.innerHTML = '';
  state.library.forEach((lib, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `Use ${lib.name} in panel ${state.selected + 1}`;
    const t = document.createElement('img');
    t.src = lib.img.src;
    t.alt = lib.name;
    b.appendChild(t);
    const s = document.createElement('span');
    s.textContent = lib.name;
    b.appendChild(s);
    if (state.panels[state.selected] && state.panels[state.selected].img === lib.img) {
      b.classList.add('active');
    }
    b.addEventListener('click', () => assignPhoto(i));
    thumbsEl.appendChild(b);
  });
}

async function addFiles(files) {
  let added = 0;
  let skipped = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) { skipped++; continue; }
    const name = file.name.replace(/\.[^.]+$/, '');
    if (state.library.some((l) => l.name === name)) { skipped++; continue; }
    try {
      const img = await loadImage(URL.createObjectURL(file));
      state.library.push({ img, name });
      added++;
    } catch { skipped++; }
  }
  if (!added) {
    if (skipped) statusEl.textContent = `Skipped ${skipped} file${skipped > 1 ? 's' : ''} (not an image, unreadable or already added)`;
    return;
  }
  // Fill empty panels with new photos, first come first served.
  let li = state.library.length - added;
  for (let i = 0; i < panelCount() && li < state.library.length; i++) {
    if (!state.panels[i].img) {
      state.panels[i].img = state.library[li].img;
      state.panels[i].ox = 0;
      state.panels[i].oy = 0;
      state.panels[i].zoom = 1;
      li++;
    }
  }
  statusEl.textContent = `Added ${added} photo${added > 1 ? 's' : ''}${skipped ? ` (${skipped} skipped)` : ''}`;
  redraw();
}

/** Downloads a canvas as a PNG file. */
function downloadCanvas(c, filename) {
  return new Promise((resolve) => {
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

async function exportOne(sizeKey) {
  const [w, h] = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  await downloadCanvas(off, `vice-cover-${w}x${h}.png`);
  return `vice-cover-${w}x${h}.png`;
}

// --- Canvas interaction: click selects a panel, drag pans its photo, wheel zooms. ---
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

function panelAt(x, y) {
  const rects = panelsFor(state.layout, canvas.width, canvas.height);
  for (let i = 0; i < panelCount(); i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  selectPanel(i);
  const rect = panelsFor(state.layout, canvas.width, canvas.height)[i];
  drag = { x: p.x, y: p.y, ox: state.panels[i].ox, oy: state.panels[i].oy, w: rect.w, h: rect.h };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selected];
  panel.ox = drag.ox + (p.x - drag.x) / drag.w;
  panel.oy = drag.oy + (p.y - drag.y) / drag.h;
  drawCover(canvas, state);
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  selectPanel(i);
  const panel = state.panels[i];
  panel.zoom = Math.min(3, Math.max(1, (panel.zoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)));
  zoomEl.value = String(Math.round(panel.zoom * 100));
  zoomValEl.textContent = `${Math.round(panel.zoom * 100)}%`;
  drawCover(canvas, state);
}, { passive: false });

// --- Controls ---
document.querySelectorAll('[data-layout]').forEach((b) =>
  b.addEventListener('click', () => setLayout(b.dataset.layout)));
document.querySelectorAll('[data-grade]').forEach((b) =>
  b.addEventListener('click', () => setGrade(b.dataset.grade)));
document.querySelectorAll('[data-preset]').forEach((b) =>
  b.addEventListener('click', () => applyCaption(Number(b.dataset.preset))));
document.querySelectorAll('[data-size]').forEach((b) =>
  b.addEventListener('click', () => setSize(b.dataset.size)));

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  drawCover(canvas, state);
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  drawCover(canvas, state);
});
zoomEl.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  panel.zoom = Number(zoomEl.value) / 100;
  zoomValEl.textContent = `${zoomEl.value}%`;
  drawCover(canvas, state);
});
document.getElementById('reset-panel').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.ox = 0;
  panel.oy = 0;
  panel.zoom = 1;
  zoomEl.value = '100';
  zoomValEl.textContent = '100%';
  drawCover(canvas, state);
});
document.getElementById('clear-panel').addEventListener('click', clearPanel);
document.getElementById('photo').addEventListener('change', (e) => addFiles(e.target.files));

const dropzone = document.getElementById('dropzone');
['dragover', 'dragenter'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('over'); }));
dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

document.getElementById('export').addEventListener('click', async () => {
  const name = await exportOne(state.size);
  statusEl.textContent = `Saved ${name}`;
});
document.getElementById('export-all').addEventListener('click', async () => {
  const names = [];
  for (const key of Object.keys(SIZES)) names.push(await exportOne(key));
  statusEl.textContent = `Saved ${names.join(', ')}`;
});

// --- Boot: samples in, display font loaded, then draw. ---
async function boot() {
  try {
    await document.fonts.load('100px Anton');
  } catch { /* system fallback fonts still draw */ }
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  state.library.push({ img: pier, name: 'Pier' }, { img: boulevard, name: 'Boulevard' });
  state.panels[0].img = pier;
  state.panels[1].img = boulevard;
  state.panels[2].img = boulevard;
  state.panels[3].img = pier;
  document.fonts.ready.then(() => drawCover(canvas, state)).catch(() => {});
  setSize(state.size);
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, async () => {
    try { await document.fonts.load('100px Anton'); } catch { /* fallback */ }
    redraw();
  });
} else {
  boot();
}
