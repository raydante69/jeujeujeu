// Held items — equippable passives (Pokélike-style) that reshape a run.
// Each declares a `kind` + `value`; aggregateRelics() folds a set of owned
// item ids into a single effects object the battle reads. `slug` points to
// the authentic PokeAPI item sprite.

export const RELICS = [
  { id: 'ember-core',     name: 'Charbon',          emoji: '🔥', slug: 'charcoal',     rarity: 'common', kind: 'type_boost', type: 'fire',     value: 0.6, desc: '+60% de puissance aux bursts contenant un type Feu.' },
  { id: 'tidal-gem',      name: 'Eau Mystérieuse',  emoji: '🌊', slug: 'mystic-water', rarity: 'common', kind: 'type_boost', type: 'water',    value: 0.6, desc: '+60% de puissance aux bursts contenant un type Eau.' },
  { id: 'leaf-charm',     name: 'Herbe Mystique',   emoji: '🌿', slug: 'miracle-seed', rarity: 'common', kind: 'type_boost', type: 'grass',    value: 0.6, desc: '+60% de puissance aux bursts contenant un type Plante.' },
  { id: 'static-coil',    name: 'Aimant',           emoji: '⚡', slug: 'magnet',       rarity: 'common', kind: 'type_boost', type: 'electric', value: 0.6, desc: '+60% de puissance aux bursts contenant un type Électrik.' },
  { id: 'mind-orb',       name: 'Cuillère Tordue',  emoji: '🔮', slug: 'twisted-spoon',rarity: 'common', kind: 'type_boost', type: 'psychic',  value: 0.6, desc: '+60% de puissance aux bursts contenant un type Psy.' },

  { id: 'power-band',     name: 'Bandeau Muscle',   emoji: '💪', slug: 'muscle-band',  rarity: 'common', kind: 'dmg_flat',   value: 18,  desc: '+18 dégâts bruts à chaque burst.' },
  { id: 'combo-lens',     name: 'Loupe',            emoji: '🔍', slug: 'wide-lens',    rarity: 'rare',   kind: 'mult_add',   value: 0.5, desc: '+0.5 au multiplicateur de chaque burst.' },
  { id: 'lucky-egg',      name: 'Œuf Chance',       emoji: '🥚', slug: 'lucky-egg',    rarity: 'rare',   kind: 'xp_mult',    value: 0.6, desc: 'Gain d\'XP ×1.6 — montez en niveau plus vite.' },
  { id: 'leftovers',      name: 'Restes',           emoji: '🍎', slug: 'leftovers',    rarity: 'common', kind: 'heal_wave',  value: 14,  desc: 'Soigne toute l\'équipe de 14% au début de chaque vague.' },
  { id: 'vampire-fang',   name: 'Grelot Coque',     emoji: '🦇', slug: 'shell-bell',   rarity: 'rare',   kind: 'lifesteal',  value: 30,  desc: 'Soigne le Pokémon le plus blessé de 30% des dégâts infligés.' },
  { id: 'scope-lens',     name: 'Lentille Spéciale',emoji: '🎯', slug: 'scope-lens',   rarity: 'rare',   kind: 'crit',       value: 0.22, desc: '22% de chance qu\'un burst soit CRITIQUE (×2).' },
  { id: 'lone-wolf',      name: 'Ceinture Pro',     emoji: '🐺', slug: 'expert-belt',  rarity: 'rare',   kind: 'solo_mult',  value: 1.2, desc: 'Jouer 1 seul Pokémon : +1.2 au multiplicateur.' },
  { id: 'team-spirit',    name: 'Mur Lumière',      emoji: '🤝', slug: 'light-clay',   rarity: 'rare',   kind: 'full_team',  value: 1.0, desc: 'Jouer 3 Pokémon : +1.0 au multiplicateur.' },
  { id: 'golden-token',   name: 'Pièce Rune',       emoji: '🪙', slug: 'amulet-coin',  rarity: 'common', kind: 'gold_win',   value: 18,  desc: '+18 or à chaque victoire.' },
  { id: 'phoenix-feather',name: 'Cendres Sacrées',  emoji: '🪶', slug: 'sacred-ash',   rarity: 'epic',   kind: 'revive',     value: 50,  desc: 'Une fois par combat, ranime un allié K.O. à 50% PV.' },
  { id: 'master-charm',   name: 'Grelot Zen',       emoji: '🎱', slug: 'soothe-bell',  rarity: 'epic',   kind: 'catch',      value: 0.35, desc: '+35% de chance de capture.' },
  { id: 'dragon-soul',    name: 'Croc Dragon',      emoji: '🐉', slug: 'dragon-fang',  rarity: 'epic',   kind: 'legendary',  value: 1.5, desc: '+1.5 au multiplicateur si un Légendaire participe au burst.' },
  { id: 'glass-cannon',   name: 'Orbe Vie',         emoji: '💎', slug: 'life-orb',     rarity: 'epic',   kind: 'glass',      value: 0.8, desc: '+0.8 multiplicateur, mais l\'équipe a 15% PV max en moins.' },
]

