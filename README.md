# Tiger Trafficking

Editorial scrollytelling piece. This first prototype covers the **closing sequence**
(storyboard frames 92–104): explorable map → frontal tiger → profile tiger → final sentence.

> ⚠️ Figures are pending verification against the original sources. Do not publish.

Design decisions and test criteria: [`docs/brief-cierre.md`](docs/brief-cierre.md) (Spanish).

## Run

```bash
npm install
npm run dev
```

## Stack

- Vite + TypeScript, no framework
- GSAP for the timeline and the articulated tigers
- d3-geo + Natural Earth (world-atlas, public domain) for the map
- Fonts (all open licence, self-hosted via Fontsource): Archivo, Roboto, Roboto Slab, Anton

## Structure

| Path | What |
|---|---|
| `src/content/chapters.ts` | Story order: chapter openers (copy, entrances/exits) and chart placeholders |
| `src/story.ts` | Builds intro, openers and placeholders; stepped-scene engine (sticky stage, scroll thresholds → timeline labels) |
| `src/closing.ts` | Trigger, timeline, rewind, hysteresis, reduced motion |
| `src/tigers.ts` | Articulated tiger rigs and run cycles |
| `src/map.ts` | Explorable map, country card, legend |
| `src/data/countries.ts` | Country figures (**unverified**) and marker positions |
| `assets-src/tigers/` | Layered tiger SVGs as delivered (with pivots) |
| `scripts/prepare-tigers.mjs` | Makes the tiger SVGs safe to inline → `src/assets/tigers/` |
| `scripts/build-map-data.mjs` | Clips and simplifies Natural Earth → `src/data/map-countries.json` |

## Deploy

Pushing to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`).
In the repository settings, set **Pages → Source** to **GitHub Actions** once.
