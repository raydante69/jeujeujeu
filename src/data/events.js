import { waveKind } from '../engine/runEngine.js'

// Random wave events that spice up a run. Effects are applied at battle start
// (and read during the fight) by BattleScreen. Selection is DETERMINISTIC on the
// wave number so RunScreen (banner) and BattleScreen (effect) always agree.

export const EVENTS = [
  { id: 'healing_spring', name: 'Source Curative', icon: '💧', good: true,  desc: 'Ton équipe démarre le combat avec tous ses PV.' },
  { id: 'golden',         name: 'Ennemi Doré',     icon: '🪙', good: true,  desc: 'Vaincre cet ennemi rapporte 3× plus d\'or.' },
  { id: 'treasure',       name: 'Chasse au Trésor',icon: '🎁', good: true,  desc: 'Un objet est garanti à la victoire.' },
  { id: 'frenzy',         name: 'Frénésie',        icon: '💢', good: false, desc: 'L\'ennemi frappe +30%, mais lâche +50% d\'or.' },
  { id: 'handicap_bench', name: 'Handicap',        icon: '⛓️', good: false, desc: 'Un de tes Pokémon ne peut pas attaquer pendant 5 tours.', minTeam: 2 },
  { id: 'double',         name: 'Combat Double',   icon: '⚔️', good: false, desc: 'Deux ennemis t\'attaquent en même temps !' },
]
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]))

// Returns the event for a wave, or null. Only fires on "wild" waves so it never
// clashes with bosses, élites, trainers or encounters.
export function eventForWave(wave, teamSize = 1) {
  if (wave < 5) return null
  if (waveKind(wave) !== 'wild') return null
  if (wave % 4 !== 0) return null
  const pool = EVENTS.filter(e => !e.minTeam || teamSize >= e.minTeam)
  if (!pool.length) return null
  return pool[Math.floor(wave / 4) % pool.length]
}
