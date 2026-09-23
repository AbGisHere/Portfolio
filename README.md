# Abhinav Gupta — Portfolio

A personal portfolio built as one continuous, scroll-driven experience: every scroll delta stages a reveal, rather than a page of static stacked sections. Built to double as a demonstration of frontend craft — not just describe the work, but perform it.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19, plain JS/JSX
- [GSAP](https://gsap.com) + ScrollTrigger for scroll choreography, [Lenis](https://lenis.darkroom.engineering) for smooth scroll
- [Three.js](https://threejs.org) for a real WebGL moment in the hero (a noise-distorted, pointer/scroll-reactive mesh); everything else is 2D canvas or DOM/CSS
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

## Project structure

See [`CLAUDE.md`](./CLAUDE.md) for the full structure, design tokens, and behavior notes. In short:

- `app/` — Next.js App Router entry (`layout.jsx`, `page.jsx`, `globals.css`)
- `components/` — scroll sections (`Hero`, `Work`, `Proof`, `Contact`) and the shared interaction primitives (`SmoothScroll`, `SplitText`, `Reveal`, `ParticleField`, `LiquidMesh`, `MagneticCard`)
- `PRODUCT.md` — product truth (audience, purpose, positioning, constraints)
- `.impeccable/surfaces/home.md` — the visual direction contract this build is held to

## Status

Structurally complete, content-incomplete: `Work`, `Proof`, and `Contact` currently ship placeholder copy on purpose (no invented project names, claims, or contact details). Real project write-ups, resume/dev-log content, and a real contact path are still needed — see the Open Tasks table in `CLAUDE.md`.

## History

This replaced an earlier "AbG OS" build — a portfolio styled as a fake desktop operating system (boot sequence, login, draggable windows, a terminal). That direction was retired in favor of the current scroll-narrative approach; see `PRODUCT.md` for the record of that decision.
