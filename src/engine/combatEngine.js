import { effectiveness } from '../data/types.js'
import { getTrait, traitDamageMult } from './../data/signatureTraits.js'
import { rarityTier } from '../data/cardModel.js'

// ─────────────────────────────────────────────────────────────────────────
//  PER-POKÉMON CARD COMBAT ENGINE
//  Each turn: every living Pokémon shows N cards from their personal moveset.
//  Player picks 1 card → plays it → turn ends.
//  Moveset size is determined by rarity + shiny/holo bonus (1-4 moves).
// ─────────────────────────────────────────────────────────────────────────

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
const UTILITY_BY_TYPE = {
  fire:     { kind: 'status', status: 'burn',     name: 'Brûlure',      emoji: '🔥', desc: "Brûle l'ennemi (dégâts chaque tour)." },
  electric: { kind: 'status', status: 'paralyze', name: 'Paralie',      emoji: '⚡', desc: "Paralyse : l'ennemi peut rater son tour." },
  ice:      { kind: 'status', status: 'freeze',   name: 'Onde Glaciale', emoji: '❄️', desc: 'Gèle : saute le prochain tour ennemi.' },
  poison:   { kind: 'status', status: 'poison',   name: 'Toxik',        emoji: '☠️', desc: 'Empoisonne : dégâts croissants.' },
  ghost:    { kind: 'status', status: 'poison',   name: 'Malédiction',  emoji: '👻', desc: 'Affliction : dégâts croissants.' },
  water:    { kind: 'guard',  guard: 1.0,          name: "Mur d'Eau",   emoji: '🌊', desc: 'Bouclier : absorbe la prochaine attaque.' },
  steel:    { kind: 'guard',  guard: 1.4,          name: 'Blindage',    emoji: '🛡️', desc: "Gros bouclier d'équipe." },
  rock:     { kind: 'guard',  guard: 1.1,          name: 'Abri',        emoji: '🪨', desc: "Bouclier d'équipe." },
  psychic:  { kind: 'guard',  guard: 1.0,          name: 'Barrière',    emoji: '🔮', desc: 'Bouclier psychique.' },
  ground:   { kind: 'guard',  guard: 1.0,          name: 'Repli',       emoji: '⛰️', desc: "Bouclier d'équipe." },
  grass:    { kind: 'drain',  power: 1.2,          name: 'Vampigraine', emoji: '🌿', desc: "Dégâts + soigne l'équipe." },
  fairy:    { kind: 'heal',   heal: 0.5,           name: 'Vœu',        emoji: '🧚', desc: "Soigne toute l'équipe." },
  dragon:   { kind: 'heal',   heal: 0.4,           name: 'Danse Draco', emoji: '🐉', desc: "Récupère des PV d'équipe." },
  fighting: { kind: 'buff',   bonus: 0.7,          name: 'Provocation', emoji: '💪', desc: 'Prochaine attaque +70%.' },
}
const DEFAULT_UTILITY = { kind: 'heal', heal: 0.35, name: 'Repos', emoji: '💤', desc: "Soigne légèrement l'équipe." }

// 4th "super" move unlocked for veryrare/epic/legendary (or shiny/holo boost)
const SUPER_BY_TYPE = {
  fire:     { kind: 'drain',  power: 1.9, heal: 0.5, name: 'Inferno',       emoji: '🌋', desc: 'Frappe puissante + soin de l\'équipe.' },
  water:    { kind: 'drain',  power: 1.7, heal: 0.6, name: 'Déluge',        emoji: '🫧', desc: 'Inondation + absorption de PV.' },
  electric: { kind: 'attack', power: 3.2,            name: 'Foudre Zénith', emoji: '☄️', desc: 'Éclair dévastateur.' },
  grass:    { kind: 'drain',  power: 2.0, heal: 0.8, name: 'Méga-Vampigraine', emoji: '🌳', desc: 'Drain massif sur l\'ennemi.' },
  ice:      { kind: 'attack', power: 3.0,            name: 'Blizzard',      emoji: '🌨️', desc: 'Tempête de glace dévastatrice.' },
  fighting: { kind: 'attack', power: 3.0,            name: 'Fracas',        emoji: '💥', desc: 'Frappe implacable.' },
  poison:   { kind: 'status', status: 'poison',      name: 'Tox',          emoji: '💀', desc: 'Poison virulent à stacks rapides.' },
  ground:   { kind: 'attack', power: 3.2,            name: 'Tremblement',   emoji: '🏔️', desc: 'Séisme destructeur.' },
  flying:   { kind: 'attack', power: 2.8,            name: 'Vent Fatal',    emoji: '🌪️', desc: 'Bourrasque mortelle.' },
  psychic:  { kind: 'buff',   bonus: 1.5,            name: 'Pouvoir Psy',   emoji: '🔮', desc: 'Prochaine attaque ×2.5 !' },
  bug:      { kind: 'drain',  power: 1.6, heal: 0.4, name: 'Siphon Vital',  emoji: '🐛', desc: 'Drain de force vitale.' },
  rock:     { kind: 'attack', power: 3.0,            name: 'Roc Fatal',     emoji: '🪨', desc: 'Avalanche dévastatrice.' },
  ghost:    { kind: 'attack', power: 2.8,            name: 'Ombre Fatale',  emoji: '👁️', desc: 'Attaque spectrale ultime.' },
  dragon:   { kind: 'attack', power: 3.5,            name: 'Dragon Fatal',  emoji: '🐲', desc: 'Puissance draconique suprême.' },
  dark:     { kind: 'attack', power: 3.0,            name: 'Nuit Noire',    emoji: '🌑', desc: 'Coup des ténèbres ultime.' },
  steel:    { kind: 'guard',  guard: 2.2,            name: 'Fort Knox',     emoji: '🔩', desc: 'Bouclier d\'acier absolu.' },
  fairy:    { kind: 'heal',   heal: 1.0,             name: 'Grâce Féerique',emoji: '✨', desc: 'Soin complet de toute l\'équipe.' },
  normal:   { kind: 'attack', power: 3.0,            name: 'Hyper Rayon',   emoji: '💫', desc: 'Rayon destructeur ultime.' },
}

