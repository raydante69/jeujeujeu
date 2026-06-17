// Auto-battler resolver. Both teams fight automatically; the active Pokémon on
// each side trade hits in speed order, the fainted one is replaced by the next
// in line, until a side is wiped. Returns an event log the UI replays (and Skip
// fast-forwards), plus the winner. Player instance HP carries over after battle.
import { effectiveness, bestEffectiveness } from '../data/types.js';
import { traitAtkMult } from '../data/traits.js';

const BASE_POWER = 60;
const MAX_TURNS = 300;

function toBattleMon(inst) {
  return {
    ref: inst,
    uid: inst.uid,
    name: inst.name,
    level: inst.level,
    types: inst.types,
    shiny: inst.shiny,
    id: inst.id,
    atk: inst.stats.atk,
    def: inst.stats.def,
    spa: inst.stats.spa,
    spd: inst.stats.spd,
    spe: inst.stats.spe,
    hp: inst.hp,
    maxHp: inst.maxHp,
    fainted: inst.hp <= 0,
  };
}

// Pick the attacker type that hits the defender hardest (always STAB).
function chooseMoveType(attacker, defender) {
  let best = attacker.types[0];
  let bestEff = -1;
  for (const t of attacker.types) {
    const eff = effectiveness(t, defender.types);
    if (eff > bestEff) { bestEff = eff; best = t; }
  }
  return best;
}

function computeDamage(attacker, defender, traits, sideMods, defMods, rng) {
  const moveType = chooseMoveType(attacker, defender);
  const physical = attacker.atk >= attacker.spa;
  const atkStat = physical ? attacker.atk : attacker.spa;
  const defStat = physical ? defender.def : defender.spd;
  const eff = effectiveness(moveType, defender.types);
  if (eff === 0) return { moveType, eff, damage: 0 };

  let dmg = Math.floor(((2 * attacker.level / 5 + 2) * BASE_POWER * (atkStat / Math.max(1, defStat))) / 50 + 2);
  const stab = 1.5;
  const variance = 0.85 + rng.next() * 0.15;
  dmg *= stab * eff * variance * traitAtkMult(traits, moveType) * sideMods.damage * defMods.taken;
  dmg = Math.max(1, Math.round(dmg));
  return { moveType, eff, damage: dmg };
}

function firstAlive(team, from = 0) {
  for (let i = from; i < team.length; i++) if (!team[i].fainted) return i;
  return -1;
}

export function simulateBattle(playerTeam, enemyTeam, opts = {}) {
  const rng = opts.rng;
  const pMods = opts.playerMods || { damage: 1, taken: 1, speed: 1, lifesteal: 0 };
  const eMods = { damage: 1, taken: 1, speed: 1, lifesteal: 0 };
  const pTraits = opts.playerTraits || {};
  const eTraits = opts.enemyTraits || {};

  const P = playerTeam.map(toBattleMon);
  const E = enemyTeam.map(toBattleMon);
  const log = [];
  log.push({ type: 'intro' });

  let pi = firstAlive(P);
  let ei = firstAlive(E);
  log.push({ type: 'switch', side: 'player', uid: P[pi].uid });
  log.push({ type: 'switch', side: 'enemy', uid: E[ei].uid });

  let turn = 0;
  while (pi !== -1 && ei !== -1 && turn++ < MAX_TURNS) {
    const a = P[pi];
    const b = E[ei];
    // Speed order (with player's speed passive).
    const pSpeed = a.spe * pMods.speed;
    const eSpeed = b.spe;
    const order = pSpeed === eSpeed
      ? (rng.chance(0.5) ? ['p', 'e'] : ['e', 'p'])
      : (pSpeed > eSpeed ? ['p', 'e'] : ['e', 'p']);

    for (const who of order) {
      if (a.fainted || b.fainted) break;
      if (who === 'p') {
        const r = computeDamage(a, b, pTraits, pMods, eMods, rng);
        b.hp = Math.max(0, b.hp - r.damage);
        if (pMods.lifesteal) a.hp = Math.min(a.maxHp, a.hp + Math.round(r.damage * pMods.lifesteal));
        log.push({ type: 'attack', side: 'player', attackerUid: a.uid, defenderUid: b.uid, moveType: r.moveType, eff: r.eff, damage: r.damage, defenderHp: b.hp, attackerHp: a.hp });
        if (b.hp <= 0) { b.fainted = true; log.push({ type: 'faint', side: 'enemy', uid: b.uid }); }
      } else {
        const r = computeDamage(b, a, eTraits, eMods, pMods, rng);
        a.hp = Math.max(0, a.hp - r.damage);
        log.push({ type: 'attack', side: 'enemy', attackerUid: b.uid, defenderUid: a.uid, moveType: r.moveType, eff: r.eff, damage: r.damage, defenderHp: a.hp, attackerHp: b.hp });
        if (a.hp <= 0) { a.fainted = true; log.push({ type: 'faint', side: 'player', uid: a.uid }); }
      }
    }

    if (a.fainted) {
      pi = firstAlive(P);
      if (pi !== -1) log.push({ type: 'switch', side: 'player', uid: P[pi].uid });
    }
    if (b.fainted) {
      ei = firstAlive(E);
      if (ei !== -1) log.push({ type: 'switch', side: 'enemy', uid: E[ei].uid });
    }
  }

  // Resolve winner (turn cap → most remaining HP fraction wins).
  let winner;
  if (pi === -1) winner = 'enemy';
  else if (ei === -1) winner = 'player';
  else {
    const frac = (team) => team.reduce((s, m) => s + m.hp / m.maxHp, 0);
    winner = frac(P) >= frac(E) ? 'player' : 'enemy';
  }
  log.push({ type: 'end', winner });

  // Final player HP/faint state — applied by the controller AFTER the UI has
  // finished replaying the log (so bars can animate from pre-battle values).
  const playerFinal = P.map((m) => ({ uid: m.uid, hp: m.hp, fainted: m.hp <= 0 }));

  return { log, winner, playerFinal, playerSurvivors: P.filter((m) => !m.fainted).length };
}
