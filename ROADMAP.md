# Roadmap

Plans agreed in discussion. The ship-hygiene list is a hard gate for `1.0.0`,
and any item on it can land earlier.

## Version lines

**Status:** the user's current thinking, recorded 2026-09-24. It will change
as the site takes shape.

| Line | Scope |
|---|---|
| `0.1.x` | The atmosphere: the day/night mountain scene. Done as of `0.1.11`. |
| `0.2.x` | About me: the camera pulls back from the mountains as you scroll, tilting down slightly and rising a little, while the sky turns toward evening (see "The descent"). Done: `0.2.0` pull-back, `0.2.1` ridge conveyor (GL), `0.2.2` the look (GL), `0.2.3` the sun and moon at any scroll, `0.2.4` performance headroom (GL), `0.2.5` ridge light at rest (GL), `0.2.6` the fallback catches up, `0.2.7` the switch cut fix, `0.2.8` the audit's clean-up, `0.2.9` the fallback's tile dropout in Chrome, `0.2.10` the custom domain and a terrain reference (docs), `0.2.11` sharpness on large high-DPI displays and the per-part docs, `0.2.12` the design audit's fixes and `DESIGN.md`, `0.2.13` the audit's owner decisions (docs). Per-release history: `CHANGELOG.md`. |
| `0.3.x` | The desk: `0.3.0` the camera, `0.3.1` the meadow and grass, `0.3.2` boot prints, `0.3.3` the mountains' foot, `0.3.4` the grass on Adreno phones, `0.3.5` flowers and trees, `0.3.6` the desk, `0.3.7` frame headroom, `0.3.8` the laptop, `0.3.9` the laptop made real, `0.3.10` the tablet, `0.3.11` the lamp, `0.3.12` the stationery and accessories, `0.3.13` a brighter lamp, `0.3.14` a closer final shot. The descent proper (both arcs of the S), from where `0.2` leaves the camera onto a desk in a meadow, ending at a laptop (a tablet on portrait viewports). Its project screen comes in `0.5.x`. |
| `0.4.x` | Current line — contact / reach out: the camera turns from the desk to a house on the hill and comes down over its balcony pool, where the contact form is planned (see "0.4 — contact: the house and the pool"). Started 2026-10-24, ahead of the device screen (the owner): `0.4.0` the camera over grey boxes, `0.4.1` the house in 3D, `0.4.2` the house rebuilt room by room, its glass, the pool's water, `0.4.3` caustics, the mirrored house, grass on the hill, contact shadows, `0.4.4` real birds, sliding glass, curtains tied by day and closed by night; `0.4.5` clean frames, wishbone chairs, a marble table, hotel beds, `0.4.6` lighting by night, `0.4.7` the stair, the bookcases, birds by the desk, `0.4.8` books, pillows, marble counters, a glass balustrade, the planters, tied curtains, `0.4.9` limestone paving and steps, daylight indoors, the stair's handrail, `0.4.10` the camera on foot from the desk through the house to the pool (replaced), `0.4.11` the turn made looking straight down over the desk, `0.4.12` the meadow running on behind the house, the hill's lawn its grass, `0.4.13` no stall on the first turn to the house, `0.4.14` no flicker on the kitchen and pictures, the upstairs glass open, curtains untied by night, `0.4.15` CI's hygiene fixed, the house in perf (info), `0.4.16` flowers and grass to the house, twigs, the entrance planting, the land behind, `0.4.17` the roof built up, the olive's pot, the pool inside the glass, brass rails, the stair's rail and lights, `0.4.18` doors' grain, real handles and pulls, mirrors that reflect, `0.4.19` pillows and cushions at rest, the throw clear of the arm, braided ties, `0.4.20` the shelves styled, real frames and prints, the table laid, `0.4.21` garments on hangers, the coat rail, the wardrobe built, `0.4.22` the terrace's bar, sockets and switches, the Home display, `0.4.23` marble washrooms with toilets, wide mirrors and a walk-in shower, `0.4.24` butterflies, the walker designed, `0.4.25` the pool fitted to every frame, `0.4.26` no flicker from afar on frames, rails and the bar's lights, the roof paved, Calacatta veining, mirrors that see out, fireflies, roses on the table, a robe and towels by the pool, `0.4.27` light by room, a table for two, the art varied, the marble cut on purpose, `0.4.28` the house lit to the lighting brief: floating ceilings, a cascade through the stair's void, statement pieces, every corner lit; `0.4.30` the lights fixed on Adreno phones; `0.4.31` the lived-in styling. |
| `0.5.x` | The device screen: the projects inside the laptop and the tablet (see "The device screen"; moved here from `0.3.15`+, the owner, 2026-10-24). |
| `0.6.x` | A header on top of the site to navigate between the sections. |
| `0.7.x` | Populating the site with the real content. |
| `1.0.0` | Ship, once "Before 1.0.0" below is clear. |

## Before 1.0.0 — ship hygiene

**Status:** required before `1.0.0`. Recorded 2026-09-23. These are the
tell-tale signs of a vibe-coded site. Each item below is built once. Keeping it
from regressing afterwards is the per-push checklist in `CLAUDE.md`
("Pre-push checks").

State at `0.1.11`: `lang`, title template, description, canonical, OG and
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
      `og:image` (1200×630, `app/opengraph-image.jpg`, a render of the scene),
      `twitter:card=summary_large_image`, with `twitter:image` filled by Next
      from the OG image (`0.2.8` dropped the duplicate `twitter-image.jpg`). Per-project images
      once projects have routes.
- [x] **Structured data.** JSON-LD `Person` (name, url, jobTitle, `sameAs`
      links) on the home page. Still to come: `CreativeWork`/`SoftwareSourceCode`
      per project, once projects exist. Only real facts. See PRODUCT.md's
      evidence rules.
- [x] **Favicon and app icons.** `app/icon.svg` (+ `apple-icon.png`),
      so there is no browser-default or framework-default icon.
- [x] **robots.txt** via `app/robots.js`. Allows all crawlers, including AI
      crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…). They are
      not blocked. Points at the sitemap.
- [x] **sitemap.xml** via `app/sitemap.js`, listing the live routes (today
      only home). Projects, resume and dev log join as they ship.
- [x] **llms.txt** at the root, generated by `app/llms.txt/route.js` so its
      links follow `SITE.url`: a plain-markdown summary of who Abhinav is and
      what's live, for LLM agents. Projects, resume and contact join as they
      ship.
