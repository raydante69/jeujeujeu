// Central game state + persistence. Holds `meta` (persists across runs: Pokédex,
// achievements, settings, Hall of Fame, lifetime stats) and `run` (the current
// run, or null). Orchestration lives in game.js; this module is the store.
import { achievementById } from './data/achievements.js';

const SAVE_KEY = 'pokelike.save.v1';

const DEFAULT_META = () => ({
  pokedexSeen: [],
  pokedexCaught: [],
  achievements: [],
  settings: { lang: 'en', sfx: true, music: false, reducedMotion: false },
  stats: { runs: 0, wins: 0, catches: 0, battlesWon: 0 },
  hallOfFame: [],
  storyRunCount: 0,
});

export const state = {
  meta: DEFAULT_META(),
  run: null,
};

// Achievement toast queue, drained by the UI.
const toastQueue = [];
export function drainToasts() {
  return toastQueue.splice(0, toastQueue.length);
}

// ---- persistence ---------------------------------------------------------
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.meta) state.meta = Object.assign(DEFAULT_META(), data.meta, {
      settings: Object.assign(DEFAULT_META().settings, data.meta.settings || {}),
      stats: Object.assign(DEFAULT_META().stats, data.meta.stats || {}),
    });
    state.run = data.run || null;
  } catch (e) {
    console.warn('Failed to load save:', e);
  }
}

let saveTimer = null;
export function save() {
  // Debounce writes so rapid state changes coalesce.
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ meta: state.meta, run: state.run }));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }, 120);
}
export function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meta: state.meta, run: state.run }));
  } catch (e) { console.warn('Failed to save:', e); }
}

export function clearRun() {
  state.run = null;
  saveNow();
}
export function hasRun() {
  return !!state.run;
}

// ---- Pokédex -------------------------------------------------------------
export function markSeen(id) {
  if (!state.meta.pokedexSeen.includes(id)) {
    state.meta.pokedexSeen.push(id);
    const n = state.meta.pokedexSeen.length;
    if (n >= 50) unlockAchievement('pokedex-50');
    if (n >= 151) unlockAchievement('pokedex-151');
    save();
  }
}
export function markCaught(id) {
  markSeen(id);
  if (!state.meta.pokedexCaught.includes(id)) {
    state.meta.pokedexCaught.push(id);
  }
  state.meta.stats.catches++;
  if (state.meta.stats.catches >= 10) unlockAchievement('catch-10');
  save();
}
export function isSeen(id) { return state.meta.pokedexSeen.includes(id); }
export function isCaught(id) { return state.meta.pokedexCaught.includes(id); }

// ---- achievements --------------------------------------------------------
export function unlockAchievement(id) {
  if (state.meta.achievements.includes(id)) return false;
  if (!achievementById(id)) return false;
  state.meta.achievements.push(id);
  toastQueue.push(achievementById(id));
  save();
  return true;
}
export function hasAchievement(id) { return state.meta.achievements.includes(id); }

// ---- settings ------------------------------------------------------------
export function getSetting(key) { return state.meta.settings[key]; }
export function setSetting(key, val) { state.meta.settings[key] = val; save(); }

// ---- Hall of Fame --------------------------------------------------------
export function addHallOfFame(entry) {
  state.meta.hallOfFame.unshift(entry);
  if (state.meta.hallOfFame.length > 20) state.meta.hallOfFame.length = 20;
  save();
}

export function resetAll() {
  state.meta = DEFAULT_META();
  state.run = null;
  saveNow();
}
