# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

[2026-09-23: the Vite/React SPA has been replaced — this is now the shipped stack, not a plan.] Next.js 16 (App Router) + React 19, plain JS/JSX (no TypeScript), plain CSS, split into per-component CSS Modules (`app/globals.css` holds tokens, reset and base type only). Fonts via `next/font/google`: Unbounded (display) + JetBrains Mono (body/labels). Animation/scroll: GSAP + ScrollTrigger and Lenis are installed as primitives for later scroll choreography, but nothing composes them yet. The background is a WebGL2 renderer of the studio's MIST scene (`components/gradient/gl/`), driven by per-theme recipe files under `components/gradient/recipes/`. The generated SVG engine it was ported from (`components/gradient/engine.js`) was the fallback for browsers without WebGL until 0.1.8, when a layered DOM renderer (`components/gradient/layers/`) replaced it and the engine was deleted. [2026-09-24: WebGL became the default in 0.1.4.] The earlier ambient experiments (a Three.js "LiquidMesh" and a 2D particle field) were deleted, and `three` has been removed. Deployed on Vercel at abgishere.vercel.app.

## Users

Mixed general audience — no single dominant persona. Recruiters/hiring managers, fellow developers, collaborators, and casual visitors (friends, social shares) all land on the same link and self-select what they explore (resume, dev log, projects, contact).

## Product Purpose

The portfolio's job is (1) get the visitor to view real work (resume, projects, dev log) and take a next step, and (2) be memorable/impressive as an experience in itself — through a continuous, scroll-driven cinematic narrative in the spirit of `why.zero.university`: each scroll increment reveals/unwraps the next beat rather than the visitor paging through static sections.

## Positioning

The differentiator: a single continuous scroll experience where every scroll delta is staged as a reveal — content, motion, and transitions choreographed as one narrative arc, not sections stacked on a page. The rebuild is underway: the atmosphere/background layer ships first (`0.1.x`) and sets the mood the later content beats are staged against.

## Operating Context

Visitor arrives via a shared link with no prior context and the entire experience unfolds through scrolling. Today the visitor lands on the atmosphere layer alone: a single full-bleed animated scene with one interaction (click the sun to move day → night). Whether an admin surface is wanted at all is undecided.

## Capabilities and Constraints

- Next.js 16 App Router + React 19, no backend. Whether a multi-route structure fits a "continuous scroll" experience, versus staying one page, is undecided — resolve in new-work.
- The rebuild ships layer by layer, and the version line tracks which layer: the `0.1.x` line covers the background/atmosphere layer only; page content arrives in later lines. Current version: 0.1.8.
- What exists today is the atmosphere layer: one full-bleed scene of mountain ridges under drifting haze with a sun in the sky. Clicking the sun turns the sky [2026-09-24, 0.1.7]: dusk → night (1.5s) sets the sun down-left behind the ridges as the moon rises on the right, through a blue hour; night → dusk (4s) fades the moon out with the morning while the sun rises on the right and crosses the sky, through dawn, day and late afternoon. The ridges reshape and are relit from the passing sky on the same clock. At rest the ridges breathe: the seed drifts ±0.5 over a 60s sine, with the ridge maths on the GPU so it costs little (GL renderer only; the fallback holds still). [2026-09-24, 0.1.8] Switches only move the seed forward, at one pace (1.5 seeds/s) in both directions, so the ridges always drift the way the sky turns; a reload returns to the recipe's seed. The moon has a face (seas, craters, Tycho's rays); the sun is a near-white disc with a warm edge and a two-layer glow, deepening toward orange and flattening a little when low. Without WebGL a layered DOM fallback draws the same scene, keeping the ridges' shape through a switch. Scenes are data: `dusk-ember.js` (day) and `moonlit.js` (night) recipes feed both renderers.
- The responsive/viewport approach for the scroll narrative is undecided — resolve in new-work.
- Real content (resume, dev log, projects, contact) still needs a home in the new structure. Planned direction for projects, post-`0.1.x`: the camera pans down from the atmosphere to a desk, a laptop (landscape) or phone (portrait) unlocks, and the scroll zooms into its screen, where a painted background carries the projects as cards/widgets (not an OS) and each opens its live deployment in an iframe. Full plan in `ROADMAP.md`. [2026-09-23: user decision, not scheduled.] [2026-09-24: user's tentative line plan — 0.2 about, 0.3 projects (the device scene), 0.4 contact, 0.5 header navigation, 0.6 real content, then 1.0.0; expected to change.]

## Brand Commitments

- Personal identity: Abhinav Gupta ("AbG"). No product name or wordmark beyond that — the earlier "AbG OS" branding is dropped. [2026-09-23: user decision.]
- The visual world starts from the atmosphere layer: Unbounded (display) + JetBrains Mono (body/labels), and the day/night scene palettes carried by the `dusk-ember` and `moonlit` recipes. Content-layer visuals are still chosen fresh in new-work, informed by but not copying `why.zero.university`'s specific imagery (liquid-metal renders, corporate-logo tokens, Michelangelo homage are that site's content, not a reusable asset).

## Evidence on Hand

- Resume and DevLog content are real and finalized — do not invent, alter, or embellish claims. This still applies regardless of mechanism.
- No testimonials, client logos, or usage metrics exist — do not fabricate social proof.

## Product Principles

- Every scroll increment should feel staged and earned — a deliberate reveal, not a static section boundary — this is the core craft bar for the new direction.
- Content surfaces (Resume, DevLog, Projects) carry real, finalized claims — treat them with the same accuracy bar as a real resume/CV, not marketing copy.
- Borrow Zero's structural idea (gamified/staged scroll-reveal choreography) and its ambition level, not its literal imagery or illustration style.
- Both goals (getting hired, being memorable) must stay reachable — a purely artistic scroll piece that buries the resume/contact path fails the brief.
