// ──────────────────────────────────────────────────────────────────────────
//  SIGNATURE TRAITS  — per-Pokémon passive bonuses
//  Higher rarity → more powerful trait.
//  Shiny/holo add an extra flat bonus on top of the species trait.
// ──────────────────────────────────────────────────────────────────────────

const TRAITS = [
  // IDs 1–8 (Bulbasaur line + early grass/bug)
  {
    name: 'Synergie Plante',
    desc: 'Si un Pokémon Plante est dans l\'équipe : ATK +25%.',
    damageMult: 0.15, guardMult: 0, healMult: 0, statusTurns: 0, buffPlus: 0,
  },
  // IDs 9–16 (Squirtle line + water)
  {
    name: 'Vampirisme',
    desc: 'Drain récupère +35% PV supplémentaires.',
    damageMult: 0.05, guardMult: 0, healMult: 0.35, statusTurns: 0, buffPlus: 0,
  },
  // IDs 17–24 (Caterpie → Beedrill)
  {
    name: 'Venin Amplifié',
    desc: 'Les statuts durent +2 tours de plus.',
    damageMult: 0.05, guardMult: 0, healMult: 0, statusTurns: 2, buffPlus: 0,
  },
  // IDs 25–32 (Pikachu/Raichu + electric)
  {
    name: 'Surtension',
    desc: 'ATK +20% et bouclier +15%.',
    damageMult: 0.20, guardMult: 0.15, healMult: 0, statusTurns: 0, buffPlus: 0,
  },
  // IDs 33–40 (Sandshrew/Vulpix + ground/fire)
  {
    name: 'Chaleur Intense',
    desc: 'ATK Feu/Sol +30%.',
    damageMult: 0.30, guardMult: 0, healMult: 0, statusTurns: 0, buffPlus: 0,
  },
  // IDs 41–48 (Oddish → Gloom + grass/poison)
  {
    name: 'Sève Régénérante',
    desc: 'Soins +40%.',
    damageMult: 0, guardMult: 0, healMult: 0.40, statusTurns: 0, buffPlus: 0,
  },
  // IDs 49–56 (Paras + Venonat)
  {
    name: 'Essaim',
    desc: 'Statuts durent +1 tour. ATK +10%.',
    damageMult: 0.10, guardMult: 0, healMult: 0, statusTurns: 1, buffPlus: 0,
  },
  // IDs 57–64 (Meowth + Psyduck + Mankey)
  {
    name: 'Agilité',
    desc: 'Boost +60% plus efficace.',
    damageMult: 0.10, guardMult: 0, healMult: 0.10, statusTurns: 0, buffPlus: 0.60,
  },
  // IDs 65–72 (Abra line + Machop line)
  {
    name: 'Force Brute',
    desc: 'Attaques lourdes +35%.',
    damageMult: 0.35, guardMult: 0, healMult: 0, statusTurns: 0, buffPlus: 0,
  },
  // IDs 73–80 (Tentacool + Geodude + Ponyta)
  {
    name: 'Armure Cristal',
    desc: 'Bouclier +45%.',
    damageMult: 0, guardMult: 0.45, healMult: 0, statusTurns: 0, buffPlus: 0,
  },
  // IDs 81–88 (Slowpoke + Magnemite)
  {
    name: 'Psy Focus',
    desc: 'ATK +20% et soins +20%.',
    damageMult: 0.20, guardMult: 0, healMult: 0.20, statusTurns: 0, buffPlus: 0,
  },
  // IDs 89–96 (Doduo + Seel + Grimer)
  {
    name: 'Toxik Expert',
    desc: 'Statuts infligés durent +2 tours. ATK +10%.',
    damageMult: 0.10, guardMult: 0, healMult: 0, statusTurns: 2, buffPlus: 0,
  },
  // IDs 97–104 (Shellder + Gastly + Onix)
  {
    name: 'Aura Spectrale',
    desc: 'ATK +25%, soins +15%.',
    damageMult: 0.25, guardMult: 0, healMult: 0.15, statusTurns: 0, buffPlus: 0,
  },
  // IDs 105–112 (Drowzee + Krabby + Voltorb)
  {
    name: 'Surcharge',
    desc: 'ATK +20%. Boost +40% plus efficace.',
    damageMult: 0.20, guardMult: 0, healMult: 0, statusTurns: 0, buffPlus: 0.40,
  },
  // IDs 113–120 (Chansey + Tangela + Kangaskhan)
  {
    name: 'Régénération',
    desc: 'Soins +60%. Bouclier +20%.',
    damageMult: 0, guardMult: 0.20, healMult: 0.60, statusTurns: 0, buffPlus: 0,
  },
  // IDs 121–128 (Horsea + Goldeen + Staryu)
  {
    name: 'Vague de Fond',
    desc: 'ATK +25%. Statuts +1 tour.',
    damageMult: 0.25, guardMult: 0, healMult: 0, statusTurns: 1, buffPlus: 0,
  },
  // IDs 129–136 (Magikarp → Gyarados + Lapras + Ditto + Eevee line start)
  {
    name: 'Ascension',
    desc: 'ATK +40%. Soins +20%.',
    damageMult: 0.40, guardMult: 0, healMult: 0.20, statusTurns: 0, buffPlus: 0,
  },
  // IDs 137–143 (Porygon + Omanyte + Kabuto + Aerodactyl)
  {
    name: 'Archéo-Puissance',
    desc: 'ATK +30%. Bouclier +30%.',
    damageMult: 0.30, guardMult: 0.30, healMult: 0, statusTurns: 0, buffPlus: 0,
  },
  // IDs 144–146 (Articuno / Zapdos / Moltres)
  {
    name: 'Aile de Légende',
    desc: 'ATK +50%. Soins +30%. Bouclier +20%.',
    damageMult: 0.50, guardMult: 0.20, healMult: 0.30, statusTurns: 1, buffPlus: 0,
  },
  // IDs 147–149 (Dratini / Dragonair / Dragonite)
  {
    name: 'Rage du Dragon',
    desc: 'ATK +55%. Statuts +2 tours.',
    damageMult: 0.55, guardMult: 0, healMult: 0, statusTurns: 2, buffPlus: 0.30,
  },
  // IDs 150–151 (Mewtwo / Mew)
  {
    name: 'Domination Absolue',
    desc: 'ATK +70%. Soins +50%. Bouclier +40%.',
    damageMult: 0.70, guardMult: 0.40, healMult: 0.50, statusTurns: 2, buffPlus: 0.50,
  },
]

