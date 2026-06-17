// Menu modals: Pokédex, Achievements, Settings, Patch Notes, Credits, Hall of
// Fame, the mobile App Menu and a placeholder Poké Mart. Opened via globals
// wired in main.js.
import { $, el, clear } from './screens.js';
import { state, getSetting, setSetting, isSeen, isCaught, resetAll } from '../state.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { allSpecies, speciesById } from '../data/pokemon.js';
import { typeBadges, POKEBALL_URI } from './render.js';
import { setLang, t } from '../i18n.js';
import { sfx } from '../audio.js';

let openOverlay = null;

export function openModal(title, content, opts = {}) {
  closeModal();
  const box = el('div', { className: 'modal-box' + (opts.wide ? ' modal-wide' : '') },
    el('div', { className: 'modal-head' },
      el('h2', { className: 'modal-title' }, title),
      el('button', { className: 'modal-close', 'aria-label': 'Close', onClick: closeModal }, '✕'),
    ),
    el('div', { className: 'modal-body' }, content),
  );
  const overlay = el('div', { className: 'modal-overlay', onClick: (e) => { if (e.target === overlay) closeModal(); } }, box);
  document.body.appendChild(overlay);
  openOverlay = overlay;
  document.addEventListener('keydown', escClose);
  sfx('select');
  return overlay;
}

function escClose(e) { if (e.key === 'Escape') closeModal(); }
export function closeModal() {
  if (openOverlay) { openOverlay.remove(); openOverlay = null; }
  document.removeEventListener('keydown', escClose);
}

// ---- Pokédex -------------------------------------------------------------
export function openPokedexModal() {
  const seen = state.meta.pokedexSeen.length;
  const caught = state.meta.pokedexCaught.length;
  const grid = el('div', { className: 'dex-grid' });
  allSpecies().forEach((sp) => {
    const s = isSeen(sp.id), c = isCaught(sp.id);
    const cell = el('div', { className: 'dex-cell' + (c ? ' caught' : s ? ' seen' : ' unseen') },
      el('span', { className: 'dex-id' }, '#' + String(sp.id).padStart(3, '0')),
      el('img', { className: 'dex-sprite', src: s ? sp.sprites.front : POKEBALL_URI, alt: s ? sp.name : '???' }),
      el('span', { className: 'dex-name' }, s ? sp.name : '???'),
    );
    grid.appendChild(cell);
  });
  const content = el('div', {},
    el('div', { className: 'dex-summary' }, `Seen ${seen}/151 · Caught ${caught}/151`),
    grid,
  );
  openModal('Pokédex', content, { wide: true });
}

// ---- Achievements --------------------------------------------------------
export function openAchievementsModal() {
  const list = el('div', { className: 'ach-list' });
  ACHIEVEMENTS.forEach((a) => {
    const got = state.meta.achievements.includes(a.id);
    list.appendChild(el('div', { className: 'ach-row' + (got ? ' got' : ' locked') },
      el('span', { className: 'ach-icon' }, got ? a.icon : '🔒'),
      el('div', {},
        el('div', { className: 'ach-name' }, a.name),
        el('div', { className: 'ach-desc' }, a.desc)),
    ));
  });
  const got = state.meta.achievements.length;
  openModal('Achievements', el('div', {},
    el('div', { className: 'dex-summary' }, `${got}/${ACHIEVEMENTS.length} unlocked`), list));
}

// ---- Settings ------------------------------------------------------------
export function openSettingsModal() {
  const langSel = el('select', { className: 'set-input', onChange: (e) => { setLang(e.target.value); } },
    el('option', { value: 'en', selected: getSetting('lang') === 'en' }, 'English'),
    el('option', { value: 'fr', selected: getSetting('lang') === 'fr' }, 'Français'),
  );
  const content = el('div', { className: 'settings' },
    settingRow('Language', langSel),
    settingRow('Sound effects', toggle('sfx')),
    settingRow('Music', toggle('music')),
    settingRow('Reduced motion', toggle('reducedMotion')),
    el('hr', { className: 'set-sep' }),
    el('button', {
      className: 'btn-secondary btn-md run-menu-btn--reset',
      onClick: () => {
        if (confirm('Erase ALL progress (Pokédex, achievements, current run)? This cannot be undone.')) {
          resetAll();
          location.reload();
        }
      },
    }, 'Erase all data'),
  );
  openModal('Settings', content);
}

