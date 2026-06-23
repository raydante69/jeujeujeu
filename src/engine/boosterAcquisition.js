import { allSpecies, makeInstance } from '../data/pokemon.js'
import { makeRng, randomSeed } from './rng.js'

// 11-tier TCG-authentic rarity system
export const RARITIES = {
  common:       { label: 'Commune',      color: '#9ca3af', tier: 0,  foil: null,       particle: '·'   },
  uncommon:     { label: 'Peu Commune',  color: '#4ade80', tier: 1,  foil: null,       particle: '✦'   },
  rare:         { label: 'Rare',         color: '#60a5fa', tier: 2,  foil: null,       particle: '★'   },
  reverse_holo: { label: 'Reverse Holo', color: '#93c5fd', tier: 3,  foil: 'reverse',  particle: '✦★'  },
  holo_rare:    { label: 'Rare Holo',    color: '#c084fc', tier: 4,  foil: 'holo',     particle: '★'   },
  ex:           { label: 'EX',           color: '#fb923c', tier: 5,  foil: 'ex',       particle: '⬡'   },
  full_art:     { label: 'Full Art',     color: '#e879f9', tier: 6,  foil: 'full_art', particle: '◈'   },
  vmax:         { label: 'VMAX',         color: '#f43f5e', tier: 7,  foil: 'vmax',     particle: '▲'   },
  alt_art:      { label: 'Alt Art',      color: '#a78bfa', tier: 8,  foil: 'alt_art',  particle: '◆'   },
  rainbow:      { label: 'Rainbow Rare', color: '#f0abfc', tier: 9,  foil: 'rainbow',  particle: '🌈'  },
  gold:         { label: 'Gold Rare',    color: '#fbbf24', tier: 10, foil: 'gold',     particle: '✦'   },
  // Legacy keys (existing collection cards)
  holo:         { label: 'Holographique',color: '#c084fc', tier: 4,  foil: 'holo',     particle: '★'   },
  ultra:        { label: 'Ultra Rare',   color: '#fb923c', tier: 5,  foil: 'ex',       particle: '⬡'   },
  secret:       { label: 'Secret Rare',  color: '#f0abfc', tier: 9,  foil: 'rainbow',  particle: '🌈'  },
}

// Level ranges per rarity
const RARITY_LEVELS = {
  common: [5, 20], uncommon: [15, 35], rare: [30, 50],
  reverse_holo: [25, 45], holo_rare: [40, 60], ex: [50, 70],
  full_art: [55, 75], vmax: [60, 80], alt_art: [65, 85],
  rainbow: [75, 95], gold: [80, 100],
}

// ───────────────────────── Booster formats ─────────────────────────
// Fewer cards + higher prices = good Pokémon are genuinely rare and earned.
//   sachet  → 1 card  · Uncommon guaranteed   (cheap chase filler)
//   booster → 2 cards · Rare+ guaranteed       (the standard pull)
//   premium → 3 cards · Holo+ guaranteed       (the event purchase)
export const BOOSTER_TYPES = [
  {
    id: 'sachet', name: 'Sachet', emoji: '🎴', cards: 1, basePrice: 90,
    color: '#94a3b8', guarantee: 'uncommon',
    tagline: '1 carte · Peu Commune garantie',
    slots: ['guarantee'],
  },
  {
    id: 'booster', name: 'Booster', emoji: '📦', cards: 2, basePrice: 220,
    color: '#3b82f6', guarantee: 'rare',
    tagline: '2 cartes · Rare garantie',
    slots: ['filler', 'guarantee'],
  },
  {
    id: 'premium', name: 'Pack Premium', emoji: '💎', cards: 3, basePrice: 520,
    color: '#a855f7', guarantee: 'holo_rare',
    tagline: '3 cartes · Holo+ garantie',
    slots: ['filler', 'rare', 'guarantee'],
  },
]
export const BOOSTER_BY_ID = Object.fromEntries(BOOSTER_TYPES.map(b => [b.id, b]))

// Later generations cost progressively more (15% per gen unlocked beyond Kanto).
export function genPriceMult(gen) {
  return 1 + (Math.max(1, gen) - 1) * 0.15
}

// Buying the *same* booster type repeatedly in a session ramps the price 18%
// each time — a soft cap that makes spamming packs expensive (Slay-the-Spire-style).
export function boosterPrice(boosterId, gen = 1, sessionBuys = 0) {
  const t = BOOSTER_BY_ID[boosterId]
  if (!t) return 0
  const raw = t.basePrice * genPriceMult(gen) * Math.pow(1.18, sessionBuys)
  return Math.round(raw / 5) * 5
}

// Legacy export kept for compatibility (single-card base price per gen).
export const BOOSTER_PRICES = {
  1: 90, 2: 100, 3: 120, 4: 150, 5: 150, 6: 180, 7: 200, 8: 200, 9: 250,
}

export function getFreeBoosterTimer(gen) {
  if (gen <= 3) return 4 * 60 * 60 * 1000
  if (gen <= 6) return 6 * 60 * 60 * 1000
  return 8 * 60 * 60 * 1000
}

export function canClaimFreeBooster(lastClaim, gen) {
  if (!lastClaim) return true
  return Date.now() - lastClaim >= getFreeBoosterTimer(gen)
}

