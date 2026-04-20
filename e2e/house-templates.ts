/**
 * House-building templates for the autonomous experiment.
 *
 * Each template is a deterministic drawing sequence — a list of actions
 * the Playwright harness executes. This lets us iterate on more realistic
 * programs (multi-room houses, pools, outbuildings) while keeping the
 * harness itself simple.
 *
 * Coordinate space: ALL offsets are in screen pixels relative to canvas
 * centre. World-units per pixel is the viewport scale (default 20 at
 * load), so 100 px ≈ 2 m.
 */

export type ToolKey = 'v' | 'w' | 'd' | 'n' | 's' | 'o' | 'k' | 'b' | 't' | 'g' | 'l' | 'r' | 'c' | 'a' | 'p';

export interface Action {
  kind: 'tool' | 'drag' | 'click' | 'dblclick' | 'wait';
  /** tool shortcut */
  tool?: ToolKey;
  /** drag / click / dblclick coords (relative to canvas centre) */
  x1?: number; y1?: number;
  x2?: number; y2?: number;
  /** wait duration in ms */
  ms?: number;
}

export interface HouseTemplate {
  id: string;
  label: string;
  description: string;
  /** Expected counts for sanity checking (optional). */
  expected?: Record<string, number>;
  actions: Action[];
}

// Shortcuts
const T = (tool: ToolKey): Action => ({ kind: 'tool', tool });
const drag = (x1: number, y1: number, x2: number, y2: number): Action =>
  ({ kind: 'drag', x1, y1, x2, y2 });
const click = (x1: number, y1: number): Action => ({ kind: 'click', x1, y1 });
const dbl  = (x1: number, y1: number): Action => ({ kind: 'dblclick', x1, y1 });
const wait = (ms: number): Action => ({ kind: 'wait', ms });

// ============================================================================
// 01 — Simple room (the original baseline)
// ============================================================================

function simpleRoom(): Action[] {
  const L = 200, H = 150;
  const xL = -L, xR =  L;
  const yT = -H, yB =  H;
  return [
    T('w'),
    drag(xL, yT, xR, yT),
    drag(xR, yT, xR, yB),
    drag(xR, yB, xL, yB),
    drag(xL, yB, xL, yT),
    T('d'), click(0, yB),
    T('n'), click(0, yT),
    T('s'),
    click(xL + 20, yT + 20),
    click(xR - 20, yT + 20),
    click(xR - 20, yB - 20),
    dbl  (xL + 20, yB - 20),
    T('o'),
    click(xL - 10, yT - 10),
    click(xR + 10, yT - 10),
    click(xR + 10, yB + 10),
    dbl  (xL - 10, yB + 10),
    T('k'),
    click(xL + 40, yT + 40),
    click(xR - 40, yT + 40),
    click(xR - 40, yB - 40),
    click(xL + 40, yB - 40),
    T('v'),
  ];
}

// ============================================================================
// 02 — Three-bedroom house
// ============================================================================
// Layout (plan view — xL ... xR west→east, yT ... yB north→south):
//
//   xL             xMid           xR
//   ┌───────────────┬──────────────┐  yT  north
//   │               │              │
//   │   BED 1       │   LIVING     │
//   │               │              │
//   ├──────┬────────┤              │  yQ  quarter
//   │      │ HALL   │              │
//   │ BED2 ├────────┤──────────────┤  y1
//   │      │        │              │
//   ├──────┤  BATH  │   KITCHEN    │
//   │ BED3 │        │              │
//   │      │        │              │
//   └──────┴────────┴──────────────┘  yB  south
//
// Entry door in south wall of LIVING. Front windows in each bedroom north
// wall. Roof covers everything + 200 mm overhang.

