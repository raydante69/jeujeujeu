import { RARITIES } from './boosterAcquisition.js'
import { getTrait } from '../data/signatureTraits.js'

// How the collection feeds a run: duplicates + rarity + permanent training
// + the lead Pokémon's trait all raise its starting level.

export function rarityTier(r) {
  return RARITIES[r]?.tier ?? 0
}

// Best owned card + count for one species.
export function speciesStanding(cards) {
  if (!cards || !cards.length) return { count: 0, bestRarity: null, bestTier: 0 }
  const best = cards.reduce((a, b) => (rarityTier(b.rarity) > rarityTier(a.rarity) ? b : a), cards[0])
  return { count: cards.length, bestRarity: best.rarity, bestTier: rarityTier(best.rarity) }
}

// Bonus levels from owning duplicates (each extra copy = +2, capped at +20).
export function duplicateBonus(count) {
  return Math.min(20, Math.max(0, count - 1) * 2)
}

// Final starting level for a species when it leads a run.
export function startingLevel(cards, types, trainerBonus = 0) {
  const { count, bestTier } = speciesStanding(cards)
  const trait = getTrait(cards?.[0]?.id, types)
  const traitBonus = trait.startLevel || 0
  return 5 + duplicateBonus(count) + bestTier + trainerBonus + traitBonus
}

// Full breakdown for display in the run setup UI.
export function levelBreakdown(cards, types, trainerBonus = 0) {
  const { count, bestRarity, bestTier } = speciesStanding(cards)
  const trait = getTrait(cards?.[0]?.id, types)
  return {
    base: 5,
    dup: duplicateBonus(count),
    rarity: bestTier,
    trainer: trainerBonus,
    trait: trait.startLevel || 0,
    count,
    bestRarity,
    total: 5 + duplicateBonus(count) + bestTier + trainerBonus + (trait.startLevel || 0),
  }
}