function samplePool(pool, rng) {
  const total = pool.reduce((s, p) => s + p.weight, 0)
  let roll = rng.next() * total
  for (const p of pool) {
    roll -= p.weight
    if (roll <= 0) return p.rarity
  }
  return pool[pool.length - 1].rarity
}

// 5-slot pack with TCG-accurate pull rates
// Expected rates per pack (approximate):
//   Common ~1.3/pack, Uncommon ~1.4/pack, Reverse Holo ~0.38/pack
//   Rare ~0.72/pack, Holo ~0.20/pack, EX ~0.10/pack
//   Full Art ~0.06/pack, VMAX ~0.04/pack, Alt Art ~0.02/pack
//   Rainbow ~0.008/pack (~1/125), Gold ~0.003/pack (~1/333)
const SLOT_POOLS = [
  // Slot 0 — mostly Common
  [
    { rarity: 'common',   weight: 8500 },
    { rarity: 'uncommon', weight: 1500 },
  ],
  // Slot 1 — Common/Uncommon
  [
    { rarity: 'common',   weight: 7000 },
    { rarity: 'uncommon', weight: 3000 },
  ],
  // Slot 2 — Uncommon with 30% Reverse Holo
  [
    { rarity: 'uncommon',     weight: 7000 },
    { rarity: 'reverse_holo', weight: 3000 },
  ],
  // Slot 3 — Guaranteed Rare+ (the TCG "rare" slot)
  [
    { rarity: 'rare',      weight: 6000 },
    { rarity: 'holo_rare', weight: 2000 },
    { rarity: 'ex',        weight: 1000 },
    { rarity: 'full_art',  weight: 500  },
    { rarity: 'vmax',      weight: 300  },
    { rarity: 'alt_art',   weight: 150  },
    { rarity: 'rainbow',   weight: 40   },
    { rarity: 'gold',      weight: 10   },
  ],
  // Slot 4 — Wild slot (anything possible, skewed common)
  [
    { rarity: 'common',       weight: 4500 },
    { rarity: 'uncommon',     weight: 2500 },
    { rarity: 'rare',         weight: 1200 },
    { rarity: 'reverse_holo', weight: 800  },
    { rarity: 'holo_rare',    weight: 500  },
    { rarity: 'ex',           weight: 300  },
    { rarity: 'full_art',     weight: 100  },
    { rarity: 'vmax',         weight: 50   },
    { rarity: 'alt_art',      weight: 30   },
    { rarity: 'rainbow',      weight: 15   },
    { rarity: 'gold',         weight: 5    },
  ],
]

// Guarantee pools keyed by booster format. The "guarantee" slot pulls from one
// of these depending on the booster type.
const RARE_PLUS_POOL = SLOT_POOLS[3]
const HOLO_PLUS_POOL = SLOT_POOLS[3].filter(p =>
  ['holo_rare', 'ex', 'full_art', 'vmax', 'alt_art', 'rainbow', 'gold'].includes(p.rarity)
)
const UNCOMMON_PLUS_POOL = [
  { rarity: 'uncommon',     weight: 6800 },
  { rarity: 'reverse_holo', weight: 1600 },
  { rarity: 'rare',         weight: 1200 },
  { rarity: 'holo_rare',    weight: 320  },
  { rarity: 'ex',           weight: 80   },
]
const FILLER_POOL = [
  { rarity: 'common',   weight: 8000 },
  { rarity: 'uncommon', weight: 2000 },
]
const GUARANTEE_POOLS = {
  uncommon:  UNCOMMON_PLUS_POOL,
  rare:      RARE_PLUS_POOL,
  holo_rare: HOLO_PLUS_POOL,
}

function pickPokemonForGen(gen, rng) {
  const species = allSpecies()
  if (!species.length) return null
  const genRanges = {
    1: [1, 151], 2: [152, 251], 3: [252, 386], 4: [387, 493],
    5: [494, 649], 6: [650, 721], 7: [722, 809], 8: [810, 905], 9: [906, 1010],
  }
  const [min, max] = genRanges[gen] || [1, 151]
  const pool = species.filter(sp => sp.id >= min && sp.id <= max)
  if (!pool.length) return null
  return rng.pick(pool)
}

// Open a booster of a given format. Each slot draws from a pool decided by the
// format's `slots` recipe: 'filler' (common/uncommon), 'rare' (rare+), or
// 'guarantee' (the format's headline guarantee).
export function openBooster(gen = 1, boosterId = 'booster') {
  const type = BOOSTER_BY_ID[boosterId] || BOOSTER_BY_ID.booster
  const rng = makeRng(randomSeed())
  const cards = []

  for (const slot of type.slots) {
    const pool =
      slot === 'guarantee' ? (GUARANTEE_POOLS[type.guarantee] || RARE_PLUS_POOL)
      : slot === 'rare'    ? RARE_PLUS_POOL
      : FILLER_POOL
    const rarity = samplePool(pool, rng)
    const sp = pickPokemonForGen(gen, rng)
    if (!sp) continue
    const [minLv, maxLv] = RARITY_LEVELS[rarity] || [10, 30]
    cards.push(makeInstance(sp.id, rng.int(minLv, maxLv), { rarity }))
  }

  return cards
}