function traitIndex(id) {
  if (id >= 150) return 20
  if (id >= 147) return 19
  if (id >= 144) return 18
  if (id >= 137) return 17
  if (id >= 129) return 16
  if (id >= 121) return 15
  if (id >= 113) return 14
  if (id >= 105) return 13
  if (id >= 97)  return 12
  if (id >= 89)  return 11
  if (id >= 81)  return 10
  if (id >= 73)  return 9
  if (id >= 65)  return 8
  if (id >= 57)  return 7
  if (id >= 49)  return 6
  if (id >= 41)  return 5
  if (id >= 33)  return 4
  if (id >= 25)  return 3
  if (id >= 17)  return 2
  if (id >= 9)   return 1
  return 0
}

// Returns the trait object for a given Pokémon. Pass the full mon instance
// to include shiny / holo bonuses.
export function getTrait(pokemonId, types = [], mon = null) {
  const base = { ...TRAITS[traitIndex(pokemonId)] }

  // Shiny variant: +15% ATK
  if (mon?.shiny) base.damageMult = (base.damageMult || 0) + 0.15

  // Holo variant: +20% ATK, +20% heal
  if (mon?.holo) {
    base.damageMult = (base.damageMult || 0) + 0.20
    base.healMult   = (base.healMult   || 0) + 0.20
  }

  return base
}

// Returns the flat damage multiplier for a move of the given type.
export function traitDamageMult(trait, _moveType) {
  return 1 + (trait?.damageMult || 0)
}

// Helper: get trait label for display on a Pokémon card.
export function getTraitDesc(pokemonId) {
  const t = TRAITS[traitIndex(pokemonId)]
  return t ? { name: t.name, desc: t.desc } : null
}
