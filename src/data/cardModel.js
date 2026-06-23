import { nextEvolution } from './evolutions.js'

// ─────────────────────────────────────────────────────────────────────────
//  CARD MODEL — cards are defined by their REAL base stats (no level on the
//  card itself). Rarity reflects the species' power/role, and every card can
//  exist as a Shiny and/or Holographic variant. Holo is reserved for the
//  "important" cards: legendaries and strong final evolutions.
// ─────────────────────────────────────────────────────────────────────────

export const LEGENDARY_IDS = new Set([144, 145, 146, 150, 151])

export function bstOf(sp) {
  const s = sp.stats
  return s.hp + s.atk + s.def + s.spa + s.spd + s.spe
}
export function isLegendary(id) { return LEGENDARY_IDS.has(id) }
export function isFinalEvo(id) { return !nextEvolution(id) }

// Holo eligibility: legendaries + strong final forms only.
export function isHoloEligible(sp) {
  return isLegendary(sp.id) || (isFinalEvo(sp.id) && bstOf(sp) >= 480)
}

// 5-tier power-based rarity (replaces the old random 11-tier scheme).
export const CARD_RARITY = {
  common:    { key: 'common',    label: 'Commune',     color: '#9ca3af', tier: 0, weight: 1000 },
  uncommon:  { key: 'uncommon',  label: 'Peu Commune', color: '#4ade80', tier: 1, weight: 430 },
  rare:      { key: 'rare',      label: 'Rare',        color: '#60a5fa', tier: 2, weight: 150 },
  epic:      { key: 'epic',      label: 'Épique',      color: '#c084fc', tier: 3, weight: 45 },
  legendary: { key: 'legendary', label: 'Légendaire',  color: '#fbbf24', tier: 4, weight: 7 },
}
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary']
export const rarityColor = (r) => CARD_RARITY[r]?.color || '#9ca3af'
export const rarityTier = (r) => CARD_RARITY[r]?.tier ?? 0
export const rarityLabel = (r) => CARD_RARITY[r]?.label || 'Commune'

// Inherent rarity of a species, derived from its strength + role.
export function speciesRarity(sp) {
  if (!sp) return 'common'
  if (isLegendary(sp.id)) return 'legendary'
  const bst = bstOf(sp)
  const final = isFinalEvo(sp.id)
  if (bst >= 580) return 'epic'
  if (bst >= 500 && final) return 'epic'
  if (bst >= 480 || final) return 'rare'
  if (bst >= 410) return 'uncommon'
  return 'common'
}

// Pokérogue-style point cost for using a species as a starter.
export function starterCost(sp) {
  if (!sp) return 1
  const bst = bstOf(sp)
  let c
  if (bst < 280) c = 1
  else if (bst < 350) c = 2
  else if (bst < 430) c = 3
  else if (bst < 500) c = 4
  else if (bst < 560) c = 5
  else c = 6
  if (isLegendary(sp.id)) c = bst >= 670 ? 8 : 7
  return c
}

// Stats helpers for display.
export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
export const STAT_LABEL = { hp: 'PV', atk: 'Atq', def: 'Déf', spa: 'AtqS', spd: 'DéfS', spe: 'Vit' }
export const STAT_MAX = 180 // bar scaling reference

// Unique key per collectible variant (species + shiny + holo).
export function variantKey(card) {
  return `${card.id}${card.shiny ? '-s' : ''}${card.holo ? '-h' : ''}`
}
