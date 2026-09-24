# Roadmap

Plans agreed in discussion. The ship-hygiene list is a hard gate for `1.0.0`,
and any item on it can land earlier.

## Version lines

**Status:** the user's current thinking, recorded 2026-09-24. It will change
as the site takes shape.

| Line | Scope |
|---|---|
| `0.1.x` | The atmosphere: the day/night mountain scene. Near complete as of `0.1.8`. |
| `0.2.x` | The next section down the scroll, most likely about me. Not yet designed. |
| `0.3.x` | Projects: the desk scene below, a laptop or phone holding the projects. |
| `0.4.x` | Contact / reach out. |
| `0.5.x` | A header on top of the site to navigate between the sections. |
| `0.6.x` | Populating the site with the real content. |
| `1.0.0` | Ship, once "Before 1.0.0" below is clear. |

## Before 1.0.0 — ship hygiene

**Status:** required before `1.0.0`. Recorded 2026-09-23. These are the
tell-tale signs of a vibe-coded site. Each item below is built once. Keeping it
from regressing afterwards is the per-push checklist in `CLAUDE.md`
("Pre-push checks").

State at `0.1.8`: `lang`, title template, description, canonical, OG and
Twitter cards, Person JSON-LD, favicon, custom 404, robots, sitemap and
llms.txt are in place. Browser source maps are off, and there is no
boilerplate and no `three`. The `<h1>` and intro ship as server HTML but stay
visually hidden. The open items below are the ones that need real content,
or a decision not yet made.

None of these is "done once and forgotten". The 404, OG image, icons,
metadata, JSON-LD, sitemap and llms.txt all reflect the site. Re-check them at
every version-line bump (`0.x` → `0.y`) so they keep up with UI decisions.

- [ ] **Real server-rendered content.** View source currently shows an almost
      empty page: the scene is client-only (`ssr: false`) and there is no
      text. Name, role, and the real content must render on the server
      (static HTML), with the atmosphere layered on top. Lands naturally with
      the first content layer. Don't leave it to the end.
- [ ] **Exactly one `<h1>` per page, and visible.** The home `<h1>` exists
      (server HTML) but is visually hidden until the hero layer places it. The hero name is
      the obvious one. Section titles are `<h2>`s.
- [x] **Custom 404 and error pages.** `app/not-found.jsx`, `app/error.jsx` and
      `app/global-error.jsx` all render `components/ErrorScreen`, in the site's
      own world (the atmosphere, a way home), not Next's defaults. They're
      refreshed with every version line, like all derived surfaces. See
      "Derived surfaces follow the site" in `CLAUDE.md`.
- [ ] **Unique title and description per route.** One `metadata` per route
      (or `generateMetadata`), using a `title.template` in the root layout, so
      no two pages share a title once routes like `/projects/<slug>` exist.
- [x] **Canonical URL.** `metadataBase` + `alternates.canonical` on every
      route. Needs the production domain, which is not decided yet.
- [x] **Open Graph / Twitter cards.** `og:title`, `og:description`,
      `og:image` (1200×630, generated via `app/opengraph-image.jsx` from the
      atmosphere palette), `twitter:card=summary_large_image`. Per-project images
      once projects have routes.
- [x] **Structured data.** JSON-LD `Person` (name, url, jobTitle, `sameAs`
      links) on the home page, plus `CreativeWork`/`SoftwareSourceCode` per project.
      Only real facts. See PRODUCT.md's evidence rules.
- [x] **Favicon and app icons.** `app/icon.svg` (+ `apple-icon.png`),
      so there is no browser-default or framework-default icon.
- [x] **robots.txt** via `app/robots.js`. Allows all crawlers, including AI
      crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…). They are
      not blocked. Points at the sitemap.
- [x] **sitemap.xml** via `app/sitemap.js`, generated from the real routes
      (home, projects, resume, dev log).
- [x] **llms.txt** at the root: a plain-markdown summary of who Abhinav is,
      the projects with links, resume and contact, for LLM agents.
- [ ] **Bundle diet.** Set a budget and measure with `next build` output /
      `@next/bundle-analyzer`. Since `0.1.4` the page draws with the small
      WebGL renderer. Since `0.1.8` the fallback is the layered DOM renderer
      (`components/gradient/layers/`), and the generated SVG engine (~360 KB
      minified, 128 KB gzipped) is deleted. Neither renderer is in first-load
      JS. `three` is already gone. GSAP/Lenis load only when the scroll layer uses them.

## The desk scene — projects inside a device

**Status:** future plan, post-`0.1.x`. Recorded 2026-09-23. Planned for the
`0.3.x` line (see "Version lines").

### The sequence

One pinned, scroll-scrubbed GSAP ScrollTrigger timeline (Lenis smoothing the
input), in four beats:

