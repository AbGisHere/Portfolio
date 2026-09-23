# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

[2026-09-23: confirmed with user, superseding the prior Vite+plain-CSS stack.] Next.js (framework switch from Vite/React SPA). Animation/scroll: GSAP + ScrollTrigger for scroll-driven reveal choreography, Lenis for smooth scroll. Reactive background: a mix of 2D canvas (particles) and WebGL/Three.js (a liquid/3D moment) rather than committing to only one. Deploy target not yet discussed.

## Users

Mixed general audience — no single dominant persona. Recruiters/hiring managers, fellow developers, collaborators, and casual visitors (friends, social shares) all land on the same link and self-select what they explore (Resume, DevLog, Terminal, Projects, etc).

## Product Purpose

[2026-09-20: superseded the prior desktop-OS mechanism per explicit user decision — see Positioning.] The portfolio's job stays the same — (1) get the visitor to view real work (resume, projects, dev log) and take a next step, and (2) be memorable/impressive as an experience in itself — but the mechanism changes from a desktop-OS metaphor to a continuous, scroll-driven cinematic narrative in the spirit of `why.zero.university`: each scroll increment reveals/unwraps the next beat rather than the visitor navigating static windows.

## Positioning

Replacing the prior "fake desktop OS" mechanism entirely (confirmed decision, not an incumbent to preserve). The new differentiator: a single continuous scroll experience where every scroll delta is staged as a reveal — content, motion, and transitions choreographed as one narrative arc, not sections stacked on a page. The old OS build (boot/login/desktop/windows/dock/terminal) is retained only as anti-reference evidence of prior craft, not as a base to extend.

## Operating Context

Visitor arrives via a shared link with no prior context and the entire experience unfolds through scrolling — no login gate, no window management. Terminal-style or "hacker" moments may still appear as narrative beats/easter eggs within the scroll (not as a persistent OS shell). Admin-only surfaces (if kept) would need a new, undecided mechanism since the old password-gated desktop is going away.

## Capabilities and Constraints

- Single-page React 19 + Vite app, no backend. Whether a router/multi-route structure fits a "continuous scroll" experience, versus staying single-page, is undecided — resolve in new-work.
- The prior fixed 1728×1117 desktop-canvas convention no longer applies; a scroll-driven narrative needs its own responsive/viewport approach — undecided, resolve in new-work.
- Prior surfaces (Boot, Login, Desktop shell, Terminal, dock) are being replaced, not extended. Real content (resume, DevLog, projects) still needs a home in the new structure.
- Whether "AbG OS" survives as a name/wordmark within the new narrative, or the identity changes too, is undecided — the user has only confirmed the *interaction mechanism* (OS windows → scroll narrative) changes, not the name.

## Brand Commitments

- Personal identity: Abhinav Gupta ("AbG"). Whether the "AbG OS" name/branding carries into the new direction is undecided.
- Prior visual system (green terminal palette, Porter Sans Blockblock/Oswald/Playwrite/Poly/PT Mono/Rock Salt fonts, glass/blur chrome) is now anti-reference, not a constraint — the new visual world is chosen fresh in new-work, informed by but not copying `why.zero.university`'s specific imagery (liquid-metal renders, corporate-logo tokens, Michelangelo homage are that site's content, not a reusable asset).

## Evidence on Hand

- Resume and DevLog content are real and finalized — do not invent, alter, or embellish claims. This still applies regardless of mechanism.
- No testimonials, client logos, or usage metrics exist — do not fabricate social proof.
- Prior Figma file (`UY7AvqWx31m3eNK6V2KMeI`) documents the old desktop-OS design and is now historical/anti-reference, not current source of truth.

## Product Principles

- Every scroll increment should feel staged and earned — a deliberate reveal, not a static section boundary — this is the core craft bar for the new direction.
- Content surfaces (Resume, DevLog, Projects) carry real, finalized claims — treat them with the same accuracy bar as a real resume/CV, not marketing copy.
- Borrow Zero's structural idea (gamified/staged scroll-reveal choreography) and its ambition level, not its literal imagery or illustration style.
- Both goals (getting hired, being memorable) must stay reachable — a purely artistic scroll piece that buries the resume/contact path fails the brief.
