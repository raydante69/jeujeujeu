// Run orchestrator. Owns the run lifecycle and walks the player through the
// node map, battles, catches, items, gyms, the Elite Four and the Champion.
import {
  state, save, saveNow, clearRun, markSeen, markCaught, unlockAchievement, addHallOfFame,
} from './state.js';
import { makeRng, randomSeed } from './rng.js';
import {
  makeInstance, recomputeStats, ensureUidAbove, speciesById, xpNeeded, ensureInstanceShape,
} from './data/pokemon.js';
import { canUpgradeMove } from './data/moves.js';
import {
  REGIONS, STARTER_IDS, gymLevel, eliteLevel, championLevel, wildLevelForLeg,
} from './data/regions.js';
import {
  wildEncounter, catchOptions, buildGymTeam, buildTrainerTeam, buildEliteTeam, buildChampionTeam,
} from './engine/encounters.js';
import { generateLeg } from './engine/mapgen.js';
import { simulateBattle } from './engine/battle.js';
import { computeTraits } from './data/traits.js';
import { aggregatePassives, ACTIVE_ITEMS, activeItemList } from './data/items.js';
import { pendingEvolution, evolveInto, EEVEE_OPTIONS } from './engine/evolution.js';
import { ASSETS, battleBgFor, leaderTrainer } from './assets.js';

import { showScreen, transition, setInRun, el } from './ui/screens.js';
import { openModal } from './ui/modals.js';
import { renderRegionSelect, renderTrainerSelect, renderStarterSelect, updateResumeButtons } from './ui/title.js';
import { renderMap } from './ui/map.js';
import { playBattle } from './ui/battle.js';
import { renderCatch, renderItem, renderSwap, renderBadge, pickTeamTarget } from './ui/choices.js';
import { renderElitePrep } from './ui/elite.js';
import { renderGameOver, renderWin } from './ui/endgame.js';
import { playEvolution, chooseEevee } from './ui/evo.js';
import { updateHud, flushToasts } from './ui/hud.js';
import { openPartyModal, openTmEvent } from './ui/party.js';

let rng = null;

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const region = () => REGIONS[state.run.regionId];
const run = () => state.run;

function persist() {
  if (state.run && rng) state.run.rngState = rng.state;
  save();
}
function restoreRng() {
  rng = makeRng(state.run.seed);
  rng.state = state.run.rngState;
}

// ---- entry points --------------------------------------------------------
export function goTitle() {
  setInRun(false);
  updateResumeButtons(state.run);
  showScreen('title-screen');
}

export function startStory() {
  renderRegionSelect({ onPick: newStoryRun });
}

function newStoryRun(regionId, variant) {
  const seed = randomSeed();
  rng = makeRng(seed);
  state.meta.stats.runs++;
  state.run = {
    mode: 'story', variant, regionId, seed, rngState: seed,
    trainer: null, team: [], bag: { items: {}, passives: [] }, badges: [],
    legIndex: 0, map: null, nodeId: null, cleared: [], phase: 'trainer',
    eliteIndex: 0, fallen: [], cycle: 1, startedAt: Date.now(),
  };
  persist();
  renderTrainerSelect({ onPick: chooseTrainer });
}

function chooseTrainer(trainer) {
  state.run.trainer = trainer;
  state.run.phase = 'starter';
  persist();
  renderStarterSelect(STARTER_IDS, { onPick: chooseStarter });
}

async function chooseStarter(id) {
  const r = run();
  const starter = makeInstance(id, region().startLevel);
  r.team = [starter];
  markCaught(id);
  r.legIndex = 0;
  r.map = generateLeg(rng, 0, region().gyms[0]);
  r.cleared = [];
  r.nodeId = r.map.startId;
  r.phase = 'map';
  persist();
  setInRun(true);
  await transition('Pallet Town', 'Your adventure begins!', 1000);
  backToMap();
}

