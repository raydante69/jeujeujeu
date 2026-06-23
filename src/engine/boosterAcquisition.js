import { allSpecies, makeInstance } from '../data/pokemon.js'
import { CARD_RARITY, RARITY_ORDER, speciesRarity, isHoloEligible } from '../data/cardModel.js'
import { makeRng, randomSeed } from './rng.js'

// Rarity is now an inherent, power-based property of the species (5 tiers).
// Re-exported as RARITIES for the screens that read it.
export const RARITIES = CARD_RARITY

// ───────────────────────── Booster formats ─────────────────────────
// Fewer cards + higher prices = strong Pokémon are genuinely rare and earned.
//   sachet  → 1 card  (anything)
//   booster → 2 cards (1 Rare+ guaranteed)
//   premium → 3 cards (1 Épique+ guaranteed, boosted shiny/holo odds)
export const BOOSTER_TYPES = [
  {
    id: 'sachet', name: 'Sachet', emoji: '🎴', cards: 1, basePrice: 90,
    color: '#94a3b8', guaranteeTier: 0,
    tagline: '1 carte · tirage aléatoire',
    slots: ['any'],
  },
  {
    id: 'booster', name: 'Booster', emoji: '📦', cards: 2, basePrice: 220,
    color: '#3b82f6', guaranteeTier: 2,
    tagline: '2 cartes · Rare+ garantie',
    slots: ['filler', 'guarantee'],
  },
  {
    id: 'premium', name: 'Pack Premium', emoji: '💎', cards: 3, basePrice: 520,
    color: '#a855f7', guaranteeTier: 3,
    tagline: '3 cartes · Épique+ · variantes boostées',
    slots: ['filler', 'rare', 'guarantee'],
  },
]
export const BOOSTER_BY_ID = Object.fromEntries(BOOSTER_TYPES.map(b => [b.id, b]))

export function genPriceMult(gen) {
  return 1 + (Math.max(1, gen) - 1) * 0.15
}
export function boosterPrice(boosterId, gen = 1, sessionBuys = 0) {
  const t = BOOSTER_BY_ID[boosterId]
  if (!t) return 0
  const raw = t.basePrice * genPriceMult(gen) * Math.pow(1.18, sessionBuys)
  return Math.round(raw / 5) * 5
}
export const BOOSTER_PRICES = { 1: 90, 2: 100, 3: 120, 4: 150, 5: 150, 6: 180, 7: 200, 8: 200, 9: 250 }

export function getFreeBoosterTimer(gen) {
  if (gen <= 3) return 4 * 60 * 60 * 1000
  if (gen <= 6) return 6 * 60 * 60 * 1000
  return 8 * 60 * 60 * 1000
}
export function canClaimFreeBooster(lastClaim, gen) {
  if (!lastClaim) return true
  return Date.now() - lastClaim >= getFreeBoosterTimer(gen)
}

const GEN_RANGES = {
  1: [1, 151], 2: [152, 251], 3: [252, 386], 4: [387, 493],
  5: [494, 649], 6: [650, 721], 7: [722, 809], 8: [810, 905], 9: [906, 1010],
}
function speciesInGen(gen) {
  const [min, max] = GEN_RANGES[gen] || [1, 151]
  return allSpecies().filter(sp => sp.id >= min && sp.id <= max)
}

// Sample a rarity tier (>= minTier) weighted by the registry weights.
function sampleRarity(rng, minTier = 0) {
  const entries = RARITY_ORDER.map(k => CARD_RARITY[k]).filter(r => r.tier >= minTier)
  const total = entries.reduce((s, r) => s + r.weight, 0)
  let roll = rng.next() * total
  for (const r of entries) { roll -= r.weight; if (roll <= 0) return r.key }
  return entries[entries.length - 1].key
}

function pickSpeciesOfRarity(pool, rarity, rng) {
  const matching = pool.filter(sp => speciesRarity(sp) === rarity)
  if (matching.length) return rng.pick(matching)
  // Fall back to the closest-available rarity if a tier is empty for this gen.
  const order = RARITY_ORDER.indexOf(rarity)
  for (let d = 1; d < RARITY_ORDER.length; d++) {
    for (const idx of [order - d, order + d]) {
      const r = RARITY_ORDER[idx]
      if (!r) continue
      const alt = pool.filter(sp => speciesRarity(sp) === r)
      if (alt.length) return rng.pick(alt)
    }
  }
  return rng.pick(pool)
}

// Build a card with shiny/holo variant rolls.
function makeCard(sp, rng, { shinyBoost = false, holoBoost = false } = {}) {
  const rarity = speciesRarity(sp)
  const shiny = rng.next() < (shinyBoost ? 0.09 : 0.035)
  let holo = false
  if (isHoloEligible(sp)) holo = rng.next() < (holoBoost ? 0.5 : 0.18)
  return makeInstance(sp.id, 5, { rarity, shiny, holo })
}

export function openBooster(gen = 1, boosterId = 'booster') {
  const type = BOOSTER_BY_ID[boosterId] || BOOSTER_BY_ID.booster
  const rng = makeRng(randomSeed())
  const pool = speciesInGen(gen)
  if (!pool.length) return []
  const boost = boosterId === 'premium'
  const cards = []

  for (const slot of type.slots) {
    const minTier =
      slot === 'guarantee' ? type.guaranteeTier
      : slot === 'rare'    ? 2
      : 0
    const rarity = sampleRarity(rng, minTier)
    const sp = pickSpeciesOfRarity(pool, rarity, rng)
    cards.push(makeCard(sp, rng, { shinyBoost: boost, holoBoost: boost }))
  }
  return cards
}
