// ============================================================================
// SKILL TREES — four category trees
// ============================================================================
//
// One tree per category: Gathering, Crafting, Combat, Leadership.
//
// POINT POOL FEEDING:
//   - Gathering tree: spent from woodcutting + mining perk points
//   - Crafting tree:  spent from carving + smithing perk points
//   - Combat tree:    spent from combat perk points
//   - Leadership:     spent from "leadership points" earned per helper hired (1 pt/hire)
//
// Adding new perks: append to the appropriate branch array. The tree UI and
// engine consume this data directly — no other file touch needed unless you're
// adding a brand-new effect key (in which case wire it in engine.ts or
// playerStats.ts).
//
// COMPATIBILITY NOTE: Several existing engine reads use legacy keys like
// `wc_speed`, `cv_save`, etc. Perks below emit BOTH the new unified key AND
// any matching legacy keys so existing engine code keeps working. When we
// clean up the engine in a future pass we can drop the legacy duplicates.
//
// FUTURE-PROOFING: Some perks below are intentionally named for rabbit-hole
// expansion — when we add curio drops, hidden nodes, or maker-tag systems
// later, these perks (Wisp-Touched, Old Roads, Signature Mark, The Whisperwood)
// can be upgraded with additional effects without renaming.

import type { Perk, SkillId } from '../types';

export type CategoryTreeId = 'gathering' | 'crafting' | 'combat' | 'leadership';
export type BranchId = string;
export type Tier = 1 | 2 | 3 | 4 | 5;

export interface CategoryPerk extends Perk {
  branch: BranchId;
  tier: Tier;
}

export interface Branch {
  id: BranchId;
  label: string;
  sub: string;
  perks: CategoryPerk[];
}

export interface CategoryTree {
  id: CategoryTreeId;
  label: string;
  subtitle: string;
  branches: Branch[];
  ladder?: CategoryPerk[];
}

// =============================================================================
// GATHERING TREE
// =============================================================================
const GATHERING: CategoryTree = {
  id: 'gathering',
  label: 'GATHERING',
  subtitle: 'fed by woodcutting + mining perk points',
  branches: [
    {
      id: 'harvest', label: 'HARVEST', sub: 'fill the satchel',
      perks: [
        { id: 'gather_harvest_1', branch: 'harvest', tier: 1, name: 'Sharper Tools', cost: 1,
          desc: '+5% gather yield.',
          effect: { gather_yield: 0.05 } },
        { id: 'gather_harvest_2', branch: 'harvest', tier: 2, name: 'Keen Eye', cost: 2,
          desc: '+10% gather yield (stacks).',
          effect: { gather_yield: 0.10 } },
        { id: 'gather_harvest_3', branch: 'harvest', tier: 3, name: 'Double Swing', cost: 3,
          desc: '5% chance for double yield.',
          effect: { gather_double: 0.05, wc_double: 0.05, mn_double: 0.05 } },
        { id: 'gather_harvest_4', branch: 'harvest', tier: 4, name: 'Wide Cut', cost: 4,
          desc: '+10% chance for double yield (stacks).',
          effect: { gather_double: 0.10, wc_double: 0.10, mn_double: 0.10 } },
        { id: 'gather_harvest_cap', branch: 'harvest', tier: 5, name: 'The Bounty', cost: 5,
          desc: 'Every 5th gather: free extra yield.',
          effect: { gather_free_5th: 1 } },
      ],
    },
    {
      id: 'tempo', label: 'TEMPO', sub: 'level fast',
      perks: [
        { id: 'gather_tempo_1', branch: 'tempo', tier: 1, name: 'Quick Hands', cost: 1,
          desc: '+5% gather speed.',
          effect: { gather_speed: 0.05, wc_speed: 0.05, mn_speed: 0.05 } },
        { id: 'gather_tempo_2', branch: 'tempo', tier: 2, name: 'Steady Rhythm', cost: 2,
          desc: '+10% gather speed (stacks).',
          effect: { gather_speed: 0.10, wc_speed: 0.10, mn_speed: 0.10 } },
        { id: 'gather_tempo_3', branch: 'tempo', tier: 3, name: 'Brisk Step', cost: 3,
          desc: '+15% gather XP.',
          effect: { gather_xp: 0.15, wc_xp: 0.15, mn_xp: 0.15 } },
        { id: 'gather_tempo_4', branch: 'tempo', tier: 4, name: 'Flowstate', cost: 4,
          desc: '+20% gather speed (stacks).',
          effect: { gather_speed: 0.20, wc_speed: 0.20, mn_speed: 0.20 } },
        { id: 'gather_tempo_cap', branch: 'tempo', tier: 5, name: 'The Steady Hand', cost: 5,
          desc: 'Gather helpers move +25% faster.',
          effect: { gather_helper_speed: 0.25 } },
      ],
    },
    {
      id: 'lore', label: 'LORE', sub: 'find depth',
      perks: [
        { id: 'gather_lore_1', branch: 'lore', tier: 1, name: "Forager's Eye", cost: 1,
          desc: '+5% rare drop chance.',
          effect: { gather_rare: 0.05, wc_rare: 0.05 } },
        { id: 'gather_lore_2', branch: 'lore', tier: 2, name: 'Memory of Trees', cost: 2,
          desc: '+10% gather XP (stacks).',
          effect: { gather_xp: 0.10, wc_xp: 0.10, mn_xp: 0.10 } },
        // FUTURE rabbit-hole: replace with curio drops + lore notes
        { id: 'gather_lore_3', branch: 'lore', tier: 3, name: 'Wisp-Touched', cost: 3,
          desc: '+10% coin from selling gathered items.',
          effect: { gather_sell_bonus: 0.10 } },
        // FUTURE rabbit-hole: replace with hidden node unlocks
        { id: 'gather_lore_4', branch: 'lore', tier: 4, name: 'Old Roads', cost: 4,
          desc: '+15% rare drop chance (stacks).',
          effect: { gather_rare: 0.15, wc_rare: 0.15 } },
        // FUTURE rabbit-hole: trees occasionally "speak" (add lore entry drops)
        { id: 'gather_lore_cap', branch: 'lore', tier: 5, name: 'The Whisperwood', cost: 5,
          desc: '1% chance each gather: drop 50 coin.',
          effect: { gather_coin_drop_chance: 0.01 } },
      ],
    },
  ],
};

