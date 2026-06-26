// ─────────────────────────────────────────────────────────────────────────
//  CAPSULES TECHNIQUES (CT)
//  Gros catalogue curé (~100) couvrant les 18 types sur plusieurs paliers de
//  puissance, plus des status et une poignée de CT utilitaires Normal
//  (soin / bouclier / buff) apprenables par TOUS les Pokémon.
//
//  Forme : { id, num, name, type, kind, power|heal|guard|status|bonus,
//            emoji, desc, rarity }
//  - kind 'attack' | 'drain' → power (multiplicateur de dégâts)
//  - kind 'heal'             → heal  (% du barème de soin)
//  - kind 'guard'            → guard (multiplicateur de bouclier)
//  - kind 'buff'             → bonus (renfort de la prochaine attaque)
//  - kind 'status'           → status ∈ { burn, poison, paralyze, freeze }
// ─────────────────────────────────────────────────────────────────────────

const RAW = [
  // ── NORMAL — attaques + utilitaires apprenables par tous ──
  { name: 'Charge',          type: 'normal',   kind: 'attack', power: 1.6, emoji: '💢', desc: 'Coup franc.',                  rarity: 'common' },
  { name: 'Plaquage',        type: 'normal',   kind: 'attack', power: 2.4, emoji: '🤼', desc: 'Charge de tout son poids.',   rarity: 'uncommon' },
  { name: 'Hyper Voix',      type: 'normal',   kind: 'attack', power: 3.0, emoji: '📣', desc: 'Onde sonore puissante.',      rarity: 'rare' },
  { name: 'Ultralaser',      type: 'normal',   kind: 'attack', power: 4.0, emoji: '💫', desc: 'Rayon dévastateur ultime.',   rarity: 'epic' },
  { name: 'Damoclès',        type: 'normal',   kind: 'attack', power: 4.5, emoji: '☄️', desc: 'Charge suicidaire maximale.', rarity: 'epic' },
  // utilitaires Normal (apprenables par tous)
  { name: 'Soin',            type: 'normal',   kind: 'heal',   heal: 0.5,  emoji: '💗', desc: 'Soigne le Pokémon le plus faible.', rarity: 'uncommon' },
  { name: 'Repos',           type: 'normal',   kind: 'heal',   heal: 0.8,  emoji: '💤', desc: 'Gros soin du plus faible.',         rarity: 'rare' },
  { name: 'Vœu',            type: 'normal',   kind: 'heal',   heal: 1.1,  emoji: '🌠', desc: 'Soin majeur du plus faible.',       rarity: 'epic' },
  { name: 'Abri',            type: 'normal',   kind: 'guard',  guard: 1.2, emoji: '🛡️', desc: "Bouclier d'équipe.",               rarity: 'uncommon' },
  { name: 'Protection',      type: 'normal',   kind: 'guard',  guard: 1.6, emoji: '🪖', desc: 'Bon bouclier.',                     rarity: 'rare' },
  { name: 'Mur Lumière',     type: 'normal',   kind: 'guard',  guard: 2.0, emoji: '🧱', desc: 'Bouclier renforcé.',                rarity: 'epic' },
  { name: 'Affûtage',        type: 'normal',   kind: 'buff',   bonus: 0.6, emoji: '🔪', desc: 'Renforce la prochaine attaque.',    rarity: 'uncommon' },
  { name: 'Danse-Lames',     type: 'normal',   kind: 'buff',   bonus: 1.0, emoji: '⚔️', desc: 'Prochaine attaque +100%.',          rarity: 'rare' },
  { name: 'Plénitude',       type: 'normal',   kind: 'buff',   bonus: 1.4, emoji: '🧘', desc: 'Prochaine attaque ×2.4 !',          rarity: 'epic' },

  // ── FIRE ──
  { name: 'Flammèche',       type: 'fire',     kind: 'attack', power: 1.8, emoji: '🔥', desc: 'Petite flamme.',              rarity: 'common' },
  { name: 'Lance-Flammes',   type: 'fire',     kind: 'attack', power: 2.6, emoji: '🔥', desc: 'Jet de flammes.',             rarity: 'uncommon' },
  { name: 'Déflagration',    type: 'fire',     kind: 'attack', power: 3.4, emoji: '🌋', desc: 'Explosion de feu.',           rarity: 'rare' },
  { name: 'Boutefeu',        type: 'fire',     kind: 'attack', power: 4.2, emoji: '☄️', desc: 'Charge enflammée totale.',    rarity: 'epic' },
  { name: 'Feu Follet',      type: 'fire',     kind: 'status', status: 'burn', emoji: '👻', desc: "Brûle l'ennemi.",         rarity: 'uncommon' },

  // ── WATER ──
  { name: 'Pistolet à O',    type: 'water',    kind: 'attack', power: 1.8, emoji: '💧', desc: "Jet d'eau.",                  rarity: 'common' },
  { name: 'Surf',            type: 'water',    kind: 'attack', power: 2.6, emoji: '🌊', desc: 'Vague déferlante.',           rarity: 'uncommon' },
  { name: 'Hydrocanon',      type: 'water',    kind: 'attack', power: 3.4, emoji: '🚿', desc: 'Canon à eau surpuissant.',    rarity: 'rare' },
  { name: 'Hydroblast',      type: 'water',    kind: 'attack', power: 4.4, emoji: '🌀', desc: "Jet d'eau ultime.",           rarity: 'epic' },

  // ── ELECTRIC ──
  { name: 'Éclair',          type: 'electric', kind: 'attack', power: 1.8, emoji: '⚡', desc: 'Décharge rapide.',            rarity: 'common' },
  { name: 'Tonnerre',        type: 'electric', kind: 'attack', power: 2.6, emoji: '⚡', desc: 'Foudre électrique.',          rarity: 'uncommon' },
  { name: 'Fatal-Foudre',    type: 'electric', kind: 'attack', power: 3.4, emoji: '☄️', desc: 'Foudre dévastatrice.',        rarity: 'rare' },
  { name: 'Électacle',       type: 'electric', kind: 'attack', power: 4.0, emoji: '🌩️', desc: 'Charge électrique totale.',   rarity: 'epic' },
  { name: 'Cage-Éclair',     type: 'electric', kind: 'status', status: 'paralyze', emoji: '⚡', desc: "Paralyse l'ennemi.", rarity: 'uncommon' },

  // ── GRASS ──
  { name: 'Fouet Lianes',    type: 'grass',    kind: 'attack', power: 1.8, emoji: '🌿', desc: 'Fouet végétal.',             rarity: 'common' },
  { name: "Tranch'Herbe",    type: 'grass',    kind: 'attack', power: 2.5, emoji: '🍃', desc: 'Lames de feuilles.',         rarity: 'uncommon' },
  { name: 'Lance-Soleil',    type: 'grass',    kind: 'attack', power: 3.4, emoji: '☀️', desc: 'Charge solaire.',            rarity: 'rare' },
  { name: 'Giga-Sangsue',    type: 'grass',    kind: 'drain',  power: 2.4, heal: 0.6, emoji: '🌱', desc: 'Drain de PV (soigne le lanceur).', rarity: 'rare' },
  { name: 'Méga-Sangsue',    type: 'grass',    kind: 'drain',  power: 3.2, heal: 0.8, emoji: '🌳', desc: 'Drain massif (soigne le lanceur).', rarity: 'epic' },

  // ── ICE ──
  { name: 'Éclat Glace',     type: 'ice',      kind: 'attack', power: 1.8, emoji: '❄️', desc: 'Éclats glacés.',             rarity: 'common' },
  { name: 'Laser Glace',     type: 'ice',      kind: 'attack', power: 2.6, emoji: '❄️', desc: 'Rayon glacial.',             rarity: 'uncommon' },
  { name: 'Blizzard',        type: 'ice',      kind: 'attack', power: 3.6, emoji: '🌨️', desc: 'Tempête de glace.',          rarity: 'rare' },
  { name: 'Onde Glaciale',   type: 'ice',      kind: 'status', status: 'freeze', emoji: '🧊', desc: "Gèle l'ennemi.",       rarity: 'rare' },

  // ── FIGHTING ──
  { name: 'Balayage',        type: 'fighting', kind: 'attack', power: 1.8, emoji: '🦵', desc: 'Fauche les jambes.',         rarity: 'common' },
  { name: 'Poing Karaté',    type: 'fighting', kind: 'attack', power: 2.4, emoji: '👊', desc: 'Coup sec.',                  rarity: 'uncommon' },
  { name: 'Close Combat',    type: 'fighting', kind: 'attack', power: 3.4, emoji: '🥊', desc: 'Mêlée acharnée.',            rarity: 'rare' },
  { name: 'Dynamopoing',     type: 'fighting', kind: 'attack', power: 4.0, emoji: '💥', desc: 'Poing dévastateur.',         rarity: 'epic' },

  // ── POISON ──
  { name: 'Dard-Venin',      type: 'poison',   kind: 'attack', power: 1.8, emoji: '🐝', desc: 'Aiguillon toxique.',         rarity: 'common' },
  { name: 'Détritus',        type: 'poison',   kind: 'attack', power: 2.6, emoji: '🗑️', desc: 'Jet de déchets.',            rarity: 'uncommon' },
  { name: 'Bomb-Beurk',      type: 'poison',   kind: 'attack', power: 3.4, emoji: '🟣', desc: 'Bombe de boue toxique.',     rarity: 'rare' },
  { name: 'Toxik',           type: 'poison',   kind: 'status', status: 'poison', emoji: '☠️', desc: 'Empoisonne sévèrement.', rarity: 'uncommon' },

  // ── GROUND ──
  { name: 'Tunnel',          type: 'ground',   kind: 'attack', power: 2.0, emoji: '🕳️', desc: 'Frappe souterraine.',        rarity: 'common' },
  { name: 'Telluriforce',    type: 'ground',   kind: 'attack', power: 2.8, emoji: '⛰️', desc: 'Énergie tellurique.',        rarity: 'uncommon' },
  { name: 'Séisme',          type: 'ground',   kind: 'attack', power: 3.6, emoji: '🏔️', desc: 'Tremblement de terre.',      rarity: 'rare' },

  // ── FLYING ──
  { name: 'Cru-Aile',        type: 'flying',   kind: 'attack', power: 1.8, emoji: '🪶', desc: "Coup d'aile.",               rarity: 'common' },
  { name: 'Aéropique',       type: 'flying',   kind: 'attack', power: 2.6, emoji: '🦅', desc: 'Piqué aérien.',              rarity: 'uncommon' },
  { name: 'Rapace',          type: 'flying',   kind: 'attack', power: 3.4, emoji: '🦅', desc: 'Fonce sans pitié.',          rarity: 'rare' },
  { name: 'Ouragan',         type: 'flying',   kind: 'attack', power: 3.2, emoji: '🌪️', desc: 'Bourrasque violente.',       rarity: 'rare' },

  // ── PSYCHIC ──
  { name: 'Choc Mental',     type: 'psychic',  kind: 'attack', power: 1.8, emoji: '🌀', desc: 'Onde psychique.',            rarity: 'common' },
  { name: 'Extrasenseur',    type: 'psychic',  kind: 'attack', power: 2.6, emoji: '👁️', desc: 'Pouvoir extrasensoriel.',    rarity: 'uncommon' },
  { name: 'Psyko',           type: 'psychic',  kind: 'attack', power: 3.4, emoji: '🔮', desc: 'Attaque psychique majeure.', rarity: 'rare' },
  { name: 'Pouvoir Psy',     type: 'psychic',  kind: 'buff',   bonus: 1.2, emoji: '🪬', desc: 'Renforce fortement la prochaine attaque.', rarity: 'epic' },

  // ── BUG ──
  { name: 'Piqûre',          type: 'bug',      kind: 'attack', power: 1.6, emoji: '🐛', desc: 'Petite piqûre.',             rarity: 'common' },
  { name: 'Plaie-Croix',     type: 'bug',      kind: 'attack', power: 2.4, emoji: '✂️', desc: 'Tailles croisées.',          rarity: 'uncommon' },
  { name: 'Dard-Nuée',       type: 'bug',      kind: 'attack', power: 3.0, emoji: '🐝', desc: 'Nuée de dards.',             rarity: 'rare' },
  { name: 'Insecto-Disque',  type: 'bug',      kind: 'attack', power: 3.6, emoji: '🪲', desc: 'Disque incandescent.',       rarity: 'epic' },
  { name: 'Poudrex',         type: 'bug',      kind: 'status', status: 'paralyze', emoji: '🍄', desc: "Paralyse l'ennemi.", rarity: 'uncommon' },

  // ── ROCK ──
  { name: 'Jet-Pierres',     type: 'rock',     kind: 'attack', power: 1.8, emoji: '🪨', desc: 'Lance des pierres.',         rarity: 'common' },
  { name: 'Éboulement',      type: 'rock',     kind: 'attack', power: 2.8, emoji: '⛰️', desc: 'Avalanche de roches.',       rarity: 'uncommon' },
  { name: 'Lame de Roc',     type: 'rock',     kind: 'attack', power: 3.4, emoji: '🗿', desc: 'Lames de pierre acérées.',   rarity: 'rare' },

  // ── GHOST ──
  { name: 'Léchouille',      type: 'ghost',    kind: 'attack', power: 1.6, emoji: '👅', desc: 'Coup de langue spectral.',   rarity: 'common' },
  { name: 'Griffe Ombre',    type: 'ghost',    kind: 'attack', power: 2.4, emoji: '👻', desc: "Griffes de l'ombre.",        rarity: 'uncommon' },
  { name: "Ball'Ombre",      type: 'ghost',    kind: 'attack', power: 3.2, emoji: '🔮', desc: "Sphère d'ombre.",            rarity: 'rare' },
  { name: 'Spectre Fatal',   type: 'ghost',    kind: 'attack', power: 3.8, emoji: '👁️', desc: 'Attaque spectrale ultime.',  rarity: 'epic' },

  // ── DRAGON ──
  { name: 'Souffle Draco',   type: 'dragon',   kind: 'attack', power: 2.2, emoji: '🐉', desc: 'Souffle draconique.',        rarity: 'uncommon' },
  { name: 'Dracochoc',       type: 'dragon',   kind: 'attack', power: 3.0, emoji: '🐲', desc: 'Onde draconique.',           rarity: 'rare' },
  { name: 'Colère',          type: 'dragon',   kind: 'attack', power: 3.8, emoji: '😤', desc: 'Rage incontrôlable.',        rarity: 'epic' },
  { name: 'Draco-Météore',   type: 'dragon',   kind: 'attack', power: 4.4, emoji: '🌠', desc: 'Pluie de météores draconiques.', rarity: 'epic' },

  // ── DARK ──
  { name: 'Coup Bas',        type: 'dark',     kind: 'attack', power: 1.8, emoji: '🌑', desc: 'Frappe en traître.',         rarity: 'common' },
  { name: 'Mâchouille',      type: 'dark',     kind: 'attack', power: 2.6, emoji: '🦷', desc: 'Morsure puissante.',         rarity: 'uncommon' },
  { name: 'Vibrobscur',      type: 'dark',     kind: 'attack', power: 3.2, emoji: '🌚', desc: 'Onde ténébreuse.',           rarity: 'rare' },
  { name: 'Tricherie',       type: 'dark',     kind: 'attack', power: 3.8, emoji: '🃏', desc: 'Retourne la force ennemie.', rarity: 'epic' },

  // ── STEEL ──
  { name: 'Griffe Acier',    type: 'steel',    kind: 'attack', power: 2.0, emoji: '⚙️', desc: 'Griffes métalliques.',       rarity: 'common' },
  { name: 'Tête de Fer',     type: 'steel',    kind: 'attack', power: 2.8, emoji: '🔩', desc: 'Coup de tête blindé.',       rarity: 'uncommon' },
  { name: 'Luminocanon',     type: 'steel',    kind: 'attack', power: 3.6, emoji: '🔫', desc: 'Faisceau d\'acier.',         rarity: 'rare' },
  { name: 'Poing Météore',   type: 'steel',    kind: 'attack', power: 3.4, emoji: '🥊', desc: 'Poing chargé d\'acier.',     rarity: 'epic' },

  // ── FAIRY ──
  { name: 'Câlinerie',       type: 'fairy',    kind: 'attack', power: 1.8, emoji: '🩷', desc: 'Charme offensif.',           rarity: 'common' },
  { name: 'Éclat Magique',   type: 'fairy',    kind: 'attack', power: 2.6, emoji: '✨', desc: 'Rayon féerique.',            rarity: 'uncommon' },
  { name: 'Force Lunaire',   type: 'fairy',    kind: 'attack', power: 3.4, emoji: '🌙', desc: 'Puissance de la lune.',      rarity: 'rare' },
  { name: 'Grâce Féerique',  type: 'fairy',    kind: 'heal',   heal: 0.9, emoji: '🧚', desc: 'Gros soin du plus faible.',   rarity: 'epic' },
]

