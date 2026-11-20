// Neon Sunset Cover Studio: wires the editor to the painter in render.js.
// State lives in one object: the layout, the grade, one photo slot per panel
// (image + zoom + pan), the lettering and the export size. Every change
// repaints the stage canvas; export repaints the same state at full size.
import { LAYOUTS, panelCount, paintCover } from './render.js';
import { runShot } from './shots.js';

const stage = document.getElementById('stage');
const statusEl = document.getElementById('status');

const SAMPLES = [
  { url: 'samples/boulevard.jpg', name: 'boulevard' },
  { url: 'samples/pier.jpg', name: 'pier' },
];

const state = {
  layout: 'quad',
  grade: 'sunset',
  size: '1080x1080',
  headline: 'NEON SUNSET',
  subtitle: 'Vice City nights',
  titleScale: 1,
  slots: [], // { img, zoom, dx, dy } per panel, or null
  activePanel: 0,
  library: [], // { img, name } photos the person added
};

function freshSlots(n) {
  return Array.from({ length: n }, () => null);
}
state.slots = freshSlots(panelCount(state.layout));

/** Loads an image from a URL and resolves once it can be drawn. */
export function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('20px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fallback fonts still paint a cover; the grade carries the look.
  }
}

export function repaint() {
  paintCover(stage, state);
}

/** Keeps the slot list the length the current layout needs. */
function fitSlots() {
  const n = panelCount(state.layout);
  while (state.slots.length < n) state.slots.push(null);
  state.slots.length = n;
  if (state.activePanel >= n) state.activePanel = 0;
}

/** Resizes the stage canvas to the chosen export size, then repaints. */
function applySize() {
  const [w, h] = state.size.split('x').map(Number);
  stage.width = w;
  stage.height = h;
  stage.style.aspectRatio = `${w} / ${h}`;
  repaint();
}

/** Rebuilds the panel strip and the photo tray from state. */
function refreshChrome() {
  const strip = document.getElementById('panelStrip');
  strip.replaceChildren();
  state.slots.forEach((slot, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = slot && slot.img ? `Panel ${i + 1} · photo` : `Panel ${i + 1} · empty`;
    if (i === state.activePanel) btn.classList.add('is-on');
    btn.addEventListener('click', () => {
      state.activePanel = i;
      syncSliders();
      refreshChrome();
    });
    strip.appendChild(btn);
  });

  const tray = document.getElementById('photoTray');
  tray.replaceChildren();
  state.library.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (state.slots[state.activePanel]?.img === photo.img) thumb.classList.add('is-on');
    thumb.addEventListener('click', () => {
      placePhoto(photo.img);
    });
    tray.appendChild(thumb);
  });
}

/** Puts a photo into the active panel and repaints. */
function placePhoto(img) {
  state.slots[state.activePanel] = { img, zoom: 1, dx: 0, dy: 0 };
  syncSliders();
  refreshChrome();
  repaint();
}

/** Shows the active panel's zoom/pan in the sliders. */
function syncSliders() {
  const slot = state.slots[state.activePanel] ?? { zoom: 1, dx: 0, dy: 0 };
  const zoom = document.getElementById('zoomSlider');
  const panX = document.getElementById('panXSlider');
  const panY = document.getElementById('panYSlider');
  zoom.value = Math.round((slot.zoom ?? 1) * 100);
  panX.value = Math.round((slot.dx ?? 0) * 100);
  panY.value = Math.round((slot.dy ?? 0) * 100);
  document.getElementById('zoomVal').textContent = `${zoom.value}%`;
  document.getElementById('panXVal').textContent = panX.value;
  document.getElementById('panYVal').textContent = panY.value;
}

/** Reads a zoom/pan slider back into the active panel's slot. */
function bindCropSliders() {
  const apply = () => {
    const slot = state.slots[state.activePanel];
    if (!slot) return;
    slot.zoom = Number(document.getElementById('zoomSlider').value) / 100;
    slot.dx = Number(document.getElementById('panXSlider').value) / 100;
    slot.dy = Number(document.getElementById('panYSlider').value) / 100;
    document.getElementById('zoomVal').textContent = `${document.getElementById('zoomSlider').value}%`;
    document.getElementById('panXVal').textContent = document.getElementById('panXSlider').value;
    document.getElementById('panYVal').textContent = document.getElementById('panYSlider').value;
    repaint();
  };
  for (const id of ['zoomSlider', 'panXSlider', 'panYSlider']) {
    document.getElementById(id).addEventListener('input', apply);
  }
}

/** Marks one button on in a choice group and returns its value. */
function bindChoices(groupId, key, after) {
  const group = document.getElementById(groupId);
  group.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-layout], [data-grade], [data-size]');
    if (!btn) return;
    group.querySelectorAll('.choice').forEach((c) => c.classList.remove('is-on'));
    btn.classList.add('is-on');
    if (key === 'layout') state.layout = btn.dataset.layout;
    if (key === 'grade') state.grade = btn.dataset.grade;
    if (key === 'size') state.size = btn.dataset.size;
    if (key === 'layout') fitSlots();
    if (key === 'size') applySize();
    if (after) after();
    refreshChrome();
    repaint();
  });
}

/** Loads the two sample photos and spreads them over the panels. */
async function loadSamples() {
  const imgs = await Promise.all(SAMPLES.map((s) => fetchImage(s.url)));
  state.library = imgs.map((img, i) => ({ img, name: SAMPLES[i].name }));
  state.slots = state.slots.map((_, i) => ({ img: imgs[i % imgs.length], zoom: 1, dx: 0, dy: 0 }));
  syncSliders();
  refreshChrome();
  repaint();
}

