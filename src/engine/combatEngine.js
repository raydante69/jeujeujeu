import { effectiveness } from '../data/types.js'
import { getTrait, traitDamageMult } from './../data/signatureTraits.js'

// ─────────────────────────────────────────────────────────────────────────
//  PRESSION TEMPO COMBAT ENGINE  (Système G)
//  Each Pokémon has 1–4 fixed attacks based on rarity.
//  Heavy attacks have cooldowns. Enemy rage grows each turn.
//  Boss gains type immunity that rotates every 3 turns.
//  Win quickly for bonus XP; drag on for a penalty.
// ─────────────────────────────────────────────────────────────────────────

// Flavoured attack names per type — light "strike" + heavy "nuke".
const STRIKE_NAMES = {
  normal: 'Charge', fire: 'Flammèche', water: 'Pistolet à O', electric: 'Éclair',
  grass: 'Fouet Lianes', ice: 'Éclat Glace', fighting: 'Balayage', poison: 'Dard-Venin',
  ground: 'Frappe Sol', flying: 'Cru-Aile', psychic: 'Choc Mental', bug: 'Piqûre',
  rock: 'Jet-Pierres', ghost: 'Léchouille', dragon: 'Souffle Draco', dark: 'Coup Bas',
  steel: 'Griffe Acier', fairy: 'Câlinerie',
}
const HEAVY_NAMES = {
  normal: 'Ultralaser', fire: 'Lance-Flammes', water: 'Hydrocanon', electric: 'Tonnerre',
  grass: 'Lance-Soleil', ice: 'Laser Glace', fighting: 'Close Combat', poison: 'Bomb-Beurk',
  ground: 'Séisme', flying: 'Aéropique', psychic: 'Psyko', bug: 'Dard-Nuée',
  rock: 'Éboulement', ghost: "Ball'Ombre", dragon: 'Draco-Météore', dark: 'Tricherie',
  steel: 'Luminocanon', fairy: 'Éclat Magique',
}

// The 3rd "signature" move is decided by the Pokémon's primary type identity.
const UTILITY_BY_TYPE = {
  fire:     { kind: 'status', status: 'burn',     name: 'Brûlure',     emoji: '🔥', cost: 2, desc: "Brûle l'ennemi (dégâts chaque tour)." },
  electric: { kind: 'status', status: 'paralyze', name: 'Paralie',     emoji: '⚡', cost: 2, desc: "Paralyse : l'ennemi peut rater son tour." },
  ice:      { kind: 'status', status: 'freeze',   name: 'Onde Glaciale',emoji: '❄️', cost: 3, desc: 'Gèle : saute le prochain tour ennemi.' },
  poison:   { kind: 'status', status: 'poison',   name: 'Toxik',       emoji: '☠️', cost: 2, desc: 'Empoisonne : dégâts croissants.' },
  ghost:    { kind: 'status', status: 'poison',   name: 'Malédiction', emoji: '👻', cost: 2, desc: 'Affliction : dégâts croissants.' },
  water:    { kind: 'guard',  guard: 1.0,         name: "Mur d'Eau",   emoji: '🌊', cost: 2, desc: 'Bouclier : absorbe la prochaine attaque.' },
  steel:    { kind: 'guard',  guard: 1.4,         name: 'Blindage',    emoji: '🛡️', cost: 2, desc: "Gros bouclier d'équipe." },
  rock:     { kind: 'guard',  guard: 1.1,         name: 'Abri',        emoji: '🪨', cost: 2, desc: "Bouclier d'équipe." },
  psychic:  { kind: 'guard',  guard: 1.0,         name: 'Barrière',    emoji: '🔮', cost: 2, desc: 'Bouclier psychique.' },
  ground:   { kind: 'guard',  guard: 1.0,         name: 'Repli',       emoji: '⛰️', cost: 1, desc: "Bouclier d'équipe." },
  grass:    { kind: 'drain',  power: 1.2,         name: 'Vampigraine', emoji: '🌿', cost: 2, desc: "Dégâts + soigne l'équipe." },
  fairy:    { kind: 'heal',   heal: 0.5,          name: 'Vœu',         emoji: '🧚', cost: 2, desc: "Soigne toute l'équipe." },
  dragon:   { kind: 'heal',   heal: 0.4,          name: 'Danse Draco', emoji: '🐉', cost: 2, desc: "Récupère des PV d'équipe." },
  fighting: { kind: 'buff',   bonus: 0.7,         name: 'Provocation', emoji: '💪', cost: 1, desc: 'Prochaine attaque +70%.' },
}
const DEFAULT_UTILITY = { kind: 'heal', heal: 0.35, name: 'Repos', emoji: '💤', cost: 1, desc: "Soigne légèrement l'équipe." }