function settingRow(label, control) {
  return el('label', { className: 'set-row' }, el('span', { className: 'set-label' }, label), control);
}
function toggle(key) {
  const input = el('input', { type: 'checkbox', className: 'set-check', checked: !!getSetting(key) });
  input.addEventListener('change', () => setSetting(key, input.checked));
  return input;
}

// ---- Patch notes / credits ----------------------------------------------
export function openPatchNotesModal() {
  const content = el('div', { className: 'prose' },
    el('h3', {}, 'v2.0'),
    el('ul', {},
      el('li', {}, 'Story mode: full Kanto run — 8 gyms, Elite Four and Champion.'),
      el('li', {}, 'Auto-battler with type traits, evolutions and shinies.'),
      el('li', {}, 'Branching node maps, catching, items and passive items.'),
      el('li', {}, 'Pokédex, achievements and local save.'),
    ),
    el('p', { className: 'muted' }, 'Battle Tower and Challenges are coming soon.'),
  );
  openModal('Patch Notes', content);
}

export function openCreditsModal() {
  const content = el('div', { className: 'prose' },
    el('p', {}, 'A fan-made Pokémon roguelike, rebuilt as an open project.'),
    el('p', {}, 'Pokémon data and sprites courtesy of ', link('PokeAPI', 'https://pokeapi.co'), '.'),
    el('p', {}, 'Font: ', link('Press Start 2P', 'https://fonts.google.com/specimen/Press+Start+2P'), '.'),
    el('p', { className: 'muted' }, 'Not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, or The Pokémon Company. All Pokémon names and sprites are property of their respective owners.'),
  );
  openModal('Credits', content);
}

function link(text, href) {
  return el('a', { href, target: '_blank', rel: 'noopener noreferrer', className: 'prose-link' }, text);
}

// ---- Hall of Fame --------------------------------------------------------
export function openHallOfFameModal() {
  const entries = state.meta.hallOfFame || [];
  let content;
  if (!entries.length) {
    content = el('div', { className: 'prose muted' }, 'Defeat the Elite Four to enter the Hall of Fame.');
  } else {
    content = el('div', { className: 'hof-list' });
    entries.forEach((e) => {
      content.appendChild(el('div', { className: 'hof-entry' },
        el('div', { className: 'hof-meta' }, `${cap(e.region)} · ${cap(e.variant)} · ${new Date(e.date).toLocaleDateString()}`),
        el('div', { className: 'hof-team' }, ...e.team.map((m) => {
          const sp = speciesById(m.id);
          return el('div', { className: 'hof-mon' },
            el('img', { className: 'poke-sprite', src: sp.sprites.front, alt: sp.name }),
            el('span', {}, `L${m.level}`));
        })),
      ));
    });
  }
  openModal('Hall of Fame', content, { wide: true });
}

// ---- Mobile app menu + Poké Mart ----------------------------------------
export function openAppMenuModal() {
  const item = (label, fn) => el('button', { className: 'btn-primary btn-md app-menu-item', onClick: () => { closeModal(); fn(); } }, label);
  const content = el('div', { className: 'app-menu' },
    item('Pokédex', openPokedexModal),
    item('Achievements', openAchievementsModal),
    item('Hall of Fame', openHallOfFameModal),
    item('Patch Notes', openPatchNotesModal),
    item('Settings', openSettingsModal),
    item('Credits', openCreditsModal),
  );
  openModal('Menu', content);
}

export function openShopModal() {
  openModal('Poké Mart', el('div', { className: 'prose muted' },
    el('p', {}, 'The Poké Mart opens between runs in a future update.')));
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
