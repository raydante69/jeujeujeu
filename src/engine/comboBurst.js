import { effectiveness } from '../data/types.js'

const LEGENDARY_IDS = new Set([144, 145, 146, 150, 151])

// Evaluate the burst from playing a set of Pokemon vs an enemy type
export function evaluateBurst(played, enemyTypes) {
  if (!played || !played.length) return null

  const n = played.length
  const typeCount = {}
  played.forEach(p => {
    const t = (p.types || ['normal'])[0]
    typeCount[t] = (typeCount[t] || 0) + 1
  })
  const maxSameType = Math.max(...Object.values(typeCount))
  const uniqueTypeCount = Object.keys(typeCount).length

  const effScores = played.map(p => {
    let best = 1
    for (const at of (p.types || ['normal'])) {
      const e = effectiveness(at, enemyTypes || ['normal'])
      if (e > best) best = e
    }
    return best
  })

  const allSuper = effScores.every(e => e >= 2)
  const anySuper = effScores.some(e => e >= 2)
  const hasLegendary = played.some(p => LEGENDARY_IDS.has(p.id))

  const allTypes = new Set(played.flatMap(p => p.types || []))
  const hasElemental = allTypes.has('fire') && allTypes.has('water') && allTypes.has('grass')
  const hasChain = n >= 2 && checkTypeChain(played)

  let name, multiplier, color, emoji, desc

  if (n === 3 && maxSameType === 3 && allSuper) {
    name = 'TRIPLE SURGE'; multiplier = 7.0; color = '#fbbf24'; emoji = '🌟'
    desc = 'Triple type identique + super efficace !'
  } else if (n === 3 && maxSameType === 3) {
    name = 'TRINITY'; multiplier = 4.0; color = '#a78bfa'; emoji = '⚡'
    desc = '3 Pokémon du même type !'
  } else if (n === 3 && allSuper) {
    name = 'FULL HOUSE'; multiplier = 5.5; color = '#f97316'; emoji = '🔥'
    desc = 'Tous super efficaces ×3 !'
  } else if (hasElemental) {
    name = 'ÉLÉMENTAL'; multiplier = 3.5; color = '#34d399'; emoji = '🌿'
    desc = 'Triangle Feu · Eau · Plante !'
  } else if (n === 2 && maxSameType === 2 && allSuper) {
    name = 'DUO SURGE'; multiplier = 3.0; color = '#60a5fa'; emoji = '💥'
    desc = 'Duo du même type + super efficace !'
  } else if (n === 2 && maxSameType === 2) {
    name = 'TYPE DUO'; multiplier = 2.0; color = '#818cf8'; emoji = '✨'
    desc = '2 Pokémon du même type !'
  } else if (hasChain && allSuper) {
    name = 'SYNERGIE TOTALE'; multiplier = 3.2; color = '#2dd4bf'; emoji = '🔗'
    desc = 'Chaîne de types, tous efficaces !'
  } else if (hasChain) {
    name = 'SYNERGIE'; multiplier = 2.0; color = '#2dd4bf'; emoji = '🔗'
    desc = 'Types synergiques enchaînés !'
  } else if (n === 3 && anySuper) {
    name = 'TRIPLE COMBO'; multiplier = 2.2; color = '#4ade80'; emoji = '👊'
    desc = '3 Pokémon, efficace !'
  } else if (n === 2 && anySuper) {
    name = 'EFFICACE'; multiplier = 1.8; color = '#4ade80'; emoji = '✅'
    desc = 'Super efficace !'
  } else if (n === 3) {
    name = 'COMBO ×3'; multiplier = 1.5; color = '#94a3b8'; emoji = '3️⃣'
    desc = '3 Pokémon joués'
  } else if (n === 2) {
    name = 'COMBO ×2'; multiplier = 1.2; color = '#6b7280'; emoji = '2️⃣'
    desc = '2 Pokémon joués'
  } else {
    name = 'ATTAQUE'; multiplier = 1.0; color = '#6b7280'; emoji = '⚔️'
    desc = 'Attaque basique'
  }

  if (hasLegendary) {
    multiplier = Math.round(multiplier * 1.4 * 10) / 10
    desc += ' + Légendaire !'
  }

  const baseDmg = played.reduce((sum, p, i) => {
    const lvl = p.level || 5
    const eff = effScores[i] || 1
    return sum + Math.floor(lvl * 2.5 * eff)
  }, 0)

  const totalDamage = Math.max(1, Math.round(baseDmg * multiplier))

  return { name, multiplier, color, emoji, desc, totalDamage, effScores, hasLegendary }
}

function checkTypeChain(played) {
  for (let i = 0; i < played.length - 1; i++) {
    const aTypes = played[i].types || ['normal']
    const bTypes = played[i + 1].types || ['normal']
    for (const ta of aTypes) {
      for (const tb of bTypes) {
        if (effectiveness(ta, [tb]) >= 2) return true
      }
    }
  }
  return false
}

export function computeEnemyAttack(enemyMon, playerTeam, playerHps) {
  if (!enemyMon) return null
  const alive = playerTeam.filter(p => (playerHps[p.uid] ?? p.hp ?? 1) > 0)
  if (!alive.length) return null

  const target = alive.reduce((weakest, p) => {
    const cur = (playerHps[p.uid] ?? p.hp) / (p.maxHp || 1)
    const w = (playerHps[weakest.uid] ?? weakest.hp) / (weakest.maxHp || 1)
    return cur < w ? p : weakest
  })

  const lvl = enemyMon.level || 5
  const eff = effectiveness((enemyMon.types || ['normal'])[0], target.types || ['normal'])
  const dmg = Math.max(1, Math.floor(lvl * 1.5 * Math.max(eff, 0.5) + Math.random() * lvl * 0.5))

  return { targetUid: target.uid, targetName: target.name, damage: dmg, eff }
}

export function getWeakTypes(defTypes) {
  const allAtk = ['fire','water','grass','electric','psychic','fighting','ghost','ice','dragon','dark','steel','rock','ground','bug','poison','flying','fairy']
  return allAtk.filter(at => effectiveness(at, defTypes) >= 2)
}
