# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Abhinav Gupta's ("AbG") personal portfolio — a single continuous scroll-driven experience where every scroll delta stages a reveal, rather than a static page of stacked sections. Next.js (App Router) app. Two goals, held equally: get the visitor to view real work (projects, resume, dev log) and take a next step, and be memorable/impressive as an experience in itself.

This replaced an earlier "AbG OS" build (a fake desktop-OS metaphor: boot → login → windows/dock/terminal). That direction was explicitly retired in favor of this one — see `PRODUCT.md` for the full product record and `.impeccable/surfaces/home.md` for the visual direction contract. Do not resurrect the OS metaphor without the user asking for it back.

## Commands

```bash
npm run dev       # next dev
npm run build     # next build
npm run start     # next start
npm run test      # Playwright e2e tests
```

## Tech Stack

- **Next.js 16** (App Router), React 19, plain JS/JSX (no TypeScript).
- **GSAP + ScrollTrigger** for scroll-driven reveal choreography; **Lenis** for smooth scroll (wired together in `SmoothScroll.jsx`, which drives the GSAP ticker off Lenis's frame).
- **Three.js** for one real WebGL moment (the hero's `LiquidMesh`); everything else is 2D canvas or DOM/CSS — deliberately not committing the whole page to WebGL.
- Plain CSS in `app/globals.css` (no Tailwind, no CSS modules) — same convention as the prior build.
- Fonts via `next/font/google`: **Unbounded** (kinetic display headlines) + **JetBrains Mono** (labels/data), set as CSS variables `--font-display` / `--font-mono` in `layout.jsx`.
- Admin password (`VITE_ADMIN_PASSWORD` in `.env`) is a leftover from the old build — not yet wired into the Next.js app; revisit if an admin surface is still wanted.

## Project Structure

```
app/
  layout.jsx    — fonts, metadata, html/body shell
  page.jsx      — composes SmoothScroll > Hero, Work, Proof, Contact
  globals.css   — design tokens + all section styles
components/
  SmoothScroll.jsx   — Lenis instance, drives GSAP's ticker/ScrollTrigger off it
  SplitText.jsx      — per-word kinetic text reveal (trigger="load" | "scroll")
  Reveal.jsx         — generic fade/stagger reveal for non-text groups
  ParticleField.jsx  — 2D canvas particle layer, cursor-attraction + scroll-velocity drift
  LiquidMesh.jsx      — real WebGL/Three.js: noise-distorted icosahedron reacting to pointer + scroll velocity, teal→orange gradient
  MagneticCard.jsx   — GSAP magnetic tilt + cursor-follow glow wrapper for cards
  Hero.jsx / Work.jsx / Proof.jsx / Contact.jsx — the four scroll sections
.impeccable/
  surfaces/home.md  — the direction contract (thesis, palette, story, first viewport, form) this build is held to
```

## Design Tokens

Palette (Committed color strategy — orange carries 30–60% of interactive/headline surface, not scattered as accents):

| Token | Value | Use |
|---|---|---|
| Ground | `#0c0c0d` | page background, near-charcoal not pure black |
| Accent | `#ff5a1f` | headline strokes, cursor-reactive glow, interactive states |
| Depth | `#1f3a3a` | desaturated teal, background/depth variation, liquid mesh far end |

Type: `--font-display` (Unbounded, weights 400/600/800/900) for headlines; `--font-mono` (JetBrains Mono, 400/500/600) for labels/data/annotations.

## Section Content Status

All four sections currently ship **placeholder content**, deliberately not fabricated as real:

- `Work.jsx` — three generic "Project One/Two/Three" cards. Needs real project titles, descriptions, links, and (ideally) real screenshots/media.
- `Proof.jsx` — teases Resume/DevLog; both are marked "not yet linked" since no real resume or dev-log content exists in the repo yet.
- `Contact.jsx` — placeholder email (`placeholder@example.com`). Needs a real contact path.

Per `PRODUCT.md`, resume/DevLog content is treated as real and finalized once supplied — do not invent or embellish claims in these sections; ask the user for the real content rather than guessing.

## Key Behaviours

- **Scroll choreography**: each section's content (split-text headlines, card groups) reveals via GSAP `ScrollTrigger` as it enters the viewport (`start: 'top 85%'`), staggered, never a blanket fade — see `SplitText.jsx` / `Reveal.jsx`.
- **Hero**: fires its split-text reveal on load (not scroll-triggered), backed by `ParticleField` (ambient, full-bleed) and `LiquidMesh` (the one WebGL moment, reactive to pointer position and scroll velocity).
- **Magnetic cards**: `Work.jsx` project cards use `MagneticCard` — cursor-follow tilt/glow, spring back to rest with `elastic.out` easing on mouse-leave.
- **Old OS-era assets removed**: the prior `src/` tree (Boot/Login/Desktop screens, Terminal app, OS icon SVGs, Porter Sans Block font) was deleted when this direction replaced the OS metaphor. If any of it is wanted back (e.g. the Terminal as an easter egg), it needs to be rebuilt for this stack, not restored from history.

## Open Tasks

| Task |
|---|
| Real project content for `Work.jsx` (titles, descriptions, links, media) |
| Real Resume + DevLog pages/content, then wire `Proof.jsx` to them |
| Real contact method for `Contact.jsx` |
| Decide whether an admin surface (from the old build) is still wanted, and if so redesign it for this direction |
| Tune particle count / magnetic-card strength / liquid-mesh distortion — current values are first-pass defaults, not measured against an approved comp |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