- [ ] **Bundle diet.** Set a budget and measure with the gzip sizes of
      `.next/static` (Next 16's `next build` no longer prints route sizes) /
      `@next/bundle-analyzer`. Since `0.1.4` the page draws with the small
      WebGL renderer. Since `0.1.8` the fallback is the layered DOM renderer
      (`components/gradient/layers/`), and the generated SVG engine (~360 KB
      minified, 128 KB gzipped) is deleted. Neither renderer is in first-load
      JS. `three` is already gone. Since `0.2.0`, Lenis loads in its own chunk
      when the browser is idle (the scroll layer added ~1.4 KB gzip to
      first-load JS). `gsap` and its unused primitives were removed in `0.2.8`.
- [ ] **A notice for the fallback renderer.** A small, kind, playful note
      for visitors who are on the layered fallback for good. Spec in "Later —
      a notice for the fallback renderer" below.
- [x] **Unit tests for the pure maths** (`0.2.8`). `npm run test:unit`
      (`scripts/unit-test.mjs`, run in CI beside `npm run test:adaptive`):
      round trips through the colour module (`colour.js`), `paletteAt`
      hitting every keyframe exactly with no overshoot (`skyKeys.js`), and
      `sceneAt` (`scene.js`, which runs `descentAt`/`frameAt`/`bodyAt`) at
      `about` 0 (the identity) and 1, under reduced motion and mid-switch.
      Suggested by a Jules pass (2026-09-30); its other suggestions were
      declined: `SmoothScroll` re-queries the track on purpose (it persists
      across routes), and the grain loops run once per load.

## Testing: only what a change touches

**Status:** agreed 2026-09-30, for every version from here on. `0.2.9`
brought `npm run qa` with two tiers (docs-only against everything); the
per-part selection below is built when `0.3` starts, since nearly every
`0.2.x` file is shared by the whole scene.

The rule: a push tests the parts it changed, **and every part those changes
reach**, and nothing else. Parts that weren't touched were proven in the
release that last changed them.

- **Worked example.** `0.3.1` builds the desk: test the desk. `0.3.2` adds
  the grass: test the grass. `0.3.3` fixes the desk: test the desk only.
  `0.3.4` adds the table lamp, whose light falls on the grass and the table:
  test the lamp, the grass and the desk. `0.3.5` changes the desk again:
  the desk only, unless the change reaches something else.
- **How "reaches" is decided: the import graph, not judgement.** Each part
  (mountains, desk, grass, lamp, pool, header and so on) maps to its entry
  files and its checks. `qa` takes the changed files, walks the imports
  outward to every module that uses them, and runs the checks of every part
  it lands in. The lamp's light lives in a module the grass and the desk
  both import, so changing it selects all three by itself. Shared code (the
  renderers, the camera, colour, the sky, scroll) reaches every part, so
  changing it runs everything.
- **Things imports can't see.** A part can affect another without an
  import: a shared uniform, a DOM layer's stacking or GPU memory (the
  `0.2.9` dropout came from one part's layers starving the rest), or a
  frame budget two parts share. Declare those links in the part map by
  hand, and always run perf over the whole descent when any rendering code
  changes, since frame time is shared by everything on screen.
- **Full sweeps at milestones:** everything, at full depth, when a line
  closes (before `0.3.0`, `0.4.0`, …) and before `1.0.0`, to catch whatever
  the map missed.
- **The same map scopes reading.** Work on a part reads that part's files
  and the interfaces of what it reaches, never the code, docs or renders of
  parts that already work. Each part's detail lives in one doc
  (`docs/parts/<part>.md`: its files, interfaces, hooks, links and gate),
  with `CLAUDE.md` the rules and an index ("Parts"), so a session loads only
  the part it's changing. Started in `0.2.11` with the atmosphere
  (`docs/parts/atmosphere.md`); each new part (the desk, the pool, the
  header) gets its own.
- **Keep checks lean:** one check lives in one place (`CLAUDE.md`,
  "Pre-push checks"). A new part adds its cases to the existing harnesses
  rather than a new script.

## Trust, privacy and accessibility

**Status:** the user's list, recorded 2026-09-30. Each item is placed on the
version line where it starts to matter, and all of it is part of the `1.0.0`
gate. Standing rules apply from now on.

**Today** (`0.2.6`) the site collects nothing. It has no analytics, forms,
accounts or cookies, and it makes no third-party requests at runtime
(`next/font` self-hosts the fonts at build). The one thing stored is the
theme choice in `localStorage` (`abg-theme`), a preference the visitor sets
themselves, which is strictly necessary and needs no consent.

Standing rules:

- **No fabricated facts, reviews or social proof.** Nothing about Abhinav
  goes on the site, in metadata, JSON-LD or llms.txt unless it's true and
  on hand (PRODUCT.md, "Evidence on Hand"). No testimonials, client logos,
  usage numbers or invented credentials. Planned features are described as
  planned, never as live.
- **Collect the least data that works.** Every piece of data collected is
  named in the privacy policy, with why and for how long. Nothing is
  collected "just in case".
- **Any new third-party SDK or runtime request gets an audit before it
  lands:** what it loads, what it sends, whether it sets cookies, its bundle
  cost, and that it's maintained.

By version line:

- [ ] **Analytics: who visits** (Vercel Web Analytics). Cookieless,
      already on Vercel (`@vercel/analytics`, gated on `process.env.VERCEL`
      so local QA and BrowserStack tunnels never 404 or log console errors:
      views, referrers, country, device and UTM tags). It pairs with the planned
      `/privacy` route in `0.4`. Aggregates only: no individual visitor tracking.
      To tell recruiters apart, share UTM-tagged links (`?utm_source=linkedin`),
      and use the contact form.
- [ ] **Privacy policy** (`0.4`): a `/privacy` route, in the sitemap. Nothing
      links to it until the `0.6` header or a footer. It covers the host
      (Vercel), the theme in `localStorage`, the analytics, the contact
      form's data and retention, how to ask for deletion, and that the site
      isn't directed at children. It must stay true, and it's a derived
      surface, re-checked with every version line.
- [ ] **Cookie consent banner** (`0.4`, only if needed). A banner is needed
      only if something sets non-essential cookies or storage, like GA4 or
      embeds. With cookieless analytics, don't add one. If one is needed,
      nothing non-essential loads before consent, "reject" is as easy as
      "accept", and the choice can be changed later.
- [ ] **Form consent** (`0.4`, the contact form). Ask only for what a reply
      needs (email and message; name optional). Say what the data is for
      next to the submit button and link the privacy policy. No pre-ticked
      boxes, and no mailing list unless asked for separately.
- [ ] **Data deletion requests** (`0.4`, optional). The privacy policy gives
      an email address for deletion requests. Decide where form submissions
      are stored, and for how long, before the form ships.
- [ ] **Age checks for children's data** (not applicable for now). The site
      isn't directed at children and has no accounts, so an age gate would
      collect data for no reason. The privacy policy says so. Revisit only
      if accounts or profile data ever appear.
- [ ] **Keyboard navigation** (`0.5`, `0.6`). Today the sun is a real button
      with a visible focus ring, and scrolling works with the keyboard.
      `0.5`: project cards are focusable, and an opened project's iframe can
      be left with the keyboard. `0.6`: a skip link, a logical tab order
      through the header, and visible focus everywhere.
- [ ] **Colour contrast** (`0.7`, and every derived surface). Text meets WCAG
      AA (4.5:1, or 3:1 for large text and UI such as focus rings) over the
      moving scene, in both themes and at every scroll position, using
      scrims where the sky is too bright. Check the error screens with every
      version line.
- [ ] **Alt text** (`0.5`, `0.7`). Project images and screenshots get
      meaningful `alt`. Decorative ones use `alt=""`. `npm run hygiene`
      checks every `<img>` has one.
- [ ] **Third-party audit** (every version line). Today's runtime
      dependencies are `next`, `react`, `react-dom` and `lenis` (`gsap` was
      removed in `0.2.8`). `0.5`'s project iframes load third-party pages, so
      sandbox them (`sandbox`, `allow` kept to what each project needs, no
      `allow-top-navigation`).
- [x] **Unsupported claims** (audited at `0.2.4`). The site copy, metadata,
      JSON-LD and llms.txt claim nothing beyond PRODUCT.md. This roadmap's
      checklist overstated the sitemap, llms.txt and JSON-LD (listing
      projects, a resume and a dev log that don't exist yet), and those were
      fixed. Re-audit at every version line.

## The descent — one camera from the sky to the desk

**Status:** agreed in discussion 2026-09-24, for the `0.2.x` and `0.3.x`
lines. Replaces the 2026-09-23 sequence (tilt down, a table rising from
below, a CSS 3D device, zoom until the screen fills the viewport). **Changed
while building `0.2`:** `0.2` is not the start of arc 1. It pulls the camera
back (see "0.2"), and both arcs, the whole S, happen in `0.3`, starting from
where `0.2` leaves the camera.

`0.1` → `0.2` → `0.3` is **one continuous camera move**, not three effects
stitched together. Scroll position drives a camera along one path: from
today's view of the mountains, back away from them, down onto a desk in a
meadow, and round to face an open laptop with the mountains behind it. Each
version line ships the next stretch of the same path.

### The camera path

Side view: Z runs left to right, with the mountains off to the left (−Z), and
Y points up.

```
 mountains <[cam 0]->[cam 1]    0.2: both face the mountains; the camera
                          \      pulls back along +Z (slight tilt, small rise)
                           \     arc 1: faces away from its centre
                         [cam 2]  facing straight down
                            |  \
                            v   \    arc 2: faces toward its centre
                         laptop <--- [cam 3]   facing the screen
 ~~~~~~~~~~~~~~~~~~~~~~ grass ~~~~~~~~~~~~~~~~~~~~~~~
```

- **The pull-back** (`0.2`, from `0.2.0`). From today's view (cam 0) the
  camera walks back along +Z, still facing the mountains, pitching down
  slightly and rising a little. It ends at cam 1, where arc 1 starts.
- **Arc 1** (`0.3`). The camera starts at (y 0, z −R) on a
  circle in the YZ plane, facing outward (−Z): where `0.2` left it. It
  travels a quarter-turn to (y −R, z 0), still facing outward, which is now
  straight down. It pitches down 90° as it drops and draws back.
- **Arc 2** (`0.3`). A second circle, centred on the laptop, starts where arc
  1 ends: at its top, facing inward, which is also straight down. The camera
  orbits to the circle's +Z side, facing inward (−Z), toward the laptop's
  screen. It pitches back up 90°.
- **The two arcs form an S.** At the join they share a direction of travel
  (+Z) and a facing (down), so there's no kink and no snap. The curvature
  flips there. The camera never rolls.
- **Cam 3 faces −Z, the same way as cam 1.** So the final shot has the
  mountains behind the desk. The sky leaves the top of the frame during arc 1
  and comes back behind the laptop in arc 2. The same scene, day or night and
  any evening tint included, carries through the whole descent.

How it should feel:

- **One spline, not two circles.** The circles are only there to sketch the
  shape. Build one path for the camera position and a second for what it
  looks at: from a far point on the horizon, down to the laptop. Tune both
  until the move feels right.
- **Holds.** Leave short stretches of scroll where the camera barely moves:
  at the top-down shot (the closed lid) and at the end (the reading
  position).
- **The end isn't exactly (0, Zmax).** Level with the laptop you'd be looking
  along the keyboard. End slightly above the screen's centre, pitched a few
  degrees down, framing the screen, its bezels and a strip of keyboard.
- **Zoom by moving closer.** Arc 2's radius shrinks as it goes, so it's a
  spiral, not a circle, which gives real perspective on the keyboard. Narrow
  the field of view a little only at the very end, to flatten the screen so
  the project tiles read well.
- **The camera is a pure function of scroll progress.** Lenis smooths wheel
  input and the scroll layer (`components/SmoothScroll.jsx`) computes the
  progress straight from the scroll position (no ScrollTrigger in `0.2`).
  There's no physics and no catching up, so scrolling back up retraces the
  path exactly, and a resize mid-descent lands in the right place.
- **Scroll drives the camera directly, not recipe fields.** Recipe fields
  (`glintHorizon`, `mist.height`) pass through the GL renderer's rest spring
  and would trail the scroll by about half a second.

### 0.2 — about me: the pull-back

**Shipped, `0.2.0`–`0.2.13`:** the pull-back (`0.2.0`), the ridge conveyor
(`0.2.1`), the look (`0.2.2`), the sun and moon at any scroll (`0.2.3`),
performance headroom (`0.2.4`), ridge light at rest (`0.2.5`), the fallback
catching up (`0.2.6`), the switch cut (`0.2.7`), the audit's clean-up
(`0.2.8`), the fallback's tile dropout (`0.2.9`), the domain (`0.2.10`)
sharpness on large displays (`0.2.11`), the design audit's fixes
(`0.2.12`) and two of the audit's owner decisions (`0.2.13`). What each changed and measured is in `CHANGELOG.md`; how it works
now is in `docs/parts/atmosphere.md`.

**`0.2.8`: the audit's clean-up** (shipped 2026-09-30; details in
`CHANGELOG.md`). The low-risk half of the 2026-09-30 repo audit: dead code
out (the GSAP primitives and `gsap`, `npm test`, the recipes' studio-only
fields, `airAt`, unused tokens and props), the duplicates merged (one
colour module, `rampAt`, shared `MAX_DPR`/`GRAIN_SIZE`/grain, `SKY_VARS`),
one pure per-frame `sceneAt` for both renderers with unit tests
(`npm run test:unit`, in CI), Unbounded without a weight list,
`twitter-image.jpg` dropped for the OG image, and the docs split: history
and measurements to `CHANGELOG.md`, one home each for the hook table and
parity state (CLAUDE.md) and the version lines (here), stale claims fixed.
Considered and not taken: holding the fonts' preload (81 KB) until the
page shows text.

- **Owner decisions the audit raised** (not taken in `0.2.8`; the user
  decides):
  - Should the fallback keep full pixel parity under the camera, or only at
    rest and during a switch? Provisionally (2026-10-01): stills under
    `0.3`, pixel parity through `0.2` (see "0.3 — the desk").
  - ~~`.impeccable/surfaces/home.md` as the visual contract~~ Decided
    2026-10-01: it stays local (gitignored), a working file for the
    impeccable skill. `DESIGN.md` is the committed design record.
  - ~~`.claude/agents/impeccable-*` committed without its skill~~ Decided
    2026-10-01: neither is committed; the agents are gitignored with the
    skill.
  - Is the "admin surface" open task still wanted?

**`0.2.9`: the fallback's tile dropout in Chrome** (done, 2026-09-30).
`0.2.6` gave nearly every ridge part its own GPU layer to hold 120 fps: 97
layers, about 537 MB at 1792×1120@2. Past Chrome's GPU memory, tiles dropped
out mid-scroll (dark blocks, ridges at the wrong height); headless Chrome
never showed it, so parity and perf passed. Fixed by moving colour into small
canvases the compositor stretches, two masks per ridge instead of three,
masks that never re-raster mid-scroll, and an exact ridge light; tiled
layers 73 → 20, live tile memory 222 → 60 MB at 1792×1120@2 (`CHANGELOG.md`).
`perf --gate` now checks for dropout under a capped GPU memory. The same
release brought `npm run qa`.

**`0.2.11`: sharpness on large high-DPI displays** (the owner asked,
2026-09-30; done 2026-10-01, `CHANGELOG.md`). GL draws at most 4K's pixel
count (`MAX_PIXELS`) and 2× the CSS pixels (`MAX_DPR`), then scales up: a
5K@2 frame at about .75 per axis, a 6K@2 one at about .64. `npm run sharp`
measured it against uncapped: the mountains, crests and sky lose nothing
(gradient ratio 0.99–1.01); only the one-CSS-px grain went soft (0.65–0.79).
Native resolution costs 2–3× the GPU time (up to 17 ms, past a 120 Hz
frame), so the cap stays and no step goes above it (one was built and
dropped). The grain instead leaves the shader for the layered renderer's
overlay at device pixels whenever GL draws below them: 24/24 crops as sharp
as uncapped. The layered fallback already drew its grain that way, and its
ridges are CSS, native at any size.

**Standing rule from `0.2.11` on: quality holds on every display.** Every
new layer, scene and version (the desk, the pool, the header, the device
screen) must look as sharp as the display allows, from a 393-wide phone at
3× to a 6K monitor at 2×, and as smooth as its refresh allows (60, 120, 144
Hz and up). Any resolution cap or quality step is measured on large
high-DPI frames before it ships, and relaxed when the GPU has room. Checked
before every push (`CLAUDE.md`, "Pre-push checks").

**Gate.** Within `0.2.x` the layered fallback may lag GL, but every `0.2.x`
feature is ported to it, with parity passing, before any `0.3.x` work
starts. **Met at `0.2.6`:** the fallback runs the `0.2.1` descent with
`0.2.2`'s look, `0.2.3`'s `hidden` line and `0.2.5`'s resting light, and
parity passes all 42 cases (worst mean 1.06, p99 10; 0.96 and 4 since
`0.2.9`), with the hit target within .02 px at every scroll. Accepted
differences: no idle drift or reshaping in the fallback, and no wind.

- **Proposal:** the about text sits on the front ridge's fill, so the
  mountains become the page. Not decided; the text itself comes with the
  real content (`0.7.x`).
- **The favourite so far: sky lanterns** (the user, 2026-09-24; not final).
  Each lantern carries a line about Abhinav and rises into the darkening
  sunset as you scroll, sinking again when you scroll back. It's the only
  idea that carries on into `0.3`: one lantern could drift down to become
  the desk's light, or they rise out of frame as the camera comes down to
  the laptop. Whatever the metaphor, the lanterns' motion is a pure
  function of scroll, the text is also real server-rendered HTML, and phone
  portrait works as well as desktop. Where it lands (a later `0.2.x`, or a
  line of its own) is the user's call. Set aside: cassettes (maybe a desk
  prop in `0.3`), crumpled pages in a bin, trail markers, a topographic
  map, words in the mist, constellations, a field journal.

