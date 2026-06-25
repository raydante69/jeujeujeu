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

// Deterministic, well-distributed hash so every event (incl. 'double') is
// reachable regardless of the wave's parity.
function hashWave(w) {
  let x = (Math.imul(w, 2654435761)) >>> 0
  x ^= x >>> 15
  x = (Math.imul(x, 2246822519)) >>> 0
  x ^= x >>> 13
  return x >>> 0
}

// Returns the event for a wave, or null. Only fires on "wild" waves so it never
// clashes with bosses, élites, trainers or encounters. About one wild wave in
// two (the even ones) carries an event.
export function eventForWave(wave, teamSize = 1) {
  if (wave < 5) return null
  if (waveKind(wave) !== 'wild') return null
  if (wave % 2 !== 0) return null
  const pool = EVENTS.filter(e => !e.minTeam || teamSize >= e.minTeam)
  if (!pool.length) return null
  return pool[hashWave(wave) % pool.length]
}
