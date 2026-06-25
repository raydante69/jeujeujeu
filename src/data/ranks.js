// Player rank — purely derived from progression (no persisted state).
// Shown on the home screen as a long-term motivation badge.

export const RANKS = [
  { id: 'champion', name: 'Champion', icon: '👑', color: '#f5d60a', min: Infinity },
  { id: 'platine',  name: 'Platine',  icon: '💠', color: '#67e8f9', min: 40 },
  { id: 'or',       name: 'Or',       icon: '🥇', color: '#fbbf24', min: 25 },
  { id: 'argent',   name: 'Argent',   icon: '🥈', color: '#d1d5db', min: 15 },
  { id: 'bronze',   name: 'Bronze',   icon: '🥉', color: '#d97706', min: 5 },
  { id: 'recrue',   name: 'Recrue',   icon: '🔰', color: '#94a3b8', min: 0 },
]

// Returns the current rank plus the next rank (for a progress hint).
export function computeRank({ bestWave = 0, isChampion = false } = {}) {
  if (isChampion) {
    return { ...RANKS[0], next: null, toNext: 0 }
  }
  // RANKS[1..] ordered by descending min; first whose min <= bestWave wins.
  const tiers = RANKS.slice(1)
  for (let i = 0; i < tiers.length; i++) {
    if (bestWave >= tiers[i].min) {
      const higher = i === 0 ? RANKS[0] /* champion */ : tiers[i - 1]
      const toNext = higher.min === Infinity ? null : Math.max(0, higher.min - bestWave)
      return { ...tiers[i], next: higher, toNext }
    }
  }
  return { ...RANKS[RANKS.length - 1], next: null, toNext: 0 }
}
