// Sky Courier — all canvas drawing, own work. Pseudo-3D chase view:
// sky + sun + clouds + mountains, perspective ground cells, billboards,
// glowing rings, the plane sprite, HUD, lit instruments, and screens.

let rt = 0; // animation clock, seconds
let housesCache = null;
let treesCache = null;

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function text(c, s, x, y, font, color, align) {
  c.font = font;
  c.fillStyle = color;
  c.textAlign = align || 'left';
  c.textBaseline = 'alphabetic';
  c.fillText(s, x, y);
}

// Frame projection state, rebuilt each render.
let proj = { horizonY: 300, camY: 0, sinH: 0, cosH: 0, px: 0, pz: 0 };

function project(wx, wy, wz) {
  const dx = wx - proj.px;
  const dz = wz - proj.pz;
  const fwd = dx * proj.sinH + dz * proj.cosH;
  if (fwd < 10) return null;
  const lat = dx * proj.cosH - dz * proj.sinH;
  const scale = CFG.FOCAL / fwd;
  return {
    x: 640 + lat * scale,
    y: proj.horizonY + (proj.camY - wy) * scale,
    s: scale,
    fwd: fwd,
  };
}

// Like project(), but points at or behind the camera plane are pulled to
// just in front of it instead of vanishing: ground right under the plane
// then stretches to the bottom of the screen instead of leaving a gap.
function projectClamp(wx, wy, wz) {
  const dx = wx - proj.px;
  const dz = wz - proj.pz;
  let fwd = dx * proj.sinH + dz * proj.cosH;
  let lat = dx * proj.cosH - dz * proj.sinH;
  if (fwd < 12) {
    if (fwd > 0.5) lat = lat * (12 / fwd);
    else lat = 0;
    fwd = 12;
  }
  const scale = CFG.FOCAL / fwd;
  return {
    x: 640 + lat * scale,
    y: proj.horizonY + (proj.camY - wy) * scale,
    s: scale,
    fwd: fwd,
  };
}

