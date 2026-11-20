// Neon Sunset Cover Studio — wires the page: layouts, grades, photos,
// caption, export, undo/redo. State lives in one object; every control
// mutates it (through pushHistory, so undo works) and calls repaint().
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, GRADES, CAPTION_PAIRS, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

// How many panels each layout shows (the cover engine's describe() agrees).
const PANEL_COUNT = { grid: 4, hero: 4, full: 1, nine: 9, tilt: 3, duo: 2 };

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const libraryEl = document.getElementById('library');
const panelRowEl = document.getElementById('panel-row');
const zoomEl = document.getElementById('zoom');
const zoomOutEl = document.getElementById('zoom-out');

const state = {
  layout: 'grid',
  grade: 'sunset',
  size: '1080x1080',
  title: 'Sunset Heist',
  subtitle: 'neon nights',
  selected: 0,
  grain: true,
  vignette: true,
  library: [], // { img, name }
  panels: Array.from({ length: 9 }, () => ({ photo: null, dx: 0, dy: 0, zoom: 1 })),
};

// --- history (undo / redo) -----------------------------------------------
let past = [];
let future = [];
function snapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    grain: state.grain,
    vignette: state.vignette,
    panels: state.panels.map((p) => ({
      lib: p.photo ? state.library.findIndex((l) => l.img === p.photo) : -1,
      dx: p.dx, dy: p.dy, zoom: p.zoom,
    })),
  });
}
function restore(json) {
  const s = JSON.parse(json);
  state.layout = s.layout;
  state.grade = s.grade;
  state.title = s.title;
  state.subtitle = s.subtitle;
  state.grain = s.grain;
  state.vignette = s.vignette;
  s.panels.forEach((p, i) => {
    state.panels[i].photo = p.lib >= 0 ? state.library[p.lib].img : null;
    state.panels[i].dx = p.dx;
    state.panels[i].dy = p.dy;
    state.panels[i].zoom = p.zoom;
  });
  syncControls();
}
function pushHistory() {
  past.push(snapshot());
  if (past.length > 60) past.shift();
  future = [];
  syncUndoButtons();
}
function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  syncUndoButtons();
  repaint();
  statusEl.textContent = 'Undid that change';
}
function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  syncUndoButtons();
  repaint();
  statusEl.textContent = 'Redid that change';
}
function syncUndoButtons() {
  document.getElementById('undo').disabled = !past.length;
  document.getElementById('redo').disabled = !future.length;
}

// --- images ----------------------------------------------------------------
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
  return PANEL_COUNT[state.layout] || 4;
}

function repaint() {
  drawCover(canvas, state);
  paintPanels();
  paintLibrary();
}

function photoName(img) {
  const found = state.library.find((l) => l.img === img);
  return found ? found.name : 'photo';
}

function paintPanels() {
  panelRowEl.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === state.selected ? ' active' : '');
    const p = state.panels[i];
    b.textContent = `Panel ${i + 1} · ${p.photo ? photoName(p.photo) : 'empty'}`;
    b.addEventListener('click', () => choosePanel(i));
    panelRowEl.appendChild(b);
  }
}

function paintLibrary() {
  libraryEl.innerHTML = '';
  state.library.forEach((lib, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `Place ${lib.name} in panel ${state.selected + 1}`;
    const t = document.createElement('img');
    t.src = lib.img.src;
    t.alt = lib.name;
    b.appendChild(t);
    const s = document.createElement('span');
    s.textContent = lib.name;
    b.appendChild(s);
    if (state.panels[state.selected] && state.panels[state.selected].photo === lib.img) {
      b.classList.add('active');
    }
    b.addEventListener('click', () => placePhoto(i));
    libraryEl.appendChild(b);
  });
}

// --- actions ---------------------------------------------------------------
function pickLayout(key) {
  if (!LAYOUTS[key] || key === state.layout) return;
  pushHistory();
  state.layout = key;
  state.selected = 0;
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === key));
  repaint();
}

function pickGrade(key) {
  if (!GRADES[key] || key === state.grade) return;
  pushHistory();
  state.grade = key;
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === key));
  repaint();
}

function pickSize(key) {
  const found = EXPORT_SIZES.find((s) => s.id === key);
  if (!found || key === state.size) return;
  state.size = key;
  canvas.width = found.w;
  canvas.height = found.h;
  canvas.style.aspectRatio = `${found.w} / ${found.h}`;
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === key));
  repaint();
}