export const RELIC_BY_ID = Object.fromEntries(RELICS.map(r => [r.id, r]))

export const RELIC_RARITY_COLOR = { common: '#9ca3af', rare: '#60a5fa', epic: '#c084fc' }

export function getRelic(id) { return RELIC_BY_ID[id] }

// Pick `count` distinct relics not already owned, weighted by rarity.
export function rollRelics(count, ownedIds = [], rng = Math.random) {
  const owned = new Set(ownedIds)
  const pool = RELICS.filter(r => !owned.has(r.id))
  const weight = { common: 5, rare: 3, epic: 1 }
  const picks = []
  const work = [...pool]
  for (let i = 0; i < count && work.length; i++) {
    const total = work.reduce((s, r) => s + (weight[r.rarity] || 1), 0)
    let roll = rng() * total
    let idx = 0
    for (let j = 0; j < work.length; j++) {
      roll -= weight[work[j].rarity] || 1
      if (roll <= 0) { idx = j; break }
    }
    picks.push(work[idx])
    work.splice(idx, 1)
  }
  return picks
}

// Fold owned relic ids into one effects object.
export function aggregateRelics(ids = []) {
  const agg = {
    multAdd: 0, dmgFlat: 0, typeBoost: {}, healWavePct: 0, goldWin: 0,
    xpMult: 1, lifestealPct: 0, critChance: 0, soloMult: 0, fullTeamAdd: 0,
    legendaryBoost: 0, revive: 0, catchBonus: 0, hpPenaltyPct: 0,
  }
  for (const id of ids) {
    const r = RELIC_BY_ID[id]
    if (!r) continue
    switch (r.kind) {
      case 'type_boost': agg.typeBoost[r.type] = (agg.typeBoost[r.type] || 0) + r.value; break
      case 'dmg_flat':   agg.dmgFlat += r.value; break
      case 'mult_add':   agg.multAdd += r.value; break
      case 'xp_mult':    agg.xpMult += r.value; break
      case 'heal_wave':  agg.healWavePct += r.value; break
      case 'lifesteal':  agg.lifestealPct += r.value; break
      case 'crit':       agg.critChance += r.value; break
      case 'solo_mult':  agg.soloMult += r.value; break
      case 'full_team':  agg.fullTeamAdd += r.value; break
      case 'gold_win':   agg.goldWin += r.value; break
      case 'revive':     agg.revive = Math.max(agg.revive, r.value); break
      case 'catch':      agg.catchBonus += r.value; break
      case 'legendary':  agg.legendaryBoost += r.value; break
      case 'glass':      agg.multAdd += r.value; agg.hpPenaltyPct += 15; break
    }
  }
  return agg
}
