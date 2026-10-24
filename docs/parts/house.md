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
  panel, a bench, a mirror, coats.
- **WC** (x 4.6 … 7.72, z −67.5 … −71.5): a basin, a WC, a mirror, its door
  off the foyer.
- **Kitchen** (x 1.6 … 7.72, z −71.5 … −78.72): counters along the back
  with a sink and the hob's extractor, tall cupboards and the fridge along
  the side, an island with stools and pendants.
- **Study** (x −5.4 … 1.6, z −73 … −78.72): a desk at the wall, a chair,
  shelves; a glass door.
- **Stair** (x −7.6 … −5.6): floating walnut treads up the left wall from
  z −72 to −76.8, 18 risers of 0.2 m.

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
  its void, a bench at the glass.
- **Main bedroom** (x −4.5 … 2.6, z −71.28 … −76.5): the bed facing the
  glass and the terrace, bedside tables and lamps, an armchair, a dresser.
- **Wardrobe** (x −4.5 … 2.6, z −76.5 … −78.72): a walk-in, rails and
  shelves.
- **En-suite** (x 2.6 … 7.72, z −71.28 … −75.5): a freestanding tub, a glass
  shower, a double vanity and mirror; a slot window at the side.
- **Guest bedroom** (x 2.6 … 7.72, z −75.5 … −78.72): a bed, a desk.

Partitions are 12 cm, plaster both sides, 3.25 m to the ceiling; doors
0.9 × 2.2 m in walnut, on frames, each open at its own angle.
