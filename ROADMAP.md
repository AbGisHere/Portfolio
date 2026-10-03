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
| `0.3.x` | Current line: `0.3.0` the camera, `0.3.1` the meadow and grass, `0.3.2` boot prints, `0.3.3` the mountains' foot. Projects: the descent proper (both arcs of the S), from where `0.2` leaves the camera onto a desk in a meadow, where a laptop (a tablet on portrait viewports) opens onto the projects. |
| `0.4.x` | Contact / reach out: the camera turns from the desk to a house on the hill and comes down over its balcony pool, where the contact form sits (see "0.4 — contact: the house and the pool"). |
| `0.5.x` | A header on top of the site to navigate between the sections. |
| `0.6.x` | Populating the site with the real content. |
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

- [ ] **Analytics: who visits** (on hold; the user picks the provider). It
      lands with the privacy policy in `0.4`. The candidates are Vercel Web
      Analytics (cookieless, already on Vercel, free Hobby tier: views,
      referrers, country, device and UTM tags), Umami or Plausible (also
      cookieless), or GA4 (sets cookies, so it needs the consent banner below
      and undercounts visitors who decline). Aggregates only: no provider
      names individual visitors. To tell recruiters apart, share
      UTM-tagged links (`?utm_source=linkedin`), and use the contact form.
- [ ] **Privacy policy** (`0.4`): a `/privacy` route, in the sitemap. Nothing
      links to it until the `0.5` header or a footer. It covers the host
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
- [ ] **Keyboard navigation** (`0.3`, `0.5`). Today the sun is a real button
      with a visible focus ring, and scrolling works with the keyboard.
      `0.3`: project cards are focusable, and an opened project's iframe can
      be left with the keyboard. `0.5`: a skip link, a logical tab order
      through the header, and visible focus everywhere.
- [ ] **Colour contrast** (`0.6`, and every derived surface). Text meets WCAG
      AA (4.5:1, or 3:1 for large text and UI such as focus rings) over the
      moving scene, in both themes and at every scroll position, using
      scrims where the sky is too bright. Check the error screens with every
      version line.
- [ ] **Alt text** (`0.3`, `0.6`). Project images and screenshots get
      meaningful `alt`. Decorative ones use `alt=""`. `npm run hygiene`
      checks every `<img>` has one.
- [ ] **Third-party audit** (every version line). Today's runtime
      dependencies are `next`, `react`, `react-dom` and `lenis` (`gsap` was
      removed in `0.2.8`). `0.3`'s project iframes load third-party pages, so
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
  real content (`0.6.x`).
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
| `0.3.4` | Flowers and trees in the grass (the owner, 2026-10-03). |
| `0.3.5` | The desk: the first model, with day and night lightmaps. |
| `0.3.6` | The laptop (the tablet on portrait) and the lid opening. |
| `0.3.7`+ | The lamp (the theme toggle), the stationery and accessories, then the device screen. |

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

**The laptop** is MacBook Pro–like: silver by day, space black by night.
- No Apple logo, and don't call it "MacBook" anywhere on the page. Both are
  trademarks. Check any sourced model for logos.
- The closed lid is what the top-down shot looks at. The AbG mark could go
  there (proposed, not confirmed).
- **The lid opens from 15% to 90% of arc 2,** finishing at about 105–110°. It
  leads the camera slightly, so the screen faces the camera before the camera
  gets low. Otherwise mid-arc you'd be looking at a half-open edge.

**Theming: swapped versus relit.**
- **Swapped per theme:** the laptop's and tablet's finish (silver or space
  black), and at most one or two
  accessories. Switching theme with the laptop on screen dissolves its
  material over the switch's `ms`, so it reads as part of the scene turning,
  not a swap.
- **Relit per theme:** the grass, the wood and everything else. They take
  their light from the sky palette, like the ridges do: warm sun at dusk,
  cool moonlight and the lamp's pool of light at night.

**The lamp is a real table lamp,** and a hook for a later about-me layer.
What that layer is hasn't been decided.

**The lamp is a theme toggle.** Lamp on means night, lamp off means day.
It's the sun toggle's counterpart at the other end of the page.
- It's a real `<button>` over the lamp, like `SunToggle`: keyboard-focusable,
  labelled ("Switch to night"), and `data-busy` for the length of a switch.
- Its hit target is projected from the 3D lamp to the screen every frame,
  using the same camera maths as the drawing, so it can't drift off the lamp.
- It's active only at the holds (the top-down and final shots). Mid-descent
  it moves too fast to click.
- The hint is a cursor change and a faint glow on hover, nothing more.
- At the final shot the sky is visible behind the laptop, so a click plays
  the whole sky turn in the background.

**Portrait viewports get a tablet.** A 16:10 laptop screen in a portrait
viewport leaves the project tiles tiny. [2026-09-24: user's idea, proposed.]
An iPad-like tablet sits on the desk for everyone, as one of the
accessories, and on portrait viewports the spline's last stretch aims at the
tablet instead of the laptop: the same scene and path, a different end point.
- **Why a tablet, not a phone:** a portrait tablet screen is about 3:4. It
  matches portrait tablets exactly, and on a phone (about 9:19.5) it still
  fills the width and leaves room above and below for the desk around it.
  At a 390 px-wide phone, a width-fitted tablet screen is about 520 px tall,
  against about 245 px for the laptop's. It also gives the tiles more width
  than a phone screen would, and one layout covers phones and portrait
  tablets.
- **Its finish follows the theme, like the laptop's.** [2026-09-24: user
  decision.] Landscape viewports see a silver laptop by day and a space
  black one by night. Portrait viewports (phones and tablets) see a silver
  tablet by day and a space black one by night. Both dissolve their material
  over a switch.
