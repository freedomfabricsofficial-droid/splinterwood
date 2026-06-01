// Status line variants. Cycles every ~10s when idle. Player-voice (dry, journal style).
//
// A small fraction of these are cryptic — they read normal but slightly off.
// Bible rule: funny if naive, ominous if you know. Players should not feel
// alarmed reading them. They should only feel something on a second read.
export const IDLE_STATUSES: string[] = [
  'idling at the tavern',
  'twiddling thumbs',
  'polishing the axe',
  'regretting earlier decisions',
  'rehearsing apologies',
  'watching the sky for omens',
  'loitering near the well',
  'counting clouds',
  'reading the back of the menu',
  'pretending to read the menu',
  'composing a withering remark',
  'considering pursuits of greater purpose',
  'avoiding eye contact with Maggie',
  'rummaging in pockets for forgotten coin',
  'practicing a heroic stance',
  'admiring own reflection in tankard',
  'eavesdropping on the bards',
  'doing very important nothing',
  // Cryptic drips — read as ordinary on first pass
  'trying to remember what was important',
  'feeling watched in a friendly way',
  'not thinking about it',
  'noticing how clean the inn is',
  'wondering how long this has been going on',
  'failing to remember a face',
];

// Active status template: "chopping a Crooked Twig", "in heroic combat with a Hungover Goblin"
export function activeStatusText(kind: 'wc' | 'cv' | 'cb', taskName: string): string {
  if (kind === 'wc') return `chopping a ${taskName}`;
  if (kind === 'cv') return `whittling a ${taskName}`;
  return `locked in heroic combat with a ${taskName}`;
}

// Death messages — randomized for variety
export const DEATH_LINES: string[] = [
  'lighter of pocket and dignity',
  'with mud in the hair and shame in the heart',
  'with vows of vengeance, immediately forgotten',
  'with several new opinions about violence',
  'after what witnesses describe as "a brief disagreement"',
  'and a sincere apology to the floorboards',
  'rehearsing a better excuse for next time',
  'with the distinct impression of having lost',
];
