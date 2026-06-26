import { speciesById, makeInstance } from './pokemon.js'

// Canonical Gen 1 trainers with their real teams (Pokémon IDs + base levels)
export const TRAINERS = [
  // ── Tier 1 : early waves (1-30) ──────────────────────────────────────
  { id: 'brock', name: 'Rocher', class: "Champion d'Arène", icon: '🪨', tier: 1,
    team: [{ id: 74, lv: 12 }, { id: 95, lv: 14 }] },
  { id: 'misty', name: 'Ondine', class: "Champion d'Arène", icon: '💧', tier: 1,
    team: [{ id: 120, lv: 18 }, { id: 121, lv: 21 }] },
  { id: 'grunt-a', name: 'Agent Rocket', class: 'Team Rocket', icon: '🚀', tier: 1,
    team: [{ id: 52, lv: 14 }, { id: 53, lv: 18 }] },
  { id: 'grunt-b', name: 'Agent Rocket', class: 'Team Rocket', icon: '🚀', tier: 1,
    team: [{ id: 109, lv: 15 }, { id: 88, lv: 17 }] },
  { id: 'youngster', name: 'Junior', class: 'Junior', icon: '👦', tier: 1,
    team: [{ id: 19, lv: 10 }, { id: 20, lv: 10 }, { id: 23, lv: 11 }] },
  { id: 'lass', name: 'Fillette', class: 'Fillette', icon: '👧', tier: 1,
    team: [{ id: 39, lv: 12 }, { id: 35, lv: 14 }] },

  // ── Tier 2 : mid waves (31-60) ────────────────────────────────────────
  { id: 'surge', name: 'Major Bob', class: "Champion d'Arène", icon: '⚡', tier: 2,
    team: [{ id: 100, lv: 21 }, { id: 25, lv: 18 }, { id: 26, lv: 24 }] },
  { id: 'erika', name: 'Érika', class: "Champion d'Arène", icon: '🌿', tier: 2,
    team: [{ id: 69, lv: 29 }, { id: 114, lv: 24 }, { id: 45, lv: 29 }] },
  { id: 'grunt-c', name: 'Agent Rocket', class: 'Team Rocket', icon: '🚀', tier: 2,
    team: [{ id: 109, lv: 25 }, { id: 110, lv: 28 }, { id: 51, lv: 22 }] },
  { id: 'grunt-d', name: 'Recrue Rocket', class: 'Team Rocket', icon: '🚀', tier: 2,
    team: [{ id: 41, lv: 26 }, { id: 42, lv: 29 }] },
  { id: 'rival-a', name: 'Tonio', class: 'Rival', icon: '😤', tier: 2,
    team: [{ id: 65, lv: 30 }, { id: 59, lv: 28 }, { id: 112, lv: 27 }] },
  { id: 'cooltrainer-a', name: 'Dresseur Cool', class: 'Dresseur', icon: '😎', tier: 2,
    team: [{ id: 56, lv: 28 }, { id: 57, lv: 30 }, { id: 62, lv: 32 }] },

  // ── Tier 3 : late waves (61-90) ───────────────────────────────────────
  { id: 'koga', name: 'Koga', class: "Champion d'Arène", icon: '☠️', tier: 3,
    team: [{ id: 109, lv: 37 }, { id: 88, lv: 39 }, { id: 109, lv: 37 }, { id: 110, lv: 43 }] },
  { id: 'sabrina', name: 'Sabrina', class: "Champion d'Arène", icon: '🔮', tier: 3,
    team: [{ id: 64, lv: 38 }, { id: 122, lv: 37 }, { id: 49, lv: 38 }, { id: 65, lv: 43 }] },
  { id: 'blaine', name: 'Volcan', class: "Champion d'Arène", icon: '🔥', tier: 3,
    team: [{ id: 58, lv: 42 }, { id: 77, lv: 40 }, { id: 78, lv: 42 }, { id: 59, lv: 47 }] },
  { id: 'grunt-e', name: 'Commandant Rocket', class: 'Team Rocket', icon: '🚀', tier: 3,
    team: [{ id: 109, lv: 35 }, { id: 110, lv: 38 }, { id: 88, lv: 37 }, { id: 89, lv: 41 }] },
  { id: 'rival-b', name: 'Tonio', class: 'Rival', icon: '😤', tier: 3,
    team: [{ id: 65, lv: 47 }, { id: 59, lv: 45 }, { id: 112, lv: 45 }, { id: 130, lv: 45 }, { id: 3, lv: 50 }] },

  // ── Tier 4 : end game (91+) ────────────────────────────────────────────
  { id: 'giovanni', name: 'Giovanni', class: 'Patron Rocket', icon: '💎', tier: 4,
    team: [{ id: 111, lv: 45 }, { id: 51, lv: 42 }, { id: 31, lv: 44 }, { id: 32, lv: 45 }, { id: 112, lv: 50 }] },
  { id: 'lorelei', name: 'Lorelei', class: 'Élite 4', icon: '❄️', tier: 4,
    team: [{ id: 87, lv: 54 }, { id: 78, lv: 53 }, { id: 91, lv: 54 }, { id: 124, lv: 54 }, { id: 131, lv: 58 }] },
  { id: 'bruno', name: 'Bruno', class: 'Élite 4', icon: '💪', tier: 4,
    team: [{ id: 95, lv: 53 }, { id: 107, lv: 55 }, { id: 106, lv: 55 }, { id: 95, lv: 54 }, { id: 68, lv: 58 }] },
  { id: 'agatha', name: 'Agatha', class: 'Élite 4', icon: '👻', tier: 4,
    team: [{ id: 94, lv: 54 }, { id: 93, lv: 54 }, { id: 42, lv: 56 }, { id: 93, lv: 58 }, { id: 94, lv: 58 }] },
  { id: 'lance', name: 'Lance', class: 'Élite 4', icon: '🐉', tier: 4,
    team: [{ id: 148, lv: 56 }, { id: 148, lv: 56 }, { id: 130, lv: 58 }, { id: 6, lv: 58 }, { id: 149, lv: 62 }] },
  { id: 'blue', name: 'Blue', class: 'Champion', icon: '👑', tier: 4,
    team: [{ id: 18, lv: 61 }, { id: 103, lv: 59 }, { id: 65, lv: 63 }, { id: 112, lv: 61 }, { id: 149, lv: 63 }, { id: 6, lv: 65 }] },
]

