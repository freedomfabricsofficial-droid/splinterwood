// XP / level curve.
//
// Phase 1 of the progression overhaul: no cap, exponential curve.
// The curve is base * growth^(lvl-1) — each level costs `growth` times
// the previous. With growth=1.18, level 100 costs ~10.6M XP, level 200
// costs ~12B XP, level 500 costs ~3e35 XP. That keeps early levels fast
// while making high levels meaningful long-term goals.
//
// Numbers up through level ~400 fit safely inside JS number precision.
// Beyond that we lean on Decimal in the calling code (computed via
// xpForLevelBig / cumulativeXpToLevelBig).

import Decimal from 'break_eternity.js';

// No cap. MAX_LEVEL retained as an upper bound for "find what level am I"
// loops so they don't run forever on corrupt data, but the engine itself
// imposes no ceiling.
export const MAX_LEVEL = 1000000;

const BASE = 50;
const GROWTH = 1.18;

// XP needed to go from `lvl` to `lvl+1`.
// At level 1: 50 * 1.18^0 = 50
// At level 50: 50 * 1.18^49 ≈ 187K
// At level 100: 50 * 1.18^99 ≈ 1.4M
// At level 200: 50 * 1.18^199 ≈ 38B
// At level 500: 50 * 1.18^499 ≈ 1e37
export function xpForLevel(lvl: number): number {
  if (lvl < 1) return BASE;
  // Cap the exponent so JS number arithmetic doesn't return Infinity.
  // Beyond level ~400 the caller should use xpForLevelBig instead.
  if (lvl > 400) return Number.MAX_SAFE_INTEGER;
  return Math.floor(BASE * Math.pow(GROWTH, lvl - 1));
}

// Decimal-precision version for large levels.
export function xpForLevelBig(lvl: number): Decimal {
  return new Decimal(BASE).mul(new Decimal(GROWTH).pow(lvl - 1)).floor();
}

// Cumulative XP needed to reach `lvl` from level 1.
// Geometric sum: sum = BASE * (GROWTH^(lvl-1) - 1) / (GROWTH - 1)
export function cumulativeXpToLevel(lvl: number): number {
  if (lvl <= 1) return 0;
  if (lvl > 400) return Number.MAX_SAFE_INTEGER;
  return Math.floor(BASE * (Math.pow(GROWTH, lvl - 1) - 1) / (GROWTH - 1));
}

export function cumulativeXpToLevelBig(lvl: number): Decimal {
  if (lvl <= 1) return new Decimal(0);
  const numer = new Decimal(GROWTH).pow(lvl - 1).sub(1);
  return new Decimal(BASE).mul(numer).div(GROWTH - 1).floor();
}

// Find which level a player would be at if they had `xp` total XP.
// Uses inverse formula: lvl = 1 + log_growth(1 + xp * (growth-1) / base)
export function levelFromTotalXp(xp: number): number {
  if (xp <= 0) return 1;
  // Closed-form for small enough numbers
  if (xp < Number.MAX_SAFE_INTEGER / 2) {
    const lvl = 1 + Math.log(1 + xp * (GROWTH - 1) / BASE) / Math.log(GROWTH);
    return Math.max(1, Math.floor(lvl));
  }
  // Decimal fallback for very high XP
  return levelFromTotalXpBig(new Decimal(xp));
}

export function levelFromTotalXpBig(xp: Decimal): number {
  if (xp.lte(0)) return 1;
  // 1 + (xp * (GROWTH-1) / BASE)
  const inner = xp.mul(GROWTH - 1).div(BASE).add(1);
  // log_growth(inner) = ln(inner) / ln(growth) ≈ log10(inner) / log10(growth)
  const lvl = 1 + inner.log10().toNumber() / Math.log10(GROWTH);
  return Math.max(1, Math.floor(lvl));
}
