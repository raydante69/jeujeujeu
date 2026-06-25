// Random modifiers rolled on non-boss enemies.
// isNerf: true  → weakens enemy  → displayed as BLUE badge (good for player)
// isNerf: false → buffs enemy    → displayed as RED badge  (bad for player)

export const MODIFIER_DEF = {
  hp_boost:     { id: 'hp_boost',     icon: '❤️',  name: 'Vigueur',     isNerf: false, desc: '+30% PV maximum' },
  shield_start: { id: 'shield_start', icon: '🛡️',  name: 'Blindé',      isNerf: false, desc: 'Démarre avec un bouclier actif' },
  attack_up:    { id: 'attack_up',    icon: '⚔️',  name: 'Furie',       isNerf: false, desc: 'Dégâts d\'attaque +25%' },
  type_resist:  { id: 'type_resist',  icon: '🔒',  name: 'Résistance',  isNerf: false, desc: '×0.5 dégâts {TYPE} reçus', needsType: true },
  type_weak:    { id: 'type_weak',    icon: '💥',  name: 'Fragilité',   isNerf: true,  desc: '×2 dégâts {TYPE} reçus',   needsType: true },
  xp_gift:      { id: 'xp_gift',     icon: '⭐',  name: 'Expérience+', isNerf: true,  desc: '+50% XP accordé à la victoire' },
  gold_gift:    { id: 'gold_gift',    icon: '💰',  name: 'Pépite',      isNerf: true,  desc: '+50% or accordé à la victoire' },
}

const BUFF_POOL = ['hp_boost', 'shield_start', 'attack_up', 'type_resist']
const NERF_POOL = ['type_weak', 'xp_gift', 'gold_gift']

const TYPE_POOL = [
  'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'normal',
]

export function rollModifiers(count, rng) {
  const results = []
  const used = new Set()
  for (let i = 0; i < count; i++) {
    const pool = rng() < 0.55 ? BUFF_POOL : NERF_POOL
    const available = pool.filter(id => !used.has(id))
    if (!available.length) continue
    const id = available[Math.floor(rng() * available.length)]
    used.add(id)
    const def = MODIFIER_DEF[id]
    const mod = { id, isNerf: def.isNerf }
    if (def.needsType) mod.param = TYPE_POOL[Math.floor(rng() * TYPE_POOL.length)]
    results.push(mod)
  }
  return results
}
