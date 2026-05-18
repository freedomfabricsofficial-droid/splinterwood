// Floor system.
//
// Floors are realms in the world, each with its own NPC, theme, and content tier.
// IMPORTANT: skills do NOT swap when changing floors. All unlocked skills are
// always available in every district. The floor is the *backdrop* — visual theme,
// resident NPC, and lore. The realm map lets you visit them.
//
// Skills, items, and recipes belong to floors via tags on their data, but they
// remain visible in their respective district tabs once unlocked.

import type { GameState } from '../types';

export type FloorId = 'splinterwood' | 'greystone_reach' | 'floor_3' | 'floor_4' | 'floor_5';

export interface FloorDef {
  id: FloorId;
  number: number;             // 1, 2, 3...
  name: string;
  npc: string | null;         // resident NPC name (null = no NPC yet)
  flavor: string;             // shown on the map
  unlockHint: string;         // shown while still locked
  theme: 'warm' | 'cool' | 'wet' | 'haunted' | 'forged';
  // Function called against state — returns true if this floor is unlocked.
  // Returns true for splinterwood always; other floors require milestones.
  isUnlocked: (s: GameState) => boolean;
  // Skills granted by visiting this floor's NPC and completing their intro quest
  skillsTaught: string[];
}

export const FLOORS: FloorDef[] = [
  {
    id: 'splinterwood',
    number: 1,
    name: 'Splinterwood',
    npc: 'Maggie the Innkeep',
    flavor: 'A village of inn, forest, and routine. Home.',
    unlockHint: '',
    theme: 'warm',
    isUnlocked: () => true,
    skillsTaught: ['woodcutting', 'carving', 'combat'],
  },
  {
    id: 'greystone_reach',
    number: 2,
    name: 'Greystone Reach',
    npc: 'Brock the Stonewright',
    // Brock's voice: minimal. The realm card description follows his energy.
    flavor: 'Stone. Quiet. A man.',
    unlockHint: 'Reach Woodcutting 25 or Combat 25, and Maggie may write you about it.',
    theme: 'cool',
    // Shows on the map once Maggie announces it (her intro quest is visible)
    isUnlocked: (s) => s.skills.woodcutting.level >= 25 || s.skills.combat.level >= 25 || !!s.questFlags.visited_greystone,
    skillsTaught: ['mining', 'smithing'],
  },
  {
    id: 'floor_3',
    number: 3,
    name: '???',
    npc: null,
    flavor: 'The map shows a smudge. Water, perhaps. A boat.',
    unlockHint: 'Conquer Greystone Reach first.',
    theme: 'wet',
    isUnlocked: () => false,
    skillsTaught: [],
  },
  {
    id: 'floor_4',
    number: 4,
    name: '???',
    npc: null,
    flavor: 'Pale light through unfamiliar leaves. Cold to look at.',
    unlockHint: 'Conquer Greystone Reach first.',
    theme: 'haunted',
    isUnlocked: () => false,
    skillsTaught: [],
  },
  {
    id: 'floor_5',
    number: 5,
    name: '???',
    npc: null,
    flavor: 'A glow from below. Heat. Pressure.',
    unlockHint: 'Conquer Greystone Reach first.',
    theme: 'forged',
    isUnlocked: () => false,
    skillsTaught: [],
  },
];

export function getFloor(id: FloorId): FloorDef {
  return FLOORS.find(f => f.id === id) ?? FLOORS[0];
}

export function getCurrentFloor(state: GameState): FloorDef {
  return getFloor(state.currentFloor ?? 'splinterwood');
}

export function unlockFloor(state: GameState, id: FloorId): void {
  if (id === 'greystone_reach') state.questFlags.greystone_unlocked = true;
  // (Future floors will set their own flags.)
}

export function setCurrentFloor(state: GameState, id: FloorId): void {
  const floor = getFloor(id);
  if (!floor.isUnlocked(state)) return;
  state.currentFloor = id;
}
