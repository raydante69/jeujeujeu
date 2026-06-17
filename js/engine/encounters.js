// Builds the Pokémon that fill encounters: wild singles, generic trainers, and
// type-themed gym / Elite Four / Champion rosters. All rosters are generated
// from the dex so the region config stays small.
import {
  allSpecies, makeInstance, pickWildSpecies, LEGENDARY_IDS, speciesById, bst,
} from '../data/pokemon.js';

const SHINY_CHANCE = 1 / 96;

function speciesOfType(type) {
  return allSpecies().filter((sp) => sp.types.includes(type) && !LEGENDARY_IDS.has(sp.id));
}

function rollShiny(rng) {
  return rng.chance(SHINY_CHANCE);
}

// One wild Pokémon scaled to the current leg.
export function wildEncounter(rng, tier, level) {
  const sp = pickWildSpecies(rng, tier);
  return makeInstance(sp.id, level, { shiny: rollShiny(rng) });
}

// `count` catch candidates near a tier — the catch screen offers a choice.
export function catchOptions(rng, tier, level, count = 3) {
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < count && guard++ < 50) {
    const sp = pickWildSpecies(rng, tier);
    if (seen.has(sp.id)) continue;
    seen.add(sp.id);
    out.push(makeInstance(sp.id, level, { shiny: rollShiny(rng) }));
  }
  return out;
}

function distinctOfType(rng, type, count, excludeAce) {
  const pool = speciesOfType(type).filter((sp) => sp.id !== excludeAce);
  const chosen = rng.sample(pool, Math.min(count, pool.length));
  return chosen.map((sp) => sp.id);
}

// Gym leader: a small type-themed team topped by a higher-level ace.
export function buildGymTeam(rng, gym, level) {
  const size = Math.min(2 + Math.floor(level / 18), 4);
  const fillerIds = distinctOfType(rng, gym.type, size - 1, gym.ace);
  const team = fillerIds.map((id) => makeInstance(id, Math.max(2, level - rng.int(1, 3)), { shiny: rollShiny(rng) }));
  team.push(makeInstance(gym.ace, level + 2, { shiny: rollShiny(rng) })); // ace last & strongest
  return team;
}

// Generic route trainer: a random spread near the leg power.
export function buildTrainerTeam(rng, level, tier) {
  const size = rng.int(1, 3);
  const team = [];
  for (let i = 0; i < size; i++) {
    const sp = pickWildSpecies(rng, tier);
    team.push(makeInstance(sp.id, Math.max(2, level - rng.int(0, 2)), { shiny: rollShiny(rng) }));
  }
  return team;
}

export function buildEliteTeam(rng, elite, level) {
  const fillerIds = distinctOfType(rng, elite.type, 4, elite.ace);
  const team = fillerIds.map((id) => makeInstance(id, level - rng.int(0, 2), { shiny: rollShiny(rng) }));
  team.push(makeInstance(elite.ace, level + 3, { shiny: rollShiny(rng) }));
  return team;
}

// Champion: a strong mixed team built from the highest-BST non-legendary dex.
export function buildChampionTeam(rng, level) {
  const pool = allSpecies()
    .filter((sp) => !LEGENDARY_IDS.has(sp.id))
    .sort((a, b) => bst(b) - bst(a))
    .slice(0, 24);
  const ids = rng.sample(pool, 5).map((sp) => sp.id);
  ids.push(6); // signature ace (Charizard)
  return ids.map((id, i) => makeInstance(id, level + (i === ids.length - 1 ? 3 : 0), { shiny: rollShiny(rng) }));
}
