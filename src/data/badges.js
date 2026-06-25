// The 8 Kanto gym badges. Real artwork from the PokeAPI sprites repo (badges 1-8),
// the same source already used for Pokémon sprites.
// Unlock is derived from the best wave reached (clearing each biome boss), so no
// extra persisted state is needed — `bestWave` already lives in runStore.

export const badgeUrl = (n) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/${n}.png`

export const KANTO_BADGES = [
  { id: 'boulder', n: 1, name: 'Badge Roche',    leader: 'Pierre',   type: 'rock',     wave: 10 },
  { id: 'cascade', n: 2, name: 'Badge Cascade',  leader: 'Ondine',   type: 'water',    wave: 20 },
  { id: 'thunder', n: 3, name: 'Badge Foudre',   leader: 'Major Bob', type: 'electric', wave: 30 },
  { id: 'rainbow', n: 4, name: 'Badge Prisme',   leader: 'Erika',    type: 'grass',    wave: 40 },
  { id: 'soul',    n: 5, name: 'Badge Âme',      leader: 'Koga',     type: 'poison',   wave: 50 },
  { id: 'marsh',   n: 6, name: 'Badge Marais',   leader: 'Sabrina',  type: 'psychic',  wave: 60 },
  { id: 'volcano', n: 7, name: 'Badge Volcan',   leader: 'Auguste',  type: 'fire',     wave: 70 },
  { id: 'earth',   n: 8, name: 'Badge Terre',    leader: 'Giovanni', type: 'ground',   wave: 80 },
]

export function isBadgeEarned(badge, bestWave) {
  return (bestWave || 0) >= badge.wave
}
export function earnedBadgeCount(bestWave) {
  return KANTO_BADGES.filter(b => isBadgeEarned(b, bestWave)).length
}

// Total Kanto species (the "complete the adventure" goal is to defeat them all).
export const KANTO_TOTAL = 151
