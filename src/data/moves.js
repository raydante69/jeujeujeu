const MOVE_NAMES = {
  normal: 'Power Hit', fire: 'Flame Strike', water: 'Aqua Blast', electric: 'Volt Shock',
  grass: 'Leaf Cutter', ice: 'Frost Bite', fighting: 'Power Punch', poison: 'Venom Jab',
  ground: 'Quake Strike', flying: 'Gale Wing', psychic: 'Mind Blast', bug: 'Swarm Strike',
  rock: 'Boulder Toss', ghost: 'Shadow Strike', dragon: 'Drake Roar', dark: 'Dark Fang',
  steel: 'Steel Slam', fairy: 'Fae Spark',
}

export const MOVE_MAX_LEVEL = 10
const BASE_POWER = 55
const POWER_PER_LEVEL = 12

export function makeMove(type) {
  return { type, name: MOVE_NAMES[type] || 'Strike', level: 1 }
}

export function movePower(move) {
  if (!move) return BASE_POWER
  return BASE_POWER + (move.level - 1) * POWER_PER_LEVEL
}

export function moveName(type) {
  return MOVE_NAMES[type] || 'Strike'
}
