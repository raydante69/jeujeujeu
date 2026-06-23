import { allSpecies, makeInstance } from '../data/pokemon.js'
import { makeRng, randomSeed } from './rng.js'

export const RARITIES = ['commune', 'peu-commune', 'rare', 'tres-rare', 'epique', 'legendaire']

export const RARITY_LABELS_FR = {
  commune:       'Commune',
  'peu-commune': 'Peu commune',
  rare:          'Rare',
  'tres-rare':   'Très rare',
  epique:        'Épique',
  legendaire:    'Légendaire',
}

export const RARITY_LEVEL_RANGES = {
  commune:       [5,  20],
  'peu-commune': [15, 30],
  rare:          [28, 45],
  'tres-rare':   [42, 60],
  epique:        [58, 75],
  legendaire:    [72, 100],
}

// Drop rate tables (%) by booster tier
const TIER_RATES = {
  free: {
    commune: 58, 'peu-commune': 28, rare: 10, 'tres-rare': 2.8, epique: 0.9, legendaire: 0.3,
  },
  standard: {
    commune: 48, 'peu-commune': 30, rare: 14.5, 'tres-rare': 5, epique: 2, legendaire: 0.5,
  },
  premium: {
    commune: 38, 'peu-commune': 28, rare: 19, 'tres-rare': 9.5, epique: 4, legendaire: 1.5,
  },
  deluxe: {
    commune: 26, 'peu-commune': 25, rare: 24, 'tres-rare': 14, epique: 7.5, legendaire: 3.5,
  },
}

// Minimum rarity guaranteed per slot (by position in the pack)
const TIER_GUARANTEES = {
  free:     [],
  standard: ['rare'],
  premium:  ['rare', 'tres-rare'],
  deluxe:   ['rare', 'tres-rare', 'epique'],
}

// Shiny chance per card (%) by tier — shiny works on ANY rarity
const SHINY_RATES = { free: 0.5, standard: 1, premium: 2, deluxe: 3 }

// Holo chance per card (%) by tier — only applies to rare+ cards
const HOLO_RATES = { free: 1, standard: 2, premium: 4, deluxe: 6 }

export const BOOSTER_TIERS = {
  free:     { label: 'Booster Gratuit',   price: 0,   icon: '🎁', guarantees: 0, desc: 'Gratuit toutes les 4h' },
  standard: { label: 'Booster Standard',  price: 100, icon: '📦', guarantees: 1, desc: '1 Rare garantie' },
  premium:  { label: 'Booster Premium',   price: 250, icon: '💠', guarantees: 2, desc: '1 Rare + 1 Très-Rare garanties' },
  deluxe:   { label: 'Booster Deluxe',    price: 500, icon: '👑', guarantees: 3, desc: '1R + 1TR + 1 Épique garantis' },
}

// Keep old BOOSTER_PRICES for backward compat with gen selectors
export const BOOSTER_PRICES = {
  1: 100, 2: 100, 3: 120, 4: 150, 5: 150, 6: 180, 7: 200, 8: 200, 9: 250,
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

function pickRarity(rng, tier = 'standard', minRarity = null) {
  const rates = TIER_RATES[tier] || TIER_RATES.standard
  const pool = minRarity ? RARITIES.slice(RARITIES.indexOf(minRarity)) : RARITIES
  const total = pool.reduce((s, r) => s + (rates[r] || 0), 0)
  let roll = rng.next() * total
  for (const r of pool) {
    roll -= (rates[r] || 0)
    if (roll <= 0) return r
  }
  return pool[pool.length - 1]
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

export function openBooster(gen = 1, opts = {}) {
  const tier = opts.tier || 'standard'
  const rng = makeRng(randomSeed())
  const cards = []
  const guarantees = [...(TIER_GUARANTEES[tier] || [])]
  const shinyChance = SHINY_RATES[tier] ?? 1
  const holoChance = HOLO_RATES[tier] ?? 2

  for (let i = 0; i < 5; i++) {
    const minRarity = guarantees[i] || null
    const rarity = pickRarity(rng, tier, minRarity)
    const sp = pickPokemonForGen(gen, rng)
    if (!sp) continue

    const [minLv, maxLv] = RARITY_LEVEL_RANGES[rarity] || [10, 50]
    const level = rng.int(minLv, maxLv)

    const isShiny = rng.next() * 100 < shinyChance
    const rarityIdx = RARITIES.indexOf(rarity)
    const isHolo = !isShiny && rarityIdx >= 2 && rng.next() * 100 < holoChance

    const card = makeInstance(sp.id, level, { rarity, shiny: isShiny, holo: isHolo })
    cards.push(card)
  }

  return cards
}

export function openMultiBooster(gen = 1, count = 10, tier = 'standard') {
  const all = []
  for (let i = 0; i < count; i++) {
    all.push(...openBooster(gen, { tier }))
  }
  return all
}
