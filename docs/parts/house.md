# The house

The house on the hill behind the desk (`0.4`, ROADMAP.md "0.4 — contact:
the house and the pool"). It's built in code, room by room, in
`components/gradient/gl/houseShape.js` (sizes, places, lights),
`houseMesh.js` (the mesh), `plantMesh.js` (its plants), `houseShader.js`
(its surfaces), `houseShadow.js` (the sun's shadow map) and
`houseGlass.js` (the glass and the water). `/house` (dev only) flies a
free camera through it.

Coordinates are metres from the desk's centre: x across, y up, z toward
the mountains. The house faces +z, back across the meadow at the desk.

## Ground floor (floor at 3.6 m, ceiling 6.85 m)

Interior: x −7.72 … 7.72, z −78.72 … −63.28.

```
 z −63.28 ─────────────────── glass ─────────────────────┬── timber ──┐
          │                                  │           │  FOYER     │
          │  LIVING                          │  DINING   │  front door│
          │  sofa, chairs, TV wall, fire     │  table 8  │            │
          │                                  │           ├── door ────┤
          │                                  │           │  WC        │
 z −71.5  ├────────┬─────────────── open ────┴───────────┼────────────┤
          │ STAIR  │  STUDY                  │  KITCHEN              │
          │ up ↑   │  desk, shelves          │  island, counters,    │
          │        │  glass door             │  pantry wall          │
 z −78.72 └────────┴─────────────────────────┴───────────────────────┘
          x −7.72  −5.4                     1.6                   7.72
```

- **Living** (x −7.72 … 0.5, z −63.28 … −71.5): the sofa facing the glass,
  two lounge chairs, a coffee table, a rug, the TV on the left wall over a
  console, a floor lamp, the fig by the glass.
- **Dining** (x 0.5 … 4.6): a table for eight under a pendant, laid for two
  (`0.4.27`: across its end toward the garden, their chairs pushed back and
  turned, a glass of red each, `wineGlass()`), a large painting on canvas
  over it.
- **Foyer** (x 4.6 … 7.72, z −63.28 … −67.5): the front door in the timber
  panel, a bench, a mirror, a walnut hook rail with two coats on hangers
  and a scarf over the middle hook (`0.4.21`).
- **Marble** (`0.4.26`): Calacatta, its veins the level lines of a
  folded, domain-warped field (they meander, fork and rejoin, down one
  diagonal): bold main veins of uneven width with a soft grey halo, broken
  in places and touched with gold, finer veins between, hairline threads,
  each drawn to its pixel's share. (`0.4.27`) A piece cut from one slab
  (variant under `.25`) has its veins along its length (`slabCut()`: `.0`
  along x, `.1` along z); the island's (`.2`) folds over its waterfall
  ends, cut from the same slab. Cladding is set out as a mason would: the
  floor's squares centred on the room, the walls' slabs floor to ceiling
  (no join across them), one centred on the room's middle, and each
  bookmatch's join on what it's behind (`MATCH_AXES`, variants `.62`
  the WC's vanity, `.64` the en-suite's, `.66` the shower's rain head).
- **WC** (x 4.6 … 7.72, z −67.5 … −71.5): Italian marble on every wall and
  the floor (`washrooms.js`, `0.4.23`), a wall-hung toilet on its marble
  ledge, a floating vanity under a 3 : 1 mirror lit from behind, centred
  under the slot window high in its side wall (`0.4.27`: the marble is cut
  round the slot; it ran over its glass); its door off the foyer.
- **Kitchen** (x 1.6 … 7.72, z −71.5 … −78.72): counters along the back
  with a sink and the hob's extractor, tall cupboards and the fridge along
  the side, an island with stools and pendants.
- **Study** (x −5.4 … 1.6, z −73 … −78.72): a desk at the wall, a chair,
  shelves; a glass door.
- **Stair** (x −7.6 … −5.6): floating walnut treads up the left wall from
  z −72 to −76.8, 18 risers of 0.2 m, an opal LED under every nosing;
  frameless glass up the open side under a brushed-brass rail laid through
  its posts' tops (`0.4.17`), a black steel rail on the wall.

## Upper floor (floor at 7.2 m, ceiling 10.45 m)

Interior: x −7.72 … 7.72, z −78.72 … −71.28; the terrace in front.

```
 z −71.28 ───────── glass ─────────────────┬──── timber ───────┐
          │  LANDING  │  MAIN BEDROOM       │  EN-SUITE         │
          │  stair ↓  │  bed, chairs,       │  tub, shower,     │
          │  void     │  dresser            │  basins           │
 z −75.5  │           │                     ├───────────────────┤
          │           ├──────── door ───────┤  GUEST BEDROOM    │
          │           │  WARDROBE (walk-in) │  bed, desk        │
 z −78.72 └───────────┴─────────────────────┴───────────────────┘
          x −7.72   −4.5                    2.6                7.72
```

- **Landing** (x −7.72 … −4.5): the stair's top, a glass balustrade round
  its void capped in brass, a bench on the bedroom's wall facing it.
- **Main bedroom** (x −4.5 … 2.6, z −71.28 … −76.5): the bed facing the
  glass and the terrace, bedside tables and lamps, an armchair, a dresser.
- **Wardrobe** (x −4.5 … 2.6, z −76.5 … −78.72): a walk-in, a run of
  walnut cabinetry along the back wall (`wardrobeRun`, `0.4.21`): bays of
  long hanging, double hanging and shelves over drawers, brass rails, a
  light strip under each shelf over a rail; garments of every kind on
  hangers and folded knitwear (`garments.js`).
- **En-suite** (x 2.6 … 7.72, z −71.28 … −75.5): marble throughout, the
  vanity's wall bookmatched (`0.4.23`); a double vanity on the door's wall
  under a 3 : 1 mirror, a freestanding tub by the front wall, a toilet on
  its ledge, and a walk-in shower in the far corner (a wet wall with a lit
  niche, a rain head flush in the ceiling, a hand shower on a slide rail,
  a linear drain, glass on two sides); a slot window at the side. Both
  washrooms keep their lights partly on by day. (`0.4.27`) Its double
  vanity centred on its bookmatch.
- **Guest bedroom** (x 2.6 … 7.72, z −75.5 … −78.72): a bed, a desk.

Partitions are 12 cm, plaster both sides, 3.25 m to the ceiling; doors
0.9 × 2.2 m in walnut, on frames, each open at its own angle, its grain
running up the leaf (walnut variant `.6`, as on tall cabinet doors), a
brass lever on a rose each side (`lever()` in `meshKit.js`).

## Glass, curtains and finish

- **Sliding glass** (`sliders()`): each front is panels on two tracks.
  One stands open on each floor, in the middle: the ground floor's third
  panel slid over the second (open x −1.0 … 1.6), the upper floor's middle
  panel over the first (open in the bedroom, x −3.2 … −0.7).
- **Curtains** (`curtainMesh()`): linen on ceiling tracks before the front
  glass, two shapes in one buffer, morphed by the switch (`uMorph`). By day
  each is tied back at its end by a slim braided jute cord wrapped snug
  round its gathered waist from the hook, a small tassel at the knot
  (`0.4.19`; a thick rope ring before); by night it's
  untied, hanging straight from the head in a stack of folds at the same
  end (none close).
- **No coplanar skins:** surfaces under a few millimetres apart flicker
  from the garden, so things are built as they're made. Cabinet and drawer
  fronts are 19 mm doors 2 mm off their carcasses (`DOOR`, `HINGE` in
  `furniture.js`); pictures (`0.4.20`) are a stepped walnut moulding (a
  raised lip, two steps down), a brass slip, a mount with a bevel-cut
  window and the print in it, each print one of five kinds of picture
  under a glass sheen (`0.4.27`, by variant: soft colour fields, stacked
  fields, ridges into the haze under a low sun, a survey's contours, a
  disc over a horizon; its coordinates and its shape folded into st by
  `artCoords()`); a large painting on canvas (`canvas()`) in a black float
  frame over the dining table, a pair of small contour maps in the study,
  a tall disc print on the landing, a long ridge print over the bed (`0.4.26`: no back board, the print only in the window, the
  mount and print solid back to the wall and the bevel a slope between
  them, so no two faces in a picture lie within a centimetre: from the
  desk they flickered through each other); a mirror's glass and the TV's
  sit in their frames' rebates; frames clear their openings by 2 mm.
- **Seen from afar** (`0.4.26`, `houseShader.js`): where a surface's
  normal turns within a pixel (a brass rail, a slip, seen from the desk)
  its highlight is widened by that turn and its normal bent toward the
  eye, so it's lit as its average rather than flashing pixel by pixel; a
  strip of light (`P.lamp` variant `.5`) thinner than a pixel gives only
  its share of it. Strips are set into the shelves they light, and a
  strip lights nothing behind the face it shines from. Details of a few
  millimetres (the deck's screws, the marble's hairlines) fade out by
  pixel size; they show only up close (`/house`).
- **Soft things rest where they're held** (`0.4.19`): each pillow and
  cushion stands with its foot on what's under it and leans back
  (tilt π/2 + its lean) against what's behind it: the bed's euros on the
  panel, the sleeping pillows on them, the accent cushion on those; the
  sofa's and the lounge chair's scatter cushions on the seat, against the
  back. The sofa's throw follows the arm's section with a centimetre's
  clearance, two faces 8 mm apart, its hems rolled.
- **Lighting** (`0.4.28`, the brief in `ROADMAP.md`): an evening of
  hosting, balanced, the light mostly hidden, four statement pieces. Its
  lights are data (`houseLightPlan.js`), sorted by room into the form the
  shader and the mesh share (`houseLights.js`: each light's place, reach,
  strength, kind, colour, its share on by day and by night, when it comes
  on in the switch, its glow; each strip's line, direction, fall-off,
  spread and the share of it bounced round its room), so a pixel weighs
  only its own room's lights (outside, its own and the front rooms'
  through the glass). Its fittings are meshed from the same data
  (`lightFixtures.js`), and each glows as its light is set
  (`fittingGlow()`: an off one is dark).
  - **Kinds:** a lamp; downlights; uplights; the bar's narrow spots; an
    aimed spot (a cone along its way, a baffled can in the ceiling);
    moonlight (a wide cone from a tree, dappled by its leaves). Strips:
    coves, grazing slots, lines in joinery, skirtings, rails, mirrors'
    bars.
  - **Colour:** close, by room (`TONE2`): about 2700 K through the house,
    the bedrooms a touch warmer, the washrooms a touch cleaner, the closet
    between, the bar's 2500 K, moonlight cool.
  - **Ceilings:** floating panels in the main rooms (`PANELS`), 12 cm deep
    hung 16 cm down, a cove on their tops washing the band of ceiling
    round them and filling the room; downlights few, each a spot aimed at
    something (a table's centre, flowers, the canvas at 30°, a door).
  - **Statement pieces:** opal globes cascading through the stair's void
    (`GLOBES`); a brushed-brass linear pendant over the dining table; brass
    sconces with a reading arm by the bed; a brass ring with an opal
    diffuser in the walk-in closet.
  - **By room:** the living room's coffee-table pool, reading lamp, side
    tables' lamps, the TV wall grazed, the fig lit from its pot, the
    bookcase lit down its uprights bay by bay; the kitchen with its cooking
    done (pendants and under-cabinet low, a pin-spot on the island's
    flowers, the plinths' glow); the foyer's front wall washed, its mirror
    backlit, the door's frame lit from the floor; the stair's under-tread
    strips, wall step lights every other tread and a line in its rail; the
    study a library (its bookcase, a reading lamp, the desk lamp off); the
    washrooms' bookmatched walls grazed, light either side of their
    mirrors and behind them, the glow under the vanities, the bath's cove,
    the shower's niche and floor wash; the bedroom's headboard wash, a
    picture light over the print, a reading lamp, the dresser's mirror
    backlit, a glow under the bed; the closet lit down every bay's sides,
    over its rails and under its shelves; the guest room winding down (one
    bedside lamp, the glow under its bed); the upper passage's skirting,
    its picture light, lit door frames, a spot on the stair's head.
  - **Outside**, a step under the rooms' glow: the stone base grazed from
    its foot, the timber by the door washed from the porch, a line along
    each cantilever's edge, a faint one under the roof's coping, the
    entrance steps lit from their cheeks, moonlight from the trees by the
    house, the pool's coping glowing, lanterns by the loungers, a line at
    the glass balustrade's foot; the soffit's downlights, the bar's spots
    and shelves, the columns', timber's and olive's uplights, the bollards.
  - **By day** the statement pieces on low, the washrooms' mirrors and
    grazing, the coves softly on. **In the switch** the coves and lamps
    come on first, the accents next, the facade and the garden last
    (`nightOn()`), on the switch's own clock.
- **Lived in** (`homeDetails.js`, `0.4.22`): brushed-brass socket and
  switch plates, one family, where things plug in (the console, the sofa,
  the dining wall, over the kitchen counter, the desks, by each bed) and
  by the doors; a Home display by the front door, its screen the house's
  controls drawn by the shader (`P.screen` variant `.6`: rooms as tiles,
  a few lit, the climate's dial), glowing.
- **Styling** (`0.4.20`): the dining table laid for eight (`placeSetting()`:
  a plate on a charger, a napkin under the fork, a knife and a spoon) round
  a thrown stoneware vase (`vase()`) of garden roses, cream to blush, and
  silver-dollar eucalyptus (`bouquet()` in `plantMesh.js`, `0.4.26`: each
  rose its petals in three rings, cupped round a closed centre, the outer
  opening); the bookcase leaves about one
  compartment in five to a single piece (a tall bottle and a small vessel,
  a brass sphere on a stone block, a print propped), its flat stacks topped
  by a brass dish or a small pot.
- **Hardware** (`0.4.18`): brass bar pulls on posts with feet
  (`barPull()`, `pullOn()` in `furniture.js`) on every drawer and cabinet
  door, a long one each side of the front door, black slim ones on the
  sliders' meeting stiles (on the face away from the other track).
- **Mirrors** (`mirrorProbe.js`, `0.4.18`): every mirror records itself as
  the mesh is built (`MIRRORS`, returned with the mesh) and gets a probe,
  its room seen as six 384 px faces from a metre in front of it, in one
  atlas (texture unit 15). A mirror's pixel follows its reflected ray to
  its room's box (a `ZONES` box, or its own for the foyer) and reads the
  probe there, so the reflection moves with the viewing angle. Faces are
  drawn one a frame while the house is in view and the mirror within
  28 m, and again as the switch relights the house; inside a probe the
  mirrors are plain glass. Past a window a probe shows the outdoors,
  softly (`0.4.26`): the hill's lawn, then a backdrop pass
  (`PROBE_BACKDROP`) of the sky, the woods' crowns along the horizon and
  the meadow, hazed. `?mirror=0` turns them off with the pool's.

## Outside

- **The hill** (`MOUND`, `moundY`) is the meadow's: its lawn mesh takes the
  ground's colours and the meadow pass paints over it (atmosphere.md, "The
  camera (0.4)"); grass and flowers grow up to the stone base and its
  steps (`underHouse`). Stepping stones run down it toward the desk,
  between bollards.
- **The forecourt and steps:** honed limestone (`paver`); board-formed
  concrete planters, hollow shells with a steel rim round their walls and
  a heaped bed of dark mulch 7 cm down (`0.4.16`), planted in drifts:
  feather-reed grass, lavender, coneflowers (pink petals drooping from a
  rust cone; the clipped box balls they replaced read as spiky spheres) and
  creeping fig trailing over the front (`plantMesh.js`).
- **The land round it** (`treeShader.js`, `0.4.16`): five trees on the
  hill, then a grove of clumps past it (gaps between, crowns under the roof
  from the approach) and a hazed belt of woodland farther off. Trees away
  from the mountains haze as the ground there does (`TURNED_HAZE`), not
  toward the mist at the mountains' foot. Every twig tapers to a point and
  forks into fine twiglets that carry the leaves.
- **The terrace:** the pool (9 × 3.1 m from `0.4.17`, a deck strip
  between its coping and the glass) in its cantilever (its basin the
  porch's roof), frameless glass round the open sides capped by a
  brushed-brass rail, loungers, an olive in a thrown stoneware pot (dark
  glaze, rolled lip, soil inside it), its uplight on the deck beside it.
  By the loungers (`garments.js`, `0.4.26`): a navy-and-white striped towel
  thrown over the far one's foot (`drapedTowel`), white towels rolled on
  the table between (`rolledTowels`), and a white towelling robe on a
  brass hook on the timber wall past the bar, its belt tied (`robe`).
- **The bar** (`homeDetails.js`, `0.4.22`): against the timber wall
  beside the bedroom's glass, facing the pool: a walnut counter with a
  stone top, doors with brass pulls and a glass-fronted wine fridge, two
  floating shelves of bottles and stemmed glasses lit from under (two
  strips, their light lines at the strips set into the shelves'
  undersides, `0.4.26`), a tray, a bowl of lemons, two stools. Two of the
  terrace's uplights moved out from under it.
- **The roof** (`0.4.17`): the slab, then a fascia in two layers (a deep
  band of render, a shadow gap, a bronzed coping standing up as a low
  parapet); a recessed soffit of timber boards over the terrace and round
  the sides, its downlights in it; inside the parapet (`0.4.26`; it was
  sedum, which read as fungus from the pool) a deck of large pale
  porcelain pavers on pedestals in a stack bond (`ROOF_DECK`, 18 × 16, the
  open joints and each paver's tone drawn by the shader), 1.5 cm proud of
  a margin of dark basalt gravel, and two frameless skylights on bronze
  upstands laid to its joints; two scuppers at the back into downpipes
  that run back under the soffit and down the wall.

## The person (`0.4.24`, the design)

`personMesh.js`: the walker who'll go from the desk to the house, designed
but not yet walking. Stylised and seen from behind, never a likeness:
1.78 m, an off-white linen shirt untucked with the sleeves rolled, navy
chinos, tan leather shoes, short dark hair. Every limb is a tapered form
between two joints of a pose (`POSES`: `stand`, and a stride's two keys,
`stride` and `pass`), so the walk only has to move the joints. Lit by
the house's pass (`person` part). `?person=` stands it in the scene.

## Building it

The mesh is about 3 million vertices and takes about 2 s, so it's built in
a worker (`houseWorker.js`) as the page loads, and its programs, the
shadow map, the water, the birds and the bloom are made one to an idle
moment while the reader is still at the desk (`warmHouse` in
`MistCanvas.jsx`). Small leaves (under 8 cm) are 3 × 2 grids. The passes
run only while the house is in the frame (`boxSeen`).
