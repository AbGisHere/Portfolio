# Roadmap

Plans agreed in discussion but deliberately **not** scheduled. Nothing here is
in scope for the `0.1.x` atmosphere line.

## The desk scene — projects inside a device

**Status:** future plan, post-`0.1.x`. Recorded 2026-09-23. Version to be
decided when work starts (likely a `0.2.x`+ line).

### The sequence

One pinned, scroll-scrubbed GSAP ScrollTrigger timeline (Lenis smoothing the
input), in four beats:

1. **Camera tilts down.** Scrolling moves the atmosphere up the viewport:
   mountains rise, sky drops. Parallax per layer — sky slowest, far ridges
   faster, near ridges fastest — so it reads as a camera, not a sliding
   picture. The engine draws each ridge as its own SVG path, so per-ridge
   parallax is one more engine patch.
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
- Pause the engine's animation loop once the sky is off-screen.

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
