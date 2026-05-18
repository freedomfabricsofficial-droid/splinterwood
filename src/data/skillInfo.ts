// Skill descriptions for the Self > Skills overview tab.
//
// Each entry describes what the skill is, where in the game it's used, and
// what content tiers unlock at certain levels. This is the player's reference
// for "what does this number do?" and "what should I level next?"

import type { SkillId } from '../types';

export interface SkillInfo {
  id: SkillId;
  name: string;
  flavor: string;
  description: string;     // what it does mechanically
  usedIn: string[];        // where in the game this skill appears
  // Major unlocks tied to level milestones. Used as a roadmap on the tab.
  unlocks: { level: number; what: string }[];
  // Optional: which floor first introduces this skill.
  introducedOn?: string;
}

export const SKILL_INFO: Record<SkillId, SkillInfo> = {
  woodcutting: {
    id: 'woodcutting',
    name: 'Woodcutting',
    flavor: '"It is just trees, all the way down."',
    description: 'Chop trees to gather logs. Logs are the raw material for Carving and feed most early-game crafting.',
    usedIn: ['Gather → Woodcutting', 'Hired Help (Twig-Picker Pim, Old Bess, The Whittling Boy)'],
    unlocks: [
      { level: 1,  what: 'Surly Oak (oak logs)' },
      { level: 8,  what: 'Stoic Pine (pine logs)' },
      { level: 25, what: 'Ironbark Elder (ironbark logs)' },
      { level: 25, what: 'Greystone Reach becomes accessible (with Maggie\'s note)' },
    ],
    introducedOn: 'Splinterwood',
  },
  carving: {
    id: 'carving',
    name: 'Carving',
    flavor: '"Sharp end goes outward. Mostly."',
    description: 'Carve logs into weapons and gear. Each carved piece rolls a quality tier and may have a modifier prefix.',
    usedIn: ['Workshop → Carving'],
    unlocks: [
      { level: 1,  what: 'Knobbly Club (weapon)' },
      { level: 4,  what: 'Bark Shield (offhand)' },
      { level: 12, what: 'Pinewood Sword (weapon)' },
      { level: 22, what: 'Ironbark Greatbow (weapon)' },
    ],
    introducedOn: 'Splinterwood',
  },
  combat: {
    id: 'combat',
    name: 'Combat',
    flavor: '"Higher number, generally, wins."',
    description: 'Fight foes for coin, loot, and XP. Combat levels unlock harder foes and your four cooldown abilities.',
    usedIn: ['Fight district', 'Cooldown abilities'],
    unlocks: [
      { level: 1,  what: 'Goblin (low-level foe)' },
      { level: 5,  what: 'Ability: Second Wind' },
      { level: 8,  what: 'Recreational Boar' },
      { level: 10, what: 'Ability: Rally' },
      { level: 15, what: 'Bandit + Ability: Iron Skin' },
      { level: 25, what: 'Bridge Troll + Ability: Bloodlust' },
    ],
    introducedOn: 'Splinterwood',
  },
  mining: {
    id: 'mining',
    name: 'Mining',
    flavor: '"Stone breaks. Eventually." — Brock',
    description: 'Mine ore from the Greystone Reach. Ore is the raw material for Smithing.',
    usedIn: ['Gather → Mining'],
    unlocks: [
      { level: 1,  what: 'Sandstone Shelf' },
      { level: 8,  what: 'Greystone Vein' },
      { level: 16, what: 'Bluerock Outcrop' },
      { level: 28, what: 'Veinstone Cluster' },
    ],
    introducedOn: 'Greystone Reach',
  },
  smithing: {
    id: 'smithing',
    name: 'Smithing',
    flavor: '"Heat. Hammer. Wait." — Brock',
    description: 'Forge ore into weapons and gear. Higher-tier smithing yields more powerful equipment with better tier rolls.',
    usedIn: ['Workshop → Smithing'],
    unlocks: [
      { level: 1,  what: 'Iron Pick (weapon)' },
      { level: 6,  what: 'Stone Buckler (offhand)' },
      { level: 14, what: 'Greystone Maul (weapon)' },
      { level: 20, what: 'Brock\'s human moment quest' },
      { level: 26, what: 'Veinforged Blade (weapon)' },
    ],
    introducedOn: 'Greystone Reach',
  },
};

// Which skills are visible to the player. Skills the player hasn't unlocked
// (e.g. mining before they've visited Greystone) are still listed but greyed.
export function getVisibleSkills(state: import('../types').GameState): SkillId[] {
  const visible: SkillId[] = ['woodcutting', 'carving', 'combat'];
  if (state.questFlags.visited_greystone) visible.push('mining', 'smithing');
  return visible;
}

export function getAllSkillsForDisplay(state: import('../types').GameState): { id: SkillId; locked: boolean }[] {
  const visible = new Set(getVisibleSkills(state));
  const all: SkillId[] = ['woodcutting', 'carving', 'combat', 'mining', 'smithing'];
  return all.map(id => ({ id, locked: !visible.has(id) }));
}
