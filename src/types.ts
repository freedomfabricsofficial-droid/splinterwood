// Core type definitions for the game.

export type SkillId = 'woodcutting' | 'carving' | 'combat' | 'mining' | 'smithing' | 'alchemy' | 'enchanting';
export type TaskKind = 'wc' | 'cv' | 'cb' | 'mn' | 'sm' | 'al';

export type ItemCategory =
  | 'material'      // raw gathering resources
  | 'reagent'       // rare crafting reagents (feed Alchemy/Enchanting)
  | 'equipment'     // weapons, shields, armor
  | 'consumable'    // potions, food, scrolls
  | 'loot'          // monster drops meant for selling
  | 'quest'         // un-sellable, special handling
  | 'curio';        // rare/trophy/lore items

export interface WoodcuttingNode {
  id: string;
  name: string;
  level: number;
  time: number;
  xp: number;
  yield: string;
  flavor: string;
}

export interface CarvingRecipe {
  id: string;
  name: string;
  level: number;
  time: number;
  xp: number;
  cost: Record<string, number>;
  produces: string;
  flavor: string;
}

export interface CombatFoe {
  id: string;
  name: string;
  level: number;
  hp: number;
  atk: number;
  xp: number;
  coin: number;
  drops: { id: string; chance: number }[];
  flavor: string;
  poolId?: string;   // pool grouping for the new combat tab (combat.ts)
}

export interface ItemDef {
  name: string;
  sell: number;
  category: ItemCategory;
  equip?: {
    slot?: EquipSlot;        // which slot this fills (defaults inferred from atk/def)
    atk?: number;
    def?: number;
    hp?: number;
    crit?: number;
    crit_dmg?: number;
    speed?: number;
    // Utility stats for non-combat items (e.g. trinkets that boost drop rate)
    gather_speed?: number;
    craft_speed?: number;
    coin_find?: number;
    drop_rate?: number;
    xp_gain?: number;
  };
  consume?: ConsumeEffect;
  flavor?: string;
}

export interface ConsumeEffect {
  // What happens when the player uses one. All fields optional.
  heal?: number;                  // restore HP
  healPercent?: number;           // restore % of max HP
  xpBoost?: { skill: SkillId | 'all'; amount: number; durationSec: number };
  instantXp?: { skill: SkillId | 'all'; amount: number };
  coinBonus?: number;             // gain coin directly
  description: string;            // shown in tooltip
}

export interface ActiveBuff {
  source: string;        // item id that granted this
  skill: SkillId | 'all';
  multiplier: number;    // bonus xp multiplier (0.5 = +50%)
  expiresAt: number;     // ms timestamp
}

export interface Perk {
  id: string;
  name: string;
  cost: number;
  desc: string;
  effect: Record<string, number | boolean>;
  requires?: string;
  exclusive?: string;
}

export interface SkillState {
  // Always Decimal at runtime. XP can compound to astronomical values
  // across many levels. Never use raw operators on this — go through
  // bignum helpers.
  xp: import('break_eternity.js').default;
  level: number;
  perkPoints: number;
  owned: Record<string, boolean>;
}

export interface ActiveTask {
  kind: TaskKind;
  id: string;
  progress: number;
  totalTime: number;
  // Always Decimal at runtime, or null for non-combat tasks
  foeHp: import('break_eternity.js').default | null;
  // Snapshot of player HP at task start (combat only). Decimal-typed for the
  // same reason as state.hp.
  playerHp?: import('break_eternity.js').default;
}

export interface HelperDef {
  id: string;
  name: string;
  description: string;
  flavor: string;
  hireCost: number;
  kind: TaskKind;
  taskId: string;
  speedMultiplier: number;     // 1.0 = full player speed (the AdCap manager model)
  requiredSkill?: SkillId;
  requiredLevel?: number;
  introLine?: string;          // shown in hire celebration modal
  floorTag?: string;           // displayed next to the group header (e.g. "Greystone Reach")
}

export interface ShopItem {
  id: string;
  cost: number;
  stockType: 'unlimited' | 'daily';
  dailyStock?: number;
  unlockSkill?: SkillId;
  unlockLevel?: number;
}

