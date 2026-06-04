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
  // Floor 3 cloud-gear (The Cloud Islands) — crafted by extending Carving + Smithing.
  // Fills the previously-empty head/body/hands/trinket slots, so it ADDS a layer
  // instead of out-stating the weapon/offhand ladder. Armor pieces (def/hp) are
  // Temperable; the charm is pure crit utility, a deliberate exotic slot.
  item_cloudhelm:  { name: 'Cloudiron Helm',     sell: 700,  category: 'equipment', equip: { slot: 'head',    def: 5, hp: 8 },                                  flavor: 'Light as fog, cold as the climb up.' },
  item_skycuirass: { name: 'Sky-Forged Cuirass', sell: 1500, category: 'equipment', equip: { slot: 'body',    def: 8, hp: 16 },                                 flavor: 'Forged where the air runs thin. So does your patience.' },
  item_wovengloves:{ name: 'Wovenbark Gloves',   sell: 600,  category: 'equipment', equip: { slot: 'hands',   def: 3, gather_speed: 0.06, craft_speed: 0.06 },   flavor: 'Supple bark, somehow. Laileb won\'t say how.' },
  item_driftcharm: { name: 'Driftwood Charm',    sell: 900,  category: 'equipment', equip: { slot: 'trinket', crit: 0.05, crit_dmg: 0.15 },                      flavor: 'Driftwood from a sea no one can point to.' },

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

  // Alchemy tonics (Floor 3 — brewed from earlier-floor materials)
  tonic_swiftroot: {
    name: 'Swiftroot Tonic',
    sell: 8,
    category: 'consumable',
    flavor: 'Laileb swears it\'s "mostly root." The "mostly" does a lot of work.',
    consume: {
      xpBoost: { skill: 'all', amount: 0.25, durationSec: 300 },
      description: '+25% XP to all skills for 5 minutes.',
    },
  },
  tonic_ember: {
    name: 'Ember Tincture',
    sell: 30,
    category: 'consumable',
    flavor: 'Warms you from the inside. Possibly forever. Drink responsibly.',
    consume: {
      xpBoost: { skill: 'all', amount: 0.5, durationSec: 420 },
      description: '+50% XP to all skills for 7 minutes.',
    },
  },
  tonic_veil: {
    name: 'Veil Extract',
    sell: 110,
    category: 'consumable',
    flavor: 'Tastes like a word you almost remember. Then don\'t.',
    consume: {
      xpBoost: { skill: 'all', amount: 0.85, durationSec: 600 },
      description: '+85% XP to all skills for 10 minutes.',
    },
  },

  // Loot — bumped 3x; foe drops are now real money
  meat_scrap:    { name: 'Meat Scrap',        sell: 6,    category: 'loot', flavor: 'Definitely meat. Probably.' },
  coin_purse:    { name: 'Coin Purse',        sell: 75,   category: 'loot', flavor: 'Has someone else\'s initials embroidered on it.' },
  troll_tooth:   { name: "Troll's Tooth",     sell: 240,  category: 'loot', flavor: 'Still warm. Best not to think about it.' },

  // --- Alchemy reagents (rare GATHERING drops) ---
  // Flavor is deliberately mysterious: these start dropping long before the
  // player can brew anything, so they read as "useful for... something."
  reagent_twig_burl: { name: 'Twig Burl',          sell: 18,  category: 'reagent', flavor: 'A knotted swelling in the wood. It twitches if you watch too long.' },
  reagent_oak_bulb:  { name: 'Oak Bulb',           sell: 30,  category: 'reagent', flavor: 'Swollen, warm, faintly humming. Surely good for something.' },
  reagent_pinecone:  { name: 'Resinous Pinecone',  sell: 45,  category: 'reagent', flavor: 'Weeps a sap that smells of a memory you can\'t place.' },
  reagent_ironbud:   { name: 'Ironbark Bud',       sell: 90,  category: 'reagent', flavor: 'Hard as a coin and twice as reluctant to open.' },
  reagent_sand_pearl:{ name: 'Sand Pearl',         sell: 35,  category: 'reagent', flavor: 'A bead the desert spat up. Cool, against all reason.' },
  reagent_grey_geode:{ name: 'Grey Geode',         sell: 60,  category: 'reagent', flavor: 'Something rattles inside. You decide not to open it. Yet.' },
  reagent_blue_gem:  { name: 'Pulsing Blue Gem',   sell: 120, category: 'reagent', flavor: 'It keeps a slow, patient beat. Like it\'s waiting.' },
  reagent_veinheart: { name: 'Veinheart Shard',    sell: 200, category: 'reagent', flavor: 'Warm in the dark. Warmer when you think about it.' },

  // --- Enchanting reagents (rare ENEMY drops) ---
  reagent_goblin_eye:    { name: 'Goblin Eye',          sell: 25,  category: 'reagent', flavor: 'Still looking at something. You\'d rather not know what.' },
  reagent_boar_tusk:     { name: 'Powdered Boar Tusk',  sell: 50,  category: 'reagent', flavor: 'Ground fine. Smells of pepper and bad decisions.' },
  reagent_bandit_knuckle:{ name: "Bandit's Knucklebone",sell: 80,  category: 'reagent', flavor: 'Polished smooth by nervous thumbs. Lucky, allegedly.' },
  reagent_brigand_brand: { name: "Brigand's Brand",     sell: 120, category: 'reagent', flavor: 'A scrap of branded leather. The mark means nothing to you. Yet.' },
  reagent_taxman_seal:   { name: "Taxman's Wax Seal",   sell: 160, category: 'reagent', flavor: 'Pressed with a sigil that makes your teeth itch.' },
  reagent_troll_toe:     { name: 'Troll Toe',           sell: 220, category: 'reagent', flavor: 'Regenerates slightly when no one is looking. Keep it in the bag.' },
  reagent_golem_core:    { name: 'Golem Core',          sell: 320, category: 'reagent', flavor: 'A stone that remembers being told what to do.' },
};

// Display order of categories in the satchel.
export const CATEGORY_ORDER: ItemCategory[] = [
  'equipment', 'material', 'reagent', 'consumable', 'loot', 'quest', 'curio',
];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  equipment:  'Equipment',
  material:   'Materials',
  reagent:    'Reagents',
  consumable: 'Consumables',
  loot:       'Loot',
  quest:      'Quest Items',
  curio:      'Curios',
};
