// Sky Courier — world data: terrain features, rings, town, trees.
// Own work. All features are pure functions of world coords (plus the
// seeded hash), so the island is identical every run.

function riverX(z) {
  return 700 * Math.sin(z * 0.00035) + 350 * Math.sin(z * 0.0011 + 1.7);
}

// The single road across the island.
function roadX(z) {
  return -500 + 400 * Math.sin(z * 0.0005 + 0.5);
}

function inRunway(x, z) {
  const r = CFG.RUNWAY;
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
}

function onIsland(x, z) {
  return (
    Math.abs(x) < CFG.ISLAND_X && z > CFG.ISLAND_Z_MIN && z < CFG.ISLAND_Z_MAX
  );
}

// Ground colour for the centre of terrain cell (ix, iz) in cell units.
function cellColor(ix, iz) {
  const P = CFG.PALETTE;
  const cx = (ix + 0.5) * CFG.CELL;
  const cz = (iz + 0.5) * CFG.CELL;
  if (!onIsland(cx, cz)) return P.sea;
  // Sandy coast: a band just inside the island edge.
  const edgeX = CFG.ISLAND_X - Math.abs(cx);
  const edgeZ = Math.min(cz - CFG.ISLAND_Z_MIN, CFG.ISLAND_Z_MAX - cz);
  if (Math.min(edgeX, edgeZ) < 110) return P.sand;
  if (inRunway(cx, cz)) return P.runway;
  if (Math.abs(cx - riverX(cz)) < 75) return P.river;
  if (Math.abs(cx - roadX(cz)) < 24) return P.road;
  // Patchwork fields: hash picks the crop colour.
  const h = hash2(ix, iz, 7);
  if (h < 0.34) return P.grassA;
  if (h < 0.58) return P.grassB;
  if (h < 0.72) return P.fieldGold;
  if (h < 0.84) return P.fieldBrown;
  if (h < 0.93) return P.fieldDark;
  return P.grassA;
}

// Runway centreline dash: true when this ground point is a white dash.
function isRunwayDash(x, z) {
  if (!inRunway(x, z)) return false;
  if (Math.abs(x) > 4) return false;
  return Math.floor(z / 60) % 2 === 0;
}

// Fixed town houses: {x, z, w, hue} — drawn as billboards.
function townHouses() {
  const out = [];
  const T = CFG.TOWN;
  for (let i = 0; i < 16; i++) {
    const a = hash2(i, 3, 11) * Math.PI * 2;
    const r = 40 + hash2(i, 5, 11) * T.r;
    out.push({
      x: T.x + Math.cos(a) * r,
      z: T.z + Math.sin(a) * r * 0.8,
      w: 26 + hash2(i, 7, 11) * 22,
      hue: hash2(i, 9, 11),
    });
  }
  return out;
}

// Scattered trees on the island: {x, z, s} — drawn as billboards.
function trees() {
  const out = [];
  for (let i = 0; i < 140; i++) {
    const x = (hash2(i, 1, 21) * 2 - 1) * (CFG.ISLAND_X - 150);
    const z = CFG.ISLAND_Z_MIN + hash2(i, 2, 21) * (CFG.ISLAND_Z_MAX - CFG.ISLAND_Z_MIN);
    if (inRunway(x, z)) continue;
    if (Math.abs(x - riverX(z)) < 100) continue;
    if (Math.abs(x - roadX(z)) < 45) continue;
    // Keep the runway approach clear so nothing blocks the landing view.
    if (Math.abs(x) < 140 && z > -700 && z < 1000) continue;
    const dx = x - CFG.TOWN.x;
    const dz = z - CFG.TOWN.z;
    if (dx * dx + dz * dz < CFG.TOWN.r * CFG.TOWN.r) continue;
    out.push({ x, z, s: 0.8 + hash2(i, 4, 21) * 0.9 });
  }
  return out;
}

// Ring course with runtime state attached (hit / missed flags live here).
function makeRings() {
  return CFG.RINGS.map((r) => ({ x: r.x, y: r.y, z: r.z, hit: false, missed: false }));
}

// Clouds: screen-space sprites with slow drift and heading parallax.
function makeClouds() {
  const out = [];
  for (let i = 0; i < 11; i++) {
    out.push({
      x: hash2(i, 1, 31) * 1280,
      y: 30 + hash2(i, 2, 31) * 190,
      s: 0.7 + hash2(i, 3, 31) * 1.3,
      v: 4 + hash2(i, 4, 31) * 7,
    });
  }
  return out;
}
