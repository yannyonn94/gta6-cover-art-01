[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/yannyonn94/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/yannyonn94/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Sunset Cover Studio

A free, offline web app that turns your photos into GTA 6-style cover art —
the multi-panel poster look with a neon-sunset grade, bold Anton title
lettering and a neon Pacifico subtitle. Built for the
[make.fun bounty gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **6 layouts** — Four Panel, Hero + 3, Full Bleed, Nine Panel, Tilted
  Snapshots and Split Duo.
- **Any photos** — upload your own (or drop them in), pick a photo per panel,
  drag to reposition and scroll / slide to zoom each panel.
- **5 grades** — Sunset, Neon Night, Vice Gold, Mono Noir and Palm Teal, each
  with its own gradient wash, photo filter and accent colour.
- **Caption** — editable title (Anton) and subtitle (Pacifico script), or one
  of 6 ready-made caption pairs in one tap.
- **Shuffle** — one click (or the `R` key) shuffles layout, grade, caption
  and photo assignment for a fresh cover.
- **Undo / redo** — every change is on a history stack (`Ctrl+Z` /
  `Ctrl+Shift+Z`).
- **Film grain & vignette** — a subtle grain overlay and darkened edges,
  both toggleable.
- **Export** — one-click PNG in 1080×1080, 1080×1350 and 1920×1080, drawn at
  full resolution on an offscreen canvas. Files are named after your title,
  grade and size, e.g. `sunset-heist-neon-1080x1080.png`.

Everything runs in the browser from local files — no network requests, no
uploads, your photos never leave your machine. Two sample photos ship with the
app so it works immediately.

## Caption pairs

One tap fills title + subtitle with a ready-made pair:

| Pair | Title | Subtitle |
| --- | --- | --- |
| Sunset Heist | Sunset Heist | neon nights |
| Boulevard Queen | Boulevard Queen | vice city |
| Pier Pressure | Pier Pressure | golden hour |
| Neon Getaway | Neon Getaway | leonida |
| Palm Paradise | Palm Paradise | vice city |
| Vice City Nights | Vice City Nights | grand theft auto vi |

## Shortcuts

| Key | Action |
| --- | --- |
| `R` | Shuffle layout, grade, caption and photos |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |

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

MIT — see [LICENSE](LICENSE). The Anton and Pacifico fonts are under the SIL
Open Font License. No Rockstar Games artwork, logos or fonts are used.
