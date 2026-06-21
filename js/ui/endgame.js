// End-of-run screens: Game Over and the Champion win screen.
import { $, el, clear, showScreen } from './screens.js';
import { spriteImg } from './render.js';
import { sfx } from '../audio.js';

export function renderGameOver(run, { onRetry, onMenu }) {
  sfx('lose');
  const badges = $('#gameover-badges');
  clear(badges);
  badges.appendChild(el('div', { className: 'go-badges' }, `🎖️ ${run.badges.length}/8 badges`));

  const stats = $('#gameover-stats');
  clear(stats);
  stats.appendChild(el('div', { className: 'go-stat' }, `Region: ${cap(run.regionId)}`));
  stats.appendChild(el('div', { className: 'go-stat' }, `Mode: ${cap(run.variant)}`));
  stats.appendChild(el('div', { className: 'go-stat' }, `Team: ${run.team.length} Pokémon`));

  const team = $('#gameover-team');
  clear(team);
  run.team.forEach((inst) => team.appendChild(teamPortrait(inst)));

  $('#btn-retry').onclick = onRetry;
  $('#btn-gameover-menu').onclick = onMenu;
  showScreen('gameover-screen');
}

export function renderWin(run, { runCount, cycle = 1, onPlayAgain, onNewGamePlus }) {
  sfx('win');
  const parts = [];
  if (runCount) parts.push(`Story clears: ${runCount}`);
  if (cycle > 1) parts.push(`Cycle reached: ${cycle}`);
  $('#win-run-count').textContent = parts.join(' · ');
  const congrats = $('.win-congrats');
  if (congrats && cycle > 1) congrats.textContent = `You conquered cycle ${cycle}! The gyms reset — keep climbing for tougher battles.`;
  const team = $('#win-team');
  clear(team);
  run.team.forEach((inst) => team.appendChild(teamPortrait(inst)));
  $('#btn-play-again').onclick = onPlayAgain;
  const ng = $('#btn-newgame-plus');
  if (ng) ng.onclick = onNewGamePlus;
  showScreen('win-screen');
}

function teamPortrait(inst) {
  return el('div', { className: 'go-portrait' + (inst.hp <= 0 ? ' fainted' : '') },
    inst.shiny ? el('span', { className: 'shiny-star' }, '★') : null,
    spriteImg(inst, { className: 'go-portrait-sprite' }),
    el('span', { className: 'go-portrait-lv' }, `${inst.name} L${inst.level}`),
  );
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
