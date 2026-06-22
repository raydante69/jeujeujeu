// Biomes rotate every 10 waves and define the enemy type pool, a boss
// roster, and the visual theme. They loop forever as the run goes on.

export const BIOMES = [
  {
    id: 'plains', name: 'Plaines', emoji: '🌾',
    bg: 'linear-gradient(180deg, #1a2e1a 0%, #0a0a14 100%)', accent: '#84cc16',
    pool: [16, 19, 21, 29, 32, 39, 52, 56, 10, 13, 43, 69],
    bosses: [128, 113, 143],
  },
  {
    id: 'cave', name: 'Caverne Obscure', emoji: '🪨',
    bg: 'linear-gradient(180deg, #2a2118 0%, #0a0a14 100%)', accent: '#a8a29e',
    pool: [41, 50, 74, 95, 27, 66, 104, 111],
    bosses: [76, 112, 142],
  },
  {
    id: 'ocean', name: 'Abysses', emoji: '🌊',
    bg: 'linear-gradient(180deg, #0c2740 0%, #0a0a14 100%)', accent: '#38bdf8',
    pool: [54, 60, 72, 86, 90, 116, 118, 98, 120],
    bosses: [130, 131, 121],
  },
  {
    id: 'volcano', name: 'Volcan', emoji: '🌋',
    bg: 'linear-gradient(180deg, #3a1410 0%, #0a0a14 100%)', accent: '#f97316',
    pool: [4, 37, 58, 77, 126, 109, 88],
    bosses: [6, 59, 146],
  },
  {
    id: 'forest', name: 'Forêt Ancienne', emoji: '🌲',
    bg: 'linear-gradient(180deg, #14321f 0%, #0a0a14 100%)', accent: '#22c55e',
    pool: [1, 43, 46, 48, 69, 102, 114, 123, 127],
    bosses: [3, 71, 103],
  },
  {
    id: 'city', name: 'Cité Électrique', emoji: '🏙️',
    bg: 'linear-gradient(180deg, #1a1a3a 0%, #0a0a14 100%)', accent: '#facc15',
    pool: [25, 81, 100, 109, 137, 82, 101],
    bosses: [26, 125, 145],
  },
  {
    id: 'tower', name: 'Tour Hantée', emoji: '👻',
    bg: 'linear-gradient(180deg, #221033 0%, #0a0a14 100%)', accent: '#a855f7',
    pool: [92, 93, 41, 42, 109, 110, 96, 97],
    bosses: [94, 64, 122],
  },
  {
    id: 'dragon', name: 'Antre du Dragon', emoji: '🐉',
    bg: 'linear-gradient(180deg, #2a0f2a 0%, #0a0a14 100%)', accent: '#e879f9',
    pool: [147, 116, 130, 142, 6, 149],
    bosses: [149, 150, 151],
  },
]

export function biomeForWave(wave) {
  // wave 1-10 -> biome 0, 11-20 -> 1, ... looping
  const idx = Math.floor((wave - 1) / 10) % BIOMES.length
  return BIOMES[idx]
}
