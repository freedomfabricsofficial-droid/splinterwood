// Core type definitions for the game.

export type SkillId = 'woodcutting' | 'carving' | 'combat' | 'mining' | 'smithing';
export type TaskKind = 'wc' | 'cv' | 'cb' | 'mn' | 'sm';

export type ItemCategory =
  | 'material'      // raw gathering resources
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
  xp: number;
  level: number;
  perkPoints: number;
  owned: Record<string, boolean>;
}

export interface ActiveTask {
  kind: TaskKind;
  id: string;
  progress: number;
  totalTime: number;
  foeHp: number | null;
  playerHp?: number;
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
}

// ---------- Stat system (flexible bag) ----------

export type StatKey =
  | 'hp' | 'atk' | 'def'
  | 'crit' | 'crit_dmg' | 'speed'
  | 'gather_speed' | 'craft_speed'
  | 'coin_find' | 'drop_rate' | 'xp_gain';

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
  coin: number;
  hp: number;
  maxHp: number;
  inv: Record<string, number>;
  // New: per-equipment-id, an array of instances (each is a unique rolled item).
  // Stacks of materials/consumables still live in `inv`. Only equipment uses this.
  equipInstances: Record<string, ItemInstance[]>;
  skills: Record<SkillId, SkillState>;
  // OLD: weapon/shield. NEW: full 6-slot equip pointing at instIds.
  equipped: { weapon: string | null; shield: string | null };
  equippedInst: Partial<Record<EquipSlot, string | null>>;  // slot -> instId
  task: ActiveTask | null;
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
  // Daily letter system (Maggie)
  dailyLetterLastClaim?: number;
  dailyLetterStreak?: number;
  dailyBread?: number;
  doodlesOwned?: Record<string, boolean>;
  counterPurchases?: Record<string, number>;
  permBonuses?: {
    maxHp?: number;
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
}