// Status timing/effects, shared with the battle screen.
export const STATUS_DEF = {
  burn:     { label: '🔥 Brûlé',    color: '#f97316', turns: 3, tickPct: 0.04 },
  poison:   { label: '☠️ Empoisonné',color: '#a855f7', turns: 4, tickPct: 0.03, ramps: true },
  paralyze: { label: '⚡ Paralysé',  color: '#facc15', turns: 3, skip: 0.35 },
  freeze:   { label: '❄️ Gelé',      color: '#7dd3fc', turns: 1, skip: 1 },
}

// 3rd move: signature name (more powerful strike, cooldown 3)
const SIGNATURE_NAMES = {
  normal: 'Hyper Beam', fire: 'Déflagration', water: 'Vague Fatale',
  electric: 'Électrochoc', grass: 'Bourrasque', ice: 'Blizzard',
  fighting: 'Mégapoing', poison: 'Acid Bomb', ground: 'Fissure',
  flying: 'Tornade', psychic: 'Psycha Boost', bug: 'Essaim',
  rock: 'Avalanche', ghost: 'Ténèbres', dragon: 'Draco Rage',
  dark: 'Nuit Noire', steel: 'Canon Acier', fairy: 'Charme Fatal',
}
// 4th move: ultimate (devastator, cooldown 4)
const ULTIMATE_NAMES = {
  normal: 'Explosion', fire: 'Éruption', water: 'Marée Noire',
  electric: 'Tonnerre+', grass: 'Feuille Tempête', ice: 'Grêle Max',
  fighting: 'Close Combat+', poison: 'Toxic Mega', ground: 'Séisme Max',
  flying: 'Aéropique Max', psychic: 'Psyko Max', bug: 'Nuée Max',
  rock: 'Pierres Folles', ghost: 'Destin Lié', dragon: 'Draco Météore',
  dark: 'Nuit Noire Max', steel: 'Météo Acier', fairy: 'Rayon Lune',
}

// Number of attacks per Pokémon based on rarity.
export function attackCountForMon(mon) {
  const r = mon.rarity || 'commune'
  if (r === 'legendaire' || r === 'epique') return 4
  if (r === 'tres-rare' || r === 'rare') return 3
  return 2
}

// Build the fixed moveset for System G (1–4 attacks, cooldowns, clear descs).
export function buildMovesetG(mon) {
  const count = attackCountForMon(mon)
  const t0 = (mon.types || ['normal'])[0]
  const base = { ownerUid: mon.uid, ownerName: mon.name, ownerId: mon.id, type: t0 }
  const moves = []

  // Move 1: light strike — no cooldown, always available
  moves.push({
    ...base, key: `${mon.uid}-s`, kind: 'attack', power: 1.0, cooldown: 0,
    name: STRIKE_NAMES[t0] || 'Frappe', emoji: '⚔️',
    desc: 'Attaque rapide et fiable. Aucun temps de recharge.',
  })

  if (count >= 2) {
    // Move 2: heavy — cooldown 2 turns
    moves.push({
      ...base, key: `${mon.uid}-h`, kind: 'attack', power: 2.5, cooldown: 2,
      name: HEAVY_NAMES[t0] || 'Déchaînement', emoji: '💥',
      desc: 'Frappe puissante. Temps de recharge : 2 tours.',
    })
  }

  if (count >= 3) {
    // Move 3: utility (status / guard / heal / drain) — cooldown 2
    const u = UTILITY_BY_TYPE[t0] || DEFAULT_UTILITY
    moves.push({ ...base, key: `${mon.uid}-u`, cooldown: 2, ...u })
  }

  if (count >= 4) {
    // Move 4: signature ultimate — cooldown 4 turns
    moves.push({
      ...base, key: `${mon.uid}-ult`, kind: 'attack', power: 4.0, cooldown: 4,
      name: ULTIMATE_NAMES[t0] || 'Uppercut Final', emoji: '🌠',
      desc: 'Attaque ultime dévastatrice. Temps de recharge : 4 tours.',
    })
  }

  return moves
}

// Legacy helpers kept for backward-compat (unused in System G).
export function buildMoveset(mon) { return buildMovesetG(mon) }
export function buildPool(team, hps) {
  const pool = []
  for (const mon of team) {
    if ((hps[mon.uid] ?? mon.hp ?? 0) <= 0) continue
    pool.push(...buildMovesetG(mon))
  }
  return pool
}
export function drawHand(team, hps, n = 5) { return buildPool(team, hps).slice(0, n) }

// ── System G: rage & immunity ─────────────────────────────────────────────

