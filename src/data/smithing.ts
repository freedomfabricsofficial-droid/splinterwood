// Smithing recipes — floor 2 production skill.
// Same shape as CARVING_RECIPES.

export interface SmithingRecipe {
  id: string;
  name: string;
  level: number;
  time: number;
  xp: number;
  cost: Record<string, number>;
  produces: string;
  flavor: string;
}

export const SMITHING_RECIPES: SmithingRecipe[] = [
  {
    id: 'iron_pick',
    name: 'Iron Pick',
    level: 1,
    time: 4.0,
    xp: 36,
    cost: { ore_sandstone: 1 },
    produces: 'item_pick',
    flavor: 'Crude. Functional. Better than fingers.',
  },
  {
    id: 'stone_buckler',
    name: 'Stone Buckler',
    level: 6,
    time: 6.0,
    xp: 76,
    cost: { ore_greystone: 2 },
    produces: 'item_buckler',
    flavor: 'Heavy. Worth it.',
  },
  {
    id: 'greystone_maul',
    name: 'Greystone Maul',
    level: 14,
    time: 8.5,
    xp: 150,
    cost: { ore_greystone: 3 },
    produces: 'item_maul',
    flavor: 'Brock approves. Once.',
  },
  {
    id: 'veinforged_blade',
    name: 'Veinforged Blade',
    level: 26,
    time: 12.0,
    xp: 330,
    cost: { ore_veinstone: 1, ore_bluerock: 2 },
    produces: 'item_veinblade',
    flavor: 'Hums when you hold it.',
  },
];
