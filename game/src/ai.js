// The Warden's turn: plays cards and spells, then the shared combat step
// (game.foeDone) resolves its attacks. The AI is deliberately readable:
// it kills what it can, heals when hurt, and fills the emptiest lane.

import { BEATS } from './cards.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function foeCreatures(game) {
  const out = [];
  for (let lane = 0; lane < 3; lane++) {
    for (const c of game.board.foe[lane]) out.push({ card: c, lane });
  }
  return out;
}

function youCreatures(game) {
  const out = [];
  for (let lane = 0; lane < 3; lane++) {
    for (const c of game.board.you[lane]) out.push({ card: c, lane });
  }
  return out;
}

function bestLaneFor(game, creature) {
  let best = 0;
  let bestScore = -Infinity;
  for (let lane = 0; lane < 3; lane++) {
    if (game.board.foe[lane].length >= 2) continue;
    const target = game.board.you[lane][0];
    let score = -game.board.foe[lane].length * 2;
    if (target) {
      const damage = creature.attack + (BEATS[creature.element] === target.element ? 1 : 0);
      if (damage >= target.health) score += 10; // a kill
      score += damage - target.health; // chip is still useful
    } else {
      score += 3; // an open lane hits the hero
    }
    if (score > bestScore) {
      bestScore = score;
      best = lane;
    }
  }
  return best;
}

export async function takeFoeTurn(game, rerender) {
  // One action at a time, with a pause so the player can follow along.
  for (;;) {
    if (game.phase !== 'play') return;
    const hand = game.hands.foe;
    const heal = hand.find((c) => c.spell === 'heal');
    if (heal && game.life.foe <= 8 && heal.cost <= game.mana.foe) {
      game.castSpell('foe', heal.uid);
      rerender();
      await sleep(500);
      continue;
    }
    const draft = hand.find((c) => c.spell === 'draw');
    if (draft && hand.length < 3 && draft.cost <= game.mana.foe) {
      game.castSpell('foe', draft.uid);
      rerender();
      await sleep(500);
      continue;
    }
    const burst = hand.find((c) => c.spell === 'damage');
    // Cinder Burst deals burst.amount damage: spend it only where it kills.
    // Chipping a 4-health creature leaves it alive and still hitting for full
    // attack, while a killable attacker stays on the board. So pick the
    // strongest enemy creature the burst can remove outright (highest attack,
    // then toughest body); if none can die to it, hold the spell for a later
    // turn instead of wasting the Warden's only removal.
    const killable = burst ? youCreatures(game)
      .filter((t) => t.card.health <= burst.amount)
      .sort((a, b) => b.card.attack - a.card.attack || b.card.health - a.card.health)[0] : null;
    if (burst && killable && burst.cost <= game.mana.foe) {
      game.castSpell('foe', burst.uid, killable.card.uid);
      rerender();
      await sleep(500);
      continue;
    }
    const rally = hand.find((c) => c.spell === 'rally');
    if (rally && foeCreatures(game).length >= 2 && rally.cost <= game.mana.foe) {
      game.castSpell('foe', rally.uid);
      rerender();
      await sleep(500);
      continue;
    }
    const playable = hand
      .filter((c) => c.kind === 'creature' && c.cost <= game.mana.foe)
      .sort((a, b) => b.cost - a.cost || b.attack - a.attack)[0];
    if (!playable) return;
    const lane = bestLaneFor(game, playable);
    const res = game.playCreature('foe', playable.uid, lane);
    if (!res.ok) return;
    rerender();
    await sleep(500);
  }
}