### 0.3 — the desk

**The order** (the owner, 2026-10-01): the camera first, then the ground and
the grass, then the table, then the laptop, the lamp and the accessories.

| Version | What ships |
|---|---|
| `0.3.0` | **Shipped.** The camera's whole S path after the pull-back, over a 1 m ground grid and a grey box for the desk; the scroll's two stops (the pull-back's end, the top-down shot); the closing shot's sky (a fuller gradient, clouds, birds by day, stars at night). |
| `0.3.1` | **Shipped.** The meadow: the ground layer and the anime grass (short, even, every blade its own shape and colour lean, lit by the scene), with footsteps. The grid is gone. |
| `0.3.2` | **Shipped.** Boot prints (the owner, 2026-10-02): each footstep a boot's shape with tread pressed into the grass and the ground, and the boot drawn fresh on every page load (the number of tread ridges, the heel, the sole's width and toe), so each visit leaves its own. With it: the meadow painted as grass out to the mountains (cloud shadows, wind, wildflowers) in a pass of its own, and the grass thicker seen from above. |
| `0.3.3` | **Shipped.** The mountains' foot (the owner, 2026-10-03): the pull-back ends with the front ridge running to the frame's foot (no strip of meadow under it, its size and shade kept), and under the desk camera the ridges stand in a bank of mist the far meadow runs into, a smooth blue plain, instead of meeting the ground in a ruled line. |
| `0.3.4` | **Shipped.** The grass on Adreno phones (the owner, 2026-10-04, on a Xiaomi 12 Pro): the grass's footprint loop written out print by print, since Adreno's linker rejects it as a loop; each extra GL pass now fails alone, never the frame. |
| `0.3.5` | **Shipped.** Flowers and trees in the grass (the owner, 2026-10-03): daisies, buttercups and pom-poms in the painted flowers' drifts; a lone tree framing the closing shot and copses on the meadow, upright, with long shadows; far birds among the ridges (the owner, 2026-10-04); older iPhones and iPads (iOS 13 to 16) working again. |
| `0.3.6` | **Shipped.** The desk (the owner, 2026-10-04): a wooden trestle table built in code, lit live by the sky (no lightmaps), with its shadow on the meadow; the trees' crowns filled in. |
| `0.3.7` | **Shipped.** Headroom before the laptop (the audit, 2026-10-04): under the desk camera the scene is drawn after the desk, grass and trees, only where none of them stands, the shadows only on its ground; the same picture, the closing shot 8.3 → 5.8 GPU ms. |
| `0.3.8` | **Shipped.** The laptop (the owner, 2026-10-05): built in code, silver by day and space black by night, the lid opening over arc 2, a placeholder glow on its screen; the reading position moved in so the screen spans ~42% of the frame. |
| `0.3.9` | **Shipped.** The laptop made real (the owner, 2026-10-05): one space black finish by day and night, GGX shine with Fresnel, polished edges, the lid's rolled edge and the shut seam, a soft contact shadow all round and the shut lid's full shadow; the screen's glass, notch and camera, its light on the deck and desk by night; key legends and bevels, the backlight by night; the front scoop. |
| `0.3.10` | **Shipped.** The tablet (the owner, 2026-10-06): on a portrait frame it stands in the laptop's place, leaning on a stack of cloth hardbacks, space black with the logo on its back, its screen waking as the camera comes round; the path ends looking down onto its screen, which spans up to 74% of a phone's width. Landscape frames keep the laptop; only one is ever on the desk. |
| `0.3.11` | **Shipped.** The lamp (the owner, 2026-10-04 and 2026-10-06): an ivory anglepoise in the desk's back right corner, built in code; on by night with its pool by the device, off by day. Click anywhere on it, wherever it's in the frame, to switch night and day; drag its top half to move the head and its light. The bulb, the light and the shadows turn with the sky's switch rather than snapping, and by night the bulb now and then flickers. Where the sun and moon are off the frame, their hit target leaves the tab order (the audit, 2026-10-04). The lamp's light never passes through the laptop or tablet, and a drag stops at them. A reload starts at the top of the page (the theme kept), and a hard refresh moves the copses (the lone tree stays). |
| `0.3.12` | **Shipped.** The stationery and accessories (the owner, 2026-10-08): an open notebook with a fountain pen, a mug with coffee by day and tea by night (its tag dissolving with the switch) and steam off it, a pad of sticky notes with one torn off, and folded tortoiseshell glasses in the lamp's pool; built in code, lit by the sky and the lamp, with their shadows on the desk, and the lamp's drag stopping at them. |
| `0.3.13` | **Shipped.** A brighter lamp (the owner, 2026-10-14): its light 1.6× (`LAMP.power`). |
| `0.3.14` | **Shipped.** A closer final shot (the owner, 2026-10-23, after the home-page critique: more of the laptop's screen, since it will hold the projects): the screen about 57% of a 16:10 frame's width (was 41%), from an eye 1.0 m up (was 1.07) and 10.5° of pitch, so the mountains stay over the lid; the tablet unchanged. |
| `0.3.15`+ | The device screen, moved to `0.5.x` (the owner, 2026-10-24): `0.3` closes with the desk. |

**Still owed by the `0.3` camera** (before the line closes): the fallback's
stills (it holds the pull-back's end for now), a reduced-motion version of
the path (it runs the full move today), and `perf`, `parity` and `switch`
over the `0.3` stretch (they cover `0.2` only).

**The grass is drawn, and real** (the owner, 2026-10-01). Anime grass, a
mix of Ghibli and a Doraemon film: cel-shaded blades with clear shapes and
two or three flat tone bands (dark root, light tip), in tufts of uneven
height and tint, with wind moving through in visible waves. Anime greens,
lit by the sky like the ridges: golden-green at dusk, blue-green under the
moon. Thousands of instanced 3D blades near the desk, thinning with
distance into a ground layer, with the wind on the GPU, in one draw call. It
holds 120 fps and the quality rule on every display.

**Footsteps** (the owner, 2026-10-01). The grass answers the pointer like an
invisible person walking through it. The pointer is cast onto the ground,
so a step lands where it points. Moving the mouse lays alternating left and
right footprints one stride apart along its path; a tap on touch is one
step (a drag scrolls, so it doesn't stamp). Blades flatten outward under a
foot and spring back over a second or two. Steps are stamped into a small
ground-space texture that fades, and the grass bends from it. Only while
the meadow is in view, and only in GL (the fallback's stills don't react).
Reduced motion keeps the footprints but drops the rebound and the wind.
This is the scene's third clock (below).

**The fallback under `0.3`** (provisional, 2026-10-01; option A): it plays
the pull-back as today, then crossfades painted stills through the arcs,
rendered from the GL scene at build time. Parity there checks each still
against its GL frame at its scroll point, not every scroll.

**The scene.** A meadow of flowing grass. On it, a square wooden table with a
laptop, a desk lamp and stationery, plus whatever else makes it feel real and
lived-in. Seen top-down at the join between the arcs, the laptop is closed.

**The laptop** is MacBook Pro–like, space black by day and by night.
[2026-10-05: the owner's call, in `0.3.9`, replacing the silver/black swap.]
The night darkens it through its light, never a different colour.
- **The Apple logo is on the lid.** [2026-10-05: the owner's call, over the
  earlier no-logo rule, with the trademark risk noted.] It's drawn to read
  upright from behind the open lid, so from the top-down shot it's upside
  down, as on a real laptop seen from the user's seat. Still don't call it
  "MacBook" anywhere on the page. The AbG mark doesn't go on the lid.
- Built in code (`0.3.8`, `gl/laptopShader.js`), not modelled in Spline.
- **The lid opens from 15% to 90% of arc 2,** finishing at about 105–110°. It
  leads the camera slightly, so the screen faces the camera before the camera
  gets low. Otherwise mid-arc you'd be looking at a half-open edge.

**Theming: swapped versus relit.**
- **Swapped per theme:** at most one or two accessories. The mug holds
  tea by day and coffee by night (`0.4.0`, the owner's pick, 2026-10-24,
  reversing `0.3.12`'s coffee-by-day choice). The drink and its tag turn
  with the sky on the switch's clock. The laptop and tablet keep one
  space black finish, relit by the scene, from `0.3.9`.
- **Relit per theme:** the grass, the wood and everything else. They take
  their light from the sky palette, like the ridges do: warm sun at dusk,
  cool moonlight and the lamp's pool of light at night.

**The lamp is a real table lamp,** and a hook for a later about-me layer.
What that layer is hasn't been decided.

**The lamp is a theme toggle.** Lamp on means night, lamp off means day.
It's the sun toggle's counterpart at the other end of the page.
- It's a real `<button>` over the lamp, like `SunToggle`: keyboard-focusable,
  labelled ("Lamp — switch on, to night"), and `data-busy` for the length
  of a switch.
- Its hit area is the lamp's own outline, projected from the 3D lamp to
  the screen every frame with the same camera maths as the drawing, so it
  can't drift off the lamp. [`0.3.11`: any part of it, the owner,
  2026-10-06.]
- It's live wherever the lamp is in the frame and big enough to see.
  [`0.3.11`: the owner, 2026-10-06, replacing "only at the holds".]
- **Its top half can be dragged:** the arms and head follow the pointer
  as far as they reach, never into the device, and the light and shadows
  go with them (the light never passes through the device); the arrow
  keys do the same. The pose is kept per browser. [`0.3.11`: the owner,
  2026-10-06.]
- **A switch is a turn, not a cut:** the bulb comes up as night falls and
  fades as day returns, and every light and shadow on the desk turns with
  the sky on the switch's clock. [`0.3.11`: the owner, 2026-10-06.]
- The hint is a cursor change and a faint glow on hover, nothing more.
- At the final shot the sky is visible behind the laptop, so a click plays
  the whole sky turn in the background.

**Portrait viewports get a tablet.** A 16:10 laptop screen in a portrait
viewport leaves the project tiles tiny. [2026-09-24: user's idea, proposed.]
On portrait viewports an iPad-like tablet stands on the desk in the
laptop's place, and the path's last stretch looks down onto its screen: the
same scene and path, a different end point. [2026-10-06, `0.3.10`: the
owner's call, replacing "a tablet on the desk for everyone": a phone sees
no laptop, a landscape frame no tablet.]
- **Why a tablet, not a phone:** a portrait tablet screen is about 3:4. It
  matches portrait tablets exactly, and on a phone (about 9:19.5) it still
  fills the width and leaves room above and below for the desk around it.
  At a 390 px-wide phone, a width-fitted tablet screen is about 520 px tall,
  against about 245 px for the laptop's. It also gives the tiles more width
  than a phone screen would, and one layout covers phones and portrait
  tablets.
- **Its finish matches the laptop's: space black, day and night.**
  [2026-10-05: the owner's call, replacing the 2026-09-24 per-theme swap.]
  The night only relights it.
- **It leans on a stack of books** (the owner, 2026-10-06, over a desk
  stand or a folio): five cloth hardbacks, its back resting on the top
  one's edge above its middle, at the laptop screen's tilt (72°).
- **The same trademark rule as the laptop:** don't call it "iPad" on the
  page. It carries the logo on its back, like the laptop's lid (the owner,
  2026-10-06).
- A phone can still lie on the desk as a prop, but no path ends at it.
- Pick the device by viewport shape, not device detection: portrait gets the
  tablet, and landscape (tablets in landscape included) gets the laptop
  (`deviceFor`, `0.3.10`). It's chosen every frame, so rotating mid-scroll
  swaps the device and its end point at once.

### Rendering

The mountains are effectively at infinity, so they can stay 2D (superseded
2026-10-23: they move to stylised 3D, see "Later — the mountains in
stylised 3D"). The desk
can't be faked: a hinge opening while the camera orbits from above to the
front needs real geometry.

- **Sky, mountains and ground: extend the current shader.** Per-ridge depth
  and the camera's pitch and height give the ridges' offsets and scale. The
  ground is a per-pixel ray–plane intersection, the far meadow; near the
  desk, instanced 3D grass blades stand on it (see "0.3 — the desk"). The ridges' mist band at their
  feet (`stops[1]`) hides the seam between mountains and ground.
- **Desk objects: procedural mesh passes in the same WebGL2 context.**
  The desk, devices, lamp and accessories are built in code and lit live by
  the sky and lamp, with runtime shadows and material shading. One context,
  canvas and camera keep them in step with the mountains. They ship no glTF
  models or baked lightmaps. This supersedes the original Blender lightmap,
  glTF conversion and OGL contingency plan; three.js remains ruled out.
- **Assets:** the original 1–1.5 MB desk asset budget, KTX2 textures and
  meshopt-compressed models were provisions for imported models. The shipped
  desk uses procedural geometry and generated textures instead. Revisit
  asset budgets if an imported accessory is chosen.
- **The layered fallback** follows the mountains' part as layer transforms.
  Desk stills with a crossfade are planned; it currently holds the
  pull-back's end through the desk stretch.
- **Parity:** `?scroll=` pins the progress, and `npm run parity` compares
  the renderers at the top, middle and end of the `0.2` stretch
  (`--scrolls`). Extend both to the `0.3` stretch.

### Authoring in Spline, and a desk that's alive

**Current approach:** all shipped desk objects are built in code and lit
live (`0.3.6`–`0.3.12`), without imported models or baked lightmaps. Spline
stays an option for a future accessory that needs an authored model. The
original decision and handover below are retained as history, not the
current implementation plan.

[2026-09-30: original user decision, superseded for the shipped objects.]
**The original plan was to model desk objects in
[Spline](https://spline.design).** It's the design tool, not the runtime:
Spline's own embed would be a second WebGL engine (several hundred KB, its
own camera and light, no fallback, scene files from its servers), so it's
ruled out on the same grounds as three.js. The plan was for the user to
model and dress the scene in Spline, then export glTF for our own mesh pass,
under our camera and light.

**Original handover from Spline (for any future imported model):**
- **glTF per object, in one scene file.** Every part that moves on its own
  is its own node, with its pivot where it turns: the lid's hinge, the
  pencil, the clock's hands, the lamp head.
- **Lamp on and lamp off,** as two light setups on the same geometry. They
  feed the two lightmaps: day, and night with the lamp's pool. Check
  whether Spline can bake lightmaps; if not, bake them in Blender from the
  same glTF.
- **Reference renders** from the top-down hold and the final shot, to
  check the result against by eye.
- **Budget:** keep the whole scene within the asset budget above (under
  about 1–1.5 MB), with low-poly models and detail in the textures.

**The desk is alive.** Small things move on their own, so it never reads as
a still image. **Nothing repeats on a schedule.** Each effect waits a random
interval (a Poisson-like spacing, never a fixed period) and plays at a
random speed and strength, from a noise curve rather than a loop. No two
visits, and no two minutes, look the same. Rare beats constant: an effect
every so often feels real, and a tight loop reads as a GIF.

| Effect | How |
|---|---|
| **Pencil** | Every so often it rolls a little, or settles after a nudge. It's a rotation of its own mesh about its long axis, with a slight slide, easing to rest, and its shadow follows. |
| **Lamp flicker** | Built in `0.3.11` (`makeFlicker`). Night only (the lamp is on). The light is mostly steady, with an occasional stutter: a few fast dips in the lamp's light. The pool on the desk flickers with the bulb, since it's the same light. |
| **Sparks** from the extension box | A rare, short burst: a few bright streaks with gravity, fading within about 300 ms, as particles in the shader. Each burst flashes the nearby surfaces for a frame or two. |
| **Grass** | Sways in gusts: noise-driven, strongest at the tips and still at the roots, varying in strength and direction. It extends `0.2`'s meadow wind (`WIND`). |
| **Desk clock** | Seen from above. It shows the visitor's real local time, read from the device clock (no data leaves the browser). The face is readable from the top-down hold. The hands are their own meshes, rotated in code; the seconds hand ticks. |

Rules for all of them:
- **One clock, one budget.** They run on the renderer's existing rest tick
  (30 Hz, `IDLE_HZ`) and pause when the scene is off screen or the tab is
  hidden. Everything scales with adaptive quality.
- **Reduced motion:** all of it holds still. The clock still shows the right
  time, updated once a minute. **No flicker or sparks at all**: flashing
  light is an accessibility issue, not a matter of taste.
- **The fallback** gets a lighter version: the pencil and the grass as CSS
  transforms, the flicker as the lamp layer's opacity, and the clock hands
  as rotated layers. Sparks are GL-only.
- **Parity** compares the renderers with every effect held at rest
  (`?freeze=1`, as the veils are today), with the clock pinned to a fixed
  time.
- **The lamp stays a theme toggle** (above): a flicker never changes the
  theme. Sparks and flickers don't fire during a switch.

### Loading

Nothing should load all at once, and nobody should have to scroll and wait.

1. **Open.** HTML, the server-rendered text and the CSS backdrop sky paint
   first, then the `0.1` renderer, as today. Nothing else competes with it.
2. **Once `0.1` has painted and the browser is idle:** load the `0.3`
   code (the camera path, the ridges' depth, the ground). It's small, since
   it mostly extends the running shader. Pre-compile the new shaders in the
   background (`KHR_parallel_shader_compile`), so the first frame that needs
   them doesn't stall.
3. **The desk, in the background:** build procedural meshes and generated
   textures without blocking the first atmosphere paint. The original plan
   to fetch models, decode textures in a worker and progressively load
   lightmaps is superseded for the shipped desk; those steps apply only if
   future imported assets need them.
   - Upload to the GPU a piece at a time across idle frames. One large upload
     in a single frame is the classic cause of a hitch while scrolling.
   - Pause background work while a sun switch runs.

- **Scrolling early.** Heading toward a section raises the priority of what
  it needs. Scroll is never blocked or hijacked. The mountains and ground are
  always ready, since they're the shader. The desk fades in when it arrives,
  never popping in and never showing an empty table.
- **Slow connections.** On data saver or a slow connection, load the lighter
  tier, and fetch the desk only once the visitor heads that way.
- **Repeat visits.** Content-hashed file names with long cache lifetimes, so
  a second visit is near-instant.

### Performance and feel

The rule: it must never feel slow, laggy or buggy.

- **Frame budget:** 120 fps on the M4 and 60 on mid-range phones, through the
  whole descent. The switches already meet this (p95 about 9.5 ms). Nothing
  heavy runs on the main thread during scroll: uniforms and the draws, as
  today.
- **Adaptive quality** (the resolution step is live from `0.2.4`; `0.3`
  adds its own knobs). If frames run long, lower the canvas DPR, the grass
  detail before anything visibly stutters (lightmap sizing belonged to the
  superseded baked-asset plan). Tiers: the
  full scene; a lighter scene; stills of the desk with a crossfade; the
  non-WebGL fallback.
- **No visible seams** between the mountains and the ground at any aspect
  ratio.
- **Reduced motion:** a cut or crossfade between the three key shots (the
  mountains, top-down, the final shot). An S-shaped 180° pitch is exactly the
  move that bothers vestibular-sensitive visitors.
- **Proof before each release in these lines:** `npm run perf` extended to
  scroll the whole descent, and `npm run parity`, across the viewports in
  `CLAUDE.md`'s pre-push checks. Run on a real mid-range phone, not only the
  M4, plus throttled network and CPU runs of "open and scroll straight down".
  First paint and first-load JS stay at today's baseline. No background task
  runs longer than about 50 ms in the first 10 seconds, and no frame is blank
  or broken. A stretch that misses its budget doesn't ship until it meets it.

## The device screen — projects inside the laptop

**Status:** recorded 2026-09-23, now for the `0.5.x` line (moved from
`0.3.x` on 2026-10-24). The path to the device is "The descent" above.

- **The screen is not an OS.** [2026-09-23: user decision.] What the laptop
  (or tablet) shows is another beautiful atmosphere-grade background, in the
  same painted world as the mountains, with the projects laid over it as
  play-cards, widgets or icons. No home-screen or desktop simulation, no
  dock, no windows, multitasking or terminal. The exact form of the project
  tiles is to be decided as the work develops. Opening a project is
  full-screen inside the device.
- **The screen is real DOM** from the moment it's visible, placed on the
  screen with the camera's projection, so it stays live and interactive.
- **Day/night carries through:** at night the screen glows and the lamp is
  warm; by day the light is flatter.

### Opening a project

Every project is already deployed. Each tile opens its live deployment in an
**iframe inside the device**, so the visitor never leaves the site.

```js
{ slug: 'foo', name: 'Foo', icon: '/icons/foo.png', url: 'https://foo.vercel.app',
  embed: true,   // false → opens in a new tab instead
  mobile: true } // false → scale a desktop view down inside the tablet, or flag "best on desktop"
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
4. **Responsiveness.** On a phone, the tablet's screen gives projects a
   phone-width viewport — see the `mobile` flag.
5. **Lazy loading.** No iframe exists until its app is opened; it unloads on
   close.
6. **Closing and Back.** Iframe navigation adds history entries. Provide a
   clear close (a home-bar swipe on the tablet, a close control on the laptop) and handle
   Back on the portfolio's own route.

### Routing and access

- Each project gets a real URL, `/projects/<slug>`, for sharing, SEO and
  screen readers. Landing on one skips the descent and opens inside the
  device directly.
- Returning visitors can skip the descent (a skip control, or remember
  they've seen it).
- `prefers-reduced-motion`: see "Performance and feel" above.
- The GL renderer already pauses when the tab is hidden or the canvas is
  off-screen. Keep that true once the descent is built, and stop drawing the
  desk while it's out of view.

### Still open

- **What happens after the final shot.** Push into the screen until it fills
  the viewport, scroll through the project tiles inside the device, or let
  more content (contact) continue below. This decides the page structure, so
  settle it before building.
- **Waking the screen.** The 2026-09-23 idea: a login screen and a quick
  Touch ID–style unlock on the laptop, or a lock screen and Face ID glyph on
  a portrait device. Not revisited since the descent was agreed.
- Where the about text sits in `0.2`.
- The form of the project tiles (play-cards, widgets, icons) and the
  background they sit on.
- Where the resume and dev log live relative to the device. Contact comes
  after the desk, at the pool (`0.4`).

### First steps, when it's picked up

1. Use the shipped desk camera and device geometry (`0.3.0`–`0.3.14`) to
   prototype the live DOM screen at the reading holds on both frame shapes.
2. List every project with its deployed URL and check its response headers
   for embeddability. This sizes how many projects need changes.
3. Choose the screen's background and project tiles, then build them as
   accessible DOM projected onto the existing laptop and tablet screens.

## 0.4 — contact: the house and the pool

**Status:** idea, 2026-09-30 (user); started 2026-10-24, the camera's
arcs 3 and 4 over grey boxes first (`0.4.0`, like `0.3.0`). Everything
here is built in proper 3D, like the desk and the trees (the owner,
2026-10-24): the house and the hill are modelled, not painted. The
camera carries on from the desk, turns round to a house on the hill that
looks out at the mountains, and comes down over a pool on its balcony. The
person from the desk walks up to the house as the camera turns, and is
stepping into the water when the pool comes into view. The contact form
sits over the pool.

### Upcoming patch releases — ordered plan

The owner has finished the current feedback pass and delegated release ordering.
Group related fixes into coherent releases rather than one version per fix.
Each release below retains the detailed requests and acceptance checks gathered
so far. Further feedback can extend the plan; visual choices marked open still
need design exploration within their release. These are planned changes, not
shipped behavior; the current release is `0.4.30`. No implementation, commit
or push is part of this planning pass.

| Version | Scope | Acceptance |
|---|---|---|
| `0.4.16` | **Landscape and planting.** Meadow coverage from desk to house: extend flowers across the whole patch (the owner reports them only in the bottom quarter of the screen), and increase grass density around the house to match the fullness of the meadow around the main desk. Tree branch endings and canopy construction. The owner's close-up screenshot shows blunt, flat-ended cylindrical branch stubs protruding through the foliage. Improve how branches taper, fork and terminate within the canopy. Entrance flowers and planters. Add visible soil and improve plant selection, arrangement and rendering. The owner particularly dislikes an entrance plant described as a circle with pokey things outside; identify the exact plant/mesh before reworking or replacing it. Landscape backdrop behind the house. The owner's wide approach screenshot shows the house surrounded by a broad, empty ground-to-sky horizon, making the setting feel unfinished. Design a backdrop that grounds the house in its landscape; the exact treatment remains open. | Flowers cover the whole intended patch along the route without a visible screen-space cutoff. Grass around the house reads as full and dense as the desk meadow, following the hill while keeping paths, steps and the house clear. Verify both themes and portrait/landscape views, preserving the scene's quality and frame-budget rules. Branches narrow naturally toward smaller twigs, with believable joins and no conspicuous flat-cut ends sticking out through leaves. Balance foliage placement with the branch structure rather than hiding every defect with denser leaves. Inspect the affected tree species close up and from the normal route, by day and night, while preserving the scene's style and frame-budget rules. Plants visibly grow from recessed soil within the planters, with believable stems, foliage, flowers and varied forms. Remove the artificial circular/spiky appearance flagged by the owner. Choose a coherent planting composition suited to the entrance, with natural spacing and proportions rather than repeated geometric clumps. Check the entrance close up and along the approach in both themes; coordinate branch/foliage improvements with `0.4.16` and preserve the frame-budget rules. Establish depth behind the house with a coherent landscape composition rather than an abrupt empty horizon. Keep the house silhouette, terrace and pool readable, and preserve the desk-to-house reveal. Review the actual scroll route as well as wide views, portrait/landscape framing, both themes and the transition between them. Coordinate with grass coverage in `0.4.16` and tree improvements in `0.4.16`, preserving the scene's frame budget. |
| `0.4.17` | **Exterior architecture, pool and railings.** Roof architecture and materials. The roof currently reads as a plain cuboid; improve texture, edge detailing and architectural design. The final profile remains open for brainstorming. Poolside details: the olive planter, its lighting, the pool edge against the glass railing, and gold handrails on the exterior glass balustrades. First improve the pot's geometry and material so it reads as an actual flowerpot rather than a plain block; then correct the uplight currently sitting at its rim. The owner also reports one pool edge extending beyond the glass; inspect and correct that alignment. Stair detailing and lighting. Correct the reported gaps between the steel connectors on the left-side glass balustrade and the handrail, which make the handrail appear to float. Ensure the under-tread lights turn on and visibly illuminate the stairs at night. | The roof reads as a designed architectural element with convincing materials and construction detail rather than a plain block; explore fascia, soffit, seams and surface texture without committing to a roof profile yet.  Check approach, terrace and wide views in both themes. A convincing pot with a defined rim, visible soil and a grounded base, proportioned to the olive and terrace. Place the uplight on the terrace beside the pot, aimed into the plant, with no fixture sitting on or intersecting the pot. The pool edge stays inside the terrace's glass boundary, with appropriate clearance and no intersections, checked from the approach and top-down pool hold. Add a gold-toned metal handrail/cap along the top of the exterior glass balustrades, interpreted from the owner's request for gold railings over the glass. Keep the glass visible below, join corners and ends cleanly, and make all supports visibly connect. Carry the same gold handrail treatment onto the first-floor glass balustrade beside the stairs, coordinated with the stair work in `0.4.17`. Exact profile, finish and any additional rail members remain open for discussion. Check the planter, light, pool edge and gold rails by day, by night and through the theme switch. Every intended steel-to-handrail connection visibly meets the rail along the stair, including the ends and changes in height. Keep the glass balustrade and ensure the first-floor section beside the stairs uses the gold handrail treatment from `0.4.17`, superseding its previous walnut finish there. Confirm the finish of the remaining sloped stair rail when designing the junction. Leave no visible gaps or fittings protruding through the rail. The underlights give the steps a clear, attractive glow at night and follow the day/night switch smoothly. Verify close views and the normal camera path by day and night. |
| `0.4.18` | **Doors, hardware and reflections.** Doors and hardware throughout the house. The owner's screenshot shows repetitive horizontal banding on the wooden doors; improve their material and construction. Replace thin or unconvincing handles with proper 3D hardware on all doors, drawers, cabinets and other handled storage. Working mirror reflections throughout the house. The owner reports that mirrors currently appear grey; make every mirror reflect the surrounding room and scene. | Wood grain reads naturally at the right scale and orientation, without conspicuous repeated horizontal stripes; inspect whether the banding comes from grain, shading or geometry before choosing the fix. Give doors convincing thickness, edges and frames. Handles have modeled grips, mounting plates/rosettes or feet where appropriate, enough clearance to be grasped, and secure attachment without floating or clipping. Use suitable hardware for hinged doors, sliding doors, drawers and cabinets rather than one shape everywhere. Coordinate finishes with the gold rails and room designs; check all affected rooms close up and from the normal route in both themes. Reflections respond correctly to the viewing angle and mirror plane, with appropriate framing, perspective and day/night lighting, rather than a grey fill or a generic shine. Cover all mirrors, including the foyer and redesigned washrooms. Choose a rendering approach after assessing visual quality, multiple-mirror behavior and cost in the existing WebGL2 renderer; preserve the project's frame-budget rules and scope the fallback treatment explicitly. |
| `0.4.19` | **Upholstery and curtain details.** Pillows, couch cushions, bedding placement and sofa-throw intersections. The owner reports the same unnatural downward shift/flattening on both bed pillows and couch cushions; the bedroom screenshot includes a displaced-looking accent cushion. Inspect their geometry, orientation and placement before diagnosing whether any movement is involved. Curtain tieback ropes. Replace the thick, rigid-looking rope ring flagged in the screenshot with a convincing fabric tieback treatment. | Pillows have convincing volume and rest against the headboard, mattress or other pillows with believable contact and gravity. Eliminate unintended sliding, floating, clipping and excessive flattening; align the duvet and folded bedding with the mattress. Apply the same corrections to couch cushions, giving them natural support against the seat, backrest or armrest. Fix the sofa-arm throw overlap: the owner's screenshot shows grey upholstery breaking through the brown draped fabric. Inspect the surfaces and depth separation, then shape the throw to clear the arm with believable fabric thickness and contact, without visible intersections or a floating gap. Check both beds and all affected couch cushions, relevant camera angles, and both themes, including the transition between them. Improve the curtain tiebacks: the owner's screenshot shows a thick, rigid-looking rope ring. Give the ropes convincing scale, braided texture, flexible drape, a believable wrap/attachment and a refined knot or tassel treatment; keep them seated against the gathered fabric without clipping, and preserve the curtain's day/night transition.  Check close views and the normal route in both themes. |
| `0.4.20` | **Shelf, frame and dining styling.** Bookshelf styling and photo frames throughout the house. Rework the random cup/bowl-like shelf ornaments and the lone shallow bowl composition. Dining-table vase and cutlery. Improve the plain angular bottle-like vase and add deliberate place settings. | Balance books, decorative objects and open space with convincing proportions, materials and placement. Rework or replace the cup/bowl-like pieces as needed; brainstorm the object selection before implementation rather than filling every compartment. Improve photo-frame profiles, materials, mounts, glazing/depth and placement throughout the house, with convincing construction and no flicker between surfaces. The choice of photos/art remains open; do not invent personal photographs or biographical content.  Check proportions and finish by day and night. Improve the dining-table vase's silhouette, rim/opening, material and finish: the owner's screenshot shows a plain, angular bottle-like object. Add cutlery in deliberate place settings, proportioned to the table and seats, with convincing metal shading and no floating or intersecting pieces. Flowers in the vase and additional tableware remain open for discussion.  Check the table close up and along the route in both themes. |
| `0.4.21` | **Entrance clothing and wardrobe.** Entrance coat rack and believable garments. Establish garment construction and variation that can also support the wardrobe work. Luxury walk-in wardrobe and realistic clothes. Improve cabinetry, storage, materials and garments as one room design. | Redesign the entrance's hanging clothes and their rack: the owner's screenshot shows bulky overlapping rounded shapes that do not read as garments. Use recognizable garment silhouettes, convincing fabric folds and thickness, visible hooks/hangers and believable suspension. Improve spacing and scale so the clothes do not merge into a solid mass or crowd the adjacent mirror and bench; garment selection remains open.  Check close views and circulation by day and night; coordinate garment geometry with the following wardrobe release. Redesign the walk-in wardrobe to feel more luxurious, with better cabinetry, material finishes and considered storage/display details. Explore integrated lighting and fittings as part of its design; the exact finishes and layout remain open. Rework its hanging and folded clothes to look like real garments, with recognizable silhouettes, believable fabric drape, folds, seams and thickness, proper hangers and natural spacing. Coordinate this garment work with the entrance coat rack so neither area relies on bulky anonymous shapes. Keep the styling consistent with the house and readable by day and night, both close up and from the normal camera path. |
| `0.4.22` | **Mini-bar and lived-in home details.** Mini-bar nook beside the upstairs bedroom glazing. Use the large wooden section to the left of the glass, facing the pool terrace, identified in the owner's screenshot. Plug points and Apple Home display. Add recognizable electrical details throughout the house and a considered Home control screen to bring life into a room. | The bar belongs to the house's existing materials and scale, reads clearly from the terrace/pool approach, and preserves bedroom access and circulation. Explore a counter, storage/shelving and integrated lighting before settling the design; these are options, not an approved object list.  Check by day and night from the terrace and pool approach. Add recognizable socket plates at practical locations throughout the house, accounting for bedside use, the study, kitchen appliances and other furnished areas; coordinate nearby light-switch plates as part of the design. Choose the socket style and plate finish before implementation. Design a room-mounted or placed Apple Home display (the owner's term: Apple homeview); the exact device, room, placement and extent of interaction remain open. Its screen should feel like a considered part of the occupied home; agree on the visible controls and any live behavior before building them. Treat these as visual architectural details; interactive electrical controls are not yet planned.  Check room views and the normal approach in both themes; exact device, placement and interactions remain open. |
| `0.4.23` | **Marble washrooms.** Redesign the downstairs WC and upstairs en-suite with Italian marble throughout and strong, warm lighting. The owner requests a long horizontal mirror, approximately 3:1 width to height; a proper toilet (reported missing/not apparent); and a spacious, premium shower area in the en-suite, including a hand shower and refined fittings. | Plan each room's fixtures and circulation together. Provide a clearly recognizable, usable toilet in each washroom. Carry Italian marble across the room's architectural surfaces, with convincing veining, slab joins and wet-area detailing; the marble variety and fitting finishes remain open. Give the en-suite a well-defined shower space with a main shower, hand shower and appropriate drainage. Fit the wide mirror at the vanity where the layout allows. Warm ambient, vanity/task and shower lighting should bring out the marble and illuminate the rooms clearly, rather than leaving them dim or relying only on decorative glow. Verify both rooms by day, by night and through the theme switch. |
| `0.4.24` | **Butterflies and character design.** Butterflies throughout the outdoor scene, including the desk meadow, flowers along the route and garden around the house. Add life to the landscape; species, colours, density and night treatment remain open for brainstorming. Design the person who walks from the desk to the house. Establish the character's silhouette, proportions, clothing, materials and level of detail before building the walking performance. Follow the existing story below: stylised, small in frame, not a detailed likeness; first seen walking away rather than seated at the desk. | Butterflies have recognizable wing shapes, convincing wingbeats and varied, light flight paths at a scale that fits the scene. Distribute them across the landscape rather than one isolated cluster, with no obvious synchronized motion or intersections with the house and props. Use the existing GL frame loop, respect reduced motion and verify the added cost against the project's frame-budget rules across viewport sizes. Agree on the character design and check its scale and readability beside the desk, along the path and at the house in both themes and viewport shapes. Plan joints and clothing for the later scroll-driven walk and pool sequence. Robe/towel details remain open. Walking animation, route integration and pool entry/swimming need their own agreed scope after the design; they are not complete merely because the character is designed. |
| `0.4.25` | **Responsive pool framing.** Pool framing on phones and shorter screens — exploratory. Improve how the pool and terrace fit the viewport during the approach and final contact hold. Brainstorm the treatment before implementation: camera distance/pitch and hold framing, responsive pool proportions, or a combination. | The pool reads clearly on phone portrait, phone landscape and short desktop viewports, with useful space for the future contact form. Preserve the continuous, reversible camera path. The specific camera or geometry changes remain undecided; this is a viewport/framing request, not a confirmed performance defect. |
| `0.4.26` | **The owner's review of `0.4.16`–`0.4.25`, and flicker from afar.** Shipped. The picture frames, the brass rails over the terrace glass and the bar's shelf lights flickered as the camera turned from the desk to the house: the frames' layers sat millimetres apart (the depth buffer can't separate them from 35 m and more), the rails' curve was thinner than a pixel, and the bar's light lit its own shelf's underside. The roof's sedum read as fungus: restyled flat as a paved roof deck. The marble's veins made more like real Calacatta. The mirrors see the outdoors past the windows, softly. Fireflies by night, flowers in the dining vase, a robe and towels by the pool. | No flicker on frames, rails or the bar's lights through the turn to the house, day or night. The roof reads as a crisp, built roof from the pool hold. Washroom marble reads as stone, not drawn lines. A mirror facing a window shows ground, trees and sky. Fireflies only by night, never sub-pixel sparkle. |
| `0.4.27` | **The interiors' design pass.** Shipped. From the design critique, the owner's four: lighting by room (each its own level and colour, the house lived in from the meadow, lamps on by day in the rooms in use), the table laid for two, the art varied by composition (a canvas, a pair, a tall print), the marble cut on purpose (veins along each slab, the island's waterfall, cladding set out from each room, bookmatches centred); and the details: the WC's slot window cut clear of its marble, walnut's pores along the grain. | From the meadow by night the rooms read at different levels and colours, a few dark. No fitting glows that's off. Each bookmatch's join on its vanity. No marble over glass. |
| `0.4.28` | **Lighting, every corner (agreed with the owner 2026-10-25; brief below).** Shipped. The owner: about 40% of the house looking premium is how it's lit; at 8/10, to 10/10. Built to the brief "Lighting brief (`0.4.28`)" under this table, reviewed all at once. | Every room and passage lit to the brief, by night and by day; renders of every space day and night, and the house from the meadow, for one review. |
| `0.4.31` | **Styling: the lived-in pass (agreed with the owner 2026-10-25).** From a room-by-room styling critique: small things a person left, in sets of three (tall, middle, flat), honed stone, open-pore walnut and brushed brass. By room. *Foyer:* a floating walnut shelf under the mirror with a turned-brass key tray; a stoneware umbrella stand by the door; coir matting set flush in a brass frame at the threshold. *Living:* fluted walnut slats floor to ceiling behind the TV, grazed by its slot light; the coffee table as one group of three (plain oversized books stacked a few degrees off each other with a ribbon marker, no brand names; a ribbed smoked-glass candle with its wax level and a dark wick; a shallow soapstone bowl of three small brass spheres, which replaces the ceramic bowl so the table holds one bowl, not two); the throw draped across the seat's corner with a fringe, not folded over the arm. *Dining:* brushed-brass napkin rings; a ribbed crystal water tumbler by each wine glass; an olive branch arching out of the roses. *Kitchen:* fluted walnut on the island's knee side against the marble ends; a turned walnut salt cellar with a brass spoon by the board; a champagne-bronze prep tap on the island; the lemons in the bowl kept. *Study:* a stitched saddle-leather blotter under the laptop and papers; a turned brass pen cup with two pens and a steel rule; an open linen-bound sketchbook with a ribbon. *WC:* champagne-bronze cross-handle taps from the marble; an amber apothecary soap bottle with a brass pump; a walnut basket of three rolled waffle hand towels. *Stair:* a 5 mm shadow gap where each tread meets the wall, cut as a dark recess into the wall (not a separate face a few mm off it, which would flicker from afar). *Landing:* a low limestone or charred-wood plinth by the bench with one small bronze sculpture. *Main bedroom:* a crystal carafe with its tumbler upturned on the neck and a small brass valet tray with a watch on the left nightstand; an open hardcover book face down on the right one; a waffle or ribbed weave on the runner at the bed's foot. *Closet:* an open drawer with a segmented dark-grey velvet tray for watches and jewellery; an angled shoe shelf at the base, leather dress shoes and plain sneakers on brass heel stops. *En-suite:* a slatted teak bridge across the tub with a rolled waffle washcloth, a sea sponge and a glass candle; three folded white bath sheets in an open cubby under the vanity. *Terrace:* a low stone drum table between the loungers with two chilled tumblers, lime wedges and condensation. *Bar:* real lemons (shaped, dimpled peel, a nub at each end, not spheres) in its bowl and the kitchen's; ice in the tumblers (a clear sphere or a 5 cm cube) catching the shelf light. *Dropped:* the pool's flush (knife-edge) overflow: the coping already sits near the deck's level, and the change would rebuild the water's edge for little that shows. | Every item built in 3D at the desk's quality, to scale, nothing within a centimetre of another surface except where cut into it, and nothing flickering from the meadow; the fine textures (the waffle, the wick, condensation) in the shaders, not as geometry. Renders of every room by day and night for one review. |
| `0.4.32` | **Full-quality loading and optimization.** Shipped. `KHR_parallel_shader_compile` integration compiles and links shaders on background driver threads. Heavy house compilation is deferred until approaching the desk or direct navigation, completely resolving the Vivo Y21 (PowerVR GE8320) WebGL context loss by night. Removed the 0.4.28 compare tool and all 30 `isLivedIn()` branches, consolidating the lived-in look. Mounted `<Analytics />` gated on `process.env.VERCEL`. Measured on M4 (`CHANGELOG.md`): day/night switch stalls eliminated (0 long tasks, 0.0 ms, 120.0 fps); desktop GL scroll long tasks reduced from 724 ms to 188 ms with worst frame cut from 274.9 ms to 108.3 ms; phone GL worst frame cut from 183.7 ms to 66.6 ms; all 31 devices pass on BrowserStack Automate. | Initial load and frame-time spikes measured before and after changes. Defer eligible scene-specific code/resources, spread geometry generation and GPU preparation into small scheduled tasks, and reuse prepared geometry/buffers instead of rebuilding them during scrolling. Priorities follow the visitor's position and direction, including fast scrolling and direct entry; retain prepared scenes for smooth reverse scrolling within measured memory limits. Check compression, cache behavior and repeat visits. Preserve the full intended geometry, material quality, grass variation and scene appearance: this release does not authorize reduced detail, lower-resolution rendering or adaptive quality cuts. Verify the complete forward/reverse journey on phones and desktop, with cold and warm caches, both themes and no newly introduced pop-in or stalls. |

#### Design and implementation suggestions

The owner welcomes suggestions alongside the requested fixes. The ideas below
are recommendations to explore, not settled visual decisions. Keep requested
outcomes separate from optional additions when finalising each release.

| Area | Suggested approach |
|---|---|
| Meadow (`0.4.16`) | Check world-space coverage, camera-facing placement and distance fades before increasing counts. Match the desk meadow's fullness and vary density in natural drifts rather than a uniform carpet; preserve the intended individual blade and flower detail. |
| Poolside (`0.4.17`) | Try a substantial tapered planter with a real rim and soil recess, then a small shielded uplight beside its base. Use a restrained brushed-gold finish for the rails, with believable corner joints and mounting hardware. Resolve pool/glass alignment before ornamental detailing. |
| Pool framing (`0.4.25`) | Start with aspect-aware camera distance and framing, keeping one consistent world and pool geometry if possible. Test the shortest viewport and portrait frame early, with a temporary contact-form layout to reserve reading space. Avoid abrupt camera changes at aspect breakpoints. |
| Roof and bar (`0.4.17`, `0.4.22`) | Explore a layered fascia, recessed timber soffit and subtle roof-surface seams, with discreet drainage details. For the bar, try a recessed counter with a restrained backlit shelf and concealed storage; confirm the roof overhang, bedroom opening and circulation before adding props. |
| Sockets and Home display (`0.4.22`) | Reuse a small family of socket/switch plates with aligned heights and a consistent finish. Try the Home display at a reachable wall position, showing a few legible lighting/room controls; start with a considered screen before deciding whether interactions add value. |
| Shelves, frames and dining (`0.4.20`) | Use a few distinct ceramic/sculptural pieces, grouped with books at varied heights, and leave purposeful empty space. Give frames real rebates and mounts. Try a rounded ceramic vase with a visible hollow neck, plus cutlery that follows the seat layout; plates, glassware and flowers are optional follow-ups. |
| Ropes, clothes and wardrobe (`0.4.19`, `0.4.21`) | Model a few convincing garment types and reuse them with controlled variation in pose and drape. Use thinner, flexible tiebacks with clear anchoring. For the wardrobe, explore walnut cabinetry, warm concealed strips and restrained metal fittings, with practical hanging/folded storage rather than dense filler. |
| Stairs (`0.4.17`) | Derive brackets and handrail from the same stair slope/path so their endpoints meet reliably. Recess each light beneath the tread nose and light the riser below, keeping the source shielded and avoiding blown-out strips. |
| Washrooms (`0.4.23`) | Explore bookmatched Italian marble at focal walls with calmer slabs elsewhere, so veining does not compete everywhere. Consider a floating vanity, the requested wide mirror with warm task lighting, a rain shower plus hand shower, a shower niche and discreet linear drain. Choose one coordinated metal finish and keep toilets clearly accessible. |
| Person (`0.4.24`) | Agree on front/side silhouettes and a small material palette before detailed modelling. Test the character at actual route distance, then establish stride length and foot contact before adding clothing motion or the robe/towel sequence. |
| Mirrors and glass (`0.4.18`) | Prototype a planar reflected view for one mirror first, with clipping at its plane; measure it before extending to all visible mirrors. Limit reflection work to visible mirrors, avoid recursive mirror rendering, and evaluate resolution against the sharpness bar. Also explore reducing the stacked green tints in `houseGlass.js`, keeping broad panes clear with a subtle edge tint; the owner raised the green cast, and this treatment is a suggested improvement. |
| Butterflies (`0.4.24`) | Use a few varied flight patterns with short flower visits and staggered wingbeats. Concentrate encounters near flower drifts while distributing them along the route; decide night behaviour separately. Share the existing frame clock and instance repeated geometry. |
| Trees (`0.4.16`) | Check branch tips against leaf placement and branch taper together. Add finer terminal twigs where visible, varying their lengths and directions. Preserve fine branch construction and check silhouettes as well as close-ups. |
| Doors and hardware (`0.4.18`) | Try restrained walnut or another agreed wood with subtle grain variation, realistic edge treatment and clean frame reveals. Build a small coordinated hardware family: lever handles with rosettes for room doors, suitable pulls for sliding doors, and bar/knob pulls for drawers and cabinets. Give metal rounded edges, readable highlights and mounting details; inspect the current banding before deciding whether it needs shader or geometry changes. |

**Pillow and cushion suggestion (`0.4.19`):** define each pillow in a local frame,
with fuller centres, compressed contact areas and softly rounded seams.
Arrange the rear pillows against the headboard, the front pillows supported
by them, and the accent cushion with a deliberate resting pose. Apply the
same approach to couch cushions, with slight compression at the seat and
backrest and varied, supported resting angles. Build the sofa throw's drape
around the arm's actual shape with fabric thickness and enough clearance;
verify whether the visible breakthrough is intersecting geometry or a depth
precision issue before fixing it. Check oblique views as well as straight on. Separate
camera perspective from actual geometry or transform errors when diagnosing
the reported shift; a still screenshot alone does not establish animation.

**Entrance planting suggestion (`0.4.16`):** try layered planting with
a few soft grasses, flowering stems and a trailing plant, leaving visible
soil between groups. Treat this as a candidate palette, not fixed species.
Give stems a clear origin in the soil and vary leaf angles, cluster sizes
and flower heights; avoid uniformly radial, spike-covered spheres.

**Landscape backdrop suggestion (`0.4.16`):** begin with gentle terrain
undulations behind the house, an irregular middle-distance grove of varied
tree heights, and a quieter distant ridge softened by atmospheric haze.
Use gaps and asymmetric clusters to frame the architecture, keeping foliage
clear of the roof silhouette and avoiding a solid wall of identical trees.
Compare this layered garden/woodland direction with a restrained courtyard
boundary if a more enclosed setting is preferred; neither is a fixed design
decision yet. Check camera sightlines before adding detail and measure the
completed backdrop against the existing render budget without reducing visual quality.

**Lighting brief (`0.4.28`)**, from the research (Sally Storey / John
Cullen Lighting: choose what not to light, no grid of downlights, see the
effect never the source, layers each dimmable, accents about 3× ambient,
art lit at 30°, vertical surfaces lit, door frames and reveals drawing the
eye on; archviz: rooms at different levels, warm against a blue sky, one
hero) and the owner's answers:

- **The night story:** an evening of hosting, about 8 pm: living, dining,
  kitchen and the terrace's bar alive and warm, the bedrooms softly on,
  nothing fully dark. **Contrast** balanced: clear pools and accents,
  never gloomy. **Colour** varied by room (as `0.4.27`). **Fittings**
  mostly hidden (coves, joinery, slots) with a few statements: a cascade
  of opal globes through the stair's void (both floors), one long
  brushed-brass linear pendant over the dining table, brass sconces with
  reading arms by the bed, a brass ring with an opal diffuser in the walk-in
  closet. Metalwork brushed brass. Strictly warm white; no colour light.
- **Ceilings:** floating ceilings (a dropped centre, a lit shadow gap round
  it) in the main rooms; downlights fewer, deep-set and baffled, each aimed
  at something (a table's centre, flowers, art, a door frame).
- **Stair:** a strip under every tread, step lights low in its wall every
  other tread, an LED line in the handrail. **Upstairs passage** (the stair's
  head, the way to the bedrooms and the guest room): a skirting glow, a
  picture light on its art, lit door frames to each room. **Lit reveals** at
  the key doorways (living to hall, bedroom to en-suite, the stair's head)
  and the big window reveals. **Night lights:** under both beds, the
  washrooms' toe-kicks, the kitchen's plinths, the passage's skirting.
- **Living:** the bookcase lit compartment by compartment, a slot grazing
  the TV wall, an uplight into the fig, a pair of table lamps, the reading
  lamp. **Dining:** the linear pendant, a light on the canvas. **Kitchen:**
  mood, its cooking done (pendants and under-cabinet low, plinth glow).
  **Study:** library mood (the bookcase lit, a reading lamp by the chair,
  the desk lamp off). **Foyer:** the front door's timber panel washed, its
  mirror backlit, the door frame uplit.
- **Main bedroom:** the brass sconces, the headboard's wash and a picture
  light over the print that lights the pillows too, a floor lamp by the
  lounge chair, the dresser's mirror backlit. **Walk-in closet:** a warm
  dressing room (2700–3000 K): light down every bay's sides, over each
  rail, under the shelves, the brass ring in the middle. **Guest room:** a
  guest in, winding down (its bedside lamp and the glow under its bed).
- **Washrooms:** a ceiling slot grazing the bookmatched walls, vertical
  light either side of each mirror as well as the backlight, a soft cove
  over the bath, the shower's niche and a low wash over its floor.
- **Outside:** the interior's glow the hero, a step down from it: the
  stone base grazed, the timber washed, the soffit's light along the
  cantilever; moonlighting from the trees (dappled on the lawn and path),
  step lights in the entrance stairs and the deck's steps; the olive's
  uplight kept, the other plant uplights dropped. **Terrace:** the bar as
  `0.4.27`, a glow along the deck's step edges and the pool's coping, low
  lights by the loungers, a line at the foot of the glass balustrade.
  **Pool** cool aqua (as now). **Roof:** a faint line under the parapet's
  coping.
- **By day:** the statement pieces on low, the washrooms' mirrors and
  grazing, the coves softly on.
- **The switch:** the evening scene comes on in order (coves and lamps,
  then accents, then the facade and the garden), staggered across the
  switch on its clock.
- **Budget:** quality first; the final `0.4` release (optimisation) makes
  it fit 120 fps. Per-room light lists from the start, so each pixel only
  weighs its own room's lights.

**Loading and preparation suggestions (`0.4.32`):** distinguish network
loading from CPU geometry generation, shader compilation and GPU uploads;
profile each before choosing changes. Make the opening scene usable first,
then prepare upcoming sections with enough lead time for fast scrolling.
Schedule preparation within the existing render architecture, without a second
animation loop, and avoid moving one large stall to the moment a scene enters
view. Cache unchanged resources and avoid unnecessary per-frame allocations
or UI updates. Scene readiness must also handle direct entry and reversing
direction; measure retained memory rather than keeping unlimited duplicates.
Sharing geometry or instancing is optional only where it preserves the intended
individual variation: grass blades can retain distinct positions, orientations,
heights, bends, colours and wind phases. Do not substitute identical parallel
blades or simplify the artwork to achieve a performance result. Record the
baseline, applied changes and measured gains; do not promise speedups before
profiling. This release stays last in the current batch at the owner's request,
so its tuning includes the completed visual and scene changes.

**Future plans from the owner's review (2026-10-25):** not yet scheduled.
The walk-in wardrobe and the entrance's clothes dressed in the owner's real
wardrobe (the owner will send the garments). A redesign of the terrace's bar.
The walker redesigned together with the owner (the `0.4.24` design is a
placeholder; not to be redone alone). The contact form over the pool, in a
later version. From afar the house's finest details (the deck's screws, a few
millimetres) are filtered out by pixel size, by design: what should make the
deck read from the path is board-scale detail (each board's tone, the gaps,
weathering), a candidate for a later pass.

**Release sequencing:** complete landscape and planting together, then the
roof, pool boundaries, gold rails and stair connections as one exterior pass.
Fix shared doors/hardware and mirror rendering before final room finishes.
Group fabric corrections, decorative styling, and garment/wardrobe work into
coherent packages. Within `0.4.21`, establish the garment shapes before finishing
the wardrobe; within the house, complete mirrors before final washroom lighting.
The mini-bar, sockets and Home display share a lived-in-home release. Finish
scenery and character design before final phone/short-screen pool framing
(`0.4.25`). All detailed checks above remain part of their grouped release.

**Optimization is the final `0.4` release** (the owner, 2026-10-25: after the lighting, the walk and the contact form, since everything before it is what it optimises). (Renumbered from `0.4.26`, which took the owner's review of the batch, then from `0.4.27`, which took the interiors' design pass, and `0.4.28` the lighting.) Apply progressive loading,
preparation, caching and reuse to the completed batch, preserving full visual
quality. Continue normal correctness and performance checks as each feature
lands; this catches regressions without moving the dedicated optimization pass
forward. If more fixes enter this batch, keep optimization after them and
renumber it as needed. Future fixes may still require follow-up measurement;
one optimization pass cannot guarantee performance for changes made afterward.

The scroll-driven walk and pool entry/swim still need explicit implementation
scopes after the character design; `0.4.24` does not claim to deliver those
performances. Keep that existing story work visible when planning the next batch.

### The camera path, continued

It uses the same YZ plane and the same conventions as "The camera path"
above: the mountains are at −Z and the camera never rolls.

```
                        ④ pool (balcony), top view   arc 4: faces inward,
                              ^                      pitches down onto the pool
                             /
   mountains       [cam 3] ─╯ ...arc 3 ... [cam 4] ──> house on the hill
   (−Z)          laptop hold    faces outward,   faces +Z: 180° from the
                                turns 180°       start of the descent
```

- **Arc 3 (the bottom-right quarter).** From the desk the camera rises to
  look straight down at it and turns **180°** only while looking down (the
  owner, `0.4.11`: the ground turns under it, so the meadow's sides never
  sweep past), then tilts up to the house along the path. It ends facing +Z, away from
  the mountains, toward **the house on the hill**, which faces the hills
  and so looks straight back at the camera. The world is one place: a house
  looking out over its meadow at the mountains, with the desk in the garden
  between them.
- **Arc 4 (the top-left quarter).** The camera turns inward and pans up and
  over, onto **the pool on the house's balcony**, and ends looking straight
  down at it. That top view is the contact hold.
- The rules of the descent carry on: one spline, holds at the ends, the
  camera a pure function of scroll, the scene's day or night and sky palette
  all the way. With the camera facing +Z the mountains are behind it, so the
  sky over the house is the far side of the same sky.
- **Arc 3 starts looking down at the desk** (user decision, 2026-09-30).
  `0.3` ends at cam 3, facing the laptop's screen (−Z), so `0.4` first
  rises back to a top-down view of the desk: the chair pushed back, where
  the person sat (below). Only then does it sweep round. Tune the rise with
  the `0.3` camera prototype.

### The story: the person walks up to the pool

- **During arc 3** the person from the desk is seen from a distance walking
  up the path to the house, putting on a robe on the way (or carrying a
  towel: the details are open). **During arc 4** they reach the balcony. By
  the time the pool's top view opens, they're stepping in, or almost in.
- **The walk is scrubbed by scroll,** like the camera. Their place on the
  path is a pure function of progress, so scrolling back walks them back.
  They turn to face the way they're moving, so they never walk backwards.
- **Once the pool hold is reached, time takes over.** The entry plays out
  (the robe dropped, into the water), and then the swim runs on its own
  clock.
- **The person is at the desk only by implication** (user decision,
  2026-09-30). The desk holds and the top-down shot that opens arc 3 look at
  an empty chair, pushed back, perhaps with a mug still steaming, so the
  visitor pictures who just sat there. The first time the person appears is
  walking away as arc 3 sweeps round. Showing them seated would put a
  character in every `0.3` shot.
- **Deliberately not a likeness.** The swimmer stands for the user, but
  stays stylised, small in the frame and without a detailed face. PRODUCT.md's
  evidence rules still apply to any text around them.

### The pool

- **Water:** a GPU height-field simulation (the classic WebGL water
  technique), around 256² cells. The pool floor is refracted through the
  surface, with caustics on the tiles, all seen from above. It runs in the
  same WebGL2 context, only while the pool is on screen.
- **Mouse and touch make ripples.** Each pointer move drops a small splash
  into the height field; the ripples spread, bounce off the walls and fade.
  The swimmer disturbs the same water.
- **The swimmer is alive, at random.** A small set of moods (laps, a lazy
  float, treading water, resting at the wall, the odd dive), each for a
  random time at a random pace, as with the desk's effects. No fixed
  schedule and no visible loop. Some play with the visitor is welcome: they
  notice the cursor, drift over, or dive away from a lot of splashing.
- **The sky carries over:** the water reflects the scene's palette (warm at
  dusk, moonlit at night, perhaps with underwater pool lights at night), and
  the day/night toggle still works here.
- **The contact form stays plain HTML over the scene,** keyboard- and
  screen-reader-friendly. The pool is the backdrop, never the interface.
  Form consent and the privacy route come from "Trust, privacy and
  accessibility".

### Assets and cost

- **The house** is built in code in 3D, like the desk (the owner,
  2026-10-24: not a painted silhouette), with windows lit at night. The
  camera comes close enough over the balcony that it must hold up.
- **The character** is the one heavy asset: a low-poly, rigged, stylised
  figure with a walk, a robe, the entry into the water and the swim moods.
  Mixamo (free rigs and animations) and Spline or Blender for the look,
  exported as glTF. The renderer gains GPU skinning in the vertex shader (a
  few KB of our own code). Budget about 1–2 MB for the character and its
  animations, loaded while the desk is on screen.
- **The pool** is mostly code (the simulation, refraction, caustics) plus
  tile textures, so it's small.
- **Reduced motion:** the camera moves as it does elsewhere (reduced), the
  person is placed along the path with no walk cycle, and the water is
  still, with the swimmer resting. Pointer ripples are off.
- **The layered fallback:** stills for the house and the path, with the
  person placed as a sprite, and the pool as a painted layer with slow CSS
  caustics. No simulation and no pointer ripples. Parity compares the
  renderers with the water and the swimmer frozen.

## Later — cues to scroll and to touch the sun

**Status:** agreed 2026-10-01 (user): built with the content (`0.7.x`),
after the whole scroll exists. Raised by the 2026-10-01 audit.

Today nothing on screen says the page scrolls or that the sun and moon can
be clicked: a pointer cursor on hover and the screen-reader label are the
only cues, and touch gets none. The direction brief asks for "one quiet
scroll affordance" in the first viewport.

- **Ideas floated, not decided:** a hairline drawing down at the foot of the
  frame (with a small mono "scroll" label) that appears once the scene has
  settled and fades for good on the first scroll; a faint ring of light that
  swells around the body on hover, breathing once on touch devices.
- **Keep:** the first three seconds belong to the scene, nothing loops,
  reduced motion gets a still version, and both renderers draw the same
  frames so parity holds.

## Later — a secret on the sticky notes

**Status:** an idea, recorded 2026-10-14 (the owner). Not scheduled.

A hidden easter egg on the sticky notes on the desk (`0.3.12`): one note
reads **"If you are reading this, visit another website"**, written by hand
like the notebook's. It stays a secret, so nothing points to it, and only a
visitor who looks closely finds it. Exactly where it sits and how it's found
are still open: the torn-off note, under the pad's top sheet, or legible
only from up close.

## Later — the mountains in stylised 3D

**Status:** agreed 2026-10-23 (the owner), after the home-page critique.
Not scheduled.

The descent is drawn in two styles. The mountains are flat painted mist,
while the meadow, the trees and the desk (`0.3.1`–`0.3.12`) are stylised 3D,
and the handover shows most around `desk` 0.025, where the violet ridges
with their drawn crests give way to a 3D meadow. The owner's call is to
bring the mountains over to the stylised 3D look, so the whole descent
reads as one world. This replaces "the mountains can stay 2D" in
"Rendering" above.

- **Prior attempt:** a sideways drift with per-ridge parallax, slope-lit
  faces and a wider tonal spread across the ridges was built on 2026-10-14
  and reverted at the owner's request. It only dressed up the 2D ridges,
  which is why the look still split.
- **Keep:** the opening frame (the `0.1` atmosphere, its two recipes, the
  sun setting into the ridges and the crest light), the ridges' breathing,
  the day/night switch with no cut, the camera as a pure function of
  scroll, the frame budget and sharpness on every display, and parity with
  the layered fallback, or a decision about what the fallback draws.
- **Still open:** real geometry (a heightfield or meshes) versus shading
  the current ridges as 3D, how far the look changes at scroll 0, and which
  release takes it.

## Later — a notice for the fallback renderer

**Status:** agreed in discussion 2026-09-24. Built after the content
layers, but **required before `1.0.0`** (user, 2026-09-30; it's on the
"Before 1.0.0" list).

A small note in a bottom corner telling visitors on the layered fallback that
they're seeing the lighter renderer. The fallback matches WebGL at rest, but
the ridges don't breathe or reshape, and the desk shows as stills.

- **Only for a lasting fallback:** no WebGL2, a shader that failed to build,
  or all 3 lost-context retries used. Never during a lost-context recovery,
  or it would flash for 2 seconds.
- **A fact, told kindly, with a light touch.** Playful is welcome
  (user, 2026-09-30): for example "You're seeing the hand-painted version:
  the mountains are holding still for you." The fact still has to come
  through: this is the lighter renderer, and why. Never "error", "upgrade"
  or "your browser is outdated". Many of these visitors turned WebGL off on purpose (Safari
  Lockdown Mode, Tor, Firefox `resistFingerprinting`, some Brave settings).
- **Dismissible and remembered** (`localStorage`, wrapped in try/catch).
  Shown at most once per session. It lives in `AtmosphereField`, which
  persists across routes. It fades in shortly after the scene paints and
  fades out by itself after about 8s.
- Small JetBrains Mono label on a palette-tinted scrim, like `ErrorScreen`,
  following day/night, with a z-index above the scene.
- Bottom-left: the moon rises on the right and the sun's target moves.
  Recheck against the content sections and the `0.6.x` header when it's
  built.
- `role="status"`, a real close button, no motion under reduced motion, and
  a Playwright check via `?renderer=layers`.

## Reference — objects on the terrain (shan-shui-inf)

**Status:** a reference, noted 2026-10-01 (user). Not planned; brought in
only if a layer needs it.

[shan-shui-inf](https://github.com/LingDong-/shan-shui-inf) (LingDong) is a
procedural, infinitely scrolling Chinese ink landscape in SVG. Its ranges
are close cousins of ours, but what the user liked is what sits *on* them:
trees, pavilions, bridges, boats and small figures, each generated from a
few strokes and placed along the ridge lines.

- **Where it could help:** the meadow at the end of `0.2`, the walk to the
  desk in `0.3`, or the house and the pool in `0.4`, if the terrain wants
  life beyond ridges and grass.
- **Take the idea, not the look.** Its ink-wash brush style isn't ours. Any
  objects would be drawn in the scene's palette and light (`sceneAt`), in
  both renderers, and stay within parity and the frame budget.
- **Licence:** check the repo's LICENSE before borrowing any code.

## Reference — images from shapes (primitive)

**Status:** a reference, noted 2026-10-01 (user). No plans yet.

[primitive](https://github.com/fogleman/primitive) (Michael Fogleman)
rebuilds an image from geometric shapes: triangles, rectangles, ellipses
or curves, one at a time, each placed by hill climbing to cut the error
most. A few dozen shapes give a soft abstract likeness; a few hundred, a
recognisable one. It runs as a Go command-line tool, so output can be
pre-rendered to SVG rather than computed in the browser.

- **Where it could help:** not decided. Possible fits: project thumbnails on
  the desk screen (`0.5`), a portrait for the about-me layer, or placeholder
  images that resolve shape by shape as they load.
- **Same rules as anything else in the scene:** the palette and light come
  from `sceneAt`, and it stays inside parity and the frame budget.
- **Licence:** check the repo's LICENSE before borrowing any code.
