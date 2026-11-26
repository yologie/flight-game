// Sky Courier — WebAudio synth sounds, own work. No audio files, no
// network. Everything is generated: engine hum, wind, ring chime, thump.
// AudioContext is created lazily on the first user gesture; muted state
// persists for the session.

let audioCtx = null;
let masterGain = null;
let engOsc1 = null;
let engOsc2 = null;
let engGain = null;
let windSrc = null;
let windGain = null;
let windFilter = null;
let audioMuted = false;

function ensureAudio() {
  if (audioCtx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = audioMuted ? 0 : 0.5;
    masterGain.connect(audioCtx.destination);
    // Engine: two detuned saws through a lowpass, pitch follows throttle.
    engOsc1 = audioCtx.createOscillator();
    engOsc1.type = 'sawtooth';
    engOsc1.frequency.value = 55;
    engOsc2 = audioCtx.createOscillator();
    engOsc2.type = 'sawtooth';
    engOsc2.frequency.value = 82;
    const engFilter = audioCtx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 420;
    engGain = audioCtx.createGain();
    engGain.gain.value = 0;
    engOsc1.connect(engFilter);
    engOsc2.connect(engFilter);
    engFilter.connect(engGain);
    engGain.connect(masterGain);
    engOsc1.start();
    engOsc2.start();
    // Wind: looped noise through a bandpass, gain follows airspeed.
    const len = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    windSrc = audioCtx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    windFilter = audioCtx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    windGain = audioCtx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSrc.start();
    return true;
  } catch (e) {
    return false;
  }
}

function unlockAudio() {
  if (ensureAudio() && audioCtx.state === 'suspended') audioCtx.resume();
}

function setMuted(m) {
  audioMuted = m;
  if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(m ? 0 : 0.5, audioCtx.currentTime, 0.05);
}

function isMuted() {
  return audioMuted;
}

// Called every frame while flying: throttle 0..1, speed m/s, flying bool.
function updateEngine(throttle, speed, flying) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const on = flying && !audioMuted;
  const f = 48 + throttle * 55 + speed * 0.35;
  engOsc1.frequency.setTargetAtTime(f, t, 0.08);
  engOsc2.frequency.setTargetAtTime(f * 1.494, t, 0.08);
  // Stall buffet: the engine note wobbles when the wing is stalled.
  const stallWobble = speed < 35 ? 0.8 + 0.2 * Math.sin(t * 22) : 1;
  engGain.gain.setTargetAtTime(on ? (0.05 + throttle * 0.075) * stallWobble : 0, t, 0.1);
  windGain.gain.setTargetAtTime(on ? Math.min(0.12, speed * 0.0011) : 0, t, 0.15);
  windFilter.frequency.setTargetAtTime(500 + speed * 9, t, 0.2);
}

function blip(freq, dur, vol, when) {
  if (!audioCtx || audioMuted) return;
  const t = audioCtx.currentTime + (when || 0);
  const o = audioCtx.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function playChime() {
  if (!ensureAudio()) return;
  blip(659, 0.16, 0.22, 0);
  blip(880, 0.2, 0.22, 0.09);
  blip(1318, 0.3, 0.18, 0.18);
}

function playThump() {
  if (!ensureAudio() || !audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.22);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + 0.3);
}

function playClick() {
  if (!ensureAudio()) return;
  blip(1200, 0.06, 0.12, 0);
}