export const STATUS_DEF = {
  burn:     { label: '🔥 Brûlé',     color: '#f97316', turns: 3, tickPct: 0.04 },
  poison:   { label: '☠️ Empoisonné', color: '#a855f7', turns: 4, tickPct: 0.03, ramps: true },
  paralyze: { label: '⚡ Paralysé',   color: '#facc15', turns: 3, skip: 0.35 },
  freeze:   { label: '❄️ Gelé',       color: '#7dd3fc', turns: 1, skip: 1 },
}

// How many moves a Pokémon has based on rarity + shiny/holo.
// common=1, uncommon=2, rare=3, veryrare=3, epic=4, legendary=4
// +1 for shiny, +1 for holo (capped at 4)
export function movesetSize(mon) {
  const tier = rarityTier(mon.rarity || 'common') // 0-5
  let base
  if (tier === 0) base = 1
  else if (tier === 1) base = 2
  else if (tier <= 3) base = 3  // rare + veryrare
  else base = 4                 // epic + legendary
  if (mon.shiny) base = Math.min(4, base + 1)
  if (mon.holo)  base = Math.min(4, base + 1)
  return base
}

// Build the full signature moveset for a Pokémon (up to 4 moves).
// Respects mon.customMoves if set (from ProfShen swap).
export function buildMoveset(mon) {
  if (mon.customMoves && mon.customMoves.length > 0) return mon.customMoves

  const t0 = (mon.types || ['normal'])[0]
  const base = { ownerUid: mon.uid, ownerName: mon.name, ownerId: mon.id, ownerRarity: mon.rarity }

  const strike = {
    ...base, key: `${mon.uid}-s`, kind: 'attack', type: t0, power: 1.0,
    name: STRIKE_NAMES[t0] || 'Frappe', emoji: '⚔️', desc: 'Attaque rapide.',
  }
  const heavy = {
    ...base, key: `${mon.uid}-h`, kind: 'attack', type: t0, power: 2.3,
    name: HEAVY_NAMES[t0] || 'Déchaînement', emoji: '💥', desc: 'Grosse attaque.',
  }
  const u = UTILITY_BY_TYPE[t0] || DEFAULT_UTILITY
  const utility = { ...base, key: `${mon.uid}-u`, type: t0, ...u }
  const s = SUPER_BY_TYPE[t0] || { kind: 'attack', power: 3.0, name: 'Coup Suprême', emoji: '🌟', desc: 'Attaque ultime.' }
  const superMove = { ...base, key: `${mon.uid}-x`, type: t0, ...s }

  return [strike, heavy, utility, superMove]
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

// Draw per-Pokémon card slots. Returns { [monUid]: Card[] }.
// Each living Pokémon gets `cardsPerSlot` randomly-selected moves from their moveset.
export function drawPerMon(team, hps, cardsPerSlot = 1) {
  const slots = {}
  for (const mon of team) {
    if ((hps[mon.uid] ?? 0) <= 0) continue
    const size = movesetSize(mon)
    const fullMoveset = buildMoveset(mon).slice(0, size)
    const available = shuffle([...fullMoveset])
    slots[mon.uid] = available.slice(0, Math.min(cardsPerSlot, available.length))
      .map(m => ({ ...m, uid: `h${++_handSeq}` }))
  }
  return slots
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

export function guardValue(move, caster) {
  const trait = getTrait(caster.id, caster.types)
  const mult = 1 + (trait.guardMult || 0)
  return Math.max(1, Math.round((caster.level || 5) * 2.6 * (move.guard || 1) * mult))
}

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
  const moveName = heavy ? (HEAVY_NAMES[t0] || 'Charge Lourde') : (STRIKE_NAMES[t0] || 'Attaque')
  return {
    kind: heavy ? 'heavy' : 'attack',
    targetUid: target.uid, targetName: target.name,
    damage: dmg, eff, type: t0, moveName,
  }
}
