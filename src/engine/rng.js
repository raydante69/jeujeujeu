export function makeRng(seed) {
  let a = seed >>> 0
  const next = () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    get state() { return a >>> 0 },
    set state(v) { a = v >>> 0 },
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const a2 = arr.slice()
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]]
      }
      return a2
    },
    sample: (arr, n) => {
      const a2 = arr.slice()
      const out = []
      for (let i = 0; i < n && a2.length; i++) {
        out.push(a2.splice(Math.floor(next() * a2.length), 1)[0])
      }
      return out
    },
  }
}

export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0
}