function threeBedroom(): Action[] {
  // Big footprint — ~12 m × 9 m
  const xL = -300, xR = 300;                       // 12 m
  const yT = -220, yB = 220;                       // 8.8 m
  const xM = -60;                                  // mid-west interior wall
  const xN =  100;                                 // corridor west edge
  const xO =  160;                                 // corridor east edge (if any)
  const y1 =  40;                                  // horiz divider bed1/bed2
  const yH = -40;                                  // bathroom top
  const a: Action[] = [T('w')];
  // Exterior
  a.push(drag(xL, yT, xR, yT));                    // north
  a.push(drag(xR, yT, xR, yB));                    // east
  a.push(drag(xR, yB, xL, yB));                    // south
  a.push(drag(xL, yB, xL, yT));                    // west
  // Interior partitions
  a.push(drag(xM, yT, xM, yB));                    // main north–south divider
  a.push(drag(xL, y1, xM, y1));                    // bed1 / bed2 horizontal
  a.push(drag(xM, yH, xR, yH));                    // living / kitchen horizontal
  // Corridor forming bathroom nook
  a.push(drag(xN, yT, xN, yH));                    // hall west edge (partial)
  // Doors
  a.push(T('d'));
  a.push(click(0, yB));                             // main entry (south wall)
  a.push(click(xM, 0));                             // bed1 → living
  a.push(click(-180, y1));                         // bed1 → bed2
  a.push(click(xN + 25, yH));                      // bath → hallway area
  // Windows — one per bedroom on the north wall
  a.push(T('n'));
  a.push(click(-220, yT));                         // bed1 window
  a.push(click(-150, y1 - 30));                    // bed2 side window (fails gracefully if wall missing)
  a.push(click(180, yT));                          // living window north
  a.push(click(200, yB));                          // kitchen window south
  // Slab covering whole footprint
  a.push(T('s'));
  a.push(click(xL + 10, yT + 10));
  a.push(click(xR - 10, yT + 10));
  a.push(click(xR - 10, yB - 10));
  a.push(dbl  (xL + 10, yB - 10));
  // Roof overhang
  a.push(T('o'));
  a.push(click(xL - 20, yT - 20));
  a.push(click(xR + 20, yT - 20));
  a.push(click(xR + 20, yB + 20));
  a.push(dbl  (xL - 20, yB + 20));
  a.push(T('v'));
  return a;
}

// ============================================================================
// 03 — Pool house: small dwelling with an adjacent pool
// ============================================================================
// The pool itself is rendered as a slab with ElevationOffset = -300 mm so it
// sits below ground — good enough for a first pass; a real pool element type
// is a future addition.

function poolHouse(): Action[] {
  const a: Action[] = [];
  // Cabana (small dwelling on west side)
  const xL = -280, xR = -40;
  const yT = -100, yB = 100;
  a.push(T('w'));
  a.push(drag(xL, yT, xR, yT));
  a.push(drag(xR, yT, xR, yB));
  a.push(drag(xR, yB, xL, yB));
  a.push(drag(xL, yB, xL, yT));
  a.push(T('d')); a.push(click((xL + xR) / 2, yB));  // door facing pool
  a.push(T('n'));
  a.push(click((xL + xR) / 2, yT));                  // rear window
  a.push(T('s'));
  a.push(click(xL + 10, yT + 10));
  a.push(click(xR - 10, yT + 10));
  a.push(click(xR - 10, yB - 10));
  a.push(dbl  (xL + 10, yB - 10));
  a.push(T('o'));
  a.push(click(xL - 15, yT - 15));
  a.push(click(xR + 15, yT - 15));
  a.push(click(xR + 15, yB + 15));
  a.push(dbl  (xL - 15, yB + 15));
  // Pool — rectangular to the east of the cabana
  const pxL = 20, pxR = 280;
  const pyT = -80, pyB = 80;
  a.push(T('s'));
  a.push(click(pxL, pyT));
  a.push(click(pxR, pyT));
  a.push(click(pxR, pyB));
  a.push(dbl  (pxL, pyB));
  a.push(T('v'));
  return a;
}

// ============================================================================
// 04 — Mountain cabin
// ============================================================================
// Small footprint, steep roof, no windows on north face. Extra thick walls.

function mountainCabin(): Action[] {
  const a: Action[] = [];
  const L = 160, H = 120;
  const xL = -L, xR = L, yT = -H, yB = H;
  a.push(T('w'));
  a.push(drag(xL, yT, xR, yT));
  a.push(drag(xR, yT, xR, yB));
  a.push(drag(xR, yB, xL, yB));
  a.push(drag(xL, yB, xL, yT));
  a.push(T('d')); a.push(click(0, yB));       // single entry south
  a.push(T('n'));
  a.push(click(-80, yB));                      // south window
  a.push(click( 80, yB));                      // south window
  a.push(click(xL, 0));                        // west window
  a.push(click(xR, 0));                        // east window
  a.push(T('s'));
  a.push(click(xL + 8, yT + 8));
  a.push(click(xR - 8, yT + 8));
  a.push(click(xR - 8, yB - 8));
  a.push(dbl  (xL + 8, yB - 8));
  // Roof with larger overhang typical of mountain architecture
  a.push(T('o'));
  a.push(click(xL - 40, yT - 30));
  a.push(click(xR + 40, yT - 30));
  a.push(click(xR + 40, yB + 30));
  a.push(dbl  (xL - 40, yB + 30));
  // Stone columns at front corners
  a.push(T('k'));
  a.push(click(xL + 30, yB - 20));
  a.push(click(xR - 30, yB - 20));
  a.push(T('v'));
  return a;
}

