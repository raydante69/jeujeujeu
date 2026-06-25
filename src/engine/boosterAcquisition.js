import { allSpecies, makeInstance } from '../data/pokemon.js'
import { CARD_RARITY, RARITY_ORDER, speciesRarity, isHoloEligible } from '../data/cardModel.js'
import { makeRng, randomSeed } from './rng.js'

// Re-exported for screens.
export const RARITIES = CARD_RARITY

// ───────────────────────── Booster formats ─────────────────────────
// 'free' is virtual (used for the timer booster, not sold in shop).
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
    color: '#a855f7', guaranteeTier: 4,
    tagline: '3 cartes · Épique+ · variantes boostées',
    slots: ['filler', 'veryrare', 'guarantee'],
  },
]
export const BOOSTER_BY_ID = Object.fromEntries(BOOSTER_TYPES.map(b => [b.id, b]))

// Virtual free-booster definition (not shown in shop, worse rates).
const FREE_BOOSTER = {
  id: 'free', cards: 1, guaranteeTier: 0, slots: ['any'],
}

// ─── Per-booster rarity weight tables (index = RARITY_ORDER position) ───
// RARITY_ORDER = ['common','uncommon','rare','veryrare','epic','legendary']
//                    0         1        2        3         4        5
const WEIGHT_TABLES = {
  free:    [900,  280, 35,   5.5, 0.7,  0.08],
  sachet:  [800,  320, 60,   12,  1.5,  0.18],
  booster: [600,  340, 90,   22,  4,    0.5 ],
  premium: [440,  320, 130,  50,  15,   2   ],
}

// Shiny and holo chance per booster tier (values are much lower = rarer).
const SHINY_RATES = { free: 0.003, sachet: 0.005, booster: 0.009, premium: 0.016 }
const HOLO_RATES  = { free: 0.020, sachet: 0.040, booster: 0.070, premium: 0.120 }

// Human-readable odds for the ShopScreen (guaranteed slot of each booster).
export const BOOSTER_ODDS = {
  sachet:  [
    { key: 'common',   label: 'Commune',     color: CARD_RARITY.common.color,   pct: '51.4%' },
    { key: 'uncommon', label: 'Peu Commune', color: CARD_RARITY.uncommon.color, pct: '20.6%' },
    { key: 'rare',     label: 'Rare',        color: CARD_RARITY.rare.color,     pct: '23.6%' },
    { key: 'veryrare', label: 'Très Rare',   color: CARD_RARITY.veryrare.color, pct: '7.7%' },
    { key: 'epic',     label: 'Épique',      color: CARD_RARITY.epic.color,     pct: '0.96%' },
    { key: 'legendary',label: 'Légendaire',  color: CARD_RARITY.legendary.color,pct: '0.12%' },
  ],
  booster: [
    { key: 'rare',     label: 'Rare',        color: CARD_RARITY.rare.color,     pct: '77.2%' },
    { key: 'veryrare', label: 'Très Rare',   color: CARD_RARITY.veryrare.color, pct: '18.9%' },
    { key: 'epic',     label: 'Épique',      color: CARD_RARITY.epic.color,     pct: '3.4%' },
    { key: 'legendary',label: 'Légendaire',  color: CARD_RARITY.legendary.color,pct: '0.4%' },
  ],
  premium: [
    { key: 'epic',     label: 'Épique',      color: CARD_RARITY.epic.color,     pct: '88.2%' },
    { key: 'legendary',label: 'Légendaire',  color: CARD_RARITY.legendary.color,pct: '11.8%' },
  ],
}

export function genPriceMult(gen) {
  return 1 + (Math.max(1, gen) - 1) * 0.15
}
export function boosterPrice(boosterId, gen = 1, sessionBuys = 0) {
  const t = BOOSTER_BY_ID[boosterId]
  if (!t) return 0
  const raw = t.basePrice * genPriceMult(gen) * Math.pow(1.18, sessionBuys)
  return Math.round(raw / 5) * 5
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

const GEN_RANGES = {
  1: [1, 151], 2: [152, 251], 3: [252, 386], 4: [387, 493],
  5: [494, 649], 6: [650, 721], 7: [722, 809], 8: [810, 905], 9: [906, 1010],
}
function speciesInGen(gen) {
  const [min, max] = GEN_RANGES[gen] || [1, 151]
  return allSpecies().filter(sp => sp.id >= min && sp.id <= max)
}

function sampleRarity(rng, tableKey = 'sachet', minTier = 0) {
  const weights = WEIGHT_TABLES[tableKey] || WEIGHT_TABLES.sachet
  const entries = RARITY_ORDER
    .map((k, i) => ({ key: k, tier: CARD_RARITY[k].tier, w: weights[i] }))
    .filter(e => e.tier >= minTier)
  const total = entries.reduce((s, e) => s + e.w, 0)
  let roll = rng.next() * total
  for (const e of entries) { roll -= e.w; if (roll <= 0) return e.key }
  return entries[entries.length - 1].key
}

function pickSpeciesOfRarity(pool, rarity, rng) {
  const matching = pool.filter(sp => speciesRarity(sp) === rarity)
  if (matching.length) return rng.pick(matching)
  const order = RARITY_ORDER.indexOf(rarity)
  for (let d = 1; d < RARITY_ORDER.length; d++) {
    for (const idx of [order - d, order + d]) {
      const r = RARITY_ORDER[idx]; if (!r) continue
      const alt = pool.filter(sp => speciesRarity(sp) === r)
      if (alt.length) return rng.pick(alt)
    }
  }
  return rng.pick(pool)
}

export function openBooster(gen = 1, boosterId = 'booster') {
  const tableKey = ['free', 'sachet', 'booster', 'premium'].includes(boosterId) ? boosterId : 'sachet'
  const type = boosterId === 'free' ? FREE_BOOSTER : (BOOSTER_BY_ID[boosterId] || BOOSTER_BY_ID.booster)
  const rng = makeRng(randomSeed())
  const pool = speciesInGen(gen)
  if (!pool.length) return []
  const shinyRate = SHINY_RATES[tableKey] ?? SHINY_RATES.sachet
  const holoRate  = HOLO_RATES[tableKey]  ?? HOLO_RATES.sachet
  const cards = []

  for (const slot of type.slots) {
    const minTier =
      slot === 'guarantee' ? (type.guaranteeTier || 0)
      : slot === 'veryrare' ? 3
      : 0
    const rarity = sampleRarity(rng, tableKey, minTier)
    const sp = pickSpeciesOfRarity(pool, rarity, rng)
    const shiny = rng.next() < shinyRate
    let holo = false
    if (isHoloEligible(sp)) holo = rng.next() < holoRate
    cards.push(makeInstance(sp.id, 5, { rarity, shiny, holo }))
  }
  return cards
}
