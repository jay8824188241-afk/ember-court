// Rendering and input for Ember Court. render(game, ui) rebuilds the table
// from state; bindUI wires clicks and keys once. Selection flow: click a
// hand card to pick it up, click one of your lanes to play a creature, click
// an enemy creature to aim Cinder Burst, click a chosen spell again to cast
// a spell that needs no target.

import { ELEMENTS } from './cards.js';
import { sfx } from './audio.js';

export function cardEl(card, opts = {}) {
  const el = document.createElement('div');
  el.className = `card el-${card.element}${card.kind === 'spell' ? ' spell' : ''}`;
  if (opts.selected) el.classList.add('selected');
  if (opts.unaffordable) el.classList.add('unaffordable');
  if (opts.targetable) el.classList.add('targetable');
  el.dataset.uid = card.uid;
  const glyph = ELEMENTS[card.element].glyph;
  const stats = card.kind === 'creature'
    ? `<div class="stats"><span class="atk">⚔ ${card.attack}</span><span class="hp">♥ ${card.health}</span></div>`
    : '';
  el.innerHTML = `
    <div class="cost">${card.cost}</div>
    <div class="cname">${card.name}</div>
    <div class="glyph">${glyph}</div>
    <div class="ctext">${card.text}</div>
    ${stats}`;
  return el;
}

function manaDots(mana, maxMana) {
  let out = '';
  for (let i = 0; i < maxMana; i++) out += i < mana ? '●' : '<span class="spent">●</span>';
  return `${out} ${mana}/${maxMana}`;
}

export function render(game, ui) {
  const $ = (id) => document.getElementById(id);
  $('turn-banner').textContent =
    game.phase === 'over'
      ? game.winner === 'you' ? 'Victory — the court is yours.'
        : game.winner === 'foe' ? 'Defeat — the Warden holds the court.'
        : 'A draw — the embers settle even.'
      : game.phase === 'title' ? 'Ember Court'
      : ui.busy ? 'The Warden is thinking…'
      : game.active === 'you' ? 'Your turn — play a card, then end your turn.'
      : 'The Warden plays…';
  $('mana-bar').innerHTML = game.phase === 'title' ? '' : manaDots(game.mana.you, game.maxMana.you);
  $('you-life').textContent = game.life.you;
  $('foe-life').textContent = game.life.foe;
  $('you-life').classList.toggle('low', game.life.you <= 5);
  $('foe-life').classList.toggle('low', game.life.foe <= 5);

  const backs = $('foe-hand-backs');
  backs.innerHTML = '';
  for (let i = 0; i < game.hands.foe.length; i++) {
    const b = document.createElement('div');
    b.className = 'card-back';
    backs.appendChild(b);
  }

  document.querySelectorAll('.lane').forEach((laneEl) => {
    const lane = Number(laneEl.dataset.lane);
    const foeSlots = laneEl.querySelector('.foe-slots');
    const youSlots = laneEl.querySelector('.you-slots');
    foeSlots.innerHTML = '';
    youSlots.innerHTML = '';
    const selected = ui.selectedUid ? game.handCard('you', ui.selectedUid) : null;
    for (const c of game.board.foe[lane]) {
      const targetable = !!selected && selected.spell === 'damage' && game.phase === 'play' && game.active === 'you';
      foeSlots.appendChild(cardEl(c, { targetable }));
    }
    for (const c of game.board.you[lane]) {
      youSlots.appendChild(cardEl(c, {}));
    }
    if (game.board.foe[lane].length === 0 && game.phase === 'play') {
      const h = document.createElement('div');
      h.className = 'empty-hint';
      h.textContent = '—';
      foeSlots.appendChild(h);
    }
    if (game.board.you[lane].length === 0 && game.phase === 'play') {
      const h = document.createElement('div');
      h.className = 'empty-hint';
      h.textContent = 'empty lane';
      youSlots.appendChild(h);
    }
    const dropOk = !!selected && selected.kind === 'creature'
      && game.phase === 'play' && game.active === 'you' && !ui.busy
      && game.board.you[lane].length < 2;
    youSlots.classList.toggle('drop-ok', dropOk);
  });

  const hand = $('you-hand');
  hand.innerHTML = '';
  game.hands.you.forEach((c) => {
    const affordable = c.cost <= game.mana.you;
    hand.appendChild(cardEl(c, {
      selected: ui.selectedUid === c.uid,
      unaffordable: !affordable && game.phase === 'play',
    }));
  });

  $('end-turn').disabled = ui.busy || game.phase !== 'play' || game.active !== 'you';
  const log = $('log');
  log.innerHTML = game.logEntries.slice(-3).map((m) => `<div>${m}</div>`).join('');

  $('title-screen').classList.toggle('hidden', game.phase !== 'title');
  const end = $('end-screen');
  end.classList.toggle('hidden', game.phase !== 'over');
  if (game.phase === 'over') {
    $('end-title').textContent = game.winner === 'you' ? 'Victory' : game.winner === 'foe' ? 'Defeat' : 'Draw';
    $('end-text').textContent = game.winner === 'you'
      ? 'The Warden’s life falls to zero. The Ember Court is yours — the lanterns burn in your name.'
      : game.winner === 'foe'
        ? 'Your life falls to zero. The Warden keeps the court… this time. Shuffle up and try again.'
        : 'Both heroes fall together. The court belongs to no one.';
  }
}