// ============================================================================
// 05 — Farnsworth-style glass pavilion (open plan, thin walls, wide eaves)
// Inspired by Mies van der Rohe's Farnsworth House — single open volume,
// all-glass perimeter (rendered as windows here), large roof overhang on
// two sides, raised slab.
// ============================================================================

function farnsworthPavilion(): Action[] {
  const a: Action[] = [];
  const xL = -250, xR = 250, yT = -140, yB = 140;
  // Exterior walls (interpreted as glass curtain walls — same geometry though)
  a.push(T('w'));
  a.push(drag(xL, yT, xR, yT));
  a.push(drag(xR, yT, xR, yB));
  a.push(drag(xR, yB, xL, yB));
  a.push(drag(xL, yB, xL, yT));
  // Entry on south (user-facing), few doors
  a.push(T('d'));
  a.push(click(0, yB));
  // Many windows — glass perimeter
  a.push(T('n'));
  for (const wx of [-180, -60, 60, 180]) {
    a.push(click(wx, yT));
    a.push(click(wx, yB));
  }
  for (const wy of [-80, 80]) {
    a.push(click(xL, wy));
    a.push(click(xR, wy));
  }
  // Raised slab — slightly larger than walls (the floor plate extends)
  a.push(T('s'));
  a.push(click(xL - 40, yT - 20));
  a.push(click(xR + 40, yT - 20));
  a.push(click(xR + 40, yB + 20));
  a.push(dbl  (xL - 40, yB + 20));
  // Roof — deep overhang east/west (signature horizontal emphasis)
  a.push(T('o'));
  a.push(click(xL - 80, yT - 30));
  a.push(click(xR + 80, yT - 30));
  a.push(click(xR + 80, yB + 30));
  a.push(dbl  (xL - 80, yB + 30));
  // Eight steel columns supporting the roof — 4 on each long side
  a.push(T('k'));
  for (const cx of [-180, -60, 60, 180]) {
    a.push(click(cx, yT - 20));
    a.push(click(cx, yB + 20));
  }
  a.push(T('v'));
  return a;
}

// ============================================================================
// 06 — Courtyard house (atrium plan — rooms around a central open court)
// Common in Mediterranean / Moorish architecture, modern minimalist too.
// ============================================================================

function courtyardHouse(): Action[] {
  const a: Action[] = [];
  const xL = -320, xR = 320, yT = -220, yB = 220;
  // Outer perimeter
  a.push(T('w'));
  a.push(drag(xL, yT, xR, yT));
  a.push(drag(xR, yT, xR, yB));
  a.push(drag(xR, yB, xL, yB));
  a.push(drag(xL, yB, xL, yT));
  // Inner courtyard — 4 walls forming a central open space
  const ixL = -80, ixR = 80, iyT = -60, iyB = 60;
  a.push(drag(ixL, iyT, ixR, iyT));
  a.push(drag(ixR, iyT, ixR, iyB));
  a.push(drag(ixR, iyB, ixL, iyB));
  a.push(drag(ixL, iyB, ixL, iyT));
  // Entry
  a.push(T('d'));
  a.push(click(0, yB));
  // Access doors to courtyard from each cardinal direction
  a.push(click(0, iyT));
  a.push(click(ixR, 0));
  a.push(click(0, iyB));
  a.push(click(ixL, 0));
  // Windows on all four outer walls
  a.push(T('n'));
  for (const wx of [-200, 200]) {
    a.push(click(wx, yT));
    a.push(click(wx, yB));
  }
  for (const wy of [-120, 120]) {
    a.push(click(xL, wy));
    a.push(click(xR, wy));
  }
  // Slab over the full footprint except the courtyard void — draw full slab;
  // a proper void would need a polygon with hole support (future feature).
  a.push(T('s'));
  a.push(click(xL + 10, yT + 10));
  a.push(click(xR - 10, yT + 10));
  a.push(click(xR - 10, yB - 10));
  a.push(dbl  (xL + 10, yB - 10));
  // Roof — also full coverage minus courtyard (limitation same as slab)
  a.push(T('o'));
  a.push(click(xL - 15, yT - 15));
  a.push(click(xR + 15, yT - 15));
  a.push(click(xR + 15, yB + 15));
  a.push(dbl  (xL - 15, yB + 15));
  a.push(T('v'));
  return a;
}

