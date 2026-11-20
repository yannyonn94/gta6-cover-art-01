// Fixed scenes for screenshots, driven by the page query string.
//   ?shot=editor  — the full editor with sample photos loaded.
//   ?shot=cover   — the cover alone, filling the frame.
// Extra knobs: layout, grade, size, photo (comma list of sample names),
// headline, subtitle and seed (a seeded shuffle of the panel photos).
// window.__shotReady is set once the scene has painted, so a screenshot
// runner can wait for it instead of guessing a delay.
import { seededRandom } from './render.js';

const HEADLINES = ['NEON SUNSET', 'GOLDEN HOUR', 'VICE CITY NIGHTS', 'PALM PARADISE'];
const SUBTITLES = ['Vice City nights', 'Leonida, after dark', 'Boulevard dreams', 'Sunset over the bay'];

function pickSeeded(list, rnd) {
  return list[Math.floor(rnd() * list.length)];
}

export async function runShot(shot, query, state, helpers) {
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const seed = Number(query.get('seed') ?? 7);
  const rnd = seededRandom(seed);

  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) {
    state.size = query.get('size');
    helpers.applySize();
    document.querySelectorAll('#sizeChoices .choice').forEach((c) => {
      c.classList.toggle('is-on', c.dataset.size === state.size);
    });
  }
  if (query.get('headline')) {
    state.headline = query.get('headline');
    document.getElementById('headline').value = state.headline;
  }
  if (query.get('subtitle')) {
    state.subtitle = query.get('subtitle');
    document.getElementById('subtitle').value = state.subtitle;
  }

  // Load the samples first, then arrange them per the query.
  await helpers.loadSamples();

  const names = (query.get('photo') ?? 'boulevard,pier,boulevard,pier').split(',');
  const pool = state.library;
  const byName = (name) => pool.find((p) => p.name.includes(name)) ?? pool[0];
  const chosen = names.map((n) => byName(n.trim()));

  if (query.get('shuffle') === '1') {
    state.slots = state.slots.map(() => ({
      img: pickSeeded(pool, rnd).img,
      zoom: 1 + rnd() * 0.5,
      dx: (rnd() - 0.5) * 0.5,
      dy: (rnd() - 0.5) * 0.5,
    }));
    state.headline = pickSeeded(HEADLINES, rnd);
    state.subtitle = pickSeeded(SUBTITLES, rnd);
    document.getElementById('headline').value = state.headline;
    document.getElementById('subtitle').value = state.subtitle;
  } else {
    state.slots = state.slots.map((_, i) => ({
      img: (chosen[i % chosen.length] ?? pool[0]).img,
      zoom: 1,
      dx: 0,
      dy: 0,
    }));
  }

  document.querySelectorAll('#layoutChoices .choice').forEach((c) => {
    c.classList.toggle('is-on', c.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeChoices .choice').forEach((c) => {
    c.classList.toggle('is-on', c.dataset.grade === state.grade);
  });

  helpers.repaint();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
