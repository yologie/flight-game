// Sky Courier — deterministic screenshot states, own work.
// ?shot=title|play|ring|land&seed=N sets up an exact scene. main.js sets
// window.__shotReady after two frames of the preset state.

function applyShot(g) {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return;
  const seed = Number(q.get('seed') || 1);
  g.seed = seed;
  g.shot = shot;
  // Freeze the sim for the shot: the scene stays exactly as preset
  // instead of flying on while the screenshot driver waits.
  g.frozen = true;
  const p = g.plane;
  if (shot === 'title') {
    g.screen = 'title';
    g.best = 486; // a previous best, so the title shows the score line
    p.x = 0;
    p.z = 500;
    p.alt = 420;
    p.heading = 0.35;
    p.speed = 90;
    p.throttle = 0.7;
    p.pitch = 0;
    p.roll = 0;
  } else if (shot === 'play') {
    // Cover: mid-flight, first ring dead ahead, runway strip visible ahead.
    g.screen = 'play';
    p.x = 60;
    p.z = 250;
    p.alt = 280;
    p.speed = 95;
    p.throttle = 0.75;
    p.heading = 0.05;
    p.pitch = 0.02;
    p.roll = 0.05;
    g.score = 120;
    g.ringIndex = 1;
    g.rings[0].hit = true;
    g.timeLeft = 132;
  } else if (shot === 'ring') {
    // Plane right at the second ring, score popping.
    g.screen = 'play';
    p.x = 280;
    p.z = 1330;
    p.alt = 255;
    p.speed = 105;
    p.throttle = 0.8;
    p.heading = 0.12;
    p.pitch = 0.01;
    p.roll = -0.06;
    g.score = 120;
    g.ringIndex = 1;
    g.rings[0].hit = true;
    g.timeLeft = 118;
    g.popups = [{ text: 'RING +120', t: 0.3, color: '#7dff8a' }];
  } else if (shot === 'land') {
    // Final approach: runway centred ahead, low and slow.
    g.screen = 'play';
    p.x = 8;
    p.z = -620;
    p.alt = 46;
    p.speed = 58;
    p.throttle = 0.35;
    p.heading = 0.01;
    p.pitch = -0.05;
    p.roll = 0;
    g.score = 640;
    g.ringIndex = 8;
    g.rings.forEach((r) => {
      r.hit = true;
    });
    g.returning = true;
    g.timeLeft = 24;
    g.banner = { text: 'FINAL — RUNWAY AHEAD', t: 0.5 };
  }
}
