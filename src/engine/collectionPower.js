import { speciesById } from '../data/pokemon.js'
import { speciesRarity, rarityTier } from '../data/cardModel.js'
import { getTrait } from '../data/signatureTraits.js'

// How the collection feeds a run: duplicates + rarity + permanent training
// + the lead Pokémon's trait all raise its starting level. Rarity is derived
// from the species itself, so it stays correct for any card.

export function speciesStanding(cards) {
  if (!cards || !cards.length) return { count: 0, bestRarity: null, bestTier: 0 }
  const sp = speciesById(cards[0].id)
  const rarity = speciesRarity(sp)
  return { count: cards.length, bestRarity: rarity, bestTier: rarityTier(rarity) }
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
  // rarity tier (0-4) doubled so it feels meaningful at the new 5-tier scale.
  return 5 + duplicateBonus(count) + bestTier * 2 + trainerBonus + traitBonus
}

// Full breakdown for display in the run setup UI.
export function levelBreakdown(cards, types, trainerBonus = 0) {
  const { count, bestRarity, bestTier } = speciesStanding(cards)
  const trait = getTrait(cards?.[0]?.id, types)
  return {
    base: 5,
    dup: duplicateBonus(count),
    rarity: bestTier * 2,
    trainer: trainerBonus,
    trait: trait.startLevel || 0,
    count,
    bestRarity,
    total: 5 + duplicateBonus(count) + bestTier * 2 + trainerBonus + (trait.startLevel || 0),
  }
}
