// Sky Courier — keyboard + mouse input, own work.
// Keys: arrows pitch/bank, A/D bank, W/S/Shift/Ctrl/+/- throttle,
// P pause, M mute, Enter start/restart. Mouse: clickable buttons.
// The game reads input.state each frame; buttons are registered by the
// renderer with pixel rects and an action name.

const input = {
  keys: {},
  pitch: 0, // -1 (nose down) .. +1 (nose up)
  roll: 0, // -1 (left) .. +1 (right)
  throttleUp: false,
  throttleDown: false,
  buttons: [], // {x, y, w, h, action, label}
  mouse: { x: 0, y: 0, clicked: null },
};

const KEYMAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'w',
  KeyS: 's',
  KeyA: 'a',
  KeyD: 'd',
  ShiftLeft: 'shift',
  ShiftRight: 'shift',
  ControlLeft: 'ctrl',
  ControlRight: 'ctrl',
  Equal: 'plus',
  Minus: 'minus',
  KeyP: 'p',
  KeyM: 'm',
  Enter: 'enter',
  NumpadEnter: 'enter',
  Space: 'space',
};

function initInput(canvas, onKey) {
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    if (['up', 'down', 'left', 'right', 'space'].includes(k)) e.preventDefault();
    if (!e.repeat) {
      input.keys[k] = true;
      if (onKey) onKey(k);
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) input.keys[k] = false;
  });
  window.addEventListener('blur', () => {
    input.keys = {};
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * 1280;
    input.mouse.y = ((e.clientY - r.top) / r.height) * 720;
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 1280;
    const my = ((e.clientY - r.top) / r.height) * 720;
    input.mouse.clicked = { x: mx, y: my };
  });
}

// Recompute held axes once per frame. Pitch is arrows only; W/S drive
// the throttle, never the pitch.
function pollInput() {
  const k = input.keys;
  input.pitch = (k.up ? 1 : 0) - (k.down ? 1 : 0);
  input.roll = (k.right || k.d ? 1 : 0) - (k.left || k.a ? 1 : 0);
  input.throttleUp = !!(k.w || k.shift || k.plus);
  input.throttleDown = !!(k.s || k.ctrl || k.minus);
}

// Consume a click: returns the action of the button hit, or null.
function consumeClick() {
  const c = input.mouse.clicked;
  input.mouse.clicked = null;
  if (!c) return null;
  for (const b of input.buttons) {
    if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) {
      return b.action;
    }
  }
  return null;
}

function clearButtons() {
  input.buttons.length = 0;
}

function registerButton(x, y, w, h, action, label) {
  input.buttons.push({ x, y, w, h, action, label });
}
