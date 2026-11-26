// Sky Courier — boot and main loop, own work.
// Fixed 1280x720 canvas, scaled by CSS. requestAnimationFrame loop with
// a clamped dt. Exposes window.__sky for playtests and screenshots.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const g = makeGame();
g.clouds = makeClouds();

let last = performance.now();
let shotFrames = 0;

function keyAction(k) {
  unlockAudio();
  if (k === 'enter' || k === 'space') {
    if (g.screen === 'title' || g.screen === 'end') {
      playClick();
      startFlight(g);
    }
  } else if (k === 'p') {
    if (g.screen === 'play') g.screen = 'pause';
    else if (g.screen === 'pause') g.screen = 'play';
  } else if (k === 'm') {
    g.muted = !g.muted;
    setMuted(g.muted);
  }
}

initInput(canvas, keyAction);

function clickAction(action) {
  unlockAudio();
  playClick();
  if (action === 'start' || action === 'restart') startFlight(g);
  else if (action === 'resume') g.screen = 'play';
  else if (action === 'pause') g.screen = 'pause';
  else if (action === 'mute') {
    g.muted = !g.muted;
    setMuted(g.muted);
  } else if (action === 'title') g.screen = 'title';
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;

  pollInput();
  const clicked = consumeClick();
  if (clicked) clickAction(clicked);

  if (g.screen === 'play' && !g.frozen) {
    stepPlane(g.plane, input, dt);
    stepGame(g, dt);
  }
  updateEngine(g.plane.throttle, g.plane.speed, g.screen === 'play');

  clearButtons();
  render(ctx, g, input, dt);
  if (g.shot) {
    shotFrames++;
    if (shotFrames >= 2) {
      g.shotReady = true;
      window.__shotReady = true;
    }
  }

  requestAnimationFrame(frame);
}

// Deterministic screenshot states (?shot=title|play|ring|land&seed=N).
applyShot(g);
window.__sky = {
  get state() {
    return g.screen;
  },
  get score() {
    return g.score;
  },
  get rings() {
    return g.rings.filter((r) => r.hit).length;
  },
  get alt() {
    return Math.round(g.plane.alt);
  },
  get speed() {
    return Math.round(g.plane.speed);
  },
  get timeLeft() {
    return Math.round(g.timeLeft);
  },
  get endKind() {
    return g.endKind;
  },
};
window.__shotReady = false;

requestAnimationFrame(frame);
