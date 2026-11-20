// Neon Sunset Cover Studio — the entry program (Node 22, standard library only).
// It hands the app in: copies this directory's app/ and screenshots/ to the
// output directory and writes /output/dossier.json with the vendored make.fun
// library, so the gate and the judge read exactly what the repo holds.
// The app itself is a plain offline web app: app/index.html plus its ES
// modules, two OFL fonts and two sample photos, no build step and no network
// request at runtime. Its two sample photos (app/samples/) were made for
// make.fun with an image model and are free to use.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

// The app must work with no network at runtime: refuse a hand-in whose
// page reaches for the network, and refuse one whose display fonts are
// missing (a cover without its lettering is not the entry).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error(`neon-sunset main.ts: ${message}`);
}

function imageFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => {
    if (!/\.(png|jpe?g)$/i.test(name)) return false;
    return statSync(join(dir, name)).isFile();
  });
}

// Refuse an empty or over-full hand-in here, with a readable message,
// instead of letting the sealed gate be the first thing to notice.
if (!existsSync(join(here, 'app', 'index.html'))) {
  fail('app/index.html is missing — the app is not built yet');
}
for (const font of ['anton.woff2', 'pacifico.woff2']) {
  if (!existsSync(join(here, 'app', 'fonts', font))) {
    fail(`app/fonts/${font} is missing — re-download the OFL fonts before handing in`);
  }
}
const page = readFileSync(join(here, 'app', 'index.html'), 'utf8');
if (/https?:\/\//.test(page.replace(/https?:\/\/localhost/g, ''))) {
  fail('app/index.html references an http(s) URL — the app must be offline');
}
const shots = imageFiles(join(here, 'screenshots'));
if (shots.length < 3 || shots.length > 4) {
  fail(`screenshots/ holds ${shots.length} images — the entry needs 3 or 4`);
}
const tooBig = shots.find((name) => statSync(join(here, 'screenshots', name)).size > 262144);
if (tooBig) fail(`screenshots/${tooBig} is over 256 KiB — shrink it before handing in`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB, more than 993 files in app/ or 48 MiB of
// app files in all, or a path under app/ over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Neon Sunset Cover Studio → ${out}/dossier.json (${shots.length} screenshots, app copied)`);
