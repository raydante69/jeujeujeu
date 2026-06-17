// Achievement definitions. Unlocked by game logic via state.unlockAchievement().
export const ACHIEVEMENTS = [
  { id: 'first-win',    name: 'First Blood',   desc: 'Win your first battle',        icon: '⚔️' },
  { id: 'first-badge',  name: 'Badge Hunter',  desc: 'Earn your first badge',        icon: '🥇' },
  { id: 'catch-10',     name: 'Collector',     desc: 'Catch 10 Pokémon total',       icon: '🔴' },
  { id: 'evolve',       name: 'Evolution!',    desc: 'Evolve a Pokémon',             icon: '✨' },
  { id: 'shiny',        name: 'Sparkle',       desc: 'Encounter a shiny Pokémon',    icon: '🌟' },
  { id: 'all-badges',   name: 'Eight Strong',  desc: 'Earn all 8 gym badges',        icon: '🎖️' },
  { id: 'champion',     name: 'Champion',      desc: 'Defeat the Elite Four',        icon: '👑' },
  { id: 'pokedex-50',   name: 'Half Dex',      desc: 'See 50 different Pokémon',     icon: '📕' },
  { id: 'pokedex-151',  name: 'Gotta See Em',  desc: 'See all 151 Pokémon',          icon: '📗' },
  { id: 'nuzlocke',     name: 'Hardcore',      desc: 'Earn a badge in Nuzlocke mode',icon: '💀' },
];

export function achievementById(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
