// Random events system.
// Events fire periodically while the player has the game open. Each event
// defines: when it can fire (gate), what it presents (UI data), and what
// happens for each player choice.
//
// Adding a new event: append to RANDOM_EVENTS, give it a unique id, choose
// a weight (higher = more common when conditions are met), define gate &
// choices. UI rendering is handled generically by the EventModal component.

import type { GameState } from '../types';

export interface EventChoice {
  label: string;
  description?: string;          // optional second line under the button
  // Returns text shown briefly after the choice is made (toast-style).
  // Side effects on state are performed here.
  resolve: (s: GameState, h: EventHelpers) => string;
  // Disable the choice if false (e.g. "can't afford")
  enabled?: (s: GameState) => boolean;
}

export interface EventHelpers {
  addCoin: (n: number) => void;
  addItem: (id: string, n: number) => void;
  removeCoin: (n: number) => boolean;  // returns false if not enough
  showToast: (msg: string) => void;
}

export interface RandomEventDef {
  id: string;
  weight: number;                  // relative likelihood when gate passes
  title: string;                   // headline shown in modal
  flavor: string;                  // descriptive prose
  // Player must meet this for the event to be eligible at all
  gate: (s: GameState) => boolean;
  choices: EventChoice[];
}

// ---------- Event definitions ----------

export const RANDOM_EVENTS: RandomEventDef[] = [
  {
    id: 'lucky_find',
    weight: 30,
    title: 'A glint of coin',
    flavor: 'Something catches your eye in the dirt. A coin, half-buried, mostly forgotten.',
    gate: () => true,
    choices: [
      {
        label: 'Pocket it',
        resolve: (_s, h) => {
          const amt = 5 + Math.floor(Math.random() * 20);
          h.addCoin(amt);
          return `+${amt} coin.`;
        },
      },
      {
        label: 'Leave it',
        description: 'Suspicious. Could be cursed.',
        resolve: () => 'You walk on. It was probably cursed.',
      },
    ],
  },
  {
    id: 'wandering_trader',
    weight: 20,
    title: 'A wandering trader',
    flavor: 'A figure in a dusty cloak unfolds a small stall. "Just passing through. Special prices, only for you."',
    gate: (s) => s.coin >= 30,
    choices: [
      {
        label: 'Buy a tonic — 30 coin',
        description: 'Heals 10 HP. Usual price 25, but his face is friendly.',
        enabled: (s) => s.coin >= 30,
        resolve: (_s, h) => {
          if (!h.removeCoin(30)) return 'Out of coin.';
          h.addItem('potion_minor', 1);
          return 'A tonic, slightly cloudy. Likely fine.';
        },
      },
      {
        label: 'Buy mystery pouch — 50 coin',
        description: 'Could be wonderful. Could be regret.',
        enabled: (s) => s.coin >= 50,
        resolve: (_s, h) => {
          if (!h.removeCoin(50)) return 'Out of coin.';
          const roll = Math.random();
          if (roll < 0.25) {
            h.addCoin(150);
            return 'Coin spills out. He vanishes before you can argue.';
          } else if (roll < 0.55) {
            h.addItem('potion_greater', 1);
            return 'A greater tonic, smelling faintly of cinnamon.';
          } else if (roll < 0.85) {
            h.addItem('lucky_penny', 1);
            return 'A penny. Probably lucky. Probably.';
          } else {
            return 'A folded note: "Better luck next time." Nothing else.';
          }
        },
      },
      {
        label: 'Decline politely',
        resolve: () => 'He nods, folds his stall, and is gone.',
      },
    ],
  },
  {
    id: 'mysterious_stranger',
    weight: 12,
    title: 'A mysterious stranger',
    flavor: 'A hooded figure offers a coin. "Heads or tails. Double or nothing. Your choice of side."',
    gate: (s) => s.coin >= 50,
    choices: [
      {
        label: 'Heads — wager 50',
        enabled: (s) => s.coin >= 50,
        resolve: (_s, h) => {
          if (!h.removeCoin(50)) return 'Out of coin.';
          if (Math.random() < 0.5) {
            h.addCoin(100);
            return 'Heads. The stranger nods grimly and is gone. +50 net.';
          }
          return 'Tails. He pockets your coin and disappears. -50.';
        },
      },
      {
        label: 'Tails — wager 50',
        enabled: (s) => s.coin >= 50,
        resolve: (_s, h) => {
          if (!h.removeCoin(50)) return 'Out of coin.';
          if (Math.random() < 0.5) {
            h.addCoin(100);
            return 'Tails. The stranger nods grimly and is gone. +50 net.';
          }
          return 'Heads. He pockets your coin and disappears. -50.';
        },
      },
      {
        label: 'Walk away',
        resolve: () => 'A wise call. Probably.',
      },
    ],
  },
  {
    id: 'pickpocket',
    weight: 8,
    title: 'A small hand in your pocket',
    flavor: 'A goblin child is rifling your satchel with practiced fingers. They have not yet noticed you noticed.',
    gate: (s) => s.coin >= 50 && s.skills.combat.level >= 3,
    choices: [
      {
        label: 'Grab them',
        description: 'Quick reflexes might recover coin and intimidate.',
        resolve: (_s, h) => {
          if (Math.random() < 0.65) {
            h.addCoin(15);
            return 'You catch their wrist. They drop your coin AND theirs and run. +15.';
          }
          h.removeCoin(20);
          return 'They wriggle free with a handful of your coin. -20.';
        },
      },
      {
        label: 'Pretend not to notice',
        description: 'They are very small. Let them have a small win.',
        resolve: (_s, h) => {
          const amt = 8 + Math.floor(Math.random() * 15);
          h.removeCoin(amt);
          return `They make off with ${amt} coin and a whoop of triumph.`;
        },
      },
    ],
  },
  {
    id: 'note_in_satchel',
    weight: 10,
    title: 'A note in your satchel',
    flavor: 'You find a folded scrap of parchment you do not remember writing. The handwriting is yours, mostly.',
    gate: () => true,
    choices: [
      {
        label: 'Read it',
        resolve: () => {
          const lines = [
            '"Remember: the Surly Oak is not actually surly. It is bored."',
            '"The Innkeep takes mead in payment. Officially she does not."',
            '"Do not eat the Bog Onion raw. Trust me on this."',
            '"Pinewood swords are useless. Pine is for kindling. Do not tell anyone you carved one."',
            '"Combat is just maths with extra steps. Higher number wins."',
            '"You are an adventurer. You are also an accountant. Try not to confuse the two."',
          ];
          return lines[Math.floor(Math.random() * lines.length)];
        },
      },
      {
        label: 'Throw it away',
        resolve: () => 'You crumple it without reading. Bold.',
      },
    ],
  },
  {
    id: 'old_axe',
    weight: 6,
    title: 'An axe in a stump',
    flavor: 'An axe is buried halfway into an old tree stump. No one is around. The handle is worn but solid.',
    gate: (s) => s.skills.woodcutting.level >= 5,
    choices: [
      {
        label: 'Take it',
        description: 'Possession is nine-tenths.',
        resolve: (_s, h) => {
          h.addItem('log_oak', 5);
          return 'You wrench it free. Several oak logs come with it, somehow.';
        },
      },
      {
        label: 'Leave it for the owner',
        resolve: () => 'You walk on. The axe remains, accusatorily.',
      },
    ],
  },
];

