#!/usr/bin/env node
/**
 * fetch-pokemon.mjs — one-shot build script.
 *
 * Pulls Generation 1 (ids 1..151) factual battle data (name, types, base stats)
 * from the open PokeAPI and writes data/pokemon.json. Sprite URLs are derived
 * deterministically from the public PokeAPI sprite CDN and are referenced by
 * URL at runtime (nothing copyrighted is downloaded into the repo).
 *
 * Usage: node tools/fetch-pokemon.mjs
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'pokemon.json');

const API = 'https://pokeapi.co/api/v2';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const GEN1_COUNT = 151;

const STAT_KEY = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
};

function titleCase(name) {
  // PokeAPI uses lowercase slugs ("nidoran-f"); make a display-friendly label.
  return name
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function spriteUrls(id) {
  return {
    front: `${SPRITES}/${id}.png`,
    back: `${SPRITES}/back/${id}.png`,
    shiny: `${SPRITES}/shiny/${id}.png`,
    backShiny: `${SPRITES}/back/shiny/${id}.png`,
    artwork: `${SPRITES}/other/official-artwork/${id}.png`,
  };
}

async function fetchJson(url, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === tries) throw err;
      const wait = 500 * 2 ** (attempt - 1);
      process.stderr.write(`  retry ${attempt} for ${url} (${err.message})\n`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

async function fetchOne(id) {
  const d = await fetchJson(`${API}/pokemon/${id}`);
  const stats = {};
  for (const s of d.stats) {
    const key = STAT_KEY[s.stat.name];
    if (key) stats[key] = s.base_stat;
  }
  return {
    id,
    name: titleCase(d.name),
    slug: d.name,
    types: d.types
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name),
    stats,
    sprites: spriteUrls(id),
  };
}

async function main() {
  process.stdout.write(`Fetching Gen 1 (1..${GEN1_COUNT}) from PokeAPI...\n`);
  const out = [];
  // Small batches keep us friendly to the API while staying reasonably fast.
  const BATCH = 8;
  for (let start = 1; start <= GEN1_COUNT; start += BATCH) {
    const ids = [];
    for (let id = start; id < start + BATCH && id <= GEN1_COUNT; id++) ids.push(id);
    const batch = await Promise.all(ids.map(fetchOne));
    out.push(...batch);
    process.stdout.write(`  ${out.length}/${GEN1_COUNT}\r`);
  }
  out.sort((a, b) => a.id - b.id);

  const payload = {
    generation: 1,
    source: 'PokeAPI (https://pokeapi.co) — data under fair use; sprites via PokeAPI/sprites CDN',
    count: out.length,
    pokemon: out,
  };
  await writeFile(OUT, JSON.stringify(payload, null, 0) + '\n', 'utf8');
  process.stdout.write(`\nWrote ${out.length} Pokémon to ${OUT}\n`);
}

main().catch((err) => {
  process.stderr.write(`\nFailed: ${err.stack || err}\n`);
  process.exit(1);
});
