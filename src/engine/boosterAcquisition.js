import { allSpecies, makeInstance } from '../data/pokemon.js'
import { makeRng, randomSeed } from './rng.js'

export const RARITY_WEIGHTS = {
  common:   { weight: 40, levelRange: [10, 25] },
  uncommon: { weight: 30, levelRange: [20, 40] },
  rare:     { weight: 20, levelRange: [35, 55] },
  holo:     { weight:  8, levelRange: [50, 70] },
  ultra:    { weight:  2, levelRange: [65, 85] },
  secret:   { weight:  0, levelRange: [80, 100] },
}

export const RARITY_LABELS_FR = {
  common:   'Commune',
  uncommon: 'Peu commune',
  rare:     'Rare',
  holo:     'Holographique',
  ultra:    'Ultra Rare',
  secret:   'Secret Rare',
}

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

function pickRarity(rng, forceMinRarity = null) {
  const rarities = ['common', 'uncommon', 'rare', 'holo', 'ultra']
  const minIdx = forceMinRarity ? rarities.indexOf(forceMinRarity) : 0

  const pool = rarities.slice(minIdx)
  const total = pool.reduce((s, r) => s + RARITY_WEIGHTS[r].weight, 0)
  let roll = rng.next() * total
  for (const r of pool) {
    roll -= RARITY_WEIGHTS[r].weight
    if (roll <= 0) return r
  }
  return pool[pool.length - 1]
}

function pickPokemonForGen(gen, rng) {
  const species = allSpecies()
  if (!species.length) return null

  // For MVP (Gen 1), all 151 are available.
  // Future gens: filter by genId ranges.
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
  const rng = makeRng(randomSeed())
  const cards = []
  const isMulti = opts.isMulti || false

  for (let i = 0; i < 5; i++) {
    const forceMin = (i === 0 && isMulti) ? 'rare' : null
    const rarity = pickRarity(rng, forceMin)
    const sp = pickPokemonForGen(gen, rng)
    if (!sp) continue

    const [minLv, maxLv] = RARITY_WEIGHTS[rarity].levelRange
    const level = rng.int(minLv, maxLv)
    const card = makeInstance(sp.id, level, { rarity })
    cards.push(card)
  }

  return cards
}

export function openMultiBooster(gen = 1, count = 10) {
  const all = []
  for (let i = 0; i < count; i++) {
    all.push(...openBooster(gen, { isMulti: i === 0 }))
  }
  return all
}
