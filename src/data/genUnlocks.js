export const GEN_UNLOCKS = {
  1: { name: 'Gen I — Kanto', available: true, conditions: null, price: 100 },
  2: {
    name: 'Gen II — Johto', available: false, price: 100,
    conditions: {
      badges:     { required: 2,   desc: 'Obtiens 2 badges' },
      collection: { gen: 1, pct: 0.20, desc: 'Collecte 20% Gen 1' },
      crystals:   { required: 50,  desc: 'Dépense 50 Cristaux' },
      money:      { required: 500, desc: 'Paye 500₽' },
    },
  },
  3: {
    name: 'Gen III — Hoenn', available: false, price: 120,
    conditions: {
      badges:     { required: 4,   desc: 'Obtiens 4 badges' },
      collection: { gen: 2, pct: 0.25, desc: 'Collecte 25% Gen 2' },
      crystals:   { required: 150, desc: 'Dépense 150 Cristaux' },
      money:      { required: 800, desc: 'Paye 800₽' },
    },
  },
  4: {
    name: 'Gen IV — Sinnoh', available: false, price: 150,
    conditions: {
      badges:     { required: 6,   desc: 'Obtiens 6 badges' },
      collection: { gen: 3, pct: 0.30, desc: 'Collecte 30% Gen 3' },
      crystals:   { required: 300, desc: 'Dépense 300 Cristaux' },
      money:      { required: 1500, desc: 'Paye 1 500₽' },
    },
  },
  5: {
    name: 'Gen V — Unova', available: false, price: 150,
    conditions: {
      badges:     { required: 8,   desc: 'Les 8 badges' },
      collection: { gen: 4, pct: 0.35, desc: 'Collecte 35% Gen 4' },
      crystals:   { required: 500, desc: 'Dépense 500 Cristaux' },
      money:      { required: 2000, desc: 'Paye 2 000₽' },
    },
  },
  6: {
    name: 'Gen VI — Kalos', available: false, price: 180,
    conditions: {
      elite4:     { wins: 1, desc: 'Bats un membre Élite 4' },
      collection: { gen: 5, pct: 0.40, desc: 'Collecte 40% Gen 5' },
      crystals:   { required: 750, desc: 'Dépense 750 Cristaux' },
      money:      { required: 3000, desc: 'Paye 3 000₽' },
    },
  },
  7: {
    name: 'Gen VII — Alola', available: false, price: 200,
    conditions: {
      elite4:     { wins: 4, desc: 'Bats tout Élite 4' },
      collection: { gen: 6, pct: 0.45, desc: 'Collecte 45% Gen 6' },
      crystals:   { required: 1000, desc: 'Dépense 1 000 Cristaux' },
      money:      { required: 4000, desc: 'Paye 4 000₽' },
    },
  },
  8: {
    name: 'Gen VIII — Galar', available: false, price: 200,
    conditions: {
      champion:   { required: true, desc: 'Deviens Champion' },
      collection: { gen: 7, pct: 0.50, desc: 'Collecte 50% Gen 7' },
      crystals:   { required: 1500, desc: 'Dépense 1 500 Cristaux' },
      money:      { required: 5000, desc: 'Paye 5 000₽' },
    },
  },
  9: {
    name: 'Gen IX — Paldea', available: false, price: 250,
    conditions: {
      champion:   { required: true, desc: 'Deviens Champion' },
      postGame:   { event: 'legendary_raid_cleared', desc: 'Premier Raid Légendaire' },
      collection: { gen: 8, pct: 0.50, desc: 'Collecte 50% Gen 8' },
      crystals:   { required: 2000, desc: 'Dépense 2 000 Cristaux' },
    },
  },
}

export function isGenUnlocked(genId, playerProgress) {
  const unlock = GEN_UNLOCKS[genId]
  if (!unlock || !unlock.conditions) return true
  const { badges, collection, crystals, money, elite4, champion, postGame } = unlock.conditions
  const p = playerProgress
  if (badges     && p.badgeCount        >= badges.required)               return true
  if (collection && p.collectionPct?.[collection.gen] >= collection.pct)  return true
  if (crystals   && p.crystalsSpent     >= crystals.required)              return true
  if (money      && p.moneySpentOnUnlocks >= money.required)               return true
  if (elite4     && p.elite4Defeated    >= elite4.wins)                   return true
  if (champion   && p.isChampion)                                          return true
  if (postGame   && p.completedEvents?.includes(postGame.event))           return true
  return false
}
