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
      { level: 30, what: 'Wovenbark Gloves (hands) — Cloud Islands' },
      { level: 36, what: 'Driftwood Charm (trinket) — Cloud Islands' },
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
      { level: 30, what: 'Cloudiron Helm (head) — Cloud Islands' },
      { level: 36, what: 'Sky-Forged Cuirass (body) — Cloud Islands' },
    ],
    introducedOn: 'Greystone Reach',
  },
  alchemy: {
    id: 'alchemy',
    name: 'Alchemy',
    flavor: '"Everything is a tonic if you\'re brave enough." — Laileb',
    description: 'Brew tonics from rare reagents that drop while gathering (oak bulbs, pinecones, pulsing gems...). Tonics grant timed XP boosts — and because the reagents only come from gathering, every gathering skill stays worth doing forever.',
    usedIn: ['Workshop → Alchemy'],
    unlocks: [
      { level: 1,  what: 'Swiftroot Tonic (+25% XP)' },
      { level: 10, what: 'Ember Tincture (+50% XP)' },
      { level: 22, what: 'Veil Extract (+85% XP)' },
    ],
    introducedOn: 'The Cloud Islands',
  },
  enchanting: {
    id: 'enchanting',
    name: 'Enchanting',
    flavor: '"Old steel, new spite. Same blade." — Laileb',
    description: 'Temper the gear you already own, spending reagents that drop from foes. Each temper adds a flat % to a weapon or armor\'s power, with no cap — so a Floor-1 carved sword can become an endgame weapon. Gear is improved, never replaced.',
    usedIn: ['Workshop → Enchanting'],
    unlocks: [
      { level: 1,  what: 'Temper equipped or locked gear (+10% per level)' },
    ],
    introducedOn: 'The Cloud Islands',
  },
};

// Which skills are visible to the player. Skills the player hasn't unlocked
// (e.g. mining before they've visited Greystone) are still listed but greyed.
export function getVisibleSkills(state: import('../types').GameState): SkillId[] {
  const visible: SkillId[] = ['woodcutting', 'carving', 'combat'];
  if (state.questFlags.visited_greystone) visible.push('mining', 'smithing');
  if (state.questFlags.visited_floor3) visible.push('alchemy', 'enchanting');
  return visible;
}

export function getAllSkillsForDisplay(state: import('../types').GameState): { id: SkillId; locked: boolean }[] {
  const visible = new Set(getVisibleSkills(state));
  const all: SkillId[] = ['woodcutting', 'carving', 'combat', 'mining', 'smithing', 'alchemy', 'enchanting'];
  return all.map(id => ({ id, locked: !visible.has(id) }));
}
