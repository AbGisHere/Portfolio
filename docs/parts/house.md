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
- **Dining** (x 0.5 … 4.6): a table for eight under a pendant.
- **Foyer** (x 4.6 … 7.72, z −63.28 … −67.5): the front door in the timber
  panel, a bench, a mirror, a walnut hook rail with two coats on hangers
  and a scarf over the middle hook (`0.4.21`).
- **WC** (x 4.6 … 7.72, z −67.5 … −71.5): Italian marble on every wall and
  the floor (`washrooms.js`, `0.4.23`), a wall-hung toilet on its marble
  ledge, a floating vanity under a 3 : 1 mirror lit from behind; its door
  off the foyer.
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
  washrooms keep their lights partly on by day.
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
  raised lip, two steps down) round a back board, a brass slip, a mount
  with a bevel-cut window and the print behind it, each print its own soft
  abstract under a glass sheen; a mirror's glass and the TV's
  sit in their frames' rebates; frames clear their openings by 2 mm.
- **Soft things rest where they're held** (`0.4.19`): each pillow and
  cushion stands with its foot on what's under it and leans back
  (tilt π/2 + its lean) against what's behind it: the bed's euros on the
  panel, the sleeping pillows on them, the accent cushion on those; the
  sofa's and the lounge chair's scatter cushions on the seat, against the
  back. The sofa's throw follows the arm's section with a centimetre's
  clearance, two faces 8 mm apart, its hems rolled.
- **Lived in** (`homeDetails.js`, `0.4.22`): brushed-brass socket and
  switch plates, one family, where things plug in (the console, the sofa,
  the dining wall, over the kitchen counter, the desks, by each bed) and
  by the doors; a Home display by the front door, its screen the house's
  controls drawn by the shader (`P.screen` variant `.6`: rooms as tiles,
  a few lit, the climate's dial), glowing.
- **Styling** (`0.4.20`): the dining table laid for eight (`placeSetting()`:
  a plate on a charger, a napkin under the fork, a knife and a spoon) round
  a thrown stoneware vase (`vase()`); the bookcase leaves about one
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
  mirrors are plain glass. `?mirror=0` turns them off with the pool's.

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
- **The bar** (`homeDetails.js`, `0.4.22`): against the timber wall
  beside the bedroom's glass, facing the pool: a walnut counter with a
  stone top, doors with brass pulls and a glass-fronted wine fridge, two
  floating shelves of bottles and stemmed glasses lit from under (two
  `HOUSE_STRIPS`), a tray, a bowl of lemons, two stools. Two of the
  terrace's uplights moved out from under it.
- **The roof** (`0.4.17`): the slab, then a fascia in two layers (a deep
  band of render, a shadow gap, a bronzed coping standing up as a low
  parapet); a recessed soffit of timber boards over the terrace and round
  the sides, its downlights in it; sedum inside the parapet (`roof` part)
  with a gravel margin; two scuppers at the back into downpipes that run
  back under the soffit and down the wall.

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
