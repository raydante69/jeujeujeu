import { typeColor } from './types.js'

export const TRAIT_TIERS = [
  { need: 2, atk: 0.12, label: '×2' },
  { need: 3, atk: 0.25, label: '×3' },
  { need: 4, atk: 0.40, label: '×4' },
]

export function computeTraits(team) {
  const counts = {}
  for (const m of team) {
    if (!m || m.fainted) continue
    for (const t of m.types) counts[t] = (counts[t] || 0) + 1
  }
  const traits = {}
  for (const [type, count] of Object.entries(counts)) {
    let tier = null
    for (const tt of TRAIT_TIERS) if (count >= tt.need) tier = tt
    if (tier) {
      traits[type] = { count, atk: tier.atk, tierLabel: tier.label, color: typeColor(type) }
    }
  }
  return traits
}

export function traitAtkMult(traits, type) {
  const t = traits[type]
  return t ? 1 + t.atk : 1
}
