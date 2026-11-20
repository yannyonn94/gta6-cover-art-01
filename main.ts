// Neon Sunset Cover Studio — the hand-in program for gta6-cover-art-01.
// Node 22, standard library only. It copies this repo's app/ and screenshots/
// beside it into the output directory and writes /output/dossier.json with the
// vendored make.fun library, so the judge reads the app and its screenshots.
//
// The app is a multi-panel GTA-style cover maker: six layouts (Four Panel,
// Hero + Three, Full Bleed, Nine Panel, Tilted Snapshots, Split Duo), five
// colour grades, per-panel photo crop and position, Anton title lettering with
// a neon Pacifico subtitle, film grain, vignette, undo/redo, and one-click PNG
// export in 1080x1080, 1080x1350 and 1920x1080. Its two sample photos
// (app/samples/) were made for make.fun with an image model and are free to use.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SHOTS = 4;
const MAX_SHOT_BYTES = 262144;

// Refuse to hand in an entry the gate would refuse: no page, no screenshots,
// too many screenshots, or one over the size cap. Also checks the two files
// the rules require: the vendored make.fun library, and a page under 1 MiB.
function checkShots() {
  if (!existsSync(join(here, 'app', 'index.html'))) {
    throw new Error('app/index.html is missing — there is no page to hand in');
  }
  if (statSync(join(here, 'app', 'index.html')).size > 1048576) {
    throw new Error('app/index.html is over 1 MiB — the gate allows at most 1 MiB');
  }
  if (!existsSync(join(here, 'vendor', 'makefun-app.ts'))) {
    throw new Error('vendor/makefun-app.ts is missing — copy it from the kit unchanged');
  }
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) {
    throw new Error('screenshots/ is missing — capture 3 or 4 screenshots first');
  }
  const shots = readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  if (shots.length < 3) {
    throw new Error(`screenshots/ holds ${shots.length} image(s) — the gate needs 3 or 4`);
  }
  if (shots.length > MAX_SHOTS) {
    throw new Error(`screenshots/ holds ${shots.length} images — the gate allows at most ${MAX_SHOTS}`);
  }
  for (const name of shots) {
    const bytes = statSync(join(dir, name)).size;
    if (bytes > MAX_SHOT_BYTES) {
      throw new Error(`${name} is ${bytes} bytes — the gate allows at most ${MAX_SHOT_BYTES} per screenshot`);
    }
  }
  return shots;
}

const shots = checkShots();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps (reference/gate.json): only text_max_bytes shapes the
// dossier's bytes; the rest refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: MAX_SHOTS, max_bytes: MAX_SHOT_BYTES },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Neon Sunset Cover Studio → ${out}/dossier.json (${shots.length} screenshots: ${shots.join(', ')})`);
