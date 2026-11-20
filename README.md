[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/yannyonn94/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/yannyonn94/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Cover Studio

A free, offline web app that turns your photos into GTA 6-style cover art — the
multi-panel poster look with a neon-sunset grade. Built for the
[make.fun bounty gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **3 layouts** — Grid 2×2, Hero + 3, and Full bleed.
- **Any photos** — upload your own (or drop them in), pick a photo per panel,
  drag to reposition and scroll / slide to zoom each panel.
- **4 grades** — Sunset, Neon Vice, Noir, Palm, each with its own grade overlays
  and vignette.
- **Caption** — editable title and subtitle in heavy display lettering
  (Anton, vendored locally, OFL).
- **Export** — one-click PNG in 1080×1080, 1080×1350 and 1920×1080, drawn at
  full resolution on an offscreen canvas.

Everything runs in the browser from local files — no network requests, no
uploads, your photos never leave your machine. Two sample photos ship with the
app so it works immediately.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE). The Anton font is under the SIL Open Font License.
No Rockstar Games artwork, logos or fonts are used.
