// ============================================================================
// RARE REAGENTS — the drop tables that feed Alchemy and Enchanting
// ============================================================================
//
// Two new crafting-material streams, both riding the game's existing rare-drop
// machinery so the "rare drop chance" perks (gather_rare / drop_rate /
// combat_drop_bonus) already make them more common:
//
//   • Alchemy reagents  — rare drops from GATHERING nodes (one per node tier).
//   • Enchanting reagents — rare drops from FOES (one per foe).
//
// Both begin dropping from the very first node / first foe, long before the
// player can use them (Alchemy + Enchanting unlock on Floor 3). That's
// intentional: the player hoards mysterious oddities and only later learns
// what they were for.

// ---- Alchemy: gather-node id -> reagent item id ----
export const GATHER_REAGENT: Record<string, string> = {
  // Woodcutting
  twig:      'reagent_twig_burl',
  oak:       'reagent_oak_bulb',
  pine:      'reagent_pinecone',
  ironbark:  'reagent_ironbud',
  // Mining
  sandstone: 'reagent_sand_pearl',
  greystone: 'reagent_grey_geode',
  bluerock:  'reagent_blue_gem',
  veinstone: 'reagent_veinheart',
};

// ---- Enchanting: foe id -> reagent item id ----
export const FOE_REAGENT: Record<string, string> = {
  goblin:  'reagent_goblin_eye',
  boar:    'reagent_boar_tusk',
  bandit:  'reagent_bandit_knuckle',
  brigand: 'reagent_brigand_brand',
  taxman:  'reagent_taxman_seal',
  troll:   'reagent_troll_toe',
  golem:   'reagent_golem_core',
};

// Base drop chances BEFORE rare/drop_rate perks are applied. Tuned low so a
// reagent feels like a small event; perks and trinkets push it higher.
export const REAGENT_GATHER_CHANCE = 0.04;
export const REAGENT_FOE_CHANCE = 0.06;

// Fast membership test — used to give reagent drops the gold "rare find"
// announcement instead of the ordinary loot line.
export const ALL_REAGENT_IDS: Set<string> = new Set([
  ...Object.values(GATHER_REAGENT),
  ...Object.values(FOE_REAGENT),
]);

export function isReagent(itemId: string): boolean {
  return ALL_REAGENT_IDS.has(itemId);
}
