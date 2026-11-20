// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos;
// ?shot=cover shows the cover alone.
// Query params: layout (grid|hero|full), grade (sunset|neon|noir|palm|vice|golden),
// size (1080x1080|1080x1350|1920x1080), photo (comma list of sample names),
// caption (the title), subtitle, preset (index into the CAPTIONS list),
// shuffle (1 = deal a seeded random layout/grade/caption/photo order),
// seed (integer seed for shuffle).
// window.__shotReady is set once painted.
import { CAPTIONS } from './cover.js';
const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

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
  if (layout === 'grid' || layout === 'hero' || layout === 'full') state.layout = layout;
  const grade = query.get('grade');
  if (grade === 'sunset' || grade === 'neon' || grade === 'noir' || grade === 'palm' || grade === 'vice' || grade === 'golden') {
    state.grade = grade;
  }
  const preset = Number(query.get('preset'));
  if (Number.isInteger(preset) && CAPTIONS[preset]) {
    [state.title, state.subtitle] = CAPTIONS[preset];
  }
  const size = query.get('size');
  if (SIZES[size]) state.size = size;
  const title = query.get('caption');
  if (title !== null) state.title = title;
  const subtitle = query.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;

  // Seeded shuffle (?shuffle=1&seed=7): the same deterministic "Randomize"
  // a user gets from the button, so a screenshot can show a reshuffled cover
  // and still be reproducible. Overrides layout, grade and caption above.
  if (query.get('shuffle') === '1') {
    let s = Number(query.get('seed') || '1') >>> 0;
    const rnd = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const layouts = ['grid', 'hero', 'full'];
    const grades = ['sunset', 'neon', 'noir', 'palm', 'vice', 'golden'];
    state.layout = layouts[Math.floor(rnd() * layouts.length)];
    state.grade = grades[Math.floor(rnd() * grades.length)];
    if (rnd() < 0.5) {
      [state.title, state.subtitle] = CAPTIONS[Math.floor(rnd() * CAPTIONS.length)];
    } else {
      state.title = CAPTIONS[Math.floor(rnd() * CAPTIONS.length)][0];
      state.subtitle = CAPTIONS[Math.floor(rnd() * CAPTIONS.length)][1];
    }
  }

  // Photos: comma list of sample names, one per panel; repeats are fine.
  const names = (query.get('photo') || 'pier,boulevard,boulevard,pier').split(',');
  const loaded = [];
  for (const name of names) {
    try {
      loaded.push(await loadImage(`samples/${name.trim()}.jpg`));
    } catch { /* skip a missing sample */ }
  }
  state.library = loaded.map((img, i) => ({
    img,
    // Name each entry after its sample file.
    name: names[i] ? names[i].trim().replace(/^./, (c) => c.toUpperCase()) : 'Sample',
  }));
  const zoom = Math.min(3, Math.max(1, parseFloat(query.get('zoom') || '1') || 1));
  for (let i = 0; i < 4; i++) {
    state.panels[i].img = loaded[i % Math.max(1, loaded.length)] || null;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
    state.panels[i].zoom = zoom;
  }

  // Canvas at the shot's export size, so the cover renders full-resolution.
  const [w, h] = SIZES[state.size];
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
  document.querySelectorAll('[data-preset]').forEach((b) =>
    b.classList.toggle('active', CAPTIONS[Number(b.dataset.preset)] &&
      CAPTIONS[Number(b.dataset.preset)][0] === state.title &&
      CAPTIONS[Number(b.dataset.preset)][1] === state.subtitle));

  await draw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
