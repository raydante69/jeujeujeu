// ─────────────────────────────────────────────────────────────────────────────
//  ABILITIES — every Pokémon has a unique passive ability in combat.
//  Fields used by combatEngine:
//    dmgType    — type whose moves get boosted ('*' = all types)
//    dmgMult    — extra damage fraction (0.3 = +30%)
//    guardMult  — extra shield fraction on guard moves
//    healMult   — extra healing fraction on heal/drain moves
//    statusTurns— extra turns on inflicted statuses
//    buffPlus   — extra fraction added to buff moves
//    startLevel — bonus starting level when this mon leads a run
//  Display-only fields (shown in Pokédex, future combat use):
//    allyType   — type of required ally for allyBonus to activate
//    allyBonus  — damage bonus fraction when allyType ally is present
// ─────────────────────────────────────────────────────────────────────────────

const ABILITIES = {
  // ── Bulbasaur line ──────────────────────────────────────────────────────────
  1:  { name: 'Engrais',           emoji: '🌱', dmgType: 'grass',    dmgMult: 0.20, allyType: 'water',    allyBonus: 0.10, desc: '+20% Plante. Duo avec Eau : +10% dégâts.' },
  2:  { name: 'Chlorophylle',      emoji: '☀️', dmgType: 'grass',    dmgMult: 0.25, healMult: 0.20,       desc: '+25% Plante, soins +20%.' },
  3:  { name: 'Symbiose',          emoji: '🌿', dmgType: 'grass',    dmgMult: 0.30, healMult: 0.50,       desc: '+30% Plante, soins +50%.' },

  // ── Charmander line ─────────────────────────────────────────────────────────
  4:  { name: 'Brasier Naissant',  emoji: '🔥', dmgType: 'fire',     dmgMult: 0.20,                       desc: '+20% Feu.' },
  5:  { name: 'Flame',             emoji: '🔥', dmgType: 'fire',     dmgMult: 0.25, statusTurns: 1,       desc: '+25% Feu, brûlures durent +1 tour.' },
  6:  { name: 'Brasier',           emoji: '🔥', dmgType: 'fire',     dmgMult: 0.35, statusTurns: 1,       desc: '+35% Feu, brûlures durent +1 tour.' },

  // ── Squirtle line ───────────────────────────────────────────────────────────
  7:  { name: 'Torrent',           emoji: '💧', dmgType: 'water',    dmgMult: 0.20,                       desc: '+20% Eau.' },
  8:  { name: 'Écaille',           emoji: '🐢', dmgType: 'water',    dmgMult: 0.20, guardMult: 0.20,      desc: '+20% Eau, boucliers +20%.' },
  9:  { name: 'Carapace',          emoji: '🛡️', dmgType: 'water',    dmgMult: 0.15, guardMult: 0.40,      desc: 'Boucliers +40%, Eau +15%.' },

  // ── Caterpie line ───────────────────────────────────────────────────────────
  10: { name: 'Poussière Écailles',emoji: '🦋', guardMult: 0.20,                                          desc: 'Boucliers +20%.' },
  11: { name: 'Durcissement',      emoji: '🪺', guardMult: 0.40,                                          desc: 'Boucliers +40%.' },
  12: { name: 'Yeux Composés',     emoji: '👁️', dmgType: 'bug',      dmgMult: 0.25, statusTurns: 1,       desc: '+25% Insecte, statuts +1 tour.' },

  // ── Weedle line ─────────────────────────────────────────────────────────────
  13: { name: 'Pointe Venin',      emoji: '🪲', dmgType: 'poison',   dmgMult: 0.15, statusTurns: 1,       desc: '+15% Poison, statuts +1 tour.' },
  14: { name: 'Cocon',             emoji: '🫧', guardMult: 0.30,                                          desc: 'Boucliers +30%.' },
  15: { name: 'Sniper',            emoji: '🎯', dmgType: 'bug',      dmgMult: 0.35,                       desc: '+35% Insecte.' },

  // ── Pidgey line ─────────────────────────────────────────────────────────────
  16: { name: 'Œil Vif',           emoji: '🦅', dmgType: 'flying',   dmgMult: 0.15,                       desc: '+15% Vol.' },
  17: { name: 'Déroute',           emoji: '🌪️', dmgType: 'flying',   dmgMult: 0.20, guardMult: 0.15,      desc: '+20% Vol, boucliers +15%.' },
  18: { name: 'Grand Oiseau',      emoji: '🦅', dmgType: 'flying',   dmgMult: 0.30, allyType: 'flying',   allyBonus: 0.15, desc: '+30% Vol. Duo Vol : +15% dégâts.' },

  // ── Rattata line ────────────────────────────────────────────────────────────
  19: { name: 'Course Effrénée',   emoji: '🐭', dmgType: 'normal',   dmgMult: 0.20,                       desc: '+20% Normal.' },
  20: { name: 'Hyper Croc',        emoji: '🦷', dmgType: 'normal',   dmgMult: 0.30, statusTurns: 1,       desc: '+30% Normal, statuts +1 tour.' },

  // ── Spearow line ────────────────────────────────────────────────────────────
  21: { name: 'Acuité',            emoji: '🔪', dmgType: 'flying',   dmgMult: 0.20,                       desc: '+20% Vol.' },
  22: { name: 'Bec Acéré',         emoji: '⚔️', dmgType: 'flying',   dmgMult: 0.30, allyType: 'normal',   allyBonus: 0.10, desc: '+30% Vol. Duo Normal : +10% dégâts.' },

  // ── Ekans line ──────────────────────────────────────────────────────────────
  23: { name: 'Intimidation',      emoji: '🐍', dmgType: 'poison',   dmgMult: 0.15, statusTurns: 1,       desc: '+15% Poison, statuts +1 tour.' },
  24: { name: 'Morsure Venin',     emoji: '🐍', dmgType: 'poison',   dmgMult: 0.25, statusTurns: 2,       desc: '+25% Poison, statuts +2 tours.' },

  // ── Pikachu line ────────────────────────────────────────────────────────────
  25: { name: 'Statique',          emoji: '⚡', dmgType: 'electric', dmgMult: 0.30, statusTurns: 1,       desc: '+30% Électrik, paralysie +1 tour.' },
  26: { name: 'Surcharge',         emoji: '⚡', dmgType: 'electric', dmgMult: 0.45, allyType: 'electric', allyBonus: 0.15, desc: '+45% Électrik. Duo Électrik : +15% dégâts.' },

  // ── Sandshrew line ──────────────────────────────────────────────────────────
  27: { name: 'Sable Fin',         emoji: '🏜️', dmgType: 'ground',   dmgMult: 0.15, guardMult: 0.20,      desc: '+15% Sol, boucliers +20%.' },
  28: { name: 'Sable Rasoir',      emoji: '⚔️', dmgType: 'ground',   dmgMult: 0.30, guardMult: 0.15,      desc: '+30% Sol, boucliers +15%.' },

  // ── Nidoran♀ line ───────────────────────────────────────────────────────────
  29: { name: 'Dard Venin',        emoji: '💉', dmgType: 'poison',   dmgMult: 0.15, statusTurns: 1,       desc: '+15% Poison, statuts +1 tour.' },
  30: { name: 'Rivalité',          emoji: '💜', dmgType: 'poison',   dmgMult: 0.20, healMult: 0.15,       desc: '+20% Poison, soins +15%.' },
  31: { name: 'Force Reine',       emoji: '👑', dmgType: 'poison',   dmgMult: 0.30, guardMult: 0.25, allyType: 'ground', allyBonus: 0.10, desc: '+30% Poison, boucliers +25%. Duo Sol : +10% dégâts.' },

  // ── Nidoran♂ line ───────────────────────────────────────────────────────────
  32: { name: 'Point Venin',       emoji: '💉', dmgType: 'poison',   dmgMult: 0.15, statusTurns: 1,       desc: '+15% Poison, statuts +1 tour.' },
  33: { name: 'Rivalité+',         emoji: '💜', dmgType: 'poison',   dmgMult: 0.20,                       desc: '+20% Poison.' },
  34: { name: 'Force Roi',         emoji: '👑', dmgType: 'poison',   dmgMult: 0.30, guardMult: 0.25, allyType: 'poison', allyBonus: 0.10, desc: '+30% Poison, boucliers +25%. Duo Poison : +10% dégâts.' },

  // ── Clefairy line ───────────────────────────────────────────────────────────
  35: { name: 'Magie Lunaire',     emoji: '🌙', healMult: 0.25, dmgType: 'normal', dmgMult: 0.10,          desc: 'Soins +25%, +10% Normal.' },
  36: { name: 'Magie Plus',        emoji: '✨', dmgType: '*',        dmgMult: 0.10, healMult: 0.35,       desc: '+10% tous types, soins +35%.' },

  // ── Vulpix line ─────────────────────────────────────────────────────────────
  37: { name: 'Flash-Feu',         emoji: '🦊', dmgType: 'fire',     dmgMult: 0.25,                       desc: '+25% Feu.' },
  38: { name: 'Flamme Maudite',    emoji: '🔮', dmgType: 'fire',     dmgMult: 0.25, statusTurns: 1,       desc: '+25% Feu, brûlures +1 tour.' },

  // ── Jigglypuff line ─────────────────────────────────────────────────────────
  39: { name: 'Berceuse',          emoji: '🎵', statusTurns: 2, dmgType: 'normal', dmgMult: 0.10,          desc: 'Statuts durent +2 tours, +10% Normal.' },
  40: { name: 'Berceuse+',         emoji: '🎶', statusTurns: 2, healMult: 0.20, dmgType: 'normal', dmgMult: 0.15, desc: 'Statuts +2 tours, soins +20%, +15% Normal.' },

  // ── Zubat line ──────────────────────────────────────────────────────────────
  41: { name: 'Écho Interne',      emoji: '🦇', dmgType: 'flying',   dmgMult: 0.15, statusTurns: 1,       desc: '+15% Vol, statuts +1 tour.' },
  42: { name: 'Morsure Nuit',      emoji: '🌑', dmgType: 'flying',   dmgMult: 0.20, healMult: 0.15, allyType: 'poison', allyBonus: 0.10, desc: '+20% Vol, soins +15%. Duo Poison : +10% dégâts.' },

  // ── Oddish line ─────────────────────────────────────────────────────────────
  43: { name: 'Chlorophylle',      emoji: '🌻', dmgType: 'grass',    dmgMult: 0.15, statusTurns: 1,       desc: '+15% Plante, statuts +1 tour.' },
  44: { name: 'Arôme Sucré',       emoji: '🌱', dmgType: 'grass',    dmgMult: 0.20, healMult: 0.20,       desc: '+20% Plante, soins +20%.' },
  45: { name: 'Nuage Parfumé',     emoji: '💐', dmgType: 'grass',    dmgMult: 0.25, healMult: 0.35, statusTurns: 1, desc: '+25% Plante, soins +35%, statuts +1 tour.' },

  // ── Paras line ──────────────────────────────────────────────────────────────
  46: { name: 'Spores Parasites',  emoji: '🍄', dmgType: 'bug',      dmgMult: 0.15, statusTurns: 1,       desc: '+15% Insecte, statuts +1 tour.' },
  47: { name: 'Hyphes',            emoji: '🍄', dmgType: 'bug',      dmgMult: 0.20, statusTurns: 2,       desc: '+20% Insecte, statuts +2 tours.' },

  // ── Venonat line ────────────────────────────────────────────────────────────
  48: { name: 'Écailles Poudre',   emoji: '🦟', guardMult: 0.20, dmgType: 'bug',  dmgMult: 0.10,          desc: 'Boucliers +20%, +10% Insecte.' },
  49: { name: 'Télépathie',        emoji: '🔮', dmgType: 'psychic',  dmgMult: 0.20, statusTurns: 1,       desc: '+20% Psy, statuts +1 tour.' },

  // ── Diglett line ────────────────────────────────────────────────────────────
  50: { name: 'Fouisseur',         emoji: '🕳️', dmgType: 'ground',   dmgMult: 0.20,                       desc: '+20% Sol.' },
  51: { name: 'Triplé Crocs',      emoji: '⚔️', dmgType: 'ground',   dmgMult: 0.30, allyType: 'rock',     allyBonus: 0.15, desc: '+30% Sol. Duo Roche : +15% dégâts.' },

  // ── Meowth line ─────────────────────────────────────────────────────────────
  52: { name: 'Récup',             emoji: '🪙', dmgType: 'normal',   dmgMult: 0.15, healMult: 0.20,       desc: '+15% Normal, soins +20%.' },
  53: { name: 'Limier',            emoji: '😼', dmgType: 'normal',   dmgMult: 0.25, guardMult: 0.15,      desc: '+25% Normal, boucliers +15%.' },

  // ── Psyduck line ────────────────────────────────────────────────────────────
  54: { name: 'Migraine',          emoji: '💆', dmgType: 'psychic',  dmgMult: 0.15, statusTurns: 1,       desc: '+15% Psy, statuts +1 tour.' },
  55: { name: 'Vague Psy',         emoji: '🌀', dmgType: 'psychic',  dmgMult: 0.30, statusTurns: 1,       desc: '+30% Psy, statuts +1 tour.' },

  // ── Mankey line ─────────────────────────────────────────────────────────────
  56: { name: 'Rage',              emoji: '🐵', dmgType: 'fighting', dmgMult: 0.20,                       desc: '+20% Combat.' },
  57: { name: 'Défiant',           emoji: '💪', dmgType: 'fighting', dmgMult: 0.30, allyType: 'fighting', allyBonus: 0.10, desc: '+30% Combat. Duo Combat : +10% dégâts.' },

  // ── Growlithe line ──────────────────────────────────────────────────────────
  58: { name: 'Intimidation',      emoji: '🐶', dmgType: 'fire',     dmgMult: 0.20, statusTurns: 1,       desc: '+20% Feu, statuts +1 tour.' },
  59: { name: 'Feu Ardent',        emoji: '🔥', dmgType: 'fire',     dmgMult: 0.30, allyType: 'fire',     allyBonus: 0.15, desc: '+30% Feu. Duo Feu : +15% dégâts.' },

  // ── Poliwag line ────────────────────────────────────────────────────────────
  60: { name: 'Tourbillon',        emoji: '🌀', dmgType: 'water',    dmgMult: 0.15,                       desc: '+15% Eau.' },
  61: { name: 'Hydratation',       emoji: '💧', dmgType: 'water',    dmgMult: 0.20, healMult: 0.20,       desc: '+20% Eau, soins +20%.' },
  62: { name: 'Eau Bouillante',    emoji: '♨️', dmgType: 'water',    dmgMult: 0.25, guardMult: 0.20,      desc: '+25% Eau, boucliers +20%.' },

  // ── Abra line ───────────────────────────────────────────────────────────────
  63: { name: 'Télékinesie',       emoji: '🥄', dmgType: 'psychic',  dmgMult: 0.20,                       desc: '+20% Psy.' },
  64: { name: 'Illusion',          emoji: '🎭', dmgType: 'psychic',  dmgMult: 0.25, guardMult: 0.15,      desc: '+25% Psy, boucliers +15%.' },
  65: { name: 'Synchro',           emoji: '🥄', dmgType: 'psychic',  dmgMult: 0.30, statusTurns: 1,       desc: '+30% Psy, statuts +1 tour.' },

  // ── Machop line ─────────────────────────────────────────────────────────────
  66: { name: 'Sans-Gêne',         emoji: '🏋️', dmgType: 'fighting', dmgMult: 0.20,                       desc: '+20% Combat.' },
  67: { name: 'Force Brute',       emoji: '💪', dmgType: 'fighting', dmgMult: 0.25, guardMult: 0.10,      desc: '+25% Combat, boucliers +10%.' },
  68: { name: 'Garde Maîtrisée',   emoji: '💪', dmgType: 'fighting', dmgMult: 0.30, buffPlus: 0.40,       desc: '+30% Combat, boosts +40%.' },

  // ── Bellsprout line ─────────────────────────────────────────────────────────
  69: { name: 'Chlorophylle',      emoji: '🌿', dmgType: 'grass',    dmgMult: 0.15, statusTurns: 1,       desc: '+15% Plante, statuts +1 tour.' },
  70: { name: 'Sève Acide',        emoji: '☠️', dmgType: 'poison',   dmgMult: 0.20, statusTurns: 1,       desc: '+20% Poison, statuts +1 tour.' },
  71: { name: 'Acide Glutant',     emoji: '🌺', dmgType: 'grass',    dmgMult: 0.25, statusTurns: 2,       desc: '+25% Plante, statuts +2 tours.' },

  // ── Tentacool line ──────────────────────────────────────────────────────────
  72: { name: 'Dard Venin',        emoji: '🪼', dmgType: 'poison',   dmgMult: 0.15, guardMult: 0.15,      desc: '+15% Poison, boucliers +15%.' },
  73: { name: 'Kraken',            emoji: '🌊', dmgType: 'water',    dmgMult: 0.20, guardMult: 0.20,      desc: '+20% Eau, boucliers +20%.' },

  // ── Geodude line ────────────────────────────────────────────────────────────
  74: { name: 'Roc Résistant',     emoji: '🪨', guardMult: 0.20, dmgType: 'rock',  dmgMult: 0.15,          desc: 'Boucliers +20%, +15% Roche.' },
  75: { name: 'Roc Acier',         emoji: '⛰️', guardMult: 0.30, dmgType: 'rock',  dmgMult: 0.20,          desc: 'Boucliers +30%, +20% Roche.' },
  76: { name: 'Tremblement',       emoji: '💥', dmgType: 'rock',     dmgMult: 0.30, guardMult: 0.25, allyType: 'ground', allyBonus: 0.15, desc: '+30% Roche, boucliers +25%. Duo Sol : +15% dégâts.' },

  // ── Ponyta line ─────────────────────────────────────────────────────────────
  77: { name: 'Crinière de Feu',   emoji: '🔥', dmgType: 'fire',     dmgMult: 0.20, statusTurns: 1,       desc: '+20% Feu, brûlures +1 tour.' },
  78: { name: 'Rapidité',          emoji: '⚡', dmgType: 'fire',     dmgMult: 0.25, allyType: 'fire',     allyBonus: 0.10, desc: '+25% Feu. Duo Feu : +10% dégâts.' },

  // ── Slowpoke line ───────────────────────────────────────────────────────────
  79: { name: 'Morosité',          emoji: '🐌', guardMult: 0.25, healMult: 0.20,                           desc: 'Boucliers +25%, soins +20%.' },
  80: { name: 'Régénération',      emoji: '🔄', healMult: 0.40, guardMult: 0.20,                           desc: 'Soins +40%, boucliers +20%.' },

  // ── Magnemite line ──────────────────────────────────────────────────────────
  81: { name: 'Aimant',            emoji: '🔋', dmgType: 'electric', dmgMult: 0.20, guardMult: 0.15,      desc: '+20% Électrik, boucliers +15%.' },
  82: { name: 'Analytic',          emoji: '⚡', dmgType: 'electric', dmgMult: 0.30, allyType: 'steel',    allyBonus: 0.15, desc: '+30% Électrik. Duo Acier : +15% dégâts.' },

  // ── Farfetch'd ──────────────────────────────────────────────────────────────
  83: { name: 'Poireau Magique',   emoji: '🌿', dmgType: 'flying',   dmgMult: 0.20, guardMult: 0.10,      desc: '+20% Vol, boucliers +10%.' },

  // ── Doduo line ──────────────────────────────────────────────────────────────
  84: { name: 'Double Bec',        emoji: '🐦', dmgType: 'flying',   dmgMult: 0.20,                       desc: '+20% Vol.' },
  85: { name: 'Triple Attaque',    emoji: '🐦', dmgType: 'flying',   dmgMult: 0.30, statusTurns: 1,       desc: '+30% Vol, statuts +1 tour.' },

  // ── Seel line ───────────────────────────────────────────────────────────────
  86: { name: 'Eau Glacée',        emoji: '🧊', dmgType: 'water',    dmgMult: 0.15,                       desc: '+15% Eau.' },
  87: { name: 'Gel Rapide',        emoji: '❄️', dmgType: 'ice',      dmgMult: 0.25, statusTurns: 1,       desc: '+25% Glace, statuts +1 tour.' },

  // ── Grimer line ─────────────────────────────────────────────────────────────
  88: { name: 'Boue Toxique',      emoji: '☠️', dmgType: 'poison',   dmgMult: 0.15, statusTurns: 1,       desc: '+15% Poison, statuts +1 tour.' },
  89: { name: 'Acide Rongeant',    emoji: '🧪', dmgType: 'poison',   dmgMult: 0.30, statusTurns: 2,       desc: '+30% Poison, statuts +2 tours.' },

  // ── Shellder line ───────────────────────────────────────────────────────────
  90: { name: 'Coquille',          emoji: '🐚', guardMult: 0.30, dmgType: 'water', dmgMult: 0.10,          desc: 'Boucliers +30%, +10% Eau.' },
  91: { name: 'Claquade',          emoji: '🦀', dmgType: 'water',    dmgMult: 0.25, guardMult: 0.30,      desc: '+25% Eau, boucliers +30%.' },

  // ── Gastly line ─────────────────────────────────────────────────────────────
  92: { name: 'Brume Fantôme',     emoji: '👻', dmgType: 'ghost',    dmgMult: 0.20, statusTurns: 1,       desc: '+20% Spectre, statuts +1 tour.' },
  93: { name: 'Hypnose',           emoji: '😴', dmgType: 'ghost',    dmgMult: 0.25, statusTurns: 2,       desc: '+25% Spectre, statuts +2 tours.' },
  94: { name: 'Corps Maudit',      emoji: '💀', dmgType: 'ghost',    dmgMult: 0.30, statusTurns: 1,       desc: '+30% Spectre, statuts +1 tour.' },

  // ── Onix ────────────────────────────────────────────────────────────────────
  95: { name: 'Roc Inébranlable',  emoji: '⛰️', guardMult: 0.45, dmgType: 'rock',  dmgMult: 0.15,          desc: 'Boucliers +45%, +15% Roche.' },

  // ── Drowzee line ────────────────────────────────────────────────────────────
  96: { name: 'Télépathie',        emoji: '🧠', dmgType: 'psychic',  dmgMult: 0.20, statusTurns: 1,       desc: '+20% Psy, statuts +1 tour.' },
  97: { name: 'Mal de Rêve',       emoji: '💤', dmgType: 'psychic',  dmgMult: 0.30, statusTurns: 2,       desc: '+30% Psy, statuts +2 tours.' },

  // ── Krabby line ─────────────────────────────────────────────────────────────
  98: { name: 'Pince Acérée',      emoji: '🦀', dmgType: 'water',    dmgMult: 0.20,                       desc: '+20% Eau.' },
  99: { name: 'Hyper Cutter',      emoji: '⚔️', dmgType: 'water',    dmgMult: 0.30, guardMult: 0.10,      desc: '+30% Eau, boucliers +10%.' },

  // ── Voltorb line ────────────────────────────────────────────────────────────
  100:{ name: 'Décharge',          emoji: '💥', dmgType: 'electric', dmgMult: 0.20,                       desc: '+20% Électrik.' },
  101:{ name: 'Explosion+',        emoji: '💥', dmgType: 'electric', dmgMult: 0.30, allyType: 'electric', allyBonus: 0.20, desc: '+30% Électrik. Duo Électrik : +20% dégâts.' },

  // ── Exeggcute line ──────────────────────────────────────────────────────────
  102:{ name: 'Chlorophylle',      emoji: '🌿', dmgType: 'grass',    dmgMult: 0.15, healMult: 0.20,       desc: '+15% Plante, soins +20%.' },
  103:{ name: 'Récolte',           emoji: '🌴', dmgType: 'grass',    dmgMult: 0.25, healMult: 0.35,       desc: '+25% Plante, soins +35%.' },

  // ── Cubone line ─────────────────────────────────────────────────────────────
  104:{ name: 'Crâne Osseux',      emoji: '💀', guardMult: 0.25, dmgType: 'ground', dmgMult: 0.15,         desc: 'Boucliers +25%, +15% Sol.' },
  105:{ name: 'Héritage',          emoji: '🦴', dmgType: 'ground',   dmgMult: 0.25, guardMult: 0.25,      desc: '+25% Sol, boucliers +25%.' },

  // ── Hitmonlee & Hitmonchan ──────────────────────────────────────────────────
  106:{ name: 'Limbique',          emoji: '🦵', dmgType: 'fighting', dmgMult: 0.35,                       desc: '+35% Combat.' },
  107:{ name: 'Poing de Feu',      emoji: '🥊', dmgType: 'fighting', dmgMult: 0.25, statusTurns: 1,       desc: '+25% Combat, brûlures +1 tour.' },

  // ── Lickitung ───────────────────────────────────────────────────────────────
  108:{ name: 'Lécher',            emoji: '👅', healMult: 0.40, dmgType: 'normal',  dmgMult: 0.10,         desc: 'Soins +40%, +10% Normal.' },

  // ── Koffing line ────────────────────────────────────────────────────────────
  109:{ name: 'Lévitation Toxique',emoji: '☁️', dmgType: 'poison',   dmgMult: 0.20, statusTurns: 1,       desc: '+20% Poison, statuts +1 tour.' },
  110:{ name: 'Gaz Toxique',       emoji: '🧪', dmgType: 'poison',   dmgMult: 0.30, statusTurns: 2, allyType: 'poison', allyBonus: 0.10, desc: '+30% Poison, statuts +2 tours. Duo Poison : +10% dégâts.' },

  // ── Rhyhorn line ────────────────────────────────────────────────────────────
  111:{ name: 'Roc Charge',        emoji: '🦏', dmgType: 'ground',   dmgMult: 0.20, guardMult: 0.15,      desc: '+20% Sol, boucliers +15%.' },
  112:{ name: 'Roc-Garde',         emoji: '🪨', dmgType: 'ground',   dmgMult: 0.20, guardMult: 0.30,      desc: '+20% Sol, boucliers +30%.' },

  // ── Chansey ─────────────────────────────────────────────────────────────────
  113:{ name: 'Guérisseuse',       emoji: '🩹', healMult: 0.60, guardMult: 0.20,                          desc: 'Soins +60%, boucliers +20%.' },

  // ── Tangela ─────────────────────────────────────────────────────────────────
  114:{ name: 'Régénération',      emoji: '🌿', healMult: 0.30, dmgType: 'grass',   dmgMult: 0.15,         desc: 'Soins +30%, +15% Plante.' },

  // ── Kangaskhan ──────────────────────────────────────────────────────────────
  115:{ name: 'Attaque Mère',      emoji: '🦘', dmgType: 'normal',   dmgMult: 0.25, guardMult: 0.20,      desc: '+25% Normal, boucliers +20%.' },

  // ── Horsea line ─────────────────────────────────────────────────────────────
  116:{ name: 'Poudre Danse',      emoji: '🐠', dmgType: 'water',    dmgMult: 0.15, statusTurns: 1,       desc: '+15% Eau, statuts +1 tour.' },
  117:{ name: 'Tourbillon Aqua',   emoji: '🌀', dmgType: 'water',    dmgMult: 0.25, statusTurns: 1,       desc: '+25% Eau, statuts +1 tour.' },

  // ── Goldeen line ────────────────────────────────────────────────────────────
  118:{ name: 'Eau Jet',           emoji: '🐟', dmgType: 'water',    dmgMult: 0.15,                       desc: '+15% Eau.' },
  119:{ name: 'Corne Eau',         emoji: '🐟', dmgType: 'water',    dmgMult: 0.25, allyType: 'water',    allyBonus: 0.10, desc: '+25% Eau. Duo Eau : +10% dégâts.' },

  // ── Staryu line ─────────────────────────────────────────────────────────────
  120:{ name: 'Guérison Nat.',     emoji: '⭐', healMult: 0.30, dmgType: 'water',   dmgMult: 0.15,         desc: 'Soins +30%, +15% Eau.' },
  121:{ name: 'Analyse',           emoji: '🌟', dmgType: '*',        dmgMult: 0.15, healMult: 0.30, startLevel: 3, desc: '+15% tous types, soins +30%, +3 niveaux au départ.' },

  // ── Mr. Mime ─────────────────────────────────────────────────────────────────
  122:{ name: 'Barrière',          emoji: '🔮', guardMult: 0.35, dmgType: 'psychic', dmgMult: 0.20, statusTurns: 1, desc: 'Boucliers +35%, +20% Psy, statuts +1 tour.' },

  // ── Scyther ─────────────────────────────────────────────────────────────────
  123:{ name: 'Double-Lame',       emoji: '⚔️', dmgType: 'bug',      dmgMult: 0.30, allyType: 'flying',   allyBonus: 0.15, desc: '+30% Insecte. Duo Vol : +15% dégâts.' },

  // ── Jynx ────────────────────────────────────────────────────────────────────
  124:{ name: 'Voile Givre',       emoji: '💋', dmgType: 'ice',      dmgMult: 0.25, statusTurns: 2,       desc: '+25% Glace, statuts +2 tours.' },

  // ── Electabuzz ──────────────────────────────────────────────────────────────
  125:{ name: 'Éclair',            emoji: '⚡', dmgType: 'electric', dmgMult: 0.30, allyType: 'electric', allyBonus: 0.10, desc: '+30% Électrik. Duo Électrik : +10% dégâts.' },

  // ── Magmar ──────────────────────────────────────────────────────────────────
  126:{ name: 'Brûlure Vive',      emoji: '🔥', dmgType: 'fire',     dmgMult: 0.30, statusTurns: 1,       desc: '+30% Feu, brûlures +1 tour.' },

  // ── Pinsir ──────────────────────────────────────────────────────────────────
  127:{ name: 'Tenaille',          emoji: '🦂', dmgType: 'bug',      dmgMult: 0.35, guardMult: 0.10,      desc: '+35% Insecte, boucliers +10%.' },

  // ── Tauros ──────────────────────────────────────────────────────────────────
  128:{ name: 'Intimidation',      emoji: '🐂', dmgType: 'normal',   dmgMult: 0.30, statusTurns: 1,       desc: '+30% Normal, statuts +1 tour.' },

  // ── Magikarp line ───────────────────────────────────────────────────────────
  129:{ name: 'Maladroit',         emoji: '🐟', dmgType: 'water',    dmgMult: 0.15,                       desc: '+15% Eau (un jour il sera fort...).' },
  130:{ name: 'Fureur',            emoji: '🌊', dmgType: '*',        dmgMult: 0.15, startLevel: 3,        desc: '+15% tous types, +3 niveaux au départ.' },

  // ── Lapras ──────────────────────────────────────────────────────────────────
  131:{ name: 'Chant Apaisant',    emoji: '🧊', dmgType: 'ice',      dmgMult: 0.15, healMult: 0.60,       desc: 'Soins +60%, +15% Glace.' },

  // ── Ditto ───────────────────────────────────────────────────────────────────
  132:{ name: 'Métamorph',         emoji: '🫧', dmgType: '*',        dmgMult: 0.10,                       desc: '+10% tous types.' },

  // ── Eevee + evolutions ──────────────────────────────────────────────────────
  133:{ name: 'Adaptabilité',      emoji: '🦊', dmgType: 'normal',   dmgMult: 0.20,                       desc: '+20% Normal.' },
  134:{ name: 'Hydratation',       emoji: '💧', dmgType: 'water',    dmgMult: 0.25, healMult: 0.30,       desc: '+25% Eau, soins +30%.' },
  135:{ name: 'Éclair Rapide',     emoji: '⚡', dmgType: 'electric', dmgMult: 0.30, allyType: 'electric', allyBonus: 0.15, desc: '+30% Électrik. Duo Électrik : +15% dégâts.' },
  136:{ name: 'Brasier Vif',       emoji: '🔥', dmgType: 'fire',     dmgMult: 0.30, allyType: 'fire',     allyBonus: 0.15, desc: '+30% Feu. Duo Feu : +15% dégâts.' },

  // ── Porygon ─────────────────────────────────────────────────────────────────
  137:{ name: 'Téléchargement',    emoji: '💻', dmgType: 'normal',   dmgMult: 0.15, guardMult: 0.15,      desc: '+15% Normal, boucliers +15%.' },

  // ── Omanyte line ────────────────────────────────────────────────────────────
  138:{ name: 'Fossile Aqua',      emoji: '🦑', dmgType: 'water',    dmgMult: 0.15, guardMult: 0.20,      desc: '+15% Eau, boucliers +20%.' },
  139:{ name: 'Tourbillon',        emoji: '🌊', dmgType: 'water',    dmgMult: 0.25, guardMult: 0.25,      desc: '+25% Eau, boucliers +25%.' },

  // ── Kabuto line ─────────────────────────────────────────────────────────────
  140:{ name: 'Fossile Roc',       emoji: '🦀', dmgType: 'rock',     dmgMult: 0.15, guardMult: 0.20,      desc: '+15% Roche, boucliers +20%.' },
  141:{ name: 'Tranche',           emoji: '⚔️', dmgType: 'water',    dmgMult: 0.25, allyType: 'rock',     allyBonus: 0.10, desc: '+25% Eau. Duo Roche : +10% dégâts.' },

  // ── Aerodactyl ──────────────────────────────────────────────────────────────
  142:{ name: 'Pression Roche',    emoji: '⚡', dmgType: 'rock',     dmgMult: 0.25, allyType: 'flying',   allyBonus: 0.15, desc: '+25% Roche. Duo Vol : +15% dégâts.' },

  // ── Snorlax ─────────────────────────────────────────────────────────────────
  143:{ name: 'Immunité',          emoji: '😴', guardMult: 0.30, healMult: 0.30, startLevel: 6,            desc: 'Boucliers +30%, soins +30%, +6 niveaux au départ.' },

  // ── Legendary birds ─────────────────────────────────────────────────────────
  144:{ name: 'Majesté Givrée',    emoji: '❄️', dmgType: 'ice',      dmgMult: 0.35, guardMult: 0.20, statusTurns: 1, startLevel: 5, desc: '+35% Glace, boucliers +20%, statuts +1 tour, +5 niveaux.' },
  145:{ name: 'Tonnerre Divin',    emoji: '⚡', dmgType: 'electric', dmgMult: 0.40, statusTurns: 1, allyType: 'flying', allyBonus: 0.15, startLevel: 5, desc: '+40% Électrik, statuts +1 tour. Duo Vol : +15% dégâts. +5 niveaux.' },
  146:{ name: 'Flamme Sacrée',     emoji: '🔥', dmgType: 'fire',     dmgMult: 0.40, statusTurns: 1, healMult: 0.20, startLevel: 5, desc: '+40% Feu, brûlures +1 tour, soins +20%. +5 niveaux.' },

  // ── Dratini line ────────────────────────────────────────────────────────────
  147:{ name: 'Marque Écaille',    emoji: '🐲', dmgType: 'dragon',   dmgMult: 0.15, guardMult: 0.15,      desc: '+15% Dragon, boucliers +15%.' },
  148:{ name: 'Multi-Écailles',    emoji: '🐉', dmgType: 'dragon',   dmgMult: 0.25, guardMult: 0.25,      desc: '+25% Dragon, boucliers +25%.' },
  149:{ name: 'Force Dracos',      emoji: '🐉', dmgType: 'dragon',   dmgMult: 0.35, guardMult: 0.20, startLevel: 4, desc: '+35% Dragon, boucliers +20%, +4 niveaux au départ.' },

  // ── Mewtwo & Mew ────────────────────────────────────────────────────────────
  150:{ name: 'Pression Psy',      emoji: '🔮', dmgType: 'psychic',  dmgMult: 0.30, startLevel: 5, statusTurns: 1, desc: '+30% Psy, statuts +1 tour.' },
  151:{ name: 'Métamorph+',        emoji: '✨', dmgType: '*',        dmgMult: 0.20, startLevel: 5, healMult: 0.20, desc: '+20% tous types, soins +20%, +5 niveaux au départ.' },
}

function genericAbility(types) {
  const t = (types || ['normal'])[0]
  const TYPE_NAMES = {
    fire: 'Feu', water: 'Eau', grass: 'Plante', electric: 'Électrik',
    psychic: 'Psy', fighting: 'Combat', ghost: 'Spectre', ice: 'Glace',
    dragon: 'Dragon', dark: 'Ténèbres', rock: 'Roche', ground: 'Sol',
    flying: 'Vol', bug: 'Insecte', poison: 'Poison', fairy: 'Fée',
    steel: 'Acier', normal: 'Normal',
  }
  const name = TYPE_NAMES[t] || t
  return {
    name: `Affinité ${name}`,
    emoji: '🔹',
    dmgType: t,
    dmgMult: 0.15,
    desc: `+15% aux attaques ${name}.`,
    generic: true,
  }
}

export function getTrait(speciesId, types) {
  return ABILITIES[speciesId] || genericAbility(types)
}

export function traitDamageMult(trait, moveType) {
  if (!trait) return 1
  if (trait.dmgType === '*' || trait.dmgType === moveType) return 1 + (trait.dmgMult || 0)
  return 1
}