- **It needs a stand.** Lying flat, it would face the ceiling, not the final
  camera. A folio stand or a desk stand props it toward the camera.
- **The same trademark rule as the laptop:** no Apple logo, and don't call it
  "iPad" on the page.
- A phone can still lie on the desk as a prop, but no path ends at it.
- Pick the device by viewport shape, not device detection: portrait gets the
  tablet, and landscape (tablets in landscape included) gets the laptop.
  Rebuild the path when the shape changes (`ScrollTrigger.matchMedia` /
  `refresh`) so rotating mid-scroll works.

### Rendering

The mountains are effectively at infinity, so they can stay 2D. The desk
can't be faked: a hinge opening while the camera orbits from above to the
front needs real geometry.

- **Sky, mountains and ground: extend the current shader.** Per-ridge depth
  and the camera's pitch and height give the ridges' offsets and scale. The
  ground is a per-pixel ray–plane intersection, the far meadow; near the
  desk, instanced 3D grass blades stand on it (see "0.3 — the desk"). The ridges' mist band at their
  feet (`stops[1]`) hides the seam between mountains and ground.
- **Desk objects: a mesh pass in the same WebGL2 context.** The scene is
  simple for 3D: only the camera and the lid hinge move, so the lighting can
  be baked.
  - Bake two lightmaps offline (Blender): day, and night with the lamp's pool
    of light. Theming blends between them on the switch clock, which is the
    relighting above at almost no runtime cost.
  - Shading is texture × lightmap. No runtime shadows or PBR.
  - A build-time script converts the glTF models into a small binary format
    of our own (positions, UVs, indices), so no loader ships. Expect roughly
    10–20 KB of our own code.
  - One context and one canvas, driven by one camera: no sync issues between
    the mountains and the desk.
  - If writing the mesh pass ourselves proves a pain, the fallback option is
    **OGL** (about 25–30 KB gzipped: meshes, cameras, a glTF loader).
    **three.js is ruled out on weight** (about 150–180 KB gzipped with its
    loader), and a full three.js scene would also discard both renderers and
    the parity setup.
- **Assets:** low-poly models with baked detail (only the laptop gets close),
  KTX2 textures, meshopt-compressed geometry, and one lightmap resolution per
  device class. Budget: under about 1–1.5 MB for the whole desk scene.
- **The layered fallback** follows the mountains' part as layer transforms,
  and shows the desk as stills with a crossfade.
- **Parity:** `?scroll=` pins the progress, and `npm run parity` compares
  the renderers at the top, middle and end of the `0.2` stretch
  (`--scrolls`). Extend both to the `0.3` stretch.

### Authoring in Spline, and a desk that's alive

[2026-09-30: user decision.] **The desk objects are modelled in
[Spline](https://spline.design).** It's the design tool, not the runtime:
Spline's own embed would be a second WebGL engine (several hundred KB, its
own camera and light, no fallback, scene files from its servers), so it's
ruled out on the same grounds as three.js. The user models and dresses the
scene in Spline. It exports glTF, which the mesh pass above draws in our
own context, under our camera and light.

**Handover from Spline:**
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
| **Lamp flicker** | Night only (the lamp is on). The light is mostly steady, with an occasional stutter: a few fast dips in the lamp's lightmap weight. The pool on the desk flickers with the bulb, since it's the same light. |
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
3. **The desk, in the background:**
   - Fetch models and textures at low network priority, nearest-needed first:
     the table and laptop, then the lamp, then the stationery.
   - Load a low-resolution lightmap first and swap in the sharp one later.
   - Decode textures off the main thread, in a worker.
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
  detail and the lightmap size before anything visibly stutters. Tiers: the
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

**Status:** recorded 2026-09-23, for the `0.3.x` line. The path to the
device is "The descent" above.

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
- The tablet's details: its stand, and where it sits on the desk (see
  "Portrait viewports get a tablet").
- The AbG mark on the lid, and where the about text sits in `0.2`.
- The form of the project tiles (play-cards, widgets, icons) and the
  background they sit on.
- Where the resume and dev log live relative to the device. Contact comes
  after the desk, at the pool (`0.4`).

### First steps, when it's picked up

1. **Prototype the camera** with the mountains and the ground plane only, and
   a grey box for the table, to validate the spline and the holds before any
   models exist.
2. List every project with its deployed URL and check its response headers
   for embeddability. This sizes how many projects need changes.
3. Source or model the desk assets, bake the day and night lightmaps, and
   check them against the asset budget.

## 0.4 — contact: the house and the pool

**Status:** idea, 2026-09-30 (user). Not started; `0.3` comes first. The
camera carries on from the desk, turns round to a house on the hill that
looks out at the mountains, and comes down over a pool on its balcony. The
person from the desk walks up to the house as the camera turns, and is
stepping into the water when the pool comes into view. The contact form
sits over the pool.

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

- **Arc 3 (the bottom-right quarter).** From the desk the camera sweeps
  round, facing outward, and turns **180°**. It ends facing +Z, away from
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

- **The house** is only ever seen from a distance, facing the camera. It can
  be painted like the ridges (a lit silhouette, with windows lit at night)
  rather than modelled, which is nearly free.
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

**Status:** agreed 2026-10-01 (user): built with the content, around `0.4`,
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
  Recheck against the content sections and the `0.5.x` header when it's
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
  the desk screen (`0.3`), a portrait for the about-me layer, or placeholder
  images that resolve shape by shape as they load.
- **Same rules as anything else in the scene:** the palette and light come
  from `sceneAt`, and it stays inside parity and the frame budget.
- **Licence:** check the repo's LICENSE before borrowing any code.
