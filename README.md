[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/yannyonn94/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/yannyonn94/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Cover Studio

A free, offline web app that turns your photos into GTA 6-style cover art — the
multi-panel poster look with a neon-sunset grade, now with a sixth grade
(Golden Hour, amber/teal duotone) and a one-tap Randomize button that reshuffles
layout, grade, caption and photo placement. Built for the
[make.fun bounty gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **3 layouts** — Grid 2×2, Hero + 3, and Full bleed.
- **Any photos** — upload your own (or drop them in), pick a photo per panel,
  drag to reposition and scroll / slide to zoom each panel.
- **6 grades** — Sunset, Neon Vice, Noir, Palm, Vice Purple and the new Golden
  Hour (warm amber highlights over cool teal shadows, with its own amber glow
  and warm vignette), each with its own grade overlays and vignette.
- **Randomize** — one tap (or the R key) shuffles the layout, grade, caption
  and which photo sits in each panel, so every tap is a new cover.
- **Caption** — editable title and subtitle in heavy display lettering
  (Anton, vendored locally, OFL), or pick one of 6 ready-made GTA-style
  caption presets in one tap.
- **Export** — one-click PNG in 1080×1080, 1080×1350 and 1920×1080, drawn at
  full resolution on an offscreen canvas.

Everything runs in the browser from local files — no network requests, no
uploads, your photos never leave your machine. Two sample photos ship with the
app so it works immediately.

## Caption presets

One tap fills title + subtitle with a ready-made GTA-style pair:

| Preset | Title | Subtitle |
| --- | --- | --- |
| Vice City Nights | Vice City Nights | Grand Theft Auto VI |
| Sunset Heist | Sunset Heist | Vice City |
| Boulevard Queen | Boulevard Queen | Vice City |
| Palm Paradise | Palm Paradise | Grand Theft Auto VI |
| Neon Getaway | Neon Getaway | Leonida |
| Golden Hour | Golden Hour | Vice City |

Randomize picks either a whole preset from this table or a mixed title +
subtitle pair, so a reshuffled cover can also land on a caption no preset
lists.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

`screenshots/` holds four shots of the app, driven by `shots.json`
(`?shot=cover` for the cover alone, `?shot=editor` for the full editor):

1. **1-cover.jpg** — the Golden Hour grade on the Grid 2×2 layout.
2. **2-editor.jpg** — the editor with the new Randomize button and the
   Golden Hour chip visible in the controls.
3. **3-cover.jpg** — a seeded Randomize result (Hero + 3, Golden Hour, mixed
   caption) at the tall 1080×1350 export size.
4. **4-cover.jpg** — the Golden Hour grade on the wide 1920×1080 export.

Each is a JPEG under 256 KiB, long side at most 1280 px.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE). The Anton font is under the SIL Open Font License.
No Rockstar Games artwork, logos or fonts are used.
