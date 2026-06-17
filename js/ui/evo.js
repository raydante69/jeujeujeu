// Evolution overlay + the Eevee branch chooser.
import { $, el, clear } from './screens.js';
import { speciesById } from '../data/pokemon.js';
import { getSetting } from '../state.js';
import { sfx } from '../audio.js';

function reduced() { return !!getSetting('reducedMotion'); }

// Animate inst's sprite morphing into the target species. Caller has already
// mutated the instance (or will after); we just play the flourish.
export function playEvolution(fromName, fromSprite, toName, toSprite) {
  return new Promise((resolve) => {
    const overlay = $('#evo-overlay');
    const msg = $('#evo-msg');
    const sprite = $('#evo-sprite');
    overlay.style.display = 'flex';
    msg.textContent = `What? ${fromName} is evolving!`;
    sprite.src = fromSprite;
    sprite.classList.remove('evo-flash');

    const fast = reduced();
    const t1 = fast ? 200 : 1100;
    const t2 = fast ? 100 : 900;
    sfx('select');
    setTimeout(() => {
      sprite.classList.add('evo-flash');
      let toggle = false;
      const blink = setInterval(() => {
        toggle = !toggle;
        sprite.src = toggle ? toSprite : fromSprite;
      }, fast ? 60 : 140);
      setTimeout(() => {
        clearInterval(blink);
        sprite.src = toSprite;
        sprite.classList.remove('evo-flash');
        msg.textContent = `${fromName} evolved into ${toName}!`;
        sfx('badge');
        setTimeout(() => { overlay.style.display = 'none'; resolve(); }, fast ? 250 : 1200);
      }, t2);
    }, t1);
  });
}

export function chooseEevee(optionIds) {
  return new Promise((resolve) => {
    const overlay = $('#eevee-choice-overlay');
    const host = $('#eevee-choices');
    clear(host);
    optionIds.forEach((id) => {
      const sp = speciesById(id);
      const card = el('div', { className: 'eevee-choice clickable' },
        el('img', { className: 'poke-sprite', src: sp.sprites.front, alt: sp.name }),
        el('div', { className: 'eevee-choice-name' }, sp.name),
      );
      card.addEventListener('click', () => { overlay.style.display = 'none'; resolve(id); });
      host.appendChild(card);
    });
    overlay.style.display = 'flex';
  });
}
