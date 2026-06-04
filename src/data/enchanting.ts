// ============================================================================
// ENCHANTING — "Tempering" data (Floor 3, taught by Laileb)
// ============================================================================
//
// Tempering spends Enchanting reagents (rare ENEMY drops) to push a single
// piece of gear up one enchant level at a time. Each level adds a flat % to
// that item's core combat stats (atk/def/hp). There is NO cap — this is the
// infinite scaling layer that keeps early gear viable forever, so a Floor-1
// carved sword can be tempered into a serious endgame weapon.
//
// The cost ladder pulls the player up the foe ladder: low levels want the
// reagent from the easiest foe, higher levels demand reagents from tougher
// foes, and the quantity grows every level — an endless sink that keeps every
// tier of combat worth farming.

// +% to atk/def/hp per enchant level. Applied in playerStats.instanceStats.
export const ENCHANT_PER_LEVEL = 0.10;

// Reagent ladder, easiest foe first. Higher temper levels require reagents
// further down this list.
export const ENCHANT_REAGENTS: string[] = [
  'reagent_goblin_eye',
  'reagent_boar_tusk',
  'reagent_bandit_knuckle',
  'reagent_brigand_brand',
  'reagent_taxman_seal',
  'reagent_troll_toe',
  'reagent_golem_core',
];

// How many levels each reagent tier covers before the next tier is required.
const LEVELS_PER_TIER = 3;

// Cost to temper FROM `level` to `level + 1`.
export function temperCost(level: number): { reagentId: string; qty: number } {
  const tierIdx = Math.min(ENCHANT_REAGENTS.length - 1, Math.floor(level / LEVELS_PER_TIER));
  // Quantity grows every level so the sink never runs dry; gentle early so the
  // first few enchants are reachable from ordinary play.
  const qty = 2 + Math.floor(level / 2);
  return { reagentId: ENCHANT_REAGENTS[tierIdx], qty };
}

// The total stat multiplier an item at `level` enjoys (for display: "+40%").
export function enchantMultiplier(level: number): number {
  return 1 + ENCHANT_PER_LEVEL * Math.max(0, level);
}
