// Elite-prep screen: shown before gym/Elite/Champion fights. The player can
// reorder their team (click-to-swap, also drag) before committing to FIGHT.
import { $, el, clear, showScreen } from './screens.js';
import { spriteImg, hpBar, trainerSprite } from './render.js';
import { computeTraits } from '../data/traits.js';
import { typeColor } from '../data/types.js';
import { PASSIVE_ITEMS } from '../data/items.js';
import { sfx } from '../audio.js';

export function renderElitePrep({ run, enemyTeam, title, subtitle, enemyName, enemyTrainer }) {
  return new Promise((resolve) => {
    $('#elite-prep-title').textContent = title || 'Get Ready!';
    $('#elite-prep-sub').textContent = subtitle || '';
    $('#elite-prep-enemy-name').textContent = enemyName || 'Opponent';

    // Bag (passive items).
    const bag = $('#elite-prep-items');
    clear(bag);
    const passives = run.bag.passives || [];
    if (!passives.length) bag.appendChild(el('span', { className: 'hud-empty' }, '—'));
    passives.forEach((id) => {
      const p = PASSIVE_ITEMS[id];
      if (p) bag.appendChild(el('span', { className: 'passive-chip', title: `${p.name} — ${p.desc}` }, p.icon));
    });

    $('#elite-prep-player-trainer').replaceChildren(trainerSprite(run.trainer, 'player'));
    $('#elite-prep-enemy-trainer').replaceChildren(trainerSprite(enemyTrainer || 'enemy', 'enemy'));
    traitBar('#elite-prep-player-traits', computeTraits(run.team));
    traitBar('#elite-prep-enemy-traits', computeTraits(enemyTeam));

    let selected = -1;
    function renderPlayer() {
      const host = $('#elite-prep-player-side');
      clear(host);
      run.team.forEach((inst, i) => {
        const slot = prepSlot(inst, i === selected);
        slot.draggable = true;
        slot.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', i); });
        slot.addEventListener('dragover', (e) => e.preventDefault());
        slot.addEventListener('drop', (e) => {
          e.preventDefault();
          const from = +e.dataTransfer.getData('text/plain');
          swap(from, i);
        });
        slot.addEventListener('click', () => {
          if (selected === -1) { selected = i; renderPlayer(); }
          else if (selected === i) { selected = -1; renderPlayer(); }
          else { swap(selected, i); }
        });
        host.appendChild(slot);
      });
    }
    function swap(a, b) {
      if (a !== b) {
        [run.team[a], run.team[b]] = [run.team[b], run.team[a]];
        sfx('select');
      }
      selected = -1;
      renderPlayer();
    }
    renderPlayer();

    const enemyHost = $('#elite-prep-enemy-side');
    clear(enemyHost);
    enemyTeam.forEach((inst) => enemyHost.appendChild(prepSlot(inst, false)));

    $('#btn-elite-prep-continue').onclick = () => resolve();
    showScreen('elite-prep-screen');
  });
}

function prepSlot(inst, selected) {
  return el('div', {
    className: 'prep-slot' + (selected ? ' selected' : '') + (inst.hp <= 0 ? ' fainted' : ''),
    dataset: { uid: inst.uid },
    title: `${inst.name} · Lv ${inst.level} · HP ${inst.hp}/${inst.maxHp}`,
  },
    inst.shiny ? el('span', { className: 'shiny-star' }, '★') : null,
    spriteImg(inst, { className: 'prep-slot-sprite' }),
    el('span', { className: 'prep-slot-lv' }, 'L' + inst.level),
    hpBar(inst),
  );
}

function traitBar(sel, traits) {
  const host = $(sel);
  if (!host) return;
  clear(host);
  Object.entries(traits).forEach(([type, t]) => {
    host.appendChild(el('span', {
      className: 'trait-chip', style: { background: typeColor(type) },
      title: `${type} ${t.tierLabel}`,
    }, `${type.slice(0, 3).toUpperCase()} ${t.tierLabel}`));
  });
}