// ============================================================================
// 07 — Two-room office / studio — small commercial, full window walls facing south
// ============================================================================

function officeStudio(): Action[] {
  const a: Action[] = [];
  const xL = -220, xR = 220, yT = -130, yB = 130;
  const xMid = 0;
  a.push(T('w'));
  a.push(drag(xL, yT, xR, yT));
  a.push(drag(xR, yT, xR, yB));
  a.push(drag(xR, yB, xL, yB));
  a.push(drag(xL, yB, xL, yT));
  // Partition dividing the studio
  a.push(drag(xMid, yT, xMid, yB));
  a.push(T('d'));
  a.push(click(-100, yB));  // entry to west room
  a.push(click(100, yB));   // entry to east room
  a.push(click(xMid, 40));  // interior door
  a.push(T('n'));
  // Full south glazing — 6 windows
  for (const wx of [-160, -60, 60, 160]) a.push(click(wx, yB));
  // North clerestory — 2 windows
  a.push(click(-100, yT));
  a.push(click(100, yT));
  a.push(T('s'));
  a.push(click(xL + 10, yT + 10));
  a.push(click(xR - 10, yT + 10));
  a.push(click(xR - 10, yB - 10));
  a.push(dbl  (xL + 10, yB - 10));
  a.push(T('o'));
  a.push(click(xL - 10, yT - 10));
  a.push(click(xR + 10, yT - 10));
  a.push(click(xR + 10, yB + 10));
  a.push(dbl  (xL - 10, yB + 10));
  a.push(T('v'));
  return a;
}

export const TEMPLATES: Record<string, HouseTemplate> = {
  simple: {
    id: 'simple',
    label: 'Simple Room',
    description: '4-wall room + door + window + slab + roof + 4 columns',
    expected: { wall: 4, door: 1, window: 1, slab: 1, roof: 1, column: 4 },
    actions: simpleRoom(),
  },
  'three-bedroom': {
    id: 'three-bedroom',
    label: '3-Bedroom House',
    description: '3 bedrooms + living + kitchen + bath, central corridor',
    expected: { wall: 8, door: 4, window: 4, slab: 1, roof: 1 },
    actions: threeBedroom(),
  },
  'pool-house': {
    id: 'pool-house',
    label: 'Pool House',
    description: 'Cabana + adjacent rectangular pool',
    expected: { wall: 4, door: 1, window: 1, slab: 2, roof: 1 },
    actions: poolHouse(),
  },
  'mountain-cabin': {
    id: 'mountain-cabin',
    label: 'Mountain Cabin',
    description: 'Compact cabin with steep roof, stone columns',
    expected: { wall: 4, door: 1, window: 4, slab: 1, roof: 1, column: 2 },
    actions: mountainCabin(),
  },
  'farnsworth-pavilion': {
    id: 'farnsworth-pavilion',
    label: 'Farnsworth-style Pavilion',
    description: 'Mies-inspired open plan with glass perimeter + deep roof overhang + 8 columns',
    expected: { wall: 4, door: 1, window: 12, slab: 1, roof: 1, column: 8 },
    actions: farnsworthPavilion(),
  },
  'courtyard-house': {
    id: 'courtyard-house',
    label: 'Courtyard House',
    description: 'Mediterranean-style plan with central atrium + perimeter rooms',
    expected: { wall: 8, door: 5, window: 8, slab: 1, roof: 1 },
    actions: courtyardHouse(),
  },
  'office-studio': {
    id: 'office-studio',
    label: 'Office / Studio',
    description: 'Two-room commercial with south glazing + north clerestory',
    expected: { wall: 5, door: 3, window: 6, slab: 1, roof: 1 },
    actions: officeStudio(),
  },
};
