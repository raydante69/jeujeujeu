// Pokémon data layer: loads the build-time JSON (Gen 1 species, factual stats
// from PokeAPI) and turns species into level-scaled battle instances.
import { makeMove } from './moves.js';

let DATA = null;
const BY_ID = new Map();
const BY_SLUG = new Map();
let UID = 1;

export async function loadPokemonData() {
  const res = await fetch('data/pokemon.json');
  if (!res.ok) throw new Error('Could not load data/pokemon.json');
  DATA = await res.json();
  for (const sp of DATA.pokemon) {
    BY_ID.set(sp.id, sp);
    BY_SLUG.set(sp.slug, sp);
  }
  return DATA;
}

// Keep the instance uid counter above any value restored from a saved run.
export function ensureUidAbove(n) {
  if (n >= UID) UID = n + 1;
}

export function allSpecies() {
  return DATA ? DATA.pokemon : [];
}
export function speciesById(id) {
  return BY_ID.get(id);
}
export function speciesBySlug(slug) {
  return BY_SLUG.get(slug);
}
export function bst(sp) {
  const s = sp.stats;
  return s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
}

// Simplified Pokémon stat formula (IV/EV = 0). Recognisable, level-driven.
export function statAtLevel(base, level, isHp) {
  if (isHp) return Math.floor((2 * base * level) / 100) + level + 10;
  return Math.floor((2 * base * level) / 100) + 5;
}

export function makeInstance(id, level, opts = {}) {
  const sp = speciesById(id);
  if (!sp) throw new Error(`Unknown species id ${id}`);
  const inst = {
    uid: UID++,
    id,
    name: opts.nickname || sp.name,
    species: sp.name,
    types: sp.types.slice(),
    level,
    shiny: !!opts.shiny,
    xp: 0,
    move: makeMove(sp.types[0]),
  };
  recomputeStats(inst);
  inst.hp = inst.maxHp;
  return inst;
}

// XP required to advance from `level` to the next level.
export function xpNeeded(level) {
  return 20 + level * 7;
}

// Backfill fields a Pokémon restored from an older save might lack.
export function ensureInstanceShape(inst) {
  if (!inst.move) inst.move = makeMove(inst.types ? inst.types[0] : speciesById(inst.id).types[0]);
  if (inst.xp == null) inst.xp = 0;
  if (!inst.bonus) inst.bonus = {};
  return inst;
}

// Recalculate derived stats from the species base + current level. Called on
// creation and after level-up / evolution.
export function recomputeStats(inst) {
  const sp = speciesById(inst.id);
  const s = sp.stats;
  inst.stats = {
    hp: statAtLevel(s.hp, inst.level, true),
    atk: statAtLevel(s.atk, inst.level),
    def: statAtLevel(s.def, inst.level),
    spa: statAtLevel(s.spa, inst.level),
    spd: statAtLevel(s.spd, inst.level),
    spe: statAtLevel(s.spe, inst.level),
  };
  inst.maxHp = inst.stats.hp;
  if (inst.hp > inst.maxHp) inst.hp = inst.maxHp;
  inst.types = sp.types.slice();
  return inst;
}

export function spriteFront(inst) {
  const sp = speciesById(inst.id);
  return inst.shiny ? sp.sprites.shiny : sp.sprites.front;
}
export function spriteBack(inst) {
  const sp = speciesById(inst.id);
  return inst.shiny ? sp.sprites.backShiny : sp.sprites.back;
}
export function artwork(id) {
  return speciesById(id).sprites.artwork;
}

// Pick wild species near a power tier. tier 0..1 maps onto the BST range so
// early areas favour weaker Pokémon and later areas tougher ones.
export function pickWildSpecies(rng, tier = 0.5, { excludeLegendary = true } = {}) {
  const pool = allSpecies().filter((sp) => {
    if (excludeLegendary && LEGENDARY_IDS.has(sp.id)) return false;
    return true;
  });
  const sorted = pool.slice().sort((a, b) => bst(a) - bst(b));
  const lo = sorted[0] ? bst(sorted[0]) : 200;
  const hi = sorted[sorted.length - 1] ? bst(sorted[sorted.length - 1]) : 600;
  const center = lo + (hi - lo) * tier;
  const band = (hi - lo) * 0.28;
  const inBand = pool.filter((sp) => Math.abs(bst(sp) - center) <= band);
  const choices = inBand.length ? inBand : pool;
  return rng.pick(choices);
}

// Kanto legendaries — kept out of normal wild encounters.
export const LEGENDARY_IDS = new Set([144, 145, 146, 150, 151]);
