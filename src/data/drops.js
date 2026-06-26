// ─────────────────────────────────────────────────────────────────────────
//  TABLE DE DROP D'OBJETS
//  Les objets ne s'achètent plus en masse : on les DROP en combat.
//  - Proba qu'un Pokémon lâche un objet : 5 % par point de valeur (géré côté
//    appelant via starterCost).
//  - Si drop : le TYPE est tiré → CT 10 %, sinon Balls / Potions / Pierres à
//    30 % chacun (90 % répartis également sur les 3 autres types).
//  - Dans un type, les poids de rareté sont INTERPOLÉS selon la vague (1 → 100)
//    pour que les objets rares deviennent moins rares en profondeur et les
//    communs plus rares.
// ─────────────────────────────────────────────────────────────────────────

import { rollRandomCT } from './ct.js'

// Chaque entrée : poids à la vague 1 (w1) et à la vague 100 (w100).
const BALL_POOL = [
  { id: 'poke-ball',   w1: 60, w100: 18 },
  { id: 'great-ball',  w1: 28, w100: 30 },
  { id: 'ultra-ball',  w1: 11, w100: 40 },
  { id: 'master-ball', w1: 1,  w100: 12 },
]
const POTION_POOL = [
  { id: 'potion',       w1: 48, w100: 12 },
  { id: 'super-potion', w1: 26, w100: 22 },
  { id: 'hyper-potion', w1: 12, w100: 26 },
  { id: 'revive',       w1: 9,  w100: 18 },
  { id: 'full-restore', w1: 4,  w100: 14 },
  { id: 'max-revive',   w1: 1,  w100: 8 },
]
const STONE_POOL = [
  { id: 'fire-stone',    w1: 1, w100: 1 },
  { id: 'water-stone',   w1: 1, w100: 1 },
  { id: 'thunder-stone', w1: 1, w100: 1 },
  { id: 'leaf-stone',    w1: 1, w100: 1 },
  { id: 'moon-stone',    w1: 1, w100: 1 },
]

function lerpWeights(pool, wave) {
  const t = Math.max(0, Math.min(1, (wave - 1) / 99))
  return pool.map(e => ({ id: e.id, w: e.w1 + (e.w100 - e.w1) * t }))
}

function pickWeighted(weighted) {
  const total = weighted.reduce((s, e) => s + e.w, 0)
  let roll = Math.random() * total
  for (const e of weighted) { roll -= e.w; if (roll <= 0) return e.id }
  return weighted[0].id
}

// Returns a drop descriptor or null is never returned (caller decides if a drop
// happens). Shape: { kind:'ct'|'ball'|'potion'|'stone', id, n, ct? }
export function rollDrop(wave = 1) {
  const r = Math.random()
  if (r < 0.10) {
    const ct = rollRandomCT()
    return { kind: 'ct', id: ct.id, ct, n: 1 }
  }
  // 90 % restants répartis en 3 tiers égaux (30 % chacun).
  let type, pool
  if (r < 0.40)      { type = 'ball';   pool = BALL_POOL }
  else if (r < 0.70) { type = 'potion'; pool = POTION_POOL }
  else               { type = 'stone';  pool = STONE_POOL }
  return { kind: type, id: pickWeighted(lerpWeights(pool, wave)), n: 1 }
}
