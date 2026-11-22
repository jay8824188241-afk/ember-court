// Ember Court entry point: builds the game, wires input, and stages
// screenshot demos (?demo=title|table|win|loss).

import { Game } from './state.js';
import { takeFoeTurn } from './ai.js';
import { render, bindUI } from './render.js';
import { sfx } from './audio.js';
import { applyDemo } from './shots.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const game = new Game();
const ui = { selectedUid: null, busy: false };
const rerender = () => render(game, ui);
window.__game = game;

async function handleEndTurn() {
  if (ui.busy || game.phase !== 'play' || game.active !== 'you') return;
  ui.busy = true;
  ui.selectedUid = null;
  rerender();
  sfx('attack');
  game.endTurn();
  rerender();
  await sleep(600);
  if (game.phase === 'over') {
    ui.busy = false;
    sfx(game.winner === 'you' ? 'win' : 'lose');
    rerender();
    return;
  }
  await takeFoeTurn(game, rerender);
  game.foeDone();
  ui.busy = false;
  if (game.phase === 'over') sfx(game.winner === 'you' ? 'win' : 'lose');
  else sfx('draw');
  rerender();
}

bindUI(game, ui, {
  rerender,
  endTurn: handleEndTurn,
  start: () => {
    sfx('click');
    game.start();
    rerender();
  },
});

const demo = new URLSearchParams(location.search).get('demo');
if (demo) applyDemo(game, demo);
rerender();
