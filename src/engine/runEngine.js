import { speciesById, recomputeStats, makeInstance } from '../data/pokemon.js'
import { effectiveness } from '../data/types.js'
import { frName } from '../data/frenchNames.js'
import { evaluateBurst } from './comboBurst.js'
import { nextEvolution } from '../data/evolutions.js'
import { biomeForWave } from '../data/biomes.js'
import { speciesRarity } from '../data/cardModel.js'

const LEGENDARY_IDS = new Set([144, 145, 146, 150, 151])

// ---- Wave structure ----------------------------------------------------
export function waveKind(wave) {
  if (wave % 10 === 0) return 'boss'
  if (wave % 5 === 0) return 'elite'
  if (wave % 7 === 0) return 'encounter'   // waves 7, 14, 21, 28 … (not boss or elite)
  if (wave % 3 === 0) return 'trainer'
  return 'wild'
}

export function isShopWave(wave) {
  // A market opens right after each boss (waves 11, 21, 31 ... handled by run flow)
  return wave > 1 && (wave - 1) % 10 === 0
}

// ---- Enemy generation --------------------------------------------------
function pickFrom(arr, rng = Math.random) { return arr[Math.floor(rng() * arr.length)] }

export function buildEnemy(wave, rng = Math.random) {
  const biome = biomeForWave(wave)
  const kind = waveKind(wave)

  let id, level, hpFactor, name
  const baseLevel = Math.max(3, Math.round(3 + wave * 1.5))

  if (kind === 'boss') {
    id = pickFrom(biome.bosses, rng)
    level = baseLevel + 6 + Math.round(wave * 0.4)
    hpFactor = 2.6
  } else if (kind === 'elite') {
    id = pickFrom(biome.pool, rng)
    level = baseLevel + 3
    hpFactor = 1.6
  } else {
    id = pickFrom(biome.pool, rng)
    level = baseLevel
    hpFactor = 1.0
  }

  const sp = speciesById(id) || speciesById(19)
  const mon = makeInstance(sp.id, level)
  const bulk = (1.05 + wave * 0.045) * hpFactor
  mon.maxHp = Math.round(mon.maxHp * bulk)
  mon.hp = mon.maxHp
  mon.kind = kind
  mon.isBoss = kind === 'boss'
  mon.isLegendary = LEGENDARY_IDS.has(sp.id)
  return mon
}

// ---- Player run instances ---------------------------------------------
export function makeRunMon(speciesId, level = 5) {
  const sp = speciesById(speciesId)
  const inst = makeInstance(speciesId, level)
  inst.xp = 0
  inst.runLevel = level
  inst.rarity = speciesRarity(sp)
  return inst
}

export function xpToNext(level) {
  return Math.round(18 + level * level * 0.9)
}

// Apply XP to a run mon (mutates). Returns events: { levels:[], evolutions:[] }.
export function gainXp(mon, amount) {
  const events = { levels: [], evolutions: [] }
  mon.xp = (mon.xp || 0) + amount
  let guard = 0
  while (mon.xp >= xpToNext(mon.level) && guard < 50) {
    mon.xp -= xpToNext(mon.level)
    mon.level += 1
    guard += 1
    const ratio = mon.maxHp ? mon.hp / mon.maxHp : 1
    recomputeStats(mon)
    mon.hp = Math.max(1, Math.round(mon.maxHp * Math.min(1, ratio + 0.08))) // small heal on level
    events.levels.push(mon.level)

    const evo = nextEvolution(mon.id)
    if (evo && mon.level >= evo.level) {
      const fromName = mon.name
      const ratio2 = mon.hp / mon.maxHp
      mon.id = evo.to
      const sp = speciesById(evo.to)
      if (sp) {
        mon.name = frName(evo.to, sp.name)
        mon.species = frName(evo.to, sp.name)
        recomputeStats(mon)
        mon.hp = Math.round(mon.maxHp * ratio2)
        events.evolutions.push({ from: fromName, to: frName(evo.to, sp.name), id: evo.to })
      }
    }
  }
  return events
}

export function xpForWin(enemy, wave) {
  const kind = waveKind(wave)
  const k = kind === 'boss' ? 4 : kind === 'elite' ? 2.2 : kind === 'trainer' ? 1.4 : 1
  return Math.round((enemy.level || 5) * 4 * k)
}

export function goldForWin(wave) {
  const kind = waveKind(wave)
  const base = 12 + Math.round(wave * 1.5)
  if (kind === 'boss') return base * 3
  if (kind === 'elite') return Math.round(base * 1.8)
  if (kind === 'trainer') return Math.round(base * 1.3)
  return base
}

// ---- Burst resolution with relics -------------------------------------
export function resolveBurst(played, enemy, relicAgg = {}) {
  const base = evaluateBurst(played, enemy.types || ['normal'])
  if (!base) return null

  let extraMult = relicAgg.multAdd || 0
  const playedTypes = new Set(played.flatMap(p => p.types || []))
  for (const [t, v] of Object.entries(relicAgg.typeBoost || {})) {
    if (playedTypes.has(t)) extraMult += v
  }
  if (played.length === 1) extraMult += relicAgg.soloMult || 0
  if (played.length >= 3) extraMult += relicAgg.fullTeamAdd || 0
  if (base.hasLegendary) extraMult += relicAgg.legendaryBoost || 0

  const finalMult = base.multiplier + extraMult
  const scale = base.multiplier > 0 ? finalMult / base.multiplier : 1
  let total = Math.round(base.totalDamage * scale) + (relicAgg.dmgFlat || 0)

  let crit = false
  if (Math.random() < (relicAgg.critChance || 0)) { total *= 2; crit = true }

  return {
    ...base,
    multiplier: Math.round(finalMult * 10) / 10,
    totalDamage: Math.max(1, total),
    crit,
  }
}

// Enemy attacks the player's weakest-alive mon. Returns {targetUid, name, damage}.
export function enemyStrike(enemy, team, hps) {
  const alive = team.filter(p => (hps[p.uid] ?? 0) > 0)
  if (!alive.length) return null
  const target = alive.reduce((w, p) => {
    const r1 = (hps[p.uid] || 0) / (p.maxHp || 1)
    const r2 = (hps[w.uid] || 0) / (w.maxHp || 1)
    return r1 < r2 ? p : w
  })
  const lvl = enemy.level || 5
  const eff = effectiveness((enemy.types || ['normal'])[0], target.types || ['normal'])
  const boss = enemy.isBoss ? 1.5 : 1
  const dmg = Math.max(1, Math.floor(lvl * 1.7 * boss * Math.max(eff, 0.5) + Math.random() * lvl * 0.6))
  return { targetUid: target.uid, name: target.name, damage: dmg, eff }
}

// Catch chance scales with how low the enemy's HP is.
export function catchChance(enemy, hpFraction, relicAgg = {}) {
  if (enemy.isBoss) return 0
  const base = 0.25 + (1 - hpFraction) * 0.55
  const legPenalty = enemy.isLegendary ? 0.4 : 1
  return Math.min(0.95, (base + (relicAgg.catchBonus || 0)) * legPenalty)
}
