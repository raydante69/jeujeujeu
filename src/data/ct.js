export const CT_LIST = [
  { id: 'ct01', num: '01', name: 'Mégapoing',    type: 'normal',   kind: 'attack', power: 2.0, emoji: '👊', desc: 'Coup de poing dévastateur.' },
  { id: 'ct06', num: '06', name: 'Toxik',         type: 'poison',   kind: 'status', status: 'poison', emoji: '☠️', desc: 'Empoisonne sévèrement l\'ennemi.' },
  { id: 'ct13', num: '13', name: 'Laser Glace',   type: 'ice',      kind: 'attack', power: 2.5, emoji: '❄️', desc: 'Rayon glacial.' },
  { id: 'ct14', num: '14', name: 'Blizzard',      type: 'ice',      kind: 'attack', power: 3.0, emoji: '🌨️', desc: 'Tempête de glace.' },
  { id: 'ct15', num: '15', name: 'Ultralaser',    type: 'normal',   kind: 'attack', power: 4.0, emoji: '💫', desc: 'Rayon dévastateur ultime.' },
  { id: 'ct22', num: '22', name: 'Lance-Soleil',  type: 'grass',    kind: 'attack', power: 3.0, emoji: '☀️', desc: 'Charge solaire puissante.' },
  { id: 'ct24', num: '24', name: 'Tonnerre',      type: 'electric', kind: 'attack', power: 2.5, emoji: '⚡', desc: 'Foudre électrique.' },
  { id: 'ct25', num: '25', name: 'Fatal-Foudre',  type: 'electric', kind: 'attack', power: 3.0, emoji: '☄️', desc: 'Foudre garantie.' },
  { id: 'ct26', num: '26', name: 'Séisme',        type: 'ground',   kind: 'attack', power: 3.0, emoji: '🏔️', desc: 'Tremblement de terre.' },
  { id: 'ct29', num: '29', name: 'Psyko',         type: 'psychic',  kind: 'attack', power: 2.5, emoji: '🔮', desc: 'Attaque psychique puissante.' },
  { id: 'ct35', num: '35', name: 'Lance-Flammes', type: 'fire',     kind: 'attack', power: 2.5, emoji: '🔥', desc: 'Jet de flammes.' },
  { id: 'ct38', num: '38', name: 'Déflagration',  type: 'fire',     kind: 'attack', power: 3.0, emoji: '🌋', desc: 'Explosion de feu.' },
  { id: 'ct44', num: '44', name: 'Repos',         type: 'normal',   kind: 'heal',   heal: 1.0,  emoji: '💤', desc: 'Soin complet de l\'équipe.' },
  { id: 'ct50', num: '50', name: 'Surf',          type: 'water',    kind: 'attack', power: 2.5, emoji: '🌊', desc: 'Vague déferlante.' },
  { id: 'ct52', num: '52', name: 'Explosion',     type: 'normal',   kind: 'attack', power: 5.0, emoji: '💥', desc: 'Explosion maximale.' },
  { id: 'ct53', num: '53', name: 'Éclate-Roc',   type: 'rock',     kind: 'attack', power: 2.0, emoji: '🪨', desc: 'Brise les défenses ennemies.' },
  { id: 'ct56', num: '56', name: 'Jackpot',       type: 'normal',   kind: 'buff',   bonus: 0.8, emoji: '🎰', desc: 'Renforce la prochaine attaque.' },
  { id: 'ct70', num: '70', name: 'Poudrex',       type: 'bug',      kind: 'status', status: 'paralyze', emoji: '🐛', desc: 'Paralyse l\'ennemi.' },
  { id: 'ct79', num: '79', name: 'Amnésie',       type: 'psychic',  kind: 'guard',  guard: 40,  emoji: '🫧', desc: 'Crée un bouclier de 40 PV.' },
  { id: 'ct99', num: '99', name: 'Hydroblast',    type: 'water',    kind: 'attack', power: 4.5, emoji: '🌀', desc: 'Jet d\'eau ultime.' },
]

export const CT_BY_ID = Object.fromEntries(CT_LIST.map(c => [c.id, c]))

// Weighted pool for random drops (rarer CTs have lower weight)
export const CT_DROP_POOL = [
  { id: 'ct01', w: 20 }, { id: 'ct06', w: 15 }, { id: 'ct13', w: 12 },
  { id: 'ct22', w: 12 }, { id: 'ct24', w: 12 }, { id: 'ct35', w: 12 },
  { id: 'ct50', w: 12 }, { id: 'ct53', w: 15 }, { id: 'ct56', w: 10 },
  { id: 'ct70', w: 10 }, { id: 'ct79', w: 8 },  { id: 'ct29', w: 8 },
  { id: 'ct14', w: 6 },  { id: 'ct25', w: 6 },  { id: 'ct26', w: 6 },
  { id: 'ct38', w: 5 },  { id: 'ct44', w: 5 },  { id: 'ct99', w: 3 },
  { id: 'ct15', w: 2 },  { id: 'ct52', w: 2 },
]

export function rollRandomCT() {
  const total = CT_DROP_POOL.reduce((s, e) => s + e.w, 0)
  let roll = Math.random() * total
  for (const e of CT_DROP_POOL) {
    roll -= e.w
    if (roll <= 0) return CT_BY_ID[e.id]
  }
  return CT_BY_ID[CT_DROP_POOL[0].id]
}
