// ============================================================================
// INVESTMENTS — the prestige upgrade catalog ("Cook the Books")
// ============================================================================
//
// Investments are bought with Slush (the prestige carryover currency) and persist
// across loops. On the surface they read as prudent financial moves; once the
// player knows the truth, they're sinking stolen earnings into their own cage.
//
// Two kinds:
//   'mult'  — a continuous multiplier; its effect is summed by investmentEffect()
//             and read by the stat/XP/coin pipelines.
//   'start' — a head-start applied at the moment the books are cooked (next run).
//
// Every investment carries a plain-language `effectLabel` so the UI can always
// tell the player exactly what the number does (a core design rule for this game).

import type { GameState } from '../types';

export type InvestmentKind = 'mult' | 'start';

export interface InvestmentDef {
  id: string;
  name: string;
  flavor: string;        // surface-innocent, ominous once you know
  effectLabel: string;   // plain language: what this actually boosts
  effectKey: string;     // what the level contributes to (internal)
  perLevel: number;      // amount granted per owned level
  unit: 'pct' | 'flat';  // display hint
  baseCost: number;      // Slush cost for the first level
  costGrowth: number;    // cost multiplier per level owned
  maxLevel: number;
  kind: InvestmentKind;
}

export const INVESTMENTS: InvestmentDef[] = [
  { id: 'compound_interest', name: 'Compound Interest',
    flavor: '"Money makes money. Best not ask whose."',
    effectLabel: 'Coin earned from everything',
    effectKey: 'inv_coin', perLevel: 0.08, unit: 'pct', baseCost: 3, costGrowth: 1.6, maxLevel: 25, kind: 'mult' },

  { id: 'annuity', name: 'Annuity',
    flavor: '"A steady return on a steady soul."',
    effectLabel: 'XP earned from everything',
    effectKey: 'inv_xp', perLevel: 0.08, unit: 'pct', baseCost: 3, costGrowth: 1.6, maxLevel: 25, kind: 'mult' },

  { id: 'diversified', name: 'Diversified Holdings',
    flavor: '"Never keep all your labor in one ledger."',
    effectLabel: 'Gathering & crafting speed',
    effectKey: 'inv_speed', perLevel: 0.06, unit: 'pct', baseCost: 4, costGrowth: 1.7, maxLevel: 25, kind: 'mult' },

  { id: 'war_chest', name: 'War Chest',
    flavor: '"For unforeseen disagreements."',
    effectLabel: 'Attack power',
    effectKey: 'inv_atk', perLevel: 0.06, unit: 'pct', baseCost: 4, costGrowth: 1.7, maxLevel: 25, kind: 'mult' },

  { id: 'hedge_fund', name: 'Hedge Fund',
    flavor: '"Protects the principal. You are the principal."',
    effectLabel: 'Defense & max HP',
    effectKey: 'inv_defhp', perLevel: 0.06, unit: 'pct', baseCost: 3, costGrowth: 1.6, maxLevel: 25, kind: 'mult' },

  { id: 'insider_tip', name: 'Insider Tip',
    flavor: '"Someone always knows where the good drops fall."',
    effectLabel: 'Coin find & item drop rate',
    effectKey: 'inv_find', perLevel: 0.07, unit: 'pct', baseCost: 5, costGrowth: 1.8, maxLevel: 15, kind: 'mult' },

  { id: 'seed_capital', name: 'Seed Capital',
    flavor: '"Every fresh ledger opens with a little something set aside."',
    effectLabel: 'Coin you start each new loop with',
    effectKey: 'seed_coin', perLevel: 1000, unit: 'flat', baseCost: 5, costGrowth: 1.8, maxLevel: 15, kind: 'start' },

  { id: 'head_start', name: 'Head Start',
    flavor: '"You remember the early lessons. No need to learn them twice."',
    effectLabel: 'Levels in every skill you start each new loop with',
    effectKey: 'head_levels', perLevel: 2, unit: 'flat', baseCost: 8, costGrowth: 2.0, maxLevel: 10, kind: 'start' },
];

export const INVESTMENTS_BY_ID: Record<string, InvestmentDef> =
  Object.fromEntries(INVESTMENTS.map(i => [i.id, i]));

export function investmentLevel(state: GameState, id: string): number {
  return state.investmentsOwned?.[id] ?? 0;
}

// Slush cost to buy the NEXT level (from the current owned level).
export function investmentCost(def: InvestmentDef, currentLevel: number): number {
  return Math.floor(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

// Summed value of a continuous ('mult') effect across all owned investments.
// e.g. investmentEffect(state, 'inv_coin') === 0.24 means +24% coin.
export function investmentEffect(state: GameState, effectKey: string): number {
  let total = 0;
  for (const def of INVESTMENTS) {
    if (def.kind !== 'mult' || def.effectKey !== effectKey) continue;
    const lvl = investmentLevel(state, def.id);
    if (lvl > 0) total += lvl * def.perLevel;
  }
  return total;
}

// What ONE more level grants — for the UI.
export function investmentNextDesc(def: InvestmentDef): string {
  if (def.unit === 'pct') return `+${Math.round(def.perLevel * 100)}% per level`;
  if (def.effectKey === 'seed_coin') return `+${def.perLevel.toLocaleString()} per level`;
  return `+${def.perLevel} per level`;
}

// What the player currently HAS from this investment at its owned level — for the UI.
// Returns null when nothing is owned yet (so the UI can hide the line).
export function investmentCurrentDesc(def: InvestmentDef, level: number): string | null {
  if (level <= 0) return null;
  if (def.unit === 'pct') return `currently +${Math.round(def.perLevel * level * 100)}%`;
  if (def.effectKey === 'seed_coin') return `currently +${(def.perLevel * level).toLocaleString()} coin`;
  return `currently +${def.perLevel * level}`;
}
