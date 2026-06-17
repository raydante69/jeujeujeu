// Bootstrap: load data + save, wire the title screen and global menu actions,
// apply translations, then show the title.
import { loadPokemonData } from './data/pokemon.js';
import { load as loadSave, state } from './state.js';
import { applyI18n } from './i18n.js';
import { $, $$ } from './ui/screens.js';
import {
  goTitle, startStory, resumeStory, resetRun, openMap, comingSoon,
} from './game.js';
import {
  openPokedexModal, openAchievementsModal, openSettingsModal, openPatchNotesModal,
  openCreditsModal, openHallOfFameModal, openAppMenuModal, openShopModal, openModal,
} from './ui/modals.js';
import { el } from './ui/screens.js';

async function boot() {
  loadSave();
  document.documentElement.lang = state.meta.settings.lang || 'en';
  try {
    await loadPokemonData();
  } catch (e) {
    document.body.innerHTML = '<div style="color:#fff;font:14px system-ui;padding:40px;text-align:center">Failed to load Pokémon data.<br>Run <code>node tools/fetch-pokemon.mjs</code> and serve the folder over HTTP.</div>';
    console.error(e);
    return;
  }
  applyI18n();
  wireTitle();
  wireMenus();
  exposeGlobals();
  goTitle();
}

function wireTitle() {
  $('#btn-history-run').addEventListener('click', startStory);
  $('#btn-continue-run').addEventListener('click', resumeStory);
  $('#btn-endless-run').addEventListener('click', () => comingSoon('Battle Tower'));
  $('#btn-challenges-run').addEventListener('click', () => comingSoon('Challenges'));
  $('#btn-continue-endless').addEventListener('click', () => comingSoon('Battle Tower'));
  $('#btn-continue-challenge').addEventListener('click', () => comingSoon('Challenges'));
}

function wireMenus() {
  // Sidebar / mobile-bar toggle.
  const toggle = $('#run-menu-toggle');
  const bar = $('#run-menu-bar');
  if (toggle && bar) {
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('run-menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  // Account / cloud-sync buttons are stubbed in v1.
  $$('.run-menu-btn--account').forEach((b) => b.addEventListener('click', cloudStub));
  const cloud = $('#btn-cloud-sync');
  if (cloud) cloud.addEventListener('click', cloudStub);
}

function cloudStub() {
  openModal('Login / Signup', el('div', { className: 'prose muted' },
    el('p', {}, 'Cloud save and accounts are coming soon. Your progress is saved locally on this device in the meantime.')));
}

// Inline onclick handlers in index.html call these globals.
function exposeGlobals() {
  Object.assign(window, {
    openPokedexModal, openAchievementsModal, openSettingsModal, openPatchNotesModal,
    openCreditsModal, openHallOfFameModal, openAppMenuModal, openShopModal,
    goHomeFromMenu: () => { document.body.classList.remove('run-menu-open'); goTitle(); },
    confirmResetRun: () => { if (confirm('End the current run and return to the title?')) resetRun(); },
    showLeagueModal: openMap,
    toggleFullscreen,
    shareRun,
    showEndlessStageSelect: () => comingSoon('Battle Tower'),
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

async function shareRun() {
  const text = 'I just became the Champion in Pokelike — a fan-made Pokémon roguelike!';
  try {
    if (navigator.share) await navigator.share({ title: 'Pokelike', text, url: location.href });
    else { await navigator.clipboard.writeText(`${text} ${location.href}`); openModal('Shared', el('div', { className: 'prose' }, el('p', {}, 'Link copied to clipboard!'))); }
  } catch { /* user cancelled */ }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
