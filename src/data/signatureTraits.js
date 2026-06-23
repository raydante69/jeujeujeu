import { TYPE_LABELS_FR } from './types.js'

// ─────────────────────────────────────────────────────────────────────────
//  SIGNATURE TRAITS — every Pokémon has a passive identity in combat.
//  Iconic species get bespoke traits; everyone else gets a generic
//  "type affinity" so no two team-mates feel completely interchangeable.
//
//  Trait fields (all optional):
//    dmgType    — type whose moves get boosted ('*' = all types)
//    dmgMult    — extra damage fraction (0.3 = +30%)
//    guardMult  — extra shield fraction on guard moves
//    healMult   — extra healing fraction on heal/drain moves
//    statusTurns— extra turns on inflicted statuses
//    buffPlus   — extra fraction added to buff moves
//    startLevel — bonus starting level when this mon leads a run
// ─────────────────────────────────────────────────────────────────────────

const SIGNATURE = {
  25:  { name: 'Statique',        emoji: '⚡', dmgType: 'electric', dmgMult: 0.30, desc: '+30% aux attaques Électrik.' },
  26:  { name: 'Surcharge',       emoji: '⚡', dmgType: 'electric', dmgMult: 0.45, desc: '+45% aux attaques Électrik.' },
  6:   { name: 'Brasier',         emoji: '🔥', dmgType: 'fire',     dmgMult: 0.35, desc: '+35% aux attaques Feu.' },
  4:   { name: 'Petite Flamme',   emoji: '🔥', dmgType: 'fire',     dmgMult: 0.20, desc: '+20% aux attaques Feu.' },
  9:   { name: 'Carapace',        emoji: '🛡️', dmgType: 'water',    dmgMult: 0.15, guardMult: 0.40, desc: 'Boucliers +40%.' },
  3:   { name: 'Symbiose',        emoji: '🌿', dmgType: 'grass',    dmgMult: 0.20, healMult: 0.50, desc: 'Soins +50%.' },
  143: { name: 'Immunité',        emoji: '😴', dmgType: 'normal',   dmgMult: 0.15, startLevel: 6,  desc: 'Démarre +6 niveaux.' },
  150: { name: 'Pression Psy',    emoji: '🔮', dmgType: 'psychic',  dmgMult: 0.40, startLevel: 8,  desc: '+40% Psy · démarre +8 niveaux.' },
  151: { name: 'Métamorph',       emoji: '✨', dmgType: '*',        dmgMult: 0.20, startLevel: 5,  desc: '+20% à TOUS les types.' },
  149: { name: 'Multi-Écailles',  emoji: '🐉', dmgType: 'dragon',   dmgMult: 0.35, guardMult: 0.20, desc: '+35% Dragon · boucliers +20%.' },
  131: { name: 'Chant Apaisant',  emoji: '🧊', dmgType: 'ice',      dmgMult: 0.15, healMult: 0.60, desc: 'Soins +60%.' },
  65:  { name: 'Synchro',         emoji: '🥄', dmgType: 'psychic',  dmgMult: 0.30, statusTurns: 1, desc: 'Statuts +1 tour.' },
  94:  { name: 'Lévitation',      emoji: '👻', dmgType: 'ghost',    dmgMult: 0.30, statusTurns: 1, desc: 'Statuts +1 tour.' },
  130: { name: 'Intimidation',    emoji: '🌊', dmgType: '*',        dmgMult: 0.15, desc: '+15% à toutes les attaques.' },
  59:  { name: 'Feu Ardent',      emoji: '🔥', dmgType: 'fire',     dmgMult: 0.30, desc: '+30% aux attaques Feu.' },
  68:  { name: 'Garde Maîtrisée', emoji: '💪', dmgType: 'fighting', dmgMult: 0.30, buffPlus: 0.40, desc: 'Boosts +40% supplémentaires.' },
  112: { name: 'Roc-Garde',       emoji: '🪨', dmgType: 'ground',   dmgMult: 0.20, guardMult: 0.30, desc: 'Boucliers +30%.' },
  38:  { name: 'Flamme Maudite',  emoji: '🦊', dmgType: 'fire',     dmgMult: 0.25, statusTurns: 1, desc: '+25% Feu · statuts +1 tour.' },
}

// Generic per-type affinity for everyone without a signature.
function genericTrait(types) {
  const t = (types || ['normal'])[0]
  return {
    name: `Affinité ${TYPE_LABELS_FR[t] || t}`,
    emoji: '🔹',
    dmgType: t,
    dmgMult: 0.15,
    desc: `+15% aux attaques ${TYPE_LABELS_FR[t] || t}.`,
    generic: true,
  }
}

export function getTrait(speciesId, types) {
  return SIGNATURE[speciesId] || genericTrait(types)
}

// Multiplier applied to a move's damage given the caster's trait.
export function traitDamageMult(trait, moveType) {
  if (!trait) return 1
  if (trait.dmgType === '*' || trait.dmgType === moveType) return 1 + (trait.dmgMult || 0)
  return 1
}