export function resumeStory() {
  if (!state.run) return;
  restoreRng();
  ensureUidAbove(maxUid());
  const r = run();
  migrateRun(r);
  if (r.phase === 'trainer') { renderTrainerSelect({ onPick: chooseTrainer }); return; }
  if (r.phase === 'starter') { renderStarterSelect(STARTER_IDS, { onPick: chooseStarter }); return; }
  if (r.phase === 'won') { showWin(r); return; }
  setInRun(true);
  if (r.phase === 'elite') { nextElite(); return; }
  if (r.phase === 'champion') { fightChampion(); return; }
  backToMap();
}

function maxUid() {
  let m = 0;
  for (const x of state.run.team || []) if (x.uid > m) m = x.uid;
  return m;
}

// ---- map traversal -------------------------------------------------------
function backToMap() {
  setInRun(true);
  updateResumeButtons(state.run);
  renderMap(run(), { onNode: enterNode });
  showScreen('map-screen');
  updateHud(run());
  flushToasts();
}

function completeNode(node) {
  const r = run();
  if (!r.cleared.includes(node.id)) r.cleared.push(node.id);
  r.nodeId = node.id;
  persist();
  backToMap();
}

async function enterNode(nodeId) {
  const node = run().map.nodes[nodeId];
  switch (node.type) {
    case 'wild': return doWild(node);
    case 'trainer': return doTrainer(node);
    case 'item': return doItem(node);
    case 'catch': return doCatch(node);
    case 'rest': return doRest(node);
    case 'tm': return doTm(node);
    case 'gym': return doGym(node);
    default: return completeNode(node);
  }
}

const cycleBonus = () => (run().cycle - 1) * 14; // New Game+ level scaling
const legTier = () => Math.min(0.95, run().legIndex / region().gyms.length + 0.1);
const wildLevel = () => wildLevelForLeg(region(), run().legIndex, rng) + cycleBonus();

async function doWild(node) {
  const enemy = wildEncounter(rng, legTier(), wildLevel());
  markSeen(enemy.id);
  await battleAndResolve([enemy], { title: 'Wild Battle!', enemyLabel: 'Wild', bg: ASSETS.battle.grass, enemyTrainer: null }, node);
}

async function doTrainer(node) {
  const lvl = Math.max(2, gymLevel(region(), run().legIndex) - rng.int(2, 6)) + cycleBonus();
  const team = buildTrainerTeam(rng, lvl, legTier());
  team.forEach((e) => markSeen(e.id));
  await battleAndResolve(team, { title: 'Trainer Battle!', enemyLabel: 'Trainer', bg: ASSETS.battle.grass, enemyTrainer: leaderTrainer(run().legIndex) }, node);
}

async function doCatch(node) {
  const opts = catchOptions(rng, legTier(), Math.max(2, wildLevel()), 3);
  opts.forEach((o) => markSeen(o.id));
  const picked = await renderCatch(opts, run().team);
  if (picked) {
    const bonus = aggregatePassives(run().bag.passives).catchLevel || 0;
    if (bonus) { picked.level += bonus; recomputeStats(picked); picked.hp = picked.maxHp; }
    markCaught(picked.id);
    if (run().team.length < 6) {
      run().team.push(picked);
    } else {
      const idx = await renderSwap(picked, run().team);
      if (idx != null) run().team[idx] = picked;
    }
  }
  completeNode(node);
}

async function doItem(node) {
  const choices = rng.sample(activeItemList(), 3);
  const chosen = await renderItem(choices, run().team);
  if (chosen) {
    const bag = run().bag.items;
    bag[chosen.id] = (bag[chosen.id] || 0) + 1; // stored in the bag for later
  }
  completeNode(node);
}

async function doRest(node) {
  run().team.forEach((m) => { m.hp = m.maxHp; m.fainted = false; });
  await transition('Pokémon Center', 'Your team is fully healed!', 900);
  completeNode(node);
}

