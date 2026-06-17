// In-run HUD: team bar, item / passive bars, badge counters and the map header,
// plus achievement toasts. Reads the live run object.
import { $, el, clear } from './screens.js';
import { teamSlot, itemIcon } from './render.js';
import { drainToasts } from '../state.js';
import { PASSIVE_ITEMS } from '../data/items.js';

export function updateHud(run) {
  if (!run) return;
  renderTeamBar(run);
  renderItemBar(run);
  renderBadges(run);
  renderMapInfo(run);
}

function renderTeamBar(run) {
  const bar = $('#team-bar');
  if (!bar) return;
  clear(bar);
  run.team.forEach((inst) => bar.appendChild(teamSlot(inst)));
}

function renderItemBar(run) {
  const bar = $('#item-bar');
  if (bar) {
    clear(bar);
    const items = run.bag.items || [];
    if (!items.length) bar.appendChild(el('span', { className: 'hud-empty' }, '—'));
    else items.forEach((it) => bar.appendChild(el('span', { className: 'item-chip', title: it.name }, it.icon || '🎁')));
  }

  const passLabel = $('#map-passives-label');
  const passBar = $('#passive-badges');
  if (passBar) {
    clear(passBar);
    const passives = run.bag.passives || [];
    if (passLabel) passLabel.style.display = passives.length ? '' : 'none';
    passives.forEach((id) => {
      const p = PASSIVE_ITEMS[id];
      if (p) passBar.appendChild(el('span', { className: 'passive-chip', title: `${p.name} — ${p.desc}` }, itemIcon(p)));
    });
  }
}

function renderBadges(run) {
  const count = run.badges.length;
  const txt = `${count}/8`;
  const top = $('#badge-count');
  if (top) top.textContent = '🎖️ ' + txt;
  const panel = $('#badge-count-panel');
  if (panel) {
    clear(panel);
    for (let i = 0; i < 8; i++) {
      panel.appendChild(el('span', {
        className: 'badge-dot' + (i < count ? ' earned' : ''),
        title: run.badges[i] || 'Locked',
      }, i < count ? '🎖️' : '·'));
    }
  }
}

function renderMapInfo(run) {
  const info = $('#map-info');
  if (!info) return;
  const region = run.regionId ? run.regionId[0].toUpperCase() + run.regionId.slice(1) : '';
  const leg = run.phase === 'elite' ? 'Elite Four'
    : run.phase === 'champion' ? 'Champion'
    : `Route ${run.legIndex + 1}`;
  info.textContent = `${region} · ${leg}`;
}

// Drain queued achievement unlocks into transient toasts.
export function flushToasts() {
  const toasts = drainToasts();
  if (!toasts.length) return;
  let host = $('#toast-host');
  if (!host) {
    host = el('div', { id: 'toast-host' });
    document.body.appendChild(host);
  }
  toasts.forEach((a, i) => {
    const toast = el('div', { className: 'toast' },
      el('span', { className: 'toast-icon' }, a.icon),
      el('div', {},
        el('div', { className: 'toast-title' }, 'Achievement!'),
        el('div', { className: 'toast-name' }, a.name)),
    );
    host.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 30 + i * 120);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3200 + i * 120);
  });
}
