// Stats computation. Aggregates all sources into a single StatBlock the rest
// of the engine can read from.
//
// Sources (in order of application):
//   1. Base stats (hardcoded baseline: hp=20, atk=0, def=0, crit=0.02, etc.)
//   2. Equipped items (per-slot, with tier multiplier and modifier deltas)
//   3. Perks (existing perkEffect aggregations)
//   4. Permanent bonuses (from Maggie's Counter purchases)
//   5. Active buffs (consumables, abilities)
//
// Item math:
//   final_stat = base_stat * tier_mult + modifier_stat_delta_as_flat_or_pct
//   For ATK/DEF/HP — modifier deltas multiply the *already-tier-scaled* base.
//     e.g. base atk=10, tier=suspicious (1.25x) -> 12.5; modifier "+10% atk" -> 13.75
//   For crit/speed/etc. — modifier deltas add directly (since these are already %).

import type { GameState, ItemInstance, StatBlock, StatKey, EquipSlot } from '../types';
import { ITEMS } from '../data/items';
import { QUALITY_MULT, getModifier } from '../data/modifiers';
import { perkEffect } from './perks';
import { investmentEffect } from '../data/investments';
import { expenseEffect } from '../data/expenses';
import { bAdd } from '../util/bignum';

export const BASE_STATS: StatBlock = {
  hp: 20,
  atk: 0,
  def: 0,
  crit: 0.02,        // 2% baseline crit
  crit_dmg: 0.50,    // crits deal +50%
  speed: 0,          // additive % to combat round speed
  gather_speed: 0,
  craft_speed: 0,
  coin_find: 0,
  drop_rate: 0,
  xp_gain: 0,
};

const PERCENT_STATS = new Set<StatKey>(['crit', 'crit_dmg', 'speed', 'gather_speed', 'craft_speed', 'coin_find', 'drop_rate', 'xp_gain']);

// Map item-equip-key -> stat-key (they're 1:1 currently but kept as a function
// in case we add aliasing later).
function itemStatToStatKey(k: string): StatKey | null {
  if (['hp','atk','def','crit','crit_dmg','speed','gather_speed','craft_speed','coin_find','drop_rate','xp_gain'].includes(k)) {
    return k as StatKey;
  }
  return null;
}

// Compute stat contribution of a single equipped instance.
export function instanceStats(inst: ItemInstance): StatBlock {
  const def = ITEMS[inst.id];
  if (!def?.equip) return {};

  const tierMult = QUALITY_MULT[inst.tier] ?? 1;
  const mod = getModifier(inst.modifier);

  const block: StatBlock = {};

  // Apply base stats with tier multiplier.
  for (const [k, raw] of Object.entries(def.equip)) {
    if (k === 'slot') continue;
    const sk = itemStatToStatKey(k);
    if (!sk || typeof raw !== 'number') continue;
    if (PERCENT_STATS.has(sk)) {
      // Percentage stats: tier still scales them (a higher-tier crit ring crits more)
      block[sk] = (block[sk] ?? 0) + raw * tierMult;
    } else {
      // Flat stats: scale by tier
      block[sk] = (block[sk] ?? 0) + raw * tierMult;
    }
  }

  // Apply modifier deltas. For flat stats (atk/def/hp), modifier values that
  // look like percentages (small fractional values) are treated as % of the
  // *base item value*. The convention is: modifier stat values in MODIFIERS
  // are always percentages (0.10 = +10%). Flat additions happen via the
  // tier multiplier system, not modifiers.
  if (mod) {
    for (const [k, raw] of Object.entries(mod.stats)) {
      const sk = itemStatToStatKey(k);
      if (!sk) continue;
      if (PERCENT_STATS.has(sk)) {
        block[sk] = (block[sk] ?? 0) + raw;
      } else {
        // For atk/def/hp: modifier value is a % of this item's base contribution
        const base = block[sk] ?? 0;
        block[sk] = base + base * raw;
      }
    }
  }

  return block;
}

// Short-lived memo. computePlayerStats is called many times per frame (combat
// rounds, totalAtk/Def/MaxHp wrappers, UI renders). It's pure for a given state
// within a frame, so we cache the result for a brief window to avoid recomputing
// the whole bag dozens of times per tick — this is the main combat-lag fix.
// The window is short enough (50ms) that buying gear/investments still feels instant.
let _psCache: StatBlock | null = null;
let _psCacheState: GameState | null = null;
let _psCacheAt = 0;

