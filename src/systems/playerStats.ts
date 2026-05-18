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

// Compute the full stat block for the player.
export function computePlayerStats(state: GameState): StatBlock {
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

  // Permanent bonuses
  if (state.permBonuses) {
    if (state.permBonuses.maxHp)     out.hp = (out.hp ?? 0) + state.permBonuses.maxHp;
    if (state.permBonuses.wcSpeed)   out.gather_speed = (out.gather_speed ?? 0) + state.permBonuses.wcSpeed;
    if (state.permBonuses.mnSpeed)   out.gather_speed = (out.gather_speed ?? 0) + state.permBonuses.mnSpeed;
    if (state.permBonuses.cvSpeed)   out.craft_speed = (out.craft_speed ?? 0) + state.permBonuses.cvSpeed;
    if (state.permBonuses.smSpeed)   out.craft_speed = (out.craft_speed ?? 0) + state.permBonuses.smSpeed;
    if (state.permBonuses.sellBonus) out.coin_find = (out.coin_find ?? 0) + state.permBonuses.sellBonus;
  }

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

  return out;
}

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

// Equipment management
export function addItemInstance(state: GameState, baseId: string, tier: import('../types').QualityTier, modifier: string | null): ItemInstance {
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

function rollInstId(): string {
  return 'i_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function equipInstance(state: GameState, instId: string): boolean {
  state.equippedInst = state.equippedInst ?? {};
  const inst = findInstanceById(state, instId);
  if (!inst) return false;
  const def = ITEMS[inst.id];
  if (!def?.equip?.slot) return false;
  state.equippedInst[def.equip.slot] = instId;
  return true;
}

export function unequipSlot(state: GameState, slot: EquipSlot): void {
  if (!state.equippedInst) return;
  state.equippedInst[slot] = null;
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
