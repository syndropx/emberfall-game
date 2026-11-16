// audio.js — every sound in Emberfall is synthesised with WebAudio: no files, no network.
// The rifle is a noise burst over a falling square wave; the crystal rings like struck
// glass; the wave horn is two detuned saws swelling under a lowpass. One master gain
// keeps the whole mix tame.
let ctx = null;
let master = null;
let ambientNodes = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
}

function env(gain, t0, peak, decay) {
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
}

function tone({ type = 'sine', from = 440, to = null, dur = 0.2, vol = 0.2, delay = 0 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  env(g, t0, vol, dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.15, vol = 0.25, delay = 0, freq = 1800, q = 0.8 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, (dur * ctx.sampleRate) | 0);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = q;
  const g = ctx.createGain();
  env(g, t0, vol, dur);
  src.connect(filter); filter.connect(g); g.connect(master);
  src.start(t0);
}

export const sfx = {
  shot() { noise({ dur: 0.11, vol: 0.32, freq: 2600, q: 0.5 }); tone({ type: 'square', from: 210, to: 55, dur: 0.09, vol: 0.16 }); },
  empty() { tone({ type: 'square', from: 900, dur: 0.04, vol: 0.08 }); },
  reload() { tone({ type: 'square', from: 300, dur: 0.05, vol: 0.1 }); tone({ type: 'square', from: 520, dur: 0.05, vol: 0.12, delay: 0.16 }); tone({ type: 'square', from: 700, dur: 0.05, vol: 0.12, delay: 0.3 }); },
  hit() { tone({ type: 'triangle', from: 1250, to: 900, dur: 0.05, vol: 0.1 }); },
  kill() { tone({ type: 'sawtooth', from: 420, to: 60, dur: 0.22, vol: 0.16 }); noise({ dur: 0.18, vol: 0.14, freq: 900 }); },
  bolt() { tone({ type: 'sawtooth', from: 880, to: 220, dur: 0.16, vol: 0.05 }); },
  playerHurt() { tone({ type: 'sine', from: 130, to: 60, dur: 0.18, vol: 0.3 }); noise({ dur: 0.1, vol: 0.12, freq: 500 }); },
  crystalHurt() { tone({ type: 'sine', from: 1560, to: 1180, dur: 0.3, vol: 0.14 }); tone({ type: 'sine', from: 90, to: 50, dur: 0.3, vol: 0.28 }); },
  horn() { tone({ type: 'sawtooth', from: 98, dur: 0.9, vol: 0.14 }); tone({ type: 'sawtooth', from: 147, dur: 0.9, vol: 0.12, delay: 0.05 }); tone({ type: 'sawtooth', from: 196, dur: 0.9, vol: 0.08, delay: 0.1 }); },
  cleared() { tone({ type: 'triangle', from: 523, dur: 0.16, vol: 0.16 }); tone({ type: 'triangle', from: 659, dur: 0.16, vol: 0.16, delay: 0.12 }); tone({ type: 'triangle', from: 784, dur: 0.3, vol: 0.16, delay: 0.24 }); },
  upgrade() { tone({ type: 'triangle', from: 660, dur: 0.12, vol: 0.16 }); tone({ type: 'triangle', from: 880, dur: 0.12, vol: 0.16, delay: 0.09 }); tone({ type: 'triangle', from: 1320, dur: 0.24, vol: 0.16, delay: 0.18 }); },
  victory() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.34, vol: 0.17, delay: i * 0.15 })); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.36, vol: 0.17, delay: i * 0.17 })); },
};

export function startAmbient() {
  if (!ctx || ambientNodes) return;
  const g = ctx.createGain();
  g.gain.value = 0.035;
  const osc1 = ctx.createOscillator(); osc1.type = 'triangle'; osc1.frequency.value = 110;
  const osc2 = ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = 164.8;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.014;
  lfo.connect(lfoGain); lfoGain.connect(g.gain);
  osc1.connect(g); osc2.connect(g); g.connect(master);
  osc1.start(); osc2.start(); lfo.start();
  ambientNodes = { g, osc1, osc2, lfo };
}
export function stopAmbient() {
  if (!ambientNodes) return;
  for (const n of [ambientNodes.osc1, ambientNodes.osc2, ambientNodes.lfo]) { try { n.stop(); } catch { /* already stopped */ } }
  ambientNodes = null;
}
