// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos;
// ?shot=cover shows the cover alone.
// Query params: layout (grid|hero|full), grade (sunset|neon|noir|palm),
// size (1080x1080|1080x1350|1920x1080), photo (comma list of sample names),
// caption (the title), subtitle. window.__shotReady is set once painted.
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
  if (grade === 'sunset' || grade === 'neon' || grade === 'noir' || grade === 'palm') {
    state.grade = grade;
  }
  const size = query.get('size');
  if (SIZES[size]) state.size = size;
  const title = query.get('caption');
  if (title !== null) state.title = title;
  const subtitle = query.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;

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

  await draw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
