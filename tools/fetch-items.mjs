#!/usr/bin/env node
/**
 * fetch-items.mjs — downloads the item / poké-ball sprites used by the game from
 * the open PokeAPI sprite repository into img/items/. These are referenced
 * locally so the bag, catch screen and item pickups render real game-style
 * icons without a runtime CDN dependency.
 *
 * Usage: node tools/fetch-items.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'img', 'items');
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

// PokeAPI item slugs used by data/items.js (+ balls for catch flavour).
const SLUGS = [
  // balls
  'poke-ball', 'great-ball', 'ultra-ball',
  // active items
  'potion', 'super-potion', 'full-restore', 'rare-candy',
  'protein', 'iron', 'calcium', 'carbos', 'hp-up', 'revive',
  // passive items
  'amulet-coin', 'focus-band', 'quick-claw', 'leftovers',
  'lucky-egg', 'exp-share', 'shell-bell', 'choice-band',
];

async function fetchBin(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i === tries) throw e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** (i - 1)));
    }
  }
}

await mkdir(OUT, { recursive: true });
let ok = 0;
for (const slug of SLUGS) {
  try {
    const buf = await fetchBin(`${BASE}/${slug}.png`);
    await writeFile(join(OUT, `${slug}.png`), buf);
    ok++;
    process.stdout.write(`  ✓ ${slug}.png (${buf.length}b)\n`);
  } catch (e) {
    process.stdout.write(`  ✗ ${slug}: ${e.message}\n`);
  }
}
process.stdout.write(`Done: ${ok}/${SLUGS.length} item sprites → img/items/\n`);
