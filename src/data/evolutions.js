// Gen-1 evolution map. id -> { to: speciesId, level } for level-up evolutions,
// or { to, stone } for stone-only evolutions (these never fire on level-up;
// the player must USE the matching stone on the Pokémon).
// Keeping a `to` for stone species means isFinalEvo() stays correct (so card
// rarity/points are unchanged), while gainXp() only auto-evolves when `level`
// is present.

export const EVOLUTIONS = {
  1: { to: 2, level: 16 },   2: { to: 3, level: 32 },
  4: { to: 5, level: 16 },   5: { to: 6, level: 36 },
  7: { to: 8, level: 16 },   8: { to: 9, level: 36 },
  10: { to: 11, level: 7 },  11: { to: 12, level: 10 },
  13: { to: 14, level: 7 },  14: { to: 15, level: 10 },
  16: { to: 17, level: 18 }, 17: { to: 18, level: 36 },
  19: { to: 20, level: 20 },
  21: { to: 22, level: 20 },
  23: { to: 24, level: 22 },
  25: { to: 26, stone: 'thunder-stone' },          // Pikachu → Raichu
  27: { to: 28, level: 22 },
  29: { to: 30, level: 16 }, 30: { to: 31, stone: 'moon-stone' },   // Nidorina → Nidoqueen
  32: { to: 33, level: 16 }, 33: { to: 34, stone: 'moon-stone' },   // Nidorino → Nidoking
  35: { to: 36, stone: 'moon-stone' },             // Mélofée → Mélodelfe
  37: { to: 38, stone: 'fire-stone' },             // Goupix → Feunard
  39: { to: 40, stone: 'moon-stone' },             // Rondoudou → Grodoudou
  41: { to: 42, level: 22 },
  43: { to: 44, level: 21 }, 44: { to: 45, stone: 'leaf-stone' },   // Ortide → Rafflesia
  46: { to: 47, level: 24 },
  48: { to: 49, level: 31 },
  50: { to: 51, level: 26 },
  52: { to: 53, level: 28 },
  54: { to: 55, level: 33 },
  56: { to: 57, level: 28 },
  58: { to: 59, stone: 'fire-stone' },             // Caninos → Arcanin
  60: { to: 61, level: 25 }, 61: { to: 62, stone: 'water-stone' },  // Têtarte → Tartard
  63: { to: 64, level: 16 }, 64: { to: 65, level: 36 },
  66: { to: 67, level: 28 }, 67: { to: 68, level: 38 },
  69: { to: 70, level: 21 }, 70: { to: 71, stone: 'leaf-stone' },   // Boustiflor → Empiflor
  72: { to: 73, level: 30 },
  74: { to: 75, level: 25 }, 75: { to: 76, level: 42 },
  77: { to: 78, level: 40 },
  79: { to: 80, level: 37 },
  81: { to: 82, level: 30 },
  84: { to: 85, level: 31 },
  86: { to: 87, level: 34 },
  88: { to: 89, level: 38 },
  90: { to: 91, stone: 'water-stone' },            // Kokiyas → Crustabri
  92: { to: 93, level: 25 }, 93: { to: 94, level: 38 },
  96: { to: 97, level: 26 },
  98: { to: 99, level: 28 },
  100: { to: 101, level: 30 },
  102: { to: 103, stone: 'leaf-stone' },           // Noeunoeuf → Noadkoko
  104: { to: 105, level: 28 },
  109: { to: 110, level: 35 },
  111: { to: 112, level: 42 },
  116: { to: 117, level: 32 },
  118: { to: 119, level: 33 },
  120: { to: 121, stone: 'water-stone' },          // Stari → Staross
  129: { to: 130, level: 20 },
  133: { to: 134, stone: 'water-stone' },          // Évoli (placeholder; voir STONE_EVOLUTIONS)
  138: { to: 139, level: 40 },
  140: { to: 141, level: 40 },
  147: { to: 148, level: 30 }, 148: { to: 149, level: 55 },
}

// Stone evolutions, including one-to-many (Évoli). id -> { stone: targetId }.
export const STONE_EVOLUTIONS = {
  25:  { 'thunder-stone': 26 },
  30:  { 'moon-stone': 31 },
  33:  { 'moon-stone': 34 },
  35:  { 'moon-stone': 36 },
  37:  { 'fire-stone': 38 },
  39:  { 'moon-stone': 40 },
  44:  { 'leaf-stone': 45 },
  58:  { 'fire-stone': 59 },
  61:  { 'water-stone': 62 },
  70:  { 'leaf-stone': 71 },
  90:  { 'water-stone': 91 },
  102: { 'leaf-stone': 103 },
  120: { 'water-stone': 121 },
  133: { 'fire-stone': 136, 'water-stone': 134, 'thunder-stone': 135 }, // Flareon/Vaporeon/Jolteon
}

export function nextEvolution(id) {
  return EVOLUTIONS[id] || null
}

// Target species id if `stone` evolves species `id`, else null.
export function stoneEvolution(id, stone) {
  const map = STONE_EVOLUTIONS[id]
  return map ? (map[stone] || null) : null
}