const RARITY_DROP_WEIGHT = { common: 24, uncommon: 12, rare: 5, epic: 1.5 }

export const CT_LIST = RAW.map((c, i) => ({
  id: `ct${String(i + 1).padStart(3, '0')}`,
  num: String(i + 1).padStart(2, '0'),
  rarity: 'common',
  ...c,
}))

export const CT_BY_ID = Object.fromEntries(CT_LIST.map(c => [c.id, c]))

// Compatibilité d'apprentissage : une CT Normal s'apprend par TOUS ; une CT
// typée exige que le Pokémon partage ce type.
export function canLearnCT(mon, ct) {
  if (!ct) return false
  if (ct.type === 'normal') return true
  return (mon?.types || []).includes(ct.type)
}

// Weighted pool for random drops, derived from each CT's rarity.
export const CT_DROP_POOL = CT_LIST.map(c => ({ id: c.id, w: RARITY_DROP_WEIGHT[c.rarity] || 8 }))

export function rollRandomCT() {
  const total = CT_DROP_POOL.reduce((s, e) => s + e.w, 0)
  let roll = Math.random() * total
  for (const e of CT_DROP_POOL) {
    roll -= e.w
    if (roll <= 0) return CT_BY_ID[e.id]
  }
  return CT_BY_ID[CT_DROP_POOL[0].id]
}
