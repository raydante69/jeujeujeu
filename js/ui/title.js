// Pre-run screens: Story region select (with Classic/Nuzlocke toggle), trainer
// select and starter select. Also toggles the title-screen "Resume" buttons.
import { $, el, clear, showScreen } from './screens.js';
import { REGIONS } from '../data/regions.js';
import { speciesById } from '../data/pokemon.js';
import { typeBadges } from './render.js';
import { sfx } from '../audio.js';

export function updateResumeButtons(run) {
  const story = $('#btn-continue-run');
  if (story) story.style.display = run && run.mode === 'story' ? '' : 'none';
}

export function renderRegionSelect({ onPick }) {
  let variant = 'classic';
  const classicBtn = $('#btn-history-classic');
  const nuzBtn = $('#btn-history-nuzlocke');
  function setVariant(v) {
    variant = v;
    classicBtn.classList.toggle('history-mode-btn--selected', v === 'classic');
    nuzBtn.classList.toggle('history-mode-btn--selected', v === 'nuzlocke');
  }
  classicBtn.onclick = () => setVariant('classic');
  nuzBtn.onclick = () => setVariant('nuzlocke');
  setVariant('classic');

  const list = $('#history-region-list');
  clear(list);
  // Kanto is playable; show one "coming soon" tease for later regions.
  const kanto = REGIONS.kanto;
  list.appendChild(regionCard({
    name: kanto.name,
    subtitle: '8 Gyms · Elite Four',
    available: true,
    onClick: () => { sfx('select'); onPick('kanto', variant); },
  }));
  list.appendChild(regionCard({ name: 'Johto', subtitle: 'Coming soon', available: false }));

  showScreen('history-region-select');
}

function regionCard({ name, subtitle, available, onClick }) {
  const card = el('div', {
    className: 'region-card' + (available ? ' clickable' : ' locked'),
  },
    el('div', { className: 'region-card-name' }, name),
    el('div', { className: 'region-card-sub' }, subtitle),
    available ? el('div', { className: 'region-card-go' }, 'Begin →') : el('div', { className: 'region-card-lock' }, '🔒'),
  );
  if (available && onClick) card.addEventListener('click', onClick);
  return card;
}

export function renderTrainerSelect({ onPick }) {
  $('#trainer-boy').querySelector('.trainer-icon-wrap').textContent = '🧑';
  $('#trainer-girl').querySelector('.trainer-icon-wrap').textContent = '👩';
  const wire = (id, who) => {
    const card = $('#' + id);
    const go = () => { sfx('select'); onPick(who); };
    card.onclick = go;
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  };
  wire('trainer-boy', 'boy');
  wire('trainer-girl', 'girl');
  showScreen('trainer-screen');
}

export function renderStarterSelect(starterIds, { onPick }) {
  const host = $('#starter-choices');
  clear(host);
  starterIds.forEach((id) => {
    const sp = speciesById(id);
    const card = el('div', { className: 'starter-card clickable' },
      el('img', { className: 'poke-sprite starter-sprite', src: sp.sprites.front, alt: sp.name }),
      el('div', { className: 'starter-name' }, sp.name),
      typeBadges(sp.types),
    );
    card.addEventListener('click', () => { sfx('select'); onPick(id); });
    host.appendChild(card);
  });
  showScreen('starter-screen');
}
