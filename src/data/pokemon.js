import { makeMove } from './moves.js'
import { frName } from './frenchNames.js'

let DATA = null
const BY_ID = new Map()
const BY_SLUG = new Map()
let UID = 1

export async function loadPokemonData() {
  const res = await fetch('/data/pokemon.json')
  if (!res.ok) throw new Error('Could not load pokemon.json')
  DATA = await res.json()
  for (const sp of DATA.pokemon) {
    BY_ID.set(sp.id, sp)
    BY_SLUG.set(sp.slug, sp)
  }
  return DATA
}

export function allSpecies() {
  return DATA ? DATA.pokemon : []
}
export function speciesById(id) {
  return BY_ID.get(id)
}
export function speciesBySlug(slug) {
  return BY_SLUG.get(slug)
}

export function statAtLevel(base, level, isHp) {
  if (isHp) return Math.floor((2 * base * level) / 100) + level + 10
  return Math.floor((2 * base * level) / 100) + 5
}

export function recomputeStats(inst) {
  const sp = speciesById(inst.id)
  if (!sp) return inst
  const s = sp.stats
  inst.stats = {
    hp: statAtLevel(s.hp, inst.level, true),
    atk: statAtLevel(s.atk, inst.level),
    def: statAtLevel(s.def, inst.level),
    spa: statAtLevel(s.spa, inst.level),
    spd: statAtLevel(s.spd, inst.level),
    spe: statAtLevel(s.spe, inst.level),
  }
  // Permanent vitamin bonuses (run consumables) survive level-ups.
  if (inst.statBonus) {
    for (const [k, v] of Object.entries(inst.statBonus)) {
      inst.stats[k] = (inst.stats[k] || 0) + v
    }
  }
  // hpMult is set on run-team mons (makeRunMon) to give a player HP bonus.
  inst.maxHp = Math.round(inst.stats.hp * (inst.hpMult || 1))
  if (inst.hp > inst.maxHp) inst.hp = inst.maxHp
  inst.types = sp.types.slice()
  return inst
}

export function makeInstance(id, level, opts = {}) {
  const sp = speciesById(id)
  if (!sp) throw new Error(`Unknown species id ${id}`)
  const inst = {
    uid: UID++,
    id,
    name: frName(id, sp.name),
    species: frName(id, sp.name),
    types: sp.types.slice(),
    level,
    shiny: !!opts.shiny,
    holo: !!opts.holo,
    rarity: opts.rarity || 'common',
    move: makeMove(sp.types[0]),
  }
  recomputeStats(inst)
  inst.hp = inst.maxHp
  return inst
}

export function spriteFront(inst) {
  const sp = speciesById(inst.id)
  if (!sp) return ''
  return inst.shiny ? sp.sprites.shiny : sp.sprites.front
}

export function spriteArtwork(idOrInst) {
  const id = typeof idOrInst === 'number' ? idOrInst : idOrInst.id
  const sp = BY_ID.get(id)
  return sp ? sp.sprites.artwork : ''
}

export function ensureUidAbove(n) {
  if (n >= UID) UID = n + 1
}