async function doTm(node) {
  const chosen = await openTmEvent(run().team);
  if (chosen && canUpgradeMove(chosen.move)) {
    chosen.move.level++;
    persist();
  }
  completeNode(node);
}

async function doGym(node) {
  const gym = node.gym;
  const lvl = gymLevel(region(), run().legIndex) + cycleBonus();
  const team = buildGymTeam(rng, gym, lvl);
  team.forEach((e) => markSeen(e.id));
  const gymTrainer = leaderTrainer(run().legIndex);
  await renderElitePrep({
    run: run(), enemyTeam: team,
    title: `${gym.leader}'s Gym`, subtitle: `${cap(gym.type)} type · Lv ~${lvl}`,
    enemyName: gym.leader, enemyTrainer: gymTrainer, bg: battleBgFor(gym.type),
  });
  await battleAndResolve(team, { title: `${gym.leader} — ${cap(gym.type)} Gym`, enemyLabel: gym.leader, bg: battleBgFor(gym.type), enemyTrainer: gymTrainer }, node, {
    onWin: async () => {
      run().badges.push(gym.badge);
      unlockAchievement('first-badge');
      if (run().variant === 'nuzlocke') unlockAchievement('nuzlocke');
      if (run().badges.length >= 8) unlockAchievement('all-badges');
      await renderBadge(gym, run().badges.length);
      await advanceLeg();
    },
  });
}

async function advanceLeg() {
  const r = run();
  r.legIndex++;
  if (r.legIndex < region().gyms.length) {
    r.map = generateLeg(rng, r.legIndex, region().gyms[r.legIndex]);
    r.cleared = [];
    r.nodeId = r.map.startId;
    persist();
    await transition(`Route ${r.legIndex + 1}`, region().gyms[r.legIndex].town, 1000);
    backToMap();
  } else {
    await startElite();
  }
}

// ---- battle resolution ---------------------------------------------------
async function battleAndResolve(enemyTeam, ctx, node, opts = {}) {
  const r = run();
  const playerTraits = computeTraits(r.team);
  const enemyTraits = computeTraits(enemyTeam);
  const playerMods = aggregatePassives(r.bag.passives);
  const result = simulateBattle(r.team, enemyTeam, { rng, playerTraits, enemyTraits, playerMods });
  persist();

  await playBattle({ run: r, enemyTeam, result, ctx, playerTraits, enemyTraits });
  applyPlayerFinal(result.playerFinal);

  if (result.winner !== 'player') { gameOver(); return false; }

  state.meta.stats.battlesWon++;
  unlockAchievement('first-win');

  // Nuzlocke: fainted Pokémon are released for good.
  if (r.variant === 'nuzlocke') {
    r.team.filter((m) => m.hp <= 0).forEach((m) => r.fallen.push({ id: m.id, level: m.level, name: m.name }));
    r.team = r.team.filter((m) => m.hp > 0);
  }
  applyPostHeal();
  await awardXpAndEvolve(enemyTeam);
  persist();

  if (opts.onWin) await opts.onWin();
  else completeNode(node);
  return true;
}

function applyPlayerFinal(playerFinal) {
  const byUid = new Map(playerFinal.map((p) => [p.uid, p]));
  for (const inst of run().team) {
    const f = byUid.get(inst.uid);
    if (f) { inst.hp = f.hp; inst.fainted = f.fainted; }
  }
}

function applyPostHeal() {
  const mods = aggregatePassives(run().bag.passives);
  if (mods.postHeal > 0) {
    run().team.forEach((m) => { if (m.hp > 0) m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * mods.postHeal)); });
  }
}