function applyPair(i) {
  const pair = CAPTION_PAIRS[i];
  if (!pair) return;
  pushHistory();
  [state.title, state.subtitle] = pair;
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.querySelectorAll('[data-pair]').forEach((b) =>
    b.classList.toggle('active', Number(b.dataset.pair) === i));
  statusEl.textContent = `Caption: “${state.title}” — ${state.subtitle}`;
  repaint();
}

/** One click, one fresh cover: new layout + grade + caption + photo shuffle. */
function shuffleCover() {
  pushHistory();
  const layoutKeys = Object.keys(LAYOUTS);
  const gradeKeys = Object.keys(GRADES);
  state.layout = layoutKeys[Math.floor(Math.random() * layoutKeys.length)];
  state.grade = gradeKeys[Math.floor(Math.random() * gradeKeys.length)];
  const pair = CAPTION_PAIRS[Math.floor(Math.random() * CAPTION_PAIRS.length)];
  [state.title, state.subtitle] = pair;
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  if (state.library.length) {
    const shuffled = [...state.library].sort(() => Math.random() - 0.5);
    for (let i = 0; i < panelCount(); i++) {
      const p = state.panels[i];
      p.photo = shuffled[i % shuffled.length].img;
      p.dx = 0;
      p.dy = 0;
      p.zoom = 1;
    }
  }
  state.selected = 0;
  syncControls();
  zoomEl.value = '100';
  zoomOutEl.textContent = '100%';
  statusEl.textContent = `Shuffled: ${LAYOUTS[state.layout].name} · ${GRADES[state.grade].name} · “${state.title}”`;
  repaint();
}

function syncControls() {
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === state.size));
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  const grainBox = document.getElementById('grain');
  if (grainBox) grainBox.checked = state.grain !== false;
  const vigBox = document.getElementById('vignette');
  if (vigBox) vigBox.checked = state.vignette !== false;
}

function choosePanel(i) {
  state.selected = Math.min(i, panelCount() - 1);
  const p = state.panels[state.selected];
  zoomEl.value = String(Math.round((p.zoom || 1) * 100));
  zoomOutEl.textContent = `${Math.round((p.zoom || 1) * 100)}%`;
  repaint();
}

function placePhoto(libIndex) {
  const lib = state.library[libIndex];
  if (!lib) return;
  pushHistory();
  const p = state.panels[state.selected];
  p.photo = lib.img;
  p.dx = 0;
  p.dy = 0;
  p.zoom = 1;
  zoomEl.value = '100';
  zoomOutEl.textContent = '100%';
  statusEl.textContent = `Panel ${state.selected + 1} ← ${lib.name}`;
  repaint();
}

/** Empties the selected panel (its photo stays in the library). */
function emptyPanel() {
  pushHistory();
  const p = state.panels[state.selected];
  p.photo = null;
  p.dx = 0;
  p.dy = 0;
  p.zoom = 1;
  zoomEl.value = '100';
  zoomOutEl.textContent = '100%';
  statusEl.textContent = `Panel ${state.selected + 1} cleared`;
  repaint();
}

/** Fills every panel with the selected panel's photo (one photo, whole cover). */
function fillAllPanels() {
  const photo = state.panels[state.selected].photo;
  if (!photo) {
    statusEl.textContent = 'Pick a photo for a panel first, then fill all';
    return;
  }
  pushHistory();
  for (let i = 0; i < panelCount(); i++) {
    const p = state.panels[i];
    p.photo = photo;
    p.dx = 0;
    p.dy = 0;
    p.zoom = 1;
  }
  statusEl.textContent = `All ${panelCount()} panels ← ${photoName(photo)}`;
  repaint();
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
  pushHistory();
  let li = state.library.length - added;
  for (let i = 0; i < panelCount() && li < state.library.length; i++) {
    if (!state.panels[i].photo) {
      state.panels[i].photo = state.library[li].img;
      state.panels[i].dx = 0;
      state.panels[i].dy = 0;
      state.panels[i].zoom = 1;
      li++;
    }
  }
  statusEl.textContent = `Added ${added} photo${added > 1 ? 's' : ''}${skipped ? ` (${skipped} skipped)` : ''}`;
  repaint();
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

/** File-safe slug of the title, for export filenames. */
function slugify(text) {
  const slug = (text || 'cover').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'cover';
}

async function exportSize(sizeId) {
  const found = EXPORT_SIZES.find((s) => s.id === sizeId);
  if (!found) return null;
  const off = document.createElement('canvas');
  off.width = found.w;
  off.height = found.h;
  drawCover(off, state);
  const name = `${slugify(state.title)}-${state.grade}-${found.w}x${found.h}.png`;
  await downloadCanvas(off, name);
  return name;
}

// --- Canvas interaction: click picks a panel, drag pans its photo, wheel zooms.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

function panelAt(x, y) {
  const rects = LAYOUTS[state.layout].describe(canvas.width, canvas.height).panels;
  for (let i = rects.length - 1; i >= 0; i--) {
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
  choosePanel(i);
  const rect = LAYOUTS[state.layout].describe(canvas.width, canvas.height).panels[i];
  drag = { x: p.x, y: p.y, dx: state.panels[i].dx, dy: state.panels[i].dy, w: rect.w, h: rect.h };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selected];
  panel.dx = drag.dx + (p.x - drag.x) / drag.w;
  panel.dy = drag.dy + (p.y - drag.y) / drag.h;
  drawCover(canvas, state);
});
canvas.addEventListener('pointerup', () => {
  if (drag) pushHistory();
  drag = null;
});
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  choosePanel(i);
  const panel = state.panels[i];
  panel.zoom = Math.min(3, Math.max(1, (panel.zoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)));
  zoomEl.value = String(Math.round(panel.zoom * 100));
  zoomOutEl.textContent = `${Math.round(panel.zoom * 100)}%`;
  drawCover(canvas, state);
}, { passive: false });

