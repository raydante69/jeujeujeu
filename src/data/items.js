// Central item registry. Every item maps to a real PokeAPI item sprite
// so balls, held items and consumables all use authentic artwork.
//   https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{slug}.png

export const ITEM_SPRITE = (slug) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`

// ───────────────────────── Poké Balls (Pokérogue-style) ─────────────────────
// `mult` scales the base catch chance. Master ball is a guaranteed catch.
export const BALLS = [
  { id: 'poke-ball',  name: 'Poké Ball',  slug: 'poke-ball',  emoji: '🔴', color: '#ef4444', mult: 1.0,      desc: 'Capture standard.' },
  { id: 'great-ball', name: 'Super Ball',  slug: 'great-ball', emoji: '🔵', color: '#3b82f6', mult: 1.5,      desc: '×1.5 de chance de capture.' },
  { id: 'ultra-ball', name: 'Hyper Ball',  slug: 'ultra-ball', emoji: '🟡', color: '#eab308', mult: 2.2,      desc: '×2.2 de chance de capture.' },
  { id: 'master-ball',name: 'Master Ball', slug: 'master-ball',emoji: '🟣', color: '#a855f7', mult: Infinity, desc: 'Capture garantie, même les boss !' },
]
export const BALL_BY_ID = Object.fromEntries(BALLS.map(b => [b.id, b]))
export const DEFAULT_BALLS = { 'poke-ball': 5 }

// ───────────────────────── Consumables (in the bag, usable) ─────────────────
// `effect` is read by runStore.useItem().
export const CONSUMABLES = [
  { id: 'potion',       name: 'Potion',        slug: 'potion',        emoji: '🧪', color: '#f87171', effect: { kind: 'heal',   value: 30 },  desc: 'Rend 30% PV à toute l\'équipe.' },
  { id: 'super-potion', name: 'Super Potion',  slug: 'super-potion',  emoji: '🧪', color: '#fb7185', effect: { kind: 'heal',   value: 60 },  desc: 'Rend 60% PV à toute l\'équipe.' },
  { id: 'hyper-potion', name: 'Hyper Potion',  slug: 'hyper-potion',  emoji: '💉', color: '#f43f5e', effect: { kind: 'heal',   value: 100 }, desc: 'Soigne complètement l\'équipe.' },
  { id: 'revive',       name: 'Rappel',        slug: 'revive',        emoji: '🪽', color: '#a3e635', effect: { kind: 'revive', value: 50 },  desc: 'Ranime les K.O. à 50% PV.' },
  { id: 'max-revive',   name: 'Rappel Max',    slug: 'max-revive',    emoji: '🪽', color: '#84cc16', effect: { kind: 'revive', value: 100 }, desc: 'Ranime les K.O. à 100% PV.' },
  { id: 'rare-candy',   name: 'Super Bonbon',  slug: 'rare-candy',    emoji: '🍬', color: '#60a5fa', effect: { kind: 'candy',  value: 1 },   desc: 'Fait gagner 1 niveau au Pokémon le plus faible.' },
]
export const CONSUMABLE_BY_ID = Object.fromEntries(CONSUMABLES.map(c => [c.id, c]))

export function isBall(id) { return !!BALL_BY_ID[id] }
export function isConsumable(id) { return !!CONSUMABLE_BY_ID[id] }
