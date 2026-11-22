// Game rules for Ember Court: a three-lane card duel.
// Each side has 20 life and a 24-card deck. Mana grows 1, 2, 3 … up to 8.
// Creatures are played into lanes (at most 2 per lane per side). At the end of
// a side's turn its creatures attack: each strikes the opposing creature in
// its lane, or the opposing hero when the lane is empty. A winning element
// strikes +1 harder. The first hero at 0 life loses. An empty deck hurts:
// drawing from it deals rising fatigue damage.

import { buildDeck, BEATS } from './cards.js';

export const MAX_LIFE = 20;
export const LANES = 3;
export const LANE_CAP = 2;
export const HAND_LIMIT = 6;
export const MAX_MANA = 8;

export class Game {
  constructor() {
    this.phase = 'title'; // title | play | over
    this.turn = 0;
    this.active = 'you'; // whose turn it is
    this.winner = null;
    this.life = { you: MAX_LIFE, foe: MAX_LIFE };
    this.mana = { you: 0, foe: 0 };
    this.maxMana = { you: 0, foe: 0 };
    this.hands = { you: [], foe: [] };
    this.decks = { you: [], foe: [] };
    this.board = { you: [[], [], []], foe: [[], [], []] };
    this.fatigue = { you: 0, foe: 0 };
    this.rally = { you: 0, foe: 0 }; // +attack this turn from Ember Rally
    this.logEntries = [];
  }

  start() {
    this.decks.you = buildDeck();
    this.decks.foe = buildDeck();
    for (let i = 0; i < 3; i++) {
      this.hands.you.push(this.decks.you.pop());
      this.hands.foe.push(this.decks.foe.pop());
    }
    this.phase = 'play';
    this.turn = 1;
    this.active = 'you';
    this.beginTurn('you');
    this.log('The duel begins. Your turn — play a card, then end your turn.');
  }

  beginTurn(who) {
    this.maxMana[who] = Math.min(this.turn, MAX_MANA);
    this.mana[who] = this.maxMana[who];
    this.rally[who] = 0;
    this.drawCard(who);
  }

  drawCard(who) {
    if (this.hands[who].length >= HAND_LIMIT) {
      this.log(`${who === 'you' ? 'You' : 'The Warden'} hold too many cards; the draw is lost.`);
      return;
    }
    if (this.decks[who].length === 0) {
      this.fatigue[who] += 1;
      this.life[who] -= this.fatigue[who];
      this.log(`${who === 'you' ? 'You' : 'The Warden'} draw from an empty deck and take ${this.fatigue[who]} fatigue.`);
      this.checkEnd();
      return;
    }
    this.hands[who].push(this.decks[who].pop());
  }

  handCard(who, uid) {
    return this.hands[who].find((c) => c.uid === uid);
  }

  canPlay(who, uid) {
    const card = this.handCard(who, uid);
    return !!card && card.cost <= this.mana[who];
  }

  playCreature(who, uid, lane) {
    const card = this.handCard(who, uid);
    if (!card || card.kind !== 'creature') return { ok: false, error: 'not a creature' };
    if (card.cost > this.mana[who]) return { ok: false, error: 'not enough mana' };
    if (lane < 0 || lane >= LANES) return { ok: false, error: 'no such lane' };
    if (this.board[who][lane].length >= LANE_CAP) return { ok: false, error: 'lane is full' };
    this.mana[who] -= card.cost;
    this.hands[who] = this.hands[who].filter((c) => c.uid !== uid);
    this.board[who][lane].push({ ...card, health: card.health });
    this.log(`${who === 'you' ? 'You play' : 'The Warden plays'} ${card.name} in lane ${lane + 1}.`);
    return { ok: true, card };
  }

