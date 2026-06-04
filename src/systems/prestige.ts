// ============================================================================
// PRESTIGE — "Cook the Books"
// ============================================================================
//
// The loop. Once the player has reached Greystone Reach they can "cook the books":
// wipe the current run (skills, coin, gear, helpers) in exchange for Slush — a
// carryover currency that buys permanent Investments and compounds every loop.
//
// Surface read: an accountant closing a fraudulent ledger and starting fresh.
// True read (kept dormant until Floors 3-5 + Maggie exist): the loop tightening.

import type { GameState, SkillId } from '../types';
import { Big, bAdd, bSub, bGte } from '../util/bignum';
import { getFloor } from '../data/floors';
import { cumulativeXpToLevelBig } from './leveling';
import { INVESTMENTS_BY_ID, investmentLevel, investmentCost } from '../data/investments';

const SKILL_IDS: SkillId[] = ['woodcutting', 'carving', 'combat', 'mining', 'smithing', 'alchemy', 'enchanting'];

// Whether the prestige system is available at all (drives the tab's locked state).
// Becomes permanently available the first time the player reaches Greystone Reach —
// and STAYS available across cooks (a reset drops them back to floor 1 / level 1,
// but they keep access to the books once they've earned it).
export function prestigeUnlocked(state: GameState): boolean {
  if (state.questFlags?.prestige_unlocked) return true;
  const reached = getFloor('greystone_reach').isUnlocked(state);
  if (reached) {
    state.questFlags = state.questFlags ?? {};
    state.questFlags.prestige_unlocked = true;
  }
  return reached;
}

// How much Slush cooking the books right now would yield. Scales super-linearly
// with total skill levels so deeper runs pay more — and because Investments make
// each run climb faster, the payout naturally compounds loop over loop.
export function slushReward(state: GameState): number {
  const s = state.skills;
  const sum =
    s.woodcutting.level + s.carving.level + s.combat.level + s.mining.level + s.smithing.level;
  return Math.floor(Math.pow(sum / 8, 1.5));
}

// Can the player cook right now? Unlocked AND the payout is worth at least 1 Slush.
export function canCookBooks(state: GameState): boolean {
  return prestigeUnlocked(state) && slushReward(state) >= 1;
}

// Buy one level of an investment with Slush. Returns true on success.
export function buyInvestment(state: GameState, id: string): boolean {
  const def = INVESTMENTS_BY_ID[id];
  if (!def) return false;
  const lvl = investmentLevel(state, id);
  if (lvl >= def.maxLevel) return false;
  const cost = investmentCost(def, lvl);
  if (!bGte(state.slush ?? Big(0), cost)) return false;
  state.slush = bSub(state.slush ?? Big(0), cost);
  state.investmentsOwned = state.investmentsOwned ?? {};
  state.investmentsOwned[id] = lvl + 1;
  return true;
}

// Perform the prestige reset. Returns the Slush gained and a flavor line, or null
// if not currently allowed.
export function cookTheBooks(state: GameState): { reward: number; line: string } | null {
  if (!canCookBooks(state)) return null;

  const reward = slushReward(state);
  state.slush = bAdd(state.slush ?? Big(0), reward);
  state.slushLifetime = bAdd(state.slushLifetime ?? Big(0), reward);
  state.loopCount = (state.loopCount ?? 0) + 1;

  // ---- Reset the run (classic idle): skills, coin, gear, inventory, helpers ----
  for (const sk of SKILL_IDS) {
    state.skills[sk] = { xp: Big(0), level: 1, perkPoints: 0, owned: {} };
  }
  state.coin = Big(0);
  state.hp = Big(20);
  state.maxHp = Big(20);
  state.inv = {};
  state.equipInstances = {};
  state.equipStacks = {};
  state.equipped = { weapon: null, shield: null };
  state.equippedInst = {};
  state.task = null;
  state.combatTask = null;
  state.helpersHired = {};
  state.helpersProgress = {};
  state.leadershipPoints = 0;
  state.leadershipOwned = {};
  state.expensesOwned = {};   // within-run coin sink resets with the run
  state.activeBuffs = [];
  state.questClaimed = {};
  state.questIndex = 0;
  state.satchelLocked = {};
  state.satchelCollapsed = {};
  state.abilityState = {};
  state.selectedCombatPool = undefined;
  state.combatFirstHitConsumed = false;
  state.currentFloor = 'splinterwood';
  state.idleSince = Date.now();

  // Keep narrative + world-unlock flags; drop run/quest-progress flags so the
  // questlines can be played again but the player keeps map access and story state.
  const keepFlag = (k: string) =>
    k.startsWith('maggie_') ||
    k === 'visited_greystone' || k === 'greystone_unlocked' ||
    k === 'visited_floor3' || k === 'floor3_unlocked' || k === 'died_once' ||
    k === 'prestige_unlocked';
  const oldFlags = state.questFlags ?? {};
  const newFlags: Record<string, boolean> = {};
  for (const k of Object.keys(oldFlags)) if (oldFlags[k] && keepFlag(k)) newFlags[k] = true;
  state.questFlags = newFlags;

  // ---- Apply 'start' investments to the fresh run ----
  const seedLevel = investmentLevel(state, 'seed_capital');
  if (seedLevel > 0) {
    state.coin = Big(INVESTMENTS_BY_ID['seed_capital'].perLevel * seedLevel);
  }
  const headLevel = investmentLevel(state, 'head_start');
  if (headLevel > 0) {
    const startLevel = 1 + INVESTMENTS_BY_ID['head_start'].perLevel * headLevel;
    for (const sk of SKILL_IDS) {
      state.skills[sk].level = startLevel;
      state.skills[sk].xp = cumulativeXpToLevelBig(startLevel);
      state.skills[sk].perkPoints = Math.floor(startLevel / 5); // perk points they'd have earned
    }
  }

  const line = `You cook the books. The ledger balances to zero — clean as fresh snow. ` +
    `Maggie says it's healthy to start over now and then. (Volume ${(state.loopCount ?? 0) + 1}.)`;
  return { reward, line };
}