export interface ReturnSummary {
  elapsedSeconds: number;
  taskName: string | null;
  taskCompletions: number;
  xpGained: Partial<Record<SkillId, number>>;
  levelsGained: Partial<Record<SkillId, number>>;
  perkPointsGained: number;
  coinGained: number;
  itemsGained: Record<string, number>;
  rareEvents: string[];
}

// ---------- Equipment system (instance-based) ----------

export type QualityTier = 'regrettable' | 'forgettable' | 'adequate' | 'suspicious' | 'unreasonable';

export type EquipSlot = 'weapon' | 'offhand' | 'head' | 'body' | 'hands' | 'trinket';

export interface ItemInstance {
  id: string;              // base item id (e.g. 'item_sword')
  tier: QualityTier;
  modifier: string | null; // modifier id from modifiers data, or null for "none"
  instId: string;          // unique per-instance id
  locked?: boolean;        // user-locked from sell-all
  // Enchanting "Temper" level. Each level adds a flat % to this item's core
  // combat stats (atk/def/hp) — an uncapped scaling layer so even a Floor-1
  // carved sword can become an endgame weapon. Defaults to 0 / undefined.
  // Tempered items are auto-locked so they're never folded back into a stack
  // (which would lose the enchant). See systems/enchanting.ts.
  enchantLevel?: number;
}

// Stack-by-tier compression for non-favorite items. Each base item id maps to
// a record of tier → { count, mods }. The `mods` sub-map tracks how many of
// the count had each modifier (key '' = plain/no modifier).
//
// Stacks let the inventory scale to millions of dropped items: a million
// regrettable clubs is one integer + a small mod count map, not a million
// objects. Items become instances (ItemInstance) only when equipped or
// when the player explicitly locks them.
export interface EquipStack {
  count: number;                          // total instances in this tier
  mods: Record<string, number>;           // modifier id -> count; '' = plain
}

// ---------- Stat system (flexible bag) ----------

export type StatKey =
  | 'hp' | 'atk' | 'def'
  | 'crit' | 'crit_dmg' | 'speed'
  | 'gather_speed' | 'craft_speed'
  | 'coin_find' | 'drop_rate' | 'xp_gain'
  // Combat-only bonuses that apply ONLY to foe kill rewards. Distinct from
  // the general coin_find/drop_rate which apply to all coin/drop sources.
  | 'combat_coin_bonus' | 'combat_drop_bonus';

export interface StatBlock {
  // Sparse. Missing keys default to 0.
  // Multiplicative values (e.g. +0.10 for +10%) are stored as fractions.
  // Additive values (e.g. +12 atk) are stored as raw numbers.
  [key: string]: number;
}

// ---------- Abilities (cooldown-based combat skills) ----------

export interface AbilityState {
  lastUsedAt: number;       // ms timestamp, 0 if never used
}