// --- Controls ---
document.querySelectorAll('[data-layout]').forEach((b) =>
  b.addEventListener('click', () => pickLayout(b.dataset.layout)));
document.querySelectorAll('[data-grade]').forEach((b) =>
  b.addEventListener('click', () => pickGrade(b.dataset.grade)));
document.querySelectorAll('[data-pair]').forEach((b) =>
  b.addEventListener('click', () => applyPair(Number(b.dataset.pair))));
document.querySelectorAll('[data-size]').forEach((b) =>
  b.addEventListener('click', () => pickSize(b.dataset.size)));

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
  zoomOutEl.textContent = `${zoomEl.value}%`;
  drawCover(canvas, state);
});
zoomEl.addEventListener('change', () => pushHistory());
document.getElementById('reset-panel').addEventListener('click', () => {
  pushHistory();
  const panel = state.panels[state.selected];
  panel.dx = 0;
  panel.dy = 0;
  panel.zoom = 1;
  zoomEl.value = '100';
  zoomOutEl.textContent = '100%';
  drawCover(canvas, state);
});
document.getElementById('clear-panel').addEventListener('click', emptyPanel);
document.getElementById('fill-all').addEventListener('click', fillAllPanels);
document.getElementById('photo').addEventListener('change', (e) => addFiles(e.target.files));

const dropzone = document.getElementById('dropzone');
['dragover', 'dragenter'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('over'); }));
dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

document.getElementById('export').addEventListener('click', async () => {
  const name = await exportSize(state.size);
  if (name) statusEl.textContent = `Saved ${name}`;
});
document.getElementById('export-all').addEventListener('click', async () => {
  const names = [];
  for (const s of EXPORT_SIZES) names.push(await exportSize(s.id));
  statusEl.textContent = `Saved ${names.join(', ')}`;
});

document.getElementById('shuffle').addEventListener('click', shuffleCover);
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);
document.getElementById('grain').addEventListener('change', (e) => {
  pushHistory();
  state.grain = e.target.checked;
  statusEl.textContent = state.grain ? 'Film grain on' : 'Film grain off';
  drawCover(canvas, state);
});
document.getElementById('vignette').addEventListener('change', (e) => {
  pushHistory();
  state.vignette = e.target.checked;
  drawCover(canvas, state);
});

/** Keyboard shortcuts (ignored while typing in a text field): R shuffles,
 *  Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes. */
document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    undo();
    return;
  }
  if (((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
      ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y'))) {
    e.preventDefault();
    redo();
    return;
  }
  if (e.repeat) return;
  if (e.key === 'r' || e.key === 'R') shuffleCover();
});

// --- Boot: display fonts, then the sample photos, then draw. ---
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
  } catch { /* system fallback fonts still draw */ }
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  state.library.push({ img: pier, name: 'Pier' }, { img: boulevard, name: 'Boulevard' });
  state.panels[0].photo = pier;
  state.panels[1].photo = boulevard;
  state.panels[2].photo = boulevard;
  state.panels[3].photo = pier;
  pushHistory();
  pickSize(state.size);
  document.fonts.ready.then(() => drawCover(canvas, state)).catch(() => {});
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, async () => {
    try {
      await Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('40px Pacifico'),
      ]);
    } catch { /* fallback */ }
    repaint();
  });
} else {
  boot();
}
syncUndoButtons();