// ---------- Event scheduler ----------

// State held outside React; the main loop calls maybeFireEvent each tick.
let _lastCheck = Date.now();
let _pendingEvent: RandomEventDef | null = null;

const CHECK_INTERVAL_MS = 8000;   // check every 8 seconds (was 5)
const FIRE_CHANCE = 0.015;        // 1.5% per check → roughly one every ~9 minutes (was 4% / ~2 min)
// Minimum time between events so they don't stack
let _lastFiredAt = 0;
const MIN_GAP_MS = 240_000;       // 4-minute minimum gap (was 90s)

export function maybeFireEvent(state: GameState): RandomEventDef | null {
  const now = Date.now();
  if (now - _lastCheck < CHECK_INTERVAL_MS) return _pendingEvent;
  _lastCheck = now;
  if (_pendingEvent) return _pendingEvent;            // already one queued
  if (now - _lastFiredAt < MIN_GAP_MS) return null;   // too soon
  if (Math.random() >= FIRE_CHANCE) return null;

  // Pick a weighted random event from those whose gate passes
  const eligible = RANDOM_EVENTS.filter(e => e.gate(state));
  if (!eligible.length) return null;
  const totalWeight = eligible.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const e of eligible) {
    roll -= e.weight;
    if (roll <= 0) {
      _pendingEvent = e;
      _lastFiredAt = now;
      return e;
    }
  }
  return null;
}

export function consumeEvent(): RandomEventDef | null {
  const e = _pendingEvent;
  _pendingEvent = null;
  return e;
}

export function clearEvent(): void {
  _pendingEvent = null;
}

// Dev helper - force-fire a specific event by id
export function devFireEvent(id: string): RandomEventDef | null {
  const e = RANDOM_EVENTS.find(x => x.id === id);
  if (!e) return null;
  _pendingEvent = e;
  return e;
}
