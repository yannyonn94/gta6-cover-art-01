[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Sunset Cover Studio

A free, offline web app that turns any photo into GTA 6-style cover art — the
multi-panel poster look with a sunset or neon grade and big display
lettering. Built fresh for the
[make.fun bounty gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **4 layouts** — Four squares, Hero + three, Tall stack, and Full bleed.
- **Any photos** — add your own photos, place one per panel, drag a panel's
  photo to move it and scroll over it (or use the sliders) to zoom and pan.
  “Fill all panels” puts one photo across the whole cover.
- **4 grades** — Golden Hour, Neon Night, Vice Violet and Mono Dusk. Each
  washes its own sky and foot tints over the panels, plus grain and a
  vignette, so the same photos read as a different poster per grade.
- **Lettering** — an editable Anton headline with a neon outline and glow,
  a Pacifico script subtitle, and a title-size slider.
- **Shuffle look** — one tap (or the S key) deals a new random layout, grade
  and photo spread.
- **Export** — one-click PNG in 1080×1080, 1080×1350 and 1920×1080, drawn at
  full resolution from the same code as the preview.

Everything runs in the browser from local files — no network requests, no
uploads, your photos never leave your machine. Two sample photos ship with
the app so it works immediately.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

`screenshots/` holds four shots of the app, driven by `shots.json`
(`?shot=cover` for the cover alone, `?shot=editor` for the full editor):

1. **1-cover.jpg** — the wide 1920×1080 cover, Golden Hour grade, Four squares.
2. **2-editor.jpg** — the editor with sample photos loaded, Hero + three layout.
3. **3-cover.jpg** — the tall 1080×1350 cover, Neon Night grade, Tall stack layout.
4. **4-cover.jpg** — the square 1080×1080 cover, Neon Night grade, Tall stack.

Each is a JPEG under 256 KiB, long side at most 1280 px.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE). Anton and Pacifico are under the SIL Open Font
License (see `app/fonts/OFL.txt`). No Rockstar Games artwork, logos or fonts
are used.
