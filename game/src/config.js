// Sky Courier — shared constants (written by the builder, own work).
// World units are metres. Heading 0 means flying north (+z).

const CFG = {
  W: 1280,
  H: 720,
  FOCAL: 700, // projection focal length, pixels
  HORIZON: 300, // horizon line height on screen, pixels
  CELL: 200, // terrain cell size, metres
  VIEW_DIST: 4200, // how far ahead terrain is drawn
  VIEW_SIDE: 1700, // how far to the sides terrain is drawn
  ISLAND_X: 2400, // island half-width
  ISLAND_Z_MIN: -600,
  ISLAND_Z_MAX: 4800,
  FLIGHT_TIME: 180, // seconds
  STALL_SPEED: 35, // m/s, below this the plane sinks and buffets
  RING_RADIUS: 55, // metres, generous on purpose
  RUNWAY: { x0: -45, x1: 45, z0: -100, z1: 800 },
  // Home airstrip start: on the runway threshold, climbing out.
  START: { x: 0, z: -350, alt: 80, heading: 0, speed: 55, throttle: 0.7 },
  // Ring course: a gentle tour of the island, ending back near the runway.
  RINGS: [
    { x: 0, y: 220, z: 600 },
    { x: 320, y: 260, z: 1400 },
    { x: -260, y: 300, z: 2200 },
    { x: -750, y: 280, z: 3000 },
    { x: 150, y: 320, z: 3800 },
    { x: 950, y: 260, z: 4400 },
    { x: 1200, y: 240, z: 4600 },
    { x: 800, y: 200, z: 3800 },
  ],
  TOWN: { x: 820, z: 1700, r: 320 },
  PALETTE: {
    skyTop: '#2f6fb4',
    skyMid: '#7db3dd',
    skyLow: '#f7c98a',
    sea: '#2e7fb8',
    seaDeep: '#1f5f8f',
    sand: '#e8d39a',
    grassA: '#5da244',
    grassB: '#6fb04e',
    fieldGold: '#c9a94f',
    fieldBrown: '#8a6b3d',
    fieldDark: '#4a7d3a',
    river: '#3f8fc4',
    road: '#6f6f6f',
    runway: '#3a3f45',
    runwayMark: '#f2f2f2',
  },
};