export function bindUI(game, ui, actions) {
  const $ = (id) => document.getElementById(id);

  $('you-hand').addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    if (!cardEl || ui.busy || game.phase !== 'play' || game.active !== 'you') return;
    const uid = cardEl.dataset.uid;
    const card = game.handCard('you', uid);
    if (!card) return;
    if (ui.selectedUid === uid) {
      // Second click casts a spell that needs no target.
      if (card.kind === 'spell' && card.spell !== 'damage') {
        const res = game.castSpell('you', uid);
        if (res.ok) sfx('play');
        else game.log(res.error);
        ui.selectedUid = null;
        actions.rerender();
      } else {
        ui.selectedUid = null;
        actions.rerender();
      }
      return;
    }
    if (card.cost > game.mana.you) {
      game.log(`Not enough mana for ${card.name}.`);
      actions.rerender();
      return;
    }
    ui.selectedUid = uid;
    sfx('click');
    actions.rerender();
  });

  document.querySelectorAll('.lane').forEach((laneEl) => {
    laneEl.querySelector('.you-slots').addEventListener('click', (e) => {
      if (e.target.closest('.card')) return; // clicks on a board card do nothing
      if (!ui.selectedUid || ui.busy || game.phase !== 'play' || game.active !== 'you') return;
      const card = game.handCard('you', ui.selectedUid);
      if (!card || card.kind !== 'creature') return;
      const lane = Number(laneEl.dataset.lane);
      const res = game.playCreature('you', ui.selectedUid, lane);
      if (res.ok) {
        sfx('play');
        ui.selectedUid = null;
      } else {
        game.log(res.error);
      }
      actions.rerender();
    });
    laneEl.querySelector('.foe-slots').addEventListener('click', (e) => {
      const target = e.target.closest('.card');
      if (!target || !ui.selectedUid || ui.busy || game.phase !== 'play' || game.active !== 'you') return;
      const card = game.handCard('you', ui.selectedUid);
      if (!card || card.spell !== 'damage') return;
      const res = game.castSpell('you', ui.selectedUid, target.dataset.uid);
      if (res.ok) {
        sfx('attack');
        ui.selectedUid = null;
      } else {
        game.log(res.error);
      }
      actions.rerender();
    });
  });

  $('end-turn').addEventListener('click', () => actions.endTurn());
  $('start-btn').addEventListener('click', () => actions.start());
  $('again-btn').addEventListener('click', () => location.reload());

  document.addEventListener('keydown', (e) => {
    if (game.phase !== 'play' || game.active !== 'you' || ui.busy) return;
    if (e.key >= '1' && e.key <= '6') {
      const card = game.hands.you[Number(e.key) - 1];
      if (card && card.cost <= game.mana.you) {
        ui.selectedUid = card.uid;
        sfx('click');
        actions.rerender();
      }
    } else if (e.key === 'Enter') {
      actions.endTurn();
    } else if (e.key === 'Escape') {
      ui.selectedUid = null;
      actions.rerender();
    }
  });
}