export interface GameState {
  version: number;
  // These are always Decimal-typed at runtime. Always go through bignum
  // helpers (bAdd, bSub, bGte, etc.) when reading or writing. Never use
  // raw operators (+=, -=, >=, etc.) — TypeScript will refuse, and even
  // if you bypass it, the result will silently corrupt.
  coin: import('break_eternity.js').default;
  hp: import('break_eternity.js').default;
  maxHp: import('break_eternity.js').default;
  inv: Record<string, number>;
  // Equipment instances — kept as individual entries only for equipped or
  // user-locked items. All other drops live in equipStacks (see below).
  equipInstances: Record<string, ItemInstance[]>;
  // Stack-compressed equipment: baseId -> tier -> {count, mods}. Holds the
  // vast majority of drops; scales to millions of items. Equipping pulls
  // one out into equipInstances; unequipping returns it to a stack.
  equipStacks: Record<string, Partial<Record<QualityTier, EquipStack>>>;
  skills: Record<SkillId, SkillState>;
  // OLD: weapon/shield. NEW: full 6-slot equip pointing at instIds.
  equipped: { weapon: string | null; shield: string | null };
  equippedInst: Partial<Record<EquipSlot, string | null>>;  // slot -> instId
  task: ActiveTask | null;          // gather/craft only (kind: 'wc'|'cv'|'mn'|'sm')
  combatTask: ActiveTask | null;    // combat only (kind: 'cb') — parallel to task
  questIndex: number;
  questClaimed: Record<string, boolean>;
  questFlags: Record<string, boolean>;
  helpersHired: Record<string, boolean>;
  helpersProgress: Record<string, number>;
  satchelLocked: Record<string, boolean>;
  satchelCollapsed: Record<string, boolean>;
  idleSince: number;
  shopState: Record<string, number>;
  shopLastReset: number;
  activeBuffs: ActiveBuff[];
  lastTick: number;
  lastSave: number;
  lastSwingAt?: number;
  journalUnlocked?: Record<string, boolean>;
  // Daily reward system (formerly Maggie's letters, now a standalone button).
  // The streak fields are shared with the old letter system for save compat.
  dailyLetterLastClaim?: number;  // ms timestamp of last claim
  dailyLetterStreak?: number;     // current streak day (1..30, wraps after 30)
  // Letter queue (added v0.79): up to 3 letters can stack while the player
  // is away. nextLetterReadyAt is the timestamp at which the next queue
  // increment will happen. lettersQueued is the current count waiting to
  // be claimed (cap = 3; further accrued letters are lost).
  lettersQueued?: number;
  nextLetterReadyAt?: number;
  dailyBread?: number;
  doodlesOwned?: Record<string, boolean>;
  counterPurchases?: Record<string, number>;
  permBonuses?: {
    maxHp?: number;
    // Unified speed buffs (current model — affect all gather/craft skills)
    gatherSpeed?: number;
    craftSpeed?: number;
    // Legacy per-skill buffs (kept for back-compat with old saves)
    wcSpeed?: number;
    cvSpeed?: number;
    mnSpeed?: number;
    smSpeed?: number;
    sellBonus?: number;
  };
  // Floor system
  currentFloor?: 'splinterwood' | 'greystone_reach' | 'floor_3' | 'floor_4' | 'floor_5';
  // Abilities
  abilityState?: Record<string, AbilityState>;
  // Leadership ladder — separate point pool, fed by hiring helpers (1 pt/hire)
  leadershipPoints?: number;
  leadershipOwned?: Record<string, boolean>;
  pagesFound?: Record<string, boolean>;  // collected journal pages — see data/pages.ts
  pagesUnread?: Record<string, boolean>;  // pages found but not yet opened in the Tome
  // Queue of unseen lore discoveries. Engine pushes onto this when a page
  // (or future: curio / note) drops. React tick checks the head of the
  // queue and shows the DiscoveryModal. Player dismisses → shift queue.
  pendingDiscoveries?: PendingDiscovery[];
  // Queue of story letters (Maggie, Brock, etc.) waiting to be read. These
  // are triggered by gameplay thresholds, not by daily cadence. Daily rewards
  // are now claimed via a separate button — see data/dailyRewards.ts.
  pendingStoryLetters?: string[];  // array of story letter ids; see data/storyLetters.ts
  // Which combat pool the player has selected. Drives random foe selection
  // in the new combat tab layout. Defaults to 'splinterwood-t1'.
  selectedCombatPool?: string;
  // Tracks foes hit this combat for "first hit ignored" perk effect
  combatFirstHitConsumed?: boolean;

  // ---------- Prestige: "Cook the Books" ----------
  // Slush is the carryover currency earned by cooking the books. Decimal so it
  // can compound across many loops without precision loss — always go through
  // bignum helpers (bAdd/bSub/bGte/...), never raw operators.
  slush?: import('break_eternity.js').default;
  slushLifetime?: import('break_eternity.js').default; // total Slush ever earned
  loopCount?: number;                          // times the books have been cooked
  investmentsOwned?: Record<string, number>;   // investment id -> level owned

  // Expenses — a within-run coin sink (resets every loop, like skills/helpers).
  expensesOwned?: Record<string, number>;      // expense id -> level owned this run
}

// Lore discovery — for the blocking discovery modal. Today only 'page' exists.
// Future: 'curio', 'note', 'sigil', whatever new lore-item types we add.
export interface PendingDiscovery {
  kind: 'page' | 'curio' | 'note';
  refId: string;  // id of the page / curio / etc — looked up in its data file
}
