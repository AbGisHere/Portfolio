# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

[2026-09-23: the Vite/React SPA has been replaced — this is now the shipped stack, not a plan.] Next.js 16 (App Router) + React 19, plain JS/JSX (no TypeScript), plain CSS in `app/globals.css`. Fonts via `next/font/google`: Unbounded (display) + JetBrains Mono (body/labels). Animation/scroll: GSAP + ScrollTrigger and Lenis are installed as primitives for later scroll choreography, but nothing composes them yet. The reactive background is a generated gradient/shader engine (`components/gradient/engine.js`) driven by per-theme recipe files under `components/gradient/recipes/`. The earlier ambient experiments — a Three.js "LiquidMesh" and a 2D particle field — were deleted; `three` is still listed in `package.json` but is no longer imported by anything. Deploy target not yet discussed.

## Users

Mixed general audience — no single dominant persona. Recruiters/hiring managers, fellow developers, collaborators, and casual visitors (friends, social shares) all land on the same link and self-select what they explore (Resume, DevLog, Terminal, Projects, etc).

## Product Purpose

[2026-09-20: superseded the prior desktop-OS mechanism per explicit user decision — see Positioning.] The portfolio's job stays the same — (1) get the visitor to view real work (resume, projects, dev log) and take a next step, and (2) be memorable/impressive as an experience in itself — but the mechanism changes from a desktop-OS metaphor to a continuous, scroll-driven cinematic narrative in the spirit of `why.zero.university`: each scroll increment reveals/unwraps the next beat rather than the visitor navigating static windows.

## Positioning

Replacing the prior "fake desktop OS" mechanism entirely (confirmed decision, not an incumbent to preserve). The new differentiator: a single continuous scroll experience where every scroll delta is staged as a reveal — content, motion, and transitions choreographed as one narrative arc, not sections stacked on a page. The old OS build (boot/login/desktop/windows/dock/terminal) is retained only as anti-reference evidence of prior craft, not as a base to extend. The rebuild is underway: the atmosphere/background layer ships first (`0.1.x`) and sets the mood the later content beats are staged against.

## Operating Context

Visitor arrives via a shared link with no prior context and the entire experience unfolds through scrolling — no login gate, no window management. Today the visitor lands on the atmosphere layer alone: a single full-bleed animated scene with one interaction (click the sun to move day → night). Terminal-style or "hacker" moments may still appear as narrative beats/easter eggs within the scroll (not as a persistent OS shell). Whether an admin surface is still wanted at all is undecided; if kept, it would need a new mechanism since the old password-gated desktop is gone.

## Capabilities and Constraints

- Next.js 16 App Router + React 19, no backend. Whether a multi-route structure fits a "continuous scroll" experience, versus staying one page, is undecided — resolve in new-work.
- The rebuild ships layer by layer, and the version line tracks which layer: the `0.1.x` line covers the background/atmosphere layer only; page content arrives in later lines. Current version: 0.1.1.
- What exists today is the atmosphere layer: one full-bleed scene of mountain ridges under drifting haze with a sun in the sky. Clicking the sun runs day → night as one continuous ~555ms motion (sun slides across and recolours into a moon, ridges reshape, haze thins, sky crossfades). Scenes are data: `dusk-ember.js` (day) and `moonlit.js` (night) recipes feed the shared engine.
- The prior fixed 1728×1117 desktop-canvas convention no longer applies; a scroll-driven narrative needs its own responsive/viewport approach — undecided, resolve in new-work.
- Prior surfaces (Boot, Login, Desktop shell, Terminal, dock) and the first pass at page sections (Hero, Work, Proof, Contact) have all been deleted, not extended. Real content (resume, DevLog, projects, contact) still needs a home in the new structure.
- Whether "AbG OS" survives as a name/wordmark within the new narrative, or the identity changes too, is undecided — the user has only confirmed the *interaction mechanism* (OS windows → scroll narrative) changes, not the name.

## Brand Commitments

- Personal identity: Abhinav Gupta ("AbG"). Whether the "AbG OS" name/branding carries into the new direction is undecided.
- Prior visual system (green terminal palette, Porter Sans Blockblock/Oswald/Playwrite/Poly/PT Mono/Rock Salt fonts, glass/blur chrome) is now anti-reference, not a constraint. The new visual world starts from the atmosphere layer: Unbounded (display) + JetBrains Mono (body/labels), and the day/night scene palettes carried by the `dusk-ember` and `moonlit` recipes. Content-layer visuals are still chosen fresh in new-work, informed by but not copying `why.zero.university`'s specific imagery (liquid-metal renders, corporate-logo tokens, Michelangelo homage are that site's content, not a reusable asset).

## Evidence on Hand

- Resume and DevLog content are real and finalized — do not invent, alter, or embellish claims. This still applies regardless of mechanism.
- No testimonials, client logos, or usage metrics exist — do not fabricate social proof.
- Prior Figma file (`UY7AvqWx31m3eNK6V2KMeI`) documents the old desktop-OS design and is now historical/anti-reference, not current source of truth.

## Product Principles

- Every scroll increment should feel staged and earned — a deliberate reveal, not a static section boundary — this is the core craft bar for the new direction.
- Content surfaces (Resume, DevLog, Projects) carry real, finalized claims — treat them with the same accuracy bar as a real resume/CV, not marketing copy.
- Borrow Zero's structural idea (gamified/staged scroll-reveal choreography) and its ambition level, not its literal imagery or illustration style.
- Both goals (getting hired, being memorable) must stay reachable — a purely artistic scroll piece that buries the resume/contact path fails the brief.