async function awardXpAndEvolve(enemyTeam) {
  const r = run();
  const mult = aggregatePassives(r.bag.passives).xp || 1;
  const pool = enemyTeam.reduce((s, e) => s + e.level, 0) * 8 * mult;
  const leveled = [];
  for (const inst of r.team) {
    if (inst.hp <= 0) continue;
    inst.xp = (inst.xp || 0) + pool;
    let did = false;
    while (inst.xp >= xpNeeded(inst.level) && inst.level < 100) {
      inst.xp -= xpNeeded(inst.level);
      inst.level++;
      recomputeStats(inst);
      did = true;
    }
    if (did) leveled.push(inst);
  }
  // Resolve evolutions one at a time (with overlay).
  for (const inst of leveled) {
    let target = pendingEvolution(inst);
    while (target) {
      const choice = target === 'eevee' ? await chooseEevee(EEVEE_OPTIONS) : target;
      await doEvolve(inst, choice);
      target = pendingEvolution(inst);
    }
  }
}

async function doEvolve(inst, targetId) {
  const fromSp = speciesById(inst.id);
  const fromName = inst.name;
  const fromSprite = inst.shiny ? fromSp.sprites.shiny : fromSp.sprites.front;
  const info = evolveInto(inst, targetId);
  const toSp = speciesById(targetId);
  const toSprite = inst.shiny ? toSp.sprites.shiny : toSp.sprites.front;
  markCaught(targetId);
  unlockAchievement('evolve');
  await playEvolution(fromName, fromSprite, info.toName, toSprite);
}

// ---- items ---------------------------------------------------------------
// Apply a bag item to a target Pokémon. Returns true if it actually did
// something (so the caller can consume the item). Called from the party screen.
async function applyItemToTarget(item, target) {
  if (item.scope === 'team') {
    if (item.kind === 'healFull') run().team.forEach((m) => { m.hp = m.maxHp; m.fainted = false; });
    return true;
  }
  if (!target) return false;
  switch (item.kind) {
    case 'heal':
      if (target.hp <= 0 || target.hp >= target.maxHp) return false;
      target.hp = Math.min(target.maxHp, target.hp + Math.round(target.maxHp * item.power));
      return true;
    case 'healFull':
      if (target.hp >= target.maxHp) return false;
      target.hp = target.maxHp; target.fainted = false; return true;
    case 'revive':
      if (target.hp > 0) return false;
      target.hp = Math.round(target.maxHp * item.power); target.fainted = false; return true;
    case 'level': {
      target.level = Math.min(100, target.level + item.power);
      recomputeStats(target);
      target.hp = target.maxHp;
      let t = pendingEvolution(target);
      while (t) { const c = t === 'eevee' ? await chooseEevee(EEVEE_OPTIONS) : t; await doEvolve(target, c); t = pendingEvolution(target); }
      return true;
    }
    case 'stat': {
      target.bonus = target.bonus || {};
      target.bonus[item.stat] = (target.bonus[item.stat] || 0) + item.power;
      const beforeMax = target.maxHp;
      recomputeStats(target);
      if (item.stat === 'hp') target.hp += target.maxHp - beforeMax;
      return true;
    }
  }
  return false;
}

// Open the party manager (stats, level/XP, move, reorder, use items).
export function openParty() {
  if (!state.run) return;
  openPartyModal(run(), {
    onChange: () => { persist(); updateHud(run()); },
    applyItem: async (item, target) => {
      const ok = await applyItemToTarget(item, target);
      if (ok) { persist(); updateHud(run()); }
      return ok;
    },
  });
}

// ---- Elite Four / Champion ----------------------------------------------
async function startElite() {
  run().phase = 'elite';
  run().eliteIndex = 0;
  persist();
  await transition('Pokémon League', 'The Elite Four await!', 1200);
  await nextElite();
}