function bindPhotos() {
  document.getElementById('photoFile').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      try {
        const img = await fetchImage(URL.createObjectURL(file));
        state.library.push({ img, name: file.name });
        placePhoto(img);
      } catch {
        statusEl.textContent = `Could not read ${file.name}.`;
      }
    }
    event.target.value = '';
  });

  document.getElementById('fillAllBtn').addEventListener('click', () => {
    const first = state.library[0];
    if (!first) {
      statusEl.textContent = 'Add a photo first, or use the samples.';
      return;
    }
    state.slots = state.slots.map(() => ({ img: first.img, zoom: 1, dx: 0, dy: 0 }));
    refreshChrome();
    repaint();
  });

  document.getElementById('sampleBtn').addEventListener('click', loadSamples);
}

/** Drag on the stage pans the active panel; the wheel zooms it. */
function bindStageGestures() {
  let dragging = null;
  stage.addEventListener('pointerdown', (event) => {
    const slot = state.slots[state.activePanel];
    if (!slot) return;
    dragging = { x: event.clientX, y: event.clientY, dx: slot.dx, dy: slot.dy };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const slot = state.slots[state.activePanel];
    const rect = stage.getBoundingClientRect();
    slot.dx = Math.max(-1, Math.min(1, dragging.dx + ((event.clientX - dragging.x) / rect.width) * 2));
    slot.dy = Math.max(-1, Math.min(1, dragging.dy + ((event.clientY - dragging.y) / rect.height) * 2));
    syncSliders();
    repaint();
  });
  stage.addEventListener('pointerup', () => { dragging = null; });
  stage.addEventListener('wheel', (event) => {
    const slot = state.slots[state.activePanel];
    if (!slot) return;
    event.preventDefault();
    slot.zoom = Math.max(1, Math.min(2.6, slot.zoom - Math.sign(event.deltaY) * 0.12));
    syncSliders();
    repaint();
  }, { passive: false });

  // Clicking a panel on the cover selects it.
  stage.addEventListener('click', (event) => {
    const rect = stage.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rects = LAYOUTS[state.layout];
    const hit = rects.findIndex(([x, y, w, h]) => px >= x && px < x + w && py >= y && py < y + h);
    if (hit >= 0 && hit !== state.activePanel) {
      state.activePanel = hit;
      syncSliders();
      refreshChrome();
    }
  });
}

/** One tap: a new random layout, grade and photo spread. */
function shuffleLook() {
  const layouts = Object.keys(LAYOUTS);
  const grades = ['sunset', 'neon', 'vice', 'mono'];
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  fitSlots();
  const pool = state.library.map((p) => p.img);
  if (pool.length) {
    state.slots = state.slots.map(() => ({
      img: pool[Math.floor(Math.random() * pool.length)],
      zoom: 1 + Math.random() * 0.4,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
    }));
  }
  document.querySelectorAll('#layoutChoices .choice').forEach((c) => {
    c.classList.toggle('is-on', c.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeChoices .choice').forEach((c) => {
    c.classList.toggle('is-on', c.dataset.grade === state.grade);
  });
  syncSliders();
  refreshChrome();
  repaint();
}

/** Downloads the current cover as a PNG at the chosen size. */
function exportCover() {
  const off = document.createElement('canvas');
  const [w, h] = state.size.split('x').map(Number);
  off.width = w;
  off.height = h;
  paintCover(off, state);
  off.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-sunset-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved neon-sunset-cover-${state.size}.png`;
  }, 'image/png');
}

function bindLettering() {
  document.getElementById('headline').addEventListener('input', (event) => {
    state.headline = event.target.value;
    repaint();
  });
  document.getElementById('subtitle').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    repaint();
  });
  document.getElementById('titleSlider').addEventListener('input', (event) => {
    state.titleScale = Number(event.target.value) / 100;
    document.getElementById('titleVal').textContent = `${event.target.value}%`;
    repaint();
  });
}

function bindTopActions() {
  document.getElementById('shuffleBtn').addEventListener('click', shuffleLook);
  document.getElementById('resetBtn').addEventListener('click', async () => {
    state.layout = 'quad';
    state.grade = 'sunset';
    state.headline = 'NEON SUNSET';
    state.subtitle = 'Vice City nights';
    state.titleScale = 1;
    document.getElementById('headline').value = state.headline;
    document.getElementById('subtitle').value = state.subtitle;
    document.querySelectorAll('#layoutChoices .choice').forEach((c) => {
      c.classList.toggle('is-on', c.dataset.layout === 'quad');
    });
    document.querySelectorAll('#gradeChoices .choice').forEach((c) => {
      c.classList.toggle('is-on', c.dataset.grade === 'sunset');
    });
    await loadSamples();
  });
  document.getElementById('exportBtn').addEventListener('click', exportCover);
  document.addEventListener('keydown', (event) => {
    if (event.key === 's' && !event.target.matches('input')) shuffleLook();
  });
}

bindChoices('layoutChoices', 'layout');
bindChoices('gradeChoices', 'grade');
bindChoices('sizeChoices', 'size');
bindCropSliders();
bindPhotos();
bindStageGestures();
bindLettering();
bindTopActions();

const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  await fontsReady();
  await runShot(params.get('shot'), params, state, { loadSamples, placePhoto, repaint, applySize });
} else {
  await fontsReady();
  await loadSamples();
}
refreshChrome();
repaint();
