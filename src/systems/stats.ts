// Stats compatibility wrapper.
//
// The "real" stat math lives in systems/playerStats.ts which aggregates all
// sources (base + equipped instances + perks + perm bonuses + buffs) into a
// flexible bag of stats. The engine has many callers using totalAtk/totalDef/
// totalMaxHp from this file, so we keep them as thin wrappers that read from
// computePlayerStats.

import type { GameState } from '../types';
import { ITEMS } from '../data/items';
import { computePlayerStats, addItemInstance, equipInstance, instanceStats, findInstanceById, addEquipDrop } from './playerStats';
import { rollTier, rollModifier } from '../data/modifiers';
import { perkEffect, perkFlag } from './perks';
import { bToNumber } from '../util/bignum';

// Combat power (attack, defense, and max HP) grows with combat level so leveling
// actually makes you stronger AND tougher — keeping pace with the per-level coin/XP
// scaling and the foe tier ladder, and keeping your gear relevant deep into the game
// (it's part of the pool that gets multiplied). TUNABLE: raise COMBAT_POWER_GROWTH to
// make levels feel stronger, lower it to make gear/perks/investments matter relatively
// more. Defense/HP scale a touch gentler so deeper tiers stay a real threat.
const COMBAT_POWER_GROWTH = 1.03;
const COMBAT_SURVIVAL_GROWTH = 1.025;
export function combatDamageMult(combatLevel: number): number {
  return Math.pow(COMBAT_POWER_GROWTH, Math.max(0, combatLevel - 1));
}
export function combatSurvivalMult(combatLevel: number): number {
  return Math.pow(COMBAT_SURVIVAL_GROWTH, Math.max(0, combatLevel - 1));
}

export function totalAtk(state: GameState): number {
  // stats.atk now already includes: equipment + base fist + cb_atk perk + atk_pct multiplier.
  // Only the situational missing-HP scaling stays here (it changes per-swing).
  const stats = computePlayerStats(state);
  let total = stats.atk ?? 0;
  const perMissing = perkEffect(state, 'atk_per_missing_hp');
  if (perMissing > 0) {
    const maxHp = stats.hp ?? 20;
    const missingPct = maxHp > 0 ? Math.max(0, 1 - bToNumber(state.hp) / maxHp) : 0;
    total *= 1 + perMissing * missingPct * 100;
  }
  // Combat-level damage scaling — leveling combat makes every hit land harder.
  total *= combatDamageMult(state.skills.combat.level);
  return Math.floor(total);
}

export function totalDef(state: GameState): number {
  // stats.def includes equipment + cb_def perk + def_pct multiplier, then scales
  // with combat level so defense keeps pace with the foe ladder.
  return Math.floor((computePlayerStats(state).def ?? 0) * combatSurvivalMult(state.skills.combat.level));
}

export function totalMaxHp(state: GameState): number {
  // stats.hp includes equipment + cb_hp perk + max_hp_flat + Maggie multipliers,
  // then scales with combat level so survivability keeps pace with the foe ladder.
  return Math.floor((computePlayerStats(state).hp ?? 20) * combatSurvivalMult(state.skills.combat.level));
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

// autoEquip: when an equipment item is crafted, decide whether the new roll
// is better than the currently-equipped item in that slot. If better,
// promote to an ItemInstance and equip; if not, fold into the equipStacks
// so the inventory doesn't bloat with thousands of useless rolls.
import type { QualityTier } from '../types';

export function autoEquip(state: GameState, baseId: string): void {
  const def = ITEMS[baseId];
  if (!def?.equip?.slot) return;

  // Build crafting perk options that influence the roll
  const rollOpts = {
    tierUpChance:        perkEffect(state, 'craft_tier_up'),
    noRegrettable:       perkFlag(state, 'craft_no_regrettable'),
    unreasonableChance:  perkEffect(state, 'craft_unreasonable_chance'),
    alwaysTierUp:        perkFlag(state, 'craft_all_tier_up'),
    modifierRollBoost:   perkEffect(state, 'craft_modifier_roll'),
  };
  const tier = rollTier(rollOpts);
  const modifier = rollModifier(rollOpts);

  const slot = def.equip.slot;
  state.equippedInst = state.equippedInst ?? {};
  const currentId = state.equippedInst[slot];

  // Score helper: weigh atk, def, and half hp as a rough power score.
  const score = (s: import('../types').StatBlock) =>
    Math.max(s.atk ?? 0, s.def ?? 0, (s.hp ?? 0) * 0.5);
  // Synthesize "what would the new instance score" without allocating.
  const tmpInst = { id: baseId, tier, modifier, instId: '_tmp' } as import('../types').ItemInstance;
  const newScore = score(instanceStats(tmpInst));

  let curScore = -Infinity;
  if (currentId) {
    const cur = findInstanceById(state, currentId);
    if (cur) curScore = score(instanceStats(cur));
  }

  if (newScore > curScore) {
    // Upgrade: allocate an instance and equip it. The previously-equipped
    // item (if any and unlocked) demotes back into the stack.
    const inst = addItemInstance(state, baseId, tier, modifier);
    if (currentId) {
      const old = findInstanceById(state, currentId);
      if (old && !old.locked) {
        addEquipDrop(state, old.id, old.tier, old.modifier);
        // Drop the old instance entry now that its data is in the stack
        const map = state.equipInstances ?? {};
        for (const bid of Object.keys(map)) {
          const i = map[bid].findIndex(x => x.instId === currentId);
          if (i >= 0) { map[bid].splice(i, 1); break; }
        }
        state.equippedInst[slot] = null;
      }
    }
    equipInstance(state, inst.instId);
  } else {
    // Not better. Fold into the stack — no allocation.
    addEquipDrop(state, baseId, tier as QualityTier, modifier);
  }

  // Legacy compat: keep the old pointers in sync so any unmigrated UI still works.
  if (slot === 'weapon')  state.equipped.weapon  = baseId;
  if (slot === 'offhand') state.equipped.shield  = baseId;
}
