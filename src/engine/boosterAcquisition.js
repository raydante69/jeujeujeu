import { allSpecies, makeInstance } from '../data/pokemon.js'
import { CARD_RARITY, RARITY_ORDER, speciesRarity, isHoloEligible } from '../data/cardModel.js'
import { makeRng, randomSeed } from './rng.js'
import { rollRandomCT } from '../data/ct.js'

export const RARITIES = CARD_RARITY

// ─── 2 booster formats + 1 virtual free booster ──────────────────────────────
export const BOOSTER_TYPES = [
  {
    id: 'single', name: 'Booster Solo', emoji: '🎴', cards: 1, basePrice: 200,
    color: '#94a3b8', guaranteeTier: 0,
    tagline: '1 carte · tirage aléatoire',
    slots: ['any'],
  },
  {
    id: 'pack5', name: 'Pack 5 Cartes', emoji: '📦', cards: 5, basePrice: 800,
    color: '#a855f7', guaranteeTier: 0,
    tagline: '5 cartes · même odds que le booster solo',
    slots: ['any', 'any', 'any', 'any', 'any'],
  },
]
export const BOOSTER_BY_ID = Object.fromEntries(BOOSTER_TYPES.map(b => [b.id, b]))

const FREE_BOOSTER = {
  id: 'free', cards: 1, guaranteeTier: 0, slots: ['any'],
}

// ─── Weight tables — very rare higher tiers ───────────────────────────────────
// RARITY_ORDER = ['common','uncommon','rare','veryrare','epic','legendary']
//                    0          1       2       3         4        5
const WEIGHT_TABLES = {
  free:   [920, 240, 25,  3.5, 0.30, 0.03],
  single: [870, 240, 28,  4.5, 0.40, 0.04],
  pack5:  [760, 280, 45,  8.0, 1.00, 0.12],
}

const SHINY_RATES = { free: 0.002, single: 0.003, pack5: 0.006 }
const HOLO_RATES  = { free: 0.015, single: 0.020, pack5: 0.040 }

export const BOOSTER_ODDS = {
  single: [
    { key: 'common',    label: 'Commune',     color: CARD_RARITY.common.color,    pct: '75.5%' },
    { key: 'uncommon',  label: 'Peu Commune', color: CARD_RARITY.uncommon.color,  pct: '20.9%' },
    { key: 'rare',      label: 'Rare',        color: CARD_RARITY.rare.color,      pct: '2.43%' },
    { key: 'veryrare',  label: 'Très Rare',   color: CARD_RARITY.veryrare.color,  pct: '0.39%' },
    { key: 'epic',      label: 'Épique',      color: CARD_RARITY.epic.color,      pct: '0.035%' },
    { key: 'legendary', label: 'Légendaire',  color: CARD_RARITY.legendary.color, pct: '0.003%' },
  ],
  pack5: [
    { key: 'common',    label: 'Commune',     color: CARD_RARITY.common.color,    pct: '69.7%' },
    { key: 'uncommon',  label: 'Peu Commune', color: CARD_RARITY.uncommon.color,  pct: '25.7%' },
    { key: 'rare',      label: 'Rare',        color: CARD_RARITY.rare.color,      pct: '4.13%' },
    { key: 'veryrare',  label: 'Très Rare',   color: CARD_RARITY.veryrare.color,  pct: '0.73%' },
    { key: 'epic',      label: 'Épique',      color: CARD_RARITY.epic.color,      pct: '0.092%' },
    { key: 'legendary', label: 'Légendaire',  color: CARD_RARITY.legendary.color, pct: '0.011%' },
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

function sampleRarity(rng, tableKey = 'single', minTier = 0) {
  const weights = WEIGHT_TABLES[tableKey] || WEIGHT_TABLES.single
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

// Returns { cards, bonusCT } — bonusCT is null or a CT object (10% chance)
export function openBooster(gen = 1, boosterId = 'single') {
  const tableKey = ['free', 'single', 'pack5'].includes(boosterId) ? boosterId : 'single'
  const type = boosterId === 'free' ? FREE_BOOSTER : (BOOSTER_BY_ID[boosterId] || BOOSTER_BY_ID.single)
  const rng = makeRng(randomSeed())
  const pool = speciesInGen(gen)
  if (!pool.length) return { cards: [], bonusCT: null }
  const shinyRate = SHINY_RATES[tableKey] ?? SHINY_RATES.single
  const holoRate  = HOLO_RATES[tableKey]  ?? HOLO_RATES.single
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

  const bonusCT = Math.random() < 0.10 ? rollRandomCT() : null
  return { cards, bonusCT }
}