// Compute the full stat block for the player.
export function computePlayerStats(state: GameState): StatBlock {
  const _now = Date.now();
  if (_psCache && _psCacheState === state && _now - _psCacheAt < 50) return _psCache;
  const out: StatBlock = { ...BASE_STATS };

  // Equipped items
  for (const slot of Object.keys(state.equippedInst ?? {}) as EquipSlot[]) {
    const instId = state.equippedInst?.[slot];
    if (!instId) continue;
    const inst = findInstanceById(state, instId);
    if (!inst) continue;
    const block = instanceStats(inst);
    addStats(out, block);
  }

  // Permanent bonuses moved to the final pass — see below. They scale the
  // already-aggregated totals multiplicatively (Maggie rewards stack on
  // top of everything else and grow more powerful as the player builds up).

  // Perk effects — gather/craft speed (show the BEST across skills since
  // perks are now also unified via gather_speed/craft_speed keys).
  const gatherSpeed = perkEffect(state, 'gather_speed');
  const craftSpeed  = perkEffect(state, 'craft_speed');
  out.gather_speed = (out.gather_speed ?? 0) + gatherSpeed;
  out.craft_speed  = (out.craft_speed  ?? 0) + craftSpeed;

  // Combat perk effects → stats. These keys are emitted by the new Combat tree.
  out.crit      = (out.crit      ?? 0) + perkEffect(state, 'crit_chance');
  out.crit_dmg  = (out.crit_dmg  ?? 0) + perkEffect(state, 'crit_dmg');

  // Combat base + perks fold into the bag's atk/def/hp directly. This makes
  // stats.atk/stats.def/stats.hp the single number that means "how much the
  // player has of this stat right now," before any per-call situational math
  // (berserker missing-HP scaling). No more (as any) side channels.
  //
  // Base fist damage (2) + cb_atk perk add to flat atk.
  // Then atk_pct multiplies the result so percentage-based atk perks scale
  // the whole atk pool (fists + perks + equipment).
  out.atk = (out.atk ?? 0) + 2 + perkEffect(state, 'cb_atk');
  out.def = (out.def ?? 0) + perkEffect(state, 'cb_def');
  out.hp  = (out.hp  ?? 0) + perkEffect(state, 'cb_hp') + perkEffect(state, 'max_hp_flat');

  // Apply atk_pct/def_pct perks multiplicatively against the now-aggregated
  // atk/def values.
  const atkPctTotal = perkEffect(state, 'atk_pct');
  const defPctTotal = perkEffect(state, 'def_pct');
  if (atkPctTotal !== 0) out.atk = (out.atk ?? 0) * (1 + atkPctTotal);
  if (defPctTotal !== 0) out.def = (out.def ?? 0) * (1 + defPctTotal);

  // Combat-only reward bonuses. These are separate bag keys (not folded
  // into the general coin_find/drop_rate) because they ONLY apply to foe
  // kill rewards, not to gather/craft/sell coin or drops.
  out.combat_coin_bonus = (out.combat_coin_bonus ?? 0) + perkEffect(state, 'cb_coin');
  out.combat_drop_bonus = (out.combat_drop_bonus ?? 0) + perkEffect(state, 'cb_drops');
  // combat_xp adds to xp_gain for combat. We aggregate into xp_gain but only
  // for combat XP — the engine uses combat_xp directly via perkEffect.
  // (Display-only here; no action needed for the stat bag.)

  // Active buffs - support both legacy XP-multiplier buffs and new stat-delta buffs.
  const now = Date.now();
  for (const buff of state.activeBuffs ?? []) {
    if (buff.expiresAt <= now) continue;
    // Legacy XP multiplier buff
    if (buff.multiplier && buff.multiplier > 0) {
      out.xp_gain = (out.xp_gain ?? 0) + buff.multiplier;
    }
    // New stat-delta buff (cooldown abilities). We loosely typed the extra
    // `effect` field on the buff entry; if present, treat keys as stat deltas.
    const effect = (buff as any).effect as Record<string, number> | undefined;
    if (effect) {
      for (const [k, v] of Object.entries(effect)) {
        if (PERCENT_STATS.has(k as StatKey)) {
          out[k] = (out[k] ?? 0) + v;
        } else {
          // Flat stats get a multiplicative bonus (e.g. +30% atk on a 12-atk weapon = +3.6)
          out[k] = (out[k] ?? 0) + (out[k] ?? 0) * v;
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // Final passes: permBonuses (multiplicative), caps, overflow.
  // See stats-rules.md Section 3 + 7.
  // ---------------------------------------------------------------

  // Maggie's permanent bonuses scale the ALREADY-AGGREGATED totals.
  // This is the ONE deliberate exception to the additive-between-layers
  // rule: Maggie rewards stack on top of everything as a true multiplier,
  // so they grow more valuable as the player builds up.
  // Treated as 1+x multipliers, e.g. permBonuses.gatherSpeed = 0.05 means ×1.05.
  if (state.permBonuses) {
    // Max HP — flat add (not a percent stat)
    if (state.permBonuses.maxHp) out.hp = (out.hp ?? 0) + state.permBonuses.maxHp;
    // Aggregate gather/craft permBonuses (unified + legacy per-skill)
    const gatherMult = 1
      + (state.permBonuses.gatherSpeed ?? 0)
      + (state.permBonuses.wcSpeed ?? 0)
      + (state.permBonuses.mnSpeed ?? 0);
    const craftMult = 1
      + (state.permBonuses.craftSpeed ?? 0)
      + (state.permBonuses.cvSpeed ?? 0)
      + (state.permBonuses.smSpeed ?? 0);
    if (gatherMult !== 1) {
      // Apply to the (1 + gather_speed) factor so the multiplier scales the
      // whole bonus, not just the increment. 80% → 81.8% on a +1% counter.
      out.gather_speed = (1 + (out.gather_speed ?? 0)) * gatherMult - 1;
    }
    if (craftMult !== 1) {
      out.craft_speed = (1 + (out.craft_speed ?? 0)) * craftMult - 1;
    }
    // Sell bonus → coin_find (also multiplicative)
    if (state.permBonuses.sellBonus) {
      out.coin_find = (1 + (out.coin_find ?? 0)) * (1 + state.permBonuses.sellBonus) - 1;
    }
  }

  // Investments (prestige "Cook the Books") — permanent multipliers applied on
  // top of everything else, so they keep scaling as the player builds up. Speed
  // stacks multiplicatively like permBonuses; atk/def/hp scale the aggregated
  // pool; find adds into coin_find/drop_rate.
  const invSpeed = investmentEffect(state, 'inv_speed');
  if (invSpeed > 0) {
    out.gather_speed = (1 + (out.gather_speed ?? 0)) * (1 + invSpeed) - 1;
    out.craft_speed  = (1 + (out.craft_speed  ?? 0)) * (1 + invSpeed) - 1;
  }
  const invAtk = investmentEffect(state, 'inv_atk');
  if (invAtk > 0) out.atk = (out.atk ?? 0) * (1 + invAtk);
  const invDefHp = investmentEffect(state, 'inv_defhp');
  if (invDefHp > 0) {
    out.def = (out.def ?? 0) * (1 + invDefHp);
    out.hp  = (out.hp  ?? 0) * (1 + invDefHp);
  }
  const invFind = investmentEffect(state, 'inv_find');
  if (invFind > 0) {
    out.coin_find = (out.coin_find ?? 0) + invFind;
    out.drop_rate = (out.drop_rate ?? 0) + invFind;
  }

  // Expenses (within-run coin sink) — additive run boosts on top.
  const expSpeed = expenseEffect(state, 'exp_speed');
  if (expSpeed > 0) {
    out.gather_speed = (out.gather_speed ?? 0) + expSpeed;
    out.craft_speed  = (out.craft_speed  ?? 0) + expSpeed;
  }
  const expFind = expenseEffect(state, 'exp_find');
  if (expFind > 0) {
    out.coin_find = (out.coin_find ?? 0) + expFind;
    out.drop_rate = (out.drop_rate ?? 0) + expFind;
  }

  // Crit overflow: any crit chance past 100% converts 1:1 into crit damage.
  // Example: 1.20 crit → 1.00 crit + 0.20 added to crit_dmg.
  if ((out.crit ?? 0) > 1.0) {
    const overflow = (out.crit ?? 0) - 1.0;
    out.crit = 1.0;
    out.crit_dmg = (out.crit_dmg ?? 0.5) + overflow;
  }

  // Final hard caps. Applied AFTER crit overflow so the conversion still
  // happens, then the cap clamps. See stats-rules.md Section 7.
  for (const [key, cap] of Object.entries(STAT_CAPS)) {
    if (out[key] !== undefined && out[key] > cap) {
      out[key] = cap;
    }
  }

  _psCache = out;
  _psCacheState = state;
  _psCacheAt = _now;
  return out;
}

// Hard caps applied at the end of computePlayerStats. Stats not listed are
// uncapped (or capped via different logic like crit overflow).
const STAT_CAPS: Record<string, number> = {
  crit: 1.0,            // 100% (overflow already converted to crit_dmg above)
  gather_speed: 4.0,    // +400% — tasks at 1/5 base time
  craft_speed: 4.0,
  speed: 4.0,           // combat round speed
};

function addStats(target: StatBlock, src: StatBlock): void {
  for (const k of Object.keys(src)) {
    target[k] = (target[k] ?? 0) + src[k];
  }
}

export function findInstanceById(state: GameState, instId: string): ItemInstance | null {
  const insts = state.equipInstances ?? {};
  for (const baseId of Object.keys(insts)) {
    for (const inst of insts[baseId]) {
      if (inst.instId === instId) return inst;
    }
  }
  return null;
}

// Convenience getters
export function getStat(state: GameState, key: StatKey): number {
  return computePlayerStats(state)[key] ?? 0;
}

// ---------- Equipment management (stack-aware) ----------
//
// The game stores most equipment as STACKS (state.equipStacks) — one count
// per (baseId, tier) plus a modifier sub-count map. Only equipped or locked
// items live as full ItemInstances (state.equipInstances).
//
// Drops by default go into stacks. Equipping pulls one out of a stack into
// a tracked instance; unequipping returns it to the stack. The player can
// also "lock" any individual roll, which pulls a copy out of a stack into
// a tracked instance.

import type { QualityTier, EquipStack } from '../types';

// Add one dropped item. Goes into the stack by default — scales to millions.
export function addEquipDrop(state: GameState, baseId: string, tier: QualityTier, modifier: string | null): void {
  state.equipStacks = state.equipStacks ?? {};
  state.equipStacks[baseId] = state.equipStacks[baseId] ?? {};
  const tierStack: EquipStack = state.equipStacks[baseId][tier] ?? { count: 0, mods: {} };
  tierStack.count++;
  const modKey = modifier ?? '';
  tierStack.mods[modKey] = (tierStack.mods[modKey] ?? 0) + 1;
  state.equipStacks[baseId][tier] = tierStack;
}

// Legacy: create a full ItemInstance. Used by migration and any caller that
// explicitly wants an individualized item (e.g. when promoting on equip).
export function addItemInstance(state: GameState, baseId: string, tier: QualityTier, modifier: string | null): ItemInstance {
  state.equipInstances = state.equipInstances ?? {};
  state.equipInstances[baseId] = state.equipInstances[baseId] ?? [];
  const inst: ItemInstance = {
    id: baseId,
    tier,
    modifier,
    instId: rollInstId(),
  };
  state.equipInstances[baseId].push(inst);
  return inst;
}

// Pull one item out of a stack and create a tracked ItemInstance for it.
// Used when equipping from a stack or locking a stacked roll.
// Picks a specific modifier if provided, otherwise pulls a "plain" first
// then any modifier. Returns null if the stack is empty.
export function pullFromStack(
  state: GameState, baseId: string, tier: QualityTier, modifier?: string | null
): ItemInstance | null {
  const tierStack = state.equipStacks?.[baseId]?.[tier];
  if (!tierStack || tierStack.count <= 0) return null;
  const wantKey = modifier === undefined ? null : (modifier ?? '');
  let pickedKey: string | null = null;
  if (wantKey !== null) {
    if ((tierStack.mods[wantKey] ?? 0) > 0) pickedKey = wantKey;
  } else {
    // No preference: prefer plain ('') first, then any mod with count > 0.
    if ((tierStack.mods[''] ?? 0) > 0) pickedKey = '';
    else {
      for (const k of Object.keys(tierStack.mods)) {
        if (tierStack.mods[k] > 0) { pickedKey = k; break; }
      }
    }
  }
  if (pickedKey === null) return null;
  tierStack.count--;
  tierStack.mods[pickedKey]--;
  if (tierStack.mods[pickedKey] <= 0) delete tierStack.mods[pickedKey];
  if (tierStack.count <= 0) {
    delete state.equipStacks[baseId][tier];
  }
  return addItemInstance(state, baseId, tier, pickedKey === '' ? null : pickedKey);
}

// Push a tracked instance back into a stack (used on unequip and on
// "consolidate" actions). The instance is removed from equipInstances.
export function pushInstanceToStack(state: GameState, inst: ItemInstance): void {
  state.equipStacks = state.equipStacks ?? {};
  state.equipStacks[inst.id] = state.equipStacks[inst.id] ?? {};
  const tierStack: EquipStack = state.equipStacks[inst.id][inst.tier] ?? { count: 0, mods: {} };
  tierStack.count++;
  const modKey = inst.modifier ?? '';
  tierStack.mods[modKey] = (tierStack.mods[modKey] ?? 0) + 1;
  state.equipStacks[inst.id][inst.tier] = tierStack;
  removeInstance(state, inst.instId);
}

function rollInstId(): string {
  return 'i_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Equip a tracked instance. If a different unlocked instance was previously
// in the slot, demote it back to the stack so the inventory doesn't pile
// up with duplicates each time the player clicks "Equip one."
export function equipInstance(state: GameState, instId: string): boolean {
  state.equippedInst = state.equippedInst ?? {};
  const inst = findInstanceById(state, instId);
  if (!inst) return false;
  const def = ITEMS[inst.id];
  if (!def?.equip?.slot) return false;
  const slot = def.equip.slot;

  // Demote the previously-equipped item (if any) back to the stack.
  // Locked items stay as tracked instances.
  const priorId = state.equippedInst[slot];
  if (priorId && priorId !== instId) {
    const prior = findInstanceById(state, priorId);
    if (prior && !prior.locked) {
      pushInstanceToStack(state, prior);
    }
  }

  state.equippedInst[slot] = instId;
  return true;
}

// Unequip a slot. The instance demotes back to the stack so the inventory
// stays compressed (unless it's locked, in which case it stays as a
// tracked instance the player can re-equip later).
export function unequipSlot(state: GameState, slot: EquipSlot): void {
  if (!state.equippedInst) return;
  const id = state.equippedInst[slot];
  state.equippedInst[slot] = null;
  if (!id) return;
  const inst = findInstanceById(state, id);
  if (inst && !inst.locked) {
    pushInstanceToStack(state, inst);
  }
}

export function isInstanceEquipped(state: GameState, instId: string): boolean {
  if (!state.equippedInst) return false;
  for (const slot of Object.keys(state.equippedInst) as EquipSlot[]) {
    if (state.equippedInst[slot] === instId) return true;
  }
  return false;
}

export function removeInstance(state: GameState, instId: string): ItemInstance | null {
  const insts = state.equipInstances ?? {};
  for (const baseId of Object.keys(insts)) {
    const i = insts[baseId].findIndex(x => x.instId === instId);
    if (i >= 0) {
      const [removed] = insts[baseId].splice(i, 1);
      return removed;
    }
  }
  return null;
}

// Sell price reflects the tier multiplier so good rolls are worth more.
export function getInstanceSellPrice(inst: ItemInstance): number {
  const def = ITEMS[inst.id];
  if (!def) return 0;
  const tierMult = { regrettable: 0.4, forgettable: 0.7, adequate: 1.0, suspicious: 1.5, unreasonable: 2.5 }[inst.tier] ?? 1.0;
  return Math.floor(def.sell * tierMult);
}

// Sell price for a stack entry. Same tier multiplier; doesn't account for
// modifiers (modifiers do not affect sell price).
export function getStackUnitSellPrice(baseId: string, tier: QualityTier): number {
  const def = ITEMS[baseId];
  if (!def) return 0;
  const tierMult = { regrettable: 0.4, forgettable: 0.7, adequate: 1.0, suspicious: 1.5, unreasonable: 2.5 }[tier] ?? 1.0;
  return Math.floor(def.sell * tierMult);
}

// Sell a single equipment instance. Refuses equipped or locked items.
export function sellInstance(state: GameState, inst: ItemInstance): void {
  const def = ITEMS[inst.id];
  if (!def) return;
  if (isInstanceEquipped(state, inst.instId)) return;
  if (inst.locked) return;
  const price = getInstanceSellPrice(inst);
  state.coin = bAdd(state.coin, price);
  removeInstance(state, inst.instId);
}

// Sell N items from a stack (or all if count is omitted/exceeds available).
// Removes from the lowest-modifier-count bucket first (favors selling plain
// rolls before modifier'd ones — matches the player's likely intent).
export function sellFromStack(
  state: GameState, baseId: string, tier: QualityTier, count?: number
): { sold: number; total: number } {
  const tierStack = state.equipStacks?.[baseId]?.[tier];
  if (!tierStack || tierStack.count <= 0) return { sold: 0, total: 0 };
  const requested = count ?? tierStack.count;
  const toSell = Math.min(requested, tierStack.count);
  const unitPrice = getStackUnitSellPr