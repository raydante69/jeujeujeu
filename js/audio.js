// Tiny synthesized chiptune SFX via the Web Audio API — no audio files. Respects
// the sfx setting and only starts the AudioContext after a user gesture.
import { getSetting } from './state.js';

let ctx = null;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// name -> [ { freq, dur, type, gain } ... ]
const PATCHES = {
  select:    [{ f: 660, d: 0.06, t: 'square', g: 0.18 }],
  hit:       [{ f: 220, d: 0.07, t: 'square', g: 0.2 }],
  hitStrong: [{ f: 160, d: 0.05, t: 'sawtooth', g: 0.25 }, { f: 320, d: 0.08, t: 'square', g: 0.2, delay: 0.04 }],
  hitWeak:   [{ f: 180, d: 0.05, t: 'triangle', g: 0.12 }],
  faint:     [{ f: 300, d: 0.12, t: 'square', g: 0.2 }, { f: 120, d: 0.18, t: 'square', g: 0.18, delay: 0.1 }],
  catch:     [{ f: 520, d: 0.08, t: 'square', g: 0.2 }, { f: 780, d: 0.1, t: 'square', g: 0.2, delay: 0.09 }],
  badge:     [{ f: 660, d: 0.09, t: 'square', g: 0.2 }, { f: 880, d: 0.09, t: 'square', g: 0.2, delay: 0.09 }, { f: 1175, d: 0.14, t: 'square', g: 0.2, delay: 0.18 }],
  win:       [{ f: 523, d: 0.12, t: 'square', g: 0.2 }, { f: 659, d: 0.12, t: 'square', g: 0.2, delay: 0.12 }, { f: 784, d: 0.12, t: 'square', g: 0.2, delay: 0.24 }, { f: 1047, d: 0.24, t: 'square', g: 0.2, delay: 0.36 }],
  lose:      [{ f: 392, d: 0.18, t: 'sawtooth', g: 0.2 }, { f: 262, d: 0.3, t: 'sawtooth', g: 0.2, delay: 0.16 }],
};

export function sfx(name) {
  if (!getSetting('sfx')) return;
  const c = ac();
  if (!c) return;
  const patch = PATCHES[name];
  if (!patch) return;
  const now = c.currentTime;
  for (const note of patch) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = note.t;
    osc.frequency.value = note.f;
    const start = now + (note.delay || 0);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(note.g, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.d);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + note.d + 0.02);
  }
}

// Music is intentionally off by default (no copyrighted tracks bundled). These
// stubs keep the Settings toggle wired for a future original soundtrack.
export function startMusic() { /* no-op in v1 */ }
export function stopMusic() { /* no-op in v1 */ }
