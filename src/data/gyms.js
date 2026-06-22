export const GYMS = [
  {
    id: 1, name: 'Arène Normale', leader: 'Chef Normal', type: 'normal',
    teamSize: 2, teamLevel: [12, 14],
    reward: { badge: 'Zéphyr', tm: 'Griffe', money: 200, card: 'uncommon' },
    unlockCondition: null,
  },
  {
    id: 2, name: 'Arène Roc', leader: 'Chef Pierre', type: 'rock',
    teamSize: 3, teamLevel: [16, 18, 20],
    reward: { badge: 'Rocher', tm: 'Force Roc', money: 300, card: 'rare' },
    unlockCondition: { badgesRequired: 1 },
  },
  {
    id: 3, name: 'Arène Eau', leader: 'Chef Ondine', type: 'water',
    teamSize: 3, teamLevel: [22, 24, 26],
    reward: { badge: 'Cascade', tm: 'Surf', money: 400, card: 'rare' },
    unlockCondition: { badgesRequired: 2 },
  },
  {
    id: 4, name: 'Arène Foudre', leader: 'Chef Surge', type: 'electric',
    teamSize: 3, teamLevel: [28, 30, 32],
    reward: { badge: 'Tonnerre', tm: 'Tonnerre', money: 500, card: 'rare' },
    unlockCondition: { badgesRequired: 3 },
  },
  {
    id: 5, name: 'Arène Plante', leader: 'Chef Érika', type: 'grass',
    teamSize: 4, teamLevel: [32, 34, 36, 38],
    reward: { badge: 'Feuillage', tm: 'Tranch\'Herbe', money: 600, card: 'holo' },
    unlockCondition: { badgesRequired: 4 },
  },
  {
    id: 6, name: 'Arène Feu', leader: 'Chef Blaise', type: 'fire',
    teamSize: 4, teamLevel: [40, 42, 44, 46],
    reward: { badge: 'Volcan', tm: 'Lance-Flammes', money: 700, card: 'holo' },
    unlockCondition: { badgesRequired: 5 },
  },
  {
    id: 7, name: 'Arène Psy', leader: 'Chef Sabrina', type: 'psychic',
    teamSize: 5, teamLevel: [46, 48, 50, 52, 54],
    reward: { badge: 'Aura', tm: 'Psyko', money: 900, card: 'holo' },
    unlockCondition: { badgesRequired: 6 },
  },
  {
    id: 8, name: 'Arène Dragon', leader: 'Chef Drake', type: 'dragon',
    teamSize: 6, teamLevel: [55, 57, 59, 61, 63, 65],
    reward: { badge: 'Légende', tm: 'Draco Météor', money: 1200, card: 'ultra' },
    unlockCondition: { badgesRequired: 7 },
  },
]

export function getGym(id) {
  return GYMS.find(g => g.id === id) || GYMS[0]
}

export function isGymUnlocked(gymId, badgeCount) {
  const gym = getGym(gymId)
  if (!gym.unlockCondition) return true
  return badgeCount >= gym.unlockCondition.badgesRequired
}
