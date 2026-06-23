import { effectiveness } from '../data/types.js'

// ─────────────────────────────────────────────────────────────────────────
//  DRAFT-DE-COUPS COMBAT ENGINE
//  Each turn the player draws a random HAND of move-cards pulled from their
//  living team's movesets, spends an energy budget to play some of them, and
//  must respond to the enemy's TELEGRAPHED intent (Into-the-Breach style).
//  Keeps the card/collection system intact — every team member contributes
//  3 signature moves derived from its type identity.
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

// Build the 3-move signature kit for one Pokémon instance.
export function buildMoveset(mon) {
  const t0 = (mon.types || ['normal'])[0]
  const base = { ownerUid: mon.uid, ownerName: mon.name, ownerId: mon.id }

  const strike = {
    ...base, key: `${mon.uid}-s`, kind: 'attack', type: t0, power: 1.0, cost: 1,
    name: STRIKE_NAMES[t0] || 'Frappe', emoji: '⚔️', desc: 'Attaque rapide.',
  }
  const heavy = {
    ...base, key: `${mon.uid}-h`, kind: 'attack', type: t0, power: 2.3, cost: 2,
    name: HEAVY_NAMES[t0] || 'Déchaînement', emoji: '💥', desc: 'Grosse attaque.',
  }
  const u = UTILITY_BY_TYPE[t0] || DEFAULT_UTILITY
  const utility = { ...base, key: `${mon.uid}-u`, type: t0, ...u }

  return [strike, heavy, utility]
}

// All move-cards available from the living team this turn.
export function buildPool(team, hps) {
  const pool = []
  for (const mon of team) {
    if ((hps[mon.uid] ?? mon.hp ?? 0) <= 0) continue
    pool.push(...buildMoveset(mon))
  }
  return pool
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

let _handSeq = 0
// Draw a hand of `n` move-cards. Uses unique cards when the pool is large
// enough, otherwise allows repeats. Each card gets a fresh instance id.
export function drawHand(team, hps, n = 5) {
  const pool = buildPool(team, hps)
  if (!pool.length) return []
  const bag = shuffle(pool)
  const hand = []
  for (let i = 0; i < n; i++) {
    const src = pool.length >= n ? bag[i] : bag[i % bag.length]
    hand.push({ ...src, uid: `h${++_handSeq}` })
  }
  return hand
}

// Damage of an attack/drain move from a caster against the enemy.
export function moveDamage(move, caster, enemy, relicAgg = {}) {
  const lvl = caster.level || 5
  const atk = caster.stats?.atk || lvl * 2
  const eff = effectiveness(move.type, enemy.types || ['normal'])
  let dmg = (lvl * 2.2 + atk * 0.35) * (move.power || 1) * Math.max(eff, 0.25)
  const typeBoost = (relicAgg.typeBoost && relicAgg.typeBoost[move.type]) || 0
  dmg = dmg * (1 + typeBoost + (relicAgg.multAdd || 0)) + (relicAgg.dmgFlat || 0)
  return { dmg: Math.max(1, Math.round(dmg)), eff }
}

// Flat guard (damage-absorbing shield) granted by a guard move.
export function guardValue(move, caster) {
  return Math.max(1, Math.round((caster.level || 5) * 2.6 * (move.guard || 1)))
}

// Heal amount (flat HP) for a heal/drain move, per team member.
export function healValue(move, caster) {
  const lvl = caster.level || 5
  const pct = move.heal || 0
  return Math.max(1, Math.round(lvl * 6 * (pct ? pct * 2 : 0.6)))
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
