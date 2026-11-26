// Sky Courier — game state machine and scoring, own work.
// Screens: title -> play <-> pause -> end (landed / crashed / timed out).
// Rings pay +100 plus a line bonus; a good runway landing pays up to +250.

function makeGame() {
  return {
    screen: 'title', // title | play | pause | end
    plane: makePlane(),
    rings: makeRings(),
    ringIndex: 0,
    score: 0,
    timeLeft: CFG.FLIGHT_TIME,
    grace: 0, // seconds past zero on the clock before a timeout ends it
    endKind: null, // landed | crashed | timeout
    landingScore: 0,
    landingLabel: '',
    best: 0,
    popups: [], // {text, t, color}
    banner: null, // {text, t}
    returning: false, // true once the course is done / time is low
    finalCalled: false, // final-approach banner shown once
    frozen: false, // screenshot states freeze the sim (see shots.js)
    muted: false,
    seed: 1,
    clouds: null,
    shot: null,
    shotReady: false,
  };
}

function startFlight(g) {
  g.plane = makePlane();
  g.rings = makeRings();
  g.ringIndex = 0;
  g.score = 0;
  g.timeLeft = CFG.FLIGHT_TIME;
  g.grace = 0;
  g.endKind = null;
  g.landingScore = 0;
  g.landingLabel = '';
  g.popups = [];
  g.banner = null;
  g.returning = false;
  g.finalCalled = false;
  g.frozen = false;
  g.screen = 'play';
}

function addPopup(g, text, color) {
  g.popups.push({ text, t: 0, color: color || '#ffd94d' });
  if (g.popups.length > 4) g.popups.shift();
}

function addBanner(g, text) {
  g.banner = { text, t: 0 };
}

function ringBonus(p) {
  // Faster and straighter through the ring pays more, 0..50.
  const speedBonus = Math.max(0, Math.min(30, Math.round((p.speed - 55) * 0.6)));
  const levelBonus = Math.abs(p.roll) < 0.35 && Math.abs(p.pitch) < 0.15 ? 20 : 0;
  return speedBonus + levelBonus;
}

function finishFlight(g, kind) {
  g.endKind = kind;
  g.screen = 'end';
  if (g.score > g.best) g.best = g.score;
}

// One frame of play logic. dt seconds. Returns nothing; mutates g.
function stepGame(g, dt) {
  const p = g.plane;
  if (g.timeLeft > 0) {
    g.timeLeft -= dt;
    if (g.timeLeft <= 0) {
      g.timeLeft = 0;
      if (!g.returning) {
        g.returning = true;
        addBanner(g, 'TIME UP — LAND ON THE RUNWAY');
      }
    }
  } else {
    // Clock is at zero: 15 s of grace to get down, then the flight ends.
    g.grace += dt;
    if (g.grace > 15) {
      g.landingLabel = 'OUT OF TIME — NO LANDING';
      finishFlight(g, 'timeout');
      return;
    }
  }

  // Ring hits and misses.
  if (g.ringIndex < g.rings.length) {
    const ring = g.rings[g.ringIndex];
    const d = distToRing(p, ring);
    if (d < CFG.RING_RADIUS * 0.92) {
      ring.hit = true;
      const bonus = ringBonus(p);
      const pts = 100 + bonus;
      g.score += pts;
      addPopup(g, 'RING +' + pts, '#7dff8a');
      playChime();
      g.ringIndex++;
      if (g.ringIndex >= g.rings.length) {
        g.returning = true;
        addBanner(g, 'COURSE COMPLETE — LAND ON THE RUNWAY');
      }
    } else if (p.z > ring.z + 60 && !ring.missed) {
      // Flown past the ring without hitting it.
      ring.missed = true;
      addPopup(g, 'RING MISSED', '#ff9a7d');
      g.ringIndex++;
      if (g.ringIndex >= g.rings.length) {
        g.returning = true;
        addBanner(g, 'COURSE COMPLETE — LAND ON THE RUNWAY');
      }
    }
  }

  // Ground contact.
  if (p.alt <= 0.5) {
    p.alt = 0;
    const overRunway = inRunway(p.x, p.z);
    const gentle = Math.abs(p.vs) < 6 && Math.abs(p.roll) < 0.3 && p.speed < 75;
    if (overRunway && gentle) {
      // Landing: score by smoothness and centreline.
      const centre = Math.max(0, 1 - Math.abs(p.x) / 45);
      const soft = Math.max(0, 1 - Math.abs(p.vs) / 6);
      g.landingScore = Math.round(100 + 150 * (0.5 * centre + 0.5 * soft));
      g.score += g.landingScore;
      g.landingLabel =
        g.landingScore >= 200 ? 'SMOOTH LANDING!' : g.landingScore >= 140 ? 'GOOD LANDING' : 'ROUGH LANDING';
      playThump();
      finishFlight(g, 'landed');
    } else if (overRunway) {
      g.landingScore = 40;
      g.score += 40;
      g.landingLabel = 'HARD LANDING — IT COUNTS';
      playThump();
      finishFlight(g, 'landed');
    } else {
      g.landingLabel = 'CRASHED — OFF THE RUNWAY';
      playThump();
      finishFlight(g, 'crashed');
    }
    return;
  }

  // Final approach: once, when the runway is close and we are coming home.
  if (g.returning && !g.finalCalled) {
    const dRunway = Math.hypot(p.x - 0, p.z - 350);
    if (dRunway < 1500 && p.alt < 500) {
      g.finalCalled = true;
      addBanner(g, 'FINAL — RUNWAY AHEAD');
    }
  }

  // Popup / banner ageing.
  for (const pop of g.popups) pop.t += dt;
  g.popups = g.popups.filter((pop) => pop.t < 1.6);
  if (g.banner) {
    g.banner.t += dt;
    if (g.banner.t > 3.2) g.banner = null;
  }
}

function ringsHit(g) {
  return g.rings.filter((r) => r.hit).length;
}