// =============================================================================
// CRAFTING TREE
// =============================================================================
const CRAFTING: CategoryTree = {
  id: 'crafting',
  label: 'CRAFTING',
  subtitle: 'fed by carving + smithing perk points',
  branches: [
    {
      id: 'quality', label: 'QUALITY', sub: 'make it better',
      perks: [
        { id: 'craft_quality_1', branch: 'quality', tier: 1, name: 'Careful Cut', cost: 1,
          desc: '+3% chance to upgrade crafted tier.',
          effect: { craft_tier_up: 0.03 } },
        { id: 'craft_quality_2', branch: 'quality', tier: 2, name: 'Steady Pour', cost: 2,
          desc: '+5% chance to upgrade crafted tier (stacks).',
          effect: { craft_tier_up: 0.05 } },
        { id: 'craft_quality_3', branch: 'quality', tier: 3, name: 'Modifier Sense', cost: 3,
          desc: '+15% chance crafted items roll a modifier.',
          effect: { craft_modifier_roll: 0.15 } },
        { id: 'craft_quality_4', branch: 'quality', tier: 4, name: 'No Slop', cost: 4,
          desc: 'Crafted items never roll Regrettable tier.',
          effect: { craft_no_regrettable: 1 } },
        { id: 'craft_quality_cap', branch: 'quality', tier: 5, name: 'Master Work', cost: 5,
          desc: '2% chance any crafted item rolls Unreasonable tier.',
          effect: { craft_unreasonable_chance: 0.02 } },
      ],
    },
    {
      id: 'tempo', label: 'TEMPO', sub: 'craft faster',
      perks: [
        { id: 'craft_tempo_1', branch: 'tempo', tier: 1, name: 'Practiced Form', cost: 1,
          desc: '+5% craft speed.',
          effect: { craft_speed: 0.05, cv_speed: 0.05, sm_speed: 0.05 } },
        { id: 'craft_tempo_2', branch: 'tempo', tier: 2, name: 'Two At Once', cost: 2,
          desc: '3% chance to produce double output.',
          effect: { craft_double: 0.03 } },
        { id: 'craft_tempo_3', branch: 'tempo', tier: 3, name: 'Frugal Hand', cost: 3,
          desc: '10% chance to not consume materials.',
          effect: { craft_save: 0.10, cv_save: 0.10, sm_save: 0.10 } },
        { id: 'craft_tempo_4', branch: 'tempo', tier: 4, name: 'Sleeves Up', cost: 4,
          desc: '+25% craft speed (stacks).',
          effect: { craft_speed: 0.25, cv_speed: 0.25, sm_speed: 0.25 } },
        { id: 'craft_tempo_cap', branch: 'tempo', tier: 5, name: 'The Forge Burns', cost: 5,
          desc: 'Craft helpers move +25% faster.',
          effect: { craft_helper_speed: 0.25 } },
      ],
    },
    {
      id: 'mastery', label: 'MASTERY', sub: 'deeper craft',
      perks: [
        { id: 'craft_mastery_1', branch: 'mastery', tier: 1, name: 'Patient Eye', cost: 1,
          desc: '+10% craft XP.',
          effect: { craft_xp: 0.10, cv_xp: 0.10, sm_xp: 0.10 } },
        { id: 'craft_mastery_2', branch: 'mastery', tier: 2, name: 'Workshop Rhythm', cost: 2,
          desc: '+20% craft XP (stacks).',
          effect: { craft_xp: 0.20, cv_xp: 0.20, sm_xp: 0.20 } },
        { id: 'craft_mastery_3', branch: 'mastery', tier: 3, name: 'Sell Premium', cost: 3,
          desc: '+20% sell price on crafted items.',
          effect: { craft_sell_bonus: 0.20 } },
        // FUTURE rabbit-hole: maker tag system
        { id: 'craft_mastery_4', branch: 'mastery', tier: 4, name: 'Signature Mark', cost: 4,
          desc: '+40% sell price on crafted items (stacks).',
          effect: { craft_sell_bonus: 0.40 } },
        { id: 'craft_mastery_cap', branch: 'mastery', tier: 5, name: "The Maker's Circle", cost: 5,
          desc: 'All crafted items +1 tier.',
          effect: { craft_all_tier_up: 1 } },
      ],
    },
  ],
};