async function nextElite() {
  const r = run();
  if (r.eliteIndex >= region().elite.length) { await fightChampion(); return; }
  const e = region().elite[r.eliteIndex];
  const lvl = eliteLevel(region(), r.eliteIndex) + cycleBonus();
  const team = buildEliteTeam(rng, e, lvl);
  team.forEach((x) => markSeen(x.id));
  const eTrainer = leaderTrainer(4 + r.eliteIndex);
  await renderElitePrep({
    run: r, enemyTeam: team,
    title: `Elite Four · ${e.name}`, subtitle: `${cap(e.type)} · Lv ~${lvl}`, enemyName: e.name,
    enemyTrainer: eTrainer, bg: battleBgFor(e.type),
  });
  await battleAndResolve(team, { title: `${e.name} — Elite Four`, enemyLabel: e.name, bg: battleBgFor(e.type), enemyTrainer: eTrainer }, null, {
    onWin: async () => { run().eliteIndex++; persist(); await nextElite(); },
  });
}

async function fightChampion() {
  run().phase = 'champion';
  persist();
  const lvl = championLevel() + cycleBonus();
  const team = buildChampionTeam(rng, lvl);
  team.forEach((x) => markSeen(x.id));
  await renderElitePrep({
    run: run(), enemyTeam: team,
    title: `Champion ${region().champion.name}`, subtitle: `Lv ~${lvl}`, enemyName: region().champion.name,
    enemyTrainer: ASSETS.trainers.champion, bg: ASSETS.battle.city,
  });
  await battleAndResolve(team, { title: `Champion ${region().champion.name}`, enemyLabel: 'Champion', bg: ASSETS.battle.city, enemyTrainer: ASSETS.trainers.champion }, null, {
    onWin: async () => winRun(),
  });
}

function winRun() {
  const r = state.run;
  state.meta.stats.wins++;
  state.meta.storyRunCount++;
  unlockAchievement('champion');
  addHallOfFame({
    region: r.regionId, variant: r.variant, date: Date.now(), cycle: r.cycle || 1,
    team: r.team.map((m) => ({ id: m.id, level: m.level, shiny: m.shiny })),
  });
  r.phase = 'won'; // keep the run so New Game+ can continue it
  persist();
  showWin(r);
}

function showWin(r) {
  setInRun(false);
  updateResumeButtons(state.run);
  renderWin(r, {
    runCount: state.meta.storyRunCount, cycle: r.cycle || 1,
    onPlayAgain: () => { clearRun(); startStory(); },
    onNewGamePlus: () => newGamePlus(),
  });
  flushToasts();
}

// Continue past the Champion into a tougher cycle, keeping the team, items,
// levels and move levels. Badges reset; enemy levels scale up (cycleBonus).
async function newGamePlus() {
  if (!rng) restoreRng();
  const r = state.run;
  r.cycle = (r.cycle || 1) + 1;
  r.badges = [];
  r.legIndex = 0;
  r.eliteIndex = 0;
  r.phase = 'map';
  r.team.forEach((m) => { m.hp = m.maxHp; m.fainted = false; });
  r.map = generateLeg(rng, 0, region().gyms[0]);
  r.cleared = [];
  r.nodeId = r.map.startId;
  persist();
  setInRun(true);
  await transition('New Game+', `Cycle ${r.cycle} — the gyms return, tougher than ever!`, 1500);
  backToMap();
}

// Backfill fields when resuming a run saved by an older version.
function migrateRun(r) {
  if (r.cycle == null) r.cycle = 1;
  if (!r.bag) r.bag = { items: {}, passives: [] };
  if (Array.isArray(r.bag.items) || !r.bag.items) r.bag.items = {};
  if (!r.bag.passives) r.bag.passives = [];
  (r.team || []).forEach(ensureInstanceShape);
}

function gameOver() {
  const finished = state.run;
  clearRun();
  setInRun(false);
  updateResumeButtons(null);
  renderGameOver(finished, { onRetry: () => startStory(), onMenu: () => goTitle() });
  flushToasts();
}

// ---- misc controls -------------------------------------------------------
export function openMap() {
  if (state.run && state.run.map) backToMap();
}

export function resetRun() {
  clearRun();
  rng = null;
  goTitle();
}

export function comingSoon(label) {
  openModal(label, el('div', { className: 'prose muted' },
    el('p', {}, `${label} is coming in a future update. For now, dive into Story mode!`)));
}