  castSpell(who, uid, targetUid) {
    const card = this.handCard(who, uid);
    if (!card || card.kind !== 'spell') return { ok: false, error: 'not a spell' };
    if (card.cost > this.mana[who]) return { ok: false, error: 'not enough mana' };
    if (card.spell === 'damage') {
      const target = this.findBoardCard(targetUid);
      if (!target || target.owner === who) return { ok: false, error: 'needs an enemy creature' };
      this.mana[who] -= card.cost;
      this.hands[who] = this.hands[who].filter((c) => c.uid !== uid);
      target.card.health -= card.amount;
      this.log(`${card.name} hits ${target.card.name} for ${card.amount}.`);
      this.sweepDead();
      this.checkEnd();
      return { ok: true, card };
    }
    if (card.spell === 'heal') {
      this.mana[who] -= card.cost;
      this.hands[who] = this.hands[who].filter((c) => c.uid !== uid);
      this.life[who] = Math.min(MAX_LIFE, this.life[who] + card.amount);
      this.log(`${who === 'you' ? 'You mend' : 'The Warden mends'} ${card.amount} life.`);
      return { ok: true, card };
    }
    if (card.spell === 'draw') {
      this.mana[who] -= card.cost;
      this.hands[who] = this.hands[who].filter((c) => c.uid !== uid);
      this.drawCard(who);
      this.drawCard(who);
      this.log(`${who === 'you' ? 'You draw' : 'The Warden draws'} two cards.`);
      return { ok: true, card };
    }
    if (card.spell === 'rally') {
      this.mana[who] -= card.cost;
      this.hands[who] = this.hands[who].filter((c) => c.uid !== uid);
      this.rally[who] += card.amount;
      this.log(`${who === 'you' ? 'Your creatures' : 'The Warden’s creatures'} rally (+${card.amount} attack this turn).`);
      return { ok: true, card };
    }
    return { ok: false, error: 'unknown spell' };
  }

  findBoardCard(uid) {
    for (const owner of ['you', 'foe']) {
      for (let lane = 0; lane < LANES; lane++) {
        const card = this.board[owner][lane].find((c) => c.uid === uid);
        if (card) return { card, owner, lane };
      }
    }
    return null;
  }

  // End-of-turn combat: each of the attacker's creatures strikes once.
  combat(attacker) {
    const defender = attacker === 'you' ? 'foe' : 'you';
    for (let lane = 0; lane < LANES; lane++) {
      for (const creature of [...this.board[attacker][lane]]) {
        if (this.phase === 'over') return;
        const target = this.board[defender][lane][0];
        let damage = creature.attack + this.rally[attacker];
        if (target && BEATS[creature.element] === target.element) damage += 1;
        if (target) {
          target.health -= damage;
          this.log(`${creature.name} strikes ${target.name} for ${damage}.`);
        } else {
          this.life[defender] -= damage;
          this.log(`${creature.name} strikes the ${defender === 'you' ? 'challenger' : 'Warden'} for ${damage}.`);
        }
        this.sweepDead();
        this.checkEnd();
        if (this.phase === 'over') return;
      }
    }
  }

  sweepDead() {
    for (const owner of ['you', 'foe']) {
      for (let lane = 0; lane < LANES; lane++) {
        this.board[owner][lane] = this.board[owner][lane].filter((c) => c.health > 0);
      }
    }
  }

  checkEnd() {
    if (this.phase === 'over') return;
    if (this.life.foe <= 0 && this.life.you <= 0) {
      this.winner = 'draw';
    } else if (this.life.foe <= 0) {
      this.winner = 'you';
    } else if (this.life.you <= 0) {
      this.winner = 'foe';
    } else {
      return;
    }
    this.phase = 'over';
    this.life.you = Math.max(0, this.life.you);
    this.life.foe = Math.max(0, this.life.foe);
  }

  endTurn() {
    if (this.phase !== 'play' || this.active !== 'you') return false;
    this.combat('you');
    if (this.phase === 'over') return true;
    this.active = 'foe';
    this.turn += 1;
    this.beginTurn('foe');
    return true;
  }

  foeDone() {
    if (this.phase === 'over') return;
    this.combat('foe');
    if (this.phase === 'over') return;
    this.active = 'you';
    this.beginTurn('you');
  }

  log(message) {
    this.logEntries.push(message);
    if (this.logEntries.length > 40) this.logEntries.shift();
  }
}