function drawSky(c, g) {
  const p = g.plane;
  const P = CFG.PALETTE;
  const grad = c.createLinearGradient(0, 0, 0, proj.horizonY + 40);
  grad.addColorStop(0, P.skyTop);
  grad.addColorStop(0.55, P.skyMid);
  grad.addColorStop(1, P.skyLow);
  c.fillStyle = grad;
  // Fill the whole screen: the gradient's warm end becomes the haze
  // between the horizon and the farthest ground row, and the ground
  // paints over everything below it.
  c.fillRect(0, 0, 1280, 720);
  // Sun with glow, upper right.
  const sg = c.createRadialGradient(1010, 120, 8, 1010, 120, 110);
  sg.addColorStop(0, 'rgba(255, 246, 200, 0.95)');
  sg.addColorStop(0.35, 'rgba(255, 214, 130, 0.45)');
  sg.addColorStop(1, 'rgba(255, 214, 130, 0)');
  c.fillStyle = sg;
  c.fillRect(880, -10, 260, 260);
  c.fillStyle = '#fff7d6';
  c.beginPath();
  c.arc(1010, 120, 26, 0, Math.PI * 2);
  c.fill();
  // Clouds drift with heading parallax.
  const off = -headingDeg(p) * 2.0;
  c.fillStyle = 'rgba(255, 255, 255, 0.88)';
  for (const cl of g.clouds) {
    let sx = (cl.x + off) % 1440;
    if (sx < 0) sx += 1440;
    sx -= 80;
    const s = cl.s;
    c.beginPath();
    c.ellipse(sx, cl.y, 52 * s, 15 * s, 0, 0, Math.PI * 2);
    c.ellipse(sx + 34 * s, cl.y + 5 * s, 36 * s, 12 * s, 0, 0, Math.PI * 2);
    c.ellipse(sx - 36 * s, cl.y + 6 * s, 30 * s, 10 * s, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Distant mountain ridge along the horizon.
  const hd = headingDeg(p) * 6;
  c.beginPath();
  c.moveTo(0, proj.horizonY + 2);
  for (let sx = 0; sx <= 1280; sx += 20) {
    const h =
      26 +
      52 * Math.abs(Math.sin((sx + hd) * 0.006)) +
      22 * Math.sin((sx + hd) * 0.013 + 2);
    c.lineTo(sx, proj.horizonY + 2 - h);
  }
  c.lineTo(1280, proj.horizonY + 2);
  c.closePath();
  const mg = c.createLinearGradient(0, proj.horizonY - 110, 0, proj.horizonY + 2);
  mg.addColorStop(0, '#4a7ba6');
  mg.addColorStop(1, '#2c4f6e');
  c.fillStyle = mg;
  c.fill();
}

function drawGround(c, g) {
  const p = g.plane;
  const P = CFG.PALETTE;
  const CELL = CFG.CELL;
  const zFar = p.z + CFG.VIEW_DIST;
  const zNear = p.z + 60;
  for (let z = zFar; z > zNear; z -= CELL) {
    const iz = Math.floor((z - CELL / 2) / CELL);
    for (let x = Math.floor((p.x - CFG.VIEW_SIDE) / CELL) * CELL; x < p.x + CFG.VIEW_SIDE; x += CELL) {
      const ix = Math.floor(x / CELL);
      // Clamped projection: cells at/below the plane still paint the
      // bottom of the screen instead of vanishing.
      const a = projectClamp(x, 0, z - CELL);
      const b = projectClamp(x + CELL, 0, z - CELL);
      const d = projectClamp(x + CELL, 0, z);
      const e = projectClamp(x, 0, z);
      const col = cellColor(ix, iz);
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.lineTo(d.x, d.y);
      c.lineTo(e.x, e.y);
      c.closePath();
      c.fill();
      // Sea glitter.
      if (col === P.sea && hash2(ix, iz, 99) < 0.06) {
        const cxm = (ix + 0.5) * CELL;
        const czm = (iz + 0.5) * CELL;
        const m = project(cxm, 0, czm);
        if (m) {
          c.fillStyle = 'rgba(255, 255, 255, 0.55)';
          c.fillRect(m.x - 3, m.y - 1, 6, 2);
        }
      }
    }
  }
  // The runway is narrower than one terrain cell, so no cell centre ever
  // falls inside it: draw it as its own projected strip, over the cells.
  const R = CFG.RUNWAY;
  const r1 = projectClamp(R.x0, 0, R.z0);
  const r2 = projectClamp(R.x1, 0, R.z0);
  const r3 = projectClamp(R.x1, 0, R.z1);
  const r4 = projectClamp(R.x0, 0, R.z1);
  c.fillStyle = P.runway;
  c.beginPath();
  c.moveTo(r1.x, r1.y);
  c.lineTo(r2.x, r2.y);
  c.lineTo(r3.x, r3.y);
  c.lineTo(r4.x, r4.y);
  c.closePath();
  c.fill();
  // Centreline dashes + edge lines.
  c.fillStyle = P.runwayMark;
  for (let z = R.z0 + 20; z < R.z1 - 10; z += 60) {
    if (Math.floor(z / 60) % 2 !== 0) continue;
    const q1 = projectClamp(-4, 0, z);
    const q2 = projectClamp(4, 0, z);
    const q3 = projectClamp(4, 0, z + 30);
    const q4 = projectClamp(-4, 0, z + 30);
    c.beginPath();
    c.moveTo(q1.x, q1.y);
    c.lineTo(q2.x, q2.y);
    c.lineTo(q3.x, q3.y);
    c.lineTo(q4.x, q4.y);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = 'rgba(242, 242, 242, 0.8)';
  c.lineWidth = 2;
  for (const ex of [R.x0 + 4, R.x1 - 4]) {
    const e1 = projectClamp(ex, 0, R.z0);
    const e2 = projectClamp(ex, 0, R.z1);
    c.beginPath();
    c.moveTo(e1.x, e1.y);
    c.lineTo(e2.x, e2.y);
    c.stroke();
  }
}

function drawBillboards(c, g) {
  if (!housesCache) housesCache = townHouses();
  if (!treesCache) treesCache = trees();
  const items = [];
  for (const h of housesCache) items.push({ x: h.x, z: h.z, kind: 'house', w: h.w, hue: h.hue });
  for (const t of treesCache) items.push({ x: t.x, z: t.z, kind: 'tree', s: t.s });
  items.push({ x: 60, z: -60, kind: 'sock' });
  items.sort((a, b) => {
    const da = Math.hypot(a.x - g.plane.x, a.z - g.plane.z);
    const db = Math.hypot(b.x - g.plane.x, b.z - g.plane.z);
    return db - da;
  });
  for (const it of items) {
    const q = project(it.x, 0, it.z);
    if (!q || q.fwd < 15 || q.x < -80 || q.x > 1360 || q.y > 760) continue;
    if (it.kind === 'house') {
      const w = it.w * q.s;
      const h = w * 0.75;
      if (w < 2) continue;
      c.fillStyle = it.hue < 0.5 ? '#e8dcc8' : '#d9b48f';
      c.fillRect(q.x - w / 2, q.y - h, w, h);
      c.fillStyle = it.hue < 0.33 ? '#a34d3a' : it.hue < 0.66 ? '#7a5a3a' : '#4a6b8a';
      c.beginPath();
      c.moveTo(q.x - w / 2 - 2, q.y - h);
      c.lineTo(q.x, q.y - h - w * 0.45);
      c.lineTo(q.x + w / 2 + 2, q.y - h);
      c.closePath();
      c.fill();
    } else if (it.kind === 'tree') {
      const s = it.s * q.s;
      if (s < 0.15) continue;
      c.fillStyle = '#5a4632';
      c.fillRect(q.x - s * 0.12, q.y - s * 1.1, s * 0.24, s * 1.1);
      c.fillStyle = '#2f7d32';
      c.beginPath();
      c.arc(q.x, q.y - s * 1.5, s * 0.85, 0, Math.PI * 2);
      c.arc(q.x - s * 0.5, q.y - s * 1.1, s * 0.55, 0, Math.PI * 2);
      c.arc(q.x + s * 0.5, q.y - s * 1.1, s * 0.55, 0, Math.PI * 2);
      c.fill();
    } else {
      // Windsock beside the runway threshold.
      const s = q.s;
      c.strokeStyle = '#e8e8e8';
      c.lineWidth = Math.max(1, 2 * s);
      c.beginPath();
      c.moveTo(q.x, q.y);
      c.lineTo(q.x, q.y - 13 * s);
      c.stroke();
      c.fillStyle = '#ff7a1a';
      c.beginPath();
      c.moveTo(q.x, q.y - 13 * s);
      c.lineTo(q.x + 11 * s, q.y - 11 * s);
      c.lineTo(q.x, q.y - 9 * s);
      c.closePath();
      c.fill();
    }
  }
}

function drawRings(c, g) {
  for (let i = 0; i < g.rings.length; i++) {
    const r = g.rings[i];
    if (r.hit) continue;
    const q = project(r.x, r.y, r.z);
    if (!q || q.fwd < 15) continue;
    const rad = CFG.RING_RADIUS * q.s;
    if (rad < 2 || q.x < -120 || q.x > 1400 || q.y < -80 || q.y > 760) continue;
    const isNext = i === g.ringIndex;
    c.save();
    c.shadowBlur = isNext ? 22 : 10;
    c.shadowColor = isNext ? '#ffb347' : '#6fd8ff';
    c.strokeStyle = r.missed
      ? 'rgba(160, 160, 160, 0.35)'
      : isNext
        ? 'rgba(255, 179, 71, ' + (0.75 + 0.25 * Math.sin(rt * 4)) + ')'
        : 'rgba(111, 216, 255, 0.55)';
    c.lineWidth = Math.max(3, rad * 0.14);
    c.beginPath();
    c.arc(q.x, q.y, rad, 0, Math.PI * 2);
    c.stroke();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    c.lineWidth = Math.max(1.5, rad * 0.05);
    c.beginPath();
    c.arc(q.x, q.y, rad * 0.82, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
}

function drawPlaneShadow(c, g) {
  const p = g.plane;
  if (p.alt > 500) return;
  const q = project(p.x, 0, p.z + 25);
  if (!q) return;
  const rx = 4200 / (p.alt + 25);
  c.fillStyle = 'rgba(10, 20, 10, ' + (0.32 * (1 - p.alt / 500)).toFixed(2) + ')';
  c.beginPath();
  c.ellipse(q.x, q.y, rx, rx * 0.28, 0, 0, Math.PI * 2);
  c.fill();
}

function drawPlane(c, g) {
  const p = g.plane;
  c.save();
  c.translate(640, 468 - p.pitch * 90);
  c.rotate(p.roll);
  const propA = rt * 30;
  // Prop disc + blades (nose is up-screen).
  c.fillStyle = 'rgba(255, 255, 255, 0.22)';
  c.beginPath();
  c.ellipse(0, -80, 46, 11, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(40, 40, 40, 0.75)';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-Math.cos(propA) * 44, -80 - Math.sin(propA) * 9);
  c.lineTo(Math.cos(propA) * 44, -80 + Math.sin(propA) * 9);
  c.stroke();
  c.fillStyle = '#263238';
  c.beginPath();
  c.arc(0, -80, 7, 0, Math.PI * 2);
  c.fill();
  // Main wings.
  const wg = c.createLinearGradient(0, -30, 0, 20);
  wg.addColorStop(0, '#ffffff');
  wg.addColorStop(1, '#c9d4dc');
  c.fillStyle = wg;
  c.beginPath();
  c.moveTo(-186, 2);
  c.quadraticCurveTo(-90, -26, 0, -16);
  c.quadraticCurveTo(90, -26, 186, 2);
  c.quadraticCurveTo(90, 16, 0, 12);
  c.quadraticCurveTo(-90, 16, -186, 2);
  c.closePath();
  c.fill();
  c.fillStyle = '#f58220';
  c.fillRect(-186, -3, 16, 10);
  c.fillRect(170, -3, 16, 10);
  // Fuselage: tail (near viewer, bottom) wide, nose narrow.
  const fg = c.createLinearGradient(-30, 0, 30, 0);
  fg.addColorStop(0, '#f58220');
  fg.addColorStop(0.5, '#ff9a3d');
  fg.addColorStop(1, '#e85d1f');
  c.fillStyle = fg;
  c.beginPath();
  c.moveTo(-14, -78);
  c.quadraticCurveTo(-20, 0, -28, 88);
  c.quadraticCurveTo(0, 98, 28, 88);
  c.quadraticCurveTo(20, 0, 14, -78);
  c.quadraticCurveTo(0, -88, -14, -78);
  c.closePath();
  c.fill();
  // Cheatline stripe.
  c.fillStyle = '#0e7490';
  c.fillRect(-24, 8, 48, 7);
  // Cockpit windows.
  c.fillStyle = '#17324a';
  rr(c, -11, -58, 9, 14, 3);
  c.fill();
  rr(c, 2, -58, 9, 14, 3);
  c.fill();
  // Registration.
  text(c, 'SKY-01', 0, 52, '700 12px system-ui, sans-serif', '#ffffff', 'center');
  // Horizontal stabilizers.
  c.fillStyle = '#dfe7ec';
  c.beginPath();
  c.moveTo(-96, 66);
  c.quadraticCurveTo(0, 56, 96, 66);
  c.quadraticCurveTo(0, 78, -96, 66);
  c.closePath();
  c.fill();
  // Tail fin (toward viewer, bottom).
  c.fillStyle = '#0e7490';
  c.beginPath();
  c.moveTo(-19, 86);
  c.lineTo(19, 86);
  c.lineTo(0, 132);
  c.closePath();
  c.fill();
  // Nav lights.
  c.fillStyle = '#ff3b30';
  c.beginPath();
  c.arc(-186, -2, 4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#34d17b';
  c.beginPath();
  c.arc(186, -2, 4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(0, 132, 3.5, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function gauge(c, cx, cy, r, label, value, max, unit, redFrom) {
  c.save();
  c.fillStyle = '#101f2e';
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#2e5a78';
  c.lineWidth = 3;
  c.stroke();
  const start = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  if (redFrom !== undefined) {
    c.strokeStyle = '#e5484d';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(cx, cy, r - 6, start + (sweep * redFrom) / max, start + sweep);
    c.stroke();
  }
  c.strokeStyle = '#9fc6e0';
  c.fillStyle = '#cfe8f7';
  c.lineWidth = 2;
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const v = (max / steps) * i;
    const a = start + (sweep * v) / max;
    const x1 = cx + Math.cos(a) * (r - 12);
    const y1 = cy + Math.sin(a) * (r - 12);
    const x2 = cx + Math.cos(a) * (r - 5);
    const y2 = cy + Math.sin(a) * (r - 5);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    text(
      c,
      String(Math.round(v)),
      cx + Math.cos(a) * (r - 24),
      cy + Math.sin(a) * (r - 24) + 4,
      '600 10px system-ui, sans-serif',
      '#9fc6e0',
      'center'
    );
  }
  const na = start + (sweep * Math.max(0, Math.min(max, value))) / max;
  c.strokeStyle = '#ffd94d';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx, cy);
  c.lineTo(cx + Math.cos(na) * (r - 14), cy + Math.sin(na) * (r - 14));
  c.stroke();
  c.fillStyle = '#0b1520';
  c.beginPath();
  c.arc(cx, cy, 5, 0, Math.PI * 2);
  c.fill();
  // Digital readout rides on the label line, not the dial face, so it
  // never collides with the tick numbers.
  text(c, label + '  ' + unit, cx, cy + r + 14, '700 11px system-ui, sans-serif', '#8fb8d4', 'center');
  c.restore();
}

function drawPanel(c, g) {
  const p = g.plane;
  c.save();
  c.fillStyle = 'rgba(9, 20, 32, 0.92)';
  rr(c, 8, 588, 1264, 124, 12);
  c.fill();
  c.strokeStyle = '#274b66';
  c.lineWidth = 2;
  c.stroke();
  gauge(c, 118, 640, 46, 'AIRSPEED', knots(p), 200, Math.round(knots(p)) + ' KT', 165);
  gauge(c, 268, 640, 46, 'ALTITUDE', feet(p), 3000, Math.round(feet(p)) + ' FT');
  // Attitude indicator (artificial horizon).
  const ax = 640;
  const ay = 640;
  const ar = 50;
  c.save();
  c.beginPath();
  c.arc(ax, ay, ar, 0, Math.PI * 2);
  c.clip();
  c.translate(ax, ay);
  c.rotate(-p.roll);
  c.translate(0, p.pitch * 55);
  c.fillStyle = '#4a90d9';
  c.fillRect(-ar - 4, -ar - 60, ar * 2 + 8, ar + 60);
  c.fillStyle = '#8a5a2b';
  c.fillRect(-ar - 4, 0, ar * 2 + 8, ar + 60);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-ar - 4, 0);
  c.lineTo(ar + 4, 0);
  c.stroke();
  c.restore();
  c.strokeStyle = '#2e5a78';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(ax, ay, ar, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = '#ffd94d';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(ax - 24, ay);
  c.lineTo(ax - 6, ay);
  c.moveTo(ax + 6, ay);
  c.lineTo(ax + 24, ay);
  c.stroke();
  c.fillStyle = '#ffd94d';
  c.beginPath();
  c.arc(ax, ay, 3, 0, Math.PI * 2);
  c.fill();
  text(c, 'ATTITUDE', ax, ay + ar + 14, '700 11px system-ui, sans-serif', '#8fb8d4', 'center');
  // Compass gauge.
  const cx2 = 920;
  const cy2 = 640;
  const cr = 46;
  c.fillStyle = '#101f2e';
  c.beginPath();
  c.arc(cx2, cy2, cr, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#2e5a78';
  c.lineWidth = 3;
  c.stroke();
  const hd = headingDeg(p);
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  c.save();
  c.translate(cx2, cy2);
  for (let i = 0; i < 8; i++) {
    const a = ((i * 45 - hd) * Math.PI) / 180;
    const x = Math.sin(a) * (cr - 14);
    const y = -Math.cos(a) * (cr - 14);
    text(c, labels[i], x, y + 4, '700 12px system-ui, sans-serif', i % 2 === 0 ? '#ffd94d' : '#9fc6e0', 'center');
  }
  c.restore();
  c.fillStyle = '#e5484d';
  c.beginPath();
  c.moveTo(cx2 - 6, cy2 - cr + 2);
  c.lineTo(cx2 + 6, cy2 - cr + 2);
  c.lineTo(cx2, cy2 - cr + 12);
  c.closePath();
  c.fill();
  text(c, 'HEADING', cx2, cy2 + cr + 14, '700 11px system-ui, sans-serif', '#8fb8d4', 'center');
  text(c, String(Math.round(hd)).padStart(3, '0') + '°', cx2, cy2 + 5, '700 13px system-ui, sans-serif', '#ffffff', 'center');
  // Vertical speed: needle maps -20..+20 m/s onto the 0..60 dial.
  const vsClamped = Math.max(-20, Math.min(20, p.vs));
  gauge(c, 1078, 640, 42, 'VERT SPD', (vsClamped + 20) * 1.5, 60, Math.round(p.vs * 196) + ' FPM');
  // Throttle bar.
  const bx = 1176;
  c.fillStyle = '#101f2e';
  rr(c, bx, 606, 26, 86, 5);
  c.fill();
  c.fillStyle = '#35c759';
  const th = p.throttle * 80;
  rr(c, bx + 3, 606 + 80 - th, 20, th, 4);
  c.fill();
  text(c, 'THR', bx + 13, 706, '700 11px system-ui, sans-serif', '#8fb8d4', 'center');
  text(c, Math.round(p.throttle * 100) + '%', bx + 13, 600, '700 11px system-ui, sans-serif', '#ffffff', 'center');
  c.restore();
}

function drawHUD(c, g) {
  const p = g.plane;
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.7)';
  c.shadowBlur = 6;
  text(c, 'ALT ' + Math.round(feet(p)).toLocaleString('en-US') + ' FT', 24, 40, '800 30px system-ui, sans-serif', '#ffffff');
  text(c, 'SPD ' + Math.round(knots(p)) + ' KT', 24, 74, '800 22px system-ui, sans-serif', '#cfe8f7');
  // Compass strip, top centre.
  const hd = headingDeg(p);
  c.fillStyle = 'rgba(9, 20, 32, 0.65)';
  rr(c, 420, 10, 440, 46, 8);
  c.fill();
  c.save();
  rr(c, 420, 10, 440, 46, 8);
  c.clip();
  for (let d = -75; d <= 75; d += 15) {
    const deg = Math.round((hd + d) / 15) * 15;
    const rel = ((deg - hd + 540) % 360) - 180;
    if (Math.abs(rel) > 75) continue;
    const x = 640 + (rel / 75) * 210;
    const isCard = deg % 90 === 0;
    c.strokeStyle = '#cfe8f7';
    c.lineWidth = isCard ? 3 : 1.5;
    c.beginPath();
    c.moveTo(x, isCard ? 16 : 22);
    c.lineTo(x, 34);
    c.stroke();
    if (isCard) {
      const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
      text(c, names[((deg % 360) + 360) % 360] || String(deg), x, 50, '700 13px system-ui, sans-serif', '#ffd94d', 'center');
    }
  }
  c.restore();
  c.fillStyle = '#ffd94d';
  c.beginPath();
  c.moveTo(634, 12);
  c.lineTo(646, 12);
  c.lineTo(640, 24);
  c.closePath();
  c.fill();
  text(c, String(Math.round(hd)).padStart(3, '0') + '°', 640, 74, '800 18px system-ui, sans-serif', '#ffffff', 'center');
  // Right block: score, time, rings.
  const mm = Math.floor(Math.max(0, g.timeLeft) / 60);
  const ss = String(Math.floor(Math.max(0, g.timeLeft) % 60)).padStart(2, '0');
  text(c, 'SCORE ' + g.score, 1170, 40, '800 26px system-ui, sans-serif', '#ffd94d', 'right');
  text(c, 'TIME ' + mm + ':' + ss, 1170, 70, '700 18px system-ui, sans-serif', '#ffffff', 'right');
  text(c, 'RINGS ' + ringsHit(g) + '/' + g.rings.length, 1170, 96, '700 18px system-ui, sans-serif', '#7dff8a', 'right');
  // Mute / pause buttons (mouse).
  c.shadowBlur = 0;
  drawSmallButton(c, 1188, 8, 36, 28, isMuted() ? 'MUTE' : 'SOUND', 'mute');
  drawSmallButton(c, 1232, 8, 36, 28, 'II', 'pause');
  // Stall warning.
  if (p.stalled && g.screen === 'play') {
    if (Math.floor(rt * 4) % 2 === 0) {
      text(c, 'STALL — NOSE DOWN, ADD POWER', 640, 210, '800 26px system-ui, sans-serif', '#ff5a4d', 'center');
    }
  }
  // Banner.
  if (g.banner) {
    c.globalAlpha = Math.max(0, 1 - g.banner.t / 3.2);
    text(c, g.banner.text, 640, 130, '800 26px system-ui, sans-serif', '#ffb347', 'center');
    c.globalAlpha = 1;
  }
  // Score popups.
  g.popups.forEach((pop, i) => {
    c.globalAlpha = Math.max(0, 1 - pop.t / 1.6);
    text(c, pop.text, 640, 300 + i * 36 - pop.t * 22, '800 30px system-ui, sans-serif', pop.color, 'center');
    c.globalAlpha = 1;
  });
  // Next-ring arrow + distance. Once the course is done, the arrow
  // points home at the runway instead.
  if (g.screen === 'play' && g.ringIndex < g.rings.length) {
    const ring = g.rings[g.ringIndex];
    const q = project(ring.x, ring.y, ring.z);
    const d = Math.round(Math.hypot(ring.x - p.x, ring.y - p.alt, ring.z - p.z));
    let ax = 640;
    let ay = 330;
    let ang = -Math.PI / 2;
    if (q && q.fwd > 10) {
      ang = Math.atan2(q.y - 330, q.x - 640);
      ax = 640 + Math.cos(ang) * 130;
      ay = 330 + Math.sin(ang) * 130;
    } else {
      const bearing = Math.atan2(ring.x - p.x, ring.z - p.z);
      const rel = normAngle(bearing - p.heading);
      ang = rel > 0 ? 0 : Math.PI;
      ax = 640 + Math.cos(ang) * 130;
      ay = 330;
    }
    c.save();
    c.translate(ax, ay);
    c.rotate(ang);
    c.fillStyle = '#ffb347';
    c.beginPath();
    c.moveTo(16, 0);
    c.lineTo(-10, -11);
    c.lineTo(-4, 0);
    c.lineTo(-10, 11);
    c.closePath();
    c.fill();
    c.restore();
    c.shadowColor = 'rgba(0, 0, 0, 0.85)';
    c.shadowBlur = 5;
    text(c, 'RING ' + (g.ringIndex + 1) + '  •  ' + d + ' m', ax, ay + 34, '700 15px system-ui, sans-serif', '#ffd94d', 'center');
    c.shadowBlur = 0;
  } else if (g.screen === 'play' && g.returning) {
    const q = project(0, 0, 350);
    const d = Math.round(Math.hypot(p.x - 0, p.z - 350));
    let ax = 640;
    let ay = 330;
    let ang = -Math.PI / 2;
    if (q && q.fwd > 10) {
      ang = Math.atan2(q.y - 330, q.x - 640);
      ax = 640 + Math.cos(ang) * 130;
      ay = 330 + Math.sin(ang) * 130;
    } else {
      const bearing = Math.atan2(0 - p.x, 350 - p.z);
      const rel = normAngle(bearing - p.heading);
      ang = rel > 0 ? 0 : Math.PI;
      ax = 640 + Math.cos(ang) * 130;
    }
    c.save();
    c.translate(ax, ay);
    c.rotate(ang);
    c.fillStyle = '#7dff8a';
    c.beginPath();
    c.moveTo(16, 0);
    c.lineTo(-10, -11);
    c.lineTo(-4, 0);
    c.lineTo(-10, 11);
    c.closePath();
    c.fill();
    c.restore();
    c.shadowColor = 'rgba(0, 0, 0, 0.85)';
    c.shadowBlur = 5;
    text(c, 'RUNWAY  •  ' + d + ' m', ax, ay + 34, '700 15px system-ui, sans-serif', '#7dff8a', 'center');
    c.shadowBlur = 0;
  }
  c.restore();
}

function drawSmallButton(c, x, y, w, h, label, action) {
  const hover =
    input.mouse.x >= x && input.mouse.x <= x + w && input.mouse.y >= y && input.mouse.y <= y + h;
  c.fillStyle = hover ? 'rgba(60, 100, 140, 0.9)' : 'rgba(9, 20, 32, 0.65)';
  rr(c, x, y, w, h, 6);
  c.fill();
  c.strokeStyle = '#2e5a78';
  c.lineWidth = 1.5;
  c.stroke();
  text(c, label, x + w / 2, y + h / 2 + 4, '700 10px system-ui, sans-serif', '#cfe8f7', 'center');
  registerButton(x, y, w, h, action, label);
}

function drawButton(c, x, y, w, h, label, action, primary) {
  const hover =
    input.mouse.x >= x && input.mouse.x <= x + w && input.mouse.y >= y && input.mouse.y <= y + h;
  c.fillStyle = primary ? (hover ? '#ffb347' : '#f58220') : hover ? '#3a5a78' : '#1d3247';
  rr(c, x, y, w, h, 10);
  c.fill();
  c.strokeStyle = primary ? '#ffd94d' : '#2e5a78';
  c.lineWidth = 2;
  c.stroke();
  text(c, label, x + w / 2, y + h / 2 + 7, '800 20px system-ui, sans-serif', primary ? '#1a1206' : '#eaf4fb', 'center');
  registerButton(x, y, w, h, action, label);
}

function drawTitle(c, g) {
  c.fillStyle = 'rgba(6, 18, 32, 0.55)';
  c.fillRect(0, 0, 1280, 720);
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.8)';
  c.shadowBlur = 14;
  text(c, 'SKY COURIER', 640, 190, '800 68px system-ui, sans-serif', '#ffb347', 'center');
  text(c, 'Island ring run — 8 rings, one runway, 3 minutes', 640, 232, '600 24px system-ui, sans-serif', '#ffffff', 'center');
  c.restore();
  c.fillStyle = 'rgba(9, 20, 32, 0.75)';
  rr(c, 380, 268, 520, 150, 12);
  c.fill();
  c.strokeStyle = '#274b66';
  c.lineWidth = 2;
  c.stroke();
  text(c, 'FLY THE RINGS, THEN LAND ON THE RUNWAY', 640, 302, '700 16px system-ui, sans-serif', '#cfe8f7', 'center');
  text(c, 'Arrows / WASD — pitch & bank      W / S — throttle', 640, 336, '600 17px system-ui, sans-serif', '#ffffff', 'center');
  text(c, 'P — pause      M — mute      Mouse — buttons', 640, 364, '600 17px system-ui, sans-serif', '#ffffff', 'center');
  text(c, 'Ground anywhere but the runway is a crash. Mind the stall!', 640, 392, '600 17px system-ui, sans-serif', '#ffd94d', 'center');
  if (g.best > 0) {
    text(c, 'BEST SCORE  ' + g.best, 640, 448, '800 22px system-ui, sans-serif', '#7dff8a', 'center');
  }
  drawButton(c, 520, 480, 240, 56, 'START FLIGHT', 'start', true);
  text(c, 'or press Enter', 640, 566, '600 15px system-ui, sans-serif', '#9fc6e0', 'center');
}

function drawPause(c) {
  c.fillStyle = 'rgba(6, 18, 32, 0.6)';
  c.fillRect(0, 0, 1280, 720);
  text(c, 'PAUSED', 640, 250, '800 56px system-ui, sans-serif', '#ffffff', 'center');
  drawButton(c, 520, 300, 240, 52, 'RESUME', 'resume', true);
  drawButton(c, 520, 368, 240, 52, 'RESTART', 'restart', false);
  drawButton(c, 520, 436, 240, 52, 'TITLE SCREEN', 'title', false);
}

function drawEnd(c, g) {
  c.fillStyle = 'rgba(6, 18, 32, 0.62)';
  c.fillRect(0, 0, 1280, 720);
  c.fillStyle = 'rgba(9, 20, 32, 0.92)';
  rr(c, 340, 130, 600, 430, 14);
  c.fill();
  c.strokeStyle = '#274b66';
  c.lineWidth = 2;
  c.stroke();
  const title =
    g.endKind === 'landed' ? 'LANDED!' : g.endKind === 'crashed' ? 'CRASHED' : 'TIME UP';
  const tcol = g.endKind === 'landed' ? '#7dff8a' : g.endKind === 'crashed' ? '#ff5a4d' : '#ffb347';
  text(c, title, 640, 205, '800 52px system-ui, sans-serif', tcol, 'center');
  if (g.landingLabel) {
    text(c, g.landingLabel, 640, 245, '700 22px system-ui, sans-serif', '#ffd94d', 'center');
  }
  text(c, 'SCORE  ' + g.score, 640, 305, '800 34px system-ui, sans-serif', '#ffffff', 'center');
  text(c, 'RINGS  ' + ringsHit(g) + ' / ' + g.rings.length, 640, 345, '700 20px system-ui, sans-serif', '#cfe8f7', 'center');
  if (g.landingScore > 0) {
    text(c, 'LANDING BONUS  +' + g.landingScore, 640, 378, '700 20px system-ui, sans-serif', '#7dff8a', 'center');
  }
  text(c, 'BEST  ' + g.best, 640, 411, '700 20px system-ui, sans-serif', '#9fc6e0', 'center');
  drawButton(c, 520, 445, 240, 52, 'FLY AGAIN', 'restart', true);
  text(c, 'or press Enter', 640, 528, '600 15px system-ui, sans-serif', '#9fc6e0', 'center');
}

function render(c, g, inp, dt) {
  rt += dt;
  const p = g.plane;
  // Cloud drift.
  for (const cl of g.clouds) {
    cl.x += cl.v * dt;
    if (cl.x > 1420) cl.x = -160;
  }
  proj.horizonY = CFG.HORIZON + p.pitch * 520;
  proj.camY = p.alt + 3;
  proj.sinH = Math.sin(p.heading);
  proj.cosH = Math.cos(p.heading);
  proj.px = p.x;
  proj.pz = p.z;

  drawSky(c, g);
  // World frame rolls with the plane; HUD and panel stay level.
  c.save();
  c.translate(640, 380);
  c.rotate(-p.roll * 0.35);
  c.translate(-640, -380);
  drawGround(c, g);
  drawBillboards(c, g);
  drawRings(c, g);
  drawPlaneShadow(c, g);
  c.restore();

  drawPlane(c, g);
  drawHUD(c, g);
  if (g.screen !== 'title' && g.screen !== 'end') drawPanel(c, g);
  if (g.screen === 'title') drawTitle(c, g);
  else if (g.screen === 'pause') drawPause(c);
  else if (g.screen === 'end') drawEnd(c, g);
}
