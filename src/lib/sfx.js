// Tiny synthesized chiptune SFX via the Web Audio API — no audio files.
// The AudioContext only starts after a user gesture (browser policy), so the
// first call may be a no-op until the player has interacted with the page.

let ctx = null
let enabled = true

function ac() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)() }
    catch { ctx = null }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setSfxEnabled(v) { enabled = !!v }

// name -> [ { f: freq, d: dur, t: type, g: gain, delay } ... ]
const PATCHES = {
  select:    [{ f: 660, d: 0.06, t: 'square', g: 0.16 }],
  hit:       [{ f: 220, d: 0.07, t: 'square', g: 0.18 }],
  hitStrong: [{ f: 160, d: 0.05, t: 'sawtooth', g: 0.22 }, { f: 320, d: 0.08, t: 'square', g: 0.18, delay: 0.04 }],
  faint:     [{ f: 300, d: 0.12, t: 'square', g: 0.18 }, { f: 120, d: 0.18, t: 'square', g: 0.16, delay: 0.1 }],
  catch:     [{ f: 520, d: 0.08, t: 'square', g: 0.18 }, { f: 780, d: 0.1, t: 'square', g: 0.18, delay: 0.09 }],
  // Classic ascending level-up jingle.
  levelUp:   [{ f: 660, d: 0.09, t: 'square', g: 0.2 }, { f: 880, d: 0.09, t: 'square', g: 0.2, delay: 0.09 }, { f: 1175, d: 0.16, t: 'square', g: 0.2, delay: 0.18 }],
  evolve:    [{ f: 523, d: 0.1, t: 'square', g: 0.2 }, { f: 698, d: 0.1, t: 'square', g: 0.2, delay: 0.1 }, { f: 880, d: 0.1, t: 'square', g: 0.2, delay: 0.2 }, { f: 1318, d: 0.28, t: 'square', g: 0.22, delay: 0.3 }],
  win:       [{ f: 523, d: 0.12, t: 'square', g: 0.2 }, { f: 659, d: 0.12, t: 'square', g: 0.2, delay: 0.12 }, { f: 784, d: 0.12, t: 'square', g: 0.2, delay: 0.24 }, { f: 1047, d: 0.24, t: 'square', g: 0.2, delay: 0.36 }],
  lose:      [{ f: 392, d: 0.18, t: 'sawtooth', g: 0.2 }, { f: 262, d: 0.3, t: 'sawtooth', g: 0.2, delay: 0.16 }],
}

export function sfx(name) {
  if (!enabled) return
  const c = ac()
  if (!c) return
  const patch = PATCHES[name]
  if (!patch) return
  const now = c.currentTime
  for (const note of patch) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = note.t
    osc.frequency.value = note.f
    const start = now + (note.delay || 0)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(note.g, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.d)
    osc.connect(gain).connect(c.destination)
    osc.start(start)
    osc.stop(start + note.d + 0.02)
  }
}
