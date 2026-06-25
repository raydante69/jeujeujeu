// Achievements / Trophées — paliers permanents évalués contre les compteurs déjà
// suivis par le jeu (gameStore.stats, collection, runStore meta). Chaque trophée
// déclare soit `stat` (clé de gameStore.stats) soit `custom` (valeur dérivée
// calculée par le contexte fourni à achievementProgress). Réclamer crédite la
// récompense une seule fois (gameStore.achievementsClaimed).

export const ACHIEVEMENTS = [
  // — Combat —
  { id: 'first-blood',  name: 'Premier Sang',     icon: '⚔️', desc: 'Gagne 1 combat',            stat: 'battlesWon', target: 1,   reward: { crystals: 10 } },
  { id: 'warmonger-50', name: 'Va-t-en-guerre',   icon: '🗡️', desc: 'Gagne 50 combats',          stat: 'battlesWon', target: 50,  reward: { crystals: 40 } },
  { id: 'warlord-200',  name: 'Seigneur de Guerre', icon: '🏴', desc: 'Gagne 200 combats',       stat: 'battlesWon', target: 200, reward: { crystals: 120 } },

  // — Vagues / Rift —
  { id: 'wave-10',  name: 'Briseur de Boss',    icon: '🌊', desc: 'Atteins la vague 10',  custom: 'bestWave', target: 10, reward: { crystals: 20 } },
  { id: 'wave-25',  name: 'Vétéran du Rift',    icon: '🌀', desc: 'Atteins la vague 25',  custom: 'bestWave', target: 25, reward: { crystals: 50 } },
  { id: 'wave-50',  name: 'Maître du Rift',     icon: '🕳️', desc: 'Atteins la vague 50',  custom: 'bestWave', target: 50, reward: { crystals: 150 } },

  // — Sans accroc —
  { id: 'flawless-10', name: 'Sans Accroc',     icon: '🛡️', desc: 'Bats le boss de la vague 10 sans perdre un seul Pokémon', custom: 'bestFlawlessWave', target: 10, reward: { crystals: 40 } },
  { id: 'flawless-20', name: 'Intouchable',     icon: '✨', desc: 'Atteins la vague 20 sans perdre un seul Pokémon',          custom: 'bestFlawlessWave', target: 20, reward: { crystals: 90 } },

  // — Collection —
  { id: 'collector-25',  name: 'Collectionneur',   icon: '📗', desc: 'Possède 25 espèces',  custom: 'pokedexCount', target: 25,  reward: { money: 300 } },
  { id: 'collector-75',  name: 'Conservateur',     icon: '📘', desc: 'Possède 75 espèces',  custom: 'pokedexCount', target: 75,  reward: { money: 600 } },
  { id: 'collector-151', name: 'Pokédex Complet',  icon: '📕', desc: 'Possède les 151 espèces', custom: 'pokedexCount', target: 151, reward: { crystals: 300, money: 1500 } },
  { id: 'shiny-1',       name: 'Reflet Brillant',  icon: '🌟', desc: 'Possède 1 Pokémon chromatique', custom: 'shinyCount', target: 1,  reward: { crystals: 25 } },
  { id: 'shiny-10',      name: 'Chasseur de Chromatiques', icon: '💫', desc: 'Possède 10 Pokémon chromatiques', custom: 'shinyCount', target: 10, reward: { crystals: 100 } },

  // — Captures —
  { id: 'catch-25',  name: 'Dresseur Aguerri', icon: '🎯', desc: 'Capture 25 Pokémon',  stat: 'catches', target: 25,  reward: { crystals: 30 } },
  { id: 'catch-100', name: 'Maître Dresseur',  icon: '🥅', desc: 'Capture 100 Pokémon', stat: 'catches', target: 100, reward: { crystals: 100 } },

  // — Boosters —
  { id: 'opener-25',  name: 'Ouvreur Compulsif', icon: '📦', desc: 'Ouvre 25 boosters', stat: 'boostersOpened', target: 25, reward: { money: 250 } },

  // — Arènes / Histoire —
  { id: 'badge-1',   name: 'Premier Badge',  icon: '🥇', desc: 'Remporte 1 badge d\'arène', custom: 'badges',   target: 1, reward: { crystals: 20 } },
  { id: 'badge-8',   name: 'Huit Badges',    icon: '🎖️', desc: 'Remporte les 8 badges',     custom: 'badges',   target: 8, reward: { crystals: 150 } },
  { id: 'champion',  name: 'Champion',       icon: '👑', desc: 'Deviens Champion de la Ligue', custom: 'champion', target: 1, reward: { crystals: 250, money: 1000 } },

  // — Assiduité —
  { id: 'streak-7',  name: 'Habitué',  icon: '🔥', desc: 'Atteins une série de 7 jours',  custom: 'dailyStreak', target: 7,  reward: { crystals: 50 } },
  { id: 'streak-30', name: 'Inarrêtable', icon: '🏆', desc: 'Atteins une série de 30 jours', custom: 'dailyStreak', target: 30, reward: { crystals: 250 } },
]

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))

// Compute the current progress of an achievement given a context object
// assembled from both stores by the caller (avoids a store import cycle).
// ctx = { stats, pokedexCount, shinyCount, bestWave, bestFlawlessWave,
//         badges, champion, dailyStreak }
export function achievementProgress(ach, ctx) {
  if (ach.stat) return ctx.stats?.[ach.stat] || 0
  switch (ach.custom) {
    case 'pokedexCount':     return ctx.pokedexCount || 0
    case 'shinyCount':       return ctx.shinyCount || 0
    case 'bestWave':         return ctx.bestWave || 0
    case 'bestFlawlessWave': return ctx.bestFlawlessWave || 0
    case 'badges':           return ctx.badges || 0
    case 'champion':         return ctx.champion ? 1 : 0
    case 'dailyStreak':      return ctx.dailyStreak || 0
    default:                 return 0
  }
}
