# Abhinav Gupta — Portfolio

A personal portfolio built as one continuous, scroll-driven experience: every
scroll delta stages a reveal, rather than a page of static stacked sections.
Built to double as a demonstration of frontend craft — not just describe the
work, but perform it.

Currently being rebuilt from the ground up, one layer at a time. The `0.1.x`
line is the **background/atmosphere layer**; page content comes after it.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19, plain JS/JSX
- A WebGL2 renderer drawing an animated mountain scene, with a layered DOM
  renderer (CSS layers plus computed ridge masks) as the fallback for
  browsers without WebGL
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
npm run parity   # compare the WebGL and layered renderers pixel by pixel
npm run perf     # frame timing during a day/night switch and at rest
```

See [`scripts/README.md`](./scripts/README.md) for the harness flags.

## The atmosphere

The whole page is currently a single full-bleed scene: mountain ridges under a
drifting haze, with a sun in the sky. **Clicking the sun** turns the sky.
Dusk → night (1.5s): the sun sets down-left behind the ridges as the moon rises
on the right, through a blue hour. Night → dusk (4s): the moon goes over and
fades with the morning while the sun comes up on the right and crosses the
whole sky, through dawn, day and late afternoon. The ridges reshape and are
relit from the passing sky all the way, always drifting the way the sky
turns. At rest they slowly breathe: their silhouette drifts a little and back
over about a minute. The moon has a face (seas, craters, Tycho's rays), and
the sun a warm edge and a soft two-layer glow; low in the sky it deepens
toward orange and flattens a little, rising or setting.

Without WebGL, a layered fallback draws the same scene from stacked CSS
layers, with each ridge's outline computed as a mask using the shader's own
maths. It keeps the ridges' shape through a switch (only their light
changes) and doesn't breathe, but otherwise matches the WebGL scene.

Nothing about the look lives in the renderer. Each scene is a recipe file under
`components/gradient/recipes/`, holding every value the source gradient studio
exposes (ranges, horizon, peaks, sharpness, haze, sun position, drift, seed,
colour stops, soften, noise). A few fields are ours, not the studio's: `body`
(sun or moon), `idle` (the rest-state drift) and `transition` (how long a
switch into the scene takes, the arc the sun and moon ride, and the skies
passed on the way). Both renderers read the same recipes and share the switch
maths (`components/gradient/orbit.js`), and one smooth ramp paints the sky.

See [`CLAUDE.md`](./CLAUDE.md) for the full structure and how to add a scene.
