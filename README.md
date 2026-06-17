# Pokelike — Pokémon Roguelike

A fan-made Pokémon **roguelike auto-battler** that runs entirely in the browser —
a faithful, from-scratch recreation of the look, structure and core game loop of
`pokelike.xyz`. Built as a **static site** with vanilla HTML/CSS/JS (ES modules,
no framework, no build step), styled in a retro pixel aesthetic (Press Start 2P).

> **Fan-made project.** Not affiliated with, endorsed by, or sponsored by
> Nintendo, Game Freak, or The Pokémon Company. All Pokémon names and sprites are
> property of their respective owners. Pokémon data and sprites are loaded from
> the open [PokeAPI](https://pokeapi.co) project.

## Play

It's a static site — serve the folder over HTTP and open it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

(Opening `index.html` via `file://` won't work — ES modules and `fetch` need
HTTP.)

## How it plays

- **Story mode** (Kanto): pick a trainer and a starter, then travel a branching
  **node map** of wild battles, trainers, items, catches and rest stops on the
  way to each **Gym**. Beat all 8 gyms, then the **Elite Four** and the
  **Champion**.
- **Auto-battler:** teams fight automatically using a simplified damage formula
  with STAB, the full 18-type chart and team **type traits** (synergies). Watch
  it play out or hit **Skip**.
- **Roguelike loop:** HP carries between fights, Pokémon gain levels and
  **evolve**, **shinies** can appear, and a wipe ends the run. **Classic** and
  **Nuzlocke** (permadeath) variants.
- **Meta:** Pokédex (seen/caught), achievements, Hall of Fame and a local save —
  all in `localStorage`, no account needed.

Battle Tower and Challenges are present on the title screen but routed to a
"coming soon" panel in this version.

## Data

`data/pokemon.json` (Gen 1, 151) is generated from PokeAPI at build time. Sprites
are referenced by URL from the open PokeAPI sprite CDN at runtime (nothing
copyrighted is stored in the repo). To regenerate:

```bash
node tools/fetch-pokemon.mjs
```

## Project structure

```
index.html              Shell: every game screen
style/main.css          Design system + all screen styles
js/
  main.js               Bootstrap (load data/save, wire UI)
  game.js               Run orchestrator (the game-flow controller)
  state.js  rng.js  i18n.js  audio.js
  data/                 types, pokemon, items, regions, traits, achievements
  engine/               battle, mapgen, encounters, evolution
  ui/                   screens, render, title, map, battle, choices,
                        elite, endgame, evo, hud, modals
data/pokemon.json       Generated dex data (PokeAPI)
tools/fetch-pokemon.mjs Build script for the dex data
```

## Credits

- Pokémon data & sprites: [PokeAPI](https://pokeapi.co)
- UI font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)
