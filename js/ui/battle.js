// Battle playback: replays the simulated event log onto the battle screen with
// HP-bar animation, damage numbers, effectiveness call-outs and a light canvas
// hit effect. "Skip" fast-forwards; "Continue" resolves the returned promise.
import { $, el, clear, showScreen } from './screens.js';
import { spriteImg, hpClass, trainerSprite } from './render.js';
import { typeColor } from '../data/types.js';
import { getSetting } from '../state.js';
import { sfx } from '../audio.js';

function reduced() { return !!getSetting('reducedMotion'); }
function wait(ms, skipRef) {
  if (skipRef.v) return Promise.resolve();
  if (reduced()) ms = Math.min(ms, 30);
  return new Promise((r) => setTimeout(r, ms));
}

export function playBattle(opts) {
  return new Promise((resolve) => {
    const { run, enemyTeam, result, ctx = {} } = opts;
    const skipRef = { v: false };

    $('#battle-title').textContent = ctx.title || 'Wild Battle!';
    $('#battle-subtitle').textContent = ctx.subtitle || '';
    $('#enemy-side-label').textContent = ctx.enemyLabel || 'Enemy';

    renderTraitBar('#player-battle-traits', opts.playerTraits);
    renderTraitBar('#enemy-battle-traits', opts.enemyTraits);
    renderPassivesStrip(run);
    $('#player-trainer-icon').replaceChildren(trainerSprite(run.trainer, 'player'));
    $('#enemy-trainer-icon').replaceChildren(trainerSprite(ctx.enemyTrainer || 'enemy', 'enemy'));

    const pMap = renderSide('#player-side', run.team);
    const eMap = renderSide('#enemy-side', enemyTeam);
    showScreen('battle-screen');

    const skipBtn = $('#btn-auto-battle');
    const contBtn = $('#btn-continue-battle');
    contBtn.style.display = 'none';
    skipBtn.style.display = '';
    skipBtn.onclick = () => { skipRef.v = true; };
    contBtn.onclick = () => resolve(result);

    const look = (side, uid) => (side === 'player' ? pMap : eMap).get(uid);

    (async () => {
      for (const ev of result.log) {
        if (ev.type === 'switch') {
          const map = ev.side === 'player' ? pMap : eMap;
          map.forEach((s) => s.slot.classList.remove('active'));
          const s = map.get(ev.uid);
          if (s) s.slot.classList.add('active');
          await wait(180, skipRef);
        } else if (ev.type === 'attack') {
          const atk = look(ev.side, ev.attackerUid);
          const def = look(ev.side === 'player' ? 'enemy' : 'player', ev.defenderUid);
          if (atk) {
            atk.slot.classList.add(ev.side === 'player' ? 'lunge-right' : 'lunge-left');
            setTimeout(() => atk.slot.classList.remove('lunge-right', 'lunge-left'), 200);
          }
          if (def) {
            setHp(def, ev.defenderHp);
            def.slot.classList.add('hit');
            setTimeout(() => def.slot.classList.remove('hit'), 160);
            floatDamage(def.slot, ev.damage, ev.eff);
            hitEffect(def.slot, typeColor(ev.moveType), ev.eff);
          }
          sfx(ev.eff > 1 ? 'hitStrong' : ev.eff < 1 ? 'hitWeak' : 'hit');
          await wait(ev.eff > 1 ? 360 : 280, skipRef);
        } else if (ev.type === 'faint') {
          const s = look(ev.side, ev.uid);
          if (s) s.slot.classList.add('fainted');
          sfx('faint');
          await wait(260, skipRef);
        }
      }
      // End of log.
      const won = result.winner === 'player';
      $('#battle-subtitle').textContent = won ? 'You won the battle!' : 'Your team was defeated…';
      skipBtn.style.display = 'none';
      contBtn.style.display = '';
      contBtn.textContent = won ? 'Continue' : 'Continue';
      contBtn.focus();
    })();
  });
}

function renderSide(sel, team) {
  const host = $(sel);
  clear(host);
  const map = new Map();
  team.forEach((m) => {
    const fill = el('span', { className: 'hp-fill' });
    const frac = Math.max(0, m.hp / m.maxHp);
    fill.style.width = frac * 100 + '%';
    fill.dataset.hp = hpClass(frac);
    const slot = el('div', { className: 'battle-mon' + (m.hp <= 0 ? ' fainted' : ''), dataset: { uid: m.uid } },
      m.shiny ? el('span', { className: 'shiny-star' }, '★') : null,
      spriteImg(m, { className: 'battle-mon-sprite' }),
      el('span', { className: 'battle-mon-lv' }, 'L' + m.level),
      el('span', { className: 'hp-bar' }, fill),
    );
    host.appendChild(slot);
    map.set(m.uid, { slot, fill, mon: m });
  });
  return map;
}

function setHp(s, hp) {
  const frac = Math.max(0, hp / s.mon.maxHp);
  s.fill.style.width = frac * 100 + '%';
  s.fill.dataset.hp = hpClass(frac);
}

function floatDamage(slot, amount, eff) {
  const tag = el('span', { className: 'dmg-float' + (eff > 1 ? ' strong' : eff < 1 ? ' weak' : '') },
    amount > 0 ? '-' + amount : 'miss');
  slot.appendChild(tag);
  if (eff === 0) tag.textContent = 'no effect';
  else if (eff > 1) tag.appendChild(el('small', {}, ' super!'));
  else if (eff < 1) tag.appendChild(el('small', {}, ' resist'));
  setTimeout(() => tag.remove(), 800);
}

function renderTraitBar(sel, traits) {
  const host = $(sel);
  if (!host) return;
  clear(host);
  Object.entries(traits || {}).forEach(([type, t]) => {
    host.appendChild(el('span', {
      className: 'trait-chip',
      style: { background: t.color },
      title: `${type} ${t.tierLabel} · +${Math.round(t.atk * 100)}% ${type} dmg`,
    }, `${type.slice(0, 3).toUpperCase()} ${t.tierLabel}`));
  });
}

function renderPassivesStrip(run) {
  const host = $('#battle-passives-row');
  if (!host) return;
  clear(host);
  import('../data/items.js').then(({ PASSIVE_ITEMS }) => {
    (run.bag.passives || []).forEach((id) => {
      const p = PASSIVE_ITEMS[id];
      if (p) host.appendChild(el('span', { className: 'passive-chip', title: `${p.name} — ${p.desc}` }, p.icon));
    });
  });
}

// Light expanding-ring hit effect on the shared canvas.
function hitEffect(slot, color, eff) {
  if (reduced()) return;
  const canvas = $('#battle-anim-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== window.innerWidth * dpr) {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  }
  canvas.style.display = 'block';
  const r = slot.getBoundingClientRect();
  const cx = (r.left + r.width / 2) * dpr;
  const cy = (r.top + r.height / 2) * dpr;
  const rings = eff > 1 ? 3 : 1;
  let t0 = null;
  const dur = 300;
  function frame(ts) {
    if (!t0) t0 = ts;
    const p = (ts - t0) / dur;
    ctx.clearRect(cx - 80 * dpr, cy - 80 * dpr, 160 * dpr, 160 * dpr);
    if (p < 1) {
      for (let i = 0; i < rings; i++) {
        const pp = Math.max(0, p - i * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, (8 + pp * 46) * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = Math.max(0, 1 - pp);
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(cx - 80 * dpr, cy - 80 * dpr, 160 * dpr, 160 * dpr);
    }
  }
  requestAnimationFrame(frame);
}
