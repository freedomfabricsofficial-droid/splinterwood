import type { ItemDef, ItemCategory } from '../types';

// Sell-value tuning notes:
//   Materials: 1.5x bump from prior values. Cheap enough to keep crafting
//     decisions meaningful, but selling 20 oak logs should now feel like real income.
//   Equipment: 2.5-3x bump. Crafted-and-sold gear is the second-biggest
//     income lever after combat. Players should *want* to sell extras.
//   Loot: 3x bump. Boar drops, bandit purses are real money now.
//   Tonics: cost adjusted in shop.ts; sell prices stay low (not really for resale).
export const ITEMS: Record<string, ItemDef> = {
  // Materials
  log_twig:      { name: 'Twig Log',          sell: 2,    category: 'material', flavor: 'Less log, more twig with self-esteem.' },
  log_oak:       { name: 'Oak Log',           sell: 6,    category: 'material', flavor: 'Hefty. Honest. Smells of old grudges.' },
  log_pine:      { name: 'Pine Log',          sell: 18,   category: 'material', flavor: 'Resin-rich. Will ruin a saw and a mood.' },
  log_ironbark:  { name: 'Ironbark Log',      sell: 75,   category: 'material', flavor: 'Heavier than coin, slower to anger.' },
  // Ores (Greystone Reach)
  ore_sandstone: { name: 'Sandstone Chunk',   sell: 3,    category: 'material', flavor: 'Crumbles in your hand. Disappointing.' },
  ore_greystone: { name: 'Greystone Block',   sell: 12,   category: 'material', flavor: 'Dependable. Brock would approve.' },
  ore_bluerock:  { name: 'Bluerock Shard',    sell: 40,   category: 'material', flavor: 'Cold to the touch even in summer.' },
  ore_veinstone: { name: 'Veinstone Nugget',  sell: 140,  category: 'material', flavor: 'Hums very faintly. Or you imagined it.' },

  // Equipment — selling extras (autoEquip keeps the best, sell the rest) is real income now
  item_club:     { name: 'Knobbly Club',      sell: 20,   category: 'equipment', equip: { slot: 'weapon',  atk: 2 },  flavor: 'A persuasive vegetable.' },
  item_shield:   { name: 'Bark Shield',       sell: 50,   category: 'equipment', equip: { slot: 'offhand', def: 2 },  flavor: 'Surprisingly aerodynamic when thrown.' },
  item_sword:    { name: 'Pinewood Sword',    sell: 200,  category: 'equipment', equip: { slot: 'weapon',  atk: 6 },  flavor: 'It splinters, but with conviction.' },
  item_greatbow: { name: 'Ironbark Greatbow', sell: 800,  category: 'equipment', equip: { slot: 'weapon',  atk: 14 }, flavor: 'Pulls back with a sound like an angry violin.' },
  // Smithed equipment (Greystone Reach)
  item_pick:     { name: 'Iron Pick',         sell: 50,   category: 'equipment', equip: { slot: 'weapon',  atk: 4 },  flavor: 'Sharp end goes outward. Brock said this.' },
  item_buckler:  { name: 'Stone Buckler',     sell: 150,  category: 'equipment', equip: { slot: 'offhand', def: 5 },  flavor: 'Heavy. Worth it.' },
  item_maul:     { name: 'Greystone Maul',    sell: 380,  category: 'equipment', equip: { slot: 'weapon',  atk: 10 }, flavor: 'Two-handed. The other hand is for balance.' },
  item_veinblade:{ name: 'Veinforged Blade',  sell: 1100, category: 'equipment', equip: { slot: 'weapon',  atk: 18 }, flavor: 'Hums when you hold it. Louder when you swing.' },

  // Consumables (sell prices unchanged; they're not resale items)
  potion_minor: {
    name: 'Minor Tonic',
    sell: 5,
    category: 'consumable',
    flavor: 'Tastes like apologies.',
    consume: { heal: 10, description: 'Restores 10 HP.' },
  },
  potion_greater: {
    name: 'Greater Tonic',
    sell: 22,
    category: 'consumable',
    flavor: 'Bitter, herbal, faintly self-righteous.',
    consume: { heal: 30, description: 'Restores 30 HP.' },
  },
  potion_full: {
    name: 'Full Tonic',
    sell: 90,
    category: 'consumable',
    flavor: 'Smells like a tavern that means business.',
    consume: { healPercent: 100, description: 'Restores HP to full.' },
  },
  potion_xp: {
    name: 'Scribbled Ledger Page',
    sell: 0,
    category: 'consumable',
    flavor: 'Reading it makes your skills feel important.',
    consume: {
      xpBoost: { skill: 'all', amount: 0.5, durationSec: 300 },
      description: '+50% XP to all skills for 5 minutes.',
    },
  },
  lucky_penny: {
    name: "Maggie's Lucky Penny",
    sell: 1,
    category: 'consumable',
    flavor: 'She swears it works. Maggie swears about a lot of things.',
    consume: { coinBonus: 100, description: 'Find 100 coin lining your pocket.' },
  },

  // Loot — bumped 3x; foe drops are now real money
  meat_scrap:    { name: 'Meat Scrap',        sell: 6,    category: 'loot', flavor: 'Definitely meat. Probably.' },
  coin_purse:    { name: 'Coin Purse',        sell: 75,   category: 'loot', flavor: 'Has someone else\'s initials embroidered on it.' },
  troll_tooth:   { name: "Troll's Tooth",     sell: 240,  category: 'loot', flavor: 'Still warm. Best not to think about it.' },
};

// Display order of categories in the satchel.
export const CATEGORY_ORDER: ItemCategory[] = [
  'equipment', 'material', 'consumable', 'loot', 'quest', 'curio',
];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  equipment:  'Equipment',
  material:   'Materials',
  consumable: 'Consumables',
  loot:       'Loot',
  quest:      'Quest Items',
  curio:      'Curios',
};
