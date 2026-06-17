// Items. Two families:
//  - ACTIVE items: picked at item nodes and applied immediately (heal, level,
//    permanent stat boost, revive). `scope` decides whether the player targets
//    one Pokémon or the whole team.
//  - PASSIVE items: run-wide modifiers (Battle Tower) that stay in the bag and
//    affect every battle.

export const ACTIVE_ITEMS = {
  potion:      { id: 'potion',      name: 'Potion',       kind: 'heal',     scope: 'single', power: 0.5,  slug: 'potion',       icon: '💊', tier: 1, desc: 'Restore 50% HP to one Pokémon' },
  superpotion: { id: 'superpotion', name: 'Super Potion', kind: 'healFull', scope: 'single', slug: 'super-potion', icon: '🧪', tier: 2, desc: 'Fully heal one Pokémon' },
  fullrestore: { id: 'fullrestore', name: 'Full Restore', kind: 'healFull', scope: 'team',   slug: 'full-restore', icon: '🧴', tier: 3, desc: 'Fully heal the whole team' },
  rarecandy:   { id: 'rarecandy',   name: 'Rare Candy',   kind: 'level',    scope: 'single', power: 2,    slug: 'rare-candy',   icon: '🍬', tier: 2, desc: '+2 levels to one Pokémon' },
  protein:     { id: 'protein',     name: 'Protein',      kind: 'stat', stat: 'atk', scope: 'single', power: 10, slug: 'protein', icon: '💪', tier: 2, desc: '+10 Attack to one Pokémon' },
  iron:        { id: 'iron',        name: 'Iron',         kind: 'stat', stat: 'def', scope: 'single', power: 10, slug: 'iron',    icon: '🛡️', tier: 2, desc: '+10 Defense to one Pokémon' },
  calcium:     { id: 'calcium',     name: 'Calcium',      kind: 'stat', stat: 'spa', scope: 'single', power: 10, slug: 'calcium', icon: '🔮', tier: 2, desc: '+10 Sp. Atk to one Pokémon' },
  carbos:      { id: 'carbos',      name: 'Carbos',       kind: 'stat', stat: 'spe', scope: 'single', power: 12, slug: 'carbos',  icon: '👟', tier: 2, desc: '+12 Speed to one Pokémon' },
  hpup:        { id: 'hpup',        name: 'HP Up',        kind: 'stat', stat: 'hp',  scope: 'single', power: 14, slug: 'hp-up',   icon: '❤️', tier: 2, desc: '+14 Max HP to one Pokémon' },
  revive:      { id: 'revive',      name: 'Revive',       kind: 'revive',   scope: 'single', power: 0.5,  slug: 'revive',       icon: '✨', tier: 3, desc: 'Revive a fainted Pokémon at 50% HP' },
};

export const PASSIVE_ITEMS = {
  amulet:    { id: 'amulet',    name: 'Amulet Coin', slug: 'amulet-coin', icon: '🪙', desc: '+12% damage dealt',            mods: { damage: 1.12 } },
  focusband: { id: 'focusband', name: 'Focus Band',  slug: 'focus-band',  icon: '🎽', desc: '−10% damage taken',            mods: { taken: 0.90 } },
  quickclaw: { id: 'quickclaw', name: 'Quick Claw',  slug: 'quick-claw',  icon: '⚡', desc: '+12% Speed in battle',          mods: { speed: 1.12 } },
  leftovers: { id: 'leftovers', name: 'Leftovers',   slug: 'leftovers',   icon: '🍖', desc: 'Heal team 15% HP after wins',  mods: { postHeal: 0.15 } },
  luckyegg:  { id: 'luckyegg',  name: 'Lucky Egg',   slug: 'lucky-egg',   icon: '🥚', desc: '+50% XP from battles',          mods: { xp: 1.5 } },
  expshare:  { id: 'expshare',  name: 'Exp. Share',  slug: 'exp-share',   icon: '📡', desc: 'Caught Pokémon arrive +3 levels',mods: { catchLevel: 3 } },
  shellbell: { id: 'shellbell', name: 'Shell Bell',  slug: 'shell-bell',  icon: '🔔', desc: 'Heal 8% of damage dealt',       mods: { lifesteal: 0.08 } },
  choiceband:{ id: 'choiceband',name: 'Choice Band', slug: 'choice-band', icon: '🎀', desc: '+20% damage, −8% taken penalty',mods: { damage: 1.20, taken: 1.08 } },
};

export function activeItemList() {
  return Object.values(ACTIVE_ITEMS);
}
export function passiveItemList() {
  return Object.values(PASSIVE_ITEMS);
}

// Aggregate a side's passive bag into a single modifier object used by battle.js.
export function aggregatePassives(bag) {
  const mods = { damage: 1, taken: 1, speed: 1, postHeal: 0, xp: 1, catchLevel: 0, lifesteal: 0 };
  for (const id of bag || []) {
    const p = PASSIVE_ITEMS[id];
    if (!p) continue;
    for (const [k, v] of Object.entries(p.mods)) {
      if (k === 'postHeal' || k === 'catchLevel' || k === 'lifesteal') mods[k] += v;
      else mods[k] *= v;
    }
  }
  return mods;
}
