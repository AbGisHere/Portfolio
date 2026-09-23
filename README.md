# Abhinav Gupta — Portfolio

A personal portfolio built as one continuous, scroll-driven experience: every
scroll delta stages a reveal, rather than a page of static stacked sections.
Built to double as a demonstration of frontend craft — not just describe the
work, but perform it.

Currently being rebuilt from the ground up, one layer at a time. The `0.1.x`
line is the **background/atmosphere layer**; page content comes after it.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19, plain JS/JSX
- A generated gradient/shader engine rendering an animated mountain scene
- [GSAP](https://gsap.com) + [Lenis](https://lenis.darkroom.engineering) for
  scroll choreography (primitives are in place; not yet composed into a page)
- Plain CSS, no framework

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm run start    # serve the production build
npm run test     # Playwright e2e tests
```

## The atmosphere

The whole page is currently a single full-bleed scene: mountain ridges under a
drifting haze, with a sun in the sky. **Clicking the sun** transitions the
scene to night — the sun slides across and recolours into a moon, the ridges
change height and silhouette, the haze thins, and the sky crossfades. One
click, one continuous motion.

Nothing about the look lives in the engine. Each scene is a recipe file under
`components/gradient/recipes/`, holding every value the source gradient studio
exposes (ranges, horizon, peaks, sharpness, haze, sun position, drift, seed,
colour stops, soften, noise) plus a `transition` block that drives both the
engine's spring and the CSS crossfade so they stay in step.

See [`CLAUDE.md`](./CLAUDE.md) for the full structure and how to add a scene.

## History

This replaced an earlier "AbG OS" build — a portfolio styled as a fake desktop
operating system (boot sequence, login, draggable windows, a terminal). That
direction was retired in favour of the current approach; see `PRODUCT.md` for
the record of that decision.