// Pokémon Showdown trainer sprite slugs (real trainer headshots).
const SHOWDOWN_SLUG = {
  brock: 'brock', misty: 'misty', surge: 'lt-surge', erika: 'erika', koga: 'koga',
  sabrina: 'sabrina', blaine: 'blaine', giovanni: 'giovanni', lorelei: 'lorelei',
  bruno: 'bruno', agatha: 'agatha', lance: 'lance', blue: 'blue',
  youngster: 'youngster', lass: 'lass',
  'grunt-a': 'rocket', 'grunt-b': 'rocket', 'grunt-c': 'rocket', 'grunt-d': 'rocket', 'grunt-e': 'rocket',
  'rival-a': 'blue', 'rival-b': 'blue', 'cooltrainer-a': 'cooltrainerm',
}
export function trainerSpriteUrl(id) {
  const slug = SHOWDOWN_SLUG[id]
  return slug ? `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png` : null
}

function tierForWave(wave) {
  if (wave <= 30) return 1
  if (wave <= 60) return 2
  if (wave <= 90) return 3
  return 4
}

export function pickTrainer(wave, rng = Math.random) {
  const tier = tierForWave(wave)
  const pool = TRAINERS.filter(t => t.tier === tier)
  if (!pool.length) return TRAINERS[0]
  return pool[Math.floor(rng() * pool.length)]
}

export function buildTrainerParty(trainer, wave, asc = null) {
  const scaleFactor = 1 + wave / 120
  return trainer.team.map(({ id, lv }) => {
    const scaledLv = Math.round(lv * scaleFactor)
    const sp = speciesById(id) || speciesById(19)
    const mon = makeInstance(sp.id, scaledLv)
    const bulk = 1.0 + wave * 0.018
    mon.maxHp = Math.round(mon.maxHp * bulk * (asc?.enemyHpMult || 1))
    mon.hp = mon.maxHp
    mon.kind = 'trainer'
    mon.isBoss = false
    mon.ability = null
    return mon
  })
}

export function pickLeagueTrainers(wave, rng = Math.random) {
  const tier = tierForWave(wave)
  const pool = TRAINERS.filter(t => t.tier >= Math.max(1, tier - 1))
  const picked = []
  const seen = new Set()
  for (let i = 0; i < 5; i++) {
    let t, tries = 0
    do { t = pool[Math.floor(rng() * pool.length)]; tries++ }
    while (seen.has(t?.id) && tries < 20)
    if (t) { seen.add(t.id); picked.push(t) }
  }
  return picked
}
