// Screenshot staging: ?demo=title|table|win|loss seeds a fixed, readable
// state and renders it. Every shot is a real render of the game's own code.

import { makeCard } from './cards.js';

function place(game, owner, lane, id, health) {
  const card = makeCard(id);
  if (health !== undefined) card.health = health;
  game.board[owner][lane].push(card);
  return card;
}

function seedTable(game) {
  game.turn = 5;
  game.life.you = 14;
  game.life.foe = 17;
  game.maxMana.you = 5;
  game.mana.you = 5;
  game.board.you = [[], [], []];
  game.board.foe = [[], [], []];
  place(game, 'you', 0, 'flame-hound');
  place(game, 'you', 1, 'pyre-knight', 3);
  place(game, 'you', 1, 'tide-sprite');
  place(game, 'you', 2, 'granite-ox');
  place(game, 'foe', 0, 'deep-serpent', 3);
  place(game, 'foe', 1, 'storm-crow');
  place(game, 'foe', 2, 'pebble-golem');
  game.hands.you = [makeCard('cinder-imp'), makeCard('coral-guard'), makeCard('cinder-burst'), makeCard('sky-ranger')];
  game.hands.foe = [makeCard('tide-sprite'), makeCard('flame-hound'), makeCard('pebble-golem')];
}

export function applyDemo(game, demo) {
  if (demo === 'title') return game; // the title screen is the default state
  game.start();
  if (demo === 'table') {
    seedTable(game);
    game.logEntries = ['Flame Hound strikes Deep Serpent for 3.', 'The Warden plays Storm Crow in lane 2.', 'Your turn — play a card, then end your turn.'];
  } else if (demo === 'win') {
    seedTable(game);
    game.life.foe = 0;
    game.checkEnd();
    game.logEntries = ['Pyre Knight strikes the Warden for 4.', 'Victory — the court is yours.'];
  } else if (demo === 'loss') {
    seedTable(game);
    game.life.you = 0;
    game.checkEnd();
    game.logEntries = ['Deep Serpent strikes the challenger for 3.', 'Defeat — the Warden holds the court.'];
  }
  return game;
}
