// Card pool for Ember Court: every card is original, with its own name, art
// (colour + shape) and rules text. Elements form a cycle:
// Ember beats Gale, Gale beats Stone, Stone beats Tide, Tide beats Ember.
// A creature attacking a creature whose element it beats strikes +1 harder.

export const ELEMENTS = {
  ember: { name: 'Ember', glyph: '▲', color: '#e2543e' },
  tide: { name: 'Tide', glyph: '≋', color: '#3e8fe2' },
  gale: { name: 'Gale', glyph: '〰', color: '#3ec98f' },
  stone: { name: 'Stone', glyph: '◆', color: '#b08d57' },
};

export const BEATS = { ember: 'gale', gale: 'stone', stone: 'tide', tide: 'ember' };

// kind: 'creature' | 'spell'. Creatures fight on the board; spells resolve at once.
// Spells carry a `spell` key naming their effect (see state.js).
export const CARDS = [
  { id: 'cinder-imp', name: 'Cinder Imp', kind: 'creature', element: 'ember', cost: 1, attack: 2, health: 1, text: 'Quick spark, quick fade.' },
  { id: 'flame-hound', name: 'Flame Hound', kind: 'creature', element: 'ember', cost: 2, attack: 3, health: 2, text: 'It hunts by the smell of smoke.' },
  { id: 'pyre-knight', name: 'Pyre Knight', kind: 'creature', element: 'ember', cost: 4, attack: 4, health: 4, text: 'Sworn to the last ember.' },
  { id: 'tide-sprite', name: 'Tide Sprite', kind: 'creature', element: 'tide', cost: 1, attack: 1, health: 2, text: 'Small wave, stubborn current.' },
  { id: 'coral-guard', name: 'Coral Guard', kind: 'creature', element: 'tide', cost: 2, attack: 2, health: 3, text: 'The reef does not yield.' },
  { id: 'deep-serpent', name: 'Deep Serpent', kind: 'creature', element: 'tide', cost: 4, attack: 3, health: 5, text: 'It remembers every drowned road.' },
  { id: 'zephyr-wisp', name: 'Zephyr Wisp', kind: 'creature', element: 'gale', cost: 1, attack: 2, health: 1, text: 'Here, then gone, then here.' },
  { id: 'storm-crow', name: 'Storm Crow', kind: 'creature', element: 'gale', cost: 2, attack: 3, health: 1, text: 'Its cry arrives before the rain.' },
  { id: 'sky-ranger', name: 'Sky Ranger', kind: 'creature', element: 'gale', cost: 3, attack: 3, health: 3, text: 'She maps the wind and rides it.' },
  { id: 'pebble-golem', name: 'Pebble Golem', kind: 'creature', element: 'stone', cost: 2, attack: 1, health: 4, text: 'Patient as a hillside.' },
  { id: 'granite-ox', name: 'Granite Ox', kind: 'creature', element: 'stone', cost: 3, attack: 3, health: 4, text: 'It ploughs through sieges.' },
  { id: 'cinder-burst', name: 'Cinder Burst', kind: 'spell', element: 'ember', cost: 2, spell: 'damage', amount: 3, text: 'Deal 3 damage to a creature.' },
  { id: 'spring-mend', name: 'Spring Mend', kind: 'spell', element: 'tide', cost: 2, spell: 'heal', amount: 5, text: 'Restore 5 life to yourself.' },
  { id: 'swift-draft', name: 'Swift Draft', kind: 'spell', element: 'gale', cost: 1, spell: 'draw', amount: 2, text: 'Draw 2 cards.' },
  { id: 'ember-rally', name: 'Ember Rally', kind: 'spell', element: 'ember', cost: 2, spell: 'rally', amount: 1, text: 'Your creatures gain +1 attack this turn.' },
];

let uidCounter = 0;

export function makeCard(id) {
  const def = CARDS.find((c) => c.id === id);
  if (!def) throw new Error(`unknown card ${id}`);
  return { ...def, uid: `c${++uidCounter}` };
}

// The deck: two copies of each of the ten creatures, one of each spell.
const DECK_LIST = [
  'cinder-imp', 'cinder-imp', 'flame-hound', 'flame-hound', 'pyre-knight', 'pyre-knight',
  'tide-sprite', 'tide-sprite', 'coral-guard', 'coral-guard', 'deep-serpent', 'deep-serpent',
  'zephyr-wisp', 'zephyr-wisp', 'storm-crow', 'storm-crow',
  'pebble-golem', 'pebble-golem', 'granite-ox', 'granite-ox',
  'cinder-burst', 'spring-mend', 'swift-draft', 'ember-rally',
];

export function buildDeck() {
  const deck = DECK_LIST.map((id) => makeCard(id));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
