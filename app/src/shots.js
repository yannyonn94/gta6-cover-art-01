// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the cover alone, full frame.
// Query params: layout (grid|hero|full|nine|tilt|duo), grade
// (sunset|neon|gold|noir|teal), size (1080x1080|1080x1350|1920x1080),
// photo (comma list of sample names, one per panel), caption (the title),
// subtitle, grain (1 for film grain on), vignette (0 to turn it off).
// window.__shotReady is set once the scene has painted.
import { CAPTION_PAIRS } from './cover.js';

const SHOT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const LAYOUT_KEYS = ['grid', 'hero', 'full', 'nine', 'tilt', 'duo'];
const GRADE_KEYS = ['sunset', 'neon', 'gold', 'noir', 'teal'];

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Sets up a shot scene on the shared state, then calls draw() (the caller's
 * font-aware redraw) and marks the scene ready for the screenshot.
 */
export async function runShot(shot, query, state, draw) {
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const layout = query.get('layout');
  if (LAYOUT_KEYS.includes(layout)) state.layout = layout;
  const grade = query.get('grade');
  if (GRADE_KEYS.includes(grade)) state.grade = grade;
  if (query.get('grain') === '1') state.grain = true;
  if (query.get('grain') === '0') state.grain = false;
  if (query.get('vignette') === '0') state.vignette = false;
  const size = query.get('size');
  if (SHOT_SIZES[size]) state.size = size;
  const title = query.get('caption');
  if (title !== null) state.title = title;
  const subtitle = query.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
  const pair = query.has('pair') ? Number(query.get('pair')) : NaN;
  if (Number.isInteger(pair) && CAPTION_PAIRS[pair]) {
    [state.title, state.subtitle] = CAPTION_PAIRS[pair];
  }

  // Photos: comma list of sample names, one per panel; repeats are fine.
  const names = (query.get('photo') || 'pier,boulevard').split(',');
  const loaded = [];
  for (const name of names) {
    try {
      loaded.push(await loadImage(`samples/${name.trim()}.jpg`));
    } catch { /* skip a missing sample */ }
  }
  state.library = loaded.map((img, i) => ({
    img,
    name: names[i] ? names[i].trim().replace(/^./, (c) => c.toUpperCase()) : 'Sample',
  }));
  const zoom = Math.min(3, Math.max(1, parseFloat(query.get('zoom') || '1') || 1));
  const count = state.panels.length;
  for (let i = 0; i < count; i++) {
    state.panels[i].photo = loaded[i % Math.max(1, loaded.length)] || null;
    state.panels[i].dx = 0;
    state.panels[i].dy = 0;
    state.panels[i].zoom = zoom;
  }

  // Canvas at the shot's export size, so the cover renders full-resolution.
  const [w, h] = SHOT_SIZES[state.size];
  const canvas = document.getElementById('cover');
  canvas.width = w;
  canvas.height = h;
  canvas.style.aspectRatio = `${w} / ${h}`;

  // Mirror the scene into the controls so the editor shot shows them too.
  const titleInput = document.getElementById('title');
  if (titleInput) titleInput.value = state.title;
  const subtitleInput = document.getElementById('subtitle');
  if (subtitleInput) subtitleInput.value = state.subtitle;
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === state.size));
  const grainBox = document.getElementById('grain');
  if (grainBox) grainBox.checked = state.grain !== false;

  await draw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
