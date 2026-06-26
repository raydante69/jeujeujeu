// Central item registry. Every item maps to a real PokeAPI item sprite
// so balls, held items and consumables all use authentic artwork.
//   https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{slug}.png

export const ITEM_SPRITE = (slug) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`

// ───────────────────────── Poké Balls ────────────────────────────────────────
// `rate` is the fixed capture probability (independent of enemy HP).
export const BALLS = [
  { id: 'poke-ball',  name: 'Poké Ball',  slug: 'poke-ball',  emoji: '🔴', color: '#ef4444', rate: 0.25, desc: '25% de chance de capture.' },
  { id: 'great-ball', name: 'Super Ball',  slug: 'great-ball', emoji: '🔵', color: '#3b82f6', rate: 0.40, desc: '40% de chance de capture.' },
  { id: 'ultra-ball', name: 'Hyper Ball',  slug: 'ultra-ball', emoji: '🟡', color: '#eab308', rate: 0.60, desc: '60% de chance de capture.' },
  { id: 'master-ball',name: 'Master Ball', slug: 'master-ball',emoji: '🟣', color: '#a855f7', rate: 1.00, desc: 'Capture garantie, même les boss !' },
]
export const BALL_BY_ID = Object.fromEntries(BALLS.map(b => [b.id, b]))
export const DEFAULT_BALLS = { 'poke-ball': 5 }

// ───────────────────────── Consumables (in the bag, usable) ─────────────────
// `effect` is read by runStore.useItem().
export const CONSUMABLES = [
  // Soins
  { id: 'potion',       name: 'Potion',        slug: 'potion',        emoji: '🧪', color: '#f87171', effect: { kind: 'heal',   value: 30 },  desc: 'Rend 30% PV à toute l\'équipe.' },
  { id: 'super-potion', name: 'Super Potion',  slug: 'super-potion',  emoji: '🧪', color: '#fb7185', effect: { kind: 'heal',   value: 60 },  desc: 'Rend 60% PV à toute l\'équipe.' },
  { id: 'hyper-potion', name: 'Hyper Potion',  slug: 'hyper-potion',  emoji: '💉', color: '#f43f5e', effect: { kind: 'heal',   value: 100 }, desc: 'Soigne complètement l\'équipe.' },
  { id: 'full-restore', name: 'Guérison',      slug: 'full-restore',  emoji: '✨', color: '#fda4af', effect: { kind: 'fullrestore' },        desc: 'Soigne ET ranime toute l\'équipe à fond.' },
  { id: 'revive',       name: 'Rappel',        slug: 'revive',        emoji: '🪽', color: '#a3e635', effect: { kind: 'revive', value: 50 },  desc: 'Ranime les K.O. à 50% PV.' },
  { id: 'max-revive',   name: 'Rappel Max',    slug: 'max-revive',    emoji: '🪽', color: '#84cc16', effect: { kind: 'revive', value: 100 }, desc: 'Ranime les K.O. à 100% PV.' },
  { id: 'rare-candy',   name: 'Super Bonbon',  slug: 'rare-candy',    emoji: '🍬', color: '#60a5fa', effect: { kind: 'candy',  value: 1 },   desc: 'Fait gagner 1 niveau au Pokémon le plus faible.' },
  // Or
  { id: 'nugget',       name: 'Pépite',        slug: 'nugget',        emoji: '🟡', color: '#facc15', effect: { kind: 'gold',   value: 300 }, desc: 'Donne 300 or.' },
  { id: 'big-nugget',   name: 'Maxi Pépite',   slug: 'big-nugget',    emoji: '🪙', color: '#f59e0b', effect: { kind: 'gold',   value: 1200 },desc: 'Donne 1200 or.' },
  // Vitamines — bonus de stat PERMANENT sur toute l'équipe (survit aux niveaux)
  { id: 'hp-up',        name: 'PV Plus',       slug: 'hp-up',         emoji: '❤️', color: '#fb7185', effect: { kind: 'vitamin', stat: 'hp',  value: 14 }, desc: '+PV max permanents à toute l\'équipe.' },
  { id: 'protein',      name: 'Protéine',      slug: 'protein',       emoji: '💪', color: '#f97316', effect: { kind: 'vitamin', stat: 'atk', value: 10 }, desc: '+Attaque permanente à toute l\'équipe.' },
  { id: 'iron',         name: 'Fer',           slug: 'iron',          emoji: '🛡️', color: '#94a3b8', effect: { kind: 'vitamin', stat: 'def', value: 10 }, desc: '+Défense permanente à toute l\'équipe.' },
  { id: 'calcium',      name: 'Calcium',       slug: 'calcium',       emoji: '🔮', color: '#c084fc', effect: { kind: 'vitamin', stat: 'spa', value: 10 }, desc: '+Atq. Spé. permanente à toute l\'équipe.' },
  { id: 'zinc',         name: 'Zinc',          slug: 'zinc',          emoji: '🧿', color: '#38bdf8', effect: { kind: 'vitamin', stat: 'spd', value: 10 }, desc: '+Déf. Spé. permanente à toute l\'équipe.' },
  { id: 'carbos',       name: 'Carbone',       slug: 'carbos',        emoji: '⚡', color: '#fde047', effect: { kind: 'vitamin', stat: 'spe', value: 10 }, desc: '+Vitesse permanente à toute l\'équipe.' },
  // Pierres d'évolution — à utiliser sur un Pokémon compatible pour le faire évoluer.
  { id: 'fire-stone',    name: 'Pierre Feu',    slug: 'fire-stone',    emoji: '🔥', color: '#f97316', effect: { kind: 'stone', stone: 'fire-stone' },    desc: 'Fait évoluer certains Pokémon de type Feu.' },
  { id: 'water-stone',   name: 'Pierre Eau',    slug: 'water-stone',   emoji: '💧', color: '#3b82f6', effect: { kind: 'stone', stone: 'water-stone' },   desc: 'Fait évoluer certains Pokémon de type Eau.' },
  { id: 'thunder-stone', name: 'Pierre Foudre', slug: 'thunder-stone', emoji: '⚡', color: '#eab308', effect: { kind: 'stone', stone: 'thunder-stone' }, desc: 'Fait évoluer certains Pokémon de type Électrik.' },
  { id: 'leaf-stone',    name: 'Pierre Plante', slug: 'leaf-stone',    emoji: '🍃', color: '#22c55e', effect: { kind: 'stone', stone: 'leaf-stone' },    desc: 'Fait évoluer certains Pokémon de type Plante.' },
  { id: 'moon-stone',    name: 'Pierre Lune',   slug: 'moon-stone',    emoji: '🌙', color: '#a855f7', effect: { kind: 'stone', stone: 'moon-stone' },    desc: 'Fait évoluer certains Pokémon (Mélofée, Rondoudou, Nidoran…).' },
]
export const CONSUMABLE_BY_ID = Object.fromEntries(CONSUMABLES.map(c => [c.id, c]))

export const STONE_IDS = ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone']

export function isBall(id) { return !!BALL_BY_ID[id] }
export function isConsumable(id) { return !!CONSUMABLE_BY_ID[id] }
export function isStone(id) { return STONE_IDS.includes(id) }
