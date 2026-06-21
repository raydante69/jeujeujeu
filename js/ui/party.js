// Party manager modal: view each Pokémon's stats, level + XP bar and signature
// move, reorder the team, and use stored items. Also hosts the TM event picker.
import { $, el, clear } from './screens.js';
import { spriteImg, typeBadges, itemIcon } from './render.js';
import { xpNeeded } from '../data/pokemon.js';
import { canUpgradeMove, MOVE_MAX_LEVEL } from '../data/moves.js';
import { ACTIVE_ITEMS } from '../data/items.js';
import { typeColor } from '../data/types.js';
import { sfx } from '../audio.js';

let overlay = null;
function close() { if (overlay) { overlay.remove(); overlay = null; document.removeEventListener('keydown', onEsc); } }
function onEsc(e) { if (e.key === 'Escape') close(); }

function statGrid(inst) {
  const s = inst.stats;
  const rows = [['HP', s.hp], ['ATK', s.atk], ['DEF', s.def], ['SpA', s.spa], ['SpD', s.spd], ['SPE', s.spe]];
  return el('div', { className: 'pp-stats' }, ...rows.map(([k, v]) =>
    el('span', { className: 'pp-stat' }, el('b', {}, k), ' ', String(v))));
}

function xpBar(inst) {
  const need = xpNeeded(inst.level);
  const frac = Math.max(0, Math.min(1, (inst.xp || 0) / need));
  return el('div', { className: 'pp-xp' },
    el('span', { className: 'pp-xp-label' }, `Lv ${inst.level}`),
    el('span', { className: 'pp-xp-bar' }, el('span', { className: 'pp-xp-fill', style: { width: (frac * 100) + '%' } })),
    el('span', { className: 'pp-xp-num' }, `${Math.floor(inst.xp || 0)}/${need}`));
}

function moveRow(inst) {
  const m = inst.move;
  if (!m) return null;
  return el('div', { className: 'pp-move', title: `${m.name} (${m.type})` },
    el('span', { className: 'pp-move-type', style: { background: typeColor(m.type) } }, m.type.slice(0, 3).toUpperCase()),
    el('span', { className: 'pp-move-name' }, m.name),
    el('span', { className: 'pp-move-lv' }, `Lv ${m.level}/${MOVE_MAX_LEVEL}`));
}

