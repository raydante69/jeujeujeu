// Type "traits": team-wide synergies. Fielding several Pokémon of the same type
// grants an attack bonus to that type's moves during battle, shown in the trait
// bars above each side.
import { typeColor } from './types.js';

export const TRAIT_TIERS = [
  { need: 2, atk: 0.12, label: 'II' },
  { need: 3, atk: 0.25, label: 'III' },
  { need: 4, atk: 0.40, label: 'IV' },
];

// team -> { [type]: { count, atk, tierLabel, color } } for every type that
// reaches at least the first tier.
export function computeTraits(team) {
  const counts = {};
  for (const m of team) {
    if (!m || m.fainted) continue;
    for (const t of m.types) counts[t] = (counts[t] || 0) + 1;
  }
  const traits = {};
  for (const [type, count] of Object.entries(counts)) {
    let tier = null;
    for (const tt of TRAIT_TIERS) if (count >= tt.need) tier = tt;
    if (tier) {
      traits[type] = { count, atk: tier.atk, tierLabel: tier.label, color: typeColor(type) };
    }
  }
  return traits;
}

// Multiplier applied to an attack of `type` given the attacking side's traits.
export function traitAtkMult(traits, type) {
  const t = traits[type];
  return t ? 1 + t.atk : 1;
}
