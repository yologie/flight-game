// Sky Courier — arcade flight model, own work.
// Simple and forgiving: throttle sets target speed, pitch sets climb,
// roll banks the plane and turns it. Stall below 35 m/s sinks the plane.

function makePlane() {
  const s = CFG.START;
  return {
    x: s.x,
    z: s.z,
    alt: s.alt,
    heading: s.heading,
    pitch: 0,
    roll: 0,
    speed: s.speed,
    throttle: s.throttle,
    vs: 0, // vertical speed, m/s
    stalled: false,
  };
}

// inp: {pitch -1..1, roll -1..1, throttleUp, throttleDown}; dt seconds.
function stepPlane(p, inp, dt) {
  // Throttle: 0.25 per second of holding the key.
  if (inp.throttleUp) p.throttle = Math.min(1, p.throttle + 0.25 * dt);
  if (inp.throttleDown) p.throttle = Math.max(0, p.throttle - 0.3 * dt);

  // Speed chases the throttle target.
  const targetSpeed = 28 + p.throttle * 92;
  p.speed += (targetSpeed - p.speed) * Math.min(1, 0.55 * dt);

  // Pitch and roll ease toward the commanded values.
  const pitchTarget = inp.pitch * 0.32;
  const rollTarget = inp.roll * 0.85;
  p.pitch += (pitchTarget - p.pitch) * Math.min(1, 3.2 * dt);
  p.roll += (rollTarget - p.roll) * Math.min(1, 3.5 * dt);

  // Bank turns the plane; the turn tightens with speed. 0.26 rad/s at
  // full bank keeps the ring course flyable without feeling twitchy.
  p.heading -= p.roll * 0.26 * dt * (0.5 + p.speed / 110);
  p.heading = normAngle(p.heading);

  // Vertical speed from pitch; stall adds a sink and a buffet.
  p.stalled = p.speed < CFG.STALL_SPEED;
  p.vs = p.speed * Math.sin(p.pitch) - (p.stalled ? 9 : 0);
  p.alt += p.vs * dt;

  // Advance across the island.
  p.x += Math.sin(p.heading) * p.speed * dt;
  p.z += Math.cos(p.heading) * p.speed * dt;

  // Soft world edge: steer back toward the island instead of a wall.
  if (Math.abs(p.x) > CFG.ISLAND_X + 900 || p.z < -1400 || p.z > 6200) {
    p.heading = turnToward(p.heading, Math.atan2(-p.x, 2400 - p.z), 0.5 * dt);
  }
  return p;
}

function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function turnToward(from, to, maxStep) {
  const d = normAngle(to - from);
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}

// 3D distance from the plane to a ring centre.
function distToRing(p, ring) {
  const dx = ring.x - p.x;
  const dy = ring.y - p.alt;
  const dz = ring.z - p.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function headingDeg(p) {
  let d = (p.heading * 180) / Math.PI;
  d = ((d % 360) + 360) % 360;
  return d;
}

function knots(p) {
  return p.speed * 1.944;
}

function feet(p) {
  return p.alt * 3.281;
}