// =============================================================================
// COMBAT TREE
// =============================================================================
const COMBAT: CategoryTree = {
  id: 'combat',
  label: 'COMBAT',
  subtitle: 'fed by combat perk points',
  branches: [
    {
      id: 'edge', label: 'EDGE', sub: 'hit harder',
      perks: [
        { id: 'combat_edge_1', branch: 'edge', tier: 1, name: 'Sharper Sword', cost: 1,
          desc: '+5% attack.',
          effect: { atk_pct: 0.05 } },
        { id: 'combat_edge_2', branch: 'edge', tier: 2, name: 'Find the Weak', cost: 2,
          desc: '+5% crit chance.',
          effect: { crit_chance: 0.05 } },
        { id: 'combat_edge_3', branch: 'edge', tier: 3, name: 'Press the Edge', cost: 3,
          desc: '+25% crit damage.',
          effect: { crit_dmg: 0.25 } },
        { id: 'combat_edge_4', branch: 'edge', tier: 4, name: "Berserker's Cold", cost: 4,
          desc: '+1% attack per 1% missing HP.',
          effect: { atk_per_missing_hp: 0.01 } },
        { id: 'combat_edge_cap', branch: 'edge', tier: 5, name: 'The Killing Blow', cost: 5,
          desc: 'Crits on foes under 25% HP deal 3× damage.',
          effect: { killing_blow: 1 } },
      ],
    },
    {
      id: 'ward', label: 'WARD', sub: 'outlast',
      perks: [
        { id: 'combat_ward_1', branch: 'ward', tier: 1, name: 'Tough Hide', cost: 1,
          desc: '+5% defense.',
          effect: { def_pct: 0.05 } },
        { id: 'combat_ward_2', branch: 'ward', tier: 2, name: 'Iron Constitution', cost: 2,
          desc: '+15 max HP.',
          effect: { max_hp_flat: 15, cb_hp: 15 } },
        { id: 'combat_ward_3', branch: 'ward', tier: 3, name: 'Second Breath', cost: 3,
          desc: 'Heal 2% max HP on every kill.',
          effect: { heal_per_kill: 0.02 } },
        { id: 'combat_ward_4', branch: 'ward', tier: 4, name: 'Spite', cost: 4,
          desc: 'Reflect 5% of damage taken.',
          effect: { retribution: 0.05 } },
        { id: 'combat_ward_cap', branch: 'ward', tier: 5, name: 'Stonefoot', cost: 5,
          desc: 'First hit each fight is ignored entirely.',
          effect: { first_hit_ignored: 1 } },
      ],
    },
    {
      id: 'cunning', label: 'CUNNING', sub: 'win smarter',
      perks: [
        { id: 'combat_cunning_1', branch: 'cunning', tier: 1, name: 'Light Fingers', cost: 1,
          desc: '+10% coin from foes.',
          effect: { coin_from_foes: 0.10, cb_coin: 0.10 } },
        { id: 'combat_cunning_2', branch: 'cunning', tier: 2, name: 'Scavenger', cost: 2,
          desc: '+20% foe drop chance.',
          effect: { foe_drop_rate: 0.20, cb_drops: 0.20 } },
        { id: 'combat_cunning_3', branch: 'cunning', tier: 3, name: 'Cooler Head', cost: 3,
          desc: '-10% ability cooldowns.',
          effect: { cooldown_reduction: 0.10 } },
        { id: 'combat_cunning_4', branch: 'cunning', tier: 4, name: 'Patient Hunter', cost: 4,
          desc: '+25% combat XP.',
          effect: { combat_xp: 0.25, cb_xp: 0.25 } },
        { id: 'combat_cunning_cap', branch: 'cunning', tier: 5, name: 'The Quartermaster', cost: 5,
          desc: 'Every kill rolls drops twice.',
          effect: { double_drops: 1 } },
      ],
    },
  ],
};

