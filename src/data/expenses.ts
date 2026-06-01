// ============================================================================
// EXPENSES — a within-run coin sink (the "Overheads" of the operation)
// ============================================================================
//
// Bought with COIN, and RESET every loop (handled in systems/prestige.ts,
// alongside skills/helpers). This gives coin a purpose for the whole run instead
// of piling up uselessly once helpers are hired, and creates a flywheel: earn
// coin -> buy speed/coin/xp -> earn faster -> bigger Slush payout when you cook.
//
// Distinct from Investments (which are permanent, bought with Slush). Expenses are
// the day-to-day spend that resets each fresh ledger.

import type { GameState } from '../types';
import { bGte, bSub } from '../util/bignum';

export interface ExpenseDef {
  id: string;
  name: string;
  flavor: string;        // surface-innocent business cost; quietly shady if you know
  effectLabel: string;   // plain language: what this boosts
  effectKey: string;     // 'exp_speed' | 'exp_coin' | 'exp_xp' | 'exp_find'
  perLevel: number;      // fraction granted per owned level (0.04 = +4%)
  baseCost: number;      // coin cost for the first level
  costGrowth: number;    // cost multiplier per level owned
  maxLevel: number;
}

export const EXPENSES: ExpenseDef[] = [
  { id: 'sharper_tools', name: 'Sharper Tools',
    flavor: '"A dull tool is a slow theft of your time."',
    effectLabel: 'Gathering & crafting speed',
    effectKey: 'exp_speed', perLevel: 0.04, baseCost: 150, costGrowth: 1.4, maxLevel: 50 },

  { id: 'bulk_orders', name: 'Bulk Orders',
    flavor: '"Buy low, sell whatever you can get away with."',
    effectLabel: 'Coin earned from everything',
    effectKey: 'exp_coin', perLevel: 0.04, baseCost: 200, costGrowth: 1.4, maxLevel: 50 },

  { id: 'night_shifts', name: 'Night Shifts',
    flavor: '"The work does not sleep. Neither, lately, do you."',
    effectLabel: 'XP earned from everything',
    effectKey: 'exp_xp', perLevel: 0.04, baseCost: 200, costGrowth: 1.4, maxLevel: 50 },

  { id: 'greased_palms', name: 'Greased Palms',
    flavor: '"Everyone has a price. Most of them are reasonable."',
    effectLabel: 'Coin find & item drop rate',
    effectKey: 'exp_find', perLevel: 0.04, baseCost: 250, costGrowth: 1.45, maxLevel: 30 },
];

export const EXPENSES_BY_ID: Record<string, ExpenseDef> =
  Object.fromEntries(EXPENSES.map(e => [e.id, e]));

export function expenseLevel(state: GameState, id: string): number {
  return state.expensesOwned?.[id] ?? 0;
}

// Coin cost to buy the NEXT level (from the current owned level).
export function expenseCost(def: ExpenseDef, currentLevel: number): number {
  return Math.floor(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

// Summed value of an effect key across all owned expenses.
export function expenseEffect(state: GameState, effectKey: string): number {
  let total = 0;
  for (const def of EXPENSES) {
    if (def.effectKey !== effectKey) continue;
    const lvl = expenseLevel(state, def.id);
    if (lvl > 0) total += lvl * def.perLevel;
  }
  return total;
}

export function expenseNextDesc(def: ExpenseDef): string {
  return `+${Math.round(def.perLevel * 100)}% per level`;
}

export function expenseCurrentDesc(def: ExpenseDef, level: number): string | null {
  if (level <= 0) return null;
  return `currently +${Math.round(def.perLevel * level * 100)}%`;
}

// Buy one level of an expense with coin. Returns true on success.
export function buyExpense(state: GameState, id: string): boolean {
  const def = EXPENSES_BY_ID[id];
  if (!def) return false;
  const lvl = expenseLevel(state, id);
  if (lvl >= def.maxLevel) return false;
  const cost = expenseCost(def, lvl);
  if (!bGte(state.coin, cost)) return false;
  state.coin = bSub(state.coin, cost);
  state.expensesOwned = state.expensesOwned ?? {};
  state.expensesOwned[id] = lvl + 1;
  return true;
}
