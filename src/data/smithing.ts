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
  // Floor 3 cloud-gear (taught on The Cloud Islands; gated by visited_floor3 in the registry).
  // Forged armor for the empty head/body slots — Temperable, so it scales forever.
  {
    id: 'cloudiron_helm',
    name: 'Cloudiron Helm',
    level: 30,
    time: 11.0,
    xp: 320,
    cost: { ore_bluerock: 2, ore_greystone: 4, reagent_sand_pearl: 1 },
    produces: 'item_cloudhelm',
    flavor: 'Light as fog, cold as the climb.',
  },
  {
    id: 'sky_cuirass',
    name: 'Sky-Forged Cuirass',
    level: 36,
    time: 14.0,
    xp: 440,
    cost: { ore_veinstone: 2, ore_bluerock: 3, reagent_grey_geode: 1 },
    produces: 'item_skycuirass',
    flavor: 'Forged where the air runs thin.',
  },
];