1. **Camera tilts down.** Scrolling moves the atmosphere up the viewport:
   mountains rise, sky drops. Parallax per layer — sky slowest, far ridges
   faster, near ridges fastest — so it reads as a camera, not a sliding
   picture. The WebGL renderer draws each ridge as its own layer in one
   shader, so per-ridge parallax is a per-ridge offset uniform, driven by
   scroll. The layered fallback can do the same: each ridge is already its
   own DOM layer, so parallax is a per-layer transform.
2. **Table enters.** A tabletop rises from below as the ridges leave the top
   and becomes the new horizon line.
3. **Device reveals and unlocks.**
   - **Laptop** (landscape viewports): MacBook Pro–like. Lid opens (CSS 3D,
     `rotateX` on the lid under `perspective`), screen wakes to a login screen,
     quick Touch ID–style unlock, into the projects background.
   - **Phone** (portrait viewports): iPhone-like, lying on the table. Screen
     wakes to a lock screen with a clock, the Face ID glyph plays (brackets
     scan, morph into a checkmark), lock screen slides up to the projects background.
4. **Zoom into the screen.** The desk group scales until the screen fills the
   viewport, then the pin releases. The screen's contents are real DOM from the
   start (rendered small inside the device), so the zoom has no swap seam.

### Design decisions already made

- **Device by viewport shape, not device detection.** CSS media query on
  aspect ratio/width: portrait → phone, landscape → laptop. A narrow desktop
  window gets the phone. Rebuild the timeline on change
  (`ScrollTrigger.matchMedia` / `refresh`) so rotating mid-scroll doesn't break.
- **Evocative, not literal.** Silhouette, notch and proportions — no Apple
  logo or wordmarks. Stylised and flat-shaded to match the painted atmosphere.
  CSS 3D, not three.js.
- **Scroll drives transforms directly.** Don't animate the pan through recipe
  fields (`glintHorizon`, `mist.height`): they pass through the rate-9
  smoothing and would trail the scroll by ~half a second.
- **Day/night carries down.** Night gets a warm lamp and a glowing screen; day
  gets flatter light.
- **The screen is not an OS.** [2026-09-23: user decision.] What unlocks is
  another beautiful atmosphere-grade background, in the same painted world
  as the mountains, with the projects laid over it as play-cards, widgets or
  icons. No home-screen or desktop simulation, no dock, no windows,
  multitasking or terminal. The exact form of the project tiles is to be
  decided as the work develops. Opening a project is full-screen inside the
  device.

### Opening a project

Every project is already deployed. Each tile opens its live deployment in an
**iframe inside the device**, so the visitor never leaves the site.

```js
{ slug: 'foo', name: 'Foo', icon: '/icons/foo.png', url: 'https://foo.vercel.app',
  embed: true,   // false → opens in a new tab instead
  mobile: true } // false → scale a desktop view down inside the phone, or flag "best on desktop"
```

Known catches:

1. **Framing headers.** A project sending `X-Frame-Options: DENY` or a CSP
   `frame-ancestors` rule can't be embedded. Allow the portfolio's domain in
   each project's headers. Framing failures aren't reliably detectable, so the
   app chrome always carries an "open in new tab" link.
2. **Logins/cookies.** Third-party cookies are blocked in iframes (Safari,
   increasingly Chrome). Projects needing sign-in get a demo mode or
   `embed: false`.
3. **Cold starts.** Free-tier hosts sleep (30s+). An app-launch splash (icon +
   loader) holds until the iframe's `onload`.
4. **Responsiveness.** The phone gives projects a phone-width viewport — see
   the `mobile` flag.
5. **Lazy loading.** No iframe exists until its app is opened; it unloads on
   close.
6. **Closing and Back.** Iframe navigation adds history entries. Provide a
   clear close (home-bar swipe on phone, close control on laptop) and handle
   Back on the portfolio's own route.

### Routing and access

- Each project gets a real URL, `/projects/<slug>`, for sharing, SEO and
  screen readers. Landing on one skips the table/unlock and opens inside the
  device directly.
- Returning visitors can skip the intro (skip control, or remember they've
  seen it).
- `prefers-reduced-motion`: a plain cut from sky to content, no scrubbed pan.
- The GL renderer already pauses when the canvas is off-screen or the tab is
  hidden. Keep that true as the pan moves the sky out of view.

### Still open

- **What scroll does after the unlock.** Scroll inside the device (paging
  through the project tiles), or release the pin and let more content (about,
  contact) continue below. Decides the whole page structure — settle before
  building.
- The form of the project tiles (play-cards, widgets, icons) and the
  background they sit on.
- Where the resume, dev log and contact live relative to the device.

### First steps, when it's picked up

1. List every project with its deployed URL and check its response headers
   for embeddability — this sizes how many projects need changes.
2. Prototype beat 1 alone (the pan with per-ridge parallax) to validate that
   the "camera" feels right before building the rest on top.
