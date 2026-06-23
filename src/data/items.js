export const ITEMS = [
  // Potions
  { id: 'potion',       name: 'Potion',       emoji: '🧪', type: 'potion',   value: 50,  rarity: 'commune',     desc: '+50 PV à un Pokémon' },
  { id: 'super-potion', name: 'Super Potion', emoji: '💊', type: 'potion',   value: 120, rarity: 'peu-commune', desc: '+120 PV à un Pokémon' },
  { id: 'hyper-potion', name: 'Hyper Potion', emoji: '💉', type: 'potion',   value: 250, rarity: 'rare',        desc: '+250 PV à un Pokémon' },
  { id: 'max-potion',   name: 'Potion Max',   emoji: '✨', type: 'potion',   value: 9999,rarity: 'epique',      desc: 'Restaure tous les PV' },

  // Pokéballs
  { id: 'pokeball',    name: 'Poké Ball',   emoji: '⚪', type: 'pokeball', rarity: 'commune',     desc: 'Capture un Pokémon aléatoire Gen 1' },
  { id: 'superball',   name: 'Super Ball',  emoji: '🔵', type: 'pokeball', rarity: 'peu-commune', desc: 'Capture un Pokémon peu commun+' },
  { id: 'hyperball',   name: 'Hyper Ball',  emoji: '🟡', type: 'pokeball', rarity: 'rare',        desc: 'Capture un Pokémon rare garantie' },
  { id: 'masterball',  name: 'Master Ball', emoji: '🟣', type: 'pokeball', rarity: 'legendaire',  desc: 'Capture un Pokémon légendaire garantie' },

  // Money packs
  { id: 'money-sm',  name: '100 Pokédollars',  emoji: '💰', type: 'money', value: 100,  rarity: 'commune',     desc: '+100 ₽' },
  { id: 'money-md',  name: '300 Pokédollars',  emoji: '💰', type: 'money', value: 300,  rarity: 'peu-commune', desc: '+300 ₽' },
  { id: 'money-lg',  name: '800 Pokédollars',  emoji: '💰', type: 'money', value: 800,  rarity: 'rare',        desc: '+800 ₽' },
  { id: 'money-xl',  name: '2000 Pokédollars', emoji: '💰', type: 'money', value: 2000, rarity: 'tres-rare',   desc: '+2000 ₽' },

  // Diamonds — rare premium currency
  { id: 'diamond-1', name: 'Diamant',    emoji: '💎', type: 'diamond', value: 1, rarity: 'epique',    desc: '+1 Diamant (monnaie premium)' },
  { id: 'diamond-3', name: '3 Diamants', emoji: '💎', type: 'diamond', value: 3, rarity: 'legendaire', desc: '+3 Diamants' },

  // Rubies — very rare
  { id: 'ruby',     name: 'Rubis',     emoji: '🔴', type: 'ruby', value: 1, rarity: 'legendaire', desc: '+1 Rubis (extrêmement rare)' },
]

// Weights for milestone reward picks
const MILESTONE_WEIGHTS = {
  commune: 40, 'peu-commune': 30, rare: 18, 'tres-rare': 8, epique: 3, legendaire: 1,
}

export function pickMilestoneRewards(n = 3) {
  const byRarity = {}
  for (const item of ITEMS) {
    if (!byRarity[item.rarity]) byRarity[item.rarity] = []
    byRarity[item.rarity].push(item)
  }

  const results = []
  const usedIds = new Set()

  for (let i = 0; i < n; i++) {
    const total = Object.values(MILESTONE_WEIGHTS).reduce((s, w) => s + w, 0)
    let roll = Math.random() * total
    let chosenRarity = 'commune'
    for (const [r, w] of Object.entries(MILESTONE_WEIGHTS)) {
      roll -= w
      if (roll <= 0) { chosenRarity = r; break }
    }
    const pool = (byRarity[chosenRarity] || byRarity.commune || []).filter(it => !usedIds.has(it.id))
    if (!pool.length) { i--; continue }
    const item = pool[Math.floor(Math.random() * pool.length)]
    usedIds.add(item.id)
    results.push(item)
  }
  return results
}
