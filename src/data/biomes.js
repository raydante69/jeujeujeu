// Biomes rotate every 10 waves and define the enemy type pool, a boss
// roster, and the visual theme. They loop forever as the run goes on.

const BG_BASE = 'https://play.pokemonshowdown.com/sprites/gen6bgs'

export const BIOMES = [
  {
    id: 'plains', name: 'Plaines', emoji: '🌾',
    bg: 'linear-gradient(180deg, #1a2e1a 0%, #0a0a14 100%)', accent: '#84cc16',
    bgImage: `${BG_BASE}/bg-meadow.jpg`,
    pool: [16, 19, 21, 29, 32, 39, 52, 56, 10, 13, 43, 69],
    bosses: [128, 113, 143],
    bossAbilities: { 128: 'enrage', 113: 'lifedrain', 143: 'shield' },
  },
  {
    id: 'cave', name: 'Caverne Obscure', emoji: '🪨',
    bg: 'linear-gradient(180deg, #2a2118 0%, #0a0a14 100%)', accent: '#a8a29e',
    bgImage: `${BG_BASE}/bg-earthycave.jpg`,
    pool: [41, 50, 74, 95, 27, 66, 104, 111],
    bosses: [76, 112, 142],
    bossAbilities: { 76: 'shield', 112: 'enrage', 142: 'enrage' },
  },
  {
    id: 'ocean', name: 'Abysses', emoji: '🌊',
    bg: 'linear-gradient(180deg, #0c2740 0%, #0a0a14 100%)', accent: '#38bdf8',
    bgImage: `${BG_BASE}/bg-deepsea.jpg`,
    pool: [54, 60, 72, 86, 90, 116, 118, 98, 120],
    bosses: [130, 131, 121],
    bossAbilities: { 130: 'enrage', 131: 'shield', 121: 'lifedrain' },
  },
  {
    id: 'volcano', name: 'Volcan', emoji: '🌋',
    bg: 'linear-gradient(180deg, #3a1410 0%, #0a0a14 100%)', accent: '#f97316',
    bgImage: `${BG_BASE}/bg-desert.jpg`,
    pool: [4, 37, 58, 77, 126, 109, 88],
    bosses: [6, 59, 146],
    bossAbilities: { 6: 'enrage', 59: 'enrage', 146: 'lifedrain' },
  },
  {
    id: 'forest', name: 'Forêt Ancienne', emoji: '🌲',
    bg: 'linear-gradient(180deg, #14321f 0%, #0a0a14 100%)', accent: '#22c55e',
    bgImage: `${BG_BASE}/bg-forest.jpg`,
    pool: [1, 43, 46, 48, 69, 102, 114, 123, 127],
    bosses: [3, 71, 103],
    bossAbilities: { 3: 'shield', 71: 'lifedrain', 103: 'enrage' },
  },
  {
    id: 'city', name: 'Cité Électrique', emoji: '🏙️',
    bg: 'linear-gradient(180deg, #1a1a3a 0%, #0a0a14 100%)', accent: '#facc15',
    bgImage: `${BG_BASE}/bg-city.jpg`,
    pool: [25, 81, 100, 109, 137, 82, 101],
    bosses: [26, 125, 145],
    bossAbilities: { 26: 'enrage', 125: 'enrage', 145: 'shield' },
  },
  {
    id: 'tower', name: 'Tour Hantée', emoji: '👻',
    bg: 'linear-gradient(180deg, #221033 0%, #0a0a14 100%)', accent: '#a855f7',
    bgImage: `${BG_BASE}/bg-darkcity.jpg`,
    pool: [92, 93, 41, 42, 109, 110, 96, 97],
    bosses: [94, 64, 122],
    bossAbilities: { 94: 'lifedrain', 64: 'enrage', 122: 'shield' },
  },
  {
    id: 'dragon', name: 'Antre du Dragon', emoji: '🐉',
    bg: 'linear-gradient(180deg, #2a0f2a 0%, #0a0a14 100%)', accent: '#e879f9',
    bgImage: `${BG_BASE}/bg-skypillar.jpg`,
    pool: [147, 116, 130, 142, 6, 149],
    bosses: [149, 150, 151],
    bossAbilities: { 149: 'enrage', 150: 'shield', 151: 'lifedrain' },
  },
]

export function biomeForWave(wave) {
  // wave 1-10 -> biome 0, 11-20 -> 1, ... looping
  const idx = Math.floor((wave - 1) / 10) % BIOMES.length
  return BIOMES[idx]
}