// =============================================================================
// LEADERSHIP LADDER (linear, no branches)
// =============================================================================
const LEADERSHIP: CategoryTree = {
  id: 'leadership',
  label: 'LEADERSHIP',
  subtitle: '1 point per helper hired · linear ladder',
  branches: [],
  ladder: [
    { id: 'lead_1', branch: 'ladder', tier: 1, name: 'First Apprentice', cost: 1,
      desc: 'Helpers move +5% faster.',
      effect: { helper_speed: 0.05 } },
    { id: 'lead_2', branch: 'ladder', tier: 1, name: 'Pay the Rate', cost: 2,
      desc: 'Helper hiring cost -10%.',
      effect: { hire_cost_reduction: 0.10 } },
    { id: 'lead_3', branch: 'ladder', tier: 2, name: 'Honest Wage', cost: 2,
      desc: 'Helpers produce +5% yield.',
      effect: { helper_yield: 0.05 } },
    { id: 'lead_4', branch: 'ladder', tier: 2, name: 'Sturdy Stock', cost: 2,
      desc: 'Helpers move +10% faster (stacks).',
      effect: { helper_speed: 0.10 } },
    { id: 'lead_5', branch: 'ladder', tier: 3, name: 'Coordinated Crew', cost: 2,
      desc: 'Helpers produce +1% yield per other hire.',
      effect: { helper_yield_per_hire: 0.01 } },
    { id: 'lead_6', branch: 'ladder', tier: 3, name: "Apprentice's Cut", cost: 3,
      desc: 'Helpers gain +5% rare drop chance.',
      effect: { helper_rare_drop: 0.05 } },
    { id: 'lead_7', branch: 'ladder', tier: 4, name: 'Inheritance', cost: 3,
      desc: 'Helper hiring cost -20% (stacks).',
      effect: { hire_cost_reduction: 0.20 } },
    { id: 'lead_cap', branch: 'ladder', tier: 5, name: 'The Guild', cost: 4,
      desc: 'All helpers +15% to everything they do.',
      effect: { helper_everything: 0.15 } },
  ],
};

// =============================================================================
// EXPORT
// =============================================================================
export const CATEGORY_TREES: Record<CategoryTreeId, CategoryTree> = {
  gathering: GATHERING,
  crafting: CRAFTING,
  combat: COMBAT,
  leadership: LEADERSHIP,
};

// Flat list of every perk across every tree.
export const ALL_PERKS: CategoryPerk[] = [
  ...GATHERING.branches.flatMap(b => b.perks),
  ...CRAFTING.branches.flatMap(b => b.perks),
  ...COMBAT.branches.flatMap(b => b.perks),
  ...(LEADERSHIP.ladder ?? []),
];

// Legacy stub — App.tsx still imports PERK_TREES. The Self → Skill Trees
// subtab now uses CATEGORY_TREES instead, but we keep this so the import
// resolves and any leftover references default to "empty per-skill trees."
export const PERK_TREES: Record<SkillId, Perk[]> = {
  woodcutting: [],
  carving:     [],
  combat:      [],
  mining:      [],
  smithing:    [],
  alchemy:     [],
  enchanting:  [],
};
