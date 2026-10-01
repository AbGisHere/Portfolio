---
name: AbG — Abhinav Gupta's portfolio
description: One continuous camera move through a painted mountain scene, from the sky down to a desk.
colors:
  night-charcoal: "#0c0c0d"
  signal-ember: "#ff5a1f"
  warm-ink: "#f4f1ea"
  ash-dim: "#8b8b8f"
  day-peach-silk: "#FBE7CD"
  day-apricot: "#F5C8A1"
  day-dusty-rose: "#DC9892"
  day-mauve: "#AC6D86"
  day-plum: "#784B71"
  day-inked-violet: "#452F56"
  night-midnight: "#101828"
  night-slate-blue: "#3A4A6B"
  night-dusk-slate: "#3B4060"
  night-deep-slate: "#28314C"
  night-ridge-navy: "#1C2239"
  night-floor: "#111826"
typography:
  display:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "clamp(1.75rem, min(1.2rem + 5vw, 13svh), 5.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  body:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "clamp(0.9rem, 0.85rem + 0.25vw, 1.05rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.95rem"
    fontWeight: 500
rounded:
  none: "0"
  round: "50%"
spacing:
  gutter: "max(24px, 6vw)"
  stack-sm: "8px"
  stack-md: "12px"
  inline-lg: "28px"
components:
  action-link:
    textColor: "{colors.warm-ink}"
    typography: "{typography.label}"
    height: "44px"
    rounded: "{rounded.none}"
  action-link-hover:
    textColor: "{colors.warm-ink}"
  sun-toggle:
    backgroundColor: "transparent"
    rounded: "{rounded.round}"
    size: "max(10.4cqh, 44px)"
---

# Design System: AbG — Abhinav Gupta's portfolio

## Overview

**Creative North Star: "The Descent"**

The whole site is one camera move. It starts in the sky over a range of
painted mountains, pulls back as the visitor scrolls (`0.2`), and will come
down onto a desk in a meadow where an open laptop holds the projects (`0.3`).
Every visual decision is staged along that move: a new layer earns its place
by being somewhere the camera passes, not by being a section on a page.

The mood is cinematic, quiet and painterly. The scene leads and the
interface recedes; motion is slow, continuous and driven by the visitor's
scroll, never by timers competing for attention. Light and time of day carry
the identity: a golden-hour day that sinks into sunset, and a blue night
under a moon with a face.

Anti-references: a stack of sections below a hero (the category's default),
a bare markdown CV (its opposite), and the retired fake desktop OS. The
laptop screen at the end is a painted background with project cards, not an
operating system.

**Key Characteristics:**
- One full-bleed scene behind every route, mounted once and never cut.
- Scroll is a camera, a pure function of position: it rewinds exactly.
- The palette belongs to the scene's recipes; UI colour borrows from it.
- Type is two voices only: Unbounded for display, JetBrains Mono for the rest.
- Sharp on every display, smooth at every refresh rate.

## Colors

The scene carries two palettes, each a six-stop ramp from the sky down to
the nearest ridge, defined in the recipes (`components/gradient/recipes/`)
and never in a renderer. The interface sits on top with four tokens of its
own (`app/globals.css`).

### Primary
- **Signal Ember** (#ff5a1f): the only accent. Interactive emphasis
  (link underlines on hover, keyboard focus on error actions, text
  selection). Never a fill, never a background.

### Neutral
- **Night Charcoal** (#0c0c0d): the page under the scene and the dark half
  of the sun's focus ring.
- **Warm Ink** (#f4f1ea): text on the scene, and the light half of the focus
  ring. Softer shades are `color-mix` of it, never a copied rgba.
- **Ash Dim** (#8b8b8f): secondary body text.

### The day scene, "Dusk Ember"
**Peach Silk** (#FBE7CD) overhead, through **Apricot** (#F5C8A1), **Dusty
Rose** (#DC9892), **Mauve** (#AC6D86) and **Plum** (#784B71), down to
**Inked Violet** (#452F56) on the nearest ridge. Under scroll it warms into
sunset: blue-violet overhead, a gold and rose horizon.

### The night scene, "Moonlit"
**Midnight** (#101828) overhead, a faint lilac **Slate Blue** (#3A4A6B) at
the horizon, then **Dusk Slate** (#3B4060), **Deep Slate** (#28314C) and
**Ridge Navy** (#1C2239), down to **Night Floor** (#111826).

### Named Rules
**The Borrowed Light Rule.** Anything laid on the scene takes its tint from
the scene's own stops (the error scrim uses the deepest stop of the current
recipe), so it reads as shadow in the ridges rather than a panel on them.

**The One Signal Rule.** Signal Ember appears only where something answers
the visitor: hover, focus, selection. It never decorates.

## Typography

**Display Font:** Unbounded (variable, via `next/font`, no weight list)
**Body Font:** JetBrains Mono (400–600, via `next/font`)

Unbounded's wide, rounded geometry is the one loud voice; JetBrains Mono
carries everything that is read or measured. `--font-display` and
`--font-mono` come from `next/font` on `<html>` and are never redefined in
CSS, which would bypass their size-adjusted fallbacks.

### Hierarchy
- **Display** (800, `clamp(1.75rem, min(1.2rem + 5vw, 13svh), 5.5rem)`,
  line-height 0.98, -0.02em, balanced): headlines on the scene. Bound by
  height as well as width, so a short frame never pushes it into the sun.
- **Body** (400, `clamp(0.9rem, 0.85rem + 0.25vw, 1.05rem)`, line-height
  1.6): messages and running text, Warm Ink at 84% on the scene.
- **Label** (500, 0.95rem): actions and annotations.

### Named Rules
**The Two Voices Rule.** No third family, and no system display face
standing in for Unbounded.

## Layout

There is no page grid: the scene is the layout. Content is placed against
the scene's landmarks (the near ridges at the foot of the frame, the body in
the sky), with a gutter of `max(24px, 6vw)` that also respects the safe-area
insets, since the scene runs under notches and rounded corners
(`viewport-fit=cover`).

- The scene is `position: fixed` at `100lvh`, so a mobile toolbar moving
  never resizes or reframes it. Page flow uses `svh`.
- Each stretch of the descent gets its scroll length from an empty track
  (`TRACK_LVH`), not from content height.
- Geometry tied to the scene uses container units (`cqh`): the scene is a
  size container, and the sun is sized by its height.
- Portrait, landscape, ultrawide and odd aspects are all first-class; the
  sun's arc narrows on portrait screens.

## Elevation & Depth

Flat. There are no shadows on interface elements. Depth belongs to the
scene: ridges stepping into the haze by distance, the camera's parallax, and
light on the crests. Interface text sits on a tinted scrim that fades in
over a long run, so it has no visible top edge.

### Named Rules
**The No Panels Rule.** No cards, boxes or raised surfaces over the scene
until the desk, where the laptop's screen is the one surface that holds
cards.

## Shapes

Square by default (`0`): links are underlined text with no chrome. The only
round shape is the sun's hit target (`50%`), because it is the painted body.

## Components

The content layers are not built yet; the visitor will scroll through the
whole descent before the content is designed. Two components exist today.

### The sun (signature component)
The painted sun or moon is the day/night switch. Its button is invisible
and sits exactly on the painted body, following it as the camera moves
(`sunSpot.js`). It is never smaller than 44px. It ignores clicks while a
switch runs. Keyboard focus draws a two-tone ring (a Warm Ink ring inside a
Night Charcoal rim), so it shows on the pale day glow and the night sky
alike; forced-colors mode gets a plain outline.

### Action links (error screens)
Underlined text in Warm Ink with no background, border or padding, at least
44px tall. The underline sits at 0.3em, half-strength at rest, and turns
Signal Ember on hover; the text stays Warm Ink. Focus is a 2px Signal Ember
outline offset by 4px.

## Do's and Don'ts

### Do:
- **Do** put every look decision in a recipe and the pure `sceneAt`; the
  WebGL renderer and the layered fallback only map it to pixels.
- **Do** tint anything on the scene from the scene's own stops.
- **Do** keep motion a function of scroll, and give reduced motion a calm
  alternative (no drift, instant switches), not a broken page.
- **Do** keep touch targets at 44px or more and focus visible on both skies.
- **Do** measure any new resolution cap or quality step on 5K and 6K at 2×
  before it ships.

### Don't:
- **Don't** stack sections below a hero, or fall back to a plain CV page.
- **Don't** bring back the fake desktop OS or its "AbG OS" name.
- **Don't** add a second animation loop; the scene has two clocks.
- **Don't** use Signal Ember as a fill, or gradient text anywhere.
- **Don't** put panels, cards or glass over the scene before the desk.
- **Don't** invent facts, metrics or testimonials; the content is real or
  absent.
