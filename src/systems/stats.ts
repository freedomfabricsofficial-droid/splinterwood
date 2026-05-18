// Stats compatibility wrapper.
//
// The "real" stat math lives in systems/playerStats.ts which aggregates all
// sources (base + equipped instances + perks + perm bonuses + buffs) into a
// flexible bag of stats. The engine has many callers using totalAtk/totalDef/
// totalMaxHp from this file, so we keep them as thin wrappers that read from
// computePlayerStats.

import type { GameState } from '../types';
import { ITEMS } from '../data/items';
import { computePlayerStats, addItemInstance, equipInstance, instanceStats, findInstanceById } from './playerStats';
import { rollTier, rollModifier } from '../data/modifiers';
import { perkEffect } from './perks';

export function totalAtk(state: GameState): number {
  const stats = computePlayerStats(state);
  const baseFist = 2 + perkEffect(state, 'cb_atk');
  return Math.floor(baseFist + (stats.atk ?? 0));
}

export function totalDef(state: GameState): number {
  const stats = computePlayerStats(state);
  return Math.floor(perkEffect(state, 'cb_def') + (stats.def ?? 0));
}

export function totalMaxHp(state: GameState): number {
  const stats = computePlayerStats(state);
  return Math.floor((stats.hp ?? 20) + perkEffect(state, 'cb_hp'));
}

// New getters for the new stat axes.
export function totalCrit(state: GameState): number {
  return computePlayerStats(state).crit ?? 0;
}
export function totalCritDmg(state: GameState): number {
  return computePlayerStats(state).crit_dmg ?? 0.5;
}
export function totalSpeed(state: GameState): number {
  return computePlayerStats(state).speed ?? 0;
}

// autoEquip: when an equipment item is acquired, add it as an instance and
// auto-equip it ONLY if it scores better than what's currently in the slot.
export function autoEquip(state: GameState, baseId: string): void {
  const def = ITEMS[baseId];
  if (!def?.equip?.slot) return;

  const tier = rollTier();
  const modifier = rollModifier();
  const inst = addItemInstance(state, baseId, tier, modifier);

  const slot = def.equip.slot;
  state.equippedInst = state.equippedInst ?? {};
  const currentId = state.equippedInst[slot];
  const newStats = instanceStats(inst);
  const score = (s: import('../types').StatBlock) =>
    Math.max(s.atk ?? 0, s.def ?? 0, (s.hp ?? 0) * 0.5);

  if (currentId) {
    const cur = findInstanceById(state, currentId);
    if (cur) {
      const curScore = score(instanceStats(cur));
      const newScore = score(newStats);
      if (newScore > curScore) equipInstance(state, inst.instId);
    } else {
      equipInstance(state, inst.instId);
    }
  } else {
    equipInstance(state, inst.instId);
  }

  // Legacy compat: keep the old pointers in sync so any unmigrated UI still works.
  if (slot === 'weapon')  state.equipped.weapon  = baseId;
  if (slot === 'offhand') state.equipped.shield  = baseId;
}