// Full party manager. callbacks: onChange() after edits; applyItem(item,target)->bool.
export function openPartyModal(run, { onChange, applyItem } = {}) {
  close();
  let pendingItem = null; // item id awaiting a target

  function rerender() { body.replaceChildren(buildBody()); }
  function commit() { onChange && onChange(); rerender(); }

  function buildBody() {
    const list = el('div', { className: 'pp-list' });
    run.team.forEach((inst, i) => {
      const usable = pendingItem != null;
      const card = el('div', { className: 'pp-card' + (usable ? ' pp-targetable' : '') },
        el('div', { className: 'pp-portrait' + (inst.hp <= 0 ? ' fainted' : '') },
          inst.shiny ? el('span', { className: 'shiny-star' }, '★') : null,
          spriteImg(inst, { className: 'pp-sprite' })),
        el('div', { className: 'pp-info' },
          el('div', { className: 'pp-name-row' },
            el('span', { className: 'pp-name' }, inst.name),
            typeBadges(inst.types)),
          xpBar(inst),
          el('div', { className: 'pp-hp-row' }, `HP ${Math.max(0, inst.hp)}/${inst.maxHp}`),
          statGrid(inst),
          moveRow(inst)),
        el('div', { className: 'pp-reorder' },
          el('button', { className: 'pp-arrow', disabled: i === 0, onClick: () => { swap(i, i - 1); } }, '▲'),
          el('button', { className: 'pp-arrow', disabled: i === run.team.length - 1, onClick: () => { swap(i, i + 1); } }, '▼')),
      );
      if (usable) card.addEventListener('click', (e) => { if (e.target.closest('.pp-reorder')) return; useOn(inst); });
      list.appendChild(card);
    });

    // Bag
    const items = run.bag.items || {};
    const ids = Object.keys(items).filter((id) => items[id] > 0);
    const bag = el('div', { className: 'pp-bag' },
      el('div', { className: 'pp-bag-title' }, pendingItem ? `Using ${ACTIVE_ITEMS[pendingItem].name} — tap a Pokémon` : 'Bag'),
      ids.length
        ? el('div', { className: 'pp-bag-grid' }, ...ids.map((id) => {
          const it = ACTIVE_ITEMS[id];
          return el('button', { className: 'pp-item' + (pendingItem === id ? ' active' : ''), title: it.desc, onClick: () => { pendingItem = pendingItem === id ? null : id; rerender(); } },
            itemIcon(it), el('span', { className: 'pp-item-name' }, it.name), el('span', { className: 'pp-item-ct' }, '×' + items[id]));
        }))
        : el('div', { className: 'pp-bag-empty muted' }, 'No items yet — find them on the map.'),
      pendingItem ? el('button', { className: 'btn-secondary btn-sm', onClick: () => { pendingItem = null; rerender(); } }, 'Cancel') : null,
    );

    return el('div', {}, list, bag);
  }

  function swap(a, b) {
    if (b < 0 || b >= run.team.length) return;
    [run.team[a], run.team[b]] = [run.team[b], run.team[a]];
    sfx('select');
    commit();
  }

  async function useOn(inst) {
    const item = ACTIVE_ITEMS[pendingItem];
    const ok = applyItem ? await applyItem(item, inst) : false;
    if (ok) {
      run.bag.items[item.id] = Math.max(0, (run.bag.items[item.id] || 1) - 1);
      sfx('catch');
    }
    pendingItem = null;
    commit();
  }

  const body = el('div', { className: 'modal-body pp-body' }, buildBody());
  const box = el('div', { className: 'modal-box modal-wide' },
    el('div', { className: 'modal-head' },
      el('h2', { className: 'modal-title' }, 'Team'),
      el('button', { className: 'modal-close', 'aria-label': 'Close', onClick: close }, '✕')),
    body);
  overlay = el('div', { className: 'modal-overlay', onClick: (e) => { if (e.target === overlay) close(); } }, box);
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onEsc);
}

// TM event: choose a Pokémon to raise its move level. Resolves with the chosen
// instance (already upgraded by the caller) or null if skipped.
export function openTmEvent(team) {
  return new Promise((resolve) => {
    let ov;
    const done = (inst) => { ov.remove(); resolve(inst); };
    const list = el('div', { className: 'pp-tm-list' },
      ...team.map((inst) => {
        const maxed = !canUpgradeMove(inst.move);
        const card = el('button', { className: 'pp-tm-card' + (maxed ? ' maxed' : ''), disabled: maxed, onClick: () => { sfx('badge'); done(inst); } },
          spriteImg(inst, { className: 'pp-sprite' }),
          el('div', {},
            el('div', { className: 'pp-name' }, inst.name),
            moveRow(inst),
            maxed ? el('div', { className: 'muted', style: { fontSize: '7px' } }, 'Move maxed') : el('div', { className: 'pp-tm-up' }, `→ Lv ${inst.move.level + 1}`)),
        );
        return card;
      }));
    const box = el('div', { className: 'modal-box modal-wide' },
      el('div', { className: 'modal-head' },
        el('h2', { className: 'modal-title' }, '💿 TM Found!'),
        el('button', { className: 'modal-close', onClick: () => done(null) }, '✕')),
      el('div', { className: 'modal-body' },
        el('p', { className: 'pp-tm-intro' }, 'Choose a Pokémon to raise the level of its move.'),
        list,
        el('div', { style: { textAlign: 'center', marginTop: '12px' } },
          el('button', { className: 'btn-secondary btn-md', onClick: () => done(null) }, 'Skip'))),
    );
    ov = el('div', { className: 'modal-overlay' }, box);
    document.body.appendChild(ov);
  });
}