// Enemy damage multiplier driven by player rage level (turns elapsed).
export function rageMultiplier(rage) {
  if (rage >= 10) return 1.5
  if (rage >= 5)  return 1.2
  return 1
}

// Boss type immunity cycles every 3 turns through a fixed list.
const IMMUNITY_CYCLE = [
  'fire','water','electric','grass','ice','fighting','psychic','dragon','poison','ground',
]
export function getBossImmunity(turn) {
  return IMMUNITY_CYCLE[Math.floor((turn - 1) / 3) % IMMUNITY_CYCLE.length]
}

// Preview info for a move before the player commits (used by the UI).
export function previewMove(move, caster, enemy, relicAgg = {}) {
  if (move.kind === 'attack') {
    const { dmg, eff } = moveDamage(move, caster, enemy, relicAgg)
    return { valueType: 'damage', value: dmg, eff, color: '#ef4444' }
  }
  if (move.kind === 'drain') {
    const { dmg, eff } = moveDamage(move, caster, enemy, relicAgg)
    const heal = healValue(move, caster)
    return { valueType: 'drain', dmg, heal, eff, color: '#4ade80' }
  }
  if (move.kind === 'heal') {
    return { valueType: 'heal', value: healValue(move, caster), color: '#4ade80' }
  }
  if (move.kind === 'guard') {
    return { valueType: 'shield', value: guardValue(move, caster), color: '#60a5fa' }
  }
  if (move.kind === 'status') {
    const def = STATUS_DEF[move.status]
    return { valueType: 'status', color: def?.color || '#a855f7', label: def?.label || 'Statut' }
  }
  if (move.kind === 'buff') {
    const pct = Math.round((move.bonus || 0.7) * 100)
    return { valueType: 'buff', value: pct, color: '#f97316' }
  }
  return { valueType: 'unknown', color: '#94a3b8' }
}

// Damage of an attack/drain move from a caster against the enemy.
export function moveDamage(move, caster, enemy, relicAgg = {}) {
  const lvl = caster.level || 5
  const atk = caster.stats?.atk || lvl * 2
  const eff = effectiveness(move.type, enemy.types || ['normal'])
  let dmg = (lvl * 2.2 + atk * 0.35) * (move.power || 1) * Math.max(eff, 0.25)
  const trait = getTrait(caster.id, caster.types)
  dmg *= traitDamageMult(trait, move.type)
  const typeBoost = (relicAgg.typeBoost && relicAgg.typeBoost[move.type]) || 0
  dmg = dmg * (1 + typeBoost + (relicAgg.multAdd || 0)) + (relicAgg.dmgFlat || 0)
  return { dmg: Math.max(1, Math.round(dmg)), eff }
}

// Flat guard (damage-absorbing shield) granted by a guard move.
export function guardValue(move, caster) {
  const trait = getTrait(caster.id, caster.types)
  const mult = 1 + (trait.guardMult || 0)
  return Math.max(1, Math.round((caster.level || 5) * 2.6 * (move.guard || 1) * mult))
}

// Heal amount (flat HP) for a heal/drain move, per team member.
export function healValue(move, caster) {
  const lvl = caster.level || 5
  const pct = move.heal || 0
  const trait = getTrait(caster.id, caster.types)
  const mult = 1 + (trait.healMult || 0)
  return Math.max(1, Math.round(lvl * 6 * (pct ? pct * 2 : 0.6) * mult))
}

function weakest(alive, hps) {
  return alive.reduce((w, p) => {
    const r1 = (hps[p.uid] ?? 0) / (p.maxHp || 1)
    const r2 = (hps[w.uid] ?? 0) / (w.maxHp || 1)
    return r1 < r2 ? p : w
  })
}

// Telegraph the enemy's next action so the player can plan a response.
export function computeIntent(enemy, team, hps) {
  const alive = team.filter(p => (hps[p.uid] ?? 0) > 0)
  if (!alive.length) return null
  const target = weakest(alive, hps)
  const lvl = enemy.level || 5
  const t0 = (enemy.types || ['normal'])[0]
  const eff = effectiveness(t0, target.types || ['normal'])
  const role = enemy.isBoss ? 1.5 : enemy.kind === 'elite' ? 1.2 : 1
  const heavy = (enemy.isBoss || enemy.kind === 'elite') && Math.random() < 0.3
  const mult = heavy ? 1.85 : 1
  const dmg = Math.max(1, Math.round(lvl * 1.7 * role * mult * Math.max(eff, 0.5)))
  return {
    kind: heavy ? 'heavy' : 'attack',
    targetUid: target.uid, targetName: target.name,
    damage: dmg, eff, type: t0,
  }
}
