// Shared render helpers: sprites (with CDN-failure fallback), type badges, HP
// bars and team slots. Used across every in-run screen.
import { el } from './screens.js';
import { spriteFront, spriteBack } from '../data/pokemon.js';
import { typeColor } from '../data/types.js';
import { ASSETS, playerTrainer, itemSprite } from '../assets.js';

// Inline pokéball used when a sprite fails to load from the CDN.
export const POKEBALL_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
   <circle cx="32" cy="32" r="30" fill="#f0f0f0" stroke="#202020" stroke-width="3"/>
   <path d="M2 32a30 30 0 0 1 60 0z" fill="#e83418" stroke="#202020" stroke-width="3"/>
   <line x1="2" y1="32" x2="62" y2="32" stroke="#202020" stroke-width="4"/>
   <circle cx="32" cy="32" r="9" fill="#fff" stroke="#202020" stroke-width="3"/>
   <circle cx="32" cy="32" r="4" fill="#d0d0d0" stroke="#202020" stroke-width="2"/></svg>`);

export function spriteImg(inst, opts = {}) {
  const src = opts.back ? spriteBack(inst) : spriteFront(inst);
  const img = el('img', {
    className: 'poke-sprite' + (opts.className ? ' ' + opts.className : ''),
    src,
    alt: inst.name,
    loading: 'lazy',
    draggable: false,
  });
  img.addEventListener('error', () => { img.src = POKEBALL_URI; }, { once: true });
  return img;
}

export function typeBadge(type) {
  return el('span', {
    className: 'type-badge',
    style: { background: typeColor(type) },
    title: type,
  }, type.toUpperCase());
}

export function typeBadges(types) {
  return el('span', { className: 'type-badges' }, ...types.map(typeBadge));
}

export function hpFraction(inst) {
  return Math.max(0, Math.min(1, inst.hp / inst.maxHp));
}

export function hpBar(inst) {
  const frac = hpFraction(inst);
  const fill = el('span', { className: 'hp-fill' });
  fill.style.width = (frac * 100) + '%';
  fill.dataset.hp = hpClass(frac);
  return el('span', { className: 'hp-bar' }, fill);
}

export function hpClass(frac) {
  if (frac <= 0.25) return 'low';
  if (frac <= 0.5) return 'mid';
  return 'ok';
}

// A team-bar slot (sprite + level + hp). Used on the map HUD and choice screens.
export function teamSlot(inst, opts = {}) {
  const slot = el('div', {
    className: 'team-slot' + (inst.fainted || inst.hp <= 0 ? ' fainted' : '') + (opts.active ? ' active' : ''),
    dataset: { uid: inst.uid },
    title: `${inst.name} · Lv ${inst.level}`,
  },
    inst.shiny ? el('span', { className: 'shiny-star' }, '★') : null,
    spriteImg(inst, { className: 'team-slot-sprite' }),
    el('span', { className: 'team-slot-lv' }, 'L' + inst.level),
    hpBar(inst),
  );
  if (opts.onClick) {
    slot.classList.add('clickable');
    slot.addEventListener('click', () => opts.onClick(inst));
  }
  return slot;
}

// Bigger card for catch / item-target choices.
export function monCard(inst, opts = {}) {
  const card = el('div', { className: 'mon-card' + (opts.className ? ' ' + opts.className : '') },
    inst.shiny ? el('span', { className: 'shiny-star big' }, '★ shiny') : null,
    spriteImg(inst, { className: 'mon-card-sprite' }),
    el('div', { className: 'mon-card-name' }, inst.name),
    el('div', { className: 'mon-card-lv' }, 'Lv ' + inst.level),
    typeBadges(inst.types),
    opts.stats === false ? null : statLine(inst),
  );
  if (opts.onClick) {
    card.classList.add('clickable');
    card.addEventListener('click', () => opts.onClick(inst));
  }
  return card;
}

function statLine(inst) {
  const s = inst.stats;
  return el('div', { className: 'mon-card-stats' },
    `HP ${s.hp} · ATK ${s.atk} · DEF ${s.def} · SPE ${s.spe}`);
}

// Trainer sprite (pixel-art image). Accepts a direct asset URL, or a player
// kind ('boy'/'girl'/'champion'); anything else falls back to a generic NPC.
export function trainerSprite(kind, side = 'player') {
  let url;
  if (typeof kind === 'string' && kind.includes('/')) url = kind;
  else if (kind === 'boy' || kind === 'girl' || kind === 'champion') url = playerTrainer(kind);
  else url = ASSETS.trainers.leaders[0];
  const img = el('img', { className: `trainer-sprite trainer-${side}`, src: url, alt: '', draggable: false });
  return img;
}

// Item / passive icon as the open PokeAPI sprite, with an emoji fallback.
export function itemIcon(item, cls = '') {
  if (!item || !item.slug) return el('span', { className: 'item-icon-emoji ' + cls }, (item && item.icon) || '🎁');
  const img = el('img', { className: 'item-icon-img ' + cls, src: itemSprite(item.slug), alt: item.name, draggable: false });
  img.addEventListener('error', () => { img.replaceWith(el('span', { className: 'item-icon-emoji ' + cls }, item.icon || '🎁')); }, { once: true });
  return img;
}
