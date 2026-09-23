# Abhinav Gupta — Portfolio

A personal portfolio built as one continuous, scroll-driven experience: every
scroll delta stages a reveal, rather than a page of static stacked sections.
Built to double as a demonstration of frontend craft — not just describe the
work, but perform it.

Currently being rebuilt from the ground up, one layer at a time. The `0.1.x`
line is the **background/atmosphere layer**; page content comes after it.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19, plain JS/JSX
- A WebGL2 renderer drawing an animated mountain scene, with the original
  generated SVG engine as a fallback for browsers without WebGL
- [GSAP](https://gsap.com) + [Lenis](https://lenis.darkroom.engineering) for
  scroll choreography (primitives are in place; not yet composed into a page)
- Plain CSS with per-component CSS Modules, no framework

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm run start    # serve the production build
npm run test     # Playwright e2e tests
npm run parity   # compare the WebGL and SVG renderers pixel by pixel
npm run perf     # frame timing during a day/night switch and at rest
```

See [`scripts/README.md`](./scripts/README.md) for the harness flags.

## The atmosphere

The whole page is currently a single full-bleed scene: mountain ridges under a
drifting haze, with a sun in the sky. **Clicking the sun** transitions the
scene to night — the sun slides across and recolours into a moon, the ridges
change height and silhouette, the haze thins, and the sky shifts to its night
colours. One click, one continuous motion, about 1.25s long.

Nothing about the look lives in the renderer. Each scene is a recipe file under
`components/gradient/recipes/`, holding every value the source gradient studio
exposes (ranges, horizon, peaks, sharpness, haze, sun position, drift, seed,
colour stops, soften, noise) plus a `transition` block that drives both the
renderer's spring and the sun's CSS hit target so they stay in step. Both
renderers read the same recipes, and one shared smooth ramp paints the sky.

See [`CLAUDE.md`](./CLAUDE.md) for the full structure and how to add a scene.
