// Central registry for the procedurally-generated pixel-art assets (img/) and
// the open PokeAPI item sprites (img/items/). Every UI reference goes through
// here so paths stay in one place.
const A = 'img/';

export const ASSETS = {
  background: A + 'background.png',
  logo: A + 'logo.png',
  lock: A + 'sprites/lock.png',
  pokecenter: A + 'sprites/pokecenter.png',
  pokemart: A + 'sprites/pokemart.png',
  gym: A + 'sprites/gym.png',
  grass: A + 'sprites/grass-encounter.png',
  ball: A + 'items/poke-ball.png',
  modeImages: {
    story: A + 'modeImages/story-mode.png',
    tower: A + 'modeImages/battle-tower.png',
    challenge: A + 'modeImages/challenges.png',
  },
  regions: { kanto: A + 'regions/kanto.png', johto: A + 'regions/johto.png' },
  zones: ['town', 'route', 'forest', 'cave', 'mountain', 'city'].map((z) => A + 'zones/' + z + '.png'),
  terrains: ['grass', 'route', 'forest', 'beach', 'cave', 'mountain'].map((z) => A + 'terrain/' + z + '.png'),
  battle: { grass: A + 'battle/grass.png', cave: A + 'battle/cave.png', water: A + 'battle/water.png', city: A + 'battle/city.png' },
  trainers: {
    boy: A + 'trainers/boy.png',
    girl: A + 'trainers/girl.png',
    champion: A + 'trainers/champion.png',
    leaders: [1, 2, 3, 4, 5, 6].map((i) => A + 'trainers/leader-' + i + '.png'),
  },
  menu: {
    pokedex: A + 'menu/pokedex.png', achievements: A + 'menu/achievements.png',
    map: A + 'menu/map.png', settings: A + 'menu/settings.png',
    pokemart: A + 'menu/pokemart.png', reset: A + 'menu/reset.png', exit: A + 'menu/exit.png',
  },
};

export function itemSprite(slug) { return A + 'items/' + slug + '.png'; }

// Player trainer asset by chosen gender; falls back to the boy sprite.
export function playerTrainer(kind) {
  return ASSETS.trainers[kind] || ASSETS.trainers.boy;
}
// Deterministic leader sprite for a gym/elite index.
export function leaderTrainer(i) {
  return ASSETS.trainers.leaders[((i % ASSETS.trainers.leaders.length) + ASSETS.trainers.leaders.length) % ASSETS.trainers.leaders.length];
}
// Clean terrain backdrop for a leg's node map.
export function zoneFor(legIndex) {
  const t = ASSETS.terrains;
  return t[((legIndex % t.length) + t.length) % t.length];
}
// Battle backdrop themed by a gym/encounter type.
export function battleBgFor(type) {
  if (['water', 'ice'].includes(type)) return ASSETS.battle.water;
  if (['rock', 'ground', 'poison', 'dark', 'ghost', 'bug'].includes(type)) return ASSETS.battle.cave;
  if (['steel', 'electric', 'psychic', 'fairy'].includes(type)) return ASSETS.battle.city;
  return ASSETS.battle.grass;
}
