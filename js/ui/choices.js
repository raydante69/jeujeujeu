// Choice screens: catch, item pickup, passive pickup, team swap and the badge
// award. Each returns a promise that resolves with the player's decision.
import { $, el, clear, showScreen } from './screens.js';
import { monCard, teamSlot, spriteImg, typeBadges, itemIcon } from './render.js';
import { sfx } from '../audio.js';

function teamStrip(host, team) {
  clear(host);
  team.forEach((inst) => host.appendChild(teamSlot(inst)));
}

export function renderCatch(options, team) {
  return new Promise((resolve) => {
    const host = $('#catch-choices');
    clear(host);
    options.forEach((inst) => {
      host.appendChild(monCard(inst, {
        onClick: () => { sfx('catch'); resolve(inst); },
      }));
    });
    teamStrip($('#catch-team-bar'), team);
    $('#btn-skip-catch').onclick = () => resolve(null);
    showScreen('catch-screen');
  });
}

export function renderItem(items, team) {
  return new Promise((resolve) => {
    const host = $('#item-choices');
    clear(host);
    items.forEach((item) => host.appendChild(itemCard(item, () => { sfx('select'); resolve(item); })));
    teamStrip($('#item-team-bar'), team);
    $('#btn-skip-item').onclick = () => resolve(null);
    showScreen('item-screen');
  });
}

export function renderPassive(passives, team) {
  return new Promise((resolve) => {
    const host = $('#passive-choices');
    clear(host);
    passives.forEach((p) => host.appendChild(itemCard(p, () => { sfx('select'); resolve(p); }, true)));
    teamStrip($('#passive-team-bar'), team);
    showScreen('passive-screen');
  });
}

function itemCard(item, onClick, passive = false) {
  return el('div', { className: 'item-card clickable' + (passive ? ' item-card--passive' : ''), onClick },
    el('div', { className: 'item-card-icon' }, itemIcon(item)),
    el('div', { className: 'item-card-name' }, item.name),
    el('div', { className: 'item-card-desc' }, item.desc),
    item.tier ? el('div', { className: 'item-card-tier' }, '★'.repeat(item.tier)) : null,
  );
}

// Team full: pick a member to release in favour of `incoming`, or keep team.
export function renderSwap(incoming, team) {
  return new Promise((resolve) => {
    $('#swap-prompt').textContent = `Replace a Pokémon with ${incoming.name}?`;
    const host = $('#swap-choices');
    clear(host);
    team.forEach((inst, i) => {
      host.appendChild(monCard(inst, { className: 'swap-out', onClick: () => resolve(i) }));
    });
    const inc = $('#swap-incoming');
    clear(inc);
    inc.appendChild(el('div', { className: 'swap-incoming-label' }, 'Incoming'));
    inc.appendChild(monCard(incoming, { stats: true }));
    $('#btn-cancel-swap').onclick = () => resolve(null);
    showScreen('swap-screen');
  });
}

// Generic team-target picker (item application), rendered as a modal overlay.
export function pickTeamTarget(team, { title, desc, filter } = {}) {
  return new Promise((resolve) => {
    const eligible = team.filter((m) => (filter ? filter(m) : true));
    const overlay = el('div', { className: 'picker-overlay' },
      el('div', { className: 'picker-box' },
        el('h3', { className: 'picker-title' }, title || 'Choose a Pokémon'),
        desc ? el('p', { className: 'picker-desc' }, desc) : null,
        el('div', { className: 'picker-grid' },
          ...eligible.map((inst) => monCard(inst, {
            onClick: () => { cleanup(); resolve(inst); },
          }))),
        el('button', { className: 'btn-secondary btn-md', onClick: () => { cleanup(); resolve(null); } }, 'Cancel'),
      ));
    function cleanup() { overlay.remove(); }
    document.body.appendChild(overlay);
  });
}

export function renderBadge(badge, count) {
  return new Promise((resolve) => {
    sfx('badge');
    $('#badge-desc').textContent = `You defeated ${badge.leader} and earned the ${badge.badge} Badge!`;
    const img = $('#badge-icon-img');
    img.replaceWith(badgeIcon(badge, img.id));
    $('#badge-count-display').textContent = `${count} / 8 badges`;
    $('#btn-next-map').onclick = () => resolve();
    showScreen('badge-screen');
  });
}

function badgeIcon(badge, id) {
  // Original-art placeholder: a coloured gem labelled with the badge initial.
  return el('div', { id, className: 'badge-earn-icon badge-gem' }, '🎖️');
}
