// Ascension — difficulty tiers unlocked by clearing the wave-10 boss. Each tier
// adds a CUMULATIVE modifier to the next run, in the spirit of roguelite
// "ascension" ladders. aggregateAscension(level) folds tiers 1..level into one
// object the run/combat engines read.

export const MAX_ASCENSION = 8

export const ASCENSION_MODS = [
  { level: 1, name: 'Ennemis Coriaces', icon: '❤️', desc: '+15% PV ennemis',                 enemyHpMult: 0.15 },
  { level: 2, name: 'Disette',          icon: '💰', desc: '-20% or gagné',                    goldMult: -0.20 },
  { level: 3, name: 'Frappe Dure',      icon: '💥', desc: '+15% dégâts ennemis',              enemyDmgMult: 0.15 },
  { level: 4, name: 'Élites Partout',   icon: '⭐', desc: '25% des combats sauvages deviennent des élites', eliteChance: 0.25 },
  { level: 5, name: 'Boss Enragés',     icon: '😡', desc: 'Les boss démarrent enragés',       bossRageFromStart: true },
  { level: 6, name: 'Murs de PV',       icon: '🧱', desc: '+20% PV ennemis supplémentaires',  enemyHpMult: 0.20 },
  { level: 7, name: 'Famine',           icon: '🥀', desc: '-20% or supplémentaire',           goldMult: -0.20 },
  { level: 8, name: 'Cauchemar',        icon: '🌑', desc: '+20% dégâts ennemis supplémentaires', enemyDmgMult: 0.20 },
]

// Fold tiers 1..level into a single effects object.
export function aggregateAscension(level = 0) {
  const agg = {
    level,
    enemyHpMult: 1,    // multiply enemy maxHp
    enemyDmgMult: 1,   // multiply enemy damage
    goldMult: 1,       // multiply gold rewards
    eliteChance: 0,    // chance a wild wave is upgraded to elite
    bossRageFromStart: false,
  }
  for (const m of ASCENSION_MODS) {
    if (m.level > level) break
    if (m.enemyHpMult)  agg.enemyHpMult  += m.enemyHpMult
    if (m.enemyDmgMult) agg.enemyDmgMult += m.enemyDmgMult
    if (m.goldMult)     agg.goldMult      = Math.max(0.1, agg.goldMult + m.goldMult)
    if (m.eliteChance)  agg.eliteChance   = Math.max(agg.eliteChance, m.eliteChance)
    if (m.bossRageFromStart) agg.bossRageFromStart = true
  }
  return agg
}

// Modifiers that are newly introduced exactly at `level` (for previews).
export function modsAtLevel(level) {
  return ASCENSION_MODS.filter(m => m.level <= level)
}
